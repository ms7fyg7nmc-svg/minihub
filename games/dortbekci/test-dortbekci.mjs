/* DORT BEKCI — tarayicisiz, SABIT ADIMLI benzetim.
 *
 * Neden: bu ortamda requestAnimationFrame saniyede 1 kere donuyor
 * (olculdu), yani "bekciler kovaliyor mu", "yakaliyor mu" sorulari
 * ekranda sinanamiyor. Burada 60 fps sabit adimla oynatiliyor.
 */
import { HARITA, EN, BOY, TUNEL_SATIR } from './labirent.mjs?v305';
import { YONLER, sar, gecilir, ilerlet, bekciYonSec, hedefKare } from './logic.mjs?v305';

const HIZ = { oyuncu: 5.6, bekci: 5.0 };
let ok = 0, kotu = 0;
const t = (ad, sart, ek = '') => { if (sart) { ok++; console.log('OK  ', ad); }
  else { kotu++; console.log('FAIL', ad, ek); } };

function kurulum() {
  const oyuncu = { x: 10, y: 18, yon: YONLER[1], istek: null, ilerleme: 0 };
  const evYerleri = [[9, 12], [10, 12], [11, 12], [10, 13]];
  const kose = [{ x: EN - 2, y: 1 }, { x: 1, y: 1 }, { x: EN - 2, y: BOY - 2 }, { x: 1, y: BOY - 2 }];
  const ad = ['golem', 'orumcek', 'yarasa', 'imp'];
  const cikis = [0, 1200, 4000, 8000];
  const bekciler = ad.map((id, i) => ({
    id, kose: kose[i], x: evYerleri[i][0], y: evYerleri[i][1],
    yon: YONLER[0], ilerleme: 0, evde: true, cikiyor: false,
    cikisZamani: cikis[i], korkmus: false, donuyor: false,
  }));
  return { oyuncu, bekciler };
}

/* Oyunun adim mantiginin benzetimi (dortbekci.js ile ayni kurallar). */
function oynat({ oyuncu, bekciler }, saniye, mod = 'kovala', oyuncuHareketli = false, orneklem = null, carpismaVar = true) {
  const dt = 1, adimMs = 1000 / 60;
  let zaman = 0, yakalandi = false;
  for (let i = 0; i < saniye * 60; i++) {
    zaman += adimMs;
    if (oyuncuHareketli) {
      if (!gecilir(oyuncu.x + oyuncu.yon.x, oyuncu.y + oyuncu.yon.y)) {
        const secenek = YONLER.filter((y) => gecilir(oyuncu.x + y.x, oyuncu.y + y.y));
        if (secenek.length) oyuncu.yon = secenek[i % secenek.length];
        oyuncu.ilerleme = 0;
      } else if (ilerlet(oyuncu, HIZ.oyuncu, dt)) oyuncu.ilerleme = 0;
    }
    for (const b of bekciler) {
      if (b.evde) { if (zaman >= b.cikisZamani) { b.evde = false; b.cikiyor = true; b.x = 10; b.y = 12; b.ilerleme = 0; b.yon = YONLER[0]; } continue; }
      if (b.cikiyor) {
        b.yon = YONLER[0];
        if (ilerlet(b, HIZ.bekci, dt)) b.ilerleme = 0;
        if (b.y <= 10) { b.cikiyor = false; b.yon = YONLER[3]; }
        continue;
      }
      if (!gecilir(b.x + b.yon.x, b.y + b.yon.y, b.donuyor)) b.yon = bekciYonSec(b, oyuncu, bekciler, mod);
      if (ilerlet(b, HIZ.bekci, dt)) { b.ilerleme = 0; b.yon = bekciYonSec(b, oyuncu, bekciler, mod); }
    }
    if (orneklem) orneklem(bekciler, zaman / 1000);
    if (!carpismaVar) continue;
    const sur = (v) => ({ x: v.x + v.yon.x * v.ilerleme, y: v.y + v.yon.y * v.ilerleme });
    const op = sur(oyuncu);
    for (const b of bekciler) {
      if (b.evde || b.donuyor) continue;
      const bp = sur(b);
      const dx = Math.min(Math.abs(bp.x - op.x), EN - Math.abs(bp.x - op.x));
      if (Math.hypot(dx, bp.y - op.y) <= 0.7) { yakalandi = true; return { yakalandi, saniye: zaman / 1000, bekciler, oyuncu }; }
    }
  }
  return { yakalandi, saniye: zaman / 1000, bekciler, oyuncu };
}

