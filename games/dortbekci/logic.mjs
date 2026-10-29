/* DORT BEKCI — SAF MANTIK.
 *
 * Bu dosyada DOM yok, zamanlayici yok, cizim yok. Sebebi: oyunun
 * yapay zekasi tarayicida guvenilir sekilde olculemiyor. Bu ortamda
 * requestAnimationFrame saniyede 1 kere donuyor (olculdu), yani
 * "bekciler oyuncuyu yakaliyor mu" sorusu ekranda sinanamiyor.
 *
 * Mantik buraya alininca SABIT ADIMLI, tarayicisiz bir benzetimle
 * sinanabiliyor (bkz. test-dortbekci.mjs). Ayni kalip projede zaten
 * var: games/2048/logic.js hem istemci hem sunucu tarafindan kullaniliyor.
 */
import { HARITA, EN, BOY, TUNEL_SATIR } from './labirent.mjs?v303';

export const YONLER = [
  { x: 0, y: -1, ad: 'yukari' },
  { x: -1, y: 0, ad: 'sol' },
  { x: 0, y: 1, ad: 'asagi' },
  { x: 1, y: 0, ad: 'sag' },
];


export const sar = (x) => (x < 0 ? EN - 1 : x >= EN ? 0 : x);

/* Bir karakterin onundeki kareye gecebilir mi? */
export function gecilir(x, y, kapiAcik = false) {
  const nx = sar(x);
  if (y < 0 || y >= BOY) return false;
  const c = HARITA[y][nx];
  if (c === '-') return kapiAcik;
  return c !== '#';
}

/* Yeni kareye girildiyse true doner.
   ONEMLI: karar ani budur. Onceden "ilerleme <= 0.001 ise tam karenin
   ustundeyiz" diye bakiliyordu, ama ilerleme her karede 0,083 artiyor ve
   bir kareye tam oturdugu an pratikte hic gelmiyordu. Bekciler bu yuzden
   yalnizca DUVARA CARPINCA donuyor, kavsakta yon secmiyorlardi: hareket
   ediyor ama KOVALAMIYORLARDI. 21 saniye hic kimildamadan beklendi, dort
   bekci de etrafta dolasti, can dusmedi. */
export function ilerlet(v, hiz, dt) {
  v.ilerleme += hiz * dt / 60;
  let yeniKare = false;
  while (v.ilerleme >= 1) {
    v.ilerleme -= 1;
    v.x = sar(v.x + v.yon.x);
    v.y += v.yon.y;
    yeniKare = true;
  }
  return yeniKare;
}


export function hedefKare(b, oyuncu, bekciler, mod) {
  if (b.donuyor) return { x: 10, y: 12 };                 /* eve donuyor */
  if (mod === 'dagil') return b.kose;

  const o = oyuncu;
  const on = (n) => ({ x: o.x + o.yon.x * n, y: o.y + o.yon.y * n });

  switch (b.id) {
    case 'golem':                                          /* dogrudan uzerine */
      return { x: o.x, y: o.y };
    case 'orumcek':                                        /* dort kare onunu keser */
      return on(4);
    case 'yarasa': {                                       /* goleme bagli, tahmin edilemez */
      const g = bekciler.find((q) => q.id === 'golem') || b;
      const ara = on(2);
      return { x: ara.x + (ara.x - g.x), y: ara.y + (ara.y - g.y) };
    }
    case 'imp': {                                          /* yaklasinca kacar */
      const d = Math.hypot(b.x - o.x, b.y - o.y);
      return d >= 8 ? { x: o.x, y: o.y } : b.kose;
    }
    default:
      return { x: o.x, y: o.y };
  }
}

/* Kavsakta karar: geri donme YOK, hedefe en yakin yon secilir.
   Esitlikte sira yukari, sol, asagi, sag. */
export function bekciYonSec(b, oyuncu, bekciler, mod) {
  const hedef = hedefKare(b, oyuncu, bekciler, mod);
  const ters = { x: -b.yon.x, y: -b.yon.y };
  let enIyi = null, enIyiMesafe = Infinity;

  for (const y of YONLER) {
    if (y.x === ters.x && y.y === ters.y) continue;
    const nx = sar(b.x + y.x), ny = b.y + y.y;
    if (!gecilir(nx, ny, b.donuyor || b.evde)) continue;
    if (b.korkmus) { enIyi = enIyi || y; continue; }       /* korkmusken asagida secilir */
    const m = (nx - hedef.x) ** 2 + (ny - hedef.y) ** 2;
    if (m < enIyiMesafe) { enIyiMesafe = m; enIyi = y; }
  }

  if (b.korkmus) {
    /* Korkmusken hedef mantigi KAPANIYOR: rastgele donuyor. */
    const secenek = YONLER.filter((y) => !(y.x === ters.x && y.y === ters.y)
      && gecilir(sar(b.x + y.x), b.y + y.y, false));
    if (secenek.length) return secenek[Math.floor(Math.random() * secenek.length)];
  }
  /* Hicbir yon yoksa geri donmek zorunda (cikmaz sokak). */
  return enIyi || ters;
}

