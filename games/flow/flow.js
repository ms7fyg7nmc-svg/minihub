/* Baglan (Flow Connect)

   Izgarada renkli nokta ciftleri var. Bir noktadan parmagini surukleyerek
   ayni renkteki digerine ulastir. Amac hem butun ciftleri baglamak hem de
   IZGARANIN HER HUCRESINI doldurmak - bos hucre kalirsa bolum bitmez.

   Bolum uretimi: once ızgarayi bastan sona tek bir yolla (Hamilton yolu)
   dolduran rastgele bir rota buluyoruz - bu rota otomatik olarak "cozulmus
   hal". Sonra bu rotayi N renge boluyoruz; her parcanin iki ucu oyuncuya
   gosterilen nokta ciftleri oluyor. Oyuncu tam olarak bizim rotamizi kopya
   etmek zorunda degil - hangi yoldan giderse gitsin, ciftler baglanip
   izgara dolarsa bolum biter. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js';
import { submitScore, addPoints, getBest, saveState, loadState, clearState } from '../../js/store.js';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js';

const GAME_ID = 'flow';
const POINTS_PER_LEVEL = 20; /* tamamlanan her bolum = 20 hub puani */

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
  earnedPoints: '+{points} hub points earned.',
});

/* Renk sirasi tripletile/match3 ile ayni palet - projede tutarlilik icin */
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

let size = 5;              /* izgara NxN */
let endpoints = [];         /* her renk icin [ucA, ucB] hucre indeksi */
let paths = [];             /* her renk icin oyuncunun cizdigi hucre dizisi */
let level = 1;
let bestLevel = 1;
let moves = 0;
let locked = false;
let cellEls = [];
let drag = null;            /* { color, } - suruklerken hangi renk aktif */

/* ---------- Baslangic ---------- */

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});
document.getElementById('new-game').addEventListener('click', () => {
  haptic.tap();
  buildLevel(level);
});
undoBtn.addEventListener('click', () => {
  haptic.tap();
  undoLast();
});
document.addEventListener('langchange', () => applyStaticTexts());

bootstrap();

async function bootstrap() {
  bestLevel = (await getBest(GAME_ID)) || 1;
  bestEl.textContent = bestLevel;

  const saved = await loadState(GAME_ID);
  if (saved && Array.isArray(saved.endpoints) && saved.endpoints.length) {
    level = Number(saved.level) || 1;
    moves = Number(saved.moves) || 0;
    size = Number(saved.size) || sizeFor(level);
    endpoints = saved.endpoints;
    paths = (saved.paths || endpoints.map(() => [])).map((p) => [...p]);
    buildBoard();
    renderAll();
  } else {
    buildLevel(1);
  }
}

function goHome() {
  window.location.href = '../../index.html';
}

/* ---------- Zorluk egrisi ---------- */

function sizeFor(levelNo) {
  return Math.min(5 + Math.floor((levelNo - 1) / 3), 8);
}

function colorCountFor(levelNo, gridSize) {
  const maxByColors = COLORS.length;
  const wanted = 3 + Math.floor((levelNo - 1) / 2);
  return Math.min(wanted, maxByColors, Math.floor((gridSize * gridSize) / 3));
}

/* ---------- Bolum uretimi ---------- */

function buildLevel(levelNo) {
  level = levelNo;
  moves = 0;
  locked = false;
  size = sizeFor(levelNo);
  const colorCount = colorCountFor(levelNo, size);

  const route = randomHamiltonianPath(size);
  const segments = splitIntoSegments(route, colorCount);

  endpoints = segments.map((seg) => [seg[0], seg[seg.length - 1]]);
  paths = endpoints.map(() => []);

  hideOverlay();
  clearState(GAME_ID);
  buildBoard();
  renderAll();
  persist();
}

/* Izgarayi bastan sona tek bir yolla dolduran bir rota bulur - "zikzak"
   taramasi: satir satir (ya da sutun sutun) ileri-geri gider. Onceki surumde
   rastgele backtracking (DFS + Warnsdorff) kullanilmisti; kucuk izgaralarda
   hizli calissa da 7x7 ve ustu boyutlarda bazen dakikalarca surebiliyordu ve
   sayfayi tamamen kilitliyordu. Zikzak yontemi HER ZAMAN O(n^2) surede biter,
   asla takilmaz. Cesitlilik icin tarama yonu rastgele secilir (8 varyasyon);
   asil rastgelelik zaten segment kesiminden (asagida) geliyor. */
