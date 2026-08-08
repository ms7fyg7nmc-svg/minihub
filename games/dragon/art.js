/* Dragon Island - EJDERHA CIZIMI

   Ejderha tek bir SVG olarak uretiliyor. Cizim tamamen VERIYE bagli:
   girdi olarak buyume orani (0..1) ve gorunum (renk/desen/bas/yuz) aliyor,
   baska hicbir sey bilmiyor. Boylece ayni fonksiyon hem ada sahnesinde hem
   dukkan onizlemesinde kullanilabiliyor.

   Olcekler seviye 99'da bile 200x200 kadraja sigacak sekilde secildi:
   en genis nokta kanat ucu (x = ±118), yani 118 * wing * s <= ~96. */

import { palet, HEADS, FACES } from './data.js';
import { CONFIG, growthRatio } from './config.js';

/* Govde yolu hem dolgu hem de desenin kirpma maskesi olarak kullaniliyor */
const GOVDE = 'M-34 2 Q-38 -22 -14 -30 Q14 -34 34 -12 Q45 10 28 29 Q2 40 -18 31 Q-32 22 -34 2 Z';

/* Ayni sayfada birden fazla ejderha cizilebilir (dukkan onizlemeleri),
   clipPath id'lerinin catismamasi icin sayac. */
let uidSayaci = 0;

/* --- Gozler: tok ve mutluysa parlak, acsa yorgun --- */
function gozler(mood) {
  if (mood === 'sad') {
    return `
      <path d="M-19 -58 q7 5 13 0" fill="none" stroke="#2a2136" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M6 -58 q7 5 13 0" fill="none" stroke="#2a2136" stroke-width="3.4" stroke-linecap="round"/>`;
  }
  return `
    <path d="M-20 -62 L-6 -57 L-20 -52 Z" fill="#fff8d8"/>
    <path d="M20 -62 L6 -57 L20 -52 Z" fill="#fff8d8"/>
    <circle cx="-13" cy="-57" r="2.4" fill="#2a2136"/>
    <circle cx="13" cy="-57" r="2.4" fill="#2a2136"/>`;
}

/* --- BAS AKSESUARI (taclar) ---

   Hepsi y=0 tabaninda cizilir, sonra alin cizgisine tasinir. Boylece hem
   ejderhanin kafasina oturtmak hem de dukkan kutucugunda tek basina
   gostermek ayni koddan cikar. HEAD_BOX kutucuk cercevelerini tutar. */

export const HEAD_BOX = {
  silver:  '-18 -28 36 32',
  gold:    '-21 -32 42 36',
  ruby:    '-23 -40 46 44',
  ancient: '-37 -43 74 47',
  dragon:  '-41 -44 82 48',
};

