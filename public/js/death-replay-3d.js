(() => {
  'use strict';

  const state = {
    THREE: null,
    canvas: null,
    renderer: null,
    scene: null,
    camera: null,
    playback: null,
    active: false,
    lost: false,
    cameraReady: false,
    lastProgress: 0,
    resizeBound: false
  };

  function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function lerp(a, b, k) {
    return a + (b - a) * k;
  }

  function makeRng(seed) {
    let value = (Number(seed) || 1) >>> 0;
    return function next() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pointFrom(value, fallbackY) {
    if (!value) return null;
    const x = Number(value.x);
    const z = Number(value.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return {
      x,
      y: finite(value.y, fallbackY || 0),
      z
    };
  }

  function sampleTrail(points, time) {
    if (!points || !points.length) return null;
    if (time <= points[0].t) return { ...points[0] };
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      if (time > b.t) continue;
      const span = b.t - a.t;
      const k = span > 0 ? clamp((time - a.t) / span, 0, 1) : 1;
      const yawA = finite(a.yaw, 0);
      const yawB = finite(b.yaw, yawA);
      const delta = ((yawB - yawA + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      return {
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        z: a.z + (b.z - a.z) * k,
        yaw: yawA + delta * k,
        t: time
      };
    }
    return { ...points[points.length - 1] };
  }

  function disposeTree(root) {
    if (!root) return;
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    root.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      const list = node.material
        ? (Array.isArray(node.material) ? node.material : [node.material])
        : [];
      for (const mat of list) {
        if (!mat) continue;
        materials.add(mat);
        for (const key of Object.keys(mat)) {
          const value = mat[key];
          if (value && value.isTexture) textures.add(value);
        }
      }
    });
    for (const geometry of geometries) {
      try { geometry.dispose(); } catch (err) { /* ignore */ }
    }
    for (const mat of materials) {
      try { mat.dispose(); } catch (err) { /* ignore */ }
    }
    for (const texture of textures) {
      try { texture.dispose(); } catch (err) { /* ignore */ }
    }
  }

  function clearScene() {
    if (state.scene) {
      for (const child of state.scene.children.slice()) {
        state.scene.remove(child);
        disposeTree(child);
      }
    }
    state.playback = null;
    state.scene = null;
    state.cameraReady = false;
  }

  function canvasTexture(THREE, canvas, repeatX, repeatY) {
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    if (repeatX || repeatY) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX || 1, repeatY || 1);
    }
    texture.anisotropy = 2;
    return texture;
  }

  function makeAsphaltTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#172329';
    ctx.fillRect(0, 0, 512, 512);
    const rng = makeRng(49217);
    for (let i = 0; i < 14000; i += 1) {
      const shade = 27 + Math.floor(rng() * 30);
      const alpha = 0.1 + rng() * 0.22;
      ctx.fillStyle = 'rgba(' + shade + ',' + (shade + 5) + ',' + (shade + 7) + ',' + alpha + ')';
      const size = rng() > 0.9 ? 2.4 : 1.1;
      ctx.fillRect(rng() * 512, rng() * 512, size, size);
    }
    ctx.strokeStyle = 'rgba(111, 139, 145, 0.18)';
    ctx.lineWidth = 1;
    for (let y = 24; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 183, 80, 0.17)';
    ctx.lineWidth = 5;
    ctx.setLineDash([32, 34]);
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
    ctx.setLineDash([]);
    return canvasTexture(THREE, canvas, 13, 13);
  }

  function makeGlowTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,235,1)');
    grad.addColorStop(0.18, 'rgba(255,205,125,0.9)');
    grad.addColorStop(0.48, 'rgba(255,109,68,0.32)');
    grad.addColorStop(1, 'rgba(255,80,50,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return canvasTexture(THREE, canvas);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function makeLabel(THREE, text, color, role) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.font = '700 36px "Barlow Condensed", "Noto Sans SC", sans-serif';
    const label = String(text || '').slice(0, 22);
    const width = Math.min(470, Math.max(158, ctx.measureText(label).width + 58));
    const x = (512 - width) / 2;
    ctx.fillStyle = 'rgba(5, 10, 12, 0.82)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    roundedRect(ctx, x, 13, width, 55, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 256, 42, width - 32);
    if (role) {
      ctx.font = '600 20px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(223, 235, 236, 0.64)';
      ctx.fillText(String(role).slice(0, 20).toUpperCase(), 256, 90, width - 24);
    }
    const texture = canvasTexture(THREE, canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.85, 0.71, 1);
    sprite.position.y = 2.32;
    sprite.renderOrder = 8;
    return sprite;
  }

  function surfaceMaterial(THREE, color, options) {
    const config = options || {};
    return new THREE.MeshStandardMaterial({
      color,
      roughness: config.roughness != null ? config.roughness : 0.68,
      metalness: config.metalness != null ? config.metalness : 0.22,
      emissive: config.emissive != null ? config.emissive : 0x000000,
      emissiveIntensity: config.emissiveIntensity != null ? config.emissiveIntensity : 0
    });
  }

  function addBox(THREE, parent, size, position, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
    mesh.position.set(position[0], position[1], position[2]);
    parent.add(mesh);
    return mesh;
  }

  function createOperator(THREE, options) {
    const kind = options.kind || 'classic';
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);

    const accent = new THREE.Color(options.color || '#ffb347');
    const suit = surfaceMaterial(THREE, kind === 'female' ? 0x172126 : 0x151b20, {
      roughness: 0.7,
      metalness: 0.24
    });
    const trim = surfaceMaterial(THREE, accent, {
      emissive: accent.clone().multiplyScalar(0.4),
      emissiveIntensity: 0.72,
      roughness: 0.42,
      metalness: 0.2
    });
    const dark = surfaceMaterial(THREE, 0x080d10, { roughness: 0.5, metalness: 0.48 });
    const visor = surfaceMaterial(THREE, 0x94ecff, {
      emissive: 0x3acce8,
      emissiveIntensity: 1.2,
      roughness: 0.25,
      metalness: 0.3
    });

    const rig = {
      kind,
      body,
      legs: [],
      arms: [],
      head: null,
      rotors: [],
      stride: 0
    };

    if (kind === 'hound') {
      addBox(THREE, body, [0.52, 0.28, 1.02], [0, 0.57, 0], suit);
      addBox(THREE, body, [0.38, 0.15, 0.76], [0, 0.75, -0.02], trim);
      rig.head = addBox(THREE, body, [0.33, 0.24, 0.42], [0, 0.66, -0.62], suit);
      const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 8), visor);
      sensor.position.set(0, 0.69, -0.84);
      body.add(sensor);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.48, 7), dark);
          leg.position.set(sx * 0.22, 0.31, sz * 0.34);
          leg.rotation.z = sx * 0.18;
          body.add(leg);
          rig.legs.push(leg);
        }
      }
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5), trim);
      antenna.position.set(0.17, 0.94, 0.22);
      body.add(antenna);
    } else if (kind === 'drone') {
      addBox(THREE, body, [0.48, 0.18, 0.72], [0, 0.72, 0], suit);
      addBox(THREE, body, [0.34, 0.08, 0.54], [0, 0.82, 0], trim);
      const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), visor);
      sensor.position.set(0, 0.61, -0.2);
      body.add(sensor);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const arm = addBox(THREE, body, [0.46, 0.035, 0.045], [sx * 0.36, 0.76, sz * 0.28], dark);
          arm.rotation.y = sx * sz * 0.46;
          const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 18), trim);
          rotor.position.set(sx * 0.57, 0.79, sz * 0.43);
          body.add(rotor);
          rig.rotors.push(rotor);
        }
      }
    } else {
      const slim = kind === 'female' ? 0.9 : 1;
      addBox(THREE, body, [0.58 * slim, 0.68, 0.36], [0, 1.13, 0], suit);
      addBox(THREE, body, [0.66 * slim, 0.39, 0.42], [0, 1.16, -0.01], trim);
      addBox(THREE, body, [0.34, 0.4, 0.18], [0, 1.16, 0.25], dark);
      rig.head = new THREE.Mesh(new THREE.SphereGeometry(0.205, 14, 10), suit);
      rig.head.position.set(0, 1.66, 0);
      body.add(rig.head);
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
        trim
      );
      helmet.position.set(0, 1.69, 0);
      body.add(helmet);
      addBox(THREE, body, [0.3, 0.075, 0.055], [0, 1.65, -0.19], visor);

      for (const sx of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.7, 0.23), suit);
        leg.position.set(sx * 0.16, 0.42, 0);
        body.add(leg);
        rig.legs.push(leg);
        addBox(THREE, body, [0.2, 0.15, 0.32], [sx * 0.16, 0.08, -0.04], dark);
      }
      for (const sx of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.55, 0.19), suit);
        arm.position.set(sx * 0.36, 1.12, -0.02);
        arm.rotation.z = sx * -0.08;
        body.add(arm);
        rig.arms.push(arm);
      }
      const rifle = addBox(THREE, body, [0.09, 0.14, 0.76], [0.25, 1.1, -0.37], dark);
      rifle.rotation.x = -0.05;
      addBox(THREE, body, [0.11, 0.055, 0.29], [0.25, 1.18, -0.47], trim);
    }

    group.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = false;
        node.userData.replayProp = true;
      }
    });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.65, 36),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.018;
    ring.renderOrder = 3;
    group.add(ring);
    rig.ring = ring;

    const label = makeLabel(THREE, options.label || '', options.color || '#ffb347', options.role || '');
    if (label) {
      label.position.y = kind === 'drone' ? 2.12 : 2.34;
      group.add(label);
      rig.label = label;
    }
    return { group, rig };
  }

  function createContainer(THREE, rng, center, groundY, blocked) {
    const palette = [0x633a2f, 0x244b50, 0x6b5a29, 0x2d3e61, 0x4b2d35, 0x34433a];
    const color = palette[Math.floor(rng() * palette.length)];
    const width = 2.15 + rng() * 0.35;
    const height = 2.35 + rng() * 0.35;
    const depth = 4.8 + rng() * 2.9;
    const angle = rng() * Math.PI * 2;
    const radius = 7 + rng() * 38;
    const x = center.x + Math.cos(angle) * radius;
    const z = center.z + Math.sin(angle) * radius;
    if (blocked(x, z, 4.6)) return null;

    const group = new THREE.Group();
    const baseMat = surfaceMaterial(THREE, color, { roughness: 0.86, metalness: 0.24 });
    const trim = surfaceMaterial(THREE, new THREE.Color(color).multiplyScalar(1.45), {
      roughness: 0.7,
      metalness: 0.3
    });
    const box = addBox(THREE, group, [width, height, depth], [0, height / 2, 0], baseMat);
    box.castShadow = true;
    box.receiveShadow = true;
    addBox(THREE, group, [width + 0.035, 0.08, depth + 0.035], [0, height - 0.09, 0], trim);
    addBox(THREE, group, [width + 0.02, 0.06, depth + 0.02], [0, 0.14, 0], trim);
    if (rng() > 0.46) {
      const upper = addBox(THREE, group, [width, height * 0.92, depth], [0, height + height * 0.46, 0], baseMat);
      upper.castShadow = true;
      upper.receiveShadow = true;
    }
    group.position.set(x, groundY, z);
    group.rotation.y = Math.round(rng() * 4) * Math.PI / 2;
    return group;
  }

  function addCrane(THREE, scene, x, z, groundY, rotation) {
    const crane = new THREE.Group();
    const steel = surfaceMaterial(THREE, 0x24363b, { roughness: 0.58, metalness: 0.72 });
    const signal = surfaceMaterial(THREE, 0x6e2f25, {
      emissive: 0x4a120b,
      emissiveIntensity: 1.1,
      roughness: 0.5,
      metalness: 0.6
    });
    for (const sx of [-1, 1]) {
      addBox(THREE, crane, [0.4, 17, 0.4], [sx * 2.8, 8.5, 0], steel);
      addBox(THREE, crane, [0.32, 0.32, 9.5], [sx * 2.8, 16.9, 0], steel);
    }
    addBox(THREE, crane, [6.2, 0.55, 0.55], [0, 16.9, 0], steel);
    addBox(THREE, crane, [0.48, 0.48, 23], [2.8, 18.1, 5.6], steel);
    addBox(THREE, crane, [2.1, 1.15, 1.5], [-1.1, 16.2, 0], signal);
    addBox(THREE, crane, [0.055, 7.5, 0.055], [2.8, 13.9, 13.5], steel);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff6b43 })
    );
    lamp.position.set(2.8, 18.55, -2.8);
    crane.add(lamp);
    crane.position.set(x, groundY, z);
    crane.rotation.y = rotation;
    crane.traverse((node) => {
      if (node.isMesh) node.castShadow = false;
    });
    scene.add(crane);
  }

  function addLightTower(THREE, scene, x, z, groundY) {
    const tower = new THREE.Group();
    const steel = surfaceMaterial(THREE, 0x1d2b30, { roughness: 0.6, metalness: 0.66 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, 9.2, 7), steel);
    pole.position.y = 4.6;
    tower.add(pole);
    addBox(THREE, tower, [1.5, 0.12, 0.12], [0, 9.18, 0], steel);
    for (const px of [-0.55, 0.55]) {
      const bulb = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.16, 0.24),
        new THREE.MeshBasicMaterial({ color: 0xffe3a6 })
      );
      bulb.position.set(px, 9.06, 0);
      tower.add(bulb);
    }
    tower.position.set(x, groundY, z);
    tower.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.userData.replayProp = true;
      }
    });
    scene.add(tower);
  }

  function addSky(THREE, scene) {
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x02070b) },
        horizonColor: { value: new THREE.Color(0x163039) },
        lowColor: { value: new THREE.Color(0x35231d) }
      },
      vertexShader: [
        'varying vec3 vWorld;',
        'void main() {',
        '  vec4 world = modelMatrix * vec4(position, 1.0);',
        '  vWorld = world.xyz;',
        '  gl_Position = projectionMatrix * viewMatrix * world;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 topColor;',
        'uniform vec3 horizonColor;',
        'uniform vec3 lowColor;',
        'varying vec3 vWorld;',
        'void main() {',
        '  float h = normalize(vWorld).y * 0.5 + 0.5;',
        '  vec3 color = mix(lowColor, horizonColor, smoothstep(0.42, 0.55, h));',
        '  color = mix(color, topColor, smoothstep(0.54, 0.94, h));',
        '  gl_FragColor = vec4(color, 1.0);',
        '}'
      ].join('\n')
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 28, 16), skyMaterial);
    sky.frustumCulled = false;
    scene.add(sky);
  }

  function addDust(THREE, scene, center, groundY) {
    const count = 140;
    const positions = new Float32Array(count * 3);
    const rng = makeRng(88133);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = center.x + (rng() - 0.5) * 34;
      positions[i * 3 + 1] = groundY + 0.2 + rng() * 8;
      positions[i * 3 + 2] = center.z + (rng() - 0.5) * 34;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xc9b390,
        size: 0.055,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    points.frustumCulled = false;
    scene.add(points);
    return points;
  }

  function buildScene(THREE, data) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x081419, 0.017);
    addSky(THREE, scene);

    const killerPoints = data.points || [];
    const victimPoints = data.victimPoints || [];
    const victim = pointFrom(data.victim, data.groundY) || { x: 0, y: 0, z: 0 };
    const end = pointFrom(data.killer, victim.y) || victim;
    const victimStart = pointFrom(victimPoints[0], victim.y) || victim;
    const killerStart = pointFrom(killerPoints[0], end.y) || end;
    const groundY = finite(data.groundY, finite(victim.y, 0)) - 0.015;
    const center = {
      x: (victim.x + end.x) / 2,
      z: (victim.z + end.z) / 2
    };

    scene.add(new THREE.HemisphereLight(0x9cc7d4, 0x10191c, 1.05));
    scene.add(new THREE.AmbientLight(0x49626c, 0.52));
    const moon = new THREE.DirectionalLight(0xd4edf5, 2.15);
    moon.position.set(center.x - 20, groundY + 28, center.z - 14);
    moon.target.position.set(center.x, groundY, center.z);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -28;
    moon.shadow.camera.right = 28;
    moon.shadow.camera.top = 28;
    moon.shadow.camera.bottom = -28;
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 75;
    moon.shadow.bias = -0.0008;
    scene.add(moon, moon.target);

    const warm = new THREE.PointLight(0xff7b45, 46, 32, 2);
    warm.position.set(victim.x + 5, groundY + 4, victim.z + 5);
    scene.add(warm);
    const cool = new THREE.PointLight(0x91cce0, 38, 38, 2);
    cool.position.set(center.x - 6, groundY + 8, center.z + 5);
    scene.add(cool);

    const asphalt = makeAsphaltTexture(THREE);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: asphalt ? 0xffffff : 0x131c20,
      map: asphalt || null,
      roughness: 0.97,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(center.x, groundY, center.z);
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(110, 55, 0x29434a, 0x18272c);
    grid.position.set(center.x, groundY + 0.012, center.z);
    if (grid.material) {
      grid.material.transparent = true;
      grid.material.opacity = 0.28;
      grid.material.depthWrite = false;
    }
    scene.add(grid);

    const laneMaterial = new THREE.MeshBasicMaterial({
      color: 0xb08a43,
      transparent: true,
      opacity: 0.26,
      depthWrite: false
    });
    for (let i = -4; i <= 4; i += 1) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.12), laneMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(center.x + i * 5.2, groundY + 0.018, center.z);
      scene.add(dash);
    }

    const rng = makeRng(Math.round((victim.x + victim.z + end.x + end.z) * 113 + 701));
    const path = killerPoints.concat(victimPoints).map((point) => ({
      x: finite(point.x, 0),
      z: finite(point.z, 0)
    }));
    function blocked(x, z, radius) {
      for (const point of path) {
        if (Math.hypot(x - point.x, z - point.z) < radius) return true;
      }
      return Math.hypot(x - victim.x, z - victim.z) < radius ||
        Math.hypot(x - end.x, z - end.z) < radius;
    }
    for (let i = 0; i < 58; i += 1) {
      const container = createContainer(THREE, rng, center, groundY, blocked);
      if (container) scene.add(container);
    }

    addCrane(THREE, scene, center.x - 35, center.z - 31, groundY, 0.34);
    addCrane(THREE, scene, center.x + 42, center.z - 18, groundY, -0.82);
    addLightTower(THREE, scene, center.x - 12, center.z + 17, groundY);
    addLightTower(THREE, scene, center.x + 18, center.z - 14, groundY);

    const victimActor = createOperator(THREE, {
      kind: data.victimKind || 'classic',
      color: data.victimColor || '#9fe8ff',
      label: data.victimLabel || '',
      role: data.victimRole || ''
    });
    victimActor.group.position.set(victimStart.x, groundY, victimStart.z);
    victimActor.group.rotation.y = finite(data.victimYaw, 0);
    scene.add(victimActor.group);

    const killerActor = createOperator(THREE, {
      kind: data.killerKind || 'classic',
      color: data.killerColor || '#ff5a40',
      label: data.killerLabel || '',
      role: data.killerRole || ''
    });
    killerActor.group.position.set(killerStart.x, groundY, killerStart.z);
    scene.add(killerActor.group);

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(killerPoints.length * 3), 3)
    );
    const trailLine = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffa34f,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    trailLine.frustumCulled = false;
    scene.add(trailLine);

    const victimTrailGeometry = new THREE.BufferGeometry();
    victimTrailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(victimPoints.length * 3), 3)
    );
    const victimTrailLine = new THREE.Line(
      victimTrailGeometry,
      new THREE.LineBasicMaterial({
        color: 0x8ee8ff,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    victimTrailLine.frustumCulled = false;
    scene.add(victimTrailLine);

    const tracer = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0)
      ]),
      new THREE.LineBasicMaterial({
        color: 0xffd49a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    tracer.frustumCulled = false;
    scene.add(tracer);

    const glow = makeGlowTexture(THREE);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow,
      color: 0xffbd78,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    flash.scale.set(1.1, 1.1, 1);
    scene.add(flash);

    const impact = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow,
      color: 0xff6245,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    impact.scale.set(1.4, 1.4, 1);
    scene.add(impact);

    const dust = addDust(THREE, scene, center, groundY);
    return {
      scene,
      data,
      victim,
      end,
      groundY,
      center,
      victimActor,
      killerActor,
      trailLine,
      victimTrailLine,
      victimPoints,
      killerPoints,
      tracer,
      flash,
      impact,
      dust,
      warm,
      cool,
      moon,
      current: null,
      previous: null,
      time: 0
    };
  }

  function ensureRenderer(canvas, THREE) {
    if (!canvas || !THREE) return false;
    if (state.renderer && state.canvas === canvas && state.THREE === THREE && !state.lost) {
      return true;
    }
    if (state.renderer) {
      try {
        state.renderer.dispose();
        state.renderer.forceContextLoss();
      } catch (err) { /* ignore */ }
      state.renderer = null;
      state.canvas = null;
      state.THREE = null;
    }
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
      if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.42;
      renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        state.lost = true;
      }, false);
      canvas.addEventListener('webglcontextrestored', () => {
        state.lost = false;
      }, false);
      state.renderer = renderer;
      state.canvas = canvas;
      state.THREE = THREE;
      state.lost = false;
      state.camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.08, 220);
      state.camera.up.set(0, 1, 0);
    } catch (err) {
      state.renderer = null;
      state.canvas = canvas;
      state.THREE = THREE;
      return false;
    }
    if (!state.resizeBound) {
      state.resizeBound = true;
      window.addEventListener('resize', layout, { passive: true });
    }
    return true;
  }

  function layout() {
    if (!state.renderer || !state.camera || !state.canvas) return;
    const rect = state.canvas.getBoundingClientRect();
    const width = Math.max(240, Math.round(rect.width || 640));
    const height = Math.max(135, Math.round(rect.height || width * 0.5625));
    state.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
  }

  function updateTrail(playback) {
    if (!playback || !playback.data) return;
    const update = (line, points) => {
      if (!line || !points || !points.length) return;
      const attribute = line.geometry.getAttribute('position');
      if (!attribute || attribute.count !== points.length) return;
      for (let i = 0; i < points.length; i += 1) {
        attribute.setXYZ(i, points[i].x, playback.groundY + 0.035, points[i].z);
      }
      attribute.needsUpdate = true;
    };
    update(playback.trailLine, playback.data.points);
    update(playback.victimTrailLine, playback.data.victimPoints);
  }

  function setActorPose(actor, moving, dt, phase) {
    if (!actor || !actor.rig) return;
    const rig = actor.rig;
    rig.stride += dt * (moving ? 9.5 : 1.8);
    const swing = moving ? Math.sin(rig.stride) * 0.55 : Math.sin(rig.stride * 0.7) * 0.025;
    if (rig.kind === 'drone') {
      for (const rotor of rig.rotors) rotor.rotation.y += dt * 42;
      actor.group.position.y += Math.sin(phase * 6.2) * 0.0035;
      return;
    }
    if (rig.kind === 'hound') {
      for (let i = 0; i < rig.legs.length; i += 1) {
        rig.legs[i].rotation.x = (i % 2 === 0 ? swing : -swing) * 0.85;
      }
      actor.group.position.y += Math.sin(phase * 8) * 0.003;
      return;
    }
    if (rig.legs.length >= 2) {
      rig.legs[0].rotation.x = swing;
      rig.legs[1].rotation.x = -swing;
    }
    if (rig.arms.length >= 2) {
      rig.arms[0].rotation.x = -swing * 0.45;
      rig.arms[1].rotation.x = -0.24 + swing * 0.16;
    }
    if (rig.body) {
      rig.body.position.y = moving ? Math.abs(Math.sin(rig.stride * 2)) * 0.018 : 0;
    }
  }

  function orientActor(group, dx, dz) {
    if (!group || Math.hypot(dx, dz) < 0.001) return;
    group.rotation.y = Math.atan2(dx, dz) + Math.PI;
  }

  function actorY(actor, sample, groundY) {
    if (!actor || !actor.rig || actor.rig.kind !== 'drone') return groundY;
    const altitude = finite(sample && sample.y, groundY) - groundY;
    return groundY + Math.max(0.25, altitude);
  }

  function updateCamera(playback, progress, dt) {
    const killer = playback.killerActor.group.position;
    const victim = playback.victimActor.group.position;
    const current = playback.current || { x: killer.x, z: killer.z };
    const previous = playback.previous || current;
    let dirX = current.x - previous.x;
    let dirZ = current.z - previous.z;
    if (Math.hypot(dirX, dirZ) < 0.06) {
      dirX = victim.x - current.x;
      dirZ = victim.z - current.z;
    }
    const dirLength = Math.max(0.001, Math.hypot(dirX, dirZ));
    dirX /= dirLength;
    dirZ /= dirLength;
    const rightX = -dirZ;
    const rightZ = dirX;
    const orbit = Math.sin(progress * Math.PI * 0.82) * 0.78;
    const distance = 4.25 - smoothstep(0.5, 1, progress) * 0.9;
    const desiredX = current.x - dirX * distance + rightX * (0.96 + orbit);
    const desiredZ = current.z - dirZ * distance + rightZ * (0.96 + orbit);
    const desiredY = playback.groundY + 1.92 + Math.sin(progress * Math.PI) * 0.3;
    const shake = progress > 0.88 ? (1 - progress) * 0.75 : 0;
    const targetX = lerp(current.x, victim.x, smoothstep(0.58, 0.98, progress) * 0.72);
    const targetZ = lerp(current.z, victim.z, smoothstep(0.58, 0.98, progress) * 0.72);
    const targetY = playback.groundY + 1.13;

    if (!state.cameraReady) {
      state.camera.position.set(desiredX, desiredY, desiredZ);
      state.cameraReady = true;
    } else {
      const ease = 1 - Math.exp(-Math.max(0.001, dt) * 7.5);
      state.camera.position.x = lerp(state.camera.position.x, desiredX, ease);
      state.camera.position.y = lerp(state.camera.position.y, desiredY, ease);
      state.camera.position.z = lerp(state.camera.position.z, desiredZ, ease);
    }
    state.camera.position.x += (Math.random() - 0.5) * shake * 0.018;
    state.camera.position.y += (Math.random() - 0.5) * shake * 0.014;
    state.camera.lookAt(targetX, targetY, targetZ);
  }

  function render(progress, dt) {
    if (!state.active || !state.renderer || !state.scene || !state.camera || !state.playback) return false;
    if (state.lost) return false;
    const p = clamp(finite(progress, 0), 0, 1);
    const step = clamp(finite(dt, 1 / 60), 0.001, 0.08);
    const playback = state.playback;
    playback.time += step;

    const data = playback.data;
    const startAt = finite(data.startAt, 0);
    const endAt = finite(data.endAt, startAt + 1);
    const playTime = startAt + (endAt - startAt) * p;
    const current = sampleTrail(data.points, playTime) || {
      x: playback.end.x,
      y: playback.end.y,
      z: playback.end.z,
      yaw: 0
    };
    const victimCurrent = sampleTrail(data.victimPoints, playTime) || playback.victim;
    playback.previous = playback.current || current;
    playback.current = current;
    playback.victimPrevious = playback.victimCurrent || victimCurrent;
    playback.victimCurrent = victimCurrent;

    playback.killerActor.group.position.set(
      current.x,
      actorY(playback.killerActor, current, playback.groundY),
      current.z
    );
    const prev = playback.previous;
    if (Number.isFinite(current.yaw)) {
      playback.killerActor.group.rotation.y = current.yaw;
    } else {
      orientActor(playback.killerActor.group, current.x - prev.x, current.z - prev.z);
    }
    setActorPose(
      playback.killerActor,
      Math.hypot(current.x - prev.x, current.z - prev.z) > 0.002,
      step,
      playback.time
    );

    playback.victimActor.group.position.set(
      victimCurrent.x,
      actorY(playback.victimActor, victimCurrent, playback.groundY),
      victimCurrent.z
    );
    if (Number.isFinite(victimCurrent.yaw)) {
      playback.victimActor.group.rotation.y = victimCurrent.yaw;
    }
    const victimPrev = playback.victimPrevious;
    const fall = smoothstep(0.93, 1, p);
    const victimRig = playback.victimActor.rig;
    setActorPose(
      playback.victimActor,
      Math.hypot(victimCurrent.x - victimPrev.x, victimCurrent.z - victimPrev.z) > 0.002,
      step,
      playback.time + 1.4
    );
    if (victimRig && victimRig.body) {
      victimRig.body.rotation.x = -fall * 1.22;
      victimRig.body.rotation.z = fall * 0.24;
      victimRig.body.position.y = -fall * 0.24;
    }

    updateTrail(playback);
    if (playback.dust) playback.dust.rotation.y += step * 0.012;
    if (playback.warm) playback.warm.intensity = 44 + Math.sin(playback.time * 3.4) * 5;

    let shot = 0;
    let shotEvent = null;
    for (const event of data.shots || []) {
      const age = Math.abs(playTime - finite(event.t, -Infinity));
      if (age > 150) continue;
      const power = Math.exp(-age / 34);
      if (power > shot) {
        shot = power;
        shotEvent = event;
      }
    }
    let hit = 0;
    for (const event of data.hits || []) {
      const age = Math.abs(playTime - finite(event.t, -Infinity));
      if (age > 220) continue;
      hit = Math.max(hit, Math.exp(-age / 64));
    }
    const target = playback.victimActor.group.position;
    const origin = shotEvent && shotEvent.origin
      ? shotEvent.origin
      : { x: current.x, y: playback.groundY + 1.18, z: current.z };
    const dirLength = shotEvent && shotEvent.dir
      ? Math.hypot(finite(shotEvent.dir.x, 0), finite(shotEvent.dir.y, 0), finite(shotEvent.dir.z, 0))
      : 0;
    let endX = target.x;
    let endY = playback.groundY + 1.05;
    let endZ = target.z;
    if (dirLength > 0.0001) {
      const dirX = finite(shotEvent.dir.x, 0) / dirLength;
      const dirY = finite(shotEvent.dir.y, 0) / dirLength;
      const dirZ = finite(shotEvent.dir.z, 0) / dirLength;
      const toX = target.x - origin.x;
      const toY = playback.groundY + 1.05 - origin.y;
      const toZ = target.z - origin.z;
      const along = clamp(toX * dirX + toY * dirY + toZ * dirZ, 2.4, 90);
      endX = origin.x + dirX * along;
      endY = origin.y + dirY * along;
      endZ = origin.z + dirZ * along;
    }
    playback.flash.position.set(origin.x, origin.y, origin.z);
    playback.flash.material.opacity = shot * 0.95;
    playback.flash.scale.setScalar(0.65 + shot * 0.6);
    playback.tracer.material.opacity = shot * 0.82;
    const tracerPositions = playback.tracer.geometry.getAttribute('position');
    if (tracerPositions) {
      tracerPositions.setXYZ(0, origin.x, origin.y, origin.z);
      tracerPositions.setXYZ(1, endX, endY, endZ);
      tracerPositions.needsUpdate = true;
    }
    playback.impact.position.set(
      hit > 0.08 ? target.x : endX,
      hit > 0.08 ? playback.groundY + 1.05 : endY,
      hit > 0.08 ? target.z : endZ
    );
    playback.impact.material.opacity = Math.max(shot * 0.8, hit * 0.9);
    playback.impact.scale.setScalar(0.8 + Math.max(shot, hit) * 1.1);

    if (victimRig && victimRig.ring) {
      victimRig.ring.material.opacity = 0.42 + Math.sin(playback.time * 4.2) * 0.12;
    }
    if (playback.killerActor.rig && playback.killerActor.rig.ring) {
      playback.killerActor.rig.ring.material.opacity = 0.52 + Math.sin(playback.time * 5.6) * 0.16;
    }

    updateCamera(playback, p, step);
    state.renderer.render(state.scene, state.camera);
    state.lastProgress = p;
    return true;
  }

  function play(canvas, THREE, data) {
    if (!data) return false;
    if (!ensureRenderer(canvas, THREE)) {
      state.active = false;
      return false;
    }
    clearScene();
    try {
      state.playback = buildScene(THREE, data);
      state.scene = state.playback.scene;
      state.active = true;
      state.cameraReady = false;
      state.lastProgress = 0;
      layout();
      render(0.001, 1 / 60);
      return true;
    } catch (err) {
      console.error('[death-replay-3d] scene build failed', err);
      clearScene();
      state.active = false;
      return false;
    }
  }

  function stop() {
    state.active = false;
    state.cameraReady = false;
    clearScene();
  }

  window.SaltDeathReplay3D = {
    play,
    render,
    stop,
    resize: layout,
    get active() {
      return state.active;
    },
    get available() {
      return !!state.renderer && !state.lost;
    }
  };
})();
