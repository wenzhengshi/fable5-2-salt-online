(() => {
  'use strict';

  const { maps, pickRespawn } = window.SaltExpeditionZones;
  const qingyun = window.SaltQingyunZone;
  const copy = window.__SALT_I18N__.messages.deployment;
  const expeditionNames = window.__SALT_I18N__.messages.expedition.maps;
  const names = { port: copy.port, qingyun: copy.qingyun, ...expeditionNames };
  let selected = 'port';
  let loading = false;
  let status;
  const inputs = [];
  const actions = [];

  function mount(host) {
    const group = document.createElement('fieldset');
    group.className = 'spawn-picker';
    group.innerHTML = '<legend></legend><p class="spawn-picker-hint"></p><div class="spawn-grid"></div>';
    group.querySelector('legend').textContent = copy.title;
    group.querySelector('.spawn-picker-hint').textContent = copy.hint;
    const grid = group.querySelector('.spawn-grid');
    for (const id of ['port', 'qingyun', 'bayhaven', 'mothlight', 'dustfall']) {
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
      preview.src = '/maps/previews/' + id + '.webp';
      preview.alt = '';
      preview.width = 720;
      preview.height = 408;
      preview.decoding = 'async';
      const name = document.createElement('span');
      name.className = 'spawn-name';
      name.textContent = names[id];
      card.append(input, preview, name);
      grid.append(card);
    }
    status = document.createElement('p');
    status.className = 'spawn-status';
    status.setAttribute('role', 'status');
    host.append(group, status);
    actions.push(...host.parentElement.querySelectorAll('.m-title-main .m-actions button'));
  }

  async function deploy(game, launch, requestLock, exitLock) {
    if (game.game.state !== 'title' || loading) return;
    const id = selected;
    if (id === 'port') {
      launch();
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
      const point = await window.__mp?.requestSpawnMap(id) || fallback;
      if (game.game.state !== 'title') return;
      launch(() => enter(point));
      status.textContent = '';
    } catch (error) {
      exitLock();
      status.textContent = copy.failed;
      console.warn('[deployment]', error);
    } finally {
      loading = false;
      for (const control of [...inputs, ...actions]) control.disabled = false;
    }
  }

  window.SaltMapSelect = { mount, deploy };
})();
