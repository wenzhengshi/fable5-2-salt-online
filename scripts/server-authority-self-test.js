'use strict';

const assert = require('node:assert/strict');
const authority = require('../services/playerAuthority');

const clamped = authority.clampDronePosition({ x: 100, y: 12, z: -80 }, 'drone', null);
assert.deepEqual(clamped, { x: 39.6, y: 12, z: -29.6 }, '服务端必须拉回墙外无人机');

const infantry = authority.clampDronePosition({ x: 100, y: 0, z: -80 }, 'classic', null);
assert.deepEqual(infantry, { x: 100, y: 0, z: -80 }, '空气墙不得限制非无人机单位');

const player = {};
authority.resetWeaponState(player);
let accepted = 0;
let time = 1000;
for (let shot = 0; shot < authority.WEAPON_MAG_SIZE; shot += 1) {
  if (authority.consumeShot(player, time)) accepted += 1;
  time += 85;
}
assert.equal(accepted, 30, '服务器应接受一个完整弹夹');
assert.equal(player.weaponAmmo, 0, '第 30 发后服务器弹夹必须为空');
assert.equal(authority.consumeShot(player, time), false, '空弹夹后必须拒绝立即射击');

time = player.weaponReloadUntil;
assert.equal(authority.consumeShot(player, time), true, '等待完整换弹时间后恢复射击');
assert.equal(player.weaponAmmo, 29, '换弹后第一发正常消耗并保留 29 发');

authority.resetWeaponState(player);
for (let shot = 0; shot < 10; shot += 1) {
  assert.equal(authority.consumeShot(player, time), true);
  time += 85;
}
time += authority.WEAPON_IDLE_RESET_MS;
assert.equal(authority.consumeShot(player, time), true);
assert.equal(player.weaponAmmo, 29, '战术换弹停顿后服务器应重置完整弹夹');

const unlimited = { infiniteAmmo: true };
authority.resetWeaponState(unlimited);
unlimited.weaponAmmo = 0;
unlimited.weaponReloadUntil = time + 20000;
for (let shot = 0; shot < 65; shot += 1) {
  assert.equal(authority.consumeShot(unlimited, time + shot * 85), true,
    '无限弹药应接受跨弹夹容量的持续射击');
}
unlimited.infiniteAmmo = false;
assert.equal(authority.consumeShot(unlimited, time + 65 * 85), false,
  '关闭无限弹药后应恢复之前的普通弹夹与换弹状态');

authority.acceptShotCredit(player, time);
assert.equal(authority.consumeHitCredit(player, time + 50), true, '每发已确认射击只能兑现一次命中');
assert.equal(authority.consumeHitCredit(player, time + 60), false, '禁止老版本额外发送命中包连杀');

console.log(JSON.stringify({
  ok: true,
  droneClampedTo: clamped,
  magazineSize: authority.WEAPON_MAG_SIZE,
  emptyReloadMs: authority.WEAPON_EMPTY_RELOAD_MS,
  idleResetMs: authority.WEAPON_IDLE_RESET_MS,
  infiniteAmmoSkipsReload: true,
  duplicateHitBlocked: true
}, null, 2));
