'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { WebSocket } = require('ws');
const rules = require('../public/js/sedan-rules');
const { attachMultiplayer, shutdownMultiplayer } = require('../realtime/multiplayer');

const clients = [];
let server;
let sockets;

function connect(url, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messages = [];
    const waiters = [];
    const timer = setTimeout(() => reject(new Error(name + ' connection timeout')), 7000);
    ws.on('open', () => {
      clearTimeout(timer);
      clients.push(ws);
      resolve({
        ws,
        send(payload) {
          ws.send(JSON.stringify(payload));
        },
        waitFor(type, predicate, timeout = 5000) {
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
              rejectWait(new Error(name + ' timed out waiting for ' + type));
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

const settle = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

function state(pos) {
  return {
    type: 'state',
    pos,
    yaw: 0,
    pitch: 0,
    active: true,
    visible: true,
    moving: false,
    sprint: false
  };
}

async function moveTo(client, from, to) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(distance / 5));
  for (let step = 1; step <= steps; step += 1) {
    const ratio = step / steps;
    client.send(state({
      x: from.x + (to.x - from.x) * ratio,
      y: to.y,
      z: from.z + (to.z - from.z) * ratio
    }));
    await settle(170);
  }
  return { ...to };
}

async function main() {
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
  });
  sockets = attachMultiplayer(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = 'ws://127.0.0.1:' + server.address().port + '/ws';

  const leader = await connect(url, 'car-leader');
  const friend = await connect(url, 'car-friend');
  leader.send({ type: 'join', name: 'CAR-LEAD', soldier: 'classic', spawns: [{ x: 0, y: 0, z: 4 }] });
  friend.send({ type: 'join', name: 'CAR-FRIEND', soldier: 'female', spawns: [{ x: 0, y: 0, z: 4 }] });
  const leaderJoined = await leader.waitFor('joined');
  const friendJoined = await friend.waitFor('joined');

  leader.send({ type: 'spawnMap', map: 'dustfall' });
  friend.send({ type: 'spawnMap', map: 'dustfall' });
  const leaderSpawn = await leader.waitFor('spawnMapResult', (message) => message.ok === true);
  const friendSpawn = await friend.waitFor('spawnMapResult', (message) => message.ok === true);
  leader.send(state(leaderSpawn.pos));
  friend.send(state(friendSpawn.pos));

  const carSnapshot = await leader.waitFor('snapshot', (message) => (
    message.sedan && message.sedan.map === 'dustfall'
  ));
  const car = carSnapshot.sedan;
  const leaderNear = await moveTo(leader, leaderSpawn.pos, {
    x: car.x - 1,
    y: car.y,
    z: car.z
  });
  const friendNear = await moveTo(friend, friendSpawn.pos, {
    x: car.x + 1,
    y: car.y,
    z: car.z
  });

  leader.send({ type: 'sedanBoard', carId: car.id });
  const boarded = await leader.waitFor('sedanResult', (message) => message.reason === 'board');
  assert.equal(boarded.car.seat, 0, '队长应坐上驾驶席');

  friend.send({ type: 'followInvite', targetId: leaderJoined.id });
  const inviteSent = await friend.waitFor('followInviteSent');
  assert.equal(inviteSent.target.id, leaderJoined.id, '队长在车内时仍应允许发送好友请求');
  const invite = await leader.waitFor('followInviteReceived', (message) => message.from.id === friendJoined.id);
  assert.ok(invite.expiresAt > Date.now());

  leader.send({ type: 'followInviteResponse', fromId: friendJoined.id, accept: true });
  const started = await friend.waitFor('followState', (message) => (
    message.event === 'started' && message.following && message.following.id === leaderJoined.id
  ));
  const anchor = started.following.anchor;
  assert.ok(anchor, '好友在车内时也应返回跟随落点');
  assert.ok(Math.hypot(anchor.x - car.x, anchor.z - car.z) <= rules.halfLength + 3,
    '跟随落点应位于车辆车门附近');

  await settle(120);
  friend.send({ type: 'sedanBoard', carId: car.id });
  const friendBoarded = await friend.waitFor('sedanResult', (message) => message.reason === 'board');
  assert.equal(friendBoarded.car.seat, 1, '跟随好友应能坐上副驾驶席');
  const followEnded = await friend.waitFor('followState', (message) => (
    message.event === 'ended' && message.reason === 'busy'
  ));
  assert.equal(followEnded.following, null, '好友上车后应结束地面跟随，避免与座位争抢');

  await settle(120);
  leader.send({
    type: 'sedanPose',
    revision: car.revision,
    pose: { x: car.x, y: car.y, z: car.z, heading: car.heading, speed: 6 }
  });
  await settle(180);
  friend.send({ type: 'sedanLeave', index: 0, speed: 0, park: true });
  const passengerDenied = await friend.waitFor('sedanResult', (message) => message.reason === 'moving');
  assert.ok(passengerDenied.car.seat === 1, '高速时乘客应留在座位');

  leader.send({ type: 'sedanLeave', index: 0, speed: 0, park: true });
  const driverLeft = await leader.waitFor('sedanResult', (message) => message.reason === 'leave');
  assert.equal(driverLeft.car.seat, null, '驾驶员带驻车意图时不应卡在自动驻车');
  assert.equal(driverLeft.car.speed, 0, '驾驶员下车后车辆必须驻车');

  friend.send({ type: 'sedanLeave', index: 1, speed: 0 });
  const friendLeft = await friend.waitFor('sedanResult', (message) => message.reason === 'leave');
  assert.equal(friendLeft.car.seat, null, '车辆停稳后乘客应能正常下车');

  console.log(JSON.stringify({
    ok: true,
    carId: car.id,
    leaderNear,
    friendNear,
    driverSeat: boarded.car.seat,
    friendSeat: friendBoarded.car.seat,
    followWhileLeaderInCar: true,
    driverAutoParkExit: true,
    passengerHighSpeedBlocked: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}).finally(async () => {
  for (const ws of clients) {
    try { ws.close(); } catch (error) { /* ignore */ }
  }
  shutdownMultiplayer();
  if (sockets) {
    await new Promise((resolve) => sockets.close(resolve));
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  setTimeout(() => process.exit(process.exitCode || 0), 140);
});
