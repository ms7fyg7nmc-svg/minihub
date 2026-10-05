
import { isTelegramUser, getInitData } from './tg.js?v226';
import { surumKontrol } from './guncel.js?v226';

/* Hub ve 12 oyunun hepsi bu modulu yukluyor, o yuzden surum tazeleyici
   buraya bagli: tek yerden hepsini kapsiyor. */
surumKontrol();

const API_BASE = 'https://minihub-bot.volkanturedi1.workers.dev';

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const tg = window.Telegram?.WebApp ?? null;
const cloud = tg?.CloudStorage ?? null;
const cloudReady = !!cloud && !!tg?.version && parseFloat(tg.version) >= 6.9;

const BULUT_BEKLEME = 600;

const onbellek = new Map();
const bekleyenYazmalar = new Map();

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

let sunucuAktif = isTelegramUser();

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
        }
      }
    }
  } catch {
  }
  return anlik;
}

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

const senkron = sunucuAktif ? (async () => {
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
      energyRefill: veri.energyRefill && typeof veri.energyRefill === 'object' ? veri.energyRefill : null,
      streak: veri.streak && typeof veri.streak === 'object' ? veri.streak : null,
      gorev: veri.gorev && typeof veri.gorev === 'object' ? veri.gorev : null,
      promoBekleyen: Number(veri.promoBekleyen) || 0,
      spin: veri.spin && typeof veri.spin === 'object' ? veri.spin : null,
      state: veri.state && typeof veri.state === 'object' ? veri.state : {},
      meta: veri.meta && typeof veri.meta === 'object' ? veri.meta : {},
      bakim: Array.isArray(veri.bakim) ? veri.bakim : [],
    };
  }
}

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

    if (!sonuc) kalan.push(giris);
  }
  kuyruguYaz(kalan);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) kuyruguBosalt();
});
window.addEventListener('online', kuyruguBosalt);
kuyruguBosalt();

export async function getPoints() {
  const v = await senkron;
  if (v) return v.points;
  return getPointsYerel();
}

export async function spendRestartEnergy() {
  const v = await senkron;
  if (!v) return { ok: false };
  const sonuc = await sunucuGonder('/api/energy/spend', { opId: uuid() });
  if (!sonuc) return { ok: false };
  if (sonuc.ok) v.energy = sonuc.energy;
  return sonuc;
}

export async function settleAbandonedRun(score, divisor) {
  const earned = Math.floor((Number(score) || 0) / divisor);
  if (earned > 0) {
    await addPoints(earned);
    return { earned };
  }
  await spendRestartEnergy();
  return { earned: 0 };
}

export async function addPoints(amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  const v = await senkron;
  if (!v) return addPointsYerel(n);

  const opId = uuid();
  const sonuc = await sunucuGonder('/api/points/earn', { opId, amount: n });
  if (!sonuc) {
    kuyrugaEkle({ tur: 'earn', opId, amount: n });
    return v.points;
  }
  v.points = sonuc.total;
  v.energy = sonuc.energy;
  return v.points;
}

const MISAFIR = {
  energy: 24, maxEnergy: 24, energyNextMs: 0,
  /* Misafirde gorev yok: ilerleme sunucuda tutuluyor ve sandik gercek
     $MH odedigi icin hesapsiz bir oyuncuya gosterilmesi yanlis olurdu.
     null gelince hub karti hic cizilmiyor. */
  gorev: null,
  streak: { count: 0, canClaim: false, nextDay: 1, nextReward: 100,
            nextInMs: 0, broken: false, rewards: [100, 150, 200, 300, 400, 500, 1000] },
  /* Sunucudaki SPIN_PRIZES ile AYNI sirada ve ayni degerlerde olmali -
     misafir carki dondurup sonra Telegram'dan girince baska sayilar
     gormesin. */
  spin: { canSpin: false, nextInMs: 0, prizes: [
    { tur: 'coin', miktar: 250 }, { tur: 'coin', miktar: 400 },
    { tur: 'coin', miktar: 600 }, { tur: 'coin', miktar: 900 },
    { tur: 'coin', miktar: 1200 }, { tur: 'coin', miktar: 1600 },
    { tur: 'enerji', miktar: 3 }, { tur: 'coin', miktar: 2500 },
  ] },
};

export async function odulDurumu() {
  if (!isTelegramUser()) return 'misafir';
  return (await senkron) ? 'sunucu' : 'yerel';
}

