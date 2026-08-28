
import { getPoints, addPoints, spendPoints } from '../../js/store.js?v105';

export const KAYNAKLAR = {
  points: {
    ad: 'points',
    oku: () => getPoints(),
    ekle: (n) => addPoints(n),
    dus: (n) => spendPoints(n),
  },
};

export const ANA_KAYNAK = 'points';

const ucusta = new Map();

export function bakiyeOku(kaynak = ANA_KAYNAK) {
  return KAYNAKLAR[kaynak].oku();
}

export function harca(etiket, miktar, kaynak = ANA_KAYNAK) {
  if (ucusta.has(etiket)) return ucusta.get(etiket);

  const n = Math.max(0, Math.round(Number(miktar) || 0));

  const islem = KAYNAKLAR[kaynak].dus(n)
    .then((r) => ({ ok: r.ok, bakiye: r.total }))
    .finally(() => ucusta.delete(etiket));

  ucusta.set(etiket, islem);
  return islem;
}

export function kazan(miktar, kaynak = ANA_KAYNAK) {
  return KAYNAKLAR[kaynak].ekle(miktar).then((toplam) => ({ ok: true, bakiye: toplam }));
}
