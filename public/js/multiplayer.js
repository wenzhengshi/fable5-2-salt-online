(() => {
  'use strict';

  const i18n = window.__SALT_I18N__ || {};
  const messages = i18n.messages || {};
  const MP = messages.mp || {};
  const uiRoot = document.getElementById('ui');
  if (!uiRoot) return;

  const STORAGE_NAME = 'saltline.multiplayer.name';
  const STORAGE_SOLDIER = 'saltline.multiplayer.soldier';
  const UNIT_KINDS = ['male', 'female', 'hound', 'drone', 'classic'];
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
    return UNIT_KINDS.includes(value) ? value : 'classic';
  }

  function isMachine(value) {
    return value === 'hound' || value === 'drone';
  }

  function loadSoldier() {
    try { return normalizeSoldier(localStorage.getItem(STORAGE_SOLDIER)); } catch (err) { return 'classic'; }
  }

  function saveSoldier(value) {
    try { localStorage.setItem(STORAGE_SOLDIER, normalizeSoldier(value)); } catch (err) { /* ignore */ }
  }

  let myName = loadName();
  let mySoldier = loadSoldier();
  let localUnit = null;
  let localUnitRequest = 0;
  let localUnitKind = null;
  let localDroneLight = null;
  let unitFlightY = 0;
  let lastUnitBadgeAt = 0;
  const virtualUnitInput = {
    ascend: false,
    descend: false
  };
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
  let pendingDeathMeta = null;
  let lastKillAt = 0;

  const deathReplay = {
    active: false,
    data: null,
    startedAt: 0,
    raf: 0,
    lastFrame: 0,
    duration: 3800
  };
  const snapshotTrails = new Map();

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
    <div class="mp-unit" id="mp-unit" hidden>
      <span data-mp-label="unitLabel"></span>
      <b id="mp-unit-name"></b>
      <em id="mp-unit-alt"></em>
    </div>
    <div class="mp-feed" id="mp-feed" aria-live="polite"></div>
    <div class="mp-respawn" id="mp-respawn" hidden>
      <div class="mp-respawn-card" role="status" aria-live="assertive">
        <div class="mp-respawn-k"></div>
        <div class="mp-respawn-num" id="mp-count">5</div>
        <div class="mp-respawn-line" id="mp-killer"></div>
        <div class="mp-respawn-unit" id="mp-killer-unit" hidden></div>
        <div class="mp-deathcam" id="mp-deathcam" hidden>
          <div class="mp-deathcam-head">
            <div class="mp-deathcam-title">
              <i class="mp-deathcam-led" aria-hidden="true"></i>
              <b id="mp-deathcam-title"></b>
              <span class="mp-deathcam-tag" id="mp-deathcam-tag"></span>
            </div>
            <span id="mp-deathcam-meta"></span>
          </div>
          <div class="mp-deathcam-view">
            <canvas id="mp-deathcam-canvas" width="640" height="360"></canvas>
            <div class="mp-deathcam-fallback" id="mp-deathcam-fallback" hidden></div>
            <div class="mp-deathcam-overlay" aria-hidden="true">
              <i class="mp-deathcam-corner tl"></i>
              <i class="mp-deathcam-corner tr"></i>
              <i class="mp-deathcam-corner bl"></i>
              <i class="mp-deathcam-corner br"></i>
              <span class="mp-deathcam-cam" id="mp-deathcam-cam"></span>
              <div class="mp-deathcam-progress"><i id="mp-deathcam-progress"></i></div>
            </div>
          </div>
          <div class="mp-deathcam-foot">
            <span><i class="you"></i><em id="mp-deathcam-you"></em></span>
            <span><i class="killer"></i><em id="mp-deathcam-killer"></em></span>
            <span class="mp-deathcam-mode" id="mp-deathcam-mode"></span>
          </div>
        </div>
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
  const touchControlObserver = new MutationObserver(() => installUnitTouchControls());
  touchControlObserver.observe(uiRoot, { childList: true, subtree: true });

  const el = {
    chip: ui.querySelector('#mp-chip'),
    unit: ui.querySelector('#mp-unit'),
    unitName: ui.querySelector('#mp-unit-name'),
    unitAlt: ui.querySelector('#mp-unit-alt'),
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
    killerUnit: ui.querySelector('#mp-killer-unit'),
    deathcam: ui.querySelector('#mp-deathcam'),
    deathcamTitle: ui.querySelector('#mp-deathcam-title'),
    deathcamTag: ui.querySelector('#mp-deathcam-tag'),
    deathcamMeta: ui.querySelector('#mp-deathcam-meta'),
    deathcamCanvas: ui.querySelector('#mp-deathcam-canvas'),
    deathcamFallback: ui.querySelector('#mp-deathcam-fallback'),
    deathcamCam: ui.querySelector('#mp-deathcam-cam'),
    deathcamProgress: ui.querySelector('#mp-deathcam-progress'),
    deathcamMode: ui.querySelector('#mp-deathcam-mode'),
    deathcamYou: ui.querySelector('#mp-deathcam-you'),
    deathcamKiller: ui.querySelector('#mp-deathcam-killer'),
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
    rosterHint: t('rosterHint'),
    unitLabel: t('unitLabel')
  };
  ui.querySelectorAll('[data-mp-label]').forEach((node) => {
    node.textContent = labelText[node.getAttribute('data-mp-label')] || '';
  });
  ui.querySelector('.mp-respawn-k').textContent = t('down');
  el.respawnBtn.textContent = t('respawnNow');
  el.deathcamTitle.textContent = t('deathReplay');
  el.deathcamTag.textContent = t('deathReplay3dTag');
  el.deathcamFallback.textContent = t('deathReplayUnavailable');
  el.deathcamCam.textContent = t('deathReplayCam');
  el.deathcamMode.textContent = t('deathReplayMode');
  el.deathcamYou.textContent = t('you');
  el.deathcamCanvas.setAttribute('aria-label', t('deathReplay'));
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

  const UNIT_META = {
    male: {
      key: 'unitMale',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"/></svg>'
    },
    female: {
      key: 'unitFemale',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-1 9h2v3h3v2h-3v3h3v2h-3v3h-2v-3H7v-2h3v-3H7v-2h3v-3Z"/></svg>'
    },
    hound: {
      key: 'unitHound',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9 5.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM15 5.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM19.5 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.05-1.08-1.75-1.32-.11-.04-.22-.07-.33-.09-.25-.04-.52-.04-.78-.04s-.53 0-.79.05c-.11.02-.22.05-.33.09-.7.24-1.28.78-1.75 1.32-.87 1.02-1.6 1.89-2.48 2.91-1.31 1.31-2.92 2.76-2.62 4.79.29 1.02 1.02 2.03 2.33 2.32.73.15 3.06-.44 5.54-.44h.18c2.48 0 4.81.58 5.54.44 1.31-.29 2.04-1.31 2.33-2.32.31-2.04-1.3-3.49-2.61-4.8Z"/></svg>'
    },
    drone: {
      key: 'unitDrone',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h5v2H5v3H3V4Zm13 0h5v5h-2V6h-3V4ZM3 15h2v3h3v2H3v-5Zm16 0h2v5h-5v-2h3v-3ZM9 9h6l2 3v4l-2 2H9l-2-2v-4l2-3Zm1 3v3l1 1h2l1-1v-3l-1-1h-2l-1 1Z"/></svg>'
    },
    classic: {
      key: 'unitClassic',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8v3h2v2h2v4h-2v2h-2v3h-2v6h-2v-6h-2v6H8v-6H6v-3H4v-2H2V7h2V5h2V2h2Zm2 3H8v5h2v2h4V9h-2V5Zm0 8v2h4v-2h-4Z"/></svg>'
    }
  };

  function unitLabel(kind) {
    const meta = UNIT_META[kind];
    return meta ? t(meta.key) : '';
  }

  function resolveUnitKind(entity) {
    if (!entity) return null;
    if (UNIT_KINDS.includes(entity.soldier)) return entity.soldier;
    const id = entity.id == null ? '' : String(entity.id);
    if (!id) return null;
    const avatar = avatars.get(id);
    if (avatar && avatar.data && UNIT_KINDS.includes(avatar.data.soldier)) return avatar.data.soldier;
    const roster = rosterData.find((item) => String(item.id) === id);
    return roster && UNIT_KINDS.includes(roster.soldier) ? roster.soldier : null;
  }

  function createUnitBadge(kind) {
    const meta = UNIT_META[kind];
    if (!meta) return null;
    const label = t(meta.key);
    const tag = document.createElement('span');
    tag.className = 'mp-unit-tag';
    tag.dataset.kind = kind;
    tag.title = label;
    tag.setAttribute('aria-label', label);
    const glyph = document.createElement('span');
    glyph.className = 'mp-unit-tag-i';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.innerHTML = meta.icon;
    const text = document.createElement('em');
    text.textContent = label;
    tag.append(glyph, text);
    return tag;
  }

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
    const victimName = victim.name || '—';
    if (killer) {
      const kind = resolveUnitKind(killer);
      const a = document.createElement('b');
      a.textContent = killer.name;
      a.style.color = killer.color || 'var(--signal)';
      if (killer.id === myId) a.classList.add('self');
      row.append(a);
      const badge = createUnitBadge(kind);
      if (badge) row.append(badge);
      const verb = document.createElement('span');
      verb.textContent = ' ▸ ';
      const b = document.createElement('b');
      b.textContent = victimName;
      b.style.color = victim.color || 'var(--bone)';
      if (victim.id === myId) b.classList.add('self');
      row.append(verb, b);
      row.setAttribute('aria-label', badge
        ? t('feedKillUnit', { killer: killer.name, unit: unitLabel(kind), victim: victimName })
        : t('feedKill', { killer: killer.name, victim: victimName }));
    } else {
      const b = document.createElement('b');
      b.textContent = victimName;
      b.style.color = victim.color || 'var(--bone)';
      if (victim.id === myId) b.classList.add('self');
      row.append(b);
      const span = document.createElement('span');
      span.textContent = ' · ' + t('fallenShort');
      row.append(span);
      row.setAttribute('aria-label', victimName + ' · ' + t('fallenShort'));
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

  function clampNum(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  /* ------------------------------------------------------------ death cam */

  function recordSnapshotTrails(players, at) {
    const time = Number(at) || Date.now();
    const seen = new Set();
    for (const player of players || []) {
      if (!player || player.id == null) continue;
      const id = String(player.id);
      if (!Number.isFinite(Number(player.x)) || !Number.isFinite(Number(player.z))) continue;
      seen.add(id);
      let trail = snapshotTrails.get(id);
      if (!trail) {
        trail = { samples: [], lastSeen: time };
        snapshotTrails.set(id, trail);
      }
      const last = trail.samples[trail.samples.length - 1];
      if (!last || last.t !== time) {
        trail.samples.push({
          x: Number(player.x),
          y: Number(player.y) || 0,
          z: Number(player.z),
          yaw: Number(player.yaw) || 0,
          t: time
        });
        if (trail.samples.length > 64) trail.samples.shift();
      }
      trail.lastSeen = time;
    }
    for (const [id, trail] of snapshotTrails) {
      if (!seen.has(id) && time - trail.lastSeen > 15000) snapshotTrails.delete(id);
    }
  }

  function lastTrailPoint(id) {
    const trail = snapshotTrails.get(String(id));
    const sample = trail && trail.samples.length ? trail.samples[trail.samples.length - 1] : null;
    return sample ? { x: sample.x, y: sample.y, z: sample.z } : null;
  }

  function pointOrNull(value) {
    if (!value) return null;
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return { x, y: Number.isFinite(y) ? y : 0, z };
  }

  function bearingTo(from, to) {
    return (Math.atan2(to.x - from.x, -(to.z - from.z)) * 180 / Math.PI + 360) % 360;
  }

  function replayNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeReplayTrack(rows, killAt) {
    if (!Array.isArray(rows)) return [];
    const samples = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 4) continue;
      const dt = replayNumber(row[0], NaN);
      const x = replayNumber(row[1], NaN);
      const y = replayNumber(row[2], 0);
      const z = replayNumber(row[3], NaN);
      if (!Number.isFinite(dt) || !Number.isFinite(x) || !Number.isFinite(z)) continue;
      samples.push({
        t: killAt + dt,
        x,
        y,
        z,
        yaw: replayNumber(row[4], 0),
        pitch: replayNumber(row[5], 0)
      });
    }
    samples.sort((a, b) => a.t - b.t);
    return samples;
  }

  function normalizeServerReplay(raw, fallbackKiller) {
    if (!raw || raw.source !== 'server' || raw.version !== 1) return null;
    const killAt = replayNumber(raw.killAt, 0);
    if (!killAt) return null;
    const victimTrack = normalizeReplayTrack(raw.victimTrack, killAt);
    const killerTrack = normalizeReplayTrack(raw.killerTrack, killAt);
    if (victimTrack.length < 2 || killerTrack.length < 2) return null;
    const victim = victimTrack[victimTrack.length - 1];
    const killer = killerTrack[killerTrack.length - 1];
    const windowMs = Math.max(1200, Math.min(6000, replayNumber(raw.windowMs, 4500)));
    const startAt = killAt - windowMs;
    const shots = [];
    for (const row of Array.isArray(raw.shots) ? raw.shots : []) {
      if (!Array.isArray(row) || row.length < 4) continue;
      const dt = replayNumber(row[0], NaN);
      const x = replayNumber(row[1], NaN);
      const y = replayNumber(row[2], 0);
      const z = replayNumber(row[3], NaN);
      if (!Number.isFinite(dt) || !Number.isFinite(x) || !Number.isFinite(z)) continue;
      shots.push({
        t: killAt + dt,
        origin: { x, y, z },
        dir: {
          x: replayNumber(row[4], 0),
          y: replayNumber(row[5], 0),
          z: replayNumber(row[6], 0)
        }
      });
    }
    const hits = [];
    for (const row of Array.isArray(raw.hits) ? raw.hits : []) {
      if (!Array.isArray(row) || row.length < 3) continue;
      const dt = replayNumber(row[0], NaN);
      if (!Number.isFinite(dt)) continue;
      hits.push({
        t: killAt + dt,
        damage: replayNumber(row[1], 0),
        hp: replayNumber(row[2], 0),
        killed: row[3] === 1
      });
    }
    const killerInfo = raw.killer && raw.killer.id != null ? raw.killer : fallbackKiller;
    return {
      id: String(raw.id || ''),
      source: 'server',
      victim,
      killer,
      victimTrack,
      killerTrack,
      shots,
      hits,
      startAt,
      endAt: killAt,
      killAt,
      distance: Math.max(0, replayNumber(raw.distance, Math.hypot(killer.x - victim.x, killer.z - victim.z))),
      bearing: replayNumber(raw.bearing, bearingTo(victim, killer)),
      victimInfo: raw.victim || null,
      killerInfo
    };
  }

  function stopDeathReplay() {
    deathReplay.active = false;
    deathReplay.data = null;
    deathReplay.startedAt = 0;
    deathReplay.lastFrame = 0;
    if (deathReplay.raf) {
      window.cancelAnimationFrame(deathReplay.raf);
      deathReplay.raf = 0;
    }
    try {
      if (window.SaltDeathReplay3D) window.SaltDeathReplay3D.stop();
    } catch (err) { /* ignore */ }
    if (el.deathcamProgress) el.deathcamProgress.style.width = '0%';
    if (el.deathcam) el.deathcam.hidden = true;
  }

  function prepareDeathReplay(by, meta) {
    if (!el.deathcam) {
      stopDeathReplay();
      return;
    }
    const info = meta || {};
    const replay = normalizeServerReplay(info.replay, by);
    if (!replay || (!replay.killerInfo && !by)) {
      stopDeathReplay();
      return;
    }
    const killerInfo = replay.killerInfo || by;
    const victim = pointOrNull(replay.victim) || pointOrNull(info.victimPos) || pointOrNull(G && G.player && G.player.pos);
    if (!victim) {
      stopDeathReplay();
      return;
    }
    const replayGroundY = groundHeightAt(victim.x, victim.z, victim.y + 1.6);
    deathReplay.data = {
      victim,
      killer: { ...killerInfo, x: replay.killer.x, y: replay.killer.y, z: replay.killer.z },
      points: replay.killerTrack,
      victimPoints: replay.victimTrack,
      shots: replay.shots,
      hits: replay.hits,
      startAt: replay.startAt,
      endAt: replay.endAt,
      distance: replay.distance,
      bearing: replay.bearing,
      authoritative: true,
      replayId: replay.id
    };
    deathReplay.active = true;
    deathReplay.duration = clampNum(replay.endAt - replay.startAt, 1800, 5000);
    deathReplay.startedAt = performance.now();
    deathReplay.lastFrame = 0;
    el.deathcam.hidden = false;
    el.deathcamTitle.textContent = t('deathReplay');
    el.deathcamTag.textContent = t('deathReplay3dTag');
    el.deathcamCam.textContent = t('deathReplayCam');
    el.deathcamMode.textContent = t('deathReplayMode');
    el.deathcamYou.textContent = t('you');
    el.deathcamKiller.textContent = killerInfo.name || t('killer');
    el.deathcamMeta.textContent = t('deathReplayMeta', {
      distance: Math.round(replay.distance),
      deg: String(Math.round(deathReplay.data.bearing)).padStart(3, '0')
    });
    const killerKind = UNIT_KINDS.includes(replay.killerInfo && replay.killerInfo.soldier)
      ? replay.killerInfo.soldier
      : (resolveUnitKind(killerInfo) || 'classic');
    const victimKind = UNIT_KINDS.includes(replay.victimInfo && replay.victimInfo.soldier)
      ? replay.victimInfo.soldier
      : normalizeSoldier(mySoldier);
    const killerAvatar = avatars.get(String(killerInfo.id));
    const replayApi = window.SaltDeathReplay3D;
    let ready = false;
    el.deathcamCanvas.hidden = false;
    el.deathcamFallback.hidden = true;
    if (replayApi && typeof replayApi.play === 'function') {
      try {
        ready = replayApi.play(el.deathcamCanvas, THREE, {
          victim: deathReplay.data.victim,
          killer: deathReplay.data.killer,
          points: deathReplay.data.points,
          victimPoints: deathReplay.data.victimPoints,
          shots: deathReplay.data.shots,
          hits: deathReplay.data.hits,
          startAt: replay.startAt,
          endAt: replay.endAt,
          victimYaw: replay.victimTrack[0].yaw,
          groundY: Number.isFinite(replayGroundY) ? replayGroundY : (Number(victim.y) || 0),
          victimKind,
          killerKind,
          victimColor: myColor || '#9fe8ff',
          killerColor: (killerAvatar && killerAvatar.data && killerAvatar.data.color) || killerInfo.color || '#ff5a40',
          victimLabel: t('you'),
          killerLabel: killerInfo.name || t('killer'),
          victimRole: unitLabel(victimKind),
          killerRole: unitLabel(killerKind)
        });
      } catch (err) {
        console.error('[mp] 3D death replay failed', err);
        ready = false;
      }
    }
    if (ready && replayApi && typeof replayApi.resize === 'function') {
      try { replayApi.resize(); } catch (err) { /* ignore */ }
    }
    el.deathcamCanvas.hidden = !ready;
    el.deathcamFallback.hidden = !!ready;
    el.deathcamFallback.textContent = t('deathReplayUnavailable');
    el.deathcamMode.textContent = ready ? t('deathReplayMode') : t('deathReplayModeOffline');
    startDeathReplayLoop();
  }

  function startDeathReplayLoop() {
    if (deathReplay.raf) return;
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const draw = (now) => {
      if (!deathReplay.active || !deathReplay.data) {
        deathReplay.raf = 0;
        return;
      }
      const previous = deathReplay.lastFrame || now;
      deathReplay.lastFrame = now;
      const dt = Math.min(0.08, Math.max(0.001, (now - previous) / 1000));
      const elapsed = Math.max(0, now - deathReplay.startedAt);
      const progress = reduce ? 1 : clampNum(elapsed / deathReplay.duration, 0, 1);
      if (el.deathcamProgress) {
        el.deathcamProgress.style.width = (progress * 100).toFixed(1) + '%';
      }
      const replayApi = window.SaltDeathReplay3D;
      let rendered = false;
      if (replayApi && typeof replayApi.render === 'function') {
        try { rendered = replayApi.render(progress, dt); } catch (err) { rendered = false; }
      }
      if (!rendered) {
        el.deathcamCanvas.hidden = true;
        el.deathcamFallback.hidden = false;
        el.deathcamFallback.textContent = t('deathReplayUnavailable');
        el.deathcamMode.textContent = t('deathReplayModeOffline');
      }
      deathReplay.raf = window.requestAnimationFrame(draw);
    };
    deathReplay.raf = window.requestAnimationFrame(draw);
  }

  /* --------------------------------------------------- drone searchlights */

  function groundHeightAt(x, z, probeY) {
    try {
      const value = Number(G && G.physics && G.physics.groundHeight(x, z, probeY));
      if (Number.isFinite(value)) return value;
    } catch (err) { /* fall back to sea level */ }
    return 0;
  }

  function createSearchLight() {
    const light = new THREE.SpotLight(0xd8f4ff, 0, 34, 0.34, 0.62, 1.15);
    light.castShadow = false;
    light.position.set(0, 0, 0);
    const target = new THREE.Object3D();
    target.position.set(0, 0, 1);
    light.target = target;
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1, 1, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xccefff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
    );
    beam.frustumCulled = false;
    beam.renderOrder = 3;
    beam.visible = false;
    scene.add(light, target, beam);
    return {
      light,
      target,
      beam,
      origin: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      down: new THREE.Vector3(0, -1, 0),
      intensity: 0
    };
  }

  function disposeSearchLight(rec) {
    if (!rec) return;
    rec.light.intensity = 0;
    rec.light.visible = false;
    rec.target.visible = false;
    rec.beam.visible = false;
    rec.beam.material.opacity = 0;
    if (rec.light.parent) rec.light.parent.remove(rec.light);
    if (rec.target.parent) rec.target.parent.remove(rec.target);
    if (rec.beam.parent) rec.beam.parent.remove(rec.beam);
    if (rec.beam.geometry) rec.beam.geometry.dispose();
    if (rec.beam.material) rec.beam.material.dispose();
  }

  function disposeLocalDroneLight() {
    if (!localDroneLight) return;
    disposeSearchLight(localDroneLight);
    localDroneLight = null;
  }

  function chaseLightCleanup(avatar) {
    if (!avatar || !avatar.droneLight) return;
    disposeSearchLight(avatar.droneLight);
    avatar.droneLight = null;
  }

  function aimSearchLight(rec, origin, target, altitude, active) {
    if (!rec) return;
    const near = clampNum(1 - (altitude - 1.2) / 7.2, 0, 1);
    const power = active ? near : 0;
    rec.intensity = power;
    rec.light.intensity = power * 24;
    rec.light.visible = power > 0.015;
    rec.target.visible = rec.light.visible;
    rec.beam.visible = power > 0.02;
    if (!rec.light.visible) return;
    rec.origin.copy(origin);
    rec.aim.copy(target);
    rec.light.position.copy(rec.origin);
    rec.target.position.copy(rec.aim);
    rec.dir.copy(rec.aim).sub(rec.origin);
    const length = rec.dir.length();
    if (length < 0.25) return;
    rec.dir.multiplyScalar(1 / length);
    rec.beam.position.copy(rec.origin).addScaledVector(rec.dir, length * 0.5);
    rec.beam.quaternion.setFromUnitVectors(rec.down, rec.dir);
    rec.beam.scale.set(
      Math.max(0.12, Math.tan(rec.light.angle) * length * 0.78),
      length,
      Math.max(0.12, Math.tan(rec.light.angle) * length * 0.78)
    );
    rec.beam.material.opacity = 0.018 + power * 0.052;
  }

  function updateLocalDroneLight(kind, ground, cameraDir) {
    if (!G || !G.player) return;
    if (kind !== 'drone') {
      disposeLocalDroneLight();
      return;
    }
    if (!localDroneLight) localDroneLight = createSearchLight();
    const player = G.player;
    const active = player.alive && G.game && G.game.state === 'playing' && !respawn.active;
    const altitude = Math.max(0, player.pos.y - ground);
    const forward = localDroneLight.dir;
    if (cameraDir) forward.set(cameraDir.x, 0, cameraDir.z);
    if (forward.lengthSq() < 1e-5) forward.set(Math.sin(player.yaw || 0), 0, Math.cos(player.yaw || 0));
    forward.normalize();
    const target = localDroneLight.aim.copy(player.pos).addScaledVector(forward, 8.5);
    target.y = ground + 0.06;
    aimSearchLight(
      localDroneLight,
      localDroneLight.origin.copy(player.pos).setY(player.pos.y + 0.08),
      target,
      altitude,
      active
    );
  }

  function updateAvatarDroneLight(avatar, kind) {
    if (!avatar) return;
    if (kind !== 'drone' || !avatar.group.visible || avatar.wreck) {
      chaseLightCleanup(avatar);
      return;
    }
    if (!avatar.droneLight) avatar.droneLight = createSearchLight();
    const pos = avatar.group.position;
    const ground = groundHeightAt(pos.x, pos.z, pos.y + 2.5);
    const altitude = Math.max(0, pos.y - ground);
    const yaw = avatar.group.rotation.y;
    const target = avatar.droneLight.aim.set(
      pos.x + Math.sin(yaw) * 3.8,
      ground + 0.06,
      pos.z + Math.cos(yaw) * 3.8
    );
    aimSearchLight(
      avatar.droneLight,
      avatar.droneLight.origin.copy(pos).setY(pos.y + 0.06),
      target,
      altitude,
      true
    );
  }

  /* ------------------------------------------------------ machine wrecks */

  function machineBurst(pos, scale) {
    if (!pos || !G) return;
    try {
      if (G.fx && G.fx.explosion) G.fx.explosion(pos, scale || 1);
      if (G.fx && G.fx.sparks) G.fx.sparks(pos, new THREE.Vector3(0, 1, 0), 26);
      if (G.fx && G.fx.debris) G.fx.debris(pos, { count: 9 });
      if (G.fx && G.fx.smoke) G.fx.smoke(pos, { size: 1.1, life: 2.4, color: 0x353b3f, rise: 1.5 });
    } catch (err) { /* visuals are best-effort */ }
    try {
      if (G.audio && typeof G.audio.play === 'function') {
        G.audio.play('explosion', { pos, gain: 1, jitter: 0.05 });
      }
    } catch (err) { /* ignore */ }
  }

  function machineWreckPosition(victim, avatar) {
    if (avatar && avatar.group) return avatar.group.position.clone();
    const trail = victim && victim.id ? lastTrailPoint(victim.id) : null;
    return trail ? new THREE.Vector3(trail.x, trail.y || 0, trail.z) : null;
  }

  function startMachineWreck(victim) {
    if (!victim || !THREE) return;
    const kind = normalizeSoldier(victim.soldier);
    if (!isMachine(kind)) return;
    const avatar = avatars.get(String(victim.id));
    const pos = machineWreckPosition(victim, avatar);
    if (!pos) return;
    if (!avatar) {
      if (G && G.player && G.player.pos && G.player.pos.distanceTo(pos) < 45) {
        machineBurst(pos, kind === 'drone' ? 1.25 : 1.05);
      }
      return;
    }
    if (avatar.wreck) return;
    chaseLightCleanup(avatar);
    const trail = snapshotTrails.get(String(victim.id));
    const samples = trail && trail.samples ? trail.samples : [];
    const last = samples[samples.length - 1];
    const prev = samples[samples.length - 2];
    let vx = 0;
    let vz = 0;
    if (last && prev && last.t > prev.t) {
      vx = clampNum((last.x - prev.x) / ((last.t - prev.t) / 1000), -12, 12);
      vz = clampNum((last.z - prev.z) / ((last.t - prev.t) / 1000), -12, 12);
    }
    avatar.group.visible = true;
    avatar.hiddenAt = 0;
    avatar.label.visible = false;
    avatar.group.position.copy(pos);
    avatar.wreck = {
      kind,
      t: 0,
      smokeAt: 0,
      exploded: false,
      done: false,
      vel: new THREE.Vector3(vx * 0.55, kind === 'drone' ? -0.8 : -0.2, vz * 0.55),
      spin: (Math.random() < 0.5 ? -1 : 1) * (kind === 'drone' ? 6.5 : 3.2)
    };
    try {
      if (G.fx && G.fx.sparks) G.fx.sparks(pos, new THREE.Vector3(0, 1, 0), 16);
      if (G.fx && G.fx.smoke) G.fx.smoke(pos, { size: 0.45, life: 1.2, color: 0x24292c, rise: 0.9 });
      if (G.fx && G.fx.debris) G.fx.debris(pos, { count: 4 });
    } catch (err) { /* ignore */ }
  }

  function updateMachineWreck(avatar, dt) {
    const w = avatar && avatar.wreck;
    if (!w) return false;
    w.t += dt;
    const pos = avatar.group.position;
    if (!w.exploded) {
      w.vel.y -= (w.kind === 'drone' ? 15 : 19) * dt;
      pos.addScaledVector(w.vel, dt);
      avatar.group.rotation.x += w.spin * 0.19 * dt;
      avatar.group.rotation.z += w.spin * 0.34 * dt;
      avatar.group.rotation.y += w.spin * 0.52 * dt;
      const ground = groundHeightAt(pos.x, pos.z, pos.y + 1.5);
      const floor = ground + (w.kind === 'drone' ? 0.18 : 0.12);
      if (pos.y <= floor) {
        pos.y = floor;
        w.exploded = true;
        w.explodeAt = w.t;
        w.vel.set(0, 0, 0);
        machineBurst(pos, w.kind === 'drone' ? 1.3 : 1.05);
        try {
          if (G.fx && G.fx.dust) G.fx.dust(pos, new THREE.Vector3(0.8, 1.8, 0.8));
        } catch (err) { /* ignore */ }
      }
      w.smokeAt -= dt;
      if (w.smokeAt <= 0 && G && G.fx && G.fx.smoke) {
        w.smokeAt = w.kind === 'drone' ? 0.055 : 0.09;
        try {
          G.fx.smoke(pos, {
            size: w.kind === 'drone' ? 0.48 : 0.34,
            life: 1.4,
            color: 0x2a3033,
            rise: 0.9
          });
        } catch (err) { /* ignore */ }
      }
    } else {
      const age = w.t - (w.explodeAt || w.t);
      pos.y -= dt * 0.16;
      avatar.group.rotation.z += dt * 0.12;
      if (age > 1.4) {
        w.done = true;
        avatar.group.visible = false;
        avatar.hiddenAt = Date.now();
        chaseLightCleanup(avatar);
        return true;
      }
    }
    return false;
  }

  function showRespawnOverlay(meta) {
    el.respawn.hidden = false;
    document.body.classList.add('mp-respawning');
    el.killer.textContent = respawn.by ? t('downBy', { name: respawn.by.name }) : '';
    el.killerUnit.innerHTML = '';
    const killerKind = resolveUnitKind(respawn.by);
    if (respawn.by && killerKind) {
      const label = document.createElement('span');
      label.className = 'mp-respawn-unit-k';
      label.textContent = t('killerUnit');
      const badge = createUnitBadge(killerKind);
      if (badge) {
        el.killerUnit.append(label, badge);
        el.killerUnit.hidden = false;
      } else {
        el.killerUnit.hidden = true;
      }
    } else {
      el.killerUnit.hidden = true;
    }
    try { prepareDeathReplay(respawn.by, meta || pendingDeathMeta); } catch (err) { stopDeathReplay(); }
    el.respawnBtn.disabled = true;
    updateRespawnOverlay();
  }

  function hideRespawnOverlay() {
    el.respawn.hidden = true;
    document.body.classList.remove('mp-respawning');
    stopDeathReplay();
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

  function startRespawn(delayMs, by, meta) {
    respawn.active = true;
    respawn.by = by || null;
    respawn.until = Date.now() + Math.max(600, Number(delayMs) || 5000);
    respawn.requestedAt = 0;
    respawn.fallbackAt = Date.now() + Math.max(4000, Number(delayMs) || 5000) + 3500;
    respawn.lastRequestAt = 0;
    pendingDeathMeta = meta || null;
    pendingDeathBy = null;
    showRespawnOverlay(meta || pendingDeathMeta);
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
    disposeLocalDroneLight();

    const by = serverDeathNotified ? pendingDeathBy : null;
    const meta = pendingDeathMeta ? { ...pendingDeathMeta } : {};
    if (!meta.victimPos && G.player && G.player.pos) {
      meta.victimPos = { x: G.player.pos.x, y: G.player.pos.y, z: G.player.pos.z };
    }
    if (!Number.isFinite(Number(meta.victimYaw)) && G.player && Number.isFinite(Number(G.player.yaw))) {
      meta.victimYaw = Number(G.player.yaw);
    }
    if (!meta.at) meta.at = lastKillAt || Date.now();
    if (!serverDeathNotified) {
      send({ type: 'died' });
    }
    serverDeathNotified = false;
    pendingDeathBy = null;
    pendingDeathMeta = null;

    try {
      G.game.state = 'respawning';
      G.hud.show(false);
      G.game.menus.show('none');
      G.hud.setPrompt && G.hud.setPrompt(null);
      G.input.setGameplay(false);
      G.input.exitLock();
    } catch (err) { /* ignore */ }

    startRespawn(5000, by, meta);
  }

  function revive(spawn, protectedUntil) {
    if (!G) return;
    disposeLocalDroneLight();
    const point = spawn || defaultSpawn();
    const yaw = typeof point.yaw === 'number' ? point.yaw : Math.random() * Math.PI * 2;
    try {
      G.player.reset({
        pos: new THREE.Vector3(point.x, point.y, point.z),
        yaw
      });
      G.player.enabled = true;
      G.player.invulnerable = true;
      unitFlightY = 0;
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
    pendingDeathMeta = null;
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

  function clearAvatarFallback(avatar) {
    if (!avatar || !avatar.body) return;
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

  function resetAvatarModel(avatar) {
    if (!avatar || !avatar.body) return;
    chaseLightCleanup(avatar);
    if (avatar.machineUpgradeTimer) {
      window.clearTimeout(avatar.machineUpgradeTimer);
      avatar.machineUpgradeTimer = 0;
    }
    if (avatar.hunter) {
      avatar.body.remove(avatar.hunter);
      avatar.hunter = null;
      avatar.rig = null;
      avatar.weapon = null;
    }
    clearAvatarFallback(avatar);
    avatar.legs = [];
    avatar.arms = [];
    avatar.soldierKind = null;
    avatar.machine = false;
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
    avatar.machine = false;
  }

  function buildMachineFallbackAvatar(avatar, kind) {
    if (!avatar || avatar.disposed || avatar.fallbackBuilt) return;
    avatar.fallbackBuilt = true;
    avatar.soldierKind = normalizeSoldier(kind);
    avatar.machine = true;
    const color = avatarColor(avatar.data && avatar.data.color);
    const shell = new THREE.MeshStandardMaterial({ color: 0x20292d, roughness: 0.56, metalness: 0.58 });
    const trim = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.6),
      emissiveIntensity: 1.1,
      roughness: 0.38,
      metalness: 0.36
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f12, roughness: 0.5, metalness: 0.72 });
    const parts = [];

    if (kind === 'hound') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.9), shell);
      body.position.y = 0.64;
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.62), trim);
      spine.position.set(0, 0.79, 0.03);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.3), shell);
      head.position.set(0, 0.7, -0.48);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 8), dark);
      gun.rotation.x = Math.PI / 2;
      gun.position.set(0, 0.82, -0.57);
      parts.push(body, spine, head, gun);
      for (const x of [-0.22, 0.22]) {
        for (const z of [-0.31, 0.31]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.58, 7), dark);
          leg.position.set(x, 0.32, z);
          leg.rotation.z = x < 0 ? -0.2 : 0.2;
          parts.push(leg);
        }
      }
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.54), shell);
      body.position.y = 1.15;
      const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), trim);
      sensor.position.set(0, 1.08, -0.25);
      parts.push(body, sensor);
      for (const x of [-0.32, 0.32]) {
        for (const z of [-0.28, 0.28]) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.035), dark);
          arm.position.set(x * 0.55, 1.18, z);
          const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 18), trim);
          rotor.position.set(x, 1.22, z);
          parts.push(arm, rotor);
        }
      }
    }

    for (const mesh of parts) {
      mesh.castShadow = true;
      mesh.userData.mpHunterFallback = true;
      avatar.body.add(mesh);
    }
    scheduleMachineFallbackUpgrade(avatar, kind);
  }

  function mountMachineAvatar(avatar, kind) {
    if (!avatar || avatar.disposed || avatar.hunter) return true;
    const api = window.SaltUnitModels;
    if (!api || typeof api.create !== 'function') return false;
    try {
      const made = api.create(kind);
      if (!made || !made.model) throw new Error('machine unit clone unavailable');
      clearAvatarFallback(avatar);
      made.model.name = `mp-${kind}-model`;
      avatar.body.add(made.model);
      avatar.hunter = made.model;
      avatar.rig = made.rig;
      avatar.weapon = null;
      avatar.soldierKind = made.kind || normalizeSoldier(kind);
      avatar.machine = true;
      avatar.legs = [];
      avatar.arms = [];
      return true;
    } catch (err) {
      console.error('[mp] machine avatar mount failed', err);
      buildMachineFallbackAvatar(avatar, kind);
      return false;
    }
  }

  function scheduleMachineFallbackUpgrade(avatar, kind) {
    if (!avatar || avatar.disposed || !isMachine(kind)) return;
    if (avatar.machineUpgradeTimer) return;
    if ((avatar.machineUpgradeTries || 0) >= 20) return;
    avatar.machineUpgradeTries = (avatar.machineUpgradeTries || 0) + 1;
    avatar.machineUpgradeTimer = window.setTimeout(() => {
      avatar.machineUpgradeTimer = 0;
      if (!avatar || avatar.disposed || avatar.hunter) return;
      const api = window.SaltUnitModels;
      if (api && typeof api.isReady === 'function' && api.isReady(kind)) {
        if (mountMachineAvatar(avatar, kind)) return;
      }
      scheduleMachineFallbackUpgrade(avatar, kind);
    }, 1200);
  }

  function requestMachineAvatar(avatar, kind, requestId) {
    const startedAt = performance.now();
    const wait = () => {
      if (!avatar || avatar.disposed || avatar.soldierRequest !== requestId) return;
      const api = window.SaltUnitModels;
      if (!api || typeof api.create !== 'function') {
        if (performance.now() - startedAt < 30000) window.setTimeout(wait, 120);
        else buildMachineFallbackAvatar(avatar, kind);
        return;
      }
      if (typeof api.isReady !== 'function' || api.isReady(kind)) {
        mountMachineAvatar(avatar, kind);
        return;
      }
      if (typeof api.whenReady === 'function') {
        api.whenReady(kind).then((ready) => {
          if (!avatar || avatar.disposed || avatar.soldierRequest !== requestId) return;
          if (ready) {
            mountMachineAvatar(avatar, kind);
            return;
          }
          if (performance.now() - startedAt < 30000) window.setTimeout(wait, 200);
          else buildMachineFallbackAvatar(avatar, kind);
        }).catch(() => {
          if (!avatar || avatar.disposed || avatar.soldierRequest !== requestId) return;
          if (performance.now() - startedAt < 30000) window.setTimeout(wait, 200);
          else buildMachineFallbackAvatar(avatar, kind);
        });
        return;
      }
      if (performance.now() - startedAt < 30000) window.setTimeout(wait, 120);
      else buildMachineFallbackAvatar(avatar, kind);
    };
    wait();
  }

  function mountHunterAvatar(avatar, kind) {
    if (!avatar || avatar.disposed || avatar.hunter) return;
    const classic = kind === 'classic';
    const api = classic ? window.ClassicAvatar : window.HunterAvatar;
    if (!api || (!classic && !api.ready) || typeof api.create !== 'function') {
      buildFallbackAvatar(avatar, kind);
      return;
    }
    try {
      const hunter = api.create(kind, {
        color: avatar.data && avatar.data.color
      });
      if (!hunter || !hunter.model) throw new Error('hunter clone unavailable');
      hunter.model.name = 'soldier-avatar-model';
      avatar.body.add(hunter.model);
      avatar.hunter = hunter.model;
      avatar.rig = hunter.rig;
      avatar.weapon = hunter.weapon || null;
      avatar.soldierKind = hunter.kind || normalizeSoldier(kind);
      avatar.machine = false;
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
    if (isMachine(soldier)) {
      requestMachineAvatar(avatar, soldier, requestId);
      return;
    }
    const attach = (ok) => {
      if (!avatar || avatar.disposed || avatar.soldierRequest !== requestId) return;
      const readyApi = soldier === 'classic' ? window.ClassicAvatar : window.HunterAvatar;
      if (!ok || !readyApi || !readyApi.isReady(soldier)) {
        buildFallbackAvatar(avatar, soldier);
        return;
      }
      mountHunterAvatar(avatar, soldier);
    };
    const api = soldier === 'classic' ? window.ClassicAvatar : window.HunterAvatar;
    if (api) {
      api.whenReady(soldier).then(attach).catch(() => attach(false));
      return;
    }
    let attempts = 0;
    const wait = () => {
      if (!avatar || avatar.disposed || avatar.soldierRequest !== requestId) return;
      const currentApi = soldier === 'classic' ? window.ClassicAvatar : window.HunterAvatar;
      if (currentApi) {
        currentApi.whenReady(soldier).then(attach).catch(() => attach(false));
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
      machine: false,
      droneLight: null,
      wreck: null,
      soldierKind: null,
      soldierRequest: 0,
      fallbackBuilt: false,
      machineUpgradeTimer: 0,
      machineUpgradeTries: 0,
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
    if (avatar.machineUpgradeTimer) {
      window.clearTimeout(avatar.machineUpgradeTimer);
      avatar.machineUpgradeTimer = 0;
    }
    chaseLightCleanup(avatar);
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
      if (avatar.wreck) {
        avatar.wreck = null;
        avatar.label.visible = true;
        avatar.group.rotation.x = 0;
        avatar.group.rotation.z = 0;
      }
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
      if (avatar.wreck && !avatar.wreck.done) {
        avatar.group.visible = true;
        continue;
      }
      chaseLightCleanup(avatar);
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
      if (avatar.wreck && !avatar.wreck.done) {
        try {
          updateMachineWreck(avatar, dt);
        } catch (err) { /* ignore */ }
        continue;
      }
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
      const kind = avatar.soldierKind || normalizeSoldier(avatar.data && avatar.data.soldier);
      try { updateAvatarDroneLight(avatar, kind); } catch (err) { /* ignore */ }
      const targetLabelY = isMachine(kind) ? (kind === 'drone' ? 1.35 : 1.05) : 2.28;
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
    const kind = avatar.soldierKind || normalizeSoldier(avatar.data && avatar.data.soldier);
    if (kind === 'drone') {
      return { x: pos.x, y: pos.y + 0.28, z: pos.z, hx: 0.55, hy: 0.62, hz: 0.55 };
    }
    if (kind === 'hound') {
      return { x: pos.x, y: pos.y + 0.18, z: pos.z, hx: 0.58, hy: 0.58, hz: 0.58 };
    }
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
    const params = new URLSearchParams();
    const identity = window.__SALT_FOCUS__ || {};
    if (identity.clientId) params.set('clientId', identity.clientId);
    if (identity.fingerprint) params.set('fingerprint', identity.fingerprint);
    const query = params.toString();
    return proto + location.host + '/ws' + (query ? '?' + query : '');
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
      visible: !document.hidden,
      moving: !!(player.vel && Math.hypot(player.vel.x, player.vel.z) > 0.6),
      sprint: !!player.sprinting
    });
  }

  function unitName(kind) {
    const unit = normalizeSoldier(kind);
    return t(`unit${unit.charAt(0).toUpperCase()}${unit.slice(1)}`);
  }

  function removeLocalUnit() {
    disposeLocalDroneLight();
    if (localUnit && localUnit.model && localUnit.model.parent) {
      localUnit.model.parent.remove(localUnit.model);
    }
    localUnit = null;
    localUnitKind = null;
  }

  function updateUnitBadge() {
    const kind = normalizeSoldier(mySoldier);
    const machine = isMachine(kind);
    el.unit.hidden = !machine;
    if (!machine) return;
    el.unitName.textContent = unitName(kind);
    const altitude = G && G.player ? Math.max(0, G.player.pos.y) : 0;
    el.unitAlt.textContent = kind === 'drone'
      ? t('unitAltitude', { n: altitude.toFixed(1) })
      : t('unitGround');
    el.unit.dataset.kind = kind;
  }

  function setMachineWeaponVisual(hidden) {
    if (!G || !G.weapon || !G.weapon.root) return;
    const root = G.weapon.root;
    // The game uses root.visible as the fire-enable flag. Keeping it true while
    // hiding direct visual children preserves shooting, ammo and recoil logic.
    root.visible = true;
    if (!Array.isArray(G.weapon.__unitChildVisibility)) {
      G.weapon.__unitChildVisibility = root.children.map((child) => ({
        node: child,
        visible: child.visible
      }));
    }
    for (const item of G.weapon.__unitChildVisibility) {
      if (item && item.node) item.node.visible = hidden ? false : item.visible;
    }
  }

  function installUnitTouchControls() {
    const touch = document.querySelector('#ui .touch');
    if (!touch) return;
    const kind = normalizeSoldier(mySoldier);
    const machine = isMachine(kind);
    touch.dataset.unit = machine ? kind : 'infantry';
    const jump = touch.querySelector('.t-jump span');
    const fire = touch.querySelector('.t-fire span');
    if (jump) {
      jump.dataset.defaultText ||= jump.textContent;
      const nextJump = kind === 'drone' ? t('unitAscend') : machine ? t('unitJump') : jump.dataset.defaultText;
      if (jump.textContent !== nextJump) jump.textContent = nextJump;
    }
    if (fire) {
      fire.dataset.defaultText ||= fire.textContent;
      const nextFire = machine ? t('unitFire') : fire.dataset.defaultText;
      if (fire.textContent !== nextFire) fire.textContent = nextFire;
    }

    let descend = touch.querySelector('.t-descend');
    if (!descend) {
      descend = document.createElement('button');
      descend.type = 'button';
      descend.className = 't-btn t-descend';
      descend.dataset.a = 'unit-descend';
      descend.setAttribute('aria-label', t('unitDescend'));
      descend.innerHTML = `<span>${t('unitDescend')}</span>`;
      const releaseDescend = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        virtualUnitInput.descend = false;
        descend.classList.remove('active');
      };
      descend.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        virtualUnitInput.descend = true;
        descend.classList.add('active');
        try { descend.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      }, { passive: false });
      descend.addEventListener('pointerup', releaseDescend, { passive: false });
      descend.addEventListener('pointercancel', releaseDescend, { passive: false });
      descend.addEventListener('lostpointercapture', releaseDescend, { passive: false });
      touch.appendChild(descend);
    }
    const shouldHide = kind !== 'drone';
    if (descend.hidden !== shouldHide) descend.hidden = shouldHide;
    if (kind !== 'drone') virtualUnitInput.descend = false;
  }

  function installLocalUnit() {
    if (!G || !G.player || !scene || !THREE) return;
    const kind = normalizeSoldier(mySoldier);
    updateUnitBadge();
    try { setMachineWeaponVisual(isMachine(kind)); } catch (err) { /* ignore */ }
    installUnitTouchControls();
    if (!isMachine(kind)) {
      removeLocalUnit();
      return;
    }
    if (localUnit && localUnitKind === kind) return;
    removeLocalUnit();
    const requestId = ++localUnitRequest;
    const api = window.SaltUnitModels;
    if (!api || typeof api.whenReady !== 'function') return;
    api.whenReady(kind).then((ready) => {
      if (!ready || requestId !== localUnitRequest || normalizeSoldier(mySoldier) !== kind) return;
      const made = api.create(kind);
      if (!made || !made.model) return;
      localUnit = made;
      localUnitKind = kind;
      made.model.name = `local-${kind}-unit`;
      made.model.position.copy(G.player.pos);
      // First-person camera occupies the same space as the controlled chassis.
      // Keep the local clone for shared animation state, but never render it into our own view.
      made.model.visible = false;
      scene.add(made.model);
    }).catch(() => {});
  }

  function applyLocalUnitFrame(dt) {
    if (!G || !G.player || !G.camera) return;
    const player = G.player;
    const input = G.input;
    const kind = normalizeSoldier(mySoldier);
    if (!isMachine(kind)) {
      disposeLocalDroneLight();
      return;
    }

    if (kind === 'drone') {
      let ground = 0;
      try {
        ground = Number(G.physics.groundHeight(player.pos.x, player.pos.z, player.pos.y + 3)) || 0;
      } catch (err) {
        ground = 0;
      }
      const minY = ground + 1.05;
      const ascend = virtualUnitInput.ascend || !!(input && input.down && input.down('jump'));
      const descend = virtualUnitInput.descend || !!(input && input.down && input.down('sprint'));
      if (!unitFlightY || unitFlightY < minY) unitFlightY = minY;
      if (ascend) unitFlightY += 4.6 * dt;
      if (descend) unitFlightY -= 4.6 * dt;
      unitFlightY = Math.max(minY, Math.min(22, unitFlightY));
      player.pos.y = unitFlightY;
      player.vel.y = 0;
      player.onGround = false;
      player.eye.set(player.pos.x, player.pos.y + 0.9, player.pos.z);
    } else {
      unitFlightY = 0;
      try {
        const ground = Number(G.physics.groundHeight(player.pos.x, player.pos.z, player.pos.y + 2));
        if (Number.isFinite(ground)) player.pos.y = ground;
      } catch (err) { /* ignore */ }
      player.eye.set(player.pos.x, player.pos.y + 0.68, player.pos.z);
    }

    G.camera.position.copy(player.eye);
    try {
      if (kind === 'drone') {
        if (!G.__saltCameraDir) G.__saltCameraDir = new THREE.Vector3();
        const cameraDir = G.camera.getWorldDirection(G.__saltCameraDir);
        updateLocalDroneLight(kind, ground, cameraDir);
      } else {
        updateLocalDroneLight(kind, ground, null);
      }
    } catch (err) { /* ignore */ }
    if (localUnit && localUnit.model) {
      localUnit.model.position.copy(player.pos);
      localUnit.model.rotation.set(
        kind === 'drone' ? player.pitch * 0.22 : 0,
        player.yaw,
        kind === 'drone' && input && input.move ? -input.move.x * 0.1 : 0
      );
      localUnit.rig.update(dt, {
        moving: !!(player.vel && Math.hypot(player.vel.x, player.vel.z) > 0.6),
        sprint: !!player.sprinting
      });
    }
  }

  function patchPlayerForUnits() {
    if (!G || !G.player || typeof G.player.update !== 'function') return;
    if (G.player.update.__saltlineUnitPatch) return;
    const original = G.player.update;
    const wrapped = function wrappedUnitPlayerUpdate(dt) {
      const result = original.call(this, dt);
      try { applyLocalUnitFrame(dt); } catch (err) { /* ignore */ }
      return result;
    };
    wrapped.__saltlineUnitPatch = true;
    G.player.update = wrapped;
    if (G.weapon && typeof G.weapon.update === 'function' && !G.weapon.update.__saltlineUnitPatch) {
      const originalWeaponUpdate = G.weapon.update;
      const weaponWrap = function wrappedUnitWeaponUpdate(dt) {
        const result = originalWeaponUpdate.call(this, dt);
        if (isMachine(mySoldier)) setMachineWeaponVisual(true);
        return result;
      };
      weaponWrap.__saltlineUnitPatch = true;
      G.weapon.update = weaponWrap;
    }
  }

  function applyUnitSelection() {
    updateUnitBadge();
    installLocalUnit();
    patchPlayerForUnits();
    sendState(true);
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
      disposeLocalDroneLight();
      for (const avatar of avatars.values()) {
        chaseLightCleanup(avatar);
        avatar.group.visible = false;
      }
      snapshotTrails.clear();
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
        applyUnitSelection();
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
        applyUnitSelection();
        if (filtered) toast(t('nameFiltered'));
        else if (acceptedRename) toast(t('nameSaved'));
        break;
      }
      case 'soldierAck': {
        mySoldier = normalizeSoldier(msg.soldier || mySoldier);
        saveSoldier(mySoldier);
        applyUnitSelection();
        break;
      }
      case 'soldierState': {
        const soldier = normalizeSoldier(msg.soldier);
        if (msg.id === myId) {
          mySoldier = soldier;
          applyUnitSelection();
        }
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
        recordSnapshotTrails(msg.players, msg.t);
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
        const replay = msg.replay && msg.replay.source === 'server' ? msg.replay : null;
        const replayAt = replay ? Number(replay.killAt) : 0;
        pendingDeathBy = by;
        pendingDeathMeta = {
          at: replayAt || lastKillAt || Date.now(),
          replay,
          victimPos: G && G.player && G.player.pos
            ? { x: G.player.pos.x, y: G.player.pos.y, z: G.player.pos.z }
            : null
        };
        serverDeathNotified = true;
        const respawnIn = Math.max(0, Number(msg.respawnIn) || 5000);
        if (respawn.active) {
          respawn.by = by || respawn.by;
          respawn.until = Math.max(respawn.until, Date.now() + Math.max(0, respawnIn - 500));
          showRespawnOverlay(pendingDeathMeta);
          break;
        }
        const state = G && G.game ? G.game.state : '';
        if (G && G.player && G.player.alive && (state === 'playing' || state === 'paused' || state === 'dead')) {
          try {
            G.player.invulnerable = false;
            G.player.damage(9999, undefined);
          } catch (err) { /* ignore */ }
        } else if (state === 'playing' || state === 'paused' || state === 'dead') {
          startRespawn(respawnIn, by, pendingDeathMeta);
        } else {
          pendingServerDeath = { by, respawnIn, meta: pendingDeathMeta };
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
        lastKillAt = Number(msg.at) || Date.now();
        feedKill(msg);
        try { startMachineWreck(msg.victim); } catch (err) { /* ignore */ }
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
    try {
      game.events.on('game:state', (event) => {
        if (!event || event.state !== 'playing') disposeLocalDroneLight();
      });
    } catch (err) {
      console.error('[mp] failed to hook game:state', err);
    }

    patchCombat();
    patchPlayerForUnits();
    installLocalUnit();
    updateUnitBadge();

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
      pendingDeathMeta = pending.meta || pendingDeathMeta;
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
      if (isMachine(mySoldier) && now - lastUnitBadgeAt > 180) {
        lastUnitBadgeAt = now;
        try { updateUnitBadge(); } catch (err) { /* ignore */ }
      }
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
    focusDeploy(spawn, protectedUntil) {
      if (!G || !G.player) return false;
      revive(spawn, protectedUntil);
      return true;
    },
    setSoldier(value) {
      mySoldier = normalizeSoldier(value);
      saveSoldier(mySoldier);
      if (ws && ws.readyState === 1) send({ type: 'soldier', soldier: mySoldier });
      applyUnitSelection();
      return mySoldier;
    }
  };
})();
