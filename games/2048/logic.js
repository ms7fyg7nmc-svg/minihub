
/* 2048'in DOM'suz, saf oyun mantigi. Hem tarayicidaki oyun (games/2048/2048.js)
   hem sunucu (bot/worker.js, hamle listesini yeniden oynatip skoru dogrulamak
   icin) AYNI bu dosyayi kullaniyor - iki ayri implementasyon olursa zamanla
   birbirinden sapabilir, o yuzden tek kaynak burasi. Render/animasyon,
   ses, haptic YOK - sadece board/skor durum gecisleri. */

export const SIZE = 4;

const VECTORS = {
   up: { dr: -1, dc: 0 },
   down: { dr: 1, dc: 0 },
   left: { dr: 0, dc: -1 },
   right: { dr: 0, dc: 1 },
};

export const DIR_TO_CODE = { up: 'U', down: 'D', left: 'L', right: 'R' };
export const CODE_TO_DIR = { U: 'up', D: 'down', L: 'left', R: 'right' };

/* Basit, hizli, deterministik uretec (mulberry32). Kriptografik guvenlik
   gerekmiyor - sadece ayni tohumun her iki tarafta da AYNI sirayla sayi
   uretmesi yeterli. */
export function mulberry32(seed) {
   let a = seed >>> 0;
   return function rng() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}

function idx(r, c) { return r * SIZE + c; }
function inside(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

function emptyIndices(board) {
   const out = [];
   for (let i = 0; i < board.length; i++) if (!board[i]) out.push(i);
   return out;
}

/* board'u yerinde degistirir, yeni yerlestirilen tasin {index, value}'unu
   dondurur (bos yer yoksa null). */
function spawnTile(board, rng) {
   const empty = emptyIndices(board);
   if (!empty.length) return null;
   const index = empty[Math.floor(rng() * empty.length)];
   const value = rng() < 0.9 ? 2 : 4;
   board[index] = value;
   return { index, value };
}

export function createBoard(rng) {
   const board = new Array(SIZE * SIZE).fill(0);
   const spawns = [spawnTile(board, rng), spawnTile(board, rng)].filter(Boolean);
   return { board, spawns };
}

function findTarget(board, r, c, vec) {
   let cr = r, cc = c;
   let nr = r + vec.dr, nc = c + vec.dc;
   while (inside(nr, nc) && !board[idx(nr, nc)]) {
      cr = nr; cc = nc;
      nr += vec.dr; nc += vec.dc;
   }
   return { farthest: { r: cr, c: cc }, next: inside(nr, nc) ? { r: nr, c: nc } : null };
}

/* Bir hamleyi uygular. board'u DEGISTIRMEZ, yeni bir dizi doner.
   transitions: onceki tas konumlarinin nereye gittigini anlatir (render
   icin) - 'move' tek tasin kaymasi, 'merge' ise BIRLESEN iki tasin (mover +
   target, ikisi de kaynak konumundan hedefe "kayiyor" gibi cizilir - orijinal
   istemci animasyonuyla ayni). spawn: bu hamle sonrasi eklenen yeni tas. */
export function applyMove(board, direction, rng) {
   const vec = VECTORS[direction];
   if (!vec) return { board, moved: false, gained: 0, transitions: [], spawn: null };

   const next = board.slice();
   const merged = new Array(SIZE * SIZE).fill(false);
   const transitions = [];
   let moved = false;
   let gained = 0;

   const rows = vec.dr > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3];
   const cols = vec.dc > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3];

   for (const r of rows) {
      for (const c of cols) {
         const v = next[idx(r, c)];
         if (!v) continue;

         const { farthest, next: dest } = findTarget(next, r, c, vec);
         const destIdx = dest ? idx(dest.r, dest.c) : -1;

         if (dest && next[destIdx] === v && !merged[destIdx]) {
            next[idx(r, c)] = 0;
            next[destIdx] = v * 2;
            merged[destIdx] = true;
            gained += v * 2;
            moved = true;
            transitions.push({ type: 'merge', role: 'mover', from: { r, c }, to: dest, value: v * 2 });
            transitions.push({ type: 'merge', role: 'target', from: dest, to: dest, value: v * 2 });
         } else if (farthest.r !== r || farthest.c !== c) {
            next[idx(r, c)] = 0;
            next[idx(farthest.r, farthest.c)] = v;
            moved = true;
            transitions.push({ type: 'move', from: { r, c }, to: farthest, value: v });
         }
      }
   }

   if (!moved) return { board, moved: false, gained: 0, transitions: [], spawn: null };

   const spawn = spawnTile(next, rng);
   return { board: next, moved: true, gained, transitions, spawn };
}

export function isGameOver(board) {
   if (board.some((v) => !v)) return false;
   for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
         const v = board[idx(r, c)];
         if ((c < SIZE - 1 && board[idx(r, c + 1)] === v) || (r < SIZE - 1 && board[idx(r + 1, c)] === v)) {
            return false;
         }
      }
   }
   return true;
}

const MAX_REPLAY_MOVES = 20000;

/* Sunucunun (ve istersen istemcinin kendi kendini test etmesinin) kullandigi
   tek giris noktasi: bir tohum + hamle kodu listesinden (U/D/L/R) gercek
   skoru/board'u yeniden hesaplar. Gecersiz/bilinmeyen kodlar sessizce
   atlanir (hamle sayilmaz, RNG tuketilmez) - boylece bozuk bir istek en
   kotu ihtimalle "hic hamle yapilmamis" gibi davranir, asla cokmez. */
export function replayRun(seed, moveCodes, maxMoves = MAX_REPLAY_MOVES) {
   const rng = mulberry32(seed);
   let { board } = createBoard(rng);
   let score = 0;
   let over = false;
   let applied = 0;

   const list = Array.isArray(moveCodes) ? moveCodes.slice(0, maxMoves) : [];
   for (const code of list) {
      if (over) break;
      const direction = CODE_TO_DIR[code];
      if (!direction) continue;
      const result = applyMove(board, direction, rng);
      if (!result.moved) continue;
      board = result.board;
      score += result.gained;
      applied++;
      if (isGameOver(board)) over = true;
   }

   return { board, score, over, appliedMoves: applied };
}
