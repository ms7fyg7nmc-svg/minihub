/* Dragon Island - 2.5D IZOMETRIK ADA

   NEDEN CANVAS, NEDEN PHASER DEGIL?

   Phaser ~1 MB. Bu projenin tamami 8 bin satir ve tek dis bagimliligi
   telegram-web-app.js. Telegram Mini App'te hizli acilis her seyden onemli,
   o yuzden ada duz Canvas 2D ile ciziliyor: izometrik projeksiyon, derinlik
   siralamasi, golge ve partikul birkac yuz satir tutuyor ve sifir bagimlilik
   ekliyor.

   IKI KATMAN, GERCEK DERINLIK

   Ejderha bir DOM SVG'si (CSS animasyonlari ve keskin cizgiler icin).
   Ada ise iki canvas'a boluyor:

     arka canvas  -> ejderhanin ARKASINDA kalan her sey
     [ejderha]
     on canvas    -> ejderhanin ONUNDE duran nesneler

   Boylece on taraftaki agac gercekten ejderhanin onunden geciyor; sahne duz
   bir arka plan gibi durmuyor.

   PERFORMANS

   Ada ve nesneler DEGISMIYOR, o yuzden bir kez "pisirilip" (bake) hazir
   goruntu olarak saklaniyor. Her karede sadece su parlamalari ve partikuller
   yeniden ciziliyor. Sekme arka plana alininca dongu tamamen duruyor. */

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

const RENK = {
  /* Tonlar birbirine yakin tutuldu: fark buyuk olunca cim damali bir masa
     ortusu gibi goruyor, hafif olunca dokulu duruyor. */
  cim:      '#4f9e5a',
  cimAcik:  '#579f60',
  cimKoyu:  '#478f53',
  toprakSol:'#6b4a32',
  toprakSag:'#523827',
  kaya:     '#39323f',
  kayaAcik: '#4a4152',
  su:       '#3f9fd0',
  suAcik:   '#6fc4ec',
  golge:    'rgba(0,0,0,.28)',
};

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
   UST  = en arkadaki agacin tepesi (plato yuksekligi dahil)
   ALT  = adanin altindaki kaya koninin ucu
   Kadrajlama bu ikisinin ortasina gore yapiliyor. */
const ICERIK_UST = -118;
const ICERIK_ALT = 190;

/* --- Sahnedeki nesneler ---
   tur: agac | kaya | yuva | cicek | kutuk */
const NESNELER = [
  { tur: 'yuva',   r: 2, c: 7 },
  { tur: 'agac',   r: 1, c: 3, olcek: 1.0 },
  { tur: 'agac',   r: 0, c: 5, olcek: 0.82 },
  { tur: 'kaya',   r: 1, c: 6, olcek: 0.9 },
  { tur: 'agac',   r: 3, c: 1, olcek: 0.9 },
  { tur: 'kutuk',  r: 5, c: 2 },
  { tur: 'cicek',  r: 5, c: 6 },
  { tur: 'cicek',  r: 6, c: 3 },
  { tur: 'kaya',   r: 6, c: 7, olcek: 0.75 },
  /* Bunlar ejderhanin onunde kalir */
  { tur: 'agac',   r: 7, c: 5, olcek: 1.05 },
  { tur: 'kaya',   r: 7, c: 2, olcek: 1.0 },
  { tur: 'cicek',  r: 8, c: 4 },
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

function karoCiz(ctx, r, c) {
  const h = yukseklik(r, c);
  const { x, y } = ekrana(r, c, h);
  const su = suMu(r, c);

  /* Yan yuzler: arkadan one dogru cizdigimiz icin sadece gorunenler kalir.
     Plato karolarinin yani daha derin, boylece basamak hissi olusur. */
  const derinlikPx = SIDE + h * SIDE;
  ctx.fillStyle = RENK.toprakSol;
  ctx.beginPath();
  ctx.moveTo(x - TILE_W / 2, y);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x, y + TILE_H / 2 + derinlikPx);
  ctx.lineTo(x - TILE_W / 2, y + derinlikPx);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = RENK.toprakSag;
  ctx.beginPath();
  ctx.moveTo(x + TILE_W / 2, y);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x, y + TILE_H / 2 + derinlikPx);
  ctx.lineTo(x + TILE_W / 2, y + derinlikPx);
  ctx.closePath();
  ctx.fill();

  /* Ust yuz */
  karoYolu(ctx, x, y);
  if (su) {
    ctx.fillStyle = RENK.su;
  } else {
    /* Sabit bir dalgalanma: her karo hafif farkli tonda, ama hep ayni */
    const ton = (r * 7 + c * 13) % 3;
    ctx.fillStyle = ton === 0 ? RENK.cimAcik : ton === 1 ? RENK.cim : RENK.cimKoyu;
  }
  ctx.fill();
}

