'use strict';

const assert = require('node:assert/strict');
const createSedan = require('../services/sedan');
const rules = require('../public/js/sedan-rules');

const players = new Map();
const sent = [];
const driver = {
  id: 'p1',
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
const resident = {
  id: 'p2',
  ws: { readyState: 1 },
  joined: true,
  alive: true,
  active: true,
  inQingyun: false,
  mapId: 'dustfall',
  boatSeat: null,
  carSeat: null,
  carId: null,
  pos: { x: rules.start.x, y: rules.start.y, z: rules.start.z + 4 }
};
players.set(driver.id, driver);
players.set(resident.id, resident);

const sedan = createSedan(players, (_ws, message) => sent.push(message), () => false);
const initial = sedan.snapshot('dustfall', driver);
assert.ok(initial?.id, '西部荒原开局应有一辆轿车');
assert.equal(initial.map, 'dustfall');
assert.ok(initial.seats.every(id => id == null), '开局轿车不应载有任何玩家');

sedan.handle(driver, { type: 'sedanBoard', carId: initial.id }, 1000);
const boarded = sent.at(-1);
assert.equal(boarded.reason, 'board');
assert.equal(boarded.car.seat, 0);
assert.equal(driver.carId, initial.id);

let now = 1100;
const destination = { x: 0, z: -15996, y: 16 };
for (let step = 1; step <= 18; step += 1) {
  const ratio = step / 18;
  const x = initial.x + (destination.x - initial.x) * ratio;
  const z = initial.z + (destination.z - initial.z) * ratio;
  const heading = rules.start.heading - step * .24;
  sedan.handle(driver, {
    type: 'sedanPose',
    revision: initial.revision,
    pose: { x, y: 16, z, heading, speed: 0 }
  }, now);
  now += 100;
}

const arrived = sedan.snapshot('dustfall', driver);
assert.ok(Math.hypot(arrived.x - destination.x, arrived.z - destination.z) < 2, '测试车应抵达西部荒原出口');
sedan.handle(driver, { type: 'sedanPortal', revision: arrived.revision, destination: 'qingyun' }, now);

const travel = sent.find(message => message.type === 'sedanTravel');
assert.ok(travel, '车辆离开西部荒原后应向车内玩家发送跨图状态');
assert.equal(travel.car.id, initial.id, '原车应继续载着驾驶员进入青云宗');
assert.equal(travel.car.map, 'qingyun');
assert.equal(travel.car.seat, 0);
assert.equal(driver.inQingyun, true);
assert.equal(driver.mapId, null);

const replacement = sedan.snapshot('dustfall', resident);
assert.ok(replacement?.id, '车辆开走后西部荒原必须重新生成轿车');
assert.notEqual(replacement.id, initial.id, '重新生成的轿车应使用独立 ID');
assert.equal(replacement.map, 'dustfall');
assert.ok(replacement.seats.every(id => id == null), '重新生成的轿车必须为空车');
assert.ok(Math.hypot(replacement.x - rules.start.x, replacement.z - rules.start.z) < .01,
  '重新生成的轿车应位于西部荒原出生点');

const qingyunCar = sedan.snapshot('qingyun', driver);
assert.equal(qingyunCar.id, initial.id, '青云宗内仍应显示原来那辆车');
assert.equal(qingyunCar.seat, 0, '驾驶员应保持驾驶席状态');

const secondResident = { ...resident, id: 'p3', carSeat: null, carId: null };
players.set(secondResident.id, secondResident);
secondResident.pos = { ...rules.start };
sedan.handle(secondResident, { type: 'sedanBoard', carId: replacement.id }, now + 200);
assert.equal(secondResident.carId, replacement.id, '其他玩家应能驾驶荒原新生成的轿车');

console.log(JSON.stringify({
  ok: true,
  originalCar: initial.id,
  replacementCar: replacement.id,
  originalMap: travel.car.map,
  replacementEmpty: replacement.seats.every(id => id == null)
}, null, 2));
