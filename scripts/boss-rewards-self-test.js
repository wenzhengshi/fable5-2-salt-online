'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'salt-boss-rewards-'));
process.env.DATA_DIR = dataDir;
const storage = require('../config/storage');
const { budgetFor, settle } = require('../services/bossRewards');
const { createPortalBosses } = require('../services/portalBosses');
const createGold = require('../services/gold');

const now = Date.now();
const participants = ['alpha', 'beta', 'gamma'].map((owner, i) => ({ owner, damage: [500, 300, 200][i] }));
const round = (id, entries = participants, at = now) => ({ id, bossId: 'cat-dustfall', map: 'dustfall', at, participants: entries });

try {
  const data = { carried: {} };
  const result = settle(data, round('first'));
  assert.deepEqual(data.carried, { alpha: 270000, beta: 186000, gamma: 144000 });
  assert.equal(result.pool, 600000);
  assert.equal(settle(data, round('first')), null);
  settle(data, round('second'));
  assert.ok(settle(data, round('third')).payouts.every(row => row.reason === 'limit'));
  for (let i = 0; i < 3; i++) {
    settle(data, round('full-' + i, [{ owner: 'other-' + i, damage: 1 }]));
  }
  assert.equal(budgetFor(data, now).remaining, 0);
  assert.equal(settle(data, round('full', [{ owner: 'new', damage: 1 }])).payouts[0].reason, 'budget');
  assert.equal(budgetFor(data, now + 86400000).remaining, 3000000);
  const later = { carried: {}, dispatch: { epoch: budgetFor(data, now).day } };
  assert.equal(budgetFor(later, now + 90 * 86400000).pool, 300000);

  const deliveries = [];
  const players = new Map(participants.map(({ owner }) => [owner, { signOwner: owner, joined: true, ws: owner }]));
  const gold = createGold({ players, send: (_, msg) => deliveries.push(msg) });
  const pending = round('restart-retry');
  storage.writeJson('portal-bosses.json', { 'cat-dustfall': { phase: 'idle', pendingReward: pending } });
  const boot = (settleReward) => createPortalBosses({ players: () => [], settleReward });
  // Reproduce a crash with the wallet written and the pending Boss record still on disk.
  gold.settleBossReward(pending);
  boot(gold.settleBossReward).tick(now);
  const inventory = storage.readJson('frontier-inventory.json').gold;
  assert.deepEqual(inventory.carried, { alpha: 270000, beta: 186000, gamma: 144000 });
  assert.equal(Object.keys(inventory.bossBounties.receipts).length, 1);
  assert.equal(storage.readJson('portal-bosses.json')['cat-dustfall'].pendingReward, null);
  assert.equal(deliveries.filter(msg => msg.type === 'bossReward').length, 3);
  console.log('Boss rewards passed: contribution split, shared and personal caps, day and era rollover, atomic receipt and restart replay.');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
