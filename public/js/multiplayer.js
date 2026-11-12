(() => {
  'use strict';

  const i18n = window.__SALT_I18N__ || {};
  const messages = i18n.messages || {};
  const MP = messages.mp || {};
  const uiRoot = document.getElementById('ui');
  if (!uiRoot) return;

  const STORAGE_NAME = 'saltline.multiplayer.name';
  const STORAGE_SOLDIER = 'saltline.multiplayer.soldier';
  const CALLSIGNS = ['RAVEN', 'VIPER', 'KESTREL', 'TALON', 'DRIFT', 'CINDER', 'ASH', 'MOSS'];
  const REPO_URL = 'https://github.com/wenzhengshi/fable5-2-salt-online';
  const REPO_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';

  function t(key, vars) {
    const raw = MP[key];
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function createRepoLink(variant) {
    const link = document.createElement('a');
    link.className = 'salt-repo' + (variant ? ' salt-repo-' + variant : '');
    link.href = REPO_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = t('repoHint');
    link.setAttribute('aria-label', t('repo') + ' — ' + t('repoHint') + ': ' + REPO_URL);

    const glyph = document.createElement('span');
    glyph.className = 'salt-repo-glyph';
    glyph.innerHTML = REPO_ICON;

    const copy = document.createElement('span');
    copy.className = 'salt-repo-copy';
    const label = document.createElement('b');
    label.textContent = t('repo');
    const url = document.createElement('em');
    url.textContent = REPO_URL;
    url.dir = 'ltr';
    copy.append(label, url);

    const arrow = document.createElement('span');
    arrow.className = 'salt-repo-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';

    link.append(glyph, copy, arrow);
    return link;
  }

  function decorateRepoLinks() {
    const titleMain = document.querySelector('.m-screen[data-s="title"] .m-title-main');
    if (titleMain && !titleMain.querySelector('[data-mp-repo="title"]')) {
      const mount = document.createElement('div');
      mount.className = 'mp-title-repo';
      mount.setAttribute('data-mp-repo', 'title');
      mount.appendChild(createRepoLink('title'));
      titleMain.appendChild(mount);
    }

    const paused = document.querySelector('.m-screen[data-s="paused"]');
    if (paused && !paused.querySelector('[data-mp-repo="paused"]')) {
      const mount = document.createElement('div');
      mount.className = 'mp-paused-repo';
      mount.setAttribute('data-mp-repo', 'paused');
      mount.appendChild(createRepoLink('paused'));
      paused.appendChild(mount);
    }
  }

  function randomName() {
    return CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)] + '-' + Math.floor(10 + Math.random() * 90);
  }

  function cleanName(value) {
    return String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 16);
  }

  function loadName() {
    try {
      const stored = cleanName(localStorage.getItem(STORAGE_NAME));
      if (stored) return stored;
    } catch (err) { /* storage unavailable */ }
    return randomName();
  }

  function saveName(value) {
    try { localStorage.setItem(STORAGE_NAME, value); } catch (err) { /* ignore */ }
  }

  function normalizeSoldier(value) {
    return value === 'female' ? 'female' : 'male';
  }

  function loadSoldier() {
    try { return normalizeSoldier(localStorage.getItem(STORAGE_SOLDIER)); } catch (err) { return 'male'; }
  }

  function saveSoldier(value) {
    try { localStorage.setItem(STORAGE_SOLDIER, normalizeSoldier(value)); } catch (err) { /* ignore */ }
  }

  let myName = loadName();
  let mySoldier = loadSoldier();
  let G = null;
  let THREE = null;
  let scene = null;
  let ws = null;
  let myId = null;
  let myColor = '#ffb347';
  let connected = false;
  let onlineCount = 0;
  let rosterData = [];
  let selfStats = { kills: 0, deaths: 0, streak: 0, bestStreak: 0, alive: true };
  let pingMs = null;
  let reconnectDelay = 1200;
  let reconnectTimer = 0;
  let pingTimer = 0;
  let stateTimer = 0;
  let lastStateAt = 0;
  let everJoined = false;
  let pendingRename = null;

  const respawn = {
    active: false,
    until: 0,
    by: null,
    requestedAt: 0,
    fallbackAt: 0,
    lastRequestAt: 0
  };
  let serverDeathNotified = false;
  let pendingServerDeath = null;
  let pendingDeathBy = null;

  const avatars = new Map();
  const messageListeners = new Set();
  const binaryListeners = new Set();
  let lastFrame = 0;

  /* ------------------------------------------------------------------- UI */

  const ui = document.createElement('div');
  ui.id = 'mp-ui';
  ui.innerHTML = `
    <div class="mp-chip" id="mp-chip">
      <span class="mp-dot" id="mp-dot"></span>
      <span class="mp-online"><b id="mp-online">0</b><em data-mp-label="online"></em></span>
      <span class="mp-kd">
        <i>K</i><b id="mp-kills">0</b>
        <i>D</i><b id="mp-deaths">0</b>
      </span>
      <span class="mp-ping" id="mp-ping">—</span>
      <button class="mp-roster-btn" id="mp-roster-btn" type="button"></button>
    </div>
    <div class="mp-feed" id="mp-feed" aria-live="polite"></div>
    <div class="mp-respawn" id="mp-respawn" hidden>
      <div class="mp-respawn-card" role="status" aria-live="assertive">
        <div class="mp-respawn-k"></div>
        <div class="mp-respawn-num" id="mp-count">5</div>
        <div class="mp-respawn-line" id="mp-killer"></div>
        <div class="mp-respawn-bar"><i id="mp-bar"></i></div>
        <button class="mp-respawn-btn" id="mp-respawn-btn" type="button" disabled></button>
      </div>
    </div>
    <div class="mp-roster" id="mp-roster" hidden>
      <div class="mp-roster-card" role="dialog" aria-modal="false">
        <div class="mp-roster-head">
          <b data-mp-label="roster"></b>
          <span id="mp-roster-online"></span>
          <button class="mp-roster-close" id="mp-roster-close" type="button" aria-label="Close">×</button>
        </div>
        <ol class="mp-roster-list" id="mp-roster-list"></ol>
        <p class="mp-roster-empty" id="mp-roster-empty" hidden></p>
        <div class="mp-roster-name">
          <label for="mp-name-input" data-mp-label="callsign"></label>
          <div>
            <input id="mp-name-input" maxlength="16" autocomplete="off" spellcheck="false" />
            <button id="mp-name-save" type="button"></button>
          </div>
          <p class="mp-name-note" data-mp-label="nameNote"></p>
        </div>
        <div class="mp-roster-board">
          <b data-mp-label="board"></b>
          <ol id="mp-board-list"></ol>
        </div>
        <div class="mp-roster-repo" id="mp-roster-repo"></div>
        <p class="mp-roster-hint" data-mp-label="rosterHint"></p>
      </div>
    </div>
    <div class="mp-toast" id="mp-toast" hidden></div>
  `;
  uiRoot.appendChild(ui);

  const el = {
    chip: ui.querySelector('#mp-chip'),
    dot: ui.querySelector('#mp-dot'),
    online: ui.querySelector('#mp-online'),
    kills: ui.querySelector('#mp-kills'),
    deaths: ui.querySelector('#mp-deaths'),
    ping: ui.querySelector('#mp-ping'),
    rosterBtn: ui.querySelector('#mp-roster-btn'),
    feed: ui.querySelector('#mp-feed'),
    respawn: ui.querySelector('#mp-respawn'),
    count: ui.querySelector('#mp-count'),
    killer: ui.querySelector('#mp-killer'),
    bar: ui.querySelector('#mp-bar'),
    respawnBtn: ui.querySelector('#mp-respawn-btn'),
    roster: ui.querySelector('#mp-roster'),
    rosterOnline: ui.querySelector('#mp-roster-online'),
    rosterList: ui.querySelector('#mp-roster-list'),
    rosterEmpty: ui.querySelector('#mp-roster-empty'),
    nameInput: ui.querySelector('#mp-name-input'),
    nameSave: ui.querySelector('#mp-name-save'),
    boardList: ui.querySelector('#mp-board-list'),
    rosterRepo: ui.querySelector('#mp-roster-repo'),
    toast: ui.querySelector('#mp-toast'),
    rosterClose: ui.querySelector('#mp-roster-close')
  };

  const labelText = {
    online: t('online'),
    roster: t('roster'),
    callsign: t('callsign'),
    nameNote: t('nameNote'),
    board: t('board'),
    rosterHint: t('rosterHint')
  };
  ui.querySelectorAll('[data-mp-label]').forEach((node) => {
    node.textContent = labelText[node.getAttribute('data-mp-label')] || '';
  });
  ui.querySelector('.mp-respawn-k').textContent = t('down');
  el.respawnBtn.textContent = t('respawnNow');
  el.rosterBtn.textContent = t('roster');
  el.rosterBtn.setAttribute('aria-label', t('roster'));
  el.rosterClose.setAttribute('aria-label', t('close'));
  el.nameInput.value = myName;
  el.nameSave.textContent = t('save');
  el.rosterRepo.appendChild(createRepoLink('compact'));

  let toastTimer = 0;
  let lastBlockedToast = 0;
  function toast(text) {
    if (!text) return;
    el.toast.textContent = text;
    el.toast.hidden = false;
    el.toast.classList.add('on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      el.toast.classList.remove('on');
      el.toast.hidden = true;
    }, 2400);
  }

  function setConnection(state) {
    el.chip.dataset.state = state;
    if (state === 'online') {
      el.dot.title = t('connected');
    } else if (state === 'connecting') {
      el.dot.title = t('connecting');
    } else {
      el.dot.title = t('disconnected');
    }
  }

  setConnection('connecting');

  function updateChip() {
    el.online.textContent = String(onlineCount);
    el.kills.textContent = String(selfStats.kills || 0);
    el.deaths.textContent = String(selfStats.deaths || 0);
    el.ping.textContent = pingMs == null ? '—' : Math.round(pingMs) + 'ms';
    el.ping.classList.toggle('bad', pingMs != null && pingMs > 160);
  }

  function updateTitleLine() {
    const line = document.querySelector('[data-mp-title]');
    if (!line) return;
    line.textContent = t('titleLine') + ' · ' + t('titleOnline', { n: onlineCount });
  }

  function decorateTitle() {
    const title = document.querySelector('.m-screen[data-s="title"]');
    if (!title) return;
    let line = title.querySelector('[data-mp-title]');
    if (!line) {
      const premise = title.querySelector('.m-premise');
      line = document.createElement('p');
      line.className = 'm-premise mp-title-line';
      line.setAttribute('data-mp-title', '');
      if (premise && premise.parentNode) {
        premise.parentNode.insertBefore(line, premise.nextSibling);
      } else {
        title.appendChild(line);
      }
    }
    updateTitleLine();
  }

  let titleTries = 0;
  const titlePoll = window.setInterval(() => {
    titleTries += 1;
    decorateTitle();
    decorateRepoLinks();
    const found = !!document.querySelector('[data-mp-title]') && !!document.querySelector('[data-mp-repo="title"]');
    if ((found && titleTries > 2) || titleTries > 40) window.clearInterval(titlePoll);
  }, 1000);
  decorateTitle();
  decorateRepoLinks();

  /* ------------------------------------------------------------- kill feed */

  function feedLine(text, kind) {
    const row = document.createElement('div');
    row.className = 'mp-fl' + (kind ? ' ' + kind : '');
    row.textContent = text;
    el.feed.appendChild(row);
    while (el.feed.children.length > 5) el.feed.firstElementChild.remove();
    window.setTimeout(() => {
      row.classList.add('out');
      window.setTimeout(() => row.remove(), 500);
    }, 4600);
  }

  function feedKill(kill) {
    const row = document.createElement('div');
    row.className = 'mp-fl kill';
    const killer = kill.killer;
    const victim = kill.victim || {};
    if (killer) {
      const a = document.createElement('b');
      a.textContent = killer.name;
      a.style.color = killer.color || 'var(--signal)';
      if (killer.id === myId) a.classList.add('self');
      const verb = document.createElement('span');
      verb.textContent = ' ▸ ';
      const b = document.createElement('b');
      b.textContent = victim.name || '—';
      b.style.color = victim.color || 'var(--bone)';
      if (victim.id === myId) b.classList.add('self');
      row.append(a, verb, b);
    } else {
      const b = document.createElement('b');
      b.textContent = victim.name || '—';
      b.style.color = victim.color || 'var(--bone)';
      if (victim.id === myId) b.classList.add('self');
      row.append(b);
      const span = document.createElement('span');
      span.textContent = ' · ' + t('fallenShort');
      row.append(span);
    }
    el.feed.appendChild(row);
    while (el.feed.children.length > 5) el.feed.firstElementChild.remove();
    window.setTimeout(() => {
      row.classList.add('out');
      window.setTimeout(() => row.remove(), 500);
    }, 4600);
  }

  /* --------------------------------------------------------------- roster */

  function renderRoster() {
    el.rosterList.innerHTML = '';
    let others = 0;
    for (const item of rosterData) {
      const isSelf = item.id === myId;
      if (!isSelf) others += 1;
      const row = document.createElement('li');
      row.className = 'mp-rr' + (isSelf ? ' self' : '') + (item.alive ? '' : ' down');
      const name = document.createElement('span');
      name.className = 'mp-rr-name';
      name.textContent = item.name;
      name.style.color = item.color || 'var(--bone)';
      if (isSelf) {
        const tag = document.createElement('em');
        tag.textContent = t('you');
        name.appendChild(tag);
      }
      const kd = document.createElement('span');
      kd.className = 'mp-rr-kd';
      kd.textContent = (item.kills || 0) + ' / ' + (item.deaths || 0);
      const state = document.createElement('i');
      state.className = 'mp-rr-state' + (item.alive ? ' alive' : '');
      state.title = item.alive ? '' : t('respawningShort');
      row.append(name, kd, state);
      el.rosterList.appendChild(row);
    }
    el.rosterEmpty.hidden = others > 0;
    el.rosterEmpty.textContent = t('emptyRoster');
    el.rosterOnline.textContent = t('titleOnline', { n: onlineCount });
  }

  async function loadBoard() {
    try {
      const res = await fetch('/api/game/leaderboard?limit=6', { headers: { accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.leaderboard) ? data.leaderboard : [];
      el.boardList.innerHTML = '';
      if (!rows.length) {
        const li = document.createElement('li');
        li.className = 'mp-board-empty';
        li.textContent = t('boardEmpty');
        el.boardList.appendChild(li);
        return;
      }
      rows.forEach((row, index) => {
        const li = document.createElement('li');
        const rank = document.createElement('i');
        rank.textContent = String(index + 1).padStart(2, '0');
        const name = document.createElement('span');
        name.textContent = row.name;
        const score = document.createElement('b');
        score.textContent = String(row.kills || 0);
        li.append(rank, name, score);
        el.boardList.appendChild(li);
      });
    } catch (err) { /* offline is fine */ }
  }

  function setRoster(open) {
    el.roster.hidden = !open;
    if (open) {
      renderRoster();
      loadBoard();
      try { G && G.input && G.input.exitLock && G.input.exitLock(); } catch (err) { /* ignore */ }
    }
  }

  el.rosterBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setRoster(el.roster.hidden);
  });
  el.rosterClose.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setRoster(false);
  });
  el.roster.addEventListener('click', (event) => {
    if (event.target === el.roster) setRoster(false);
  });
  document.addEventListener('keydown', (event) => {
    const tag = event.target && event.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if (event.code === 'Tab' && !typing) {
      event.preventDefault();
      event.stopPropagation();
      setRoster(el.roster.hidden);
    } else if (event.code === 'Escape' && !el.roster.hidden) {
      event.preventDefault();
      setRoster(false);
    }
  }, true);

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement && !el.roster.hidden) setRoster(false);
  });

  el.nameSave.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = cleanName(el.nameInput.value);
    if (!next) {
      toast(t('nameInvalid'));
      return;
    }
    el.nameInput.classList.remove('is-invalid');
    if (next === myName) {
      el.nameInput.value = myName;
      toast(t('nameSaved'));
      return;
    }
    if (!send({ type: 'rename', name: next })) {
      toast(t('disconnected'));
      return;
    }
    pendingRename = next;
    el.nameSave.disabled = true;
    el.nameSave.setAttribute('aria-busy', 'true');
  });
  el.nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      el.nameSave.click();
    }
  });
  el.nameInput.addEventListener('input', () => {
    el.nameInput.classList.remove('is-invalid');
  });

  /* ---------------------------------------------------------- respawn flow */

  function spawnsFromLevel() {
    const list = [];
    try {
      const start = G && G.level && G.level.playerStart;
      if (start && start.pos) list.push({ x: start.pos.x, y: start.pos.y, z: start.pos.z });
      const enemySpawns = (G && G.level && G.level.enemySpawns) || [];
      for (const spawn of enemySpawns) {
        if (!spawn || !spawn.pos) continue;
        list.push({ x: spawn.pos.x, y: spawn.pos.y, z: spawn.pos.z });
        if (list.length >= 26) break;
      }
    } catch (err) { /* ignore */ }
    return list;
  }

  function defaultSpawn() {
    try {
      const start = G && G.level && G.level.playerStart;
      if (start && start.pos) return { x: start.pos.x, y: start.pos.y, z: start.pos.z };
      if (G && G.player && G.player.pos) {
        return { x: G.player.pos.x, y: G.player.pos.y + 0.2, z: G.player.pos.z };
      }
    } catch (err) { /* ignore */ }
    return { x: 0, y: 0, z: 4 };
  }

  function showRespawnOverlay() {
    el.respawn.hidden = false;
    document.body.classList.add('mp-respawning');
    el.killer.textContent = respawn.by ? t('downBy', { name: respawn.by.name }) : '';
    el.respawnBtn.disabled = true;
    updateRespawnOverlay();
  }

  function hideRespawnOverlay() {
    el.respawn.hidden = true;
    document.body.classList.remove('mp-respawning');
  }

  function updateRespawnOverlay() {
    if (!respawn.active) return;
    const left = Math.max(0, respawn.until - Date.now());
    el.count.textContent = String(Math.max(1, Math.ceil(left / 1000)));
    el.bar.style.width = Math.min(100, Math.max(0, 100 - left / 50)).toFixed(1) + '%';
    if (left <= 0) {
      el.count.textContent = '0';
      el.respawnBtn.disabled = false;
      el.respawnBtn.textContent = t('respawnNow');
    }
  }

  function startRespawn(delayMs, by) {
    respawn.active = true;
    respawn.by = by || null;
    respawn.until = Date.now() + Math.max(600, Number(delayMs) || 5000);
    respawn.requestedAt = 0;
    respawn.fallbackAt = Date.now() + Math.max(4000, Number(delayMs) || 5000) + 3500;
    respawn.lastRequestAt = 0;
    pendingDeathBy = null;
    showRespawnOverlay();
  }

  function requestRespawn() {
    if (!respawn.active) return;
    if (Date.now() < respawn.until) return;
    if (Date.now() - respawn.lastRequestAt < 550) return;
    respawn.lastRequestAt = Date.now();
    send({ type: 'respawn' });
    if (!respawn.requestedAt) respawn.requestedAt = Date.now();
    if (Date.now() > respawn.fallbackAt) {
      // Server unreachable: let the player back in on their own spawn point.
      revive(defaultSpawn(), 0);
    }
  }

  function localDeath() {
    if (!G) return;
    const state = G.game && G.game.state;
    if (state !== 'playing' && state !== 'paused' && state !== 'dead') return;
    if (respawn.active) return;

    const by = serverDeathNotified ? pendingDeathBy : null;
    if (!serverDeathNotified) {
      send({ type: 'died' });
    }
    serverDeathNotified = false;
    pendingDeathBy = null;

    try {
      G.game.state = 'respawning';
      G.hud.show(false);
      G.game.menus.show('none');
      G.hud.setPrompt && G.hud.setPrompt(null);
      G.input.setGameplay(false);
      G.input.exitLock();
    } catch (err) { /* ignore */ }

    startRespawn(5000, by);
  }

  function revive(spawn, protectedUntil) {
    if (!G) return;
    const point = spawn || defaultSpawn();
    const yaw = typeof point.yaw === 'number' ? point.yaw : Math.random() * Math.PI * 2;
    try {
      G.player.reset({
        pos: new THREE.Vector3(point.x, point.y, point.z),
        yaw
      });
      G.player.enabled = true;
      G.player.invulnerable = true;
      G.game.state = 'playing';
      G.hud.show(true);
      G.game.menus.show('none');
      G.input.setGameplay(true);
      G.render.post.fade = 0;
      G.render.post.flash = 0;
      G.render.post.saturation = 1;
      G.audio.setPaused(false);
      G.audio.setIntensity && G.audio.setIntensity(0.4);
    } catch (err) {
      console.error('[mp] revive failed', err);
    }
    const protectUntil = Number(protectedUntil) || 0;
    const shieldMs = Math.max(700, Math.min(4000, protectUntil ? protectUntil - Date.now() : 1800));
    window.setTimeout(() => {
      try { if (G && G.player) G.player.invulnerable = false; } catch (err) { /* ignore */ }
    }, shieldMs);

    respawn.active = false;
    respawn.by = null;
    respawn.requestedAt = 0;
    serverDeathNotified = false;
    pendingDeathBy = null;
    pendingServerDeath = null;
    hideRespawnOverlay();
    toast(t('respawned'));
    window.setTimeout(() => {
      try { G && G.input && G.input.requestLock && G.input.requestLock(); } catch (err) { /* ignore */ }
    }, 120);
    sendState(true);
  }

  el.respawnBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() >= respawn.until) requestRespawn();
  });

  /* -------------------------------------------------------------- avatars */

  function avatarColor(value) {
    return new THREE.Color(value || '#ffb347');
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawAvatarLabel(avatar) {
    const ctx = avatar.ctx;
    const canvas = avatar.canvas;
    const name = avatar.data ? avatar.data.name : '';
    const color = avatar.data ? avatar.data.color : '#ffb347';
    const hp = avatar.data ? Math.max(0, Math.min(100, avatar.data.hp)) : 100;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '700 52px "Barlow Condensed", "Noto Sans SC", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = Math.min(470, Math.max(150, ctx.measureText(name).width + 64));
    const x = (canvas.width - width) / 2;
    ctx.fillStyle = 'rgba(8, 11, 13, .74)';
    roundRect(ctx, x, 4, width, 64, 16);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    roundRect(ctx, x, 4, width, 64, 16);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(name, canvas.width / 2, 38, width - 28);

    const bx = 86;
    const by = 84;
    const bw = 340;
    const bh = 18;
    ctx.fillStyle = 'rgba(8, 11, 13, .8)';
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    const frac = hp / 100;
    const fill = frac > 0.55 ? '#8affc1' : frac > 0.25 ? '#ffd166' : '#ff5a40';
    if (frac > 0) {
      ctx.fillStyle = fill;
      roundRect(ctx, bx + 3, by + 3, Math.max(4, (bw - 6) * frac), bh - 6, 5);
      ctx.fill();
    }
    if (avatar.data && avatar.data.shield) {
      ctx.strokeStyle = '#7ef0e2';
      ctx.lineWidth = 2;
      roundRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 10);
      ctx.stroke();
    }
    ctx.font = '600 22px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(232, 228, 218, .8)';
    ctx.fillText(String(Math.round(hp)), canvas.width / 2, by + bh / 2 + 1);
    avatar.texture.needsUpdate = true;
  }

  function resetAvatarModel(avatar) {
    if (!avatar || !avatar.body) return;
    if (avatar.hunter) {
      avatar.body.remove(avatar.hunter);
      avatar.hunter = null;
      avatar.rig = null;
      avatar.weapon = null;
    }
    if (avatar.fallbackBuilt) {
      for (const child of avatar.body.children.slice()) {
        if (!child.userData || !child.userData.mpHunterFallback) continue;
        avatar.body.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose());
          else child.material.dispose();
        }
      }
      avatar.fallbackBuilt = false;
    }
    avatar.legs = [];
    avatar.arms = [];
    avatar.soldierKind = null;
  }

  function buildFallbackAvatar(avatar, kind) {
    if (!avatar || avatar.disposed || avatar.fallbackBuilt) return;
    avatar.fallbackBuilt = true;
    avatar.soldierKind = normalizeSoldier(kind);
    const color = avatarColor(avatar.data && avatar.data.color);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x151b20, roughness: 0.72, metalness: 0.32 });
    const trimMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.45),
      emissiveIntensity: 0.8,
      roughness: 0.42,
      metalness: 0.2
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d1216, roughness: 0.55, metalness: 0.5 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.34, 0.7, 10), bodyMat);
    torso.position.y = 1.14;
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.42), trimMat);
    vest.position.y = 1.16;
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.18), darkMat);
    backpack.position.set(0, 1.18, 0.27);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), bodyMat);
    head.position.y = 1.64;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), trimMat);
    helmet.position.y = 1.66;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.09, 0.07), trimMat);
    visor.position.set(0, 1.63, -0.19);

    const legGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.64, 8);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.16, 0.42, 0);
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.16, 0.42, 0);
    const bootGeo = new THREE.BoxGeometry(0.19, 0.14, 0.32);
    const bootL = new THREE.Mesh(bootGeo, darkMat);
    bootL.position.set(-0.16, 0.08, -0.04);
    const bootR = new THREE.Mesh(bootGeo, darkMat);
    bootR.position.set(0.16, 0.08, -0.04);

    const armGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.52, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.27, 1.15, -0.24);
    armL.rotation.z = 0.24;
    armL.rotation.x = -0.92;
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.27, 1.14, -0.24);
    armR.rotation.z = -0.24;
    armR.rotation.x = -0.92;

    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.78), darkMat);
    rifle.position.set(0.02, 1.18, -0.33);
    rifle.rotation.y = Math.PI * 0.5;
    const rifleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.28), trimMat);
    rifleTrim.position.set(0.01, 1.13, -0.33);
    rifleTrim.rotation.y = Math.PI * 0.5;

    for (const mesh of [torso, vest, backpack, head, helmet, visor, legL, legR, bootL, bootR, armL, armR, rifle, rifleTrim]) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.userData.mpHunterFallback = true;
      avatar.body.add(mesh);
    }
    avatar.legs = [legL, legR];
    avatar.arms = [armL, armR];
  }

  function mountHunterAvatar(avatar, kind) {
    if (!avatar || avatar.disposed || avatar.hunter) return;
    const api = window.HunterAvatar;
    if (!api || !api.ready || typeof api.create !== 'function') {
      buildFallbackAvatar(avatar, kind);
      return;
    }
    try {
      const hunter = api.create(kind);
      if (!hunter || !hunter.model) throw new Error('hunter clone unavailable');
      hunter.model.name = 'soldier-avatar-model';
      avatar.body.add(hunter.model);
      avatar.hunter = hunter.model;
      avatar.rig = hunter.rig;
      avatar.weapon = hunter.weapon || null;
      avatar.soldierKind = hunter.kind || normalizeSoldier(kind);
      avatar.legs = [];
      avatar.arms = [];
    } catch (err) {
      console.error('[mp] soldier avatar mount failed', err);
      buildFallbackAvatar(avatar, kind);
    }
  }

  function requestHunterAvatar(avatar, kind) {
    const soldier = normalizeSoldier(kind);
    const requestId = (avatar.soldierRequest = (avatar.soldierRequest || 0) + 1);
    const attach = (ok) => {
      if (!avatar || avatar.disposed || avatar.soldierRequest !== requestId) return;
      if (!ok || !window.HunterAvatar || !window.HunterAvatar.isReady(soldier)) {
        buildFallbackAvatar(avatar, soldier);
        return;
      }
      mountHunterAvatar(avatar, soldier);
    };
    if (window.HunterAvatar) {
      window.HunterAvatar.whenReady(soldier).then(attach).catch(() => attach(false));
      return;
    }
    let attempts = 0;
    const wait = () => {
      if (!avatar || avatar.disposed || avatar.soldierRequest !== requestId) return;
      if (window.HunterAvatar) {
        window.HunterAvatar.whenReady(soldier).then(attach).catch(() => attach(false));
        return;
      }
      attempts += 1;
      if (attempts < 60) window.setTimeout(wait, 100);
      else buildFallbackAvatar(avatar, soldier);
    };
    window.setTimeout(wait, 100);
  }

  function createAvatar(data) {
    const color = avatarColor(data.color);
    const group = new THREE.Group();
    group.name = 'mp-avatar';
    const body = new THREE.Group();
    body.name = 'mp-avatar-body';
    body.rotation.order = 'YXZ';
    group.add(body);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.47, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    ring.name = 'mp-avatar-ring';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.014;
    ring.renderOrder = 2;
    group.add(ring);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: true
    });
    const label = new THREE.Sprite(spriteMat);
    label.scale.set(3.1, 0.78, 1);
    label.position.y = 2.32;
    label.renderOrder = 5;
    group.add(label);

    const target = new THREE.Vector3(data.x, data.y, data.z);
    group.position.copy(target);
    group.rotation.y = data.yaw || 0;

    const avatar = {
      id: data.id,
      data,
      group,
      body,
      label,
      texture,
      canvas,
      ctx: canvas.getContext('2d'),
      target,
      targetYaw: data.yaw || 0,
      legs: [],
      arms: [],
      hunter: null,
      rig: null,
      weapon: null,
      soldierKind: null,
      soldierRequest: 0,
      fallbackBuilt: false,
      disposed: false,
      walk: Math.random() * 10,
      hiddenAt: 0,
      lastHp: -1,
      lastShield: null,
      hitAt: 0
    };
    requestHunterAvatar(avatar, normalizeSoldier(data.soldier));
    drawAvatarLabel(avatar);
    return avatar;
  }

  function disposeAvatar(avatar) {
    avatar.disposed = true;
    scene.remove(avatar.group);
    avatar.texture.dispose();
    try { avatar.label.material.dispose(); } catch (err) { /* ignore */ }
    avatar.group.traverse((child) => {
      if (!child.userData || !child.userData.mpHunterFallback) return;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose());
        else child.material.dispose();
      }
    });
  }

  function reconcileAvatars(list) {
    if (!scene || !THREE) return;
    const seen = new Set();
    for (const item of list) {
      if (item.id === myId) continue;
      seen.add(item.id);
      let avatar = avatars.get(item.id);
      if (!avatar) {
        avatar = createAvatar(item);
        avatars.set(item.id, avatar);
        scene.add(avatar.group);
      }
      avatar.data = item;
      avatar.group.visible = true;
      avatar.hiddenAt = 0;
      avatar.target.set(item.x, item.y, item.z);
      avatar.targetYaw = item.yaw || 0;
      const soldier = normalizeSoldier(item.soldier);
      if (avatar.soldierKind && avatar.soldierKind !== soldier) {
        resetAvatarModel(avatar);
        requestHunterAvatar(avatar, soldier);
      }
      if (avatar.lastHp !== item.hp || avatar.lastShield !== item.shield) {
        avatar.lastHp = item.hp;
        avatar.lastShield = item.shield;
        drawAvatarLabel(avatar);
      }
    }
    for (const [id, avatar] of avatars) {
      if (seen.has(id)) continue;
      avatar.group.visible = false;
      if (!avatar.hiddenAt) avatar.hiddenAt = Date.now();
      if (Date.now() - avatar.hiddenAt > 20000) {
        disposeAvatar(avatar);
        avatars.delete(id);
      }
    }
  }

  function updateAvatars(dt) {
    for (const avatar of avatars.values()) {
      if (!avatar.group.visible) continue;
      const distanceSq = avatar.group.position.distanceToSquared(avatar.target);
      if (distanceSq > 64) avatar.group.position.copy(avatar.target);
      else {
        const alpha = 1 - Math.exp(-dt * 16);
        avatar.group.position.lerp(avatar.target, alpha);
      }
      let delta = avatar.targetYaw - avatar.group.rotation.y;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      avatar.group.rotation.y += delta * Math.min(1, dt * 14);

      const moving = !!(avatar.data && avatar.data.moving);
      if (avatar.rig) {
        avatar.rig.update(dt, {
          moving,
          sprint: !!(avatar.data && avatar.data.sprint)
        });
      } else if (moving) {
        avatar.walk += dt * (avatar.data.sprint ? 14 : 9);
        const swing = Math.sin(avatar.walk) * 0.5;
        if (avatar.legs[0]) avatar.legs[0].rotation.x = swing;
        if (avatar.legs[1]) avatar.legs[1].rotation.x = -swing;
        if (avatar.arms[0]) avatar.arms[0].rotation.x = -swing * 0.5;
      } else {
        avatar.walk *= 0.9;
        if (avatar.legs[0]) avatar.legs[0].rotation.x *= 0.9;
        if (avatar.legs[1]) avatar.legs[1].rotation.x *= 0.9;
      }
      const pose = Math.min(1, dt * 10);
      const targetLabelY = 2.28;
      if (avatar.body) {
        avatar.body.rotation.y += (0 - avatar.body.rotation.y) * pose;
        avatar.body.rotation.x += (0 - avatar.body.rotation.x) * pose;
        avatar.body.position.y += (0 - avatar.body.position.y) * pose;
      }
      avatar.label.position.y += (targetLabelY - avatar.label.position.y) * pose;
      if (avatar.hitAt && performance.now() - avatar.hitAt < 140) {
        avatar.group.position.x += (Math.random() - 0.5) * 0.06;
      }
    }
  }

  function avatarHitBox(avatar) {
    const pos = avatar.group.position;
    return { x: pos.x, y: pos.y + 0.95, z: pos.z, hx: 0.46, hy: 0.96, hz: 0.46 };
  }

  function rayBox(origin, dir, cx, cy, cz, hx, hy, hz) {
    let tmin = -Infinity;
    let tmax = Infinity;
    const o = [origin.x, origin.y, origin.z];
    const d = [dir.x, dir.y, dir.z];
    const min = [cx - hx, cy, cz - hz];
    const max = [cx + hx, cy + hy, cz + hz];
    for (let i = 0; i < 3; i += 1) {
      if (Math.abs(d[i]) < 1e-6) {
        if (o[i] < min[i] || o[i] > max[i]) return null;
      } else {
        let t1 = (min[i] - o[i]) / d[i];
        let t2 = (max[i] - o[i]) / d[i];
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      }
    }
    if (tmax < 0) return null;
    return tmin > 0 ? tmin : (tmax > 0 ? 0 : null);
  }

  function patchCombat() {
    if (!G || !G.combat || G.combat.__mpPatched) return;
    const combat = G.combat;
    const original = combat.playerShot;
    if (typeof original !== 'function') return;
    combat.playerShot = function patchedPlayerShot(origin, dir, opts) {
      const result = original.call(this, origin, dir, opts);
      try {
        if (origin && dir && G.game && G.game.state === 'playing' && !respawn.active) {
          send({
            type: 'shot',
            origin: { x: origin.x, y: origin.y, z: origin.z },
            dir: { x: dir.x, y: dir.y, z: dir.z }
          });
        }
      } catch (err) { /* ignore */ }
      try {
        const range = (opts && opts.range) || 300;
        const limit = result && typeof result.dist === 'number' ? result.dist : range;
        let best = null;
        for (const avatar of avatars.values()) {
          if (!avatar.group.visible || !avatar.data) continue;
          const box = avatarHitBox(avatar);
          const hit = rayBox(origin, dir, box.x, box.y, box.z, box.hx, box.hy, box.hz);
          if (hit == null || hit <= 0.35 || hit >= limit) continue;
          if (!best || hit < best.dist) best = { avatar, dist: hit };
        }
        if (!best) return result;
        const point = origin.clone().addScaledVector(dir, best.dist);
        send({ type: 'hit', targetId: best.avatar.id });
        best.avatar.hitAt = performance.now();
        try { G.fx && G.fx.sparks && G.fx.sparks(point, dir, 6); } catch (err) { /* ignore */ }
        return {
          point,
          normal: dir.clone().negate(),
          dist: best.dist,
          surface: 'player',
          enemy: null,
          from: 'player',
          pvp: true
        };
      } catch (err) {
        console.error('[mp] pvp shot check failed', err);
        return result;
      }
    };
    combat.__mpPatched = true;
  }

  /* ------------------------------------------------------------- networking */

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    return proto + location.host + '/ws';
  }

  function send(payload) {
    if (!ws || ws.readyState !== 1) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  }

  function sendBinary(payload) {
    if (!ws || ws.readyState !== 1 || !payload) return false;
    try {
      ws.send(payload);
      return true;
    } catch (err) {
      return false;
    }
  }

  function onMessage(handler) {
    if (typeof handler !== 'function') return () => {};
    messageListeners.add(handler);
    return () => messageListeners.delete(handler);
  }

  function onBinary(handler) {
    if (typeof handler !== 'function') return () => {};
    binaryListeners.add(handler);
    return () => binaryListeners.delete(handler);
  }

  function notifyMessage(msg) {
    for (const handler of messageListeners) {
      try {
        handler(msg);
      } catch (err) {
        console.error('[mp] message listener failed', err);
      }
    }
  }

  function notifyBinary(data) {
    for (const handler of binaryListeners) {
      try {
        handler(data);
      } catch (err) {
        console.error('[mp] binary listener failed', err);
      }
    }
  }

  function sendState(force) {
    if (!G || !G.player || !send) return;
    const now = performance.now();
    if (!force && now - lastStateAt < 90) return;
    lastStateAt = now;
    const state = G.game && G.game.state;
    const active = state === 'playing' && !respawn.active;
    const player = G.player;
    send({
      type: 'state',
      pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
      yaw: player.yaw,
      pitch: player.pitch,
      active,
      moving: !!(player.vel && Math.hypot(player.vel.x, player.vel.z) > 0.6),
      sprint: !!player.sprinting
    });
  }

  function connect() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    window.clearTimeout(reconnectTimer);
    setConnection('connecting');
    let socket;
    try {
      socket = new WebSocket(wsUrl());
    } catch (err) {
      setConnection('offline');
      scheduleReconnect();
      return;
    }
    ws = socket;
    socket.binaryType = 'arraybuffer';

    socket.addEventListener('open', () => {
      connected = true;
      reconnectDelay = 1200;
      setConnection('online');
      everJoined = false;
      send({ type: 'join', name: myName, soldier: mySoldier, spawns: spawnsFromLevel() });
      window.clearInterval(pingTimer);
      pingTimer = window.setInterval(() => {
        if (ws && ws.readyState === 1) send({ type: 'ping', t: performance.now() });
      }, 3000);
      if (G) send({ type: 'spawns', spawns: spawnsFromLevel() });
      toast(t('connected'));
    });

    socket.addEventListener('message', (event) => {
      if (event.data instanceof ArrayBuffer) {
        notifyBinary(event.data);
        return;
      }
      if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
        event.data.arrayBuffer().then(notifyBinary).catch(() => {});
        return;
      }
      let msg;
      try { msg = JSON.parse(event.data); } catch (err) { return; }
      handleMessage(msg);
    });

    socket.addEventListener('close', () => {
      connected = false;
      myId = null;
      pendingRename = null;
      onlineCount = 0;
      pingMs = null;
      rosterData = [];
      updateChip();
      setConnection('offline');
      for (const avatar of avatars.values()) avatar.group.visible = false;
      if (everJoined) toast(t('disconnected'));
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      setConnection('offline');
    });
  }

  function scheduleReconnect() {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(() => {
      reconnectDelay = Math.min(9000, reconnectDelay + 900);
      connect();
    }, reconnectDelay);
  }

  function handleMessage(msg) {
    if (!msg || typeof msg.type !== 'string') return;
    notifyMessage(msg);
    switch (msg.type) {
      case 'welcome': {
        myId = msg.id;
        myName = cleanName(myName) || msg.name;
        myColor = msg.color || myColor;
        mySoldier = normalizeSoldier(msg.soldier || mySoldier);
        break;
      }
      case 'joined': {
        const acceptedRename = msg.renamed === true || !!pendingRename;
        const filtered = msg.filtered === true;
        pendingRename = null;
        el.nameSave.disabled = false;
        el.nameSave.removeAttribute('aria-busy');
        el.nameInput.classList.remove('is-invalid');
        myId = msg.id;
        myName = msg.name;
        myColor = msg.color || myColor;
        mySoldier = normalizeSoldier(msg.soldier || mySoldier);
        saveSoldier(mySoldier);
        el.nameInput.value = myName;
        saveName(myName);
        everJoined = true;
        if (filtered) toast(t('nameFiltered'));
        else if (acceptedRename) toast(t('nameSaved'));
        break;
      }
      case 'soldierAck': {
        mySoldier = normalizeSoldier(msg.soldier || mySoldier);
        saveSoldier(mySoldier);
        break;
      }
      case 'soldierState': {
        const soldier = normalizeSoldier(msg.soldier);
        if (msg.id === myId) mySoldier = soldier;
        const avatar = avatars.get(String(msg.id));
        if (avatar && avatar.data) {
          avatar.data.soldier = soldier;
          if (avatar.soldierKind && avatar.soldierKind !== soldier) {
            resetAvatarModel(avatar);
            requestHunterAvatar(avatar, soldier);
          }
        }
        break;
      }
      case 'nameDenied': {
        pendingRename = null;
        el.nameSave.disabled = false;
        el.nameSave.removeAttribute('aria-busy');
        el.nameInput.value = myName;
        el.nameInput.classList.add('is-invalid');
        window.setTimeout(() => el.nameInput.classList.remove('is-invalid'), 2200);
        toast(msg.reason === 'filtered' ? t('nameBlocked') : t('nameInvalid'));
        break;
      }
      case 'snapshot': {
        onlineCount = Number(msg.online) || 0;
        if (msg.you) {
          const previousAlive = selfStats.alive;
          selfStats = {
            kills: Number(msg.you.kills) || 0,
            deaths: Number(msg.you.deaths) || 0,
            streak: Number(msg.you.streak) || 0,
            bestStreak: Number(msg.you.bestStreak) || 0,
            alive: msg.you.alive !== false
          };
          if (respawn.active && selfStats.alive) {
            // server already revived us; let the local flow finish naturally
          }
          if (previousAlive === false && selfStats.alive && respawn.active) {
            respawn.until = Math.min(respawn.until, Date.now());
          }
        }
        rosterData = Array.isArray(msg.roster) ? msg.roster : [];
        updateChip();
        if (!el.roster.hidden) renderRoster();
        updateTitleLine();
        reconcileAvatars(Array.isArray(msg.players) ? msg.players : []);
        break;
      }
      case 'hitConfirm': {
        if (!G || !G.hud) break;
        if (msg.blocked) {
          if (performance.now() - lastBlockedToast > 1800) {
            lastBlockedToast = performance.now();
            toast(t('hitBlocked'));
          }
          break;
        }
        try {
          G.hud.hitmarker(msg.killed ? 'kill' : 'hit');
        } catch (err) { /* ignore */ }
        break;
      }
      case 'damaged': {
        if (!G || !G.player) break;
        if (!G.player.alive) break;
        const amount = Math.max(1, Math.min(60, Number(msg.amount) || 10));
        let from = null;
        try {
          if (msg.from && msg.from.pos) {
            from = new THREE.Vector3(msg.from.pos.x, msg.from.pos.y, msg.from.pos.z);
          }
        } catch (err) { /* ignore */ }
        try {
          G.player.damage(amount, from || undefined);
        } catch (err) { /* ignore */ }
        break;
      }
      case 'youDied': {
        const by = msg.by || null;
        pendingDeathBy = by;
        serverDeathNotified = true;
        const respawnIn = Math.max(0, Number(msg.respawnIn) || 5000);
        if (respawn.active) {
          respawn.by = by || respawn.by;
          respawn.until = Math.max(respawn.until, Date.now() + Math.max(0, respawnIn - 500));
          showRespawnOverlay();
          break;
        }
        const state = G && G.game ? G.game.state : '';
        if (G && G.player && G.player.alive && (state === 'playing' || state === 'paused' || state === 'dead')) {
          try {
            G.player.invulnerable = false;
            G.player.damage(9999, undefined);
          } catch (err) { /* ignore */ }
        } else if (state === 'playing' || state === 'paused' || state === 'dead') {
          startRespawn(respawnIn, by);
        } else {
          pendingServerDeath = { by, respawnIn };
        }
        break;
      }
      case 'deathAck': {
        if (respawn.active && Number(msg.respawnAt)) {
          const serverAt = Number(msg.respawnAt);
          if (serverAt > respawn.until + 150 && serverAt < Date.now() + 6500) respawn.until = serverAt;
        }
        break;
      }
      case 'respawnWait': {
        if (respawn.active) {
          respawn.until = Date.now() + Math.max(0, Number(msg.ms) || 0);
          respawn.fallbackAt = Date.now() + 3200;
        }
        break;
      }
      case 'respawned': {
        if (msg.pos) {
          const spawn = {
            x: Number(msg.pos.x) || 0,
            y: Number(msg.pos.y) || 0,
            z: Number(msg.pos.z) || 0,
            yaw: msg.yaw
          };
          const wasActive = respawn.active;
          if (wasActive || (G && G.player && !G.player.alive)) {
            revive(spawn, msg.protectedUntil);
          } else {
            // server thinks we are alive: gently resync the position if we are far away
            sendState(true);
          }
        }
        break;
      }
      case 'kill': {
        feedKill(msg);
        if (msg.victim && msg.victim.id === myId) {
          // local death handler will take care of the overlay
        } else if (msg.killer && msg.killer.id === myId) {
          toast(t('youKilled', { name: msg.victim ? msg.victim.name : '' }));
        }
        break;
      }
      case 'notice': {
        if (msg.kind === 'join') feedLine(t('join', { name: msg.name }), 'sys');
        else if (msg.kind === 'leave') feedLine(t('leave', { name: msg.name }), 'sys');
        else if (msg.kind === 'return') feedLine(t('return', { name: msg.name }), 'sys');
        else if (msg.kind === 'rename') feedLine(t('rename', { name: msg.previous, next: msg.name }), 'sys');
        break;
      }
      case 'shot': {
        if (!G || !G.fx || !G.fx.tracer || !msg.origin || !msg.dir) break;
        try {
          const origin = new THREE.Vector3(msg.origin.x, msg.origin.y, msg.origin.z);
          const dir = new THREE.Vector3(msg.dir.x, msg.dir.y, msg.dir.z);
          if (dir.lengthSq() < 1e-5) break;
          const end = origin.clone().addScaledVector(dir.normalize(), 80);
          G.fx.tracer(origin, end);
        } catch (err) { /* ignore */ }
        break;
      }
      case 'pong': {
        if (typeof msg.t === 'number') pingMs = performance.now() - msg.t;
        break;
      }
      default:
        break;
    }
  }

  /* ------------------------------------------------------------ game hooks */

  function attachGame(game) {
    G = game;
    THREE = game.THREE;
    scene = game.scene;
    if (!scene || !THREE) return;

    try {
      game.events.on('player:dead', localDeath);
    } catch (err) {
      console.error('[mp] failed to hook player:dead', err);
    }

    patchCombat();

    window.clearInterval(stateTimer);
    stateTimer = window.setInterval(() => sendState(false), 100);

    // Watch for pending server deaths (player was in the intro / menu when hit).
    window.setInterval(() => {
      if (!pendingServerDeath || !G) return;
      const state = G.game && G.game.state;
      if (state !== 'playing' && state !== 'paused' && state !== 'dead') return;
      const pending = pendingServerDeath;
      pendingServerDeath = null;
      pendingDeathBy = pending.by;
      serverDeathNotified = true;
      try {
        G.player.invulnerable = false;
        G.player.damage(9999, undefined);
      } catch (err) { /* ignore */ }
    }, 400);

    // Auto respawn countdown.
    window.setInterval(() => {
      if (!respawn.active) return;
      updateRespawnOverlay();
      if (Date.now() >= respawn.until) requestRespawn();
    }, 160);

    // Frame loop for avatar interpolation.
    const frame = (now) => {
      const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
      lastFrame = now;
      try { updateAvatars(dt); } catch (err) { /* ignore */ }
      window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame(frame);

    send({ type: 'spawns', spawns: spawnsFromLevel() });
    sendState(true);
  }

  window.setInterval(() => {
    const candidate = window.__G;
    if (!candidate || !candidate.game || !candidate.player || !candidate.scene || !candidate.THREE) return;
    if (G === candidate) return;
    attachGame(candidate);
  }, 150);

  window.setTimeout(() => {
    const candidate = window.__G;
    if (candidate && candidate.game && candidate.player && candidate.scene && candidate.THREE && G !== candidate) {
      attachGame(candidate);
    }
  }, 5000);

  // Surface the roster hint once the player actually deploys.
  const stateProbe = window.setInterval(() => {
    if (!G) return;
    window.clearInterval(stateProbe);
    const previous = G.game.update;
    if (typeof previous !== 'function' || previous.__mpWrapped) return;
    G.game.update = function wrappedUpdate(dt) {
      const result = previous.call(this, dt);
      if (G && G.game.state === 'playing' && document.body.dataset.mpHint !== '1') {
        document.body.dataset.mpHint = '1';
        toast(t('hint'));
      }
      return result;
    };
    G.game.update.__mpWrapped = true;
  }, 400);

  connect();
  updateChip();

  window.__mp = {
    get online() { return onlineCount; },
    get connected() { return connected; },
    get id() { return myId; },
    get name() { return myName; },
    get soldier() { return mySoldier; },
    get avatars() { return avatars.size; },
    get roster() { return rosterData.slice(); },
    get respawn() { return { active: respawn.active, until: respawn.until }; },
    get game() { return G; },
    get avatarList() {
      return [...avatars.values()]
        .filter((avatar) => avatar.group.visible && avatar.data)
        .map((avatar) => ({
          id: avatar.id,
          x: avatar.group.position.x,
          y: avatar.group.position.y,
          z: avatar.group.position.z,
          soldier: avatar.data.soldier,
          soldierKind: avatar.soldierKind,
          hunterMounted: !!avatar.hunter,
          weaponMounted: !!(avatar.weapon && avatar.weapon.parent),
          fallbackBuilt: !!avatar.fallbackBuilt,
          data: avatar.data
        }));
    },
    pickAvatar(origin, dir, range) {
      if (!origin || !dir) return null;
      let best = null;
      const limit = Number(range) || 300;
      for (const avatar of avatars.values()) {
        if (!avatar.group.visible || !avatar.data) continue;
        const box = avatarHitBox(avatar);
        const hit = rayBox(origin, dir, box.x, box.y, box.z, box.hx, box.hy, box.hz);
        if (hit == null || hit <= 0.35 || hit >= limit) continue;
        if (!best || hit < best.dist) best = { id: avatar.id, dist: hit, data: avatar.data };
      }
      return best;
    },
    toast,
    onMessage,
    onBinary,
    send,
    sendBinary,
    setSoldier(value) {
      mySoldier = normalizeSoldier(value);
      saveSoldier(mySoldier);
      if (ws && ws.readyState === 1) send({ type: 'soldier', soldier: mySoldier });
      return mySoldier;
    }
  };
})();
