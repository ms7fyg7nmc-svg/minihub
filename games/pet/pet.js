/* Ejderham

   Hub'daki diger oyunlarda kazandigin jetonlari burada harciyorsun:
   ejderhani besliyorsun, seviye atlatiyorsun ve gorunumunu degistiriyorsun.

   IKI TASARIM KARARI:

   1) Bu oyun jeton URETMEZ, sadece HARCAR. Uretseydi oyuncular oynamadan
      jeton biriktirir, ilerideki token ekonomisi daha dogmadan sisirdi.

   2) Ejderhanin gorunumu 99 seviye boyunca SUREKLI degisir. Onceki surumde
      5 sabit asama vardi ve oyuncu birkac beslemede sonuncusuna ulasip
      degisimin bittigini goruyordu. Simdi govde, kanat, boynuz ve sirt
      dikenleri seviyeyle birlikte kademeli buyuyor - her seviye atlayista
      gozle gorulur bir fark oluyor.

   Kozmetikler (renk, tac, efekt) asil jeton harcama yeri. Buyuk oyunlarda
   gelirin buyuk kismi kozmetikten geliyor ve insanlari harcamaya iten sey
   guc degil kendini ifade etme - burada da odul guc degil, gorunum. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js';
import { getPoints, spendPoints, saveState, loadState } from '../../js/store.js';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js';

const GAME_ID = 'pet';

const MAX_LEVEL = 99;
const FULL_HOURS = 12;   /* doyum kac saatte sifira iner */
const EGG_UNTIL = 4;     /* bu seviyeye kadar hala yumurta */

const feedCost = (level) => 8 + Math.floor(level * 1.5);
const xpNeeded = (level) => 2 + Math.floor(level / 8);

registerTexts(GAME_ID, {
  title: 'Ejderham',
  level: 'SEVİYE',
  coins: 'JETON',
  fullness: 'Doyum',
  growth: 'Gelişim',
  feed: 'Besle',
  backToHub: "Hub'a dön",
  tabCare: 'Bakım',
  tabShop: 'Dükkân',
  hint: 'Diğer oyunlarda jeton kazan, burada ejderhanı besle.',
  notEnough: 'Yeterli jetonun yok. Bir oyun oynayıp geri gel.',
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

  /* Dukkan urun adlari */
  colViolet: 'Mor',
  colCrimson: 'Kızıl',
  colEmerald: 'Zümrüt',
  colIce: 'Buz',
  colGold: 'Altın',
  colShadow: 'Gölge',
  colInferno: 'Ateş',
  crNone: 'Yok',
  crSilver: 'Gümüş',
  crGold: 'Altın',
  crRuby: 'Yakut',
  crAncient: 'Kadim',
  efNone: 'Yok',
  efEmbers: 'Kıvılcım',
  efFlame: 'Alev',
  efStorm: 'Şimşek',
  efAura: 'Hale',
  efStars: 'Yıldız',
});

/* ---------- Kozmetikler ---------- */

/* name yerine nameKey tutuluyor: isimler cizim koduyla degil ceviri dosyasiyla
   geliyor, boylece dukkan da diger metinler gibi 4 dilde calisiyor. */

const COLORS = {
  violet:  { price: 0,    nameKey: 'colViolet',  body: '#a978e8', dark: '#7b4fd0', belly: '#e6d6fa', horn: '#f5b942' },
  crimson: { price: 400,  nameKey: 'colCrimson', body: '#e05a52', dark: '#a8342d', belly: '#f7cdc6', horn: '#f5b942' },
  emerald: { price: 700,  nameKey: 'colEmerald', body: '#3fbf7a', dark: '#248a53', belly: '#cdf0dd', horn: '#f5d76e' },
  ice:     { price: 1200, nameKey: 'colIce',     body: '#5fc8e8', dark: '#2a8bb0', belly: '#d6f2fb', horn: '#eaf7ff' },
  gold:    { price: 2000, nameKey: 'colGold',    body: '#e8b13c', dark: '#b07d16', belly: '#fbe9c0', horn: '#fff3d0' },
  shadow:  { price: 3200, nameKey: 'colShadow',  body: '#4a4560', dark: '#2b2739', belly: '#8a83a8', horn: '#c4b6f0' },
  inferno: { price: 5000, nameKey: 'colInferno', body: '#f2703a', dark: '#a83318', belly: '#ffd9a8', horn: '#ffe066', needLevel: 40 },
};

const CROWNS = {
  none:    { price: 0,    nameKey: 'crNone' },
  silver:  { price: 600,  nameKey: 'crSilver',  metal: '#d8dde8', edge: '#9aa2b5', gem: null },
  gold:    { price: 1500, nameKey: 'crGold',    metal: '#f5c74a', edge: '#c9922a', gem: null },
  ruby:    { price: 3000, nameKey: 'crRuby',    metal: '#f5c74a', edge: '#c9922a', gem: '#e2544e' },
  ancient: { price: 6000, nameKey: 'crAncient', metal: '#c9b7f5', edge: '#8b6fd6', gem: '#6ee7a8', needLevel: 50 },
};

