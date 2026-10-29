
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v304';
import { submitScore, getBest, clearState, settleAbandonedRun } from '../../js/store.js?v304';
import { registerTexts, t, applyStaticTexts, mhHtml } from '../../js/i18n-hook.js?v304';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v304';
import { yarimBirakmaOnayi } from '../../js/onay.js?v304';

const GAME_ID = 'ilkucus';

/* DENGE — hepsi burada. */
const POINTS_DIVISOR = 20;
const SCORE_CAP = 10000;
const YERCEKIMI = 0.42;
const ZIPLAMA = -12.2;       /* yukari negatif */
const YAY_ZIPLAMA = -19;     /* yayli kaya: cok daha yukari */
const YATAY_HIZ = 0.26;      /* parmaga yetisme hizi */
const EJDER = 44;            /* ejderhanin ekrandaki boyu */
const KAYA_EN = 64, KAYA_BOY = 13;
const ARALIK_AZ = 58, ARALIK_COK = 104;   /* iki kaya arasi dikey mesafe */
const METRE = 12;            /* kac piksel = 1 metre (skor birimi) */

/* Ulasilabilirlik kontrolu: ziplamayla cikilan en yuksek mesafe
   ZIPLAMA^2 / (2*YERCEKIMI) = 177 px. ARALIK_COK bunun altinda kalmali,
   yoksa uretilen kule tirmanilamaz hale gelir. */

registerTexts(GAME_ID, {
  title: 'İlk Uçuş',
  subtitle: 'Yuvadan göğe zıpla',
  score: 'METRE',
  best: 'REKOR',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Parmağını sağa sola kaydır. Ejderha kendi zıplıyor.',
  gameOver: 'Düştün',
  playAgain: 'Yeniden oyna',
  yourScore: '{score} metre',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} $MH kazandın.',
  basla: 'Başlamak için dokun',
});

/* YUKSEKLIK KUSAKLARI — Kule'dekiyle ayni fikir: oyuncu ne kadar
   yukseldigini sayiya bakmadan gokyuzunden anlasin. Tamamen renk. */
const KUSAKLAR = [
  { m: 0,    ust: '#241a14', alt: '#120c09' },  /* yuva, toprak */
  { m: 120,  ust: '#2b2a3c', alt: '#171423' },  /* kayalik */
  { m: 320,  ust: '#2f4a6b', alt: '#1b2b44' },  /* bulut */
  { m: 650,  ust: '#1b2d5e', alt: '#0c1130' },  /* yuksek gok */
  { m: 1100, ust: '#2a1a52', alt: '#09081a' },  /* yildizlar */
];

/* KALAS GORSELLERI — Kenney.nl "Platformer Pack Medieval", CC0.
   Kayalar eskiden tek renkli yuvarlak dikdortgenlerdi; ekranda bir
   avuc bej cubuk gibi duruyorlardi. Artik ahsap kalas kutucuklariyla
   doseniyor: iki ucta kapak, arada gerilen govde.
   Kaynak ve esleme assets/BENIOKU.md'de. */
const gorseller = {};
for (const ad of ['kalas-sol', 'kalas-orta', 'kalas-sag', 'kaya-duvar']) {
  const g = new Image();
  g.src = `assets/${ad}.webp?v304`;
  gorseller[ad] = g;
}
const kalasHazir = () => ['kalas-sol', 'kalas-orta', 'kalas-sag']
  .every((a) => gorseller[a].complete && gorseller[a].naturalWidth > 0);

/* Kaya turunun rengi. Kalaslar tek renk (ahsap) oldugu icin tur farki
   uzerlerine 'multiply' ile basilan renkten okunuyor; duz kaya hic
   boyanmiyor, yani ahsap kendi rengiyle kaliyor ve digerleri ona gore
   ayrisiyor. */
const TUR_RENGI = {
  duz: null,
  kayan: 'hsl(205 55% 70%)',     /* buzlu mavi: kayiyor */
  kirilgan: 'hsl(8 50% 64%)',    /* catlak kirmizi: bir kere basilir */
  yay: 'hsl(44 70% 72%)',        /* altin: firlatir */
};

