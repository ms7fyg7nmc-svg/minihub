
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v84';
import { submitScore, addPoints, getBest, saveState, loadState, clearState, settleAbandonedRun } from '../../js/store.js?v84';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v84';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v84';

const GAME_ID = 'match3';
const SIZE = 8;
const ROUND_SECONDS = 60;
const POINTS_DIVISOR = 19;
const POINTS_PER_TILE = 10;
const TIME_BONUS = 1;
const TIME_CAP = ROUND_SECONDS + 30;

registerTexts(GAME_ID, {
  title: 'Şeker Eşleştir',
  subtitle: '3 aynı şekeri yan yana getir',
  score: 'SKOR',
  time: 'SÜRE',
  best: 'REKOR',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Şekeri komşusuyla değiştirmek için parmağınla it.',
  timeUp: 'Süre doldu',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} $MH kazandın.',
});

const KINDS = [
  { color: '#e2544e', icon: '🍒' },
  { color: '#f5b942', icon: '🍋' },
  { color: '#4ecb8b', icon: '🍏' },
  { color: '#5b8cff', icon: '💎' },
  { color: '#c079f2', icon: '🍇' },
  { color: '#f2884b', icon: '🍊' },
];

const boardEl = document.getElementById('board');
const cellsEl = document.getElementById('cells');
const tilesEl = document.getElementById('tiles');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const timeBox = document.getElementById('time-box');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let board = [];
let score = 0;
let best = 0;
let timeLeft = ROUND_SECONDS;
let timer = null;
let busy = false;
let over = false;
let started = false;
let nextId = 1;
let gapPx = 0;
let cellPx = 0;

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});
document.getElementById('new-game').addEventListener('click', async () => {
  haptic.tap();
  if (!over) await settleAbandonedRun(score, POINTS_DIVISOR);
  startNewGame();
});

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

layout();
buildCells();
window.addEventListener('resize', () => {
  layout();
  positionCells();
  for (const tile of board) if (tile) setPosition(tile.el, tile.r, tile.c);
});

bootstrap();

async function bootstrap() {
  best = await getBest(GAME_ID);
  bestEl.textContent = format(best);

  const saved = await loadState(GAME_ID);
  if (saved && Array.isArray(saved.kinds) && saved.kinds.length === SIZE * SIZE && saved.timeLeft > 0) {
    score = Number(saved.score) || 0;
    timeLeft = Number(saved.timeLeft);
    board = saved.kinds.map((kind, i) => makeTile(kind, Math.floor(i / SIZE), i % SIZE));
    renderAll();
    updateHud();
  } else {
    startNewGame();
  }
}

function goHome() {
  window.location.href = '../../index.html';
}

function startNewGame() {
  stopTimer();
  clearState(GAME_ID);
  score = 0;
  timeLeft = ROUND_SECONDS;
  over = false;
  busy = false;
  started = false;
  hideOverlay();
  fillBoard();
  renderAll();
  updateHud();
}

function makeTile(kind, r, c) {
  return { id: nextId++, kind, r, c, el: null };
}

const at = (r, c) => board[r * SIZE + c];
const put = (r, c, tile) => { board[r * SIZE + c] = tile; };

function fillBoard() {
  for (let attempt = 0; attempt < 60; attempt++) {
    board = new Array(SIZE * SIZE);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let kind;
        do {
          kind = Math.floor(Math.random() * KINDS.length);
        } while (createsMatch(r, c, kind));
        put(r, c, makeTile(kind, r, c));
      }
    }
    if (hasValidMove()) return;
  }
}

function createsMatch(r, c, kind) {
  if (c >= 2 && at(r, c - 1)?.kind === kind && at(r, c - 2)?.kind === kind) return true;
  if (r >= 2 && at(r - 1, c)?.kind === kind && at(r - 2, c)?.kind === kind) return true;
  return false;
}

function findMatches() {
  const hits = new Set();

  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c <= SIZE; c++) {
      const same = c < SIZE && at(r, c) && at(r, c - 1) && at(r, c).kind === at(r, c - 1).kind;
      if (same) {
        run++;
      } else {
        if (run >= 3) for (let k = 1; k <= run; k++) hits.add(r * SIZE + (c - k));
        run = 1;
      }
    }
  }

  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r <= SIZE; r++) {
      const same = r < SIZE && at(r, c) && at(r - 1, c) && at(r, c).kind === at(r - 1, c).kind;
      if (same) {
        run++;
      } else {
        if (run >= 3) for (let k = 1; k <= run; k++) hits.add((r - k) * SIZE + c);
        run = 1;
      }
    }
  }

  return [...hits];
}

