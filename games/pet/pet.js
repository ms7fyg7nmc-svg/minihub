/* Ordegim (My Duck)

   Hub'daki diger oyunlarda kazandigin jetonlari burada harciyorsun: ordegi
   besliyorsun, besledikce buyuyor ve gorunumu degisiyor.

   ONEMLI TASARIM KARARI: bu oyun jeton URETMEZ, sadece HARCAR.
   Uretseydi oyuncular oynamadan jeton biriktirebilirdi ve ilerideki token
   ekonomisi daha dogmadan sisirdi. Buradaki odul jeton degil, karakterin
   kendisi - seviye atladikca gorunumu degisiyor ve hub'da gorunuyor.

   Zamanla acikiyor: son beslemeden sonra doyum yavas yavas dusuyor. Bu,
   oyuncuya ertesi gun geri gelmek icin bir sebep veriyor - ve geri gelince
   jetona ihtiyaci oldugu icin diger oyunlari oynuyor. Dongu boyle kapaniyor. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js';
import { getPoints, spendPoints, saveState, loadState } from '../../js/store.js';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js';

const GAME_ID = 'pet';

const FEED_BASE = 10;        /* 1. seviyede bir ogun kac jeton */
const FEED_STEP = 5;         /* her seviyede ogun kac jeton pahalilasir */
const FULL_HOURS = 12;       /* doyum kac saatte sifira iner */
const XP_BASE = 3;           /* 1. seviyede kac ogun gerekiyor */

registerTexts(GAME_ID, {
  title: 'Ejderham',
  level: 'SEVİYE',
  coins: 'JETON',
  fullness: 'Doyum',
  growth: 'Gelişim',
  feed: 'Besle',
  backToHub: "Hub'a dön",
  hint: 'Diğer oyunlarda jeton kazan, burada ejderhanı besle.',
  notEnough: 'Yeterli jetonun yok. Bir oyun oynayıp geri gel.',
  hungryHint: 'Ejderhan acıktı, beslenmeyi bekliyor.',
  levelUp: 'Seviye {level}!',
  'stage.egg': 'Yumurta',
  'stage.hatch': 'Yeni çıktı',
  'stage.young': 'Yavru Ejderha',
  'stage.dragon': 'Ejderha',
  'stage.elder': 'Kadim Ejderha',
});

/* ---------- Karakterin evrim asamalari ---------- */

const STAGES = [
  { from: 1,  key: 'egg' },
  { from: 3,  key: 'hatch' },
  { from: 6,  key: 'young' },
  { from: 11, key: 'dragon' },
  { from: 20, key: 'elder' },
];

function stageFor(level) {
  let found = STAGES[0];
  for (const s of STAGES) if (level >= s.from) found = s;
  return found;
}

/* Gozler ruh haline gore degisir: tok ve mutluysa yuvarlak, acsa cizgi */
function eyes(mood, leftX, rightX, y, r) {
  if (mood === 'sad') {
    return `
      <path d="M${leftX - r} ${y} q${r} ${r * 1.1} ${r * 2} 0" fill="none"
            stroke="#3a2a4d" stroke-width="3" stroke-linecap="round"/>
      <path d="M${rightX - r} ${y} q${r} ${r * 1.1} ${r * 2} 0" fill="none"
            stroke="#3a2a4d" stroke-width="3" stroke-linecap="round"/>`;
  }
  return `
    <circle cx="${leftX}" cy="${y}" r="${r}" fill="#3a2a4d"/>
    <circle cx="${rightX}" cy="${y}" r="${r}" fill="#3a2a4d"/>
    <circle cx="${leftX + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.34}" fill="#fff"/>
    <circle cx="${rightX + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.34}" fill="#fff"/>`;
}

/* Her asama icin cizim. Hepsi 120x120 kutuda, ayni gorsel dilde:
   mor govde, acik karin, altin boynuz ve tirnaklar. */
