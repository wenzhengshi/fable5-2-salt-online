#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const tempRoot = path.join(__dirname, '..', '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(tempRoot, 'gold-transfer-'));
process.env.JICREATE_DATA_DIR = dataDir;

const storage = require('../config/storage');
const goldLedger = require('../services/goldLedger');
const rules = require('../public/js/frontier-rules');
const FILE = 'frontier-inventory.json';

function playerOf(id, signOwner, name, pos, mapId) {
  return {
    id, signOwner, name, ws: { id, readyState: 1 }, pos, mapId,
    joined: true, active: true, alive: true, focusUntil: 0,
    carSeat: null, boatSeat: null
  };
}

try {
  storage.writeJson(FILE, {
    gold: { carried: { 'owner-a': 500000 }, drops: {}, dispatch: null },
    containers: {}
  });

  const sent = [];
  const sender = playerOf('p1', 'owner-a', 'RAVEN', { x: 0, y: 0, z: 0 }, null);
  const receiver = playerOf('p2', 'owner-b', 'VIPER', { x: 4, y: 0, z: 0 }, null);
  const players = new Map([[sender.id, sender], [receiver.id, receiver]]);
  const send = (ws, message) => sent.push({ to: ws.id, message });
  const gold = require('../services/gold')({ players, send, frontier: { dropping: () => false } });
  const now = Date.now();

  gold.handle(sender, { type: 'goldGift', toId: 'p2', amount: 200000, request: 1 }, now);
  let saved = storage.readJson(FILE);
  assert.equal(saved.gold.carried['owner-a'], 500000);
  assert.equal(saved.gold.carried['owner-b'] || 0, 0);
  const pending = sent.find(entry => entry.to === 'p1' &&
    entry.message.type === 'goldGiftResult' && entry.message.request === 1);
  assert.equal(pending.message.status, 'pending');
  const offered = sent.find(entry => entry.to === 'p2' && entry.message.type === 'goldGiftRequest');
  assert.ok(offered.message.offerId);
  assert.equal(goldLedger.list({ kind: 'gift', limit: 8 }).total, 0);

  gold.handle(receiver, { type: 'goldGiftResponse', offerId: offered.message.offerId, accept: true }, now + 100);
  saved = storage.readJson(FILE);
  assert.equal(saved.gold.carried['owner-a'], 300000);
  assert.equal(saved.gold.carried['owner-b'], 200000);
  assert.ok(sent.find(entry => entry.to === 'p1' && entry.message.type === 'goldGiftResult' &&
    entry.message.request === 1 && entry.message.status === 'accepted'));
  assert.ok(sent.find(entry => entry.to === 'p2' && entry.message.type === 'goldGiftResult' &&
    entry.message.role === 'recipient' && entry.message.status === 'accepted'));
  const gifts = goldLedger.list({ kind: 'gift', limit: 8 });
  assert.equal(gifts.total, 1);
  assert.equal(gifts.records[0].name, 'RAVEN');
  assert.equal(gifts.records[0].recipientName, 'VIPER');
  assert.equal(gifts.records[0].amount, 200000);

  receiver.pos.x = 50;
  gold.handle(sender, { type: 'goldGift', toId: 'p2', amount: 200000, request: 2 }, now + 600);
  assert.equal(sent.find(entry => entry.message.type === 'goldGiftResult' && entry.message.request === 2).message.error, 'range');
  gold.handle(sender, { type: 'goldGift', toId: 'p1', amount: 1, request: 3 }, now + 1200);
  assert.equal(sent.find(entry => entry.message.type === 'goldGiftResult' && entry.message.request === 3).message.error, 'target');
  receiver.pos.x = 4;
  gold.handle(sender, { type: 'goldGift', toId: 'p2', amount: 900000, request: 4 }, now + 1800);
  assert.equal(sent.find(entry => entry.message.type === 'goldGiftResult' && entry.message.request === 4).message.error, 'funds');

  gold.handle(sender, { type: 'goldGift', toId: 'p2', amount: 100000, request: 5 }, now + 2400);
  const declineOffer = sent.filter(entry => entry.to === 'p2' && entry.message.type === 'goldGiftRequest').at(-1);
  gold.handle(receiver, { type: 'goldGiftResponse', offerId: declineOffer.message.offerId, accept: false }, now + 2500);
  assert.ok(sent.find(entry => entry.to === 'p1' && entry.message.type === 'goldGiftResult' &&
    entry.message.request === 5 && entry.message.status === 'declined'));

  gold.handle(sender, { type: 'goldGift', toId: 'p2', amount: 200000, request: 6 }, now + 3100);
  gold.handle(sender, { type: 'goldGift', toId: 'p2', amount: 200000, request: 7 }, now + 3700);
  assert.equal(sent.find(entry => entry.message.type === 'goldGiftResult' && entry.message.request === 7).message.error, 'funds');
  const expiringOffer = sent.filter(entry => entry.to === 'p2' && entry.message.type === 'goldGiftRequest').at(-1);
  gold.tick(Number(expiringOffer.message.expiresAt) + 1000);
  assert.ok(sent.find(entry => entry.to === 'p1' && entry.message.type === 'goldGiftResult' &&
    entry.message.request === 6 && entry.message.status === 'expired'));
  saved = storage.readJson(FILE);
  assert.equal(saved.gold.carried['owner-a'], 300000);
  assert.equal(saved.gold.carried['owner-b'], 200000);
  assert.equal(goldLedger.list({ kind: 'gift', limit: 8 }).total, 1);

  const password = 'ABC123-DEF456-123ABC-456DEF';
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const box = {
    id: 'box-1', creator: 'owner-a', color: 'red', map: 'dustfall',
    pos: { x: 0, y: 16, z: -16000 }, yaw: 0, items: {}, sign: '', gold: 500000
  };
  storage.updateJson(FILE, data => {
    data.containers = { [passwordHash]: box };
    return data;
  });

  const containerPlayer = playerOf('p3', 'owner-a', 'RAVEN', { x: 0, y: 16, z: -16000 }, 'dustfall');
  const containerPlayers = new Map([[containerPlayer.id, containerPlayer]]);
  const containerFrontier = {
    dropping: () => false,
    containerTransaction(currentPlayer, update) {
      let next;
      storage.updateJson(FILE, data => {
        const containers = data.containers || {};
        const bag = rules.normalize(data[currentPlayer.signOwner]);
        next = update(containers, bag, data);
        if (next) data[currentPlayer.signOwner] = next;
        data.containers = containers;
        return data;
      });
      return next;
    }
  };
  const containers = require('../services/containers')({
    send, players: containerPlayers, frontier: containerFrontier, gold
  });

  containers.handle(containerPlayer, { type: 'containerAction', action: 'open', id: box.id,
    password, request: 5 }, now + 40000);
  assert.ok(sent.find(entry => entry.message.type === 'containerResult' &&
    entry.message.request === 5 && entry.message.gold === 500000));

  containers.handle(containerPlayer, { type: 'containerAction', action: 'withdrawGold', id: box.id,
    amount: 200000, request: 6 }, now + 40400);
  assert.ok(sent.find(entry => entry.message.type === 'containerResult' &&
    entry.message.request === 6 && entry.message.withdrawn === 200000));
  saved = storage.readJson(FILE);
  assert.equal(saved.containers[passwordHash].gold, 300000);
  assert.equal(saved.gold.carried['owner-a'], 500000);

  containers.handle(containerPlayer, { type: 'containerAction', action: 'withdrawGold', id: box.id,
    amount: 900000, request: 7 }, now + 40800);
  assert.equal(sent.find(entry => entry.message.type === 'containerResult' && entry.message.request === 7).message.error, 'amount');

  containers.handle(containerPlayer, { type: 'containerAction', action: 'withdrawGold', id: box.id,
    amount: 'all', request: 8 }, now + 41200);
  assert.ok(sent.find(entry => entry.message.type === 'containerResult' &&
    entry.message.request === 8 && entry.message.withdrawn === 300000));
  saved = storage.readJson(FILE);
  assert.equal(saved.containers[passwordHash].gold || 0, 0);
  assert.equal(saved.gold.carried['owner-a'], 800000);

  console.log('gold-transfer self-test passed');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
