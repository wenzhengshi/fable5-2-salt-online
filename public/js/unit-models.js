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
  const externalSources = new Map();

  function isUsableSource(unit) {
    return !!(unit && unit.rig && unit.rig.group);
  }

  function isHealthySource(unit) {
    return isUsableSource(unit) && !!unit.active && !!unit.alive && !unit.wreck &&
      Number(unit.hp) > 0;
  }

  function isPristineSource(unit) {
    return isUsableSource(unit) && !unit.wreck &&
      Number(unit.sink || 0) <= 0 && Number(unit.hp) > 0;
  }

  function sourceFor(kind) {
    const debug = window.__G && window.__G.enemies && window.__G.enemies.debug;
    if (!debug) return externalSources.get(kind) || null;
    const pool = kind === 'drone' ? debug.gulls : kind === 'hound' ? debug.hounds : null;
    if (!Array.isArray(pool) || !pool.length) return externalSources.get(kind) || null;
    // 敌人死亡后会继续留在对象池里，pool[0] 可能正是一具翻倒的残骸。
    // 不能直接克隆 pool[0]，优先选活着的单位，其次选未被击毁的干净槽位。
    return pool.find(isHealthySource) || pool.find(isPristineSource) || pool.find(isUsableSource) ||
      externalSources.get(kind) || null;
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

  function resetBindPose(model) {
    const skeletons = new Set();
    model.traverse((node) => {
      if (node && node.isSkinnedMesh && node.skeleton && typeof node.skeleton.pose === 'function') {
        skeletons.add(node.skeleton);
      }
    });
    for (const skeleton of skeletons) skeleton.pose();
    model.updateMatrixWorld(true);
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
        const crouch = state?.crouch ? 1 : 0;
        const stomp = state?.stomp || 0;
        for (let i = 0; i < LEGS.length; i += 1) {
          const suffix = LEGS[i];
          const offset = i === 0 || i === 3 ? 0 : Math.PI;
          const wave = Math.sin(phase + offset);
          const thigh = bones[`thigh${suffix}`];
          const shin = bones[`shin${suffix}`];
          const abdomen = bones[`abd${suffix}`];
          if (thigh) thigh.rotation.x = (base[thigh.name]?.x || 0) + wave * gait +
            (i < 2 ? -.22 * crouch : -.65 * crouch) + (i === 0 ? -.64 * stomp : 0);
          if (shin) {
            const fold = Math.max(0, -wave) * gait * 1.25 + (i < 2 ? .42 : .78) * crouch + (i === 0 ? .48 * stomp : 0);
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
          body.position.y += -.12 * crouch + .035 * stomp;
          if (base.body) body.rotation.set(base.body.x - .12 * stomp, base.body.y, base.body.z);
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
    // 敌人死亡时骨骼会停在翻倒、蜷缩或缺失旋翼的残骸姿态；克隆后先回到绑定姿态，
    // 否则玩家模型会以“被击毁的机械狗/无人机”姿态出生。
    resetBindPose(model);
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
          if (clone.color) clone.color.multiplyScalar(1.35).lerp(new THREE.Color(0x8799a3), 0.14);
          if (clone.emissive && clone.emissive.isColor) {
            clone.emissive.add(new THREE.Color(0x26343f));
            clone.emissiveIntensity = Math.max(0.45, clone.emissiveIntensity || 0);
          }
          if (typeof clone.metalness === 'number') clone.metalness = Math.min(0.46, clone.metalness);
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
      armorAnchors: { head: kind === 'hound' ? bones.head : bones.gimbalYaw, chest: bones.body },
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
    useSource(kind, group) {
      if (MACHINE_KINDS.has(kind)) externalSources.set(kind, { rig: { group } });
    },
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
