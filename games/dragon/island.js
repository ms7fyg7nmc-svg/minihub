/* Dragon Island - 2.5D IZOMETRIK ADA

   NEDEN CANVAS, NEDEN PHASER DEGIL?

   Phaser ~1 MB. Bu projenin tamami 8 bin satir ve tek dis bagimliligi
   telegram-web-app.js. Telegram Mini App'te hizli acilis her seyden onemli,
   o yuzden ada duz Canvas 2D ile ciziliyor: izometrik projeksiyon, derinlik
   siralamasi, golge ve partikul birkac yuz satir tutuyor ve sifir bagimlilik
   ekliyor.

   TEMA TABANLI

   Ada artik tek bir sabit sahne degil: renkler, susler, gokyuzu ve partikul
   turu data.js'teki ISLANDS tablosundan VERI olarak geliyor. Yeni bir ada
   eklemek icin oraya bir satir yazmak yeterli - bu dosya degismez.

   IKI KATMAN, GERCEK DERINLIK

   Ejderha bir DOM SVG'si (CSS animasyonlari ve keskin cizgiler icin).
   Ada ise iki canvas'a boluyor:

     arka canvas  -> ejderhanin ARKASINDA kalan her sey
     [ejderha]
     on canvas    -> ejderhanin ONUNDE duran nesneler

   PERFORMANS

   Ada ve nesneler DEGISMIYOR, o yuzden bir kez "pisirilip" (bake) hazir
   goruntu olarak saklaniyor. Her karede sadece su/lav parlamalari ve
   partikuller yeniden ciziliyor. Sekme arka plana alininca dongu duruyor. */

import { ada as adaTemasi } from './data.js?v26';

const TILE_W = 46;   /* izometrik karo genisligi */
const TILE_H = 23;   /* karo yuksekligi (2:1 izometrik) */
const SIDE = 22;     /* toprak kalinligi */
const KARE_MS = 33;  /* ~30 fps: pil dostu, goz icin yeterli */

/* Ada plani. # kara, w su, nokta bosluk.
   Elle cizildi - rastgele uretim "kazara" duran adalar cikariyordu. */
const PLAN = [
  '..#####..',
  '.#######.',
  '#########',
  '###ww####',
  '###ww####',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
];

/* Yuksek plato: yuva burada durur, ada duz bir tabak gibi gorunmesin diye */
const PLATO = new Set(['1,6', '1,7', '2,6', '2,7', '2,8', '3,7']);

const boyut = PLAN.length;
const kara = (r, c) => PLAN[r]?.[c] === '#' || PLAN[r]?.[c] === 'w';
const suMu = (r, c) => PLAN[r]?.[c] === 'w';
const yukseklik = (r, c) => (PLATO.has(`${r},${c}`) ? 1 : 0);

/* Izometrik projeksiyon. r = satir (y), c = sutun (x) */
function ekrana(r, c, h = 0) {
  return {
    x: (c - r) * (TILE_W / 2),
    y: (c + r) * (TILE_H / 2) - h * SIDE,
  };
}

/* Derinlik anahtari: buyuk olan one gelir */
const derinlik = (r, c) => r + c;

/* Sahnenin izgara merkezine gore dikey sinirlari.
   Kadrajlama bu ikisinin ortasina gore yapiliyor. */
const ICERIK_UST = -118;
const ICERIK_ALT = 190;

/* Sus yerleri. Ilk sira YUVA, digerleri temanin susler listesinden sirayla
   doluyor. Boylece her ada ayni duzeni farkli nesnelerle kuruyor. */
const POZISYONLAR = [
  { r: 2, c: 7, olcek: 1.0 },
  { r: 1, c: 3, olcek: 1.0 },
  { r: 0, c: 5, olcek: 0.82 },
  { r: 1, c: 6, olcek: 0.9 },
  { r: 3, c: 1, olcek: 0.9 },
  { r: 5, c: 2, olcek: 1.0 },
  { r: 5, c: 6, olcek: 0.9 },
  { r: 6, c: 3, olcek: 1.0 },
  { r: 6, c: 7, olcek: 0.75 },
  { r: 7, c: 5, olcek: 1.05 },
  { r: 7, c: 2, olcek: 1.0 },
  { r: 8, c: 4, olcek: 0.9 },
];

