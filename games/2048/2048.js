/* 2048 oyununun mantigi.

Tahta 16 kutudan olusur (4x4). Her kutuda ya bir tas vardir ya da bostur.
Bir yone kaydirinca tum taslar o yone gider, ayni sayilar birlesir,
sonra bos bir kutuya yeni bir tas dogar. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v27';
import { submitScore, getBest, addPoints, saveState, loadState, clearState } from '../../js/store.js?v27';
import { initLang, t, locale, applyTranslations } from '../../js/i18n.js?v27';

const SIZE = 4;
const GAME_ID = '2048';
/* EKONOMI DENGESI

   Butun oyunlar dakikada yaklasik AYNI jetonu vermeli - yoksa oyuncu en
   verimli oyunu bulup sadece onu oynuyor, digerleri olu yatiriyor.

   Olculen durum (kod uzerinden modellendi): en dusuk 8 jeton/dk (Mayin
   Tarlasi), en yuksek 136 jeton/dk (2048) - arada 17 KAT fark vardi.
   Asagidaki sabit, hedef olan ~60 jeton/dk'ya gore secildi.

   Model her oyunun kendi puanlama mekanigi + makul bir oturum suresi
   varsayimina dayaniyor; gercek oyuncu verisi geldiginde bu sayilar
   yeniden ayarlanmali. */
const POINTS_DIVISOR = 23; /* ~7.500 skorluk 5,5 dk oyun -> ~325 jeton */

const VECTORS = {
   up: { dr: -1, dc: 0 },
   down: { dr: 1, dc: 0 },
   left: { dr: 0, dc: -1 },
   right: { dr: 0, dc: 1 },
};

const boardEl = document.getElementById('board');
const cellsEl = document.getElementById('cells');
const tilesEl = document.getElementById('tiles');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let cells = []; /* 16 elemanli dizi: tas nesnesi veya null */
let score = 0;
let best = 0;
let nextId = 1;
let won = false; /* 2048'e ulasildi mi */
let wonShown = false; /* kutlama ekrani gosterildi mi (bir kez gosterilir) */
let over = false; /* oyun bitti mi */
let gapPx = 0; /* kutular arasi bosluk, layout() hesaplar */
let cellPx = 0; /* bir kutunun kenar uzunlugu */

/* ---------- Baslangic ---------- */

await initLang();
applyTranslations();

initTelegram();
showBackButton(goHome);
backToHubOnResume();
document.getElementById('back-link').addEventListener('click', (e) => {
   e.preventDefault();
   goHome();
});
document.getElementById('new-game').addEventListener('click', () => {
   haptic.tap();
   startNewGame();
});

layout();
window.addEventListener('resize', () => {
   layout();
   render(false);
});

drawCells();
bootstrap();

async function bootstrap() {
   best = await getBest(GAME_ID);
   bestEl.textContent = best.toLocaleString(locale());

const saved = await loadState(GAME_ID);
   if (saved && Array.isArray(saved.cells) && saved.cells.length === SIZE * SIZE) {
      restore(saved);
   } else {
      startNewGame();
   }
}

function goHome() {
   window.location.href = '../../index.html';
}

/* ---------- Oyun kurulumu ---------- */

function startNewGame() {
   cells = new Array(SIZE * SIZE).fill(null);
   score = 0;
   won = false;
   wonShown = false;
   over = false;
   nextId = 1;
   clearState(GAME_ID);
   hideOverlay();
   addRandomTile();
   addRandomTile();
   updateScore();
   render(false);
}

function restore(saved) {
   cells = new Array(SIZE * SIZE).fill(null);
   saved.cells.forEach((value, i) => {
      if (value) cells[i] = makeTile(Math.floor(i / SIZE), i % SIZE, value);
   });
   score = Number(saved.score) || 0;
   won = !!saved.won;
   wonShown = won; /* daha once kutlandiysa tekrar gosterme */
over = false;
   updateScore();
   render(false);
   if (isGameOver()) endGame();
}

function persist() {
   saveState(GAME_ID, {
      cells: cells.map((t) => (t ? t.value : 0)),
      score,
      won,
   });
}

/* ---------- Taslar ---------- */

function makeTile(r, c, value) {
   return { id: nextId++, r, c, value, prevR: r, prevC: c, isNew: false, mergedFrom: null };
}

function at(r, c) {
   return cells[r * SIZE + c];
}

function put(r, c, tile) {
   cells[r * SIZE + c] = tile;
}

function emptyPositions() {
   const list = [];
   for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) list.push({ r: Math.floor(i / SIZE), c: i % SIZE });
   }
   return list;
}

