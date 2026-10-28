/* LABIRENT — 21 genis x 23 yuksek.
 *
 * Neden 21x23 (orijinal Pac-Man 28x31 degil): 390 piksel genislikte
 * 28 kare 13,9 px eder, 21 kare 18,6 px. Telefonda kare ne kadar
 * buyukse yem ve bekciler o kadar okunur. Labirentin kuralları ayni,
 * yalnizca olcek telefona gore.
 *
 *   #  duvar        .  yem          o  buyuk yem (bekciler korkar)
 *   -  bekci kapisi  (bosluk) gecilir ama yem yok
 *
 * Satirlar SOLDAN SAGA simetrik. Tunel satirinda (10) iki yan ucu
 * birbirine baglaniyor.
 */
export const HARITA = [
  '#####################',
  '#........#.#........#',
  '#o##.###.#.#.###.##o#',
  '#.##.###.#.#.###.##.#',
  '#...................#',
  '#.##.#.#######.#.##.#',
  '#....#....#....#....#',
  '####.####.#.####.####',
  '#......#..#..#......#',
  '#.####.#######.####.#',
  '.....................',
  '#.####.##---##.####.#',
  '#......#     #......#',
  '#.####.#######.####.#',
  '#........#.#........#',
  '#.##.###.#.#.###.##.#',
  '#o.#.....#.#.....#.o#',
  '##.#.#.###.###.#.#.##',
  '#....#...#.#...#....#',
  '#.########.########.#',
  '#...................#',
  '#.#################.#',
  '#####################',
];

export const EN = HARITA[0].length;
export const BOY = HARITA.length;
export const TUNEL_SATIR = 10;
/* Bekci evi: kapinin hemen altindaki oda. */
export const EV = { x: 10, y: 12, kapiY: 11 };

export const duvarMi = (x, y) => {
  if (y < 0 || y >= BOY) return true;
  const satir = HARITA[y];
  if (x < 0 || x >= EN) return y !== TUNEL_SATIR;   /* tunel disinda kenar duvardir */
  return satir[x] === '#';
};
