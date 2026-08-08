/* Dragon Island

   Oyuncunun hub'daki kalici ejderhasi. Diger oyunlarda kazanilan jetonlar
   burada harcaniyor: besleme, seviye ve gorunum.

   BU DOSYA SADECE BAGLANTI KATMANI.
   Ekonomi economy.js'te, veri modeli model.js'te, sayilar config.js'te,
   kozmetik katalogu data.js'te, cizim art.js ve island.js'te.
   Burada hicbir fiyat, hicbir XP degeri ve hicbir bakiye aritmetigi yok -
   ileride dengeleme yaparken bu dosyayi acmak gerekmemeli. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js';

import { CONFIG, feedCost, xpNeeded, rewardForLevel } from './config.js';
import { SLOTS, KATALOG, AURAS } from './data.js';
import { bakiyeOku, harca } from './economy.js';
import { oyuncuyuYukle, oyuncuyuKaydet, aktifEjderha, sahipMi, dolabaEkle } from './model.js';
import { dragonSvg, headSvg, faceSvg, HEAD_BOX } from './art.js';
import { createIsland } from './island.js';

const GAME_ID = 'dragon';

registerTexts(GAME_ID, {
  title: 'Ejderha Adası',
  level: 'SEVİYE',
  coins: 'JETON',
  fullness: 'Doyum',
  happiness: 'Keyif',
  feed: 'Besle',
  play: 'Oyna',
  customize: 'Görünüm',
  done: 'Bitti',
  backToHub: "Hub'a dön",
  hint: 'Diğer oyunlarda jeton kazan, burada ejderhanı besle.',
  notEnough: 'Yeterli jetonun yok. Bir oyun oynayıp geri gel.',
  hungryHint: 'Ejderhan acıktı, beslenmeyi bekliyor.',
  maxLevel: 'Ejderhan en yüksek seviyeye ulaştı.',
  levelUp: 'Seviye {level}!',
  xpGain: '+{n} XP',
  playSoon: 'Ejderhan dinleniyor. {time} sonra tekrar oynayın.',
  playedHint: 'Ejderhan keyiflendi.',
  dragonName: 'Ateş Ejderhası',
  lvShort: 'Sv. {level}',

  lockedMsg: "Seviye {level}'de açılıyor.",
  tryHint: 'Ejderhanın üzerinde deniyorsun.',
  tryNoCoins: 'Yeterli jetonun yok.',
  tryCancel: 'Vazgeç',
  bought: '{name} alındı!',
  owned: 'Alındı',
  equipped: 'Seçili',
  needLevel: 'Sv. {level}',

  stageEgg: 'Yumurta',
  stageHatch: 'Yeni çıktı',
  stageNames: 'Yavru,Genç,Ejderha,Savaşçı,Kadim,Efsane',

  shopColors: 'RENK',
  shopSkins: 'DESEN',
  shopHeads: 'TAÇ',
  shopFaces: 'YÜZ',
  shopAuras: 'ANİMASYON',

  colViolet: 'Mor', colCrimson: 'Kızıl', colEmerald: 'Zümrüt', colIce: 'Buz',
  colGold: 'Altın', colShadow: 'Gölge', colInferno: 'Ateş', colRunic: 'Kadim Rün',
  colLord: 'Ejder Kralı',

  skNone: 'Düz', skScales: 'Pul', skPlates: 'Zırh', skCracks: 'Magma',
  skRunes: 'Rün', skFrost: 'Buz Kırağı',

  hdNone: 'Yok', hdSilver: 'Gümüş', hdGold: 'Altın', hdRuby: 'Yakut',
  hdAncient: 'Kadim', hdDragon: 'Ejder Tacı',

  fcNone: 'Yok', fcScar: 'Yara İzi', fcPaint: 'Savaş Boyası',
  fcMonocle: 'Monokl', fcVisor: 'Vizör',

  auNone: 'Yok', auEmbers: 'Kıvılcım', auFlame: 'Alev', auStorm: 'Şimşek',
  auHalo: 'Hale', auStars: 'Yıldız',
});

/* ---------- DOM ---------- */

