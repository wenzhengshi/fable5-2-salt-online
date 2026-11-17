const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch (error) {
  puppeteer = require('puppeteer');
}

const root = path.join(__dirname, '..');
const base = process.env.TEST_BASE || 'http://127.0.0.1:3000';
const tmpDir = path.join(root, '.jicreate-tmp');
const overlaySelectors = ['.gold-hud button', '.road-sign-tools button', '.container-tools button'];

async function hitTest(page, selector) {
  return page.evaluate((wanted) => {
    const prefix = wanted.split(' ')[0];
    for (const overlay of ['.gold-hud', '.road-sign-tools', '.container-tools']) {
      const element = document.querySelector(overlay);
      if (!element) continue;
      element.hidden = overlay !== prefix;
      element.style.setProperty('z-index', overlay === prefix ? '2147483000' : '1', 'important');
    }
    const target = document.querySelector(wanted);
    if (!target) return { found: false };
    target.hidden = false;
    target.style.setProperty('display', 'block', 'important');
    target.style.setProperty('pointer-events', 'auto', 'important');
    const rect = target.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return {
      found: true,
      rect: { width: rect.width, height: rect.height },
      hit: !!hit && (hit === target || target.contains(hit)),
      fullscreen: document.fullscreenElement === document.documentElement
    };
  }, selector);
}

(async () => {
  const bundle = fs.readFileSync(path.join(root, 'public/js/game.bundle.js'), 'utf8');
  assert.match(bundle, /m=document\.documentElement;m&&/, '全屏目标必须是 document.documentElement');
  assert.doesNotMatch(bundle, /m=document\.getElementById\("app"\)/, '全屏目标不能是 #app');

  fs.mkdirSync(tmpDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/chromium',
    userDataDir: path.join(tmpDir, 'chrome-fullscreen-profile'),
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
      () => window.__ready && window.__G?.game?.state === 'playing' && window.__G.gold && window.__G.containers && window.__G.roadSigns,
      { timeout: 90000 }
    );
    await page.evaluate(() => {
      const trigger = document.createElement('button');
      trigger.id = 'fullscreen-overlay-test-trigger';
      trigger.style.cssText = 'position:fixed;z-index:2147483000;left:8px;top:8px';
      trigger.textContent = 'fullscreen test';
      trigger.addEventListener('click', () => document.documentElement.requestFullscreen());
      document.body.append(trigger);
    });
    await page.click('#fullscreen-overlay-test-trigger');
    await page.waitForFunction(() => document.fullscreenElement === document.documentElement, { timeout: 10000 });

    for (const selector of overlaySelectors) {
      const result = await hitTest(page, selector);
      assert.ok(result.found, '找不到浮层 ' + selector);
      assert.ok(result.fullscreen, '测试过程中已退出全屏');
      assert.ok(result.rect.width > 0 && result.rect.height > 0, '浮层没有尺寸: ' + selector);
      assert.ok(result.hit, '全屏中无法命中浮层: ' + selector);
    }
    await page.evaluate(() => document.exitFullscreen?.());
    console.log('fullscreen overlay regression passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('fullscreen overlay regression failed: ' + error.message);
  process.exitCode = 1;
});
