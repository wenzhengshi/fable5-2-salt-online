(() => {
  'use strict';

  if (window.SaltModal) return;

  const config = window.__SALT_I18N__ || {};
  const messages = config.messages || {};
  const TONES = ['info', 'warning', 'danger'];
  const ICONS = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 7.6h.01"></path></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.8 19.2h18.4Z"></path><path d="M12 9v4.6"></path><path d="M12 17.2h.01"></path></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2Z"></path><path d="M12 8v5"></path><path d="M12 16.4h.01"></path></svg>'
  };
  const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>';

  let root = null;
  let refs = null;
  let active = null;
  let lastFocus = null;
  let hideTimer = 0;

  function lookup(key) {
    return String(key || '').split('.').reduce((acc, part) => (
      acc && typeof acc === 'object' ? acc[part] : undefined
    ), messages);
  }

  function t(key) {
    const value = lookup(key);
    return typeof value === 'string' ? value : '';
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (err) {
      return false;
    }
  }

  function focusableNodes() {
    if (!refs) return [];
    return Array.from(refs.dialog.querySelectorAll('button:not([disabled])')).filter((node) => (
      !node.hidden && node.offsetParent !== null
    ));
  }

  function focusInitial(preferred) {
    const nodes = focusableNodes();
    if (!nodes.length) {
      try { refs.dialog.focus({ preventScroll: true }); } catch (err) { refs.dialog.focus(); }
      return;
    }
    const target = preferred === 'confirm' ? refs.confirm : (refs.cancel.hidden ? refs.confirm : refs.cancel);
    const node = nodes.includes(target) ? target : nodes[0];
    try { node.focus({ preventScroll: true }); } catch (err) { node.focus(); }
  }

  function releaseFocus() {
    const node = lastFocus;
    lastFocus = null;
    if (!node || !node.isConnected || typeof node.focus !== 'function') return;
    try { node.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
  }

  function create() {
    if (root && document.body.contains(root)) return { root, refs };

    root = document.createElement('div');
    root.id = 'salt-modal';
    root.className = 'salt-modal';
    root.hidden = true;
    root.dataset.tone = 'info';
    root.dataset.single = '0';
    root.innerHTML = [
      '<div class="salt-modal__backdrop" data-modal-dismiss></div>',
      '<section class="salt-modal__dialog" role="alertdialog" aria-modal="true" aria-labelledby="salt-modal-title" aria-describedby="salt-modal-message" tabindex="-1">',
      '  <span class="salt-modal__handle" aria-hidden="true"></span>',
      '  <header class="salt-modal__head">',
      '    <span class="salt-modal__badge" aria-hidden="true"></span>',
      '    <span class="salt-modal__kicker"></span>',
      '    <button class="salt-modal__close" type="button" data-modal-dismiss></button>',
      '  </header>',
      '  <h2 class="salt-modal__title" id="salt-modal-title"></h2>',
      '  <p class="salt-modal__message" id="salt-modal-message"></p>',
      '  <footer class="salt-modal__actions">',
      '    <button class="salt-modal__btn salt-modal__btn--ghost" type="button" data-modal-cancel></button>',
      '    <button class="salt-modal__btn salt-modal__btn--primary" type="button" data-modal-confirm></button>',
      '  </footer>',
      '</section>'
    ].join('');

    refs = {
      backdrop: root.querySelector('.salt-modal__backdrop'),
      dialog: root.querySelector('.salt-modal__dialog'),
      badge: root.querySelector('.salt-modal__badge'),
      kicker: root.querySelector('.salt-modal__kicker'),
      close: root.querySelector('.salt-modal__close'),
      title: root.querySelector('.salt-modal__title'),
      message: root.querySelector('.salt-modal__message'),
      cancel: root.querySelector('[data-modal-cancel]'),
      confirm: root.querySelector('[data-modal-confirm]')
    };

    refs.close.innerHTML = CLOSE_ICON;
    refs.close.setAttribute('aria-label', t('modal.close'));

    refs.cancel.addEventListener('click', () => settle(false));
    refs.confirm.addEventListener('click', () => settle(true));
    refs.backdrop.addEventListener('click', () => {
      if (active && active.dismissible) settle(false);
    });
    refs.close.addEventListener('click', () => {
      if (active && active.dismissible) settle(false);
    });
    document.body.appendChild(root);
    return { root, refs };
  }

  function onKeyDown(event) {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (active.dismissible) settle(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = focusableNodes();
    if (!nodes.length) {
      event.preventDefault();
      return;
    }
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

  function settle(result) {
    if (!active) return false;
    const current = active;
    active = null;
    current.resolve(Boolean(result));
    if (!root) return true;
    window.clearTimeout(hideTimer);
    root.classList.remove('is-open');
    const delay = prefersReducedMotion() ? 0 : 180;
    hideTimer = window.setTimeout(() => {
      if (active || !root) return;
      root.hidden = true;
      document.body.classList.remove('salt-modal-open');
      releaseFocus();
    }, delay);
    return true;
  }

  function show(input) {
    const options = typeof input === 'string' ? { message: input } : (input || {});
    const ui = create();

    if (active) {
      const previous = active;
      active = null;
      previous.resolve(false);
    }
    window.clearTimeout(hideTimer);

    const tone = TONES.indexOf(options.tone) >= 0 ? options.tone : 'info';
    const dismissible = options.dismissible !== false;
    const cancelText = Object.prototype.hasOwnProperty.call(options, 'cancelText')
      ? String(options.cancelText || '')
      : t('modal.cancel');
    const confirmText = options.confirmText == null ? t('modal.confirm') : String(options.confirmText);
    const title = options.title == null ? t('modal.notice') : String(options.title);
    const kicker = options.kicker == null ? t('modal.kicker') : String(options.kicker);
    const message = options.message == null ? '' : String(options.message);

    root.dataset.tone = tone;
    root.dataset.single = cancelText ? '0' : '1';
    refs.badge.innerHTML = ICONS[tone];
    refs.kicker.textContent = kicker;
    refs.kicker.hidden = !kicker;
    refs.close.hidden = !dismissible;
    refs.title.textContent = title;
    refs.title.hidden = !title;
    refs.message.textContent = message;
    refs.message.hidden = !message;
    if (title) {
      refs.dialog.setAttribute('aria-labelledby', 'salt-modal-title');
      refs.dialog.removeAttribute('aria-label');
    } else {
      refs.dialog.removeAttribute('aria-labelledby');
      refs.dialog.setAttribute('aria-label', t('modal.notice'));
    }
    if (message) refs.dialog.setAttribute('aria-describedby', 'salt-modal-message');
    else refs.dialog.removeAttribute('aria-describedby');
    refs.cancel.textContent = cancelText;
    refs.cancel.hidden = !cancelText;
    refs.confirm.textContent = confirmText;

    if (document.activeElement && document.activeElement !== document.body) {
      lastFocus = document.activeElement;
    }
    if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try { document.exitPointerLock(); } catch (err) { /* ignore */ }
    }

    document.body.classList.add('salt-modal-open');
    root.hidden = false;
    void root.offsetWidth;
    root.classList.add('is-open');
    focusInitial(options.focus);

    return new Promise((resolve) => {
      active = { resolve, dismissible };
    });
  }

  function confirm(input) {
    return show(input);
  }

  function alert(input) {
    const options = typeof input === 'string' ? { message: input } : Object.assign({}, input || {});
    options.cancelText = '';
    options.focus = 'confirm';
    return show(options).then(() => undefined);
  }

  function close() {
    return settle(false);
  }

  document.addEventListener('keydown', (event) => {
    if (!active) return;
    event.stopPropagation();
    if (event.key === 'Escape' || event.key === 'Tab') onKeyDown(event);
  }, true);

  window.SaltModal = {
    confirm,
    alert,
    close,
    get isOpen() { return !!active; }
  };
})();
