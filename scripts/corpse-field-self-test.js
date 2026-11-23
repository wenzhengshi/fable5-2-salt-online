'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { landingSurface } = require('../services/portalBosses');
const boxes = require('../services/portal-boss-world.json');

const box = boxes.port.boxes[0];
const boxX = (box[0] + box[3]) / 2;
const boxZ = (box[2] + box[5]) / 2;
assert.equal(landingSurface('port', boxX, boxZ, 1).surface, 'ground');
const onBox = landingSurface('port', boxX, boxZ, box[4] + 0.5);
assert.equal(onBox.surface, 'object');
assert.ok(Math.abs(onBox.y - box[4]) < 0.001);
assert.deepEqual(landingSurface('unknown', 0, 0, 8, 4), { y: 4, surface: 'ground' });

const tempRoot = path.join(__dirname, '..', '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(tempRoot, 'corpse-field-self-test-'));
process.env.JICREATE_DATA_DIR = dataDir;
const corpseFieldPath = require.resolve('../services/corpseField');
const storagePath = require.resolve('../config/storage');

function freshField() {
  delete require.cache[corpseFieldPath];
  delete require.cache[storagePath];
  return require(corpseFieldPath);
}

try {
  const field = freshField();
  const now = Date.now();

  const ground = field.addMachine({
    id: 'test-drone-ground',
    at: now,
    kind: 'drone',
    pos: { x: 12, y: 0, z: 14 },
    surface: 'ground',
    victimId: 'machine-ground',
    shooterId: 'tester',
    shooterName: 'TESTER'
  });
  assert.ok(ground, '地面无人机尸体应写入服务端记录');
  const settledGround = field.settle({
    id: ground.id,
    at: now,
    pos: { x: 12.5, y: 0, z: 14.5 },
    surface: 'ground',
    reporter: { id: 'tester', pos: { x: 12.5, y: 0, z: 14.5 } }
  });
  assert.equal(settledGround.settled, true);
  assert.equal(settledGround.surface, 'ground');
  assert.deepEqual(settledGround.pos, { x: 12.5, y: 0, z: 14.5 });

  const object = field.addMachine({
    id: 'test-drone-object',
    at: now + 10,
    kind: 'drone',
    pos: { x: boxX, y: box[4], z: boxZ },
    surface: 'object',
    victimId: 'machine-object',
    shooterId: 'tester',
    shooterName: 'TESTER'
  });
  assert.ok(object, '物体上的无人机尸体应写入服务端记录');
  assert.equal(object.surface, 'object');
  const settledObject = field.settle({
    id: object.id,
    at: now + 10,
    pos: { x: boxX, y: box[4], z: boxZ },
    surface: 'object',
    reporter: { id: 'tester', pos: { x: boxX, y: box[4], z: boxZ } }
  });
  assert.ok(settledObject, '从地面高度落到物体表面时仍应接受最终落点');
  assert.equal(settledObject.settled, true);
  assert.equal(settledObject.surface, 'object');
  assert.equal(settledObject.pos.y, box[4]);

  const player = field.addPlayer({
    id: 'test-player-skin',
    at: now + 20,
    pos: { x: 4, y: 0, z: 6 },
    yaw: 0.4,
    playerId: 'victim-skin',
    name: 'SKIN TEST',
    soldier: 'male',
    outfit: 'frost',
    shooterId: 'tester',
    shooterName: 'TESTER'
  });
  assert.ok(player, '玩家尸体应写入服务端记录');
  assert.equal(player.outfit, 'frost', '尸体记录必须保留被击倒时穿戴的皮肤');
  const settledPlayer = field.settle({
    id: player.id,
    at: now + 20,
    pos: { x: 4.5, y: 0, z: 6.5 },
    surface: 'ground',
    reporter: { id: 'victim-skin', pos: { x: 4.5, y: 0, z: 6.5 } }
  });
  assert.ok(settledPlayer, '玩家尸体落点应更新');
  assert.equal(settledPlayer.outfit, 'frost', '落点更新不能覆盖击倒时的皮肤');

  const hound = field.addMachine({
    id: 'test-hound-pose',
    at: now - 100,
    kind: 'hound',
    pos: { x: 8, y: 0, z: 8 },
    yaw: 0,
    surface: 'ground',
    victimId: 'machine-hound-pose',
    shooterId: 'tester',
    shooterName: 'TESTER'
  });
  assert.ok(hound, '机器狗尸体应写入服务端记录');
  const posed = field.setPose({
    id: 'test-hound-pose',
    at: now - 100,
    pos: { x: 8.15, y: 0, z: 8.05 },
    pose: {
      yaw: 1.25,
      bodyPos: [0.01, 0.36, 0],
      bones: {
        body: [0, 0.2, 0, 0.9798],
        head: [0.05, 0, 0, 0.9987],
        notABone: [1, 0, 0, 0]
      }
    },
    reporter: { id: 'tester', pos: { x: 8, y: 0, z: 8 } }
  });
  assert.ok(posed, '机器狗死亡姿态应写入同一条尸体记录');
  assert.equal(posed.pose.yaw, 1.25, '姿态应保留死亡瞬间朝向');
  assert.equal(posed.pos.x, 8.15, '姿态补报应同步最终机身坐标');
  assert.equal(posed.pos.z, 8.05, '姿态补报应同步最终机身坐标');
  assert.deepEqual(posed.pose.bodyPos, [0.01, 0.36, 0], '姿态应保留机身高度');
  assert.ok(posed.pose.bones.body, '姿态应保留机身骨骼旋转');
  assert.equal(posed.pose.bones.notABone, undefined, '姿态只接受已登记的骨骼名');
  assert.equal(field.setPose({
    id: 'test-player-skin',
    pose: { yaw: 0, bones: { body: [0, 0, 0, 1] } },
    reporter: { id: 'tester', pos: { x: 4, y: 0, z: 6 } }
  }), null, '玩家尸体不应接受机器骨骼姿态');

  assert.equal(field.flush(), true);
  const file = path.join(dataDir, field.FILE);
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const byId = new Map(rows.map((row) => [row.id, row]));
  assert.equal(byId.get('test-drone-ground').surface, 'ground');
  assert.equal(byId.get('test-drone-object').surface, 'object');
  assert.equal(byId.get('test-drone-object').settled, true);
  assert.equal(byId.get('test-player-skin').outfit, 'frost');
  assert.equal(byId.get('test-hound-pose').pose.yaw, 1.25);
  assert.ok(byId.get('test-hound-pose').pose.bones.body, '姿态应随尸体记录落盘');

  const restarted = freshField();
  const snapshot = restarted.snapshot({ limit: 10 });
  const restored = new Map(snapshot.corpses.map((row) => [row.id, row]));
  assert.equal(restored.get('test-drone-ground').surface, 'ground');
  assert.equal(restored.get('test-drone-object').surface, 'object');
  assert.equal(restored.get('test-drone-object').pos.y, box[4]);
  assert.equal(restored.get('test-player-skin').outfit, 'frost', '重启后尸体皮肤仍应保留');
  assert.equal(restored.get('test-hound-pose').pose.yaw, 1.25, '重启后机器狗死亡姿态仍应保留');

  const beforeBulk = restarted.size();
  for (let index = 0; index < 650; index += 1) {
    restarted.addMachine({
      id: 'bulk-corpse-' + index,
      at: now + index * 4,
      kind: 'hound',
      pos: { x: 100 + (index % 20) * 5, y: 0, z: 100 + Math.floor(index / 20) * 5 },
      victimId: 'bulk-machine-' + index,
      shooterId: 'tester'
    });
  }
  assert.equal(restarted.size(), beforeBulk + 650, '尸体实时缓存不应再限制总量');
  const fullSnapshot = restarted.snapshot();
  assert.equal(fullSnapshot.corpses.length, beforeBulk + 650, '快照默认应返回全部尸体');
  assert.equal(restarted.snapshot({ limit: 10 }).corpses.length, 10, '显式 limit 仍应生效');

  const pageIds = new Set();
  let before = restarted.latestSeq() + 1;
  let pageCount = 0;
  while (before && pageCount < 100) {
    const page = restarted.historyPage({ before, limit: 40 });
    assert.ok(page.corpses.length <= 40, '尸体历史每页不应超过请求条数');
    for (const row of page.corpses) pageIds.add(row.id);
    pageCount += 1;
    if (page.complete) break;
    assert.ok(page.nextBefore > 0 && page.nextBefore < before, '分页游标必须持续向旧记录推进');
    before = page.nextBefore;
  }
  assert.equal(pageIds.size, beforeBulk + 650, '分页应覆盖全部尸体记录');

  const cursor = restarted.cursor();
  const deltaCorpse = restarted.addMachine({
    id: 'delta-corpse',
    at: now + 9000,
    kind: 'drone',
    pos: { x: 300, y: 0, z: 300 },
    victimId: 'delta-machine',
    shooterId: 'tester'
  });
  const delta = restarted.sync(cursor);
  assert.equal(delta.partial, true, '游标同步应只返回新增或修改记录');
  assert.ok(delta.corpses.some((row) => row.id === deltaCorpse.id), '游标同步应包含新尸体');
  assert.equal(restarted.sync(restarted.cursor()), null, '游标未变化时应返回 204 语义');
  console.log('corpse-field self test passed');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
