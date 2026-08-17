export const COLOR_COUNT_MAX = 8;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sizeFor(levelNo) {
  return Math.min(5 + Math.floor((levelNo - 1) / 3), 8);
}

export function colorCountFor(levelNo, gridSize, maxColors = COLOR_COUNT_MAX) {
  const wanted = 3 + Math.floor((levelNo - 1) / 2);
  return Math.min(wanted, maxColors, Math.floor((gridSize * gridSize) / 3));
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

export function randomHamiltonianPath(n, rng) {
  const idx = (r, c) => r * n + c;
  const path = [];

  const rowMajor = rng() < 0.5;
  const reverseMajor = rng() < 0.5;
  const reverseMinor = rng() < 0.5;

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

export function splitIntoSegments(route, count, rng) {
  const total = route.length;
  const sizes = new Array(count).fill(2);

  let extra = Math.max(0, total - count * 2);
  while (extra > 0) {
    sizes[Math.floor(rng() * count)]++;
    extra--;
  }

  const segments = [];
  let at = 0;
  for (const s of sizes) {
    segments.push(route.slice(at, at + s));
    at += s;
  }
  return segments;
}

// Bir seviye+tohum ciftinden HER ZAMAN AYNI bulmacayi uretir - istemci ve
// sunucu bagimsiz olarak bu fonksiyonu cagirip ayni endpoints'e ulasir.
export function generatePuzzle(levelNo, seed) {
  const rng = mulberry32(seed);
  const size = sizeFor(levelNo);
  const colorCount = colorCountFor(levelNo, size);

  const route = randomHamiltonianPath(size, rng);
  const segments = splitIntoSegments(route, colorCount, rng);
  const endpoints = segments.map((seg) => [seg[0], seg[seg.length - 1]]);

  return { size, colorCount, endpoints };
}

function adjacent(a, b, size) {
  const ra = Math.floor(a / size), ca = a % size;
  const rb = Math.floor(b / size), cb = b % size;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

// Istemcinin gonderdigi NIHAI cozumun (her renk icin bir hucre listesi)
// gercekten o bulmacayi cozdugunu dogrular: her yol kendi iki ucunu
// bagliyor mu, komsu hucrelerden mi olusuyor mu, hucreler cakismiyor mu,
// ve butun tahta doluyor mu.
export function validateSolution(size, endpoints, paths) {
  if (!Array.isArray(paths) || paths.length !== endpoints.length) return false;

  const total = size * size;
  const used = new Set();

  for (let color = 0; color < endpoints.length; color++) {
    const path = paths[color];
    if (!Array.isArray(path) || path.length < 2) return false;

    const [a, b] = endpoints[color];
    const first = path[0], last = path[path.length - 1];
    const endsOk = (first === a && last === b) || (first === b && last === a);
    if (!endsOk) return false;

    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      if (!Number.isInteger(cell) || cell < 0 || cell >= total) return false;
      if (used.has(cell)) return false;
      used.add(cell);
      if (i > 0 && !adjacent(path[i - 1], cell, size)) return false;
    }
  }

  return used.size === total;
}
