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

function gameList() {
   return [
      {
         id: '2048',
         title: t('game.2048.title'),
         desc: t('game.2048.desc'),
         icon: '🧮',
         gradient: 'linear-gradient(140deg, #f2b179, #ed6b4a)',
         accent: '#f2884b',
         url: 'games/2048/index.html',
         ready: true,
      },
      {
         id: 'blockblast',
         title: t('game.blockblast.title'),
         desc: t('game.blockblast.desc'),
         icon: '🧱',
         url: 'games/blockblast/index.html',
         gradient: 'linear-gradient(140deg, #7f9bff, #5b6bff)',
         accent: '#5b8cff',
         ready: true,
      },
      {
         id: 'watersort',
         title: t('game.watersort.title'),
         desc: t('game.watersort.desc'),
         icon: '💧',
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
         icon: '🍬',
         url: 'games/match3/index.html',
         gradient: 'linear-gradient(140deg, #e2679c, #c0507f)',
         accent: '#e2679c',
         ready: true,
      },
      {
         id: 'tripletile',
         title: t('game.tripletile.title'),
         desc: t('game.tripletile.desc'),
         icon: '🀄',
         url: 'games/tripletile/index.html',
         gradient: 'linear-gradient(140deg, #f5b942, #f2884b)',
         accent: '#f5b942',
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
