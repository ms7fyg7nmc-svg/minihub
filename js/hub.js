
import { initTelegram, getUser, haptic, hideBackButton, isTelegramUser, openShareLink, openInvoice } from './tg.js?v201';
import {
   getPoints, getBest, sunucuDurumu,
   getEnergy, getStreak, claimStreak, getSpin, spinWheel, odulDurumu, liderTablosu, refreshDaily,
   referralOzeti, adEnergyRefill, starEnergyInvoiceLink, oynanabilirMi, bakimListesi,
} from './store.js?v201';
import { initLang, t, locale, applyTranslations, renderLangSwitcher, mhHtml } from './i18n.js?v201';

// Adsgram partner panelinde olusturulan "Reward" ad unit'inin Block ID'si.
const ADSGRAM_BLOCK_ID = '43308';

const BOT_LINK = '';
const BOT_USERNAME = 'minihubgames_bot';

/* bot/worker.js'teki REFERRAL_SIGNUP_BONUS, REFERRAL_RATE_DIRECT ve
   REFERRAL_RATE_INDIRECT ile ayni degerler - yalnizca ekranda anlatmak
   icin, gercek odeme her zaman sunucuda hesaplaniyor. Ikisi ayrisirsa
   test-guvenlik.mjs yakalar. */
const REFERRAL_SIGNUP_BONUS = 500;
const REFERRAL_RATE_DIRECT = 0.15;
const REFERRAL_RATE_INDIRECT = 0.025;

/* %15 / %2,5 - oran kullanicinin dilinde yazilsin diye Intl kullaniyoruz
   (Turkce'de ondalik ayraci virgul). */
function oranYazi(oran) {
   return new Intl.NumberFormat(locale(), {
      style: 'percent', maximumFractionDigits: 1,
   }).format(oran);
}

