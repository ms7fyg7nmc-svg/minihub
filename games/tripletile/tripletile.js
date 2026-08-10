/* Uclu Eslestir (Triple Tile)

   Tahtada ust uste binmis taslar var. Sadece uzerinde baska tas OLMAYAN
   taslara dokunabilirsin; dokundugun tas alttaki 7 gozlu rafa gider.
   Rafta ayni cesitten uc tane birikince patlar ve yer acilir.
   Raf dolar da uclu olusmazsa oyun biter.

   Bolum uretimi: taslar rastgele dagitilmaz. Bos tahtadan geriye dogru
   calisiriz - her adimda o an oynanabilir durumdaki uc tasi secip ayni
   cesidi veririz. Boylece her bolumun cozumu kesin vardir. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v25';
import { submitScore, addPoints, getBest, saveState, loadState, clearState } from '../../js/store.js?v25';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js?v25';

const GAME_ID = 'tripletile';
/* EKONOMI DENGESI

   Butun oyunlar dakikada yaklasik AYNI jetonu vermeli - yoksa oyuncu en
   verimli oyunu bulup sadece onu oynuyor, digerleri olu yatiriyor.

   Olculen durum (kod uzerinden modellendi): en dusuk 8 jeton/dk (Mayin
   Tarlasi), en yuksek 136 jeton/dk (2048) - arada 17 KAT fark vardi.
   Asagidaki sabit, hedef olan ~60 jeton/dk'ya gore secildi.

   Model her oyunun kendi puanlama mekanigi + makul bir oturum suresi
   varsayimina dayaniyor; gercek oyuncu verisi geldiginde bu sayilar
   yeniden ayarlanmali. */
const POINTS_DIVISOR = 6;   /* ~6 dk, ~2.100 skor -> ~350 jeton */
const SLOTS = 7;            /* raftaki goz sayisi */
const TRIPLE_SCORE = 30;    /* bir uclu kac puan */
const LEVEL_BONUS = 100;    /* tahtayi bitirince bolum basina bonus */

registerTexts(GAME_ID, {
  title: 'Üçlü Eşleştir',
  subtitle: 'Aynı taştan üç tane topla',
  score: 'SKOR',
  level: 'BÖLÜM',
  best: 'REKOR',
  undo: 'Geri al',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Üstü açık bir taşa dokun. Üç aynı taş patlar.',
  gameOver: 'Raf doldu',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} hub puanı kazandın.',
});

/* Tas cesitleri: arka plan rengi + uzerindeki sekil.
   Birbirine karismasin diye hem renk hem sekil farkli. */
const KINDS = [
  { color: '#e2544e', icon: '🍎' },
  { color: '#f5b942', icon: '🍋' },
  { color: '#c079f2', icon: '🍇' },
  { color: '#4ecb8b', icon: '🥑' },
  { color: '#f2884b', icon: '🍊' },
  { color: '#5b8cff', icon: '💎' },
  { color: '#e2679c', icon: '🌸' },
  { color: '#3fc7d4', icon: '🔔' },
  { color: '#9aa87a', icon: '🍀' },
  { color: '#b0763f', icon: '⭐' },
];

/* Tahta 10 x 8 "yarim hucre" buyuklugunde. Bir tas 2 x 2 yarim hucre kaplar.
   Ust katlar yarim hucre kaydirildigi icin alttakilerin uzerine biner. */
const FIELD_W = 10;
const FIELD_H = 8;
const LAYERS = [
  { z: 0, xs: [0, 2, 4, 6, 8], ys: [0, 2, 4, 6] }, /* 20 yer */
  { z: 1, xs: [1, 3, 5, 7], ys: [1, 3, 5] },       /* 12 yer */
  { z: 2, xs: [2, 4, 6], ys: [2, 4] },             /*  6 yer */
];

const boardEl = document.getElementById('board');
const slotsEl = document.getElementById('slots');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const undoBtn = document.getElementById('undo');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let tiles = [];     /* tahtadaki taslar: { id, x, y, z, kind, el, taken } */
let slots = [];     /* raftaki taslar (cesitine gore sirali) */
let picked = [];    /* geri alma icin: rafa gonderilen taslarin sirasi */
let score = 0;
let best = 0;
let level = 1;
let busy = false;   /* patlama animasyonu sirasinda dokunmayi kapat */
let over = false;
let nextId = 1;

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
  startNewGame();
});
undoBtn.addEventListener('click', () => {
  haptic.tap();
  undo();
});

window.addEventListener('resize', layout);
document.addEventListener('langchange', () => applyStaticTexts());

bootstrap();

async function bootstrap() {
  best = await getBest(GAME_ID);
  bestEl.textContent = format(best);

  const saved = await loadState(GAME_ID);
  if (saved && Array.isArray(saved.tiles) && saved.tiles.length) {
    score = Number(saved.score) || 0;
    level = Number(saved.level) || 1;
    tiles = saved.tiles.map((tile) => ({ ...tile, id: nextId++, el: null, taken: false }));
    slots = (saved.slots || []).map((kind) => ({ kind }));
    picked = [];
    renderAll();
  } else {
    startNewGame();
  }
}

