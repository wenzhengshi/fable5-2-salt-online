'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { DATA_DIR } = require('../config/storage');

const username = 'admin';
const defaultPassword = 'abc123456@';
const file = path.join(DATA_DIR, '.admin-credentials.json');
const derive = promisify(scrypt);
const validLength = value => typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value) <= 256;

async function read() {
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const { salt, hash } = JSON.parse(raw);
  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) {
    throw new Error('Invalid administrator credentials file');
  }
  return { salt, hash };
}

async function matches(password, record) {
  if (typeof password !== 'string' || Buffer.byteLength(password) > 256) return false;
  if (!record) {
    const first = Buffer.from(defaultPassword);
    const supplied = Buffer.from(password);
    return supplied.length === first.length && timingSafeEqual(first, supplied);
  }
  const hash = await derive(password, Buffer.from(record.salt, 'hex'), 64);
  return timingSafeEqual(hash, Buffer.from(record.hash, 'hex'));
}

async function save(password) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, 64);
  const temp = file + '.' + randomBytes(8).toString('hex') + '.tmp';
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const handle = await fs.open(temp, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify({ salt: salt.toString('hex'), hash: hash.toString('hex') }));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temp, file);
  } finally {
    await fs.unlink(temp).catch(error => {
      if (error.code !== 'ENOENT') console.error('[admin] credential cleanup:', error.code);
    });
  }
}

module.exports = { username, defaultPassword, validLength, read, matches, save };
