(() => {
  'use strict';
  const { maps, near } = window.SaltExpeditionZones;

  window.installExpeditionPortals = function (game) {
    const { THREE, scene, physics, player, camera, viewCamera, renderer } = game;
    const gates = new Map();
    const loads = new Map();
    const actorCamera = camera.clone(false);
    const localCamera = camera.clone(false);
    localCamera.layers.set(0);
    const clearColor = new THREE.Color();
    const down = new THREE.Vector3(0, -1, 0);
    const ray = new THREE.Ray();
    const hit = new THREE.Vector3();
    let active = null;
    let environment = null;
    let lastRequest = -Infinity;
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    status.style.cssText = 'display:none;position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:12;padding:9px 16px;background:#101d27dc;color:#fff;font:600 14px sans-serif;pointer-events:none';
    document.body.append(status);

    function label(zh, en, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f3fbff';
      ctx.fillText(document.documentElement.lang === 'en-US' ? en : zh, 256, 68);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthWrite: false, color }));
      sprite.position.y = 1.85;
      sprite.scale.set(4.8, .9, 1);
      return sprite;
    }

    function portal(name, en, point, color) {
      const group = new THREE.Group();
      group.position.set(point.x, point.y + 1.45, point.z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.21, .09, 12, 56), new THREE.MeshBasicMaterial({ color }));
      ring.scale.y = 1.13;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 56), new THREE.MeshBasicMaterial({
        color, opacity: .38, transparent: true, side: THREE.DoubleSide, depthWrite: false
      }));
      disc.scale.y = 1.13;
      if (point.sideways) {
        ring.rotation.y = Math.PI / 2;
        disc.rotation.y = Math.PI / 2;
        ring.scale.y = 1.13;
      }
      group.add(ring, disc, label(name, en, color));
      group.visible = false;
      scene.add(group);
      return group;
    }

    for (const zone of Object.values(maps)) gates.set(zone.id, portal(zone.title, zone.id.toUpperCase(), zone.gate, zone.color));
    const exitGate = portal('返回港口', 'RETURN TO PORT', { x: 0, y: 0, z: 0 }, 0x87eeff);

    function load(zone) {
      if (!loads.has(zone.id)) {
        const promise = (zone.id === 'mothlight'
          ? new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/maps/mothlight-environment.js';
            script.onload = () => resolve(window.createMothlightEnvironment());
            script.onerror = () => { script.remove(); reject(new Error('Mothlight load failed')); };
            document.head.append(script);
          })
          : import('/maps/' + zone.id + '-environment.mjs').then(module => module.createEnvironment()))
          .catch(error => { loads.delete(zone.id); throw error; });
        loads.set(zone.id, promise);
      }
      return loads.get(zone.id);
    }

    function land(point, yaw) {
      player.pos.set(point.x, point.y, point.z);
      player.lastSafe.copy(player.pos);
      player.vel.set(0, 0, 0);
      player.onGround = true;
      player.yaw = yaw;
      player.pitch = 0;
      player.syncView();
      status.style.display = 'none';
      lastRequest = game.time.t;
    }

    function leave(position) {
      if (!active) return;
      const target = position || active.port;
      active = null;
      environment = null;
      exitGate.visible = false;
      land(target, -Math.PI / 2);
    }

    function ground(x, z, maxY = 240) {
      const localZ = z - active.offset;
      let floor = environment.heightAt(x, localZ);
      if (floor > maxY) floor = -75;
      for (const box of environment.boxes(x, localZ, x, localZ)) {
        if (x >= box[0] && x <= box[3] && localZ >= box[2] && localZ <= box[5] && box[4] <= maxY) floor = Math.max(floor, box[4]);
      }
      return floor;
    }

    const baseRay = physics.raycast.bind(physics);
    const baseGround = physics.groundHeight.bind(physics);
    const baseMove = physics.moveCapsule.bind(physics);
    const box3 = new THREE.Box3();
    const terrainRay = new THREE.Raycaster();
    const terrainHits = [];
    let terrainMesh = null;

    function mapRay(origin, direction, range = 500) {
      const z = origin.z - active.offset;
      ray.origin.set(origin.x, origin.y, z);
      ray.direction.copy(direction);
      let result = null;
      let best = range;
      for (const box of environment.boxes(origin.x, z, origin.x + direction.x * range, z + direction.z * range)) {
        box3.min.set(box[0], box[1], box[2]);
        box3.max.set(box[3], box[4], box[5]);
        if (box3.isEmpty() || !ray.intersectBox(box3, hit)) continue;
        const dist = ray.origin.distanceTo(hit);
        if (dist < .001 || dist >= best) continue;
        best = dist;
        const normal = new THREE.Vector3();
        if (Math.abs(hit.x - box[0]) < .001) normal.x = -1;
        else if (Math.abs(hit.x - box[3]) < .001) normal.x = 1;
        else if (Math.abs(hit.y - box[1]) < .001) normal.y = -1;
        else if (Math.abs(hit.y - box[4]) < .001) normal.y = 1;
        else normal.z = Math.abs(hit.z - box[2]) < .001 ? -1 : 1;
        result = { dist, point: new THREE.Vector3(hit.x, hit.y, hit.z + active.offset), normal, surface: 'concrete', box: null };
      }
      if (terrainMesh && direction.y < 0) {
        terrainHits.length = 0;
        terrainRay.set(ray.origin, direction);
        terrainRay.far = best;
        terrainMesh.raycast(terrainRay, terrainHits);
        for (const entry of terrainHits) {
          if (entry.distance >= best) continue;
          best = entry.distance;
          entry.point.z += active.offset;
          result = { dist: best, point: entry.point, normal: entry.face.normal, surface: 'dirt', box: null };
        }
      } else if (direction.y < -.0001) {
        const floor = environment.heightAt(origin.x, z);
        const dist = (floor - origin.y) / direction.y;
        if (dist > .001 && dist < best) result = {
          dist, point: origin.clone().addScaledVector(direction, dist), normal: down.clone().negate(), surface: 'concrete', box: null
        };
      }
      return result;
    }

    physics.raycast = (...args) => active ? mapRay(...args) : baseRay(...args);
    physics.groundHeight = (...args) => active ? ground(...args) : baseGround(...args);
    physics.moveCapsule = (pos, vel, dt, radius = .32, height = 1.8, grounded = true) => {
      if (!active) return baseMove(pos, vel, dt, radius, height, grounded);
      const state = { onGround: false, hitWall: false, hitCeil: false, surface: 'concrete' };
      const step = grounded ? .45 : .08;
      for (const axis of ['x', 'z']) {
        const next = pos.clone();
        next[axis] += vel[axis] * dt;
        const min = axis === 'x' ? active.minX : active.minZ;
        const max = axis === 'x' ? active.maxX : active.maxZ;
        next[axis] = THREE.MathUtils.clamp(next[axis], min + radius, max - radius);
        const localZ = next.z - active.offset;
        const blocked = environment.boxes(next.x - radius, localZ - radius, next.x + radius, localZ + radius)
          .some(box => next.x + radius > box[0] && next.x - radius < box[3] &&
            localZ + radius > box[2] && localZ - radius < box[5] &&
            pos.y + height > box[1] && pos.y + step < box[4]);
        if (blocked || environment.heightAt(next.x, localZ) > pos.y + step) {
          vel[axis] = 0;
          state.hitWall = true;
        } else pos[axis] = next[axis];
      }
      let y = pos.y + vel.y * dt;
      if (vel.y <= 0) {
        const floor = ground(pos.x, pos.z, pos.y + step);
        if (y <= floor + .002 || (grounded && y - floor <= step)) {
          y = floor;
          vel.y = 0;
          state.onGround = true;
        }
      } else {
        const origin = pos.clone();
        origin.y += height;
        const ceiling = mapRay(origin, down.clone().negate(), vel.y * dt);
        if (ceiling) {
          y = pos.y + Math.max(0, ceiling.dist - .02);
          vel.y = 0;
          state.hitCeil = true;
        }
      }
      pos.y = y;
      return state;
    };

    function enter(zone, world, position) {
      active = zone;
      environment = world;
      for (const gate of gates.values()) gate.visible = false;
      const qingyunGate = scene.getObjectByName('qingyun-time-tunnel');
      if (qingyunGate) qingyunGate.visible = false;
      terrainMesh = world.terrain ? new THREE.Mesh(world.terrain) : null;
      const exitY = ground(zone.exit.x, zone.exit.z, zone.landing.y + 3);
      exitGate.position.set(zone.exit.x, exitY + 1.45, zone.exit.z);
      land({ ...position, y: ground(position.x, position.z, zone.landing.y + 2) }, Math.PI);
    }

    let pending = null;
    game.events.on('game:state', event => {
      if (event.state === 'title' || event.state === 'intro') {
        active = environment = pending = null;
        exitGate.visible = false;
        status.style.display = 'none';
      }
    });

    game.expedition = {
      get active() { return active; },
      spawn() { return active && { ...active.landing, y: ground(active.landing.x, active.landing.z, active.landing.y + 2) }; },
      leave,
      moveDrone(previous, candidate) {
        const next = new THREE.Vector3(
          THREE.MathUtils.clamp(candidate.x, active.minX + .4, active.maxX - .4),
          candidate.y,
          THREE.MathUtils.clamp(candidate.z, active.minZ + .4, active.maxZ - .4)
        );
        if (!previous) return next;
        const direction = next.clone().sub(previous);
        const distance = direction.length();
        if (distance < .001) return next;
        direction.divideScalar(distance);
        const origin = new THREE.Vector3(previous.x, previous.y + .42, previous.z);
        const obstruction = mapRay(origin, direction, distance + .42);
        return obstruction ? next.copy(previous).addScaledVector(direction, Math.max(0, obstruction.dist - .42)) : next;
      },
      acknowledge(message) {
        if (message.type === 'mapReturned') { leave(message.pos); return; }
        if (pending?.zone.id === message.map && pending.world && game.game.state === 'playing' && player.alive) enter(pending.zone, pending.world, message.pos);
        pending = null;
      },
      update(dt) {
        const playing = game.game.state === 'playing' && player.alive;
        const canUse = playing && !window.__saltBoat?.riding && !game.qingyun?.active;
        for (const [id, gate] of gates) {
          gate.visible = playing && !active && !game.qingyun?.active;
          gate.children[1].material.opacity = .29 + .12 * Math.sin(game.time.t * 5 + id.length);
        }
        exitGate.visible = !!active;
        if (!canUse || game.time.t - lastRequest < 1.2) return;
        const mp = window.__mp;
        if (active) {
          if (!near(player.pos, { ...active.exit, y: exitGate.position.y - 1.45 })) return;
          lastRequest = game.time.t;
          if (mp?.connected) { mp.syncState(); mp.send({ type: 'mapReturn' }); }
          else leave();
          return;
        }
        const zone = Object.values(maps).find(item => near(player.pos, item.gate));
        if (!zone) { status.style.display = 'none'; return; }
        if (pending?.zone === zone && !pending.world) return;
        if (pending?.zone === zone) {
          lastRequest = game.time.t;
          if (mp?.connected) { mp.syncState(); mp.send({ type: 'mapEnter', map: zone.id }); }
          else { enter(zone, pending.world, zone.landing); pending = null; }
          return;
        }
        const attempt = pending = { zone };
        status.textContent = document.documentElement.lang === 'en-US' ? 'Loading ' + zone.id + '…' : '正在加载' + zone.title + '…';
        status.style.display = 'block';
        load(zone).then(world => { if (pending === attempt) attempt.world = world; }).catch(error => {
          if (pending !== attempt) return;
          pending = null;
          lastRequest = game.time.t;
          status.textContent = document.documentElement.lang === 'en-US' ? 'Map load failed. Retrying…' : '地图加载失败，正在重试…';
          console.error('[expedition]', error);
        });
      },
      render(dt, time) {
        if (!active) return false;
        const hidden = [game.render.sky, game.level.root, game.backdrop.root, game.ground.root,
          scene.getObjectByName('saltline-external-combat-zone'), scene.getObjectByName('saltline-boat-wake')].filter(object => object?.visible);
        for (const object of hidden) object.visible = false;
        const alpha = renderer.getClearAlpha();
        renderer.getClearColor(clearColor);
        const auto = renderer.autoClear;
        const shadows = renderer.shadowMap.enabled;
        const fog = scene.fog;
        const background = scene.background;
        try {
          localCamera.position.copy(camera.position);
          localCamera.position.z -= active.offset;
          localCamera.quaternion.copy(camera.quaternion);
          localCamera.aspect = camera.aspect;
          localCamera.fov = camera.fov;
          localCamera.far = Math.max(camera.far, 4600);
          localCamera.updateProjectionMatrix();
          localCamera.updateMatrixWorld(true);
          environment.update(localCamera, dt, time);
          renderer.setRenderTarget(null);
          renderer.shadowMap.enabled = false;
          renderer.autoClear = true;
          renderer.setClearColor(environment.color, 1);
          renderer.render(environment.scene, localCamera);
          renderer.setRenderTarget(null);
          scene.fog = null;
          scene.background = null;
          renderer.autoClear = false;
          actorCamera.position.copy(camera.position);
          actorCamera.quaternion.copy(camera.quaternion);
          actorCamera.projectionMatrix.copy(localCamera.projectionMatrix);
          actorCamera.projectionMatrixInverse.copy(localCamera.projectionMatrixInverse);
          actorCamera.updateMatrixWorld(true);
          renderer.render(scene, actorCamera);
          renderer.clearDepth();
          camera.updateMatrixWorld(true);
          viewCamera.matrixAutoUpdate = false;
          viewCamera.matrixWorldAutoUpdate = false;
          viewCamera.matrixWorld.copy(camera.matrixWorld);
          viewCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);
          renderer.render(scene, viewCamera);
        } finally {
          scene.fog = fog;
          scene.background = background;
          renderer.autoClear = auto;
          renderer.shadowMap.enabled = shadows;
          renderer.setClearColor(clearColor, alpha);
          renderer.setRenderTarget(null);
          for (const object of hidden) object.visible = true;
        }
        return true;
      }
    };
  };
})();
