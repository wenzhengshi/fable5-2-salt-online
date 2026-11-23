'use strict';

const { randomUUID } = require('node:crypto');
const storage = require('../config/storage');
const persistence = require('./persistenceQueue');
const { landingSurface } = require('./portalBosses');

const FILE = 'corpse-field.jsonl';
const MAP_ID = 'port';
const KINDS = new Set(['hound', 'drone', 'player']);
const SOLDIERS = new Set(['male', 'female', 'hound', 'drone', 'classic']);
const POSE_BONES = new Set([
  'root', 'body', 'neck', 'head', 'turret', 'gun', 'antenna', 'beacon',
  'abdFL', 'thighFL', 'shinFL', 'abdFR', 'thighFR', 'shinFR',
  'abdRL', 'thighRL', 'shinRL', 'abdRR', 'thighRR', 'shinRR',
  'rotor0', 'rotor1', 'rotor2', 'rotor3', 'gimbalYaw', 'ball', 'lamp',
  'strobeG', 'strobeR', 'strobeW'
]);
const POSE_BONE_LIMIT = 32;
const POSE_AT_WINDOW = 120000;
const POSE_REPORT_RADIUS = 140;
const HISTORY_PAGE_DEFAULT = 40;
const HISTORY_PAGE_MAX = 120;
const DEDUPE_MS = 3000;
const DEDUPE_RADIUS = 4;
const LANDING_DRIFT = 80;
const LANDING_HEIGHT = 48;

let corpses = [];
let nextSeq = 1;
let syncEpoch = randomUUID();
let syncRevision = 0;
let rowRevisions = new WeakMap();
let lastWriteAt = 0;
let loadedAt = 0;
let lastReadError = null;
let lastWriteError = null;
let publisher = null;
const pendingIds = new Set();
const pendingRows = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function groundedPosition(pos) {
  const landing = landingSurface(MAP_ID, pos.x, pos.z, pos.y + 2, pos.y);
  return { x: pos.x, y: round(landing.y), z: pos.z };
}

function errorText(err) {
  return err ? String(err.message || err) : '';
}

function cleanId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function cleanText(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32);
}

function normalizeSoldier(value) {
  const soldier = cleanText(value).toLowerCase();
  return SOLDIERS.has(soldier) ? soldier : 'classic';
}

function normalizePosition(raw) {
  if (!raw || ![raw.x, raw.y, raw.z].every((value) => Number.isFinite(Number(value)))) return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const z = Number(raw.z);
  if (Math.abs(x) > 900 || Math.abs(z) > 900 || y < -80 || y > 240) return null;
  return { x: round(x), y: round(y), z: round(z) };
}

