'use strict';

/**
 * 服务端权威多人层。
 *
 * 客户端只上报输入意图（方向、速度、朝向、开火键），所有位置、命中、伤害、
 * 击杀与复活均由本文件配合 realtime/simulation.js 计算。快照采用增量编码 +
 * 视野裁剪 + 自适应限频，旧版整包快照字段保留给兼容客户端。
 */

const { WebSocketServer } = require('ws');
const storage = require('../config/storage');
const contentFilter = require('../services/contentFilter');
const chatHistory = require('../services/chatHistory');
const focusMode = require('../services/focusMode');
const antiCheat = require('../services/antiCheat');
const sim = require('./simulation');
const world = require('./world');

const TICK_MS = sim.TICK_MS;
const TICK_HZ = Math.round(1000 / TICK_MS);
const RESPAWN_MS = 5000;
const PROTECT_MS = 2000;
const MAX_HP = 100;
const MAX_NAME = 16;
const MAX_MSG_PER_SEC = antiCheat.LIMITS.maxMessagePerSec;
const MAX_INPUT_PER_SEC = antiCheat.LIMITS.maxInputPerSec;
const MAX_MSG_BYTES = antiCheat.LIMITS.maxMessageBytes;
const MAX_SPAWNS = 32;
const CHAT_MAX = 80;
const CHAT_COOLDOWN_MS = 1200;
const MAX_AUDIO_CHUNK = 8192;
const MAX_AUDIO_BYTES_PER_SEC = 96 * 1024;
const VOICE_MAGIC = 0x56;
const PLAY_WARNINGS = [
  { key: 'focusWarn1m', thresholdMs: 60 * 1000, level: 1 },
  { key: 'focusWarn5m', thresholdMs: 5 * 60 * 1000, level: 5 }
];
const AOI_RADIUS = 165;
const MAX_ENTITIES = 48;
const FULL_SNAPSHOT_MS = 5000;
const ROSTER_MIN_MS = 900;
const SAFE_SPAWN_POINTS = [
  { x: 20, z: 20 },
  { x: 10, z: 10 },
  { x: -10, z: -10 },
  { x: -20, z: 0 },
  { x: 20, z: 0 },
  { x: 0, z: 20 },
  { x: 0, z: -10 }
];
const COLORS = ['#ffb347', '#5fd0ff', '#8affc1', '#ff7a90', '#c39bff', '#ffe066', '#7ef0e2', '#ff9f5a'];
const SOLDIERS = ['male', 'female', 'hound', 'drone'];
const FOCUS_BLOCKED_TYPES = new Set([
  'input', 'state', 'soldier', 'spawns', 'chat', 'voiceState', 'rename',
  'died', 'respawn'
]);
/* 旧协议里由客户端自行裁决的包，一律拒绝并计违规。 */
const FORGED_TYPES = new Set(['shot', 'hit', 'fire']);

const FLAG_MOVING = 1;
const FLAG_SPRINT = 2;
const FLAG_SHIELD = 4;

const CALLSIGNS = ['RAVEN', 'VIPER', 'KESTREL', 'TALON', 'DRIFT', 'CINDER', 'ASH', 'MOSS', 'BREAKER', 'HALYARD', 'MARLIN', 'SABLE'];

const players = new Map();
let nextId = 1;
let wss = null;
let timer = null;
let heartbeat = null;
let upgradeServer = null;
let upgradeHandler = null;
let lastTickAt = 0;
let tickCount = 0;
let lastVoiceHash = '';
let rosterHash = '';
let rosterCache = null;
let rosterCacheAt = 0;
let rosterCacheDirty = true;

const netStats = {
  startedAt: Date.now(),
  bytesOut: 0,
  packetsOut: 0,
  snapshots: 0,
  snapshotBytes: 0,
  fullSnapshots: 0,
  deltaAdd: 0,
  deltaUpd: 0,
  deltaRm: 0,
  droppedBackpressure: 0,
  rejectedMessages: 0,
  peakPlayers: 0,
  lastSnapshotBytes: 0,
  lastSnapshotAt: 0
};

