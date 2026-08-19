
import { initTelegram, haptic, showBackButton, backToHubOnResume } from '../../js/tg.js?v99';
import { submitScore, addPoints, getBest, saveState, loadState, clearState, oynanabilirMi } from '../../js/store.js?v99';
import { registerTexts, t, applyStaticTexts, locale, mhHtml } from '../../js/i18n-hook.js?v99';
import { SFX, soundToggleHtml, mountSoundToggle } from '../../js/audio.js?v99';

const GAME_ID = 'coindrop';

/* Skor, birlesen paranin CENT degeri kadar artiyor (2 tane 5c birlesince
   +10). Bastan sona (100$) oynanan bir el ~86.000 puan getiriyor; bolen
   bunu diger oyunlarla ayni bandda ($MH olarak ~100-900) tutuyor. */
const POINTS_DIVISOR = 100;

registerTexts(GAME_ID, {
  title: 'Coin Drop',
  subtitle: 'Aynı paraları birleştir',
  score: 'SKOR',
  best: 'REKOR',
  next: 'SIRADAKİ',
  newGame: 'Yeni oyun',
  backToHub: "Hub'a dön",
  hint: 'Parmağını kaydır, bırakınca para düşer.',
  gameOver: 'Kasa doldu',
  playAgain: 'Yeniden oyna',
  yourScore: 'Skorun: {score}',
  newRecord: 'Yeni rekor!',
  earnedPoints: '+{points} $MH kazandın.',
  wonTitle: '100 Dolar!',
  wonText: 'En büyük parayı yaptın.',
});

/* --- Kademeler ---
   6 cent kademesi, sonra ayni mantikla altin kademeler; 100$ oyunu bitiriyor.
   value = cent cinsinden deger (skor bundan geliyor), r = sanal dunya yaricapi. */
const TIERS = [
  { txt: '1¢',   value: 1,     r: 14,   metal: 'copper' },
  { txt: '2¢',   value: 2,     r: 17.5, metal: 'copper' },
  { txt: '5¢',   value: 5,     r: 21.5, metal: 'copper' },
  { txt: '10¢',  value: 10,    r: 26,   metal: 'silver' },
  { txt: '25¢',  value: 25,    r: 31,   metal: 'silver' },
  { txt: '50¢',  value: 50,    r: 37,   metal: 'silver' },
  { txt: '$1',   value: 100,   r: 44,   metal: 'gold' },
  { txt: '$2',   value: 200,   r: 52,   metal: 'gold' },
  { txt: '$5',   value: 500,   r: 61,   metal: 'gold' },
  { txt: '$10',  value: 1000,  r: 71,   metal: 'gold' },
  { txt: '$25',  value: 2500,  r: 82,   metal: 'royal' },
  { txt: '$50',  value: 5000,  r: 95,   metal: 'royal' },
  { txt: '$100', value: 10000, r: 112,  metal: 'royal' },
];

const SON_KADEME = TIERS.length - 1;
/* Yeni para sadece ilk 5 kademeden gelir - yoksa oyun kendi kendini cozer */
const DUSEN_KADEMELER = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4];

const METAL = {
  copper: { hi: '#f7bd85', mid: '#c8783c', lo: '#7c4116', rim: '#552c0d', ink: '#4a2409' },
  silver: { hi: '#ffffff', mid: '#c9d2de', lo: '#87919f', rim: '#626b78', ink: '#414954' },
  gold:   { hi: '#fff4cb', mid: '#f0c04a', lo: '#a5710d', rim: '#7a5309', ink: '#573902' },
  royal:  { hi: '#fffdf0', mid: '#ffd75f', lo: '#bd870f', rim: '#856007', ink: '#553a03' },
};

/* --- Sanal dunya ---
   Fizik her zaman 360x540 birimde calisiyor; canvas sadece bunu olcekliyor,
   boylece oyun her ekranda birebir ayni hissi veriyor. */
const W = 360;
const H = 540;
const LINE_Y = 96;
const DROP_Y = 54;
const GRAVITY = 1500;
const ALT_ADIM = 2;
/* Yigin cozumleme turu: tek gecis derin yiginlarda paralari birbirinin
   icine gomuyordu (40+ para 360x540 tahtaya "siginca" kasa hic dolmuyordu).
   Konum tabanli cozumleme + birkac gevseme turu yigini gercekten
   ust uste tutuyor. */
