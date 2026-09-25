/* EKONOMI TABLOLARI
   Dengeyi degistirmek icin kodu kurcalamak gerekmesin diye hepsi burada.

   Tasarim mantigi (Duck My Duck'tan alinan dersler):
   - Birlestirmek her zaman beklemekten karli: iki Lv(n) yumurta 2 birim
     getiri verirken birlesmis Lv(n+1) yaklasik 3 birim veriyor.
   - Ejderhanin istahi besledikce buyuyor, ama 4 saatlik pencere dolunca
     sifirlaniyor; boylece oyuncu gun icinde birkac kez geri geliyor.
   - Odul veren her sey izgarada yer istiyor. Yer yoksa odul "sirada"
     bekliyor, yani oyuncu birlestirip yer acmaya zorlaniyor. */

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

/* Sandiklar tek kullanimlik: acilinca tukenir. Birlestirildikce katlaniyor. */
export const SANDIK = {
  food: { 1: 50, 2: 150, 3: 450, 4: 1200 },
  star: { 1: 1,  2: 3,   3: 8,   4: 20 },
};

/* Ejderha beslenince yumurta birakir: %80 Lv1, %20 Lv2 */
export const BESLEME_YUMURTA = [
  { lv: 1, sans: 0.80 },
  { lv: 2, sans: 0.20 },
];

/* ---------- BESLEME ---------- */

/* Ilk beslemeyle 4 saatlik pencere aciliyor. Pencere icinde her besleme
   bir oncekinden pahali; pencere dolunca istah sifirdan basliyor. */
export const BESLEME_PENCERESI = 4 * 60 * 60 * 1000;

export const BESLEME_EGRISI = {
  1: { taban: 2,  artis: 2 },
  2: { taban: 8,  artis: 4 },
  3: { taban: 20, artis: 6 },
};

export function yemMaliyeti(level, penceredekiBesleme = 0) {
  const a = BESLEME_EGRISI[Math.min(3, Math.max(1, level))] || BESLEME_EGRISI[3];
  return a.taban + a.artis * Math.max(0, penceredekiBesleme);
}

/* Seviye atlamak icin gereken toplam besleme sayisi.
   3. seviyeden sonra "tok ejderha" rozeti icin 175 besleme daha gerekiyor. */
export const SEVIYE_BESLEME = { 1: 100, 2: 150, 3: 175 };

export function seviyeIcinBesleme(level) {
  return SEVIYE_BESLEME[level] ?? SEVIYE_BESLEME[3];
}

/* ---------- IZGARA ---------- */

/* 4x4 izgarada ucretsiz alan 3x3; en sag sutun ve en alt satir kilitli.
   Her kilitli hucre hem yeri hem icindeki odulu satiyor. */
export const KILITLI_HUCRELER = {
  3:  { fiyat: 25,  odul: { t: 'egg',  lv: 7 } },
  7:  { fiyat: 40,  odul: { t: 'egg',  lv: 7 } },
  11: { fiyat: 60,  odul: { t: 'food', lv: 4 } },
  12: { fiyat: 85,  odul: { t: 'egg',  lv: 7 } },
  13: { fiyat: 120, odul: { t: 'egg',  lv: 8 } },
  14: { fiyat: 160, odul: { t: 'egg',  lv: 8 } },
  15: { fiyat: 220, odul: { t: 'star', lv: 4 } },
};

/* Izgara doluyken kazanilan oduller burada bekliyor, yer acilinca
   otomatik iniyor. Duck My Duck'in "up next" seridi ile ayni fikir. */
export const SIRA_KAPASITESI = 5;

/* ---------- YUVALAR ---------- */

export const YUVA_FIYATLARI = [0, 50, 150, 400, 900, 2000];

export function yuvaFiyati(sira) {
  return YUVA_FIYATLARI[sira] ?? YUVA_FIYATLARI[YUVA_FIYATLARI.length - 1];
}

/* ---------- GUNLUK ODUL ---------- */

/* Yedi gunluk seri. Gun atlanirsa seri basa doner; yedinci gunden sonra
   yeniden birinci gunden basliyor. */
export const GUNLUK_ODULLER = [
  { food: 20 },
  { stars: 1 },
  { food: 60 },
  { item: { t: 'food', lv: 2 } },
  { stars: 3 },
  { item: { t: 'egg', lv: 3 } },
  { item: { t: 'star', lv: 3 } },
];

/* ---------- GOREV HARITASI ---------- */

/* Sirayla acilan gorevler: biri bitmeden sonraki gorunmuyor, boylece
   oyuncunun onunde tek bir sonraki hedef duruyor. Odullerin cogu izgaraya
   inen nesne; yer yoksa siraya giriyor ve oyuncu yer acmak zorunda kaliyor. */
export const GOREV_HARITASI = [
  { id: 'm1',  tip: 'merge',   hedef: 5,   odul: { food: 30 } },
  { id: 'f1',  tip: 'feed',    hedef: 10,  odul: { item: { t: 'egg', lv: 2 } } },
  { id: 'c1',  tip: 'collect', hedef: 15,  odul: { stars: 1 } },
  { id: 'm2',  tip: 'merge',   hedef: 20,  odul: { item: { t: 'food', lv: 1 } } },
  { id: 'e4',  tip: 'egglv',   hedef: 4,   odul: { item: { t: 'egg', lv: 3 } } },
  { id: 'f2',  tip: 'feed',    hedef: 20,  odul: { item: { t: 'star', lv: 2 } } },
  { id: 'm3',  tip: 'merge',   hedef: 50,  odul: { item: { t: 'egg', lv: 5 } } },
  { id: 'c2',  tip: 'collect', hedef: 60,  odul: { item: { t: 'food', lv: 3 } } },
  { id: 'e6',  tip: 'egglv',   hedef: 6,   odul: { stars: 5 } },
  { id: 'd2',  tip: 'draglv',  hedef: 2,   odul: { item: { t: 'star', lv: 3 } } },
  { id: 'm4',  tip: 'merge',   hedef: 120, odul: { item: { t: 'egg', lv: 7 } } },
  { id: 'c3',  tip: 'collect', hedef: 200, odul: { item: { t: 'star', lv: 4 } } },
  { id: 'd3',  tip: 'draglv',  hedef: 3,   odul: { item: { t: 'egg', lv: 8 } } },
];

export function odulAraligi(hucre) {
  if (!hucre) return null;
  if (hucre.t === 'egg') return YUMURTA[Math.min(EN_UST_YUMURTA, hucre.lv)];
  return null;
}

/* Toplama sonucu: jackpot cikti mi, ne kadar yem geldi */
export function toplamaSonucu(lv) {
  const a = YUMURTA[Math.min(EN_UST_YUMURTA, lv)];
  if (Math.random() < a.sans) return { miktar: a.jackpot, jackpot: true };
  return { miktar: a.az + Math.floor(Math.random() * (a.cok - a.az + 1)), jackpot: false };
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
