
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v45';
import { getPoints, spendPoints, saveState, loadState } from '../../js/store.js?v45';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js?v45';

const GAME_ID = 'pet';

const MAX_LEVEL = 99;
const FULL_HOURS = 12;
const EGG_UNTIL = 4;

const feedCost = (level) => 8 + Math.floor(level * 1.5);
const xpNeeded = (level) => 2 + Math.floor(level / 8);

registerTexts(GAME_ID, {
  title: 'Ejderham',
  level: 'SEVİYE',
  coins: '$MH',
  fullness: 'Doyum',
  growth: 'Gelişim',
  feed: 'Besle',
  backToHub: "Hub'a dön",
  tabCare: 'Bakım',
  tabShop: 'Dükkân',
  hint: 'Diğer oyunlarda jeton kazan, burada ejderhanı besle.',
  notEnough: 'Yeterli $MH’ın yok. Bir oyun oynayıp geri gel.',
  hungryHint: 'Ejderhan acıktı, beslenmeyi bekliyor.',
  maxLevel: 'En yüksek seviyeye ulaştın.',
  levelUp: 'Seviye {level}!',
  shopColors: 'RENK',
  shopCrowns: 'TAÇ',
  shopEffects: 'ANİMASYON',
  owned: 'Alındı',
  equipped: 'Seçili',
  needLevel: 'Sv. {level}',
  bought: '{name} alındı!',
  stageEgg: 'Yumurta',
  stageHatch: 'Yeni çıktı',
  stageNames: 'Yavru,Genç,Ejderha,Savaşçı,Kadim,Efsane',
  lockedMsg: "Seviye {level}'de açılıyor.",
  tryHint: 'Ejderhanın üzerinde deniyorsun.',
  tryNoCoins: 'Yeterli $MH’ın yok.',
  tryCancel: 'Vazgeç',

  colViolet: 'Mor',
  colCrimson: 'Kızıl',
  colEmerald: 'Zümrüt',
  colIce: 'Buz',
  colGold: 'Altın',
  colShadow: 'Gölge',
  colInferno: 'Ateş',
  colRunic: 'Kadim Rün',
  colLord: 'Ejder Kralı',
  crNone: 'Yok',
  crSilver: 'Gümüş',
  crGold: 'Altın',
  crRuby: 'Yakut',
  crAncient: 'Kadim',
  crDragon: 'Ejder Tacı',
  efNone: 'Yok',
  efEmbers: 'Kıvılcım',
  efFlame: 'Alev',
  efStorm: 'Şimşek',
  efAura: 'Hale',
  efStars: 'Yıldız',
});

const COLORS = {
  violet:  { price: 0,     nameKey: 'colViolet',  body: '#a978e8', dark: '#7b4fd0', belly: '#e6d6fa', horn: '#f5b942' },
  crimson: { price: 400,   nameKey: 'colCrimson', body: '#e05a52', dark: '#a8342d', belly: '#f7cdc6', horn: '#f5b942' },
  emerald: { price: 700,   nameKey: 'colEmerald', body: '#3fbf7a', dark: '#248a53', belly: '#cdf0dd', horn: '#f5d76e' },
  ice:     { price: 1200,  nameKey: 'colIce',     body: '#5fc8e8', dark: '#2a8bb0', belly: '#d6f2fb', horn: '#eaf7ff',
             pattern: 'scales', ink: '#ffffff' },
  gold:    { price: 2000,  nameKey: 'colGold',    body: '#e8b13c', dark: '#b07d16', belly: '#fbe9c0', horn: '#fff3d0',
             pattern: 'scales', ink: '#7d5406' },
  shadow:  { price: 3200,  nameKey: 'colShadow',  body: '#4a4560', dark: '#2b2739', belly: '#8a83a8', horn: '#c4b6f0',
             pattern: 'scales', ink: '#c4b6f0' },
  inferno: { price: 5000,  nameKey: 'colInferno', body: '#f2703a', dark: '#a83318', belly: '#ffd9a8', horn: '#ffe066',
             pattern: 'cracks', ink: '#ffe066', needLevel: 40 },
  runic:   { price: 8000,  nameKey: 'colRunic',   body: '#4d6b8f', dark: '#2b3f5c', belly: '#cfe0f0', horn: '#8fe3d8',
             pattern: 'runes',  ink: '#8fe3d8', needLevel: 65 },
  dragonlord: { price: 12000, nameKey: 'colLord', body: '#4a4166', dark: '#332c4a', belly: '#b6a8dd', horn: '#f5c74a',
             pattern: 'plates', ink: '#f5c74a', needLevel: 80 },
};

