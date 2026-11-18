'use strict';

const { rewardFor } = require('../public/js/gold-rules');
const DAY = 86400000;
const dayOf = now => Math.floor((now + 8 * 3600000) / DAY);
const MAX_DAILY_REWARDS = 2;

function budgetFor(data, at) {
  const day = dayOf(at);
  const reward = rewardFor(day, data.dispatch?.epoch ?? day);
  const daily = 3 * reward;
  const remaining = Math.max(0, daily - (data.bossBounties?.days?.[day]?.spent || 0));
  return { day, daily, remaining, pool: Math.min(remaining, Math.max(1, Math.floor(reward * 3 / 5))) };
}

function shares(pool, participants) {
  const totalDamage = participants.reduce((sum, row) => sum + row.damage, 0);
  const count = participants.length;
  const divisor = 100 * totalDamage * count;
  const rows = participants.map(({ owner, damage }) => {
    const weight = 70 * damage * count + 30 * totalDamage;
    const numerator = pool * weight;
    return { owner, amount: Math.floor(numerator / divisor), remainder: numerator % divisor };
  });
  rows.sort((a, b) => b.remainder - a.remainder || a.owner.localeCompare(b.owner));
  const left = pool - rows.reduce((sum, row) => sum + row.amount, 0);
  for (let i = 0; i < left; i++) rows[i].amount++;
  return rows;
}

function settle(data, { id, bossId, map, at, participants }) {
  const book = data.bossBounties ||= { days: {}, receipts: {} };
  if (Object.hasOwn(book.receipts, id)) return null;
  const budget = budgetFor(data, at);
  const day = book.days[budget.day] ||= { spent: 0, counts: {} };
  const payouts = [];
  for (const { owner, amount } of shares(budget.pool, participants)) {
    const claimed = day.counts[owner] || 0;
    const balance = (data.carried[owner] || 0) + amount;
    const reason = claimed >= MAX_DAILY_REWARDS ? 'limit' : !amount ? (budget.pool ? 'share' : 'budget') :
      !Number.isSafeInteger(balance) ? 'balance' : null;
    if (reason) {
      payouts.push({ owner, amount: 0, reason });
      continue;
    }
    data.carried[owner] = balance;
    day.counts[owner] = claimed + 1;
    day.spent += amount;
    payouts.push({ owner, amount });
  }
  return book.receipts[id] = { kind: 'bossReward', bossId, map, at, day: budget.day, pool: budget.pool, payouts };
}

module.exports = { budgetFor, settle };
