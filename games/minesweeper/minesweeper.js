/* Mayin Tarlasi (Minesweeper)

   Hucrelere dokunup aciyorsun; sayilar komsu mayin sayisini soyluyor.
   Mayin oldugunu dusundugun hucreyi bayrakla isaretle. Butun mayin
   OLMAYAN hucreleri acinca bolum biter.

   Bu surumun klasikten farki: tahtalar TAHMIN GEREKTIRMEZ. Klasik mayin
   tarlasinda oyun bazen seni yazi-tura atmaya zorlar - iki hucreden biri
   mayindir ama hangisi oldugunu anlamanin mantiksal bir yolu yoktur.
   Burada tahtayi urettikten sonra bir cozucuye veriyoruz: sadece mantikla
   sonuna kadar cozulemiyorsa tahtayi atip yenisini uretiyoruz. Yani
   kaybettiysen gercekten bir cikarim hatasi yapmissindir.

   Ilk dokunus da her zaman guvenlidir: mayinlar ilk dokunustan SONRA,
   dokundugun hucrenin ve komsularinin disina yerlestirilir. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v33';
import { submitScore, addPoints, getBest, saveState, loadState, clearState } from '../../js/store.js?v33';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js?v33';

const GAME_ID = 'minesweeper';
/* EKONOMI DENGESI

   Butun oyunlar dakikada yaklasik AYNI jetonu vermeli - yoksa oyuncu en
   verimli oyunu bulup sadece onu oynuyor, digerleri olu yatiriyor.

   Olculen durum (kod uzerinden modellendi): en dusuk 8 jeton/dk (Mayin
   Tarlasi), en yuksek 136 jeton/dk (2048) - arada 17 KAT fark vardi.
   Asagidaki sabit, hedef olan ~60 jeton/dk'ya gore secildi.

   Model her oyunun kendi puanlama mekanigi + makul bir oturum suresi
   varsayimina dayaniyor; gercek oyuncu verisi geldiginde bu sayilar
   yeniden ayarlanmali. */
const POINTS_PER_LEVEL = 150; /* bolum ~2,5 dk surer */

registerTexts(GAME_ID, {
  title: 'Mayın Tarlası',
  subtitle: 'Tahmin yok, sadece mantık',
  level: 'BÖLÜM',
  mines: 'MAYIN',
  bestLevel: 'EN İYİ',
  howToPlay: 'Yardım',
  restart: 'Yeniden',
  backToHub: "Hub'a dön",
  hint: 'Güvenli kareleri aç. Mayınları oyun senin için işaretler.',
  tutorialTitle: 'Nasıl oynanır',
  tutorialRule: 'Sayı, o karenin çevresindeki mayın sayısını gösterir.',
  tutorialAuto: 'Kesin olan mayınları oyun senin için işaretler. Sen sadece güvenli kareleri aç.',
  tutorialStart: 'Başla',
  levelDone: 'Bölüm temiz!',
  nextLevel: 'Sonraki bölüm',
  levelResult: '{mines} mayının hepsini buldun.',
  earnedPoints: '+{points} hub puanı kazandın.',
  boom: 'Mayına bastın',
  playAgain: 'Yeniden oyna',
  reached: '{level}. bölüme kadar geldin.',
});

const TUTORIAL_SEEN_KEY = 'mh_minesweeper_seen';

const boardEl = document.getElementById('board');
const levelEl = document.getElementById('level');
const minesEl = document.getElementById('mines');
const bestEl = document.getElementById('best');
const tutorialEl = document.getElementById('tutorial');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let size = 6;
let mineCount = 5;
let mines = new Set();     /* mayinlarin hucre indeksleri */
let open = new Set();      /* acilmis hucreler */
let flags = new Set();     /* bayrakli hucreler */
let placed = false;        /* mayinlar yerlestirildi mi (ilk dokunustan sonra) */
let level = 1;
let bestLevel = 1;
let locked = false;
let cellEls = [];

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
document.getElementById('how-to').addEventListener('click', () => {
  haptic.tap();
  showTutorial();
});
document.getElementById('tutorial-btn').addEventListener('click', () => {
  haptic.tap();
  hideTutorial();
});
document.addEventListener('langchange', () => applyStaticTexts());

bootstrap();

async function bootstrap() {
  bestLevel = (await getBest(GAME_ID)) || 1;
  bestEl.textContent = bestLevel;

  const saved = await loadState(GAME_ID);
  if (saved && Number(saved.size) > 0 && Array.isArray(saved.mines)) {
    level = Number(saved.level) || 1;
    size = Number(saved.size);
    mineCount = Number(saved.mineCount) || saved.mines.length;
    mines = new Set(saved.mines);
    open = new Set(saved.open || []);
    flags = new Set(saved.flags || []);
    placed = true;
    locked = false;
    buildBoard();
    renderAll();
  } else {
    buildLevel(1);
  }

  /* Ilk kez oynuyorsa kisa anlatimi goster */
  let gorulmus = false;
  try {
    gorulmus = localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch {
    gorulmus = true; /* depolama kapaliysa her acilista gostermeyelim */
  }
  if (!gorulmus) showTutorial();
}

function showTutorial() {
  tutorialEl.hidden = false;
}

function hideTutorial() {
  tutorialEl.hidden = true;
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    /* depolama kapali olabilir, sorun degil */
  }
}