/* Adanin altindaki kaya kutlesi: yuzen ada hissi buradan geliyor.

   Kaya adanin EN GENIS noktasindan degil, alt kenarinin biraz icinden
   basliyor. Yoksa sol ve sag ucdan asagi inen iki duz kenar cikiyor ve ada
   kok yerine dev bir "V" takmis gibi gorunuyor. Ust kismi zaten karolarin
   arkasinda kaldigi icin sadece alttaki kismi gorunur. */
function altKayaCiz(ctx) {
  const alt = ekrana(boyut - 1, boyut - 1);
  const yariGenislik = ((boyut - 1) * TILE_W) / 2;
  const solX = alt.x - yariGenislik * 0.58;
  const sagX = alt.x + yariGenislik * 0.58;
  const ustY = alt.y - 46;              /* karolarin arkasinda kalir */
  const ucY = alt.y + 96;

  const grad = ctx.createLinearGradient(0, ustY, 0, ucY);
  grad.addColorStop(0, RENK.kayaAcik);
  grad.addColorStop(0.55, RENK.kaya);
  grad.addColorStop(1, '#1d1926');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(solX, ustY);
  /* Kontrol noktalari ICE dogru cekiyor: koni asagi indikce daraliyor */
  ctx.bezierCurveTo(solX + 10, alt.y + 34, alt.x - 26, ucY - 26, alt.x - 5, ucY);
  ctx.lineTo(alt.x + 5, ucY);
  ctx.bezierCurveTo(alt.x + 26, ucY - 26, sagX - 10, alt.y + 34, sagX, ustY);
  ctx.closePath();
  ctx.fill();

  /* Sarkan kucuk kaya parcalari - koninin icinde kalacak sekilde */
  ctx.fillStyle = '#2b2534';
  for (const [dx, dy, w, hh] of [[-34, 24, 13, 26], [30, 30, 11, 21], [-10, 62, 9, 18]]) {
    ctx.beginPath();
    ctx.moveTo(alt.x + dx - w / 2, alt.y + dy);
    ctx.lineTo(alt.x + dx + w / 2, alt.y + dy);
    ctx.lineTo(alt.x + dx, alt.y + dy + hh);
    ctx.closePath();
    ctx.fill();
  }
}