const CROWNS = {
  none:    { price: 0,     nameKey: 'crNone' },
  silver:  { price: 600,   nameKey: 'crSilver',  metal: '#d8dde8', edge: '#9aa2b5', gem: '#8fd0ff' },
  gold:    { price: 1500,  nameKey: 'crGold',    metal: '#f5c74a', edge: '#c9922a', gem: '#fff3d0' },
  ruby:    { price: 3000,  nameKey: 'crRuby',    metal: '#f5c74a', edge: '#c9922a', gem: '#e2544e' },
  ancient: { price: 6000,  nameKey: 'crAncient', metal: '#c9b7f5', edge: '#8b6fd6', gem: '#6ee7a8', needLevel: 50 },
  dragon:  { price: 11000, nameKey: 'crDragon',  metal: '#f0d78a', edge: '#a8761c', gem: '#ff6b4a', needLevel: 75 },
};

const EFFECTS = {
  none:   { price: 0,    nameKey: 'efNone' },
  embers: { price: 500,  nameKey: 'efEmbers', color: '#f5b942', kind: 'rise' },
  flame:  { price: 1400, nameKey: 'efFlame',  color: '#f2703a', kind: 'rise' },
  storm:  { price: 2800, nameKey: 'efStorm',  color: '#8fd0ff', kind: 'storm' },
  aura:   { price: 4200, nameKey: 'efAura',   color: '#c079f2', kind: 'aura' },
  stars:  { price: 6500, nameKey: 'efStars',  color: '#ffe066', kind: 'rise', needLevel: 60 },
};

