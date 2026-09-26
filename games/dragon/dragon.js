import { initTelegram, haptic, showBackButton, backToHubOnResume, getUser } from '../../js/tg.js?v152';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js?v152';

import { CONFIG, gorselSeviye } from './config.js?v152';
import { bakimdaMi } from '../../js/store.js?v152';
import { oyuncuyuYukle, oyuncuyuKaydet, aktifEjderha, yuvaAcikMi, bugun,
         EN_COK_YUVA } from './model.js?v152';
import { dragonSvg, dragonAssetUrls } from './art.js?v152';
import { ucur, zipla, sayacAkit, belir } from './canlandir.js?v152';
import { sesBaslat, cal, sesAcikMi, sesiAyarla } from './ses.js?v152';
import { createBoard, nesneKoy, bosHucreVarMi, gorselYolu, onYukleListesi,
         kilitliMi, nesneMi } from './grid.js?v152';
import { YUMURTA, BESLEME_PENCERESI, SIRA_GOSTERILEN,
         GUNLUK_ODULLER, GOREV_HARITASI, yemMaliyeti, seviyeIcinBesleme,
         toplamaSonucu, sandikDegeri, sandikAraligi, ustBasamakMi,
         beslemeYumurtaSeviyesi, yuvaFiyati } from './ekonomi.js?v152';
import { createTutorial, pozListesi } from './tutorial.js?v152';

const GAME_ID = 'dragon';

registerTexts(GAME_ID, {
  title: 'Ejderha Adası',
  loading: 'Yükleniyor',
  maintenance: 'Ejderha Adası bakımda. Kısa süre sonra geri dönecek.',

  tabGrid: 'Ocak',
  tabDragon: 'Ejderha',
  tabTasks: 'Görevler',

  upNext: 'Sırada',
  tapHint: 'Bir öğeye dokun, ne vereceğini gör.',
  queueMore: '+{n} tane daha',
  queuedMsg: 'Ödül sırada bekliyor, izgarada yer aç.',

  eggName: 'Sv. {lv} yumurta',
  eggYield: '{a} - {b} yem · %{p} ihtimalle {n} yem',
  packFood1: 'Yem kesesi',
  packFood2: 'Yem sepeti',
  packFood3: 'Yem sandığı',
  packFood4: 'Usta yem sandığı',
  packStar1: 'Yıldız kesesi',
  packStar2: 'Yıldız sepeti',
  packStar3: 'Yıldız sandığı',
  packStar4: 'Usta yıldız sandığı',
  chestGivesFood: '{a} - {b} yem verir',
  chestGivesStar: '{a} - {b} yıldız verir',
  mergeNote: 'Eşiyle birleştir, ödül büyür',
  topPackNote: 'En üst kademe. Aç ve ödülü al.',
  crack: 'Kır',
  chestOpen: 'Aç',
  lockedName: 'Kilitli hücre',
  lockedLine: 'İçinde {name} var',
  unlock: 'Aç · {n} yıldız',
  needStars: 'Yeterli yıldızın yok.',

  feed: 'Besle',
  noFood: 'Yemin yetmiyor. Izgaradaki dolu yumurtaları kır.',
  appetite: 'İştah büyüyor · {time} sonra sıfırlanır',
  appetiteFresh: 'İştahı taze, ilk besleme en ucuzu.',
  laidEgg: 'Ejderhan bir yumurta bıraktı!',
  gridFullEgg: 'Izgara dolu, yumurta sıraya girdi.',
  levelUp: 'Seviye {level}!',
  dragonName: 'Ateş Ejderhası',
  lvShort: 'Sv. {level}',
  slotsTitle: 'Ejderha yuvaları',
  slotLockedFeed: 'Bu ejderhanın yuvası kilitli.',
  emptySlot: 'Boş yuva',

  dailyTitle: 'Günlük ödül',
  dailyClaim: 'Ödülü al',
  dailyDone: 'Yarın gel',
  dailyNote: '{n}. gün',
  questTitle: 'Görev haritası',
  questMerge: '{n} birleştirme yap',
  questFeed: 'Ejderhanı {n} kez besle',
  questCollect: '{n} kez yumurta kır',
  questEgglv: 'Sv. {n} yumurtaya ulaş',
  questDraglv: 'Ejderhanı Sv. {n} yap',
  questClaim: 'Al',
  questDone: 'Tamam',
  gotFood: '+{n} yem',
  gotStars: '+{n} yıldız',
  gotItem: '{name} kazandın',
  jackpotMsg: 'JACKPOT!',
  soundOn: 'Sesi kapat',
  soundOff: 'Sesi aç',
  bigHitMsg: 'BÜYÜK VURUŞ!',
  refundMsg: 'Eskiden ejderhana harcadığın $MH karşılığı {n} yem hesabına eklendi.',

  unitS: 'sn',
  unitM: 'dk',
  unitH: 'sa',

  tutNext: 'Devam',
  tut1: 'Hoş geldin genç ejderha bakıcısı! Sana düzeni göstereyim.',
  tut2: 'Önce ejderhanı besle. Her yem verişinde sana bir yumurta bırakır.',
  tut3: 'Yumurta ocağa düştü. Bir kez daha besle ki ikinci yumurtan olsun.',
  tut4: 'Şimdi aynı iki yumurtayı üst üste sürükle.',
  tut5: 'İşte bu! Birleşen yumurta çok daha fazla yem üretir.',
  tut6: 'Dolan yumurtaya dokun ve kır. Jackpot çıkarsa bir anda zengin olursun.',
});

