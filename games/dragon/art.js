
import { palet, HEADS, FACES } from './data.js?v88';
import { CONFIG, growthRatio } from './config.js?v88';

let uidSayaci = 0;

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

const GOVDE = `M-36 -4
  C-38 -22 -22 -34 0 -34
  C22 -34 38 -22 38 -4
  C40 16 26 33 0 35
  C-26 33 -40 14 -36 -4 Z`;

export const KAFA = {
  alin: -80, kas: -70, goz: -62, gozX: 16,
  burunUst: -50, burun: -42, agiz: -37, cene: -33,
};

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
    return `${goz(-1)}${goz(1)}
      <path d="M-27 -64 C-20 -68 -10 -67 -7 -61 L-27 -61 Z" fill="${ton(pal.body, -0.18)}"/>
      <path d="M27 -64 C20 -68 10 -67 7 -61 L27 -61 Z" fill="${ton(pal.body, -0.18)}"/>`;
  }
  return `${goz(-1)}${goz(1)}`;
}

export const HEAD_BOX = {
  tiny:      '-15 -24 30 28',
  simple:    '-18 -27 36 31',
  points:    '-20 -30 40 34',
  jewel:     '-23 -40 46 44',
  flame:     '-24 -44 48 48',
  ice:       '-28 -48 56 52',
  king:      '-38 -46 76 50',
  celestial: '-42 -52 84 56',
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

  if (c.kind === 'tiny') {
    ic = `
      ${bant(12, 4)}
      <path d="M-6 -2 L0 -13 L6 -2 Z" fill="${metal}" stroke="${c.edge}" stroke-width="1.2"/>
      ${tas(0, -15, 2.2, c.gem)}`;

  } else if (c.kind === 'simple') {
    ic = `
      ${bant(15, 5)}
      <path d="M-15 -3 L-10 -15 L-5 -7 L0 -18 L5 -7 L10 -15 L15 -3 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      ${tas(0, -20, 2.6, c.gem)}`;

  } else if (c.kind === 'points') {
    const uclar = [[-16, -15], [-8, -18], [0, -24], [8, -18], [16, -15]];
    ic = `
      ${bant(18, 6)}
      <path d="M-18 -4 L-16 -15 L-11 -8 L-8 -18 L-4 -9 L0 -24
               L4 -9 L8 -18 L11 -8 L16 -15 L18 -4 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.4" stroke-linejoin="round"/>
      ${uclar.map(([x, y]) => tas(x, y - 3, 2.2, c.gem)).join('')}`;

  } else if (c.kind === 'jewel') {
    ic = `
      ${bant(20, 7)}
      <path d="M-20 -5 L-16 -20 L-10 -11 L0 -30 L10 -11 L16 -20 L20 -5 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M0 -37 l5.5 6.5 l-5.5 7.5 l-5.5 -7.5 z" fill="${c.gem}"/>
      <path d="M0 -37 l5.5 6.5 l-5.5 1.5 z" fill="#fff" opacity=".5"/>
      ${tas(-16, -23, 2.8, c.gem)}${tas(16, -23, 2.8, c.gem)}
      ${tas(0, -2, 2.4, c.gem)}`;

  } else if (c.kind === 'flame') {
    const alev = (x, y, b) => `
      <path d="M${x} ${y} C${x + b} ${y - b} ${x + b * 0.6} ${y - b * 2} ${x} ${y - b * 2.8}
               C${x - b * 0.6} ${y - b * 2} ${x - b} ${y - b} ${x} ${y} Z" fill="${c.gem}"/>
      <path d="M${x} ${y - b * 0.5} C${x + b * 0.5} ${y - b} ${x + b * 0.3} ${y - b * 1.6} ${x} ${y - b * 2}
               C${x - b * 0.3} ${y - b * 1.6} ${x - b * 0.5} ${y - b} ${x} ${y - b * 0.5} Z"
            fill="#ffe066" opacity=".9"/>`;
    ic = `
      ${bant(21, 7)}
      <path d="M-21 -5 L-16 -18 L-8 -10 L0 -24 L8 -10 L16 -18 L21 -5 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>
      ${alev(0, -24, 6)}${alev(-16, -18, 4)}${alev(16, -18, 4)}`;

  } else if (c.kind === 'ice') {
    const kristal = (x, y, h) => `
      <path d="M${x} ${y - h} L${x + 5} ${y - h * 0.35} L${x + 3} ${y} L${x - 3} ${y}
               L${x - 5} ${y - h * 0.35} Z" fill="${c.metal}" opacity=".92"/>
      <path d="M${x} ${y - h} L${x + 5} ${y - h * 0.35} L${x} ${y - h * 0.3} Z"
            fill="#fff" opacity=".7"/>`;
    ic = `
      ${bant(23, 7)}
      ${kristal(-17, -4, 16)}${kristal(-7, -4, 24)}${kristal(3, -4, 30)}
      ${kristal(13, -4, 22)}${kristal(21, -4, 14)}
      <circle cx="3" cy="-36" r="3" fill="#fff" opacity=".85"/>`;

  } else if (c.kind === 'king') {
    ic = `
      <path d="M-36 -10 q13 -6 20 6 l-4 7 q-9 -9 -16 -5z
               M36 -10 q-13 -6 -20 6 l4 7 q9 -9 16 -5z"
            fill="${metal}" opacity=".9"/>
      <path d="M-28 -22 q-6 -11 2 -18 q2 9 8 13z
               M28 -22 q6 -11 -2 -18 q-2 9 -8 13z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.2"/>
      ${bant(24, 9)}
      <path d="M-24 -7 L-19 -25 L-13 -13 L-7 -33 L0 -25 L7 -33 L13 -13 L19 -25 L24 -7 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M0 -42 l6 7 l-6 8 l-6 -8 z" fill="${c.gem}"/>
      <path d="M0 -42 l6 7 l-6 2 z" fill="#fff" opacity=".5"/>
      ${tas(-19, -28, 3, c.gem)}${tas(19, -28, 3, c.gem)}
      <path d="M-18 -2 h36" stroke="${c.gem}" stroke-width="1.6" opacity=".65"/>`;

  } else {
    ic = `
      <ellipse cx="0" cy="-30" rx="40" ry="13" fill="none" stroke="${c.gem}"
               stroke-width="2.4" opacity=".55" stroke-dasharray="8 6"/>
      <path d="M-40 -12 q15 -8 23 5 l-4 8 q-11 -10 -19 -6z
               M40 -12 q-15 -8 -23 5 l4 8 q11 -10 19 -6z"
            fill="${metal}" opacity=".9"/>
      ${bant(26, 9)}
      <path d="M-26 -7 L-20 -28 L-13 -15 L-7 -38 L0 -30 L7 -38 L13 -15 L20 -28 L26 -7 Z"
            fill="${metal}" stroke="${c.edge}" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="0" cy="-46" r="9" fill="${c.gem}" opacity=".3"/>
      <path d="M0 -46 C1.6 -39 3.4 -37.4 10 -36 C3.4 -34.6 1.6 -33 0 -26
               C-1.6 -33 -3.4 -34.6 -10 -36 C-3.4 -37.4 -1.6 -39 0 -46 Z" fill="#fff"/>
      ${tas(-20, -31, 3.2, c.gem)}${tas(20, -31, 3.2, c.gem)}
      <circle cx="-32" cy="-24" r="2.2" fill="#fff" opacity=".8"/>
      <circle cx="32" cy="-24" r="2.2" fill="#fff" opacity=".8"/>
      <path d="M-19 -2 h38" stroke="${c.gem}" stroke-width="1.8" opacity=".7"/>`;
  }

  return `${defs}<g transform="translate(0 ${headTop})">${ic}</g>`;
}

export const FACE_BOX = '-34 -94 68 46';

