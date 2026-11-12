(() => {
  'use strict';

  const BLOCKED_KEYS = new Set(['KeyZ', 'KeyX', 'KeyC', 'ControlLeft', 'ControlRight']);
  const OBSOLETE_COPY = /蹲伏|趴下|crouch|prone/i;

  function isTyping(target) {
    return !!(target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  function blockStanceKey(event) {
    const code = event.code;
    if (!BLOCKED_KEYS.has(code) || isTyping(event.target)) return;
    // 保留 Ctrl+C 等浏览器组合键，只拦截单独按下的 Ctrl 与无修饰键的 C/Z/X。
    if ((event.ctrlKey || event.metaKey || event.altKey) && code !== 'ControlLeft' && code !== 'ControlRight') return;
    event.stopImmediatePropagation();
    if (!event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault();
  }

  window.addEventListener('keydown', blockStanceKey, true);
  window.addEventListener('keyup', blockStanceKey, true);

  function neutralizeGamepadStance() {
    const original = navigator.getGamepads && navigator.getGamepads.bind(navigator);
    if (!original) return;
    const blockedButtons = new Set([1, 12, 13]);
    const wrapped = function getGamepadsWithoutStance() {
      let pads;
      try {
        pads = original();
      } catch (err) {
        return [];
      }
      return Array.from(pads || []).map((pad) => {
        if (!pad) return pad;
        return {
          id: pad.id,
          index: pad.index,
          connected: pad.connected,
          mapping: pad.mapping,
          axes: pad.axes,
          timestamp: pad.timestamp,
          buttons: Array.from(pad.buttons || []).map((button, index) => (
            blockedButtons.has(index)
              ? { pressed: false, touched: false, value: 0 }
              : button
          ))
        };
      });
    };
    try {
      Object.defineProperty(navigator, 'getGamepads', {
        configurable: true,
        value: wrapped
      });
    } catch (err) {
      try { navigator.getGamepads = wrapped; } catch (ignore) { /* ignore */ }
    }
  }

  function clearStanceState() {
    const game = window.__G;
    if (game && game.player) {
      game.player.crouching = false;
      game.player.prone = false;
    }
    if (game && game.input) {
      game.input.crouch = false;
      game.input.prone = false;
    }
  }

  function scrubObsoleteControls(root) {
    const scope = root || document;
    scope.querySelectorAll('.t-crouch, .t-prone, .mp-stance, .compat-stance').forEach((node) => node.remove());
    scope.querySelectorAll('dt, dd, span').forEach((node) => {
      if (!OBSOLETE_COPY.test(node.textContent || '')) return;
      if (node.tagName === 'DT' || node.tagName === 'DD') {
        const row = node.closest('div');
        if (row) row.remove();
      } else {
        node.remove();
      }
    });
    scope.querySelectorAll('.panel-note').forEach((note) => {
      const next = note.textContent
        .replace(/\s*[·•]\s*(?:[A-Z]\s*)?(?:十字键下\s*|D-pad down\s*)?(?:蹲伏|趴下|crouch|prone)(?:\s*[（(][^）)]*[）)])?/gi, '')
        .replace(/\s*·\s*·\s*/g, ' · ')
        .replace(/\s*·\s*$/g, '');
      if (next !== note.textContent) note.textContent = next;
    });
  }

  function watchControlsUi() {
    const ui = document.getElementById('ui');
    if (!ui) return;
    let queued = false;
    const queueScrub = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        scrubObsoleteControls(ui);
      });
    };
    queueScrub();
    new MutationObserver(queueScrub).observe(ui, { childList: true, subtree: true, characterData: true });
  }

  neutralizeGamepadStance();
  clearStanceState();
  setInterval(() => {
    clearStanceState();
    scrubObsoleteControls(document);
  }, 400);
  watchControlsUi();
})();