function eyeMarks(mood, pal) {
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

const CROWN_BOX = {
  silver:  '-18 -28 36 32',
  gold:    '-21 -32 42 36',
  ruby:    '-23 -40 46 44',
  ancient: '-37 -43 74 47',
  dragon:  '-41 -44 82 48',
};

function crownSvg(key, headTop) {
  const c = CROWNS[key];
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

function eggSvg(level, pal) {
  const crack = level >= 2
    ? `<path d="M-6 -14 l7 10 l-9 8 l8 9" fill="none" stroke="${pal.dark}"
             stroke-width="2.6" stroke-linecap="round" opacity=".65"/>` : '';
  const crack2 = level >= 3
    ? `<path d="M14 -4 l-7 9 l9 7" fill="none" stroke="${pal.dark}"
             stroke-width="2.4" stroke-linecap="round" opacity=".5"/>` : '';
  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <g transform="translate(100 108)">
        <ellipse cx="0" cy="0" rx="46" ry="58" fill="${pal.belly}"/>
        <ellipse cx="0" cy="0" rx="46" ry="58" fill="none" stroke="${pal.body}" stroke-width="3" opacity=".55"/>
        <ellipse cx="-16" cy="-26" rx="12" ry="8" fill="#fff" opacity=".5"/>
        <ellipse cx="16" cy="14" rx="11" ry="8" fill="${pal.body}" opacity=".28"/>
        <ellipse cx="-10" cy="30" rx="8" ry="6" fill="${pal.body}" opacity=".22"/>
        ${crack}${crack2}
      </g>
    </svg>`;
}

let desenSayaci = 0;

function patternMarks(pal, govdeYolu) {
  if (!pal.pattern) return '';
  const uid = `d${++desenSayaci}`;
  const ink = pal.ink || pal.dark;
  let icerik = '';

  if (pal.pattern === 'scales') {
    for (let sira = 0; sira < 6; sira++) {
      const y = -26 + sira * 11;
      const kaydir = sira % 2 ? 6 : 0;
      for (let x = -42 + kaydir; x <= 42; x += 12) {
        icerik += `<path d="M${x} ${y} q6 7 12 0" fill="none" stroke="${ink}"
                         stroke-width="1.6" opacity=".3" stroke-linecap="round"/>`;
      }
    }
  } else if (pal.pattern === 'cracks') {
    icerik = `
      <path d="M-24 -26 l6 12 l-5 9 l8 13 l-4 12
               M14 -28 l-4 14 l7 10 l-5 12 l6 10
               M-6 -20 l5 11 l-4 10 l6 12"
            fill="none" stroke="${ink}" stroke-width="2.4" opacity=".75"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-24 -26 l6 12 l-5 9 l8 13 l-4 12
               M14 -28 l-4 14 l7 10 l-5 12 l6 10"
            fill="none" stroke="#fff" stroke-width="0.9" opacity=".5"
            stroke-linecap="round"/>`;
  } else if (pal.pattern === 'runes') {
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
    icerik = `
      <path d="M-40 -18 q40 -12 80 0 M-40 -4 q40 -12 80 0
               M-40 10 q40 -12 80 0 M-40 24 q40 -12 80 0"
            fill="none" stroke="${ink}" stroke-width="1.8" opacity=".45"/>
      <path d="M-22 -30 v62 M22 -30 v62" stroke="${ink}"
            stroke-width="1.4" opacity=".3"/>
      <path d="M-34 -24 l6 -6 l6 6 l-6 6 z M28 -20 l5 -5 l5 5 l-5 5 z
               M-32 18 l5 -5 l5 5 l-5 5 z M26 20 l6 -6 l6 6 l-6 6 z"
            fill="${ink}" opacity=".6"/>`;
  }

  return `
    <clipPath id="${uid}"><path d="${govdeYolu}"/></clipPath>
    <g clip-path="url(#${uid})">${icerik}</g>`;
}

function dragonSvg(g, pal, crownKey, mood) {
  const s = 0.62 + g * 0.26;
  const wing = 0.60 + g * 0.32;
  const horn = 0.60 + g * 0.38;
  const spikeCount = Math.round(4 + g * 8);

  const sirtY = (x) => -32 + (x / 34) ** 2 * 24;
  let spikes = '';
  const perSide = Math.max(2, Math.round(spikeCount / 2));
  for (let taraf = -1; taraf <= 1; taraf += 2) {
    for (let i = 0; i < perSide; i++) {
      const p = perSide === 1 ? 0 : i / (perSide - 1);
      const x = taraf * (11 + p * 21);
      const uzun = 1 - p * 0.55;
      const kenar = sirtY(x);
      const uc = kenar - (5 + uzun * 9);
      const w = 3.6 + uzun * 1.6;
      spikes += `<path d="M${(x - w).toFixed(1)} ${(kenar + 9).toFixed(1)}
                          L${x.toFixed(1)} ${uc.toFixed(1)}
                          L${(x + w).toFixed(1)} ${(kenar + 9).toFixed(1)} Z" fill="${pal.horn}"/>`;
    }
  }

  const govdeYolu = 'M-34 2 Q-38 -22 -14 -30 Q14 -34 34 -12 Q45 10 28 29 Q2 40 -18 31 Q-32 22 -34 2 Z';

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

        <!-- KUYRUK: govdenin arkasindan cikip yukari kivrilir, ucunda mizrak -->
        <path d="M20 18 Q62 34 84 10 L98 24 Q112 6 96 -8 Q78 16 54 16 Q34 12 22 6 Z"
              fill="${pal.dark}"/>

        ${spikes}

        <!-- GOVDE -->
        <path d="${govdeYolu}" fill="${pal.body}"/>
        <!-- Yan golge: govde yassi bir leke gibi durmasin -->
        <path d="M-34 2 Q-38 -22 -14 -30 Q-24 -8 -22 12 Q-21 26 -18 31 Q-32 22 -34 2 Z"
              fill="${pal.dark}" opacity=".22"/>
        <path d="M34 -12 Q45 10 28 29 Q22 20 22 8 Q22 -8 16 -24 Z"
              fill="${pal.dark}" opacity=".22"/>

        <!-- Renge ozel desen (pul / magma / run / plaka) -->
        ${patternMarks(pal, govdeYolu)}

        <!-- AYAKLAR -->
        ${ayak(-16)}${ayak(16)}

        <!-- Karin plakalari -->
        <path d="M-15 2 Q0 -10 17 1 Q24 19 6 28 Q-11 28 -17 17 Z" fill="${pal.belly}"/>
        <path d="M-11 7 h22 M-13 15 h26 M-9 23 h18" stroke="${pal.dark}"
              stroke-width="1.5" opacity=".3" stroke-linecap="round"/>

        <!-- BOYUN -->
        <path d="M-14 -24 Q-17 -40 -11 -46 L11 -46 Q17 -40 14 -24 Z" fill="${pal.body}"/>

        <!-- BAS: kose hatli, alin cikintili, cene one dogru -->
        <path d="M-26 -52 L-30 -74 L-16 -85 L16 -85 L30 -74 L26 -52 Q19 -38 0 -35 Q-19 -38 -26 -52 Z"
              fill="${pal.body}"/>

        <!-- Kas cikintisi: sert bir bakis verir -->
        <path d="M-26 -68 L-6 -63 M26 -68 L6 -63" stroke="${pal.dark}"
              stroke-width="5" stroke-linecap="round"/>

        ${eyeMarks(mood, pal)}

        <!-- Burun -->
        <path d="M-10 -44 h20 q4 6 -2 9 h-16 q-6 -3 -2 -9 z" fill="${pal.dark}" opacity=".9"/>
        <circle cx="-4.5" cy="-42" r="1.6" fill="#1e1829"/>
        <circle cx="4.5" cy="-42" r="1.6" fill="#1e1829"/>

        <!-- Cene dikenleri -->
        <path d="M-16 -38 l-5 7 l6 -1 z M16 -38 l5 7 l-6 -1 z" fill="${pal.horn}" opacity=".9"/>

        <!-- BOYNUZLAR: uca dogru sivrilen, geriye supurulmus tek cift.
             Sadece dikey olcekleniyor - seviye ciktikca uzuyorlar. -->
        <g transform="scale(1 ${horn.toFixed(3)})">
          <path d="M-26 -73 Q-45 -89 -49 -119 Q-29 -97 -14 -79 Z" fill="${pal.horn}"/>
          <path d="M26 -73 Q45 -89 49 -119 Q29 -97 14 -79 Z" fill="${pal.horn}"/>
        </g>

        <!-- Yanak dikenleri: cene hattina yapisik -->
        <path d="M-24 -60 l-13 5 l11 5 z M24 -60 l13 5 l-11 5 z" fill="${pal.horn}"/>

        ${crownSvg(crownKey, -85)}
      </g>
    </svg>`;
}

const petStage = document.getElementById('pet-stage');
const petArt = document.getElementById('pet-art');
const fxEl = document.getElementById('fx');
const levelEl = document.getElementById('level');
const coinsEl = document.getElementById('coins');
const stageNameEl = document.getElementById('stage-name');
const hungerFill = document.getElementById('hunger-fill');
const hungerValue = document.getElementById('hunger-value');
const xpFill = document.getElementById('xp-fill');
const xpValue = document.getElementById('xp-value');
const feedBtn = document.getElementById('feed');
const feedCostEl = document.getElementById('feed-cost');
const hintEl = document.getElementById('hint');
const shopEl = document.getElementById('shop');
const shopMsgEl = document.getElementById('shop-msg');
const tryBar = document.getElementById('try-bar');
const tryName = document.getElementById('try-name');
const tryNote = document.getElementById('try-note');
const tryBuy = document.getElementById('try-buy');
const tryCancel = document.getElementById('try-cancel');
const tabCare = document.getElementById('tab-care');
const tabShop = document.getElementById('tab-shop');
const panelCare = document.getElementById('panel-care');
const panelShop = document.getElementById('panel-shop');

let level = 1;
let xp = 0;
let lastFed = Date.now();
let coins = 0;
let busy = false;

let owned = { color: ['violet'], crown: ['none'], effect: ['none'] };
let eq = { color: 'violet', crown: 'none', effect: 'none' };

let deneme = null;

function gorunum() {
  return deneme ? { ...eq, [deneme.group]: deneme.id } : eq;
}

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});
feedBtn.addEventListener('click', feed);
petStage.addEventListener('click', poke);
tabCare.addEventListener('click', () => switchTab('care'));
tabShop.addEventListener('click', () => switchTab('shop'));
tryBuy.addEventListener('click', confirmBuy);
tryCancel.addEventListener('click', () => {
  deneme = null;
  haptic.tap();
  renderShop();
  render();
});
document.addEventListener('langchange', () => {
  applyStaticTexts();
  renderShop();
  render();
});

bootstrap();
setInterval(render, 60000);

async function bootstrap() {
  const saved = await loadState(GAME_ID);
  if (saved && Number(saved.level) > 0) {
    level = Math.min(Number(saved.level) || 1, MAX_LEVEL);
    xp = Number(saved.xp) || 0;
    lastFed = Number(saved.lastFed) || Date.now();
    if (saved.owned) owned = { ...owned, ...saved.owned };
    if (saved.eq) eq = { ...eq, ...saved.eq };
  }
  coins = await getPoints();
  renderShop();
  render();
}

function goHome() {
  window.location.href = '../../index.html';
}

function persist() {
  saveState(GAME_ID, { level, xp, lastFed, owned, eq });
}

function switchTab(which) {
  const shop = which === 'shop';
  tabShop.classList.toggle('is-on', shop);
  tabCare.classList.toggle('is-on', !shop);
  panelShop.hidden = !shop;
  panelCare.hidden = shop;
  document.body.classList.toggle('shop-open', shop);

  if (!shop && deneme) {
    deneme = null;
    renderShop();
    render();
  }
  haptic.tap();
}

function fullness() {
  const gecenSaat = (Date.now() - lastFed) / 3_600_000;
  return Math.max(0, Math.min(100, Math.round((1 - gecenSaat / FULL_HOURS) * 100)));
}

const mood = () => (fullness() < 25 ? 'sad' : 'happy');

const growth = () => Math.max(0, Math.min(1, (level - EGG_UNTIL - 1) / (MAX_LEVEL - EGG_UNTIL - 1)));

function stageLabel() {
  if (level <= 2) return t('stageEgg');
  if (level <= EGG_UNTIL) return t('stageHatch');
  const names = t('stageNames').split(',');
  const i = Math.min(names.length - 1, Math.floor(growth() * names.length));
  return names[i].trim();
}

async function feed() {
  if (busy || level >= MAX_LEVEL) return;
  const cost = feedCost(level);

  if (coins < cost) return reddet();

  busy = true;
  feedBtn.disabled = true;

  const sonuc = await spendPoints(cost);
  if (!sonuc.ok) {
    coins = sonuc.total;
    busy = false;
    render();
    return reddet();
  }

  coins = sonuc.total;
  lastFed = Date.now();
  xp++;

  const atladi = xp >= xpNeeded(level);
  if (atladi) { xp = 0; level = Math.min(level + 1, MAX_LEVEL); }

  haptic.success();
  petStage.classList.add(atladi ? 'levelup' : 'fed');
  setTimeout(() => petStage.classList.remove('fed', 'levelup'), 950);
  if (atladi) showFloater(t('levelUp', { level: format(level) }));

  persist();
  busy = false;
  renderShop();
  render();
}

function uyar(metin) {
  haptic.error();
  hintEl.textContent = metin;
  hintEl.classList.add('warn');
  shopMsgEl.textContent = metin;
  shopMsgEl.classList.add('warn');
  shopMsgEl.hidden = false;
}

function reddet() {
  uyar(t('notEnough'));
}

function poke() {
  if (petStage.classList.contains('poked')) return;
  haptic.tap();
  petStage.classList.add('poked');
  setTimeout(() => petStage.classList.remove('poked'), 520);
}

const GROUPS = [
  { key: 'color',  title: 'shopColors',  items: COLORS },
  { key: 'crown',  title: 'shopCrowns',  items: CROWNS },
  { key: 'effect', title: 'shopEffects', items: EFFECTS },
];

function swatchPattern(item) {
  const ink = item.ink || item.dark;
  if (item.pattern === 'scales') {
    return `<svg viewBox="0 0 24 24"><g fill="none" stroke="${ink}" stroke-width="1.4" opacity=".55">
      <path d="M2 7q3 4 6 0M8 7q3 4 6 0M14 7q3 4 6 0
               M5 13q3 4 6 0M11 13q3 4 6 0
               M2 19q3 4 6 0M8 19q3 4 6 0M14 19q3 4 6 0"/></g></svg>`;
  }
  if (item.pattern === 'cracks') {
    return `<svg viewBox="0 0 24 24"><path d="M7 2 l3 6 l-3 5 l4 5 l-2 4 M17 3 l-2 7 l3 5 l-2 6"
      fill="none" stroke="${ink}" stroke-width="1.8" opacity=".9"
      stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (item.pattern === 'runes') {
    return `<svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="none" stroke="${ink}" stroke-width="1.2" opacity=".6"/>
      <path d="M12 7 v5 M9.5 9 h5 M12 12 l2.5 4 h-5 z" fill="none" stroke="${ink}"
            stroke-width="1.7" opacity=".95" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (item.pattern === 'plates') {
    return `<svg viewBox="0 0 24 24"><g stroke="${ink}" fill="none" stroke-width="1.4" opacity=".7">
      <path d="M3 7q9 -4 18 0M3 13q9 -4 18 0M3 19q9 -4 18 0"/></g>
      <path d="M12 2 l3 3 l-3 3 l-3 -3z" fill="${ink}" opacity=".85"/></svg>`;
  }
  return '';
}