const islandEl = document.getElementById('island');
const backCv = document.getElementById('isle-back');
const frontCv = document.getElementById('isle-front');
const slotEl = document.getElementById('dragon-slot');
const artEl = document.getElementById('dragon-art');
const fxEl = document.getElementById('fx');
const floatersEl = document.getElementById('floaters');

const levelEl = document.getElementById('level');
const coinsEl = document.getElementById('coins');
const stageNameEl = document.getElementById('stage-name');
const dragonNameEl = document.getElementById('dragon-name');
const dragonLvEl = document.getElementById('dragon-lv');
const xpFill = document.getElementById('xp-fill');
const xpValue = document.getElementById('xp-value');
const hungerValue = document.getElementById('hunger-value');
const happyValue = document.getElementById('happy-value');
const hintEl = document.getElementById('hint');

const feedBtn = document.getElementById('feed');
const feedCostEl = document.getElementById('feed-cost');
const playBtn = document.getElementById('play');
const customizeBtn = document.getElementById('customize');
const controlsEl = document.getElementById('controls');
const shopControlsEl = document.getElementById('shop-controls');
const shopDoneBtn = document.getElementById('shop-done');

const panelShop = document.getElementById('panel-shop');
const shopEl = document.getElementById('shop');
const shopMsgEl = document.getElementById('shop-msg');
const tryBar = document.getElementById('try-bar');
const tryName = document.getElementById('try-name');
const tryNote = document.getElementById('try-note');
const tryBuy = document.getElementById('try-buy');
const tryCancel = document.getElementById('try-cancel');

/* ---------- Durum ---------- */

let oyuncu = null;
let ejderha = null;
let coins = 0;
let busy = false;
let dukkanAcik = false;

/* Sahip olmadigin bir parcaya dokununca burasi dolar: ejderha onu uzerinde
   gosterir ama hicbir sey satin alinmaz. Alim tryBuy ile onaylanir. */
let deneme = null;   /* { slot, id, item } */

/* Ejderhanin O AN gorunecegi kusam: kalici secimler + varsa deneme */
function gorunum() {
  return deneme ? { ...ejderha.look, [deneme.slot]: deneme.id } : ejderha.look;
}

const ada = createIsland(backCv, frontCv);

/* ---------- Baslangic ---------- */

initTelegram();
applyStaticTexts();
showBackButton(hubaDon);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  hubaDon();
});

feedBtn.addEventListener('click', besle);
playBtn.addEventListener('click', oyna);
customizeBtn.addEventListener('click', () => dukkanGoster(true));
shopDoneBtn.addEventListener('click', () => dukkanGoster(false));
islandEl.addEventListener('click', durt);

tryBuy.addEventListener('click', satinAlOnayla);
tryCancel.addEventListener('click', () => {
  deneme = null;
  haptic.tap();
  dukkanCiz();
  ciz();
});

document.addEventListener('langchange', () => {
  applyStaticTexts();
  dukkanCiz();
  ciz();
});

/* Sekme arka plana gecince ada dongusu dursun (pil) */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ada.dur();
  else ada.basla();
});

window.addEventListener('resize', adaYerlestir);

basla();
setInterval(ciz, 60000); /* doyum ve keyif zamanla dustugu icin */

async function basla() {
  oyuncu = await oyuncuyuYukle();
  ejderha = aktifEjderha(oyuncu);
  coins = await bakiyeOku();
  adaYerlestir();
  ada.basla();
  dukkanCiz();
  ciz();
}

function hubaDon() {
  window.location.href = '../../index.html';
}

function kaydet() {
  oyuncuyuKaydet(oyuncu);
}

