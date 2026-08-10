/* Dragon Island - EJDERHA CIZIMI

   Ejderha tek bir SVG olarak uretiliyor. Cizim tamamen VERIYE bagli: girdi
   olarak seviye ve gorunum (renk/desen/tac/yuz/kanat/kuyruk) aliyor, baska
   hicbir sey bilmiyor. Ayni fonksiyon hem ada sahnesinde hem dukkan
   onizlemesinde kullaniliyor.

   NEDEN 3/4 PROFIL (ve neden onceki surum "domuz" gibi duruyordu)

   Onceki ejderha tam CEPHEDEN, dikey eksende simetrik ciziliyordu. Boyle
   bir kadrajda burun delikleri izleyiciye dogru bakiyor - bu anatomik
   olarak domuz burnudur; ne kadar detay eklenirse eklensin ejderha
   okunmuyordu. Simdi govde ve kafa 3/4 profilde, SOLA bakiyor: namlu uzuyor,
   cene hatti gorunuyor, boynuzlar geriye supuruluyor.

   UZUVLAR AYRI KUTLELER

   But, on bacak ve patiler govde siluetinin ICINE gomulmuyor; ust uste binen
   ayri sekiller olarak cizilyor. Bacak tanimini veren tek sey bu - hepsi tek
   siluetin icindeyken govde ozelliksiz bir yumurta gibi duruyordu.

   Olcekler: yerel koordinatlarda cizim x -95..85, y -125..50 araliginda
   kaliyor; asagidaki montaj bunu 200x200 kadraja sigdiriyor. */

import { palet, HEADS, FACES } from './data.js';
import { CONFIG, growthRatio } from './config.js';

/* Ayni sayfada birden fazla ejderha olabilir; degrade ve maske id'leri
   catismasin diye sayac. */
let uidSayaci = 0;

/* --- Ton yardimcisi ---
   miktar > 0 beyaza, < 0 siyaha dogru karistirir (-1..1).

   HEM "#rrggbb" HEM "rgb(r,g,b)" kabul ediyor. Onceki hali yalnizca hex
   anliyordu; zaten ton()'dan cikmis bir renk tekrar verilince parseInt NaN
   uretip her seyi SIYAH yapiyordu (patiler bu yuzden siyah bot gibi
   goruyordu). */
