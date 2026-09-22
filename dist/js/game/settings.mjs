import raw from '../../config.mjs';

export function validateSettings(input) {
  const ranges = {
    startingCoins: [1, 1000000000],
    refillCoins: [1, 1000000000],
    bettingSeconds: [3, 60],
    chanceMultiplierPercent: [0, 100],
    cityTourSeconds: [5, 60],
    propertyCardSeconds: [1, 10],
    winDisplaySeconds: [2, 15],
  };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (!Number.isFinite(input[key]) || input[key] < min || input[key] > max)
      throw new Error(`config.mjs: ${key} must be a number from ${min} to ${max}.`);
  }
  for (const key of ['startingCoins', 'refillCoins'])
    if (!Number.isSafeInteger(input[key]))
      throw new Error(`config.mjs: ${key} must be a whole number.`);
  if (
    input.chancePercent !== null &&
    (!Number.isFinite(input.chancePercent) || input.chancePercent < 0 || input.chancePercent > 100)
  )
    throw new Error('config.mjs: chancePercent must be null or a number from 0 to 100.');
  for (const key of ['chanceMultipliers', 'chanceGifts']) {
    const limit = key === 'chanceMultipliers' ? 10 : 100000;
    if (
      !Array.isArray(input[key]) ||
      !input[key].length ||
      input[key].some((n) => !Number.isSafeInteger(n) || n < 1 || n > limit)
    )
      throw new Error(`config.mjs: ${key} must contain whole numbers from 1 to ${limit}.`);
  }
  return Object.freeze({
    ...input,
    chanceMultipliers: Object.freeze([...input.chanceMultipliers]),
    chanceGifts: Object.freeze([...input.chanceGifts]),
  });
}
export const SETTINGS = validateSettings(raw);
