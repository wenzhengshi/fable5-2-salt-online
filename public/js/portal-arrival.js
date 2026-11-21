(() => {
  'use strict';

  const HOLD_SECONDS = 1.2;
  const FALL_SECONDS = 3.25;
  const HEIGHT = 72;
  const HIGH_FALL = 2.6;
  const english = document.documentElement.lang === 'en-US';

  function holdPrompt() {
    const status = document.createElement('div');
    status.className = 'portal-hold';
    status.hidden = true;
    status.setAttribute('role', 'status');
    (document.getElementById('ui') || document.getElementById('app')).appendChild(status);
    let current, since;
    return function hold(key, now, still = true) {
      if (!key || !still) {
        current = null;
        status.hidden = true;
        return false;
      }
      if (key !== current) { current = key; since = now; }
      const left = Math.max(0, HOLD_SECONDS - (now - since));
      status.hidden = left === 0;
      if (left > 0) {
        const text = english ? 'Stand still to cross · ' : '站稳等待传送 · ';
        const message = text + left.toFixed(1) + 's';
        if (status.textContent !== message) status.textContent = message;
      }
      return left === 0;
    };
  }

  function still(game) {
    const move = game.input.move;
    const stopped = !move || Math.hypot(move.x, move.y) < .13;
    return stopped && (game.player.onGround ||
      (window.__mp?.soldier === 'drone' && !game.input.down?.('jump') && !game.input.down?.('sprint')));
  }

  function pose(time, landing = (time - 2.78) / .47) {
    const brace = Math.max(0, Math.min(1, landing));
    const pulse = 1 - .72 * brace;
    return {
      armL: -.95 + pulse * (.9 * Math.sin(time * 10) + .32 * Math.sin(time * 16 + 1)),
      armR: -1.04 + pulse * (.96 * Math.sin(time * 8.1 + 2.4) + .30 * Math.sin(time * 14)),
      flare: .83 + .26 * Math.sin(time * 6.8),
      legL: -.32 + pulse * .76 * Math.sin(time * 11 + .4),
      legR: -.37 + pulse * .68 * Math.sin(time * 9.6 + 2.8),
      head: .29 * Math.sin(time * 7.4),
      brace
    };
  }

  function heightAt(time) {
    const t = Math.max(0, Math.min(1, time / FALL_SECONDS));
    const distance = t < .8
      ? .8 * (t / .8) ** 1.65
      : 1 - .2 * ((1 - t) / .2) ** 1.65;
    return HEIGHT * (1 - distance);
  }

  window.SaltPortalArrival = { holdPrompt, still, pose, heightAt };

  window.installPortalArrival = function (game) {
    const { THREE, camera, player } = game;
    let flight;
    let natural;
    let takeoffY;
    const cameraPos = new THREE.Vector3();
    const cameraRotation = new THREE.Quaternion();
    const look = new THREE.Vector3();
    const direction = new THREE.Vector3();

    function end(restore) {
      if (!flight) return;
      flight.view?.dispose();
      flight = null;
      if (restore && game.game.state === 'playing') {
        game.hud.show(true);
        player.syncView();
        window.__mp?.resetFlight();
        window.__mp?.syncState();
      }
    }

    function endNatural() {
      natural?.view?.dispose();
      natural = null;
      takeoffY = undefined;
    }

    game.events.on('game:state', event => {
      if (event.state !== 'playing' && event.state !== 'paused') {
        end(false);
        endNatural();
      }
    });

    game.portalArrival = {
      get active() { return !!flight; },
      get showingFall() { return game.game.state === 'playing' && !!(flight || natural); },
      start() {
        if (window.__saltBoat?.riding || game.sedan?.riding) return;
        end(false);
        endNatural();
        flight = { time: 0, ground: player.pos.clone(), yaw: player.yaw, view: null };
        game.hud.show(false);
      },
      update(dt) {
        if (!flight || game.game.state !== 'playing') return;
        game.hud.show(false);
        flight.time += dt;
        if (flight.time >= FALL_SECONDS) end(true);
      },
      updateNatural(dt) {
        if (game.game.state === 'paused') return;
        if (flight || game.game.state !== 'playing' || !player.alive || !player.enabled ||
            game.frontier?.airborne || game.swim?.active || window.__mp?.soldier === 'drone' ||
            game.sedan?.riding || window.__saltBoat?.riding) {
          endNatural();
          return;
        }
        if (player.onGround) {
          if (natural) endNatural();
          takeoffY = player.pos.y;
          return;
        }
        takeoffY ??= player.pos.y;
        if (!natural && player.vel.y < -2 && takeoffY - player.pos.y >= HIGH_FALL) {
          const { x, y, z } = player.pos;
          const floor = game.physics.groundHeight(x, z, y + .05);
          // Avoid a camera flash on short drops that are about to land.
          if (!Number.isFinite(floor) || y - floor > Math.max(1, -player.vel.y * .18)) {
            natural = { time: 0, view: null };
          }
        }
        if (natural) natural.time += dt;
      },
      beginView(dt) {
        const descent = flight || natural;
        if (!descent || game.game.state !== 'playing') return false;
        const { time } = descent;
        const point = flight ? flight.ground : player.pos;
        const yaw = flight ? flight.yaw : player.yaw;
        const view = descent.view ||= window.__mp?.createSelfView();
        if (!view && !flight) return false;
        const altitude = flight ? heightAt(time) : 0;
        const floor = flight ? null : game.physics.groundHeight(point.x, point.z, point.y + .05);
        const approach = Number.isFinite(floor) && player.vel.y < 0
          ? 1 - (point.y - floor) / (-player.vel.y * .3)
          : 0;
        const panic = pose(time, flight ? undefined : approach);
        cameraPos.copy(camera.position);
        cameraRotation.copy(camera.quaternion);
        if (view) {
          view.update(dt, game.frontier?.equipmentFlags, false, null, null, panic);
          view.model.visible = true;
          view.model.position.copy(point);
          view.model.position.y += altitude;
          view.model.rotation.set(.54 * Math.sin(time * 3.9) * (1 - panic.brace),
            yaw + .8 + time * .85, .48 * Math.sin(time * 6.8) * (1 - panic.brace));
        }
        look.copy(point);
        look.y += altitude + .9;
        const angle = yaw + .25 + time * .42;
        direction.set(Math.sin(angle), .64, Math.cos(angle)).normalize();
        const distance = Math.max(4.1, Math.min(7.6, 4.6 / Math.max(.65, camera.aspect)));
        const clear = game.physics.raycast(look, direction, distance);
        camera.position.copy(look).addScaledVector(direction, clear ? Math.max(.45, clear.dist - .16) : distance);
        camera.lookAt(look);
        return true;
      },
      endView() {
        camera.position.copy(cameraPos);
        camera.quaternion.copy(cameraRotation);
        camera.updateWorldMatrix(true, false);
      }
    };
  };
})();