const COZUM_TURU = 6;
const BEKLEME = 0.34;
const TEHLIKE_SURESI = 1.5;
const TAU = Math.PI * 2;

const stageEl = document.getElementById('stage');
const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const nextChipEl = document.getElementById('next-chip');
const ladderEl = document.getElementById('ladder');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

let coins = [];
let parcaciklar = [];
let yazilar = [];
let score = 0;
let best = 0;
let sonraki = 0;
let enYuksek = 0;
let aimX = W / 2;
let bekleme = 0;
let tehlike = 0;
let over = false;
let sonKare = 0;
let olcek = 1;
let nextId = 1;

const amblem = new Image();
let amblemHazir = false;
amblem.onload = () => { amblemHazir = true; };
amblem.src = '../../assets/coin.png';

initTelegram();
applyStaticTexts();
showBackButton(goHome);
backToHubOnResume();

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});

/* "Yeni oyun" oyun surerken basilirsa: el bitmis sayilir, kazanilan
   $MH ekrani normal bitisteki gibi gosterilir (match3 ile ayni davranis). */
document.getElementById('new-game').addEventListener('click', async () => {
  if (!(await oynanabilirMi())) { haptic.error(); goHome(); return; }
  haptic.tap();
  if (!over) { await endGame(false); return; }
  startNewGame();
});

document.querySelector('.head-right').insertAdjacentHTML('afterbegin', soundToggleHtml());
mountSoundToggle(document.getElementById('sound-toggle'));

document.addEventListener('langchange', () => {
  applyStaticTexts();
  ciz();
});

window.addEventListener('resize', olcekle);
/* Sahne olculeri yerlesim otururken degisiyor (Telegram'in --app-h'si
   sonradan geliyor, kisa ekranda max-width yeniden hesaplaniyor). Modul
   yuklenirken alinan tek olcum yanlis kalabildigi icin gercek boyutu
   izliyoruz - yoksa canvas birkac piksellik bir arka planla kaliyor. */
if (window.ResizeObserver) new ResizeObserver(olcekle).observe(stageEl);
document.addEventListener('visibilitychange', () => { sonKare = 0; });

buildLadder();
olcekle();
bootstrap();

async function bootstrap() {
  best = await getBest(GAME_ID);
  bestEl.textContent = bicim(best);

  const kayit = await loadState(GAME_ID);
  if (kayit && Array.isArray(kayit.coins) && kayit.coins.length) {
    restore(kayit);
  } else {
    startNewGame();
  }
  requestAnimationFrame(dongu);
}

function goHome() {
  window.location.href = '../../index.html';
}

const bicim = (n) => Number(n).toLocaleString(locale());
const rast = (a, b) => a + Math.random() * (b - a);

function yeniKademe() {
  return DUSEN_KADEMELER[Math.floor(Math.random() * DUSEN_KADEMELER.length)];
}

function startNewGame() {
  coins = [];
  parcaciklar = [];
  yazilar = [];
  score = 0;
  enYuksek = 0;
  sonraki = yeniKademe();
  aimX = W / 2;
  bekleme = 0;
  tehlike = 0;
  over = false;
  nextId = 1;
  clearState(GAME_ID);
  hideOverlay();
  guncelleHud();
}

function restore(kayit) {
  coins = kayit.coins.map(([ti, x, y, vx, vy, a]) => ({
    id: nextId++, ti, x, y, px: x, py: y, vx, vy, a, yas: 5,
  }));
  score = Number(kayit.score) || 0;
  sonraki = Number.isInteger(kayit.sonraki) ? kayit.sonraki : yeniKademe();
  enYuksek = coins.reduce((m, c) => Math.max(m, c.ti), 0);
  over = false;
  hideOverlay();
  guncelleHud();
}

function persist() {
  if (over) return;
  saveState(GAME_ID, {
    score,
    sonraki,
    coins: coins.map((c) => [c.ti, +c.x.toFixed(2), +c.y.toFixed(2),
                             +c.vx.toFixed(2), +c.vy.toFixed(2), +c.a.toFixed(3)]),
  });
}

/* --- Olcek: sanal dunyayi canvas'a oturt --- */
function olcekle() {
  const kutu = stageEl.getBoundingClientRect();
  if (kutu.width < 40) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(kutu.width * dpr);
  cv.height = Math.round(kutu.height * dpr);
  olcek = (kutu.width / W) * dpr;
  ciz();
}