const tuval = document.getElementById('tuval');
const ctx = tuval.getContext('2d');
const skorEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const perde = document.getElementById('overlay');
const perdeBaslik = document.getElementById('overlay-title');
const perdeMetin = document.getElementById('overlay-text');
const perdeBtn = document.getElementById('overlay-btn');
const perdeIkon = document.getElementById('overlay-ikon');

let G = 0, Y = 0;
let ejder = null;            /* {x, y, vy} — y DUNYA koordinati, yukari negatif */
let kayalar = [];            /* {x, y, tur, vx, kirik} */
let kamera = 0;              /* dunyanin en ust gorunen y'si */
let enYuksek = 0;            /* cikilan en yuksek (pozitif metre icin) */
let skor = 0, rekor = 0;
let bitti = false, durdu = false, basladi = false;
let hedefX = null;           /* parmagin x'i */
let sonKare = 0;

/* Ejderha gorseli: oyunun MEVCUT varliklarindan, yeni cizim yok. */
const ejderGorsel = new Image();
ejderGorsel.src = '../dragon/assets/dragons/ember-160.webp?v290';
let gorselHazir = false;
ejderGorsel.onload = () => { gorselHazir = true; };

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

/* KONTROL: parmak nerede ise ejderha oraya dogru kosuyor. Telefonda
   egme (tilt) izin istiyor ve Telegram icinde guvenilmez; sol/sag yarim
   dugmeleri ise basparmagi ekranin altina hapsediyor. Surukleme ikisinden
   de dogrudan. */
const konum = (e) => {
  const k = tuval.getBoundingClientRect();
  return ((e.touches ? e.touches[0].clientX : e.clientX) - k.left);
};
tuval.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!basladi && !bitti) { basladi = true; }
  hedefX = konum(e);
});
tuval.addEventListener('pointermove', (e) => { if (hedefX !== null) { e.preventDefault(); hedefX = konum(e); } });
tuval.addEventListener('pointerup', () => { hedefX = null; });
tuval.addEventListener('pointercancel', () => { hedefX = null; });
/* Klavye yalnizca masaustunde denemek icin. */
document.addEventListener('keydown', (e) => {
  if (!basladi && !bitti) basladi = true;
  if (e.code === 'ArrowLeft') hedefX = Math.max(0, (ejder?.x ?? 0) - 70);
  if (e.code === 'ArrowRight') hedefX = Math.min(G, (ejder?.x ?? 0) + 70);
});

addEventListener('resize', olcule);
olcule();
getBest(GAME_ID).then((b) => { rekor = b || 0; bestEl.textContent = rekor; });
yeniOyun();
requestAnimationFrame(dongu);   /* dongu BIR KEZ basliyor (bkz. Kule dersi) */

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
     cerceveyi DE olcuyor; tuval her kenardan 14px tasip kirpiliyordu. */
  const alan = tuval.parentElement;
  G = Math.max(220, alan.clientWidth);
  Y = Math.max(300, alan.clientHeight);
  const o = Math.min(3, devicePixelRatio || 1);
  tuval.width = Math.round(G * o);
  tuval.height = Math.round(Y * o);
  tuval.style.width = G + 'px';
  tuval.style.height = Y + 'px';
  ctx.setTransform(o, 0, 0, o, 0, 0);
}

/* ---------- oyun ---------- */
function yeniOyun() {
  kayalar = [];
  kamera = 0;
  enYuksek = 0;
  skor = 0;
  bitti = false; durdu = false; basladi = false;
  hedefX = null;
  clearState(GAME_ID);
  perde.hidden = true;

  /* Yuva: en altta genis bir baslangic kayasi, ejderha onun ustunde. */
  kayalar.push({ x: G / 2 - KAYA_EN / 2, y: -40, tur: 'duz', vx: 0 });
  ejder = { x: G / 2, y: -40 - EJDER / 2, vy: 0 };
  /* Kamera BASLANGICTA da dogru yerde olmali. Once 0'di: dunya
     koordinati yukari negatif oldugu icin yuva ekranin USTUNDE kaliyordu
     ve oyun baslayana kadar bos bir ekran goruluyordu. Kamera ancak ilk
     adimda duzeliyordu, yani oyuncu "Baslamak icin dokun" yazisini bos
     zeminde goruyordu. */
  kamera = ejder.y - Y * 0.72;

  let y = -40;
  while (y > -Y * 2) {
    y -= ARALIK_AZ + Math.random() * (ARALIK_COK - ARALIK_AZ);
    kayalar.push(yeniKaya(y));
  }
  skorYaz();
  sonKare = performance.now();
}

