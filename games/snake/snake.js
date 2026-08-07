/* Yilan (Snake)

   Parmagini kaydirarak yon veriyorsun. Yem yedikce uzuyor ve hizlaniyor.
   Duvara ya da kendine carparsan oyun biter.

   Hub'daki tek gercek zamanli oyun - digerlerinin hepsi "istedigin kadar
   dusun" turunde. Ozellikle kural anlatmayi gerektirmedigi icin secildi:
   herkes ilk bakista ne yapacagini biliyor. */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js';
import { submitScore, addPoints, getBest, clearState } from '../../js/store.js';
import { registerTexts, t, applyStaticTexts, locale } from '../../js/i18n-hook.js';

const GAME_ID = 'snake';
const SIZE = 15;              /* izgara SIZE x SIZE */
const FOOD_SCORE = 10;        /* bir yem kac puan */
const POINTS_DIVISOR = 10;    /* her 10 oyun skoru = 1 hub puani */
const START_SPEED = 260;      /* ilk adim araligi (ms) */
const MIN_SPEED = 110;        /* en hizli hali */
const SPEED_STEP = 6;         /* her yemde kac ms hizlanir */

registerTexts(GAME_ID, {
  title: 'Yılan',
  subtitle: 'Ye, uza, çarpma',
  score: 'SKOR',
  best: 'REKOR',
  restart: 'Yeniden',
  backToHub: "Hub'a dön",
  hint: 'Yön vermek için parmağını kaydır (bilgisayarda ok tuşları).',
  readyTitle: 'Hazır mısın?',
  readyText: 'Yön vermek için parmağını kaydır. Duvara ve kendine çarpma.',
  startBtn: 'Başla',
  gameOver: 'Çarptın',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} hub puanı kazandın.',
});

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const startEl = document.getElementById('start');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let cellEls = [];
let snake = [];          /* [bas, ..., kuyruk] hucre indeksleri */
let dir = 1;             /* su anki yon (hucre farki) */
let nextDir = 1;         /* siradaki yon - tik basinda uygulanir */
let food = -1;
let score = 0;
let best = 0;
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

/* ---------- Tur kurulumu ---------- */

function resetGame() {
  stopTimer();
  running = false;
  over = false;
  score = 0;
  speed = START_SPEED;

  /* Ortada, saga bakan 3 halkalik yilan */
  const mid = Math.floor(SIZE / 2);
  const start = mid * SIZE + mid;
  snake = [start, start - 1, start - 2];
  dir = 1;
  nextDir = 1;

  placeFood();
  hideOverlay();
  startEl.hidden = false;
  updateHud();
  render();
}

function startRun() {
  startEl.hidden = true;
  running = true;
  scheduleTick();
}

/* ---------- Izgara yardimcilari ---------- */

const rowOf = (i) => Math.floor(i / SIZE);
const colOf = (i) => i % SIZE;

function placeFood() {
  const bos = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!snake.includes(i)) bos.push(i);
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

  /* Duvardan cikis: satir/sutun degisimi beklenenden farkliysa carpmistir */
  const hedef = head + dir;
  const yatay = dir === 1 || dir === -1;
  if (
    hedef < 0 || hedef >= SIZE * SIZE ||
    (yatay && rowOf(hedef) !== rowOf(head)) ||
    (!yatay && colOf(hedef) !== colOf(head))
  ) {
    return crash(head);
  }

  /* Kendine carpma. Kuyruk bu adimda ilerleyecegi icin son halka serbest -
     ama yem yediysek kuyruk yerinde kalir, o zaman son halka da dolu sayilir. */
  const yemVar = hedef === food;
  const govde = yemVar ? snake : snake.slice(0, -1);
  if (govde.includes(hedef)) return crash(hedef);

  snake.unshift(hedef);
  if (yemVar) {
    score += FOOD_SCORE;
    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    placeFood();
    haptic.tap();
    updateHud();
  } else {
    snake.pop();
  }

  render();
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

  const lines = [t('yourScore', { score: format(score) })];
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
  snake.forEach((i, k) => {
    cellEls[i].classList.add(k === 0 ? 'head' : 'body');
  });
  if (food >= 0) cellEls[food].classList.add('food');
}

function updateHud() {
  scoreEl.textContent = format(score);
  if (score > best) {
    best = score;
    bestEl.textContent = format(best);
  }
}

const format = (n) => Number(n).toLocaleString(locale());

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

window.addEventListener('keydown', (e) => {
  const d = KEYS[e.key];
  if (d === undefined) return;
  e.preventDefault();
  if (!running && !over) startRun();
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
