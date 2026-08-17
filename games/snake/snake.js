
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v71';
import { submitScore, addPoints, getBest, clearState, settleAbandonedRun } from '../../js/store.js?v71';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v71';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v71';

const GAME_ID = 'snake';
const INTRO_SEEN_KEY = 'mh_snake_seen';

const SIZE = 15;
const START_LENGTH = 3;
const FOOD_SCORE = 10;
const LEVEL_BONUS = 50;
const POINTS_DIVISOR = 5;
const FOODS_PER_LEVEL = 5;

const START_SPEED = 320;
const SPEED_PER_LEVEL = 12;
const MIN_SPEED = 170;

const OBSTACLES_PER_LEVEL = 3;
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
  earnedPoints: '+{points} $MH kazandın.',
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
let snake = [];
let walls = new Set();
let dir = 1;
let nextDir = 1;
let food = -1;
let score = 0;
let best = 0;
let level = 1;
let eatenThisLevel = 0;
let speed = START_SPEED;
let timer = null;
let running = false;
let over = false;

let gecis = false;

let altinYem = false;

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
  if (running && !over) await settleAbandonedRun(score, POINTS_DIVISOR);
  resetGame();
});
document.getElementById('start-btn').addEventListener('click', () => {
  haptic.tap();
  startRun();
});
document.addEventListener('langchange', () => applyStaticTexts());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopTimer();
  else if (running && !over) scheduleTick();
});

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

buildBoard();
bootstrap();

async function bootstrap() {
  best = await getBest(GAME_ID);
  bestEl.textContent = format(best);
  clearState(GAME_ID);
  resetGame();
}

function goHome() {
  window.location.href = '../../index.html';
}

function resetGame() {
  stopTimer();
  running = false;
  over = false;
  score = 0;
  level = 1;

  buildLevel();
  hideOverlay();
  updateHud();

  startEl.hidden = introSeen();
}

function buildLevel() {
  eatenThisLevel = 0;
  speed = Math.max(MIN_SPEED, START_SPEED - (level - 1) * SPEED_PER_LEVEL);

  const mid = Math.floor(SIZE / 2);
  const start = mid * SIZE + mid;
  snake = [];
  for (let i = 0; i < START_LENGTH; i++) snake.push(start - i);
  dir = 1;
  nextDir = 1;

  walls = buildWalls();
  placeFood();
  render();
}

function dortAyna(noktalar) {
  const s = new Set();
  for (const [r, c] of noktalar) {
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue;
    for (const rr of [r, SIZE - 1 - r]) {
      for (const cc of [c, SIZE - 1 - c]) s.add(rr * SIZE + cc);
    }
  }
  return s;
}

const DESENLER = [
  (n) => {
    const d = [];
    const uz = 2 + Math.min(2, n);
    for (let k = 0; k < uz; k++) { d.push([2, 2 + k]); d.push([2 + k, 2]); }
    return d;
  },
  (n) => {
    const d = [];
    const uz = 3 + Math.min(2, n);
    for (let k = 0; k < uz; k++) d.push([2 + k, 4]);
    return d;
  },
  (n) => {
    const d = [];
    const uz = 3 + Math.min(3, n);
    for (let k = 0; k < uz; k++) d.push([4, 1 + k]);
    return d;
  },
  (n) => {
    const d = [];
    const uz = 3 + Math.min(2, n);
    for (let k = 0; k < uz; k++) d.push([5 - k, 1 + k]);
    return d;
  },
  (n) => {
    const d = [[2, 2], [2, 5], [5, 2]];
    if (n >= 1) d.push([5, 5]);
    if (n >= 2) d.push([3, 3], [4, 4]);
    return d;
  },
  (n) => {
    const d = [];
    for (let r = 0; r <= 2 + Math.min(2, n); r++) d.push([r, 3]);
    return d;
  },
];

function buildWalls() {
  if (level < 2) return new Set();

  const sira = level - 2;
  const siklik = Math.floor(sira / DESENLER.length);

  for (let kaydir = 0; kaydir < DESENLER.length; kaydir++) {
    const desen = DESENLER[(sira + kaydir) % DESENLER.length];
    const engeller = dortAyna(desen(siklik));

    let cakisma = false;
    for (const i of engeller) {
      if (snake.includes(i) || rowOf(i) === Math.floor(SIZE / 2)) { cakisma = true; break; }
    }
    if (cakisma || engeller.size > MAX_OBSTACLES) continue;

    if (hepsiBagli(engeller)) return engeller;
  }

  return new Set();
}

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
    return true;
  }
}

