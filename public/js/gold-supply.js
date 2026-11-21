(() => {
  'use strict';

  const strings = window.__SALT_I18N__.messages.goldSupply;
  const locale = document.documentElement.lang;
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  const coins = amount => strings.coins.replace('{amount}', format.format(amount / 1000000));
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Asia/Shanghai' });
  let dialog;
  let request;

  function mount() {
    dialog = document.createElement('dialog');
    dialog.className = 'gold-supply-dialog';
    dialog.setAttribute('aria-labelledby', 'gold-supply-title');
    dialog.innerHTML = '<header><h2 id="gold-supply-title"></h2><form method="dialog"><button type="submit"></button></form></header>' +
      '<p role="status"></p><dl hidden></dl><small></small>';
    dialog.querySelector('h2').textContent = strings.title;
    dialog.querySelector('button').textContent = strings.close;
    dialog.addEventListener('close', () => request?.abort());
    document.body.appendChild(dialog);
  }

  async function open() {
    if (!dialog) mount();
    if (dialog.open) return;
    const status = dialog.querySelector('[role="status"]');
    const list = dialog.querySelector('dl');
    const note = dialog.querySelector('small');
    status.textContent = strings.loading;
    status.hidden = false;
    list.hidden = true;
    note.textContent = '';
    dialog.showModal();

    const controller = new AbortController();
    request = controller;
    try {
      const result = await fetch('/api/game/gold/supply', { signal: controller.signal, cache: 'no-store' });
      if (!result.ok) throw new Error(result.status);
      const data = await result.json();
      if (controller.signal.aborted) return;
      const rows = [
        [strings.totalIssued, strings.atLeast.replace('{amount}', coins(data.totalIssuedMinimum))],
        [strings.issuanceLimit, data.issuanceLimit === null ? strings.unlimited : coins(data.issuanceLimit)],
        [strings.historical, coins(data.historicalMinimum)],
        [strings.newIssued, coins(data.issued)],
        [strings.carryToday, coins(data.carry.unissued + data.carry.recycled)],
        [strings.waiting, coins(data.recycledWaiting)]
      ];
      list.replaceChildren(...rows.map(([label, value]) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const detail = document.createElement('dd');
        term.textContent = label;
        detail.textContent = value;
        row.append(term, detail);
        return row;
      }));
      note.textContent = data.startedAt ? strings.note.replace('{date}', date.format(data.startedAt)) : strings.pending;
      list.hidden = false;
      status.hidden = true;
    } catch {
      if (!controller.signal.aborted) status.textContent = strings.failed;
    }
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-gold-supply]')) return;
    event.preventDefault();
    open();
  });
})();