/* --- Fizik ---
   Konum tabanli (PBD) cozum: once serbest hareket, sonra temaslar konum
   duzeyinde birkac tur gevsetiliyor, en son hiz konum farkindan yeniden
   turetiliyor. Bu yigilmayi kararli tutuyor - paralar birbirine gomulmuyor,
   dipte titremiyor. */
function adim(dt) {
  /* dt=0 gelirse asagidaki hiz turetmesi (x-px)/dt sifira bolunup NaN
     uretiyor ve butun paralar tahtadan siliniyor - ilk karede ve sekme
     donusunde dt gercekten 0 olabiliyor, o yuzden bu kontrol sart. */
  if (!(dt > 0)) return;

  for (const c of coins) {
    c.px = c.x;
    c.py = c.y;
    c.vy += GRAVITY * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  }

  for (let tur = 0; tur < COZUM_TURU; tur++) {
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) ayir(coins[i], coins[j]);
    }
    for (const c of coins) duvarlar(c);
  }

  for (const c of coins) {
    c.vx = ((c.x - c.px) / dt) * 0.995;
    c.vy = ((c.y - c.py) / dt) * 0.995;
    const hiz = Math.hypot(c.vx, c.vy);
    if (hiz > 2200) { c.vx *= 2200 / hiz; c.vy *= 2200 / hiz; }
    c.a += (c.vx / TIERS[c.ti].r) * dt * 0.9;
    c.yas += dt;
  }
}

/* Iki parayi ust uste binmeyecek sekilde ayirir (sadece konum) */
function ayir(a, b) {
  const ra = TIERS[a.ti].r;
  const rb = TIERS[b.ti].r;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const top = ra + rb;
  const d2 = dx * dx + dy * dy;
  if (d2 >= top * top) return;

  let d = Math.sqrt(d2);
  let nx;
  let ny;
  if (d < 0.0001) {
    // Tam ust uste dusen paralari rastgele bir yone acalim
    const ac = Math.random() * TAU;
    nx = Math.cos(ac);
    ny = Math.sin(ac);
    d = 0.0001;
  } else {
    nx = dx / d;
    ny = dy / d;
  }

  const girinti = (top - d) * 0.9;
  const ma = ra * ra;
  const mb = rb * rb;
  const toplam = ma + mb;

  a.x -= nx * girinti * (mb / toplam);
  a.y -= ny * girinti * (mb / toplam);
  b.x += nx * girinti * (ma / toplam);
  b.y += ny * girinti * (ma / toplam);
}

function duvarlar(c) {
  const r = TIERS[c.ti].r;
  if (c.x - r < 0) c.x = r;
  if (c.x + r > W) c.x = W - r;
  if (c.y + r > H) c.y = H - r;
}

/* Ayni kademeden degen iki para birlesiyor. Kare basina her para en fazla
   bir birlesmeye giriyor; zincirleme birlesmeler sonraki karelerde oluyor. */
function birlestir() {
  const olen = new Set();

  for (let i = 0; i < coins.length; i++) {
    const a = coins[i];
    if (olen.has(a.id)) continue;
    for (let j = i + 1; j < coins.length; j++) {
      const b = coins[j];
      if (olen.has(b.id) || b.ti !== a.ti) continue;
      if (a.ti >= SON_KADEME) continue;

      const r = TIERS[a.ti].r;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy > (r * 2) * (r * 2)) continue;

      olen.add(a.id);
      olen.add(b.id);

      const ust = Math.min(a.ti + 1, SON_KADEME);
      const yeni = {
        id: nextId++,
        ti: ust,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        vx: (a.vx + b.vx) / 2,
        vy: (a.vy + b.vy) / 2 - 40,
        a: (a.a + b.a) / 2,
        yas: 0.5,
        pop: 1,
      };
      coins.push(yeni);

      score += TIERS[ust].value;
      enYuksek = Math.max(enYuksek, ust);
      patlama(yeni.x, yeni.y, TIERS[ust].r, ust);
      yazilar.push({ x: yeni.x, y: yeni.y, txt: `+${bicim(TIERS[ust].value)}`, om: 1 });

      if (ust >= 6) SFX.coinBig();
      else SFX.coin(1 + ust * 0.06);
      haptic.tap(ust >= 6 ? 'medium' : 'light');
      break;
    }
  }

  if (olen.size) {
    coins = coins.filter((c) => !olen.has(c.id));
    guncelleHud();
    if (enYuksek >= SON_KADEME && !over) kazandi();
  }
}