function startRun() {
  if (gecis || over) return;
  startEl.hidden = true;
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
  }
  running = true;
  scheduleTick();
}

const rowOf = (i) => Math.floor(i / SIZE);
const colOf = (i) => i % SIZE;

function placeFood() {
  const bos = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!snake.includes(i) && !walls.has(i)) bos.push(i);
  }
  food = bos.length ? bos[Math.floor(Math.random() * bos.length)] : -1;
  altinYem = eatenThisLevel === FOODS_PER_LEVEL - 1;
}

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

  const yatay = dir === 1 || dir === -1;
  if (
    hedef < 0 || hedef >= SIZE * SIZE ||
    (yatay && rowOf(hedef) !== rowOf(head)) ||
    (!yatay && colOf(hedef) !== colOf(head))
  ) {
    return crash(head);
  }

  if (walls.has(hedef)) return crash(hedef);

  const yemVar = hedef === food;
  const govde = yemVar ? snake : snake.slice(0, -1);
  if (govde.includes(hedef)) return crash(hedef);

  snake.unshift(hedef);
  if (yemVar) {
    score += FOOD_SCORE;
    eatenThisLevel++;
    updateHud();

    if (eatenThisLevel >= FOODS_PER_LEVEL) {
      SFX.goldenPickup();
      haptic.success();
      altinPatlama(hedef);
      render();
      return levelUp();
    }
    SFX.pickup();
    haptic.tap();
    placeFood();
  } else {
    snake.pop();
  }

  render();
  scheduleTick();
}

async function levelUp() {
  stopTimer();
  running = false;
  gecis = true;

  level++;
  score += LEVEL_BONUS;
  haptic.success();
  updateHud();
  showFloater(t('levelUp', { level: format(level) }));

  render();
  await wait(850);

  buildLevel();
  updateHud();
  gecis = false;
  running = true;
  scheduleTick();
}

async function crash(index) {
  over = true;
  running = false;
  stopTimer();
  haptic.error();
  SFX.gameOver();

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

const YON_SINIFI = (d) => (
  d === 1 ? 'dir-right' : d === -1 ? 'dir-left' : d === SIZE ? 'dir-down' : 'dir-up'
);

function render() {
  for (const el of cellEls) el.className = 'cell';
  for (const w of walls) cellEls[w].classList.add('wall');

  snake.forEach((i, k) => {
    const el = cellEls[i];
    if (k === 0) {
      el.classList.add('head', YON_SINIFI(dir));
    } else if (k === snake.length - 1 && snake.length > 2) {
      el.classList.add('tail');
    } else {
      el.classList.add('body', k % 2 ? 'pul-b' : 'pul-a');
    }
  });

  if (food >= 0) {
    cellEls[food].classList.add('food');
    if (altinYem) cellEls[food].classList.add('gold');
  }
}

function altinPatlama(index) {
  const hucre = cellEls[index];
  if (!hucre) return;
  const el = document.createElement('span');
  el.className = 'gold-burst';
  el.style.left = `${hucre.offsetLeft + hucre.offsetWidth / 2}px`;
  el.style.top = `${hucre.offsetTop + hucre.offsetHeight / 2}px`;
  boardEl.appendChild(el);
  setTimeout(() => el.remove(), 700);
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

function setDir(d) {
  if (d === -dir) return;
  nextDir = d;
}

const KEYS = {
  ArrowUp: -SIZE, ArrowDown: SIZE, ArrowLeft: -1, ArrowRight: 1,
  w: -SIZE, s: SIZE, a: -1, d: 1,
};

function ensureRunning() {
  if (!running && !over && !gecis) startRun();
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

const swipeEl = document.querySelector('.game-mid');

swipeEl.addEventListener('pointerdown', (e) => {
  touchStart = { x: e.clientX, y: e.clientY };
});

swipeEl.addEventListener('pointermove', (e) => {
  if (!touchStart) return;
  e.preventDefault();

  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;

  ensureRunning();
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1);
  else setDir(dy > 0 ? SIZE : -SIZE);

  touchStart = { x: e.clientX, y: e.clientY };
});

swipeEl.addEventListener('pointerup', () => { touchStart = null; });
swipeEl.addEventListener('pointercancel', () => { touchStart = null; });

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
