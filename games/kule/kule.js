
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v305';
import { submitScore, getBest, clearState, settleAbandonedRun } from '../../js/store.js?v305';
import { registerTexts, t, applyStaticTexts, mhHtml } from '../../js/i18n-hook.js?v305';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v305';
import { yarimBirakmaOnayi } from '../../js/onay.js?v305';

const GAME_ID = 'kule';

/* DENGE SAYILARI — hepsi burada, baska dosyaya dokunmadan ayarlanir. */
const POINTS_DIVISOR = 12;   /* yalnizca MISAFIR modunda; gercek odeme sunucudan */
const SCORE_CAP = 5000;      /* sunucudaki tavanla ayni olmali (bot/worker.js OYUN_ODEME) */
const BLOK_PUAN = 10;        /* her yerlesen blok */
const TAM_PUAN = 25;         /* tam ustune oturtma ek puani */
const TAM_ESIK = 4;          /* kac piksele kadar "tam" sayilir */
const TAM_ODUL = 6;          /* ust uste tam vurusta geri verilen genislik */
const BLOK_Y = 26;           /* bir blogun yuksekligi */
const BAS_GENISLIK = 0.62;   /* ilk blok, alanin yuzde kaci */
const HIZ_BAS = 2.1;
const HIZ_ARTIS = 0.055;     /* her blokta */
const HIZ_TAVAN = 6.4;
const UST_BOSLUK = 7;        /* kulenin tepesi ekranin kacinci blogunda dursun */

registerTexts(GAME_ID, {
  title: 'Kule',
  subtitle: 'Dokun ve bloğu bırak',
  score: 'SKOR',
  best: 'REKOR',
  kat: 'KAT',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Blok kayarken dokun. Taşan kısım kesilir.',
  gameOver: 'Kule devrildi',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} $MH kazandın.',
  tamVurus: 'Tam isabet!',
});

/* YUKSEKLIK KUSAKLARI. Oyuncu ne kadar yukari ciktigini sayiya bakmadan
   anlasin diye gokyuzu degisiyor: yerden basliyor, bulutlara, oradan
   yildizlara. Tamamen renk gecisi - tek piksel gorsel indirilmiyor. */
const KUSAKLAR = [
  { kat: 0,  ust: '#171b2b', alt: '#0b0d14' },  /* yer */
  { kat: 12, ust: '#1d3350', alt: '#141a2c' },  /* alacakaranlik */
  { kat: 28, ust: '#2a4a6e', alt: '#17263f' },  /* bulut */
  { kat: 50, ust: '#1a2a52', alt: '#0d1024' },  /* yuksek gok */
  { kat: 80, ust: '#241a4a', alt: '#0a0a18' },  /* yildizlar */
];

/* TAS GORSELLERI — Kenney.nl "Platformer Pack Medieval", CC0 (kamu mali).
   Bloklar eskiden duz HSL dikdortgenlerdi; kule iki kahverengi cubuk
   gibi duruyordu. Artik her blok tas duvar kutucuklariyla doseniyor:
   iki ucta kenar sutunu, arada tekrarlayan govde. Kutucuklar 70x70 ve
   kare dosenmek icin tasarlandi, o yuzden blok yuksekligi kadar
   (BLOK_Y) kare parcalar halinde yan yana diziliyor.

   Dosyalar kucuk (toplam ~2,5 KB) ve lisans atif istemiyor; yine de
   kaynak assets/BENIOKU.md'de yaziyor. */
const gorseller = {};
for (const ad of ['tas-govde', 'tas-sol', 'tas-sag', 'mesale-a', 'mesale-b']) {
  const g = new Image();
  g.src = `assets/${ad}.webp?v304`;
  gorseller[ad] = g;
}
/* Gorseller inene kadar oyun BEKLEMIYOR: hazir olmayan kutucugun
   yerine eski duz dikdortgen ciziliyor. Yavas baglantida oyun yine
   aciliyor, sadece birkac kare sade goruntuyle basliyor. */
const hazirMi = (g) => g.complete && g.naturalWidth > 0;

/* O karenin gokyuzu dolgusu; mazgallari oymak icin tacCiz kullaniyor. */
let gokDolgu = null;