/* Ada olculeri degistiginde ejderhayi dogru karonun uzerine oturt */
function adaYerlestir() {
  if (!ada.boyutlandir()) {
    /* Sahne henuz olculenmemis (gizli/gec yerlesim) - bir kare sonra dene */
    requestAnimationFrame(adaYerlestir);
    return;
  }
  const p = ada.ejderhaNoktasi();
  const kutu = islandEl.getBoundingClientRect();
  slotEl.style.setProperty('--dx', `${(p.x / kutu.width) * 100}%`);
  slotEl.style.setProperty('--dy', `${(p.y / kutu.height) * 100}%`);
  slotEl.style.width = `${Math.max(30, 38 * p.olcek)}%`;
}

/* ---------- Doyum / keyif ---------- */

function yuzde(basZaman, saat) {
  const gecen = (Date.now() - basZaman) / 3_600_000;
  return Math.max(0, Math.min(100, Math.round((1 - gecen / saat) * 100)));
}

const doyum = () => yuzde(ejderha.lastFed, CONFIG.FULL_HOURS);
const keyif = () => Math.max(
  yuzde(ejderha.lastPlayed || 0, CONFIG.HAPPY_HOURS),
  Math.round(doyum() * 0.5),   /* tok ejderha tamamen mutsuz olmaz */
);

const ruhHali = () => (doyum() < CONFIG.HUNGRY_BELOW ? 'sad' : 'happy');

function asamaAdi() {
  if (ejderha.level <= 2) return t('stageEgg');
  if (ejderha.level <= CONFIG.EGG_UNTIL) return t('stageHatch');
  const adlar = t('stageNames').split(',');
  const oran = (ejderha.level - CONFIG.EGG_UNTIL) / (CONFIG.MAX_LEVEL - CONFIG.EGG_UNTIL);
  return adlar[Math.min(adlar.length - 1, Math.floor(oran * adlar.length))].trim();
}

/* ---------- Etkilesimler ---------- */

function durt() {
  if (islandEl.classList.contains('poked')) return;
  haptic.tap();
  islandEl.classList.add('poked');
  setTimeout(() => islandEl.classList.remove('poked'), 520);
}

async function besle() {
  if (busy || ejderha.level >= CONFIG.MAX_LEVEL) return;

  const fiyat = feedCost(ejderha.level);
  if (coins < fiyat) return uyar(t('notEnough'));

  busy = true;
  feedBtn.disabled = true;

  /* Etiket ayni karede iki kez basilirsa ikinci istegi tek islem yapar */
  const sonuc = await harca(`feed:${ejderha.id}:${ejderha.level}:${ejderha.xp}`, fiyat);
  busy = false;

  if (!sonuc.ok) {
    coins = sonuc.bakiye;
    ciz();
    return uyar(t('notEnough'));
  }

  coins = sonuc.bakiye;
  ejderha.lastFed = Date.now();
  xpVer(CONFIG.FEED_XP, 'fed');
}

function oyna() {
  if (busy) return;

  const kalan = (ejderha.lastPlayed || 0) + CONFIG.PLAY_COOLDOWN_MS - Date.now();
  if (kalan > 0) return uyar(t('playSoon', { time: sureMetni(kalan) }));

  ejderha.lastPlayed = Date.now();
  haptic.success();
  hintEl.textContent = t('playedHint');
  hintEl.classList.remove('warn');
  xpVer(CONFIG.PLAY_XP, 'playing');
}

