
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v228';
import { submitScore, getBest } from '../../js/store.js?v228';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v228';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v228';
import { yarimBirakmaOnayi, onayAcik } from '../../js/onay.js?v228';

const GAME_ID = 'wheelrush';
/* Skor = mesafe/10 + coin*15 - iyi bir kosu ~150-450 arasi cikiyor.
   /10 boluci bunu diger oyunlarla ayni $MH bandinda ($MH olarak ~50-1000)
   tutuyor - blockblast'in /9'una yakin, kisa/hizli bir arcade oyunu icin
   makul. */
const POINTS_DIVISOR = 10;

registerTexts(GAME_ID, {
  title: 'Tekerlek Yarışı',
  subtitle: 'Şeritler arası kay, engellerden kaç',
  score: 'SKOR',
  best: 'REKOR',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Ekranın sol/sağ yarısına dokun, şerit değiştir.',
  gameOver: 'Çarptın!',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} $MH kazandın.',
});

const LW = 360;  // sanal dunya genisligi
const LH = 640;  // sanal dunya yuksekligi
const LANES = [LW * 0.22, LW * 0.5, LW * 0.78];
const PLAYER_Y = LH * 0.8;
const PLAYER_R = 20;
const ITEM_R = 18;
const COIN_R = 9;

const stageEl = document.getElementById('stage');
const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

const coinImg = new Image();
coinImg.src = '../../assets/coin-128.webp';

/* GORSEL VARLIKLAR
   Oyun eskiden her seyi canvas ilkelleriyle ciziyordu: oyuncu bir altin
   daire, engel bir gri cokgen. Artik gercek sprite'lar var. */
const G = {};
for (const [ad, yol] of Object.entries({
  player: 'assets/player.webp',
  /* road.webp buyuk organik lekelerden olusuyordu ve hizla kayarken
     asfalttan cok magara zeminine benziyordu. asfalt.webp yerine ince
     tane + dikey izlerden uretildi (kusursuz tekrarli) - hub karesindeki
     cizgili asfaltin ayni dili. */
  road:   'assets/asfalt.webp',
  kayaB:  'assets/kaya-buyuk.webp',
  kayaK:  'assets/kaya-kucuk.webp',
  varil:  'assets/varil.webp',
  bariyer:'assets/bariyer.webp',
  civi:   'assets/civi.webp',
})) {
  const im = new Image();
  im.src = yol;
  G[ad] = im;
}

/* Engel cesitleri: her 'rock' dogdugunda biri seciliyor, boylece ayni
   gri leke tekrar tekrar gelmiyor. */
const ENGELLER = ['kayaB', 'kayaK', 'varil', 'bariyer', 'civi'];

/* Yol dokusu kendi kendini tekrarlayan bir desen olarak bir kez kuruluyor. */
let yolDesen = null;
const hazirMi = (im) => im && im.complete && im.naturalWidth > 0;

/* ISIKLANDIRMA
   Hub karesindeki tasarim gece yolu: neredeyse siyah asfalt, aracin
   onunde sicak bir far konisi, arkada toz. Oyun ise duz aydinliki -
   her sey ayni parlaklikta, hicbir seyin hacmi yok. Asagidaki uc parca
   (gece kati, far konisi, nesne aydinlatmasi) o farki kapatiyor.

   Canvas 2D'de "sprite'i isikla boya" diye bir sey yok. Yapilan sey:
   her sprite'in SICAK bir kopyasi bir kez uretiliyor (kendi parlakligiyla
   carpilmis amber), sonra cizim aninda aslinin uzerine `lighter` ile ve
   o noktadaki isik gucu kadar alfayla bindiriliyor. Karanlikta duran
   engel soguk ve mat, farin icine girince isiniyor. */
const GSicak = {};
const GKaranlik = {};

