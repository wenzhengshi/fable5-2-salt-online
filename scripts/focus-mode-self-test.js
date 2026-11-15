'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { WebSocket } = require('ws');

const sockets = new Set();

async function freePort() {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

function openSocket(baseUrl, query) {
  const socket = new WebSocket(baseUrl.replace(/^http/, 'ws') + '/ws?' + new URLSearchParams(query).toString());
  sockets.add(socket);
  socket.once('close', () => sockets.delete(socket));
  return socket;
}

function waitForMessage(socket, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timed out waiting for WebSocket message'));
    }, timeoutMs || 5000);
    function onMessage(raw) {
      let message;
      try { message = JSON.parse(raw); } catch (error) { return; }
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    }
    socket.on('message', onMessage);
  });
}

async function joined(baseUrl, query, name) {
  const socket = openSocket(baseUrl, query);
  const joinedMessage = waitForMessage(socket, message => message.type === 'joined', 5000);
  await once(socket, 'open');
  socket.send(JSON.stringify({ type: 'join', name }));
  return { socket, joined: await joinedMessage };
}

async function main() {
  const root = path.join(__dirname, '..');
  const tmpRoot = path.join(root, '.jicreate-tmp');
  await fs.mkdir(tmpRoot, { recursive: true });
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'saltline-focus-'));
  const port = await freePort();
  const baseUrl = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, ['index.js'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), JICREATE_DATA_DIR: dir },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await fetch(baseUrl + '/api/health');
        if (response.ok) break;
      } catch (error) {
        if (attempt >= 50 || child.exitCode !== null) throw error;
      }
      await delay(100);
    }

    const observer = await joined(baseUrl, {
      clientId: 'c_focus_observer',
      fingerprint: 'fp1-focus-observer',
      lang: 'zh-CN'
    }, 'FOCUS-OBSERVER');
    const focused = await joined(baseUrl, {
      clientId: 'c_focus_target',
      fingerprint: 'fp1-focus-target',
      lang: 'zh-CN'
    }, 'FOCUS-TARGET');

    const announcement = waitForMessage(observer.socket, message => (
      message.type === 'chat' && message.kind === 'system' && message.event === 'focusStart'
    ), 5000);
    const focusedSnapshot = waitForMessage(observer.socket, message => (
      message.type === 'snapshot' && Array.isArray(message.roster) &&
      message.roster.some(player => player.id === focused.joined.id && player.focused === true)
    ), 5000);

    const response = await fetch(baseUrl + '/api/focus/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: 'c_focus_target', fingerprint: 'fp1-focus-target' })
    });
    assert.ok(response.status === 200 || response.status === 201);
    const started = await response.json();
    assert.equal(started.ok, true);
    assert.equal(started.focus.active, true);
    assert.ok(started.focus.record.id);

    const publicMessage = await announcement;
    assert.equal(publicMessage.targetName, focused.joined.name);
    assert.equal(publicMessage.focusKind, 'manual');
    assert.ok(publicMessage.durationMs >= 30 * 60 * 1000);

    const snapshot = await focusedSnapshot;
    const rosterPlayer = snapshot.roster.find(player => player.id === focused.joined.id);
    assert.equal(rosterPlayer.focused, true);
    assert.equal(rosterPlayer.focus.active, true);
    assert.equal(rosterPlayer.focus.kind, 'manual');

    const leaderboard = await (await fetch(baseUrl + '/api/game/leaderboard')).json();
    const onlinePlayer = leaderboard.players.find(player => player.id === focused.joined.id);
    assert.equal(onlinePlayer.focused, true);
    assert.equal(onlinePlayer.focus.active, true);
    assert.equal(onlinePlayer.focusKind, 'manual');

    const history = await (await fetch(baseUrl + '/api/game/chat/history?limit=20')).json();
    const historyEvent = history.messages.find(message => (
      message.kind === 'system' && message.event === 'focusStart' && message.targetName === focused.joined.name
    ));
    assert.ok(historyEvent);

    const records = JSON.parse(await fs.readFile(path.join(dir, 'focus-records.json'), 'utf8'));
    const savedRecord = records.find(record => record.id === started.focus.record.id);
    assert.ok(savedRecord);
    assert.equal(savedRecord.clientId, 'c_focus_target');
    assert.ok(savedRecord.expiresAt > Date.now());

    console.log('Focus mode passed: public system announcement, persisted focus record, roster and online API visibility.');
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
  console.error('Focus mode self-test timed out.');
  for (const socket of sockets) socket.terminate();
}, 15000);
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => clearTimeout(watchdog));
