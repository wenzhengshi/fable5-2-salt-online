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
  const ANDROID_MARKET_URL = 'https://tulingai.com/app-market.html?id=49';
  const REPO_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
  const MARKET_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 3h2v9.17l3.59-3.58L18 10l-6 6-6-6 1.41-1.41L11 12.17V3Zm-6 15h14v3H5v-3Z"/></svg>';

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

  function createMarketLink(variant) {
    const link = document.createElement('a');
    link.className = 'salt-repo salt-market' + (variant ? ' salt-repo-' + variant : '');
    link.href = ANDROID_MARKET_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = t('appMarketHint');
    link.setAttribute('data-mp-market', variant || 'default');
    link.setAttribute('aria-label', t('appMarket') + ' — ' + t('appMarketHint') + ': ' + ANDROID_MARKET_URL);

    const glyph = document.createElement('span');
    glyph.className = 'salt-repo-glyph';
    glyph.innerHTML = MARKET_ICON;

    const copy = document.createElement('span');
    copy.className = 'salt-repo-copy';
    const label = document.createElement('b');
    label.textContent = t('appMarket');
    const meta = document.createElement('em');
    meta.textContent = t('appMarketMeta');
    copy.append(label, meta);

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
      mount.append(createRepoLink('title'), createMarketLink('title'));
      titleMain.appendChild(mount);
    }

    const paused = document.querySelector('.m-screen[data-s="paused"]');
    if (paused && !paused.querySelector('[data-mp-repo="paused"]')) {
      const mount = document.createElement('div');
      mount.className = 'mp-paused-repo';
      mount.setAttribute('data-mp-repo', 'paused');
      mount.append(createRepoLink('paused'), createMarketLink('paused'));
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
  const qingyun = window.SaltQingyunZone;
  let unitFlightY = 0;
  let unitFlightPrev = null;
  let flightGuardBoxes = [];
  let flightCollisionBoxes = null;
  let flightCollisionBase = null;
  let flightCollisionBaseCount = 0;
  let lastUnitBadgeAt = 0;
  const FLIGHT_COLLISION = {
    radius: 0.72,
    bottom: 0.12,
    top: 1.2,
    maxIterations: 5
  };
  const FLIGHT_AIR_WALL = Object.freeze({
    minX: -40,
    maxX: 40,
    minZ: -30,
    maxZ: 30,
    padding: 0.4
  });
  const DRONE_AIRBORNE_CLEARANCE = 1.8;
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

  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }

  function updateChip() {
    setText(el.online, String(onlineCount));
    setText(el.kills, String(selfStats.kills || 0));
    setText(el.deaths, String(selfStats.deaths || 0));
    setText(el.ping, pingMs == null ? '—' : Math.round(pingMs) + 'ms');
    el.ping.classList.toggle('bad', pingMs != null && pingMs > 160);
  }

  function updateTitleLine() {
    const line = document.querySelector('[data-mp-title]');
    if (!line) return;
    setText(line, t('titleLine') + ' · ' + t('titleOnline', { n: onlineCount }));
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

  let renderedRoster = [];
  let renderedSelf;
  function renderRoster() {
    setText(el.rosterOnline, t('titleOnline', { n: onlineCount }));
    if (renderedSelf === myId && renderedRoster.length === rosterData.length &&
      rosterData.every((item, index) => {
        const row = renderedRoster[index];
        return row.id === item.id && row.name === item.name && row.color === item.color &&
          row.kills === item.kills && row.deaths === item.deaths && row.alive === item.alive &&
          !!row.focused === !!item.focused && row.focusKind === item.focusKind;
      })) return;
    renderedSelf = myId;
    renderedRoster = rosterData;
    const rows = document.createDocumentFragment();
    let others = 0;
    for (const item of rosterData) {
      const isSelf = item.id === myId;
      if (!isSelf) others += 1;
      const row = document.createElement('li');
      const focused = item.focused === true;
      row.className = 'mp-rr' + (isSelf ? ' self' : '') + (item.alive ? '' : ' down') + (focused ? ' focused' : '');
      const name = document.createElement('span');
      name.className = 'mp-rr-name';
      name.textContent = item.name;
      name.style.color = item.color || 'var(--bone)';
      if (focused) {
        const focus = document.createElement('em');
        focus.className = 'mp-rr-focus';
        focus.textContent = t('focusBadge');
        focus.title = t(item.focusKind === 'auto' ? 'focusAutoBadge' : 'focusManualBadge');
        name.appendChild(focus);
      }
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
      state.title = focused ? t('focusSpectating') : (item.alive ? '' : t('respawningShort'));
      row.append(name, kd, state);
      rows.appendChild(row);
    }
    el.rosterList.replaceChildren(rows);
    el.rosterEmpty.hidden = others > 0;
    setText(el.rosterEmpty, t('emptyRoster'));
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

  function chatComposerActive() {
    try {
      const input = document.getElementById('vc-input');
      const panelOpen = !!(window.__vc && window.__vc.panelOpen);
      return panelOpen || !!(input && document.activeElement === input);
    } catch (err) {
      return false;
    }
  }

  function captureChatComposer() {
    if (!chatComposerActive()) return null;
    try {
      const input = document.getElementById('vc-input');
      if (!input) return null;
      const focused = document.activeElement === input;
      return {
        input,
        focused,
        start: focused && typeof input.selectionStart === 'number' ? input.selectionStart : null,
        end: focused && typeof input.selectionEnd === 'number' ? input.selectionEnd : null
      };
    } catch (err) {
      return null;
    }
  }

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
    const boat = window.__saltBoat;
    if (boat && boat.externalUnlocked) {
      const external = Array.isArray(window.__SALT_EXTERNAL_SPAWNS)
        ? window.__SALT_EXTERNAL_SPAWNS
        : [];
      for (const spawn of external) {
        if (!spawn || !Number.isFinite(Number(spawn.x)) || !Number.isFinite(Number(spawn.z))) continue;
        list.push({ x: Number(spawn.x), y: Number(spawn.y) || 0, z: Number(spawn.z) });
        if (list.length >= 32) break;
      }
    }
    return list;
  }

  function randomGroundSpawn() {
    if (G?.expedition?.active) return G.expedition.spawn();
    if (G?.qingyun?.active) return qingyun.spawns[0];
    const list = [];
    try {
      const start = G && G.level && G.level.playerStart;
      if (start && start.pos) {
        list.push({ x: start.pos.x, y: start.pos.y, z: start.pos.z });
      }
      const enemySpawns = (G && G.level && G.level.enemySpawns) || [];
      for (const spawn of enemySpawns) {
        if (!spawn || !spawn.pos || spawn.type === 'air') continue;
        const y = Number(spawn.pos.y) || 0;
        if (y > 5) continue;
        list.push({ x: Number(spawn.pos.x) || 0, y, z: Number(spawn.pos.z) || 0 });
      }
    } catch (err) { /* ignore */ }
    const boat = window.__saltBoat;
    if (boat && boat.externalUnlocked && Array.isArray(window.__SALT_EXTERNAL_SPAWNS)) {
      for (const spawn of window.__SALT_EXTERNAL_SPAWNS) {
        if (!spawn) continue;
        const x = Number(spawn.x);
        const y = Number(spawn.y);
        const z = Number(spawn.z);
        if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
        list.push({ x, y: Number.isFinite(y) ? y : 0, z });
      }
    }
    if (!list.length) return defaultSpawn();
    return list[Math.floor(Math.random() * list.length)];
  }

  function shouldRespawnAfterUnitSwitch() {
    if (!G || !G.player || !G.player.alive) return false;
    if (normalizeSoldier(mySoldier) !== 'drone') return false;
    const ground = groundHeightAt(G.player.pos.x, G.player.pos.z, G.player.pos.y + 1.5);
    return G.player.pos.y - ground > DRONE_AIRBORNE_CLEARANCE;
  }

  function defaultSpawn() {
    if (G?.expedition?.active) return G.expedition.spawn();
    if (G?.qingyun?.active) return qingyun.landing;
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

  const respawnAudio = new Audio('data:audio/wav;base64,UklGRkYzAwBXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAATElTVBoAAABJTkZPSVNGVA0AAABMYXZmNjIuMS4xMDMAAGRhdGEAMwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAA//8AAAAAAAAAAP//AAAAAAAA//8AAAAAAAD//wAAAAAAAAAA//8AAAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAABAAEAAAAAAAAAAQABAAAAAQABAAEAAQAAAAEAAQAAAAEAAQABAAAAAAAAAAAAAAAAAAAAAQAAAAEAAQAAAAEAAAAAAAAAAAABAAEAAAABAAEAAAAAAAAAAAAAAAEAAQAAAAAAAQACAAEAAQABAAEAAQABAAEAAQABAAAAAAABAAEAAQAAAAAAAAABAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAP//AAAAAAAA//8AAAEAAAAAAAAAAQAAAP//AAABAAAAAAABAAEAAQABAAAAAAABAAAAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAA/////wAA////////AAAAAAAAAAAAAAAAAAAAAAAAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAABAAAA//8AAAEAAAAAAAAAAQABAAAAAAAAAAAAAAAAAAAA//8AAAAAAAABAAAAAAD//wAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAP//AAD/////AAAAAAAAAAD/////AQAAAAAAAAABAAEAAAAAAAEAAAAAAAEAAQABAAAA//8AAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAAAAAABAAAA//8AAAEAAAAAAAAAAQAAAAEAAQAAAAEAAQABAAAAAQAAAAAAAAAAAAAAAAABAAAAAAABAAAA////////AAABAAAAAQAAAAEAAQAAAP//AQAAAAAAAgAAAAAAAAAAAAAA/////wAA//8AAAAAAAAAAAEAAAAAAAAA//8AAP//AQABAAAAAAAAAAEAAAAAAAAAAAABAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAQAAAAAA//8AAAEAAQABAAAA//8AAAEAAQAAAAAAAAABAAIAAQABAAIAAgABAAAAAAABAAEAAAAAAAEAAAD//wAAAAAAAAAAAAAAAAEAAQABAP//AAABAP//AAAAAAAA//8AAP//AAD///////8AAAEAAAAAAAAAAQD//wAAAAABAP//AAAAAAAAAQAAAP//AAAAAAAA//8AAAEAAAAAAP//AAD//wAA//8AAP//AAAAAAEAAQABAAAA//8AAAEAAAAAAAIA//8BAP7/AQD9/wIA//8BAPz/AQBAAEgAQQBFAEUASgBHAEsARwBIAEcASABIAEgASgBKAEcASABHAEcARwBGAEcASABIAEgASgBIAEoARwBHAEgASQBHAEcARgBHAEcARgBHAEMARwBFAEcARwBGAEcARwBFAEQARwBHAEYARQBHAEgARwBIAEcARgBIAEgARwBGAEcARwBHAEcARgBFAEQARgBGAEcARABGAEcASgBHAEUARwBHAEcARQBHAEMARQBFAEcARQBEAEcAQgBFAEUARgBDAEQARQBDAEMARgBFAEQARQBDAEQAQwBDAEMARQBFAEIAQwBEAEUAQgBCAEQAQwBCAEMAQgBBAEMAQQBBAEIAQQBDAEEAQQBBAEEAQgBAAD8APgBCAEAAPwA+AD4AQAA+AEAAQABAAEEAQAA+AEAAQAA9AD4APgA+AD4AQAA+ADwAPAA/AD8APQA9AD0APgA9AD0APAA7AD0APQA9ADsAOQA7ADsAPQA7ADkAOwA7ADwAOQA6ADsAPAA8ADwAOgA8AD4AOgA6ADoAOAA4ADkAOgA8ADoAOgA6ADkAOgA5ADoAOwA4ADcAOQA4ADYAOAA5ADwAOwA4ADkAOQA5ADgAOQA4ADgAOQA5ADgAOAA6ADgAOAA2ADYANwA5ADcAOAA5ADoAOwA3ADcANwA3ADkAOQA3ADcANQA3ADYANAA1ADYANAA0ADYANgA2ADYANgA2ADYANgA2ADIANgA2ADQANAA0ADYANgA1ADYANgAzADQANQA0ADIANAA0ADIAMgAyADQAMwA0ADQANAA1ADQAMQAzADQAMQAwADUANAA0ADIAMQAyADMAMgAyADMAMAAyADMAMgAyADIAMgAzADIAMwAyADEAMgAxADQAMQAyADIAMgAyADIAMQAxADEAMAAxADIAMwA0AC8ALwAzADAAMQAzADIAMQAzADIAMQAwADAAMAAyADAALwAwAC4AMQAwADIAMAAwADAAMAAxADAAMAAuADMALwAvADEAMAAwADAAMgAxAC8ALwAwAC8AMgAyADAAMAAwADAALgAvADAAMQAwADAAMAAwAC8AMQAxADEAMQAxADAAMQAwAC8ALgAvADAALwAuAC0AMAAxAC4ALwAvADAAMAAvAC4ALQAuAC4ALwAvAC8ALwAtACwALwAvAC8ALwAtAC4ALgAuAC4ALQAtAC0ALgAwAC4ALQAsAC0ALgAtAC8ALwAvAC0ALQAvAC0ALwAvAC0AKwAqAC0ALQAvADAALQAuACoAKwAsAC0ALgAtACsALQAtAC8ALwArACwALQAtACsALAAtACsALAAtAC8ALQAsAC0ALQAtAC0ALQArACsAKwArACsALQArACsALQAoACoALAAqACsALQArACoAKwApACoAKwAtACoAKwAsACoAKwArACsAKwArACoAKwApACkAKQAoACkAKAAoACgAKAAoACoAKQAnACgAKQAqACkAKgApACkAKwApACkAKAAnACgAKwAqACgAKgApACkAKQApACkAJwAnACgAKQApACcAKAApACUAJwApACcAJwAnACcAJgAnACkAKAAnACMAIwAnACcAKAAnACcAJwAnACUAJQAmACUAJwAnACcAJQAmACcAJQAlACUAJQAlACUAJQAjACUAJgAlACUAJQAlACMAIwAjACMAJQAlACMAIwAlACUAIwAjACMAIwAjACEAIwAjACIAIwAjACMAIgAhACIAIQAgACMAIgAhACIAIQAiACEAIAAfACAAHwAhACEAHwAdAB8AHwAfAB8AHwAfAB0AHwAfACEAHwAhAB8AHgAfAB0AHwAeAB8AIAAdABwAHQAeAB4AHQAcABwAHAAbABoAGQAcABsAGgAdABwAGQAYABkAHAAbABgAGQAcABsAGgAaABoAGAAaABkAGgAaABgAGgAYABgAGgAaABgAGgAaABgAGAAWABgAGAAaABgAFgAYABgAGAAWABYAFAAUABYAFAAUABQAFgAUABQAFAAWABQAFAAUABYAFgASABIAEAASABQAEgAUABIAEgASABIAEgASABQAEgAQABAAEAARABQAEAAQABEAEAAPAA4AEAAOAA4ADgAOAA4ADgAOAA4ADgANAA4ADgAOAA0ADAANAAwADQAOAAsADAANAAwACwAMAA0ACgANAAwACwAKAAsADAALAAoACQAKAAoACgAKAAoACAAJAAsABwAJAAgACQAIAAcACAAHAAYABwAIAAkACAAHAAgABwAIAAkACAAFAAUABQAEAAcABAAHAAYABQAEAAUABQAFAAQAAwAEAAMABAADAAQAAwACAAEAAgABAAIAAQACAAUAAwADAAMAAwABAAMAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAD/////AAAAAAAAAAABAAAAAQAAAAAAAQAAAP//AQD//wAAAAAAAAAAAAAAAAAAAAD///////////3///////3////////////////////////////9///////9///////9//3//f////3/+//7//v//f/7//v/+//7//z//f/8//3//P/5//r/+//8//v//P/8//z/+//8//v/+v/7//r/+f/8//v/+v/7//r/+//7//v/+//7//v/+//7//v/+//7//v/+//7//n/+v/7//r/+//8//n/+v/5//j/+f/6//n/+P/7//r/+f/6//n/+v/7//n/+f/5//n/+f/5//n/+P/5//r/+//6//n/+f/5//v/+//4//n/+f/6//v/+f/5//n/+//5//v/+//7//v/+//7//v//f/9//3/+f/5//v/+//7//v/+//5//r/+f/5//j/+f/6//n/+v/5//v/+f/5//n/+//7//n/+f/3//j/9//3//n/+f/7//v/+v/5//r/+//5//n/+v/6//r/+//8//n/+v/7//j/9//5//v/+//7//n/+f/5//r/+//5//v//P/4//r/+v/5//n/+v/4//b/+v/8//3/+v/7//z/+f/4//j/9//2//j/9//2//j/+P/5//j/+P/6//n/+P/4//f/+f/5//n//P/2//r/+//6//n/+//8//r//P/5//3/+//+//v//P/8//r////8//z//P/5//r/+v/7//z/+/////7//f/7//3//P/9//r/+v/7//v/+//6//r/+v/9//v//P/9//3/+/////3//v////7//P/2//r/+P/8//n/+f/3//j/+P/+/wAA/P/5//b/9//z//b/9//6//b/9v/z//T/8//x//T/7f/u/+3/7v/w/+z/6f/o/+z/7f/q/+z/8P/s/+n/6//n/+7/6//v//j/7v/0//L/8v/2//X/8P/z//H/6v/t/+3/7v/u/+3/5v/k/+v/5f/s/+f/6v/i/+n/3//Z/97/zf/Y/8b/yv+0/ykAIgDN//L/t//H/7f/wP/B/7z/uv+w/77/s/+0/7L/s/+p/7T/uP/J/9T/4P/X/9f/3P/c/+z/7//p/+X/5v/d/9j/2v/l/+X/5//r/+7/5v/0//T/AQABAAUABgACAAsABgARAAoAFgAJABQAEgATABsAFgAdAB4AGQAcADEAQgBUAFYAWABDAEIANAA5ADQANAA0ADMANQA2AEcAQAA1AC8ARAAdACoAIgAtACcAGAAnABQAQAAmACoAGAAJAAcAAwAIAAoAFwAHAAwAAwAKAAUABgACAP/////+//v///8BAP3//P8AAAcA+v8BAPP///8BAP3///8BAAgA/v8BAAEABgAAAP////8CAP//BAD//wMA/P/8/wQA8P/8//T/9v/4//f//v8CAPz/AgAKAAQAAwD9/wEA9//6//7///8AAPr/AQD9//r////+//r/+f////X/+f/0/+n/9f/0//z/9v/1//H/6P/p/+j/7f/u//H/9v/x/+z/7f/u//D/6f/o/+3/6f/f/+D/3//d/+X/3//j/+L/4//n/+X/7P/t//L/9P/q/+j/6//n/+L/4P/n/+3/7f/l/+j/8v/s//D/8f/s//P/6P/h/+X/5v/q//L/+f/y//X/8v/x//f/7//1//r/+P/4//b/+//3//X/AQD8//L/9v/5//L/5v/x//b/9v/4//X/+f/y//P/+f/3//T/9P/2//H/7//7//3/+f/+//n/8//t/+//7//0//v/8P/z/+7/7f/4//b/+//1/+7/9P/y//H/8v/y//r/AAD4//T/AAD6//T//f/2//v//P/7//7/+P8DAAIAAAABAP3/AwD//wEA+v///wMAAQAFAAEAAwADAA0ACgAIAAMA//8IAP////8EAAQAAAABAP//AAAAAAIABQD//wMAAAD9/wcABgAHAAAAAgAHAAIAAAD5/wEAAQACAAMA/P/+/wMABQD///3//v/5//v///8BAP7///8JAAMACAADAPz/BAD///v/+//5//r/+v/5/wEA/f/5//v//P/7//v/AwADAAEA/P/z//P/AAABAP7////+//////8FAAYABAAAAP7/AgAFAAgAAgACAAMABwAEAP7/AgADAAgABwAHAAEA+////wAABQD/////AwAEAAkABwABAAEACAAEAAkABAAFAAYA/f8LAAYABgAGAAMABAADAP///f8AAP//BQACAAkAAgD///r/9/8AAAAAAQABAAEAAgAFAP3/AAAEAAAA///+//b/9P/4/wEAAAD9////+f8AAPf/+f/3//P/9v/v/+//7P/1//b/+P/9//j/7v/w//j/9v/2//P/9/8BAAEAAwD9//z/AAD9////+P/3//b//f/9//z/AAD+////+P/5//b/+f/7//7//v/3//z/8//3//P/9P/9//b/AwD4//v/+f/2//3/9P8DAPT//f8CAP3//v/t//j/7//1//X/6//0//X////5//j/8//0//7/7v/3//P/+P/5//P/+v/4//f/9P/7//L/9v/v//T/+v/1//X/9/8BAPr/+f/4//b/9//9//j//f/6//b/7//x//3/8//2//j/8v/5/wIA9v////3/+P/7/wAA+v/6//7/9f8CAP3/9f/+//7/+P////b/9//2//j////9/wMAAAAFAPb///////3//f/2/wAA////////AAD//wcA+f///wgA/f/7//3/AAD9/wMA///7//7//v8AAP///f/9/wAA/P/7//3//v/6//f/+P/0//n//f/+/wAA+//z//3////2//7//v///wAA///8/wAAAQD9/wIAAQAAAAQA///7/wQAAwAKAAUA/v8CAAAAAQD7//z/AwAAAP3/AAD//wEA//8DAAUAAAACAAEAAAD8/wEABAABAP//AQD+//v////3//z/AAD8//b/8f/2//b/AQD8//z//v/7//v////7/+z/8//w//L/+v/3//z//f/4//v/8v/3//r/7v/0/+j/7v/z/+r/6v/w//f/9//1//b/9v/t//f/+f/1//X/9v/x/+7/9P/v/+3/8P/1//P/8//5//L/6v/0//r/8//2//T/8v/9/+7/7P/4//T/9f/6//z/8v/w//T/8v/0//T/8v/4//P/7//7//H/9v/6//H/+f/0//n/8//4//7/8//3//n//f/y//r/AQD6//b/AAAFAPr//v/6////+v/+//r/9f/7//T/+P/2//r//v8BAP////8EAAMAAgACAAEAAAAAAAQA///+/wQA+/8BAAMACQAMAAEABgAGAAgABQD//wIAAAD7//f//f8AAP/////5//7//f8CAAcAAAABAP///v/9//z/+P8AAAYABAAMAAEA//8DAAAA/v/7//7//v////3//v8CAAAAAQAEAPv/+f/7//v////6////AQADAAIA/f8FAAMAAwD9/wEABwD5/wIA//8BAAoABQACAP//AAAHAAkA/v8AAAAABwD+//r/AAD8/wMAAgAAAP//AAACAAEA/v8GAAEAAQAEAAAA///8/wAAAwABAP//AQD2////9f/2/wAA+f8AAAAA/P/z//v/+P/6//z//v/+//X/8//x//r/8//0//X/+//3/+//9//z//T/9P/x//X/+f/1/wIA/f/w//r/+//0/+//+P/1//r//P8DAAUA8f/v//P//P/n/+3/9v/7//z/6//5//P//f/4//z/+v/v//j/+f/7//X/AgD6//T/7//x//f/8f/8//b/+v/3/+r/8P/5//b//v/4//T//f/u//v/+v/5/wQA+f/4//f/9//4////+//8//P/+f8AAPz/+f/0/wAA/v8FAPz//P/6//r/+//2//v/7/////7/AQD5//D//v/6//f/9f/0//f/9v/2//f/+P/5//v////3//j/8v/1//3//f/6//v//P/9/wMA+v8CAP///v/8//z/AQD4//v/BQAHAP7/+//+/wAA+////wAABQD+////AwAAAAkAAgADAP//CAAFAPn/CgAFAP//AQD5/wIAAQD8///////+/wEABAD0//3//f/6/wAA/v8FAP///v////n/8//3////AAABAAEA///7//3/+//+//z///8BAP3//f/7//z/+f/7//b/8//7//X/9f/6//v/CQD///X/AwD3////BgACAP//AgD4//b/AAD1////8v8AAAAA+P8AAPH/9f/z/wEA+f/x//D/7f/2//z/+P/2//f//P8BAPr/AgDu//z//P/0//z/8f/9//X//f/5//r/9////wEA+v8HAPf///8BAAIAAgACAAEAAgAEAP//AgAGAAQA9/8EAAcAAgAJAAEA///9//j/BQALAAgABAAKAAsAAAADAAEA/v/5//7/AwD7/wAA/f8AAAcA//8DAPv/9f/9//r//f/1//f/9//2//z/9//6//3/+//4//X/7//2//X/8//0/+j/6v/0//r/9f/0//z/+f/t//T/9P/u//n/9//4//j/9//x//H/9f/w//L/8f/1/+v/7P/v/+//6//y//H/6f/z/+//8//0/+//5P/0//n/+f/1//r////u//X/7P/z//f/+f/4//n/+v/9//f/8//6//b/+f/v////AAD8//P/6f/v//f/9P/x//b/9P/7//b//P/4/wMA+P/x//n/9//y//L/+//w//b/9f//////+//5//v/+//z//3/BAABAAEAAAD2//v/9//6//P/+f8CAAIABwADAP7//v8EAAAA+P/1/woABQD7//z/AQD///n/BQACAAIAAgAMAAsA/v8AAP//AQABAP//AgACAP7//f/9//3/+f/3//z/AwALAAoABwACAAEACQAEAAIAAwAGAAYACgAGAAYABgD7//7/+/8AAAcAAgAGAAcABQAFAAIA/v/+//3/9//5////AAD9//v/+f//////8//5//v/BAABAPb/+P/z//n//P/+//r/+f/5//b/AAABAPv/AgD+/wAA/v/4////AQD+//b/+P///wEA/v///wAA/v/+//P/9v8AAPD/+f8AAPj////9//b/+f/3//v////3//3/8//7////8//x/+n/+f/y//D/+v/v//b/9P/t//b/8f/6//n/9//6//H/8P/w//7/9//1//X/8P/3//v//f/1//T/8v/t/+3/9P/4//D/8//v//P/9P/w//z/+v/+//T/+P/1//H/9//2//b/8f/8//b/+f/3//v//v/0//7///8DAAAA/v/+//T/9v/3//b/+v/x//f/9//z//j/7//1//7//f/+//j/8P/0/wUACAAFAAAA+P///wAA/f/2//7/AgD+/wYAAQD///n/AAAAAPv//P/+//v/+P8GAAMA//8FAP7/AAD8//b////7//v/+//4//X/+v/7//r/9v/u//f/8//6//b/6f/3//L/9v/6//X//v/7/////v/+/wAA//8AAPn/+P/2//3/+v///wAA/v8AAPz/BwADAAAABQAHAPn/+/8FAAAAAAAEAAAA+v///wcACwAIABMAEQAMAAgAAQAIAAoAAQACAAUABwAQAAoAAgAKAAcA/v8DAPb//f8CAAAA///7/wQAAQD5//v/BgD+/wIAAQD1//T/9v/1//L//f////v//v8EAPv/AAD8//D////8//X/+v/v//X/+//9//7/9v/1//b/8//w//3/8//z//v/8f///wIA9v/1//X//f/2/+7/+//4////AQAAAAYA///5//3/+v/z//L/8f/3//r//f/6//T/+P/4//L//f/9//v//P/3//X/8/////r/9f/1//n/+f/4////9P/8//7/7v/5//f/+P/9//L/+//7//T/9//y//T/AgD+//b/+f/3//j/+//6/wAA/v/5////AgD6//b////+/////v/+//z//v///wMAAwD3/woAAwD6/wkAAAD+/wMA/v/+/wUABQD//wYA/f/7//3/+P/5//n//P/7/wYAAAABAP//+f///wIA/P/9//z/9v/+//X/BQACAAIA+f/7/wQA+f8NAAgAEQAMAAAA+v/0//v/+//+//7/AQD9/wQAAAAEABAA///8/wAA/v/+/wEA/f8BAAcA+/8AAPz//f/9//D/8v/6//7/AAAJAAIACgABAPb/9//5//7/9v8DAAMA9P/2//3/AgAEAP7/BQAKAAsACAACAAcACgABAP///f/8/wMA+//0//T/7v/v//7/+P/9/wMA+//7//j/9P/z//f//P/0//7/BgD///r/8P/9//P/+P/7//r//v/x//H//P/+//L/7f/t/+//6v/1//D/+//3//v/BgD6/wQA/P/+//n/9v/q//X//v/3/+3/9v8JAPz/+v/1////+P/7//j/9//6////AAD1/wAA9f/8//P/8v/+//7/AgD7/wAAAgAAAPf/+P/9/wEA///u//X/AQABAPf/AQD///b/AQD5/wIA9//0////CAAOAPz//P/+/wMA+f/z//j/8v/7//7//f8CAPz//f8AAPP/8f/2/+3/8P/x//f/7P/l/wAAAwD+/wAA/v/8//v/7f/3//H/7//2//7/DQACAAoACwD7/97/9P/+/+//6f/3/wgAAQAKAP//AAD7//L/9P8BAPn/+P8DAAYAAQD+/wkA/P/1//3/AgD6/wMAEwAQAAwAFwAeAAgA//8KAAIA9//+/wAABQAEAAMAGQAiABAAAAD6/wEA9v/w/+3//P8OAAgAFgAWAAcA+P/6//H/8P/z//j/BQAHAAsAEAAXAAMA/P/4//L/6//k/+v/AgACAPT/AAANAA4A9f/9/wYA6//2////BAAbAAkADgANAPr/+f/o//b/+//v/+7/+v8RABYACwAPABEAEwD6/+P/3v/n/wEA7//y//7/BAAGAAAA8f/y//3/5f/m/+7/9v8GAAcADgAQAPn//P/x/+r/5v/Y/+H/6v8AAP7//P/4/wEA/v/s//T/9P/v//X/9f/x//z/8f/2//r/+f/8//P/AAD8//X/+f/z//v/+P/3//P/8f/4/+v/8P/h/+X/9v/r//b/AQADAAoACgAFAAgABwD///j/9v/w/wEAAAAAAAcACQAQAAAA//8GAAcAAQD5//j///8DAP//AwAMAAAA8P/y/wEABQAEABIAEAAVABMADQAEAP//+v/z//r//P///wkACgAGAAoABAD5/+f/8f/r/+P/+f/0//n/BwALAAIA+f/x//j/8//u//D/8v8AAPj/8P8BAAMAAAD//wEACwD0//H/9//8/wAA///5//z/AQD9/wgA+f///wMA/f/7////AQD9/wkACwACAAAACQAJAAIA//8KAAwADAABAAsACQADAAsADAAMAP//BwD9/wIACAABAAkAGQASAA4AEAACAP///v8CAP//CQAHAAEABQAFAAAA//8CAAEAAgD///f/+P8AAPX/AAAJAAcAAQAHAAsABwD///r/8P/u//L/7v8CAP7/+//7//r/9P/s/+//8v/0//j/9v/8//f/8P/0/+n/7v/n/////f/1//b/8P/y//D/+v/r/+//9P/y/+b/6P/m/+L/7f/2/+r/5f/s//X/+P/u//T/6//8//L/8P8BAPz/AwAAAO7/+P/+//j/AAD6/wQA/P8FAP//+v/8//b/9v/z//r/+//6//n/BwAEAAQA/f8AAPr/+v8BAPr/+v8DAAEAAAASAAgABQACAAcAAwD///v//v////r/+f/y//n/9/8BAPj//v////f/8v/4/wAAAQD///z/BwAAAPT/8/////r/AQD7/wQAAQD5/wMAAQAEAPr/CgAHAAMAAQAEAP//+f8LAAQACAAHAAIABAABAAgABwAIAAUABQAVAAsAAwD///n///8BAAEABwADAAUADQADAP//AgAIAPz/9f/z//L/+v/1//X//v/0//f/AQDw//D////7//D/+v/8//3//P/2//H/8P/z/+//+P/y//T/+P/7//X/8P/v/+z/8P/o//b/+//2//X//f////L/+v/+//7/8f/q//H/8//3//T/+v/4//X//v/4//v/AgACAAkAAgD8//X/+f8DAAEA///9//r/+/8AAPX/AgAJAAgAFAAIAAkAAAD8/wMAAQACAAMABQAEAA0AAAD2//7/8//0//T/6//2//b/+/////D/8//s/+n/7P/r//T/9f/+//j/9//3//r/+//x//f/9f/4//P/+f/2//f/+v/6//7/9v/1//P/AAD5/wAA/f/0//j/+P/y/+/////4/wcA/f/9/wcAAgAJAPr//v8FAAEA/v///wAAAQABAAcABwACAAkACAAKAA0ABgAKAAMA+/8DAAUAAwD//wUA//8EAAcA//8AAP//AAAAAAEAAQD///z//P8GAA0ACwAGAP////8BAPr/+/8HAAcAAAAFAAsABgAEAAoA//8KAA0ABQAGAAAAAgD6//j/AAD2//f/CgD+//z/AwABAAgABQD//////v/5/////f/8//v//f/+//v/+v/8//z/AQAHAAAA8v/x/wYA+P/3//n/8f/2//f/+P/5/wEA+P8AAP7/8f/4//j/9P///wIA/P/9//f//v/+//z/+P/8/wAA9//u/+z/9P//////+P/+//3/AQD7//n/8P/p//n/+v/+//f//P8BAPv/+f/1/wkABwD4//f///8HAPv/8v/z//7/+//1/+T/6v/0//H/9//q//T/8P/1//r/AQD7/+7/7v/z//v/6P/1/+v/+v/9//j/CQDz//n/+f/7////+P/z//z//P/7//3/9v/9/wAA/P///w8AAgADAAEA9//9//H/AgAEAAgADwADAAgA/P/+/wMA9v/+/wMAAAAGAAEA//8DAOv/7//+/wIABwAAAP7/AAD//////f8FAAsAAAD+/wAACQD9//v/CgD+/wIA/v///wYAAAADAPr/AgAFAPj/AAACAAYACAAEAAIA/f8AAPn//v8CAPz//f///wIAAAADAAAAAAD///T/+v/7//j/+v////3/AwABAPz/AAD5/wAA+//3//v/+P/6///////9//z/+//9//3/AAD6//z/+v/6/wAA/v/6/wIAAADy//n/AAD5//X/9v/4////+v/+//f/8//+//P/7P/6//f/6v/0/////f/4//r/+//7//X/8//3//r/9P/2//b/+/8BAAEABwADAAkA/////wEABgAIAAAAAQACAAEAAgD0//T/AAD7/wUABgAKAAwACQD7//7////9/wIAAAAGAP//AQAIABYADgAGAAYAAgD6/wMAEQADAAsACgD9//z/AQD8////+//9/wQA/v8BAPv/9v/2//v/AwACAPf/AQABAPj/+v/5//j/8P/z//f/9v/6//n//v/3//v/BQD8//T/7f/1//T/+f/6/+3/+//6//b//P/8//v/9P/1//n/+v/u/+z//P/4//f/9v8AAP3/+P8AAP//BAADAP7/+P/0//j/+P/4//L/6f/s//j//P/6///////4//b//v/5//X/+f/9/wEA+f/3//b/+//y//n/+//1//j/8P/0//j/AwABAPj/+f/z//b/9//4//H/8//8//L////6//f//f/y//n/+//z/+7/9v/w/+3/6//z//b/9P8AAP3/9P/s/+7/+P/1/+n/8f/5//f/8f///wAA+/8DAP//AAD2/wAAAgD6//n/9v///wAA/v8DAP//+/////f//v/+//T/+f/6//3/AwD+//r/EAAPAAMAFAALAAEACgALAAUA/f8MAAsABAAJAAEACwAHAAEA//8EAAcABAANAAQABgAGAAUA/f/5//r/AwALAAAAAwAGAAMA+P/6////AAD4//r/AAD///3/+f///wQABAACAAAA//8DAPj/AgABAAkADAAKAAcA/f8HAAMABwD7//z/AAD9//3///8CAP3/AgAEAPz/CAAHAPr/AAD6//3//P/+//X/+f/5/wEA+f/x//z/9/8AAPr/CAAMAAIA8//u//j////6//b//P8AAP7//v/8////BwD1//b/+/8BAP7//P/9//v//f/4////BwADAAIAAwD7//f/6v/2////BQD9//n////8////9v/1//f/9v/5/wUAAAALAAcACQAZAA8AAQADAAQA/f8FAPX/9f8DAAgABwAJAAsABwABAOv/7//8//P//P8FAAMACwAMAAQABgAKAAcABgD///b/9P///w0AEAAHAAIA+v8DAP//+/8CAPX/9P/m/+r/8f/x//P/+/8BAPX/8v/t//j/AAD0//L/+f///wUA///+//z//f8CAP///P8BAAIACAAOAAgACAAEAP7///8AAPv/AgD+/wQAAwD8/wAA8//v/+v/8f/5//v/AwAAAP///P/9////9v8HAP7/AwAKAAkACwDv//H/8//2//T/+v///wgADwD+//3/8P/v//X/6P/s//D/7v/q/+n/9f/6//r/9f/6//j/+P/3//n/9//x/+//8P8FAAMACgARAAwACQANAAUABAD///L/7f/q//b/6f/t//f/7/8AABIACAANAAUA+//w/+3/6//p//n/+/8UAA8ACwAUAAgAAAD4//H/5P/e/+f/8P///wYAEgAZAAQACQALAAIA/P/3//f/9v/5/wkACgAUACUAFwAgABYA///y/+f/7//s//b/+f/2/wcADwAYAA8ADAAFAPv/9P/w//b//P/+//P/AAACAAsAEQASAAsA8f/j/+L/3//c//H/7////wwABAAFAAYA/f/4//b/8P/z//v/AQAGACEAIQAeACMADgAKAAYA/v/6//L/9P/s//X/BQAMAA4ADAANAAAA+f/x//f/8v/y/wIACAAKAAkAEQARAAwACwAFAP///f8BAPj/8P/8/wMADQAIAAgACgAHAAYABwD4/+f/6f/m//n/AAAAAAUACQAFAAQA/P/3//L/4v/n/9j/4P/s/+f/6//z/////v/8//v/9f/o/+//+v/x//H/9f/u//L/+f/u/+z/8//0//b/+v8DAPf/9P/7/wIAAAD7//3/+f///+3/6v/2//P/+f8DAAYAAgD1//b/7//t/+v/5v/4//P/9f8BAPv/AgAHAP3/BQD//wMA/f/+/wIA7f/8/wMABAD8/wgADwACAP7/BgAJAP///v/+/wYABAANAAUAAAADAPv/9v/0////AAADAAQABAAOAAoACgANAAYAAwAIABIACgACAAwACAAHABIAHgAmABYADgAXABcACQACAAYABQD7//j/BAAGAAgA///5/wIABAAGAAMA9//6//f/8v/z/+//9P///w0ADAAXABQACwANAAcAAwD7//3/AQABAP///f8CAAQACQARAAIAAgD///f/8P/p//j/9f/9//3//f8IAAYACAABAAMABQD7/wQAAwD+/wwAEgAGAAYACAASABYADQAPAAgADwD7//n//P/8/wIA//8AAPb/AgACAAcAAgAJAAYAAQAIAAQAAwD7/wMABQAAAP3/BQACAAYAAQD4//r//P8DAAYAAwD9/wEA9//5//7/BgADAPz/AQD9//v/8//6//n/+//2/+3/+P/1//P/7f/n//H/9f/1////+//w//P/9v/t/+f/8P/p//f/BQAKAA0ABgABAPv/AADt//H/9/8AAP//9//6//X/BAD9//7//f/+//3/9f/2//n/AAD5/wEA/v/8//X/6//8/+//9P///+b/6//y/+///P/5//f//f/y//j/+v/9/wAA/P/9//T/9f/3//z/+v/5//P/AQD///n/9v/2/wIA+/8IAAMAAAD8////+f/z//b/6f/y//P/+P/v/+j/9P/0/+//7P/w//r/+//9//n/9//4//T//v/+//r/8P/0//b/+P/1//r//f8CAAsA/v8LAAIADAAHAAIACQD7/wYABwASAAcABAAGAAIAAQAAAAIAAwAEAAAA/v8CAA0ABgAIAAMADgARAAQAEAASAAoAAwADAAcACgD///3///8BAAEAAwD+////BQD//wcABQAHAAMAAAAGAAAA9P/0/wIAAQAEAAcAAQABAAAA//8CAPz/AAAEAAUABQACAAkAAQD+/wEA/f/+//P/9v/5//v/AQD///j/+f8BAAIAFgAQAP7/BwD9////AwD9/wEA9v///wEAAwAEAPr/+//6/wsA/v/y//j/9v/y//j/AAD5//j////+//3/BwD1//f///8CAAAA+/8NAP//+//+/wEAAgAAAAUAAAAGAAMA+/8KAP///v8KAAEABwALAAYABQAHAAIA/f8EAP//AQALAP3/AAADAP//CgALAAoABwASABkAEwAJAAIABwAHAAUAAAD9/wAA/f8CAP//BAAIAAAAAQD4//v////6//j/+//9/wMA/f8GAAsA///8//f/+v/v//n/7f/3//v/8P/8//X/+f/z/wYABQD7/wEA9f/5//v/+v/4//n/CQAAAP3/+v/6/wIA+f/6//L/7//x//L/7//x//H/+f/8/wEAAAD1//r/7v/7//T/+v/7//r/BAD0//n/+P/0//X//f/5//X/+//5//b//P/6/wIAAwD4/wIA+/8AAP3/9P/5//r/9f/2//L/8P/2//3/+f/2/wkA///6//r/+f/0/+z/7f/u//f/9f///wEA///9//j/BQABAPr/AAD//wMA/f8AAAQA+f/7/wMABwAGAAcACAAHAPr/BwAKAAIABQD7/wUADAABAAEACgABAAQABwAPAAEA+P8CAP///P/2/wcADQABAAkADgAHAA0ACQAFAAQAAQD7/wEA//8CAAcA+/8AAAAADgAUABQADwALAAkAEgARAA8ABwABAA4A/P///wEAAAABAAUAAQABAAEACQAJAPr//v/8//r/CQABAPP/AgABAAQA/P8BAPn///8AAPz/+f/0/wcABAAQAAUACwAKAP//AgAHAAIA/v8GAAwACwD7/wMAAwAFAPr/AwAMAAwACwADAAAA/f/8//X///8AAP7//v8FAP3/8//4//z/7f/y/wEA/f8BAP///f/z//v//v////n/+P/5//f/+v/s/+7/6v/j/+//9v/v/+v/5f/r//H/7f/l//b/8f/u//L/8P/6/+7/9P/1////8f/r/+7/7//s/+P/6P/p//f/9P/x//D////0//T/8P/0//X/6//1/+3/+f/z//P/+f8AAPH//v/8/+//+v/2//v/7P/1//7/+//2//f//P/1//X/AgAEAAMA9//x//X/9v/4//b/AAD0/wAAAQD8/wEA/f8AAAAACAABAAIABwABAP3/AQAKAP//+v8EAP/////0////BwD7/wEA//8DAAYABAAAAAAAAQD+/wIAAAD5/wAA/P8FAAQAAAAEAPj/BAAGAAwAAQACAAcABgAPAAkAEAAIAAgACQAIAAEA/P/7/wEACgALAAcAAwAKAAIACgAMAA4AFgABAPX/DAAMAAcAAwACAAwAAgAGAAMACAAGAAMABAD5//z/AwALABIAFAAMAAwAAgANABEABAARAAgAFQAXAAsADgADAAcADAASAAkAAwD//wUADwAIAAkAEQATAAkADQAEAA8ACgAJABYAEAAeAAwADAARAA0ADQD//wkABQAEAAkABQAQAAoACwATAAoACwAOAPr//P8KAAMACQAGABAADwD+////DAAJAP//AwD9//3/AAD8//z/AQABAA0ADgANAAwAAgAAAP//BAD+////AgD//wAAAgADAAIAAwD5/+///P8AAPP/8P/3//j///8HAAIABwAEAAIAAgD6//z/7//s//v/9v/y//P/AAD7//7/AAD4/wAA8f/w/+v/8f/2/+//6f/z//n/7P/u//L/8P/n/+T/6P/r/+v/7//r//X/8//t/+r/9v/2//b//v/1//7/9f/2/+r/8P/3//L/+P/1/wAA+f/6/wEA+P/0//r/9P/1//v////8//j//v/7//z/AAD2//v//P/3//L/9v/3//D/7//r//n/9v/4/+3/5//x//b/8f/s//n/8//y/+//8//3//f/9f/y//L/8v/4//3//P////3/+//9//v/+//4//3////9//T/9//2//n/AQD7//r/+//9/wAA+P/5/wEA/f8AAPr/AgD///X/AAAEAAEA/v/8//v/AgABAAMABgADAAAAAQABAAAAAwABAAcADQAHAP7/BAAOAAUA/P/+/wcABQD//wAA//8FAAUABQAAAAEA///+/wIA//8BAAAABAABAAIA+//8/wEAAQD///r/AQAAAAAA/f8BAAMA/f/6//v/AAABAPr/+v/3//b/+P/3//v/+P/y/+3/9f/z//P/8P/x//L/7v/z//H/+P/1//X/9f/2//f/+P/6//z//v/6/////v/5//f////+/wIA/f/4//7/AQD+//n///8AAP3///8BAP7/BQACAAEA/v8AAAIABAAGAAAAAAD9//7/+f/9//7/AQD+//r/AgABAAEA+v8DAAQAAQAFAAkADgAJAAsACAAGAAEAAwAJAAUABgD//wIAAQD//wEAAAACAP3//v/+/wAA/f8AAAAABAACAP7/AAAAAAEA/P/+/wEACAD7//3//v/+//n/+/////3/BAD3//////8DAPD/BgAJAPn/+P/5/wkAAAAEAA0ALQAcAAYA1/+t/5v/4/8nABcA6f/Z/xwAPAD+/67/4/8gAAgAkP/J/wEAQgDg/27/9f+bAPX/qv5+AMoAfv89/0sApABh/5D/EgA+ALz/0P/6/yIABwC7/+f/JgAXAKv/1/8uAAkAq//0/yIAGgDd/+T/FAARAO7/z/8LACIA3/+9/w4AHwDm/8X/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LwAgABkAEwAjADUAKQAUAAIAFAATAAYA///w//3/CAANAAsABwD2/+7/5f/i/+z/7v8EAO7/9v/u/9H/1//N/97/6f/u/+D/0f/H/8v/0f/W/9//7P/g/9//6P/P/+n/3f/z//f/8v8FAOr/+P/0/wwADwAAABIADAAFABQADAAQACIAHQArAB0ADQAWAAoACQAVAB0AKwAtACoAFQAAAAUAJAAmACgALgAZABcABQDt//X/BgAWAC8AHwALAPn/9v/9/wAAAAAQABQA+v/s/+P/7v/u/wEA9v/w/93/5f/m/8j/1P/c/+r/8P/1/9f/4v/j/+D/3//e/+D/4P/k/9j/0v/L/+P/9//6//P/9v/m/+//5P/r/+//9P8KAPH/8//s//P/6v/v//X/7P/q/+r/8f/8/xAADwABAAQA9f/v//7/BgAaABkAKAAgABoADwAYABsALgA9ACwALQASAB0AHAAtADYALQAiACcAIwAiABQABgAMAAIAEgAGABcACgAFAAEA8v/4/+v//P/x/+v/7P/t//r//P/4/9v/1P/S/9P/+P/+/wwACADt/9T/0v/g/+P/9////wAA9v/y/+D/4//2//3/AQAFABMAEQADAAAABgACAAkAFAAcACkAIwAUACEAGgAgADEAMgA0AB0ALgAsACkALAAhACsALAA+ADMALgAtADQAPwAnACMALQA5ADwARQAxACQAJAAjACYAIAAcAAwAIwArABkACAD9/wQACgAWAA0ABQAFAPn////2//f/8f/2/wgA/v8DAAYAAwDk/+T/1//Z/+T/5P/t/+z/8P/Z/97/4f/s//n/9P/n/+r/6v/p/+P/3//l/+7/8v/m/+7/7v/4/+7/9v/6//v/7P/m/+//+P8CAPf/BgD1/wAAAgD+/xAAEQAVABUAAQD//xEAEQAbADAALAAjABkA/f8HAAMABwAVAA0AEwALAAMA+//5/wAAAAAGAPr/7//0//f/5v/o/+j/6f/9/+H/+//u//f/6v/L/93/zv/j/+f/8P/q//L/4f/X/83/1//h/9//6v/Y/9z/2//n/9b/1//B/8n/3v/Z/+T/2v/n/9z/3v/i/93/7P/t//H//P/v/+j/8v/9//n/BwAKAAkAHAACAA4AEwAMAAkABgAcAAYAHQAnABUAHQAKABkAHAAUABoAHgAdACAACQD8/woACAAOABAABwAJAA8A9//5//f/7P/w/xAAAgAJAAsA8P/s/9X/AQDs//r/CAACAP//5f/x/+f/AAAJAAYA8f/m/+n/8//5/wQACwACABYAAAD2/wAA/v8aABgADAAHAAcAAAACAP3/BQArABoAIgAUABUAIgAdACIAEwAgACUALwAoABcAFwAkADAAMAAlACQAFgAUACMAJgAeACwAIAAcACkAFgAbABEAJwAfACgAGQANABoAEQAUAAUADAAWACAAGAAJAAQAIQALAAsABAADAA4ACAADAPf/DgD+/xEACQD+//b/+f8CAAgABwAKAAEA9/8FAPr/EgAWABoABwACAP//CQAYABQALAAnABIACAD9/wkAEAASACMAHgAhABMABgALACwAJQAgACYAJQAhABIAAgAHABgAGgAlABAAEwD6//3/+f/9/wAADAAYAAMABQDk//X/9/8AAO//4//i/9P/6P/h/9f/0f/R/9z/y//G/9v/x//T/9P/xv/F/7//zf/N/7v/xv/F/8z/zf/g/93/xP/Y/87/4f/d//H/6P/l//n/3P/W/+n/6P/n//3/9/8FAPP/7P8AAA8ABAAGAAAAAAANAAEADAAKABAAIAAeABkAEwAPABcA/v8CAAYABwABAAsAEwACABgADAAYABIACwAHAPr/9//w//X/8f/2//X/7P/w/+3/5//x/+L/7f/z/+f/6//0/+7/8v/9/+X/9f/u//T/+//1/w0A+f8DAPP/9v/+//z/GwABABIAEgACAAcAEgAVAP//AgAFAA4AAgAOAA8AAgAUAA4AGwAXABUAGwAhACYAHAAYABMAMAAyAEEAPwA6ADgALQA1ADQATQBCAEwASgA+AEEAPwBCAEIATgBMAEwAOgBAAEIAQABRAEEARAA+AD4APAA7AEwAOwBVAD4AMQA4ADEAMwApADoALgBCACMAGAAlABgAFQAPAB4ADAANAAMA/v8KAP7/AQD8//r/AAD8//j/+f/+//b/+//7//z/BAD1/+v/4//x//3/9P/2//D/9v/q/97/z//Z/x8A/v/3/+z/9v/2/8b/9f/g/+3/+f8DAOb/5P/o/83/AgACAAwACwAOAAAA+v/r/wUAFQADABIADAARAPX///8AAA4AEAAHAAMABAABAOL/6v/r////+P/t/+X/4P/g/9//4f/e/+v/4f/X/9b/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1P/B/73/uP+t/8L/x//A/8b/uP/M/+P/7//1/woADgAIAAYAGQAeACoARAA/ADsAJAAsADwAPgAvAC8AIwAUABgAHwAXABMAKgAfABsA//8JAAUAAwAkACUAMwAuADQAOQBCAD4AOgA9ADgANgA4ADIAFAANAA0ADwAOAAwAEgD6/+//+v8HABUABwADAPv/7//k/+3/9v/n//v/9P/q/+b/5P/v//n/BwD4/wAA/v///wAAAQAXAAkABAD///v/6//a//D/7v/g/+P/3//Z/9b/3P/Y/9f/7P/q//b//P/3/wkABwAkAC4AJwAtACEAMQA3AEEAQwA3AD4ANwA8AEAAPQAqACEAIQAWAB0AFgAXABgADAAKAAAA/P8MABsAHAAhADUALAALABcANQA2ADcALAApACwAIgAeAA4AGAARAAcA/f/u//v/AgAHAPz//v/t/+v/7//1//f/8f/5/9n/9v/0/+H/6f/s/////v/+/+r/6//4/wQADQAUAAwAFwAEAAUAFQD2/xsAAgAGAAIA7/8FAO7/+//v//n/AwD5/wYA/v8AABYAEQAHABYAFwAVAA4ADgAmABwACgAgAB0AHwAhABgAGgD+//7/FQAKAAUA+P/e/+n/3//I/93/3P/c/+P/4f/n/9z/8P///wUA//8FAAgA/P8GAA8AGgALABAABQAOAP3//v8OAPf/DQAGABMAJgAeAAcAFwATAP3/CgAPABMABQAKAPf/+f/u//D/BgD//wUA8//s//T//f/8//L/BQACAO7//P/0//T/6v/l/+r/1//X/9r/3//Z/+3/4f/O/+H/4v/n//D/8//7/wIA+/8BAAEABgAVABEAFgAFAA4AGAAHABkAEwAVAA8ACAANAAAAAAAAAPn/7//v/+7/9//t//L/7P/t//X/8f8DAPL/+f/7//3/AwAFAAYAAAACAO//+v8EAAUADgAIAAIACAAAAP//CgAJAAMAAQAMAAUAAQAEAP3/9v/8//7/7v/x//L/8//w/+P/6//u//X//f/u//P/8f/o//j/7f/y//j/9P/9/+n/7//v/+7//P/w//P///8JAP7/AgAHAAoAEAADABMAHAAdAB8AJQAbABUAGQAeACEAGgAiABgAIwAfABkAEAALABAABQAFAAEABAD+////+P/9//z/8P/7//X/9/8BAPn/+v/6//L//f/7//z/+v/y//X/+P/y//b/AQAEAAQA/P8AAPz/+//5/+7//P////3//f/v//T/7//o/+//8f///wMA+v/3//b/+P/5//X/+v/v/+3/8f/o/+j/8v/4//L/8f/t//L/8v/8/wEA+v/5//b/9v////z/+/8DAAcAEgAIAAkABAAKAA4AEQAPABAAIgAjACwAGAAUABoAGAAgACoAHwAZABoAGwAaAA8AGwAcABEACwARABMAHAAWAA4A///5//r/+/8BAPv/AQAAAAAA7//m/+v/8//q/+7/+P/2//L/7v/w/9//6v/x/+//6f/j/97/5f/q/+b/4f/X/9f/3v/f/9n/3f/W/9r/5//q/+H/5P/o/+v/5P/l//H/9P/8//v//P/o/+//9//+////9//+/wEADAAOAAMABgARAAUACQD7/wkABQAEABIAEAAVAAcADwASABoADgAUABEACwAQABcAHAALABMAEgAUAAkAEAAXABIAFwAZACUAJQASAAQABQABAAYADQAPAAEA//////f/+//7/wIAAAAFAPn/+P8AAPn/+v/0/wEA9//x//X/9f/3/+z/+f/7//D/7P/w//X//v/z/+//8f/o/+P/6v/x//D////u//r//v/0//z/9f8BAAUADgAKAAcAAgAIABcADwAUAAwAAwAHAAcACwAFAAMABAAEAAkA//8BABAADAAIAAgAFAAUAPv///8TAA4ABwD///7/CAAAAP7/AAAMAAMA/v/+//f/AAALABkADwARAAAA//8BAAoADAACABEA/f8IAAQA//8BAPb//f/9//n/7//v/+3/+f/5//X/+P8AAPz/+P/+//X/BgD9/wAA/f/w/wgA+f/2//L/8//z/+r/+v/y//b//f/y//b/9//0/////P/6/wIA+P/8/wIABgALAAsAEgAEAPT/+P8KAAkAAwAHAPz//f/6//P//v8AAAEACAD//wMA+//5/wEA/v8HAAYAAAACAP3//v8AAPf//P/1//T/7P/u//r/7f/2//f/9P///wUA/f8DAP3/9v////r////1//b/AQABAPv///8IAP7/AgAAAPj/AwD7//n/+v/3//b/5//k/+b/5//i/+D/4v/l/9v/2//k/+b/7f/m/93/4f/h/9z/6f/3//X/8//4//n/9v/w//r//f8DAAMAAAAGAAAAEgAHAAYACgAFAAUACAAJAA4AFwAQABEABwAQAAoADgAQAAoACgAFAA0AAgAMAAwACwABAAEADAAFAA4A/P/w//3/AwAAAAAAAwABAAAA9v/5//z/9//0//X/9f/4/wEA//8BAP//+v/5//v/+/8DAAAA/f8HAPv//P/+/wAABAADAPv/AAD//wIAFwAEAAsABQAEAAUA9f8IAP7//f/+/wYA+v/8//z/8/8JAAIACAACAP7//f8BAPv/BQAMAAUAEwAJAAcA//8NABAADQALAA8AFQAIAAsABAAHAAoAEAANAA8ADwAIABEABgAMAAwACgANAAAAAgADAAoABwADAAMABQAFAAAACQABAP//AQD+/wAAAAD///z/+v/5//b/8f/0//L/7P/t/+z/6f/q/+v/6v/h/+P/5f/r/+//7f/s/+z/7//q//D/7v/3//f/+//6//j/AAD5//z//v8BAPr/AwD///v/9v/z//v/9f/y//P/9//1//j/+P///wAABwABAAIABAAAAAkAAgD9//b/9//w//L/7v/z//j/+P8CAP7//f/x//v/9v/1//7/AAAIAAIACAAIAAQABQADAAMABQAFAAIAAQABAAMAAQD9//3/9v/y/+v/6//w//T/+P/3//L/7//w//D/8P/t//P/7//v/+n/7P/s/+7/8f/y/+//5//u/+r/7f/p/+//7//u/+3/8P/y//P/+v/4//H/7v/w/+X/4//f/+j/5P/p/+X/5f/i/9//3v/g/+b/5P/m/+D/4v/W/93/2f/f/9z/5f/j/+P/5f/l/+f/6//u/+P/4//h/+T/1//o/+H/5P/f/+b/5P/m/+n/9f/5//v/AwD9////9f8CAPX/AgD3/wwAAQAEAPv///8BAAQA//8BAAQA8//9/+v/BgDq/xMA8f8GANv/9f/X//X/9P/+/ycAAAA6AM7/gQDo/yUApP8wAAAAaf+uAHP/MABBAL0Aqv+J/34ACAARAHj/NgBeAAcBogD1/9H/6P/h/3D/GwCJANQAhwAaAM7/6v8tAM7/sf/Q/wwAAQASAGQAcwBuAAgAq/9j/4v/w//u/1AAoQCxAEwA9v+c/4j/nP/g/w4AQQBuAGIAOwAQAAwA1P/M/7b/rP/e/x0AWABtAGsAPwD4/7b/jf+b/9T/GQBDAE8ASgAcAOn/xP+//8L/1P/w/wMAIQAqACUAGwAVAPP/zf+4/8b/7P8FACkALQAsABYA7v/F/7r/xP/P//H//v8WABQAEgD8/97/z//B/7//wf/X/+v/BgAKAAoA+P/d/8P/tP+//8v/4f/3/wcAAgACAOr/2P/H/7z/y//V/+b/9f8IAAcAAQD1/+n/1v/M/9P/2//z/wEAEAALAAIA8//k/+r/6P/u//n/DgARABkAGAAIAP//9f/5//D/+////wAAEgAUABEABgAHAAUAAgAFAAUAEAAUABwAHAASABMADwATABQAEgAQABEAFAAMAA8AFAAOAAgABwD//wAABAAIAAgAAwABAPb//P/5//f/+P/+////+v8AAPf/+v/6////+//5/wAA/f8BAPr/9//4/wAA/v/6/wAA/f8AAAUABQAFAAEAAQAAAP//BQAEAAkACgALAAsAAQD7/wEABQAGAAkACAAGAAcACAD//wAAAAAAAAQACQAKAAoACgAFAAMAAQAOAAkADQASAAwAGAAPABIAEQAQAAcABwARAA8AGgAZABoAGQAYABIAEQAWAAUADQAYABcAFAAZABMACgAHAAEADAABAAMACAACAAUAAgAGAP//+P/5////+f/6////AAD9//r/AgD9//z/+//2//X/9v8BAAcA///8//3//P/1//L/6//1//z/9f/5//f/+f/w//T/8P/o/+f/5//x/+r/7//x/+//8//t/+v/8//w//D/7v/q/+j/6P/n/+b/5f/h/+b/6v/r/+z/8//v/+//8f/v//D/6//u//H/+f/x//H/9P/1//T/9//y//L/9f/s//D/7f/4//X/9f/1/+//8//w//L/9v/6//f/+//9//3//f////f/+/8BAPz/+v/y//v////2//H/9f/6//X/+P/x//H/+v/+//v/8f/6//v/+P/x//j//P/2/wEA+P/6//H/9v/6/+//8//t//T/9v/x//r/9//z/+7/5P/y//P/7v/x/+3/8f/+//H/6f/9//n/8P/3//j/9v/6//n/+f/w//r/+v/2//3/+/8CAP///P/6//3//f///wMAAgADAAoAEQAGAAcACAALAAkAAQAEAA4ADwAIAAgADQANAAYABAAGAAgABwAGAAwACwARABEABgAKAAgAAwAFAAQAEAAUABIAFAAHAAoAEQAMAAgAAgAKAAYAAgAMAAwAAQAEAAgA//8OAAkA+v8AAAAA9//4//r/9P/2//D/+v/u/+r/8//s//H/7P/5//v/9f/v/+f/6//z//j/8P/y//P/9P/z//L/7//z//L/6v/w//L//v/5//X////9//z/9v/8//////////7/AQD5////AAAGAP7//v8FAAAACAAGAAsACQAJAAkAEwAGAAsAEQAGABsAGQAbABYAEgAPABUACgAFABQAEwAUABQAGgAOABAABQACAAgABQAQABAADwAWABcACwAMAAcABAACAP//9f/8/wAABwAHAAAAAQDw//f/7P/r//H/8//6//P/8v/t//X/8P/x//T/6//m/+T/9P/z/+//6f/q//b/9//8//L/9P/1//b//P/x//X/+f////7/+/8CAP3/AwD8//f/+f/7////BgALAP//BwD//wAA+P/8/wgA//8VAAQADAAHAAgADQACABAA/v8JAAwADAAIAP7/BAAAAAUAAQD5//v//f8HAPz//v/+//7/CAD1//7/+P8AAP7/+v8BAP3/+P/2//j/7f/0/+f/8v/0/+//6v/v//7/8//y//L/8f/t//b/7P/1//D/7f/r/+T/8P/l/+j/6f/i/+X/9P/u/+z/8v/v/+z/9f/o/+z/9f/y/wIA8v/t//T/+P/v//T/7v/r/+z/7f/2//r/AQD//wwA8//6/wEA/P8AAPn/BQAGAAcABwAJAA0AEgD//wYADQABAP3/+f8DAAIAEwAMAAIAAwABAAsABAAFAAcACgAFAAIABgALAAcA/v/7/+7/+f/9//3/CgD7//L////4/+7/+P/1//n/+v/4//3///////j/+//+//j/AQD7//j/CAAFABMADgACAAYAAQAAAPb/9v/+//z///8CAP///P/2/////P/2//7//P/+//f/AgAKAAMABAD+//3//f/8//P//f8HAAcAAAD+/wIA//8JAAMA//8BAAAABQAHAAMA/v8CAPf/9v8CAP//AgAFAAIABgD//woADQD4//f/8P/x//j/6//r//r/+//9//j/9f/z/+T/9P/z/+n/8f/9//v/8f/9//b/7f/q/+//7f/u//P/6v/q//H/+P/y//b/8P/r//v/6f/h//L/9v/0//T/9v/p/+P/5//g/+T/6//n//D/8v/r//b/6f/z//T/7P/3/+3/+f/x//P/9v/r//L/9v/x/+j/9//5//P/8P8EAAMA+v8AAPr/AAD9/wUA+//6/wAA+v/+//3/AgACAAcAAwD//woAEQALAAgACwAFAAQADQAFAAUAEgAEAAYABgAOABEACAALAAUACgAHAAIAAAD+//v/+f///////P/6//D/9P/1//3/AAD0//r/8//x//T/8f/s//r////8/wkA/f/7//z/9f/w/+3/7P/x//L/6f/n//T//P/7////6f/r/+z/5P/n/+b/9P/1/////////wQA//8FAPv//v8EAPj///8BAAEAEQAaAA8ACgAOABYAGAAQABIAEQAZABIAEAASAA4AGQAUAA0ADAATABwAGgAaACEAHwAaAB8AFwATABUAFwAiABsAGgAcABIAFwABAAAACQAGAAwACQAEAP7/CAADAAsABAAGAAkA/P/4//X////z//j/9v/4//X/5//w/+j/5//g/97/5//q/+X/+P/z/+b/8f/v/+z/3//o/+n/8//4/wEABQD1//X/7v/4/+P/6f/0//j/AgD6/wgAAQALAAIABAABAPH/+//9/wIAAwASAAwACgAFAAIAAQD1/wEAAAAEAAEA+v8FAA4ACgANAAMA/v8BAPX/BwACAAwAFwALAAgAAQACAAAAAAD//wUA/f8CAAoAAgD+//z/BAADAAkA/v/+//v/+v/5//f/+v/x//z/9//7/+7/5//1/+z/6f/p/+f/6v/q/+f/5//p/+r/7f/s/+P/6//l/+H/6v/t/+3/8f/v//X//P/z//j/8v/0//D/9v8BAPn/+/8CAAMA/v/8///////+/wEAAQAHAAAABQAJAAsADgAJAAwABgAYAA4ACgAdABYAEAAOAAYADwARAAYACAANAA4ACwARAAUACwAMAAUAEAANABUAEQAOAA8ABgAAAAIABAAIAAgAAwADAAAA///+//z/9v/3//n/8v/0//f/9f/1//v/8//v//P/6P/n/+n/7v/+//T/7/////T/9//5//b/+P/7//P/8//5/+7/9f/t//n/7P/r//T/5//o/+X/+P/u/+n/6f/n//L/+//2//T/+f/8/wAA/f8CAPT/BAD+//z////5/wQA+v8AAPz////2/wcACgAFABkABwALAAoACwANAA4ADQALAAkABAASABUAEAACAA0AEAALABEABwAJAAQAAAAKABAADgANABEAEQAJAAsACAD///3//P8AAPj//v/8/wAADwACAAIA9f/x//D/6v/0/+v/7v/y//L/9v/w/+z/8f/t/+r/5//a/+n/4//l/+T/2v/j/+X/6f/p/+r/7v/1/+n/8f/z/+7/+v/6//3/+//7//P/+f/6//3/+f/3/wIA8//2//z/AQD+/wcABQD8/wQA/v///wMA/v/2/wUACQALAAcADwAUAAEABAD+/wYACwALAAoACgAKAA0AAwAAAAYAAgABAPH/AQACAP7//f/z//j//P/1//T/9v/y//f/9v/7//r/AwDz/+j/7//l/9v/3v/k/93/6//o//H/9f/r/+f/5v/g/9T/5//v/+v/8f/v/+f/5//k/+P/2//i/+v/8f/9//3/+/8DAAUAAQD7//z/DAAAAPj//f8MAA4ACgAWABIAEwAUABkAEgAIAAcACgALAAsADgAKAAkAAAABAP//+v8BAPj//f8DAAwADwALAAoABQAMAAYABgABAAEABQANAAkADAAPAAAAAwD2//v////6//7//v///wIAAAD4//n/+f/x//H/+f/3//P/9P/0//n/+v/s/+b/7P/3/+z/5v/t/+b/7//z//P/8v/4//T/7//+/////P8FAAIABwAJAAIACgAFAAAA/f/8/wAACQAIAAYADgAJAAgA/v8CAAUA9/8EAAgABAALAAsAAQAIAAMAAAAKAPz/BQD//wcAEAAKAAsAAgASAP7/+v8AAO///f/8//f/+f/5/wEA/v/+//n/8//p/+v/+v/4//n/9//0//P/+//3/+3/9P/p/+f/5//u//H/6P/w/+T/6//u/+j/7f/w//b/8P/2/+7/9f/3//b/+v/3/wUA+v////7/AAAAAPb/AgD//wQAAQD//wIA9f/6//r/+f/5/+r/8//x//L/+//y//n/AwAFAAUAAAD2//b/AQAFAAkACAACAAcACAAAAPP//f/+//z/AgD+//7/+P/9//v//P/5//j/8v/t/wMA+v/9/wYABwAJAP3////+//z/9//2//f/6//w/+//8//r/+j/8f/r//T/6v/f/+v/6v/p//D/7P/5//b/8//+//b//v8AAPv/9//q/+v/8v/m//H/8v/s//f/8f/8//n/8v/6////9v/2//3//v8AAAcABwD8/wIABQAEAAMAEwAZABkAGQAQABUAFwAIAAkACwAGABMAEAASABwAHAAYABcACwAJAAkAAwAEAAIADQALAAkADQATAAwADAAHAAAA/P////z/9/8DAAUACgAAAAMA/v/+//n/6//5//r/8//y//P/9f/x//T/+P/2/+7/7f/s/+T/8P/k/+n/7f/m//j/+//y//D/8//1//L/5f/x/+7/8P/0//X//v/5//j/AAD7/+z/7f/g/+D/4v/q/+//7//7//n/9v/3//P/8//z//H/7//0//7/+v/2/+//+f/3//f/+f/y//z/+f/q//D/9//1//r/8//6//f/8P/z//D/7//1////AAD7//j/+v/9//7/AwAFAAIABwACAP3/9f/8/wIA/P///wIAAgAHAAgABQALAAEAEgAKAAEADAAJAAYABgAGAAIADgACAAQACgAAAAMACgAHAAEAAgAAAPv/AwADAAQAAgD2/wMABgAEAAYAAwACAAQA9/8CAAYABgD/////BwD0/wMABAANABAACgAFAP7//P/4//j//f8BAP3/AgD+/wcADAAHAAIAAgABAP///v8AAAgACAAGAAoADgAIAAIA+v/x//P/+f/3/wAAAAAQAA0A//8BAAUABAD6/wsA/v/3/wQAAAD//wwA///8/wQAAAD8//L///8DAAEA/f/2//v/AwD+//7/9P/t/+3/7P/r/+/////8//////////T/6f/v/+P/6P/4//v/9//x//n/8v/3//L/6f/0/+X/5v/0//v/9//4//7/9f/v//D/6v/t//P/+P8BAAQACgANABEADQAHAP//AAD7//7/9v/2/wYABQAIAP3/AQD+//////8CAAAABwAKAAIADQD//wsABAD2//j/9f8CAP7/+//9//f/9P/2//T////y/+f/9P/t//D/9f/7//n/+v8DAPz/AgD6//H/9f///wcA9f/1//j/+P/4/+z/6//l/+n/7f/v//T/6//z//T/7f/y//D/9f/8//D/8//2//H/7P/0//f/+P/+//L/+f/2//v/8P/r/+//7v8AAPn/AAAAAP3//f8CAPz/9//3/+//+f8FAAkA/v8FAAUAAAAAAP3/AAAEAAAABAAFAAsADQAJABIABgADAP//CQAMAP7/AQAQABUAEQARABIADQAGAA0AAAD7/wEACAAWAA8AEQATAAcACAAFAP7//v/+/wEACgALAAMAAQAFAAMA/P8CAPn/9//3/+7/+/8DAAMADgALAAcABgD6////9P/6//r/9/8EAAQACgAGAAoA+//4//3/9v8BAAEAAAAAAAQA/v8CAAQA//8BAPj/7//t//f/+f/7//3//f8IAP//+P/6//j/+P/6//r/9v/7/wIA/v/z//T//v/q/+D/6//j/+7/7v/y//n/9/////z/+P/0/+7/4P/u//P/7f/6//j/BAAHAAIAAQD1/+r/8P/z/+v/9f/1////CAABAAYA/P8AAPb/6f/v//L/8P/0/wMA+//6//7/BgABAPT/+v/3//L/+f8AAP//BwAKAAYACQAIAPX/8//2//D///////7/BQAIAAYABAAFAP//+v/0//H/8//1//3/CAD9/wIAAwD3////9v/8//3/+f/+////AwD///b/9P8BAPb/9f/9//7/BwADAAsABAABAPX/5//x/+3/AAD5//z/CQAJAAwAAQAAAPb//P////v/+f/2/wUACAAJABMACgAFAAEA+v8CAPf//P8JAAsADAAMAAQAAgAQAAgABwD+/wAAAQD6/wIACQAMAAEADQAMAP//AQABAAMA+v8CAAMAAQAPAAIACgAPAAsADgALAAcAAQAEAAQADgAKAAIAAQAKAAkA/v8IAPv//f8AAP//CAADAAcADgALAAYAAAABAP7//P/4//r/AAD9/wAA/v8DAP///f/8//j/7v/q//X/7v/y//v/9v8AAP7/7v/y/+f/5//s/+b/5//0//z//f/5//v/9v/o//T/7f/y/+z/7//0//L/8//t////7P/w/+n/3//n/9//6P/v//j/7f/s//7/8//t//T/6v/n/+//8v/m//T/7//x////9f////f/8P/2//3/+v/4/wMACQAEAAIABAAAAAAA+v/9//3/AAAEAPv/+v8DAP3////+//v/AwD+/wEA//8FAA8ABwAKABAABgABAPr//P/6//z/7//w/wEAAAAAAPf/AwD8//v//P8CAAAA/v8KAAEACgAEAAIAAQACAP3/8P/0/wAA/f/7/wMA/f////7/BAAGAAEAAQD+//r//P/+/xQAFQALAAUABgAeAAwABgADAAgADQAGAAkACgABAAIACwABAP7/+f8FAAwADwALAAUADQAKAAsAFAARAAkAEAAHAAEA+P/5/wEAAQACAPj/AAAFAAAACQD+//j/AQD9/wUAAwAIAAcA//8CAPj////0//b/AgD3//X/9P/7//T/+/8BAAEABQD9//r/AgACAPH/+P8BAP///v/6//f//f/8//T/6v/l/+b/6f/1/+b/5f/w/+3/8f/w/+v/8P/u/+j/5//q/+j/7//6//L//v/5//b/+//u//D/+P/u//X////5/wEAAgAAAPj/8v/r/+b/6f/u//H/9f/x//L/8v/2//v/6v/z/+v/7//w/+z/9//y//3/+P/x//L/9P/t/+H/7P/0//b/6v/s//H/6//w/+7/5//p/+n/6v/2/+///P/+//T/+f/r/+v/8f/v/+j/8v/1//n/8//u//X/9f/w/+b/8//v/+//8v/7////8//w//H/9v/r/+r/7//r//P/9v/8//v//P////P/8//x//v/8P/2//r/9/8BAPr/AQD9/wMA/f8AAAEA/v8BAAEAAwAIAAkAAQAIAPz/AAAFAPn/BAAMAAUABgD//wQA/f/9/wMA/P8FAP7/BwADAAAAAQADAAsADAALAAcAAgD8//3/BwAJAAgACAD9/wIABQD4/+7//v/4//f/AAAAAAMA9//9/wEAAADz//T/6//o//b/9P/6//7/AAD+//b/6v/1//b/8//y//T/+P/9/wAAAQD+//3//f/2////9v/0//b/9//9//f//P/7/+7/+P8BAPj/BAAKAAwABgD7/wkACAD8/wUAAwADAP3//v8HAAQADAAMABIAAgD8/w0ADgAJAA0AEAABAAgADgAIAAkAEQASABAADQACAAYAAwDw//r/+//1/wUA+//z/wAAAQD6/wUA+v/0//v/9//4//P/+/8AAP3/AAAAAPv/AQD///j/6P/x//T/8f8GAAQA+//z////8v/5//r/7v/9//b/+P/1//H/7//w//H/9v/u/+z/7f/q/+//8P/y/+z/9v/z//v/AQD1//n/9f/8//n/8v/1/+3/+f/8//r/AAD///j/9v/1/+z/7P/u//X/9//9//z/9//3//T/9f/3//T/+v////3/AQD//wYAAwD9//f//v8BAPn/AwD7/wAADAABAAAAAAADAAQA+v8AAAYA///7////BAANAAkABwAIAAYADgAJAAcAEQARAAkAFwATAAMABQANABAADQAMAAkACgAFAAwACgAEAAUADwAKAAAAEAAFAP//CAAGAP3//f8CAP7/AwD+/wIA/v/7//v/9v/8//X/BAD+/wcACQD+/wMABgACAP7/AQD2/wQA+v8FAAMA///2//X/BgD+/wsABQAVAA8ACwAAAPz/BwD+/wQA//8BAP//AgABAAgADQD8//7////8/////f8CAAsACwAHABMABwAAAAUA9v/x//7/BwAIABYABgARAA0A/v8DAAEACQD7/wgACgD7////CQAJAAUA9//6/wcABgACAPv/BAAHAAEA///1//n////3//L/6P/r//D//P/2/+f/7P/r//H/6P/n/+f/7v/1/+j/7v/5//P/5v/k/+3/3//m//L/8P/s/9v/5P/w/+f/4f/c/9v/3v/X/+j/6v/z//f/+P/+//X/AAD4/wEA///2//r/+//8//7/9P/4//7///////T//f/8/wMAAAAFAP7/CAAHAAAADQD7/wIAAQAEAAcADAAOAAgAAQAFAAMA///9//r/DgADAPX//v8LAAgABwAQAAIAAwAPAAUACwAJAAIACQAUABMA+v/8//3/9//2//b/+f/u//X////6//n/8P/u/+//6//s/+3/8P/0//D/8P/v/+//8v/5//v/+P/8//T/+f/5//3/9P/v//P/9f8AAPj////9//T/8P///wAA+v/2//T/AAAEAA0AAQD//wAAAwABAAMAAwABAAQADAAIAAAACAAHAA0ACAAHAAIAEAAZAAkACgAZAB4AEgATABQADwAOABQACQADAAsACQANAAwABwAAAPz/BQAEAAMAAQD+/wYABwAFAAAA9P/6/wIA+v8AAPf/9v/+//X//f8BAP///f/9//z/9f/x//b/7f/2//X/8v/5//b//f/2/wIA/P/2/wMAAQABAAkA/v/8/wcA9/8CAP///f8GAP3/9v/1/wQA///7//3//f8JAP//+v/+/wIABwACAAAA+v/9/wMAAwDy/+/////0/+7/9f/1/wEA+f/2//z/9/////b/7//w//D/9P/2//3/9//4//b//P/+//P//v/x/+j/9v/2//L/9v/w//j/9P/v////7f/3//P/5//y//j/8v/s//r/7f/r/+7/9v/w/+r/9//2//T/9f/7//j//f8CAAAAAAD+//X/9//5//j/BQAAAAEABAAFAAgAAgADAAcABgAAAP//BQABAAwAEAAFAAsACAABAAQABQANABAACAAKAAoACAAHAAIA/f8IAAQABQAOAAsADgAIAAoA/v8BAPv/7f/+//n/AQACAAAABQABAAAA+//5//f//v8CAP3/9//5//7/9//z/wEA+//2//X/8v/8//H/8//8/////v8AAPn/+f8GAAMABQD7//7/+//3//f/+v8CAPT//v8BAP3//P/6////9f/9/wAA+v8HAAAA//8DAAEABwAIAAMA/v8DAP3/AAABAPn//P8DAAEA/v8GAP//AAAHAAIACwAJAAoAEAAIAAwAAwAFAAUACAAJAAAABQAFAAgABwAOAAcACQAJAAYAAwD7/wYAAQD//wYA/f8DAAQA+v/8//P/8//5//T/8f/8//3/+//1//n/9v/s//z/9f/7//X/+f/1//L/7//m//r/7f/y/+z/6P/w/+j/6f/w/+3/4v/l//T/6//i/+7/5f/e/+r/6f/d/+r/4P/k//X/8//5//P/8P/2/wEA/P/5//z///////7/+f/5//3/+f/+//v/AgAIAPz/+/8FAAAAAQACAAAACQAEAAUABQAEABAABQAGAA0ABgD///7////2/wAA8//0//////8AAPn/AwD6/wAAAAAIAAgAAAAKAAIACQADAP3////+//j/6//w//v/9P/z//j/8P/u//D/+f/6//n/+v/2//L/8f/1/wQAAgD5//b/+v8NAP/////9//v/BAD+/wIAAAD2//f/AAD4//n/+f8DAAgABQADAAEACAABAAwAEgAMAAsAEwAMAAAAAQD//wcABAADAP//BQAOAAcADAAGAP//CgAJAAoACgAMAAwAAQAEAAAABAD9/wAACQD//wAAAQAFAP3/AgABAAQAAQD8//j/AAAGAPD/9//8//7/AwD9//z/BAACAP7/+P/4//r/9v8BAPP/8/8BAPj/8//2/+//7//w//H/6//r//H/7//2//P/9f/1//H/9//z//X////z//v/BAD+/wIA+v/6//r/9//y//L/+P/6//z/+//z//n/9//7/wAA+P////7/BQABAPz////7////+f/z//j//f/8//f/+/8EAAEA9f/0//n/7v/3//j/8v/4//f/9//6//j//v/6//P/9v/v//X////3/+//9v/1//X/8f/v//P/9v/2/+3/+P/0//X/9//5//v/8P/u/+7/9//z/+//8v/t//f/9f/6//z/9//9//X/9f/2//7/8//0//L/7P/y/+7/9P/0//j/9v/5//3//f/6//7/+v8AAAEA/P8EAPj/AAAIAP//AwANAAAAAgD//wEAAAADAAoAAgAMAAIABAACAAEA//8EAA0ACwAJAAUAAAAAAAEACgAQAAcACgABAAgADgD+//n/DAAHAAAABwAEAAcA/f8AAAIAAAD3//j/8f/y//3//P/6//3//P/3//f/7//6//7////4//f/+//6//f/+f/6//X//v/2//b/9//y/+z/7//3/+3/7v/0/+7//f8AAPf/BAABAAIA+f/0/wEAAAD6//v/+//1/+//9P/6//f//v/9//7/+P/1/wEAAgD8/wAA///0/wEACgAGAAUADAALAAkABQD9/wEAAAD2/wIAAgD7/woA/v/4/wAAAAD8/wEA/P/9//7/+v////j//f8BAPn//v8DAPv/BAAAAPb/8P/7//b/9v8FAP3/+v/5/wQA+P8DAP//9v8AAPr//v/2//X/9P/2//z//v/2//T/8//0//X/+P/z/+///P/1//r//v/0//L/9f/6//X/8//4//X//v/+//j////9//r/9P/3//v/8//1//j/9f/3//D/6//t/+//8P/z//L/8//2//T/+P/x//v/+P/0//P/+f/8//L//f/z//r/+v/s//P/8//5//3/8v/3//j/8v/y//L/9v/9//v/9P/7//z//f/8//f/BAAAAPj/BgACAPj//P8CAAIABAACAPz/AQD//wIABgADAP//CgAHAAAACgD8/wEABQADAAEAAAAFAAEABwD+/wIA+//9//7/+f8GAAEACQAAAAUAAwACAAsAAQAAAAQA///3/wAA9/8AAAAA/P/1//f/CwADAAkACAARAAkA///5//r/AwAAAAQA/f/+////AAD+/wEACAD5//r/AAD//wIAAAD+/wEAAQD8/wAA+f/7////+P/4/wAABwAEAAYA+/8JAAEA9f/9////AwD5//z////z//D//P////7/9//+/wkACgAJAPr/BQAIAPr////6//v/AQAAAPz/9//2//P/AAD7//H/8//2//P/8f/2//X/+//+//X/+/8BAPT/9f/2//v/7//3//7/+P/5/+X/7f/5//L/7//q/+n/8f/o//P/7v/1//n/+v8AAPH/AQD3//r/+//4//f/8f/7//f/6v/x//3/+v/4//P/+f/2//n/9v/6//3//f/8//X//P/x//r/+//5/wIA//////r/+P/8//n/8//6//n/AgD7/+//9//9/wEA/f8DAPv/+f8BAP7/BAD6/wIABgAEAAwA/P/6/wEA//8AAAEAAQD3/wEABwD+/wIA+v/6/wAA9//1//j/8//5//n/9P/u/+7/+f/6//v//P/7//b//P/5//z/9f/w//b/+f////7/AQD6//f/7f/+//7/9//0//X/AAD5/wAA+v/3//n/+f/9//3/+f/6//n////2//L/+//2//7//P/8//3///8HAAEA+v8DAAYAAQD+/wgABwD9/wgAAQD//wcAAQAHAAsABAD///3/BAABAAYAAAD//wsABAAHAAIA/P/+/wsABgAFAAIAAQAIAP7/BgAIAAcAAgD+/wIA+v/4//7/+f/8//3/+v/7//n/AQD6/wYAAwDx/wUABAAAAAsA+v/7/wAA9P8AAPz///8GAAAA+//2/wUA/f/8/wAA//8EAP3//P/2////CgD8//n/+f/z//v//v/t//L/+//v/+7/9v/0/wAA+v/5//7/8/////j/8f/y//P/9v/z//f/9P/2/+r/9P/9//T//f/0/+z/+P/2//X/+v/y//z/9P/2/wQA8//+//f/8v/2//n/+f/x//z/7//0//b/9f/z/+n/9v/z/+//8P/6//T/9f/+//z/+v/5//f/8//1//X/BAD6//z/AQD9/wIA9P/+//7/AQD+//f/+//2/wIAAQD8/wIA///8//////8FAAcABAACAAIAAwADAP3/+f8DAP//AwAIAAEABAD//wEA+//7//X/6P/8//j/AAAHAP3/AAD9/wAA9//6//T//P8EAPf/+//v//n/9f/r/wEA/P////7/+v8DAPL/8v8AAAEAAQAFAPv//P8KAAcACQABAAMA///7//j///8IAP7/BgAFAAEAAAABAAIA+f8AAAQA//8EAAAA//8AAAEAAwAHAAAA9/8DAP3/AgACAPr//v8CAAEA/v8IAP7//f8CAPz/BAABAP//AwD+/wEA/P/9/wAA//////7///8AAAEA//8IAAEABQAGAAIAAwD7////+v/9/wMA+v8AAAQA+v/7//b/+P/8//b/+f////z//P/6////9//w/wMA+v8AAPv//P/6//f/+P/y/wEA+f8CAPb/9f8BAPb/+P/4//b/7f/r//j/8f/o//P/8f/n//H/8f/g//H/6f/n//f/9P/9//b/7v/1////+//0//X//v/4//v/9P/x//X/7v/z//L///8GAPf/9f8CAPj/+P/4//T//P/6/wAA+v/8/wQA//8AAAAA+//2//r/+f/z//z/7f/w//3//v/+//n/AgD5/////P8CAAIA+v8FAPv/AgADAP7/AAD///7/7f/y/wMA+P//////9v/7//3//v/7/wEAAQD9//v/9f/3/wgAAgD7//f/+v8MAAUA///9//z/BQAAAAEAAwD4/wAABwD8//7/AAAHAAsACgAKAAEABgABAAQADwAJAAgADAADAPz//f/3/wIAAQAAAPr/AAAMAAMADAAFAPz/AQABAAoABwAGAAUA+/8BAPr/AAD5//7/AwD8//z/+/8FAPf/AgACAAEACAAAAPf/AQAIAPP/9f/9//7/AwD///n/BwAFAAYA/v///wAA+P8HAPf/+v8EAP///v/7//b/9//3//r/8f/r//H/9P/8//T/+f/+//r//v/5//n/AQD2//v/AgD7/wEA/f/9/wAAAAD2//b//v/5/wAAAAD4/wIA+//9/wYA+P////z/AAAAAPr/+f/4/wEA9f/y//X/+/////j//v8CAP7/8//0//P/7v/z//H/8P/3//f/9//4//P/+P/y//D/9P/u/+///f/6/+r/+f/6//n/9v/v//j/+f/y/+//+P/2//f/+f/9/wEA9//z//j////1//T/9P/v//r/8//7/wAA/P/+//j/+f/3/wAA8//y//b/9P/2//b/+v/7/wIA+//4//3//f/2////+f/+/wAA/f8BAPj/AQAGAPz//v8IAPj//P/7/wEA/v8AAAoA/v8FAPz/AAAAAP7/AAAHAAsABQAHAAIA//8DAAAACQAQAAEABAD+/wQADAD///v/DwAHAAEABAABAAwA+//6////AAD6//n/9P/4/wMAAQD8/////P/0//f/7P/7//3/AAD6//n////+////+f/9//b////6//r//v/9//H/9f8BAPH/+f/4//T/AAD8//f////5////+//4/wAAAAD7//v////3//T/9/////v/AQABAAAA/f/3/wMAAwD5//7/+f/0/wYACAAJAAIAAgAEAP//BQD///z/AAD3/wMAAgD+/w0AAQD//wQABAD+/wIA+v/4//z/+P/+//b/9/////n/AAAIAPX/AQD+/+3/7f/5//z//P8FAAIA/f/8/wIA+f8IAPz/8/////X//P/+//f//v8AAPz/AQD2//T/8//0//f//f/2//j/AQD6/wAA/f/6//X/+f/9//X/9f/8//D/AAABAPz/CgAAAAEA9P8AAAIA+f/9//7/+v/6//b/7//6//b/9//7//D/9v/6//L/+P/w//7/+f/0//r/+v8AAPD//f/x//r/AAD2//z/9/8AAPf/+P/7//b/9//1//r/+////wAA9f/9/wAABQD///X/AwD///b/AQD///L//f8EAAQACQADAPn/BQD+/wIABQD6/wEABAACAP//DQD5/wAABAAIAAEA+v8JAPn/BgD6/wAA/f/9/wAAAAAKAP//CgD8/wcAAQD+/wcAAAAAAAgAAAD3/wAA9/8HAPr/+//2//r/FAAJAAkABAAKAAAA+//2//r/BQAAAAoA+P/4/wQAAgAAAAUACgD2//z//v///wIAAAD9//3/AAD+/wEA9v//////+P/4/wAABgAGAAgA/P8HAAEA/f8GAAMABwD+//n////6//L//f8JAAEAAQAIAAYACQAGAPT/AgAIAPn/AgACAAIAAAADAPz/+//5//T/AgD9//b/9f/4//r/+//9/wAA//8EAPb/+f////b/+f/4//v/8P///wMAAwD9/+j/7v/8//X/9P/p/+f/8v/r//v/7f/6//b/9v/6/+T/9v/t//H/8//t/+3/9P/5//f/6//1/wEA8//w/+//9P/1//z/8f/4//7/+v/9//X/9//w//j/9f/1/wMA/f/5//b//P/6//j/+P/8//3/AwD///T/+v/7/wYA/P8CAPz/+P//////AgD0/wQAAwAAAAgAAgD6/wEACQAFAA4ACAABAAoAEAAEAAcABAD//wgA///6/////f8AAAEA/v/1//z/BgABAAEAAgD///v/AQD9/wIA+v/5////AQACAAAABAD9//j/7v8BAAUA/v/2//n//f/1/wEA+P/w//j//f/7//3/9f/2//X/+//y//H//P/x//3//f/4//X/+v8FAP7/9P8AAAEA/P8AAAYABAD7/wcAAgD+/wgAAgAHAA8ABAD//wAACgABAAsAAgADABIAAAALAAYAAQABAA8ACQAKAA4ACgAQAAcAEAALAA8AAQD//wcA/v///wEAAQAAAAMAAQAAAP7/CAAAAAoABQDw/wcABAD//woA+v8AAP7/9f8AAPv///8DAAAA+v/8/wcAAQD//wIA//8EAP//9//3/wAADgD6//T/+v/z//3/AQDy//D/AADz//P//f/5/wUA/P/6////8v/9//b/8P/0//X/+f/x//f/+f/2/+z/9//+//X//f/v/+b/9P/2//H/9//u//f/9P/1/wMA7f/5//f/8f/1//n/+f/x//3/8P/y//b/9//v/+f/9//3//D/8f/8//j/9v/6//r/9v/5//f/8f/2//T/AgD+/////////wYA9f/9/wAAAQAAAPn//P/9/wUAAwD+/wAAAQD/////AwAKAAsACgADAAQABwAGAAIA/P8KAAkACgAKAAcACwAFAAoAAgADAAEA8P8FAAEAAwAOAAMAAwAHAAcA//8AAPn/AgAEAP7/+//0////+P/y/wEA/P/6//r/9f///+r/8P/7//v//v8FAPf/7/8GAP3/AAD3//z/+P/y//L//P8BAPP//v/+//v/+f////3/9P/9/wIA+P8BAP3/+////wEAAQAGAAAA8f8FAPn/AwACAPv/AAAEAAQA+/8KAP///f8CAAAAAgADAAMAAwAFAAUA+v8BAAAAAQAFAAAAAQAGAAsAAAAPAAgABgAHAAMACAAAAAIA/////wMAAwACAAgAAAD///v//f8BAPb/9/8BAPv/+P/5////8f/p////7//5//f//f/8//T/9//u//f/9P8CAPH/8P8CAPT/8f/4//f/6v/r//v/6//n//D/5f/g/+//7v/b//T/5f/l//X/7f/0//H/5P/x//7/7f/u//L/9f/p//r/7//p//X/7//0/+//AAD//+//8v8AAPH/8v/5//T/9f/4/wEA9P/5/wUA/v///wMA///1/wAA/v/y////8//9//7/CQADAPv/CwD//wYA/v8NAAQAAgALAAEABwAOAAMA/v8GAAIA+P/4/w8AAgAGAAoAAAADAAYAAQABAAoA/v///wMA/f8BABAABAD7////AQAOAAwAAwACAAAACgAEAAIACwD6/wcACwADAAEA/v8LABEACgAHAAkAAwD//wIADQAFAP//EQAKAPv/AAD+/wIABAAFAPr/CgATAAQAEQANAP7/AAAHAA0ACQAGAAsA//8GAAIABQD5//3/DQD8/wEAAwAMAPn/CgAIAPv/DAACAPL///8KAO3/9f/6//3////+//3/AAACAAgA9v/7/wMA9v8KAPv/AAAFAAEA+//7//b/9f/1/////P/v//n/9v8EAPb/+/////f/9v/6//j////y//v/CgDz/wIA+//2//n/AwDt//H/AADy//7/BAD7//v//f/3/wUA9P/8//j//v8AAPr/AAD3/wIA8//u/+///P8DAPr//v8LAAIA7f/0//f/6v/y//7/8v/4//z//v/x/+7/AADu/+f/9v/z/+f//f/+/+P/8P/1/+v/6v/t//H/7//q/+z/8v/s/+7/9f/x//v/8//t//f//f/z//b/+f/s//7/9//6//3/+P/4//L/9//1/wEA7v/z//v/9f/1//j//v/8/wAA+v/4////+//z/wIA9//+//z//P8AAPb/AAAKAAMA/v8PAP7/AQD7/wcABAAEABEA//8GAAAABwAEAAUADAAQAAkACQAIAAAA/v8EAAUACwAUAAQADQAFAAsAFQALAAYAEwARAAoADgAMABYABAD//wkABgD///7/AAAEAAUADgAGAAMAAQD4/wMA/P8BAAEABAD3//n/BAD9/wAA/f8AAPr//f////7/+v/7//L/9P8AAPX/9v/z//f/BQAAAPb/9f/2//3/+P/3/wAA+f/4//v/AQD5//H/+/////b/8P/8//f/9v/4//n/+//y//f/7//1/wEA//////L/8v/2//L//v/5//T/9//z//7/AQD8/wEA/v/1//7/+f/1//f/8f/5//X/8f/3//H/9//9//H/AAD//+3/+v/3/+P/7P/1//H/9v/6//v/6//y//z/9v////D/8P/2//L/9//z//L/+v/4//n////w//H/7f/s//T/9P/x//D//f/4//b/8P/x//H/6v/y/+3/7v/w/+z/9P/0//P/+v/3//j/7f/0//z/8//2//X/8P/w//L/7v/x//T/9v/4/+v/8f/x//D/9P/o//n/8//v//f/8//9//D/+f/1//b//v/0//n/9f/3//P/8//5/+//9P/8//f/+v/+//7/9v/4//7/AAD8//n/AQD+//v/AQAAAPf//f8DAAQACQAGAPr/BAAGAAoACQAFAAgACQASAAYAEQABAAYABwARABMAAgATAAMADQAEAAkACAAFAAcACgAUAAwAEwAIAAoABgANABEACAAHAA8ACgAGAA0ABQAMAAIACAAJAAoAHAASAA8ADQAJAAMAAQAFAAUACAAOABMAAwAEAA8AEgAIAAoAEAAAAAUABQALAAwABQAAAAEABwABAAUAAAAEAAcAAAAIAAoACgAPAAUAAQAJAAAAAwAHAAQACQD+//7/BwAAAPP/AAAHAAAABAACAAQABQANAAAAAwAJAP//BQAGAAcA//8CAP////8AAP7/AAABAAEA+v/1//T/+f/7//3/+v/6//D/9P/3//D/8P/y//n/+P/4//v/AAD4/+f/5v/1//D/7//l/+H/7f/o/+z/4P/s/+v/6f/v/97/6//k/+f/7v/e/+D/5P/q/+z/5v/q//X/5v/j/+n/7P/r/+f/7P/q//L/7f/t/+v/6P/u/+//7//u//7//P/s/+3//f/3//D/9f/8//r//f/8/+7//P/4//v/+f/7//j/8v/9/wEAAQD0/wUABAD7/wQABwD/////BwAIAA8ADAAHAA8AEgAHAAcABwAEAAkABQABAAYAAwAKAAYACAAEAAAAFAAQAA0ACAAIAAUABQAHAAIABAAHAAoADQANAAgADAAJAAMA//8PAA8AAwAEAAQA/v/8/wMAAAD+//7/AwABAP//9//6//n//f/+//j//v/3/wEA/f/6//r/+P8BAPr//f8CAP3//v/+/wgACwABAAsACQACAAsACQATABgACQAHAAUAEgAQABUADgAQABwADAAbABEADQAOABoAGAAZACEAGwAXABQAGwAUAB0ACgAQABgADwAQAAsAEgAQAAsADAAPAAsACwAGAA0ACgD9/wUACQD//wMA9f/1//b/9f8CAPT/AgD7//f//P/3/wIA/P/4//3/+//9//T/6//w//b////0/+//7f/o/+7/8v/s/+z/7//q/+v/7//t//j/+f/v//H/4v/v/+7/8P/x/+v/8P/m/+7/7v/p/+f/7//y//D/9P/o/+P/6v/s/+r/7v/r/+3/8v/y//T/6v/s/+7/6P/r/+r/7//m/+f/2v/g/+L/0//i/9D/2f/i/9b/2v/j/+X/4//m/+L/3v/f/9//3//j/9v/4//o/+f/6f/q/+//5//r//D/9P/4//P/7f/1/wEA+f/3//v//v8AAPb/CAARABIAFQAMABAAEwAaABMAFgAiACIAJQAkAB4AIgAfACQAJQAdACIAFwApACgAIQAyAC8AHgAgACYAHQAWAAYAGAAUAAcABgABAAgA///8/wYABQD///z//v/+/+f/5P/o//P/+f/0/+z/6//s/+j/7//r/+//7v/n/+D/7f/v/+v/7f/y/+//7f/z//T/8P/q//3/+v/1//X//v/+//7/+f/9//7/9f8CAPz/CQAFAAEABgASABIADgARAA4AEwARAAsAFgAbAAwADgAKABIACQAJAAoADwAQAAsADAANABYACgAYABkAEQACAAMACAAJAAMABQAAAAMADQD//w8AAwD+/wAAAgADAAAA+v/+//j/8f/0//X/7//k//f/8P/4//H///////f/9f/z//T/9P8BAOr/6//3//X/4//m/+j/6f/m/+r/3P/Z/9//2v/l/93/2f/S/+L/2P/V/9r/5f/i/+T/3//o//X/6f/v/+P/7//d//D/7//q/+v/4v/r/+r/8f/x//T/7//1//D/6v/o/+z/6f/y//T/7//r//b/9//1//3/9//3//j////2//r/8P/+//f//v8AAPv/BwD7/wkA+P8FAAkABQAIABAAEQAPAAsABgANAAkAAAD+/wwABQAGAP7/BgAAAAIAAQAAAAYA/P8BAAMAAQD9/wQA+//7/wIABQD//wsAAgABAAYABwAMAAoADAD9/w8ACAAMAAAABQATAA8ADwAUABAABQARAAcAEgAMAA4ACQAJAAIA//8GAAYABQD//wEA+v8HAP//AQAJAAIA9v8JAAQA//8AAPn////6/wYA/P8CAP7//P/0/+3//P/8//L/AgAFAPr/CAD+//T/+f8BAPb/+//x/+7/9//r/+7/8v/2//f/9f/9//3/+f8DAP3/AwABAPn/+f/4//P/8P/0//r/9P/q/+r/6P/6//b/8v/+//f/7P/8//b/9//2//T////8/wgA9//+//v/AQD5//j/AAD7/xAAAwADAAMAAgD6/wUA+//1//3/AAD///n/BgD//wQA+v/6//b/AAAFAAAAAAD9//r/8//3/+v/9P/3//j////5//P/+P/y//H/9//4//T/9P/1/+n/9f/5//T/9v/z/+v/8//0//H/8P/t/+3/8v/x//T/8v/o/+3/7P/t/+r/+P/v//f/8P/v//7/7//+//v/AgD4//z/+//5//r/9//4//f/+f/2//b/8v8FAPX/AAD2//7/AgDv//z/9/8BAPX/AQD//wIAAQAAAAIA/v////3/BwD0////BwACAPv//P8DAPn/+/8FAAMABAANAAUAAAAEAAEA//8LAP//AgD///b/AwACAAAAAQAHAAAAAQAHAAUA/v8FAAwABwD/////CwAAAPn/BQADAPf//v/+////CwD//wEABAADAP//AAAEAP3////+/woABAAEAAkA/f8BAP3/CgAOAAUAAAACAAoABgAHAAQAAQAEAAEAAQD6//f/AwAAAAMA/P/+/wIA/v/5//r/CwAEAP//9v8BAAYAAQAAAAAABgABAAMA/P8FAAQA/v8BAPT/+f8BAAIABgAHAPr/9f/y//r/AAD5/wEA9P/9/wAA+f8BAPn/AgD+/wEA///3//H//P/3//P/AAD0////+v/4//H/AQD3//z//f/w/wAA7v////L//f/5//X/AgD2//L/+P/9//P//v/1//7/7v/x//r/5v/w//r/+P/3//3/AAD//+7/7/8BAAMAAAABAO//9f/1//H//P/4//f/8//1//r/9P/3//3/8v/5//n/+f/7//7/AQABAAQAAAD9/wAA/P/2/wgA+P/5/wAA+P8DAAIA+v8GAAMA9f8BAAIACwD8/+///P8CAP7//v8BAAAA/f/5//v//P/6//3/+P/7//z/6/8AAP///P/9//f/+//4//j/9f/9//7/CgABAPb/AAD5//b//f8DAAIAAwAKAAYAAAD//wEA//8DAAgA//8FAAEACQABAP7/AwABAAEA/P8AAAEAAAD7//3//v8MAAAA/P8EAPv/AAD6/////v8CAAAAAQD///z/BgAFAAcA9//y/wIAAwAHAAgA//8AAAEA//8FAAIA/////wgA/////wUAAgABAP//DQABAAQADAAFAAkACQAKAAYABgAIAPn///8HAP//CQAFAAYABAABAAoABgAGAAIA+v8NAAEA+P8MAAYAAAD//wUABwAMAAIABgAFAAEACQAKAAUAAwAIAPz/AwAFAP3//P8HAAQABwAGAPf/+//7/////v/8//v/9v/9//7/8v/6/wAA+P/x//7/AwAJAAQA9P/8//X/8v/5//f/+P/9//3////1//X/AQD+//f//f////n/+f/z////BQAAAP3/+P/6//v/+f/+/wIA///8//z/+v8EAP//+P8BAP//AQAAAP3/+f8AAAAAAwD6//7//v/3/wAAAwAKAP/////0//b/8P/u/wEAAgD7//7/AQD4////9//5//n/+/8BAAAAAwD5//7/+v/8/wwA/v8IAAAAAQAIAPj////0//n/+v8BAAAA//8AAP//BQAAAP3/9f8AAPL/+//9//n/AgD+//z//f/3/+7//P/6/wgAAAACAAMA7P/6/wAAAgAAAAEAAQAAAAIABwAGAAcA//8DAAkABgALAAEACgAGAAYACQAHAAUACQABAPz/EQAJAA4ABQAGAP7//f8PAAwACQAGAAMA//8AAP//CgAHAAUAAQD//woACQAFAAoAAAAAAP////8DAPz/CQACAAMA//8KAP7/CgAJAAUACwABABcA/f8HAAAABgAJAPf/BgARAAIABAABAPr/AwD9/w4ABgALAPr//P8OAAEA//8KAA0ACQAOAPz/8v/9/wYAAgANAAUA/f/+/wEA/v/5/wkAAgACAAsA+v/6/wIAAAD+/wAAAwD9//f/8f8BAAIACQACAPb/8v/z//3/AAAAAPv/AQDy//D/+f8AAPX/AAD8//z///8AAP7/8//6//7/CAD5/wMA9//v/+3/9//+/+3/6//w/+//+//5/+//6P/g/+3/5f/1//f/+//v/+7/6f/l/+f/7P/2/+z/9P/6/+3/4f/1/+z/5v/o//3/+/8AAP3/8P/v//H/7P/p//7/AAD5/+j/+v/u//H//f/7/+n/8//4/+//9//z//D/6P/2/+3/7v/n//H/6//s/+P/8P/r/+j/8f/g/+H/5f/0//H/9//e/+z/4v/n/+n/8//s/+7/8P/q/+7/4//+//j/AgD7//v/6P/2/+X/8f8AAP3/AAADAAMA9//9////CgAGAAwA+v8KAPj/DwACABIAEwATAP//AwALAAUAEwDx/woAAQAiAAYAHADo/x8ABgAKAAYA6P8HAOj/EADu/ywAEgAzAP3/QAASADEAHQAJAFUALQBHAC4AhQA9AH4ABQCMAIUAHAE4ALH/agCrAf0Bg/rG/qoGzQc3Bdv+H/yw/68AH/2pAIz/AQLzAW8ArgDQACMCZP/JAooAqv8a/lb/HQF6AZkAs/9lARsAewAQ/y7/Y/7gATMB8gF2/8T9c/3LAE0BE/4Q/dQChxo9FgcOowJv+Xf5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VgFaAT8BMgE1ATcBUAFhAWIBXgFFASABAAHUAMMAzgDGAKoAhgBcACIA+f/H/6H/pP+i/4P/bP9A/xr/FP/5/gb/Lv8r/yj/G/8Y/xj/Bv8Z/wj/If8z/yn/K/8j/yf/G/8j/yj/M/8p/y//Qv9L/0H/LP8d/x//LP8u/0X/Rf9N/1T/Wf9j/2z/cv+N/6H/pv/B/8n/3f/n//L//v8ZAEsAcQCWAIoAggCIAIkAtQDAANEA5ADlANsAxwDGALoAxQDFANAA2ADYANgAywC9AMEAygDCANIA2gDpANUA1QDLALwAvACRAJUAiwCEAHoAUQAvABQA///v/+X/0P/H/8H/sv+j/5b/kf+R/4j/hf9//5H/jv+P/5P/dv+C/4j/hf+E/53/pv+n/7D/ov+U/4v/jP+F/4T/fv+B/3z/Yf9M/z//KP8e/zL/O/89/0H/Qf82/y7/LP86/1r/cv+S/7H/zf/a/8//6f8DACUAVwBvAIgAhwCDAH8AegByAH0AjwCWAJ4AfgBdAFMARgA8AFIAYQBfAGMAZABaAFIAWgBjAHAAgwCRAJMAlwCNAIQAgwBqAGgAewB8AHcAWgBJAD4AJwAvACYAKQAtACYAKQALAAIA9//2/xEACgAFABkAHQAOABkAIQAmACkAKgAtACsALAAcACMAEwD8//j/3v/N/7z/qP+V/4T/cP9n/1j/S/9S/0j/Qv84/zn/RP9Q/13/af93/33/lP+m/7T/zf/o/wAADwAQABkAGQANABwAGgATAA8ACQD///P/6f/h/9T/w//A/7n/xv/P/9L/5v/y//X/+v8KABgAJgA1AEIAUABPAFEAVABQAFcAUQBUAF8AVwBbAF8AQgBFAEMAMgA4ADYAOwBDAEIAQgBOAEAARQBVAFgAcwB5AHcAhwCIAH8AfwCAAIkAiACBAHAAWAA+AC8AKAAUAPL/3v/K/7f/rf+M/4X/dP9p/2P/Vv9c/1b/W/9j/2v/fP+J/47/qv+5/8H/xP/T/+X/2f/i/+7/8//y/+D/zP/D/73/sf+q/6X/mv+H/3z/cP9f/23/gP+J/4//mv+i/63/wf/Q/+b/AgAYACUAMAAzAEAATgBbAGIAbgBuAGQAaQBkAGUAZQBpAG4AeABzAHUAbwBsAHUAdwCPAJMAnQCfAJoAngCqAK4AtwC8ALkAtwCkAJIAigB1AGYA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LAAqACoAMQA8AC4ALAAzACMAIwAcABUADAAFAP7/BQD6//T////9//7/8P/+//j/AgACAPX//f/8/wMAEgAPAAwABwABAAkA/P8KAAgAEQALAA4AJQApAEYAPwBJAE8ASQA1ACwALAAZABUAAgD///r/9P/r/9v/4P/d/97/7P/z//n/AwAQABcADAALAB4AJQAnAB0AFQAOABEAGgATABAABwAUABUAEgAYABAAEwD//+3/5f/T/8j/xP+9/7j/r/+y/8P/wP/L/8z/4f/v/+v//P/+/wsACQAGAAAA+//w/+n/4P/I/8b/wf/C/8X/yv/L/9D/1//L/8n/2P/O/83/xv+9/8X/tP+8/8P/z//R/9n/7f/s/+7/+//w/+v/8f/m//7/+f/5//j/6v/2//H/8//6//T////2//H/9P/v//n/7//7//L/+f/+//f/+//+/w0ABwATAAkAEgALABsAFAAMACcAEwAiABsAHgAkABgAFQALAP///f/t/+v/7f/o/+T/6//9//P/AQAGAA4ABAAQABoAFwAqABsAHAAgACYADwABAAEA9//2//3/AgDx/+v///8NABIAGgAPABgAEAACAOz/0//X/8r/wf/O/9z/3P/z//z/+f8CAAoADwAWACUAGQAcACoAHAAbABsAGgAQAA0AEAD//wsAFgASAAUABwAZABcAEQAQABUACwAIAAUADwANAA0AEQAIAAwACwAOAB8AIwAPABEAJgAqABAAGgAnACQAJAAjADcAMgAxADEAHwAQAAMA//8BAPr//P/2/+r/9P/1//v/AAD5//r/AQAFAP7//P8BAPf/8v/0//P/8P/p/+L/9P8AAPT/AgAGAAQACAAAAAUA9//s/9X/w//X/8f/xP/J/9P/z//a//D/6f/y//j/AwD+//n/8v8LAP//+f8PAAEAEwAKAA0AAQD///7/8P8BAAkADAD+/wQACwAIAAUA/v/3//D/6//p/+r/5//l/+H/0f/Y//D/4v/h/wAA9P///wAA8v8HAAEABAADAAEA/v///+3/6//1/+3/7v/d/+b/6f/q//L/9//j/+n/7P/c//H/7f/l/97/6v/m/+z/8v/s//X/3//k/+7/3f/f/+j/+f/z/+j/AgAIAAUABwAJAP//AAD+/wQAAwDx//L/+//+//T////x//r//v/+/xAAFQAOABYALQAlACsAJQArACUAHQAlABsADAAXAB8AEgAHAAcAEQAVABoAFwAbAA4AGgAZABEAGQAVAA4ABwAQAAIA9v8GABMAAQACAAQACwAVAAwAEQAQAAkAHAAsAA8ABgAHAAQA+v/v//X/7f/i/+X/4P/O/9L/3//l/+n/6v/2////CQAOAAwADgAWABYABwAHAA0ADwAEAAIA9P/x//r/8//4//T/9f8BAAgA+f8IAAYAAgAWAAEACQAaAAcA+v8CAAUAAgDz/wAABAAJABgACwARABIAIAAkAB0AIQAZACQAKQAUABAA/v8LAAYA+f8OAPj/BgABAAgADgAMABgAEwAmACYAHQAcACoAIQAUABwAFwAMABQADgAEAAAAAAAJAPv/8v8BAAMA/P/x//b////y//r/8f/x/+P/2//q/+f/5P/V/+f/5f/m/+n/3P/p/9v/3v/s/9v/3P/Z/+L/3//P/9z/yf+9/7//u/+5/7b/tv+6/77/yf/J/9D/2v/h/+P/1v/W/9f/5v/a/9H/z//T/9v/2//g/97/8f/z/+n/8/8BAPj/AgAHAAIADwAPAAkADQAJAAcABAD+/wEA+P/3//T////5/wIA+//+/xEACwAbABMAFgARABgAHAAbABoAGwAeAA4AEwAOAAwADAAFAAcACgANABUACwAUABIADQALAAAACQAAAAEA9v/n/+r/7P/s//H/8f/6//r//v8LAAoAGwAHAAYADAAQAA8ADAAIAP7/DQABAAoABgAIABIAEgARAAkAHQAeACcAKAAcABoAHQAdABMADAAIABEAEgATAA8ACwAdABoAHAAUAA4AMAAnACgAIwAoACkAFgArABcAIQAUABQAIQAGAA4ABgAFAAAAAQAAAP3////7//j/9v/9/+v/6//5//n////+//v/AAAFAAQA+/8BAP////8EAP3//f/+/+//6v/n/+H/5v/a/9z/2//c/93/2v/b/+P/5P/Y/+P/5P/n/+b/5f/e/+v/8//g/+H/4P/t/+v/4//p/+L/6//v/+v/8f/v//X/7v/5//z/8/8AAPT/+P/2//D/9f/4//b/6//v//H/9//4//L/9v/4//b/6//0//z/7f/6//n/8f/7//j/7//y/+//8v/1/+r/8//o//P/+f/p/+3/5f/v/+z/5v/r/9r/6v/n/9j/5f/g/+n/5f/l/+b/5P/p/+H/9v/t/+j/8v/t//T/9f/4//X/+f/4//H/8P/3//b/7P/2/+//9f/2//P//v/9/wcA/f8BAAIA/v8GAAEAAAAFAAoABwAQAAkAEAAaAA0AGQAfAB8AIgAhACMAFAAYAB0AFgAYAAgAEwANAAkADgAGABEAEAAYABsAGgAVABoALgAuADAALgAnAC0ALwAfABUAJAAcABIAFAANAAYA/f8AAP3//v/6////+P/6/wsABQAEAAgADAAHAAQA/P8DAAEA/f/7//T/7P/q/+v/5P/k/9z/5//i/+j/6f/c/+z/6v/t//L/7f/4//P/+//8//j////5//v/7v/u/+7/7//o/+7/7v/r//H/7v/5//T/+////wIA+P/5/wAA/f/9/wIA/P/0//r/AgADAP//CAAFAAkABAABAAcACQABAAYACgAGABYADwACAA4AEAAEAAwA/P8BAAAA+v/8//L//v/7//P/+v/+//3/AAD///r/7v/4//D/8f/7//r/+P/y////9f/+//n/7f8AAPn/9v/7//L/9f/y//n/+//w/+v/6f/o/+P/7v/j/+T/6//m//T/9v/s//P/8f/5//X/7f/7//L//v////3//v/7//b/+f/0/+z/6//n/+7/7f/y/+7/6f/v/+//7P/3//T/+P/6//T/+f/4////9//2//f/+f/6//n//v/z//j//f/t//T/8//+////7P/7//7/+f/1//H/9f8DAAAA+v/7//3/+//6//j///8AAPn/BAACAP//+f8EAAEABQAHAAAACQAIAAcACgAMAAMAFAAIAAAADgADAP//AwAEAPz/AgACAP//BwD8/wEAAwAAAAIA/P8GAP3/BQACAAIAAQD8/wkACAABAAUAAQD8/wMA8/8GAAEABAD3//r/CwD9/xAACgAZABEACgADAPz/BAD8/wMABAACAAIABAABAAEACgAAAPz/BgAAAAMABQABAAUAAAAAAAoABQAJAAMAAAD5/wAACAACAAkA+f8IAAIA9v///wUACAD8/wQABgD4//f//////wYA+f///woAEAAIAAAAEAALAAUAAQD9/wAABAACAP7/+f/x//P/+f/w//D/9v/1//T/7//2//X/9v/9//T///8EAP//9//0//7/6//0//X/9f/3/+T/6//x/+3/6P/r/+r/6//l//P/9P/2//X/9f8BAPf//v/7/////P/6//n/9//8//j/6P/w//z/9f/4//f//v/6/wEA+//8//7/AQAAAPv/AgD1////+P/2/wAA/f8AAPz/+P/5//D/7v/x//b/AQD5//L/9v/+//z/+P8BAPn/+v8AAAAAAwD8//7/AQAIAAoA+v/6/wAAAgD9////AgD1//7/BQACAAcA/v/9/wAA9//7//v/8//7//j/9v/0//X/9f/5//3//P/9//j/AQD9/wUA/P/2//j//P8FAP//BQACAP3/9v///wAA/f/2//f//P///wYA8//z//n//f///wEAAgD///7/AwD+//z/AAD9/wEAAAADAAEADgAUAAEAAgAMAA8ABgACAA8ABwAGABAAAQD8/wIAAAAGAAcABQAEAPz/AwAAAP///v8AAAQAAwAHAP//+P/4/wEA//8BAP////8CAPv/AwAHAAEA/////wAA///4//7/9P/2//f/8//+//z/AAD2/wMAAADy/wUAAQAAAAoA+//+/wEA8//9//7/+v8FAAAA9//5/wQAAQD9////+P8BAPv/+//8/wEACwD+//7/+v/7/wIAAgDy//T/AQDw/+7/9v/z/////P/5/wEA9/////r/9P/0//L/9P/x//j/8f/3//D/9f/+//P//f/0//H/+f/5//X/+P/v//n/9v/3/wUA8P/9//X/8//2//f/9//z/wAA7v/2//j/9f/x/+v/9//1//L/8f/2//f/9v/+//v/+f/7//L/8//2//f/BAAAAPr/AAAAAAEA/P8AAAUAAwD9//j//f/6/wAAAQD5/wEA/v/8/wEAAQAKAAYAAQD///z/AQD///j/9f8CAAAAAAAKAAUABwAEAAgAAAD+//v/8f8BAP7/AQAEAAAAAgAAAAAA+f/7//X//v8FAPn/9f/y//r/9f/y/wYA/v/9////+f8CAPT/9/8CAAEAAQADAP///P8EAAEAAQD2//v//f/3//f///8AAPn/AQABAPz/+v/+//7/8//7/wIA/P8FAPv//v8BAP7/BAAGAAAA+/8JAP//AwACAP3/+////wIA+P8CAPb/9/////n//v/8//7/AQD9/wIA+P/5//z/AAAAAPj/AQAEAAgAAgANAAkABwAKAAYABgD//wkAAAABAAIAAAAHAAYAAgD///v//v8AAPb/9//+/wAA/P/1//v/8v/q//3/9P/+//f/+//8//X/9P/u/wMA9/8EAPj/9v////X//P/4//j/6v/w//j/7P/m/+3/5v/b/+z/6v/d/+n/5P/o//b/8f/2//j/8P/3//7/9v/1//j//v/2//z/+P/y//n/+f/7//3/CwAJAP7/+v8BAPf/+//6//j/AAD7/wIA+////wMAAQACAAAA/v/4//v/+v/2//z/7//3//7/AgADAPv/BwABAAIAAgAKAAMAAAACAP//BgAAAPv/9//6//P/7v/v//3/9v/7////8//2//b//P/5//v/+P/x//P/9P/y/wEA9v/x//H/9v8JAAQA///1//v/AAAAAAEAAAD3//n/AAD1//b/8v///wEA/f/6//f//f/4/wAABwAAAP7/BAAAAPr//f/3///////+//z/BAANAAcADgAHAP7/CwALAA8ADAAHAAoA/v8CAPz/AQD4//n/BQD3/wAA/v8FAP3/AgAFAAAABgD9//z//v8EAPb/9v8AAAAAAwACAAEABwAIAAgA/f8AAAUAAgAKAP7//f8EAAAA+f/2//H/8v/u//L/7//n//D/8P/1//L/9v/z//X/9f/y//v/AAD1//3/CQD9/wQA/v/7//7//P/2//b//v/+/wIABQD8/wEA/v8AAAUA+f/9//j/AAD///f/+f/7/wAA9P/0//n/AAACAP//AgALAAcA+v/6//z/9P/4//3/9v/+//z//P/+//f/+//x//L/+//0//X//v/5/+7/9//6//n/9f/x//X/9//0//D/+//7//3/+////wIA9v/3//X////5//j//f/y/////v8BAP7/+f/6/+//9f/z//P/6//u/+//7v/w/+//+P/z//n/9f/w//f/9P/0//n/8f/9//v/9//7//P//f8CAPv//v8IAPr/+v/4/////f/+/wkA/f8BAPv/AQD///r//f8DAAMAAAD+//j/+f/7//3/BgARAAEABQABAAYADAAAAAMADwAKAAMABwADAAMA+P/2///////2//j/8f/4////AQD6//j/9//v//T/6v/7//b//P/4//T/AQD8//v/9v/6//T/+v/5//X/+//4/+7/8v/+//b/9f/3//P/AQAAAPn//v/5/wAA9f/x//v/+P/2//n/+v/y//P//P/+//j/9//+//z/9v/1/wAABQD1//z/8//z/wYABgAHAP3/AAABAP//BgD///3////7/wcAAwAFAA4ABAD//wUABgAAAAAA+P/9//7/+v/+//r//v8FAP7/BQALAPn/AQD//+z/8///////AQAEAAIA8f/8/wUA+/8IAP3/+/8AAP3/AAD7//T//v8AAP7/AQD0//X/8f/z//r/+P/3//b//v/5//j/+f/x/+//7//6//X/8v/7//f////8//7/AwD+//7/9P/8/wAA9//7//v/9f/9//f/7v/5//r/+//6//L/+v/6//X/+//0//3/+//2//7//f8CAPL/+f/3//3/AgD2////9v/+//j/8v/7//T/9P/8//v//v8CAPz/8v/2/wAAAQD7//H/AgD8//X/AAAAAPf/+f8FAAEACAAAAPX///8DAAcAAwAAAAEABgAHAAEABQD6////AAAHAAIA+f8FAPb/AQD8//z/+////wAAAwALAAMACwACAAgAAAACAAYA/v/8/wQAAAD4////9v8CAPr/+f/5/wEADgAJAAkABAADAPz//v/6//z/AgABAAsA/v/+/wYACwADAAcAEAD8//v//f8BAAMAAgD9//7/AgD9//n/9f////3/9P8BAA4ACQAQAAgA/f8AAPv/+//9//7/AAD9//P//f/2//D//P8BAP3/AAAKAAMABAAHAP7/BAAMAAMAAwAEAPv/+//+//b/+v/5//b//f////v/9f/v//f/+f/6/wAA+v///+7/8//x/+z/7//1////9P/8//r////8//D/7f/4//v/+P/q/+f/9v/w//T/6f/+//r/8P/1/+f/9//u/+3/9P/w//L/8f/+//n/8f/7/wQA+v/z//j/+P/1//n/8v/y//7/9f/1//P/7v/w//r/9f/v/wIA+v/t//f/AgD3//X/9v/4//z//v/6/+3/+f/8/wUAAAACAPz/9P//////AQDx/wEAAwD8/wIA+v/3//j/BgADAAUABgAGAAkACAACAP7/AAD8/wIA+//3//X/8//+//3//v/4//n/BwADAAEAAQD2//f//f/5//7/9v///wEA+/8CAP3////6//v/8v8EAAwAAAD///n//P/5/wYAAAD6//r//f8AAPn/8//z//X/9v/4//T/+P/z//z/AgD///v/+P8FAAMA//////7//v8AAAcACAABAAkACQABAAkAAgAKAA4AAQD+//n/AQD6/wMA/f/7/wwA//8EAAAAAQAAAAcACwAIAA8ABAAFAAcAAgABAAMA/P///wEAAQD///3/CgAGAAEA//8GAAAAAAAHAAMABQD2////BwD//wIA9v/7//b/+P/+//j/BQAHAAAAAQAEAAYACQD+/wEAAQAKAAMA7v/z//T/BAD4//H/9P/u//H//P/3//L//f/0//r////7/wEA//8AAPr/7f/5//b/+P/3//P/9v/x//f/9P/2//H/8v/8//X/+v/9/+//8v/v//D/+f/x/+7/9////////f/+//3/+f/7//D/9v/3/+z/7v/2//r/8//z/+b/8P/9//b/8//7//r/+P/6//z/+//5//j/8v/3//f/AQAAAAAA/v8BAAgA9v/3//3/+/8CAP//8P/2//r/9P////z/8//4//b/AAAIAAQACQAGAAMAAgACAPv/AQABAPr/CgAFAAUADgACAAQACQAHAAMA+P8AAAEA+/8GAAEA+v8EAAEA/f/5//X//f/0//j/+f/2/wAA/f/6//n//f8CAPv/AQAEAPj/9v/5////AQAKAAEABQAFAP3/BwD//wAA/f/+//L/8P/3//X/AAADAPv/+v8AAAIA9//2/wUAAgAGAAAAAAAAAPv/BAAGAP//+/8AAP3/BQAOAAoADAAUABAAEQAJAAUA/v8BAAUABgANAP/////+/wYAAwABAP7/BgAGAAAA/P/9/wQA/P8GAAgACgABAAcAEQAMAAMAAgD//wAAAwAAAAsAAwD+/wAAAwABAAAA/P//////AADx//r/9P/x/wAA8P/5//L/BgD8//b//P/1//b/9//+//D/8v/4//z/6//q/+f/6f/y//j/7v/o/+r/8P/2//H//P/y//3/9//w/wAAAAD7//n/6//0//v/AAD///n//v/x/wEA+//7//r/8v/0//D/9v/2//L/8v8DAAQA///7//n/+f/9/wIAAgD8/wgABgAEABIADwAJAAcADgAIAAgAAQAGAAQAAgABAPz//v/8/wkAAAD8/wAA+//4//7/AwACAP3//f8AAP7/9P/3////+f/9//f////6//L/9P/6/wEA+f8FAAIAAQACAAMA+f/6/wwA///+/wAAAAD8//7////2//7/+f/3/wQA///0/+7/7f/9//7//f8DAAEAAgAEAP7/+v8GAAoA/f/3//r//f8AAPn/+v////r/AAADAPb/+P8EAAIA/f/+////AAD+//b/7v/q//b/8v/6//b/7P/5//T/+P/3//n/9f/6//f//f8KAAEA//8BAAIA9/8CAAMAAADz//H//P/8/wAA+v/3//f/+//4//H/+f/+//3/BQABAPn/7//5/wMA+//y//L/9P/x//z/8P/+/wAAAgANAAYACAABAAEACgANAAYABwAJAAsACQD9//j/AQD3/wAA///y/wAA+f/6//X/8f/5//X/8P/y//D/8f/1//b/9f/7//v/AAAAAPX/+f/3//7//f8CAPr/+f/5//T//f/1//L/9v8GAP3/AAAAAPv//P/5//X/8v8AAP//BAD3//3/BQADAAMA8P///wcAAQD+/wMACAAGAAYADgAOAAoAEAAOABgAFgARABkAEAAAAAkADgAGAAMAAwD9//7////0//z/9P/x//X/+f////r//P/4/wEABAAFAAIA/P/6//3//f/4/wcACAD//wQACgACAAAAAQD5/wMAAgD4//b/9v/2/+r/7P/7//T/8/8EAPr/+v8CAAEABwAAAAIAAQABAP3/AAD///n/+f/+/wIA/P/1//n/+v8AAAIA/P/1//D/BwD3//j/8f/g//b/9P/0//b/AAD1/wQABQD2//7/AAD//wgADAAEAAIA/f8JAAgACAD+/wQADAABAP//+P/8/wYACAAEAAIAAwAMAAEAAAD2//H////7/wAA+v/8//7/+//9//7/FQAPAPr/9P/4/wMA+P/w/+r/8//1/+//2//d/+P/3v/n/9X/3f/a/+D/5P/t/+3/4f/c/9f/5//Y/+L/2//n/+j/6f8AAOn/8P/w//b//v/1//T/9f/2//b/8f/x//v//////wQACwD9/wIAAAD6//z/8/8HAAUACwAMAP//DQAFAAAABwD//wYADwAKABMADAASABgAAwAHABIAHgAoABcACwAKABEAGQAPAB4AHAAZABMACAAaAAsABAATAAcABwAEAAMADQAKABAAAgAOABIA//8KAAoACgAIAA4ADgAHAAoABgAIAAgAAwACAAcABwD//wsAAQD9//3/9P/8//P/7//0//H/7P8AAPb/+P/5/+7/+v/1//X/7//z/+7/9v/0/+n/7P/o/+z/8P/0/+7/6v/t/+r/8//7/+7///8AAO7/9P/7/+7/6v/q/+7/9v/o//f/5v/k//f/4v/f/+z/7v/m//D/9//6//z/+v8DAAcAAgD7/wEACQAFAAwADgAOABAAFgAcABMAEwAKABMAHAAUABsAFAAMAAQABwAHAPj/CQAMABAAGwAYAB8AJgAfAAwAGAAXABoAGgAVABsACQANABUAJAAYABIAGQAUAAsAEAAYAAMACgAMAP7/9f/1//f/9v/z//D/8v/z//H/6P/o/93/4//5////7P/0/wIA8f/n/+n/8f/n//L/6//q//P/6v/o/9//6v/3//L/6f/n/+b/6//1//b/8P/0//b/+v/6//P/8P/q//H/9v/z/+D/4f/w//D/5f/m//f////9//j//f8EAA8AAwD4//7/+//9/wAA7//k/+j/9P/+//r/+//5//L/7v/7//P/7//5//3/9//x//b/9P/3//b/+f/x/+//8v/t/+3/6f/1//f/7P/v/+X/7v/x//H/9f/w//b/7f8AAPT/6f/w/+b/8f/0/+r/4f/u/+v/4P/j/+f/7f/3//X/8//n/+b/9P/y//H/7f/w//H/8//y/wQAAQD3///////6//X/AQD9/wIA/f/y/////v/4/wEAAQD8/wAAAgAIAAYA/v8FAAUAAwAOAAgAAwAZAB8AFQAjABcADAASABIAEgABABYAFQAOABsACAAUABUACwANABIAFwATAB8AGwAXABsAFwAIAAgADAATABgADQAOAA0AEAALAP7/AwAJAAIAAwAHAAcAAQADAAUACgAKAA0ADQAOABAA//8OAAsAEgARAAwACAACAAsABwAJAAAABAADAPr/+P/+//v/+f/9/wgAAAAOAAgA9/8GAP7/AwABAAUA/P///wAAAgD2//j/BAD9/wAA8/8EAAkA///t/+3/9v////3/AAAAAAEA//8AAAEA//8PAAAAAgD+/wgAAwACAAAA/v8AAPz/AgD//wcABwABAPz/AADx//3/CAALAAAA/P8IAAIABAAAAAAA/P/6//z/BgD5/wMA/P/9/xYACAD8////BQABAAIA7P/r//z/BgD//wAA/P/z//v/6v/u//j/8f/8/wUA+P/7/wEA/f/7/wAA+f/0//T/7P/o/+n/+v/2//H/8v/j//n/7//q//j/6P/v/9n/4v/s/+7/9P/w//z/7//u/+v/8//1/+3/8P/y//v/BAAOAAAA9f///wAAAwD9//3/+v8BAA8AAwALAP//AQABAAAAAAD5/wYACgAMAP//AAD6//f/7v/3//r/9/8HAP3/AwDy//3/BQD//w4AAwAEAAoACgAGAPz/9f/v//j/+v/x//X/+v8AAPf/9//1//X////z//f/8f/1//H/9P/9//L/8//3/wMA//8AAP7/BwAGAAEA+P/4/woABQAIAAYAAQABAAQABQAQAAQAAQABAP7////x//b/8f/s//j/AwD4/wAAAQABAAYACgADAP//DAABABIACAD//wwABgABAAEA8v/1//3/AgACAAAAAwD9/wYA+v8AAAMABwAHAAIACgALABEAEwANABIAIgAHAA0AEgAAAP3/9v/5//b//v/1//D/9v/2//3/9//z//T/+/8EAAAA/P/8//f/9//7//T/AQACAAUACAD4//L/+P/3/+//+//r//3/AADu//T/9P/5//X/+//7////BAAFAAMADgANAA8AFQAGAAsADQANAAcA//8KAP7///8KAP//9//2/wEA///7//f/+/////v/BAAGAAAA//8FAP7///////v//v///wUA/f////7/+v8EAAAA+v/2//b/9v/7//D/5//r/+X/9P/6//n//f8CAAYACQAAAP//AQDt/+7/5P/i//T/6P/l/+7/6f/u/+f/6f/q/93/7f/s/+X/5f/p/+T/2//q/+r/6P/w//X/9//3//v/7v/v//v//v////3/9//1/wAA7f/q//3/AQAAAP7//f/s/+z/9f/o//L/9v/v//7/9f/u//v/9P8EAAsABgAQAAgAGwAHAAcACQD1/wQAAAAEAPj/BAAHAP//AgAPABIABgAGAP3/AwADAAoA/v/7////AAACAP//BQANAAwACgAHAAsAEgAHAAsABQABAAIACwAEAAEADgAIAAsADAAcABcACgAEAAIABQD7//X/+P/9/+3/7v////////////X/+//9/wIA///w//b/8P/x//H/7P/x//3/AQACAA0ABQACAAsABAAAAAEAAAAHAAMA/v/2/wUACQABAAwA9v/4//D/8v/y/+X/8//y////9//7/wgAAgAKAAUADQAYAAgADAAJAAcAGAAhABcADAANABkAGAAKAAgABAAMAP7/+f/2//P/+/////n/9P8FAAwAEgAGABMACQAMABoAEwAKAAgAEgAQAA0AAwANAAMABAD3/+v/8v/w//n////0/+//9//q//n///8NAAoA/v/+//r//v/y//v//P////z/9//y/+3/6v/j/9f/2v/p/+H/+f/z/9//6P/x/+z/4v/0/+n/AAAGAAsADgAAAPz/9f8CAN//7//x//n/AAD3//7/8P////D/+v/z//j////8/wYAAgANAP//CgABAAEA+f/z/w0AAAACAAMA7f/r//D/6v/8//T/8f/9/+v////8////BwABAAEA+P8CAAQAAwAFAAAA9P////z//P/2//H////+/w0ABAAEAP//AQACAPz//v/2/wIAAAAJAPz/6v/2//f/9P/u//H/+v/8/wAA8f/w//P/7v/3//f/8P/g/+n/7v/3//T/7v/y//z//f/u//P/5//9//z/+P/9/+///P8GABAABAACAAcAAgAFAAAA//8LAAMABAD9/wAACgAJABEAAgAeAB8AEQAhABwAFwARABMAGgAkABUAEAAYABQADAAKAAEAAQAKAAgAGAAQABMADwAGAA4ABAD//wMAEAATABQAFAANAAcABgAFAAEA//8MABcAFwAWAA0AFAAGAAAA///3/wIA9f/3//v/+/8KAAEA9v/6//r/BAAUAA4ABAAWAAgABgAKAP7/DAD3/wMAAAADAAcA8P/y/+z/AwDw/9//3v/a/93/6f/z/+v/8P/9//v/9P/+/+z//f8EABEADQAHACEAAgD5//b/+P/3//3/+//z////9v/y/wEA+//8/wwA+/8OABIACQAUABMACQD9/wYA+/8DAA8ABQAMAAgA+v8KAAkAAwAKABIAIAAcAB0AEwATABcAFAAMAAcAEwAQABoAFgAWABQACAAGAPz/9P/4//z/AAADAAAABAD8/wwADAADAAYA//////v/AgD3/wYACQD9////8//v/+f/AgADAPf////x//b/7//z//b/9P8IAP7/9v/u//f//v/3//P/4v/R/9j/4f/Y/+H/8P/0/+7/+//w/+z/8P/u/wEA//8MAAYACQAIAP7/AQD+/wEA//8BAP//AQD//wAAAQAAAAEAAAAAAP//AQD//wEAAAAAAAAAAAABAP//AAAAAAAAAQAAAAAAAQD//wAAAAAAAAAAAAAAAP//AAAAAAEAAAAAAAAA//8AAAAA//8AAAAAAAD//wAA/////wAAAAAAAAAAAQABAAAAAQAAAP//AAAAAAAA//8AAAAAAAAAAAEAAAD//wAAAAAAAAAA/////wEAAAAAAAAAAAAAAAAAAQAAAP//AAAAAAAAAAAAAAEAAAAAAAAAAAABAAEAAAAAAAAA//8AAP///////wAAAQAAAAEA/////wEAAQABAP//AQAAAP///////wAAAAAAAP//AAABAAAA//8AAAAAAAAAAAAAAAABAAAAAAABAAAAAAAAAAEAAAAAAAAAAQAAAP//AAAAAAAAAAABAAAA//8AAAAAAAAAAAAAAAAAAAAAAQABAAAAAQABAAAAAAABAAAAAAABAAAAAAAAAP//AAD//wAAAAAAAAAAAQABAAAA/////wAAAQAAAAAAAAD//wAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAA/////wAAAAAAAAAAAQAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAQAAAAAAAAD//wAAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAABAAAAAAAAAAEAAAAAAAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAA//8AAAAAAAD//wAAAAAAAAEAAAAAAAEAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  respawnAudio.preload = 'auto';

  function stopRespawnAudio() {
    respawnAudio.pause();
    respawnAudio.currentTime = 0;
  }

  function hideRespawnOverlay() {
    stopRespawnAudio();
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
    if (!respawn.active) {
      stopRespawnAudio();
      respawnAudio.play().catch(() => {});
    }
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
    const chatComposer = captureChatComposer();
    disposeLocalDroneLight();
    const zoneSpawn = G?.expedition?.spawn(spawn);
    const point = zoneSpawn || spawn || defaultSpawn();
    const yaw = typeof point.yaw === 'number' ? point.yaw : Math.random() * Math.PI * 2;
    try {
      G.player.reset({
        pos: new THREE.Vector3(point.x, point.y, point.z),
        yaw
      });
      G.player.enabled = true;
      G.player.invulnerable = true;
      unitFlightY = 0;
      unitFlightPrev = null;
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
      if (chatComposerActive()) {
        if (chatComposer && chatComposer.focused && chatComposer.input.isConnected) {
          try {
            chatComposer.input.focus({ preventScroll: true });
            if (chatComposer.start != null) {
              chatComposer.input.setSelectionRange(chatComposer.start, chatComposer.end);
            }
          } catch (err) { /* ignore */ }
        }
        return;
      }
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
    const now = performance.now();
    const alpha = 1 - Math.exp(-dt * 16);
    const turn = Math.min(1, dt * 14);
    const pose = Math.min(1, dt * 10);
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
      else if (distanceSq > 1e-8) avatar.group.position.lerp(avatar.target, alpha);
      else if (distanceSq > 0) avatar.group.position.copy(avatar.target);
      let delta = avatar.targetYaw - avatar.group.rotation.y;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      avatar.group.rotation.y += delta * turn;

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
      const kind = avatar.soldierKind || normalizeSoldier(avatar.data && avatar.data.soldier);
      try { updateAvatarDroneLight(avatar, kind); } catch (err) { /* ignore */ }
      const targetLabelY = isMachine(kind) ? (kind === 'drone' ? 1.35 : 1.05) : 2.28;
      if (avatar.body) {
        avatar.body.rotation.y += (0 - avatar.body.rotation.y) * pose;
        avatar.body.rotation.x += (0 - avatar.body.rotation.x) * pose;
        avatar.body.position.y += (0 - avatar.body.position.y) * pose;
      }
      avatar.label.position.y += (targetLabelY - avatar.label.position.y) * pose;
      if (avatar.hitAt && now - avatar.hitAt < 140) {
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
    const player = G.player;
    const active = player.alive && !respawn.active && !document.hidden &&
      (state === 'playing' || state === 'paused');
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

  function installFlightGuardBoxes() {
    flightGuardBoxes = [];
    flightCollisionBoxes = null;
    flightCollisionBase = null;
    flightCollisionBaseCount = 0;
    const ship = G && G.backdrop && G.backdrop.ship;
    if (!ship || !THREE || typeof THREE.Box3 !== 'function') return;
    try {
      ship.updateWorldMatrix(true, true);
      for (const child of ship.children || []) {
        const box = new THREE.Box3().setFromObject(child);
        if (!box || box.isEmpty()) continue;
        const size = box.getSize(new THREE.Vector3());
        if (size.x < 0.04 || size.y < 0.04 || size.z < 0.04) continue;
        flightGuardBoxes.push({
          min: { x: box.min.x, y: box.min.y, z: box.min.z },
          max: { x: box.max.x, y: box.max.y, z: box.max.z },
          surface: 'metal',
          tag: 'large-ship-flight-guard'
        });
      }
    } catch (err) {
      flightGuardBoxes = [];
    }
  }

  function getFlightCollisionBoxes() {
    const base = G && G.physics && Array.isArray(G.physics.boxes) ? G.physics.boxes : [];
    if (flightCollisionBoxes && flightCollisionBase === base &&
        flightCollisionBaseCount === base.length) {
      return flightCollisionBoxes;
    }
    flightCollisionBase = base;
    flightCollisionBaseCount = base.length;
    flightCollisionBoxes = flightGuardBoxes.length ? base.concat(flightGuardBoxes) : base;
    return flightCollisionBoxes;
  }

  function applyLocalUnitFrame(dt) {
    if (!G || !G.player || !G.camera) return;
    if (window.__saltBoat && window.__saltBoat.riding) return;
    const player = G.player;
    const input = G.input;
    const kind = normalizeSoldier(mySoldier);
    let ground = 0;
    if (!isMachine(kind)) {
      disposeLocalDroneLight();
      unitFlightPrev = null;
      return;
    }

    if (kind === 'drone') {
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
      unitFlightY = Math.max(minY, Math.min(G.expedition?.active ? 225 : G.qingyun?.active ? 110 : 22, unitFlightY));
      const candidate = {
        x: player.pos.x,
        y: unitFlightY,
        z: player.pos.z
      };
      const mapCollision = G.qingyun?.active && G.qingyun.collision;
      const collision = window.SaltFlightCollision;
      if (G.expedition?.active) {
        let resolved = G.expedition.moveDrone(unitFlightPrev, candidate);
        resolved = G.roadSigns?.clipDrone(unitFlightPrev, resolved) || resolved;
        player.pos.copy(resolved);
        unitFlightY = player.pos.y = Math.max(minY, resolved.y);
      } else if (mapCollision) {
        const previous = unitFlightPrev && qingyun.contains(unitFlightPrev) ? unitFlightPrev : player.pos;
        let resolved = mapCollision.moveDrone(previous, candidate, .42);
        resolved = G.roadSigns?.clipDrone(previous, resolved) || resolved;
        player.pos.copy(resolved);
        unitFlightY = player.pos.y = Math.max(minY, resolved.y);
      } else if (collision && G.physics && Array.isArray(G.physics.boxes)) {
        const resolved = collision.resolve(candidate, getFlightCollisionBoxes(), {
          ...FLIGHT_COLLISION,
          previous: unitFlightPrev
        });
        player.pos.x = resolved.x;
        player.pos.z = resolved.z;
        if (typeof collision.clampToBounds === 'function') {
          const wall = collision.clampToBounds(player.pos, FLIGHT_AIR_WALL, FLIGHT_AIR_WALL.padding);
          player.pos.x = wall.x;
          player.pos.z = wall.z;
          if (wall.clampedX) player.vel.x = 0;
          if (wall.clampedZ) player.vel.z = 0;
        }
        unitFlightY = Math.max(minY, Math.min(22, resolved.y));
        player.pos.y = unitFlightY;
        if (resolved.hitWall) {
          if (Math.abs(resolved.x - candidate.x) > 0.0001) player.vel.x = 0;
          if (Math.abs(resolved.z - candidate.z) > 0.0001) player.vel.z = 0;
        }
        if (resolved.blockedUp || resolved.blockedDown) player.vel.y = 0;
      } else {
        player.pos.x = clampNum(player.pos.x, FLIGHT_AIR_WALL.minX + FLIGHT_AIR_WALL.padding, FLIGHT_AIR_WALL.maxX - FLIGHT_AIR_WALL.padding);
        player.pos.z = clampNum(player.pos.z, FLIGHT_AIR_WALL.minZ + FLIGHT_AIR_WALL.padding, FLIGHT_AIR_WALL.maxZ - FLIGHT_AIR_WALL.padding);
        player.pos.y = unitFlightY;
      }
      player.vel.y = 0;
      player.onGround = false;
      player.eye.set(player.pos.x, player.pos.y + 0.9, player.pos.z);
      unitFlightPrev = {
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z
      };
    } else {
      unitFlightY = 0;
      unitFlightPrev = null;
      // Qingyun uses the FPS capsule to preserve vertical velocity during jumps.
      if (!G.qingyun?.active && !G.expedition?.active) {
        try {
          ground = Number(G.physics.groundHeight(player.pos.x, player.pos.z, player.pos.y + 2));
          if (Number.isFinite(ground)) player.pos.y = ground;
        } catch (err) { /* ignore */ }
      }
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
      if (G?.expedition?.active) G.expedition.leave(G.level.playerStart.pos);
      if (G?.qingyun?.active) {
        const start = G.level.playerStart.pos;
        G.qingyun.land(start);
        unitFlightY = 0;
        unitFlightPrev = null;
      }
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

    socket.addEventListener('close', event => {
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
      clearInterval(pingTimer);
      if (event.code === 4403 || event.code === 4404) {
        toast(t(event.code === 4403 ? 'banned' : 'kicked'));
        return;
      }
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
      case 'mapEntered':
      case 'mapReturned': {
        G?.expedition?.acknowledge(msg);
        unitFlightY = 0;
        unitFlightPrev = null;
        reconcileAvatars([]);
        sendState(true);
        break;
      }
      case 'qingyunEntered':
      case 'qingyunReturned': {
        if (G?.qingyun?.collision && G.game.state === 'playing' && G.player.alive && msg.pos) {
          G.qingyun.land(msg.pos);
          unitFlightY = 0;
          unitFlightPrev = null;
          reconcileAvatars([]);
          sendState(true);
        }
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
        if (event && (event.state === 'title' || event.state === 'intro')) {
          stopRespawnAudio();
          send({ type: 'mapLeave' });
          send({ type: 'qingyunLeave' });
        }
      });
    } catch (err) {
      console.error('[mp] failed to hook game:state', err);
    }

    patchCombat();
    installFlightGuardBoxes();
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
    syncState: () => sendState(true),
    send,
    sendBinary,
    refreshSpawns() {
      return send({ type: 'spawns', spawns: spawnsFromLevel() });
    },
    focusDeploy(spawn, protectedUntil) {
      if (!G || !G.player) return false;
      revive(spawn, protectedUntil);
      return true;
    },
    setSoldier(value) {
      const respawnAfterSwitch = shouldRespawnAfterUnitSwitch();
      const nextSoldier = normalizeSoldier(value);
      mySoldier = nextSoldier;
      saveSoldier(mySoldier);
      if (ws && ws.readyState === 1) send({ type: 'soldier', soldier: mySoldier });
      applyUnitSelection();
      if (respawnAfterSwitch && nextSoldier !== 'drone') {
        revive(randomGroundSpawn(), Date.now() + 1200);
      }
      return mySoldier;
    }
  };
})();
