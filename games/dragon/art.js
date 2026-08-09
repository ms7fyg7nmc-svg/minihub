/* Dragon Island - EJDERHA CIZIMI

   Ejderha tek bir SVG olarak uretiliyor. Cizim tamamen VERIYE bagli: girdi
   olarak seviye ve gorunum (renk/desen/bas/yuz) aliyor, baska hicbir sey
   bilmiyor. Ayni fonksiyon hem ada sahnesinde hem dukkan onizlemesinde
   kullaniliyor.

   HACIM NEREDEN GELIYOR

   Onceki surum duz renk lekelerinden olusuyordu ve yapistirma gibi duruyordu.
   Simdi her parca ustten aydinlik, altta koyu bir degradeyle doluyor; govdenin
   kenarinda ince bir isik cizgisi (rim light) var; kanat zarinin altinda parmak
   kemikleri geciyor. Ara tonlar elle yazilmiyor - ton() fonksiyonu paletin ana
   rengini beyaza/siyaha dogru karistirarak uretiyor, boylece 9 rengin hepsi
   ayni hacim dilini kendiliginden kazaniyor.

   Olcekler seviye 99'da bile 200x200 kadraja sigacak sekilde secildi:
   en genis nokta kanat ucu (x = ±120), yani 120 * wing * s <= ~96. */

import { palet, HEADS, FACES } from './data.js';
import { CONFIG, growthRatio } from './config.js';

/* Ayni sayfada birden fazla ejderha olabilir; degrade ve maske id'leri
   catismasin diye sayac. */
let uidSayaci = 0;

/* --- Ton yardimcisi ---
   miktar > 0 beyaza, < 0 siyaha dogru karistirir (-1..1). */
function ton(hex, miktar) {
  const n = parseInt(hex.slice(1), 16);
  const hedef = miktar > 0 ? 255 : 0;
  const k = Math.abs(miktar);
  const kanal = (kaydir) => {
    const v = (n >> kaydir) & 255;
    return Math.round(v + (hedef - v) * k);
  };
  return `rgb(${kanal(16)},${kanal(8)},${kanal(0)})`;
}

/* --- Govde silueti ---
   Hem dolgu hem desen maskesi hem de rim light bu yoldan uretiliyor. */
const GOVDE = `M-36 -4
  C-38 -22 -22 -34 0 -34
  C22 -34 38 -22 38 -4
  C40 16 26 33 0 35
  C-26 33 -40 14 -36 -4 Z`;

/* --- Gozler ---
   Badem sekilli, ice dogru egimli: sert bir bakis veriyor. Ac ejderhada
   goz kapaklari yariya iniyor. */
function gozler(mood, pal) {
  const parlak = ton(pal.horn, 0.55);
  const goz = (yon) => `
    <g transform="scale(${yon} 1)">
      <path d="M8 -62 C14 -67 24 -66 27 -60 C24 -55 13 -55 8 -58 Z"
            fill="#1a1424"/>
      <path d="M9.5 -61.4 C15 -65.4 23 -64.6 25.6 -60 C23 -56.4 14 -56.6 9.5 -59 Z"
            fill="${parlak}"/>
      <path d="M17 -63.4 C19.4 -63.4 20.4 -61.6 20.4 -60 C20.4 -58.4 19.4 -57 17 -57
               C15.6 -58 15.2 -62.4 17 -63.4 Z" fill="#1a1424"/>
      <circle cx="21.5" cy="-62" r="1.7" fill="#fff" opacity=".9"/>
    </g>`;
  if (mood === 'sad') {
    /* Yorgun bakis: ust kapak gozun yarisini kapatiyor */
    return `${goz(-1)}${goz(1)}
      <path d="M-27 -64 C-20 -68 -10 -67 -7 -61 L-27 -61 Z" fill="${ton(pal.body, -0.18)}"/>
      <path d="M27 -64 C20 -68 10 -67 7 -61 L27 -61 Z" fill="${ton(pal.body, -0.18)}"/>`;
  }
  return `${goz(-1)}${goz(1)}`;
}

