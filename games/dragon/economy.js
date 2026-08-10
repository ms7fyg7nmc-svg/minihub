/* Dragon Island - EKONOMI KATMANI

   Oyunun para birimiyle ilgili TEK KAPISI. Arayuz veya oyun kodu hicbir yerde
   dogrudan puan okumaz/yazmaz; hepsi buradan gecer.

   NEDEN BOYLE?

   Bugun bakiye kullanicinin cihazinda duruyor (js/store.js). Yani teknik
   olarak degistirilebilir - bunu biliyoruz ve Faz 1 icin kabul ettik.
   Sunucuya gecildiginde harcamanin sunucuda dogrulanmasi gerekecek:

     istek -> Telegram initData imzasi dogrulanir -> bakiye sunucuda okunur
           -> atomik olarak dusulur -> yeni bakiye geri doner

   O gun geldiginde SADECE bu dosyadaki uygula() fonksiyonunun ici degisecek;
   oyunun geri kalani (feed, play, dukkan) hic dokunulmadan calismaya devam
   edecek. Dosyanin varlik sebebi bu.

   KAYNAKLAR

   Simdilik tek kaynak var: hub jetonu. Ama ileride yem, elmas, yapi malzemesi
   gibi kaynaklar eklenebilsin diye tek bir string'e ('coins') gomulmedi;
   harcama ve kazanc her zaman bir kaynak anahtariyla cagriliyor. */

import { getPoints, addPoints, spendPoints } from '../../js/store.js?v17';

/* Tanimli kaynaklar. Yeni bir kaynak eklemek icin buraya satir yazilir;
   okuma/yazma islerini kendi oku/dus fonksiyonlari yapar. */
export const KAYNAKLAR = {
  points: {
    ad: 'points',
    oku: () => getPoints(),
    ekle: (n) => addPoints(n),
    dus: (n) => spendPoints(n),
  },
};

/* Oyunun ana kaynagi. Ileride yem/elmas gelirse burasi cogalir. */
export const ANA_KAYNAK = 'points';

/* --- Cift harcama korumasi ---

   Ayni istek iki kez gonderilirse (parmak titremesi, cift dokunus, yavas ag)
   ikinci istek para goturmemeli. Ucusta olan islemler burada tutuluyor;
   ayni etiketle ikinci bir istek gelirse BIRINCISININ sonucu dondurulur,
   yeni bir harcama baslatilmaz.

   Sunucuya gecildiginde ayni rol "idempotency key" ile sunucuda tekrarlanacak;
   bu istemci tarafi koruma yine de faydali kalir (bosuna istek gitmez). */
const ucusta = new Map();

export function bakiyeOku(kaynak = ANA_KAYNAK) {
  return KAYNAKLAR[kaynak].oku();
}

/* Harcama yapar.

   etiket : bu islemi tanimlayan metin, ornegin 'feed:42' veya 'buy:color:ice'
            Ayni etiketle ust uste gelen istekler tek islem sayilir.
   miktar : dusulecek tutar
   -> { ok, bakiye }   ok:false ise hicbir sey degismemistir */
export function harca(etiket, miktar, kaynak = ANA_KAYNAK) {
  if (ucusta.has(etiket)) return ucusta.get(etiket);

  const n = Math.max(0, Math.round(Number(miktar) || 0));

  const islem = KAYNAKLAR[kaynak].dus(n)
    .then((r) => ({ ok: r.ok, bakiye: r.total }))
    .finally(() => ucusta.delete(etiket));

  ucusta.set(etiket, islem);
  return islem;
}

/* Kazanc. Dragon Island jeton URETMEZ - bu fonksiyon ileride gunluk odul
   gibi seyler icin duruyor, oyun donguSU icinde cagrilmiyor. */
export function kazan(miktar, kaynak = ANA_KAYNAK) {
  return KAYNAKLAR[kaynak].ekle(miktar).then((toplam) => ({ ok: true, bakiye: toplam }));
}
