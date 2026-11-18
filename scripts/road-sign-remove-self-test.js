'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const puppeteer = require('puppeteer');

const root = path.join(__dirname, '..');
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/chromium';

async function main() {
  const tmpRoot = path.join(root, '.jicreate-tmp');
  await fs.mkdir(tmpRoot, { recursive: true });
  const profile = await fs.mkdtemp(path.join(tmpRoot, 'road-sign-remove-'));
  const browser = await puppeteer.launch({
    executablePath,
    userDataDir: profile,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html lang="zh-CN"><body><div id="app"></div></body></html>');
    await page.evaluate(() => {
      class Vector3 {
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        copy(value) { this.x = value.x; this.y = value.y; this.z = value.z; return this; }
        set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
        clone() { return new Vector3(this.x, this.y, this.z); }
        sub(value) { this.x -= value.x; this.y -= value.y; this.z -= value.z; return this; }
        multiplyScalar(value) { this.x *= value; this.y *= value; this.z *= value; return this; }
        addScaledVector(value, scale) {
          this.x += value.x * scale;
          this.y += value.y * scale;
          this.z += value.z * scale;
          return this;
        }
        lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
      }
      class Group {
        constructor() { this.children = []; this.position = new Vector3(); this.rotation = new Vector3(); }
        add(...children) { this.children.push(...children); return this; }
        remove(child) {
          const index = this.children.indexOf(child);
          if (index >= 0) this.children.splice(index, 1);
          return this;
        }
        updateMatrix() {}
      }
      class Mesh {
        constructor(geometry, material) {
          this.geometry = geometry;
          this.material = material;
          this.position = new Vector3();
          this.rotation = new Vector3();
        }
      }
      class Geometry { rotateX() { return this; } }
      class Material { dispose() { this.disposed = true; } }
      class Texture { constructor(canvas) { this.canvas = canvas; } dispose() { this.disposed = true; } }
      window.THREE = {
        Vector3,
        Group,
        Mesh,
        CylinderGeometry: Geometry,
        BoxGeometry: Geometry,
        PlaneGeometry: Geometry,
        RingGeometry: Geometry,
        MeshStandardMaterial: Material,
        MeshBasicMaterial: Material,
        CanvasTexture: Texture,
        SRGBColorSpace: 'srgb'
      };
      const THREE = window.THREE;
      const scene = new Group();
      const camera = {
        getWorldPosition(target) { target.set(10, 1.7, 10); },
        getWorldDirection(target) { target.set(0, -1, 0); }
      };
      const player = {
        alive: true,
        onGround: true,
        pos: { x: 10, y: 0, z: 10 }
      };
      const physics = {
        moveCapsule() { return { onGround: true }; },
        raycast() { return null; },
        groundHeight() { return 0; }
      };
      const input = {
        locked: false,
        setGameplay() {},
        exitLock() {},
        requestLock() {}
      };
      const handlers = [];
      const sent = [];
      const queue = [];
      window.__signTest = { handlers, sent, queue };
      window.addEventListener('error', event => queue.push('error: ' + event.message));
      window.__mp = {
        connected: true,
        soldier: 'classic',
        onMessage(handler) { handlers.push(handler); return () => {}; },
        send(message) { sent.push(message); return true; },
        syncState() {}
      };
      window.SaltRoadSignRules = { protectedSpot: () => false };
      window.SaltRoadSignPhysics = {
        sweep: () => null,
        model: {
          post: { topRadius: .047, bottomRadius: .06, height: 1.54 },
          collar: { topRadius: .085, bottomRadius: .067, low: 1.49, high: 1.61 },
          board: { width: 2.22, height: .74, depth: .055, center: 1.98, faceOffset: .03 }
        }
      };
      window.__game = {
        THREE,
        scene,
        camera,
        player,
        physics,
        input,
        expedition: { active: null },
        qingyun: { active: true },
        game: { state: 'playing' }
      };
    });

    await page.addScriptTag({ path: path.join(root, 'public/js/road-sign-styles.js') });
    await page.addScriptTag({ path: path.join(root, 'public/js/road-signs.js') });
    await page.evaluate(() => window.installRoadSigns(window.__game));

    const result = await page.evaluate(async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      const game = window.__game;
      const { handlers, sent } = window.__signTest;
      game.roadSigns.update();
      await sleep(20);
      const holder = game.scene.children.find(child => child.name === 'expedition-road-signs');
      const send = message => handlers.forEach(handler => handler(message));
      const sign = (id, x) => ({
        id,
        map: 'qingyun',
        pos: { x, y: 0, z: 10 },
        yaw: 0,
        style: 'blue',
        removeAt: 0,
        submittedAt: Date.now() - 86400000,
        flagged: false,
        text: id,
        own: true,
        suppressed: false
      });
      const update = async () => {
        game.roadSigns.update();
        await sleep(20);
      };
      const removeButton = () => document.querySelector('.road-sign-tools button:last-child');
      const submitRemoval = async () => {
        removeButton().click();
        document.querySelector('.road-sign-dialog button[type="submit"]').click();
        await sleep(20);
      };

      send({ type: 'signList', map: 'qingyun', signs: [sign('s1', 10)] });
      await update();
      const before = holder.children.length;
      const removedRequest = () => sent.at(-1);
      await submitRemoval();
      const optimistic = holder.children.length;
      const request = removedRequest();
      send({ type: 'signResult', action: 'remove', id: 's1', removed: true });
      await update();
      const confirmed = holder.children.length;
      send({ type: 'signList', map: 'qingyun', signs: [sign('s1', 10)] });
      await update();
      const staleList = holder.children.length;

      send({ type: 'signList', map: 'qingyun', signs: [sign('s2', 10)] });
      await update();
      const restorable = holder.children.length;
      await submitRemoval();
      const rejectedOptimistic = holder.children.length;
      send({ type: 'signResult', action: 'remove', id: 's2', reason: 'busy' });
      await update();
      const restored = holder.children.length;
      return {
        before,
        optimistic,
        request,
        confirmed,
        staleList,
        restorable,
        rejectedOptimistic,
        restored,
        errors: window.__signTest.queue
      };
    });

    assert.equal(result.errors.length, 0, '客户端不应抛出错误: ' + result.errors.join('; '));
    assert.equal(result.before, 2, '初始应渲染路牌与标记');
    assert.equal(result.optimistic, 1, '点击拔除后路牌应本地立即消失');
    assert.deepEqual(result.request, { type: 'signRemove', id: 's1' }, '应发送拔除请求');
    assert.equal(result.confirmed, 1, '服务端确认后路牌仍应保持消失');
    assert.equal(result.staleList, 1, '旧 signList 不应把已拔除路牌重新加回来');
    assert.equal(result.restorable, 2, '第二块路牌应正常渲染');
    assert.equal(result.rejectedOptimistic, 1, '第二块路牌也应即时隐藏');
    assert.equal(result.restored, 2, '服务端拒绝拔除后路牌必须恢复显示');
    console.log('Road sign removal passed: optimistic hide, confirmed removal, stale-list guard and rejection restore.');
  } finally {
    await browser.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
}

const watchdog = setTimeout(() => {
  console.error('Road sign removal self-test timed out.');
  process.exit(1);
}, 30000);
watchdog.unref();

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
