
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v247';
import { submitScore, getBest, saveState, loadState, clearState } from '../../js/store.js?v247';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v247';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v247';
import { yarimBirakmaOnayi } from '../../js/onay.js?v247';

const GAME_ID = 'tripletile';
const POINTS_DIVISOR = 6;
const SLOTS = 7;
const TRIPLE_SCORE = 30;
const LEVEL_BONUS = 100;
const BONUS_CAP_LEVEL = 12;
const SCORE_CAP = 3600;

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
  earnedPoints: '+{points} $MH kazandın.',
});

/* TASLARIN YUZU
   Onceki surumde bunlar EMOJI'ydi: tas renkli bir kare, ustunde bir
   emoji karakteri. Iki sorun vardi. Birincisi emoji yazi tipi cihazin:
   ayni oyun iPhone'da, Android'de ve masaustunde birbirine benzemeyen
   uc farkli set gosteriyordu. Ikincisi okunurluk - ustunde baska tas
   olan taslar brightness(0.45) ile karartiliyor ve kucucuk, ince
   detayli emoji o karartmada kayboluyordu.

   Artik hepsi tek sayfada, ayni elden cikma cizimler (assets/tripletile).
   Kalin siyah konturlu, iki-uc tonlu, 30 piksele kuculdugunde bile
   silueti okunan ikonlar - karartildiginda da duruyorlar.

   RENK SECIMI tesaduf degil. Karo rengi ikonun rengine yakin secildi
   ("kirmizi olan elma"), AMA hicbiri koyu degil: koyu bir karo zaten
   karartilinca siyaha dusuyordu. Iki yeni oge bu yuzden tersine gitti -
   altin sikke INDIGO uzerinde, mavi yumurta TERRAKOTA uzerinde; kendi
   renklerinin zittina oturduklari icin karartilmis halde bile
   secilebiliyorlar.

   SIRA onemli: kindCountFor() ilk N turu kullaniyor, yani bastaki
   dortlu her oyunda goruluyor. O dortlu (kirmizi/turkuaz/amber/mor)
   birbirinden en uzak renkler olacak sekilde dizildi; $MH sikkesi
   7. seviyede, ejderha yumurtasi 10. seviyede devreye giriyor. */
const KINDS = [
  { color: '#e2544e', img: 'apple' },
  { color: '#3fc7d4', img: 'bell' },
  { color: '#f5b942', img: 'lemon' },
  { color: '#c079f2', img: 'grape' },
  { color: '#4ecb8b', img: 'avocado' },
  { color: '#6c5ce7', img: 'mh' },       /* $MH sikkesi */
  { color: '#c9654f', img: 'egg' },      /* ejderha yumurtasi */
  { color: '#e2679c', img: 'flower' },
  { color: '#f2884b', img: 'orange' },
  { color: '#5b8cff', img: 'gem' },
  { color: '#8fbf3f', img: 'clover' },
  { color: '#b0763f', img: 'star' },
];

/* Gorsel yolu bir kez hesaplaniyor. document.baseURI uzerinden, cunku
   bu dosya games/tripletile/ altinda duruyor ve bagil bir yol CSS'e
   girdiginde yanlis coze biliyor (bkz. projedeki url()/var() tuzagi). */
const kindUrl = (i) => `url("${new URL(`../../assets/tripletile/${KINDS[i].img}.webp`, document.baseURI).href}")`;

/* Ilk kare cizilirken ikonlar henuz inmemis olmasin diye hepsi onceden
   istenir. Basarisiz olursa oyun yine calisir, sadece ikon gec gelir. */
function ikonlariOnYukle() {
  for (let i = 0; i < KINDS.length; i++) {
    const im = new Image();
    im.src = new URL(`../../assets/tripletile/${KINDS[i].img}.webp`, document.baseURI).href;
  }
}

const FIELD_W = 10;
const FIELD_H = 8;
const LAYERS = [
  { z: 0, xs: [0, 2, 4, 6, 8], ys: [0, 2, 4, 6] },
  { z: 1, xs: [1, 3, 5, 7], ys: [1, 3, 5] },
  { z: 2, xs: [2, 4, 6], ys: [2, 4] },
];

const boardEl = document.getElementById('board');
const slotsEl = document.getElementById('slots');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const undoBtn = document.getElementById('undo');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayIkon = document.getElementById('overlay-ikon');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let tiles = [];
let slots = [];
let picked = [];
let score = 0;
let best = 0;
let level = 1;
let busy = false;
let over = false;
let nextId = 1;

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
  if (!over) {
    /* Onay: "Yeni oyun" oyunun ortasinda basildiginda kosuyu bitiriyor.
       Dugme ekranin altinda, bastan sona parmaga yakin duruyor ve bir
       yanlis dokunus on dakikalik bir oyunu goturebiliyor. Soru sadece
       oyun DEVAM EDERKEN cikiyor; bitmis oyunda dogrudan calisiyor. */
    if (!(await yarimBirakmaOnayi(t))) return;
    await endGame();
    return;
  }
  startNewGame();
});
undoBtn.addEventListener('click', () => {
  haptic.tap();
  undo();
});

