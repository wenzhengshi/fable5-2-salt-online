(() => {
  'use strict';

  const zone = window.SaltQingyunZone;
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
        script.src = assets + 'qingyun-renderer.js?v=5';
        document.head.appendChild(script);
      });
      loading = Promise.all([
        renderer,
        fetchAsset('qingyun-models.b64', 'text'),
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
    const gate = new THREE.Group();
    gate.name = 'qingyun-time-tunnel';
    gate.position.set(zone.gate.x, zone.gate.y, zone.gate.z);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 1.9, 2.8) });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .095, 12, 80), ringMaterial);
    ring.scale.y = 1.12;
    gate.add(ring);
    const vortex = new THREE.Mesh(new THREE.CircleGeometry(1.23, 80), new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Vector3(.1, .9, 1.25) } },
      vertexShader: `
        varying vec2 portalUV;
        void main() {
          portalUV = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 tint;
        varying vec2 portalUV;
        void main() {
          vec2 p = portalUV * 2.0 - 1.0;
          float r = length(p);
          float angle = atan(p.y, p.x);
          float wave = sin(angle * 5.0 + r * 25.0 + time * 4.0);
          float spiral = pow(wave * .5 + .5, 4.0);
          float edge = smoothstep(.65, .96, r);
          vec3 color = mix(vec3(.025,.012,.12) + tint * .03, tint, spiral * .85 + edge * .15);
          gl_FragColor = vec4(color, (1.0-smoothstep(.96,1.0,r))*.97);
        }
      `
    }));
    vortex.scale.y = 1.12;
    gate.add(vortex);

    function signTexture(chinese, english) {
      const sign = document.createElement('canvas');
      sign.width = 512;
      sign.height = 96;
      const ctx = sign.getContext('2d');
      ctx.textAlign = 'center';
      ctx.font = 'bold 52px sans-serif';
      ctx.fillStyle = '#b9f4ff';
      ctx.shadowColor = '#18bcff';
      ctx.shadowBlur = 14;
      ctx.fillText(english === undefined || document.documentElement.lang !== 'en-US' ? chinese : english, 256, 68, 485);
      return new THREE.CanvasTexture(sign);
    }
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: signTexture('时空隧道', 'TIME RIFT'), depthWrite: false
    }));
    label.position.y = 1.76;
    label.scale.set(3.6, .675, 1);
    gate.add(label);
    gate.visible = false;
    scene.add(gate);
    const gateTitle = label.material.map;
    const connectingTitle = signTexture('正在连接…', 'CONNECTING…');

    const returnLabel = label.material.clone();
    returnLabel.map = signTexture('返回港口', 'RETURN TO PORT');

    const returnGates = [zone.returnGate, zone.mainReturnGate, zone.hubReturnGate].map((point, index) => {
      const portal = gate.clone();
      portal.name = ['qingyun-return-tunnel', 'qingyun-main-return-tunnel', 'qingyun-hub-return-tunnel'][index];
      portal.position.set(point.x, point.y + 1.45, point.z);
      portal.children.find(child => child.isSprite).material = returnLabel;
      scene.add(portal);
      return portal;
    });

    let map = null;
    let collision = null;
    let preparing = false;
    let lastRequest = -Infinity;
    let retryAfter = 0;
    let crossing = false;
    let inQingyun = false;
    let encounterCooldown = 0;
    let combatants = [];

    function prepare() {
      if (map || preparing || game.time.t < retryAfter) return;
      preparing = true;
      loadMap().then(async ([, models, meta]) => {
        const nextMap = await window.createQingyunMap(renderer, models, meta);
        collision = await window.createQingyunCollision(THREE, nextMap.collisionGeometry, zone.offsetZ, nextMap.terrainHeight);
        const landingCamera = camera.clone(false);
        landingCamera.position.set(zone.landing.x, zone.landing.y + 1.68, zone.landing.z - zone.offsetZ);
        landingCamera.lookAt(zone.landing.x, landingCamera.position.y, landingCamera.position.z + 1);
        try {
          await nextMap.warmup(landingCamera, game.quality.name);
        } catch (error) {
          console.warn('[qingyun] render warmup failed', error);
        }
        map = nextMap;
      }).catch(error => {
        retryAfter = game.time.t + 5;
        console.error('[qingyun] map load failed', error);
      }).finally(() => {
        preparing = false;
      });
    }

    function land(pos) {
      player.pos.set(pos.x, pos.y, pos.z);
      player.lastSafe.copy(player.pos);
      player.vel.set(0, 0, 0);
      player.onGround = true;
      player.yaw = Math.PI;
      player.pitch = 0;
      crossing = false;
      label.material.map = gateTitle;
      inQingyun = zone.contains(pos);
      lastRequest = game.time.t;
      if (inQingyun) map?.resetFrameHistory();
      player.syncView();
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

    function updateCombatants(dt) {
      if (combatants.some(unit => unit.alive)) {
        encounterCooldown = 12;
        return;
      }
      encounterCooldown -= dt;
      if (encounterCooldown > 0) return;
      const points = [[-5.5, 7.1, -35.8], [4.8, 9.6, -30.5], [0, 1.5, -4.8]];
      combatants = points.map(([x, y, z], index) => {
        const pos = new THREE.Vector3(x, y, z + zone.offsetZ);
        return game.enemies.spawn(index === 1 ? 'gull' : 'hound', pos, { patrolRadius: 6 });
      }).filter(Boolean);
      encounterCooldown = 12;
    }
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
        map.draw(mapCamera, dt, frameTime, game.quality.name, (renderCamera, target) => {
          actorCamera.position.copy(camera.position);
          actorCamera.quaternion.copy(camera.quaternion);
          actorCamera.projectionMatrix.copy(renderCamera.projectionMatrix);
          actorCamera.projectionMatrixInverse.copy(renderCamera.projectionMatrixInverse);
          actorCamera.updateMatrixWorld(true);
          renderer.setRenderTarget(target);
          scene.updateMatrixWorld();
          scene.matrixWorldAutoUpdate = false;
          renderer.render(scene, actorCamera);
        });
        renderer.setRenderTarget(null);
        renderer.clearDepth();
        renderer.toneMapping = toneMapping;
        camera.updateMatrixWorld(true);
        viewCamera.matrixAutoUpdate = false;
        viewCamera.matrixWorldAutoUpdate = false;
        viewCamera.matrixWorld.copy(camera.matrixWorld);
        viewCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);
        renderer.render(scene, viewCamera);
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
      if (event.state === 'title' || event.state === 'intro') {
        inQingyun = false;
        combatants = [];
        encounterCooldown = 0;
      }
    });

    game.qingyun = {
      get active() { return inQingyun; },
      createTunnel(title, color) {
        const tunnel = gate.clone();
        const [rim, disc, name] = tunnel.children;
        const tint = new THREE.Color(color);
        rim.material = ringMaterial.clone();
        rim.material.color.copy(tint).multiplyScalar(2.25);
        disc.material = vortex.material.clone();
        disc.material.uniforms.tint.value.set(tint.r, tint.g, tint.b).multiplyScalar(1.65);
        name.material = label.material.clone();
        name.material.map = signTexture(title);
        name.material.color.copy(tint).lerp(new THREE.Color(0xffffff), .55);
        return tunnel;
      },
      get collision() { return collision; },
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
        if (game.game.state !== 'playing' || !player.alive || window.__saltBoat?.riding) {
          crossing = false;
          label.material.map = gateTitle;
          return;
        }
        if (active) {
          updateCombatants(dt);
          if (!zone.atReturnGate(player.pos) || game.time.t - lastRequest < .8) return;
          lastRequest = game.time.t;
          const mp = window.__mp;
          if (mp?.connected) {
            mp.syncState();
            mp.send({ type: 'qingyunReturn' });
          } else {
            land(zone.returnLanding);
          }
          return;
        }
        const distance = Math.hypot(player.pos.x - zone.gate.x, player.pos.z - zone.gate.z);
        if (distance < preloadDistance) prepare();
        const inside = zone.atGate(player.pos);
        crossing = inside || (crossing && distance < 2.5);
        label.material.map = !map && preparing && distance < 5 ? connectingTitle : gateTitle;
        if (!crossing || !map || game.time.t - lastRequest < .8) return;
        const mp = window.__mp;
        if (mp?.connected) {
          lastRequest = game.time.t;
          mp.syncState();
          mp.send({ type: 'qingyunEnter' });
        } else {
          land(zone.landing);
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
