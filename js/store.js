/* Puan ve ilerleme kaydetme sistemi.

   IKI KATMAN VAR: SUNUCU (yetkili) VE YEREL (yedek/dusme yolu)

   Telegram icinde acilmissa, bu dosya jeton bakiyesini ve ilerlemeyi artik
   SUNUCUDA (Cloudflare Worker + D1) tutuyor - bot/worker.js'teki /api/*
   uclarini cagirarak. Neden: bakiye sadece bu cihazda tutulursa tarayici
   konsolundan degistirilebiliyordu (`localStorage.hub_points = '999999'`
   yazmak yetiyordu). Sunucu, her istegi Telegram'in imzaladigi initData ile
   dogruladigi icin kullanici kendi bakiyesini soyleyemiyor.

   Asagidaki durumlarda YEREL moda (bu dosyanin eskiden beri yaptigi sey)
   sessizce dusulur - oyun hicbir zaman kirilmaz:
     - Telegram disinda aciliyorsa (misafir - zaten "puanlar bu cihazda
       kalir" uyarisi gosteriliyor, davranis hic degismedi)
     - Sunucuya hic ulasilamazsa (kurulum tamamlanmamis, ag sorunu) - ilk
       senkron denemesi basarisiz olunca o oturum boyunca yerel moda gecilir

   Disa acilan fonksiyonlarin ISIMLERI VE IMZALARI DEGISMEDI - bu dosyayi
   kullanan 12 dosyanin (oyunlar + ejderha) hicbiri degismek zorunda kalmadi.

   YEREL MODUN KENDI GECMISI (hala gecerli - asagidaki kod aynen duruyor):
   Once okuma her zaman once Telegram CloudStorage'a gidiyordu. Ama bulut
   yazmasi gecikmeli oldugu icin art arda islemlerde eski deger okunuyor ve
   harcamalar gercekte dusmuyordu (olculdu: 2.232 jetonun sadece 724'u
   yansidi). Simdi bu cihazdaki kayit yetkili, bulut sadece yedek.
*/

import { isTelegramUser, getInitData } from './tg.js?v33';

/* Worker'in gercek adresiyle degistir: Cloudflare Worker sayfasinin en
   ustunde yazan adres - KURULUM-BOT.md'nin C adiminda not ettigin adresin
   AYNISI (https://minihub-bot.XXXXX.workers.dev seklinde). Degistirmeden
   birakirsan sunucuya baglanma denemesi basarisiz olur ve oyun otomatik
   olarak yerel moda duser - hicbir sey kirilmaz, sadece bakiyeler bu
   cihazdan cihaza tasinmaz. */
const API_BASE = 'https://minihub-bot.volkanturedi1.workers.dev';

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ==========================================================================
   YEREL MOD - Telegram disinda ya da sunucuya hic ulasilamazken kullanilir.
   Bu bolum, sunucu eklenmeden onceki davranisin AYNISI.
   ========================================================================== */

const tg = window.Telegram?.WebApp ?? null;
const cloud = tg?.CloudStorage ?? null;
const cloudReady = !!cloud && !!tg?.version && parseFloat(tg.version) >= 6.9;

const BULUT_BEKLEME = 600; /* ms - art arda yazmalari tek istekte toplar */

const onbellek = new Map();
const bekleyenYazmalar = new Map(); /* key -> zamanlayici */

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

  if (!bos(yerel) || !cloudReady) {
    onbellek.set(key, yerel);
    return Promise.resolve(yerel);
  }

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

async function getPointsYerel() {
  return Number(await get('hub_points')) || 0;
}

let pointsQueue = Promise.resolve(0);

function addPointsYerel(n) {
  pointsQueue = pointsQueue
    .catch(() => 0)
    .then(async () => {
      const total = (await getPointsYerel()) + n;
      set('hub_points', total);
      return total;
    });
  return pointsQueue;
}

function spendPointsYerel(n) {
  const sonuc = pointsQueue
    .catch(() => 0)
    .then(async () => {
      const total = await getPointsYerel();
      if (total < n) return { ok: false, total };
      const kalan = total - n;
      set('hub_points', kalan);
      return { ok: true, total: kalan };
    });

  pointsQueue = sonuc.then((r) => r.total).catch(() => 0);
  return sonuc;
}

