(function (root) {
  'use strict';

  const X = -34;
  const Z = 78.5;
  const HALF = 11;
  const SHAFT = 3.5;
  const DECK = 3.38;
  const BASE = .32;
  const FLOORS = 18;
  const STOREY = 10;
  const SPEED = 2.8;
  const TRAVEL = (FLOORS - 1) * STOREY;
  const ONE_WAY_MS = TRAVEL / SPEED * 1000;
  const WAIT_MS = 60_000;
  const CYCLE_MS = WAIT_MS + 2 * ONE_WAY_MS;
  const EPOCH = Date.UTC(2026, 0, 1);

  function phaseAt(ms) {
    const elapsed = (ms - EPOCH) % CYCLE_MS;
    return elapsed < 0 ? elapsed + CYCLE_MS : elapsed;
  }

  function scheduleAt(ms) {
    const phase = phaseAt(ms);
    if (phase < WAIT_MS) return { top: BASE, seconds: Math.ceil((WAIT_MS - phase) / 1000) };
    const travel = phase - WAIT_MS;
    return { top: BASE + Math.min(travel, 2 * ONE_WAY_MS - travel) / 1000 * SPEED, seconds: 0 };
  }

  function velocityAt(ms) {
    const phase = phaseAt(ms);
    if (phase < WAIT_MS) return 0;
    return phase - WAIT_MS < ONE_WAY_MS ? SPEED : -SPEED;
  }

  function slabs() {
    const boxes = [];
    for (let i = 0; i < FLOORS; i++) {
      const y = BASE + i * STOREY;
      const underside = y - (i === 0 ? .8 : .62);
      boxes.push(
        [X-HALF, underside, Z-HALF, X-SHAFT, y, Z+HALF],
        [X+SHAFT, underside, Z-HALF, X+HALF, y, Z+HALF],
        [X-SHAFT, underside, Z-HALF, X+SHAFT, y, Z-SHAFT],
        [X-SHAFT, underside, Z+SHAFT, X+SHAFT, y, Z+HALF]
      );
    }
    return boxes;
  }

  function overlaps(x, z, dx = 0, dz = dx) {
    return Math.abs(x - X) <= HALF + dx && Math.abs(z - Z) <= HALF + dz;
  }

  function shelter(point, offset) {
    return overlaps(point.x, point.z - offset, .45) &&
      point.y >= BASE - .45 && point.y <= BASE + TRAVEL + STOREY;
  }

  function floorFor(x, y, z, dx = 0, dz = dx, tolerance = .08) {
    const index = Math.round((y - BASE) / STOREY);
    if (index < 0 || index >= FLOORS) return null;
    const floor = BASE + index * STOREY;
    if (Math.abs(x - X) + dx > HALF || Math.abs(z - Z) + dz > HALF ||
        Math.abs(y - floor) > tolerance ||
        (Math.abs(x - X) - dx < SHAFT && Math.abs(z - Z) - dz < SHAFT)) return null;
    return floor;
  }

  function carryHeight(pos, offset, previous, top, verticalSpeed, onGround) {
    if (Math.abs(pos.x - X) > DECK || Math.abs(pos.z - offset - Z) > DECK) return null;
    const standing = onGround && Math.abs(pos.y - previous) < .03 && verticalSpeed <= .07;
    const caught = top > previous && pos.y >= previous && pos.y <= top && verticalSpeed <= 0;
    return standing || caught ? top : null;
  }

  function makeNumber(THREE, floor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#353a3b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 72px monospace';
    ctx.fillText(String(floor).padStart(2, '0'), 64, 52);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  }

  function makeCountdown(THREE, group) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sign.name = 'bayhaven-lift-countdown';
    sign.position.set(X + 2.6, BASE + 1.9, Z - SHAFT - 1.2);
    sign.scale.set(3.6, 1.125, 1);
    sign.visible = false;
    group.add(sign);
    const title = document.documentElement.lang === 'en-US' ? 'GROUND FLOOR · DEPARTS IN' : '一楼停靠 · 距上升';
    let lastSecond = 0;
    return seconds => {
      if (seconds === lastSecond) return;
      lastSecond = seconds;
      sign.visible = seconds > 0;
      if (!sign.visible) return;
      const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
      const remainder = String(seconds % 60).padStart(2, '0');
      ctx.fillStyle = '#eeb04d';
      ctx.fillRect(0, 0, 512, 160);
      ctx.fillStyle = '#172025';
      ctx.fillRect(5, 5, 502, 150);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 27px sans-serif';
      ctx.fillStyle = '#fff3d7';
      ctx.fillText(title, 256, 39, 470);
      ctx.font = 'bold 75px monospace';
      ctx.fillStyle = '#ffd583';
      ctx.fillText(minutes + ':' + remainder, 256, 106);
      texture.needsUpdate = true;
    };
  }

  function mount(THREE, scene) {
    const group = new THREE.Group();
    group.name = 'bayhaven-coastal-observation-platform';
    const staticBoxes = slabs();
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b7b0, roughness: .97 });
    const floors = new THREE.InstancedMesh(unit, concrete, staticBoxes.length);
    floors.name = '18-cantilevered-concrete-decks';
    const boxTransform = new THREE.Matrix4();
    staticBoxes.forEach(([x0, y0, z0, x1, y1, z1], index) => {
      boxTransform.makeScale(x1 - x0, y1 - y0, z1 - z0);
      boxTransform.setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      floors.setMatrixAt(index, boxTransform);
      floors.setColorAt(index, new THREE.Color().setScalar(.92 + (Math.floor(index / 4) % 3) * .04));
    });
    group.add(floors);

    const numberPlane = new THREE.PlaneGeometry(1.6, 1.2).rotateX(-Math.PI / 2);
    for (let i = 0; i < FLOORS; i++) {
      const number = new THREE.Mesh(numberPlane, makeNumber(THREE, i + 1));
      number.position.set(X, BASE + i * STOREY + .012, Z - SHAFT - 1.2);
      group.add(number);
    }

    const platform = new THREE.Group();
    platform.name = 'bayhaven-moving-lift';
    platform.position.set(X, BASE, Z);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(DECK * 2, .42, DECK * 2),
      new THREE.MeshStandardMaterial({ color: 0x777c7a, roughness: .91 }));
    deck.position.y = -.21;
    platform.add(deck);
    const amber = new THREE.MeshStandardMaterial({ color: 0xeeb04d, emissive: 0x553100, roughness: .7 });
    const rim = new THREE.BoxGeometry(DECK * 2 - .32, .014, .11);
    for (let i = 0; i < 4; i++) {
      const strip = new THREE.Mesh(rim, amber);
      const angle = i * Math.PI / 2;
      strip.position.set(Math.sin(angle) * (DECK - .16), .009, Math.cos(angle) * (DECK - .16));
      strip.rotation.y = angle;
      platform.add(strip);
    }
    group.add(platform);
    const updateCountdown = makeCountdown(THREE, group);
    scene.add(group);

    const deckBox = [X-DECK, BASE-.42, Z-DECK, X+DECK, BASE, Z+DECK];
    const allBoxes = [...staticBoxes, deckBox];
    return {
      get top() { return deckBox[4]; },
      setTime(ms) {
        const { top, seconds } = scheduleAt(ms);
        deckBox[1] = top - .42;
        deckBox[4] = top;
        platform.position.y = top;
        updateCountdown(seconds);
        return top;
      },
      boxes(x0, z0, x1, z1) {
        const left = Math.min(x0, x1), right = Math.max(x0, x1);
        const near = Math.min(z0, z1), far = Math.max(z0, z1);
        if (!overlaps((left + right) / 2, (near + far) / 2, (right - left) / 2, (far - near) / 2)) return [];
        return allBoxes.filter(box => box[0] <= right && box[3] >= left && box[2] <= far && box[5] >= near);
      }
    };
  }

  const api = { X, Z, HALF, SHAFT, DECK, BASE, FLOORS, STOREY, SPEED, ONE_WAY_MS, WAIT_MS, EPOCH, scheduleAt, velocityAt, slabs,
    overlaps, shelter, floorFor, carryHeight, mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltBayhavenLift = api;
})(globalThis);