const ICONS = {
   '2048': `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".5"/>
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".32"/>
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".32"/>
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff"/>
   </svg>`,

   blockblast: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
   </svg>`,

   watersort: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="2.5" width="7" height="19" rx="3.5" fill="#fff" opacity=".38"/>
      <rect x="3.5" y="9.5" width="7" height="12" rx="3.5" fill="#fff"/>
      <rect x="13.5" y="2.5" width="7" height="19" rx="3.5" fill="#fff" opacity=".38"/>
      <rect x="13.5" y="15" width="7" height="6.5" rx="3.25" fill="#fff"/>
   </svg>`,

   match3: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="4.6" cy="12" r="3.5" fill="#fff"/>
      <circle cx="12" cy="12" r="3.5" fill="#fff"/>
      <circle cx="19.4" cy="12" r="3.5" fill="#fff"/>
   </svg>`,

   tripletile: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="10" width="9" height="9" rx="2.5" fill="#fff" opacity=".45"/>
      <rect x="7.5" y="7" width="9" height="9" rx="2.5" fill="#fff" opacity=".7"/>
      <rect x="12" y="4" width="9" height="9" rx="2.5" fill="#fff"/>
   </svg>`,

   flow: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6.5v5a3.5 3.5 0 0 0 3.5 3.5H18" fill="none" stroke="#fff"
            stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
      <circle cx="6" cy="6.5" r="3.2" fill="#fff"/>
      <circle cx="18" cy="15" r="3.2" fill="#fff"/>
   </svg>`,

   pet: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 10 1.2 4.4Q-0.6 10 2 14.6L4 12.2 5.4 14.8 7.2 12.2 8.6 14.6z"
            fill="#fff" opacity=".6"/>
      <path d="M15 10 22.8 4.4Q24.6 10 22 14.6L20 12.2 18.6 14.8 16.8 12.2 15.4 14.6z"
            fill="#fff" opacity=".6"/>
      <path d="M12 13.4q4.6 0 5.6 3.4Q18 21 12 21T6.4 16.8Q7.4 13.4 12 13.4z"
            fill="#fff" opacity=".92"/>
      <path d="M8.2 8.4 7.6 3.6 9.8 6.4z" fill="#fff" opacity=".72"/>
      <path d="M15.8 8.4 16.4 3.6 14.2 6.4z" fill="#fff" opacity=".72"/>
      <path d="M8 9.2 8.6 5.2 12 3.6l3.4 1.6.6 4Q14.6 13 12 13T8 9.2z" fill="#fff"/>
      <path d="M9.6 8.2 11 8.8 9.6 9.4z" fill="#3a2a4d"/>
      <path d="M14.4 8.2 13 8.8l1.4.6z" fill="#3a2a4d"/>
   </svg>`,

   /* Ejderha karti $MH armasini tasiyor: hub'in amblemi, aralikli olarak
      madeni para gibi kendi ekseninde donuyor. */
   dragon: `<img class="game-img spin" src="assets/currency/mh-logo-128.webp" alt="" width="34" height="34">`,

   coindrop: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="5.4" fill="#fff" opacity=".45"/>
      <circle cx="15.6" cy="15.2" r="7" fill="#fff"/>
      <circle cx="15.6" cy="15.2" r="4.4" fill="none" stroke="#c8902a" stroke-width="1.5" opacity=".85"/>
   </svg>`,

   snake: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17h6a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h5" fill="none" stroke="#fff"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="19" cy="3.5" r="2.6" fill="#fff" opacity=".55"/>
   </svg>`,

   wheelrush: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#fff" opacity=".18"/>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="1.6"/>
      <g stroke="#fff" stroke-width="2" stroke-linecap="round">
         <path d="M12 12 12 4.4"/>
         <path d="M12 12 18.6 8.2"/>
         <path d="M12 12 18.6 15.8"/>
         <path d="M12 12 12 19.6"/>
         <path d="M12 12 5.4 15.8"/>
         <path d="M12 12 5.4 8.2"/>
      </g>
      <circle cx="12" cy="12" r="3.2" fill="#fff"/>
   </svg>`,
};

function gameList() {
   /* Bakimdaki oyun kartta kilitli gorunuyor ("Bakimda" rozeti) ve tiklanmiyor.
      Asil engel sunucuda; bu sadece kullaniciya durumu gosteriyor. */
   const bakimUygula = (liste) => liste.map((g) => (
      BAKIM.has(g.id) ? { ...g, ready: false, maintenance: true } : g
   ));
   return bakimUygula([
      {
         id: 'dragon',
         title: t('game.dragon.title'),
         desc: t('game.dragon.desc'),
         icon: ICONS.dragon,
         url: 'games/dragon/index.html',
         gradient: 'linear-gradient(145deg, #c79cf7 0%, #9a63e4 48%, #6b3bc4 100%)',
         accent: '#a978e8',
         hero: true,
         /* Oyun adi bu karede yazi degil, kendi logosu (bkz. tile-logo).
            Adin cevirisi duruyor ve img'nin alt metni olarak kullaniliyor;
            gorselin kendisi dort dilde de Ingilizce - Coin Drop gibi marka
            adi sayiliyor. */
         logo: 'assets/dragon-tile/logo.webp',
         noBest: true,
         ready: true,
      },
      {
         id: '2048',
         title: t('game.2048.title'),
         desc: t('game.2048.desc'),
         icon: ICONS['2048'],
         gradient: 'linear-gradient(145deg, #ffcd8a 0%, #f2834f 48%, #d94f3d 100%)',
         accent: '#f2884b',
         url: 'games/2048/index.html',
         ready: true,
      },
      {
         id: 'blockblast',
         title: t('game.blockblast.title'),
         desc: t('game.blockblast.desc'),
         icon: ICONS.blockblast,
         url: 'games/blockblast/index.html',
         gradient: 'linear-gradient(145deg, #9db7ff 0%, #5e74ff 48%, #3f3fd0 100%)',
         accent: '#5b8cff',
         ready: true,
      },
      {
         id: 'match3',
         title: t('game.match3.title'),
         desc: t('game.match3.desc'),
         icon: ICONS.match3,
         url: 'games/match3/index.html',
         gradient: 'linear-gradient(145deg, #ffa3c8 0%, #e56a9f 48%, #b8407c 100%)',
         accent: '#e2679c',
         ready: true,
      },
      {
         id: 'tripletile',
         title: t('game.tripletile.title'),
         desc: t('game.tripletile.desc'),
         icon: ICONS.tripletile,
         url: 'games/tripletile/index.html',
         gradient: 'linear-gradient(145deg, #ffdd92 0%, #f5b23f 48%, #e07a2c 100%)',
         accent: '#f5b942',
         ready: true,
      },
      {
         id: 'flow',
         title: t('game.flow.title'),
         desc: t('game.flow.desc'),
         icon: ICONS.flow,
         url: 'games/flow/index.html',
         gradient: 'linear-gradient(145deg, #86efe2 0%, #37bed2 48%, #2272a0 100%)',
         accent: '#3fc7d4',
         bestKey: 'hub.level',
         ready: true,
      },
      {
         id: 'snake',
         title: t('game.snake.title'),
         desc: t('game.snake.desc'),
         icon: ICONS.snake,
         url: 'games/snake/index.html',
         gradient: 'linear-gradient(145deg, #95f2bd 0%, #45c489 48%, #23865c 100%)',
         accent: '#4ecb8b',
         ready: true,
      },
      {
         id: 'coindrop',
         title: t('game.coindrop.title'),
         desc: t('game.coindrop.desc'),
         icon: ICONS.coindrop,
         url: 'games/coindrop/index.html',
         gradient: 'linear-gradient(145deg, #ffe9a6 0%, #f3c257 48%, #bd8420 100%)',
         accent: '#f5b942',
         ready: true,
      },
      {
         id: 'wheelrush',
         title: t('game.wheelrush.title'),
         desc: t('game.wheelrush.desc'),
         icon: ICONS.wheelrush,
         url: 'games/wheelrush/index.html',
         gradient: 'linear-gradient(145deg, #ffd98a 0%, #f2884b 46%, #cf3f45 100%)',
         accent: '#f2884b',
         ready: true,
      },
     ]);
}

initTelegram();
hideBackButton();

await initLang();
applyTranslations();
renderLangSwitcher(document.getElementById('lang-switcher'));

/* Bakimdaki oyunlari sunucu belirliyor (bot/worker.js BAKIMDAKI_OYUNLAR).
   Acilista bir kez okunup gameList()'e veriliyor; renderGames senkron kaliyor. */
const BAKIM = new Set(await bakimListesi());

renderProfile();
renderGames();
renderTelegramNotice();
renderSyncBadge();
renderDailyCard();
renderEnergyCard();
wireDailyPanel();
renderLiderCard();
wireLiderPanel();
renderFriendsCard();
wireFriendsPanel();
renderReferralLadder();

document.addEventListener('langchange', () => {
   applyTranslations();
   renderProfile();
   renderGames();
   renderSyncBadge();
   renderDailyCard();
   renderEnergyCard();
   renderLiderCard();
   renderFriendsCard();
   renderReferralLadder();
});

function renderTelegramNotice() {
   const notice = document.getElementById('tg-notice');
   if (!notice || isTelegramUser()) return;

   notice.hidden = false;
   if (BOT_LINK) {
      notice.href = BOT_LINK;
      notice.target = '_blank';
      notice.rel = 'noopener';
   } else {
      notice.classList.add('is-static');
   }
}

async function renderSyncBadge() {
   const badge = document.getElementById('sync-badge');
   if (!badge) return;

   const durum = await sunucuDurumu();
   if (durum === 'misafir') return;

   badge.hidden = false;
   badge.classList.toggle('is-sunucu', durum === 'sunucu');
   badge.classList.toggle('is-yerel', durum === 'yerel');
   document.getElementById('sync-text').textContent =
      durum === 'sunucu' ? t('hub.sync.server') : t('hub.sync.local');
}

function refreshPointsChip() {
   getPoints().then((points) => {
      document.getElementById('points').textContent = points.toLocaleString(locale());
   });
}

function renderProfile() {
   const user = getUser();
   document.getElementById('username').textContent = user.name;

const avatar = document.getElementById('avatar');
   if (user.photo) {
      avatar.style.backgroundImage = `url("${user.photo}")`;
   } else {
      avatar.textContent = user.name.charAt(0).toUpperCase();
   }

refreshPointsChip();
}

/* Dokuz oyun, uc sutun. Eskiden her oyun tam genislikte bir satirdi:
   dokuz satir ~900px ediyordu ve son uc oyunu goren yoktu. Kareler
   ekranin ucte birine siginca hepsi tek bakista goruluyor.

   Kareye sigmayan tek sey aciklama metniydi ("Swipe, merge, reach 2048");
   ismi ve ikonu zaten soyluyor, o yuzden karttan dustu - gameList'teki
   desc alani duruyor cunku baska yerde (bakim/erisilebilirlik) isimize
   yariyor, karede alt yazi olarak rekor gosteriliyor. */
function renderGames() {
   const container = document.getElementById('games');
   container.textContent = '';

gameList().forEach((game, index) => {
   const tile = document.createElement('button');
   tile.className = 'game-tile';
   tile.disabled = !game.ready;
   tile.style.setProperty('--i', index);
   /* Ejderha Adasi hub'in amiral gemisi: karenin tamami kendi gorseli,
      amblem onunde donuyor (bkz. .game-tile.is-hero). */
   if (game.hero) tile.classList.add('is-hero');

   tile.innerHTML = `
   <span class="tile-icon${game.ready ? '' : ' soon'}"></span>
   <span class="tile-name"></span>
   <span class="tile-foot"></span>
   `;
   const ikon = tile.querySelector('.tile-icon');
   ikon.innerHTML = game.icon;
   const isim = tile.querySelector('.tile-name');
   if (game.logo) {
      const im = document.createElement('img');
      im.className = 'tile-logo';
      im.src = game.logo;
      im.alt = game.title;          /* ekran okuyucu cevrilmis adi duyar */
      im.width = 256; im.height = 140;
      isim.appendChild(im);
      isim.classList.add('is-logo');
   } else {
      isim.textContent = game.title;
   }
   /* Ekran okuyucu ve bakim durumu icin aciklama basligin icinde kalsin */
   tile.title = game.desc;

   if (game.gradient && !game.hero) ikon.style.setProperty('--tile-gradient', game.gradient);
   if (game.accent) tile.style.setProperty('--card-accent', game.accent);

   const alt = tile.querySelector('.tile-foot');
   if (game.ready) {
      if (!game.noBest) {
         getBest(game.id).then((best) => {
            if (best > 0) {
               alt.textContent = t(game.bestKey ?? 'hub.record', { best: best.toLocaleString(locale()) });
               alt.classList.add('is-rekor');
            }
         });
      }
      tile.addEventListener('click', async () => {
         if (!(await oynanabilirMi())) {
            haptic.error();
            openEnergyModal();
            return;
         }
         haptic.tap();
         window.location.href = game.url;
      });
   } else {
      alt.textContent = game.maintenance ? t('hub.maintenance') : t('hub.soon');
      alt.classList.add('is-durum');
   }

   container.appendChild(tile);
});
}

/* CARK PALETI
   Hub'in sekiz parlak rengi kullaniliyordu (mavi, yesil, turuncu...).
   Cark antik tas bir halkanin icine girince o palet lunapark gibi
   duruyordu - cerceveyle hicbir akrabaligi yoktu.

   Renkler artik cercevenin KENDISINDEN turuyor: stone.webp'in doygun
   pikselleri olculdugunde iki aile cikiyor, eskimis altin (#9e7948,
   vurgularin %65'i) ve run isigi moru (#833790, %23). Dilimler bu iki
   aileden.

   Renk SIRAYA degil ODULE bagli: ozel iki dilim (enerji ve en buyuk
   ikramiye) kendi rengini aliyor, geri kalanlar iki mor tonu arasinda
   siralaniyor. Boylece odul listesi degisince renkler kaymiyor. */
const WHEEL_ZEMIN = ['#2a1738', '#3b2550'];   /* sirayla degisen taban */
const WHEEL_ENERJI = '#5e2472';               /* run isigi moru */
const WHEEL_BUYUK = '#7c5520';                /* en buyuk odul: eskimis altin */
const WHEEL_AYIRAC = 'rgba(176, 138, 84, 0.8)';
const WHEEL_YAZI = '#f6e7c8';

let dailyPrizes = null;
let wheelRotation = 0;

// Alttan acilan panellerden (Gunluk Odul/Enerji/Liderlik/Arkadaslar) biri
// acikken arkadaki sayfanin kaymasi (iOS'ta "arkaplan kayiyor" hissi) icin:
// body'yi position:fixed yapip kaydirmayi tamamen kilitliyoruz, kapaninca
// kaldigi yere geri donuyoruz. Sayac kullaniyoruz cunku teorik olarak iki
// panel ust uste acilabilir - ilk kapanan kilidi erken acmasin diye.
let kilitSayaci = 0;
function panelKaydirmayiKilitle() {
   kilitSayaci++;
   if (kilitSayaci > 1) return;
   const y = window.scrollY || document.documentElement.scrollTop || 0;
   document.body.dataset.kilitliKaydirma = String(y);
   document.body.style.top = `-${y}px`;
   document.body.classList.add('panel-locked');
}
function panelKaydirmayiAc() {
   kilitSayaci = Math.max(0, kilitSayaci - 1);
   if (kilitSayaci > 0) return;
   const y = Number(document.body.dataset.kilitliKaydirma || 0);
   document.body.classList.remove('panel-locked');
   document.body.style.top = '';
   window.scrollTo(0, y);
}

function polar(cx, cy, r, angleDeg) {
   const a = (angleDeg * Math.PI) / 180;
   return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/* Cark rakamlari sistem fontundaydi ve arayuzun geri kalaniyla ayni
   goruntugu icin bir odul carkindan cok bir form alani gibi duruyordu.
   Cinzel'i Ejderha Adasi zaten kullaniyor (bkz. games/dragon/dragon.css
   --baslik), yani yeni bir yuk degil ve cark ejderha temasina oturuyor. */
const WHEEL_FONT = "'Cinzel', 'Times New Roman', serif";

/* bot/worker.js'teki SPIN_ENERGY_REWARD ile ayni - cark diliminde yazan
   "3x" bu, yani UC BIRIM enerji. Gercek odul her zaman sunucuda
   belirleniyor; buradaki sayi yalnizca dilimin etiketi. */
const SPIN_ENERGY_REWARD = 3;

function buildWheel(prizes) {
   const svg = document.getElementById('wheel');
   if (!svg || !prizes?.length) return;
   const n = prizes.length;
   const segAngle = 360 / n;
   const cx = 100, cy = 100, r = 94, labelR = r * 0.76;

   /* En buyuk jeton odulu altin dilimi aliyor. Enerji disarida: o kendi
      rengini zaten tasiyor ve miktari (3) jetonlarla kiyaslanamaz. */
   const enBuyuk = Math.max(...prizes.filter((p) => p.tur !== 'enerji').map((p) => p.miktar));
   let tabanSira = 0;

   let html = '';
   prizes.forEach((prize, i) => {
      const start = polar(cx, cy, r, i * segAngle);
      const end = polar(cx, cy, r, (i + 1) * segAngle);
      const mid = i * segAngle + segAngle / 2;
      const label = polar(cx, cy, labelR, mid);
      const isEnergy = prize.tur === 'enerji';
      const color = isEnergy ? WHEEL_ENERJI
                  : (prize.miktar === enBuyuk ? WHEEL_BUYUK
                  : WHEEL_ZEMIN[tabanSira++ % WHEEL_ZEMIN.length]);
      const text = isEnergy ? `${SPIN_ENERGY_REWARD}x` : prize.miktar;

      /* Enerji dilimi ⚡ emojisi tasiyordu - her telefonda baska bir
         cizim, hub'in geri kalanindaki altin pille hicbir ilgisi yok.
         Artik gercek enerji ikonunun kendisi. */
      const simge = isEnergy
         ? `<image href="assets/wheel/energy.webp" x="-5" y="4" width="10" height="16"
                   style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))"/>`
         : `<image href="assets/coin.png" x="-7" y="4" width="14" height="14"
                   style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))"/>`;

      html += `
      <path d="M${cx},${cy} L${start.x.toFixed(2)},${start.y.toFixed(2)}
               A${r},${r} 0 0,1 ${end.x.toFixed(2)},${end.y.toFixed(2)} Z"
            fill="${color}" stroke="${WHEEL_AYIRAC}" stroke-width="1"/>
      <g transform="translate(${label.x.toFixed(2)} ${label.y.toFixed(2)}) rotate(${mid.toFixed(1)})">
        <text text-anchor="middle" dominant-baseline="middle" y="-4" fill="${WHEEL_YAZI}" font-weight="800"
              font-family="${WHEEL_FONT}" font-size="15"
              style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))">${text}</text>${simge}
      </g>`;
   });
   svg.innerHTML = html;
}