async function getBestYerel(game) {
  return Number(await get(`best_${game}`)) || 0;
}

async function submitScoreYerel(game, score) {
  const best = await getBestYerel(game);
  if (score > best) {
    set(`best_${game}`, score);
    return { best: score, isRecord: true };
  }
  return { best, isRecord: false };
}

async function loadStateYerel(game) {
  const raw = await get(`state_${game}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStateYerel(game, state) {
  set(`state_${game}`, JSON.stringify(state));
}

function clearStateYerel(game) {
  set(`state_${game}`, '');
}

/* ==========================================================================
   SUNUCU MODU
   ========================================================================== */

let sunucuAktif = isTelegramUser();

/* localStorage'da biriken best_ ve state_ degerlerini tarar - ilk senkronda
   sunucuya tasinacak "gecmis ilerleme" budur. Sadece bir kez, ilk senkron
   isteginde kullanilir. */
function yerelAnlikGoruntu() {
  const anlik = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !(k.startsWith('best_') || k.startsWith('state_'))) continue;
      const v = localStorage.getItem(k);
      if (bos(v)) continue;
      if (k.startsWith('best_')) {
        anlik[k] = Number(v) || 0;
      } else {
        try {
          anlik[k] = JSON.parse(v);
        } catch {
          /* bozuk kayit, atla */
        }
      }
    }
  } catch {
    /* localStorage'a erisilemiyor, bos gonder */
  }
  return anlik;
}

/* Kimlik dogrulamali bir /api/* ucuna POST atar. Basarisiz olursa (ag
   sorunu, sunucu hatasi, initData yok) null doner - hicbir zaman fırlatmaz,
   cagiran taraf null'u "sunucuya ulasilamadi" olarak yorumlar. */
async function sunucuGonder(yol, ekBody) {
  try {
    const initData = getInitData();
    if (!initData) return null;
    const yanit = await fetch(`${API_BASE}${yol}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, ...ekBody }),
    });
    if (!yanit.ok) return null;
    return await yanit.json();
  } catch {
    return null;
  }
}

/* Modul yuklenir yuklenmez baslar (Telegram icindeyse), boylece ilk okuma
   cagrisi geldiginde cogunlukla ya bitmis ya da bitmek uzeredir. Asla
   reddetmez (throw etmez) - basarisizlikta null'a duser ve sunucuAktif'i
   false yapar, boylece sonraki her cagri dogrudan yerel moda gider. */
const senkron = sunucuAktif ? (async () => {
  /* Gecici bir ag hatasi butun oturumu yerel moda kilitlemesin: kisa
     araliklarla birkac kez denenir. Onceden TEK bir basarisiz istek
     yetiyordu ve oyuncu Telegram icinde olmasina ragmen oturum boyunca
     sunucuya hic baglanamiyordu (bakiyesi eski yerel degerde kaliyordu). */
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      return await senkronDene();
    } catch {
      if (deneme < 2) await new Promise((r) => setTimeout(r, 400 * (deneme + 1)));
    }
  }
  sunucuAktif = false;
  return null;
})() : Promise.resolve(null);

async function senkronDene() {
  {
    const initData = getInitData();
    if (!initData) throw new Error('initData yok');

    const yanit = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData,
        points: Number(localGet('hub_points')) || 0,
        state: yerelAnlikGoruntu(),
      }),
    });
    if (!yanit.ok) throw new Error(`sync basarisiz: ${yanit.status}`);
    const veri = await yanit.json();

    return {
      points: Number(veri.points) || 0,
      energy: Number(veri.energy) || 0,
      maxEnergy: Number(veri.maxEnergy) || 0,
      energyNextMs: Number(veri.energyNextMs) || 0,
      streak: veri.streak && typeof veri.streak === 'object' ? veri.streak : null,
      spin: veri.spin && typeof veri.spin === 'object' ? veri.spin : null,
      state: veri.state && typeof veri.state === 'object' ? veri.state : {},
      meta: veri.meta && typeof veri.meta === 'object' ? veri.meta : {},
    };
  }
}

