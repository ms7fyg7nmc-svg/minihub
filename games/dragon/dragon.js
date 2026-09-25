import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v120';
import { registerTexts, registerItemTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js?v120';

import { CONFIG, xpNeeded, gorselSeviye } from './config.js?v120';
import { bakimdaMi } from '../../js/store.js?v120';
import { oyuncuyuYukle, oyuncuyuKaydet, aktifEjderha, yuvaAcikMi, EN_COK_YUVA } from './model.js?v120';
import { dragonSvg, dragonAssetUrls } from './art.js?v120';
import { ITEM_TEXTS } from './i18n-items.js?v120';
import { createBoard, nesneKoy, bosHucreVarMi, gorselYolu, onYukleListesi,
         kilitliMi, nesneMi, hazirMi, enUstSeviye } from './grid.js?v120';
import { YUMURTA, TOPLAMA_SURESI, yemMaliyeti,
         toplamaSonucu, sandikDegeri, beslemeYumurtaSeviyesi, yuvaFiyati } from './ekonomi.js?v120';
import { createTutorial, pozListesi } from './tutorial.js?v120';

const GAME_ID = 'dragon';

registerTexts(GAME_ID, {
  title: 'Ejderha Adası',
  loading: 'Yükleniyor',
  maintenance: 'Ejderha Adası bakımda. Kısa süre sonra geri dönecek.',

  tabGrid: 'Ocak',
  tabDragon: 'Ejderha',
  tabTasks: 'Görevler',

  gridTitle: 'Yumurta Ocağı',
  gridHint: 'Aynı iki nesneyi üst üste sürükle, birleşsin.',

  dragonTitle: 'Ejderhaların',
  dragonHint: 'Besle, sana yumurta bıraksın.',
  fullness: 'Doyum',
  happiness: 'Keyif',
  feed: 'Besle',
  play: 'Oyna',
  noFood: 'Yemin yetmiyor. Izgaradaki dolu yumurtalardan topla.',
  refundMsg: 'Eskiden ejderhana harcadığın $MH karşılığı {n} yem hesabına eklendi.',
  maxLevel: 'EN ÜST',
  feedWait: '{time} sonra tekrar besleyebilirsin.',
  laidEgg: 'Ejderhan bir yumurta bıraktı!',
  gridFullEgg: 'Izgara dolu, yumurtayı koyacak yer yok.',
  playSoon: 'Ejderhan dinleniyor. {time} sonra tekrar oynayın.',
  playedHint: 'Ejderhan keyiflendi.',
  levelUp: 'Seviye {level}!',
  xpGain: '+{n} XP',
  dragonName: 'Ateş Ejderhası',
  lvShort: 'Sv. {level}',
  slotLockedFeed: 'Bu ejderhanın yuvası kilitli.',
  unlockSlot: 'Yuvayı aç',
  slotLockedTitle: 'Kilitli yuva',
  slotLockedBody: 'Açtığında bu ejderhayı besleyip büyütebilirsin.',

  eggTitle: 'Sv. {lv} yumurta',
  eggYield: 'Toplayınca {a} - {b} yem',
  eggJackpot: 'Jackpot: %{p} ihtimalle {n} yem',
  eggMergeHint: 'Birleştirirsen Sv. {lv}: {a} - {b} yem',
  collect: 'Topla',
  collectIn: '{time} sonra dolar',
  chestFood: 'Yem sandığı',
  chestStar: 'Yıldız sandığı',
  chestOpen: 'Sandığı aç',
  chestGivesFood: 'İçinden {n} yem çıkar',
  chestGivesStar: 'İçinden {n} yıldız çıkar',
  mergeChestHint: 'Birleştirirsen değeri {n} olur',
  lockedTitle: 'Kilitli hücre',
  lockedBody: 'Açtığında hem hücre hem içindeki ödül senin olur.',
  unlock: 'Aç',
  needStars: 'Yeterli yıldızın yok.',
  jackpotMsg: 'JACKPOT!',
  gotFood: '+{n} yem',
  gotStars: '+{n} yıldız',
  close: 'Kapat',

  tasksTitle: 'Görevler',
  tasksHint: 'Tamamla, ödülü al.',
  taskMerge: '{n} birleştirme yap',
  taskFeed: 'Ejderhanı {n} kez besle',
  taskCollect: '{n} yumurta topla',
  claim: 'Al',
  claimed: 'Alındı',

  tutNext: 'Devam',
  tut1: 'Hoş geldin genç ejderha bakıcısı! Sana düzeni göstereyim.',
  tut2: 'Önce ejderhanı besle. Yem verdiğinde sana bir yumurta bırakır.',
  tut3: 'Yumurta ocağa düştü. Bir kez daha besle ki ikinci yumurtan olsun.',
  tut4: 'Şimdi aynı iki yumurtayı üst üste sürükle.',
  tut5: 'İşte bu! Birleşen yumurta çok daha fazla yem üretir.',
  tut6: 'Dolan yumurtaya dokun ve yemi topla. Jackpot çıkarsa bir anda zengin olursun.',
});

registerItemTexts(ITEM_TEXTS);

/* ---------- DOM ---------- */

const bootEl = document.getElementById('boot');
const bootFill = document.getElementById('boot-fill');
const bootText = document.getElementById('boot-text');
const shellEl = document.getElementById('shell');

const foodValue = document.getElementById('food-value');
const starValue = document.getElementById('star-value');
const resFood = document.getElementById('res-food');
const resStar = document.getElementById('res-star');

const boardEl = document.getElementById('board');
const slotStrip = document.getElementById('slot-strip');
const stageEl = document.getElementById('stage');
const artEl = document.getElementById('dragon-art');
const floatersEl = document.getElementById('floaters');
const flyFood = document.getElementById('fly-food');
const dragonCard = document.getElementById('dragon-card');
const dragonNameEl = document.getElementById('dragon-name');
const dragonLvEl = document.getElementById('dragon-lv');
const xpFill = document.getElementById('xp-fill');
const xpValue = document.getElementById('xp-value');
const hungerValue = document.getElementById('hunger-value');
const happyValue = document.getElementById('happy-value');
const feedBtn = document.getElementById('feed-btn');
const feedCostEl = document.getElementById('feed-cost');
const dragonActions = feedBtn.parentElement;

const taskListEl = document.getElementById('task-list');
const taskDot = document.getElementById('task-dot');
const tabbar = document.getElementById('tabbar');

/* ---------- DURUM ---------- */

let oyuncu = null;
let board = null;
let tut = null;
let busy = false;

const bicim = (n) => Number(n).toLocaleString(locale());
const simdi = () => Date.now();

const GOREVLER = [
  { id: 'merge', hedef: 5, sayac: 'merges', ikon: 'assets/eggs/egg-3.webp',
    baslikKey: 'taskMerge', odul: { food: 60 } },
  { id: 'feed', hedef: 3, sayac: 'feeds', ikon: '../../assets/food/meat-128.webp',
    baslikKey: 'taskFeed', odul: { food: 40 } },
  { id: 'collect', hedef: 8, sayac: 'collects', ikon: '../../assets/currency/star-128.webp',
    baslikKey: 'taskCollect', odul: { stars: 2 } },
];

/* ---------- ACILIS ---------- */

function bakimEkrani() {
  document.body.innerHTML = `<div class="maint">
    <img src="../../assets/currency/mh-logo-256.webp" alt="">
    <p>${t('maintenance')}</p>
  </div>`;
}

function onYukle(urls, ilerleme) {
  let bitti = 0;
  const toplam = urls.length || 1;
  return Promise.all(urls.map((url) => new Promise((cozul) => {
    const img = new Image();
    const son = () => { bitti += 1; ilerleme(bitti / toplam); cozul(); };
    img.onload = son;
    img.onerror = son;
    img.src = url;
  })));
}

async function basla() {
  initTelegram();
  applyStaticTexts();

  /* Bakim kilidini SUNUCU veriyor; yerel gelistirme sunucusunda sunucuya
     ulasilamadigi icin sadece localhost'ta atlaniyor. */
  const yerelTest = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!yerelTest && await bakimdaMi(GAME_ID)) { bakimEkrani(); return; }

  oyuncu = await oyuncuyuYukle();

  board = createBoard(boardEl, {
    onMerge: birlesti,
    onPick: hucreyeDokunuldu,
    onChange: kaydet,
  });
  board.bagla(oyuncu.grid);

  const ejderha = aktifEjderha(oyuncu);
  await onYukle([
    ...onYukleListesi(),
    ...pozListesi(),
    '../../assets/board/frame-512.webp',
    '../../assets/food/meat-128.webp',
    '../../assets/currency/star-128.webp',
    '../../assets/currency/mh-logo-256.webp',
    ...(ejderha ? dragonAssetUrls(ejderha.look) : []),
  ], (oran) => {
    bootFill.style.width = `${Math.round(oran * 100)}%`;
    bootText.textContent = `${t('loading')} ${Math.round(oran * 100)}%`;
  });

  cizHepsi();
  shellEl.hidden = false;
  bootEl.classList.add('is-gone');
  setTimeout(() => { bootEl.hidden = true; }, 400);

  /* v5 gecisinde eski $MH harcamasi yem olarak iade edildiyse bir kez bildir */
  if (oyuncu.iadeEdilenYem) {
    const n = oyuncu.iadeEdilenYem;
    delete oyuncu.iadeEdilenYem;
    kaydet();
    setTimeout(() => odulUcur(t('refundMsg', { n: bicim(n) }), true), 600);
  }

  showBackButton(hubaDon);
  backToHubOnResume();
  window.addEventListener('resize', () => tut?.yenidenKonumla());
  setInterval(tazele, 1000);

  tutorialKur();
  if (oyuncu.tutorial < 99) tut.basla(tutorialAdimlari());
}

