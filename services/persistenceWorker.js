'use strict';

const { parentPort } = require('node:worker_threads');
const storage = require('../config/storage');

const RETRY_MS = 4000;
const COMPACT_THRESHOLDS = {
  'bullet-marks.jsonl': 1200,
  'corpse-field.jsonl': 1200
};

const files = new Map();

function errorText(err) {
  return err ? String(err.message || err) : '';
}

function stateFor(file) {
  let state = files.get(file);
  if (!state) {
    state = { queue: [], compactRows: null, writes: 0, retryTimer: 0, draining: false, lastError: '' };
    files.set(file, state);
  }
  return state;
}

function reportError(file, state, err) {
  const text = errorText(err);
  if (!text || text === state.lastError) return;
  state.lastError = text;
  parentPort.postMessage({ type: 'writeError', file, error: text });
}

function clearError(state) {
  state.lastError = '';
}

function clearRetry(state) {
  if (!state.retryTimer) return;
  clearTimeout(state.retryTimer);
  state.retryTimer = 0;
}

function scheduleRetry(file, state) {
  if (state.retryTimer) return;
  state.retryTimer = setTimeout(() => {
    state.retryTimer = 0;
    drain(file, false);
  }, RETRY_MS);
  if (state.retryTimer.unref) state.retryTimer.unref();
}

function drain(file, force) {
  const state = stateFor(file);
  if (state.draining) return state.queue.length === 0;
  state.draining = true;
  let ok = true;
  try {
    while (state.queue.length) {
      const batch = state.queue[0];
      try {
        storage.appendJsonlBatch(file, batch.rows);
        state.queue.shift();
        state.writes += batch.rows.length;
        clearError(state);
        if (batch.requestId) {
          parentPort.postMessage({
            type: 'appended',
            requestId: batch.requestId,
            file,
            ids: batch.ids || []
          });
        }
      } catch (err) {
        ok = false;
        reportError(file, state, err);
        break;
      }
    }

    if (ok && state.compactRows) {
      const threshold = COMPACT_THRESHOLDS[file] || 1200;
      if (force || state.writes >= threshold) {
        try {
          storage.writeJsonl(file, state.compactRows);
          state.compactRows = null;
          state.writes = 0;
          clearError(state);
        } catch (err) {
          ok = false;
          reportError(file, state, err);
        }
      }
    }
  } finally {
    state.draining = false;
  }

  if (ok && !state.queue.length) clearRetry(state);
  else scheduleRetry(file, state);
  return ok && state.queue.length === 0;
}

function flushAll() {
  let ok = true;
  for (const file of files.keys()) {
    if (!drain(file, true)) ok = false;
    try {
      storage.flushFile(file);
    } catch (err) {
      ok = false;
      reportError(file, stateFor(file), err);
    }
  }
  return ok;
}

parentPort.on('message', (msg) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'append') {
    if (!Array.isArray(msg.rows) || !msg.rows.length) return;
    const state = stateFor(msg.file);
    state.queue.push({ rows: msg.rows, ids: msg.ids, requestId: msg.requestId });
    drain(msg.file, false);
    return;
  }
  if (msg.type === 'compact') {
    const state = stateFor(msg.file);
    state.compactRows = Array.isArray(msg.rows) ? msg.rows : [];
    const ok = drain(msg.file, false);
    parentPort.postMessage({ type: 'compacted', requestId: msg.requestId, ok });
    return;
  }
  if (msg.type === 'flush') {
    const ok = flushAll();
    const barrier = msg.barrier;
    if (barrier && typeof barrier[0] === 'number') {
      Atomics.store(barrier, 1, ok ? 1 : 0);
      Atomics.store(barrier, 0, 1);
      Atomics.notify(barrier, 0);
    }
    parentPort.postMessage({ type: 'flushResult', requestId: msg.requestId, ok });
    return;
  }
  if (msg.type === 'stop') {
    flushAll();
    for (const state of files.values()) clearRetry(state);
    parentPort.close();
  }
});

parentPort.postMessage({ type: 'ready' });
