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

   SAYILAR REFERANS OYUNUN MATEMATIGINDEN TURETILDI (Duck My Duck'in
   kendi yumurta tablosu cozulerek). Uc kural:

     1. Orta deger = taban x 2,2^(sv-1).  Her kademe bir oncekinin 2,2
        kati. (Bizde once 3 kati idi; ust kademeler o yuzden sisiyordu.)
     2. Aralik = orta degerin %85'i ile %115'i.
     3. Jackpot carpani DUSUYOR: alt kademede orta degerin ~26 kati,
        ust kademede ~6 kati. Bizde her kademede sabit ~18 katti ve
        jackpotlar bu yuzden fazla geliyordu - Sv.10'da 3,2 milyondan
        83 bine indi.

   Ucuncu kural tasarimin asil fikri: alt seviye yumurta bir piyango,
   ust seviye yumurta duzenli gelir. Oyuncu asagida sans, yukarida
   istikrar aliyor.

   Taban Sv.1'de 11,5 olarak BIZIM olcegimizde birakildi (eski 8-15'in
   ortasi), cunku besleme maliyeti, sandiklar ve gorev hedefleri ona
   gore ayarli.

   DIKKAT: 2,2 merdiveninde birlestirme kari 1,02-1,11 kat, yani
   neredeyse basa bas. Referans oyunda yukari cikmanin odulu yem degil
   daha iyi ordek; bizde ejderha orani tersine cevrildigi icin o odul
   yok. Birlestirmenin kalan sebepleri: tuccar siparisleri (kirmaya gore
   1,7 kat odiyor) ve izgarada yer acmak. */
export const YUMURTA = {
  1:  { az: 10,    cok: 13,    jackpot: 300,   sans: 0.03 },
  2:  { az: 22,    cok: 29,    jackpot: 550,   sans: 0.03 },
  3:  { az: 47,    cok: 64,    jackpot: 1000,  sans: 0.03 },
  4:  { az: 104,   cok: 141,   jackpot: 2000,  sans: 0.03 },
  5:  { az: 229,   cok: 310,   jackpot: 3500,  sans: 0.035 },
  6:  { az: 504,   cok: 682,   jackpot: 6500,  sans: 0.035 },
  7:  { az: 1108,  cok: 1499,  jackpot: 13000, sans: 0.04 },
  8:  { az: 2438,  cok: 3299,  jackpot: 24000, sans: 0.04 },
  9:  { az: 5364,  cok: 7257,  jackpot: 44000, sans: 0.045 },
  10: { az: 11801, cok: 15966, jackpot: 83000, sans: 0.045 },
};

export const EN_UST_YUMURTA = 10;
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
  /* Yumurta tablosu referans matematigine gecince (bkz. YUMURTA) ust
     kademeler onda bire indi; sandiklar eski olcekte kalsaydi bir Sv.4
     sandik en ust yumurtanin 15 katini verirdi. Bantlarin KENDI oranlari
     (.519/.889/1.185/1.363/1.481) aynen korundu, yalnizca orta degerler
     yeni olcege tasindi - yani "bu sandik kabaca su kademe yumurta eder"
     iliskisi degismedi. */
  food: {
    1: [[370, 630, 50], [631, 830, 30], [831, 960, 15], [961, 1000, 5]],
    2: [[1000, 1800, 50], [1801, 2300, 30], [2301, 2700, 15], [2701, 2900, 5]],
    3: [[2800, 4800, 50], [4801, 6400, 30], [6401, 7400, 15], [7401, 8000, 5]],
    4: [[7200, 12500, 50], [12501, 16500, 30], [16501, 19000, 15], [19001, 20500, 5]],
  },
};

/* Ejderha beslenince yumurta birakir: %80 Lv1, %20 Lv2 */
/* Beslemenin dusurdugu yumurtanin seviyesi ARTIK TURE BAGLI.

   Onceden her ejderha ayni dagilimi veriyordu: %80 Sv.1, %20 Sv.2. Bu,
   nadirligi tamamen bedava birakiyordu - 2.000 yildizlik Bulutsu
   ejderhasi 50 yildizlik Okyanus'tan hicbir seyi daha iyi yapmiyor,
   sadece mor goruniyordu. Yuva fiyat merdiveninin (50 -> 2.000) karsilik
   gelen bir getirisi yoktu.

   Sv.2 yumurta Sv.1'in yaklasik uc kati degerinde (25-45 yem vs 8-15),
   Sv.3 onun da uc kati. Yani Efsanevi bir ejderha ayni beslemeyle kabaca
   dort kat getiriyor. Yuvanin fiyati artik bir sey satin aliyor. */
