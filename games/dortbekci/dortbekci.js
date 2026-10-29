
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v304';
import { submitScore, getBest, clearState, settleAbandonedRun } from '../../js/store.js?v304';
import { registerTexts, t, applyStaticTexts, mhHtml } from '../../js/i18n-hook.js?v304';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v304';
import { yarimBirakmaOnayi } from '../../js/onay.js?v304';
import { HARITA, EN, BOY, TUNEL_SATIR } from './labirent.mjs?v304';
/* Hareket ve yapay zeka AYRI dosyada: bu ortamda tarayicida dogru
   olculemiyor (requestAnimationFrame saniyede 1 kez donuyor), bu
   yuzden tarayicisiz sabit adimli test ediliyor (test-dortbekci.mjs).
   Kopyasi burada TUTULMUYOR - tek kaynak logic.mjs. */
import { YONLER, sar, gecilir, ilerlet, bekciYonSec } from './logic.mjs?v304';

const GAME_ID = 'dortbekci';
const POINTS_DIVISOR = 30;
const SCORE_CAP = 60000;

const YEM_PUAN = 10, BUYUK_PUAN = 50;
const BEKCI_PUAN = [200, 400, 800, 1600];   /* ayni korku doneminde ust uste */
const CAN = 3;
const KORKU_SURE = 7000;                     /* ms */

/* HIZLAR (kare/saniye cinsinden degil, "kare basina kac kare" oraninda).
   Orijinal oyunda bekciler oyuncudan BIRAZ yavas; korkunca cok yavas;
   tunelde yari hiza duser. Oyuncu tunelde yavaslamaz. */
const HIZ = { oyuncu: 5.6, bekci: 5.0, korkmus: 3.0, tunel: 2.6, donen: 10 };

registerTexts(GAME_ID, {
  title: 'Dört Bekçi',
  subtitle: 'Korları topla, bekçilerden kaç',
  score: 'SKOR',
  best: 'REKOR',
  can: 'CAN',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Parmağını kaydırarak yön ver.',
  gameOver: 'Yakalandın',
  kazandin: 'Mağara temizlendi!',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} $MH kazandın.',
  basla: 'Başlamak için dokun',
});

/* ---------- BEKCILER ----------
   Her bekcinin tek farki HEDEF KARESI. Yol bulma algoritmasi yok:
   kavsakta dort yone bakip hedefe en yakin olani seciyorlar.

   Sekilleri davranislarini anlatiyor (siluetler bu yuzden farkli):
     golem   kare, agir     -> dogrudan uzerine gelir
     orumcek dikenli        -> onunu keser
     yarasa  kanatli        -> golemin yerine bagli, tahmin edilemez
     imp     kucuk, urkek   -> yaklasinca kacar
*/
/* Dagilma koseleri ACIK karelerde. Once labirentin dis kosesindeydiler
   (y=0 ve y=BOY-1, yani duvarin ici): bekci oraya hic varamadigi icin
   kosesinin etrafinda donmek yerine yolda oyalaniyordu. Olculdu: imp
   kendi kosesine 45 saniyede ancak yaklasabiliyordu. Acik kareye
   tasinince dordu de kosesine TAM variyor ve orada donuyor. */
const BEKCILER = [
  { id: 'golem',   kose: { x: EN - 2, y: 1 },       cikis: 0 },
  { id: 'orumcek', kose: { x: 1, y: 1 },            cikis: 1200 },
  { id: 'yarasa',  kose: { x: EN - 2, y: BOY - 2 }, cikis: 4000 },
  { id: 'imp',     kose: { x: 1, y: BOY - 2 },      cikis: 8000 },
];

/* Kovala / dagil donemleri. Dagilma, oyuncuya nefes aldiran sey.
   Mod degisiminde bekciler ZORLA geri doner (kendi istekleriyle donemezler). */
const DONEMLER = [
  { mod: 'dagil', sure: 7000 }, { mod: 'kovala', sure: 20000 },
  { mod: 'dagil', sure: 7000 }, { mod: 'kovala', sure: 20000 },
  { mod: 'dagil', sure: 5000 }, { mod: 'kovala', sure: Infinity },
];

