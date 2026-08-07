/* Hub (ana menu) ekraninin mantigi.
Yeni oyun eklemek istedigimizde sadece asagidaki gameList() fonksiyonuna satir ekliyoruz. */

import { initTelegram, getUser, haptic, hideBackButton, isTelegramUser } from './tg.js';
import { getPoints, getBest } from './store.js';
import { initLang, t, locale, applyTranslations, renderLangSwitcher } from './i18n.js';

/* Botun Telegram adresi. Kendi botunun adini yazarsan tarayicida acan
   kullanicilar uyariya dokununca dogrudan bota gider. Bos birakilirsa
   uyari yine gorunur, sadece tiklanabilir olmaz.
   Ornek: 'https://t.me/oyunhub_bot' */
const BOT_LINK = '';

/* Kart ikonlari.

   Emoji yerine kendi cizdigimiz SVG'ler kullaniyoruz: emoji her telefonda
   farkli gorunuyor (Apple, Android ve masaustu ayni sekli bambaska ciziyor)
   ve renk paletimizle uyusmuyordu. Bu ikonlar oyunun mekanigini gosteriyor -
   2048'de tas izgarasi, Blok Bulmaca'da bir parca, Su Siralama'da tupler.

   Hepsi ayni dilde: 24x24 kutu, beyaz sekiller, arkadaki renk gecisi
   uzerinde farkli saydamliklarla derinlik. */
const ICONS = {
   /* Tas izgarasi; bir tas parlak, otekiler soluk (birlesme hissi) */
   '2048': `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".5"/>
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".32"/>
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".32"/>
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff"/>
   </svg>`,

   /* L seklinde bir blok parcasi */
   blockblast: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
   </svg>`,

   /* Iki tup, farkli seviyelerde sivi. Tup govdesi biraz belirgin tutuldu,
      yoksa kucukken sadece iki beyaz leke gibi duruyor. */
   watersort: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="2.5" width="7" height="19" rx="3.5" fill="#fff" opacity=".38"/>
      <rect x="3.5" y="9.5" width="7" height="12" rx="3.5" fill="#fff"/>
      <rect x="13.5" y="2.5" width="7" height="19" rx="3.5" fill="#fff" opacity=".38"/>
      <rect x="13.5" y="15" width="7" height="6.5" rx="3.25" fill="#fff"/>
   </svg>`,

   /* Yan yana eslesmis uc seker. Once ustte/altta soluk komsular da vardi
      ama 30 pikselde hepsi birbirine girip dagilmis bir nokta obegi gibi
      goruyordu - sadece siranin kendisi kaldi. */
   match3: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="4.6" cy="12" r="3.5" fill="#fff"/>
      <circle cx="12" cy="12" r="3.5" fill="#fff"/>
      <circle cx="19.4" cy="12" r="3.5" fill="#fff"/>
   </svg>`,

   /* Ust uste binmis uc tas (capraz basamak). Kutunun tam ortasinda
      dursun diye 3..21 / 4..19 araligina yerlestirildi. */
   tripletile: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="10" width="9" height="9" rx="2.5" fill="#fff" opacity=".45"/>
      <rect x="7.5" y="7" width="9" height="9" rx="2.5" fill="#fff" opacity=".7"/>
      <rect x="12" y="4" width="9" height="9" rx="2.5" fill="#fff"/>
   </svg>`,

   /* Iki nokta ve aralarindaki yol */
   flow: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6.5v5a3.5 3.5 0 0 0 3.5 3.5H18" fill="none" stroke="#fff"
            stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
      <circle cx="6" cy="6.5" r="3.2" fill="#fff"/>
      <circle cx="18" cy="15" r="3.2" fill="#fff"/>
   </svg>`,

   /* Izgaranin ortasinda bir mayin */
   minesweeper: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="#fff"
            stroke-width="1.5" opacity=".4"/>
      <path d="M9 2.5v19M15 2.5v19M2.5 9h19M2.5 15h19" stroke="#fff"
            stroke-width="1.1" opacity=".26"/>
      <circle cx="12" cy="12" r="3.1" fill="#fff"/>
      <path d="M12 6.2V4.4M12 17.8v1.8M6.2 12H4.4M17.8 12h1.8" stroke="#fff"
            stroke-width="1.7" stroke-linecap="round"/>
   </svg>`,
};

