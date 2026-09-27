/* EKONOMI TABLOLARI
   Dengeyi degistirmek icin kodu kurcalamak gerekmesin diye hepsi burada.

   Tasarim mantigi (Duck My Duck'tan alinan dersler):
   - Birlestirmek her zaman beklemekten karli: iki Lv(n) yumurta 2 birim
     getiri verirken birlesmis Lv(n+1) yaklasik 3 birim veriyor.
   - Ejderhanin istahi besledikce buyuyor, ama 4 saatlik pencere dolunca
     sifirlaniyor; boylece oyuncu gun icinde birkac kez geri geliyor.
   - Odul veren her sey izgarada yer istiyor. Yer yoksa odul "sirada"
     bekliyor, yani oyuncu birlestirip yer acmaya zorlaniyor. */

/* Yumurta kirilinca tukenir: bekleme sayaci yok, tek seferde odulunu verir.
   Her kademe bir oncekinin yaklasik uc kati; iki yumurtayi birlestirmek
   ikisini ayri ayri kirmaktan her zaman karli. */
export const YUMURTA = {
  1: { az: 8,     cok: 15,    jackpot: 150,    sans: 0.03 },
  2: { az: 25,    cok: 45,    jackpot: 600,    sans: 0.03 },
  3: { az: 80,    cok: 140,   jackpot: 2000,   sans: 0.03 },
  4: { az: 240,   cok: 400,   jackpot: 6000,   sans: 0.03 },
  5: { az: 700,   cok: 1200,  jackpot: 18000,  sans: 0.035 },
  6: { az: 2000,  cok: 3400,  jackpot: 50000,  sans: 0.035 },
  7: { az: 6000,  cok: 9000,  jackpot: 140000, sans: 0.04 },
  8: { az: 18000, cok: 28000, jackpot: 400000, sans: 0.04 },
};

export const EN_UST_YUMURTA = 8;
export const EN_UST_SANDIK = 4;

/* ---------- KAP ACMA SURELERI ----------

   Kaplar artik dokununca hemen acilmiyor: bir sayac basliyor ve sure
   dolunca odul aliniyor. Sayac duvar saatiyle isliyor, yani oyun kapali
   ken de iliyor - oyuncuya geri donmek icin sebep veriyor.

   Beklemek istemeyen yildiz harcayip aninda aciyor. Fiyat kalan sureye
   gore, yani yarisi gecmis bir sandik yarisi kadar tutuyor. Bu, oyunun
   ilk SINIRSIZ yildiz harcama kalemi: kilitli hucreler ve yuvalar bir
   kez alininca bitiyor, bu her kapta yeniden geliyor. */
export const KAP_SURESI = {
  1: 10 * 60 * 1000,        /* kese          10 dk */
  2: 30 * 60 * 1000,        /* sepet         30 dk */
  3: 60 * 60 * 1000,        /* sandik         1 sa */
  4: 90 * 60 * 1000,        /* usta sandigi   1.5 sa */
};

/* Her 7 dakikalik bekleme 1 yildiz. Tam atlama bedeli boylece
   sirasiyla 2, 5, 9 ve 13 yildiz oluyor. */
export const YILDIZ_BASINA_DAKIKA = 7;

export function kapSuresi(lv) {
  return KAP_SURESI[Math.min(EN_UST_SANDIK, Math.max(1, lv))] || KAP_SURESI[1];
}

/* Kalan sureyi atlamanin yildiz bedeli. Bir yildizin altina inmiyor ki
   son saniyeler bedava olmasin. */
export function atlamaFiyati(kalanMs) {
  if (kalanMs <= 0) return 0;
  return Math.max(1, Math.ceil(kalanMs / 60000 / YILDIZ_BASINA_DAKIKA));
}

