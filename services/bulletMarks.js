'use strict';

const { randomUUID } = require('node:crypto');
const storage = require('../config/storage');
const persistence = require('./persistenceQueue');

const FILE = 'bullet-marks.jsonl';
const MAP_ID = 'port';
const MAX_MARKS = 800;
const MAX_LIMIT = 800;
const COMPACT_AFTER = 1200;
const COORD_LIMIT = 900;
const HEIGHT_LIMIT = 320;
const SKIP_SURFACES = new Set(['player', 'enemy', 'gold', 'water']);
const SURFACES = new Set([
  'concrete', 'metal', 'wood', 'dirt', 'rubber', 'glass',
  'brick', 'asphalt', 'sand', 'stone', 'ice', 'plastic', 'fabric', 'unknown'
]);

let marks = [];
let nextSeq = 1;
let writesSinceCompact = 0;
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
  const seen = new Set();
  const merged = [];
  let maxSeq = 0;
  for (const row of rows) {
    const normalized = normalizeStored(row);
    if (!normalized || seen.has(normalized.id)) continue;
    if (!normalized.seq) normalized.seq = ++maxSeq;
    maxSeq = Math.max(maxSeq, normalized.seq);
    if (!normalized.at) normalized.at = Date.now();
    seen.add(normalized.id);
    merged.push(normalized);
  }
  merged.sort((left, right) => left.seq - right.seq || left.at - right.at);
  marks = merged.slice(-MAX_MARKS);
  nextSeq = Math.max(1, maxSeq + 1);
  loadedAt = Date.now();
}

function load() {
  let rows = [];
  try {
    storage.ensureFile(FILE);
    rows = storage.readJsonl(FILE);
    lastReadError = null;
  } catch (err) {
    lastReadError = err;
    console.error('[bullet-marks] history read failed', err && err.message);
  }
  mergeRows(rows.concat([...pendingRows.values()]));
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
  if (marks.length > MAX_MARKS) marks.shift();
  pendingIds.add(row.id);
  pendingRows.set(row.id, row);
  persistence.append(FILE, [row], [row.id]);
  lastWriteAt = row.at;
  writesSinceCompact += 1;
  if (writesSinceCompact >= COMPACT_AFTER) {
    persistence.compact(FILE, marks.slice());
    writesSinceCompact = 0;
  }
  return publicRow(row);
}

function snapshot(options) {
  const opts = options || {};
  const limit = clamp(Math.floor(Number(opts.limit) || MAX_LIMIT), 1, MAX_LIMIT);
  return {
    map: MAP_ID,
    total: marks.length,
    limit,
    marks: marks.slice(-limit).map(publicRow)
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
    maxMarks: MAX_MARKS,
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
  status,
  load,
  flush,
  FILE,
  MAP_ID,
  MAX_MARKS
};