window.addEventListener('resize', layout);
document.addEventListener('langchange', () => applyStaticTexts());

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

ikonlariOnYukle();
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

function tileCountFor(levelNo) {
  return Math.min(18 + Math.floor((levelNo - 1) / 2) * 6, 36);
}

function kindCountFor(levelNo) {
  return Math.min(4 + Math.floor((levelNo - 1) / 3), KINDS.length);
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

const LAYER_SHAPES = {
  18: [10, 5, 3],
  24: [14, 7, 3],
  30: [18, 8, 4],
  36: [20, 12, 4],
};

function pickPositions(total) {
  const caps = LAYERS.map((l) => l.xs.length * l.ys.length);
  const counts = (LAYER_SHAPES[total] ?? LAYER_SHAPES[18]).map((n, i) => Math.min(n, caps[i]));

  const cx = (FIELD_W - 2) / 2;
  const cy = (FIELD_H - 2) / 2;

  const positions = [];
  LAYERS.forEach((layer, i) => {
    const spots = [];
    for (const x of layer.xs) for (const y of layer.ys) spots.push({ x, y, z: layer.z });

    let chosen;
    if (layer.z === 0) {
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

    const pool = trios.map((_, i) => i % kindCount);
    shuffle(pool);
    trios.forEach((trio, i) => {
      for (const j of trio) positions[j].kind = pool[i];
    });
    return positions;
  }

  return pickPositions(18).map((p, i) => ({ ...p, kind: i % 3 }));
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function freeTiles() {
  const alive = new Set(tiles.map((_, i) => i).filter((i) => !tiles[i].taken));
  return [...alive].filter((i) => isFree(tiles, i, alive));
}

function onTileClick(index) {
  if (busy || over) return;
  const tile = tiles[index];
  if (tile.taken) return;
  if (!freeTiles().includes(index)) return;

  tile.taken = true;
  tile.el.classList.add('taken');
  picked.push(index);

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
    SFX.match();
    await wait(240);
    slots = slots.filter((_, i) => !trio.includes(i));
    score = Math.min(score + TRIPLE_SCORE, SCORE_CAP);
    picked = [];
  }

  busy = false;
  renderSlots();
  renderBoard();
  updateHud();
  persist();

  if (tiles.every((tile) => tile.taken)) return nextLevel();
  if (slots.length >= SLOTS) return endGame();
}

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
  const bonus = LEVEL_BONUS * Math.min(level, BONUS_CAP_LEVEL);
  score = Math.min(score + bonus, SCORE_CAP);
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
  SFX.gameOver();

  /* KAZANCI SUNUCU HESAPLIYOR. Bolucu burada da duruyor ama yalnizca
     MISAFIR modu icin: sunucuya bagli bir hesapta gecerli sayi
     submitScore'un dondurdugu `odeme` sozünden geliyor. Eskiden istemci
     miktari kendisi soyluyordu ve sunucu ona inaniyordu. */
  const yerelKazanc = Math.floor(score / POINTS_DIVISOR);
  const result = await submitScore(GAME_ID, score, yerelKazanc);
  best = result.best;
  bestEl.textContent = format(best);

  const { earned } = await result.odeme;

  const lines = [t('yourScore', { score: format(score) })];
  if (result.isRecord) lines.push(t('newRecord'));
  if (earned > 0) lines.push(t('earnedPoints', { points: format(earned) }));

  showOverlay(t('gameOver'), lines.join(' · '), t('playAgain'), startNewGame,
              result.isRecord ? 'rekor' : 'bitti');
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
    el.style.backgroundImage = kindUrl(tile.kind);
    el.addEventListener('click', () => onTileClick(index));
    tile.el = el;
    boardEl.appendChild(el);
  }

  layout();
  renderBoard();
  renderSlots();
  updateHud();
}

function renderBoard() {
  const free = new Set(freeTiles());
  for (const [index, tile] of tiles.entries()) {
    if (!tile.el) continue;
    tile.el.classList.toggle('taken', tile.taken);
    tile.el.classList.toggle('locked', !tile.taken && !free.has(index));
  }
}

function renderSlots(clearing = []) {
  slotsEl.textContent = '';

  for (let i = 0; i < SLOTS; i++) {
    const el = document.createElement('div');
    el.className = 'slot';
    const filled = slots[i];
    if (filled) {
      el.classList.add('filled');
      el.style.backgroundColor = KINDS[filled.kind].color;
      el.style.backgroundImage = kindUrl(filled.kind);
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

/* `ikon` perdenin DURUMUNU anlatiyor: bitti / tamam / rekor / sure /
   kaza / kasa / seviye. Varsayilani 'bitti' - cagiran taraf bir sey
   soylemezse perde yine aciliyor, sadece notr ikonla. */
function showOverlay(title, text, buttonLabel, action, ikon = 'bitti') {
  overlayIkon.className = `overlay-ikon ik-${ikon}`;
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
