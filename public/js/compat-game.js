(() => {
  'use strict';

  const i18n = window.__SALT_I18N__ || {};
  const COPY = (i18n.messages && i18n.messages.compat) || {};
  const app = document.getElementById('app');
  if (!app) return;

  function t(key, vars) {
    const raw = COPY[key];
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function reasonKey() {
    if (reason === 'forced') return 'reasonForced';
    if (reason === 'timeout') return 'reasonTimeout';
    if (reason === 'software') return 'reasonSoftware';
    if (reason === 'mobile') return 'reasonMobile';
    return 'reasonWebgl';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  const UNIT_KINDS = ['male', 'female', 'hound', 'drone'];
  function normalizeUnit(value) {
    return UNIT_KINDS.includes(value) ? value : 'male';
  }

  const UNIT_LABEL_KEYS = {
    male: 'unitMale',
    female: 'unitFemale',
    hound: 'unitHound',
    drone: 'unitDrone'
  };

  function killerUnitLabel(by) {
    if (!by || !UNIT_KINDS.includes(by.soldier)) return '';
    return t(UNIT_LABEL_KEYS[by.soldier]);
  }

  const query = new URLSearchParams(location.search);
  const forced = query.get('gfx') === '2d' || query.get('render') === '2d';
  let active = false;
  let reason = forced ? 'forced' : 'webgl';
  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let scale = 11;
  let last = 0;
  let raf = 0;
  let shake = 0;
  let flash = 0;
  let online = 0;
  let serverId = null;
  let lastStateAt = 0;
  let lastShotAt = 0;
  let deathSent = false;
  let respawnRequested = false;
  let respawnFallback = 0;
  let hitMarker = 0;
  let reloadFlash = 0;
  let touchMode = false;
  let spectateId = null;

  const keys = new Set();
  const pointer = { x: 0, y: 0, down: false, seen: false };
  const remote = new Map();
  const tracers = [];
  const particles = [];
  const projectiles = [];
  const containers = [
    { x: -13, z: -17, w: 7.4, d: 2.9, color: '#52352b' },
    { x: -13, z: -12.4, w: 7.4, d: 2.9, color: '#31434a' },
    { x: -13, z: -7.8, w: 7.4, d: 2.9, color: '#514327' },
    { x: 7, z: -21, w: 2.8, d: 7.2, color: '#3b4a38' },
    { x: 11.5, z: -21, w: 2.8, d: 7.2, color: '#4b3034' },
    { x: 18, z: 7.5, w: 6.8, d: 2.7, color: '#2f3e46' },
    { x: 18, z: 12.1, w: 6.8, d: 2.7, color: '#574a2d' },
    { x: -28, z: 15, w: 7.2, d: 2.8, color: '#44302d' },
    { x: -21.5, z: 22, w: 2.8, d: 6.6, color: '#2d4347' }
  ];
  const warehouse = { x: -48, z: -19, w: 18, d: 14 };
  const heli = {
    x: -24,
    z: -2,
    homeX: -24,
    homeZ: -2,
    piloting: false,
    rotor: 0,
    ammo: 240
  };
  const me = {
    x: 0,
    y: 0,
    z: 4,
    yaw: 0,
    hp: 100,
    maxHp: 100,
    alive: true,
    sprint: false,
    moving: false,
    ammo: 30,
    mag: 30,
    reloadingUntil: 0,
    kills: 0,
    deaths: 0,
    inHeli: false,
    kind: 'male',
    phase: 0,
    deadUntil: 0,
    deadBy: null,
    invulnerableUntil: 0
  };
  const drones = [
    { x: 24, z: -10, hp: 68, alive: true, respawnAt: 0, phase: 0.2, nextShotAt: 0 },
    { x: -3, z: -31, hp: 68, alive: true, respawnAt: 0, phase: 1.8, nextShotAt: 0 },
    { x: 31, z: 22, hp: 68, alive: true, respawnAt: 0, phase: 3.1, nextShotAt: 0 },
    { x: -35, z: 9, hp: 68, alive: true, respawnAt: 0, phase: 4.4, nextShotAt: 0 }
  ];

  const ui = {};
  let vignette = null;

  function mp() {
    return window.__mp || null;
  }

  function send(payload) {
    const api = mp();
    if (!api || typeof api.send !== 'function') return false;
    return api.send(payload);
  }

  function createNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildUi() {
    const root = createNode('div');
    root.id = 'compat-ui';

    const note = createNode('section', 'compat-note');
    note.setAttribute('aria-live', 'polite');
    const kicker = createNode('div', 'compat-note-k', t('kicker'));
    const title = createNode('b', '', t('title'));
    const reasonText = createNode('p', '', t(reasonKey()));
    const row = createNode('div', 'compat-note-row');
    const status = createNode('span', 'compat-note-status', t('webglOff'));
    const retry = createNode('button', 'compat-retry', t('retry'));
    retry.type = 'button';
    row.append(status, retry);
    note.append(kicker, title, reasonText, row);

    const vitals = createNode('div', 'compat-vitals');
    const health = createNode('div', 'compat-vital');
    const healthK = createNode('span', 'compat-vital-k', t('health'));
    const healthN = createNode('span', 'compat-vital-n');
    const healthValue = createNode('b', '', '100');
    healthN.append(healthValue, createNode('small', '', '/100'));
    const healthTrack = createNode('div', 'compat-health-track');
    const healthFill = document.createElement('i');
    healthTrack.appendChild(healthFill);
    health.append(healthK, healthN, healthTrack);

    const ammo = createNode('div', 'compat-vital is-ammo');
    const ammoK = createNode('span', 'compat-vital-k', t('ammo'));
    const ammoN = createNode('span', 'compat-vital-n');
    const ammoValue = createNode('b', '', '30');
    ammoN.append(ammoValue, createNode('small', '', '/30'));
    ammo.append(ammoK, ammoN);
    vitals.append(health, ammo);

    const controls = createNode('div', 'compat-controls', t('controls'));

    const heliPrompt = createNode('div', 'compat-heli-prompt');
    heliPrompt.hidden = true;
    const heliKey = createNode('kbd', '', 'E');
    const heliText = createNode('span', '', t('heliNear'));
    heliPrompt.append(heliKey, heliText);

    const dead = createNode('div', 'compat-dead');
    dead.hidden = true;
    const deadCard = createNode('div', 'compat-dead-card');
    const deadK = createNode('div', 'compat-dead-k', t('down'));
    const deadN = createNode('div', 'compat-dead-n', '5');
    const deadBy = createNode('div', 'compat-dead-by', '');
    const deadLine = createNode('div', 'compat-dead-line', '');
    const deadBtn = createNode('button', 'compat-dead-btn', t('respawnNow'));
    deadBtn.type = 'button';
    deadBtn.disabled = true;
    deadCard.append(deadK, deadN, deadBy, deadLine, deadBtn);
    dead.appendChild(deadCard);

    const touch = createNode('div', 'compat-touch');
    const touchButtons = [
      ['ct-up', '↑', 'KeyW', 'hold'],
      ['ct-down', '↓', 'KeyS', 'hold'],
      ['ct-left', '←', 'KeyA', 'hold'],
      ['ct-right', '→', 'KeyD', 'hold'],
      ['ct-fire', t('fire'), 'fire', 'hold'],
      ['ct-rise', t('ascend'), 'Space', 'hold'],
      ['ct-descend', t('descend'), 'ShiftLeft', 'hold'],
      ['ct-use', 'E', 'KeyE', 'tap']
    ];
    for (const [cls, label, code, mode] of touchButtons) {
      const button = createNode('button', cls, label);
      button.type = 'button';
      button.dataset.code = code;
      button.dataset.mode = mode;
      touch.appendChild(button);
    }
    root.append(note, vitals, controls, heliPrompt, dead, touch);
    app.appendChild(root);

    ui.root = root;
    ui.status = status;
    ui.health = health;
    ui.healthValue = healthValue;
    ui.healthFill = healthFill;
    ui.ammo = ammo;
    ui.ammoValue = ammoValue;
    ui.ammoMax = ammoN.lastElementChild;
    ui.heliPrompt = heliPrompt;
    ui.heliText = heliText;
    ui.dead = dead;
    ui.deadN = deadN;
    ui.deadBy = deadBy;
    ui.deadLine = deadLine;
    ui.deadBtn = deadBtn;
    ui.touch = touch;
    ui.touchRise = touch.querySelector('.ct-rise');
    ui.touchDescend = touch.querySelector('.ct-descend');

    retry.addEventListener('click', () => {
      const next = new URL(location.href);
      next.searchParams.delete('gfx');
      next.searchParams.delete('render');
      location.href = next.toString();
    });

    deadBtn.addEventListener('click', () => {
      if (!me.alive && Date.now() >= me.deadUntil) requestRespawn();
    });

    touch.addEventListener('pointerdown', (event) => {
      const button = event.target.closest('button[data-code]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const code = button.dataset.code;
      if (button.dataset.mode !== 'toggle') button.classList.add('on');
      try { button.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      if (code === 'fire') {
        pointer.down = true;
        aimAtNearest();
      } else if (button.dataset.mode === 'tap') {
        useHelicopter();
      } else {
        keys.add(code);
      }
    }, { passive: false });

    const release = (event) => {
      const button = event.target.closest('button[data-code]');
      if (!button) return;
      if (button.dataset.mode !== 'toggle') button.classList.remove('on');
      const code = button.dataset.code;
      if (code === 'fire') pointer.down = false;
      else if (button.dataset.mode === 'hold') keys.delete(code);
    };
    touch.addEventListener('pointerup', release);
    touch.addEventListener('pointercancel', release);
    touch.addEventListener('lostpointercapture', release);
  }

  function resize() {
    if (!canvas || !ctx) return;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(width * dpr));
    canvas.height = Math.max(2, Math.round(height * dpr));
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = clamp(Math.min(width, height) / 66, touchMode ? 7.2 : 8.8, 15);
    vignette = ctx.createRadialGradient(width / 2, height * 0.54, Math.min(width, height) * 0.16, width / 2, height * 0.54, Math.max(width, height) * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.63, 'rgba(0,0,0,0.1)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
  }

  function camera() {
    const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    return { x: width / 2 + sx, y: height * 0.55 + sy };
  }

  function worldToScreen(x, z, cam) {
    const view = cam || camera();
    return { x: view.x + (x - me.x) * scale, y: view.y + (z - me.z) * scale };
  }

  function screenToWorld(x, y) {
    const view = camera();
    return { x: me.x + (x - view.x) / scale, z: me.z + (y - view.y) / scale };
  }

  function blocked(x, z) {
    if (x < -66 || x > 44 || z < -43 || z > 43) return true;
    const radius = 0.55;
    for (const box of containers) {
      if (Math.abs(x - box.x) < box.w / 2 + radius && Math.abs(z - box.z) < box.d / 2 + radius) return true;
    }
    if (Math.abs(x - warehouse.x) < warehouse.w / 2 + radius && Math.abs(z - warehouse.z) < warehouse.d / 2 + radius) return true;
    return false;
  }

  function movePlayer(dx, dz) {
    if (heli.piloting) {
      heli.x = clamp(heli.x + dx, -86, 86);
      heli.z = clamp(heli.z + dz, -58, 58);
      me.x = heli.x;
      me.z = heli.z;
      return;
    }
    if (!blocked(me.x + dx, me.z)) me.x += dx;
    if (!blocked(me.x, me.z + dz)) me.z += dz;
  }

  function aimAtNearest() {
    let best = null;
    let bestDist = Infinity;
    const candidates = [...remote.values()].filter((item) => item.alive).concat(drones.filter((item) => item.alive));
    for (const item of candidates) {
      const d = Math.hypot(item.x - me.x, item.z - me.z);
      if (d < bestDist && d < 70) {
        bestDist = d;
        best = item;
      }
    }
    if (best) me.yaw = Math.atan2(best.x - me.x, -(best.z - me.z));
  }

  function useHelicopter() {
    if (!me.alive) return;
    if (heli.piloting) {
      heli.piloting = false;
      me.inHeli = false;
      me.x = clamp(heli.x + 2.4, -80, 80);
      me.z = clamp(heli.z + 1.1, -50, 50);
      me.yaw = Math.atan2(-1.1, -2.4);
      toast(t('heliExit'));
      return;
    }
    const distance = Math.hypot(heli.x - me.x, heli.z - me.z);
    if (distance > 4.2) {
      toast(t('heliBusy'));
      return;
    }
    heli.piloting = true;
    me.inHeli = true;
    me.x = heli.x;
    me.z = heli.z;
    me.sprinting = false;
    toast(t('heliBoard'));
  }

  function reload(now) {
    if (me.inHeli || me.reloadingUntil > now || me.ammo >= me.mag) return;
    me.reloadingUntil = now + 1550;
    reloadFlash = 1;
  }

  function toast(text) {
    const api = mp();
    if (api && typeof api.toast === 'function') api.toast(text);
  }

  function shoot(now) {
    if (!me.alive || (pointer.down === false && !me.inHeli)) return;
    const interval = me.inHeli ? 105 : 118;
    if (now - lastShotAt < interval) return;
    if (!me.inHeli) {
      if (me.reloadingUntil > now) return;
      if (me.ammo <= 0) {
        reload(now);
        return;
      }
      me.ammo -= 1;
    }
    lastShotAt = now;
    shake = Math.min(8, shake + (me.inHeli ? 1.2 : 2.4));

    const dirX = Math.sin(me.yaw);
    const dirZ = -Math.cos(me.yaw);
    const origin = { x: me.x + dirX * 0.9, y: me.inHeli ? 2.6 : 1.35, z: me.z + dirZ * 0.9 };
    send({ type: 'shot', origin, dir: { x: dirX, y: 0, z: dirZ } });

    const target = pickScreenTarget(pointer.x, pointer.y);
    let endX = me.x + dirX * 78;
    let endZ = me.z + dirZ * 78;
    if (target) {
      endX = target.x;
      endZ = target.z;
      hitMarker = 1;
      if (target.remote) {
        send({ type: 'hit', targetId: target.remote.id });
      } else if (target.drone) {
        target.drone.hp -= me.inHeli ? 45 : 34;
        burst(target.x, target.z, '#ffb347', 7);
        if (target.drone.hp <= 0) {
          target.drone.alive = false;
          target.drone.respawnAt = now + 8000;
          me.kills += 1;
          burst(target.x, target.z, '#ff7a55', 18);
          toast(t('hit'));
        }
      }
    }
    tracers.push({
      x1: origin.x,
      z1: origin.z,
      x2: endX,
      z2: endZ,
      life: 0.12,
      max: 0.12,
      color: me.inHeli ? '#ffd27a' : '#ffb347'
    });
    burst(origin.x, origin.z, '#ffc977', 2, 0.3);
  }

  function pickScreenTarget(px, py) {
    const cam = camera();
    let best = null;
    let bestScore = Infinity;
    for (const item of remote.values()) {
      if (!item.alive) continue;
      const screen = worldToScreen(item.x, item.z, cam);
      const dist = Math.hypot(screen.x - px, screen.y - py);
      const radius = 22;
      if (dist > radius) continue;
      if (Math.hypot(item.x - me.x, item.z - me.z) > 90) continue;
      if (dist < bestScore) {
        bestScore = dist;
        best = { x: item.x, z: item.z, remote: item };
      }
    }
    for (const item of drones) {
      if (!item.alive) continue;
      const screen = worldToScreen(item.x, item.z, cam);
      const dist = Math.hypot(screen.x - px, screen.y - py);
      if (dist > 24 || Math.hypot(item.x - me.x, item.z - me.z) > 82) continue;
      if (dist < bestScore) {
        bestScore = dist;
        best = { x: item.x, z: item.z, drone: item };
      }
    }
    return best;
  }

  function burst(x, z, color, count, speed) {
    const power = speed || 4.2;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = power * (0.35 + Math.random() * 0.85);
      particles.push({
        x,
        z,
        vx: Math.sin(angle) * velocity,
        vz: Math.cos(angle) * velocity,
        life: 0.25 + Math.random() * 0.38,
        max: 0.63,
        size: 0.8 + Math.random() * 1.8,
        color
      });
    }
  }

  function takeDamage(amount) {
    if (!me.alive || Date.now() < me.invulnerableUntil) return;
    me.hp = Math.max(0, me.hp - amount);
    flash = 1;
    shake = Math.min(12, shake + 6);
    burst(me.x, me.z, '#ff5a40', 6, 2.4);
    if (me.hp <= 0) enterDeath(Date.now() + 5000, true);
  }

  function enterDeath(until, report, by) {
    if (!me.alive) return;
    me.alive = false;
    me.deadUntil = Math.max(Date.now() + 800, Number(until) || Date.now() + 5000);
    me.deadBy = by || null;
    me.deaths += 1;
    me.inHeli = false;
    heli.piloting = false;
    keys.clear();
    pointer.down = false;
    if (report && !deathSent) {
      deathSent = true;
      send({ type: 'died' });
    }
    respawnRequested = false;
    respawnFallback = 0;
    ui.dead.hidden = false;
    updateDeadUi();
  }

  function revive(pos, protectedUntil) {
    me.alive = true;
    me.hp = me.maxHp;
    me.deadUntil = 0;
    me.deadBy = null;
    me.invulnerableUntil = Number(protectedUntil) || Date.now() + 1600;
    me.reloadingUntil = 0;
    me.ammo = me.mag;
    deathSent = false;
    respawnRequested = false;
    respawnFallback = 0;
    if (pos && Number.isFinite(Number(pos.x)) && Number.isFinite(Number(pos.z))) {
      me.x = clamp(Number(pos.x), -66, 44);
      me.z = clamp(Number(pos.z), -43, 43);
    } else {
      me.x = 0;
      me.z = 4;
    }
    me.y = me.kind === 'drone' ? 1.2 : 0;
    ui.dead.hidden = true;
    if (ui.deadBy) {
      ui.deadBy.hidden = true;
      ui.deadBy.textContent = '';
    }
    shake = 0;
    toast(t('respawned'));
  }

  function requestRespawn() {
    if (me.alive || respawnRequested) return;
    if (Date.now() < me.deadUntil) return;
    respawnRequested = true;
    send({ type: 'respawn' });
    respawnFallback = Date.now() + 1800;
  }

  function updateDeadUi() {
    if (me.alive) {
      ui.dead.hidden = true;
      return;
    }
    ui.dead.hidden = false;
    const left = Math.max(0, me.deadUntil - Date.now());
    ui.deadN.textContent = String(Math.max(0, Math.ceil(left / 1000)));
    const unit = killerUnitLabel(me.deadBy);
    if (me.deadBy) {
      ui.deadBy.textContent = unit
        ? t('downByUnit', { name: me.deadBy.name, unit })
        : t('downBy', { name: me.deadBy.name });
      ui.deadBy.hidden = false;
    } else {
      ui.deadBy.textContent = '';
      ui.deadBy.hidden = true;
    }
    ui.deadLine.textContent = left > 0 ? t('respawnIn', { n: Math.ceil(left / 1000) }) : t('respawnReady');
    ui.deadBtn.disabled = left > 0;
  }

  function handleServer(msg) {
    if (!msg || typeof msg.type !== 'string') return;
    switch (msg.type) {
      case 'snapshot': {
        online = Number(msg.online) || 0;
        if (msg.you) {
          serverId = msg.you.id;
          if (!spectateId && !document.body.classList.contains('focus-mode-on') && !msg.you.alive && me.alive) {
            enterDeath(Number(msg.you.respawnAt) || Date.now() + 5000, false);
          } else if (!spectateId && !document.body.classList.contains('focus-mode-on') && msg.you.alive && !me.alive && Date.now() >= me.deadUntil) {
            revive(null, msg.you.protectedUntil);
          }
        }
        const seen = new Set();
        for (const item of msg.players || []) {
          if (item.id === serverId) continue;
          seen.add(item.id);
          const previous = remote.get(item.id);
          if (previous) {
            previous.tx = Number(item.x) || 0;
            previous.tz = Number(item.z) || 0;
            previous.tyaw = Number(item.yaw) || 0;
            previous.data = item;
            previous.alive = item.hp > 0;
          } else {
            remote.set(item.id, {
              id: item.id,
              x: Number(item.x) || 0,
              z: Number(item.z) || 0,
              tx: Number(item.x) || 0,
              tz: Number(item.z) || 0,
              yaw: Number(item.yaw) || 0,
              tyaw: Number(item.yaw) || 0,
              data: item,
              alive: item.hp > 0
            });
          }
        }
        for (const id of remote.keys()) {
          if (!seen.has(id)) remote.delete(id);
        }
        break;
      }
      case 'youDied': {
        me.deadBy = msg.by || null;
        enterDeath(Date.now() + Math.max(500, Number(msg.respawnIn) || 5000), false, msg.by);
        if (!me.alive) updateDeadUi();
        break;
      }
      case 'deathAck': {
        const until = Number(msg.respawnAt) || Date.now() + (Number(msg.respawnIn) || 5000);
        if (!me.alive) me.deadUntil = Math.max(me.deadUntil, until);
        else enterDeath(until, false);
        break;
      }
      case 'respawnWait': {
        if (!me.alive) me.deadUntil = Math.max(me.deadUntil, Date.now() + (Number(msg.ms) || 0) + 350);
        break;
      }
      case 'respawned': {
        revive(msg.pos, msg.protectedUntil);
        break;
      }
      case 'damaged': {
        if (msg.from && msg.from.id !== serverId) takeDamage(Number(msg.amount) || 0);
        break;
      }
      case 'hitConfirm': {
        if (msg.blocked) toast(t('shielded'));
        else hitMarker = 1;
        break;
      }
      case 'shot': {
        if (!msg.origin || !msg.dir) break;
        const length = 64;
        tracers.push({
          x1: Number(msg.origin.x) || 0,
          z1: Number(msg.origin.z) || 0,
          x2: (Number(msg.origin.x) || 0) + (Number(msg.dir.x) || 0) * length,
          z2: (Number(msg.origin.z) || 0) + (Number(msg.dir.z) || 0) * length,
          life: 0.1,
          max: 0.1,
          color: '#8ecfff'
        });
        break;
      }
      case 'kill': {
        if (msg.killer && msg.killer.id === serverId && me.kills < 9999) {
          hitMarker = 1;
        }
        break;
      }
      default:
        break;
    }
  }

  function attachNetwork() {
    const api = mp();
    if (!api) {
      window.setTimeout(attachNetwork, 250);
      return;
    }
    if (typeof api.onMessage === 'function') api.onMessage(handleServer);
    if (typeof api.connected !== 'undefined' && !api.connected) {
      window.setTimeout(function waitForSocket() {
        if (!active) return;
        if (!mp() || !mp().connected) window.setTimeout(waitForSocket, 600);
      }, 600);
    }
  }

  function updateInput(dt, now) {
    if (spectateId || document.body.classList.contains('focus-mode-on')) {
      const target = spectateId ? remote.get(spectateId) : null;
      if (target) {
        me.x += (target.x - me.x) * Math.min(0.32, Math.max(0.06, dt * 5));
        me.z += (target.z - me.z) * Math.min(0.32, Math.max(0.06, dt * 5));
        me.yaw = target.yaw || 0;
        me.moving = true;
      }
      return;
    }
    if (!me.alive) {
      ui.deadBtn.disabled = Date.now() < me.deadUntil;
      updateDeadUi();
      if (Date.now() >= me.deadUntil) requestRespawn();
      if (respawnRequested && respawnFallback && Date.now() > respawnFallback) revive(null, 0);
      return;
    }

    if (!touchMode && pointer.seen) {
      const cam = camera();
      const playerScreen = worldToScreen(me.x, me.z, cam);
      const dx = pointer.x - playerScreen.x;
      const dy = pointer.y - playerScreen.y;
      if (Math.hypot(dx, dy) > 12) me.yaw = Math.atan2(dx, -dy);
    }

    const api = mp();
    me.kind = normalizeUnit(api && api.soldier ? api.soldier : me.kind);
    if (ui.touchRise) ui.touchRise.style.display = me.kind === 'drone' ? 'grid' : 'none';
    if (ui.touchDescend) ui.touchDescend.style.display = me.kind === 'drone' ? 'grid' : 'none';
    const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && me.kind !== 'drone';
    const speed = me.inHeli
      ? 19
      : me.kind === 'drone'
        ? 11
        : me.kind === 'hound'
          ? (sprinting ? 10.5 : 8.2)
          : (sprinting ? 10.4 : 7);
    me.sprinting = !me.inHeli && me.kind !== 'drone' && speed > 9 && (forward !== 0 || strafe !== 0);
    me.moving = forward !== 0 || strafe !== 0;
    me.phase += dt * (me.moving ? (me.sprinting ? 13 : 9) : 2);

    if (me.kind === 'drone' && !me.inHeli) {
      if (keys.has('Space')) me.y += 4.6 * dt;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) me.y -= 4.6 * dt;
      me.y = clamp(me.y || 1.2, 1.2, 22);
    } else {
      me.y = me.inHeli ? 3.2 : 0;
    }

    if (me.moving) {
      const norm = Math.hypot(forward, strafe) || 1;
      const f = forward / norm;
      const s = strafe / norm;
      const dirX = Math.sin(me.yaw) * f + Math.cos(me.yaw) * s;
      const dirZ = -Math.cos(me.yaw) * f + Math.sin(me.yaw) * s;
      movePlayer(dirX * speed * dt, dirZ * speed * dt);
    }

    if (me.inHeli && pointer.down) {
      if (now - lastShotAt >= 105) {
        if (heli.ammo <= 0) heli.ammo = 240;
        heli.ammo -= 1;
      }
      shoot(now);
    } else if (pointer.down) {
      shoot(now);
    }

    if (!me.inHeli && me.reloadingUntil && now >= me.reloadingUntil) {
      me.reloadingUntil = 0;
      me.ammo = me.mag;
      toast(t('reloaded'));
    }

    const nearHeli = Math.hypot(heli.x - me.x, heli.z - me.z) < 4.2;
    ui.heliPrompt.hidden = !nearHeli || me.inHeli;
    if (nearHeli) ui.heliText.textContent = t('heliNear');
    if (me.inHeli) {
      ui.heliPrompt.hidden = true;
    }
  }

  function updateWorld(dt, now) {
    for (const item of remote.values()) {
      item.x = lerp(item.x, item.tx, Math.min(1, dt * 13));
      item.z = lerp(item.z, item.tz, Math.min(1, dt * 13));
      item.yaw = lerp(item.yaw, item.tyaw, Math.min(1, dt * 13));
    }

    for (const drone of drones) {
      if (!drone.alive) {
        if (now >= drone.respawnAt) {
          drone.hp = 68;
          drone.alive = true;
        }
        continue;
      }
      drone.phase += dt * 0.7;
      const distance = Math.hypot(drone.x - me.x, drone.z - me.z);
      if (me.alive && distance < 26 && now >= drone.nextShotAt) {
        drone.nextShotAt = now + 2200 + Math.random() * 1500;
        const dx = me.x - drone.x;
        const dz = me.z - drone.z;
        const len = Math.hypot(dx, dz) || 1;
        projectiles.push({
          x: drone.x,
          z: drone.z,
          vx: dx / len * 10.5,
          vz: dz / len * 10.5,
          life: 4,
          color: '#ff7a55'
        });
      }
    }

    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const shot = projectiles[i];
      shot.x += shot.vx * dt;
      shot.z += shot.vz * dt;
      shot.life -= dt;
      if (me.alive && Math.hypot(shot.x - me.x, shot.z - me.z) < (me.inHeli ? 1.8 : 0.7)) {
        takeDamage(7);
        projectiles.splice(i, 1);
      } else if (shot.life <= 0) {
        projectiles.splice(i, 1);
      }
    }

    for (let i = tracers.length - 1; i >= 0; i -= 1) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) tracers.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.z += particle.vz * dt;
      particle.vx *= 0.93;
      particle.vz *= 0.93;
      particle.life -= dt;
      if (particle.life <= 0) particles.splice(i, 1);
    }

    heli.rotor += dt * (heli.piloting ? 34 : 2.4);
    shake = Math.max(0, shake - dt * 26);
    flash = Math.max(0, flash - dt * 2.5);
    hitMarker = Math.max(0, hitMarker - dt * 4);
    reloadFlash = Math.max(0, reloadFlash - dt * 1.4);

    if (mp() && mp().connected && now - lastStateAt >= 100) {
      lastStateAt = now;
      send({
        type: 'state',
        pos: { x: me.x, y: me.y, z: me.z },
        yaw: me.yaw,
        pitch: 0,
        active: me.alive,
        moving: me.moving,
        sprint: me.sprinting
      });
    }
  }

  function drawGrid(cam) {
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(width, height);
    const minX = Math.floor(Math.min(topLeft.x, bottomRight.x) / 8) * 8;
    const maxX = Math.ceil(Math.max(topLeft.x, bottomRight.x) / 8) * 8;
    const minZ = Math.floor(Math.min(topLeft.z, bottomRight.z) / 8) * 8;
    const maxZ = Math.ceil(Math.max(topLeft.z, bottomRight.z) / 8) * 8;
    ctx.lineWidth = 1;
    for (let x = minX; x <= maxX; x += 8) {
      const p = worldToScreen(x, 0, cam);
      ctx.strokeStyle = x % 40 === 0 ? 'rgba(232,228,218,0.065)' : 'rgba(232,228,218,0.025)';
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, height);
      ctx.stroke();
    }
    for (let z = minZ; z <= maxZ; z += 8) {
      const p = worldToScreen(0, z, cam);
      ctx.strokeStyle = z % 40 === 0 ? 'rgba(232,228,218,0.06)' : 'rgba(232,228,218,0.022)';
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(width, p.y);
      ctx.stroke();
    }
  }

  function drawWater(cam) {
    const edge = worldToScreen(44.5, 0, cam);
    if (edge.x >= width) return;
    const gradient = ctx.createLinearGradient(edge.x, 0, width, 0);
    gradient.addColorStop(0, '#09161b');
    gradient.addColorStop(0.55, '#081317');
    gradient.addColorStop(1, '#050b0e');
    ctx.fillStyle = gradient;
    ctx.fillRect(edge.x, 0, width - edge.x, height);
    ctx.strokeStyle = 'rgba(111, 188, 205, 0.08)';
    ctx.lineWidth = 1;
    const time = performance.now() / 1000;
    for (let i = 0; i < 18; i += 1) {
      const z = -55 + i * 6.4;
      const p1 = worldToScreen(48, z + Math.sin(time + i) * 0.8, cam);
      const p2 = worldToScreen(88, z + Math.cos(time * 0.7 + i) * 1.2, cam);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    const dock = worldToScreen(44.5, 0, cam);
    ctx.fillStyle = '#1a1d1e';
    ctx.fillRect(dock.x - 4, 0, 8, height);
    ctx.fillStyle = '#ffb347';
    ctx.globalAlpha = 0.4;
    ctx.fillRect(dock.x - 1, 0, 2, height);
    ctx.globalAlpha = 1;
  }

  function drawBox(box, cam, label) {
    const center = worldToScreen(box.x, box.z, cam);
    const w = box.w * scale;
    const h = box.d * scale;
    if (center.x + w < 0 || center.x - w > width || center.y + h < 0 || center.y - h > height) return;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
    ctx.fillStyle = box.color || '#30363a';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(-w / 2, -h / 2, w, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = -w / 2 + 5; x < w / 2; x += 7) {
      ctx.fillRect(x, -h / 2 + 2, 1, Math.max(2, h - 4));
    }
    ctx.strokeStyle = 'rgba(232,228,218,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    if (label && scale > 9) {
      ctx.fillStyle = 'rgba(232,228,218,0.32)';
      ctx.font = '600 8px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0);
    }
    ctx.restore();
  }

  function drawMapDetails(cam, now) {
    drawWater(cam);
    drawGrid(cam);

    const warehouseScreen = worldToScreen(warehouse.x, warehouse.z, cam);
    const whW = warehouse.w * scale;
    const whH = warehouse.d * scale;
    if (warehouseScreen.x + whW > 0 && warehouseScreen.x - whW < width) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(warehouseScreen.x - whW / 2 + 5, warehouseScreen.y - whH / 2 + 6, whW, whH);
      ctx.fillStyle = '#20272a';
      ctx.fillRect(warehouseScreen.x - whW / 2, warehouseScreen.y - whH / 2, whW, whH);
      ctx.strokeStyle = 'rgba(232,228,218,0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(warehouseScreen.x - whW / 2, warehouseScreen.y - whH / 2, whW, whH);
      ctx.fillStyle = 'rgba(255,179,71,0.16)';
      ctx.fillRect(warehouseScreen.x - whW / 2, warehouseScreen.y - whH / 2, whW, 3);
      ctx.fillStyle = 'rgba(232,228,218,0.28)';
      ctx.font = '700 9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t('warehouseLabel'), warehouseScreen.x, warehouseScreen.y - 4);
    }

    for (let i = 0; i < containers.length; i += 1) {
      drawBox(containers[i], cam, 'SL-' + String(i + 1).padStart(2, '0'));
    }

    const pad = worldToScreen(heli.x, heli.z, cam);
    ctx.save();
    ctx.translate(pad.x, pad.y);
    ctx.strokeStyle = 'rgba(255,179,71,0.26)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 3.6 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 2.6 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(now / 9000);
    ctx.fillStyle = 'rgba(255,179,71,0.12)';
    ctx.fillRect(-1.4 * scale, -1.4 * scale, 2.8 * scale, 2.8 * scale);
    ctx.restore();

    for (const z of [-28, 29]) {
      const base = worldToScreen(39, z, cam);
      ctx.strokeStyle = 'rgba(255,179,71,0.23)';
      ctx.lineWidth = 2;
      ctx.strokeRect(base.x - 2.5 * scale, base.y - 1.2 * scale, 5 * scale, 2.4 * scale);
      ctx.beginPath();
      ctx.moveTo(base.x - 2.5 * scale, base.y);
      ctx.lineTo(base.x + 5.6 * scale, base.y);
      ctx.moveTo(base.x + 1.4 * scale, base.y - 1.1 * scale);
      ctx.lineTo(base.x + 1.4 * scale, base.y - 3.2 * scale);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(232,228,218,0.11)';
    for (const prop of [{ x: 3, z: 16 }, { x: -37, z: -6 }, { x: 29, z: -19 }]) {
      const p = worldToScreen(prop.x, prop.z, cam);
      ctx.fillRect(p.x - 4, p.y - 2, 8, 4);
    }
  }

  function drawTracers(cam) {
    for (const tracer of tracers) {
      const a = worldToScreen(tracer.x1, tracer.z1, cam);
      const b = worldToScreen(tracer.x2, tracer.z2, cam);
      const alpha = clamp(tracer.life / tracer.max, 0, 1);
      ctx.strokeStyle = tracer.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = tracer.color === '#8ecfff' ? 1.1 : 1.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.4;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const shot of projectiles) {
      const p = worldToScreen(shot.x, shot.z, cam);
      ctx.fillStyle = shot.color;
      ctx.shadowColor = shot.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawParticles(cam) {
    for (const particle of particles) {
      const p = worldToScreen(particle.x, particle.z, cam);
      ctx.globalAlpha = clamp(particle.life / particle.max, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(p.x - particle.size / 2, p.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHeli(cam) {
    const p = worldToScreen(heli.x, heli.z, cam);
    if (p.x < -120 || p.x > width + 120 || p.y < -120 || p.y > height + 120) return;
    const size = (heli.piloting ? 1.35 : 1.05) * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(4, 6, size * 0.9, size * 0.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(me.inHeli ? -me.yaw : 0.35);
    ctx.fillStyle = '#262d30';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.7, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#364147';
    ctx.fillRect(-size * 1.05, -size * 0.12, size * 0.9, size * 0.24);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(-size * 0.2, -size * 0.15, size * 0.4, size * 0.3);
    ctx.strokeStyle = 'rgba(232,228,218,0.38)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    const rotorAlpha = 0.16 + (Math.sin(heli.rotor) * 0.5 + 0.5) * 0.2;
    ctx.strokeStyle = 'rgba(232,228,218,' + rotorAlpha.toFixed(2) + ')';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(heli.rotor + i * 2.09) * size * 0.9, Math.sin(heli.rotor + i * 2.09) * size * 0.9);
      ctx.lineTo(Math.cos(heli.rotor + i * 2.09 + Math.PI) * size * 0.9, Math.sin(heli.rotor + i * 2.09 + Math.PI) * size * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff5a40';
    ctx.beginPath();
    ctx.arc(-size * 0.58, 0, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDrone(drone, cam, now) {
    if (!drone.alive) return;
    const p = worldToScreen(drone.x, drone.z, cam);
    if (p.x < -60 || p.x > width + 60 || p.y < -60 || p.y > height + 60) return;
    const bob = Math.sin(now / 330 + drone.phase) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = 'rgba(255,90,64,0.13)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,64,0.66)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#2a2020';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(7, 5);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5a40';
    ctx.beginPath();
    ctx.arc(Math.sin(now / 300 + drone.phase) * 4, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const hpWidth = 24;
    const hpPct = clamp(drone.hp / 68, 0, 1);
    ctx.fillStyle = 'rgba(8,10,12,0.74)';
    ctx.fillRect(p.x - hpWidth / 2, p.y - 20, hpWidth, 2);
    ctx.fillStyle = hpPct > 0.45 ? '#ffb347' : '#ff5a40';
    ctx.fillRect(p.x - hpWidth / 2, p.y - 20, hpWidth * hpPct, 2);
  }

  function drawTopDownRifle(radius, color) {
    const arm = Math.max(1.2, radius * 0.26);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(205, 169, 132, 0.78)';
    ctx.lineWidth = arm;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, 0);
    ctx.lineTo(radius * 0.06, -radius * 0.48);
    ctx.moveTo(radius * 0.5, -radius * 0.02);
    ctx.lineTo(radius * 0.06, -radius * 1.38);
    ctx.stroke();

    ctx.fillStyle = '#0d1114';
    ctx.fillRect(-radius * 0.15, radius * 0.48, radius * 0.3, radius * 0.62);
    ctx.fillStyle = '#14181c';
    ctx.fillRect(-radius * 0.17, -radius * 0.98, radius * 0.34, radius * 1.42);
    ctx.fillStyle = '#1f2123';
    ctx.fillRect(-radius * 0.13, -radius * 1.82, radius * 0.26, radius * 0.9);
    ctx.fillStyle = '#12161a';
    ctx.fillRect(-radius * 0.075, -radius * 2.56, radius * 0.15, radius * 0.78);
    ctx.fillStyle = '#6a5646';
    ctx.fillRect(-radius * 0.16, radius * 0.12, radius * 0.32, radius * 0.2);
    ctx.fillStyle = '#6a5646';
    ctx.fillRect(-radius * 0.11, -radius * 1.14, radius * 0.22, radius * 0.16);
    ctx.fillStyle = '#7ef0e2';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.64, Math.max(1.5, radius * 0.15), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(205, 169, 132, 0.94)';
    ctx.beginPath();
    ctx.arc(radius * 0.02, -radius * 1.38, Math.max(1.6, radius * 0.16), 0, Math.PI * 2);
    ctx.arc(radius * 0.02, -radius * 0.48, Math.max(1.6, radius * 0.17), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.25, radius * 1.08);
    ctx.lineTo(radius * 0.25, radius * 1.08);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawMachineTopDown(kind, radius, color, phase) {
    ctx.lineCap = 'round';
    if (kind === 'hound') {
      ctx.fillStyle = '#12191d';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.62, radius * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232,228,218,0.55)';
      ctx.lineWidth = 1.3;
      const swing = Math.sin(phase) * radius * 0.2;
      for (const x of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x * radius * 0.42, -radius * 0.55);
        ctx.lineTo(x * radius * 0.95, -radius * 0.8 + swing);
        ctx.moveTo(x * radius * 0.42, radius * 0.55);
        ctx.lineTo(x * radius * 0.95, radius * 0.8 - swing);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.fillRect(-radius * 0.16, -radius * 0.88, radius * 0.32, radius * 0.42);
      return;
    }

    ctx.strokeStyle = 'rgba(232,228,218,0.62)';
    ctx.lineWidth = 1.25;
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x * radius * 1.05, z * radius * 1.05);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55 + (Math.sin(phase + x + z) * 0.5 + 0.5) * 0.4;
        ctx.beginPath();
        ctx.arc(x * radius * 1.05, z * radius * 1.05, radius * 0.32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(232,228,218,0.62)';
      }
    }
    ctx.fillStyle = '#11181d';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.5, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.28, Math.max(1.4, radius * 0.14), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAvatar(item, cam) {
    const p = worldToScreen(item.x, item.z, cam);
    if (p.x < -60 || p.x > width + 60 || p.y < -60 || p.y > height + 60) return;
    const data = item.data || {};
    const color = data.color || '#5fd0ff';
    const kind = normalizeUnit(data.soldier);
    const radius = (kind === 'hound' || kind === 'drone' ? 0.56 : 0.46) * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(item.yaw);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(3, 4, radius * 1.3, radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'hound' || kind === 'drone') {
      drawMachineTopDown(kind, radius, color, performance.now() / 80 + item.id.length);
    } else {
      ctx.fillStyle = '#151b20';
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
      drawTopDownRifle(radius, color);
    }
    ctx.restore();

    const hp = Number(data.hp);
    const hpValue = Number.isFinite(hp) ? clamp(hp, 0, 100) : 100;
    const labelWidth = Math.max(54, Math.min(118, (data.name || '').length * 7.5 + 20));
    ctx.fillStyle = 'rgba(8,11,13,0.76)';
    ctx.fillRect(p.x - labelWidth / 2, p.y - radius - 27, labelWidth, 13);
    ctx.fillStyle = color;
    ctx.font = '600 9px "Barlow Condensed", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.name || '', p.x, p.y - radius - 20, labelWidth - 8);
    ctx.fillStyle = 'rgba(8,11,13,0.8)';
    ctx.fillRect(p.x - labelWidth / 2 + 4, p.y - radius - 11, labelWidth - 8, 2);
    ctx.fillStyle = hpValue > 55 ? '#8affc1' : hpValue > 25 ? '#ffd166' : '#ff5a40';
    ctx.fillRect(p.x - labelWidth / 2 + 4, p.y - radius - 11, (labelWidth - 8) * hpValue / 100, 2);
    if (data.shield) {
      ctx.strokeStyle = 'rgba(126,240,226,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPlayer(cam, now) {
    if (spectateId || document.body.classList.contains('focus-mode-on')) return;
    const p = worldToScreen(me.x, me.z, cam);
    const machine = me.kind === 'hound' || me.kind === 'drone';
    const radius = (me.inHeli ? 0.32 : machine ? 0.58 : 0.48) * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(me.yaw);
    ctx.fillStyle = 'rgba(255,179,71,0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (machine) {
      drawMachineTopDown(me.kind, radius, '#ffb347', me.phase);
    } else {
      ctx.fillStyle = '#0b0d0f';
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      drawTopDownRifle(radius, '#ffb347');
    }
    ctx.restore();

    if (me.inHeli || machine) return;

    const walk = me.moving ? Math.sin(now / 90) * radius * 0.22 : 0;
    ctx.strokeStyle = 'rgba(232,228,218,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - radius * 0.45, p.y + walk);
    ctx.lineTo(p.x - radius * 0.55, p.y + radius * 0.95);
    ctx.moveTo(p.x + radius * 0.45, p.y - walk);
    ctx.lineTo(p.x + radius * 0.55, p.y + radius * 0.95);
    ctx.stroke();

    if (flash > 0) {
      ctx.strokeStyle = 'rgba(255,90,64,' + Math.min(0.5, flash).toFixed(2) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 3.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCrosshair() {
    if (spectateId || document.body.classList.contains('focus-mode-on')) return;
    const x = touchMode && !pointer.seen ? width / 2 : pointer.x;
    const y = touchMode && !pointer.seen ? height * 0.45 : pointer.y;
    const target = pickScreenTarget(x, y);
    const activeColor = target ? '#ff7a55' : 'rgba(232,228,218,0.7)';
    const gap = target ? 9 : 7;
    const len = target ? 8 : 6;
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - gap - len, y);
    ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + gap + len, y);
    ctx.moveTo(x, y - gap - len);
    ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + gap + len);
    ctx.stroke();
    ctx.fillStyle = activeColor;
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    if (hitMarker > 0) {
      ctx.globalAlpha = hitMarker;
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 9);
      ctx.lineTo(x - 4, y - 4);
      ctx.moveTo(x + 9, y - 9);
      ctx.lineTo(x + 4, y - 4);
      ctx.moveTo(x - 9, y + 9);
      ctx.lineTo(x - 4, y + 4);
      ctx.moveTo(x + 9, y + 9);
      ctx.lineTo(x + 4, y + 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawMinimap() {
    if (width < 720) return;
    const mapW = 126;
    const mapH = 96;
    const x = width - mapW - 18;
    const y = height - mapH - 20;
    ctx.fillStyle = 'rgba(8,11,13,0.76)';
    ctx.fillRect(x, y, mapW, mapH);
    ctx.strokeStyle = 'rgba(232,228,218,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, mapW - 1, mapH - 1);
    ctx.fillStyle = 'rgba(111,188,205,0.1)';
    ctx.fillRect(x + mapW * 0.72, y + 1, mapW * 0.28 - 1, mapH - 2);
    const toMap = (wx, wz) => ({
      x: x + 6 + ((clamp(wx, -66, 44) + 66) / 110) * (mapW - 12),
      y: y + 6 + ((clamp(wz, -43, 43) + 43) / 86) * (mapH - 12)
    });
    for (const box of containers) {
      const p = toMap(box.x, box.z);
      ctx.fillStyle = 'rgba(232,228,218,0.18)';
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    const hp = toMap(heli.x, heli.z);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(hp.x - 2, hp.y - 2, 4, 4);
    for (const item of remote.values()) {
      const p = toMap(item.x, item.z);
      ctx.fillStyle = item.data && item.data.color ? item.data.color : '#5fd0ff';
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    const self = toMap(me.x, me.z);
    ctx.fillStyle = '#e8e4da';
    ctx.beginPath();
    ctx.arc(self.x, self.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,228,218,0.4)';
    ctx.font = '500 7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(t('quay'), x + 6, y + mapH - 4);
  }

  function draw(now) {
    const cam = camera();
    const ground = ctx.createRadialGradient(cam.x, cam.y, 30, cam.x, cam.y, Math.max(width, height) * 0.72);
    ground.addColorStop(0, '#141719');
    ground.addColorStop(0.48, '#0f1214');
    ground.addColorStop(1, '#0c0d0f');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, width, height);

    drawMapDetails(cam, now);
    drawHeli(cam);
    for (const drone of drones) drawDrone(drone, cam, now);
    for (const item of remote.values()) drawAvatar(item, cam);
    drawPlayer(cam, now);
    drawTracers(cam);
    drawParticles(cam);

    if (vignette) {
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,48,24,' + Math.min(0.28, flash * 0.3).toFixed(3) + ')';
      ctx.fillRect(0, 0, width, height);
    }
    drawCrosshair();
    drawMinimap();

    ctx.fillStyle = 'rgba(232,228,218,0.24)';
    ctx.font = '500 8px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t('canvasTag'), width / 2, height - 10);
  }

  function syncHud() {
    const hp = Math.round(me.hp);
    ui.healthValue.textContent = String(hp);
    ui.health.classList.toggle('is-low', hp <= 34);
    ui.healthFill.style.transform = 'scaleX(' + clamp(me.hp / me.maxHp, 0, 1).toFixed(3) + ')';
    ui.ammoValue.textContent = me.inHeli ? '∞' : String(Math.max(0, me.ammo));
    ui.ammoMax.textContent = me.inHeli ? t('mg') : '/' + me.mag;
    ui.ammo.classList.toggle('is-reloading', me.reloadingUntil > performance.now());
    ui.ammo.classList.toggle('is-empty', !me.inHeli && me.ammo <= 0);
    const api = mp();
    const connected = !!(api && api.connected);
    ui.status.textContent = t(connected ? 'online' : 'offline', { n: online });
  }

  function frame(now) {
    if (!active) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    updateInput(dt, now);
    updateWorld(dt, now);
    draw(now);
    syncHud();
    raf = window.requestAnimationFrame(frame);
  }

  function bindInput() {
    window.addEventListener('keydown', (event) => {
      if (!active) return;
      const target = event.target;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'KeyP', 'Escape', 'Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.repeat) return;
      keys.add(event.code);
      if (event.code === 'KeyE') useHelicopter();
      if (event.code === 'KeyR') reload(performance.now());
    }, { passive: false });

    window.addEventListener('keyup', (event) => {
      keys.delete(event.code);
    });

    window.addEventListener('blur', () => {
      keys.clear();
      pointer.down = false;
    });

    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') {
        touchMode = true;
        document.body.classList.add('is-touch-ui');
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.seen = true;
    }, { passive: true });

    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return;
      event.preventDefault();
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.seen = true;
      pointer.down = true;
      if (touchMode) aimAtNearest();
      try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
    }, { passive: false });

    const release = (event) => {
      pointer.down = false;
      try { canvas.releasePointerCapture(event.pointerId); } catch (err) { /* ignore */ }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        keys.clear();
        pointer.down = false;
      }
    });
  }

  function enterCompatibilityMode() {
    if (active) return;
    active = true;
    const diagnostics = {
      fatal: window.__fatal || '',
      errors: Array.isArray(window.__errors) ? window.__errors.slice(0, 6) : []
    };
    document.body.classList.add('is-compat', 'is-playing');
    document.body.dataset.renderMode = 'canvas2d';

    const clearRecoveredError = () => {
      const node = document.getElementById('fatal');
      if (node) node.remove();
      window.__fatal = null;
      window.__errors = [];
    };
    clearRecoveredError();
    let clearPasses = 0;
    const clearTimer = window.setInterval(() => {
      clearRecoveredError();
      clearPasses += 1;
      if (clearPasses >= 8) window.clearInterval(clearTimer);
    }, 400);
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    touchMode = (navigator.maxTouchPoints || 0) > 0 && (coarse || window.innerWidth < 900);
    document.body.classList.toggle('is-touch-ui', touchMode);

    const fatal = document.getElementById('fatal');
    if (fatal) fatal.remove();
    const boot = document.getElementById('boot');
    if (boot) {
      const sub = document.getElementById('boot-msg');
      const hint = document.querySelector('.boot-hint');
      const fill = document.getElementById('boot-fill');
      if (sub) sub.textContent = t('title');
      if (hint) hint.textContent = t(reasonKey());
      if (fill) fill.style.width = '100%';
      boot.classList.add('done');
      boot.style.display = 'none';
      boot.hidden = true;
    }
    const oldView = document.getElementById('view');
    if (oldView) oldView.setAttribute('aria-hidden', 'true');

    canvas = document.createElement('canvas');
    canvas.id = 'compat-view';
    canvas.setAttribute('aria-label', t('title'));
    const uiAnchor = document.getElementById('ui');
    app.insertBefore(canvas, uiAnchor || null);
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      canvas.remove();
      return;
    }

    buildUi();
    resize();
    pointer.x = width / 2;
    pointer.y = height * 0.43;
    bindInput();
    attachNetwork();

    window.__compat = {
      active: true,
      reason,
      diagnostics,
      get player() { return { x: me.x, z: me.z, hp: me.hp, alive: me.alive, inHeli: me.inHeli }; },
      get online() { return online; },
      get remotes() { return [...remote.values()].map((item) => ({ id: item.id, x: item.x, z: item.z, data: item.data })); },
      get helicopter() { return { x: heli.x, z: heli.z, piloting: heli.piloting }; },
      useHelicopter,
      setSpectate(id) {
        spectateId = id ? String(id) : null;
      },
      focusDeploy(spawn, protectedUntil) {
        spectateId = null;
        if (spawn) {
          me.x = Number(spawn.x) || me.x;
          me.y = Number(spawn.y) || 0;
          me.z = Number(spawn.z) || me.z;
        }
        me.alive = true;
        me.hp = me.maxHp;
        me.deadUntil = 0;
        me.deadBy = null;
        me.invulnerableUntil = Number(protectedUntil) || Date.now() + 1800;
        if (ui.dead) ui.dead.hidden = true;
      }
    };
    raf = window.requestAnimationFrame(frame);
  }

  function watch() {
    if (forced) {
      enterCompatibilityMode();
      return;
    }
    if (window.__SALT_GFX__ && window.__SALT_GFX__.software) {
      reason = 'software';
      enterCompatibilityMode();
      return;
    }
    if (window.__SALT_GFX__ && window.__SALT_GFX__.webgl2 === false) {
      enterCompatibilityMode();
      return;
    }
    if (window.__fatal || document.getElementById('fatal')) {
      enterCompatibilityMode();
      return;
    }
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      if (active) {
        window.clearInterval(timer);
        return;
      }
      if (window.__fatal || document.getElementById('fatal')) {
        window.clearInterval(timer);
        enterCompatibilityMode();
        return;
      }
      if (window.__G && window.__G.renderer) {
        window.clearInterval(timer);
        return;
      }
      if (window.__SALT_GFX__ && window.__SALT_GFX__.webgl2 === false) {
        window.clearInterval(timer);
        enterCompatibilityMode();
        return;
      }
      const now = performance.now();
      if (now - startedAt > 20000) {
        window.clearInterval(timer);
        reason = 'timeout';
        enterCompatibilityMode();
      }
    }, 300);
  }

  if (window.__SALT_FORCE_CANVAS__) {
    if (!forced && window.__SALT_GFX__ && window.__SALT_GFX__.software) reason = 'software';
    enterCompatibilityMode();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch, { once: true });
  } else {
    watch();
  }
})();
