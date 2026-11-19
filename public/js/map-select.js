(() => {
  'use strict';

  const { maps, pickRespawn } = window.SaltExpeditionZones;
  const qingyun = window.SaltQingyunZone;
  const copy = window.__SALT_I18N__.messages.deployment;
  const expeditionNames = window.__SALT_I18N__.messages.expedition.maps;
  const names = { port: copy.port, qingyun: copy.qingyun, ...expeditionNames };
  const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
  const t = (key, values) => {
    const value = String(key || '').split('.').reduce(
      (acc, part) => acc && typeof acc === 'object' ? acc[part] : undefined,
      window.__SALT_I18N__.messages);
    return typeof value === 'string'
      ? value.replace(/\{(\w+)\}/g, (match, name) => values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match)
      : key;
  };
  const raceCoins = value => ((Number(value) || 0) / 1e6).toFixed(6).replace(/\.?0+$/, '');
  const available=['port','qingyun','bayhaven','mothlight','dustfall','lunar','race'];
  const query=new URLSearchParams(location.search);
  const exit=document.body.dataset.raceTransfer;
  let selected=available.slice(0,-1).includes(exit)?exit:query.has('raceEntry')?'race':'port';
  let loading = false;
  let preparingQingyunTransfer = exit === 'qingyun';
  let status;
  let loadingView;
  let loadingMessage;
  const inputs = [];
  const actions = [];
  const populationLabels = new Map();
  let mapCounts = null;
  let raceStats = null;
  let raceStatsBusy = false;

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
    for (const id of available) {
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
      name.textContent = id==='race'?tr('盐港赛车','Saltport Racing'):names[id];
      const population = document.createElement('span');
      population.className = 'spawn-population';
      if(id!=='race')populationLabels.set(id, population);
      else population.textContent=tr('在线挑战','Online Challenge');
      card.append(input, preview, name, population);
      if (id === 'race') {
        raceStats = document.createElement('div');
        raceStats.className = 'race-card-stats';
        const prize = document.createElement('span');
        const boss = document.createElement('span');
        boss.className = 'race-boss-card';
        boss.hidden = true;
        const best = document.createElement('span');
        prize.textContent = t('deployment.racePrizeLoading');
        raceStats.append(prize, boss, best);
        card.append(raceStats);
        const historyButton = document.createElement('button');
        historyButton.type = 'button';
        historyButton.className = 'race-card-history';
        historyButton.textContent = t('raceHistory.cardOpen');
        historyButton.title = t('raceHistory.cardHint');
        historyButton.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          window.SaltRaceHistory?.open();
        });
        card.append(historyButton);
      }
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
    loadingView = document.createElement('div');
    loadingView.className = 'spawn-loading';
    loadingView.hidden = true;
    loadingView.innerHTML = `
      <div class="spawn-loading-content">
        <div class="spawn-loading-art" aria-hidden="true">
          <span class="spawn-loading-runner">
            <img src="/maps/previews/deployment-runner.webp" alt="" decoding="async" width="3072" height="224">
          </span>
        </div>
        <p class="spawn-loading-message" role="status"></p>
        <div class="spawn-loading-track" aria-hidden="true"></div>
      </div>`;
    loadingMessage = loadingView.querySelector('.spawn-loading-message');
    document.getElementById('app').append(loadingView);
    setPopulation(mapCounts);
    if (raceStats) {
      loadRaceStats();
      window.setInterval(() => { if (!document.hidden) loadRaceStats(); }, 30000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) loadRaceStats(); });
    }
    const menu = host.closest('.menu');
    const titleActions = menu?.querySelector('.m-title-main .m-actions');
    window.SaltShop?.addEntry(titleActions);
    window.SaltShop?.addEntry(menu?.querySelector('[data-s="paused"] .m-actions'));
    if (titleActions) actions.push(...titleActions.querySelectorAll('button'));

  }

  const acquireKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(18)),n=>n.toString(16).padStart(2,'0')).join('');
  async function raceRequest(action,body={}) {
    const response=await fetch('/api/race/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return response.json();
  }
  async function loadRaceStats() {
    if (!raceStats || raceStatsBusy) return;
    raceStatsBusy = true;
    const [prize, boss, best] = raceStats.children;
    try {
      const data = await raceRequest('status');
      if (data.error || !Number.isSafeInteger(data.pot) || data.pot <= 0) throw Error(data.error || 'pool');
      prize.textContent = t('deployment.racePrize', { amount: raceCoins(data.pot) });
      boss.hidden = !data.boss?.active;
      if (!boss.hidden) boss.textContent = t('raceBoss.card', { amount: raceCoins(data.boss.amount) });
      const ms = Number(data.ranking?.[0]?.ms);
      best.textContent = Number.isFinite(ms) && ms > 0
        ? t('deployment.raceBest', { time: t('deployment.raceSeconds', { n: (ms / 1000).toFixed(3) }) })
        : t('deployment.raceNoRecord');
    } catch (error) {
      prize.textContent = t('deployment.racePrizeUnavailable');
      boss.hidden = true;
      best.textContent = '';
    } finally {
      raceStatsBusy = false;
    }
  }
  async function payRace(notify = value => { status.textContent=value; }) {
    if(loading)return;
    loading=true;
    notify(tr('正在读取赛车报名…','Checking race entry…'));
    try {
      const info=await raceRequest('status');
      if(info.error)throw Error('wallet');
      if(info.entry?.started) {
        if(await window.SaltModal.confirm({
          title:tr('放弃上一场比赛？','Abandon the previous race?'),
          message:tr('上一场尚未结算。放弃后，已支付的报名费不会退回。','Your previous race is still active. Its entry fee is forfeited if you abandon it.'),
          confirmText:tr('确认放弃','Abandon race'),
          tone:'warning'
        })) {
          const abandoned=await raceRequest('abandon',{id:info.entry.id});
          if(abandoned.error)throw Error('abandon');
          notify(tr('上一场已放弃，可以重新报名。','Race abandoned. You can now enter again.'));
        } else notify('');
        return;
      }
      if(info.entry) {
        location.assign('/race?ticket='+encodeURIComponent(info.entry.id));
        return;
      }
      if(info.balance<info.fee) {
        notify(tr('随身盐线币不足，无法报名。','Insufficient carried Saltline Coins.'));
        return;
      }
      const fee=String(info.fee/1000000);
      const balance=String(info.balance/1000000);
      if(!await window.SaltModal.confirm({
        title:tr('确认赛车报名','Confirm race entry'),
        message:tr('报名费 '+fee+' 盐线币，随身余额 '+balance+' 盐线币。支付成功后进入赛道。',
          'Entry fee: '+fee+' Saltline Coins. Carried balance: '+balance+' Saltline Coins. Payment opens the track.')+'\n'+t('raceHistory.prepayHint'),
        confirmText:tr('支付并参赛','Pay and enter'),
        extraText:t('raceHistory.prepayOpen'),
        onAction:()=>window.SaltRaceHistory?.open()
      })) {
        notify('');
        return;
      }
      const entry=await raceRequest('enter',{key:acquireKey()});
      if(entry.error==='funds') {
        notify(tr('随身盐线币不足，无法报名。','Insufficient carried Saltline Coins.'));
        return;
      }
      if(entry.error||!entry.ticket?.id)throw Error('payment');
      location.assign('/race?ticket='+encodeURIComponent(entry.ticket.id));
    } catch(error) {
      notify(tr('报名请求未完成，请重试。','Race entry could not be completed. Try again.'));
    } finally {
      loading=false;
    }
  }

  async function prepareDestination(game, id, foreground = false) {
    if (id === 'qingyun') {
      await game.qingyun.preload({ warmup: false, foreground });
      return { enter: point => game.qingyun.land(point, true), fallback: qingyun.spawns[0] };
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
      if (exit === 'port') {
        game.game.start({ skipIntro: true, entry: () => game.portalArrival.start() });
      } else {
        const { enter } = await prepareDestination(game, exit, exit === 'qingyun');
        const point = await window.__mp.requestSpawnMap(exit);
        if (!point) throw Error('portal destination');
        game.game.start({ skipIntro: true, entry: () => enter(point) });
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

  async function deploy(game, launch, requestLock, exitLock) {
    if (game.game.state !== 'title' || loading) return;
    const id = selected;
    if(id==='race'){await payRace();return;}
    if (id === 'port') {
      launch(() => game.portalArrival?.start());
      return;
    }

    if (id === 'lunar' && (!window.__mp?.connected || !window.SaltShop?.has(window.SaltShop.pass))) {
      window.SaltShop?.open('pass');
      return;
    }
    requestLock();
    loading = true;
    for (const control of [...inputs, ...actions]) control.disabled = true;
    status.textContent = '';
    loadingView.hidden = false;
    loadingMessage.textContent = copy.loading.replace('{map}', names[id]);

    try {
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      const { enter, fallback } = await prepareDestination(game, id);
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
      preparingQingyunTransfer = false;
      loadingView.hidden = true;
      loadingMessage.textContent = '';
      for (const control of [...inputs, ...actions]) control.disabled = false;
    }
  }

  window.SaltMapSelect = {
    mount, deploy, setPopulation, fromRacePortal,
    get preparingQingyunTransfer() { return preparingQingyunTransfer; }
  };
})();
