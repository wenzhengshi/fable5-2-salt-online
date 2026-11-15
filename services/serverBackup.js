'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { pipeline } = require('node:stream/promises');
const archiver = require('archiver');
const { DATA_DIR } = require('../config/storage');
const { version } = require('../package.json');

async function* dataFiles(dir, relative = '') {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith('.') || /\.(tmp|lock)$/i.test(name) || /[\\:\x00-\x1f]/.test(name)) continue;
    const source = path.join(dir, name);
    const archivePath = relative + name;
    if (entry.isDirectory()) yield* dataFiles(source, archivePath + '/');
    else if (entry.isFile()) yield { source, archivePath };
  }
}

async function createBackup(signal) {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'saltline-backup-'));
  const file = path.join(directory, 'backup.zip');
  const cleanup = () => fsp.rm(directory, { recursive: true, force: true });
  const openedAt = new Date();
  const zip = archiver('zip', { zlib: { level: 1 } });
  zip.on('warning', error => zip.destroy(error));
  const done = pipeline(zip, fs.createWriteStream(file, { flags: 'wx', mode: 0o600 }), { signal });
  // Connect the failure handler immediately, including when a client disconnects mid-read.
  done.catch(() => {});
  const files = [];
  const skipped = [];
  try {
    for await (const entry of dataFiles(DATA_DIR)) {
      signal.throwIfAborted();
      let handle;
      try {
        handle = await fsp.open(entry.source, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        skipped.push(entry.archivePath);
        continue;
      }
      try {
        const stat = await handle.stat();
        if (!stat.isFile()) continue;
        const source = stat.size ? handle.createReadStream({ start: 0, end: stat.size - 1, autoClose: false }) : Buffer.alloc(0);
        const written = once(zip, 'entry', { signal });
        zip.append(source, { name: 'data/' + entry.archivePath, date: stat.mtime, mode: 0o600 });
        try {
          await Promise.race([written, done]);
          signal.throwIfAborted();
        } finally {
          if (!Buffer.isBuffer(source)) source.destroy();
        }
        files.push({ path: entry.archivePath, bytes: stat.size });
      } finally {
        await handle.close();
      }
    }
    const finishedAt = new Date();
    const manifest = { format: 1, gameVersion: version, startedAt: openedAt.toISOString(),
      finishedAt: finishedAt.toISOString(), files, removedDuringBackup: skipped };
    zip.append(JSON.stringify(manifest, null, 2) + '\n', { name: 'manifest.json' });
    await Promise.all([zip.finalize(), done]);
    return { file, cleanup, name: 'saltline-backup-' + openedAt.toISOString().replace(/[:.]/g, '-') + '.zip' };
  } catch (error) {
    zip.destroy();
    await done.catch(() => {});
    await cleanup();
    throw error;
  }
}

module.exports = { createBackup };
