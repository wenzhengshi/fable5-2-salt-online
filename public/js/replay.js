(() => {
  'use strict';

  if (window.SaltReplay) return;

  const i18n = window.__SALT_I18N__ || {};
  const COPY = (i18n.messages && i18n.messages.replay) || {};
  const DB_NAME = 'saltline-replay-db';
  const STORE = 'clips';
  const MAX_CLIPS = 8;
  const MAX_DURATION_MS = 3 * 60 * 1000;
  const MAX_DURATION_SECONDS = MAX_DURATION_MS / 1000;
  const FPS = 30;
  const BITRATE = 4_000_000;
  const MP4_TYPES = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1.42001f',
    'video/mp4'
  ];
  const FALLBACK_TYPES = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  function t(key, vars) {
    const raw = COPY[key];
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function chooseMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    for (const type of MP4_TYPES) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type;
      } catch (err) { /* ignore */ }
    }
    for (const type of FALLBACK_TYPES) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type;
      } catch (err) { /* ignore */ }
    }
    return '';
  }

  const mimeType = chooseMimeType();
  const mp4Supported = MP4_TYPES.some((type) => {
    try { return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type); } catch (err) { return false; }
  });

  const state = {
    clips: [],
    selectedId: null,
    selectedUrl: '',
    recorder: null,
    stream: null,
    chunks: [],
    startedAt: 0,
    endedAt: 0,
    autoStopTimer: 0,
    tickTimer: 0,
    stopPromise: null,
    stopResolve: null,
    memoryOnly: false,
    downloadReadyAt: 0
  };

  function formatTime(ms) {
    const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function formatBytes(bytes) {
    const value = Math.max(0, Number(bytes) || 0);
    if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + ' MB';
    if (value >= 1024) return Math.round(value / 1024) + ' KB';
    return Math.round(value) + ' B';
  }

  function formatDate(timestamp) {
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || 'zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date(timestamp));
    } catch (err) {
      return new Date(timestamp).toLocaleString();
    }
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
    window.clearTimeout(node.__replayToastTimer);
    node.__replayToastTimer = window.setTimeout(() => {
      node.classList.remove('on');
      node.hidden = true;
    }, 2600);
  }

  function gameCanvas() {
    return document.getElementById('view');
  }

  function canRecordCanvas() {
    const canvas = gameCanvas();
    return !!(mimeType && canvas && typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined');
  }

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('indexedDB unavailable'));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('indexedDB open failed'));
    });
  }

  function dbRequest(mode, action) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let request;
      try {
        request = action(store);
      } catch (err) {
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error || new Error('indexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('indexedDB transaction aborted'));
    }));
  }

  async function loadClips() {
    try {
      const rows = await dbRequest('readonly', (store) => store.getAll());
      state.clips = (Array.isArray(rows) ? rows : []).sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      state.memoryOnly = true;
      state.clips = [];
    }
    renderLibrary();
  }

  async function saveClip(clip) {
    state.clips.unshift(clip);
    state.clips.sort((a, b) => b.createdAt - a.createdAt);
    if (state.clips.length > MAX_CLIPS) state.clips.length = MAX_CLIPS;
    try {
      await dbRequest('readwrite', (store) => {
        store.put(clip);
        for (const stale of state.clips.slice(MAX_CLIPS)) store.delete(stale.id);
        return null;
      });
      try {
        const all = await dbRequest('readonly', (store) => store.getAll());
        const keep = new Set(state.clips.map((item) => item.id));
        for (const row of all) if (!keep.has(row.id)) await deleteClip(row.id, false);
      } catch (err) { /* ignore cleanup errors */ }
      state.memoryOnly = false;
    } catch (err) {
      state.memoryOnly = true;
    }
    selectClip(clip.id);
  }

  async function deleteClip(id, refresh = true) {
    state.clips = state.clips.filter((clip) => clip.id !== id);
    if (state.selectedId === id) {
      state.selectedId = null;
      if (state.selectedUrl) URL.revokeObjectURL(state.selectedUrl);
      state.selectedUrl = '';
      const video = document.querySelector('#sr-video');
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    }
    try {
      await dbRequest('readwrite', (store) => store.delete(id));
    } catch (err) { /* memory-only clips still delete from UI */ }
    if (refresh) {
      renderLibrary();
      if (state.clips[0]) selectClip(state.clips[0].id);
    }
  }

  function createUi() {
    const launch = document.createElement('button');
    launch.id = 'sr-launch';
    launch.type = 'button';
    launch.hidden = true;
    launch.innerHTML = '<i aria-hidden="true"></i><span></span><em>F9</em>';
    launch.querySelector('span').textContent = t('launch');
    launch.setAttribute('aria-label', t('launchHint'));
    document.getElementById('app')?.appendChild(launch);

    const recording = document.createElement('div');
    recording.id = 'sr-recording';
    recording.hidden = true;
    recording.setAttribute('role', 'status');
    recording.innerHTML = [
      '<i aria-hidden="true"></i>',
      '<span class="sr-rec-label"></span>',
      '<b id="sr-rec-time">00:00</b>',
      '<button type="button" data-sr-stop></button>'
    ].join('');
    recording.querySelector('.sr-rec-label').textContent = t('recording');
    recording.querySelector('[data-sr-stop]').textContent = t('stop');
    document.getElementById('app')?.appendChild(recording);

    const modal = document.createElement('div');
    modal.id = 'sr-modal';
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="sr-backdrop" data-sr-close></div>',
      '<section class="sr-dialog" role="dialog" aria-modal="true" aria-labelledby="sr-title">',
      '  <header class="sr-head">',
      '    <div><span class="sr-kicker"></span><h2 id="sr-title"></h2><p class="sr-intro"></p></div>',
      '    <button class="sr-close" type="button" data-sr-close aria-label=""></button>',
      '  </header>',
      '  <div class="sr-toolbar">',
      '    <button class="sr-record-btn" type="button" data-sr-record><i></i><span></span></button>',
      '    <div class="sr-toolbar-copy"><b id="sr-status"></b><span id="sr-storage"></span></div>',
      '    <span class="sr-limit" id="sr-limit"></span>',
      '  </div>',
      '  <div class="sr-layout">',
      '    <aside class="sr-library"><div class="sr-library-head"><b id="sr-library-title"></b><span id="sr-count"></span></div><ol id="sr-list"></ol><p id="sr-empty"></p></aside>',
      '    <section class="sr-player">',
      '      <div class="sr-video-wrap"><video id="sr-video" controls playsinline preload="metadata"></video><div id="sr-player-empty"><i></i><b></b><span></span></div></div>',
      '      <div class="sr-meta"><div><b id="sr-clip-name"></b><span id="sr-clip-details"></span></div><div class="sr-actions"><button class="sr-download" type="button"><span></span></button><button class="sr-delete" type="button"></button></div></div>',
      '      <p class="sr-local-note"></p>',
      '    </section>',
      '  </div>',
      '</section>'
    ].join('');
    modal.querySelector('.sr-kicker').textContent = t('kicker');
    modal.querySelector('#sr-title').textContent = t('title');
    modal.querySelector('.sr-intro').textContent = t('intro');
    modal.querySelector('.sr-close').setAttribute('aria-label', t('close'));
    modal.querySelector('.sr-record-btn span').textContent = t('start');
    modal.querySelector('#sr-library-title').textContent = t('library');
    modal.querySelector('#sr-empty').textContent = t('empty');
    modal.querySelector('#sr-player-empty i').textContent = '▶';
    modal.querySelector('#sr-player-empty b').textContent = t('selectHint');
    modal.querySelector('#sr-player-empty span').textContent = t('localOnly');
    modal.querySelector('.sr-download span').textContent = t('download');
    modal.querySelector('.sr-delete').textContent = t('delete');
    modal.querySelector('.sr-local-note').textContent = t('localOnly');
    modal.querySelector('#sr-limit').textContent = t('durationLimit', { minutes: MAX_DURATION_SECONDS / 60 });
    document.getElementById('app')?.appendChild(modal);

    launch.addEventListener('click', openModal);
    recording.querySelector('[data-sr-stop]').addEventListener('click', () => stopRecording());
    modal.querySelector('[data-sr-record]').addEventListener('click', () => {
      if (state.recorder) stopRecording();
      else startRecording();
    });
    modal.querySelectorAll('[data-sr-close]').forEach((node) => node.addEventListener('click', closeModal));
    modal.querySelector('.sr-download').addEventListener('click', (event) => {
      event.preventDefault();
      downloadSelected();
    });
    modal.querySelector('.sr-delete').addEventListener('click', () => {
      const clip = selectedClip();
      if (!clip) return;
      if (window.confirm(t('confirmDelete'))) {
        deleteClip(clip.id).then(() => toast(t('deleted')));
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        event.preventDefault();
        closeModal();
      }
      if (event.code === 'F9' && !event.repeat) {
        const target = event.target;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        event.preventDefault();
        if (state.recorder) stopRecording();
        else startRecording();
      }
    }, true);
    return { launch, recording, modal };
  }

  const ui = createUi();

  function setButtonState() {
    const button = ui.modal.querySelector('[data-sr-record]');
    const label = button.querySelector('span');
    const recording = !!state.recorder;
    button.classList.toggle('is-recording', recording);
    label.textContent = recording ? t('stop') : t('start');
    button.disabled = !canRecordCanvas();
    const status = ui.modal.querySelector('#sr-status');
    if (!mimeType) status.textContent = t('unsupported');
    else if (!mp4Supported) status.textContent = t('fallbackFormat');
    else if (recording) status.textContent = t('recordingHint');
    else status.textContent = t('ready');
  }

  function openModal() {
    ui.modal.hidden = false;
    requestAnimationFrame(() => {
      ui.modal.classList.add('open');
      updateStorage();
      renderLibrary();
      setButtonState();
      ui.modal.querySelector('[data-sr-record]').focus({ preventScroll: true });
    });
  }

  function closeModal() {
    ui.modal.classList.remove('open');
    window.setTimeout(() => {
      if (!ui.modal.classList.contains('open')) ui.modal.hidden = true;
    }, 180);
  }

  function selectedClip() {
    return state.clips.find((clip) => clip.id === state.selectedId) || null;
  }

  function selectClip(id) {
    const clip = state.clips.find((item) => item.id === id);
    if (!clip) return;
    state.selectedId = clip.id;
    if (state.selectedUrl) URL.revokeObjectURL(state.selectedUrl);
    state.selectedUrl = URL.createObjectURL(clip.blob);
    const video = ui.modal.querySelector('#sr-video');
    video.src = state.selectedUrl;
    video.load();
    ui.modal.querySelector('#sr-player-empty').hidden = true;
    const download = ui.modal.querySelector('.sr-download');
    download.hidden = false;
    ui.modal.querySelector('.sr-delete').hidden = false;
    ui.modal.querySelector('#sr-clip-name').textContent = clip.fileName;
    ui.modal.querySelector('#sr-clip-details').textContent = t('clipDetails', {
      duration: formatTime(clip.durationMs),
      size: formatBytes(clip.size),
      date: formatDate(clip.createdAt)
    });
    renderLibrary();
  }

  function renderLibrary() {
    const list = ui.modal.querySelector('#sr-list');
    if (!list) return;
    list.innerHTML = '';
    ui.modal.querySelector('#sr-count').textContent = String(state.clips.length);
    for (const clip of state.clips) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sr-item' + (clip.id === state.selectedId ? ' is-active' : '');
      button.innerHTML = '<i>REC</i><span><b></b><em></em></span><small></small>';
      button.querySelector('b').textContent = clip.fileName;
      button.querySelector('em').textContent = clip.unit || t('unknownUnit');
      button.querySelector('small').textContent = formatTime(clip.durationMs) + ' · ' + formatBytes(clip.size);
      button.addEventListener('click', () => selectClip(clip.id));
      item.appendChild(button);
      list.appendChild(item);
    }
    ui.modal.querySelector('#sr-empty').hidden = state.clips.length > 0;
    const hasClip = !!selectedClip();
    ui.modal.querySelector('#sr-player-empty').hidden = hasClip;
    ui.modal.querySelector('.sr-download').hidden = !hasClip;
    ui.modal.querySelector('.sr-delete').hidden = !hasClip;
  }

  async function updateStorage() {
    const node = ui.modal.querySelector('#sr-storage');
    let text = t('localOnly');
    try {
      if (navigator.storage && typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        if (estimate && Number(estimate.usage) >= 0) {
          text = t('storage', {
            used: formatBytes(estimate.usage),
            total: formatBytes(estimate.quota)
          });
        }
      }
    } catch (err) { /* ignore */ }
    if (state.memoryOnly) text = t('memoryOnly');
    node.textContent = text;
  }

  function recordingUnit() {
    try {
      const soldier = window.__mp && window.__mp.soldier;
      const labels = (i18n.messages && i18n.messages.soldierSelect) || {};
      const keys = {
        classic: 'classicName',
        male: 'maleName',
        female: 'femaleName',
        hound: 'houndName',
        drone: 'droneName'
      };
      return soldier && labels[keys[soldier]] ? labels[keys[soldier]] : 'SALTLINE';
    } catch (err) {
      return 'SALTLINE';
    }
  }

  function startRecording() {
    if (state.recorder) return Promise.resolve(selectedClip());
    if (!canRecordCanvas()) {
      toast(t('unsupported'));
      setButtonState();
      return Promise.resolve(null);
    }
    const stream = gameCanvas().captureStream(FPS);
    const options = { mimeType, videoBitsPerSecond: BITRATE };
    let recorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (err) {
      try { recorder = new MediaRecorder(stream); } catch (fallbackErr) {
        stream.getTracks().forEach((track) => track.stop());
        toast(t('startFailed'));
        return Promise.resolve(null);
      }
    }
    state.stream = stream;
    state.recorder = recorder;
    state.chunks = [];
    state.startedAt = Date.now();
    state.endedAt = 0;
    state.stopPromise = new Promise((resolve) => { state.stopResolve = resolve; });
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) state.chunks.push(event.data);
    });
    recorder.addEventListener('error', (event) => {
      console.error('[replay] recorder failed', event.error || event);
      toast(t('startFailed'));
      stopRecording();
    });
    recorder.addEventListener('stop', finalizeRecording);
    recorder.start(1000);
    closeModal();
    ui.recording.hidden = false;
    updateRecordingUi();
    state.tickTimer = window.setInterval(updateRecordingUi, 250);
    state.autoStopTimer = window.setTimeout(() => stopRecording(), MAX_DURATION_MS);
    setButtonState();
    return Promise.resolve(null);
  }

  function updateRecordingUi() {
    if (!state.recorder) return;
    const elapsed = Math.min(MAX_DURATION_MS, Date.now() - state.startedAt);
    const clock = ui.recording.querySelector('#sr-rec-time');
    if (clock) clock.textContent = formatTime(elapsed);
    ui.recording.classList.toggle('is-ending', elapsed >= MAX_DURATION_MS - 30000);
  }

  function stopRecording() {
    if (!state.recorder) return Promise.resolve(selectedClip());
    const recorder = state.recorder;
    window.clearInterval(state.tickTimer);
    window.clearTimeout(state.autoStopTimer);
    state.tickTimer = 0;
    state.autoStopTimer = 0;
    try {
      if (recorder.state !== 'inactive') recorder.stop();
    } catch (err) {
      state.recorder = null;
      ui.recording.hidden = true;
      if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
    return state.stopPromise || Promise.resolve(null);
  }

  async function finalizeRecording() {
    const recorder = state.recorder;
    const durationMs = Math.max(1000, Math.min(MAX_DURATION_MS, (state.endedAt || Date.now()) - state.startedAt));
    state.endedAt = Date.now();
    state.recorder = null;
    state.resume = false;
    ui.recording.hidden = true;
    if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
    window.clearInterval(state.tickTimer);
    window.clearTimeout(state.autoStopTimer);
    const actualType = (recorder && recorder.mimeType) || mimeType || 'video/mp4';
    const blob = new Blob(state.chunks, { type: actualType });
    state.chunks = [];
    if (blob.size < 512) {
      toast(t('emptyRecording'));
      if (state.stopResolve) state.stopResolve(null);
      state.stopResolve = null;
      state.stopPromise = null;
      setButtonState();
      return;
    }
    const now = new Date();
    const stamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '-' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const extension = /mp4/i.test(actualType) ? 'mp4' : 'webm';
    const clip = {
      id: 'replay_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: Date.now(),
      durationMs,
      size: blob.size,
      mimeType: actualType,
      blob,
      unit: recordingUnit(),
      fileName: 'saltline-replay-' + stamp + '.' + extension
    };
    await saveClip(clip);
    toast(t(/mp4/i.test(actualType) ? 'savedMp4' : 'savedWebm'));
    if (state.stopResolve) state.stopResolve(clip);
    state.stopResolve = null;
    state.stopPromise = null;
    setButtonState();
  }

  function downloadSelected() {
    const clip = selectedClip();
    if (!clip) return;
    const now = Date.now();
    if (now < state.downloadReadyAt) return;
    state.downloadReadyAt = now + 600;
    const url = URL.createObjectURL(clip.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = clip.fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast(t('downloaded'));
  }

  function refreshLaunchVisibility() {
    const ready = !!gameCanvas() && !!window.__ready;
    ui.launch.hidden = !ready;
    if (ready) setButtonState();
  }

  window.setInterval(refreshLaunchVisibility, 500);
  refreshLaunchVisibility();
  loadClips().then(() => {
    if (state.clips[0]) selectClip(state.clips[0].id);
  });

  window.SaltReplay = {
    get supported() { return canRecordCanvas(); },
    get mp4Supported() { return mp4Supported; },
    get recording() { return !!state.recorder; },
    get clips() { return state.clips.slice(); },
    start: startRecording,
    stop: stopRecording,
    open: openModal,
    close: closeModal,
    download: downloadSelected
  };
})();
