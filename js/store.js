/* Puan kaydetme sistemi.

   Saklanan veriler:
     hub_points        -> toplam hub puani (ileride token'a cevrilecek)
     best_<oyunAdi>    -> o oyundaki en yuksek skor
     state_<oyunAdi>   -> yarim kalan oyunun kayitli hali

   NEDEN "ONCE YEREL, BULUT SADECE YEDEK"?

   Onceki surumde okuma once Telegram CloudStorage'a gidiyordu. Ama bulut
   yazmasi gecikmeli: set() yerel kayda aninda yaziyor, buluta ise yazma
   birkac yuz milisaniye sonra ulasiyordu. Art arda besleme yapinca bir
   sonraki okuma buluttan ESKI (yuksek) bakiyeyi aliyor ve harcama o eski
   sayidan dusuluyordu - yani jetonlar gercekte eksilmiyordu. Ustelik get()
   o eski bulut degerini localStorage'in uzerine de geri yaziyordu.
   Olculdu: 2.232 jetonluk harcamanin sadece 724'u hesaba yansidi.

   Simdi yetkili kaynak bu cihazdaki kayit:
     - Bellekteki 'onbellek' ilk okumadan sonra dogrudan cevap verir
       (bulut gidip gelmesi yok, "1 saniye bekleme" hissi de kalkti).
     - Bulut sadece YEDEK: yerel kayit bossa (yeni telefon, temizlenmis
       tarayici) oradan geri yuklenir.
     - Buluta yazma geciktirilerek yapilir, boylece hizli oynarken her
       harekette bir bulut istegi gitmez; uygulama kapanirken bekleyenler
       hemen gonderilir.
*/

const tg = window.Telegram?.WebApp ?? null;
const cloud = tg?.CloudStorage ?? null;
const cloudReady = !!cloud && !!tg?.version && parseFloat(tg.version) >= 6.9;

const BULUT_BEKLEME = 600; /* ms - art arda yazmalari tek istekte toplar */

/* Bu oturumun yetkili degerleri. Bir kez doldurulunca okuma hep buradan. */
const onbellek = new Map();
const bekleyenYazmalar = new Map(); /* key -> zamanlayici */

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

const bos = (v) => v === null || v === undefined || v === '';

function get(key) {
  if (onbellek.has(key)) return Promise.resolve(onbellek.get(key));

  const yerel = localGet(key);

  /* Bu cihazda kayit varsa yetkili odur - buluta hic sormuyoruz */
  if (!bos(yerel) || !cloudReady) {
    onbellek.set(key, yerel);
    return Promise.resolve(yerel);
  }

  /* Yerel bosken bulut yedegi geri yuklenir (yeni cihaz / temiz tarayici) */
  return new Promise((resolve) => {
    cloud.getItem(key, (err, value) => {
      const sonuc = err || bos(value) ? yerel : value;
      if (!bos(sonuc)) localSet(key, sonuc);
      onbellek.set(key, sonuc);
      resolve(sonuc);
    });
  });
}

function set(key, value) {
  const str = String(value);
  onbellek.set(key, str);
  localSet(key, str);
  bulutaYaz(key);
}

function bulutaYaz(key) {
  if (!cloudReady) return;
  clearTimeout(bekleyenYazmalar.get(key));
  bekleyenYazmalar.set(key, setTimeout(() => {
    bekleyenYazmalar.delete(key);
    cloud.setItem(key, onbellek.get(key) ?? '', () => {});
  }, BULUT_BEKLEME));
}

/* Uygulama kapanirken/arka plana gecerken bekleyenleri hemen gonder,
   yoksa son birkac saniyelik ilerleme buluta hic ulasmaz. */
function bulutuBosalt() {
  if (!cloudReady || !bekleyenYazmalar.size) return;
  for (const [key, zamanlayici] of bekleyenYazmalar) {
    clearTimeout(zamanlayici);
    cloud.setItem(key, onbellek.get(key) ?? '', () => {});
  }
  bekleyenYazmalar.clear();
}

window.addEventListener('pagehide', bulutuBosalt);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) bulutuBosalt();
});

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
