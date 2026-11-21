'use strict';

const { randomInt, randomUUID } = require('node:crypto');
const storage = require('../config/storage');
const { zones } = require('../public/js/road-sign-rules');
const { hit, eraFor, rewardFor, parse } = require('../public/js/gold-rules');
const arsenal = require('../public/js/arsenal-rules');
const bossRewards = require('./bossRewards');
const pickupLog = require('./goldPickups');
const supply = require('./goldSupply');
const corpseField = require('./corpseField');
const { landingSurface } = require('./portalBosses');

const FILE = 'frontier-inventory.json';
const DAY = 86400000;
const BONUS_CHANCE = 25;
const BONUS_PITY = 5;
const FIXED_KILL_REWARD = 10;
const PLAYER_DEATH_DROP = parse('0.05');
const DEATH_DROP_VIEW = 64;
const DAILY_BONUS_BUDGET_MULTIPLIER = 8;

function ordinaryBudget(data, day) {
  const reward = data.dispatch.reward;
  const amount = Math.max(1, Math.floor(reward / 4));
  const bonus = data.ordinaryBonus?.day === day ? data.ordinaryBonus : null;
  const spent = bonus ? bonus.spent ?? bonus.count * reward : 0;
  const remaining = Math.max(0, reward * DAILY_BONUS_BUDGET_MULTIPLIER - spent);
  return { amount, spent, remaining: Math.floor(remaining / amount) * amount };
}
const MACHINE_HP = { gull: 45, hound: 140 };
const GIFT_RANGE = 8;
const GIFT_HEIGHT = 3;
const GIFT_COOLDOWN = 500;
const GIFT_RESPONSE_COOLDOWN = 250;
const GIFT_OFFER_TTL = 30000;
const MAX_PENDING_GIFTS = 3;
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
const liveDrop = (drop, now) => drop.until === null || drop.until > now;

function groundedDrop(map, pos) {
  const landing = landingSurface(map, pos.x, pos.z, pos.y + 2, pos.y);
  return { x: pos.x, y: landing.y, z: pos.z };
}

function normalizeDropPositions(data) {
  let changed = false;
  for (const [id, drop] of Object.entries(data.drops || {})) {
    if (!drop || !drop.pos || !Number.isFinite(Number(drop.pos.y))) continue;
    const pos = groundedDrop(drop.map, drop.pos);
    if (Math.abs(pos.y - Number(drop.pos.y)) < 0.001) continue;
    data.drops[id] = { ...drop, pos };
    changed = true;
  }
  return changed;
}

