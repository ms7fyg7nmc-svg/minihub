
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v104';
import { getBest, saveState, loadState, clearState, startRun, finishRunOrLegacy, yerelTohum, oynanabilirMi } from '../../js/store.js?v104';
import { initLang, t, locale, applyTranslations, mhHtml } from '../../js/i18n.js?v104';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v104';
import { SIZE, mulberry32, createBoard, applyMove, isGameOver as boardIsOver, DIR_TO_CODE, CODE_TO_DIR } from './logic.js?v104';

const GAME_ID = '2048';
const POINTS_DIVISOR = 23;

const boardEl = document.getElementById('board');
const cellsEl = document.getElementById('cells');
const tilesEl = document.getElementById('tiles');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

// `board` (SIZE*SIZE sayidan olusan duz dizi) TEK gercek durum - logic.js
// bunu uretiyor. `cells` (tas nesneleri) SADECE render/animasyon icin,
// board'dan turetiliyor, kendi basina asla degistirilmiyor.
let board = [];
let cells = [];
let score = 0;
let best = 0;
let nextId = 1;
let won = false;
let wonShown = false;
let over = false;
let gapPx = 0;
let cellPx = 0;

let rng = null;
let seed = null;
let runId = null;
let moves = [];

await initLang();
applyTranslations();

initTelegram();
showBackButton(goHome);
backToHubOnResume();
document.getElementById('back-link').addEventListener('click', (e) => {
   e.preventDefault();
   goHome();
});
document.getElementById('new-game').addEventListener('click', async () => {
   if (!(await oynanabilirMi())) { haptic.error(); goHome(); return; }
   haptic.tap();
   // Oyun devam ederken "Yeni Oyun"a basmak = yarida birakma: dogal
   // game-over ile AYNI ekrani (skor/rekor/kazanc) gosterip oradan
   // "Yeniden oyna"ya basinca yeni oyuna geciyoruz - sessizce atlamiyoruz.
   if (!over) { await endGame(); return; }
   await startNewGame();
});

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

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
   if (saved && typeof saved.seed === 'number' && Array.isArray(saved.moves)) {
      restore(saved);
   } else if (saved && Array.isArray(saved.cells) && saved.cells.length === SIZE * SIZE) {
      // Bu ozellikten ONCEKI eski bir kayit (seed/moves yok) - tek seferlik
      // gecis: kaydedilen tahtayi gosterip o oturumu dogrulamasiz eski
      // yoldan kapatiyoruz, sonraki her oyun yeni akistan geciyor.
      restoreLegacy(saved);
   } else {
      await startNewGame();
   }
}

function goHome() {
   window.location.href = '../../index.html';
}

async function startNewGame() {
   const run = await startRun(GAME_ID);
   seed = run ? run.seed : yerelTohum();
   runId = run ? run.runId : null;
   rng = mulberry32(seed);
   moves = [];

   const created = createBoard(rng);
   board = created.board;
   score = 0;
   won = false;
   wonShown = false;
   over = false;
   nextId = 1;
   cells = new Array(SIZE * SIZE).fill(null);
   for (const spawn of created.spawns) {
      const tile = makeTile(Math.floor(spawn.index / SIZE), spawn.index % SIZE, spawn.value);
      tile.isNew = true;
      cells[spawn.index] = tile;
   }

   clearState(GAME_ID);
   hideOverlay();
   updateScore();
   render(false);
   persist();
}

// Kaydedilmis hamle listesini AYNI tohumdan basa alip yeniden oynatarak
// board/skor/rng durumunu yeniden kurar - sunucunun /api/game/finish'te
// yapacagi ile birebir ayni fonksiyonlari kullaniyor, o yuzden sonuc
// garanti tutarli.
function restore(saved) {
   seed = saved.seed;
   runId = saved.runId;
   moves = Array.isArray(saved.moves) ? saved.moves.slice() : [];
   rng = mulberry32(seed);

   const created = createBoard(rng);
   board = created.board;
   score = 0;

   for (const code of moves) {
      const dir = CODE_TO_DIR[code];
      if (!dir) continue;
      const result = applyMove(board, dir, rng);
      if (!result.moved) continue;
      board = result.board;
      score += result.gained;
   }

   won = board.includes(2048);
   wonShown = won;
   over = false;
   nextId = 1;
   cells = flatBoardToCells(board);

   updateScore();
   render(false);
   if (boardIsOver(board)) endGame();
}

function restoreLegacy(saved) {
   cells = new Array(SIZE * SIZE).fill(null);
   board = new Array(SIZE * SIZE).fill(0);
   saved.cells.forEach((value, i) => {
      if (value) {
         cells[i] = makeTile(Math.floor(i / SIZE), i % SIZE, value);
         board[i] = value;
      }
   });
   score = Number(saved.score) || 0;
   won = !!saved.won;
   wonShown = won;
   seed = null;
   runId = null;
   moves = [];
   updateScore();
   render(false);
   // Bu tek, gecis-donemi oturumu icin sunucuya hic gitmiyoruz (seed yok,
   // dogrulanamaz) - sadece ekranda kalmasin diye kapatiyoruz.
   over = true;
   clearState(GAME_ID);
}

function flatBoardToCells(flatBoard) {
   const out = new Array(SIZE * SIZE).fill(null);
   flatBoard.forEach((value, i) => {
      if (value) out[i] = makeTile(Math.floor(i / SIZE), i % SIZE, value);
   });
   return out;
}

function persist() {
   saveState(GAME_ID, { score, won, seed, runId, moves });
}

function makeTile(r, c, value) {
   return { id: nextId++, r, c, value, prevR: r, prevC: c, isNew: false, mergedFrom: null };
}

