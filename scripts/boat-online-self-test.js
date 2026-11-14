'use strict';

const assert = require('node:assert/strict');
const { WebSocket } = require('ws');

const url = process.env.WS_URL || 'ws://127.0.0.1:3123/ws';
const clients = [];

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messages = [];
    const waiters = [];
    const timer = setTimeout(() => reject(new Error(`${name} connection timeout`)), 7000);
    ws.on('open', () => {
      clearTimeout(timer);
      clients.push(ws);
      resolve({
        ws,
        messages,
        send(payload) {
          ws.send(JSON.stringify(payload));
        },
        waitFor(type, predicate, timeout = 4000) {
          const index = messages.findIndex((message) => (
            message.type === type && (!predicate || predicate(message))
          ));
          if (index >= 0) {
            const found = messages[index];
            messages.splice(index, 1);
            return Promise.resolve(found);
          }
          return new Promise((resolveWait, rejectWait) => {
            const waiter = { type, predicate, resolve: resolveWait, reject: rejectWait };
            waiter.timer = setTimeout(() => {
              const at = waiters.indexOf(waiter);
              if (at >= 0) waiters.splice(at, 1);
              rejectWait(new Error(`${name} timed out waiting for ${type}`));
            }, timeout);
            waiters.push(waiter);
          });
        }
      });
    });
    ws.on('error', reject);
    ws.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch (error) {
        return;
      }
      messages.push(message);
      for (let i = waiters.length - 1; i >= 0; i -= 1) {
        const waiter = waiters[i];
        if (message.type !== waiter.type || (waiter.predicate && !waiter.predicate(message))) continue;
        waiters.splice(i, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    });
  });
}

async function main() {
  const first = await connect('first');
  const second = await connect('second');
  const spawns = [{ x: 29, y: 0, z: 21 }];

  first.send({ type: 'join', name: 'BOAT-STEER', soldier: 'classic', spawns });
  second.send({ type: 'join', name: 'BOAT-CREW', soldier: 'female', spawns });
  const firstJoined = await first.waitFor('joined');
  const secondJoined = await second.waitFor('joined');

  first.send({
    type: 'state',
    pos: { x: 29, y: 0, z: 21 },
    yaw: 0,
    pitch: 0,
    active: true,
    visible: true,
    moving: false,
    sprint: false
  });
  second.send({
    type: 'state',
    pos: { x: 29, y: 0, z: 22 },
    yaw: 0,
    pitch: 0,
    active: true,
    visible: true,
    moving: false,
    sprint: false
  });
  await new Promise((resolve) => setTimeout(resolve, 180));

  first.send({ type: 'boatBoard' });
  const helmAck = await first.waitFor('boatAck', (message) => message.aboard === true);
  assert.equal(helmAck.seat, 0, '第一名玩家应取得舵位');
  assert.equal(helmAck.boat.seats[0], firstJoined.id);

  second.send({ type: 'boatBoard' });
  const crewAck = await second.waitFor('boatAck', (message) => message.aboard === true);
  assert.equal(crewAck.seat, 1, '第二名玩家应进入乘客位');
  assert.equal(crewAck.boat.seats[1], secondJoined.id);

  first.send({ type: 'boatInvite' });
  const invite = await second.waitFor('boatInvite');
  assert.equal(invite.from.id, firstJoined.id);
  assert.equal(invite.boat.capacity, 4);

  first.send({
    type: 'boatPose',
    pos: { x: 33, y: -1.565, z: 21 },
    heading: -Math.PI / 2,
    speed: 4
  });
  const moved = await second.waitFor('snapshot', (message) => (
    message.boat && Math.abs(Number(message.boat.x) - 33) < 0.2
  ));
  const crew = moved.players.find((player) => player.id === secondJoined.id);
  assert.ok(crew, '乘客应出现在多人快照中');
  assert.ok(Math.hypot(crew.x - 33, crew.z - 21) < 3, '乘客位置应绑定船位');

  first.send({ type: 'boatLeave' });
  const movingDenied = await first.waitFor('boatDenied', (message) => message.reason === 'moving');
  assert.ok(movingDenied, '行驶中应拒绝下船');

  for (let step = 1; step <= 15; step += 1) {
    first.send({
      type: 'boatPose',
      pos: {
        x: 33 + step * 3,
        y: -1.565,
        z: 21 - step * (13 / 15)
      },
      heading: -Math.PI / 2,
      speed: 0
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  await new Promise((resolve) => setTimeout(resolve, 250));

  first.send({
    type: 'boatPose',
    pos: { x: 78, y: -1.565, z: 8 },
    heading: -Math.PI / 2,
    speed: 0
  });
  await new Promise((resolve) => setTimeout(resolve, 160));
  first.send({ type: 'boatLeave' });
  const leaveAck = await first.waitFor('boatAck', (message) => message.aboard === false);
  assert.ok(leaveAck.pos && Number.isFinite(leaveAck.pos.x), '下船应返回安全落点');
  assert.equal(Number(leaveAck.pos.x.toFixed(1)), 84.2, '外海平台下船应落到平台边缘');
  assert.ok(Number(leaveAck.pos.y) > 0, '外海平台下船点应位于平台表面');

  second.send({
    type: 'spawns',
    spawns: [
      { x: 29, y: 0, z: 21 },
      { x: 90, y: 0.26, z: -5 },
      { x: 111, y: 0.26, z: 21 }
    ]
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  second.send({ type: 'died' });
  await second.waitFor('deathAck');
  const cleared = await first.waitFor('boatState', (message) => (
    message.boat && !message.boat.seats.includes(secondJoined.id)
  ));
  assert.ok(cleared, '死亡后应自动释放船位');

  await new Promise((resolve) => setTimeout(resolve, 5200));
  second.send({ type: 'respawn' });
  const respawned = await second.waitFor('respawned');
  assert.ok(Number(respawned.pos.x) > 65, '外海死亡后应优先在外海平台复活');

  console.log(JSON.stringify({
    ok: true,
    helm: helmAck.seat,
    crew: crewAck.seat,
    invite: true,
    movedBoatX: moved.boat.x,
    crewBoundToBoat: true,
    movingLeaveBlocked: true,
    externalLanding: leaveAck.pos,
    deathReleasedSeat: true,
    externalRespawn: respawned.pos
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}).finally(() => {
  for (const ws of clients) {
    try { ws.close(); } catch (error) { /* ignore */ }
  }
  setTimeout(() => process.exit(process.exitCode || 0), 100);
});
