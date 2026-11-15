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
  const profile = await fs.mkdtemp(path.join(tmpRoot, 'focus-restore-'));
  const browser = await puppeteer.launch({
    executablePath,
    userDataDir: profile,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body><div id="app"></div></body></html>');
    await page.evaluate(() => {
      window.__SALT_I18N__ = {
        messages: {
          focus: {},
          mp: {}
        }
      };
      window.__focusHandlers = [];
      window.__focusSent = [];
      const camera = {
        position: {
          x: 10,
          y: 1.7,
          z: 10,
          copy(value) {
            this.x = value.x;
            this.y = value.y;
            this.z = value.z;
          }
        },
        rotation: { x: 0, y: 0, z: 0 },
        quaternion: {},
        lookAt(x, y, z) {
          this.look = { x, y, z };
        },
        updateProjectionMatrix() {},
        fov: 70
      };
      const player = {
        enabled: true,
        alive: true,
        invulnerable: false,
        pos: { x: 10, y: 0, z: 10 },
        eye: { x: 10, y: 1.7, z: 10 },
        yaw: 0,
        pitch: 0,
        forward: {},
        syncView() {
          this.syncCount = (this.syncCount || 0) + 1;
          camera.position.copy(this.eye);
        },
        reset(point) {
          this.pos = { x: point.x, y: point.y, z: point.z };
          this.eye = { x: point.x, y: point.y + 1.7, z: point.z };
          this.alive = true;
          this.enabled = true;
          this.syncView();
        }
      };
      const game = {
        state: 'paused',
        update() {
          return this.state === 'playing';
        },
        resume() {
          this.state = 'playing';
        },
        menus: {
          screen: 'none',
          show(screen) {
            this.screen = screen;
          }
        }
      };
      const hud = {
        visible: false,
        show(visible) {
          this.visible = visible;
        }
      };
      const input = {
        gameplay: false,
        setGameplay(active) {
          this.gameplay = active;
        },
        exitLock() {
          this.lockExited = true;
        }
      };
      window.__G = { camera, player, game, hud, input };
      window.__mp = {
        id: 'self',
        avatarList: [],
        roster: [],
        onMessage(handler) {
          window.__focusHandlers.push(handler);
        },
        send(message) {
          window.__focusSent.push(message);
        },
        toast() {},
        focusDeploy(spawn, protectedUntil) {
          const current = window.__G;
          current.player.reset(spawn);
          current.player.invulnerable = true;
          current.game.state = 'playing';
          current.hud.show(true);
          current.input.setGameplay(true);
          current.deployedProtectedUntil = protectedUntil;
          return true;
        }
      };
    });

    await page.addScriptTag({ path: path.join(root, 'public/js/focus-mode.js') });
    await page.waitForFunction(() => window.__focusHandlers.length > 0, { timeout: 4000 });

    await page.evaluate(() => {
      const until = Date.now() + 10000;
      for (const handler of window.__focusHandlers) {
        handler({ type: 'focusState', active: true, until, kind: 'manual', durationMs: 10000 });
      }
      for (let index = 0; index < 30; index += 1) window.__G.game.update(1 / 60);
    });

    const spectatorState = await page.evaluate(() => ({
      active: window.__SALT_FOCUS__.active,
      camera: { ...window.__G.camera.position },
      playerEnabled: window.__G.player.enabled,
      gameState: window.__G.game.state
    }));
    assert.equal(spectatorState.active, true);
    assert.equal(spectatorState.playerEnabled, false);
    assert.equal(spectatorState.gameState, 'paused');
    assert.ok(Math.hypot(
      spectatorState.camera.x - 10,
      spectatorState.camera.y - 1.7,
      spectatorState.camera.z - 10
    ) > 1, 'spectator camera should leave the player eye');

    await page.evaluate(() => {
      for (const handler of window.__focusHandlers) {
        handler({ type: 'focusState', active: false, expired: true, kind: 'manual', until: 0 });
      }
      const realNow = Date.now;
      const offset = 12000;
      Date.now = () => realNow() + offset;
    });

    await page.waitForFunction(() => (
      window.__SALT_FOCUS__.active === false &&
      document.getElementById('focus-mode').hidden === true
    ), { timeout: 4000 });

    const restored = await page.evaluate(() => ({
      camera: { ...window.__G.camera.position },
      eye: { ...window.__G.player.eye },
      playerEnabled: window.__G.player.enabled,
      gameState: window.__G.game.state,
      hudVisible: window.__G.hud.visible,
      gameplay: window.__G.input.gameplay,
      bodyClass: document.body.classList.contains('focus-mode-on')
    }));
    assert.equal(restored.playerEnabled, true);
    assert.equal(restored.gameState, 'playing');
    assert.equal(restored.hudVisible, true);
    assert.equal(restored.gameplay, true);
    assert.equal(restored.bodyClass, false);
    assert.ok(Math.hypot(
      restored.camera.x - restored.eye.x,
      restored.camera.y - restored.eye.y,
      restored.camera.z - restored.eye.z
    ) < 0.001, 'camera should snap back to the player eye');

    await page.evaluate(() => {
      for (const handler of window.__focusHandlers) {
        handler({
          type: 'focusState',
          active: false,
          ended: true,
          kind: 'manual',
          spawn: { x: 42, y: 0, z: -12, yaw: 1.25 },
          protectedUntil: Date.now() + 1800
        });
      }
    });

    const lateSpawn = await page.evaluate(() => ({
      pos: { ...window.__G.player.pos },
      gameState: window.__G.game.state,
      protectedUntil: window.__G.deployedProtectedUntil
    }));
    assert.equal(lateSpawn.gameState, 'playing');
    assert.equal(lateSpawn.pos.x, 42);
    assert.equal(lateSpawn.pos.z, -12);
    assert.ok(lateSpawn.protectedUntil > Date.now());

    console.log('Focus restore passed: paused focus ends resume gameplay, reset the camera and apply a late server spawn.');
  } finally {
    await browser.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
}

const watchdog = setTimeout(() => {
  console.error('Focus restore self-test timed out.');
  process.exit(1);
}, 20000);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => clearTimeout(watchdog));
