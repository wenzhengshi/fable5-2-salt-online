(() => {
  'use strict';

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  if (typeof originalGetContext !== 'function') return;

  const SOFTWARE_RE = /SwiftShader|llvmpipe|Softpipe|Software Rasterizer|Microsoft Basic Render/i;
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

  function rendererName(context) {
    try {
      const info = context.getExtension('WEBGL_debug_renderer_info');
      return String(info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER));
    } catch (err) {
      return '';
    }
  }

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
        const renderer = rendererName(context);
        window.__SALT_GFX__ = {
          webgl2: true,
          software: SOFTWARE_RE.test(renderer),
          renderer,
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
    return createContext(this, attrs);
  };

  window.__SALT_GFX__ = { webgl2: null, recovered: false, attempts: [] };

  try {
    const probe = document.createElement('canvas');
    const context = originalGetContext.call(probe, 'webgl2', common);
    if (context) {
      const renderer = rendererName(context);
      window.__SALT_GFX__ = {
        webgl2: true,
        software: SOFTWARE_RE.test(renderer),
        renderer,
        recovered: false,
        attempts: []
      };
      const lose = context.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } else {
      window.__SALT_GFX__ = { webgl2: false, recovered: false, attempts: [] };
    }
  } catch (err) {
    window.__SALT_GFX__ = { webgl2: false, recovered: false, attempts: [] };
  }
})();
