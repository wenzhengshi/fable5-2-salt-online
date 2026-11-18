'use strict';

const { WebSocketServer } = require('ws');
const storage = require('../config/storage');
const contentFilter = require('../services/contentFilter');
const chatHistory = require('../services/chatHistory');
const focusMode = require('../services/focusMode');
const deathReplay = require('../services/deathReplay');
const { createShop } = require('../services/shop');
const playerAuthority = require('../services/playerAuthority');
const { createPortalBosses } = require('../services/portalBosses');
const { BOSS_NAMES } = require('../public/js/portal-boss-rules');
const { isInsideAirWall, PORT_PLAYER_START } = require('../public/js/flight-collision');
const { randomUUID } = require('node:crypto');
const moderation = require('../services/moderation').createModeration();
moderation.ready.catch(error => console.error('[moderation] load failed:', error.message));
const pendingAutomaticBans = new Set();
function monitor(player, kind, now) {
  if (!moderation.signal(player, kind, now, roadSigns.mapOf(player) || 'port')) return;
  // Stop the offending session immediately while the temporary ban is saved.
  player.moderationBlocked = true;
  removePlayer(player, 'banned');
  closeBannedSocket(player.ws);
  if (!player.signOwner || pendingAutomaticBans.has(player.signOwner)) return;
  pendingAutomaticBans.add(player.signOwner);
  moderation.ban(moderation.snapshot(player), 'auto', kind).then(ban => {
    if (ban) disconnectBannedIdentity(ban.owner);
  }).catch(error => console.error('[moderation] automatic ban save failed:', error.message))
    .finally(() => pendingAutomaticBans.delete(player.signOwner));
}
const qingyun = require('../public/js/qingyun-zone');
const expeditions = require('../public/js/expedition-zones');
const roadSigns = require('../services/roadSigns');
const signRegistry = roadSigns.createRegistry();
const sameMap = (a, b) => a.mapId === b.mapId && a.inQingyun === b.inQingyun;
const mapKeyOf = (player) => player.inQingyun ? 'qingyun' : player.mapId || 'port';

const TICK_MS = 100;
const RESPAWN_MS = 5000;
const PROTECT_MS = 2000;
const MAX_HP = 100;
const arsenal = require('../public/js/arsenal-rules');
const MAX_NAME = 16;
const WORLD_LIMIT = 900;
const MAX_MSG_PER_SEC = 160;
const MAX_SPAWNS = 32;
const CHAT_MAX = 80;
const CHAT_COOLDOWN_MS = 1200;
const MAX_AUDIO_CHUNK = 8192;
const MAX_AUDIO_BYTES_PER_SEC = 96 * 1024;
const VOICE_MAGIC = 0x56;
const COLORS = ['#ffb347', '#5fd0ff', '#8affc1', '#ff7a90', '#c39bff', '#ffe066', '#7ef0e2', '#ff9f5a'];
const SOLDIERS = ['male', 'female', 'hound', 'drone', 'classic'];
const BOAT_ID = 'extraction-boat';
const BOAT_SEATS = 4;
const BOAT_DOCK = { x: 31.5, y: -1.565, z: 21, heading: -Math.PI / 2 };
const BOAT_BOARD_RADIUS = 8;
const BOAT_WORLD_RADIUS = 715;
const BOAT_MAX_SPEED = 29;
const BOAT_EMPTY_RETURN_MS = 45000;
const BOAT_SEAT_OFFSETS = [
  { x: -1.1, z: 0, y: 0.46 },
  { x: 0.15, z: -1.02, y: 0.38 },
  { x: 0.15, z: 1.02, y: 0.38 },
  { x: 1.15, z: 0, y: 0.4 }
];
const EXTERNAL_PLATFORM = { x0: 82, x1: 126, z0: -12, z1: 28, top: 0.22 };
const FOCUS_BLOCKED_TYPES = new Set([
  'state', 'soldier', 'spawns', 'chat', 'voiceState', 'rename',
  'shot', 'hit', 'died', 'respawn', 'boatBoard', 'boatLeave',
  'boatPose', 'boatInvite', 'sedanBoard', 'sedanLeave', 'sedanPose', 'sedanPortal', 'sedanReady', 'mapEnter', 'mapReturn', 'mapLeave', 'qingyunEnter', 'qingyunLeave', 'qingyunReturn',
  'followInvite', 'followInviteResponse', 'followLeave', 'followDismiss'
]);
const FOLLOW_INVITE_TTL_MS = 20000;
const FOLLOW_INVITE_COOLDOWN_MS = 1200;
const FOLLOW_MAX_PENDING = 5;
const FOLLOW_MAX_FOLLOWERS = 4;
const FOLLOW_GAP = 2.4;

const CALLSIGNS = ['RAVEN', 'VIPER', 'KESTREL', 'TALON', 'DRIFT', 'CINDER', 'ASH', 'MOSS', 'BREAKER', 'HALYARD', 'MARLIN', 'SABLE'];

const players = new Map();
const reconnectPlayers = new Map();
const RECONNECT_GRACE_MS = 120000;
const announcedFocusEvents = new Map();
const boat = {
  id: BOAT_ID,
  x: BOAT_DOCK.x,
  y: BOAT_DOCK.y,
  z: BOAT_DOCK.z,
  heading: BOAT_DOCK.heading,
  speed: 0,
  driverId: null,
  seats: new Array(BOAT_SEATS).fill(null),
  updatedAt: Date.now(),
  emptySince: Date.now(),
  lastPoseAt: 0
};
let nextId = 1;
let wss = null;
let timer = null;
let heartbeat = null;
let upgradeServer = null;
let upgradeHandler = null;

/* ------------------------------------------------------------------ helpers */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function round(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function safeVec(input, fallback) {
  if (!input || typeof input !== 'object') return fallback || null;
  const x = Number(input.x);
  const y = Number(input.y);
  const z = Number(input.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return fallback || null;
  return {
    x: clamp(x, -WORLD_LIMIT, WORLD_LIMIT),
    y: clamp(y, -80, 240),
    z: clamp(z, -WORLD_LIMIT, WORLD_LIMIT)
  };
}

function normalizeHeading(value, fallback = 0) {
  const heading = Number(value);
  if (!Number.isFinite(heading)) return fallback;
  return Math.atan2(Math.sin(heading), Math.cos(heading));
}

function boatOccupantCount() {
  return boat.seats.reduce((count, id) => count + (id ? 1 : 0), 0);
}

function boatDistanceTo(x, z) {
  return Math.hypot(Number(x) - boat.x, Number(z) - boat.z);
}

function boatSeatPosition(seat) {
  const offset = BOAT_SEAT_OFFSETS[clamp(Number(seat) || 0, 0, BOAT_SEATS - 1)] || BOAT_SEAT_OFFSETS[0];
  const cos = Math.cos(boat.heading);
  const sin = Math.sin(boat.heading);
  return {
    x: boat.x + cos * offset.x + sin * offset.z,
    y: boat.y + offset.y,
    z: boat.z - sin * offset.x + cos * offset.z
  };
}

function publicBoat() {
  return {
    id: boat.id,
    x: round(boat.x),
    y: round(boat.y),
    z: round(boat.z),
    heading: round(boat.heading),
    speed: round(boat.speed),
    driverId: boat.driverId,
    seats: boat.seats.slice(),
    occupied: boatOccupantCount(),
    capacity: BOAT_SEATS,
    updatedAt: boat.updatedAt
  };
}

function broadcastBoat() {
  broadcast({ type: 'boatState', boat: publicBoat() });
}

function removeFromBoat(player, announce = false) {
  if (!player || player.boatSeat == null) return false;
  const seat = Number(player.boatSeat);
  if (Number.isInteger(seat) && seat >= 0 && seat < BOAT_SEATS && boat.seats[seat] === player.id) {
    boat.seats[seat] = null;
  }
  player.boatSeat = null;
  if (boat.driverId === player.id) {
    boat.driverId = null;
    boat.speed = 0;
  }
  boat.updatedAt = Date.now();
  if (!boatOccupantCount()) boat.emptySince = Date.now();
  if (announce) broadcastBoat();
  return true;
}

function resetBoat(force = false) {
  if (!force && boatOccupantCount()) return false;
  boat.x = BOAT_DOCK.x;
  boat.y = BOAT_DOCK.y;
  boat.z = BOAT_DOCK.z;
  boat.heading = BOAT_DOCK.heading;
  boat.speed = 0;
  boat.driverId = null;
  boat.seats.fill(null);
  boat.updatedAt = Date.now();
  boat.emptySince = 0;
  broadcastBoat();
  return true;
}

function boatExitPoint() {
  if (boat.x > 24 && boat.x < 40 && boat.z > 13 && boat.z < 29) {
    return { x: 29.1, y: 0.05, z: clamp(boat.z, 18.2, 23.8) };
  }
  if (boat.x > 70 && boat.x < EXTERNAL_PLATFORM.x0 + 12 &&
      boat.z > EXTERNAL_PLATFORM.z0 - 10 && boat.z < EXTERNAL_PLATFORM.z1 + 10) {
    return {
      x: EXTERNAL_PLATFORM.x0 + 2.2,
      y: EXTERNAL_PLATFORM.top + 0.06,
      z: clamp(boat.z, EXTERNAL_PLATFORM.z0 + 3, EXTERNAL_PLATFORM.z1 - 3)
    };
  }
  return null;
}

function syncBoatOccupants() {
  for (let seat = 0; seat < BOAT_SEATS; seat += 1) {
    const id = boat.seats[seat];
    if (!id) continue;
    const player = players.get(String(id));
    if (!player || player.boatSeat !== seat) {
      boat.seats[seat] = null;
      continue;
    }
    const pos = boatSeatPosition(seat);
    player.pos = pos;
    player.moving = Math.abs(boat.speed) > 0.5;
    player.sprint = false;
  }
  if (boat.driverId && !boat.seats.includes(boat.driverId)) {
    boat.driverId = null;
    boat.speed = 0;
  }
  if (!boat.driverId && boat.seats[0]) {
    const driver = players.get(String(boat.seats[0]));
    if (driver && driver.alive && driver.active) boat.driverId = driver.id;
  }
}

function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_NAME);
}

function randomName() {
  const base = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
  return base + '-' + Math.floor(10 + Math.random() * 90);
}

function colorFor(id) {
  let hash = 0;
  const text = String(id || '');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function normalizeSoldier(value) {
  return SOLDIERS.includes(value) ? value : 'classic';
}

function sanitizeChat(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_MAX);
}

function publicVoice(player) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    enabled: !!player.voice.enabled,
    muted: player.voice.enabled ? !!player.voice.muted : true,
    speaking: !!player.voice.enabled && !player.voice.muted && !!player.voice.speaking
  };
}

