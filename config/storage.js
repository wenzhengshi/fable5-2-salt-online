'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const ENV_DATA_KEYS = ['JICREATE_DATA_DIR', 'DATA_DIR'];
const LOCK_RETRY_MS = 8;
const LOCK_TIMEOUT_MS = 2500;
const LOCK_STALE_MS = 15000;
const PROBE_TTL_MS = 2000;
const lockSleep = new Int32Array(new SharedArrayBuffer(4));
let tempCounter = 0;
let lastProbeAt = 0;
let lastProbeError = null;
let writable = false;

function envDataDir() {
  for (const key of ENV_DATA_KEYS) {
    const value = String(process.env[key] || '').trim();
    if (value) return { dir: path.resolve(value), source: key };
  }
  return null;
}

const selected = envDataDir();
const DATA_DIR = selected ? selected.dir : PROJECT_DATA_DIR;
const DATA_SOURCE = selected ? selected.source : 'project';

function errorText(err) {
  if (!err) return 'unknown storage error';
  return String(err.message || err);
}

function ensureDir(dir) {
  const target = dir || DATA_DIR;
  try {
    const stat = fs.statSync(target);
    if (!stat.isDirectory()) {
      const err = new Error('storage path is not a directory: ' + target);
      err.code = 'ENOTDIR';
      throw err;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    fs.mkdirSync(target, { recursive: true, mode: 0o2775 });
  }
  return target;
}

function sleepSync(ms) {
  Atomics.wait(lockSleep, 0, 0, ms);
}

function fsyncDir(dir) {
  let fd;
  try {
    fd = fs.openSync(dir || DATA_DIR, 'r');
    fs.fsyncSync(fd);
  } catch (err) {
    // 某些文件系统不支持目录 fsync，文件本身已经完成落盘。
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (err) { /* ignore */ }
    }
  }
}

function probeWritable(force) {
  const now = Date.now();
  if (!force && now - lastProbeAt < PROBE_TTL_MS) return writable;
  lastProbeAt = now;
  let probe = '';
  try {
    ensureDir(DATA_DIR);
    probe = path.join(DATA_DIR, '.write-probe-' + process.pid + '-' + (++tempCounter));
    const fd = fs.openSync(probe, 'wx', 0o660);
    try {
      fs.writeSync(fd, 'ok');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.unlinkSync(probe);
    writable = true;
    lastProbeError = null;
  } catch (err) {
    writable = false;
    lastProbeError = err;
    if (probe) {
      try { fs.unlinkSync(probe); } catch (unlinkErr) { /* ignore */ }
    }
  }
  return writable;
}

function acquireFileLock(full) {
  const lock = full + '.lock';
  const startedAt = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lock, 'wx', 0o660);
      try {
        fs.writeSync(fd, String(process.pid));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      return () => {
        try { fs.unlinkSync(lock); } catch (err) { /* ignore */ }
      };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      let stale = false;
      try {
        stale = Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS;
      } catch (statErr) {
        if (statErr.code === 'ENOENT') continue;
        throw statErr;
      }
      if (stale) {
        try { fs.unlinkSync(lock); } catch (unlinkErr) { /* ignore */ }
        continue;
      }
      if (Date.now() - startedAt > LOCK_TIMEOUT_MS) {
        throw new Error('storage lock timeout: ' + path.basename(lock));
      }
      sleepSync(LOCK_RETRY_MS);
    }
  }
}

function writeAll(fd, buffer) {
  let offset = 0;
  while (offset < buffer.length) {
    offset += fs.writeSync(fd, buffer, offset, buffer.length - offset);
  }
}

function openAppendFile(full) {
  try {
    return fs.openSync(full, 'a', 0o660);
  } catch (err) {
    if (err.code !== 'EACCES' && err.code !== 'EPERM') throw err;
    if (!probeWritable(true)) throw err;
    // 版本升级后文件可能仍属于旧运行用户；只要目录可写就安全换一个新文件并保留旧内容。
    let previous = null;
    try { previous = fs.readFileSync(full); } catch (readErr) { /* ignore */ }
    const backup = full + '.previous-' + Date.now();
    fs.renameSync(full, backup);
    const fd = fs.openSync(full, 'a', 0o660);
    try {
      if (previous && previous.length) writeAll(fd, previous);
    } catch (writeErr) {
      try { fs.closeSync(fd); } catch (closeErr) { /* ignore */ }
      throw writeErr;
    }
    return fd;
  }
}