function goHome() {
  window.location.href = '../../index.html';
}

/* ---------- Zorluk egrisi ---------- */

/* Zorluk hem izgara buyuyerek hem mayin yogunlugu artarak yukselir.
   Yogunlugun ust siniri bilerek 0.20'de tutuldu: daha yukarisi tahmin
   gerektirmeyen tahta bulmayi zorlastirir ve uretici yedege dusebilir. */
function sizeFor(levelNo) {
  return Math.min(6 + Math.floor((levelNo - 1) / 3), 10);
}

function minesFor(levelNo, gridSize) {
  const density = Math.min(0.13 + (levelNo - 1) * 0.005, 0.20);
  return Math.max(4, Math.round(gridSize * gridSize * density));
}

/* ---------- Bolum kurulumu ---------- */

function buildLevel(levelNo) {
  level = levelNo;
  size = sizeFor(levelNo);
  mineCount = minesFor(levelNo, size);
  mines = new Set();
  open = new Set();
  flags = new Set();
  placed = false;
  locked = false;

  hideOverlay();
  clearState(GAME_ID);
  buildBoard();
  renderAll();
}

/* ---------- Izgara yardimcilari ---------- */

function neighbors(index) {
  const r = Math.floor(index / size);
  const c = index % size;
  const list = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) list.push(rr * size + cc);
    }
  }
  return list;
}

function adjacentMines(index, mineSet = mines) {
  return neighbors(index).filter((n) => mineSet.has(n)).length;
}

/* ---------- Mayin yerlestirme (tahmin gerektirmeyen) ---------- */

/* Ilk dokunulan hucre ve komsulari mayinsiz kalir, boylece ilk dokunus
   her zaman bir alan acar. Sonra tahtayi cozucuye veriyoruz; mantikla
   tam cozulemiyorsa yeniden deniyoruz. */
function placeMines(safeIndex) {
  const total = size * size;
  const forbidden = new Set([safeIndex, ...neighbors(safeIndex)]);
  const candidates = [];
  for (let i = 0; i < total; i++) if (!forbidden.has(i)) candidates.push(i);

  /* Cok kucuk tahtada mayin sayisi sigmayabilir - guvenlik siniri */
  const count = Math.min(mineCount, candidates.length);

  let fallback = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const pool = candidates.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const candidate = new Set(pool.slice(0, count));
    if (!fallback) fallback = candidate;
    if (solvableWithoutGuessing(candidate, safeIndex)) return candidate;
  }

  /* 400 denemede tahmin gerektirmeyen tahta bulunamadiysa (cok nadir)
     elimizdekiyle devam ederiz - oyun yine oynanabilir. */
  return fallback;
}

/* Tahtayi sadece mantik kurallariyla cozmeye calisir.
   Kural 1: bir sayinin bayraklari tamamsa, kalan komsulari guvenlidir.
   Kural 2: bir sayinin eksigi kadar kapali komsusu varsa, hepsi mayindir.
   Kural 3 (alt kume): A'nin kapali komsulari B'ninkinin icindeyse, aradaki
   fark kadar mayin farkindan cikarim yapilir - "1-2 deseni" boyle cozulur. */
function solvableWithoutGuessing(mineSet, startIndex) {
  const total = size * size;
  const seen = new Set();
  const marked = new Set();

  const reveal = (index) => {
    if (seen.has(index) || marked.has(index) || mineSet.has(index)) return;
    seen.add(index);
    if (adjacentMines(index, mineSet) === 0) neighbors(index).forEach(reveal);
  };

  reveal(startIndex);

  const hiddenAround = (index) =>
    neighbors(index).filter((n) => !seen.has(n) && !marked.has(n));
  const flagsAround = (index) =>
    neighbors(index).filter((n) => marked.has(n)).length;

  let progress = true;
  while (progress) {
    progress = false;

    /* Kural 1 ve 2 */
    for (const index of [...seen]) {
      const hidden = hiddenAround(index);
      if (!hidden.length) continue;
      const need = adjacentMines(index, mineSet) - flagsAround(index);

      if (need === 0) {
        hidden.forEach(reveal);
        progress = true;
      } else if (need === hidden.length) {
        hidden.forEach((n) => marked.add(n));
        progress = true;
      }
    }
    if (progress) continue;

    /* Kural 3: alt kume karsilastirmasi (sadece yakin hucreler arasinda) */
    const active = [...seen].filter((i) => hiddenAround(i).length > 0);
    for (const a of active) {
      const ha = hiddenAround(a);
      const na = adjacentMines(a, mineSet) - flagsAround(a);

      for (const b of active) {
        if (a === b) continue;
        const ra = Math.floor(a / size), ca = a % size;
        const rb = Math.floor(b / size), cb = b % size;
        if (Math.abs(ra - rb) > 2 || Math.abs(ca - cb) > 2) continue;

        const hb = hiddenAround(b);
        if (!ha.every((x) => hb.includes(x))) continue; /* ha, hb'nin alt kumesi mi */

        const diff = hb.filter((x) => !ha.includes(x));
        if (!diff.length) continue;
        const nb = adjacentMines(b, mineSet) - flagsAround(b);

        if (nb - na === 0) {
          diff.forEach(reveal);
          progress = true;
        } else if (nb - na === diff.length) {
          diff.forEach((x) => marked.add(x));
          progress = true;
        }
      }
      if (progress) break;
    }
  }

  return seen.size === total - mineSet.size;
}

