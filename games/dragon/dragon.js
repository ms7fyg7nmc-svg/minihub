import { initTelegram, haptic, showBackButton, backToHubOnResume, getUser } from '../../js/tg.js?v253';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js?v253';

import { CONFIG, gorselSeviye } from './config.js?v253';
import { bakimdaMi } from '../../js/store.js?v253';
import { oyuncuyuYukle, oyuncuyuKaydet, aktifEjderha, yuvaAcikMi, bugun,
         ejderhaEkle, bostaIsle, bekleyenYumurta, EN_COK_YUVA,
         izgarayiGenislet, genislemeHakki } from './model.js?v253';
import { dragonSvg, dragonAssetUrls } from './art.js?v253';
import { turCek, turYolu, turBul } from './turler.js?v253';
import { taniBaslat, iz } from '../../js/tani.js?v253';
import { ucur, zipla, sayacAkit, belir } from './canlandir.js?v253';
import { KADEMELER, kademeGorevleri, kademeAcikMi, gorevAcikMi, aktifGorev,
         kademeIlerleme, tumGorevler, KADEME_GOREV_SAYISI,
         PARTNER_OYUNLAR, PARTNER_ODULLERI, PARTNER_BUYUK_ODUL,
         partnerKademe } from './gorevler.js?v253';
import { getBest, gorevOlay, promoKutuAl } from '../../js/store.js?v253';
import { siparisleriTamamla, siparisDurumu, siparisiAl, siparisiDegistir } from './siparis.js?v253';
import { createBoard, nesneKoy, bosHucreVarMi, gorselYolu, onYukleListesi, kapDurumu, kapMi, sureKisa,
         kilitliMi, nesneMi } from './grid.js?v253';
import { YUMURTA, EN_UST_YUMURTA, BESLEME_PENCERESI, SIRA_GOSTERILEN,
         GUNLUK_ODULLER, yemMaliyeti, seviyeIcinBesleme,
         toplamaSonucu, sandikDegeri, sandikAraligi, ustBasamakMi, atlamaFiyati, kapSuresi,
         beslemeYumurtaSeviyesi, yumurtaAraligi, yuvaFiyati,
         bostaHesapla, BOSTA_TAVAN, ejderhaSansi } from './ekonomi.js?v253';
import { createTutorial, pozListesi } from './tutorial.js?v253';

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
  tabTrader: 'Tüccar',
  traderName: 'Tüccar Büyücü',
  traderIntro: 'Bana getir, karşılığını vereyim.',
  traderNote: 'Teslim ettiğin her sipariş, yumurtayı kırmaktan daha çok kazandırır.',
  traderDeliver: 'Teslim et',
  traderNeed: 'Eksik',
  traderDone: 'Teslim edildi!',
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
  slotWaiting: 'Boş',
  slotHeld: 'Bekler',
  slotInOrder: 'Yuvalar sırayla açılıyor. Önce soldakini aç.',
  slotNeedsDragon: 'Bu yuva boş. Sv. 8 yumurta kırınca buraya ejderha gelir.',
  slotOpened: '{name} yuvası açıldı!',
  slotBuyNote: 'Yuvayı açınca ejderhası buraya gelir, seviye atlar ve sen yokken de yumurta biriktirir.',
  slotHeldNote: 'Bu ejderha seni bekliyor. Yuvayı açar açmaz beslemeye başlayabilirsin.',
  slotUnlock: 'Yuvayı aç',
  slotNewTitle: 'Yeni yuva',
  slotNewLine: '{n}. ejderha yuvası',
  eggDragonChance: 'Ayrıca %{p} ihtimalle bir ejderha çıkabilir.',
  cancel: 'Vazgeç',
  close: 'Kapat',

  eggDropsOne: 'Sv. {a} yumurta bırakır',
  eggDropsRange: 'Sv. {a}–{b} yumurta bırakır',
  idleCollect: 'Topla',
  idleFull: 'Yuva doldu — üretim durdu',
  idleNext: 'Sonraki yumurta {time}',
  idleGot: '{n} yumurta toplandı',

  turEmber: 'Ateş',
  turOcean: 'Okyanus',
  turVerdant: 'Yaprak',
  turSolar: 'Güneş',
  turAqua: 'Turkuaz',
  turAmber: 'Kehribar',
  turViolet: 'Menekşe',
  turPearl: 'İnci',
  turMagma: 'Magma',
  turRose: 'Gülfer',
  turAzure: 'Gökyüzü',
  turVerdigris: 'Zeytin',
  turCosmic: 'Kozmik',
  turRadiant: 'Işıltı',
  turGlacial: 'Buzul',
  turAmethyst: 'Ametist',
  nadirCommon: 'Yaygın',
  nadirRare: 'Nadir',
  nadirEpic: 'Destansı',
  nadirLegendary: 'Efsanevi',

  eggHatches: '{name} ejderhası çıkar',
  hatchReady: 'Yuvası açık — hemen besleyebilirsin.',
  hatchLockedNote: 'Yuvası kilitli. Ejderha gelir ama beslemek için yuvayı açman gerekir.',
  hatched: '{name} yumurtadan çıktı!',
  hatchedLocked: '{name} çıktı — yuvası kilitli.',

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
  bigHitMsg: 'BÜYÜK VURUŞ!',
  tier_acemi: 'Acemi',
  tier_orta: 'Orta',
  tier_pro: 'Pro',
  tierLocked: 'Kilitli',
  questLocked: 'Önce üsttekini bitir',
  expand: 'Aç',
  startOpen: 'Açmaya başla',
  startNote: 'Başlayınca {time} sürer',
  openingIn: '{time} sonra açılır',
  skipFor: 'Hemen aç',
  allDone: 'Bütün görevler bitti',
  partnerTitle: 'Partner görevleri',
  partnerReady: '{n} ödül seni bekliyor',
  partnerHint: 'Diğer hub oyunlarında skor yap',
  targetScore: '{n} puana ulaş',
  targetLevel: '{n}. seviyeye ulaş',
  yourBest: 'Rekorun: {n}',
  grandTitle: 'Büyük ödül',
  grandNote: 'Sekiz oyunda da 4. kademeyi bitir',
  grandReady: 'Büyük ödül hazır',
  questChest: '{n} kap aç',
  questPacklv: 'Sv. {n} kaba ulaş',
  questUnlock: '{n} kilitli hücre aç',
  refundMsg: 'Eskiden ejderhana harcadığın $MH karşılığı {n} yem hesabına eklendi.',

  unitS: 'sn',
  unitM: 'dk',
  unitH: 'sa',

  tutNext: 'Devam',
  tutSkip: 'Atla',
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
const turSatiri = $('tur-satiri');
const ejderhaNoktasi = $('dragon-dot');
const bostaKutu = $('bosta'); const bostaSay = $('bosta-say');
const bostaNot = $('bosta-not'); const bostaBtn = $('bosta-btn');

const dailyRow = $('daily-row'); const dailyNote = $('daily-note'); const dailyClaim = $('daily-claim');
const questOzet = $('quest-ozet'); const questSayac = $('quest-sayac');
const questKademeler = $('quest-kademeler'); const questAktif = $('quest-aktif');
const partnerOzet = $('partner-ozet'); const partnerSayac = $('partner-sayac');
const partnerBar = $('partner-bar'); const partnerAktif = $('partner-aktif');
const sayfa = $('sayfa'); const sayfaBaslik = $('sayfa-baslik');
const sayfaGovde = $('sayfa-govde'); const sayfaKapat = $('sayfa-kapat');
const taskDot = $('task-dot'); const tabbar = $('tabbar');