async function finishAndCredit() {
   return finishRunOrLegacy(GAME_ID, runId, { moves }, score, POINTS_DIVISOR);
}

function move(direction) {
   if (over || overlayVisible()) return;

   const result = applyMove(board, direction, rng);
   if (!result.moved) return;

   const prevCells = cells;
   board = result.board;
   cells = rebuildCells(prevCells, result);
   moves.push(DIR_TO_CODE[direction]);
   score += result.gained;
   if (board.includes(2048) && !won) won = true;

   updateScore();
   render(true);
   persist();

   if (result.gained > 0) haptic.tap('light');
   if (result.transitions.some((tr) => tr.type === 'merge' && tr.role === 'mover')) SFX.merge();

   if (won && !wonShown) {
      wonShown = true;
      haptic.success();
      showOverlay('2048!', t('g2048.wonText'), t('g2048.continue'), hideOverlay);
   } else if (boardIsOver(board)) {
      endGame();
   }
}

function rebuildCells(prevCells, result) {
   const next = new Array(SIZE * SIZE).fill(null);
   const consumed = new Set();

   const mergesByDest = new Map();
   for (const tr of result.transitions) {
      if (tr.type !== 'merge') continue;
      const key = tr.to.r * SIZE + tr.to.c;
      if (!mergesByDest.has(key)) mergesByDest.set(key, []);
      mergesByDest.get(key).push(tr);
   }

   for (const tr of result.transitions) {
      if (tr.type !== 'move') continue;
      const fromIdx = tr.from.r * SIZE + tr.from.c;
      consumed.add(fromIdx);
      const tile = prevCells[fromIdx] || makeTile(tr.from.r, tr.from.c, tr.value);
      tile.prevR = tr.from.r;
      tile.prevC = tr.from.c;
      tile.r = tr.to.r;
      tile.c = tr.to.c;
      tile.isNew = false;
      tile.mergedFrom = null;
      next[tr.to.r * SIZE + tr.to.c] = tile;
   }

   for (const [destKey, group] of mergesByDest) {
      const destR = Math.floor(destKey / SIZE);
      const destC = destKey % SIZE;
      const sources = group.map((tr) => {
         const fromIdx = tr.from.r * SIZE + tr.from.c;
         consumed.add(fromIdx);
         const tile = prevCells[fromIdx] || makeTile(tr.from.r, tr.from.c, tr.value / 2);
         tile.prevR = tr.from.r;
         tile.prevC = tr.from.c;
         return tile;
      });
      const merged = makeTile(destR, destC, group[0].value);
      merged.mergedFrom = sources;
      next[destKey] = merged;
   }

   // Ne kaydi ne birlesti - yerinde duran taslar logic.js'ten hic transition
   // almiyor (board'da degisiklik yok cunku), o yuzden burada elle tasimazsak
   // render() o hucreyi bos saniyor ve tas gorunmez oluyor (skor/board
   // etkilenmiyor, sadece ekranda kayboluyor - bir sonraki hamlede tekrar
   // hareket edince "geri geliyor" gibi gorunmesinin sebebi buydu).
   for (let i = 0; i < prevCells.length; i++) {
      if (consumed.has(i) || next[i]) continue;
      const tile = prevCells[i];
      if (!tile) continue;
      tile.prevR = tile.r;
      tile.prevC = tile.c;
      tile.isNew = false;
      tile.mergedFrom = null;
      next[i] = tile;
   }

   if (result.spawn) {
      const tile = makeTile(Math.floor(result.spawn.index / SIZE), result.spawn.index % SIZE, result.spawn.value);
      tile.isNew = true;
      next[result.spawn.index] = tile;
   }

   return next;
}

async function endGame() {
   if (over) return;
   over = true;
   clearState(GAME_ID);
   haptic.error();
   SFX.gameOver();

   const result = await finishAndCredit();
   if (result?.ok && typeof result.best === 'number') {
      best = result.best;
      bestEl.textContent = best.toLocaleString(locale());
   }

   const lines = [t('g2048.yourScore', { score: (result?.score ?? score).toLocaleString(locale()) })];
   if (result?.isRecord) lines.push(t('g2048.newRecord'));
   const earned = result?.earned || 0;
   if (earned > 0) lines.push(t('g2048.pointsEarned', { earned: earned.toLocaleString(locale()) }));

   showOverlay(t('g2048.gameOver'), lines.join(' · '), t('g2048.playAgain'), startNewGame);
}

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

function render(animate) {
   tilesEl.textContent = '';

   [...cellsEl.children].forEach((el, i) => setPosition(el, Math.floor(i / SIZE), i % SIZE));

   const pending = [];

   for (const tile of cells) {
      if (!tile) continue;

      if (tile.mergedFrom && animate) {
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

   const moving = pending.filter((p) => p.el.dataset.moves === '1');
   if (moving.length) {
      requestAnimationFrame(() => {
         requestAnimationFrame(() => {
            for (const { el, target } of moving) setPosition(el, target.r, target.c);
         });
      });
   }
}

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

function overlayVisible() {
   return !overlayEl.hidden;
}

function showOverlay(title, text, buttonLabel, action) {
   overlayTitle.textContent = title;
   overlayText.innerHTML = mhHtml(text, '../../assets/coin.png');
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

let touchStart = null;
const SWIPE_MIN = 24;

boardEl.addEventListener('touchstart', (e) => {
   if (e.touches.length !== 1) return;
   touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

boardEl.addEventListener('touchmove', (e) => {
   if (touchStart) e.preventDefault();
}, { passive: false });

boardEl.addEventListener('touchend', (e) => {
   if (!touchStart) return;
   const touch = e.changedTouches[0];
   handleSwipe(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
   touchStart = null;
}, { passive: true });

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
