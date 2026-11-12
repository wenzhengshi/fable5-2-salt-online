'use strict';

const { WebSocketServer } = require('ws');
const storage = require('../config/storage');
const contentFilter = require('../services/contentFilter');
const chatHistory = require('../services/chatHistory');

const TICK_MS = 100;
const RESPAWN_MS = 5000;
const PROTECT_MS = 2000;
const MAX_HP = 100;
const HIT_DAMAGE = 34;
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
const SOLDIERS = ['male', 'female'];

const CALLSIGNS = ['RAVEN', 'VIPER', 'KESTREL', 'TALON', 'DRIFT', 'CINDER', 'ASH', 'MOSS', 'BREAKER', 'HALYARD', 'MARLIN', 'SABLE'];

const players = new Map();
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
  if (!player || !player.voice || !player.voice.enabled || player.voice.muted) return;
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
      if (pos && list.length < MAX_SPAWNS) list.push(pos);
    }
  }
  if (!list.length) list.push({ x: 0, y: 0, z: 4 });
  return list;
}

function pickSpawn(player) {
  const spawns = player.spawns && player.spawns.length ? player.spawns : [{ x: 0, y: 0, z: 4 }];
  const enemies = [...players.values()].filter((item) => item !== player && item.active && item.alive);
  let best = null;
  let bestScore = -Infinity;
  for (const spawn of spawns) {
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
  return best || spawns[0];
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
    voice: publicVoice(player)
  }));
}

/* ------------------------------------------------------------- game actions */

function rosterPayload() {
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
      voice: publicVoice(player)
    }))
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name));
}

function killPlayer(victim, killer, now) {
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
  }
  touchBoard(victim.name, 0, 1, 0);
  broadcast({
    type: 'kill',
    killer: killer ? { id: killer.id, name: killer.name, color: killer.color } : null,
    victim: { id: victim.id, name: victim.name, color: victim.color },
    at: now
  });
  send(victim.ws, {
    type: 'youDied',
    by: killer ? { id: killer.id, name: killer.name, color: killer.color } : null,
    respawnIn: RESPAWN_MS,
    respawnAt: victim.respawnAt
  });
}

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

function handleMessage(player, raw) {
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
  if (player.msgCount > MAX_MSG_PER_SEC) return;

  const now = Date.now();

  switch (msg.type) {
    case 'join': {
      const requested = sanitizeName(msg.name);
      const filtered = !!requested && contentFilter.isBlocked(requested);
      player.name = uniqueName(filtered ? '' : requested, player);
      player.spawns = sanitizeSpawns(msg.spawns);
      player.soldier = normalizeSoldier(msg.soldier);
      player.joined = true;
      send(player.ws, {
        type: 'joined',
        id: player.id,
        name: player.name,
        color: player.color,
        soldier: player.soldier,
        filtered
      });
      broadcast({ type: 'notice', kind: 'join', name: player.name, id: player.id });
      break;
    }
    case 'soldier': {
      const soldier = normalizeSoldier(msg.soldier);
      if (player.soldier === soldier) {
        send(player.ws, { type: 'soldierAck', soldier });
        break;
      }
      player.soldier = soldier;
      broadcast({ type: 'soldierState', id: player.id, soldier });
      break;
    }
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
    case 'state': {
      const pos = safeVec(msg.pos, player.pos);
      if (pos) {
        player.pos = pos;
      }
      if (Number.isFinite(Number(msg.yaw))) player.yaw = Number(msg.yaw);
      if (Number.isFinite(Number(msg.pitch))) player.pitch = clamp(Number(msg.pitch), -1.6, 1.6);
      if (typeof msg.active === 'boolean') player.active = msg.active;
      player.moving = !!msg.moving;
      player.sprint = !!msg.sprint;
      player.prone = false;
      player.lastSeen = now;
      break;
    }
    case 'shot': {
      if (!player.active || !player.alive) break;
      if (now - player.lastShotAt < 55) break;
      player.lastShotAt = now;
      const origin = safeVec(msg.origin);
      const dir = safeVec(msg.dir);
      if (!origin || !dir) break;
      broadcast(
        { type: 'shot', id: player.id, origin, dir },
        (other) => other !== player && other.active
      );
      break;
    }
    case 'hit': {
      const target = players.get(String(msg.targetId));
      if (!target || target === player) break;
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
      if (dist > 90) break;
      target.hp = Math.max(0, target.hp - HIT_DAMAGE);
      const killed = target.hp <= 0;
      send(target.ws, {
        type: 'damaged',
        amount: HIT_DAMAGE,
        hp: target.hp,
        from: { id: player.id, name: player.name, color: player.color, pos: player.pos }
      });
      send(player.ws, {
        type: 'hitConfirm',
        targetId: target.id,
        damage: HIT_DAMAGE,
        hp: target.hp,
        killed
      });
      if (killed) killPlayer(target, player, now);
      break;
    }
    case 'died': {
      if (!player.alive) break;
      player.alive = false;
      player.hp = 0;
      player.streak = 0;
      player.deaths += 1;
      player.respawnAt = now + RESPAWN_MS;
      touchBoard(player.name, 0, 1, 0);
      broadcast({
        type: 'kill',
        killer: null,
        victim: { id: player.id, name: player.name, color: player.color },
        at: now
      });
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
      const spawn = pickSpawn(player);
      player.alive = true;
      player.hp = MAX_HP;
      player.respawnAt = 0;
      player.pos = { x: spawn.x, y: spawn.y, z: spawn.z };
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
    case 'ping': {
      if (typeof msg.t === 'number') send(player.ws, { type: 'pong', t: msg.t });
      break;
    }
    default:
      break;
  }
}

/* --------------------------------------------------------------- connection */

function addPlayer(ws) {
  const numId = nextId;
  const id = 'p' + numId;
  nextId += 1;
  const player = {
    id,
    numId,
    name: randomName(),
    color: colorFor(id),
    soldier: 'male',
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
    msgWindow: Math.floor(Date.now() / 1000),
    msgCount: 0,
    isAlive: true
  };
  players.set(id, player);
  send(ws, {
    type: 'welcome',
    id,
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
    }
  });
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
  const roster = rosterPayload();
  const visible = [];
  for (const player of players.values()) {
    if (!player.active || !player.alive) continue;
    visible.push({
      id: player.id,
      name: player.name,
      color: player.color,
      soldier: player.soldier,
      x: round(player.pos.x),
      y: round(player.pos.y),
      z: round(player.pos.z),
      yaw: round(player.yaw),
      pitch: round(player.pitch),
      hp: Math.round(player.hp),
      moving: !!player.moving,
      sprint: !!player.sprint,
      shield: now < player.protectedUntil
    });
  }
  for (const player of players.values()) {
    if (player.ws.readyState !== 1) continue;
    send(player.ws, {
      type: 'snapshot',
      t: now,
      online: players.size,
      players: visible,
      roster,
      voice: voicePayload(),
      you: {
        id: player.id,
        name: player.name,
        kills: player.kills,
        deaths: player.deaths,
        streak: player.streak,
        bestStreak: player.bestStreak,
        hp: Math.round(player.hp),
        alive: player.alive,
        respawnAt: player.respawnAt,
        protectedUntil: player.protectedUntil
      }
    });
  }
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

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    const player = addPlayer(ws);

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

module.exports = {
  attachMultiplayer,
  getLeaderboard,
  getOnlinePlayers,
  shutdownMultiplayer() {
    flushBoard();
    chatHistory.flush();
  },
  RESPAWN_MS
};
