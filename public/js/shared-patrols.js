(() => {
  'use strict';
  window.installSharedPatrols = function (game) {
    const { THREE, scene } = game;
    const units = new Map();
    const wrecks = [];
    const sinking = [];
    let map, rows = [];
    const activeMap = () => game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : 'port');

    // 与引擎 Ui.maxWrecks / U(T) 的残骸时序保持一致：
    // 场上最多 5 具残骸；第 6 具出现时，最老的一具开始下沉，3.2s 后移除。
    const WRECK_LIMIT = 5;
    const SINK_TIME = 3.2;
    const SINK_RATE = 0.22;

    // 其他地图的共享猎犬固定 50/50：一半复刻盐港本地 hound 的死亡动作，
    // 一半和新版一样直接消失。这里刻意不读取 window.__SALT_FLIP__：
    // 那个值只用于盐港本地 game.bundle.js 的引擎猎犬。
    const SHARED_HOUND_FLIP_CHANCE = 0.5;

    // 以下时序/幅度与 game.bundle.js 的盐港 hound 死亡模块同源：
    // Gt.flipDur=1、flipApex=.8、flipDip=.06、flipLand=.1、flipSpin=-2π。
    const FLIP_TIME = 1;
    const FALL_TIME = 2.2; // 本地死亡态 U(T) 的 dieT < 2.2 阶段
    const FLIP_DIP = 0.06;
    const FLIP_APEX = 0.8;
    const FLIP_LAND = 0.1;
    const FLIP_SPIN = -6.283185307179586;
    const FALL_DROP = 0.505; // .215 - ni.stand(.72)，本地机身落到地面的位移
    const LEGS = ['FL', 'FR', 'RL', 'RR'];

    // 盐港 hound 的骨骼尺寸（game.bundle.js 中 ni / $v）。
    const HOUND = {
      stand: 0.72,
      L1: 0.4,
      L2: 0.42,
      l0: 0.075,
      hipX: 0.165,
      hipY: -0.01,
      hipZ: 0.4,
      footX: 0.275,
      footZ: [0.37, 0.37, -0.42, -0.42],
      footR: 0.046,
      side: [1, -1, 1, -1],
      fore: [1, 1, -1, -1]
    };

    const spawnLocal = game.enemies?.spawn;
    if (spawnLocal) {
      game.enemies.spawn = function (kind, ...args) {
        if (activeMap() !== 'port' && (kind === 'hound' || kind === 'gull')) return null;
        return spawnLocal.call(this, kind, ...args);
      };
    }

    function disposeUnit(unit) {
      if (!unit) return;
      unit.view.model.removeFromParent();
      unit.view.dispose?.();
    }

    function removeLive(id) {
      const unit = units.get(id);
      if (!unit) return;
      units.delete(id);
      disposeUnit(unit);
    }

    function removeWreck(unit) {
      const index = wrecks.indexOf(unit);
      if (index >= 0) wrecks.splice(index, 1);
      const sinkIndex = sinking.indexOf(unit);
      if (sinkIndex >= 0) sinking.splice(sinkIndex, 1);
      disposeUnit(unit);
    }

    function clearAll() {
      for (const id of [...units.keys()]) removeLive(id);
      for (const unit of wrecks.splice(0)) disposeUnit(unit);
      for (const unit of sinking.splice(0)) disposeUnit(unit);
    }

    function clamp01(value) {
      return value < 0 ? 0 : value > 1 ? 1 : value;
    }

    function ease(value) {
      value = clamp01(value);
      return value * value * (3 - 2 * value);
    }

    function flipHeight(u) {
      if (u < 0.12) return -FLIP_DIP * ease(u / 0.12);
      if (u < 0.20) return -FLIP_DIP * (1 - ease((u - 0.12) / 0.08));
      if (u < 0.80) {
        const s = (u - 0.20) / 0.60;
        return FLIP_APEX * 4 * s * (1 - s);
      }
      return -FLIP_LAND * Math.sin(Math.PI * ease((u - 0.80) / 0.20));
    }

    // 与盐港 flipSpin 相同：0.14–0.84 之间平滑转到 -2π，之后保持。
    function flipSpin(u) {
      return FLIP_SPIN * ease((u - 0.14) / 0.70);
    }

    function flipTuck(u) {
      if (u < 0.16) return 0;
      if (u < 0.28) return ease((u - 0.16) / 0.12);
      if (u < 0.72) return 1;
      if (u < 0.84) return 1 - ease((u - 0.72) / 0.12);
      return 0;
    }

    function captureRest(unit) {
      const bones = unit.view.bones || {};
      const body = bones.body;
      const head = bones.head;
      const gun = bones.gun;
      const rot = (bone) => bone && bone.rotation
        ? { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z }
        : { x: 0, y: 0, z: 0 };
      return {
        bodyY: body ? body.position.y : HOUND.stand,
        body: rot(body),
        head: rot(head),
        gun: rot(gun)
      };
    }

    // 直接复用盐港 hound 的 q_() 腿部 IK 数值，把脚目标换算成
    // 相对髋关节的 (x,y,z)，避免用任意 thigh/shin 角度造成“侧翻”腿型。
    function solveLeg(x, y, z, side) {
      const l0 = HOUND.l0;
      const l1 = HOUND.L1;
      const l2 = HOUND.L2 - HOUND.footR * 0.6;
      const l = x * x + y * y;
      const c = Math.sqrt(Math.max(l - l0 * l0, 1e-6));
      let abd = Math.atan2(y, x) - Math.atan2(-c, side * l0);
      if (abd > Math.PI) abd -= Math.PI * 2;
      if (abd < -Math.PI) abd += Math.PI * 2;
      let reach = Math.hypot(c, z);
      const maxReach = (l1 + l2) * 0.995;
      const minReach = Math.abs(l1 - l2) + 0.03;
      if (reach > maxReach) reach = maxReach;
      if (reach < minReach) reach = minReach;
      const p = Math.atan2(z, c);
      const d = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
      const v = (l1 * l1 + l2 * l2 - reach * reach) / (2 * l1 * l2);
      const hip = Math.acos(Math.max(-1, Math.min(1, d))) - p;
      const knee = -(Math.PI - Math.acos(Math.max(-1, Math.min(1, v))));
      return { abd, hip, knee };
    }

    function applyLegs(unit, mode, phase, bodyY) {
      const bones = unit.view.bones || {};
      for (let i = 0; i < LEGS.length; i += 1) {
        const suffix = LEGS[i];
        const side = HOUND.side[i];
        const fore = HOUND.fore[i];
        const standX = side * (HOUND.footX - HOUND.hipX);
        const standY = -bodyY + HOUND.footR * 0.6 - HOUND.hipY;
        const standZ = HOUND.footZ[i] - fore * HOUND.hipZ;
        let x = standX;
        let y = standY;
        let z = standZ;
        if (mode === 'flip') {
          const w = flipTuck(phase);
          const tuckX = side * 0.055;
          const tuckY = -0.22;
          const tuckZ = -fore * 0.11;
          x = standX + (tuckX - standX) * w;
          y = standY + (tuckY - standY) * w;
          z = standZ + (tuckZ - standZ) * w;
        }
        const angles = solveLeg(x, y, z, side);
        const abdomen = bones[`abd${suffix}`];
        const thigh = bones[`thigh${suffix}`];
        const shin = bones[`shin${suffix}`];
        if (abdomen) abdomen.rotation.z = angles.abd;
        if (thigh) thigh.rotation.x = angles.hip;
        if (shin) shin.rotation.x = angles.knee;
      }
    }

    function applyBody(unit, bodyY, pitch, roll) {
      const bones = unit.view.bones || {};
      const body = bones.body;
      if (!body) return;
      body.position.x = 0;
      body.position.y = bodyY;
      body.position.z = 0;
      const rest = unit.death.rest.body;
      body.rotation.set(rest.x + pitch, rest.y, rest.z + roll);
    }

    function applyHead(unit, pitch, yaw, gunPitch) {
      const bones = unit.view.bones || {};
      const head = bones.head;
      const gun = bones.gun;
      const rest = unit.death.rest;
      if (head) {
        head.rotation.set(rest.head.x + pitch, rest.head.y + yaw, rest.head.z);
      }
      if (gun) {
        gun.rotation.x = rest.gun.x + gunPitch - pitch * 0.5;
      }
    }

    function spring(state, key, velocityKey, target, stiffness, damping, dt) {
      state[velocityKey] += ((target - state[key]) * stiffness - state[velocityKey] * damping) * dt;
      state[key] += state[velocityKey] * dt;
    }

    function sparkAt(point, count) {
      game.fx?.sparks?.(point, new THREE.Vector3(0, 1, 0), count);
      game.fx?.debris?.(point, { count: 4 });
    }

    function startWreck(unit, row) {
      const model = unit.view.model;
      const rest = captureRest(unit);
      const yaw = (row && typeof row.yaw === 'number') ? row.yaw : model.rotation.y;
      const dieRoll = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.3);
      const diePitch = (Math.random() - 0.5) * 0.25;
      // 根节点只做 yaw；俯仰/侧倾全部放在 body 骨骼上，避免 root 的
      // Euler x+y 组合把后空翻看成横滚（侧翻/720°）。
      model.rotation.set(0, yaw, 0);
      unit.death = {
        phase: 'flip',
        t: 0,
        yaw,
        baseX: model.position.x,
        baseY: model.position.y,
        baseZ: model.position.z,
        rest,
        dieRoll,
        diePitch,
        sY: 0,
        vy: 0,
        dieT: 0,
        bodyPitch: 0,
        bodyPitchV: 0,
        bodyRoll: 0,
        bodyRollV: 0,
        headPitch: 0,
        headYaw: 0,
        gunPitch: 0
      };
      unit.wreck = {
        sink: 0,
        age: 0,
        smokeT: 0,
        point: new THREE.Vector3(model.position.x, model.position.y + 0.42, model.position.z)
      };
      wrecks.push(unit);
      while (wrecks.length > WRECK_LIMIT) {
        const oldest = wrecks.shift();
        oldest.wreck.sink = 0.001;
        sinking.push(oldest);
      }
      sparkAt(new THREE.Vector3(model.position.x, model.position.y + 0.45, model.position.z), 16);
    }

    function advanceWreck(unit, dt) {
      const death = unit.death;
      const model = unit.view.model;
      const wreck = unit.wreck;

      death.t += dt;

      if (death.phase === 'flip') {
        const p = Math.min(1, death.t / FLIP_TIME);
        const bodyY = death.rest.bodyY + flipHeight(p);
        const spin = flipSpin(p);
        const roll = 0.03 * Math.sin(Math.PI * clamp01((p - 0.20) / 0.60));
        model.position.x = death.baseX;
        model.position.y = death.baseY;
        model.position.z = death.baseZ;
        model.rotation.set(0, death.yaw, 0);
        applyBody(unit, bodyY, spin, roll);
        applyLegs(unit, 'flip', p, bodyY);
        if (p >= 1) {
          death.phase = 'fall';
          death.t = 0;
          death.dieT = 0;
          death.sY = 0;
          death.vy = 0;
          death.bodyPitch = 0;
          death.bodyPitchV = 0;
          death.bodyRoll = 0;
          death.bodyRollV = 0;
          death.headPitch = 0;
          death.headYaw = 0;
          death.gunPitch = 0;
          applyBody(unit, death.rest.bodyY, 0, 0);
          applyHead(unit, 0, 0, 0);
          applyLegs(unit, 'fall', 1, death.rest.bodyY);
          game.fx?.dust?.(new THREE.Vector3(model.position.x, model.position.y + 0.08, model.position.z), new THREE.Vector3(0, 1, 0));
        }
        return;
      }

      if (death.phase === 'fall') {
        death.dieT += dt;
        death.vy -= 9.8 * dt * (death.dieT < 0.12 ? 0.3 : 1);
        death.sY += death.vy * dt;
        if (death.sY < -FALL_DROP) {
          const hard = death.vy < -1.2;
          death.sY = -FALL_DROP;
          if (hard) {
            game.fx?.dust?.(new THREE.Vector3(model.position.x, model.position.y + 0.06, model.position.z), new THREE.Vector3(0, 1, 0));
          }
          death.vy = -death.vy * 0.22;
        }
        spring(death, 'bodyPitch', 'bodyPitchV', death.diePitch, 60, 9, dt);
        spring(death, 'bodyRoll', 'bodyRollV', death.dieRoll, 60, 9, dt);
        death.headPitch += (0.55 - death.headPitch) * (1 - Math.exp(-5 * dt));
        death.headYaw += (death.dieRoll - death.headYaw) * (1 - Math.exp(-3 * dt));
        death.gunPitch += (0.3 - death.gunPitch) * (1 - Math.exp(-4 * dt));
        const bodyY = death.rest.bodyY + death.sY;
        applyBody(unit, bodyY, death.bodyPitch, death.bodyRoll);
        applyHead(unit, death.headPitch, death.headYaw, death.gunPitch);
        applyLegs(unit, 'fall', 1, bodyY);
        if (death.dieT >= FALL_TIME) {
          death.phase = 'wreck';
          death.t = 0;
          wreck.age = 0;
          wreck.smokeT = 0;
        }
        return;
      }

      // 残骸静置：本地死亡态在 D<6.5 前持续冒烟；这里 1.0s 翻转 + 2.2s 倒身后，
      // 再补约 4.2s 烟效，接近本地总时长，不延长残骸本身寿命。
      wreck.age += dt;
      wreck.smokeT -= dt;
      if (wreck.age < 4.2 && wreck.smokeT <= 0) {
        wreck.smokeT = 0.18 + Math.random() * 0.14;
        game.fx?.smoke?.(wreck.point, {
          size: 0.42 + Math.random() * 0.22,
          life: 1.2,
          color: 0x171a1c,
          rise: 1.0
        });
      }
    }

    function updateWrecks(dt) {
      // 与引擎 addWreck 一致：第 6 具残骸出现时，最旧一具从 active 列表移入下沉队列；
      // 下沉期间不再占用 5 具上限，3.2s 后移除。
      for (let i = sinking.length - 1; i >= 0; i -= 1) {
        const unit = sinking[i];
        unit.wreck.sink += dt;
        unit.view.model.position.y -= SINK_RATE * dt;
        if (unit.wreck.sink > SINK_TIME) removeWreck(unit);
      }
      for (const unit of wrecks) advanceWreck(unit, dt);
    }

    function snapshot(nextMap, nextRows) {
      if (nextMap !== map || activeMap() !== nextMap) clearAll();
      map = nextMap;
      rows = Array.isArray(nextRows) ? nextRows : [];
      const wanted = new Set(rows.map(row => row.id));
      for (const id of units.keys()) {
        if (!wanted.has(id) || activeMap() !== map) removeLive(id);
      }
    }

    function update(dt, connected) {
      if (!connected || map === 'port' || activeMap() !== map) {
        clearAll();
        if (!connected) rows = [];
        return;
      }
      updateWrecks(dt);
      for (const row of rows) {
        let unit = units.get(row.id);
        if (!unit) {
          const view = window.SaltUnitModels?.create(row.kind === 'hound' ? 'hound' : 'drone');
          if (!view) continue;
          view.model.name = 'shared-patrol-' + row.id;
          view.kind = row.kind;
          view.model.position.set(row.x, row.y, row.z);
          view.model.rotation.y = row.yaw;
          scene.add(view.model);
          units.set(row.id, unit = { view });
        }
        const model = unit.view.model;
        const mix = 1 - Math.exp(-dt * 14);
        model.position.x += (row.x - model.position.x) * mix;
        model.position.y += (row.y - model.position.y) * mix;
        model.position.z += (row.z - model.position.z) * mix;
        const turn = row.yaw - model.rotation.y;
        model.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * mix;
        unit.view.rig.update(dt, { moving: row.moving });
      }
    }

    function intersect(origin, dir, range) {
      if (map === 'port' || activeMap() !== map) return null;
      let nearest = null;
      for (const row of rows) {
        const position = units.get(row.id)?.view.model.position || row;
        const x = position.x - origin.x, y = position.y + (row.kind === 'hound' ? .65 : 0) - origin.y, z = position.z - origin.z;
        const along = x * dir.x + y * dir.y + z * dir.z;
        const side = x * x + y * y + z * z - along * along;
        const radius = row.kind === 'hound' ? .92 : .78;
        if (along < 0 || side >= radius * radius) continue;
        const hit = Math.max(0, along - Math.sqrt(radius * radius - side));
        if (hit < (nearest ?? range)) nearest = hit;
      }
      return nearest;
    }

    function destroyed(message) {
      if (message.map !== map) return;
      const doomed = rows.find(row => row.id === message.id);
      rows = rows.filter(row => row.id !== message.id);
      const unit = units.get(message.id);
      if (!unit) {
        if (activeMap() === map && message.pos) {
          const point = new THREE.Vector3(message.pos.x, message.pos.y, message.pos.z);
          game.fx?.sparks?.(point, new THREE.Vector3(0, 1, 0), 18);
        }
        return;
      }

      const kind = (doomed && doomed.kind) || unit.view.kind || 'hound';
      units.delete(message.id);

      // 无人机维持原版：火花 + 立即移除旋翼模型。
      if (kind !== 'hound') {
        disposeUnit(unit);
        if (activeMap() === map && message.pos) {
          const point = new THREE.Vector3(message.pos.x, message.pos.y, message.pos.z);
          game.fx?.sparks?.(point, new THREE.Vector3(0, 1, 0), 18);
        }
        return;
      }

      // 服务端在 patrolDestroyed 中统一掷骰，保证同一次击杀所有客户端看到同一分支；
      // 旧服务端没有 flip 字段时才回退到本地 50%。
      const flip = kind === 'hound' && (typeof message.flip === 'boolean'
        ? message.flip
        : Math.random() < SHARED_HOUND_FLIP_CHANCE);

      if (!flip) {
        // 50% 分支：和新版一样击毁后直接消失，不留残骸、不播倒地动作。
        const point = new THREE.Vector3(unit.view.model.position.x, unit.view.model.position.y + 0.45, unit.view.model.position.z);
        sparkAt(point, 16);
        disposeUnit(unit);
        return;
      }

      startWreck(unit, doomed);
    }

    return { snapshot, update, intersect, destroyed };
  };
})();
