/* BASARIMLAR — oyuncunun zaten yaptigi seylerin karsiligi.
 *
 * NEDEN BU OZELLIK: sayaclar (birlestirme, besleme, kirma, kap, hucre,
 * yumurta/kap seviyesi) oyunda ZATEN tutuluyordu ama hicbir yerde
 * gosterilmiyordu. Yani ilerleme vardi, gorunurlugu yoktu. Bu dosya yeni
 * bir sey OLCMUYOR; var olani okunur hale getiriyor. Ozelligi acan oyuncu
 * o ana kadar biriktirdigi rozetleri aninda kazanmis oluyor.
 *
 * NEDEN ODUL YOK: sayaclar oyuncunun kendi cihazinda tutuluyor ve sunucuya
 * oyle gidiyor. Rozet karsiliginda yem/yildiz verseydik, sayaci sisiren
 * biri bedava para basardi. Rozetler bu yuzden yalnizca birer nisan.
 * Odul eklenecekse once sayaclarin sunucuda dogrulanmasi gerekir.
 *
 * KAPATMA: BASARIM_ACIK = false -> kart hic cizilmez, hicbir sey hesaplanmaz.
 * Oyunun geri kalanina dokunmuyor.
 *
 * DIL: her rozet icin ayri metin yazmak dort dilde 130+ satir ederdi.
 * Onun yerine GRUP adi cevriliyor, rozetin adi "grup + hedef" olarak
 * kuruluyor: "Birlestirici 100". Dokuz grup = dort dilde 36 satir.
 */

export const BASARIM_ACIK = true;

/* Her grup bir sayaca bakar ve artan hedeflerden olusur.
   olc: oyuncu kaydindan o sayacin degerini cikaran fonksiyon.
   Hedefler KUCUKTEN BUYUGE sirali olmali. */
export const GRUPLAR = [
  { id: 'merge',   adKey: 'bsrMerge',   hedefler: [10, 100, 500, 2000],
    olc: (o) => o?.sayaclar?.merges | 0 },
  { id: 'feed',    adKey: 'bsrFeed',    hedefler: [10, 100, 500, 2000],
    olc: (o) => o?.sayaclar?.feeds | 0 },
  { id: 'collect', adKey: 'bsrCollect', hedefler: [10, 100, 500, 2000],
    olc: (o) => o?.sayaclar?.collects | 0 },
  { id: 'chest',   adKey: 'bsrChest',   hedefler: [5, 50, 250],
    olc: (o) => o?.sayaclar?.chests | 0 },
  { id: 'unlock',  adKey: 'bsrUnlock',  hedefler: [1, 4, 7],
    olc: (o) => o?.sayaclar?.unlocks | 0 },
  { id: 'egglv',   adKey: 'bsrEggLv',   hedefler: [3, 5, 8, 10], seviye: true,
    olc: (o) => o?.sayaclar?.maxEggLv | 0 },
  { id: 'packlv',  adKey: 'bsrPackLv',  hedefler: [2, 3, 4], seviye: true,
    olc: (o) => o?.sayaclar?.maxPackLv | 0 },
  { id: 'surue',   adKey: 'bsrDragons', hedefler: [2, 5, 10, 20],
    olc: (o) => (Array.isArray(o?.dragons) ? o.dragons.length : 0) },
  /* Kac FARKLI tur toplandi. 25 Ekim 2026'da cekilis havuzu 16'dan 11'e
     indigi icin en ust hedef 11. Havuz degisirse burayi da guncelle. */
  { id: 'turler',  adKey: 'bsrTypes',   hedefler: [3, 6, 9, 11],
    olc: (o) => new Set((o?.dragons || []).map((d) => d?.look?.tur).filter(Boolean)).size },
];

/* Tek duz liste: her hedef bir rozet. id = grup + hedef. */
export const BASARIMLAR = GRUPLAR.flatMap((g) =>
  g.hedefler.map((hedef) => ({ id: `${g.id}${hedef}`, grup: g.id, adKey: g.adKey, hedef, seviye: !!g.seviye })),
);

export const TOPLAM = BASARIMLAR.length;

/* Oyuncunun durumu. Saf fonksiyon: hicbir sey yazmiyor, hicbir yan etkisi
   yok, ayni girdi her zaman ayni ciktiyi veriyor. */
export function durum(oyuncu) {
  if (!BASARIM_ACIK) return { kapali: true, kazanilan: [], toplam: 0, gruplar: [] };

  const gruplar = GRUPLAR.map((g) => {
    const deger = Math.max(0, g.olc(oyuncu) || 0);
    const rozetler = g.hedefler.map((hedef) => ({
      id: `${g.id}${hedef}`, hedef, kazanildi: deger >= hedef,
    }));
    /* Siradaki hedef: henuz ulasilmamis EN KUCUK hedef. Hepsi bittiyse null. */
    const sonraki = g.hedefler.find((h) => deger < h) ?? null;
    return {
      id: g.id, adKey: g.adKey, seviye: !!g.seviye,
      deger, sonraki, rozetler,
      kazanilan: rozetler.filter((r) => r.kazanildi).length,
      toplam: g.hedefler.length,
      /* Siradaki rozete ne kadar kaldi (0-1). Hepsi bittiyse 1. */
      ilerleme: sonraki ? Math.min(1, deger / sonraki) : 1,
    };
  });

  const kazanilan = gruplar.flatMap((g) => g.rozetler.filter((r) => r.kazanildi).map((r) => r.id));
  return { kapali: false, kazanilan, toplam: TOPLAM, gruplar };
}

/* YENI KAZANILANLAR: onceki kayitla simdikini karsilastirir.
   Oyuncuya "su rozeti kazandin" demek icin; hangi rozetlerin daha once
   gosterildigi `gosterilen` dizisinde tutuluyor. */
export function yeniler(oyuncu, gosterilen = []) {
  if (!BASARIM_ACIK) return [];
  const simdi = durum(oyuncu).kazanilan;
  const eski = new Set(gosterilen);
  return simdi.filter((id) => !eski.has(id));
}
