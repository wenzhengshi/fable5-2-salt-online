'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saltline-supply-'));
process.env.JICREATE_DATA_DIR = dir;
const storage = require('../config/storage');
const supply = require('../services/goldSupply');
const race = require('../services/race');
const FILE = 'frontier-inventory.json';
const DAY = 86400000;
const day = 21100;
const midnight = day * DAY - 8 * 3600000;

try {
  storage.updateJson(FILE, () => ({
    gold: {
      carried: { owner: 2000000 },
      drops: {
        old: { amount: 15, until: midnight - 1 },
        later: { amount: 7, until: midnight + 3 },
        death: { amount: 8, until: null }
      },
      dispatch: {
        day: day - 1, epoch: day - 90, launchDroneBoost: true,
        targets: {
          skipped: { hp: 1, reward: 40, recycled: 3 },
          destroyed: { hp: 0, reward: 60 }
        }
      }
    },
    containers: { box: { gold: 10 } }
  }));
  const player = { id: 'player', signOwner: 'owner', joined: true, active: true, alive: true, focusUntil: 0 };
  const gold = require('../services/gold')({
    players: new Map(), send() {}, frontier: { dropping: () => false }, roll: () => 0
  });

  gold.tick(midnight);
  let data = storage.readJson(FILE).gold;
  assert.deepEqual(data.dispatch.carry, { unissued: 37, recycled: 18 });
  assert.equal(data.supply.historicalMinimum, 2000040);
  assert.ok(data.drops.later);
  assert.ok(data.drops.death);
  assert.ok(!data.drops.old);
  assert.equal(data.supply.issued, 0);

  const target = Object.values(data.dispatch.targets).find(row => row.recycled > 0 && row.at <= midnight);
  assert.ok(target);
  storage.updateJson(FILE, stored => {
    stored.gold.dispatch.targets[target.id].hp = 1;
    return stored;
  });
  player.mapId = target.map;
  player.inQingyun = target.map === 'qingyun';
  player.ws = {};
  gold.deposited(player, midnight);
  const y = target.pos.y + (target.kind === 'hound' ? .7 : .05);
  gold.shoot(player, {
    origin: { x: target.pos.x - 3, y, z: target.pos.z },
    dir: { x: 1, y: 0, z: 0 }, weapon: 'pac9'
  }, target.id, midnight + 1);
  data = storage.readJson(FILE).gold;
  assert.equal(data.supply.issued, target.reward - target.recycled);
  assert.equal(data.drops[target.id].amount, target.reward);

  gold.tick(midnight + DAY);
  data = storage.readJson(FILE).gold;
  assert.equal(data.dispatch.carry.recycled, 18 - target.recycled + target.reward + 7);
  assert.equal(supply.publicStatus().issued, target.reward - target.recycled);
  assert.equal(data.drops.death.amount, 8);
  const beforeRace = supply.publicStatus();
  race.status('owner', midnight + DAY + 1);
  race.status('owner', midnight + DAY + 2);
  const afterRace = supply.publicStatus();
  assert.equal(afterRace.issued - beforeRace.issued, 2000000);
  assert.equal(afterRace.totalIssuedMinimum, afterRace.historicalMinimum + afterRace.issued);
  assert.equal(afterRace.issuanceLimit, null);
  console.log('Gold supply turnover, legacy baseline, no-expiry player drops and race pool issuance verified.');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
