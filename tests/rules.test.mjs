import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BettingWindow,
  SEGMENTS,
  wheelTarget,
  segmentAt,
  payout,
  bonusPayout,
  pickWheelIndex,
} from '../dist/js/game/rules.mjs';

test('bets close at the exact deadline', () => {
  const window = new BettingWindow(10000);
  window.start(300);
  assert.equal(window.isOpen(10299), true);
  assert.equal(window.isOpen(10300), false);
  window.close();
  assert.equal(window.isOpen(500), false);
});
test('every wheel target lands on the selected segment', () => {
  for (const start of [0, 1.2, 17, -4])
    for (let index = 0; index < SEGMENTS.length; index++)
      assert.equal(segmentAt(wheelTarget(start, index)), index);
});
test('default sampling covers every wheel segment independently of bets', () => {
  for (const bets of [{}, { 10: 500 }, { '2R': 1, '4R': 100 }]) {
    const counts = {};
    for (let i = 0; i < SEGMENTS.length; i++) {
      const index = pickWheelIndex(
        bets,
        (max) => {
          assert.equal(max, SEGMENTS.length);
          return i;
        },
        null,
      );
      assert.equal(index, i);
      counts[SEGMENTS[index]] = (counts[SEGMENTS[index]] || 0) + 1;
    }
    assert.equal(counts.C, 2);
  }
});
test('custom Chance percentages have exact thresholds and do not depend on bets', () => {
  for (const percent of [0, 3.7, 20, 100]) {
    for (const bets of [{}, { 10: 500 }]) {
      let count = 0;
      for (let draw = 0; draw < 10000; draw++) {
        const result = pickWheelIndex(bets, (max) => (max === 10000 ? draw : 0), percent);
        if (SEGMENTS[result] === 'C') count++;
      }
      assert.equal(count, Math.round(percent * 100));
    }
  }
});
test('invalid chance probabilities are rejected', () => {
  for (const value of [-1, 101, NaN, '20']) assert.throws(() => pickWheelIndex({}, () => 0, value));
});
test('only matching stakes pay and winning stakes are returned', () => {
  assert.equal(payout({ 5: 500, 2: 25 }, '5', 2), 5500);
  assert.equal(payout({ 5: 500 }, '2'), 0);
  assert.equal(bonusPayout(500, 20), 10500);
  assert.equal(bonusPayout(0, 20), 0);
});
