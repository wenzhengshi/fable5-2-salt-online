(() => {
  'use strict';

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
      try {
        window.dispatchEvent(new CustomEvent('saltline:layoutchange', { detail: { forced } }));
      } catch (err) { /* ignore */ }
    }
  }

  function refresh(notify) {
    writeLayout(forcedFor(mode), !!notify);
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
  writeLayout(forcedFor(mode), false);

  window.SaltForcedLayout = {
    setMode,
    refresh: () => refresh(true),
    getMode: () => mode,
    getForced: () => forced,
    physicalSize,
    logicalSize: () => logicalSize(forced)
  };
})();