/* --- BAS AKSESUARI (taclar) ---
   Hepsi y=0 tabaninda cizilir, sonra alin cizgisine tasinir. Boylece hem
   ejderhanin kafasina oturtmak hem de dukkan kutucugunda tek basina
   gostermek ayni koddan cikar. */

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

  const uid = `hd${++uidSayaci}`;
  const parlak = ton(c.metal, 0.45);
  const golge = ton(c.metal, -0.28);

  /* Metal degrade: ustte parlak, altta koyu - dumduz sari lekeler kalmiyor */
  const defs = `
    <defs>
      <linearGradient id="${uid}" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="${golge}"/>
        <stop offset="0.5" stop-color="${c.metal}"/>
        <stop offset="1" stop-color="${parlak}"/>
      </linearGradient>
    </defs>`;
  const metal = `url(#${uid})`;

  const bant = (w, h) => `
    <path d="M${-w} 2 h${w * 2} v${-h} h${-w * 2} z"
          fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M${-w + 2} -1.5 h${w * 2 - 4}" stroke="${parlak}"
          stroke-width="1.2" opacity=".5"/>`;

  const tas = (x, y, r, renk) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${renk}"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ton(renk, -0.35)}" stroke-width=".8"/>
    <circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.32}" fill="#fff" opacity=".75"/>`;

  let ic;

  if (key === 'silver') {
    ic = `
      ${bant(15, 5)}
      <path d="M-15 -3 L-10 -16 L-5 -8 L0 -20 L5 -8 L10 -16 L15 -3 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      ${tas(0, -22, 3, c.gem)}`;

  } else if (key === 'gold') {
    const uclar = [[-16, -17], [-8, -20], [0, -26], [8, -20], [16, -17]];
    ic = `
      ${bant(18, 6)}
      <path d="M-18 -4 L-16 -17 L-11 -9 L-8 -20 L-4 -10 L0 -26
               L4 -10 L8 -20 L11 -9 L16 -17 L18 -4 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      ${uclar.map(([x, y]) => tas(x, y - 3, 2.4, c.gem)).join('')}`;

  } else if (key === 'ruby') {
    ic = `
      ${bant(20, 7)}
      <path d="M-20 -5 L-16 -20 L-10 -11 L0 -30 L10 -11 L16 -20 L20 -5 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M0 -37 l5.5 6.5 l-5.5 7.5 l-5.5 -7.5 z" fill="${c.gem}"/>
      <path d="M0 -37 l5.5 6.5 l-5.5 1.5 z" fill="#fff" opacity=".5"/>
      <path d="M0 -37 l-5.5 6.5 l5.5 1.5 z" fill="${ton(c.gem, -0.3)}"/>
      ${tas(-16, -23, 2.8, c.gem)}${tas(16, -23, 2.8, c.gem)}
      ${tas(0, -2, 2.4, c.gem)}`;

  } else if (key === 'ancient') {
    ic = `
      <path d="M-34 -8 q10 -3 16 4 l-3 6 q-8 -6 -13 -2z
               M34 -8 q-10 -3 -16 4 l3 6 q8 -6 13 -2z"
            fill="${metal}" opacity=".85"/>
      ${bant(22, 8)}
      <path d="M-22 -6 L-17 -23 L-11 -12 L0 -32 L11 -12 L17 -23 L22 -6 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="0" cy="-34" r="6.5" fill="${c.gem}" opacity=".28"/>
      ${tas(0, -34, 4.5, c.gem)}
      <path d="M-17 -20 v5 M-20 -17.5 h6 M17 -20 v5 M14 -17.5 h6"
            stroke="${c.gem}" stroke-width="1.7" opacity=".9" stroke-linecap="round"/>
      <path d="M-8 -2 h16" stroke="${c.gem}" stroke-width="1.4" opacity=".7"/>`;

  } else {
    /* dragon: genis kanatlar, yan boynuzlar, tepesinde ejder gozu */
    ic = `
      <path d="M-38 -12 q13 -6 21 6 l-4 7 q-10 -9 -17 -5z
               M38 -12 q-13 -6 -21 6 l4 7 q10 -9 17 -5z"
            fill="${metal}" opacity=".9"/>
      <path d="M-30 -24 q-6 -11 2 -18 q2 9 8 13z
               M30 -24 q6 -11 -2 -18 q-2 9 -8 13z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.2"/>
      ${bant(25, 9)}
      <path d="M-25 -7 L-20 -26 L-14 -14 L-7 -34 L0 -26 L7 -34 L14 -14 L20 -26 L25 -7 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.6" stroke-linejoin="round"/>
      <ellipse cx="0" cy="-33" rx="7" ry="8" fill="${c.gem}" opacity=".3"/>
      <ellipse cx="0" cy="-33" rx="5.2" ry="6" fill="${c.gem}"/>
      <ellipse cx="0" cy="-33" rx="1.5" ry="4.4" fill="#2a1020"/>
      <circle cx="-1.6" cy="-35.4" r="1.5" fill="#fff" opacity=".8"/>
      ${tas(-20, -29, 3, c.gem)}${tas(20, -29, 3, c.gem)}
      <path d="M-19 -2 h38" stroke="${c.gem}" stroke-width="1.6" opacity=".65"/>`;
  }

  return `${defs}<g transform="translate(0 ${headTop})">${ic}</g>`;
}

/* --- YUZ AKSESUARI (ikincil slot) ---
   Gozlerin uzerine ciziliyor, yani gozlerden SONRA cagrilmali. */

export const FACE_BOX = '-32 -76 64 34';

