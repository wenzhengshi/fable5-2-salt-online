/*
 * graphics-boot.js — standalone-quality compatibility bridge.
 *
 * The engine consumes texture, anisotropy, effect and frame-cap values once
 * while it boots. This bridge forwards the saved v2 graphics profile before
 * game.bundle.js starts, so values that require a reload actually rebuild the
 * material atlases instead of only changing the settings UI.
 *
 * The file is idempotent: index.ejs and boot-gate.js may both load it.
 */
(() => {
  'use strict';
  if (window.__SALT_GRAPHICS_BOOT_LOADED__) return;
  window.__SALT_GRAPHICS_BOOT_LOADED__ = true;

  try {
    const url = new URL(location.href);
    const forced = url.searchParams.get('q');
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('saltline.settings.v1') || 'null'); } catch (error) { saved = null; }
    window.__SALT_MANUAL_QUALITY__ = ['low', 'medium', 'high', 'ultra'].includes(forced) ||
      !!(saved && saved.quality && saved.quality !== 'auto');
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem('saltline.graphics.v1') || 'null'); } catch (error) { profile = null; }
    const advanced = profile && profile.advanced && typeof profile.advanced === 'object'
      ? profile.advanced
      : null;
    if (!advanced) return;
    // Drop stale old-build overrides first; only the saved v2 values below win.
    url.searchParams.delete('tex');
    url.searchParams.delete('aniso');
    url.searchParams.delete('dynres');
    const setNumber = (key, value, min, max) => {
      const number = Number(value);
      if (!Number.isFinite(number) || number < min || number > max) return;
      url.searchParams.set(key, String(number));
    };
    if (Number(advanced.texture) > 0) setNumber('tex', advanced.texture, 256, 1024);
    if (Number(advanced.anisotropy) > 0) setNumber('aniso', advanced.anisotropy, 1, 16);
    if (Number.isFinite(Number(advanced.frameCap)) && Number(advanced.frameCap) > 0) {
      window.__SALT_FRAME_CAP__ = Math.max(0, Math.min(240, Math.round(Number(advanced.frameCap))));
    }
    if (url.href !== location.href) history.replaceState(history.state, '', url.href);
  } catch (error) {
    // URL rewriting is best-effort; the game can still boot with defaults.
  }
})();