function persistGroundedDrops() {
  try {
    storage.updateJson(FILE, (raw) => {
      const data = Array.isArray(raw) ? {} : raw;
      const gold = data.gold ||= {};
      normalizeDropPositions(gold);
      return data;
    });
  } catch (error) {
    console.error('[gold] drop grounding migration failed:', error.message);
  }
}

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
  const giftOffers = new Map();
  function load() {
    if (!state) {
      const loaded = storage.readJson(FILE).gold || {};
      const migrated = normalizeDropPositions(loaded);
      state = loaded;
      if (migrated) persistGroundedDrops();
    }
    return state;
  }
  function change(update) {
    let next;
    storage.updateJson(FILE, raw => {
      const data = Array.isArray(raw) ? {} : raw;
      next = data.gold ||= {};
      next.drops ||= {};
      next.carried ||= {};
      update(next, data);
      return data;
    });
    state = next;
    return next;
  }
  function live(row, now) {
    return row.hp > 0 && row.at <= now && row.until > now;
  }
  function rotate(now, sweep = false) {
    const day = dayOf(now);
    const current = load();
    const dispatch = current.dispatch;
    if (current.supply && dispatch?.day === day && (dispatch.launchDroneBoost || eraFor(day, dispatch.epoch)) &&
        (!sweep || !Object.values(current.drops || {}).some(row => !liveDrop(row, now)))) return;
    change((data, root) => {
      supply.init(root, now);
      const saved = data.dispatch;
      if (saved?.day !== day) {
        const midnight = day * DAY - 8 * 3600000;
        supply.recoverExpired(data, midnight - 1);
        const next = schedule(day, saved?.epoch ?? day);
        supply.carryInto(data, saved, next);
        data.dispatch = next;
      } else if (!saved.launchDroneBoost && !eraFor(day, saved.epoch)) {
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
      }
      supply.recoverExpired(data, now);
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
    const rows = Object.values(dispatch.targets);
    const targets = rows.filter(row => row.map === map && live(row, now))
      .map(({ id, kind, pos, hp }) => ({ id, kind, pos, hp }));
    const drops = Object.values(data.drops || {}).map(row => row.pos
      ? { ...row, pos: groundedDrop(row.map, row.pos) } : row)
      .filter(row => row.map === map && liveDrop(row, now) &&
      (row.until !== null || Math.hypot(player.pos.x - row.pos.x, player.pos.y - row.pos.y,
        player.pos.z - row.pos.z) <= DEATH_DROP_VIEW))
      .map(({ id, pos, amount }) => ({ id, pos, amount }));
    const open = rows.filter(row => row.hp > 0 && row.until > now);
    const remainingGold = open.reduce((total, row) => total + (row.reward || 0), 0);
    const totalGold = rows.reduce((total, row) => total + (row.reward || 0), 0);
    send(player.ws, { type: 'goldList', map, targets, drops,
      reward: dispatch.reward, issued: dispatch.count, remaining: rows.filter(row =>
        row.map === map && row.hp > 0 && row.until > now).length,
      remainingTargets: open.length, remainingGold, totalGold,
      ordinaryRemaining: ordinaryBudget(data, dayOf(now)).remaining,
      ordinaryUntilPity: BONUS_PITY - (data.ordinaryMisses?.[player.signOwner] || 0),
      carried: data.carried?.[player.signOwner] || 0 });
  }
  function broadcast(map, now) {
    for (const player of players.values()) if (player.joined && mapOf(player) === map) list(player, now);
  }
  function broadcastAll(now) {
    for (const player of players.values()) if (player.joined) list(player, now);
  }

  function dropOnDeath(victim, pos, now) {
    const owner = victim.signOwner;
    const current = load().carried?.[owner];
    if (!owner || !Number.isSafeInteger(current) || current <= 0 ||
        ![pos.x, pos.y, pos.z].every(Number.isFinite)) return;
    rotate(now);
    const map = mapOf(victim);
    let dropped = false;
    change(data => {
      const balance = data.carried[owner];
      if (!Number.isSafeInteger(balance) || balance <= 0) return;
      const amount = Math.min(balance, PLAYER_DEATH_DROP);
      const id = randomUUID();
      const dropPos = groundedDrop(map, pos);
      data.carried[owner] = balance - amount;
      data.drops[id] = { id, map, pos: dropPos, amount, until: null };
      dropped = true;
    });
    if (dropped) broadcast(map, now);
  }
  function pendingAmount(owner) {
    let total = 0;
    for (const offer of giftOffers.values()) if (offer.fromOwner === owner) total += offer.amount;
    return total;
  }
  function notifyGift(offer, status, senderFields = {}, recipientFields = {}) {
    const sender = players.get(offer.fromId);
    if (sender) send(sender.ws, {
      type: 'goldGiftResult', role: 'sender', request: offer.request, offerId: offer.id,
      status, amount: offer.amount, toName: offer.toName, ...senderFields
    });
    const recipient = players.get(offer.toId);
    if (recipient) send(recipient.ws, {
      type: 'goldGiftResult', role: 'recipient', offerId: offer.id,
      status, amount: offer.amount, fromName: offer.fromName, ...recipientFields
    });
  }
  function expireGifts(now) {
    for (const [id, offer] of giftOffers) {
      if (now < offer.expiresAt) continue;
      giftOffers.delete(id);
      notifyGift(offer, 'expired');
    }
  }
  function gift(player, msg, now) {
    const answer = fields => send(player.ws, { type: 'goldGiftResult', role: 'sender', request: msg.request, ...fields });
    if (!player.signOwner || !available(player, now) ||
        ![player.pos?.x, player.pos?.y, player.pos?.z].every(Number.isFinite)) {
      return answer({ error: 'unavailable' });
    }
    const target = players.get(String(msg.toId));
    if (!target || target === player || !target.signOwner || !available(target, now) ||
        mapOf(target) !== mapOf(player) ||
        ![target.pos?.x, target.pos?.y, target.pos?.z].every(Number.isFinite)) {
      return answer({ error: 'target' });
    }
    const distance = Math.hypot(player.pos.x - target.pos.x, player.pos.z - target.pos.z);
    if (distance > GIFT_RANGE || Math.abs(player.pos.y - target.pos.y) > GIFT_HEIGHT) {
      return answer({ error: 'range' });
    }
    const amount = msg.amount;
    if (!Number.isSafeInteger(amount) || amount <= 0) return answer({ error: 'amount' });
    const pending = Array.from(giftOffers.values()).filter(offer => offer.fromOwner === player.signOwner);
    if (pending.length >= MAX_PENDING_GIFTS) return answer({ error: 'busy' });
    const reserved = pendingAmount(player.signOwner) + amount;
    const balance = load().carried?.[player.signOwner] || 0;
    if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(reserved) || balance < reserved) {
      return answer({ error: 'funds' });
    }
    const offer = {
      id: randomUUID(), request: msg.request,
      fromId: player.id, fromOwner: player.signOwner, fromName: player.name,
      toId: target.id, toOwner: target.signOwner, toName: target.name,
      amount, map: mapOf(player), pos: { ...player.pos },
      expiresAt: now + GIFT_OFFER_TTL
    };
    giftOffers.set(offer.id, offer);
    answer({ status: 'pending', offerId: offer.id, amount, toName: target.name, expiresAt: offer.expiresAt });
    send(target.ws, { type: 'goldGiftRequest', offerId: offer.id, fromId: player.id,
      fromName: player.name, amount, expiresAt: offer.expiresAt });
  }
  function respondGift(player, msg, now) {
    const answer = fields => send(player.ws, { type: 'goldGiftResponseResult', offerId: msg.offerId, ...fields });
    const offer = typeof msg.offerId === 'string' ? giftOffers.get(msg.offerId) : null;
    if (!offer || !player.signOwner || player.id !== offer.toId || player.signOwner !== offer.toOwner) return;
    if (now - (player.giftResponseAt || 0) < GIFT_RESPONSE_COOLDOWN) return answer({ error: 'busy' });
    player.giftResponseAt = now;
    if (now >= offer.expiresAt) {
      giftOffers.delete(offer.id);
      notifyGift(offer, 'expired');
      return;
    }
    giftOffers.delete(offer.id);
    if (msg.accept !== true) {
      notifyGift(offer, 'declined');
      return;
    }
    const sender = players.get(offer.fromId);
    if (!available(player, now) || !sender || sender.signOwner !== offer.fromOwner ||
        !available(sender, now) || mapOf(sender) !== offer.map || mapOf(player) !== offer.map ||
        ![sender.pos?.x, sender.pos?.y, sender.pos?.z].every(Number.isFinite)) {
      notifyGift(offer, 'unavailable');
      return;
    }
    const distance = Math.hypot(sender.pos.x - player.pos.x, sender.pos.z - player.pos.z);
    if (distance > GIFT_RANGE || Math.abs(sender.pos.y - player.pos.y) > GIFT_HEIGHT) {
      notifyGift(offer, 'range');
      return;
    }
    let transferred = 0;
    let senderCarried = 0;
    let recipientCarried = 0;
    change(data => {
      data.carried ||= {};
      const senderBalance = data.carried[sender.signOwner] || 0;
      const recipientBalance = data.carried[player.signOwner] || 0;
      const required = offer.amount + pendingAmount(offer.fromOwner);
      if (!Number.isSafeInteger(senderBalance) || senderBalance < required ||
          !Number.isSafeInteger(recipientBalance) ||
          !Number.isSafeInteger(recipientBalance + offer.amount)) return;
      data.carried[sender.signOwner] = senderBalance - offer.amount;
      data.carried[player.signOwner] = recipientBalance + offer.amount;
      transferred = offer.amount;
      senderCarried = data.carried[sender.signOwner];
      recipientCarried = data.carried[player.signOwner];
    });
    if (!transferred) {
      notifyGift(offer, 'funds');
      return;
    }
    try {
      pickupLog.recordGift({
        sender,
        recipient: player,
        map: offer.map,
        pos: offer.pos,
        amount: transferred,
        at: Date.now()
      });
    } catch (error) {
      console.error('[gold] gift ledger write failed:', error.message);
    }
    notifyGift(offer, 'accepted', { carried: senderCarried }, { carried: recipientCarried });
    list(sender, now);
    list(player, now);
  }
  function handle(player, msg, now) {
    if (!player.joined) return;
    if (msg.type === 'goldList') {
      if (now - (player.goldListAt || 0) < 700) return;
      player.goldListAt = now;
      rotate(now);
      return list(player, now);
    }
    if (msg.type === 'goldGift') {
      if (now - (player.goldGiftAt || 0) < GIFT_COOLDOWN) {
        return send(player.ws, { type: 'goldGiftResult', request: msg.request, error: 'busy' });
      }
      player.goldGiftAt = now;
      rotate(now);
      return gift(player, msg, now);
    }
    if (msg.type === 'goldGiftResponse') return respondGift(player, msg, now);
    if (now - (player.goldPickAt || 0) < 220) return;
    player.goldPickAt = now;
    rotate(now);
    if (!available(player, now) || !player.signOwner || typeof msg.id !== 'string') return;
    const drop = load().drops?.[msg.id];
    if (!drop || drop.map !== mapOf(player) || !liveDrop(drop, now) || !closeTo(player, drop.pos)) return;
    let collected = 0;
    change(data => {
      const saved = data.drops[msg.id];
      if (!saved || saved.map !== drop.map || !liveDrop(saved, now) || !closeTo(player, saved.pos)) return;
      const balance = (data.carried[player.signOwner] || 0) + saved.amount;
      if (!Number.isSafeInteger(balance)) return;
      delete data.drops[msg.id];
      data.carried[player.signOwner] = balance;
      collected = saved.amount;
    });
    if (collected) {
      try {
        pickupLog.record({
          player,
          map: drop.map,
          pos: drop.pos,
          amount: collected,
          at: Date.now()
        });
      } catch (error) {
        console.error('[gold] pickup ledger write failed:', error.message);
      }
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
      supply.issue(data, saved.reward - (saved.recycled || 0));
      data.drops[id] = { id, map: saved.map, pos: groundedDrop(saved.map, saved.ground),
        amount: saved.reward, until: now + 20 * 60000 };
      destroyed = true;
    });
    if (destroyed) {
      if (row.map === corpseField.MAP_ID) {
        const landing = landingSurface(row.map, row.ground.x, row.ground.z, row.pos.y, row.ground.y);
        corpseField.addMachine({
          id: 'gold-' + id,
          at: now,
          kind: row.kind,
          pos: { ...row.ground, y: landing.y },
          surface: landing.surface,
          victimId: 'gold-' + id,
          shooterId: player.id,
          shooterName: player.name
        });
      }
      for (const other of players.values()) if (other.joined && mapOf(other) === row.map) {
        send(other.ws, { type: 'goldDestroyed', id, pos: row.pos });
      }
    }
    if (destroyed) broadcastAll(now);
    else broadcast(row.map, now);
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
    const landing = landingSurface(map, point.x, point.z, point.y, msg.floor);
    const landingPos = { x: point.x, y: landing.y, z: point.z };
    if (map === corpseField.MAP_ID) {
      corpseField.addMachine({
        id: 'machine-' + msg.id,
        at: now,
        kind: msg.kind,
        pos: landingPos,
        surface: landing.surface,
        victimId: 'machine-' + msg.id,
        shooterId: player.id,
        shooterName: player.name
      });
    }
    awardMachineKill(player,map,landingPos,now);
  }
  function awardMachineKill(player,map,point,now) {
    if (!available(player,now) || !player.signOwner) return;
    rotate(now);
    const day = dayOf(now);
    let credited = false;
    let awarded = false;
    change(data => {
      const owner = player.signOwner;
      const balance = (data.carried[owner] || 0) + FIXED_KILL_REWARD;
      if (!Number.isSafeInteger(balance)) return;
      data.carried[owner] = balance;
      supply.issue(data, FIXED_KILL_REWARD);
      credited = true;
      const budget = ordinaryBudget(data, day);
      if (budget.remaining < budget.amount) return;
      const misses = data.ordinaryMisses ||= {};
      const attempts = (misses[owner] || 0) + 1;
      if (attempts < BONUS_PITY && roll(100) >= BONUS_CHANCE) {
        misses[owner] = attempts;
        return;
      }
      delete misses[owner];
      data.ordinaryBonus = { day, spent: budget.spent + budget.amount };
      supply.issue(data, budget.amount);
      const id = randomUUID();
      data.drops[id] = { id, map, pos: groundedDrop(map, point),
        amount: budget.amount, until: now + 20 * 60000 };
      awarded = true;
    });
    if (!credited) return;
    send(player.ws, { type: 'goldKillReward', amount: FIXED_KILL_REWARD, bonus: awarded });
    if (awarded) broadcastAll(now);
    else list(player, now);
  }
  function deposited(player, now) {
    state = null;
    list(player, now);
  }
  function settleBossReward(result) {
    const now = Date.now();
    rotate(now);
    let receipt;
    change(data => {
      receipt = bossRewards.settle(data, result);
      if (receipt) supply.issue(data, receipt.payouts.reduce((total, payout) => total + payout.amount, 0));
    });
    if (!receipt) return;
    const payouts = new Map(receipt.payouts.map(row => [row.owner, row]));
    for (const player of players.values()) {
      const payout = payouts.get(player.signOwner);
      if (!player.joined || !payout) continue;
      send(player.ws, { type: 'bossReward', amount: payout.amount, reason: payout.reason });
      if (payout.amount) list(player, now);
    }
  }
  let nextRotationCheck = 0;
  function tick(now) {
    expireGifts(now);
    if (now < nextRotationCheck) return;
    nextRotationCheck = now + 10000;
    try { rotate(now, true); } catch (error) { console.error('[gold] dispatch storage:', error.message); }
  }
  return { handle, shoot, ordinaryHit, awardMachineKill, deposited, dropOnDeath, tick, reserved: pendingAmount,
    refreshWallets() {
      const loaded = storage.readJson(FILE).gold || {};
      normalizeDropPositions(loaded);
      state = loaded;
      broadcastAll(Date.now());
    },
    settleBossReward, bossBudget: now => bossRewards.budgetFor(load(), now),
    /* 排行榜金币列：读取玩家当前随身金币（无签名/非法值回落 0），不写盘、不改账本 */
    balanceFor(player) {
      if (!player || !player.signOwner) return 0;
      const amount = load().carried?.[player.signOwner];
      return Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
    } };
};
