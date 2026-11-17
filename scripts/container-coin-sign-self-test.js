#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const tempRoot = path.join(root, '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(tempRoot, 'container-coin-sign-'));
process.env.JICREATE_DATA_DIR = dataDir;

const storage = require('../config/storage');
const rules = require('../public/js/frontier-rules');
const FILE = 'frontier-inventory.json';

try {
  const password = 'ABC123-DEF456-123ABC-456DEF';
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const box = {
    id: 'box-coin-sign', creator: 'owner-a', color: 'red', map: 'dustfall',
    pos: { x: 0, y: 16, z: -16000 }, yaw: 0,
    items: {}, sign: 'Saltline', gold: 400000
  };
  storage.writeJson(FILE, {
    gold: { carried: { 'owner-a': 500000 }, drops: {}, dispatch: null },
    containers: { [passwordHash]: box },
    'owner-a': rules.normalize({})
  });

  const sent = [];
  const owner = {
    id: 'p1', signOwner: 'owner-a', name: 'RAVEN', ws: { id: 'p1', readyState: 1 },
    pos: { ...box.pos }, mapId: 'dustfall',
    joined: true, active: true, alive: true, frontier: true, focusUntil: 0,
    carSeat: null, boatSeat: null
  };
  const observer = {
    id: 'p2', signOwner: 'owner-b', name: 'GUEST', ws: { id: 'p2', readyState: 1 },
    pos: { x: 2, y: 16, z: -15999 }, mapId: 'dustfall',
    joined: true, active: true, alive: true, frontier: true, focusUntil: 0,
    carSeat: null, boatSeat: null
  };
  const players = new Map([[owner.id, owner], [observer.id, observer]]);
  const frontier = {
    dropping: () => false,
    containerTransaction(player, update) {
      let next;
      storage.updateJson(FILE, data => {
        const containers = data.containers || {};
        const bag = rules.normalize(data[player.signOwner]);
        next = update(containers, bag, data);
        if (next) data[player.signOwner] = next;
        data.containers = containers;
        return data;
      });
      return next;
    }
  };
  const containers = require('../services/containers')({
    send: (ws, message) => sent.push({ to: ws.id, message }),
    players,
    frontier,
    gold: { deposited() {} }
  });

  let clock = Date.now();
  let sequence = 0;
  function act(action, payload = {}) {
    clock += 500;
    const request = ++sequence;
    containers.handle(owner, {
      type: 'containerAction', request, action, id: box.id, ...payload
    }, clock);
    for (let index = sent.length - 1; index >= 0; index--) {
      const message = sent[index].message;
      if (message.type === 'containerResult' && message.request === request) return message;
    }
    throw new Error('missing containerResult for request ' + request);
  }
  function last(to, type) {
    for (let index = sent.length - 1; index >= 0; index--) {
      const entry = sent[index];
      if (entry.to === to && entry.message.type === type) return entry.message;
    }
    throw new Error('missing ' + type + ' for ' + to);
  }
  function coinBalance(message) {
    const row = message.containers.find(entry => entry.id === box.id);
    assert.ok(row, 'containerList 缺少目标集装箱');
    return row.gold;
  }
  function refreshList() {
    clock += 1500;
    containers.handle(owner, { type: 'containerList' }, clock);
    return last(owner.id, 'containerList');
  }

  assert.equal(coinBalance(refreshList()), 400000, 'containerList 必须下发箱内余额');
  assert.equal(act('open', { password }).open, true);

  assert.equal(act('depositGold', { amount: 150000 }).moved, 150000);
  assert.equal(coinBalance(refreshList()), 550000, '存款后本地列表余额应更新');
  assert.equal(coinBalance(last(observer.id, 'containerList')), 550000, '附近玩家应立即收到新余额');

  assert.equal(act('withdrawGold', { amount: 250000 }).moved, 250000);
  assert.equal(coinBalance(refreshList()), 300000, '取款后本地列表余额应更新');
  assert.equal(coinBalance(last(observer.id, 'containerList')), 300000, '附近玩家应立即收到取款后的余额');

  const client = fs.readFileSync(path.join(root, 'public/js/containers.js'), 'utf8');
  assert.match(client, /group\.name = 'container-coin-sign'/, '缺少系统盐线币牌');
  assert.match(client, /setCoinSign\(model, row\.gold \?\? 0\)/, '建箱时必须渲染系统牌');
  assert.match(client, /syncCoinSign\(models\.get\(openedId\), banked\)/, '存取后必须即时刷新牌面');
  assert.match(client, /t\('goldSignLabel'\)/, '牌面标题必须走 i18n');
  assert.match(client, /formatGold\(value\)/, '牌面必须显示格式化后的盐线币数量');
  const faceOffset = Number(client.match(/const signFaceOffset = ([0-9.]+)/)?.[1]);
  assert.ok(faceOffset > .045, '两块牌面都必须位于立柱前表面之外，避免余额被遮挡');
  assert.match(client, /function addSignFaces\(group, geometry, material\)[\s\S]*?for \(const side of \[-1, 1\]\)[\s\S]*?side \* signFaceOffset[\s\S]*?side \* Math\.PI \/ 2/,
    '原有自定义牌和余额牌都必须提供正反面');
  assert.match(client, /addSignFaces\(group, board, model\.signMaterial\)/, '自定义牌未使用双面前置牌面');
  assert.match(client, /addSignFaces\(group, coinBoard, model\.coinSignMaterial\)/, '余额牌未使用双面前置牌面');
  for (const lang of ['zh-CN', 'en-US']) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, 'locales', lang + '.json'), 'utf8'));
    assert.equal(typeof messages.containerFlow.goldSignLabel, 'string', lang + ' 缺少系统牌文案');
  }

  console.log('container-coin-sign self-test passed');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
