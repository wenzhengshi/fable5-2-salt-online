(() => {
  'use strict';

  const KIND = 'classic';

  function three() {
    return window.__G && window.__G.THREE;
  }

  function colorValue(value) {
    try {
      const color = new (three().Color)(value || '#ffb347');
      return color.isColor ? color : null;
    } catch (err) {
      return null;
    }
  }

  function create(kind, options) {
    if (kind !== KIND) return null;
    const THREE = three();
    if (!THREE) return null;

    const config = options || {};
    const trimColor = colorValue(config.color) || new THREE.Color(0xffb347);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x151b20,
      roughness: 0.72,
      metalness: 0.32
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      emissive: trimColor.clone().multiplyScalar(0.45),
      emissiveIntensity: 0.8,
      roughness: 0.42,
      metalness: 0.2
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0d1216,
      roughness: 0.55,
      metalness: 0.5
    });

    const model = new THREE.Group();
    model.name = 'classic-block-operator';
    model.userData.soldierKind = KIND;

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.34, 0.7, 10), bodyMat);
    torso.position.y = 1.14;
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.42), trimMat);
    vest.position.y = 1.16;
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.18), darkMat);
    backpack.position.set(0, 1.18, 0.27);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), bodyMat);
    head.position.y = 1.64;
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      trimMat
    );
    helmet.position.y = 1.66;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.09, 0.07), trimMat);
    visor.position.set(0, 1.63, -0.19);

    const legGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.64, 8);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.16, 0.42, 0);
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.16, 0.42, 0);
    const bootGeo = new THREE.BoxGeometry(0.19, 0.14, 0.32);
    const bootL = new THREE.Mesh(bootGeo, darkMat);
    bootL.position.set(-0.16, 0.08, -0.04);
    const bootR = new THREE.Mesh(bootGeo, darkMat);
    bootR.position.set(0.16, 0.08, -0.04);

    const armGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.52, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.37, 1.16, -0.02);
    armL.rotation.z = 0.16;
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.37, 1.14, -0.06);
    armR.rotation.z = -0.12;
    armR.rotation.x = -0.35;

    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.72), darkMat);
    rifle.position.set(0.28, 1.12, -0.32);
    const rifleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.26), trimMat);
    rifleTrim.position.set(0.28, 1.2, -0.42);

    const parts = [
      torso, vest, backpack, head, helmet, visor,
      legL, legR, bootL, bootR, armL, armR, rifle, rifleTrim
    ];
    for (const mesh of parts) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.userData.classicAvatarPart = true;
    }
    model.add(...parts);

    const preview = config.preview === true;
    if (preview) {
      model.scale.setScalar(1.08);
      trimMat.emissiveIntensity = 1.05;
    }

    const torsoBaseY = torso.position.y;
    const headBaseY = head.position.y;
    let elapsed = 0;
    let walk = 0;

    const rig = {
      update(dt, state) {
        const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
        const moving = !!(state && state.moving);
        const sprint = !!(state && state.sprint);
        elapsed += step;
        walk += step * (moving ? (sprint ? 14 : 9) : 2);
        const swing = moving ? Math.sin(walk) * 0.5 : Math.sin(elapsed * 1.4) * 0.018;
        legL.rotation.x = swing;
        legR.rotation.x = -swing;
        armL.rotation.x = -swing * 0.5;
        armR.rotation.x = -0.35 + swing * 0.18;
        torso.position.y = torsoBaseY + (moving ? Math.abs(Math.sin(walk * 2)) * 0.012 : 0);
        vest.position.y = torso.position.y + 0.02;
        head.position.y = headBaseY + (moving ? Math.abs(Math.sin(walk * 2)) * 0.008 : 0);
        helmet.position.y = head.position.y + 0.02;
        visor.position.y = head.position.y - 0.01;
      }
    };
    rig.update(0.016, { moving: false, sprint: false });

    return {
      model,
      rig,
      kind: KIND,
      preview,
      dispose() {
        for (const mesh of parts) {
          if (mesh.geometry) mesh.geometry.dispose();
        }
        bodyMat.dispose();
        trimMat.dispose();
        darkMat.dispose();
      }
    };
  }

  window.ClassicAvatar = {
    kinds: [KIND],
    normalize(value) {
      return value === KIND ? KIND : 'male';
    },
    create,
    whenReady(kind) {
      if (kind !== KIND) return Promise.resolve(false);
      if (three()) return Promise.resolve(true);
      return new Promise((resolve) => {
        const startedAt = performance.now();
        const check = () => {
          if (three()) {
            resolve(true);
            return;
          }
          if (performance.now() - startedAt > 20000 || window.__fatal) {
            resolve(false);
            return;
          }
          window.setTimeout(check, 120);
        };
        check();
      });
    },
    isReady(kind) {
      return kind === KIND && !!three();
    }
  };
})();
