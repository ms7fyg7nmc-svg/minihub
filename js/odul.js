/* ODUL ANI

   Gunluk gorevlerin sandigi aciliyordu ama EKRANDA HICBIR SEY OLMUYORDU:
   oyuncu "Sandigi ac"a basiyor, dugme "alindi"ya donuyor, bakiye sessizce
   artiyor. Uc gorevi bitirmenin karsiligi, fark etmesi icin bakiyeye
   bakmak gereken bir sayiydi.

   Burasi o ani geri veriyor: perde, acilan sandik, ve kazanilan miktar.

   KAPANIS konusunda bu dosya projenin donma dersini uyguluyor (bkz.
   js/onay.js). Perde KENDI KENDINI kapatiyor - zamanlayici VE dokunus,
   ikisi de ayni kapiyi kullaniyor. Hicbir yol kapanisi baska bir kodun
   bitmesine, bir agin cevap vermesine ya da bir animasyonun sonuna
   baglamiyor. Soz her durumda sonuclaniyor.

   Gorsel ONCEDEN yukleniyor. Yuklenmezse de perde aciliyor; sandigin
   yerinde bosluk kalir ama rakam goruntulenir ve kapanis yine calisir.
   Odul ani, bir dosyanin inmesine bagli olamaz. */

import { haptic } from './tg.js?v242';

const GORSEL = new URL('../assets/icons/sandik-acik.webp', document.baseURI).href;

/* Ekranda kalma suresi. Kisa tutuldu: bu bir kutlama, bir engel degil.
   Oyuncu beklemek zorunda kalmasin diye dokununca hemen kapaniyor. */
const SURE = 2200;

const STIL = `
.odul-perde {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  background: radial-gradient(circle at 50% 44%,
    rgba(84, 58, 24, 0.55) 0%,
    rgba(10, 9, 14, 0.82) 62%,
    rgba(8, 7, 11, 0.9) 100%);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  animation: odul-gir 0.18s ease-out;
  cursor: pointer;
}
.odul-perde[hidden] { display: none; }

/* Sandigin arkasindaki isik. Gorsel inmezse de bu kaliyor, yani perde
   hicbir zaman bombos acilmiyor. */
.odul-isik {
  position: relative;
  width: 210px;
  max-width: 62vw;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}
.odul-isik::before {
  content: '';
  position: absolute;
  inset: -18%;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 214, 120, 0.38) 0%,
    rgba(245, 185, 66, 0.16) 44%,
    rgba(245, 185, 66, 0) 72%);
  animation: odul-isik 2.2s ease-out both;
}

.odul-sandik {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 12px 26px rgba(0, 0, 0, 0.55));
  animation: odul-sandik 0.52s cubic-bezier(0.2, 1.5, 0.4, 1) both;
}

.odul-baslik {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  /* Telegram'in gunduz temasinda da ayni perdenin uzerinde duruyor,
     o yuzden renkler SABIT (bkz. js/onay.js). */
  color: #d8c69c;
  animation: odul-yazi 0.4s 0.1s ease-out both;
}

.odul-tutar {
  margin: 0;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
  color: #ffd98a;
  text-shadow: 0 2px 0 rgba(120, 76, 0, 0.5), 0 10px 26px rgba(245, 185, 66, 0.4);
  animation: odul-yazi 0.42s 0.18s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

.odul-kapat {
  margin: 4px 0 0;
  font-size: 11.5px;
  color: #8e8878;
  animation: odul-yazi 0.4s 0.5s ease-out both;
}

@keyframes odul-gir { from { opacity: 0; } }
@keyframes odul-sandik {
  from { opacity: 0; transform: scale(0.5) translateY(18px); }
}
@keyframes odul-yazi {
  from { opacity: 0; transform: translateY(8px); }
}
@keyframes odul-isik {
  0%   { opacity: 0; transform: scale(0.6); }
  28%  { opacity: 1; transform: scale(1.04); }
  100% { opacity: 0.72; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .odul-perde, .odul-sandik, .odul-tutar, .odul-baslik,
  .odul-kapat, .odul-isik::before { animation: none; }
}
`;

let perde = null;
let kapatAktif = null;

/* Gorseli erkenden iste. Cagrilmasi zararsiz; tarayici zaten tekrar
   indirmez. */
export function odulOnYukle() {
  const im = new Image();
  im.src = GORSEL;
}

function kur() {
  if (perde) return;

  const stil = document.createElement('style');
  stil.textContent = STIL;
  document.head.appendChild(stil);

  perde = document.createElement('div');
  perde.className = 'odul-perde';
  perde.hidden = true;
  perde.setAttribute('role', 'dialog');
  perde.setAttribute('aria-modal', 'true');
  perde.innerHTML = `
    <div class="odul-isik">
      <img class="odul-sandik" src="${GORSEL}" alt="" width="210" height="210">
    </div>
    <p class="odul-baslik"></p>
    <p class="odul-tutar"></p>
    <p class="odul-kapat"></p>`;
  document.body.appendChild(perde);

  /* Perdenin HER YERI kapatiyor - kucuk bir capraz aramak gerekmiyor. */
  perde.addEventListener('pointerdown', () => kapatAktif?.());
  document.addEventListener('keydown', (e) => {
    if (perde.hidden) return;
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') kapatAktif?.();
  });
}

/**
 * Odul anini gosterir ve kapandiginda cozulur.
 *
 * @param {object} metin
 * @param {string} metin.baslik  "Sandik acildi"
 * @param {string} metin.tutar   "+2.000 $MH"
 * @param {string} [metin.kapat] "Kapatmak icin dokun"
 * @returns {Promise<void>}
 */
export function odulGoster(metin) {
  kur();

  /* Ust uste iki acilis olmasin: oncekini kapatip yerine geciyoruz. */
  kapatAktif?.();

  return new Promise((coz) => {
    perde.querySelector('.odul-baslik').textContent = metin.baslik || '';
    perde.querySelector('.odul-tutar').textContent = metin.tutar || '';
    const kapatEl = perde.querySelector('.odul-kapat');
    kapatEl.textContent = metin.kapat || '';
    kapatEl.hidden = !metin.kapat;

    let bitti = false;
    let zaman = 0;

    const kapat = () => {
      if (bitti) return;
      bitti = true;
      clearTimeout(zaman);
      kapatAktif = null;
      perde.hidden = true;
      coz();                 /* once cevap ver, sonra ne olursa olsun */
    };

    kapatAktif = kapat;
    /* Kendi kendini kapatan zamanlayici: oyuncu hicbir sey yapmasa da
       perde gidiyor. Donma ihtimalini kapatan sey bu. */
    zaman = setTimeout(kapat, SURE);

    perde.hidden = false;
    haptic.success();
  });
}