export const BESLEME_YUMURTA = {
  common:    [{ lv: 1, sans: 0.80 }, { lv: 2, sans: 0.20 }],
  rare:      [{ lv: 1, sans: 0.50 }, { lv: 2, sans: 0.40 }, { lv: 3, sans: 0.10 }],
  epic:      [{ lv: 1, sans: 0.30 }, { lv: 2, sans: 0.45 }, { lv: 3, sans: 0.25 }],
  legendary: [{ lv: 1, sans: 0.15 }, { lv: 2, sans: 0.40 }, { lv: 3, sans: 0.35 }, { lv: 4, sans: 0.10 }],
};

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

/* ---------- IZGARA GENISLEMESI ----------

   Izgara 4x4 baslıyor; sagi ve alti kilitli. IKINCI EJDERHA YUVASI
   acilinca 5x5'e cikiyor - ama yeni gelen sira SOLA ve USTE ekleniyor
   ve hepsi KILITLI geliyor. Yani genisleme bedava bir alan degil, yeni
   bir kilit merdiveni: oyunun ilk gunundeki duygu tekrar ediyor.

   Fiyatlar oyuncunun tahtasina EN YAKIN hucreden baslıyor. Kose (0)
   en son, cunku oraya ulasmak icin iki kenarin da acilmasi gerekiyor -
   ve en pahali olmasi onu bir hedef yapiyor.

   Anahtarlar 5x5 izgaradaki indis: ust satir 0-4, sol sutun 5/10/15/20. */
export const GENISLEME_N = 5;

export const GENISLEME_KILITLERI = {
  5:  { fiyat: 60,  odul: { t: 'egg',  lv: 7 } },
  1:  { fiyat: 90,  odul: { t: 'egg',  lv: 7 } },
  10: { fiyat: 130, odul: { t: 'food', lv: 4 } },
  2:  { fiyat: 180, odul: { t: 'egg',  lv: 8 } },
  15: { fiyat: 240, odul: { t: 'egg',  lv: 8 } },
  3:  { fiyat: 320, odul: { t: 'star', lv: 4 } },
  20: { fiyat: 420, odul: { t: 'egg',  lv: 8 } },
  4:  { fiyat: 560, odul: { t: 'food', lv: 4 } },
  0:  { fiyat: 760, odul: { t: 'star', lv: 4 } },
};

/* Genisleme hangi yuva sayisinda aciliyor. */
export const GENISLEME_YUVA = 2;

/* Izgara doluyken kazanilan oduller burada bekliyor, yer acilinca
   otomatik iniyor. Sinirsiz: oyuncunun kazandigi hicbir sey cope gitmez,
   seritte sadece ilk birkaci gosterilip gerisi sayi olarak yaziliyor. */
export const SIRA_GOSTERILEN = 4;

/* ---------- YUVALAR ---------- */

/* Yuvalar SINIRSIZ ama bedava degil. Ilk altisi elle yazilmis bir
   merdiven, sonrasi her adimda 2,2 kat. Tavan yok - oyuncu istedigi
   kadar ejderha tutabiliyor, ama her yeni yuva bir oncekinin iki
   katindan pahali, yani yildiz gideri hic tukenmiyor.

   Onceden liste alti elemanda bitiyordu ve altinci yuvadan sonrasi
   satin alinamiyordu; tur de yuva sirasina bagliydi, bu da ejderhayi
   odul degil satin alma haline getiriyordu. */
export const YUVA_FIYATLARI = [0, 50, 150, 400, 900, 2000];
const YUVA_CARPAN = 2.2;

/* Akil sagligi siniri: kayit sisirmesin ve serit sonsuza gitmesin.
   Oyunun dengesine degil, sadece kotu veriye karsi duruyor. */
export const YUVA_TAVANI = 40;

export function yuvaFiyati(sira) {
  if (sira < YUVA_FIYATLARI.length) return YUVA_FIYATLARI[sira];
  const son = YUVA_FIYATLARI[YUVA_FIYATLARI.length - 1];
  const adim = sira - (YUVA_FIYATLARI.length - 1);
  /* 100'un katina yuvarlaniyor: 4.400, 9.700, 21.300 gibi okunur sayilar */
  return Math.round(son * YUVA_CARPAN ** adim / 100) * 100;
}

