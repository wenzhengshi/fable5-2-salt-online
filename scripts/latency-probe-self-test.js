'use strict';

const assert = require('node:assert/strict');
const { WebSocket } = require('ws');

const baseUrl = new URL(process.env.WS_URL || 'ws://127.0.0.1:3000/ws');
const probeUrl = new URL(baseUrl.toString());
probeUrl.searchParams.set('probe', '1');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function opened(socket, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label + ' open timeout')), 5000);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function nextMessage(socket, type, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('timeout waiting for ' + type));
    }, timeoutMs);
    function onMessage(raw) {
      let message;
      try { message = JSON.parse(String(raw)); } catch (error) { return; }
      if (message.type !== type) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    }
    socket.on('message', onMessage);
  });
}

(async () => {
  const probe = new WebSocket(probeUrl);
  const sent = [];
  const returned = [];
  probe.on('message', (raw) => {
    let message;
    try { message = JSON.parse(String(raw)); } catch (error) { return; }
    if (message.type === 'pong') returned.push(message.t);
  });
  await opened(probe, 'latency probe');

  for (let index = 0; index < 5; index += 1) {
    const t = performance.now();
    sent.push(t);
    probe.send(JSON.stringify({ type: 'ping', t }));
    await delay(40);
  }
  await delay(200);

  assert.ok(returned.length >= 4, 'probe should receive pong frames');
  for (const t of returned) {
    assert.ok(sent.some((value) => Math.abs(value - t) < 0.001), 'pong must echo the probe timestamp');
  }

  const player = new WebSocket(baseUrl);
  const joinedPromise = nextMessage(player, 'joined');
  await opened(player, 'player');
  player.send(JSON.stringify({
    type: 'join',
    name: 'LAT-PROBE',
    soldier: 'male',
    outfit: 'default',
    spawns: [{ x: 20, y: 0.2, z: 20 }]
  }));
  const joined = await joinedPromise;
  assert.ok(joined.id, 'normal player should still join');
  const snapshot = await nextMessage(player, 'snapshot');
  assert.equal(snapshot.online, 1, 'probe connections must not inflate online player count');

  console.log(JSON.stringify({
    ok: true,
    pongs: returned.length,
    online: snapshot.online,
    probeIsolated: snapshot.online === 1
  }, null, 2));
  probe.close();
  player.close();
  await delay(50);
  process.exit(0);
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error && error.message }, null, 2));
  process.exit(1);
});
