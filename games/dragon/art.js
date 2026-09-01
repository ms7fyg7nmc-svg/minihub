
import { palet } from './data.js?v106';
import { CONFIG, growthRatio } from './config.js?v106';

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

  /* Yuz ogeleri (kesikler, boya, ruhani isaretler) artik gercek Scenario
     PNG'leri - alnin ortasina tek basina oturanlar icin "alin", yanaga
     (goz disi/alti) simetrik oturanlar icin "yanakSag"/"yanakSol". */
  alin: { x: 511, y: 300 },
  yanakSag: { x: 655, y: 405 },
  yanakSol: { x: 367, y: 405 },
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

  head: {
    tiny: {
      yol: 'assets/crown-tiny.png',
      kare: 1024, x0: 117, y0: 137, x1: 904, y1: 879,
      kok: { x: 510, y: 879 }, en: 0.40,
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
      kare: 1024, x0: 159, y0: 94, x1: 865, y1: 928,
      kok: { x: 512, y: 928 }, en: 0.48,
    },
    king: {
      yol: 'assets/crown-king.png',
      kare: 1024, x0: 118, y0: 126, x1: 922, y1: 834,
      kok: { x: 520, y: 834 }, en: 0.53,
    },
    celestial: {
      yol: 'assets/crown-celestial.png',
      kare: 1024, x0: 127, y0: 89, x1: 885, y1: 948,
      kok: { x: 506, y: 948 }, en: 0.50,
    },
  },

  necklace: {
    fang: {
      yol: 'assets/necklace-fang.png',
      kare: 1024, x0: 205, y0: 131, x1: 821, y1: 904,
      kok: { x: 512, y: 380 }, en: 0.22,
    },
    bronze: {
      yol: 'assets/necklace-bronze.png',
      kare: 1024, x0: 226, y0: 180, x1: 802, y1: 835,
      kok: { x: 514, y: 391 }, en: 0.22,
    },
    sapphire: {
      yol: 'assets/necklace-sapphire.png',
      kare: 1024, x0: 181, y0: 65, x1: 843, y1: 796,
      kok: { x: 512, y: 293 }, en: 0.231,
    },
    flame: {
      yol: 'assets/necklace-flame.png',
      kare: 1024, x0: 212, y0: 164, x1: 804, y1: 880,
      kok: { x: 508, y: 359 }, en: 0.231,
    },
    royal: {
      yol: 'assets/necklace-royal.png',
      kare: 1024, x0: 111, y0: 181, x1: 919, y1: 1022,
      kok: { x: 515, y: 354 }, en: 0.253,
    },
    celestial: {
      yol: 'assets/necklace-celestial.png',
      kare: 1024, x0: 91, y0: 63, x1: 945, y1: 878,
      kok: { x: 518, y: 311 }, en: 0.253,
    },
  },

  /* Yuz ogeleri: eskiden govde/kafa merkezli olmayan, elle yazilmis
     vektor koordinatlarla ciziliyordu ve onden bakan kafaya hicbir
     zaman gercekten oturmuyordu (bkz. eski faceSvg()). Artik digerleri
     gibi gercek Scenario PNG'leri, ayni kok/en/anchor sistemiyle
     yerlestiriliyor. `yer` hangi GORSEL ceapasina (alin/tepe/yanak)
     oturacagini, `cift` true ise oge iki yanaga simetrik (ayna) iki kez
     cizilir (tek govde noktasi degil). */
  face: {
    scar: {
      yol: 'assets/face-scar.png',
      kare: 1024, x0: 287, y0: 248, x1: 745, y1: 768,
      kok: { x: 516, y: 508 }, en: 0.22, yer: 'yanak',
    },
    twinScar: {
      yol: 'assets/face-twinscar.png',
      kare: 1024, x0: 257, y0: 256, x1: 767, y1: 775,
      kok: { x: 512, y: 515 }, en: 0.20, yer: 'yanak', cift: true,
    },
    warPaint: {
      yol: 'assets/face-warpaint.png',
      kare: 1024, x0: 195, y0: 290, x1: 821, y1: 706,
      kok: { x: 508, y: 498 }, en: 0.26, yer: 'yanak', cift: true,
    },
    darkMark: {
      yol: 'assets/face-darkmark.png',
      kare: 1024, x0: 210, y0: 71, x1: 817, y1: 960,
      kok: { x: 513, y: 515 }, en: 0.22, yer: 'alin',
    },
    flameFace: {
      yol: 'assets/face-flame.png',
      kare: 1024, x0: 286, y0: 252, x1: 750, y1: 749,
      kok: { x: 518, y: 500 }, en: 0.20, yer: 'alin',
    },
    runeFace: {
      yol: 'assets/face-rune.png',
      kare: 1024, x0: 254, y0: 156, x1: 769, y1: 887,
      kok: { x: 511, y: 521 }, en: 0.20, yer: 'alin',
    },
    demon: {
      yol: 'assets/face-demon.png',
      kare: 1024, x0: 208, y0: 268, x1: 815, y1: 747,
      kok: { x: 511, y: 507 }, en: 0.32, yer: 'tepe',
    },
    kingMark: {
      yol: 'assets/face-kingmark.png',
      kare: 1024, x0: 146, y0: 124, x1: 879, y1: 880,
      kok: { x: 512, y: 502 }, en: 0.22, yer: 'alin',
    },
  },
};