const tuval = document.getElementById('tuval');
const ctx = tuval.getContext('2d');
const skorEl = document.getElementById('score');
const canEl = document.getElementById('can');
const bestEl = document.getElementById('best');
const perde = document.getElementById('overlay');
const perdeBaslik = document.getElementById('overlay-title');
const perdeMetin = document.getElementById('overlay-text');
const perdeBtn = document.getElementById('overlay-btn');
const perdeIkon = document.getElementById('overlay-ikon');

let K = 0, OX = 0, OY = 0;      /* kare boyu ve tuval icindeki kayma */
let harita = [];                 /* yenebilir hucreler: '.', 'o', ' ' */
let oyuncu = null;
let bekciler = [];
let skor = 0, rekor = 0, can = CAN, kalanYem = 0;
let korkuBitis = 0, yenenBekci = 0;
let donemNo = 0, donemBitis = 0, mod = 'dagil';
let bitti = false, durdu = false, basladi = false;
let sonKare = 0;

const gorseller = {};
for (const ad of ['ejderha', 'golem', 'orumcek', 'yarasa', 'imp']) {
  const g = new Image();
  g.src = `assets/${ad}-48.webp?v292`;
  gorseller[ad] = g;
}

initTelegram();
applyStaticTexts();
showBackButton(eveDon);
backToHubOnResume();
document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));
document.addEventListener('langchange', () => applyStaticTexts());

document.getElementById('back-link').addEventListener('click', (e) => { e.preventDefault(); eveDon(); });
document.getElementById('new-game').addEventListener('click', () => { haptic.tap(); yeniOyun(); });
perdeBtn.addEventListener('click', () => { haptic.tap(); yeniOyun(); });

/* KONTROL: parmak kaydirma. Dokunulan nokta ile birakilan nokta
   arasindaki yon, oyuncunun SIRADAKI yonu oluyor; kavsaga gelince
   uygulaniyor (orijinal oyundaki gibi, "yon kuyrugu"). */
let dokunBas = null;
tuval.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!basladi && !bitti) basladi = true;
  dokunBas = { x: e.clientX, y: e.clientY };
});
tuval.addEventListener('pointerup', (e) => {
  if (!dokunBas) return;
  const dx = e.clientX - dokunBas.x, dy = e.clientY - dokunBas.y;
  dokunBas = null;
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
  oyuncu.istek = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? YONLER[3] : YONLER[1])
    : (dy > 0 ? YONLER[2] : YONLER[0]);
});
document.addEventListener('keydown', (e) => {
  if (!basladi && !bitti) basladi = true;
  const m = { ArrowUp: 0, ArrowLeft: 1, ArrowDown: 2, ArrowRight: 3 }[e.code];
  if (m !== undefined && oyuncu) { e.preventDefault(); oyuncu.istek = YONLER[m]; }
});

addEventListener('resize', olcule);
olcule();
getBest(GAME_ID).then((b) => { rekor = b || 0; bestEl.textContent = rekor; });
yeniOyun();
requestAnimationFrame(dongu);

async function eveDon() {
  if (!bitti && basladi && skor > 0) {
    durdu = true;
    const cik = await yarimBirakmaOnayi(t);
    durdu = false;
    if (!cik) { sonKare = performance.now(); return; }
    await settleAbandonedRun(GAME_ID, skor, Math.floor(skor / POINTS_DIVISOR));
  }
  window.location.href = '../../index.html';
}

function olcule() {
  /* clientWidth/Height kullaniliyor, getBoundingClientRect DEGIL:
     .cerceveli siniflari 14px'lik bir border-image ekliyor ve rect o
     cerceveyi DE olcuyor. Tuval boylece her kenardan 14px fazla genis
     kaliyor, saga kayiyor ve sag kenari cerceve tarafindan kirpiliyordu
     (Dort Bekci'de labirentin son sutunu gorunmuyordu). clientWidth
     yalnizca ic alani veriyor. */
  const alan = tuval.parentElement;
  const g = Math.max(220, alan.clientWidth);
  const y = Math.max(260, alan.clientHeight);
  K = Math.floor(Math.min(g / EN, y / BOY));
  OX = Math.round((g - K * EN) / 2);
  OY = Math.round((y - K * BOY) / 2);
  const o = Math.min(3, devicePixelRatio || 1);
  tuval.width = Math.round(g * o);
  tuval.height = Math.round(y * o);
  tuval.style.width = g + 'px';
  tuval.style.height = y + 'px';
  ctx.setTransform(o, 0, 0, o, 0, 0);
}

