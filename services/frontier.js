'use strict';

const storage = require('../config/storage');
const rules = require('../public/js/frontier-rules');
const FILE = 'frontier-inventory.json';

module.exports = function createFrontier({ send, participants, sameMap, damage, onEquipmentChange = () => {} }) {
  const unavailable = new Map();
  const grenades = [];
  let inventories;
  function profiles() {
    if (!inventories) {
      const saved = storage.readJson(FILE);
      inventories = Object.fromEntries(Object.entries(saved || {}).filter(([id]) =>
        /^[a-f0-9]{64}$/.test(id)).map(([id, value]) => [id, rules.normalize(value)]));
    }
    return inventories;
  }
  function items(player) {
    if (!player.signOwner) return player.frontierItems ||= rules.normalize();
    return profiles()[player.signOwner] ||= rules.normalize();
  }
  function publishItems(player, next, now) {
    const changed = equipmentFlags(player) !== rules.equipmentFlags(next);
    if (player.signOwner) profiles()[player.signOwner] = next;
    else player.frontierItems = next;
    for (const other of participants()) {
      if (other === player || (player.signOwner && other.signOwner === player.signOwner)) {
        if (changed && other.frontier && other.active && other.alive) {
          onEquipmentChange(other, rules.equipmentFlags(next), now);
        }
        inventory(other);
      }
    }
    return true;
  }
  function persist(player, next, now) {
    if (player.signOwner) {
      try {
        storage.updateJson(FILE, data => ({ ...(!Array.isArray(data) && data), [player.signOwner]: next }));
      } catch (error) {
        console.error('[frontier] inventory save failed:', error.message);
        send(player.ws, { type: 'frontierDenied', reason: 'storage' });
        return false;
      }
    }
    return publishItems(player, next, now);
  }
  function containerTransaction(player, update, now) {
    let next;
    storage.updateJson(FILE, data => {
      const profiles = Array.isArray(data) ? {} : data;
      const containers = profiles.containers || {};
      const bag = player.signOwner ? rules.normalize(profiles[player.signOwner]) : null;
      next = update(containers, bag, profiles);
      if (next && player.signOwner) profiles[player.signOwner] = next;
      profiles.containers = containers;
      return profiles;
    });
    if (next) publishItems(player, next, now);
  }
  function inventory(player) {
    if (player.frontier) send(player.ws, { type: 'frontierInventory', items: items(player) });
  }
  function equipmentFlags(player) {
    return player.frontier ? rules.equipmentFlags(items(player)) : 0;
  }
  function stock(player) {
    if (player.frontier) send(player.ws, { type: 'frontierStock', unavailable: [...unavailable.keys()] });
  }
  function stockChanged() {
    for (const player of participants()) if (player.mapId === rules.map) stock(player);
  }
  function enter(player, now, insert = true) {
    player.frontierDrop = null;
    if (!player.frontier || player.mapId !== rules.map) return;
    if (insert) {
      player.frontierDrop = { anchor: { ...player.pos }, started: now };
      player.active = false;
    }
    stock(player);
  }
  function dropping(player, now) {
    if (!player.frontierDrop) return false;
    if (now - player.frontierDrop.started <= rules.dropMaxMs) return true;
    player.frontierDrop = null;
    return false;
  }
  function armor(player, amount, kind, now) {
    if (!player.frontier) return amount;
    const next = { ...items(player) };
    const remaining = rules.absorb(next, amount, kind);
    return remaining < amount && persist(player, next, now) ? remaining : amount;
  }
  function handle(player, msg, now) {
    if (!player.frontier || !player.joined || !player.alive) return;
    if (msg.type === 'frontierLand') {
      const drop = player.frontierDrop;
      if (!drop || player.mapId !== rules.map || now - drop.started < rules.dropMinMs) return;
      const point = rules.validLanding(drop.anchor, msg.point) ? msg.point : drop.anchor;
      player.frontierDrop = null;
      player.pos = { x: point.x, y: point.y, z: point.z };
      player.motionBudget = null;
      player.protectedUntil = now + 1200;
      send(player.ws, { type: 'frontierLanded', pos: player.pos });
      return;
    }
    if (msg.type === 'frontierWear') {
      if (!player.active || dropping(player, now) || !Number.isInteger(msg.amount) ||
          msg.amount < 1 || msg.amount > 40 || now - (player.frontierWearAt || 0) < 80) return;
      const old = items(player);
      player.frontierWearAt = now;
      if (old.vest) persist(player, { ...old, vest: Math.max(0, old.vest - msg.amount) }, now);
      return;
    }
    if (!player.active || dropping(player, now) || now - (player.frontierActionAt || 0) < 180) return;
    player.frontierActionAt = now;
    const next = { ...items(player) };
    if (msg.type === 'frontierPick') {
      const drop = rules.loot.get(msg.id);
      if (!drop || player.mapId !== rules.map || unavailable.has(drop.id) ||
          Math.hypot(player.pos.x - drop.x, player.pos.z - drop.z) > 3.4 ||
          Math.abs(player.pos.y - drop.y) > 3.5) return;
      const reason = rules.pickupIssue(next, drop.kind);
      if (reason) {
        send(player.ws, { type: 'frontierDenied', reason });
        return;
      }
      rules.collect(next, drop.kind);
      if (!persist(player, next, now)) return;
      unavailable.set(drop.id, now + rules.replenishMs);
      stockChanged();
      send(player.ws, { type: 'frontierPicked', item: drop.kind });
      return;
    }
    const kind = msg.item;
    if (!rules.consumables.includes(kind) || !next[kind]) return;
    if (msg.type === 'frontierDiscard') {
      next[kind]--;
      if (persist(player, next, now)) send(player.ws, { type: 'frontierDiscarded', item: kind });
      return;
    }
    const isHealth = kind === 'drink' || kind === 'medkit';
    if (isHealth && Math.min(player.hp, Number.isFinite(msg.health) ? msg.health : player.hp) >= 100) return;
    next[kind]--;
    if (!persist(player, next, now)) return;
    if (isHealth) {
      const health = Number.isFinite(msg.health) ? Math.max(1, Math.min(player.hp, msg.health)) : player.hp;
      player.hp = Math.min(100, health + (kind === 'drink' ? 25 : 65));
      send(player.ws, { type: 'frontierUsed', item: kind, health: player.hp });
    } else if (kind === 'quiet') {
      send(player.ws, { type: 'frontierUsed', item: kind });
    } else {
      const start = { x: player.pos.x, y: player.pos.y + 1.25, z: player.pos.z };
      const dx = -Math.sin(player.yaw);
      const dz = -Math.cos(player.yaw);
      const requested = msg.point;
      const valid = requested && [requested.x, requested.y, requested.z].every(Number.isFinite) &&
        Math.hypot(requested.x - start.x, requested.z - start.z) <= 15 &&
        Math.abs(requested.y - start.y) < 8 &&
        (requested.x - start.x) * dx + (requested.z - start.z) * dz >= -.5;
      const point = valid ? requested : { x: start.x + dx * 9, y: start.y - 1, z: start.z + dz * 9 };
      const zone = { mapId: player.mapId, inQingyun: player.inQingyun };
      grenades.push({ player, zone, point, at: now + rules.throwWindup + 1050 });
      for (const other of participants()) {
        if (other.frontier && sameMap(other, zone)) send(other.ws, { type: 'frontierThrow', start, point, thrower: player.id, windup: rules.throwWindup });
      }
    }
  }
  function tick(now) {
    let changed = false;
    for (const [id, at] of unavailable) if (at <= now) { unavailable.delete(id); changed = true; }
    if (changed) stockChanged();
    while (grenades.length && grenades[0].at <= now) {
      const { player, zone, point } = grenades.shift();
      for (const other of participants()) {
        if (!sameMap(other, zone)) continue;
        if (other.frontier) send(other.ws, { type: 'frontierBlast', point });
        if (!other.active || !other.alive || other.protectedUntil > now) continue;
        const distance = Math.hypot(other.pos.x - point.x, other.pos.y + .7 - point.y, other.pos.z - point.z);
        if (distance < 5) damage(other, player, Math.max(1, Math.round(60 * (1 - distance / 5))), 'vest', now);
      }
    }
  }
  return { items, inventory, equipmentFlags, enter, dropping, armor, handle, tick, containerTransaction };
};
