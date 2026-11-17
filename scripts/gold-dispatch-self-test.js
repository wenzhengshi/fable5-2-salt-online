#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tempRoot = path.join(__dirname, '..', '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(tempRoot, 'gold-dispatch-'));
process.env.JICREATE_DATA_DIR = dataDir;

const storage = require('../config/storage');
const FILE = 'frontier-inventory.json';

try {
  const sent = [];
  const player = {
    id: 'p1', signOwner: 'owner-1', name: 'RAVEN', ws: { id: 'p1', readyState: 1 },
    pos: { x: 0, y: 0, z: 0 }, mapId: null, joined: true, active: true, alive: true,
    focusUntil: 0, carSeat: null, boatSeat: null
  };
  const players = new Map([[player.id, player]]);
  const send = (ws, message) => sent.push({ to: ws.id, message });
  const gold = require('../services/gold')({ players, send, frontier: { dropping: () => false } });
  const now = Date.now();

  gold.handle(player, { type: 'goldList' }, now);
  const first = sent.find(entry => entry.message.type === 'goldList')?.message;
  assert.ok(first, 'goldList response is required');
  assert.ok(first.issued > 0, 'today dispatch must issue targets');
  assert.ok(first.remainingTargets > 0);
  assert.ok(first.remainingTargets <= first.issued);
  assert.ok(first.remainingGold <= first.totalGold);
  assert.equal(first.remainingGold, first.remainingTargets * first.reward);
  assert.ok(first.remainingGold > 0);

  const saved = storage.readJson(FILE);
  const dispatch = saved.gold.dispatch;
  const [id, row] = Object.entries(dispatch.targets).find(([, target]) =>
    target.hp > 0 && target.until > now);
  assert.ok(id && row, 'an unfinished target must remain available');
  storage.updateJson(FILE, data => {
    data.gold.dispatch.targets[id].hp = 0;
    return data;
  });

  sent.length = 0;
  gold.deposited(player, now + 1000);
  const second = sent.find(entry => entry.message.type === 'goldList')?.message;
  assert.ok(second, 'goldList response after a kill is required');
  assert.equal(second.totalGold, first.totalGold);
  assert.equal(second.remainingTargets, first.remainingTargets - 1);
  assert.equal(second.remainingGold, first.remainingGold - row.reward);

  console.log('gold-dispatch self-test passed');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