/* ---------- kurulum ---------- */
function yeniOyun() {
  harita = HARITA.map((r) => r.split(''));
  kalanYem = harita.flat().filter((c) => c === '.' || c === 'o').length;
  skor = 0; can = CAN;
  bitti = false; durdu = false; basladi = false;
  clearState(GAME_ID);
  perde.hidden = true;
  turBasla();
  yaz();
  sonKare = performance.now();
}

/* Can kaybinda veya tur basinda herkes yerine doner; harita (yenen
   yemler) KORUNUR. */
function turBasla() {
  oyuncu = { x: 10, y: 18, yon: YONLER[1], istek: null, ilerleme: 0 };
  /* Evdeki dort bekci AYRI karelerde duruyor. Once dordu de (10,12)'ye
     konmustu ve ust uste binip tek yaratik gibi gorunuyorlardi.
     Ev satiri 12'de 8-12 arasi bos (bkz. labirent.mjs). */
  const evYerleri = [[9, 12], [10, 12], [11, 12], [10, 13]];
  bekciler = BEKCILER.map((b, i) => ({
    ...b,
    x: evYerleri[i][0], y: evYerleri[i][1],
    yon: YONLER[0], ilerleme: 0,
    /* Evden TEK TEK cikiyorlar; dordu birden ciksa ilk saniye bogucu. */
    evde: true, cikiyor: false, cikisZamani: performance.now() + b.cikis,
    korkmus: false, donuyor: false,
  }));
  donemNo = 0; mod = DONEMLER[0].mod;
  donemBitis = performance.now() + DONEMLER[0].sure;
  korkuBitis = 0; yenenBekci = 0;
}

function yaz() {
  skorEl.textContent = skor;
  canEl.textContent = can;
}

/* ---------- hareket ---------- */
/* ---------- bekci hedefleri ---------- */
/* ---------- dongu ---------- */
function dongu(simdi) {
  const dt = Math.min(48, simdi - sonKare) / 16.6667;
  sonKare = simdi;
  if (!bitti && !durdu && basladi) adim(dt, simdi);
  ciz(simdi);
  requestAnimationFrame(dongu);
}