export async function getEnergy() {
  const v = await senkron;
  if (!v) return { energy: MISAFIR.energy, max: MISAFIR.maxEnergy, nextMs: 0, kilitli: true, refill: null };
  return { energy: v.energy, max: v.maxEnergy, nextMs: v.energyNextMs, kilitli: false, refill: v.energyRefill };
}

/* ENERJI ARTIK KAPI DEGIL, CARPAN.

   Eskiden 0 enerjiyle oyun BASLATILAMIYORDU: oyuncu hub'a geri atiliyor
   ve yapacak hicbir sey bulamiyordu. Oysa sunucu zaten daha yumusak bir
   kural isletiyordu - enerji bosken kazanc ceyrege dusuyor
   (bkz. worker.js EMPTY_ENERGY_CARPAN). Yani mekanizma vardi, istemci
   onun ustune gereksiz bir duvar koyuyordu.

   Artik kapi yok: enerjisi biten oynayabiliyor, sadece daha az
   kazaniyor. Oyuncuya bu ACIKCA soyleniyor (bkz. js/onay.js
   enerjiBosOnayi) - sessizce dortte bir odemek, kapiyi kapatmaktan daha
   kotu olurdu.

   Misafir/yerel modda enerji zaten sahte: her zaman dolu sayiliyor. */
export async function enerjiBosMu() {
  const enerji = await getEnergy();
  return !enerji.kilitli && enerji.energy <= 0;
}

/* Eski ad, geriye donuk: artik HER ZAMAN true. Cagiran yerler
   temizlenirken birakildi ki unutulan bir cagri oyunu kapatmasin. */
export async function oynanabilirMi() {
  return true;
}

export async function adEnergyRefill() {
  const v = await senkron;
  if (!v) return { ok: false, reason: 'misafir' };
  const sonuc = await sunucuGonder('/api/energy/ad-refill', { opId: uuid() });
  if (!sonuc) return { ok: false, reason: 'ag' };
  if (sonuc.ok) v.energy = sonuc.energy;
  return sonuc;
}

export async function starEnergyInvoiceLink() {
  const v = await senkron;
  if (!v) return { ok: false, reason: 'misafir' };
  const sonuc = await sunucuGonder('/api/energy/star-invoice', {});
  if (!sonuc) return { ok: false, reason: 'ag' };
  if (sonuc.error) return { ok: false, reason: sonuc.error };
  return { ok: true, link: sonuc.link };
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
    v.streak = sonuc.durum || { ...v.streak, count: sonuc.streak, canClaim: false };
  }
  return sonuc;
}

/* ---- Gunluk gorevler ----
   Ilerleme sunucuda; burada yalnizca koprusu var. gorevOlay() ejderha
   icindeki birlestirme/besleme gibi sunucunun GORMEDIGI hamleleri
   bildiriyor - sunucu ejderha durumunu tek parca JSON olarak aliyor,
   tek tek hamleleri degil. */

export async function getGorev() {
  const v = await senkron;
  if (!v) return null;
  if (!v.gorev) {
    const sonuc = await sunucuGonder('/api/gorev', {});
    if (sonuc && Array.isArray(sonuc.gorevler)) v.gorev = sonuc;
  }
  return v.gorev;
}

export async function gorevAl() {
  const v = await senkron;
  if (!v) return { ok: false, reason: 'misafir' };
  const sonuc = await sunucuGonder('/api/gorev/al', {});
  if (!sonuc) return { ok: false, reason: 'ag' };
  if (sonuc.ok) {
    v.points = sonuc.total;
    v.gorev = sonuc;
  } else if (Array.isArray(sonuc.gorevler)) {
    v.gorev = sonuc;
  }
  return sonuc;
}

/* Oyun ici olay bildirimi.

   BIRIKTIRILIYOR. Ilk hali her birlestirmede ayri bir istek atiyordu;
   hizli oynayan biri saniyede birkac kez mobil veri uzerinden sunucuya
   gidiyordu - gorev sayaci oyunun kendisinden pahaliya mal olurdu.
   Simdi sayilar toplanip bir buçuk saniyede bir tek istekte gidiyor.

   Sayfa gizlenirken (oyuncu Telegram'i kapatirken) bekleyen ne varsa
   hemen gonderiliyor, yoksa son birkac hamle kaybolurdu.

   Cevap beklenmiyor ve hatalar yutuluyor: bir birlestirme animasyonunun
   gorev sayaci yuzunden gecikmesi kabul edilemez. */
