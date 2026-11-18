'use strict';

const { randomUUID } = require('node:crypto');
const storage = require('../config/storage');

const FILE = 'gold-ledger.jsonl';
const LEGACY_FILE = 'gold-pickups.json';
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 30;
const MAPS = new Set(['port', 'qingyun', 'bayhaven', 'dustfall', 'mothlight', 'lunar']);
let cachedRows = null;
let cacheStamp = '';

function cleanText(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function cleanPos(value) {
  if (!value || typeof value !== 'object') return null;
  const x = cleanNumber(value.x);
  const y = cleanNumber(value.y);
  const z = cleanNumber(value.z);
  return x == null || y == null || z == null ? null : { x, y, z };
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || !MAPS.has(raw.map)) return null;
  const kind = raw.kind === 'gift' ? 'gift' : 'pickup';
  const name = cleanText(raw.name, 24);
  const amount = Number(raw.amount);
  const at = Number(raw.at);
  if (!name || !Number.isSafeInteger(amount) || amount <= 0 ||
      !Number.isFinite(at) || at <= 0) return null;
  if (kind === 'gift' && !cleanText(raw.recipientName, 24)) return null;
  return {
    kind,
    id: cleanText(raw.id, 80) || randomUUID(),
    playerId: cleanText(raw.playerId, 40),
    owner: cleanText(raw.owner, 80),
    name,
    recipientId: kind === 'gift' ? cleanText(raw.recipientId, 40) : '',
    recipientOwner: kind === 'gift' ? cleanText(raw.recipientOwner, 80) : '',
    recipientName: kind === 'gift' ? cleanText(raw.recipientName, 24) : '',
    map: raw.map,
    pos: cleanPos(raw.pos),
    amount,
    at
  };
}

function loadRows() {
  const stamp = stampOf();
  if (cachedRows && stamp === cacheStamp) return cachedRows;
  const merged = new Map();
  try {
    const legacy = storage.readJson(LEGACY_FILE);
    if (Array.isArray(legacy)) {
      for (const raw of legacy) {
        const row = normalize(raw);
        if (row) merged.set(row.id, row);
      }
    }
  } catch (err) {
    console.error('[gold-ledger] legacy read failed', err && err.message);
  }
  try {
    const rows = storage.readJsonl(FILE);
    for (const raw of rows) {
      const row = normalize(raw);
      if (row) merged.set(row.id, row);
    }
  } catch (err) {
    console.error('[gold-ledger] ledger read failed', err && err.message);
  }
  cachedRows = Array.from(merged.values()).sort((left, right) =>
    right.at - left.at || String(right.id).localeCompare(String(left.id)));
  cacheStamp = stamp;
  return cachedRows;
}

function stampOf() {
  try {
    const ledger = storage.statFile(FILE);
    const legacy = storage.statFile(LEGACY_FILE);
    const part = (stat) => stat.exists ? stat.size + ':' + stat.mtimeMs : 'missing';
    return part(ledger) + '|' + part(legacy);
  } catch (err) {
    return 'error:' + (err && err.code ? err.code : 'unknown');
  }
}

function append(row) {
  const entry = normalize(row);
  if (!entry) return null;
  storage.appendJsonl(FILE, entry);
  cachedRows = null;
  cacheStamp = '';
  return entry;
}

function recordPickup({ player, map, pos, amount, at } = {}) {
  if (!player || !MAPS.has(map)) return null;
  return append({
    kind: 'pickup',
    id: randomUUID(),
    playerId: player.id,
    owner: player.signOwner,
    name: player.name,
    map,
    pos,
    amount,
    at
  });
}

function recordGift({ sender, recipient, map, pos, amount, at } = {}) {
  if (!sender || !recipient || !MAPS.has(map)) return null;
  return append({
    kind: 'gift',
    id: randomUUID(),
    playerId: sender.id,
    owner: sender.signOwner,
    name: sender.name,
    recipientId: recipient.id,
    recipientOwner: recipient.signOwner,
    recipientName: recipient.name,
    map,
    pos,
    amount,
    at
  });
}

function list({ before, limit = DEFAULT_LIMIT, kind } = {}) {
  const rows = loadRows().filter((row) => !kind || row.kind === kind);
  const requested = Number.parseInt(limit, 10);
  const size = Number.isFinite(requested)
    ? Math.min(MAX_LIMIT, Math.max(1, requested))
    : DEFAULT_LIMIT;
  let start = 0;
  const cursor = String(before || '');
  if (cursor) {
    const index = rows.findIndex((row) => row.id === cursor);
    if (index >= 0) start = index + 1;
  }
  const records = rows.slice(start, start + size);
  const hasMore = start + records.length < rows.length;
  return {
    records,
    pickups: records,
    total: rows.length,
    limit: size,
    nextCursor: hasMore && records.length ? records[records.length - 1].id : null,
    hasMore
  };
}

function status() {
  const info = storage.info();
  return {
    persisted: !!info.writable,
    storage: FILE,
    legacyStorage: LEGACY_FILE,
    retention: 'all',
    dataDir: info.dir,
    dataSource: info.source
  };
}

module.exports = {
  FILE,
  LEGACY_FILE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  recordPickup,
  recordGift,
  list,
  status
};
