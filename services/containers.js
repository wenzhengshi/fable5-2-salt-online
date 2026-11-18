'use strict';

const crypto = require('node:crypto');
const storage = require('../config/storage');
const { maps } = require('../public/js/expedition-zones');
const lift = require('../public/js/bayhaven-lift');
const rules = require('../public/js/frontier-rules');
const { canonical } = require('../public/js/container-password');
const { isBlocked } = require('./contentFilter');

const { transfer: transferCosmetic, inventoryCounts } = require('./shop');

const FILE = 'frontier-inventory.json';
const radius = 100;
const colors = ['red', 'blue', 'green'];
const planar = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const hash = password => crypto.createHash('sha256').update(password).digest('hex');
const mapOf = player => player.mapId;
const recover = input => {
  const password = canonical(input);
  return password ? hash(password) : '';
};
const amountOf = (value, maximum, fallback) => {
  if (value === undefined || value === null || value === '' || value === 'all') return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error('amount');
  return value;
};
const canCarry = (bag, item, amount) => {
  const next = bag[item] + amount;
  if (!Number.isSafeInteger(next) || next > rules.limits[item]) return false;
  if (!rules.consumables.includes(item)) return true;
  const used = rules.consumables.reduce((total, kind) => total + (kind === item ? next : bag[kind] || 0), 0);
  return used <= rules.capacity;
};