const gorevBekleyen = new Map();
let gorevSaat = null;

function gorevBosalt() {
  if (gorevSaat) { clearTimeout(gorevSaat); gorevSaat = null; }
  if (gorevBekleyen.size === 0) return;
  const gonderilecek = [...gorevBekleyen.entries()];
  gorevBekleyen.clear();
  senkron.then((v) => {
    if (!v) return;
    for (const [olay, miktar] of gonderilecek) {
      sunucuGonder('/api/gorev/olay', { olay, miktar }).then((sonuc) => {
        if (sonuc && Array.isArray(sonuc.gorevler)) v.gorev = sonuc;
      }).catch(() => {});
    }
  }).catch(() => { /* gorev sayaci oyunu bozmaz */ });
}

export function gorevOlay(olay, miktar = 1) {
  gorevBekleyen.set(olay, (gorevBekleyen.get(olay) || 0) + miktar);
  if (!gorevSaat) gorevSaat = setTimeout(gorevBosalt, 1500);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden) gorevBosalt(); });
  window.addEventListener('pagehide', gorevBosalt);
}

/* ---- Promosyon kodlari ----
   Butun dogrulama sunucuda: kodun varligi, suresi, sahibe ait olup
   olmadigi ve bir kez mi kullanilabilecegi. Burada yalnizca kopru var;
   istemcinin kod listesini gormesine gerek yok ve gormemeli - liste
   istemciye inseydi herkes sahip kodlarini okurdu. */

export async function promoKullan(kod) {
  const v = await senkron;
  if (!v) return { ok: false, reason: 'misafir' };
  const sonuc = await sunucuGonder('/api/promo', { kod });
  if (!sonuc) return { ok: false, reason: 'ag' };
  if (sonuc.ok) {
    if (typeof sonuc.total === 'number') v.points = sonuc.total;
    if (typeof sonuc.energy === 'number') v.energy = sonuc.energy;
  }
  return sonuc;
}

/* Ejderha varliklarini tasiyan kutu. Okumak ayni anda BOSALTIYOR, bu
   yuzden cagiran taraf aldigini hemen uygulamali ve kaydetmeli. */
export async function promoKutuAl() {
  const v = await senkron;
  if (!v) return [];
  const sonuc = await sunucuGonder('/api/promo/kutu', {});
  return Array.isArray(sonuc?.parcalar) ? sonuc.parcalar : [];
}

export async function promoBekleyenVar() {
  const v = await senkron;
  return !!(v && v.promoBekleyen > 0);
}

// Liderlik tablosu panele her acilista sunucuya gitmesin diye 4 saat
// istemci tarafinda onbelleklendiriliyor - gorunur bir geri sayim yok,
// sadece istek sayisini azaltmak icin. localStorage'da tutuluyor ki
// sayfa yeniden acilinca da onbellek gecerli kalsin.
const LIDER_ONBELLEK_ANAHTARI = 'mh_lider_cache';
const LIDER_ONBELLEK_SURESI = 4 * 3600 * 1000;

// LIDER_ONBELLEK_SURUM'u artirmak, suredolumunu beklemeden HERKESIN
// onbellegini bir kerelik gecersiz kilar (surum uyusmuyorsa onbellek yok
// sayilir) - sonraki her acilis yine normal 4 saatlik dongude kalir. Duzenli
// bir yenileme mekanizmasi degil, sadece "bu surum icin bir kerelik zorla
// tazele" anahtari.
const LIDER_ONBELLEK_SURUM = 2;

export async function liderTablosu() {
  const v = await senkron;
  if (!v) return null;

  try {
    const ham = localGet(LIDER_ONBELLEK_ANAHTARI);
    if (ham) {
      const onbellek = JSON.parse(ham);
      if (onbellek && onbellek.surum === LIDER_ONBELLEK_SURUM &&
          Date.now() - onbellek.zaman < LIDER_ONBELLEK_SURESI) {
        return onbellek.veri;
      }
    }
  } catch {
  }

  const veri = await sunucuGonder('/api/leaderboard', {});
  if (veri) {
    try {
      localSet(LIDER_ONBELLEK_ANAHTARI, JSON.stringify({ surum: LIDER_ONBELLEK_SURUM, zaman: Date.now(), veri }));
    } catch {
    }
  }
  return veri;
}