const hubaDon = () => { location.href = '../../index.html'; };
const kaydet = () => oyuncuyuKaydet(oyuncu);

/* ---------- EKRAN GECISI ---------- */

function ekranGoster(ad) {
  document.body.dataset.screen = ad;
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== ad; });
  tabbar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-on', b.dataset.go === ad));
  if (ad === 'grid') board.ciz();
  if (ad === 'tasks') gorevleriCiz();
  tut?.yenidenKonumla();
}

tabbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  haptic.tap('light');
  ekranGoster(btn.dataset.go);
});

/* ---------- PENCERE ---------- */

const pencereKapat = () => document.querySelector('.sheet')?.remove();

/* Ortak alt pencere: ikon, baslik, satirlar ve istege bagli eylem dugmesi. */
function pencere({ ikon, baslik, satirlar, eylem, eylemAktif = true, ipucu }) {
  pencereKapat();
  const kok = document.createElement('div');
  kok.className = 'sheet';
  kok.innerHTML = `
    <div class="sheet-box">
      ${ikon ? `<img class="sheet-icon" src="${ikon}" alt="">` : ''}
      <h3>${baslik}</h3>
      <div class="sheet-rows">${satirlar.map((s) => `<p>${s}</p>`).join('')}</div>
      ${ipucu ? `<p class="sheet-hint">${ipucu}</p>` : ''}
      <div class="sheet-actions">
        ${eylem ? `<button class="act-btn primary" id="sheet-do"${eylemAktif ? '' : ' disabled'}>${eylem.etiket}</button>` : ''}
        <button class="act-btn" id="sheet-close">${t('close')}</button>
      </div>
    </div>`;
  kok.addEventListener('click', (e) => { if (e.target === kok) pencereKapat(); });
  kok.querySelector('#sheet-close').addEventListener('click', pencereKapat);
  if (eylem) {
    kok.querySelector('#sheet-do').addEventListener('click', () => { pencereKapat(); eylem.calistir(); });
  }
  document.body.appendChild(kok);
}