function goHome() {
  window.location.href = '../../index.html';
}

function startNewGame() {
  score = 0;
  level = 1;
  over = false;
  busy = false;
  clearState(GAME_ID);
  hideOverlay();
  buildLevel();
}

/* ---------- Bolum uretimi ---------- */

/* Bolum ilerledikce tas ve cesit sayisi artar */
function tileCountFor(levelNo) {
  return Math.min(18 + (levelNo - 1) * 6, 36); /* 3'un kati kalmali */
}

function kindCountFor(levelNo) {
  return Math.min(4 + Math.floor((levelNo - 1) / 2), KINDS.length);
}

function buildLevel() {
  const total = tileCountFor(level);
  const kinds = kindCountFor(level);

  const built = generate(total, kinds);
  tiles = built.map((tile) => ({ ...tile, id: nextId++, el: null, taken: false }));
  slots = [];
  picked = [];

  renderAll();
  persist();
}

/* Hangi kata kac tas konacagi.
   Ust katlar bilerek dar tutuldu: her ust tas alttaki dort yeri kapattigi
   icin tepeyi kalabalik yaparsak oyuncunun elinde cok az secenek kaliyor.
   Alt kat genis, tepe ince -> her an 6-8 tas oynanabilir durumda olur. */
const LAYER_SHAPES = {
  18: [10, 5, 3],
  24: [14, 7, 3],
  30: [18, 8, 4],
  36: [20, 12, 4],
};

