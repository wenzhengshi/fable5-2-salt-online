'use strict';

const { randomBytes, randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { DATA_DIR } = require('../config/storage');
const { isBlocked } = require('./contentFilter');
const { zones: signZones, protectedSpot } = require('../public/js/road-sign-rules');
const mapOf = player => player.mapId || (player.inQingyun ? 'qingyun' : null);

const cookieName = 'salt_sign_owner';
const fileId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const day = 86400000;
const utcOffset = 8 * 3600000;
const spacing = 3;
const viewRadius = 52;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bucket = value => Math.floor(value / 12);
const bucketKey = (x, z) => x + ',' + z;
const LIMITS = Object.freeze({
  ownerDaily: 10,
  clientDaily: 10,
  fingerprintDaily: 10,
  networkDaily: 30,
  ownerMinIntervalMs: 8000,
  ownerBurstWindowMs: 5 * 60000,
  ownerBurstLimit: 3,
  networkMinIntervalMs: 1500,
  networkBurstWindowMs: 5 * 60000,
  networkBurstLimit: 10,
  ownerActiveLimit: 30,
  networkActiveLimit: 120,
  networkMapLimit: 24,
  mapTotal: 500,
  cellSigns: 3,
  densityRadius: 24,
  densitySigns: 10,
  densityOwner: 3,
  densityNetwork: 6
});

function identityHash(prefix, value) {
  const text = String(value || '').trim();
  return text ? createHash('sha256').update(prefix + ':' + text).digest('hex').slice(0, 32) : '';
}

function playerIdentities(player) {
  return {
    owner: player.signOwner,
    client: identityHash('client', player.clientId),
    fingerprint: identityHash('fingerprint', player.fingerprint),
    network: identityHash('network', player.ip)
  };
}

function dayWindow(now) {
  const next = (Math.floor((now + utcOffset) / day) + 1) * day - utcOffset;
  return { start: next - day, end: next };
}

function cookieToken(headers) {
  const match = /(?:^|;\s*)salt_sign_owner=([0-9a-f]{64})(?=;|$)/.exec(headers.cookie || '');
  return match ? match[1] : '';
}

function issueCookie(req, res) {
  res.cookie(cookieName, cookieToken(req.headers) || randomBytes(32).toString('hex'), {
    httpOnly: true, secure: req.secure, sameSite: 'strict', maxAge: 400 * day, path: '/'
  });
}

function ownerFromRequest(req) {
  const token = cookieToken(req.headers);
  const origin = req.headers.origin;
  if (!token || !origin) return '';
  try {
    const host = new URL(origin).host;
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    if (host !== req.headers.host && host !== forwardedHost) return '';
    return createHash('sha256').update(token).digest('hex');
  } catch {
    return '';
  }
}

function inside(map, point) {
  return point && [point.x, point.y, point.z].every(Number.isFinite) &&
    point.x >= map.minX + 1 && point.x <= map.maxX - 1 &&
    point.z >= map.minZ + 1 && point.z <= map.maxZ - 1 && point.y >= -75 && point.y <= 240;
}

function createRegistry(options = {}) {
  const settings = typeof options === 'string' ? { dir: options } : (options || {});
  const dir = settings.dir || path.join(DATA_DIR, 'road-signs');
  const limits = { ...LIMITS, ...(settings.limits || {}) };
  const signs = new Map();
  const zones = new Map(Object.keys(signZones).map(id => [id, new Map()]));
  let ready;
  let queue = Promise.resolve();

  function add(sign) {
    signs.set(sign.id, sign);
    const grid = zones.get(sign.map);
    const key = bucketKey(bucket(sign.pos.x), bucket(sign.pos.z));
    if (!grid.has(key)) grid.set(key, new Set());
    grid.get(key).add(sign);
  }

  async function load() {
    await fs.mkdir(dir, { recursive: true });
    for (const name of await fs.readdir(dir)) {
      if (!name.endsWith('.json') || !fileId.test(name.slice(0, -5))) continue;
      let sign;
      try {
        sign = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        console.error('[signs] invalid record:', name);
        continue;
      }
      if (!sign || signs.has(sign.id) || !Object.hasOwn(signZones, sign.map) ||
          name !== sign.id + '.json' || !inside(signZones[sign.map], sign.pos)) continue;
      sign.submittedAt = Math.max(0, Math.floor(Number(sign.submittedAt) || 0));
      sign.removeAt = Math.max(0, Math.floor(Number(sign.removeAt) || 0));
      add(sign);
    }
  }

  function init() {
    if (!ready) ready = load().catch(error => {
      ready = undefined;
      throw error;
    });
    return ready;
  }

  function nearby(map, pos, radius) {
    const grid = zones.get(map);
    if (!grid || !pos) return [];
    const found = [];
    for (let x = bucket(pos.x - radius); x <= bucket(pos.x + radius); x++) {
      for (let z = bucket(pos.z - radius); z <= bucket(pos.z + radius); z++) {
        const local = grid.get(bucketKey(x, z));
        if (local) for (const sign of local) if (distance(sign.pos, pos) <= radius) found.push(sign);
      }
    }
    return found;
  }

  function publicSign(sign, owner) {
    const { id, map, pos, yaw, style, removeAt, submittedAt } = sign;
    const flagged = !!sign.flaggedAt;
    return {
      id, map, pos, yaw, style, removeAt, submittedAt, flagged,
      text: flagged ? '' : sign.text,
      own: sign.owner === owner,
      suppressed: protectedSpot(map, pos)
    };
  }

  async function list(map, pos, owner) {
    await init();
    return nearby(map, pos, viewRadius)
      .sort((a, b) => distance(a.pos, pos) - distance(b.pos, pos))
      .slice(0, 120).map(sign => publicSign(sign, owner));
  }

  async function save(sign) {
    const file = path.join(dir, sign.id + '.json');
    const temp = file + '.tmp';
    try {
      const handle = await fs.open(temp, 'wx');
      try {
        await handle.writeFile(JSON.stringify(sign), 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(temp, file);
    } catch (error) {
      await fs.unlink(temp).catch(() => {});
      throw error;
    }
  }

  async function remove(sign) {
    await fs.unlink(path.join(dir, sign.id + '.json'));
    signs.delete(sign.id);
    const grid = zones.get(sign.map);
    const key = bucketKey(bucket(sign.pos.x), bucket(sign.pos.z));
    const local = grid.get(key);
    local.delete(sign);
    if (!local.size) grid.delete(key);
  }

  async function reviewList(requestedPage) {
    await init();
    const rows = [...signs.values()]
      .sort((a, b) => (b.submittedAt || b.removeAt) - (a.submittedAt || a.removeAt) || a.id.localeCompare(b.id));
    const pages = Math.max(1, Math.ceil(rows.length / 25));
    const page = Math.min(pages, Math.max(1, Math.trunc(Number(requestedPage) || 1)));
    return { page, pages, total: rows.length, rows: rows.slice((page - 1) * 25, page * 25) };
  }

  function flag(id) {
    return enqueue(async () => {
      await init();
      const sign = signs.get(id);
      if (!sign || sign.flaggedAt) return null;
      const flagged = { ...sign, flaggedAt: Date.now() };
      await save(flagged);
      Object.assign(sign, flagged);
      return sign;
    });
  }

  function enqueue(operation) {
    const task = queue.then(operation);
    queue = task.catch(() => {});
    return task;
  }

  function placement(player, map, point) {
    if (!inside(map, point) || distance(point, player.pos) > 5 ||
        Math.abs(point.y - player.pos.y) > 2.5 || player.soldier === 'drone') return { reason: 'range' };
    const pos = Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, Math.round(point[axis] * 100) / 100]));
    if (protectedSpot(map.id, pos)) return { reason: 'gate' };
    if (nearby(map.id, pos, spacing - .001).length) return { reason: 'occupied' };
    return { pos };
  }

  function eligibleMap(player, requestMap) {
    if (mapOf(player) !== requestMap || !player.alive || !player.active || player.focusUntil > Date.now()) return null;
    return signZones[requestMap];
  }

  async function checkPlacement(player, point) {
    const requestMap = mapOf(player);
    await init();
    if (!player.signOwner) return { reason: 'identity' };
    const map = eligibleMap(player, requestMap);
    if (!map) return { reason: 'map' };
    const { reason } = placement(player, map, point);
    return { reason };
  }

  function mutate(player, msg, now) {
    const requestMap = mapOf(player);
    return enqueue(async () => {
      await init();
      if (!player.signOwner) return { reason: 'identity' };
      const map = eligibleMap(player, requestMap);
      if (!map) return { reason: 'map' };
      if (msg.type === 'signRemove') {
        const sign = signs.get(msg.id);
        if (!sign || sign.map !== map.id || distance(sign.pos, player.pos) > 5 ||
            Math.abs(sign.pos.y - player.pos.y) > 3) return { reason: 'range' };
        if (sign.owner !== player.signOwner) return { reason: 'owner' };
        if (now < sign.removeAt) return { reason: 'tomorrow', removeAt: sign.removeAt };
        await remove(sign);
        return { sign, removed: true };
      }
      const { pos, reason } = placement(player, map, msg.pos);
      if (reason) return { reason };
      const text = typeof msg.text === 'string'
        ? msg.text.replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, ' ').replace(/\s+/g, ' ').trim() : '';
      if (!text || Array.from(text).length > 32 || isBlocked(text)) return { reason: 'text' };
      if (msg.style !== 'blue' && msg.style !== 'yellow') return { reason: 'style' };

      const identities = playerIdentities(player);
      const today = dayWindow(now);
      const ownerBurstSince = now - limits.ownerBurstWindowMs;
      const networkBurstSince = now - limits.networkBurstWindowMs;
      let ownerActive = 0;
      let networkActive = 0;
      let networkMapActive = 0;
      let ownerToday = 0;
      let clientToday = 0;
      let fingerprintToday = 0;
      let networkToday = 0;
      let ownerBurst = 0;
      let networkBurst = 0;
      let lastOwnerAt = -Infinity;
      let lastNetworkAt = -Infinity;

      for (const current of signs.values()) {
        const submittedAt = Number(current.submittedAt) || 0;
        if (current.owner === identities.owner) {
          ownerActive += 1;
          if (submittedAt <= now) lastOwnerAt = Math.max(lastOwnerAt, submittedAt);
          if (submittedAt >= today.start && submittedAt < today.end) ownerToday += 1;
          if (submittedAt >= ownerBurstSince && submittedAt <= now) ownerBurst += 1;
        }
        if (identities.client && current.client === identities.client) {
          if (submittedAt >= today.start && submittedAt < today.end) clientToday += 1;
        }
        if (identities.fingerprint && current.fingerprint === identities.fingerprint) {
          if (submittedAt >= today.start && submittedAt < today.end) fingerprintToday += 1;
        }
        if (identities.network && current.network === identities.network) {
          networkActive += 1;
          if (current.map === map.id) networkMapActive += 1;
          if (submittedAt <= now) lastNetworkAt = Math.max(lastNetworkAt, submittedAt);
          if (submittedAt >= today.start && submittedAt < today.end) networkToday += 1;
          if (submittedAt >= networkBurstSince && submittedAt <= now) networkBurst += 1;
        }
      }

      if (ownerToday >= limits.ownerDaily || (identities.client && clientToday >= limits.clientDaily) ||
          (identities.fingerprint && fingerprintToday >= limits.fingerprintDaily) ||
          (identities.network && networkToday >= limits.networkDaily)) return { reason: 'daily' };
      if (now - lastOwnerAt < limits.ownerMinIntervalMs || now - lastNetworkAt < limits.networkMinIntervalMs) {
        return { reason: 'cooldown' };
      }
      if (ownerBurst >= limits.ownerBurstLimit || networkBurst >= limits.networkBurstLimit) {
        return { reason: 'burst' };
      }
      if (ownerActive >= limits.ownerActiveLimit) return { reason: 'ownerLimit' };
      if (identities.network && networkActive >= limits.networkActiveLimit) return { reason: 'networkLimit' };
      if (identities.network && networkMapActive >= limits.networkMapLimit) return { reason: 'networkLimit' };

      let mapTotal = 0;
      for (const current of signs.values()) if (current.map === map.id) mapTotal += 1;
      if (mapTotal >= limits.mapTotal) return { reason: 'mapFull' };

      const area = nearby(map.id, pos, limits.densityRadius);
      const areaOwner = area.filter(current => current.owner === identities.owner).length;
      const areaNetwork = identities.network
        ? area.filter(current => current.network === identities.network).length
        : 0;
      const cell = zones.get(map.id)?.get(bucketKey(bucket(pos.x), bucket(pos.z)));
      if ((cell?.size || 0) >= limits.cellSigns || area.length >= limits.densitySigns) return { reason: 'density' };
      if (areaOwner >= limits.densityOwner) return { reason: 'ownerLimit' };
      if (areaNetwork >= limits.densityNetwork) return { reason: 'networkLimit' };

      // Orient the sign toward the player who planted it.
      const yaw = Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z);
      const sign = { id: randomUUID(), map: map.id, pos, yaw, text, style: msg.style, owner: player.signOwner,
        client: identities.client, fingerprint: identities.fingerprint, network: identities.network,
        submittedAt: now,
        removeAt: (Math.floor((now + utcOffset) / day) + 1) * day - utcOffset };
      await save(sign);
      add(sign);
      return { sign, remaining: Math.max(0, limits.ownerDaily - ownerToday - 1) };
    });
  }

  return { list, checkPlacement, mutate, publicSign, flag, reviewList, drain: () => queue };
}

module.exports = { createRegistry, issueCookie, ownerFromRequest, viewRadius, distance, mapOf, LIMITS };
