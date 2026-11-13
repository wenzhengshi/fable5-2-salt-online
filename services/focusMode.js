'use strict';

const crypto = require('crypto');
const storage = require('../config/storage');

const FILE = 'focus-records.json';
const PLAY_FILE = 'play-sessions.json';
const MANUAL_DURATION_MS = 30 * 60 * 1000;
const AUTO_DURATION_MS = 20 * 60 * 1000;
const DURATION_MS = MANUAL_DURATION_MS;
const CONTINUOUS_PLAY_LIMIT_MS = 4 * 60 * 60 * 1000;
const PLAY_RESET_MS = 5 * 60 * 1000;
const PLAY_SAMPLE_MAX_MS = 2500;
const PLAY_SAVE_DELAY_MS = 15000;
const PLAY_MAX_RECORDS = 1000;
const MAX_RECORDS = 1000;
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;
const RETRY_MS = 4000;
const RETRY_LOG_MS = 30000;

const pendingRecords = new Map();
const playRecords = new Map();
const dirtyPlayRecords = new Set();
let retryTimer = null;
let persistCooldownUntil = 0;
let lastPersistError = null;
let lastPersistLogAt = 0;
let lastPersistAt = 0;
let playRecordsLoaded = false;
let playSaveTimer = null;
let lastPlayPersistAt = 0;
let lastPlayPersistError = null;
let lastPlayPersistLogAt = 0;

function normalizeClientId(value) {
  const text = String(value || '').trim();
  return CLIENT_ID_RE.test(text) ? text : '';
}

function normalizeFingerprint(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9._:-]/g, '')
    .slice(0, 160);
}

function normalizeIp(value) {
  let text = String(value || '').split(',')[0].trim();
  if (text.startsWith('::ffff:')) text = text.slice(7);
  return text.replace(/[^A-Fa-f0-9:.]/g, '').slice(0, 64);
}

function readRecords() {
  let rows = [];
  try {
    const diskRows = storage.readJson(FILE);
    rows = Array.isArray(diskRows) ? diskRows : [];
  } catch (err) {
    console.error('[focus] records read failed', err && err.message);
  }
  if (!pendingRecords.size) return rows;

  const seen = new Set();
  const merged = [];
  for (const record of pendingRecords.values()) {
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    merged.push(record);
  }
  for (const record of rows) {
    if (!record || typeof record !== 'object' || seen.has(record.id)) continue;
    seen.add(record.id);
    merged.push(record);
  }
  return merged;
}

function errorText(err) {
  return err ? String(err.message || err) : 'storage unavailable';
}

function finiteNow(value) {
  const now = Number(value);
  return Number.isFinite(now) && now > 0 ? now : Date.now();
}

function persistError(err) {
  lastPersistError = err || new Error('storage unavailable');
  persistCooldownUntil = Date.now() + RETRY_MS;
  const now = Date.now();
  if (now - lastPersistLogAt >= RETRY_LOG_MS) {
    lastPersistLogAt = now;
    console.error('[focus] record write failed, keeping lock in memory: ' + errorText(lastPersistError));
  }
  scheduleRetry();
}

function persistPending(force) {
  if (!pendingRecords.size) return true;
  if (!force && Date.now() < persistCooldownUntil) return false;

  try {
    storage.updateJson(FILE, (rows) => {
      const byId = new Map();
      for (const record of pendingRecords.values()) {
        if (record && record.id) byId.set(record.id, record);
      }
      for (const record of Array.isArray(rows) ? rows : []) {
        if (!record || typeof record !== 'object') continue;
        if (record.id && byId.has(record.id)) continue;
        const key = record.id || ('legacy_' + String(record.startedAt || '') + '_' + String(record.clientId || ''));
        byId.set(key, record);
      }
      return [...byId.values()]
        .sort((a, b) => (Number(b.startedAt) || 0) - (Number(a.startedAt) || 0))
        .slice(0, MAX_RECORDS);
    });
    pendingRecords.clear();
    lastPersistError = null;
    lastPersistAt = Date.now();
    return true;
  } catch (err) {
    persistError(err);
    return false;
  }
}

function scheduleRetry() {
  if (retryTimer || !pendingRecords.size) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    persistPending(true);
  }, RETRY_MS);
  if (typeof retryTimer.unref === 'function') retryTimer.unref();
}