const tuval = document.getElementById('tuval');
const ctx = tuval.getContext('2d');
const skorEl = document.getElementById('score');
const katEl = document.getElementById('kat');
const bestEl = document.getElementById('best');
const perde = document.getElementById('overlay');
const perdeBaslik = document.getElementById('overlay-title');
const perdeMetin = document.getElementById('overlay-text');
const perdeBtn = document.getElementById('overlay-btn');
const perdeIkon = document.getElementById('overlay-ikon');
const tamEl = document.getElementById('tam-yazi');

let G = 0, Y = 0;            /* tuvalin CSS olculeri */
let bloklar = [];            /* yerlesmis bloklar, tabandan yukari */
let aktif = null;            /* kayan blok */
let dusenler = [];           /* kesilip dusen parcalar (yalnizca gorsel) */
let kamera = 0;              /* kac piksel yukari kaydirildi */
let kameraHedef = 0;
let skor = 0, rekor = 0, tamSeri = 0;
let bitti = false, durdu = false;
let sonKare = 0;

/* ---------- kurulum ---------- */
initTelegram();
applyStaticTexts();
showBackButton(eveDon);
backToHubOnResume();
document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

document.getElementById('back-link').addEventListener('click', (e) => { e.preventDefault(); eveDon(); });
document.getElementById('new-game').addEventListener('click', () => { haptic.tap(); yeniOyun(); });
perdeBtn.addEventListener('click', () => { haptic.tap(); yeniOyun(); });

/* Tek girdi: ekrana dokunmak. Perde acikken oyunu ilerletmesin. */
const birak = (e) => {
  if (bitti || durdu || perde.hidden === false) return;
  e.preventDefault();
  blogBirak();
};
tuval.addEventListener('pointerdown', birak);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') birak(e);
});

addEventListener('resize', olcule);
document.addEventListener('langchange', () => applyStaticTexts());
olcule();
getBest(GAME_ID).then((b) => { rekor = b || 0; bestEl.textContent = rekor; });
yeniOyun();
/* Dongu BIR KEZ basliyor. Onceden yeniOyun() icindeydi: her "Yeniden
   oyna" bir dongu daha aciyordu, blok iki kat hizlaniyordu ve ikinci
   oyunda ilk dokunusta kule deviriliyordu. Testte yakalandi. */
requestAnimationFrame(dongu);

async function eveDon() {
  /* Oyun basladiysa ve bitmediyse yarim birakma onayi - diger oyunlarla
     ayni davranis. Onaylarsa skor sunucuya "birakildi" olarak gidiyor. */
  if (!bitti && bloklar.length > 1) {
    durdu = true;
    const cik = await yarimBirakmaOnayi(t);
    durdu = false;
    /* Vazgectiyse oyun kaldigi yerden devam etsin; sonKare sifirlanmazsa
       bekleme suresi tek dev bir dt olarak geliyor ve blok firliyordu. */
    if (!cik) { sonKare = performance.now(); return; }
    await settleAbandonedRun(GAME_ID, skor, Math.floor(skor / POINTS_DIVISOR));
  }
  window.location.href = '../../index.html';
}

function olcule() {
  /* clientWidth/Height kullaniliyor, getBoundingClientRect DEGIL:
     .cerceveli siniflari 14px'lik bir border-image ekliyor ve rect o
     cerceveyi DE olcuyor; tuval her kenardan 14px tasip kirpiliyordu. */
  const alan = tuval.parentElement;
  G = Math.max(200, alan.clientWidth);
  Y = Math.max(260, alan.clientHeight);
  const o = Math.min(3, devicePixelRatio || 1);
  tuval.width = Math.round(G * o);
  tuval.height = Math.round(Y * o);
  tuval.style.width = G + 'px';
  tuval.style.height = Y + 'px';
  ctx.setTransform(o, 0, 0, o, 0, 0);
}

/* ---------- oyun ---------- */
function yeniOyun() {
  bloklar = [];
  dusenler = [];
  skor = 0; tamSeri = 0;
  bitti = false; durdu = false;
  kamera = 0; kameraHedef = 0;
  clearState(GAME_ID);
  perde.hidden = true;
  tamEl.hidden = true;

  const g = Math.round(G * BAS_GENISLIK);
  bloklar.push({ x: Math.round((G - g) / 2), g, kat: 0 });
  yeniAktif();
  skorYaz();
  sonKare = performance.now();
}

