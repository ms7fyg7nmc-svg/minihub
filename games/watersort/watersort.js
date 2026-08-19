
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v93';
import { submitScore, addPoints, getBest, saveState, loadState, clearState, oynanabilirMi } from '../../js/store.js?v93';
import { registerTexts, t, applyStaticTexts, mhHtml } from '../../js/i18n-hook.js?v93';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v93';

const GAME_ID = 'watersort';
const POINTS_PER_LEVEL = 90;
const POINTS_PER_EXTRA_COLOR = 5;
const POINTS_PER_EXTRA_CAPACITY = 8;
let capacity = 4;
const EMPTY_TUBES = 2;
const HARD_EMPTY_LEVEL = 15;

registerTexts(GAME_ID, {
  title: 'Su Sıralama',
  subtitle: 'Her tüpü tek renge indir',
  level: 'BÖLÜM',
  bestLevel: 'EN İYİ',
  undo: 'Geri al',
  restart: 'Yeniden',
  backToHub: "Hub'a dön",
  hint: 'Bir tüpe dokun, sonra dökeceğin tüpe dokun.',
  levelDone: 'Bölüm tamam!',
  nextLevel: 'Sonraki bölüm',
  levelResult: '{moves} hamlede bitirdin.',
  earnedPoints: '+{points} $MH kazandın.',
});

const COLORS = [
  '#e2544e', '#5b8cff', '#4ecb8b', '#f5b942', '#c079f2',
  '#3fc7d4', '#f2884b', '#e2679c', '#9aa87a',
  '#8c5a3c', '#5c7ea3', '#b83280',
];

const stageEl = document.getElementById('stage');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const undoBtn = document.getElementById('undo');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let tubes = [];
let history = [];
let level = 1;
let bestLevel = 1;
let moves = 0;
let selected = null;
let lastPour = null;
let locked = false;

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});
document.getElementById('restart').addEventListener('click', async () => {
  if (!(await oynanabilirMi())) { haptic.error(); goHome(); return; }
  haptic.tap();
  buildLevel(level);
});
undoBtn.addEventListener('click', () => {
  haptic.tap();
  undo();
});

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

bootstrap();

async function bootstrap() {
  bestLevel = (await getBest(GAME_ID)) || 1;
  bestEl.textContent = bestLevel;

  const saved = await loadState(GAME_ID);
  if (saved && Array.isArray(saved.tubes) && saved.tubes.length) {
    level = Number(saved.level) || 1;
    moves = Number(saved.moves) || 0;
    capacity = capacityFor(level);
    stageEl.style.setProperty('--capacity', capacity);
    tubes = saved.tubes.map((tube) => [...tube]);
    history = [];
    render();
  } else {
    buildLevel(1);
  }
}

function goHome() {
  window.location.href = '../../index.html';
}

function colorCountFor(levelNo) {
  if (levelNo <= 13) return Math.min(3 + Math.floor((levelNo - 1) / 2), 9);
  if (levelNo <= 24) return 9;
  return Math.min(9 + Math.floor((levelNo - 25) / 3) + 1, COLORS.length);
}

function capacityFor(levelNo) {
  if (levelNo < 14) return 4;
  return Math.min(4 + Math.floor((levelNo - 14) / 4) + 1, 7);
}

function emptyTubesFor(levelNo) {
  return levelNo >= HARD_EMPTY_LEVEL ? 1 : EMPTY_TUBES;
}

function pointsFor(levelNo) {
  return POINTS_PER_LEVEL
    + (colorCountFor(levelNo) - 3) * POINTS_PER_EXTRA_COLOR
    + (capacityFor(levelNo) - 4) * POINTS_PER_EXTRA_CAPACITY;
}

function buildLevel(levelNo) {
  level = levelNo;
  moves = 0;
  history = [];
  selected = null;
  locked = false;

  const colorCount = colorCountFor(levelNo);
  const emptyTubes = emptyTubesFor(levelNo);
  capacity = capacityFor(levelNo);
  stageEl.style.setProperty('--capacity', capacity);

  for (let attempt = 0; attempt < 30; attempt++) {
    tubes = [];
    for (let i = 0; i < colorCount; i++) tubes.push(new Array(capacity).fill(i));
    for (let i = 0; i < emptyTubes; i++) tubes.push([]);
    scramble(colorCount * 14);
    if (!isSolved() && isSolvable(tubes)) break;
  }

  hideOverlay();
  render();
  persist();
}

function scramble(steps) {
  for (let i = 0; i < steps; i++) {
    const options = [];

    for (let from = 0; from < tubes.length; from++) {
      const source = tubes[from];
      if (!source.length) continue;

      const color = source[source.length - 1];
      let run = 0;
      while (run < source.length && source[source.length - 1 - run] === color) run++;

      const maxTake = run === source.length ? run : run - 1;
      if (maxTake < 1) continue;

      for (let to = 0; to < tubes.length; to++) {
        if (to === from) continue;
        const target = tubes[to];
        const room = capacity - target.length;
        if (!room) continue;
        if (target.length && target[target.length - 1] === color) continue;
        options.push({ from, to, max: Math.min(maxTake, room) });
      }
    }

    if (!options.length) return;
    const pick = options[Math.floor(Math.random() * options.length)];
    const count = 1 + Math.floor(Math.random() * pick.max);
    for (let k = 0; k < count; k++) tubes[pick.to].push(tubes[pick.from].pop());
  }
}

