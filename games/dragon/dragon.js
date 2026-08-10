/* Dragon Island

   Oyuncunun hub'daki kalici ejderhasi. Diger oyunlarda kazanilan jetonlar
   burada harcaniyor: besleme, seviye ve gorunum.

   BU DOSYA SADECE BAGLANTI KATMANI.
   Ekonomi economy.js'te, veri modeli model.js'te, sayilar config.js'te,
   kozmetik katalogu data.js'te, cizim art.js ve island.js'te.
   Burada hicbir fiyat, hicbir XP degeri ve hicbir bakiye aritmetigi yok -
   ileride dengeleme yaparken bu dosyayi acmak gerekmemeli. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v21';
import { registerTexts, registerItemTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js?v21';

import { CONFIG, feedCost, xpNeeded, rewardForLevel } from './config.js?v21';
import { SLOTS, KATALOG, AURAS, ISLANDS, RARITIES, ada as adaTemasi } from './data.js?v21';
import { bakiyeOku, harca } from './economy.js?v21';
import { oyuncuyuYukle, oyuncuyuKaydet, aktifEjderha, sahipMi, dolabaEkle,
         adaSahipMi, adaEkle } from './model.js?v21';
import { dragonSvg, headSvg, faceSvg, HEAD_BOX } from './art.js?v21';
import { ITEM_TEXTS } from './i18n-items.js?v21';
import { createIsland } from './island.js?v21';

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
  shopWings: 'KANAT',
  shopTails: 'KUYRUK',
  shopIslands: 'ADA',
  equipIsland: 'Bu adaya taşın',
  shopSkins: 'DESEN',
  shopHeads: 'TAÇ',
  shopFaces: 'YÜZ',
  shopAuras: 'ANİMASYON',
});

/* Item adlari ve aciklamalari dort dilde ayri dosyada: katalog buyudukce
   ana sozlugu (ve HUB'in acilisini) sismesin diye. */
registerItemTexts(ITEM_TEXTS);

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
const tryRar = document.getElementById('try-rar');
const foodEl = document.getElementById('food');

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

const ada = createIsland(backCv, frontCv, 'grassland');

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
tryCancel.addEventListener('click', denemeyiBirak);

/* Sahnedeki ada HER ZAMAN buradan belirlenir: deneme bir adaysa o, degilse
   oyuncunun sahip oldugu ada.

   Onceki surumde tema yalnizca "ada denemesi biraktiginda" geri aliniyordu.
   Oyuncu adayi deneyip BASKA bir kategoriye (ornegin kuyruga) gecince deneme
   degisiyor ama sahne volkanik kaliyordu - satin alinmamis bir ada ana
   ekranda gorunuyordu. Artik her deneme degisiminde burasi cagriliyor. */
/* Markette ne gosterilecegini belirler.

   Normalde ejderha buyuk ve ada gizli - satin alacagin kozmetigi gormek
   icin. Ama ADA deniyorsan tam tersi gerekiyor: ada gorunmeli, ejderha
   normal boyutuna donmeli. Yoksa ada denerken ekranda hicbir sey degismiyor. */
function onizlemeModu() {
  const adaOnizleme = dukkanAcik && deneme?.slot === 'island';
  document.body.classList.toggle('island-preview', adaOnizleme);
  requestAnimationFrame(adaYerlestir);
}

function adaSahnesiniTazele() {
  if (!oyuncu) return;
  const istenen = deneme?.slot === 'island' ? deneme.id : oyuncu.island;
  if (ada.temaBilgisi() !== adaTemasi(istenen)) ada.temaDegistir(istenen);
}

