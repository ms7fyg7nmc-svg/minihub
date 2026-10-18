/* GOREV TABLOLARI

   GOREV HARITASI - uc kademe, her kademede yedi gorev. Kademe icinde
   gorevler sirali: birincisi alinmadan ikincisi acilmiyor. Kademeler
   arasi da kilit var: Acemi'nin yedisi bitmeden Orta acilmiyor.
   Boylece oyuncunun onunde her an tek bir hedef duruyor.

   (Partner gorevleri 2026-10-18'de hub'a tasindi.)

   Sayilar burada tek yerde; dengeyi degistirmek icin baska hicbir
   dosyaya dokunmak gerekmiyor. */

/* ---------- GOREV HARITASI ----------

   Yem odulleri 2026-10-08'de yeni yumurta olcegine tasindi (bkz.
   ekonomi.js YUMURTA). Her odul, eski olcekte denk geldigi yumurta
   kademesinin yeni karsiligina cevrildi; yani odullerin BIRBIRINE ve
   yumurtalara gore agirligi degismedi, yalnizca sayilar kuculdu. */

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
    { id: 'a1', tip: 'merge',   hedef: 5,   odul: { food: 85 } },
    { id: 'a2', tip: 'feed',    hedef: 10,  odul: { item: { t: 'egg', lv: 2 } } },
    { id: 'a3', tip: 'collect', hedef: 15,  odul: { food: 190, items: [{ t: 'food', lv: 1 }] } },
    { id: 'a4', tip: 'egglv',   hedef: 3,   odul: { item: { t: 'food', lv: 1 } } },
    { id: 'a5', tip: 'merge',   hedef: 30,  odul: { items: [{ t: 'food', lv: 1 }, { t: 'food', lv: 1 }] } },
    { id: 'a6', tip: 'chest',   hedef: 1,   odul: { item: { t: 'egg', lv: 3 } } },
    { id: 'a7', tip: 'draglv',  hedef: 2,   odul: { stars: 3, food: 560 } },
  ],

  /* Sayilar bes-alti katina cikiyor, oduller de. Burada oyuncu artik
     kilitli hucre ve kap birlestirme gibi ileri mekaniklere giriyor. */
  orta: [
    { id: 'o1', tip: 'merge',   hedef: 80,  odul: { food: 800, items: [{ t: 'food', lv: 1 }, { t: 'food', lv: 1 }] } },
    { id: 'o2', tip: 'feed',    hedef: 50,  odul: { stars: 10 } },
    { id: 'o3', tip: 'collect', hedef: 90,  odul: { item: { t: 'food', lv: 1 } } },
    { id: 'o4', tip: 'egglv',   hedef: 5,   odul: { item: { t: 'egg', lv: 4 } } },
    { id: 'o5', tip: 'unlock',  hedef: 1,   odul: { food: 1400, items: [{ t: 'food', lv: 2 }] } },
    { id: 'o6', tip: 'packlv',  hedef: 2,   odul: { item: { t: 'food', lv: 2 } } },
    { id: 'o7', tip: 'draglv',  hedef: 3,   odul: { stars: 12, food: 3100 } },
  ],

  /* Uzun soluklu. Odullerin buyuklugu kademenin suresiyle orantili;
     bir Pro gorevi bitirmek gunler suruyor. */
  pro: [
    { id: 'p1', tip: 'merge',   hedef: 250, odul: { item: { t: 'food', lv: 2 } } },
    { id: 'p2', tip: 'feed',    hedef: 200, odul: { stars: 50 } },
    { id: 'p3', tip: 'collect', hedef: 300, odul: { item: { t: 'egg', lv: 6 } } },
    { id: 'p4', tip: 'egglv',   hedef: 7,   odul: { item: { t: 'food', lv: 3 } } },
    { id: 'p5', tip: 'unlock',  hedef: 4,   odul: { stars: 50 } },
    { id: 'p6', tip: 'packlv',  hedef: 3,   odul: { item: { t: 'egg', lv: 7 } } },
    { id: 'p7', tip: 'egglv',   hedef: 8,   odul: { stars: 400, food: 9900 } },
  ],
};

export const KADEME_GOREV_SAYISI = 7;

/* PARTNER GOREVLERI BURADAN KALDIRILDI (2026-10-18).

   Sekiz hub oyununun skor hedefleri ve odulleri artik sunucuda
   (bot/worker.js -> PARTNER_OYUNLAR, PARTNER_ODUL) ve $MH odiyor.
   Burada dururken yem/yumurta/yildiz veriyordu, yani hub oyunlarini
   oynamanin karsiligi yalnizca Ejderha Adasi'nin icinde anlamliydi. */

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