/* ---------- DURUM ---------- */

let oyuncu = null;
let board = null;
let tut = null;
/* MESGUL KILIDI - SURESI DOLAR.

   Duz bir boolean'di ve `await yemAnimasyonu()` ile birlikte oyunu
   donduruyordu: o soz ic ice setTimeout'larla cozuluyor, telefon
   uygulamayi arka plana alinca zamanlayicilar duruyor, soz hic
   cozulmuyor, finally hic calismiyor ve busy SONSUZA KADAR acik
   kaliyor. Besleme dugmesi oturum boyunca olu - oyuncunun gordugu sey
   donmus bir oyun.

   try/finally bunu kurtarmiyor; o yalnizca ATILAN hataya karsi. Hic
   cozulmeyen bir soz icin hicbir sey calismaz.

   Artik kilit bir ZAMAN DAMGASI. Zamanlayiciya bagli degil: bir sonraki
   dokunusta suresi dolmussa kendiliginden aciliyor. */
const MESGUL_SURE = 3000;
let busyBas = 0;
const mesgulMu = () => busyBas > 0 && Date.now() - busyBas < MESGUL_SURE;
const mesgulAc = () => { busyBas = Date.now(); };
const mesgulKapat = () => { busyBas = 0; };
let seciliHucre = -1;

const bicim = (n) => Number(n).toLocaleString(locale());
const simdi = () => Date.now();

/* Kap adi kademesine gore degisiyor: kese, sepet, sandik, usta sandigi. */
function nesneAdi(h) {
  if (!h) return '';
  /* Kilitli hucrenin odulu artik bir NESNE olmayabilir: uc kilit
     dogrudan yildiz veriyor (bkz. ekonomi.js YILDIZ_ODULU). */
  if (h.stars) return t('gotStars', { n: bicim(h.stars) });
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

  /* Oyun kapaliyken gecen sure burada yumurtaya cevriliyor. Tahtadan
     once calismali ki ilk cizimde sayac dogru gorunsun. */
  bostaIsle(oyuncu, simdi());

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

  /* Oyun HER ZAMAN ejderha ekraninda aciliyor. HTML'de Ocak ekrani
     isaretsiz (gorunur) duruyordu, yani acilista once izgara geliyordu.
     Oyunun kalbi ejderha: oyuncu girince once onu gormeli, izgaraya
     sekmeden gecmeli. Tutorial kendi adiminda ekrani zaten
     degistiriyor, ona dokunmuyoruz. */
  ekranGoster('dragon');

  shellEl.hidden = false;
  bootEl.classList.add('is-gone');
  setTimeout(() => { bootEl.hidden = true; }, 400);

  if (oyuncu.iadeEdilenYem) {
    const n = oyuncu.iadeEdilenYem;
    delete oyuncu.iadeEdilenYem;
    kaydet();
    setTimeout(() => odulUcur(t('refundMsg', { n: bicim(n) }), true), 600);
  }

  /* Hub'da girilen promosyon kodunun ejderha tarafi burada iniyor.
     Perde kalktiktan SONRA cagriliyor: aga cikiyor ve acilisi
     bekletmesinin anlami yok. */
  promoKutusunuBosalt();

  showBackButton(hubaDon);
  backToHubOnResume();
  window.addEventListener('resize', () => tut?.yenidenKonumla());
  /* SES KALDIRILDI.
     Ejderha Adasi'nin kendi ses motoru vardi (ses.js) ve her birlestirme
     `cal('merge')` ile bir ornek caliyordu. Oyuncu sesleri istemedi;
     ayrica birlestirme ani zaten en yogun kare ve oraya is eklemenin
     bir karsiligi yoktu. Ses dugmesi de kalkti - kapatilacak bir sey
     kalmadi. */
  setInterval(tazele, 1000);

  taniBaslat('dragon');

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
  if (ad === 'tasks') { gunlukCiz(); questOzetCiz(); partnerOzetCiz(); }
  if (ad === 'trader') siparisCiz();
  tut?.yenidenKonumla();
}

tabbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  haptic.tap('light');
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
  /* Tek nesne (item) ve coklu nesne (items) ayni yoldan gidiyor.

     Nesneler ONCE senkron olarak yerlestiriliyor, animasyonlar sonra
     araliklarla oynatiliyor. Once yerlestirmeyi de setTimeout icine
     koymustum; cagiran kod kaydet()'i o zamanlayicilar calismadan
     onceden cagirdigi icin nesneler hafizaya giriyor ama diske hic
     yazilmiyordu - sayfa yenilenince kayboluyorlardi. */
  const nesneler = [...(odul.items || []), ...(odul.item ? [odul.item] : [])];
  const yerlesim = nesneler.map((nesne) => {
    sonKonan = -1;
    const nereye = nesneVer({ ...nesne });
    return { nesne, nereye, hucre: sonKonan };
  });
  if (nesneler.length) kaydet();

  let siraUyarisiVerildi = false;
  yerlesim.forEach(({ nesne, nereye, hucre }, sira) => {
    setTimeout(() => {
      if (nereye === 'sira') {
        ucur({ kaynak: yer, hedef: queueRow, gorsel: gorselYolu(nesne), boy: 34,
               bitince: () => {
                 zipla(queueRow, 1.1);
                 if (!siraUyarisiVerildi) { siraUyarisiVerildi = true; uyar(t('queuedMsg')); }
               } });
      } else {
        const kutu = board.hucreKutusu(hucre);
        ucur({ kaynak: yer, hedef: kutu || queueRow, gorsel: gorselYolu(nesne), boy: 34,
               bitince: () => {
                 belir(board.parcaBul?.(hucre));
                 if (sira === 0) odulUcur(t('gotItem', { name: nesneAdi(nesne) }), true);
               } });
      }
    }, sira * 220);
  });
  if (!odul.food && !odul.stars) kaynakTazele(true);
  gorevNoktasi();
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
  /* `hidden` DEGIL, sinif: eleman akista kalmali yoksa izgara kayiyor
     (bkz. dragon.css .queue-row). */
  queueRow.classList.toggle('bos', oyuncu.sira.length === 0);
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
  /* Birlestirmenin HER adimi yaziliyor. Donma telefonda oluyor ve
     masaustunde uretilemiyor; hangi adimdan sonra kesildigi tek
     basina hatayi daraltiyor. */
  iz('merge', `lv${yeni.lv}`);
  oyuncu.sayaclar.merges += 1;
  if (yeni.t === 'egg') {
    oyuncu.sayaclar.maxEggLv = Math.max(oyuncu.sayaclar.maxEggLv, yeni.lv);
  } else {
    oyuncu.sayaclar.maxPackLv = Math.max(oyuncu.sayaclar.maxPackLv, yeni.lv);
  }
  kaydet();              iz('merge.kaydet');
  haptic.tap('medium');  iz('merge.haptic');
  siradanDoldur();       iz('merge.sira');
  gorevNoktasi();
  bilgiPaneliCiz();
  tut?.olay('merge');
  /* Gunluk gorev sayaci. Birlestirme sunucuda GORUNMUYOR - ejderha
     durumu tek parca JSON olarak kaydediliyor, tek tek hamleler degil -
     bu yuzden bildiriliyor. Cevap beklenmiyor (bkz. store.gorevOlay). */
  gorevOlay('merge');
  iz('merge.bitti');
}