/* ---------- IZGARA ---------- */

function birlesti(yeni) {
  oyuncu.tasks.merges += 1;
  kaydet();
  haptic.tap('medium');
  gorevNoktasi();
  tut?.olay('merge');
  if (yeni.t !== 'egg') kaynakTazele();
}

function hucreyeDokunuldu(i, hucre) {
  if (kilitliMi(hucre)) { kilitPenceresi(i, hucre); return; }
  if (!nesneMi(hucre)) return;
  if (hucre.t === 'egg') yumurtaPenceresi(i, hucre);
  else sandikPenceresi(i, hucre);
}

function yumurtaPenceresi(i, hucre) {
  const a = YUMURTA[hucre.lv];
  const ust = hucre.lv < enUstSeviye('egg') ? YUMURTA[hucre.lv + 1] : null;
  const kalan = (hucre.r || 0) - simdi();
  const hazir = kalan <= 0;

  pencere({
    ikon: gorselYolu(hucre),
    baslik: t('eggTitle', { lv: hucre.lv }),
    satirlar: [
      t('eggYield', { a: bicim(a.az), b: bicim(a.cok) }),
      t('eggJackpot', { p: Math.round(a.sans * 100), n: bicim(a.jackpot) }),
    ],
    ipucu: ust ? t('eggMergeHint', { lv: hucre.lv + 1, a: bicim(ust.az), b: bicim(ust.cok) }) : '',
    eylem: {
      etiket: hazir ? t('collect') : t('collectIn', { time: sureMetni(kalan) }),
      calistir: () => yumurtaTopla(i),
    },
    eylemAktif: hazir,
  });
}

