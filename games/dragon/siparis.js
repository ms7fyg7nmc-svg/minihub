/* TUCCAR SIPARISLERI

   Merge turunun motoru bu ve oyunda hic yoktu. Oyuncu merge ediyordu
   ama NEDEN merge ettigini bilmiyordu - zincir sadece yukari gidiyordu.
   Siparis, uretilen seye bir alici buluyor: "3 tane Lv.4 yumurta getir,
   karsiliginda su kadar yem."

   Tuccar, tutorial'daki buyucu dede. Oyuncunun oyuna girerken tanistigi
   yuz; sonradan ortaya cikan yabanci bir satici degil.

   IKI KURAL bu dosyanin tamamini belirliyor:

   1. ISTENEN SEY HER ZAMAN URETILEBILIR OLMALI. Siparisler oyuncunun
      ULASTIGI en yuksek yumurta seviyesine gore uretiliyor, hicbir
      zaman onun ustune cikmiyor. Yapamayacagi bir sipariş, odul degil
      duvar olurdu.

   2. TESLIM ETMEK KIRMAKTAN KARLI OLMALI. Yumurtayi kirmak zaten yem
      veriyor; siparis o degerin uzerine PRIM koyuyor. Aksi halde hicbir
      oyuncu teslim etmez, hepsi kirardi. */

import { YUMURTA, EN_UST_YUMURTA } from './ekonomi.js?v240';

export const ACIK_SIPARIS = 2;

/* Kirmaya gore ne kadar fazla odedigimiz. 1.0 = kirmakla ayni (yani
   anlamsiz), 1.7 = teslim etmek belirgin sekilde karli. */
const PRIM = 1.7;

/* Her ucuncu siparis yildiz da veriyor. Yildiz oyunun kit kaynagi -
   kilitli hucre ve yuva onunla aciliyor - bu yuzden her siparise
   konulmuyor, yoksa kilitlerin anlami kalmaz. */
const YILDIZ_PERIYODU = 3;

/* Yumurtanin KIRILDIGINDA getirdigi ortalama yem. Jackpot ihtimali de
   hesaba katiliyor, yoksa prim oldugundan buyuk gorunurdu. */
export function yumurtaDegeri(lv) {
  const a = YUMURTA[Math.min(EN_UST_YUMURTA, Math.max(1, lv))];
  return Math.round((a.az + a.cok) / 2 + a.jackpot * a.sans);
}

/* Okunakli sayi: 1847 yerine 1850, 23410 yerine 23000. Odul rozetinde
   yuvarlak sayilar hem daha iyi duruyor hem akilda kaliyor. */
function yuvarla(n) {
  if (n < 100) return Math.max(10, Math.round(n / 5) * 5);
  if (n < 1000) return Math.round(n / 10) * 10;
  if (n < 10000) return Math.round(n / 50) * 50;
  return Math.round(n / 500) * 500;
}

const rast = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/* Oyuncunun siparise konu olabilecek seviye araligi.

   Ust sinir ulasilan en yuksek seviyenin BIR ALTI: oyuncu Lv.6'ya bir
   kez ulastiysa Lv.6 istemek onu tum ilerlemesini tek siparise yatirmaya
   zorlar. Alt sinir da cok asagi inmiyor, yoksa ilerlemis bir oyuncuya
   Lv.1 yumurta siparisi gelir ve siparis sistemi onemsizlesir. */
function seviyeAraligi(maxEggLv) {
  const ulasilan = Math.max(1, Math.min(EN_UST_YUMURTA, Number(maxEggLv) || 1));
  const ust = Math.max(1, Math.min(EN_UST_YUMURTA - 1, ulasilan - 1));
  const alt = Math.max(1, ust - 2);
  return { alt, ust };
}

/* Yuksek seviyede adet dusuyor: 3 tane Lv.6 yumurta, 3 tane Lv.2'den
   sekiz kat daha pahali - ayni adet iki siparisi cok farkli agirliklara
   sokardi. */
function adetSec(lv) {
  if (lv <= 2) return rast(2, 4);
  if (lv <= 4) return rast(2, 3);
  return rast(1, 2);
}

let sayacTohum = 0;

/* Tek bir siparis uretir. `kacinilacak` o anda acik olan diger
   siparisin seviyesi - ayni seviyeden iki siparis birden gelmesin diye
   (ikisi birden ayni darbogaza baglanirdi). */
