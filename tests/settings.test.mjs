import test from 'node:test';
import assert from 'node:assert/strict';
import defaults from '../dist/config.mjs';
import { validateSettings } from '../dist/js/game/settings.mjs';
test('default settings use the physical wheel distribution', () => {
  assert.equal(validateSettings(defaults).chancePercent, null);
});
test('invalid configuration values fail with a named setting', () => {
  for (const [key, value] of [
    ['bettingSeconds', 0],
    ['startingCoins', 0.5],
    ['chancePercent', 101],
    ['chanceGifts', []],
    ['chanceMultipliers', [NaN]],
    ['winDisplaySeconds', '5'],
  ]) {
    assert.throws(() => validateSettings({ ...defaults, [key]: value }), new RegExp(key));
  }
});
