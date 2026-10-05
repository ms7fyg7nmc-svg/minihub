/* ONAY PENCERESI
   "Yeni oyun" dugmesi, oyunun ortasinda basildiginda o ana kadarki her
   seyi bitiriyor. Geri alisi yok ve dugme ekranin altinda, bastan sona
   parmaga yakin duruyor - on dakikalik bir kosu tek yanlis dokunusla
   gidebiliyor. Artik once soruluyor.

   Soru SADECE kaybedilecek bir sey varken cikiyor. Oyun zaten bittiyse
   "Yeni oyun" dogrudan calisiyor, yoksa her turda fazladan bir dokunus
   olurdu ve onay bir sure sonra refleksle gecilen bir perdeye donerdi.

   Kapanis konusunda bu dosya projenin donma dersini uyguluyor: paneli
   kapatan sey baska bir kodun bitmesi DEGIL. Perde, iptal, Escape ve
   geri tusu ayni kapiyi kullaniyor; soz her durumda sonuclaniyor ve
   panel DOM'dan cikmadan once cevap veriliyor. Hicbir yol, cevabi
   bir animasyonun bitmesine baglamiyor. */

import { haptic } from './tg.js?v227';

const STIL = `
.onay-perde {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(6, 7, 12, 0.72);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  animation: onay-gir 0.16s ease-out;
}
.onay-perde[hidden] { display: none; }

.onay-kutu {
  width: 100%;
  max-width: 320px;
  box-sizing: border-box;
  padding: 20px;
  border-radius: 18px;
  text-align: center;
  /* Telegram'in acik temasinda da okunabilmesi icin renkler SABIT -
     overlay'de ogrenilen ders (bkz. css/game.css). */
  background: #191c27;
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
}

.onay-kutu h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
}

.onay-kutu p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: #b7bad0;
}

/* Enerji uyarisi ayri bir satir: oyuncunun asil kacirdigi bilgi bu. */
.onay-enerji {
  margin: 12px 0 0;
  padding: 9px 11px;
  border-radius: 11px;
  font-size: 12.5px;
  line-height: 1.45;
  color: #ffd79a;
  background: rgba(244, 170, 54, 0.11);
  border: 1px solid rgba(244, 170, 54, 0.26);
}

.onay-butonlar {
  display: flex;
  gap: 9px;
  margin-top: 18px;
}

.onay-butonlar button {
  flex: 1;
  padding: 12px 10px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.onay-butonlar button:active { transform: scale(0.97); }

/* Guvenli secim onde ve vurgulu: kaza eseri acilan pencerede parmak
   nereye giderse gitsin oyun devam etsin. */
.onay-devam { background: #2f3650; color: #ffffff; }
.onay-bitir { background: rgba(255, 255, 255, 0.07); color: #ff9c8d; }

@keyframes onay-gir { from { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .onay-perde { animation: none; }
  .onay-butonlar button:active { transform: none; }
}
`;

let perde = null;
let kutu = null;
let kapatAktif = null;   /* acik pencereyi kapatan tek fonksiyon */

function kur() {
  if (perde) return;

  const stil = document.createElement('style');
  stil.textContent = STIL;
  document.head.appendChild(stil);

  perde = document.createElement('div');
  perde.className = 'onay-perde';
  perde.hidden = true;
  perde.setAttribute('role', 'dialog');
  perde.setAttribute('aria-modal', 'true');
  perde.innerHTML = `
    <div class="onay-kutu">
      <h3></h3>
      <p></p>
      <p class="onay-enerji" hidden></p>
      <div class="onay-butonlar">
        <button type="button" class="onay-devam"></button>
        <button type="button" class="onay-bitir"></button>
      </div>
    </div>`;
  document.body.appendChild(perde);
  kutu = perde.querySelector('.onay-kutu');

  /* Perdeye dokunmak iptal. Kutunun KENDISINE dokunmak degil. */
  perde.addEventListener('pointerdown', (e) => {
    if (e.target === perde) kapatAktif?.(false);
  });
  document.addEventListener('keydown', (e) => {
    if (perde.hidden) return;
    if (e.key === 'Escape') kapatAktif?.(false);
  });
}