function adim(dt, simdi) {
  /* mod saati — korku sirasinda DURUYOR */
  if (!korkuAktif(simdi) && simdi > donemBitis && donemNo < DONEMLER.length - 1) {
    donemNo++;
    mod = DONEMLER[donemNo].mod;
    donemBitis = simdi + DONEMLER[donemNo].sure;
    /* MOD DEGISIMINDE ZORLA GERI DONUS. Bekciler kendi istekleriyle
       donemez; donduren tek sey bu. */
    for (const b of bekciler) if (!b.evde && !b.donuyor) b.yon = { x: -b.yon.x, y: -b.yon.y, ad: 'ters' };
  }
  if (korkuBitis && simdi > korkuBitis) {
    korkuBitis = 0;
    for (const b of bekciler) b.korkmus = false;
  }

  /* --- oyuncu --- */
  /* Yon degisikligi yalnizca kare sinirinda uygulanir; ortasinda
     degistirmek karakteri yerinden ziplatirdi (konum x + yon*ilerleme). */
  if (oyuncu.ilerleme === 0 && oyuncu.istek
      && gecilir(oyuncu.x + oyuncu.istek.x, oyuncu.y + oyuncu.istek.y)) {
    oyuncu.yon = oyuncu.istek; oyuncu.istek = null;
  }
  if (!gecilir(oyuncu.x + oyuncu.yon.x, oyuncu.y + oyuncu.yon.y)) {
    oyuncu.ilerleme = 0;        /* duvara dayandi, istek bekleniyor */
  } else if (ilerlet(oyuncu, HIZ.oyuncu, dt)) {
    oyuncu.ilerleme = 0;        /* kareye tam otur, donus firsati dogsun */
  }

  /* yem yeme */
  const c = harita[oyuncu.y]?.[oyuncu.x];
  if (c === '.' || c === 'o') {
    harita[oyuncu.y][oyuncu.x] = ' ';
    kalanYem--;
    if (c === 'o') {
      skor += BUYUK_PUAN;
      korkuBitis = simdi + KORKU_SURE;
      yenenBekci = 0;
      for (const b of bekciler) if (!b.donuyor) { b.korkmus = true; b.yon = { x: -b.yon.x, y: -b.yon.y, ad: 'ters' }; }
      SFX.match(); haptic.success();
    } else {
      skor += YEM_PUAN;
      SFX.pop();
    }
    skor = Math.min(SCORE_CAP, skor);
    yaz();
    if (kalanYem === 0) { oyunBitti(true); return; }
  }

  /* --- bekciler --- */
  for (const b of bekciler) {
    if (b.evde) {
      if (simdi >= b.cikisZamani) {
        b.evde = false; b.cikiyor = true;
        b.x = 10; b.y = 12; b.ilerleme = 0; b.yon = YONLER[0];
      }
      continue;
    }

    /* EVDEN CIKIS. Bu asamada hedef mantigi KAPALI: bekci duz yukari
       cikip kapiyi gecer, ancak koridora varinca kovalamaya baslar.
       Onceden boyle bir asama yoktu ve su oluyordu: bekci kapiya cikiyor,
       hedefi (kose ya da oyuncu) ASAGIDA oldugu icin hemen geri donuyor,
       kapi iceriden gecilmedigi icin de bir daha cikamiyordu. Dordu de
       ev ile kapi arasinda gidip geliyor, oyuncuyu hic kovalamiyordu. */
    if (b.cikiyor) {
      b.yon = YONLER[0];
      if (ilerlet(b, HIZ.bekci, dt)) b.ilerleme = 0;
      if (b.y <= 10) { b.cikiyor = false; b.yon = YONLER[3]; }
      continue;
    }
    const tunelde = b.y === TUNEL_SATIR;
    const hiz = b.donuyor ? HIZ.donen : b.korkmus ? HIZ.korkmus : (tunelde ? HIZ.tunel : HIZ.bekci);
    /* Onundeki kare kapaliysa hemen yeni yon sec. */
    if (!gecilir(b.x + b.yon.x, b.y + b.yon.y, b.donuyor)) b.yon = bekciYonSec(b, oyuncu, bekciler, mod);
    if (ilerlet(b, hiz, dt)) {
      b.ilerleme = 0;              /* kareye tam otur */
      b.yon = bekciYonSec(b, oyuncu, bekciler, mod);      /* KARAR ANI: her yeni karede yon secilir */
    }
    if (b.donuyor && b.x === 10 && b.y >= 12) {
      b.donuyor = false; b.korkmus = false; b.evde = true;
      b.x = 10; b.y = 12; b.ilerleme = 0;
      b.cikisZamani = simdi + 1200;
    }
  }

  /* --- carpisma --- */
  /* Carpisma SUREKLI konuma gore olculuyor, kare esitligine gore degil.
     Once "ayni karede mi" diye bakiliyordu; karsilikli gelen iki karakter
     ayni karede HIC bulunmuyor, bir karede yer degistirip birbirinin
     icinden geciyorlardi. Oyunun kaybetme yolu yoktu: 13 saniye boyunca
     hic kimildamadan beklendi, dort bekci de etrafta dolasti, can
     dusmedi. Esik 0,7 kare: carpisma gorulduğu anda tetikleniyor. */
  const surekli = (v) => ({ x: v.x + v.yon.x * v.ilerleme, y: v.y + v.yon.y * v.ilerleme });
  const op = surekli(oyuncu);
  for (const b of bekciler) {
    if (b.evde || b.donuyor) continue;
    const bp = surekli(b);
    /* Tunelde sarma yuzunden bir uctan digerine "uzak" gorunebilir. */
    const dx = Math.min(Math.abs(bp.x - op.x), EN - Math.abs(bp.x - op.x));
    if (Math.hypot(dx, bp.y - op.y) > 0.7) continue;
    if (b.korkmus) {
      skor = Math.min(SCORE_CAP, skor + BEKCI_PUAN[Math.min(3, yenenBekci++)]);
      b.donuyor = true; b.korkmus = false;
      SFX.coin(); haptic.success(); yaz();
    } else {
      canKaybi();
      return;
    }
  }
}

const korkuAktif = (simdi) => korkuBitis && simdi < korkuBitis;

