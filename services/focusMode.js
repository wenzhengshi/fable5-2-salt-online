'use strict';

const crypto = require('crypto');
const storage = require('../config/storage');

const FILE = 'focus-records.json';
const DURATION_MS = 30 * 60 * 1000;
const MAX_RECORDS = 1000;
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;
const RETRY_MS = 4000;
const RETRY_LOG_MS = 30000;

const pendingRecords = new Map();
let retryTimer = null;
let persistCooldownUntil = 0;
let lastPersistError = null;
let lastPersistLogAt = 0;
let lastPersistAt = 0;

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
  return {
    id: record.id,
    clientId: record.clientId,
    fingerprint: maskFingerprint(record.fingerprint),
    ip: maskIp(record.ip),
    startedAt: Number(record.startedAt) || 0,
    expiresAt,
    durationMs: Number(record.durationMs) || DURATION_MS,
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

function start({ clientId, fingerprint, ip, userAgent, lang } = {}) {
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
    expiresAt: now + DURATION_MS,
    durationMs: DURATION_MS,
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
  return saved;
}

module.exports = {
  FILE,
  DURATION_MS,
  normalizeClientId,
  normalizeFingerprint,
  normalizeIp,
  findActive,
  status,
  start,
  persistence,
  flush,
  publicRecord
};