const EFFECTS = {
  none:   { price: 0,    nameKey: 'efNone' },
  embers: { price: 500,  nameKey: 'efEmbers', color: '#f5b942', kind: 'rise' },
  flame:  { price: 1400, nameKey: 'efFlame',  color: '#f2703a', kind: 'rise' },
  storm:  { price: 2800, nameKey: 'efStorm',  color: '#8fd0ff', kind: 'storm' },
  aura:   { price: 4200, nameKey: 'efAura',   color: '#c079f2', kind: 'aura' },
  stars:  { price: 6500, nameKey: 'efStars',  color: '#ffe066', kind: 'rise', needLevel: 60 },
};

/* ---------- Ejderha cizimi ---------- */

/* Gozler: tok ve mutluysa parlak, acsa yorgun */
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

function crownSvg(key, headTop) {
  const c = CROWNS[key];
  if (!c || key === 'none') return '';
  const gem = c.gem
    ? `<circle cx="0" cy="${headTop - 15}" r="3.6" fill="${c.gem}"/>`
    : `<circle cx="0" cy="${headTop - 15}" r="2.6" fill="#fff" opacity=".9"/>`;
  return `
    <path d="M-19 ${headTop} l4 -12 l7 7 l8 -12 l8 12 l7 -7 l4 12 z"
          fill="${c.metal}" stroke="${c.edge}" stroke-width="1.6" stroke-linejoin="round"/>
    ${gem}`;
}

/* Yumurta: seviye yukseldikce catlaklar artar */
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

/* Ejderha. g = 0..1 arasi buyume orani (seviye 5 -> 99).
   Govde, kanat, boynuz ve diken sayisi bu orana gore buyuyor. */
function dragonSvg(g, pal, crownKey, mood) {
  /* Olcekler seviye 99'da bile 200x200'luk kadraja sigacak sekilde secildi:
     en genis nokta kanat ucu (x = ±118), yani 118 * wing * s <= ~96.
     Yavru hali yaklasik yarim genislikte basliyor, aradaki fark gorunur. */
  const s = 0.62 + g * 0.26;     /* genel olcek   0.62 -> 0.88 */
  const wing = 0.60 + g * 0.32;  /* kanat acikligi 0.60 -> 0.92 */
  const horn = 0.60 + g * 0.38;  /* boynuz uzunlugu 0.60 -> 0.98 */
  const spikeCount = Math.round(4 + g * 8);

  /* Sirt dikenleri.
     Govdenin ust kenari kabaca su egri: y = -32 + (x/34)^2 * 24.
     Her dikenin TABANINI kenarin altina, ucunu ustune koyuyoruz; dikenler
     govdeden ONCE cizildigi icin taban kisimlari govdenin arkasinda kalir ve
     sirttan cikiyormus gibi gorunur. Havada duran ucgen kalmaz. */
  const sirtY = (x) => -32 + (x / 34) ** 2 * 24;
  let spikes = '';
  const perSide = Math.max(2, Math.round(spikeCount / 2));
  for (let taraf = -1; taraf <= 1; taraf += 2) {
    for (let i = 0; i < perSide; i++) {
      /* Boyun ve bas ustlerini ortmesin diye orta serit bos birakiliyor:
         dikenler her iki omuzda ice dogru kisalarak diziliyor. */
      const p = perSide === 1 ? 0 : i / (perSide - 1);
      const x = taraf * (11 + p * 21);
      const uzun = 1 - p * 0.55;      /* disa dogru daha uzun */
      const kenar = sirtY(x);
      const uc = kenar - (5 + uzun * 9);
      const w = 3.6 + uzun * 1.6;
      spikes += `<path d="M${(x - w).toFixed(1)} ${(kenar + 9).toFixed(1)}
                          L${x.toFixed(1)} ${uc.toFixed(1)}
                          L${(x + w).toFixed(1)} ${(kenar + 9).toFixed(1)} Z" fill="${pal.horn}"/>`;
    }
  }

  /* Ayaklar: govdenin alt kenarini ortecek sekilde, pencelerle */
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
        <path d="M-34 2 Q-38 -22 -14 -30 Q14 -34 34 -12 Q45 10 28 29 Q2 40 -18 31 Q-32 22 -34 2 Z"
              fill="${pal.body}"/>
        <!-- Yan golge: govde yassi bir leke gibi durmasin -->
        <path d="M-34 2 Q-38 -22 -14 -30 Q-24 -8 -22 12 Q-21 26 -18 31 Q-32 22 -34 2 Z"
              fill="${pal.dark}" opacity=".22"/>
        <path d="M34 -12 Q45 10 28 29 Q22 20 22 8 Q22 -8 16 -24 Z"
              fill="${pal.dark}" opacity=".22"/>

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

/* ---------- Durum ---------- */

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
tabCare.addEventListener('click', () => switchTab('care'));
tabShop.addEventListener('click', () => switchTab('shop'));
document.addEventListener('langchange', () => {
  applyStaticTexts();
  renderShop();
  render();
});

bootstrap();
setInterval(render, 60000); /* doyum zamanla dustugu icin */

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
  haptic.tap();
}