export function faceSvg(key) {
  const f = FACES[key];
  if (!f || key === 'none') return '';

  if (f.kind === 'scar') {
    /* Sag goz uzerinden inen savas izi */
    return `
      <path d="M15 -74 C17 -66 19 -58 21 -50" fill="none" stroke="${f.color}"
            stroke-width="2.8" stroke-linecap="round" opacity=".95"/>
      <path d="M12 -66 h9 M13.5 -58 h8.5" stroke="${f.color}" stroke-width="2"
            stroke-linecap="round" opacity=".8"/>`;
  }

  if (f.kind === 'paint') {
    /* Iki yanaga surulmus savas boyasi */
    return `
      <path d="M-27 -54 l7 -3.5 l-2 7.5 l7.5 -2.5 l-3 7.5" fill="none" stroke="${f.color}"
            stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>
      <path d="M27 -54 l-7 -3.5 l2 7.5 l-7.5 -2.5 l3 7.5" fill="none" stroke="${f.color}"
            stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`;
  }

  if (f.kind === 'monocle') {
    /* Sag gozde tek camli gozluk ve zinciri */
    return `
      <circle cx="17" cy="-60" r="11" fill="#dff0ff" opacity=".24"/>
      <circle cx="17" cy="-60" r="11" fill="none" stroke="${f.color}" stroke-width="2.6"/>
      <circle cx="17" cy="-60" r="8.5" fill="none" stroke="#fff" stroke-width="1" opacity=".4"/>
      <path d="M12 -51 q3 9 -4 14" fill="none" stroke="${f.color}"
            stroke-width="1.8" stroke-linecap="round" opacity=".85"/>`;
  }

  /* visor: iki gozu de orten parlak bant */
  return `
    <path d="M-29 -68 q29 -8 58 0 l-2.5 13 q-27 7 -53 0 z"
          fill="${f.color}" opacity=".6"/>
    <path d="M-29 -68 q29 -8 58 0 l-2.5 13 q-27 7 -53 0 z"
          fill="none" stroke="${ton(f.color, -0.25)}" stroke-width="2.2"/>
    <path d="M-20 -64 q18 -5 38 0" stroke="#fff" stroke-width="2.4"
          opacity=".55" stroke-linecap="round"/>`;
}

/* --- GOVDE DESENI ---
   Govde yoluna kirpilir, boylece siluetten tasmaz. Desenler artik duz
   cizgi degil: her birinin kendi golgesi/parlamasi var. */