function normalizePose(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw.bones && typeof raw.bones === 'object' ? raw.bones : null;
  if (!source || Array.isArray(source)) return null;
  const bones = {};
  let count = 0;
  for (const name of POSE_BONES) {
    if (count >= POSE_BONE_LIMIT) break;
    const values = source[name];
    if (!Array.isArray(values) || values.length !== 4) continue;
    const quaternion = values.map(Number);
    if (!quaternion.every(Number.isFinite)) continue;
    const length = Math.hypot(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    if (!Number.isFinite(length) || length < 1e-6) continue;
    bones[name] = quaternion.map((value) => round(clamp(value / length, -1, 1)));
    count += 1;
  }
  if (!count) return null;
  const rawYaw = Number(raw.yaw);
  const bodyPos = Array.isArray(raw.bodyPos) && raw.bodyPos.length === 3 &&
    raw.bodyPos.every((value) => Number.isFinite(Number(value)))
    ? raw.bodyPos.map((value) => round(clamp(Number(value), -5, 5)))
    : null;
  return {
    yaw: Number.isFinite(rawYaw) ? round(Math.atan2(Math.sin(rawYaw), Math.cos(rawYaw))) : 0,
    bodyPos,
    bones
  };
}

function normalize(raw) {
  if (!raw || raw.map !== MAP_ID || !KINDS.has(raw.kind)) return null;
  const pos = normalizePosition(raw.pos);
  if (!pos) return null;
  const grounded = groundedPosition(pos);
  const id = cleanId(raw.id);
  if (!id) return null;
  const at = Number(raw.at);
  const settledAt = Number(raw.settledAt);
  const yaw = Number(raw.yaw);
  const seq = Number(raw.seq);
  return {
    id,
    seq: Number.isSafeInteger(seq) && seq > 0 ? seq : 0,
    at: Number.isFinite(at) ? clamp(Math.floor(at), 0, Number.MAX_SAFE_INTEGER) : Date.now(),
    settled: raw.settled === true,
    settledAt: Number.isFinite(settledAt) ? clamp(Math.floor(settledAt), 0, Number.MAX_SAFE_INTEGER) : 0,
    surface: raw.surface === 'object' ? 'object' : 'ground',
    map: MAP_ID,
    kind: raw.kind,
    pos: grounded,
    yaw: Number.isFinite(yaw) ? round(Math.atan2(Math.sin(yaw), Math.cos(yaw))) : 0,
    playerId: cleanId(raw.playerId),
    name: cleanText(raw.name),
    soldier: normalizeSoldier(raw.soldier),
    outfit: cleanText(raw.outfit).toLowerCase(),
    victimId: cleanId(raw.victimId),
    shooterId: cleanId(raw.shooterId),
    shooterName: cleanText(raw.shooterName),
    pose: normalizePose(raw.pose)
  };
}

function load() {
  const byId = new Map();
  let maxSeq = 0;
  const newestFirst = (left, right) => right.seq - left.seq || right.at - left.at;
  function ingest(raw) {
    const id = cleanId(raw?.id);
    if (!id || raw.map !== MAP_ID || !KINDS.has(raw.kind) || !normalizePosition(raw.pos)) return;
    const previous = byId.get(id);
    const seq = Number.isSafeInteger(raw.seq) && raw.seq > 0 ? raw.seq : previous?.seq || maxSeq + 1;
    maxSeq = Math.max(maxSeq, seq);
    byId.set(id, { ...raw, id, seq });
  }
  try {
    storage.ensureFile(FILE);
    for (const row of storage.scanJsonl(FILE)) ingest(row);
    for (const row of pendingRows.values()) ingest(row);
    lastReadError = null;
  } catch (err) {
    lastReadError = err;
    console.error('[corpse-field] history read failed', err && err.message);
    return;
  }
  const sorted = [...byId.values()].sort(newestFirst);
  corpses = [];
  for (const raw of sorted) {
    const row = normalize(raw);
    if (!row) continue;
    if (Math.abs(Number(raw.pos.y) - row.pos.y) > 0.001) queuePersist(row);
    corpses.push(row);
  }
  nextSeq = Math.max(1, maxSeq + 1);
  loadedAt = Date.now();
  syncEpoch = randomUUID();
  syncRevision = 0;
  rowRevisions = new WeakMap();
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
    at: row.at,
    settled: row.settled,
    settledAt: row.settledAt,
    surface: row.surface,
    map: row.map,
    kind: row.kind,
    pos: row.pos,
    yaw: row.yaw,
    playerId: row.playerId,
    name: row.name,
    soldier: row.soldier,
    outfit: row.outfit,
    victimId: row.victimId,
    shooterId: row.shooterId,
    shooterName: row.shooterName,
    pose: row.pose,
    persisted: !pendingIds.has(row.id)
  };
}

function duplicateOf(row) {
  for (const existing of corpses) {
    if (existing.kind !== row.kind || Math.abs(existing.at - row.at) > DEDUPE_MS) continue;
    if (row.victimId && row.victimId === existing.victimId) return existing;
    if (row.kind === 'player' && row.playerId && row.playerId === existing.playerId) return existing;
    const distance = Math.hypot(
      existing.pos.x - row.pos.x,
      existing.pos.y - row.pos.y,
      existing.pos.z - row.pos.z
    );
    if (distance <= DEDUPE_RADIUS) return existing;
  }
  return null;
}

function publish(row, action = 'created') {
  rowRevisions.set(row, ++syncRevision);
  if (typeof publisher !== 'function') return;
  try {
    publisher(publicRow(row), action);
  } catch (err) {
    console.error('[corpse-field] publish failed', err && err.message);
  }
}

function queuePersist(row) {
  pendingIds.add(row.id);
  pendingRows.set(row.id, row);
  persistence.append(FILE, [row], [row.id]);
  lastWriteAt = row.at;

}

