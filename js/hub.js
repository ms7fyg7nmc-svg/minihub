/* Hub (ana menu) ekraninin mantigi.
Yeni oyun eklemek istedigimizde sadece asagidaki gameList() fonksiyonuna satir ekliyoruz. */

import { initTelegram, getUser, haptic, hideBackButton, markHubEntry } from './tg.js';
import { getPoints, getBest } from './store.js';
import { initLang, t, locale, applyTranslations, renderLangSwitcher } from './i18n.js';

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
         id: 'runner',
         title: t('game.runner.title'),
         desc: t('game.runner.desc'),
         icon: '🏃',
         ready: false,
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

document.addEventListener('langchange', () => {
   applyTranslations();
   renderProfile();
   renderGames();
});

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

for (const game of gameList()) {
   const card = document.createElement('button');
   card.className = 'game-card';
   card.disabled = !game.ready;

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
         markHubEntry();
         window.location.href = game.url;
      });
   } else {
      badge.textContent = t('hub.soon');
   }

   container.appendChild(card);
}
}