/* ---------- EJDERHA SANSI ----------

   KURAL: oran her kademede %5'in ALTINDA ve seviye yukseldikce DUSUYOR.

   Bu, ilk bakista ters gelebilir - normalde pahali olan daha cok verir.
   Burada tersi kasitli: ejderha YUKSEK seviyeden degil, COK yumurta
   kirmaktan geliyor. Boylece iki ayri oyun tarzi doguyor:

     - Sv.1'leri hizla kirip sans denemek (ejderha yolu)
     - Birlestirip yukari cikmak (yem yolu, ustte getiri cok daha yuksek)

   Oran her kademede bir oncekinin %80'i. Taban Sv.1'de %0,20: bir
   ejderha ortalama 500 Sv.1 yumurtaya mal oluyor, yani bugunku maliyetle
   (Sv.8'de %25 = 512 taban yumurta) asagi yukari AYNI. Ejderhayi daha
   bol ya da daha nadir yapmak icin degistirilecek tek sayi Sv.1'inki;
   geri kalani ondan tureyen bir egri.

   Cikmazsa yumurta yine normal yem odulunu veriyor - emek bosa gitmiyor. */
export const EJDERHA_SANSI = {
  1:  0.0020,
  2:  0.0016,
  3:  0.0013,
  4:  0.0010,
  5:  0.0008,
  6:  0.00065,
  7:  0.00052,
  8:  0.00042,
  9:  0.00034,
  10: 0.00027,
};

export function ejderhaSansi(lv) {
  return EJDERHA_SANSI[lv] || 0;
}

/* ---------- GUNLUK ODUL ---------- */

/* Yedi gunluk seri. Gun atlanirsa seri basa doner; yedinci gunden sonra
   yeniden birinci gunden basliyor. */
export const GUNLUK_ODULLER = [
  { food: 85 },
  { stars: 1 },
  { food: 190 },
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

export function beslemeYumurtaSeviyesi(nadir = 'common') {
  const tablo = BESLEME_YUMURTA[nadir] || BESLEME_YUMURTA.common;
  const r = Math.random();
  let toplam = 0;
  for (const s of tablo) {
    toplam += s.sans;
    if (r < toplam) return s.lv;
  }
  return tablo[0].lv;
}

/* Yuva kartinda ve ejderha kartinda yazan "Sv.1-3 yumurta" araligi. */
export function yumurtaAraligi(nadir = 'common') {
  const tablo = BESLEME_YUMURTA[nadir] || BESLEME_YUMURTA.common;
  return { az: tablo[0].lv, cok: tablo[tablo.length - 1].lv };
}

/* ---------- BOSTA URETIM ----------

   Ejderha oyun kapaliyken de yumurta biriktiriyor, ama DEPOSU DOLUNCA
   DURUYOR. Dragon City'nin on dort yildir calisan geri getirme araci bu:
   "doldu, bosa gidiyor" hissi, odul vaadinden daha guclu cekiyor.

   Ayni zamanda ikinci ejderhanin degerini oyuncunun gorebilecegi bir
   sayiya ceviriyor - iki ejderha iki kat bosta uretim demek. Sadece
   ACIK yuvadakiler uretiyor; yuva satin almanin dogrudan karsiligi. */
export const BOSTA_ARALIK = 90 * 60 * 1000;      /* 90 dk'da bir yumurta */
export const BOSTA_TAVAN = 3;                    /* ejderha basina en fazla */

/* Saf fonksiyon: gecen sureye gore yeni durumu hesapliyor.

   Tavan dolunca `son` OLDUGU GIBI BIRAKILIYOR. Ilk surumde her cagrida
   simdiye cekiliyordu; saniyede bir donen tik bunu "durum degisti" diye
   okuyup her saniye kaydet() cagiriyordu - yani butun kaydi JSON'a
   cevirip localStorage'a yazan bir dongu. Toplama zaten `son`u elle
   simdiye aliyor, burada dokunmaya gerek yok. */
export function bostaHesapla(bosta, simdi) {
  let { son = simdi, biriken = 0 } = bosta || {};
  if (biriken >= BOSTA_TAVAN) return { son, biriken: BOSTA_TAVAN, kalan: 0, dolu: true };

  while (biriken < BOSTA_TAVAN && simdi - son >= BOSTA_ARALIK) {
    biriken += 1;
    son += BOSTA_ARALIK;
  }
  if (biriken >= BOSTA_TAVAN) return { son, biriken: BOSTA_TAVAN, kalan: 0, dolu: true };
  return { son, biriken, kalan: BOSTA_ARALIK - (simdi - son), dolu: false };
}