export function faceSvg(key) {
  const f = FACES[key];
  if (!f || key === 'none' || !f.kind) return '';
  const c = f.color;

  if (f.kind === 'scar') {
    return `
      <path d="M18 -76 C20 -68 21 -60 21.5 -53" fill="none" stroke="${c}"
            stroke-width="2.8" stroke-linecap="round" opacity=".95"/>
      <path d="M15 -68 h7.5 M16.5 -60 h7.5" stroke="${c}" stroke-width="2"
            stroke-linecap="round" opacity=".8"/>`;
  }

  if (f.kind === 'twinScar') {
    return `
      <path d="M15 -78 C18 -70 20 -62 21 -55" fill="none" stroke="${c}"
            stroke-width="2.8" stroke-linecap="round" opacity=".95"/>
      <path d="M25 -71 C21 -65 17 -60 13 -56" fill="none" stroke="${c}"
            stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
      <path d="M-18 -74 C-20 -66 -21 -59 -22 -53" fill="none" stroke="${c}"
            stroke-width="2.2" stroke-linecap="round" opacity=".75"/>`;
  }

  if (f.kind === 'paint') {
    const yan = (yon) => `
      <g transform="scale(${yon} 1)">
        <path d="M11 -58 l6 -3 l-1.5 6.5 l6 -2 l-2 6.5" fill="none" stroke="${c}"
              stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>
      </g>`;
    return yan(1) + yan(-1);
  }

  if (f.kind === 'darkMark') {
    const yan = (yon) => `
      <g transform="scale(${yon} 1)">
        <path d="M6 -66 C12 -73 22 -72 26 -63 C22 -56 10 -57 6 -62 Z"
              fill="${c}" opacity=".5"/>
        <path d="M20 -53 l-3 7" stroke="${c}" stroke-width="2.4"
              stroke-linecap="round" opacity=".7"/>
      </g>`;
    return yan(1) + yan(-1);
  }

  if (f.kind === 'flame') {
    const yan = (yon) => `
      <g transform="scale(${yon} 1)">
        <path d="M13 -46 C19 -52 21 -60 18 -68
                 C24 -62 25 -51 20 -44 C17 -42 14 -43.5 13 -46 Z"
              fill="${c}" opacity=".92"/>
        <path d="M15 -48 C18.5 -53 19.5 -57 18 -61 C21.5 -56 21 -50 18 -46 Z"
              fill="#ffe066" opacity=".8"/>
      </g>`;
    return yan(1) + yan(-1);
  }

  if (f.kind === 'rune') {
    return `
      <circle cx="0" cy="-78" r="10" fill="${c}" opacity=".22"/>
      <path d="M0 -85 v13 M-5 -81 h10 M0 -72 l4 6 h-8 z" fill="none" stroke="${c}"
            stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-25 -58 l4 4 M25 -58 l-4 4" stroke="${c}" stroke-width="2"
            stroke-linecap="round" opacity=".7"/>`;
  }

  if (f.kind === 'demon') {
    const yan = (yon) => `
      <g transform="scale(${yon} 1)">
        <path d="M9 -74 L25 -77 L22 -69 L26 -67 L11 -61 Z" fill="${c}" opacity=".9"/>
        <path d="M12 -55 L23 -52 L17 -46 Z" fill="${c}" opacity=".75"/>
        <path d="M6 -44 L13 -42 L9 -38 Z" fill="${c}" opacity=".6"/>
      </g>`;
    return `${yan(1)}${yan(-1)}
      <path d="M0 -86 L4 -77 L0 -73 L-4 -77 Z" fill="${c}" opacity=".9"/>`;
  }

  return `
    <circle cx="0" cy="-79" r="12" fill="${c}" opacity=".22"/>
    <path d="M0 -89 C2 -81 4 -79 12 -77 C4 -75 2 -73 0 -65
             C-2 -73 -4 -75 -12 -77 C-4 -79 -2 -81 0 -89 Z" fill="${c}"/>
    <path d="M-29 -69 C-23 -75 -12 -74 -8 -67" fill="none" stroke="${c}"
          stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
    <path d="M29 -69 C23 -75 12 -74 8 -67" fill="none" stroke="${c}"
          stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
    <path d="M-21 -54 l-3 8 M21 -54 l3 8" stroke="${c}" stroke-width="2.2"
          stroke-linecap="round" opacity=".8"/>
    <circle cx="-24" cy="-45" r="2" fill="${c}"/>
    <circle cx="24" cy="-45" r="2" fill="${c}"/>`;
}

