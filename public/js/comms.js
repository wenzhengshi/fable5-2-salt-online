(() => {
  'use strict';

  const config = window.__SALT_I18N__ || {};
  const messages = config.messages || {};
  const dictionary = messages.comms || {};
  const uiRoot = document.getElementById('ui');
  const mp = window.__mp;
  if (!uiRoot || !mp) return;

  const MAX_TEXT = 80;
  const BANNER_MS = 6200;
  const OUT_RATE = 16000;
  const OUT_FRAME_SAMPLES = 320;
  const MAX_AHEAD = 0.8;
  const VOICE_MAGIC = 0x56;
  const MUTE_KEY = 'saltline.voice.incomingMuted';

  function t(key, vars) {
    const raw = dictionary[key];
    const text = typeof raw === 'string' ? raw : key;
    return text.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function toast(text) {
    if (typeof mp.toast === 'function') mp.toast(text);
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_TEXT);
  }

  const ui = document.createElement('div');
  ui.id = 'vc-ui';
  ui.innerHTML = `
    <div class="vc-banner" id="vc-banner" hidden aria-live="polite">
      <div class="vc-banner-card">
        <div class="vc-banner-kicker"><span class="vc-banner-signal"></span><span data-vc-label="bigText"></span></div>
        <div class="vc-banner-name" id="vc-banner-name"></div>
        <div class="vc-banner-text" id="vc-banner-text"></div>
      </div>
    </div>
    <div class="vc-rail" id="vc-rail">
      <button class="vc-mic" id="vc-mic" type="button" aria-pressed="false">
        <span class="vc-mic-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img"><path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"/><path d="M5.5 11.7a6.5 6.5 0 0 0 13 0M12 18.2V22M8.4 22h7.2"/></svg>
        </span>
        <span class="vc-mic-copy"><b id="vc-mic-label"></b><em id="vc-mic-hint"></em></span>
        <span class="vc-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
      </button>
      <button class="vc-listen" id="vc-listen" type="button" aria-pressed="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5.5 6.5 9H4v6h2.5L11 18.5v-13Z"/><path class="vc-listen-waves" d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11"/><path class="vc-listen-slash" d="M4 4l16 16"/></svg>
      </button>
      <button class="vc-chat-toggle" id="vc-chat-toggle" type="button" aria-expanded="false">
        <span class="vc-aa" aria-hidden="true">Aa</span>
        <span class="vc-chat-copy"><b data-vc-label="bigText"></b><em id="vc-chat-shortcut"></em></span>
      </button>
      <span class="vc-voice-count" id="vc-voice-count" hidden>0</span>
    </div>
    <section class="vc-panel" id="vc-panel" hidden aria-label="Big text channel">
      <header class="vc-panel-head">
        <div>
          <span class="vc-kicker" data-vc-label="kicker"></span>
          <h2 id="vc-panel-title"></h2>
          <p id="vc-panel-subtitle"></p>
        </div>
        <button class="vc-close" id="vc-close" type="button">×</button>
      </header>
      <div class="vc-moderation" role="note">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.2 5.3 6v5c0 4.3 2.8 8.2 6.7 9.5 3.9-1.3 6.7-5.2 6.7-9.5V6L12 3.2Z" />
          <path d="m9.1 12 1.9 1.9 3.9-4.2" />
        </svg>
        <span data-vc-label="moderationNote"></span>
      </div>
      <div class="vc-voice-block">
        <div class="vc-voice-head">
          <b data-vc-label="voice"></b>
          <span id="vc-voice-summary"></span>
          <button class="vc-voice-mute" id="vc-voice-mute" type="button" hidden></button>
          <button class="vc-voice-off" id="vc-voice-off" type="button" hidden></button>
        </div>
        <div class="vc-peers" id="vc-peers"></div>
        <p class="vc-voice-hint" id="vc-voice-hint"></p>
      </div>
      <div class="vc-quick-block">
        <div class="vc-section-label" data-vc-label="quick"></div>
        <div class="vc-quick" id="vc-quick"></div>
      </div>
      <form class="vc-form" id="vc-form">
        <div class="vc-input-wrap">
          <input id="vc-input" maxlength="80" autocomplete="off" spellcheck="false" />
          <span class="vc-count" id="vc-count">0/80</span>
        </div>
        <button class="vc-send" id="vc-send" type="submit"><span data-vc-label="send"></span><kbd>↵</kbd></button>
      </form>
      <div class="vc-history-wrap">
        <div class="vc-history-head">
          <span class="vc-section-label" data-vc-label="recent"></span>
          <span class="vc-history-total" id="vc-history-total"></span>
        </div>
        <p class="vc-history-hint" id="vc-history-hint"></p>
        <div class="vc-history-scroll" id="vc-history-scroll">
          <ol class="vc-history" id="vc-history"></ol>
          <button class="vc-history-more" id="vc-history-more" type="button" hidden></button>
        </div>
        <p class="vc-empty" id="vc-empty"></p>
      </div>
    </section>
    <div class="vc-audio" id="vc-audio" aria-hidden="true"></div>
  `;
  uiRoot.appendChild(ui);

  const el = {
    banner: ui.querySelector('#vc-banner'),
    bannerName: ui.querySelector('#vc-banner-name'),
    bannerText: ui.querySelector('#vc-banner-text'),
    rail: ui.querySelector('#vc-rail'),
    mic: ui.querySelector('#vc-mic'),
    micLabel: ui.querySelector('#vc-mic-label'),
    micHint: ui.querySelector('#vc-mic-hint'),
    listen: ui.querySelector('#vc-listen'),
    chatToggle: ui.querySelector('#vc-chat-toggle'),
    chatShortcut: ui.querySelector('#vc-chat-shortcut'),
    voiceCount: ui.querySelector('#vc-voice-count'),
    panel: ui.querySelector('#vc-panel'),
    panelTitle: ui.querySelector('#vc-panel-title'),
    panelSubtitle: ui.querySelector('#vc-panel-subtitle'),
    close: ui.querySelector('#vc-close'),
    voiceSummary: ui.querySelector('#vc-voice-summary'),
    voiceMute: ui.querySelector('#vc-voice-mute'),
    voiceOff: ui.querySelector('#vc-voice-off'),
    peers: ui.querySelector('#vc-peers'),
    voiceHint: ui.querySelector('#vc-voice-hint'),
    quick: ui.querySelector('#vc-quick'),
    form: ui.querySelector('#vc-form'),
    input: ui.querySelector('#vc-input'),
    send: ui.querySelector('#vc-send'),
    count: ui.querySelector('#vc-count'),
    history: ui.querySelector('#vc-history'),
    historyScroll: ui.querySelector('#vc-history-scroll'),
    historyMore: ui.querySelector('#vc-history-more'),
    historyTotal: ui.querySelector('#vc-history-total'),
    historyHint: ui.querySelector('#vc-history-hint'),
    empty: ui.querySelector('#vc-empty'),
    audio: ui.querySelector('#vc-audio')
  };

  const labels = {
    kicker: t('kicker'),
    bigText: t('bigText'),
    voice: t('voice'),
    quick: t('quick'),
    recent: t('recent'),
    send: t('send'),
    moderationNote: t('moderationNote')
  };
  for (const node of ui.querySelectorAll('[data-vc-label]')) {
    node.textContent = labels[node.getAttribute('data-vc-label')] || '';
  }
  el.panelTitle.textContent = t('panelTitle');
  el.panelSubtitle.textContent = t('panelSubtitle');
  el.panel.setAttribute('aria-label', t('panelTitle'));
  el.close.textContent = '×';
  el.close.setAttribute('aria-label', t('close'));
  el.chatShortcut.textContent = t('shortcutChat');
  el.input.placeholder = t('placeholder');
  el.input.setAttribute('aria-label', t('placeholder'));
  el.voiceOff.textContent = t('closeMic');
  el.voiceMute.textContent = t('micMute');
  el.empty.textContent = t('noRecent');
  el.historyHint.textContent = t('historyHint');
  el.mic.setAttribute('aria-label', t('openMic'));
  el.mic.title = t('voiceHint');
  el.listen.setAttribute('aria-label', t('listenMute'));
  el.listen.title = t('listenMute');
  el.chatToggle.setAttribute('aria-label', t('bigText'));

  const quickCalls = [
    { key: 'quickHelp', tone: 'alarm' },
    { key: 'quickPush', tone: 'signal' },
    { key: 'quickEnemy', tone: 'alarm' },
    { key: 'quickBoat', tone: 'signal' },
    { key: 'quickNice', tone: 'cool' },
    { key: 'quickThanks', tone: 'cool' }
  ];
  for (const item of quickCalls) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vc-quick-btn ' + item.tone;
    button.dataset.call = item.key;
    button.textContent = t(item.key);
    el.quick.appendChild(button);
  }

  let myId = null;
  let myName = '';
  let micEnabled = false;
  let micPending = false;
  let localMuted = false;
  let localStream = null;
  let audioContext = null;
  let analyser = null;
  let analyserData = null;
  let analyserTimer = 0;
  let speaking = false;
  let lastSpokenAt = 0;
  let lastVoiceSentAt = 0;
  let voicePeers = new Map();
  let lastVoiceSignature = '__init';
  let captureSource = null;
  let captureProcessor = null;
  let captureSink = null;
  let capturePhase = 0;
  const pcmQueue = [];
  let playbackContext = null;
  let playbackGain = null;
  let incomingMuted = false;
  let audioBlocked = false;
  let lastChatAttempt = '';
  const speakers = new Map();
  const mutedPeers = new Set();
  let wasOnline = false;

  try {
    incomingMuted = localStorage.getItem(MUTE_KEY) === '1';
  } catch (err) { /* storage unavailable */ }

  const chatQueue = [];
  let bannerTimer = 0;
  let bannerActive = false;
  let panelOpen = false;
  const historyItems = [];
  const historyIds = new Set();
  let historyCursor = null;
  let historyTotal = 0;
  let historyHasMore = true;
  let historyLoaded = false;
  let historyLoading = false;
  let historyFailed = false;

  function send(payload) {
    return typeof mp.send === 'function' ? mp.send(payload) : false;
  }

  function sendVoiceState(extraSpeaking) {
    const now = performance.now();
    const nextSpeaking = typeof extraSpeaking === 'boolean' ? extraSpeaking : speaking;
    if (now - lastVoiceSentAt < 220 && nextSpeaking === speaking) return;
    speaking = nextSpeaking;
    lastVoiceSentAt = now;
    send({
      type: 'voiceState',
      enabled: micEnabled,
      muted: micEnabled ? localMuted : true,
      speaking: micEnabled && !localMuted && speaking
    });
  }

  function sortedVoicePeers() {
    return [...voicePeers.values()].sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  function renderVoice() {
    const list = sortedVoicePeers();
    const count = list.length;
    const others = list.filter((peer) => peer.id !== myId).length;
    el.voiceCount.hidden = count === 0;
    el.voiceCount.textContent = String(count);
    el.mic.classList.toggle('is-live', micEnabled && !localMuted);
    el.mic.classList.toggle('is-muted', micEnabled && localMuted);
    el.mic.classList.toggle('is-pending', micPending);
    el.mic.classList.toggle('is-speaking', micEnabled && !localMuted && speaking);
    el.mic.setAttribute('aria-pressed', micEnabled ? 'true' : 'false');
    el.micLabel.textContent = micPending
      ? t('voiceConnecting')
      : micEnabled
        ? t('closeMic')
        : t('openMic');
    el.micHint.textContent = micEnabled
      ? (localMuted ? t('voiceMuted') : t('voiceLive'))
      : t('shortcutMic');
    el.mic.setAttribute('aria-label', micEnabled ? t('closeMic') : t('openMic'));
    el.voiceOff.hidden = !micEnabled;
    el.voiceMute.hidden = !micEnabled;
    el.voiceMute.textContent = localMuted ? t('micUnmute') : t('micMute');
    el.voiceMute.classList.toggle('is-muted', localMuted);

    el.listen.classList.toggle('is-muted', incomingMuted);
    el.listen.setAttribute('aria-pressed', incomingMuted ? 'true' : 'false');
    el.listen.setAttribute('aria-label', incomingMuted ? t('listenUnmute') : t('listenMute'));
    el.listen.title = incomingMuted ? t('listenUnmute') : t('listenMute');

    if (count === 0) {
      el.voiceSummary.textContent = t('voiceIdle');
      el.voiceHint.textContent = incomingMuted ? t('listenMutedToast') : t('voiceHint');
    } else if (others === 0) {
      el.voiceSummary.textContent = t('voicePeers', { n: count });
      el.voiceHint.textContent = t('voiceNoPeers');
    } else {
      el.voiceSummary.textContent = t('voicePeers', { n: count });
      el.voiceHint.textContent = incomingMuted ? t('listenMutedToast') : t('voiceRelayHint');
    }

    const signature = list.map((peer) => (
      peer.id + ':' + peer.name + ':' + peer.color + ':' + (peer.speaking ? 1 : 0) + ':' +
      (peer.muted ? 1 : 0) + ':' + (mutedPeers.has(peer.id) ? 1 : 0)
    )).join('|');
    if (signature === lastVoiceSignature) return;
    lastVoiceSignature = signature;
    el.peers.innerHTML = '';
    if (!list.length) {
      const idle = document.createElement('span');
      idle.className = 'vc-peer-empty';
      idle.textContent = t('voiceNoPeers');
      el.peers.appendChild(idle);
      return;
    }
    for (const peer of list) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.peerId = peer.id;
      chip.className = 'vc-peer' +
        (peer.id === myId ? ' self' : '') +
        (peer.speaking ? ' speaking' : '') +
        (peer.muted || mutedPeers.has(peer.id) ? ' muted' : '');
      chip.style.setProperty('--peer-color', peer.color || '#ffb347');
      const dot = document.createElement('i');
      const name = document.createElement('b');
      name.textContent = peer.id === myId ? t('you') : peer.name;
      const state = document.createElement('em');
      state.textContent = peer.id === myId
        ? (peer.muted ? t('voiceMuted') : t('voiceLive'))
        : mutedPeers.has(peer.id)
          ? t('listenMutedShort')
          : peer.muted
            ? t('voiceMuted')
            : peer.speaking
              ? t('speaking')
              : t('voiceLive');
      chip.append(dot, name, state);
      chip.title = peer.id === myId ? peer.name : t('peerMuteHint', { name: peer.name });
      if (peer.id !== myId) chip.setAttribute('aria-pressed', mutedPeers.has(peer.id) ? 'true' : 'false');
      el.peers.appendChild(chip);
    }
  }

  function upsertVoicePeer(player) {
    if (!player || !player.id) return;
    if (player.enabled) {
      voicePeers.set(player.id, { ...player });
    } else {
      voicePeers.delete(player.id);
      dropSpeaker(player.id);
    }
    renderVoice();
  }

  function replaceVoiceRoster(list) {
    const next = new Map();
    for (const item of Array.isArray(list) ? list : []) {
      if (!item || !item.id || !item.enabled) continue;
      next.set(item.id, { ...item });
    }
    for (const id of voicePeers.keys()) {
      if (!next.has(id)) dropSpeaker(id);
    }
    voicePeers = next;
    renderVoice();
  }

  function ensurePlaybackGraph() {
    if (playbackContext) return playbackContext;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      playbackContext = new AudioCtx({ latencyHint: 'interactive' });
    } catch (err) {
      try { playbackContext = new AudioCtx(); } catch (fallbackErr) { return null; }
    }
    playbackGain = playbackContext.createGain();
    playbackGain.gain.value = incomingMuted ? 0 : 1;
    playbackGain.connect(playbackContext.destination);
    return playbackContext;
  }

  function unlockAudio() {
    const ctx = ensurePlaybackGraph();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        audioBlocked = false;
        flushPendingAudio();
      }).catch(() => {});
    } else {
      audioBlocked = false;
      flushPendingAudio();
    }
  }

  const pendingAudio = [];

  function flushPendingAudio() {
    if (!playbackContext || playbackContext.state !== 'running') return;
    while (pendingAudio.length) {
      const item = pendingAudio.shift();
      scheduleSamples(item.id, item.samples);
    }
  }

  function dropSpeaker(id) {
    speakers.delete(id);
  }

  function scheduleSamples(id, samples) {
    if (!playbackContext || playbackContext.state !== 'running' || !samples || !samples.length) return;
    if (incomingMuted || mutedPeers.has(id)) return;
    const now = playbackContext.currentTime;
    let entry = speakers.get(id);
    if (!entry) {
      entry = { nextPlayAt: 0 };
      speakers.set(id, entry);
    }
    if (!entry.nextPlayAt || entry.nextPlayAt < now + 0.02) entry.nextPlayAt = now + 0.12;
    if (entry.nextPlayAt > now + MAX_AHEAD) entry.nextPlayAt = now + 0.12;

    let buffer;
    try {
      buffer = playbackContext.createBuffer(1, samples.length, OUT_RATE);
      buffer.copyToChannel(samples, 0);
    } catch (err) {
      return;
    }
    let source;
    try {
      source = playbackContext.createBufferSource();
      source.buffer = buffer;
      source.connect(playbackGain);
      source.start(entry.nextPlayAt);
    } catch (err) {
      return;
    }
    entry.nextPlayAt += samples.length / OUT_RATE;
  }

  function handleAudioFrame(data) {
    let buffer = null;
    if (data instanceof ArrayBuffer) {
      buffer = data;
    } else if (data && data.buffer instanceof ArrayBuffer) {
      buffer = data.buffer.slice(data.byteOffset || 0, (data.byteOffset || 0) + data.byteLength);
    }
    if (!buffer || buffer.byteLength < 7) return;
    const view = new DataView(buffer);
    if (view.getUint8(0) !== VOICE_MAGIC) return;
    const speakerId = 'p' + view.getUint32(1, true);
    if (speakerId === myId) return;
    if (incomingMuted || mutedPeers.has(speakerId)) return;

    const pcmBytes = buffer.byteLength - 5;
    if (pcmBytes < 2 || pcmBytes % 2 !== 0) return;
    const samples = new Float32Array(pcmBytes / 2);
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = view.getInt16(5 + i * 2, true) / 32768;
    }

    const ctx = ensurePlaybackGraph();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      if (!audioBlocked) toast(t('popupBlocked'));
      audioBlocked = true;
      if (pendingAudio.length < 12) pendingAudio.push({ id: speakerId, samples });
      return;
    }
    audioBlocked = false;
    scheduleSamples(speakerId, samples);
  }

  function toggleListenMute() {
    incomingMuted = !incomingMuted;
    try { localStorage.setItem(MUTE_KEY, incomingMuted ? '1' : '0'); } catch (err) { /* ignore */ }
    if (playbackGain) playbackGain.gain.value = incomingMuted ? 0 : 1;
    if (!incomingMuted) unlockAudio();
    renderVoice();
    toast(incomingMuted ? t('listenMutedToast') : t('listenUnmutedToast'));
  }

  function togglePeerMute(id) {
    if (!id || id === myId) return;
    if (mutedPeers.has(id)) mutedPeers.delete(id);
    else mutedPeers.add(id);
    if (mutedPeers.has(id)) dropSpeaker(id);
    lastVoiceSignature = '__init';
    renderVoice();
  }

  function flushPcm() {
    while (pcmQueue.length >= OUT_FRAME_SAMPLES) {
      const pcm = new Int16Array(OUT_FRAME_SAMPLES);
      for (let i = 0; i < OUT_FRAME_SAMPLES; i += 1) {
        const sample = Math.max(-1, Math.min(1, pcmQueue[i]));
        pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
      }
      pcmQueue.splice(0, OUT_FRAME_SAMPLES);
      if (typeof mp.sendBinary !== 'function' || !mp.sendBinary(pcm.buffer)) break;
    }
    if (pcmQueue.length > OUT_RATE) pcmQueue.splice(0, pcmQueue.length - OUT_FRAME_SAMPLES);
  }

  function startMicGraph(stream) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      audioContext = new AudioCtx({ latencyHint: 'interactive' });
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      captureSource = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.62;
      captureSource.connect(analyser);
      analyserData = new Uint8Array(analyser.fftSize);

      captureProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      captureSink = audioContext.createGain();
      captureSink.gain.value = 0;
      capturePhase = 0;
      captureProcessor.onaudioprocess = (event) => {
        if (!micEnabled || localMuted) {
          pcmQueue.length = 0;
          return;
        }
        const input = event.inputBuffer.getChannelData(0);
        const ratio = audioContext.sampleRate / OUT_RATE;
        while (capturePhase < input.length) {
          pcmQueue.push(input[Math.floor(capturePhase)] || 0);
          capturePhase += ratio;
        }
        capturePhase -= input.length;
        if (capturePhase < 0) capturePhase = 0;
        flushPcm();
      };
      captureSource.connect(captureProcessor);
      captureProcessor.connect(captureSink);
      captureSink.connect(audioContext.destination);

      window.clearInterval(analyserTimer);
      analyserTimer = window.setInterval(() => {
        if (!analyser || !analyserData || !micEnabled) return;
        analyser.getByteTimeDomainData(analyserData);
        let sum = 0;
        for (let i = 0; i < analyserData.length; i += 1) {
          const value = (analyserData[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / analyserData.length);
        const now = performance.now();
        if (!localMuted && rms > 0.045) lastSpokenAt = now;
        const nowSpeaking = !localMuted && now - lastSpokenAt < 460;
        el.mic.style.setProperty('--level', String(Math.min(1, rms * 14)));
        el.mic.classList.toggle('is-speaking', nowSpeaking);
        if (nowSpeaking !== speaking) sendVoiceState(nowSpeaking);
      }, 120);
    } catch (err) {
      console.warn('[vc] microphone graph unavailable', err && err.message);
      stopMicGraph();
    }
  }

  function stopMicGraph() {
    window.clearInterval(analyserTimer);
    analyserTimer = 0;
    analyser = null;
    analyserData = null;
    pcmQueue.length = 0;
    capturePhase = 0;
    if (captureProcessor) {
      try { captureProcessor.onaudioprocess = null; } catch (err) { /* ignore */ }
      try { captureProcessor.disconnect(); } catch (err) { /* ignore */ }
    }
    if (captureSource) {
      try { captureSource.disconnect(); } catch (err) { /* ignore */ }
    }
    if (captureSink) {
      try { captureSink.disconnect(); } catch (err) { /* ignore */ }
    }
    captureProcessor = null;
    captureSource = null;
    captureSink = null;
    if (audioContext) {
      try { audioContext.close(); } catch (err) { /* ignore */ }
    }
    audioContext = null;
  }

  function setMicMuted(next, showToast) {
    if (!micEnabled) return;
    localMuted = !!next;
    if (localStream) {
      for (const track of localStream.getAudioTracks()) track.enabled = !localMuted;
    }
    pcmQueue.length = 0;
    if (localMuted) speaking = false;
    lastVoiceSentAt = 0;
    sendVoiceState(false);
    if (showToast) toast(localMuted ? t('micMutedToast') : t('micUnmutedToast'));
    renderVoice();
  }

  async function enableMic() {
    if (micPending || micEnabled) return;
    if (!window.isSecureContext) {
      toast(t('voiceRequiresSecure'));
      return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      toast(t('voiceUnsupported'));
      return;
    }
    micPending = true;
    renderVoice();
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        },
        video: false
      });
      micEnabled = true;
      micPending = false;
      localMuted = false;
      speaking = false;
      lastSpokenAt = 0;
      startMicGraph(localStream);
      lastVoiceSentAt = 0;
      sendVoiceState(false);
      renderVoice();
      toast(t('voiceEnabledToast'));
    } catch (err) {
      micPending = false;
      micEnabled = false;
      localStream = null;
      renderVoice();
      toast(err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
        ? t('voiceDenied')
        : t('voiceFailed'));
    }
  }

  function disableMic(showToast) {
    if (!micEnabled && !micPending) return;
    micEnabled = false;
    micPending = false;
    localMuted = true;
    speaking = false;
    stopMicGraph();
    if (localStream) {
      for (const track of localStream.getTracks()) {
        try { track.stop(); } catch (err) { /* ignore */ }
      }
    }
    localStream = null;
    lastVoiceSentAt = 0;
    sendVoiceState(false);
    renderVoice();
    if (showToast) toast(t('voiceDisabledToast'));
  }

  function toggleMic() {
    unlockAudio();
    if (micEnabled) disableMic(true);
    else enableMic();
  }

  function updateCounter() {
    el.count.textContent = t('count', { n: el.input.value.length });
  }

  function openPanel(focus) {
    panelOpen = true;
    el.panel.hidden = false;
    el.historyScroll.scrollTop = 0;
    el.chatToggle.setAttribute('aria-expanded', 'true');
    el.rail.dataset.open = '1';
    document.body.classList.add('vc-panel-open');
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (err) { /* ignore */ }
    updateCounter();
    ensureHistory();
    if (focus) {
      window.requestAnimationFrame(() => {
        try { el.input.focus({ preventScroll: true }); } catch (err) { el.input.focus(); }
      });
    }
  }

  function closePanel() {
    panelOpen = false;
    el.panel.hidden = true;
    el.chatToggle.setAttribute('aria-expanded', 'false');
    delete el.rail.dataset.open;
    document.body.classList.remove('vc-panel-open');
    try { el.input.blur(); } catch (err) { /* ignore */ }
  }

  function localeTag() {
    return config.lang === 'en-US' ? 'en-US' : 'zh-CN';
  }

  function formatMessageTime(at) {
    if (!at) return '';
    const date = new Date(at);
    if (!Number.isFinite(date.getTime())) return '';
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
    const options = sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    try {
      return new Intl.DateTimeFormat(localeTag(), options).format(date);
    } catch (err) {
      return '';
    }
  }

  function normalizeHistoryItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const text = cleanText(raw.text);
    if (!text) return null;
    const at = Number(raw.at) || Date.now();
    const playerId = String(raw.playerId || raw.id || '');
    const id = String(raw.id || ('live:' + playerId + ':' + at + ':' + text));
    return {
      id,
      playerId,
      name: cleanText(raw.name) || '—',
      color: /^#[0-9a-f]{3,8}$/i.test(String(raw.color || '')) ? raw.color : '#ffb347',
      text,
      at
    };
  }

  function historyKey(item) {
    return item ? String(item.id || ('live:' + item.playerId + ':' + item.at + ':' + item.text)) : '';
  }

  function isMyMessage(item) {
    return !!(item && myId && item.playerId === myId);
  }

  function appendHistoryItems(rows) {
    for (const raw of rows) {
      const item = normalizeHistoryItem(raw);
      if (!item) continue;
      const key = historyKey(item);
      if (historyIds.has(key)) continue;
      historyIds.add(key);
      historyItems.push(item);
    }
  }

  function updateHistoryStatus() {
    if (!el.historyMore) return;
    if (historyLoading) {
      el.historyMore.hidden = false;
      el.historyMore.disabled = true;
      el.historyMore.dataset.state = 'loading';
      el.historyMore.textContent = t('historyLoading');
      return;
    }
    if (historyFailed) {
      el.historyMore.hidden = false;
      el.historyMore.disabled = false;
      el.historyMore.dataset.state = 'error';
      el.historyMore.textContent = t('historyFailed');
      return;
    }
    if (historyHasMore) {
      el.historyMore.hidden = false;
      el.historyMore.disabled = false;
      el.historyMore.dataset.state = 'more';
      el.historyMore.textContent = t('historyLoadMore');
      return;
    }
    el.historyMore.dataset.state = 'done';
    el.historyMore.disabled = true;
    el.historyMore.hidden = historyItems.length === 0;
    el.historyMore.textContent = t('historyAll', { n: historyTotal || historyItems.length });
  }

  function renderHistory() {
    const fragment = document.createDocumentFragment();
    for (const item of historyItems) {
      const row = document.createElement('li');
      row.className = isMyMessage(item) ? 'self' : '';
      row.dataset.mid = item.id;
      row.style.setProperty('--speaker-color', item.color);
      const who = document.createElement('span');
      who.className = 'vc-history-who';
      const name = document.createElement('b');
      name.textContent = isMyMessage(item) ? t('you') : item.name;
      const time = document.createElement('time');
      time.textContent = formatMessageTime(item.at);
      if (item.at) {
        try { time.dateTime = new Date(item.at).toISOString(); } catch (err) { /* ignore */ }
        try { time.title = new Date(item.at).toLocaleString(localeTag()); } catch (err) { /* ignore */ }
      }
      who.append(name, time);
      const text = document.createElement('span');
      text.className = 'vc-history-text';
      text.textContent = item.text;
      row.append(who, text);
      fragment.appendChild(row);
    }
    el.history.replaceChildren(fragment);
    el.historyTotal.textContent = historyTotal > 0 ? t('historyCount', { n: historyTotal }) : '';
    el.empty.hidden = !(historyLoaded && !historyLoading && historyItems.length === 0);
    updateHistoryStatus();
  }

  async function fetchHistory() {
    if (historyLoading) return;
    if (historyLoaded && !historyHasMore) return;
    historyLoading = true;
    historyFailed = false;
    renderHistory();
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (historyCursor) params.set('before', historyCursor);
      const response = await fetch('/api/game/chat/history?' + params.toString(), {
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || data.ok !== true) throw new Error('invalid payload');
      const rows = Array.isArray(data.messages) ? data.messages : [];
      appendHistoryItems(rows);
      historyTotal = Math.max(Number(data.total) || 0, historyItems.length);
      historyHasMore = data.hasMore === true;
      if (data.nextCursor) historyCursor = String(data.nextCursor);
      historyLoaded = true;
    } catch (err) {
      historyFailed = true;
    } finally {
      historyLoading = false;
      renderHistory();
    }
  }

  function ensureHistory(force) {
    if (historyLoading) return;
    if (!force && (historyLoaded || historyFailed)) return;
    if (historyLoaded && !historyHasMore) return;
    fetchHistory();
  }

  function loadMoreHistory() {
    if (historyLoading || (historyLoaded && !historyHasMore)) return;
    fetchHistory();
  }

  function onHistoryScroll() {
    if (!panelOpen || historyLoading || historyFailed || !historyHasMore) return;
    const remaining = el.historyScroll.scrollHeight - el.historyScroll.scrollTop - el.historyScroll.clientHeight;
    if (remaining < 72) loadMoreHistory();
  }

  function showNextBanner() {
    if (bannerActive || !chatQueue.length) return;
    const item = chatQueue.shift();
    bannerActive = true;
    el.bannerName.textContent = isMyMessage(item) ? t('you') : item.name;
    el.bannerName.style.color = item.color || 'var(--signal)';
    el.bannerText.textContent = item.text;
    el.banner.dataset.size = item.text.length > 54 ? 'long' : item.text.length > 30 ? 'medium' : 'short';
    el.banner.style.setProperty('--speaker-color', item.color || '#ffb347');
    el.banner.hidden = false;
    el.banner.classList.remove('on');
    void el.banner.offsetWidth;
    el.banner.classList.add('on');
    window.clearTimeout(bannerTimer);
    const duration = Math.min(9000, BANNER_MS + Math.max(0, item.text.length - 36) * 55);
    bannerTimer = window.setTimeout(() => {
      el.banner.classList.remove('on');
      window.setTimeout(() => {
        el.banner.hidden = true;
        bannerActive = false;
        showNextBanner();
      }, 300);
    }, duration);
  }

  function receiveChat(msg) {
    const item = normalizeHistoryItem({
      id: msg.mid || ('live:' + String(msg.id || '') + ':' + Number(msg.at || Date.now())),
      playerId: String(msg.id || ''),
      name: msg.name,
      color: msg.color,
      text: msg.text,
      at: msg.at
    });
    if (!item) return;
    if (isMyMessage(item)) lastChatAttempt = '';
    const key = historyKey(item);
    if (!historyIds.has(key)) {
      historyIds.add(key);
      historyItems.unshift(item);
      if (historyLoaded) historyTotal += 1;
    }
    const nearTop = el.historyScroll.scrollTop < 40;
    const previousHeight = el.historyScroll.scrollHeight;
    renderHistory();
    if (panelOpen && !nearTop && el.historyScroll.scrollHeight > previousHeight) {
      el.historyScroll.scrollTop += el.historyScroll.scrollHeight - previousHeight;
    }
    chatQueue.push(item);
    showNextBanner();
  }

  function sendChat(raw) {
    const text = cleanText(raw);
    if (!text) {
      toast(t('empty'));
      return false;
    }
    if (!send({ type: 'chat', text })) {
      toast(messages.mp && messages.mp.disconnected ? messages.mp.disconnected : t('voiceFailed'));
      return false;
    }
    lastChatAttempt = text;
    return true;
  }

  el.mic.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMic();
  });

  el.chatToggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (panelOpen) closePanel();
    else openPanel(true);
  });
  el.close.addEventListener('click', (event) => {
    event.preventDefault();
    closePanel();
  });
  el.historyScroll.addEventListener('scroll', onHistoryScroll, { passive: true });
  el.historyMore.addEventListener('click', (event) => {
    event.preventDefault();
    if (historyFailed) {
      historyFailed = false;
      renderHistory();
      ensureHistory(true);
      return;
    }
    loadMoreHistory();
  });
  el.voiceOff.addEventListener('click', (event) => {
    event.preventDefault();
    disableMic(true);
  });
  el.voiceMute.addEventListener('click', (event) => {
    event.preventDefault();
    setMicMuted(!localMuted, true);
  });
  el.listen.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleListenMute();
  });
  el.peers.addEventListener('click', (event) => {
    const chip = event.target && event.target.closest ? event.target.closest('[data-peer-id]') : null;
    if (!chip) return;
    event.preventDefault();
    togglePeerMute(chip.dataset.peerId);
  });
  el.quick.addEventListener('click', (event) => {
    const button = event.target && event.target.closest ? event.target.closest('[data-call]') : null;
    if (!button) return;
    event.preventDefault();
    if (sendChat(t(button.dataset.call))) {
      closePanel();
    }
  });
  el.input.addEventListener('input', updateCounter);
  el.input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
    }
  });
  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!sendChat(el.input.value)) return;
    el.input.value = '';
    updateCounter();
    closePanel();
  });
  ui.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  ui.addEventListener('keydown', (event) => {
    event.stopPropagation();
  });
  ui.addEventListener('click', (event) => {
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'FORM' || tag === 'SECTION') {
      event.stopPropagation();
    }
  });

  window.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
    if (typing) {
      if (event.key === 'Escape') closePanel();
      event.stopPropagation();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === 'KeyM') {
      event.preventDefault();
      event.stopPropagation();
      toggleMic();
    } else if (event.code === 'KeyT') {
      event.preventDefault();
      event.stopPropagation();
      openPanel(true);
    } else if (event.key === 'Escape' && panelOpen) {
      event.preventDefault();
      closePanel();
    }
  }, true);

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement && panelOpen) closePanel();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!panelOpen) return;
    if (ui.contains(event.target)) return;
    closePanel();
  }, true);

  function handleMessage(msg) {
    if (!msg || typeof msg.type !== 'string') return;
    switch (msg.type) {
      case 'welcome':
        myId = msg.id || myId;
        myName = msg.name || myName;
        if (micEnabled) sendVoiceState(speaking);
        break;
      case 'joined':
        myId = msg.id || myId;
        myName = msg.name || myName;
        if (micEnabled) sendVoiceState(speaking);
        break;
      case 'snapshot':
        if (msg.you && msg.you.id) {
          myId = msg.you.id;
          myName = msg.you.name || myName;
        }
        replaceVoiceRoster(msg.voice);
        break;
      case 'voiceState':
        if (msg.player) upsertVoicePeer(msg.player);
        break;
      case 'chat':
        receiveChat(msg);
        break;
      case 'chatWarning':
        if (msg.reason === 'storage') toast(t('storageQueued'));
        break;
      case 'chatDenied':
        if (msg.reason === 'filtered') {
          if (lastChatAttempt && !el.input.value) {
            el.input.value = lastChatAttempt;
            updateCounter();
          }
          toast(t('blocked'));
        } else if (msg.reason === 'storage') {
          toast(t('storageQueued'));
        } else {
          toast(msg.reason === 'rate' ? t('rate') : t('empty'));
        }
        break;
      default:
        break;
    }
  }

  mp.onMessage(handleMessage);
  if (typeof mp.onBinary === 'function') mp.onBinary(handleAudioFrame);

  document.addEventListener('pointerdown', unlockAudio, true);
  document.addEventListener('keydown', unlockAudio, true);

  window.setInterval(() => {
    const online = !!(mp && mp.connected);
    if (wasOnline && !online) {
      voicePeers.clear();
      speakers.clear();
      pendingAudio.length = 0;
      lastVoiceSignature = '__init';
      renderVoice();
    } else if (!wasOnline && online && micEnabled) {
      sendVoiceState(speaking);
    }
    wasOnline = online;
  }, 1400);

  renderVoice();
  renderHistory();
  updateCounter();

  window.__vc = {
    get micEnabled() { return micEnabled; },
    get micPending() { return micPending; },
    get micMuted() { return localMuted; },
    get incomingMuted() { return incomingMuted; },
    get audioBlocked() { return audioBlocked; },
    get speakers() { return speakers.size; },
    get relay() { return { transport: 'pcm-relay', sampleRate: OUT_RATE, frameSamples: OUT_FRAME_SAMPLES }; },
    get mutedPeers() { return [...mutedPeers]; },
    get voicePeers() { return sortedVoicePeers(); },
    get panelOpen() { return panelOpen; },
    openPanel,
    closePanel,
    sendChat,
    toggleMic,
    toggleListenMute,
    togglePeerMute,
    setMicMuted,
    enableMic,
    disableMic
  };
})();