/* ---------- KESELER VE SANDIKLAR ----------

   Artik sabit bir sayi vermiyorlar: her kademenin bir odul araligi ve o
   araligin icinde bir oran merdiveni var. Alt basamak sik cikiyor, ust
   basamak nadir; yani ayni sandigi acan iki oyuncu ayni seyi almiyor.

   Kademeler: 1 kese, 2 sepet, 3 sandik, 4 usta sandigi.
   Odul kaynaklarinin cogu artik sadece KESE veriyor; sepet ve sandiklar
   ya birlestirmeyle ya da yildizla acilan kilitli hucrelerden geliyor.

   Her satir: [en az, en cok, yuzde]. Yuzdeler 100'e tamamlaniyor. */
export const SANDIK_MERDIVEN = {
  star: {
    1: [[7, 8, 50], [9, 10, 30], [11, 11, 15], [12, 12, 5]],
    2: [[30, 45, 50], [46, 65, 30], [66, 85, 15], [86, 100, 5]],
    3: [[250, 400, 50], [401, 450, 30], [451, 480, 15], [481, 500, 5]],
    4: [[1200, 1800, 50], [1801, 2100, 30], [2101, 2350, 15], [2351, 2500, 5]],
  },
  food: {
    1: [[1750, 3000, 50], [3001, 4000, 30], [4001, 4600, 15], [4601, 5000, 5]],
    2: [[7000, 12000, 50], [12001, 16000, 30], [16001, 18500, 15], [18501, 20000, 5]],
    3: [[28000, 48000, 50], [48001, 64000, 30], [64001, 74000, 15], [74001, 80000, 5]],
    4: [[110000, 190000, 50], [190001, 255000, 30], [255001, 296000, 15], [296001, 320000, 5]],
  },
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
   otomatik iniyor. Sinirsiz: oyuncunun kazandigi hicbir sey cope gitmez,
   seritte sadece ilk birkaci gosterilip gerisi sayi olarak yaziliyor. */
export const SIRA_GOSTERILEN = 4;

/* ---------- YUVALAR ---------- */

export const YUVA_FIYATLARI = [0, 50, 150, 400, 900, 2000];

export function yuvaFiyati(sira) {
  return YUVA_FIYATLARI[sira] ?? YUVA_FIYATLARI[YUVA_FIYATLARI.length - 1];
}

/* ---------- GUNLUK ODUL ---------- */

/* Yedi gunluk seri. Gun atlanirsa seri basa doner; yedinci gunden sonra
   yeniden birinci gunden basliyor. */
export const GUNLUK_ODULLER = [
  { food: 200 },
  { stars: 1 },
  { food: 600 },
  { item: { t: 'food', lv: 1 } },
  { stars: 3 },
  { item: { t: 'egg', lv: 4 } },
  { item: { t: 'star', lv: 1 } },
];

/* Gorev haritasi gorevler.js'e tasindi: uc kademeli yapi ve partner
   gorevleri orada. */

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

function merdiven(tip, lv) {
  const tablo = SANDIK_MERDIVEN[tip === 'star' ? 'star' : 'food'];
  return tablo[Math.min(EN_UST_SANDIK, Math.max(1, lv))] || tablo[1];
}

/* Panelde gosterilen aralik: en alt basamagin altiyla en ust basamagin ustu. */
export function sandikAraligi(tip, lv) {
  const m = merdiven(tip, lv);
  return { az: m[0][0], cok: m[m.length - 1][1] };
}

/* Acilista basamak yuzdelere gore seciliyor, sonra o basamagin icinde
   duz bir sayi cekiliyor. Ust basamak "buyuk vurus" hissi veriyor. */
export function sandikDegeri(tip, lv) {
  const m = merdiven(tip, lv);
  const toplam = m.reduce((s, [, , y]) => s + y, 0);
  let zar = Math.random() * toplam;
  for (const [az, cok, yuzde] of m) {
    zar -= yuzde;
    if (zar < 0) return az + Math.floor(Math.random() * (cok - az + 1));
  }
  const son = m[m.length - 1];
  return son[0] + Math.floor(Math.random() * (son[1] - son[0] + 1));
}

/* Ustteki basamak cikti mi? Acilis mesajini vurgulamak icin. */
export function ustBasamakMi(tip, lv, deger) {
  const m = merdiven(tip, lv);
  return deger >= m[m.length - 1][0];
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
