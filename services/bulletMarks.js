'use strict';

const { randomUUID } = require('node:crypto');
const storage = require('../config/storage');
const persistence = require('./persistenceQueue');

const FILE = 'bullet-marks.jsonl';
const MAP_ID = 'port';
const COORD_LIMIT = 900;
const HEIGHT_LIMIT = 320;
const HISTORY_PAGE_DEFAULT = 120;
const HISTORY_PAGE_MAX = 240;
const SKIP_SURFACES = new Set(['player', 'enemy', 'gold', 'water']);
const SURFACES = new Set([
  'concrete', 'metal', 'wood', 'dirt', 'rubber', 'glass',
  'brick', 'asphalt', 'sand', 'stone', 'ice', 'plastic', 'fabric', 'unknown'
]);

let marks = [];
let nextSeq = 1;
let syncEpoch = randomUUID();
let syncRevision = 0;
let rowRevisions = new WeakMap();
let lastWriteAt = 0;
let loadedAt = 0;
let lastReadError = null;
let lastWriteError = null;
const pendingIds = new Set();
const pendingRows = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function errorText(err) {
  return err ? String(err.message || err) : '';
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function safeId(value) {
  const id = String(value || '');
  return /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : '';
}

function safeCoord(value, limit) {
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? round(number) : null;
}

function safeVec(value) {
  if (!value || typeof value !== 'object') return null;
  const x = safeCoord(value.x, COORD_LIMIT);
  const y = safeCoord(value.y, HEIGHT_LIMIT);
  const z = safeCoord(value.z, COORD_LIMIT);
  return x === null || y === null || z === null ? null : { x, y, z };
}

function safeNormal(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  const length = Math.hypot(x, y, z);
  if (length < 0.5 || length > 1.5) return null;
  return { x: round(x / length), y: round(y / length), z: round(z / length) };
}

function safeSurface(value) {
  const surface = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  if (!surface || SKIP_SURFACES.has(surface)) return '';
  return SURFACES.has(surface) ? surface : 'unknown';
}

function geometryOf(raw) {
  const point = safeVec(raw && raw.point);
  const normal = safeNormal(raw && raw.normal);
  const surface = safeSurface(raw && raw.surface);
  if (!point || !normal || !surface) return null;
  return { point, normal, surface };
}

function normalizeStored(raw) {
  const geometry = geometryOf(raw);
  if (!geometry || !raw || typeof raw.id !== 'string' || !raw.id) return null;
  const seq = Number.isSafeInteger(raw.seq) && raw.seq > 0 ? raw.seq : 0;
  const at = Number.isFinite(Number(raw.at)) ? clamp(Math.floor(Number(raw.at)), 0, Number.MAX_SAFE_INTEGER) : 0;
  return {
    id: raw.id.slice(0, 64),
    seq,
    at,
    map: MAP_ID,
    ...geometry,
    shooterId: typeof raw.shooterId === 'string' ? raw.shooterId.slice(0, 32) : ''
  };
}

function mergeRows(rows) {
  const staged = new Map();
  let maxSeq = 0;
  const byAge = (left, right) => left.seq - right.seq || left.at - right.at;
  for (const row of rows) {
    const normalized = normalizeStored(row);
    if (!normalized || staged.has(normalized.id)) continue;
    if (!normalized.seq) normalized.seq = ++maxSeq;
    maxSeq = Math.max(maxSeq, normalized.seq);
    if (!normalized.at) normalized.at = Date.now();
    staged.set(normalized.id, normalized);
  }
  marks = [...staged.values()].sort(byAge);
  nextSeq = Math.max(1, maxSeq + 1);
  loadedAt = Date.now();
}

function *storedRows() {
  yield *storage.scanJsonl(FILE);
  yield *pendingRows.values();
}

function load() {
  try {
    storage.ensureFile(FILE);
    mergeRows(storedRows());
    syncEpoch = randomUUID();
    syncRevision = 0;
    rowRevisions = new WeakMap();
    lastReadError = null;
  } catch (err) {
    lastReadError = err;
    console.error('[bullet-marks] history read failed', err && err.message);
  }
}

persistence.onAppended(FILE, (ids) => {
  for (const id of ids) {
    pendingIds.delete(id);
    pendingRows.delete(id);
  }
});

persistence.onError((file, error) => {
  if (file === FILE) lastWriteError = error;
});

function publicRow(row) {
  return {
    id: row.id,
    seq: row.seq,
    map: MAP_ID,
    point: row.point,
    normal: row.normal,
    surface: row.surface,
    shooterId: row.shooterId,
    at: row.at,
    persisted: !pendingIds.has(row.id)
  };
}

function add(input) {
  const geometry = geometryOf(input);
  if (!geometry) return null;
  const row = {
    id: safeId(input && input.id) || randomUUID(),
    seq: nextSeq++,
    at: Date.now(),
    map: MAP_ID,
    ...geometry,
    shooterId: typeof input.shooterId === 'string' ? input.shooterId.slice(0, 32) : ''
  };
  marks.push(row);
  rowRevisions.set(row, ++syncRevision);
  pendingIds.add(row.id);
  pendingRows.set(row.id, row);
  persistence.append(FILE, [row], [row.id]);
  lastWriteAt = row.at;
  return publicRow(row);
}

function snapshot(options) {
  const opts = options || {};
  const requested = Math.floor(Number(opts.limit));
  const limit = Number.isSafeInteger(requested) && requested > 0 ? requested : marks.length;
  const start = Math.max(0, marks.length - limit);
  return {
    map: MAP_ID,
    total: marks.length,
    revision: latestSeq(),
    cursor: currentCursor(),
    limit: Math.min(limit, marks.length),
    marks: marks.slice(start).map(publicRow)
  };
}

function size() {
  return marks.length;
}

function slice(offset, count) {
  const start = Math.floor(Number(offset));
  const requested = Math.floor(Number(count));
  if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(requested) || requested < 1) return [];
  return marks.slice(start, start + requested).map(publicRow);
}

