/* KUR - OYUNUN TEK DEGISIM CAPASI

   NEDEN VAR

   Iki buyuk referans oyunu inceledik ve ikisi de ayni seyi yapiyordu:
   butun ekonomi TEK bir denklemden turuyor.

     Clash Royale:   1 mucevher = 10 dakika bekleme ~ 20 altin
     Social Empires: 1 premium  = 500 altin

   Bizde boyle bir denklem YOKTU. Her odul elle yazildigi icin ayni
   seyin fiyati yerine gore degisiyordu. 2026-10-29'da olculen sapma:

     Gorev a7:  3 yildiz + 560 yem   -> 1 yildiz = 187 yem
     Gorev o7: 12 yildiz + 3.100 yem -> 1 yildiz = 258 yem
     Gorev p7: 400 yildiz + 9.900 yem -> 1 yildiz =  25 yem   (!)

   On kat. Kimse yanlis bir sayi yazmadi; sadece dayanilacak bir sayi
   yoktu. Bu dosya o sayiyi veriyor ve test-kur.mjs sapanlari yakaliyor.

   CAPA NASIL TURETILDI

   Elle bir sayi secmedik, oyunun kendi tablolarindan cikardik:

     1. Bir yildiz = YILDIZ_BASINA_DAKIKA (7) dakika bekleme.
        Bu zaten dogruydu; atlamaFiyati() bunu uyguluyor.
     2. Bir dakika bekleme = taban kabin (Lv1 kese) dakika basina
        verdigi yem. 652 yem / 10 dk = 65 yem/dk.
     3. Carpinca: 1 yildiz = 7 x 65 = 456 yem. Okunur olsun diye
        onluga yuvarlandi.

   Onemli olan sonuc degil TURETME: YILDIZ_BASINA_DAKIKA'yi degistiren
   biri kuru da otomatik kaydiriyor. Clash Royale'in butun tablosunun
   tek sayiya bagli olmasindaki ozellik tam olarak bu.

   NE ICIN KULLANILIR

   yemDegeri(odul): herhangi bir odulu tek bir yem sayisina cevirir.
   Iki odulu karsilastirmanin tek dogru yolu bu; "3 yildiz mi yoksa
   Sv.5 yumurta mi daha iyi" sorusunun cevabi artik var.

   NE ICIN KULLANILMAZ

   Bu bir oyun ici takas tezgahi DEGIL ve olmayacak. Oyuncu yildizi
   yeme, yemi yildiza ceviremez; ikisi ayri kaynak olarak kaliyor.
   Kur yalnizca TASARIM araci: odulleri ayni olcege koyup birbiriyle
   karsilastirmak ve denetciye (test-kur.mjs) olcu vermek icin. */

import { YILDIZ_BASINA_DAKIKA, KAP_SURESI, SANDIK_MERDIVEN, YUMURTA,
         EN_UST_YUMURTA, EN_UST_SANDIK } from './ekonomi.js?v305';

/* Capanin turetildigi kap. Lv1 kese secildi cunku oyunun en yaygin
   ve en erken kabi; oyuncunun ilk ogrendigi zaman-yem orani o. */
const TABAN_KAP = 1;

/* ---------- BEKLENEN DEGERLER ----------

   Odul tablolari aralik veriyor, tek sayi degil. Karsilastirmak icin
   beklenen degere ihtiyac var. Bu iki fonksiyon ekonomi.js'teki
   tablolarin TEK dogru okumasi; baska yerde elle ortalama alinmasin. */

/* Sandik merdiveninin beklenen degeri: her basamagin olasiligi carpi
   o basamagin orta noktasi. */
export function sandikBeklenen(tip, lv) {
  const tablo = SANDIK_MERDIVEN[tip === 'star' ? 'star' : 'food'];
  const m = tablo[Math.min(EN_UST_SANDIK, Math.max(1, lv))] || tablo[1];
  const toplam = m.reduce((s, [, , y]) => s + y, 0) || 100;
  return m.reduce((s, [az, cok, y]) => s + (y / toplam) * ((az + cok) / 2), 0);
}

/* Yumurtanin beklenen degeri: jackpot sansi da hesaba katiliyor.
   Jackpot'u atlamak alt kademe yumurtalari sistematik olarak
   degersiz gosteriyordu - Sv.1'in degerinin yarisi jackpot'tan geliyor
   (11,2 normal + 9,0 jackpot = 20,2). */
export function yumurtaBeklenen(lv) {
  const a = YUMURTA[Math.min(EN_UST_YUMURTA, Math.max(1, lv))] || YUMURTA[1];
  const normal = (a.az + a.cok) / 2;
  return normal * (1 - a.sans) + a.jackpot * a.sans;
}

/* ---------- CAPA ---------- */

/* Taban kabin dakika basina verdigi yem. Turetilmis, elle yazilmamis. */
export const YEM_DAKIKA = Math.round(
  sandikBeklenen('food', TABAN_KAP) / (KAP_SURESI[TABAN_KAP] / 60000),
);

/* OYUNUN CAPASI: bir yildizin yem cinsinden degeri.
   7 dk/yildiz x 65 yem/dk = 456 -> 460. */
export const YILDIZ_YEM = Math.round(YILDIZ_BASINA_DAKIKA * YEM_DAKIKA / 10) * 10;

export function yildizdanYem(n) {
  return Math.round(Math.max(0, Number(n) || 0) * YILDIZ_YEM);
}

export function yemdenYildiz(n) {
  return Math.max(0, Number(n) || 0) / YILDIZ_YEM;
}

/* ---------- ODUL DEGERI ----------

   Her odul sekli tek bir yem sayisina iniyor. Desteklenen sekiller
   dragon.js'in odulVer()'inin tanidiklariyla ayni: food, stars, item,
   items - ARTI kilitli hucrelerin kullandigi ciplak {t, lv}.

   O ciplak sekil ilk yazimda atlanmisti ve denetci 44 odulun 13'unu
   fiyatlayamadi. Hata vermesi iyi oldu: sessiz sifir donseydi kilit
   merdiveninin odulleri "degersiz" sayilir ve asagidaki yildiz
   uretimi denetimden gecerdi.

   Tanimayan bir sekil gelirse SESSIZCE 0 donmuyor, hata atiyor: sessiz
   sifir denetciyi kor eder, yani yeni bir odul tipi eklendiginde
   denetim onu gormezden gelir ve biz bunu fark etmeyiz. */
export function yemDegeri(odul) {
  if (!odul) return 0;
  let toplam = 0;
  let tanidi = false;

  if (odul.food) { toplam += Number(odul.food) || 0; tanidi = true; }
  if (odul.stars) { toplam += yildizdanYem(odul.stars); tanidi = true; }

  const nesneler = [];
  /* Kilitli hucreler odulu sarmalamadan veriyor: {t:'egg', lv:7} */
  if (odul.t) nesneler.push(odul);
  if (odul.item) nesneler.push(odul.item);
  if (Array.isArray(odul.items)) nesneler.push(...odul.items);

  for (const n of nesneler) {
    tanidi = true;
    if (n.t === 'egg') toplam += yumurtaBeklenen(n.lv);
    else if (n.t === 'food' || n.t === 'star') toplam += sandikBeklenen(n.t, n.lv);
    else throw new Error(`yemDegeri: taninmayan nesne tipi ${JSON.stringify(n)}`);
  }

  if (!tanidi) throw new Error(`yemDegeri: taninmayan odul ${JSON.stringify(odul)}`);
  return Math.round(toplam);
}