function desen(pal, uid) {
  if (!pal.pattern) return '';
  const ink = pal.ink || pal.dark;
  const koyu = ton(pal.body, -0.32);
  const acik = ton(ink, 0.4);
  let icerik = '';

  if (pal.pattern === 'stripes') {
    for (let i = 0; i < 5; i++) {
      const y = -24 + i * 13;
      icerik += `<path d="M-44 ${y} Q0 ${y + 5} 44 ${y}" fill="none"
                       stroke="${koyu}" stroke-width="5" opacity=".3"/>`;
    }

  } else if (pal.pattern === 'flame') {
    const alev = (x, y, b) => `
      <path d="M${x} ${y} C${x + b} ${y - b} ${x + b * 0.6} ${y - b * 2} ${x} ${y - b * 2.6}
               C${x - b * 0.6} ${y - b * 2} ${x - b} ${y - b} ${x} ${y} Z"
            fill="${ink}" opacity=".8"/>
      <path d="M${x} ${y - b * 0.4} C${x + b * 0.5} ${y - b} ${x + b * 0.3} ${y - b * 1.5} ${x} ${y - b * 1.9}
               C${x - b * 0.3} ${y - b * 1.5} ${x - b * 0.5} ${y - b} ${x} ${y - b * 0.4} Z"
            fill="#fff6d8" opacity=".55"/>`;
    icerik = alev(-20, 24, 7) + alev(4, 30, 9) + alev(24, 20, 6) + alev(-6, 6, 6);

  } else if (pal.pattern === 'tribal') {
    for (let sira = 0; sira < 6; sira++) {
      const y = -26 + sira * 11;
      const kaydir = sira % 2 ? 7 : 0;
      for (let x = -44 + kaydir; x <= 44; x += 14) {
        icerik += `
          <path d="M${x} ${y} L${x + 7} ${y + 8} L${x + 14} ${y}" fill="none"
                stroke="${koyu}" stroke-width="2.4" opacity=".42" stroke-linejoin="round"/>
          <path d="M${x + 2} ${y - 1} L${x + 7} ${y + 5} L${x + 12} ${y - 1}" fill="none"
                stroke="${acik}" stroke-width="1.1" opacity=".35" stroke-linejoin="round"/>`;
      }
    }

  } else if (pal.pattern === 'lightning') {
    const yol = `M-22 -30 L-12 -10 L-20 -6 L-8 14 L-16 18 L-6 34
                 M18 -32 L8 -14 L16 -10 L4 8 L12 12 L2 30
                 M-2 -18 L4 -6 L-2 -2 L4 10`;
    icerik = `
      <path d="${yol}" fill="none" stroke="${koyu}" stroke-width="5.5" opacity=".4"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${yol}" fill="none" stroke="${ink}" stroke-width="2.4" opacity=".95"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${yol}" fill="none" stroke="#fff" stroke-width="0.9" opacity=".7"
            stroke-linecap="round"/>`;

  } else if (pal.pattern === 'runes') {
    const runler = `M-31 -22 v9 M-35 -18 h8 M-31 -13 l4 5
                    M29 -20 v10 M25 -20 l8 5 l-8 5
                    M-29 15 l5 -8 l5 8 M-27 12 h6
                    M27 13 v10 M23 13 h8 M27 18 h5
                    M0 -13 v7 M-4 -9 h8 M0 -6 l4 6 l-8 0 z`;
    icerik = `
      <circle cx="0" cy="-1" r="22" fill="none" stroke="${koyu}" stroke-width="4" opacity=".35"/>
      <circle cx="0" cy="-1" r="22" fill="none" stroke="${ink}" stroke-width="1.8" opacity=".8"/>
      <circle cx="0" cy="-1" r="14.5" fill="none" stroke="${ink}" stroke-width="1.1" opacity=".45"/>
      <path d="${runler}" fill="none" stroke="${koyu}" stroke-width="4" opacity=".4"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${runler}" fill="none" stroke="${ink}" stroke-width="2.1" opacity=".95"
            stroke-linecap="round" stroke-linejoin="round"/>`;

  } else if (pal.pattern === 'armor') {
    for (let i = 0; i < 4; i++) {
      const y = -20 + i * 14;
      icerik += `
        <path d="M-42 ${y} q42 -13 84 0" fill="none" stroke="${koyu}"
              stroke-width="5" opacity=".42"/>
        <path d="M-42 ${y - 1.8} q42 -13 84 0" fill="none" stroke="${ink}"
              stroke-width="2.2" opacity=".8"/>`;
    }
    icerik += `
      <path d="M-23 -32 v66 M23 -32 v66" stroke="${koyu}" stroke-width="2.6" opacity=".3"/>
      <path d="M-35 -25 l6 -6 l6 6 l-6 6 z M29 -21 l5.5 -5.5 l5.5 5.5 l-5.5 5.5 z
               M-33 17 l5.5 -5.5 l5.5 5.5 l-5.5 5.5 z M27 19 l6 -6 l6 6 l-6 6 z"
            fill="${ink}" opacity=".85"/>`;

  } else if (pal.pattern === 'cosmic') {
    icerik = `
      <ellipse cx="-4" cy="0" rx="40" ry="26" fill="${ink}" opacity=".16"
               transform="rotate(-18 -4 0)"/>
      <ellipse cx="-4" cy="0" rx="26" ry="15" fill="${acik}" opacity=".14"
               transform="rotate(-18 -4 0)"/>`;
    const noktalar = [[-30, -18, 2.2], [-16, -26, 1.4], [-8, -6, 2.6], [6, -20, 1.6],
                      [18, -8, 2.2], [28, 6, 1.5], [12, 14, 2.4], [-22, 8, 1.8],
                      [-6, 24, 2], [20, 26, 1.4], [-32, 18, 1.6], [2, -32, 1.5]];
    for (const [x, y, r] of noktalar) {
      icerik += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".85"/>
                 <circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="${ink}" opacity=".25"/>`;
    }

  } else if (pal.pattern === 'celestial') {
    const glif = (x, y, s2) => `
      <g transform="translate(${x} ${y}) scale(${s2})">
        <path d="M0 -9 L7 0 L0 9 L-7 0 Z" fill="none" stroke="${ink}" stroke-width="2"/>
        <path d="M0 -4.5 L3.5 0 L0 4.5 L-3.5 0 Z" fill="${ink}" opacity=".8"/>
      </g>`;
    icerik = `
      <circle cx="0" cy="-2" r="26" fill="none" stroke="${ink}" stroke-width="5" opacity=".22"/>
      <circle cx="0" cy="-2" r="26" fill="none" stroke="${ink}" stroke-width="1.6" opacity=".75"
              stroke-dasharray="7 5"/>
      <circle cx="0" cy="-2" r="17" fill="none" stroke="${ink}" stroke-width="1.2" opacity=".55"
              stroke-dasharray="4 6"/>
      <circle cx="0" cy="-2" r="9" fill="${ink}" opacity=".18"/>
      ${glif(0, -2, 1.15)}${glif(-27, -18, 0.7)}${glif(27, -14, 0.7)}
      ${glif(-24, 18, 0.62)}${glif(25, 20, 0.62)}
      <path d="M-40 -6 h12 M28 -6 h12 M-14 30 h28" stroke="${ink}"
            stroke-width="1.6" opacity=".5" stroke-linecap="round"/>`;
  }

  return `<g clip-path="url(#gv${uid})">${icerik}</g>`;
}

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

function basParcalari(pal, look, mood, hornOlcek, uid) {
  const acik = ton(pal.body, 0.24);
  const koyu = ton(pal.body, -0.26);
  const cokKoyu = ton(pal.dark, -0.2);
  const boynuzAcik = ton(pal.horn, 0.4);
  const boynuzKoyu = ton(pal.horn, -0.32);

  const boynuz = (yon) => `
    <g transform="scale(${yon} 1)">
      <!-- Ana govde: genis taban, sivri uc -->
      <path d="M-14 -84
               C-22 -86 -30 -94 -36 -108
               C-39 -116 -40 -122 -38 -126
               C-34 -124 -30 -118 -27 -110
               C-23 -100 -18 -92 -10 -88 Z"
            fill="url(#bn${uid})"/>
      <!-- Alt yuz golgesi: boynuz yassi durmasin -->
      <path d="M-14 -84
               C-22 -86 -30 -94 -36 -108
               C-39 -116 -40 -122 -38 -126
               C-36 -118 -32 -108 -26 -99
               C-22 -92 -18 -87 -12 -85 Z"
            fill="${boynuzKoyu}" opacity=".45"/>
      <!-- Boyum halkalari -->
      <path d="M-17 -87.5 C-15 -90 -13 -91.5 -11.5 -92"
            stroke="${boynuzKoyu}" stroke-width="1.5" fill="none" opacity=".6" stroke-linecap="round"/>
      <path d="M-23 -93 C-21 -96 -19 -98 -17.5 -99"
            stroke="${boynuzKoyu}" stroke-width="1.4" fill="none" opacity=".55" stroke-linecap="round"/>
      <path d="M-29 -102 C-28 -105 -26 -107 -25 -108"
            stroke="${boynuzKoyu}" stroke-width="1.2" fill="none" opacity=".5" stroke-linecap="round"/>
      <!-- Tabandaki isik: boynuz kafadan cikiyormus gibi otursun -->
      <path d="M-14 -84 C-18 -85 -21 -87 -23 -89 C-19 -88 -16 -86 -13 -85 Z"
            fill="${boynuzAcik}" opacity=".7"/>
    </g>`;

  return `
        <!-- BOYUN: govde ile bas arasinda kalir, ayri bir yaka gibi
             gorunmesin diye ustune acik renk konmuyor -->
        <path d="M-15 -24 C-17 -38 -14 -48 -11 -52 L11 -52 C14 -48 17 -38 15 -24 Z"
              fill="${koyu}"/>
        <path d="M11 -52 C14 -48 17 -38 15 -24 L8 -24 C10 -38 9 -46 6 -52 Z"
              fill="${cokKoyu}" opacity=".35"/>

        <!-- BOYNUZLAR: buyume tabanlarindan olcekleniyor, boy ve kalinlik
             birlikte artiyor -->
        <g transform="translate(0 -80) scale(${hornOlcek.toFixed(3)}) translate(0 80)">
          ${boynuz(-1)}${boynuz(1)}
        </g>

        <!-- BAS
             Genis alin, belirgin yanaklar, one dogru cikan bir burun bolgesi
             ve altta toplanan cene. Onceki surumde kafa duz bir damla gibiydi;
             burun ayri bir kutle olarak cikinca surungen hatti oturuyor. -->
        <path d="M-29 -64
                 C-31 -80 -20 -91 0 -91
                 C20 -91 31 -80 29 -64
                 C28 -56 25 -50 20 -46
                 C17 -38 10 -33 0 -33
                 C-10 -33 -17 -38 -20 -46
                 C-25 -50 -28 -56 -29 -64 Z"
              fill="url(#gv${uid}g)"/>

        <!-- Yanak golgesi: kafa yassi durmasin -->
        <path d="M29 -64 C28 -56 25 -50 20 -46 C17 -38 10 -33 0 -33
                 C10 -38 16 -45 18 -56 C20 -70 15 -84 6 -89
                 C20 -87 30 -78 29 -64 Z" fill="${cokKoyu}" opacity=".24"/>

        <!-- Alin isigi -->
        <path d="M-14 -85 C-6 -89 6 -89 14 -85 C6 -81 -6 -81 -14 -85 Z"
              fill="${ton(pal.body, 0.5)}" opacity=".45"/>

        <!-- KAS CIKINTISI: gozlerin uzerinde kalin bir kemer, sert bakis -->
        <path d="M-28 -71 C-21 -75 -12 -73 -8 -67" fill="none" stroke="${cokKoyu}"
              stroke-width="5" stroke-linecap="round" opacity=".8"/>
        <path d="M28 -71 C21 -75 12 -73 8 -67" fill="none" stroke="${cokKoyu}"
              stroke-width="5" stroke-linecap="round" opacity=".8"/>

        ${gozler(mood, pal)}

        <!-- BURUN KUTLESI
             Yuzden ONE cikan ayri bir hacim: ustu isikli, alti golgeli.
             Kafanin geri kalanindan bir tik acik ki one cikmis gorunsun. -->
        <path d="M-15 -52
                 C-15 -43 -11 -35 0 -35
                 C11 -35 15 -43 15 -52
                 C10 -55 -10 -55 -15 -52 Z"
              fill="${acik}" opacity=".55"/>
        <path d="M-15 -52 C-10 -55 10 -55 15 -52 C10 -53.5 -10 -53.5 -15 -52 Z"
              fill="${ton(pal.body, 0.6)}" opacity=".5"/>
        <path d="M15 -52 C15 -43 11 -35 0 -35 C7 -38 11 -44 12 -52 Z"
              fill="${cokKoyu}" opacity=".25"/>

        <!-- Burun delikleri: burun kutlesinin ust yarisinda -->
        <path d="M-6 -47.5 C-6.6 -44.5 -5 -43 -3.8 -43.8 C-4.2 -45.8 -5.1 -47.2 -6 -47.5 Z
                 M6 -47.5 C6.6 -44.5 5 -43 3.8 -43.8 C4.2 -45.8 5.1 -47.2 6 -47.5 Z"
              fill="#150f1d" opacity=".85"/>

        <!-- AGIZ: cene hattini takip eden cizgi, ustunden iki fildisi sarkiyor -->
        <path d="M-13 -39 C-7 -34 7 -34 13 -39" fill="none" stroke="#150f1d"
              stroke-width="2" stroke-linecap="round" opacity=".75"/>
        <path d="M-7.4 -36.4 C-6.6 -33 -5.6 -31.6 -4.6 -31.4
                 C-4 -33.6 -4.2 -35.6 -4.6 -37.2 Z
                 M7.4 -36.4 C6.6 -33 5.6 -31.6 4.6 -31.4
                 C4 -33.6 4.2 -35.6 4.6 -37.2 Z"
              fill="#fff" opacity=".92"/>

        <!-- CENE ALTI: kucuk bir golge, kafa govdeye yapisik durmasin -->
        <path d="M-11 -34 C-5 -31 5 -31 11 -34 C6 -30 -6 -30 -11 -34 Z"
              fill="${cokKoyu}" opacity=".3"/>

        ${faceSvg(look.face)}
        ${headSvg(look.head, -89)}`;
}

const KANAT_UCLARI = {
  4: [[120, -26], [102, 14], [72, 34], [42, 28]],
  5: [[124, -30], [112, 4], [92, 26], [66, 38], [40, 30]],
};

function kanatSvg(w, pal, uid, t) {
  const span = w.span ?? 0.9;
  const bilek = { x: 98 * span, y: -80 - (span - 0.86) * 26 };
  const omuz = { x: 15, y: -28 };
  const kenarRenk = w.kenar || t.boynuzAcik;

  const uclar = (KANAT_UCLARI[w.parmak] || KANAT_UCLARI[4])
    .map(([x, y]) => ({ x: x * span, y: y * (1 + (span - 0.9) * 0.5) }));

  const fisto = (derinlik) => {
    let d = `M${omuz.x} ${omuz.y} L${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)}
             L${uclar[0].x.toFixed(1)} ${uclar[0].y.toFixed(1)}`;
    for (let i = 1; i < uclar.length; i++) {
      const a = uclar[i - 1];
      const b = uclar[i];
      const cx = (a.x + b.x) / 2 + (bilek.x - (a.x + b.x) / 2) * derinlik;
      const cy = (a.y + b.y) / 2 + (bilek.y - (a.y + b.y) / 2) * derinlik;
      d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    return `${d} Z`;
  };

  const parmakKemikleri = (kalinlik = 3.4) => uclar
    .map((u) => `<path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)} L${u.x.toFixed(1)} ${u.y.toFixed(1)}"
                       stroke="${t.cokKoyu}" stroke-width="${kalinlik}"
                       stroke-linecap="round" fill="none"/>`).join('');

  const kolKemigi = `
    <path d="M${omuz.x} ${omuz.y} L${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)}"
          stroke="${t.cokKoyu}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M${omuz.x} ${omuz.y} L${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)}"
          stroke="${kenarRenk}" stroke-width="1.6" stroke-linecap="round"
          fill="none" opacity=".55"/>`;

  const bilekTirnagi = `
    <path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)} q10 -7 15 -1 q-8 2 -13 6 z"
          fill="${kenarRenk}"/>`;

  if (w.kind === 'phoenix') {
    const tuyler = uclar.map((u, i) => {
      const p = i / (uclar.length - 1);
      const genislik = 15 - p * 4;
      const orta = {
        x: bilek.x + (u.x - bilek.x) * 0.55,
        y: bilek.y + (u.y - bilek.y) * 0.55,
      };
      const renk = i % 2 ? '#e8571f' : '#f2884b';
      return `
        <path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)}
                 Q${(orta.x + genislik).toFixed(1)} ${(orta.y - genislik * 0.5).toFixed(1)}
                  ${u.x.toFixed(1)} ${u.y.toFixed(1)}
                 Q${(orta.x - genislik * 0.4).toFixed(1)} ${(orta.y + genislik).toFixed(1)}
                  ${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)} Z"
              fill="${renk}" opacity=".95"/>
        <path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)} L${u.x.toFixed(1)} ${u.y.toFixed(1)}"
              stroke="#ffd76e" stroke-width="1.4" opacity=".7"/>`;
    }).join('');
    return `<g>
      <path d="${fisto(0.3)}" fill="#a8321a" opacity=".55"/>
      ${tuyler}${kolKemigi}
      <path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)} q12 -8 18 -1 q-9 2 -15 7 z" fill="#ffd76e"/>
    </g>`;
  }

  if (w.kind === 'crystal') {
    let kirik = `M${omuz.x} ${omuz.y} L${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)}`;
    for (const u of uclar) kirik += ` L${u.x.toFixed(1)} ${u.y.toFixed(1)}`;
    kirik += ' Z';
    return `<g>
      <path d="${kirik}" fill="url(#kn${uid})" opacity=".78"/>
      <path d="${kirik}" fill="none" stroke="${kenarRenk}" stroke-width="2.4" opacity=".9"/>
      ${uclar.map((u) => `
        <path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)} L${u.x.toFixed(1)} ${u.y.toFixed(1)}"
              stroke="${kenarRenk}" stroke-width="1.6" opacity=".55"/>`).join('')}
      ${kolKemigi}
      <path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)} l14 -10 l-3 9 l-9 4 z" fill="${kenarRenk}"/>
    </g>`;
  }

  const derin = w.kind === 'demon' ? 0.34 : 0.26;
  const zar = fisto(derin);

  let sus = '';

  if (w.kind === 'flame') {
    sus = uclar.slice(0, -1).map((u, i) => {
      const b = uclar[i + 1];
      const mx = (u.x + b.x) / 2;
      const my = (u.y + b.y) / 2;
      return `<path d="M${mx.toFixed(1)} ${my.toFixed(1)}
                       q${6} ${8} ${1} ${14} q${-8} ${-4} ${-1} ${-14} z"
                    fill="${kenarRenk}" opacity=".85"/>`;
    }).join('');

  } else if (w.kind === 'demon') {
    sus = uclar.map((u) => `
      <path d="M${u.x.toFixed(1)} ${u.y.toFixed(1)} q7 -2 10 4 q-6 -1 -10 -1 z"
            fill="${t.boynuzAcik}"/>`).join('');

  } else if (w.kind === 'lightning') {
    sus = uclar.map((u) => {
      const mx = bilek.x + (u.x - bilek.x) * 0.5;
      const my = bilek.y + (u.y - bilek.y) * 0.5;
      return `<path d="M${bilek.x.toFixed(1)} ${bilek.y.toFixed(1)}
                       L${(mx + 6).toFixed(1)} ${my.toFixed(1)}
                       L${(mx - 4).toFixed(1)} ${(my + 7).toFixed(1)}
                       L${u.x.toFixed(1)} ${u.y.toFixed(1)}"
                    fill="none" stroke="${kenarRenk}" stroke-width="1.8" opacity=".85"/>`;
    }).join('');

  } else if (w.kind === 'king') {
    sus = `
      <path d="M${(omuz.x + 8)} ${(omuz.y - 4)} L${(bilek.x * 0.6).toFixed(1)} ${(bilek.y * 0.72).toFixed(1)}"
            stroke="${kenarRenk}" stroke-width="7" stroke-linecap="round" opacity=".9"/>
      ${uclar.map((u) => `<circle cx="${u.x.toFixed(1)}" cy="${u.y.toFixed(1)}" r="3.6"
                                  fill="${kenarRenk}"/>`).join('')}`;

  } else if (w.kind === 'celestial') {
    sus = `
      <path d="${zar}" fill="none" stroke="${kenarRenk}" stroke-width="3.4" opacity=".85"/>
      ${uclar.map((u, i) => `
        <circle cx="${(bilek.x + (u.x - bilek.x) * (0.4 + i * 0.12)).toFixed(1)}"
                cy="${(bilek.y + (u.y - bilek.y) * (0.4 + i * 0.12)).toFixed(1)}"
                r="${(2.6 - i * 0.3).toFixed(1)}" fill="#fff" opacity=".8"/>`).join('')}`;
  }

  return `<g>
    <path d="${zar}" fill="url(#kn${uid})"${w.kind === 'celestial' ? ' opacity=".82"' : ''}/>
    ${parmakKemikleri(w.kind === 'demon' ? 4 : 3.4)}
    ${kolKemigi}
    ${bilekTirnagi}
    <path d="${zar}" fill="none" stroke="${t.boynuzKoyu}" stroke-width="1.6" opacity=".5"/>
    ${sus}
  </g>`;
}

const KUYRUK_GOVDE = `M12 20 C40 42 66 48 84 38 C92 33 96 26 95 20
                      L105 17 C108 28 100 42 86 48 C62 58 30 46 12 32 Z`;

const KUYRUK_NOKTA = [[30, 30], [46, 38], [62, 42], [77, 41], [89, 34]];

function kuyrukSvg(k, pal, uid, t) {
  const kenarRenk = k.kenar || t.boynuzAcik;

  const govde = `
    <path d="${KUYRUK_GOVDE}" fill="${pal.dark}"/>
    <path d="M95 20 L105 17 C108 28 100 42 86 48 C96 38 99 28 95 20 Z"
          fill="${t.cokKoyu}" opacity=".45"/>`;

  const yelken = `
    <path d="M96 20 C103 4 115 -3 122 1 C114 8 107 18 104 29
             C102 25 99 21 96 20 Z" fill="url(#kn${uid})"/>
    <path d="M96 20 C103 4 115 -3 122 1" fill="none" stroke="${kenarRenk}"
          stroke-width="2.4" stroke-linecap="round"/>
    <path d="M99 14 L116 3 M101 21 L112 12" stroke="${t.cokKoyu}"
          stroke-width="1.6" opacity=".55" stroke-linecap="round"/>`;

  if (k.kind === 'spiked') {
    const dikenler = KUYRUK_NOKTA.map(([x, y]) => `
      <path d="M${x - 4} ${y} L${x} ${y - 11} L${x + 4} ${y} Z" fill="${t.boynuzKoyu}"/>
      <path d="M${x - 4} ${y} L${x} ${y - 11} L${x} ${y} Z" fill="${t.boynuzAcik}"/>`).join('');
    return `<g>${dikenler}${govde}${yelken}</g>`;
  }

  if (k.kind === 'flame') {
    return `<g>${govde}
      <path d="M96 20 C104 2 118 -6 126 -2 C116 6 108 16 105 30
               C103 25 99 21 96 20 Z" fill="${kenarRenk}"/>
      <path d="M100 17 C106 6 115 0 120 1 C112 8 106 16 104 25 Z"
            fill="#ffe066" opacity=".85"/>
      ${KUYRUK_NOKTA.slice(2).map(([x, y]) => `
        <path d="M${x} ${y - 2} q4 -7 0 -12 q-4 5 0 12 z" fill="${kenarRenk}" opacity=".8"/>`).join('')}
    </g>`;
  }

  if (k.kind === 'crystal') {
    const sivri = KUYRUK_NOKTA.map(([x, y], i) => `
      <path d="M${x - 3.5} ${y} L${x + (i % 2 ? 2 : -2)} ${y - 13} L${x + 3.5} ${y} Z"
            fill="${kenarRenk}" opacity=".9"/>`).join('');
    return `<g>${sivri}${govde}
      <path d="M96 20 L112 -6 L120 4 L106 30 Z" fill="${kenarRenk}" opacity=".8"/>
      <path d="M96 20 L112 -6 L120 4 L106 30 Z" fill="none" stroke="#fff"
            stroke-width="1.2" opacity=".55"/>
    </g>`;
  }

  if (k.kind === 'demon') {
    return `<g>
      ${KUYRUK_NOKTA.map(([x, y]) => `
        <path d="M${x - 5} ${y} L${x} ${y - 14} L${x + 5} ${y} Z" fill="${t.boynuzKoyu}"/>`).join('')}
      ${govde}
      <!-- Zipkin uc -->
      <path d="M94 22 L124 -8 L118 8 L128 6 L102 34 L106 20 Z" fill="${t.cokKoyu}"/>
      <path d="M94 22 L124 -8 L118 8 L110 10 Z" fill="${t.boynuzKoyu}" opacity=".8"/>
    </g>`;
  }

  if (k.kind === 'lightning') {
    return `<g>${govde}
      <path d="M20 26 L38 30 L30 36 L54 40 L44 44 L72 44 L62 40 L88 38"
            fill="none" stroke="${kenarRenk}" stroke-width="2.2" opacity=".9"
            stroke-linejoin="round"/>
      <path d="M96 20 L118 -6 L110 8 L126 4 L104 32 L108 18 Z" fill="${kenarRenk}"/>
      <path d="M96 20 L118 -6 L110 8 L126 4 L104 32 L108 18 Z" fill="none"
            stroke="#fff" stroke-width="1" opacity=".7"/>
    </g>`;
  }

  if (k.kind === 'king') {
    return `<g>${govde}
      ${KUYRUK_NOKTA.map(([x, y], i) => `
        <path d="M${x - 7} ${y - 5} q7 6 14 0" fill="none" stroke="${kenarRenk}"
              stroke-width="3" opacity=".85"/>
        ${i % 2 === 0 ? `<circle cx="${x}" cy="${y - 8}" r="2.6" fill="${kenarRenk}"/>` : ''}`).join('')}
      <path d="M94 22 C104 0 120 -8 128 -2 C118 6 110 18 107 32 C104 27 98 23 94 22 Z"
            fill="${kenarRenk}"/>
      <path d="M100 18 C107 6 117 0 122 2 C113 8 107 16 105 24 Z"
            fill="#fff" opacity=".35"/>
      <circle cx="116" cy="6" r="3.4" fill="#e2544e"/>
    </g>`;
  }

  if (k.kind === 'celestial') {
    return `<g>
      ${KUYRUK_NOKTA.map(([x, y], i) => `
        <circle cx="${x}" cy="${y - 10 - i}" r="${(2.8 - i * 0.3).toFixed(1)}"
                fill="${kenarRenk}" opacity="${(0.85 - i * 0.1).toFixed(2)}"/>`).join('')}
      ${govde}
      <path d="${KUYRUK_GOVDE}" fill="none" stroke="${kenarRenk}"
            stroke-width="2" opacity=".7"/>
      <path d="M94 22 C106 -4 124 -14 134 -8 C120 2 110 16 106 34
               C104 29 98 23 94 22 Z" fill="url(#kn${uid})" opacity=".9"/>
      <path d="M94 22 C106 -4 124 -14 134 -8" fill="none" stroke="${kenarRenk}"
            stroke-width="3" stroke-linecap="round"/>
      <circle cx="126" cy="-6" r="3" fill="#fff" opacity=".9"/>
      <circle cx="114" cy="6" r="2" fill="#fff" opacity=".7"/>
    </g>`;
  }

  return `<g>${govde}${yelken}</g>`;
}

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

export function dragonHeadSvg(look, mood = 'happy') {
  const pal = palet(look);
  const uid = ++uidSayaci;
  const olcek = 1.72;
  const ustPay = 20;
  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>${basDefs(pal, uid)}</defs>
      <g transform="translate(100 ${(ustPay + 126 * olcek).toFixed(1)}) scale(${olcek})">
        ${basParcalari(pal, look, mood, 1, uid)}
      </g>
    </svg>`;
}

/* Ejderha artik tam onden bakan bir pozda: iki omuz da simetrik,
   kanatlar tek gorselden aynalanarak iki tarafa da ciziliyor. */
const GORSEL = {
  yol: 'assets/dragon-base.png',
  kare: 1024,
  x0: 290, y0: 142, x1: 733, y1: 891,
  omuzSol: { x: 362, y: 560 },
  omuzSag: { x: 661, y: 560 },

  kalca: { x: 772, y: 700 },

  tepe: { x: 511, y: 230 },
  yuz: { x: 511, y: 455 },
  boyun: { x: 511, y: 505 },
};

const MERKEZ = 92;

const RENK_SUZGEC = {
  ember:     null,
  ocean:     { ton: 197, doy: 1.04, isik: 0.94 },
  emerald:   { ton: 144, doy: 0.73, isik: 0.83 },
  royal:     { ton: 256, doy: 1.20, isik: 1.09 },
  obsidian:  { ton: 256, doy: 0.21, isik: 0.40 },
  frost:     { ton: 193, doy: 1.01, isik: 1.33 },
  celestial: { ton: 39,  doy: 1.22, isik: 1.03 },
  aurora:    { ton: 169, doy: 0.74, isik: 1.09 },
};

export const GOVDE_MERKEZ_ORANI = MERKEZ / 200;

const KATMAN = {
  wings: {
    leather: {
      yol: 'assets/wing-leather.png',
      kare: 1024, x0: 223, y0: 191, x1: 863, y1: 837,
      kok: { x: 267, y: 715 }, uzanim: 0.74, govdeRengi: true,
    },
    flame: {
      yol: 'assets/wing-flame.png',
      kare: 1024, x0: 148, y0: 93, x1: 933, y1: 916,
      kok: { x: 201, y: 747 }, uzanim: 0.76,
    },
    crystal: {
      yol: 'assets/wing-crystal.png',
      kare: 1024, x0: 210, y0: 135, x1: 909, y1: 864,
      kok: { x: 260, y: 779 }, uzanim: 0.76,
    },
    demon: {
      yol: 'assets/wing-demon.png',
      kare: 1024, x0: 176, y0: 110, x1: 907, y1: 914,
      kok: { x: 229, y: 852 }, uzanim: 0.77,
    },
    phoenix: {
      yol: 'assets/wing-phoenix.png',
      kare: 1024, x0: 202, y0: 59, x1: 931, y1: 879,
      kok: { x: 253, y: 723 }, uzanim: 0.78,
    },
    lightning: {
      yol: 'assets/wing-lightning.png',
      kare: 1024, x0: 122, y0: 163, x1: 977, y1: 810,
      kok: { x: 186, y: 699 }, uzanim: 0.88,
    },
    king: {
      yol: 'assets/wing-king.png',
      kare: 1024, x0: 147, y0: 148, x1: 923, y1: 907,
      kok: { x: 207, y: 761 }, uzanim: 0.79,
    },
    celestial: {
      yol: 'assets/wing-celestial.png',
      kare: 1024, x0: 183, y0: 167, x1: 873, y1: 883,
      kok: { x: 234, y: 805 }, uzanim: 0.80,
    },
  },

  tail: {
    basic: {
      yol: 'assets/tail-basic.png',
      kare: 1024, x0: 182, y0: 202, x1: 906, y1: 862,
      kok: { x: 232, y: 325 }, uzanim: 0.36, govdeRengi: true,
    },
    spiked: {
      yol: 'assets/tail-spiked.png',
      kare: 1024, x0: 150, y0: 170, x1: 862, y1: 842,
      kok: { x: 198, y: 245 }, uzanim: 0.365, govdeRengi: true,
    },
    flame: {
      yol: 'assets/tail-flame.png',
      kare: 1024, x0: 88, y0: 158, x1: 1008, y1: 772,
      kok: { x: 154, y: 303 }, uzanim: 0.43,
    },
    crystal: {
      yol: 'assets/tail-crystal.png',
      kare: 1024, x0: 150, y0: 166, x1: 866, y1: 862,
      kok: { x: 199, y: 304 }, uzanim: 0.375,
    },
    demon: {
      yol: 'assets/tail-demon.png',
      kare: 1024, x0: 70, y0: 184, x1: 988, y1: 808,
      kok: { x: 135, y: 296 }, uzanim: 0.44,
    },
    lightning: {
      yol: 'assets/tail-lightning.png',
      kare: 1024, x0: 148, y0: 144, x1: 908, y1: 864,
      kok: { x: 203, y: 277 }, uzanim: 0.385,
    },
    king: {
      yol: 'assets/tail-king.png',
      kare: 1024, x0: 164, y0: 140, x1: 892, y1: 850,
      kok: { x: 213, y: 210 }, uzanim: 0.39,
    },
    celestial: {
      yol: 'assets/tail-celestial.png',
      kare: 1024, x0: 156, y0: 146, x1: 912, y1: 840,
      kok: { x: 211, y: 344 }, uzanim: 0.40,
    },
  },

  head: {
    tiny: {
      yol: 'assets/crown-tiny.png',
      kare: 1024, x0: 200, y0: 384, x1: 824, y1: 660,
      kok: { x: 512, y: 660 }, en: 0.42,
    },
    bronze: {
      yol: 'assets/crown-bronze.png',
      kare: 1024, x0: 302, y0: 326, x1: 732, y1: 690,
      kok: { x: 517, y: 690 }, en: 0.42,
    },
    silver: {
      yol: 'assets/crown-silver.png',
      kare: 1024, x0: 172, y0: 316, x1: 848, y1: 736,
      kok: { x: 510, y: 736 }, en: 0.45,
    },
    golden: {
      yol: 'assets/crown-golden.png',
      kare: 1024, x0: 200, y0: 260, x1: 828, y1: 730,
      kok: { x: 514, y: 730 }, en: 0.46,
    },
    flame: {
      yol: 'assets/crown-flame.png',
      kare: 1024, x0: 172, y0: 308, x1: 886, y1: 782,
      kok: { x: 529, y: 782 }, en: 0.48,
    },
    ice: {
      yol: 'assets/crown-ice.png',
      kare: 1024, x0: 238, y0: 298, x1: 796, y1: 682,
      kok: { x: 517, y: 682 }, en: 0.48,
    },
    king: {
      yol: 'assets/crown-king.png',
      kare: 1024, x0: 118, y0: 126, x1: 922, y1: 834,
      kok: { x: 520, y: 834 }, en: 0.53,
    },
    celestial: {
      yol: 'assets/crown-celestial.png',
      kare: 1024, x0: 256, y0: 312, x1: 780, y1: 700,
      kok: { x: 518, y: 690 }, en: 0.50,
    },
  },

  necklace: {
    fang: {
      yol: 'assets/necklace-fang.png',
      kare: 1024, x0: 205, y0: 131, x1: 821, y1: 904,
      kok: { x: 513, y: 131 }, en: 0.40,
    },
    bronze: {
      yol: 'assets/necklace-bronze.png',
      kare: 1024, x0: 226, y0: 180, x1: 802, y1: 835,
      kok: { x: 514, y: 180 }, en: 0.40,
    },
    sapphire: {
      yol: 'assets/necklace-sapphire.png',
      kare: 1024, x0: 181, y0: 65, x1: 843, y1: 796,
      kok: { x: 512, y: 65 }, en: 0.42,
    },
    flame: {
      yol: 'assets/necklace-flame.png',
      kare: 1024, x0: 212, y0: 164, x1: 804, y1: 880,
      kok: { x: 508, y: 164 }, en: 0.42,
    },
    royal: {
      yol: 'assets/necklace-royal.png',
      kare: 1024, x0: 111, y0: 181, x1: 919, y1: 1022,
      kok: { x: 515, y: 181 }, en: 0.46,
    },
    celestial: {
      yol: 'assets/necklace-celestial.png',
      kare: 1024, x0: 91, y0: 63, x1: 945, y1: 878,
      kok: { x: 518, y: 63 }, en: 0.46,
    },
  },
};

function katmanSec(kategori, id) {
  const grup = KATMAN[kategori];
  if (!grup) return null;
  return grup[id] || grup[VARSAYILAN[kategori]] || null;
}

const VARSAYILAN = { wings: 'leather', tail: 'basic' };

export function dragonAssetUrls(look) {
  const urls = [GORSEL.yol];
  const kanat = katmanSec('wings', look?.wings);
  const kuyruk = katmanSec('tail', look?.tail);
  const tac = katmanSec('head', look?.head);
  const kolye = katmanSec('necklace', look?.necklace);
  if (kanat) urls.push(kanat.yol);
  if (kuyruk) urls.push(kuyruk.yol);
  if (tac) urls.push(tac.yol);
  if (kolye) urls.push(kolye.yol);
  return urls;
}

function katmanCiz(k, ax, ay, gw, renkId, zorlaAyna = false) {
  const gorunenGen = k.en !== undefined
    ? gw * k.en
    : gw * k.uzanim / ((k.x1 - k.kok.x) / (k.x1 - k.x0));

  const olcek = gorunenGen * k.kare / (k.x1 - k.x0);
  const aynaMi = zorlaAyna ? !k.ayna : k.ayna;

  const x = ax - (k.kok.x / k.kare) * olcek;
  const y = ay - (k.kok.y / k.kare) * olcek;

  const cevir = aynaMi ? ` transform="translate(${(ax * 2).toFixed(1)} 0) scale(-1 1)"` : '';

  const suz = (k.govdeRengi && renkId) ? ` filter="url(#${renkId})"` : '';

  return `<image href="${k.yol}" x="${x.toFixed(1)}" y="${y.toFixed(1)}"
                 width="${olcek.toFixed(1)}" height="${olcek.toFixed(1)}"
                 preserveAspectRatio="xMidYMid meet"${cevir}${suz}/>`;
}

/* faceSvg() vektor izlerini uretiyor ama kendi yerel koordinat sisteminde
   (govde/kafa merkezli degil). Onden bakan yeni kafaya oturtmak icin
   yuz noktasina tasiyip govde olcegine gore kucultuyoruz. */
function yuzCiz(faceKey, fx, fy, gw) {
  const olcek = gw / 185;
  return `<g transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${olcek.toFixed(3)})">${faceSvg(faceKey)}</g>`;
}

const ALFA_MATRIS = '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0';

function desenCiz(kind, ink, kutu) {
  const { x, y, w, h } = kutu;
  const X = (t) => (x + t * w).toFixed(1);
  const Y = (t) => (y + t * h).toFixed(1);
  const koyu = '#2a1520';

  if (kind === 'stripes') {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const t = 0.30 + i * 0.13;
      s += `<path d="M${X(0.30)} ${Y(t)} Q${X(0.62)} ${Y(t + 0.045)} ${X(0.95)} ${Y(t - 0.01)}"
                  fill="none" stroke="${koyu}" stroke-width="${(h * 0.045).toFixed(1)}"
                  stroke-linecap="round" opacity=".38"/>`;
    }
    return { icerik: s, kaynasma: 'multiply' };
  }

  if (kind === 'flame') {
    const alev = (tx, ty, b) => `<path d="M${X(tx)} ${Y(ty)}
        C${X(tx + b)} ${Y(ty - b)} ${X(tx + b * 0.6)} ${Y(ty - b * 2)} ${X(tx)} ${Y(ty - b * 2.6)}
        C${X(tx - b * 0.6)} ${Y(ty - b * 2)} ${X(tx - b)} ${Y(ty - b)} ${X(tx)} ${Y(ty)} Z"
        fill="${ink}" opacity=".85"/>`;
    return { icerik: alev(0.55, 0.82, 0.07) + alev(0.72, 0.76, 0.055) + alev(0.86, 0.66, 0.045)
                    + alev(0.63, 0.62, 0.05), kaynasma: 'screen' };
  }

  if (kind === 'tribal') {
    let s = '';
    for (let sira = 0; sira < 5; sira++) {
      const ty = 0.34 + sira * 0.12;
      for (let tx = 0.30; tx < 0.98; tx += 0.10) {
        s += `<path d="M${X(tx)} ${Y(ty)} L${X(tx + 0.05)} ${Y(ty + 0.06)} L${X(tx + 0.10)} ${Y(ty)}"
                    fill="none" stroke="${koyu}" stroke-width="${(h * 0.022).toFixed(1)}"
                    opacity=".42" stroke-linejoin="round"/>`;
      }
    }
    return { icerik: s, kaynasma: 'multiply' };
  }

  if (kind === 'lightning') {
    const yol = `M${X(0.42)} ${Y(0.34)} L${X(0.52)} ${Y(0.52)} L${X(0.45)} ${Y(0.56)}
                 L${X(0.58)} ${Y(0.76)} L${X(0.50)} ${Y(0.80)} L${X(0.60)} ${Y(0.96)}
                 M${X(0.72)} ${Y(0.38)} L${X(0.66)} ${Y(0.56)} L${X(0.74)} ${Y(0.60)}
                 L${X(0.64)} ${Y(0.80)}`;
    return { icerik: `
      <path d="${yol}" fill="none" stroke="${ink}" stroke-width="${(h * 0.05).toFixed(1)}"
            opacity=".35" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${yol}" fill="none" stroke="${ink}" stroke-width="${(h * 0.018).toFixed(1)}"
            opacity=".95" stroke-linecap="round" stroke-linejoin="round"/>`,
      kaynasma: 'screen' };
  }

  if (kind === 'runes') {
    const r = (w * 0.13).toFixed(1);
    return { icerik: `
      <circle cx="${X(0.66)}" cy="${Y(0.62)}" r="${r}" fill="none" stroke="${ink}"
              stroke-width="${(h * 0.016).toFixed(1)}" opacity=".8"/>
      <circle cx="${X(0.66)}" cy="${Y(0.62)}" r="${(r * 0.62)}" fill="none" stroke="${ink}"
              stroke-width="${(h * 0.010).toFixed(1)}" opacity=".55" stroke-dasharray="4 5"/>
      <path d="M${X(0.66)} ${Y(0.52)} v${(h * 0.09).toFixed(1)} M${X(0.62)} ${Y(0.56)} h${(w * 0.08).toFixed(1)}
               M${X(0.80)} ${Y(0.46)} v${(h * 0.07).toFixed(1)} M${X(0.50)} ${Y(0.74)} v${(h * 0.07).toFixed(1)}"
            stroke="${ink}" stroke-width="${(h * 0.014).toFixed(1)}" opacity=".9" stroke-linecap="round"/>`,
      kaynasma: 'screen' };
  }

  if (kind === 'armor') {
    let s = '';
    for (let i = 0; i < 4; i++) {
      const ty = 0.36 + i * 0.15;
      s += `<path d="M${X(0.32)} ${Y(ty)} Q${X(0.64)} ${Y(ty - 0.055)} ${X(0.96)} ${Y(ty + 0.01)}"
                  fill="none" stroke="${koyu}" stroke-width="${(h * 0.05).toFixed(1)}" opacity=".34"/>
            <path d="M${X(0.32)} ${Y(ty - 0.012)} Q${X(0.64)} ${Y(ty - 0.067)} ${X(0.96)} ${Y(ty - 0.002)}"
                  fill="none" stroke="${ink}" stroke-width="${(h * 0.018).toFixed(1)}" opacity=".75"/>`;
    }
    return { icerik: s, kaynasma: 'normal' };
  }

  if (kind === 'cosmic') {
    const yildiz = [[0.42, 0.42], [0.58, 0.34], [0.70, 0.50], [0.52, 0.60], [0.82, 0.44],
                    [0.64, 0.74], [0.86, 0.66], [0.46, 0.82], [0.74, 0.88], [0.36, 0.62]];
    let s = `<ellipse cx="${X(0.64)}" cy="${Y(0.62)}" rx="${(w * 0.30).toFixed(1)}"
                      ry="${(h * 0.26).toFixed(1)}" fill="${ink}" opacity=".22"
                      transform="rotate(-14 ${X(0.64)} ${Y(0.62)})"/>`;
    for (const [tx, ty] of yildiz) {
      s += `<circle cx="${X(tx)}" cy="${Y(ty)}" r="${(w * 0.012).toFixed(1)}" fill="#fff" opacity=".9"/>`;
    }
    return { icerik: s, kaynasma: 'screen' };
  }

  const glif = (tx, ty, s2) => {
    const a = (w * 0.05 * s2).toFixed(1);
    return `<path d="M${X(tx)} ${(+Y(ty) - a)} L${(+X(tx) + a * 0.8)} ${Y(ty)}
                     L${X(tx)} ${(+Y(ty) + a)} L${(+X(tx) - a * 0.8)} ${Y(ty)} Z"
                  fill="none" stroke="${ink}" stroke-width="${(h * 0.013).toFixed(1)}" opacity=".9"/>`;
  };
  return { icerik: `
    <circle cx="${X(0.64)}" cy="${Y(0.60)}" r="${(w * 0.22).toFixed(1)}" fill="none" stroke="${ink}"
            stroke-width="${(h * 0.016).toFixed(1)}" opacity=".7" stroke-dasharray="7 6"/>
    <circle cx="${X(0.64)}" cy="${Y(0.60)}" r="${(w * 0.13).toFixed(1)}" fill="none" stroke="${ink}"
            stroke-width="${(h * 0.010).toFixed(1)}" opacity=".5" stroke-dasharray="4 6"/>
    ${glif(0.64, 0.60, 1.2)}${glif(0.42, 0.44, 0.8)}${glif(0.86, 0.52, 0.8)}
    ${glif(0.50, 0.84, 0.7)}${glif(0.84, 0.82, 0.7)}`,
    kaynasma: 'screen' };
}