module.exports = function createContainers({ send, players, frontier, gold, shop }) {
  const opened = new Map();
  let registry;
  function records() {
    return registry ||= storage.readJson(FILE).containers || {};
  }
  function nearby(player, row) {
    return row?.map === mapOf(player) && planar(row.pos, player.pos) <= 7 &&
      Math.abs(row.pos.y - player.pos.y) <= 2.5;
  }
  function inside(player, row) {
    const dx = player.pos.x - row.pos.x;
    const dz = player.pos.z - row.pos.z;
    const angle = row.yaw * Math.PI / 2;
    return Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle)) < 2.91 &&
      Math.abs(dx * Math.sin(angle) + dz * Math.cos(angle)) < 1.13 &&
      player.pos.y >= row.pos.y - .05 && player.pos.y <= row.pos.y + 1;
  }
  function list(player, rows = records()) {
    const map = mapOf(player);
    if (!Object.hasOwn(maps, map)) return;
    const containers = Object.values(rows)
      .filter(row => row.map === map && planar(row.pos, player.pos) <= radius)
      .map(({ id, color, pos, yaw, sign, gold }) => ({
        id, color, pos, yaw, sign, gold: Number.isSafeInteger(gold) && gold > 0 ? gold : 0,
        open: opened.has(id)
      }));
    send(player.ws, { type: 'containerList', map, containers });
  }
  function broadcast(rows, ...points) {
    for (const other of players.values()) {
      if (other.joined && points.some(row => row && row.map === mapOf(other) &&
          planar(row.pos, other.pos) <= radius)) list(other, rows);
    }
  }
  function available(player, now) {
    return player.joined && player.alive && player.active && player.focusUntil <= now &&
      Object.hasOwn(maps, mapOf(player)) && !frontier.dropping(player, now) && player.carSeat == null && player.boatSeat == null;
  }
  function position(player, point, rows, current) {
    const map = maps[mapOf(player)];
    if (!point || ![point.x, point.y, point.z, point.yaw].every(Number.isFinite) ||
        point.x < map.minX + 5 || point.x > map.maxX - 5 ||
        point.z < map.minZ + 5 || point.z > map.maxZ - 5 ||
        planar(point, player.pos) > 10 || planar(point, player.pos) < 4.5 ||
        Math.abs(point.y - player.pos.y) > 1.5 || ![0, 1, 2, 3].includes(point.yaw) ||
        [map.exit, map.landing, ...map.respawns].some(p => planar(p, point) < 14) ||
        Object.values(rows).some(row => row !== current && row.map === map.id &&
          planar(row.pos, point) < 8 && Math.abs(row.pos.y - point.y) < 4) ||
        [...players.values()].some(other => other.active && other.alive && other.mapId === map.id &&
          planar(other.pos, point) < 4 && Math.abs(other.pos.y - point.y) < 3)) throw new Error('position');
    if (map.id === 'bayhaven') {
      const dx = point.yaw % 2 === 0 ? 3.4 : 1.55;
      const dz = point.yaw % 2 === 0 ? 1.55 : 3.4;
      if (lift.overlaps(point.x, point.z - map.offset, dx, dz) &&
          lift.floorFor(point.x, point.y, point.z - map.offset, dx, dz) === null) throw new Error('position');
    }
    return { x: point.x, y: point.y, z: point.z };
  }
  function handle(player, msg, now) {
    if (!player.joined) return;
    if (msg.type === 'containerList') {
      if (now - (player.containerListAt || 0) >= 1200) {
        player.containerListAt = now;
        list(player);
      }
      return;
    }
    const reply = fields => send(player.ws, { type: 'containerResult', request: msg.request, ...fields });
    if (msg.action !== 'close' && now - (player.containerActionAt || 0) < 350) return reply({ error: 'busy' });
    player.containerActionAt = now;
    if (!available(player, now)) return reply({ error: 'unavailable' });
    const action = msg.action;
    const passwordHash = recover(msg.password);
    const rows = records();
    const own = Object.hasOwn(rows, passwordHash) ? rows[passwordHash] : null;
    const row = Object.values(rows).find(entry => entry.id === msg.id);
    const session = row && opened.get(row.id);
    const controlsDoor = session?.ws === player.ws && session.expires > now;
    if (action === 'open' || action === 'close') {
      if (!row || !nearby(player, row)) return reply({ error: 'range' });
      if (action === 'open') {
        if (!own || own.id !== msg.id) return reply({ error: 'password' });
        if (session && !controlsDoor) return reply({ error: 'inUse' });
        opened.set(row.id, { player, ws: player.ws, row, expires: now + 60000 });
      } else {
        if (!controlsDoor) return reply({ error: 'password' });
        if (inside(player, row)) return reply({ error: 'exit' });
        opened.delete(row.id);
      }
      broadcast(rows, row);
      return reply({ id: row.id, open: action === 'open', items: action === 'open' ? row.items : undefined, gold: action === 'open' ? row.gold || 0 : undefined,
        cosmetics: action === 'open' ? Object.keys(row.cosmetics || {}) : undefined,
        cosmeticCounts: action === 'open' ? inventoryCounts(row.cosmetics) : undefined });
    }
    if (action === 'issue') {
      if (!player.signOwner) return reply({ error: 'identity' });
      if (Object.values(rows).some(entry => entry.creator === player.signOwner)) return reply({ error: 'exists' });
      try { position(player, msg.point, rows, null); }
      catch { return reply({ error: 'position' }); }
      if (!colors.includes(msg.color)) return reply({ error: 'position' });
      const reserved = new Set([...players.values()]
        .map(other => other.containerDraft).filter(draft => draft && draft.expires > now).map(draft => draft.hash));
      let password, digest;
      do {
        password = crypto.randomBytes(12).toString('hex').toUpperCase().match(/.{6}/g).join('-');
        digest = hash(password);
      } while (Object.hasOwn(rows, digest) || reserved.has(digest));
      player.containerDraft = { hash: digest, map: mapOf(player), color: msg.color, point: msg.point, expires: now + 900000 };
      return reply({ password });
    }
    if (!['create', 'move', 'sign', 'deposit', 'withdraw', 'locate', 'depositGold', 'withdrawGold', 'depositCosmetic', 'withdrawCosmetic'].includes(action)) return reply({ error: 'unavailable' });
    if (action === 'locate') {
      if (!own) return reply({ error: 'password' });
      return reply({ location: { map: own.map, pos: own.pos } });
    }
    const placement = action === 'create' || action === 'move';
    const transfer = action === 'deposit' || action === 'withdraw';
    const cash = action === 'depositGold' || action === 'withdrawGold';
    const cosmetic = action === 'depositCosmetic' || action === 'withdrawCosmetic';
    let updated, previous, key, savedRows, withdrawn = 0, moved = 0;
    try {
      frontier.containerTransaction(player, (current, bag, data) => {
        savedRows = current;
        key = passwordHash;
        if (action === 'create') {
          if (!player.signOwner) throw new Error('identity');
          if (Object.values(current).some(entry => entry.creator === player.signOwner)) throw new Error('exists');
          const draft = player.containerDraft;
          if (!draft || draft.hash !== key || draft.expires <= now) throw new Error('draft');
          if (Object.hasOwn(current, key)) throw new Error('draft');
          if (draft.map !== mapOf(player)) throw new Error('position');
          updated = { id: crypto.randomUUID(), creator: player.signOwner, color: draft.color, items: {}, sign: '' };
        } else {
          if ((transfer || cash || cosmetic) && (!row || !controlsDoor || !nearby(player, row) || !bag || (transfer && !player.frontier)))
            throw new Error('closed');
          if (transfer || cash || cosmetic) key = Object.keys(current).find(id => current[id].id === msg.id);
          const saved = current[key];
          if (!saved || (action === 'sign' && (saved.id !== msg.id || !nearby(player, saved))))
            throw new Error('password');
          if (action === 'move' && opened.has(saved.id)) throw new Error('inUse');
          previous = saved;
          updated = { ...saved, items: { ...saved.items } };
        }
        if (placement) {
          const point = action === 'create' ? player.containerDraft.point : msg.point;
          updated.pos = position(player, point, current, previous);
          updated.map = mapOf(player);
          updated.yaw = point.yaw;
        }
        if (action === 'sign') {
          const sign = typeof msg.text === 'string' ? msg.text.trim().replace(/[\s\p{C}]+/gu, ' ') : '';
          if ([...sign].length > 32 || isBlocked(sign)) throw new Error('text');
          updated.sign = sign;
        }
        if (transfer) {
          const item = msg.item;
          if (!Object.hasOwn(rules.limits, item)) throw new Error('item');
          const count = updated.items[item] || 0;
          const consumable = rules.consumables.includes(item);
          let amount;
          if (action === 'deposit') {
            amount = amountOf(msg.amount, bag[item] || 0, consumable ? 1 : bag[item] || 0);
            if (!Number.isSafeInteger(amount) || amount <= 0 || count + amount > 9999) throw new Error('item');
            bag[item] -= amount;
            updated.items[item] = count + amount;
          } else {
            const room = rules.limits[item] - bag[item];
            amount = amountOf(msg.amount, count, consumable ? 1 : Math.min(count, room));
            if (!Number.isSafeInteger(amount) || amount <= 0 || amount > count || !canCarry(bag, item, amount)) {
              throw new Error('amount');
            }
            bag[item] += amount;
            updated.items[item] = count - amount;
            if (!updated.items[item]) delete updated.items[item];
          }
          moved = amount;
        }
        if (cosmetic) {
          if (!player.signOwner) throw new Error('identity');
          if (!inside(player, updated)) throw new Error('inside');
          transferCosmetic(data, updated, player.signOwner, msg.item, action === 'depositCosmetic');
        }
        if (cash) {
          if (!inside(player, updated)) throw new Error('inside');
          const carried = (data.gold ||= {}).carried ||= {};
          const carriedBalance = carried[player.signOwner] || 0;
          const stored = Number(updated.gold) || 0;
          if (!Number.isSafeInteger(carriedBalance) || !Number.isSafeInteger(stored)) throw new Error('amount');
          if (action === 'depositGold') {
            const amount = amountOf(msg.amount, carriedBalance, carriedBalance);
            if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(stored + amount)) {
              throw new Error('amount');
            }
            updated.gold = stored + amount;
            const remaining = carriedBalance - amount;
            if (remaining) carried[player.signOwner] = remaining;
            else delete carried[player.signOwner];
            moved = amount;
          } else {
            const requested = amountOf(msg.amount, stored, stored);
            if (!Number.isSafeInteger(requested) || requested <= 0 || requested > stored) throw new Error('amount');
            if (!Number.isSafeInteger(carriedBalance + requested)) throw new Error('amount');
            updated.gold = stored - requested;
            if (!updated.gold) delete updated.gold;
            carried[player.signOwner] = carriedBalance + requested;
            withdrawn = requested;
            moved = requested;
          }
        }
        current[key] = updated;
        return transfer ? bag : null;
      }, now);
    } catch (error) {
      const expected = ['exists', 'identity', 'password', 'range', 'position', 'inUse', 'text', 'closed', 'item', 'draft', 'inside', 'amount', 'cosmetic', 'cosmeticDuplicate'];
      return reply({ error: expected.includes(error.message) ? error.message : 'storage' });
    }
    registry = savedRows;
    if (cash) gold?.deposited(player, now);
    if (cosmetic) shop?.refresh(player);
    if (transfer || cash || cosmetic) {
      const session = opened.get(updated.id);
      if (session) session.expires = now + 60000;
      broadcast(registry, updated);
    } else broadcast(registry, previous, updated);
    if (action === 'create') player.containerDraft = null;
    reply({ id: updated.id, items: transfer || cash || cosmetic ? updated.items : undefined,
      gold: transfer || cash || cosmetic ? updated.gold || 0 : undefined,
      cosmetics: transfer || cash || cosmetic ? Object.keys(updated.cosmetics || {}) : undefined,
      cosmeticCounts: transfer || cash || cosmetic ? inventoryCounts(updated.cosmetics) : undefined,
      withdrawn: withdrawn || undefined, moved: moved || undefined });
  }
  function tick(now) {
    for (const [id, session] of opened) {
      const { player, ws, expires } = session;
      const row = session.row;
      if (expires > now && player.ws === ws && players.get(player.id) === player &&
          available(player, now) && nearby(player, row)) continue;
      opened.delete(id);
      send(ws, { type: 'containerClosed', id });
      if (row) broadcast(records(), row);
    }
  }
  return { handle, tick };
};