function patlama(x, y, r, ti) {
  const M = METAL[TIERS[ti].metal];
  for (let i = 0; i < 10; i++) {
    const ac = rast(0, TAU);
    const hz = rast(60, 190);
    parcaciklar.push({
      x, y,
      vx: Math.cos(ac) * hz,
      vy: Math.sin(ac) * hz - 40,
      r: rast(1.6, 3.6),
      om: 1,
      renk: i % 2 ? M.hi : M.mid,
    });
  }
}

function efektler(dt) {
  for (const p of parcaciklar) {
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.om -= dt * 1.7;
  }
  parcaciklar = parcaciklar.filter((p) => p.om > 0);

  for (const y of yazilar) {
    y.y -= dt * 42;
    y.om -= dt * 1.15;
  }
  yazilar = yazilar.filter((y) => y.om > 0);

  for (const c of coins) if (c.pop) c.pop = Math.max(0, c.pop - dt * 4.5);
}

/* Cizginin ustunde kalan (ve yeni dusmemis) bir para varsa kasa doluyor */
function tehlikeKontrol(dt) {
  let tasan = false;
  for (const c of coins) {
    if (c.yas > 0.9 && c.y - TIERS[c.ti].r < LINE_Y) { tasan = true; break; }
  }
  tehlike = tasan ? tehlike + dt : 0;
  if (tehlike > TEHLIKE_SURESI && !over) endGame(false);
}

/* --- Dongu --- */
function simule(dt) {
  if (!over) {
    const h = dt / ALT_ADIM;
    for (let i = 0; i < ALT_ADIM; i++) adim(h);
    birlestir();
    tehlikeKontrol(dt);
    if (bekleme > 0) bekleme = Math.max(0, bekleme - dt);
  }
  efektler(dt);
}

function dongu(ts) {
  requestAnimationFrame(dongu);
  if (!sonKare) sonKare = ts;
  let dt = (ts - sonKare) / 1000;
  sonKare = ts;
  if (dt > 0.05) dt = 0.05;
  if (dt > 0) simule(dt);
  ciz();
}