function denemeyiBirak() {
  deneme = null;
  adaSahnesiniTazele();
  onizlemeModu();
  haptic.tap();
  dukkanCiz();
  ciz();
}

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
  ada.temaDegistir(oyuncu.island);
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
  /* Genislik de degisken uzerinden: market modunda CSS onu devraliyor */
  slotEl.style.setProperty('--w', `${Math.max(30, 38 * p.olcek)}%`);
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
  if (busy) return;

  const fiyat = feedCost(ejderha.level);
  if (coins < fiyat) return uyar(t('notEnough'));

  busy = true;
  feedBtn.disabled = true;

  /* Etiket ayni karede iki kez basilirsa ikinci istegi tek islem yapar */
  const sonuc = await harca(`feed:${ejderha.id}:${ejderha.level}:${ejderha.xp}:${ejderha.lastFed}`, fiyat);
  busy = false;

  if (!sonuc.ok) {
    coins = sonuc.bakiye;
    ciz();
    return uyar(t('notEnough'));
  }

  coins = sonuc.bakiye;
  ejderha.lastFed = Date.now();

  /* Yem ejderhaya ucar, ejderha onu yer, ANCAK ONDAN SONRA XP gelir.
     Odul animasyondan once gelirse besleme "olmus bitmis" gibi hissettiriyor. */
  await yemAnimasyonu();

  /* Son seviyede besleme XP vermez ama ejderha yine ACIKIYOR.
     Eskiden buton tamamen kapaliydi ve seviye 99'daki bir ejderha bir daha
     hic doyurulamiyordu - dogru davranis besleyip doyumu doldurmak. */
  if (ejderha.level >= CONFIG.MAX_LEVEL) {
    haptic.success();
    islandEl.classList.add('fed');
    setTimeout(() => islandEl.classList.remove('fed'), 950);
    kaydet();
    ciz();
    return;
  }

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

/* --- BESLEME ANIMASYONU ---

   Yem alttan (butonun oldugu yonden) cikip ejderhanin agzina ucar, ejderha
   yeme hareketi yapar, agzindan birkac kirinti sicrar. Toplam ~0.9 saniye. */
function yemAnimasyonu() {
  return new Promise((bitti) => {
    const kutu = islandEl.getBoundingClientRect();
    const hedef = slotEl.getBoundingClientRect();
    /* Ejderhanin agzi: slotun ust-orta bolgesi */
    const agizY = hedef.top - kutu.top + hedef.height * 0.42;
    const yemY = kutu.height * 0.96;

    foodEl.hidden = false;
    foodEl.style.setProperty('--ucus', `${Math.round(agizY - yemY)}px`);
    /* Animasyonu bastan baslat */
    foodEl.style.animation = 'none';
    void foodEl.offsetWidth;
    foodEl.style.animation = '';

    setTimeout(() => {
      foodEl.hidden = true;
      islandEl.classList.add('eating');
      kirintiSac(hedef.left - kutu.left + hedef.width / 2, agizY);
      haptic.tap();
      setTimeout(() => {
        islandEl.classList.remove('eating');
        bitti();
      }, 320);
    }, 620);
  });
}

function kirintiSac(x, y) {
  const kap = document.createElement('div');
  kap.className = 'crumbs';
  kap.style.left = `${x}px`;
  kap.style.top = `${y}px`;
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('i');
    const aci = (Math.PI / 6) * i + Math.PI * 0.15;
    p.style.setProperty('--kx', `${Math.cos(aci) * 26}px`);
    p.style.setProperty('--ky', `${Math.abs(Math.sin(aci)) * 22 + 6}px`);
    kap.appendChild(p);
  }
  floatersEl.appendChild(kap);
  setTimeout(() => kap.remove(), 520);
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
  onizlemeModu();

  /* Dukkandan cikarken deneme her zaman birakilir: onizleme yalnizca
     markette yasar, ana ekrana sizmaz. */
  if (!acik) {
    deneme = null;
    dukkanCiz();
  }
  adaSahnesiniTazele();
  haptic.tap();
  /* Ada kutusu boyut degistirdi */
  requestAnimationFrame(adaYerlestir);
  ciz();
}

/* Kutucuktaki mini onizleme.
   Her slot kendi kucuk gorselini uretiyor; ada icin adanin renklerinden
   kucuk bir izometrik karo cizilir. */
