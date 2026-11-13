(() => {
  'use strict';

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  if (typeof originalGetContext !== 'function') return;

  const SOFTWARE_RE = /SwiftShader|llvmpipe|Softpipe|Software Rasterizer|Microsoft Basic Render/i;
  const RENDERER_ATTRS = {
    alpha: false,
    depth: true,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false
  };

  const fallbacks = [
    {},
    { powerPreference: 'default' },
    { powerPreference: 'low-power' },
    { antialias: false, stencil: false },
    { alpha: true, antialias: false },
    { desynchronized: false }
  ];

  const heldContexts = new WeakMap();
  const observedCanvases = new WeakSet();
  const attempts = [];
  let attemptSerial = 0;
  let lastCreationError = '';
  let lastGood = null;
  let heldCount = 0;

  function remember(context, attrs) {
    attempts.push({ n: ++attemptSerial, ok: true, attrs });
    if (attempts.length > 24) attempts.splice(0, attempts.length - 24);
    let renderer = '';
    let software = false;
    try {
      const info = context.getExtension('WEBGL_debug_renderer_info');
      renderer = String(info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER));
      software = SOFTWARE_RE.test(renderer);
    } catch (err) { /* ignore diagnostics failures */ }
    lastGood = {
      webgl2: true,
      software,
      renderer,
      recovered: attemptSerial > 1,
      held: true,
      attempts: attempts.slice(-8)
    };
    window.__SALT_GFX__ = lastGood;
  }

  function fail(attrs, error) {
    attempts.push({ n: ++attemptSerial, ok: false, attrs, error: error || lastCreationError || undefined });
    if (attempts.length > 24) attempts.splice(0, attempts.length - 24);
  }

  function observe(canvas) {
    if (!canvas || observedCanvases.has(canvas)) return;
    observedCanvases.add(canvas);
    try {
      canvas.addEventListener('webglcontextcreationerror', (event) => {
        lastCreationError = String(event && event.statusMessage || 'WebGL context creation failed');
      }, false);
    } catch (err) { /* ignore */ }
  }

  function createOnCanvas(canvas, requested) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    observe(canvas);
    const base = requested && typeof requested === 'object' ? requested : {};
    const seen = new Set();
    for (const fallback of fallbacks) {
      const attrs = Object.assign({}, RENDERER_ATTRS, base, fallback);
      let key = '';
      try { key = JSON.stringify(attrs, Object.keys(attrs).sort()); } catch (err) { key = String(attemptSerial); }
      if (seen.has(key)) continue;
      seen.add(key);
      let context = null;
      try {
        context = originalGetContext.call(canvas, 'webgl2', attrs);
      } catch (err) {
        fail(attrs, err && err.message ? err.message : String(err));
      }
      if (context && typeof context.isContextLost === 'function' && context.isContextLost()) {
        fail(attrs, 'WebGL context was lost immediately after creation');
        context = null;
      }
      if (context) {
        if (!heldContexts.has(canvas)) heldCount += 1;
        heldContexts.set(canvas, context);
        remember(context, attrs);
        return context;
      }
      if (!attempts.length || attempts[attempts.length - 1].ok) fail(attrs);
    }
    if (heldCount === 0) {
      window.__SALT_GFX__ = {
        webgl2: false,
        recovered: false,
        held: false,
        error: lastCreationError || undefined,
        attempts: attempts.slice(-8)
      };
    } else if (lastGood) {
      window.__SALT_GFX__ = Object.assign({}, lastGood, {
        lastFailure: lastCreationError || 'Auxiliary WebGL context creation failed',
        attempts: attempts.slice(-8)
      });
    }
    return null;
  }

  HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, attrs) {
    if (type !== 'webgl2' && type !== 'webgl') {
      return originalGetContext.call(this, type, attrs);
    }
    if (type === 'webgl') {
      return originalGetContext.call(this, type, attrs);
    }
    const held = heldContexts.get(this);
    if (held && (!held.isContextLost || !held.isContextLost())) return held;
    return createOnCanvas(this, attrs);
  };

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  function nextFrame() {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 16);
      }
    });
  }

  async function ensure(canvas, options) {
    const opts = options || {};
    const delays = Array.isArray(opts.delays) && opts.delays.length
      ? opts.delays
      : [0, 100, 250, 500, 800, 1200, 1800, 2500];
    const requested = opts.attrs || RENDERER_ATTRS;

    const existing = heldContexts.get(canvas);
    if (existing && (!existing.isContextLost || !existing.isContextLost())) return existing;

    for (let round = 0; round < delays.length; round += 1) {
      if (delays[round] > 0) {
        if (round === 1) await nextFrame();
        await wait(delays[round]);
      }
      if (typeof opts.onAttempt === 'function') {
        try { opts.onAttempt(round + 1, delays.length, delays[round]); } catch (err) { /* ignore */ }
      }
      const context = createOnCanvas(canvas, requested);
      if (context) return context;
    }
    return null;
  }

  function release(canvas) {
    const context = heldContexts.get(canvas);
    if (!context) return false;
    heldContexts.delete(canvas);
    heldCount = Math.max(0, heldCount - 1);
    try {
      const lose = context.getExtension && context.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (err) { /* ignore */ }
    return true;
  }

  window.__SALT_GFX__ = { webgl2: null, recovered: false, held: false, attempts: [] };
  window.__SALT_WEBGL__ = {
    version: '1.24.5',
    attrs: RENDERER_ATTRS,
    ensure,
    release,
    status() {
      return {
        ...(window.__SALT_GFX__ || {}),
        attemptSerial,
        heldContexts: heldCount,
        powerPreference: RENDERER_ATTRS.powerPreference,
        maxAttempts: 8
      };
    }
  };
})();
