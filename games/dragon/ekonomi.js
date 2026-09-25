/* EKONOMI TABLOLARI
   Tek yerde toplandi ki dengeyi degistirirken kodu kurcalamak gerekmesin.

   Tasarim mantigi: birlestirmek her zaman beklemekten karli olmali.
   Iki Lv(n) yumurtanin toplami 2 birim getiri verirken, birlestirilmis
   Lv(n+1) yumurta yaklasik 3 birim veriyor. Oyuncu bunu yumurtanin
   bilgi penceresinde gorebildigi icin birlestirmeye tesvik ediliyor. */

export const TOPLAMA_SURESI = 15 * 60 * 1000;   /* yumurta bu kadarda bir dolar */

/* Yumurta getirileri: [en az yem, en cok yem, jackpot yemi, jackpot ihtimali] */
export const YUMURTA = {
  1: { az: 2,    cok: 6,    jackpot: 100,    sans: 0.03 },
  2: { az: 8,    cok: 15,   jackpot: 500,    sans: 0.03 },
  3: { az: 25,   cok: 45,   jackpot: 1500,   sans: 0.03 },
  4: { az: 70,   cok: 120,  jackpot: 4000,   sans: 0.03 },
  5: { az: 180,  cok: 300,  jackpot: 10000,  sans: 0.035 },
  6: { az: 450,  cok: 750,  jackpot: 25000,  sans: 0.035 },
  7: { az: 1100, cok: 1800, jackpot: 60000,  sans: 0.04 },
  8: { az: 2600, cok: 4200, jackpot: 150000, sans: 0.04 },
};

export const EN_UST_YUMURTA = 8;
export const EN_UST_SANDIK = 4;

/* Sandiklar tek kullanimlik: acilinca tukenir, icindekini verir.
   Birlestirildikce degeri katlanir, boylece onlar da merge'e tesvik eder. */
export const SANDIK = {
  food: { 1: 50, 2: 150, 3: 450, 4: 1200 },
  star: { 1: 1,  2: 3,   3: 8,   4: 20 },
};

/* Ejderha beslenince yumurta birakir: %80 Lv1, %20 Lv2 */
export const BESLEME_YUMURTA = [
  { lv: 1, sans: 0.80 },
  { lv: 2, sans: 0.20 },
];

/* Besleme maliyeti: ejderha buyudukce daha cok yem istiyor.
   Seviye icinde de her beslemede biraz artiyor, boylece oyuncu izgarada
   daha yuksek seviyeli yumurtalara gecmeye zorlaniyor. Ust sinir var ki
   dongü tikanmasin: son seviyede sabit kaliyor. */
export const YEM_MALIYETI = {
  1: { taban: 2,  artis: 1 },
  2: { taban: 12, artis: 3 },
  3: { taban: 60, artis: 0 },
};

export function yemMaliyeti(level, xp = 0) {
  const a = YEM_MALIYETI[Math.min(3, Math.max(1, level))] || YEM_MALIYETI[3];
  return a.taban + a.artis * Math.max(0, xp);
}

/* 4x4 izgarada ucretsiz alan 3x3; en sag sutun ve en alt satir kilitli.
   Her kilitli hucre hem slotu hem icindeki odulu satiyor: oyuncu "sadece
   yer degil, odul de aliyorum" hissi yasasin diye. */
export const KILITLI_HUCRELER = {
  3:  { fiyat: 25,  odul: { t: 'egg',  lv: 7 } },
  7:  { fiyat: 40,  odul: { t: 'egg',  lv: 7 } },
  11: { fiyat: 60,  odul: { t: 'food', lv: 4 } },
  12: { fiyat: 85,  odul: { t: 'egg',  lv: 7 } },
  13: { fiyat: 120, odul: { t: 'egg',  lv: 8 } },
  14: { fiyat: 160, odul: { t: 'egg',  lv: 8 } },
  15: { fiyat: 220, odul: { t: 'star', lv: 4 } },
};

/* Ejderha yuvalari: ilki bedava, sonrakiler yildizla aciliyor.
   Kilitli yuvadaki ejderha beslenemez, sadece onizleme olarak durur. */
export const YUVA_FIYATLARI = [0, 50, 150, 400, 900, 2000];

export function yuvaFiyati(sira) {
  return YUVA_FIYATLARI[sira] ?? YUVA_FIYATLARI[YUVA_FIYATLARI.length - 1];
}

export function odulAraligi(hucre) {
  if (!hucre) return null;
  if (hucre.t === 'egg') return YUMURTA[Math.min(EN_UST_YUMURTA, hucre.lv)];
  return null;
}

/* Toplama sonucu: jackpot cikti mi, ne kadar yem geldi */
export function toplamaSonucu(lv) {
  const a = YUMURTA[Math.min(EN_UST_YUMURTA, lv)];
  if (Math.random() < a.sans) return { miktar: a.jackpot, jackpot: true };
  const miktar = a.az + Math.floor(Math.random() * (a.cok - a.az + 1));
  return { miktar, jackpot: false };
}

export function sandikDegeri(tip, lv) {
  const tablo = SANDIK[tip === 'star' ? 'star' : 'food'];
  return tablo[Math.min(EN_UST_SANDIK, lv)] ?? 0;
}

export function beslemeYumurtaSeviyesi() {
  const r = Math.random();
  let toplam = 0;
  for (const s of BESLEME_YUMURTA) {
    toplam += s.sans;
    if (r < toplam) return s.lv;
  }
  return 1;
}