function golgeCiz(ctx, x, y, rx) {
  ctx.fillStyle = RENK.golge;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

function nesneCiz(ctx, n) {
  const h = yukseklik(n.r, n.c);
  const { x, y } = ekrana(n.r, n.c, h);
  const s = n.olcek ?? 1;

  if (n.tur === 'agac') {
    golgeCiz(ctx, x, y + 3, 15 * s);
    /* Govde */
    ctx.fillStyle = '#5b3f2b';
    ctx.fillRect(x - 3 * s, y - 26 * s, 6 * s, 26 * s);
    /* Uc katli yaprak konisi */
    const kat = (dy, w, renk) => {
      ctx.fillStyle = renk;
      ctx.beginPath();
      ctx.moveTo(x, y - (dy + 26) * s);
      ctx.lineTo(x + w * s, y - dy * s);
      ctx.lineTo(x - w * s, y - dy * s);
      ctx.closePath();
      ctx.fill();
    };
    kat(18, 20, '#2f7a45');
    kat(30, 17, '#3a9153');
    kat(42, 13, '#48a862');

  } else if (n.tur === 'kaya') {
    golgeCiz(ctx, x, y + 2, 13 * s);
    ctx.fillStyle = RENK.kayaAcik;
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y);
    ctx.lineTo(x - 8 * s, y - 15 * s);
    ctx.lineTo(x + 4 * s, y - 18 * s);
    ctx.lineTo(x + 14 * s, y - 4 * s);
    ctx.lineTo(x + 8 * s, y + 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = RENK.kaya;
    ctx.beginPath();
    ctx.moveTo(x + 4 * s, y - 18 * s);
    ctx.lineTo(x + 14 * s, y - 4 * s);
    ctx.lineTo(x + 8 * s, y + 4 * s);
    ctx.closePath();
    ctx.fill();

  } else if (n.tur === 'yuva') {
    golgeCiz(ctx, x, y + 3, 22);
    /* Orgu yuva */
    ctx.fillStyle = '#6b4a2a';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#815a34';
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 24, 12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#3b2a18';
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    /* Dallar */
    ctx.strokeStyle = '#5a3d22';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 9, y - 2);
      ctx.lineTo(x + i * 9 + 4, y - 12);
      ctx.stroke();
    }

  } else if (n.tur === 'kutuk') {
    golgeCiz(ctx, x, y + 2, 11);
    ctx.fillStyle = '#5b3f2b';
    ctx.fillRect(x - 8, y - 14, 16, 14);
    ctx.fillStyle = '#7d5838';
    ctx.beginPath();
    ctx.ellipse(x, y - 14, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

  } else if (n.tur === 'cicek') {
    ctx.fillStyle = '#2f7a45';
    ctx.fillRect(x - 1, y - 9, 2, 9);
    for (const [dx, dy, renk] of [[-4, -12, '#f5b942'], [3, -14, '#e2679c'], [0, -8, '#fff3d0']]) {
      ctx.fillStyle = renk;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* --- Ada motoru --- */

export function createIsland(arkaCanvas, onCanvas) {
  const arka = arkaCanvas.getContext('2d');
  const on = onCanvas.getContext('2d');

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

  /* Ada icerik kutusunun genisligi: kadrajlamak icin */
  const icerikGenislik = boyut * TILE_W;

  function boyutlandir() {
    const kutu = arkaCanvas.getBoundingClientRect();
    if (!kutu.width) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2); /* 2'nin ustu bosuna yuk */
    genislik = kutu.width;
    yukseklikPx = kutu.height;

    for (const c of [arkaCanvas, onCanvas, arkaPismis, onPismis]) {
      c.width = Math.round(genislik * dpr);
      c.height = Math.round(yukseklikPx * dpr);
    }

    /* Ada ekrana sigsin: genislige gore olcekle */
    olcek = Math.min(1, (genislik - 16) / icerikGenislik);
    merkezX = genislik / 2;

    /* Dikey kadrajlama sabit bir oranla degil, sahnenin GERCEK sinirlarina
       gore yapiliyor. Sabit oranda ada yukarida kaliyor, altta bos bir serit
       birakiyordu; boyle hesaplayinca agac tepelerinden kaya ucuna kadar olan
       butun icerik kutunun ortasina oturuyor. */
    merkezY = yukseklikPx / 2 - ((ICERIK_UST + ICERIK_ALT) / 2) * olcek;

    pisir();
    partikullerYarat();
    return true;
  }

  function kamera(ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(merkezX, merkezY);
    ctx.scale(olcek, olcek);
    /* Izgarayi kendi merkezine gore ortala */
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

    kamera(a);
    kamera(o);

    altKayaCiz(a);

    /* Karolar arkadan one: ressam algoritmasi */
    for (let toplam = 0; toplam <= (boyut - 1) * 2; toplam++) {
      for (let r = 0; r < boyut; r++) {
        const c = toplam - r;
        if (c < 0 || c >= boyut || !kara(r, c)) continue;
        karoCiz(a, r, c);
      }
    }

    /* Ejderhanin zemin golgesi: havada duruyormus gibi gorunmesin */
    const eNokta = ekrana(EJDERHA_KARO.r, EJDERHA_KARO.c, yukseklik(EJDERHA_KARO.r, EJDERHA_KARO.c));
    golgeCiz(a, eNokta.x, eNokta.y + 2, 26);

    /* Nesneler: ejderhanin onunde kalanlar ayri katmana */
    const sirali = [...NESNELER].sort((n1, n2) => derinlik(n1.r, n1.c) - derinlik(n2.r, n2.c));
    for (const n of sirali) {
      const hedef = derinlik(n.r, n.c) > EJDERHA_DERINLIK ? o : a;
      nesneCiz(hedef, n);
    }
  }

  function partikullerYarat() {
    /* Adanin uzerinde suzulen isik zerrecikleri */
    partikuller = Array.from({ length: 14 }, () => ({
      x: (Math.random() - 0.5) * icerikGenislik * 0.8,
      y: Math.random() * 90 - 30,
      hiz: 0.12 + Math.random() * 0.25,
      faz: Math.random() * Math.PI * 2,
      r: 1 + Math.random() * 1.6,
    }));
  }

  /* Her karede degisen kisim: su parlamasi + partikuller */
  function ciz(zaman) {
    arka.setTransform(1, 0, 0, 1, 0, 0);
    arka.clearRect(0, 0, arkaCanvas.width, arkaCanvas.height);
    arka.drawImage(arkaPismis, 0, 0);

    kamera(arka);

    /* Su parlamasi: gol karolarinin uzerinde kayan isik seridi */
    for (let r = 0; r < boyut; r++) {
      for (let c = 0; c < boyut; c++) {
        if (!suMu(r, c)) continue;
        const { x, y } = ekrana(r, c, 0);
        const dalga = Math.sin(zaman / 700 + (r + c) * 0.9);
        arka.save();
        karoYolu(arka, x, y);
        arka.clip();
        arka.fillStyle = RENK.suAcik;
        arka.globalAlpha = 0.28 + dalga * 0.16;
        arka.fillRect(x - TILE_W / 2, y - 6 + dalga * 4, TILE_W, 5);
        arka.restore();
      }
    }

    /* Zerrecikler */
    for (const p of partikuller) {
      p.y -= p.hiz;
      if (p.y < -120) p.y = 90;
      const kayma = Math.sin(zaman / 900 + p.faz) * 8;
      arka.globalAlpha = 0.25 + Math.sin(zaman / 500 + p.faz) * 0.25;
      arka.fillStyle = '#ffe9a8';
      arka.beginPath();
      arka.arc(p.x + kayma, p.y, p.r, 0, Math.PI * 2);
      arka.fill();
    }
    arka.globalAlpha = 1;

    /* On katman statik - sadece bir kez basmak yeterli */
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