function settle(input) {
  const data = input || {};
  const pos = normalizePosition(data.pos);
  if (!pos) return null;
  const id = cleanId(data.id);
  const victimId = cleanId(data.victimId);
  const playerId = cleanId(data.playerId);
  const reporter = data.reporter && typeof data.reporter === 'object' ? data.reporter : null;
  const reporterId = cleanId(reporter && reporter.id);
  const reporterPos = normalizePosition(reporter && reporter.pos);
  const now = Date.now();
  const reportedAt = Number(data.at);
  const targetAt = Number.isFinite(reportedAt)
    ? clamp(Math.floor(reportedAt), 0, now + 1000)
    : now;

  let target = id ? corpses.find((row) => row.id === id) : null;
  if (!target && victimId) target = corpses.find((row) => row.victimId === victimId);
  if (!target && playerId) {
    target = corpses
      .filter((row) => row.kind === 'player' && row.playerId === playerId && Math.abs(row.at - targetAt) <= 60000)
      .sort((left, right) => Math.abs(left.at - targetAt) - Math.abs(right.at - targetAt))[0];
  }
  if (!target || target.settled || Math.abs(target.at - targetAt) > 60000) return null;

  const drift = Math.hypot(pos.x - target.pos.x, pos.z - target.pos.z);
  if (drift > LANDING_DRIFT || Math.abs(pos.y - target.pos.y) > LANDING_HEIGHT) return null;
  const distanceToReporter = reporterPos
    ? Math.hypot(reporterPos.x - pos.x, reporterPos.z - pos.z)
    : Infinity;
  const owner = target.playerId || target.shooterId || target.victimId;
  if (distanceToReporter > 120 && (!reporterId || !owner || reporterId !== owner)) return null;

  const updated = {
    ...target,
    pos: groundedPosition(pos),
    yaw: Number.isFinite(Number(data.yaw))
      ? round(Math.atan2(Math.sin(Number(data.yaw)), Math.cos(Number(data.yaw))))
      : target.yaw,
    settled: true,
    settledAt: now,
    surface: data.surface === 'object' ? 'object' : 'ground',
    pose: normalizePose(data.pose) || target.pose
  };
  const index = corpses.findIndex((row) => row.id === target.id);
  if (index < 0) return null;
  corpses[index] = updated;

  queuePersist(updated);
  const result = publicRow(updated);
  publish(updated, 'updated');
  return result;
}

function setPose(input) {
  const data = input || {};
  const id = cleanId(data.id);
  const victimId = cleanId(data.victimId);
  if (!id && !victimId) return null;
  const pose = normalizePose(data.pose);
  if (!pose) return null;
  const now = Date.now();
  const reporter = data.reporter && typeof data.reporter === 'object' ? data.reporter : null;
  const reporterId = cleanId(reporter && reporter.id);
  const reporterPos = normalizePosition(reporter && reporter.pos);
  let target = id ? corpses.find((row) => row.id === id) : null;
  if (!target && victimId) target = corpses.find((row) => row.victimId === victimId);
  if (!target && id) {
    target = corpses.find((row) => row.victimId === id || row.victimId === 'machine-' + id ||
      row.victimId === 'patrol-' + id || row.victimId === 'gold-' + id);
  }
  if (!target || target.kind === 'player') return null;
  if (reporterId && target.shooterId && target.shooterId !== reporterId) {
    const alternate = corpses.find((row) => row.kind !== 'player' && row.shooterId === reporterId &&
      (row.id === id || row.victimId === victimId || row.victimId === id ||
        row.victimId === 'machine-' + id || row.victimId === 'patrol-' + id || row.victimId === 'gold-' + id));
    if (alternate) target = alternate;
  }
  if (target.at > now + 1000 || now - target.at > POSE_AT_WINDOW) return null;

  const distanceToReporter = reporterPos
    ? Math.hypot(reporterPos.x - target.pos.x, reporterPos.z - target.pos.z)
    : Infinity;
  const owner = target.shooterId || target.victimId;
  if (distanceToReporter > POSE_REPORT_RADIUS && (!reporterId || !owner || reporterId !== owner)) return null;

  const updated = { ...target, pose, yaw: pose.yaw };
  const pos = normalizePosition(data.pos);
  if (pos) {
    const drift = Math.hypot(pos.x - target.pos.x, pos.z - target.pos.z);
    if (drift <= LANDING_DRIFT && Math.abs(pos.y - target.pos.y) <= LANDING_HEIGHT) {
      const landing = landingSurface(MAP_ID, pos.x, pos.z, pos.y + 2, pos.y);
      updated.pos = { x: pos.x, y: round(landing.y), z: pos.z };
      updated.surface = landing.surface;
    }
  }
  const index = corpses.findIndex((row) => row.id === target.id);
  if (index < 0) return null;
  corpses[index] = updated;
  queuePersist(updated);
  const result = publicRow(updated);
  publish(updated, 'updated');
  return result;
}