function voicePayload() {
  return [...players.values()]
    .filter((player) => player.voice.enabled)
    .map(publicVoice);
}

function send(ws, payload) {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    console.error('[mp] send failed', err && err.message);
  }
}

function broadcast(payload, filter) {
  const raw = JSON.stringify(payload);
  for (const player of players.values()) {
    if (player.ws.readyState !== 1) continue;
    if (filter && !filter(player)) continue;
    try {
      player.ws.send(raw);
    } catch (err) {
      console.error('[mp] broadcast failed', err && err.message);
    }
  }
}

function broadcastBinary(payload, filter) {
  for (const player of players.values()) {
    if (player.ws.readyState !== 1) continue;
    if (filter && !filter(player)) continue;
    try {
      player.ws.send(payload, { binary: true });
    } catch (err) {
      console.error('[mp] binary broadcast failed', err && err.message);
    }
  }
}

function relayPlayerAudio(player, data) {
  if (!player || player.focusUntil > Date.now()) return;
  if (!player.voice || !player.voice.enabled || player.voice.muted) return;
  const frame = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (frame.length < 2 || frame.length % 2 !== 0 || frame.length > MAX_AUDIO_CHUNK) return;

  const now = Date.now();
  if (now - player.voice.windowAt >= 1000) {
    player.voice.windowAt = now;
    player.voice.windowBytes = 0;
  }
  player.voice.windowBytes += frame.length;
  if (player.voice.windowBytes > MAX_AUDIO_BYTES_PER_SEC) return;

  const payload = Buffer.allocUnsafe(5 + frame.length);
  payload[0] = VOICE_MAGIC;
  payload.writeUInt32LE(player.numId, 1);
  frame.copy(payload, 5);
  broadcastBinary(payload, (other) => other !== player);
}

function sanitizeSpawns(raw) {
  const list = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const pos = safeVec(item);
      if (pos && !qingyun.contains(pos) && list.length < MAX_SPAWNS) list.push(pos);
    }
  }
  if (!list.length) list.push({ x: 0, y: 0, z: 4 });
  return list;
}

function pickSpawn(player, now) {
  if (player.mapId) {
    const positions = [];
    for (const other of players.values()) {
      if (other !== player && other.alive && sameMap(other, player) &&
          (other.active || other.protectedUntil > now)) positions.push(other.pos);
    }
    const spawn = expeditions.pickRespawn(expeditions.maps[player.mapId], player.lastExpeditionSpawn, positions);
    player.lastExpeditionSpawn = spawn;
    return spawn;
  }
  const spawns = player.spawns && player.spawns.length ? player.spawns : [{ x: 0, y: 0, z: 4 }];
  const external = player.pos && Number(player.pos.x) > 65;
  const zoneSpawns = spawns.filter((spawn) => (Number(spawn.x) > 65) === external);
  let candidates = player.inQingyun ? qingyun.spawns : zoneSpawns.length ? zoneSpawns : spawns;
  if (!player.inQingyun && player.soldier === 'drone') {
    // Filter before scoring. Projecting an offshore spawn onto the wall can put it inside a prop.
    const inside = spawns.filter(isInsideAirWall);
    candidates = inside.length ? inside : [PORT_PLAYER_START];
  }
  const enemies = [...players.values()].filter((item) => item !== player && item.active && item.alive &&
    sameMap(item, player));
  let best = null;
  let bestScore = -Infinity;
  for (const spawn of candidates) {
    let minDist = Infinity;
    for (const enemy of enemies) {
      const dist = Math.hypot(spawn.x - enemy.pos.x, spawn.z - enemy.pos.z);
      if (dist < minDist) minDist = dist;
    }
    if (!enemies.length) minDist = 1000;
    const score = minDist * (0.85 + Math.random() * 0.3);
    if (score > bestScore) {
      bestScore = score;
      best = spawn;
    }
  }
  return best || candidates[0];
}

/* -------------------------------------------------------------- leaderboard */

const board = new Map();
let flushTimer = null;

function loadBoard() {
  let rows = [];
  try {
    rows = storage.readJson('leaderboard.json');
  } catch (err) {
    console.error('[mp] leaderboard read failed', err && err.message);
    return;
  }
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    const name = sanitizeName(row && row.name);
    if (!name || contentFilter.isBlocked(name)) continue;
    board.set(name.toLowerCase(), {
      name,
      kills: Math.max(0, Math.floor(Number(row.kills) || 0)),
      deaths: Math.max(0, Math.floor(Number(row.deaths) || 0)),
      bestStreak: Math.max(0, Math.floor(Number(row.bestStreak) || 0)),
      updatedAt: Math.max(0, Math.floor(Number(row.updatedAt) || 0))
    });
  }
}

function flushBoard() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const rows = [...board.values()]
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || b.bestStreak - a.bestStreak)
    .slice(0, 300);
  try {
    storage.writeJson('leaderboard.json', rows);
    return true;
  } catch (err) {
    console.error('[mp] leaderboard write failed', err && err.message);
    return false;
  }
}

function touchBoard(name, kills, deaths, streak) {
  const clean = sanitizeName(name);
  if (!clean || contentFilter.isBlocked(clean)) return;
  const key = clean.toLowerCase();
  const row = board.get(key) || { name: clean, kills: 0, deaths: 0, bestStreak: 0, updatedAt: 0 };
  row.name = clean;
  row.kills += kills;
  row.deaths += deaths;
  row.bestStreak = Math.max(row.bestStreak, streak || 0);
  row.updatedAt = Date.now();
  board.set(key, row);
  if (!flushTimer) flushTimer = setTimeout(flushBoard, 1200);
}

function getLeaderboard(limit) {
  return [...board.values()]
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || b.bestStreak - a.bestStreak)
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 20)))
    .map((row) => ({
      name: row.name,
      kills: row.kills,
      deaths: row.deaths,
      bestStreak: row.bestStreak,
      updatedAt: row.updatedAt
    }));
}

function getOnlinePlayers() {
  const now = Date.now();
  return [...players.values()].map((player) => {
    const focus = publicFocusState(player, now);
    return {
      id: player.id,
      name: player.name,
      color: player.color,
      soldier: player.soldier,
      kills: player.kills,
      deaths: player.deaths,
      streak: player.streak,
      alive: player.alive,
      active: player.active,
      focused: focus.active,
      focusUntil: focus.until,
      focusKind: focus.kind,
      focus,
      voice: publicVoice(player)
    };
  });
}

/* ------------------------------------------------------------- game actions */

function rosterPayload() {
  const now = Date.now();
  return [...players.values()]
    .map((player) => {
      const focus = publicFocusState(player, now);
      return {
        id: player.id,
        name: player.name,
        color: player.color,
        soldier: player.soldier,
        kills: player.kills,
        deaths: player.deaths,
        streak: player.streak,
        alive: player.alive,
        active: player.active,
        focused: focus.active,
        focusUntil: focus.until,
        focusKind: focus.kind,
        focus,
        voice: publicVoice(player)
      };
    })
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name));
}

function publicFighter(player) {
  if (!player) return null;
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    soldier: player.soldier
  };
}

/* ---------------------------------------------------------- friends & follow */

function followFriends(player) {
  if (!player || !(player.friends instanceof Set)) return [];
  return [...player.friends]
    .map((id) => publicFighter(players.get(String(id))))
    .filter(Boolean);
}

function followRequests(player, now) {
  if (!player || !(player.followRequests instanceof Map)) return [];
  const at = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  return [...player.followRequests.entries()]
    .filter(([, requestedAt]) => at - requestedAt <= FOLLOW_INVITE_TTL_MS)
    .map(([id, requestedAt]) => {
      const from = publicFighter(players.get(String(id)));
      return from ? { ...from, at: requestedAt, expiresAt: requestedAt + FOLLOW_INVITE_TTL_MS } : null;
    })
    .filter(Boolean);
}

function followBoundsFor(player) {
  if (player && player.inQingyun) return qingyun.bounds;
  const map = player && player.mapId ? expeditions.maps[player.mapId] : null;
  return map || { minX: -WORLD_LIMIT, maxX: WORLD_LIMIT, minZ: -WORLD_LIMIT, maxZ: WORLD_LIMIT };
}

function followAnchorFor(leader, follower) {
  if (!leader || !follower) return null;
  const yaw = normalizeHeading(leader.yaw, 0);
  const inCar = leader.carSeat != null && Number.isFinite(Number(leader.carHeading));
  const heading = inCar ? Number(leader.carHeading) : yaw;
  const side = inCar ? (Number(follower.numId) % 2 ? 1.75 : -1.75) : 0;
  const gap = inCar ? 2.95 : FOLLOW_GAP;
  const bounds = followBoundsFor(leader);
  return {
    x: round(clamp(leader.pos.x - Math.sin(heading) * gap + Math.cos(heading) * side,
      bounds.minX, bounds.maxX)),
    // Follow the leader's current floor/altitude instead of reusing the
    // follower's old Y. Reusing it pinned the camera to the elevation where
    // following began, so chasing someone uphill teleported it underground.
    y: round(clamp(leader.pos.y, -80, 240)),
    z: round(clamp(leader.pos.z - Math.cos(heading) * gap - Math.sin(heading) * side,
      bounds.minZ, bounds.maxZ)),
    yaw: round(heading)
  };
}

function followStatePayload(player, event, extra) {
  const leader = player && player.followingId ? players.get(String(player.followingId)) : null;
  return {
    type: 'followState',
    event: event || 'sync',
    following: leader ? { ...publicFighter(leader), anchor: followAnchorFor(leader, player) } : null,
    followers: player && player.followers instanceof Set
      ? [...player.followers].map((id) => publicFighter(players.get(String(id)))).filter(Boolean)
      : [],
    friends: followFriends(player),
    requests: followRequests(player),
    serverTime: Date.now(),
    ...(extra || {})
  };
}

function sendFollowState(player, event, extra) {
  if (!player) return;
  send(player.ws, followStatePayload(player, event, extra));
}

function addFriend(first, second) {
  if (!first || !second || first === second) return false;
  first.friends.add(second.id);
  second.friends.add(first.id);
  return true;
}

function endFollowing(follower, reason, options) {
  if (!follower || !follower.followingId) return false;
  const meta = options || {};
  const leaderId = follower.followingId;
  const leader = players.get(String(leaderId));
  follower.followingId = null;
  follower.followAnchor = null;
  if (leader && leader.followers instanceof Set) leader.followers.delete(follower.id);
  if (!meta.silent) sendFollowState(follower, 'ended', { reason: reason || 'manual' });
  if (leader && !meta.silentLeader) {
    sendFollowState(leader, 'followerLeft', {
      follower: publicFighter(follower),
      reason: reason || 'manual'
    });
  }
  return true;
}