export async function referralOzeti() {
  const v = await senkron;
  if (!v) return null;
  return sunucuGonder('/api/referral', {});
}

export async function getSpin() {
  const v = await senkron;
  if (!v) return MISAFIR.spin;
  return v.spin;
}

export async function refreshDaily() {
  const v = await senkron;
  if (!v) return;
  const veri = await sunucuGonder('/api/sync', {
    points: Number(localGet('hub_points')) || 0,
    state: yerelAnlikGoruntu(),
  });
  if (!veri) return;
  v.energy = Number(veri.energy) || 0;
  v.energyNextMs = Number(veri.energyNextMs) || 0;
  if (veri.energyRefill && typeof veri.energyRefill === 'object') v.energyRefill = veri.energyRefill;
  if (veri.streak && typeof veri.streak === 'object') v.streak = veri.streak;
  if (veri.gorev && typeof veri.gorev === 'object') v.gorev = veri.gorev;
  v.promoBekleyen = Number(veri.promoBekleyen) || 0;
  if (veri.spin && typeof veri.spin === 'object') v.spin = veri.spin;
}

export async function spinWheel() {
  const v = await senkron;
  if (!v) return { ok: false, reason: 'misafir' };
  const sonuc = await sunucuGonder('/api/spin', {});
  if (!sonuc) return { ok: false, reason: 'ag' };
  if (sonuc.ok) {
    v.points = sonuc.total;
    v.energy = sonuc.energy;
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

  v.state[key] = enIyi;

  sunucuGonder('/api/best', { game, score }).then((sonuc) => {
    if (sonuc) v.state[key] = sonuc.best;
    else kuyrugaEkle({ tur: 'best', game, score });
  });

  return { best: enIyi, isRecord: yeniRekor };
}

function yerelTohum() {
  return Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
}

// Sunucu-dogrulamali skor (replay) destegi olan oyunlar icin: submitScore/
// addPoints yerine bu fonksiyonlar kullaniliyor. Misafirde/yerelde sunucu
// dogrulamasi zaten yok - startRun/finishRun bu durumda null doner, cagiran
// taraf kendi (dogrulamasiz) yerel akisina duser (bkz. finishRunOrLegacy).
export async function startRun(game) {
  const v = await senkron;
  if (!v) return null;

  const sonuc = await sunucuGonder('/api/game/start', { game });
  if (!sonuc || typeof sonuc.seed !== 'number' || !sonuc.runId) return null;
  return sonuc;
}

export async function finishRun(game, runId, payload) {
  const v = await senkron;
  if (!v || !runId) return null;

  const sonuc = await sunucuGonder('/api/game/finish', { game, runId, ...payload });
  if (!sonuc?.ok) return null;
  v.points = sonuc.total;
  if (typeof sonuc.best === 'number') v.state[`best_${game}`] = sonuc.best;
  return sonuc;
}

export { yerelTohum };

// Biriken-skor/carpan modeliyle calisan oyunlar (2048, snake, vb.) icin:
// sunucu dogrulamasi basarisizsa ya da misafirse, eski (dogrulamasiz)
// submitScore+addPoints akisina aynen duser. `payload` oyuna gore degisir
// (2048: {moves}, snake: {events, totalTicks}, vb.) - sadece finishRun'a
// aynen iletiliyor.
export async function finishRunOrLegacy(game, runId, payload, claimedScore, divisor) {
  const sonuc = runId ? await finishRun(game, runId, { ...payload, claimedScore }) : null;
  if (sonuc) return sonuc;

  const bestSonuc = await submitScore(game, claimedScore);
  const earned = Math.max(0, Math.floor((Number(claimedScore) || 0) / divisor));
  if (earned > 0) await addPoints(earned);
  return { ok: true, score: claimedScore, best: bestSonuc.best, isRecord: bestSonuc.isRecord, earned, total: null };
}

export async function loadState(game) {
  const v = await senkron;
  if (v) return v.state[`state_${game}`] ?? null;
  return loadStateYerel(game);
}

/* OYUN BASINA TEK UCUSTA KAYIT.

   Burada gercek bir hata vardi ve yalnizca TELEFONDA goruluyordu.

   saveState her cagrildiginda yanitini BEKLEMEDEN sunucuya yaziyordu.
   Oyuncu hizli hizli iki birlestirme yaparsa iki kayit ayni anda yola
   cikiyor ve ikisi de AYNI expectedVersion'i tasiyor - cunku ilkinin
   yanitiyla gelecek olan yeni surum henuz elimizde degil.

   Sunucu surum tutmazsa YAZMIYOR (bkz. worker.js handleState, WHERE
   player_data.version = ?) ve o anda kayitli olan state'i geri
   donduruyor. Istemci de onu kosulsuz kabul ediyordu:
   `v.state[key] = sonuc.state`. Sonuc: ikinci birlestirme sessizce
   silinip tahta bir onceki haline donuyor. Oyuncunun gordugu sey,
   yaptigi hamlenin tutmamasi - yani "dondu".

   Masaustunde hic olmuyordu cunku localhost 1 ms'de cevap veriyor ve
   iki kayit asla cakismiyor. Telefonda yanit 300-800 ms; iki merge
   arasi bundan kisa.

   Cozum: ayni oyun icin ayni anda birden fazla kayit ucmuyor. Ucusta
   biri varsa yenisi BEKLEYENE yaziliyor (eskisinin uzerine - en son
   durum zaten en dogrusu), ucus bitince taze surumle gonderiliyor. */
const kayitUcusta = new Map();    /* key -> true */
const kayitBekleyen = new Map();  /* key -> son state */

/* Sunucu yazmayi reddettiyse (surum tutmadi) bunu kayda dusuyoruz.
   Oyuncunun telefonunda gercekten olup olmadigini ancak boyle
   ogrenebiliyoruz - masaustunde hic olmuyor. */
async function taniYaz(olay, ayrinti) {
  try {
    const m = await import('./tani.js?v210');
    m.iz(olay, ayrinti);
  } catch { /* tani yoksa sessiz */ }
}

function kayitGonder(v, game, key) {
  const state = kayitBekleyen.get(key);
  kayitBekleyen.delete(key);
  kayitUcusta.set(key, true);

  const beklenen = v.meta[key] || 0;

  return sunucuGonder('/api/state', { game, state, expectedVersion: beklenen })
    .then((sonuc) => {
      if (sonuc) {
        /* Surum bir artmadiysa sunucu YAZMADI; bizimki reddedildi. */
        if (sonuc.version === beklenen) taniYaz('kayit.reddedildi', `${key} v${beklenen}`);
        v.meta[key] = sonuc.version;
        /* Sunucunun donduruu state'i yalnizca ARDIMIZDA bekleyen bir
           kayit yoksa kabul ediyoruz. Bekleyen varsa oyuncu o cevaptan
           daha yeni bir hamle yapmis demektir; sunucunun kopyasi
           eskidir ve onu yazmak hamleyi yutar. */
        if (!kayitBekleyen.has(key)) v.state[key] = sonuc.state;
      } else {
        taniYaz('kayit.cevapyok', key);
        kuyrugaEkle({ tur: 'state', game, state, expectedVersion: beklenen });
      }
    })
    .finally(() => {
      kayitUcusta.delete(key);
      if (kayitBekleyen.has(key)) kayitGonder(v, game, key);
    });
}

export function saveState(game, state) {
  senkron.then((v) => {
    if (!v) return saveStateYerel(game, state);

    const key = `state_${game}`;
    /* Yerel kopya her zaman ANINDA guncelleniyor: oyun ekrani sunucuyu
       beklemiyor, bekleseydi her hamle gecikirdi. */
    v.state[key] = state;
    kayitBekleyen.set(key, state);

    if (!kayitUcusta.has(key)) kayitGonder(v, game, key);
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

/* Bakim kilidi: hangi oyunlarin kapali oldugunu SUNUCU soyler (bot/worker.js
   BAKIMDAKI_OYUNLAR). Istemcide kimlik listesi tutmuyoruz. Sunucuya
   ulasilamazsa kapali kabul ediliyor: kim oldugunu dogrulayamadigimiz
   birine bakimdaki oyunu acmiyoruz. */
export async function bakimListesi() {
  const v = await senkron;
  if (!v) return [...BAKIM_VARSAYILAN];
  return v.bakim || [];
}

export async function bakimdaMi(game) {
  const v = await senkron;
  if (!v) return BAKIM_VARSAYILAN.has(game);
  return (v.bakim || []).includes(game);
}

const BAKIM_VARSAYILAN = new Set();   /* sunucuya ulasilamazsa kapali sayilan oyunlar */

export async function sunucuDurumu() {
  if (!isTelegramUser()) return 'misafir';
  const v = await senkron;
  return v ? 'sunucu' : 'yerel';
}
