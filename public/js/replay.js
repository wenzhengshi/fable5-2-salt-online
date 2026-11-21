(() => {
  'use strict';

  if (window.SaltReplay) return;

  const i18n = window.__SALT_I18N__ || {};
  const COPY = (i18n.messages && i18n.messages.replay) || {};
  const DB_NAME = 'saltline-replay-db';
  const STORE = 'clips';
  const MAX_CLIPS = 8;
  const MAX_PHOTOS = 12;
  const MAX_DURATION_MS = 3 * 60 * 1000;
  const MAX_DURATION_SECONDS = MAX_DURATION_MS / 1000;
  const FPS = 30;
  const BITRATE = 4_000_000;
  const AUDIO_BITRATE = 128_000;
  const MP4_AUDIO_TYPES = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.42001f,mp4a.40.2',
    'video/mp4'
  ];
  const MP4_TYPES = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1.42001f',
    'video/mp4'
  ];
  const FALLBACK_AUDIO_TYPES = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const FALLBACK_TYPES = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  function detectWeChatBrowser() {
    try {
      const ua = String(navigator.userAgent || '');
      return /MicroMessenger/i.test(ua) ||
        /WeChat/i.test(ua) ||
        typeof window.WeixinJSBridge !== 'undefined';
    } catch (err) {
      return false;
    }
  }

  const IS_WECHAT = detectWeChatBrowser();

  function t(key, vars) {
    const raw = COPY[key];
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function chooseMimeType(withAudio) {
    if (typeof MediaRecorder === 'undefined') return '';
    const preferred = withAudio ? MP4_AUDIO_TYPES.concat(MP4_TYPES) : MP4_TYPES;
    for (const type of preferred) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type;
      } catch (err) { /* ignore */ }
    }
    const fallback = withAudio ? FALLBACK_AUDIO_TYPES.concat(FALLBACK_TYPES) : FALLBACK_TYPES;
    for (const type of fallback) {
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
    starting: false,
    takingPhoto: false,
    memoryOnly: false,
    downloadReadyAt: 0,
    hasAudio: false
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
    const view = document.getElementById('view');
    return view?.tagName === 'CANVAS' ? view : view?.querySelector('canvas');
  }

  function isPhoto(clip) {
    return clip.kind === 'photo';
  }

  function fileStamp(now) {
    return now.getFullYear() + [now.getMonth() + 1, now.getDate()].map(twoDigits).join('') +
      '-' + [now.getHours(), now.getMinutes(), now.getSeconds()].map(twoDigits).join('');
  }

  function twoDigits(value) {
    return String(value).padStart(2, '0');
  }

  function canRecordCanvas() {
    const canvas = gameCanvas();
    return !!(mimeType && canvas && typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined');
  }

  function gameAudioStream() {
    try {
      const tap = window.SaltAudioTap;
      if (!tap || !tap.supported || typeof tap.streamForGame !== 'function') return null;
      const stream = tap.streamForGame(window.__G);
      return stream && stream.getAudioTracks().length ? stream : null;
    } catch (err) {
      return null;
    }
  }

  function addAudioTracks(stream) {
    const source = gameAudioStream();
    if (!source) return 0;
    let added = 0;
    for (const track of source.getAudioTracks()) {
      if (track.readyState !== 'live') continue;
      try {
        stream.addTrack(track.clone());
        added += 1;
      } catch (err) { /* continue with video only */ }
    }
    return added;
  }

  async function confirmWeChatRecording() {
    if (!IS_WECHAT) return true;
    if (!window.SaltModal || typeof window.SaltModal.confirm !== 'function') {
      console.warn('[replay] custom modal unavailable; skipping WeChat confirmation');
      return true;
    }
    return window.SaltModal.confirm({
      tone: 'warning',
      kicker: t('kicker'),
      title: t('wechatTitle'),
      message: t('wechatWarning'),
      confirmText: t('wechatContinue'),
      cancelText: t('wechatCancel'),
      focus: 'cancel'
    });
  }

  function confirmDeleteClip(clip) {
    if (!window.SaltModal || typeof window.SaltModal.confirm !== 'function') {
      console.warn('[replay] custom modal unavailable; delete confirmation cancelled');
      return Promise.resolve(false);
    }
    return window.SaltModal.confirm({
      tone: 'danger',
      kicker: t('kicker'),
      title: t(isPhoto(clip) ? 'photoDeleteTitle' : 'deleteTitle'),
      message: t('deleteMessage', { name: clip.fileName }),
      confirmText: t('deleteConfirm'),
      cancelText: t('cancel'),
      focus: 'cancel'
    });
  }

  function highlightWeChatWarning() {
    const warning = ui.modal.querySelector('#sr-wechat-warning');
    if (!warning || warning.hidden) return;
    warning.classList.remove('is-pulsing');
    void warning.offsetWidth;
    warning.classList.add('is-pulsing');
    try {
      warning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) { /* ignore */ }
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
        tx.abort();
        db.close();
        reject(err);
        return;
      }
      tx.oncomplete = () => {
        db.close();
        resolve(request ? request.result : undefined);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error('indexedDB transaction aborted'));
      };
    }));
  }

  function sortAndLimit(rows) {
    const sorted = rows.slice().sort((a, b) => b.createdAt - a.createdAt);
    let photos = 0;
    let videos = 0;
    return sorted.filter((row) => isPhoto(row) ? ++photos <= MAX_PHOTOS : ++videos <= MAX_CLIPS);
  }

  async function loadClips() {
    try {
      const rows = await dbRequest('readonly', (store) => store.getAll());
      state.clips = sortAndLimit(Array.isArray(rows) ? rows : []);
    } catch (err) {
      state.memoryOnly = true;
    }
    renderLibrary();
  }

  async function saveClip(clip) {
    await libraryReady;
    state.clips = sortAndLimit([clip, ...state.clips]);
    try {
      await dbRequest('readwrite', (store) => {
        store.put(clip);
        const request = store.getAll();
        request.onsuccess = () => {
          const rows = request.result;
          const keep = new Set(sortAndLimit(rows).map((row) => row.id));
          for (const row of rows) if (!keep.has(row.id)) store.delete(row.id);
        };
      });
      state.memoryOnly = false;
    } catch (err) {
      state.memoryOnly = true;
    }
    selectClip(clip.id);
    return !state.memoryOnly;
  }

  async function deleteClip(id) {
    state.clips = state.clips.filter((clip) => clip.id !== id);
    if (state.selectedId === id) clearSelection();
    try {
      await dbRequest('readwrite', (store) => store.delete(id));
    } catch (err) { /* memory-only clips still delete from UI */ }
    if (state.clips[0]) selectClip(state.clips[0].id);
    else renderLibrary();
  }

  function clearSelection() {
    state.selectedId = null;
    if (state.selectedUrl) URL.revokeObjectURL(state.selectedUrl);
    state.selectedUrl = '';
    const video = document.querySelector('#sr-video');
    if (video?.hasAttribute('src')) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    const image = document.querySelector('#sr-photo');
    image?.removeAttribute('src');
    if (image) image.hidden = true;
    ui.modal.querySelector('#sr-player-empty').hidden = false;
    ui.modal.querySelector('.sr-download').hidden = true;
    ui.modal.querySelector('.sr-delete').hidden = true;
  }

  function createUi() {
    const tools = document.createElement('div');
    tools.id = 'sr-tools';
    const launch = document.createElement('button');
    launch.id = 'sr-launch';
    launch.type = 'button';
    launch.hidden = true;
    launch.innerHTML = '<i aria-hidden="true"></i><span></span><em>F9</em>';
    launch.querySelector('span').textContent = t('launch');
    launch.setAttribute('aria-label', t('launchHint'));
    const photo = document.createElement('button');
    photo.id = 'sr-camera';
    photo.type = 'button';
    photo.hidden = true;
    photo.title = t('photoHint');
    photo.setAttribute('aria-label', t('photoHint'));
    photo.innerHTML = '<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="3.5"/></svg>';
    tools.append(launch, photo);
    document.getElementById('app')?.appendChild(tools);

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
      '  <div class="sr-wechat-warning" id="sr-wechat-warning" role="alert" hidden>',
      '    <i aria-hidden="true">!</i>',
      '    <div><b></b><p></p></div>',
      '  </div>',
      '  <div class="sr-toolbar">',
      '    <button class="sr-record-btn" type="button" data-sr-record><i></i><span></span></button>',
      '    <div class="sr-toolbar-copy"><b id="sr-status"></b><span id="sr-storage"></span></div>',
      '    <span class="sr-limit" id="sr-limit"></span>',
      '  </div>',
      '  <div class="sr-layout">',
      '    <aside class="sr-library"><div class="sr-library-head"><b id="sr-library-title"></b><span id="sr-count"></span></div><ol id="sr-list"></ol><p id="sr-empty"></p></aside>',
      '    <section class="sr-player">',
      '      <div class="sr-video-wrap"><video id="sr-video" controls playsinline preload="metadata"></video><img id="sr-photo" hidden /><div id="sr-player-empty"><i></i><b></b><span></span></div></div>',
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
    modal.querySelector('#sr-wechat-warning b').textContent = t('wechatTitle');
    modal.querySelector('#sr-wechat-warning p').textContent = t('wechatWarning');
    modal.querySelector('#sr-wechat-warning').hidden = !IS_WECHAT;
    modal.dataset.wechat = IS_WECHAT ? '1' : '0';
    modal.querySelector('.sr-record-btn span').textContent = t('start');
    modal.querySelector('#sr-library-title').textContent = t('library');
    modal.querySelector('#sr-empty').textContent = t('empty');
    modal.querySelector('#sr-photo').alt = t('photoPreview');
    modal.querySelector('#sr-player-empty i').textContent = '▶';
    modal.querySelector('#sr-player-empty b').textContent = t('selectHint');
    modal.querySelector('#sr-player-empty span').textContent = t('localOnly');
    modal.querySelector('.sr-download span').textContent = t('download');
    modal.querySelector('.sr-delete').textContent = t('delete');
    modal.querySelector('.sr-local-note').textContent = t('localOnly');
    modal.querySelector('#sr-limit').textContent = t('durationLimit', { minutes: MAX_DURATION_SECONDS / 60 });
    document.getElementById('app')?.appendChild(modal);

    launch.addEventListener('click', openModal);
    photo.addEventListener('click', takePhoto);
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
    modal.querySelector('.sr-delete').addEventListener('click', async () => {
      const clip = selectedClip();
      if (!clip) return;
      const allowed = await confirmDeleteClip(clip);
      if (!allowed) return;
      deleteClip(clip.id).then(() => toast(t(isPhoto(clip) ? 'photoDeleted' : 'deleted')));
    });
    document.addEventListener('keydown', (event) => {
      if (window.SaltModal && window.SaltModal.isOpen) return;
      if (event.key === 'Escape' && !modal.hidden) {
        event.preventDefault();
        closeModal();
      }
      if (event.code === 'F8' && !event.repeat && modal.hidden && !photo.hidden) {
        if (event.target?.closest?.('input, textarea, select, [contenteditable]')) return;
        event.preventDefault();
        takePhoto();
      }
      if (event.code === 'F9' && !event.repeat) {
        const target = event.target;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        event.preventDefault();
        if (state.recorder) stopRecording();
        else startRecording();
      }
    }, true);
    return { launch, photo, recording, modal };
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
    else if (recording) status.textContent = t('recordingHint');
    else if (IS_WECHAT) status.textContent = t('wechatStatus');
    else if (!mp4Supported) status.textContent = t('fallbackFormat');
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
    const image = ui.modal.querySelector('#sr-photo');
    image.hidden = !isPhoto(clip);
    if (isPhoto(clip)) {
      if (video.hasAttribute('src')) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      image.src = state.selectedUrl;
    } else {
      image.removeAttribute('src');
      video.src = state.selectedUrl;
      video.load();
    }
    ui.modal.querySelector('#sr-player-empty').hidden = true;
    const download = ui.modal.querySelector('.sr-download');
    download.hidden = false;
    ui.modal.querySelector('.sr-delete').hidden = false;
    ui.modal.querySelector('#sr-clip-name').textContent = clip.fileName;
    ui.modal.querySelector('#sr-clip-details').textContent = t(isPhoto(clip) ? 'photoDetails' : (clip.hasAudio ? 'clipDetailsAudio' : 'clipDetails'), {
      duration: formatTime(clip.durationMs),
      size: formatBytes(clip.size),
      date: formatDate(clip.createdAt),
      width: clip.width,
      height: clip.height
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
      button.innerHTML = '<i></i><span><b></b><em></em></span><small></small>';
      button.querySelector('i').textContent = isPhoto(clip) ? 'PNG' : 'REC';
      button.querySelector('b').textContent = clip.fileName;
      button.querySelector('em').textContent = clip.unit || t('unknownUnit');
      button.querySelector('small').textContent = isPhoto(clip)
        ? formatBytes(clip.size)
        : formatTime(clip.durationMs) + ' · ' + formatBytes(clip.size);
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

  async function startRecording() {
    if (state.recorder || state.starting) return selectedClip();
    if (!canRecordCanvas()) {
      toast(t('unsupported'));
      setButtonState();
      return null;
    }
    state.starting = true;
    let allowed = false;
    try {
      allowed = await confirmWeChatRecording();
    } finally {
      state.starting = false;
    }
    if (!allowed) {
      if (ui.modal.hidden) openModal();
      else highlightWeChatWarning();
      return null;
    }
    if (state.recorder) return selectedClip();
    const videoStream = gameCanvas().captureStream(FPS);
    const stream = new MediaStream(videoStream.getVideoTracks());
    const audioTracks = addAudioTracks(stream);
    const selectedMimeType = chooseMimeType(audioTracks > 0) || mimeType;
    const options = { mimeType: selectedMimeType, videoBitsPerSecond: BITRATE };
    if (audioTracks > 0) options.audioBitsPerSecond = AUDIO_BITRATE;
    let recorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (err) {
      const fallbackOptions = { videoBitsPerSecond: BITRATE };
      if (audioTracks > 0) fallbackOptions.audioBitsPerSecond = AUDIO_BITRATE;
      try { recorder = new MediaRecorder(stream, fallbackOptions); } catch (fallbackErr) {
        stream.getTracks().forEach((track) => track.stop());
        toast(t('startFailed'));
        return null;
      }
    }
    state.stream = stream;
    state.recorder = recorder;
    state.hasAudio = audioTracks > 0;
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
    return null;
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
    const hasAudio = state.hasAudio;
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
      state.hasAudio = false;
      toast(t('emptyRecording'));
      if (state.stopResolve) state.stopResolve(null);
      state.stopResolve = null;
      state.stopPromise = null;
      setButtonState();
      return;
    }
    const now = new Date();
    const extension = /mp4/i.test(actualType) ? 'mp4' : 'webm';
    const clip = {
      id: 'replay_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: Date.now(),
      durationMs,
      size: blob.size,
      mimeType: actualType,
      blob,
      hasAudio,
      unit: recordingUnit(),
      fileName: 'saltline-replay-' + fileStamp(now) + '.' + extension
    };
    await saveClip(clip);
    if (IS_WECHAT) {
      toast(t(/mp4/i.test(actualType) ? 'savedMp4Wechat' : 'savedWebmWechat'));
      highlightWeChatWarning();
    } else {
      toast(t(/mp4/i.test(actualType) ? 'savedMp4' : 'savedWebm'));
    }
    if (state.stopResolve) state.stopResolve(clip);
    state.stopResolve = null;
    state.stopPromise = null;
    state.hasAudio = false;
    setButtonState();
  }

  function captureNextFrame(game, canvas) {
    return new Promise((resolve, reject) => {
      const capture = () => {
        delete game.captureScreenshotFrame;
        window.clearTimeout(timer);
        const width = canvas.width;
        const height = canvas.height;
        try {
          canvas.toBlob((blob) => {
            if (blob?.size) resolve({ blob, width, height });
            else reject(new Error('Empty screenshot'));
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      const timer = window.setTimeout(() => {
        if (game.captureScreenshotFrame === capture) delete game.captureScreenshotFrame;
        reject(new Error('No rendered frame'));
      }, 2500);
      game.captureScreenshotFrame = capture;
    });
  }

  async function takePhoto() {
    if (state.takingPhoto) return;
    const game = window.__G;
    const canvas = gameCanvas();
    if (!window.__ready || !game || typeof canvas?.toBlob !== 'function') return;
    const now = new Date();
    const createdAt = now.getTime();
    state.takingPhoto = true;
    ui.photo.disabled = true;
    try {
      const { blob, width, height } = await captureNextFrame(game, canvas);
      const saved = await saveClip({
        id: 'photo_' + createdAt.toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        kind: 'photo',
        createdAt,
        width,
        height,
        size: blob.size,
        blob,
        unit: recordingUnit(),
        fileName: 'saltline-photo-' + fileStamp(now) + '-' + String(now.getMilliseconds()).padStart(3, '0') + '.png'
      });
      toast(t(saved ? 'photoSaved' : 'photoMemoryOnly'));
    } catch (err) {
      toast(t('photoFailed'));
    } finally {
      state.takingPhoto = false;
      ui.photo.disabled = false;
    }
  }

  function downloadSelected() {
    const clip = selectedClip();
    if (!clip) return;
    if (IS_WECHAT) {
      if (!isPhoto(clip)) highlightWeChatWarning();
      toast(t(isPhoto(clip) ? 'photoWechatSave' : 'wechatDownloadBlocked'));
      return;
    }
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
    toast(t(isPhoto(clip) ? 'photoDownloaded' : 'downloaded'));
  }

  function refreshLaunchVisibility() {
    const ready = !!gameCanvas() && !!window.__ready;
    ui.launch.hidden = !ready;
    ui.photo.hidden = !ready || typeof gameCanvas()?.toBlob !== 'function';
    if (ready) setButtonState();
  }

  window.setInterval(refreshLaunchVisibility, 500);
  refreshLaunchVisibility();
  const libraryReady = loadClips().then(() => {
    if (state.clips[0]) selectClip(state.clips[0].id);
  });

  window.SaltReplay = {
    async refresh() {
      await libraryReady;
      if (state.memoryOnly) return;
      await loadClips();
      if (selectedClip()) return;
      clearSelection();
      if (state.clips[0]) selectClip(state.clips[0].id);
    },
    get supported() { return canRecordCanvas(); },
    get mp4Supported() { return mp4Supported; },
    get wechat() { return IS_WECHAT; },
    get recording() { return !!state.recorder; },
    get clips() { return state.clips.slice(); },
    start: startRecording,
    stop: stopRecording,
    open: openModal,
    close: closeModal,
    download: downloadSelected,
    takePhoto
  };
})();