function endFollowersOf(leader, reason) {
  if (!leader || !(leader.followers instanceof Set)) return 0;
  let ended = 0;
  for (const followerId of [...leader.followers]) {
    const follower = players.get(String(followerId));
    if (follower && follower.followingId === leader.id && endFollowing(follower, reason)) ended += 1;
    else leader.followers.delete(followerId);
  }
  return ended;
}

function startFollowing(follower, leader, now, source) {
  if (!follower || !leader || follower === leader) return false;
  if (follower.followingId) endFollowing(follower, 'switched');
  if (leader.followers.size >= FOLLOW_MAX_FOLLOWERS) {
    send(follower.ws, { type: 'followDenied', reason: 'full' });
    return false;
  }
  follower.followingId = leader.id;
  follower.followAnchor = followAnchorFor(leader, follower);
  follower.motionBudget = null;
  follower.moving = false;
  follower.sprint = false;
  leader.followers.add(follower.id);
  follower.lastFollowActionAt = now;
  sendFollowState(follower, 'started', {
    source: source || 'friend',
    autoFollow: true
  });
  sendFollowState(leader, 'followerJoined', {
    follower: publicFighter(follower)
  });
  return true;
}

function followInviteAllowed(player, target, now) {
  if (!player || !target || player === target) return 'self';
  if (!player.joined || !target.joined) return 'offline';
  if (!player.active || !player.alive || !target.active || !target.alive) return 'notReady';
  if (player.focusUntil > now || target.focusUntil > now) return 'focus';
  if (frontier.dropping(player, now) || frontier.dropping(target, now)) return 'busy';
  // The leader may already be in a car. Followers are placed beside the rear
  // door so they can catch up and board a free seat; only a follower who is
  // already in a vehicle (or either player in a boat) is busy.
  if (player.carSeat != null || player.boatSeat != null || target.boatSeat != null) return 'busy';
  if (!sameMap(player, target)) return 'map';
  return '';
}

function handleFollowInvite(player, msg, now) {
  const target = players.get(String(msg.targetId || ''));
  if (!target) {
    send(player.ws, { type: 'followDenied', reason: 'offline' });
    return;
  }
  const denied = followInviteAllowed(player, target, now);
  if (denied) {
    send(player.ws, { type: 'followDenied', reason: denied });
    return;
  }
  if (player.friends.has(target.id)) {
    startFollowing(player, target, now, 'friend');
    return;
  }
  if (now - (player.lastFollowInviteAt || 0) < FOLLOW_INVITE_COOLDOWN_MS) {
    send(player.ws, { type: 'followDenied', reason: 'rate' });
    return;
  }
  let requestedAt = target.followRequests.get(player.id);
  if (!requestedAt) {
    if (target.followRequests.size >= FOLLOW_MAX_PENDING ||
        player.pendingFollowInvites.size >= FOLLOW_MAX_PENDING) {
      send(player.ws, { type: 'followDenied', reason: 'full' });
      return;
    }
    requestedAt = now;
    target.followRequests.set(player.id, now);
    player.pendingFollowInvites.set(target.id, now);
  }
  player.lastFollowInviteAt = now;
  const expiresAt = requestedAt + FOLLOW_INVITE_TTL_MS;
  send(player.ws, {
    type: 'followInviteSent',
    target: publicFighter(target),
    expiresAt
  });
  send(target.ws, {
    type: 'followInviteReceived',
    from: publicFighter(player),
    at: requestedAt,
    expiresAt
  });
}

function handleFollowInviteResponse(player, msg, now) {
  const fromId = String(msg.fromId || '');
  const inviter = players.get(fromId);
  const requestedAt = player.followRequests.get(fromId);
  if (!requestedAt || now - requestedAt > FOLLOW_INVITE_TTL_MS) {
    player.followRequests.delete(fromId);
    if (inviter) inviter.pendingFollowInvites.delete(player.id);
    send(player.ws, { type: 'followDenied', reason: 'expired' });
    if (inviter) send(inviter.ws, {
      type: 'followInviteResult',
      accepted: false,
      reason: 'expired',
      target: publicFighter(player)
    });
    return;
  }
  player.followRequests.delete(fromId);
  if (inviter) inviter.pendingFollowInvites.delete(player.id);
  if (msg.accept !== true) {
    if (inviter) send(inviter.ws, {
      type: 'followInviteResult',
      accepted: false,
      reason: 'declined',
      target: publicFighter(player)
    });
    sendFollowState(player, 'inviteClosed', { reason: 'declined' });
    return;
  }
  const denied = inviter ? followInviteAllowed(inviter, player, now) : 'offline';
  if (denied) {
    send(player.ws, { type: 'followDenied', reason: denied });
    if (inviter) send(inviter.ws, {
      type: 'followInviteResult',
      accepted: false,
      reason: denied,
      target: publicFighter(player)
    });
    return;
  }
  addFriend(inviter, player);
  send(inviter.ws, {
    type: 'followInviteResult',
    accepted: true,
    target: publicFighter(player),
    autoFollow: true
  });
  send(player.ws, {
    type: 'followInviteResult',
    accepted: true,
    from: publicFighter(inviter),
    autoFollow: false
  });
  startFollowing(inviter, player, now, 'accepted');
}

function handleFollowDismiss(player, msg, now) {
  const follower = players.get(String(msg.targetId || ''));
  if (!follower || follower.followingId !== player.id) {
    send(player.ws, { type: 'followDenied', reason: 'notFollowing' });
    return;
  }
  endFollowing(follower, 'dismissed');
  follower.lastFollowActionAt = now;
}

function expireFollowInvites(now) {
  for (const player of players.values()) {
    for (const [fromId, requestedAt] of [...player.followRequests.entries()]) {
      if (now - requestedAt <= FOLLOW_INVITE_TTL_MS) continue;
      player.followRequests.delete(fromId);
      const inviter = players.get(String(fromId));
      if (inviter) {
        inviter.pendingFollowInvites.delete(player.id);
        send(inviter.ws, {
          type: 'followInviteResult',
          accepted: false,
          reason: 'expired',
          target: publicFighter(player)
        });
      }
    }
  }
}

function syncFollowingPlayers(now) {
  for (const follower of players.values()) {
    if (!follower.followingId) continue;
    const leader = players.get(String(follower.followingId));
    let reason = '';
    if (!leader) reason = 'offline';
    else if (!follower.active || !follower.alive) reason = 'notReady';
    else if (!leader.active || !leader.alive) reason = 'leaderDown';
    else if (leader.focusUntil > now || follower.focusUntil > now) reason = 'focus';
    else if (!sameMap(follower, leader)) reason = 'map';
    else if (follower.carSeat != null || follower.boatSeat != null) reason = 'busy';
    else if (frontier.dropping(follower, now) || frontier.dropping(leader, now)) reason = 'busy';
    if (reason) {
      endFollowing(follower, reason);
      continue;
    }
    const anchor = followAnchorFor(leader, follower);
    if (!anchor) {
      endFollowing(follower, 'offline');
      continue;
    }
    follower.followAnchor = anchor;
    follower.pos = { x: anchor.x, y: anchor.y, z: anchor.z };
    follower.yaw = normalizeHeading(leader.yaw, follower.yaw);
    follower.moving = false;
    follower.sprint = false;
    follower.lastSeen = now;
  }
}

function announceDeath(victim, killer, now) {
  const message = { type: 'kill', killer: publicFighter(killer), victim: publicFighter(victim), at: now };
  const pose = { ...victim.pos, yaw: victim.yaw, outfit: victim.outfit };
  broadcast({ ...message, pose }, player => sameMap(player, victim));
  broadcast(message, player => !sameMap(player, victim));
}

function beginPortalArrival(player, now) {
  if (!player.portalFall) return;
  player.active = false;
  player.protectedUntil = Math.max(player.protectedUntil || 0, now + 4000);
}

function killPlayer(victim, killer, now, cause = null) {
  const replay = killer ? deathReplay.build(victim, killer, now, frontier.equipmentFlags) : null;
  const deathPosition = killer ? { ...victim.pos } : null;
  endFollowing(victim, 'down');
  endFollowersOf(victim, 'leaderDown');
  removeFromBoat(victim, true);
  sedan.remove(victim);
  victim.alive = false;
  victim.hp = 0;
  victim.streak = 0;
  victim.deaths += 1;
  victim.respawnAt = now + RESPAWN_MS;
  victim.protectedUntil = 0;
  if (killer) {
    killer.kills += 1;
    killer.streak += 1;
    killer.bestStreak = Math.max(killer.bestStreak, killer.streak);
    touchBoard(killer.name, 1, 0, killer.streak);
    try { gold.dropOnDeath(victim, deathPosition, now); }
    catch (error) { console.error('[gold] player death drop failed:', error.message); }
  }
  touchBoard(victim.name, 0, 1, 0);
  announceDeath(victim, killer, now);
  send(victim.ws, {
    type: 'youDied',
    by: publicFighter(killer) || cause,
    replay,
    respawnIn: RESPAWN_MS,
    respawnAt: victim.respawnAt
  });
}

function applyPlayerDamage(target, attacker, amount, armor, now) {
  const damage = frontier.armor(target, amount, armor, now);
  target.hp = Math.max(0, target.hp - damage);
  const killed = target.hp <= 0;
  if (attacker !== target) deathReplay.recordHit(attacker, target, damage, target.hp, killed, now);
  send(target.ws, { type: 'damaged', amount: damage, hp: target.hp, from: {
    ...publicFighter(attacker), pos: attacker.pos
  } });
  if (attacker !== target) send(attacker.ws, {
    type: 'hitConfirm', targetId: target.id, damage, hp: target.hp, killed
  });
  if (killed) killPlayer(target, attacker === target ? null : attacker, now);
}

const frontierRules = require('../public/js/frontier-rules');
const frontier = require('../services/frontier')({
  send, participants: () => players.values(), sameMap, damage: applyPlayerDamage,
  onEquipmentChange: (player, mask, now) => deathReplay.recordPlayer(player, now, mask, true)
});