function yeniAktif() {
  const alt = bloklar[bloklar.length - 1];
  const hiz = Math.min(HIZ_TAVAN, HIZ_BAS + bloklar.length * HIZ_ARTIS);
  /* Her blok donusumlu olarak soldan ve sagdan gelsin; hep ayni yandan
     gelmesi oyunu ezberlenebilir yapiyordu. */
  const soldan = bloklar.length % 2 === 1;
  aktif = {
    g: alt.g,
    /* Blok EKRAN KENARINDA doguyor, disarisinda degil.
       Once x = -g (tamamen ekran disi) idi: iceri kaymasi ~1,8 saniye
       suruyordu ve o sure boyunca dokunmak ortusme sifir oldugu icin
       oyunu ANINDA bitiriyordu - oyuncuya hicbir isaret vermeden.
       Testte iki kez bu yuzden ilk dokunusta kaybedildi. Artik blok her
       an gorunur ve her dokunusun bir karsiligi var. */
    x: soldan ? 0 : G - alt.g,
    yon: soldan ? 1 : -1,
    hiz,
    kat: bloklar.length,
  };
}

function blogBirak() {
  const alt = bloklar[bloklar.length - 1];
  const sol = Math.max(aktif.x, alt.x);
  const sag = Math.min(aktif.x + aktif.g, alt.x + alt.g);
  const ortak = sag - sol;

  if (ortak <= 0) { oyunBitti(); return; }

  const kayma = aktif.x - alt.x;
  const tam = Math.abs(kayma) <= TAM_ESIK;

  if (tam) {
    /* TAM ISABET: hic kesilmiyor, uzerine blok alta gore hizalaniyor ve
       genislik biraz GERI VERILIYOR. Geri verme olmadan kule yalnizca
       daralabiliyordu, yani uzun oyun matematiksel olarak imkansizdi. */
    tamSeri++;
    const g = Math.min(bloklar[0].g, alt.g + TAM_ODUL);
    bloklar.push({ x: Math.round(alt.x - (g - alt.g) / 2), g, kat: aktif.kat, tam: true });
    skor += BLOK_PUAN + TAM_PUAN * Math.min(5, tamSeri);
    tamGoster();
    SFX.match();
    haptic.success();
  } else {
    tamSeri = 0;
    /* Tasan parca kesilip dusuyor - yalnizca gorsel, oyuna etkisi yok. */
    const parcaX = kayma > 0 ? sag : aktif.x;
    const parcaG = Math.abs(kayma);
    dusenler.push({ x: parcaX, g: parcaG, kat: aktif.kat, vy: 0, don: (kayma > 0 ? 1 : -1) * 0.04, aci: 0 });
    bloklar.push({ x: sol, g: ortak, kat: aktif.kat });
    skor += BLOK_PUAN;
    SFX.place();
    haptic.tap();
  }

  skor = Math.min(SCORE_CAP, skor);
  skorYaz();

  /* Kule ekranin UST_BOSLUK'uncu blogunu gecince kamera yukari kayiyor. */
  const tepe = bloklar.length;
  kameraHedef = Math.max(0, (tepe - UST_BOSLUK) * BLOK_Y);

  if (bloklar[bloklar.length - 1].g < 6) { oyunBitti(); return; }
  yeniAktif();
}

let tamZaman = 0;
function tamGoster() {
  tamEl.textContent = tamSeri > 1 ? `${t('tamVurus')} ×${Math.min(5, tamSeri)}` : t('tamVurus');
  tamEl.hidden = false;
  tamZaman = performance.now();
}

function skorYaz() {
  skorEl.textContent = skor;
  katEl.textContent = Math.max(0, bloklar.length - 1);
}