function spinToIndex(index, segmentCount) {
   const svg = document.getElementById('wheel');
   if (!svg) return;
   const segAngle = 360 / segmentCount;
   const mid = index * segAngle + segAngle / 2;
   const targetMod = (((360 - mid) % 360) + 360) % 360;
   const current = ((wheelRotation % 360) + 360) % 360;
   let delta = targetMod - current;
   if (delta <= 0) delta += 360;
   wheelRotation += delta + 5 * 360;
   svg.style.transform = `rotate(${wheelRotation}deg)`;
}

function kalanMetin(ms) {
   const sn = Math.max(0, Math.ceil(ms / 1000));
   const saat = Math.floor(sn / 3600), dk = Math.floor((sn % 3600) / 60);
   if (saat > 0) return `${saat}${t('hub.time.h')} ${dk}${t('hub.time.m')}`;
   if (dk > 0) return `${dk}${t('hub.time.m')}`;
   return `${sn % 60}${t('hub.time.s')}`;
}

let sayacTimer = null;
function sayaclariBaslat() {
   clearInterval(sayacTimer);
   sayacTimer = setInterval(() => {
      const hedefler = document.querySelectorAll('[data-bitis]');
      if (!hedefler.length) { clearInterval(sayacTimer); sayacTimer = null; return; }
      hedefler.forEach(async (el) => {
         const kalan = Number(el.dataset.bitis) - Date.now();
         el.textContent = kalan > 0 ? kalanMetin(kalan) : '';
         if (kalan <= 0) {
            delete el.dataset.bitis;
            await refreshDaily();
            renderStreakSection();
            renderSpinSection();
            renderDailyCard();
            renderEnergyCard();
         }
      });
   }, 1000);
}