/* --- Basarisiz sunucu yazmalarini kuyruklayip yeniden dener ---

   Sadece jeton DISINDAKI yazmalar (rekor, oyun durumu) kuyruklaniyor - jeton
   harcama/kazanma dogrudan sonucuna gore davraniyor (asagida acikliyor).
   Kuyruk localStorage'da tutuluyor ki sayfa kapanip acilsa bile kaybolmasin. */
const KUYRUK_ANAHTARI = 'mh_pending_sync';

function kuyruguOku() {
  try {
    return JSON.parse(localGet(KUYRUK_ANAHTARI) || '[]');
  } catch {
    return [];
  }
}

function kuyruguYaz(liste) {
  localSet(KUYRUK_ANAHTARI, JSON.stringify(liste));
}

function kuyrugaEkle(giris) {
  const liste = kuyruguOku();
  liste.push(giris);
  kuyruguYaz(liste);
}

async function kuyruguBosalt() {
  if (!sunucuAktif) return;
  const v = await senkron;
  if (!v) return;

  const liste = kuyruguOku();
  if (!liste.length) return;

  const kalan = [];
  for (const giris of liste) {
    let sonuc = null;

    if (giris.tur === 'earn') {
      sonuc = await sunucuGonder('/api/points/earn', { opId: giris.opId, amount: giris.amount });
      if (sonuc) { v.points = sonuc.total; v.energy = sonuc.energy; }
    } else if (giris.tur === 'best') {
      sonuc = await sunucuGonder('/api/best', { game: giris.game, score: giris.score });
      if (sonuc) v.state[`best_${giris.game}`] = sonuc.best;
    } else if (giris.tur === 'state') {
      sonuc = await sunucuGonder('/api/state', {
        game: giris.game,
        state: giris.state,
        expectedVersion: giris.expectedVersion,
      });
      if (sonuc) {
        v.state[`state_${giris.game}`] = sonuc.state;
        v.meta[`state_${giris.game}`] = sonuc.version;
      }
    }

    if (!sonuc) kalan.push(giris); /* hala basarisiz, kuyrukta kalsin */
  }
  kuyruguYaz(kalan);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) kuyruguBosalt();
});
window.addEventListener('online', kuyruguBosalt);
kuyruguBosalt();

/* --- Disa acilan fonksiyonlar ---

   Her biri once senkronun sonucunu bekler: sunucu modundaysa oradan okur/
   yazar, degilse (misafir veya sunucuya hic ulasilamadiysa) Yerel
   fonksiyona duser. Cagiran hicbir dosya bu ayrimin farkinda olmak zorunda
   degil. */

export async function getPoints() {
  const v = await senkron;
  if (v) return v.points;
  return getPointsYerel();
}

export async function addPoints(amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  const v = await senkron;
  if (!v) return addPointsYerel(n);

  const opId = uuid();
  const sonuc = await sunucuGonder('/api/points/earn', { opId, amount: n });
  if (!sonuc) {
    /* Ag sorunu: kazanci kuyruga koyup mevcut (degismemis) bakiyeyi
       donduruyoruz - sunucu onaylamadan bakiyeyi yerelde sisirmiyoruz. */
    kuyrugaEkle({ tur: 'earn', opId, amount: n });
    return v.points;
  }
  v.points = sonuc.total;
  v.energy = sonuc.energy;
  return v.points;
}

/* --- Enerji / gunluk seri / gunluk cark ---

   Ucu de sadece Telegram icinde (sunucu modunda) anlamli - hile korumasi
   sunucuda oldugu icin misafir modunda bunlari taklit etmenin bir anlami
   yok. Misafirde hepsi null doner, hub.js bunu gorunce ilgili karti hic
   gostermez (tipki sync-badge'in 'misafir' durumunda gizlenmesi gibi). */