/* PROMOSYON KUTUSU

   Hub'daki kod ekranindan girilen kodun $MH ve enerji kismini sunucu
   kendisi veriyor; yem/yildiz/nesne kismi burayi bekliyor, cunku ejderha
   durumu sunucuda yorumlanmayan tek parca bir JSON.

   Kutuyu OKUMAK ayni anda BOSALTIYOR (bkz. worker.js handlePromoKutu) -
   bu yuzden alinan sey hemen uygulanip kaydediliyor. Iki ayri cagri
   olsaydi (oku, sonra sil) arada kopan bir baglanti odulu iki kez
   verdirirdi; bu yonde hata yapmak, bir kez kaybetmekten kotu. */
async function promoKutusunuBosalt() {
  let parcalar = [];
  try { parcalar = await promoKutuAl(); } catch { return; }
  if (!parcalar.length) return;

  const odul = { food: 0, stars: 0, items: [] };
  for (const p of parcalar) {
    if (p?.yem > 0) odul.food += p.yem;
    if (p?.yildiz > 0) odul.stars += p.yildiz;
    for (const n of (p?.nesneler || [])) {
      const adet = Math.max(1, Math.min(20, Number(n.adet) || 1));
      for (let i = 0; i < adet; i++) odul.items.push({ t: n.t, lv: n.lv });
    }
  }

  odulVer(odul, resFood);
  kaydet();                 /* odulVer nesneler icin kaydediyor, yem/yildiz icin degil */
  kaynakTazele(true);
  odulUcur(t('promoGeldi'), true);
}

/* ---------- TUCCAR ----------

   Siparisler oyuncunun kaydinda (oyuncu.siparisler) duruyor ve her
   cizimden once ACIK_SIPARIS sayisina tamamlaniyor - bozuk ya da eksik
   bir kayit da boylece kendiliginden duzeliyor, tuccar hicbir zaman bos
   gorunmuyor. Uretim kurallari siparis.js'te. */

function siparisCiz() {
  const kap = $('siparis-liste');
  if (!kap) return;

  const { liste, degisti } = siparisleriTamamla(oyuncu);
  if (degisti) kaydet();
  kap.innerHTML = '';

  for (const sip of liste) {
    const durum = siparisDurumu(oyuncu, sip);
    const istek = sip.istek[0];
    const satir = durum.satirlar[0];

    const el = document.createElement('article');
    el.className = 'siparis';
    el.innerHTML = `
      <div class="siparis-ust">
        <div class="siparis-nesne">
          <img src="${gorselYolu(istek)}" alt="">
          <div>
            <div class="siparis-ad"></div>
            <div class="siparis-say"></div>
          </div>
        </div>
        <span class="quest-odul">${odulRozeti(sip.odul)}</span>
      </div>
      <div class="siparis-alt">
        <button class="act-btn primary"></button>
      </div>`;

    el.querySelector('.siparis-ad').textContent = `${istek.adet}× ${nesneAdi(istek)}`;
    const sayEl = el.querySelector('.siparis-say');
    sayEl.textContent = `${satir.var}/${istek.adet}`;
    sayEl.classList.toggle('is-tam', satir.tamam);

    const btn = el.querySelector('.act-btn');
    btn.textContent = durum.hazir ? t('traderDeliver') : t('traderNeed');
    btn.disabled = !durum.hazir;
    btn.addEventListener('click', () => teslimEt(sip.id, btn));

    kap.appendChild(el);
  }
}

function teslimEt(id, btn) {
  const sip = (oyuncu.siparisler || []).find((x) => x.id === id);
  if (!sip) return;
  /* siparisiAl() yetersiz stokta HICBIR SEYE dokunmadan false donuyor -
      yani yarim bir teslimat (nesneler gitti, odul gelmedi) mumkun degil. */
  if (!siparisiAl(oyuncu, sip)) { siparisCiz(); return; }

  haptic.success();
  const odul = sip.odul;
  siparisiDegistir(oyuncu, id);
  kaydet();

  board.ciz(); board.sec(-1);
  siradanDoldur();
  odulVer(odul, btn);
  odulUcur(t('traderDone'), true);
  kaynakTazele(true);
  siparisCiz();
  gorevNoktasi();
}

/* Tab'daki nokta: teslim edilebilir bir siparis varsa yaniyor. Oyuncu
   ocakta merge ederken tuccara bakmiyor; haber ayagina gitmeli. */
function siparisNoktasi() {
  const nokta = $('trader-dot');
  if (!nokta) return;
  const { liste, degisti } = siparisleriTamamla(oyuncu);
  if (degisti) kaydet();
  nokta.hidden = !liste.some((sip) => siparisDurumu(oyuncu, sip).hazir);
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
    infoTag.textContent = ''; infoTag.className = 'info-tag';

    /* Yuksek seviye yumurtada ejderha SANSI var. Panel bunu yuzdeyle
       soyluyor: garanti vaat edip vermemek oyuncuyu kandirilmis
       hissettirir. Yem odulu her halukarda yaziyor. */
    const sans = ejderhaSansi(hucre.lv);
    const yerVar = oyuncu.dragons.length < EN_COK_YUVA;
    if (sans > 0 && yerVar) {
      const a = YUMURTA[hucre.lv];
      infoLine.textContent = t('eggYield', {
        a: bicim(a.az), b: bicim(a.cok), p: Math.round(a.sans * 100), n: bicim(a.jackpot),
      });
      infoNote.textContent = t('eggDragonChance', { p: Math.round(sans * 100) });
      infoNote.hidden = false;
      infoAction.textContent = t('crack');
    } else {
      const a = YUMURTA[hucre.lv];
      infoLine.textContent = t('eggYield', {
        a: bicim(a.az), b: bicim(a.cok), p: Math.round(a.sans * 100), n: bicim(a.jackpot),
      });
      infoAction.textContent = t('crack');
    }
    infoAction.disabled = false;
    infoAction.onclick = () => yumurtaKir(seciliHucre);
    return;
  }

  /* Aralik gosteriliyor, tek bir sayi degil: acilista zar atiliyor. */
  const { az, cok } = sandikAraligi(hucre.t, hucre.lv);
  infoTag.textContent = ''; infoTag.className = 'info-tag';
  infoLine.textContent = t(hucre.t === 'star' ? 'chestGivesStar' : 'chestGivesFood',
                           { a: bicim(az), b: bicim(cok) });

  /* Kap uc halden birinde: sayac baslatilmamis, iliyor, ya da hazir. */
  const durum = kapDurumu(hucre);

  if (durum.hal === 'bekliyor') {
    infoNote.textContent = t('startNote', { time: sureKisa(durum.kalan) });
    infoNote.hidden = false;
    infoAction.textContent = t('startOpen');
    infoAction.disabled = false;
    infoAction.onclick = () => kapBaslat(seciliHucre);
    return;
  }

  if (durum.hal === 'iliyor') {
    const fiyat = atlamaFiyati(durum.kalan);
    infoNote.textContent = t('openingIn', { time: sureKisa(durum.kalan) });
    infoNote.hidden = false;
    infoAction.innerHTML = `${t('skipFor')} <b>${fiyat}</b><img class="btn-yildiz" src="../../assets/currency/star-64.webp" alt="">`;
    infoAction.disabled = oyuncu.stars < fiyat;
    infoAction.onclick = () => kapAtla(seciliHucre);
    return;
  }

  infoNote.textContent = hucre.lv < 4 ? t('mergeNote') : t('topPackNote');
  infoNote.hidden = false;
  infoAction.textContent = t('chestOpen');
  infoAction.disabled = false;
  infoAction.onclick = () => sandikAc(seciliHucre);
}

