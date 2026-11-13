(() => {
  'use strict';

  if (window.__killStreakAnnouncer) return;

  const mp = window.__mp;
  if (!mp || typeof mp.onMessage !== 'function') return;

  const ASSET_VERSION = '20261113-killstreak-v1';
  const MAX_STREAK = 6;
  const VOLUME = 0.78;
  const TRACK_NAMES = [
    '01-first',
    '02-double',
    '03-triple',
    '04-quadra',
    '05-penta',
    '06-hexa'
  ];

  let currentStreak = 0;
  let activeLevel = 0;
  let activeAudio = null;
  let pendingLevel = 0;
  let unlockArmed = false;

  function sourceUrl(name, extension) {
    return '/audio/killstreak/' + name + '.' + extension + '?v=' + ASSET_VERSION;
  }

  function createTrack(level) {
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.volume = VOLUME;
    audio.dataset.killStreakLevel = String(level);
    audio.setAttribute('playsinline', '');
    audio.setAttribute('aria-hidden', 'true');

    const webm = document.createElement('source');
    webm.src = sourceUrl(TRACK_NAMES[level - 1], 'webm');
    webm.type = 'audio/webm; codecs="opus"';

    const mp3 = document.createElement('source');
    mp3.src = sourceUrl(TRACK_NAMES[level - 1], 'mp3');
    mp3.type = 'audio/mpeg';

    audio.append(webm, mp3);
    audio.hidden = true;
    document.body.appendChild(audio);
    audio.load();
    return audio;
  }

  const tracks = TRACK_NAMES.map((_, index) => createTrack(index + 1));

  function stopActive() {
    if (!activeAudio) return;
    activeAudio.pause();
    try {
      activeAudio.currentTime = 0;
    } catch (error) {
      // The media may still be loading; there is nothing to reset yet.
    }
    activeAudio = null;
    activeLevel = 0;
    document.documentElement.removeAttribute('data-kill-streak');
  }

  function disarmUnlock() {
    if (!unlockArmed) return;
    unlockArmed = false;
    document.removeEventListener('pointerdown', retryPending, true);
    document.removeEventListener('touchstart', retryPending, true);
    document.removeEventListener('keydown', retryPending, true);
  }

  function armUnlock() {
    if (unlockArmed) return;
    unlockArmed = true;
    document.addEventListener('pointerdown', retryPending, true);
    document.addEventListener('touchstart', retryPending, true);
    document.addEventListener('keydown', retryPending, true);
  }

  function retryPending() {
    disarmUnlock();
    if (pendingLevel) {
      const level = pendingLevel;
      pendingLevel = 0;
      play(level);
    }
  }

  function play(level) {
    const index = Math.floor(Number(level)) - 1;
    if (index < 0 || index >= tracks.length) return false;

    stopActive();
    const audio = tracks[index];
    activeLevel = index + 1;
    activeAudio = audio;
    document.documentElement.dataset.killStreak = String(activeLevel);
    window.dispatchEvent(new CustomEvent('saltline:killstreak', {
      detail: { level: activeLevel }
    }));

    audio.currentTime = 0;
    const result = audio.play();
    if (result && typeof result.catch === 'function') {
      result.catch((error) => {
        if (activeAudio !== audio) return;
        stopActive();
        if (error && error.name === 'NotAllowedError') {
          pendingLevel = index + 1;
          armUnlock();
          return;
        }
        console.warn('[kill-streak] announcement failed', error);
      });
    }
    return true;
  }

  function reset() {
    currentStreak = 0;
    pendingLevel = 0;
    disarmUnlock();
    stopActive();
  }

  function handleMessage(message) {
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'welcome' || message.type === 'youDied' || message.type === 'respawned') {
      reset();
      return;
    }

    if (message.type === 'snapshot' && message.you) {
      currentStreak = Math.max(0, Math.floor(Number(message.you.streak) || 0));
      return;
    }

    if (message.type !== 'kill') return;

    const myId = mp.id == null ? '' : String(mp.id);
    const victimId = message.victim && message.victim.id != null ? String(message.victim.id) : '';
    if (myId && victimId === myId) {
      reset();
      return;
    }

    const killerId = message.killer && message.killer.id != null ? String(message.killer.id) : '';
    if (!myId || killerId !== myId) return;

    currentStreak = Math.max(0, currentStreak) + 1;
    const streak = currentStreak;

    if (streak < 1 || streak > MAX_STREAK) {
      stopActive();
      return;
    }

    play(streak);
  }

  mp.onMessage(handleMessage);

  Object.defineProperty(window, '__killStreakAnnouncer', {
    configurable: false,
    enumerable: false,
    value: Object.freeze({
      get lastStreak() { return currentStreak; },
      get activeLevel() { return activeLevel; },
      play,
      reset
    })
  });
})();
