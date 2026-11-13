(() => {
  'use strict';

  const config = window.__SALT_I18N__ || {};
  const messages = config.messages || {};
  const copy = messages.community || {};
  const QR_SRC = '/img/saltline-wechat-group.svg';
  const QR_FILE = 'saltline-wechat-group.svg';

  const t = (key) => (typeof copy[key] === 'string' ? copy[key] : key);
  const QR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h3v3h-3v-3Zm5 0h3v3h-3v-3Zm-5 5h3v3h-3v-3Zm5 0h3v3h-3v-3Z"/></svg>';
  const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"/></svg>';

  let modal = null;
  let dialog = null;
  let closeButton = null;
  let lastFocus = null;
  let closeTimer = 0;
  let scanTimer = 0;

  function createLaunch(variant) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'community-launch community-launch--' + variant;
    button.setAttribute('data-community-open', '');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'community-modal');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', t('launchHint'));
    button.title = t('launchHint');

    const thumb = document.createElement('span');
    thumb.className = 'community-launch-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.src = QR_SRC;
    image.alt = '';
    image.width = 52;
    image.height = 52;
    image.draggable = false;
    thumb.appendChild(image);

    const body = document.createElement('span');
    body.className = 'community-launch-copy';
    const label = document.createElement('b');
    label.textContent = t('launch');
    const sub = document.createElement('em');
    sub.textContent = t('launchSub');
    body.append(label, sub);

    const arrow = document.createElement('span');
    arrow.className = 'community-launch-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';

    button.append(thumb, body, arrow);
    return button;
  }

  function buildModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'community-modal';
    modal.className = 'community-modal';
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="community-backdrop" data-community-close></div>',
      '<div class="community-dialog" role="dialog" aria-modal="true" aria-labelledby="community-title" aria-describedby="community-desc" tabindex="-1">',
      '  <button class="community-close" type="button" data-community-close></button>',
      '  <header class="community-head">',
      '    <p class="community-kicker"></p>',
      '    <h2 id="community-title"></h2>',
      '    <p class="community-desc" id="community-desc"></p>',
      '  </header>',
      '  <div class="community-grid">',
      '    <figure class="community-qr-card">',
      '      <div class="community-qr-frame"><img alt="" width="640" height="640" draggable="false" /></div>',
      '      <figcaption><strong></strong><span></span></figcaption>',
      '    </figure>',
      '    <div class="community-info">',
      '      <ul class="community-chips">',
      '        <li></li><li></li><li></li>',
      '      </ul>',
      '      <p class="community-validity"></p>',
      '      <div class="community-actions">',
      '        <a class="community-save" download="' + QR_FILE + '"></a>',
      '      </div>',
      '      <p class="community-save-hint"></p>',
      '      <p class="community-expired"></p>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);

    dialog = modal.querySelector('.community-dialog');
    closeButton = modal.querySelector('.community-close');
    closeButton.innerHTML = CLOSE_ICON;
    closeButton.setAttribute('aria-label', t('close'));
    closeButton.title = t('close');

    modal.querySelector('.community-kicker').textContent = t('kicker');
    modal.querySelector('#community-title').textContent = t('title');
    modal.querySelector('#community-desc').textContent = t('desc');

    const image = modal.querySelector('.community-qr-frame img');
    image.src = QR_SRC;
    image.alt = t('qrAlt');

    modal.querySelector('.community-qr-card figcaption strong').textContent = t('groupName');
    modal.querySelector('.community-qr-card figcaption span').textContent = t('scan');

    const chips = modal.querySelectorAll('.community-chips li');
    ['chipScan', 'chipValid', 'chipTalk'].forEach((key, index) => {
      if (chips[index]) chips[index].textContent = t(key);
    });

    modal.querySelector('.community-validity').textContent = t('validity');
    const save = modal.querySelector('.community-save');
    save.href = QR_SRC;
    save.setAttribute('download', QR_FILE);
    save.innerHTML = QR_ICON + '<span></span>';
    save.querySelector('span').textContent = t('save');
    modal.querySelector('.community-save-hint').textContent = t('saveHint');
    modal.querySelector('.community-expired').textContent = t('expiredHint');
  }

  function setExpanded(value) {
    document.querySelectorAll('[data-community-open]').forEach((button) => {
      button.setAttribute('aria-expanded', value ? 'true' : 'false');
    });
  }

  function openModal(trigger) {
    buildModal();
    window.clearTimeout(closeTimer);
    lastFocus = trigger || document.activeElement;
    modal.hidden = false;
    // Force a style flush so the entrance transition always runs, even when
    // requestAnimationFrame is throttled by a background tab.
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.classList.add('community-locked');
    setExpanded(true);
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (err) { /* ignore */ }
    }
    window.setTimeout(() => {
      if (closeButton && modal.classList.contains('open')) closeButton.focus({ preventScroll: true });
    }, 60);
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('open');
    setExpanded(false);
    document.body.classList.remove('community-locked');
    closeTimer = window.setTimeout(() => {
      if (!modal.classList.contains('open')) modal.hidden = true;
    }, 220);
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
    }
  }

  function trapKeys(event) {
    if (!modal || modal.hidden || !modal.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
      return;
    }
    if (event.key !== 'Tab' || !dialog) return;
    const nodes = Array.from(dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((node) => node.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function mountFor(variant) {
    const host = variant === 'title'
      ? document.querySelector('.m-screen[data-s="title"] .m-title-main')
      : variant === 'select'
        ? document.querySelector('#soldier-select .ss-top')
        : document.querySelector('.m-screen[data-s="paused"]');
    if (!host || host.querySelector('[data-community-entry="' + variant + '"]')) return;

    const mount = document.createElement('div');
    mount.className = 'community-mount community-mount--' + variant;
    mount.setAttribute('data-community-entry', variant);
    mount.appendChild(createLaunch(variant));

    if (variant === 'select') {
      const index = host.querySelector('.ss-index');
      if (index) index.insertAdjacentElement('beforebegin', mount);
      else host.appendChild(mount);
      return;
    }

    if (variant === 'title') {
      const repo = host.querySelector('[data-mp-repo="title"]');
      const note = host.querySelector('.m-note');
      if (repo) repo.insertAdjacentElement('afterend', mount);
      else if (note) note.insertAdjacentElement('afterend', mount);
      else host.appendChild(mount);
      return;
    }

    const repo = host.querySelector('[data-mp-repo="paused"]');
    const actions = host.querySelector('.m-actions');
    if (repo) repo.insertAdjacentElement('afterend', mount);
    else if (actions) actions.insertAdjacentElement('afterend', mount);
    else host.appendChild(mount);
  }

  function scanMenus() {
    mountFor('select');
    mountFor('title');
    mountFor('paused');
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = window.setTimeout(() => {
      scanTimer = 0;
      scanMenus();
    }, 120);
  }

  function init() {
    buildModal();
    scanMenus();

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest && event.target.closest('[data-community-open]');
      if (trigger) {
        event.preventDefault();
        openModal(trigger);
        return;
      }
      const closer = event.target.closest && event.target.closest('[data-community-close]');
      if (closer) {
        event.preventDefault();
        closeModal();
      }
    });

    document.addEventListener('keydown', trapKeys, true);

    const app = document.getElementById('app');
    if (app && window.MutationObserver) {
      new MutationObserver(scheduleScan).observe(app, { childList: true, subtree: true });
    }

    [600, 1600, 3200].forEach((delay) => window.setTimeout(scanMenus, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