function pipsHtml(energy, max, small) {
   let html = '';
   for (let i = 0; i < max; i++) html += `<span class="energy-pip${i < energy ? ' is-full' : ''}"></span>`;
   return html;
}

async function renderDailyCard() {
   const card = document.getElementById('daily-card');
   if (!card) return;

   const [energy, streak, spin] = await Promise.all([getEnergy(), getStreak(), getSpin()]);
   if (!energy || !energy.max) { card.hidden = true; return; }

   const durum = await odulDurumu();
   if (durum === 'yerel') { card.hidden = true; return; }
   const kilitli = durum === 'misafir';

   card.hidden = false;

   const hazir = kilitli || streak?.canClaim || spin?.canSpin;
   const ipucu = document.getElementById('daily-card-hint');
   document.getElementById('daily-card-dot').hidden = !hazir;

   if (hazir) {
      ipucu.textContent = t('hub.daily.ready');
      ipucu.className = 'daily-card-hint is-ready';
      delete ipucu.dataset.bitis;
   } else {
      const kalanlar = [];
      if (streak && !streak.canClaim) kalanlar.push(streak.nextInMs || 0);
      if (spin && !spin.canSpin) kalanlar.push(spin.nextInMs || 0);
      const enYakin = kalanlar.length ? Math.min(...kalanlar) : 0;
      ipucu.className = 'daily-card-hint';
      ipucu.innerHTML = `<span class="etiket">${t('hub.daily.nextIn')}</span>` +
                        `<span class="sure geri-sayim" data-bitis="${Date.now() + enYakin}">${kalanMetin(enYakin)}</span>`;
   }
   sayaclariBaslat();
}

