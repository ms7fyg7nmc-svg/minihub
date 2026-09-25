export const CONFIG = {
  /* Ejderha en fazla 3. seviyeye cikar: seviye artik uzun bir merdiven degil,
     kisa bir buyume yayi. Asil ilerleme izgarada yumurta birlestirmekte. */
  MAX_LEVEL: 3,

  /* art.js yumurta/ejderha ayrimi icin bu esigi kullaniyor; ejderha gorseli
     EGG_UNTIL'in ustundeki seviyelerde ciziliyor. */
  EGG_UNTIL: 4,

  FEED_XP: 1,

  FULL_HOURS: 12,
  HAPPY_HOURS: 8,
  HUNGRY_BELOW: 25,
};

/* Gorsel seviye: ejderha 1-3 arasi buyurken art.js'e 5-7 araligi veriliyor. */
export const GORSEL_TABAN = CONFIG.EGG_UNTIL + 1;
export const GORSEL_TAVAN = CONFIG.EGG_UNTIL + CONFIG.MAX_LEVEL;

export function gorselSeviye(level) {
  return GORSEL_TABAN + Math.max(0, Math.min(CONFIG.MAX_LEVEL, level) - 1);
}

/* Seviye atlamak icin gereken besleme sayisi: ikinci seviye daha uzun. */
export function xpNeeded(level) {
  if (level >= CONFIG.MAX_LEVEL) return Infinity;
  return level === 1 ? 8 : 16;
}

export function growthRatio(level) {
  return Math.max(0, Math.min(1,
    (level - GORSEL_TABAN) / Math.max(1, GORSEL_TAVAN - GORSEL_TABAN)));
}

/* ESKI EKONOMI - sadece gecis icin duruyor.
   Oyuncular eskiden ejderhayi $MH ile besliyordu; v5 gecisinde o donemde
   harcanan $MH bu formulle hesaplanip oyuncuya yem olarak geri veriliyor. */
const ESKI_FEED_TABAN = 8;
const ESKI_FEED_ARTIS = 1.5;
const eskiXpNeeded = (level) => 2 + Math.floor(level / 8);
const eskiFeedCost = (level) => ESKI_FEED_TABAN + Math.floor(level * ESKI_FEED_ARTIS);

export function eskiToplamHarcama(level) {
  let toplam = 0;
  for (let l = 1; l < Math.min(level, 99); l += 1) toplam += eskiXpNeeded(l) * eskiFeedCost(l);
  return toplam;
}