function ton(renk, miktar) {
  let r, g, b;
  if (renk[0] === '#') {
    const n = parseInt(renk.slice(1), 16);
    r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
  } else {
    [r, g, b] = renk.match(/\d+/g).map(Number);
  }
  const hedef = miktar > 0 ? 255 : 0;
  const k = Math.abs(miktar);
  const c = (v) => Math.round(v + (hedef - v) * k);
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/* ==========================================================================
   GEOMETRI
   Butun parcalar bu yollara gore yerlesiyor. Yeni bir kozmetik eklerken
   nereye koyacagini tahmin etmek yerine buradaki noktalara bakilir.
   ========================================================================== */

/* Kafa: genis alin, uzun sivri namlu, belirgin cene. x -88..-15, y -108..-54 */
const KAFA_YOL = `M-88 -66
  C-86 -74 -80 -80 -70 -84 C-60 -88 -54 -92 -50 -99
  C-45 -106 -34 -108 -26 -104 C-18 -100 -15 -92 -17 -83
  C-19 -74 -24 -67 -33 -62 C-45 -56 -60 -54 -72 -57
  C-82 -60 -87 -62 -88 -66 Z`;

/* Govde: gogus onde dik, sirt omuzdan kalcaya egimli, kompakt */
const GOVDE_YOL = `M-31 -24
  C-36 -10 -36 10 -31 24 C-26 35 -14 42 2 43
  C20 44 36 38 44 26 C50 16 51 0 45 -12
  C39 -24 25 -32 7 -33 C-11 -34 -27 -31 -31 -24 Z`;

/* Arka but: govdenin uzerine binen ayri kutle */
const BUT_YOL = `M22 -28
  C44 -25 58 -5 55 15 C52 34 38 46 20 45
  C11 44.6 5 41 3 36 C17 33 26 23 28 9
  C30 -6 27 -19 22 -28 Z`;

/* Yakin on bacak: govdenin onunde ayri uzuv */
const BACAK_YOL = `M-30 -16
  C-37 -2 -37 16 -33 30 C-31 36 -25 38 -19 37
  C-16 36 -15 33 -15 29 C-17 16 -17 2 -13 -12 Z`;

/* Boyun: kisa ve kalin - kafa govdeye yakin durmali, yoksa dinozor okunuyor */
const BOYUN_YOL = `M-41 -55
  C-35 -43 -27 -34 -15 -27 L3 -33
  C-11 -39 -21 -49 -25 -64 Z`;

/* Kozmetiklerin tutundugu noktalar (yerel koordinat).
     tac    : kafatasinin tepesi, taclar buraya oturur
     yuz    : gorunen yanak/alin bolgesi
     goz    : goz merkezi
     omuz   : kanadin ciktigi yer
     kuyruk : kuyrugun govdeden ciktigi yer */
export const KAFA = {
  tac: [-33, -101], tacAci: -14,
  yuz: [-48, -80], goz: [-44.5, -80],
  omuz: [2, -30], kuyruk: [40, -8],
};

/* ==========================================================================
   ORTAK CIZIM YARDIMCILARI
   ========================================================================== */

/* Pul dokusu: ust uste binen kucuk yaylar. Her zaman bir kirpma yolunun
   ICINDE cizilyor, boylece siluetin disina tasmiyor. */
function pullar(x0, y0, gen, yuk, sutun, satir, renk, opak) {
  let s = '';
  for (let r = 0; r < satir; r++) {
    for (let c = 0; c < sutun; c++) {
      const x = x0 + c * gen + (r % 2) * gen / 2;
      const y = y0 + r * yuk;
      s += `<path d="M${x} ${y + yuk} Q${x + gen / 2} ${y - yuk * 0.35} ${x + gen} ${y + yuk}"
            fill="none" stroke="${renk}" stroke-width="0.9" opacity="${opak}"/>`;
    }
  }
  return s;
}

/* Boynuz: dipte kalin, uca dogru inceliyor, geriye-yukari supurulmus */
function boynuzYol(bx, by, L, k, H) {
  return `M${bx} ${by - k}
    C${bx + L * 0.4} ${by - k - H * 0.45} ${bx + L * 0.75} ${by - H * 0.92} ${bx + L} ${by - H}
    C${bx + L * 0.68} ${by - H * 0.58} ${bx + L * 0.36} ${by - H * 0.1 + k * 0.4} ${bx} ${by + k} Z`;
}

/* Pati: SADECE ayak. Bacagi BACAK_YOL ciziyor - burada tekrar bacak kutugu
   cizilince ust uste binip siyah bot gibi duruyordu. */
function pati(cx, cy, o, renk, pence) {
  const pad = ton(renk, 0.1), lob = ton(renk, 0.24);
  return `<g transform="translate(${cx} ${cy}) scale(${o})">
    <path d="M-13 -2 C-16 7 -10 14 0 14 C11 14 17 8 14 -2 C7 -6 -8 -6 -13 -2 Z" fill="${pad}"/>
    ${[-9, 0, 8.5].map((tx) => `
      <ellipse cx="${tx}" cy="10" rx="5.4" ry="5.6" fill="${lob}"/>
      <path d="M${tx - 5} 11.4 C${tx - 8.2} 13.4 ${tx - 8.4} 16 ${tx - 5.8} 16.2
               C${tx - 3.4} 15.2 ${tx - 3.2} 12.8 ${tx - 5} 11.4 Z" fill="${pence}"/>`).join('')}
    <path d="M-13 -2 C-15 5 -12 11 -6 13 C-3 8 -5 2 -10 -2 Z" fill="#000" opacity=".12"/>
  </g>`;
}

/* ==========================================================================
   KANAT - 8 varyant

   Hepsi ayni iskeletten cikiyor (kol -> bilek -> parmak kemikleri -> zar);
   kademe yukseldikce zar dolgusu, kenar isleme ve ek susler degisiyor.
   Boylece yeni bir kanat eklemek data.js'e bir satir yazmak demek.
   ========================================================================== */

function kanatSvg(w, pal, uid, uzak) {
  const o = uzak ? 0.7 : 1;
  const kind = w.kind || 'plain';
  const parmak = w.parmak || 4;
  const kenar = w.kenar || ton(pal.horn, -0.1);
  const kemik = ton(pal.horn, uzak ? -0.5 : -0.15);

  const bx = 34 * o, by = -96 * o;
  /* Parmak uclari: sayiya gore yelpaze acilir */
  const tabanUc = [[72, -92], [84, -66], [80, -38], [62, -18]];
  const uc = (parmak >= 5 ? [[66, -100], ...tabanUc] : tabanUc).map(([x, y]) => [x * o, y * o]);

  /* Zar: bilekten parmak uclarina, aralari ice cukur (Q) */
  let zar = `M${bx} ${by} L${uc[0][0]} ${uc[0][1]}`;
  for (let i = 1; i < uc.length; i++) {
    const cukur = kind === 'demon' ? 14 : kind === 'lightning' ? 3 : 9;
    zar += ` Q${(uc[i - 1][0] + uc[i][0]) / 2 - cukur * o} ${(uc[i - 1][1] + uc[i][1]) / 2 + 5 * o} ${uc[i][0]} ${uc[i][1]}`;
  }
  zar += ` Q${28 * o} ${-16 * o} ${2 * o} ${-30 * o} Z`;

  /* Kademeye ozel ekler */
  let ek = '';
  if (kind === 'flame') {
    ek = uc.slice(0, 3).map(([x, y], i) => `
      <path d="M${x} ${y} C${x + 9 * o} ${y - 12 * o} ${x + 4 * o} ${y - 18 * o} ${x + 11 * o} ${y - 24 * o}
               C${x + 5 * o} ${y - 16 * o} ${x + 12 * o} ${y - 10 * o} ${x} ${y} Z"
            fill="${kenar}" opacity="${0.85 - i * 0.15}"/>`).join('');
  } else if (kind === 'crystal') {
    ek = uc.map(([x, y]) => `
      <path d="M${x} ${y} L${x + 7 * o} ${y - 4 * o} L${x + 3 * o} ${y + 6 * o} Z"
            fill="${kenar}" opacity=".85"/>`).join('');
  } else if (kind === 'demon') {
    ek = uc.map(([x, y]) => `
      <path d="M${x} ${y} L${x + 10 * o} ${y - 6 * o} L${x + 2 * o} ${y + 3 * o} Z" fill="${kemik}"/>`).join('');
  } else if (kind === 'phoenix') {
    ek = uc.map(([x, y], i) => `
      <path d="M${x} ${y} C${x + 14 * o} ${y - 6 * o} ${x + 20 * o} ${y + 2 * o} ${x + 13 * o} ${y + 9 * o}
               C${x + 8 * o} ${y + 6 * o} ${x + 4 * o} ${y + 2 * o} ${x} ${y} Z"
            fill="${kenar}" opacity="${0.9 - i * 0.1}"/>`).join('');
  } else if (kind === 'lightning') {
    ek = `<path d="M${uc[0][0]} ${uc[0][1]} L${uc[0][0] - 8 * o} ${uc[0][1] + 16 * o}
                   L${uc[0][0] - 2 * o} ${uc[0][1] + 15 * o} L${uc[1][0] - 6 * o} ${uc[1][1] + 12 * o}"
            fill="none" stroke="${kenar}" stroke-width="${2.2 * o}" opacity=".95"/>`;
  } else if (kind === 'king') {
    ek = `<path d="${zar}" fill="none" stroke="${kenar}" stroke-width="${2.6 * o}" opacity=".9"/>
          <circle cx="${bx}" cy="${by}" r="${5 * o}" fill="${kenar}"/>
          <circle cx="${bx}" cy="${by}" r="${2.2 * o}" fill="#fff" opacity=".8"/>`;
  } else if (kind === 'celestial') {
    ek = `<path d="${zar}" fill="none" stroke="${kenar}" stroke-width="${2.4 * o}" opacity=".95"/>
      ${uc.map(([x, y], i) => `
        <path d="M${x - 4 * o} ${y} l${2.6 * o} ${-6 * o} l${2.6 * o} ${6 * o} l${-2.6 * o} ${5 * o} Z"
              fill="#fff" opacity="${0.85 - i * 0.12}"/>`).join('')}
      <circle cx="${bx}" cy="${by}" r="${5.5 * o}" fill="${kenar}"/>`;
  }

  return `<g${uzak ? ' opacity=".5"' : ''}>
    <path d="${zar}" fill="url(#kn${uid}${uzak ? 'u' : 'y'})"/>
    ${ek}
    <path d="M${2 * o} ${-30 * o} C${12 * o} ${-56 * o} ${22 * o} ${-80 * o} ${bx} ${by}"
          fill="none" stroke="${kemik}" stroke-width="${5 * o}" stroke-linecap="round"/>
    ${uc.map(([x, y]) => `<path d="M${bx} ${by} L${x} ${y}" stroke="${kemik}"
      stroke-width="${2.6 * o}" stroke-linecap="round" opacity=".85"/>`).join('')}
    ${uc.map(([x, y]) => {
      const mx = bx + (x - bx) * 0.55, my = by + (y - by) * 0.55;
      return `<path d="M${mx} ${my} Q${mx + (x - bx) * 0.18} ${my + (y - by) * 0.42} ${mx + (x - bx) * 0.1} ${my + (y - by) * 0.62}"
        fill="none" stroke="${kemik}" stroke-width="${0.9 * o}" opacity=".4"/>`;
    }).join('')}
    <circle cx="${bx}" cy="${by}" r="${3.4 * o}" fill="${kemik}"/>
    <path d="M${bx} ${by} C${bx + 5 * o} ${by - 7 * o} ${bx + 11 * o} ${by - 8 * o} ${bx + 13 * o} ${by - 5 * o}
             C${bx + 10 * o} ${by - 3 * o} ${bx + 4 * o} ${by - 1 * o} ${bx} ${by} Z" fill="${kemik}"/>
  </g>`;
}

/* ==========================================================================
   KUYRUK - 8 varyant
   Buttan cikip saga-asagi, sonra one dogru kivriliyor. Kademe uc suslerini
   ve uzerindeki detaylari degistiriyor.
   ========================================================================== */

const KUYRUK_YOL = `M40 -8
  C60 -6 76 8 78 24 C80 39 69 49 53 50
  C42 50.6 33 47 28 43 C38 44 50 42 57 36
  C64 29 63 18 53 11 C46 6 41 1 40 -8 Z`;

/* Kuyruk uzerindeki suslerin oturdugu noktalar (dis kenar boyunca) */
const KUYRUK_NOKTA = [[58, -2, 8], [71, 10, 7.5], [78, 24, 7], [73, 39, 6]];

function kuyrukSvg(k, pal, uid, t) {
  const kind = k.kind || 'plain';
  const kenar = k.kenar || t.boynuzAcik;
  let sus = '';

  if (kind === 'plain') {
    sus = '';
  } else if (kind === 'spiked' || kind === 'king' || kind === 'demon') {
    sus = KUYRUK_NOKTA.map(([x, y, h]) => `
      <path d="M${x - h * 0.8} ${y + h * 0.5} L${x + h * 1.5} ${y - h * 0.4} L${x - h * 0.3} ${y - h * 0.9} Z"
            fill="${kind === 'king' ? kenar : t.boynuzKoyu}"/>
      <path d="M${x - h * 0.8} ${y + h * 0.5} L${x + h * 1.5} ${y - h * 0.4} L${x + h * 0.1} ${y - h * 0.1} Z"
            fill="${kind === 'king' ? ton(kenar, 0.4) : t.boynuzAcik}"/>`).join('');
    if (kind === 'demon') {
      /* iblis kuyrugu: ucta ok basi */
      sus += `<path d="M53 50 L70 58 L56 62 L44 56 Z" fill="${t.boynuzKoyu}"/>
              <path d="M53 50 L70 58 L57 57 Z" fill="${t.boynuzAcik}"/>`;
    }
    if (kind === 'king') {
      sus += KUYRUK_NOKTA.map(([x, y]) => `<circle cx="${x - 2}" cy="${y + 2}" r="2" fill="${ton(kenar, 0.5)}" opacity=".8"/>`).join('');
    }
  } else if (kind === 'flame') {
    sus = KUYRUK_NOKTA.map(([x, y, h], i) => `
      <path d="M${x} ${y} C${x + h} ${y - h} ${x + h * 0.6} ${y - h * 2} ${x} ${y - h * 2.6}
               C${x - h * 0.6} ${y - h * 2} ${x - h} ${y - h} ${x} ${y} Z"
            fill="${kenar}" opacity="${0.9 - i * 0.12}"/>`).join('');
  } else if (kind === 'crystal') {
    sus = KUYRUK_NOKTA.map(([x, y, h]) => `
      <path d="M${x} ${y - h * 1.6} L${x + h * 0.7} ${y - h * 0.3} L${x} ${y + h * 0.5}
               L${x - h * 0.7} ${y - h * 0.3} Z" fill="${kenar}" opacity=".9"/>
      <path d="M${x} ${y - h * 1.6} L${x + h * 0.7} ${y - h * 0.3} L${x} ${y - h * 0.4} Z"
            fill="#fff" opacity=".55"/>`).join('');
  } else if (kind === 'lightning') {
    sus = `<path d="M44 2 L56 8 L50 14 L64 22 L57 26 L70 36" fill="none"
             stroke="${kenar}" stroke-width="2.6" stroke-linecap="round" opacity=".95"/>`;
  } else if (kind === 'celestial') {
    sus = KUYRUK_NOKTA.map(([x, y, h], i) => `
      <path d="M${x} ${y - h * 1.5} l${h * 0.5} ${h * 1.1} l${-h * 0.5} ${h * 0.9} l${-h * 0.5} ${-h * 0.9} Z"
            fill="${kenar}"/>
      <circle cx="${x + 6}" cy="${y - 4}" r="${2.2 - i * 0.3}" fill="#fff" opacity=".8"/>`).join('');
  }

  return `
    <path d="${KUYRUK_YOL}" fill="${ton(pal.body, -0.28)}"/>
    <path d="M40 -8 C60 -6 76 8 78 24 C80 39 69 49 53 50 C61 45 68 38 68 28
             C68 15 56 5 42 1 Z" fill="${t.cokKoyu}" opacity=".5"/>
    ${sus}`;
}

/* ==========================================================================
   DESEN - 8 varyant
   Govde kirpma yolunun icinde cizilyor, siluetin disina tasmiyor.
   ========================================================================== */

function desen(pal, uid) {
  const k = pal.pattern;
  if (!k) return '';
  const m = pal.ink;
  const ic = (icerik) => `<g clip-path="url(#gv${uid})" opacity=".85">${icerik}</g>`;

  if (k === 'stripes') {
    return ic([0, 1, 2, 3, 4].map((i) => {
      const x = -22 + i * 15;
      return `<path d="M${x} -34 C${x + 5} -16 ${x + 4} 8 ${x - 3} 44"
        fill="none" stroke="${m}" stroke-width="4.5" opacity=".5"/>`;
    }).join(''));
  }
  if (k === 'flame') {
    return ic([0, 1, 2].map((i) => {
      const x = -14 + i * 20, y = 42 - i * 4;
      return `<path d="M${x} ${y} C${x + 8} ${y - 18} ${x - 4} ${y - 26} ${x + 3} ${y - 40}
        C${x + 12} ${y - 26} ${x + 16} ${y - 12} ${x} ${y} Z" fill="${m}" opacity=".55"/>`;
    }).join(''));
  }
  if (k === 'tribal') {
    return ic(`
      <path d="M-20 -20 L-6 -28 L4 -16 L18 -26 L30 -14" fill="none" stroke="${m}"
            stroke-width="3.4" stroke-linecap="round" opacity=".6"/>
      <path d="M-16 6 L-2 -2 L8 10 L22 0" fill="none" stroke="${m}"
            stroke-width="3" stroke-linecap="round" opacity=".5"/>
      <path d="M-10 28 L4 20 L16 30" fill="none" stroke="${m}"
            stroke-width="2.6" stroke-linecap="round" opacity=".4"/>`);
  }
  if (k === 'lightning') {
    return ic(`
      <path d="M-6 -32 L-16 -8 L-4 -6 L-14 26" fill="none" stroke="${m}"
            stroke-width="3.4" stroke-linejoin="round" opacity=".8"/>
      <path d="M20 -26 L10 -6 L20 -4 L12 20" fill="none" stroke="${m}"
            stroke-width="2.6" stroke-linejoin="round" opacity=".6"/>`);
  }
  if (k === 'runes') {
    return ic([[-16, -12], [6, -20], [24, -4], [-6, 14], [16, 22]].map(([x, y], i) => `
      <g transform="translate(${x} ${y}) scale(${1 - i * 0.08})" opacity=".75">
        <circle r="7" fill="none" stroke="${m}" stroke-width="1.6"/>
        <path d="M-4 -3 L0 4 L4 -3 M0 4 L0 -6" fill="none" stroke="${m}"
              stroke-width="1.6" stroke-linecap="round"/>
      </g>`).join(''));
  }
  if (k === 'armor') {
    return ic([-24, -10, 4, 18, 32].map((y, i) => `
      <path d="M${-30 + i * 1.5} ${y} C${-10 + i * 2} ${y + 7} ${20 + i} ${y + 6} ${44} ${y - 2}"
            fill="none" stroke="${m}" stroke-width="3" opacity=".55"/>
      <path d="M${-28 + i * 1.5} ${y - 2.5} C${-10 + i * 2} ${y + 3} ${20 + i} ${y + 2} ${42} ${y - 5}"
            fill="none" stroke="${ton(m, 0.5)}" stroke-width="1.2" opacity=".5"/>`).join(''));
  }
  if (k === 'cosmic') {
    return ic(`
      ${[[-18, -18, 4], [4, -26, 3], [26, -10, 3.4], [-8, 8, 2.6], [18, 20, 3], [-22, 26, 2.2]]
        .map(([x, y, r]) => `
        <path d="M${x} ${y - r * 2} C${x + r * 0.5} ${y - r * 0.5} ${x + r * 0.5} ${y - r * 0.5} ${x + r * 2} ${y}
                 C${x + r * 0.5} ${y + r * 0.5} ${x + r * 0.5} ${y + r * 0.5} ${x} ${y + r * 2}
                 C${x - r * 0.5} ${y + r * 0.5} ${x - r * 0.5} ${y + r * 0.5} ${x - r * 2} ${y}
                 C${x - r * 0.5} ${y - r * 0.5} ${x - r * 0.5} ${y - r * 0.5} ${x} ${y - r * 2} Z"
              fill="${m}" opacity=".85"/>`).join('')}
      <path d="M-30 4 C-10 -6 20 -2 46 -14" fill="none" stroke="${m}"
            stroke-width="1.4" opacity=".35"/>`);
  }
  if (k === 'celestial') {
    return ic(`
      ${[[-16, -16, 5], [8, -24, 4], [28, -6, 4.4], [-6, 10, 3.4], [20, 24, 3.6]]
        .map(([x, y, r]) => `
        <path d="M${x} ${y - r * 2.2} L${x + r * 0.6} ${y - r * 0.6} L${x + r * 2.2} ${y}
                 L${x + r * 0.6} ${y + r * 0.6} L${x} ${y + r * 2.2} L${x - r * 0.6} ${y + r * 0.6}
                 L${x - r * 2.2} ${y} L${x - r * 0.6} ${y - r * 0.6} Z" fill="${m}"/>
        <circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="#fff" opacity=".9"/>`).join('')}
      <path d="M-32 -6 C-6 -20 22 -14 48 -22" fill="none" stroke="${m}"
            stroke-width="1.6" opacity=".45"/>`);
  }
  return '';
}