export function headSvg(key, headTop = 0) {
  const c = HEADS[key];
  if (!c || key === 'none') return '';

  const bant = (w, h) => `
    <path d="M${-w} 2 h${w * 2} v${-h} h${-w * 2} z"
          fill="${c.metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M${-w + 2} -1 h${w * 2 - 4}" stroke="${c.edge}"
          stroke-width="1.1" opacity=".55"/>`;

  let ic;

  if (key === 'silver') {
    ic = `
      ${bant(15, 5)}
      <path d="M-15 -3 L-10 -16 L-5 -8 L0 -20 L5 -8 L10 -16 L15 -3 Z"
            fill="${c.metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="0" cy="-22" r="2.8" fill="${c.gem}"/>`;

  } else if (key === 'gold') {
    const uclar = [[-16, -17], [-8, -20], [0, -26], [8, -20], [16, -17]];
    const inci = uclar.map(([x, y]) => `<circle cx="${x}" cy="${y - 3}" r="2.2" fill="${c.gem}"/>`).join('');
    ic = `
      ${bant(18, 6)}
      <path d="M-18 -4 L-16 -17 L-11 -9 L-8 -20 L-4 -10 L0 -26
               L4 -10 L8 -20 L11 -9 L16 -17 L18 -4 Z"
            fill="${c.metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      ${inci}`;

  } else if (key === 'ruby') {
    ic = `
      ${bant(20, 7)}
      <path d="M-20 -5 L-16 -20 L-10 -11 L0 -30 L10 -11 L16 -20 L20 -5 Z"
            fill="${c.metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M0 -36 l5 6 l-5 7 l-5 -7 z" fill="${c.gem}"/>
      <path d="M0 -36 l5 6 l-5 1 z" fill="#fff" opacity=".45"/>
      <circle cx="-16" cy="-23" r="2.8" fill="${c.gem}"/>
      <circle cx="16" cy="-23" r="2.8" fill="${c.gem}"/>
      <circle cx="0" cy="-2" r="2.2" fill="${c.gem}" opacity=".8"/>`;

  } else if (key === 'ancient') {
    ic = `
      <path d="M-34 -8 q10 -3 16 4 l-3 6 q-8 -6 -13 -2z
               M34 -8 q-10 -3 -16 4 l3 6 q8 -6 13 -2z"
            fill="${c.metal}" opacity=".8"/>
      ${bant(22, 8)}
      <path d="M-22 -6 L-17 -23 L-11 -12 L0 -32 L11 -12 L17 -23 L22 -6 Z"
            fill="${c.metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="0" cy="-34" r="4.5" fill="${c.gem}"/>
      <circle cx="0" cy="-34" r="1.8" fill="#fff" opacity=".6"/>
      <path d="M-17 -20 v5 M-20 -17.5 h6 M17 -20 v5 M14 -17.5 h6"
            stroke="${c.gem}" stroke-width="1.6" opacity=".85" stroke-linecap="round"/>
      <path d="M-8 -2 h16" stroke="${c.gem}" stroke-width="1.4" opacity=".7"/>`;

  } else {
    /* dragon: genis kanatlar, yan boynuzlar, tepesinde ejder gozu */
    ic = `
      <path d="M-38 -12 q13 -6 21 6 l-4 7 q-10 -9 -17 -5z
               M38 -12 q-13 -6 -21 6 l4 7 q10 -9 17 -5z"
            fill="${c.metal}" opacity=".85"/>
      <path d="M-30 -24 q-6 -11 2 -18 q2 9 8 13z
               M30 -24 q6 -11 -2 -18 q-2 9 -8 13z"
            fill="${c.metal}" stroke="${c.edge}" stroke-width="1.2"/>
      ${bant(25, 9)}
      <path d="M-25 -7 L-20 -26 L-14 -14 L-7 -34 L0 -26 L7 -34 L14 -14 L20 -26 L25 -7 Z"
            fill="${c.metal}" stroke="${c.edge}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M-25 -7 L-20 -26 L-14 -14 L-7 -34 L0 -26 L0 -7 Z"
            fill="${c.edge}" opacity=".2"/>
      <ellipse cx="0" cy="-33" rx="5.2" ry="6" fill="${c.gem}"/>
      <ellipse cx="0" cy="-33" rx="1.5" ry="4.2" fill="#2a1020"/>
      <circle cx="-20" cy="-29" r="2.8" fill="${c.gem}"/>
      <circle cx="20" cy="-29" r="2.8" fill="${c.gem}"/>
      <path d="M-19 -2 h38" stroke="${c.gem}" stroke-width="1.6" opacity=".65"/>`;
  }

  return `<g transform="translate(0 ${headTop})">${ic}</g>`;
}

/* --- YUZ AKSESUARI (ikincil slot) ---
   Gozlerin uzerine ciziliyor, yani gozlerden SONRA cagrilmali. */

export const FACE_BOX = '-30 -74 60 34';

