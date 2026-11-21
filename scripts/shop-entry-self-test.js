'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch (error) {
  puppeteer = require('puppeteer');
}

const base = process.env.TEST_BASE || 'http://127.0.0.1:3000';
const screens = ['title', 'paused', 'dead', 'complete'];
const tmpDir = path.join(__dirname, '..', '.jicreate-tmp');

(async () => {
  fs.mkdirSync(tmpDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/chromium',
    userDataDir: path.join(tmpDir, 'chrome-shop-entry-profile'),
    env: { ...process.env, TMPDIR: tmpDir },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ]
  });
  try {
    for (const [lang, expected] of [['zh-CN', '商城'], ['en-US', 'Shop']]) {
      const page = await browser.newPage();
      await page.goto(base + '/?lang=' + lang + '&noaudio=1&q=low', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForFunction(
        () => window.SaltShop && window.SaltMapSelect && window.__SALT_I18N__,
        { timeout: 30000 }
      );
      const rows = await page.evaluate((names) => {
        const menu = document.createElement('div');
        menu.className = 'menu';
        menu.dataset.screen = 'none';
        menu.innerHTML = names.map((screen) => `
          <section class="m-screen" data-s="${screen}">
            <div class="m-actions">
              <button class="btn primary" type="button">primary</button>
              ${screen === 'paused' ? '<a class="btn battle-return-home" href="/">home</a>' : ''}
            </div>
          </section>
        `).join('');
        document.getElementById('app').append(menu);
        window.SaltMapSelect.mount();
        return [...menu.querySelectorAll('.m-screen')].map((section) => {
          const entry = section.querySelector('.m-actions .shop-entry');
          const home = section.querySelector('.battle-return-home');
          return {
            screen: section.dataset.s,
            count: section.querySelectorAll('.m-actions .shop-entry').length,
            label: entry && entry.textContent.trim(),
            beforeHome: !home || (!!entry && entry.nextElementSibling === home),
            popup: entry && entry.getAttribute('aria-haspopup')
          };
        });
      }, screens);

      assert.deepEqual(rows.map((row) => row.screen), screens);
      for (const row of rows) {
        assert.equal(row.count, 1, JSON.stringify(rows));
        assert.equal(row.label, expected, JSON.stringify(rows));
        assert.equal(row.beforeHome, true, JSON.stringify(rows));
        assert.equal(row.popup, 'dialog', JSON.stringify(rows));
      }

      await page.evaluate(() => {
        document.querySelector('.menu .m-screen[data-s="paused"] .shop-entry').click();
      });
      assert.equal(await page.$eval('dialog.salt-shop', (dialog) => dialog.open), true);
      console.log('商城入口 ' + lang + ': ' + rows.map((row) => row.screen).join(', '));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
