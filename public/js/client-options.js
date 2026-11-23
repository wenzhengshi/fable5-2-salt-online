/*
 * client-options.js — client-side quality and display options
 *
 * The quality control mirrors the standalone Saltline build:
 *   1. Four manual presets (low / medium / high / ultra) with the exact same
 *      renderer values and device auto-detection as the standalone HTML.
 *   2. The saved value defaults to "auto" but the panel only shows the four
 *      buttons; the detected tier is highlighted until the player picks one.
 *   3. A click applies the full preset immediately and persists the choice.
 *   4. Per-tier effects and global advanced values are merged into the preset
 *      sent to the renderer; the smart resolution governor only changes
 *      internal pixels and never silently changes a manual tier.
 *   5. A bilingual SALTLINE BENCH overlay with a small visibility toggle.
 *   6. Banner text/backdrop opacity and text size (localStorage, not on the
 *      server).
 *
 * The engine hooks used here are deliberately limited and documented in
 * game.bundle.js: setDynamicResolution, setRainDensity and the animation-loop
 * frame cap. graphics-boot.js forwards build-time values (texture/anisotropy/
 * rain/dynamic resolution) before game.bundle.js starts.
 */
(() => {
  'use strict';

  if (window.__SALT_CLIENT_OPTIONS_LOADED__) return;
  window.__SALT_CLIENT_OPTIONS_LOADED__ = true;

  let raceGraphics;
  const SETTINGS_KEY = 'saltline.settings.v1';
  const OVERLAY_KEY = 'saltline.benchOverlay';
  const MIGRATION_KEY = 'saltline.autoQualityMigrated.v1';
  const BANNER_OPACITY_KEY = 'saltline.bannerOpacity';
  const BANNER_FONT_KEY = 'saltline.bannerFontSize';
  const BANNER_LOOK_MIGRATION_KEY = 'saltline.bannerLookMigrated.v1';
  const BANNER_DEFAULT_OPACITY = 80;
  const BANNER_DEFAULT_FONT = 100;
  const BANNER_FONT_MIN = 70;
  const BANNER_FONT_MAX = 130;
  const BANNER_FONT_STEP = 5;
  const GRAPHICS_KEY = 'saltline.graphics.v1';
  const GRAPHICS_PROFILE_VERSION = 2;
  const GRAPHICS_CAP_KEY = 'saltline.graphics.tierCaps.v1';
  const AUTO_TIER = 'auto';
  const QUALITY_TIERS = ['low', 'medium', 'high', 'ultra'];
  const LEGACY_QUALITY_TIERS = { minimal: 'low', smooth: 'low' };
  const RANK = { minimal: 0, smooth: 1, low: 2, medium: 3, high: 4, ultra: 5 };
  const NEXT_TIER = { ultra: 'high', high: 'medium', medium: 'low' };

  // Auto only. Manual tiers are never touched by this table. The smart
  // resolution governor keeps the selected tier's look while reducing only
  // internal pixels, so dense maps can start one step higher than before.
  const MAP_AUTO_CAP = {
    bayhaven: 'high',
    dustfall: 'medium',
    mothlight: 'medium',
    lunar: 'medium'
  };
  const TIERS = ['minimal', 'smooth', 'low', 'medium', 'high', 'ultra'];
  const TIER_CN = { minimal: '极低', smooth: '流畅', low: '低', medium: '中', high: '高', ultra: '极高' };
  const TIER_EN = { minimal: 'Minimal', smooth: 'Smooth', low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra' };

  // Nominal presets. Player-editable tier effects and global advanced values
  // are merged into these by effectivePreset() before render.setQuality().
  const PRESETS = {
    low: { name: 'low', scale: .7, maxDpr: 1.25, msaa: 0, shadow: 1024, tex: 512, volSteps: 12, ao: false, planar: 0, bloom: true, motionBlur: false, rain: .5 },
    medium: { name: 'medium', scale: .85, maxDpr: 1.5, msaa: 2, shadow: 2048, tex: 1024, volSteps: 16, ao: true, planar: .5, bloom: true, motionBlur: false, rain: .8 },
    high: { name: 'high', scale: 1, maxDpr: 2, msaa: 4, shadow: 4096, tex: 1024, volSteps: 24, ao: true, planar: .5, bloom: true, motionBlur: true, rain: 1 },
    ultra: { name: 'ultra', scale: 1, maxDpr: 3, msaa: 4, shadow: 4096, tex: 2048, volSteps: 40, ao: true, planar: 1, bloom: true, motionBlur: true, rain: 1 }
  };

  // Hard budgets for each tier. PRESETS describe the nominal look; these
  // caps are the real ceiling for that tier. Keep in sync with the tiny cap
  // table in graphics-boot.js and Gg() in game.bundle.js.
  //
  // Why this exists: the advanced page stores one global renderScale and one
  // global texture/anisotropy value. Without these caps, selecting "Low"
  // still rendered at the saved 90% scale + max anisotropy + 2048 atlas,
  // which is why Low looked like High on Intel UHD 630.
  const TIER_CAPS = {
    minimal: { scale: 50, shadow: 0, bloom: false, planar: 0, volSteps: 0, msaa: 0, ao: false, texture: 256, anisotropy: 1, rain: .2, motionBlur: false },
    smooth: { scale: 74, shadow: 0, bloom: false, planar: 0, volSteps: 0, msaa: 0, ao: false, texture: 512, anisotropy: 2, rain: 0, motionBlur: false },
    low: { scale: 70, shadow: 1024, bloom: true, planar: 0, volSteps: 12, msaa: 0, ao: false, texture: 512, anisotropy: 4, rain: .5, motionBlur: false },
    medium: { scale: 85, shadow: 2048, bloom: true, planar: .5, volSteps: 16, msaa: 2, ao: true, texture: 1024, anisotropy: 8, rain: .8, motionBlur: false },
    high: { scale: 100, shadow: 4096, bloom: true, planar: .5, volSteps: 24, msaa: 4, ao: true, texture: 1024, anisotropy: 16, rain: 1, motionBlur: true },
    ultra: { scale: 100, shadow: 4096, bloom: true, planar: 1, volSteps: 40, msaa: 4, ao: true, texture: 1024, anisotropy: 16, rain: 1, motionBlur: true }
  };

  let G = null;
  let autoMode = true;
  let overlayOn = false;
  let overlay = null;
  let overlayRaf = 0;
  let overlayLastFrame = 0;
  let overlayLastPaint = 0;
  let overlayStartedAt = 0;
  let playStartedAt = 0;
  let frameSamples = [];
  let gameSamples = [];
  let slowSince = 0;
  let lastDropAt = 0;
  let drops = 0;
  let lastAutoZone = '';
  let uiTimer = 0;
  let toastTimer = 0;
  let bannerOpacity = BANNER_DEFAULT_OPACITY;
  let bannerFontSize = BANNER_DEFAULT_FONT;
  let graphics = null;
  let advancedDraft = null;
  let advancedDirty = false;
  let gfxPage = null;
  let gfxOpen = false;
  let gfxOpener = null;
  let applyTimer = 0;
  let savedFlashTimer = 0;
  let gfxCloseTimer = 0;
  let lastAppliedSignature = '';
  let adaptiveRatio = 1;
  let adaptiveBaseScale = 1;
  let adaptiveAccum = 0;
  let adaptiveFrames = 0;
  let adaptiveSlowWindows = 0;
  let adaptiveFastWindows = 0;
  let adaptiveCooldown = 0;

  const SMART_FLOOR = { low: .62, medium: .72, high: .82, ultra: .88 };
  const SMART_RAISE_DELAY = 1800;
  const SMART_LOWER_DELAY = 900;

  const EFFECTS = {
    shadow: { zh: '阴影', en: 'Shadows' },
    bloom: { zh: '泛光', en: 'Bloom' },
    planar: { zh: '水面反射', en: 'Water reflections' },
    volumetric: { zh: '体积光', en: 'Volumetric' },
    msaa: { zh: '抗锯齿', en: 'MSAA' },
    ao: { zh: '环境光遮蔽', en: 'AO' }
  };

  // Settings follow the language chosen on the title screen. Chinese shows
  // Chinese labels with small English option names; English shows English
  // labels with small Chinese option names. Prompts are single-language.
  const UI_LANG = (window.__SALT_I18N__ && window.__SALT_I18N__.lang) === 'en-US' ? 'en-US' : 'zh-CN';
  const UI_EN = UI_LANG === 'en-US';
  const pick = (zh, en) => (UI_EN ? en : zh);
  const messages = (window.__SALT_I18N__ && window.__SALT_I18N__.messages) || {};
  const tr = (key, vars, fallback) => {
    const value = String(key || '').split('.').reduce(
      (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
      messages
    );
    const text = typeof value === 'string' ? value : (fallback || key);
    return String(text).replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  };
  const tierLabel = tier => (UI_EN ? TIER_EN[tier] : TIER_CN[tier]);
  const pair = (zh, en, secondaryTag) => {
    const tag = secondaryTag || 'em';
    const attrs = UI_EN ? ' data-i18n-skip="1" lang="zh-CN"' : '';
    return UI_EN
      ? `${en} <${tag}${attrs}>${zh}</${tag}>`
      : `${zh} <${tag}>${en}</${tag}>`;
  };
  const onOff = on => (on ? pick('开', 'On') : pick('关', 'Off'));

  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function normalizeQualityTier(value) {
    const raw = String(value || '');
    if (QUALITY_TIERS.includes(raw)) return raw;
    return LEGACY_QUALITY_TIERS[raw] || '';
  }

  function savedQuality() {
    const value = readSettings().quality;
    if (value === AUTO_TIER) return AUTO_TIER;
    return normalizeQualityTier(value) || AUTO_TIER;
  }

  function saveQuality(quality) {
    window.__SALT_MANUAL_QUALITY__ = quality !== AUTO_TIER;
    try {
      const settings = readSettings();
      settings.quality = quality;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) { /* storage may be blocked */ }
  }

  function syncManualQualityFlag() {
    window.__SALT_MANUAL_QUALITY__ = savedQuality() !== AUTO_TIER || !!forcedQuality();
  }

  function readOverlay() {
    const params = new URLSearchParams(location.search);
    if (params.get('bench') === '1' || location.hash === '#bench') return true;
    try {
      const value = localStorage.getItem(OVERLAY_KEY);
      if (value === '1' || value === '0') return value === '1';
    } catch (error) { /* ignore */ }
    return false;
  }

  function saveOverlay(on) {
    try { localStorage.setItem(OVERLAY_KEY, on ? '1' : '0'); } catch (error) { /* ignore */ }
  }

  function migrateAutoDefault() {
    try {
      if (localStorage.getItem(MIGRATION_KEY) === '1') return;
      const settings = readSettings();
      // Only seed Auto for a profile that has never saved a quality choice.
      // An existing manual choice must not be silently overwritten by this
      // migration; that would contradict "manual tiers never auto-downgrade".
      if (settings.quality === undefined) {
        settings.quality = AUTO_TIER;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
      localStorage.setItem(MIGRATION_KEY, '1');
    } catch (error) { /* ignore */ }
  }

  // Older builds stored two extra tiers. The standalone panel only knows the
  // four buttons, so fold those saves into Low without touching sens/volume.
  function migrateLegacyQuality() {
    try {
      const settings = readSettings();
      if (settings.quality === 'minimal' || settings.quality === 'smooth') {
        settings.quality = 'low';
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch (error) { /* ignore */ }
  }

  function clampPercent(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function migrateBannerLookDefaults() {
    try {
      if (localStorage.getItem(BANNER_LOOK_MIGRATION_KEY) === '1') return;
      const opacityRaw = localStorage.getItem(BANNER_OPACITY_KEY);
      // The previous build stamped 100 into storage as its default. Move that
      // old default to 80 once, but keep any explicit non-100 user value.
      if (opacityRaw == null || Number(opacityRaw) === 100) {
        localStorage.setItem(BANNER_OPACITY_KEY, String(BANNER_DEFAULT_OPACITY));
      }
      if (localStorage.getItem(BANNER_FONT_KEY) == null) {
        localStorage.setItem(BANNER_FONT_KEY, String(BANNER_DEFAULT_FONT));
      }
      localStorage.setItem(BANNER_LOOK_MIGRATION_KEY, '1');
    } catch (error) { /* ignore */ }
  }

  function readBannerOpacity() {
    try {
      const raw = localStorage.getItem(BANNER_OPACITY_KEY);
      return raw == null ? BANNER_DEFAULT_OPACITY : clampPercent(raw, BANNER_DEFAULT_OPACITY);
    } catch (error) {
      return BANNER_DEFAULT_OPACITY;
    }
  }

  function readBannerFontSize() {
    try {
      const raw = localStorage.getItem(BANNER_FONT_KEY);
      return raw == null ? BANNER_DEFAULT_FONT
        : clampNumber(raw, BANNER_FONT_MIN, BANNER_FONT_MAX, BANNER_FONT_STEP, BANNER_DEFAULT_FONT);
    } catch (error) {
      return BANNER_DEFAULT_FONT;
    }
  }

  function applyBannerOpacity(value, persist) {
    bannerOpacity = clampPercent(value, BANNER_DEFAULT_OPACITY);
    const alpha = bannerOpacity / 100;
    const root = document.documentElement.style;
    root.setProperty('--salt-banner-alpha', String(alpha));
    root.setProperty('--salt-banner-text-alpha', String(alpha));
    // Keep the original top/bottom contrast, but fade the dark card with the
    // same control. At the default 80%, the card becomes .76/.656 opaque.
    root.setProperty('--salt-banner-bg-top', `rgba(8, 11, 13, ${(alpha * .95).toFixed(3)})`);
    root.setProperty('--salt-banner-bg-bottom', `rgba(8, 11, 13, ${(alpha * .82).toFixed(3)})`);
    const input = document.getElementById('salt-banner-opacity');
    if (input && input.value !== String(bannerOpacity)) input.value = String(bannerOpacity);
    const output = document.getElementById('salt-banner-opacity-out');
    if (output) output.textContent = bannerOpacity + '%';
    if (persist) {
      try { localStorage.setItem(BANNER_OPACITY_KEY, String(bannerOpacity)); } catch (error) { /* ignore */ }
    }
  }

  function applyBannerFontSize(value, persist) {
    bannerFontSize = clampNumber(value, BANNER_FONT_MIN, BANNER_FONT_MAX, BANNER_FONT_STEP, BANNER_DEFAULT_FONT);
    document.documentElement.style.setProperty('--salt-banner-font-scale', String(bannerFontSize / 100));
    const input = document.getElementById('salt-banner-font');
    if (input && input.value !== String(bannerFontSize)) input.value = String(bannerFontSize);
    const output = document.getElementById('salt-banner-font-out');
    if (output) output.textContent = bannerFontSize + '%';
    if (persist) {
      try { localStorage.setItem(BANNER_FONT_KEY, String(bannerFontSize)); } catch (error) { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------------
  // Graphics settings model
  // ---------------------------------------------------------------------

  function clampNumber(value, min, max, step, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    const clamped = Math.max(min, Math.min(max, number));
    return step ? Math.round(clamped / step) * step : clamped;
  }

  function tierCap(name) {
    return TIER_CAPS[name] || TIER_CAPS.medium;
  }

  function defaultTier(name) {
    const preset = PRESETS[name] || PRESETS.medium;
    const cap = tierCap(name);
    return {
      shadow: { on: cap.shadow > 0 && preset.shadow > 0, value: Math.min(preset.shadow || cap.shadow, cap.shadow) },
      bloom: { on: cap.bloom && !!preset.bloom },
      planar: { on: cap.planar > 0 && preset.planar > 0, value: Math.min(preset.planar || cap.planar, cap.planar) },
      volumetric: { on: cap.volSteps > 0 && preset.volSteps > 0, value: Math.min(preset.volSteps || cap.volSteps, cap.volSteps) },
      msaa: { on: cap.msaa > 0 && preset.msaa > 0, value: Math.min(preset.msaa || cap.msaa, cap.msaa) },
      ao: { on: cap.ao && !!preset.ao },
      // Port sea surface. This is deliberately separate from planar
      // reflection: one is the water mesh, the other is the screen-space
      // reflection pass. Expedition lake/sea geometry is baked into map
      // chunks and is not a separate object, so this switch only affects
      // the Salt Port sea and is labelled accordingly in the UI.
      water: { on: true }
    };
  }

  function normalizeTier(name, raw) {
    const defaults = defaultTier(name);
    const cap = tierCap(name);
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const result = {};
    for (const key of Object.keys(defaults)) {
      const def = source[key];
      const base = defaults[key];
      if (key === 'shadow' || key === 'planar' || key === 'volumetric' || key === 'msaa') {
        const bounds = key === 'shadow' ? [512, cap.shadow, 512]
          : key === 'planar' ? [.25, cap.planar, .25]
            : key === 'volumetric' ? [4, cap.volSteps, 4]
              : [2, cap.msaa, 2];
        // A tier cap of zero means this effect is not available at all. Do
        // not resurrect it through the old msaa fallback.
        if (bounds[1] <= 0) {
          result[key] = { on: false, value: 0 };
          continue;
        }
        const value = clampNumber(def && def.value, bounds[0], bounds[1], bounds[2], base.value);
        result[key] = {
          on: typeof (def && def.on) === 'boolean' ? def.on : base.on,
          value
        };
      } else {
        const allowed = key === 'bloom' ? cap.bloom : key === 'ao' ? cap.ao : true;
        result[key] = {
          on: allowed && (typeof (def && def.on) === 'boolean' ? def.on : base.on)
        };
      }
    }
    return result;
  }

  function normalizeAdvanced(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    // Gg() in game.bundle.js hard-caps the generated atlas at 1024 px. Keeping
    // 2048 in the UI would be a lie, so the model stops at 1024 as well.
    const textureValues = [0, 256, 512, 1024];
    const anisoValues = [0, 1, 2, 4, 8, 16];
    const texture = clampNumber(source.texture, 0, 1024, 256, 0);
    const anisotropy = clampNumber(source.anisotropy, 0, 16, 1, 0);
    return {
      renderScale: source.renderScale == null ? null : clampNumber(source.renderScale, 50, 100, 5, 100),
      // Smart resolution is on by default. It only scales internal pixels and
      // never changes a manually selected quality tier.
      dynamic: typeof source.dynamic === 'boolean' ? source.dynamic : true,
      motionBlur: typeof source.motionBlur === 'boolean' ? source.motionBlur : null,
      rain: source.rain == null ? null : clampNumber(source.rain, 0, 1, .05, null),
      texture: textureValues.includes(texture) ? texture : 0,
      anisotropy: anisoValues.includes(anisotropy) ? anisotropy : 0,
      frameCap: [0, 30, 60, 90, 120].includes(Number(source.frameCap)) ? Number(source.frameCap) : 0
    };
  }

  function readGraphics() {
    const result = {
      version: GRAPHICS_PROFILE_VERSION,
      tiers: {},
      advanced: normalizeAdvanced(null)
    };
    for (const name of TIERS) result.tiers[name] = defaultTier(name);
    try {
      const raw = localStorage.getItem(GRAPHICS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // v1 capped Low/Medium with effects that were never connected to the
        // renderer. v2 keeps the player's advanced values and quality choice,
        // but rebuilds tier defaults from the real renderer presets.
        if (Number(parsed.version) >= GRAPHICS_PROFILE_VERSION) {
          for (const name of TIERS) {
            result.tiers[name] = normalizeTier(name, parsed.tiers && parsed.tiers[name]);
          }
        }
        result.advanced = normalizeAdvanced(parsed.advanced);
      } else {
        // Optional one-time migration from the previous six boolean switches.
        // The old file kept "true = follow preset, false = force off".
        const legacyRaw = localStorage.getItem('saltline.renderOverrides.v1');
        const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
        if (legacy && typeof legacy === 'object') {
          for (const name of TIERS) {
            for (const key of ['shadow', 'bloom', 'planar', 'volumetric', 'msaa', 'ao']) {
              if (typeof legacy[key] === 'boolean' && !legacy[key]) result.tiers[name][key].on = false;
            }
          }
        }
      }
    } catch (error) { /* storage may be blocked */ }
    try { localStorage.setItem(GRAPHICS_CAP_KEY, '2'); } catch (error) { /* storage may be blocked */ }
    return result;
  }

  function saveGraphics() {
    try {
      localStorage.setItem(GRAPHICS_KEY, JSON.stringify({
        version: GRAPHICS_PROFILE_VERSION,
        tiers: graphics.tiers,
        advanced: graphics.advanced
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function effectivePreset(name) {
    const preset = PRESETS[name];
    if (!preset) return null;
    const state = graphics && graphics.tiers && graphics.tiers[name]
      ? normalizeTier(name, graphics.tiers[name])
      : defaultTier(name);
    const advanced = graphics && graphics.advanced ? graphics.advanced : normalizeAdvanced(null);
    const cap = tierCap(name);
    const requestedScale = advanced.renderScale == null ? preset.scale * 100 : advanced.renderScale;
    const rain = advanced.rain == null ? preset.rain : advanced.rain;
    return {
      ...preset,
      tex: advanced.texture || preset.tex,
      scale: Math.max(.5, Math.min(cap.scale, requestedScale) / 100),
      shadow: state.shadow.on ? state.shadow.value : 0,
      msaa: state.msaa.on ? state.msaa.value : 0,
      volSteps: state.volumetric.on ? state.volumetric.value : 0,
      ao: !!state.ao.on,
      planar: state.planar.on ? state.planar.value : 0,
      bloom: !!state.bloom.on,
      motionBlur: !!(cap.motionBlur && (advanced.motionBlur == null ? preset.motionBlur : advanced.motionBlur)),
      rain: Math.max(0, Math.min(cap.rain, rain))
    };
  }

  function effectiveRain(name) {
    const preset = effectivePreset(name) || PRESETS.medium;
    return preset.rain;
  }

  function gpuName() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return '';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return String(name || '');
    } catch (error) {
      return '';
    }
  }

  function recommendedTier() {
    const ua = String(navigator.userAgent || '');
    const touch = Number(navigator.maxTouchPoints) > 1;
    const shortSide = Math.min(Number(screen.width) || 0, Number(screen.height) || 0);
    const mobile = /Android|iPhone|iPad|Mobile/i.test(ua) || (touch && shortSide > 0 && shortSide < 900);
    const renderer = gpuName();
    if (/SwiftShader|llvmpipe|Software/i.test(renderer)) return 'low';
    if (mobile) {
      // Recent flagship mobile GPUs can hold Medium at the adaptive tier's
      // 0.72 resolution floor; older Mali/Adreno/PowerVR parts stay on Low.
      if (/Apple GPU|Adreno \(TM\) (?:6[5-9][0-9]|7[0-9][0-9]|8[0-9][0-9])|Mali-G(?:7[0-9]|8[0-9]|9[0-9])/i.test(renderer)) return 'medium';
      return 'low';
    }
    if (/Mali|Adreno|PowerVR/i.test(renderer)) return 'medium';
    if (/Intel/i.test(renderer) && !/Arc/i.test(renderer)) return 'medium';
    return 'high';
  }

  function currentMapId() {
    return (G && G.expedition && G.expedition.active && G.expedition.active.id) || 'port';
  }

  function autoTargetTier() {
    const base = recommendedTier();
    const cap = MAP_AUTO_CAP[currentMapId()];
    if (!cap || RANK[base] <= RANK[cap]) return base;
    return cap;
  }

  function currentTier() {
    return G && G.quality && RANK[G.quality.name] != null ? G.quality.name : 'medium';
  }

  function displayTier() {
    if (raceGraphics) return normalizeQualityTier(raceGraphics.getTier()) || 'medium';
    if (forcedQuality()) return normalizeQualityTier(forcedQuality()) || 'medium';
    const saved = savedQuality();
    if (saved === AUTO_TIER) {
      if (G && G.quality && RANK[G.quality.name] != null) {
        return normalizeQualityTier(G.quality.name) || recommendedTier();
      }
      return recommendedTier();
    }
    return normalizeQualityTier(saved) || recommendedTier();
  }

  function forcedQuality() {
    const requested = normalizeQualityTier(G && G.params && G.params.q);
    return QUALITY_TIERS.includes(requested) ? requested : '';
  }

  function applyTier(name) {
    if (!G || !G.render || typeof G.render.setQuality !== 'function') return false;
    const preset = effectivePreset(name);
    if (!preset) return false;
    const rain = effectiveRain(name);
    const signature = JSON.stringify(preset) + '|rain:' + rain;
    if (lastAppliedSignature === signature && G.quality && G.quality.name === preset.name) return true;
    try {
      G.render.setQuality({ ...preset });
      adaptiveBaseScale = Number(preset.scale) || 1;
      resetAdaptiveScale();
      // setQuality() intentionally resets the rain binary. Re-apply the
      // requested density after every quality change.
      if (typeof G.render.setRainDensity === 'function') {
        G.render.setRainDensity(rain);
      }
      lastAppliedSignature = signature;
      return true;
    } catch (error) {
      // Never leave the client on a broken half-applied tier.
      console.warn('[client-options] setQuality failed', error);
      lastAppliedSignature = '';
      window.__SALT_GRAPHICS_SAFE__ = true;
      try {
        const fallback = effectivePreset('low');
        if (fallback) {
          G.render.setQuality({ ...fallback });
          adaptiveBaseScale = Number(fallback.scale) || 1;
          resetAdaptiveScale();
          if (typeof G.render.setRainDensity === 'function') G.render.setRainDensity(effectiveRain('low'));
        }
      } catch (fallbackError) {
        console.warn('[client-options] low fallback failed', fallbackError);
      }
      return false;
    }
  }

  function scheduleApply() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(() => {
      applyTimer = 0;
      if (G && G.render) applyTier(currentTier());
      syncQualityEntry();
      syncQualityNote();
      syncGraphics();
    }, 80);
  }

  function applyFrameCap() {
    const cap = graphics.advanced.frameCap;
    window.__SALT_FRAME_CAP__ = cap > 0 ? cap : 0;
    window.__SALT_FRAME_LAST__ = undefined;
  }

  // Smart resolution is on by default. It replaces the engine's coarse
  // governor with a tier-aware floor and hysteresis, so high/ultra keep far
  // more pixels before resolving downward.
  function applyDynamicResolution() {
    if (!G || !G.render) return;
    const enabled = graphics.advanced.dynamic !== false;
    // The engine's original governor has a fixed 0.85 floor and coarse
    // thresholds. Keep it disabled and run the smoother, tier-aware governor
    // below instead.
    try {
      if (typeof G.render.setDynamicResolution === 'function') G.render.setDynamicResolution(false);
    } catch (error) { /* ignore */ }
    adaptiveBaseScale = Number(G.quality && G.quality.scale) || 1;
    adaptiveRatio = 1;
    adaptiveSlowWindows = 0;
    adaptiveFastWindows = 0;
    adaptiveCooldown = 0;
    adaptiveAccum = 0;
    adaptiveFrames = 0;
    resetAdaptiveScale();
    window.__SALT_SMART_RESOLUTION__ = { enabled, ratio: adaptiveRatio };
  }

  function resetAdaptiveScale() {
    if (!G || !G.render || !G.quality) return;
    adaptiveRatio = 1;
    const next = adaptiveBaseScale * adaptiveRatio;
    if (Math.abs((Number(G.quality.scale) || 1) - next) > 1e-4) {
      G.quality.scale = next;
      try { G.render.resize(); } catch (error) { /* ignore */ }
    }
    if (window.__SALT_SMART_RESOLUTION__) window.__SALT_SMART_RESOLUTION__.ratio = adaptiveRatio;
  }

  function setAdaptiveScale(ratio) {
    if (!G || !G.render || !G.quality) return false;
    const tier = G.quality.name || 'medium';
    const floor = SMART_FLOOR[tier] || .72;
    const next = Math.max(floor, Math.min(1, Math.round(ratio * 50) / 50));
    if (Math.abs(next - adaptiveRatio) < .009) return false;
    adaptiveRatio = next;
    G.quality.scale = adaptiveBaseScale * adaptiveRatio;
    try { G.render.resize(); } catch (error) { /* ignore */ }
    if (window.__SALT_SMART_RESOLUTION__) window.__SALT_SMART_RESOLUTION__.ratio = adaptiveRatio;
    return true;
  }

  function smartResolutionTick(ms) {
    const smart = window.__SALT_SMART_RESOLUTION__;
    if (!smart || !smart.enabled || !G || !G.render || !G.quality || document.hidden) return;
    if (G.game && G.game.state !== 'playing') {
      adaptiveAccum = 0;
      adaptiveFrames = 0;
      return;
    }
    const frameMs = Number(ms);
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 500) return;
    if (adaptiveCooldown > 0) adaptiveCooldown = Math.max(0, adaptiveCooldown - frameMs);
    adaptiveAccum += frameMs;
    adaptiveFrames += 1;
    if (adaptiveFrames < 90 && adaptiveAccum < 1500) return;
    const average = adaptiveAccum / adaptiveFrames;
    adaptiveAccum = 0;
    adaptiveFrames = 0;

    // Two consecutive slow windows avoid reacting to a single loading hitch.
    // Recovery is slower than reduction, which prevents visible scale pumping.
    adaptiveSlowWindows = average > 19.2 ? adaptiveSlowWindows + 1 : 0;
    adaptiveFastWindows = average < 17.2 ? adaptiveFastWindows + 1 : 0;
    if (adaptiveCooldown > 0) return;
    if (adaptiveSlowWindows >= 2 && adaptiveRatio > (SMART_FLOOR[G.quality.name] || .72)) {
      const severity = average > 30 ? 2 : 1;
      if (setAdaptiveScale(adaptiveRatio - .05 * severity)) {
        adaptiveSlowWindows = 0;
        adaptiveFastWindows = 0;
        adaptiveCooldown = SMART_LOWER_DELAY;
      }
      return;
    }
    if (adaptiveFastWindows >= 3 && adaptiveRatio < 1) {
      if (setAdaptiveScale(adaptiveRatio + .04)) {
        adaptiveSlowWindows = 0;
        adaptiveFastWindows = 0;
        adaptiveCooldown = SMART_RAISE_DELAY;
      }
    }
  }

  // The port sea is a real mesh (O1() -> ground.sea in game.bundle.js). The
  // planar pass in the same system is the water/wet-surface reflection and is
  // controlled separately by the "planar" tier effect. Expedition maps build
  // their lakes/sea as baked static chunks, not as a separate water mesh, so
  // this switch intentionally affects the Salt Port sea only.
  function applyWaterSurface(visible) {
    if (!G || !G.ground || !G.ground.sea) return;
    try { G.ground.sea.visible = visible !== false; } catch (error) { /* ignore */ }
  }

  function applySavedGraphics() {
    if (!G || !G.render) return;
    applyFrameCap();
    applyDynamicResolution();
    const forced = forcedQuality();
    // A debug ?q= tier keeps the requested tier, but still receives the
    // player's merged effect values.
    if (forced) return void applyTier(forced);
    const saved = savedQuality();
    if (saved === AUTO_TIER) {
      // Re-apply through the merged preset so advanced effects are live even
      // in Auto mode; the map-aware cap picks the starting tier.
      applyTier(autoTargetTier());
    } else {
      applyTier(saved);
    }
  }

  // One-click restore for the whole graphics page: every tier, the advanced
  // render options, and the saved quality choice. This is intentionally
  // separate from the old "Reset advanced" link, which only clears the draft
  // fields inside the advanced box.
  function resetGraphicsDefaults() {
    if (!graphics) return;
    for (const name of TIERS) graphics.tiers[name] = defaultTier(name);
    graphics.advanced = normalizeAdvanced(null);
    advancedDraft = { ...graphics.advanced };
    advancedDirty = false;
    autoMode = true;
    saveQuality(AUTO_TIER);
    saveGraphics();
    drops = 0;
    slowSince = 0;
    lastDropAt = 0;
    lastAutoZone = '';
    applyFrameCap();
    applyDynamicResolution();
    const target = forcedQuality() ? forcedQuality() : autoTargetTier();
    if (G && G.render) applyTier(target);
    syncAutoButton();
    syncGraphics();
    syncQualityEntry();
    syncQualityNote();
    setStatus(pick('已恢复画质默认；纹理、各向异性、雨量请点“立即重载”完全生效。', 'Graphics defaults restored; reload to rebuild texture/rain resources.'), 'saved');
    const reload = document.getElementById('salt-gfx-reload');
    if (reload) reload.hidden = false;
  }

  // ---------------------------------------------------------------------
  // Auto FPS guard (unchanged behaviour: only drops, never upgrades)
 // ---------------------------------------------------------------------

  function toast(text) {
    let node = document.getElementById('salt-auto-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'salt-auto-toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.textContent = text;
    node.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove('on'), 4200);
  }

  function autoTick(ms, zone) {
    if (!autoMode || !G || zone === 'qingyun' || document.hidden) {
      playStartedAt = 0;
      slowSince = 0;
      return;
    }
    const params = G.params || {};
    if (params.bench || (params.q && params.q !== AUTO_TIER) || params.shot || params.show) {
      playStartedAt = 0;
      slowSince = 0;
      return;
    }
    if (G.game && G.game.state !== 'playing') {
      playStartedAt = 0;
      slowSince = 0;
      return;
    }
    if (!G.game) {
      playStartedAt = 0;
      slowSince = 0;
      return;
    }

    // Auto map budget: switching from Bayhaven (streamed chunks) to Dustfall /
    // Mothlight (full city scene) used to keep the same Auto tier and fall to
    // 12–16 fps. Lower only when the saved choice is Auto; a manual tier is
    // never changed here.
    if (autoMode && !forcedQuality()) {
      const mapId = zone || currentMapId();
      if (mapId !== lastAutoZone) {
        lastAutoZone = mapId;
        const cap = MAP_AUTO_CAP[mapId];
        if (cap) {
          const current = currentTier();
          if (RANK[current] > RANK[cap]) {
            if (applyTier(cap)) {
              syncQualityEntry();
              toast(pick(
                '自动档：重地图已降到 ' + TIER_CN[cap] + '，优先保证帧率。',
                'Auto: heavy map dropped to ' + TIER_EN[cap] + ' to protect FPS.'
              ));
            }
          }
        }
      }
    }

    const now = performance.now();
    if (!playStartedAt) playStartedAt = now;
    if (now - playStartedAt < 5000 || ms > 500 || ms <= 0) return;
    // A sustained sub-25 FPS frame is below a comfortable playable rate.
    // Smart resolution usually recovers before this point; only a tier drop
    // remains as the final guard for genuinely overloaded GPUs.
    const bad = ms > 40;
    const severe = ms > 100;
    if (!bad) {
      slowSince = 0;
      return;
    }
    if (!slowSince) slowSince = now;
    const hold = severe ? 3000 : 1500;
    if (now - slowSince < hold) return;
    slowSince = 0;
    if (now - lastDropAt < 5000 || drops >= 4) return;
    if (!G.render || typeof G.render.stats !== 'function') return;
    let stats;
    try { stats = G.render.stats(); } catch (error) { return; }
    if (!stats) return;

    const current = currentTier();
    const next = NEXT_TIER[current];
    if (!next) return;
    if (!applyTier(next)) return;
    lastDropAt = now;
    drops += 1;
    console.log('[auto-quality] drop', current, '->', next, '(ms=' + Math.round(ms) + ', scale=' + stats.scale + ')');
    syncQualityEntry();
    syncGraphics();
    toast(pick(
      '帧率不足，已自动降到 ' + TIER_CN[next] + '。',
      'Low FPS: auto quality dropped to ' + TIER_EN[next] + '.'
    ));
  }

  function pushGameSample(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value <= 0 || value > 1000) return;
    gameSamples.push(value);
    if (gameSamples.length > 600) gameSamples.shift();
  }

  function wrapSampleFrame() {
    if (!G || !G.render || typeof G.render.sampleFrame !== 'function' || G.render.__saltAutoWrapped) return false;
    const original = G.render.sampleFrame;
    G.render.sampleFrame = function saltAutoSampleFrame(ms, zone) {
      const result = original.apply(this, arguments);
      try {
        pushGameSample(ms);
        smartResolutionTick(ms);
        autoTick(ms, zone);
      } catch (error) { console.warn('[auto-quality] tick failed', error); }
      return result;
    };
    G.render.__saltAutoWrapped = true;
    return true;
  }

  // ---------------------------------------------------------------------
  // Settings UI: compact entry + advanced graphics sub-page
  // ---------------------------------------------------------------------

  function injectStyles() {
    if (document.getElementById('salt-client-options-style')) return;
    const style = document.createElement('style');
    style.id = 'salt-client-options-style';
    style.textContent = `
      #salt-auto-quality { flex: 1.7 1 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; line-height: 1.1; letter-spacing: .04em; }
      #salt-auto-quality > span:first-child { font-size: 10px; letter-spacing: 0; white-space: nowrap; }
      #salt-auto-quality .salt-auto-en { font-size: 9px; opacity: .62; letter-spacing: .08em; }
      .salt-bench-row .salt-en, .salt-banner-row .salt-en, .salt-quality-entry .salt-en { margin-left: .35em; font-size: 9px; letter-spacing: .06em; text-transform: none; opacity: .62; }
      .salt-bench-row .toggle span { min-width: 7ch; text-align: left; }
      .salt-banner-controls { display: grid; gap: 8px; margin-top: 2px; }
      .salt-banner-control { display: grid; gap: 5px; min-width: 0; }
      .salt-banner-control-label { color: var(--bone-dim, #b9b4a8); font: 600 10px/1.2 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
      .salt-banner-control .slider { gap: 10px; }
      .salt-banner-control .slider output { min-width: 4.5ch; font-size: 11px; }
      @media (max-width: 760px) {
        .salt-banner-controls { gap: 7px; }
        .salt-banner-control-label { font-size: 9.5px; letter-spacing: .08em; }
      }
      .salt-quality-original-hidden { display: none !important; }
      body.salt-gfx-open { overflow: hidden; }
      body.salt-gfx-open .lang-switch { visibility: hidden; }
      .salt-quality-entry { align-items: center; }
      .salt-quality-entry label { flex: 0 0 auto; }
      #salt-open-graphics { display: flex; align-items: center; gap: 8px; min-height: 38px; max-width: 100%; text-align: left; line-height: 1.15; }
      #salt-open-graphics .salt-entry-tier { font-size: 12px; }
      #salt-open-graphics .salt-entry-arrow { font-size: 10px; opacity: .62; white-space: nowrap; }
      .salt-quality-entry .salt-en { margin-left: .25em; }

      #salt-bench-overlay {
        position: fixed;
        left: 12px;
        top: 12px;
        left: max(12px, env(safe-area-inset-left));
        top: max(12px, env(safe-area-inset-top));
        z-index: 95;
        margin: 0;
        padding: 10px 12px;
        max-width: min(560px, 92vw);
        max-height: min(70vh, 620px);
        overflow: auto;
        color: #d8f0d0;
        background: rgba(0, 0, 0, .30);
        border: 1px solid rgba(216, 240, 208, .16);
        font: 12px/1.45 "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        pointer-events: none;
        user-select: none;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .9);
      }
      #salt-bench-overlay[hidden] { display: none !important; }
      #salt-auto-toast {
        position: fixed;
        left: 50%;
        bottom: max(24px, calc(18px + env(safe-area-inset-bottom)));
        transform: translate(-50%, 10px);
        z-index: 120;
        max-width: min(420px, 90vw);
        padding: 10px 14px;
        color: #f3efe4;
        background: rgba(12, 16, 14, .88);
        border: 1px solid rgba(243, 239, 228, .22);
        font: 12px/1.5 "IBM Plex Mono", ui-monospace, monospace;
        text-align: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s, transform .2s;
      }
      #salt-auto-toast.on { opacity: 1; transform: translate(-50%, 0); }

      #salt-graphics {
        position: fixed;
        inset: 0;
        z-index: 150;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #d8f0d0;
        font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        background: rgba(5, 8, 7, .72);
        backdrop-filter: blur(4px);
      }
      #salt-graphics[hidden] { display: none !important; }
      /* On phones the gold HUD sits at 20% height and would otherwise paint
         through the full-width graphics drawer. Hide HUD chrome while the
         drawer is open; it returns immediately on close. */
      body.salt-gfx-open .gold-hud { display: none !important; }
      .salt-gfx-card {
        width: min(860px, 94vw);
        max-height: min(90vh, 900px);
        display: flex;
        flex-direction: column;
        background: #101613;
        border: 1px solid rgba(216, 240, 208, .22);
        box-shadow: 0 24px 80px rgba(0, 0, 0, .55);
        overflow: hidden;
      }
      .salt-gfx-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 18px 12px;
        border-bottom: 1px solid rgba(216, 240, 208, .14);
        background: #131b16;
      }
      .salt-gfx-kicker { font-size: 9px; letter-spacing: .16em; color: #8eaa9b; }
      .salt-gfx-head h2 { margin: 3px 0 0; font: 600 20px/1.2 "Barlow Condensed", "Noto Sans SC", sans-serif; letter-spacing: .03em; }
      .salt-gfx-head h2 em { font-style: normal; font: 10px/1.3 "IBM Plex Mono", monospace; opacity: .66; margin-left: 6px; }
      .salt-gfx-close { flex: 0 0 auto; width: 38px; height: 34px; border: 1px solid rgba(216, 240, 208, .24); background: transparent; color: inherit; font-size: 20px; line-height: 1; cursor: pointer; }
      .salt-gfx-close:hover, .salt-gfx-close:focus-visible { background: rgba(216, 240, 208, .1); outline: none; }
      .salt-gfx-scroll { overflow: auto; overscroll-behavior: contain; padding: 14px 18px 18px; }
      .salt-gfx-tier { margin: 0 0 14px; padding: 12px; border: 1px solid rgba(216, 240, 208, .14); background: rgba(216, 240, 208, .035); }
      .salt-gfx-tier > label { display: block; margin-bottom: 8px; font-size: 10px; letter-spacing: .08em; color: #b8cec1; }
      .salt-gfx-tier > label .salt-en { margin-left: .4em; font-size: 9px; opacity: .62; text-transform: none; }
      .salt-gfx-tier-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }
      .salt-gfx-tier-btn { min-height: 42px; padding: 5px 6px; border: 1px solid rgba(216, 240, 208, .18); background: rgba(0, 0, 0, .18); color: #cfe3d6; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; font: inherit; }
      .salt-gfx-tier-btn b { font-size: 11px; font-weight: 600; }
      .salt-gfx-tier-btn small { font-size: 8px; opacity: .6; letter-spacing: .02em; }
      .salt-gfx-tier-btn[aria-pressed="true"] { border-color: #c8e6c8; background: rgba(170, 220, 177, .2); color: #f3fff0; }
      .salt-gfx-tier-btn[data-gfx-tier="auto"][aria-pressed="true"] { border-color: rgba(255, 207, 106, .4); }
      .salt-gfx-tier-actions { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(216, 240, 208, .1); }
      .salt-gfx-tier-actions .salt-gfx-reset { flex: 0 0 auto; min-height: 30px; padding: 5px 9px; border: 1px solid rgba(229, 199, 139, .48); background: rgba(229, 199, 139, .08); color: #e5c78b; text-decoration: none; }
      .salt-gfx-tier-actions .salt-gfx-reset:hover, .salt-gfx-tier-actions .salt-gfx-reset:focus-visible { border-color: #e5c78b; background: rgba(229, 199, 139, .16); color: #fff3cf; outline: none; }
      .salt-gfx-tier-actions span { font-size: 9px; line-height: 1.4; color: #8fa99b; }
      .salt-gfx-section { margin-top: 14px; }
      .salt-gfx-section h3 { margin: 0 0 3px; font: 600 16px/1.2 "Barlow Condensed", "Noto Sans SC", sans-serif; letter-spacing: .04em; }
      .salt-gfx-section h3 em { font-style: normal; font: 9px/1.2 "IBM Plex Mono", monospace; opacity: .62; margin-left: 5px; }
      .salt-gfx-section-note { margin: 0 0 8px; font-size: 9px; line-height: 1.5; color: #91a89b; }
      .salt-gfx-rows { border-top: 1px solid rgba(216, 240, 208, .14); }
      .salt-gfx-row { display: grid; grid-template-columns: minmax(140px, .9fr) minmax(0, 1.5fr); gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid rgba(216, 240, 208, .1); }
      .salt-gfx-label { min-width: 0; }
      .salt-gfx-label b, .salt-gfx-label em { text-transform: none; }
      .salt-gfx-label b { display: block; font-size: 12px; font-weight: 600; }
      .salt-gfx-label em { display: block; margin-top: 2px; font-style: normal; font-size: 9px; line-height: 1.4; color: #8fa99b; }
      .salt-gfx-control { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .salt-gfx-control-solo { justify-content: flex-end; }
      .salt-gfx-switch { flex: 0 0 auto; min-width: 68px; min-height: 34px; padding: 3px 7px; display: inline-flex; align-items: center; justify-content: space-between; gap: 5px; border: 1px solid rgba(216, 240, 208, .22); background: rgba(0, 0, 0, .2); color: inherit; font: 10px/1 "IBM Plex Mono", monospace; cursor: pointer; }
      .salt-gfx-switch .dot { width: 8px; height: 8px; border-radius: 50%; background: #5d7167; box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }
      .salt-gfx-switch[aria-pressed="true"] { border-color: #b9ddbc; color: #f1fff0; }
      .salt-gfx-switch[aria-pressed="true"] .dot { background: #9ee3a0; box-shadow: 0 0 8px rgba(158,227,160,.55); }
      .salt-gfx-switch:focus-visible, .salt-gfx-tier-btn:focus-visible { outline: 2px solid #a9d6a9; outline-offset: 2px; }
      .salt-gfx-slider { flex: 1 1 auto; display: flex; align-items: center; gap: 8px; min-width: 0; }
      .salt-gfx-slider input[type="range"] { flex: 1 1 auto; min-width: 70px; accent-color: #9ee3a0; }
      .salt-gfx-slider output { flex: 0 0 auto; min-width: 54px; text-align: right; font-size: 10px; color: #cfe4d5; white-space: nowrap; }
      .salt-gfx-select { width: min(170px, 100%); min-height: 34px; padding: 3px 6px; border: 1px solid rgba(216, 240, 208, .22); border-radius: 0; background: #0b110e; color: #d8f0d0; font: 10px/1.2 "IBM Plex Mono", monospace; }
      .salt-gfx-bottom { margin-top: 14px; padding: 11px 12px 10px; border: 1px solid rgba(216, 240, 208, .2); background: rgba(216, 240, 208, .035); }
      .salt-gfx-bottom .salt-gfx-row:last-child { border-bottom: 0; }
      .salt-gfx-warning { margin: 8px 0 0; font-size: 9px; line-height: 1.5; color: #e5c78b; }
      .salt-gfx-footer { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(216, 240, 208, .14); margin-top: 12px; }
      .salt-gfx-status { flex: 1 1 180px; min-height: 1.4em; margin-right: auto; font-size: 10px; line-height: 1.45; color: #9eb6a8; }
      .salt-gfx-status[data-dirty="true"] { color: #e5c78b; }
      .salt-gfx-status[data-saved="true"] { color: #b7e7b7; }
      .salt-gfx-btn { min-height: 38px; padding: 5px 11px; border: 1px solid rgba(216, 240, 208, .24); background: transparent; color: #d8f0d0; font: 10px/1.2 "IBM Plex Mono", monospace; cursor: pointer; }
      .salt-gfx-btn.primary { border-color: #b9ddbc; background: rgba(170, 220, 177, .16); color: #f5fff2; }
      .salt-gfx-btn:hover, .salt-gfx-btn:focus-visible { background: rgba(216, 240, 208, .12); outline: none; }
      .salt-gfx-btn[hidden] { display: none !important; }
      .salt-gfx-reset { border: 0; background: transparent; color: #9ab4a5; font: 9px/1.2 "IBM Plex Mono", monospace; text-decoration: underline; cursor: pointer; padding: 4px 0; }
      .salt-gfx-reset:hover { color: #d8f0d0; }
      .salt-gfx-tip { margin: 5px 0 0; font-size: 9px; line-height: 1.5; color: #91a89b; }
      .salt-gfx-cap-note {
        margin-top: 6px;
        padding: 5px 7px;
        border-left: 2px solid rgba(255, 174, 189, .45);
        background: rgba(255, 174, 189, .045);
        color: #b7c9bb;
        font-size: 9px;
        line-height: 1.55;
      }
      .salt-gfx-switch:disabled, .salt-gfx-select:disabled,
      .salt-gfx-row input[type="range"]:disabled {
        opacity: .42;
        cursor: not-allowed;
      }
      .salt-gfx-badge { display: inline-block; margin-left: 5px; padding: 1px 4px; border: 1px solid rgba(216, 240, 208, .18); font-size: 8px; color: #9eb6a8; vertical-align: middle; }

      @media (max-width: 760px), (pointer: coarse) {
        .seg.salt-quality-seg { flex-wrap: nowrap; }
        .seg.salt-quality-seg button { flex: 1 1 0; min-height: 42px; }
        #salt-bench-overlay {
          left: 8px;
          top: 8px;
          left: max(8px, env(safe-area-inset-left));
          top: max(8px, env(safe-area-inset-top));
          max-width: 92vw;
          max-height: 60vh;
          padding: 8px 10px;
          font-size: 11px;
          line-height: 1.4;
        }
        .salt-bench-row .toggle { min-height: 44px; }
        #salt-graphics { align-items: stretch; }
        body.salt-gfx-open #salt-bench-overlay { display: none !important; }
        .salt-gfx-card { width: 100%; max-height: 100%; height: 100%; border: 0; }
        .salt-gfx-head { padding: max(12px, env(safe-area-inset-top)) 12px 10px; }
        .salt-gfx-head h2 { font-size: 18px; }
        .salt-gfx-head h2 em { display: block; margin: 3px 0 0; }
        .salt-gfx-scroll { padding: 10px 12px max(14px, env(safe-area-inset-bottom)); }
        .salt-gfx-tier { padding: 9px; }
        .salt-gfx-tier-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .salt-gfx-tier-btn { min-height: 46px; }
        .salt-gfx-tier-actions .salt-gfx-reset { min-height: 44px; font-size: 11px; }
        .salt-gfx-row { grid-template-columns: 1fr; gap: 5px; padding: 10px 0; }
        .salt-gfx-label b { font-size: 13px; }
        .salt-gfx-label em { font-size: 9px; }
        .salt-gfx-control { gap: 7px; }
        .salt-gfx-control-solo { justify-content: flex-start; }
        .salt-gfx-switch { min-height: 44px; min-width: 84px; font-size: 11px; }
        .salt-gfx-slider { gap: 6px; }
        .salt-gfx-slider input[type="range"] { min-height: 32px; }
        .salt-gfx-slider output { min-width: 48px; font-size: 10px; }
        .salt-gfx-select, .salt-gfx-btn { min-height: 44px; font-size: 11px; }
        .salt-gfx-footer { gap: 6px; }
        .salt-gfx-status { flex-basis: 100%; }
        .salt-gfx-btn { flex: 1 1 auto; }
        #salt-open-graphics { min-height: 44px; }
      }

      /* ---------------------------------------------------------------
         Settings layout: grouped rows + a right-side graphics drawer.
         The drawer is the same width as the settings panel and slides in
         from the right, so it reads as a second level of the same panel.
         --------------------------------------------------------------- */
      #ui .panel { z-index: 40; }
      #ui .panel .panel-h { padding-top: 16px !important; }

      .salt-settings-groups { display: block; }
      .salt-settings-group { display: block; }
      .salt-settings-group > h3 {
        margin: 18px 0 8px !important;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--line);
      }
      .salt-settings-group:first-child > h3 { margin-top: 8px !important; }
      .salt-settings-group > h3 em {
        margin-left: .4em;
        font-style: normal;
        font: 500 9px/1 var(--f-mono);
        letter-spacing: .08em;
        color: var(--steel);
        text-transform: none;
      }
      .salt-settings-group .row { padding: 12px 0 13px; }
      .salt-settings-group h3 { text-transform: none; letter-spacing: .12em; }
      .salt-settings-group .row label { text-transform: none; letter-spacing: .12em; }
      .salt-settings-group .row label .salt-en,
      .salt-settings-group .salt-banner-control-label .salt-en {
        margin-left: .4em;
        font-size: 9px;
        font-weight: 500;
        letter-spacing: .04em;
        opacity: .62;
        text-transform: none;
      }
      .salt-settings-group .row:last-child { border-bottom: 0; }
      .salt-settings-group .panel-note { margin: 8px 0 10px !important; padding: 0; }

      .salt-quality-entry {
        grid-template-columns: minmax(0, .8fr) minmax(0, 2fr);
        align-items: center;
        gap: 12px;
        margin-top: 4px;
        padding: 8px 0 12px;
      }
      .salt-quality-entry > label { align-self: center; }
      #salt-open-graphics {
        justify-self: stretch;
        width: 100%;
        min-height: 58px;
        padding: 8px 10px 8px 12px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 2px 8px;
        border: 1px solid rgba(255, 179, 71, .48);
        border-left: 3px solid var(--signal);
        background: linear-gradient(90deg, rgba(255, 179, 71, .14), rgba(255, 179, 71, .025));
        color: var(--bone);
        text-align: left;
        line-height: 1.2;
      }
      #salt-open-graphics:hover,
      #salt-open-graphics:focus-visible {
        border-color: var(--signal);
        background: linear-gradient(90deg, rgba(255, 179, 71, .22), rgba(255, 179, 71, .05));
      }
      #salt-open-graphics .salt-entry-tier {
        grid-column: 1 / -1;
        grid-row: 1;
        font: 600 12px/1.2 var(--f-label);
        letter-spacing: .12em;
        text-transform: uppercase;
        color: var(--bone);
      }
      #salt-open-graphics .salt-entry-tier { text-transform: none; }
      #salt-open-graphics .salt-entry-tier .salt-en { text-transform: none; font-size: 9px; opacity: .62; }
      #salt-open-graphics .salt-entry-note {
        grid-column: 1;
        grid-row: 2;
        font: 400 9px/1.45 var(--f-mono);
        letter-spacing: .02em;
        color: var(--steel);
      }
      #salt-open-graphics .salt-entry-advanced {
        grid-column: 2;
        grid-row: 2;
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font: 600 9px/1.1 var(--f-mono);
        letter-spacing: .08em;
        text-transform: uppercase;
        color: var(--signal);
        white-space: nowrap;
      }
      #salt-open-graphics .salt-entry-chevron {
        font: 500 22px/1 var(--f-label);
        color: var(--signal-hot);
        transform: translateY(-1px);
      }

      #salt-graphics {
        position: fixed;
        inset: 0;
        z-index: 150;
        display: flex;
        align-items: stretch;
        justify-content: flex-end;
        color: var(--bone);
        font-family: var(--f-mono);
        background: rgba(5, 8, 7, .34);
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        opacity: 0;
        pointer-events: none;
        transition: opacity .22s ease;
      }
      #salt-graphics.on { opacity: 1; pointer-events: auto; }
      #salt-graphics[hidden] { display: none !important; }
      #salt-graphics .salt-gfx-card {
        width: min(440px, var(--vp-w, 100vw));
        height: 100%;
        max-height: none;
        margin: 0;
        display: flex;
        flex-direction: column;
        background: rgba(11, 13, 15, .98);
        border: 0;
        border-left: 1px solid var(--line);
        box-shadow: -22px 0 70px rgba(0, 0, 0, .5);
        overflow: hidden;
        transform: translateX(102%);
        transition: transform .28s cubic-bezier(.2, .7, .2, 1);
      }
      #salt-graphics.on .salt-gfx-card { transform: none; }
      #salt-graphics .salt-gfx-head {
        padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 12px;
        border-bottom: 1px solid var(--line);
        background: var(--ink-2);
        color: var(--bone);
      }
      #salt-graphics .salt-gfx-kicker { color: var(--steel); }
      #salt-graphics .salt-gfx-head h2 {
        margin-top: 4px;
        color: var(--bone);
        font-family: var(--f-display);
        letter-spacing: .04em;
      }
      #salt-graphics .salt-gfx-head h2 em { color: var(--steel); }
      #salt-graphics .salt-gfx-head-actions {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #salt-graphics .salt-gfx-back {
        min-height: 34px;
        padding: 2px 9px;
        border: 1px solid var(--line);
        background: transparent;
        color: var(--bone-dim);
        font: 500 9px/1.1 var(--f-mono);
        letter-spacing: .04em;
        cursor: pointer;
      }
      #salt-graphics .salt-gfx-back:hover,
      #salt-graphics .salt-gfx-back:focus-visible {
        border-color: var(--signal);
        color: var(--signal);
        outline: none;
      }
      #salt-graphics .salt-gfx-close {
        border-color: var(--line);
        color: var(--bone);
      }
      #salt-graphics .salt-gfx-close:hover,
      #salt-graphics .salt-gfx-close:focus-visible {
        border-color: var(--signal);
        background: rgba(255, 179, 71, .12);
        color: var(--signal-hot);
      }
      #salt-graphics .salt-gfx-scroll {
        padding: 12px 16px max(18px, env(safe-area-inset-bottom, 0px));
        background: transparent;
      }
      #salt-graphics .salt-gfx-page-note {
        margin: 0 0 12px;
        padding: 8px 9px;
        border-left: 2px solid var(--signal);
        background: rgba(255, 179, 71, .08);
        color: var(--bone-dim);
        font-size: 9px;
        line-height: 1.5;
      }
      #salt-graphics .salt-gfx-tier {
        border-color: var(--line);
        background: rgba(232, 228, 218, .04);
      }
      #salt-graphics .salt-gfx-tier > label { color: var(--bone-dim); }
      #salt-graphics .salt-gfx-tier-btn {
        border-color: var(--line);
        background: rgba(0, 0, 0, .2);
        color: var(--bone-dim);
      }
      #salt-graphics .salt-gfx-tier-btn[aria-pressed="true"] {
        border-color: var(--signal);
        background: rgba(255, 179, 71, .16);
        color: var(--bone);
      }
      #salt-graphics .salt-gfx-tier-btn[data-gfx-tier="auto"][aria-pressed="true"] { border-color: rgba(255, 179, 71, .55); }
      #salt-graphics .salt-gfx-section h3 { color: var(--bone); }
      #salt-graphics .salt-gfx-section h3 em { color: var(--steel); }
      #salt-graphics .salt-gfx-section-note,
      #salt-graphics .salt-gfx-tip,
      #salt-graphics .salt-gfx-label em,
      #salt-graphics .salt-gfx-status { color: var(--steel); }
      #salt-graphics .salt-gfx-rows { border-top-color: var(--line); }
      #salt-graphics .salt-gfx-row { border-bottom-color: var(--line); }
      #salt-graphics .salt-gfx-label b { color: var(--bone); }
      #salt-graphics .salt-gfx-switch {
        border-color: var(--line);
        background: rgba(0, 0, 0, .22);
        color: var(--bone-dim);
      }
      #salt-graphics .salt-gfx-switch .dot {
        background: #5a6165;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .16);
      }
      #salt-graphics .salt-gfx-switch[aria-pressed="true"] {
        border-color: var(--signal);
        color: var(--bone);
      }
      #salt-graphics .salt-gfx-switch[aria-pressed="true"] .dot {
        background: var(--signal);
        box-shadow: 0 0 8px rgba(255, 179, 71, .6);
      }
      #salt-graphics .salt-gfx-select {
        border-color: var(--line);
        background: var(--ink);
        color: var(--bone);
      }
      #salt-graphics .salt-gfx-slider output { color: var(--bone); }
      #salt-graphics .salt-gfx-slider input[type="range"] { accent-color: var(--signal); }
      #salt-graphics .salt-gfx-bottom {
        border-color: var(--line);
        background: rgba(232, 228, 218, .035);
      }
      #salt-graphics .salt-gfx-badge {
        border-color: rgba(255, 179, 71, .4);
        color: var(--signal);
      }
      #salt-graphics .salt-gfx-reload-banner {
        margin: 8px 0 10px;
        padding: 8px 10px;
        border-left: 3px solid var(--signal);
        background: rgba(255, 179, 71, .1);
        color: var(--bone-dim);
        font-size: 9px;
        line-height: 1.55;
      }
      #salt-graphics .salt-gfx-reload-banner b {
        display: block;
        margin-bottom: 2px;
        color: var(--signal);
        font: 600 10px/1.2 var(--f-label);
        letter-spacing: .06em;
      }
      #salt-graphics .salt-gfx-footer {
        flex: 0 0 auto;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 6px 8px;
        margin: 0;
        padding: 10px 16px max(12px, env(safe-area-inset-bottom, 0px));
        border-top: 1px solid var(--line);
        background: rgba(11, 13, 15, .98);
      }
      #salt-graphics .salt-gfx-footer .salt-gfx-status {
        flex: 1 1 100%;
        min-height: 0;
        margin: 0 0 2px;
        padding: 0;
      }
      #salt-graphics .salt-gfx-btn {
        border-color: var(--line);
        color: var(--bone-dim);
      }
      #salt-graphics .salt-gfx-btn:hover,
      #salt-graphics .salt-gfx-btn:focus-visible {
        border-color: var(--signal);
        background: rgba(255, 179, 71, .1);
        color: var(--bone);
        outline: none;
      }
      #salt-graphics .salt-gfx-btn.primary {
        border-color: var(--signal);
        background: rgba(255, 179, 71, .16);
        color: var(--bone);
      }
      #salt-graphics .salt-gfx-btn.primary:hover,
      #salt-graphics .salt-gfx-btn.primary:focus-visible {
        background: rgba(255, 179, 71, .28);
      }
      #salt-graphics .salt-gfx-reset { color: var(--steel); }
      #salt-graphics .salt-gfx-reset:hover { color: var(--signal); }
      #salt-graphics .salt-gfx-status[data-dirty="true"] { color: var(--signal-hot); }
      #salt-graphics .salt-gfx-status[data-saved="true"] { color: #9ee3a0; }
      #salt-graphics .salt-gfx-warning { color: var(--signal-hot); }

      @media (max-width: 760px), (pointer: coarse) {
        #ui .panel .panel-h { padding-top: 12px !important; }
        .salt-quality-entry { grid-template-columns: 1fr; gap: 7px; }
        #salt-open-graphics { min-height: 54px; }
        #salt-open-graphics .salt-entry-note { font-size: 9px; }
        #salt-graphics .salt-gfx-card {
          width: 100%;
          max-width: 100%;
          height: 100%;
          border-left: 0;
        }
        #salt-graphics .salt-gfx-head {
          padding: max(12px, env(safe-area-inset-top, 0px)) 12px 10px;
        }
        #salt-graphics .salt-gfx-head-actions { gap: 4px; }
        #salt-graphics .salt-gfx-back { min-height: 40px; padding: 2px 7px; }
        #salt-graphics .salt-gfx-close { width: 42px; height: 40px; }
        #salt-graphics .salt-gfx-scroll {
          padding: 10px 12px max(14px, env(safe-area-inset-bottom, 0px));
        }
        #salt-graphics .salt-gfx-footer {
          margin: 0;
          padding-left: 12px;
          padding-right: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function qualityRowNode() {
    return document.getElementById('salt-quality-row') ||
      (document.getElementById('l-q') && document.getElementById('l-q').parentElement);
  }

  function qualityTierText(tier) {
    const normalized = normalizeQualityTier(tier) || 'medium';
    return tr('graphics.' + normalized, null, tierLabel(normalized) || normalized);
  }

  function ensureQualitySelector() {
    const row = qualityRowNode();
    if (!row || !row.parentElement) return null;
    row.hidden = false;
    row.classList.remove('salt-quality-original-hidden');
    const seg = row.querySelector('.seg');
    if (!seg) return null;
    seg.classList.remove('salt-quality-original-hidden');
    seg.classList.add('salt-quality-seg');
    for (const button of [...seg.querySelectorAll('button[data-q]')]) {
      if (!QUALITY_TIERS.includes(button.dataset.q)) button.remove();
    }
    for (const old of document.querySelectorAll('#salt-auto-quality, #salt-quality-entry, button[data-q="auto"]')) {
      old.remove();
    }
    for (const button of seg.querySelectorAll('button[data-q]')) {
      button.type = 'button';
      button.setAttribute('aria-label', qualityTierText(button.dataset.q));
    }
    return seg;
  }

  function syncQualitySelector() {
    const tier = displayTier();
    for (const button of document.querySelectorAll('#salt-quality-row .seg button[data-q], .salt-quality-seg button[data-q]')) {
      button.setAttribute('aria-pressed', String(button.dataset.q === tier));
    }
    syncQualityNote();
  }

  function syncAutoButton() {
    syncQualitySelector();
  }

  function syncQualityEntry() {
    syncQualitySelector();
  }

  function syncQualityNote() {
    const note = document.querySelector('[data-f="qnote"]');
    if (!note || raceGraphics) return;
    const forced = forcedQuality();
    if (forced) {
      note.textContent = tr('graphics.noteLocked', { quality: qualityTierText(forced) });
      return;
    }
    if (savedQuality() === AUTO_TIER) {
      note.textContent = tr('graphics.noteAuto', { quality: qualityTierText(displayTier()) });
      return;
    }
    if (savedQuality() === 'ultra') {
      note.textContent = tr('graphics.noteUltra');
      return;
    }
    note.textContent = tr('graphics.noteLive');
  }

  function ensureQualityEntry() {
    ensureQualitySelector();
    return qualityRowNode();
  }

  function ensureBenchRow() {
    const anchor = qualityRowNode();
    if (!anchor || !anchor.parentElement) return null;
    let row = document.getElementById('salt-bench-row');
    if (!row) {
      row = document.createElement('div');
      row.id = 'salt-bench-row';
      row.className = 'row salt-bench-row';
      row.innerHTML = '<label id="salt-bench-label">' + pair('跑分显示', 'Bench overlay', 'span class="salt-en"') + '</label>' +
        '<button class="toggle" type="button" id="salt-bench-toggle" aria-labelledby="salt-bench-label" aria-pressed="false"><i></i><span>' + onOff(false) + '</span></button>';
      anchor.parentElement.insertBefore(row, anchor.nextSibling);
      row.querySelector('#salt-bench-toggle').addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        setOverlay(!overlayOn);
      });
    }
    row.querySelector('#salt-bench-toggle').setAttribute('aria-pressed', String(overlayOn));
    row.querySelector('#salt-bench-toggle span').textContent = onOff(overlayOn);
    return row;
  }

  function syncBannerOpacityRow() {
    const input = document.getElementById('salt-banner-opacity');
    if (input && input.value !== String(bannerOpacity)) input.value = String(bannerOpacity);
    const output = document.getElementById('salt-banner-opacity-out');
    if (output) output.textContent = bannerOpacity + '%';
    const fontInput = document.getElementById('salt-banner-font');
    if (fontInput && fontInput.value !== String(bannerFontSize)) fontInput.value = String(bannerFontSize);
    const fontOutput = document.getElementById('salt-banner-font-out');
    if (fontOutput) fontOutput.textContent = bannerFontSize + '%';
  }

  function ensureBannerOpacityRow() {
    const anchor = document.getElementById('salt-bench-row') || qualityRowNode();
    if (!anchor || !anchor.parentElement) return null;
    let row = document.getElementById('salt-banner-opacity-row');
    // Replace a row created by the previous build, which had only the opacity
    // control and therefore no font-size input.
    if (row && !row.querySelector('#salt-banner-font')) {
      row.remove();
      row = null;
    }
    if (!row) {
      row = document.createElement('div');
      row.id = 'salt-banner-opacity-row';
      row.className = 'row salt-banner-row';
      row.innerHTML = '<label id="salt-banner-look-label">' + pair('公屏外观', 'Banner appearance', 'span class="salt-en"') + '</label>' +
        '<div class="salt-banner-controls">' +
          '<div class="salt-banner-control">' +
            '<span class="salt-banner-control-label" id="salt-banner-opacity-label">' + pair('文字与背景透明度', 'Text and backdrop opacity', 'span class="salt-en"') + '</span>' +
            '<div class="slider"><input id="salt-banner-opacity" type="range" min="0" max="100" step="5" aria-labelledby="salt-banner-opacity-label"><output id="salt-banner-opacity-out" for="salt-banner-opacity">80%</output></div>' +
          '</div>' +
          '<div class="salt-banner-control">' +
            '<span class="salt-banner-control-label" id="salt-banner-font-label">' + pair('正文字号', 'Message size', 'span class="salt-en"') + '</span>' +
            '<div class="slider"><input id="salt-banner-font" type="range" min="' + BANNER_FONT_MIN + '" max="' + BANNER_FONT_MAX + '" step="' + BANNER_FONT_STEP + '" aria-labelledby="salt-banner-font-label"><output id="salt-banner-font-out" for="salt-banner-font">100%</output></div>' +
          '</div>' +
        '</div>';
      anchor.parentElement.insertBefore(row, anchor.nextSibling);
      row.querySelector('#salt-banner-opacity').addEventListener('input', event => {
        applyBannerOpacity(event.target.value, true);
      });
      row.querySelector('#salt-banner-font').addEventListener('input', event => {
        applyBannerFontSize(event.target.value, true);
      });
    }
    syncBannerOpacityRow();
    return row;
  }

  function removeLegacyOverrideRows() {
    for (const node of document.querySelectorAll('[id^="salt-override-row-"], #salt-override-note')) {
      node.remove();
    }
  }

  function toggleText(button, on) {
    if (!button) return;
    button.setAttribute('aria-pressed', String(on));
    const text = button.querySelector('b');
    if (text) text.textContent = onOff(on);
  }

  function rangeValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    if (String(input.value) !== String(value)) input.value = String(value);
  }

  function rangeOut(id, text) {
    const output = document.getElementById(id);
    if (output) output.textContent = text;
  }

  function selectValue(id, value) {
    const select = document.getElementById(id);
    if (!select) return;
    if (String(select.value) !== String(value)) select.value = String(value);
  }

  function buildGraphicsPage() {
    const page = document.createElement('div');
    page.id = 'salt-graphics';
    page.hidden = true;
    page.setAttribute('aria-hidden', 'true');
    page.innerHTML = `
      <div class="salt-gfx-card" role="dialog" aria-modal="true" aria-labelledby="salt-gfx-title" tabindex="-1">
        <header class="salt-gfx-head">
          <div><div class="salt-gfx-kicker">设置 / Settings <span aria-hidden="true">›</span> 画质 / Graphics</div><h2 id="salt-gfx-title">高级画质设置 <em>Advanced graphics</em></h2></div>
          <div class="salt-gfx-head-actions">
            <button class="salt-gfx-back" type="button" id="salt-gfx-back-top" aria-label="返回设置 / Back to settings">← 返回 / Back</button>
            <button class="salt-gfx-close" type="button" data-gfx-close aria-label="关闭 / Close">×</button>
          </div>
        </header>
        <div class="salt-gfx-scroll">
          <p class="salt-gfx-page-note">档位与渲染效果即时生效；“高级选项”保存后需重载。 / Tiers and effects apply live; advanced options need a reload after Save.</p>
          <div class="salt-gfx-tier">
            <label>画质档位 <span class="salt-en">Quality tier</span></label>
            <div class="salt-gfx-tier-grid" role="group" aria-label="画质档位 / Quality tier">
              <button type="button" class="salt-gfx-tier-btn" data-gfx-tier="auto" aria-pressed="false"><b>${pick('自动', 'Auto')}</b><small${UI_EN ? ' data-i18n-skip="1" lang="zh-CN"' : ''}>${pick('Auto', '自动')}</small></button>
              ${TIERS.map(name => `<button type="button" class="salt-gfx-tier-btn" data-gfx-tier="${name}" aria-pressed="false"><b>${tierLabel(name)}</b><small${UI_EN ? ' data-i18n-skip="1" lang="zh-CN"' : ''}>${UI_EN ? TIER_CN[name] : TIER_EN[name]}</small></button>`).join('')}
            </div>
            <p class="salt-gfx-tip">手动选择后不会偷偷降档；自动档会按地图预算和持续低帧逐级降低。 / Manual tiers never auto-downgrade; Auto uses a map budget and sustained-low-FPS drops.</p>
            <p class="salt-gfx-tip salt-gfx-cap-note" id="salt-gfx-cap-note" aria-live="polite">当前档位上限会在下方显示。 / Tier caps are listed below.</p>
            <div class="salt-gfx-tier-actions">
              <button type="button" class="salt-gfx-reset" id="salt-gfx-reset-all">恢复画质默认 / Reset graphics defaults</button>
              <span>恢复自动档、各档位和高级项默认 / Restores Auto, every tier and advanced defaults</span>
            </div>
          </div>

          <section class="salt-gfx-section">
            <h3>渲染效果 <em>Render effects</em></h3>
            <p class="salt-gfx-section-note">即时生效；阴影/泛光等按当前档位保存，渲染比例全档位生效。 / Applies live; effects are stored per tier, render scale applies to all tiers.</p>
            <div class="salt-gfx-rows">
              <div class="salt-gfx-row">
                <div class="salt-gfx-label"><b>渲染比例 <em>Render scale</em></b><em>全档位即时生效；50–100%，智能分辨率在此基础上调整。 / Live for all tiers; smart resolution adjusts from this baseline.</em></div>
                <div class="salt-gfx-control"><div class="salt-gfx-slider"><input id="salt-live-render-scale" type="range" min="50" max="100" step="5" aria-label="渲染比例 / Render scale"><output id="salt-live-render-scale-out">100%</output></div></div>
              </div>
              <div class="salt-gfx-row" data-gfx-effect="shadow">
                <div class="salt-gfx-label"><b>阴影 <em>Shadows</em></b><em>阴影贴图分辨率 / Shadow map resolution</em></div>
                <div class="salt-gfx-control"><button type="button" class="salt-gfx-switch" data-gfx-toggle="shadow" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button><div class="salt-gfx-slider"><input id="salt-effect-shadow" type="range" min="512" max="4096" step="512" aria-label="阴影分辨率 / Shadow resolution"><output id="salt-effect-shadow-out">1024</output></div></div>
              </div>
              <div class="salt-gfx-row" data-gfx-effect="bloom">
                <div class="salt-gfx-label"><b>泛光 <em>Bloom</em></b><em>高光外溢 / Highlight glow</em></div>
                <div class="salt-gfx-control salt-gfx-control-solo"><button type="button" class="salt-gfx-switch" data-gfx-toggle="bloom" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button></div>
              </div>
              <div class="salt-gfx-row" data-gfx-effect="planar">
                <div class="salt-gfx-label"><b>水面反射 <em>Water reflections</em></b><em>水面/湿地面屏幕空间反射；关闭可降 GPU。 / Screen-space reflection on water and wet ground.</em></div>
                <div class="salt-gfx-control"><button type="button" class="salt-gfx-switch" data-gfx-toggle="planar" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button><div class="salt-gfx-slider"><input id="salt-effect-planar" type="range" min="0.25" max="1" step="0.25" aria-label="水面反射比例 / Reflection scale"><output id="salt-effect-planar-out">0.5×</output></div></div>
              </div>
              <div class="salt-gfx-row" data-gfx-effect="volumetric">
                <div class="salt-gfx-label"><b>体积光 <em>Volumetric</em></b><em>光线步进次数 / Ray-march steps</em></div>
                <div class="salt-gfx-control"><button type="button" class="salt-gfx-switch" data-gfx-toggle="volumetric" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button><div class="salt-gfx-slider"><input id="salt-effect-volumetric" type="range" min="4" max="40" step="4" aria-label="体积光步数 / Volumetric steps"><output id="salt-effect-volumetric-out">16</output></div></div>
              </div>
              <div class="salt-gfx-row" data-gfx-effect="msaa">
                <div class="salt-gfx-label"><b>抗锯齿 <em>MSAA</em></b><em>2× / 4× 多重采样 / Multisample</em></div>
                <div class="salt-gfx-control"><button type="button" class="salt-gfx-switch" data-gfx-toggle="msaa" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button><div class="salt-gfx-slider"><input id="salt-effect-msaa" type="range" min="2" max="4" step="2" aria-label="MSAA 采样 / MSAA samples"><output id="salt-effect-msaa-out">4×</output></div></div>
              </div>
              <div class="salt-gfx-row" data-gfx-effect="ao">
                <div class="salt-gfx-label"><b>环境光遮蔽 <em>AO</em></b><em>接触阴影 / Contact shadows</em></div>
                <div class="salt-gfx-control salt-gfx-control-solo"><button type="button" class="salt-gfx-switch" data-gfx-toggle="ao" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button></div>
              </div>
              <div class="salt-gfx-row" data-gfx-effect="water">
                <div class="salt-gfx-label"><b>水面渲染 <em>Water surface</em></b><em>仅盐港海面；远征地图湖面是静态合并几何，暂不单独隐藏。 / Salt Port sea only; expedition lake water is baked into map chunks.</em></div>
                <div class="salt-gfx-control salt-gfx-control-solo"><button type="button" class="salt-gfx-switch" data-gfx-toggle="water" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button></div>
              </div>
            </div>
          </section>

          <section class="salt-gfx-section">
            <div class="salt-gfx-bottom">
              <h3>高级选项 <em>Advanced</em> <span class="salt-gfx-badge">仅高级项需重载 / Advanced only</span></h3>
              <p class="salt-gfx-section-note">这些选项按保存后应用；纹理、各向异性、雨量需要重载页面才能重建资源。 / Applied after Save; texture, anisotropy and rain buffers rebuild on reload.</p>
              <div class="salt-gfx-reload-banner"><b>仅本节需要重载 / This section needs reload</b><span>档位和“渲染效果”即时生效；保存高级项后，点“立即重载”才会完全应用。 / Tier and effects are live; after saving advanced options, use “Reload now” to apply them fully.</span></div>
              <div class="salt-gfx-rows">
                <div class="salt-gfx-row">
                  <div class="salt-gfx-label"><b>智能分辨率 <em>Smart resolution</em></b><em>默认开启；只降内部像素，高档最低保留 82–88%，不偷偷降档 / On by default; internal pixels only, with an 82–88% floor on high/ultra</em></div>
                  <div class="salt-gfx-control salt-gfx-control-solo"><button type="button" class="salt-gfx-switch" id="salt-adv-dynamic" aria-pressed="false"><span class="dot"></span><b>关 / Off</b></button></div>
                </div>
                <div class="salt-gfx-row">
                  <div class="salt-gfx-label"><b>运动模糊 <em>Motion blur</em></b><em>快速转动时的拖影；不会提升 FPS / Camera smear while turning; does not raise FPS</em></div>
                  <div class="salt-gfx-control salt-gfx-control-solo"><button type="button" class="salt-gfx-switch" id="salt-adv-motion-blur" aria-pressed="true"><span class="dot"></span><b>开 / On</b></button></div>
                </div>
                <div class="salt-gfx-row">
                  <div class="salt-gfx-label"><b>雨/粒子密度 <em>Rain / particles</em></b><em>0% 关闭；完整增加需重载 / 0% off; full increase needs reload</em></div>
                  <div class="salt-gfx-control"><div class="salt-gfx-slider"><input id="salt-adv-rain" type="range" min="0" max="100" step="5" aria-label="雨量 / Rain density"><output id="salt-adv-rain-out">100%</output></div></div>
                </div>
                <div class="salt-gfx-row">
                  <div class="salt-gfx-label"><b>纹理质量 <em>Texture quality</em></b><em>重载后重建纹理图集 / Atlas rebuilds on reload</em></div>
                  <div class="salt-gfx-control salt-gfx-control-solo"><select id="salt-adv-texture" class="salt-gfx-select" aria-label="纹理质量 / Texture quality"><option value="0">跟随档位 / Follow tier</option><option value="256">256 px</option><option value="512">512 px</option><option value="1024">1024 px</option></select></div>
                </div>
                <div class="salt-gfx-row">
                  <div class="salt-gfx-label"><b>各向异性 <em>Anisotropy</em></b><em>斜视角纹理清晰度；0 = 跟随档位上限 / Oblique texture clarity; 0 = follow tier cap</em></div>
                  <div class="salt-gfx-control salt-gfx-control-solo"><select id="salt-adv-anisotropy" class="salt-gfx-select" aria-label="各向异性 / Anisotropy"><option value="0">跟随档位上限 / Follow tier cap</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option></select></div>
                </div>
                <div class="salt-gfx-row">
                  <div class="salt-gfx-label"><b>帧率上限 <em>Frame cap</em></b><em>0 = 关闭；30/60/90/120；受屏幕刷新率限制 / Capped by display refresh</em></div>
                  <div class="salt-gfx-control"><div class="salt-gfx-slider"><input id="salt-adv-frame-cap" type="range" min="0" max="120" step="30" aria-label="帧率上限 / Frame cap"><output id="salt-adv-frame-cap-out">关 / Off</output></div></div>
                </div>
              </div>
              <p class="salt-gfx-warning">不做垂直同步 / No vertical sync. 纹理、各向异性、雨量在保存后建议点“立即重载”。 / Texture, anisotropy and rain are fully rebuilt after reload.</p>
              <button type="button" class="salt-gfx-reset" id="salt-adv-reset">恢复高级默认 / Reset advanced</button>
            </div>
            <footer class="salt-gfx-footer">
              <span class="salt-gfx-status" id="salt-gfx-status">渲染效果与档位即时生效；高级项保存后需重载。 / Tiers and effects are live; advanced options need a reload after Save.</span>
              <button type="button" class="salt-gfx-btn" id="salt-gfx-back">返回 / Back</button>
              <button type="button" class="salt-gfx-btn primary" id="salt-gfx-save">保存高级项 / Save advanced</button>
              <button type="button" class="salt-gfx-btn" id="salt-gfx-reload" hidden>立即重载 / Reload now</button>
            </footer>
          </section>
        </div>
      </div>
    `;
    const card = page.querySelector('.salt-gfx-card');
    const scroll = page.querySelector('.salt-gfx-scroll');
    const footer = page.querySelector('.salt-gfx-footer');
    if (card && scroll && footer) {
      scroll.style.flex = '1 1 auto';
      scroll.style.minHeight = '0';
      card.appendChild(footer);
      footer.classList.add('salt-gfx-footer-fixed');
    }
    applyGraphicsLanguage(page);
    if (raceGraphics) {
      page.querySelectorAll('.salt-gfx-section, .salt-gfx-footer, .salt-gfx-tip, .salt-gfx-tier-actions').forEach(node => { node.hidden = true; });
      page.querySelector('.salt-gfx-page-note').textContent = pick('画质档位即时生效，并同步到其他地图。', 'Quality applies live and is shared across maps.');
      page.querySelector('#salt-gfx-title').textContent = pick('画质设置', 'Graphics settings');
    }
    (raceGraphics?.root || document.getElementById('app') || document.body).appendChild(page);
    gfxPage = page;
    bindGraphicsPage(page);
    return page;
  }

  // The graphics drawer is generated once. Its static copy is localized here;
  // live values (status, toggles, caps) are localized in their own setters.
  function applyGraphicsLanguage(page) {
    const setText = (selector, value) => {
      const node = page.querySelector(selector);
      if (node) node.textContent = value;
    };
    const setHtml = (selector, value) => {
      const node = page.querySelector(selector);
      if (node) node.innerHTML = value;
    };
    const splitPair = value => {
      const text = String(value || '').trim();
      const at = text.lastIndexOf(' / ');
      if (at < 1) return null;
      const zh = text.slice(0, at).trim();
      const en = text.slice(at + 3).trim();
      return zh && en ? { zh, en } : null;
    };
    const descPairs = {
      '渲染比例': ['全档位即时生效；50–100%，智能分辨率在此基础上调整。', 'Live for all tiers, 50–100%; smart resolution adjusts from this baseline.'],
      '阴影': ['阴影贴图分辨率。', 'Shadow map resolution.'],
      '泛光': ['高光向外溢出的辉光。', 'Highlight glow.'],
      '水面反射': ['水面和湿地面的屏幕空间反射；关闭可降低显卡负载。', 'Screen-space reflection on water and wet ground.'],
      '体积光': ['光线步进次数。', 'Ray-march steps.'],
      '抗锯齿': ['2× / 4× 多重采样。', '2× / 4× multisampling.'],
      '环境光遮蔽': ['接触阴影。', 'Contact shadows.'],
      '水面渲染': ['仅盐港海面；远征地图湖面是静态合并几何，暂不单独隐藏。', 'Salt Port sea only; expedition lake water is baked into map chunks.'],
      '智能分辨率': ['默认开启；只降内部像素，高档最低保留 82–88%，不偷偷降档。', 'On by default; internal pixels only, with an 82–88% floor on high/ultra.'],
      '运动模糊': ['快速转动时的拖影；不会提升帧率。', 'Camera smear while turning; does not raise FPS.'],
      '雨/粒子密度': ['0% 关闭；完整增加需要重载。', '0% turns it off; a full increase needs a reload.'],
      '纹理质量': ['重载后重建纹理图集。', 'The texture atlas rebuilds on reload.'],
      '各向异性': ['斜视角纹理清晰度；0 = 跟随档位上限。', 'Oblique texture clarity; 0 = follow the tier cap.'],
      '帧率上限': ['0 = 关闭；30/60/90/120；受屏幕刷新率限制。', '0 = off; 30/60/90/120; capped by the display refresh rate.']
    };

    setText('.salt-gfx-kicker', pick('设置 › 画质', 'Settings › Graphics'));
    setText('#salt-gfx-title', pick('高级画质设置', 'Advanced graphics'));
    setText('#salt-gfx-back-top', '← ' + pick('返回', 'Back'));
    const backTop = page.querySelector('#salt-gfx-back-top');
    if (backTop) backTop.setAttribute('aria-label', pick('返回设置', 'Back to settings'));
    const close = page.querySelector('.salt-gfx-close');
    if (close) close.setAttribute('aria-label', pick('关闭', 'Close'));
    setText('.salt-gfx-page-note', pick(
      '档位与渲染效果即时生效；“高级选项”保存后需重载。',
      'Tiers and effects apply live; advanced options need a reload after Save.'
    ));
    const tierGrid = page.querySelector('.salt-gfx-tier-grid');
    if (tierGrid) tierGrid.setAttribute('aria-label', pick('画质档位', 'Quality tier'));
    const tierLabel = page.querySelector('.salt-gfx-tier > label');
    if (tierLabel) tierLabel.textContent = pick('画质档位', 'Quality tier');

    const autoTier = page.querySelector('[data-gfx-tier="auto"]');
    if (autoTier) {
      autoTier.querySelector('b').textContent = pick('自动', 'Auto');
      const small = autoTier.querySelector('small');
      small.textContent = pick('Auto', '自动');
      if (UI_EN) {
        small.setAttribute('data-i18n-skip', '1');
        small.setAttribute('lang', 'zh-CN');
      }
    }
    for (const name of TIERS) {
      const button = page.querySelector('[data-gfx-tier="' + name + '"]');
      if (!button) continue;
      button.querySelector('b').textContent = UI_EN ? TIER_EN[name] : TIER_CN[name];
      const small = button.querySelector('small');
      small.textContent = UI_EN ? TIER_CN[name] : TIER_EN[name];
      if (UI_EN) {
        small.setAttribute('data-i18n-skip', '1');
        small.setAttribute('lang', 'zh-CN');
      }
    }
    setText('.salt-gfx-tip:not(.salt-gfx-cap-note)', pick(
      '手动选择后不会偷偷降档；自动档会按地图预算和持续低帧逐级降低。',
      'Manual tiers never auto-downgrade; Auto uses a map budget and sustained-low-FPS drops.'
    ));
    setText('#salt-gfx-cap-note', pick('当前档位上限会在下方显示。', 'Tier caps are listed below.'));
    setText('#salt-gfx-reset-all', pick('恢复画质默认', 'Reset graphics defaults'));
    const resetAll = page.querySelector('#salt-gfx-reset-all');
    if (resetAll && resetAll.nextElementSibling) {
      resetAll.nextElementSibling.textContent = pick(
        '恢复自动档、各档位和高级项默认',
        'Restores Auto, every tier and advanced defaults'
      );
    }

    // Pair labels keep the main option name in the selected language and the
    // secondary option name in the other language, matching the existing
    // "阴影 Shadows" / "Shadows 阴影" presentation.
    for (const label of page.querySelectorAll('.salt-gfx-label > b')) {
      let zh = label.dataset.zh;
      let en = label.dataset.en;
      if (!zh || !en) {
        const em = label.querySelector('em');
        zh = (label.firstChild && label.firstChild.nodeValue ? label.firstChild.nodeValue : '').trim();
        en = em ? em.textContent.trim() : '';
        label.dataset.zh = zh;
        label.dataset.en = en;
      }
      if (zh && en) label.innerHTML = pair(zh, en);
    }
    for (const note of page.querySelectorAll('.salt-gfx-label > em')) {
      const label = note.parentElement.querySelector('b');
      const key = label && label.dataset.zh;
      const mapped = descPairs[key];
      if (mapped) {
        note.dataset.zh = mapped[0];
        note.dataset.en = mapped[1];
      } else if (!note.dataset.zh || !note.dataset.en) {
        const parsed = splitPair(note.textContent);
        if (parsed) {
          note.dataset.zh = parsed.zh;
          note.dataset.en = parsed.en;
        }
      }
      if (note.dataset.zh && note.dataset.en) note.textContent = pick(note.dataset.zh, note.dataset.en);
    }

    const sectionTitles = page.querySelectorAll('.salt-gfx-section h3');
    if (sectionTitles[0]) sectionTitles[0].textContent = pick('渲染效果', 'Render effects');
    if (sectionTitles[1]) {
      sectionTitles[1].innerHTML = pick('高级选项', 'Advanced') +
        ' <span class="salt-gfx-badge">' + pick('仅高级项需重载', 'Advanced only') + '</span>';
    }
    const sectionNotes = page.querySelectorAll('.salt-gfx-section-note');
    if (sectionNotes[0]) {
      sectionNotes[0].textContent = pick(
        '即时生效；阴影、泛光等按当前档位保存，渲染比例全档位生效。',
        'Applies live; effects are stored per tier, render scale applies to all tiers.'
      );
    }
    if (sectionNotes[1]) {
      sectionNotes[1].textContent = pick(
        '这些选项保存后应用；纹理、各向异性、雨量需要重载页面才能重建资源。',
        'Applied after Save; texture, anisotropy and rain buffers rebuild on reload.'
      );
    }
    const reloadBanner = page.querySelector('.salt-gfx-reload-banner');
    if (reloadBanner) {
      reloadBanner.querySelector('b').textContent = pick('仅本节需要重载', 'This section needs reload');
      reloadBanner.querySelector('span').textContent = pick(
        '档位和“渲染效果”即时生效；保存高级项后，点“立即重载”才会完全应用。',
        'Tier and effects are live; after saving advanced options, use “Reload now” to apply them fully.'
      );
    }
    setText('.salt-gfx-warning', pick(
      '不做垂直同步。纹理、各向异性、雨量在保存后建议点“立即重载”。',
      'No vertical sync. Texture, anisotropy and rain are fully rebuilt after reload.'
    ));
    setText('#salt-adv-reset', pick('恢复高级默认', 'Reset advanced'));
    setText('#salt-gfx-status', pick(
      '渲染效果与档位即时生效；高级项保存后需重载。',
      'Tiers and effects are live; advanced options need a reload after Save.'
    ));
    setText('#salt-gfx-back', pick('返回', 'Back'));
    setText('#salt-gfx-save', pick('保存高级项', 'Save advanced'));
    setText('#salt-gfx-reload', pick('立即重载', 'Reload now'));

    const texture = page.querySelector('#salt-adv-texture');
    if (texture && texture.options[0]) texture.options[0].textContent = pick('跟随档位', 'Follow tier');
    const anisotropy = page.querySelector('#salt-adv-anisotropy');
    if (anisotropy && anisotropy.options[0]) anisotropy.options[0].textContent = pick('跟随档位上限', 'Follow tier cap');

    const ariaPairs = {
      'salt-live-render-scale': ['渲染比例', 'Render scale'],
      'salt-effect-shadow': ['阴影分辨率', 'Shadow resolution'],
      'salt-effect-planar': ['水面反射比例', 'Reflection scale'],
      'salt-effect-volumetric': ['体积光步数', 'Volumetric steps'],
      'salt-effect-msaa': ['MSAA 采样', 'MSAA samples'],
      'salt-adv-rain': ['雨量', 'Rain density'],
      'salt-adv-texture': ['纹理质量', 'Texture quality'],
      'salt-adv-anisotropy': ['各向异性', 'Anisotropy'],
      'salt-adv-frame-cap': ['帧率上限', 'Frame cap']
    };
    for (const [id, names] of Object.entries(ariaPairs)) {
      const input = page.querySelector('#' + id);
      if (input) input.setAttribute('aria-label', pick(names[0], names[1]));
    }
  }

  function setStatus(text, mode) {
    const status = document.getElementById('salt-gfx-status');
    if (!status) return;
    status.textContent = text;
    status.dataset.dirty = mode === 'dirty' ? 'true' : 'false';
    status.dataset.saved = mode === 'saved' ? 'true' : 'false';
  }

  function markDirty() {
    advancedDirty = true;
    setStatus(pick('有未保存的高级更改。', 'Unsaved advanced changes.'), 'dirty');
    const reload = document.getElementById('salt-gfx-reload');
    if (reload) reload.hidden = true;
  }

  function currentEffectState() {
    return graphics.tiers[currentTier()] || graphics.tiers[displayTier()] || defaultTier('medium');
  }

  function syncCapNote(tier, cap) {
    const note = document.getElementById('salt-gfx-cap-note');
    if (!note) return;
    const off = onOff(false);
    const shadow = cap.shadow > 0 ? `${cap.shadow}` : off;
    const bloom = cap.bloom ? onOff(true) : off;
    const text = UI_EN
      ? `Tier caps for ${TIER_EN[tier]}: Render scale ≤ ${cap.scale}% · Shadows ≤ ${shadow} · Bloom ${bloom} · Volumetric ≤ ${cap.volSteps} steps · Texture ≤ ${cap.texture} · Anisotropy ≤ ${cap.anisotropy}×. Values above these caps are clamped or disabled.`
      : `当前档位「${TIER_CN[tier]}」上限：渲染比例 ≤ ${cap.scale}% · 阴影 ≤ ${shadow} · 泛光 ${bloom} · 体积光 ≤ ${cap.volSteps} 步 · 材质 ≤ ${cap.texture} · 各向异性 ≤ ${cap.anisotropy}×。超出上限的选项会自动限制或禁用。`;
    note.textContent = text;
  }

  function syncGraphics() {
    if (!gfxPage || !graphics) return;
    const tier = displayTier();
    const saved = savedQuality();
    for (const button of gfxPage.querySelectorAll('[data-gfx-tier]')) {
      const value = button.dataset.gfxTier;
      const pressed = value === AUTO_TIER
        ? (saved === AUTO_TIER && !forcedQuality())
        : ((!autoMode || forcedQuality()) && value === tier);
      button.setAttribute('aria-pressed', String(pressed));
      button.disabled = value === AUTO_TIER && !!forcedQuality();
    }

    if (raceGraphics) return;
    const state = graphics.tiers[tier] || defaultTier('medium');
    const preset = PRESETS[tier] || PRESETS.medium;
    const cap = tierCap(tier);
    const capSelectOptions = (id, maximum) => {
      const select = document.getElementById(id);
      if (!select) return;
      for (const option of select.options) {
        option.disabled = Number(option.value) > maximum;
      }
    };
    const setControlDisabled = (selector, disabled) => {
      const control = document.querySelector(selector);
      if (control) control.disabled = !!disabled;
    };

    const shadowOn = cap.shadow > 0 && !!state.shadow.on;
    toggleText(document.querySelector('[data-gfx-toggle="shadow"]'), shadowOn);
    setControlDisabled('[data-gfx-toggle="shadow"]', cap.shadow <= 0);
    const shadowValue = cap.shadow > 0 ? Math.min(state.shadow.value, cap.shadow) : 0;
    rangeValue('salt-effect-shadow', shadowValue);
    rangeOut('salt-effect-shadow-out', String(shadowValue));
    const shadowRange = document.getElementById('salt-effect-shadow');
    if (shadowRange) {
      shadowRange.max = String(cap.shadow || 512);
      shadowRange.disabled = !shadowOn;
    }

    const bloomOn = cap.bloom && !!state.bloom.on;
    toggleText(document.querySelector('[data-gfx-toggle="bloom"]'), bloomOn);
    setControlDisabled('[data-gfx-toggle="bloom"]', !cap.bloom);

    const planarOn = cap.planar > 0 && !!state.planar.on;
    toggleText(document.querySelector('[data-gfx-toggle="planar"]'), planarOn);
    setControlDisabled('[data-gfx-toggle="planar"]', cap.planar <= 0);
    const planarValue = cap.planar > 0 ? Math.min(state.planar.value, cap.planar) : 0;
    rangeValue('salt-effect-planar', planarValue);
    rangeOut('salt-effect-planar-out', Number(planarValue).toFixed(2).replace(/0$/, '') + '×');
    const planarRange = document.getElementById('salt-effect-planar');
    if (planarRange) {
      planarRange.max = String(cap.planar || .25);
      planarRange.disabled = !planarOn;
    }

    const volOn = cap.volSteps > 0 && !!state.volumetric.on;
    toggleText(document.querySelector('[data-gfx-toggle="volumetric"]'), volOn);
    setControlDisabled('[data-gfx-toggle="volumetric"]', cap.volSteps <= 0);
    const volValue = cap.volSteps > 0 ? Math.min(state.volumetric.value, cap.volSteps) : 0;
    rangeValue('salt-effect-volumetric', volValue);
    rangeOut('salt-effect-volumetric-out', volOn ? volValue + pick(' 步', ' steps') : onOff(false));
    const volRange = document.getElementById('salt-effect-volumetric');
    if (volRange) {
      volRange.max = String(cap.volSteps || 4);
      volRange.disabled = !volOn;
    }

    const msaaOn = cap.msaa > 0 && !!state.msaa.on;
    toggleText(document.querySelector('[data-gfx-toggle="msaa"]'), msaaOn);
    setControlDisabled('[data-gfx-toggle="msaa"]', cap.msaa <= 0);
    const msaaValue = cap.msaa > 0 ? Math.min(state.msaa.value, cap.msaa) : 0;
    rangeValue('salt-effect-msaa', msaaValue);
    rangeOut('salt-effect-msaa-out', msaaOn ? msaaValue + '×' : onOff(false));
    const msaaRange = document.getElementById('salt-effect-msaa');
    if (msaaRange) {
      msaaRange.max = String(cap.msaa || 2);
      msaaRange.disabled = !msaaOn;
    }

    const aoOn = cap.ao && !!state.ao.on;
    toggleText(document.querySelector('[data-gfx-toggle="ao"]'), aoOn);
    setControlDisabled('[data-gfx-toggle="ao"]', !cap.ao);

    const waterOn = !!state.water && state.water.on !== false;
    toggleText(document.querySelector('[data-gfx-toggle="water"]'), waterOn);
    setControlDisabled('[data-gfx-toggle="water"]', false);

    const draft = advancedDraft || graphics.advanced;
    const rawScale = graphics.advanced.renderScale == null ? Math.round(preset.scale * 100) : graphics.advanced.renderScale;
    const renderScale = Math.min(rawScale, cap.scale);
    rangeValue('salt-live-render-scale', renderScale);
    rangeOut('salt-live-render-scale-out', renderScale + '%');
    const scaleRange = document.getElementById('salt-live-render-scale');
    if (scaleRange) scaleRange.max = String(cap.scale);
    const dyn = draft.dynamic === true;
    toggleText(document.getElementById('salt-adv-dynamic'), dyn);
    const mb = cap.motionBlur && (draft.motionBlur == null ? !!preset.motionBlur : !!draft.motionBlur);
    toggleText(document.getElementById('salt-adv-motion-blur'), mb);
    setControlDisabled('#salt-adv-motion-blur', !cap.motionBlur);
    const rawRain = draft.rain == null ? Math.round((preset.rain || 0) * 100) : Math.round(draft.rain * 100);
    const rain = Math.min(rawRain, Math.round(cap.rain * 100));
    rangeValue('salt-adv-rain', rain);
    rangeOut('salt-adv-rain-out', rain + '%');
    const rainRange = document.getElementById('salt-adv-rain');
    if (rainRange) rainRange.max = String(Math.round(cap.rain * 100));
    const texture = draft.texture || 0;
    const anisotropy = draft.anisotropy || 0;
    const textureShown = texture ? Math.min(texture, cap.texture) : 0;
    const anisotropyShown = anisotropy ? Math.min(anisotropy, cap.anisotropy) : 0;
    selectValue('salt-adv-texture', textureShown);
    selectValue('salt-adv-anisotropy', anisotropyShown);
    capSelectOptions('salt-adv-texture', cap.texture);
    capSelectOptions('salt-adv-anisotropy', cap.anisotropy);
    rangeValue('salt-adv-frame-cap', draft.frameCap || 0);
    rangeOut('salt-adv-frame-cap-out', draft.frameCap ? draft.frameCap + ' fps' : onOff(false));
    syncCapNote(tier, cap);
  }

  function setTierFromPage(tier) {
    if (raceGraphics) {
      if (tier !== AUTO_TIER && !TIERS.includes(tier)) return;
      saveQuality(tier);
      autoMode = tier === AUTO_TIER;
      raceGraphics.setTier(tier);
      syncGraphics();
      syncQualityEntry();
      return;
    }
    const seg = document.querySelector('.salt-quality-seg');
    if (!seg) return;
    const button = seg.querySelector('button[data-q="' + tier + '"]');
    if (!button) return;
    button.click();
    window.setTimeout(() => {
      if (tier === AUTO_TIER) {
        // Explicit Auto selection may move up or down to the recommended tier.
        // Runtime autoTick still only lowers a tier, never raises it, and the
        // map budget prevents a full city scene from starting at medium.
        applyTier(autoTargetTier());
      } else {
        // Do not rely only on the engine's hidden button handler: applying the
        // named tier here also restores its saved per-tier effect values.
        applyTier(tier);
      }
      syncGraphics();
      syncQualityEntry();
      syncQualityNote();
    }, 0);
  }

  function changeTopEffect(key, mutate, immediate) {
    const tier = displayTier();
    const state = graphics.tiers[tier] || (graphics.tiers[tier] = defaultTier(tier));
    mutate(state);
    // Enforce the tier budget even if a stale DOM control sends an out-of-range
    // value or a user toggles an effect that this tier has disabled.
    graphics.tiers[tier] = normalizeTier(tier, state);
    saveGraphics();
    if (immediate) {
      window.clearTimeout(applyTimer);
      applyTimer = 0;
      applyTier(currentTier());
    } else {
      scheduleApply();
    }
    syncGraphics();
    syncQualityEntry();
  }

  function bindGraphicsPage(page) {
    page.addEventListener('pointerdown', event => {
      if (event.target.closest('.salt-gfx-card')) event.stopPropagation();
    });
    page.addEventListener('click', event => {
      if (!event.target.closest('.salt-gfx-card')) closeGraphics();
    });
    page.querySelectorAll('[data-gfx-close]').forEach(button => button.addEventListener('click', closeGraphics));
    page.querySelector('#salt-gfx-back').addEventListener('click', closeGraphics);
    const backTop = page.querySelector('#salt-gfx-back-top');
    if (backTop) backTop.addEventListener('click', closeGraphics);
    page.querySelectorAll('[data-gfx-tier]').forEach(button => {
      button.addEventListener('click', () => setTierFromPage(button.dataset.gfxTier));
    });

    page.querySelectorAll('[data-gfx-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.gfxToggle;
        const state = currentEffectState();
        if (key === 'msaa' && state.msaa.on && !state.msaa.value) state.msaa.value = 2;
        changeTopEffect(key, stateFor => { stateFor[key].on = !stateFor[key].on; }, true);
      });
    });

    const shadow = page.querySelector('#salt-effect-shadow');
    shadow.addEventListener('input', () => {
      const cap = tierCap(displayTier());
      if (cap.shadow <= 0) return;
      const value = clampNumber(shadow.value, 512, cap.shadow, 512, Math.min(1024, cap.shadow));
      changeTopEffect('shadow', state => { state.shadow.value = value; }, false);
    });
    const planar = page.querySelector('#salt-effect-planar');
    planar.addEventListener('input', () => {
      const cap = tierCap(displayTier());
      if (cap.planar <= 0) return;
      const value = clampNumber(planar.value, .25, cap.planar, .25, Math.min(.5, cap.planar));
      changeTopEffect('planar', state => { state.planar.value = value; }, false);
    });
    const volumetric = page.querySelector('#salt-effect-volumetric');
    volumetric.addEventListener('input', () => {
      const cap = tierCap(displayTier());
      if (cap.volSteps <= 0) return;
      const value = clampNumber(volumetric.value, 4, cap.volSteps, 4, Math.min(16, cap.volSteps));
      changeTopEffect('volumetric', state => { state.volumetric.value = value; }, false);
    });
    const msaa = page.querySelector('#salt-effect-msaa');
    msaa.addEventListener('input', () => {
      const cap = tierCap(displayTier());
      if (cap.msaa <= 0) return;
      const value = clampNumber(msaa.value, 2, cap.msaa, 2, Math.min(2, cap.msaa));
      changeTopEffect('msaa', state => { state.msaa.value = value; }, false);
    });

    const liveScale = page.querySelector('#salt-live-render-scale');
    liveScale.addEventListener('input', () => {
      const cap = tierCap(displayTier());
      const value = clampNumber(liveScale.value, 50, cap.scale, 5, cap.scale);
      graphics.advanced.renderScale = value;
      if (advancedDraft) advancedDraft.renderScale = value;
      saveGraphics();
      syncGraphics();
      scheduleApply();
    });

    const draft = () => advancedDraft || (advancedDraft = { ...graphics.advanced });
    page.querySelector('#salt-adv-dynamic').addEventListener('click', () => {
      draft().dynamic = !(draft().dynamic == null ? !!(G && G.render && G.render.getDynamicResolution && G.render.getDynamicResolution()) : draft().dynamic);
      markDirty();
      syncGraphics();
    });
    page.querySelector('#salt-adv-motion-blur').addEventListener('click', () => {
      if (!tierCap(displayTier()).motionBlur) return;
      draft().motionBlur = !(draft().motionBlur == null ? !!PRESETS[displayTier()].motionBlur : draft().motionBlur);
      markDirty();
      syncGraphics();
    });
    page.querySelector('#salt-adv-rain').addEventListener('input', event => {
      draft().rain = clampNumber(event.target.value, 0, Math.round(tierCap(displayTier()).rain * 100), 5, 100) / 100;
      markDirty();
      syncGraphics();
    });
    page.querySelector('#salt-adv-texture').addEventListener('change', event => {
      const cap = tierCap(displayTier());
      const value = Number(event.target.value) || 0;
      draft().texture = value ? Math.min(value, cap.texture) : 0;
      markDirty();
      syncGraphics();
    });
    page.querySelector('#salt-adv-anisotropy').addEventListener('change', event => {
      const cap = tierCap(displayTier());
      const value = Number(event.target.value) || 0;
      draft().anisotropy = value ? Math.min(value, cap.anisotropy) : 0;
      markDirty();
      syncGraphics();
    });
    page.querySelector('#salt-adv-frame-cap').addEventListener('input', event => {
      draft().frameCap = Number(event.target.value) || 0;
      markDirty();
      syncGraphics();
    });
    page.querySelector('#salt-adv-reset').addEventListener('click', () => {
      const liveScale = graphics.advanced.renderScale;
      advancedDraft = normalizeAdvanced(null);
      advancedDraft.renderScale = liveScale;
      markDirty();
      syncGraphics();
    });
    page.querySelector('#salt-gfx-reset-all').addEventListener('click', resetGraphicsDefaults);
    page.querySelector('#salt-gfx-save').addEventListener('click', saveAdvanced);
    page.querySelector('#salt-gfx-reload').addEventListener('click', () => location.reload());
  }

  function saveAdvanced() {
    if (!advancedDraft || !graphics) return;
    graphics.advanced = normalizeAdvanced(advancedDraft);
    advancedDraft = { ...graphics.advanced };
    advancedDirty = false;
    saveGraphics();
    applyFrameCap();
    applyDynamicResolution();
    if (G && G.render) applyTier(currentTier());
    syncGraphics();
    syncQualityEntry();
    setStatus(pick('高级项已保存；点“立即重载”后完全生效。', 'Advanced saved; click “Reload now” to apply fully.'), 'saved');
    const reload = document.getElementById('salt-gfx-reload');
    if (reload) reload.hidden = false;
    window.clearTimeout(savedFlashTimer);
    savedFlashTimer = window.setTimeout(() => {
      const status = document.getElementById('salt-gfx-status');
      if (status && !advancedDirty) status.dataset.saved = 'false';
    }, 5000);
  }

  function openGraphics(opener) {
    if (!gfxPage) buildGraphicsPage();
    window.clearTimeout(gfxCloseTimer);
    gfxCloseTimer = 0;
    advancedDraft = { ...graphics.advanced };
    advancedDirty = false;
    gfxOpener = opener || document.activeElement;
    gfxOpen = true;
    gfxPage.classList.remove('on');
    gfxPage.hidden = false;
    gfxPage.setAttribute('aria-hidden', 'false');
    document.body.classList.add('salt-gfx-open');
    syncGraphics();
    setStatus(pick('渲染效果与档位即时生效；高级项保存后需重载。', 'Tiers and effects are live; advanced options need a reload after Save.'));
    // Let the browser paint the closed position for one frame before adding
    // .on, otherwise the drawer would appear instantly instead of sliding.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!gfxOpen) return;
        gfxPage.classList.add('on');
        try {
          const first = gfxPage.querySelector('.salt-gfx-tier-btn[aria-pressed="true"]') || gfxPage.querySelector('.salt-gfx-close');
          if (first) first.focus({ preventScroll: true });
        } catch (error) { /* ignore */ }
      });
    });
  }

  function closeGraphics() {
    if (!gfxPage || !gfxOpen) return;
    if (applyTimer) {
      window.clearTimeout(applyTimer);
      applyTimer = 0;
      if (G && G.render) applyTier(currentTier());
    }
    gfxOpen = false;
    gfxPage.classList.remove('on');
    gfxPage.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('salt-gfx-open');
    window.clearTimeout(gfxCloseTimer);
    gfxCloseTimer = window.setTimeout(() => {
      if (!gfxOpen) gfxPage.hidden = true;
    }, 300);
    if (gfxOpener && typeof gfxOpener.focus === 'function') {
      try { gfxOpener.focus({ preventScroll: true }); } catch (error) { /* ignore */ }
    }
  }

  function trapGraphicsKeys(event) {
    if (!gfxOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeGraphics();
      return;
    }
    if (event.key !== 'Tab') {
      const tag = String(event.target && event.target.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') event.stopPropagation();
      return;
    }
    const focusable = Array.from(gfxPage.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(node => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function observeSettingsPanel() {
    const panels = document.querySelectorAll('.panel');
    if (!panels.length || typeof MutationObserver !== 'function') return;
    for (const panel of panels) {
      if (panel.dataset.saltGfxObserved) continue;
      panel.dataset.saltGfxObserved = '1';
      new MutationObserver(() => {
        if (!gfxOpen) return;
        if (panel.hidden || panel.getAttribute('aria-hidden') === 'true') closeGraphics();
      }).observe(panel, { attributes: true, attributeFilter: ['hidden', 'class', 'aria-hidden'] });
    }
  }

  // ---------------------------------------------------------------------
  // Benchmark overlay
  // ---------------------------------------------------------------------

  function hideOriginalBench() {
    const original = document.getElementById('bench');
    if (original) original.style.display = 'none';
  }

  function createOverlay() {
    if (overlay && overlay.parentElement) return overlay;
    overlay = document.createElement('pre');
    overlay.id = 'salt-bench-overlay';
    overlay.hidden = !overlayOn;
    overlay.setAttribute('aria-hidden', 'true');
    (document.getElementById('app') || document.body).appendChild(overlay);
    return overlay;
  }

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('en-US') : '—';
  }

  function sampleStats() {
    const samples = (gameSamples.length ? gameSamples : frameSamples).slice().sort((a, b) => a - b);
    const avg = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
    const median = samples.length ? samples[Math.floor(samples.length * .5)] : 0;
    const p99 = samples.length ? samples[Math.floor(samples.length * .99)] : 0;
    return {
      samples,
      avg,
      median,
      p99,
      fps: avg > 0 ? 1000 / avg : 0
    };
  }

  function overlayText() {
    if (!G || !G.render || !G.render.renderer) return pick('盐线跑分\n加载中…', 'SALTLINE BENCH\nloading…');
    let stats = {};
    try { stats = typeof G.render.stats === 'function' ? G.render.stats() : {}; } catch (error) { /* ignore */ }
    let gpu = UI_EN ? 'unknown' : '未知';
    try {
      const ctx = G.render.renderer.getContext();
      const ext = ctx && ctx.getExtension('WEBGL_debug_renderer_info');
      gpu = ext && ctx ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : gpu;
    } catch (error) { /* ignore */ }
    let buffer = '—';
    try {
      const size = G.render.renderer.getDrawingBufferSize(new G.THREE.Vector2());
      buffer = size.x + 'x' + size.y;
    } catch (error) { /* ignore */ }
    const measured = sampleStats();
    const fps = measured.fps > 0 ? measured.fps.toFixed(0) : '—';
    const elapsed = Math.max(0, (performance.now() - overlayStartedAt) / 1000).toFixed(0);
    const tier = currentTier();
    const tierName = tierLabel(tier) || tier;
    const forced = forcedQuality();
    const quality = forced ? 'q→' + (tierLabel(forced) || forced)
      : savedQuality() === AUTO_TIER ? 'auto→' + tierName : tierName;
    const errors = Array.isArray(window.__errors) ? window.__errors.length : 0;
    const cap = graphics.advanced.frameCap ? graphics.advanced.frameCap + ' fps' : pick('关闭', 'off');
    const rain = Math.round(effectiveRain(tier) * 100) + '%';
    return UI_EN
      ? [
        'SALTLINE BENCH  t=' + elapsed + 's',
        'GPU: ' + gpu,
        'buffer ' + buffer + '  quality ' + quality + '  dpr ' + (window.devicePixelRatio || 1),
        'fps ' + fps + '  avg ' + measured.avg.toFixed(1) + 'ms  median ' + measured.median.toFixed(1) + 'ms  p99 ' + measured.p99.toFixed(1) + 'ms',
        'calls ' + formatNumber(stats.calls) + '  tris ' + formatNumber(stats.tris),
        'geos ' + formatNumber(stats.geos) + '  tex ' + formatNumber(stats.tex) + '  programs ' + formatNumber(stats.programs),
        'res ' + (Array.isArray(stats.res) ? stats.res.join('x') : '—') + '  scale ' + (stats.scale != null ? Number(stats.scale).toFixed(2) : '—'),
        'cap ' + cap + '  rain ' + rain + '  advanced ' + (stats.advanced ? 'true' : 'false'),
        'soft shadows ' + (stats.softShadows ? 'true' : 'false') + '  errors ' + errors
      ].join('\n')
      : [
        '盐线跑分  t=' + elapsed + 's',
        '显卡：' + gpu,
        '缓冲 ' + buffer + '  画质 ' + quality + '  像素比 ' + (window.devicePixelRatio || 1),
        '帧率 ' + fps + '  平均 ' + measured.avg.toFixed(1) + 'ms  中位 ' + measured.median.toFixed(1) + 'ms  p99 ' + measured.p99.toFixed(1) + 'ms',
        '绘制 ' + formatNumber(stats.calls) + '  三角形 ' + formatNumber(stats.tris),
        '几何 ' + formatNumber(stats.geos) + '  纹理 ' + formatNumber(stats.tex) + '  着色器 ' + formatNumber(stats.programs),
        '分辨率 ' + (Array.isArray(stats.res) ? stats.res.join('x') : '—') + '  缩放 ' + (stats.scale != null ? Number(stats.scale).toFixed(2) : '—'),
        '上限 ' + cap + '  雨量 ' + rain + '  高级 ' + (stats.advanced ? '是' : '否'),
        '软阴影 ' + (stats.softShadows ? '是' : '否') + '  错误 ' + errors
      ].join('\n');
  }

  function paintOverlay() {
    const node = createOverlay();
    if (!overlayOn) return;
    try { node.textContent = overlayText(); } catch (error) { /* ignore */ }
  }

  function overlayLoop(now) {
    if (!overlayOn) {
      overlayRaf = 0;
      return;
    }
    if (overlayLastFrame) {
      const delta = now - overlayLastFrame;
      if (delta > 0 && delta < 1000) {
        frameSamples.push(delta);
        if (frameSamples.length > 600) frameSamples.shift();
      }
    }
    overlayLastFrame = now;
    if (now - overlayLastPaint >= 1000) {
      overlayLastPaint = now;
      try { paintOverlay(); } catch (error) { /* ignore */ }
    }
    overlayRaf = window.requestAnimationFrame(overlayLoop);
  }

  function setOverlay(on, persist = true) {
    overlayOn = !!on;
    if (persist) saveOverlay(overlayOn);
    const node = createOverlay();
    node.hidden = !overlayOn;
    hideOriginalBench();
    const row = document.getElementById('salt-bench-row');
    if (row) {
      const toggle = row.querySelector('#salt-bench-toggle');
      if (toggle) {
        toggle.setAttribute('aria-pressed', String(overlayOn));
        const text = toggle.querySelector('span');
        if (text) text.textContent = onOff(overlayOn);
      }
    }
    if (overlayOn) {
      overlayStartedAt = performance.now();
      frameSamples.length = 0;
      gameSamples.length = 0;
      overlayLastFrame = 0;
      overlayLastPaint = 0;
      paintOverlay();
      if (!overlayRaf) overlayRaf = window.requestAnimationFrame(overlayLoop);
    } else if (overlayRaf) {
      window.cancelAnimationFrame(overlayRaf);
      overlayRaf = 0;
    }
  }

  // ---------------------------------------------------------------------
  // Bind the four quality buttons rendered by settings-panel.ejs.
  // ---------------------------------------------------------------------

  function bindQualityClicks() {
    const label = document.getElementById('l-q');
    const panel = label && label.closest('.panel');
    if (!panel || panel.dataset.saltQualityBound) return;
    panel.dataset.saltQualityBound = '1';
    if (typeof MutationObserver === 'function') {
      new MutationObserver(() => window.setTimeout(syncAutoButton, 0)).observe(panel, {
        attributes: true,
        attributeFilter: ['hidden', 'class', 'aria-hidden']
      });
    }
    panel.addEventListener('click', event => {
      const button = event.target.closest('button[data-q]');
      if (!button || !panel.contains(button)) return;
      const quality = button.dataset.q;
      if (!QUALITY_TIERS.includes(quality)) return;
      autoMode = false;
      lastAutoZone = '';
      saveQuality(quality);
      if (raceGraphics) {
        raceGraphics.setTier(quality);
        window.setTimeout(syncQualitySelector, 0);
        return;
      }
      // The engine's own click handler runs on the same event and applies its
      // base preset. Re-apply once the event finishes so the saved per-tier
      // effects and the current render-scale caps always win.
      window.setTimeout(() => {
        applyTier(quality);
        syncQualitySelector();
      }, 0);
    }, true);
  }

  // The engine renders the panel shell and the controls pane from Chinese
  // template strings. i18n.js translates the visible text, but the panel
  // shell is also set here so tabs, close button and the dialog label always
  // match the selected language even if a dictionary entry is missing.
  function localizeSettingsShell() {
    const panel = document.querySelector('#ui .panel[role="dialog"]') ||
      document.querySelector('.panel[role="dialog"]');
    if (!panel) return;
    panel.setAttribute('aria-label', pick('设置与操作说明', 'Settings and controls'));
    const setTab = (tab, zh, en) => {
      const button = panel.querySelector('.tab[data-tab="' + tab + '"]');
      if (button) button.textContent = pick(zh, en);
    };
    setTab('settings', '设置', 'Settings');
    setTab('controls', '操作说明', 'Controls');
    const close = panel.querySelector('[data-act="close-panel"]');
    if (close) {
      close.textContent = pick('关闭', 'Close');
      close.setAttribute('aria-label', pick('关闭设置与操作说明', 'Close settings and controls'));
    }
  }

  // Localize the engine-owned settings rows. Chinese uses a Chinese main label
  // plus a small English option name; English is the reverse. Toggle values
  // and the fullscreen action are single-language.
  function localizeBaseSettings() {
    const pane = document.querySelector('.salt-settings-groups');
    if (!pane) return;
    const groupNames = {
      graphics: ['画质与显示', 'Graphics & display'],
      controls: ['视角与操作', 'Aim & controls'],
      audio: ['声音', 'Audio'],
      interface: ['界面与公屏', 'HUD & banner'],
      gameplay: ['游戏选项', 'Gameplay']
    };
    for (const [key, names] of Object.entries(groupNames)) {
      const section = pane.querySelector('[data-salt-group="' + key + '"]');
      const heading = section && section.querySelector('h3');
      if (heading) heading.textContent = pick(names[0], names[1]);
    }

    const setLabel = (label, zh, en) => {
      if (label) label.innerHTML = pair(zh, en, 'span class="salt-en"');
    };
    setLabel(document.getElementById('l-fs'), '显示', 'Display');
    setLabel(document.getElementById('l-inv'), '反转 Y 轴', 'Invert Y axis');
    setLabel(document.getElementById('l-inf'), '无限子弹', 'Infinite ammo');
    setLabel(document.querySelector('label[for="s-sens"]'), '鼠标灵敏度', 'Mouse sensitivity');
    setLabel(document.querySelector('label[for="s-fov"]'), '视野范围', 'Field of view');
    setLabel(document.querySelector('label[for="s-vol"]'), '主音量', 'Master volume');
    setLabel(document.getElementById('l-q'), '画质', 'Graphics quality');
    setLabel(document.getElementById('salt-bench-label'), '跑分显示', 'Bench overlay');
    setLabel(document.getElementById('salt-banner-look-label'), '公屏外观', 'Banner appearance');
    setLabel(document.getElementById('salt-banner-opacity-label'), '文字与背景透明度', 'Text and backdrop opacity');
    setLabel(document.getElementById('salt-banner-font-label'), '正文字号', 'Message size');

    const fsText = document.getElementById('fs-t');
    if (fsText) {
      const exiting = /退出|exit/i.test(fsText.textContent || '');
      fsText.textContent = exiting ? pick('退出全屏', 'Exit fullscreen') : pick('进入全屏', 'Enter fullscreen');
    }

    for (const button of pane.querySelectorAll('.toggle[aria-pressed]')) {
      const text = button.querySelector('span');
      if (text) text.textContent = onOff(button.getAttribute('aria-pressed') === 'true');
    }
    const ammo = pane.querySelector('[data-act="infiniteAmmo"]');
    if (ammo) ammo.title = pick(
      '开启后无需换弹',
      'No reload required while enabled'
    );
  }

  // Rebuild the settings pane into short, task-based groups. Moving existing
  // nodes preserves every listener already attached by the engine.
  function groupSettingsRows() {
    const pane = document.querySelector('#ui .panel-b[data-pane="settings"]') ||
      document.querySelector('.panel-b[data-pane="settings"]');
    if (!pane || pane.dataset.saltSettingsGrouped === '1') return;
    const rowOf = selector => {
      const node = pane.querySelector(selector);
      if (!node) return null;
      return node.closest('.row') || node;
    };
    const specs = [
      ['graphics', '画质与显示', 'Graphics & display'],
      ['controls', '视角与操作', 'Aim & controls'],
      ['audio', '声音', 'Audio'],
      ['interface', '界面与公屏', 'HUD & banner'],
      ['gameplay', '游戏选项', 'Gameplay']
    ];
    const root = document.createElement('div');
    root.className = 'salt-settings-groups';
    const groups = {};
    for (const [key, zh, en] of specs) {
      const section = document.createElement('section');
      section.className = 'salt-settings-group';
      section.dataset.saltGroup = key;
      const heading = document.createElement('h3');
      heading.textContent = pick(zh, en);
      section.appendChild(heading);
      root.appendChild(section);
      groups[key] = section;
    }
    const rows = {
      quality: rowOf('#salt-quality-row'),
      note: pane.querySelector('[data-f="qnote"]'),
      fullscreen: rowOf('[data-row="fs"]'),
      sens: rowOf('#s-sens'),
      invert: rowOf('[data-act="invert"]'),
      fov: rowOf('#s-fov'),
      volume: rowOf('#s-vol'),
      banner: rowOf('#salt-banner-opacity-row'),
      bench: rowOf('#salt-bench-row'),
      ammo: rowOf('[data-act="infiniteAmmo"]')
    };
    const append = (key, list) => {
      const section = groups[key];
      if (!section) return;
      for (const node of list) if (node) section.appendChild(node);
    };
    append('graphics', [rows.quality, rows.note, rows.fullscreen]);
    append('controls', [rows.sens, rows.invert, rows.fov]);
    append('audio', [rows.volume]);
    append('interface', [rows.banner, rows.bench]);
    append('gameplay', [rows.ammo]);
    if (raceGraphics) Object.values(groups).filter(section => section.children.length === 1).forEach(section => section.remove());
    pane.appendChild(root);
    pane.dataset.saltSettingsGrouped = '1';
  }

  function ensureUi() {
    ensureQualitySelector();
    ensureBenchRow();
    ensureBannerOpacityRow();
    removeLegacyOverrideRows();
    groupSettingsRows();
    localizeSettingsShell();
    localizeBaseSettings();
    syncQualitySelector();
    observeSettingsPanel();
    bindQualityClicks();
    hideOriginalBench();
  }

  // Language switching uses a full reload so every module picks up the new
  // locale. If the settings panel was open, reopen it on the other side so the
  // player immediately sees the translated settings instead of the title menu.
  function restorePanelAfterLanguageSwitch() {
    let state = null;
    try {
      const raw = sessionStorage.getItem('salt-reopen-settings-after-lang');
      if (raw) state = JSON.parse(raw);
    } catch (error) { return; }
    if (!state || typeof state !== 'object') return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const ready = window.__ready === true;
      const button = document.querySelector('#ui button[data-act="settings"]');
      const panel = document.querySelector('#ui .panel[role="dialog"]');
      const qualityRow = document.getElementById('salt-quality-row');
      if (ready && button && panel && qualityRow) {
        window.clearInterval(timer);
        try { sessionStorage.removeItem('salt-reopen-settings-after-lang'); } catch (error) { /* ignore */ }
        button.click();
        window.setTimeout(() => {
          if (state.tab === 'controls') {
            const tab = panel.querySelector('.tab[data-tab="controls"]');
            if (tab) tab.click();
          }
        }, 120);
        return;
      }
      if (attempts > 80) {
        window.clearInterval(timer);
        try { sessionStorage.removeItem('salt-reopen-settings-after-lang'); } catch (error) { /* ignore */ }
      }
    }, 250);
  }

  function boot() {
    if (document.body.classList.contains('race-settings-page')) return;
    injectStyles();
    migrateAutoDefault();
    migrateLegacyQuality();
    migrateBannerLookDefaults();
    graphics = readGraphics();
    advancedDraft = { ...graphics.advanced };
    bannerOpacity = readBannerOpacity();
    bannerFontSize = readBannerFontSize();
    applyBannerOpacity(bannerOpacity, false);
    applyBannerFontSize(bannerFontSize, false);
    overlayOn = readOverlay();
    autoMode = savedQuality() === AUTO_TIER;
    syncManualQualityFlag();
    overlayStartedAt = performance.now();
    createOverlay();
    setOverlay(overlayOn, false);
    hideOriginalBench();
    const appRoot = document.getElementById('app');
    if (appRoot && typeof MutationObserver === 'function') {
      new MutationObserver(hideOriginalBench).observe(appRoot, { childList: true, subtree: true });
    }
    ensureUi();
    restorePanelAfterLanguageSwitch();

    document.addEventListener('keydown', trapGraphicsKeys, true);

    const waitForGame = window.setInterval(() => {
      if (!window.__G) return;
      G = window.__G;
      if (!G.render || !G.render.stats) return;
      window.clearInterval(waitForGame);
      syncManualQualityFlag();
      wrapSampleFrame();
      ensureUi();
      applySavedGraphics();
      syncAutoButton();
      syncGraphics();
      window.__saltAutoQuality = {
        get auto() { return savedQuality() === AUTO_TIER; },
        get tier() { return currentTier(); },
        recommended: recommendedTier,
        setTier: next => applyTier(next),
        get graphics() { return graphics; }
      };
    }, 250);

    uiTimer = window.setInterval(() => {
      ensureUi();
      syncQualityEntry();
      syncAutoButton();
    }, 800);

    window.addEventListener('storage', event => {
      if (event.key === SETTINGS_KEY) {
        autoMode = savedQuality() === AUTO_TIER;
        syncManualQualityFlag();
        syncAutoButton();
        syncGraphics();
      }
      if (event.key === OVERLAY_KEY) setOverlay(readOverlay(), false);
      if (event.key === BANNER_OPACITY_KEY) {
        bannerOpacity = readBannerOpacity();
        applyBannerOpacity(bannerOpacity, false);
        syncBannerOpacityRow();
      }
      if (event.key === BANNER_FONT_KEY) {
        bannerFontSize = readBannerFontSize();
        applyBannerFontSize(bannerFontSize, false);
        syncBannerOpacityRow();
      }
      if (event.key === GRAPHICS_KEY) {
        graphics = readGraphics();
        if (!advancedDirty) advancedDraft = { ...graphics.advanced };
        syncGraphics();
        if (G && G.render) applyTier(currentTier());
      }
    });
    window.addEventListener('pagehide', () => {
      window.clearInterval(uiTimer);
      if (overlayRaf) window.cancelAnimationFrame(overlayRaf);
      document.removeEventListener('keydown', trapGraphicsKeys, true);
    }, { once: true });
  }

  if (document.body.classList.contains('race-settings-page')) {
    window.SaltRaceGraphics = {
      mount(adapter) {
        raceGraphics = adapter;
        injectStyles();
        migrateLegacyQuality();
        graphics = readGraphics();
        autoMode = savedQuality() === AUTO_TIER;
        syncManualQualityFlag();
        ensureQualitySelector();
        groupSettingsRows();
        adapter.root.querySelector('[data-f="qnote"]').hidden = true;
        localizeSettingsShell();
        localizeBaseSettings();
        bindQualityClicks();
        syncQualitySelector();
        document.addEventListener('keydown', trapGraphicsKeys, true);
      },
      sync() {
        autoMode = savedQuality() === AUTO_TIER;
        syncQualitySelector();
      },
      close: closeGraphics
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
