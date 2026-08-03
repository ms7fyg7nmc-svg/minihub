/* Blok Bulmaca (Block Blast)

   8x8 bos tahta. Altta 3 parca durur. Parcayi tutup tahtaya birakirsin.
   Dolan satir ve sutunlar patlar. Eldeki hicbir parca hicbir yere sigmiyorsa
   oyun biter. Sure yok, kaybetme baskisi yok. */

import { initTelegram, haptic, showBackButton } from '../../js/tg.js';
import { submitScore, addPoints, getBest, saveState, loadState, clearState } from '../../js/store.js';
import { registerTexts, t, applyStaticTexts } from '../../js/i18n-hook.js';

const GAME_ID = 'blockblast';
const SIZE = 8;
const POINTS_DIVISOR = 10; /* her 10 oyun skoru = 1 hub puani */

/* Tum metinler burada. Dil sistemi baglanirsa bunlar yedek olarak kalir. */
registerTexts(GAME_ID, {
  title: 'Blok Bulmaca',
  subtitle: 'Satırları ve sütunları doldur',
  score: 'SKOR',
  best: 'REKOR',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Parçayı tut ve tahtaya sürükle.',
  gameOver: 'Oyun bitti',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} hub puanı kazandın.',
});

/* Parca sekilleri. X = dolu kare, nokta = bos. */
const SHAPE_DEFS = [
  ['X'],
  ['XX'], ['X', 'X'],
  ['XXX'], ['X', 'X', 'X'],
  ['XXXX'], ['X', 'X', 'X', 'X'],
  ['XXXXX'], ['X', 'X', 'X', 'X', 'X'],
  ['XX', 'XX'],
  ['XXX', 'XXX', 'XXX'],
  ['X.', 'XX'], ['.X', 'XX'], ['XX', 'X.'], ['XX', '.X'],
  ['X..', 'X..', 'XXX'], ['..X', '..X', 'XXX'],
  ['XXX', 'X..', 'X..'], ['XXX', '..X', '..X'],
  ['.X.', 'XXX'], ['XXX', '.X.'],
  ['XX.', '.XX'], ['.XX', 'XX.'],
];

const COLORS = ['#f2b179', '#5b8cff', '#4ecb8b', '#e2679c', '#c079f2', '#f5b942'];

const boardEl = document.getElementById('board');
const trayEl = document.getElementById('tray');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let grid = [];    /* 64 eleman: null veya renk kodu */
let tray = [];    /* 3 eleman: parca nesnesi veya null */
let score = 0;
let best = 0;
let over = false;
let squares = []; /* tahtadaki 64 div */

/* ---------- Baslangic ---------- */

initTelegram();
applyStaticTexts();
showBackButton(goHome);

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});
document.getElementById('new-game').addEventListener('click', () => {
  haptic.tap();
  startNewGame();
});

buildBoard();
bootstrap();

async function bootstrap() {
  best = await getBest(GAME_ID);
  bestEl.textContent = format(best);

  const saved = await loadState(GAME_ID);
  if (saved && Array.isArray(saved.grid) && saved.grid.length === SIZE * SIZE) {
    grid = saved.grid.map((c) => c || null);
    tray = (saved.tray || []).map((p) => (p ? makePiece(p.shape, p.color) : null));
    while (tray.length < 3) tray.push(null);
    score = Number(saved.score) || 0;
    if (tray.every((p) => !p)) refillTray();
  } else {
    resetGame();
  }
  updateScore();
  render();
  if (!anyPieceFits()) endGame();
}

function goHome() {
  window.location.href = '../../index.html';
}

function resetGame() {
  grid = new Array(SIZE * SIZE).fill(null);
  tray = [null, null, null];
  score = 0;
  over = false;
  refillTray();
}

function startNewGame() {
  resetGame();
  clearState(GAME_ID);
  hideOverlay();
  updateScore();
  render();
}

/* ---------- Parcalar ---------- */

let pieceCounter = 0;

function makePiece(shapeIndex, color) {
  const rows = SHAPE_DEFS[shapeIndex];
  const cells = [];
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === 'X') cells.push([r, c]);
    });
  });
  return {
    uid: ++pieceCounter,
    shape: shapeIndex,
    color,
    cells,
    h: rows.length,
    w: Math.max(...rows.map((r) => r.length)),
  };
}

function randomPiece() {
  const shape = Math.floor(Math.random() * SHAPE_DEFS.length);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return makePiece(shape, color);
}

function refillTray() {
  tray = [randomPiece(), randomPiece(), randomPiece()];
}

