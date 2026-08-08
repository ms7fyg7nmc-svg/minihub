/* Dragon Island - MERKEZI AYARLAR

   Oyun ekonomisiyle ilgili DEGISEBILECEK her sayi burada. Amac, ileride
   dengeleme yaparken arayuz veya oyun kodunu hic acmamak: sadece bu dosyadaki
   sayiyi degistirmek yetmeli.

   Bir deger birden fazla yerde lazimsa buradan okunur, kopyalanmaz. */

export const CONFIG = {
  /* --- Seviye --- */
  MAX_LEVEL: 99,

  /* Yumurta asamasi: bu seviyeye kadar ejderha henuz cikmamistir */
  EGG_UNTIL: 4,

  /* --- Besleme --- */
  /* Maliyet seviyeyle artar: temel + seviye * carpan */
  FEED_COST_BASE: 8,
  FEED_COST_PER_LEVEL: 1.5,
  FEED_XP: 1,

  /* --- Oyun oynama (PLAY) --- */
  /* Bedava ama bekleme sureli: jeton uretmeden etkilesim saglar */
  PLAY_XP: 1,
  PLAY_COOLDOWN_MS: 4 * 60 * 60 * 1000,  /* 4 saat */
  PLAY_HAPPINESS: 35,                     /* mutluluga eklenen puan */

  /* --- Doyum / mutluluk --- */
  FULL_HOURS: 12,        /* doyum kac saatte sifira iner */
  HAPPY_HOURS: 8,        /* mutluluk kac saatte sifira iner */
  HUNGRY_BELOW: 25,      /* bu yuzdenin altinda ejderha aciktir */
};

/* XP egrisi.
   99 seviyeyi tek tek yazmak yerine tek fonksiyon: seviye yukseldikce
   gereken besleme sayisi da artiyor. Egriyi degistirmek icin sadece burasi. */
export function xpNeeded(level) {
  return 2 + Math.floor(level / 8);
}

/* Bir seviyedeki besleme maliyeti */
export function feedCost(level) {
  return CONFIG.FEED_COST_BASE + Math.floor(level * CONFIG.FEED_COST_PER_LEVEL);
}

/* Seviye 1'den hedefe kadar toplam maliyet.
   Dukkanda ve ilerleme ekraninda "daha ne kadar lazim" demek icin. */
export function totalCostTo(level) {
  let toplam = 0;
  for (let l = 1; l < Math.min(level, CONFIG.MAX_LEVEL); l++) {
    toplam += xpNeeded(l) * feedCost(l);
  }
  return toplam;
}

/* Buyume orani 0..1 (yumurtadan cikis -> son seviye).
   Ejderhanin boyu, kanat acikligi ve boynuzlari bu tek sayiya bagli. */
export function growthRatio(level) {
  const bas = CONFIG.EGG_UNTIL + 1;
  return Math.max(0, Math.min(1, (level - bas) / (CONFIG.MAX_LEVEL - bas)));
}

/* SEVIYE ODULLERI

   Simdilik bos birakildi ama okuma yeri hazir: bir seviyeye odul eklemek
   icin buraya satir yazmak yeterli, oyun kodu degismez.

   Ornek:
     5:  { unlock: { accessory: 'monocle' } },
     10: { unlock: { skin: 'scales' } },
     50: { coins: 5000 },

   Kozmetiklerin kendi needLevel alani zaten var (data.js); burasi ise
   "seviye atlayinca ANINDA verilen" oduller icin. */
export const LEVEL_REWARDS = {};

/* Bir seviyeye ulasinca verilecek odul (yoksa null) */
export function rewardForLevel(level) {
  return LEVEL_REWARDS[level] ?? null;
}
