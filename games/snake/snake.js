/* Yilan (Snake)

   Parmagini kaydirarak yon veriyorsun. Yem yiyip uzuyorsun; belli sayida
   yem yiyince BOLUM atliyorsun. Yeni bolumde haritaya engeller geliyor ve
   yilan yeniden kisaliyor.

   Neden boyle: ilk surumde yilan her yemde hem uzuyor hem hizlaniyordu,
   bir sure sonra kontrol edilemez hale geliyordu. Simdi hiz SADECE bolume
   bagli (bolum icinde sabit) ve her bolum basinda yilan tekrar 3 halkaya
   donuyor. Zorluk uzunluktan degil, haritaya eklenen engellerden geliyor -
   boylece oyun zorlasirken kontrol elde kaliyor.

   Hub'daki tek gercek zamanli oyun; kural anlatmayi gerektirmiyor. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js';
import { submitScore, addPoints, getBest, clearState } from '../../js/store.js';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js';

const GAME_ID = 'snake';
const INTRO_SEEN_KEY = 'mh_snake_seen'; /* giris ekrani bir kez gosterilir */

const SIZE = 15;               /* izgara SIZE x SIZE */
const START_LENGTH = 3;
const FOOD_SCORE = 10;         /* bir yem kac puan */
const LEVEL_BONUS = 50;        /* bolum atlayinca ek puan */
const POINTS_DIVISOR = 10;     /* her 10 oyun skoru = 1 hub puani */
const FOODS_PER_LEVEL = 5;     /* bu kadar yem yiyince bolum atlar */

/* Hiz sadece bolume gore degisir, bolum icinde sabittir */
const START_SPEED = 320;       /* 1. bolumdeki adim araligi (ms) */
const SPEED_PER_LEVEL = 12;    /* her bolumde bu kadar hizlanir */
const MIN_SPEED = 170;         /* asla bundan hizli olmaz */

const OBSTACLES_PER_LEVEL = 3; /* her bolumde eklenen engel sayisi */
const MAX_OBSTACLES = 24;

registerTexts(GAME_ID, {
  title: 'Yılan',
  subtitle: 'Ye, uza, çarpma',
  score: 'SKOR',
  level: 'BÖLÜM',
  best: 'REKOR',
  restart: 'Yeniden',
  backToHub: "Hub'a dön",
  hint: 'Yön vermek için parmağını kaydır (bilgisayarda ok tuşları).',
  readyTitle: 'Hazır mısın?',
  readyText: 'Yön vermek için parmağını kaydır. Duvara, engellere ve kendine çarpma.',
  startBtn: 'Başla',
  levelUp: 'Bölüm {level}',
  gameOver: 'Çarptın',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  reachedLevel: '{level}. bölüme kadar geldin.',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} hub puanı kazandın.',
});

const boardEl = document.getElementById('board');
const boardWrapEl = boardEl.parentElement;
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const startEl = document.getElementById('start');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let cellEls = [];
let snake = [];            /* [bas, ..., kuyruk] hucre indeksleri */
let walls = new Set();     /* engellerin hucre indeksleri */
let dir = 1;               /* su anki yon (hucre farki) */
let nextDir = 1;           /* siradaki yon - tik basinda uygulanir */
let food = -1;
let score = 0;
let best = 0;
let level = 1;
let eatenThisLevel = 0;
let speed = START_SPEED;
let timer = null;
let running = false;
let over = false;

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
  resetGame();
});
document.getElementById('start-btn').addEventListener('click', () => {
  haptic.tap();
  startRun();
});
document.addEventListener('langchange', () => applyStaticTexts());

/* Uygulama arka plana giderse yilan yoluna devam edip olmesin */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopTimer();
  else if (running && !over) scheduleTick();
});

buildBoard();
bootstrap();

async function bootstrap() {
  best = await getBest(GAME_ID);
  bestEl.textContent = format(best);
  clearState(GAME_ID); /* gercek zamanli oyun: yarim kalan tur saklanmiyor */
  resetGame();
}

function goHome() {
  window.location.href = '../../index.html';
}

/* ---------- Tur / bolum kurulumu ---------- */