export function faceSvg(key) {
  const f = FACES[key];
  if (!f || key === 'none') return '';

  if (f.kind === 'scar') {
    /* Sag goz uzerinden inen savas izi */
    return `
      <path d="M14 -70 L20 -48" stroke="${f.color}" stroke-width="2.6"
            stroke-linecap="round" opacity=".9"/>
      <path d="M12 -62 h9 M13 -55 h8" stroke="${f.color}" stroke-width="1.8"
            stroke-linecap="round" opacity=".75"/>`;
  }

  if (f.kind === 'paint') {
    /* Iki yanaga surulmus savas boyasi */
    return `
      <path d="M-25 -55 l7 -3 l-2 7 l7 -2 l-3 7" fill="none" stroke="${f.color}"
            stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>
      <path d="M25 -55 l-7 -3 l2 7 l-7 -2 l3 7" fill="none" stroke="${f.color}"
            stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>`;
  }

  if (f.kind === 'monocle') {
    /* Sag gozde tek camli gozluk ve zinciri */
    return `
      <circle cx="13" cy="-57" r="9" fill="#cfe6ff" opacity=".28"/>
      <circle cx="13" cy="-57" r="9" fill="none" stroke="${f.color}" stroke-width="2.4"/>
      <path d="M20 -50 q4 8 -2 13" fill="none" stroke="${f.color}"
            stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;
  }

  /* visor: iki gozu de orten parlak bant */
  return `
    <path d="M-26 -64 q26 -7 52 0 l-2 11 q-24 6 -48 0 z"
          fill="${f.color}" opacity=".55"/>
    <path d="M-26 -64 q26 -7 52 0 l-2 11 q-24 6 -48 0 z"
          fill="none" stroke="${f.color}" stroke-width="2"/>
    <path d="M-18 -60 q16 -4 34 0" stroke="#fff" stroke-width="2"
          opacity=".55" stroke-linecap="round"/>`;
}

/* --- GOVDE DESENI ---
   Cizimler govde yoluna kirpilir, boylece siluetten tasmaz. */
function desen(pal) {
  if (!pal.pattern) return '';
  const uid = `dsn${++uidSayaci}`;
  const ink = pal.ink || pal.dark;
  let icerik = '';

  if (pal.pattern === 'scales') {
    /* Ust uste binen pul siralari */
    for (let sira = 0; sira < 6; sira++) {
      const y = -26 + sira * 11;
      const kaydir = sira % 2 ? 6 : 0;
      for (let x = -42 + kaydir; x <= 42; x += 12) {
        icerik += `<path d="M${x} ${y} q6 7 12 0" fill="none" stroke="${ink}"
                         stroke-width="1.6" opacity=".3" stroke-linecap="round"/>`;
      }
    }

  } else if (pal.pattern === 'cracks') {
    /* Icten yanan magma catlaklari */
    const yol = `M-24 -26 l6 12 l-5 9 l8 13 l-4 12
                 M14 -28 l-4 14 l7 10 l-5 12 l6 10
                 M-6 -20 l5 11 l-4 10 l6 12`;
    icerik = `
      <path d="${yol}" fill="none" stroke="${ink}" stroke-width="2.4" opacity=".75"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${yol}" fill="none" stroke="#fff" stroke-width="0.9" opacity=".5"
            stroke-linecap="round"/>`;

  } else if (pal.pattern === 'runes') {
    /* Kadim simgeler: govdede parlayan bir halka ve run harfleri */
    icerik = `
      <circle cx="0" cy="-2" r="21" fill="none" stroke="${ink}" stroke-width="1.6" opacity=".55"/>
      <circle cx="0" cy="-2" r="14" fill="none" stroke="${ink}" stroke-width="1" opacity=".35"/>
      <path d="M-30 -22 v9 M-34 -18 h8 M-30 -13 l4 5
               M28 -20 v10 M24 -20 l8 5 l-8 5
               M-28 14 l5 -8 l5 8 M-26 11 h6
               M26 12 v10 M22 12 h8 M26 17 h5
               M0 -14 v7 M-4 -10 h8 M0 -7 l4 6 l-8 0 z"
            fill="none" stroke="${ink}" stroke-width="2" opacity=".8"
            stroke-linecap="round" stroke-linejoin="round"/>`;

  } else if (pal.pattern === 'plates') {
    /* Zirh plakalari ve altin kaplama */
    icerik = `
      <path d="M-40 -18 q40 -12 80 0 M-40 -4 q40 -12 80 0
               M-40 10 q40 -12 80 0 M-40 24 q40 -12 80 0"
            fill="none" stroke="${ink}" stroke-width="1.8" opacity=".45"/>
      <path d="M-22 -30 v62 M22 -30 v62" stroke="${ink}" stroke-width="1.4" opacity=".3"/>
      <path d="M-34 -24 l6 -6 l6 6 l-6 6 z M28 -20 l5 -5 l5 5 l-5 5 z
               M-32 18 l5 -5 l5 5 l-5 5 z M26 20 l6 -6 l6 6 l-6 6 z"
            fill="${ink}" opacity=".6"/>`;

  } else if (pal.pattern === 'frost') {
    /* Buz kristalleri: alttan yukari dogru tirmanan don deseni */
    const kristal = (x, y, r) => `
      <path d="M${x} ${y - r} V${y + r} M${x - r} ${y} H${x + r}
               M${x - r * 0.7} ${y - r * 0.7} L${x + r * 0.7} ${y + r * 0.7}
               M${x - r * 0.7} ${y + r * 0.7} L${x + r * 0.7} ${y - r * 0.7}"
            stroke="${ink}" stroke-width="1.5" opacity=".8" stroke-linecap="round"/>`;
    icerik = `
      <path d="M-36 34 q10 -14 4 -26 q12 10 16 -4 q6 16 16 4 q-6 12 6 26 z"
            fill="${ink}" opacity=".22"/>
      ${kristal(-20, 8, 7)}${kristal(6, -6, 9)}${kristal(24, 14, 6)}${kristal(-6, 22, 5)}`;
  }

  return `
    <clipPath id="${uid}"><path d="${GOVDE}"/></clipPath>
    <g clip-path="url(#${uid})">${icerik}</g>`;
}

/* --- YUMURTA: seviye yukseldikce catlaklar artar --- */
function yumurtaSvg(level, pal) {
  const c1 = level >= 2
    ? `<path d="M-6 -14 l7 10 l-9 8 l8 9" fill="none" stroke="${pal.dark}"
             stroke-width="2.6" stroke-linecap="round" opacity=".65"/>` : '';
  const c2 = level >= 3
    ? `<path d="M14 -4 l-7 9 l9 7" fill="none" stroke="${pal.dark}"
             stroke-width="2.4" stroke-linecap="round" opacity=".5"/>` : '';
  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <g transform="translate(100 112)">
        <ellipse cx="0" cy="0" rx="42" ry="53" fill="${pal.belly}"/>
        <ellipse cx="0" cy="0" rx="42" ry="53" fill="none" stroke="${pal.body}" stroke-width="3" opacity=".55"/>
        <ellipse cx="-15" cy="-24" rx="11" ry="7" fill="#fff" opacity=".5"/>
        <ellipse cx="15" cy="13" rx="10" ry="7" fill="${pal.body}" opacity=".28"/>
        ${c1}${c2}
      </g>
    </svg>`;
}

/* --- EJDERHA ---
   look : { color, skin, head, face }
   mood : 'happy' | 'sad' */
export function dragonSvg(level, look, mood = 'happy') {
  const pal = palet(look);
  if (level <= CONFIG.EGG_UNTIL) return yumurtaSvg(level, pal);

  const g = growthRatio(level);
  const s = 0.62 + g * 0.26;     /* genel olcek    0.62 -> 0.88 */
  const wing = 0.60 + g * 0.32;  /* kanat acikligi 0.60 -> 0.92 */
  const horn = 0.60 + g * 0.38;  /* boynuz uzunlugu 0.60 -> 0.98 */
  const dikenSayisi = Math.round(4 + g * 8);

  /* Sirt dikenleri govdeden ONCE cizilir; tabanlari govdenin arkasinda kalir
     ve sirttan cikiyormus gibi gorunur. Boyun/bas ustunu ortmesin diye orta
     serit bos birakiliyor. */
  const sirtY = (x) => -32 + (x / 34) ** 2 * 24;
  let dikenler = '';
  const yanBasi = Math.max(2, Math.round(dikenSayisi / 2));
  for (let taraf = -1; taraf <= 1; taraf += 2) {
    for (let i = 0; i < yanBasi; i++) {
      const p = yanBasi === 1 ? 0 : i / (yanBasi - 1);
      const x = taraf * (11 + p * 21);
      const uzun = 1 - p * 0.55;
      const kenar = sirtY(x);
      const uc = kenar - (5 + uzun * 9);
      const w = 3.6 + uzun * 1.6;
      dikenler += `<path d="M${(x - w).toFixed(1)} ${(kenar + 9).toFixed(1)}
                            L${x.toFixed(1)} ${uc.toFixed(1)}
                            L${(x + w).toFixed(1)} ${(kenar + 9).toFixed(1)} Z" fill="${pal.horn}"/>`;
    }
  }

  const ayak = (cx) => `
    <ellipse cx="${cx}" cy="31" rx="12" ry="7.5" fill="${pal.dark}"/>
    <path d="M${cx - 9} 35 l-3 8 l6 -3 z
             M${cx - 1} 37 l-1 8 l5 -4 z
             M${cx + 8} 35 l4 7 l-6 -1 z" fill="${pal.horn}"/>`;

  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <g transform="translate(100 118) scale(${s.toFixed(3)})">

        <!-- KANATLAR: govdenin arkasinda, genis ve kose hatli zarlar -->
        <g transform="scale(${wing.toFixed(3)} 1)">
          <path d="M-14 -30 L-96 -86 Q-118 -40 -94 4 L-78 -14 L-66 6 L-52 -12 L-38 8 L-24 -12 Z"
                fill="${pal.dark}"/>
          <path d="M-14 -30 L-96 -86 Q-118 -40 -94 4" fill="none"
                stroke="${pal.horn}" stroke-width="2.8" opacity=".6"/>
          <path d="M-14 -30 L-70 -50 M-14 -30 L-56 -18" stroke="${pal.horn}"
                stroke-width="1.6" opacity=".3"/>

          <path d="M14 -30 L96 -86 Q118 -40 94 4 L78 -14 L66 6 L52 -12 L38 8 L24 -12 Z"
                fill="${pal.dark}"/>
          <path d="M14 -30 L96 -86 Q118 -40 94 4" fill="none"
                stroke="${pal.horn}" stroke-width="2.8" opacity=".6"/>
          <path d="M14 -30 L70 -50 M14 -30 L56 -18" stroke="${pal.horn}"
                stroke-width="1.6" opacity=".3"/>
        </g>

        <!-- KUYRUK -->
        <path d="M20 18 Q62 34 84 10 L98 24 Q112 6 96 -8 Q78 16 54 16 Q34 12 22 6 Z"
              fill="${pal.dark}"/>

        ${dikenler}

        <!-- GOVDE -->
        <path d="${GOVDE}" fill="${pal.body}"/>
        <path d="M-34 2 Q-38 -22 -14 -30 Q-24 -8 -22 12 Q-21 26 -18 31 Q-32 22 -34 2 Z"
              fill="${pal.dark}" opacity=".22"/>
        <path d="M34 -12 Q45 10 28 29 Q22 20 22 8 Q22 -8 16 -24 Z"
              fill="${pal.dark}" opacity=".22"/>

        ${desen(pal)}

        ${ayak(-16)}${ayak(16)}

        <!-- Karin plakalari -->
        <path d="M-15 2 Q0 -10 17 1 Q24 19 6 28 Q-11 28 -17 17 Z" fill="${pal.belly}"/>
        <path d="M-11 7 h22 M-13 15 h26 M-9 23 h18" stroke="${pal.dark}"
              stroke-width="1.5" opacity=".3" stroke-linecap="round"/>

        <!-- BOYUN -->
        <path d="M-14 -24 Q-17 -40 -11 -46 L11 -46 Q17 -40 14 -24 Z" fill="${pal.body}"/>

        <!-- BAS -->
        <path d="M-26 -52 L-30 -74 L-16 -85 L16 -85 L30 -74 L26 -52 Q19 -38 0 -35 Q-19 -38 -26 -52 Z"
              fill="${pal.body}"/>

        <!-- Kas cikintisi: sert bir bakis verir -->
        <path d="M-26 -68 L-6 -63 M26 -68 L6 -63" stroke="${pal.dark}"
              stroke-width="5" stroke-linecap="round"/>

        ${gozler(mood)}
        ${faceSvg(look.face)}

        <!-- Burun -->
        <path d="M-10 -44 h20 q4 6 -2 9 h-16 q-6 -3 -2 -9 z" fill="${pal.dark}" opacity=".9"/>
        <circle cx="-4.5" cy="-42" r="1.6" fill="#1e1829"/>
        <circle cx="4.5" cy="-42" r="1.6" fill="#1e1829"/>

        <!-- Yanak dikenleri -->
        <path d="M-24 -60 l-13 5 l11 5 z M24 -60 l13 5 l-11 5 z" fill="${pal.horn}"/>

        <!-- BOYNUZLAR: seviye ciktikca uzar -->
        <g transform="scale(1 ${horn.toFixed(3)})">
          <path d="M-26 -73 Q-45 -89 -49 -119 Q-29 -97 -14 -79 Z" fill="${pal.horn}"/>
          <path d="M26 -73 Q45 -89 49 -119 Q29 -97 14 -79 Z" fill="${pal.horn}"/>
        </g>

        ${headSvg(look.head, -85)}
      </g>
    </svg>`;
}
