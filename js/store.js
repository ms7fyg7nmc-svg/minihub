/* Puan kaydetme sistemi.
   Once Telegram CloudStorage'a yazar (telefon degistirsen bile kalir),
   ayni anda tarayici hafizasina da yazar (aninda okumak ve tarayicida test icin).

   Saklanan veriler:
     hub_points        -> toplam hub puani (ileride token'a cevrilecek)
     best_<oyunAdi>    -> o oyundaki en yuksek skor
     state_<oyunAdi>   -> yarim kalan oyunun kayitli hali
*/

const tg = window.Telegram?.WebApp ?? null;
const cloud = tg?.CloudStorage ?? null;
const cloudReady = !!cloud && !!tg?.version && parseFloat(tg.version) >= 6.9;

/* --- Dusuk seviye okuma/yazma --- */

function localGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* gizli sekmede localStorage kapali olabilir, sorun degil */
  }
}

function get(key) {
  return new Promise((resolve) => {
    const fallback = localGet(key);
    if (!cloudReady) return resolve(fallback);
    cloud.getItem(key, (err, value) => {
      if (err || value === null || value === undefined || value === '') {
        return resolve(fallback);
      }
      localSet(key, value); /* bulutu yerel kopyaya yansit */
      resolve(value);
    });
  });
}

function set(key, value) {
  const str = String(value);
  localSet(key, str);
  if (cloudReady) cloud.setItem(key, str, () => {});
}

/* --- Uygulamanin kullandigi fonksiyonlar --- */

export async function getPoints() {
  return Number(await get('hub_points')) || 0;
}

/* Puan ekleme "oku, topla, yaz" seklinde calistigi icin iki ekleme ust uste
gelirse biri digerini silebilir. Eklemeleri sirayla calistirarak bunu onluyoruz. */
let pointsQueue = Promise.resolve(0);

/** Hub puanina ekleme yapar, yeni toplami dondurur. */
export function addPoints(amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  pointsQueue = pointsQueue
    .catch(() => 0) /* onceki ekleme patlasa bile sira devam etsin */
    .then(async () => {
      const total = (await getPoints()) + n;
      set('hub_points', total);
      return total;
    });
  return pointsQueue;
}

/** Hub puanindan harcama yapar.
    { ok, total } dondurur - bakiye yetmiyorsa ok:false ve hicbir sey degismez.

    Eklemelerle AYNI siraya bagli calisir: yoksa "oku, cikar, yaz" arasina bir
    kazanc girip bakiyeyi bozabilirdi. */
export function spendPoints(amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));

  const sonuc = pointsQueue
    .catch(() => 0)
    .then(async () => {
      const total = await getPoints();
      if (total < n) return { ok: false, total };
      const kalan = total - n;
      set('hub_points', kalan);
      return { ok: true, total: kalan };
    });

  /* Siradaki islem guncel bakiyeyi gorsun */
  pointsQueue = sonuc.then((r) => r.total).catch(() => 0);
  return sonuc;
}

export async function getBest(game) {
  return Number(await get(`best_${game}`)) || 0;
}

/** Skor rekoru kirildiysa kaydeder. { best, isRecord } dondurur. */
export async function submitScore(game, score) {
  const best = await getBest(game);
  if (score > best) {
    set(`best_${game}`, score);
    return { best: score, isRecord: true };
  }
  return { best, isRecord: false };
}

/* --- Yarim kalan oyunu saklama --- */

export async function loadState(game) {
  const raw = await get(`state_${game}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(game, state) {
  set(`state_${game}`, JSON.stringify(state));
}

export function clearState(game) {
  set(`state_${game}`, '');
}
