'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { WebSocket } = require('ws');

const sockets = new Set();
const csrfOf = markup => markup.match(/name="csrf" type="hidden" value="([0-9a-f]+)"/)?.[1];
const cookieOf = response => response.headers.get('set-cookie')?.split(';')[0];

async function freePort() {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

function openSocket(baseUrl, cookie) {
  const socket = new WebSocket(baseUrl.replace(/^http/, 'ws') + '/ws', {
    origin: baseUrl, headers: { Cookie: cookie }
  });
  sockets.add(socket);
  socket.once('close', () => sockets.delete(socket));
  return socket;
}

async function joined(baseUrl, cookie) {
  const socket = openSocket(baseUrl, cookie);
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.on('message', raw => {
      const message = JSON.parse(raw);
      if (message.type === 'joined') {
        socket.playerId = message.id;
        resolve();
      }
    });
    socket.once('open', () => socket.send(JSON.stringify({ type: 'join', name: 'OBS-review-test' })));
    socket.once('close', () => reject(new Error('Closed before joined')));
  });
  return socket;
}

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'saltline-moderation-'));
  const port = await freePort();
  const baseUrl = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, ['index.js'], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), JICREATE_DATA_DIR: dir },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  let adminCookie;
  const get = (url, cookie = adminCookie) => fetch(baseUrl + url, {
    redirect: 'manual', headers: cookie ? { Cookie: cookie } : {}
  });
  const post = (url, data, cookie = adminCookie) => fetch(baseUrl + url, {
    method: 'POST', redirect: 'manual', headers: cookie ? { Cookie: cookie } : {},
    body: new URLSearchParams(data)
  });
  try {
    for (let attempt = 0; ; attempt++) {
      try { await get('/admin'); break; } catch (error) {
        if (attempt >= 50 || child.exitCode !== null) throw error;
        await delay(100);
      }
    }

    assert.equal((await get('/admin/moderation')).status, 303);
    const initial = await post('/admin/login', { username: 'admin', password: 'abc123456@' });
    adminCookie = cookieOf(initial);
    assert.ok(adminCookie);
    assert.equal((await get('/admin/moderation')).headers.get('location'), '/admin/password');
    const password = 'saltline-test-password';
    const initialCsrf = csrfOf(await (await get('/admin/password')).text());
    const changed = await post('/admin/password', { csrf: initialCsrf, current: 'abc123456@', password, confirm: password });
    assert.equal(changed.status, 200);
    adminCookie = cookieOf(await post('/admin/login', { username: 'admin', password }));
    const identity = cookieOf(await get('/', ''));
    assert.ok(identity?.startsWith('salt_sign_owner='));

    const first = await joined(baseUrl, identity);
    const second = await joined(baseUrl, identity);
    const separateIdentity = cookieOf(await get('/', ''));
    const unaffected = await joined(baseUrl, separateIdentity);
    for (let i = 0; i < 3; i++) first.send(JSON.stringify({ type: 'state', active: true, hp: 999 }));
    let page;
    for (let i = 0; i < 30; i++) {
      page = await (await get('/admin/moderation')).text();
      if (page.includes('客户端提交异常血量')) break;
      await delay(50);
    }
    assert.match(page, /客户端提交异常血量/);
    assert.equal(first.readyState, WebSocket.OPEN);
    assert.equal(second.readyState, WebSocket.OPEN);
    const csrf = csrfOf(page);
    const token = page.match(/action="\/admin\/moderation\/ban\/([0-9a-f-]+)"/)?.[1];
    assert.ok(csrf && token);
    const banUrl = '/admin/moderation/ban/' + token;
    assert.equal((await post(banUrl, { csrf: 'wrong', duration: 'day', reason: 'test' })).status, 403);
    const firstClosed = once(first, 'close');
    const secondClosed = once(second, 'close');
    const response = await post(banUrl, { csrf, duration: 'day', reason: 'test' });
    assert.match(response.headers.get('location'), /result=banned$/);
    assert.equal((await firstClosed)[0], 4403);
    assert.equal((await secondClosed)[0], 4403);
    assert.equal(unaffected.readyState, WebSocket.OPEN);
    assert.equal((await once(openSocket(baseUrl, identity), 'close'))[0], 4403);
    const [saved] = JSON.parse(await fs.readFile(path.join(dir, 'player-bans.json'), 'utf8'));
    assert.ok(saved.until > Date.now());
    const restored = require('../services/moderation').createModeration(path.join(dir, 'player-bans.json'));
    await restored.ready;
    assert.equal(restored.activeBan(saved.owner).id, saved.id);
    const revoked = await post('/admin/moderation/revoke/' + saved.id, { csrf });
    assert.match(revoked.headers.get('location'), /result=revoked$/);
    const rejoined = await joined(baseUrl, identity);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, 'player-bans.json'), 'utf8')), []);
    const online = (await (await get('/admin/moderation')).text()).split('<h2>在线玩家')[1];
    const kickToken = online.match(/action="\/admin\/moderation\/kick\/([0-9a-f-]+)"/g).at(-1).split('/').at(-1).slice(0, -1);
    const kicked = once(rejoined, 'close');
    const kickedResponse = await post('/admin/moderation/kick/' + kickToken, { csrf });
    assert.match(kickedResponse.headers.get('location'), /result=kicked$/);
    assert.equal((await kicked)[0], 4404);
    assert.equal(unaffected.readyState, WebSocket.OPEN);
    const attacker = await joined(baseUrl, identity);
    const send = (socket, message) => socket.send(JSON.stringify(message));
    const seen = [];
    attacker.on('message', raw => seen.push(JSON.parse(raw)));
    send(attacker, { type: 'state', active: true, pos: { x: 0, y: 0, z: 4 } });
    send(unaffected, { type: 'state', active: true, pos: { x: 8, y: 0, z: 4 } });
    await delay(160);
    const observed = new Promise(resolve => {
      const onSnapshot = raw => {
        const msg = JSON.parse(raw);
        if (msg.type !== 'snapshot' || !msg.players.some(player => player.id === attacker.playerId && player.x === 90)) return;
        unaffected.off('message', onSnapshot);
        resolve();
      };
      unaffected.on('message', onSnapshot);
    });
    const moveTo = x => send(attacker, { type: 'state', active: true, pos: { x, y: 0, z: 4 } });
    moveTo(90);
    await observed;
    moveTo(0);
    moveTo(90);
    moveTo(0);
    const motionReport = await (await get('/admin/moderation')).text();
    assert.match(motionReport, /短时位移跳变/);
    assert.equal(attacker.readyState, WebSocket.OPEN);
    const shoot = dir => send(attacker, { type: 'shot', origin: { x: 0, y: 1, z: 4 }, dir });
    const hit = () => send(attacker, { type: 'hit', targetId: unaffected.playerId });
    shoot({ x: -1, y: 0, z: 0 });
    hit();
    await delay(100);
    assert.ok(seen.every(msg => msg.type !== 'positionCorrection'));
    assert.equal(seen.filter(msg => msg.type === 'hitConfirm' && msg.damage).length, 0);
    shoot({ x: 1, y: 0, z: 0 });
    hit();
    await delay(100);
    hit();
    await delay(100);
    assert.equal(seen.filter(msg => msg.type === 'hitConfirm' && msg.damage).length, 1);

    const autoClosed = once(attacker, 'close');
    for (let i = 0; i < 12; i++) send(attacker, { type: 'state', active: true, hp: 999 });
    assert.equal((await autoClosed)[0], 4403);
    assert.equal((await once(openSocket(baseUrl, identity), 'close'))[0], 4403);
    assert.equal(unaffected.readyState, WebSocket.OPEN);
    let automaticPage;
    for (let i = 0; i < 30; i++) {
      automaticPage = await (await get('/admin/moderation')).text();
      if (automaticPage.includes('自动封禁 · 客户端提交异常血量')) break;
      await delay(50);
    }
    assert.match(automaticPage, /自动封禁 · 客户端提交异常血量/);
    const [autoBan] = JSON.parse(await fs.readFile(path.join(dir, 'player-bans.json'), 'utf8'));
    assert.equal(autoBan.automatic, true);
    assert.ok(autoBan.until > Date.now() && autoBan.until - autoBan.at === 20 * 60000);
    console.log('Moderation passed: admin actions, passive motion monitoring, valid shot, off-axis and duplicate rejection, automatic ban, unrelated player online.');
  } finally {
    for (const socket of sockets) socket.terminate();
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      await stopped;
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const watchdog = setTimeout(() => {
  console.error('Moderation self-test timed out.');
  for (const socket of sockets) socket.terminate();
}, 15000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
