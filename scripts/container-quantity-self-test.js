#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const tempRoot = path.join(__dirname, '..', '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(tempRoot, 'container-quantity-'));
process.env.JICREATE_DATA_DIR = dataDir;

const storage = require('../config/storage');
const rules = require('../public/js/frontier-rules');
const FILE = 'frontier-inventory.json';

try {
  const password = 'ABC123-DEF456-123ABC-456DEF';
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const box = {
    id: 'box-1', creator: 'owner-a', color: 'red', map: 'dustfall',
    pos: { x: 0, y: 16, z: -16000 }, yaw: 0,
    items: { grenade: 2, medkit: 1, helmet: 10 }, sign: '', gold: 400000
  };
  storage.writeJson(FILE, {
    gold: { carried: { 'owner-a': 500000 }, drops: {}, dispatch: null },
    containers: { [passwordHash]: box },
    'owner-a': rules.normalize({ grenade: 2, medkit: 1, helmet: 70 })
  });

  const sent = [];
  const player = {
    id: 'p1', signOwner: 'owner-a', name: 'RAVEN', ws: { id: 'p1', readyState: 1 },
    pos: { ...box.pos }, mapId: 'dustfall',
    joined: true, active: true, alive: true, frontier: true, focusUntil: 0,
    carSeat: null, boatSeat: null
  };
  const frontier = {
    dropping: () => false,
    containerTransaction(current, update) {
      let next;
      storage.updateJson(FILE, data => {
        const containers = data.containers || {};
        const bag = rules.normalize(data[current.signOwner]);
        next = update(containers, bag, data);
        if (next) data[current.signOwner] = next;
        data.containers = containers;
        return data;
      });
      return next;
    }
  };
  const containers = require('../services/containers')({
    send: (ws, message) => sent.push({ to: ws.id, message }),
    players: new Map([[player.id, player]]),
    frontier,
    gold: { deposited() {} }
  });

  let clock = Date.now();
  let sequence = 0;
  function act(action, payload = {}) {
    clock += 500;
    const request = ++sequence;
    containers.handle(player, {
      type: 'containerAction', request, action, id: box.id, ...payload
    }, clock);
    for (let index = sent.length - 1; index >= 0; index--) {
      const message = sent[index].message;
      if (message.type === 'containerResult' && message.request === request) return message;
    }
    throw new Error('missing containerResult for request ' + request);
  }
  function stored() {
    return storage.readJson(FILE);
  }

  assert.equal(act('open', { password }).open, true);

  let result = act('depositGold', { amount: 150000 });
  assert.equal(result.moved, 150000);
  assert.equal(stored().containers[passwordHash].gold, 550000);
  assert.equal(stored().gold.carried['owner-a'], 350000);

  result = act('withdrawGold', { amount: 250000 });
  assert.equal(result.moved, 250000);
  assert.equal(result.withdrawn, 250000);
  assert.equal(stored().containers[passwordHash].gold, 300000);
  assert.equal(stored().gold.carried['owner-a'], 600000);

  assert.equal(act('withdrawGold', { amount: 900000 }).error, 'amount');
  assert.equal(stored().containers[passwordHash].gold, 300000);
  assert.equal(stored().gold.carried['owner-a'], 600000);

  result = act('deposit', { item: 'grenade', amount: 1 });
  assert.equal(result.moved, 1);
  assert.equal(stored()['owner-a'].grenade, 1);
  assert.equal(stored().containers[passwordHash].items.grenade, 3);

  result = act('withdraw', { item: 'grenade', amount: 2 });
  assert.equal(result.moved, 2);
  assert.equal(stored()['owner-a'].grenade, 3);
  assert.equal(stored().containers[passwordHash].items.grenade, 1);

  assert.equal(act('withdraw', { item: 'grenade', amount: 5 }).error, 'amount');
  assert.equal(act('withdraw', { item: 'helmet', amount: 10 }).error, 'amount');
  assert.equal(stored()['owner-a'].helmet, 70);
  assert.equal(stored().containers[passwordHash].items.helmet, 10);

  result = act('deposit', { item: 'medkit' });
  assert.equal(result.moved, 1);
  assert.equal(stored()['owner-a'].medkit, 0);
  assert.equal(stored().containers[passwordHash].items.medkit, 2);

  result = act('withdraw', { item: 'medkit' });
  assert.equal(result.moved, 1);
  assert.equal(stored()['owner-a'].medkit, 1);
  assert.equal(stored().containers[passwordHash].items.medkit, 1);

  result = act('withdraw', { item: 'helmet' });
  assert.equal(result.moved, 5);
  assert.equal(stored()['owner-a'].helmet, 75);
  assert.equal(stored().containers[passwordHash].items.helmet, 5);

  console.log('container-quantity self-test passed');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
