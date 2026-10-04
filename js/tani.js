/* TANI KAYDI

   Dondugunu soyleyen oyuncu telefonda; biz masaustunde bakıyoruz ve
   hatayi uretemiyoruz. Bu dosya aradaki boslugu kapatiyor: telefonda
   ne oldugunu yaziyor, oyuncu Ayarlar'dan okuyup bize soyleyebiliyor.

   Kucuk ve sessiz: halka tampon, en fazla 40 satir, tek bir
   localStorage anahtari. Hicbir sey sunucuya gitmiyor. */

const ANAHTAR = 'mh_tani';
const SINIR = 40;

function oku() {
  try { return JSON.parse(localStorage.getItem(ANAHTAR)) || []; } catch { return []; }
}

function yaz(liste) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(liste.slice(-SINIR))); } catch { /* dolu disk */ }
}

/* Saat degil, uygulama acildiktan sonraki saniye: oyuncunun saati
   yanlissa bile siralama dogru kalir ve iki olay arasi mesafe okunur. */
const baslangic = Date.now();
const an = () => ((Date.now() - baslangic) / 1000).toFixed(1);

export function iz(olay, ayrinti) {
  const liste = oku();
  liste.push(`${an()} ${olay}${ayrinti != null ? ' ' + ayrinti : ''}`);
  yaz(liste);
}

export function taniListesi() { return oku(); }
export function taniTemizle() { yaz([]); }

/* Kayitta hata satiri var mi. Hub acilista buna bakip Ayarlar dugmesine
   bir nokta koyuyor - oyuncunun "donunca su adimlari izle" diye bir sey
   hatirlamasi gerekmesin diye. */
export function taniHataVar() {
  return oku().some((satir) => / HATA | RED |kayit\.reddedildi/.test(` ${satir} `));
}

/* Yakalanmamis her hata ve reddedilen her soz buraya dusuyor. Asil
   aradigimiz bu: bir yerde sessizce patlayan bir sey varsa gorunur
   olacak. */
export function taniBaslat(etiket) {
  iz('ac', etiket);

  window.addEventListener('error', (e) => {
    const yer = `${String(e.filename || '').split('/').pop()}:${e.lineno}`;
    iz('HATA', `${e.message} @${yer}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const m = e.reason && (e.reason.message || e.reason);
    iz('RED', String(m).slice(0, 120));
  });

  document.addEventListener('visibilitychange', () => {
    iz(document.hidden ? 'gizlendi' : 'gorundu');
  });
}