/* ---------- Tahta mantigi ---------- */

const at = (r, c) => grid[r * SIZE + c];
const put = (r, c, v) => { grid[r * SIZE + c] = v; };

function fits(piece, row, col) {
  for (const [dr, dc] of piece.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || at(r, c)) return false;
  }
  return true;
}

function pieceFitsSomewhere(piece) {
  for (let r = 0; r <= SIZE - piece.h; r++) {
    for (let c = 0; c <= SIZE - piece.w; c++) {
      if (fits(piece, r, c)) return true;
    }
  }
  return false;
}

function anyPieceFits() {
  return tray.some((p) => p && pieceFitsSomewhere(p));
}

/* Parcayi tahtaya koyar, patlayan satir/sutunlari temizler */
function place(piece, row, col, slotIndex) {
  for (const [dr, dc] of piece.cells) put(row + dr, col + dc, piece.color);

  score += piece.cells.length;
  tray[slotIndex] = null;
  haptic.tap();

  const cleared = findFullLines();

  if (cleared.cells.length) {
    const bonus = cleared.lines * 100 * cleared.lines; /* 1 sıra=100, 2=400, 3=900 */
    score += bonus;
    haptic.success();
    animateClear(cleared.cells, bonus);
  }

  if (tray.every((p) => !p)) refillTray();

  updateScore();
  render();
  persist();

  if (!anyPieceFits()) endGame();
}

function findFullLines() {
  const cells = new Set();
  let lines = 0;

  for (let r = 0; r < SIZE; r++) {
    let full = true;
    for (let c = 0; c < SIZE; c++) if (!at(r, c)) { full = false; break; }
    if (full) {
      lines++;
      for (let c = 0; c < SIZE; c++) cells.add(r * SIZE + c);
    }
  }

  for (let c = 0; c < SIZE; c++) {
    let full = true;
    for (let r = 0; r < SIZE; r++) if (!at(r, c)) { full = false; break; }
    if (full) {
      lines++;
      for (let r = 0; r < SIZE; r++) cells.add(r * SIZE + c);
    }
  }

  for (const i of cells) grid[i] = null;
  return { cells: [...cells], lines };
}

function persist() {
  saveState(GAME_ID, {
    grid,
    tray: tray.map((p) => (p ? { shape: p.shape, color: p.color } : null)),
    score,
  });
}

async function endGame() {
  if (over) return;
  over = true;
  clearState(GAME_ID);
  haptic.error();

  const result = await submitScore(GAME_ID, score);
  best = result.best;
  bestEl.textContent = format(best);

  const earned = Math.floor(score / POINTS_DIVISOR);
  if (earned > 0) await addPoints(earned);

  const lines = [t('yourScore', { score: format(score) })];
  if (result.isRecord) lines.push(t('newRecord'));
  if (earned > 0) lines.push(t('earnedPoints', { points: format(earned) }));

  showOverlay(t('gameOver'), lines.join(' · '), t('playAgain'), startNewGame);
}

/* ---------- Ekrana cizme ---------- */

function buildBoard() {
  for (let i = 0; i < SIZE * SIZE; i++) {
    const el = document.createElement('div');
    el.className = 'sq';
    boardEl.appendChild(el);
    squares.push(el);
  }
}

function render() {
  grid.forEach((color, i) => {
    const el = squares[i];
    el.classList.toggle('filled', !!color);
    el.style.backgroundColor = color || '';
  });
  renderTray();
}

function renderTray() {
  trayEl.textContent = '';

  tray.forEach((piece, slotIndex) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    trayEl.appendChild(slot);
    if (!piece) return;

    const el = document.createElement('div');
    el.className = 'piece';
    el.style.gridTemplateColumns = `repeat(${piece.w}, 14px)`;

    for (let r = 0; r < piece.h; r++) {
      for (let c = 0; c < piece.w; c++) {
        const cell = document.createElement('div');
        const filled = piece.cells.some(([pr, pc]) => pr === r && pc === c);
        cell.className = 'pc';
        if (filled) cell.style.backgroundColor = piece.color;
        else cell.style.visibility = 'hidden';
        el.appendChild(cell);
      }
    }

    el.addEventListener('pointerdown', (e) => startDrag(e, piece, slotIndex, el));
    slot.appendChild(el);
  });
}