/* Telegram DISINDAKI ziyaretci icin kilitli bir onizleme.

   Amac: gunluk odul ekranini misafire de gostermek - odulu goren kisi
   Telegram'dan girip almak istiyor. Buradaki degerler yalnizca VITRIN;
   hicbiri sunucuya yazilmiyor, kilitli oldugu icin de bir anlami yok.
   Merdiven sunucudan gelmiyorsa (misafir) burasi kullaniliyor; giris
   yapan oyuncuda her zaman sunucunun bildirdigi rakamlar gecerli. */
const MISAFIR = {
  energy: 24, maxEnergy: 24, energyNextMs: 0,
  streak: { count: 0, canClaim: false, nextDay: 1, nextReward: 100,
            nextInMs: 0, broken: false, rewards: [100, 150, 200, 300, 400, 500, 1000] },
  spin: { canSpin: false, nextInMs: 0, prizes: [
    { tur: 'coin', miktar: 50 }, { tur: 'coin', miktar: 100 },
    { tur: 'coin', miktar: 150 }, { tur: 'coin', miktar: 250 },
    { tur: 'coin', miktar: 375 }, { tur: 'coin', miktar: 500 },
    { tur: 'enerji', miktar: 24 }, { tur: 'coin', miktar: 750 },
  ] },
};

/* Gunluk odul ekraninin hangi durumda oldugunu soyler:

     'sunucu'  - her sey normal, oduller alinabilir
     'misafir' - Telegram DISINDA aciliyor: odul vitrin olarak gosterilir
                 ama alinamaz (amac Telegram'dan girmeye tesvik etmek)
     'yerel'   - Telegram ICINDE ama sunucuya ulasilamadi. Bu durumda
                 oyuncunun gercek serisini/carkini BILMIYORUZ; "HAZIR!"
                 demek yalan olur - bu yuzden ekran hic gosterilmiyor.

   Onceden misafir ile 'yerel' ayni sayiliyordu: senkron bir kez basarisiz
   olunca Telegram icindeki oyuncuya, geri sayim surerken bile "HAZIR!"
   yaziliyordu. */
export async function odulDurumu() {
  if (!isTelegramUser()) return 'misafir';
  return (await senkron) ? 'sunucu' : 'yerel';
}

export async function getEnergy() {
  const v = await senkron;
  if (!v) return { energy: MISAFIR.energy, max: MISAFIR.maxEnergy, nextMs: 0, kilitli: true };
  return { energy: v.energy, max: v.maxEnergy, nextMs: v.energyNextMs, kilitli: false };
}

export async function getStreak() {
  const v = await senkron;
  if (!v) return MISAFIR.streak;
  return v.streak;
}

export async function claimStreak() {
  const v = await senkron;
  if (!v) return { ok: false, reason: 'misafir' };
  const sonuc = await sunucuGonder('/api/streak/claim', {});
  if (!sonuc) return { ok: false, reason: 'ag' };
  if (sonuc.ok) {
    v.points = sonuc.total;
    /* Alim sonrasi durumu SUNUCU bildiriyor - bekleme suresi orada
       tanimli. Istemci burada kendi "artik alamazsin" halini uydurdugunda
       nextInMs 0'da kaliyor ve geri sayim bos gorunuyordu. */
    v.streak = sonuc.durum || { ...v.streak, count: sonuc.streak, canClaim: false };
  }
  return sonuc;
}

/* Lider tablosu. Misafirde sunucu yok - null doner, hub tabloyu gostermez. */
export async function liderTablosu() {
  const v = await senkron;
  if (!v) return null;
  return sunucuGonder('/api/leaderboard', {});
}

export async function getSpin() {
  const v = await senkron;
  if (!v) return MISAFIR.spin;
  return v.spin;
}

export async function spinWheel() {
  const v = await senkron;
  if (!v) return { ok: false, reason: 'misafir' };
  const sonuc = await sunucuGonder('/api/spin', {});
  if (!sonuc) return { ok: false, reason: 'ag' };
  if (sonuc.ok) {
    v.points = sonuc.total;
    v.energy = sonuc.energy;
    /* prizes yayilarak korunuyor: sunucunun durumu yalnizca canSpin ve
       nextInMs iceriyor, dilim listesi senkrondan geliyor. */
    if (v.spin) v.spin = { ...v.spin, ...(sonuc.durum || { canSpin: false }) };
  }
  return sonuc;
}