function preview(groupKey, id, item) {
  if (groupKey === 'color') {
    return `<span class="swatch" style="background:linear-gradient(140deg, ${item.body}, ${item.dark})">
      ${swatchPattern(item)}</span>`;
  }
  if (groupKey === 'crown') {
    if (id === 'none') return `<span class="swatch" style="background:rgba(255,255,255,.06)">—</span>`;
    return `<span class="swatch" style="background:rgba(255,255,255,.06)">
      <svg viewBox="${CROWN_BOX[id]}">${crownSvg(id, 0)}</svg>
    </span>`;
  }
  if (id === 'none') return `<span class="swatch" style="background:rgba(255,255,255,.06)">—</span>`;
  return `<span class="swatch" style="background:radial-gradient(circle, ${item.color}55, rgba(255,255,255,.05))">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="${item.color}"/></svg>
  </span>`;
}

function renderShop() {
  shopEl.textContent = '';

  for (const group of GROUPS) {
    const box = document.createElement('div');
    box.className = 'shop-group';

    const h = document.createElement('h3');
    h.className = 'shop-title';
    h.textContent = t(group.title);
    box.appendChild(h);

    const row = document.createElement('div');
    row.className = 'shop-row';

    for (const [id, item] of Object.entries(group.items)) {
      const sahip = owned[group.key].includes(id);
      const secili = eq[group.key] === id;
      const kilit = item.needLevel && level < item.needLevel;

      const deniyor = deneme?.group === group.key && deneme.id === id;

      const btn = document.createElement('button');
      btn.className = 'shop-item' + (secili ? ' on' : '') + (deniyor ? ' trying' : '') +
                      ((!sahip && (kilit || coins < item.price)) ? ' locked' : '');
      btn.innerHTML = `
        ${preview(group.key, id, item)}
        <span class="shop-name"></span>
        <span class="${sahip ? 'shop-price owned' : (kilit ? 'shop-need' : 'shop-price')}"></span>
      `;
      btn.querySelector('.shop-name').textContent = t(item.nameKey);

      const etiket = btn.querySelector('.shop-price, .shop-need');
      if (sahip) {
        etiket.textContent = t(secili ? 'equipped' : 'owned');
      } else if (kilit) {
        etiket.textContent = t('needLevel', { level: item.needLevel });
      } else {
        etiket.innerHTML = `${coinIkon()} ${format(item.price)}`;
      }

      btn.addEventListener('click', () => pickItem(group.key, id, item));
      row.appendChild(btn);
    }

    box.appendChild(row);
    shopEl.appendChild(box);
  }
}