function isSolvable(start) {
  const key = (state) => state.map((tube) => tube.join(',')).sort().join('|');
  const solved = (state) => state.every((tube) =>
    tube.length === 0 || (tube.length === capacity && tube.every((c) => c === tube[0])));

  const seen = new Set([key(start)]);
  const stack = [start.map((tube) => [...tube])];
  let nodes = 0;

  while (stack.length) {
    if (++nodes > 60000) return false;
    const state = stack.pop();
    if (solved(state)) return true;

    for (let from = 0; from < state.length; from++) {
      const source = state[from];
      if (!source.length) continue;
      const uniform = source.every((c) => c === source[0]);

      for (let to = 0; to < state.length; to++) {
        if (to === from) continue;
        if (uniform && !state[to].length) continue;
        const count = amount(state, from, to);
        if (!count) continue;

        const next = state.map((tube) => [...tube]);
        for (let i = 0; i < count; i++) next[to].push(next[from].pop());

        const k = key(next);
        if (seen.has(k)) continue;
        seen.add(k);
        stack.push(next);
      }
    }
  }
  return false;
}

function topColor(tube) {
  return tube.length ? tube[tube.length - 1] : null;
}

function amount(state, from, to) {
  const source = state[from];
  const target = state[to];
  if (from === to || !source.length) return 0;
  if (target.length === capacity) return 0;
  if (target.length && topColor(target) !== topColor(source)) return 0;

  const color = topColor(source);
  let run = 0;
  while (run < source.length && source[source.length - 1 - run] === color) run++;

  return Math.min(run, capacity - target.length);
}

const pourAmount = (from, to) => amount(tubes, from, to);

function pour(from, to) {
  const count = pourAmount(from, to);
  if (!count) return false;

  for (let i = 0; i < count; i++) tubes[to].push(tubes[from].pop());
  history.push({ from, to, count });
  moves++;
  lastPour = { to, count };
  SFX.pour();
  return true;
}

function undo() {
  if (!history.length || locked) return;
  const last = history.pop();
  for (let i = 0; i < last.count; i++) tubes[last.from].push(tubes[last.to].pop());
  moves = Math.max(0, moves - 1);
  lastPour = null;
  selected = null;
  render();
  persist();
}

function isSolved() {
  return tubes.every((tube) => tube.length === 0 ||
    (tube.length === capacity && tube.every((c) => c === tube[0])));
}

function persist() {
  saveState(GAME_ID, { level, moves, tubes });
}

function onTubeClick(index) {
  if (locked) return;

  if (selected === null) {
    if (!tubes[index].length) return;
    selected = index;
    haptic.tap();
    render();
    return;
  }

  if (selected === index) {
    selected = null;
    render();
    return;
  }

  if (pour(selected, index)) {
    selected = null;
    haptic.tap();
    render();
    persist();
    if (isSolved()) finishLevel();
  } else {
    selected = tubes[index].length ? index : null;
    render();
  }
}

async function finishLevel() {
  locked = true;
  haptic.success();
  SFX.goldenPickup();
  clearState(GAME_ID);

  const result = await submitScore(GAME_ID, level);
  bestLevel = result.best;
  bestEl.textContent = bestLevel;

  const points = pointsFor(level);
  await addPoints(points);

  const text = `${t('levelResult', { moves })} ${t('earnedPoints', { points })}`;
  showOverlay(t('levelDone'), text, t('nextLevel'), () => buildLevel(level + 1));
}

const TUBE_W = () => (window.innerWidth <= 380 ? 36 : 42);
const TUBE_GAP = () => (window.innerWidth <= 380 ? 9 : 12);

function layoutStage() {
  const w = TUBE_W(), gap = TUBE_GAP();
  const maxCols = Math.max(1, Math.floor((stageEl.clientWidth + gap) / (w + gap)));
  const total = tubes.length || 1;
  const rows = Math.max(1, Math.ceil(total / maxCols));
  const cols = Math.min(maxCols, Math.ceil(total / rows));
  stageEl.style.setProperty('--cols', cols);
}

window.addEventListener('resize', () => { layoutStage(); });

function render() {
  stageEl.textContent = '';
  levelEl.textContent = level;
  undoBtn.disabled = !history.length || locked;
  layoutStage();

  tubes.forEach((tube, index) => {
    const el = document.createElement('div');
    el.className = 'tube';
    if (selected === index) el.classList.add('selected');
    if (tube.length === capacity && tube.every((c) => c === tube[0])) el.classList.add('done');

    tube.forEach((colorIndex, li) => {
      const layer = document.createElement('div');
      layer.className = 'layer';
      layer.style.backgroundColor = COLORS[colorIndex];
      if (lastPour && lastPour.to === index && li >= tube.length - lastPour.count) {
        layer.classList.add('pour');
      }
      el.appendChild(layer);
    });

    el.addEventListener('click', () => onTubeClick(index));
    stageEl.appendChild(el);
  });

  lastPour = null;
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