function latestSeq() {
  return Math.max(0, nextSeq - 1);
}

function currentCursor() {
  return syncEpoch + ':' + syncRevision;
}

function parseCursor(value) {
  if (typeof value !== 'string') return null;
  const [epoch, version] = value.split(':', 2);
  const revision = Number(version);
  if (epoch !== syncEpoch || !Number.isSafeInteger(revision) || revision < 0 || revision > syncRevision) {
    return null;
  }
  return revision;
}

function historyPage(options) {
  const opts = options || {};
  const requested = Math.floor(Number(opts.limit));
  const limit = clamp(Number.isSafeInteger(requested) && requested > 0 ? requested : HISTORY_PAGE_DEFAULT,
    1, HISTORY_PAGE_MAX);
  const beforeValue = Math.floor(Number(opts.before));
  const before = Number.isSafeInteger(beforeValue) && beforeValue > 0 ? beforeValue : 0;
  let end = marks.length;
  if (before) {
    let low = 0;
    let high = marks.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (marks[middle].seq < before) low = middle + 1;
      else high = middle;
    }
    end = low;
  }
  const start = Math.max(0, end - limit);
  const rows = marks.slice(start, end);
  const complete = start === 0;
  const requestedBase = typeof opts.base === 'string' ? opts.base : '';
  const baseCursor = parseCursor(requestedBase) === null ? currentCursor() : requestedBase;
  return {
    map: MAP_ID,
    total: marks.length,
    revision: latestSeq(),
    cursor: currentCursor(),
    baseCursor,
    limit,
    complete,
    nextBefore: complete || !rows.length ? 0 : rows[0].seq,
    marks: rows.map(publicRow)
  };
}

function sync(since, options) {
  const opts = options || {};
  const cursor = currentCursor();
  if (!since) {
    return { ...snapshot(), cursor, partial: false, reset: false };
  }
  if (since === cursor) return null;
  const previous = parseCursor(since);
  if (previous === null) {
    const base = opts.paged === true
      ? { map: MAP_ID, total: marks.length, revision: latestSeq(), limit: 0, marks: [] }
      : snapshot();
    return { ...base, cursor, partial: false, reset: true };
  }
  const changed = marks.filter(row => (rowRevisions.get(row) || 0) > previous);
  return {
    map: MAP_ID,
    total: marks.length,
    revision: latestSeq(),
    cursor,
    partial: true,
    reset: false,
    marks: changed.map(publicRow)
  };
}

function status() {
  const info = storage.info();
  return {
    file: 'data/' + FILE,
    map: MAP_ID,
    persisted: info.writable && pendingIds.size === 0,
    writable: info.writable,
    dataDir: info.dir,
    dataSource: info.source,
    records: marks.length,
    pending: pendingIds.size,
    lastWriteAt,
    loadedAt,
    retention: 'all',
    lastError: lastWriteError || lastReadError || info.error || null
  };
}

function flush() {
  return persistence.flush();
}

load();

module.exports = {
  add,
  snapshot,
  historyPage,
  sync,
  cursor: currentCursor,
  size,
  slice,
  latestSeq,
  status,
  load,
  flush,
  FILE,
  MAP_ID,
  HISTORY_PAGE_DEFAULT,
  HISTORY_PAGE_MAX
};
