(() => {
  'use strict';

  const app = document.getElementById('app');
  const messages = window.__SALT_I18N__.messages;
  const notice = document.createElement('div');
  notice.id = 'salt-portal-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  document.body.append(notice);

  const destinations = new Set(['port', 'qingyun', 'bayhaven', 'mothlight', 'dustfall', 'lunar']);
  const afterPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  let frame, portalBusy = false, raceActive = false, noticeTimer;

  function showNotice(message, timeout = 0) {
    clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.hidden = !message;
    if (timeout) noticeTimer = setTimeout(() => showNotice(''), timeout);
  }

  function writeRoute(path, params) {
    const query = new URLSearchParams(params).toString();
    history.replaceState(history.state, '', path + (query ? '?' + query : ''));
  }

  async function openRace(mode, { ticket, vehicle } = {}) {
    if (frame) return;
    const params = {};
    if (ticket) params.ticket = ticket;
    if (vehicle) params.vehicle = vehicle;
    const layer = document.createElement('iframe');
    layer.id = 'salt-race-layer';
    layer.title = messages.deployment.racePortal;
    layer.allowFullscreen = true;
    layer.tabIndex = -1;
    layer.dataset.preparing = '';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    layer.src = '/race/scene/' + mode + '?' + new URLSearchParams(params);
    frame = layer;

    try {
      await new Promise((resolve, reject) => {
        const events = new AbortController();
        const finish = (error) => {
          clearTimeout(deadline);
          events.abort();
          if (error) reject(error);
          else resolve();
        };
        const deadline = setTimeout(() => finish(Error('Race initialization timed out')), 60000);
        window.addEventListener('message', event => {
          if (event.origin !== location.origin || event.source !== layer.contentWindow) return;
          if (event.data?.type === 'salt-race-ready') finish();
          if (event.data?.type === 'salt-race-failed') finish(Error('Race initialization failed'));
        }, { signal: events.signal });
        layer.addEventListener('error', () => finish(Error('Race scene unavailable')), { signal: events.signal });
        layer.addEventListener('load', () => {
          const scene = layer.contentDocument;
          if (scene && scene.URL !== 'about:blank' && !scene.body?.hasAttribute('data-plaza-visit')) {
            finish(Error('Race entry unavailable'));
          }
        }, { signal: events.signal });
        document.body.append(layer);
      });

      const replay = window.SaltReplay;
      if (replay?.recording) await replay.stop();
      window.__mp?.suspendForRace();
      window.__G?.game?.parkForRace();
      raceActive = true;
      app.inert = true;
      delete layer.dataset.preparing;
      layer.removeAttribute('aria-hidden');
      layer.inert = false;
      layer.contentWindow.focus();
      writeRoute(mode === 'plaza' ? '/race/plaza' : '/race', ticket ? { ticket } : {});
    } catch (error) {
      layer.remove();
      frame = null;
      throw error;
    }
  }

  async function waitFor(test, timeout) {
    const deadline = performance.now() + timeout;
    while (!test()) {
      if (performance.now() >= deadline || window.__fatal || /failed/.test(window.__SALT_BOOT__?.phase)) {
        throw Error('Map initialization failed');
      }
      await new Promise(resolve => setTimeout(resolve, 40));
    }
  }

  async function prepareMap(game, map) {
    let timer;
    try {
      return await Promise.race([
        window.SaltMapSelect.prepareDestination(game, map),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error('Map assets timed out')), 30000);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  function acceptVehicle(mp, transfer) {
    return new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer);
        unsubscribe();
        if (error) reject(error);
        else resolve();
      };
      const unsubscribe = mp.onMessage(message => {
        if (message.type === 'sedanArrival') finish();
      });
      const timer = setTimeout(() => finish(Error('Vehicle transfer timed out')), 4500);
      if (!mp.send({ type: 'sedanRaceArrival', transfer })) finish(Error('Vehicle transfer disconnected'));
    });
  }

  async function leaveRace({ map, vehicle, unit, id }) {
    if (!destinations.has(map) || portalBusy || !raceActive) return;
    portalBusy = true;
    const layer = frame;
    const name = messages.deployment[map] || messages.expedition.maps[map];
    const pending = setTimeout(() => showNotice(messages.expedition.loading.replace('{map}', name)), 220);
    try {
      window.__SALT_BOOT__.start();
      await waitFor(() => window.__ready && window.__G?.portalArrival && window.__mp && window.SaltMapSelect, 45000);
      const game = window.__G;
      const destination = map === 'port' ? null : await prepareMap(game, map);
      const mp = window.__mp;
      mp.resumeFromRace();
      await waitFor(() => mp.joined, 7500);
      if (['male', 'female', 'hound', 'drone', 'classic'].includes(unit)) mp.setSoldier(unit);
      const point = destination ? await mp.requestSpawnMap(map) : null;
      if (destination && !point) throw Error('Portal destination unavailable');

      game.game.start({ skipIntro: true, entry: destination ? () => destination.enter(point, false) : undefined });
      if (vehicle) {
        game.sedan.listen();
        await acceptVehicle(mp, vehicle);
      }
      else game.portalArrival.start();

      const replay = layer.contentWindow.SaltReplay;
      if (replay?.recording) await replay.stop();
      void window.SaltReplay?.refresh();
      game.game.menus.refreshSettings();

      delete document.body.dataset.raceStart;
      raceActive = false;
      await afterPaint();
      app.inert = false;
      layer.remove();
      frame = null;
      window.focus();
      writeRoute('/race/transfer/' + map);
      clearTimeout(pending);
      showNotice('');
    } catch (error) {
      window.__G?.game?.parkForRace();
      window.__mp?.suspendForRace();
      clearTimeout(pending);
      showNotice(error.message === 'locked' ? window.SaltShop?.locked() || messages.deployment.failed
        : messages.deployment.failed, 4500);
      layer.contentWindow.postMessage({ type: 'salt-race-return-failed', id }, location.origin);
      console.warn('[race portal]', error);
    } finally {
      portalBusy = false;
    }
  }

  window.addEventListener('message', event => {
    if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'salt-race-return') void leaveRace(event.data);
  });

  window.SaltMapShell = { openRace, get active() { return raceActive; } };
  const initial = document.body.dataset.raceStart;
  if (initial) {
    const params = new URLSearchParams(location.search);
    openRace(initial, { ticket: params.get('ticket'), vehicle: params.get('vehicle') }).catch(error => {
      console.warn('[race load]', error);
      delete document.body.dataset.raceStart;
      writeRoute('/');
      showNotice(messages.deployment.failed, 4500);
      window.__SALT_BOOT__.start();
    });
  }
})();