/* Kaya turleri yukseldikce zorlasiyor: once hepsi duz, sonra kayanlar,
   en sonda kirilganlar giriyor. */
function yeniKaya(y) {
  const m = Math.max(0, Math.round(-y / METRE));
  const z = Math.random();
  let tur = 'duz';
  if (m > 90 && z < 0.26) tur = 'kayan';
  else if (m > 220 && z < 0.38) tur = 'kirilgan';
  else if (m > 160 && z > 0.94) tur = 'yay';
  return {
    x: Math.random() * (G - KAYA_EN),
    y,
    tur,
    vx: tur === 'kayan' ? (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.8) : 0,
    kirik: false,
  };
}

function skorYaz() { skorEl.textContent = skor; }

/* ---------- dongu ---------- */
function dongu(simdi) {
  const dt = Math.min(48, simdi - sonKare) / 16.6667;
  sonKare = simdi;

  if (!bitti && !durdu && basladi) adim(dt);
  ciz();
  requestAnimationFrame(dongu);
}

function adim(dt) {
  /* yatay: parmaga dogru yumusak kosu + kenardan sarma */
  if (hedefX !== null) ejder.x += (hedefX - ejder.x) * Math.min(1, YATAY_HIZ * dt);
  if (ejder.x < -EJDER / 2) ejder.x = G + EJDER / 2;
  if (ejder.x > G + EJDER / 2) ejder.x = -EJDER / 2;

  /* dikey */
  ejder.vy += YERCEKIMI * dt;
  ejder.y += ejder.vy * dt;

  /* Kayalar yalnizca DUSERKEN yakalaniyor; yukari ciksarken iclerinden
     gecip gidiyor. Klasik dikey ziplama kurali, aksi halde oyuncu her
     ziplamada kafasini ustteki kayaya carpiyordu. */
  if (ejder.vy > 0) {
    for (const k of kayalar) {
      if (k.kirik) continue;
      const altKenar = ejder.y + EJDER / 2;
      const oncekiAlt = altKenar - ejder.vy * dt;
      if (oncekiAlt <= k.y && altKenar >= k.y &&
          ejder.x > k.x - EJDER * 0.3 && ejder.x < k.x + KAYA_EN + EJDER * 0.3) {
        if (k.tur === 'kirilgan') { k.kirik = true; SFX.pop(); continue; }
        ejder.vy = k.tur === 'yay' ? YAY_ZIPLAMA : ZIPLAMA;
        ejder.y = k.y - EJDER / 2;
        if (k.tur === 'yay') { SFX.match(); haptic.success(); } else { SFX.place(); }
        break;
      }
    }
  }

  /* kayan kayalar */
  for (const k of kayalar) {
    if (!k.vx) continue;
    k.x += k.vx * dt;
    if (k.x < 0) { k.x = 0; k.vx *= -1; }
    if (k.x > G - KAYA_EN) { k.x = G - KAYA_EN; k.vx *= -1; }
  }

  /* kamera: ejderha ust ucte kalsin, asagi inince kamera inmiyor */
  const hedefKamera = ejder.y - Y * 0.42;
  if (hedefKamera < kamera) kamera = hedefKamera;

  /* skor = cikilan en yuksek nokta */
  const yukseklik = Math.max(0, Math.round((-ejder.y - 40) / METRE));
  if (yukseklik > enYuksek) {
    enYuksek = yukseklik;
    skor = Math.min(SCORE_CAP, enYuksek);
    skorYaz();
  }

  /* yeni kayalar uret, ekranin cok altinda kalanlari at */
  let enUst = Math.min(...kayalar.map((k) => k.y));
  while (enUst > kamera - Y) {
    enUst -= ARALIK_AZ + Math.random() * (ARALIK_COK - ARALIK_AZ);
    kayalar.push(yeniKaya(enUst));
  }
  kayalar = kayalar.filter((k) => k.y < kamera + Y + 120);

  /* ekranin altindan dustuyse bitti */
  if (ejder.y - EJDER / 2 > kamera + Y) oyunBitti();
}