function animateClear(indexes, bonus) {
  for (const i of indexes) {
    const el = squares[i];
    el.classList.add('clearing');
    setTimeout(() => {
      el.classList.remove('clearing');
      el.style.backgroundColor = '';
      el.classList.remove('filled');
    }, 220);
  }
  showFloater(`+${format(bonus)}`);
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

function updateScore() {
  scoreEl.textContent = format(score);
  if (score > best) {
    best = score;
    bestEl.textContent = format(best);
  }
}

const format = (n) => Number(n).toLocaleString('tr-TR');

/* ---------- Surukle-birak ---------- */

let drag = null;

function boardMetrics() {
  const rect = boardEl.getBoundingClientRect();
  const styles = getComputedStyle(boardEl);
  const gap = parseFloat(styles.gap) || 0;
  const pad = parseFloat(styles.paddingLeft) || 0;
  const cell = (rect.width - pad * 2 - gap * (SIZE - 1)) / SIZE;
  return { rect, gap, pad, cell };
}

function startDrag(event, piece, slotIndex, sourceEl) {
  if (over || drag) return;
  event.preventDefault();

  const { cell, gap } = boardMetrics();

  /* Parmagin altinda gezecek buyuk kopyayi olustur */
  const ghost = document.createElement('div');
  ghost.className = 'ghost';
  ghost.style.gridTemplateColumns = `repeat(${piece.w}, ${cell}px)`;
  ghost.style.gap = `${gap}px`;

  for (let r = 0; r < piece.h; r++) {
    for (let c = 0; c < piece.w; c++) {
      const cellEl = document.createElement('div');
      const filled = piece.cells.some(([pr, pc]) => pr === r && pc === c);
      cellEl.className = filled ? 'pc' : 'pc empty';
      cellEl.style.width = `${cell}px`;
      cellEl.style.height = `${cell}px`;
      if (filled) cellEl.style.backgroundColor = piece.color;
      ghost.appendChild(cellEl);
    }
  }
  document.body.appendChild(ghost);
  sourceEl.classList.add('dragging');

  const width = piece.w * cell + (piece.w - 1) * gap;
  const height = piece.h * cell + (piece.h - 1) * gap;

  drag = {
    piece,
    slotIndex,
    ghost,
    sourceEl,
    /* Parca parmagin biraz uzerinde dursun ki elin oyunu kapatmasin */
    offsetX: width / 2,
    offsetY: height / 2 + cell * 1.3,
    target: null,
  };

  /* Parmak parcanin disina cikinca da olaylari almaya devam edelim */
  try {
    sourceEl.setPointerCapture(event.pointerId);
  } catch {
    /* bazi tarayicilarda desteklenmiyor, sorun degil */
  }
  sourceEl.addEventListener('pointermove', onDragMove);
  sourceEl.addEventListener('pointerup', onDragEnd);
  sourceEl.addEventListener('pointercancel', onDragEnd);

  moveGhost(event.clientX, event.clientY);
}

function moveGhost(x, y) {
  const { rect, gap, pad, cell } = boardMetrics();
  const left = x - drag.offsetX;
  const top = y - drag.offsetY;

  drag.ghost.style.left = `${left}px`;
  drag.ghost.style.top = `${top}px`;

  const col = Math.round((left - rect.left - pad) / (cell + gap));
  const row = Math.round((top - rect.top - pad) / (cell + gap));

  const inRange = row > -2 && row < SIZE + 1 && col > -2 && col < SIZE + 1;
  const ok = inRange && fits(drag.piece, row, col);

  drag.target = ok ? { row, col } : null;
  showPreview(ok ? { row, col } : null, inRange);
}

function showPreview(target, inRange) {
  for (const el of squares) el.classList.remove('preview', 'preview-bad');
  if (!inRange) return;

  if (target) {
    for (const [dr, dc] of drag.piece.cells) {
      squares[(target.row + dr) * SIZE + (target.col + dc)].classList.add('preview');
    }
  }
}

function onDragMove(event) {
  if (!drag) return;
  event.preventDefault();
  moveGhost(event.clientX, event.clientY);
}

function onDragEnd(event) {
  if (!drag) return;
  const { piece, slotIndex, target, ghost, sourceEl } = drag;

  sourceEl.removeEventListener('pointermove', onDragMove);
  sourceEl.removeEventListener('pointerup', onDragEnd);
  sourceEl.removeEventListener('pointercancel', onDragEnd);
  ghost.remove();
  sourceEl.classList.remove('dragging');
  for (const el of squares) el.classList.remove('preview', 'preview-bad');
  drag = null;

  if (target && event.type === 'pointerup') {
    place(piece, target.row, target.col, slotIndex);
  }
}

/* ---------- Bitis ekrani ---------- */

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