function hasValidMove() {
  const swapKinds = (i, j) => {
    const a = board[i].kind;
    board[i].kind = board[j].kind;
    board[j].kind = a;
  };

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c;
      if (c < SIZE - 1) {
        swapKinds(i, i + 1);
        const found = findMatches().length > 0;
        swapKinds(i, i + 1);
        if (found) return true;
      }
      if (r < SIZE - 1) {
        swapKinds(i, i + SIZE);
        const found = findMatches().length > 0;
        swapKinds(i, i + SIZE);
        if (found) return true;
      }
    }
  }
  return false;
}

async function trySwap(r1, c1, r2, c2) {
  if (busy || over) return;
  if (r2 < 0 || r2 >= SIZE || c2 < 0 || c2 >= SIZE) return;

  busy = true;
  if (!started) startTimer();

  swapTiles(r1, c1, r2, c2);
  renderPositions();
  haptic.tap();
  await wait(170);

  if (findMatches().length === 0) {
    swapTiles(r1, c1, r2, c2);
    renderPositions();
    await wait(170);
    busy = false;
    return;
  }

  await resolveCascades();
  busy = false;
}

function swapTiles(r1, c1, r2, c2) {
  const a = at(r1, c1);
  const b = at(r2, c2);
  put(r1, c1, b);
  put(r2, c2, a);
  a.r = r2; a.c = c2;
  b.r = r1; b.c = c1;
}

async function resolveCascades() {
  let chain = 0;

  while (true) {
    const matches = findMatches();
    if (!matches.length) break;

    chain++;
    const gain = matches.length * POINTS_PER_TILE * chain;
    score += gain;
    timeLeft = Math.min(timeLeft + TIME_BONUS, TIME_CAP);
    updateHud();
    pulseTime();
    haptic.success();
    SFX.match();

    for (const index of matches) {
      const tile = board[index];
      tile.el.classList.add('pop');
      const el = tile.el;
      setTimeout(() => el.remove(), 200);
      board[index] = null;
    }

    if (chain > 1) showFloater(`x${chain}  +${format(gain)}`);
    await wait(200);

    dropAndRefill();
    renderPositions();
    await wait(200);
  }

  if (!hasValidMove()) {
    await shuffleBoard();
  }
  persist();
}

function dropAndRefill() {
  for (let c = 0; c < SIZE; c++) {
    let writeRow = SIZE - 1;

    for (let r = SIZE - 1; r >= 0; r--) {
      const tile = at(r, c);
      if (!tile) continue;
      if (writeRow !== r) {
        put(r, c, null);
        put(writeRow, c, tile);
        tile.r = writeRow;
      }
      writeRow--;
    }

    let spawn = -1;
    for (let r = writeRow; r >= 0; r--) {
      const tile = makeTile(Math.floor(Math.random() * KINDS.length), r, c);
      put(r, c, tile);
      createTileElement(tile, spawn--, c);
    }
  }
}

async function shuffleBoard() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const kinds = board.map((tile) => tile.kind);
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    board.forEach((tile, i) => {
      tile.kind = kinds[i];
      paintTile(tile);
    });
    if (!findMatches().length && hasValidMove()) {
      await wait(200);
      return;
    }
  }

  fillBoard();
  renderAll();
  await wait(200);
}

