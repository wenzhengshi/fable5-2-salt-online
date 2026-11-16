'use strict';

// 玩家群聊二维码：上传的图片以 base64 存入 data/ 的 JSON 文件，
// 由 config/storage.js 负责原子写入和并发加锁；未上传时使用内置 SVG。
const { randomUUID } = require('node:crypto');
const storage = require('../config/storage');

const META_FILE = 'group-qr.json';
const DEFAULT_IMAGE = '/img/saltline-wechat-group.svg';
const DEFAULT_FILE_NAME = 'saltline-wechat-group.svg';
const IMAGE_API = '/api/community/qr/image';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const FORMATS = [
  { ext: 'png', mime: 'image/png', match: b => b.length > 8 && b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' },
  { ext: 'jpg', mime: 'image/jpeg', match: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif', mime: 'image/gif', match: b => b.length > 6 && b.slice(0, 4).toString('ascii') === 'GIF8' && (b[4] === 0x37 || b[4] === 0x39) },
  { ext: 'webp', mime: 'image/webp', match: b => b.length > 12 && b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' }
];

function error(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function readRecord() {
  const value = storage.readJson(META_FILE);
  return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
}

function detect(buffer) {
  return FORMATS.find(format => format.match(buffer)) || null;
}

function safeName(name, ext) {
  const base = String(name || '').split(/[\\/]/).pop().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 80);
  return base && base.includes('.') ? base : 'group-qr.' + ext;
}

function info() {
  const record = readRecord();
  const custom = typeof record.data === 'string' && record.data.length > 0;
  return {
    custom,
    url: custom ? IMAGE_API + '?v=' + encodeURIComponent(String(record.version || '')) : DEFAULT_IMAGE,
    api: IMAGE_API,
    defaultUrl: DEFAULT_IMAGE,
    version: custom ? String(record.version || '') : 'default',
    fileName: custom ? String(record.fileName || 'group-qr') : DEFAULT_FILE_NAME,
    mimeType: custom ? String(record.mimeType || 'image/png') : 'image/svg+xml',
    bytes: custom ? Number(record.bytes) || 0 : 0,
    updatedAt: custom ? String(record.updatedAt || '') : ''
  };
}

function image() {
  const record = readRecord();
  if (typeof record.data !== 'string' || !record.data) return null;
  let buffer;
  try {
    buffer = Buffer.from(record.data, 'base64');
  } catch (err) {
    return null;
  }
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;
  return {
    buffer,
    mimeType: String(record.mimeType || 'image/png'),
    version: String(record.version || ''),
    fileName: String(record.fileName || 'group-qr')
  };
}

function save(input) {
  const buffer = input && Buffer.isBuffer(input.buffer) ? input.buffer : Buffer.alloc(0);
  if (!buffer.length) throw error('EMPTY');
  if (buffer.length > MAX_IMAGE_BYTES) throw error('SIZE');
  const format = detect(buffer);
  if (!format) throw error('TYPE');
  const record = {
    version: Date.now().toString(36) + '-' + randomUUID().slice(0, 8),
    data: buffer.toString('base64'),
    mimeType: format.mime,
    ext: format.ext,
    bytes: buffer.length,
    fileName: safeName(input && input.originalName, format.ext),
    updatedAt: new Date().toISOString()
  };
  storage.updateJson(META_FILE, () => record);
  return info();
}

function reset() {
  storage.updateJson(META_FILE, () => ({}));
  return info();
}

function flush() {
  return storage.flushFile(META_FILE);
}

module.exports = {
  DEFAULT_IMAGE,
  DEFAULT_FILE_NAME,
  IMAGE_API,
  MAX_IMAGE_BYTES,
  info,
  image,
  save,
  reset,
  flush
};