/* Merdivenin tepesindeki yumurta artik yem degil EJDERHA veriyor.
   Sv.8'e kadar birlestirmek uzun bir istir; sonunda sadece buyuk bir
   yem yigini cikmasi o emegi anlamsiz kiliyordu. Alti yuva da doluysa
   yapacak bir sey yok, eski yem odulune donuyor. */
function ejderhaCikar(i, tur) {
  const kutu = board.hucreKutusu(i);
  const yeni = ejderhaEkle(oyuncu, tur);
  if (!yeni) return false;

  const sira = oyuncu.dragons.length - 1;
  const acik = sira < oyuncu.unlockedSlots;
  oyuncu.grid.cells[i] = null;
  seciliHucre = -1;
  oyuncu.sayaclar.collects += 1;
  if (acik) oyuncu.activeId = yeni.id;
  kaydet();

  board.ciz(); board.sec(-1);
  siradanDoldur();
  gorevNoktasi();
  bilgiPaneliCiz();
  haptic.success();

  ucur({ kaynak: kutu, hedef: slotStrip.children[sira] || artEl,
         gorsel: turYolu(yeni.look.tur, 160), adet: 1, boy: 44,
         bitince: () => { cizHepsi(); zipla(artEl, 1.1); } });
  odulUcur(t(acik ? 'hatched' : 'hatchedLocked',
              { name: t(turBul(yeni.look.tur).adKey) }), true);
  return true;
}

/* Yumurta kirilinca tukeniyor: sayac yok, hucre bosaliyor ve siradaki iniyor. */
function yumurtaKir(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!nesneMi(hucre) || hucre.t !== 'egg') return;
  /* Yuksek seviye yumurta bir ZAR atiyor. Cikarsa ejderha, cikmazsa
     asagidaki normal yem odulu - yani emek hicbir durumda bosa gitmiyor. */
  const sans = ejderhaSansi(hucre.lv);
  /* Gorev sayaci ZARDAN ONCE: yumurta aciliyor, icinden ejderha da ciksa
     yem de ciksa oyuncu acmis sayilir. */
  gorevOlay('yumurta');
  if (sans > 0 && oyuncu.dragons.length < EN_COK_YUVA
      && Math.random() < sans && ejderhaCikar(i, turCek())) return;
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
  kazanimUcur(kutu, 'food', jackpot ? 7 : 4);
  odulUcur(jackpot ? `${t('jackpotMsg')} ${t('gotFood', { n: bicim(miktar) })}`
                   : t('gotFood', { n: bicim(miktar) }), jackpot);
  tut?.olay('collect');
}

/* Sayaci baslatiyor. Duvar saati oldugu icin oyun kapaliyken de iliyor. */
function kapBaslat(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!kapMi(hucre) || hucre.acilis) return;
  hucre.acilis = simdi();
  kaydet();
  board.ciz(); board.sec(i);
  bilgiPaneliCiz();
  haptic.tap('light');
}

/* Kalan sureyi yildizla atliyor. Fiyat kalan sureye gore hesaplandigi
   icin panelde gorunen rakam neyse o odenir. */
function kapAtla(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!kapMi(hucre) || !hucre.acilis) return;
  const durum = kapDurumu(hucre);
  if (durum.hal !== 'iliyor') return;

  const fiyat = atlamaFiyati(durum.kalan);
  if (oyuncu.stars < fiyat) { uyar(t('needStars')); return; }

  oyuncu.stars -= fiyat;
  hucre.acilis = simdi() - kapSuresi(hucre.lv);   /* aninda hazir */
  kaydet();
  board.ciz(); board.sec(i);
  kaynakTazele(true);
  bilgiPaneliCiz();
  haptic.success();
}

function sandikAc(i) {
  const hucre = oyuncu.grid.cells[i];
  if (!nesneMi(hucre) || hucre.t === 'egg') return;
  if (kapDurumu(hucre)?.hal !== 'hazir') return;     /* sayac dolmadan acilmaz */
  const kutu = board.hucreKutusu(i);
  const deger = sandikDegeri(hucre.t, hucre.lv);
  if (hucre.t === 'star') oyuncu.stars += deger;
  else oyuncu.food += deger;
  oyuncu.grid.cells[i] = null;
  seciliHucre = -1;
  oyuncu.sayaclar.chests += 1;
  oyuncu.sayaclar.maxPackLv = Math.max(oyuncu.sayaclar.maxPackLv, hucre.lv);
  kaydet();
  board.ciz(); board.sec(-1);
  siradanDoldur();
  bilgiPaneliCiz();
  haptic.success();
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
  oyuncu.sayaclar.unlocks += 1;
  const odul = hucre.odul;
  if (odul.stars) {
    /* Dogrudan yildiz: hucre bos kaliyor, izgaraya bir kap konmuyor. */
    oyuncu.stars += odul.stars;
    oyuncu.grid.cells[i] = null;
    kazanimUcur(board.hucreKutusu(i), 'star', 5);
    odulUcur(t('gotStars', { n: bicim(odul.stars) }), true);
  } else {
    oyuncu.grid.cells[i] = { t: odul.t, lv: odul.lv };
    if (odul.t === 'egg') oyuncu.sayaclar.maxEggLv = Math.max(oyuncu.sayaclar.maxEggLv, odul.lv);
  }
  kaydet();
  board.ciz(); board.sec(i);
  kaynakTazele(true);
  bilgiPaneliCiz();
  gorevNoktasi();
  haptic.success();
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

bostaBtn.addEventListener('click', () => { if (!mesgulMu()) bostaTopla(); });

feedBtn.addEventListener('click', async () => {
  const d = aktifEjderha(oyuncu);
  if (!d || mesgulMu()) return;
  if (!yuvaAcikMi(oyuncu, d)) { uyar(t('slotLockedFeed')); return; }

  const fiyat = beslemeFiyati(d);
  if (oyuncu.food < fiyat) { uyar(t('noFood')); return; }

  mesgulAc();
  iz('besle');
  try {
    oyuncu.food -= fiyat;
    oyuncu.sayaclar.feeds += 1;
    if (!d.pencereBas) d.pencereBas = simdi();
    d.pencereSayi += 1;
    kaynakTazele(true);
    await yemAnimasyonu();

    d.lastFed = simdi();
    d.feeds += 1;
    seviyeKontrol(d);
    yumurtaBirak();
    kaydet();
  } finally {
    mesgulKapat();
  }
  gorevNoktasi();
  ejderhaCiz();
  tut?.olay('feed');
  gorevOlay('besle');
  iz('besle.bitti');
});

function seviyeKontrol(d) {
  const gereken = seviyeIcinBesleme(d.level);
  if (d.feeds >= gereken && d.level < CONFIG.MAX_LEVEL) {
    d.level += 1;
    d.feeds = 0;
    haptic.success();
    odulUcur(t('levelUp', { level: d.level }), true);
  }
}

/* Yumurta ejderhanin oldugu yerden cikip gittigi yere ucuyor. Besleme
   ejderha ekraninda oluyor, yumurtanin indigi izgara ise gorunmuyor;
   o yuzden hedef, izgaranin temsilcisi olan Ocak sekmesi. Sekme varista
   zipliyor ki oyuncu nereye gittigini gorsun. */
function yumurtaBirak() {
  const nadir = turBul(aktifEjderha(oyuncu)?.look?.tur).nadir;
  const lv = oyuncu.tutorial < 99 ? 1 : beslemeYumurtaSeviyesi(nadir);
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
      /* Izgara doluysa yumurta siraya giriyor; oyuncu Ocak'a gecince
         zaten goruyor, ayrica uyari cikarmaya gerek yok. */
      if (yer === 'izgara') yaziUcur(t('laidEgg'));
    },
  });
}