function startTimer() {
  started = true;
  timer = setInterval(() => {
    timeLeft--;
    updateHud();
    persist();
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function endGame() {
  if (over) return;
  over = true;
  stopTimer();
  clearState(GAME_ID);
  haptic.error();
  SFX.gameOver();

  const result = await submitScore(GAME_ID, score);
  best = result.best;
  bestEl.textContent = format(best);

  const earned = Math.floor(score / POINTS_DIVISOR);
  if (earned > 0) await addPoints(earned);

  const lines = [t('yourScore', { score: format(score) })];
  if (result.isRecord) lines.push(t('newRecord'));
  if (earned > 0) lines.push(t('earnedPoints', { points: format(earned) }));

  showOverlay(t('timeUp'), lines.join(' · '), t('playAgain'), startNewGame);
}

function persist() {
  if (over || !started) return;

  if (board.some((tile) => !tile)) return;

  saveState(GAME_ID, {
    kinds: board.map((tile) => tile.kind),
    score,
    timeLeft,
  });
}

function layout() {
  const width = boardEl.clientWidth;
  gapPx = Math.round(width * 0.02);
  cellPx = (width - gapPx * (SIZE + 1)) / SIZE;
  boardEl.style.setProperty('--gap', `${gapPx}px`);
  boardEl.style.setProperty('--cell', `${cellPx}px`);
}

function offset(index) {
  return gapPx + index * (cellPx + gapPx);
}

function setPosition(el, r, c) {
  const value = `translate(${offset(c)}px, ${offset(r)}px)`;
  el.style.setProperty('--pos', value);
  el.style.transform = value;
}

function buildCells() {
  for (let i = 0; i < SIZE * SIZE; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    cellsEl.appendChild(el);
  }
  positionCells();
}

function positionCells() {
  [...cellsEl.children].forEach((el, i) => setPosition(el, Math.floor(i / SIZE), i % SIZE));
}

function renderAll() {
  tilesEl.textContent = '';
  for (const tile of board) createTileElement(tile, tile.r, tile.c);
}

function createTileElement(tile, startRow, startCol) {
  const el = document.createElement('div');
  el.className = 'tile';
  tile.el = el;
  paintTile(tile);
  setPosition(el, startRow, startCol);
  tilesEl.appendChild(el);

  if (startRow !== tile.r || startCol !== tile.c) {
    requestAnimationFrame(() => requestAnimationFrame(() => setPosition(el, tile.r, tile.c)));
  }
}

function paintTile(tile) {
  const kind = KINDS[tile.kind];
  tile.el.style.backgroundColor = kind.color;
  tile.el.textContent = kind.icon;
}

function renderPositions() {
  for (const tile of board) if (tile) setPosition(tile.el, tile.r, tile.c);
}

function showFloater(text) {
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = '50%';
  el.style.top = '50%';
  boardEl.parentElement.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function updateHud() {
  scoreEl.textContent = format(score);
  timeEl.textContent = Math.max(0, timeLeft);
  timeBox.classList.toggle('warn', timeLeft <= 10);
  if (score > best) {
    best = score;
    bestEl.textContent = format(best);
  }
}

function pulseTime() {
  timeBox.classList.remove('bonus');
  void timeBox.offsetWidth;
  timeBox.classList.add('bonus');
}

const format = (n) => Number(n).toLocaleString(locale());
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SWIPE_MIN = 12;
let swipeStart = null;

boardEl.addEventListener('pointerdown', (e) => {
  if (busy || over) return;
  const cell = cellFromPoint(e.clientX, e.clientY);
  if (!cell) return;
  swipeStart = { ...cell, x: e.clientX, y: e.clientY };
  at(cell.r, cell.c)?.el.classList.add('selected');
});

boardEl.addEventListener('pointermove', (e) => {
  if (!swipeStart) return;
  e.preventDefault();
  const dx = e.clientX - swipeStart.x;
  const dy = e.clientY - swipeStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;

  const start = swipeStart;
  endSwipe();

  if (Math.abs(dx) > Math.abs(dy)) {
    trySwap(start.r, start.c, start.r, start.c + (dx > 0 ? 1 : -1));
  } else {
    trySwap(start.r, start.c, start.r + (dy > 0 ? 1 : -1), start.c);
  }
});

boardEl.addEventListener('pointerup', endSwipe);
boardEl.addEventListener('pointercancel', endSwipe);

function endSwipe() {
  if (!swipeStart) return;
  at(swipeStart.r, swipeStart.c)?.el.classList.remove('selected');
  swipeStart = null;
}

function cellFromPoint(x, y) {
  const rect = boardEl.getBoundingClientRect();
  const c = Math.floor((x - rect.left - gapPx / 2) / (cellPx + gapPx));
  const r = Math.floor((y - rect.top - gapPx / 2) / (cellPx + gapPx));
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;
  return { r, c };
}

function showOverlay(title, text, buttonLabel, action) {
  overlayTitle.textContent = title;
  overlayText.innerHTML = mhHtml(text);
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
