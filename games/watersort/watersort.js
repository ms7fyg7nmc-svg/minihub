/* Su Siralama (Water Sort)

   Tuplerde renkli sivi katmanlari var. Bir tupe dokunup sonra baska bir tupe
   dokununca ustteki sivi oraya akar - ama sadece hedef bos ise ya da ustteki
   rengi ayni ise. Amac her tupu tek renge indirmek.

   Bolumler otomatik uretilir. Uretim yontemi: once cozulmus halden basla,
   sonra geri alinabilir hamlelerle karistir. Boylece her bolumun cozumu
   kesin vardir (karistirma hamlelerini tersten oynamak yeter). */

import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v18';
import { submitScore, addPoints, getBest, saveState, loadState, clearState } from '../../js/store.js?v18';
import { registerTexts, t, applyStaticTexts } from '../../js/i18n-hook.js?v18';

const GAME_ID = 'watersort';
/* EKONOMI DENGESI

   Butun oyunlar dakikada yaklasik AYNI jetonu vermeli - yoksa oyuncu en
   verimli oyunu bulup sadece onu oynuyor, digerleri olu yatiriyor.

   Olculen durum (kod uzerinden modellendi): en dusuk 8 jeton/dk (Mayin
   Tarlasi), en yuksek 136 jeton/dk (2048) - arada 17 KAT fark vardi.
   Asagidaki sabit, hedef olan ~60 jeton/dk'ya gore secildi.

   Model her oyunun kendi puanlama mekanigi + makul bir oturum suresi
   varsayimina dayaniyor; gercek oyuncu verisi geldiginde bu sayilar
   yeniden ayarlanmali. */
const POINTS_PER_LEVEL = 90; /* bolum ~1,5 dk surer */
const CAPACITY = 4;          /* bir tupe kac katman sigar */
const EMPTY_TUBES = 2;       /* her bolumde kac bos tup verilir */

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
  earnedPoints: '+{points} hub puanı kazandın.',
});

const COLORS = [
  '#e2544e', '#5b8cff', '#4ecb8b', '#f5b942', '#c079f2',
  '#3fc7d4', '#f2884b', '#e2679c', '#9aa87a',
];

const stageEl = document.getElementById('stage');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const undoBtn = document.getElementById('undo');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let tubes = [];     /* her tup bir dizi: [altKatman, ..., ustKatman] */
let history = [];   /* geri alma icin yapilan hamleler */
let level = 1;
let bestLevel = 1;
let moves = 0;
let selected = null;
let lastPour = null;
let locked = false; /* bolum bitince tiklamayi kapat */

/* ---------- Baslangic ---------- */

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});
document.getElementById('restart').addEventListener('click', () => {
  haptic.tap();
  buildLevel(level);
});
undoBtn.addEventListener('click', () => {
  haptic.tap();
  undo();
});

bootstrap();