async function renderEnergyCard() {
   const card = document.getElementById('energy-card');
   if (!card) return;

   const energy = await getEnergy();
   if (!energy || !energy.max) { card.hidden = true; return; }

   const durum = await odulDurumu();
   if (durum === 'yerel') { card.hidden = true; return; }

   card.hidden = false;
   document.getElementById('energy-card-value').textContent = `${energy.energy}/${energy.max}`;
}

function wireDailyPanel() {
   const card = document.getElementById('daily-card');
   const overlay = document.getElementById('daily-overlay');
   const closeBtn = document.getElementById('daily-close');
   const streakBtn = document.getElementById('streak-claim-btn');
   const spinBtn = document.getElementById('spin-claim-btn');
   const wheelHub = document.getElementById('wheel-hub');
   if (!card || !overlay) return;

   card?.addEventListener('click', openDailyModal);
   closeBtn?.addEventListener('click', closeDailyModal);
   overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDailyModal(); });

   const energyCard = document.getElementById('energy-card');
   const energyOverlay = document.getElementById('energy-overlay');
   const energyCloseBtn = document.getElementById('energy-close');
   energyCard?.addEventListener('click', openEnergyModal);
   energyCloseBtn?.addEventListener('click', closeEnergyModal);
   energyOverlay?.addEventListener('click', (e) => { if (e.target === energyOverlay) closeEnergyModal(); });
   // Reklamla enerji doldurma gecici olarak kapali (Adsgram onayi bekleniyor) -
   // energy-ad-btn hep disabled, tiklama dinleyicisi baglanmiyor.
   document.getElementById('energy-star-btn')?.addEventListener('click', buyEnergyWithStars);

   streakBtn?.addEventListener('click', async () => {
      streakBtn.disabled = true;
      const sonuc = await claimStreak();
      if (sonuc?.ok) {
         haptic.success();
         showDailyToast(t('hub.daily.won', { amount: sonuc.reward }));
         refreshPointsChip();
      }
      await renderStreakSection();
      await renderDailyCard();
      await renderEnergyCard();
      if (!sonuc?.ok) streakBtn.disabled = false;
   });

   spinBtn?.addEventListener('click', async () => {
      spinBtn.disabled = true;
      wheelHub?.classList.add('is-spinning');
      const sonuc = await spinWheel();
      if (sonuc?.ok && dailyPrizes) {
         spinToIndex(sonuc.index, dailyPrizes.length);
         const onWheel = () => {
            document.getElementById('wheel').removeEventListener('transitionend', onWheel);
            wheelHub?.classList.remove('is-spinning');
            haptic.success();
            const kazanilan = sonuc.prize.tur === 'enerji' ? t('hub.daily.wonEnergy') : t('hub.daily.won', { amount: sonuc.prize.miktar });
            showDailyToast(kazanilan);
            refreshPointsChip();
            renderEnergySection();
            renderSpinSection();
            renderDailyCard();
            renderEnergyCard();
         };
         document.getElementById('wheel').addEventListener('transitionend', onWheel);
      } else {
         wheelHub?.classList.remove('is-spinning');
         spinBtn.disabled = false;
      }
   });
}