function yumurtaTopla(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!hazirMi(hucre)) return;

  const { miktar, jackpot } = toplamaSonucu(hucre.lv);
  oyuncu.food += miktar;
  hucre.r = simdi() + TOPLAMA_SURESI;
  oyuncu.tasks.collects += 1;
  kaydet();
  board.ciz();
  kaynakTazele(true);
  gorevNoktasi();
  haptic.success();
  odulUcur(jackpot
    ? `${t('jackpotMsg')} ${t('gotFood', { n: bicim(miktar) })}`
    : t('gotFood', { n: bicim(miktar) }), jackpot);
  tut?.olay('collect');
}

function sandikPenceresi(i, hucre) {
  const deger = sandikDegeri(hucre.t, hucre.lv);
  const ustDeger = hucre.lv < enUstSeviye(hucre.t) ? sandikDegeri(hucre.t, hucre.lv + 1) : 0;
  pencere({
    ikon: gorselYolu(hucre),
    baslik: t(hucre.t === 'star' ? 'chestStar' : 'chestFood'),
    satirlar: [t(hucre.t === 'star' ? 'chestGivesStar' : 'chestGivesFood', { n: bicim(deger) })],
    ipucu: ustDeger ? t('mergeChestHint', { n: bicim(ustDeger) }) : '',
    eylem: { etiket: t('chestOpen'), calistir: () => sandikAc(i) },
  });
}

function sandikAc(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!nesneMi(hucre) || hucre.t === 'egg') return;
  const deger = sandikDegeri(hucre.t, hucre.lv);
  if (hucre.t === 'star') oyuncu.stars += deger;
  else oyuncu.food += deger;
  oyuncu.grid.cells[i] = null;
  kaydet();
  board.ciz();
  kaynakTazele(true);
  haptic.success();
  odulUcur(hucre.t === 'star'
    ? t('gotStars', { n: bicim(deger) })
    : t('gotFood', { n: bicim(deger) }), true);
}

function kilitPenceresi(i, hucre) {
  const odul = hucre.odul;
  const odulAdi = odul.t === 'egg'
    ? t('eggTitle', { lv: odul.lv })
    : t(odul.t === 'star' ? 'chestStar' : 'chestFood');

  pencere({
    ikon: gorselYolu(odul),
    baslik: t('lockedTitle'),
    satirlar: [t('lockedBody'), `<b class="odul-satir">${odulAdi}</b>`],
    ipucu: `<span class="odul"><img src="../../assets/currency/star-64.webp" alt="">${bicim(hucre.fiyat)}</span>`,
    eylem: { etiket: t('unlock'), calistir: () => kilidiAc(i) },
    eylemAktif: oyuncu.stars >= hucre.fiyat,
  });
}

function kilidiAc(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!kilitliMi(hucre)) return;
  if (oyuncu.stars < hucre.fiyat) { uyar(t('needStars')); return; }

  oyuncu.stars -= hucre.fiyat;
  const odul = hucre.odul;
  oyuncu.grid.cells[i] = odul.t === 'egg'
    ? { t: 'egg', lv: odul.lv, r: simdi() }
    : { t: odul.t, lv: odul.lv };
  kaydet();
  board.ciz();
  kaynakTazele(true);
  haptic.success();
}

/* ---------- EJDERHA ---------- */

const yuzde = (bas, saat) => Math.max(0, Math.min(100,
  Math.round(100 - ((simdi() - bas) / (saat * 3600 * 1000)) * 100)));