/* --- Cizim --- */
function ciz() {
  if (!cv.width) return;
  g.setTransform(olcek, 0, 0, olcek, 0, 0);
  g.clearRect(0, 0, W, H);

  // Tehlike cizgisi
  g.save();
  g.strokeStyle = tehlike > 0.35 ? 'rgba(226,84,78,.9)' : 'rgba(255,255,255,.16)';
  g.lineWidth = 2;
  g.setLineDash([9, 9]);
  g.beginPath();
  g.moveTo(6, LINE_Y);
  g.lineTo(W - 6, LINE_Y);
  g.stroke();
  g.restore();

  // Tutulan para + hedef cizgisi
  if (!over && bekleme <= 0) {
    const r = TIERS[sonraki].r;
    const x = Math.max(r + 2, Math.min(W - r - 2, aimX));
    g.save();
    g.strokeStyle = 'rgba(245,185,66,.22)';
    g.lineWidth = 2;
    g.setLineDash([4, 8]);
    g.beginPath();
    g.moveTo(x, DROP_Y + r);
    g.lineTo(x, H - 8);
    g.stroke();
    g.restore();
    coinCiz(x, DROP_Y, r, sonraki, 0);
  }

  for (const c of coins) {
    const r = TIERS[c.ti].r * (1 + (c.pop || 0) * 0.16);
    coinCiz(c.x, c.y, r, c.ti, c.a);
  }

  for (const p of parcaciklar) {
    g.globalAlpha = Math.max(0, p.om);
    g.fillStyle = p.renk;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;

  for (const y of yazilar) {
    g.globalAlpha = Math.max(0, y.om);
    g.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.strokeText(y.txt, y.x, y.y);
    g.fillStyle = '#ffe9a8';
    g.fillText(y.txt, y.x, y.y);
  }
  g.globalAlpha = 1;
}

/* Tek bir madeni para: tirtikli kenar, ic yuz, kabartma yazi ve $MH amblemi */
function coinCiz(x, y, r, ti, aci) {
  const M = METAL[TIERS[ti].metal];
  g.save();
  g.translate(x, y);
  g.rotate(aci);

  // Govde
  const gd = g.createRadialGradient(-r * 0.36, -r * 0.42, r * 0.06, 0, 0, r * 1.06);
  gd.addColorStop(0, M.hi);
  gd.addColorStop(0.46, M.mid);
  gd.addColorStop(1, M.lo);
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fillStyle = gd;
  g.fill();

  // Tirtikli kenar
  const tirtik = Math.max(18, Math.round(r * 0.78));
  g.strokeStyle = M.rim;
  g.globalAlpha = 0.5;
  g.lineWidth = Math.max(0.8, r * 0.05);
  for (let i = 0; i < tirtik; i++) {
    const a = (i / tirtik) * TAU;
    const c1 = Math.cos(a);
    const s1 = Math.sin(a);
    g.beginPath();
    g.moveTo(c1 * r * 0.9, s1 * r * 0.9);
    g.lineTo(c1 * r * 0.995, s1 * r * 0.995);
    g.stroke();
  }
  g.globalAlpha = 1;

  // Dis cember
  g.beginPath();
  g.arc(0, 0, r * 0.97, 0, TAU);
  g.lineWidth = Math.max(0.9, r * 0.06);
  g.strokeStyle = M.rim;
  g.stroke();

  // Ic yuz
  const f = r * 0.76;
  const fg = g.createRadialGradient(-f * 0.32, -f * 0.36, f * 0.05, 0, 0, f * 1.12);
  fg.addColorStop(0, M.hi);
  fg.addColorStop(0.5, M.mid);
  fg.addColorStop(1, M.lo);
  g.beginPath();
  g.arc(0, 0, f, 0, TAU);
  g.fillStyle = fg;
  g.fill();
  g.globalAlpha = 0.65;
  g.beginPath();
  g.arc(0, 0, f, 0, TAU);
  g.lineWidth = Math.max(0.8, r * 0.04);
  g.strokeStyle = M.rim;
  g.stroke();
  g.globalAlpha = 1;

  // Mythic kademelerde ince yesil defne halkasi (referans gorseldeki gibi)
  if (TIERS[ti].metal === 'royal') {
    g.globalAlpha = 0.55;
    g.beginPath();
    g.arc(0, 0, f * 0.92, 0, TAU);
    g.lineWidth = Math.max(1, r * 0.045);
    g.strokeStyle = '#2f6b4f';
    g.setLineDash([r * 0.16, r * 0.1]);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  }

  const amblemVar = amblemHazir && r >= 24;
  const yaziY = amblemVar ? -f * 0.22 : 0;

  // Kabartma yazi: once koyu golge, ustune acik yuz
  const txt = TIERS[ti].txt;
  let boy = f * (txt.length >= 4 ? 0.62 : txt.length === 3 ? 0.76 : 0.92);
  g.font = `900 ${boy}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const gen = g.measureText(txt).width;
  const sinir = f * (amblemVar ? 1.42 : 1.5);
  if (gen > sinir) {
    boy *= sinir / gen;
    g.font = `900 ${boy}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = M.ink;
  g.globalAlpha = 0.55;
  g.fillText(txt, 0, yaziY + Math.max(0.7, r * 0.035));
  g.globalAlpha = 1;
  g.fillStyle = M.hi;
  g.fillText(txt, 0, yaziY);

  // $MH amblemi (darphane isareti gibi, yazinin altinda)
  if (amblemVar) {
    const d = f * 0.56;
    g.globalAlpha = 0.95;
    g.drawImage(amblem, -d / 2, f * 0.24, d, d);
    g.globalAlpha = 1;
  }

  // Ust parlama
  g.globalAlpha = 0.16;
  g.beginPath();
  g.ellipse(-r * 0.3, -r * 0.44, r * 0.42, r * 0.22, -0.5, 0, TAU);
  g.fillStyle = '#fff';
  g.fill();
  g.globalAlpha = 1;

  g.restore();
}

/* --- HUD --- */
function guncelleHud() {
  scoreEl.textContent = bicim(score);
  if (score > best) {
    best = score;
    bestEl.textContent = bicim(best);
  }
  nextChipEl.innerHTML = coinSvg(sonraki);
  [...ladderEl.children].forEach((el, i) => {
    el.classList.toggle('reached', i <= enYuksek);
    el.classList.toggle('top', i === enYuksek);
  });
}

function buildLadder() {
  ladderEl.innerHTML = TIERS.map((_, i) => `<span>${coinSvg(i)}</span>`).join('');
}

/* HUD/serit icin kucuk SVG para - canvas'takiyle ayni renk mantigi */
function coinSvg(ti) {
  const M = METAL[TIERS[ti].metal];
  const txt = TIERS[ti].txt;
  const boy = txt.length >= 4 ? 8 : txt.length === 3 ? 10 : 12;
  return `<svg viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <radialGradient id="cd${ti}" cx="0.34" cy="0.3" r="0.78">
        <stop offset="0" stop-color="${M.hi}"/>
        <stop offset="0.5" stop-color="${M.mid}"/>
        <stop offset="1" stop-color="${M.lo}"/>
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="15" fill="url(#cd${ti})" stroke="${M.rim}" stroke-width="1.6"/>
    <circle cx="16" cy="16" r="11.5" fill="none" stroke="${M.rim}" stroke-width="1" opacity=".6"/>
    <text x="16" y="17" text-anchor="middle" dominant-baseline="middle"
          font-family="-apple-system, BlinkMacSystemFont, sans-serif"
          font-size="${boy}" font-weight="900" fill="${M.ink}" opacity=".5">${txt}</text>
    <text x="16" y="16" text-anchor="middle" dominant-baseline="middle"
          font-family="-apple-system, BlinkMacSystemFont, sans-serif"
          font-size="${boy}" font-weight="900" fill="${M.hi}">${txt}</text>
  </svg>`;
}

/* --- Giris --- */
function noktaX(e) {
  const kutu = stageEl.getBoundingClientRect();
  return ((e.clientX - kutu.left) / kutu.width) * W;
}

stageEl.addEventListener('pointerdown', (e) => {
  if (over) return;
  stageEl.setPointerCapture?.(e.pointerId);
  aimX = noktaX(e);
});

stageEl.addEventListener('pointermove', (e) => {
  if (over) return;
  e.preventDefault();
  aimX = noktaX(e);
});

stageEl.addEventListener('pointerup', (e) => {
  if (over) return;
  aimX = noktaX(e);
  dus();
});

stageEl.addEventListener('pointercancel', () => {});

function dus() {
  if (over || bekleme > 0) return;
  const ti = sonraki;
  const r = TIERS[ti].r;
  coins.push({
    id: nextId++,
    ti,
    x: Math.max(r + 2, Math.min(W - r - 2, aimX)),
    y: DROP_Y,
    vx: 0,
    vy: 60,
    a: rast(-0.4, 0.4),
    yas: 0,
  });
  sonraki = yeniKademe();
  bekleme = BEKLEME;
  SFX.place();
  haptic.tap('light');
  guncelleHud();
  persist();
}

/* --- Bitis --- */
async function kazandi() {
  await endGame(true);
}

async function endGame(kazanma) {
  if (over) return;
  over = true;
  clearState(GAME_ID);

  if (kazanma) { haptic.success(); SFX.goldenPickup(); }
  else { haptic.error(); SFX.gameOver(); }

  const sonuc = await submitScore(GAME_ID, score);
  best = sonuc.best;
  bestEl.textContent = bicim(best);

  const kazanilan = Math.floor(score / POINTS_DIVISOR);
  if (kazanilan > 0) await addPoints(kazanilan);

  const satirlar = [t('yourScore', { score: bicim(score) })];
  if (kazanma) satirlar.push(t('wonText'));
  if (sonuc.isRecord) satirlar.push(t('newRecord'));
  if (kazanilan > 0) satirlar.push(t('earnedPoints', { points: bicim(kazanilan) }));

  showOverlay(kazanma ? t('wonTitle') : t('gameOver'), satirlar.join(' · '), t('playAgain'), startNewGame);
}

function showOverlay(baslik, metin, dugme, islem) {
  overlayTitle.textContent = baslik;
  overlayText.innerHTML = mhHtml(metin);
  overlayBtn.textContent = dugme;
  overlayBtn.onclick = () => { haptic.tap(); islem(); };
  overlayEl.hidden = false;
}

function hideOverlay() {
  overlayEl.hidden = true;
}