async function openDailyModal() {
   const overlay = document.getElementById('daily-overlay');
   if (!overlay) return;
   overlay.hidden = false;
   panelKaydirmayiKilitle();
   haptic.tap();
   await Promise.all([renderStreakSection(), renderSpinSection()]);
   sayaclariBaslat();
}

function closeDailyModal() {
   const overlay = document.getElementById('daily-overlay');
   if (overlay) overlay.hidden = true;
   panelKaydirmayiAc();
}

async function openEnergyModal() {
   const overlay = document.getElementById('energy-overlay');
   if (!overlay) return;
   overlay.hidden = false;
   panelKaydirmayiKilitle();
   haptic.tap();
   await renderEnergySection();
   sayaclariBaslat();
}

function closeEnergyModal() {
   const overlay = document.getElementById('energy-overlay');
   if (overlay) overlay.hidden = true;
   panelKaydirmayiAc();
}

async function renderEnergySection() {
   const energy = await getEnergy();
   if (!energy) return;
   document.getElementById('energy-pips-modal').innerHTML = pipsHtml(energy.energy, energy.max);
   const etiket = document.getElementById('energy-label');
   if (energy.energy >= energy.max) {
      etiket.textContent = t('hub.daily.energyFull');
      delete etiket.dataset.bitis;
   } else {
      etiket.textContent = `${energy.energy}/${energy.max}`;
      const ipucu = document.getElementById('energy-next');
      if (ipucu && energy.nextMs > 0) ipucu.dataset.bitis = String(Date.now() + energy.nextMs);
   }

   renderEnergyRefillRow(energy);
}

// Enerji bitince reklam ya da Telegram Stars ile doldurma - ikisi de
// gunde sabit sayida (bkz. worker.js ENERGY_REFILL_DAILY_LIMIT) kullanilabilir,
// sinirsiz enerji olmasin diye. Misafirde (kilitli) ya da sunucu verisi
// gelmediyse satir tamamen gizli kalir.
function renderEnergyRefillRow(energy) {
   const row = document.getElementById('energy-refill-row');
   if (!row) return;
   const refill = energy.refill;
   if (energy.kilitli || !refill) { row.hidden = true; return; }
   row.hidden = false;

   const dolu = energy.energy >= energy.max;

   // Reklamla enerji doldurma gecici olarak kapali (Adsgram onayi bekleniyor) -
   // buton hep devre disi, "Yakinda" yaziyor (bkz. index.html).

   const starBtn = document.getElementById('energy-star-btn');
   const starLabel = document.getElementById('energy-star-label');
   const starSub = document.getElementById('energy-star-sub');
   starBtn.disabled = dolu || refill.starLeft <= 0;
   starLabel.textContent = t('hub.energy.starLabel', { price: refill.starPrice });
   starSub.textContent = refill.starLeft > 0
      ? t('hub.energy.refillSub', { amount: refill.amount, left: refill.starLeft, max: refill.dailyLimit })
      : t('hub.energy.limitReached');
}

async function watchAdForEnergy() {
   const btn = document.getElementById('energy-ad-btn');
   if (!btn || btn.disabled) return;

   if (!window.Adsgram || ADSGRAM_BLOCK_ID.startsWith('REPLACE_')) {
      showDailyToast(t('hub.energy.actionFailed'));
      return;
   }

   btn.disabled = true;
   const oncekiEnerji = (await getEnergy()).energy;
   try {
      const controller = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
      await controller.show();
      haptic.success();
      const sonuc = await adEnergyRefill();
      if (sonuc?.ok) {
         const kazanilan = Math.max(0, sonuc.energy - oncekiEnerji);
         if (kazanilan > 0) showDailyToast(t('hub.energy.refilled', { amount: kazanilan }));
      }
   } catch {
      // reklam yarida birakildi/yuklenemedi - sessizce vazgec
   } finally {
      await renderEnergySection();
      await renderEnergyCard();
   }
}

