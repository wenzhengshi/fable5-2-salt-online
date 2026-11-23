#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tempRoot = path.join(__dirname, '..', '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(tempRoot, 'grounded-drops-'));
process.env.JICREATE_DATA_DIR = dataDir;

const { landingSurface } = require('../services/portalBosses');

try {
  const storage = require('../config/storage');
  const field = require('../services/corpseField');
  const createGold = require('../services/gold');
  const now = Date.now();
  const expected = landingSurface('port', 12, 14, 38, 36).y;

  const corpse = field.addMachine({
    id: 'floating-corpse',
    at: now,
    kind: 'hound',
    pos: { x: 12, y: 36, z: 14 },
    victimId: 'floating-hound',
    shooterId: 'tester'
  });
  assert.ok(corpse, '空中的历史尸体记录应被归一化后保存');
  assert.equal(corpse.pos.y, expected, '尸体记录应落在地形表面');

  const settled = field.settle({
    id: 'floating-corpse',
    at: now,
    pos: { x: 12, y: 36, z: 14 },
    surface: 'ground',
    reporter: { id: 'tester', pos: { x: 12, y: 36, z: 14 } }
  });
  assert.ok(settled, '已存在的空中尸体应接受落点补报');
  assert.equal(settled.pos.y, expected, '补报的尸体落点也应落在地形表面');

  const unknownSettled = field.settle({
    id: 'floating-corpse-settle',
    at: now,
    pos: { x: 12, y: 36, z: 14 },
    surface: 'ground',
    reporter: { id: 'tester', pos: { x: 12, y: 36, z: 14 } }
  });
  assert.equal(unknownSettled, null, '未预先创建的尸体不应通过落点补报写入');
  field.flush();

  storage.writeJsonl(field.FILE, [{
    id: 'historical-floating-corpse',
    seq: 1,
    at: now,
    kind: 'hound',
    map: 'port',
    pos: { x: 12, y: 36, z: 14 },
    surface: 'ground',
    settled: false,
    settledAt: 0
  }]);
  const corpseFieldPath = require.resolve('../services/corpseField');
  delete require.cache[corpseFieldPath];
  const migratedField = require('../services/corpseField');
  assert.equal(migratedField.snapshot({ limit: 10 }).corpses[0].pos.y, expected,
    '历史空中尸体在重启加载时应落地');
  assert.equal(migratedField.flush(), true);
  assert.equal(storage.readJsonl(field.FILE).at(-1).pos.y, expected,
    '历史尸体落地后应写回持久化记录');

  storage.writeJson('frontier-inventory.json', { gold: { carried: { 'owner-1': 1000000 } } });
  const player = {
    id: 'victim', signOwner: 'owner-1', joined: true, active: true, alive: true,
    focusUntil: 0, carSeat: null, boatSeat: null, mapId: 'port',
    pos: { x: 0, y: 0, z: 4 }
  };
  const players = new Map([[player.id, player]]);
  const gold = createGold({ players, send() {}, frontier: { dropping: () => false } });
  gold.dropOnDeath(player, { x: 12, y: 36, z: 14 }, now);

  let saved = storage.readJson('frontier-inventory.json').gold;
  const drop = Object.values(saved.drops).find(row => row.map === 'port');
  assert.ok(drop, '死亡掉落的金币应写入持久化记录');
  assert.equal(drop.pos.y, expected, '死亡掉落的金币应落在地形表面');

  storage.updateJson('frontier-inventory.json', raw => {
    raw.gold.drops['stale-drop'] = {
      id: 'stale-drop', map: 'port', pos: { x: 27, y: 42, z: 26 }, amount: 1, until: null
    };
    return raw;
  });
  const sent = [];
  const reloaded = createGold({
    players,
    send(target, msg) { sent.push(msg); },
    frontier: { dropping: () => false }
  });
  player.goldListAt = 0;
  reloaded.handle(player, { type: 'goldList' }, now + 1000);
  const listMessage = sent.find(msg => msg.type === 'goldList');
  const staleDrop = listMessage?.drops?.find(row => row.id === 'stale-drop');
  assert.ok(staleDrop, '历史空中金币仍应出现在拾取列表中');
  const goldGround = landingSurface('port', 27, 26, 44, 42).y;
  assert.equal(staleDrop.pos.y, goldGround, '历史空中金币应在加载时落地');
  assert.equal(storage.readJson('frontier-inventory.json').gold.drops['stale-drop'].pos.y, goldGround,
    '历史金币落地后应写回持久化记录');

  storage.updateJson('frontier-inventory.json', raw => {
    raw.gold.drops['stale-drop'].pos.y = 42;
    return raw;
  });
  reloaded.refreshWallets();
  sent.length = 0;
  player.goldListAt = 0;
  reloaded.handle(player, { type: 'goldList' }, now + 2000);
  const refreshedDrop = sent.find(msg => msg.type === 'goldList')?.drops?.find(row => row.id === 'stale-drop');
  assert.equal(refreshedDrop?.pos.y, goldGround, '钱包刷新后历史金币仍应落地');

  console.log('grounded drops self test passed');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
