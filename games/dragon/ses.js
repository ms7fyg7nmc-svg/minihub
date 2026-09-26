/* SES KATMANI

   Uc sey cozuluyor:

   1. Kilit: iOS ve Telegram'in WebView'i, sesin ancak gercek bir kullanici
      dokunusundan sonra calmasina izin veriyor. Ilk dokunusta AudioContext
      uyandiriliyor ve dosyalar o an cozuluyor.

   2. Eksik dosya: henuz uretilmemis sesler sessizce yok sayiliyor, oyun
      hata vermiyor. Dosya sonra eklenince kendiliginden calismaya basliyor.

   3. Ust uste binme: ayni ses pes pese tetiklenirse (hizli birlestirme)
      her biri kendi kaynagindan caliyor, birbirini kesmiyor; ama cok kisa
      araliklarla gelen ayni ses bir kez caliyor ki kulak tirmalamasin. */

const KLASOR = '../../assets/ses';

/* Tum oyunun ses seviyesi. Tek yerden kisilip acilabilsin diye ayri
   duruyor; burayi degistirmek sesler arasi dengeyi bozmaz. */
const ANA_SEVIYE = 0.5;

/* Her sesin kendi seviyesi. Hedef, sik calanlarin fark edilmeden
   arkada kalmasi, nadir olanlarin one cikmasi:

     tik   -28 dBFS   surekli duyuluyor, neredeyse bilinc altinda kalmali
     merge -20 dBFS   sik ama his vermesi gerekiyor
     crack -14 dBFS   odul ani
     jackpot -8 dBFS  oyunun en yuksek sesi

   Eskiden levelup ve jackpot 0 dBFS'te, yani cikabilecegi en yuksek
   seviyede caliyordu; hepsi asagi cekildi. */
const SESLER = {
  tap:     { ses: 0.18, aralik: 40 },
  merge:   { ses: 0.27, aralik: 60 },
  crack:   { ses: 0.44, aralik: 80 },
  collect: { ses: 0.36, aralik: 60 },
  feed:    { ses: 0.40, aralik: 120 },
  chest:   { ses: 0.56, aralik: 120 },
  levelup: { ses: 0.63, aralik: 200 },
  claim:   { ses: 0.40, aralik: 120 },
  unlock:  { ses: 0.44, aralik: 120 },
  jackpot: { ses: 0.80, aralik: 300 },
  egglay:  { ses: 0.21, aralik: 100 },
  deny:    { ses: 0.32, aralik: 200 },
};

const ANAHTAR = 'dragon_ses';

let ctx = null;
let anaKazanc = null;
const tamponlar = new Map();      /* ad -> AudioBuffer (yoksa yok) */
const sonCalma = new Map();       /* ad -> zaman damgasi */
let acik = true;
let hazirlandi = false;

export function sesAcikMi() { return acik; }

export function sesiAyarla(yeni) {
  acik = !!yeni;
  try { localStorage.setItem(ANAHTAR, acik ? '1' : '0'); } catch { /* gizli sekme */ }
  if (anaKazanc) anaKazanc.gain.value = acik ? ANA_SEVIYE : 0;
  return acik;
}

async function dosyaYukle(ad) {
  try {
    const cevap = await fetch(`${KLASOR}/${ad}.m4a`);
    if (!cevap.ok) return;                       /* henuz uretilmemis */
    const ham = await cevap.arrayBuffer();
    tamponlar.set(ad, await ctx.decodeAudioData(ham));
  } catch { /* dosya yok ya da cozulemedi: o ses sessiz kalir */ }
}

/* Ilk kullanici dokunusunda cagriliyor. */
async function uyandir() {
  if (hazirlandi) return;
  hazirlandi = true;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  ctx = new Ctx();

  anaKazanc = ctx.createGain();
  anaKazanc.gain.value = acik ? ANA_SEVIYE : 0;
  anaKazanc.connect(ctx.destination);

  /* Safari bazen askida basliyor. */
  if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* yok say */ } }

  await Promise.all(Object.keys(SESLER).map(dosyaYukle));
}

export function sesBaslat() {
  try { acik = localStorage.getItem(ANAHTAR) !== '0'; } catch { acik = true; }

  const tetik = () => { uyandir(); };
  /* pointerdown en erken gercek dokunus; bir kez calisip kendini siliyor. */
  window.addEventListener('pointerdown', tetik, { once: true, capture: true });
  window.addEventListener('keydown', tetik, { once: true, capture: true });
  return acik;
}

export function cal(ad) {
  if (!acik || !ctx || ctx.state !== 'running') return;

  const ayar = SESLER[ad];
  const tampon = tamponlar.get(ad);
  if (!ayar || !tampon) return;

  /* Ayni ses cok kisa araliklarla ust uste gelmesin. */
  const simdi = performance.now();
  if (simdi - (sonCalma.get(ad) || 0) < ayar.aralik) return;
  sonCalma.set(ad, simdi);

  const kaynak = ctx.createBufferSource();
  kaynak.buffer = tampon;
  /* Ufak perde oynamasi: ayni ses pes pese calinca tekdüze durmasin. */
  kaynak.playbackRate.value = 0.97 + Math.random() * 0.06;

  const kazanc = ctx.createGain();
  kazanc.gain.value = ayar.ses;

  kaynak.connect(kazanc).connect(anaKazanc);
  kaynak.start();
}
