(() => {
  const config = window.__SALT_I18N__ || {};
  const currentLang = config.lang === 'en-US' ? 'en-US' : 'zh-CN';
  const messages = config.messages || {};
  const gameText = messages.gameText || {};
  const gamePatterns = messages.gamePatterns || {};
  document.documentElement.style.setProperty(
    '--h-ammo-infinite-label',
    JSON.stringify(gameText['无限'] || '无限')
  );
  const toastEl = document.getElementById('app-toast');
  const langSwitch = document.querySelector('.lang-switch');
  let toastTimer = 0;

  function t(key, fallback) {
    const value = String(key || '').split('.').reduce(
      (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
      messages
    );
    return typeof value === 'string' ? value : (fallback || key);
  }

  function showToast(text, kind, duration) {
    if (!toastEl || !text) return;
    window.clearTimeout(toastTimer);
    toastEl.textContent = text;
    toastEl.dataset.kind = kind || 'info';
    toastEl.hidden = false;
    toastTimer = window.setTimeout(() => {
      toastEl.hidden = true;
    }, duration || 2600);
  }

  async function switchLang(lang, button) {
    if (lang === currentLang || !button) {
      return;
    }

    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
    showToast(t('ui.switching'), 'info', 5000);

    try {
      const response = await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: lang })
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      window.location.reload();
    } catch (error) {
      button.removeAttribute('aria-busy');
      button.disabled = false;
      showToast(t('ui.switchFailed'), 'error', 3600);
    }
  }

  if (langSwitch) {
    langSwitch.addEventListener('click', (event) => {
      const button = event.target && event.target.closest
        ? event.target.closest('button[data-lang]')
        : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      switchLang(button.dataset.lang, button);
    }, true);
  }

  document.addEventListener('pointerlockchange', () => {
    document.body.classList.toggle('is-playing', !!document.pointerLockElement);
  });

  if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
    document.body.classList.add('is-touch');
  }

  if (currentLang !== 'en-US') {
    return;
  }

  function interpolate(template, values) {
    return String(template || '').replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
    ));
  }

  function translateToken(value) {
    const trimmed = String(value || '').trim();
    return gameText[trimmed] || trimmed;
  }

  function translatePattern(value) {
    let match = value.match(/^切断剩余\s*(\d+)\s*处中继器$/);
    if (match) return interpolate(gamePatterns.cutRemaining, { n: match[1] });

    match = value.match(/^接触敌人\s*[—–-]\s*(\d+)$/);
    if (match) return interpolate(gamePatterns.contact, { n: match[1] });

    match = value.match(/^接触敌人\s*[—–-]\s*$/);
    if (match) return gamePatterns.contactBare;

    match = value.match(/^已切断中继\s*(\d+)\/(\d+)$/);
    if (match) return interpolate(gamePatterns.relaysCut, { cut: match[1], total: match[2] });

    match = value.match(/^按住\s*(.+?)\s*[—–-]\s*(.+)$/);
    if (match) return interpolate(gamePatterns.hold, { key: translateToken(match[1]), action: translateToken(match[2]) });

    match = value.match(/^已为此设备自动选择画质（(.+?)）。如果帧率不足，请调低画质。$/);
    if (match) {
      return interpolate(gamePatterns.autoQuality, { quality: translateToken(match[1]) });
    }

    match = value.match(/^(\d+)\s*处中继器$/);
    if (match) return interpolate(gamePatterns.relayCount, { n: match[1] });

    match = value.match(/^(.+?) 呼叫撤离船集合 · 请尽快上船$/);
    if (match) return interpolate(gamePatterns.boatInviteToast, { name: match[1] });

    match = value.match(/^(.+?) 呼叫集合 · 撤离船 (\d+) 米 · (.+)$/);
    if (match) {
      return interpolate(gamePatterns.boatInviteBanner, {
        name: match[1],
        n: match[2],
        direction: translateToken(match[3])
      });
    }

    match = value.match(/^E · 登船 · (\d+) \/ (\d+)$/);
    if (match) {
      return interpolate(gamePatterns.boatBoardPrompt, {
        occupied: match[1],
        capacity: match[2]
      });
    }

    match = value.match(/^撤离船 · 座位 (\d+) · (\d+) \/ (\d+)$/);
    if (match) {
      return interpolate(gamePatterns.boatSeatsAboard, {
        seat: match[1],
        occupied: match[2],
        capacity: match[3]
      });
    }

    match = value.match(/^撤离船 · (\d+) \/ (\d+) 人$/);
    if (match) {
      return interpolate(gamePatterns.boatSeatsIdle, {
        occupied: match[1],
        capacity: match[2]
      });
    }

    match = value.match(/^已登船 · 座位 (\d+)$/);
    if (match) return interpolate(gamePatterns.boatBoarded, { seat: match[1] });

    return null;
  }

  function translateValue(value) {
    const trimmed = value.trim();
    if (!trimmed || !/[\u4e00-\u9fff]/.test(trimmed)) return value;
    const translated = gameText[trimmed] || translatePattern(trimmed);
    if (!translated || translated === trimmed) return value;
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    return leading + translated + trailing;
  }

  function installBootMessageTranslator() {
    const bootMessage = document.getElementById('boot-msg');
    const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (!bootMessage || !descriptor || !descriptor.get || !descriptor.set) return;
    Object.defineProperty(bootMessage, 'textContent', {
      configurable: true,
      enumerable: true,
      get() {
        return descriptor.get.call(bootMessage);
      },
      set(value) {
        descriptor.set.call(bootMessage, translateValue(String(value)));
      }
    });
    descriptor.set.call(bootMessage, translateValue(descriptor.get.call(bootMessage)));
  }

  installBootMessageTranslator();

  const textNodeFilter = {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return /[\u4e00-\u9fff]/.test(node.nodeValue || '')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  };

  function translateTree(root) {
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, textNodeFilter);
    const textNodes = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }
    for (const textNode of textNodes) {
      const next = translateValue(textNode.nodeValue);
      if (next !== textNode.nodeValue) textNode.nodeValue = next;
    }

    const elements = root.querySelectorAll ? root.querySelectorAll('[aria-label], [title], [placeholder]') : [];
    for (const element of elements) {
      for (const attr of ['aria-label', 'title', 'placeholder']) {
        const value = element.getAttribute(attr);
        if (!value) continue;
        const next = translateValue(value);
        if (next !== value) element.setAttribute(attr, next);
      }
    }
  }

  const app = document.getElementById('app');
  const boot = document.getElementById('boot');
  let pending = 0;

  function translateAll() {
    pending = 0;
    translateTree(app);
    translateTree(boot);
  }

  function scheduleTranslate() {
    if (pending) return;
    pending = window.setTimeout(translateAll, 120);
  }

  function mutationHasCjk(mutation) {
    if (mutation.type === 'characterData') {
      return /[\u4e00-\u9fff]/.test(mutation.target.nodeValue || '');
    }
    if (mutation.type === 'attributes') {
      const value = mutation.target.getAttribute(mutation.attributeName) || '';
      return /[\u4e00-\u9fff]/.test(value);
    }
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) {
        const value = node.nodeType === Node.TEXT_NODE ? node.nodeValue : node.textContent;
        if (/[\u4e00-\u9fff]/.test(value || '')) return true;
      }
    }
    return false;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutationHasCjk(mutation)) {
        scheduleTranslate();
        return;
      }
    }
  });

  if (app) {
    observer.observe(app, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder']
    });
  }

  translateAll();
  scheduleTranslate();
  window.addEventListener('pageshow', translateAll);
})();
