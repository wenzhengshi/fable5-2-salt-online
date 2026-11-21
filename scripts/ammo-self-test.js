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

const sent = [];
const handlers = {};
const windowObject = {
  __SALT_I18N__: { messages: { gameText: {} } },
  __G: { weapon },
  __mp: { send(message) { sent.push(JSON.parse(JSON.stringify(message))); } },
  addEventListener() {},
  setInterval() { return 1; }
};

const documentObject = {
  activeElement: null,
  addEventListener(type, handler) { handlers[type] = handler; },
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

assert.equal(windowObject.SaltAmmo.infinite, true, '应读取已保存的无限弹药选项');
assert.equal(weapon.infiniteAmmo, true, '已保存的选项应传给武器');
assert.equal(weapon.reserve, 120, '启用选项不应覆盖普通备弹数');
assert.equal(weapon.ammo, 30, '启用选项不应覆盖普通弹夹数');

const click = () => handlers.click({ target: { closest: () => ({}) }, preventDefault() {} });
click();
assert.equal(weapon.infiniteAmmo, false);
assert.equal(JSON.parse(storage.get('saltline.settings.v1')).infiniteAmmo, false);
assert.deepEqual(sent[0], { type: 'ammoMode', infinite: false });
click();
assert.equal(weapon.infiniteAmmo, true);
assert.equal(JSON.parse(storage.get('saltline.settings.v1')).infiniteAmmo, true);
assert.deepEqual(sent[1], { type: 'ammoMode', infinite: true });
console.log(JSON.stringify({ ok: true, settingSync: true }));