async function buyEnergyWithStars() {
   const btn = document.getElementById('energy-star-btn');
   if (!btn || btn.disabled) return;

   btn.disabled = true;
   const oncekiEnerji = (await getEnergy()).energy;
   const sonuc = await starEnergyInvoiceLink();
   if (!sonuc?.ok || !sonuc.link) {
      showDailyToast(t('hub.energy.actionFailed'));
      await renderEnergySection();
      return;
   }

   openInvoice(sonuc.link, async (status) => {
      if (status === 'paid') {
         haptic.success();
         await refreshDaily();
         const kazanilan = Math.max(0, (await getEnergy()).energy - oncekiEnerji);
         if (kazanilan > 0) showDailyToast(t('hub.energy.refilled', { amount: kazanilan }));
      }
      await renderEnergySection();
      await renderEnergyCard();
   });
}

async function renderStreakSection() {
   const streak = await getStreak();
   const row = document.getElementById('streak-row');
   const btn = document.getElementById('streak-claim-btn');
   if (!streak || !row || !btn) return;

   const rewards = streak.rewards || [100, 150, 200, 300, 400, 500, 1000];
   const kilitli = (await odulDurumu()) === 'misafir';
   const gecerliSayim = streak.broken ? 0 : streak.count;

   row.innerHTML = rewards.map((odul, i) => {
      const gun = i + 1;
      let durum = 'is-future';
      if (gun <= gecerliSayim) durum = 'is-done';
      else if (gun === streak.nextDay) durum = streak.canClaim ? 'is-current' : 'is-future';
      const jackpot = gun === 7 ? ' is-jackpot' : '';
      return `
      <div class="streak-pill ${durum}${jackpot}">
        <span class="day">${gun}</span>
        <span class="amt"><img class="amt-coin" src="assets/coin.png" alt="">${odul}</span>
      </div>`;
   }).join('');

   if (kilitli) {
      btn.textContent = t('hub.daily.loginToClaim');
      btn.disabled = true;
      btn.classList.add('is-locked');
   } else if (streak.canClaim) {
      btn.innerHTML = `${t('hub.daily.claim')} · +${streak.nextReward}`;
      btn.disabled = false;
      btn.classList.remove('is-locked');
   } else {
      const kalan = streak.nextInMs || 0;
      const zamanHtml = `<span class="geri-sayim" data-bitis="${Date.now() + kalan}">${kalanMetin(kalan)}</span>`;
      btn.innerHTML = t('hub.daily.comeIn', { time: zamanHtml });
      btn.disabled = true;
      btn.classList.remove('is-locked');
   }
}

async function renderSpinSection() {
   const spin = await getSpin();
   const btn = document.getElementById('spin-claim-btn');
   if (!spin || !btn) return;

   if (!dailyPrizes) {
      dailyPrizes = spin.prizes;
      buildWheel(dailyPrizes);
   }

   const kilitli = (await odulDurumu()) === 'misafir';
   if (kilitli) {
      btn.textContent = t('hub.daily.loginToClaim');
      btn.disabled = true;
      btn.classList.add('is-locked');
   } else if (spin.canSpin) {
      btn.textContent = t('hub.daily.spinBtn');
      btn.disabled = false;
      btn.classList.remove('is-locked');
   } else {
      const kalan = spin.nextInMs || 0;
      const zamanHtml = `<span class="geri-sayim" data-bitis="${Date.now() + kalan}">${kalanMetin(kalan)}</span>`;
      btn.innerHTML = t('hub.daily.comeIn', { time: zamanHtml });
      btn.disabled = true;
      btn.classList.remove('is-locked');
   }
}

function showDailyToast(text) {
   const toast = document.getElementById('daily-toast');
   if (!toast) return;
   toast.innerHTML = mhHtml(text);
   toast.hidden = false;
   const yeni = toast.cloneNode(true);
   toast.parentNode.replaceChild(yeni, toast);
   setTimeout(() => { yeni.hidden = true; }, 2600);
}

async function renderLiderCard() {
   const card = document.getElementById('lider-card');
   if (!card) return;

   if ((await odulDurumu()) !== 'sunucu') { card.hidden = true; return; }

   const veri = await liderTablosu();
   if (!veri) { card.hidden = true; return; }

   card.hidden = false;
   document.getElementById('lider-sira').innerHTML = veri.kendi ? `#${veri.kendi.sira}` : '<span class="rank-dash"></span>';
}

function wireLiderPanel() {
   const card = document.getElementById('lider-card');
   const overlay = document.getElementById('lider-overlay');
   if (!card || !overlay) return;
   card.addEventListener('click', acLiderPanel);
   document.getElementById('lider-close')?.addEventListener('click', closeLiderPanel);
   overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLiderPanel(); });
}

function closeLiderPanel() {
   const overlay = document.getElementById('lider-overlay');
   if (overlay) overlay.hidden = true;
   panelKaydirmayiAc();
}

