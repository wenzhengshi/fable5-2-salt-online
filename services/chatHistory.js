'use strict';

const storage = require('../config/storage');
const contentFilter = require('./contentFilter');

const FILE = 'chat-history.jsonl';
const MAX_TEXT = 80;
const MAX_NAME = 16;
const DEFAULT_PAGE = 20;
const MAX_PAGE = 50;
const RETRY_MS = 4000;
const RETRY_LOG_MS = 30000;

let messages = [];
let pending = [];
let nextSeq = 1;
let diskStamp = '';
let lastWriteAt = 0;
let lastReadError = null;
let lastWriteError = null;
let lastFailureLogAt = 0;
let loadedAt = 0;
let retryTimer = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function errorText(err) {
  return err ? String(err.message || err) : '';
}

function sanitizeText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_NAME);
}

function sanitizeColor(raw) {
  const value = String(raw || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : '#ffb347';
}

function rowKey(row) {
  return String(row.seq) + ':' + String(row.at);
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;
  const text = sanitizeText(row.text);
  const name = sanitizeName(row.name);
  if (!text || !name || contentFilter.isBlocked(text) || contentFilter.isBlocked(name)) return null;
  const at = Math.max(0, Math.floor(Number(row.at) || 0));
  return {
    seq: Math.max(0, Math.floor(Number(row.seq) || 0)),
    playerId: typeof row.playerId === 'string' ? row.playerId.slice(0, 32) : '',
    name,
    color: sanitizeColor(row.color),
    text,
    at
  };
}

function stampOf() {
  try {
    const stat = storage.statFile(FILE);
    return stat.exists ? stat.size + ':' + stat.mtimeMs : 'missing';
  } catch (err) {
    return 'error:' + (err && err.code ? err.code : 'unknown');
  }
}

function load() {
  let rows = [];
  try {
    storage.ensureFile(FILE);
    rows = storage.readJsonl(FILE);
    lastReadError = null;
  } catch (err) {
    lastReadError = err;
    console.error('[chat] history read failed', err && err.message);
  }

  const normalized = [];
  let maxSeq = 0;
  for (const raw of rows) {
    const row = normalizeRow(raw);
    if (!row) continue;
    maxSeq = Math.max(maxSeq, row.seq);
    normalized.push(row);
  }

  const seen = new Set();
  const merged = [];
  for (const row of normalized.concat(pending)) {
    if (!row.at) row.at = Date.now();
    if (!row.seq) {
      maxSeq += 1;
      row.seq = maxSeq;
    } else {
      maxSeq = Math.max(maxSeq, row.seq);
    }
    const key = rowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  merged.sort((a, b) => a.seq - b.seq);

  messages = merged;
  nextSeq = Math.max(maxSeq, 0) + 1;
  lastWriteAt = normalized.reduce((latest, row) => Math.max(latest, row.at), 0);
  diskStamp = stampOf();
  loadedAt = Date.now();
}

function syncFromDisk(force) {
  const stamp = stampOf();
  if (!force && stamp === diskStamp) return false;
  load();
  return true;
}

function publicRow(row) {
  return {
    id: 'c' + row.seq,
    playerId: row.playerId,
    name: row.name,
    color: row.color,
    text: row.text,
    at: row.at
  };
}

function scheduleRetry() {
  if (retryTimer || !pending.length) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryPending();
  }, RETRY_MS);
  if (typeof retryTimer.unref === 'function') retryTimer.unref();
}

