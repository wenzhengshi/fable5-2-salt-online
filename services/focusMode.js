'use strict';

const crypto = require('crypto');
const storage = require('../config/storage');

const FILE = 'focus-records.json';
const DURATION_MS = 30 * 60 * 1000;
const MAX_RECORDS = 1000;
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;

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
  try {
    const rows = storage.readJson(FILE);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('[focus] records read failed', err && err.message);
    return [];
  }
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
  let record = null;
  let reused = false;
  storage.updateJson(FILE, (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    const active = findActiveIn(list, cleanId, cleanFingerprint, now);
    if (active) {
      record = active;
      reused = true;
      return list;
    }
    record = {
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
    return [record, ...list].slice(0, MAX_RECORDS);
  });

  return {
    record,
    created: !reused,
    publicRecord: publicRecord(record, now)
  };
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
  publicRecord
};