async function bootstrap() {
  bestLevel = (await getBest(GAME_ID)) || 1;
  bestEl.textContent = bestLevel;

  const saved = await loadState(GAME_ID);
  if (saved && Array.isArray(saved.tubes) && saved.tubes.length) {
    level = Number(saved.level) || 1;
    moves = Number(saved.moves) || 0;
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

/* ---------- Bolum uretimi ---------- */

/* Bolum ilerledikce renk sayisi artar (3'ten 9'a kadar) */
function colorCountFor(levelNo) {
  return Math.min(3 + Math.floor((levelNo - 1) / 2), COLORS.length);
}

function buildLevel(levelNo) {
  level = levelNo;
  moves = 0;
  history = [];
  selected = null;
  locked = false;

  const colorCount = colorCountFor(levelNo);

  /* Cozulmus halden basla, karistir, sonra cozulebilirligini dogrula.
     Cok nadiren cikmaz sokak uretilirse bastan uretiriz. */
  for (let attempt = 0; attempt < 30; attempt++) {
    tubes = [];
    for (let i = 0; i < colorCount; i++) tubes.push(new Array(CAPACITY).fill(i));
    for (let i = 0; i < EMPTY_TUBES; i++) tubes.push([]);
    scramble(colorCount * 14);
    if (!isSolved() && isSolvable(tubes)) break;
  }

  hideOverlay();
  render();
  persist();
}

/* Bolumu "hamleleri tersten oynayarak" karistirir.

   Normal oyunda sivi ancak ayni renk uzerine ya da bos tupe dokulur.
   Karistirirken bunun TERSINI yapiyoruz: ustteki renk grubunu alip baska bir
   renkin uzerine koyuyoruz. Boylece renkler karisiyor ve elde ettigimiz her
   durum, yaptigimiz hamleleri tersten oynayarak kesin cozulebiliyor. */
function scramble(steps) {
  for (let i = 0; i < steps; i++) {
    const options = [];

    for (let from = 0; from < tubes.length; from++) {
      const source = tubes[from];
      if (!source.length) continue;

      const color = source[source.length - 1];
      let run = 0;
      while (run < source.length && source[source.length - 1 - run] === color) run++;

      /* Kac katman alinabilir: ya hepsi (tup bosalir) ya da ayni renkten
         en az bir tane altta kalacak kadar. Yoksa hamle geri alinamaz olur. */
      const maxTake = run === source.length ? run : run - 1;
      if (maxTake < 1) continue;

      for (let to = 0; to < tubes.length; to++) {
        if (to === from) continue;
        const target = tubes[to];
        const room = CAPACITY - target.length;
        if (!room) continue;
        /* Hedefin ustu ayni renk OLMAMALI - karisim boyle olusuyor */
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

/* ---------- Cozulebilirlik kontrolu ---------- */

/* Bolumu bilgisayara cozdurur. Cozerse true doner.
   Cok dallanirsa pes eder (false) ve bolum yeniden uretilir. */
function isSolvable(start) {
  const key = (state) => state.map((tube) => tube.join(',')).sort().join('|');
  const solved = (state) => state.every((tube) =>
    tube.length === 0 || (tube.length === CAPACITY && tube.every((c) => c === tube[0])));

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
      /* Tek renkten olusan tupu bos tupe tasimak bosuna hamle */
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

/* ---------- Oyun kurallari ---------- */

function topColor(tube) {
  return tube.length ? tube[tube.length - 1] : null;
}

/* Verilen durumda from tupunden to tupune kac katman dokulebilir */
function amount(state, from, to) {
  const source = state[from];
  const target = state[to];
  if (from === to || !source.length) return 0;
  if (target.length === CAPACITY) return 0;
  if (target.length && topColor(target) !== topColor(source)) return 0;

  const color = topColor(source);
  let run = 0;
  while (run < source.length && source[source.length - 1 - run] === color) run++;

  return Math.min(run, CAPACITY - target.length);
}

const pourAmount = (from, to) => amount(tubes, from, to);

function pour(from, to) {
  const count = pourAmount(from, to);
  if (!count) return false;

  for (let i = 0; i < count; i++) tubes[to].push(tubes[from].pop());
  history.push({ from, to, count });
  moves++;
  lastPour = { to, count };
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
    (tube.length === CAPACITY && tube.every((c) => c === tube[0])));
}

function persist() {
  saveState(GAME_ID, { level, moves, tubes });
}

/* ---------- Dokunma ---------- */

function onTubeClick(index) {
  if (locked) return;

  if (selected === null) {
    if (!tubes[index].length) return; /* bos tup secilemez */
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
    /* Dokulemiyorsa secimi yeni tupe kaydir (bos degilse) */
    selected = tubes[index].length ? index : null;
    render();
  }
}

async function finishLevel() {
  locked = true;
  haptic.success();
  clearState(GAME_ID);

  const result = await submitScore(GAME_ID, level);
  bestLevel = result.best;
  bestEl.textContent = bestLevel;

  await addPoints(POINTS_PER_LEVEL);

  const text = `${t('levelResult', { moves })} ${t('earnedPoints', { points: POINTS_PER_LEVEL })}`;
  showOverlay(t('levelDone'), text, t('nextLevel'), () => buildLevel(level + 1));
}

/* ---------- Ekrana cizme ---------- */

function render() {
  stageEl.textContent = '';
  levelEl.textContent = level;
  undoBtn.disabled = !history.length || locked;

  tubes.forEach((tube, index) => {
    const el = document.createElement('div');
    el.className = 'tube';
    if (selected === index) el.classList.add('selected');
    if (tube.length === CAPACITY && tube.every((c) => c === tube[0])) el.classList.add('done');

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