/* ---------- DOM ---------- */

const $ = (id) => document.getElementById(id);

const bootEl = $('boot'); const bootFill = $('boot-fill'); const bootText = $('boot-text');
const shellEl = $('shell');
const avatarEl = $('avatar'); const userNameEl = $('user-name');
const foodValue = $('food-value'); const starValue = $('star-value');
const resFood = $('res-food'); const resStar = $('res-star');

const boardEl = $('board');
const queueRow = $('queue-row'); const queueEl = $('queue'); const queueMore = $('queue-more');
const infoEmpty = $('info-empty'); const infoBody = $('info-body');
const infoName = $('info-name'); const infoTag = $('info-tag');
const infoLine = $('info-line'); const infoNote = $('info-note');
const infoAction = $('info-action');

const artEl = $('dragon-art');
const floatersEl = $('floaters'); const flyFood = $('fly-food');
const dragonNameEl = $('dragon-name'); const dragonLvEl = $('dragon-lv');
const xpFill = $('xp-fill'); const appetiteEl = $('appetite');
const feedBtn = $('feed-btn'); const feedCostEl = $('feed-cost');
const slotStrip = $('slot-strip');

const dailyRow = $('daily-row'); const dailyNote = $('daily-note'); const dailyClaim = $('daily-claim');
const questPath = $('quest-path');
const taskDot = $('task-dot'); const tabbar = $('tabbar');
const sesBtn = $('ses-btn');

/* ---------- DURUM ---------- */

let oyuncu = null;
let board = null;
let tut = null;
let busy = false;
let seciliHucre = -1;

const bicim = (n) => Number(n).toLocaleString(locale());
const simdi = () => Date.now();

/* Kap adi kademesine gore degisiyor: kese, sepet, sandik, usta sandigi. */
function nesneAdi(h) {
  if (!h) return '';
  if (h.t === 'egg') return t('eggName', { lv: h.lv });
  const kademe = Math.min(4, Math.max(1, h.lv));
  return t(`${h.t === 'star' ? 'packStar' : 'packFood'}${kademe}`);
}

/* ---------- ACILIS ---------- */

function bakimEkrani() {
  document.body.innerHTML = `<div class="maint">
    <img src="../../assets/currency/mh-logo-256.webp" alt="">
    <p>${t('maintenance')}</p></div>`;
}

function onYukle(urls, ilerleme) {
  let bitti = 0;
  const toplam = urls.length || 1;
  return Promise.all(urls.map((url) => new Promise((cozul) => {
    const img = new Image();
    const son = () => { bitti += 1; ilerleme(bitti / toplam); cozul(); };
    img.onload = son; img.onerror = son; img.src = url;
  })));
}

function kullaniciyiCiz() {
  const u = getUser();
  userNameEl.textContent = u.name;
  if (u.photo) avatarEl.style.backgroundImage = `url("${u.photo}")`;
  else avatarEl.textContent = (u.name || '?').charAt(0).toUpperCase();
}