const doyum = (d) => yuzde(d.lastFed || d.createdAt, CONFIG.FULL_HOURS);
const keyif = (d) => Math.max(0, Math.min(100, Math.round(
  (d.happiness ?? 100)
  - ((simdi() - (d.lastPlayed || d.createdAt)) / (CONFIG.HAPPY_HOURS * 3600 * 1000)) * 100)));

feedBtn.addEventListener('click', async () => {
  const d = aktifEjderha(oyuncu);
  if (!d || busy) return;
  if (!yuvaAcikMi(oyuncu, d)) { uyar(t('slotLockedFeed')); return; }

  const fiyat = yemMaliyeti(d.level, d.xp);
  if (oyuncu.food < fiyat) { uyar(t('noFood')); return; }

  busy = true;
  oyuncu.food -= fiyat;
  oyuncu.tasks.feeds += 1;
  kaynakTazele(true);

  await yemAnimasyonu();

  d.lastFed = simdi();
  xpVer(d, CONFIG.FEED_XP);
  yumurtaBirak();
  kaydet();
  busy = false;
  gorevNoktasi();
  ejderhaCiz();
  tut?.olay('feed');
});

/* Besleme odulu: %80 Lv1, %20 Lv2 yumurta.
   Tutorial sirasinda hep Lv1 geliyor; yoksa iki farkli seviye cikip
   "birlestir" adimi tikaniyordu. */
function yumurtaBirak() {
  if (!bosHucreVarMi(oyuncu.grid)) { uyar(t('gridFullEgg')); return; }
  const lv = oyuncu.tutorial < 99 ? 1 : beslemeYumurtaSeviyesi();
  nesneKoy(oyuncu.grid, { t: 'egg', lv });
  board.ciz();
  ucur(t('laidEgg'));
}

function xpVer(d, miktar) {
  d.xp += miktar;
  ucur(t('xpGain', { n: miktar }));
  const gereken = xpNeeded(d.level);
  if (d.xp >= gereken && d.level < CONFIG.MAX_LEVEL) {
    d.xp -= gereken;
    d.level += 1;
    haptic.success();
    ucur(t('levelUp', { level: d.level }));
  }
}

function yemAnimasyonu() {
  return new Promise((cozul) => {
    flyFood.hidden = false;
    flyFood.style.transition = 'none';
    flyFood.style.left = '6%';
    flyFood.style.top = '62%';
    flyFood.style.opacity = '1';
    flyFood.style.transform = 'scale(0.7)';

    requestAnimationFrame(() => {
      flyFood.style.transition = 'left .45s ease-in, top .45s ease-in, transform .45s ease-in, opacity .2s ease .35s';
      flyFood.style.left = '44%';
      flyFood.style.top = '38%';
      flyFood.style.transform = 'scale(1.1)';
      flyFood.style.opacity = '0';
    });

    setTimeout(() => {
      flyFood.hidden = true;
      artEl.classList.add('eating');
      haptic.tap('medium');
      setTimeout(() => { artEl.classList.remove('eating'); cozul(); }, 600);
    }, 480);
  });
}

/* Yuva seridi: acik yuvalar, kilitli ejderhalar, satin alinabilir bos yuva */
function slotlariCiz() {
  slotStrip.innerHTML = '';

  oyuncu.dragons.forEach((d, sira) => {
    const kilitli = sira >= oyuncu.unlockedSlots;
    const btn = document.createElement('button');
    btn.className = `slot${kilitli ? ' locked' : ''}${d.id === oyuncu.activeId ? ' is-on' : ''}`;
    btn.innerHTML = `<div class="mini">${dragonSvg(gorselSeviye(d.level), d.look, 'happy')}</div>`;
    if (kilitli) {
      btn.innerHTML += '<span class="slot-lock"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0110 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/></svg></span>';
      btn.addEventListener('click', () => yuvaPenceresi(oyuncu.unlockedSlots));
    } else {
      btn.addEventListener('click', () => { oyuncu.activeId = d.id; kaydet(); cizHepsi(); });
    }
    slotStrip.appendChild(btn);
  });

  if (oyuncu.dragons.length < EN_COK_YUVA) {
    const btn = document.createElement('button');
    btn.className = 'slot empty';
    btn.innerHTML = `<span class="slot-buy"><img src="../../assets/currency/star-64.webp" alt="">${bicim(yuvaFiyati(oyuncu.unlockedSlots))}</span>`;
    btn.addEventListener('click', () => yuvaPenceresi(oyuncu.unlockedSlots));
    slotStrip.appendChild(btn);
  }
}

