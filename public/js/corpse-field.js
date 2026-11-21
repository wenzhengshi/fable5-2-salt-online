(() => {
  'use strict';

  if (window.__SALT_CORPSE_FIELD_LOADED__) return;
  window.__SALT_CORPSE_FIELD_LOADED__ = true;

  const MAP_ID = 'port';
  const MAX_VISIBLE = 80;
  const BUILD_BUDGET = 3;
  const SYNC_INTERVAL_MS = 2500;
  const SYNC_RETRY_MS = 5000;
  const SYNC_TIMEOUT_MS = 8000;
  const KINDS = new Set(['hound', 'drone', 'player']);
  const SOLDIERS = new Set(['male', 'female', 'hound', 'drone', 'classic']);
  const VISIBLE_STATES = new Set(['playing', 'paused', 'dead', 'respawning']);
  const entries = new Map();
  const buildQueue = [];
  const reportedLandings = new Set();
  const trackedEnemies = new Map();
  const poseTracked = new Map();
  const historyIds = new Set();
  const historyTracked = new Set();
  const POSE_BONE_RE = /^[a-zA-Z0-9]{1,24}$/;

  let game = null;
  let THREE = null;
  let scene = null;
  let group = null;
  let revision = 0;
  let syncCursor = '';
  let syncRequest = null;
  let nextSyncAt = 0;
  let legacyServer = false;
  let historyId = 0;
  let lastVisibility = null;
  let scorchGeometry = null;
  let ringGeometry = null;
  let scorchMaterial = null;
  let machineRingMaterial = null;
  let playerRingMaterial = null;
  let fallbackAssets = null;
  let eventsHooked = false;

  function cleanText(value, maxLength) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, maxLength);
  }

  function cleanId(value) {
    return cleanText(value, 64).replace(/[^a-zA-Z0-9_-]/g, '');
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

  function normalizePose(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const source = raw.bones && typeof raw.bones === 'object' && !Array.isArray(raw.bones) ? raw.bones : null;
    if (!source) return null;
    const bones = {};
    let count = 0;
    for (const name of Object.keys(source)) {
      if (count >= 32 || !POSE_BONE_RE.test(name)) continue;
      const values = source[name];
      if (!Array.isArray(values) || values.length !== 4) continue;
      const quaternion = values.map(Number);
      if (!quaternion.every(Number.isFinite)) continue;
      const length = Math.hypot(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
      if (!Number.isFinite(length) || length < 1e-6) continue;
      bones[name] = quaternion.map((value) => value / length);
      count += 1;
    }
    if (!count) return null;
    const yaw = Number(raw.yaw);
    const bodyPos = Array.isArray(raw.bodyPos) && raw.bodyPos.length === 3 &&
      raw.bodyPos.every((value) => Number.isFinite(Number(value)))
      ? raw.bodyPos.map(Number)
      : null;
    return { yaw: Number.isFinite(yaw) ? yaw : 0, bodyPos, bones };
  }

  function fallbackTilt(id) {
    const seed = hashId(id);
    const sign = seed % 2 ? 1 : -1;
    const roll = 0.16 + ((seed >>> 1) % 997) / 997 * 0.42;
    const pitch = -1.06 - ((seed >>> 11) % 997) / 997 * 0.32;
    return { roll: sign * roll, pitch };
  }

  function finitePosition(value) {
    if (!value || ![value.x, value.y, value.z].every((item) => Number.isFinite(Number(item)))) return null;
    const pos = { x: Number(value.x), y: Number(value.y), z: Number(value.z) };
    if (Math.abs(pos.x) > 900 || Math.abs(pos.z) > 900 || pos.y < -80 || pos.y > 240) return null;
    return pos;
  }

  function landingSurface(x, z, y) {
    let floor = null;
    try {
      const sampled = Number(game?.physics?.groundHeight?.(x, z, y + 1.5));
      if (Number.isFinite(sampled)) floor = sampled;
    } catch (err) { /* fall back to terrain height */ }
    let terrain = null;
    try {
      const sampled = Number(game?.expedition?.terrainHeight?.(x, z));
      if (Number.isFinite(sampled)) terrain = sampled;
    } catch (err) { /* keep the ground default */ }
    if (floor == null || terrain == null) return 'ground';
    return floor > terrain + 0.35 ? 'object' : 'ground';
  }

  function groundY(x, z, referenceY) {
    const probeY = Math.max(-80, Math.min(240, Number(referenceY) + 2));
    let floor = null;
    try {
      const sampled = Number(game?.physics?.groundHeight?.(x, z, probeY));
      if (Number.isFinite(sampled)) floor = sampled;
    } catch (err) { /* fall back to terrain height */ }
    if (floor != null) return floor;
    try {
      const sampled = Number(game?.expedition?.terrainHeight?.(x, z));
      if (Number.isFinite(sampled)) return sampled;
    } catch (err) { /* keep the stored height */ }
    return null;
  }

  function groundedPosition(pos) {
    const floor = groundY(pos.x, pos.z, pos.y);
    return Number.isFinite(floor) ? { x: pos.x, y: floor, z: pos.z } : pos;
  }

  function reportLanding(input) {
    const data = input || {};
    const pos = finitePosition(data.pos);
    if (!pos) return false;
    const id = cleanId(data.id);
    const victimId = cleanId(data.victimId);
    const playerId = cleanId(data.playerId);
    const at = Number(data.at) || Date.now();
    const key = id || victimId || (playerId ? playerId + ':' + at : '');
    const api = window.__mp;
    if (!key || reportedLandings.has(key) || !api || typeof api.send !== 'function') return false;
    reportedLandings.add(key);
    return api.send({
      type: 'corpseLanded',
      id,
      victimId,
      playerId,
      pos,
      yaw: Number.isFinite(Number(data.yaw)) ? Number(data.yaw) : 0,
      surface: data.surface === 'object' ? 'object' : 'ground',
      at
    });
  }

  function reportPose(input) {
    const data = input || {};
    const pose = normalizePose(data.pose);
    if (!pose) return false;
    const id = cleanId(data.id);
    const victimId = cleanId(data.victimId);
    if (!id && !victimId) return false;
    const pos = finitePosition(data.pos);
    const api = window.__mp;
    if (!api || typeof api.send !== 'function') return false;
    return api.send({
      type: 'corpsePose',
      id,
      victimId,
      pos: pos || undefined,
      pose,
      at: Number(data.at) || Date.now()
    });
  }

  function captureEnemy(enemy) {
    if (!enemy || enemy.type !== 'hound') return;
    const id = enemy.id == null ? '' : String(enemy.id);
    if (!id || poseTracked.has(id)) return;
    poseTracked.set(id, {
      enemy,
      corpseId: 'machine-' + id,
      startedAt: Date.now()
    });
  }

  function hookEnemyEvents() {
    if (eventsHooked) return;
    const events = game && game.events;
    if (!events || typeof events.on !== 'function') return;
    eventsHooked = true;
    events.on('enemy:killed', (event) => captureEnemy(event && event.enemy));
  }

  function updatePoseTracking() {
    if (!poseTracked.size) return;
    const now = Date.now();
    const capture = window.SaltUnitModels && window.SaltUnitModels.capturePose;
    for (const [id, tracked] of poseTracked) {
      if (now - tracked.startedAt > 16000) {
        poseTracked.delete(id);
        continue;
      }
      const enemy = tracked.enemy;
      if (!enemy || enemy.alive) continue;
      if ((Number(enemy.flipT) || 0) > 0.001) continue;
      if (!((Number(enemy.dieT) || 0) >= 2.25)) continue;
      if (typeof capture !== 'function') continue;
      const pose = capture(enemy);
      if (!pose) {
        poseTracked.delete(id);
        continue;
      }
      if (reportPose({ id: tracked.corpseId, victimId: id, pos: enemy.pos, pose })) poseTracked.delete(id);
    }
  }

  function trackEnemy(enemy, corpseId) {
    const id = cleanId(corpseId);
    const enemyId = enemy && enemy.id != null ? String(enemy.id) : '';
    if (!id || !enemyId || trackedEnemies.has(id)) return;
    trackedEnemies.set(id, { enemyId, last: null, startedAt: Date.now() });
  }

  function updateTrackedEnemies() {
    if (!trackedEnemies.size) return;
    const list = game?.enemies?.list;
    for (const [key, tracked] of trackedEnemies) {
      const enemy = Array.isArray(list)
        ? list.find((candidate) => candidate && String(candidate.id) === tracked.enemyId)
        : null;
      const pos = enemy && finitePosition(enemy.pos);
      if (pos) {
        tracked.last = pos;
        if (Date.now() - tracked.startedAt < 12000) continue;
      }
      if (tracked.last) {
        reportLanding({
          id: key,
          victimId: key,
          pos: tracked.last,
          yaw: Number(enemy?.yaw) || 0,
          surface: landingSurface(tracked.last.x, tracked.last.z, tracked.last.y),
          at: Date.now()
        });
      }
      trackedEnemies.delete(key);
    }
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || raw.map !== MAP_ID || !KINDS.has(raw.kind)) return null;
    const id = cleanId(raw.id);
    if (!id) return null;
    const position = raw.pos;
    if (!position || ![position.x, position.y, position.z].every((value) => Number.isFinite(Number(value)))) return null;
    const pos = {
      x: Number(position.x),
      y: Number(position.y),
      z: Number(position.z)
    };
    if (Math.abs(pos.x) > 900 || Math.abs(pos.z) > 900 || pos.y < -80 || pos.y > 240) return null;
    const at = Number(raw.at);
    const seq = Number(raw.seq);
    const yaw = Number(raw.yaw);
    const soldier = cleanText(raw.soldier, 16).toLowerCase();
    return {
      id,
      seq: Number.isSafeInteger(seq) && seq > 0 ? seq : 0,
      at: Number.isFinite(at) ? Math.max(0, Math.floor(at)) : Date.now(),
      map: MAP_ID,
      kind: raw.kind,
      pos,
      yaw: Number.isFinite(yaw) ? yaw : 0,
      playerId: cleanId(raw.playerId),
      name: cleanText(raw.name, 32),
      soldier: SOLDIERS.has(soldier) ? soldier : 'classic',
      outfit: cleanText(raw.outfit, 32).toLowerCase(),
      victimId: cleanId(raw.victimId),
      shooterId: cleanId(raw.shooterId),
      shooterName: cleanText(raw.shooterName, 32),
      pose: normalizePose(raw.pose)
    };
  }

  function buildAssets() {
    scorchGeometry = new THREE.CircleGeometry(0.78, 24);
    ringGeometry = new THREE.RingGeometry(0.82, 0.9, 24);
    scorchMaterial = new THREE.MeshBasicMaterial({
      color: 0x050708,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    machineRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff7842,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    playerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4d55,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    fallbackAssets = {
      box: new THREE.BoxGeometry(1, 1, 1),
      rotor: new THREE.CylinderGeometry(0.17, 0.17, 0.018, 16),
      shell: new THREE.MeshStandardMaterial({ color: 0x20292d, roughness: 0.62, metalness: 0.52 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x0a0f12, roughness: 0.56, metalness: 0.7 }),
      trim: new THREE.MeshStandardMaterial({
        color: 0xff6b3d,
        emissive: 0x48210f,
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.4
      })
    };
  }

  function makeMesh(geometry, material, size, position, rotation) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(position[0], position[1], position[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.castShadow = true;
    return mesh;
  }

  function buildFallback(kind, tilt) {
    const yaw = new THREE.Group();
    yaw.rotation.y = 0;
    const pivot = new THREE.Group();
    pivot.position.y = kind === 'drone' ? 0.92 : 0.42;
    pivot.rotation.set(kind === 'drone' ? -0.48 : tilt.pitch, 0, tilt.roll);
    yaw.add(pivot);
    const assets = fallbackAssets;
    if (kind === 'hound') {
      pivot.add(makeMesh(assets.box, assets.shell, [0.5, 0.25, 0.92], [0, 0, 0]));
      pivot.add(makeMesh(assets.box, assets.trim, [0.3, 0.07, 0.62], [0, 0.15, 0.03]));
      pivot.add(makeMesh(assets.box, assets.shell, [0.28, 0.2, 0.3], [0, 0.05, -0.56]));
      for (const x of [-0.2, 0.2]) {
        for (const z of [-0.32, 0.32]) {
          pivot.add(makeMesh(assets.box, assets.dark, [0.07, 0.46, 0.07], [x, -0.3, z], [0.2, 0, x < 0 ? -0.18 : 0.18]));
        }
      }
    } else {
      pivot.add(makeMesh(assets.box, assets.shell, [0.44, 0.15, 0.54], [0, 0, 0]));
      pivot.add(makeMesh(assets.box, assets.trim, [0.18, 0.08, 0.18], [0, -0.02, -0.3]));
      for (const x of [-0.26, 0.26]) {
        for (const z of [-0.26, 0.26]) {
          pivot.add(makeMesh(assets.box, assets.dark, [0.5, 0.035, 0.035], [x * 0.55, 0.03, z]));
          pivot.add(makeMesh(assets.rotor, assets.trim, [1, 1, 1], [x, 0.06, z]));
        }
      }
    }
    return yaw;
  }

  function mountMachine(entry) {
    if (entry.disposed || entry.machine || !entry.holder) return true;
    const api = window.SaltUnitModels;
    if (!api || typeof api.create !== 'function' ||
        (typeof api.isReady === 'function' && !api.isReady(entry.row.kind))) return false;
    let made = null;
    try {
      made = api.create(entry.row.kind);
    } catch (err) {
      made = null;
    }
    if (!made || !made.model) return false;
    if (entry.fallback && entry.fallback.parent) entry.fallback.parent.remove(entry.fallback);
    entry.fallback = null;
    const yaw = new THREE.Group();
    const pose = entry.row.pose;
    if (pose) {
      yaw.rotation.y = pose.yaw;
      made.model.position.set(0, 0, 0);
      if (typeof api.applyPose === 'function') api.applyPose(made, pose);
      yaw.add(made.model);
    } else {
      const tilt = fallbackTilt(entry.row.id);
      if (entry.row.kind === 'drone') tilt.pitch = -0.48;
      const pivotY = entry.row.kind === 'drone' ? 0.92 : 0.44;
      yaw.rotation.y = entry.row.yaw + Math.PI;
      const pivot = new THREE.Group();
      pivot.position.y = pivotY;
      pivot.rotation.set(tilt.pitch, 0, tilt.roll);
      made.model.position.y = -pivotY;
      pivot.add(made.model);
      yaw.add(pivot);
    }
    entry.holder.add(yaw);
    entry.machine = made;
    entry.machineHolder = yaw;
    return true;
  }

  function scheduleMachineUpgrade(entry) {
    if (entry.disposed || entry.upgradeTimer || entry.machine) return;
    if ((entry.upgradeTries || 0) >= 20) return;
    entry.upgradeTries = (entry.upgradeTries || 0) + 1;
    entry.upgradeTimer = window.setTimeout(() => {
      entry.upgradeTimer = 0;
      if (mountMachine(entry)) return;
      scheduleMachineUpgrade(entry);
    }, 900);
  }

  function mountPlayer(entry) {
    const api = window.__mp;
    if (!api || typeof api.createCorpseAvatar !== 'function') return false;
    const avatar = api.createCorpseAvatar(entry.row);
    if (!avatar || !avatar.group) return false;
    avatar.group.rotation.set(-1.46, entry.row.yaw, (hashId(entry.row.id) % 2 ? 1 : -1) * 0.2);
    avatar.body.position.y = -0.12;
    entry.avatar = avatar;
    return true;
  }

  function buildVisual(entry) {
    entry.built = true;
    if (!THREE || !group || !scene) return;
    const holder = new THREE.Group();
    holder.name = 'salt-corpse-' + entry.row.id;
    const pos = groundedPosition(entry.row.pos);
    holder.position.set(pos.x, pos.y, pos.z);
    const scorch = new THREE.Mesh(scorchGeometry, scorchMaterial);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.012;
    scorch.renderOrder = 3;
    const ring = new THREE.Mesh(ringGeometry, entry.row.kind === 'player' ? playerRingMaterial : machineRingMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.renderOrder = 4;
    holder.add(scorch, ring);
    group.add(holder);
    entry.holder = holder;
    holder.visible = lastVisibility !== false;
    if (entry.row.kind === 'player') {
      mountPlayer(entry);
      if (entry.avatar && entry.avatar.group) {
        entry.avatar.group.position.set(pos.x, pos.y, pos.z);
        entry.avatar.group.visible = holder.visible;
      }
      return;
    }
    entry.fallback = buildFallback(entry.row.kind, fallbackTilt(entry.row.id));
    entry.fallback.rotation.y = entry.row.pose ? entry.row.pose.yaw : entry.row.yaw + Math.PI;
    holder.add(entry.fallback);
    if (!mountMachine(entry)) scheduleMachineUpgrade(entry);
  }

  function disposeVisual(entry) {
    if (entry.upgradeTimer) {
      window.clearTimeout(entry.upgradeTimer);
      entry.upgradeTimer = 0;
    }
    if (entry.machine && typeof entry.machine.dispose === 'function') entry.machine.dispose();
    if (entry.avatar) {
      const api = window.__mp;
      if (entry.avatar.group && entry.avatar.group.parent) entry.avatar.group.parent.remove(entry.avatar.group);
      if (api && typeof api.disposeCorpseAvatar === 'function') api.disposeCorpseAvatar(entry.avatar);
    }
    if (entry.holder && entry.holder.parent) entry.holder.parent.remove(entry.holder);
    entry.built = false;
    entry.holder = null;
    entry.avatar = null;
    entry.machine = null;
    entry.machineHolder = null;
    entry.fallback = null;
    entry.upgradeTries = 0;
  }

  function queueBuild(entry) {
    if (!entry || entry.built || entry.queued || entry.disposed) return;
    entry.queued = true;
    buildQueue.push(entry);
  }

  function processBuildQueue(budget) {
    if (!group || !game || !THREE) return;
    let built = 0;
    while (buildQueue.length && built < budget) {
      const entry = buildQueue.shift();
      entry.queued = false;
      if (entry.disposed || entry.built || entries.get(entry.row.id) !== entry) continue;
      buildVisual(entry);
      built += 1;
    }
  }

  function ensure(nextGame) {
    if (nextGame) game = nextGame;
    if (!game || !game.THREE || !game.scene) return false;
    hookEnemyEvents();
    if (group && THREE === game.THREE && scene === game.scene) return true;
    if (group && scene) {
      for (const entry of entries.values()) disposeVisual(entry);
    }
    if (group && group.parent) group.parent.remove(group);
    THREE = game.THREE;
    scene = game.scene;
    group = new THREE.Group();
    group.name = 'salt-shared-corpse-field';
    group.frustumCulled = false;
    scene.add(group);
    buildAssets();
    buildQueue.length = 0;
    lastVisibility = null;
    for (const entry of entries.values()) queueBuild(entry);
    return true;
  }

  function removeEntry(id) {
    const entry = entries.get(id);
    if (!entry) return;
    entry.disposed = true;
    disposeVisual(entry);
    entries.delete(id);
    const index = buildQueue.indexOf(entry);
    if (index >= 0) buildQueue.splice(index, 1);
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

  function finishHistory(id, nextRevision) {
    const incoming = Number(id);
    if (!Number.isSafeInteger(incoming) || incoming < historyId) return;
    if (incoming > historyId) beginHistory(incoming);
    for (const corpseId of historyTracked) {
      if (!historyIds.has(corpseId)) removeEntry(corpseId);
    }
    const incomingRevision = Number(nextRevision);
    if (Number.isSafeInteger(incomingRevision) && incomingRevision > revision) revision = incomingRevision;
    historyIds.clear();
    historyTracked.clear();
  }

  function createEntry(row) {
    if (entries.has(row.id)) return;
    const entry = {
      row,
      built: false,
      disposed: false,
      queued: false,
      holder: null,
      avatar: null,
      machine: null,
      machineHolder: null,
      fallback: null,
      upgradeTimer: 0,
      upgradeTries: 0
    };
    entries.set(row.id, entry);
    if (ensure(game)) queueBuild(entry);
  }

  function trim() {
    while (entries.size > MAX_VISIBLE) {
      let oldestId = '';
      let oldest = null;
      for (const [id, entry] of entries) {
        if (!oldest || entry.row.seq < oldest.seq || (entry.row.seq === oldest.seq && entry.row.at < oldest.at)) {
          oldestId = id;
          oldest = entry.row;
        }
      }
      if (!oldestId) break;
      removeEntry(oldestId);
    }
  }

  function updateVisual(entry, row) {
    const previous = entry.row;
    const poseChanged = JSON.stringify(row.pose) !== JSON.stringify(previous.pose);
    entry.row = row;
    if (!entry.built) return;
    if (poseChanged && row.kind !== 'player') {
      if (entry.machine) {
        if (typeof entry.machine.dispose === 'function') entry.machine.dispose();
        if (entry.machineHolder && entry.machineHolder.parent) entry.machineHolder.parent.remove(entry.machineHolder);
        entry.machine = null;
        entry.machineHolder = null;
      }
      if (row.pose && !entry.fallback && entry.holder) {
        entry.fallback = buildFallback(row.kind, fallbackTilt(row.id));
        entry.holder.add(entry.fallback);
      }
      if (!mountMachine(entry)) scheduleMachineUpgrade(entry);
    }
    const positionChanged = row.pos.x !== previous.pos.x || row.pos.y !== previous.pos.y ||
      row.pos.z !== previous.pos.z;
    if (positionChanged && entry.holder) {
      const pos = groundedPosition(row.pos);
      entry.holder.position.set(pos.x, pos.y, pos.z);
      entry.avatar?.group.position.copy(entry.holder.position);
    }
    const corpseYaw = row.pose ? row.pose.yaw : row.yaw + Math.PI;
    if (entry.fallback) entry.fallback.rotation.y = corpseYaw;
    if (entry.machineHolder) entry.machineHolder.rotation.y = corpseYaw;
    if (entry.avatar && entry.avatar.group) {
      const roll = (hashId(row.id) % 2 ? 1 : -1) * 0.2;
      entry.avatar.group.rotation.set(-1.46, row.yaw, roll);
      if (entry.avatar.body) entry.avatar.body.position.y = -0.12;
    }
  }

  function applySettled(raw) {
    const row = normalize(raw);
    if (!row) return false;
    const existing = entries.get(row.id);
    if (existing) {
      updateVisual(existing, row);
      return true;
    }
    createEntry(row);
    trim();
    return true;
  }

  function clear() {
    for (const id of [...entries.keys()]) removeEntry(id);
    if (group) group.visible = false;
    syncRequest?.abort();
    syncCursor = '';
    nextSyncAt = 0;
  }

  function load(rows, nextGame, nextRevision, options) {
    if (nextGame) game = nextGame;
    const partial = !!(options && options.partial);
    if (partial) {
      const incomingId = Number(options.historyId);
      if (!Number.isSafeInteger(incomingId) || incomingId < historyId) return;
      if (incomingId > historyId) beginHistory(incomingId);
    } else {
      historyIds.clear();
      historyTracked.clear();
    }
    const incoming = Number(nextRevision);
    if (!partial && Number.isFinite(incoming) && incoming > 0) {
      if (incoming < revision) return;
      revision = incoming;
    }
    const seen = new Set();
    const sorted = [];
    for (const raw of Array.isArray(rows) ? rows : []) {
      const row = normalize(raw);
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      sorted.push(row);
    }
    sorted.sort((left, right) => right.seq - left.seq || right.at - left.at);
    const visibleRows = sorted.slice(0, MAX_VISIBLE);
    const keep = new Set(visibleRows.map((row) => row.id));
    if (!partial) {
      for (const id of [...entries.keys()]) if (!keep.has(id)) removeEntry(id);
    }
    for (const row of visibleRows) {
      if (partial) {
        historyIds.add(row.id);
        historyTracked.add(row.id);
      }
      const existing = entries.get(row.id);
      if (existing) updateVisual(existing, row);
      else createEntry(row);
    }
    trim();
  }

  function add(raw, nextGame) {
    if (nextGame) game = nextGame;
    const row = normalize(raw);
    if (!row || entries.has(row.id)) return false;
    if (row.seq > revision) revision = row.seq;
    createEntry(row);
    trim();
    return true;
  }

  function visibleInPort() {
    return !!game?.player && VISIBLE_STATES.has(game.game?.state) &&
      !game.expedition?.active && !game.qingyun?.active && !window.SaltMapShell?.active;
  }

  async function syncFromApi() {
    if (legacyServer || syncRequest || performance.now() < nextSyncAt) return;
    const request = new AbortController();
    syncRequest = request;
    const timeout = window.setTimeout(() => request.abort(), SYNC_TIMEOUT_MS);
    let delay = SYNC_INTERVAL_MS;
    try {
      const params = new URLSearchParams({ sync: '1', limit: String(MAX_VISIBLE), since: syncCursor });
      const response = await fetch('/api/game/corpse-field?' + params, {
        cache: 'no-store', signal: request.signal
      });
      if (response.status === 204) return;
      if (!response.ok) throw new Error('Corpse sync failed');
      const data = await response.json();
      if (request.signal.aborted || document.hidden || !visibleInPort()) return;
      if (!data.ok || !Array.isArray(data.corpses)) throw new Error('Invalid corpse sync response');
      if (typeof data.cursor !== 'string') {
        legacyServer = true;
        load(data.corpses, game, data.revision);
        return;
      }
      if (data.partial) {
        for (const row of data.corpses) applySettled(row);
      } else {
        load(data.corpses, game);
      }
      syncCursor = data.cursor;
    } catch (error) {
      delay = SYNC_RETRY_MS;
    } finally {
      window.clearTimeout(timeout);
      syncRequest = null;
      nextSyncAt = visibleInPort() && !document.hidden ? performance.now() + delay : 0;
    }
  }

  function attach(nextGame) {
    game = nextGame || game;
  }

  function tick(nextGame) {
    if (nextGame) game = nextGame;
    if (!ensure(game)) return;
    const show = visibleInPort();
    if (lastVisibility !== show) {
      lastVisibility = show;
      group.visible = show;
      for (const entry of entries.values()) {
        if (entry.holder) entry.holder.visible = show;
        if (entry.avatar && entry.avatar.group) entry.avatar.group.visible = show;
      }
      if (show) nextSyncAt = 0;
    }
    if (!show || document.hidden) {
      syncRequest?.abort();
      return;
    }
    void syncFromApi();
    processBuildQueue(BUILD_BUDGET);
    updateTrackedEnemies();
    updatePoseTracking();
  }

  function onMessage(msg, nextGame) {
    if (!msg) return false;
    if (msg.type === 'corpseField') {
      load(msg.corpses, nextGame, msg.revision, { partial: msg.partial, historyId: msg.historyId });
      return true;
    }
    if (msg.type === 'corpseFieldComplete') {
      finishHistory(msg.historyId, msg.revision);
      return true;
    }
    if (msg.type === 'corpse') {
      add(msg.corpse, nextGame);
      return true;
    }
    if (msg.type === 'corpseUpdated' || msg.type === 'corpseSettled') {
      applySettled(msg.corpse);
      return true;
    }
    return false;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) syncRequest?.abort();
    else nextSyncAt = 0;
  });

  window.SaltCorpseField = {
    httpSync: true,
    attach,
    tick,
    onMessage,
    add,
    load,
    clear,
    reportLanding,
    reportPose,
    trackEnemy,
    landingSurface,
    get size() { return entries.size; }
  };
})();