/* ---------- dongu ---------- */
function dongu(simdi) {
  const dt = Math.min(48, simdi - sonKare) / 16.6667;   /* 60 fps birimi */
  sonKare = simdi;

  if (!bitti && !durdu && aktif) {
    aktif.x += aktif.yon * aktif.hiz * dt;
    /* Kenara gelince geri donsun; disari tamamen cikarsa oyuncu bekler. */
    if (aktif.yon > 0 && aktif.x + aktif.g > G) { aktif.x = G - aktif.g; aktif.yon = -1; }
    if (aktif.yon < 0 && aktif.x < 0) { aktif.x = 0; aktif.yon = 1; }
  }

  kamera += (kameraHedef - kamera) * Math.min(1, 0.12 * dt);

  for (const d of dusenler) {
    d.vy += 0.9 * dt;
    d.dusme = (d.dusme || 0) + d.vy * dt;
    d.aci += d.don * dt;
  }
  dusenler = dusenler.filter((d) => (d.dusme || 0) < Y + 200);

  if (tamEl.hidden === false && simdi - tamZaman > 900) tamEl.hidden = true;

  ciz();
  requestAnimationFrame(dongu);
}

/* ---------- cizim ---------- */
function kusak(kat) {
  let a = KUSAKLAR[0], b = KUSAKLAR[0];
  for (let i = 0; i < KUSAKLAR.length; i++) {
    if (kat >= KUSAKLAR[i].kat) { a = KUSAKLAR[i]; b = KUSAKLAR[i + 1] || KUSAKLAR[i]; }
  }
  const aralik = Math.max(1, b.kat - a.kat);
  return { a, b, k: Math.min(1, Math.max(0, (kat - a.kat) / aralik)) };
}

const karistir = (c1, c2, k) => {
  const s = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [r1, g1, b1] = s(c1), [r2, g2, b2] = s(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
};

/* Blogun yuzey rengi kata gore donuyor: kule yukseldikce tasin tonu
   degisiyor, boylece katlar birbirinden ayirt ediliyor. */
/* Kat rengi. Kutucuklar tek renk (soguk gri-mavi) oldugu icin kuleyi
   renklendiren tek sey bu; 'multiply' ile basildigi icin ACIK renkler
   tasi oldugu gibi birakiyor, KOYU renkler boyuyor.

   Ton kehribardan basliyor (yerdeki mesale isigi), yukari cikildikca
   mora ve maviye donuyor - KUSAKLAR'daki gokyuzu gecisiyle ayni yonde.
   Kat basina 5 derece: 36 katta bir tam tur degil, yarim tur. Once
   tur basina 9 dereceydi ve kuleyi 40 katta iki kez bastan sona
   geziyordu, bu da hangi yukseklikte oldugunu renkten anlamayi
   imkansiz kiliyordu. */
function blokRengi(kat) {
  /* Ton GERIYE donuyor: 38 (kehribar) -> 0 (kor) -> 320 (macenta)
     -> 280 (mor) -> 240 (gece mavisi). Ileri gitseydi sariyi ve YESILI
     gecerdi; yesil bir kale hastalikli goruyordu ve ilk denemede butun
     kule aynı yesile battı. Geri yon atesten geceye cikiyor, yani
     KUSAKLAR'daki gokyuzu gecisiyle ayni hikaye. */
  const ton = (38 - kat * 4 + 720) % 360;
  /* Tam isabet RENGI DEGISTIRMIYOR. Once doygunlugu dusurup parlakligi
     88'e cikariyordu; multiply'da bu neredeyse beyaz demek, yani iyi
     oynayan oyuncunun kulesi bembeyaz griye donuyor ve yukseklik
     rengi tamamen kayboluyordu. Tam isabetin isareti artik yalnizca
     altin kenar. */
  return `hsl(${ton} 38% 78%)`;
}

function ciz() {
  const kat = Math.max(0, bloklar.length - 1);
  const { a, b, k } = kusak(kat);
  const gok = ctx.createLinearGradient(0, 0, 0, Y);
  gok.addColorStop(0, karistir(a.ust, b.ust, k));
  gok.addColorStop(1, karistir(a.alt, b.alt, k));
  ctx.fillStyle = gok;
  ctx.fillRect(0, 0, G, Y);
  /* Mazgal oymak icin ayni dolgu lazim (bkz. tacCiz). */
  gokDolgu = gok;

  /* Yildizlar yalnizca yukarida; alcakta gorunmuyorlar. */
  if (kat > 36) {
    const p = Math.min(1, (kat - 36) / 30);
    ctx.fillStyle = `rgba(255,255,255,${0.5 * p})`;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 7919) % 997) / 997 * G;
      const sy = ((i * 6271) % 991) / 991 * Y;
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
  }

  const ekranY = (katNo) => Y - 40 - (katNo + 1) * BLOK_Y + kamera;

  for (const d of dusenler) {
    ctx.save();
    ctx.translate(d.x + d.g / 2, ekranY(d.kat) + (d.dusme || 0) + BLOK_Y / 2);
    ctx.rotate(d.aci);
    ctx.globalAlpha = 0.75;
    blokCiz(-d.g / 2, -BLOK_Y / 2, d.g, blokRengi(d.kat));
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  for (const bl of bloklar) {
    const y = ekranY(bl.kat);
    if (y > Y + BLOK_Y || y < -BLOK_Y * 2) continue;
    blokCiz(bl.x, y, bl.g, blokRengi(bl.kat), bl.tam);
    if (bl.kat > 0 && bl.kat % 6 === 0) mesaleCiz(bl.x, y, bl.g, bl.kat);
  }

  /* Tac, kulenin en ustundeki YERLESMIS bloga konuyor; havada kayan
     blogun uzerine degil, yoksa siper ekranda ucusuyor. */
  const tepe = bloklar[bloklar.length - 1];
  if (tepe) {
    const ty = ekranY(tepe.kat);
    if (ty > -BLOK_Y * 2 && ty < Y + BLOK_Y) tacCiz(tepe.x, ty, tepe.g);
  }

  if (aktif && !bitti) blokCiz(aktif.x, ekranY(aktif.kat), aktif.g, blokRengi(aktif.kat));
}