export async function spendPoints(amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  const v = await senkron;
  if (!v) return spendPointsYerel(n);

  const sonuc = await sunucuGonder('/api/points/spend', { opId: uuid(), amount: n });
  if (!sonuc) {
    /* Ag sorunu: "yeterli bakiye yok" ile ayni sonuc - hicbir sey
       harcanmadi, oyuncu jeton kaybetmez, ister tekrar dener. Bunu
       kuyruklamiyoruz cunku oyuncu "basarisiz" gorup baska bir sey yapmaya
       devam edebilir; gecikmeli bir harcamanin sessizce uygulanmasi kafa
       karistirir. */
    return { ok: false, total: v.points };
  }
  v.points = sonuc.total;
  return sonuc;
}

export async function getBest(game) {
  const v = await senkron;
  if (v) return Number(v.state[`best_${game}`]) || 0;
  return getBestYerel(game);
}

export async function submitScore(game, score) {
  const v = await senkron;
  if (!v) return submitScoreYerel(game, score);

  const key = `best_${game}`;
  const mevcut = Number(v.state[key]) || 0;
  const yeniRekor = score > mevcut;
  const enIyi = yeniRekor ? score : mevcut;

  /* Iyimser: ekrana hemen yansitiyoruz, sunucu cevabi arka planda gelir.
     Boylece "yeni rekor!" animasyonu bir ag isteği kadar gecikmez -
     eskisi de zaten yerelde aninda donuyordu, ayni his korunuyor. */
  v.state[key] = enIyi;

  sunucuGonder('/api/best', { game, score }).then((sonuc) => {
    if (sonuc) v.state[key] = sonuc.best;
    else kuyrugaEkle({ tur: 'best', game, score });
  });

  return { best: enIyi, isRecord: yeniRekor };
}

export async function loadState(game) {
  const v = await senkron;
  if (v) return v.state[`state_${game}`] ?? null;
  return loadStateYerel(game);
}

export function saveState(game, state) {
  senkron.then((v) => {
    if (!v) return saveStateYerel(game, state);

    const key = `state_${game}`;
    const beklenen = v.meta[key] || 0;
    v.state[key] = state; /* iyimser: yerel onbellek hemen guncellenir */

    sunucuGonder('/api/state', { game, state, expectedVersion: beklenen }).then((sonuc) => {
      if (sonuc) {
        v.state[key] = sonuc.state;
        v.meta[key] = sonuc.version;
      } else {
        kuyrugaEkle({ tur: 'state', game, state, expectedVersion: beklenen });
      }
    });
  });
}

export function clearState(game) {
  senkron.then((v) => {
    if (!v) return clearStateYerel(game);

    const key = `state_${game}`;
    const beklenen = v.meta[key] || 0;
    v.state[key] = null;

    sunucuGonder('/api/state', { game, state: null, expectedVersion: beklenen }).then((sonuc) => {
      if (sonuc) {
        v.state[key] = sonuc.state;
        v.meta[key] = sonuc.version;
      } else {
        kuyrugaEkle({ tur: 'state', game, state: null, expectedVersion: beklenen });
      }
    });
  });
}

/* Kurulumu dogrulamak icin: hub bu bilgiyi kucuk bir rozette gosteriyor.
   Sunucu kurulumu (D1, Worker, API_BASE) tamamlanip tamamlanmadigini
   DevTools'a girmeden gormek icin var - "kurulum bitti ama degisiklik
   gormuyorum" sorusunun cevabi bu rozet.

     'misafir' -> Telegram disinda aciliyor, zaten yerelde kaliyor (normal)
     'sunucu'  -> Telegram icinde VE ilk senkron basarili oldu
     'yerel'   -> Telegram icinde AMA sunucuya hic ulasilamadi (kurulum
                  eksik/yanlis olabilir - API_BASE, D1 binding, worker.js) */
export async function sunucuDurumu() {
  if (!isTelegramUser()) return 'misafir';
  const v = await senkron;
  return v ? 'sunucu' : 'yerel';
}