function playKey(clientId, fingerprint) {
  const cleanId = normalizeClientId(clientId);
  if (cleanId) return 'c:' + cleanId;
  const cleanFingerprint = normalizeFingerprint(fingerprint);
  return cleanFingerprint.length >= 8 ? 'f:' + cleanFingerprint : '';
}

function loadPlayRecords() {
  if (playRecordsLoaded) return;
  playRecordsLoaded = true;
  try {
    const rows = storage.readJson(PLAY_FILE);
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || typeof row !== 'object') continue;
      const key = String(row.key || playKey(row.clientId, row.fingerprint));
      if (!key || playRecords.has(key)) continue;
      playRecords.set(key, {
        key,
        clientId: normalizeClientId(row.clientId),
        fingerprint: normalizeFingerprint(row.fingerprint),
        continuousMs: Math.max(0, Math.min(CONTINUOUS_PLAY_LIMIT_MS, Number(row.continuousMs) || 0)),
        lastActiveAt: Math.max(0, Number(row.lastActiveAt) || 0),
        lastSampleAt: Math.max(0, Number(row.lastSampleAt) || 0),
        triggeredAt: Math.max(0, Number(row.triggeredAt) || 0),
        updatedAt: Math.max(0, Number(row.updatedAt) || 0)
      });
    }
  } catch (err) {
    console.error('[focus] play records read failed', err && err.message);
  }
}

function schedulePlaySave() {
  if (playSaveTimer || !dirtyPlayRecords.size) return;
  playSaveTimer = setTimeout(() => {
    playSaveTimer = null;
    persistPlayRecords(true);
  }, PLAY_SAVE_DELAY_MS);
  if (typeof playSaveTimer.unref === 'function') playSaveTimer.unref();
}

function markPlayDirty(key) {
  if (!key) return;
  dirtyPlayRecords.add(key);
  schedulePlaySave();
}

function persistPlayRecords() {
  if (!dirtyPlayRecords.size) return true;
  try {
    storage.updateJson(PLAY_FILE, (rows) => {
      const byKey = new Map();
      for (const row of Array.isArray(rows) ? rows : []) {
        if (!row || typeof row !== 'object') continue;
        const key = String(row.key || playKey(row.clientId, row.fingerprint));
        if (key) byKey.set(key, row);
      }
      for (const key of dirtyPlayRecords) {
        const row = playRecords.get(key);
        if (row) byKey.set(key, row);
      }
      return [...byKey.values()]
        .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))
        .slice(0, PLAY_MAX_RECORDS);
    });
    dirtyPlayRecords.clear();
    lastPlayPersistAt = Date.now();
    lastPlayPersistError = null;
    return true;
  } catch (err) {
    lastPlayPersistError = err || new Error('storage unavailable');
    const now = Date.now();
    if (now - lastPlayPersistLogAt >= RETRY_LOG_MS) {
      lastPlayPersistLogAt = now;
      console.error('[focus] play time write failed, keeping counter in memory: ' + errorText(lastPlayPersistError));
    }
    schedulePlaySave();
    return false;
  }
}

function playSnapshot(row, now) {
  const at = finiteNow(now);
  const stale = !!(row && row.lastActiveAt && at - row.lastActiveAt > PLAY_RESET_MS);
  const continuousMs = row && !stale
    ? Math.max(0, Math.min(CONTINUOUS_PLAY_LIMIT_MS, Number(row.continuousMs) || 0))
    : 0;
  return {
    enabled: true,
    active: !!(row && row.lastActiveAt && at - row.lastActiveAt <= 15000),
    continuousMs,
    limitMs: CONTINUOUS_PLAY_LIMIT_MS,
    remainingMs: Math.max(0, CONTINUOUS_PLAY_LIMIT_MS - continuousMs),
    autoDurationMs: AUTO_DURATION_MS,
    resetAfterMs: PLAY_RESET_MS,
    lastActiveAt: row ? Number(row.lastActiveAt) || 0 : 0
  };
}

