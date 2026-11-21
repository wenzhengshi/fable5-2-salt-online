(() => {
  'use strict';

  const { maps, pickRespawn } = window.SaltExpeditionZones;
  const qingyun = window.SaltQingyunZone;
  const copy = window.__SALT_I18N__.messages.deployment;
  const query = new URLSearchParams(location.search);
  const exit = document.body.dataset.raceTransfer;
  let preparingQingyunTransfer = exit === 'qingyun';

  const t = (key, values) => {
    const value = String(key || '').split('.').reduce(
      (acc, part) => acc && typeof acc === 'object' ? acc[part] : undefined,
      window.__SALT_I18N__.messages);
    return typeof value === 'string'
      ? value.replace(/\{(\w+)\}/g, (match, name) => values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match)
      : key;
  };

  function mount() {
    for (const actions of document.querySelectorAll('.menu .m-screen .m-actions')) {
      window.SaltShop?.addEntry(actions);
    }
    const titleActions = document.querySelector('.menu .m-title-main .m-actions');
    if (titleActions) {
      const supplyButton = document.createElement('button');
      supplyButton.type = 'button';
      supplyButton.className = 'btn';
      supplyButton.dataset.goldSupply = '';
      supplyButton.setAttribute('aria-haspopup', 'dialog');
      supplyButton.textContent = t('goldSupply.title');
      titleActions.append(supplyButton);
    }
  }

  function setPopulation() {}

  async function prepareDestination(game, id, foreground = false) {
    if (id === 'qingyun') {
      await game.qingyun.preload({ warmup: false, foreground });
      return { enter: (point, animate = true) => game.qingyun.land(point, animate), fallback: qingyun.spawns[0] };
    }
    const enter = await game.expedition.prepareEntry(id);
    return { enter, fallback: pickRespawn(maps[id], null) };
  }

  async function fromRacePortal() {
    if (!exit) return;
    const feedback = document.getElementById('race-transfer-status');
    const actions = document.getElementById('race-transfer-actions');
    document.getElementById('race-transfer-retry').addEventListener('click', () => location.reload());
    try {
      const deadline = performance.now()+15000;
      while (!window.__G?.game?.start || !window.__mp?.joined || !window.__G.portalArrival) {
        if (performance.now()>=deadline || window.__fatal) throw Error('portal startup');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const game = window.__G;
      const vehicle=query.get('vehicle');
      if (exit === 'port') {
        game.game.start({ skipIntro: true, entry: vehicle ? undefined : () => game.portalArrival.start() });
      } else {
        const { enter } = await prepareDestination(game, exit, exit === 'qingyun');
        const point = await window.__mp.requestSpawnMap(exit);
        if (!point) throw Error('portal destination');
        game.game.start({ skipIntro: true, entry: () => enter(point, !vehicle) });
      }
      if(vehicle){
        const mp=window.__mp;
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>{unsubscribe();reject(Error('vehicle arrival'));},4500);
          const unsubscribe=mp.onMessage(message=>{
            if(message.type!=='sedanArrival')return;
            clearTimeout(timeout);
            unsubscribe();
            const url=new URL(location.href);
            url.searchParams.delete('vehicle');
            history.replaceState(null,'',url);
            resolve();
          });
          mp.send({type:'sedanRaceArrival',transfer:vehicle});
        });
      }
      delete document.body.dataset.raceTransfer;
      feedback.hidden = true;
      document.querySelector('.race-transfer-rift').hidden = true;
    } catch (error) {
      feedback.textContent = error.message === 'locked' ? window.SaltShop.locked() : copy.failed;
      actions.hidden = false;
      console.warn('[race portal]', error);
    } finally {
      preparingQingyunTransfer = false;
    }
  }

  function deploy(game, launch) {
    if (game.game.state !== 'title') return;
    launch(() => game.portalArrival?.start());
  }

  window.SaltMapSelect = {
    mount, deploy, setPopulation, fromRacePortal, prepareDestination,
    get preparingQingyunTransfer() { return preparingQingyunTransfer; }
  };
})();
