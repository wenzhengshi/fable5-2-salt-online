(() => {
  'use strict';
  const { maps, near, pickRespawn } = window.SaltExpeditionZones;
  const messages = (window.__SALT_I18N__ || {}).messages || {};

  function t(key, vars) {
    const value = String(key || '').split('.').reduce((acc, part) => (
      acc && typeof acc === 'object' ? acc[part] : undefined
    ), messages);
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  window.installExpeditionPortals = function (game) {
    const { THREE, scene, physics, player, camera, viewCamera, renderer } = game;
    const gates = new Map();
    const loads = new Map();
    const actorCamera = camera.clone(false);
    const localCamera = camera.clone(false);
    localCamera.layers.set(0);
    const clearColor = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const zones = Object.values(maps);
    const next = new THREE.Vector3();
    const ceilingOrigin = new THREE.Vector3();
    const ray = new THREE.Ray();
    const hit = new THREE.Vector3();
    let active = null;
    let environment = null;
    let lastLocalRespawn = null;
    let lastRequest = -Infinity;
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    status.style.cssText = 'display:none;position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:12;padding:9px 16px;background:#101d27dc;color:#fff;font:600 14px sans-serif;pointer-events:none';
    document.body.append(status);

    function portal(nameKey, point, color) {
      const group = game.qingyun.createTunnel(t(nameKey), color);
      group.position.set(point.x, point.y + 1.45, point.z);
      group.visible = false;
      scene.add(group);
      return group;
    }

    for (const zone of zones) gates.set(zone.id, portal(zone.titleKey, zone.gate, zone.color));
    const exitPoint = {};
    const exitGate = portal('expedition.returnToQingyun', { x: 0, y: 0, z: 0 }, 0x87eeff);

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
          : import('/maps/' + zone.id + '-environment.mjs?v=2').then(module => module.createEnvironment()))
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
      const target = position || active.hub;
      active = null;
      environment = null;
      exitGate.visible = false;
      game.qingyun.land(target);
      status.style.display = 'none';
      lastRequest = game.time.t;
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
    let castTerrain = null;

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
      if (castTerrain && direction.y < 0) {
        const terrain = castTerrain(ray, best);
        if (terrain) {
          terrain.point.z += active.offset;
          result = terrain;
        }
      } else if (direction.y < -.0001) {
        const floor = environment.heightAt(origin.x, z);
        const dist = (floor - origin.y) / direction.y;
        if (dist > .001 && dist < best) result = {
          dist, point: origin.clone().addScaledVector(direction, dist), normal: up.clone(), surface: 'concrete', box: null
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
        next.copy(pos);
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
        ceilingOrigin.copy(pos);
        ceilingOrigin.y += height;
        const ceiling = mapRay(ceilingOrigin, up, vel.y * dt);
        if (ceiling) {
          y = pos.y + Math.max(0, ceiling.dist - .02);
          vel.y = 0;
          state.hitCeil = true;
        }
      }
      pos.y = y;
      return state;
    };

    let portRoots = [];
    function enter(zone, world, position) {
      portRoots = [game.render.sky, game.level.root, game.backdrop.root, game.ground.root,
        scene.getObjectByName('saltline-external-combat-zone'), scene.getObjectByName('saltline-boat-wake')];
      game.qingyun.suspend();
      active = zone;
      environment = world;
      for (const gate of gates.values()) gate.visible = false;
      const qingyunGate = scene.getObjectByName('qingyun-time-tunnel');
      if (qingyunGate) qingyunGate.visible = false;
      castTerrain = world.terrain ? window.SaltTerrainRay(THREE, world.terrain) : null;
      exitPoint.x = zone.exit.x;
      exitPoint.z = zone.exit.z;
      const exitY = ground(zone.exit.x, zone.exit.z, zone.landing.y + 3);
      exitPoint.y = exitY;
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
      spawn(point) {
        if (!active) return null;
        if (!point) {
          point = pickRespawn(active, lastLocalRespawn);
          lastLocalRespawn = point;
        }
        return { ...point, y: ground(point.x, point.z, point.y + 2) };
      },
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
        const inHub = !!game.qingyun?.active;
        const canUse = playing && !window.__saltBoat?.riding && (inHub || active);
        for (const gate of gates.values()) {
          gate.visible = playing && !active && inHub;
          if (gate.visible) gate.children[1].material.uniforms.time.value = game.time.t;
        }
        exitGate.visible = !!active;
        if (active) exitGate.children[1].material.uniforms.time.value = game.time.t;
        if (!canUse || game.time.t - lastRequest < 1.2) return;
        const mp = window.__mp;
        if (active) {
          if (!near(player.pos, exitPoint)) return;
          lastRequest = game.time.t;
          if (mp?.connected) { mp.syncState(); mp.send({ type: 'mapReturn' }); }
          else leave();
          return;
        }
        const zone = zones.find(item => near(player.pos, item.gate));
        if (!zone) { status.style.display = 'none'; return; }
        if (pending?.zone === zone && !pending.world) return;
        if (pending?.zone === zone) {
          lastRequest = game.time.t;
          if (mp?.connected) { mp.syncState(); mp.send({ type: 'mapEnter', map: zone.id }); }
          else { enter(zone, pending.world, zone.landing); pending = null; }
          return;
        }
        const attempt = pending = { zone };
        status.textContent = t('expedition.loading', { map: t(zone.titleKey) });
        status.style.display = 'block';
        load(zone).then(world => { if (pending === attempt) attempt.world = world; }).catch(error => {
          if (pending !== attempt) return;
          pending = null;
          lastRequest = game.time.t;
          status.textContent = t('expedition.loadFailed');
          console.error('[expedition]', error);
        });
      },
      render(dt) {
        if (!active) return false;
        const hidden = portRoots.filter(object => object?.visible);
        for (const object of hidden) object.visible = false;
        const alpha = renderer.getClearAlpha();
        renderer.getClearColor(clearColor);
        renderer.info.reset();
        const auto = renderer.autoClear;
        const shadows = renderer.shadowMap.enabled;
        const fog = scene.fog;
        const background = scene.background;
        const matrices = scene.matrixWorldAutoUpdate;
        try {
          localCamera.position.copy(camera.position);
          localCamera.position.z -= active.offset;
          localCamera.quaternion.copy(camera.quaternion);
          localCamera.aspect = camera.aspect;
          localCamera.fov = camera.fov;
          localCamera.far = Math.max(camera.far, 4600);
          localCamera.updateProjectionMatrix();
          localCamera.updateMatrixWorld(true);
          environment.update(localCamera, dt, game.time.t);
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
          scene.updateMatrixWorld();
          scene.matrixWorldAutoUpdate = false;
          renderer.render(scene, actorCamera);
          renderer.clearDepth();
          camera.updateMatrixWorld(true);
          viewCamera.matrixAutoUpdate = false;
          viewCamera.matrixWorldAutoUpdate = false;
          viewCamera.matrixWorld.copy(camera.matrixWorld);
          viewCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);
          renderer.render(scene, viewCamera);
        } finally {
          scene.matrixWorldAutoUpdate = matrices;
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
