(() => {
  'use strict';

  const scrollPanes = '.m-title, .panel-b, .salt-shop, .salt-modal__dialog, #soldier-select, .ss-copy, .ss-stage, .m-card, .community-dialog, .focus-dialog-card, .mp-roster-card, .mp-gold-activity-scroll, .gold-gift-list';
  let swipe = null;
  let draggedPane = null;
  let draggedAt = 0;

  const STORAGE_KEY = 'saltline.manualTurn.v1';
  const MODES = new Set(['auto', 'landscape', 'portrait']);
  const root = document.documentElement;
  const initialWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const initialHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const nativeWidth = (initialWidth && initialWidth.get) ||
    (Object.getOwnPropertyDescriptor(Window.prototype, 'innerWidth') || {}).get;
  const nativeHeight = (initialHeight && initialHeight.get) ||
    (Object.getOwnPropertyDescriptor(Window.prototype, 'innerHeight') || {}).get;
  const touchX = window.Touch && Object.getOwnPropertyDescriptor(Touch.prototype, 'clientX');
  const touchY = window.Touch && Object.getOwnPropertyDescriptor(Touch.prototype, 'clientY');
  const mouseX = window.MouseEvent && Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'clientX');
  const mouseY = window.MouseEvent && Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'clientY');

  let mode = 'auto';
  let forced = null;
  let viewportPatched = false;
  let touchPatched = false;
  let mousePatched = false;
  let resizeFrame = 0;
  let resizeTimer = 0;
  let suppressResize = false;

  function readMode() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && MODES.has(saved.screenMode)) return saved.screenMode;
    } catch (err) { /* localStorage can be blocked */ }
    return 'auto';
  }

  function readNativeWidth() {
    try {
      return Math.max(1, Number(nativeWidth ? nativeWidth.call(window) : window.innerWidth) || 1);
    } catch (err) {
      return Math.max(1, window.innerWidth || 1);
    }
  }

  function readNativeHeight() {
    try {
      return Math.max(1, Number(nativeHeight ? nativeHeight.call(window) : window.innerHeight) || 1);
    } catch (err) {
      return Math.max(1, window.innerHeight || 1);
    }
  }

  function physicalSize() {
    return { width: readNativeWidth(), height: readNativeHeight() };
  }

  function logicalSize(nextForced) {
    const physical = physicalSize();
    if (nextForced === 'landscape') {
      return {
        width: Math.max(physical.width, physical.height),
        height: Math.min(physical.width, physical.height)
      };
    }
    if (nextForced === 'portrait') {
      return {
        width: Math.min(physical.width, physical.height),
        height: Math.max(physical.width, physical.height)
      };
    }
    return physical;
  }

  function forcedFor(nextMode) {
    if (nextMode !== 'landscape' && nextMode !== 'portrait') return null;
    const physical = physicalSize();
    const portraitViewport = physical.height >= physical.width;
    if (nextMode === 'landscape' && portraitViewport) return 'landscape';
    if (nextMode === 'portrait' && !portraitViewport) return 'portrait';
    return null;
  }

  function playGateOpen() {
    const gate = document.getElementById('play-gate');
    return Boolean((gate && !gate.hidden) || root.classList.contains('play-gate-open'));
  }

  function touchLike() {
    return !!(
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (navigator.maxTouchPoints || 0) > 0 ||
      'ontouchstart' in window
    );
  }

  function effectiveForced(nextMode) {
    // The schedule dialog is always landscape. On a portrait touch screen this
    // turns the page only while the dialog is visible; closing it restores the
    // mode the player had selected before. Narrow desktop windows are left alone.
    if (playGateOpen()) {
      const physical = physicalSize();
      return touchLike() && physical.height >= physical.width ? 'landscape' : null;
    }
    return forcedFor(nextMode);
  }

  function restoreProperty(name, descriptor) {
    try {
      if (descriptor) Object.defineProperty(window, name, descriptor);
      else delete window[name];
    } catch (err) { /* ignore */ }
  }

  function patchViewport() {
    if (viewportPatched) return;
    try {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        enumerable: true,
        get() { return logicalSize(forced).width; }
      });
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        enumerable: true,
        get() { return logicalSize(forced).height; }
      });
      viewportPatched = true;
    } catch (err) {
      viewportPatched = false;
    }
  }

  function restoreViewport() {
    if (!viewportPatched) return;
    restoreProperty('innerWidth', initialWidth);
    restoreProperty('innerHeight', initialHeight);
    viewportPatched = false;
  }

  function mappedPoint(px, py) {
    const physical = physicalSize();
    if (forced === 'landscape') {
      return {
        x: Math.max(0, Math.min(physical.height, py)),
        y: Math.max(0, Math.min(physical.width, physical.width - px))
      };
    }
    if (forced === 'portrait') {
      return {
        x: Math.max(0, Math.min(physical.height, physical.width - py)),
        y: Math.max(0, Math.min(physical.width, px))
      };
    }
    return { x: px, y: py };
  }

  function touchPoint(touch) {
    return mappedPoint(touchX?.get ? touchX.get.call(touch) : touch.clientX,
      touchY?.get ? touchY.get.call(touch) : touch.clientY);
  }

  function beginScroll(event) {
    swipe = null;
    draggedPane = null;
    if (!forced || event.touches.length !== 1) return;
    const target = event.target;
    if (!target.closest || target.closest('input:not([type="radio"]):not([type="checkbox"]), textarea, select, [contenteditable="true"]')) return;
    const panes = [];
    for (let node = target.closest(scrollPanes); node; node = node.parentElement?.closest(scrollPanes)) {
      if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
        panes.push(node);
      }
    }
    if (!panes.length) return;
    const touch = event.changedTouches[0];
    const point = touchPoint(touch);
    swipe = { id: touch.identifier, panes, x: point.x, y: point.y, lastY: point.y, dragging: false };
  }

  function moveScroll(event) {
    if (!swipe || !forced) return;
    if (event.touches.length !== 1) {
      swipe = null;
      return;
    }
    const touch = Array.from(event.changedTouches).find(item => item.identifier === swipe.id);
    if (!touch) return;
    const point = touchPoint(touch);
    if (!swipe.dragging) {
      const dx = Math.abs(point.x - swipe.x), dy = Math.abs(point.y - swipe.y);
      if (dx < 6 && dy < 6) return;
      if (dy < dx) {
        swipe = null;
        return;
      }
      swipe.dragging = true;
    }
    if (event.cancelable) event.preventDefault();
    let remaining = swipe.lastY - point.y;
    swipe.lastY = point.y;
    for (const pane of swipe.panes) {
      const before = pane.scrollTop;
      pane.scrollTop += remaining;
      remaining -= pane.scrollTop - before;
      if (Math.abs(remaining) < 1) break;
    }
  }

  function endScroll(event) {
    if (!swipe || !Array.from(event.changedTouches).some(item => item.identifier === swipe.id)) return;
    if (swipe.dragging) {
      draggedPane = swipe.panes.at(-1);
      draggedAt = performance.now();
    }
    swipe = null;
  }

  document.addEventListener('touchstart', beginScroll, { capture: true, passive: true });
  document.addEventListener('touchmove', moveScroll, { capture: true, passive: false });
  document.addEventListener('touchend', endScroll, { capture: true, passive: true });
  document.addEventListener('touchcancel', endScroll, { capture: true, passive: true });
  document.addEventListener('click', event => {
    if (!forced || !event.detail || performance.now() - draggedAt > 450 || !draggedPane?.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  function patchTouch() {
    if (touchPatched || !touchX || !touchX.get || !touchY || !touchY.get) return;
    try {
      Object.defineProperty(Touch.prototype, 'clientX', {
        configurable: true,
        enumerable: touchX.enumerable,
        get() {
          return mappedPoint(touchX.get.call(this), touchY.get.call(this)).x;
        }
      });
      Object.defineProperty(Touch.prototype, 'clientY', {
        configurable: true,
        enumerable: touchY.enumerable,
        get() {
          return mappedPoint(touchX.get.call(this), touchY.get.call(this)).y;
        }
      });
      touchPatched = true;
    } catch (err) {
      touchPatched = false;
    }
  }

  function restoreTouch() {
    if (!touchPatched) return;
    try {
      Object.defineProperty(Touch.prototype, 'clientX', touchX);
      Object.defineProperty(Touch.prototype, 'clientY', touchY);
    } catch (err) { /* ignore */ }
    touchPatched = false;
  }

  function patchMouse() {
    if (mousePatched || !mouseX || !mouseX.get || !mouseY || !mouseY.get) return;
    try {
      Object.defineProperty(MouseEvent.prototype, 'clientX', {
        configurable: true,
        enumerable: mouseX.enumerable,
        get() {
          return mappedPoint(mouseX.get.call(this), mouseY.get.call(this)).x;
        }
      });
      Object.defineProperty(MouseEvent.prototype, 'clientY', {
        configurable: true,
        enumerable: mouseY.enumerable,
        get() {
          return mappedPoint(mouseX.get.call(this), mouseY.get.call(this)).y;
        }
      });
      mousePatched = true;
    } catch (err) {
      mousePatched = false;
    }
  }

  function restoreMouse() {
    if (!mousePatched) return;
    try {
      Object.defineProperty(MouseEvent.prototype, 'clientX', mouseX);
      Object.defineProperty(MouseEvent.prototype, 'clientY', mouseY);
    } catch (err) { /* ignore */ }
    mousePatched = false;
  }

  function dispatchResize() {
    const notify = () => {
      suppressResize = true;
      try { window.dispatchEvent(new Event('resize')); } finally { suppressResize = false; }
      const game = window.__G;
      if (game && game.render && typeof game.render.resize === 'function') {
        try { game.render.resize(); } catch (err) { /* ignore */ }
      }
    };
    notify();
    if (!resizeFrame) {
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        notify();
      });
    }
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(notify, 260);
  }

  function writeLayout(nextForced, notify) {
    const changed = nextForced !== forced;
    forced = nextForced;
    root.classList.toggle('mr-force-landscape', forced === 'landscape');
    root.classList.toggle('mr-force-portrait', forced === 'portrait');
    root.dataset.mrForced = forced || '';

    if (forced) {
      const size = logicalSize(forced);
      root.style.setProperty('--vp-w', size.width.toFixed(2) + 'px');
      root.style.setProperty('--vp-h', size.height.toFixed(2) + 'px');
      patchViewport();
      patchTouch();
      patchMouse();
    } else {
      root.style.removeProperty('--vp-w');
      root.style.removeProperty('--vp-h');
      restoreViewport();
      restoreTouch();
      restoreMouse();
    }
    if (notify && (changed || forced)) dispatchResize();
    if (changed) {
      swipe = draggedPane = null;
      try {
        window.dispatchEvent(new CustomEvent('saltline:layoutchange', { detail: { forced } }));
      } catch (err) { /* ignore */ }
    }
  }

  function refresh(notify) {
    writeLayout(effectiveForced(mode), !!notify);
  }

  function setMode(nextMode) {
    mode = MODES.has(nextMode) ? nextMode : 'auto';
    refresh(true);
  }

  window.addEventListener('resize', () => {
    if (suppressResize) return;
    refresh(false);
  });
  window.addEventListener('orientationchange', () => refresh(true));

  mode = readMode();
  writeLayout(effectiveForced(mode), false);

  window.SaltForcedLayout = {
    setMode,
    refresh: () => refresh(true),
    getMode: () => mode,
    getForced: () => forced,
    physicalSize,
    logicalSize: () => logicalSize(forced)
  };
})();