/* Gercek zamanli oyunlar (yilan, wheelrush, coindrop) bunu kendi
   donguleriyle kontrol ediyor. Onay acikken dunya ILERLEMEMELI: aksi
   halde "kaybetmeyesin diye" acilan pencere, oyuncu soruyu okurken
   yilani duvara surer ve kaybin sebebi onayin kendisi olur. */
export const onayAcik = () => !!kapatAktif;

/* Acik bir onay varsa iptal eder. Oyun baska bir sebeple (geri tusu,
   oyunun kendi bitisi) devam ederse pencere ekranda asili kalmasin. */
export function onayiKapat() {
  kapatAktif?.(false);
}

/**
 * @param {object} metin
 * @param {string} metin.baslik
 * @param {string} metin.mesaj
 * @param {string} [metin.enerji]  Varsa sari uyari satirinda gosterilir.
 * @param {string} metin.devam     Guvenli secimin etiketi
 * @param {string} metin.bitir     Yikici secimin etiketi
 * @returns {Promise<boolean>} true = oyuncu devam etmeyi DEGIL, bitirmeyi secti
 */
export function onayla(metin) {
  kur();

  /* Ust uste iki acilis olmasin: oncekini iptal edip yerine geciyoruz. */
  kapatAktif?.(false);

  return new Promise((coz) => {
    const devamBtn = perde.querySelector('.onay-devam');
    const bitirBtn = perde.querySelector('.onay-bitir');
    const enerjiEl = perde.querySelector('.onay-enerji');

    perde.querySelector('h3').textContent = metin.baslik;
    perde.querySelector('.onay-kutu > p').textContent = metin.mesaj;
    enerjiEl.textContent = metin.enerji || '';
    enerjiEl.hidden = !metin.enerji;
    devamBtn.textContent = metin.devam;
    bitirBtn.textContent = metin.bitir;

    let bitti = false;
    const kapat = (cevap) => {
      if (bitti) return;
      bitti = true;
      kapatAktif = null;
      devamBtn.onclick = null;
      bitirBtn.onclick = null;
      perde.hidden = true;
      coz(cevap);              /* once cevap ver, sonra ne olursa olsun */
    };

    kapatAktif = kapat;
    devamBtn.onclick = () => { haptic.tap(); kapat(false); };
    bitirBtn.onclick = () => { haptic.tap('medium'); kapat(true); };

    perde.hidden = false;
    haptic.tap('light');
    /* Odak guvenli dugmede: klavyeyle gelen Enter oyunu bitirmesin. */
    try { devamBtn.focus({ preventScroll: true }); } catch { /* onemsiz */ }
  });
}

/* Oyunlarin tamaminin kullandigi iki hazir soru. Metinler i18n'den
   geliyor; bu dosya ceviri tasimiyor, sadece anahtarlari biliyor. */

export async function yarimBirakmaOnayi(t) {
  return onayla({
    baslik: t('ortak.onay.bitir.baslik'),
    mesaj: t('ortak.onay.bitir.mesaj'),
    enerji: t('ortak.onay.enerji'),
    devam: t('ortak.onay.devam'),
    bitir: t('ortak.onay.bitir.evet'),
  });
}

/* ENERJI BOSKEN OYUNA GIRIS

   Bu bir engel degil, bir bilgilendirme. Eskiden 0 enerjiyle oyuna
   girilemiyordu; artik giriliyor ama kazanc dortte bire dusuyor ve
   oyuncu bunu ONCEDEN ogreniyor.

   Vurgulu dugme OYNAMAK. Oyuncu zaten oynamak icin dokundu; onu enerji
   satin almaya itmek bu degisikligin amacinin tam tersi olurdu.

   @returns {Promise<boolean>} true = oyuncu enerji almayi secti */
export async function enerjiBosOnayi(t) {
  return onayla({
    baslik: t('ortak.enerji.baslik'),
    mesaj: t('ortak.enerji.mesaj'),
    enerji: t('ortak.enerji.not'),
    devam: t('ortak.enerji.oyna'),
    bitir: t('ortak.enerji.al'),
  });
}

export async function yenidenKurmaOnayi(t) {
  return onayla({
    baslik: t('ortak.onay.yeniden.baslik'),
    mesaj: t('ortak.onay.yeniden.mesaj'),
    enerji: t('ortak.onay.yeniden.enerji'),
    devam: t('ortak.onay.devam'),
    bitir: t('ortak.onay.yeniden.evet'),
  });
}
