'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map([
  ['saltline.settings.v1', JSON.stringify({ infiniteAmmo: true })]
]);
const localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  }
};

class Storage {}
Storage.prototype.setItem = localStorage.setItem;

const weapon = {
  magSize: 30,
  ammo: 30,
  reserve: 120,
  state: 'idle',
  update() {
    if (this.ammo > 0) this.ammo -= 1;
  },
  reset() {
    this.ammo = 30;
    this.reserve = 120;
    this.state = 'idle';
  }
};

const windowObject = {
  __SALT_I18N__: { messages: { gameText: {} } },
  __G: { weapon },
  addEventListener() {},
  setInterval() { return 1; }
};

const documentObject = {
  activeElement: null,
  addEventListener() {},
  querySelector() { return null; },
  createElement() {
    return { className: '', innerHTML: '', querySelector() { return null; } };
  }
};

const context = vm.createContext({
  console,
  window: windowObject,
  document: documentObject,
  localStorage,
  Storage,
  JSON,
  Math,
  Number,
  String,
  setInterval: windowObject.setInterval
});

const source = fs.readFileSync(path.join(__dirname, '../public/js/ammo.js'), 'utf8');
vm.runInContext(source, context, { filename: 'ammo.js' });

assert.equal(weapon.ammo, 30, '启用无限弹药时不应预先把弹夹补满到循环外的异常值');
weapon.update(0.016);
assert.equal(weapon.ammo, 29, '无限弹药下每次射击仍应消耗弹夹子弹');
assert.ok(weapon.reserve >= weapon.magSize * 12, '无限弹药必须保持充足的无限备弹');

weapon.ammo = 0;
weapon.update(0.016);
weapon.update(0.016);
assert.equal(weapon.ammo, 0, '空弹夹后必须停止射击并等待换弹，不能瞬间补满');
const emptyRemainedEmpty = weapon.ammo === 0;

weapon.reset();
assert.equal(weapon.ammo, 30, '复活重置后弹夹恢复满弹');
assert.ok(weapon.reserve >= weapon.magSize * 12, '复活重置后备弹仍保持无限');

console.log(JSON.stringify({
  ok: true,
  magazineAfterShot: 29,
  emptyMagazineRemainsEmpty: emptyRemainedEmpty,
  reserve: weapon.reserve,
  reloadRequired: true
}, null, 2));