/* ==========================================================================
   TAC (bas aksesuari) - 8 kademe

   3/4 profilde ciziliyor: bant duz bir dikdortgen degil, one dogru alcalan
   bir elips dilimi. Hepsi y=0 tabaninda cizilir, montajda kafatasinin
   tepesine tasinip hafifce dondurulur - boylece hem ejderhanin kafasina
   oturuyor hem dukkan kutucugunda tek basina gosterilebiliyor.
   ========================================================================== */

export const HEAD_BOX = {
  tiny:      '-20 -26 40 32',
  simple:    '-23 -30 46 36',
  points:    '-26 -34 52 40',
  jewel:     '-28 -44 56 50',
  flame:     '-30 -48 60 54',
  ice:       '-32 -52 64 58',
  king:      '-42 -50 84 56',
  celestial: '-46 -58 92 64',
};

export function headSvg(key, headTop = 0) {
  const c = HEADS[key];
  if (!c || key === 'none' || !c.kind) return '';

  const uid = `hd${++uidSayaci}`;
  const parlak = ton(c.metal, 0.45);
  const golge = ton(c.metal, -0.28);

  const defs = `
    <defs>
      <linearGradient id="${uid}" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="${golge}"/>
        <stop offset="0.5" stop-color="${c.metal}"/>
        <stop offset="1" stop-color="${parlak}"/>
      </linearGradient>
    </defs>`;
  const metal = `url(#${uid})`;

  /* Bant: 3/4'te one dogru alcalan elips dilimi. Duz dikdortgen bir bant
     kafanin uzerine "yapistirilmis" gibi duruyordu. */
  const bant = (w, h) => `
    <path d="M${-w} 0 Q0 ${h * 0.85} ${w} 0 L${w} ${-h} Q0 ${-h * 0.2} ${-w} ${-h} Z"
          fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M${-w + 2} ${-h * 0.55} Q0 ${h * 0.2} ${w - 2} ${-h * 0.55}"
          fill="none" stroke="${parlak}" stroke-width="1.2" opacity=".5"/>`;

  const tas = (x, y, r, renk) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${renk}"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ton(renk, -0.35)}" stroke-width=".8"/>
    <circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.32}" fill="#fff" opacity=".75"/>`;

  let ic;

  /* Kademe 1: ince halka, tek kucuk uc */
  if (c.kind === 'tiny') {
    ic = `${bant(13, 4)}
      <path d="M-6 -3 L0 -14 L6 -3 Z" fill="${metal}" stroke="${c.edge}" stroke-width="1.2"/>
      ${tas(0, -16, 2.2, c.gem)}`;

  /* Kademe 2: bronz, uc kucuk uc */
  } else if (c.kind === 'simple') {
    ic = `${bant(16, 5)}
      <path d="M-16 -4 L-11 -16 L-5.5 -8 L0 -19 L5.5 -8 L11 -16 L16 -4 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      ${tas(0, -21, 2.6, c.gem)}`;

  /* Kademe 3: bes uclu gumus */
  } else if (c.kind === 'points') {
    const uclar = [[-17, -16], [-8.5, -19], [0, -25], [8.5, -19], [17, -16]];
    ic = `${bant(19, 6)}
      <path d="M-19 -5 L-17 -16 L-11.5 -9 L-8.5 -19 L-4 -10 L0 -25
               L4 -10 L8.5 -19 L11.5 -9 L17 -16 L19 -5 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      ${uclar.map(([x, y]) => tas(x, y - 3, 2.2, c.gem)).join('')}`;

  /* Kademe 4: altin kral taci, tepesinde elmas */
  } else if (c.kind === 'jewel') {
    ic = `${bant(21, 7)}
      <path d="M-21 -6 L-17 -21 L-10.5 -12 L0 -31 L10.5 -12 L17 -21 L21 -6 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M0 -38 l5.5 6.5 l-5.5 7.5 l-5.5 -7.5 z" fill="${c.gem}"/>
      <path d="M0 -38 l5.5 6.5 l-5.5 1.5 z" fill="#fff" opacity=".5"/>
      ${tas(-17, -24, 2.8, c.gem)}${tas(17, -24, 2.8, c.gem)}`;

  /* Kademe 5: uclarinda alev yanan tac */
  } else if (c.kind === 'flame') {
    const alev = (x, y, b) => `
      <path d="M${x} ${y} C${x + b} ${y - b} ${x + b * 0.6} ${y - b * 2} ${x} ${y - b * 2.8}
               C${x - b * 0.6} ${y - b * 2} ${x - b} ${y - b} ${x} ${y} Z" fill="${c.gem}"/>
      <path d="M${x} ${y - b * 0.5} C${x + b * 0.5} ${y - b} ${x + b * 0.3} ${y - b * 1.6} ${x} ${y - b * 2}
               C${x - b * 0.3} ${y - b * 1.6} ${x - b * 0.5} ${y - b} ${x} ${y - b * 0.5} Z"
            fill="#ffe066" opacity=".9"/>`;
    ic = `${bant(22, 7)}
      <path d="M-22 -6 L-17 -19 L-8.5 -11 L0 -25 L8.5 -11 L17 -19 L22 -6 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      ${alev(0, -25, 6)}${alev(-17, -19, 4)}${alev(17, -19, 4)}`;

  /* Kademe 6: buz kristallerinden tac */
  } else if (c.kind === 'ice') {
    const kristal = (x, y, h) => `
      <path d="M${x} ${y - h} L${x + 5} ${y - h * 0.35} L${x + 3} ${y} L${x - 3} ${y}
               L${x - 5} ${y - h * 0.35} Z" fill="${c.metal}" opacity=".92"/>
      <path d="M${x} ${y - h} L${x + 5} ${y - h * 0.35} L${x} ${y - h * 0.3} Z"
            fill="#fff" opacity=".7"/>`;
    ic = `${bant(24, 7)}
      ${kristal(-18, -5, 16)}${kristal(-8, -6, 25)}${kristal(2, -6, 31)}
      ${kristal(12, -6, 23)}${kristal(21, -5, 15)}
      <circle cx="2" cy="-38" r="3" fill="#fff" opacity=".85"/>`;

  /* Kademe 7: ejder krali taci - yan kanatlar, buyuk tas */
  } else if (c.kind === 'king') {
    ic = `
      <path d="M-38 -10 q13 -6 20 6 l-4 7 q-9 -9 -16 -5z
               M38 -10 q-13 -6 -20 6 l4 7 q9 -9 16 -5z" fill="${metal}" opacity=".9"/>
      <path d="M-29 -23 q-6 -11 2 -18 q2 9 8 13z
               M29 -23 q6 -11 -2 -18 q-2 9 -8 13z" fill="${metal}" stroke="${c.edge}" stroke-width="1.2"/>
      ${bant(25, 9)}
      <path d="M-25 -8 L-20 -26 L-13.5 -14 L-7 -34 L0 -26 L7 -34 L13.5 -14 L20 -26 L25 -8 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M0 -43 l6 7 l-6 8 l-6 -8 z" fill="${c.gem}"/>
      <path d="M0 -43 l6 7 l-6 2 z" fill="#fff" opacity=".5"/>
      ${tas(-20, -29, 3, c.gem)}${tas(20, -29, 3, c.gem)}`;

  /* Kademe 8: semavi - hale, yuzen kristaller, isik */
  } else {
    ic = `
      <ellipse cx="0" cy="-31" rx="41" ry="13" fill="none" stroke="${c.gem}"
               stroke-width="2.4" opacity=".55" stroke-dasharray="8 6"/>
      <path d="M-42 -12 q15 -8 23 5 l-4 8 q-11 -10 -19 -6z
               M42 -12 q-15 -8 -23 5 l4 8 q11 -10 19 -6z" fill="${metal}" opacity=".9"/>
      ${bant(27, 9)}
      <path d="M-27 -8 L-20 -29 L-13.5 -16 L-7 -39 L0 -31 L7 -39 L13.5 -16 L20 -29 L27 -8 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="0" cy="-47" r="9" fill="${c.gem}" opacity=".3"/>
      <path d="M0 -47 C1.6 -40 3.4 -38.4 10 -37 C3.4 -35.6 1.6 -34 0 -27
               C-1.6 -34 -3.4 -35.6 -10 -37 C-3.4 -38.4 -1.6 -40 0 -47 Z" fill="#fff"/>
      ${tas(-20, -32, 3.2, c.gem)}${tas(20, -32, 3.2, c.gem)}
      <circle cx="-33" cy="-25" r="2.2" fill="#fff" opacity=".8"/>
      <circle cx="33" cy="-25" r="2.2" fill="#fff" opacity=".8"/>`;
  }

  return `${defs}<g transform="translate(0 ${headTop})">${ic}</g>`;
}

