#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tempRoot = path.join(__dirname, '..', '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(tempRoot, 'gold-pickups-'));
process.env.JICREATE_DATA_DIR = dataDir;

try {
  const storage = require('../config/storage');
  const pickups = require('../services/goldPickups');
  const ledger = require('../services/goldLedger');
  assert.equal(pickups.FILE, 'gold-ledger.jsonl');
  assert.equal(pickups.LEGACY_FILE, 'gold-pickups.json');

  const first = pickups.record({
    player: { id: 'p1', signOwner: 'owner-1', name: 'RAVEN' },
    map: 'port',
    pos: { x: 27.123, y: 0, z: 26 },
    amount: 1000000,
    at: 1794500000000
  });
  const second = pickups.record({
    player: { id: 'p2', signOwner: 'owner-2', name: 'VIPER' },
    map: 'qingyun',
    pos: { x: -4, y: 1.5, z: -595 },
    amount: 500000,
    at: 1794500001000
  });
  const third = pickups.record({
    player: { id: 'p3', signOwner: 'owner-3', name: 'CINDER' },
    map: 'bayhaven',
    pos: { x: -29, y: 0.14, z: -7952 },
    amount: 250000,
    at: 1794500002000
  });
  assert.ok(first.id && second.id && third.id);

  assert.equal(pickups.record({
    player: { id: 'p4', name: 'ASH' },
    map: 'unknown',
    pos: { x: 0, y: 0, z: 0 },
    amount: 1,
    at: Date.now()
  }), null);

  const gift = ledger.recordGift({
    sender: { id: 'p1', signOwner: 'owner-1', name: 'RAVEN' },
    recipient: { id: 'p2', signOwner: 'owner-2', name: 'VIPER' },
    map: 'port',
    pos: { x: 27, y: 0, z: 26 },
    amount: 125000,
    at: 1794500003000
  });
  assert.ok(gift && gift.kind === 'gift');

  const page = pickups.list({ limit: 2 });
  assert.equal(page.total, 3);
  assert.deepEqual(page.pickups.map((row) => row.name), ['CINDER', 'VIPER']);
  assert.equal(page.pickups[0].map, 'bayhaven');
  assert.equal(page.pickups[0].pos.z, -7952);
  assert.equal(page.pickups[0].amount, 250000);
  assert.equal(page.pickups[0].at, 1794500002000);

  const activityFirst = ledger.list({ limit: 2 });
  assert.equal(activityFirst.total, 4);
  assert.equal(activityFirst.records[0].kind, 'gift');
  assert.equal(activityFirst.records[0].recipientName, 'VIPER');
  assert.equal(activityFirst.hasMore, true);
  const activitySecond = ledger.list({ before: activityFirst.nextCursor, limit: 2 });
  assert.equal(activitySecond.records.length, 2);
  assert.equal(activitySecond.hasMore, false);
  assert.deepEqual(
    activityFirst.records.map((row) => row.id).concat(activitySecond.records.map((row) => row.id)),
    [gift.id, third.id, second.id, first.id]
  );

  const diskRows = fs.readFileSync(path.join(dataDir, ledger.FILE), 'utf8')
    .split('\n').filter(Boolean).map((line) => JSON.parse(line));
  assert.equal(diskRows.length, 4);
  assert.equal(diskRows[0].owner, 'owner-1');

  storage.writeJson(pickups.LEGACY_FILE, [{
    id: 'legacy-1',
    playerId: 'p9',
    owner: 'owner-9',
    name: 'LEGACY',
    map: 'mothlight',
    pos: { x: 7, y: 0, z: -19957 },
    amount: 75000,
    at: 1794499999000
  }]);

  delete require.cache[require.resolve('../config/storage')];
  delete require.cache[require.resolve('../services/goldLedger')];
  delete require.cache[require.resolve('../services/goldPickups')];
  const reloaded = require('../services/goldPickups');
  const reloadedLedger = require('../services/goldLedger');
  const afterRestart = reloaded.list({ limit: 8 });
  assert.equal(afterRestart.total, 4);
  assert.equal(afterRestart.pickups[3].name, 'LEGACY');
  assert.equal(reloadedLedger.list({ limit: 8 }).total, 5);
  assert.equal(reloadedLedger.list({ limit: 8 }).records[4].name, 'LEGACY');
  assert.equal(reloaded.status().persisted, true);

  console.log('gold-pickups self-test passed');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