function yuvaPenceresi(sira) {
  const fiyat = yuvaFiyati(sira);
  pencere({
    ikon: '../../assets/currency/star-128.webp',
    baslik: t('slotLockedTitle'),
    satirlar: [t('slotLockedBody')],
    ipucu: `<span class="odul"><img src="../../assets/currency/star-64.webp" alt="">${bicim(fiyat)}</span>`,
    eylem: { etiket: t('unlockSlot'), calistir: () => yuvaAc(sira, fiyat) },
    eylemAktif: oyuncu.stars >= fiyat,
  });
}

function yuvaAc(sira, fiyat) {
  if (sira !== oyuncu.unlockedSlots) return;      /* yuvalar sirayla acilir */
  if (oyuncu.stars < fiyat) { uyar(t('needStars')); return; }
  oyuncu.stars -= fiyat;
  oyuncu.unlockedSlots = Math.min(EN_COK_YUVA, oyuncu.unlockedSlots + 1);
  kaydet();
  haptic.success();
  cizHepsi();
}

function ejderhaCiz() {
  const d = aktifEjderha(oyuncu);
  slotlariCiz();
  if (!d) return;

  const acik = yuvaAcikMi(oyuncu, d);
  stageEl.hidden = false;
  dragonCard.hidden = false;
  dragonActions.hidden = false;

  artEl.innerHTML = dragonSvg(gorselSeviye(d.level), d.look,
    doyum(d) < CONFIG.HUNGRY_BELOW ? 'sad' : 'happy');
  artEl.classList.toggle('dim', !acik);

  const gereken = xpNeeded(d.level);
  const son = d.level >= CONFIG.MAX_LEVEL;   /* tavanda cubuk hep dolu */
  dragonNameEl.textContent = d.name || t('dragonName');
  dragonLvEl.textContent = t('lvShort', { level: bicim(d.level) });
  xpFill.style.width = son ? '100%' : `${(d.xp / gereken) * 100}%`;
  xpValue.textContent = son ? t('maxLevel') : `${d.xp}/${gereken}`;

  const dy = doyum(d);
  const ky = keyif(d);
  hungerValue.textContent = `${dy}%`;
  hungerValue.classList.toggle('low', dy < CONFIG.HUNGRY_BELOW);
  happyValue.textContent = `${ky}%`;
  happyValue.classList.toggle('low', ky < CONFIG.HUNGRY_BELOW);

  const fiyat = yemMaliyeti(d.level, d.xp);
  feedCostEl.textContent = bicim(fiyat);
  feedBtn.disabled = busy || !acik || oyuncu.food < fiyat;
}

/* ---------- GOREVLER ---------- */

function gorevDurumu(g) {
  const sayi = oyuncu.tasks[g.sayac] || 0;
  return { sayi: Math.min(sayi, g.hedef), tamam: sayi >= g.hedef,
           alindi: oyuncu.tasks.claimed.includes(g.id) };
}

function odulRozeti(odul) {
  if (odul.food) return `<span class="odul"><img src="../../assets/food/meat-64.webp" alt="">${odul.food}</span>`;
  if (odul.stars) return `<span class="odul"><img src="../../assets/currency/star-64.webp" alt="">${odul.stars}</span>`;
  return '';
}