const gold = require('../services/gold')({ send, players, frontier });
const portalBosses = createPortalBosses({
  settleReward: gold.settleBossReward,
  mapKey: mapKeyOf, players: () => players.values(), send,
  explode(map, positions) {
    broadcast({ type: 'bossExplosion', map, positions },
      player => player.joined && mapKeyOf(player) === map);
  },
  fire(boss, shot) {
    broadcast({ type: 'shot', id: boss.id, bossKind: boss.kind, map: boss.map, ...shot },
      player => player.joined && mapKeyOf(player) === boss.map);
  },
  damage(target, boss, amount, now, origin = boss) {
    const damage = frontier.armor(target, amount, 'vest', now);
    target.hp = Math.max(0, target.hp - damage);
    const cause = {
      id: boss.id, name: BOSS_NAMES[boss.kind].zh,
      color: '#ff6f44', soldier: boss.kind === 'hound' ? 'hound' : null
    };
    send(target.ws, { type: 'damaged', amount: damage, hp: target.hp, bossDamage: true, from: {
      ...cause, pos: { x: origin.x, y: origin.y, z: origin.z }
    } });
    if (target.hp <= 0) killPlayer(target, null, now, cause);
  }
});

const shop = createShop({ players, send, gold,
  onOutfitChanged(player) {
    broadcast({ type: 'soldierState', id: player.id, soldier: player.soldier, outfit: player.outfit });
  }
});
const containers = require('../services/containers')({ send, players, frontier, gold, shop });
const sedan = require('../services/sedan')(players, send, frontier.dropping, shop.enter);

function uniqueName(candidate, self) {
  const clean = sanitizeName(candidate);
  let name = (!clean || contentFilter.isBlocked(clean)) ? randomName() : clean;
  const taken = new Set(
    [...players.values()].filter((item) => item !== self).map((item) => item.name.toLowerCase())
  );
  if (!taken.has(name.toLowerCase())) return name;
  let index = 2;
  while (taken.has((name + '#' + index).toLowerCase()) && index < 50) index += 1;
  return (name.slice(0, MAX_NAME - 3) + '#' + index).slice(0, MAX_NAME);
}

function focusPayload(player, extra) {
  const now = Date.now();
  return {
    type: 'focusState',
    active: !!(player.focusUntil > now),
    until: player.focusUntil || 0,
    remainingMs: Math.max(0, (player.focusUntil || 0) - now),
    recordId: player.focusRecordId || '',
    kind: player.focusKind || 'manual',
    durationMs: player.focusDurationMs || focusMode.MANUAL_DURATION_MS,
    trigger: player.focusTrigger || 'manual',
    serverTime: now,
    ...(extra || {})
  };
}

function publicFocusState(player, now) {
  const at = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const until = Math.max(0, Number(player && player.focusUntil) || 0);
  const active = until > at;
  return {
    active,
    until: active ? until : 0,
    remainingMs: active ? until - at : 0,
    kind: active ? (player.focusKind === 'auto' ? 'auto' : 'manual') : '',
    durationMs: active ? Math.max(0, Number(player.focusDurationMs) || 0) : 0,
    trigger: active ? String(player.focusTrigger || 'manual') : ''
  };
}

function announceFocusEvent(player, event, meta) {
  if (!player || !player.joined) return false;
  const details = meta || {};
  const at = Date.now();
  const recordId = String(details.recordId || player.focusRecordId || '');
  const announceKey = recordId ? recordId + ':' + event : '';
  if (announceKey) {
    if (announcedFocusEvents.has(announceKey)) return false;
    announcedFocusEvents.set(announceKey, at);
    while (announcedFocusEvents.size > 2000) {
      announcedFocusEvents.delete(announcedFocusEvents.keys().next().value);
    }
  }
  const focusKind = details.kind === 'auto' || player.focusKind === 'auto' ? 'auto' : 'manual';
  const durationMs = Math.max(0, Number(details.durationMs) || Number(player.focusDurationMs) || 0);
  const saved = chatHistory.append({
    kind: 'system',
    event,
    targetName: player.name,
    color: player.color,
    focusKind,
    durationMs,
    at
  });
  broadcast({
    type: 'chat',
    mid: saved && saved.id ? saved.id : 'sys:' + event + ':' + at,
    kind: 'system',
    event,
    targetName: player.name,
    color: player.color,
    focusKind,
    durationMs,
    at: saved && saved.at ? saved.at : at,
    persisted: !!(saved && saved.persisted !== false)
  });
  return true;
}

function setFocusLock(player, until, recordId, options) {
  if (!player) return 0;
  const meta = options || {};
  const now = Date.now();
  const wasFocused = player.focusUntil > now;
  const previousRecordId = player.focusRecordId || '';
  const expiresAt = Math.max(Date.now(), Number(until) || 0);
  const hadVoice = !!(player.voice && player.voice.enabled);
  endFollowing(player, 'focus');
  endFollowersOf(player, 'focus');
  player.focusUntil = expiresAt;
  player.focusRecordId = String(recordId || player.focusRecordId || '');
  player.focusKind = meta.kind === 'auto' ? 'auto' : 'manual';
  player.focusDurationMs = Number(meta.durationMs) || focusMode.MANUAL_DURATION_MS;
  player.focusTrigger = String(meta.trigger || (player.focusKind === 'auto' ? 'continuous_play' : 'manual')).slice(0, 40);
  removeFromBoat(player, true);
  sedan.remove(player);
  player.active = false;
  player.alive = false;
  player.hp = 0;
  player.respawnAt = 0;
  player.protectedUntil = 0;
  player.moving = false;
  player.sprint = false;
  player.prone = false;
  player.voice = { enabled: false, muted: true, speaking: false, windowAt: 0, windowBytes: 0 };
  send(player.ws, focusPayload(player, { scope: player.focusKind, playMs: Math.max(0, Number(meta.playMs) || 0) }));
  if (hadVoice) {
    broadcast({ type: 'voiceState', player: publicVoice(player) });
  }
  const nextRecordId = String(recordId || '');
  if (!wasFocused || (nextRecordId && nextRecordId !== previousRecordId)) {
    announceFocusEvent(player, 'focusStart');
  }
  return 1;
}

function playerMatchesFocus(player, clientId, fingerprint) {
  if (!player) return false;
  if (clientId && player.clientId === clientId) return true;
  if (fingerprint && player.fingerprint === fingerprint) return true;
  return false;
}

function applyFocusLock({ clientId, fingerprint, until, recordId, kind, durationMs, trigger, playMs } = {}) {
  let matched = 0;
  const cleanId = focusMode.normalizeClientId(clientId);
  const cleanFingerprint = focusMode.normalizeFingerprint(fingerprint);
  if (!cleanId && !cleanFingerprint) return matched;
  for (const player of players.values()) {
    if (!playerMatchesFocus(player, cleanId, cleanFingerprint)) continue;
    matched += setFocusLock(player, until, recordId, { kind, durationMs, trigger, playMs });
  }
  return matched;
}