function trackPlay({ clientId, fingerprint, active, now } = {}) {
  const at = finiteNow(now);
  const key = playKey(clientId, fingerprint);
  if (!key) return { ...playSnapshot(null, at), triggered: false, playMs: 0 };

  loadPlayRecords();
  let row = playRecords.get(key);
  if (!row) {
    row = {
      key,
      clientId: normalizeClientId(clientId),
      fingerprint: normalizeFingerprint(fingerprint),
      continuousMs: 0,
      lastActiveAt: 0,
      lastSampleAt: 0,
      triggeredAt: 0,
      updatedAt: 0
    };
    playRecords.set(key, row);
  }

  if (active !== true) {
    if (row.lastSampleAt) {
      row.lastSampleAt = 0;
      row.updatedAt = at;
      markPlayDirty(key);
    }
    return { ...playSnapshot(row, at), triggered: false, playMs: 0 };
  }

  if (row.lastActiveAt && at - row.lastActiveAt > PLAY_RESET_MS) {
    row.continuousMs = 0;
    row.lastSampleAt = 0;
    row.triggeredAt = 0;
  }

  const previousSample = Number(row.lastSampleAt) || 0;
  const delta = previousSample && at > previousSample
    ? Math.min(PLAY_SAMPLE_MAX_MS, at - previousSample)
    : 0;
  row.continuousMs = Math.min(CONTINUOUS_PLAY_LIMIT_MS, (Number(row.continuousMs) || 0) + delta);
  row.lastActiveAt = at;
  row.lastSampleAt = at;
  row.updatedAt = at;

  let triggered = false;
  let playMs = 0;
  if (row.continuousMs >= CONTINUOUS_PLAY_LIMIT_MS && !row.triggeredAt) {
    triggered = true;
    playMs = row.continuousMs;
    row.triggeredAt = at;
    row.continuousMs = 0;
    row.lastSampleAt = 0;
  }
  markPlayDirty(key);
  return { ...playSnapshot(row, at), triggered, playMs };
}

function playStatus(clientId, fingerprint, now) {
  const at = finiteNow(now);
  const key = playKey(clientId, fingerprint);
  if (!key) return playSnapshot(null, at);
  loadPlayRecords();
  return playSnapshot(playRecords.get(key), at);
}

function playPersistence() {
  const info = storage.info();
  return {
    storage: PLAY_FILE,
    persisted: dirtyPlayRecords.size === 0 && info.writable,
    pending: dirtyPlayRecords.size,
    writable: info.writable,
    dataDir: info.dir,
    dataSource: info.source,
    lastWriteAt: lastPlayPersistAt,
    lastError: lastPlayPersistError ? errorText(lastPlayPersistError) : info.error
  };
}

function recordMatches(record, clientId, fingerprint) {
  if (!record || typeof record !== 'object') return false;
  if (clientId && record.clientId === clientId) return true;
  if (fingerprint && record.fingerprint === fingerprint) return true;
  return false;
}

function findActiveIn(rows, clientId, fingerprint, now) {
  const at = Number(now) || Date.now();
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => recordMatches(row, clientId, fingerprint) && Number(row.expiresAt) > at)
    .sort((a, b) => Number(b.expiresAt) - Number(a.expiresAt))[0] || null;
}

function findActive(clientId, fingerprint, now) {
  return findActiveIn(readRecords(), clientId, fingerprint, now);
}

function maskFingerprint(value) {
  const text = String(value || '');
  if (text.length <= 10) return text ? text.slice(0, 3) + '***' : '';
  return text.slice(0, 6) + '…' + text.slice(-4);
}

function maskIp(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.includes(':')) {
    const parts = text.split(':').filter(Boolean);
    return (parts.slice(0, 2).join(':') || '::') + ':*';
  }
  const parts = text.split('.');
  if (parts.length === 4) return parts[0] + '.' + parts[1] + '.*.*';
  return text;
}

function publicRecord(record, now) {
  if (!record) return null;
  const at = Number(now) || Date.now();
  const expiresAt = Number(record.expiresAt) || 0;
  const kind = record.kind === 'auto' ? 'auto' : 'manual';
  return {
    id: record.id,
    clientId: record.clientId,
    fingerprint: maskFingerprint(record.fingerprint),
    ip: maskIp(record.ip),
    startedAt: Number(record.startedAt) || 0,
    expiresAt,
    durationMs: Number(record.durationMs) || DURATION_MS,
    kind,
    trigger: record.trigger || (kind === 'auto' ? 'continuous_play' : 'manual'),
    playMs: Math.max(0, Number(record.playMs) || 0),
    remainingMs: Math.max(0, expiresAt - at),
    active: expiresAt > at
  };
}

function status(clientId, fingerprint, now) {
  const cleanId = normalizeClientId(clientId);
  const cleanFingerprint = normalizeFingerprint(fingerprint);
  if (!cleanId && !cleanFingerprint) return { active: false, record: null };
  const active = findActive(cleanId, cleanFingerprint, now);
  return {
    active: !!active,
    record: publicRecord(active, now)
  };
}

