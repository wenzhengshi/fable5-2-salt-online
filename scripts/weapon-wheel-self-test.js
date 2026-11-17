#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const rules = require('../public/js/frontier-rules');

function ids(entries) {
  return entries.map(([, id]) => id);
}

const empty = rules.normalize();
assert.deepEqual(ids(rules.availableWeapons(empty, 'port')), ['pac9'],
  '港口无背包物品时只能使用默认步枪');
assert.deepEqual(ids(rules.availableWeapons(empty, rules.map)), [],
  '西部荒原未拾取武器时不应出现可切换武器');
assert.equal(rules.cycleWeapon(empty, 'port', 'pac9', 1), null,
  '只有一把武器时滚轮不能切换');

const loadout = rules.normalize({ rifle: 1, mp5: 1, knife: 1 });
assert.deepEqual(ids(rules.availableWeapons(loadout, rules.map)), ['pac9', 'mp5', 'knife'],
  '已拾取的武器应按固定顺序进入切换列表');
assert.equal(rules.cycleWeapon(loadout, rules.map, 'pac9', 1)[1], 'mp5');
assert.equal(rules.cycleWeapon(loadout, rules.map, 'mp5', 1)[1], 'knife');
assert.equal(rules.cycleWeapon(loadout, rules.map, 'knife', 1)[1], 'pac9',
  '向下滚轮应循环回第一把武器');
assert.equal(rules.cycleWeapon(loadout, rules.map, 'pac9', -1)[1], 'knife',
  '向上滚轮应反向循环');

const carried = rules.normalize({ mp5: 1, m9a1: 1 });
assert.deepEqual(ids(rules.availableWeapons(carried, 'port')), ['pac9', 'mp5', 'm9a1'],
  '离开荒原后仍可循环使用背包中的枪械与默认步枪');
assert.equal(rules.cycleWeapon(carried, 'port', 'm9a1', 1)[1], 'pac9');
assert.equal(rules.cycleWeapon(carried, 'port', 'pac9', -1)[1], 'm9a1');

const singlePickup = rules.normalize({ mp5: 1 });
assert.equal(rules.cycleWeapon(singlePickup, rules.map, 'mp5', 1), null,
  '荒原中只有一把拾取武器时不能切换');
assert.equal(rules.cycleWeapon(loadout, rules.map, 'pac9', 0), null,
  '无方向输入时不应改变武器');

console.log(JSON.stringify({
  ok: true,
  portDefault: ids(rules.availableWeapons(empty, 'port')),
  dustfallLoadout: ids(rules.availableWeapons(loadout, rules.map)),
  wrapsForward: rules.cycleWeapon(loadout, rules.map, 'knife', 1)[1],
  wrapsBackward: rules.cycleWeapon(loadout, rules.map, 'pac9', -1)[1]
}, null, 2));