function randomHamiltonianPath(n) {
  const idx = (r, c) => r * n + c;
  const path = [];

  const rowMajor = Math.random() < 0.5;      /* satir satir mi, sutun sutun mu */
  const reverseMajor = Math.random() < 0.5;  /* satirlar/sutunlar hangi uctan baslasin */
  const reverseMinor = Math.random() < 0.5;  /* ilk satir/sutun hangi yonde gitsin */

  const majorOrder = reverseMajor ? range(n).reverse() : range(n);

  majorOrder.forEach((major, i) => {
    const goForward = (i % 2 === 0) !== reverseMinor;
    const minorOrder = goForward ? range(n) : range(n).reverse();
    for (const minor of minorOrder) {
      path.push(rowMajor ? idx(major, minor) : idx(minor, major));
    }
  });

  return path;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

/* Uzun rotayi K parcaya boler; her parca en az 2 hucre olur */
function splitIntoSegments(route, count) {
  const total = route.length;
  const cuts = [0];
  while (cuts.length < count) {
    const point = 2 + Math.floor(Math.random() * (total - 2));
    if (!cuts.includes(point)) cuts.push(point);
  }
  cuts.sort((a, b) => a - b);
  cuts.push(total);

  const segments = [];
  for (let i = 0; i < count; i++) {
    const seg = route.slice(cuts[i], cuts[i + 1]);
    if (seg.length >= 2) segments.push(seg);
  }
  /* Kesim sansa bagli 1 hucrelik parca birakirsa, komsu parcayla birlestir */
  return segments.length === count ? segments : mergeShortSegments(route, count);
}

/* splitIntoSegments basarisiz olursa (cok nadir): rotayi esit araliklarla boler */
function mergeShortSegments(route, count) {
  const total = route.length;
  const step = total / count;
  const segments = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * step);
    const end = i === count - 1 ? total : Math.floor((i + 1) * step);
    segments.push(route.slice(start, Math.max(end, start + 2)));
  }
  return segments;
}

/* ---------- Oyun kurallari ---------- */

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

/* Bir rengin iki ucu var, hangisinden baslanip hangisinde bitildigi onemli
   degil - path'in iki ucu {a,b} kumesine (sirasiz) esit olmali. */
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

  /* Once bu hucre herhangi bir rengin SABIT ucu mu? (endpoints listesinde
     ariyoruz, paths'te degil - baslangicta paths hep bos dizidir) */
  const endpointColor = endpoints.findIndex(([a, b]) => a === cellIndex || b === cellIndex);
  if (endpointColor !== -1) {
    drag = { color: endpointColor };
    paths[endpointColor] = [cellIndex];
    render();
    return;
  }

  /* Degilse: cizili bir yolun ORTASINA dokunulmus olabilir - oradan
     itibaren kisaltip yeniden cizmeye izin ver (klasik "geri cekme") */
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

  /* Parmak geri gidiyorsa cizgiyi kisalt */
  if (path.length > 1 && path[path.length - 2] === cellIndex) {
    path.pop();
    render();
    return;
  }

  if (!adjacent(last, cellIndex)) return;

  const owner = cellOwner(cellIndex);
  /* "Diger uc" path'in HANGI ucundan baslandigina gore degisir - path[0]
     hangi endpoint ise, hedef otekisi olur (sabit endpoints[color][0] degil) */
  const isOwnOtherEnd = isEndpoint(cellIndex, color) && cellIndex !== path[0];

  if (owner !== -1 && owner !== color) return; /* baska rengin hucresi: gecilmez */
  if (path.includes(cellIndex)) return;         /* kendi uzerinden gecemez */

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
    /* Yarim birakildi: cizmeye NEREDEN basladiysa orada kalsin
       (sabit olarak endpoints[color][0]'a degil) */
    paths[color] = [path[0]];
  } else {
    moves++;
    haptic.tap();
  }

  render();
  persist();

  if (isSolved()) finishLevel();
}

function undoLast() {
  if (locked) return;
  /* En son dokunulan/en uzun rotayi sifirla - basit ve anlasilir bir geri al */
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

async function finishLevel() {
  locked = true;
  haptic.success();
  clearState(GAME_ID);
  boardEl.classList.add('solved');

  const result = await submitScore(GAME_ID, level);
  bestLevel = result.best;
  bestEl.textContent = bestLevel;

  await addPoints(POINTS_PER_LEVEL);

  const text = `${t('levelResult', { moves })} ${t('earnedPoints', { points: POINTS_PER_LEVEL })}`;
  showOverlay(t('levelDone'), text, t('nextLevel'), () => buildLevel(level + 1));
}

function persist() {
  if (locked) return;
  saveState(GAME_ID, { level, moves, size, endpoints, paths });
}

/* ---------- Ekrana cizme ---------- */

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

  /* Henuz baslanmamis renklerin uc noktalarini da kendi rengiyle goster,
     yoksa hangi noktanin hangi renge ait oldugu belli olmaz */
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

/* Hucrenin komsu baglantilarina gore hangi koselerin yuvarlanacagini hesaplar */
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

/* ---------- Dokunma / surukleme ---------- */

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