/* XP ekler, gerekiyorsa seviye atlatir ve gorsel geri bildirim verir */
function xpVer(miktar, sinif) {
  ejderha.xp += miktar;

  let atladi = false;
  while (ejderha.xp >= xpNeeded(ejderha.level) && ejderha.level < CONFIG.MAX_LEVEL) {
    ejderha.xp -= xpNeeded(ejderha.level);
    ejderha.level++;
    atladi = true;
  }
  if (ejderha.level >= CONFIG.MAX_LEVEL) ejderha.xp = 0;

  if (atladi) {
    /* Seviye odulleri config.js'ten okunur; tanimli degilse hicbir sey olmaz */
    const odul = rewardForLevel(ejderha.level);
    if (odul?.unlock) {
      for (const [slot, id] of Object.entries(odul.unlock)) dolabaEkle(oyuncu, slot, id);
    }
  }

  haptic.success();
  islandEl.classList.add(atladi ? 'levelup' : sinif);
  setTimeout(() => islandEl.classList.remove('fed', 'levelup', 'playing'), 950);
  ucur(atladi ? t('levelUp', { level: bicim(ejderha.level) }) : t('xpGain', { n: miktar }));

  kaydet();
  dukkanCiz();  /* seviye kilidi acilmis olabilir */
  ciz();
}

function sureMetni(ms) {
  const dk = Math.ceil(ms / 60000);
  if (dk < 60) return `${dk} dk`;
  return `${Math.ceil(dk / 60)} sa`;
}

function uyar(metin) {
  haptic.error();
  hintEl.textContent = metin;
  hintEl.classList.add('warn');
  shopMsgEl.textContent = metin;
  shopMsgEl.classList.add('warn');
  shopMsgEl.hidden = false;
}

