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

/** Hub puanina ekleme yapar, yeni toplami dondurur. */
export async function addPoints(amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  const total = (await getPoints()) + n;
  set('hub_points', total);
  return total;
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
