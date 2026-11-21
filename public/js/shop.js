(() => {
  'use strict';
  const { products, get, pass } = window.SaltShopCatalog;
  const { format } = window.SaltGoldRules;
  const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
  const owned = new Set();
  let counts = {};
  let balance = null;
  let prices = {};
  let dialog, wallet, grid, status, tabs, pending, timer;
  let purchaseDialog, purchaseTitle, purchaseMessage, purchaseDismiss, purchaseConfirm;
  let draft = null;
  let requestSequence = 0;
  let category = 'sign';
  const currentNetwork = () => window.__mp;
  const has = key => owned.has(key);
  const count = key => counts[key] ?? Number(has(key));
  const label = product => tr(product.zh, product.en);
  const price = units => format(units) + tr(' 盐线币', ' Saltline Coin');
  const amountFor = product => prices[product.key] ?? product.price;
  const locked = () => tr('需要月球通行证 · ', 'Lunar Pass required · ') + price(amountFor(get(pass)));
  const reasons = {
    funds: tr('随身盐线币不足。箱内金币可先取到身上。', 'Insufficient carried balance. Withdraw stored coins first.'),
    owned: tr('你已经拥有这件商品。', 'You already own this product.'),
    priceChanged: tr('价格已更新，请确认新价格后再购买。', 'The price changed. Review the new price before buying.'),
    busy: tr('请稍等后再试。', 'Please wait and try again.'),
    storage: tr('购买未能完成，请稍后重试。', 'Purchase could not be completed. Try again later.')
  };

  function make(tag, name, content) {
    const node = document.createElement(tag);
    if (name) node.className = name;
    if (content) node.textContent = content;
    return node;
  }

  function openPurchaseNotice(title, message, quote = null) {
    if (draft?.resolve) draft.resolve(false);
    draft = quote;
    purchaseTitle.textContent = title;
    purchaseMessage.textContent = message;
    purchaseConfirm.hidden = !quote;
    purchaseConfirm.textContent = quote?.resolve ? tr('支付并投放', 'Pay and publish') : tr('确认扣款', 'Confirm purchase');
    purchaseDismiss.textContent = quote ? tr('取消', 'Cancel') : tr('确定', 'OK');
    if (!purchaseDialog.open) purchaseDialog.showModal();
    purchaseDismiss.focus();
  }

  function requestPurchase(product) {
    if (pending || purchaseDialog.open || (product.kind === 'outfit' && has(product.key))) return;
    const amount = amountFor(product);
    openPurchaseNotice(tr('确认购买', 'Confirm purchase'), label(product) + ' · ' + price(amount), { product, amount });
  }

  function sendPurchase() {
    if (draft?.resolve) {
      const { resolve } = draft;
      draft = null;
      purchaseDialog.close();
      resolve(true);
      return;
    }
    if (!draft || pending) return;
    const { product, amount } = draft;
    draft = null;
    purchaseDialog.close();
    if (amount !== amountFor(product)) {
      openPurchaseNotice(tr('价格已更新', 'Price updated'), reasons.priceChanged);
      return;
    }
    const request = ++requestSequence;
    if (!currentNetwork()?.connected || !currentNetwork().send({ type: 'shopBuy', key: product.key, price: amount, request })) {
      openPurchaseNotice(tr('购买未完成', 'Purchase incomplete'), tr('连接战场后可以购买。', 'Connect to multiplayer to purchase.'));
      return;
    }
    pending = { request, product, amount };
    status.textContent = tr('正在确认购买…', 'Confirming purchase…');
    updateWallet();
    timer = setTimeout(() => {
      status.textContent = tr('未收到购买结果，正在同步库存。', 'Purchase status is unconfirmed. Refreshing inventory.');
      currentNetwork()?.send({ type: 'shopList' });
      updateWallet();
      openPurchaseNotice(tr('购买结果待确认', 'Purchase status pending'), status.textContent);
    }, 5000);
  }

  function updateWallet() {
    if (!dialog?.open) return;
    wallet.textContent = balance === null ? '—' : price(balance);
    for (const button of grid.querySelectorAll('button[data-key]')) {
      const product = get(button.dataset.key);
      const oneTime = product.kind === 'outfit';
      const suffix = product.kind === 'sign' ? tr(' / 块', ' / sign') :
        product.kind === 'pass' ? tr(' / 张', ' / ticket') : '';
      button.parentElement.querySelector('strong').textContent = price(amountFor(product)) + suffix;
      button.closest('.shop-card').querySelector('.shop-stock').textContent = oneTime ? '' :
        tr('随身 ', 'Carried: ') + count(product.key);
      button.disabled = !!pending || balance === null || (oneTime && has(product.key));
      button.textContent = oneTime && has(product.key) ? tr('已拥有', 'Owned') :
        oneTime ? tr('购买', 'Buy') : product.kind === 'pass' ? tr('购买一张', 'Buy one ticket') : tr('购买一块', 'Buy one sign');
    }
  }

  function mountAdEditor() {
    const template = document.getElementById('shop-race-ads');
    grid.append(template.content.cloneNode(true));
    window.SaltRaceAdEditor(grid.querySelector('.ads-page'), {
      confirm: (title, message) => new Promise(resolve => openPurchaseNotice(title, message, { resolve })),
      notify: (title, message) => {
        if (dialog.open && category === 'raceAd') openPurchaseNotice(title, message);
      },
      updateBalance: value => {
        balance = value;
        updateWallet();
      }
    });
  }

  function drawProducts() {
    tabs.querySelectorAll('button').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    grid.replaceChildren();
    grid.dataset.category = category;
    if (category === 'raceAd') {
      mountAdEditor();
      updateWallet();
      return;
    }
    for (const product of Object.values(products)) {
      if (product.kind !== category) continue;
      const card = make('article', 'shop-card');
      const art = make('div', 'shop-art');
      if (product.kind === 'sign') {
        const face = document.createElement('canvas');
        face.width = 512; face.height = 170;
        window.SaltRoadSignStyles.draw(face.getContext('2d'), product.id, tr('前方补给站', 'Supply post ahead'));
        art.append(face);
      } else {
        const img = document.createElement('img');
        img.alt = '';
        img.src = product.kind === 'pass' ? '/maps/previews/lunar.webp' : '/shop/' + product.id + '.webp';
        art.append(img);
      }
      const copy = make('div', 'shop-card-copy');
      copy.append(make('h3', '', label(product)));
      if (product.kind === 'pass') copy.append(make('p', '', tr(
        '单次入场。首页直达或经传送门进入月球时扣一张。搭车时每位乘员各扣一张。',
        'One entry via direct deployment or a portal. Each vehicle occupant uses one ticket.'
      )));
      if (product.id === 'lunar-suit') copy.append(make('p', '', tr(
        '购买后在背包的「随身皮肤」中穿戴，可在其他地图使用。',
        'Equip from Carried skins in your backpack to wear it on other maps.'
      )));
      copy.append(make('small', 'shop-stock'));
      const actions = make('div', 'shop-card-actions');
      const action = make('button', 'shop-buy');
      action.type = 'button';
      action.dataset.key = product.key;
      action.setAttribute('aria-label', tr('购买 ', 'Buy ') + label(product));
      action.addEventListener('click', () => requestPurchase(product));
      actions.append(make('strong', '', price(amountFor(product))), action);
      copy.append(actions);
      card.append(art, copy);
      grid.append(card);
    }
    updateWallet();
  }

  function mount() {
    dialog = make('dialog', 'salt-shop');
    dialog.setAttribute('aria-label', tr('盐线补给站', 'Saltline Supply'));
    const header = make('header', 'shop-header');
    const title = make('h2', '', tr('盐线补给站', 'Saltline Supply'));
    const funds = make('div', 'shop-funds');
    wallet = make('strong', '', '—');
    funds.append(make('span', '', tr('随身余额', 'Carried balance')), wallet);
    const close = make('button', 'shop-close', tr('关闭', 'Close'));
    close.type = 'button';
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      if (grid.dataset.category === 'raceAd') grid.replaceChildren();
    });
    header.append(title, funds, close);
    tabs = make('nav', 'shop-tabs');
    tabs.setAttribute('aria-label', tr('商品分类', 'Product categories'));
    for (const [id, name] of [['sign', tr('路牌样式', 'Road Signs')], ['outfit', tr('服装', 'Outfits')], ['pass', tr('月球通行证', 'Lunar Pass')], ['raceAd', tr('赛道箱体广告', 'Track Container Ads')]]) {
      const tab = make('button', '', name);
      tab.type = 'button'; tab.dataset.category = id;
      tab.addEventListener('click', () => { category = id; status.textContent = ''; drawProducts(); });
      tabs.append(tab);
    }
    status = make('p', 'shop-status');
    status.setAttribute('aria-live', 'polite');
    grid = make('div', 'shop-grid');
    dialog.append(header, tabs, status, grid);
    purchaseDialog = make('dialog', 'salt-shop shop-purchase-dialog');
    purchaseDialog.addEventListener('close', () => {
      if (purchaseDialog.open || !draft?.resolve) return;
      const { resolve } = draft;
      draft = null;
      resolve(false);
    });
    purchaseDialog.setAttribute('aria-labelledby', 'shop-purchase-title');
    purchaseDialog.setAttribute('aria-describedby', 'shop-purchase-message');
    purchaseTitle = make('h2', '');
    purchaseTitle.id = 'shop-purchase-title';
    purchaseMessage = make('p', '');
    purchaseMessage.id = 'shop-purchase-message';
    const purchaseActions = make('div', 'shop-purchase-actions');
    purchaseDismiss = make('button', '');
    purchaseDismiss.type = 'button';
    purchaseDismiss.addEventListener('click', () => purchaseDialog.close());
    purchaseConfirm = make('button', 'shop-buy', tr('确认扣款', 'Confirm purchase'));
    purchaseConfirm.type = 'button';
    purchaseConfirm.addEventListener('click', sendPurchase);
    purchaseActions.append(purchaseDismiss, purchaseConfirm);
    purchaseDialog.append(purchaseTitle, purchaseMessage, purchaseActions);
    document.body.append(dialog, purchaseDialog);
  }

  function open(tab = 'sign') {
    if (!dialog) mount();
    category = tab;
    status.textContent = currentNetwork()?.connected ? '' : tr('连接战场后可以购买。', 'Connect to multiplayer to purchase.');
    if (!dialog.open) dialog.showModal();
    drawProducts();
    currentNetwork()?.send({ type: 'shopList' });
  }

  function addEntry(host) {
    if (!host || host.querySelector('.shop-entry')) return;
    const label = window.__SALT_I18N__?.messages?.ui?.shop || tr('商城', 'Shop');
    const button = make('button', 'btn shop-entry', label);
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => open());
    const home = host.querySelector('.battle-return-home');
    if (home) host.insertBefore(button, home);
    else host.append(button);
  }

  function receive(message) {
    if (message.type === 'shopState') {
      owned.clear();
      for (const key of message.owned || []) if (get(key)) owned.add(key);
      counts = message.counts || {};
      balance = message.balance;
      prices = message.prices || {};
      window.dispatchEvent(new Event('saltline:shop'));
    } else if (message.type === 'shopPrices') prices = message.prices || {};
    else if (message.type === 'goldList') balance = message.carried;
    else if (message.type === 'shopResult' && pending?.request === message.request && pending?.product.key === message.key) {
      clearTimeout(timer);
      const { product, amount } = pending;
      pending = null;
      status.textContent = '';
      if (message.reason) {
        openPurchaseNotice(tr('购买未完成', 'Purchase incomplete'), reasons[message.reason] || reasons.storage);
      } else {
        const hint = product.kind === 'outfit' ? tr('已放入背包的「随身皮肤」。', 'Added to Carried skins in your backpack.') : '';
        openPurchaseNotice(tr('购买成功', 'Purchase complete'), label(product) + ' · ' +
          tr('已扣除 ', 'Paid ') + price(amount) + (hint ? tr('。', '. ') + hint : ''));
      }
    } else return;
    updateWallet();
  }

  function disconnect() {
    owned.clear();
    counts = {};
    balance = null;
    prices = {};
    if (pending) {
      status.textContent = '';
      openPurchaseNotice(tr('购买结果待确认', 'Purchase status pending'),
        tr('连接中断，重新连接后可查看库存和余额。', 'Connection lost. Reconnect to check your inventory and balance.'));
    } else if (purchaseDialog?.open && draft && !draft.resolve) purchaseDialog.close();
    if (!draft?.resolve) draft = null;
    pending = null;
    clearTimeout(timer);
    window.dispatchEvent(new Event('saltline:shop'));
    updateWallet();
  }
  window.SaltShop = { open, addEntry, receive, disconnect, has, count, locked, pass, get, label,
    cosmetics: () => [...owned].filter(key => get(key).kind !== 'pass') };
})();
