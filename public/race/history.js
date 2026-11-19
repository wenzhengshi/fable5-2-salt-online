(() => {
  'use strict';

  if (window.SaltRaceHistory) return;

  const config = window.__SALT_I18N__ || {};
  const messages = config.messages || {};
  const lang = config.lang === 'en-US' ? 'en-US' : 'zh-CN';
  const t = (key, values) => {
    const value = String(key || '').split('.').reduce(
      (entry, part) => entry && typeof entry === 'object' ? entry[part] : undefined,
      messages
    );
    return typeof value === 'string'
      ? value.replace(/\{(\w+)\}/g, (match, name) => (
        values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
      ))
      : key;
  };
  const coins = value => ((Number(value) || 0) / 1e6).toFixed(6).replace(/\.?0+$/, '');
  const time = ms => t('raceResult.seconds', { n: ((Number(ms) || 0) / 1000).toFixed(3) });

  let root = null;
  let refs = null;
  let lastFocus = null;
  let busy = false;
  let loaded = false;

  function markup() {
    return [
      '<section class="race-history__dialog" role="dialog" aria-modal="true" aria-labelledby="salt-race-history-title" aria-describedby="salt-race-history-summary">',
      '  <header class="race-history__header">',
      `    <div><small>${t('raceHistory.kicker')}</small><h2 id="salt-race-history-title">${t('raceHistory.title')}</h2></div>`,
      `    <button class="race-history__close" type="button" aria-label="${t('raceHistory.close')}">×</button>`,
      '  </header>',
      `  <p class="race-history__summary" id="salt-race-history-summary">${t('raceHistory.loading')}</p>`,
      '  <div class="race-history__content">',
      '    <section class="race-history__section">',
      `      <h3>${t('raceHistory.topTitle')}</h3>`,
      '      <div class="race-history__scroll"><table><thead><tr>',
      `        <th>${t('raceHistory.rank')}</th><th>${t('raceHistory.id')}</th><th>${t('raceHistory.best')}</th>`,
      `        <th>${t('raceHistory.wins')}</th><th>${t('raceHistory.prize')}</th>`,
      '      </tr></thead><tbody class="race-history__top-body"></tbody></table></div>',
      '    </section>',
      '    <section class="race-history__section">',
      `      <h3>${t('raceHistory.playersTitle')}</h3>`,
      '      <div class="race-history__scroll"><table><thead><tr>',
      `        <th>${t('raceHistory.id')}</th><th>${t('raceHistory.races')}</th><th>${t('raceHistory.best')}</th>`,
      `        <th>${t('raceHistory.prize')}</th><th>${t('raceHistory.last')}</th>`,
      '      </tr></thead><tbody class="race-history__list-body"></tbody></table></div>',
      '    </section>',
      '  </div>',
      '  <p class="race-history__error" role="alert" hidden></p>',
      '  <footer class="race-history__footer">',
      `    <button class="race-history__refresh" type="button">${t('raceHistory.refresh')}</button>`,
      `    <button class="race-history__done" type="button">${t('raceHistory.done')}</button>`,
      '  </footer>',
      '</section>'
    ].join('');
  }

  function mount() {
    if (root && document.body.contains(root)) return;
    root = document.createElement('div');
    root.id = 'salt-race-history';
    root.className = 'race-history race-history--global';
    root.hidden = true;
    root.innerHTML = markup();
    document.body.append(root);
    refs = {
      summary: root.querySelector('.race-history__summary'),
      topBody: root.querySelector('.race-history__top-body'),
      listBody: root.querySelector('.race-history__list-body'),
      error: root.querySelector('.race-history__error'),
      refresh: root.querySelector('.race-history__refresh'),
      done: root.querySelector('.race-history__done'),
      close: root.querySelector('.race-history__close')
    };
    refs.close.addEventListener('click', close);
    refs.done.addEventListener('click', close);
    refs.refresh.addEventListener('click', () => load(true));
    root.addEventListener('click', event => { if (event.target === root) close(); });
    document.addEventListener('keydown', event => {
      if (!root || root.hidden || event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }, true);
  }

  function cell(row, text, className) {
    const node = document.createElement('td');
    if (className) node.className = className;
    node.textContent = text;
    row.append(node);
  }

  function date(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat(lang, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
    } catch (error) {
      return '—';
    }
  }

  function emptyRow(body) {
    const row = document.createElement('tr');
    const node = document.createElement('td');
    node.colSpan = 5;
    node.className = 'race-history__empty';
    node.textContent = t('raceHistory.empty');
    row.append(node);
    body.replaceChildren(row);
  }

  function render(data) {
    const totals = data.totals || {};
    refs.summary.textContent = t('raceHistory.summary', {
      races: Number(totals.races) || 0,
      players: Number(totals.participants) || 0,
      prizes: coins(totals.prizes),
      bossSpawns: Number(totals.bossSpawns) || 0,
      bossRewards: coins(totals.bossRewards)
    });
    const top5 = Array.isArray(data.top5) ? data.top5 : [];
    const participants = Array.isArray(data.participants) ? data.participants : [];
    if (!top5.length) emptyRow(refs.topBody);
    else {
      const rows = top5.map(item => {
        const row = document.createElement('tr');
        if (item.id === data.you) row.className = 'is-you';
        cell(row, String(item.rank), 'race-history__rank');
        cell(row, (item.name || item.id) + (item.id === data.you ? t('raceResult.you') : ''));
        cell(row, time(item.bestMs));
        cell(row, String(Number(item.wins) || 0));
        cell(row, t('raceHistory.coins', { amount: coins(item.winnings) }));
        return row;
      });
      refs.topBody.replaceChildren(...rows);
    }
    if (!participants.length) emptyRow(refs.listBody);
    else {
      const rows = participants.map(item => {
        const row = document.createElement('tr');
        if (item.id === data.you) row.className = 'is-you';
        cell(row, (item.name || item.id) + (item.id === data.you ? t('raceResult.you') : ''));
        cell(row, String(Number(item.races) || 0));
        cell(row, item.bestMs ? time(item.bestMs) : '—');
        cell(row, t('raceHistory.coins', { amount: coins(item.winnings) }));
        cell(row, date(item.lastAt));
        return row;
      });
      refs.listBody.replaceChildren(...rows);
    }
  }

  async function load(force) {
    if (busy || (!force && loaded)) return;
    busy = true;
    const refreshLabel = refs.refresh.textContent;
    refs.refresh.disabled = true;
    refs.refresh.textContent = t('raceHistory.loading');
    refs.summary.textContent = t('raceHistory.loading');
    refs.error.hidden = true;
    try {
      const response = await fetch('/api/race/history', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(t('raceHistory.errors.load'));
      render(data);
      loaded = true;
    } catch (error) {
      refs.error.textContent = error.message || t('raceHistory.errors.load');
      refs.error.hidden = false;
    } finally {
      refs.refresh.disabled = false;
      refs.refresh.textContent = refreshLabel;
      busy = false;
    }
  }

  function open() {
    mount();
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('race-history-open');
    refs.close.focus();
    load(false);
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('race-history-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  window.SaltRaceHistory = { open, close, get isOpen() { return !!root && !root.hidden; } };
})();