/* Soz HER DURUMDA cozuluyor.

   Eskiden yalnizca ic ice iki setTimeout cozuyordu. Telefon uygulamayi
   arka plana alinca zamanlayicilar duruyor; sayfa geri gelmezse soz
   asili kaliyor ve onu bekleyen her sey (besleme kilidi) kilitli
   kaliyor. Artik iki cikis daha var: sayfa gizlenirse hemen cozuluyor,
   ve her ihtimale karsi bir son zamanlayici duruyor. Hangisi once
   gelirse; `bitti` ikinci kez cozulmeyi engelliyor. */
function yemAnimasyonu() {
  return new Promise((cozulHam) => {
    let bitti = false;
    const temizle = [];
    const cozul = () => {
      if (bitti) return;
      bitti = true;
      temizle.forEach((f) => f());
      flyFood.hidden = true;
      artEl.classList.remove('eating');
      cozulHam();
    };

    const gizlenince = () => { if (document.hidden) cozul(); };
    document.addEventListener('visibilitychange', gizlenince);
    const emniyet = setTimeout(cozul, 2000);
    temizle.push(() => document.removeEventListener('visibilitychange', gizlenince));
    temizle.push(() => clearTimeout(emniyet));

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

/* Bos yuva: belirli bir ejderha vaat etmeyen notr bir yuva isareti. */
const YUVA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18c0-5 3.6-9 8-9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2.5 18h19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="12" cy="13.5" rx="3.2" ry="4" fill="currentColor" opacity=".45"/></svg>';

const KILIT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0110 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/></svg>';

/* YUVA SERIDI

   Serit artik MEVCUDIYET ESASLI: sahip oldugun ejderhalar, arkasina da
   bir tane "sonraki yuva" karti. Sabit alti kart ve her karta bagli bir
   tur yoktu artik - o duzen ejderhayi odul degil SATIN ALMA yapiyordu
   (4. yuvayi acan kesin altin ejderhayi aliyordu).

   Yuva sayisinda sinir yok, ama her yeni yuva oncekinden pahali
   (ekonomi.js yuvaFiyati: 50, 150, 400, 900, 2.000, 4.400, 9.700 ...).
   Yani yildiz gideri duruyor, sadece tura olan bagi koptu.

   Kartin hali iki bagimsiz eksenden cikiyor:
     yuva   acik / kilitli   - yildizla acilir
     icerik dolu / bos       - ejderha sansla kazanilir

   Ikisi ayri yurudugu icin ejderhasiz yuva da alinabiliyor ve kilitli
   yuvaya ejderha inebiliyor. Ikincisi onemli: ejderha orada duruyor,
   gorunuyor, ama beslenemiyor. */

const NADIR_ETIKET = {
  common: 'nadirCommon', rare: 'nadirRare',
  epic: 'nadirEpic', legendary: 'nadirLegendary',
};

function slotlariCiz() {
  slotStrip.innerHTML = '';

  /* Kac kart: ejderhalarin ya da acik yuvalarin hangisi coksa o kadar,
     bir de satin alinabilecek sonraki yuva icin bir tane daha. */
  const dolu = Math.max(oyuncu.dragons.length, oyuncu.unlockedSlots);
  const kart = Math.min(EN_COK_YUVA, dolu + 1);

  for (let i = 0; i < kart; i += 1) {
    const d = oyuncu.dragons[i] || null;
    const tur = d ? turBul(d.look?.tur) : null;
    const acik = i < oyuncu.unlockedSlots;
    const aktif = acik && d && d.id === oyuncu.activeId;
    const sirada = !acik && i === oyuncu.unlockedSlots;

    const btn = document.createElement('button');
    btn.className = ['slot',
      tur ? `nadir-${tur.nadir}` : '',
      acik ? 'acik' : 'locked',
      d ? 'dolu' : 'bos',
      aktif ? 'is-on' : '',
      sirada ? 'sirada' : '',
      (!acik && d) ? 'bekleyen' : '',
    ].filter(Boolean).join(' ');

    /* Bos yuvada gosterilecek belirli bir ejderha YOK - tur ancak
       kazanilinca cekiliyor. Yerine bos bir yuva isareti duruyor. */
    const portre = d
      ? `<div class="mini">${dragonSvg(gorselSeviye(d.level), d.look, 'happy', 160)}</div>`
      : `<div class="mini bos-yuva">${YUVA_SVG}</div>`;

    let alt;
    if (!acik) {
      alt = `<span class="slot-buy"><img src="../../assets/currency/star-64.webp" alt="">${bicim(yuvaFiyati(i))}</span>`;
    } else if (d) {
      alt = `<span class="slot-lv">${t('lvShort', { level: d.level })}</span>`;
    } else {
      alt = `<span class="slot-lv slot-bekle">${t('slotWaiting')}</span>`;
    }

    const kilit = acik ? '' : `<span class="slot-lock">${KILIT_SVG}</span>`;
    const rozet = (!acik && d) ? `<span class="slot-flag">${t('slotHeld')}</span>` : '';

    btn.innerHTML = `${portre}${kilit}${rozet}${alt}`;
    if (tur) btn.setAttribute('aria-label', `${t(tur.adKey)} · ${t(NADIR_ETIKET[tur.nadir])}`);

    btn.addEventListener('click', () => yuvaTikla(i, d, acik, sirada));
    slotStrip.appendChild(btn);
  }
}

function yuvaTikla(i, d, acik, sirada) {
  if (!acik) {
    /* Kutu HER kilitli yuvada aciliyor, sadece sirada olanda degil.
       Onceden uzaktakiler "yuvalar sirayla acilir" uyarisi veriyordu ve
       oyuncu 2.000 yildizlik ejderhanin ne verdigini hic goremiyordu -
       oysa butun mesele onu gorup ona dogru oynamasiydi. Sirada
       olmayanda dugme kapali, yerinde sebebi yaziyor. */
    const tur = d ? turBul(d.look?.tur) : null;
    const a = tur ? yumurtaAraligi(tur.nadir) : null;
    onayIste({
      baslik: tur ? t(tur.adKey) : t('slotNewTitle'),
      satir: tur
        ? `${t(NADIR_ETIKET[tur.nadir])} · ${
            a.az === a.cok ? t('eggDropsOne', { a: a.az })
                           : t('eggDropsRange', { a: a.az, b: a.cok })}`
        : t('slotNewLine', { n: i + 1 }),
      not: d ? t('slotHeldNote') : t('slotBuyNote'),
      fiyat: yuvaFiyati(i),
      engel: sirada ? null : t('slotInOrder'),
      tamam: () => yuvaAc(i),
    });
    return;
  }
  if (!d) { uyar(t('slotNeedsDragon')); return; }
  if (d.id === oyuncu.activeId) return;
  oyuncu.activeId = d.id;
  kaydet();
  cizHepsi();
}

function yuvaAc(sira) {
  const fiyat = yuvaFiyati(sira);
  if (oyuncu.stars < fiyat) { uyar(t('needStars')); return; }
  oyuncu.stars -= fiyat;
  oyuncu.unlockedSlots = Math.min(EN_COK_YUVA, sira + 1);

  /* IKINCI YUVA IZGARAYI BUYUTUYOR. Yeni sira sola ve uste geliyor,
     hepsi kilitli - oyuncu bedava alan almiyor, yeni bir kilit
     merdiveni aliyor. */
  const genisledi = genislemeHakki(oyuncu) && izgarayiGenislet(oyuncu);

  /* Yuvayi acinca orada bekleyen ejderha varsa dogrudan ona geciliyor:
     oyuncunun parayi ne icin verdigini aninda gormesi gerekiyor. */
  const gelen = oyuncu.dragons[sira];
  if (gelen) oyuncu.activeId = gelen.id;

  kaydet();
  haptic.success();
  cizHepsi();
  if (gelen) odulUcur(t('slotOpened', { name: t(turBul(gelen.look?.tur).adKey) }), true);
  if (genisledi) {
    /* Haber ejderha ekraninda veriliyor ama degisiklik OCAK'ta - oyuncu
       oraya bakmazsa buyumeyi hic gormeyebilir. */
    uyar(t('gridGrew'));
    ekranGoster('grid');
  }
}

function ejderhaCiz() {
  const d = aktifEjderha(oyuncu);
  slotlariCiz();
  if (!d) return;

  const acik = yuvaAcikMi(oyuncu, d);
  artEl.innerHTML = dragonSvg(gorselSeviye(d.level), d.look, 'happy');
  artEl.classList.toggle('dim', !acik);

  dragonNameEl.textContent = d.name || t(turBul(d.look?.tur).adKey);
  dragonLvEl.textContent = t('lvShort', { level: d.level });

  const gereken = seviyeIcinBesleme(d.level);
  xpFill.style.width = `${Math.min(100, (d.feeds / gereken) * 100)}%`;

  const fiyat = beslemeFiyati(d);
  feedCostEl.textContent = bicim(fiyat);
  feedBtn.disabled = mesgulMu() || !acik || oyuncu.food < fiyat;

  appetiteEl.textContent = d.pencereBas
    ? t('appetite', { time: sureMetni(d.pencereBas + BESLEME_PENCERESI - simdi()) })
    : t('appetiteFresh');

  const tur = turBul(d.look?.tur);
  const a = yumurtaAraligi(tur.nadir);
  turSatiri.textContent = `${t(NADIR_ETIKET[tur.nadir])} · ${
    a.az === a.cok ? t('eggDropsOne', { a: a.az })
                   : t('eggDropsRange', { a: a.az, b: a.cok })}`;
  turSatiri.className = `tur-satiri nadir-${tur.nadir}`;

  bostaCiz(d, acik);
}

/* Biriken yumurtalari izgaraya indiriyor. Seviyeleri yine ture bagli:
   Efsanevi ejderha bosta da daha iyi yumurta biriktiriyor. Izgara
   doluysa nesneVer zaten siraya aliyor. */
function bostaTopla() {
  const d = aktifEjderha(oyuncu);
  if (!d || !yuvaAcikMi(oyuncu, d)) return;

  bostaIsle(oyuncu, simdi());
  const adet = d.bosta.biriken;
  if (!adet) return;

  const nadir = turBul(d.look?.tur).nadir;
  const ocakSekmesi = tabbar.querySelector('.tab[data-go="grid"]');
  let sirayaGiden = 0;

  /* Once hepsi yerlestiriliyor, sonra animasyon. Ters sirada yapilirsa
     kaydet() animasyonlardan once donuyor ve oduller diske ulasmiyor. */
  const seviyeler = [];
  for (let i = 0; i < adet; i += 1) {
    const lv = beslemeYumurtaSeviyesi(nadir);
    seviyeler.push(lv);
    if (nesneVer({ t: 'egg', lv }) !== 'izgara') sirayaGiden += 1;
  }
  d.bosta = { son: simdi(), biriken: 0 };
  kaydet();

  ucur({
    kaynak: bostaKutu,
    hedef: ocakSekmesi || resFood,
    gorsel: gorselYolu({ t: 'egg', lv: seviyeler[0] }),
    adet,
    boy: 34,
    bitince: () => { zipla(ocakSekmesi, 1.16); },
  });

  haptic.success();
  odulUcur(t('idleGot', { n: adet }), true);
  if (sirayaGiden) yaziUcur(t('gridFullEgg'));
  cizHepsi();
}

/* Bosta uretim satiri. Kilitli yuvadaki ejderha uretmedigi icin orada
   hic gosterilmiyor - bos bir sayac kafa karistirirdi. */
function bostaCiz(d, acik) {
  if (!acik) { bostaKutu.hidden = true; return; }
  bostaKutu.hidden = false;

  const y = bostaHesapla(d.bosta, simdi());
  bostaSay.textContent = `${y.biriken}/${BOSTA_TAVAN}`;
  bostaKutu.classList.toggle('dolu', y.dolu);
  bostaNot.textContent = y.dolu ? t('idleFull')
    : t('idleNext', { time: sureKisa(y.kalan) });
  bostaBtn.disabled = mesgulMu() || y.biriken === 0;
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
/* Kapali kademe rozetinde sayinin yerine duran kucuk kilit. */
const KILIT_KUCUK = '<svg class="kilit-mini" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0110 0v2" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/></svg>';
const UNLEM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v8.2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><circle cx="12" cy="18.4" r="1.9" fill="currentColor"/></svg>';

function odulRozeti(odul) {
  const parcalar = [];
  if (odul.food) parcalar.push(`<img src="../../assets/food/meat-64.webp" alt=""><b>${bicim(odul.food)}</b>`);
  if (odul.stars) parcalar.push(`<img src="../../assets/currency/star-64.webp" alt=""><b>${bicim(odul.stars)}</b>`);

  /* Ayni nesneden birden fazla varsa "2x" diye tek rozette toplaniyor. */
  const nesneler = [...(odul.items || []), ...(odul.item ? [odul.item] : [])];
  const sayim = new Map();
  for (const n of nesneler) {
    const anahtar = `${n.t}:${n.lv}`;
    sayim.set(anahtar, { nesne: n, adet: (sayim.get(anahtar)?.adet || 0) + 1 });
  }
  for (const { nesne, adet } of sayim.values()) {
    parcalar.push(`<img src="${gorselYolu(nesne)}" alt=""><b>${adet > 1 ? `${adet}\u00D7` : ''}${t('lvShort', { level: nesne.lv })}</b>`);
  }
  return parcalar.join('<span class="odul-ayrac"></span>');
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
    case 'chest': return s.chests;
    case 'packlv': return s.maxPackLv;
    case 'unlock': return s.unlocks;
    default: return 0;
  }
}

const gorevBaslik = (g) => t(`quest${g.tip.charAt(0).toUpperCase()}${g.tip.slice(1)}`, { n: g.hedef });

/* ---------- GOREV HARITASI ---------- */

/* Onizleme karti: uc kademe rozetini, toplam ilerlemeyi ve oyuncunun
   su an ustunde oldugu tek gorevi gosteriyor. Tam liste sayfada. */
function questOzetCiz() {
  const bitti = oyuncu.gorevler.bitti;
  const toplam = tumGorevler().length;
  questSayac.textContent = `${bitti.length}/${toplam}`;

  questKademeler.innerHTML = '';
  for (const kademe of KADEMELER) {
    const { biten, toplam: kt } = kademeIlerleme(kademe, bitti);
    const acik = kademeAcikMi(kademe, bitti);
    const bittiMi = biten === kt;
    const el = document.createElement('div');
    el.className = `kademe-rozet${acik ? ' acik' : ''}${bittiMi ? ' bitti' : ''}`;
    el.innerHTML = `<span class="kademe-ad">${t(`tier_${kademe}`)}</span>
      <span class="kademe-say">${acik ? `${biten}/${kt}` : KILIT_KUCUK}</span>`;
    questKademeler.appendChild(el);
  }

  const g = aktifGorev(bitti);
  if (!g) {
    questAktif.innerHTML = `<span class="ozet-bitti">${t('allDone')}</span>`;
    return;
  }
  const sayi = gorevIlerleme(g);
  const hazir = sayi >= g.hedef;
  questAktif.innerHTML = `
    <div class="ozet-gorev${hazir ? ' hazir' : ''}">
      <div class="ozet-gorev-ad">${gorevBaslik(g)}</div>
      <div class="ozet-gorev-alt">
        <div class="bar"><i style="width:${Math.min(100, (sayi / g.hedef) * 100)}%"></i></div>
        <span class="quest-odul">${odulRozeti(g.odul)}</span>
      </div>
    </div>`;
}

/* Sayfadaki tam liste: kademe kademe, kilitli olanlar kapali. */
function questSayfaCiz() {
  const bitti = oyuncu.gorevler.bitti;
  sayfaGovde.innerHTML = '';

  for (const kademe of KADEMELER) {
    const acik = kademeAcikMi(kademe, bitti);
    const { biten, toplam } = kademeIlerleme(kademe, bitti);

    const blok = document.createElement('section');
    blok.className = `kademe-blok${acik ? '' : ' kilitli'}`;
    blok.innerHTML = `<div class="kademe-bas">
        <h3>${t(`tier_${kademe}`)}</h3>
        <span>${acik ? `${biten}/${toplam}` : t('tierLocked')}</span>
      </div>`;

    const yol = document.createElement('div');
    yol.className = 'quest-path';

    kademeGorevleri(kademe).forEach((g, i) => {
      const tamamlandi = bitti.includes(g.id);
      const gorevAcik = gorevAcikMi(kademe, i, bitti);
      const sayi = gorevIlerleme(g);
      const hazir = !tamamlandi && gorevAcik && sayi >= g.hedef;

      const el = document.createElement('div');
      el.className = `quest${tamamlandi ? ' done' : ''}${hazir ? ' active' : ''}${gorevAcik ? '' : ' kapali'}`;
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
        if (!gorevAcikMi(kademe, i, oyuncu.gorevler.bitti)) return;
        if (oyuncu.gorevler.bitti.includes(g.id) || gorevIlerleme(g) < g.hedef) return;
        oyuncu.gorevler.bitti.push(g.id);
        odulVer(g.odul, el.querySelector('button'));
        kaydet();
        haptic.success();
        questSayfaCiz();
        questOzetCiz();
        gorevNoktasi();
      });
      yol.appendChild(el);
    });

    blok.appendChild(yol);
    sayfaGovde.appendChild(blok);
  }
}

/* ---------- PARTNER GOREVLERI ---------- */

let partnerSkorlar = {};      /* oyun id -> en iyi skor */

async function partnerSkorlariOku() {
  const girisler = await Promise.all(
    PARTNER_OYUNLAR.map(async (o) => [o.id, Number(await getBest(o.id)) || 0]),
  );
  partnerSkorlar = Object.fromEntries(girisler);
}

const partnerAnahtar = (oyunId, kademe) => `${oyunId}:${kademe}`;

function partnerAlinanSayisi() {
  return oyuncu.partner.alinan.length;
}

/* Sekiz oyunun da 4. kademesi alindi mi? */
function buyukOdulHazirMi() {
  return PARTNER_OYUNLAR.every((o) => oyuncu.partner.alinan.includes(partnerAnahtar(o.id, 4)));
}

function partnerOzetCiz() {
  const toplam = PARTNER_OYUNLAR.length * 4;
  const alinan = partnerAlinanSayisi();
  partnerSayac.textContent = `${alinan}/${toplam}`;
  partnerBar.style.width = `${(alinan / toplam) * 100}%`;

  /* Alinmayi bekleyen kademe sayisi - oyuncunun hemen yapabilecegi sey */
  let hazir = 0;
  for (const o of PARTNER_OYUNLAR) {
    const kazanilan = partnerKademe(o.id, partnerSkorlar[o.id] || 0);
    for (let k = 1; k <= kazanilan; k += 1) {
      if (!oyuncu.partner.alinan.includes(partnerAnahtar(o.id, k))) hazir += 1;
    }
  }

  if (buyukOdulHazirMi() && !oyuncu.partner.buyukOdul) {
    partnerAktif.innerHTML = `<span class="ozet-gorev-ad vurgulu">${t('grandReady')}</span>`;
  } else if (hazir > 0) {
    partnerAktif.innerHTML = `<span class="ozet-gorev-ad vurgulu">${t('partnerReady', { n: hazir })}</span>`;
  } else {
    partnerAktif.innerHTML = `<span class="ozet-gorev-ad">${t('partnerHint')}</span>`;
  }
}

function partnerSayfaCiz() {
  sayfaGovde.innerHTML = '';

  /* Buyuk odul kartini en uste koyuyoruz: hedefi bastan gostermek
     sekiz oyunu da oynamak icin sebep veriyor. */
  const buyuk = document.createElement('section');
  const buyukHazir = buyukOdulHazirMi() && !oyuncu.partner.buyukOdul;
  buyuk.className = `buyuk-odul${oyuncu.partner.buyukOdul ? ' alindi' : ''}${buyukHazir ? ' hazir' : ''}`;
  buyuk.innerHTML = `
    <div class="buyuk-bas">
      <h3>${t('grandTitle')}</h3>
      <span>${t('grandNote')}</span>
    </div>
    <div class="buyuk-oduller">
      ${PARTNER_BUYUK_ODUL.map((o) => `<img src="${o.stars ? '../../assets/currency/star-64.webp' : gorselYolu(o)}" alt="">`).join('')}
    </div>
    <button class="act-btn primary buyuk-al"${buyukHazir ? '' : ' disabled'}>
      ${oyuncu.partner.buyukOdul ? t('questDone') : t('questClaim')}
    </button>`;

  buyuk.querySelector('button').addEventListener('click', () => {
    if (!buyukOdulHazirMi() || oyuncu.partner.buyukOdul) return;
    oyuncu.partner.buyukOdul = true;
    /* Listede artik hem nesne hem dogrudan yildiz olabiliyor. */
    for (const o of PARTNER_BUYUK_ODUL) {
      odulVer(o.stars ? { stars: o.stars } : { item: { ...o } }, buyuk.querySelector('button'));
    }
    kaydet();
    haptic.success();
    partnerSayfaCiz();
    partnerOzetCiz();
    gorevNoktasi();
  });
  sayfaGovde.appendChild(buyuk);

  for (const oyun of PARTNER_OYUNLAR) {
    const skor = partnerSkorlar[oyun.id] || 0;
    const kazanilan = partnerKademe(oyun.id, skor);

    const kart = document.createElement('section');
    kart.className = 'partner-oyun';
    kart.innerHTML = `
      <div class="partner-bas">
        <h3>${oyun.ad}</h3>
        <span class="partner-skor">${t('yourBest', { n: bicim(skor) })}</span>
      </div>`;

    const liste = document.createElement('div');
    liste.className = 'partner-kademeler';

    oyun.esik.forEach((esik, i) => {
      const kademe = i + 1;
      const anahtar = partnerAnahtar(oyun.id, kademe);
      const alindi = oyuncu.partner.alinan.includes(anahtar);
      const hazir = !alindi && kazanilan >= kademe;

      const sat = document.createElement('div');
      sat.className = `partner-kademe${alindi ? ' done' : ''}${hazir ? ' active' : ''}`;
      sat.innerHTML = `
        <span class="pk-no">${kademe}</span>
        <div class="pk-govde">
          <div class="pk-hedef">${t(oyun.birim === 'seviye' ? 'targetLevel' : 'targetScore', { n: bicim(esik) })}</div>
          <div class="bar"><i style="width:${Math.min(100, (skor / esik) * 100)}%"></i></div>
        </div>
        <span class="quest-odul">${odulRozeti(PARTNER_ODULLERI[i])}</span>
        <button class="quest-claim"${hazir ? '' : ' disabled'}>${alindi ? t('questDone') : t('questClaim')}</button>`;

      sat.querySelector('button').addEventListener('click', () => {
        if (oyuncu.partner.alinan.includes(anahtar)) return;
        if (partnerKademe(oyun.id, partnerSkorlar[oyun.id] || 0) < kademe) return;
        oyuncu.partner.alinan.push(anahtar);
        odulVer(PARTNER_ODULLERI[i], sat.querySelector('button'));
        kaydet();
        haptic.success();
        partnerSayfaCiz();
        partnerOzetCiz();
        gorevNoktasi();
      });
      liste.appendChild(sat);
    });

    kart.appendChild(liste);
    sayfaGovde.appendChild(kart);
  }
}

/* ---------- GENISLEYEN SAYFA ---------- */

function sayfaAc(baslik, cizici) {
  sayfaBaslik.textContent = baslik;
  cizici();
  sayfa.hidden = false;
  sayfaGovde.scrollTop = 0;
}

function sayfaKapatt() {
  sayfa.hidden = true;
}


/* Sekmedeki nokta: alinmayi bekleyen bir sey var mi? Kilitli gorevler
   sayilmiyor - oyuncu onlari alamaz, bosuna cagirmayalim. */
function gorevNoktasi() {
  siparisNoktasi();
  const bitti = oyuncu.gorevler.bitti;

  const g = aktifGorev(bitti);
  const hazirGorev = !!g && gorevIlerleme(g) >= g.hedef;

  const hazirPartner = PARTNER_OYUNLAR.some((o) => {
    const kazanilan = partnerKademe(o.id, partnerSkorlar[o.id] || 0);
    for (let k = 1; k <= kazanilan; k += 1) {
      if (!oyuncu.partner.alinan.includes(partnerAnahtar(o.id, k))) return true;
    }
    return false;
  });

  const hazirBuyuk = buyukOdulHazirMi() && !oyuncu.partner.buyukOdul;

  taskDot.hidden = !(hazirGorev || hazirPartner || hazirBuyuk || gunlukAlinabilirMi());

  /* Bekleyen yumurta varken Ejderha sekmesi de isaretleniyor; yoksa
     oyuncu Ocak ekranindayken birikenin farkina varmiyor. */
  ejderhaNoktasi.hidden = bekleyenYumurta(oyuncu) === 0;
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
    bitince: () => { kaynakTazele(true); zipla(yildiz ? resStar : resFood, 1.22); },
  });
}

