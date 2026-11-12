(() => {
  'use strict';

  const i18n = window.__SALT_I18N__ || {};
  const COPY = (i18n.messages && i18n.messages.soldierSelect) || {};
  const STORAGE_KEY = 'saltline.multiplayer.soldier';
  const app = document.getElementById('app');
  if (!app) return;

  function t(key, vars) {
    const raw = COPY[key];
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, (match, name) => (
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function normalizeSoldier(value) {
    return value === 'female' ? 'female' : 'male';
  }

  function loadSoldier() {
    try { return normalizeSoldier(localStorage.getItem(STORAGE_KEY)); } catch (err) { return 'male'; }
  }

  function saveSoldier(value) {
    try { localStorage.setItem(STORAGE_KEY, normalizeSoldier(value)); } catch (err) { /* ignore */ }
  }

  const state = {
    selected: loadSoldier(),
    open: false,
    confirmed: false,
    deployOnConfirm: true,
    renderer: null,
    scene: null,
    camera: null,
    pivot: null,
    current: null,
    raf: 0,
    closeTimer: 0,
    last: 0,
    elapsed: 0,
    reducedMotion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    thumbsStarted: false
  };

  function cardCopy(kind) {
    const female = kind === 'female';
    return {
      name: t(female ? 'femaleName' : 'maleName'),
      role: t(female ? 'femaleRole' : 'maleRole'),
      desc: t(female ? 'femaleDesc' : 'maleDesc'),
      tagA: t(female ? 'femaleTagA' : 'maleTagA'),
      tagB: t(female ? 'femaleTagB' : 'maleTagB'),
      index: female ? '02' : '01'
    };
  }

  const overlay = document.createElement('section');
  overlay.id = 'soldier-select';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('aria'));
  overlay.innerHTML = `
    <div class="ss-atmosphere" aria-hidden="true"></div>
    <header class="ss-top">
      <div class="ss-brand">
        <span class="ss-brand-mark">${t('brandMark')}</span>
        <span><b>${t('kicker')}</b><em>${t('kickerSub')}</em></span>
      </div>
      <div class="ss-index" aria-hidden="true">${t('index')}</div>
    </header>

    <div class="ss-layout">
      <section class="ss-copy">
        <p class="ss-kicker"><i></i>${t('eyebrow')}</p>
        <h2 class="ss-title">${t('title')}</h2>
        <p class="ss-intro">${t('intro')}</p>

        <div class="ss-options" role="radiogroup" aria-label="${t('aria')}">
          <button class="ss-card" type="button" role="radio" data-kind="male" aria-checked="false">
            <span class="ss-card-media" aria-hidden="true">
              <span class="ss-card-grid"></span>
              <img class="ss-thumb" alt="" hidden />
              <span class="ss-card-code">${t('maleCode')}</span>
              <span class="ss-card-scan"></span>
            </span>
            <span class="ss-card-copy">
              <span class="ss-card-line"><i>${cardCopy('male').index}</i><b>${cardCopy('male').name}</b></span>
              <em>${cardCopy('male').role}</em>
              <small>${cardCopy('male').desc}</small>
              <span class="ss-tags"><u>${cardCopy('male').tagA}</u><u>${cardCopy('male').tagB}</u></span>
            </span>
            <span class="ss-card-check" aria-hidden="true"><i></i></span>
          </button>

          <button class="ss-card" type="button" role="radio" data-kind="female" aria-checked="false">
            <span class="ss-card-media" aria-hidden="true">
              <span class="ss-card-grid"></span>
              <img class="ss-thumb" alt="" hidden />
              <span class="ss-card-code">${t('femaleCode')}</span>
              <span class="ss-card-scan"></span>
            </span>
            <span class="ss-card-copy">
              <span class="ss-card-line"><i>${cardCopy('female').index}</i><b>${cardCopy('female').name}</b></span>
              <em>${cardCopy('female').role}</em>
              <small>${cardCopy('female').desc}</small>
              <span class="ss-tags"><u>${cardCopy('female').tagA}</u><u>${cardCopy('female').tagB}</u></span>
            </span>
            <span class="ss-card-check" aria-hidden="true"><i></i></span>
          </button>
        </div>
      </section>

      <section class="ss-stage" aria-label="${t('preview')}">
        <div class="ss-stage-head">
          <span>${t('preview')}</span>
          <em id="ss-model-state">${t('loading')}</em>
        </div>
        <div class="ss-stage-frame">
          <canvas id="ss-preview" aria-label="${t('preview')}"></canvas>
          <div class="ss-stage-grid" aria-hidden="true"></div>
          <div class="ss-reticle" aria-hidden="true"><i></i><b></b></div>
          <div class="ss-stage-loading" id="ss-stage-loading">
            <span></span>
            <b>${t('loading')}</b>
          </div>
          <div class="ss-stage-meta">
            <span><i>${t('selected')}</i><b id="ss-selected-name">${cardCopy(state.selected).name}</b></span>
            <em id="ss-selected-role">${cardCopy(state.selected).role}</em>
          </div>
          <div class="ss-stage-corner" aria-hidden="true">${t('fieldUnit')}</div>
        </div>
        <p class="ss-stage-hint">${t('previewHint')}</p>
      </section>
    </div>

    <footer class="ss-footer">
      <p class="ss-note"><i></i>${t('note')}</p>
      <button class="ss-confirm" id="ss-confirm" type="button">
        <span>${t('confirm')}</span>
        <i aria-hidden="true">→</i>
      </button>
    </footer>
  `;
  app.appendChild(overlay);

  const el = {
    cards: [...overlay.querySelectorAll('.ss-card')],
    confirm: overlay.querySelector('#ss-confirm'),
    preview: overlay.querySelector('#ss-preview'),
    modelState: overlay.querySelector('#ss-model-state'),
    stageLoading: overlay.querySelector('#ss-stage-loading'),
    selectedName: overlay.querySelector('#ss-selected-name'),
    selectedRole: overlay.querySelector('#ss-selected-role')
  };

  function setModelState(text, error) {
    el.modelState.textContent = text;
    el.modelState.classList.toggle('is-error', !!error);
    el.stageLoading.hidden = !error;
    if (error) el.stageLoading.querySelector('b').textContent = text;
  }

  function updateSelection(kind, focus) {
    state.selected = normalizeSoldier(kind);
    const copy = cardCopy(state.selected);
    for (const card of el.cards) {
      const active = card.dataset.kind === state.selected;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-checked', String(active));
    }
    el.selectedName.textContent = copy.name;
    el.selectedRole.textContent = copy.role;
    overlay.dataset.soldier = state.selected;
    mountPreviewModel(state.selected);
    if (focus) {
      const card = el.cards.find((item) => item.dataset.kind === state.selected);
      if (card) card.focus({ preventScroll: true });
    }
  }

  function makeScene(THREE, canvas) {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas || undefined,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 0.78, 0.1, 30);
    camera.position.set(0, 1.02, 4.15);
    camera.lookAt(0, 0.92, 0);

    const pivot = new THREE.Group();
    pivot.rotation.y = -Math.PI / 2 - 0.16;
    scene.add(pivot);

    const hemi = new THREE.HemisphereLight(0xc8e5ff, 0x33210f, 1.65);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff3df, 2.75);
    key.position.set(2.5, 4.2, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 12;
    key.shadow.camera.left = -2.2;
    key.shadow.camera.right = 2.2;
    key.shadow.camera.top = 3.2;
    key.shadow.camera.bottom = -0.5;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xffa95e, 1.35);
    rim.position.set(-2.6, 2.1, -1.8);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0x79c8ff, 0.7);
    fill.position.set(-1.6, 1.4, 3);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 48),
      new THREE.MeshBasicMaterial({ color: 0x0a0d10, transparent: true, opacity: 0.78, depthWrite: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.54, 48),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.006;
    scene.add(ring);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 3.6),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.3 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    shadow.receiveShadow = true;
    scene.add(shadow);

    return { renderer, scene, camera, pivot };
  }

  function ensurePreview() {
    if (state.renderer) return true;
    const THREE = window.__G && window.__G.THREE;
    if (!THREE) return false;
    try {
      const built = makeScene(THREE, el.preview);
      state.renderer = built.renderer;
      state.scene = built.scene;
      state.camera = built.camera;
      state.pivot = built.pivot;
      resizePreview();
      return true;
    } catch (err) {
      console.error('[soldier-select] preview renderer failed', err);
      setModelState(t('fallback'), true);
      return false;
    }
  }

  function resizePreview() {
    if (!state.renderer || !state.camera) return;
    const rect = el.preview.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || el.preview.clientWidth || 480));
    const height = Math.max(1, Math.round(rect.height || el.preview.clientHeight || 620));
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
  }

  function clearPreviewModel() {
    if (!state.pivot || !state.current) return;
    state.pivot.remove(state.current.model);
    state.current = null;
  }

  function mountPreviewModel(kind) {
    if (!state.open || !ensurePreview()) return;
    const api = window.SoldierModels || window.HunterAvatar;
    if (!api || typeof api.create !== 'function') return;
    clearPreviewModel();
    const made = api.create(normalizeSoldier(kind));
    if (!made || !made.model) {
      setModelState(t('fallback'), true);
      return;
    }
    state.current = made;
    state.pivot.add(made.model);
    overlay.dataset.previewKind = made.kind || normalizeSoldier(kind);
    el.stageLoading.hidden = true;
    setModelState(t('ready'));
    try {
      state.renderer.render(state.scene, state.camera);
    } catch (err) { /* The animation loop will retry on the next frame. */ }
  }

  function renderFrame(now) {
    if (!state.open || !state.renderer) {
      state.raf = 0;
      return;
    }
    const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 0.016;
    state.last = now;
    state.elapsed += dt;
    if (state.pivot) {
      const previewYaw = -Math.PI / 2 - 0.16;
      state.pivot.rotation.y = state.reducedMotion
        ? previewYaw
        : previewYaw + Math.sin(state.elapsed * 0.34) * 0.16;
    }
    if (state.current && state.current.rig) {
      try { state.current.rig.update(dt, { moving: false }); } catch (err) { /* ignore */ }
    }
    try { state.renderer.render(state.scene, state.camera); } catch (err) { /* ignore */ }
    state.raf = window.requestAnimationFrame(renderFrame);
  }

  function startLoop() {
    if (state.raf) return;
    state.last = 0;
    state.raf = window.requestAnimationFrame(renderFrame);
  }

  function stopLoop() {
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function startThumbnails() {
    if (state.thumbsStarted) return;
    state.thumbsStarted = true;
    const api = window.SoldierModels || window.HunterAvatar;
    if (!api || typeof api.create !== 'function' || !ensurePreview()) return;
    try {
      clearPreviewModel();
      state.pivot.rotation.y = -Math.PI / 2 - 0.16;
      for (const kind of ['male', 'female']) {
        const made = api.create(kind);
        if (!made || !made.model) continue;
        state.pivot.add(made.model);
        state.renderer.render(state.scene, state.camera);
        const url = state.renderer.domElement.toDataURL('image/png');
        state.pivot.remove(made.model);
        const card = overlay.querySelector(`.ss-card[data-kind="${kind}"]`);
        const img = card && card.querySelector('.ss-thumb');
        if (img && url) {
          img.src = url;
          img.hidden = false;
          card.classList.add('has-thumb');
        }
      }
    } catch (err) {
      console.warn('[soldier-select] thumbnail render skipped', err && err.message);
    }
  }

  function waitForModels() {
    const api = window.SoldierModels || window.HunterAvatar;
    if (!api || typeof api.whenReady !== 'function') {
      window.setTimeout(waitForModels, 150);
      return;
    }
    setModelState(t('loading'));
    Promise.all([api.whenReady('male'), api.whenReady('female')]).then(([maleReady, femaleReady]) => {
      if (maleReady || femaleReady) {
        startThumbnails();
        mountPreviewModel(state.selected);
      }
      if (!maleReady && !femaleReady) setModelState(t('fallback'), true);
      else if (state.selected === 'female' && !femaleReady) setModelState(t('fallback'), true);
    }).catch(() => setModelState(t('fallback'), true));
  }

  function open(options) {
    if (state.open) return;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
      state.closeTimer = 0;
    }
    const opts = options || {};
    state.deployOnConfirm = opts.deploy !== false;
    el.confirm.classList.remove('is-busy');
    el.confirm.querySelector('span').textContent = state.deployOnConfirm
      ? t('confirm')
      : t('confirmSettings');
    state.open = true;
    overlay.hidden = false;
    overlay.classList.add('on');
    overlay.style.opacity = '1';
    document.body.classList.add('soldier-select-open');
    requestAnimationFrame(() => {
      if (!state.open) return;
      resizePreview();
      updateSelection(state.selected, false);
      startLoop();
      waitForModels();
      const card = el.cards.find((item) => item.dataset.kind === state.selected);
      if (card) card.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    state.confirmed = false;
    overlay.classList.remove('on');
    overlay.style.opacity = '0';
    document.body.classList.remove('soldier-select-open');
    if (state.closeTimer) window.clearTimeout(state.closeTimer);
    state.closeTimer = window.setTimeout(() => {
      state.closeTimer = 0;
      if (state.open) return;
      overlay.hidden = true;
      stopLoop();
      clearPreviewModel();
    }, 360);
  }

  function confirm() {
    if (!state.open || state.confirmed) return;
    state.confirmed = true;
    saveSoldier(state.selected);
    el.confirm.classList.add('is-busy');
    el.confirm.querySelector('span').textContent = t('deploying');
    try {
      if (window.__mp && typeof window.__mp.setSoldier === 'function') {
        window.__mp.setSoldier(state.selected);
      }
    } catch (err) { /* ignore */ }
    updateSettingsEntry();
    close();
    if (!state.deployOnConfirm) return;
    const start = () => {
      const button = document.querySelector('.menu[data-screen="title"] [data-act="deploy"]');
      if (button) {
        button.click();
        return true;
      }
      return false;
    };
    window.setTimeout(() => {
      if (start()) return;
      window.setTimeout(start, 700);
    }, 380);
  }

  for (const card of el.cards) {
    card.addEventListener('click', () => updateSelection(card.dataset.kind, false));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      updateSelection(state.selected === 'male' ? 'female' : 'male', true);
    });
  }
  el.confirm.addEventListener('click', confirm);
  window.addEventListener('resize', resizePreview);
  function openFromSettings(event) {
    const trigger = event.target && event.target.closest
      ? event.target.closest('[data-soldier-setting]')
      : null;
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.open) return;
    window.SoldierSelect.open({ deploy: false });
  }
  window.addEventListener('click', openFromSettings, true);

  function updateSettingsEntry() {
    const button = document.querySelector('[data-soldier-setting]');
    if (!button) return;
    button.querySelector('[data-soldier-name]').textContent = cardCopy(state.selected).name;
    button.setAttribute('aria-label', t('aria'));
  }

  function installSettingsEntry() {
    const pane = document.querySelector('.panel [data-pane="settings"]');
    if (!pane) return false;
    if (pane.querySelector('[data-soldier-setting]')) {
      updateSettingsEntry();
      return true;
    }
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.row = 'soldier';
    row.innerHTML = `
      <label>${t('settingsLabel')}</label>
      <button class="btn small soldier-setting-button" type="button" data-soldier-setting aria-label="${t('aria')}">
        <span data-soldier-name>${cardCopy(state.selected).name}</span>
        <i>${t('settingsValue')}</i>
      </button>
    `;
    const note = pane.querySelector('.panel-note');
    pane.insertBefore(row, note || null);
    updateSettingsEntry();
    return true;
  }

  const settingsObserver = new MutationObserver(() => {
    if (installSettingsEntry()) settingsObserver.disconnect();
  });
  settingsObserver.observe(document.getElementById('ui') || document.body, {
    childList: true,
    subtree: true
  });
  installSettingsEntry();

  updateSelection(state.selected, false);

  window.SoldierSelect = {
    open(options) {
      state.confirmed = false;
      open(options || { deploy: false });
    },
    close,
    get selected() { return state.selected; },
    get isOpen() { return state.open; },
    get confirmed() { return state.confirmed; }
  };
})();
