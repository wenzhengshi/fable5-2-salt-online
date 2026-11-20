(() => {
  'use strict';

  function weaponWheel({ availableWeapons, wheelBlocked, equipWeapon, activeWeapon, nextWeapon, onError }) {
    let wheelNext = null;
    let wheelCurrent = null;
    let wheelBusy = false;
    let wheelDelta = 0;
    let wheelAt = 0;

    async function pumpWheelSwitch() {
      try {
        while (wheelNext) {
          const target = wheelNext;
          wheelNext = null;
          if (wheelBlocked()) break;
          const entry = availableWeapons().find(([, id]) => id === target);
          if (!entry) continue;
          wheelCurrent = target;
          const equipped = await equipWeapon(entry[0]);
          wheelCurrent = null;
          if (!equipped) break;
        }
      } catch (error) {
        wheelNext = null;
        onError?.(error);
      } finally {
        wheelBusy = false;
        wheelCurrent = null;
      }
    }

    function cycleWeapon(direction) {
      if (!direction || wheelBlocked()) return false;
      const list = availableWeapons();
      if (list.length < 2) return false;
      const active = wheelNext || wheelCurrent || activeWeapon();
      const next = nextWeapon(active, direction);
      if (!next) return false;
      wheelNext = next[1];
      if (!wheelBusy) {
        wheelBusy = true;
        void pumpWheelSwitch();
      }
      return true;
    }

    function onWheel(event) {
      if (!event.deltaY || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (wheelBlocked() || availableWeapons().length < 2) {
        wheelDelta = 0;
        return;
      }
      event.preventDefault();
      const now = performance.now();
      if (now - wheelAt > 240 || (wheelDelta < 0 && event.deltaY > 0) ||
          (wheelDelta > 0 && event.deltaY < 0)) wheelDelta = 0;
      wheelAt = now;
      wheelDelta += event.deltaY;
      const threshold = event.deltaMode === 0 ? 48 : 1;
      if (Math.abs(wheelDelta) < threshold) return;
      const direction = wheelDelta > 0 ? 1 : -1;
      wheelDelta = 0;
      cycleWeapon(direction);
    }

    return { onWheel, cycleWeapon };
  }

  function shoulderView(THREE, physics) {
    const aimForward = new THREE.Vector3(), aimTarget = new THREE.Vector3();
    const cameraTravel = new THREE.Vector3(), shoulder = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    // Long aim traces are only for camera convergence. The short wall trace still runs each frame.
    const lastAimOrigin = new THREE.Vector3();
    const lastAimDirection = new THREE.Vector3();
    let aimMap;
    let aimAge = Infinity;
    let aimDistance = 160;
    let closeToWall = false;
    let cameraDistance = Infinity;

    function resetViewTrace() {
      aimAge = Infinity;
      closeToWall = false;
      cameraDistance = Infinity;
    }

    function prepare(firstPosition, firstRotation, dt, map) {
      aimForward.set(0, 0, -1).applyQuaternion(firstRotation);
      if (map !== aimMap) {
        aimMap = map;
        resetViewTrace();
      }
      aimAge += dt;
      if (aimAge >= .05 || firstPosition.distanceToSquared(lastAimOrigin) > .01 ||
          aimForward.dot(lastAimDirection) < .99995) {
        aimAge = 0;
        lastAimOrigin.copy(firstPosition);
        lastAimDirection.copy(aimForward);
        const target = physics.raycast(firstPosition, aimForward, 160);
        aimDistance = target ? Math.max(.25, target.dist) : 160;
      }
      aimTarget.copy(firstPosition).addScaledVector(aimForward, aimDistance);
      shoulder.crossVectors(aimForward, up).normalize();
      cameraTravel.copy(aimForward).multiplyScalar(-3.65).addScaledVector(shoulder, .66).addScaledVector(up, .65);
      const travel = cameraTravel.length();
      cameraTravel.divideScalar(travel);
      const obstacle = physics.raycast(firstPosition, cameraTravel, travel + .20);
      const distance = obstacle ? Math.min(travel, Math.max(0, obstacle.dist - .32)) : travel;
      // Pull in immediately at a wall. Recover gradually with a wider exit threshold
      // so small pose or terrain changes do not rapidly switch between viewpoints.
      if (distance < (closeToWall ? 1.3 : 1.05)) {
        closeToWall = true;
        cameraDistance = 1.05;
        return false;
      }
      closeToWall = false;
      cameraDistance = distance < cameraDistance ? distance :
        THREE.MathUtils.lerp(cameraDistance, distance, 1 - Math.exp(-dt * 16));

      return true;
    }

    function apply(camera, firstPosition) {
      camera.position.copy(firstPosition).addScaledVector(cameraTravel, cameraDistance);
      camera.lookAt(aimTarget);
    }

    return { prepare, apply, reset: resetViewTrace };
  }

  function updateAvatarWeapon(avatar, id, visible) {
    if (avatar.machine) {
      if (avatar.weapon) avatar.weapon.visible = visible;
      return;
    }
    const arsenal = window.SaltArsenal;
    const rifle = avatar.weapon;
    const parts = avatar.viewWeaponParts;
    const mount = rifle || (parts?.length ? avatar.body : null);
    const current = avatar.equippedModel;
    if (current && (current.parent !== mount || current.userData.arsenalId !== id || id === 'pac9')) {
      current.removeFromParent();
      avatar.equippedModel = null;
    }
    if (!mount) return;
    if (visible && id && id !== 'pac9' && !avatar.equippedModel && arsenal) {
      const model = arsenal.clone(id);
      if (model) {
        model.userData.arsenalId = id;
        model.name = 'equipped-arsenal-model';
        if (!rifle) model.position.set(.28, 1.12, -.22);
        mount.add(model);
        avatar.equippedModel = model;
      } else if (!avatar.loadingWeapon) {
        avatar.loadingWeapon = true;
        arsenal.load().then(() => { avatar.loadingWeapon = false; }).catch(() => {});
      }
    }
    if (rifle) {
      rifle.visible = visible;
      // Keep the invisible IK grip anchors active in the rig.
      const anchors = rifle.userData.anchors;
      for (const part of rifle.children) {
        if (part !== anchors?.right && part !== anchors?.left && part !== avatar.equippedModel) part.visible = !avatar.equippedModel;
      }
    }
    for (const mesh of parts || []) mesh.visible = visible && !avatar.equippedModel;
    if (avatar.equippedModel) avatar.equippedModel.visible = visible;
  }

  function unitTouchControls(touch, kind, t, state) {
    if (!touch) return;
    const machine = kind === 'hound' || kind === 'drone';
    touch.dataset.unit = machine ? kind : 'infantry';
    const jump = touch.querySelector('.t-jump span');
    const fire = touch.querySelector('.t-fire span');
    if (jump) {
      jump.dataset.defaultText ||= jump.textContent;
      const nextJump = kind === 'drone' ? t('unitAscend') : machine ? t('unitJump') : jump.dataset.defaultText;
      if (jump.textContent !== nextJump) jump.textContent = nextJump;
    }
    if (fire) {
      fire.dataset.defaultText ||= fire.textContent;
      const nextFire = machine ? t('unitFire') : fire.dataset.defaultText;
      if (fire.textContent !== nextFire) fire.textContent = nextFire;
    }

    let descend = touch.querySelector('.t-descend');
    if (!descend) {
      descend = document.createElement('button');
      descend.type = 'button';
      descend.className = 't-btn t-descend';
      descend.dataset.a = 'unit-descend';
      descend.setAttribute('aria-label', t('unitDescend'));
      descend.innerHTML = `<span>${t('unitDescend')}</span>`;
      const releaseDescend = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        state.descend = false;
        descend.classList.remove('active');
      };
      descend.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.descend = true;
        descend.classList.add('active');
        try { descend.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      }, { passive: false });
      descend.addEventListener('pointerup', releaseDescend, { passive: false });
      descend.addEventListener('pointercancel', releaseDescend, { passive: false });
      descend.addEventListener('lostpointercapture', releaseDescend, { passive: false });
      touch.appendChild(descend);
    }
    const shouldHide = kind !== 'drone';
    if (descend.hidden !== shouldHide) descend.hidden = shouldHide;
    if (kind !== 'drone') state.descend = false;
  }

  // Hand targets in avatar space (+X right, -Z forward).
  const actionFrames = {
    reload: [[0,.28,1.15,-.48,0,0], [.15,.12,1.12,-.36,1,0],
      [.32,.12,.89,-.25,1,.25], [.49,-.34,.83,-.16,1,.20],
      [.69,.12,1.12,-.37,1,0], [.83,.12,1.31,-.32,.8,0], [1,.28,1.15,-.48,0,0]],
    grenade: [[0,.34,1.09,-.22,.7,-.2], [.39,.34,1.59,.23,1,-.8],
      [.5,.31,1.49,-.62,1,1.12], [.69,.22,1.05,-.63,1,1.4], [1,.26,1.12,-.36,0,0]],
    drink: [[0,.34,1.06,-.18,.5,0], [.24,.11,1.51,-.23,1,.85],
      [.45,.10,1.59,-.23,1,1.40], [.70,.10,1.59,-.23,1,1.40],
      [.84,.31,1.28,-.19,1,.35], [1,.34,1.09,-.18,0,0]]
  };

  function actionPose(THREE, kind, phase, position) {
    const frames = actionFrames[kind];
    if (!frames || phase < 0 || phase >= 1) return null;
    const end = frames.findIndex(frame => frame[0] > phase);
    const from = frames[end - 1], to = frames[end];
    const t = THREE.MathUtils.smoothstep(phase, from[0], to[0]);
    const mix = index => THREE.MathUtils.lerp(from[index], to[index], t);
    return { kind, phase, position: position.set(mix(1), mix(2), mix(3)),
      blend: mix(4), tilt: mix(5) };
  }

  window.SaltPlayerCombat = { weaponWheel, shoulderView, updateAvatarWeapon, unitTouchControls, actionPose };
})();