/* ---------- Doyum ve buyume ---------- */

function fullness() {
  const gecenSaat = (Date.now() - lastFed) / 3_600_000;
  return Math.max(0, Math.min(100, Math.round((1 - gecenSaat / FULL_HOURS) * 100)));
}

const mood = () => (fullness() < 25 ? 'sad' : 'happy');

/* Seviye 5'ten 99'a kadar 0..1 arasi buyume orani */
const growth = () => Math.max(0, Math.min(1, (level - EGG_UNTIL - 1) / (MAX_LEVEL - EGG_UNTIL - 1)));

function stageLabel() {
  if (level <= 2) return t('stageEgg');
  if (level <= EGG_UNTIL) return t('stageHatch');
  const names = t('stageNames').split(',');
  const i = Math.min(names.length - 1, Math.floor(growth() * names.length));
  return names[i].trim();
}

/* ---------- Besleme ---------- */

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
  renderShop(); /* seviye kilidi acilmis olabilir */
  render();
}

/* Uyariyi iki panele birden yazar: hangisi acikken tetiklenirse tetiklensin
   oyuncu mesaji gorur. */
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

/* ---------- Dukkan ---------- */

const GROUPS = [
  { key: 'color',  title: 'shopColors',  items: COLORS },
  { key: 'crown',  title: 'shopCrowns',  items: CROWNS },
  { key: 'effect', title: 'shopEffects', items: EFFECTS },
];

/* Kucuk onizleme kareleri */
function preview(groupKey, id, item) {
  if (groupKey === 'color') {
    return `<span class="swatch" style="background:linear-gradient(140deg, ${item.body}, ${item.dark})"></span>`;
  }
  if (groupKey === 'crown') {
    if (id === 'none') return `<span class="swatch" style="background:rgba(255,255,255,.06)">—</span>`;
    return `<span class="swatch" style="background:rgba(255,255,255,.06)">
      <svg viewBox="-24 -24 48 30"><g transform="translate(0 4)">${crownSvg(id, 0)}</g></svg>
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

      const btn = document.createElement('button');
      btn.className = 'shop-item' + (secili ? ' on' : '') +
                      ((!sahip && (kilit || coins < item.price)) ? ' locked' : '');
      btn.innerHTML = `
        ${preview(group.key, id, item)}
        <span class="shop-name"></span>
        <span class="${sahip ? 'shop-price owned' : (kilit ? 'shop-need' : 'shop-price')}"></span>
      `;
      btn.querySelector('.shop-name').textContent = t(item.nameKey);

      const etiket = btn.querySelector('.shop-price, .shop-need');
      etiket.textContent = sahip
        ? t(secili ? 'equipped' : 'owned')
        : (kilit ? t('needLevel', { level: item.needLevel }) : `◆ ${format(item.price)}`);

      btn.addEventListener('click', () => pickItem(group.key, id, item));
      row.appendChild(btn);
    }

    box.appendChild(row);
    shopEl.appendChild(box);
  }
}

async function pickItem(groupKey, id, item) {
  if (busy) return;

  /* Zaten alinmissa sadece kusan */
  if (owned[groupKey].includes(id)) {
    eq[groupKey] = id;
    shopMsgEl.hidden = true;
    haptic.tap();
    persist();
    renderShop();
    render();
    return;
  }

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

  coins = sonuc.total;
  owned[groupKey].push(id);
  eq[groupKey] = id;
  haptic.success();
  shopMsgEl.hidden = true;   /* onceki uyari kalmasin */
  showFloater(t('bought', { name: t(item.nameKey) }));

  persist();
  renderShop();
  render();
}

/* ---------- Ekrana cizme ---------- */

function render() {
  const pal = COLORS[eq.color] || COLORS.violet;

  petArt.innerHTML = level <= EGG_UNTIL
    ? eggSvg(level, pal)
    : dragonSvg(growth(), pal, eq.crown, mood());

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

/* Satin alinan animasyonu sahneye kurar */
function renderEffect() {
  const fx = EFFECTS[eq.effect] || EFFECTS.none;
  fxEl.textContent = '';
  fxEl.className = 'fx';

  if (eq.effect === 'none') return;

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
