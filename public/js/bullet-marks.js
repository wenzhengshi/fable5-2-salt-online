(() => {
  'use strict';

  if (window.__SALT_BULLET_MARKS_LOADED__) return;
  window.__SALT_BULLET_MARKS_LOADED__ = true;

  const MAP_ID = 'port';
  const INITIAL_RENDER_CAPACITY = 512;
  const BUILD_BUDGET = 8;
  const LOCAL_CONFIRM_MS = 5000;
  const HISTORY_PAGE_SIZE = 120;
  const HISTORY_PAGE_GAP_MS = 120;
  const SYNC_INTERVAL_MS = 2000;
  const SYNC_RETRY_MS = 5000;
  const SYNC_TIMEOUT_MS = 8000;
  const VISIBLE_STATES = new Set(['playing', 'paused', 'dead']);
  const SKIP_SURFACES = new Set(['player', 'enemy', 'gold', 'water']);
  const entries = new Map();
  const buildQueue = [];
  const localMarks = new Map();
  const historyIds = new Set();
  const historyTracked = new Set();
  let renderFx = null;
  let batch = null;
  let batchCapacity = 0;
  const freeSlots = [];
  let nextSlot = 0;
  let historyId = 0;
  let historyPageId = 0;
  let historyBaseCursor = '';
  let historyNextBefore = 0;
  let historyComplete = false;
  let syncCursor = '';
  let syncRequest = null;
  let nextSyncAt = 0;
  let game = null;

  function round(value) {
    return Math.round(value * 1000) / 1000;
  }

  function hashId(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function localId() {
    const crypto = window.crypto;
    if (crypto && typeof crypto.randomUUID === 'function') {
      return 'bm-' + crypto.randomUUID().replace(/-/g, '').slice(0, 40);
    }
    return 'bm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function vectorOf(value) {
    if (!value || typeof value !== 'object') return null;
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z);
    if (![x, y, z].every(Number.isFinite)) return null;
    return { x: round(x), y: round(y), z: round(z) };
  }

  function normalizeMark(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const point = vectorOf(raw.point);
    const normalValue = vectorOf(raw.normal);
    const surface = String(raw.surface || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
    if (!point || !normalValue || !surface || SKIP_SURFACES.has(surface)) return null;
    const length = Math.hypot(normalValue.x, normalValue.y, normalValue.z);
    if (!length || length < 0.5) return null;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : 'bm-' + point.x + '-' + point.y + '-' + point.z,
      point,
      normal: {
        x: normalValue.x / length,
        y: normalValue.y / length,
        z: normalValue.z / length
      },
      surface,
      shooterId: typeof raw.shooterId === 'string' ? raw.shooterId : ''
    };
  }

  function queueBuild(entry) {
    if (entry.queued) return;
    entry.queued = true;
    buildQueue.push(entry);
  }

  function updateMesh(entry) {
    if (entry.slot === null) entry.slot = freeSlots.pop() ?? nextSlot++;
    batch.write(entry.slot, entry.mark, hashId(entry.mark.id));
    entry.drawn = true;
  }

  function processBuildQueue() {
    for (let built = 0; buildQueue.length && built < BUILD_BUDGET;) {
      const entry = buildQueue.shift();
      entry.queued = false;
      if (entry.drawn || entries.get(entry.mark.id) !== entry) continue;
      updateMesh(entry);
      built += 1;
    }
  }

  function capacityFor(size) {
    let capacity = INITIAL_RENDER_CAPACITY;
    while (capacity < size) capacity *= 2;
    return capacity;
  }

  function ensure(game, minimum) {
    const fx = game?.fx;
    if (!fx?.createBulletMarkBatch) return false;
    const wanted = capacityFor(Math.max(Number(minimum) || 0, entries.size));
    if (batch && renderFx === fx && batchCapacity >= wanted) return true;
    batch?.dispose();
    renderFx = fx;
    batchCapacity = wanted;
    batch = fx.createBulletMarkBatch(wanted);
    freeSlots.length = nextSlot = buildQueue.length = 0;
    for (const entry of entries.values()) {
      entry.slot = null;
      entry.drawn = entry.queued = false;
      queueBuild(entry);
    }
    return true;
  }

  function removeEntry(id) {
    const entry = entries.get(id);
    if (!entry) return;
    if (entry.slot !== null && batch) {
      batch.remove(entry.slot);
      freeSlots.push(entry.slot);
    }
    entries.delete(id);
    const timer = localMarks.get(id);
    if (timer) {
      window.clearTimeout(timer);
      localMarks.delete(id);
    }
  }

  function confirmLocal(id) {
    const timer = localMarks.get(id);
    if (!timer) return;
    window.clearTimeout(timer);
    localMarks.delete(id);
  }

  function beginHistory(id) {
    const incoming = Number(id);
    if (!Number.isSafeInteger(incoming) || incoming <= historyId) return false;
    historyId = incoming;
    historyIds.clear();
    historyTracked.clear();
    for (const existingId of entries.keys()) historyTracked.add(existingId);
    return true;
  }

  function finishHistory(id) {
    const incoming = Number(id);
    if (!Number.isSafeInteger(incoming) || incoming < historyId) return;
    if (incoming > historyId) beginHistory(incoming);
    for (const markId of historyTracked) {
      if (!historyIds.has(markId)) removeEntry(markId);
    }
    historyIds.clear();
    historyTracked.clear();
  }

  function add(mark, game) {
    const normalized = normalizeMark(mark);
    if (!normalized) return false;
    confirmLocal(normalized.id);
    const existing = entries.get(normalized.id);
    if (existing) {
      const previous = existing.mark;
      existing.mark = normalized;
      const changed = previous.surface !== normalized.surface || ['x', 'y', 'z'].some(axis =>
        previous.point[axis] !== normalized.point[axis] || previous.normal[axis] !== normalized.normal[axis]);
      if (changed && existing.drawn) updateMesh(existing);
      return true;
    }
    if (game) ensure(game, entries.size + 1);
    entries.set(normalized.id, {
      mark: normalized,
      slot: null,
      queued: false,
      drawn: false
    });
    queueBuild(entries.get(normalized.id));
    return true;
  }

  function clear(game) {
    if (game) ensure(game);
    for (const id of [...entries.keys()]) removeEntry(id);
    freeSlots.length = nextSlot = buildQueue.length = 0;
    batch?.clear();
    syncRequest?.abort();
    restartHistory();
    nextSyncAt = 0;
  }

  function load(marks, game, options) {
    if (!Array.isArray(marks)) return;
    const partial = !!(options && options.partial);
    if (partial) {
      const incomingId = Number(options.historyId);
      if (!Number.isSafeInteger(incomingId) || incomingId < historyId) return;
      if (incomingId > historyId) beginHistory(incomingId);
    } else {
      historyIds.clear();
      historyTracked.clear();
    }
    const incoming = new Map();
    for (const raw of marks) {
      const row = normalizeMark(raw);
      if (!row) continue;
      incoming.set(row.id, row);
      if (partial) {
        historyIds.add(row.id);
        historyTracked.add(row.id);
      }
    }
    if (!partial) {
      for (const id of [...entries.keys()]) if (!incoming.has(id)) removeEntry(id);
    }
    for (const row of incoming.values()) add(row, game);
  }

  function visibleInPort() {
    return !!game?.player && VISIBLE_STATES.has(game.game?.state) &&
      !game.expedition?.active && !game.qingyun?.active && !window.SaltMapShell?.active;
  }

  function restartHistory() {
    syncCursor = '';
    historyComplete = false;
    historyPageId = 0;
    historyBaseCursor = '';
    historyNextBefore = 0;
  }

  async function syncFromApi() {
    if (syncRequest || performance.now() < nextSyncAt) return;
    const request = new AbortController();
    syncRequest = request;
    const timeout = window.setTimeout(() => request.abort(), SYNC_TIMEOUT_MS);
    let delay = historyComplete ? SYNC_INTERVAL_MS : HISTORY_PAGE_GAP_MS;
    try {
      const params = new URLSearchParams({ sync: '1', paged: '1' });
      if (historyComplete) {
        params.set('since', syncCursor);
      } else {
        params.set('history', '1');
        params.set('limit', String(HISTORY_PAGE_SIZE));
        if (historyBaseCursor) params.set('base', historyBaseCursor);
        if (historyNextBefore) params.set('before', String(historyNextBefore));
      }
      const response = await fetch('/api/game/bullet-marks?' + params, {
        cache: 'no-store', signal: request.signal
      });
      if (response.status === 204) return;
      if (!response.ok) throw new Error('Bullet mark sync failed');
      const data = await response.json();
      if (request.signal.aborted || document.hidden || !visibleInPort()) return;
      if (!data.ok || !Array.isArray(data.marks)) throw new Error('Invalid bullet mark sync response');
      if (!historyComplete) {
        if (!historyPageId) historyPageId = historyId + 1;
        if (typeof data.baseCursor === 'string') historyBaseCursor = data.baseCursor;
        load(data.marks, game, { partial: true, historyId: historyPageId });
        const nextBefore = Math.floor(Number(data.nextBefore));
        historyNextBefore = Number.isSafeInteger(nextBefore) && nextBefore > 0 ? nextBefore : 0;
        if (data.complete === true || !historyNextBefore) {
          finishHistory(historyPageId);
          syncCursor = historyBaseCursor || (typeof data.cursor === 'string' ? data.cursor : '');
          historyComplete = true;
          historyPageId = 0;
          historyBaseCursor = '';
          historyNextBefore = 0;
        }
        delay = HISTORY_PAGE_GAP_MS;
        return;
      }
      if (data.reset === true || data.partial !== true) {
        restartHistory();
        delay = HISTORY_PAGE_GAP_MS;
        return;
      }
      for (const mark of data.marks) add(mark, game);
      syncCursor = data.cursor;
      delay = SYNC_INTERVAL_MS;
    } catch (error) {
      delay = SYNC_RETRY_MS;
    } finally {
      window.clearTimeout(timeout);
      syncRequest = null;
      nextSyncAt = visibleInPort() && !document.hidden ? performance.now() + delay : 0;
    }
  }

  function tick(nextGame) {
    if (nextGame) game = nextGame;
    if (!ensure(game, entries.size)) return;
    const visible = visibleInPort();
    if (visible) processBuildQueue();
    batch.show(visible && entries.size > 0);
    if (!visible || document.hidden) {
      syncRequest?.abort();
      return;
    }
    void syncFromApi();
  }

  function report(game, origin, dir, impact, options) {
    if (!game || game.expedition?.active || game.qingyun?.active) return false;
    const weapon = String((options && options.weapon) || (game.weapon && game.weapon.arsenalId) || '').toLowerCase();
    if (weapon === 'knife' || !impact || !impact.point) return false;
    if (impact.from === 'enemy' || impact.enemy || impact.pvp || impact.gold) return false;
    const surface = String(impact.surface || '').toLowerCase();
    if (!surface || SKIP_SURFACES.has(surface)) return false;
    const point = vectorOf(impact.point);
    const rawNormal = impact.normal ? vectorOf(impact.normal) : {
      x: -(dir && dir.x) || 0,
      y: -(dir && dir.y) || 0,
      z: -(dir && dir.z) || 0
    };
    if (!point || !rawNormal) return false;
    const send = window.__mp && window.__mp.send;
    if (!window.__mp?.joined || typeof send !== 'function' || !ensure(game)) return false;

    const id = localId();
    const shot = {
      id,
      point,
      normal: rawNormal,
      surface,
      shooterId: window.__mp.id || ''
    };
    if (!send({ type: 'bulletMark', id, point, normal: rawNormal, surface, at: Date.now() })) return false;
    if (!add(shot, game)) return false;
    impact.sharedBulletMark = true;
    updateMesh(entries.get(id));
    const timer = window.setTimeout(() => {
      localMarks.delete(id);
      removeEntry(id);
    }, LOCAL_CONFIRM_MS);
    localMarks.set(id, timer);
    return true;
  }

  function resetHistory() {
    historyIds.clear();
    historyTracked.clear();
    restartHistory();
    nextSyncAt = 0;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) syncRequest?.abort();
    else nextSyncAt = 0;
  });

  window.SaltBulletMarks = { add, clear, load, report, resetHistory, tick, httpSync: true };
})();