function ensureFile(file) {
  ensureDir(DATA_DIR);
  const full = path.join(DATA_DIR, file);
  if (fs.existsSync(full)) return full;
  const fd = fs.openSync(full, 'a', 0o660);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fsyncDir(DATA_DIR);
  return full;
}

function readJson(file) {
  ensureDir(DATA_DIR);
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) return [];
  const raw = fs.readFileSync(full, 'utf8');
  if (!raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    const backup = full + '.corrupt-' + Date.now();
    fs.copyFileSync(full, backup);
    return [];
  }
}

function writeJson(file, data) {
  ensureDir(DATA_DIR);
  const full = path.join(DATA_DIR, file);
  const tmp = full + '.' + process.pid + '.' + Date.now() + '.' + (++tempCounter) + '.tmp';
  let fd;
  try {
    fd = fs.openSync(tmp, 'wx', 0o660);
    writeAll(fd, Buffer.from(JSON.stringify(data, null, 2), 'utf8'));
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(tmp, full);
    fsyncDir(DATA_DIR);
  } catch (err) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (closeErr) { /* ignore */ }
    }
    try { fs.unlinkSync(tmp); } catch (unlinkErr) { /* ignore */ }
    throw err;
  }
}

function updateJson(file, updater) {
  ensureDir(DATA_DIR);
  const full = path.join(DATA_DIR, file);
  const release = acquireFileLock(full);
  try {
    const data = readJson(file);
    const next = typeof updater === 'function' ? updater(data) : updater;
    writeJson(file, next);
    return next;
  } finally {
    release();
  }
}

function appendJsonl(file, record) {
  ensureDir(DATA_DIR);
  const full = path.join(DATA_DIR, file);
  const buffer = Buffer.from(JSON.stringify(record) + '\n', 'utf8');
  const release = acquireFileLock(full);
  try {
    let needsSeparator = false;
    let created = false;
    try {
      const stat = fs.statSync(full);
      if (stat.size > 0) {
        const readFd = fs.openSync(full, 'r');
        try {
          const last = Buffer.alloc(1);
          fs.readSync(readFd, last, 0, 1, stat.size - 1);
          needsSeparator = last[0] !== 0x0a;
        } finally {
          fs.closeSync(readFd);
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT') created = true;
      else if (err.code !== 'EACCES' && err.code !== 'EPERM') throw err;
    }
    const fd = openAppendFile(full);
    try {
      if (needsSeparator) fs.writeSync(fd, '\n');
      writeAll(fd, buffer);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    if (created) fsyncDir(DATA_DIR);
    writable = true;
    lastProbeError = null;
  } finally {
    release();
  }
}

function readJsonl(file) {
  ensureDir(DATA_DIR);
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) return [];
  const raw = fs.readFileSync(full, 'utf8');
  if (!raw.trim()) return [];
  const rows = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed);
      if (row && typeof row === 'object') rows.push(row);
    } catch (err) {
      // 单行损坏不应影响其余历史记录，跳过该行继续读取。
    }
  }
  return rows;
}

function statFile(file) {
  const full = path.join(DATA_DIR, file);
  try {
    const stat = fs.statSync(full);
    return {
      exists: true,
      path: full,
      size: stat.size,
      mtimeMs: stat.mtimeMs
    };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return { exists: false, path: full, size: 0, mtimeMs: 0 };
  }
}

function flushFile(file) {
  ensureDir(DATA_DIR);
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) return false;
  const fd = fs.openSync(full, 'r');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return true;
}

function info() {
  return {
    dir: DATA_DIR,
    source: DATA_SOURCE,
    writable: probeWritable(),
    error: lastProbeError ? errorText(lastProbeError) : null
  };
}

probeWritable(true);
if (!writable) {
  console.error('[storage] data directory unavailable: ' + DATA_DIR +
    ' (' + DATA_SOURCE + '): ' + errorText(lastProbeError));
}

module.exports = {
  readJson,
  writeJson,
  updateJson,
  appendJsonl,
  readJsonl,
  ensureFile,
  statFile,
  flushFile,
  probeWritable,
  info,
  DATA_DIR,
  DATA_SOURCE
};
