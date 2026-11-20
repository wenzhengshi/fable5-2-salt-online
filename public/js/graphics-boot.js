/*
 * graphics-boot.js — pre-boot bridge for the advanced graphics settings.
 *
 * game.bundle.js creates its quality object, materials and rain particles
 * before client-options.js finishes booting. This script runs before
 * game.bundle.js and forwards only the settings that must exist at build
 * time: texture size, anisotropy, dynamic-resolution override and rain
 * density. Runtime-safe settings are applied later by client-options.js.
 *
 * Important: texture/anisotropy are GLOBAL advanced values, so they must be
 * clamped to the selected tier here as well. Otherwise a saved "Low" tier
 * still builds the material atlas at the saved High/Ultra anisotropy (the old
 * "Follow max" value resolved to the GPU maximum, usually 8x) and the saved
 * 90% render scale. That made Low look like High on Intel UHD 630.
 *
 * Keep the cap table in sync with TIER_CAPS in client-options.js and the
 * small cap table in Gg() inside game.bundle.js.
 *
 * The file is idempotent: index.ejs and boot-gate.js may both load it.
 */
(() => {
  'use strict';
  if (window.__SALT_GRAPHICS_BOOT_LOADED__) return;
  window.__SALT_GRAPHICS_BOOT_LOADED__ = true;

  const KEY = 'saltline.graphics.v1';
  const SETTINGS_KEY = 'saltline.settings.v1';
  const TIERS = ['minimal', 'smooth', 'low', 'medium', 'high', 'ultra'];

  // Keep these values aligned with TIER_CAPS in client-options.js.
  const CAPS = {
    minimal: { texture: 256, anisotropy: 1, rain: .2 },
    smooth: { texture: 512, anisotropy: 2, rain: 0 },
    low: { texture: 512, anisotropy: 2, rain: .35 },
    medium: { texture: 1024, anisotropy: 4, rain: .6 },
    high: { texture: 1024, anisotropy: 8, rain: .8 },
    ultra: { texture: 1024, anisotropy: 8, rain: 1 }
  };

  const finite = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const parseObject = (key) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const graphics = parseObject(KEY);
  const settings = parseObject(SETTINGS_KEY);
  const advanced = graphics.advanced && typeof graphics.advanced === 'object' && !Array.isArray(graphics.advanced)
    ? graphics.advanced
    : {};

  // URL ?q= wins for benchmark/debug URL, then the saved manual tier. Auto
  // defaults to Medium on desktop and Low on phones (the Android client is
  // allowed to start lower; Auto still only drops, never upgrades by itself).
  const urlTier = (() => {
    try {
      return new URL(location.href).searchParams.get('q') || '';
    } catch (error) {
      return '';
    }
  })();
  const savedTier = String(settings.quality || '');
  const mobile = /Android|iPhone|iPad|Mobile/i.test(String(navigator.userAgent || ''));
  const shortSide = Math.min(Number(screen.width) || 0, Number(screen.height) || 0);
  const mobileMinimal = (Number(navigator.deviceMemory) || 0) > 0 && Number(navigator.deviceMemory) <= 3
    || (Number(navigator.hardwareConcurrency) || 0) > 0 && Number(navigator.hardwareConcurrency) <= 4
    || (shortSide > 0 && shortSide < 380);
  const autoTier = mobile ? (mobileMinimal ? 'minimal' : 'low') : 'medium';
  const tier = TIERS.includes(urlTier) ? urlTier
    : TIERS.includes(savedTier) ? savedTier
      : autoTier;
  const cap = CAPS[tier] || CAPS.medium;

  const texture = finite(advanced.texture);
  const anisotropy = finite(advanced.anisotropy);
  const rain = finite(advanced.rain);
  const frameCap = finite(advanced.frameCap);

  // An explicit advanced value is still capped by the selected tier. "Follow
  // tier cap" (0) must become an explicit cap, not 0: Gg() treats 0 as "use
  // GPU maximum", which was the main source of unnecessary 8x anisotropy on
  // Low/Medium.
  const effectiveTexture = texture && texture > 0
    ? Math.max(64, Math.min(cap.texture, Math.round(texture)))
    : cap.texture;
  const effectiveAnisotropy = anisotropy && anisotropy > 0
    ? Math.max(1, Math.min(cap.anisotropy, Math.round(anisotropy)))
    : cap.anisotropy;

  window.__SALT_GRAPHICS_PREBOOT__ = {
    tier,
    texture: effectiveTexture,
    anisotropy: effectiveAnisotropy,
    rain: rain == null ? null : Math.max(0, Math.min(cap.rain, rain)),
    frameCap: frameCap && frameCap > 0 ? Math.max(30, Math.min(120, Math.round(frameCap))) : 0
  };

  // Gg() reads params.tex and params.aniso while it builds the material atlas.
  // Rewriting the query before game.bundle.js starts is safer than touching
  // the already-built atlas later.
  try {
    const url = new URL(location.href);
    url.searchParams.set('tex', String(effectiveTexture));
    url.searchParams.set('aniso', String(effectiveAnisotropy));
    if (advanced.dynamic === false) {
      url.searchParams.set('dynres', '0');
    } else if (advanced.dynamic === true) {
      url.searchParams.delete('dynres');
    }
    if (url.href !== location.href) history.replaceState(history.state, '', url.href);
  } catch (error) {
    // URL rewriting is best-effort; the game can still boot with defaults.
  }

  // Rain particle buffers are allocated in Nb() from quality.rain. When the
  // player has explicitly saved a density, build the buffer at that density.
  if (window.__SALT_GRAPHICS_PREBOOT__.rain != null) {
    window.__SALT_GRAPHICS_PREBOOT_QUALITY__ = {
      rain: window.__SALT_GRAPHICS_PREBOOT__.rain
    };
  }

  // The animation-loop hook reads this value every frame. Set it before the
  // first frame so a saved limit does not briefly run at full speed.
  if (window.__SALT_GRAPHICS_PREBOOT__.frameCap > 0) {
    window.__SALT_FRAME_CAP__ = window.__SALT_GRAPHICS_PREBOOT__.frameCap;
  }
})();