function gameList() {
   return [
      {
         id: '2048',
         title: t('game.2048.title'),
         desc: t('game.2048.desc'),
         icon: ICONS['2048'],
         gradient: 'linear-gradient(140deg, #f2b179, #ed6b4a)',
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
         gradient: 'linear-gradient(140deg, #7f9bff, #5b6bff)',
         accent: '#5b8cff',
         ready: true,
      },
      {
         id: 'watersort',
         title: t('game.watersort.title'),
         desc: t('game.watersort.desc'),
         icon: ICONS.watersort,
         url: 'games/watersort/index.html',
         gradient: 'linear-gradient(140deg, #4ecb8b, #2fa9a0)',
         accent: '#4ecb8b',
         /* Burada rekor bir skor degil, ulasilan bolum numarasi */
         bestKey: 'hub.level',
         ready: true,
      },
      {
         id: 'match3',
         title: t('game.match3.title'),
         desc: t('game.match3.desc'),
         icon: ICONS.match3,
         url: 'games/match3/index.html',
         gradient: 'linear-gradient(140deg, #e2679c, #c0507f)',
         accent: '#e2679c',
         ready: true,
      },
      {
         id: 'tripletile',
         title: t('game.tripletile.title'),
         desc: t('game.tripletile.desc'),
         icon: ICONS.tripletile,
         url: 'games/tripletile/index.html',
         gradient: 'linear-gradient(140deg, #f5b942, #f2884b)',
         accent: '#f5b942',
         ready: true,
      },
      {
         id: 'flow',
         title: t('game.flow.title'),
         desc: t('game.flow.desc'),
         icon: ICONS.flow,
         url: 'games/flow/index.html',
         gradient: 'linear-gradient(140deg, #3fc7d4, #2f8fa8)',
         accent: '#3fc7d4',
         /* Burada rekor bir skor degil, ulasilan bolum numarasi */
         bestKey: 'hub.level',
         ready: true,
      },
      {
         id: 'minesweeper',
         title: t('game.minesweeper.title'),
         desc: t('game.minesweeper.desc'),
         icon: ICONS.minesweeper,
         url: 'games/minesweeper/index.html',
         /* Gri denenmisti ama renkli kartlarin yaninda pasif gorunuyordu;
            mayin temasina da uyan sicak bir kirmizi kullaniyoruz */
         gradient: 'linear-gradient(140deg, #e2685e, #a83a33)',
         accent: '#e2685e',
         /* Burada rekor bir skor degil, ulasilan bolum numarasi */
         bestKey: 'hub.level',
         ready: true,
      },
   ];
}

initTelegram();
hideBackButton();

await initLang();
applyTranslations();
renderLangSwitcher(document.getElementById('lang-switcher'));

renderProfile();
renderGames();
renderTelegramNotice();

document.addEventListener('langchange', () => {
   applyTranslations();
   renderProfile();
   renderGames();
});

/* Sayfa Telegram disinda acildiysa puanlarin kaybolabilecegini hatirlatir */
function renderTelegramNotice() {
   const notice = document.getElementById('tg-notice');
   if (!notice || isTelegramUser()) return;

   notice.hidden = false;
   if (BOT_LINK) {
      notice.href = BOT_LINK;
      notice.target = '_blank';
      notice.rel = 'noopener';
   } else {
      notice.classList.add('is-static'); /* gidilecek adres yok, ok isareti gizlensin */
   }
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

getPoints().then((points) => {
   document.getElementById('points').textContent = points.toLocaleString(locale());
});
}

function renderGames() {
   const container = document.getElementById('games');
   container.textContent = '';

gameList().forEach((game, index) => {
   const card = document.createElement('button');
   card.className = 'game-card';
   card.disabled = !game.ready;
   card.style.setProperty('--i', index); /* kartlar sirayla belirsin */

   card.innerHTML = `
   <div class="game-icon${game.ready ? '' : ' soon'}">${game.icon}</div>
   <div class="game-info">
   <h3></h3>
   <p></p>
   </div>
   <div class="badge"></div>
   `;
   card.querySelector('h3').textContent = game.title;
   card.querySelector('p').textContent = game.desc;

   /* Yeni oyunlarin kart ikonuna renk gecisi ver */
   if (game.gradient) {
      card.querySelector('.game-icon').style.background = game.gradient;
   }

   /* Kartin sol kenarindaki ince renk seridi */
   if (game.accent) card.style.setProperty('--card-accent', game.accent);

   const badge = card.querySelector('.badge');
   if (game.ready) {
      badge.textContent = t('hub.play');
      getBest(game.id).then((best) => {
         if (best > 0) {
            badge.textContent = t(game.bestKey ?? 'hub.record', { best: best.toLocaleString(locale()) });
            badge.classList.add('record');
         }
      });
      card.addEventListener('click', () => {
         haptic.tap();
         window.location.href = game.url;
      });
   } else {
      badge.textContent = t('hub.soon');
   }

   container.appendChild(card);
});
}