function addRandomTile() {
   const empty = emptyPositions();
   if (!empty.length) return;
   const spot = empty[Math.floor(Math.random() * empty.length)];
   const tile = makeTile(spot.r, spot.c, Math.random() < 0.9 ? 2 : 4);
   tile.isNew = true;
   put(spot.r, spot.c, tile);
}

/* ---------- Hamle ---------- */

function move(direction) {
   /* Oyun bittiyse ya da bir bilgi ekrani acikken hamle kabul etmeyiz */
   if (over || overlayVisible()) return;

const vec = VECTORS[direction];
   let moved = false;
   let gained = 0;

/* Hamleden once herkesin eski yerini not al */
for (const tile of cells) {
   if (tile) {
      tile.prevR = tile.r;
      tile.prevC = tile.c;
      tile.isNew = false;
      tile.mergedFrom = null;
   }
}

/* Gidilecek yonun tersinden basla, yoksa taslar birbirini ezer */
const rows = vec.dr > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3];
   const cols = vec.dc > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3];

for (const r of rows) {
   for (const c of cols) {
      const tile = at(r, c);
      if (!tile) continue;

   const { farthest, next } = findTarget(r, c, vec);
      const neighbour = next ? at(next.r, next.c) : null;

   if (neighbour && neighbour.value === tile.value && !neighbour.mergedFrom) {
      /* Birlesme: iki tastan yeni bir tas dogar */
      const merged = makeTile(next.r, next.c, tile.value * 2);
      merged.mergedFrom = [tile, neighbour];
      put(next.r, next.c, merged);
      put(r, c, null);
      tile.r = next.r;
      tile.c = next.c;

      score += merged.value;
      gained += merged.value;
      if (merged.value === 2048 && !won) won = true;
      moved = true;
   } else if (farthest.r !== r || farthest.c !== c) {
      /* Sadece kayma */
      put(r, c, null);
      put(farthest.r, farthest.c, tile);
      tile.r = farthest.r;
      tile.c = farthest.c;
      moved = true;
   }
   }
}

if (!moved) return;

addRandomTile();
   updateScore();
   render(true);
   persist();

if (gained > 0) haptic.tap('light');

if (won && !wonShown) {
   wonShown = true;
   haptic.success();
   showOverlay('2048!', t('g2048.wonText'), t('g2048.continue'), hideOverlay);
} else if (isGameOver()) {
   endGame();
}
}

/* Bir tasin gidebilecegi en uzak bos kutuyu ve onun arkasindaki kutuyu bulur */
function findTarget(r, c, vec) {
   let cr = r;
   let cc = c;
   let nr = r + vec.dr;
   let nc = c + vec.dc;

while (inside(nr, nc) && !at(nr, nc)) {
   cr = nr;
   cc = nc;
   nr += vec.dr;
   nc += vec.dc;
}

return {
   farthest: { r: cr, c: cc },
   next: inside(nr, nc) ? { r: nr, c: nc } : null,
};
}

function inside(r, c) {
   return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function isGameOver() {
   if (emptyPositions().length) return false;
   for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
         const v = at(r, c).value;
         if ((c < SIZE - 1 && at(r, c + 1).value === v) || (r < SIZE - 1 && at(r + 1, c).value === v)) {
            return false;
         }
      }
   }
   return true;
}

async function endGame() {
   if (over) return;
   over = true;
   clearState(GAME_ID);
   haptic.error();

const result = await submitScore(GAME_ID, score);
   best = result.best;
   bestEl.textContent = best.toLocaleString(locale());

const earned = Math.floor(score / POINTS_DIVISOR);
   if (earned > 0) await addPoints(earned);

const lines = [t('g2048.yourScore', { score: score.toLocaleString(locale()) })];
   if (result.isRecord) lines.push(t('g2048.newRecord'));
   if (earned > 0) lines.push(t('g2048.pointsEarned', { earned: earned.toLocaleString(locale()) }));

showOverlay(t('g2048.gameOver'), lines.join(' · '), t('g2048.playAgain'), startNewGame);
}

/* ---------- Ekrana cizme ---------- */

/* Kutu boyutlarini tahtanin genisligine gore hesaplar */
function layout() {
   const width = boardEl.clientWidth;
   gapPx = Math.round(width * 0.028);
   cellPx = (width - gapPx * (SIZE + 1)) / SIZE;
   boardEl.style.setProperty('--gap', `${gapPx}px`);
   boardEl.style.setProperty('--cell', `${cellPx}px`);
}

function offset(index) {
   return gapPx + index * (cellPx + gapPx);
}