function resetGame() {
  stopTimer();
  running = false;
  over = false;
  score = 0;
  level = 1;

  buildLevel();
  hideOverlay();
  updateHud();

  /* Nasil oynanacagini sadece ilk kez anlatiyoruz. Sonraki turlarda
     "Yeniden"e basan zaten ne yaptigini biliyor.

     Ilk turdan sonra oyunu KENDILIGINDEN baslatmiyoruz: yilan ilk dokunusa
     kadar yerinde bekliyor. Otomatik baslatinca sayfa acilir acilmaz saga
     dogru yuruyup birkac saniyede duvara carpiyordu - oyuncu daha ekrana
     bakmadan tur bitmis oluyordu. */
  startEl.hidden = introSeen();
}

/* Bolumu kurar: yilani ortaya koyar, engelleri dagitir, yemi yerlestirir */
function buildLevel() {
  eatenThisLevel = 0;
  speed = Math.max(MIN_SPEED, START_SPEED - (level - 1) * SPEED_PER_LEVEL);

  const mid = Math.floor(SIZE / 2);
  const start = mid * SIZE + mid;
  snake = [];
  for (let i = 0; i < START_LENGTH; i++) snake.push(start - i);
  dir = 1;
  nextDir = 1;

  walls = buildWalls(mid);
  placeFood();
  render();
}

/* Engelleri dagitir.

   Iki kural var: yilanin basladigi satira hic engel koymuyoruz (yoksa oyuncu
   daha tepki veremeden carpabilir), ve engeller haritayi ikiye bolmemeli -
   yerlestirdikten sonra bos hucrelerin hepsinin birbirine bagli oldugunu
   kontrol ediyoruz, degilse yeniden dagitiyoruz. */
function buildWalls(startRow) {
  const count = Math.min((level - 1) * OBSTACLES_PER_LEVEL, MAX_OBSTACLES);
  if (count === 0) return new Set();

  const yasak = new Set(snake);
  for (let c = 0; c < SIZE; c++) yasak.add(startRow * SIZE + c); /* baslangic satiri */

  const aday = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!yasak.has(i)) aday.push(i);

  for (let deneme = 0; deneme < 40; deneme++) {
    const havuz = aday.slice();
    for (let i = havuz.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [havuz[i], havuz[j]] = [havuz[j], havuz[i]];
    }
    const secilen = new Set(havuz.slice(0, count));
    if (hepsiBagli(secilen)) return secilen;
  }

  /* 40 denemede bolunmemis bir dagilim cikmazsa engelsiz devam et -
     zor bir bolum, imkansiz bir bolumden iyidir */
  return new Set();
}

/* Engeller disindaki tum hucreler tek parca mi (yilan her yere ulasabiliyor mu) */
function hepsiBagli(engeller) {
  const toplam = SIZE * SIZE - engeller.size;
  let bas = -1;
  for (let i = 0; i < SIZE * SIZE; i++) if (!engeller.has(i)) { bas = i; break; }
  if (bas === -1) return false;

  const gorulen = new Set([bas]);
  const kuyruk = [bas];
  while (kuyruk.length) {
    const cur = kuyruk.pop();
    for (const n of komsular(cur)) {
      if (engeller.has(n) || gorulen.has(n)) continue;
      gorulen.add(n);
      kuyruk.push(n);
    }
  }
  return gorulen.size === toplam;
}

function komsular(i) {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out = [];
  if (r > 0) out.push(i - SIZE);
  if (r < SIZE - 1) out.push(i + SIZE);
  if (c > 0) out.push(i - 1);
  if (c < SIZE - 1) out.push(i + 1);
  return out;
}

function introSeen() {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return true; /* depolama kapaliysa her turda gostermeyelim */
  }
}

function startRun() {
  startEl.hidden = true;
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* depolama kapali olabilir, sorun degil */
  }
  running = true;
  scheduleTick();
}

/* ---------- Izgara yardimcilari ---------- */

const rowOf = (i) => Math.floor(i / SIZE);
const colOf = (i) => i % SIZE;

function placeFood() {
  const bos = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!snake.includes(i) && !walls.has(i)) bos.push(i);
  }
  food = bos.length ? bos[Math.floor(Math.random() * bos.length)] : -1;
}

/* ---------- Oyun dongusu ---------- */

function scheduleTick() {
  stopTimer();
  timer = setTimeout(tick, speed);
}

function stopTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function tick() {
  if (!running || over) return;

  dir = nextDir;
  const head = snake[0];
  const hedef = head + dir;

  /* Duvardan cikis: satir/sutun degisimi beklenenden farkliysa carpmistir */
  const yatay = dir === 1 || dir === -1;
  if (
    hedef < 0 || hedef >= SIZE * SIZE ||
    (yatay && rowOf(hedef) !== rowOf(head)) ||
    (!yatay && colOf(hedef) !== colOf(head))
  ) {
    return crash(head);
  }

  if (walls.has(hedef)) return crash(hedef);

  /* Kendine carpma. Kuyruk bu adimda ilerleyecegi icin son halka serbest -
     ama yem yediysek kuyruk yerinde kalir, o zaman son halka da dolu sayilir. */
  const yemVar = hedef === food;
  const govde = yemVar ? snake : snake.slice(0, -1);
  if (govde.includes(hedef)) return crash(hedef);

  snake.unshift(hedef);
  if (yemVar) {
    score += FOOD_SCORE;
    eatenThisLevel++;
    haptic.tap();
    updateHud();

    if (eatenThisLevel >= FOODS_PER_LEVEL) return levelUp();
    placeFood();
  } else {
    snake.pop();
  }

  render();
  scheduleTick();
}

/* Bolum atlama: kisa bir duraklamayla yeni harita kuruluyor */
async function levelUp() {
  stopTimer();
  running = false;

  level++;
  score += LEVEL_BONUS;
  haptic.success();
  updateHud();
  showFloater(t('levelUp', { level: format(level) }));

  render();
  await wait(850);

  buildLevel();
  updateHud();
  running = true;
  scheduleTick();
}

async function crash(index) {
  over = true;
  running = false;
  stopTimer();
  haptic.error();

  render();
  if (cellEls[index]) cellEls[index].classList.add('crash');

  const result = await submitScore(GAME_ID, score);
  best = result.best;
  bestEl.textContent = format(best);

  const earned = Math.floor(score / POINTS_DIVISOR);
  if (earned > 0) await addPoints(earned);

  const lines = [t('yourScore', { score: format(score) }), t('reachedLevel', { level: format(level) })];
  if (result.isRecord) lines.push(t('newRecord'));
  if (earned > 0) lines.push(t('earnedPoints', { points: format(earned) }));

  showOverlay(t('gameOver'), lines.join(' · '), t('playAgain'), resetGame);
}

/* ---------- Ekrana cizme ---------- */

function buildBoard() {
  boardEl.style.setProperty('--cols', SIZE);
  boardEl.textContent = '';
  cellEls = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    boardEl.appendChild(el);
    cellEls.push(el);
  }
}

function render() {
  for (const el of cellEls) el.className = 'cell';
  for (const w of walls) cellEls[w].classList.add('wall');
  snake.forEach((i, k) => {
    cellEls[i].classList.add(k === 0 ? 'head' : 'body');
  });
  if (food >= 0) cellEls[food].classList.add('food');
}

function showFloater(text) {
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = '50%';
  el.style.top = '50%';
  boardWrapEl.appendChild(el);
  setTimeout(() => el.remove(), 800);
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

/* ---------- Kontroller ---------- */

/* Ters yone donmek yilani aninda kendine carptirir, engelliyoruz */
function setDir(d) {
  if (d === -dir) return;
  nextDir = d;
}

const KEYS = {
  ArrowUp: -SIZE, ArrowDown: SIZE, ArrowLeft: -1, ArrowRight: 1,
  w: -SIZE, s: SIZE, a: -1, d: 1,
};

/* Ilk hareket turu baslatir - yilan o ana kadar yerinde bekler */
function ensureRunning() {
  if (!running && !over) startRun();
}

window.addEventListener('keydown', (e) => {
  const d = KEYS[e.key];
  if (d === undefined) return;
  e.preventDefault();
  ensureRunning();
  setDir(d);
});

let touchStart = null;
const SWIPE_MIN = 18;

boardEl.addEventListener('pointerdown', (e) => {
  touchStart = { x: e.clientX, y: e.clientY };
});

boardEl.addEventListener('pointermove', (e) => {
  if (!touchStart) return;
  e.preventDefault();

  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;

  ensureRunning();
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1);
  else setDir(dy > 0 ? SIZE : -SIZE);

  /* Parmak basili kalirken art arda donebilsin diye baslangici tasi */
  touchStart = { x: e.clientX, y: e.clientY };
});

boardEl.addEventListener('pointerup', () => { touchStart = null; });
boardEl.addEventListener('pointercancel', () => { touchStart = null; });

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
