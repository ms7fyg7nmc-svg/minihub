/* GOREV TABLOLARI

   Iki ayri sistem var:

   1. GOREV HARITASI - uc kademe, her kademede yedi gorev. Kademe
      icinde gorevler sirali: birincisi alinmadan ikincisi acilmiyor.
      Kademeler arasi da kilit var: Acemi'nin yedisi bitmeden Orta
      acilmiyor. Boylece oyuncunun onunde her an tek bir hedef duruyor.

   2. PARTNER GOREVLERI - hub'daki diger sekiz oyunun her birine dort
      kademeli skor hedefi. Hepsinin 4. kademesini bitiren buyuk odulu
      aliyor.

   Sayilar burada tek yerde; dengeyi degistirmek icin baska hicbir
   dosyaya dokunmak gerekmiyor. */

/* ---------- GOREV HARITASI ---------- */

export const KADEMELER = ['acemi', 'orta', 'pro'];

/* tip: hangi sayaca bakiliyor
     merge    birlestirme sayisi
     feed     besleme sayisi
     collect  kirilan yumurta sayisi
     egglv    ulasilan en yuksek yumurta seviyesi
     draglv   ejderha seviyesi
     chest    acilan kap sayisi
     packlv   ulasilan en yuksek kap seviyesi
     unlock   acilan kilitli hucre sayisi            */

export const GOREV_HARITASI = {
  /* Dongunun temelini ogretiyor: birlestir, besle, kir. Oduller kucuk
     ama surekli - oyuncu her adimda elle tutulur bir sey aliyor. */
  acemi: [
    { id: 'a1', tip: 'merge',   hedef: 5,   odul: { food: 200 } },
    { id: 'a2', tip: 'feed',    hedef: 10,  odul: { item: { t: 'egg', lv: 2 } } },
    { id: 'a3', tip: 'collect', hedef: 15,  odul: { food: 600 } },
    { id: 'a4', tip: 'egglv',   hedef: 3,   odul: { item: { t: 'food', lv: 1 } } },
    { id: 'a5', tip: 'merge',   hedef: 30,  odul: { food: 1500 } },
    { id: 'a6', tip: 'chest',   hedef: 1,   odul: { item: { t: 'egg', lv: 3 } } },
    { id: 'a7', tip: 'draglv',  hedef: 2,   odul: { stars: 3, food: 2500 } },
  ],

  /* Sayilar bes-alti katina cikiyor, oduller de. Burada oyuncu artik
     kilitli hucre ve kap birlestirme gibi ileri mekaniklere giriyor. */
  orta: [
    { id: 'o1', tip: 'merge',   hedef: 80,  odul: { food: 6000 } },
    { id: 'o2', tip: 'feed',    hedef: 50,  odul: { item: { t: 'star', lv: 1 } } },
    { id: 'o3', tip: 'collect', hedef: 90,  odul: { item: { t: 'food', lv: 1 } } },
    { id: 'o4', tip: 'egglv',   hedef: 5,   odul: { item: { t: 'egg', lv: 4 } } },
    { id: 'o5', tip: 'unlock',  hedef: 1,   odul: { food: 15000 } },
    { id: 'o6', tip: 'packlv',  hedef: 2,   odul: { item: { t: 'food', lv: 2 } } },
    { id: 'o7', tip: 'draglv',  hedef: 3,   odul: { stars: 12, food: 25000 } },
  ],

  /* Uzun soluklu. Odullerin buyuklugu kademenin suresiyle orantili;
     bir Pro gorevi bitirmek gunler suruyor. */
  pro: [
    { id: 'p1', tip: 'merge',   hedef: 250, odul: { item: { t: 'food', lv: 2 } } },
    { id: 'p2', tip: 'feed',    hedef: 200, odul: { item: { t: 'star', lv: 2 } } },
    { id: 'p3', tip: 'collect', hedef: 300, odul: { item: { t: 'egg', lv: 6 } } },
    { id: 'p4', tip: 'egglv',   hedef: 7,   odul: { item: { t: 'food', lv: 3 } } },
    { id: 'p5', tip: 'unlock',  hedef: 4,   odul: { item: { t: 'star', lv: 2 } } },
    { id: 'p6', tip: 'packlv',  hedef: 3,   odul: { item: { t: 'egg', lv: 7 } } },
    { id: 'p7', tip: 'egglv',   hedef: 8,   odul: { item: { t: 'star', lv: 3 }, food: 120000 } },
  ],
};

export const KADEME_GOREV_SAYISI = 7;

