(() => {
  'use strict';

  const STORAGE_KEY = 'saltline.manualTurn.v1';
  const config = window.__SALT_I18N__ || {};
  const messages = config.messages || {};
  const touchLike = () => !!(
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    (navigator.maxTouchPoints || 0) > 0 ||
    'ontouchstart' in window
  );

  function lookup(key) {
    return String(key || '').split('.').reduce((acc, part) => (
      acc && typeof acc === 'object' ? acc[part] : undefined
    ), messages);
  }

  function t(key, vars) {
    const value = lookup('mobileRotate.' + key);
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function loadState() {
    const state = {
      enabled: touchLike(),
      speed: 1,
      screenMode: 'auto'
    };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if (typeof saved.enabled === 'boolean') state.enabled = saved.enabled;
        if (Number.isFinite(saved.speed)) state.speed = Math.min(2.5, Math.max(0.5, saved.speed));
        if (['auto', 'landscape', 'portrait'].includes(saved.screenMode)) state.screenMode = saved.screenMode;
      }
    } catch (err) { /* localStorage can be blocked */ }
    return state;
  }

  const state = loadState();
  let pad = null;
  let quickRotate = null;
  let settingsSection = null;
  let observerScheduled = false;
  let turnTimer = 0;
  let toastTimer = 0;
  const activeDirections = new Set();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) { /* ignore */ }
  }

  function showToast(text, kind, duration) {
    const node = document.getElementById('app-toast');
    if (!node || !text) return;
    window.clearTimeout(toastTimer);
    node.textContent = text;
    node.dataset.kind = kind || 'info';
    node.hidden = false;
    toastTimer = window.setTimeout(() => {
      node.hidden = true;
    }, duration || 2600);
  }

  function canTurn() {
    const game = window.__G;
    return !!(game && game.input && game.input.look && game.game && game.game.state === 'playing');
  }

  function releasePad() {
    activeDirections.clear();
    if (pad) pad.querySelectorAll('[data-mr-dir].active').forEach((button) => button.classList.remove('active'));
    if (turnTimer) {
      window.clearInterval(turnTimer);
      turnTimer = 0;
    }
  }

  function applyTurnTick() {
    if (!activeDirections.size || !state.enabled) {
      releasePad();
      return;
    }
    const game = window.__G;
    if (canTurn() && game && game.input && game.input.look) {
      const rate = 2.2 * state.speed * 0.016;
      if (activeDirections.has('left')) game.input.look.dx -= rate;
      if (activeDirections.has('right')) game.input.look.dx += rate;
      if (activeDirections.has('up')) game.input.look.dy -= rate * 0.72;
      if (activeDirections.has('down')) game.input.look.dy += rate * 0.72;
    }
  }

  function startPadLoop() {
    if (turnTimer) return;
    applyTurnTick();
    turnTimer = window.setInterval(applyTurnTick, 16);
  }

  function buildPad() {
    const root = document.createElement('div');
    root.className = 'mr-pad';
    root.dataset.mrPad = '';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', t('padLabel'));

    const core = document.createElement('span');
    core.className = 'mr-pad-core';
    core.setAttribute('aria-hidden', 'true');
    core.textContent = t('padCore');
    root.appendChild(core);

    [
      ['up', 'mr-up', '▲', 'lookUp'],
      ['left', 'mr-left', '◀', 'turnLeft'],
      ['right', 'mr-right', '▶', 'turnRight'],
      ['down', 'mr-down', '▼', 'lookDown']
    ].forEach(([dir, className, glyph, key]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mr-pad-btn ' + className;
      button.dataset.mrDir = dir;
      button.setAttribute('aria-label', t(key));
      button.title = t(key);
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = glyph;
      button.appendChild(icon);
      root.appendChild(button);
    });

    const release = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      releasePad();
    };

    root.addEventListener('pointerdown', (event) => {
      const button = event.target && event.target.closest
        ? event.target.closest('[data-mr-dir]')
        : null;
      if (!button || !state.enabled || !canTurn()) return;
      event.preventDefault();
      event.stopPropagation();
      activeDirections.add(button.dataset.mrDir);
      button.classList.add('active');
      try { button.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      startPadLoop();
    });
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    root.addEventListener('lostpointercapture', release);
    root.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('blur', releasePad);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releasePad();
    });
    return root;
  }

  function buildQuickRotate() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mr-quick-rotate';
    button.dataset.mrQuickRotate = '';
    button.setAttribute('aria-label', t('quickHint'));
    button.title = t('quickHint');
    const icon = document.createElement('span');
    icon.className = 'mr-quick-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '↻';
    const label = document.createElement('span');
    label.className = 'mr-quick-label';
    label.textContent = t('quickLandscape');
    button.append(icon, label);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      applyScreenMode(button.dataset.mrApply === 'landscape' ? 'landscape' : 'auto');
    });
    return button;
  }

  function ensureTouchControls() {
    const ui = document.getElementById('ui');
    if (!ui) return;
    if (!quickRotate) quickRotate = buildQuickRotate();
    if (quickRotate.parentNode !== ui) ui.appendChild(quickRotate);
    const touch = ui.querySelector('.touch');
    if (!touch) return;
    if (!pad) pad = buildPad();
    if (pad.parentNode !== touch) touch.appendChild(pad);
    pad.hidden = !state.enabled;
  }

  function makeRow(labelText, control, labelFor) {
    const row = document.createElement('div');
    row.className = 'row mr-row';
    const label = document.createElement('label');
    if (labelFor) {
      label.htmlFor = labelFor;
    } else {
      label.id = 'mr-label-' + Math.random().toString(36).slice(2);
      control.setAttribute('aria-labelledby', label.id);
    }
    label.textContent = labelText;
    row.append(label, control);
    return row;
  }

  function buildSettings() {
    const section = document.createElement('section');
    section.className = 'mr-settings';
    section.dataset.mrSettings = '';

    const heading = document.createElement('h3');
    heading.textContent = t('title');
    section.appendChild(heading);

    const hint = document.createElement('p');
    hint.className = 'mr-help';
    hint.textContent = t('hint');
    section.appendChild(hint);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toggle mr-toggle';
    toggle.dataset.mrToggle = '';
    toggle.setAttribute('aria-pressed', String(state.enabled));
    const toggleTrack = document.createElement('i');
    const toggleText = document.createElement('span');
    toggle.append(toggleTrack, toggleText);
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.enabled = !state.enabled;
      if (!state.enabled) releasePad();
      saveState();
      syncSettings();
      if (pad) pad.hidden = !state.enabled;
      syncQuickRotate();
      showToast(t(state.enabled ? 'statusEnabled' : 'statusDisabled'), 'info');
    });
    section.appendChild(makeRow(t('enabled'), toggle));

    const speed = document.createElement('input');
    speed.type = 'range';
    speed.id = 'mr-speed';
    speed.min = '0.5';
    speed.max = '2.5';
    speed.step = '0.1';
    speed.value = String(state.speed);
    const speedOut = document.createElement('output');
    speedOut.dataset.mrSpeedOut = '';
    const speedWrap = document.createElement('div');
    speedWrap.className = 'slider';
    speedWrap.append(speed, speedOut);
    speed.addEventListener('input', () => {
      state.speed = Math.min(2.5, Math.max(0.5, Number(speed.value) || 1));
      speedOut.textContent = t('speedValue', { n: state.speed.toFixed(1) });
      saveState();
    });
    section.appendChild(makeRow(t('speed'), speedWrap, speed.id));

    const orientation = document.createElement('div');
    orientation.className = 'seg mr-orient';
    orientation.setAttribute('role', 'group');
    [
      ['auto', 'screenAuto'],
      ['landscape', 'screenLandscape'],
      ['portrait', 'screenPortrait']
    ].forEach(([mode, key]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mrScreen = mode;
      button.setAttribute('aria-pressed', String(state.screenMode === mode));
      button.textContent = t(key);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyScreenMode(mode);
      });
      orientation.appendChild(button);
    });
    section.appendChild(makeRow(t('screen'), orientation));

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn small';
    reset.dataset.mrReset = '';
    reset.textContent = t('reset');
    reset.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const game = window.__G;
      if (game && game.player && Number.isFinite(game.player.pitch)) {
        game.player.pitch = 0;
        showToast(t('resetHint'), 'info');
      }
    });
    section.appendChild(makeRow(t('padLabel'), reset));

    const status = document.createElement('p');
    status.className = 'mr-status';
    status.dataset.mrStatus = '';
    section.appendChild(status);

    return section;
  }

  function syncSettings() {
    if (!settingsSection) return;
    const toggle = settingsSection.querySelector('[data-mr-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(state.enabled));
      const text = toggle.querySelector('span');
      if (text) text.textContent = t(state.enabled ? 'enabledOn' : 'enabledOff');
    }
    const speed = settingsSection.querySelector('#mr-speed');
    const speedOut = settingsSection.querySelector('[data-mr-speed-out]');
    if (speed) speed.value = String(state.speed);
    if (speedOut) speedOut.textContent = t('speedValue', { n: state.speed.toFixed(1) });
    settingsSection.querySelectorAll('[data-mr-screen]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mrScreen === state.screenMode));
    });
    const status = settingsSection.querySelector('[data-mr-status]');
    if (status) {
      const forced = layoutApi() ? layoutApi().getForced() : null;
      let statusText = t(state.enabled ? 'padHint' : 'statusDisabled');
      if (state.screenMode === 'landscape') {
        statusText = t(forced === 'landscape' ? 'statusForcedLandscape' : 'statusLandscape');
      } else if (state.screenMode === 'portrait') {
        statusText = t(forced === 'portrait' ? 'statusForcedPortrait' : 'statusPortrait');
      }
      status.textContent = statusText;
    }
  }

  function ensureSettings() {
    const pane = document.querySelector('#ui .panel-b[data-pane="settings"]');
    if (!pane) return;
    if (settingsSection && settingsSection.parentNode === pane) {
      syncSettings();
      return;
    }
    settingsSection = settingsSection || buildSettings();
    const firstRow = pane.querySelector('.row');
    if (firstRow && firstRow.parentNode === pane) pane.insertBefore(settingsSection, firstRow.nextSibling);
    else pane.insertBefore(settingsSection, pane.firstChild);
    syncSettings();
  }

  function layoutApi() {
    return window.SaltForcedLayout || null;
  }

  function physicalPortrait() {
    const api = layoutApi();
    if (api) {
      const size = api.physicalSize();
      return size.height >= size.width;
    }
    return !window.matchMedia || window.matchMedia('(orientation: portrait)').matches;
  }

  function syncQuickRotate() {
    if (!quickRotate) return;
    const api = layoutApi();
    const forced = api ? api.getForced() : null;
    let applyMode = null;
    let labelMode = null;
    if (forced) {
      applyMode = 'auto';
      labelMode = forced === 'landscape' ? 'portrait' : 'landscape';
    } else if (state.screenMode === 'auto' && physicalPortrait()) {
      applyMode = 'landscape';
      labelMode = 'landscape';
    }

    quickRotate.hidden = !applyMode;
    if (!applyMode) return;
    quickRotate.dataset.mrApply = applyMode;
    quickRotate.setAttribute('aria-label', t(labelMode === 'portrait' ? 'quickPortraitHint' : 'quickHint'));
    quickRotate.title = t(labelMode === 'portrait' ? 'quickPortraitHint' : 'quickHint');
    const icon = quickRotate.querySelector('.mr-quick-icon');
    const label = quickRotate.querySelector('.mr-quick-label');
    if (icon) icon.textContent = labelMode === 'portrait' ? '↺' : '↻';
    if (label) label.textContent = t(labelMode === 'portrait' ? 'quickPortraitShort' : 'quickLandscapeShort');
  }

  function applyScreenMode(mode) {
    state.screenMode = mode;
    saveState();
    if (layoutApi()) layoutApi().setMode(mode);
    syncSettings();
    syncQuickRotate();
    if (mode === 'auto') {
      try {
        if (screen.orientation && typeof screen.orientation.unlock === 'function') screen.orientation.unlock();
      } catch (err) { /* ignore */ }
      showToast(t('unlocked'), 'info');
      return;
    }
    showToast(t(mode === 'landscape' ? 'forcedLandscape' : 'forcedPortrait'), 'success');
  }

  function refresh() {
    observerScheduled = false;
    ensureSettings();
    ensureTouchControls();
    syncQuickRotate();
  }

  function scheduleRefresh() {
    if (observerScheduled) return;
    observerScheduled = true;
    requestAnimationFrame(refresh);
  }

  const ui = document.getElementById('ui');
  if (ui) {
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches('.touch, .panel-b[data-pane="settings"], .menu') ||
              node.querySelector('.touch, .panel-b[data-pane="settings"]')) {
            scheduleRefresh();
            return;
          }
        }
      }
    }).observe(ui, { childList: true, subtree: true });
  }

  window.addEventListener('resize', scheduleRefresh);
  window.addEventListener('orientationchange', scheduleRefresh);
  window.addEventListener('saltline:layoutchange', scheduleRefresh);
  if (layoutApi()) layoutApi().setMode(state.screenMode);
  refresh();
  window.setTimeout(refresh, 800);
  window.setTimeout(refresh, 2400);
})();
