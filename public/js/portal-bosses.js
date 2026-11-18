(() => {
  'use strict';

  const { HEIGHT, TEAM_SIZE, SMALL_HEIGHT, STOMP_RADIUS, BOSS_NAMES, flightBoxes, rayDistance, HOUND_HEAD_MARK, seesWeakPoint, weakPointRadius, weakRayDistance, splitProgress, splitStretch, splitPosition } = window.SaltPortalBossRules;
  const english = document.documentElement.lang === 'en-US';
  const targetHeight = boss => boss.height || (boss.phase === 'active' ? HEIGHT : SMALL_HEIGHT[boss.kind]);
  const catModels = { cat: 'cream-tabby-boss', watercolor: 'watercolor-cat-boss' };
  const catAssets = new Map();

  async function loadCat(THREE, modelName) {
    const response = await fetch('/models/' + modelName + '.bin');
    if (!response.ok) throw new Error('Cat mesh unavailable');
    const view = new DataView(await response.arrayBuffer());
    const format = view.getUint32(0);
    const textured = format === 0x43415432;
    if (!textured && format !== 0x43415431) throw new Error('Invalid cat mesh');
    const vertices = view.getUint32(4, true), count = view.getUint32(8, true);
    const frameCount = view.getUint32(12, true), coatVertices = view.getUint32(16, true);
    const geometry = new THREE.BufferGeometry();
    let offset = 20;
    const colors = new Uint8Array(view.buffer, offset, vertices * 3);
    geometry.setAttribute('color', textured
      ? new THREE.BufferAttribute(Float32Array.from(colors, color => color * 2 / 255), 3)
      : new THREE.BufferAttribute(colors, 3, true));
    offset += vertices * 3;
    if (textured) {
      const uv = new Float32Array(vertices * 2);
      for (let i = 0; i < uv.length; i++, offset += 2) uv[i] = view.getUint16(offset, true) / 65535;
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    const index = textured ? new Uint16Array(count) : new Uint32Array(count);
    for (let i = 0; i < count; i++, offset += index.BYTES_PER_ELEMENT) {
      index[i] = textured ? view.getUint16(offset, true) : view.getUint32(offset, true);
    }
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const poses = [];
    const normals = [];
    for (let pose = 0; pose < frameCount; pose++) {
      const positions = new Float32Array(vertices * 3);
      for (let i = 0; i < positions.length; i++, offset += 2) positions[i] = view.getInt16(offset, true) / 12000;
      const sample = new THREE.BufferGeometry();
      const attribute = new THREE.BufferAttribute(positions, 3);
      sample.setIndex(geometry.index);
      sample.setAttribute('position', attribute);
      sample.computeVertexNormals();
      poses.push(attribute);
      normals.push(sample.attributes.normal);
    }
    geometry.setAttribute('position', poses[0]);
    geometry.setAttribute('normal', normals[0]);
    geometry.morphAttributes.position = poses.slice(1);
    geometry.morphAttributes.normal = normals.slice(1);
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, roughness: textured ? .74 : .84, side: THREE.DoubleSide
    });
    if (textured) {
      const texture = await new THREE.TextureLoader().loadAsync('/models/' + modelName + '.webp');
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
      material.map = texture;
    }
    if (!textured) addCoatDetail(THREE, geometry, material, vertices, coatVertices);
    return { geometry, material, stompIndex: frameCount - 2, gaitPoses: frameCount - 2 };
  }

  function addCoatDetail(THREE, geometry, material, vertices, coatVertices) {
    const coatMask = new Uint8Array(vertices);
    coatMask.fill(255, 0, coatVertices);
    geometry.setAttribute('isCoat', new THREE.BufferAttribute(coatMask, 1, true));
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float isCoat; varying float vCoat; varying vec3 vCoatPosition;\n' +
        shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nvCoat = isCoat; vCoatPosition = position;');
      shader.fragmentShader = 'varying float vCoat; varying vec3 vCoatPosition;\n' +
        shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          vec3 p = vCoatPosition;
          float strands = sin(462.0*p.x + 103.0*p.y + 41.0*sin(p.z*57.0));
          float fiber = sin(197.0*p.z - 32.0*p.y + 16.0*sin(p.x*70.0));
          float detail = 1.0 - smoothstep(.25, 3.0, 215.0*length(fwidth(p)));
          diffuseColor.rgb *= 1.0 + vCoat * detail * (0.095*strands + 0.047*fiber);
        `);
    };
  }

  function install(game) {
    const { THREE, scene } = game;
    const actors = new Map();
    const hud = document.createElement('section');
    hud.className = 'portal-boss-hud';
    hud.hidden = true;
    document.body.append(hud);
    const ringGeometry = new THREE.RingGeometry(.94, 1, 48).rotateX(-Math.PI / 2);
    const red = new THREE.MeshBasicMaterial({
      color: 0xff5937, transparent: true, opacity: .8, depthWrite: false, polygonOffset: true,
      polygonOffsetFactor: -3, side: THREE.DoubleSide
    });
    const angles = new THREE.Box3();
    const markRim = new THREE.CircleGeometry(.026, 24).rotateX(-Math.PI / 2);
    const markCenter = new THREE.CircleGeometry(.019, 24).rotateX(-Math.PI / 2);
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0x211b07, polygonOffset: true, polygonOffsetFactor: -1 });
    const markMaterial = new THREE.MeshBasicMaterial({ color: 0xffed29, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2 });
    const markWorld = new THREE.Vector3();
    const neckGeometry = new THREE.SphereGeometry(1, 16, 10);
    const neckMaterial = new THREE.MeshStandardMaterial({ color: 0x565d5e, roughness: .68, metalness: .35 });
    const neckAxis = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let receivedMap = '';
    let lastHud = 0;
    let bounty = null;
    let serverClock = 0;

    function currentMap() {
      return game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : 'port');
    }

    function loadActor(actor, kind, now) {
      if (actor.model || actor.loading || now < actor.retryAt) return;
      const modelName = catModels[kind];
      if (modelName) {
        actor.loading = true;
        if (!catAssets.has(modelName)) catAssets.set(modelName, loadCat(THREE, modelName).catch(error => {
          catAssets.delete(modelName);
          throw error;
        }));
        catAssets.get(modelName).then(asset => {
          if (actors.get(actor.data.id) !== actor) return;
          const mesh = new THREE.Mesh(asset.geometry, asset.material);
          mesh.name = modelName;
          actor.model = mesh;
          actor.root.add(mesh);
          actor.pose = (dt, moving, windup) => {
            actor.gait = (actor.gait + dt * 1.42) % 1;
            const weights = mesh.morphTargetInfluences;
            weights.fill(0);
            if (windup) weights[asset.stompIndex] = windup;
            else if (moving) {
              const f = actor.gait * asset.gaitPoses;
              const index = Math.floor(f);
              weights[index] = 1 - (f - index);
              weights[(index + 1) % asset.gaitPoses] = f - index;
            }
          };
        }).catch(error => {
          actor.retryAt = performance.now() + 4000;
          console.warn('[portal-bosses]', error.message);
        }).finally(() => { actor.loading = false; });
        return;
      }

      const hound = window.SaltUnitModels?.create('hound');
      if (!hound) { actor.retryAt = now + 350; return; }
      hound.model.updateMatrixWorld(true);
      angles.setFromObject(hound.model, true);
      const height = angles.max.y - angles.min.y;
      if (!Number.isFinite(height) || height < .05) {
        hound.dispose();
        actor.retryAt = now + 1000;
        return;
      }
      const normalized = new THREE.Group();
      normalized.scale.setScalar(1 / height);
      hound.model.position.y -= angles.min.y;
      normalized.add(hound.model);
      actor.root.add(normalized);
      actor.model = normalized;
      actor.dispose = () => hound.dispose();
      const head = hound.bones?.head;
      if (head && !actor.data.parentId) {
        const marker = new THREE.Mesh(markRim, rimMaterial);
        const center = new THREE.Mesh(markCenter, markMaterial);
        center.position.y = .0006;
        marker.add(center);
        marker.name = 'boss-overhead-marker';
        marker.position.set(HOUND_HEAD_MARK.x, HOUND_HEAD_MARK.y, HOUND_HEAD_MARK.z);
        marker.visible = false;
        head.add(marker);
        actor.weakMarker = marker;
      }
      const gun = hound.bones?.gun;
      const restPitch = gun?.rotation.x || 0;
      actor.pose = (dt, moving, windup, idle, aim) => {
        hound.rig.update(dt, { moving, sprint: false, crouch: idle, stomp: windup });
        if (!gun) return;
        const pitch = aim ? Math.atan2(aim.origin.y - aim.target.y,
          Math.hypot(aim.origin.x - aim.target.x, aim.origin.z - aim.target.z)) : restPitch;
        gun.rotation.x += (pitch - gun.rotation.x) * (1 - Math.exp(-dt * 16));
      };
    }

    function createActor(boss) {
      const root = new THREE.Group();
      root.name = 'portal-boss-' + boss.kind;
      root.visible = false;
      const ring = new THREE.Mesh(ringGeometry, red.clone());
      ring.visible = false;
      ring.scale.setScalar(STOMP_RADIUS[boss.kind]);
      ring.renderOrder = 7;
      const row = document.createElement('div');
      row.className = 'portal-boss-row';
      row.hidden = true;
      const label = document.createElement('span');
      const hp = document.createElement('span');
      const track = document.createElement('div');
      const fill = document.createElement('i');
      track.className = 'portal-boss-track';
      label.textContent = BOSS_NAMES[boss.kind][english ? 'en' : 'zh'] + (boss.parentId ? (english ? ' · Split' : '分身') : '');
      const status = document.createElement('small');
      status.className = 'portal-boss-status';
      status.hidden = !!boss.parentId;
      track.append(fill);
      row.append(label, hp, track, status);
      hud.append(row);
      scene.add(root, ring);
      const actor = { root, ring, row, hp, fill, track, status, retryAt: 0, gait: 0, data: null, height: 0, shrink: 0 };
      actors.set(boss.id, actor);
      return actor;
    }

    function snapshot(map, bosses, time, reward) {
      bounty = reward || null;
      receivedMap = map;
      serverClock = Date.now() - time;
      if (map !== currentMap() || !Array.isArray(bosses)) bosses = [];
      const ids = new Set(bosses.map(boss => boss.id));
      for (const [id, actor] of actors) {
        if (ids.has(id)) continue;
        scene.remove(actor.root, actor.ring);
        if (actor.neck) scene.remove(actor.neck);
        actor.ring.material.dispose();
        actor.row.remove();
        actor.dispose?.();
        actors.delete(id);
      }
      for (const data of bosses) {
        const boss = data.variant === 'watercolor' ? { ...data, kind: data.variant } : data;
        const actor = actors.get(boss.id) || createActor(boss);
        if (!actor.data || actor.data.id !== boss.id) {
          actor.root.position.set(boss.x, boss.y, boss.z);
          actor.root.rotation.y = boss.yaw;
          actor.height = targetHeight(boss);
          actor.shrink = 0;
        } else if (actor.data.phase === 'active' && boss.phase === 'idle') {
          actor.shrink = performance.now() + 440;
        } else if (boss.phase === 'active' && (actor.shrink ||
          (boss.kind === 'hound' && Math.hypot(boss.x - actor.data.x, boss.z - actor.data.z) > 3))) {
          actor.root.position.set(boss.x, boss.y, boss.z);
          actor.shrink = 0;
        }
        if (actor.exploding && boss.phase === 'idle') {
          actor.exploding = false;
          actor.shrink = 0;
          actor.height = targetHeight(boss);
          actor.root.position.set(boss.x, boss.y, boss.z);
        }
        actor.data = boss;
      }
    }

    function splitVisual(actor, progress, serverTime) {
      const boss = actor.data;
      const parent = actors.get(boss.parentId);
      const pos = splitPosition(boss, serverTime);
      const lift = (1 - progress) * 3;
      actor.root.position.set(pos.x, pos.y + lift, pos.z);
      const growing = .06 + progress * .94;
      actor.root.scale.set(actor.height * growing * (1 + .24 * Math.sin(Math.PI * progress)),
        actor.height * growing, actor.height * growing);
      if (!parent || progress <= 0 || progress >= .89) return;
      if (!actor.neck) {
        actor.neck = new THREE.Mesh(neckGeometry, neckMaterial);
        scene.add(actor.neck);
      }
      const head = parent.root.position;
      const y0 = head.y + parent.height * .34;
      const y1 = pos.y + lift + actor.height * growing * .38;
      neckAxis.set(pos.x - head.x, y1 - y0, pos.z - head.z);
      const length = neckAxis.length();
      const width = Math.max(.12, 2.4 * Math.sin(Math.PI * progress) * (1 - progress));
      actor.neck.position.set((head.x + pos.x) * .5, (y0 + y1) * .5, (head.z + pos.z) * .5);
      actor.neck.quaternion.setFromUnitVectors(up, neckAxis.normalize());
      actor.neck.scale.set(width, length * .52, width);
      actor.neck.visible = true;
    }

    function update(dt, now, online, drone = false) {
      const map = currentMap();
      const active = online && receivedMap === map && ['playing', 'dead'].includes(game.game.state);
      let showHud = false;
      const serverTime = Date.now() - serverClock;
      const splitting = new Map();
      for (const { data } of actors.values()) {
        if (data?.birth) splitting.set(data.parentId, splitStretch(data.birth, serverTime));
      }
      for (const actor of actors.values()) {
        const boss = actor.data;
        const visible = !!(active && boss && !actor.exploding);
        if (actor.neck) actor.neck.visible = false;
        if (actor.weakMarker) actor.weakMarker.visible = false;
        actor.root.visible = visible;
        actor.ring.visible = visible && !!boss.attack;
        const fighting = boss?.phase === 'active';
        const showRow = visible && (fighting || bounty) &&
          Math.hypot(game.player.pos.x - boss.x, game.player.pos.z - boss.z) <= (fighting ? 86 : 9);
        actor.hp.hidden = actor.track.hidden = !fighting;
        actor.row.hidden = !showRow;
        showHud ||= showRow;
        if (!visible) continue;
        loadActor(actor, boss.kind, now);
        const target = targetHeight(boss);
        if (actor.shrink && now >= actor.shrink) {
          actor.root.position.set(boss.x, boss.y, boss.z);
          actor.shrink = 0;
          actor.height = target;
        }
        const mix = 1 - Math.exp(-dt * 13);
        const pos = actor.root.position;
        if (!actor.shrink) {
          pos.x += (boss.x - pos.x) * mix;
          pos.y += (boss.y - pos.y) * mix;
          pos.z += (boss.z - pos.z) * mix;
          actor.root.rotation.y += Math.atan2(Math.sin(boss.yaw - actor.root.rotation.y),
            Math.cos(boss.yaw - actor.root.rotation.y)) * mix;
        }
        actor.height += (target - actor.height) * mix;
        const stretch = splitting.get(boss.id) || 0;
        actor.root.scale.set(actor.height * (1 + stretch), actor.height * (1 - stretch), actor.height * (1 + stretch));
        if (boss.birth) splitVisual(actor, splitProgress(boss.birth, serverTime), serverTime);
        let windup = 0;
        if (boss.attack) {
          const { x, y, z, at, radius } = boss.attack;
          actor.ring.scale.setScalar(radius || STOMP_RADIUS[boss.kind]);
          const remaining = at + serverClock - Date.now();
          windup = remaining < 140 ? Math.max(0, remaining / 140) : Math.min(1, (750 - remaining) / 350);
          actor.ring.position.set(x, y + .09, z);
          actor.ring.material.opacity = .58 + .32 * Math.cos(Math.max(0, remaining) * .022);
        }
        if (boss.aim && actor.lastWarning !== boss.aim.at) {
          actor.lastWarning = boss.aim.at;
          const remaining = boss.aim.at + boss.aim.windupMs + serverClock - Date.now();
          if (remaining > 100 && map !== 'lunar' && game.game.state === 'playing') {
            game.events?.emit?.('enemy:telegraph', {
              enemy: { id: boss.id }, type: boss.kind === 'hound' ? 'hound' : 'gull',
              time: remaining / 1000, pos: boss.aim.origin
            });
          }
        }
        actor.pose?.(dt, boss.moving, Math.max(0, windup), boss.phase === 'idle' && !boss.moving, boss.aim);
        if (actor.weakMarker && drone && fighting && game.game.state === 'playing') {
          // Use the smoothed head transform so the decal stays on the plate.
          actor.weakMarker.getWorldPosition(markWorld);
          actor.weakMarker.visible = seesWeakPoint(markWorld, game.player.eye || game.player.pos);
        }
        if (showRow && now >= lastHud) {
          actor.hp.textContent = boss.hp + ' / ' + boss.maxHp;
          if (!boss.parentId) {
            const money = window.SaltGoldRules?.format;
            const prize = !bounty || !money ? '' : bounty.pool <= 0
              ? (english ? 'Daily bounty exhausted' : '今日 Boss 奖励已发完')
              : (english ? `Pool ${money(bounty.pool)} · Today ${money(bounty.remaining)} left`
                : `奖池 ${money(bounty.pool)} 币 · 今日剩 ${money(bounty.remaining)} 币`);
            if (!Number.isInteger(boss.team)) {
              actor.status.textContent = prize;
            } else {
              const missing = boss.team < TEAM_SIZE;
              const info = missing ? (english ? `Team ${boss.team}/${TEAM_SIZE} · shield below 20%`
                : `参战 ${boss.team}/${TEAM_SIZE} · 保留 20% 血量`) : (english ? 'Team damage ×2' : '组队伤害 ×2');
              const seconds = Math.max(0, Math.ceil((boss.nextSplitMs - boss.elapsed) / 1000));
              const split = boss.nextSplitMs === null ? '' : (english ? ` · Split in ${seconds}s` : ` · ${seconds} 秒后分裂`);
              actor.status.textContent = [info + split, prize].filter(Boolean).join(' · ');
            }
          }
          actor.fill.style.transform = `scaleX(${boss.hp / boss.maxHp})`;
        }
      }
      if (now >= lastHud) lastHud = now + 150;
      hud.hidden = !showHud;
    }

    function intersect(origin, dir, range, drone = false) {
      if (receivedMap !== currentMap()) return null;
      let nearest = range;
      const now = Date.now() - serverClock;
      for (const { data, weakMarker, height } of actors.values()) {
        if (!data || (data.birth && splitProgress(data.birth, now) < 1)) continue;
        const body = rayDistance(data, origin, dir, nearest);
        const direct = drone && weakMarker?.visible && data.phase === 'active'
          ? weakRayDistance(weakMarker.getWorldPosition(markWorld), origin, dir, nearest, weakPointRadius(height))
          : null;
        const distance = direct ?? body;
        if (distance !== null) nearest = distance;
      }
      return nearest < range ? nearest : null;
    }

    function weakAim(origin, direction, range) {
      if (receivedMap !== currentMap()) return false;
      for (const { data, weakMarker, height, root } of actors.values()) {
        if (!root.visible || !weakMarker?.visible || data?.phase !== 'active') continue;
        const visibleRadius = height * .021;
        const distance = weakRayDistance(weakMarker.getWorldPosition(markWorld), origin, direction, range, visibleRadius);
        if (distance !== null && !game.physics.raycast(origin, direction, distance)) return true;
      }
      return false;
    }

    function exploded(id) {
      const actor = actors.get(id);
      if (actor) actor.exploding = true;
    }
    function droneBodies() {
      if (receivedMap !== currentMap() || game.game.state !== 'playing') return [];
      return [...actors.values()].flatMap(actor =>
        actor.root.visible && actor.model && !actor.exploding
          ? flightBoxes(actor.data.kind, actor.root.position, actor.root.rotation.y, actor.root.scale)
          : []
      );
    }
    return { snapshot, update, intersect, weakAim, exploded, droneBodies };
  }

  window.installPortalBosses = install;
})();
