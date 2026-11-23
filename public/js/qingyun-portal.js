(() => {
  'use strict';

  const zone = window.SaltQingyunZone;
  const arrival = window.SaltPortalArrival;
  const assets = '/maps/';
  let loading;

  async function fetchAsset(name, format) {
    const response = await fetch(assets + name);
    if (!response.ok) throw new Error(name + ': ' + response.status);
    return response[format]();
  }

  function loadMap() {
    if (!loading) {
      const script = document.createElement('script');
      const renderer = new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        script.src = assets + 'qingyun-renderer.js?v=8';
        document.head.appendChild(script);
      });
      loading = Promise.all([
        renderer,
        fetchAsset('qingyun-models.glb', 'arrayBuffer'),
        fetchAsset('qingyun-models.json', 'json')
      ]).catch(error => {
        loading = null;
        script.remove();
        throw error;
      });
    }
    return loading;
  }

  window.installQingyunPortal = function (game) {
    const { THREE, scene, camera, viewCamera, physics, player, renderer } = game;
    const preloadDistance = 52;
    const hold = arrival.holdPrompt();
    const visual = window.SaltPortalVisual;
    const bilingual = (zh,en) => document.documentElement.lang === 'en-US' ? en : zh;
    const signTexture = (zh,en) => visual.signTexture(THREE,bilingual(zh,en));
    const gate = visual.create(THREE,bilingual('时空隧道','TIME RIFT'),0x56e5ff,.82,true);
    gate.name = 'qingyun-time-tunnel';
    gate.position.set(zone.gate.x, zone.gate.y, zone.gate.z);
    const [ring,vortex,label] = gate.children;
    const ringMaterial=ring.material;
    gate.visible = false;
    scene.add(gate);
    const gateTitle = label.material.map;
    const connectingTitle = signTexture('正在连接…', 'CONNECTING…');

    const returnLabel = label.material.clone();
    returnLabel.map = signTexture('返回港口', 'RETURN TO PORT');

    const returnGates = [zone.returnGate, zone.mainReturnGate, zone.hubReturnGate].map((point, index) => {
      const portal = gate.clone();
      portal.name = ['qingyun-return-tunnel', 'qingyun-main-return-tunnel', 'qingyun-hub-return-tunnel'][index];
      portal.position.set(point.x, point.y + .06, point.z);
      portal.children.find(child => child.isSprite).material = returnLabel;
      scene.add(portal);
      return portal;
    });

    let map = null;
    let collision = null;
    let preparing = null;
    let lastRequest = -Infinity;
    let retryAfter = 0;
    let inQingyun = false;

    function preload({ warmup = true, foreground = false } = {}) {
      if (map) return Promise.resolve(map);
      if (preparing) return preparing;
      preparing = loadMap().then(async ([, models, meta]) => {
        const nextMap = await window.createQingyunMap(renderer, models, meta, { foreground });
        const nextCollision = await window.createQingyunCollision(THREE, nextMap.collisionGeometry, zone.offsetZ, nextMap.terrainHeight);
        if (warmup) {
          const landingCamera = camera.clone(false);
          landingCamera.position.set(zone.landing.x, zone.landing.y + 1.68, zone.landing.z - zone.offsetZ);
          landingCamera.lookAt(zone.landing.x, landingCamera.position.y, zone.landing.z - zone.offsetZ + 1);
          try {
            await nextMap.warmup(landingCamera, game.quality.name);
          } catch (error) {
            console.warn('[qingyun] render warmup failed', error);
          }
        }
        collision = nextCollision;
        map = nextMap;
        return map;
      }).finally(() => { preparing = null; });
      return preparing;
    }

    function prepare() {
      if (map || preparing || game.time.t < retryAfter) return;
      preload({ warmup: false }).catch(error => {
        retryAfter = game.time.t + 5;
        console.error('[qingyun] map load failed', error);
      });
    }

    function land(pos, animate = false) {
      player.pos.set(pos.x, pos.y, pos.z);
      player.lastSafe.copy(player.pos);
      player.vel.set(0, 0, 0);
      player.onGround = true;
      player.yaw = Math.PI;
      player.pitch = 0;
      hold(null);
      label.material.map = gateTitle;
      inQingyun = zone.contains(pos);
      lastRequest = game.time.t;
      if (inQingyun) map?.resetFrameHistory();
      player.syncView();
      if (animate) game.portalArrival?.start();
    }

    const oldRaycast = physics.raycast.bind(physics);
    physics.raycast = (origin, dir, range = 500) => inQingyun && zone.contains(origin) && collision
      ? collision.raycast(origin, dir, range) : oldRaycast(origin, dir, range);
    const oldGroundHeight = physics.groundHeight.bind(physics);
    physics.groundHeight = (x, z, y) => inQingyun && zone.contains({ z }) && collision
      ? collision.groundHeight(x, z, y) : oldGroundHeight(x, z, y);
    const oldMove = physics.moveCapsule.bind(physics);
    physics.moveCapsule = (pos, vel, ...args) => inQingyun && zone.contains(pos) && collision
      ? collision.moveCapsule(pos, vel, ...args) : oldMove(pos, vel, ...args);

    const nav = physics.nav;
    const oldWalkable = nav.isWalkable.bind(nav);
    const oldRandomPoint = nav.randomPoint.bind(nav);
    const oldFindPath = nav.findPath.bind(nav);
    function walkable(x, z, y = 12) {
      const floor = physics.groundHeight(x, z, y);
      return z > zone.bounds.minZ && z < zone.bounds.maxZ && !collision?.inLake(x, z) && floor > .24 && floor < y;
    }
    nav.isWalkable = (x, z) => zone.contains({ z }) ? walkable(x, z) : oldWalkable(x, z);
    nav.randomPoint = (origin, radius) => {
      if (!zone.contains(origin)) return oldRandomPoint(origin, radius);
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const x = origin.x + Math.cos(angle) * distance;
        const z = origin.z + Math.sin(angle) * distance;
        if (walkable(x, z)) return new THREE.Vector3(x, physics.groundHeight(x, z, 12), z);
      }
      return origin.clone();
    };
    nav.findPath = (from, to) => {
      if (!zone.contains(from)) return oldFindPath(from, to);
      return zone.contains(to) && walkable(to.x, to.z, to.y + .6) ? [to.clone()] : null;
    };

    const actorCamera = camera.clone(false);
    const mapCamera = camera.clone(false);
    const clearColor = new THREE.Color();
    const portRoots = () => [
      game.render.sky, game.level.root, game.backdrop.root, game.ground.root,
      scene.getObjectByName('saltline-external-combat-zone'), gate
    ].filter(Boolean);

    function drawQingyun(dt, frameTime) {
      for (const portal of returnGates) portal.visible = true;
      const hidden = portRoots().filter(object => object.visible);
      for (const object of hidden) object.visible = false;
      const clearAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clearColor);
      const toneMapping = renderer.toneMapping;
      const shadowAutoUpdate = renderer.shadowMap.autoUpdate;
      const matrices = scene.matrixWorldAutoUpdate;
      try {
        renderer.info.reset();
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = false;
        renderer.setClearColor(0, 0);
        renderer.toneMapping = THREE.NoToneMapping;
        mapCamera.position.copy(camera.position);
        mapCamera.position.z -= zone.offsetZ;
        mapCamera.quaternion.copy(camera.quaternion);
        mapCamera.fov = camera.fov;
        mapCamera.aspect = camera.aspect;
        const autoQuality = !!(window.__saltAutoQuality && window.__saltAutoQuality.auto);
        map.draw(mapCamera, dt, frameTime, game.quality.name, (renderCamera, target) => {
          actorCamera.position.copy(camera.position);
          actorCamera.quaternion.copy(camera.quaternion);
          actorCamera.projectionMatrix.copy(renderCamera.projectionMatrix);
          actorCamera.projectionMatrixInverse.copy(renderCamera.projectionMatrixInverse);
          actorCamera.updateMatrixWorld(true);
          renderer.setRenderTarget(target);
          // Hidden port scenery is not drawn on this map. Avoid walking that entire subtree.
          scene.updateWorldMatrix(false, false);
          for (const root of scene.children) if (root.visible) root.updateMatrixWorld(true);
          scene.matrixWorldAutoUpdate = false;
          renderer.render(scene, actorCamera);
        }, autoQuality);
        renderer.setRenderTarget(null);
        if (!game.frontier?.renderingThirdPerson) {
          renderer.toneMapping = toneMapping;
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
        renderer.toneMapping = toneMapping;
        renderer.shadowMap.autoUpdate = shadowAutoUpdate;
        renderer.setClearColor(clearColor, clearAlpha);
        renderer.setRenderTarget(null);
        for (const portal of returnGates) portal.visible = false;
        for (const object of hidden) object.visible = true;
      }
    }

    game.events.on('game:state', event => {
      if (event.state !== 'playing') hold(null);
      if (event.state === 'title' || event.state === 'intro') {
        inQingyun = false;
      }
    });

    game.qingyun = {
      get active() { return inQingyun; },
      get arrivalShelter() { return inQingyun && zone.inArrivalArea(player.pos); },
      createTunnel(title, color, upright = false, ellipse = .68) {
        return visual.create(THREE,title,color,ellipse,upright);
      },
      get collision() { return collision; },
      preload,
      land,
      suspend() {
        inQingyun = false;
        gate.visible = false;
      },
      update(dt) {
        const active = this.active;
        gate.visible = !active && game.game.state === 'playing';
        vortex.material.uniforms.time.value += dt;
        ringMaterial.color.setRGB(.16, 1.45 + Math.sin(game.time.t * 3) * .4, 2.4);
        if (game.game.state !== 'playing' || !player.alive || window.__saltBoat?.riding || game.sedan?.riding || game.portalArrival?.active) {
          hold(null);
          label.material.map = gateTitle;
          return;
        }
        if (active) {
          if (!hold(zone.atReturnGate(player.pos) ? 'return' : null, game.time.t, arrival.still(game)) ||
              game.time.t - lastRequest < .8) return;
          lastRequest = game.time.t;
          const mp = window.__mp;
          if (mp?.connected) {
            mp.syncState();
            mp.send({ type: 'qingyunReturn' });
          } else {
            land(zone.returnLanding, true);
          }
          return;
        }
        const distance = Math.hypot(player.pos.x - zone.gate.x, player.pos.z - zone.gate.z);
        if (distance < preloadDistance) prepare();
        const inside = zone.atGate(player.pos);
        label.material.map = !map && preparing && distance < 5 ? connectingTitle : gateTitle;
        if (!hold(inside ? 'enter' : null, game.time.t, arrival.still(game)) || !map ||
            game.time.t - lastRequest < .8) return;
        const mp = window.__mp;
        if (mp?.connected) {
          lastRequest = game.time.t;
          mp.syncState();
          mp.send({ type: 'qingyunEnter' });
        } else {
          land(zone.landing, true);
        }
      },
      render(dt, frameTime) {
        if (!this.active || !map) return false;
        drawQingyun(dt, frameTime);
        return true;
      }
    };
  };
})();