function pickItem(groupKey, id, item) {
  if (busy) return;

  if (owned[groupKey].includes(id)) {
    deneme = null;
    eq[groupKey] = id;
    shopMsgEl.hidden = true;
    haptic.tap();
    persist();
    renderShop();
    render();
    return;
  }

  deneme = { group: groupKey, id, item };
  shopMsgEl.hidden = true;
  haptic.tap();
  renderShop();
  render();
}

async function confirmBuy() {
  if (busy || !deneme) return;
  const { group: groupKey, id, item } = deneme;

  if (item.needLevel && level < item.needLevel) {
    return uyar(t('lockedMsg', { level: item.needLevel }));
  }
  if (coins < item.price) return reddet();

  busy = true;
  const sonuc = await spendPoints(item.price);
  busy = false;

  if (!sonuc.ok) {
    coins = sonuc.total;
    render();
    return reddet();
  }

  deneme = null;

  coins = sonuc.total;
  owned[groupKey].push(id);
  eq[groupKey] = id;
  haptic.success();
  shopMsgEl.hidden = true;
  showFloater(t('bought', { name: t(item.nameKey) }));

  persist();
  renderShop();
  render();
}

function render() {
  const kusam = gorunum();
  const pal = COLORS[kusam.color] || COLORS.violet;

  petArt.innerHTML = level <= EGG_UNTIL
    ? eggSvg(level, pal)
    : dragonSvg(growth(), pal, kusam.crown, mood());

  renderTryBar();
  stageNameEl.textContent = stageLabel();
  levelEl.textContent = format(level);
  coinsEl.textContent = format(coins);

  renderEffect();

  const doyum = fullness();
  hungerFill.style.width = `${doyum}%`;
  hungerFill.classList.toggle('low', doyum < 25);
  hungerValue.textContent = `${doyum}%`;

  const enSon = level >= MAX_LEVEL;
  const gereken = xpNeeded(level);
  xpFill.style.width = enSon ? '100%' : `${(xp / gereken) * 100}%`;
  xpValue.textContent = enSon ? `${MAX_LEVEL}` : `${xp}/${gereken}`;

  const cost = feedCost(level);
  feedCostEl.textContent = format(cost);
  feedBtn.disabled = busy || enSon || coins < cost;

  hintEl.classList.remove('warn');
  if (enSon) hintEl.textContent = t('maxLevel');
  else if (coins < cost) { hintEl.textContent = t('notEnough'); hintEl.classList.add('warn'); }
  else if (doyum < 25) hintEl.textContent = t('hungryHint');
  else hintEl.textContent = t('hint');
}

