'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DATA_DIR } = require('../config/storage');

const day = 86400000;
const durations = new Map([['day', day], ['week', 7 * day], ['permanent', 0], ['auto', 20 * 60000]]);
const monitorWindow = 15000;
const autoThreshold = Object.freeze({ healthClaim: 12, invalidShot: 14, repeatJoin: 10 });
const required = Object.freeze({
  packetFlood: 12, fireRate: 8, shotOrigin: 5, reloadBypass: 6,
  hitRange: 5, hitWithoutShot: 8, healthClaim: 3, positionJump: 3, sharedCombat: 3,
  hitOffAxis: 5, invalidShot: 4, repeatJoin: 4
});

function createModeration(file = path.join(DATA_DIR, 'player-bans.json')) {
  let bans = new Map();
  let queue = Promise.resolve();
  const incidents = new Map();
  const recentCombat = new Map();
  const ready = fs.readFile(file, 'utf8').then(raw => {
    for (const entry of JSON.parse(raw)) {
      if (/^[0-9a-f]{64}$/.test(entry.owner) && entry.id &&
          Number.isFinite(entry.until) && (entry.until === 0 || entry.until > Date.now())) bans.set(entry.owner, entry);
    }
  }).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });

  function activeBan(owner, now = Date.now()) {
    const ban = bans.get(owner);
    if (ban?.until && ban.until <= now) {
      bans.delete(owner);
      return null;
    }
    return ban || null;
  }

  function change(operation) {
    const task = queue.then(async () => {
      await ready;
      const now = Date.now();
      const next = new Map([...bans].filter(([, ban]) => !ban.until || ban.until > now));
      const result = operation(next, now);
      if (!result) return null;
      const temp = file + '.' + randomUUID() + '.tmp';
      await fs.mkdir(path.dirname(file), { recursive: true });
      try {
        const handle = await fs.open(temp, 'wx', 0o600);
        try {
          await handle.writeFile(JSON.stringify([...next.values()], null, 2), 'utf8');
          await handle.sync();
        } finally {
          await handle.close();
        }
        await fs.rename(temp, file);
      } finally {
        await fs.rm(temp, { force: true }).catch(() => {});
      }
      bans = next;
      return result;
    });
    queue = task.catch(() => {});
    return task;
  }

  function ban(target, duration, reason) {
    if (!/^[0-9a-f]{64}$/.test(target?.owner || '') || !durations.has(duration)) return Promise.resolve(null);
    return change((next, now) => {
      const period = durations.get(duration);
      const current = next.get(target.owner);
      if (duration === 'auto' && current) return null;
      const entry = { id: randomUUID(), owner: target.owner, name: target.name,
        at: now, until: period ? now + period : 0,
        reason: String(reason || '').trim().slice(0, 120), automatic: duration === 'auto' };
      next.set(entry.owner, entry);
      return entry;
    });
  }

  function revoke(id) {
    return change(next => {
      for (const [owner, entry] of next) if (entry.id === id) {
        next.delete(owner);
        return entry;
      }
      return null;
    });
  }

  function snapshot(player) {
    return { token: player.modToken, owner: player.signOwner, id: player.id, name: player.name };
  }

  function signal(player, kind, now, map) {
    if (!player.joined) return;
    const counters = player.modCounters ??= Object.create(null);
    let counter = counters[kind];
    if (!counter || now - counter.start >= monitorWindow) counter = counters[kind] = { start: now, count: 0 };
    counter.count++;
    const automatic = autoThreshold[kind] === counter.count;
    if (counter.count < required[kind]) return;
    const key = player.modToken + ':' + kind;
    const previous = incidents.get(key);
    // Refresh at most once a second per signal. Retain only the most recent 200 rows.
    if (previous && now - previous.lastAt < 1000 && !automatic) return;
    if (previous) incidents.delete(key);
    incidents.set(key, { ...snapshot(player), kind, map, count: counter.count, firstAt: counter.start, lastAt: now });
    if (incidents.size > 200) incidents.delete(incidents.keys().next().value);
    return automatic;
  }

  function sharedCombat(player, now, map) {
    const identity = player.signOwner;
    const pair = player.modIdentityPair;
    if (!identity && !pair) return;
    const byCookie = identity && recentCombat.get(identity);
    const byPair = pair && recentCombat.get(pair);
    if ((byCookie && byCookie.token !== player.modToken && now - byCookie.at < 1000) ||
        (byPair && byPair.token !== player.modToken && now - byPair.at < 1000)) signal(player, 'sharedCombat', now, map);
    if ((!byCookie || byCookie.token === player.modToken) &&
        (!byPair || byPair.token === player.modToken) &&
        now - (byCookie?.at || byPair?.at || 0) < 250) return;
    const sample = { token: player.modToken, at: now };
    if (identity) {
      recentCombat.delete(identity);
      recentCombat.set(identity, sample);
    }
    if (pair) {
      recentCombat.delete(pair);
      recentCombat.set(pair, sample);
    }
    while (recentCombat.size > 512) recentCombat.delete(recentCombat.keys().next().value);
  }

  const recent = now => [...incidents.values()].reverse().filter(row => now - row.lastAt < day);
  return {
    ready, activeBan, ban, revoke, snapshot, signal, sharedCombat,
    target: (token, now = Date.now()) => recent(now).find(row => row.token === token),
    report(now = Date.now()) {
      return {
        incidents: recent(now).map(({ owner, ...row }) => ({ ...row, canBan: !!owner && !activeBan(owner, now) })),
        bans: [...bans.values()].filter(ban => !ban.until || ban.until > now)
          .reverse().map(({ owner, ...ban }) => ban)
      };
    }
  };
}

module.exports = { createModeration };
