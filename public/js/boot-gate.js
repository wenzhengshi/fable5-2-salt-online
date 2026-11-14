(() => {
  'use strict';

  const self = document.currentScript;
  const version = self && self.dataset ? self.dataset.version || '' : '';
  const i18n = window.__SALT_I18N__ || {};
  const messages = i18n.messages || {};
  const RECOVERY_KEY = 'saltline.webgl.recovery.v1';
  const CORE_SCRIPTS = [
    'audio-tap.js',
    'game.bundle.js',
    'ammo.js',
    'sail.js',
    'focus-mode.js',
    'death-replay-3d.js',
    'multiplayer.js',
    'kill-streak.js',
    'community.js',
    'replay.js',
    'comms.js',
    'controls.js'
  ];
  const MODULE_SCRIPTS = [
    'hunter-avatar.js',
    'unit-models.js',
    'classic-avatar.js',
    'soldier-select.js'
  ];

  const boot = document.getElementById('boot');
  const bootMsg = document.getElementById('boot-msg');
  const bootFill = document.getElementById('boot-fill');
  const view = document.getElementById('view');
  let panel = null;
  let started = false;
  let watchTimer = 0;
  let memoryRecovery = 0;

  const bootState = {
    version,
    phase: 'idle',
    attempt: 0,
    contextHeld: false,
    autoRecoveries: 0,
    startedAt: Date.now()
  };
  window.__SALT_BOOT__ = bootState;

  function lookup(key) {
    return String(key || '').split('.').reduce((acc, part) => (
      acc && typeof acc === 'object' ? acc[part] : undefined
    ), messages);
  }

  function t(key, vars) {
    const raw = lookup(key);
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function setProgress(value) {
    if (!bootFill) return;
    const pct = Math.max(0, Math.min(100, Math.round(Number(value || 0) * 100)));
    bootFill.style.width = pct + '%';
  }

  function setBootMessage(text, progress) {
    if (bootMsg && typeof text === 'string' && text) bootMsg.textContent = text;
    if (typeof progress === 'number') setProgress(progress);
  }

  function ensureBootVisible() {
    if (!boot) return;
    boot.hidden = false;
    boot.classList.remove('done');
  }

  function ensurePanel() {
    if (panel || !boot) return panel;
    panel = document.createElement('section');
    panel.className = 'boot-gate';
    panel.hidden = true;
    panel.setAttribute('role', 'alert');
    panel.innerHTML = '<b class="boot-gate-title"></b><p class="boot-gate-copy"></p><button class="boot-gate-retry" type="button"></button>';
    panel.querySelector('.boot-gate-retry').addEventListener('click', () => {
      try { sessionStorage.removeItem(RECOVERY_KEY); } catch (err) { /* ignore */ }
      window.location.reload();
    });
    boot.appendChild(panel);
    return panel;
  }

  function showPanel(title, copy) {
    ensureBootVisible();
    const node = ensurePanel();
    if (!node) return;
    node.querySelector('.boot-gate-title').textContent = title;
    node.querySelector('.boot-gate-copy').textContent = copy;
    const button = node.querySelector('.boot-gate-retry');
    button.textContent = t('ui.gfxRetryAction');
    node.hidden = false;
    panel = node;
  }

  function hidePanel() {
    if (panel) panel.hidden = true;
  }

  function recoveryState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || '{}') || {};
      return {
        count: Number(parsed.count) || 0,
        last: Number(parsed.last) || 0
      };
    } catch (err) {
      return { count: memoryRecovery, last: 0 };
    }
  }

  function writeRecovery(count) {
    memoryRecovery = count;
    try {
      sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ count, last: Date.now() }));
    } catch (err) { /* sessionStorage can be blocked */ }
  }

  function clearRecovery() {
    memoryRecovery = 0;
    try { sessionStorage.removeItem(RECOVERY_KEY); } catch (err) { /* ignore */ }
  }

  function autoRecover(reason, detail, maxAutoReloads) {
    const state = recoveryState();
    const limit = typeof maxAutoReloads === 'number' ? maxAutoReloads : 2;
    bootState.phase = 'recovering';
    bootState.autoRecoveries = state.count + 1;
    if (state.count >= limit) {
      bootState.phase = 'failed';
      setProgress(1);
      showPanel(t('ui.gfxUnavailable'), detail || t('ui.gfxUnavailableHint'));
      return;
    }
    writeRecovery(state.count + 1);
    ensureBootVisible();
    setBootMessage(t('ui.gfxRecovering'), 0.08);
    console.warn('[boot] recovering WebGL renderer', reason || 'unknown');
    window.setTimeout(() => window.location.reload(), 900);
  }

  function loadScript(file, type) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const suffix = version ? '?v=' + encodeURIComponent(version) : '';
      script.src = '/js/' + file + suffix;
      script.async = false;
      if (type === 'module') script.type = 'module';
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(file));
      document.body.appendChild(script);
    });
  }

  async function loadSequence(files, type) {
    for (let i = 0; i < files.length; i += 1) {
      await loadScript(files[i], type);
    }
  }

  function fallbackProbe(canvas) {
    const attrs = {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    };
    try { return canvas.getContext('webgl2', attrs); } catch (err) { return null; }
  }

  async function preflight() {
    setBootMessage(t('ui.gfxChecking'), 0.02);
    if (!view) return null;
    const guard = window.__SALT_WEBGL__;
    if (!guard || typeof guard.ensure !== 'function') return fallbackProbe(view);
    return guard.ensure(view, {
      onAttempt(attempt, max, delay) {
        bootState.attempt = attempt;
        if (attempt <= 1) {
          setBootMessage(t('ui.gfxChecking'), 0.02);
        } else {
          setBootMessage(t('ui.gfxRetry', { n: attempt, max: max, delay: Math.round((delay || 0) / 100) / 10 }), 0.02 + Math.min(0.04, attempt / max * 0.04));
        }
      }
    });
  }

  function watchGameBoot() {
    const began = performance.now();
    const tick = () => {
      if (window.__ready) {
        bootState.phase = 'ready';
        bootState.contextHeld = !!(window.__SALT_GFX__ && window.__SALT_GFX__.held);
        clearRecovery();
        hidePanel();
        return;
      }
      if (window.__fatal) {
        const fatal = String(window.__fatal);
        bootState.phase = 'fatal';
        bootState.fatal = fatal.slice(0, 500);
        if (/webgl|context creation|context lost/i.test(fatal)) {
          autoRecover(fatal, t('ui.gfxUnavailableHint'));
        } else {
          setProgress(1);
          showPanel(t('ui.bootFailed'), fatal.slice(0, 280));
        }
        return;
      }
      if (performance.now() - began > 45000) {
        bootState.phase = 'timeout';
        showPanel(t('ui.bootFailed'), t('ui.bootTimeoutHint'));
        return;
      }
      watchTimer = window.setTimeout(tick, 240);
    };
    tick();
  }

  async function start() {
    if (started) return;
    started = true;
    hidePanel();
    const context = await preflight();
    if (!context) {
      autoRecover('preflight-failed', t('ui.gfxUnavailableHint'), 1);
      return;
    }
    bootState.contextHeld = true;
    bootState.phase = 'loading-scripts';
    setBootMessage(t('ui.gfxReady'), 0.06);
    try {
      await loadSequence(CORE_SCRIPTS, 'classic');
      watchGameBoot();
      await loadSequence(MODULE_SCRIPTS, 'module');
    } catch (err) {
      bootState.phase = 'script-failed';
      bootState.failedScript = err && err.message ? err.message : String(err);
      setProgress(1);
      showPanel(t('ui.bootLoadFailed'), t('ui.bootLoadFailedHint'));
      return;
    }
  }

  window.addEventListener('error', (event) => {
    if (bootState.phase !== 'loading-scripts') return;
    const message = String(event && event.message || '');
    if (/webgl|context creation/i.test(message)) autoRecover(message, t('ui.gfxUnavailableHint'));
  });

  window.addEventListener('pagehide', () => {
    if (watchTimer) window.clearTimeout(watchTimer);
  });

  start().catch((err) => {
    bootState.phase = 'gate-failed';
    bootState.error = err && err.message ? err.message : String(err);
    setProgress(1);
    showPanel(t('ui.bootFailed'), t('ui.bootTimeoutHint'));
  });
})();