function desen(pal, uid) {
  if (!pal.pattern) return '';
  const ink = pal.ink || pal.dark;
  const koyu = ton(pal.body, -0.3);
  let icerik = '';

  if (pal.pattern === 'scales') {
    /* Ust uste binen pullar: her pulun alti golgeli, ustu isikli */
    for (let sira = 0; sira < 7; sira++) {
      const y = -30 + sira * 10;
      const kaydir = sira % 2 ? 6.5 : 0;
      for (let x = -44 + kaydir; x <= 44; x += 13) {
        icerik += `<path d="M${x} ${y} q6.5 9 13 0" fill="none" stroke="${koyu}"
                         stroke-width="2.2" opacity=".38" stroke-linecap="round"/>
                   <path d="M${x + 1.5} ${y - 1.2} q5 7 10 0" fill="none" stroke="${ton(ink, 0.35)}"
                         stroke-width="1.1" opacity=".32" stroke-linecap="round"/>`;
      }
    }

  } else if (pal.pattern === 'cracks') {
    /* Icten yanan magma: kalin koyu yarik + icinde parlayan cizgi */
    const yol = `M-25 -30 l7 13 l-6 10 l9 14 l-5 13
                 M15 -32 l-5 15 l8 11 l-6 13 l7 11
                 M-6 -22 l6 12 l-5 11 l7 13`;
    icerik = `
      <path d="${yol}" fill="none" stroke="${koyu}" stroke-width="5" opacity=".5"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${yol}" fill="none" stroke="${ink}" stroke-width="2.6" opacity=".9"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${yol}" fill="none" stroke="#fff8dc" stroke-width="1" opacity=".65"
            stroke-linecap="round"/>`;

  } else if (pal.pattern === 'runes') {
    /* Kadim simgeler: parlayan cift halka ve run harfleri */
    icerik = `
      <circle cx="0" cy="-1" r="22" fill="none" stroke="${koyu}" stroke-width="4" opacity=".35"/>
      <circle cx="0" cy="-1" r="22" fill="none" stroke="${ink}" stroke-width="1.8" opacity=".8"/>
      <circle cx="0" cy="-1" r="14.5" fill="none" stroke="${ink}" stroke-width="1.1" opacity=".45"/>
      <circle cx="0" cy="-1" r="22" fill="none" stroke="#fff" stroke-width=".7" opacity=".35"/>
      <path d="M-31 -22 v9 M-35 -18 h8 M-31 -13 l4 5
               M29 -20 v10 M25 -20 l8 5 l-8 5
               M-29 15 l5 -8 l5 8 M-27 12 h6
               M27 13 v10 M23 13 h8 M27 18 h5
               M0 -13 v7 M-4 -9 h8 M0 -6 l4 6 l-8 0 z"
            fill="none" stroke="${koyu}" stroke-width="4" opacity=".4"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-31 -22 v9 M-35 -18 h8 M-31 -13 l4 5
               M29 -20 v10 M25 -20 l8 5 l-8 5
               M-29 15 l5 -8 l5 8 M-27 12 h6
               M27 13 v10 M23 13 h8 M27 18 h5
               M0 -13 v7 M-4 -9 h8 M0 -6 l4 6 l-8 0 z"
            fill="none" stroke="${ink}" stroke-width="2.1" opacity=".95"
            stroke-linecap="round" stroke-linejoin="round"/>`;

  } else if (pal.pattern === 'plates') {
    /* Zirh plakalari: her bandin alti golgeli, ustu isikli metal */
    for (let i = 0; i < 4; i++) {
      const y = -20 + i * 14;
      icerik += `
        <path d="M-42 ${y} q42 -13 84 0" fill="none" stroke="${koyu}"
              stroke-width="4.5" opacity=".4"/>
        <path d="M-42 ${y - 1.8} q42 -13 84 0" fill="none" stroke="${ink}"
              stroke-width="2" opacity=".75"/>`;
    }
    icerik += `
      <path d="M-23 -32 v66 M23 -32 v66" stroke="${koyu}" stroke-width="2.6" opacity=".3"/>
      <path d="M-35 -25 l6 -6 l6 6 l-6 6 z M29 -21 l5.5 -5.5 l5.5 5.5 l-5.5 5.5 z
               M-33 17 l5.5 -5.5 l5.5 5.5 l-5.5 5.5 z M27 19 l6 -6 l6 6 l-6 6 z"
            fill="${ink}" opacity=".8"/>`;

  } else if (pal.pattern === 'frost') {
    /* Buz kiragi: alttan tirmanan don tabakasi + kristaller */
    const kristal = (x, y, r) => `
      <g stroke="${ink}" stroke-linecap="round" opacity=".9">
        <path d="M${x} ${y - r} V${y + r} M${x - r} ${y} H${x + r}
                 M${x - r * 0.72} ${y - r * 0.72} L${x + r * 0.72} ${y + r * 0.72}
                 M${x - r * 0.72} ${y + r * 0.72} L${x + r * 0.72} ${y - r * 0.72}"
              stroke-width="1.7"/>
        <path d="M${x} ${y - r * 0.5} l${-r * 0.3} ${-r * 0.3} M${x} ${y - r * 0.5} l${r * 0.3} ${-r * 0.3}
                 M${x} ${y + r * 0.5} l${-r * 0.3} ${r * 0.3} M${x} ${y + r * 0.5} l${r * 0.3} ${r * 0.3}"
              stroke-width="1.2" opacity=".75"/>
      </g>`;
    icerik = `
      <path d="M-40 36 q11 -16 5 -29 q13 11 17 -5 q7 17 17 5 q-7 13 7 29 z"
            fill="${ink}" opacity=".26"/>
      <path d="M-40 36 q11 -16 5 -29 q13 11 17 -5 q7 17 17 5 q-7 13 7 29"
            fill="none" stroke="${ink}" stroke-width="1.4" opacity=".55"/>
      ${kristal(-21, 6, 7.5)}${kristal(7, -8, 9.5)}${kristal(25, 13, 6.5)}${kristal(-6, 23, 5.5)}`;
  }

  return `<g clip-path="url(#gv${uid})">${icerik}</g>`;
}