function handleMessage(player, raw) {
  if (player.moderationBlocked) return;
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (err) {
    return;
  }
  if (!msg || typeof msg.type !== 'string') return;

  if (player.msgWindow !== Math.floor(Date.now() / 1000)) {
    player.msgWindow = Math.floor(Date.now() / 1000);
    player.msgCount = 0;
  }
  player.msgCount += 1;
  if (player.msgCount > MAX_MSG_PER_SEC) {
    // Stop counting after a bounded sample of excess traffic per second.
    if (player.msgCount <= MAX_MSG_PER_SEC + 12) monitor(player, 'packetFlood', Date.now());
    return;
  }

  const now = Date.now();


  if (player.focusUntil > now && msg.type === 'spawnMap') {
    send(player.ws, { type: 'spawnMapResult', map: msg.map, ok: false });
    return;
  }

  if (player.focusUntil > now && FOCUS_BLOCKED_TYPES.has(msg.type)) {
    if (msg.type === 'chat') {
      send(player.ws, { type: 'chatDenied', reason: 'focus', retryIn: Math.max(0, player.focusUntil - now) });
    } else {
      send(player.ws, focusPayload(player, { scope: player.focusKind || 'manual', denied: true }));
    }
    return;
  }
  if (player.focusUntil > now && msg.type !== 'ping' && msg.type !== 'join' && msg.type !== 'focusEnd') {
    send(player.ws, focusPayload(player, { scope: player.focusKind || 'manual', denied: true }));
    return;
  }

  switch (msg.type) {
    case 'join': {
      if (player.joined) { monitor(player, 'repeatJoin', now); break; }
      const resumed = player.reconnecting === true;
      player.reconnecting = false;
      const requested = sanitizeName(msg.name);
      const filtered = !resumed && !!requested && contentFilter.isBlocked(requested);
      if (!resumed) player.name = uniqueName(filtered ? '' : requested, player);
      player.spawns = sanitizeSpawns(msg.spawns);
      if (!resumed) {
        player.soldier = normalizeSoldier(msg.soldier);
        player.outfit = typeof msg.outfit === 'string' ? msg.outfit : 'default';
        playerAuthority.resetWeaponState(player);
      }
      player.joined = true;
      player.frontier = msg.frontier === true;
      player.portalFall = msg.portalFall === true;
      const focused = player.focusUntil > now;
      if (focused) {
        player.active = false;
        player.alive = false;
        player.hp = 0;
      }
      send(player.ws, {
        type: 'joined',
        id: player.id,
        name: player.name,
        color: player.color,
        soldier: player.soldier,
        filtered,
        resume: resumed ? {
          map: player.mapId || (player.inQingyun ? 'qingyun' : 'port'),
          pos: player.pos,
          yaw: player.yaw,
          pitch: player.pitch
        } : null,
        focus: focusPayload(player)
      });
      shop.publish(player);
      frontier.inventory(player);
      if (!focused && !resumed) broadcast({ type: 'notice', kind: 'join', name: player.name, id: player.id });
      break;
    }
    case 'soldier': {
      const soldier = normalizeSoldier(msg.soldier);
      const outfit = shop.outfitFor(player, msg.outfit === undefined ? player.outfit : msg.outfit);
      if (player.soldier === soldier && player.outfit === outfit) {
        send(player.ws, { type: 'soldierAck', soldier, outfit });
        break;
      }
      if (player.soldier !== soldier) player.pendingShot = null;
      player.soldier = soldier;
      player.outfit = outfit;
      broadcast({ type: 'soldierState', id: player.id, soldier, outfit });
      break;
    }
    case 'shopList':
    case 'shopBuy':
      shop.handle(player, msg, now);
      break;
    case 'spawns': {
      player.spawns = sanitizeSpawns(msg.spawns);
      break;
    }
    case 'chat': {
      if (!player.joined) break;
      if (now - player.lastChatAt < CHAT_COOLDOWN_MS) {
        send(player.ws, {
          type: 'chatDenied',
          reason: 'rate',
          retryIn: CHAT_COOLDOWN_MS - (now - player.lastChatAt)
        });
        break;
      }
      const text = sanitizeChat(msg.text);
      if (!text) {
        send(player.ws, { type: 'chatDenied', reason: 'empty' });
        break;
      }
      if (contentFilter.isBlocked(text)) {
        player.lastChatAt = now;
        send(player.ws, {
          type: 'chatDenied',
          reason: 'filtered',
          retryIn: CHAT_COOLDOWN_MS
        });
        break;
      }
      player.lastChatAt = now;
      const saved = chatHistory.append({
        playerId: player.id,
        name: player.name,
        color: player.color,
        text,
        at: now
      });
      if (!saved) {
        send(player.ws, { type: 'chatDenied', reason: 'empty' });
        break;
      }
      broadcast({
        type: 'chat',
        id: player.id,
        mid: saved.id,
        name: saved.name,
        color: saved.color,
        text: saved.text,
        at: saved.at,
        persisted: saved.persisted !== false
      });
      if (saved.persisted === false) {
        send(player.ws, {
          type: 'chatWarning',
          reason: 'storage',
          mid: saved.id
        });
      }
      break;
    }
    case 'voiceState': {
      const enabled = msg.enabled === true;
      const muted = enabled ? msg.muted === true : true;
      const next = {
        enabled,
        muted,
        speaking: enabled && !muted && msg.speaking === true
      };
      if (player.voice.enabled === next.enabled &&
          player.voice.muted === next.muted &&
          player.voice.speaking === next.speaking) break;
      player.voice = next;
      broadcast({
        type: 'voiceState',
        player: publicVoice(player)
      });
      break;
    }
    case 'rename': {
      const requested = sanitizeName(msg.name);
      if (!requested) {
        send(player.ws, { type: 'nameDenied', reason: 'invalid' });
        break;
      }
      if (contentFilter.isBlocked(requested)) {
        send(player.ws, { type: 'nameDenied', reason: 'filtered' });
        break;
      }
      const next = uniqueName(requested, player);
      const previous = player.name;
      player.name = next;
      send(player.ws, {
        type: 'joined',
        id: player.id,
        name: player.name,
        color: player.color,
        soldier: player.soldier,
        renamed: true
      });
      if (next !== previous) {
        broadcast({ type: 'notice', kind: 'rename', name: player.name, previous, id: player.id });
      }
      if (player.voice.enabled) {
        broadcast({ type: 'voiceState', player: publicVoice(player) });
      }
      break;
    }
    case 'followInvite': {
      handleFollowInvite(player, msg, now);
      break;
    }
    case 'followInviteResponse': {
      handleFollowInviteResponse(player, msg, now);
      break;
    }
    case 'followLeave': {
      if (!endFollowing(player, 'manual')) {
        send(player.ws, { type: 'followDenied', reason: 'notFollowing' });
      }
      break;
    }
    case 'followDismiss': {
      handleFollowDismiss(player, msg, now);
      break;
    }
    case 'sedanBoard':
    case 'sedanLeave':
    case 'sedanPose':
    case 'sedanPortal':
    case 'sedanReady':
      sedan.handle(player, msg, now);
      break;
    case 'boatBoard': {
      if (!player.joined || !player.alive || player.carSeat != null || (player.inQingyun || player.mapId)) {
        send(player.ws, { type: 'boatDenied', reason: 'unavailable' });
        break;
      }
      const alreadyAboard = player.boatSeat != null;
      if (!alreadyAboard && boatDistanceTo(player.pos.x, player.pos.z) > BOAT_BOARD_RADIUS) {
        send(player.ws, { type: 'boatDenied', reason: 'range' });
        break;
      }
      const requestedSeat = Number.isInteger(Number(msg.seat)) ? Number(msg.seat) : -1;
      const wantsHelm = requestedSeat === 0;
      if (wantsHelm && boat.seats[0] && boat.seats[0] !== player.id) {
        send(player.ws, { type: 'boatDenied', reason: 'helm' });
        break;
      }
      let seat = requestedSeat >= 0 && requestedSeat < BOAT_SEATS ? requestedSeat : -1;
      if (seat < 0 || (boat.seats[seat] && boat.seats[seat] !== player.id)) {
        seat = boat.seats.findIndex((id) => !id || id === player.id);
      }
      if (seat < 0) {
        send(player.ws, { type: 'boatDenied', reason: 'full' });
        break;
      }
      if (alreadyAboard) removeFromBoat(player, false);
      boat.seats[seat] = player.id;
      player.boatSeat = seat;
      if (seat === 0) boat.driverId = player.id;
      if (player.focusUntil <= now) player.active = true;
      boat.updatedAt = now;
      boat.emptySince = 0;
      syncBoatOccupants();
      send(player.ws, {
        type: 'boatAck',
        aboard: true,
        seat,
        boat: publicBoat()
      });
      broadcastBoat();
      break;
    }
    case 'boatLeave': {
      if (player.boatSeat == null) {
        send(player.ws, { type: 'boatDenied', reason: 'notAboard' });
        break;
      }
      if (Math.abs(boat.speed) > 2.4) {
        send(player.ws, { type: 'boatDenied', reason: 'moving' });
        break;
      }
      const exit = boatExitPoint();
      if (!exit) {
        send(player.ws, { type: 'boatDenied', reason: 'landing' });
        break;
      }
      removeFromBoat(player, false);
      player.pos = exit;
      player.motionBudget = null;
      player.active = player.alive && player.focusUntil <= now;
      send(player.ws, {
        type: 'boatAck',
        aboard: false,
        pos: exit,
        boat: publicBoat()
      });
      broadcastBoat();
      break;
    }
    case 'boatPose': {
      if (player.boatSeat !== 0 || boat.driverId !== player.id || !player.alive) break;
      if (now - boat.lastPoseAt < 42) break;
      const pos = safeVec(msg.pos);
      const speed = Number(msg.speed);
      const heading = Number(msg.heading);
      if (!pos || !Number.isFinite(speed) || !Number.isFinite(heading)) break;
      if (pos.x * pos.x + pos.z * pos.z > BOAT_WORLD_RADIUS * BOAT_WORLD_RADIUS) break;
      const maxStep = Math.max(4.2, Math.abs(boat.speed) * 0.4);
      if (Math.hypot(pos.x - boat.x, pos.z - boat.z) > maxStep) break;
      boat.x = pos.x;
      boat.y = clamp(pos.y, -3.2, 5.5);
      boat.z = pos.z;
      boat.heading = normalizeHeading(heading, boat.heading);
      boat.speed = clamp(speed, -8, BOAT_MAX_SPEED);
      boat.updatedAt = now;
      boat.lastPoseAt = now;
      syncBoatOccupants();
      break;
    }
    case 'boatInvite': {
      if (!player.joined || player.boatSeat == null || boat.driverId !== player.id) {
        send(player.ws, { type: 'boatDenied', reason: 'helmOnly' });
        break;
      }
      if (now - (player.lastBoatInviteAt || 0) < 2200) {
        send(player.ws, { type: 'boatDenied', reason: 'rate' });
        break;
      }
      player.lastBoatInviteAt = now;
      broadcast({
        type: 'boatInvite',
        from: publicFighter(player),
        boat: {
          x: round(boat.x),
          z: round(boat.z),
          occupied: boatOccupantCount(),
          capacity: BOAT_SEATS
        },
        at: now
      }, (other) => other.joined && other.alive && other !== player && other.focusUntil <= now);
      send(player.ws, { type: 'boatInviteSent', boat: publicBoat() });
      break;
    }
    case 'spawnMap': {
      const map = typeof msg.map === 'string' && Object.hasOwn(expeditions.maps, msg.map) ? expeditions.maps[msg.map] : null;
      const isQingyun = msg.map === 'qingyun';
      if ((!map && !isQingyun) || !player.joined || !player.alive || player.active ||
          player.hasDeployed || player.boatSeat != null) {
        send(player.ws, { type: 'spawnMapResult', map: msg.map, ok: false });
        break;
      }
      const retry = map?.id === 'lunar' && player.mapId === 'lunar';
      if (!retry && !shop.enter(msg.map, [player])) {
        send(player.ws, { type: 'spawnMapResult', map: msg.map, ok: false, reason: 'locked' });
        break;
      }
      player.inQingyun = isQingyun;
      player.mapId = map?.id || null;
      player.pos = { ...pickSpawn(player, now) };
      player.yaw = Math.PI;
      player.pitch = 0;
      player.moving = player.sprint = false;
      player.motionBudget = null;
      frontier.enter(player, now, !player.portalFall);
      beginPortalArrival(player, now);
      send(player.ws, { type: 'spawnMapResult', map: msg.map, ok: true, pos: player.pos });
      break;
    }
    case 'qingyunEnter': {
      if (player.carSeat != null) break;
      if (!player.joined || !player.alive || !player.active || player.boatSeat != null ||
          player.inQingyun || player.mapId || !qingyun.atGate(player.pos, 1.25)) break;
      player.inQingyun = true;
      player.pos = { ...qingyun.landing };
      player.yaw = 0;
      player.pitch = 0;
      player.moving = false;
      player.sprint = false;
      player.shotCredits = 0;
      player.pendingShot = null;
      player.motionBudget = null;
      beginPortalArrival(player, now);
      send(player.ws, { type: 'qingyunEntered', pos: player.pos });
      break;
    }
    case 'qingyunReturn': {
      if (player.carSeat != null) break;
      if (!player.joined || !player.alive || !player.active || !player.inQingyun ||
          !qingyun.atReturnGate(player.pos, .1)) break;
      player.inQingyun = false;
      player.pos = { ...qingyun.returnLanding };
      player.yaw = Math.PI;
      player.pitch = 0;
      player.moving = false;
      player.sprint = false;
      player.shotCredits = 0;
      player.pendingShot = null;
      player.motionBudget = null;
      beginPortalArrival(player, now);
      send(player.ws, { type: 'qingyunReturned', pos: player.pos });
      break;
    }
    case 'qingyunLeave': {
      if (player.carSeat != null) break;
      // The normal redeploy flow can bring a player back to the port.
      if (!player.inQingyun) break;
      player.inQingyun = false;
      player.pos = { ...player.spawns[0] };
      player.shotCredits = 0;
      player.pendingShot = null;
      player.motionBudget = null;
      break;
    }
    case 'mapEnter': {
      if (player.carSeat != null) break;
      const map = Object.hasOwn(expeditions.maps, msg.map) ? expeditions.maps[msg.map] : null;
      if (!map || !player.joined || !player.alive || !player.active || player.boatSeat != null ||
          !player.inQingyun || player.mapId || !expeditions.near(player.pos, map.gate, .9)) break;
      if (!shop.enter(map.id, [player])) {
        send(player.ws, { type: 'mapDenied', map: map.id, reason: 'locked' });
        break;
      }
      player.inQingyun = false;
      player.mapId = map.id;
      player.pos = { ...map.landing };
      player.yaw = 0;
      player.pitch = 0;
      player.moving = player.sprint = false;
      player.shotCredits = 0;
      player.pendingShot = null;
      player.motionBudget = null;
      frontier.enter(player, now, !player.portalFall);
      beginPortalArrival(player, now);
      send(player.ws, { type: 'mapEntered', map: map.id, pos: player.pos });
      break;
    }
    case 'mapReturn':
    case 'mapLeave': {
      if (player.carSeat != null) break;
      const map = expeditions.maps[player.mapId];
      if (!map) break;
      if (msg.type === 'mapReturn' && (!player.active || !player.alive || !expeditions.near(player.pos, map.exit, .9))) break;
      player.frontierDrop = null;
      player.mapId = null;
      player.inQingyun = msg.type === 'mapReturn';
      player.pos = { ...(player.inQingyun ? map.hub : player.spawns[0]) };
      player.yaw = player.inQingyun ? 0 : Math.PI;
      player.pitch = 0;
      player.moving = player.sprint = false;
      player.shotCredits = 0;
      player.pendingShot = null;
      player.motionBudget = null;
      if (msg.type === 'mapReturn') beginPortalArrival(player, now);
      send(player.ws, { type: 'mapReturned', pos: player.pos });
      break;
    }
    case 'signList': {
      const map = roadSigns.mapOf(player);
      if (!map || !player.joined || now - (player.signListAt || 0) < 600 && player.signListMap === map) break;
      player.signListAt = now;
      player.signListMap = map;
      signRegistry.list(map, player.pos, player.signOwner).then(signs => {
        if (roadSigns.mapOf(player) === map) send(player.ws, { type: 'signList', map, signs });
      }).catch(error => {
        console.error('[signs] load failed:', error.message);
        send(player.ws, { type: 'signResult', reason: 'storage' });
      });
      break;
    }
    case 'signCheck': {
      if (!Number.isSafeInteger(msg.requestId) || msg.requestId < 1) break;
      const respond = reason => send(player.ws, { type: 'signCheckResult', requestId: msg.requestId, reason });
      if (!player.joined || now - (player.signCheckAt || 0) < 400) {
        respond('busy');
        break;
      }
      player.signCheckAt = now;
      signRegistry.checkPlacement(player, msg.pos).then(({ reason }) => respond(reason)).catch(error => {
        console.error('[signs] placement check failed:', error.message);
        respond('storage');
      });
      break;
    }
    case 'signPlace':
    case 'signRemove': {
      const action = msg.type === 'signRemove' ? 'remove' : 'place';
      const actionId = action === 'remove' && typeof msg.id === 'string' ? msg.id : undefined;
      if (!player.joined || player.signBusy || now - (player.signEditAt || 0) < 700) {
        send(player.ws, { type: 'signResult', action, id: actionId, reason: 'busy' });
        break;
      }
      player.signEditAt = now;
      player.signBusy = true;
      signRegistry.mutate(player, msg, now, shop.claimSign).then(({ sign, removed, reason, remaining }) => {
        const id = sign?.id || actionId;
        send(player.ws, { type: 'signResult', action, id, reason, removed: !!removed, remaining });
        // The player who removed the sign must receive the change even if the
        // positional snapshot moved outside the normal view radius meanwhile.
        if (sign) {
          if (!removed) shop.refresh(player);
          broadcastSign(sign, removed, player);
        }
      }).catch(error => {
        console.error('[signs] save failed:', error.message);
        send(player.ws, { type: 'signResult', action, id: actionId, reason: 'storage' });
      }).finally(() => { player.signBusy = false; });
      break;
    }
    case 'goldList':
    case 'goldPick':
    case 'goldGift':
    case 'goldGiftResponse':
      gold.handle(player, msg, now);
      break;
    case 'ordinaryGoldHit':
      if (player.active && player.alive) gold.ordinaryHit(player, playerAuthority.takeReportedShot(player, now), msg, now);
      break;
    case 'goldHit':
      if (player.active && player.alive) gold.shoot(player, playerAuthority.takeReportedShot(player, now), msg.id, now);
      break;
    case 'containerList':
    case 'containerAction':
      containers.handle(player, msg, now);
      break;
    case 'frontierLand':
    case 'frontierPick':
    case 'frontierUse':
    case 'frontierDiscard':
    case 'frontierWear':
      frontier.handle(player, msg, now);
      break;
    case 'state': {
      if (!player.joined || frontier.dropping(player, now)) break;
      if (player.boatSeat == null && player.carSeat == null) {
        let candidate;
        const map = expeditions.maps[player.mapId];
        const rawZ = Number(msg.pos?.z);
        const rawX = Number(msg.pos?.x);
        const rawY = Number(msg.pos?.y);
        const pos = safeVec(msg.pos, player.pos);
        if (map && [rawX, rawY, rawZ].every(Number.isFinite) &&
            rawZ >= map.minZ - 2 && rawZ <= map.maxZ + 2) {
          candidate = {
            x: clamp(rawX, map.minX, map.maxX),
            y: clamp(rawY, -80, 240),
            z: clamp(rawZ, map.minZ, map.maxZ)
          };
        } else if (!map && pos && (player.inQingyun ? qingyun.contains(pos) : !qingyun.contains(pos))) {
          if (player.inQingyun) {
            const { minX, maxX, minZ, maxZ } = qingyun.bounds;
            candidate = { x: clamp(pos.x, minX, maxX), y: pos.y, z: clamp(pos.z, minZ, maxZ) };
          } else {
            candidate = playerAuthority.clampDronePosition(pos, player.soldier, player.boatSeat) || player.pos;
          }
        }
        if (candidate && player.alive && msg.active === true && !player.followingId) {
          const withinBudget = playerAuthority.observeMovement(player, candidate, now);
          player.pos = candidate;
          if (!withinBudget) monitor(player, 'positionJump', now);
        }
      }
      if (Number.isFinite(Number(msg.yaw))) player.yaw = Number(msg.yaw);
      if (Number.isFinite(Number(msg.pitch))) player.pitch = clamp(Number(msg.pitch), -1.6, 1.6);
      if (typeof msg.active === 'boolean') player.active = msg.active;
      if (typeof msg.weapon === 'string' && Object.hasOwn(arsenal, msg.weapon)) {
        if (player.frontier && frontierRules.canEquip(frontier.items(player), msg.weapon, player.mapId)) {
          player.weaponId = ['hound', 'drone'].includes(player.soldier) ? 'pac9' : msg.weapon;
        }
      }
      if (player.active && player.alive) player.hasDeployed = true;
      player.moving = !!msg.moving;
      player.sprint = !!msg.sprint;
      player.prone = false;
      player.lastSeen = now;
      if (player.active && player.alive && Number.isFinite(msg.hp) && msg.hp > player.hp) {
        monitor(player, 'healthClaim', now);
        if (player.moderationBlocked) break;
      }
      break;
    }
    case 'shot': {
      if (!player.active || !player.alive || player.carSeat === 0) break;
      const profile = player.frontier && typeof msg.weapon === 'string' && Object.hasOwn(arsenal, msg.weapon) &&
        !['hound', 'drone'].includes(player.soldier)
        ? arsenal[msg.weapon] : arsenal.pac9;
      if (player.frontier && !frontierRules.canEquip(frontier.items(player), profile.id, player.mapId)) break;
      player.pendingShot = null;
      if (now - player.lastShotAt < 55) { monitor(player, 'fireRate', now); break; }
      if (profile.model && now - (player.lastWeaponShot?.[profile.id] || 0) < 1000 / profile.rate - 35) break;
      player.lastShotAt = now;
      const origin = safeVec(msg.origin);
      if (player.mapId && origin && Number.isFinite(msg.origin.z) && Number.isFinite(msg.origin.x)) {
        origin.z = msg.origin.z;
        origin.x = msg.origin.x;
      }
      const dir = safeVec(msg.dir);
      const norm = dir && Math.hypot(dir.x, dir.y, dir.z);
      if (!origin || !norm || norm < .9 || norm > 1.1) { monitor(player, 'invalidShot', now); break; }
      dir.x /= norm;
      dir.y /= norm;
      dir.z /= norm;
      if (Math.hypot(origin.x - player.pos.x, origin.z - player.pos.z) > 2.5 ||
          Math.abs(origin.y - (player.pos.y + 1.2)) > 3.5) {
        monitor(player, 'shotOrigin', now);
        break;
      }
      if (!playerAuthority.consumeShot(player, now, profile)) { monitor(player, 'reloadBypass', now); break; }
      moderation.sharedCombat(player, now, roadSigns.mapOf(player) || 'port');
      deathReplay.recordShot(player, origin, dir, now);
      playerAuthority.acceptShotCredit(player, now, origin, dir);
      player.pendingShot.weapon = profile.id;
      (player.lastWeaponShot ||= Object.create(null))[profile.id] = now;
      player.weaponId = profile.id;
      if (profile.id === 'knife') break;
      if (portalBosses.shot(player, origin, dir, profile, now)) {
        playerAuthority.takeReportedShot(player, now);
        player.lastBossShotAt = now;
      }
      broadcast(
        { type: 'shot', id: player.id, origin, dir },
        (other) => other !== player && other.active && sameMap(other, player)
      );
      break;
    }
    case 'hit': {
      if (!player.active || !player.alive || player.lastBossShotAt === player.lastShotAt) break;
      const shot = playerAuthority.takeReportedShot(player, now);
      const target = players.get(String(msg.targetId));
      if (!target || target === player || !sameMap(target, player)) break;
      if (!player.active || !player.alive || !target.active || !target.alive) break;
      if (now - player.lastHitAt < 25) break;
      player.lastHitAt = now;
      if (now < target.protectedUntil) {
        send(player.ws, { type: 'hitConfirm', targetId: target.id, blocked: true, killed: false });
        break;
      }
      const dist = Math.hypot(
        player.pos.x - target.pos.x,
        player.pos.y - target.pos.y,
        player.pos.z - target.pos.z
      );
      if (!shot) { monitor(player, 'hitWithoutShot', now); break; }
      const profile = arsenal[shot.weapon] || arsenal.pac9;
      if (dist > profile.range + (profile.id === 'knife' ? .65 : 0)) { monitor(player, 'hitRange', now); break; }
      if (!playerAuthority.alignedHit(shot, target)) { monitor(player, 'hitOffAxis', now); break; }
      const horizontal = Math.hypot(shot.dir.x, shot.dir.z);
      const hitY = horizontal > .001 ? shot.origin.y + shot.dir.y *
        Math.hypot(target.pos.x - shot.origin.x, target.pos.z - shot.origin.z) / horizontal : target.pos.y;
      const helmet = !['hound', 'drone'].includes(target.soldier) && hitY >= target.pos.y + 1.45;
      applyPlayerDamage(target, player, profile.damage, helmet ? 'helmet' : 'vest', now);
      break;
    }
    case 'died': {
      if (!player.alive || frontier.dropping(player, now)) break;
      removeFromBoat(player, true);
      sedan.remove(player);
      player.alive = false;
      player.hp = 0;
      player.streak = 0;
      player.deaths += 1;
      player.respawnAt = now + RESPAWN_MS;
      touchBoard(player.name, 0, 1, 0);
      announceDeath(player, null, now);
      send(player.ws, { type: 'deathAck', respawnIn: RESPAWN_MS, respawnAt: player.respawnAt });
      break;
    }
    case 'respawn': {
      if (player.alive) {
        send(player.ws, {
          type: 'respawned',
          pos: player.pos,
          yaw: player.yaw,
          protectedUntil: player.protectedUntil
        });
        break;
      }
      if (now < player.respawnAt - 450) {
        send(player.ws, { type: 'respawnWait', ms: player.respawnAt - now });
        break;
      }
      const spawn = pickSpawn(player, now);
      player.alive = true;
      player.hp = MAX_HP;
      player.respawnAt = 0;
      player.pos = { x: spawn.x, y: spawn.y, z: spawn.z };
      player.motionBudget = null;
      playerAuthority.resetWeaponState(player);
      player.protectedUntil = now + PROTECT_MS;
      send(player.ws, {
        type: 'respawned',
        pos: spawn,
        yaw: Math.random() * Math.PI * 2,
        protectedUntil: player.protectedUntil
      });
      broadcast({ type: 'notice', kind: 'return', name: player.name, id: player.id });
      break;
    }
    case 'focusEnd': {
      if (player.focusUntil > now) {
        send(player.ws, focusPayload(player, { scope: player.focusKind || 'manual', denied: true }));
        break;
      }
      const endedKind = player.focusKind || 'manual';
      const endedDurationMs = Math.max(0, Number(player.focusDurationMs) || 0);
      const endedRecordId = player.focusRecordId || '';
      const hadFocus = !!(player.focusRecordId || player.focusUntil);
      player.focusUntil = 0;
      player.focusRecordId = '';
      player.focusKind = '';
      player.focusDurationMs = 0;
      player.focusTrigger = '';
      const spawn = pickSpawn(player, now);
      player.alive = true;
      player.active = false;
      player.hp = MAX_HP;
      player.respawnAt = 0;
      player.pos = { x: spawn.x, y: spawn.y, z: spawn.z };
      player.motionBudget = null;
      player.yaw = Math.random() * Math.PI * 2;
      player.moving = false;
      player.sprint = false;
      player.protectedUntil = now + PROTECT_MS;
      send(player.ws, focusPayload(player, { scope: endedKind, kind: endedKind, ended: true, spawn }));
      if (hadFocus) {
        announceFocusEvent(player, 'focusEnd', { kind: endedKind, durationMs: endedDurationMs, recordId: endedRecordId });
      }
      send(player.ws, {
        type: 'respawned',
        pos: spawn,
        yaw: player.yaw,
        protectedUntil: player.protectedUntil
      });
      break;
    }
    case 'ping': {
      if (typeof msg.t === 'number') send(player.ws, { type: 'pong', t: msg.t });
      break;
    }
    default:
      break;
  }
}