function ucur(metin) {
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = metin;
  floatersEl.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

const bicim = (n) => Number(n).toLocaleString(locale());

/* ---------- Dukkan ---------- */

function dukkanGoster(acik) {
  dukkanAcik = acik;
  panelShop.hidden = !acik;
  controlsEl.hidden = acik;
  shopControlsEl.hidden = !acik;
  document.body.classList.toggle('shop-open', acik);

  if (!acik && deneme) {
    deneme = null;
    dukkanCiz();
  }
  haptic.tap();
  /* Ada kutusu boyut degistirdi */
  requestAnimationFrame(adaYerlestir);
  ciz();
}

/* Kutucuktaki mini onizleme */
function onizleme(slot, id, item) {
  const bos = `<span class="swatch" style="background:rgba(255,255,255,.06)">—</span>`;

  if (slot === 'color') {
    return `<span class="swatch" style="background:linear-gradient(140deg, ${item.body}, ${item.dark})"></span>`;
  }

  if (slot === 'skin') {
    if (id === 'none') return bos;
    const ink = item.ink || '#ffffff';
    const sekil = {
      scales: `<g fill="none" stroke="${ink}" stroke-width="1.5" opacity=".8">
                 <path d="M2 7q3 4 6 0M8 7q3 4 6 0M14 7q3 4 6 0
                          M5 13q3 4 6 0M11 13q3 4 6 0
                          M2 19q3 4 6 0M8 19q3 4 6 0M14 19q3 4 6 0"/></g>`,
      plates: `<g stroke="${ink}" fill="none" stroke-width="1.5" opacity=".85">
                 <path d="M3 7q9 -4 18 0M3 13q9 -4 18 0M3 19q9 -4 18 0"/></g>
               <path d="M12 2 l3 3 l-3 3 l-3 -3z" fill="${ink}"/>`,
      cracks: `<path d="M7 2 l3 6 l-3 5 l4 5 l-2 4 M17 3 l-2 7 l3 5 l-2 6"
                     fill="none" stroke="${ink}" stroke-width="1.8"
                     stroke-linecap="round" stroke-linejoin="round"/>`,
      runes:  `<circle cx="12" cy="12" r="8" fill="none" stroke="${ink}" stroke-width="1.2" opacity=".6"/>
               <path d="M12 7 v5 M9.5 9 h5 M12 12 l2.5 4 h-5 z" fill="none" stroke="${ink}"
                     stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
      frost:  `<path d="M12 3 V21 M4 8 L20 16 M20 8 L4 16" stroke="${ink}"
                     stroke-width="1.7" stroke-linecap="round"/>
               <path d="M12 7 l-3 -3 M12 7 l3 -3 M12 17 l-3 3 M12 17 l3 3" stroke="${ink}"
                     stroke-width="1.5" stroke-linecap="round"/>`,
    }[item.kind] || '';
    return `<span class="swatch" style="background:rgba(255,255,255,.07)">
      <svg viewBox="0 0 24 24">${sekil}</svg></span>`;
  }

  if (slot === 'head') {
    if (id === 'none') return bos;
    return `<span class="swatch" style="background:rgba(255,255,255,.06)">
      <svg viewBox="${HEAD_BOX[id]}">${headSvg(id, 0)}</svg></span>`;
  }

  if (slot === 'face') {
    if (id === 'none') return bos;
    /* Yuz parcalari ejderha kafasinin koordinatlarinda cizildigi icin
       kutucukta o bolgeye bakan bir cerceve kullaniliyor */
    return `<span class="swatch" style="background:rgba(255,255,255,.06)">
      <svg viewBox="-30 -74 60 32">${faceSvg(id)}</svg></span>`;
  }

  /* aura */
  if (id === 'none') return bos;
  return `<span class="swatch" style="background:radial-gradient(circle, ${item.color}55, rgba(255,255,255,.05))">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="${item.color}"/></svg></span>`;
}

function dukkanCiz() {
  if (!oyuncu) return;
  shopEl.textContent = '';

  for (const slot of SLOTS) {
    const tablo = KATALOG[slot.key];

    const kutu = document.createElement('div');
    kutu.className = 'shop-group';

    const baslik = document.createElement('h3');
    baslik.className = 'shop-title';
    baslik.textContent = t(slot.title);
    kutu.appendChild(baslik);

    const sira = document.createElement('div');
    sira.className = 'shop-row';

    for (const [id, item] of Object.entries(tablo)) {
      const sahip = sahipMi(oyuncu, slot.key, id);
      const secili = ejderha.look[slot.key] === id;
      const kilit = item.needLevel && ejderha.level < item.needLevel;
      const deniyor = deneme?.slot === slot.key && deneme.id === id;

      const btn = document.createElement('button');
      btn.className = 'shop-item' + (secili ? ' on' : '') + (deniyor ? ' trying' : '') +
                      ((!sahip && (kilit || coins < item.price)) ? ' locked' : '');
      btn.innerHTML = `
        ${onizleme(slot.key, id, item)}
        <span class="shop-name"></span>
        <span class="${sahip ? 'shop-price owned' : (kilit ? 'shop-need' : 'shop-price')}"></span>`;

      btn.querySelector('.shop-name').textContent = t(item.nameKey);
      btn.querySelector('.shop-price, .shop-need').textContent = sahip
        ? t(secili ? 'equipped' : 'owned')
        : (kilit ? t('needLevel', { level: item.needLevel }) : `◆ ${bicim(item.price)}`);

      btn.addEventListener('click', () => parcaSec(slot.key, id, item));
      sira.appendChild(btn);
    }

    kutu.appendChild(sira);
    shopEl.appendChild(kutu);
  }
}

/* Dukkanda bir parcaya dokunmak: sahip oldugunu kusandirir, olmadigini DENER.
   Deneme hicbir jeton harcamaz; alim deneme cubugundan onaylanir. */
function parcaSec(slot, id, item) {
  if (busy) return;

  if (sahipMi(oyuncu, slot, id)) {
    deneme = null;
    ejderha.look[slot] = id;
    shopMsgEl.hidden = true;
    haptic.tap();
    kaydet();
    dukkanCiz();
    ciz();
    return;
  }

  /* Kilitli olsa bile denenebilir: oyuncu neyin pesinde oldugunu gorsun */
  deneme = { slot, id, item };
  shopMsgEl.hidden = true;
  haptic.tap();
  dukkanCiz();
  ciz();
}

async function satinAlOnayla() {
  if (busy || !deneme) return;
  const { slot, id, item } = deneme;

  if (item.needLevel && ejderha.level < item.needLevel) {
    return uyar(t('lockedMsg', { level: item.needLevel }));
  }
  if (coins < item.price) return uyar(t('notEnough'));

  busy = true;
  const sonuc = await harca(`buy:${slot}:${id}`, item.price);
  busy = false;

  if (!sonuc.ok) {
    coins = sonuc.bakiye;
    ciz();
    return uyar(t('notEnough'));
  }

  coins = sonuc.bakiye;
  deneme = null;
  dolabaEkle(oyuncu, slot, id);
  ejderha.look[slot] = id;

  haptic.success();
  shopMsgEl.hidden = true;
  ucur(t('bought', { name: t(item.nameKey) }));

  kaydet();
  dukkanCiz();
  ciz();
}

/* ---------- Ekrana cizme ---------- */

function ciz() {
  if (!ejderha) return;

  const look = gorunum();
  artEl.innerHTML = dragonSvg(ejderha.level, look, ruhHali());
  efektCiz(look.aura);

  const enSon = ejderha.level >= CONFIG.MAX_LEVEL;
  const gereken = xpNeeded(ejderha.level);
  const d = doyum();
  const k = keyif();

  stageNameEl.textContent = asamaAdi();
  levelEl.textContent = bicim(ejderha.level);
  coinsEl.textContent = bicim(coins);
  dragonNameEl.textContent = ejderha.name || t('dragonName');
  dragonLvEl.textContent = t('lvShort', { level: bicim(ejderha.level) });

  xpFill.style.width = enSon ? '100%' : `${(ejderha.xp / gereken) * 100}%`;
  xpValue.textContent = enSon ? `${CONFIG.MAX_LEVEL}` : `${ejderha.xp}/${gereken}`;

  hungerValue.textContent = `${d}%`;
  hungerValue.classList.toggle('low', d < CONFIG.HUNGRY_BELOW);
  happyValue.textContent = `${k}%`;
  happyValue.classList.toggle('low', k < CONFIG.HUNGRY_BELOW);

  const fiyat = feedCost(ejderha.level);
  feedCostEl.textContent = bicim(fiyat);
  feedBtn.disabled = busy || enSon || coins < fiyat;
  playBtn.disabled = (ejderha.lastPlayed || 0) + CONFIG.PLAY_COOLDOWN_MS > Date.now();

  denemeCubuguCiz();

  if (!hintEl.classList.contains('warn')) {
    if (enSon) hintEl.textContent = t('maxLevel');
    else if (coins < fiyat) hintEl.textContent = t('notEnough');
    else if (d < CONFIG.HUNGRY_BELOW) hintEl.textContent = t('hungryHint');
    else hintEl.textContent = t('hint');
  }
  /* Uyari bir sonraki cizimde temizlenir */
  hintEl.classList.remove('warn');
}

function denemeCubuguCiz() {
  if (!deneme) {
    tryBar.hidden = true;
    return;
  }
  const { item } = deneme;
  const kilit = item.needLevel && ejderha.level < item.needLevel;
  const parasiz = coins < item.price;

  tryBar.hidden = false;
  tryName.textContent = t(item.nameKey);
  tryBuy.textContent = `◆ ${bicim(item.price)}`;
  tryBuy.disabled = busy || kilit || parasiz;

  tryNote.classList.toggle('warn', !!(kilit || parasiz));
  if (kilit) tryNote.textContent = t('lockedMsg', { level: item.needLevel });
  else if (parasiz) tryNote.textContent = t('tryNoCoins');
  else tryNote.textContent = t('tryHint');
}

/* Satin alinan animasyonu sahneye kurar */
function efektCiz(auraId) {
  const fx = AURAS[auraId] || AURAS.none;
  fxEl.textContent = '';
  fxEl.className = 'fx';
  if (auraId === 'none') return;

  if (fx.kind === 'aura') {
    fxEl.classList.add('aura');
    fxEl.style.setProperty('--aura', fx.color);
    return;
  }
  if (fx.kind === 'storm') fxEl.classList.add('storm');

  const adet = fx.kind === 'storm' ? 6 : 12;
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