function onizleme(slot, id, item) {
  const bos = `<span class="swatch" style="background:rgba(255,255,255,.06)">—</span>`;

  if (slot === 'island') {
    const z = item.zemin;
    return `<span class="swatch" style="background:linear-gradient(180deg, ${item.gok[0]}, ${item.gok[1]})">
      <svg viewBox="0 0 24 24">
        <path d="M12 6 L22 11 L12 16 L2 11 Z" fill="${z.ustAcik}"/>
        <path d="M2 11 L12 16 v4 L2 15 Z" fill="${z.yanSol}"/>
        <path d="M22 11 L12 16 v4 L22 15 Z" fill="${z.yanSag}"/>
        <path d="M12 20 L15 22 L12 24 L9 22 Z" fill="${z.kaya}"/>
      </svg></span>`;
  }

  if (slot === 'color') {
    /* Aurora'da tek renk yerine bantlar: mythic oldugu kutucukta belli olsun */
    const zemin = item.aurora
      ? `linear-gradient(140deg, ${item.aurora.join(', ')})`
      : `linear-gradient(140deg, ${item.body}, ${item.dark})`;
    return `<span class="swatch" style="background:${zemin}"></span>`;
  }

  if (slot === 'skin') {
    if (!item.kind) return bos;
    const ink = item.ink || '#ffffff';
    const sekil = {
      stripes:  `<g stroke="${ink}" stroke-width="2" opacity=".75"><path d="M3 8h18M3 13h18M3 18h18"/></g>`,
      flame:    `<path d="M12 3 C16 8 18 11 18 14 C18 18 15 20 12 20 C9 20 6 18 6 14 C6 11 8 8 12 3 Z"
                       fill="${ink}" opacity=".9"/>`,
      tribal:   `<g fill="none" stroke="${ink}" stroke-width="1.6" opacity=".85">
                   <path d="M2 8l4 5 4-5M10 8l4 5 4-5M6 15l4 5 4-5M14 15l4 5 4-5"/></g>`,
      lightning:`<path d="M14 2 L6 12 h5 L8 22 L18 10 h-5 z" fill="${ink}"/>`,
      runes:    `<circle cx="12" cy="12" r="8" fill="none" stroke="${ink}" stroke-width="1.3" opacity=".7"/>
                 <path d="M12 7v5M9.5 9h5M12 12l2.5 4h-5z" fill="none" stroke="${ink}"
                       stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
      armor:    `<g stroke="${ink}" fill="none" stroke-width="1.7" opacity=".9">
                   <path d="M3 8q9 -4 18 0M3 14q9 -4 18 0M3 20q9 -4 18 0"/></g>
                 <path d="M12 2 l3 3 l-3 3 l-3 -3z" fill="${ink}"/>`,
      cosmic:   `<ellipse cx="12" cy="12" rx="10" ry="6" fill="${ink}" opacity=".25"
                          transform="rotate(-20 12 12)"/>
                 <g fill="#fff"><circle cx="7" cy="9" r="1.4"/><circle cx="15" cy="8" r="1"/>
                 <circle cx="12" cy="14" r="1.6"/><circle cx="18" cy="15" r="1.1"/>
                 <circle cx="5" cy="16" r="1"/></g>`,
      celestial:`<circle cx="12" cy="12" r="9" fill="none" stroke="${ink}" stroke-width="1.4"
                         stroke-dasharray="3 2.5"/>
                 <path d="M12 6 L16 12 L12 18 L8 12 Z" fill="none" stroke="${ink}" stroke-width="1.6"/>
                 <path d="M12 9 L14 12 L12 15 L10 12 Z" fill="${ink}"/>`,
    }[item.kind] || '';
    return `<span class="swatch" style="background:rgba(255,255,255,.07)">
      <svg viewBox="0 0 24 24">${sekil}</svg></span>`;
  }

  if (slot === 'head') {
    if (!item.kind) return bos;
    return `<span class="swatch" style="background:rgba(255,255,255,.06)">
      <svg viewBox="${HEAD_BOX[item.kind] || '-24 -40 48 44'}">${headSvg(id, 0)}</svg></span>`;
  }

  if (slot === 'face') {
    if (!item.kind) return bos;
    /* Yuz parcalari ejderha kafasinin koordinatlarinda cizildigi icin
       kutucukta o bolgeye bakan bir cerceve kullaniliyor */
    return `<span class="swatch" style="background:rgba(255,255,255,.06)">
      <svg viewBox="-34 -80 68 40">${faceSvg(id)}</svg></span>`;
  }

  if (slot === 'wings' || slot === 'tail') {
    /* Kanat ve kuyruk ancak siluetiyle anlasiliyor: notr renkte kucuk bir
       ejderha cizilip sadece o parca degistiriliyor, sonra CSS o bolgeye
       yakinlastiriyor (tum ejderha 46 pikselde okunmuyordu). */
    const look = { ...VARSAYILAN_ONIZLEME, [slot]: id };
    return `<span class="swatch zoom ${slot}">${dragonSvg(99, look, 'happy')}</span>`;
  }

  /* aura */
  if (!item.kind) return bos;
  return `<span class="swatch" style="background:radial-gradient(circle, ${item.color}55, rgba(255,255,255,.05))">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="${item.color}"/>
      <circle cx="12" cy="12" r="2" fill="#fff" opacity=".8"/></svg></span>`;
}

/* Kanat/kuyruk kutucuklarindaki silueti sade tutmak icin notr bir gorunum */
const VARSAYILAN_ONIZLEME = {
  color: 'ocean', skin: 'none', wings: 'leather', tail: 'basic',
  head: 'none', face: 'none', aura: 'none',
};

/* Bir grubu (slot ya da ada) ciz */
function grupCiz(baslikKey, girdiler) {
  const kutu = document.createElement('div');
  kutu.className = 'shop-group';
  /* Kaydirma konumunu geri yuklerken hangi kategori oldugunu bilmek icin */
  if (girdiler.length) kutu.dataset.slot = girdiler[0].slot;

  const baslik = document.createElement('h3');
  baslik.className = 'shop-title';
  baslik.textContent = t(baslikKey);
  kutu.appendChild(baslik);

  const sira = document.createElement('div');
  sira.className = 'shop-row';

  for (const g of girdiler) {
    const btn = document.createElement('button');
    const r = RARITIES[g.item.rarity] || RARITIES.common;

    btn.className = 'shop-item' + (g.secili ? ' on' : '') + (g.deniyor ? ' trying' : '') +
                    ((!g.sahip && (g.kilit || coins < g.item.price)) ? ' locked' : '');
    btn.style.setProperty('--rar', r.renk);
    btn.innerHTML = `
      <span class="rar-dot"></span>
      ${onizleme(g.slot, g.id, g.item)}
      <span class="shop-name"></span>
      <span class="${g.sahip ? 'shop-price owned' : (g.kilit ? 'shop-need' : 'shop-price')}"></span>`;

    btn.querySelector('.shop-name').textContent = t(g.item.nameKey);
    btn.querySelector('.shop-price, .shop-need').textContent = g.sahip
      ? t(g.secili ? 'equipped' : 'owned')
      : (g.kilit ? t('needLevel', { level: g.item.needLevel }) : `◆ ${bicim(g.item.price)}`);

    btn.addEventListener('click', () => parcaSec(g.slot, g.id, g.item));
    sira.appendChild(btn);
  }

  kutu.appendChild(sira);

  /* Deneme cubugu panelin tepesinde degil, DENENEN kategorinin hemen altinda
     duruyor. Tepede oldugunda kuyruk gibi asagidaki bir kategoriyi denerken
     fiyat ve "Satin al" ekranin disinda kaliyordu. */
  if (deneme && girdiler.length && girdiler[0].slot === deneme.slot) {
    kutu.appendChild(tryBar);
  }

  shopEl.appendChild(kutu);
}

function dukkanCiz() {
  if (!oyuncu) return;

  /* KAYDIRMA KONUMLARINI SAKLA

     Bir urune dokununca dukkan bastan cizilyor. Onceden bu, her kategorinin
     yatay kaydirmasini sifira dondurdugu icin saga kaydirip bir urunu
     denediginde kategori en basa atiyor ve denedigin urunu goremiyordun.
     Konumlari once alip cizimden sonra geri koyuyoruz. */
  const kaydirma = new Map();
  for (const grup of shopEl.querySelectorAll('.shop-group[data-slot]')) {
    const sira = grup.querySelector('.shop-row');
    if (sira && sira.scrollLeft > 0) kaydirma.set(grup.dataset.slot, sira.scrollLeft);
  }
  const dikey = panelShop.scrollTop;

  /* Cubuk bir gruba tasinmis olabilir; listeyi temizlemeden once geri al
     ki DOM'dan tamamen kopmasin. */
  panelShop.appendChild(tryBar);
  shopEl.textContent = '';

  for (const slot of SLOTS) {
    grupCiz(slot.title, Object.entries(KATALOG[slot.key]).map(([id, item]) => ({
      slot: slot.key, id, item,
      sahip: sahipMi(oyuncu, slot.key, id),
      secili: ejderha.look[slot.key] === id,
      kilit: !!(item.needLevel && ejderha.level < item.needLevel),
      deniyor: deneme?.slot === slot.key && deneme.id === id,
    })));
  }

  /* Ada da ayni dukkanda: oyuncuya ait, ejderhaya degil */
  grupCiz('shopIslands', Object.entries(ISLANDS).map(([id, item]) => ({
    slot: 'island', id, item,
    sahip: adaSahipMi(oyuncu, id),
    secili: oyuncu.island === id,
    kilit: !!(item.needLevel && ejderha.level < item.needLevel),
    deniyor: deneme?.slot === 'island' && deneme.id === id,
  })));

  /* Saklanan konumlari geri koy */
  for (const grup of shopEl.querySelectorAll('.shop-group[data-slot]')) {
    const konum = kaydirma.get(grup.dataset.slot);
    if (konum) {
      const sira = grup.querySelector('.shop-row');
      if (sira) sira.scrollLeft = konum;
    }
  }
  panelShop.scrollTop = dikey;

  /* Denenen urun gorus alaninda kalsin - kaydirma korunsa bile deneme
     cubugu araya girdiginde kayabiliyor. */
  const denenen = shopEl.querySelector('.shop-item.trying');
  if (denenen) denenen.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* Dukkanda bir seye dokunmak: sahip oldugunu kusandirir/tasinir, olmadigini
   DENER. Deneme hicbir jeton harcamaz; alim deneme cubugundan onaylanir. */
function parcaSec(slot, id, item) {
  if (busy) return;

  const sahip = slot === 'island' ? adaSahipMi(oyuncu, id) : sahipMi(oyuncu, slot, id);

  if (sahip) {
    deneme = null;
    if (slot === 'island') oyuncu.island = id;
    else ejderha.look[slot] = id;
    adaSahnesiniTazele();
    onizlemeModu();
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
  adaSahnesiniTazele();
  onizlemeModu();
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

  if (slot === 'island') {
    adaEkle(oyuncu, id);
    oyuncu.island = id;
  } else {
    dolabaEkle(oyuncu, slot, id);
    ejderha.look[slot] = id;
  }
  adaSahnesiniTazele();
  onizlemeModu();

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
  /* Son seviyede de beslenebilir: XP gelmez ama doyum dolar */
  feedBtn.disabled = busy || coins < fiyat;
  playBtn.disabled = (ejderha.lastPlayed || 0) + CONFIG.PLAY_COOLDOWN_MS > Date.now();

  denemeCubuguCiz();

  if (!hintEl.classList.contains('warn')) {
    /* Aclik en son seviyede bile oncelikli: "en yuksek seviye" yazisi
       oyuncunun ejderhasinin ac oldugunu gormesini engellemesin */
    if (coins < fiyat) hintEl.textContent = t('notEnough');
    else if (d < CONFIG.HUNGRY_BELOW) hintEl.textContent = t('hungryHint');
    else if (enSon) hintEl.textContent = t('maxLevel');
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

  const r = RARITIES[item.rarity] || RARITIES.common;

  tryBar.hidden = false;
  tryBar.style.setProperty('--rar', r.renk);
  tryName.textContent = t(item.nameKey);
  tryRar.textContent = t(r.nameKey);
  tryBuy.textContent = `◆ ${bicim(item.price)}`;
  tryBuy.disabled = busy || kilit || parasiz;

  tryNote.classList.toggle('warn', !!(kilit || parasiz));
  if (kilit) tryNote.textContent = t('lockedMsg', { level: item.needLevel });
  else if (parasiz) tryNote.textContent = t('tryNoCoins');
  else tryNote.textContent = t(item.descKey);
}

/* --- Satin alinan animasyonlar ---

   Once hepsi ayni seydi: renkli kucuk kareler yukari suzuluyordu, sadece
   rengi degisiyordu. Simdi her efektin kendi SEKLI ve kendi hareketi var -
   kor titriyor, alev dili uzayip kisaliyor, simsek carpiyor, hale donuyor,
   yildiz parildayip sonuyor. Sekiller SVG, hareket CSS. */

const EFEKT_SEKLI = {
  ember: `<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.4" fill="currentColor"/>
          <circle cx="6" cy="6" r="2" fill="#fff" opacity=".7"/></svg>`,

  frost: `<svg viewBox="0 0 24 24">
            <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M12 2 V22 M3.5 7 L20.5 17 M20.5 7 L3.5 17"/>
              <path d="M12 6 l-3 -3 M12 6 l3 -3 M12 18 l-3 3 M12 18 l3 3" stroke-width="1.6"/>
            </g>
          </svg>`,

  bolt:  `<svg viewBox="0 0 22 30">
            <path d="M14 0 L4 15 H10 L7 30 L20 12 H13 Z" fill="currentColor"/>
            <path d="M14 0 L4 15 H10 L7 30 L20 12 H13 Z" fill="none"
                  stroke="#fff" stroke-width="1.2" opacity=".8"/>
          </svg>`,

  star:  `<svg viewBox="0 0 24 24">
            <path d="M12 0 C13.2 8.6 15.4 10.8 24 12 C15.4 13.2 13.2 15.4 12 24
                     C10.8 15.4 8.6 13.2 0 12 C8.6 10.8 10.8 8.6 12 0 Z"
                  fill="currentColor"/>
          </svg>`,

  mist:  `<svg viewBox="0 0 40 18">
            <ellipse cx="20" cy="9" rx="19" ry="7" fill="currentColor" opacity=".6"/>
            <ellipse cx="13" cy="10" rx="11" ry="5" fill="currentColor" opacity=".45"/>
          </svg>`,

  cosmic:`<svg viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="6" fill="currentColor" opacity=".45"/>
            <circle cx="10" cy="10" r="2.6" fill="#fff" opacity=".9"/>
          </svg>`,
};

/* Her aura turunun kendi hareketi ve yogunlugu */
const EFEKT_AYAR = {
  ember:  { sekil: 'ember',  adet: 16, boy: [5, 9],   sure: [2.0, 3.4], gecikme: 2.2, alt: [0, 24] },
  frost:  { sekil: 'frost',  adet: 12, boy: [8, 14],  sure: [2.4, 3.8], gecikme: 2.4, alt: [10, 60] },
  bolt:   { sekil: 'bolt',   adet: 5,  boy: [16, 26], sure: [2.4, 4.0], gecikme: 3.0, alt: [10, 70] },
  star:   { sekil: 'star',   adet: 13, boy: [9, 16],  sure: [1.6, 2.8], gecikme: 2.0, alt: [10, 70] },
  mist:   { sekil: 'mist',   adet: 6,  boy: [34, 58], sure: [3.0, 4.6], gecikme: 2.6, alt: [0, 10] },
  cosmic: { sekil: 'cosmic', adet: 14, boy: [7, 13],  sure: [2.2, 3.6], gecikme: 2.4, alt: [5, 65] },
};

function efektCiz(auraId) {
  const fx = AURAS[auraId] || AURAS.none;
  fxEl.textContent = '';
  fxEl.className = 'fx';
  fxEl.style.color = fx.color || '';
  if (!fx.kind) return;

  /* Celestial: parcacik + ejderhanin cevresinde donen isik halkasi */
  if (fx.kind === 'celestial') {
    fxEl.classList.add('halo');
    fxEl.style.setProperty('--aura', fx.color);
    fxEl.innerHTML = `
      <svg class="halo-ring" viewBox="0 0 100 100">
        <ellipse class="ring-outer" cx="50" cy="50" rx="46" ry="15" fill="none" stroke="${fx.color}"
                 stroke-width="2.5" stroke-dasharray="10 7" opacity=".85"/>
        <ellipse class="ring-inner" cx="50" cy="50" rx="38" ry="12" fill="none" stroke="${fx.color}"
                 stroke-width="1.2" stroke-dasharray="4 9" opacity=".5"/>
      </svg>`;
    parcacikSac({ ...EFEKT_AYAR.star, adet: 9 }, fx);
    return;
  }

  const ayar = EFEKT_AYAR[fx.kind];
  if (!ayar) return;
  parcacikSac(ayar, fx);
}

function parcacikSac(ayar, fx) {
  const rast = ([a, b]) => a + Math.random() * (b - a);
  const carpan = fx.yogunluk ?? 1;
  const adet = Math.max(3, Math.round(ayar.adet * carpan));

  for (let i = 0; i < adet; i++) {
    const s = document.createElement('span');
    s.className = `p ${ayar.sekil}`;
    const boy = rast(ayar.boy);
    s.style.cssText = `
      left:${4 + Math.random() * 92}%;
      bottom:${rast(ayar.alt)}%;
      width:${boy}px;
      --dx:${(Math.random() * 26 - 13).toFixed(1)}px;
      --dur:${rast(ayar.sure).toFixed(2)}s;
      --delay:${(Math.random() * ayar.gecikme).toFixed(2)}s;`;
    s.innerHTML = EFEKT_SEKLI[ayar.sekil];
    fxEl.appendChild(s);
  }
}