/* ---------- Oynanis ---------- */

function onCellTap(index) {
  if (locked) return;
  if (!tutorialEl.hidden) return; /* anlatim ekrani acikken tahta pasif */

  /* Bayrakli hucre = kesin mayin. Kazara dokunup kaybetmeyi engelliyoruz. */
  if (flags.has(index)) return;

  /* Ilk dokunus: mayinlari simdi yerlestiriyoruz ki bu hucre guvenli olsun */
  if (!placed) {
    mines = placeMines(index);
    placed = true;
  }

  if (mines.has(index)) return loseGame(index);

  revealFrom(index);
  autoFlag();
  haptic.tap();
  renderAll();
  persist();

  if (open.size === size * size - mines.size) finishLevel();
}

function revealFrom(index) {
  if (open.has(index) || flags.has(index)) return;
  open.add(index);
  if (adjacentMines(index) === 0) neighbors(index).forEach(revealFrom);
}

/* Kesin oldugu ispatlanabilen mayinlari oyuncu adina isaretler.

   Kural: bir sayinin kapali komsu sayisi, o sayidan (zaten isaretlenmisler
   dusuldukten sonra) geriye kalana esitse, o komsularin HEPSI mayindir.
   Bayrak koymak oyuncunun isi olmaktan cikiyor - ki kafa karistiran
   "Kaz/Bayrak" kipini bu sayede tamamen kaldirabildik. Oyuncuya kalan is
   guvenli kareleri bulmak, yani oyunun asil dusunme kismi. */
function autoFlag() {
  let progress = true;
  while (progress) {
    progress = false;
    for (const index of open) {
      const hidden = neighbors(index).filter((n) => !open.has(n) && !flags.has(n));
      if (!hidden.length) continue;

      const need = adjacentMines(index) - neighbors(index).filter((n) => flags.has(n)).length;
      if (need === hidden.length) {
        hidden.forEach((n) => flags.add(n));
        progress = true;
      }
    }
  }
}

async function loseGame(index) {
  locked = true;
  haptic.error();
  clearState(GAME_ID);

  /* Butun mayinlari goster, basilani ayrica vurgula */
  renderAll();
  for (const m of mines) cellEls[m].classList.add('mine');
  cellEls[index].classList.add('boom');

  const result = await submitScore(GAME_ID, level);
  bestLevel = result.best;
  bestEl.textContent = bestLevel;

  showOverlay(t('boom'), t('reached', { level }), t('playAgain'), () => buildLevel(1));
}

async function finishLevel() {
  locked = true;
  haptic.success();
  clearState(GAME_ID);
  boardEl.classList.add('cleared');

  const result = await submitScore(GAME_ID, level);
  bestLevel = result.best;
  bestEl.textContent = bestLevel;

  await addPoints(POINTS_PER_LEVEL);

  const text = `${t('levelResult', { mines: mines.size })} ${t('earnedPoints', { points: POINTS_PER_LEVEL })}`;
  showOverlay(t('levelDone'), text, t('nextLevel'), () => buildLevel(level + 1));
}

function persist() {
  if (locked || !placed) return;
  saveState(GAME_ID, {
    level, size, mineCount,
    mines: [...mines],
    open: [...open],
    flags: [...flags],
  });
}

/* ---------- Ekrana cizme ---------- */

function buildBoard() {
  boardEl.style.setProperty('--cols', size);
  boardEl.classList.remove('cleared');
  boardEl.textContent = '';
  cellEls = [];

  for (let i = 0; i < size * size; i++) {
    const el = document.createElement('button');
    el.className = 'cell';
    el.type = 'button';
    el.addEventListener('click', () => onCellTap(i));
    boardEl.appendChild(el);
    cellEls.push(el);
  }
}

function renderAll() {
  levelEl.textContent = format(level);
  minesEl.textContent = format(Math.max(0, (placed ? mines.size : mineCount) - flags.size));

  cellEls.forEach((el, i) => {
    el.className = 'cell';
    el.removeAttribute('data-n');
    el.textContent = '';

    if (flags.has(i)) {
      el.classList.add('flag');
      el.textContent = '🚩';
      return;
    }
    if (!open.has(i)) return;

    el.classList.add('open');
    const n = adjacentMines(i);
    if (n > 0) {
      el.dataset.n = n;
      el.textContent = n;
    }
  });
}

const format = (n) => Number(n).toLocaleString(locale());

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