/* --------------------------------------------------------------- connection */

function requestIp(req) {
  const forwarded = req && req.headers && req.headers['x-forwarded-for'];
  const raw = forwarded ? String(forwarded).split(',')[0] : (req && req.socket && req.socket.remoteAddress);
  return focusMode.normalizeIp(raw);
}

function addPlayer(ws, req, signOwner) {
  const query = new URLSearchParams(String((req && req.url) || '').split('?')[1] || '');
  const clientId = focusMode.normalizeClientId(query.get('clientId'));
  const fingerprint = focusMode.normalizeFingerprint(query.get('fingerprint'));
  const ip = requestIp(req);
  const token = query.get('reconnect') || '';
  const reconnectToken = /^[a-f0-9]{32}$/.test(token) ? token : '';
  const previous = reconnectPlayers.get(reconnectToken);
  if (previous?.clientId === clientId &&
      (!previous.reconnectUntil || previous.reconnectUntil > Date.now())) {
    const old = previous.ws;
    const retained = players.get(previous.id) === previous;
    previous.ws = ws;
    if (retained) {
      removeFromBoat(previous, true);
      sedan.remove(previous);
      old.terminate();
    }
    previous.active = false;
    previous.moving = previous.sprint = false;
    previous.voice = { enabled: false, muted: true, speaking: false, windowAt: 0, windowBytes: 0 };
    previous.pendingShot = null;
    previous.shotCredits = 0;
    previous.motionBudget = null;
    previous.lastSeen = Date.now();
    previous.ip = ip;
    previous.reconnectUntil = 0;
    previous.reconnecting = previous.joined || previous.reconnecting;
    previous.joined = false;
    players.set(previous.id, previous);
    const activeFocus = focusMode.findActive(clientId, fingerprint);
    if (activeFocus && activeFocus.id !== previous.focusRecordId) {
      setFocusLock(previous, activeFocus.expiresAt, activeFocus.id, activeFocus);
    }
    sendWelcome(previous);
    return previous;
  }
  const focusRecord = focusMode.findActive(clientId, fingerprint);
  const focusUntil = focusRecord ? Number(focusRecord.expiresAt) || 0 : 0;
  const focusKind = focusRecord && focusRecord.kind === 'auto' ? 'auto' : 'manual';
  const numId = nextId++;
  const id = 'p' + numId;
  const player = {
    id,
    numId,
    name: randomName(),
    color: colorFor(id),
    soldier: 'classic',
    outfit: 'default',
    ws,
    pos: { x: 0, y: 0, z: 4 },
    yaw: 0,
    pitch: 0,
    prone: false,
    hp: MAX_HP,
    alive: true,
    active: false,
    kills: 0,
    deaths: 0,
    streak: 0,
    bestStreak: 0,
    spawns: [{ x: 0, y: 0, z: 4 }],
    respawnAt: 0,
    protectedUntil: 0,
    lastShotAt: 0,
    lastHitAt: 0,
    lastChatAt: 0,
    voice: { enabled: false, muted: true, speaking: false, windowAt: 0, windowBytes: 0 },
    lastSeen: Date.now(),
    joined: false,
    hasDeployed: false,
    clientId,
    fingerprint,
    signOwner,
    reconnectToken,
    modToken: randomUUID(),
    modIdentityPair: clientId && fingerprint ? 'pair:' + clientId + ':' + fingerprint : '',
    ip,
    userAgent: String((req && req.headers && req.headers['user-agent']) || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240),
    lang: query.get('lang') === 'en-US' ? 'en-US' : 'zh-CN',
    focusUntil,
    focusRecordId: focusRecord ? focusRecord.id : '',
    focusKind: focusRecord ? focusKind : '',
    focusDurationMs: focusRecord
      ? Number(focusRecord.durationMs) || focusMode.MANUAL_DURATION_MS
      : 0,
    focusTrigger: focusRecord ? String(focusRecord.trigger || (focusKind === 'auto' ? 'continuous_play' : 'manual')).slice(0, 40) : '',
    msgWindow: Math.floor(Date.now() / 1000),
    msgCount: 0,
    boatSeat: null,
    inQingyun: false,
    mapId: null,
    lastBoatInviteAt: 0,
    friends: new Set(),
    followingId: null,
    followAnchor: null,
    followers: new Set(),
    followRequests: new Map(),
    pendingFollowInvites: new Map(),
    lastFollowInviteAt: 0,
    lastFollowActionAt: 0,
    isAlive: true
  };
  players.set(id, player);
  if (reconnectToken) reconnectPlayers.set(reconnectToken, player);
  if (focusUntil > Date.now()) {
    player.active = false;
    player.alive = false;
    player.hp = 0;
  }
  sendWelcome(player);
  return player;
}