/* ==========================================================================
   YUZ ISARETI - 8 kademe

   3/4 profilde GORUNEN yanaga/aline ciziliyor (kafanin sol yarisi izleyiciye
   donuk). Onceki surumde iki yana simetrik cizildigi icin profilde kafanin
   disina tasip kulak gibi duruyorlardi.

   Kafa olculeri (bkz. KAFA_YOL):
     alin    x -60..-30, y -100..-88
     goz     (-44, -80)
     yanak   x -70..-40, y -78..-60
     namlu   x -88..-60, y -74..-58
   ========================================================================== */

export const FACE_BOX = '-92 -110 84 60';

export function faceSvg(key) {
  const f = FACES[key];
  if (!f || key === 'none' || !f.kind) return '';
  const c = f.color;

  /* Kademe 1: gozun ustunden yanaga inen tek iz */
  if (f.kind === 'scar') {
    return `
      <path d="M-52 -92 C-50 -84 -48 -76 -46 -70" fill="none" stroke="${c}"
            stroke-width="2.8" stroke-linecap="round" opacity=".95"/>
      <path d="M-56 -86 h7 M-54 -78 h7" stroke="${c}" stroke-width="2"
            stroke-linecap="round" opacity=".8"/>`;
  }

  /* Kademe 2: iki capraz iz */
  if (f.kind === 'twinScar') {
    return `
      <path d="M-54 -94 C-51 -85 -49 -77 -47 -70" fill="none" stroke="${c}"
            stroke-width="2.8" stroke-linecap="round" opacity=".95"/>
      <path d="M-62 -84 C-56 -80 -50 -76 -44 -74" fill="none" stroke="${c}"
            stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
      <path d="M-70 -70 C-64 -68 -58 -66 -52 -65" fill="none" stroke="${c}"
            stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
  }

  /* Kademe 3: yanakta tribal boya */
  if (f.kind === 'paint') {
    return `
      <path d="M-64 -74 l7 -3 l-2 7 l7 -2 l-2.5 7" fill="none" stroke="${c}"
            stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>
      <path d="M-48 -66 l5 -2 l-1.5 5" fill="none" stroke="${c}"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;
  }

  /* Kademe 4: gozun cevresinde karanlik buyu izi */
  if (f.kind === 'darkMark') {
    return `
      <path d="M-56 -86 C-50 -93 -38 -92 -34 -83 C-38 -74 -52 -76 -56 -82 Z"
            fill="${c}" opacity=".5"/>
      <path d="M-46 -70 l-3 8" stroke="${c}" stroke-width="2.4"
            stroke-linecap="round" opacity=".7"/>
      <path d="M-38 -72 l2 7" stroke="${c}" stroke-width="2"
            stroke-linecap="round" opacity=".6"/>`;
  }

  /* Kademe 5: yanaktan yukari uzanan alev isareti */
  if (f.kind === 'flame') {
    return `
      <path d="M-62 -64 C-56 -70 -54 -80 -58 -88
               C-50 -82 -48 -70 -54 -62 C-57 -60 -60 -61 -62 -64 Z"
            fill="${c}" opacity=".92"/>
      <path d="M-59 -66 C-55.5 -71 -54.5 -76 -56 -80 C-52.5 -75 -53 -69 -56 -64 Z"
            fill="#ffe066" opacity=".8"/>`;
  }

  /* Kademe 6: alinda parlayan run */
  if (f.kind === 'rune') {
    return `
      <g transform="translate(-46 -95)" opacity=".95">
        <circle r="8" fill="none" stroke="${c}" stroke-width="1.8"/>
        <path d="M-4 -3 L0 5 L4 -3 M0 5 L0 -7" fill="none" stroke="${c}"
              stroke-width="1.8" stroke-linecap="round"/>
      </g>
      <path d="M-62 -80 h8 M-64 -72 h6" stroke="${c}" stroke-width="1.8"
            stroke-linecap="round" opacity=".6"/>`;
  }

  /* Kademe 7: iblis savas boyasi - gozun cevresi ve yanak boyunca */
  if (f.kind === 'demon') {
    return `
      <path d="M-58 -90 C-50 -96 -36 -94 -32 -84 C-36 -76 -50 -78 -58 -86 Z"
            fill="${c}" opacity=".65"/>
      <path d="M-56 -72 l-4 10 M-48 -68 l-2 11 M-40 -68 l1 10"
            stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
      <path d="M-70 -66 C-62 -62 -50 -60 -40 -62" fill="none" stroke="${c}"
            stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`;
  }

  /* Kademe 8: ejder krali muhru - alinda taş, altin hatlar */
  return `
    <path d="M-52 -100 C-44 -104 -34 -102 -30 -95 C-36 -91 -48 -93 -52 -98 Z"
          fill="${c}" opacity=".55"/>
    <path d="M-42 -98 l4.5 5 l-4.5 6 l-4.5 -6 z" fill="${c}"/>
    <path d="M-42 -98 l4.5 5 l-4.5 1 z" fill="#fff" opacity=".6"/>
    <path d="M-60 -86 C-54 -82 -46 -80 -38 -81" fill="none" stroke="${c}"
          stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <path d="M-58 -72 l-3 9 M-48 -68 l-1 10" stroke="${c}" stroke-width="2.4"
          stroke-linecap="round" opacity=".7"/>`;
}