function renderTryBar() {
  if (!deneme) {
    tryBar.hidden = true;
    return;
  }

  const { item } = deneme;
  const kilit = item.needLevel && level < item.needLevel;
  const parasiz = coins < item.price;

  tryBar.hidden = false;
  tryName.textContent = t(item.nameKey);
  tryBuy.innerHTML = `${coinIkon()} ${format(item.price)}`;
  tryBuy.disabled = busy || kilit || parasiz;

  tryNote.classList.toggle('warn', !!(kilit || parasiz));
  if (kilit) tryNote.textContent = t('lockedMsg', { level: item.needLevel });
  else if (parasiz) tryNote.textContent = t('tryNoCoins');
  else tryNote.textContent = t('tryHint');
}

function renderEffect() {
  const secili = gorunum().effect;
  const fx = EFFECTS[secili] || EFFECTS.none;
  fxEl.textContent = '';
  fxEl.className = 'fx';

  if (secili === 'none') return;

  if (fx.kind === 'aura') {
    fxEl.classList.add('aura');
    fxEl.style.setProperty('--aura', fx.color);
    return;
  }

  if (fx.kind === 'storm') fxEl.classList.add('storm');

  const adet = fx.kind === 'storm' ? 6 : 14;
  for (let i = 0; i < adet; i++) {
    const s = document.createElement('span');
    const boy = fx.kind === 'storm' ? 3 : 3 + Math.random() * 4;
    s.style.cssText = `
      left:${8 + Math.random() * 84}%;
      bottom:${6 + Math.random() * 26}%;
      width:${boy}px;
      height:${fx.kind === 'storm' ? 16 : boy}px;
      background:${fx.color};
      --dur:${(2.2 + Math.random() * 2.4).toFixed(2)}s;
      --delay:${(Math.random() * 2.4).toFixed(2)}s;`;
    fxEl.appendChild(s);
  }
}

function showFloater(text) {
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = '50%';
  el.style.top = '36%';
  petStage.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

const format = (n) => Number(n).toLocaleString(locale());

const coinIkon = () => '<img class="coin-ic" src="../../assets/coin.png" alt="">';