function drawCells() {
   cellsEl.textContent = '';
   for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
         const el = document.createElement('div');
         el.className = 'cell';
         setPosition(el, r, c);
         cellsEl.appendChild(el);
      }
   }
}

function setPosition(el, r, c) {
   const value = `translate(${offset(c)}px, ${offset(r)}px)`;
   el.style.setProperty('--pos', value);
   el.style.transform = value;
}

/* animate = true ise taslar eski yerlerinden yenisine kayarak gider */
function render(animate) {
   tilesEl.textContent = '';

/* Once bos kutulari da yeniden konumlandir (ekran boyutu degismis olabilir) */
[...cellsEl.children].forEach((el, i) => setPosition(el, Math.floor(i / SIZE), i % SIZE));

const pending = [];

for (const tile of cells) {
   if (!tile) continue;

   if (tile.mergedFrom && animate) {
      /* Birlesen iki tas once hedefe kayar, uzerine yeni tas "pat" diye biner */
   for (const source of tile.mergedFrom) {
      pending.push(drawTile(source, { r: source.prevR, c: source.prevC }, tile));
   }
      pending.push(drawTile(tile, tile, tile, 'merged'));
   } else if (animate) {
      pending.push(drawTile(tile, { r: tile.prevR, c: tile.prevC }, tile, tile.isNew ? 'new' : ''));
   } else {
      pending.push(drawTile(tile, tile, tile));
   }
}

/* Bir kare bekleyip hedef konuma gec: tarayici aradaki yolu kendisi canlandirir */
const moving = pending.filter((p) => p.el.dataset.moves === '1');
   if (moving.length) {
      requestAnimationFrame(() => {
         requestAnimationFrame(() => {
            for (const { el, target } of moving) setPosition(el, target.r, target.c);
         });
      });
   }
}

/* from: baslangic kutusu, target: varilacak kutu (ikisi ayniysa animasyon olmaz) */
function drawTile(tile, from, target, cls = '') {
   const el = document.createElement('div');
   el.className = `tile${cls ? ' ' + cls : ''}`;
   el.dataset.v = tile.value;
   if (tile.value > 2048) el.classList.add('big');
   el.textContent = tile.value;

setPosition(el, from.r, from.c);
   if (from.r !== target.r || from.c !== target.c) el.dataset.moves = '1';
   tilesEl.appendChild(el);

return { el, target: { r: target.r, c: target.c } };
}

function updateScore() {
   scoreEl.textContent = score.toLocaleString(locale());
   if (score > best) {
      best = score;
      bestEl.textContent = best.toLocaleString(locale());
   }
}

/* ---------- Bitis ekrani ---------- */

function overlayVisible() {
   return !overlayEl.hidden;
}

function showOverlay(title, text, buttonLabel, action) {
   overlayTitle.textContent = title;
   overlayText.textContent = text;
   overlayBtn.textContent = buttonLabel;
   overlayBtn.onclick = () => {
      haptic.tap();
      action();
   };
   overlayEl.hidden = false;
}

function hideOverlay() {
   overlayEl.hidden = true;
}

/* ---------- Kontroller ---------- */

const KEYS = {
   ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
   w: 'up', s: 'down', a: 'left', d: 'right',
};

window.addEventListener('keydown', (e) => {
   const dir = KEYS[e.key];
   if (!dir) return;
   e.preventDefault();
   move(dir);
});

/* Parmakla kaydirma */
let touchStart = null;
const SWIPE_MIN = 24; /* bu kadar pikselden kisa hareketler kazara dokunus sayilir */

boardEl.addEventListener('touchstart', (e) => {
   if (e.touches.length !== 1) return;
   touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

boardEl.addEventListener('touchmove', (e) => {
   if (touchStart) e.preventDefault(); /* sayfanin kaymasini engelle */
}, { passive: false });

boardEl.addEventListener('touchend', (e) => {
   if (!touchStart) return;
   const touch = e.changedTouches[0];
   handleSwipe(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
   touchStart = null;
}, { passive: true });

/* Bilgisayarda fareyle surukleme (test icin) */
let mouseStart = null;
boardEl.addEventListener('mousedown', (e) => { mouseStart = { x: e.clientX, y: e.clientY }; });
window.addEventListener('mouseup', (e) => {
   if (!mouseStart) return;
   handleSwipe(e.clientX - mouseStart.x, e.clientY - mouseStart.y);
   mouseStart = null;
});

function handleSwipe(dx, dy) {
   if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
   if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
   } else {
      move(dy > 0 ? 'down' : 'up');
   }
}