function sendWelcome(player) {
  send(player.ws, {
    type: 'welcome',
    id: player.id,
    name: player.name,
    color: player.color,
    soldier: player.soldier,
    respawnMs: RESPAWN_MS,
    online: players.size,
    voiceRelay: {
      transport: 'pcm-relay',
      sampleRate: 16000,
      frameSamples: 320,
      globalAudience: true,
      listenerMicRequired: false
    },
    focus: focusPayload(player)
  });
}

function removePlayer(player, reason) {
  if (!players.has(player.id)) return;
  endFollowing(player, 'offline', { silent: true });
  endFollowersOf(player, 'leaderLeft');
  for (const friendId of [...player.friends]) {
    const friend = players.get(String(friendId));
    if (!friend) continue;
    friend.friends.delete(player.id);
    sendFollowState(friend, 'friendUpdated', { removed: publicFighter(player) });
  }
  for (const fromId of [...player.followRequests.keys()]) {
    const inviter = players.get(String(fromId));
    if (inviter) {
      inviter.pendingFollowInvites.delete(player.id);
      send(inviter.ws, { type: 'followInviteResult', accepted: false, reason: 'offline', target: publicFighter(player) });
    }
  }
  for (const targetId of [...player.pendingFollowInvites.keys()]) {
    const target = players.get(String(targetId));
    if (target) target.followRequests.delete(player.id);
  }
  player.friends.clear();
  player.followers.clear();
  player.followRequests.clear();
  player.pendingFollowInvites.clear();
  removeFromBoat(player, true);
  sedan.remove(player);
  const hadVoice = player.voice.enabled;
  players.delete(player.id);
  if (reconnectPlayers.get(player.reconnectToken) === player) {
    if ((player.joined || player.reconnecting) && ['close', 'timeout', 'error'].includes(reason)) {
      player.reconnectUntil = Date.now() + RECONNECT_GRACE_MS;
      player.joined = true;
    } else {
      reconnectPlayers.delete(player.reconnectToken);
    }
  }
  if (hadVoice) {
    broadcast({
      type: 'voiceState',
      player: {
        ...publicVoice(player),
        enabled: false,
        muted: true,
        speaking: false
      }
    });
  }
  if (player.kills || player.deaths) {
    touchBoard(player.name, 0, 0, player.bestStreak);
  }
  broadcast({ type: 'notice', kind: 'leave', name: player.name, id: player.id, reason: reason || '' });
  if (!players.size) resetBoat(true);
}

function broadcastSign(sign, removed, actor) {
  for (const other of players.values()) {
    if (other !== actor &&
        (roadSigns.mapOf(other) !== sign.map || roadSigns.distance(other.pos, sign.pos) > roadSigns.viewRadius + 5)) continue;
    send(other.ws, { type: 'signChange', map: sign.map, id: sign.id, removed: !!removed,
      sign: removed ? undefined : signRegistry.publicSign(sign, other.signOwner) });
  }
}

