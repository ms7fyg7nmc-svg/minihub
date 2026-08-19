
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v93';
import { submitScore, addPoints, getBest, saveState, loadState, clearState, spendRestartEnergy, startRun, finishRun, yerelTohum, oynanabilirMi } from '../../js/store.js?v93';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v93';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v93';
import { generatePuzzle } from './logic.js?v93';

const GAME_ID = 'flow';
const POINTS_PER_LEVEL = 48;

registerTexts(GAME_ID, {
  title: 'Flow Connect',
  subtitle: 'Connect matching dots, fill the grid',
  level: 'LEVEL',
  bestLevel: 'BEST',
  undo: 'Undo',
  restart: 'Restart',
  backToHub: 'Back to Hub',
  hint: 'Drag from one dot to its matching color. Fill every cell.',
  levelDone: 'Level complete!',
  nextLevel: 'Next level',
  levelResult: 'Solved in {moves} moves.',
  earnedPoints: '+{points} $MH earned.',
});

const COLORS = [
  '#e2544e', '#5b8cff', '#4ecb8b', '#f5b942', '#c079f2',
  '#3fc7d4', '#f2884b', '#e2679c',
];

const boardEl = document.getElementById('board');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const undoBtn = document.getElementById('undo');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let size = 5;
let endpoints = [];
let paths = [];
let level = 1;
let bestLevel = 1;
let moves = 0;
let locked = false;
let cellEls = [];
let drag = null;
let seed = null;
let runId = null;

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});
document.getElementById('new-game').addEventListener('click', async () => {
  if (!(await oynanabilirMi())) { haptic.error(); goHome(); return; }
  haptic.tap();
  await spendRestartEnergy();
  buildLevel();
});
undoBtn.addEventListener('click', () => {
  haptic.tap();
  undoLast();
});
document.addEventListener('langchange', () => applyStaticTexts());

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

bootstrap();

async function bootstrap() {
  bestLevel = (await getBest(GAME_ID)) || 1;
  bestEl.textContent = bestLevel;

  const saved = await loadState(GAME_ID);
  if (saved && typeof saved.seed === 'number' && Array.isArray(saved.paths)) {
    restore(saved);
  } else {
    await buildLevel();
  }
}

// Kaydedilmis seviye+tohum ciftinden bulmacayi (endpoints) yeniden uretir -
// istemci ve sunucu bagimsiz olarak generatePuzzle() ile ayni sonuca ulasir,
// o yuzden ham endpoints kaydetmeye/guvenmeye gerek yok.
function restore(saved) {
  level = Number(saved.level) || 1;
  seed = saved.seed;
  runId = saved.runId ?? null;
  moves = Number(saved.moves) || 0;

  const puzzle = generatePuzzle(level, seed);
  size = puzzle.size;
  endpoints = puzzle.endpoints;
  paths = (Array.isArray(saved.paths) ? saved.paths : endpoints.map(() => [])).map((p) => [...p]);

  buildBoard();
  renderAll();
}

function goHome() {
  window.location.href = '../../index.html';
}

async function buildLevel() {
  moves = 0;
  locked = false;

  const run = await startRun(GAME_ID);
  if (run) {
    seed = run.seed;
    runId = run.runId;
    level = run.level;
  } else {
    seed = yerelTohum();
    runId = null;
  }

  const puzzle = generatePuzzle(level, seed);
  size = puzzle.size;
  endpoints = puzzle.endpoints;
  paths = endpoints.map(() => []);

  hideOverlay();
  clearState(GAME_ID);
  buildBoard();
  renderAll();
  persist();
}

function cellOwner(cellIndex) {
  for (let c = 0; c < paths.length; c++) {
    if (paths[c].includes(cellIndex)) return c;
  }
  return -1;
}

function isEndpoint(cellIndex, color) {
  return endpoints[color][0] === cellIndex || endpoints[color][1] === cellIndex;
}

