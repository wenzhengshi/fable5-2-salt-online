(() => {
  'use strict';

  function pose(time, moving) {
    const stroke = time * (moving ? 6 : 3.5);
    const cycle = Math.sin(stroke);
    const kick = Math.sin(stroke * 2) * (moving ? .34 : .16);
    return {
      swim: true, armL: -1.15 + .95 * cycle, armR: -1.15 - .95 * cycle,
      flare: moving ? .78 : 1.18, legL: kick, legR: -kick,
      head: 0, brace: 0, pitch: moving ? -1.30 : -.18, lift: moving ? .66 : -.64
    };
  }

  window.SaltSwimming = { pose };
  window.installSwimming = function (game) {
    const { THREE, player, camera, physics, input } = game;
    const origin = new THREE.Vector3();
    const target = new THREE.Vector3();
    const stride = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const velocity = new THREE.Vector3();
    const look = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const cameraPos = new THREE.Vector3();
    const cameraRotation = new THREE.Quaternion();
    let swimming = false;
    let strokeTime = 0;
    let view;

    function stop() {
      swimming = false;
      strokeTime = 0;
      view?.dispose();
      view = null;
    }

    function levelAt(x, z) {
      if (game.expedition?.active) return game.expedition.waterLevelAt(x, z);
      if (game.qingyun?.active) return game.qingyun.collision?.inLake(x, z) ? 0 : null;
      return x > 30.24 ? game.ground.seaHeight(x, z) : null;
    }

    function available() {
      const kind = window.__mp?.soldier;
      return player.alive && player.enabled && kind !== 'drone' && kind !== 'hound' &&
        !game.portalArrival?.active && !game.frontier?.airborne &&
        !game.sedan?.riding && !window.__saltBoat?.riding;
    }

    function stepOntoShore(surface, dt, radius, moveX, moveZ) {
      stride.set(moveX, 0, moveZ);
      if (stride.lengthSq() < .05) return false;
      stride.normalize().multiplyScalar(.92);
      target.copy(player.pos).add(stride);
      const targetWater = levelAt(target.x, target.z);
      const ledge = physics.groundHeight(target.x, target.z, surface + 2.05);
      if (ledge < surface - .16 || (targetWater !== null && ledge <= targetWater + .04)) return false;
      const rise = ledge + .08 - player.pos.y;
      if (rise <= 0) return false;
      origin.copy(player.pos);
      origin.y += 1.05;
      if (physics.raycast(origin, up, rise)) return false;
      origin.copy(player.pos);
      origin.y = ledge + .08;
      velocity.copy(stride).divideScalar(dt);
      physics.moveCapsule(origin, velocity, dt, radius, 1.75, false);
      if (Math.hypot(origin.x - target.x, origin.z - target.z) > .18) return false;
      player.pos.copy(origin);
      player.vel.set(0, 0, 0);
      stop();
      return true;
    }

    game.events.on('game:state', ({state}) => {
      if (state !== 'playing' && state !== 'paused') stop();
    });

    game.swim = {
      get active() { return swimming; },
      canCrossPortQuay(position) {
        // The open quay can be crossed by the local swimmer and its bank-climb probe.
        return (position === player.pos || (position === origin && swimming)) && available();
      },
      update(dt, moveX, moveZ, radius) {
        if (!available()) {
          if (swimming) stop();
          return false;
        }
        const {pos, vel} = player;
        const surface = levelAt(pos.x, pos.z);
        if (surface == null || pos.y > surface + .22) {
          if (swimming) stop();
          return false;
        }
        if (!swimming && (pos.y > surface - .05 || vel.y > 0)) return false;

        swimming = true;
        if (!dt) {
          player.onGround = false;
          return true;
        }
        strokeTime += dt;
        player.prone = false;
        player.sprinting = false;
        player.onGround = false;
        const pace = 3.4 / Math.max(1, Math.hypot(moveX, moveZ));
        const blend = 1 - Math.exp(-dt * 7);
        vel.x += (moveX * pace - vel.x) * blend;
        vel.z += (moveZ * pace - vel.z) * blend;
        if (input.down('jump') && stepOntoShore(surface, dt, radius, moveX, moveZ)) return true;

        const depth = surface - .72;
        vel.y = Math.max(-2, Math.min(3.5, (depth - pos.y) * 9));
        physics.moveCapsule(pos, vel, dt, radius, 1.05, true);
        const bounds = game.expedition?.active ||
          (game.qingyun?.active ? window.SaltQingyunZone.bounds : physics.bounds);
        if (bounds) {
          pos.x = THREE.MathUtils.clamp(pos.x, (bounds.minX ?? bounds.min.x) + radius, (bounds.maxX ?? bounds.max.x) - radius);
          pos.z = THREE.MathUtils.clamp(pos.z, (bounds.minZ ?? bounds.min.z) + radius, (bounds.maxZ ?? bounds.max.z) - radius);
        }
        player.speed = Math.hypot(vel.x, vel.z);
        if (levelAt(pos.x, pos.z) == null) stop();
        return true;
      },
      beginView(dt) {
        if (!swimming || !available() || game.game.state !== 'playing') return false;
        view ||= window.__mp?.createSelfView();
        if (!view) return false;
        const surface = levelAt(player.pos.x, player.pos.z);
        if (surface == null) return false;
        const moving = player.speed > .4;
        view.update(dt, game.frontier?.equipmentFlags, false, null, null, pose(strokeTime, moving));
        view.model.visible = true;
        cameraPos.copy(camera.position);
        cameraRotation.copy(camera.quaternion);
        look.copy(player.pos);
        look.y = surface + .38;
        direction.set(Math.sin(player.yaw), .58, Math.cos(player.yaw)).normalize();
        const obstacle = physics.raycast(look, direction, 3.85);
        camera.position.copy(look).addScaledVector(direction, obstacle ? Math.max(.25, obstacle.dist - .13) : 3.85);
        camera.lookAt(look);
        return true;
      },
      endView() {
        if (view) view.model.visible = false;
        camera.position.copy(cameraPos);
        camera.quaternion.copy(cameraRotation);
        camera.updateWorldMatrix(true, false);
      }
    };
  };
})();
