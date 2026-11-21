(function (root) {
  'use strict';

  const step = 1 / 90;
  const maxSteps = 24;
  const tiers = {
    minimal: { dpr: .65, pixels: 480000, shadows: 0, mirrors: 0, mirrorWidth: 0, rows: 3 },
    smooth: { dpr: .85, pixels: 740000, shadows: 0, mirrors: 0, mirrorWidth: 0, rows: 4 },
    low: { dpr: 1, pixels: 1150000, shadows: 0, mirrors: 12, mirrorWidth: 96, rows: 5 },
    medium: { dpr: 1.15, pixels: 1750000, shadows: 8, mirrors: 8, mirrorWidth: 144, rows: 5 },
    high: { dpr: 1.4, pixels: 2450000, shadows: 5, mirrors: 5, mirrorWidth: 192, rows: 5 },
    ultra: { dpr: 1.65, pixels: 3200000, shadows: 3, mirrors: 3, mirrorWidth: 240, rows: 5 },
  };

  function validTier(value) {
    return value === 'auto' || Object.hasOwn(tiers, value);
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

  const performance = { tiers, createClock, validTier };
  if (typeof module === 'object' && module.exports) module.exports = performance;
  else root.SaltRacePerformance = performance;
})(globalThis);