function gorevleriCiz() {
  taskListEl.innerHTML = '';
  for (const g of GOREVLER) {
    const { sayi, tamam, alindi } = gorevDurumu(g);
    const el = document.createElement('div');
    el.className = `task${alindi ? ' done' : ''}`;
    el.innerHTML = `
      <div class="task-icon"><img src="${g.ikon}" alt=""></div>
      <div class="task-body">
        <div class="task-title">${t(g.baslikKey, { n: g.hedef })}</div>
        <div class="task-prog">
          <div class="bar"><i style="width:${(sayi / g.hedef) * 100}%"></i></div>
          <span>${sayi}/${g.hedef} · ${odulRozeti(g.odul)}</span>
        </div>
      </div>
      <button class="task-claim"${(!tamam || alindi) ? ' disabled' : ''}>
        ${alindi ? t('claimed') : t('claim')}
      </button>`;
    el.querySelector('button').addEventListener('click', () => {
      const durum = gorevDurumu(g);
      if (!durum.tamam || durum.alindi) return;
      oyuncu.tasks.claimed.push(g.id);
      if (g.odul.food) oyuncu.food += g.odul.food;
      if (g.odul.stars) oyuncu.stars += g.odul.stars;
      kaydet();
      haptic.success();
      kaynakTazele(true);
      gorevleriCiz();
      gorevNoktasi();
    });
    taskListEl.appendChild(el);
  }
}

function gorevNoktasi() {
  taskDot.hidden = !GOREVLER.some((g) => {
    const { tamam, alindi } = gorevDurumu(g);
    return tamam && !alindi;
  });
}

/* ---------- ORTAK ---------- */

function kaynakTazele(zipla = false) {
  foodValue.textContent = bicim(oyuncu.food);
  starValue.textContent = bicim(oyuncu.stars);
  if (!zipla) return;
  for (const el of [resFood, resStar]) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
}

function cizHepsi() {
  kaynakTazele();
  ejderhaCiz();
  gorevleriCiz();
  gorevNoktasi();
  tazele();
}

/* Saniyede bir: dolan yumurtalar ve besleme sayaci */
let sonCizim = 0;
function tazele() {
  if (!document.getElementById('screen-dragon').hidden) ejderhaCiz();

  if (!document.getElementById('screen-grid').hidden) {
    const dolan = oyuncu.grid.cells.some((c) => c?.t === 'egg' && c.r > sonCizim && c.r <= simdi());
    if (dolan) board.ciz();
  }
  sonCizim = simdi();
}

function sureMetni(ms) {
  const sn = Math.max(0, Math.ceil(ms / 1000));
  if (sn < 60) return `${sn}s`;
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk}dk`;
  return `${Math.floor(dk / 60)}sa`;
}

function ucur(metin) {
  const el = document.createElement('span');
  el.textContent = metin;
  floatersEl.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/* Odul bildirimi: ekranin ortasinda, jackpotta daha buyuk */
function odulUcur(metin, buyuk = false) {
  const el = document.createElement('div');
  el.className = `prize${buyuk ? ' big' : ''}`;
  el.textContent = metin;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function uyar(metin) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = metin;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/* ---------- TUTORIAL ---------- */

function tutorialKur() {
  tut = createTutorial({
    kok: document.getElementById('tut'),
    maske: document.getElementById('tut-mask'),
    buyucu: document.getElementById('tut-wizard'),
    metin: document.getElementById('tut-text'),
    ileriBtn: document.getElementById('tut-next'),
    t,
    bitince() { oyuncu.tutorial = 99; kaydet(); },
  });
}

function tutorialAdimlari() {
  /* Tutorial sirasinda besleme beklemesi ve yem sikintisi oyuncuyu
     tikamasin diye her adimda sifirlaniyor. */
  const beslemeyiAc = () => {
    const d = aktifEjderha(oyuncu);
    if (d) d.lastFed = 0;
    if (oyuncu.food < 1) oyuncu.food = 3;
    kaynakTazele();
    ejderhaCiz();
  };
  return [
    { key: 'tut1', poz: 'greet', girince: () => ekranGoster('dragon') },
    { key: 'tut2', poz: 'teach', bekle: 'feed', delik: () => feedBtn, girince: beslemeyiAc },
    { key: 'tut3', poz: 'teach', bekle: 'feed', delik: () => feedBtn, girince: beslemeyiAc },
    { key: 'tut4', poz: 'teach', bekle: 'merge', delik: () => boardEl,
      girince: () => ekranGoster('grid') },
    { key: 'tut5', poz: 'cheer' },
    { key: 'tut6', poz: 'teach', bekle: 'collect', delik: () => boardEl },
  ];
}

/* ---------- BASLAT ---------- */

document.getElementById('back-link').addEventListener('click', hubaDon);

basla().catch((hata) => {
  console.error(hata);
  bootText.textContent = String(hata?.message || hata);
});