/* --- YUMURTA: seviye yukseldikce catlaklar artar --- */
function yumurtaSvg(level, pal) {
  const uid = ++uidSayaci;
  const c1 = level >= 2
    ? `<path d="M-6 -16 l8 11 l-10 9 l9 10" fill="none" stroke="${ton(pal.body, -0.35)}"
             stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>` : '';
  const c2 = level >= 3
    ? `<path d="M15 -5 l-8 10 l10 8" fill="none" stroke="${ton(pal.body, -0.35)}"
             stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>` : '';
  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="yum${uid}" cx="0.36" cy="0.28" r="0.82">
          <stop offset="0" stop-color="${ton(pal.belly, 0.4)}"/>
          <stop offset="0.6" stop-color="${pal.belly}"/>
          <stop offset="1" stop-color="${ton(pal.body, -0.15)}"/>
        </radialGradient>
      </defs>
      <g transform="translate(100 112)">
        <ellipse cx="0" cy="0" rx="42" ry="53" fill="url(#yum${uid})"/>
        <ellipse cx="0" cy="0" rx="42" ry="53" fill="none"
                 stroke="${ton(pal.body, -0.2)}" stroke-width="2.5" opacity=".5"/>
        <ellipse cx="-15" cy="-25" rx="12" ry="8" fill="#fff" opacity=".45"
                 transform="rotate(-24 -15 -25)"/>
        <path d="M-30 22 q30 16 60 -4 q-14 26 -32 26 q-20 -2 -28 -22 z"
              fill="${pal.body}" opacity=".16"/>
        <ellipse cx="16" cy="12" rx="9" ry="6" fill="${pal.body}" opacity=".2"/>
        ${c1}${c2}
      </g>
    </svg>`;
}

/* --- BAS PARCALARI ---

   Boyunun ustunde kalan her sey: boynuzlar, kafa, gozler, burun, agiz, yanak
   dikenleri, yuz aksesuari ve tac. Tek yerde durmasinin sebebi, kafanin hem
   tam boy ejderhada hem de sadece-kafa cizimlerinde (bot profil fotografi,
   dukkandaki tac/yuz onizlemeleri) ayni gorunmesi gerektigi. */
function basParcalari(pal, look, mood, hornOlcek, uid) {
  const acik = ton(pal.body, 0.24);
  const cokKoyu = ton(pal.dark, -0.2);
  const boynuzAcik = ton(pal.horn, 0.4);
  const boynuzKoyu = ton(pal.horn, -0.32);

  return `
        <!-- BOYNUZLAR
             Kafanin arkasindan cikip GERIYE ve disariya supurulurler. Onceki
             surumde dimdik yukari gidiyor ve tavsan kulagi gibi duruyorlardi.
             Buyume tabanlarindan olceklendigi icin boy ve kalinlik birlikte
             artiyor - sadece dikey esnetmek onlari spagettiye ceviriyordu. -->
        <g transform="translate(0 -74) scale(${hornOlcek.toFixed(3)}) translate(0 74)">
          ${[-1, 1].map((yon) => `
          <g transform="scale(${yon} 1)">
            <path d="M-19 -76 C-30 -80 -41 -92 -47 -110
                     C-45 -112 -42 -113 -40 -112
                     C-34 -97 -25 -85 -11 -79 Z" fill="url(#bn${uid})"/>
            <path d="M-19 -76 C-30 -80 -41 -92 -47 -110
                     C-42 -95 -32 -83 -16 -77 Z" fill="${boynuzKoyu}" opacity=".4"/>
            <path d="M-24 -79.5 l3.5 -5 M-31 -84 l3 -5.4 M-38 -93 l3 -5"
                  stroke="${boynuzKoyu}" stroke-width="1.6" opacity=".55" stroke-linecap="round"/>
          </g>`).join('')}
        </g>

        <!-- BAS: cenesine dogru daralan, surungen hatli tek parca -->
        <path d="M-28 -62 C-30 -81 -18 -92 0 -92 C18 -92 30 -81 28 -62
                 C27 -54 24 -48 20 -45 C18 -38 10 -34 0 -34
                 C-10 -34 -18 -38 -20 -45 C-24 -48 -27 -54 -28 -62 Z"
              fill="url(#gv${uid}g)"/>
        <!-- Yanak golgesi -->
        <path d="M28 -62 C27 -54 24 -48 20 -45 C18 -38 10 -34 0 -34
                 C10 -39 16 -46 18 -56 C20 -70 15 -84 6 -90
                 C19 -88 29 -76 28 -62 Z" fill="${cokKoyu}" opacity=".22"/>
        <!-- Alin isigi -->
        <path d="M-13 -86 C-6 -90 6 -90 13 -86 C6 -82 -6 -82 -13 -86 Z"
              fill="${ton(pal.body, 0.5)}" opacity=".45"/>

        <!-- BURUN SIRTI: ayri bir leke degil, kafanin uzerinde hafif kabartma -->
        <path d="M-10 -58 C-11 -47 -7 -39 0 -39 C7 -39 11 -47 10 -58
                 C6 -60 -6 -60 -10 -58 Z" fill="${cokKoyu}" opacity=".18"/>
        <path d="M-10 -58 C-6 -60 6 -60 10 -58 C6 -57 -6 -57 -10 -58 Z"
              fill="${acik}" opacity=".3"/>

        <!-- Kas cikintisi -->
        <path d="M-27 -72 C-20 -75 -12 -73 -8 -68" fill="none" stroke="${cokKoyu}"
              stroke-width="4.6" stroke-linecap="round" opacity=".75"/>
        <path d="M27 -72 C20 -75 12 -73 8 -68" fill="none" stroke="${cokKoyu}"
              stroke-width="4.6" stroke-linecap="round" opacity=".75"/>

        ${gozler(mood, pal)}

        <!-- Burun delikleri -->
        <path d="M-5.2 -46 C-5.6 -43.4 -4.2 -42 -3.2 -42.6 C-3.6 -44.4 -4.4 -45.8 -5.2 -46 Z
                 M5.2 -46 C5.6 -43.4 4.2 -42 3.2 -42.6 C3.6 -44.4 4.4 -45.8 5.2 -46 Z"
              fill="#150f1d" opacity=".85"/>

        <!-- Agiz: cene hattini takip eder, ustunden iki fildisi sarkar -->
        <path d="M-13 -40 C-7 -35 7 -35 13 -40" fill="none" stroke="#150f1d"
              stroke-width="2" stroke-linecap="round" opacity=".75"/>
        <path d="M-7.4 -37.4 C-6.6 -34 -5.6 -32.6 -4.6 -32.4 C-4 -34.6 -4.2 -36.6 -4.6 -38.2 Z
                 M7.4 -37.4 C6.6 -34 5.6 -32.6 4.6 -32.4 C4 -34.6 4.2 -36.6 4.6 -38.2 Z"
              fill="#fff" opacity=".92"/>

        <!-- Yanak dikenleri: cene hattina yapisik, geriye dogru -->
        <path d="M-24 -56 L-39 -50 L-25 -45 Z" fill="${boynuzKoyu}"/>
        <path d="M-24 -56 L-39 -50 L-29 -50 Z" fill="${boynuzAcik}"/>
        <path d="M24 -56 L39 -50 L25 -45 Z" fill="${boynuzKoyu}"/>
        <path d="M24 -56 L39 -50 L29 -50 Z" fill="${boynuzAcik}"/>

        ${faceSvg(look.face)}
        ${headSvg(look.head, -90)}
  `;
}

/* Bas parcalarinin ihtiyac duydugu degradeler.
   Hem dragonSvg hem dragonHeadSvg ayni tanimlari kullaniyor. */
function basDefs(pal, uid) {
  return `
    <linearGradient id="gv${uid}g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ton(pal.body, 0.24)}"/>
      <stop offset="0.45" stop-color="${pal.body}"/>
      <stop offset="1" stop-color="${ton(pal.body, -0.26)}"/>
    </linearGradient>
    <linearGradient id="bn${uid}" x1="0" y1="1" x2="0.3" y2="0">
      <stop offset="0" stop-color="${ton(pal.horn, -0.32)}"/>
      <stop offset="0.6" stop-color="${pal.horn}"/>
      <stop offset="1" stop-color="${ton(pal.horn, 0.4)}"/>
    </linearGradient>`;
}

/* --- SADECE BAS ---

   Govde, kanat ve kuyruk olmadan sadece kafa. Bot profil fotografi ve
   dukkandaki tac/yuz onizlemeleri icin. Tam boy sprite'i kirpmak ise
   yaramiyordu: kanatlar kafanin iki yaninda kalip kadraji kirletiyordu.

   Kadraj: bas + boynuzlar kutusu yerel koordinatlarda x ±47, y -110..-34.
   Bu kutu 200'luk cerceveye ortalanip buyutuluyor. */
export function dragonHeadSvg(look, mood = 'happy') {
  const pal = palet(look);
  const uid = ++uidSayaci;
  const olcek = 1.85;
  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>${basDefs(pal, uid)}</defs>
      <g transform="translate(100 ${100 + 72 * olcek}) scale(${olcek})">
        ${basParcalari(pal, look, mood, 1, uid)}
      </g>
    </svg>`;
}

