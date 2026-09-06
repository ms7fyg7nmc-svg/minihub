
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v109';
import { submitScore, addPoints, getBest, oynanabilirMi } from '../../js/store.js?v109';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v109';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v109';

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

  if (pattern < 0.32) {
    blocked.add(Math.floor(Math.random() * 3));
  } else if (pattern < 0.5) {
    const a = Math.floor(Math.random() * 3);
    let b = Math.floor(Math.random() * 3);
    while (b === a) b = Math.floor(Math.random() * 3);
    blocked.add(a); blocked.add(b);
  } else if (pattern < 0.7) {
    const l = Math.floor(Math.random() * 3);
    items.push({ type: 'rival', lane: l, y: -40, hit: false, passed: false });
    blocked.add(l);
  }

  for (let l = 0; l < 3; l++) {
    if (blocked.has(l)) {
      if (!items.some((it) => it.lane === l && it.y < 0)) {
        items.push({ type: 'rock', lane: l, y: -40, hit: false });
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
  shake = 10;

  const result = await submitScore(GAME_ID, score);
  best = result.best;
  bestEl.textContent = bicim(best);

  const earned = Math.floor(score / POINTS_DIVISOR);
  if (earned > 0) await addPoints(earned);

  const lines = [t('yourScore', { score: bicim(score) })];
  if (result.isRecord) lines.push(t('newRecord'));
  if (earned > 0) lines.push(t('earnedPoints', { points: bicim(earned) }));

  showOverlay(t('gameOver'), lines.join(' · '), t('playAgain'), startNewGame);
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
  if (over) return;

  speed = Math.min(480, speed + dt * 6.5);
  distance += speed * dt;
  score = Math.floor(distance / 10) + coins * 15;
  guncelleHud();

  roadOffset = (roadOffset + speed * dt) % 40;
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
    } else if (!it.hit && (it.type === 'rock' || it.type === 'rival') &&
               closeY < ITEM_R + PLAYER_R - 8 && dx < 26) {
      it.hit = true;
      endGame();
    } else if (it.type === 'rival' && !it.passed && it.y > PLAYER_Y + PLAYER_R) {
      it.passed = true;
      if (!it.hit) { score += 25; SFX.match(); }
    }
  }
  items = items.filter((it) => it.y < LH + 60 && !(it.hit && it.type === 'coin' && it.y > 0));

  if (shake > 0) shake = Math.max(0, shake - dt * 30);
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

function ciz() {
  if (!cv.width) return;
  g.setTransform(olcek, 0, 0, olcek, 0, 0);
  g.clearRect(-40, -40, LW + 80, LH + 80);

  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;
  g.save();
  g.translate(sx, sy);

  const grd = g.createLinearGradient(0, 0, 0, LH);
  grd.addColorStop(0, '#232338');
  grd.addColorStop(1, '#1a1a2a');
  g.fillStyle = grd;
  g.fillRect(0, 0, LW, LH);

  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 3;
  g.setLineDash([18, 16]);
  g.lineDashOffset = -roadOffset;
  for (const divX of [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2]) {
    g.beginPath();
    g.moveTo(divX, 0);
    g.lineTo(divX, LH);
    g.stroke();
  }
  g.setLineDash([]);

  const bob = Math.sin(performance.now() / 140) * 2;
  for (const it of items) {
    if (it.hit && it.type !== 'coin') continue;
    if (it.type === 'rock') drawRock(LANES[it.lane], it.y);
    else if (it.type === 'coin') { if (!it.hit) drawCoin(LANES[it.lane], it.y, bob); }
    else drawWheel(LANES[it.lane], it.y, PLAYER_R * 0.92, '#e2544e', '#7a2320', it.y / 14);
  }

  if (!over) drawWheel(playerX, PLAYER_Y, PLAYER_R, '#f5b942', '#8a5a0d', wheelSpin);

  g.restore();
}

function dongu(ts) {
  requestAnimationFrame(dongu);
  if (!sonKare) sonKare = ts;
  let dt = (ts - sonKare) / 1000;
  sonKare = ts;
  if (dt > 0.05) dt = 0.05;
  if (dt > 0) guncelle(dt);
  ciz();
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
