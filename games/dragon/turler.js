/* EJDERHA TURLERI

   Alti tur, alti yuva - ve aralarinda sabit bir eslesme var: kacinci
   yuvaysan o turu aliyorsun. Rastgele dagitmak daha "surpriz" olurdu
   ama yuva seridini okunmaz hale getirirdi; boyleyken kilitli yuva
   "bir ejderha daha" degil, GORUNEN belirli bir ejderha vaat ediyor.
   Oyuncu seridin sonundaki benekli ejderhayi gorup ona dogru oynuyor.

   Nadirlik sirasi yuva fiyatiyla ayni yonde artiyor
   (bkz. ekonomi.js YUVA_FIYATLARI). */

export const TURLER = [
  { id: 'ember',   nadir: 'common',    adKey: 'turEmber' },
  { id: 'ocean',   nadir: 'common',    adKey: 'turOcean' },
  { id: 'verdant', nadir: 'common',    adKey: 'turVerdant' },
  { id: 'solar',   nadir: 'rare',      adKey: 'turSolar' },
  { id: 'onyx',    nadir: 'epic',      adKey: 'turOnyx' },
  { id: 'nebula',  nadir: 'legendary', adKey: 'turNebula' },
];

/* Sahne 448, yuva serit 160. Iki boy tutuyoruz: serit alti karti birden
   ciziyor, sahne olcusunde cizseydi bosuna 300 KB indirilirdi. */
export const TUR_BOYLARI = [448, 160];

export function turYolu(id, boy = 448) {
  return `assets/dragons/${id}-${boy}.webp`;
}

export function turSira(sira) {
  return TURLER[Math.max(0, Math.min(TURLER.length - 1, sira))];
}

export function turBul(id) {
  return TURLER.find((t) => t.id === id) || TURLER[0];
}