async function basla() {
  initTelegram();
  applyStaticTexts();
  kullaniciyiCiz();

  const yerelTest = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!yerelTest && await bakimdaMi(GAME_ID)) { bakimEkrani(); return; }

  oyuncu = await oyuncuyuYukle();

  board = createBoard(boardEl, { onMerge: birlesti, onPick: hucreSecildi, onChange: izgaraDegisti });
  board.bagla(oyuncu.grid);

  const ejderha = aktifEjderha(oyuncu);
  await onYukle([
    ...onYukleListesi(), ...pozListesi(),
    '../../assets/board/frame-512.webp',
    '../../assets/food/meat-128.webp',
    '../../assets/currency/star-128.webp',
    '../../assets/icons/dragon-128.webp',
    ...(ejderha ? dragonAssetUrls(ejderha.look) : []),
  ], (oran) => {
    bootFill.style.width = `${Math.round(oran * 100)}%`;
    bootText.textContent = `${t('loading')} ${Math.round(oran * 100)}%`;
  });

  siradanDoldur();      /* acilista bekleyen oduller izgaraya insin */
  cizHepsi();
  shellEl.hidden = false;
  bootEl.classList.add('is-gone');
  setTimeout(() => { bootEl.hidden = true; }, 400);

  if (oyuncu.iadeEdilenYem) {
    const n = oyuncu.iadeEdilenYem;
    delete oyuncu.iadeEdilenYem;
    kaydet();
    setTimeout(() => odulUcur(t('refundMsg', { n: bicim(n) }), true), 600);
  }

  showBackButton(hubaDon);
  backToHubOnResume();
  window.addEventListener('resize', () => tut?.yenidenKonumla());
  /* Ses dugmesi: acikken dalgali hoparlor, kapaliyken carpili.
     Govde ayni kaliyor, sadece sagdaki kisim degisiyor - goz dugmenin
     yerini kaybetmesin. */
  const HOPARLOR = '<path d="M4 9.5h3.2L12 6v12L7.2 14.5H4z" fill="currentColor"/>';
  const DALGALAR = '<path d="M15.4 9.8a3.2 3.2 0 010 4.4M18 7.6a6.6 6.6 0 010 8.8"'
    + ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  const CARPI = '<path d="M16.2 9.8l4.6 4.4M20.8 9.8l-4.6 4.4"'
    + ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';

  const sesYuzu = () => {
    const a = sesAcikMi();
    sesBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${HOPARLOR}${a ? DALGALAR : CARPI}</svg>`;
    sesBtn.classList.toggle('kapali', !a);
    sesBtn.setAttribute('aria-label', a ? t('soundOn') : t('soundOff'));
    sesBtn.setAttribute('aria-pressed', a ? 'false' : 'true');
  };
  sesBtn.addEventListener('click', () => { sesiAyarla(!sesAcikMi()); sesYuzu(); cal('tap'); });
  sesBaslat();
  sesYuzu();
  setInterval(tazele, 1000);

  tutorialKur();
  if (oyuncu.tutorial < 99) tut.basla(tutorialAdimlari());
}

const hubaDon = () => { location.href = '../../index.html'; };
const kaydet = () => oyuncuyuKaydet(oyuncu);

/* ---------- EKRAN ---------- */

function ekranGoster(ad) {
  document.body.dataset.screen = ad;
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== ad; });
  tabbar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-on', b.dataset.go === ad));
  if (ad === 'grid') { board.ciz(); board.sec(seciliHucre); }
  if (ad === 'dragon') ejderhaCiz();
  if (ad === 'tasks') { gunlukCiz(); gorevleriCiz(); }
  tut?.yenidenKonumla();
}

tabbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  haptic.tap('light');
  cal('tap');
  ekranGoster(btn.dataset.go);
});

$('user-chip').addEventListener('click', hubaDon);

/* ---------- ODUL DAGITIMI ---------- */

/* Odul once izgaraya iner; yer yoksa siraya girer. Sira da doluysa oyuncu
   uyarilir: birlestirip yer acmasi gerekir. */
function nesneVer(nesne) {
  if (bosHucreVarMi(oyuncu.grid)) {
    const yer = nesneKoy(oyuncu.grid, nesne);
    board.ciz(); board.sec(seciliHucre);
    sonKonan = yer;
    return 'izgara';
  }
  /* Sira sinirsiz: kazanilan odul asla kaybolmuyor. */
  oyuncu.sira.push({ ...nesne });
  siraCiz();
  return 'sira';
}

let sonKonan = -1;   /* nesneVer'in izgarada kullandigi hucre */

/* Odul, alindigi dugmeden cikip gidecegi yere ucuyor: yem ve yildiz
   ust bardaki sayacina, nesne ise indigi izgara hucresine ya da siraya. */
function odulVer(odul, kaynak) {
  const yer = kaynak || resFood;

  if (odul.food) {
    oyuncu.food += odul.food;
    kazanimUcur(yer, 'food', 5);
    odulUcur(t('gotFood', { n: bicim(odul.food) }), true);
  }
  if (odul.stars) {
    oyuncu.stars += odul.stars;
    kazanimUcur(yer, 'star', 4);
    odulUcur(t('gotStars', { n: bicim(odul.stars) }), true);
  }
  if (odul.item) {
    sonKonan = -1;
    const nereye = nesneVer({ ...odul.item });
    if (nereye === 'sira') {
      ucur({ kaynak: yer, hedef: queueRow, gorsel: gorselYolu(odul.item), boy: 34,
             bitince: () => { zipla(queueRow, 1.1); uyar(t('queuedMsg')); } });
    } else {
      const kutu = board.hucreKutusu(sonKonan);
      ucur({ kaynak: yer, hedef: kutu || queueRow, gorsel: gorselYolu(odul.item), boy: 34,
             bitince: () => {
               belir(board.parcaBul?.(sonKonan));
               odulUcur(t('gotItem', { name: nesneAdi(odul.item) }), true);
             } });
    }
  }
  if (!odul.food && !odul.stars) kaynakTazele(true);
}

/* Izgarada yer acildiginda siradakiler otomatik iniyor. */
function siradanDoldur() {
  let indi = false;
  while (oyuncu.sira.length && bosHucreVarMi(oyuncu.grid)) {
    nesneKoy(oyuncu.grid, oyuncu.sira.shift());
    indi = true;
  }
  if (indi) { board.ciz(); board.sec(seciliHucre); siraCiz(); kaydet(); }
}

function siraCiz() {
  queueRow.hidden = oyuncu.sira.length === 0;
  queueEl.innerHTML = '';
  oyuncu.sira.slice(0, SIRA_GOSTERILEN).forEach((n) => {
    const el = document.createElement('div');
    el.className = 'queue-item';
    el.innerHTML = `<img src="${gorselYolu(n)}" alt="">`;
    queueEl.appendChild(el);
  });
  const kalan = oyuncu.sira.length - SIRA_GOSTERILEN;
  queueMore.textContent = kalan > 0 ? t('queueMore', { n: kalan }) : '';
  queueMore.hidden = kalan <= 0;
}

/* ---------- IZGARA ---------- */

function birlesti(yeni) {
  oyuncu.sayaclar.merges += 1;
  if (yeni.t === 'egg') {
    oyuncu.sayaclar.maxEggLv = Math.max(oyuncu.sayaclar.maxEggLv, yeni.lv);
  }
  kaydet();
  haptic.tap('medium');
  cal('merge');
  siradanDoldur();
  gorevNoktasi();
  bilgiPaneliCiz();
  tut?.olay('merge');
}

/* Izgara degisince kaydet ve panelin gecerliligini kontrol et: secili
   parca birlesip yok olduysa panel onu anlatmaya devam etmemeli. */
function izgaraDegisti() {
  kaydet();
  if (seciliHucre >= 0 && !nesneMi(oyuncu.grid.cells[seciliHucre])
      && !kilitliMi(oyuncu.grid.cells[seciliHucre])) {
    seciliHucre = -1;
    board.sec(-1);
  }
  bilgiPaneliCiz();
}

function hucreSecildi(i, hucre) {
  seciliHucre = (hucre && (nesneMi(hucre) || kilitliMi(hucre))) ? i : -1;
  board.sec(seciliHucre);
  bilgiPaneliCiz();
}

/* Izgaranin altindaki sade panel: ne oldugu, ne verecegi, tek dugme. */
function bilgiPaneliCiz() {
  const hucre = seciliHucre >= 0 ? oyuncu.grid.cells[seciliHucre] : null;
  if (!hucre) { infoBody.hidden = true; infoEmpty.hidden = false; return; }
  infoEmpty.hidden = true;
  infoBody.hidden = false;

  infoNote.hidden = true;

  if (kilitliMi(hucre)) {
    infoName.textContent = t('lockedName');
    infoTag.textContent = ''; infoTag.className = 'info-tag';
    infoLine.textContent = t('lockedLine', { name: nesneAdi(hucre.odul) });
    infoAction.textContent = t('unlock', { n: bicim(hucre.fiyat) });
    infoAction.disabled = oyuncu.stars < hucre.fiyat;
    infoAction.onclick = () => kilidiAc(seciliHucre);
    return;
  }

  infoName.textContent = nesneAdi(hucre);

  if (hucre.t === 'egg') {
    const a = YUMURTA[hucre.lv];
    infoTag.textContent = ''; infoTag.className = 'info-tag';
    infoLine.textContent = t('eggYield', {
      a: bicim(a.az), b: bicim(a.cok), p: Math.round(a.sans * 100), n: bicim(a.jackpot),
    });
    infoAction.textContent = t('crack');
    infoAction.disabled = false;
    infoAction.onclick = () => yumurtaKir(seciliHucre);
    return;
  }

  /* Aralik gosteriliyor, tek bir sayi degil: acilista zar atiliyor. */
  const { az, cok } = sandikAraligi(hucre.t, hucre.lv);
  infoTag.textContent = ''; infoTag.className = 'info-tag';
  infoLine.textContent = t(hucre.t === 'star' ? 'chestGivesStar' : 'chestGivesFood',
                           { a: bicim(az), b: bicim(cok) });
  infoNote.textContent = hucre.lv < 4 ? t('mergeNote') : t('topPackNote');
  infoNote.hidden = false;
  infoAction.textContent = t('chestOpen');
  infoAction.disabled = false;
  infoAction.onclick = () => sandikAc(seciliHucre);
}

/* Yumurta kirilinca tukeniyor: sayac yok, hucre bosaliyor ve siradaki iniyor. */
function yumurtaKir(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!nesneMi(hucre) || hucre.t !== 'egg') return;
  const kutu = board.hucreKutusu(i);          /* hucre bosalmadan once olculuyor */
  const { miktar, jackpot } = toplamaSonucu(hucre.lv);
  oyuncu.food += miktar;
  oyuncu.grid.cells[i] = null;
  seciliHucre = -1;
  oyuncu.sayaclar.collects += 1;
  kaydet();
  board.ciz(); board.sec(-1);
  siradanDoldur();
  gorevNoktasi();
  bilgiPaneliCiz();
  haptic.success();
  cal(jackpot ? 'jackpot' : 'crack');
  cal(jackpot ? 'jackpot' : 'crack');
  kazanimUcur(kutu, 'food', jackpot ? 7 : 4);
  odulUcur(jackpot ? `${t('jackpotMsg')} ${t('gotFood', { n: bicim(miktar) })}`
                   : t('gotFood', { n: bicim(miktar) }), jackpot);
  tut?.olay('collect');
}

function sandikAc(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!nesneMi(hucre) || hucre.t === 'egg') return;
  const kutu = board.hucreKutusu(i);
  const deger = sandikDegeri(hucre.t, hucre.lv);
  if (hucre.t === 'star') oyuncu.stars += deger;
  else oyuncu.food += deger;
  oyuncu.grid.cells[i] = null;
  seciliHucre = -1;
  kaydet();
  board.ciz(); board.sec(-1);
  siradanDoldur();
  bilgiPaneliCiz();
  haptic.success();
  cal('chest');
  kazanimUcur(kutu, hucre.t === 'star' ? 'star' : 'food', hucre.lv >= 3 ? 7 : 5);
  const ust = ustBasamakMi(hucre.t, hucre.lv, deger);
  const mesaj = hucre.t === 'star' ? t('gotStars', { n: bicim(deger) })
                                   : t('gotFood', { n: bicim(deger) });
  odulUcur(ust ? `${t('bigHitMsg')} ${mesaj}` : mesaj, true);
}

function kilidiAc(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!kilitliMi(hucre)) return;
  if (oyuncu.stars < hucre.fiyat) { uyar(t('needStars')); return; }
  oyuncu.stars -= hucre.fiyat;
  const odul = hucre.odul;
  oyuncu.grid.cells[i] = { t: odul.t, lv: odul.lv };
  if (odul.t === 'egg') oyuncu.sayaclar.maxEggLv = Math.max(oyuncu.sayaclar.maxEggLv, odul.lv);
  kaydet();
  board.ciz(); board.sec(i);
  kaynakTazele(true);
  bilgiPaneliCiz();
  gorevNoktasi();
  haptic.success();
  cal('unlock');
}

/* ---------- EJDERHA ---------- */

/* 4 saatlik istah penceresi dolduysa fiyat sifirdan basliyor. */
function pencereyiTazele(d) {
  if (d.pencereBas && simdi() - d.pencereBas >= BESLEME_PENCERESI) {
    d.pencereBas = 0;
    d.pencereSayi = 0;
  }
}

function beslemeFiyati(d) {
  pencereyiTazele(d);
  return yemMaliyeti(d.level, d.pencereSayi);
}

feedBtn.addEventListener('click', async () => {
  const d = aktifEjderha(oyuncu);
  if (!d || busy) return;
  if (!yuvaAcikMi(oyuncu, d)) { uyar(t('slotLockedFeed')); return; }

  const fiyat = beslemeFiyati(d);
  if (oyuncu.food < fiyat) { uyar(t('noFood')); return; }

  busy = true;
  oyuncu.food -= fiyat;
  oyuncu.sayaclar.feeds += 1;
  if (!d.pencereBas) d.pencereBas = simdi();
  d.pencereSayi += 1;
  kaynakTazele(true);

  cal('feed');
  await yemAnimasyonu();

  d.lastFed = simdi();
  d.feeds += 1;
  seviyeKontrol(d);
  yumurtaBirak();
  kaydet();
  busy = false;
  gorevNoktasi();
  ejderhaCiz();
  tut?.olay('feed');
});

function seviyeKontrol(d) {
  const gereken = seviyeIcinBesleme(d.level);
  if (d.feeds >= gereken && d.level < CONFIG.MAX_LEVEL) {
    d.level += 1;
    d.feeds = 0;
    haptic.success();
    cal('levelup');
    odulUcur(t('levelUp', { level: d.level }), true);
  }
}

/* Yumurta ejderhanin oldugu yerden cikip gittigi yere ucuyor. Besleme
   ejderha ekraninda oluyor, yumurtanin indigi izgara ise gorunmuyor;
   o yuzden hedef, izgaranin temsilcisi olan Ocak sekmesi. Sekme varista
   zipliyor ki oyuncu nereye gittigini gorsun. */
function yumurtaBirak() {
  const lv = oyuncu.tutorial < 99 ? 1 : beslemeYumurtaSeviyesi();
  const yer = nesneVer({ t: 'egg', lv });
  const ocakSekmesi = tabbar.querySelector('.tab[data-go="grid"]');

  ucur({
    kaynak: artEl,
    hedef: ocakSekmesi || resFood,
    gorsel: gorselYolu({ t: 'egg', lv }),
    boy: 38,
    sure: 720,
    bitince: () => {
      zipla(ocakSekmesi, 1.16);
      cal('egglay');
      /* Izgara doluysa yumurta siraya giriyor; oyuncu Ocak'a gecince
         zaten goruyor, ayrica uyari cikarmaya gerek yok. */
      if (yer === 'izgara') yaziUcur(t('laidEgg'));
    },
  });
}

function yemAnimasyonu() {
  return new Promise((cozul) => {
    flyFood.hidden = false;
    flyFood.style.transition = 'none';
    flyFood.style.left = '6%'; flyFood.style.top = '62%';
    flyFood.style.opacity = '1'; flyFood.style.transform = 'scale(0.7)';
    requestAnimationFrame(() => {
      flyFood.style.transition = 'left .45s ease-in, top .45s ease-in, transform .45s ease-in, opacity .2s ease .35s';
      flyFood.style.left = '44%'; flyFood.style.top = '38%';
      flyFood.style.transform = 'scale(1.1)'; flyFood.style.opacity = '0';
    });
    setTimeout(() => {
      flyFood.hidden = true;
      artEl.classList.add('eating');
      haptic.tap('medium');
      setTimeout(() => { artEl.classList.remove('eating'); cozul(); }, 600);
    }, 480);
  });
}

function slotlariCiz() {
  slotStrip.innerHTML = '';
  oyuncu.dragons.forEach((d, sira) => {
    const kilitli = sira >= oyuncu.unlockedSlots;
    const btn = document.createElement('button');
    btn.className = `slot${kilitli ? ' locked' : ''}${d.id === oyuncu.activeId ? ' is-on' : ''}`;
    btn.innerHTML = `<div class="mini">${dragonSvg(gorselSeviye(d.level), d.look, 'happy')}</div>
      <span class="slot-lv">${t('lvShort', { level: d.level })}</span>`;
    if (kilitli) {
      btn.insertAdjacentHTML('beforeend',
        '<span class="slot-lock"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0110 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/></svg></span>');
      btn.addEventListener('click', () => yuvaAc(oyuncu.unlockedSlots));
    } else {
      btn.addEventListener('click', () => { oyuncu.activeId = d.id; kaydet(); cizHepsi(); });
    }
    slotStrip.appendChild(btn);
  });

  if (oyuncu.dragons.length < EN_COK_YUVA) {
    const fiyat = yuvaFiyati(oyuncu.unlockedSlots);
    const btn = document.createElement('button');
    btn.className = 'slot empty';
    btn.innerHTML = `<span class="slot-plus">+</span>
      <span class="slot-buy"><img src="../../assets/currency/star-64.webp" alt="">${bicim(fiyat)}</span>`;
    btn.addEventListener('click', () => yuvaAc(oyuncu.unlockedSlots));
    slotStrip.appendChild(btn);
  }
}

function yuvaAc(sira) {
  const fiyat = yuvaFiyati(sira);
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
  artEl.innerHTML = dragonSvg(gorselSeviye(d.level), d.look, 'happy');
  artEl.classList.toggle('dim', !acik);

  dragonNameEl.textContent = d.name || t('dragonName');
  dragonLvEl.textContent = t('lvShort', { level: d.level });

  const gereken = seviyeIcinBesleme(d.level);
  xpFill.style.width = `${Math.min(100, (d.feeds / gereken) * 100)}%`;

  const fiyat = beslemeFiyati(d);
  feedCostEl.textContent = bicim(fiyat);
  feedBtn.disabled = busy || !acik || oyuncu.food < fiyat;

  appetiteEl.textContent = d.pencereBas
    ? t('appetite', { time: sureMetni(d.pencereBas + BESLEME_PENCERESI - simdi()) })
    : t('appetiteFresh');
}

/* ---------- GUNLUK ODUL ---------- */

const gunFarki = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const gunlukAlinabilirMi = () => oyuncu.gunluk.sonGun !== bugun();

function gunlukSiradakiGun() {
  const g = oyuncu.gunluk;
  if (!g.sonGun) return 1;
  const fark = gunFarki(g.sonGun, bugun());
  if (fark === 0) return ((g.seri - 1) % 7) + 1;
  if (fark === 1) return (g.seri % 7) + 1;
  return 1;
}

/* Odul her zaman bir sayi ya da seviye ile birlikte gosteriliyor.
   Eskiden nesne odullerinde sadece kucuk bir resim vardi ve oyuncu ne
   kazanacagini anlayamiyordu. */
/* Madalyonun uzerindeki durum isareti. Sayi degil isaret: sayinin
   yerlesimi ve yazi karakteri madalyona oturmuyordu. */
const TIK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2 8.8-9.4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const UNLEM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v8.2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><circle cx="12" cy="18.4" r="1.9" fill="currentColor"/></svg>';

function odulRozeti(odul) {
  if (odul.food) return `<img src="../../assets/food/meat-64.webp" alt=""><b>${bicim(odul.food)}</b>`;
  if (odul.stars) return `<img src="../../assets/currency/star-64.webp" alt=""><b>${bicim(odul.stars)}</b>`;
  if (odul.item) return `<img src="${gorselYolu(odul.item)}" alt=""><b>${t('lvShort', { level: odul.item.lv })}</b>`;
  return '';
}

function gunlukCiz() {
  const siradaki = gunlukSiradakiGun();
  const alinabilir = gunlukAlinabilirMi();
  dailyNote.textContent = t('dailyNote', { n: siradaki });
  dailyRow.innerHTML = '';
  GUNLUK_ODULLER.forEach((odul, i) => {
    const gun = i + 1;
    const gecmis = gun < siradaki || (!alinabilir && gun === siradaki);
    const el = document.createElement('div');
    el.className = `daily${gecmis ? ' done' : ''}${gun === siradaki && alinabilir ? ' next' : ''}`;
    el.innerHTML = `<span class="daily-day">${gun}</span>
      <span class="daily-odul">${odulRozeti(odul)}</span>`;
    dailyRow.appendChild(el);
  });
  dailyClaim.disabled = !alinabilir;
  dailyClaim.textContent = alinabilir ? t('dailyClaim') : t('dailyDone');
}

dailyClaim.addEventListener('click', () => {
  if (!gunlukAlinabilirMi()) return;
  const gun = gunlukSiradakiGun();
  cal('claim');
  odulVer(GUNLUK_ODULLER[gun - 1], dailyClaim);
  oyuncu.gunluk.seri = gun;
  oyuncu.gunluk.sonGun = bugun();
  kaydet();
  haptic.success();
  gunlukCiz();
  gorevNoktasi();
});

/* ---------- GOREV HARITASI ---------- */

function gorevIlerleme(g) {
  const s = oyuncu.sayaclar;
  const d = aktifEjderha(oyuncu);
  switch (g.tip) {
    case 'merge': return s.merges;
    case 'feed': return s.feeds;
    case 'collect': return s.collects;
    case 'egglv': return s.maxEggLv;
    case 'draglv': return d ? d.level : 1;
    default: return 0;
  }
}

const gorevBaslik = (g) => t(`quest${g.tip.charAt(0).toUpperCase()}${g.tip.slice(1)}`, { n: g.hedef });

function gorevleriCiz() {
  questPath.innerHTML = '';
  const bitti = oyuncu.gorevler.bitti;

  /* Madalyonun rengi artik oyuncunun yapabilecegi seyi anlatiyor:
     yesil = alinmis, altin = odulu hazir bekliyor, demir = devam ediyor.
     Once "siradaki bitmemis gorev" altin oluyordu, ama gorevler sirali
     kilitli olmadigi icin o renk hicbir sey ifade etmiyordu. */
  GOREV_HARITASI.forEach((g) => {
    const tamamlandi = bitti.includes(g.id);
    const sayi = gorevIlerleme(g);
    const hazir = !tamamlandi && sayi >= g.hedef;

    const el = document.createElement('div');
    el.className = `quest${tamamlandi ? ' done' : ''}${hazir ? ' active' : ''}`;
    el.innerHTML = `
      <span class="quest-dot">${tamamlandi ? TIK_SVG : (hazir ? UNLEM_SVG : '')}</span>
      <div class="quest-body">
        <div class="quest-title">${gorevBaslik(g)}</div>
        <div class="quest-prog">
          <div class="bar"><i style="width:${Math.min(100, (sayi / g.hedef) * 100)}%"></i></div>
          <span class="quest-odul">${odulRozeti(g.odul)}</span>
        </div>
      </div>
      <button class="quest-claim"${hazir ? '' : ' disabled'}>${tamamlandi ? t('questDone') : t('questClaim')}</button>`;

    el.querySelector('button').addEventListener('click', () => {
      if (bitti.includes(g.id) || gorevIlerleme(g) < g.hedef) return;
      bitti.push(g.id);
      cal('claim');
      odulVer(g.odul, el.querySelector('button'));
      kaydet();
      haptic.success();
      gorevleriCiz();
      gorevNoktasi();
    });
    questPath.appendChild(el);
  });
}

function gorevNoktasi() {
  const bitti = oyuncu.gorevler.bitti;
  const hazirGorev = GOREV_HARITASI.some((g) => !bitti.includes(g.id) && gorevIlerleme(g) >= g.hedef);
  taskDot.hidden = !(hazirGorev || gunlukAlinabilirMi());
}

/* ---------- ORTAK ---------- */

/* Son gosterilen degerler: sayac oraya degil, oradan akiyor. */
let gosterilen = { food: null, stars: null };

function kaynakTazele(canlandir = false) {
  const oncekiYem = gosterilen.food;
  const oncekiYildiz = gosterilen.stars;
  gosterilen = { food: oyuncu.food, stars: oyuncu.stars };

  if (!canlandir || oncekiYem === null) {
    foodValue.textContent = bicim(oyuncu.food);
    starValue.textContent = bicim(oyuncu.stars);
    return;
  }
  sayacAkit(foodValue, oncekiYem, oyuncu.food, bicim);
  sayacAkit(starValue, oncekiYildiz, oyuncu.stars, bicim);
}

/* Kazanilan sey once sayacina ucuyor, sayac varista zipliyor. */
function kazanimUcur(kaynak, tip, adet = 4) {
  const yildiz = tip === 'star';
  ucur({
    kaynak,
    hedef: yildiz ? resStar : resFood,
    gorsel: yildiz ? '../../assets/currency/star-64.webp' : '../../assets/food/meat-64.webp',
    adet,
    bitince: () => { kaynakTazele(true); zipla(yildiz ? resStar : resFood, 1.22); cal('collect'); },
  });
}

function cizHepsi() {
  kaynakTazele();
  ejderhaCiz();
  siraCiz();
  bilgiPaneliCiz();
  gunlukCiz();
  gorevleriCiz();
  gorevNoktasi();
  tazele();
}

/* Saniyede bir donen tik eskiden ejderha gorselini ve tum yuva seridini
   innerHTML ile bastan kuruyordu; degisen tek sey geri sayim yazisiydi.
   Artik sadece o yazi guncelleniyor. Istah penceresi doldugu an besleme
   fiyati sifirlandigi icin orada bir kez tam cizim yapiliyor. */
function tazele() {
  if ($('screen-dragon').hidden) return;
  const d = aktifEjderha(oyuncu);
  if (!d) return;

  if (d.pencereBas && simdi() - d.pencereBas >= BESLEME_PENCERESI) { ejderhaCiz(); return; }

  appetiteEl.textContent = d.pencereBas
    ? t('appetite', { time: sureMetni(d.pencereBas + BESLEME_PENCERESI - simdi()) })
    : t('appetiteFresh');
}

/* Sure birimleri de dile bagli: arayuz Ingilizce'yken "3sa 56dk" gorunmesin. */
function sureMetni(ms) {
  const sn = Math.max(0, Math.ceil(ms / 1000));
  if (sn < 60) return `${sn}${t('unitS')}`;
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk}${t('unitM')}`;
  const sa = Math.floor(dk / 60);
  return dk % 60 ? `${sa}${t('unitH')} ${dk % 60}${t('unitM')}` : `${sa}${t('unitH')}`;
}

/* Kucuk yazi baloncugu (ucur() artik canlandir.js'teki nesne ucusu). */
function yaziUcur(metin) {
  const el = document.createElement('span');
  el.textContent = metin;
  floatersEl.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function odulUcur(metin, buyuk = false) {
  const el = document.createElement('div');
  el.className = `prize${buyuk ? ' big' : ''}`;
  el.textContent = metin;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function uyar(metin) {
  cal('deny');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = metin;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/* ---------- TUTORIAL ---------- */

function tutorialKur() {
  tut = createTutorial({
    kok: $('tut'), maske: $('tut-mask'), buyucu: $('tut-wizard'),
    metin: $('tut-text'), ileriBtn: $('tut-next'), t,
    bitince() { oyuncu.tutorial = 99; kaydet(); },
  });
}

function tutorialAdimlari() {
  const beslemeyiAc = () => {
    const d = aktifEjderha(oyuncu);
    if (d) { d.pencereBas = 0; d.pencereSayi = 0; }
    if (oyuncu.food < 4) oyuncu.food = 4;
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

basla().catch((hata) => {
  console.error(hata);
  bootText.textContent = String(hata?.message || hata);
});