function kopyaUret(ad, renk, hedef, kaldir) {
  const im = G[ad];
  if (hedef[ad] || !hazirMi(im)) return hedef[ad] || null;
  const c = document.createElement('canvas');
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const k = c.getContext('2d');
  k.drawImage(im, 0, 0);
  k.globalCompositeOperation = 'source-atop';   /* sadece sprite'in icine */
  k.fillStyle = renk;
  k.fillRect(0, 0, c.width, c.height);
  k.globalCompositeOperation = 'multiply';      /* kendi parlakligiyla carp */
  k.drawImage(im, 0, 0);
  if (kaldir) {
    /* Siyahlari biraz kaldir. Saf carpma, sprite'lara ISLENMIS golgeleri
       mosmor siyaha cevirip engellerin yanina kopuk lekeler birakiyordu;
       gercekte de uzaktaki karanlik bir nesne pus yuzunden tam siyah
       gorunmez. */
    k.globalCompositeOperation = 'source-atop';
    k.fillStyle = kaldir;
    k.fillRect(0, 0, c.width, c.height);
  }
  hedef[ad] = c;
  return c;
}

/* Isiksiz hali: soguk ve koyu. Oyunun TABANI bu - sprite'lar artik
   kendi parlakliklarinda degil, gecenin icinde duruyorlar. */
const karanlikKopya = (ad) => kopyaUret(ad, 'rgb(134, 146, 178)', GKaranlik, 'rgba(84, 94, 122, 0.26)');
/* Farin icindeki hali: amber. Ustune `lighter` ile isik gucu kadar
   bindiriliyor, ikisinin arasi bir rampa olusturuyor. */
const sicakKopya = (ad) => kopyaUret(ad, 'rgb(255, 176, 92)', GSicak);

/* Bir noktanin far konisi icindeki aydinlanmasi, 0..1.
   Koni aractan ileri dogru aciliyor; uzaklastikca hem soluyor hem
   genisliyor. Arkada kalan her sey 0. */
function isikGucu(x, y) {
  const ileri = PLAYER_Y - y;
  if (ileri < -30) return 0;
  const d = Math.max(0, ileri);
  const uzak = Math.max(0, 1 - d / 430);
  const yari = 48 + d * 0.38;
  const yanal = Math.max(0, 1 - Math.abs(x - playerX) / (yari + 56));
  return uzak * uzak * yanal;
}

let best = 0;
let lane = 1;
let playerX = LANES[1];
let items = [];
let speed = 220;
let distance = 0;
let coins = 0;
let score = 0;
let spawnTimer = 0;
let roadOffset = 0;
let wheelSpin = 0;
let shake = 0;
let flas = 0;          /* carpma anindaki beyaz-turuncu patlama */
let bonus = 0;         /* son anda siyrilan engellerden gelen puan */
let over = true;
let sonKare = 0;
let olcek = 1;

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});

document.getElementById('new-game').addEventListener('click', async () => {
  haptic.tap();
  if (!over) {
    /* Onay: "Yeni oyun" oyunun ortasinda basildiginda kosuyu bitiriyor.
       Dugme ekranin altinda, bastan sona parmaga yakin duruyor ve bir
       yanlis dokunus on dakikalik bir oyunu goturebiliyor. Soru sadece
       oyun DEVAM EDERKEN cikiyor; bitmis oyunda dogrudan calisiyor. */
    if (!(await yarimBirakmaOnayi(t))) return;
    await endGame();
    return;
  }
  startNewGame();
});

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

document.addEventListener('langchange', () => applyStaticTexts());

window.addEventListener('resize', olcekle);
if (window.ResizeObserver) new ResizeObserver(olcekle).observe(stageEl);

function goHome() {
  window.location.href = '../../index.html';
}

const bicim = (n) => Number(n).toLocaleString(locale());

function olcekle() {
  const kutu = stageEl.getBoundingClientRect();
  if (kutu.width < 40) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(kutu.width * dpr);
  cv.height = Math.round(kutu.height * dpr);
  olcek = (kutu.width / LW) * dpr;
  ciz();
}

function startNewGame() {
  lane = 1;
  playerX = LANES[1];
  items = [];
  speed = 220;
  distance = 0;
  coins = 0;
  score = 0;
  spawnTimer = 0;
  roadOffset = 0;
  wheelSpin = 0;
  shake = 0;
  flas = 0;
  bonus = 0;
  over = false;
  sonKare = 0;
  hideOverlay();
  guncelleHud();
}

function guncelleHud() {
  scoreEl.textContent = bicim(score);
}

