import { SETTINGS } from './settings.mjs';
export const SEGMENTS = [
  '1',
  '2',
  '1',
  '5',
  '1',
  '2',
  '10',
  '1',
  '2R',
  '1',
  '5',
  '2',
  '1',
  'C',
  '2',
  '1',
  '5',
  '1',
  '2',
  '1',
  '10',
  '2',
  '1',
  '4R',
  '1',
  '5',
  '2',
  '1',
  '2',
  '1',
  'C',
  '5',
  '1',
  '2',
  '10',
  '1',
  '2R',
  '2',
  '1',
  '5',
  '1',
  '2',
  '1',
  '5',
  '2',
  '1',
  '10',
  '2',
  '1',
  '2R',
  '5',
  '2',
  '1',
  '1',
];
export function randomInt(max) {
  const a = new Uint32Array(1);
  const limit = 2 ** 32 - (2 ** 32 % max);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= limit);
  return a[0] % max;
}
export function pickWheelIndex(_bets, roll = randomInt, chancePercent = SETTINGS.chancePercent) {
  // Preserve the call interface; the player's bets are deliberately unused.
  if (chancePercent === null) return roll(SEGMENTS.length);
  if (!Number.isFinite(chancePercent) || chancePercent < 0 || chancePercent > 100)
    throw new RangeError('Chance percentage must be null or between 0 and 100.');
  const chance = [],
    ordinary = [];
  SEGMENTS.forEach((result, index) => (result === 'C' ? chance : ordinary).push(index));
  const candidates = roll(10000) < Math.round(chancePercent * 100) ? chance : ordinary;
  return candidates[roll(candidates.length)];
}
export function payout(bets, result, multiplier = 1) {
  const stake = bets[result] || 0;
  return stake ? stake * (Number(result) * multiplier + 1) : 0;
}
export function bonusPayout(stake, total) {
  return stake > 0 ? stake * (total + 1) : 0;
}
export function wheelTarget(current, index) {
  const tau = Math.PI * 2,
    step = tau / SEGMENTS.length;
  const target = Math.PI / 2 - (index + 0.5) * step;
  return current + tau * 6 + ((((target - current) % tau) + tau) % tau);
}
export function segmentAt(rotation) {
  const tau = 2 * Math.PI;
  return Math.floor(((((Math.PI / 2 - rotation) % tau) + tau) % tau) / (tau / SEGMENTS.length));
}
export class BettingWindow {
  constructor(duration = 10000) {
    this.duration = duration;
    this.deadline = null;
  }
  start(now) {
    this.deadline = now + this.duration;
  }
  remaining(now) {
    return this.deadline === null ? 0 : Math.max(0, this.deadline - now);
  }
  isOpen(now) {
    return this.remaining(now) > 0;
  }
  close() {
    this.deadline = null;
  }
}