function cizHepsi() {
  kaynakTazele();
  ejderhaCiz();
  siraCiz();
  bilgiPaneliCiz();
  gunlukCiz();
  questOzetCiz();
  partnerOzetCiz();
  gorevNoktasi();
  tazele();
}

/* Saniyede bir donen tik eskiden ejderha gorselini ve tum yuva seridini
   innerHTML ile bastan kuruyordu; degisen tek sey geri sayim yazisiydi.
   Artik sadece o yazi guncelleniyor. Istah penceresi doldugu an besleme
   fiyati sifirlandigi icin orada bir kez tam cizim yapiliyor. */
function tazele() {
  /* Ocak ekraninda kap sayaclari iliyor. Sadece yazilar guncelleniyor;
     bir kap hazir hale gectiginde tam cizim yapiliyor. */
  if (!$('screen-grid').hidden) {
    if (board?.sayaclariTazele?.()) { board.ciz(); board.sec(seciliHucre); gorevNoktasi(); }
    if (seciliHucre >= 0 && kapMi(oyuncu.grid.cells[seciliHucre])) bilgiPaneliCiz();
  }

  if ($('screen-dragon').hidden) return;
  const d = aktifEjderha(oyuncu);
  if (!d) return;

  if (d.pencereBas && simdi() - d.pencereBas >= BESLEME_PENCERESI) { ejderhaCiz(); return; }

  appetiteEl.textContent = d.pencereBas
    ? t('appetite', { time: sureMetni(d.pencereBas + BESLEME_PENCERESI - simdi()) })
    : t('appetiteFresh');

  /* Tur satiri degismiyor, sadece bosta sayaci iliyor. Sayac bir
     yumurta daha dustugunde rozetin de guncellenmesi gerekiyor. */
  if (bostaIsle(oyuncu, simdi())) { kaydet(); gorevNoktasi(); }
  bostaCiz(d, yuvaAcikMi(oyuncu, d));
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

/* ONAY KUTUSU
   Oyunda geri alinamayan tek pahali islem yuva acmak (2.000 yildiza
   kadar). Oncesinde hicbir onay yoktu - serit uzerinde yanlis karta
   dokunmak butun birikimi goturuyordu. Kutu ayni zamanda yuvanin ne
   verdigini anlatiyor. */
let onayKapat = null;

function onayIste({ baslik, satir, not, fiyat, engel = null, tamam }) {
  onayKapat?.();
  const yeterli = !engel && oyuncu.stars >= fiyat;

  const kat = document.createElement('div');
  kat.className = 'onay-kat';
  kat.innerHTML = `
    <div class="onay" role="dialog" aria-modal="true">
      <strong class="onay-baslik">${baslik}</strong>
      <p class="onay-satir">${satir}</p>
      <p class="onay-not">${not}</p>
      <div class="onay-fiyat">
        <img src="../../assets/currency/star-64.webp" alt="">${bicim(fiyat)}
      </div>
      ${engel ? `<p class="onay-engel">${engel}</p>` : ''}
      <div class="onay-dugmeler">
        <button class="act-btn onay-vazgec">${engel ? t('close') : t('cancel')}</button>
        ${engel ? '' : `<button class="act-btn primary onay-tamam"${yeterli ? '' : ' disabled'}>${
          yeterli ? t('slotUnlock') : t('needStars')}</button>`}
      </div>
    </div>`;

  const kapat = () => { kat.remove(); onayKapat = null; };
  onayKapat = kapat;
  kat.addEventListener('click', (e) => { if (e.target === kat) kapat(); });
  kat.querySelector('.onay-vazgec').addEventListener('click', () => { kapat(); });
  if (yeterli) kat.querySelector('.onay-tamam')?.addEventListener('click', () => { kapat(); tamam(); });
  document.body.appendChild(kat);
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
    kok: $('tut'), maske: $('tut-mask'), buyucu: $('tut-wizard'),
    metin: $('tut-text'), ileriBtn: $('tut-next'), atlaBtn: $('tut-atla'), t, iz,
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
