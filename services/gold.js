'use strict';

const { randomInt, randomUUID } = require('node:crypto');
const storage = require('../config/storage');
const { zones } = require('../public/js/road-sign-rules');
const { hit, eraFor, rewardFor } = require('../public/js/gold-rules');
const arsenal = require('../public/js/arsenal-rules');

const FILE = 'frontier-inventory.json';
const DAY = 86400000;
const BONUS_CHANCE = 5;
const DAILY_BONUS_LIMIT = 8;
const MACHINE_HP = { gull: 45, hound: 140 };
const LOCATIONS = {
  port: [{ x: 27, y: 0, z: 26 }, { x: 34, y: 0, z: 26 }],
  qingyun: [{ x: -4, y: 1.5, z: -595 }, { x: 4, y: 1.5, z: -595 }],
  bayhaven: [{ x: -29, y: .14, z: -7952 }, { x: -19, y: .14, z: -7952 }],
  dustfall: [{ x: -12, y: 16, z: -16002 }, { x: 12, y: 16, z: -16002 }],
  mothlight: [{ x: -7, y: 0, z: -19957 }, { x: 7, y: 0, z: -19957 }]
};
const dayOf = now => Math.floor((now + 8 * 3600000) / DAY);
const mapOf = player => player.inQingyun ? 'qingyun' : player.mapId || 'port';
const closeTo = (player, pos) => Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z) <= 2.45 &&
  Math.abs(player.pos.y - pos.y) <= 1.8;

function schedule(day, epoch) {
  const lanes = Object.entries(LOCATIONS).flatMap(([map, positions]) => positions.map((ground, index) =>
    ({ map, kind: index ? 'drone' : 'hound', ground })));
  const era = eraFor(day, epoch);
  const maximum = Math.max(14, 40 >> Math.min(3, era));
  const reward = rewardFor(day, epoch);
  const minimum = Math.max(lanes.length, Math.ceil(maximum / 2));
  const count = randomInt(minimum, maximum + 1);
  const start = day * DAY - 8 * 3600000;
  const assignments = lanes.map(lane => ({ ...lane, count: 1 }));
  for (let i = lanes.length; i < count; i++) assignments[randomInt(assignments.length)].count++;
  const drones = assignments.filter(lane => lane.kind === 'drone');
  const extra = era === 0 ? randomInt(5, 11) : 0;
  for (let i = 0; i < extra; i++) drones[randomInt(drones.length)].count++;
  const targets = {};
  for (const { map, kind, ground, count } of assignments) {
    for (let slot = 0; slot < count; slot++) {
      const width = Math.floor(DAY / count);
      const base = start + width * slot;
      const at = slot === 0 ? base : base + randomInt(Math.floor(width / 4) + 1);
      const id = randomUUID();
      const pos = { ...ground, y: ground.y + (kind === 'drone' ? 2.8 : 0) };
      targets[id] = { id, map, kind, pos, ground, reward, at, until: slot === count - 1 ? start + DAY : base + width, hp: kind === 'drone' ? 78 : 102 };
    }
  }
  return { day, epoch, count: count + extra, reward, targets, launchDroneBoost: true };
}

