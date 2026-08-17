
import { isTelegramUser, getInitData } from './tg.js?v89';

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
      spin: veri.spin && typeof veri.spin === 'object' ? veri.spin : null,
      state: veri.state && typeof veri.state === 'object' ? veri.state : {},
      meta: veri.meta && typeof veri.meta === 'object' ? veri.meta : {},
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
  streak: { count: 0, canClaim: false, nextDay: 1, nextReward: 100,
            nextInMs: 0, broken: false, rewards: [100, 150, 200, 300, 400, 500, 1000] },
  spin: { canSpin: false, nextInMs: 0, prizes: [
    { tur: 'coin', miktar: 50 }, { tur: 'coin', miktar: 100 },
    { tur: 'coin', miktar: 150 }, { tur: 'coin', miktar: 250 },
    { tur: 'coin', miktar: 375 }, { tur: 'coin', miktar: 500 },
    { tur: 'enerji', miktar: 24 }, { tur: 'coin', miktar: 750 },
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

export async function liderTablosu() {
  const v = await senkron;
  if (!v) return null;
  return sunucuGonder('/api/leaderboard', {});
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
// addPoints yerine bu ikisi kullaniliyor. Misafirde/yerelde sunucu
// dogrulamasi zaten yok, o yuzden eski (dogrulamasiz) davranisa aynen
// dusuyor - sadece senkron oldugunda gercek guvenlik farki oluyor.
export async function startRun(game) {
  const v = await senkron;
  if (!v) return { seed: yerelTohum(), runId: null };

  const sonuc = await sunucuGonder('/api/game/start', { game });
  if (!sonuc || typeof sonuc.seed !== 'number') return { seed: yerelTohum(), runId: null };
  return { seed: sonuc.seed, runId: sonuc.runId };
}

export async function finishRun(game, runId, moves, claimedScore, divisor) {
  const v = await senkron;
  if (!v || !runId) {
    const bestSonuc = await submitScoreYerel(game, claimedScore);
    const earned = Math.max(0, Math.floor((Number(claimedScore) || 0) / divisor));
    if (earned > 0) await addPointsYerel(earned);
    return { ok: true, score: claimedScore, best: bestSonuc.best, isRecord: bestSonuc.isRecord, earned, total: null };
  }

  const sonuc = await sunucuGonder('/api/game/finish', { game, runId, moves, claimedScore });
  if (!sonuc?.ok) return { ok: false };
  v.points = sonuc.total;
  if (typeof sonuc.best === 'number') v.state[`best_${game}`] = sonuc.best;
  return sonuc;
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
    v.state[key] = state;

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

export async function sunucuDurumu() {
  if (!isTelegramUser()) return 'misafir';
  const v = await senkron;
  return v ? 'sunucu' : 'yerel';
}