function createFocusRecord({
  clientId,
  fingerprint,
  ip,
  userAgent,
  lang,
  kind,
  trigger,
  playMs
} = {}) {
  const cleanId = normalizeClientId(clientId);
  const cleanFingerprint = normalizeFingerprint(fingerprint);
  if (!cleanId) {
    const err = new Error('valid clientId required');
    err.code = 'FOCUS_CLIENT_ID';
    err.status = 400;
    throw err;
  }
  if (cleanFingerprint.length < 8) {
    const err = new Error('valid fingerprint required');
    err.code = 'FOCUS_FINGERPRINT';
    err.status = 400;
    throw err;
  }

  const now = Date.now();
  const focusKind = kind === 'auto' ? 'auto' : 'manual';
  const focusDuration = focusKind === 'auto' ? AUTO_DURATION_MS : MANUAL_DURATION_MS;
  const existing = findActiveIn(readRecords(), cleanId, cleanFingerprint, now);
  if (existing) {
    return {
      record: existing,
      created: false,
      persisted: !pendingRecords.has(existing.id),
      publicRecord: publicRecord(existing, now)
    };
  }

  const candidate = {
    id: 'focus_' + now.toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
    clientId: cleanId,
    fingerprint: cleanFingerprint,
    ip: normalizeIp(ip),
    userAgent: String(userAgent || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240),
    lang: lang === 'en-US' ? 'en-US' : 'zh-CN',
    startedAt: now,
    expiresAt: now + focusDuration,
    durationMs: focusDuration,
    kind: focusKind,
    trigger: String(trigger || (focusKind === 'auto' ? 'continuous_play' : 'manual')).slice(0, 40),
    playMs: Math.max(0, Number(playMs) || 0),
    updatedAt: now
  };

  let record = candidate;
  let reused = false;
  let persisted = false;
  if (Date.now() >= persistCooldownUntil) {
    try {
      storage.updateJson(FILE, (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const active = findActiveIn(list, cleanId, cleanFingerprint, now);
        if (active) {
          record = active;
          reused = true;
          return list;
        }
        return [candidate, ...list].slice(0, MAX_RECORDS);
      });
      lastPersistError = null;
      lastPersistAt = Date.now();
      persisted = true;
    } catch (err) {
      pendingRecords.set(candidate.id, candidate);
      persistError(err);
    }
  }

  if (!reused && !persisted) {
    // 即使托管数据目录暂时不可写，也先让服务端内存锁生效，并异步补写记录。
    pendingRecords.set(candidate.id, candidate);
    scheduleRetry();
  }

  return {
    record,
    created: !reused,
    persisted: persisted || !pendingRecords.has(record.id),
    publicRecord: publicRecord(record, now)
  };
}

function start(options) {
  return createFocusRecord({ ...(options || {}), kind: 'manual', trigger: 'manual' });
}

function startAutomatic(options) {
  return createFocusRecord({
    ...(options || {}),
    kind: 'auto',
    trigger: 'continuous_play'
  });
}

function persistence() {
  const info = storage.info();
  return {
    storage: 'focus-records.json',
    persisted: pendingRecords.size === 0 && info.writable,
    pending: pendingRecords.size,
    writable: info.writable,
    dataDir: info.dir,
    dataSource: info.source,
    lastWriteAt: lastPersistAt,
    lastError: lastPersistError ? errorText(lastPersistError) : info.error
  };
}

function flush() {
  const saved = persistPending(true);
  if (!saved && pendingRecords.size) {
    console.error('[focus] shutdown flush failed: ' + errorText(lastPersistError));
  }
  const playSaved = persistPlayRecords();
  if (!playSaved && dirtyPlayRecords.size) {
    console.error('[focus] play time shutdown flush failed: ' + errorText(lastPlayPersistError));
  }
  return saved && playSaved;
}

module.exports = {
  FILE,
  PLAY_FILE,
  DURATION_MS,
  MANUAL_DURATION_MS,
  AUTO_DURATION_MS,
  CONTINUOUS_PLAY_LIMIT_MS,
  PLAY_RESET_MS,
  normalizeClientId,
  normalizeFingerprint,
  normalizeIp,
  findActive,
  status,
  start,
  startAutomatic,
  trackPlay,
  playStatus,
  playPersistence,
  persistence,
  flush,
  publicRecord
};
