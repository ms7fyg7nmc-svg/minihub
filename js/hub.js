/* Hub (ana menu) ekraninin mantigi.
   Yeni oyun eklemek istedigimizde sadece asagidaki GAMES listesine satir ekliyoruz. */

import { initTelegram, getUser, haptic, hideBackButton } from './tg.js';
import { getPoints, getBest } from './store.js';

const GAMES = [
  {
    id: '2048',
    title: '2048',
    desc: 'Kaydır, birleştir, 2048’e ulaş',
    icon: '2048',
    url: 'games/2048/index.html',
    ready: true,
  },
  {
    id: 'match3',
    title: 'Şeker Eşleştir',
    desc: 'Yakında',
    icon: '★',
    ready: false,
  },
  {
    id: 'runner',
    title: 'Sonsuz Koşu',
    desc: 'Yakında',
    icon: '▶',
    ready: false,
  },
];

initTelegram();
hideBackButton();
renderProfile();
renderGames();

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
    document.getElementById('points').textContent = points.toLocaleString('tr-TR');
  });
}

function renderGames() {
  const container = document.getElementById('games');

  for (const game of GAMES) {
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

    const badge = card.querySelector('.badge');
    if (game.ready) {
      badge.textContent = 'Oyna';
      getBest(game.id).then((best) => {
        if (best > 0) {
          badge.textContent = `Rekor ${best.toLocaleString('tr-TR')}`;
          badge.classList.add('record');
        }
      });
      card.addEventListener('click', () => {
        haptic.tap();
        window.location.href = game.url;
      });
    } else {
      badge.textContent = 'Yakında';
    }

    container.appendChild(card);
  }
}
