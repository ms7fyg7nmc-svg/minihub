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

   /* Ejderha: acik kanatlar, kose hatli bas ve geriye supurulmus boynuzlar.
      Oyundaki cizimin kucuk hali - kartla oyun ekrani birbirini tutsun. */
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

   /* Kivrilan bir yilan govdesi ve onundeki yem */
   snake: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17h6a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h5" fill="none" stroke="#fff"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="19" cy="3.5" r="2.6" fill="#fff" opacity=".55"/>
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
         id: 'pet',
         title: t('game.pet.title'),
         desc: t('game.pet.desc'),
         icon: ICONS.pet,
         url: 'games/pet/index.html',
         gradient: 'linear-gradient(140deg, #b083ec, #7b4fd0)',
         accent: '#a978e8',
         /* Rekor yok: bu oyun skor tutmuyor, kazanilan jetonu harciyor */
         noBest: true,
         ready: true,
      },
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
         id: 'snake',
         title: t('game.snake.title'),
         desc: t('game.snake.desc'),
         icon: ICONS.snake,
         url: 'games/snake/index.html',
         gradient: 'linear-gradient(140deg, #6ee7a8, #2fa06a)',
         accent: '#4ecb8b',
         ready: true,
      },
      /* Mayin Tarlasi menuden cikarildi.

         Sebep oyunun bozuk olmasi degil - calisiyor ve tahtalari tahmin
         gerektirmiyor. Sorun hub'a uymamasi: kurallarini onceden bilmeyi
         gerektiriyor, oysa buradaki oyunlar "ac ve oyna" olmali. Sadelestirip
         anlatim da ekledik ama sahibi de test eden arkadaslari da anlamadi;
         bu noktada sorun anlatim degil, oyunun kendisi.

         Dosyalar duruyor (games/minesweeper/). Geri istenirse asagidaki
         kaydi yorumdan cikarmak yeterli:

         {
            id: 'minesweeper',
            title: t('game.minesweeper.title'),
            desc: t('game.minesweeper.desc'),
            icon: ICONS.minesweeper,
            url: 'games/minesweeper/index.html',
            gradient: 'linear-gradient(140deg, #e2685e, #a83a33)',
            accent: '#e2685e',
            bestKey: 'hub.level',
            ready: true,
         },
      */
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
      /* noBest: skor tutmayan oyunlar (ornek: Ordegim) rozette rekor gostermez */
      if (!game.noBest) {
         getBest(game.id).then((best) => {
            if (best > 0) {
               badge.textContent = t(game.bestKey ?? 'hub.record', { best: best.toLocaleString(locale()) });
               badge.classList.add('record');
            }
         });
      }
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