async function flagRoadSign(id) {
  const sign = await signRegistry.flag(id);
  if (!sign) return false;
  broadcastSign(sign, false);
  for (const player of players.values()) {
    if (player.signOwner === sign.owner) send(player.ws, { type: 'signFlagged' });
  }
  return true;
}

function tick() {
  const now = Date.now();
  for (const [token, player] of reconnectPlayers) {
    if (player.reconnectUntil && player.reconnectUntil <= now) reconnectPlayers.delete(token);
  }
  if (!boatOccupantCount() && boat.emptySince && now - boat.emptySince > BOAT_EMPTY_RETURN_MS) {
    resetBoat();
  }
  for (const player of players.values()) {
    if (!player.focusUntil || player.focusUntil > now) continue;
    const expiredKind = player.focusKind || 'manual';
    const expiredDurationMs = Math.max(0, Number(player.focusDurationMs) || 0);
    const expiredRecordId = player.focusRecordId || '';
    player.focusUntil = 0;
    player.focusRecordId = '';
    player.focusKind = '';
    player.focusDurationMs = 0;
    player.focusTrigger = '';
    announceFocusEvent(player, 'focusEnd', {
      kind: expiredKind,
      durationMs: expiredDurationMs,
      recordId: expiredRecordId
    });
    send(player.ws, {
      type: 'focusState',
      active: false,
      expired: true,
      kind: expiredKind,
      until: 0,
      remainingMs: 0,
      serverTime: now
    });
  }
  frontier.tick(now);
  containers.tick(now);
  gold.tick(now);
  syncBoatOccupants();
  sedan.sync();
  expireFollowInvites(now);
  syncFollowingPlayers(now);
  portalBosses.tick(now);
  deathReplay.recordPlayers(players.values(), now, frontier.equipmentFlags);
  deathReplay.prune(now);
  const roster = rosterPayload();
  const visibleByMap = new Map();
  const mapCounts = Object.fromEntries(['port', 'qingyun', ...Object.keys(expeditions.maps)].map(id => [id, 0]));
  const mapKey = mapKeyOf;
  for (const player of players.values()) {
    const key = mapKey(player);
    if (player.joined && player.ws.readyState === 1 && player.focusUntil <= now &&
        (player.active || (!player.alive && player.respawnAt > 0) || frontier.dropping(player, now))) {
      mapCounts[key]++;
    }
    if (!player.active || !player.alive) continue;
    if (!visibleByMap.has(key)) visibleByMap.set(key, []);
    visibleByMap.get(key).push({
      id: player.id,
      name: player.name,
      color: player.color,
      soldier: player.soldier,
      outfit: player.outfit,
      x: round(player.pos.x),
      y: round(player.pos.y),
      z: round(player.pos.z),
      yaw: round(player.yaw),
      pitch: round(player.pitch),
      hp: Math.round(player.hp),
      armor: frontier.equipmentFlags(player),
      carSeat: player.carSeat ?? null,
      carId: player.carId || null,
      weapon: player.frontier && !frontierRules.canEquip(frontier.items(player), player.weaponId || 'pac9', player.mapId)
        ? null : player.weaponId || 'pac9',
      moving: !!player.moving,
      sprint: !!player.sprint,
      shield: now < player.protectedUntil
    });
  }
  const voice = voicePayload();
  const boatState = publicBoat();
  const bossesByMap = new Map();
  const bossBounty = players.size ? gold.bossBudget(now) : null;
  for (const player of players.values()) {
    // This state is superseded by the next tick. Let slow clients catch up.
    if (player.ws.readyState !== 1 || player.ws.bufferedAmount > 64 * 1024) continue;
    const key = mapKey(player);
    if (!bossesByMap.has(key)) {
      // Keep cat geometry available to tabs still running the previous client.
      bossesByMap.set(key, portalBosses.snapshot(key).map(boss =>
        boss.kind === 'watercolor' ? { ...boss, kind: 'cat', variant: 'watercolor' } : boss));
    }
    send(player.ws, {
      type: 'snapshot',
      t: now,
      online: players.size,
      mapCounts,
      players: visibleByMap.get(key) || [],
      roster,
      voice,
      boat: boatState,
      sedan: sedan.snapshot(key, player),
      bossMap: key,
      bossBounty,
      bosses: bossesByMap.get(key),
      you: {
        id: player.id,
        name: player.name,
        kills: player.kills,
        deaths: player.deaths,
        streak: player.streak,
        bestStreak: player.bestStreak,
        hp: Math.round(player.hp),
        alive: player.alive,
        active: player.active,
        focusUntil: player.focusUntil || 0,
        focusKind: player.focusKind || '',
        focusDurationMs: Math.max(0, Number(player.focusDurationMs) || 0),
        respawnAt: player.respawnAt,
        protectedUntil: player.protectedUntil,
        follow: {
          following: player.followingId && players.get(String(player.followingId))
            ? {
                ...publicFighter(players.get(String(player.followingId))),
                anchor: followAnchorFor(players.get(String(player.followingId)), player)
              }
            : null,
          followers: [...player.followers].map((id) => publicFighter(players.get(String(id)))).filter(Boolean),
          friends: followFriends(player),
          requests: followRequests(player, now)
        }
      }
    });
  }
}

function closeBannedSocket(socket) {
  if (socket.readyState === 1) socket.close(4403, 'Player banned');
}

async function banPlayer(token, duration, reason) {
  if (!['day', 'week', 'permanent'].includes(duration)) return null;
  const live = [...players.values()].find(player => player.modToken === token);
  const target = live ? moderation.snapshot(live) : moderation.target(token);
  const ban = await moderation.ban(target, duration, reason);
  if (!ban) return null;
  disconnectBannedIdentity(ban.owner);
  return ban;
}

function disconnectBannedIdentity(owner) {
  for (const player of players.values()) if (player.signOwner === owner) {
    player.moderationBlocked = true;
    removePlayer(player, 'banned');
    closeBannedSocket(player.ws);
  }
}

function kickPlayer(token) {
  const player = [...players.values()].find(candidate => candidate.modToken === token && candidate.joined);
  if (!player) return false;
  player.moderationBlocked = true;
  removePlayer(player, 'kicked');
  if (player.ws.readyState === 1) player.ws.close(4404, 'Removed by moderator');
  return true;
}

async function getModerationReport() {
  await moderation.ready;
  const joined = [...players.values()].filter(player => player.joined);
  const counts = new Map();
  for (const player of joined) {
    for (const key of [player.ip && 'ip:' + player.ip, player.fingerprint && 'fp:' + player.fingerprint, player.modIdentityPair]) {
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  const online = joined.map(player => ({
    token: player.modToken, id: player.id, name: player.name,
    map: roadSigns.mapOf(player) || 'port', kills: player.kills, deaths: player.deaths,
    sameIp: Math.max(0, (counts.get('ip:' + player.ip) || 0) - 1),
    sameFingerprint: Math.max(0, (counts.get('fp:' + player.fingerprint) || 0) - 1),
    samePair: Math.max(0, (counts.get(player.modIdentityPair) || 0) - 1),
    canBan: !!player.signOwner
  }));
  return { online, ...moderation.report() };
}

function attachMultiplayer(server) {
  if (wss) return wss;
  loadBoard();
  wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

  upgradeServer = server;
  upgradeHandler = (req, socket, head) => {
    const raw = String(req.url || '/');
    const queryAt = raw.indexOf('?');
    const pathname = queryAt >= 0 ? raw.slice(0, queryAt) : raw;
    if (pathname !== '/ws') return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  };
  server.on('upgrade', upgradeHandler);

  wss.on('connection', async (ws, req) => {
    if (!ws.listenerCount('error')) ws.on('error', () => {});
    try {
      await moderation.ready;
    } catch {
      ws.close(1011, 'Moderation storage unavailable');
      return;
    }
    if (ws.readyState !== 1) return;
    const owner = roadSigns.ownerFromRequest(req);
    const ban = moderation.activeBan(owner);
    if (ban || pendingAutomaticBans.has(owner)) {
      closeBannedSocket(ws);
      return;
    }
    ws.isAlive = true;
    const player = addPlayer(ws, req, owner);

    const isCurrent = () => player.ws === ws && players.get(player.id) === player;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data, isBinary) => {
      try {
        if (!isCurrent() || player.moderationBlocked) return;
        if (isBinary) {
          relayPlayerAudio(player, data);
          return;
        }
        handleMessage(player, data.toString());
      } catch (err) {
        console.error('[mp] message failed', err && err.stack ? err.stack : err);
      }
    });

    ws.on('close', () => { if (isCurrent()) removePlayer(player, 'close'); });
    ws.on('error', (err) => {
      console.error('[mp] socket error', err && err.message);
      if (isCurrent()) removePlayer(player, 'error');
    });
  });

  timer = setInterval(tick, TICK_MS);
  if (timer.unref) timer.unref();

  heartbeat = setInterval(() => {
    for (const player of players.values()) {
      if (player.ws.readyState !== 1) continue;
      if (!player.ws.isAlive) {
        try {
          player.ws.terminate();
        } catch (err) {
          /* ignore */
        }
        removePlayer(player, 'timeout');
        continue;
      }
      player.ws.isAlive = false;
      try {
        player.ws.ping();
      } catch (err) {
        /* ignore */
      }
    }
  }, 30000);
  if (heartbeat.unref) heartbeat.unref();

  wss.on('close', () => {
    if (upgradeServer && upgradeHandler) {
      upgradeServer.removeListener('upgrade', upgradeHandler);
    }
    upgradeServer = null;
    upgradeHandler = null;
    if (timer) clearInterval(timer);
    if (heartbeat) clearInterval(heartbeat);
    timer = null;
    heartbeat = null;
  });

  return wss;
}

module.exports = {
  attachMultiplayer,
  broadcastShopPrices(prices) { broadcast({ type: 'shopPrices', prices }, player => player.joined); },
  getLeaderboard,
  getOnlinePlayers,
  getModerationReport,
  banPlayer,
  kickPlayer,
  revokePlayerBan: moderation.revoke,
  applyFocusLock,
  listRoadSignsForReview: signRegistry.reviewList,
  flagRoadSign,
  async flushForBackup() {
    await signRegistry.drain();
    const boardSaved = flushBoard();
    const chatSaved = chatHistory.flush();
    const focusSaved = focusMode.flush();
    return boardSaved && chatSaved && focusSaved;
  },
  shutdownMultiplayer() {
    flushBoard();
    chatHistory.flush();
  },
  RESPAWN_MS
};