function canKaybi() {
  can--;
  yaz();
  SFX.gameOver(); haptic.error();
  if (can <= 0) { oyunBitti(false); return; }
  basladi = false;
  turBasla();
}

/* ---------- cizim ---------- */
const duvarMi = (tx, ty) => HARITA[ty]?.[tx] === '#';

/* DUVARLAR — BIRLESIK HATLAR, AYRI KARELER DEGIL.

   Once her duvar karesi kendi basina, 1 piksel bosluk birakilarak
   doldurulmus bir kare olarak ciziliyordu. Sonuc labirent degil
   DAMA TAHTASI gibi duruyordu: koridorlarin nerede bittigi
   okunmuyordu ve oyun ucuz goruyordu.

   Gercek Pac-Man duvari doldurmaz, SINIRINI cizer: duvar kutlesinin
   disa bakan kenarlari boyunca tek bir parlak hat gider ve koseler
   yuvarlaktir. Burada yapilan da bu, ve hicbir gorsel dosyasi
   gerekmiyor - yalnizca komsuluk bilgisi:

     - Bir kenar, KOMSUSU DUVAR DEGILSE ciziliyor (yani dis sinir).
     - Komsusu duvarsa hat kutucuk kenarina kadar UZATILIYOR ki yan
       karenin hattiyla kesintisiz birlessin.
     - Iki komsu da bossa aradaki kose YUVARLATILIYOR (dis kose).
     - Iki komsu duvar ama CAPRAZ komsu bossa, ic kose yuvarlatiliyor;
       bunlar koridor aglarinin donus noktalari.

   Her yay tek bir kenarin sorumlulugunda: ust kenar ust iki koseyi,
   alt kenar alt iki koseyi ciziyor. Yoksa her kose iki kez cizilir ve
   hat o noktalarda kalinlasir. */
function duvarlariCiz() {
  const ic = Math.max(1.2, K * 0.2);          /* hattin kutucuk kenarina uzakligi */
  const r = Math.min(ic * 1.7, K * 0.3);      /* kose yaricapi */

  ctx.strokeStyle = '#4a74d8';
  ctx.lineWidth = Math.max(1.3, K * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let ty = 0; ty < BOY; ty++) {
    for (let tx = 0; tx < EN; tx++) {
      if (!duvarMi(tx, ty)) continue;
      const px = OX + tx * K, py = OY + ty * K;
      const U = duvarMi(tx, ty - 1), D = duvarMi(tx, ty + 1);
      const L = duvarMi(tx - 1, ty), R = duvarMi(tx + 1, ty);
      const x0 = px + ic, x1 = px + K - ic, y0 = py + ic, y1 = py + K - ic;

      ctx.beginPath();

      if (!U) {
        ctx.moveTo(L ? px : x0 + r, y0);
        ctx.lineTo(R ? px + K : x1 - r, y0);
        if (!L) { ctx.moveTo(x0 + r, y0); ctx.quadraticCurveTo(x0, y0, x0, y0 + r); }
        if (!R) { ctx.moveTo(x1 - r, y0); ctx.quadraticCurveTo(x1, y0, x1, y0 + r); }
      }
      if (!D) {
        ctx.moveTo(L ? px : x0 + r, y1);
        ctx.lineTo(R ? px + K : x1 - r, y1);
        if (!L) { ctx.moveTo(x0 + r, y1); ctx.quadraticCurveTo(x0, y1, x0, y1 - r); }
        if (!R) { ctx.moveTo(x1 - r, y1); ctx.quadraticCurveTo(x1, y1, x1, y1 - r); }
      }
      if (!L) {
        ctx.moveTo(x0, U ? py : y0 + r);
        ctx.lineTo(x0, D ? py + K : y1 - r);
      }
      if (!R) {
        ctx.moveTo(x1, U ? py : y0 + r);
        ctx.lineTo(x1, D ? py + K : y1 - r);
      }

      /* Ic koseler: iki komsu duvar, capraz komsu bos. Hat kutucugun
         KOSESINDEN donuyor, boylece iki koridor birlesiyor. */
      if (U && L && !duvarMi(tx - 1, ty - 1)) { ctx.moveTo(px, y0); ctx.quadraticCurveTo(x0, y0, x0, py); }
      if (U && R && !duvarMi(tx + 1, ty - 1)) { ctx.moveTo(px + K, y0); ctx.quadraticCurveTo(x1, y0, x1, py); }
      if (D && L && !duvarMi(tx - 1, ty + 1)) { ctx.moveTo(px, y1); ctx.quadraticCurveTo(x0, y1, x0, py + K); }
      if (D && R && !duvarMi(tx + 1, ty + 1)) { ctx.moveTo(px + K, y1); ctx.quadraticCurveTo(x1, y1, x1, py + K); }

      ctx.stroke();
    }
  }
}