/* --- EJDERHA ---
   look : { color, skin, head, face }
   mood : 'happy' | 'sad' */
export function dragonSvg(level, look, mood = 'happy') {
  const pal = palet(look);
  if (level <= CONFIG.EGG_UNTIL) return yumurtaSvg(level, pal);

  const uid = ++uidSayaci;
  const g = growthRatio(level);
  const s = 0.62 + g * 0.26;     /* genel olcek    0.62 -> 0.88 */
  const wing = 0.60 + g * 0.32;  /* kanat acikligi 0.60 -> 0.92 */
  const horn = 0.60 + g * 0.38;  /* boynuz uzunlugu 0.60 -> 0.98 */
  const dikenSayisi = Math.round(4 + g * 8);

  const acik = ton(pal.body, 0.24);
  const koyu = ton(pal.body, -0.26);
  const cokKoyu = ton(pal.dark, -0.2);
  const kanatAcik = ton(pal.dark, 0.18);
  const boynuzAcik = ton(pal.horn, 0.4);
  const boynuzKoyu = ton(pal.horn, -0.32);

  /* --- Sirt dikenleri ---
     Govdeden ONCE cizilir; tabanlari govdenin arkasinda kalir ve sirttan
     cikiyormus gibi gorunur. Boyun/bas ustunu ortmesin diye orta serit bos. */
  const sirtY = (x) => -34 + (x / 36) ** 2 * 26;
  let dikenler = '';
  const yanBasi = Math.max(2, Math.round(dikenSayisi / 2));
  for (let taraf = -1; taraf <= 1; taraf += 2) {
    for (let i = 0; i < yanBasi; i++) {
      const p = yanBasi === 1 ? 0 : i / (yanBasi - 1);
      /* Ice dogru daha fazla girilirse dikenler boynun arkasinda kayboluyor,
         o yuzden omuzdan disariya diziliyorlar. */
      const x = taraf * (20 + p * 16);
      const uzun = 1 - p * 0.5;
      const kenar = sirtY(x);
      const uc = kenar - (6 + uzun * 11);
      const w = 3.8 + uzun * 1.8;
      dikenler += `
        <path d="M${(x - w).toFixed(1)} ${(kenar + 9).toFixed(1)}
                 L${x.toFixed(1)} ${uc.toFixed(1)}
                 L${(x + w).toFixed(1)} ${(kenar + 9).toFixed(1)} Z" fill="${boynuzKoyu}"/>
        <path d="M${(x - w).toFixed(1)} ${(kenar + 9).toFixed(1)}
                 L${x.toFixed(1)} ${uc.toFixed(1)}
                 L${(x + w * 0.15).toFixed(1)} ${(kenar + 9).toFixed(1)} Z" fill="${boynuzAcik}"/>`;
    }
  }

  /* --- KANAT ---
     Kol kemigi bilege gider, oradan parmaklar acilir, zar aralarina gerilir.
     Zarin arka kenari parmak uclari arasinda ice dogru kavis yapar (fistolu). */
  const bilek = { x: 98, y: -80 };
  const omuz = { x: 15, y: -28 };
  const uclar = [{ x: 120, y: -26 }, { x: 102, y: 14 }, { x: 72, y: 34 }, { x: 42, y: 28 }];

  let zar = `M${omuz.x} ${omuz.y} L${bilek.x} ${bilek.y} L${uclar[0].x} ${uclar[0].y}`;
  for (let i = 1; i < uclar.length; i++) {
    const a = uclar[i - 1];
    const b = uclar[i];
    /* Kontrol noktasi iki ucun ortasindan bilege dogru cekiliyor: fisto */
    const cx = (a.x + b.x) / 2 + (bilek.x - (a.x + b.x) / 2) * 0.26;
    const cy = (a.y + b.y) / 2 + (bilek.y - (a.y + b.y) / 2) * 0.26;
    zar += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
  }
  zar += ' Z';

  const parmaklar = uclar
    .map((u) => `<path d="M${bilek.x} ${bilek.y} L${u.x} ${u.y}"
                       stroke="${cokKoyu}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`)
    .join('');

  const kanat = `
    <g>
      <path d="${zar}" fill="url(#kn${uid})"/>
      ${parmaklar}
      <path d="M${omuz.x} ${omuz.y} L${bilek.x} ${bilek.y}"
            stroke="${cokKoyu}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M${omuz.x} ${omuz.y} L${bilek.x} ${bilek.y}"
            stroke="${boynuzAcik}" stroke-width="1.6" stroke-linecap="round"
            fill="none" opacity=".55"/>
      <!-- Bilek tirnagi -->
      <path d="M${bilek.x} ${bilek.y} q10 -7 15 -1 q-8 2 -13 6 z" fill="${boynuzAcik}"/>
      <path d="${zar}" fill="none" stroke="${boynuzKoyu}" stroke-width="1.6" opacity=".5"/>
    </g>`;

  /* --- AYAK: bacak + uc parmak + kivrik pencelar --- */
  const ayak = (cx, yon) => `
    <g transform="translate(${cx} 0)">
      <path d="M-11 12 C-14 24 -13 32 -10 36 L11 36 C14 31 14 22 11 12 Z" fill="${koyu}"/>
      <path d="M-13 34 C-15 42 -8 46 0 46 C9 46 15 42 13 34 C9 30 -9 30 -13 34 Z"
            fill="${ton(pal.dark, 0.05)}"/>
      <path d="M-13 34 C-15 42 -8 46 0 46 C4 46 8 45 10 43 C2 42 -6 39 -13 34 Z"
            fill="#000" opacity=".16"/>
      ${[-9, 0, 9].map((tx) => `
        <path d="M${tx - 3.4} 43 C${tx - 4} 48 ${tx - 2} 51 ${tx + 0.6} 51.5
                 C${tx + 3} 50 ${tx + 3.6} 46 ${tx + 3.4} 43 Z" fill="${ton(pal.dark, 0.12)}"/>
        <path d="M${tx + 0.6} 51.5 C${tx + 4} 51 ${tx + 5.6} 54 ${tx + 5} 56.5
                 C${tx + 2} 55.5 ${tx} 53.5 ${tx + 0.6} 51.5 Z" fill="${boynuzAcik}"/>`).join('')}
    </g>`;

  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <!-- Govde: ustten isik, altta golge -->
        <linearGradient id="gv${uid}g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${acik}"/>
          <stop offset="0.45" stop-color="${pal.body}"/>
          <stop offset="1" stop-color="${koyu}"/>
        </linearGradient>
        <!-- Kanat zari: dipte koyu, uca dogru biraz aciliyor -->
        <linearGradient id="kn${uid}" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stop-color="${cokKoyu}"/>
          <stop offset="0.55" stop-color="${pal.dark}"/>
          <stop offset="1" stop-color="${kanatAcik}"/>
        </linearGradient>
        <!-- Karin: yumusak, ortasi aydinlik -->
        <linearGradient id="kr${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${ton(pal.belly, -0.12)}"/>
          <stop offset="0.4" stop-color="${ton(pal.belly, 0.25)}"/>
          <stop offset="1" stop-color="${ton(pal.belly, -0.2)}"/>
        </linearGradient>
        <!-- Boynuz ve pencelerdeki keratin -->
        <linearGradient id="bn${uid}" x1="0" y1="1" x2="0.3" y2="0">
          <stop offset="0" stop-color="${boynuzKoyu}"/>
          <stop offset="0.6" stop-color="${pal.horn}"/>
          <stop offset="1" stop-color="${boynuzAcik}"/>
        </linearGradient>
        <clipPath id="gv${uid}"><path d="${GOVDE}"/></clipPath>
      </defs>

      <g transform="translate(100 116) scale(${s.toFixed(3)})">

        <!-- KANATLAR: govdenin arkasinda -->
        <g transform="scale(${wing.toFixed(3)} 1)">
          <g transform="scale(-1 1)">${kanat}</g>
          ${kanat}
        </g>

        <!-- KUYRUK
             Kanat zarinin ALTINDAN gecerek sag alta kivriliyor. Onceki
             surumde govdenin hizasindan cikip kanadi ortadan kesiyordu ve
             kanadin uzerine yapistirilmis bir boru gibi duruyordu. -->
        <path d="M12 20 C40 42 66 48 84 38 C92 33 96 26 95 20
                 L105 17 C108 28 100 42 86 48 C62 58 30 46 12 32 Z"
              fill="${pal.dark}"/>
        <path d="M95 20 L105 17 C108 28 100 42 86 48 C96 38 99 28 95 20 Z"
              fill="${cokKoyu}" opacity=".45"/>
        <!-- Kuyruk ucundaki yelken: kanat zariyla ayni dilde (membran + kemik),
             yoksa acik renk paletlerde beyaz bir kurek gibi duruyor -->
        <path d="M96 20 C103 4 115 -3 122 1 C114 8 107 18 104 29
                 C102 25 99 21 96 20 Z" fill="url(#kn${uid})"/>
        <path d="M96 20 C103 4 115 -3 122 1" fill="none" stroke="${boynuzAcik}"
              stroke-width="2.4" stroke-linecap="round"/>
        <path d="M99 14 L116 3 M101 21 L112 12" stroke="${cokKoyu}"
              stroke-width="1.6" opacity=".55" stroke-linecap="round"/>

        ${dikenler}

        <!-- BACAKLAR (govdenin arkasindan cikar) -->
        ${ayak(-19, -1)}${ayak(19, 1)}

        <!-- GOVDE -->
        <path d="${GOVDE}" fill="url(#gv${uid}g)"/>

        <!-- Yan golgeler: govde yassi bir leke gibi durmasin -->
        <path d="M-36 -4 C-38 -22 -22 -34 0 -34 C-16 -26 -25 -12 -24 6
                 C-23 20 -18 30 -12 34 C-28 31 -38 14 -36 -4 Z"
              fill="${cokKoyu}" opacity=".2"/>
        <path d="M38 -4 C40 16 26 33 0 35 C16 29 26 18 27 4
                 C28 -12 22 -26 12 -33 C28 -30 37 -18 38 -4 Z"
              fill="${cokKoyu}" opacity=".26"/>

        <!-- KARIN PLAKALARI
             Tek bir soluk yumurta yerine ust uste binen bantlar: her bandin
             alti golgeli, boylece karin duz bir leke degil kabartma duruyor.
             Daha dar tutuldu, yoksa butun govdeyi yutuyordu. -->
        <g clip-path="url(#gv${uid})">
          <path d="M-14 -8 C-5 -17 6 -17 14 -7 C20 11 13 30 0 32
                   C-13 30 -19 11 -14 -8 Z" fill="url(#kr${uid})"/>
          ${[-4, 4, 12, 20, 27].map((y, i) => {
            const w = 14 - i * 1.1;
            return `
              <path d="M${-w} ${y} Q0 ${y + 6 + i} ${w} ${y}"
                    fill="none" stroke="${ton(pal.belly, -0.34)}"
                    stroke-width="1.8" opacity=".5" stroke-linecap="round"/>
              <path d="M${-w + 1} ${y - 1.4} Q0 ${y + 4 + i} ${w - 1} ${y - 1.4}"
                    fill="none" stroke="${ton(pal.belly, 0.45)}"
                    stroke-width="1" opacity=".45" stroke-linecap="round"/>`;
          }).join('')}
        </g>

        <!-- Renge ozel desen -->
        ${desen(pal, uid)}

        <!-- Rim light: sag ust kenarda ince isik -->
        <g clip-path="url(#gv${uid})">
          <path d="M6 -34 C26 -32 39 -20 40 -2" fill="none"
                stroke="${ton(pal.body, 0.55)}" stroke-width="2.6" opacity=".5"/>
        </g>

        <!-- BOYUN: govde ile bas arasinda kalir, ayri bir yaka gibi
             gorunmesin diye ustune acik renk konmuyor -->
        <path d="M-15 -24 C-17 -38 -14 -48 -11 -52 L11 -52 C14 -48 17 -38 15 -24 Z"
              fill="${koyu}"/>
        <path d="M11 -52 C14 -48 17 -38 15 -24 L8 -24 C10 -38 9 -46 6 -52 Z"
              fill="${cokKoyu}" opacity=".35"/>

        ${basParcalari(pal, look, mood, horn, uid)}
      </g>
    </svg>`;
}
