(() => {
  'use strict';

  const { maps, pickRespawn } = window.SaltExpeditionZones;
  const qingyun = window.SaltQingyunZone;
  const copy = window.__SALT_I18N__.messages.deployment;
  const expeditionNames = window.__SALT_I18N__.messages.expedition.maps;
  const names = { port: copy.port, qingyun: copy.qingyun, ...expeditionNames };
  const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
  let selected = 'port';
  let loading = false;
  let status;
  const inputs = [];
  const actions = [];
  const populationLabels = new Map();
  let mapCounts = null;

  function setPopulation(counts) {
    mapCounts = counts;
    for (const [id, label] of populationLabels) {
      const count = counts?.[id];
      const known = Number.isSafeInteger(count) && count >= 0;
      const text = known ? copy.playerCount.replace('{n}', count) : '—';
      if (label.textContent === text) continue;
      label.textContent = text;
      label.title = known ? text : copy.playerCountUnavailable;
      label.classList.toggle('populated', known && count > 0);
    }
  }

  function mount(host) {
    const group = document.createElement('fieldset');
    group.className = 'spawn-picker';
    group.innerHTML = '<legend></legend><div class="spawn-grid"></div>';
    group.querySelector('legend').textContent = copy.title;
    const grid = group.querySelector('.spawn-grid');
    for (const id of ['port', 'qingyun', 'bayhaven', 'mothlight', 'dustfall', 'lunar']) {
      const card = document.createElement('label');
      card.className = 'spawn-card';
      card.dataset.map = id;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'spawn-map';
      input.value = id;
      input.checked = id === selected;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        selected = id;
        status.textContent = '';
      });
      inputs.push(input);
      const preview = document.createElement('img');
      preview.src = '/maps/previews/' + id + '.webp' + (id === 'port' ? '?v=home2' : '');
      preview.alt = '';
      preview.width = 720;
      preview.height = 408;
      preview.decoding = 'async';
      const name = document.createElement('span');
      name.className = 'spawn-name';
      name.textContent = names[id];
      const population = document.createElement('span');
      population.className = 'spawn-population';
      populationLabels.set(id, population);
      card.append(input, preview, name, population);
      if (id === 'lunar') {
        const lock = document.createElement('span');
        lock.className = 'spawn-lock';
        lock.textContent = tr('需通行证', 'Pass required');
        const update = () => { lock.hidden = !!window.SaltShop?.has(window.SaltShop.pass); };
        window.addEventListener('saltline:shop', update);
        update();
        card.append(lock);
      }
      grid.append(card);
    }
    status = document.createElement('p');
    status.className = 'spawn-status';
    status.setAttribute('role', 'status');
    host.append(group, status);
    setPopulation(mapCounts);
    const menu = host.closest('.menu');
    const titleActions = menu?.querySelector('.m-title-main .m-actions');
    window.SaltShop?.addEntry(titleActions);
    window.SaltShop?.addEntry(menu?.querySelector('[data-s="paused"] .m-actions'));
    if (titleActions) actions.push(...titleActions.querySelectorAll('button'));
  }

  async function deploy(game, launch, requestLock, exitLock) {
    if (game.game.state !== 'title' || loading) return;
    const id = selected;
    if (id === 'port') {
      launch();
      return;
    }

    if (id === 'lunar' && (!window.__mp?.connected || !window.SaltShop?.has(window.SaltShop.pass))) {
      window.SaltShop?.open('pass');
      return;
    }
    requestLock();
    loading = true;
    for (const control of [...inputs, ...actions]) control.disabled = true;
    status.textContent = copy.loading.replace('{map}', names[id]);

    try {
      let enter, fallback;
      if (id === 'qingyun') {
        await game.qingyun.preload({ warmup: false });
        enter = game.qingyun.land;
        fallback = qingyun.spawns[0];
      } else {
        enter = await game.expedition.prepareEntry(id);
        fallback = pickRespawn(maps[id], null);
      }
      if (game.game.state !== 'title') return;
      const serverPoint = await window.__mp?.requestSpawnMap(id);
      if (id === 'lunar' && !serverPoint) throw new Error('Lunar deployment requires a server');
      const point = serverPoint || fallback;
      if (game.game.state !== 'title') return;
      launch(() => enter(point));
      status.textContent = '';
    } catch (error) {
      exitLock();
      status.textContent = error.message === 'locked' ? window.SaltShop.locked() : copy.failed;
      console.warn('[deployment]', error);
    } finally {
      loading = false;
      for (const control of [...inputs, ...actions]) control.disabled = false;
    }
  }

  window.SaltMapSelect = { mount, deploy, setPopulation };
})();
