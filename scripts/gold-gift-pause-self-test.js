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
const tmpDir = path.join(__dirname, '..', '.jicreate-tmp');
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function readState(page) {
  return page.evaluate(() => ({
    game: window.__G.game.state,
    editing: !!window.__G.gold?.editing,
    giftDialog: !!document.querySelector('.gold-gift-dialog')?.open,
    requestDialog: !!document.querySelector('.gold-gift-request-dialog')?.open
  }));
}

(async () => {
  fs.mkdirSync(tmpDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/chromium',
    userDataDir: path.join(tmpDir, 'chrome-gift-pause-profile'),
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
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(base + '/?autostart=1&noaudio=1&q=low', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(
      () => window.__ready && window.__G?.game?.state === 'playing' && window.__G.gold,
      { timeout: 90000 }
    );
    await page.evaluate(() => {
      const view = document.getElementById('view') || document.body;
      let locked = false;
      Object.defineProperty(document, 'pointerLockElement', {
        configurable: true,
        get: () => locked ? view : null
      });
      document.exitPointerLock = () => {
        if (!locked) return;
        locked = false;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
      window.__G.input.requestLock = () => {
        locked = true;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
      locked = true;
      document.dispatchEvent(new Event('pointerlockchange'));

      let deliver = () => {};
      const player = window.__G.player;
      window.__mp = {
        connected: true,
        id: 'self',
        avatarList: [{
          id: 'teammate',
          name: 'Teammate',
          x: player.pos.x + 1,
          y: player.pos.y,
          z: player.pos.z
        }],
        send: () => true,
        syncState: () => {},
        toast: () => {},
        closeRoster: () => {},
        onMessage(handler) {
          deliver = handler;
          return () => { if (deliver === handler) deliver = () => {}; };
        }
      };
      window.__goldTestDeliver = message => deliver(message);
    });
    await delay(250);
    await page.evaluate(() => {
      window.__goldTestDeliver({
        type: 'goldList',
        map: 'port',
        carried: 1000,
        issued: 0,
        remaining: 0,
        reward: 0,
        targets: [],
        drops: []
      });
    });
    await page.waitForFunction(() => {
      const button = document.querySelector('.gold-gift-button');
      return window.__G.gold.carried === 1000 && button && !button.hidden;
    }, { timeout: 10000 });

    await page.keyboard.press('y');
    await page.waitForSelector('.gold-gift-dialog[open]', { timeout: 5000 });
    await delay(120);
    let state = await readState(page);
    assert.equal(state.game, 'playing');
    assert.equal(state.editing, true);
    assert.equal(state.giftDialog, true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.gold-gift-dialog')?.open, { timeout: 5000 });
    await delay(120);
    state = await readState(page);
    assert.equal(state.game, 'playing');
    assert.equal(state.editing, false);

    await page.evaluate(() => {
      window.__goldTestDeliver({
        type: 'goldGiftRequest',
        offerId: 'pause-regression-offer',
        fromName: 'Teammate',
        amount: 100,
        expiresAt: Date.now() + 30000
      });
    });
    await page.waitForSelector('.gold-gift-request-dialog[open]', { timeout: 5000 });
    await delay(120);
    state = await readState(page);
    assert.equal(state.game, 'playing');
    assert.equal(state.editing, true);
    assert.equal(state.requestDialog, true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.gold-gift-request-dialog')?.open, { timeout: 5000 });
    await delay(150);
    state = await readState(page);
    assert.equal(state.game, 'playing');
    assert.equal(state.editing, false);

    console.log('gold gift pause regression passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('gold gift pause regression failed: ' + error.message);
  process.exitCode = 1;
});
