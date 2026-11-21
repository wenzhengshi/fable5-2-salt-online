(() => {
  'use strict';

  if (window.__SALT_BULLET_MARKS_LOADED__) return;
  window.__SALT_BULLET_MARKS_LOADED__ = true;

  const MAP_ID = 'port';
  const MAX_MARKS = 800;
  const BUILD_BUDGET = 8;
  const LOCAL_CONFIRM_MS = 1800;
  const SKIP_SURFACES = new Set(['player', 'enemy', 'gold', 'water']);
  const entries = new Map();
  const buildQueue = [];
  const localMarks = new Map();
  const historyIds = new Set();
  const historyTracked = new Set();
  let renderFx = null;
  let batch = null;
  const freeSlots = [];
  let nextSlot = 0;
  let historyId = 0;

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

  function ensure(game) {
    const fx = game?.fx;
    if (!fx?.createBulletMarkBatch) return false;
    if (batch && renderFx === fx) return true;
    batch?.dispose();
    renderFx = fx;
    batch = fx.createBulletMarkBatch(MAX_MARKS);
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
    if (entry.slot !== null) {
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

  function trim() {
    while (entries.size > MAX_MARKS) {
      const oldest = entries.keys().next().value;
      if (!oldest) break;
      removeEntry(oldest);
    }
  }

  function add(mark, game) {
    const normalized = normalizeMark(mark);
    if (!normalized) return false;
    if (game) ensure(game);
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
    entries.set(normalized.id, {
      mark: normalized,
      slot: null,
      queued: false,
      drawn: false
    });
    queueBuild(entries.get(normalized.id));
    trim();
    return true;
  }

  function clear(game) {
    if (game) ensure(game);
    for (const id of [...entries.keys()]) removeEntry(id);
    freeSlots.length = nextSlot = buildQueue.length = 0;
    batch?.clear();
  }

  function load(marks, game, options) {
    if (game) ensure(game);
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
    trim();
  }

  function tick(game) {
    if (!ensure(game)) return;
    const map = game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : MAP_ID);
    const state = game.game && game.game.state;
    const visible = map === MAP_ID && !!game.player && ['playing', 'paused', 'dead'].includes(state);
    if (visible) processBuildQueue();
    batch.show(visible && entries.size > 0);
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

  function onMessage(msg, game) {
    if (!msg) return false;
    if (msg.type === 'bulletMarks') {
      load(msg.marks, game, { partial: msg.partial, historyId: msg.historyId });
      return true;
    }
    if (msg.type === 'bulletMarksComplete') {
      finishHistory(msg.historyId);
      return true;
    }
    if (msg.type === 'bulletMark') {
      historyTracked.delete(msg.mark?.id);
      add(msg.mark, game);
      return true;
    }
    return false;
  }

  function resetHistory() {
    historyId = 0;
    historyIds.clear();
    historyTracked.clear();
  }

  window.SaltBulletMarks = { add, clear, load, onMessage, report, resetHistory, tick };
})();