function spawnWave() {
  // Her dalgada en az bir serit acik kalsin - kosu HER ZAMAN teorik olarak
  // gecilebilir olmali, bu bir cila degil kuralin kendisi.
  const pattern = Math.random();
  const blocked = new Set();

  /* Dalganin %52'si tek serit, %18'i iki serit kapali, kalan %30 bos -
     oyuncu nefes alabilsin diye. (Ucuncu bir dalga turu daha vardi:
     seridi kapatan kirmizi bir rakip arac. Oyunun geri kalani kaya,
     varil, bariyer gibi YOL engellerinden olusuyor; aralarinda tek
     basina duran bir arac yabanci duruyordu, kalkti.) */
  if (pattern < 0.52) {
    blocked.add(Math.floor(Math.random() * 3));
  } else if (pattern < 0.7) {
    const a = Math.floor(Math.random() * 3);
    let b = Math.floor(Math.random() * 3);
    while (b === a) b = Math.floor(Math.random() * 3);
    blocked.add(a); blocked.add(b);
  }

  for (let l = 0; l < 3; l++) {
    if (blocked.has(l)) {
      if (!items.some((it) => it.lane === l && it.y < 0)) {
        items.push({ type: 'rock', lane: l, y: -40, hit: false,
                     gorsel: ENGELLER[Math.floor(Math.random() * ENGELLER.length)] });
      }
    } else if (Math.random() < 0.75) {
      items.push({ type: 'coin', lane: l, y: -40, hit: false });
    }
  }
}

function setLane(target) {
  lane = Math.max(0, Math.min(2, target));
}

/* Stage yukseklige kilitli oldugu icin genis ekranlarda dar kalabiliyor;
   .game-mid'in tamamini dinleyip yatayda ortadan bolerek, canvas'in
   disinda kalan sol/sag bosluklardan da serit degistirilebiliyor. */
const controlEl = document.querySelector('.game-mid') || stageEl;
controlEl.addEventListener('pointerdown', (e) => {
  if (over) return;
  const rect = controlEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  setLane(x < rect.width / 2 ? lane - 1 : lane + 1);
});

async function endGame() {
  if (over) return;
  over = true;
  haptic.error();
  SFX.gameOver();
  shake = 9;
  flas = 1;

  /* Bitis ekrani sunucuyu BEKLEMIYOR. Eskiden once submitScore ve
     addPoints await ediliyor, ekran ancak ikisi donunce aciliyordu:
     zayif bir baglantida oyuncu titreyen bos bir tahtaya bakip
     bekliyordu. Skor zaten elimizde - once onu gosteriyoruz, rekor ve
     kazanilan $MH satirlari sunucudan gelince ARKASINDAN ekleniyor. */
  const kendiSkoru = t('yourScore', { score: bicim(score) });
  showOverlay(t('gameOver'), kendiSkoru, t('playAgain'), startNewGame);

  /* KAZANCI SUNUCU HESAPLIYOR. Bolucu burada da duruyor ama yalnizca
     MISAFIR modu icin: sunucuya bagli bir hesapta gecerli sayi
     submitScore'un dondurdugu `odeme` sozünden geliyor. Eskiden istemci
     miktari kendisi soyluyordu ve sunucu ona inaniyordu. */
  const yerelKazanc = Math.floor(score / POINTS_DIVISOR);
  const result = await submitScore(GAME_ID, score, yerelKazanc);
  best = result.best;
  bestEl.textContent = bicim(best);

  const { earned } = await result.odeme;

  const lines = [kendiSkoru];
  if (result.isRecord) lines.push(t('newRecord'));
  if (earned > 0) lines.push(t('earnedPoints', { points: bicim(earned) }));

  /* Oyuncu bu arada "Tekrar Oyna"ya basmis olabilir - kapali ekrani
     geri doldurmuyoruz. */
  if (!overlayEl.hidden && lines.length > 1) overlayText.innerHTML = mhHtml(lines.join(' · '));
}

