import { clone as cloneSkinned } from '/vendor/SkeletonUtils.js';

(() => {
  'use strict';

  const MACHINE_KINDS = new Set(['hound', 'drone']);
  const BONE_NAMES = [
    'root', 'body', 'neck', 'head', 'turret', 'gun', 'antenna', 'beacon',
    'abdFL', 'thighFL', 'shinFL', 'abdFR', 'thighFR', 'shinFR',
    'abdRL', 'thighRL', 'shinRL', 'abdRR', 'thighRR', 'shinRR',
    'rotor0', 'rotor1', 'rotor2', 'rotor3', 'gimbalYaw', 'ball', 'lamp',
    'strobeG', 'strobeR', 'strobeW'
  ];
  const LEGS = ['FL', 'FR', 'RL', 'RR'];
  const waiters = new Map();

  function sourceFor(kind) {
    const debug = window.__G && window.__G.enemies && window.__G.enemies.debug;
    if (!debug) return null;
    const pool = kind === 'drone' ? debug.gulls : kind === 'hound' ? debug.hounds : null;
    return Array.isArray(pool) && pool.length ? pool[0] : null;
  }

  function three() {
    return window.__G && window.__G.THREE;
  }

  function findBones(model) {
    const bones = {};
    model.traverse((node) => {
      if (node && BONE_NAMES.includes(node.name)) bones[node.name] = node;
    });
    return bones;
  }

  function hideUnitLabels(bones) {
    const body = bones.body;
    if (!body) return;
    for (const child of body.children) {
      if (child.isMesh && !child.isSkinnedMesh) child.visible = false;
    }
  }

  function snapshotRotation(bones) {
    const rotation = {};
    for (const name of Object.keys(bones)) {
      const bone = bones[name];
      if (!bone || !bone.rotation) continue;
      rotation[name] = {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z
      };
    }
    return rotation;
  }

  function makeHoundRig(bones) {
    const base = snapshotRotation(bones);
    const body = bones.body;
    const bodyY = body ? body.position.y : 0;
    let phase = Math.random() * Math.PI * 2;
    let elapsed = 0;

    return {
      update(dt, state) {
        const moving = !!(state && state.moving);
        const sprint = !!(state && state.sprint);
        const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
        elapsed += step;
        phase += step * (moving ? (sprint ? 13 : 9) : 1.6);

        const gait = moving ? (sprint ? 0.46 : 0.34) : 0;
        for (let i = 0; i < LEGS.length; i += 1) {
          const suffix = LEGS[i];
          const offset = i === 0 || i === 3 ? 0 : Math.PI;
          const wave = Math.sin(phase + offset);
          const thigh = bones[`thigh${suffix}`];
          const shin = bones[`shin${suffix}`];
          const abdomen = bones[`abd${suffix}`];
          if (thigh) thigh.rotation.x = base[thigh.name] ? base[thigh.name].x + wave * gait : wave * gait;
          if (shin) {
            const fold = Math.max(0, -wave) * gait * 1.25;
            shin.rotation.x = base[shin.name] ? base[shin.name].x + fold + 0.04 : fold + 0.04;
          }
          if (abdomen) {
            abdomen.rotation.z = base[abdomen.name]
              ? base[abdomen.name].z + Math.cos(phase + offset) * gait * 0.16
              : Math.cos(phase + offset) * gait * 0.16;
          }
        }

        if (body) {
          body.position.y = bodyY + (moving ? Math.abs(Math.sin(phase * 2)) * 0.025 : Math.sin(elapsed * 1.8) * 0.008);
          if (base.body) body.rotation.set(base.body.x, base.body.y, base.body.z);
        }
        const head = bones.head;
        if (head) head.rotation.y = Math.sin(elapsed * 0.7) * 0.04;
        const turret = bones.turret;
        if (turret) turret.rotation.y = Math.sin(elapsed * 0.45) * 0.06;
      }
    };
  }

  function makeDroneRig(bones) {
    const base = snapshotRotation(bones);
    const body = bones.body;
    const bodyY = body ? body.position.y : 0;
    let elapsed = 0;
    let rotor = 0;

    return {
      update(dt, state) {
        const moving = !!(state && state.moving);
        const sprint = !!(state && state.sprint);
        const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
        elapsed += step;
        rotor += step * (moving ? (sprint ? 62 : 48) : 34);

        for (let i = 0; i < 4; i += 1) {
          const bone = bones[`rotor${i}`];
          if (!bone) continue;
          bone.rotation.y = (base[bone.name] ? base[bone.name].y : 0) + rotor * (i % 2 ? -1 : 1);
        }
        if (body) {
          body.position.y = bodyY + 0.018 + Math.sin(elapsed * 3.2) * 0.022;
          if (base.body) body.rotation.set(base.body.x, base.body.y, base.body.z + Math.sin(elapsed * 1.7) * 0.018);
        }
        const gimbal = bones.gimbalYaw;
        if (gimbal) gimbal.rotation.y = Math.sin(elapsed * 0.55) * 0.1;
        const gun = bones.gun;
        if (gun) gun.rotation.x = -0.08 + Math.sin(elapsed * 0.8) * 0.03;
      }
    };
  }

  function create(kind, options) {
    if (kind !== 'hound' && kind !== 'drone') return null;
    const source = sourceFor(kind);
    const THREE = three();
    if (!source || !source.rig || !source.rig.group || !THREE) return null;

    const model = cloneSkinned(source.rig.group);
    model.name = `salt-unit-${kind}`;
    model.visible = true;
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.updateMatrixWorld(true);
    if (kind === 'drone' && model.children.length > 1) {
      // The second skinned mesh is the oversized distant rotor-blur effect.
      model.children[1].visible = false;
    }

    const bones = findBones(model);
    hideUnitLabels(bones);
    const preview = !!(options && options.preview);
    const previewMaterials = [];
    if (preview) {
      model.scale.setScalar(kind === 'drone' ? 0.55 : 0.62);
      model.position.y = kind === 'drone' ? 0.18 : 0.02;
      model.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        const tuned = materials.map((material) => {
          const clone = material.clone();
          if (clone.color) clone.color.multiplyScalar(1.35);
          if (clone.emissive && clone.emissive.isColor) {
            clone.emissive.add(new THREE.Color(0x10191c));
            clone.emissiveIntensity = Math.max(0.45, clone.emissiveIntensity || 0);
          }
          if (typeof clone.metalness === 'number') clone.metalness = Math.min(0.62, clone.metalness);
          if (typeof clone.roughness === 'number') clone.roughness = Math.max(0.42, clone.roughness);
          clone.needsUpdate = true;
          previewMaterials.push(clone);
          return clone;
        });
        node.material = Array.isArray(node.material) ? tuned : tuned[0];
      });
    }

    const rig = kind === 'hound' ? makeHoundRig(bones) : makeDroneRig(bones);
    rig.update(0.016, { moving: false, sprint: false });

    return {
      model,
      rig,
      bones,
      kind,
      preview,
      dispose() {
        for (const material of previewMaterials) material.dispose();
        previewMaterials.length = 0;
      }
    };
  }

  function whenReady(kind) {
    const id = kind === 'drone' ? 'drone' : 'hound';
    if (sourceFor(id)) return Promise.resolve(true);
    if (waiters.has(id)) return waiters.get(id);

    const promise = new Promise((resolve) => {
      const startedAt = performance.now();
      const check = () => {
        if (sourceFor(id)) {
          waiters.delete(id);
          resolve(true);
          return;
        }
        if (performance.now() - startedAt > 20000 || window.__fatal) {
          waiters.delete(id);
          resolve(false);
          return;
        }
        window.setTimeout(check, 120);
      };
      check();
    });
    waiters.set(id, promise);
    return promise;
  }

  window.SaltUnitModels = {
    kinds: ['hound', 'drone'],
    normalize(value) {
      return value === 'drone' ? 'drone' : 'hound';
    },
    isMachine(value) {
      return MACHINE_KINDS.has(value);
    },
    create,
    whenReady,
    isReady(kind) {
      return !!(kind === 'hound' || kind === 'drone') && !!sourceFor(kind);
    }
  };
})();
