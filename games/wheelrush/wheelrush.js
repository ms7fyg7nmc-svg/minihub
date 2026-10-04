
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v210';
import { submitScore, addPoints, getBest, oynanabilirMi } from '../../js/store.js?v210';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v210';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v210';

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
coinImg.src = '../../assets/coin.png';

/* GORSEL VARLIKLAR
   Oyun eskiden her seyi canvas ilkelleriyle ciziyordu: oyuncu bir altin
   daire, engel bir gri cokgen. Artik gercek sprite'lar var. */
const G = {};
for (const [ad, yol] of Object.entries({
  player: 'assets/player.webp',
  road:   'assets/road.webp',
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
  if (!(await oynanabilirMi())) { haptic.error(); goHome(); return; }
  haptic.tap();
  if (!over) { await endGame(); return; }
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

  /* Bitis ekrani sunucuyu BEKLEMIYOR. Eskiden once submitScore ve
     addPoints await ediliyor, ekran ancak ikisi donunce aciliyordu:
     zayif bir baglantida oyuncu titreyen bos bir tahtaya bakip
     bekliyordu. Skor zaten elimizde - once onu gosteriyoruz, rekor ve
     kazanilan $MH satirlari sunucudan gelince ARKASINDAN ekleniyor. */
  const kendiSkoru = t('yourScore', { score: bicim(score) });
  showOverlay(t('gameOver'), kendiSkoru, t('playAgain'), startNewGame);

  const result = await submitScore(GAME_ID, score);
  best = result.best;
  bestEl.textContent = bicim(best);

  const earned = Math.floor(score / POINTS_DIVISOR);
  if (earned > 0) await addPoints(earned);

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
  /* Sarsinti sonmesi `over` kapisinin ALTINDAYDI: carpar carpmaz oyun
     duruyor, bu satira hic gelinmiyor ve ekran bitis ekranini kapatana
     kadar titremeye devam ediyordu. Artik kapidan ONCE sonuyor. */
  if (shake > 0) shake = Math.max(0, shake - dt * 42);

  if (over) return;

  speed = Math.min(480, speed + dt * 6.5);
  distance += speed * dt;
  score = Math.floor(distance / 10) + coins * 15;
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

/* Sprite'i merkezine gore, istenen capta ve istenen egimle cizer.
   Egim sadece oyuncu icin kullaniliyor: serit degistirirken yana yatiyor. */
function sprite(im, x, y, cap, egim = 0) {
  if (!hazirMi(im)) return false;
  g.save();
  g.translate(x, y);
  if (egim) g.rotate(egim);
  g.drawImage(im, -cap / 2, -cap / 2, cap, cap);
  g.restore();
  return true;
}

/* HIZ CIZGILERI
   Kenarlardan geriye akan ince cizgiler. Hiz arttikca hem uzuyor hem
   siklasiyorlar - oyunun 220'den 480'e cikan hizini oyuncuya GOSTEREN
   tek sey bu. Oncesinde hiz sadece sayida vardi. */
const cizgiler = [];
function hizCizgileri(dt) {
  const doluluk = (speed - 220) / 260;              /* 0 -> 1 */
  if (Math.random() < 0.25 + doluluk * 0.9) {
    const sol = Math.random() < 0.5;
    cizgiler.push({
      x: sol ? 6 + Math.random() * 26 : LW - 32 + Math.random() * 26,
      y: -20,
      boy: 26 + doluluk * 46 + Math.random() * 20,
    });
  }
  for (const c of cizgiler) c.y += (speed * 1.9) * dt;
  for (let i = cizgiler.length - 1; i >= 0; i--) {
    if (cizgiler[i].y > LH + 60) cizgiler.splice(i, 1);
  }

  g.save();
  g.strokeStyle = `rgba(255, 228, 180, ${0.10 + doluluk * 0.16})`;
  g.lineWidth = 2;
  g.lineCap = 'round';
  for (const c of cizgiler) {
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
                  r: 2 + Math.random() * 3.5, omur: 1, renk });
  }
}
function tozCiz(dt) {
  for (const t of tozlar) {
    t.x += t.vx * dt; t.y += t.vy * dt;
    t.vy += 140 * dt; t.omur -= dt * 1.8;
  }
  for (let i = tozlar.length - 1; i >= 0; i--) if (tozlar[i].omur <= 0) tozlar.splice(i, 1);
  for (const t of tozlar) {
    g.globalAlpha = Math.max(0, t.omur) * 0.8;
    g.fillStyle = t.renk;
    g.beginPath();
    g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function ciz(dt = 0.016) {
  if (!cv.width) return;
  g.setTransform(olcek, 0, 0, olcek, 0, 0);
  g.clearRect(-40, -40, LW + 80, LH + 80);

  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;
  g.save();
  g.translate(sx, sy);

  /* YOL: kayan doku. Hiz hissinin ana kaynagi; onceden duz bir gradyandi
     ve ekranda hicbir sey akmiyordu. */
  if (!yolDesen && hazirMi(G.road)) yolDesen = g.createPattern(G.road, 'repeat');
  if (yolDesen) {
    g.save();
    g.translate(0, roadOffset % G.road.height);
    g.fillStyle = yolDesen;
    g.fillRect(0, -G.road.height, LW, LH + G.road.height * 2);
    g.restore();
  } else {
    const grd = g.createLinearGradient(0, 0, 0, LH);
    grd.addColorStop(0, '#232338');
    grd.addColorStop(1, '#1a1a2a');
    g.fillStyle = grd;
    g.fillRect(0, 0, LW, LH);
  }

  /* Serit cizgileri hala KODDA: dokuya gomulselerdi serit genisligi
     degisince bozulurlardi. */
  g.strokeStyle = 'rgba(255,245,220,.20)';
  g.lineWidth = 3;
  g.setLineDash([18, 16]);
  g.lineDashOffset = -(roadOffset % 34);
  for (const divX of [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2]) {
    g.beginPath();
    g.moveTo(divX, 0);
    g.lineTo(divX, LH);
    g.stroke();
  }
  g.setLineDash([]);

  hizCizgileri(dt);
  if (!over) izBirak(dt);

  const bob = Math.sin(performance.now() / 140) * 2;
  for (const it of items) {
    if (it.hit && it.type !== 'coin') continue;
    const x = LANES[it.lane];
    if (it.type === 'rock') {
      if (!sprite(G[it.gorsel || 'kayaB'], x, it.y, ITEM_R * 2.5)) drawRock(x, it.y);
    } else if (it.type === 'coin') {
      if (!it.hit) drawCoin(x, it.y, bob);
    }
  }

  /* Oyuncu DONMUYOR artik: tepeden bakilan bir arac kendi etrafinda
     donmez. Yerine serit degistirirken yana yatiyor - hareket boylece
     agirlik kazaniyor. */
  if (!over) {
    const hedef = LANES[lane];
    const egim = Math.max(-0.26, Math.min(0.26, (hedef - playerX) * -0.016));
    if (!sprite(G.player, playerX, PLAYER_Y, PLAYER_R * 2.8, egim)) {
      drawWheel(playerX, PLAYER_Y, PLAYER_R, '#f5b942', '#8a5a0d', wheelSpin);
    }
  }

  tozCiz(dt);
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
