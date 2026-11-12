(() => {
  'use strict';

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  if (typeof originalGetContext !== 'function') return;

  const params = new URLSearchParams(location.search);
  const force2d = params.get('gfx') === '2d' || params.get('render') === '2d';

  const attempts = [];
  const common = {
    alpha: false,
    depth: true,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false
  };

  const fallbacks = [
    {},
    { powerPreference: 'default' },
    { powerPreference: 'default', antialias: false, stencil: false },
    { powerPreference: 'low-power', antialias: false, alpha: true },
    { powerPreference: 'default', antialias: false, alpha: true, stencil: true },
    { powerPreference: 'default', antialias: false, alpha: false, desynchronized: false }
  ];

  function createContext(canvas, requested) {
    const base = requested && typeof requested === 'object' ? requested : {};
    const seen = new Set();
    for (const fallback of fallbacks) {
      const attrs = Object.assign({}, common, base, fallback);
      const key = JSON.stringify(attrs, Object.keys(attrs).sort());
      if (seen.has(key)) continue;
      seen.add(key);
      let context = null;
      try {
        context = originalGetContext.call(canvas, 'webgl2', attrs);
      } catch (err) {
        attempts.push({ ok: false, attrs, error: err && err.message ? err.message : String(err) });
      }
      if (context) {
        attempts.push({ ok: true, attrs });
        window.__SALT_GFX__ = {
          webgl2: true,
          recovered: attempts.length > 1,
          attempts: attempts.slice(-6)
        };
        return context;
      }
      if (!attempts.length || attempts[attempts.length - 1].error == null) {
        attempts.push({ ok: false, attrs });
      }
    }
    window.__SALT_GFX__ = {
      webgl2: false,
      recovered: false,
      attempts: attempts.slice(-8)
    };
    return null;
  }

  HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, attrs) {
    if (type !== 'webgl2') return originalGetContext.call(this, type, attrs);
    if (force2d) {
      window.__SALT_GFX__ = { webgl2: false, forced: true, recovered: false, attempts: [] };
      return null;
    }
    return createContext(this, attrs);
  };

  window.__SALT_GFX__ = { webgl2: null, recovered: false, attempts: [] };
})();
