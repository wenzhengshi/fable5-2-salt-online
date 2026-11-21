'use strict';

const storage = require('../config/storage');
const FILE = 'frontier-inventory.json';

const units = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
const sum = (rows, amount) => rows.reduce((total, row) => total + units(amount(row)), 0);

function init(data, now) {
  const gold = data.gold ||= {};
  if (gold.supply) return gold.supply;
  const race = data.racing;
  const outstanding = sum(Object.values(gold.carried || {}), balance => balance)
    + sum(Object.values(gold.drops || {}), drop => drop.amount)
    + sum(Object.values(data.containers || {}), box => box.gold)
    + units(race?.pot)
    + Object.keys(race?.active || {}).length * 50000;
  const bossReceipts = Object.values(gold.bossBounties?.receipts || {});
  const bossIssued = sum(bossReceipts, receipt => sum(receipt.payouts || [], payout => payout.amount));
  // Claim and spawn can refer to the same pool; count each serial only once.
  const racePools = new Map();
  const raceHistory = Array.isArray(race?.history) ? race.history : [];
  for (const row of raceHistory) {
    for (const pool of [row.bossClaim, row.bossSpawn]) {
      if (pool?.serial > 0 && units(pool.amount)) racePools.set(pool.serial, pool.amount);
    }
  }
  const raceIssued = sum([...racePools.values()], amount => amount);
  // Today's surviving coins can include the very same historical payouts.
  // The larger of the two subtotals is a lower bound without counting twice.
  return gold.supply = {
    startedAt: now, issued: 0, historicalMinimum: Math.max(outstanding, bossIssued + raceIssued),
    recycledWaiting: 0
  };
}

function issue(gold, amount) {
  if (!amount) return;
  const supply = gold.supply;
  const next = supply.issued + amount;
  if (!Number.isSafeInteger(next) || !Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError('Invalid gold issuance total');
  }
  supply.issued = next;
}

function recoverExpired(gold, cutoff) {
  const supply = gold.supply;
  for (const [id, drop] of Object.entries(gold.drops)) {
    if (Number.isFinite(drop.until) && drop.until <= cutoff) {
      // A timed drop was already issued when it was created. Death drops
      // belong to players and have no expiration.
      supply.recycledWaiting += units(drop.amount);
      delete gold.drops[id];
    }
  }
}

function carryInto(gold, previous, dispatch) {
  let unissued = 0;
  let recycled = gold.supply.recycledWaiting;
  for (const target of Object.values(previous?.targets || {})) {
    if (target.hp <= 0) continue;
    unissued += target.reward - (target.recycled || 0);
    recycled += target.recycled || 0;
  }
  const targets = Object.values(dispatch.targets);
  if (!targets.length) return;
  function share(amount, index) {
    return Math.floor(amount / targets.length) + Number(index < amount % targets.length);
  }
  for (const [index, target] of targets.entries()) {
    target.recycled = share(recycled, index);
    target.reward += share(unissued, index) + target.recycled;
  }
  gold.supply.recycledWaiting = 0;
  dispatch.carry = { unissued, recycled };
}

function publicStatus() {
  const gold = storage.readJson(FILE).gold;
  return {
    issued: gold?.supply?.issued ?? 0,
    historicalMinimum: gold?.supply?.historicalMinimum ?? 0,
    totalIssuedMinimum: (gold?.supply?.historicalMinimum ?? 0) + (gold?.supply?.issued ?? 0),
    startedAt: gold?.supply?.startedAt ?? null,
    issuanceLimit: null,
    carry: gold?.dispatch?.carry ?? { unissued: 0, recycled: 0 },
    recycledWaiting: gold?.supply?.recycledWaiting ?? 0
  };
}

module.exports = { init, issue, recoverExpired, carryInto, publicStatus };
