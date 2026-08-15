
export const CONFIG = {
  MAX_LEVEL: 99,

  EGG_UNTIL: 4,

  FEED_COST_BASE: 8,
  FEED_COST_PER_LEVEL: 1.5,
  FEED_XP: 1,

  PLAY_XP: 1,
  PLAY_COOLDOWN_MS: 4 * 60 * 60 * 1000,
  PLAY_HAPPINESS: 35,

  FULL_HOURS: 12,
  HAPPY_HOURS: 8,
  HUNGRY_BELOW: 25,
};

export function xpNeeded(level) {
  return 2 + Math.floor(level / 8);
}

export function feedCost(level) {
  return CONFIG.FEED_COST_BASE + Math.floor(level * CONFIG.FEED_COST_PER_LEVEL);
}

export function totalCostTo(level) {
  let toplam = 0;
  for (let l = 1; l < Math.min(level, CONFIG.MAX_LEVEL); l++) {
    toplam += xpNeeded(l) * feedCost(l);
  }
  return toplam;
}

export function growthRatio(level) {
  const bas = CONFIG.EGG_UNTIL + 1;
  return Math.max(0, Math.min(1, (level - bas) / (CONFIG.MAX_LEVEL - bas)));
}

export const LEVEL_REWARDS = {};

export function rewardForLevel(level) {
  return LEVEL_REWARDS[level] ?? null;
}
