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
const tmpDir = path.join(__dirname, '..', '.jicreate-tmp');
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

(async () => {
  fs.mkdirSync(tmpDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/chromium',
    userDataDir: path.join(tmpDir, 'chrome-container-ad-pause-profile'),
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
    await page.setViewport(process.env.TEST_MOBILE === '1'
      ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { width: 1280, height: 800 });
    await page.goto(base + '/?autostart=1&noaudio=1&q=low', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(
      () => window.__ready && window.__G?.game?.state === 'playing' && window.__G.portContainerAds,
      { timeout: 90000 }
    );
    await page.evaluate(() => {
      const game = window.__G;
      const row = game.level.placed.find(candidate => candidate.adSides);
      if (!row) throw new Error('No container ad surface found');
      const sin = Math.sin(row.yaw);
      const cos = Math.cos(row.yaw);
      const point = { x: row.x + 1.219 * sin, y: row.y + 1.35, z: row.z + 1.219 * cos };
      const normal = { x: sin, y: 0, z: cos };
      game.physics.raycast = () => ({ surface: 'metal', point, normal, dist: 3 });

      let deliver = () => {};
      window.__mp = {
        connected: true,
        joined: true,
        send(message) {
          if (message.type === 'containerAdQuote') {
            setTimeout(() => deliver({
              type: 'containerAdQuote', request: message.request, token: 'test-ticket', price: '0.1'
            }), 20);
          }
          return true;
        },
        onMessage(handler) {
          deliver = handler;
          return () => { if (deliver === handler) deliver = () => {}; };
        }
      };

      const view = document.getElementById('view');
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
      game.input.requestLock = () => {
        locked = true;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
      locked = true;
      document.dispatchEvent(new Event('pointerlockchange'));
    });

    await page.waitForFunction(() => {
      const shortcut = document.querySelector('.port-ad-shortcut');
      return shortcut && !shortcut.hidden;
    }, { timeout: 15000 });

    await page.keyboard.press('Digit9');
    await page.waitForSelector('.port-ad-dialog[open]', { timeout: 5000 });
    await delay(150);
    let state = await page.evaluate(() => {
      const menu = document.querySelector('.menu');
      return {
        game: window.__G.game.state,
        pausedVisible: menu?.dataset.screen === 'paused' && menu.classList.contains('open'),
        pauseHold: window.__SALT_ROSTER_OPEN__
      };
    });
    console.log('after open:', state);
    assert.equal(state.game, 'playing');
    assert.equal(state.pausedVisible, false);
    assert.equal(state.pauseHold, true);

    // Mobile Chrome reports the page as hidden while the native image picker is open.
    // Reuse that lifecycle event to make sure choosing an image cannot pause the game.
    state = await page.evaluate(async () => {
      const select = document.querySelector('.port-ad-dialog select[name="mode"]');
      select.value = 'image';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const file = document.querySelector('.port-ad-dialog input[name="image"]');
      window.__testHidden = false;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => window.__testHidden
      });
      const setHidden = value => {
        window.__testHidden = value;
        document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
      };
      setHidden(true);
      const menu = document.querySelector('.menu');
      const whilePicker = {
        game: window.__G.game.state,
        pausedVisible: menu?.dataset.screen === 'paused' && menu.classList.contains('open'),
        dialogOpen: document.querySelector('.port-ad-dialog')?.open,
        imageVisible: !file.closest('label').hidden
      };
      setHidden(false);
      return { ...whilePicker, restoredGame: window.__G.game.state, restoredDialog: document.querySelector('.port-ad-dialog')?.open };
    });
    console.log('while image picker hidden:', state);
    assert.equal(state.game, 'playing');
    assert.equal(state.pausedVisible, false);
    assert.equal(state.dialogOpen, true);
    assert.equal(state.imageVisible, true);
    assert.equal(state.restoredGame, 'playing');
    assert.equal(state.restoredDialog, true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.port-ad-dialog')?.open, { timeout: 5000 });
    await page.waitForFunction(() => window.__SALT_ROSTER_OPEN__ === false, { timeout: 5000 });
    await delay(150);
    state = await page.evaluate(() => ({
      game: window.__G.game.state,
      pauseHold: window.__SALT_ROSTER_OPEN__
    }));
    console.log('after close:', state);
    assert.equal(state.game, 'playing');
    assert.equal(state.pauseHold, false);

    // Outside the ad panel the normal automatic pause must still work.
    state = await page.evaluate(() => {
      window.__testHidden = true;
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
      const menu = document.querySelector('.menu');
      return {
        game: window.__G.game.state,
        pausedVisible: menu?.dataset.screen === 'paused' && menu.classList.contains('open')
      };
    });
    console.log('after leaving panel:', state);
    assert.equal(state.game, 'paused');
    assert.equal(state.pausedVisible, true);

    console.log('container ad pause regression passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('container ad pause regression failed:', error);
  process.exitCode = 1;
});
