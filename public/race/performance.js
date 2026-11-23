(function (root) {
  'use strict';

  const step = 1 / 90;
  const maxSteps = 24;
  const tiers = {
    low: { dpr: 1, pixels: 1150000, shadows: 0, mirrors: 12, mirrorWidth: 96, rows: 5 },
    medium: { dpr: 1.15, pixels: 1750000, shadows: 8, mirrors: 8, mirrorWidth: 144, rows: 5 },
    high: { dpr: 1.4, pixels: 2450000, shadows: 5, mirrors: 5, mirrorWidth: 192, rows: 5 },
    ultra: { dpr: 1.65, pixels: 3200000, shadows: 3, mirrors: 3, mirrorWidth: 240, rows: 5 },
  };

  const legacyTiers = { minimal: 'low', smooth: 'low' };

  function validTier(value) {
    return value === 'auto' || Object.hasOwn(tiers, value);
  }

  function normalizeTier(value) {
    const raw = String(value || '');
    return legacyTiers[raw] || raw;
  }

  function detectTier() {
    const ua = String(navigator.userAgent || '');
    const shortSide = Math.min(Number(screen.width) || 0, Number(screen.height) || 0);
    if (/Android|iPhone|iPad|Mobile/i.test(ua) ||
        (navigator.maxTouchPoints > 1 && shortSide > 0 && shortSide < 900)) return 'low';
    let renderer = '';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    } catch (error) { /* GPU probing is best-effort. */ }
    return /SwiftShader|llvmpipe|Software|Mali|Adreno|PowerVR/i.test(renderer) ||
      (/Intel/i.test(renderer) && !/Arc/i.test(renderer)) ? 'medium' : 'high';
  }

  function createClock() {
    // Count ticks from accumulated time so rounding at exact tick boundaries
    // cannot produce a different number of steps on different displays.
    let debt = 0;
    return {
      advance(seconds, tick) {
        debt += seconds;
        const steps = Math.min(maxSteps, Math.floor(debt / step + 1e-8));
        for (let i = 0; i < steps; i++) {
          debt = Math.max(0, debt - step);
          if (tick(step) === false) { debt = 0; break; }
        }
      },
      get behind() { return debt >= step; },
      reset() { debt = 0; },
    };
  }

  const performance = { tiers, createClock, validTier, normalizeTier, detectTier };
  if (typeof module === 'object' && module.exports) module.exports = performance;
  else root.SaltRacePerformance = performance;
})(globalThis);