/* ---------- PARTNER GOREVLERI ----------

   Esikler her oyunun kendi puanlama formulunden hesaplandi, gercek
   oyuncu verisinden degil. Ilk gercek skorlar geldiginde buradaki
   sayilari ayarlamak gerekecek - baska hicbir yeri degistirmeden.

   Hedeflenen zorluk her oyunda ayni:
     lv1  ilk ciddi denemede ulasilir
     lv2  oyunu anlamis birinin iyi bir turu
     lv3  birkac tur ugrasmayi gerektirir
     lv4  oyunu gercekten iyi oynamak gerekir

   DIKKAT: tripletile'da skor 3600'de tavanliyor, esikler onun altinda
   kalmak zorunda. flow skor degil SEVIYE numarasi gonderiyor. */

export const PARTNER_OYUNLAR = [
  { id: '2048',       ad: '2048',         birim: 'skor',   esik: [3000, 8000, 16000, 30000] },
  { id: 'blockblast', ad: 'Block Puzzle', birim: 'skor',   esik: [1500, 4000, 9000, 18000] },
  { id: 'match3',     ad: 'Match Candy',  birim: 'skor',   esik: [800, 2000, 4000, 7000] },
  { id: 'tripletile', ad: 'Triple Tile',  birim: 'skor',   esik: [900, 1800, 2700, 3400] },
  { id: 'flow',       ad: 'Flow',         birim: 'seviye', esik: [10, 25, 50, 90] },
  { id: 'snake',      ad: 'Snake',        birim: 'skor',   esik: [300, 800, 1600, 3000] },
  { id: 'coindrop',   ad: 'Coin Drop',    birim: 'skor',   esik: [1500, 4000, 9000, 18000] },
  { id: 'wheelrush',  ad: 'Wheel Rush',   birim: 'skor',   esik: [800, 2000, 4500, 9000] },
];

/* Her oyunda ayni kademe ayni odulu veriyor - zorluk esit oldugu icin
   odul de esit. Oyunlar arasi fark yaratmak oyuncuyu en kolay oyuna
   yonlendirirdi. */
export const PARTNER_ODULLERI = [
  { food: 2000 },
  { food: 6000 },
  { item: { t: 'food', lv: 3 } },
  { item: { t: 'star', lv: 2 } },
];

/* Sekiz oyunun da 4. kademesini bitirene. Oyunun en buyuk tek odulu. */
export const PARTNER_BUYUK_ODUL = [
  { t: 'star', lv: 4 },
  { t: 'food', lv: 4 },
  { t: 'food', lv: 4 },
  { t: 'egg', lv: 8 },
  { t: 'egg', lv: 8 },
];

/* ---------- YARDIMCILAR ---------- */

export function kademeGorevleri(kademe) {
  return GOREV_HARITASI[kademe] || [];
}

export function tumGorevler() {
  return KADEMELER.flatMap((k) => GOREV_HARITASI[k].map((g) => ({ ...g, kademe: k })));
}

/* Bir kademe, bir oncekinin tamami alindiysa acik. */
export function kademeAcikMi(kademe, bitenler) {
  const sira = KADEMELER.indexOf(kademe);
  if (sira <= 0) return true;
  const onceki = GOREV_HARITASI[KADEMELER[sira - 1]];
  return onceki.every((g) => bitenler.includes(g.id));
}

/* Kademe icinde sirayla: bir onceki alinmadan bu gorev acilmiyor. */
export function gorevAcikMi(kademe, indeks, bitenler) {
  if (!kademeAcikMi(kademe, bitenler)) return false;
  if (indeks === 0) return true;
  return bitenler.includes(GOREV_HARITASI[kademe][indeks - 1].id);
}

/* Oyuncunun su an ustunde oldugu gorev: acik olan ilk alinmamis gorev. */
export function aktifGorev(bitenler) {
  for (const kademe of KADEMELER) {
    if (!kademeAcikMi(kademe, bitenler)) return null;
    const liste = GOREV_HARITASI[kademe];
    for (let i = 0; i < liste.length; i += 1) {
      if (!bitenler.includes(liste[i].id)) return { ...liste[i], kademe, indeks: i };
    }
  }
  return null;
}

export function kademeIlerleme(kademe, bitenler) {
  const liste = GOREV_HARITASI[kademe];
  return { biten: liste.filter((g) => bitenler.includes(g.id)).length, toplam: liste.length };
}

export function partnerKademe(oyunId, enIyiSkor) {
  const oyun = PARTNER_OYUNLAR.find((o) => o.id === oyunId);
  if (!oyun) return 0;
  let kademe = 0;
  for (const e of oyun.esik) if (enIyiSkor >= e) kademe += 1;
  return kademe;            /* 0-4: kac kademe hak edilmis */
}
