'use strict';

const assert = require('node:assert/strict');
const { createClock } = require('../public/race/performance');

function countTicks(frameDelays) {
  const clock = createClock();
  let ticks = 0;
  const advance = () => { ticks++; };
  for (const seconds of frameDelays) clock.advance(seconds, advance);
  while (clock.behind) clock.advance(0, advance);
  return ticks;
}

assert.equal(countTicks(Array(60).fill(1 / 60)), 90);
assert.equal(countTicks(Array(8).fill(1 / 8)), 90);
assert.equal(countTicks([.01, .22, .6, .07, .1]), 90);

const clock = createClock();
let ticks = 0;
clock.advance(.6, () => { ticks++; });
assert.equal(ticks, 24);
assert.equal(clock.behind, true);
clock.advance(0, () => { ticks++; return false; });
assert.equal(ticks, 25);
assert.equal(clock.behind, false);

console.log('race performance self-test passed');