function pickPositions(total) {
  const caps = LAYERS.map((l) => l.xs.length * l.ys.length);
  const counts = (LAYER_SHAPES[total] ?? LAYER_SHAPES[18]).map((n, i) => Math.min(n, caps[i]));

  /* Alt kat ortada toplu dursun (duzgun bir yigin gorunsun), ust katlar ise
     birbirinden uzaga dagilsin. Ust katlari da ortalarsak hepsi ust uste
     binip alttaki taslarin neredeyse tamamini kilitliyor. */
  const cx = (FIELD_W - 2) / 2;
  const cy = (FIELD_H - 2) / 2;

  const positions = [];
  LAYERS.forEach((layer, i) => {
    const spots = [];
    for (const x of layer.xs) for (const y of layer.ys) spots.push({ x, y, z: layer.z });

    let chosen;
    if (layer.z === 0) {
      /* Merkeze en yakin yerler (esitlikleri bozmak icin hafif rastgelelik) */
      const away = (p) => (p.x - cx) ** 2 + (p.y - cy) ** 2 + Math.random() * 3;
      chosen = spots.map((p) => ({ p, d: away(p) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, counts[i])
        .map(({ p }) => p);
    } else {
      chosen = spreadOut(spots, counts[i]);
    }
    positions.push(...chosen);
  });
  return positions;
}

/* Verilen yerlerden, birbirine en uzak olacak sekilde n tane secer */
function spreadOut(spots, n) {
  if (n >= spots.length) return spots.slice();

  const pool = spots.slice();
  shuffle(pool);
  const chosen = [pool.pop()];

  while (chosen.length < n && pool.length) {
    let bestIndex = 0;
    let bestGap = -1;
    pool.forEach((spot, i) => {
      const gap = Math.min(...chosen.map((c) => (c.x - spot.x) ** 2 + (c.y - spot.y) ** 2));
      if (gap > bestGap) { bestGap = gap; bestIndex = i; }
    });
    chosen.push(pool.splice(bestIndex, 1)[0]);
  }
  return chosen;
}

/* Bir tasin ustu acik mi: daha ust katta onunle cakisan tas var mi */
function isFree(list, index, alive) {
  const tile = list[index];
  for (const other of alive) {
    if (other === index) continue;
    const o = list[other];
    if (o.z <= tile.z) continue;
    if (Math.abs(o.x - tile.x) < 2 && Math.abs(o.y - tile.y) < 2) return false;
  }
  return true;
}

/* Cozulebilir bir bolum uretir: her adimda o an ustu acik olan uc tasa
   ayni cesidi verip onlari tahtadan kaldiririz. Bu sira oyunun cozumudur. */
function generate(total, kindCount) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const positions = pickPositions(total);
    const alive = new Set(positions.map((_, i) => i));
    const trios = [];
    let ok = true;

    while (alive.size) {
      const free = [...alive].filter((i) => isFree(positions, i, alive));
      if (free.length < 3) { ok = false; break; }
      shuffle(free);
      const trio = free.slice(0, 3);
      trios.push(trio);
      for (const i of trio) alive.delete(i);
    }

    if (!ok) continue;

    /* Cesitleri sirayla dagit: rastgele secseydik bir cesit tahtayi
       kaplayabilir, oyun hem cirkin hem kolay olurdu. */
    const pool = trios.map((_, i) => i % kindCount);
    shuffle(pool);
    trios.forEach((trio, i) => {
      for (const j of trio) positions[j].kind = pool[i];
    });
    return positions;
  }

  /* Buraya normalde hic gelinmez; gelinirse en kucuk bolumu kur */
  return pickPositions(18).map((p, i) => ({ ...p, kind: i % 3 }));
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

/* ---------- Oynanis ---------- */

function freeTiles() {
  const alive = new Set(tiles.map((_, i) => i).filter((i) => !tiles[i].taken));
  return [...alive].filter((i) => isFree(tiles, i, alive));
}

function onTileClick(index) {
  if (busy || over) return;
  const tile = tiles[index];
  if (tile.taken) return;
  if (!freeTiles().includes(index)) return; /* ustu kapali */

  tile.taken = true;
  tile.el.classList.add('taken');
  picked.push(index);

  /* Ayni cesitler yan yana dursun diye rafi cesite gore siralariz */
  slots.push({ kind: tile.kind });
  slots.sort((a, b) => a.kind - b.kind);

  haptic.tap();
  resolve();
}

async function resolve() {
  busy = true;

  const trio = findTriple();
  if (trio) {
    renderSlots(trio);
    haptic.success();
    await wait(240);
    slots = slots.filter((_, i) => !trio.includes(i));
    score += TRIPLE_SCORE;
    /* Patlayan taslar artik geri alinamaz */
    picked = [];
  }

  /* Cizimden once serbest birak, yoksa "Geri al" kilitli cizilir */
  busy = false;
  renderSlots();
  renderBoard();
  updateHud();
  persist();

  if (tiles.every((tile) => tile.taken)) return nextLevel();
  if (slots.length >= SLOTS) return endGame();
}

/* Rafta ayni cesitten uc tane var mi; varsa indekslerini dondurur */
function findTriple() {
  for (let i = 0; i + 2 < slots.length; i++) {
    if (slots[i].kind === slots[i + 1].kind && slots[i].kind === slots[i + 2].kind) {
      return [i, i + 1, i + 2];
    }
  }
  return null;
}

function undo() {
  if (busy || over || !picked.length) return;
  const index = picked.pop();
  const tile = tiles[index];

  /* Rafta o cesitten son eklenen bir tasi geri al */
  const slotIndex = slots.findIndex((s) => s.kind === tile.kind);
  if (slotIndex === -1) return;
  slots.splice(slotIndex, 1);

  tile.taken = false;
  renderSlots();
  renderBoard();
  persist();
}

async function nextLevel() {
  busy = true;
  const bonus = LEVEL_BONUS * level;
  score += bonus;
  level++;
  updateHud();
  haptic.success();
  await wait(400);
  buildLevel();
  updateHud();
  busy = false;
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

function persist() {
  if (over) return;
  saveState(GAME_ID, {
    tiles: tiles.filter((tile) => !tile.taken).map(({ x, y, z, kind }) => ({ x, y, z, kind })),
    slots: slots.map((s) => s.kind),
    score,
    level,
  });
}

/* ---------- Ekrana cizme ---------- */

function layout() {
  const half = boardEl.clientWidth / FIELD_W;
  boardEl.style.setProperty('--tile', `${half * 2}px`);
  for (const tile of tiles) {
    if (!tile.el) continue;
    tile.el.style.left = `${tile.x * half}px`;
    tile.el.style.top = `${tile.y * half}px`;
  }
}

function renderAll() {
  boardEl.textContent = '';

  for (const [index, tile] of tiles.entries()) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.zIndex = String(tile.z + 1);
    el.style.backgroundColor = KINDS[tile.kind].color;
    el.textContent = KINDS[tile.kind].icon;
    el.addEventListener('click', () => onTileClick(index));
    tile.el = el;
    boardEl.appendChild(el);
  }

  layout();
  renderBoard();
  renderSlots();
  updateHud();
}

/* Hangi taslarin oynanabilir oldugunu tazeler */
function renderBoard() {
  const free = new Set(freeTiles());
  for (const [index, tile] of tiles.entries()) {
    if (!tile.el) continue;
    tile.el.classList.toggle('taken', tile.taken);
    tile.el.classList.toggle('locked', !tile.taken && !free.has(index));
  }
}

/* clearing: patlama animasyonu oynatilacak goz indeksleri */
function renderSlots(clearing = []) {
  slotsEl.textContent = '';

  for (let i = 0; i < SLOTS; i++) {
    const el = document.createElement('div');
    el.className = 'slot';
    const filled = slots[i];
    if (filled) {
      el.classList.add('filled');
      el.style.backgroundColor = KINDS[filled.kind].color;
      el.textContent = KINDS[filled.kind].icon;
      if (clearing.includes(i)) el.classList.add('clearing');
    }
    slotsEl.appendChild(el);
  }

  slotsEl.classList.toggle('danger', slots.length >= SLOTS - 1);
  undoBtn.disabled = !picked.length || busy || over;
}

function updateHud() {
  scoreEl.textContent = format(score);
  levelEl.textContent = format(level);
  if (score > best) {
    best = score;
    bestEl.textContent = format(best);
  }
}

const format = (n) => Number(n).toLocaleString(locale());
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
