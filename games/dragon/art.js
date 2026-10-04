
import { palet } from './data.js?v212';
import { CONFIG, growthRatio } from './config.js?v212';
import { TURLER, turYolu, turBul } from './turler.js?v212';

export { TURLER };

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

/* EJDERHA GORSELI

   Eskiden govde tek bir noter PNG'ydi ve uzerine kanat/tac/kolye/yuz
   katmanlari hizalanip govde rengi hue-rotate ile degistiriliyordu.
   O sistem kaldirildi: ayri ayri uretilen katmanlar hicbir zaman tek
   bir karakter gibi durmadi (boynuz kafanin ustunde yuzuyor, yuz
   katmani govdenin kendi yuzune biniyordu).

   Simdi her tur kendi butun sprite'i. Kanat, boynuz, kuyruk, yuz -
   hepsi tek gorselin icinde ve dogru cizilmis durumda. Kozmetik
   katalogu (data.js) yerinde duruyor ama cizime karismiyor. */

/* Sprite kare ve sikica kirpilmis; 200'luk viewBox icinde buyume
   yayina gore 168'den 198'e aciliyor, ayaklar hep ayni zemin
   cizgisinde (y=194) kaliyor ki ejderha buyurken yukari kaymasin. */
const ZEMIN = 194;

function turSvg(turId, level, mood, boy) {
  const uid = ++uidSayaci;
  const g = growthRatio(level);
  const en = 168 + g * 30;
  const x = 100 - en / 2;
  const y = ZEMIN - en;

  const suzgec = mood === 'sad'
    ? `<defs><filter id="ruh${uid}"><feColorMatrix type="saturate" values="0.35"/></filter></defs>`
    : '';

  return `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      ${suzgec}
      <image href="${turYolu(turBul(turId).id, boy)}"
             x="${x.toFixed(1)}" y="${y.toFixed(1)}"
             width="${en.toFixed(1)}" height="${en.toFixed(1)}"
             preserveAspectRatio="xMidYMid meet"
             ${mood === 'sad' ? `filter="url(#ruh${uid})"` : ''}/>
    </svg>`;
}

/* Onbellege alinacak gorseller: sadece aktif ejderhanin sahne boyu. */
export function dragonAssetUrls(look) {
  return [turYolu(turBul(look?.tur).id, 448)];
}

/* boy: hangi sprite dosyasi cekilsin. Yuva seridi 160 istiyor,
   sahne varsayilan 448'i kullaniyor. */
export function dragonSvg(level, look, mood = 'happy', boy = 448) {
  if (level <= CONFIG.EGG_UNTIL) return yumurtaSvg(level, palet(look));
  return turSvg(look?.tur, level, mood, boy);
}