/* ==========================================================================
   YUMURTA - ilk seviyeler
   ========================================================================== */

function yumurtaSvg(level, pal) {
  const uid = ++uidSayaci;
  const catlak = level >= 3;
  const acik = ton(pal.body, 0.3), koyu = ton(pal.body, -0.3);
  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="ym${uid}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="${acik}"/>
          <stop offset="0.5" stop-color="${pal.body}"/>
          <stop offset="1" stop-color="${koyu}"/>
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="176" rx="42" ry="8" fill="#000" opacity=".3"/>
      <path d="M100 44 C132 44 152 84 152 118 C152 152 128 174 100 174
               C72 174 48 152 48 118 C48 84 68 44 100 44 Z" fill="url(#ym${uid})"/>
      <path d="M100 44 C82 52 70 84 70 118 C70 146 82 166 100 174
               C78 172 48 152 48 118 C48 84 68 44 100 44 Z" fill="${koyu}" opacity=".3"/>
      ${[0, 1, 2, 3].map((i) => `
        <path d="M${72 + i * 14} ${96 + (i % 2) * 22} q8 6 16 0" fill="none"
              stroke="${ton(pal.belly, -0.1)}" stroke-width="3" opacity=".5"/>`).join('')}
      ${catlak ? `<path d="M92 84 L102 100 L92 110 L104 128" fill="none"
              stroke="${ton(pal.dark, -0.3)}" stroke-width="2.6" stroke-linejoin="round"/>` : ''}
    </svg>`;
}

/* ==========================================================================
   MONTAJ
   ========================================================================== */

export function dragonSvg(level, look, mood = 'happy') {
  const pal = palet(look);
  if (level <= CONFIG.EGG_UNTIL) return yumurtaSvg(level, pal);

  const uid = ++uidSayaci;
  const g = growthRatio(level);
  /* Yerel cizim 180 birim genisliginde; 200'luk kadraja sigmasi icin olcek
     eski surumden dusuk. Ayaklar alt kenara yakin dursun diye ty seviyeye
     gore kayiyor. */
  const s = 0.50 + g * 0.24;
  const ty = 182 - 50 * s;

  const acik = ton(pal.body, 0.26);
  const koyu = ton(pal.body, -0.28);
  const cokKoyu = ton(pal.dark, -0.15);
  const boynuzAcik = ton(pal.horn, 0.35);
  const boynuzKoyu = ton(pal.horn, -0.38);
  const t = { cokKoyu, boynuzAcik, boynuzKoyu };

  const kanatOlcek = pal.wings.span || 1;
  const dikenSayisi = Math.round(4 + g * 3);

  /* Sirt dikenleri: sirt cizgisini takip ediyor, ortada en uzun */
  const sirtNokta = [[-14, -33], [-4, -34], [6, -33], [16, -31], [26, -27], [35, -21], [42, -13]];
  const dikenler = sirtNokta.slice(0, 3 + dikenSayisi).map(([x, y], i, a) => {
    const p = i / Math.max(1, a.length - 1);
    const h = 8 + Math.sin(p * Math.PI) * (5 + g * 5);
    return `
      <path d="M${x - 5.5} ${y + 3} L${x + 1} ${y - h} L${x + 5.5} ${y + 2} Z" fill="${boynuzKoyu}"/>
      <path d="M${x - 5.5} ${y + 3} L${x + 1} ${y - h} L${x + 1.6} ${y + 2.5} Z" fill="${boynuzAcik}"/>`;
  }).join('');

  /* Yanak dikenleri: cene menteşesinden geriye */
  const yanak = [[-26, -74, 10], [-24, -66, 9], [-28, -60, 7]].map(([x, y, h]) => `
    <path d="M${x} ${y - 4} L${x + h + 3} ${y + 2} L${x} ${y + 4} Z" fill="${boynuzKoyu}"/>
    <path d="M${x} ${y - 4} L${x + h + 3} ${y + 2} L${x + 3} ${y + 0.5} Z" fill="${boynuzAcik}"/>`).join('');

  const bKalinlik = 7 + g * 3;
  const bUzunluk = 40 + g * 16;

  /* Ac ejderhada goz kapaklari yariya iniyor */
  const gozKapak = mood === 'sad'
    ? `<path d="M-54 -84 C-48 -89 -38 -88 -35 -82 L-54 -80 Z" fill="${ton(pal.body, -0.18)}"/>`
    : '';

  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="gvg${uid}" x1="0.1" y1="0" x2="0.7" y2="1">
          ${pal.aurora
            ? pal.aurora.map((renk, i) =>
                `<stop offset="${(i / (pal.aurora.length - 1)).toFixed(2)}" stop-color="${renk}"/>`).join('')
            : `<stop offset="0" stop-color="${acik}"/>
               <stop offset="0.45" stop-color="${pal.body}"/>
               <stop offset="1" stop-color="${koyu}"/>`}
        </linearGradient>
        <linearGradient id="bn${uid}" x1="0" y1="1" x2="0.35" y2="0">
          <stop offset="0" stop-color="${boynuzKoyu}"/>
          <stop offset="0.55" stop-color="${pal.horn}"/>
          <stop offset="1" stop-color="${boynuzAcik}"/>
        </linearGradient>
        <linearGradient id="kr${uid}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="${ton(pal.belly, 0.22)}"/>
          <stop offset="1" stop-color="${ton(pal.belly, -0.28)}"/>
        </linearGradient>
        <linearGradient id="kn${uid}y" x1="0" y1="0" x2="0.8" y2="0.5">
          <stop offset="0" stop-color="${cokKoyu}"/>
          <stop offset="0.6" stop-color="${pal.dark}"/>
          <stop offset="1" stop-color="${ton(pal.dark, 0.32)}"/>
        </linearGradient>
        <linearGradient id="kn${uid}u" x1="0" y1="0" x2="0.8" y2="0.5">
          <stop offset="0" stop-color="${ton(pal.dark, -0.35)}"/>
          <stop offset="1" stop-color="${ton(pal.dark, -0.1)}"/>
        </linearGradient>
        <radialGradient id="gz${uid}">
          <stop offset="0" stop-color="${ton(pal.horn, 0.5)}"/>
          <stop offset="1" stop-color="${ton(pal.horn, 0.5)}" stop-opacity="0"/>
        </radialGradient>
        <clipPath id="gv${uid}"><path d="${GOVDE_YOL}"/></clipPath>
        <clipPath id="bt${uid}"><path d="${BUT_YOL}"/></clipPath>
        <clipPath id="kf${uid}"><path d="${KAFA_YOL}"/></clipPath>
      </defs>

      <g transform="translate(104 ${ty.toFixed(1)}) scale(${s.toFixed(3)})">

        <ellipse cx="6" cy="50" rx="58" ry="8" fill="#000" opacity=".28"/>

        <!-- UZAK KANAT -->
        <g transform="translate(4 4) scale(${kanatOlcek.toFixed(2)} 1)">
          ${kanatSvg(pal.wings, pal, uid, true)}
        </g>

        ${kuyrukSvg(pal.tail, pal, uid, t)}

        <!-- YAKIN KANAT -->
        <g transform="scale(${kanatOlcek.toFixed(2)} 1)">${kanatSvg(pal.wings, pal, uid, false)}</g>

        <!-- UZAK on bacak -->
        <g opacity=".75">
          <path d="${BACAK_YOL}" fill="${cokKoyu}" transform="translate(16 -2) scale(0.85 0.9)"/>
          ${pati(-6, 30, 0.72, cokKoyu, ton(pal.horn, -0.25))}
        </g>

        ${dikenler}

        <!-- GOVDE -->
        <path d="${GOVDE_YOL}" fill="url(#gvg${uid})"/>
        <g clip-path="url(#gv${uid})">
          <path d="M7 -33 C25 -32 39 -24 45 -12 C36 -22 22 -28 6 -29 Z" fill="${cokKoyu}" opacity=".4"/>
          <!-- GOGUS PLAKALARI: gogsun on egrisini takip eden bantlar -->
          <path d="M-31 -20 C-36 -6 -35 14 -30 28 C-26 37 -16 42 -4 43
                   C-11 33 -15 18 -15 2 C-15 -11 -21 -17 -28 -22 Z" fill="url(#kr${uid})"/>
          ${[-16, -8, 0, 8, 16, 24, 32, 38].map((y, i) => {
            const x0 = -33 + Math.abs(i - 3.5) * 0.7, x1 = -14 + i * 1.4;
            return `
              <path d="M${x0} ${y} C${(x0 + x1) / 2} ${y + 4.5} ${x1 - 4} ${y + 5} ${x1} ${y + 3}"
                    fill="none" stroke="${ton(pal.belly, -0.42)}" stroke-width="1.7" opacity=".55"/>
              <path d="M${x0 + 1.4} ${y - 1.6} C${(x0 + x1) / 2} ${y + 2} ${x1 - 5} ${y + 2.6} ${x1 - 2} ${y + 1}"
                    fill="none" stroke="${ton(pal.belly, 0.5)}" stroke-width="1" opacity=".45"/>`;
          }).join('')}
          <path d="M-10 -34 C10 -36 32 -30 46 -18 C32 -26 10 -30 -10 -29 Z"
                fill="${cokKoyu}" opacity=".35"/>
          ${pullar(-34, -34, 9, 6, 11, 14, ton(pal.body, -0.45), 0.3)}
          <path d="M-14 -33 C6 -35 30 -29 45 -14" fill="none"
                stroke="${ton(pal.body, 0.6)}" stroke-width="2.4" opacity=".45"/>
        </g>

        ${desen(pal, uid)}

        <!-- ARKA BUT: ayri kutle, govdenin uzerine biniyor -->
        <path d="${BUT_YOL}" fill="${ton(pal.body, 0.06)}"/>
        <g clip-path="url(#bt${uid})">
          <ellipse cx="34" cy="8" rx="20" ry="20" fill="${ton(pal.body, 0.18)}" opacity=".55"/>
          <path d="M22 -28 C44 -25 58 -5 55 15 C50 -2 40 -16 22 -22 Z" fill="${acik}" opacity=".3"/>
          <path d="M20 45 C38 46 52 34 55 15 C50 32 38 42 20 41 Z" fill="${cokKoyu}" opacity=".35"/>
          ${pullar(0, -26, 9, 6, 8, 13, ton(pal.body, -0.45), 0.26)}
          <path d="M24 -24 C31 -10 33 6 29 24" fill="none"
                stroke="${cokKoyu}" stroke-width="1.8" opacity=".4"/>
        </g>
        ${pati(30, 34, 0.8, ton(pal.body, 0.02), ton(pal.horn, 0.25))}

        <!-- YAKIN on bacak -->
        <path d="${BACAK_YOL}" fill="${ton(pal.body, -0.14)}"/>
        <path d="M-30 -16 C-37 -2 -37 16 -33 30 C-32 34 -29 36 -26 37
                 C-28 22 -28 4 -24 -14 Z" fill="${acik}" opacity=".22"/>
        ${pati(-26, 32, 0.95, ton(pal.body, -0.04), ton(pal.horn, 0.3))}

        <!-- BOYUN -->
        <path d="${BOYUN_YOL}" fill="url(#gvg${uid})"/>
        <path d="M-25 -64 C-21 -49 -11 -39 3 -33 L-2 -29 C-16 -36 -27 -47 -31 -62 Z"
              fill="${cokKoyu}" opacity=".4"/>
        ${[0, 1, 2, 3, 4].map((i) => {
          const p = i / 4, x = -39 + p * 20, y = -53 + p * 22;
          return `<path d="M${x} ${y} C${x + 5} ${y + 5} ${x + 11} ${y + 7} ${x + 15} ${y + 6}"
            fill="none" stroke="${ton(pal.belly, -0.3)}" stroke-width="2" opacity=".5"/>`;
        }).join('')}

        ${yanak}

        <!-- BOYNUZLAR -->
        <path d="${boynuzYol(-30, -100, bUzunluk + 12, bKalinlik + 1.5, 26)}" fill="url(#bn${uid})"/>
        <path d="M-30 -100 C-14 -108 4 -114 22 -119 C6 -112 -10 -104 -24 -95 Z"
              fill="${boynuzAcik}" opacity=".45"/>
        <path d="${boynuzYol(-22, -90, bUzunluk, bKalinlik, 16)}" fill="url(#bn${uid})" opacity=".9"/>

        <!-- KAFA -->
        <path d="${KAFA_YOL}" fill="url(#gvg${uid})"/>
        <g clip-path="url(#kf${uid})">
          <path d="M-88 -66 C-82 -76 -68 -84 -54 -90 C-44 -94 -36 -100 -30 -107
                   L-24 -96 C-38 -88 -60 -78 -74 -70 Z" fill="${acik}" opacity=".32"/>
          <path d="M-88 -64 C-74 -57 -50 -54 -30 -60 L-28 -52 C-52 -48 -76 -54 -90 -60 Z"
                fill="${cokKoyu}" opacity=".5"/>
          <path d="M-30 -104 C-20 -101 -15 -93 -17 -82 C-24 -78 -31 -79 -35 -84 Z"
                fill="${ton(pal.body, -0.16)}" opacity=".65"/>
          ${pullar(-88, -104, 7.5, 5, 11, 10, ton(pal.body, -0.45), 0.26)}
          <path d="M-86 -63 C-72 -58 -52 -56 -34 -60" fill="none"
                stroke="${ton(pal.body, 0.35)}" stroke-width="1.6" opacity=".35"/>
        </g>

        <!-- kas cikintisi -->
        <path d="M-58 -88 C-49 -95 -37 -97 -28 -93 C-37 -89 -49 -85 -57 -83 Z"
              fill="${ton(pal.body, -0.32)}"/>

        <!-- GOZ -->
        <ellipse cx="-44.5" cy="-80" rx="13" ry="9" fill="url(#gz${uid})" opacity=".55"/>
        <path d="M-54 -82 C-48 -88 -38 -87 -35 -80 C-39 -75 -50 -76 -54 -82 Z" fill="#150e22"/>
        <path d="M-52.6 -81.4 C-47.6 -86 -39.6 -85 -36.6 -80.2 C-40 -76.4 -48.6 -77 -52.6 -81.4 Z"
              fill="${ton(pal.horn, 0.45)}"/>
        <path d="M-45 -84 C-42.8 -84 -41.6 -82 -41.6 -80.2 C-41.6 -78.4 -42.8 -77.2 -45 -77.2
                 C-46.8 -78.4 -47 -82.8 -45 -84 Z" fill="#150e22"/>
        <circle cx="-41.2" cy="-82" r="1.7" fill="#fff" opacity=".95"/>
        ${gozKapak}

        <!-- burun deligi, agiz, disler -->
        <path d="M-80 -71 C-77 -72.4 -74.4 -71 -75 -68.6 C-77.4 -68 -80 -69 -80 -71 Z"
              fill="${cokKoyu}"/>
        <path d="M-87 -64 C-74 -59 -52 -57 -32 -61" fill="none"
              stroke="${cokKoyu}" stroke-width="2" opacity=".8" stroke-linecap="round"/>
        <path d="M-68 -58.4 L-64.6 -58.8 L-66 -53 Z" fill="#fff" opacity=".92"/>
        <path d="M-58 -57.4 L-55.4 -57.8 L-56.6 -53.4 Z" fill="#fff" opacity=".8"/>

        <!-- YUZ ISARETI: gozden SONRA, uzerine binebilsin diye -->
        ${faceSvg(look.face)}

        <!-- TAC: kafatasinin tepesine oturuyor, 3/4 egimine gore donduruluyor -->
        <g transform="translate(${KAFA.tac[0]} ${KAFA.tac[1]}) rotate(${KAFA.tacAci})">
          ${headSvg(look.head, 0)}
        </g>
      </g>
    </svg>`;
}