async function acLiderPanel() {
   const overlay = document.getElementById('lider-overlay');
   overlay.hidden = false;
   panelKaydirmayiKilitle();
   haptic.tap();

   const veri = await liderTablosu();
   const liste = document.getElementById('lider-liste');
   liste.textContent = '';
   if (!veri) return;

   for (const s of veri.liste) {
      const satir = document.createElement('div');
      satir.className = 'lider-satir' + (s.ben ? ' benim' : '') +
         (s.sira <= 3 ? ` tepe tepe-${s.sira}` : '');

      const sira = document.createElement('span');
      sira.className = 'lider-no';
      sira.textContent = s.sira;

      const ad = document.createElement('span');
      ad.className = 'lider-ad';
      ad.textContent = s.ad || t('hub.player');

      const puan = document.createElement('span');
      puan.className = 'lider-puan';
      puan.innerHTML = mhHtml(`${s.kazanilan.toLocaleString(locale())} $MH`);

      satir.append(sira, ad, puan);
      liste.appendChild(satir);
   }

   const kendi = document.getElementById('lider-kendi');
   if (veri.kendi && !veri.liste.some((x) => x.ben)) {
      kendi.hidden = false;
      kendi.textContent = '';
      const satir = document.createElement('div');
      satir.className = 'lider-satir benim';
      const a = document.createElement('span'); a.className = 'lider-no'; a.textContent = veri.kendi.sira;
      const b = document.createElement('span'); b.className = 'lider-ad'; b.textContent = t('hub.rank.you');
      const c = document.createElement('span'); c.className = 'lider-puan';
      c.innerHTML = mhHtml(`${veri.kendi.kazanilan.toLocaleString(locale())} $MH`);
      satir.append(a, b, c);
      kendi.appendChild(satir);
   } else {
      kendi.hidden = true;
   }
}

function davetLinki() {
   const id = getUser().id;
   return `https://t.me/${BOT_USERNAME}?start=r${id}`;
}

function davetGonder() {
   const url = 'https://t.me/share/url?url=' + encodeURIComponent(davetLinki()) +
      '&text=' + encodeURIComponent(t('hub.friends.shareText'));
   openShareLink(url);
   haptic.tap();
}

async function renderFriendsCard() {
   const card = document.getElementById('friends-card');
   if (!card) return;

   if ((await odulDurumu()) !== 'sunucu') { card.hidden = true; return; }

   const veri = await referralOzeti();
   if (!veri) { card.hidden = true; return; }

   card.hidden = false;
   document.getElementById('friends-earned').textContent = veri.toplamKazanc.toLocaleString(locale());
   document.getElementById('friends-hint').innerHTML =
      mhHtml(t('hub.friends.cut', { n: oranYazi(REFERRAL_RATE_DIRECT) }));
}

function wireFriendsPanel() {
   const card = document.getElementById('friends-card');
   const overlay = document.getElementById('friends-overlay');
   if (!card || !overlay) return;
   card.addEventListener('click', acFriendsPanel);
   document.getElementById('friends-close')?.addEventListener('click', closeFriendsPanel);
   overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFriendsPanel(); });
   document.getElementById('friends-invite-btn')?.addEventListener('click', davetGonder);
}

function closeFriendsPanel() {
   const overlay = document.getElementById('friends-overlay');
   if (overlay) overlay.hidden = true;
   panelKaydirmayiAc();
}

async function acFriendsPanel() {
   const overlay = document.getElementById('friends-overlay');
   overlay.hidden = false;
   panelKaydirmayiKilitle();
   haptic.tap();

   const veri = await referralOzeti();
   const liste = document.getElementById('friends-liste');
   const bos = document.getElementById('friends-empty');
   liste.textContent = '';
   if (!veri) return;

   bos.hidden = veri.arkadaslar.length > 0;

   for (const a of veri.arkadaslar) {
      const satir = document.createElement('div');
      satir.className = 'lider-satir';

      const ad = document.createElement('span');
      ad.className = 'lider-ad';
      ad.textContent = a.ad || t('hub.player');

      /* Eskiden arkadasin ejderha seviyesi yaziyordu. Odul artik
         seviyeden gelmedigi icin o sayinin oyuncuya soyledigi bir sey
         kalmamisti; yerine o arkadasin sana KAZANDIRDIGI $MH var. */
      const kazanc = document.createElement('span');
      kazanc.className = 'lider-puan';
      kazanc.textContent = a.kazandirdi > 0
         ? `+${a.kazandirdi.toLocaleString(locale())}`
         : '-';

      satir.append(ad, kazanc);
      liste.appendChild(satir);
   }
}

/* Eskiden burada bir seviye merdiveni ciziliyordu (Sv.5 +750, Sv.15
   +1500 ...). Odul artik seviyeye degil arkadasin KAZANCINA bagli, o
   yuzden merdivenin yerinde iki satir var: dogrudan davet ettiklerin ve
   onlarin davet ettikleri. */
function renderReferralLadder() {
   const ladder = document.getElementById('referral-ladder');
   if (!ladder) return;
   ladder.textContent = '';

   const satir = (etiket, deger, sinif) => {
      const pill = document.createElement('div');
      pill.className = `referral-pill ${sinif}`;
      pill.innerHTML = `<span class="lv"></span><span class="amt"></span>`;
      pill.querySelector('.lv').textContent = etiket;
      pill.querySelector('.amt').textContent = deger;
      ladder.appendChild(pill);
   };

   satir(t('hub.friends.signupLabel'), `+${REFERRAL_SIGNUP_BONUS.toLocaleString(locale())}`, 'is-signup');
   satir(t('hub.friends.tier1'), oranYazi(REFERRAL_RATE_DIRECT), '');
   satir(t('hub.friends.tier2'), oranYazi(REFERRAL_RATE_INDIRECT), 'is-top');
}
