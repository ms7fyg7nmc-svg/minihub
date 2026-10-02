/* COIN DROP SESLERI

   Sentezlenmis sesler yerine Dragon Island icin uretilmis gercek
   ornekler kullaniliyor (assets/ses). Dosyalar KESILMEDI: her ses
   calarken kisa kesiliyor ve sonu yumusatiliyor, cunku bu oyunda sesler
   cok sik ve ust uste geliyor - tam boy calan bir "sandik" sesi
   zincirleme birlesmede duvara donuyor.

   Kesme suresi oynanisa gore secildi:
     birak    0.11  parmak kalkinca kisa bir tik
     birles   0.16  en sik duyulan ses, neredeyse bilincalti
     buyuk    0.40  ust kademe birlesmesi, odul hissi
     kazanma  0.65  oyunun en yuksek sesi
     bitis    0.30  kasa doldu

   Sessizlik bayragi js/audio.js ile AYNI anahtari kullaniyor, boylece
   oyundaki mevcut ses dugmesi hic degismeden calismaya devam ediyor. */

const SESSIZ_ANAHTAR = 'mh_sound_muted';
const KLASOR = '../../assets/ses';

/* kaynak dosya, ses seviyesi, kesme suresi (sn) */
const SESLER = {
  birak:   { dosya: 'tap',     ses: 0.26, sure: 0.11 },
  birles:  { dosya: 'merge',   ses: 0.30, sure: 0.16 },
  buyuk:   { dosya: 'chest',   ses: 0.50, sure: 0.40 },
  kazanma: { dosya: 'jackpot', ses: 0.62, sure: 0.65 },
  bitis:   { dosya: 'deny',    ses: 0.34, sure: 0.30 },
};

let ctx = null;
let ana = null;
const tamponlar = new Map();
const sonCalma = new Map();

function sessizMi() {
  try { return localStorage.getItem(SESSIZ_ANAHTAR) === '1'; } catch { return false; }
}

function kur() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    ana = ctx.createGain();
    ana.gain.value = 1;
    ana.connect(ctx.destination);
  } catch { return null; }
  return ctx;
}

/* Telegram WebView ve iOS, gercek bir dokunus olmadan kurulan baglami
   askida baslatiyor ve sonradan acmiyor (bkz. js/audio.js'teki ayni not).
   Ilk dokunusta kurup aciyoruz, ayni anda ornekleri de indiriyoruz. */
function kilidiAc() {
  const c = kur();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  onYukle();
}

for (const olay of ['pointerdown', 'touchstart', 'click', 'keydown']) {
  window.addEventListener(olay, kilidiAc, { once: true, capture: true, passive: true });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
});

let yukleniyor = false;
async function onYukle() {
  if (yukleniyor || !ctx) return;
  yukleniyor = true;
  const adlar = [...new Set(Object.values(SESLER).map((s) => s.dosya))];
  await Promise.all(adlar.map(async (ad) => {
    if (tamponlar.has(ad)) return;
    try {
      const cevap = await fetch(`${KLASOR}/${ad}.m4a`);
      if (!cevap.ok) return;                    /* dosya yoksa sessizce gec */
      tamponlar.set(ad, await ctx.decodeAudioData(await cevap.arrayBuffer()));
    } catch { /* bozuk ya da desteklenmeyen dosya: ses olmasin, oyun dursun */ }
  }));
}

/* perde: 1 = normal. Birlesme sesi kademe yukseldikce tizlesiyor. */
function cal(ad, perde = 1) {
  if (sessizMi()) return;
  const tanim = SESLER[ad];
  if (!tanim) return;
  const c = kur();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const tampon = tamponlar.get(tanim.dosya);
  if (!tampon) { onYukle(); return; }          /* henuz inmedi: bu sefer sessiz */

  /* Zincirleme birlesmede ayni ses milisaniyeler icinde defalarca
     tetikleniyor; cok yakin tekrarlari atiyoruz. */
  const simdi = c.currentTime;
  if (simdi - (sonCalma.get(ad) || -1) < 0.045) return;
  sonCalma.set(ad, simdi);

  const kaynak = c.createBufferSource();
  kaynak.buffer = tampon;
  kaynak.playbackRate.value = Math.max(0.5, Math.min(2.2, perde));

  const g = c.createGain();
  /* Kesme noktasinda "tak" duyulmasin diye son 35 ms'de kapaniyor. */
  const sure = Math.min(tanim.sure, tampon.duration / kaynak.playbackRate.value);
  const sonus = Math.min(0.035, sure * 0.4);
  g.gain.setValueAtTime(tanim.ses, simdi);
  g.gain.setValueAtTime(tanim.ses, simdi + sure - sonus);
  g.gain.linearRampToValueAtTime(0.0001, simdi + sure);

  kaynak.connect(g).connect(ana);
  kaynak.start(simdi);
  kaynak.stop(simdi + sure + 0.01);
}

/* coindrop.js'in cagirdigi adlar. Imza js/audio.js'teki SFX ile ayni
   kaliyor ki oyun kodunda tek satir degismesin. */
export const SFX = {
  coinDrop: () => cal('birak'),
  coin: (perde = 1) => cal('birles', perde),
  coinBig: () => cal('buyuk'),
  goldenPickup: () => cal('kazanma'),
  gameOver: () => cal('bitis'),
};
