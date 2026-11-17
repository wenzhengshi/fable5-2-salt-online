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
    const timer = setTimeout(() => reject(new Error(name + ' connection timeout')), 7000);
    ws.on('open', () => {
      clearTimeout(timer);
      clients.push(ws);
      resolve({
        ws,
        messages,
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

function state(x, z, yaw = 0, y = 0) {
  return {
    type: 'state',
    pos: { x, y, z },
    yaw,
    pitch: 0,
    active: true,
    visible: true,
    moving: false,
    sprint: false
  };
}

async function settle(ms = 180) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const follower = await connect('follower');
  const leader = await connect('leader');
  const spawns = [{ x: 29, y: 0, z: 21 }];

  follower.send({ type: 'join', name: 'FOLLOW-A', soldier: 'classic', spawns });
  leader.send({ type: 'join', name: 'FOLLOW-B', soldier: 'female', spawns });
  const followerJoined = await follower.waitFor('joined');
  const leaderJoined = await leader.waitFor('joined');

  follower.send(state(29, 21));
  leader.send(state(31, 21));
  await settle();

  follower.send({ type: 'followInvite', targetId: leaderJoined.id });
  const sent = await follower.waitFor('followInviteSent');
  assert.equal(sent.target.id, leaderJoined.id, '好友请求应指向目标玩家');
  const invite = await leader.waitFor('followInviteReceived', (message) => message.from.id === followerJoined.id);
  assert.ok(invite.expiresAt > Date.now(), '好友请求应带有效期');

  leader.send({ type: 'followInviteResponse', fromId: followerJoined.id, accept: true });
  const accepted = await follower.waitFor('followInviteResult', (message) => message.accepted === true);
  assert.equal(accepted.target.id, leaderJoined.id, '请求方应收到接受结果');
  const started = await follower.waitFor('followState', (message) => (
    message.event === 'started' && message.following && message.following.id === leaderJoined.id
  ));
  assert.equal(started.friends.some((friend) => friend.id === leaderJoined.id), true, '接受后应成为好友');
  const followedNotice = await leader.waitFor('followState', (message) => (
    message.event === 'followerJoined' && message.follower.id === followerJoined.id
  ));
  assert.equal(followedNotice.followers.some((friend) => friend.id === followerJoined.id), true, '目标方应看到跟随者');

  for (let step = 1; step <= 12; step += 1) {
    leader.send(state(31 + step * 0.8, 21 + step * 0.4, 0.2, 4 + step * 0.4));
    await settle(110);
  }
  const leaderSnapshot = await leader.waitFor('snapshot', (message) => (
    message.you && message.you.follow &&
    message.you.follow.followers.some((friend) => friend.id === followerJoined.id) &&
    message.players.some((player) => player.id === leaderJoined.id && player.z > 25 && player.y > 7)
  ));
  const leaderPose = leaderSnapshot.players.find((player) => player.id === leaderJoined.id);
  assert.ok(leaderPose, '目标玩家应存在于快照中');
  const followSnapshot = await follower.waitFor('snapshot', (message) => (
    message.you && message.you.follow && message.you.follow.following &&
    message.you.follow.following.id === leaderJoined.id &&
    message.you.follow.following.anchor && message.you.follow.following.anchor.z > 23
  ));
  const followerPose = followSnapshot.players.find((player) => player.id === followerJoined.id);
  assert.ok(followerPose, '跟随者应存在于快照中');
  const anchor = followSnapshot.you.follow.following.anchor;
  assert.ok(anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.z), '跟随帧应返回落点');
  assert.ok(anchor.y > 7, '跟随落点应采纳好友当前海拔，而不是跟随开始时的旧高度');
  assert.ok(Math.abs(anchor.y - leaderPose.y) < 0.25, '跟随落点海拔应与好友保持一致');
  assert.ok(Math.hypot(followerPose.x - anchor.x, followerPose.z - anchor.z) < 0.35, '服务端应把跟随者贴到好友身后');
  assert.ok(followerPose.y > 7, '跟随者应同步到好友所在高度，不能穿入地形下方');
  assert.ok(Math.hypot(followerPose.x - leaderPose.x, followerPose.z - leaderPose.z) < 3.2, '跟随距离应保持在好友附近');

  follower.send({ type: 'followLeave' });
  const ended = await follower.waitFor('followState', (message) => (
    message.event === 'ended' && message.reason === 'manual'
  ));
  assert.equal(ended.following, null, '取消后不应再返回跟随目标');
  assert.ok(ended.friends.some((friend) => friend.id === leaderJoined.id), '取消跟随应保留好友关系');
  await leader.waitFor('followState', (message) => (
    message.event === 'followerLeft' && message.follower.id === followerJoined.id
  ));

  const friendSnapshot = await follower.waitFor('snapshot', (message) => (
    message.you && message.you.follow && message.you.follow.following === null &&
    message.you.follow.friends.some((friend) => friend.id === leaderJoined.id)
  ));
  assert.equal(friendSnapshot.you.follow.following, null, '取消跟随不应删除好友关系');

  follower.send({ type: 'followInvite', targetId: leaderJoined.id });
  const direct = await follower.waitFor('followState', (message) => (
    message.event === 'started' && message.source === 'friend'
  ));
  assert.equal(direct.following.id, leaderJoined.id, '好友再次点击跟随应直接生效');
  follower.send({ type: 'followLeave' });
  await follower.waitFor('followState', (message) => message.event === 'ended');

  console.log(JSON.stringify({
    ok: true,
    invited: true,
    acceptedAutoFollow: true,
    followerId: followerJoined.id,
    leaderId: leaderJoined.id,
    followerPose,
    leaderPose,
    anchor,
    friendRetained: true,
    directFriendFollow: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}).finally(() => {
  for (const ws of clients) {
    try { ws.close(); } catch (error) { /* ignore */ }
  }
  setTimeout(() => process.exit(process.exitCode || 0), 120);
});
