(() => {
  'use strict';
  const { maps, near, pickRespawn } = window.SaltExpeditionZones;
  const liftRules = window.SaltBayhavenLift;
  const arrival = window.SaltPortalArrival;
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
    const hold = arrival.holdPrompt();
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
    let bayhavenLift = null;
    let liftJumpVelocity = 0;
    let serverClock = null;
    let lastLocalRespawn = null;
    let returning = null;
    let lastRequest = -Infinity;
    const status = document.createElement('div');
    status.id = 'expedition-portal-status';
    status.setAttribute('role', 'status');
    status.style.cssText = 'display:none;position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:12;padding:9px 16px;background:#101d27dc;color:#fff;font:600 14px sans-serif;pointer-events:none';
    document.body.append(status);

    function portal(nameKey, point, color) {
      const group = game.qingyun.createTunnel(t(nameKey), color);
      group.position.set(point.x, point.y + .06, point.z);
      group.visible = false;
      scene.add(group);
      return group;
    }

    for (const zone of zones) gates.set(zone.id, portal(zone.titleKey, zone.gate, zone.color));
    const exitPoint = {};
    const exitGate = portal('expedition.returnToQingyun', { x: 0, y: 0, z: 0 }, 0x87eeff);
    exitGate.name = 'expedition-return-tunnel';
    const raceGate = game.qingyun.createTunnel(t('deployment.racePortal'), 0x56e5ff, true, .82);
    raceGate.position.set(0, 0, 0);
    raceGate.visible = false;
    scene.add(raceGate);
    raceGate.name = 'saltport-race-tunnel';
    let raceArea = '', racePoint, raceAttempted = false;


    function load(zone) {
      if (!loads.has(zone.id)) {
        const promise = (zone.id === 'mothlight'
          ? new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/maps/mothlight-environment.js?v=3';
            script.onload = () => resolve(window.createMothlightEnvironment());
            script.onerror = () => { script.remove(); reject(new Error('Mothlight load failed')); };
            document.head.append(script);
          })
          : import('/maps/' + zone.id + '-environment.mjs?v=3').then(module => module.createEnvironment()))
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

    function updateLunarMode() {
      const lunar = active?.id === 'lunar';
      if (lunar === !!window.__saltLunarSilent) return;
      window.__saltLunarSilent = lunar;
      game.audio?.setLunarSilence?.();
      document.documentElement.classList.toggle('lunar-silent', lunar);
      window.dispatchEvent(new Event('saltline:lunar-mode'));
    }

    function leave(position, animate = false) {
      if (!active) return;
      const target = position || active.hub;
      returning = null;
      game.frontier?.leave();
      active = null;
      environment = null;
      updateLunarMode();
      exitGate.visible = false;
      game.qingyun.land(target, animate);
      hold(null);
      status.style.display = 'none';
      lastRequest = game.time.t;
    }

    function collisionBoxes(x1, z1, x2, z2) {
      const world = environment.boxes(x1, z1, x2, z2);
      const extra = game.containers?.boxes(x1, z1, x2, z2);
      const tower = active.id === 'bayhaven' && bayhavenLift.boxes(x1, z1, x2, z2);
      return tower?.length || extra?.length ? [...world, ...(tower || []), ...(extra || [])] : world;
    }

    function liftTime() {
      return serverClock === null ? Date.now() : performance.now() + serverClock;
    }

    function syncLift() {
      liftJumpVelocity = 0;
      if (active?.id !== 'bayhaven') return;
      const now = liftTime();
      const previous = bayhavenLift.top;
      const top = bayhavenLift.setTime(now);
      const kind = window.__mp?.soldier;
      if (!player.alive || !player.enabled || !['playing', 'paused'].includes(game.game.state) ||
          kind === 'drone' || game.sedan?.riding || window.__saltBoat?.riding) return;
      const y = liftRules.carryHeight(player.pos, active.offset, previous, top, player.vel.y, player.onGround);
      if (y === null) return;
      player.pos.y = y;
      player.vel.y = 0;
      player.onGround = true;
      liftJumpVelocity = liftRules.velocityAt(now);
      if (game.game.state === 'paused') player.syncView();
    }

    game.events.on('player:jump', () => {
      // The player controller supplies the jump impulse relative to the deck.
      if (active?.id === 'bayhaven') player.vel.y += liftJumpVelocity;
      liftJumpVelocity = 0;
    });

    function ground(x, z, maxY = 240) {
      const localZ = z - active.offset;
      let floor = environment.heightAt(x, localZ);
      if (floor > maxY) floor = -75;
      for (const box of collisionBoxes(x, localZ, x, localZ)) {
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
      for (const box of collisionBoxes(origin.x, z, origin.x + direction.x * range, z + direction.z * range)) {
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
      if (castTerrain && (direction.y < 0 || active.id === 'lunar')) {
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
        const blocked = collisionBoxes(next.x - radius, localZ - radius, next.x + radius, localZ + radius)
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

    const nav = physics.nav;
    const baseWalkable = nav.isWalkable.bind(nav);
    const baseRandomPoint = nav.randomPoint.bind(nav);
    const basePath = nav.findPath.bind(nav);
    function walkable(x, z) {
      if (x < active.minX + .5 || x > active.maxX - .5 ||
          z < active.minZ + .5 || z > active.maxZ - .5) return false;
      const localZ = z - active.offset;
      const y = environment.heightAt(x, localZ);
      return (active.id === 'lunar' || y > -.75) && !environment.boxes(x - .45, localZ - .45, x + .45, localZ + .45)
        .some(box => box[4] > y + .35 && box[1] < y + 1.15 &&
          box[0] < x + .45 && box[3] > x - .45 && box[2] < localZ + .45 && box[5] > localZ - .45);
    }
    nav.isWalkable = (x, z) => active ? walkable(x, z) : baseWalkable(x, z);
    nav.randomPoint = (origin, radius) => {
      if (!active) return baseRandomPoint(origin, radius);
      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = radius * Math.sqrt(Math.random());
        const x = origin.x + Math.cos(angle) * distance;
        const z = origin.z + Math.sin(angle) * distance;
        if (walkable(x, z)) return new THREE.Vector3(x, environment.heightAt(x, z - active.offset), z);
      }
      return origin.clone();
    };
    function clearPath(from, to) {
      const steps = Math.ceil(Math.hypot(from.x - to.x, from.z - to.z));
      let lastY = from.y;
      for (let i = 1; i <= steps; i++) {
        const x = THREE.MathUtils.lerp(from.x, to.x, i / steps);
        const z = THREE.MathUtils.lerp(from.z, to.z, i / steps);
        if (!walkable(x, z)) return false;
        const y = environment.heightAt(x, z - active.offset);
        if (Math.abs(y - lastY) > .65) return false;
        lastY = y;
      }
      return true;
    }
    nav.findPath = (from, to) => {
      if (!active) return basePath(from, to);
      if (!walkable(to.x, to.z) || from.distanceToSquared(to) > 65 ** 2) return null;
      const destination = to.clone();
      destination.y = environment.heightAt(to.x, to.z - active.offset);
      if (clearPath(from, destination)) return [destination];
      for (let attempt = 0; attempt < 6; attempt++) {
        const waypoint = nav.randomPoint(from, 8);
        if (waypoint.distanceToSquared(from) > 1 && clearPath(from, waypoint) && clearPath(waypoint, destination)) {
          return [waypoint, destination];
        }
      }
      return null;
    };

    let portRoots = [];
    function enter(zone, world, position, insert = true) {
      portRoots = [game.render.sky, game.level.root, game.backdrop.root, game.ground.root,
        scene.getObjectByName('saltline-external-combat-zone'), scene.getObjectByName('saltline-boat-wake')];
      game.qingyun.suspend();
      active = zone;
      environment = world;
      if (zone.id === 'bayhaven') {
        bayhavenLift ||= liftRules.mount(THREE, world.scene);
        bayhavenLift.setTime(liftTime());
      }
      updateLunarMode();
      for (const gate of gates.values()) gate.visible = false;
      const qingyunGate = scene.getObjectByName('qingyun-time-tunnel');
      if (qingyunGate) qingyunGate.visible = false;
      castTerrain = world.terrain ? window.SaltTerrainRay(THREE, world.terrain) : null;
      exitPoint.x = zone.exit.x;
      exitPoint.z = zone.exit.z;
      const exitY = ground(zone.exit.x, zone.exit.z, zone.landing.y + 3);
      exitPoint.y = exitY;
      const exitClearance = zone.id === 'dustfall' ? .06 : 1.45;
      exitGate.position.set(zone.exit.x, exitY + exitClearance, zone.exit.z);
      const point = { ...position, y: ground(position.x, position.z, zone.landing.y + 2) };
      land(point, Math.PI);
      hold(null);
      if (zone.id === 'dustfall') game.frontier?.begin(world, point, false);
      if (insert) game.portalArrival?.start();
    }

    let pending = null;
    game.events.on('game:state', event => {
      if (event.state !== 'playing') hold(null);
      if (event.state === 'title' || event.state === 'intro') {
        game.frontier?.leave();
        active = environment = pending = returning = null;
        updateLunarMode();
        exitGate.visible = false;
        status.style.display = 'none';
      }
    });

    game.expedition = {
      get active() { return active; },
      get coastalShelter() { return active?.id === 'bayhaven' && liftRules.shelter(player.pos, active.offset); },
      setServerTime(time) {
        if (!Number.isFinite(time)) return;
        const estimate = time - performance.now();
        serverClock = serverClock === null ? estimate : serverClock + Math.max(-10, Math.min(10, estimate - serverClock)) * .2;
      },
      syncLift,
      onFixedGround(point) {
        if (active?.id !== 'bayhaven') return true;
        const z = point.z - active.offset;
        return !liftRules.overlaps(point.x, z) || point.y < liftRules.BASE - .09 ||
          liftRules.floorFor(point.x, point.y, z, .10) !== null;
      },
      waterLevelAt(x, z) {
        return environment?.waterLevelAt?.(x, z - active.offset) ?? null;
      },
      terrainHeight(x, z) {
        if (!active) return null;
        const height = Number(environment.heightAt(x, z - active.offset));
        return Number.isFinite(height) ? height : null;
      },
      containerGround(x, z, yaw) {
        if (!active) return null;
        const dx = yaw % 2 === 0 ? 3.4 : 1.55;
        const dz = yaw % 2 === 0 ? 1.55 : 3.4;
        const localZ = z - active.offset;
        const onTower = active.id === 'bayhaven' && liftRules.overlaps(x, localZ, dx, dz);
        const y = onTower
          ? liftRules.floorFor(x, player.pos.y, localZ, dx, dz, 1.2)
          : environment.heightAt(x, localZ);
        if (y === null) return null;
        if (!Number.isFinite(y) || Math.abs(y - player.pos.y) > 1.2) return null;
        for (const a of [-dx, 0, dx]) for (const b of [-dz, 0, dz]) {
          if (!onTower && Math.abs(environment.heightAt(x + a, localZ + b) - y) > .23) return null;
        }
        if (environment.boxes(x - dx, localZ - dz, x + dx, localZ + dz).some(box =>
          box[3] > x - dx && box[0] < x + dx && box[5] > localZ - dz && box[2] < localZ + dz &&
          box[4] > y + .18 && box[1] < y + 2.85)) return null;
        return y;
      },
      async prepareEntry(mapId) {
        const zone = maps[mapId];
        const world = await load(zone);
        return (position, insert = true) => enter(zone, world, position, insert);
      },
      async restore(mapId, position, current) {
        const zone = zones.find(candidate => candidate.id === mapId);
        if (!zone) return false;
        pending = null;
        if (active?.id === mapId) return true;
        const world = await load(zone);
        if (!current() || !world) return false;
        enter(zone, world, position, false);
        return true;
      },
      spawn(point) {
        if (!active) return null;
        if (!point) {
          point = pickRespawn(active, lastLocalRespawn);
          lastLocalRespawn = point;
        }
        return { ...point, y: ground(point.x, point.z, point.y + 2) };
      },
      leave,
      moveDrone(previous, candidate, bodies, options) {
        const next = new THREE.Vector3(
          THREE.MathUtils.clamp(candidate.x, active.minX + .4, active.maxX - .4),
          candidate.y,
          THREE.MathUtils.clamp(candidate.z, active.minZ + .4, active.maxZ - .4)
        );
        const from = previous || next;
        const offset = active.offset;
        const radius = options.radius + .25;
        const walls = collisionBoxes(Math.min(from.x, next.x) - radius, Math.min(from.z, next.z) - radius - offset,
          Math.max(from.x, next.x) + radius, Math.max(from.z, next.z) + radius - offset).map(box => ({
          min: { x: box[0], y: box[1], z: box[2] + offset },
          max: { x: box[3], y: box[4], z: box[5] + offset }
        }));
        const safe = window.SaltFlightCollision.sweep(next, walls.concat(bodies), { ...options, previous });
        return next.copy(safe);
      },
      acknowledge(message) {
        if (message.type === 'mapDenied') {
          pending = null;
          status.textContent = window.SaltShop?.locked() || t('expedition.loadFailed');
          status.style.display = 'block';
          return;
        }
        if (message.type === 'mapReturned') { leave(message.pos, !!returning?.sentAt); return; }
        if (pending?.zone.id === message.map && pending.world && ['playing', 'paused'].includes(game.game.state) && player.alive) {
          enter(pending.zone, pending.world, message.pos);
        }
        pending = null;
      },
      update(dt) {
        const playing = game.game.state === 'playing' && player.alive;
        const inHub = !!game.qingyun?.active;
        const canUse = playing && !window.__saltBoat?.riding && !game.sedan?.riding && !game.portalArrival?.active;
        const area = active?.id || (inHub ? 'qingyun' : 'port');
        if (playing && raceArea !== area) {
          raceArea = area;
          const point = window.SaltSedanRules.raceGate(area);
          point.y = active ? ground(point.x,point.z,point.y+3)
            : area === 'port' ? window.SaltQingyunZone.gate.y
              : physics.groundHeight(point.x,point.z,point.y+3);
          racePoint = point;
          raceGate.position.set(point.x, area === 'port' ? point.y : point.y+.06, point.z);
          raceAttempted = false;
        }
        raceGate.visible = playing;
        if (playing) raceGate.children[1].material.uniforms.time.value = game.time.t;
        for (const gate of gates.values()) {
          gate.visible = playing && !active && inHub;
          if (gate.visible) gate.children[1].material.uniforms.time.value = game.time.t;
        }
        exitGate.visible = !!active;
        if (active) exitGate.children[1].material.uniforms.time.value = game.time.t;
        if (!canUse) { hold(null); return; }
        if (game.time.t - lastRequest < 1.2) return;
        const mp = window.__mp;
        const standing = arrival.still(game);
        if (near(player.pos,racePoint)) {
          if (!raceAttempted && hold('race',game.time.t,standing)) {
            raceAttempted = true;
            hold(null);
            window.SaltMapShell.openRace('plaza').catch(() => {
              status.textContent = t('expedition.loadFailed');
              status.style.display = 'block';
            });
          }
          return;
        }
        raceAttempted = false;
        if (!inHub && !active) { hold(null); return; }

        if (active) {
          if (!hold(near(player.pos, exitPoint) ? 'exit' : null, game.time.t, standing) && !returning?.sentAt) {
            returning = null;
            status.style.display = 'none';
            return;
          }
          const now = performance.now();
          if (!returning) {
            returning = { since: now, loading: false, sentAt: 0 };
            status.textContent = t('expedition.loading', { map: t('deployment.qingyun') });
            status.style.display = 'block';
            return;
          }
          const attempt = returning;
          if (attempt.sentAt) {
            if (now - attempt.sentAt >= 4500) {
              returning = null;
              lastRequest = game.time.t;
              status.textContent = t('expedition.loadFailed');
            }
            return;
          }
          // Paint the notice before starting resource work, including on a cached return.
          if (now - attempt.since < 120) return;
          if (!game.qingyun.collision) {
            if (!attempt.loading) {
              attempt.loading = true;
              game.qingyun.preload({ warmup: false }).catch(error => {
                if (returning !== attempt) return;
                returning = null;
                lastRequest = game.time.t;
                status.textContent = t('expedition.loadFailed');
                console.warn('[expedition] Qingyun return load failed', error);
              });
            }
            return;
          }
          if (mp?.connected) {
            mp.syncState();
            if (mp.send({ type: 'mapReturn' })) attempt.sentAt = now;
            else {
              returning = null;
              lastRequest = game.time.t;
              status.textContent = t('expedition.loadFailed');
            }
          } else leave(undefined, true);
          return;
        }
        const zone = zones.find(item => near(player.pos, item.gate));
        if (!hold(zone?.id, game.time.t, standing) && !pending?.sentAt) {
          pending = null;
          status.style.display = 'none';
          return;
        }
        if (!zone) return;
        if (pending?.sentAt) {
          if (performance.now() - pending.sentAt < 4500) return;
          pending = null;
        }
        if (zone.id === 'lunar' && (!mp?.connected || !window.SaltShop?.has(window.SaltShop.pass))) {
          pending = null;
          status.textContent = window.SaltShop?.locked() || t('expedition.loadFailed');
          status.style.display = 'block';
          return;
        }
        if (pending?.zone === zone && !pending.world) return;
        if (pending?.zone === zone) {
          lastRequest = game.time.t;
          if (mp?.connected) {
            mp.syncState();
            if (mp.send({ type: 'mapEnter', map: zone.id })) pending.sentAt = performance.now();
          }
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
          // Hidden port scenery is not drawn on this map. Avoid walking that entire subtree.
          scene.updateWorldMatrix(false, false);
          for (const root of scene.children) if (root.visible) root.updateMatrixWorld(true);
          scene.matrixWorldAutoUpdate = false;
          renderer.render(scene, actorCamera);
          if (!game.frontier?.renderingThirdPerson) {
            renderer.clearDepth();
            camera.updateMatrixWorld(true);
            viewCamera.matrixAutoUpdate = false;
            viewCamera.matrixWorldAutoUpdate = false;
            viewCamera.matrixWorld.copy(camera.matrixWorld);
            viewCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);
            renderer.render(scene, viewCamera);
          }
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
