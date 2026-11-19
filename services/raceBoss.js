'use strict';
const BASE_AMOUNT = 2000000;
const STEP_AMOUNT = 500000;
const MAX_AMOUNT = 5000000;

function publicState(boss) {
  if (!boss || boss.claimed) {
    return { active: false, serial: Number(boss?.serial) || 0, amount: 0, spawnedAt: Number(boss?.spawnedAt) || 0 };
  }
  return {
    active: true,
    serial: Number(boss.serial) || 0,
    amount: Number(boss.amount) || 0,
    spawnedAt: Number(boss.spawnedAt) || 0
  };
}

function spawn(race, now) {
  const serial = Math.max(0, Number(race.boss?.serial) || 0) + 1;
  const amount = Math.min(BASE_AMOUNT + (serial - 1) * STEP_AMOUNT, MAX_AMOUNT);
  race.boss = { serial, amount, spawnedAt: now, claimed: false, claimedAt: 0, claimedBy: '' };
  return publicState(race.boss);
}

function ensurePool(race, now) {
  const pot = Number(race.pot);
  if (Number.isSafeInteger(pot) && pot > 0) {
    race.pot = pot;
    return null;
  }
  const boss = publicState(race.boss);
  if (boss.active && Number.isSafeInteger(boss.amount) && boss.amount > 0) {
    race.pot = boss.amount;
    return null;
  }
  const nextBoss = spawn(race, now);
  race.pot = nextBoss.amount;
  return nextBoss;
}

function claim(race, now, publicId) {
  const boss = race.boss;
  if (!boss || boss.claimed) return null;
  boss.claimed = true;
  boss.claimedAt = now;
  boss.claimedBy = String(publicId || '');
  return {
    serial: Number(boss.serial) || 0,
    amount: Number(boss.amount) || 0,
    spawnedAt: Number(boss.spawnedAt) || 0,
    claimedAt: now,
    claimedBy: boss.claimedBy
  };
}

module.exports = { publicState, ensurePool, claim };