function ciz(simdi) {
  const g = parseFloat(tuval.style.width), y = parseFloat(tuval.style.height);
  ctx.fillStyle = '#080a12';
  ctx.fillRect(0, 0, g, y);

  duvarlariCiz();

  /* yemler ve kapi */
  for (let ty = 0; ty < BOY; ty++) {
    for (let tx = 0; tx < EN; tx++) {
      const c = HARITA[ty][tx];
      const px = OX + tx * K, py = OY + ty * K;
      if (c === '-') {
        ctx.fillStyle = '#6f7fa8';
        ctx.fillRect(px + 1, py + K / 2 - 2, K - 2, 3);
      }
      const h = harita[ty]?.[tx];
      if (h === '.') {
        ctx.fillStyle = '#f0c879';
        ctx.beginPath(); ctx.arc(px + K / 2, py + K / 2, Math.max(1.4, K * 0.11), 0, 7); ctx.fill();
      } else if (h === 'o') {
        const nabiz = 1 + Math.sin(simdi / 180) * 0.22;
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath(); ctx.arc(px + K / 2, py + K / 2, K * 0.3 * nabiz, 0, 7); ctx.fill();
      }
    }
  }

  const konum = (v) => ({
    px: OX + (v.x + v.yon.x * v.ilerleme) * K + K / 2,
    py: OY + (v.y + v.yon.y * v.ilerleme) * K + K / 2,
  });

  for (const b of bekciler) {
    const { px, py } = konum(b);
    const boy = K * 1.5;
    ctx.save();
    if (b.donuyor) ctx.globalAlpha = 0.35;
    else if (b.korkmus) {
      /* Korku bitmeye yakin yanip sonuyor - oyuncuya uyari. */
      const kalan = korkuBitis - simdi;
      ctx.globalAlpha = (kalan < 1800 && Math.floor(simdi / 180) % 2) ? 0.35 : 1;
      ctx.filter = 'hue-rotate(185deg) saturate(1.6) brightness(0.85)';
    }
    const gr = gorseller[b.id];
    if (gr?.complete && gr.naturalWidth) ctx.drawImage(gr, px - boy / 2, py - boy / 2, boy, boy);
    ctx.restore();
  }

  const { px, py } = konum(oyuncu);
  const boy = K * 1.5;
  const gr = gorseller.ejderha;
  if (gr?.complete && gr.naturalWidth) ctx.drawImage(gr, px - boy / 2, py - boy / 2, boy, boy);

  if (!basladi && !bitti) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, y * 0.42, g, 42);
    ctx.fillStyle = '#fff';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('basla'), g / 2, y * 0.42 + 27);
  }
}

/* ---------- bitis ---------- */
async function oyunBitti(kazandi) {
  if (bitti) return;
  bitti = true;
  if (kazandi) { SFX.coin(); haptic.success(); }

  const kendi = t('yourScore', { score: skor });
  perdeBaslik.textContent = kazandi ? t('kazandin') : t('gameOver');
  perdeMetin.textContent = kendi;
  perdeBtn.textContent = t('playAgain');
  perdeIkon.className = 'overlay-ikon ' + (kazandi ? 'ik-rekor' : 'ik-bitti');
  perde.hidden = false;

  const sonuc = await submitScore(GAME_ID, skor, Math.floor(skor / POINTS_DIVISOR));
  rekor = sonuc.best;
  bestEl.textContent = rekor;
  const { earned } = await sonuc.odeme;
  const satirlar = [kendi];
  if (sonuc.isRecord) satirlar.push(t('newRecord'));
  if (earned > 0) satirlar.push(t('earnedPoints', { points: earned }));
  if (!perde.hidden && satirlar.length > 1) perdeMetin.innerHTML = mhHtml(satirlar.join(' · '));
}
