'use strict';

const WEAPON_MAG_SIZE = 30;
const WEAPON_EMPTY_RELOAD_MS = 3040;
const WEAPON_IDLE_RESET_MS = 2000;
const SHOT_CREDIT_TTL_MS = 400;
const MAX_SHOT_CREDITS = 3;
const AIR_WALL = Object.freeze({
  minX: -40,
  maxX: 40,
  minZ: -30,
  maxZ: 30,
  padding: 0.4
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetWeaponState(player) {
  if (!player) return;
  player.weaponAmmo = WEAPON_MAG_SIZE;
  player.weaponLastShotAt = 0;
  player.weaponReloadUntil = 0;
  player.lastAcceptedShotAt = 0;
  player.shotCredits = 0;
  player.pendingShot = null;
}

function clampDronePosition(position, soldier, boatSeat) {
  if (!position) return null;
  const next = {
    x: Number(position.x),
    y: Number(position.y),
    z: Number(position.z)
  };
  if (!Number.isFinite(next.x) || !Number.isFinite(next.y) || !Number.isFinite(next.z)) {
    return null;
  }
  if (soldier === 'drone' && boatSeat == null) {
    next.x = clamp(next.x, AIR_WALL.minX + AIR_WALL.padding, AIR_WALL.maxX - AIR_WALL.padding);
    next.z = clamp(next.z, AIR_WALL.minZ + AIR_WALL.padding, AIR_WALL.maxZ - AIR_WALL.padding);
  }
  return next;
}

function consumeShot(player, now) {
  if (!player) return false;
  const at = Number(now) || Date.now();
  if (!Number.isFinite(player.weaponAmmo)) resetWeaponState(player);
  if (player.weaponReloadUntil > at) return false;
  if (player.weaponReloadUntil && player.weaponReloadUntil <= at) {
    player.weaponAmmo = WEAPON_MAG_SIZE;
    player.weaponReloadUntil = 0;
  }
  if (player.weaponLastShotAt &&
      at - player.weaponLastShotAt >= WEAPON_IDLE_RESET_MS) {
    player.weaponAmmo = WEAPON_MAG_SIZE;
  }
  if (player.weaponAmmo <= 0) {
    player.weaponReloadUntil = at + WEAPON_EMPTY_RELOAD_MS;
    return false;
  }
  player.weaponAmmo -= 1;
  player.weaponLastShotAt = at;
  if (player.weaponAmmo <= 0) {
    player.weaponReloadUntil = at + WEAPON_EMPTY_RELOAD_MS;
  }
  return true;
}

function acceptShotCredit(player, now, origin, dir) {
  player.pendingShot = origin && dir ? { origin, dir } : null;
  if (!player) return;
  player.lastAcceptedShotAt = Number(now) || Date.now();
  player.shotCredits = Math.min(MAX_SHOT_CREDITS, (Number(player.shotCredits) || 0) + 1);
}

function consumeHitCredit(player, now) {
  if (!player) return false;
  const at = Number(now) || Date.now();
  if (!player.lastAcceptedShotAt ||
      at - player.lastAcceptedShotAt > SHOT_CREDIT_TTL_MS ||
      (Number(player.shotCredits) || 0) <= 0) {
    return false;
  }
  player.shotCredits -= 1;
  return true;
}

function takeReportedShot(player, now) {
  const shot = player.pendingShot;
  player.pendingShot = null;
  if (!shot || !consumeHitCredit(player, now)) return null;
  return shot;
}

function alignedHit(shot, target) {
  const { origin, dir } = shot;
  const x = target.pos.x - origin.x;
  const y = target.pos.y + (target.soldier === 'drone' || target.soldier === 'hound' ? .3 : .95) - origin.y;
  const z = target.pos.z - origin.z;
  const forward = x * dir.x + y * dir.y + z * dir.z;
  // Covers the collision box and client interpolation without accepting shots far off-axis.
  const tolerance = 2.65 + Math.min(Math.max(forward, 0) * .015, 1.35);
  return forward >= -1 && forward <= 93 && x * x + y * y + z * z - forward * forward <= tolerance * tolerance;
}

function observeMovement(player, candidate, now) {
  let motion = player.motionBudget;
  if (!motion) {
    player.motionBudget = { at: now, reserve: 9, climbReserve: 13 };
    return true;
  }
  const speed = player.soldier === 'drone' ? 19 : player.soldier === 'hound' ? 17 : 13;
  const elapsed = Math.max(0, now - motion.at);
  motion.at = now;
  motion.reserve = Math.min(9, motion.reserve + elapsed * speed / 1000);
  motion.climbReserve = Math.min(13, motion.climbReserve + elapsed * 22 / 1000);
  const delta = Math.hypot(candidate.x - player.pos.x, candidate.z - player.pos.z);
  const climb = Math.max(0, candidate.y - player.pos.y);
  if (delta > motion.reserve + .025 || climb > motion.climbReserve + .025) return false;
  motion.reserve = Math.max(0, motion.reserve - delta);
  motion.climbReserve = Math.max(0, motion.climbReserve - climb);
  return true;
}

module.exports = {
  AIR_WALL,
  WEAPON_MAG_SIZE,
  WEAPON_EMPTY_RELOAD_MS,
  WEAPON_IDLE_RESET_MS,
  resetWeaponState,
  clampDronePosition,
  consumeShot,
  acceptShotCredit,
  consumeHitCredit,
  takeReportedShot,
  alignedHit,
  observeMovement
};
