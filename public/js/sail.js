(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const BOAT_ID = 'extraction-boat';
  const BOAT_SEATS = 4;
  const BOAT_BOARD_RADIUS = 8;
  const BOAT_WORLD_RADIUS = 715;
  const BOAT_MAX_SPEED = 29;
  const BOAT_DOCK = { x: 31.5, y: -1.565, z: 21, heading: -Math.PI / 2 };
  const BOAT_SEAT_OFFSETS = [
    { x: -1.1, z: 0, y: 0.46 },
    { x: 0.15, z: -1.02, y: 0.38 },
    { x: 0.15, z: 1.02, y: 0.38 },
    { x: 1.15, z: 0, y: 0.4 }
  ];
  const PLATFORM = Object.freeze({ x0: 82, x1: 126, z0: -12, z1: 28, top: 0.22 });
  const EXTERNAL_SPAWNS = Object.freeze([
    { x: 90, y: PLATFORM.top + 0.04, z: -5 },
    { x: 111, y: PLATFORM.top + 0.04, z: 21 },
    { x: 117, y: PLATFORM.top + 0.04, z: -5 },
    { x: 96, y: PLATFORM.top + 0.04, z: 18 }
  ]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const shortestAngle = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const normalizeAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const localeText = (source) => {
    try {
      const data = window.__SALT_I18N__;
      const map = data && data.messages && data.messages.gameText;
      return (map && map[source]) || source;
    } catch (error) {
      return source;
    }
  };

  window.__SALT_EXTERNAL_SPAWNS = EXTERNAL_SPAWNS;

  const state = {
    aboard: false,
    seat: -1,
    seatCount: 0,
    seats: new Array(BOAT_SEATS).fill(null),
    x: BOAT_DOCK.x,
    y: BOAT_DOCK.y,
    z: BOAT_DOCK.z,
    heading: BOAT_DOCK.heading,
    speed: 0,
    roll: 0,
    aimYaw: 0,
    aimPitch: 0.02,
    hudTime: 0,
    sendTime: 0,
    externalUnlocked: false,
    interactable: false,
    suppressAutoBoardUntil: 0,
    promptOwned: false,
    lastInviteAt: 0,
    lastInvite: null,
    initialized: false,
    zoneBuilt: false
  };
  const remote = {
    initialized: false,
    x: BOAT_DOCK.x,
    y: BOAT_DOCK.y,
    z: BOAT_DOCK.z,
    heading: BOAT_DOCK.heading,
    speed: 0
  };
  const touch = { forward: 0, back: 0, left: 0, right: 0, boost: 0 };
  const heldPointers = new Map();
  const roster = new Map();

  let G = null;
  let THREE = null;
  let mp = null;
  let attachedGame = false;
  let attachedNetwork = false;
  let wake = null;
  let wakeMaterial = null;
  let toastTimer = 0;
  let promptTimer = 0;
  let externalToastAt = 0;
  let zoneRoot = null;
  let boatBeacon = null;
  let lastRemoteSeatSignature = '';

  window.__saltBoat = {
    get riding() { return state.aboard; },
    get seat() { return state.seat; },
    get driver() { return state.aboard && state.seat === 0; },
    get externalUnlocked() { return state.externalUnlocked; },
    get boat() {
      return {
        x: state.x,
        y: state.y,
        z: state.z,
        heading: state.heading,
        speed: state.speed,
        seats: state.seats.slice()
      };
    },
    spawnPoints: EXTERNAL_SPAWNS,
    requestBoard: () => requestBoard(),
    requestLeave: () => requestLeave(),
    requestInvite: () => requestInvite()
  };

  const uiRoot = document.getElementById('ui');
  if (!uiRoot) return;
  const ui = document.createElement('div');
  ui.id = 'sail-ui';
  ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = `
    <div class="sail-top">
      <div class="sail-title"><i></i><div><span data-i18n="撤离船">撤离船</span><b data-i18n="盐线 · 外海">盐线 · 外海</b></div></div>
      <div class="sail-compass" aria-hidden="true">
        <div class="sail-tape"></div>
        <div class="sail-bearing"><span id="sail-dir">南</span><b id="sail-deg">180°</b></div>
      </div>
      <div class="sail-actions">
        <button class="sail-exit sail-invite-btn" data-sail="invite" type="button" data-i18n="邀请登船">邀请登船</button>
        <button class="sail-exit" data-sail="helm" type="button" hidden data-i18n="接管舵位">接管舵位</button>
        <button class="sail-exit" data-sail="leave" type="button" data-i18n="下船">下船</button>
      </div>
    </div>
    <div class="sail-toast" id="sail-toast"></div>
    <div class="sail-invite" id="sail-invite" hidden></div>
    <div class="sail-seats" id="sail-seats">撤离船 · 0 / 4</div>
    <div class="sail-speed"><span data-i18n="航速">航速</span><b id="sail-knots">0</b><em data-i18n="节">节</em><div class="sail-bar" id="sail-bar"><i></i></div></div>
    <div class="sail-map"><canvas id="sail-map" width="168" height="168"></canvas><div><span id="sail-coords">31, 21</span><b id="sail-zone">近港</b></div></div>
    <div class="sail-help" data-i18n="W / S 推进 · A / D 转向 · 鼠标瞄准射击 · Shift 加速 · E 下船">W / S 推进 · A / D 转向 · 鼠标瞄准射击 · Shift 加速 · E 下船</div>
    <button class="sail-interact" id="sail-interact" type="button">E · 登上撤离船</button>
    <div class="sail-touch">
      <div class="sail-pad">
        <button class="sail-btn" data-sail-hold="forward" type="button" aria-label="推进" data-i18n-aria="推进">▲</button>
        <button class="sail-btn" data-sail-hold="left" type="button" aria-label="左转" data-i18n-aria="左转">◀</button>
        <button class="sail-btn" data-sail-hold="back" type="button" aria-label="倒车" data-i18n-aria="倒车">▼</button>
        <button class="sail-btn" data-sail-hold="right" type="button" aria-label="右转" data-i18n-aria="右转">▶</button>
      </div>
      <button class="sail-btn boost" data-sail-hold="boost" type="button" aria-label="加速" data-i18n="加速" data-i18n-aria="加速">加速</button>
    </div>`;
  uiRoot.appendChild(ui);

  const els = {
    dir: ui.querySelector('#sail-dir'),
    deg: ui.querySelector('#sail-deg'),
    knots: ui.querySelector('#sail-knots'),
    bar: ui.querySelector('#sail-bar'),
    barFill: ui.querySelector('#sail-bar i'),
    coords: ui.querySelector('#sail-coords'),
    zone: ui.querySelector('#sail-zone'),
    toast: ui.querySelector('#sail-toast'),
    invite: ui.querySelector('#sail-invite'),
    seats: ui.querySelector('#sail-seats'),
    map: ui.querySelector('#sail-map'),
    interact: ui.querySelector('#sail-interact'),
    helm: ui.querySelector('[data-sail="helm"]'),
    inviteButton: ui.querySelector('[data-sail="invite"]')
  };
  const mapCtx = els.map.getContext('2d');

  ui.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = localeText(node.getAttribute('data-i18n'));
  });
  ui.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', localeText(node.getAttribute('data-i18n-aria')));
  });
  ui.style.setProperty('--sail-interact-label', JSON.stringify(localeText('撤离点')));

  function setToast(text, duration = 2.4) {
    els.toast.textContent = localeText(text);
    els.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('on'), duration * 1000);
  }

  function setPrompt(text) {
    if (!G || !G.hud || !G.hud.setPrompt) return;
    if (text) {
      G.hud.setPrompt(localeText(text), 0);
      state.promptOwned = true;
    } else if (state.promptOwned) {
      G.hud.setPrompt(null);
      state.promptOwned = false;
    }
  }

  function connected() {
    return !!(mp && mp.connected);
  }

  function send(payload) {
    if (!mp || typeof mp.send !== 'function') return false;
    return mp.send(payload);
  }

  function requestBoard(seat) {
    if (!G || !G.player || !G.player.alive) return;
    if (!connected()) {
      setToast('多人服务尚未连接，请稍后再试', 2.2);
      return;
    }
    const payload = { type: 'boatBoard' };
    if (Number.isInteger(seat)) payload.seat = seat;
    if (!send(payload)) setToast('上船请求发送失败', 2.2);
  }

  function requestLeave() {
    if (!state.aboard || !connected()) return;
    send({ type: 'boatLeave' });
  }

  function requestInvite() {
    if (!state.aboard || !connected()) return;
    if (state.seat !== 0) {
      setToast('只有舵手可以发起全服集合', 2);
      return;
    }
    if (!send({ type: 'boatInvite' })) {
      setToast('集合邀请发送失败', 2);
      return;
    }
    setToast('已向全服发出撤离船集合', 2.4);
    try {
      if (window.__vc && typeof window.__vc.sendChat === 'function') {
        window.__vc.sendChat(localeText('撤离船集合，准备出海！'));
      }
    } catch (error) { /* optional integration */ }
  }

  function seatWorldPosition(seat) {
    const offset = BOAT_SEAT_OFFSETS[clamp(Number(seat) || 0, 0, BOAT_SEATS - 1)] || BOAT_SEAT_OFFSETS[0];
    const cos = Math.cos(state.heading);
    const sin = Math.sin(state.heading);
    return {
      x: state.x + cos * offset.x + sin * offset.z,
      y: state.y + offset.y,
      z: state.z - sin * offset.x + cos * offset.z
    };
  }

  function seaHeightAt(x, z) {
    try {
      if (G && G.ground && typeof G.ground.seaHeight === 'function') {
        return Number(G.ground.seaHeight(x, z));
      }
    } catch (error) { /* use fallback */ }
    return -1.6;
  }

  function applyBoatPose() {
    if (!G || !G.backdrop || !G.backdrop.boat) return;
    const boat = G.backdrop.boat;
    boat.position.set(state.x, state.y + 0.035, state.z);
    boat.rotation.order = 'YXZ';
    boat.rotation.y = state.heading;
    boat.rotation.z = state.roll;
  }

  function makeWakeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, 'rgba(235,250,250,.9)');
    grad.addColorStop(0.45, 'rgba(224,244,244,.46)');
    grad.addColorStop(1, 'rgba(220,242,244,0)');
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(64, 254);
    ctx.bezierCurveTo(55, 196, 36, 96, 8, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 254);
    ctx.bezierCurveTo(73, 196, 92, 96, 120, 9);
    ctx.stroke();
    const churn = ctx.createRadialGradient(64, 226, 0, 64, 226, 42);
    churn.addColorStop(0, 'rgba(240,252,252,.72)');
    churn.addColorStop(1, 'rgba(240,252,252,0)');
    ctx.fillStyle = churn;
    ctx.fillRect(20, 184, 88, 72);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function createWake() {
    if (wake || !G || !G.scene || !THREE) return;
    const geometry = new THREE.PlaneGeometry(7.2, 18);
    geometry.rotateX(-Math.PI / 2);
    wakeMaterial = new THREE.MeshBasicMaterial({
      map: makeWakeTexture(),
      color: 0xe8ffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true
    });
    wake = new THREE.Mesh(geometry, wakeMaterial);
    wake.name = 'saltline-boat-wake';
    wake.frustumCulled = false;
    wake.renderOrder = 4;
    wake.visible = false;
    G.scene.add(wake);
  }

  function updateWake(dt) {
    createWake();
    if (!wake || !wakeMaterial) return;
    const amount = clamp(Math.abs(state.speed) / 17, 0, 1);
    const fx = Math.cos(state.heading);
    const fz = -Math.sin(state.heading);
    wake.visible = amount > 0.035;
    wake.position.set(state.x - fx * 7.4, state.y + 0.08, state.z - fz * 7.4);
    wake.rotation.y = state.heading - Math.PI / 2;
    wake.scale.set(0.8 + amount * 0.34, 1, 0.68 + amount * 0.5);
    wakeMaterial.opacity += (amount * 0.58 - wakeMaterial.opacity) * Math.min(1, dt * 5);
  }

  function buildExternalZone() {
    if (state.zoneBuilt || !G || !G.physics || !G.scene || !THREE) return;
    const material = (name, color) => {
      try {
        if (G.mats && G.mats.get) return G.mats.get(name);
      } catch (error) { /* fallback */ }
      return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.18 });
    };
    const concrete = material('concrete', 0x62686a);
    const steel = material('steel_dark', 0x20282b);
    const orange = material('paint_orange', 0xd3792d);
    const grey = material('paint_grey', 0x6f7778);
    const glow = new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: 0xff8a1f,
      emissiveIntensity: 3,
      roughness: 0.35
    });

    zoneRoot = new THREE.Group();
    zoneRoot.name = 'saltline-external-combat-zone';
    G.scene.add(zoneRoot);

    const addMesh = (width, height, depth, x, y, z, mat, collide = false, surface = 'metal') => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      zoneRoot.add(mesh);
      if (collide) {
        G.physics.addBox(
          [x - width / 2, y - height / 2, z - depth / 2],
          [x + width / 2, y + height / 2, z + depth / 2],
          { surface, tag: 'external-zone' }
        );
      }
      return mesh;
    };

    addMesh(44, 2.4, 40, 104, -1, 8, concrete, true, 'metal');
    addMesh(44.8, 0.18, 40.8, 104, 0.13, 8, grey, false, 'metal');

    for (const z of [-11.1, 27.1]) {
      addMesh(43.2, 0.12, 0.12, 104, 1.08, z, steel);
      addMesh(43.2, 0.08, 0.08, 104, 0.56, z, steel);
    }
    for (const x of [82.9, 125.1]) {
      addMesh(0.12, 0.12, 38.2, x, 1.08, 8, steel);
      addMesh(0.08, 0.08, 38.2, x, 0.56, 8, steel);
    }

    const cover = (x, z, width, depth, height, mat = orange) => {
      addMesh(width, height, depth, x, PLATFORM.top + height / 2, z, mat, true, 'metal');
      addMesh(width + 0.12, 0.12, depth + 0.12, x, PLATFORM.top + height + 0.06, z, steel);
    };
    cover(96, -3.2, 11.5, 2.55, 2.7, orange);
    cover(116, 19.6, 2.55, 11.2, 2.7, grey);
    cover(112, -4.8, 8.2, 2.5, 2.35, orange);
    cover(92, 20.5, 4.6, 4.6, 1.35, grey);
    cover(101, 13.2, 3.2, 6.4, 1.55, steel);

    addMesh(5.2, 7.5, 5.2, 104, 3.75, 8, steel, true, 'metal');
    addMesh(6.4, 0.35, 6.4, 104, 7.6, 8, grey);
    boatBeacon = addMesh(1.1, 1.1, 1.1, 104, 8.2, 8, glow);

    const light = new THREE.PointLight(0xffb347, 18, 60, 2);
    light.position.set(104, 9, 8);
    zoneRoot.add(light);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(8,12,14,.86)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    ctx.fillStyle = '#f0eadf';
    ctx.font = '900 58px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(localeText('外海交战区 · EXTERNAL COMBAT'), canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    }));
    sprite.position.set(104, 10.5, 8);
    sprite.scale.set(22, 3.44, 1);
    zoneRoot.add(sprite);

    if (G.physics.bounds && G.physics.bounds.min && G.physics.bounds.max) {
      G.physics.bounds.min.set(-80, 0, -180);
      G.physics.bounds.max.set(180, 60, 180);
    }
    try {
      if (typeof G.physics.build === 'function') G.physics.build();
    } catch (error) {
      console.warn('[salt-boat] external collision build failed', error);
    }
    state.zoneBuilt = true;
  }

  function isOnExternalPlatform(position) {
    if (!position) return false;
    return position.x >= PLATFORM.x0 - 0.4 &&
      position.x <= PLATFORM.x1 + 0.4 &&
      position.z >= PLATFORM.z0 - 0.4 &&
      position.z <= PLATFORM.z1 + 0.4 &&
      position.y >= PLATFORM.top - 1;
  }

  function unlockExternal() {
    if (state.externalUnlocked) return;
    state.externalUnlocked = true;
    try {
      if (mp && typeof mp.refreshSpawns === 'function') mp.refreshSpawns();
    } catch (error) { /* ignore */ }
    setToast('外海交战区已启用 · 死亡后可在平台复活', 3.4);
  }

  function maybeUnlockExternal() {
    if (!G || !G.player) return;
    if (isOnExternalPlatform(G.player.pos) ||
        (state.x > 70 && state.x < PLATFORM.x1 + 16 &&
         state.z > PLATFORM.z0 - 14 && state.z < PLATFORM.z1 + 14)) {
      unlockExternal();
    }
  }

  function updateCrewUi() {
    const occupied = state.seats.filter(Boolean).length;
    state.seatCount = occupied;
    els.seats.textContent = state.aboard
      ? `撤离船 · 座位 ${state.seat + 1} · ${occupied} / ${BOAT_SEATS}`
      : `撤离船 · ${occupied} / ${BOAT_SEATS} 人`;
    els.helm.hidden = !state.aboard || state.seat === 0 || !!state.seats[0];
    els.inviteButton.hidden = !state.aboard || state.seat !== 0;
  }

  function applyServerBoat(raw) {
    if (!raw || raw.id !== BOAT_ID) return;
    const x = Number(raw.x);
    const y = Number(raw.y);
    const z = Number(raw.z);
    const heading = Number(raw.heading);
    const speed = Number(raw.speed);
    if (![x, y, z, heading, speed].every(Number.isFinite)) return;
    remote.x = x;
    remote.y = y;
    remote.z = z;
    remote.heading = normalizeAngle(heading);
    remote.speed = clamp(speed, -8, BOAT_MAX_SPEED);
    const signature = Array.isArray(raw.seats) ? raw.seats.join('|') : '';
    if (Array.isArray(raw.seats)) {
      state.seats = raw.seats.slice(0, BOAT_SEATS);
      while (state.seats.length < BOAT_SEATS) state.seats.push(null);
    }
    if (!remote.initialized) {
      remote.initialized = true;
      if (!state.aboard) {
        state.x = remote.x;
        state.y = remote.y;
        state.z = remote.z;
        state.heading = remote.heading;
        state.speed = remote.speed;
      }
    }

    const myBoatSeat = mp && mp.id
      ? state.seats.findIndex((id) => id && String(id) === String(mp.id))
      : -1;
    if (state.aboard) {
      if (myBoatSeat < 0 && Date.now() > state.suppressAutoBoardUntil) {
        deactivateLocal(false);
      } else if (myBoatSeat >= 0) {
        state.seat = myBoatSeat;
      }
    } else if (myBoatSeat >= 0 &&
               Date.now() > state.suppressAutoBoardUntil &&
               G && G.player && G.player.alive &&
               G.game && G.game.state === 'playing') {
      activateLocal(myBoatSeat);
    }

    if (signature !== lastRemoteSeatSignature) {
      lastRemoteSeatSignature = signature;
      updateCrewUi();
    }
    updateInviteUi();
  }

  function updateRemoteCraft(dt) {
    if (!remote.initialized) return;
    const isLocalDriver = state.aboard && state.seat === 0;
    if (isLocalDriver) {
      const distance = Math.hypot(state.x - remote.x, state.z - remote.z);
      if (distance > 14) {
        state.x = remote.x;
        state.z = remote.z;
        state.heading = remote.heading;
      }
      return;
    }
    const alpha = 1 - Math.exp(-Math.max(0, dt) * 10);
    state.x += (remote.x - state.x) * alpha;
    state.y += (remote.y - state.y) * alpha;
    state.z += (remote.z - state.z) * alpha;
    state.heading = normalizeAngle(state.heading + shortestAngle(state.heading, remote.heading) * alpha);
    state.speed += (remote.speed - state.speed) * alpha;
  }

  function activateLocal(seat) {
    if (!G || !G.player) return;
    const wasAboard = state.aboard;
    state.aboard = true;
    state.seat = clamp(Number(seat) || 0, 0, BOAT_SEATS - 1);
    state.aimYaw = Number.isFinite(Number(G.player.yaw)) ? Number(G.player.yaw) : state.heading;
    state.aimPitch = Number.isFinite(Number(G.player.pitch)) ? Number(G.player.pitch) : 0.02;
    state.suppressAutoBoardUntil = 0;
    if (G.game) G.game.state = 'playing';
    if (G.game && G.game.menus) G.game.menus.show('none');
    if (G.hud) {
      G.hud.show(true);
      G.hud.locationCard && G.hud.locationCard(false);
    }
    if (G.weapon && G.weapon.setVisible) G.weapon.setVisible(true);
    G.player.enabled = true;
    G.player.invulnerable = false;
    try {
      G.input && G.input.setGameplay && G.input.setGameplay(true);
      G.input && G.input.requestLock && G.input.requestLock();
      G.audio && G.audio.setPaused && G.audio.setPaused(false);
      G.audio && G.audio.setIntensity && G.audio.setIntensity(0.55);
      if (G.render && G.render.post) {
        G.render.post.fade = 0;
        G.render.post.saturation = 1;
        G.render.post.flash = 0;
      }
    } catch (error) { /* ignore */ }
    ui.classList.add('on');
    ui.classList.remove('interact-only', 'has-invite');
    ui.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sail-active');
    els.interact.hidden = true;
    setPrompt(null);
    updateCrewUi();
    if (!wasAboard) {
      setToast(state.seat === 0
        ? '已接管舵位 · 未完成任务也可直接出海'
        : `已登船 · 座位 ${state.seat + 1}`, 3);
    }
  }

  function deactivateLocal(restoreInteract = true) {
    if (!state.aboard) return;
    state.aboard = false;
    state.seat = -1;
    state.suppressAutoBoardUntil = Date.now() + 1400;
    clearTouch();
    ui.classList.remove('on');
    ui.classList.remove('interact-only', 'has-invite');
    ui.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sail-active');
    els.interact.hidden = true;
    setPrompt(null);
    updateCrewUi();
    if (restoreInteract && G && G.player && G.player.alive && G.game && G.game.state === 'playing') {
      try {
        if (G.weapon && G.weapon.setVisible) G.weapon.setVisible(true);
        G.player.enabled = true;
        G.player.invulnerable = false;
        G.hud.show(true);
        G.input.setGameplay(true);
      } catch (error) { /* ignore */ }
    }
  }

  function exitWithPosition(position) {
    if (!position || !G || !G.player || !THREE) return;
    deactivateLocal(true);
    if (!G.player.alive || !G.game || G.game.state !== 'playing') return;
    try {
      G.player.pos.set(Number(position.x), Number(position.y), Number(position.z));
      G.player.vel.set(0, 0, 0);
      G.player.onGround = true;
      G.player.eye.set(
        G.player.pos.x,
        G.player.pos.y + (G.player.prone ? 0.44 : 1.68),
        G.player.pos.z
      );
      if (isOnExternalPlatform(position)) unlockExternal();
      setToast('已下船', 1.8);
    } catch (error) {
      console.error('[salt-boat] disembark failed', error);
    }
  }

  function handleNetworkMessage(message) {
    if (!message || typeof message.type !== 'string') return;
    if (message.type === 'snapshot') {
      if (Array.isArray(message.roster)) {
        roster.clear();
        for (const member of message.roster) roster.set(String(member.id), member);
      }
      if (message.boat) applyServerBoat(message.boat);
      updateInviteUi();
      return;
    }
    if (message.type === 'boatState') {
      applyServerBoat(message.boat);
      return;
    }
    if (message.type === 'boatAck') {
      if (message.boat) applyServerBoat(message.boat);
      if (message.aboard) activateLocal(Number(message.seat) || 0);
      else exitWithPosition(message.pos);
      return;
    }
    if (message.type === 'boatDenied') {
      const reasons = {
        range: '离撤离船太远',
        full: '撤离船座位已满',
        helm: '舵位已经被其他玩家占用',
        moving: '请先减速并靠近码头或外海平台',
        landing: '这里无法下船，请驶近码头或外海平台',
        notAboard: '你当前不在船上',
        rate: '集合邀请发送太快',
        helmOnly: '只有舵手可以呼叫集合',
        unavailable: '当前无法登船'
      };
      setToast(reasons[message.reason] || '船只操作被拒绝', 2.4);
      return;
    }
    if (message.type === 'boatInviteSent') {
      setToast('全服集合邀请已发出', 2.2);
      return;
    }
    if (message.type === 'boatInvite') {
      const name = message.from && message.from.name ? message.from.name : '其他玩家';
      const boat = message.boat || {};
      state.lastInviteAt = Date.now();
      state.lastInvite = {
        name,
        x: Number(boat.x) || state.x,
        z: Number(boat.z) || state.z,
        occupied: Number(boat.occupied) || 0,
        capacity: Number(boat.capacity) || BOAT_SEATS
      };
      if (!state.aboard && G && G.game && G.game.state === 'playing') {
        setToast(`${name} 呼叫撤离船集合 · 请尽快上船`, 3.6);
      }
      updateInviteUi();
      return;
    }
    if (message.type === 'youDied' || message.type === 'respawned') {
      deactivateLocal(false);
      return;
    }
    if (message.type === 'focusState' && message.active) {
      deactivateLocal(false);
    }
  }

  function updateInviteUi() {
    if (!G || !G.player) return;
    const fresh = Date.now() - state.lastInviteAt < 18000;
    if (!fresh || state.aboard || !state.lastInvite) {
      els.invite.hidden = true;
      ui.classList.remove('has-invite');
      return;
    }
    const dx = state.lastInvite.x - G.player.pos.x;
    const dz = state.lastInvite.z - G.player.pos.z;
    const distance = Math.hypot(dx, dz);
    const deg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
    const names = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const direction = names[Math.round(deg / 45) % 8];
    els.invite.hidden = false;
    if (!state.aboard) ui.classList.add('has-invite');
    els.invite.textContent = `${state.lastInvite.name} 呼叫集合 · 撤离船 ${Math.round(distance)} 米 · ${direction}`;
  }

  function boatBlocked(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
    if (x * x + z * z > BOAT_WORLD_RADIUS * BOAT_WORLD_RADIUS) return true;
    if (x < 30.4 && x > -62 && z > -49 && z < 49) return true;
    if (x > PLATFORM.x0 - 3.8 && x < PLATFORM.x1 + 3.8 &&
        z > PLATFORM.z0 - 3.8 && z < PLATFORM.z1 + 3.8) return true;
    return false;
  }

  function updateDriving(dt) {
    const input = G.input || {};
    const throttle = clamp((input.move && input.move.y || 0) + touch.forward - touch.back, -1, 1);
    const steer = clamp((input.move && input.move.x || 0) + touch.right - touch.left, -1, 1);
    const boost = !!(input.sprint || touch.boost);
    const maxSpeed = boost ? BOAT_MAX_SPEED : 18;

    if (throttle > 0) state.speed += throttle * (boost ? 14 : 9.7) * dt;
    else if (throttle < 0) state.speed += throttle * 7.1 * dt;
    else state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), 2.8 * dt);
    if (boost && state.speed > 0) state.speed += 4.8 * dt;
    if (state.speed > maxSpeed) state.speed = Math.max(maxSpeed, state.speed - 7.5 * dt);
    if (state.speed < -7) state.speed = -7;
    state.speed = clamp(state.speed, -7, maxSpeed);

    const steerAuthority = 0.52 + Math.min(0.55, Math.abs(state.speed) / 24);
    state.heading = normalizeAngle(state.heading - steer * steerAuthority * dt);
    const fx = Math.cos(state.heading);
    const fz = -Math.sin(state.heading);
    const nx = state.x + fx * state.speed * dt;
    const nz = state.z + fz * state.speed * dt;
    if (!boatBlocked(nx, nz)) {
      state.x = nx;
      state.z = nz;
    } else if (!boatBlocked(nx, state.z)) {
      state.x = nx;
      state.speed *= 0.55;
    } else if (!boatBlocked(state.x, nz)) {
      state.z = nz;
      state.speed *= 0.55;
    } else {
      state.speed = 0;
    }
    state.y = seaHeightAt(state.x, state.z);
    const rollTarget = clamp(-steer * Math.min(1, Math.abs(state.speed) / 15) * 0.085, -0.085, 0.085);
    state.roll += (rollTarget - state.roll) * Math.min(1, dt * 4.2);
  }

  function updateAim(dt) {
    const look = G.input && G.input.look || { dx: 0, dy: 0 };
    state.aimYaw = normalizeAngle(state.aimYaw - (Number(look.dx) || 0));
    state.aimPitch = clamp(state.aimPitch - (Number(look.dy) || 0) * 0.72, -1.25, 1.1);
    const player = G.player;
    const seat = seatWorldPosition(state.seat);
    player.pos.set(seat.x, seat.y, seat.z);
    player.vel.set(
      Math.cos(state.heading) * state.speed,
      0,
      -Math.sin(state.heading) * state.speed
    );
    player.yaw = state.aimYaw;
    player.pitch = state.aimPitch;
    player.sprinting = false;
    player.onGround = false;
    player.speed = Math.abs(state.speed);
    player.eye.set(seat.x, seat.y + (state.seat === 0 ? 1.22 : 1.08), seat.z);
    player.forward.set(0, 0, -1).applyEuler(new THREE.Euler(state.aimPitch, state.aimYaw, 0, 'YXZ'));
    G.camera.position.copy(player.eye);
    G.camera.rotation.set(state.aimPitch, state.aimYaw, 0, 'YXZ');
    const targetFov = 74 - clamp(Number(player.ads) || 0, 0, 1) * 19;
    if (Math.abs(G.camera.fov - targetFov) > 0.05) {
      G.camera.fov += (targetFov - G.camera.fov) * Math.min(1, dt * 10);
      G.camera.updateProjectionMatrix();
    }
  }

  function updateBoatPlayer(dt) {
    if (!state.aboard || !G || !G.player || !G.player.alive) return;
    if (state.seat === 0) updateDriving(dt);
    else updateRemoteCraft(dt);
    if (state.seat !== 0) {
      state.y = seaHeightAt(state.x, state.z);
    }
    updateAim(dt);
    state.sendTime += dt;
    if (state.seat === 0 && state.sendTime >= 0.05) {
      state.sendTime = 0;
      send({
        type: 'boatPose',
        pos: { x: state.x, y: state.y, z: state.z },
        heading: state.heading,
        speed: state.speed
      });
    }
    maybeUnlockExternal();
    updateCrewUi();
  }

  function updateWorldInteraction(dt) {
    if (!G || !G.player || !G.game || !G.player.alive) {
      els.interact.hidden = true;
      ui.classList.remove('interact-only');
      return;
    }
    if (state.aboard || G.game.state !== 'playing') {
      els.interact.hidden = true;
      ui.classList.remove('interact-only');
      setPrompt(null);
      return;
    }
    const distance = Math.hypot(G.player.pos.x - state.x, G.player.pos.z - state.z);
    state.interactable = distance <= BOAT_BOARD_RADIUS;
    if (state.interactable) {
      const full = state.seatCount >= BOAT_SEATS;
      const helmFree = !state.seats[0];
      const label = full
        ? '撤离船已满'
        : (helmFree ? 'E · 登上撤离船并掌舵' : `E · 登船 · ${state.seatCount} / ${BOAT_SEATS}`);
      setPrompt(full ? '撤离船座位已满' : label);
      els.interact.textContent = label.replace(/^E · /, '');
      els.interact.hidden = full;
      ui.classList.toggle('interact-only', !full);
    } else {
      els.interact.hidden = true;
      ui.classList.remove('interact-only');
      setPrompt(null);
    }
    promptTimer += dt;
    if (promptTimer > 0.2) {
      promptTimer = 0;
      updateInviteUi();
    }
  }

  function updateHud() {
    const bearing = (Math.PI / 2 - state.heading) * 180 / Math.PI;
    const deg = (bearing % 360 + 360) % 360;
    const names = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    els.dir.textContent = localeText(names[Math.round(deg / 45) % 8]);
    els.deg.textContent = `${Math.round(deg).toString().padStart(3, '0')}°`;
    els.knots.textContent = String(Math.round(Math.abs(state.speed) * 1.45));
    els.bar.classList.toggle('reverse', state.speed < -0.12);
    els.barFill.style.width = `${clamp(Math.abs(state.speed) / BOAT_MAX_SPEED * 100, 0, 100).toFixed(1)}%`;
    els.coords.textContent = `${state.x.toFixed(0)}, ${state.z.toFixed(0)}`;
    const distance = Math.hypot(state.x - BOAT_DOCK.x, state.z - BOAT_DOCK.z);
    els.zone.textContent = isOnExternalPlatform({ x: state.x, y: state.y, z: state.z })
      ? '交战平台'
      : distance < 90 ? '近港' : distance < 300 ? '外海' : '远海';
    updateCrewUi();
  }

  function drawMap() {
    if (!mapCtx) return;
    const W = els.map.width;
    const cx = W / 2;
    const cy = W / 2;
    const radius = W * 0.47;
    const scale = radius / 150;
    const toX = (x) => cx + (x - state.x) * scale;
    const toY = (z) => cy + (z - state.z) * scale;
    mapCtx.setTransform(1, 0, 0, 1, 0, 0);
    mapCtx.clearRect(0, 0, W, W);
    mapCtx.save();
    mapCtx.beginPath();
    mapCtx.arc(cx, cy, radius, 0, TAU);
    mapCtx.clip();
    mapCtx.fillStyle = 'rgba(7,15,18,.9)';
    mapCtx.fillRect(0, 0, W, W);

    mapCtx.strokeStyle = 'rgba(138,170,176,.13)';
    mapCtx.lineWidth = 1;
    const grid = 25;
    const startX = Math.floor((state.x - 170) / grid) * grid;
    const startZ = Math.floor((state.z - 170) / grid) * grid;
    for (let x = startX; x <= state.x + 170; x += grid) {
      const px = toX(x);
      mapCtx.beginPath();
      mapCtx.moveTo(px, 0);
      mapCtx.lineTo(px, W);
      mapCtx.stroke();
    }
    for (let z = startZ; z <= state.z + 170; z += grid) {
      const py = toY(z);
      mapCtx.beginPath();
      mapCtx.moveTo(0, py);
      mapCtx.lineTo(W, py);
      mapCtx.stroke();
    }

    mapCtx.fillStyle = '#303a3b';
    mapCtx.strokeStyle = 'rgba(224,216,198,.42)';
    mapCtx.fillRect(toX(-46), toY(-42), 76 * scale, 84 * scale);
    mapCtx.strokeRect(toX(-46), toY(-42), 76 * scale, 84 * scale);
    mapCtx.fillStyle = '#6e6250';
    mapCtx.fillRect(toX(28), toY(-34), 7 * scale, 68 * scale);

    mapCtx.fillStyle = '#39474a';
    mapCtx.fillRect(
      toX(PLATFORM.x0),
      toY(PLATFORM.z0),
      (PLATFORM.x1 - PLATFORM.x0) * scale,
      (PLATFORM.z1 - PLATFORM.z0) * scale
    );
    mapCtx.strokeStyle = 'rgba(255,179,71,.7)';
    mapCtx.strokeRect(
      toX(PLATFORM.x0),
      toY(PLATFORM.z0),
      (PLATFORM.x1 - PLATFORM.x0) * scale,
      (PLATFORM.z1 - PLATFORM.z0) * scale
    );

    const boatX = toX(state.x);
    const boatY = toY(state.z);
    mapCtx.fillStyle = '#ffb347';
    mapCtx.beginPath();
    mapCtx.arc(boatX, boatY, 4, 0, TAU);
    mapCtx.fill();
    mapCtx.translate(boatX, boatY);
    mapCtx.rotate(Math.PI / 2 - state.heading);
    mapCtx.beginPath();
    mapCtx.moveTo(0, -8);
    mapCtx.lineTo(5.4, 6);
    mapCtx.lineTo(0, 3.5);
    mapCtx.lineTo(-5.4, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();

    mapCtx.strokeStyle = 'rgba(232,228,218,.24)';
    mapCtx.lineWidth = 1;
    mapCtx.beginPath();
    mapCtx.arc(cx, cy, radius, 0, TAU);
    mapCtx.stroke();
    mapCtx.fillStyle = 'rgba(232,228,218,.7)';
    mapCtx.font = '600 9px "IBM Plex Mono", monospace';
    mapCtx.textAlign = 'center';
    mapCtx.fillText('N', cx, 13);
  }

  function clearTouch() {
    touch.forward = touch.back = touch.left = touch.right = touch.boost = 0;
    heldPointers.forEach(({ button }) => button && button.classList.remove('held'));
    heldPointers.clear();
  }

  function ensureCompleteEntry() {
    const section = document.querySelector('.m-screen[data-s="complete"]');
    if (!section) return;
    const actions = section.querySelector('.m-actions');
    if (!actions || section.querySelector('[data-sail-board]')) return;
    const button = document.createElement('button');
    button.className = 'btn primary';
    button.type = 'button';
    button.setAttribute('data-sail-board', '');
    button.textContent = localeText('继续驾船出海');
    actions.prepend(button);
    const redeploy = actions.querySelector('[data-act="redeploy"]');
    if (redeploy) redeploy.classList.remove('primary');
  }

  function patchGame(game) {
    buildExternalZone();
    const baseGameUpdate = game.game.update;
    if (!baseGameUpdate.__saltBoatGamePatch) {
      const wrappedGameUpdate = function wrappedBoatGameUpdate(dt) {
        if (state.aboard) {
          maybeUnlockExternal();
          return true;
        }
        const result = baseGameUpdate.call(this, dt);
        try {
          updateWorldInteraction(dt);
          maybeUnlockExternal();
        } catch (error) {
          console.error('[salt-boat] interaction update failed', error);
        }
        return result;
      };
      wrappedGameUpdate.__saltBoatGamePatch = true;
      game.game.update = wrappedGameUpdate;
    }

    const basePlayerUpdate = game.player.update;
    if (!basePlayerUpdate.__saltBoatPlayerPatch) {
      const wrappedPlayerUpdate = function wrappedBoatPlayerUpdate(dt) {
        if (state.aboard && game.game.state === 'playing' && game.player.alive) {
          try {
            updateBoatPlayer(dt);
          } catch (error) {
            console.error('[salt-boat] player update failed', error);
          }
          return;
        }
        return basePlayerUpdate.call(this, dt);
      };
      wrappedPlayerUpdate.__saltBoatPlayerPatch = true;
      game.player.update = wrappedPlayerUpdate;
    }

    if (game.weapon && typeof game.weapon.update === 'function' && !game.weapon.update.__saltBoatWeaponPatch) {
      const baseWeaponUpdate = game.weapon.update;
      const wrappedWeaponUpdate = function wrappedBoatWeaponUpdate(dt) {
        if (state.aboard && game.weapon.setVisible) game.weapon.setVisible(true);
        return baseWeaponUpdate.call(this, dt);
      };
      wrappedWeaponUpdate.__saltBoatWeaponPatch = true;
      game.weapon.update = wrappedWeaponUpdate;
    }

    if (game.backdrop && typeof game.backdrop.update === 'function' && !game.backdrop.update.__saltBoatBackdropPatch) {
      const baseBackdropUpdate = game.backdrop.update;
      const wrappedBackdropUpdate = function wrappedBoatBackdropUpdate(dt) {
        const result = baseBackdropUpdate.apply(this, arguments);
        try {
          updateRemoteCraft(dt);
          applyBoatPose();
          updateWake(dt);
          state.hudTime += dt;
          if (state.hudTime > 0.08) {
            state.hudTime = 0;
            updateHud();
            drawMap();
          }
          if (boatBeacon) {
            boatBeacon.rotation.y += dt * 0.8;
            boatBeacon.position.y = 8.2 + Math.sin(performance.now() * 0.002) * 0.12;
          }
        } catch (error) {
          console.error('[salt-boat] backdrop sync failed', error);
        }
        return result;
      };
      wrappedBackdropUpdate.__saltBoatBackdropPatch = true;
      game.backdrop.update = wrappedBackdropUpdate;
    }

    try {
      game.events.on('player:dead', () => deactivateLocal(false));
      game.events.on('game:state', (event) => {
        if (event && (event.state === 'dead' || event.state === 'respawning')) deactivateLocal(false);
      });
    } catch (error) {
      console.warn('[salt-boat] event hook failed', error);
    }
  }

  function attachGame(candidate) {
    if (attachedGame || !candidate || !candidate.game || !candidate.player ||
        !candidate.backdrop || !candidate.backdrop.boat || !candidate.physics) return;
    G = candidate;
    THREE = candidate.THREE || window.__G && window.__G.THREE;
    if (!THREE) return;
    attachedGame = true;
    patchGame(candidate);
    ensureCompleteEntry();
    updateCrewUi();
    updateHud();
    drawMap();
  }

  function attachNetwork(candidate) {
    if (attachedNetwork || !candidate || typeof candidate.onMessage !== 'function') return;
    mp = candidate;
    attachedNetwork = true;
    mp.onMessage(handleNetworkMessage);
    if (state.aboard && mp.connected) {
      send({ type: 'boatBoard', seat: state.seat });
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest &&
      event.target.closest('[data-sail], [data-sail-board], #sail-interact');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (target.hasAttribute('data-sail-board')) {
      requestBoard();
      return;
    }
    if (target.id === 'sail-interact') {
      if (state.aboard) requestLeave();
      else requestBoard();
      return;
    }
    const action = target.getAttribute('data-sail');
    if (action === 'invite') requestInvite();
    else if (action === 'leave') requestLeave();
    else if (action === 'helm') requestBoard(0);
  }, true);

  document.addEventListener('pointerdown', (event) => {
    const button = event.target && event.target.closest && event.target.closest('[data-sail-hold]');
    if (!state.aboard || state.seat !== 0 || !button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.getAttribute('data-sail-hold');
    touch[action] = 1;
    button.classList.add('held');
    heldPointers.set(event.pointerId, { action, button });
  }, true);

  function releasePointer(event) {
    const held = heldPointers.get(event.pointerId);
    if (!held) return;
    touch[held.action] = 0;
    held.button.classList.remove('held');
    heldPointers.delete(event.pointerId);
  }
  document.addEventListener('pointerup', releasePointer, true);
  document.addEventListener('pointercancel', releasePointer, true);

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyE' || event.repeat) return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
    if (state.aboard) {
      event.preventDefault();
      event.stopPropagation();
      requestLeave();
    } else if (state.interactable) {
      event.preventDefault();
      event.stopPropagation();
      requestBoard();
    }
  }, true);

  const observer = new MutationObserver(ensureCompleteEntry);
  observer.observe(document.body, { childList: true, subtree: true });
  ensureCompleteEntry();

  const waitGame = window.setInterval(() => {
    const candidate = window.__G;
    if (!candidate || !candidate.game || !candidate.player ||
        !candidate.backdrop || !candidate.backdrop.boat) return;
    attachGame(candidate);
    if (attachedGame) window.clearInterval(waitGame);
  }, 120);

  const waitNetwork = window.setInterval(() => {
    const candidate = window.__mp;
    if (!candidate || typeof candidate.onMessage !== 'function') return;
    attachNetwork(candidate);
    if (attachedNetwork) window.clearInterval(waitNetwork);
  }, 100);

  window.__sail = {
    enter: () => requestBoard(),
    exit: () => requestLeave(),
    get active() { return state.aboard; },
    get speed() { return state.speed; },
    get position() { return { x: state.x, z: state.z }; },
    get heading() { return state.heading; }
  };
})();