export function siparisUret(oyuncu, kacinilacak = 0) {
  const { alt, ust } = seviyeAraligi(oyuncu?.sayaclar?.maxEggLv);

  let lv = rast(alt, ust);
  if (lv === kacinilacak && ust > alt) {
    /* Tek adim kaydir; aralik bir tek seviyeden ibaretse carek yok,
       ayni seviye tekrar gelir ve bu sorun degil. */
    lv = lv === ust ? lv - 1 : lv + 1;
  }

  const adet = adetSec(lv);
  const taban = yumurtaDegeri(lv) * adet;

  const odul = { food: yuvarla(taban * PRIM) };
  sayacTohum += 1;
  if (sayacTohum % YILDIZ_PERIYODU === 0) {
    /* Yildiz sayisi seviyeye gore, ama tavanli: tek bir siparisten
       dort yildiz cikmasi kilitli hucre ekonomisini bozar. */
    odul.stars = Math.max(1, Math.min(3, Math.ceil(lv / 2)));
  }

  return {
    id: `s${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    istek: [{ t: 'egg', lv, adet }],
    odul,
  };
}

/* Kayittan gelen siparis listesini her zaman ACIK_SIPARIS uzunluguna
   tamamlar. Bozuk/eksik kayit da buradan duzeliyor - oyuncu hicbir
   zaman bos bir tuccar ekrani gormuyor.

   `degisti` bayragi onemli: cagiran taraf bunu gorunce KAYDEDIYOR.
   Olmasaydi siparisler her acilista yeniden uretilirdi - oyuncu
   "3x Lv.4 yumurta" gorup uygulamayi kapatir, geri donunce bambaska
   bir siparis bulurdu. */
export function siparisleriTamamla(oyuncu) {
  const onceki = Array.isArray(oyuncu.siparisler) ? oyuncu.siparisler : null;
  const liste = onceki ? onceki.filter(gecerliMi) : [];
  let degisti = !onceki || liste.length !== onceki.length;

  while (liste.length < ACIK_SIPARIS) {
    const digerSeviye = liste[0]?.istek?.[0]?.lv || 0;
    liste.push(siparisUret(oyuncu, digerSeviye));
    degisti = true;
  }
  if (liste.length > ACIK_SIPARIS) { liste.length = ACIK_SIPARIS; degisti = true; }
  oyuncu.siparisler = liste;
  return { liste, degisti };
}

function gecerliMi(s) {
  return s && typeof s === 'object'
    && Array.isArray(s.istek) && s.istek.length > 0
    && s.istek.every((i) => i && typeof i.lv === 'number' && typeof i.adet === 'number' && i.adet > 0)
    && s.odul && typeof s.odul === 'object';
}

/* ---------- STOK ---------- */

/* Izgara VE sira birlikte sayiliyor. Sira, izgara doluyken kazanilan
   odullerin bekledigi yer; oradaki yumurta da oyuncunun mali. */
export function stokSay(oyuncu, t, lv) {
  let n = 0;
  for (const c of oyuncu.grid?.cells || []) {
    if (c && !c.kilit && c.t === t && c.lv === lv) n += 1;
  }
  for (const c of oyuncu.sira || []) {
    if (c && c.t === t && c.lv === lv) n += 1;
  }
  return n;
}

export function siparisDurumu(oyuncu, siparis) {
  const satirlar = siparis.istek.map((i) => {
    const var_ = stokSay(oyuncu, i.t, i.lv);
    return { ...i, var: var_, tamam: var_ >= i.adet };
  });
  return { satirlar, hazir: satirlar.every((s) => s.tamam) };
}

/* Siparisi karsilayan nesneleri izgaradan ve siradan DUSURUR.

   Once siradan aliyor, sonra izgaradan. Sebebi: izgaradaki nesne
   birlestirilebilir durumda, siradaki ise bekliyor ve oyuncunun eli
   degmiyor - once atil olani harcamak oyuncuyu daha az yaralar.

   Yetersiz stokta HICBIR SEYE dokunmadan false donuyor; yarim bir
   teslimat (bir kismi alinmis, odul verilmemis) mumkun degil. */
export function siparisiAl(oyuncu, siparis) {
  const durum = siparisDurumu(oyuncu, siparis);
  if (!durum.hazir) return false;

  for (const istek of siparis.istek) {
    let kalan = istek.adet;

    for (let i = oyuncu.sira.length - 1; i >= 0 && kalan > 0; i--) {
      const c = oyuncu.sira[i];
      if (c && c.t === istek.t && c.lv === istek.lv) { oyuncu.sira.splice(i, 1); kalan -= 1; }
    }
    for (let i = 0; i < oyuncu.grid.cells.length && kalan > 0; i++) {
      const c = oyuncu.grid.cells[i];
      if (c && !c.kilit && c.t === istek.t && c.lv === istek.lv) { oyuncu.grid.cells[i] = null; kalan -= 1; }
    }
  }
  return true;
}

/* Teslim edilen siparisin yerine yenisi geliyor - tuccarin onunde her
   zaman iki is duruyor, oyuncu hicbir zaman bosa bakmiyor. */
export function siparisiDegistir(oyuncu, id) {
  const yer = (oyuncu.siparisler || []).findIndex((s) => s.id === id);
  if (yer < 0) return;
  const diger = oyuncu.siparisler[1 - yer];
  oyuncu.siparisler[yer] = siparisUret(oyuncu, diger?.istek?.[0]?.lv || 0);
}