/* Bir blogu tas kutucuklariyla doser. Kutucuk boyu = blok yuksekligi,
   yani kareler; genislik ona bolunmuyorsa ARTAN ORTADA kaliyor ve iki
   uc tam cikiyor - kenar sutunlari yarim kalmasin diye. */
function tasDose(x, y, g) {
  const sol = gorseller['tas-sol'], sag = gorseller['tas-sag'], govde = gorseller['tas-govde'];
  if (!hazirMi(sol) || !hazirMi(sag) || !hazirMi(govde)) return false;

  const k = BLOK_Y;
  if (g <= k * 2) {
    /* Cok dar blok: iki kenar sutunu sigmaz, tek govde geriliyor. */
    ctx.drawImage(govde, x, y, g, k);
    return true;
  }
  ctx.drawImage(sol, x, y, k, k);
  ctx.drawImage(sag, x + g - k, y, k, k);
  const ortaG = g - k * 2;
  const adet = Math.max(1, Math.round(ortaG / k));
  const birim = ortaG / adet;
  for (let i = 0; i < adet; i++) ctx.drawImage(govde, x + k + i * birim, y, birim + 0.5, k);
  return true;
}

function blokCiz(x, y, g, renk, tam) {
  if (!tasDose(x, y, g)) {
    /* Gorseller henuz inmedi - eski sade cizim. */
    ctx.fillStyle = renk;
    ctx.fillRect(x, y, g, BLOK_Y);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, y, g, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.fillRect(x, y + BLOK_Y - 3, g, 3);
    return;
  }

  /* Kutucuklar tek renk; yukari cikildikca kulenin rengi degissin diye
     blogun UZERINE saydam bir renk basiliyor. 'overlay' tasin dokusunu
     koruyor, duz boyama gibi ezmiyor. Blok tamamen opak dosendigi icin
     dikdortgenin disina tasmiyor. */
  /* 'multiply' secildi, 'overlay' degil: overlay orta parlakliktaki bir
     rengi acik tasin uzerine basinca neredeyse hicbir sey yapmiyordu,
     butun katlar ayni solgun griye cikiyordu. multiply tasin dokusunu
     koruyarak gercekten renklendiriyor. */
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = renk;
  ctx.fillRect(x, y, g, BLOK_Y);
  ctx.restore();

  /* Tam isabette altin bir kenar: oyuncu iyi vurdugunu kuleye BAKARAK
     gorsun, yalnizca ucup giden yaziyla degil. */
  if (tam) {
    ctx.strokeStyle = 'rgba(255,205,105,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, g - 1, BLOK_Y - 1);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x, y + BLOK_Y - 2, g, 2);
}

/* Kulenin tepesine mazgalli siper.

   ILK DENEME YANLISTI: siper, en ust blogun BIR KAT USTUNE ciziliyordu
   - ama orasi tam da kayan aktif blogun satiri. Aktif blok en sona
   cizildigi icin siperin uzerini her karede kapatiyordu ve mazgallar
   yalnizca blok uzaktayken, yarim yamalak gorunuyordu.

   Simdi mazgal blogun KENDI ustune OYULUYOR: tepe seridi gokyuzu
   dolgusuyla dis dis siliniyor. Siluet boylece gercekten disli
   oluyor ve hicbir sey ustunu ortmuyor. Kutucuk gorseli gerekmiyor. */
function tacCiz(x, y, g) {
  if (!gokDolgu) return;
  const yuk = 6;                      /* mazgal derinligi */
  const dis = Math.max(3, Math.round(g / 22));
  const adim = g / dis;
  ctx.fillStyle = gokDolgu;
  for (let i = 0; i < dis; i++) {
    /* Bir dis dolu, bir dis bos: tek olanlar oyuluyor. */
    if (i % 2 === 0) continue;
    ctx.fillRect(x + i * adim, y, adim, yuk);
  }
}

/* Yanan mesale: iki kare arasinda gidip gelerek titriyor. Her alti
   katta bir, kulenin donusumlu kenarinda. */
function mesaleCiz(x, y, g, kat) {
  const a = gorseller['mesale-a'], b = gorseller['mesale-b'];
  if (!hazirMi(a) || !hazirMi(b)) return;
  const kare = (Math.floor(performance.now() / 140) + kat) % 2 ? a : b;
  const en = BLOK_Y * 0.8, boy = BLOK_Y * 1.4;
  /* Mesale duvara TUTUNUYOR: govdesinin yarisi blogun uzerinde kaliyor.
     Once blogun tamamen disina konuyordu ve bosta asili duruyordu. */
  /* Mesale duvardan SARKIYOR: govdesinin dortte biri tasin uzerinde,
     gerisi disarida. Once yarisi iceride kaliyordu ve bloga gomulmus
     gibi duruyordu. */
  const sagda = Math.floor(kat / 6) % 2 === 0;
  const mx = sagda ? x + g - en * 0.25 : x - en * 0.75;
  if (mx < -en || mx > G) return;
  ctx.drawImage(kare, mx, y - boy * 0.46, en, boy);
}

/* ---------- bitis ---------- */
async function oyunBitti() {
  if (bitti) return;
  bitti = true;
  aktif = null;
  SFX.gameOver();
  haptic.error();

  /* Perde sunucuyu BEKLEMIYOR: skor elimizde, once onu gosteriyoruz;
     rekor ve kazanilan $MH satirlari arkasindan ekleniyor. (Ayni cozum:
     tripletile, wheelrush.) */
  const kendi = t('yourScore', { score: skor });
  perdeBaslik.textContent = t('gameOver');
  perdeMetin.textContent = kendi;
  perdeBtn.textContent = t('playAgain');
  perdeIkon.className = 'overlay-ikon ik-bitti';
  perde.hidden = false;

  const sonuc = await submitScore(GAME_ID, skor, Math.floor(skor / POINTS_DIVISOR));
  rekor = sonuc.best;
  bestEl.textContent = rekor;

  const { earned } = await sonuc.odeme;
  const satirlar = [kendi];
  if (sonuc.isRecord) satirlar.push(t('newRecord'));
  if (earned > 0) satirlar.push(t('earnedPoints', { points: earned }));

  /* Oyuncu bu arada "Yeniden oyna"ya basmis olabilir. */
  if (!perde.hidden && satirlar.length > 1) {
    perdeMetin.innerHTML = mhHtml(satirlar.join(' · '));
    if (sonuc.isRecord) perdeIkon.className = 'overlay-ikon ik-rekor';
  }
}