function showOverlay(title, text, buttonLabel, action) {
  overlayTitle.textContent = title;
  overlayText.innerHTML = mhHtml(text);
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

function guncelle(dt) {
  /* Onay penceresi acikken arac ilerlemesin - soruyu okurken kayaya
     carpmak, sorunun kendisini zararli yapardi. */
  if (onayAcik()) return;

  /* Sarsinti sonmesi `over` kapisinin ALTINDAYDI: carpar carpmaz oyun
     duruyor, bu satira hic gelinmiyor ve ekran bitis ekranini kapatana
     kadar titremeye devam ediyordu. Artik kapidan ONCE sonuyor. */
  if (shake > 0) shake = Math.max(0, shake - dt * 42);
  if (flas > 0) flas = Math.max(0, flas - dt * 2.6);

  if (over) return;

  speed = Math.min(480, speed + dt * 6.5);
  distance += speed * dt;
  score = Math.floor(distance / 10) + coins * 15 + bonus;
  guncelleHud();

  /* Serit kesiklerinin adimi (34) ile doku yuksekligi farkli; ikisi de
     ayni roadOffset'i kullanabilsin diye mod alinmiyor, cizim sirasinda
     her biri kendi modunu uyguluyor. */
  roadOffset += speed * dt;
  wheelSpin += (speed * dt) / PLAYER_R;

  const targetX = LANES[lane];
  playerX += (targetX - playerX) * Math.min(1, dt * 12);

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnWave();
    spawnTimer = Math.max(0.55, 1.05 - speed / 900);
  }

  for (const it of items) {
    it.y += speed * dt;

    const dx = Math.abs(LANES[it.lane] - playerX);
    const closeY = Math.abs(it.y - PLAYER_Y);

    if (!it.hit && it.type === 'coin' && closeY < ITEM_R + PLAYER_R - 6 && dx < 26) {
      it.hit = true;
      coins++;
      haptic.tap('light');
      SFX.pickup();
      tozEkle(LANES[it.lane], it.y, 7, '#ffd76e');
    } else if (!it.hit && it.type === 'rock' &&
               closeY < ITEM_R + PLAYER_R - 8 && dx < 26) {
      it.hit = true;
      tozEkle(playerX, PLAYER_Y, 16, '#c9b89a');
      endGame();
    }

    /* YAKIN GECIS
       Engel carpmadan ama SIYIRARAK gectiyse puan var. Seritler 100
       piksel aralikli; bu araliga ancak serit degistirirken, yani son
       anda kacarken girilebiliyor. Oyun boylece "dogru zamanda bas"i
       odullendiriyor - oncesinde erken basmakla gec basmak arasinda
       hicbir fark yoktu. */
    if (!it.hit && !it.gecti && it.type === 'rock' && it.y > PLAYER_Y + PLAYER_R) {
      it.gecti = true;
      if (dx < 58) {
        bonus += 5;
        haptic.tap('light');
        shake = Math.max(shake, 2.2);
        tozEkle(LANES[it.lane], PLAYER_Y, 5, '#d8e6ff');
      }
    }
  }
  items = items.filter((it) => it.y < LH + 60 && !(it.hit && it.type === 'coin' && it.y > 0));
}

function drawWheel(x, y, r, rimColor, hubColor, spin) {
  g.save();
  g.translate(x, y);
  g.rotate(spin);
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fillStyle = rimColor;
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = r * 0.34;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, r * 0.34, 0, Math.PI * 2);
  g.fillStyle = hubColor;
  g.fill();
  g.restore();
}

function drawRock(x, y) {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.moveTo(-16, 8);
  g.lineTo(-10, -12);
  g.lineTo(4, -16);
  g.lineTo(16, -2);
  g.lineTo(12, 12);
  g.lineTo(-6, 16);
  g.closePath();
  g.fillStyle = '#6b6478';
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)';
  g.beginPath();
  g.moveTo(-10, -12);
  g.lineTo(4, -16);
  g.lineTo(0, -4);
  g.closePath();
  g.fill();
  g.restore();
}

