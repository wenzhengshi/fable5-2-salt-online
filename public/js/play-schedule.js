(() => {
  'use strict';

  if (window.SaltPlayGate) return;

  const config = window.__SALT_I18N__ || {};
  const messages = config.messages || {};
  const gate = document.getElementById('play-gate');
  const messageNode = document.getElementById('play-gate-message');
  const statusNode = document.getElementById('play-gate-status');
  const card = gate && gate.querySelector('.play-gate__card');
  const langSwitch = gate && gate.querySelector('.play-gate__lang');
  const closeButtons = gate ? Array.from(gate.querySelectorAll('[data-play-close]')) : [];
  const units = {
    days: document.getElementById('play-gate-days'),
    hours: document.getElementById('play-gate-hours'),
    minutes: document.getElementById('play-gate-minutes'),
    seconds: document.getElementById('play-gate-seconds')
  };
  const openWaiters = [];
  const playableWaiters = [];
  let current = null;
  let blocked = false;
  let dismissed = false;
  let deadline = 0;
  let pausedByGate = false;
  let pollTimer = 0;
  let tickTimer = 0;
  let toastTimer = 0;
  let lastRefresh = 0;
  let refreshing = false;

  function lookup(key) {
    return String(key || '').split('.').reduce((acc, part) => (
      acc && typeof acc === 'object' ? acc[part] : undefined
    ), messages);
  }

  function t(key, vars) {
    const value = lookup(key);
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function durationParts(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor(total % 86400 / 3600),
      minutes: Math.floor(total % 3600 / 60),
      seconds: total % 60
    };
  }

  function writeCountdown(parts) {
    if (units.days) units.days.textContent = String(parts.days);
    if (units.hours) units.hours.textContent = pad(parts.hours);
    if (units.minutes) units.minutes.textContent = pad(parts.minutes);
    if (units.seconds) units.seconds.textContent = pad(parts.seconds);
    if (messageNode) {
      messageNode.textContent = t('playSchedule.message', {
        days: parts.days,
        hours: parts.hours,
        minutes: parts.minutes,
        seconds: parts.seconds
      });
    }
  }

  function showToast(text) {
    const node = document.getElementById('app-toast');
    if (!node || !text) return;
    window.clearTimeout(toastTimer);
    node.textContent = text;
    node.dataset.kind = 'info';
    node.hidden = false;
    toastTimer = window.setTimeout(() => {
      node.hidden = true;
    }, 3200);
  }

  function exitPointerLock() {
    if (!document.pointerLockElement || typeof document.exitPointerLock !== 'function') return;
    try { document.exitPointerLock(); } catch (error) { /* pointer lock can already be releasing */ }
  }

  function pauseGame() {
    const game = window.__G && window.__G.game;
    if (!game || game.state !== 'playing' || typeof game.pause !== 'function') return;
    pausedByGate = true;
    try { game.pause(); } catch (error) { console.error('[play-schedule] pause failed', error); }
    exitPointerLock();
  }

  function resumeGame() {
    if (!pausedByGate) return;
    pausedByGate = false;
    const game = window.__G && window.__G.game;
    if (!game || game.state !== 'paused' || typeof game.resume !== 'function') return;
    try { game.resume(); } catch (error) { console.error('[play-schedule] resume failed', error); }
  }

  function refreshLayout() {
    const layout = window.SaltForcedLayout;
    if (!layout || typeof layout.refresh !== 'function') return;
    try { layout.refresh(); } catch (error) { console.error('[play-schedule] layout refresh failed', error); }
  }

  function focusCard() {
    window.setTimeout(() => {
      if (!card || typeof card.focus !== 'function' || gate.hidden) return;
      try { card.focus({ preventScroll: true }); } catch (error) { card.focus(); }
    }, 30);
  }

  function hideGate() {
    const app = document.getElementById('app');
    const wasOpen = !gate.hidden ||
      document.documentElement.classList.contains('play-gate-open') ||
      document.body.classList.contains('play-gate-open');
    gate.hidden = true;
    gate.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('play-gate-open');
    document.body.classList.remove('play-gate-open');
    if (app) app.inert = false;
    if (wasOpen) refreshLayout();
  }

  function render() {
    if (!gate) return;
    if (!blocked || dismissed) {
      hideGate();
      return;
    }
    const remaining = Math.max(0, deadline - Date.now());
    writeCountdown(durationParts(remaining));
    if (statusNode) statusNode.textContent = t(pausedByGate ? 'playSchedule.paused' : 'playSchedule.waiting');
    if (gate.hidden) {
      gate.hidden = false;
      gate.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('play-gate-open');
      document.body.classList.add('play-gate-open');
      const app = document.getElementById('app');
      if (app) app.inert = true;
      refreshLayout();
      focusCard();
    }
  }

  function callSoon(callback) {
    window.setTimeout(() => {
      try { callback(); } catch (error) { console.error('[play-schedule] waiter failed', error); }
    }, 0);
  }

  function flushWaiters(list) {
    const waiters = list.splice(0, list.length);
    for (const waiter of waiters) callSoon(waiter);
  }

  function flushOpenWaiters() {
    flushWaiters(openWaiters);
  }

  function flushPlayableWaiters() {
    flushWaiters(playableWaiters);
  }

  function lock(next) {
    const wasBlocked = blocked;
    current = next || current;
    blocked = true;
    const remaining = Number(current && current.remainingMs);
    deadline = Date.now() + (Number.isFinite(remaining) && remaining > 0 ? remaining : 1000);
    render();
    if (!wasBlocked) pauseGame();
  }

  function unlock(next) {
    current = next || current;
    blocked = false;
    dismissed = false;
    deadline = 0;
    render();
    resumeGame();
    flushOpenWaiters();
    flushPlayableWaiters();
  }

  function applyStatus(next) {
    if (!next || typeof next !== 'object') return;
    if (next.blocked) lock(next);
    else unlock(next);
  }

  function openGate() {
    if (!blocked) return false;
    const wasHidden = dismissed || gate.hidden;
    dismissed = false;
    render();
    if (wasHidden) {
      pauseGame();
      showToast(t('playSchedule.reopened'));
    }
    return true;
  }

  function dismissGate() {
    if (!blocked || dismissed) return false;
    dismissed = true;
    render();
    flushOpenWaiters();
    showToast(t('playSchedule.dismissed'));
    window.setTimeout(() => {
      const deploy = document.querySelector('.menu[data-screen="title"] [data-act="deploy"]');
      if (!deploy || typeof deploy.focus !== 'function') return;
      try { deploy.focus({ preventScroll: true }); } catch (error) { deploy.focus(); }
    }, 60);
    return true;
  }

  async function refresh(force) {
    if (refreshing) return;
    if (!force && Date.now() - lastRefresh < 4000) return;
    refreshing = true;
    lastRefresh = Date.now();
    try {
      const response = await fetch('/api/game/play-schedule?_=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.ok) applyStatus(data);
    } catch (error) {
      /* Keep the server-rendered status until the next poll succeeds. */
    } finally {
      refreshing = false;
    }
  }

  function tick() {
    if (!blocked) return;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      deadline = Date.now() + 3000;
      writeCountdown(durationParts(0));
      void refresh(true);
      return;
    }
    writeCountdown(durationParts(remaining));
  }

  function startTimers() {
    window.clearInterval(tickTimer);
    window.clearInterval(pollTimer);
    tickTimer = window.setInterval(tick, 250);
    pollTimer = window.setInterval(() => { void refresh(false); }, 5000);
  }

  if (langSwitch) {
    langSwitch.addEventListener('click', async (event) => {
      const button = event.target && event.target.closest ? event.target.closest('[data-play-lang]') : null;
      if (!button || button.getAttribute('aria-pressed') === 'true') return;
      const lang = button.dataset.playLang === 'en-US' ? 'en-US' : 'zh-CN';
      button.disabled = true;
      try {
        const response = await fetch('/api/lang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        window.location.reload();
      } catch (error) {
        button.disabled = false;
      }
    });
  }

  for (const button of closeButtons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      dismissGate();
    });
  }

  if (gate) {
    gate.addEventListener('click', (event) => {
      if (event.target === gate) dismissGate();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !blocked || dismissed) return;
    event.preventDefault();
    event.stopPropagation();
    dismissGate();
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest ? event.target.closest('[data-act="deploy"]') : null;
    if (!button || !blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openGate();
    void refresh(true);
  }, true);

  window.SaltPlayGate = {
    get blocked() { return blocked; },
    get dismissed() { return dismissed; },
    get visible() { return blocked && !dismissed; },
    get status() { return current; },
    whenOpen(callback) {
      if (typeof callback !== 'function') return;
      if (!blocked || dismissed) callSoon(callback);
      else openWaiters.push(callback);
    },
    whenPlayable(callback) {
      if (typeof callback !== 'function') return;
      if (!blocked) callSoon(callback);
      else playableWaiters.push(callback);
    },
    applyStatus,
    open: openGate,
    close: dismissGate,
    refresh: () => refresh(true)
  };

  const initial = window.__SALT_SCHEDULE__;
  if (initial && initial.blocked) lock(initial);
  else if (initial) current = initial;
  startTimers();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh(true);
  });

  window.addEventListener('focus', () => {
    if (blocked) void refresh(true);
  });
})();
