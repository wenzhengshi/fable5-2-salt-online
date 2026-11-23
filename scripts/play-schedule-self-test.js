#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tempRoot = path.join(__dirname, '..', '.jicreate-tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const tempData = fs.mkdtempSync(path.join(tempRoot, 'play-schedule-'));
process.env.DATA_DIR = tempData;
process.on('exit', () => {
  try { fs.rmSync(tempData, { recursive: true, force: true }); } catch (error) { /* ignore */ }
});

const schedule = require('../services/playSchedule');

function chinaTime(text) {
  return Date.parse(text + '+08:00');
}

const midnight = schedule.statusAt(chinaTime('2026-11-23T00:00:00'));
assert.equal(midnight.blocked, true);
assert.equal(midnight.activeWindow.start, '00:00');
assert.equal(midnight.activeWindow.end, '07:00');
assert.equal(midnight.nextPlayableLocal, '2026-11-23T07:00:00+08:00');
assert.equal(midnight.remainingMs, 7 * 60 * 60 * 1000);

const earlyMorning = schedule.statusAt(chinaTime('2026-11-23T06:59:59'));
assert.equal(earlyMorning.blocked, true);
assert.equal(earlyMorning.nextPlayableLocal, '2026-11-23T07:00:00+08:00');
assert.equal(earlyMorning.remainingMs, 1000);

const morningOpen = schedule.statusAt(chinaTime('2026-11-23T07:00:00'));
assert.equal(morningOpen.blocked, false);

const preWorkOpen = schedule.statusAt(chinaTime('2026-11-23T08:59:59'));
assert.equal(preWorkOpen.blocked, false);

const workMonday = schedule.statusAt(chinaTime('2026-11-23T10:15:00'));
assert.equal(workMonday.blocked, true);
assert.equal(workMonday.nextPlayableLocal, '2026-11-23T12:00:00+08:00');
assert.equal(workMonday.remainingMs, 105 * 60 * 1000);

const lunch = schedule.statusAt(chinaTime('2026-11-23T12:00:00'));
assert.equal(lunch.blocked, false);

const afternoon = schedule.statusAt(chinaTime('2026-11-23T14:00:00'));
assert.equal(afternoon.blocked, true);
assert.equal(afternoon.nextPlayableLocal, '2026-11-23T18:00:00+08:00');

const evening = schedule.statusAt(chinaTime('2026-11-23T18:00:00'));
assert.equal(evening.blocked, false);

const saturday = schedule.statusAt(chinaTime('2026-11-28T10:00:00'));
assert.equal(saturday.blocked, false);
assert.equal(saturday.weekend, true);

const saturdayMidnight = schedule.statusAt(chinaTime('2026-11-28T00:00:00'));
assert.equal(saturdayMidnight.blocked, false);

const nationalDay = schedule.statusAt(chinaTime('2026-10-01T10:00:00'));
assert.equal(nationalDay.blocked, false);
assert.equal(nationalDay.holiday, true);

const nationalDayMidnight = schedule.statusAt(chinaTime('2026-10-01T00:00:00'));
assert.equal(nationalDayMidnight.blocked, false);

const springFestival = schedule.statusAt(chinaTime('2026-02-17T15:00:00'));
assert.equal(springFestival.blocked, false);
assert.equal(springFestival.holiday, true);

const normalTuesday = schedule.statusAt(chinaTime('2026-12-01T15:00:00'));
assert.equal(normalTuesday.blocked, true);

assert.deepEqual(schedule.descriptor().windows.map((window) => window.start), ['00:00', '09:00', '14:00']);

console.log('[play-schedule] self-test passed');