/* 1. Evden cikis */
let d = kurulum();
let r = oynat(d, 3, 'dagil');
t('3 saniyede en az 2 bekci evden cikti',
  d.bekciler.filter((b) => !b.evde && !b.cikiyor).length >= 2,
  '-> ' + d.bekciler.map((b) => `${b.id}:${b.evde ? 'ev' : b.cikiyor ? 'cikiyor' : b.y}`).join(' '));

/* 2. Kovalama: duran oyuncu YAKALANMALI */
d = kurulum();
r = oynat(d, 25, 'kovala');
t('duran oyuncu 25 saniyede yakalaniyor', r.yakalandi, `-> yakalandi=${r.yakalandi}`);
if (r.yakalandi) console.log(`     (yakalanma suresi ${r.saniye.toFixed(1)} s)`);

/* 3. Dagilma: her bekci KENDI kosesine ulasmali.
   Dogru olcum "su anda kosesine yakin mi" DEGIL: bekciler kosede
   DONUYORLAR, tek bir ana bakmak dongunun rastgele bir noktasini
   yakaliyor. Dogru soru: kosesine HIC yaklasti mi? */
d = kurulum();
{
  const enYakin = Object.fromEntries(d.bekciler.map((b) => [b.id, Infinity]));
  /* TEK uzun kosu: oynat() her cagrida kendi saatini sifirdan baslatiyor,
     yani 30 kere 1 saniye kosturmak gec cikan bekcileri (imp 8 s) hic
     evden cikarmiyordu. */
  /* Carpisma KAPALI: duran oyuncuya bir bekci degince benzetim erken
     bitiyordu ve en son cikan imp kosesine varamiyordu. Burada olculen
     sey kovalama degil, dagilmanin kendisi. */
  oynat(d, 45, 'dagil', false, (bekciler) => {
    for (const b of bekciler) {
      if (b.evde || b.cikiyor) continue;
      enYakin[b.id] = Math.min(enYakin[b.id], Math.hypot(b.x - b.kose.x, b.y - b.kose.y));
    }
  }, false);
  t('dagilmada her bekci kendi kosesine variyor',
    Object.values(enYakin).every((m) => m <= 1),
    '-> ' + Object.entries(enYakin).map(([k, v]) => `${k}:${v === Infinity ? 'hic cikmadi' : v.toFixed(1)}`).join(' '));
}

/* 4. Hedefler dogru mu (arastirilan kurallar) */
const o = { x: 10, y: 10, yon: YONLER[3] };   /* saga bakiyor */
const golem = { id: 'golem', kose: { x: 19, y: 1 } };
const orumcek = { id: 'orumcek', kose: { x: 1, y: 1 } };
const yarasa = { id: 'yarasa', kose: { x: 19, y: 21 } };
const imp = { id: 'imp', kose: { x: 1, y: 21 }, x: 10, y: 11 };
const impUzak = { id: 'imp', kose: { x: 1, y: 21 }, x: 1, y: 1 };
const bek = [{ id: 'golem', x: 5, y: 5 }];
t('golem hedefi = oyuncunun karesi',
  JSON.stringify(hedefKare(golem, o, bek, 'kovala')) === JSON.stringify({ x: 10, y: 10 }));
t('orumcek hedefi = 4 kare on',
  JSON.stringify(hedefKare(orumcek, o, bek, 'kovala')) === JSON.stringify({ x: 14, y: 10 }));
t('yarasa hedefi = golemden 2-kare-on uzerinden iki kat',
  JSON.stringify(hedefKare(yarasa, o, bek, 'kovala')) === JSON.stringify({ x: 19, y: 15 }),
  '-> ' + JSON.stringify(hedefKare(yarasa, o, bek, 'kovala')));
t('imp YAKINKEN kendi kosesine kaciyor',
  JSON.stringify(hedefKare(imp, o, bek, 'kovala')) === JSON.stringify({ x: 1, y: 21 }));
t('imp UZAKKEN oyuncuyu kovaliyor',
  JSON.stringify(hedefKare(impUzak, o, bek, 'kovala')) === JSON.stringify({ x: 10, y: 10 }));
t('dagilma modunda hedef = kendi kosesi',
  JSON.stringify(hedefKare(golem, o, bek, 'dagil')) === JSON.stringify({ x: 19, y: 1 }));

/* 5. Geri donme yasagi */
const b2 = { id: 'golem', kose: { x: 19, y: 1 }, x: 10, y: 10, yon: YONLER[3] };
const sec = bekciYonSec(b2, { x: 1, y: 10, yon: YONLER[1] }, bek, 'kovala');
t('bekci kendi istegiyle geri donmuyor', !(sec.x === -1 && sec.y === 0), '-> ' + sec.ad);

console.log(`\n${ok} basarili, ${kotu} basarisiz`);
process.exit(kotu ? 1 : 0);