function retryPending() {
  if (!pending.length) return true;

  let diskRows = null;
  try {
    diskRows = storage.readJsonl(FILE);
  } catch (err) {
    lastWriteError = err;
  }

  const persistedKeys = new Set();
  if (Array.isArray(diskRows)) {
    for (const row of diskRows) {
      const normalized = normalizeRow(row);
      if (normalized) persistedKeys.add(rowKey(normalized));
    }
  }

  const remaining = [];
  for (let index = 0; index < pending.length; index += 1) {
    const row = pending[index];
    if (persistedKeys.has(rowKey(row))) continue;
    try {
      storage.appendJsonl(FILE, row);
      persistedKeys.add(rowKey(row));
      lastWriteAt = Math.max(lastWriteAt, row.at);
      lastWriteError = null;
    } catch (err) {
      lastWriteError = err;
      // 写入仍不可用时保留本条及后续记录，等下一次重试。
      remaining.push(...pending.slice(index));
      break;
    }
  }
  pending = remaining;
  diskStamp = stampOf();

  if (pending.length) {
    const now = Date.now();
    if (now - lastFailureLogAt >= RETRY_LOG_MS) {
      lastFailureLogAt = now;
      console.error('[chat] history retry pending=' + pending.length + ' · ' + errorText(lastWriteError));
    }
    scheduleRetry();
    return false;
  }
  lastWriteError = null;
  return true;
}

function append(input) {
  const text = sanitizeText(input && input.text);
  const name = sanitizeName(input && input.name);
  if (!text || !name || contentFilter.isBlocked(text) || contentFilter.isBlocked(name)) return null;

  syncFromDisk();
  const at = Math.max(Date.now(), Math.floor(Number(input && input.at) || 0));
  const row = {
    seq: nextSeq,
    playerId: typeof (input && input.playerId) === 'string' ? input.playerId.slice(0, 32) : '',
    name,
    color: sanitizeColor(input && input.color),
    text,
    at
  };
  nextSeq += 1;
  messages.push(row);

  try {
    storage.appendJsonl(FILE, row);
    lastWriteAt = row.at;
    lastWriteError = null;
    diskStamp = stampOf();
    return Object.assign(publicRow(row), { persisted: true });
  } catch (err) {
    pending.push(row);
    lastWriteError = err;
    const now = Date.now();
    if (now - lastFailureLogAt >= RETRY_LOG_MS) {
      lastFailureLogAt = now;
      console.error('[chat] history write failed, queued for retry: ' + errorText(err));
    }
    scheduleRetry();
    return Object.assign(publicRow(row), { persisted: false });
  }
}

function parseCursor(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const match = /^(?:c)?(\d+)$/i.exec(raw);
  if (!match) return 0;
  return Math.max(0, Number(match[1]) || 0);
}

function list(options) {
  syncFromDisk();
  const opts = options || {};
  const limit = clamp(Math.floor(Number(opts.limit) || DEFAULT_PAGE), 1, MAX_PAGE);
  const before = parseCursor(opts.before);
  const pendingKeys = new Set(pending.map(rowKey));
  const filtered = before > 0
    ? messages.filter((row) => row.seq < before)
    : messages.slice();
  filtered.sort((a, b) => b.seq - a.seq);
  const page = filtered.slice(0, limit);
  return {
    messages: page.map((row) => Object.assign(publicRow(row), {
      pending: pendingKeys.has(rowKey(row))
    })),
    nextCursor: page.length ? 'c' + page[page.length - 1].seq : null,
    hasMore: filtered.length > page.length,
    total: messages.length,
    pending: pending.length,
    limit
  };
}

function status() {
  syncFromDisk();
  const info = storage.info();
  const persistedCount = Math.max(0, messages.length - pending.length);
  return {
    file: 'data/' + FILE,
    persisted: info.writable && pending.length === 0,
    writable: info.writable,
    dataDir: info.dir,
    dataSource: info.source,
    records: persistedCount,
    pending: pending.length,
    lastWriteAt,
    loadedAt,
    lastError: errorText(lastWriteError || lastReadError) || info.error || null
  };
}

function flush() {
  const saved = retryPending();
  try {
    storage.flushFile(FILE);
    if (saved) lastWriteError = null;
    return saved;
  } catch (err) {
    lastWriteError = err;
    console.error('[chat] history flush failed', err && err.message);
    return false;
  }
}

load();

module.exports = {
  append,
  list,
  load,
  status,
  flush,
  syncFromDisk,
  retryPending,
  FILE
};