function adjacent(a, b) {
  const n = size;
  const ra = Math.floor(a / n), ca = a % n;
  const rb = Math.floor(b / n), cb = b % n;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

function endsMatch(path, color) {
  if (path.length < 2) return false;
  const [a, b] = endpoints[color];
  const first = path[0], last = path[path.length - 1];
  return (first === a && last === b) || (first === b && last === a);
}

function isSolved() {
  const allConnected = paths.every((p, color) => endsMatch(p, color));
  if (!allConnected) return false;

  const filled = paths.reduce((sum, p) => sum + p.length, 0);
  return filled === size * size;
}

function startDragAt(cellIndex) {
  if (locked) return;

  const endpointColor = endpoints.findIndex(([a, b]) => a === cellIndex || b === cellIndex);
  if (endpointColor !== -1) {
    drag = { color: endpointColor };
    paths[endpointColor] = [cellIndex];
    render();
    return;
  }

  const owner = cellOwner(cellIndex);
  if (owner === -1) return;
  const path = paths[owner];
  const pos = path.indexOf(cellIndex);
  if (pos === -1) return;

  paths[owner] = path.slice(0, pos + 1);
  drag = { color: owner };
  render();
}

function extendDragTo(cellIndex) {
  if (!drag) return;
  const { color } = drag;
  const path = paths[color];
  const last = path[path.length - 1];

  if (cellIndex === last) return;

  if (path.length > 1 && path[path.length - 2] === cellIndex) {
    path.pop();
    render();
    return;
  }

  if (!adjacent(last, cellIndex)) return;

  const owner = cellOwner(cellIndex);
  const isOwnOtherEnd = isEndpoint(cellIndex, color) && cellIndex !== path[0];

  const endpointOwner = endpoints.findIndex(([a, b]) => a === cellIndex || b === cellIndex);
  if (endpointOwner !== -1 && endpointOwner !== color) return;

  if (owner !== -1 && owner !== color) return;
  if (path.includes(cellIndex)) return;

  path.push(cellIndex);
  render();

  if (isOwnOtherEnd) endDrag();
}

function endDrag() {
  if (!drag) return;
  const { color } = drag;
  drag = null;

  const path = paths[color];
  const connected = endsMatch(path, color);

  if (!connected) {
    paths[color] = [path[0]];
  } else {
    moves++;
    haptic.tap();
    SFX.match();
  }

  render();
  persist();

  if (isSolved()) finishLevel();
}

function undoLast() {
  if (locked) return;
  let target = -1;
  let maxLen = 0;
  paths.forEach((p, i) => {
    const complete = p.length > 1 && p[0] === endpoints[i][0] && p[p.length - 1] === endpoints[i][1];
    if (complete && p.length > maxLen) { maxLen = p.length; target = i; }
  });
  if (target === -1) return;

  paths[target] = [endpoints[target][0]];
  haptic.tap();
  render();
  persist();
}

// Sunucu-dogrulamali (runId var) modda son cozumu (paths) gonderir; sunucu
// bagimsiz olarak generatePuzzle(level,seed) ile ayni bulmacayi uretip
// validateSolution() ile dogrular. Misafirde/basarisizlikta eski
// (dogrulamasiz) submitScore+addPoints akisina duser.
async function finishLevelRun() {
  const result = runId ? await finishRun(GAME_ID, runId, { paths }) : null;
  if (result) return { best: result.best, earned: result.earned };

  const bestSonuc = await submitScore(GAME_ID, level);
  await addPoints(POINTS_PER_LEVEL);
  return { best: bestSonuc.best, earned: POINTS_PER_LEVEL };
}

async function finishLevel() {
  locked = true;
  haptic.success();
  SFX.goldenPickup();
  clearState(GAME_ID);
  boardEl.classList.add('solved');

  const { best, earned } = await finishLevelRun();
  bestLevel = best;
  bestEl.textContent = bestLevel;

  const text = `${t('levelResult', { moves })} ${t('earnedPoints', { points: earned })}`;
  showOverlay(t('levelDone'), text, t('nextLevel'), () => { level += 1; buildLevel(); });
}

function persist() {
  if (locked) return;
  saveState(GAME_ID, { level, moves, seed, runId, paths });
}

function buildBoard() {
  boardEl.style.setProperty('--cols', size);
  boardEl.classList.remove('solved');
  boardEl.textContent = '';
  cellEls = [];

  for (let i = 0; i < size * size; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    boardEl.appendChild(el);
    cellEls.push(el);
  }
}

function renderAll() {
  levelEl.textContent = level;
  render();
}

function render() {
  cellEls.forEach((el) => {
    el.className = 'cell';
    el.style.removeProperty('--cell-color');
    el.style.removeProperty('--tl');
    el.style.removeProperty('--tr');
    el.style.removeProperty('--br');
    el.style.removeProperty('--bl');
  });

  paths.forEach((path, color) => {
    const hex = COLORS[color];
    path.forEach((cellIndex, i) => {
      const el = cellEls[cellIndex];
      el.classList.add('filled');
      el.style.setProperty('--cell-color', hex);

      const prev = path[i - 1];
      const next = path[i + 1];
      setCorners(el, cellIndex, [prev, next].filter((v) => v !== undefined));

      if (isEndpoint(cellIndex, color)) el.classList.add('endpoint');
    });
  });

  endpoints.forEach((pair, color) => {
    pair.forEach((cellIndex) => {
      const el = cellEls[cellIndex];
      if (el.classList.contains('filled')) {
        el.classList.add('endpoint');
        return;
      }
      el.classList.add('filled', 'endpoint');
      el.style.setProperty('--cell-color', COLORS[color]);
      setCorners(el, cellIndex, []);
    });
  });

  undoBtn.disabled = locked || !paths.some((p) => p.length > 1);
}

function setCorners(el, cellIndex, neighborsInPath) {
  const n = size;
  const r = Math.floor(cellIndex / n), c = cellIndex % n;

  const dirs = { top: false, bottom: false, left: false, right: false };
  for (const nb of neighborsInPath) {
    const nr = Math.floor(nb / n), nc = nb % n;
    if (nr === r - 1) dirs.top = true;
    else if (nr === r + 1) dirs.bottom = true;
    else if (nc === c - 1) dirs.left = true;
    else if (nc === c + 1) dirs.right = true;
  }

  const R = '10px';
  el.style.setProperty('--tl', dirs.top || dirs.left ? '2px' : R);
  el.style.setProperty('--tr', dirs.top || dirs.right ? '2px' : R);
  el.style.setProperty('--br', dirs.bottom || dirs.right ? '2px' : R);
  el.style.setProperty('--bl', dirs.bottom || dirs.left ? '2px' : R);
}

function cellFromPoint(x, y) {
  const rect = boardEl.getBoundingClientRect();
  const styles = getComputedStyle(boardEl);
  const gap = parseFloat(styles.gap) || 0;
  const pad = parseFloat(styles.paddingLeft) || 0;
  const cell = (rect.width - pad * 2 - gap * (size - 1)) / size;

  const c = Math.floor((x - rect.left - pad) / (cell + gap));
  const r = Math.floor((y - rect.top - pad) / (cell + gap));
  if (r < 0 || r >= size || c < 0 || c >= size) return -1;
  return r * size + c;
}

boardEl.addEventListener('pointerdown', (e) => {
  const cellIndex = cellFromPoint(e.clientX, e.clientY);
  if (cellIndex === -1) return;
  startDragAt(cellIndex);
});

boardEl.addEventListener('pointermove', (e) => {
  if (!drag) return;
  e.preventDefault();
  const cellIndex = cellFromPoint(e.clientX, e.clientY);
  if (cellIndex === -1) return;
  extendDragTo(cellIndex);
});

boardEl.addEventListener('pointerup', endDrag);
boardEl.addEventListener('pointercancel', endDrag);
boardEl.addEventListener('pointerleave', () => {
  if (drag) endDrag();
});

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
