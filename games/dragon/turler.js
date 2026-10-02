/* EJDERHA TURLERI

   On alti tur, dort kademe, her kademede dort renk.

   Tur ARTIK YUVA SIRASINA BAGLI DEGIL. Onceki surumde 4. yuva hep altin
   ejderhayi veriyordu; bu, ejderhayi bir satin alma haline getiriyordu.
   Artik tur ejderha KAZANILDIGI an zar atilarak belirleniyor - yuva
   sadece ejderhayi koyacak yer.

   Yuvalar sinirsiz ama bedava degil: her yeni yuva bir oncekinden pahali
   (bkz. ekonomi.js yuvaFiyati). Yani yildiz gideri duruyor, tura olan
   bagi kopuyor. */

export const TURLER = [
  /* common - duz pullu govde, temel renkler */
  { id: 'ember',     nadir: 'common',    adKey: 'turEmber' },
  { id: 'ocean',     nadir: 'common',    adKey: 'turOcean' },
  { id: 'verdant',   nadir: 'common',    adKey: 'turVerdant' },
  { id: 'solar',     nadir: 'common',    adKey: 'turSolar' },

  /* rare - alinda mucevher, metalik parlaklik, coklu boynuz */
  { id: 'aqua',      nadir: 'rare',      adKey: 'turAqua' },
  { id: 'amber',     nadir: 'rare',      adKey: 'turAmber' },
  { id: 'violet',    nadir: 'rare',      adKey: 'turViolet' },
  { id: 'pearl',     nadir: 'rare',      adKey: 'turPearl' },

  /* epic - zirh plakalari, dikenli tasma, parlayan goz */
  { id: 'magma',     nadir: 'epic',      adKey: 'turMagma' },
  { id: 'rose',      nadir: 'epic',      adKey: 'turRose' },
  { id: 'azure',     nadir: 'epic',      adKey: 'turAzure' },
  { id: 'verdigris', nadir: 'epic',      adKey: 'turVerdigris' },

  /* legendary - boynuz taci, hale, enerji kanadi, ucusan kristal */
  { id: 'cosmic',    nadir: 'legendary', adKey: 'turCosmic' },
  { id: 'radiant',   nadir: 'legendary', adKey: 'turRadiant' },
  { id: 'glacial',   nadir: 'legendary', adKey: 'turGlacial' },
  { id: 'amethyst',  nadir: 'legendary', adKey: 'turAmethyst' },
];

/* Kademe cekilis agirliklari. Toplam 100 olmak zorunda degil, oran
   yetiyor. Efsanevi bir ejderha yuzde uc: oyuncunun yillarca
   kovalayacagi sey bu olmali. */
export const KADEME_AGIRLIK = {
  common: 62,
  rare: 26,
  epic: 9,
  legendary: 3,
};

export const KADEME_SIRASI = ['common', 'rare', 'epic', 'legendary'];

/* Sahne 448, yuva serit 160. Iki boy tutuluyor: serit birkac karti
   birden ciziyor, sahne olcusunde cizseydi bosuna megabaytlar inerdi. */
export function turYolu(id, boy = 448) {
  return `assets/dragons/${turBul(id).id}-${boy}.webp`;
}

export function turBul(id) {
  return TURLER.find((t) => t.id === id) || TURLER[0];
}

export function kademeTurleri(nadir) {
  return TURLER.filter((t) => t.nadir === nadir);
}

/* Kazanilan ejderhanin turu: once kademe, sonra o kademenin dort
   renginden biri. `enAz` verilirse o kademenin altina dusulmuyor -
   ciftlesmede ebeveynin kademesini taban yapmak icin. */
export function turCek(enAz = null) {
  const taban = enAz ? KADEME_SIRASI.indexOf(enAz) : 0;
  const adaylar = KADEME_SIRASI.slice(Math.max(0, taban));

  const toplam = adaylar.reduce((t, k) => t + KADEME_AGIRLIK[k], 0);
  let r = Math.random() * toplam;
  let kademe = adaylar[adaylar.length - 1];
  for (const k of adaylar) {
    r -= KADEME_AGIRLIK[k];
    if (r < 0) { kademe = k; break; }
  }

  const liste = kademeTurleri(kademe);
  return liste[Math.floor(Math.random() * liste.length)];
}