function auroraCiz(renkler, kutu, uid) {
  const { x, y, w, h } = kutu;
  const gid = `au${uid}`;
  const duraklar = renkler.map((c, i) =>
    `<stop offset="${(i / (renkler.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
  return `
    <defs>
      <linearGradient id="${gid}" x1="0" y1="1" x2="1" y2="0">${duraklar}</linearGradient>
    </defs>
    <g opacity=".55">
      <path d="M${x.toFixed(1)} ${(y + h * 0.42).toFixed(1)}
               Q${(x + w * 0.5).toFixed(1)} ${(y + h * 0.26).toFixed(1)}
                ${(x + w).toFixed(1)} ${(y + h * 0.46).toFixed(1)}
               L${(x + w).toFixed(1)} ${(y + h * 0.66).toFixed(1)}
               Q${(x + w * 0.5).toFixed(1)} ${(y + h * 0.46).toFixed(1)}
                ${x.toFixed(1)} ${(y + h * 0.62).toFixed(1)} Z"
            fill="url(#${gid})"/>
      <path d="M${x.toFixed(1)} ${(y + h * 0.72).toFixed(1)}
               Q${(x + w * 0.5).toFixed(1)} ${(y + h * 0.56).toFixed(1)}
                ${(x + w).toFixed(1)} ${(y + h * 0.76).toFixed(1)}
               L${(x + w).toFixed(1)} ${(y + h * 0.90).toFixed(1)}
               Q${(x + w * 0.5).toFixed(1)} ${(y + h * 0.70).toFixed(1)}
                ${x.toFixed(1)} ${(y + h * 0.88).toFixed(1)} Z"
            fill="url(#${gid})" opacity=".7"/>
    </g>`;
}

function gorselEjderha(level, mood, look) {
  const uid = ++uidSayaci;
  const g = growthRatio(level);

  /* Onden bakan poz eski 3/4 poza gore daha dar ve uzun bir icerik kutusuna
     sahip (443x749 vs eski 643x752). Ayni hedefGen genislik hedeflenince boy
     eskisinden %45 daha buyuk cikiyordu. 0.692 duzeltmesi eski boy oranini
     geri getiriyor. */
  const hedefGen = (88 + g * 40) * 0.692;
  const olcek = hedefGen * GORSEL.kare / (GORSEL.x1 - GORSEL.x0);

  const ix = MERKEZ - hedefGen / 2 - (GORSEL.x0 / GORSEL.kare) * olcek;
  const iy = 192 - (GORSEL.y1 / GORSEL.kare) * olcek;

  const suzgec = mood === 'sad'
    ? `<filter id="ruh${uid}"><feColorMatrix type="saturate" values="0.45"/></filter>`
    : '';

  const r = RENK_SUZGEC[look?.color];
  const renkId = r ? `rk${uid}` : null;
  const renkTanim = r ? `
      <filter id="${renkId}" color-interpolation-filters="sRGB">
        <feColorMatrix type="hueRotate" values="${r.ton}"/>
        <feColorMatrix type="saturate" values="${r.doy}"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="${r.isik}"/>
          <feFuncG type="linear" slope="${r.isik}"/>
          <feFuncB type="linear" slope="${r.isik}"/>
        </feComponentTransfer>
      </filter>` : '';

  const nokta = (p) => [
    ix + (p.x / GORSEL.kare) * olcek,
    iy + (p.y / GORSEL.kare) * olcek,
  ];
  const [omuzSolX, omuzSolY] = nokta(GORSEL.omuzSol);
  const [omuzSagX, omuzSagY] = nokta(GORSEL.omuzSag);
  const [kalcaX, kalcaY] = nokta(GORSEL.kalca);
  const [tepeX, tepeY] = nokta(GORSEL.tepe);
  const [yuzX, yuzY] = nokta(GORSEL.yuz);
  const [boyunX, boyunY] = nokta(GORSEL.boyun);
  const kanat = katmanSec('wings', look?.wings);
  const kuyruk = katmanSec('tail', look?.tail);
  const tac = katmanSec('head', look?.head);
  const kolye = katmanSec('necklace', look?.necklace);

  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      ${(suzgec || renkTanim) ? `<defs>${suzgec}${renkTanim}</defs>` : ''}
      <g ${suzgec ? `filter="url(#ruh${uid})"` : ''}>
        ${kuyruk ? katmanCiz(kuyruk, kalcaX, kalcaY, hedefGen, renkId) : ''}
        ${kanat ? katmanCiz(kanat, omuzSolX, omuzSolY, hedefGen, renkId, true) : ''}
        ${kanat ? katmanCiz(kanat, omuzSagX, omuzSagY, hedefGen, renkId) : ''}
        <image href="${GORSEL.yol}" x="${ix.toFixed(1)}" y="${iy.toFixed(1)}"
               width="${olcek.toFixed(1)}" height="${olcek.toFixed(1)}"
               preserveAspectRatio="xMidYMid meet"
               ${renkId ? `filter="url(#${renkId})"` : ''}/>
        ${look?.face && look.face !== 'none' ? yuzCiz(look.face, yuzX, yuzY, hedefGen) : ''}
        ${kolye ? katmanCiz(kolye, boyunX, boyunY, hedefGen, renkId) : ''}
        ${tac ? katmanCiz(tac, tepeX, tepeY, hedefGen, renkId) : ''}
      </g>
    </svg>`;
}

export function dragonSvg(level, look, mood = 'happy') {
  const pal = palet(look);
  if (level <= CONFIG.EGG_UNTIL) return yumurtaSvg(level, pal);

  return gorselEjderha(level, mood, look);

  const uid = ++uidSayaci;
  const g = growthRatio(level);
  const s = 0.62 + g * 0.26;
  const wing = 0.50 + g * 0.22;
  const horn = 0.60 + g * 0.38;
  const dikenSayisi = Math.round(4 + g * 8);

  const acik = ton(pal.body, 0.24);
  const koyu = ton(pal.body, -0.26);
  const cokKoyu = ton(pal.dark, -0.2);
  const kanatAcik = ton(pal.dark, 0.18);
  const boynuzAcik = ton(pal.horn, 0.4);
  const boynuzKoyu = ton(pal.horn, -0.32);

  const sirtY = (x) => -34 + (x / 36) ** 2 * 26;
  let dikenler = '';
  const yanBasi = Math.max(2, Math.round(dikenSayisi / 2));
  for (let taraf = -1; taraf <= 1; taraf += 2) {
    for (let i = 0; i < yanBasi; i++) {
      const p = yanBasi === 1 ? 0 : i / (yanBasi - 1);
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

  const kanat = kanatSvg(pal.wings, pal, uid, { cokKoyu, boynuzAcik, boynuzKoyu });

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
        <!-- Govde: ustten isik, altta golge.
             Aurora renginde tek ton yerine renk bantlari geciyor - mythic
             kademenin fiyatini gozle gorulur kilan sey bu. -->
        <linearGradient id="gv${uid}g" x1="0.15" y1="0" x2="0.85" y2="1">
          ${pal.aurora
            ? pal.aurora.map((renk, i) =>
                `<stop offset="${(i / (pal.aurora.length - 1)).toFixed(2)}" stop-color="${renk}"/>`).join('')
            : `<stop offset="0" stop-color="${acik}"/>
               <stop offset="0.45" stop-color="${pal.body}"/>
               <stop offset="1" stop-color="${koyu}"/>`}
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

        ${kuyrukSvg(pal.tail, pal, uid, { cokKoyu, boynuzAcik, boynuzKoyu })}

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