function drawCoin(x, y, bob) {
  g.save();
  g.translate(x, y + bob);
  if (hazirMi(coinImg)) {
    g.drawImage(coinImg, -COIN_R, -COIN_R, COIN_R * 2, COIN_R * 2);
  } else {
    g.beginPath();
    g.arc(0, 0, COIN_R, 0, Math.PI * 2);
    g.fillStyle = '#f5b942';
    g.fill();
    g.strokeStyle = '#c98a1f';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath();
    g.arc(-3, -3, 2.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/* HIZ CIZGILERI
   Asfalt uzerinde geriye akan ince cizgiler - karedeki hareket bulanikligi.
   Eskiden sadece iki kenardaydilar ve ekranin ortasi, yani oyuncunun
   baktigi yer, hic akmiyordu. Artik tum genisligi kapliyorlar; merkeze
   dogru soluyorlar ki aracin ustunu kirletmesinler. */
const cizgiler = [];
function hizCizgileri(dt) {
  const doluluk = (speed - 220) / 260;              /* 0 -> 1 */
  const kota = 0.9 + doluluk * 1.8;
  for (let n = 0; n < kota; n++) {
    if (n + 1 > kota && Math.random() > kota % 1) break;
    const x = Math.random() * LW;
    /* merkezde zayif, kenarda guclu */
    const kenar = Math.abs(x - LW / 2) / (LW / 2);
    cizgiler.push({
      x,
      y: -30,
      boy: 46 + doluluk * 96 + Math.random() * 40,
      a: (0.025 + kenar * 0.075) * (0.45 + doluluk * 0.95),
    });
  }
  for (const c of cizgiler) c.y += (speed * 1.9) * dt;
  for (let i = cizgiler.length - 1; i >= 0; i--) {
    if (cizgiler[i].y > LH + 60) cizgiler.splice(i, 1);
  }

  g.save();
  g.lineWidth = 1.2;
  g.lineCap = 'round';
  for (const c of cizgiler) {
    g.strokeStyle = `rgba(214, 226, 255, ${c.a})`;
    g.beginPath();
    g.moveTo(c.x, c.y);
    g.lineTo(c.x, c.y + c.boy);
    g.stroke();
  }
  g.restore();
}

/* TEKERLEK IZI
   Oyuncunun arkasinda solup giden iki ince iz. Serit degistirince
   egriliyor, cunku izler oyuncunun GECTIGI noktalardan geciyor. */
const izler = [];
function izBirak(dt) {
  izler.push({ x: playerX, y: PLAYER_Y, omur: 1 });
  for (const iz of izler) { iz.y += speed * dt; iz.omur -= dt * 1.1; }
  for (let i = izler.length - 1; i >= 0; i--) {
    if (izler[i].omur <= 0 || izler[i].y > LH + 20) izler.splice(i, 1);
  }

  g.save();
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (const yan of [-7, 7]) {
    g.beginPath();
    let ilk = true;
    for (const iz of izler) {
      if (ilk) { g.moveTo(iz.x + yan, iz.y); ilk = false; }
      else g.lineTo(iz.x + yan, iz.y);
    }
    g.strokeStyle = 'rgba(12, 10, 8, 0.30)';
    g.stroke();
  }
  g.restore();
}

/* TOZ: carpisma ve para alma anlarinda. */
const tozlar = [];
function tozEkle(x, y, adet, renk) {
  for (let i = 0; i < adet; i++) {
    const a = Math.random() * Math.PI * 2;
    const h = 40 + Math.random() * 110;
    tozlar.push({ x, y, vx: Math.cos(a) * h, vy: Math.sin(a) * h - 30,
                  r: 2 + Math.random() * 3.5, omur: 1, alfa: 0.8, renk });
  }
}
/* EGZOZ
   Karede aracin arkasinda bir toz bulutu var; oyunda arac sanki havada
   suzuluyordu. Bu, tekerlek izinin yanina surekli akan ince bir duman. */
let egzozSaat = 0;
function egzoz(dt) {
  egzozSaat -= dt;
  if (egzozSaat > 0) return;
  egzozSaat = 0.018;
  /* Ilk denemede tek sutun halinde duzgun gri toplar diziliyordu -
     toz degil, boncuk kolyesi. Yanal sacilma ve dusuk alfa sart. */
  for (const yan of [-13, 13]) {
    tozlar.push({
      x: playerX + yan + (Math.random() - 0.5) * 9,
      y: PLAYER_Y + PLAYER_R * 0.86,
      vx: yan * 2.6 + (Math.random() - 0.5) * 40,
      vy: 40 + Math.random() * 70,
      r: 2 + Math.random() * 7,
      omur: 0.4 + Math.random() * 0.3,
      alfa: 0.22,
      renk: '#8e93a2',
    });
  }
}

function tozCiz(dt) {
  for (const t of tozlar) {
    t.x += t.vx * dt; t.y += t.vy * dt;
    t.vy += 140 * dt; t.omur -= dt * 1.8;
  }
  for (let i = tozlar.length - 1; i >= 0; i--) if (tozlar[i].omur <= 0) tozlar.splice(i, 1);
  for (const t of tozlar) {
    g.globalAlpha = Math.max(0, t.omur) * (t.alfa ?? 0.8);
    g.fillStyle = t.renk;
    g.beginPath();
    g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/* FAR KONISI
   Aracin burnundan ileri acilan sicak isik, ekleyici (`lighter`) ciziliyor
   ki altindaki asfalti ve serit cizgilerini KARARTMADAN isitsin.

   Koni her karede yeniden cizilmiyor. Ilk denemede oyleydi ve sonuc
   ucgenin kenarinda jilet gibi bir cizgiydi - hicbir far oyle bitmez.
   Yumusatmak icin kenarina blur gerekiyor, blur'u her karede uygulamak
   da telefonu yorardi. Koni aracin KENDISINE gore sabit oldugu icin bir
   kez bulanik uretilip her karede sadece playerX'e tasiniyor. */
const FAR_G = 500;    /* koni kanvasinin mantiksal genisligi */
const FAR_Y = 470;    /* yuksekligi */
const FAR_ALT = 22;   /* lamba noktasinin alttan mesafesi */
let farKanvas = null;

function farHazirla() {
  const S = 2;        /* iki kat cozunurluk: buyurken dagilmasin */
  const c = document.createElement('canvas');
  c.width = FAR_G * S;
  c.height = FAR_Y * S;
  const k = c.getContext('2d');
  k.scale(S, S);
  const lx = FAR_G / 2;
  const ly = FAR_Y - FAR_ALT;

  /* Kenari eriten tek yer burasi. filter'i olmayan bir motorda
     (eski webview) keskin kalir ama oyun calismaya devam eder. */
  k.filter = 'blur(16px)';
  const koni = k.createLinearGradient(0, ly, 0, 0);
  koni.addColorStop(0, 'rgba(255, 190, 104, 0.46)');
  koni.addColorStop(0.32, 'rgba(255, 150, 50, 0.22)');
  koni.addColorStop(1, 'rgba(255, 118, 18, 0)');
  k.fillStyle = koni;
  k.beginPath();
  k.moveTo(lx - 44, ly + 10);
  k.lineTo(lx + 44, ly + 10);
  k.lineTo(lx + 196, 24);
  k.lineTo(lx - 196, 24);
  k.closePath();
  k.fill();
  k.filter = 'none';

  /* Burnun onundeki sicak cekirdek - radyal oldugu icin zaten yumusak. */
  const cekirdek = k.createRadialGradient(lx, ly - 18, 2, lx, ly - 18, 76);
  cekirdek.addColorStop(0, 'rgba(255, 234, 186, 0.78)');
  cekirdek.addColorStop(0.3, 'rgba(255, 168, 70, 0.34)');
  cekirdek.addColorStop(1, 'rgba(255, 118, 18, 0)');
  k.fillStyle = cekirdek;
  k.beginPath();
  k.arc(lx, ly - 18, 76, 0, Math.PI * 2);
  k.fill();

  farKanvas = c;
}

function farKonisi(guc) {
  if (!farKanvas) farHazirla();
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = guc;
  g.drawImage(farKanvas,
              playerX - FAR_G / 2,
              (PLAYER_Y - PLAYER_R * 1.15) - (FAR_Y - FAR_ALT),
              FAR_G, FAR_Y);
  g.restore();
}

/* Stop lambalari: aracin arkasinda iki kirmizi leke. */
function stopLambalari() {
  g.save();
  g.globalCompositeOperation = 'lighter';
  const y = PLAYER_Y + PLAYER_R * 0.86;
  for (const yan of [-11, 11]) {
    const l = g.createRadialGradient(playerX + yan, y, 1, playerX + yan, y, 15);
    l.addColorStop(0, 'rgba(255, 108, 62, 0.80)');
    l.addColorStop(0.4, 'rgba(240, 52, 24, 0.34)');
    l.addColorStop(1, 'rgba(220, 30, 10, 0)');
    g.fillStyle = l;
    g.beginPath();
    g.arc(playerX + yan, y, 15, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/* Gorsel ya da onceden isitilmis kopyasini merkezden cizer. */
function ciz2(kaynak, x, y, cap, egim = 0, alfa = 1) {
  if (!kaynak) return false;
  g.save();
  g.globalAlpha = alfa;
  g.translate(x, y);
  if (egim) g.rotate(egim);
  g.drawImage(kaynak, -cap / 2, -cap / 2, cap, cap);
  g.restore();
  return true;
}

function ciz(dt = 0.016) {
  if (!cv.width) return;
  g.setTransform(olcek, 0, 0, olcek, 0, 0);
  g.clearRect(-40, -40, LW + 80, LH + 80);

  /* Hizlandikca duran bir motor titresimi. Oyun 220'den 480'e cikiyordu
     ama ekranda hicbir sey degismiyordu; fark artik HISSEDILIYOR. */
  const hizO = Math.max(0, Math.min(1, (speed - 220) / 260));
  const motor = over ? 0 : 0.45 + hizO * 1.15;
  const sx = (Math.random() - 0.5) * (shake + motor);
  const sy = (Math.random() - 0.5) * (shake + motor);
  g.save();
  g.translate(sx, sy);

  /* YOL: kayan doku. */
  if (!yolDesen && hazirMi(G.road)) yolDesen = g.createPattern(G.road, 'repeat');
  if (yolDesen) {
    g.save();
    g.translate(0, roadOffset % G.road.height);
    g.fillStyle = yolDesen;
    g.fillRect(0, -G.road.height, LW, LH + G.road.height * 2);
    g.restore();
  } else {
    g.fillStyle = '#15161f';
    g.fillRect(0, 0, LW, LH);
  }

  /* GECE KATI
     Dokunun kendisi gunduz cekilmis gibi acik. Uzerine koyu bir perde
     geliyor: ileride (ustte) daha koyu, aracin cevresinde daha acik.
     Butun aydinlatma bunun uzerine ekleniyor - once karart, sonra
     istedigin yeri isit. */
  const perde = g.createLinearGradient(0, 0, 0, LH);
  perde.addColorStop(0, 'rgba(4, 5, 10, 0.74)');
  perde.addColorStop(0.5, 'rgba(5, 6, 12, 0.70)');
  perde.addColorStop(1, 'rgba(4, 5, 10, 0.84)');
  g.fillStyle = perde;
  g.fillRect(0, 0, LW, LH);

  hizCizgileri(dt);

  /* Serit cizgileri hala KODDA: dokuya gomulselerdi serit genisligi
     degisince bozulurlardi. Taban alfa dusuk - parlakligi fardan geliyor. */
  g.strokeStyle = 'rgba(236, 240, 255, .17)';
  g.lineWidth = 3.4;
  g.setLineDash([20, 18]);
  g.lineDashOffset = -(roadOffset % 38);
  for (const divX of [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2]) {
    g.beginPath();
    g.moveTo(divX, 0);
    g.lineTo(divX, LH);
    g.stroke();
  }
  g.setLineDash([]);

  if (!over) farKonisi(0.78);
  if (!over) izBirak(dt);

  const bob = Math.sin(performance.now() / 140) * 2;
  for (const it of items) {
    if (it.hit && it.type !== 'coin') continue;
    const x = LANES[it.lane];
    const isik = over ? 0.35 : isikGucu(x, it.y);

    if (it.type === 'rock') {
      const ad = it.gorsel || 'kayaB';
      const cap = ITEM_R * 2.5;
      const taban = karanlikKopya(ad);
      if (!taban) { drawRock(x, it.y); continue; }

      /* GOLGE: isik aractan geldigi icin golge ILERI dogru uzuyor.
         Tepeden bakilan bir sahnede nesneyi yere BAGLAYAN tek sey bu;
         onsuz her engel asfaltin ustune yapistirilmis bir cikartma. */
      g.save();
      g.globalAlpha = 0.34 + isik * 0.42;
      g.fillStyle = '#05060a';
      g.beginPath();
      g.ellipse(x + (x - playerX) * 0.10, it.y - 6 - isik * 14,
                cap * 0.44, cap * 0.30 + isik * cap * 0.10, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();

      ciz2(taban, x, it.y, cap);
      if (isik > 0.02) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        ciz2(sicakKopya(ad), x, it.y, cap, 0, Math.min(0.82, isik));
        g.restore();
      }
    } else if (it.type === 'coin' && !it.hit) {
      /* Para kendi isigini sacar - karanlikta uzaktan gorunur. */
      g.save();
      g.globalCompositeOperation = 'lighter';
      const h = g.createRadialGradient(x, it.y + bob, COIN_R * 0.6, x, it.y + bob, COIN_R * 2.1);
      h.addColorStop(0, 'rgba(255, 206, 108, 0.30)');
      h.addColorStop(1, 'rgba(255, 164, 36, 0)');
      g.fillStyle = h;
      g.beginPath();
      g.arc(x, it.y + bob, COIN_R * 2.1, 0, Math.PI * 2);
      g.fill();
      g.restore();
      drawCoin(x, it.y, bob);
    }
  }

  /* Konunun ince bir tekrari: nesnelerin USTUNDEN gecen hava isigi.
     Farin icindeki engel boylece hafif bir pus altinda kaliyor. */
  if (!over) farKonisi(0.26);

  if (!over) {
    const hedef = LANES[lane];
    const egim = Math.max(-0.26, Math.min(0.26, (hedef - playerX) * -0.016));
    /* Suspansiyon: arac yolda oturmuyor, ustunde zipliyor. */
    const py = PLAYER_Y + Math.sin(performance.now() / 52) * (0.5 + hizO * 1.3);
    stopLambalari();
    const pcap = PLAYER_R * 2.8;
    if (!ciz2(karanlikKopya('player'), playerX, py, pcap, egim)) {
      drawWheel(playerX, PLAYER_Y, PLAYER_R, '#f5b942', '#8a5a0d', wheelSpin);
    } else {
      /* Kendi farinin geri yansimasi: onde guclu, arkada zayif.
         Tek alfayla cizince arac duz bir turuncu lekeye donuyordu. */
      g.save();
      g.globalCompositeOperation = 'lighter';
      ciz2(sicakKopya('player'), playerX, py, pcap, egim, 0.62);
      g.restore();
    }
    egzoz(dt);
  }

  tozCiz(dt);

  /* VINYET: kenarlar karariyor, bakis merkeze toplaniyor. */
  const v = g.createRadialGradient(LW / 2, LH * 0.70, LH * 0.20,
                                   LW / 2, LH * 0.70, LH * 0.82);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(0.6, 'rgba(0, 0, 0, 0.26)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  g.fillStyle = v;
  g.fillRect(0, 0, LW, LH);

  /* CARPMA: kisa bir turuncu patlama. Sarsinti tek basina sessiz
     kaliyordu - carpismanin bir ANI olmasi gerekiyor. */
  if (flas > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    const f = flas * flas;
    const p = g.createRadialGradient(playerX, PLAYER_Y, 4, playerX, PLAYER_Y, LH * 0.6);
    p.addColorStop(0, `rgba(255, 236, 196, ${0.70 * f})`);
    p.addColorStop(0.25, `rgba(255, 146, 48, ${0.34 * f})`);
    p.addColorStop(1, 'rgba(255, 90, 20, 0)');
    g.fillStyle = p;
    g.fillRect(0, 0, LW, LH);
    g.restore();
  }

  g.restore();
}

function dongu(ts) {
  requestAnimationFrame(dongu);
  if (!sonKare) sonKare = ts;
  let dt = (ts - sonKare) / 1000;
  sonKare = ts;
  if (dt > 0.05) dt = 0.05;
  if (dt > 0) guncelle(dt);
  ciz(dt);
}

document.addEventListener('visibilitychange', () => { sonKare = 0; });

olcekle();
bootstrap();

async function bootstrap() {
  best = await getBest(GAME_ID);
  bestEl.textContent = bicim(best);
  startNewGame();
  requestAnimationFrame(dongu);
}