function add(input) {
  const row = normalize({
    ...input,
    map: MAP_ID,
    id: cleanId(input && input.id) || randomUUID(),
    at: Number(input && input.at) || Date.now()
  });
  if (!row) return null;
  const duplicate = duplicateOf(row);
  if (duplicate) return publicRow(duplicate);
  row.seq = nextSeq++;
  corpses.unshift(row);

  queuePersist(row);
  const result = publicRow(row);
  publish(row, 'created');
  return result;
}

function addMachine(input) {
  const data = input || {};
  const kind = data.kind === 'gull' || data.kind === 'drone' ? 'drone' : data.kind === 'hound' ? 'hound' : '';
  if (!kind) return null;
  return add({
    id: data.id || randomUUID(),
    at: data.at,
    kind,
    pos: data.pos,
    yaw: data.yaw,
    surface: data.surface,
    victimId: data.victimId,
    shooterId: data.shooterId,
    shooterName: data.shooterName,
    pose: data.pose
  });
}

function addPlayer(input) {
  const data = input || {};
  if (!data.playerId) return null;
  return add({
    id: data.id || randomUUID(),
    at: data.at,
    kind: 'player',
    pos: data.pos,
    yaw: data.yaw,
    surface: data.surface,
    playerId: data.playerId,
    name: data.name,
    soldier: data.soldier,
    outfit: data.outfit,
    shooterId: data.shooterId || data.killerId,
    shooterName: data.shooterName || data.killerName
  });
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

function latestSeq() {
  return Math.max(0, nextSeq - 1);
}

function indexBefore(seq) {
  let low = 0;
  let high = corpses.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (corpses[middle].seq < seq) high = middle;
    else low = middle + 1;
  }
  return low;
}

function snapshot(options) {
  const opts = options || {};
  const requested = Math.floor(Number(opts.limit));
  const limit = Number.isSafeInteger(requested) && requested > 0 ? requested : corpses.length;
  const rows = corpses.slice(0, limit);
  return {
    map: MAP_ID,
    total: corpses.length,
    revision: Math.max(0, nextSeq - 1),
    cursor: currentCursor(),
    limit: rows.length,
    corpses: rows.map(publicRow)
  };
}

function historyPage(options) {
  const opts = options || {};
  const requested = Math.floor(Number(opts.limit));
  const limit = clamp(Number.isSafeInteger(requested) && requested > 0 ? requested : HISTORY_PAGE_DEFAULT,
    1, HISTORY_PAGE_MAX);
  const beforeValue = Math.floor(Number(opts.before));
  const before = Number.isSafeInteger(beforeValue) && beforeValue > 0 ? beforeValue : 0;
  const start = before ? indexBefore(before) : 0;
  const rows = corpses.slice(start, start + limit);
  const complete = start + rows.length >= corpses.length;
  const requestedBase = typeof opts.base === 'string' ? opts.base : '';
  const baseCursor = parseCursor(requestedBase) === null ? currentCursor() : requestedBase;
  return {
    map: MAP_ID,
    total: corpses.length,
    revision: Math.max(0, nextSeq - 1),
    cursor: currentCursor(),
    baseCursor,
    limit,
    complete,
    nextBefore: complete ? 0 : rows[rows.length - 1].seq,
    corpses: rows.map(publicRow)
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
      ? { map: MAP_ID, total: corpses.length, revision: Math.max(0, nextSeq - 1), limit: 0, corpses: [] }
      : snapshot();
    return { ...base, cursor, partial: false, reset: true };
  }
  const changed = corpses.filter(row => (rowRevisions.get(row) || 0) > previous);
  return {
    map: MAP_ID,
    total: corpses.length,
    revision: Math.max(0, nextSeq - 1),
    cursor,
    partial: true,
    reset: false,
    corpses: changed.map(publicRow)
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
    records: corpses.length,
    pending: pendingIds.size,
    lastWriteAt,
    loadedAt,
    retention: 'all',
    lastError: lastWriteError || errorText(lastReadError) || info.error || null
  };
}

function flush() {
  return persistence.flush();
}

load();

module.exports = {
  add,
  addMachine,
  addPlayer,
  settle,
  setPose,
  snapshot,
  historyPage,
  sync,
  cursor: currentCursor,
  size() { return corpses.length; },
  latestSeq,
  status,
  load,
  flush,
  setPublisher(fn) { publisher = typeof fn === 'function' ? fn : null; },
  FILE,
  MAP_ID,
  HISTORY_PAGE_DEFAULT,
  HISTORY_PAGE_MAX
};