/* Ejderhanin durdugu karo: nesneler buna gore one/arkaya ayriliyor */
export const EJDERHA_KARO = { r: 5, c: 5 };
const EJDERHA_DERINLIK = derinlik(EJDERHA_KARO.r, EJDERHA_KARO.c);

/* --- Cizim yardimcilari --- */

function karoYolu(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
}

function golgeCiz(ctx, x, y, rx) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- SUSLER ----------
   Her biri kendi karosunun ekran noktasina cizilir. Yeni bir sus eklemek
   icin buraya bir fonksiyon yazip temanin susler listesinde adini kullanmak
   yeterli. */
const SUSLER = {
  agac(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 3, 15 * s);
    ctx.fillStyle = '#5b3f2b';
    ctx.fillRect(x - 3 * s, y - 26 * s, 6 * s, 26 * s);
    const kat = (dy, w, renk) => {
      ctx.fillStyle = renk;
      ctx.beginPath();
      ctx.moveTo(x, y - (dy + 26) * s);
      ctx.lineTo(x + w * s, y - dy * s);
      ctx.lineTo(x - w * s, y - dy * s);
      ctx.closePath(); ctx.fill();
    };
    kat(18, 20, '#2f7a45'); kat(30, 17, '#3a9153'); kat(42, 13, '#48a862');
  },

  kaya(ctx, x, y, s, tema) {
    golgeCiz(ctx, x, y + 2, 13 * s);
    ctx.fillStyle = tema.zemin.kayaAcik;
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y); ctx.lineTo(x - 8 * s, y - 15 * s);
    ctx.lineTo(x + 4 * s, y - 18 * s); ctx.lineTo(x + 14 * s, y - 4 * s);
    ctx.lineTo(x + 8 * s, y + 4 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = tema.zemin.kaya;
    ctx.beginPath();
    ctx.moveTo(x + 4 * s, y - 18 * s); ctx.lineTo(x + 14 * s, y - 4 * s);
    ctx.lineTo(x + 8 * s, y + 4 * s); ctx.closePath(); ctx.fill();
  },

  kutuk(ctx, x, y) {
    golgeCiz(ctx, x, y + 2, 11);
    ctx.fillStyle = '#5b3f2b'; ctx.fillRect(x - 8, y - 14, 16, 14);
    ctx.fillStyle = '#7d5838';
    ctx.beginPath(); ctx.ellipse(x, y - 14, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  },

  cicek(ctx, x, y) {
    ctx.fillStyle = '#2f7a45'; ctx.fillRect(x - 1, y - 9, 2, 9);
    for (const [dx, dy, renk] of [[-4, -12, '#f5b942'], [3, -14, '#e2679c'], [0, -8, '#fff3d0']]) {
      ctx.fillStyle = renk;
      ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  },

  /* --- Ates adasi --- */
  volkanKaya(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 2, 14 * s);
    ctx.fillStyle = '#2b1a19';
    ctx.beginPath();
    ctx.moveTo(x - 15 * s, y); ctx.lineTo(x - 7 * s, y - 18 * s);
    ctx.lineTo(x + 6 * s, y - 20 * s); ctx.lineTo(x + 15 * s, y - 3 * s);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff7a2d'; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 4 * s); ctx.lineTo(x - 2 * s, y - 12 * s);
    ctx.lineTo(x + 5 * s, y - 8 * s);
    ctx.stroke(); ctx.globalAlpha = 1;
  },

  olukAgac(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 2, 10 * s);
    ctx.strokeStyle = '#3b2320'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + 2 * s, y - 26 * s);
    ctx.moveTo(x + 1 * s, y - 16 * s); ctx.lineTo(x + 10 * s, y - 22 * s);
    ctx.moveTo(x + 2 * s, y - 22 * s); ctx.lineTo(x - 7 * s, y - 30 * s);
    ctx.stroke();
  },

  ember(ctx, x, y) {
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath(); ctx.ellipse(x, y - 2, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath(); ctx.ellipse(x, y - 3, 5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  },

  /* --- Buz adasi --- */
  karAgac(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 3, 14 * s);
    ctx.fillStyle = '#4a3a30';
    ctx.fillRect(x - 3 * s, y - 22 * s, 6 * s, 22 * s);
    const kat = (dy, w, renk) => {
      ctx.fillStyle = renk;
      ctx.beginPath();
      ctx.moveTo(x, y - (dy + 24) * s);
      ctx.lineTo(x + w * s, y - dy * s); ctx.lineTo(x - w * s, y - dy * s);
      ctx.closePath(); ctx.fill();
    };
    kat(16, 18, '#2c6b58'); kat(27, 15, '#dff2fa'); kat(38, 11, '#ffffff');
  },

  buzKristal(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 2, 10 * s);
    const sut = (dx, h, w) => {
      ctx.fillStyle = '#bfe8fa';
      ctx.beginPath();
      ctx.moveTo(x + dx, y - h * s);
      ctx.lineTo(x + dx + w * s, y - h * 0.35 * s);
      ctx.lineTo(x + dx + w * 0.6 * s, y); ctx.lineTo(x + dx - w * 0.6 * s, y);
      ctx.lineTo(x + dx - w * s, y - h * 0.35 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(x + dx, y - h * s);
      ctx.lineTo(x + dx + w * s, y - h * 0.35 * s);
      ctx.lineTo(x + dx, y - h * 0.3 * s);
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    };
    sut(-7 * s, 18, 5); sut(4 * s, 28, 6); sut(12 * s, 14, 4);
  },

  kar(ctx, x, y) {
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(x, y - 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 8, y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  },

  /* --- Volkanik ada --- */
  volkan(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 4, 26 * s);
    ctx.fillStyle = '#251716';
    ctx.beginPath();
    ctx.moveTo(x - 30 * s, y + 2); ctx.lineTo(x - 11 * s, y - 40 * s);
    ctx.lineTo(x + 11 * s, y - 40 * s); ctx.lineTo(x + 30 * s, y + 2);
    ctx.closePath(); ctx.fill();
    /* Krater ve icindeki lav */
    ctx.fillStyle = '#3a2422';
    ctx.beginPath(); ctx.ellipse(x, y - 40 * s, 11 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6a1f';
    ctx.beginPath(); ctx.ellipse(x, y - 40 * s, 8 * s, 3.2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath(); ctx.ellipse(x, y - 40 * s, 4 * s, 1.6 * s, 0, 0, Math.PI * 2); ctx.fill();
    /* Yamactan asagi akan lav */
    ctx.strokeStyle = '#ff7a2d'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 38 * s); ctx.lineTo(x - 12 * s, y - 18 * s);
    ctx.lineTo(x - 9 * s, y - 4 * s);
    ctx.moveTo(x + 5 * s, y - 37 * s); ctx.lineTo(x + 13 * s, y - 14 * s);
    ctx.stroke();
  },

  lavCatlak(ctx, x, y) {
    ctx.strokeStyle = '#ff6a1f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 2); ctx.lineTo(x - 4, y - 3);
    ctx.lineTo(x + 3, y + 2); ctx.lineTo(x + 14, y - 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffd76e'; ctx.lineWidth = 1.2;
    ctx.stroke(); ctx.globalAlpha = 1;
  },

  /* --- Celestial ada --- */
  kristal(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 2, 12 * s);
    const sut = (dx, h, w, renk) => {
      ctx.fillStyle = renk;
      ctx.beginPath();
      ctx.moveTo(x + dx, y - h * s);
      ctx.lineTo(x + dx + w * s, y - h * 0.4 * s);
      ctx.lineTo(x + dx + w * 0.5 * s, y); ctx.lineTo(x + dx - w * 0.5 * s, y);
      ctx.lineTo(x + dx - w * s, y - h * 0.4 * s);
      ctx.closePath(); ctx.fill();
    };
    sut(-8 * s, 20, 5, '#8f7ae0'); sut(3 * s, 32, 6.5, '#b79bf5'); sut(13 * s, 16, 4.5, '#7a6ff0');
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(x + 3 * s, y - 30 * s, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  },

  parlakBitki(ctx, x, y) {
    ctx.strokeStyle = '#5f8fd8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y - 12);
    ctx.moveTo(x, y); ctx.lineTo(x + 5, y - 14);
    ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 17);
    ctx.stroke();
    for (const [dx, dy] of [[-4, -13], [5, -15], [1, -18]]) {
      ctx.fillStyle = '#c9b7f5';
      ctx.beginPath(); ctx.arc(x + dx, y + dy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  yuzenKaya(ctx, x, y, s, tema) {
    ctx.fillStyle = tema.zemin.kayaAcik;
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, y - 26 * s); ctx.lineTo(x + 12 * s, y - 26 * s);
    ctx.lineTo(x + 6 * s, y - 18 * s); ctx.lineTo(x - 7 * s, y - 18 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = tema.zemin.ust;
    ctx.beginPath();
    ctx.ellipse(x, y - 27 * s, 12 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  },

  /* --- Ejder Kralligi --- */
  heykel(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 4, 20 * s);
    /* Kaide */
    ctx.fillStyle = '#4a3f7a';
    ctx.fillRect(x - 15 * s, y - 10 * s, 30 * s, 10 * s);
    ctx.fillStyle = '#5f5498';
    ctx.beginPath(); ctx.ellipse(x, y - 10 * s, 15 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    /* Ejderha silueti: govde, boyun, bas, kanat */
    ctx.fillStyle = '#f0d78a';
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - 12 * s);
    ctx.lineTo(x - 5 * s, y - 34 * s); ctx.lineTo(x + 2 * s, y - 42 * s);
    ctx.lineTo(x + 10 * s, y - 40 * s); ctx.lineTo(x + 6 * s, y - 32 * s);
    ctx.lineTo(x + 8 * s, y - 12 * s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 30 * s); ctx.lineTo(x - 20 * s, y - 44 * s);
    ctx.lineTo(x - 12 * s, y - 26 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 5 * s, y - 30 * s); ctx.lineTo(x + 20 * s, y - 44 * s);
    ctx.lineTo(x + 13 * s, y - 26 * s); ctx.closePath(); ctx.fill();
  },

  altinYol(ctx, x, y) {
    ctx.fillStyle = '#f5c74a'; ctx.globalAlpha = 0.75;
    karoYolu(ctx, x, y - 1); ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff3d0';
    karoYolu(ctx, x, y - 2); ctx.fill();
    ctx.globalAlpha = 1;
  },

  sutun(ctx, x, y, s) {
    golgeCiz(ctx, x, y + 3, 11 * s);
    ctx.fillStyle = '#cfc6f0';
    ctx.fillRect(x - 6 * s, y - 40 * s, 12 * s, 40 * s);
    ctx.fillStyle = '#f0d78a';
    ctx.fillRect(x - 9 * s, y - 46 * s, 18 * s, 7 * s);
    ctx.fillRect(x - 8 * s, y - 5 * s, 16 * s, 6 * s);
    ctx.fillStyle = '#a89ad8';
    ctx.fillRect(x + 2 * s, y - 40 * s, 4 * s, 36 * s);
  },

  selale(ctx, x, y, s) {
    ctx.fillStyle = '#7fd4f0'; ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, y - 4 * s); ctx.lineTo(x + 9 * s, y - 4 * s);
    ctx.lineTo(x + 6 * s, y + 40 * s); ctx.lineTo(x - 6 * s, y + 40 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.45;
    ctx.fillRect(x - 3 * s, y - 4 * s, 3 * s, 40 * s);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#bfeaff';
    ctx.beginPath(); ctx.ellipse(x, y - 5 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
  },
};

/* Yuva turleri */
const YUVALAR = {
  orgu(ctx, x, y) {
    golgeCiz(ctx, x, y + 3, 22);
    ctx.fillStyle = '#6b4a2a';
    ctx.beginPath(); ctx.ellipse(x, y - 4, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#815a34';
    ctx.beginPath(); ctx.ellipse(x, y - 8, 24, 12, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#3b2a18';
    ctx.beginPath(); ctx.ellipse(x, y - 8, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
  },
  kor(ctx, x, y) {
    golgeCiz(ctx, x, y + 3, 22);
    ctx.fillStyle = '#2b1a19';
    ctx.beginPath(); ctx.ellipse(x, y - 4, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6a1f';
    ctx.beginPath(); ctx.ellipse(x, y - 6, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath(); ctx.ellipse(x, y - 6, 8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  },
  buz(ctx, x, y) {
    golgeCiz(ctx, x, y + 3, 22);
    ctx.fillStyle = '#9cc9de';
    ctx.beginPath(); ctx.ellipse(x, y - 4, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dff2fa';
    ctx.beginPath(); ctx.ellipse(x, y - 7, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 9, y - 4); ctx.lineTo(x + i * 9 + 3, y - 15);
      ctx.stroke();
    }
  },
  kristal(ctx, x, y) {
    golgeCiz(ctx, x, y + 3, 22);
    ctx.fillStyle = '#4a3f7a';
    ctx.beginPath(); ctx.ellipse(x, y - 4, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8f7ae0';
    ctx.beginPath(); ctx.ellipse(x, y - 7, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9b7f5';
    for (const dx of [-13, 0, 13]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 20); ctx.lineTo(x + dx + 4, y - 8);
      ctx.lineTo(x + dx - 4, y - 8); ctx.closePath(); ctx.fill();
    }
  },
  altin(ctx, x, y) {
    golgeCiz(ctx, x, y + 3, 24);
    ctx.fillStyle = '#8f6a1c';
    ctx.beginPath(); ctx.ellipse(x, y - 4, 26, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f5c74a';
    ctx.beginPath(); ctx.ellipse(x, y - 8, 26, 13, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath(); ctx.ellipse(x, y - 9, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2544e';
    ctx.beginPath(); ctx.arc(x, y - 12, 3.4, 0, Math.PI * 2); ctx.fill();
  },
};

/* --- Ada motoru --- */

export function createIsland(arkaCanvas, onCanvas, adaId = 'grassland') {
  const arka = arkaCanvas.getContext('2d');
  const on = onCanvas.getContext('2d');

  let tema = adaTemasi(adaId);
  let genislik = 0;
  let yukseklikPx = 0;
  let dpr = 1;
  let merkezX = 0;
  let merkezY = 0;
  let olcek = 1;

  /* Pisirilmis (statik) katmanlar */
  const arkaPismis = document.createElement('canvas');
  const onPismis = document.createElement('canvas');

  let partikuller = [];
  let calisiyor = false;
  let sonKare = 0;
  let rafId = 0;

  const icerikGenislik = boyut * TILE_W;

  function karoCiz(ctx, r, c) {
    const h = yukseklik(r, c);
    const { x, y } = ekrana(r, c, h);
    const z = tema.zemin;

    const derinlikPx = SIDE + h * SIDE;
    ctx.fillStyle = z.yanSol;
    ctx.beginPath();
    ctx.moveTo(x - TILE_W / 2, y); ctx.lineTo(x, y + TILE_H / 2);
    ctx.lineTo(x, y + TILE_H / 2 + derinlikPx); ctx.lineTo(x - TILE_W / 2, y + derinlikPx);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = z.yanSag;
    ctx.beginPath();
    ctx.moveTo(x + TILE_W / 2, y); ctx.lineTo(x, y + TILE_H / 2);
    ctx.lineTo(x, y + TILE_H / 2 + derinlikPx); ctx.lineTo(x + TILE_W / 2, y + derinlikPx);
    ctx.closePath(); ctx.fill();

    karoYolu(ctx, x, y);
    if (suMu(r, c)) {
      ctx.fillStyle = tema.su.ana;
    } else {
      const ton = (r * 7 + c * 13) % 3;
      ctx.fillStyle = ton === 0 ? z.ustAcik : ton === 1 ? z.ust : z.ustKoyu;
    }
    ctx.fill();
  }

  /* Adanin altindaki kaya kutlesi: yuzen ada hissi buradan geliyor */
  function altKayaCiz(ctx) {
    const alt = ekrana(boyut - 1, boyut - 1);
    const yariGenislik = ((boyut - 1) * TILE_W) / 2;
    const solX = alt.x - yariGenislik * 0.58;
    const sagX = alt.x + yariGenislik * 0.58;
    const ustY = alt.y - 46;
    const ucY = alt.y + 96;

    const grad = ctx.createLinearGradient(0, ustY, 0, ucY);
    grad.addColorStop(0, tema.zemin.kayaAcik);
    grad.addColorStop(0.55, tema.zemin.kaya);
    grad.addColorStop(1, '#141020');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(solX, ustY);
    ctx.bezierCurveTo(solX + 10, alt.y + 34, alt.x - 26, ucY - 26, alt.x - 5, ucY);
    ctx.lineTo(alt.x + 5, ucY);
    ctx.bezierCurveTo(alt.x + 26, ucY - 26, sagX - 10, alt.y + 34, sagX, ustY);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = tema.zemin.kaya;
    for (const [dx, dy, w, hh] of [[-34, 24, 13, 26], [30, 30, 11, 21], [-10, 62, 9, 18]]) {
      ctx.beginPath();
      ctx.moveTo(alt.x + dx - w / 2, alt.y + dy); ctx.lineTo(alt.x + dx + w / 2, alt.y + dy);
      ctx.lineTo(alt.x + dx, alt.y + dy + hh); ctx.closePath(); ctx.fill();
    }

    /* Volkanik ada: kayadan asagi akan lav */
    if (tema.lavAkintisi) {
      ctx.strokeStyle = '#ff6a1f'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(alt.x - 22, alt.y - 10); ctx.lineTo(alt.x - 16, alt.y + 34);
      ctx.lineTo(alt.x - 20, alt.y + 62);
      ctx.moveTo(alt.x + 18, alt.y - 6); ctx.lineTo(alt.x + 12, alt.y + 40);
      ctx.stroke();
      ctx.strokeStyle = '#ffd76e'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* Celestial / Kingdom: adanin altinda yuzen kucuk adaciklar */
    if (tema.yuzenAdacik) {
      for (const [dx, dy, w] of [[-78, 40, 22], [72, 66, 18], [-30, 104, 14]]) {
        ctx.fillStyle = tema.zemin.kayaAcik;
        ctx.beginPath();
        ctx.moveTo(alt.x + dx - w, alt.y + dy); ctx.lineTo(alt.x + dx + w, alt.y + dy);
        ctx.lineTo(alt.x + dx, alt.y + dy + w * 0.9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = tema.zemin.ust;
        ctx.beginPath();
        ctx.ellipse(alt.x + dx, alt.y + dy, w, w * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function boyutlandir() {
    const kutu = arkaCanvas.getBoundingClientRect();
    if (!kutu.width) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    genislik = kutu.width;
    yukseklikPx = kutu.height;

    for (const c of [arkaCanvas, onCanvas, arkaPismis, onPismis]) {
      c.width = Math.round(genislik * dpr);
      c.height = Math.round(yukseklikPx * dpr);
    }

    olcek = Math.min(1, (genislik - 16) / icerikGenislik);
    merkezX = genislik / 2;
    /* Dikey kadraj sahnenin gercek sinirlarina gore ortalanir */
    merkezY = yukseklikPx / 2 - ((ICERIK_UST + ICERIK_ALT) / 2) * olcek;

    pisir();
    partikullerYarat();
    return true;
  }

  function kamera(ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(merkezX, merkezY);
    ctx.scale(olcek, olcek);
    const orta = ekrana((boyut - 1) / 2, (boyut - 1) / 2);
    ctx.translate(-orta.x, -orta.y);
  }

  /* Statik sahneyi bir kez cizip sakla */
  function pisir() {
    const a = arkaPismis.getContext('2d');
    const o = onPismis.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0);
    o.setTransform(1, 0, 0, 1, 0, 0);
    a.clearRect(0, 0, arkaPismis.width, arkaPismis.height);
    o.clearRect(0, 0, onPismis.width, onPismis.height);

    kamera(a); kamera(o);
    altKayaCiz(a);

    /* Karolar arkadan one: ressam algoritmasi */
    for (let toplam = 0; toplam <= (boyut - 1) * 2; toplam++) {
      for (let r = 0; r < boyut; r++) {
        const c = toplam - r;
        if (c < 0 || c >= boyut || !kara(r, c)) continue;
        karoCiz(a, r, c);
      }
    }

    /* Ejderhanin zemin golgesi */
    const eNokta = ekrana(EJDERHA_KARO.r, EJDERHA_KARO.c, yukseklik(EJDERHA_KARO.r, EJDERHA_KARO.c));
    golgeCiz(a, eNokta.x, eNokta.y + 2, 26);

    /* Susler: ilk poziyon yuva, digerleri temanin listesinden.
       Ejderhanin onunde kalanlar ayri katmana gidiyor. */
    const sirali = POZISYONLAR
      .map((p, i) => ({ ...p, tur: i === 0 ? null : tema.susler[i - 1] }))
      .sort((a1, a2) => derinlik(a1.r, a1.c) - derinlik(a2.r, a2.c));

    for (const p of sirali) {
      const hedef = derinlik(p.r, p.c) > EJDERHA_DERINLIK ? o : a;
      const h = yukseklik(p.r, p.c);
      const { x, y } = ekrana(p.r, p.c, h);
      if (p.tur === null) {
        (YUVALAR[tema.yuva] || YUVALAR.orgu)(hedef, x, y);
      } else if (SUSLER[p.tur]) {
        SUSLER[p.tur](hedef, x, y, p.olcek ?? 1, tema);
      }
    }
  }

  function partikullerYarat() {
    const p = tema.partikul || { adet: 12, renk: '#fff' };
    partikuller = Array.from({ length: p.adet }, () => ({
      x: (Math.random() - 0.5) * icerikGenislik * 0.85,
      y: Math.random() * 120 - 40,
      hiz: 0.12 + Math.random() * 0.28,
      faz: Math.random() * Math.PI * 2,
      r: 1 + Math.random() * 1.8,
    }));
  }

  /* Her karede degisen kisim: su/lav parlamasi + partikuller */
  function ciz(zaman) {
    arka.setTransform(1, 0, 0, 1, 0, 0);
    arka.clearRect(0, 0, arkaCanvas.width, arkaCanvas.height);
    arka.drawImage(arkaPismis, 0, 0);

    kamera(arka);

    /* Su/lav karolarinin uzerinde kayan isik seridi */
    for (let r = 0; r < boyut; r++) {
      for (let c = 0; c < boyut; c++) {
        if (!suMu(r, c)) continue;
        const { x, y } = ekrana(r, c, 0);
        const dalga = Math.sin(zaman / 700 + (r + c) * 0.9);
        arka.save();
        karoYolu(arka, x, y);
        arka.clip();
        arka.fillStyle = tema.su.parlak;
        arka.globalAlpha = 0.28 + dalga * 0.16;
        arka.fillRect(x - TILE_W / 2, y - 6 + dalga * 4, TILE_W, 5);
        arka.restore();
      }
    }

    /* Partikuller: temaya gore toz / kor / kar / yildiz */
    const tur = tema.partikul?.tur || 'toz';
    const renk = tema.partikul?.renk || '#ffe9a8';
    for (const p of partikuller) {
      /* Kar asagi duser, digerleri yukari suzulur */
      p.y += tur === 'kar' ? p.hiz : -p.hiz;
      if (tur === 'kar' && p.y > 120) p.y = -60;
      if (tur !== 'kar' && p.y < -130) p.y = 100;

      const kayma = Math.sin(zaman / 900 + p.faz) * 8;
      arka.globalAlpha = tur === 'kar'
        ? 0.7
        : 0.25 + Math.sin(zaman / 500 + p.faz) * 0.25;
      arka.fillStyle = renk;

      if (tur === 'yildiz') {
        const r2 = p.r * 1.6;
        arka.beginPath();
        arka.moveTo(p.x + kayma, p.y - r2);
        arka.lineTo(p.x + kayma + r2 * 0.35, p.y - r2 * 0.35);
        arka.lineTo(p.x + kayma + r2, p.y);
        arka.lineTo(p.x + kayma + r2 * 0.35, p.y + r2 * 0.35);
        arka.lineTo(p.x + kayma, p.y + r2);
        arka.lineTo(p.x + kayma - r2 * 0.35, p.y + r2 * 0.35);
        arka.lineTo(p.x + kayma - r2, p.y);
        arka.lineTo(p.x + kayma - r2 * 0.35, p.y - r2 * 0.35);
        arka.closePath(); arka.fill();
      } else {
        arka.beginPath();
        arka.arc(p.x + kayma, p.y, p.r, 0, Math.PI * 2);
        arka.fill();
      }
    }
    arka.globalAlpha = 1;

    /* On katman statik */
    on.setTransform(1, 0, 0, 1, 0, 0);
    on.clearRect(0, 0, onCanvas.width, onCanvas.height);
    on.drawImage(onPismis, 0, 0);
  }

  function dongu(zaman) {
    if (!calisiyor) return;
    rafId = requestAnimationFrame(dongu);
    if (zaman - sonKare < KARE_MS) return;
    sonKare = zaman;
    ciz(zaman);
  }

  /* Ejderhanin ekrandaki yeri: DOM katmani buraya konumlanacak */
  function ejderhaNoktasi() {
    const orta = ekrana((boyut - 1) / 2, (boyut - 1) / 2);
    const nokta = ekrana(EJDERHA_KARO.r, EJDERHA_KARO.c, yukseklik(EJDERHA_KARO.r, EJDERHA_KARO.c));
    return {
      x: merkezX + (nokta.x - orta.x) * olcek,
      y: merkezY + (nokta.y - orta.y) * olcek,
      olcek,
    };
  }

  return {
    boyutlandir,
    ejderhaNoktasi,
    /* Ada degistirildiginde yeniden pisirilir - canvas'lar ayni kalir,
       yeniden olusturmak gerekmez (asset reload olmuyor). */
    temaDegistir(yeniId) {
      tema = adaTemasi(yeniId);
      if (genislik) { pisir(); partikullerYarat(); ciz(performance.now()); }
    },
    temaBilgisi: () => tema,
    /* Tek kareyi hemen cizer. Animasyon dongusu requestAnimationFrame'e
       bagli, o da sayfa gorunmez oldugunda durur; sabit bir goruntu uretmek
       isteyen (ornegin bot banner'i) buradan tek kare alabilir. */
    tekKare(zaman = 0) { ciz(zaman); },
    basla() {
      if (calisiyor) return;
      calisiyor = true;
      rafId = requestAnimationFrame(dongu);
    },
    dur() {
      calisiyor = false;
      cancelAnimationFrame(rafId);
    },
  };
}
