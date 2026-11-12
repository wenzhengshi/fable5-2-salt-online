(function () {
  'use strict';

  const i18n = window.__SALT_I18N__ || {};
  const COPY = (i18n.messages && i18n.messages.focus) || {};
  const MP_COPY = (i18n.messages && i18n.messages.mp) || {};
  const CLIENT_KEY = 'saltline.focus.clientId';
  const UNIT_KEYS = { male: 'unitMale', female: 'unitFemale', hound: 'unitHound', drone: 'unitDrone' };

  function t(key, vars) {
    const raw = COPY[key];
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, function (match, name) {
      return vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
    });
  }

  function mpText(key) {
    return typeof MP_COPY[key] === 'string' ? MP_COPY[key] : key;
  }

  function hashText(text) {
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    const value = String(text || '');
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= code + i;
      h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
  }

  function createId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return 'c_' + window.crypto.randomUUID().replace(/-/g, '');
      }
    } catch (err) { /* ignore */ }
    return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
  }

  function loadClientId() {
    try {
      const saved = String(localStorage.getItem(CLIENT_KEY) || '').trim();
      if (/^[A-Za-z0-9_-]{6,80}$/.test(saved)) return saved;
    } catch (err) { /* storage unavailable */ }
    const created = createId().slice(0, 80);
    try { localStorage.setItem(CLIENT_KEY, created); } catch (err) { /* ignore */ }
    return created;
  }

  function browserFingerprint() {
    const nav = navigator || {};
    const scr = window.screen || {};
    const parts = [
      nav.userAgent,
      nav.language,
      Array.isArray(nav.languages) ? nav.languages.join(',') : '',
      nav.platform,
      nav.hardwareConcurrency,
      nav.deviceMemory,
      scr.width,
      scr.height,
      scr.availWidth,
      scr.availHeight,
      scr.colorDepth,
      window.devicePixelRatio,
      new Date().getTimezoneOffset(),
      Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
    ];
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 44;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '600 16px "Arial"';
        ctx.fillStyle = '#f4b35a';
        ctx.fillRect(0, 0, 160, 44);
        ctx.fillStyle = '#0b0d0f';
        ctx.fillText('Saltline focus 30m', 4, 8);
        parts.push(canvas.toDataURL());
      }
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        parts.push(gl.getParameter(gl.VENDOR));
        parts.push(gl.getParameter(gl.RENDERER));
        if (ext) {
          parts.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
          parts.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (err) { /* canvas privacy restrictions */ }
    return 'fp1-' + hashText(parts.join('|'));
  }

  const identity = {
    clientId: loadClientId(),
    fingerprint: browserFingerprint()
  };

  const state = {
    active: false,
    ending: false,
    until: 0,
    record: null,
    targetId: null,
    targetSince: 0,
    game: null,
    resumeGameplay: false,
    lastEndAt: 0,
    finishFallbackAt: 0,
    statusAt: 0
  };

  window.__SALT_FOCUS__ = {
    clientId: identity.clientId,
    fingerprint: identity.fingerprint,
    get active() { return state.active; },
    get until() { return state.until; }
  };

  function formatClock(ms) {
    const total = Math.max(0, Math.ceil(Number(ms) / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function toast(text) {
    if (!text) return;
    try {
      if (window.__mp && typeof window.__mp.toast === 'function') {
        window.__mp.toast(text);
        return;
      }
    } catch (err) { /* ignore */ }
    const node = document.getElementById('app-toast');
    if (!node) return;
    node.textContent = text;
    node.hidden = false;
    node.classList.add('on');
    window.clearTimeout(node.__focusTimer);
    node.__focusTimer = window.setTimeout(function () {
      node.classList.remove('on');
      node.hidden = true;
    }, 2600);
  }

  const root = document.createElement('div');
  root.id = 'focus-mode';
  root.hidden = true;
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = [
    '<div class="focus-grid" aria-hidden="true"></div>',
    '<div class="focus-vignette" aria-hidden="true"></div>',
    '<header class="focus-head">',
    '  <div class="focus-brand"><span>SL</span><div><b>' + t('activeKicker') + '</b><em>' + t('locked') + '</em></div></div>',
    '  <div class="focus-live"><i></i><span>' + t('spectating') + '</span></div>',
    '  <div class="focus-time"><span>' + t('remaining') + '</span><b id="focus-clock">30:00</b></div>',
    '</header>',
    '<div class="focus-stage">',
    '  <div class="focus-reticle" aria-hidden="true"><i></i><b></b></div>',
    '  <div class="focus-target-card">',
    '    <span class="focus-target-k">' + t('watching') + '</span>',
    '    <b id="focus-target-name">' + t('waiting') + '</b>',
    '    <em id="focus-target-unit"></em>',
    '  </div>',
    '  <div class="focus-waiting" id="focus-waiting" hidden><b>' + t('waiting') + '</b><span>' + t('waitingHint') + '</span></div>',
    '</div>',
    '<footer class="focus-foot">',
    '  <div class="focus-progress"><i id="focus-progress"></i></div>',
    '  <p>' + t('footer') + '</p>',
    '  <small id="focus-record"></small>',
    '</footer>'
  ].join('');
  document.getElementById('app')?.appendChild(root);

  const dialog = document.createElement('div');
  dialog.className = 'focus-dialog';
  dialog.hidden = true;
  dialog.innerHTML = [
    '<div class="focus-dialog-backdrop" data-focus-cancel></div>',
    '<section class="focus-dialog-card" role="dialog" aria-modal="true" aria-labelledby="focus-dialog-title">',
    '  <span class="focus-dialog-kicker">' + t('activeKicker') + '</span>',
    '  <h2 id="focus-dialog-title">' + t('dialogTitle') + '</h2>',
    '  <p class="focus-dialog-lead">' + t('dialogLead') + '</p>',
    '  <ul>',
    '    <li><i>01</i>' + t('dialogBullet1') + '</li>',
    '    <li><i>02</i>' + t('dialogBullet2') + '</li>',
    '    <li><i>03</i>' + t('dialogBullet3') + '</li>',
    '  </ul>',
    '  <p class="focus-dialog-privacy">' + t('privacy') + '</p>',
    '  <div class="focus-dialog-actions">',
    '    <button type="button" class="btn" data-focus-cancel>' + t('cancel') + '</button>',
    '    <button type="button" class="btn primary" data-focus-confirm><span>' + t('confirm') + '</span></button>',
    '  </div>',
    '</section>'
  ].join('');
  document.getElementById('app')?.appendChild(dialog);

  const ui = {
    clock: root.querySelector('#focus-clock'),
    progress: root.querySelector('#focus-progress'),
    targetName: root.querySelector('#focus-target-name'),
    targetUnit: root.querySelector('#focus-target-unit'),
    waiting: root.querySelector('#focus-waiting'),
    record: root.querySelector('#focus-record'),
    confirm: dialog.querySelector('[data-focus-confirm]')
  };

  function apiUrl(path) {
    const params = new URLSearchParams({
      clientId: identity.clientId,
      fingerprint: identity.fingerprint
    });
    return path + '?' + params.toString();
  }

  async function fetchStatus() {
    try {
      const res = await fetch(apiUrl('/api/focus/status'), {
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.focus ? data.focus : null;
    } catch (err) {
      return null;
    }
  }

  function applyRecord(record) {
    if (!record) return;
    state.record = record;
    state.until = Number(record.expiresAt) || state.until;
    const parts = [];
    if (record.id) parts.push(record.id);
    if (record.fingerprint) parts.push(record.fingerprint);
    if (record.ip) parts.push(record.ip);
    ui.record.textContent = parts.length ? t('record', {
      id: record.id || '—',
      fingerprint: record.fingerprint || '—',
      ip: record.ip || '—'
    }) : '';
  }

  function muteClientMic() {
    try {
      const mic = document.querySelector('#vc-mic[aria-pressed="true"]');
      if (mic) mic.click();
    } catch (err) { /* ignore */ }
    try {
      if (window.__mp && typeof window.__mp.send === 'function') {
        window.__mp.send({ type: 'voiceState', enabled: false, muted: true, speaking: false });
      }
    } catch (err) { /* ignore */ }
  }

  function detectResumeGameplay() {
    const game = state.game || window.__G;
    const value = game && game.game && game.game.state;
    state.resumeGameplay = value === 'playing' || value === 'paused' || value === 'dead' || value === 'respawning';
  }

  function activate(focus) {
    const record = focus && focus.record ? focus.record : state.record;
    const until = Number(focus && focus.until) || Number(record && record.expiresAt) || 0;
    if (!until || until <= Date.now() + 500) {
      refreshStatus();
      return;
    }
    if (!state.active) detectResumeGameplay();
    state.active = true;
    state.ending = false;
    state.finishFallbackAt = 0;
    state.until = until;
    if (record) applyRecord(record);
    document.body.classList.add('focus-mode-on');
    root.hidden = false;
    dialog.hidden = true;
    document.body.classList.remove('focus-dialog-open');
    muteClientMic();
    enforceLock();
    renderFocus();
  }

  function finishFocus(message) {
    const wasActive = state.active;
    state.active = false;
    state.ending = false;
    state.targetId = null;
    state.targetSince = 0;
    state.until = 0;
    state.finishFallbackAt = 0;
    root.hidden = true;
    document.body.classList.remove('focus-mode-on');
    try { if (window.__compat && typeof window.__compat.setSpectate === 'function') window.__compat.setSpectate(null); } catch (err) { /* ignore */ }
    const game = state.game || window.__G;
    if (game && (state.resumeGameplay || (game.game && game.game.state === 'playing'))) {
      try { if (game.player) game.player.enabled = true; } catch (err) { /* ignore */ }
      try { if (game.hud && game.hud.show) game.hud.show(true); } catch (err) { /* ignore */ }
      try {
        if (game.input && game.input.setGameplay && game.game && game.game.state === 'playing') game.input.setGameplay(true);
      } catch (err) { /* ignore */ }
    }
    if (message && message.spawn && state.resumeGameplay) {
      try {
        let deployed = false;
        if (window.__mp && typeof window.__mp.focusDeploy === 'function') {
          deployed = window.__mp.focusDeploy(message.spawn, message.protectedUntil);
        }
        if (!deployed && window.__compat && typeof window.__compat.focusDeploy === 'function') {
          window.__compat.focusDeploy(message.spawn, message.protectedUntil);
        }
      } catch (err) { /* ignore */ }
    }
    state.resumeGameplay = false;
    updateSettingsRow();
    if (wasActive) toast(t('ended'));
  }

  function requestFocusEnd() {
    const now = Date.now();
    if (now - state.lastEndAt < 3000) return;
    state.lastEndAt = now;
    try {
      if (window.__mp && typeof window.__mp.send === 'function') {
        window.__mp.send({ type: 'focusEnd' });
      }
    } catch (err) { /* ignore */ }
  }

  async function refreshStatus() {
    const focus = await fetchStatus();
    state.statusAt = Date.now();
    if (!focus) return;
    if (focus.active && focus.record) {
      activate(focus);
    } else if (state.active && (!focus.active || state.ending || Date.now() >= state.until)) {
      requestFocusEnd();
      if (!state.finishFallbackAt) state.finishFallbackAt = Date.now() + 6500;
      if (Date.now() > state.finishFallbackAt) finishFocus(null);
    }
  }

  function enforceLock() {
    if (!state.active) return;
    const game = window.__G;
    if (!game) return;
    try { if (game.input && game.input.setGameplay) game.input.setGameplay(false); } catch (err) { /* ignore */ }
    try { if (game.input && game.input.exitLock) game.input.exitLock(); } catch (err) { /* ignore */ }
    try { if (game.player) game.player.enabled = false; } catch (err) { /* ignore */ }
    try { if (game.hud && game.hud.show) game.hud.show(false); } catch (err) { /* ignore */ }
    try {
      if (game.game && game.game.menus && game.game.menus.screen !== 'none') game.game.menus.show('none');
    } catch (err) { /* ignore */ }
  }

  function targets() {
    const compat = window.__compat;
    if (compat && compat.active && Array.isArray(compat.remotes)) {
      return compat.remotes.filter(function (item) { return item && item.data && item.alive !== false; });
    }
    const mp = window.__mp;
    if (!mp || !Array.isArray(mp.avatarList)) return [];
    const self = mp.id;
    return mp.avatarList.filter(function (item) {
      return item && item.data && item.id !== self && item.data.alive !== false;
    });
  }

  function pickTarget(now) {
    const list = targets();
    if (!list.length) {
      state.targetId = null;
      return null;
    }
    let current = null;
    for (const item of list) {
      if (item.id === state.targetId) { current = item; break; }
    }
    if (current && now - state.targetSince < 9000) return current;
    const index = Math.floor(now / 9000) % list.length;
    const next = list[index] || list[0];
    if (!state.targetId || state.targetId !== next.id) {
      state.targetId = next.id;
      state.targetSince = now;
      try {
        if (window.__compat && typeof window.__compat.setSpectate === 'function') {
          window.__compat.setSpectate(next.id);
        }
      } catch (err) { /* ignore */ }
    }
    return next;
  }

  function renderTarget(target) {
    if (!target) {
      ui.targetName.textContent = t('waiting');
      ui.targetUnit.textContent = '';
      ui.waiting.hidden = false;
      return;
    }
    ui.waiting.hidden = true;
    ui.targetName.textContent = (target.data && target.data.name) || t('watching');
    const kind = (target.data && target.data.soldier) || 'male';
    ui.targetUnit.textContent = mpText(UNIT_KEYS[kind] || 'unitMale');
  }

  function spectatorCamera(now) {
    if (!state.active) return;
    const game = window.__G;
    const camera = game && game.camera;
    if (!camera || !camera.position || typeof camera.lookAt !== 'function') return;
    const target = pickTarget(now);
    renderTarget(target);

    const dt = Math.min(0.08, Math.max(0.008, (now - (spectatorCamera.last || now - 16)) / 1000));
    spectatorCamera.last = now;
    const amount = Math.min(0.18, Math.max(0.035, dt * 3.2));
    let anchorX = 0;
    let anchorY = 0;
    let anchorZ = 4;
    let kind = 'male';
    if (target) {
      anchorX = Number(target.x) || 0;
      anchorY = Number(target.y) || 0;
      anchorZ = Number(target.z) || 0;
      kind = (target.data && target.data.soldier) || 'male';
    }
    const angle = now * 0.00011 + (target ? 0.8 : 0);
    const radius = target ? (kind === 'hound' ? 7 : 9) : 16;
    const desiredX = anchorX + Math.cos(angle) * radius;
    const desiredY = anchorY + (kind === 'drone' ? 4.4 : kind === 'hound' ? 2.2 : 3.3);
    const desiredZ = anchorZ + Math.sin(angle) * radius;
    camera.position.x += (desiredX - camera.position.x) * amount;
    camera.position.y += (desiredY - camera.position.y) * amount;
    camera.position.z += (desiredZ - camera.position.z) * amount;
    camera.lookAt(anchorX, anchorY + (kind === 'hound' ? 0.5 : kind === 'drone' ? 1.2 : 1.25), anchorZ);
  }

  function attachGame() {
    const game = window.__G;
    if (!game || !game.game || typeof game.game.update !== 'function') return;
    state.game = game;
    if (game.game.update.__saltFocusCamera) return;
    const original = game.game.update;
    const wrapped = function wrappedFocusUpdate(dt) {
      const result = original.call(this, dt);
      try { spectatorCamera(performance.now()); } catch (err) { /* ignore */ }
      return result;
    };
    wrapped.__saltFocusCamera = true;
    game.game.update = wrapped;
  }

  function renderFocus() {
    if (!state.active) return;
    const left = Math.max(0, state.until - Date.now());
    ui.clock.textContent = formatClock(left);
    ui.progress.style.transform = 'scaleX(' + Math.max(0, Math.min(1, left / (30 * 60 * 1000))).toFixed(4) + ')';
    renderTarget(pickTarget(Date.now()));
    updateSettingsRow();
  }

  function tick() {
    attachGame();
    if (!state.active) return;
    enforceLock();
    renderFocus();
    if (Date.now() >= state.until) {
      if (!state.ending) {
        state.ending = true;
        state.finishFallbackAt = Date.now() + 6500;
        ui.clock.textContent = '00:00';
        requestFocusEnd();
      } else {
        requestFocusEnd();
      }
      if (Date.now() - state.statusAt > 2200) refreshStatus();
      if (state.finishFallbackAt && Date.now() > state.finishFallbackAt) finishFocus(null);
    }
  }

  function openDialog() {
    if (state.active) {
      toast(t('blocked'));
      return;
    }
    dialog.hidden = false;
    document.body.classList.add('focus-dialog-open');
    window.setTimeout(function () {
      try { ui.confirm.focus({ preventScroll: true }); } catch (err) { ui.confirm.focus(); }
    }, 20);
  }

  function closeDialog() {
    dialog.hidden = true;
    document.body.classList.remove('focus-dialog-open');
  }

  async function startFocus() {
    if (state.active || ui.confirm.disabled) return;
    ui.confirm.disabled = true;
    ui.confirm.setAttribute('aria-busy', 'true');
    const label = ui.confirm.querySelector('span');
    const previous = label.textContent;
    label.textContent = t('starting');
    let failureText = '';
    try {
      const res = await fetch('/api/focus/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ clientId: identity.clientId, fingerprint: identity.fingerprint })
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.ok || !data.focus) {
        failureText = typeof data.message === 'string' ? data.message : '';
        throw new Error('focus start failed');
      }
      activate(data.focus);
      closeDialog();
      toast(data.persisted === false ? t('startedUnpersisted') : t('started'));
    } catch (err) {
      toast(failureText || t('startFailed'));
    } finally {
      ui.confirm.disabled = false;
      ui.confirm.removeAttribute('aria-busy');
      label.textContent = previous;
    }
  }

  let settingRow = null;
  let settingButton = null;
  let settingState = null;
  let settingMeta = null;
  let compatButton = null;

  function createSettingsRow() {
    const row = document.createElement('div');
    row.className = 'row focus-setting-row';
    row.dataset.focusSettingRow = '1';
    row.innerHTML = [
      '<label>' + t('settingLabel') + '</label>',
      '<button class="focus-setting-button" type="button" data-focus-setting aria-pressed="false">',
      '  <b data-focus-setting-state>' + t('settingOff') + '</b>',
      '  <i data-focus-setting-meta>' + t('settingMetaOff') + '</i>',
      '</button>'
    ].join('');
    return row;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function updateSettingsRow() {
    const left = Math.max(0, state.until - Date.now());
    if (settingRow) {
      settingButton.setAttribute('aria-pressed', state.active ? 'true' : 'false');
      settingButton.classList.toggle('is-active', state.active);
      setText(settingState, state.active ? t('settingActive') : t('settingOff'));
      setText(settingMeta, state.active ? t('settingMetaActive', { time: formatClock(left) }) : t('settingMetaOff'));
    }
    if (compatButton) {
      compatButton.setAttribute('aria-pressed', state.active ? 'true' : 'false');
      compatButton.classList.toggle('is-active', state.active);
      setText(compatButton, state.active
        ? t('settingActive') + ' · ' + formatClock(left)
        : t('settingLabel') + ' · ' + t('settingOff'));
    }
  }

  function installSettingsRow() {
    const pane = document.querySelector('.panel [data-pane="settings"]');
    if (!pane) return false;
    const existing = pane.querySelector('[data-focus-setting-row]');
    if (existing) {
      settingRow = existing;
      settingButton = existing.querySelector('[data-focus-setting]');
      settingState = existing.querySelector('[data-focus-setting-state]');
      settingMeta = existing.querySelector('[data-focus-setting-meta]');
      updateSettingsRow();
      return true;
    }
    settingRow = createSettingsRow();
    settingButton = settingRow.querySelector('[data-focus-setting]');
    settingState = settingRow.querySelector('[data-focus-setting-state]');
    settingMeta = settingRow.querySelector('[data-focus-setting-meta]');
    settingButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      openDialog();
    });
    const note = pane.querySelector('.panel-note');
    pane.insertBefore(settingRow, note || null);
    updateSettingsRow();
    return true;
  }

  function installCompatEntry() {
    const row = document.querySelector('#compat-ui .compat-note-row');
    if (!row) return false;
    if (compatButton && row.contains(compatButton)) {
      updateSettingsRow();
      return true;
    }
    compatButton = document.createElement('button');
    compatButton.type = 'button';
    compatButton.className = 'compat-focus-btn';
    compatButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      openDialog();
    });
    row.insertBefore(compatButton, row.firstChild);
    updateSettingsRow();
    return true;
  }

  dialog.addEventListener('click', function (event) {
    if (event.target && event.target.closest('[data-focus-cancel]')) {
      event.preventDefault();
      closeDialog();
    } else if (event.target && event.target.closest('[data-focus-confirm]')) {
      event.preventDefault();
      startFocus();
    }
  });

  window.addEventListener('keydown', function (event) {
    if (!dialog.hidden) {
      if (event.key === 'Escape') closeDialog();
      return;
    }
    if (!state.active) return;
    if (event.key === 'F5' || event.key === 'F11' || event.key === 'F12') return;
    if ((event.ctrlKey || event.metaKey) && !['KeyR', 'KeyW', 'KeyL', 'KeyT', 'KeyN'].includes(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  ['pointerdown', 'mousedown', 'touchstart', 'wheel'].forEach(function (type) {
    window.addEventListener(type, function (event) {
      if (!state.active) return;
      if (root.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true, passive: false });
  });

  document.addEventListener('pointerlockchange', function () {
    if (state.active && document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (err) { /* ignore */ }
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && state.active) enforceLock();
  });

  const observer = new MutationObserver(function () {
    installSettingsRow();
    installCompatEntry();
  });
  observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  installSettingsRow();
  installCompatEntry();

  let mpAttached = false;
  function attachMp() {
    if (mpAttached || !window.__mp || typeof window.__mp.onMessage !== 'function') return;
    mpAttached = true;
    window.__mp.onMessage(function (msg) {
      if (!msg || msg.type !== 'focusState') return;
      if (msg.active) {
        activate({
          active: true,
          until: Number(msg.until) || state.until,
          record: state.record
        });
        if (!state.record) refreshStatus();
      } else if (state.active) {
        if (msg.ended && msg.spawn) {
          finishFocus(msg);
        } else if (msg.expired) {
          state.ending = true;
          state.finishFallbackAt = Date.now() + 6500;
          requestFocusEnd();
        }
      }
      if (msg.denied) toast(t('blocked'));
      if ((msg.ended || msg.expired) && !state.record) refreshStatus();
    });
  }

  window.setInterval(function () {
    attachMp();
    attachGame();
  }, 400);
  window.setInterval(tick, 1000);
  window.setTimeout(tick, 120);

  refreshStatus();
})();