module.exports = function createGold({ players, send, frontier, roll = randomInt }) {
  let state;
  function load() {
    return state ||= storage.readJson(FILE).gold || {};
  }
  function change(update) {
    let next;
    storage.updateJson(FILE, raw => {
      const data = Array.isArray(raw) ? {} : raw;
      next = data.gold ||= {};
      next.drops ||= {};
      next.carried ||= {};
      update(next);
      return data;
    });
    state = next;
    return next;
  }
  function live(row, now) {
    return row.hp > 0 && row.at <= now && row.until > now;
  }
  function rotate(now) {
    const day = dayOf(now);
    const current = load().dispatch;
    if (current?.day === day && (current.launchDroneBoost || eraFor(day, current.epoch))) return;
    change(data => {
      const saved = data.dispatch;
      if (saved?.day === day) {
        if (saved.launchDroneBoost || eraFor(day, saved.epoch)) return;
        // Keep today's original targets and their progress when upgrading a live server.
        const extra = randomInt(5, 11);
        const launchPoints = Object.entries(LOCATIONS);
        const deadline = (day + 1) * DAY - 8 * 3600000;
        for (let i = 0; i < extra; i++) {
          const [map, points] = launchPoints[i % launchPoints.length];
          const index = Math.floor(i / launchPoints.length);
          const base = points[1];
          const ground = { ...base, x: base.x + (index ? 3 : -3) };
          const pos = { ...ground, y: ground.y + 2.8 };
          const id = randomUUID();
          saved.targets[id] = { id, map, kind: 'drone', pos, ground, reward: saved.reward,
            at: now, until: deadline, hp: 78 };
        }
        saved.count += extra;
        saved.launchDroneBoost = true;
      } else data.dispatch = schedule(day, saved?.epoch ?? day);
      for (const [id, row] of Object.entries(data.drops)) if (row.until <= now) delete data.drops[id];
    });
  }
  function available(player, now) {
    return player.joined && player.active && player.alive && player.focusUntil <= now &&
      player.carSeat == null && player.boatSeat == null && !frontier.dropping(player, now);
  }
  function list(player, now) {
    const map = mapOf(player);
    const data = load();
    const dispatch = data.dispatch;
    if (!dispatch) return;
    const targets = Object.values(dispatch.targets).filter(row => row.map === map && live(row, now))
      .map(({ id, kind, pos, hp }) => ({ id, kind, pos, hp }));
    const drops = Object.values(data.drops || {}).filter(row => row.map === map && row.until > now)
      .map(({ id, pos, amount }) => ({ id, pos, amount }));
    send(player.ws, { type: 'goldList', map, targets, drops,
      reward: dispatch.reward, issued: dispatch.count, remaining: Object.values(dispatch.targets).filter(row => row.hp > 0 && row.until > now).length,
      carried: data.carried?.[player.signOwner] || 0 });
  }
  function broadcast(map, now) {
    for (const player of players.values()) if (player.joined && mapOf(player) === map) list(player, now);
  }
  function handle(player, msg, now) {
    if (!player.joined) return;
    if (msg.type === 'goldList') {
      if (now - (player.goldListAt || 0) < 700) return;
      player.goldListAt = now;
      rotate(now);
      return list(player, now);
    }
    if (now - (player.goldPickAt || 0) < 220) return;
    player.goldPickAt = now;
    rotate(now);
    if (!available(player, now) || !player.signOwner || typeof msg.id !== 'string') return;
    const drop = load().drops?.[msg.id];
    if (!drop || drop.map !== mapOf(player) || drop.until <= now || !closeTo(player, drop.pos)) return;
    let collected = 0;
    change(data => {
      const saved = data.drops[msg.id];
      if (!saved || saved.map !== drop.map || saved.until <= now || !closeTo(player, saved.pos)) return;
      delete data.drops[msg.id];
      data.carried[player.signOwner] = (data.carried[player.signOwner] || 0) + saved.amount;
      collected = saved.amount;
    });
    if (collected) {
      send(player.ws, { type: 'goldPicked', amount: collected });
      broadcast(drop.map, now);
    }
  }
  function shoot(player, shot, id, now) {
    if (!shot || !available(player, now) || typeof id !== 'string') return;
    rotate(now);
    const row = load().dispatch.targets[id];
    const weapon = arsenal[shot.weapon] || arsenal.pac9;
    if (weapon.id === 'knife' || !row || row.map !== mapOf(player) || !live(row, now) ||
        !hit(shot.origin, shot.dir, row, weapon.range)) return;
    let destroyed = false;
    change(data => {
      const saved = data.dispatch.targets[id];
      if (!saved || !live(saved, now)) return;
      saved.hp = Math.max(0, saved.hp - weapon.damage);
      if (saved.hp) return;
      data.drops[id] = { id, map: saved.map, pos: saved.ground, amount: saved.reward, until: now + 20 * 60000 };
      destroyed = true;
    });
    if (destroyed) {
      for (const other of players.values()) if (other.joined && mapOf(other) === row.map) {
        send(other.ws, { type: 'goldDestroyed', id, pos: row.pos });
      }
    }
    broadcast(row.map, now);
  }
  function ordinaryHit(player, shot, msg, now) {
    if (!shot || !available(player, now) || !player.signOwner ||
        !Number.isSafeInteger(msg.id) || msg.id < 0 || !Object.hasOwn(MACHINE_HP, msg.kind)) return;
    const point = msg.point;
    if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) return;
    const map = mapOf(player);
    const zone = zones[map];
    if (point.y < -80 || point.y > 240 || (zone
      ? point.x < zone.minX || point.x > zone.maxX || point.z < zone.minZ || point.z > zone.maxZ
      : Math.abs(point.x) > 900 || Math.abs(point.z) > 900 || point.z < -300)) return;
    const weapon = arsenal[shot.weapon] || arsenal.pac9;
    const dx = point.x - shot.origin.x, dy = point.y - shot.origin.y, dz = point.z - shot.origin.z;
    const along = dx * shot.dir.x + dy * shot.dir.y + dz * shot.dir.z;
    if (along <= 0 || along > weapon.range + .6 || dx * dx + dy * dy + dz * dz - along * along > .16) return;
    const ledger = player.ordinaryGoldHits ||= new Map();
    let record = ledger.get(msg.id);
    if (record?.done || (record && (record.map !== map || record.kind !== msg.kind))) return;
    if (!record) {
      if (ledger.size >= 2048) return;
      record = { map, kind: msg.kind, damage: 0, done: false };
      ledger.set(msg.id, record);
    }
    record.damage += weapon.damage * (msg.weak === true ? 2.2 : 1);
    if (msg.killed !== true) return;
    record.done = true;
    if (record.damage + .01 < MACHINE_HP[msg.kind] || !Number.isFinite(msg.floor) ||
        msg.floor < -80 || msg.floor > point.y + 1.2 || point.y - msg.floor > 24) return;
    rotate(now);
    const day = dayOf(now);
    const prior = load().ordinaryBonus;
    if ((prior?.day === day && prior.count >= DAILY_BONUS_LIMIT) || roll(100) >= BONUS_CHANCE) return;
    let awarded = false;
    change(data => {
      if (data.ordinaryBonus?.day !== day) data.ordinaryBonus = { day, count: 0 };
      if (data.ordinaryBonus.count >= DAILY_BONUS_LIMIT) return;
      const id = randomUUID();
      data.drops[id] = { id, map, pos: { x: point.x, y: msg.floor, z: point.z },
        amount: data.dispatch.reward, until: now + 20 * 60000 };
      data.ordinaryBonus.count++;
      awarded = true;
    });
    if (awarded) {
      send(player.ws, { type: 'goldBonus' });
      broadcast(map, now);
    }
  }
  function deposited(player, now) {
    state = null;
    list(player, now);
  }
  let nextRotationCheck = 0;
  function tick(now) {
    if (now < nextRotationCheck) return;
    nextRotationCheck = now + 10000;
    try { rotate(now); } catch (error) { console.error('[gold] dispatch storage:', error.message); }
  }
  return { handle, shoot, ordinaryHit, deposited, tick };
};
