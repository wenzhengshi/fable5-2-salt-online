'use strict';

const assert = require('node:assert/strict');
const { WebSocket } = require('ws');

const url = process.env.WS_URL || 'ws://127.0.0.1:3123/ws';
const ws = new WebSocket(url);
let joined = null;
let snapshot = null;
let deathAck = null;
let kill = null;
let finished = false;
const timer = setTimeout(() => {
  if (finished) return;
  console.log(JSON.stringify({ ok: false, reason: 'timeout' }));
  process.exitCode = 1;
  ws.close();
}, 6000);

function finish() {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  const result = {
    ok: joined && joined.soldier === 'classic' &&
      snapshot && snapshot.you && snapshot.you.id === joined.id &&
      kill && kill.victim && kill.victim.soldier === 'classic' &&
      deathAck && Number(deathAck.respawnAt) > 0,
    soldier: joined && joined.soldier,
    deathMessage: !!kill,
    deathAck: !!deathAck
  };
  console.log(JSON.stringify(result, null, 2));
  ws.close();
  assert.ok(result.ok, '老版 WebSocket 协议回归失败');
}

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'join',
    name: 'LEGACY-WS-TEST',
    spawns: [{ x: 0, y: 0, z: 4 }]
  }));
});

ws.on('message', (raw) => {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch (err) {
    return;
  }
  if (msg.type === 'joined') {
    joined = msg;
    return;
  }
  if (msg.type === 'snapshot' && msg.you && !snapshot) {
    snapshot = msg;
    ws.send(JSON.stringify({
      type: 'state',
      pos: { x: msg.you.x || 0, y: msg.you.y || 0, z: msg.you.z || 4 },
      yaw: 0,
      pitch: 0,
      active: true,
      moving: false,
      sprint: false
    }));
    setTimeout(() => {
      if (!finished) ws.send(JSON.stringify({ type: 'died' }));
    }, 180);
    return;
  }
  if (msg.type === 'kill' && msg.victim && joined && msg.victim.id === joined.id) {
    kill = msg;
    if (deathAck) finish();
    return;
  }
  if (msg.type === 'deathAck') {
    deathAck = msg;
    if (kill) finish();
  }
});

ws.on('error', (err) => {
  console.error(err);
  clearTimeout(timer);
  process.exitCode = 1;
});