const ART = {
  egg: () => `
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="68" rx="33" ry="41" fill="#e9dcf7"/>
      <ellipse cx="60" cy="68" rx="33" ry="41" fill="none" stroke="#c9b2e8" stroke-width="2"/>
      <ellipse cx="48" cy="52" rx="7" ry="5" fill="#cbb4ea"/>
      <ellipse cx="70" cy="76" rx="9" ry="6" fill="#cbb4ea"/>
      <ellipse cx="55" cy="90" rx="6" ry="4" fill="#cbb4ea"/>
      <ellipse cx="50" cy="46" rx="10" ry="6" fill="#fff" opacity=".55"/>
    </svg>`,

  hatch: (mood) => `
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M27 84a33 33 0 0 0 66 0z" fill="#e9dcf7"/>
      <path d="M27 84l9-8 8 7 9-8 8 7 9-8 8 7 9-8 5 4v6z" fill="#cbb4ea"/>
      <path d="M48 40l-5-12 12 6z" fill="#f5b942"/>
      <path d="M72 40l5-12-12 6z" fill="#f5b942"/>
      <circle cx="60" cy="58" r="24" fill="#a978e8"/>
      <ellipse cx="60" cy="66" rx="13" ry="9" fill="#d9c4f5"/>
      ${eyes(mood, 52, 55, 55, 4.5)}
      <path d="M54 68q6 5 12 0" fill="none" stroke="#3a2a4d" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,

  young: (mood) => `
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M88 84q16 2 16 14-12 2-18-6z" fill="#8b5cd6"/>
      <ellipse cx="58" cy="80" rx="29" ry="24" fill="#a978e8"/>
      <ellipse cx="58" cy="86" rx="17" ry="13" fill="#d9c4f5"/>
      <path d="M30 62q-14-10-18 2 10 6 16 12z" fill="#8b5cd6"/>
      <circle cx="60" cy="46" r="22" fill="#b083ec"/>
      <path d="M49 28l-5-13 13 7z" fill="#f5b942"/>
      <path d="M71 28l5-13-13 7z" fill="#f5b942"/>
      ${eyes(mood, 52, 68, 44, 4.6)}
      <path d="M54 55q6 5 12 0" fill="none" stroke="#3a2a4d" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M46 102h10M62 102h10" stroke="#f5b942" stroke-width="5" stroke-linecap="round"/>
    </svg>`,

  dragon: (mood) => `
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M90 80q22 0 22 16-16 3-24-8z" fill="#8b5cd6"/>
      <path d="M26 50q-20-12-24 4 14 8 22 18z" fill="#8b5cd6"/>
      <path d="M94 50q20-12 24 4-14 8-22 18z" fill="#8b5cd6"/>
      <ellipse cx="60" cy="80" rx="31" ry="25" fill="#a978e8"/>
      <ellipse cx="60" cy="86" rx="18" ry="14" fill="#d9c4f5"/>
      <circle cx="60" cy="44" r="23" fill="#b083ec"/>
      <path d="M48 25l-6-14 14 8z" fill="#f5b942"/>
      <path d="M72 25l6-14-14 8z" fill="#f5b942"/>
      ${eyes(mood, 52, 68, 42, 4.8)}
      <path d="M53 54q7 6 14 0" fill="none" stroke="#3a2a4d" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M46 104h11M63 104h11" stroke="#f5b942" stroke-width="5.5" stroke-linecap="round"/>
    </svg>`,

  elder: (mood) => `
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M90 80q23 0 23 17-17 3-25-9z" fill="#8b5cd6"/>
      <path d="M24 48q-22-13-24 5 15 8 23 19z" fill="#7b4fd0"/>
      <path d="M96 48q22-13 24 5-15 8-23 19z" fill="#7b4fd0"/>
      <ellipse cx="60" cy="80" rx="32" ry="26" fill="#a978e8"/>
      <ellipse cx="60" cy="86" rx="19" ry="14" fill="#e6d6fa"/>
      <circle cx="60" cy="44" r="24" fill="#b083ec"/>
      <path d="M47 24l-6-15 15 9z" fill="#f5b942"/>
      <path d="M73 24l6-15-15 9z" fill="#f5b942"/>
      ${eyes(mood, 52, 68, 42, 5)}
      <path d="M53 54q7 6 14 0" fill="none" stroke="#3a2a4d" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M46 105h11M63 105h11" stroke="#f5b942" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M44 16l6 8 10-11 10 11 6-8 2 13H42z" fill="#f5b942"
            stroke="#e09a1f" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="60" cy="14" r="2.6" fill="#fff"/>
    </svg>`,
};

/* ---------- Ilerleme kurallari ---------- */

const feedCost = (level) => FEED_BASE + (level - 1) * FEED_STEP;
const xpNeeded = (level) => XP_BASE + Math.floor(level / 2);

const petStage = document.getElementById('pet-stage');
const petArt = document.getElementById('pet-art');
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

let level = 1;
let xp = 0;
let lastFed = Date.now();
let coins = 0;
let busy = false;

/* ---------- Baslangic ---------- */

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
document.addEventListener('langchange', () => {
  applyStaticTexts();
  render();
});

bootstrap();

/* Doyum zamanla dustugu icin ekrani dakikada bir tazeliyoruz */
setInterval(render, 60000);

async function bootstrap() {
  const saved = await loadState(GAME_ID);
  if (saved && Number(saved.level) > 0) {
    level = Number(saved.level) || 1;
    xp = Number(saved.xp) || 0;
    lastFed = Number(saved.lastFed) || Date.now();
  }
  coins = await getPoints();
  render();
}

function goHome() {
  window.location.href = '../../index.html';
}

function persist() {
  saveState(GAME_ID, { level, xp, lastFed });
}

/* ---------- Doyum ---------- */

/* Son beslemeden bu yana gecen sureye gore 0-100 arasi bir deger */
function fullness() {
  const gecenSaat = (Date.now() - lastFed) / 3_600_000;
  const oran = 1 - gecenSaat / FULL_HOURS;
  return Math.max(0, Math.min(100, Math.round(oran * 100)));
}

function mood() {
  return fullness() < 25 ? 'sad' : 'happy';
}

/* ---------- Besleme ---------- */

async function feed() {
  if (busy) return;
  const cost = feedCost(level);

  if (coins < cost) {
    haptic.error();
    hintEl.textContent = t('notEnough');
    hintEl.classList.add('warn');
    return;
  }

  busy = true;
  feedBtn.disabled = true;

  const sonuc = await spendPoints(cost);
  if (!sonuc.ok) {
    /* Baska bir sekmede harcanmis olabilir - bakiyeyi tazeleyip birak */
    coins = sonuc.total;
    haptic.error();
    hintEl.textContent = t('notEnough');
    hintEl.classList.add('warn');
    busy = false;
    render();
    return;
  }

  coins = sonuc.total;
  lastFed = Date.now();
  xp++;

  const seviyeAtladi = xp >= xpNeeded(level);
  if (seviyeAtladi) {
    xp = 0;
    level++;
  }

  haptic.success();
  petStage.classList.add(seviyeAtladi ? 'levelup' : 'fed');
  setTimeout(() => petStage.classList.remove('fed', 'levelup'), 950);
  if (seviyeAtladi) showFloater(t('levelUp', { level: format(level) }));

  persist();
  busy = false;
  render();
}

function poke() {
  if (petStage.classList.contains('poked')) return;
  haptic.tap();
  petStage.classList.add('poked');
  setTimeout(() => petStage.classList.remove('poked'), 470);
}

/* ---------- Ekrana cizme ---------- */

function render() {
  const stage = stageFor(level);
  petArt.innerHTML = ART[stage.key](mood());
  stageNameEl.textContent = t(`stage.${stage.key}`);

  levelEl.textContent = format(level);
  coinsEl.textContent = format(coins);

  const doyum = fullness();
  hungerFill.style.width = `${doyum}%`;
  hungerFill.classList.toggle('low', doyum < 25);
  hungerValue.textContent = `${doyum}%`;

  const gereken = xpNeeded(level);
  xpFill.style.width = `${(xp / gereken) * 100}%`;
  xpValue.textContent = `${xp}/${gereken}`;

  const cost = feedCost(level);
  feedCostEl.textContent = format(cost);
  feedBtn.disabled = busy || coins < cost;

  /* Ipucu satiri duruma gore konusur */
  hintEl.classList.remove('warn');
  if (coins < cost) {
    hintEl.textContent = t('notEnough');
    hintEl.classList.add('warn');
  } else if (doyum < 25) {
    hintEl.textContent = t('hungryHint');
  } else {
    hintEl.textContent = t('hint');
  }
}

function showFloater(text) {
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = '50%';
  el.style.top = '40%';
  petStage.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

const format = (n) => Number(n).toLocaleString(locale());
