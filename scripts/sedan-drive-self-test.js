'use strict';

const assert = require('node:assert/strict');
const createSedan = require('../services/sedan');
const rules = require('../public/js/sedan-rules');

function run(value, throttle, brake, seconds) {
  const dt = 1 / 120;
  for (let t = 0; t < seconds; t += dt) value = rules.stepSpeed(value, throttle, brake, dt, false);
  return value;
}

assert.ok(rules.maxSpeed >= 20, '前进极速应提升到 20 米/秒以上');
assert.ok(rules.maxReverse >= 8, '倒车极速应提升到 8 米/秒以上');
assert.ok(rules.exits(0).length >= 10, '下车点应包含车门与前后左右兜底位置');

const accelerated = run(0, 1, false, 1);
assert.ok(accelerated > 10, '全油门 1 秒应达到 10 米/秒以上');
const reversed = run(0, -1, false, 1);
assert.ok(reversed < -7, '全倒车 1 秒应达到 7 米/秒以上');

let coasting = rules.maxSpeed;
for (let t = 0; t < 3.2; t += 1 / 120) coasting = rules.stepSpeed(coasting, 0, false, 1 / 120, false);
assert.equal(coasting, 0, '松开油门后应自动驻车，不再长时间滑行');

let braking = rules.maxSpeed;
for (let t = 0; t < .7; t += 1 / 120) braking = rules.stepSpeed(braking, 1, true, 1 / 120, false);
assert.equal(braking, 0, '按住刹车 0.7 秒内应完全停稳');

let counterBraking = rules.maxSpeed;
for (let t = 0; t < .8; t += 1 / 120) counterBraking = rules.stepSpeed(counterBraking, -1, false, 1 / 120, false);
assert.ok(counterBraking <= 0, '高速前进时按倒车键应先全力制动，再进入倒车');

assert.ok(rules.steerLimit(0) > rules.steerLimit(rules.maxSpeed), '低速转向角应大于高速转向角');
assert.ok(rules.turnRate(.5, 10) > 0, '前进时应按转向输入改变朝向');
assert.ok(rules.turnRate(.5, -10) < 0, '倒车时转向方向应随车速反向');
assert.ok(Math.abs(rules.turnRate(-rules.steerLimit(rules.maxSpeed), rules.maxSpeed)) <= 1.9 + .12 / .28,
  '高速最大转向角速度不得超出服务端单帧校验');

assert.equal(rules.hudVisible({ present: true, alive: true }), true, '地面驾驶时应显示轿车 HUD');
assert.equal(rules.hudVisible({ present: true, alive: true, portalFall: true }), false,
  '角色传送下落时不应显示刹车按钮和旁边的空按钮');
assert.equal(rules.hudVisible({ present: true, alive: true, airborne: true }), false,
  '运输机跳伞时应隐藏轿车 HUD');
assert.equal(rules.hudVisible({ present: true, alive: true, carFall: true }), false,
  '轿车空降动画期间应隐藏轿车 HUD');
assert.equal(rules.hudVisible({ present: false, alive: true }), false, '没有车辆状态时不应显示 HUD');
assert.equal(rules.hudVisible({ present: true, alive: false }), false, '阵亡后不应显示 HUD');

const players = new Map();
const sent = [];
const driver = {
  id: 'drive-1',
  ws: { readyState: 1 },
  joined: true,
  alive: true,
  active: true,
  inQingyun: false,
  mapId: 'dustfall',
  boatSeat: null,
  carSeat: null,
  carId: null,
  pos: { ...rules.start }
};
const walker = { ...driver, id: 'drive-2', pos: { x: rules.start.x, y: rules.start.y, z: rules.start.z + 4 } };
players.set(driver.id, driver);
players.set(walker.id, walker);

const sedan = createSedan(players, (_ws, message) => sent.push(message), () => false);
const car = sedan.snapshot('dustfall', driver);
assert.ok(car?.id, '西部荒原应存在可驾驶轿车');
sedan.handle(driver, { type: 'sedanBoard', carId: car.id }, 1000);
assert.equal(driver.carSeat, 0, '驾驶员应成功上车');

const pose = (speed, at) => sedan.handle(driver, {
  type: 'sedanPose',
  revision: car.revision,
  pose: { x: car.x, y: car.y, z: car.z, heading: car.heading, speed }
}, at);

pose(6, 1100);
sedan.handle(driver, { type: 'sedanLeave', index: 0 }, 1180);
assert.equal(sent.at(-1).reason, 'moving', '高速时仍应拒绝下车');

sedan.handle(driver, { type: 'sedanLeave', index: 0, speed: 0, park: true }, 1220);
assert.equal(sent.at(-1).reason, 'leave', '驾驶员带驻车意图时应直接驻车并下车');
assert.equal(driver.carSeat, null, '下车后应释放驾驶席');
assert.equal(sent.at(-1).car.seat, null, '下车结果不应继续标记座位');
assert.ok(Number.isFinite(sent.at(-1).position.x) && Number.isFinite(sent.at(-1).position.z),
  '下车应返回有效落点');
assert.equal(sedan.snapshot('dustfall', walker).speed, 0, '下车后车辆应保持驻车');

sedan.handle(driver, { type: 'sedanBoard', carId: car.id }, 1400);
assert.equal(driver.carSeat, 0, '停稳后应能再次上车');
sedan.handle(driver, { type: 'sedanLeave', index: 999 }, 1500);
assert.equal(sent.at(-1).reason, 'leave', '非法落点序号应回退到安全车门，而不是卡死');

sedan.handle(driver, { type: 'sedanBoard', carId: car.id }, 1540);
assert.equal(driver.carSeat, 0, '驾驶员应能重新回到驾驶席');
walker.pos = { x: car.x + 1, y: car.y, z: car.z };
sedan.handle(walker, { type: 'sedanBoard', carId: car.id }, 1600);
assert.equal(sent.at(-1).reason, 'board', '好友应能坐上副驾驶席');
assert.equal(walker.carSeat, 1, '好友应占用第一个空座');

pose(6, 1700);
sedan.handle(walker, { type: 'sedanLeave', index: 0, speed: 0, park: true }, 1780);
assert.equal(sent.at(-1).reason, 'moving', '乘客不能在车辆高速行驶时自行开门');
sedan.handle(driver, { type: 'sedanLeave', index: 0, speed: 0, park: true }, 1860);
assert.equal(sent.at(-1).reason, 'leave', '驾驶员驻车后应能下车');
assert.equal(driver.carSeat, null);
assert.equal(walker.carSeat, 1, '驾驶员下车不应挤掉乘客');
sedan.handle(walker, { type: 'sedanLeave', index: 1 }, 1940);
assert.equal(sent.at(-1).reason, 'leave', '车辆停稳后乘客也应能下车');

sedan.handle(walker, { type: 'sedanLeave', index: 0 }, 2020);
assert.equal(sent.at(-1).reason, 'not-riding', '未乘车时也应返回明确结果，避免客户端空等');

console.log(JSON.stringify({
  ok: true,
  maxSpeed: rules.maxSpeed,
  maxReverse: rules.maxReverse,
  exitPoints: rules.exits(0).length,
  accelerated: +accelerated.toFixed(2),
  reversed: +reversed.toFixed(2),
  coasting,
  braking
}, null, 2));