function katmanSec(kategori, id) {
  const grup = KATMAN[kategori];
  if (!grup) return null;
  return grup[id] || grup[VARSAYILAN[kategori]] || null;
}

const VARSAYILAN = { wings: 'leather' };

export function dragonAssetUrls(look) {
  const urls = [GORSEL.yol];
  const kanat = katmanSec('wings', look?.wings);
  const tac = katmanSec('head', look?.head);
  const kolye = katmanSec('necklace', look?.necklace);
  const yuz = katmanSec('face', look?.face);
  if (kanat) urls.push(kanat.yol);
  if (tac) urls.push(tac.yol);
  if (kolye) urls.push(kolye.yol);
  if (yuz) urls.push(yuz.yol);
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

/* Yuz ogeleri KATMAN.face'teki `yer` alanina gore tek (alin/tepe) ya da
   iki yanaga simetrik-aynali (cift: true) cizilir - bkz. KATMAN.face
   tanimlarindaki not. */
function yuzKatmanCiz(k, anchors, gw, renkId) {
  if (!k) return '';
  if (k.cift) {
    return katmanCiz(k, anchors.yanakSag[0], anchors.yanakSag[1], gw, renkId)
      + katmanCiz(k, anchors.yanakSol[0], anchors.yanakSol[1], gw, renkId, true);
  }
  const nokta = k.yer === 'yanak' ? anchors.yanakSag
    : k.yer === 'tepe' ? anchors.tepe
    : anchors.alin;
  return katmanCiz(k, nokta[0], nokta[1], gw, renkId);
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
  const [tepeX, tepeY] = nokta(GORSEL.tepe);
  const [boyunX, boyunY] = nokta(GORSEL.boyun);
  const yuzAnchors = {
    alin: nokta(GORSEL.alin),
    yanakSag: nokta(GORSEL.yanakSag),
    yanakSol: nokta(GORSEL.yanakSol),
    tepe: [tepeX, tepeY],
  };
  const kanat = katmanSec('wings', look?.wings);
  const tac = katmanSec('head', look?.head);
  const kolye = katmanSec('necklace', look?.necklace);
  const yuz = katmanSec('face', look?.face);

  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      ${(suzgec || renkTanim) ? `<defs>${suzgec}${renkTanim}</defs>` : ''}
      <g ${suzgec ? `filter="url(#ruh${uid})"` : ''}>
        ${kanat ? katmanCiz(kanat, omuzSolX, omuzSolY, hedefGen, renkId, true) : ''}
        ${kanat ? katmanCiz(kanat, omuzSagX, omuzSagY, hedefGen, renkId) : ''}
        <image href="${GORSEL.yol}" x="${ix.toFixed(1)}" y="${iy.toFixed(1)}"
               width="${olcek.toFixed(1)}" height="${olcek.toFixed(1)}"
               preserveAspectRatio="xMidYMid meet"
               ${renkId ? `filter="url(#${renkId})"` : ''}/>
        ${yuzKatmanCiz(yuz, yuzAnchors, hedefGen, renkId)}
        ${kolye ? katmanCiz(kolye, boyunX, boyunY, hedefGen, renkId) : ''}
        ${tac ? katmanCiz(tac, tepeX, tepeY, hedefGen, renkId) : ''}
      </g>
    </svg>`;
}

export function dragonSvg(level, look, mood = 'happy') {
  const pal = palet(look);
  if (level <= CONFIG.EGG_UNTIL) return yumurtaSvg(level, pal);

  return gorselEjderha(level, mood, look);
}
