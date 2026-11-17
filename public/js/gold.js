(() => {
  'use strict';
  window.installGold = game => {
    const { THREE, scene, player, input } = game;
    const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
    const { format } = window.SaltGoldRules;
    const giftWords = window.__SALT_I18N__?.messages?.goldGift || {};
    const g = key => typeof giftWords[key] === 'string' ? giftWords[key] : key;
    const hudWords = window.__SALT_I18N__?.messages?.goldHud || {};
    const hudText = (key, values) => String(typeof hudWords[key] === 'string' ? hudWords[key] : key)
      .replace(/\{(\w+)\}/g, (match, name) => values && Object.prototype.hasOwnProperty.call(values, name)
        ? String(values[name]) : match);
    const controlText = key => window.__SALT_I18N__?.messages?.controls?.[key] || key;
    const interpolate = (key, values) => String(g(key)).replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match);
    const giftErrors = { amount: 'invalidAmount' };
    const group = new THREE.Group();
    group.name = 'gold-dispatch';
    scene.add(group);
    const metal = new THREE.MeshStandardMaterial({ color: 0xffbd39, metalness: .64, roughness: .27, emissive: 0x8d4f00, emissiveIntensity: .7 });
    const alertMetal = new THREE.MeshStandardMaterial({ color: 0xff6142, metalness: .42, roughness: .3, emissive: 0xb62800, emissiveIntensity: .95 });
    const coin = new THREE.CylinderGeometry(.22, .22, .06, 14).rotateX(Math.PI / 2);
    const ring = new THREE.TorusGeometry(.35, .035, 8, 25);
    const threat = {
      drone: { range: 34, damage: 8, telegraph: .55, cooldown: [1.8, 2.6], height: .05, type: 'gull' },
      hound: { range: 19, damage: 12, telegraph: .38, cooldown: [1.3, 2.1], height: .95, type: 'hound' }
    };
    const fireGap = 650;
    const muzzle = new THREE.Vector3();
    const aimPoint = new THREE.Vector3();
    const eyePoint = new THREE.Vector3();
    const shotEnd = new THREE.Vector3();
    const entities = new Map();
    const drops = new Map();
    const hud = document.createElement('aside');
    hud.className = 'gold-hud';
    hud.hidden = true;
    hud.innerHTML = '<button type="button" class="gold-balance" aria-expanded="false" aria-controls="gold-dispatch-details"></button>' +
      '<div class="gold-dispatch" id="gold-dispatch-details" role="status" aria-live="polite">' +
        '<div class="gold-dispatch-head"><span class="gold-dispatch-label"></span>' +
          '<em class="gold-dispatch-live"></em><b class="gold-dispatch-value">—</b></div>' +
        '<span class="gold-dispatch-track"><i></i></span>' +
        '<small class="gold-dispatch-meta"></small><small class="gold-dispatch-meta gold-extra"></small>' +
      '</div>' +
      '<span></span><button type="button" hidden></button>';
    const [status, dispatch, reminder, button] = hud.children;
    const bonusMeta = dispatch.querySelector('.gold-extra');
    status.addEventListener('click', () => {
      const expanded = hud.classList.toggle('is-expanded');
      status.setAttribute('aria-expanded', String(expanded));
    });
    const dispatchLabel = dispatch.querySelector('.gold-dispatch-label');
    const dispatchLive = dispatch.querySelector('.gold-dispatch-live');
    const dispatchValue = dispatch.querySelector('.gold-dispatch-value');
    const dispatchBar = dispatch.querySelector('.gold-dispatch-track > i');
    const dispatchMeta = dispatch.querySelector('.gold-dispatch-meta');
    dispatchLabel.textContent = hudText('remaining');
    dispatchLive.textContent = hudText('live');
    dispatchMeta.textContent = hudText('waiting');
    button.textContent = hudText('pick', { amount: '1' });
    const giftButton = document.createElement('button');
    giftButton.type = 'button';
    giftButton.className = 'gold-gift-button';
    giftButton.hidden = true;
    giftButton.innerHTML = '<span></span><kbd></kbd>';
    giftButton.querySelector('span').textContent = g('button');
    giftButton.querySelector('kbd').textContent = g('key');
    giftButton.title = interpolate('keyHint', { key: g('key') });
    hud.append(giftButton);
    document.body.append(hud);

    const controlsList = document.querySelector('[data-pane="controls"] .keys');
    if (controlsList && !controlsList.querySelector('.gold-controls-hint')) {
      const row = document.createElement('div');
      row.className = 'gold-controls-hint';
      const label = document.createElement('dt');
      label.textContent = controlText('giftGold');
      const keys = document.createElement('dd');
      const shortcut = document.createElement('kbd');
      shortcut.textContent = g('key');
      keys.append(shortcut, document.createTextNode(' ' + g('controlsHint')));
      row.append(label, keys);
      controlsList.append(row);
    }

    const giftDialog = document.createElement('dialog');
    giftDialog.className = 'road-sign-dialog gold-gift-dialog';
    giftDialog.innerHTML = '<h2></h2><p role="status"></p>' +
      '<label class="gold-gift-field"><span></span><input type="text" inputmode="decimal" maxlength="24"></label>' +
      '<div class="gold-gift-list"></div><footer><button type="button"></button></footer>';
    document.body.append(giftDialog);
    const giftNotice = giftDialog.querySelector('p');
    const giftAmountLabel = giftDialog.querySelector('.gold-gift-field span');
    const giftAmountInput = giftDialog.querySelector('.gold-gift-field input');
    const giftList = giftDialog.querySelector('.gold-gift-list');
    const giftClose = giftDialog.querySelector('footer button');
    giftDialog.querySelector('h2').textContent = g('title');
    giftNotice.textContent = g('hint');
    giftAmountLabel.textContent = g('amountLabel');
    giftAmountInput.placeholder = g('amountPlaceholder');
    giftClose.textContent = g('close');

    const confirmDialog = document.createElement('dialog');
    confirmDialog.className = 'road-sign-dialog gold-gift-confirm-dialog';
    confirmDialog.innerHTML = '<h2></h2><p></p><footer><button type="button"></button><button type="button"></button></footer>';
    document.body.append(confirmDialog);
    const confirmHeading = confirmDialog.querySelector('h2');
    const confirmMessage = confirmDialog.querySelector('p');
    const [confirmCancel, confirmAccept] = confirmDialog.querySelectorAll('footer button');
    confirmHeading.textContent = g('confirmTitle');
    confirmCancel.textContent = g('confirmCancel');
    confirmAccept.textContent = g('confirmAccept');

    const requestDialog = document.createElement('dialog');
    requestDialog.className = 'road-sign-dialog gold-gift-request-dialog';
    requestDialog.innerHTML = '<h2></h2><p></p><footer><button type="button"></button><button type="button"></button></footer>';
    document.body.append(requestDialog);
    const requestHeading = requestDialog.querySelector('h2');
    const requestMessage = requestDialog.querySelector('p');
    const [requestDecline, requestAccept] = requestDialog.querySelectorAll('footer button');
    requestDecline.textContent = g('decline');
    requestAccept.textContent = g('accept');
    for (const dialog of [giftDialog, confirmDialog, requestDialog]) {
      dialog.addEventListener('keyup', event => event.stopPropagation());
    }
    window.addEventListener('keydown', event => {
      if (!giftDialog.open && !confirmDialog.open && !requestDialog.open) return;
      event.stopImmediatePropagation();
      if (event.code !== 'Escape') return;
      event.preventDefault();
      if (requestDialog.open) requestDecline.click();
      else if (confirmDialog.open) confirmCancel.click();
      else closeGiftDialog();
    }, true);

    let mp, off, map, target, carried = 0, reward = 0, issued = 0, remaining = 0;
    let ordinaryRemaining = 0, ordinaryUntilPity = 5;
    let remainingTargets = 0, remainingGold = 0, totalGold = 0, dispatchSynced = false, requested = -Infinity;
    let giftSequence = 0, giftRequest = 0, giftTarget = '', giftAmount = 0, giftOfferId = '';
    let giftOfferExpiresAt = 0, giftSentAt = 0, giftRelock = false, giftRenderAt = 0;
    let giftCandidates = [], giftConfirming = false, incomingActive = false, incomingRelock = false;
    let modalGuard = false;
    let activeIncomingOfferId = '', dismissIncomingOffer = null;
    const incomingOffers = [];
    const resolvedIncoming = new Set();
    let nextAttackAt = 0, threatNoticeAt = 0;
    let state = { targets: [], drops: [] };
    const currentMap = () => game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : 'port');
    const dialogsOpen = () => giftDialog.open || confirmDialog.open || requestDialog.open;
    function mesh(parent, geometry, x = 0, y = 0, z = 0) {
      const object = new THREE.Mesh(geometry, metal);
      object.position.set(x, y, z);
      parent.add(object);
      return object;
    }
    function remove(collection, id) {
      const entry = collection.get(id);
      entry.model?.dispose();
      entry.marker.removeFromParent();
      collection.delete(id);
    }
    function sync(collection, rows, isDrop) {
      const live = new Set(rows.map(row => row.id));
      for (const id of collection.keys()) if (!live.has(id)) remove(collection, id);
      for (const row of rows) {
        let entry = collection.get(row.id);
        if (!entry) {
          const marker = new THREE.Group();
          const icon = new THREE.Group();
          marker.add(icon);
          mesh(icon, coin);
          const ringMesh = mesh(icon, ring);
          group.add(marker);
          entry = { marker, icon, ringMesh, row, model: null, cooldown: 500 + Math.random() * 1200, telegraph: 0 };
          collection.set(row.id, entry);
        }
        entry.row = row;
        if (!isDrop && !entry.model) {
          entry.model = window.SaltUnitModels?.create(row.kind);
          if (entry.model) entry.marker.add(entry.model.model);
        }
        entry.marker.position.copy(row.pos);
      }
    }
    function updateThreat(entry, dt, now) {
      const { row, ringMesh } = entry;
      const profile = threat[row.kind];
      if (!profile || !player.alive || game.game.state !== 'playing') return false;
      muzzle.set(row.pos.x, row.pos.y + profile.height, row.pos.z);
      const eye = player.eye || eyePoint.copy(player.pos).setY(player.pos.y + 1.5);
      const distance = muzzle.distanceTo(eye);
      if (distance > profile.range || (game.physics?.lineOfSight && !game.physics.lineOfSight(muzzle, eye))) {
        entry.telegraph = 0;
        entry.cooldown = Math.max(entry.cooldown, 180);
        ringMesh.material = metal;
        return false;
      }
      ringMesh.material = alertMetal;
      if (entry.model?.model) {
        entry.model.model.rotation.y = Math.atan2(player.pos.x - row.pos.x, player.pos.z - row.pos.z);
      }
      if (now - threatNoticeAt > 12000) {
        threatNoticeAt = now;
        const warning = window.__SALT_I18N__?.messages?.ui?.goldThreat;
        if (warning) mp?.toast?.(warning);
      }
      if (entry.telegraph <= 0) {
        entry.cooldown -= dt * 1000;
        if (entry.cooldown > 0 || now < nextAttackAt) return true;
        entry.telegraph = profile.telegraph;
        game.events?.emit?.('enemy:telegraph', {
          enemy: { id: row.id, type: profile.type },
          type: profile.type,
          time: profile.telegraph,
          pos: muzzle
        });
        return true;
      }
      entry.telegraph -= dt;
      if (entry.telegraph > 0) return true;
      entry.telegraph = 0;
      aimPoint.copy(eye).sub(muzzle).normalize();
      aimPoint.x += (Math.random() - .5) * (row.kind === 'drone' ? .035 : .055);
      aimPoint.y += (Math.random() - .5) * .025;
      aimPoint.z += (Math.random() - .5) * (row.kind === 'drone' ? .035 : .055);
      aimPoint.normalize();
      const obstruction = game.physics?.raycast?.(muzzle, aimPoint, profile.range);
      if (obstruction?.point) shotEnd.copy(obstruction.point);
      else shotEnd.copy(muzzle).addScaledVector(aimPoint, profile.range);
      game.combat?.enemyShot?.(muzzle, aimPoint, { damage: profile.damage, range: profile.range });
      game.fx?.muzzleFlash?.(muzzle, aimPoint, { scale: .55 });
      game.fx?.tracer?.(muzzle, shotEnd, { color: 0xff8a3d, speed: 150 });
      game.events?.emit?.('enemy:fire', {
        enemy: { id: row.id, type: profile.type },
        type: profile.type,
        pos: muzzle,
        dir: aimPoint
      });
      const [low, high] = profile.cooldown;
      entry.cooldown = low + Math.random() * (high - low);
      nextAttackAt = now + fireGap;
      return true;
    }
    function nearbyPlayers() {
      const api = mp || window.__mp;
      if (!api?.connected) return [];
      const selfId = String(api.id);
      return (api.avatarList || []).filter(avatar =>
        avatar && String(avatar.id) !== selfId &&
        [avatar.x, avatar.y, avatar.z].every(Number.isFinite) &&
        Math.hypot(player.pos.x - avatar.x, player.pos.z - avatar.z) <= 8 &&
        Math.abs(player.pos.y - avatar.y) <= 3
      ).map(avatar => ({
        id: avatar.id,
        name: avatar.name || avatar.data?.name || String(avatar.id),
        distance: Math.hypot(player.pos.x - avatar.x, player.pos.z - avatar.z)
      })).sort((left, right) => left.distance - right.distance);
    }
    function renderGiftList() {
      giftList.replaceChildren();
      const candidates = nearbyPlayers();
      if (!candidates.length) {
        const empty = document.createElement('p');
        empty.className = 'gold-gift-empty';
        empty.textContent = g('empty');
        giftList.append(empty);
      }
      for (const candidate of candidates) {
        const row = document.createElement('div');
        row.className = 'gold-gift-row';
        const name = document.createElement('span');
        name.textContent = candidate.name;
        const distance = document.createElement('small');
        distance.textContent = interpolate('distance', { n: candidate.distance.toFixed(1) });
        const give = document.createElement('button');
        give.type = 'button';
        give.textContent = g('send');
        give.disabled = !!giftRequest || !!giftConfirming || incomingActive;
        give.addEventListener('click', () => confirmGift(candidate.id, candidate.name));
        row.append(name, distance, give);
        giftList.append(row);
      }
      giftAmountInput.disabled = !!giftRequest;
      giftRenderAt = performance.now();
    }
    function openGiftDialog() {
      if (giftDialog.open || document.querySelector('dialog[open]')) return;
      const api = mp || window.__mp;
      if (!api?.connected) { giftNotice.textContent = g('disconnected'); return; }
      giftRelock = !!document.pointerLockElement;
      modalGuard = true;
      input.setGameplay(false);
      giftNotice.textContent = g('hint');
      giftAmountInput.value = '';
      giftAmountInput.disabled = false;
      giftDialog.showModal();
      input.exitLock?.();
      renderGiftList();
      giftAmountInput.focus();
    }
    function restoreInput() {
      if (game.game.state !== 'playing' || !player.alive || giftDialog.open || incomingActive) return;
      modalGuard = false;
      input.setGameplay(true);
      if (giftRelock || incomingRelock) input.requestLock?.();
      giftRelock = false;
      incomingRelock = false;
    }
    function closeGiftDialog() {
      if (!giftDialog.open) return;
      giftDialog.close();
      giftConfirming = false;
      restoreInput();
    }
    function askGiftConfirmation(name, amount) {
      return new Promise(resolve => {
        confirmMessage.textContent = interpolate('confirmMessage', { name, amount });
        let settled = false;
        const finish = answer => {
          if (settled) return;
          settled = true;
          confirmCancel.removeEventListener('click', decline);
          confirmAccept.removeEventListener('click', accept);
          confirmDialog.removeEventListener('cancel', cancel);
          if (confirmDialog.open) confirmDialog.close();
          resolve(answer);
        };
        const decline = () => finish(false);
        const accept = () => finish(true);
        const cancel = event => { event.preventDefault(); finish(false); };
        confirmCancel.addEventListener('click', decline);
        confirmAccept.addEventListener('click', accept);
        confirmDialog.addEventListener('cancel', cancel);
        confirmDialog.showModal();
        confirmAccept.focus();
      });
    }
    function askGiftResponse(offer) {
      return new Promise(resolve => {
        requestHeading.textContent = interpolate('requestTitle', { name: offer.fromName });
        requestMessage.textContent = interpolate('requestMessage', {
          name: offer.fromName, amount: format(offer.amount)
        });
        let settled = false;
        let dismiss = null;
        const finish = answer => {
          if (settled) return;
          settled = true;
          requestDecline.removeEventListener('click', decline);
          requestAccept.removeEventListener('click', accept);
          requestDialog.removeEventListener('cancel', cancel);
          if (requestDialog.open) requestDialog.close();
          if (activeIncomingOfferId === offer.offerId) activeIncomingOfferId = '';
          if (dismissIncomingOffer === dismiss) dismissIncomingOffer = null;
          resolve(answer);
        };
        const decline = () => finish(false);
        const accept = () => finish(true);
        const cancel = event => { event.preventDefault(); finish(false); };
        dismiss = () => finish(null);
        requestDecline.addEventListener('click', decline);
        requestAccept.addEventListener('click', accept);
        requestDialog.addEventListener('cancel', cancel);
        activeIncomingOfferId = offer.offerId;
        dismissIncomingOffer = dismiss;
        requestDialog.showModal();
        requestAccept.focus();
      });
    }
    async function confirmGift(toId, name) {
      if (giftRequest || giftConfirming) { giftNotice.textContent = g('busy'); return; }
      const units = window.SaltGoldRules.parse(giftAmountInput.value);
      if (units === null || units <= 0) { giftNotice.textContent = g('invalidAmount'); return; }
      if (units > carried) { giftNotice.textContent = g('funds'); return; }
      giftConfirming = true;
      renderGiftList();
      let agreed = false;
      try { agreed = await askGiftConfirmation(name, format(units)); }
      finally { giftConfirming = false; }
      if (!giftDialog.open) return;
      if (!agreed) { giftNotice.textContent = g('confirmCanceled'); renderGiftList(); return; }
      sendGift(toId, name, units);
    }
    function sendGift(toId, name, units) {
      const api = mp || window.__mp;
      if (!api?.connected) { giftNotice.textContent = g('disconnected'); return; }
      if (giftRequest) { giftNotice.textContent = g('busy'); return; }
      giftRequest = ++giftSequence;
      giftTarget = name;
      giftAmount = units;
      giftOfferId = '';
      giftSentAt = performance.now();
      giftOfferExpiresAt = giftSentAt + 32000;
      giftNotice.textContent = interpolate('sendingTo', { name, amount: format(units) });
      api.syncState?.();
      if (!api.send({ type: 'goldGift', toId, amount: units, request: giftRequest })) {
        giftRequest = 0;
        giftNotice.textContent = g('disconnected');
      }
      renderGiftList();
    }
    async function presentIncomingOffer(offer) {
      incomingActive = true;
      incomingRelock = !!document.pointerLockElement;
      modalGuard = true;
      input.setGameplay(false);
      input.exitLock?.();
      let accepted = null;
      try { accepted = await askGiftResponse(offer); }
      catch (error) { accepted = false; }
      if (accepted !== null && !resolvedIncoming.has(offer.offerId) && mp?.connected) {
        mp.send({ type: 'goldGiftResponse', offerId: offer.offerId, accept: accepted });
        mp.toast?.(interpolate(accepted ? 'responseAccepting' : 'responseDeclining', { name: offer.fromName }));
      }
      activeIncomingOfferId = '';
      incomingActive = false;
      restoreInput();
      window.setTimeout(drainIncoming, 250);
    }
    function drainIncoming() {
      if (incomingActive || !mp?.connected) return;
      while (incomingOffers.length) {
        const offer = incomingOffers.shift();
        if (resolvedIncoming.has(offer.offerId) || Date.now() >= offer.expiresAt) continue;
        presentIncomingOffer(offer);
        return;
      }
    }
    function senderResult(msg) {
      giftRequest = 0;
      giftOfferId = '';
      giftOfferExpiresAt = 0;
      if (Number.isSafeInteger(msg.carried)) carried = msg.carried;
      const name = msg.toName || giftTarget || '';
      const amount = format(msg.amount || giftAmount);
      if (msg.error) {
        const key = giftErrors[msg.error] || (giftWords[msg.error] ? msg.error : 'storage');
        giftNotice.textContent = g(key);
        mp?.toast?.(g(key));
      } else if (msg.status === 'accepted') {
        giftNotice.textContent = interpolate('accepted', { name, amount });
        mp?.toast?.(giftNotice.textContent);
      } else if (msg.status === 'declined') {
        giftNotice.textContent = interpolate('declined', { name, amount });
        mp?.toast?.(giftNotice.textContent);
      } else if (msg.status === 'expired') {
        giftNotice.textContent = interpolate('expired', { name, amount });
        mp?.toast?.(giftNotice.textContent);
      } else if (msg.status === 'unavailable' || msg.status === 'range' || msg.status === 'funds') {
        giftNotice.textContent = g(msg.status);
        mp?.toast?.(giftNotice.textContent);
      } else {
        giftNotice.textContent = interpolate('sent', { name, amount });
        mp?.toast?.(giftNotice.textContent);
      }
      if (giftDialog.open) renderGiftList();
    }
    function recipientResult(msg) {
      resolvedIncoming.add(msg.offerId);
      if (msg.offerId === activeIncomingOfferId) dismissIncomingOffer?.();
      if (Number.isSafeInteger(msg.carried)) carried = msg.carried;
      const name = msg.fromName || '';
      const amount = format(msg.amount);
      let key = 'incomingFailed';
      if (msg.status === 'accepted') key = 'youAccepted';
      else if (msg.status === 'declined') key = 'youDeclined';
      else if (msg.status === 'expired') key = 'incomingExpired';
      else if (giftWords[msg.status]) key = msg.status;
      mp?.toast?.(interpolate(key, { name, amount }));
    }
    function receive(msg) {
      if (msg.type === 'goldList') {
        carried = msg.carried;
        issued = msg.issued;
        reward = msg.reward;
        remaining = msg.remaining;
        remainingTargets = Number.isSafeInteger(msg.remainingTargets) ? msg.remainingTargets : remaining;
        remainingGold = Number.isSafeInteger(msg.remainingGold) ? msg.remainingGold : remaining * reward;
        totalGold = Number.isSafeInteger(msg.totalGold) ? msg.totalGold : remainingGold;
        ordinaryRemaining = msg.ordinaryRemaining;
        ordinaryUntilPity = msg.ordinaryUntilPity;
        dispatchSynced = true;
        if (msg.map === currentMap()) state = msg;
      }
      if (msg.type === 'goldDestroyed') {
        const point = new THREE.Vector3(msg.pos.x, msg.pos.y + .25, msg.pos.z);
        game.fx?.sparks?.(point, new THREE.Vector3(0, 1, 0), 14);
      }
      if (msg.type === 'goldKillReward') {
        const credit = hudText('killReward', { amount: format(msg.amount) });
        mp.toast?.(msg.bonus ? credit + ' · ' + hudText('bonus') : credit);
      }
      if (msg.type === 'goldBonus') mp.toast?.(hudText('bonus'));
      if (msg.type === 'goldPicked') mp.toast?.(hudText('picked', { amount: format(msg.amount) }));
      if (msg.type === 'goldGiftResult' && msg.role === 'sender' && msg.request === giftRequest) {
        if (msg.status === 'pending') {
          giftOfferId = msg.offerId;
          giftOfferExpiresAt = performance.now() + 32000;
          giftNotice.textContent = interpolate('waiting', {
            name: msg.toName || giftTarget || '', amount: format(msg.amount)
          });
          if (giftDialog.open) renderGiftList();
          return;
        }
        senderResult(msg);
      }
      if (msg.type === 'goldGiftResult' && msg.role === 'recipient') recipientResult(msg);
      if (msg.type === 'goldGiftRequest') {
        if (!msg.offerId || resolvedIncoming.has(msg.offerId) ||
            incomingOffers.some(offer => offer.offerId === msg.offerId)) return;
        incomingOffers.push({
          offerId: msg.offerId, fromName: msg.fromName || '', amount: msg.amount,
          expiresAt: Number(msg.expiresAt) || Date.now() + 30000
        });
        drainIncoming();
      }
    }
    giftButton.addEventListener('click', openGiftDialog);
    giftClose.addEventListener('click', closeGiftDialog);
    giftDialog.addEventListener('cancel', event => { event.preventDefault(); closeGiftDialog(); });
    giftDialog.addEventListener('keyup', event => event.stopPropagation());
    function pick() {
      if (!target || !mp?.connected || document.querySelector('dialog[open]')) return;
      mp.syncState();
      mp.send({ type: 'goldPick', id: target.id });
    }
    button.addEventListener('click', pick);
    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyJ' || event.repeat || !target || hud.hidden || document.querySelector('dialog[open]') ||
          event.target?.matches?.('input, textarea, [contenteditable]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pick();
    }, true);
    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyY' || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
          !giftCandidates.length || giftButton.hidden || hud.hidden ||
          document.querySelector('dialog[open]') ||
          event.target?.matches?.('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openGiftDialog();
    }, true);

    game.gold = {
      get editing() { return modalGuard || dialogsOpen(); },
      get carried() { return carried; },
      intersect(origin, direction, range) {
        if (!mp?.connected || map !== currentMap()) return null;
        let best = null;
        for (const { row } of entities.values()) {
          const dist = window.SaltGoldRules.hit(origin, direction, row, best?.dist ?? range);
          if (dist !== null) best = { id: row.id, dist };
        }
        return best;
      },
      update(dt) {
        if (mp !== window.__mp) {
          off?.();
          mp = window.__mp;
          off = mp?.onMessage(receive);
          requested = -Infinity;
        }
        const active = mp?.connected && player.alive && game.game.state === 'playing' && !game.frontier?.airborne;
        const next = currentMap();
        if (map !== next || !mp?.connected) {
          state = { targets: [], drops: [] };
          map = next;
          requested = -Infinity;
        }
        hud.hidden = !active;
        group.visible = !!active;
        target = null;
        if (!active) {
          hud.classList.remove('is-expanded');
          status.setAttribute('aria-expanded', 'false');
          giftCandidates = [];
          closeGiftDialog();
          if (incomingActive) requestDecline.click();
          modalGuard = false;
          return;
        }
        drainIncoming();
        const now = performance.now();
        if (giftRequest && now > giftOfferExpiresAt) {
          giftRequest = 0;
          giftOfferId = '';
          giftOfferExpiresAt = 0;
          giftNotice.textContent = g('timeout');
          if (giftDialog.open) renderGiftList();
        }
        giftCandidates = nearbyPlayers();
        giftButton.hidden = giftDialog.open || !giftCandidates.length || carried <= 0;
        if (giftDialog.open && now - giftRenderAt > 500) renderGiftList();
        if (now - requested > 1500) {
          mp.send({ type: 'goldList' });
          requested = now;
        }
        sync(entities, state.targets, false);
        sync(drops, state.drops, true);
        for (const entry of entities.values()) {
          const { row, icon, model } = entry;
          const engaged = updateThreat(entry, dt, now);
          icon.position.y = (row.kind === 'drone' ? 1.28 : 1.95) + Math.sin(now / 390) * .1;
          icon.rotation.y = now / 680;
          icon.scale.setScalar(engaged ? 1.14 : 1);
          model?.rig.update(Math.min(.05, dt), { moving: engaged, sprint: engaged && row.kind === 'hound' });
        }
        let nearest = 2.4;
        for (const { row, icon } of drops.values()) {
          icon.position.y = .42 + Math.sin(now / 300) * .11;
          icon.rotation.y = now / 480;
          const dist = Math.hypot(player.pos.x - row.pos.x, player.pos.z - row.pos.z);
          if (dist < nearest && Math.abs(player.pos.y - row.pos.y) < 1.8) { target = row; nearest = dist; }
        }
        button.hidden = !target;
        if (target) {
          const pickup = hudText('pick', { amount: format(target.amount) });
          if (button.textContent !== pickup) button.textContent = pickup;
        }
        const label = hudText('carried', { amount: format(carried) });
        if (status.textContent !== label) status.textContent = label;
        const value = dispatchSynced ? format(remainingGold) : '—';
        if (dispatchValue.textContent !== value) dispatchValue.textContent = value;
        const meta = dispatchSynced
          ? hudText('dispatchMeta', { remaining: remainingTargets, issued, reward: format(reward) })
          : hudText('waiting');
        if (dispatchMeta.textContent !== meta) dispatchMeta.textContent = meta;
        const bonusStatus = !dispatchSynced ? '' : ordinaryRemaining > 0
          ? hudText('ordinaryRemaining', { amount: format(ordinaryRemaining), count: ordinaryUntilPity })
          : hudText('ordinaryDepleted');
        if (bonusMeta.textContent !== bonusStatus) bonusMeta.textContent = bonusStatus;
        const percent = totalGold > 0 ? Math.max(0, Math.min(100, remainingGold / totalGold * 100)) : 0;
        const width = (dispatchSynced ? percent : 0).toFixed(1) + '%';
        if (dispatchBar.style.width !== width) dispatchBar.style.width = width;
        reminder.hidden = !carried;
        const reminderText = hudText('reminder');
        if (carried && reminder.textContent !== reminderText) reminder.textContent = reminderText;
      }
    };
  };
})();
