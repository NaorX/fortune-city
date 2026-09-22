// Fortune City settings. Edit values, save, then refresh the browser.
// Seconds are ordinary seconds. Coin values are whole numbers.
export default {
  // New browsers start with this balance. Existing saved balances are unchanged.
  startingCoins: 10000,
  refillCoins: 10000,
  bettingSeconds: 10,

  // null = use the actual wheel: every segment is equally likely.
  // Example: 20 means Chance on 20% of spins. Allowed: null or 0 to 100.
  // Other results keep their relative frequency. Bets never affect the result.
  chancePercent: null,

  // When Chance lands: probability of a multiplier instead of a coin gift.
  chanceMultiplierPercent: 50,
  chanceMultipliers: [2, 3, 5],
  chanceGifts: [50, 100, 150, 250, 500],

  // Timing of the city presentation and win displays.
  cityTourSeconds: 18,
  propertyCardSeconds: 3,
  winDisplaySeconds: 5,
};
