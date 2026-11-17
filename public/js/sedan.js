(() => {
  'use strict';
  const rules = window.SaltSedanRules;
  const messages = (window.__SALT_I18N__ || {}).messages || {};
  const tr = (key, vars) => {
    const value = String(key || '').split('.').reduce(
      (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), messages
    );
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  };
  const labels = {
    board: tr('car.board'), leave: tr('car.leave'), driver: tr('car.driver'),
    passenger: tr('car.passenger'), full: tr('car.full'), moving: tr('car.moving'),
    boardMoving: tr('car.boardMoving'),
    blocked: tr('car.blocked'), portal: tr('car.portal'), loading: tr('car.loading'),
    failed: tr('car.failed'), brake: tr('car.brake'), parked: tr('car.parked'),
    leavePending: tr('car.leavePending'),
    exitPending: tr('car.exitPending'), waitingForStop: tr('car.waitingForStop'),
    left: tr('car.left'), notRiding: tr('car.notRiding'),
    gearDrive: tr('car.gearDrive'), gearReverse: tr('car.gearReverse'), gearNeutral: tr('car.gearNeutral')
  };

  window.installSedan = function (game) {
    const { THREE: T, scene, input, player, physics, camera } = game;
    const el = document.createElement('div');
    el.className = 'sedan-hud';
    el.hidden = true;
    const status = document.createElement('span');
    status.className = 'sedan-status';
    const meter = document.createElement('span');
    meter.className = 'sedan-meter';
    const brakeButton = document.createElement('button');
    brakeButton.type = 'button';
    brakeButton.className = 'sedan-brake';
    brakeButton.textContent = labels.brake;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sedan-leave';
    el.append(meter, status, brakeButton, button);
    document.body.append(el);

    const mapOf = () => game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : 'port');
    const origin = new T.Vector3(), ray = new T.Vector3(), before = new T.Vector3(), view = new T.Vector3();
    const footprint = [[-.91, -2.30], [.91, -2.30], [-.91, 2.30], [.91, 2.30], [0, -2.35], [0, 2.35], [-.94, 0], [.94, 0]];
    let model, mp, target, display, local = rules.create(), seat = null, drive = null, travel = null;
    let nextPose = 0, portalUntil = 0, requestUntil = 0, noticeUntil = 0, lookOffset = 0;
    let wheels = 0, steering = 0, pitch = 0, roll = 0, retry = false;
    let pendingExit = false, exitFlushed = false, brakeHeld = false;
    let lastChassisX = Infinity, lastChassisZ = Infinity, lastChassisHeading = Infinity;
    const now = () => performance.now();
    const floor = (x, z, cap) => physics.groundHeight(x, z, cap);
    const say = key => { status.textContent = labels[key]; noticeUntil = now() + 1800; };
    const toVector = (v, p) => v.set(p.x, p.y, p.z);

    const setBrake = on => {
      brakeHeld = !!on;
      brakeButton.classList.toggle('active', brakeHeld);
      brakeButton.setAttribute('aria-pressed', brakeHeld ? 'true' : 'false');
    };

    function blocked(from, to) {
      const length = ray.set(to.x - from.x, to.y - from.y, to.z - from.z).length();
      if (length < .001) return false;
      ray.divideScalar(length);
      return !!physics.raycast(toVector(origin, from), ray, length + .02);
    }

    function exitIndex(car, index) {
      let best = -1, bestScore = -Infinity;
      rules.exits(index).forEach(([x, z], candidate) => {
        const pt = rules.point(car, x, 0, z);
        const height = floor(pt.x, pt.z, pt.y + 1.4);
        let score = 0;
        if (Number.isFinite(height)) {
          const drop = Math.abs(height - pt.y);
          score += Math.max(0, 3.2 - drop);
          score += !blocked({ ...pt, y: height + .12 }, { ...pt, y: height + 1.75 }) ? 2.2 : 0;
        }
        score += !blocked(rules.point(car, 0, .6, z * .55),
          { ...pt, y: Number.isFinite(height) ? height + .6 : pt.y + .6 }) ? 2.6 : 0;
        // Prefer the original door side when clear, then the nearest fallback.
        score -= candidate * .05;
        if (score > bestScore) { bestScore = score; best = candidate; }
      });
      return best;
    }

    function release(position) {
      seat = null;
      drive = null;
      pendingExit = false;
      exitFlushed = false;
      requestUntil = 0;
      setBrake(false);
      if (!position) return;
      const height = floor(position.x, position.z, position.y + .65);
      player.pos.set(position.x, Number.isFinite(height) && Math.abs(height - position.y) < .7 ? height : position.y, position.z);
      player.vel.set(0, 0, 0);
      player.lastSafe.copy(player.pos);
      player.syncView();
    }

    function apply(state) {
      const lastSeat = seat;
      target = state || null;
      seat = state?.seat ?? null;
      if (lastSeat !== seat && seat != null && state) {
        lookOffset = 0;
        player.pitch = 0;
      }
      if (seat == null) {
        pendingExit = false;
        exitFlushed = false;
        setBrake(false);
      }
      if (seat !== 0) drive = null;
      else if (!drive || drive.revision !== state.revision) {
        drive = { ...state };
        display = null;
      }
    }

    async function loadTravel(state) {
      if (travel && !retry) return;
      retry = false;
      travel = state;
      el.hidden = false;
      button.hidden = true;
      brakeButton.hidden = true;
      meter.hidden = true;
      status.textContent = labels.loading;
      try {
        // Give the loading notice a paint even when the destination is cached.
        await new Promise(resolve => setTimeout(resolve, 65));
        if (window.SaltExpeditionZones.maps[state.map]) {
          const enter = await game.expedition.prepareEntry(state.map);
          if (travel !== state) return;
          enter(state, false);
        } else {
          if (state.map === 'qingyun') await game.qingyun.preload({ warmup: false });
          if (travel !== state) return;
          if (game.expedition.active) game.expedition.leave(state);
          else game.qingyun.land(state);
        }
        player.yaw = state.heading + Math.PI;
        display = null;
        apply(state);
        portalUntil = now() + 2000;
        requestUntil = 0;
        if (state.seat === 0) mp?.send({ type: 'sedanReady', revision: state.revision });
        travel = null;
        status.textContent = '';
      } catch (error) {
        if (travel !== state) return;
        console.warn('[sedan] destination load failed', error);
        retry = true;
        button.hidden = false;
        button.textContent = labels.failed;
      }
    }

    function listen() {
      if (mp || !window.__mp) return;
      mp = window.__mp;
      mp.onMessage(message => {
        if (!mp.connected) return;
        if (message.type === 'sedanTravel') void loadTravel(message.car);
        if (message.type === 'sedanResult') {
          requestUntil = 0;
          if (message.reason === 'leave') {
            release(message.position);
            apply(message.car);
            say('left');
            return;
          }
          if (message.reason === 'not-riding') {
            release();
            apply(message.car);
            say('notRiding');
            return;
          }
          if (message.reason === 'moving') {
            if (seat != null) {
              pendingExit = true;
              exitFlushed = false;
              requestUntil = now() + 220;
              say('moving');
            } else {
              say('boardMoving');
            }
          }
          apply(message.car);
          if (message.reason === 'full') say('full');
        }
        if (message.type === 'snapshot' && !travel) {
          const state = message.sedan;
          if (state?.seat != null && state.map !== mapOf()) {
            void loadTravel(state);
          } else {
            apply(state);
          }
        }
      });
    }

    function sendPose() {
      if (!mp?.connected || !drive) return;
      const { x, y, z, heading, speed } = drive;
      mp.send({ type: 'sedanPose', revision: drive.revision, pose: { x, y, z, heading, speed } });
    }

    function requestExit() {
      const state = drive || display;
      if (!state || seat == null) return false;
      const index = exitIndex(state, seat);
      if (index < 0) {
        pendingExit = false;
        say('blocked');
        return false;
      }
      if (!mp?.connected) {
        const [x, z] = rules.exits(seat)[index];
        local = { ...state, seat: null, speed: 0 };
        release(rules.point(state, x, 0, z));
        apply(local);
        return true;
      }
      if (!exitFlushed) {
        // Flush one final stopped pose before asking the server to unlock the
        // door. This prevents a stale 30 Hz speed sample from rejecting an
        // exit after the client has already parked.
        if (drive && Math.abs(drive.speed) <= rules.exitSpeed) {
          drive.speed = 0;
          sendPose();
        }
        exitFlushed = true;
        requestUntil = now() + 130;
        return true;
      }
      mp.send({ type: 'sedanLeave', index, speed: Math.abs(state.speed) });
      requestUntil = now() + 700;
      return true;
    }

    function interact() {
      if (retry) { void loadTravel(travel); return; }
      if (travel || requestUntil > now() || !display || game.game.state !== 'playing' ||
          !player.alive || game.frontier?.airborne || window.__saltBoat?.riding) return;
      const connected = mp?.connected;
      if (seat == null) {
        if (!rules.near(display, player.pos)) return;
        if (connected) {
          mp.syncState();
          mp.send({ type: 'sedanBoard', carId: display.id });
          requestUntil = now() + 900;
        } else {
          local.seat = 0;
          apply(local);
        }
        return;
      }
      pendingExit = true;
      exitFlushed = false;
      const state = drive || display;
      if (Math.abs(state.speed) <= rules.exitSpeed) requestExit();
      else say(seat === 0 ? 'moving' : 'waitingForStop');
    }

    button.addEventListener('click', interact);
    brakeButton.addEventListener('pointerdown', event => {
      event.preventDefault();
      try { brakeButton.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      setBrake(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) {
      brakeButton.addEventListener(type, () => setBrake(false));
    }
    brakeButton.addEventListener('contextmenu', event => event.preventDefault());
    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyH' || event.repeat || event.target?.closest?.('input,textarea,[contenteditable=true]')) return;
      if (seat != null || (display && rules.near(display, player.pos)) || retry) {
        event.preventDefault();
        interact();
      }
    });
    game.events.on('game:state', event => {
      el.hidden = event.state !== 'playing';
      if (event.state === 'title' || event.state === 'intro') {
        travel = null;
        retry = false;
        release();
      }
    });

    // Sweep bumper, sides and corners over small substeps, then place the chassis on the terrain.
    function driveStep(dt) {
      const throttle = Number(input.move?.y) || 0;
      const brake = brakeHeld || !!input.down?.('jump');
      const steer = Number(input.move?.x) || 0;
      drive.speed = rules.stepSpeed(drive.speed, throttle, brake, dt, pendingExit);
      const steerTarget = steer * -rules.steerLimit(drive.speed);
      steering += (steerTarget - steering) * Math.min(1, dt * (Math.abs(drive.speed) < 2.5 ? 15 : 11));
      const steps = Math.max(1, Math.ceil(Math.abs(drive.speed * dt) / .22));
      for (let n = 0; n < steps && Math.abs(drive.speed) > .004; n++) {
        const step = dt / steps;
        const distance = drive.speed * step;
        const heading = rules.angle(drive.heading + rules.turnRate(steering, drive.speed) * step);
        const next = { ...drive, heading, x: drive.x + Math.sin(heading) * distance, z: drive.z + Math.cos(heading) * distance };
        if (!rules.inside(next, .1)) { drive.speed = 0; break; }
        let height = 0;
        let valid = true;
        for (const x of [-.84, .84]) for (const z of [-1.42, 1.43]) {
          const point = rules.point(next, x, 0, z);
          const y = floor(point.x, point.z, drive.y + .9);
          if (!Number.isFinite(y) || Math.abs(y - drive.y) > .85 || y < -1.05) valid = false;
          height += y * .25;
        }
        next.y = valid ? height : drive.y;
        if (!valid || footprint.some(([x, z]) => [.55, 1.24].some(y =>
          blocked(rules.point(drive, x, y, z), rules.point(next, x, y, z))))) {
          drive.speed = 0;
          break;
        }
        Object.assign(drive, next);
      }
      if (!pendingExit && now() > portalUntil && (throttle > .12 || input.pressed?.('interact'))) {
        const route = rules.portal(target || drive);
        if (route) {
          portalUntil = now() + 1800;
          if (mp?.connected) {
            mp.send({ type: 'sedanPortal', revision: drive.revision, destination: route.to });
          } else {
            local = { ...drive, ...route.arrival, map: route.to, revision: drive.revision + 1, speed: 0, seat: 0 };
            void loadTravel(local);
          }
        }
      }
    }

    function alignChassis(car) {
      if (Math.hypot(car.x - lastChassisX, car.z - lastChassisZ) < .14 &&
          Math.abs(car.heading - lastChassisHeading) < .04) return;
      lastChassisX = car.x;
      lastChassisZ = car.z;
      lastChassisHeading = car.heading;
      const heights = [];
      for (const x of [-.84, .84]) for (const z of [-1.42, 1.43]) {
        const wheel = rules.point(car, x, 0, z);
        heights.push(floor(wheel.x, wheel.z, car.y + .9));
      }
      if (heights.some(y => !Number.isFinite(y) || Math.abs(y - car.y) > .86)) return;
      const [backLeft, frontLeft, backRight, frontRight] = heights;
      pitch = -Math.atan2(frontLeft + frontRight - backLeft - backRight, 5.7);
      roll = Math.atan2(backRight + frontRight - backLeft - frontLeft, 3.36);
    }

    function update(dt) {
      listen();
      if (travel) return;
      if (!mp?.connected) {
        if (!target || target !== local) apply(local);
      }
      const state = target?.map === mapOf() ? (drive || target) : null;
      if (state && !model) {
        model = window.SaltSedanModel(T);
        scene.add(model.root);
      }
      if (model) model.root.visible = !!state;
      el.hidden = !state || !player.alive || game.frontier?.airborne;
      if (!state) { display = null; return; }

      if (drive && player.alive) {
        if (requestUntil <= now()) driveStep(dt);
        if (travel) return;
        if (mp?.connected && now() >= nextPose) {
          nextPose = now() + 85;
          sendPose();
        }
      }
      if (!display || display.map !== state.map) display = { ...state };
      const alpha = drive ? 1 : 1 - Math.exp(-dt * 16);
      for (const key of ['x', 'y', 'z', 'speed']) display[key] += (state[key] - display[key]) * alpha;
      display.heading += rules.angle(state.heading - display.heading) * alpha;
      if (!drive && !display.speed) {
        const height = floor(display.x, display.z, display.y + .8);
        if (Number.isFinite(height) && Math.abs(height - display.y) < 1.4) display.y = height;
      }
      model.root.position.set(display.x, display.y, display.z);
      alignChassis(display);
      model.root.rotation.set(pitch, display.heading, roll, 'YXZ');
      wheels -= display.speed / model.radius * dt;
      for (const wheel of model.wheels) {
        wheel.spin.rotation.x = wheels;
        if (wheel.front) wheel.root.rotation.y = drive ? steering : 0;
      }
      model.steeringSpin.rotation.z = drive ? steering * 2 : 0;
      if (seat != null && player.alive) positionRider(dt);
      if (pendingExit && seat != null && requestUntil <= now()) {
        const live = drive || state;
        if (Math.abs(live.speed) <= rules.exitSpeed) requestExit();
      }
      const near = rules.near(display, player.pos);
      el.hidden ||= seat == null && !near;
      button.hidden = false;
      button.textContent = seat == null ? labels.board :
        pendingExit && Math.abs(state.speed) > rules.parkSpeed ? labels.leavePending : labels.leave;
      brakeButton.hidden = seat !== 0;
      meter.hidden = seat == null;
      if (seat != null) {
        const kmh = Math.round(Math.abs(state.speed) * 3.6);
        const gear = Math.abs(state.speed) < .4 ? labels.gearNeutral : state.speed < 0 ? labels.gearReverse : labels.gearDrive;
        meter.textContent = tr('car.speed', { gear, kmh });
        meter.dataset.gear = gear;
      }
      if (now() > noticeUntil) {
        const stopped = Math.abs(state.speed) <= rules.parkSpeed;
        status.textContent = seat == null
          ? (mp?.connected ? target.seats.filter(Boolean).length : 0) + '/4'
          : pendingExit && !stopped ? (seat === 0 ? labels.exitPending : labels.waitingForStop)
            : seat === 0 ? (rules.portal(state) ? labels.portal : stopped ? labels.parked : labels.driver)
              : labels.passenger;
      }
    }

    function positionRider(dt) {
      const driver = seat === 0;
      const side = Math.sign(rules.seats[seat].x);
      const limit = driver ? Math.PI : 1.29;
      lookOffset = T.MathUtils.clamp(lookOffset - input.look.dx, -limit, limit);
      player.pitch = T.MathUtils.clamp(player.pitch - input.look.dy, driver ? -.72 : -.85, driver ? .38 : .83);
      player.yaw = display.heading + (driver ? Math.PI : -side * Math.PI / 2) + lookOffset;
      player.sprinting = player.prone = false;
      player.ads += ((input.ads && !driver ? 1 : 0) - player.ads) * Math.min(1, dt * 14);
      player.vel.set(0, 0, 0);
      const offset = rules.seats[seat];
      toVector(player.pos, driver ? rules.seat(display, seat) : rules.point(display, side * 1.06, offset.y, offset.z));
      player.syncView();
      if (driver) {
        const look = player.yaw;
        const anchor = rules.point(display, 0, 1.35, .35);
        const desired = view.set(anchor.x + Math.sin(look) * 6.4, anchor.y + 1.6 - player.pitch * 4, anchor.z + Math.cos(look) * 6.4);
        const length = ray.set(desired.x - anchor.x, desired.y - anchor.y, desired.z - anchor.z).length();
        ray.divideScalar(length);
        const hit = physics.raycast(toVector(origin, anchor), ray, length);
        camera.position.copy(origin).addScaledVector(ray, hit ? Math.max(.6, hit.dist - .16) : length);
        camera.lookAt(anchor.x, anchor.y, anchor.z);
      }
    }

    const move = physics.moveCapsule.bind(physics);
    physics.moveCapsule = (pos, vel, dt, radius = .32, ...args) => {
      before.copy(pos);
      const result = move(pos, vel, dt, radius, ...args);
      if (!display || seat != null || display.map !== mapOf() || pos !== player.pos ||
          pos.y >= display.y + 1.46 || pos.y < display.y - 1.45) return result;
      const dx = pos.x - display.x, dz = pos.z - display.z;
      const c = Math.cos(display.heading), s = Math.sin(display.heading);
      const u = dx * c - dz * s, v = dx * s + dz * c;
      const xOverlap = rules.halfWidth + radius - Math.abs(u);
      const zOverlap = rules.halfLength + radius - Math.abs(v);
      if (xOverlap > 0 && zOverlap > 0) {
        // Resolve along the shallow face, so players can slide around the car.
        const x = xOverlap <= zOverlap ? (Math.sign(u) || 1) * xOverlap : 0;
        const z = x ? 0 : (Math.sign(v) || 1) * zOverlap;
        const resolved = { x: pos.x + c * x + s * z, y: pos.y + .6, z: pos.z - s * x + c * z };
        if (!blocked({ x: pos.x, y: pos.y + .6, z: pos.z }, resolved)) {
          pos.x = resolved.x;
          pos.z = resolved.z;
        } else {
          pos.x = before.x;
          pos.z = before.z;
        }
        result.hitWall = true;
      }
      return result;
    };

    return game.sedan = {
      update,
      get riding() { return seat != null || !!travel; },
      get driving() { return seat === 0 || !!travel; },
      get state() { return display; }
    };
  };
})();
