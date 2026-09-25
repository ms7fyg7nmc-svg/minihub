export const SIZE = 15;
export const START_LENGTH = 3;
export const FOOD_SCORE = 10;
export const LEVEL_BONUS = 50;
export const FOODS_PER_LEVEL = 5;
export const MAX_OBSTACLES = 24;

// Yon degerleri hucre-indeksi delta'lari (SIZE'a bagli, istemciyle AYNI
// kodlama) - U/D/L/R string'e gerek yok, sayi olarak tasinabiliyor.
export const DIR_UP = -SIZE;
export const DIR_DOWN = SIZE;
export const DIR_LEFT = -1;
export const DIR_RIGHT = 1;
const VALID_DIRS = new Set([DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT]);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rowOf = (i) => Math.floor(i / SIZE);
const colOf = (i) => i % SIZE;

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

// Sadece 'level' ve o levelde yilanin (hep sabit) baslangic konumuna bagli -
// RNG kullanmiyor, o yuzden istemci/sunucu bagimsiz olarak ayni sonuca ulasir.
export function buildWalls(level, snakeCells) {
  if (level < 2) return new Set();

  const sira = level - 2;

  for (let kaydir = 0; kaydir < DESENLER.length; kaydir++) {
    const desen = DESENLER[(sira + kaydir) % DESENLER.length];
    const siklik = Math.floor(sira / DESENLER.length);
    const engeller = dortAyna(desen(siklik));

    let cakisma = false;
    for (const i of engeller) {
      if (snakeCells.includes(i) || rowOf(i) === Math.floor(SIZE / 2)) { cakisma = true; break; }
    }
    if (cakisma || engeller.size > MAX_OBSTACLES) continue;

    if (hepsiBagli(engeller)) return engeller;
  }

  return new Set();
}

export function placeFood(snake, walls, rng) {
  const bos = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!snake.includes(i) && !walls.has(i)) bos.push(i);
  }
  return bos.length ? bos[Math.floor(rng() * bos.length)] : -1;
}

function buildLevelState(level, rng) {
  const mid = Math.floor(SIZE / 2);
  const start = mid * SIZE + mid;
  const snake = [];
  for (let i = 0; i < START_LENGTH; i++) snake.push(start - i);

  const walls = buildWalls(level, snake);
  const food = placeFood(snake, walls, rng);
  return { snake, walls, food, dir: DIR_RIGHT, eatenThisLevel: 0 };
}

// events: [[tick, dirDelta], ...] - tick-index'inde bir yon degisikligi
// istendigini bildirir (istemcideki setDir()/nextDir mantiginin aynisi).
// totalTicks: istemcinin iddia ettigi toplam tick sayisi - sunucu bunu
// SADECE bir üst sinir olarak kullanir, gercek sonuc replay sirasinda
// dogal olarak carpip DURURSA totalTicks'in geri kalani gorulmez (yani
// sismis bir totalTicks iddiasi hicbir ek skor kazandirmaz).
export function replayRun(seed, events, totalTicks, maxTicks) {
  const rng = mulberry32(seed);
  let level = 1;
  let score = 0;
  let { snake, walls, food, dir, eatenThisLevel } = buildLevelState(1, rng);
  let nextDir = dir;

  const cappedTicks = Math.max(0, Math.min(totalTicks, maxTicks));
  let eventIdx = 0;
  let crashed = false;
  let ticksRun = 0;

  for (let tick = 0; tick < cappedTicks; tick++) {
    while (eventIdx < events.length && events[eventIdx][0] === tick) {
      const d = events[eventIdx][1];
      if (VALID_DIRS.has(d) && d !== -dir) nextDir = d;
      eventIdx++;
    }
    dir = nextDir;
    ticksRun = tick + 1;

    const head = snake[0];
    const hedef = head + dir;
    const yatay = dir === DIR_LEFT || dir === DIR_RIGHT;
    const sinirDisi = hedef < 0 || hedef >= SIZE * SIZE
      || (yatay && rowOf(hedef) !== rowOf(head))
      || (!yatay && colOf(hedef) !== colOf(head));
    if (sinirDisi || walls.has(hedef)) { crashed = true; break; }

    const yemVar = hedef === food;
    const govde = yemVar ? snake : snake.slice(0, -1);
    if (govde.includes(hedef)) { crashed = true; break; }

    snake.unshift(hedef);
    if (yemVar) {
      score += FOOD_SCORE;
      eatenThisLevel++;

      if (eatenThisLevel >= FOODS_PER_LEVEL) {
        level++;
        score += LEVEL_BONUS;
        const next = buildLevelState(level, rng);
        snake = next.snake; walls = next.walls; food = next.food;
        dir = next.dir; nextDir = next.dir; eatenThisLevel = 0;
      } else {
        food = placeFood(snake, walls, rng);
      }
    } else {
      snake.pop();
    }
  }

  return { score, level, crashed, ticksRun };
}