/* ------------------------------------------------------------------ helpers */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function round(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function round3(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

function safeVec(input, limit) {
  if (!input || typeof input !== 'object') return null;
  const x = Number(input.x);
  const y = Number(input.y);
  const z = Number(input.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  const cap = Number(limit) || 900;
  return {
    x: clamp(x, -cap, cap),
    y: clamp(y, -120, 260),
    z: clamp(z, -cap, cap)
  };
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
  return SOLDIERS.includes(value) ? value : 'male';
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

function voiceHashOf(list) {
  return list.map((item) => `${item.id}:${item.enabled ? 1 : 0}${item.muted ? 1 : 0}${item.speaking ? 1 : 0}`).join('|');
}

function send(ws, payload, options) {
  if (!ws || ws.readyState !== 1) return false;
  if (options && options.dropIfBusy && ws.bufferedAmount > 48 * 1024) {
    netStats.droppedBackpressure += 1;
    return false;
  }
  let raw;
  try {
    raw = JSON.stringify(payload);
  } catch (err) {
    return false;
  }
  if (options && options.dropIfBusy && ws.bufferedAmount + raw.length > 128 * 1024) {
    netStats.droppedBackpressure += 1;
    return false;
  }
  try {
    ws.send(raw);
    netStats.bytesOut += raw.length;
    netStats.packetsOut += 1;
    if (options && options.snapshot) {
      netStats.snapshots += 1;
      netStats.snapshotBytes += raw.length;
      netStats.lastSnapshotBytes = raw.length;
      netStats.lastSnapshotAt = Date.now();
    }
    return true;
  } catch (err) {
    console.error('[mp] send failed', err && err.message);
    return false;
  }
}

function broadcast(payload, filter) {
  const raw = JSON.stringify(payload);
  for (const player of players.values()) {
    if (player.ws.readyState !== 1) continue;
    if (filter && !filter(player)) continue;
    if (player.ws.bufferedAmount > 128 * 1024) {
      netStats.droppedBackpressure += 1;
      continue;
    }
    try {
      player.ws.send(raw);
      netStats.bytesOut += raw.length;
      netStats.packetsOut += 1;
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

function distanceTo(player, other) {
  return Math.hypot(other.pos.x - player.pos.x, other.pos.z - player.pos.z);
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
  broadcastBinary(payload, (other) => other !== player && distanceTo(player, other) < 120);
}

function sanitizeSpawns(raw) {
  const list = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const pos = safeVec(item, 120);
      if (!pos || list.length >= MAX_SPAWNS) continue;
      const spawn = safeSpawnAt(pos.x, pos.z, pos.y);
      if (!spawn) continue;
      if (list.some((entry) => Math.abs(entry.x - spawn.x) < 0.05 && Math.abs(entry.z - spawn.z) < 0.05)) continue;
      list.push(spawn);
    }
  }
  if (!list.length) {
    for (const point of SAFE_SPAWN_POINTS) {
      const spawn = safeSpawnAt(point.x, point.z, 0);
      if (spawn) list.push(spawn);
    }
  }
  if (!list.length) list.push({ x: 20, y: 0, z: 20 });
  return list;
}

function safeSpawnAt(x, z, baselineY) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  if (!world.inBounds(x, z)) return null;
  const y = world.groundHeight(x, z, (Number(baselineY) || 0) + 1.2);
  if (world.blocked(x, z, world.PLAYER_RADIUS, y, y + 1.8)) return null;
  return { x: round(x), y: round(y), z: round(z) };
}

function chooseSpawn(player) {
  const picked = sim.pickSpawn(player, [...players.values()], player.spawns);
  if (picked) {
    const safe = safeSpawnAt(picked.x, picked.z, picked.y);
    if (safe) return { ...safe, yaw: Number(picked.yaw) || 0 };
  }
  for (const point of SAFE_SPAWN_POINTS) {
    const safe = safeSpawnAt(point.x, point.z, 0);
    if (safe) return { ...safe, yaw: 0 };
  }
  return { x: 20, y: 0, z: 20, yaw: 0 };
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
  } catch (err) {
    console.error('[mp] leaderboard write failed', err && err.message);
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
  return [...players.values()].map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    soldier: player.soldier,
    kills: player.kills,
    deaths: player.deaths,
    streak: player.streak,
    alive: player.alive,
    active: player.active,
    focused: player.focusUntil > now,
    voice: publicVoice(player)
  }));
}

/* ------------------------------------------------------------- game actions */

function rosterPayload() {
  const now = Date.now();
  return [...players.values()]
    .map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      soldier: player.soldier,
      kills: player.kills,
      deaths: player.deaths,
      streak: player.streak,
      alive: player.alive,
      active: player.active,
      focused: player.focusUntil > now,
      voice: publicVoice(player)
    }))
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name));
}

