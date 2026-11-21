'use strict';

const path = require('node:path');
const { Worker } = require('node:worker_threads');
const storage = require('../config/storage');

let worker = null;
let fallback = false;
let nextRequestId = 1;
let fallbackFlushed = false;
const touchedFiles = new Set();
const appendedListeners = new Map();
const errorListeners = new Set();
const outstanding = new Map();
const IDLE_CLOSE_MS = 1500;
let idleTimer = 0;

function errorText(err) {
  return err ? String(err.message || err) : '';
}

function clearIdle() {
  if (!idleTimer) return;
  clearTimeout(idleTimer);
  idleTimer = 0;
}

function scheduleIdleClose() {
  if (idleTimer || !worker || fallback || outstanding.size) return;
  idleTimer = setTimeout(() => {
    idleTimer = 0;
    if (!worker || fallback || outstanding.size) return;
    const current = worker;
    worker = null;
    try { current.postMessage({ type: 'stop' }); }
    catch (err) { current.terminate().catch(() => {}); }
    current.unref();
  }, IDLE_CLOSE_MS);
  if (idleTimer.unref) idleTimer.unref();
}

function replayOutstanding() {
  for (const [requestId, task] of outstanding) {
    outstanding.delete(requestId);
    if (task.type === 'append') fallbackAppend(task.file, task.rows, task.ids);
    else fallbackCompact(task.file, task.rows);
  }
}

function activateFallback(message) {
  if (fallback) return;
  console.error(message);
  clearIdle();
  worker = null;
  fallback = true;
  fallbackFlushed = false;
  replayOutstanding();
}

function ensureWorker() {
  if (worker || fallback) return;
  let spawned = null;
  try {
    spawned = new Worker(path.join(__dirname, 'persistenceWorker.js'));
    worker = spawned;
    spawned.unref();
    spawned.on('message', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'appended') {
        if (spawned === worker) outstanding.delete(msg.requestId);
        const listeners = appendedListeners.get(msg.file);
        if (!listeners) return;
        for (const listener of listeners) {
          try { listener(msg.ids || []); }
          catch (err) { console.error('[persistence] appended listener failed', err && err.message); }
        }
      } else if (msg.type === 'writeError') {
        for (const listener of errorListeners) {
          try { listener(msg.file, msg.error); }
          catch (err) { console.error('[persistence] error listener failed', err && err.message); }
        }
      } else if (msg.type === 'compacted') {
        if (spawned === worker) outstanding.delete(msg.requestId);
      }
      scheduleIdleClose();
    });
    spawned.on('error', (err) => {
      if (spawned !== worker) return;
      activateFallback('[persistence] worker failed, switching to inline fallback: ' + errorText(err));
    });
    spawned.on('exit', (code) => {
      if (spawned !== worker) return;
      worker = null;
      if (code !== 0 && !fallback) {
        activateFallback('[persistence] worker exited with code ' + code + ', switching to inline fallback');
      }
    });
  } catch (err) {
    activateFallback('[persistence] worker unavailable, switching to inline fallback: ' + errorText(err));
  }
}

function fallbackAppend(file, rows, ids) {
  try {
    storage.appendJsonlBatch(file, rows);
    const listeners = appendedListeners.get(file);
    if (listeners) {
      for (const listener of listeners) {
        try { listener(ids || []); }
        catch (err) { console.error('[persistence] appended listener failed', err && err.message); }
      }
    }
  } catch (err) {
    for (const listener of errorListeners) {
      try { listener(file, errorText(err)); }
      catch (listenerErr) { console.error('[persistence] error listener failed', listenerErr && listenerErr.message); }
    }
  }
  fallbackFlushed = false;
}

function fallbackCompact(file, rows) {
  try {
    storage.writeJsonl(file, Array.isArray(rows) ? rows : []);
  } catch (err) {
    for (const listener of errorListeners) {
      try { listener(file, errorText(err)); }
      catch (listenerErr) { console.error('[persistence] error listener failed', listenerErr && listenerErr.message); }
    }
  }
  fallbackFlushed = false;
}

function append(file, rows, ids) {
  if (!Array.isArray(rows) || !rows.length) return 0;
  touchedFiles.add(file);
  clearIdle();
  if (!worker && !fallback) ensureWorker();
  const requestId = nextRequestId++;
  if (!worker) {
    fallbackAppend(file, rows, ids);
    return requestId;
  }
  outstanding.set(requestId, { type: 'append', file, rows, ids });
  worker.postMessage({ type: 'append', requestId, file, rows, ids });
  return requestId;
}

function compact(file, rows) {
  touchedFiles.add(file);
  clearIdle();
  if (!worker && !fallback) ensureWorker();
  if (!worker) {
    fallbackCompact(file, rows);
    return 0;
  }
  const requestId = nextRequestId++;
  outstanding.set(requestId, { type: 'compact', file, rows: Array.isArray(rows) ? rows : [] });
  worker.postMessage({ type: 'compact', requestId, file, rows: Array.isArray(rows) ? rows : [] });
  return requestId;
}

function flush() {
  if (!worker) {
    if (fallback && !fallbackFlushed) {
      let ok = true;
      for (const file of touchedFiles) {
        try { storage.flushFile(file); }
        catch (err) { ok = false; }
      }
      if (ok) fallbackFlushed = true;
      return ok;
    }
    return true;
  }
  clearIdle();
  const barrier = new Int32Array(new SharedArrayBuffer(8));
  const requestId = nextRequestId++;
  worker.postMessage({ type: 'flush', requestId, barrier });
  Atomics.wait(barrier, 0, 0, 3000);
  const ok = Atomics.load(barrier, 0) === 1 && Atomics.load(barrier, 1) === 1;
  scheduleIdleClose();
  return ok;
}

function shutdown() {
  clearIdle();
  if (!worker) return;
  const current = worker;
  worker = null;
  try { current.postMessage({ type: 'stop' }); }
  catch (err) { /* 退出时无需阻塞 */ }
  current.unref();
}

function onAppended(file, listener) {
  if (typeof listener !== 'function') return;
  if (!appendedListeners.has(file)) appendedListeners.set(file, new Set());
  appendedListeners.get(file).add(listener);
}

function onError(listener) {
  if (typeof listener === 'function') errorListeners.add(listener);
}

module.exports = { append, compact, flush, shutdown, onAppended, onError };