/* ---------- cizim ---------- */
const karistir = (c1, c2, k) => {
  const s = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [r1, g1, b1] = s(c1), [r2, g2, b2] = s(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
};

function ciz() {
  let a = KUSAKLAR[0], b = KUSAKLAR[0];
  for (let i = 0; i < KUSAKLAR.length; i++) {
    if (skor >= KUSAKLAR[i].m) { a = KUSAKLAR[i]; b = KUSAKLAR[i + 1] || KUSAKLAR[i]; }
  }
  const k = Math.min(1, Math.max(0, (skor - a.m) / Math.max(1, b.m - a.m)));
  const gok = ctx.createLinearGradient(0, 0, 0, Y);
  gok.addColorStop(0, karistir(a.ust, b.ust, k));
  gok.addColorStop(1, karistir(a.alt, b.alt, k));
  ctx.fillStyle = gok;
  ctx.fillRect(0, 0, G, Y);

  if (skor > 820) {
    const p = Math.min(1, (skor - 820) / 400);
    ctx.fillStyle = `rgba(255,255,255,${0.55 * p})`;
    for (let i = 0; i < 46; i++) {
      const sx = ((i * 7919) % 997) / 997 * G;
      const sy = (((i * 6271) % 991) / 991 * Y + kamera * 0.12) % Y;
      ctx.fillRect(sx, sy < 0 ? sy + Y : sy, 1.7, 1.7);
    }
  }

  /* UCURUM DUVARLARI. Arka plan duz bir kahverengi bosluktu; ejderha
     hicbir seyin icinde ucmuyor gibi duruyordu ve yukseldigini yalnizca
     sayactan anliyordun. Iki yanda tas duvar var artik: kameradan DAHA
     YAVAS kayiyor (0,45 kat), yani paralaks veriyor ve yukari cikis
     hissediliyor.

     Duvarlar 420 metreye kadar; orada ucurum bitiyor ve gokyuzu
     aciliyor. Hikaye de bu: yuvadan cikip kayaligi asmak. */
  const duvar = gorseller['kaya-duvar'];
  if (duvar.complete && duvar.naturalWidth > 0 && skor < 420) {
    const solma = Math.min(1, Math.max(0, (420 - skor) / 150));
    const en = Math.max(26, Math.round(G * 0.13));
    /* Paralaks kaydirma; kutucuk boyuna gore modunu aliyor ki dikis
       hep ayni yerde olmasin. */
    const kay = ((kamera * 0.45) % en + en) % en;
    ctx.save();
    ctx.globalAlpha = 0.9 * solma;
    for (let y = -en + kay; y < Y + en; y += en) {
      ctx.drawImage(duvar, 0, y, en, en);
      ctx.drawImage(duvar, G - en, y, en, en);
    }
    /* Duvarlari koyultup ice dogru karartiyoruz: ortadaki oyun alani
       one ciksin, kenarlar geride kalsin. */
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
/* Ilk denemede ic kenar '#14100d' idi, yani neredeyse siyah; multiply
       tasi tamamen yutuyordu ve duvar yerine yalnizca bir vinyet
       goruluyordu. Artik ic kenar da koyu ama tasin dokusunu gecirecek
       kadar acik - duvar KAYA gibi okunuyor, golge gibi degil.

       Renk SICAK secildi: kutucuk soguk gri-mavi oldugu icin notr bir
       kahve ile carpilinca zeytin yesiline donuyordu. Turuncuya kayan
       bir ton mavi kanali bastirip kayayi topraga yaklastiriyor. */
    const solG = ctx.createLinearGradient(0, 0, en, 0);
    solG.addColorStop(0, '#c98d55'); solG.addColorStop(1, '#3d2c1e');
    ctx.fillStyle = solG; ctx.fillRect(0, 0, en, Y);
    const sagG = ctx.createLinearGradient(G - en, 0, G, 0);
    sagG.addColorStop(0, '#3d2c1e'); sagG.addColorStop(1, '#c98d55');
    ctx.fillStyle = sagG; ctx.fillRect(G - en, 0, en, Y);
    ctx.restore();
  }

  const ekranY = (dy) => dy - kamera;

  for (const kaya of kayalar) {
    if (kaya.kirik) continue;
    const y = ekranY(kaya.y);
    if (y < -20 || y > Y + 20) continue;
    kayaCiz(kaya.x, y, kaya.tur);
  }

  if (ejder) {
    const ey = ekranY(ejder.y);
    if (gorselHazir) {
      /* Yukari ciksarken dik, duserken hafif one egik: ucamayan bir
         yavrunun hissi. */
      ctx.save();
      ctx.translate(ejder.x, ey);
      ctx.rotate(Math.max(-0.22, Math.min(0.3, ejder.vy * 0.016)));
      ctx.drawImage(ejderGorsel, -EJDER / 2, -EJDER / 2, EJDER, EJDER);
      ctx.restore();
    } else {
      ctx.fillStyle = '#e2544e';
      ctx.beginPath();
      ctx.arc(ejder.x, ey, EJDER / 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (!basladi && !bitti) {
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('basla'), G / 2, Y * 0.3);
  }
}

function kayaCiz(x, y, tur) {
  if (!kalasHazir()) {
    /* Gorseller inmeden de oynanabilsin diye eski sade cizim. */
    const renk = { duz: '#8a7a63', kayan: '#6f87a8', kirilgan: '#9a6a6a', yay: '#caa24e' }[tur] || '#8a7a63';
    ctx.fillStyle = renk;
    ctx.beginPath();
    ctx.roundRect(x, y, KAYA_EN, KAYA_BOY, 5);
    ctx.fill();
    if (tur === 'yay') { ctx.fillStyle = '#f3d98a'; ctx.fillRect(x + KAYA_EN / 2 - 7, y - 4, 14, 4); }
    return;
  }

  /* Uclar sabit genislikte, govde arada geriliyor. Kutucuklar 70x70 ama
     kalas 13 piksel yuksekliginde; ahsabin damari YATAY oldugu icin
     yatay germe dokuyu bozmuyor, dikey ezme bozardi - o yuzden uclar
     da kare degil, kalas boyunda tutuluyor. */
  const uc = 9;
  ctx.drawImage(gorseller['kalas-sol'], x, y, uc, KAYA_BOY);
  ctx.drawImage(gorseller['kalas-sag'], x + KAYA_EN - uc, y, uc, KAYA_BOY);
  ctx.drawImage(gorseller['kalas-orta'], x + uc, y, KAYA_EN - uc * 2, KAYA_BOY);

  const renk = TUR_RENGI[tur];
  if (renk) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = renk;
    ctx.fillRect(x, y, KAYA_EN, KAYA_BOY);
    ctx.restore();
  }

  /* Kirilgan kalasta catlak: oyuncu rengi ayirt edemese bile siluetten
     anlasin. Iki ince cizgi, kalasin ortasinda. */
  if (tur === 'kirilgan') {
    ctx.strokeStyle = 'rgba(30,12,12,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + KAYA_EN * 0.38, y);
    ctx.lineTo(x + KAYA_EN * 0.46, y + KAYA_BOY);
    ctx.moveTo(x + KAYA_EN * 0.63, y);
    ctx.lineTo(x + KAYA_EN * 0.56, y + KAYA_BOY);
    ctx.stroke();
  }

  if (tur === 'yay') {
    /* Yay: ustunde duran altin mandal. Kalasin uzerinde durdugu icin
       oyuncu yukari firlatacagini carpmadan once goruyor. */
    ctx.fillStyle = '#f6dc90';
    ctx.fillRect(x + KAYA_EN / 2 - 7, y - 4, 14, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + KAYA_EN / 2 - 7, y - 1, 14, 1);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(x + 1, y + KAYA_BOY - 1.5, KAYA_EN - 2, 1.5);
}

/* ---------- bitis ---------- */
async function oyunBitti() {
  if (bitti) return;
  bitti = true;
  SFX.gameOver();
  haptic.error();

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
  if (!perde.hidden && satirlar.length > 1) {
    perdeMetin.innerHTML = mhHtml(satirlar.join(' · '));
    if (sonuc.isRecord) perdeIkon.className = 'overlay-ikon ik-rekor';
  }
}