function rosterSignature(list) {
  return list.map((item) => [
    item.id, item.name, item.soldier, item.kills, item.deaths, item.streak,
    item.alive ? 1 : 0, item.active ? 1 : 0, item.focused ? 1 : 0,
    item.voice.enabled ? 1 : 0, item.voice.muted ? 1 : 0, item.voice.speaking ? 1 : 0
  ].join(',')).join('|');
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

function killPlayer(victim, killer, now, meta) {
  const info = meta || {};
  victim.alive = false;
  victim.hp = 0;
  victim.streak = 0;
  victim.deaths += 1;
  victim.respawnAt = now + RESPAWN_MS;
  victim.protectedUntil = 0;
  victim.vy = 0;
  victim.onGround = true;
  victim.shotCount = 0;
  if (victim.input) victim.input.fire = false;
  victim.killedAt = now;
  victim.killerId = killer ? killer.id : null;
  if (killer) {
    killer.kills += 1;
    killer.streak += 1;
    killer.bestStreak = Math.max(killer.bestStreak, killer.streak);
    touchBoard(killer.name, 1, 0, killer.streak);
  }
  touchBoard(victim.name, 0, 1, 0);
  broadcast({
    type: 'kill',
    killer: publicFighter(killer),
    victim: publicFighter(victim),
    weapon: info.weapon || null,
    distance: info.distance ? Math.round(info.distance * 10) / 10 : null,
    at: now
  });
  send(victim.ws, {
    type: 'youDied',
    by: publicFighter(killer),
    respawnIn: RESPAWN_MS,
    respawnAt: victim.respawnAt,
    distance: info.distance ? Math.round(info.distance * 10) / 10 : null
  });
}

function respawnPlayer(player, now, options) {
  const opts = options || {};
  const spawn = chooseSpawn(player);
  player.pos = {
    x: round(spawn.x),
    y: round(spawn.y),
    z: round(spawn.z)
  };
  player.yaw = Number.isFinite(spawn.yaw) && spawn.yaw ? spawn.yaw : Math.random() * Math.PI * 2;
  player.pitch = 0;
  player.vy = 0;
  player.onGround = true;
  player.flightY = Math.max(1.2, player.pos.y + 1.2);
  player.hp = MAX_HP;
  player.alive = true;
  player.active = false;
  player.respawnAt = 0;
  player.respawnedAt = now;
  player.protectedUntil = now + PROTECT_MS;
  player.lastFireAt = 0;
  player.moveLockUntil = 0;
  if (player.input) {
    player.input.fire = false;
    player.input.jump = false;
    player.input.up = false;
    player.input.down = false;
  }
  if (player.flightY && player.soldier !== 'drone') player.flightY = 0;
  send(player.ws, {
    type: 'respawned',
    pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
    yaw: player.yaw,
    hp: player.hp,
    protectedUntil: player.protectedUntil
  });
  if (!opts.silent) {
    broadcast({ type: 'notice', kind: 'return', name: player.name, id: player.id });
  }
}

function uniqueName(candidate, self) {
  const clean = sanitizeName(candidate);
  const name = (!clean || contentFilter.isBlocked(clean)) ? randomName() : clean;
  const taken = new Set(
    [...players.values()].filter((item) => item !== self).map((item) => item.name.toLowerCase())
  );
  if (!taken.has(name.toLowerCase())) return { name, filtered: clean !== '' && contentFilter.isBlocked(clean) };
  let index = 2;
  while (taken.has((name + '#' + index).toLowerCase()) && index < 50) index += 1;
  return { name: (name.slice(0, MAX_NAME - 3) + '#' + index).slice(0, MAX_NAME), filtered: false };
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

function setFocusLock(player, until, recordId, options) {
  if (!player) return 0;
  const meta = options || {};
  const expiresAt = Math.max(Date.now(), Number(until) || 0);
  const hadVoice = !!(player.voice && player.voice.enabled);
  player.focusUntil = expiresAt;
  player.focusRecordId = String(recordId || player.focusRecordId || '');
  player.focusKind = meta.kind === 'auto' ? 'auto' : 'manual';
  player.focusDurationMs = Number(meta.durationMs) || (player.focusKind === 'auto'
    ? focusMode.AUTO_DURATION_MS
    : focusMode.MANUAL_DURATION_MS);
  player.focusTrigger = String(meta.trigger || (player.focusKind === 'auto' ? 'continuous_play' : 'manual')).slice(0, 40);
  player.active = false;
  player.alive = false;
  player.hp = 0;
  player.respawnAt = 0;
  player.protectedUntil = 0;
  player.moving = false;
  player.sprint = false;
  if (player.input) player.input.fire = false;
  player.voice = { enabled: false, muted: true, speaking: false, windowAt: 0, windowBytes: 0 };
  send(player.ws, focusPayload(player, { scope: player.focusKind, playMs: Math.max(0, Number(meta.playMs) || 0) }));
  if (hadVoice) {
    broadcast({ type: 'voiceState', player: publicVoice(player) });
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

function beginAutomaticFocus(player, play) {
  if (!player || player.focusUntil > Date.now()) return false;
  try {
    const result = focusMode.startAutomatic({
      clientId: player.clientId,
      fingerprint: player.fingerprint,
      ip: player.ip,
      userAgent: player.userAgent,
      lang: player.lang,
      playMs: play && play.playMs
    });
    const record = result.record;
    const recordKind = record.kind === 'auto' ? 'auto' : 'manual';
    const lock = {
      clientId: player.clientId,
      fingerprint: player.fingerprint,
      until: record.expiresAt,
      recordId: record.id,
      kind: recordKind,
      durationMs: record.durationMs,
      trigger: record.trigger || (recordKind === 'auto' ? 'continuous_play' : 'manual'),
      playMs: record.playMs
    };
    if (!applyFocusLock(lock)) setFocusLock(player, lock.until, lock.recordId, lock);
    return true;
  } catch (err) {
    console.error('[focus] automatic focus failed', err && err.stack ? err.stack : err);
    return false;
  }
}

/* ------------------------------------------------------------- anti-cheat */

function punishment(player, result, detail) {
  if (!player || !result) return;
  if (result.action === 'silent' || result.action === 'none') return;
  if (result.action === 'kick') {
    send(player.ws, {
      type: 'antiCheat',
      action: 'kick',
      kind: result.kind,
      score: result.score,
      detail: detail || null
    });
    player.kickReason = result.kind;
    try {
      player.ws.close(4001, 'anti-cheat');
    } catch (err) {
      try { player.ws.terminate(); } catch (terminateErr) { /* ignore */ }
    }
    return;
  }
  send(player.ws, {
    type: 'antiCheat',
    action: result.action,
    kind: result.kind,
    score: result.score,
    detail: detail || null
  });
}

function flag(player, kind, detail, weight) {
  const result = antiCheat.flag(player, kind, weight, detail);
  punishment(player, result, detail);
  return result;
}

function sendCorrection(player, reason) {
  const now = Date.now();
  if (now - (player.lastCorrectionAt || 0) < 1200) return;
  player.lastCorrectionAt = now;
  send(player.ws, {
    type: 'correction',
    reason: reason || 'server',
    pos: { x: round(player.pos.x), y: round(player.pos.y), z: round(player.pos.z) },
    yaw: round3(player.yaw),
    t: now
  }, { dropIfBusy: true });
}

/**
 * 旧客户端仍会上报 pos。这里只把它当作“是否多报了位移”的反作弊信号，
 * 服务端位置永远不会被覆盖。
 */
function checkClaimedPosition(player, claimed, now) {
  if (!claimed) return;
  if (now < (player.respawnedAt || 0) + 6000) return;
  if (now < (player.protectedUntil || 0)) return;
  const dist = Math.hypot(claimed.x - player.pos.x, claimed.z - player.pos.z);
  if (dist > 15) {
    flag(player, 'speed', 'claimed ' + dist.toFixed(1) + 'm off-server');
    sendCorrection(player, 'position');
  }
}

/* ---------------------------------------------------------------- shooting */

function broadcastShot(payload, shooter) {
  broadcast(payload, (other) => other !== shooter && other.active && distanceTo(shooter, other) <= AOI_RADIUS);
}

function tryFire(player, now) {
  if (!player.joined || !player.active || !player.alive) return null;
  if (player.focusUntil > now) return null;
  if (now < (player.cheat.fireLockedUntil || 0)) return null;
  if (now - (player.lastFireAt || 0) < sim.FIRE_COOLDOWN_MS) return null;
  if (now < (player.moveLockUntil || 0) + 200) return null;
  player.lastFireAt = now;

  const shooter = player;
  const result = sim.resolveShot(player, [...players.values()], now, {
    onHit(target, info) {
      send(target.ws, {
        type: 'damaged',
        amount: info.damage,
        hp: target.hp,
        from: {
          ...publicFighter(shooter),
          pos: { x: round(shooter.pos.x), y: round(shooter.pos.y), z: round(shooter.pos.z) }
        },
        distance: round(info.distance)
      }, { dropIfBusy: true });
      if (!info.killed) {
        target.lastAttackerId = shooter.id;
        target.lastDamagedAt = now;
      }
    },
    onBlocked(target) {
      send(shooter.ws, {
        type: 'hitConfirm',
        targetId: target.id,
        blocked: true,
        killed: false
      }, { dropIfBusy: true });
    },
    onKill(target, info) {
      killPlayer(target, shooter, now, { weapon: info.weapon || 'rifle', distance: info.distance });
    }
  });

  if (!result) return null;
  broadcastShot({
    type: 'shot',
    id: player.id,
    origin: { x: round3(result.origin.x), y: round3(result.origin.y), z: round3(result.origin.z) },
    dir: { x: round3(result.dir.x), y: round3(result.dir.y), z: round3(result.dir.z) },
    end: { x: round(result.end.x), y: round(result.end.y), z: round(result.end.z) },
    hit: result.hit && !result.hit.shielded ? result.hit.id : null
  }, player);

  if (result.hit && !result.hit.shielded) {
    send(player.ws, {
      type: 'hitConfirm',
      targetId: result.hit.id,
      damage: result.hit.damage,
      hp: result.hit.hp,
      killed: result.hit.killed,
      distance: round(result.distance)
    }, { dropIfBusy: true });
  }
  return result;
}

/* --------------------------------------------------------------- snapshots */

function entityFlags(player, now) {
  let flags = 0;
  if (player.speed > 0.25 || player.moving) flags |= FLAG_MOVING;
  if (player.sprint) flags |= FLAG_SPRINT;
  if (now < player.protectedUntil) flags |= FLAG_SHIELD;
  return flags;
}

function snapshotInterval() {
  const count = players.size;
  if (count <= 12) return 100;
  if (count <= 24) return 125;
  if (count <= 48) return 165;
  if (count <= 80) return 200;
  return 250;
}

function snapshotFor(player, now, interval) {
  const full = !player.lastSentMap || now - (player.lastFullAt || 0) >= FULL_SNAPSHOT_MS;
  if (full) player.lastFullAt = now;
  const known = player.lastSentMap || new Map();
  const add = [];
  const upd = [];
  const rm = [];
  const seen = new Set();
  const nearby = [];

  for (const other of players.values()) {
    if (other === player) continue;
    if (!other.active || !other.alive) continue;
    if (other.focusUntil > now) continue;
    const dx = other.pos.x - player.pos.x;
    const dz = other.pos.z - player.pos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > AOI_RADIUS * AOI_RADIUS) continue;
    nearby.push({ other, distSq });
  }
  nearby.sort((a, b) => a.distSq - b.distSq);

  const count = Math.min(nearby.length, MAX_ENTITIES);
  for (let i = 0; i < count; i += 1) {
    const other = nearby[i].other;
    seen.add(other.id);
    const x = round(other.pos.x);
    const y = round(other.pos.y);
    const z = round(other.pos.z);
    const yaw = round3(other.yaw);
    const pitch = round3(other.pitch);
    const hp = Math.round(other.hp);
    const flags = entityFlags(other, now);
    const prev = known.get(other.id);
    const record = { x, y, z, yaw, pitch, hp, flags, soldier: other.soldier };
    if (full || !prev || prev.soldier !== other.soldier) {
      add.push([other.id, x, y, z, yaw, pitch, hp, flags, other.soldier, other.name, other.color]);
      netStats.deltaAdd += 1;
    } else if (prev.x !== x || prev.y !== y || prev.z !== z || prev.yaw !== yaw ||
               prev.pitch !== pitch || prev.hp !== hp || prev.flags !== flags) {
      upd.push([other.id, x, y, z, yaw, pitch, hp, flags]);
      netStats.deltaUpd += 1;
    }
    known.set(other.id, record);
  }
  for (const id of [...known.keys()]) {
    if (seen.has(id)) continue;
    known.delete(id);
    rm.push(id);
    netStats.deltaRm += 1;
  }
  player.lastSentMap = known;

  const you = {
    id: player.id,
    name: player.name,
    kills: player.kills,
    deaths: player.deaths,
    streak: player.streak,
    bestStreak: player.bestStreak,
    hp: Math.round(player.hp),
    alive: player.alive,
    active: player.active,
    x: round(player.pos.x),
    y: round(player.pos.y),
    z: round(player.pos.z),
    yaw: round3(player.yaw),
    respawnAt: player.respawnAt,
    protectedUntil: player.protectedUntil,
    focusUntil: player.focusUntil || 0
  };

  const payload = {
    type: 'snapshot',
    t: now,
    seq: player.snapSeq = (player.snapSeq || 0) + 1,
    full,
    online: players.size,
    rate: Math.round(1000 / interval),
    interp: Math.round(interval * 1.35),
    add,
    upd,
    rm,
    you
  };

  const nowVoice = voicePayload();
  const nextVoiceHash = voiceHashOf(nowVoice);
  if (nextVoiceHash !== lastVoiceHash) {
    lastVoiceHash = nextVoiceHash;
    player.voiceSnapshot = nowVoice;
    payload.voice = nowVoice;
  }

  if (full) netStats.fullSnapshots += 1;
  return payload;
}

function buildRosterCache(now) {
  if (!rosterCache || rosterCacheDirty || now - rosterCacheAt >= ROSTER_MIN_MS) {
    const roster = rosterPayload();
    const signature = rosterSignature(roster);
    rosterCacheDirty = signature !== rosterHash;
    rosterHash = signature;
    rosterCache = roster;
    rosterCacheAt = now;
  }
  return rosterCache;
}

function sendSnapshots(now) {
  const interval = snapshotInterval();
  const roster = buildRosterCache(now);
  const includeRoster = rosterCacheDirty;
  if (includeRoster) rosterCacheDirty = false;

  if (!lastVoiceHash) lastVoiceHash = voiceHashOf(voicePayload());
  for (const player of players.values()) {
    if (player.ws.readyState !== 1) continue;
    if (player.snapAt && now < player.snapAt) continue;
    player.snapAt = now + interval;
    const payload = snapshotFor(player, now, interval);
    if (includeRoster || !player.rosterSentAt) payload.roster = roster;
    if (!payload.voice && !player.voiceSentAt) payload.voice = voicePayload();
    player.rosterSentAt = now;
    if (payload.voice) player.voiceSentAt = now;
    send(player.ws, payload, { snapshot: true, dropIfBusy: true });
  }
}

/* --------------------------------------------------------------- messages */

function trackPlayFor(player, input, now) {
  const play = focusMode.trackPlay({
    clientId: player.clientId,
    fingerprint: player.fingerprint,
    active: player.joined && !!input.active && input.visible !== false,
    now
  });
  if (play.triggered) {
    player.focusWarn5m = false;
    player.focusWarn1m = false;
    beginAutomaticFocus(player, play);
    return;
  }
  if (!play.enabled || play.continuousMs < 1000) {
    player.focusWarn5m = false;
    player.focusWarn1m = false;
    return;
  }
  if (!play.active) return;
  let sent = false;
  for (const warning of PLAY_WARNINGS) {
    if (player[warning.key] || play.remainingMs > warning.thresholdMs) continue;
    player[warning.key] = true;
    if (sent) continue;
    sent = true;
    send(player.ws, {
      type: 'focusWarning',
      level: warning.level,
      thresholdMs: warning.thresholdMs,
      remainingMs: play.remainingMs,
      playMs: play.continuousMs,
      serverTime: now
    });
  }
}

function handleInput(player, msg, now, legacy) {
  if (!player.joined) return;
  player.lastSeen = now;

  const inputSecond = Math.floor(now / 1000);
  if (player.inputWindow !== inputSecond) {
    player.inputWindow = inputSecond;
    player.inputCount = 0;
  }
  player.inputCount += 1;
  if (player.inputCount > MAX_INPUT_PER_SEC) {
    if (player.inputCount === MAX_INPUT_PER_SEC + 1) {
      flag(player, 'rate', 'inputs > ' + MAX_INPUT_PER_SEC + '/s');
    }
    return;
  }

  const seq = Number(msg.seq);
  if (Number.isFinite(seq)) {
    if (seq <= (player.lastInputSeq || 0)) {
      flag(player, 'bad_input', 'stale input seq');
      return;
    }
    player.lastInputSeq = seq;
  }

  const { input, flags } = sim.normalizeInput(msg, player.input);
  if (msg.engine && msg.engine !== player.engine) {
    flag(player, 'bad_input', 'engine mismatch');
  }
  input.engine = player.engine;
  if (flags.includes('speed')) flag(player, 'speed', 'input speed ' + input.spd.toFixed(2));
  if (flags.includes('bad_input')) flag(player, 'bad_input', 'non-finite movement');
  if (flags.includes('bad_aim')) flag(player, 'bad_aim', 'invalid aim vector');

  player.input = input;
  player.active = msg.active !== false;
  player.visible = msg.visible !== false;
  player.moving = input.spd > 0.25 && (Math.abs(input.mvx) + Math.abs(input.mvz)) > 0.02;

  if (legacy) checkClaimedPosition(player, safeVec(msg.pos, 120), now);
  if (player.active) trackPlayFor(player, input, now);
  if (input.fire) tryFire(player, now);
}

function handleMessage(player, raw) {
  const now = Date.now();
  const byteLength = Buffer.byteLength(raw, 'utf8');
  if (byteLength > MAX_MSG_BYTES) {
    flag(player, 'oversize', 'message ' + byteLength + 'B');
    return;
  }

  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (err) {
    flag(player, 'malformed', 'invalid json');
    return;
  }
  if (!msg || typeof msg.type !== 'string') {
    flag(player, 'malformed', 'missing type');
    return;
  }

  if (player.msgWindow !== Math.floor(now / 1000)) {
    player.msgWindow = Math.floor(now / 1000);
    player.msgCount = 0;
  }
  player.msgCount += 1;
  if (player.msgCount > MAX_MSG_PER_SEC) {
    if (player.msgCount === MAX_MSG_PER_SEC + 1) flag(player, 'rate', 'messages > ' + MAX_MSG_PER_SEC + '/s');
    return;
  }

  if (FORGED_TYPES.has(msg.type)) {
    flag(player, 'forged_packet', 'client-side ' + msg.type + ' rejected');
    return;
  }

  if (player.focusUntil > now && FOCUS_BLOCKED_TYPES.has(msg.type)) {
    if (msg.type !== 'chat' && now - (player.focusDeniedAt || 0) < 2000) return;
    player.focusDeniedAt = now;
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
    case 'engine': {
      if (msg.engine !== 'webgl') {
        flag(player, 'bad_input', 'unsupported engine');
        break;
      }
      player.engine = 'webgl';
      player.input.engine = 'webgl';
      break;
    }
    case 'join': {
      const requested = sanitizeName(msg.name);
      const renamed = uniqueName(requested, player);
      player.name = renamed.name;
      player.filtered = !!renamed.filtered || (!!requested && contentFilter.isBlocked(requested));
      player.spawns = sanitizeSpawns(msg.spawns);
      player.soldier = normalizeSoldier(msg.soldier);
      player.engine = 'webgl';
      player.joined = true;
      player.lastInputSeq = 0;
      player.respawnedAt = now;
      const start = chooseSpawn(player);
      player.pos = {
        x: round(start.x),
        y: round(start.y),
        z: round(start.z)
      };
      player.hp = MAX_HP;
      player.alive = true;
      player.active = false;
      player.protectedUntil = now + PROTECT_MS;
      player.flightY = Math.max(1.2, start.y + 1.2);
      player.lastSentMap = null;
      player.roster = null;
      player.voiceSnapshot = null;

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
        filtered: player.filtered,
        focus: focusPayload(player),
        netcode: {
          authoritative: true,
          tickHz: TICK_HZ,
          snapshotHz: Math.round(1000 / snapshotInterval()),
          interpMs: Math.round(snapshotInterval() * 1.35),
          delta: true,
          aoi: AOI_RADIUS,
          maxEntities: MAX_ENTITIES,
          fireCooldownMs: sim.FIRE_COOLDOWN_MS,
          weaponRange: sim.WEAPON_RANGE
        }
      });
      if (!focused) {
        broadcast({ type: 'notice', kind: 'join', name: player.name, id: player.id }, (other) => other !== player);
      }
      break;
    }
    case 'soldier': {
      const soldier = normalizeSoldier(msg.soldier);
      if (player.soldier === soldier) {
        send(player.ws, { type: 'soldierAck', soldier });
        break;
      }
      player.soldier = soldier;
      player.lastSentMap = null;
      player.respawnedAt = now;
      broadcast({ type: 'soldierState', id: player.id, soldier });
      break;
    }
    case 'spawns': {
      player.spawns = sanitizeSpawns(msg.spawns);
      break;
    }
    case 'input':
    case 'state': {
      handleInput(player, msg, now, msg.type === 'state');
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
      player.voice = { ...next, windowAt: 0, windowBytes: 0 };
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
      player.name = next.name;
      player.lastSentMap = null;
      send(player.ws, {
        type: 'joined',
        id: player.id,
        name: player.name,
        color: player.color,
        soldier: player.soldier,
        renamed: true
      });
      if (next.name !== previous) {
        broadcast({ type: 'notice', kind: 'rename', name: player.name, previous, id: player.id });
      }
      if (player.voice.enabled) {
        broadcast({ type: 'voiceState', player: publicVoice(player) });
      }
      break;
    }
    case 'died': {
      if (!player.alive) break;
      killPlayer(player, null, now, { environment: true });
      send(player.ws, {
        type: 'deathAck',
        respawnIn: RESPAWN_MS,
        respawnAt: player.respawnAt
      });
      break;
    }
    case 'respawn': {
      if (player.alive) {
        send(player.ws, {
          type: 'respawned',
          pos: { x: round(player.pos.x), y: round(player.pos.y), z: round(player.pos.z) },
          yaw: round3(player.yaw),
          protectedUntil: player.protectedUntil
        });
        break;
      }
      if (now < player.respawnAt - 600) {
        send(player.ws, { type: 'respawnWait', ms: player.respawnAt - now });
        break;
      }
      respawnPlayer(player, now);
      break;
    }
    case 'focusEnd': {
      if (player.focusUntil > now) {
        send(player.ws, focusPayload(player, { scope: player.focusKind || 'manual', denied: true }));
        break;
      }
      const endedKind = player.focusKind || 'manual';
      player.focusUntil = 0;
      player.focusRecordId = '';
      player.focusKind = '';
      player.focusDurationMs = 0;
      player.focusTrigger = '';
      respawnPlayer(player, now, { silent: true });
      send(player.ws, focusPayload(player, { scope: endedKind, kind: endedKind, ended: true, spawn: player.pos }));
      break;
    }
    case 'ping': {
      if (typeof msg.t === 'number') send(player.ws, { type: 'pong', t: msg.t });
      break;
    }
    case 'pong': {
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

function addPlayer(ws, req) {
  const numId = nextId;
  const id = 'p' + numId;
  nextId += 1;
  const query = new URLSearchParams(String((req && req.url) || '').split('?')[1] || '');
  const clientId = focusMode.normalizeClientId(query.get('clientId'));
  const fingerprint = focusMode.normalizeFingerprint(query.get('fingerprint'));
  const ip = requestIp(req);
  const focusRecord = focusMode.findActive(clientId, fingerprint);
  const focusUntil = focusRecord ? Number(focusRecord.expiresAt) || 0 : 0;
  const focusKind = focusRecord && focusRecord.kind === 'auto' ? 'auto' : 'manual';
  const initialSpawn = chooseSpawn({ spawns: null, spawnFallback: null });
  const player = {
    id,
    numId,
    name: randomName(),
    color: colorFor(id),
    soldier: 'male',
    engine: 'webgl',
    ws,
    pos: { x: initialSpawn.x, y: initialSpawn.y, z: initialSpawn.z },
    yaw: 0,
    pitch: 0,
    vy: 0,
    onGround: true,
    flightY: 1.2,
    speed: 0,
    hp: MAX_HP,
    alive: true,
    active: false,
    visible: true,
    kills: 0,
    deaths: 0,
    streak: 0,
    bestStreak: 0,
    spawns: sanitizeSpawns([]),
    spawnFallback: sanitizeSpawns([]),
    respawnAt: 0,
    respawnedAt: 0,
    protectedUntil: 0,
    killedAt: 0,
    killerId: null,
    lastAttackerId: null,
    lastDamagedAt: 0,
    lastFireAt: 0,
    lastInputSeq: 0,
    lastCorrectionAt: 0,
    moveLockUntil: 0,
    shotCount: 0,
    lastChatAt: 0,
    moving: false,
    sprint: false,
    input: sim.createInputState(),
    lastSentMap: null,
    rosterSentAt: 0,
    voiceSentAt: 0,
    voiceSnapshot: null,
    snapAt: 0,
    snapSeq: 0,
    lastFullAt: 0,
    voice: { enabled: false, muted: true, speaking: false, windowAt: 0, windowBytes: 0 },
    lastSeen: Date.now(),
    joined: false,
    clientId,
    fingerprint,
    ip,
    userAgent: String((req && req.headers && req.headers['user-agent']) || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240),
    lang: query.get('lang') === 'en-US' ? 'en-US' : 'zh-CN',
    focusUntil,
    focusRecordId: focusRecord ? focusRecord.id : '',
    focusKind: focusRecord ? focusKind : '',
    focusDurationMs: focusRecord
      ? Number(focusRecord.durationMs) || (focusKind === 'auto' ? focusMode.AUTO_DURATION_MS : focusMode.MANUAL_DURATION_MS)
      : 0,
    focusTrigger: focusRecord ? String(focusRecord.trigger || (focusKind === 'auto' ? 'continuous_play' : 'manual')).slice(0, 40) : '',
    focusWarn5m: false,
    focusWarn1m: false,
    msgWindow: Math.floor(Date.now() / 1000),
    msgCount: 0,
    inputWindow: Math.floor(Date.now() / 1000),
    inputCount: 0,
    cheat: antiCheat.createTracker(),
    kickReason: null
  };
  player.input.engine = player.engine;
  players.set(id, player);
  netStats.peakPlayers = Math.max(netStats.peakPlayers, players.size);

  send(ws, {
    type: 'welcome',
    id,
    name: player.name,
    color: player.color,
    soldier: player.soldier,
    respawnMs: RESPAWN_MS,
    online: players.size,
    authoritative: true,
    netcode: {
      tickHz: TICK_HZ,
      snapshotHz: Math.round(1000 / snapshotInterval()),
      interpMs: Math.round(snapshotInterval() * 1.35),
      delta: true,
      aoi: AOI_RADIUS,
      maxEntities: MAX_ENTITIES,
      fireCooldownMs: sim.FIRE_COOLDOWN_MS,
      weaponRange: sim.WEAPON_RANGE,
      input: 'intent-only'
    },
    voiceRelay: {
      transport: 'pcm-relay',
      sampleRate: 16000,
      frameSamples: 320,
      globalAudience: false,
      listenerMicRequired: false
    },
    focus: focusPayload(player)
  });

  if (focusUntil > Date.now()) {
    player.active = false;
    player.alive = false;
    player.hp = 0;
  }
  return player;
}

function removePlayer(player, reason) {
  if (!players.has(player.id)) return;
  const hadVoice = player.voice.enabled;
  players.delete(player.id);
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
}

function tick() {
  const now = Date.now();
  const dt = lastTickAt ? clamp((now - lastTickAt) / 1000, 0.001, 0.2) : TICK_MS / 1000;
  lastTickAt = now;
  tickCount += 1;

  for (const player of players.values()) {
    if (player.focusUntil && player.focusUntil <= now) {
      const expiredKind = player.focusKind || 'manual';
      player.focusUntil = 0;
      player.focusRecordId = '';
      player.focusKind = '';
      player.focusDurationMs = 0;
      player.focusTrigger = '';
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

    sim.stepPlayer(player, dt, now);
    if (player.input && player.input.fire) tryFire(player, now);

    if (player.joined && !player.alive && player.respawnAt && now >= player.respawnAt && !player.focusUntil) {
      respawnPlayer(player, now);
    }

  }

  sendSnapshots(now);
  antiCheat.flush();
}

/* ---------------------------------------------------------------- lifecycle */

function attachMultiplayer(server) {
  if (wss) return wss;
  loadBoard();
  if (wss) return wss;
  wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_MSG_BYTES,
    perMessageDeflate: {
      threshold: 512,
      zlibDeflateOptions: { level: 3, memLevel: 7 },
      zlibInflateOptions: { windowBits: 12 },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true
    }
  });

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

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    const player = addPlayer(ws, req);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data, isBinary) => {
      try {
        if (isBinary) {
          relayPlayerAudio(player, data);
          return;
        }
        handleMessage(player, data.toString());
      } catch (err) {
        console.error('[mp] message failed', err && err.stack ? err.stack : err);
      }
    });

    ws.on('close', () => removePlayer(player, 'close'));
    ws.on('error', (err) => {
      console.error('[mp] socket error', err && err.message);
      removePlayer(player, 'error');
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

function getNetStats() {
  const interval = snapshotInterval();
  return {
    startedAt: netStats.startedAt,
    uptimeMs: Date.now() - netStats.startedAt,
    tickHz: TICK_HZ,
    snapshotHz: Math.round(1000 / interval),
    snapshotIntervalMs: interval,
    interpMs: Math.round(interval * 1.35),
    aoiRadius: AOI_RADIUS,
    maxEntities: MAX_ENTITIES,
    players: players.size,
    peakPlayers: netStats.peakPlayers,
    bytesOut: netStats.bytesOut,
    bytesOutPerSec: Math.round((netStats.bytesOut / Math.max(1, Date.now() - netStats.startedAt)) * 1000),
    packetsOut: netStats.packetsOut,
    snapshots: netStats.snapshots,
    snapshotBytes: netStats.snapshotBytes,
    avgSnapshotBytes: netStats.snapshots
      ? Math.round(netStats.snapshotBytes / netStats.snapshots)
      : 0,
    lastSnapshotBytes: netStats.lastSnapshotBytes,
    fullSnapshots: netStats.fullSnapshots,
    deltas: {
      add: netStats.deltaAdd,
      upd: netStats.deltaUpd,
      rm: netStats.deltaRm
    },
    droppedByBackpressure: netStats.droppedBackpressure,
    antiCheat: antiCheat.stats(),
    world: world.stats(),
    simulation: {
      fireCooldownMs: sim.FIRE_COOLDOWN_MS,
      weaponRange: sim.WEAPON_RANGE,
      damage: {
        max: sim.DAMAGE_MAX,
        min: sim.DAMAGE_MIN,
        falloffStart: sim.DAMAGE_FALLOFF_START
      },
      speedLimits: sim.SPEED_LIMITS,
      unitSpeed: sim.UNIT_SPEED,
      authoritative: true
    }
  };
}

module.exports = {
  attachMultiplayer,
  getLeaderboard,
  getOnlinePlayers,
  getNetStats,
  applyFocusLock,
  shutdownMultiplayer() {
    flushBoard();
    chatHistory.flush();
    antiCheat.flush();
  },
  RESPAWN_MS,
  TICK_MS
};
