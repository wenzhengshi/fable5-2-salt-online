'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createRegistry, LIMITS } = require('../services/roadSigns');

const temporaryDirectories = [];
const hour = 60 * 60000;

async function registry(limits) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'saltline-sign-test-'));
  temporaryDirectories.push(dir);
  return createRegistry({ dir, limits });
}

function player(now, index = 0) {
  return {
    mapId: 'qingyun',
    inQingyun: true,
    alive: true,
    active: true,
    focusUntil: 0,
    soldier: 'classic',
    signOwner: String(index + 1).padStart(2, '0').repeat(32),
    clientId: 'client-' + index,
    fingerprint: 'fingerprint-' + index,
    ip: index % 2 ? '198.51.100.10' : '203.0.113.10',
    pos: { x: 80, y: 7.1, z: -500 },
    now
  };
}

async function place(store, actor, point, now, text = '测试路牌') {
  actor.pos = { ...point, y: 7.1 };
  return store.mutate(actor, {
    type: 'signPlace',
    pos: { ...point, y: 7.1 },
    text,
    style: 'blue'
  }, now);
}

function spacedPoints() {
  const points = [];
  for (const z of [-500, -450, -400]) {
    for (const x of [-120, -80, -40, 0, 40, 80, 120]) points.push({ x, z });
  }
  return points;
}

async function dailyAndBurstable() {
  const store = await registry();
  const start = Date.UTC(2026, 10, 15, 2, 0, 0);
  const points = spacedPoints();
  const actor = player(start, 0);

  for (let index = 0; index < LIMITS.ownerDaily; index += 1) {
    const result = await place(store, actor, points[index], start + index * 6 * 60000);
    assert.ok(result.sign, '每日上限内的路牌应成功创建');
    assert.equal(result.remaining, LIMITS.ownerDaily - index - 1);
  }

  const blockedDaily = await place(store, actor, points[10], start + 60 * 60000);
  assert.equal(blockedDaily.reason, 'daily', '同一身份每日第 11 块必须被拒绝');

  const cookieRotated = player(start + 60 * 60000, 0);
  cookieRotated.signOwner = 'ff'.repeat(32);
  const blockedClient = await place(store, cookieRotated, points[11], start + 60 * 60000);
  assert.equal(blockedClient.reason, 'daily', '轮换 Cookie 后仍应受浏览器身份每日上限约束');
}

async function shortTermRateLimit() {
  const store = await registry();
  const start = Date.UTC(2026, 10, 15, 5, 0, 0);
  const points = spacedPoints();
  const actor = player(start, 2);

  assert.ok((await place(store, actor, points[0], start)).sign);
  assert.equal((await place(store, actor, points[1], start + 1000)).reason, 'cooldown');
  assert.ok((await place(store, actor, points[1], start + LIMITS.ownerMinIntervalMs)).sign);
  assert.ok((await place(store, actor, points[2], start + LIMITS.ownerMinIntervalMs + 9000)).sign);
  assert.equal((await place(store, actor, points[3], start + LIMITS.ownerMinIntervalMs + 18000)).reason, 'burst');
}

async function networkAreaLimit() {
  const store = await registry();
  const start = Date.UTC(2026, 10, 15, 8, 0, 0);
  const center = { x: 80, z: -500 };
  const points = Array.from({ length: 7 }, (_, index) => {
    const angle = index * Math.PI * 2 / 7;
    return { x: center.x + Math.cos(angle) * 10, z: center.z + Math.sin(angle) * 10 };
  });

  for (let index = 0; index < LIMITS.densityNetwork; index += 1) {
    const actor = player(start + index * 2000, 10 + index);
    actor.ip = '192.0.2.44';
    assert.ok((await place(store, actor, points[index], start + index * 2000)).sign);
  }

  const intruder = player(start + LIMITS.densityNetwork * 2000, 30);
  intruder.ip = '192.0.2.44';
  const blocked = await place(store, intruder, points[6], start + LIMITS.densityNetwork * 2000);
  assert.equal(blocked.reason, 'networkLimit', '同一网络在区域内的路牌数量必须受限');
}

async function networkMapLimit() {
  const store = await registry({ networkMapLimit: 2 });
  const start = Date.UTC(2026, 10, 15, 9, 0, 0);
  const points = spacedPoints();
  for (let index = 0; index < 2; index += 1) {
    const actor = player(start + index * 2000, 30 + index);
    actor.ip = '198.18.0.8';
    assert.ok((await place(store, actor, points[index], start + index * 2000)).sign);
  }
  const intruder = player(start + 4000, 32);
  intruder.ip = '198.18.0.8';
  const blocked = await place(store, intruder, points[2], start + 4000);
  assert.equal(blocked.reason, 'networkLimit', '同一网络在单地图的活跃路牌总量必须受限');
}

async function mapCapacity() {
  const store = await registry({ mapTotal: 2 });
  const start = Date.UTC(2026, 10, 16, 3, 0, 0);
  const points = spacedPoints();
  assert.ok((await place(store, player(start, 40), points[0], start)).sign);
  assert.ok((await place(store, player(start + 2000, 41), points[1], start + 2000)).sign);
  const blocked = await place(store, player(start + 4000, 42), points[2], start + 4000);
  assert.equal(blocked.reason, 'mapFull', '单地图总容量必须拒绝继续写入');
}

async function placementPrecheck() {
  const store = await registry();
  const now = Date.UTC(2026, 10, 15, 2, 0, 0);
  const author = player(now);
  const visitor = player(now, 1);
  const point = { ...author.pos };
  assert.equal((await store.checkPlacement(visitor, point)).reason, undefined);
  assert.deepEqual(await store.list('qingyun', point, visitor.signOwner), []);
  assert.ok((await place(store, author, point, now)).sign);

  const occupied = { ...point, x: point.x + 2.5 };
  assert.equal((await store.checkPlacement(visitor, occupied)).reason, 'occupied');
  assert.equal((await store.checkPlacement(visitor, { ...point, x: point.x + 3 })).reason, undefined);
  assert.equal((await store.checkPlacement(visitor, { ...point, x: point.x + 6 })).reason, 'range');
  // The check never reserves the point. A later submission must still reject a new conflict.
  assert.equal((await place(store, visitor, occupied, now + 2000)).reason, 'occupied');
}

async function main() {
  await placementPrecheck();
  await dailyAndBurstable();
  await shortTermRateLimit();
  await networkAreaLimit();
  await networkMapLimit();
  await mapCapacity();
  console.log(JSON.stringify({
    ok: true,
    ownerDaily: LIMITS.ownerDaily,
    ownerMinIntervalMs: LIMITS.ownerMinIntervalMs,
    ownerBurstLimit: LIMITS.ownerBurstLimit,
    networkDaily: LIMITS.networkDaily,
    networkMapLimit: LIMITS.networkMapLimit,
    networkAreaSigns: LIMITS.densityNetwork,
    mapTotal: LIMITS.mapTotal,
    checks: ['placement-precheck', 'daily-limit', 'cookie-rotation', 'cooldown', 'burst', 'network-density', 'network-map', 'map-capacity']
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}).finally(async () => {
  await Promise.all(temporaryDirectories.map(dir => fs.rm(dir, { recursive: true, force: true })));
});
