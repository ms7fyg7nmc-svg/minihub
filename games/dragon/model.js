
import { loadState, saveState } from '../../js/store.js?v117';
import { SLOTS, VARSAYILAN_GORUNUM } from './data.js?v117';
import { KILITLI_HUCRELER, EN_UST_YUMURTA, EN_UST_SANDIK, YUVA_FIYATLARI } from './ekonomi.js?v117';

const OYUN_ID = 'dragon';
const SURUM = 4;

export const IZGARA_N = 4;
export const EN_COK_YUVA = YUVA_FIYATLARI.length;

/* Baslangic izgarasi: 3x3 acik, en sag sutun ve en alt satir kilitli.
   Kilitli hucrelerin her biri icindeki odulu de satiyor. */
export function baslangicIzgarasi(n = IZGARA_N) {
  const cells = Array.from({ length: n * n }, (_, i) => {
    const k = KILITLI_HUCRELER[i];
    return k ? { kilit: true, fiyat: k.fiyat, odul: { ...k.odul } } : null;
  });
  return { n, cells };
}

export function bugun() {
  return new Date().toISOString().slice(0, 10);
}

function yeniGorevler() {
  return { day: bugun(), merges: 0, feeds: 0, collects: 0, claimed: [] };
}

export function yeniEjderha(id) {
  const simdi = Date.now();
  return {
    id,
    name: null,
    species: 'ember',
    element: 'fire',
    level: 1,
    xp: 0,
    lastFed: 0,
    lastPlayed: 0,
    happiness: 100,
    look: { ...VARSAYILAN_GORUNUM },
    createdAt: simdi,
    updatedAt: simdi,
  };
}

/* Oyuncu ilk ejderhasiyla basliyor: yumurta artik ejderhanin beslenmesiyle
   geldigi icin ortada bir ejderha olmadan dongu baslamiyor. */
function yeniOyuncu() {
  return {
    v: SURUM,
    dragons: [yeniEjderha('d1')],
    activeId: 'd1',
    unlockedSlots: 1,
    owned: Object.fromEntries(SLOTS.map((s) => [s.key, [VARSAYILAN_GORUNUM[s.key]]])),
    grid: baslangicIzgarasi(IZGARA_N),
    food: 3,
    stars: 0,
    tasks: yeniGorevler(),
    tutorial: 0,
  };
}

function hucreDuzelt(c) {
  if (!c) return null;
  if (c.kilit) {
    return {
      kilit: true,
      fiyat: Number(c.fiyat) || 0,
      odul: { t: c.odul?.t || 'egg', lv: Math.max(1, Number(c.odul?.lv) || 1) },
    };
  }
  const t = ['egg', 'food', 'star'].includes(c.t) ? c.t : 'egg';
  const enUst = t === 'egg' ? EN_UST_YUMURTA : EN_UST_SANDIK;
  const lv = Math.min(enUst, Math.max(1, Math.round(Number(c.lv) || 1)));
  return t === 'egg' ? { t, lv, r: Number(c.r) || 0 } : { t, lv };
}

/* v3 -> v4: eski izgarada kilitli hucre yoktu; eldeki nesneler korunup
   acik alana tasiniyor, kilitli hucreler yeniden kuruluyor. */
function v3Tasi(kayit) {
  const eskiler = (kayit.grid?.cells || []).map(hucreDuzelt).filter(Boolean);
  const izgara = baslangicIzgarasi(IZGARA_N);
  for (const nesne of eskiler) {
    const bos = izgara.cells.findIndex((c) => c === null);
    if (bos < 0) break;
    izgara.cells[bos] = nesne;
  }
  kayit.grid = izgara;
  delete kayit.eggReadyAt;
  if (!kayit.dragons?.length) {
    kayit.dragons = [yeniEjderha('d1')];
    kayit.activeId = 'd1';
  }
  return kayit;
}

function v2Tasi(kayit) {
  delete kayit.island;
  delete kayit.ownedIslands;
  kayit.food = Number.isFinite(kayit.food) ? kayit.food : 5;
  kayit.stars = Number(kayit.stars) || 0;
  kayit.tasks = yeniGorevler();
  kayit.unlockedSlots = 1;
  kayit.tutorial = (kayit.dragons || []).length ? 99 : 0;
  return v3Tasi(kayit);
}

function duzelt(o) {
  o.v = SURUM;
  o.dragons = Array.isArray(o.dragons) ? o.dragons : [];
  if (!o.dragons.length) { o.dragons = [yeniEjderha('d1')]; o.activeId = 'd1'; }

  o.owned = o.owned || {};
  for (const s of SLOTS) {
    if (!Array.isArray(o.owned[s.key])) o.owned[s.key] = [VARSAYILAN_GORUNUM[s.key]];
  }

  const n = o.grid?.n || IZGARA_N;
  if (!o.grid || !Array.isArray(o.grid.cells) || o.grid.cells.length !== n * n) {
    o.grid = baslangicIzgarasi(n);
  }
  o.grid.cells = o.grid.cells.map(hucreDuzelt);

  o.food = Math.max(0, Math.round(Number(o.food) || 0));
  o.stars = Math.max(0, Math.round(Number(o.stars) || 0));
  o.unlockedSlots = Math.min(EN_COK_YUVA, Math.max(1, Number(o.unlockedSlots) || 1));
  o.tutorial = Number(o.tutorial) || 0;

  if (!o.tasks || o.tasks.day !== bugun()) o.tasks = yeniGorevler();
  if (!Array.isArray(o.tasks.claimed)) o.tasks.claimed = [];
  o.tasks.collects = Number(o.tasks.collects) || 0;

  for (const d of o.dragons) {
    d.look = { ...VARSAYILAN_GORUNUM, ...(d.look || {}) };
    d.happiness = Number.isFinite(d.happiness) ? d.happiness : 100;
    d.lastPlayed = Number(d.lastPlayed) || 0;
    d.lastFed = Number(d.lastFed) || 0;
    d.level = Math.max(1, Number(d.level) || 1);
  }
  if (!o.dragons.some((d) => d.id === o.activeId)) o.activeId = o.dragons[0].id;
  return o;
}

export async function oyuncuyuYukle() {
  const kayit = await loadState(OYUN_ID);
  if (kayit && typeof kayit === 'object') {
    const surum = Number(kayit.v) || 1;
    let hazir = kayit;
    if (surum < 3) hazir = v2Tasi(kayit);
    else if (surum < 4) hazir = v3Tasi(kayit);
    const son = duzelt(hazir);
    saveState(OYUN_ID, son);
    return son;
  }
  const taze = yeniOyuncu();
  saveState(OYUN_ID, taze);
  return taze;
}

export function oyuncuyuKaydet(oyuncu) {
  const d = aktifEjderha(oyuncu);
  if (d) d.updatedAt = Date.now();
  saveState(OYUN_ID, oyuncu);
}

export function aktifEjderha(oyuncu) {
  if (!oyuncu?.dragons?.length) return null;
  return oyuncu.dragons.find((d) => d.id === oyuncu.activeId) || oyuncu.dragons[0];
}

/* Oyuncu sinirsiz ejderha tutabilir ama sadece acik yuvadakiler beslenebilir;
   gerisi kilitli onizleme olarak duruyor ve yuva almaya tesvik ediyor. */
export function yuvaAcikMi(oyuncu, ejderha) {
  const sira = oyuncu.dragons.findIndex((d) => d.id === ejderha?.id);
  return sira >= 0 && sira < oyuncu.unlockedSlots;
}

export function ejderhaEkle(oyuncu) {
  const id = `d${oyuncu.dragons.length + 1}_${Date.now().toString(36)}`;
  const yeni = yeniEjderha(id);
  oyuncu.dragons.push(yeni);
  return yeni;
}

export function sahipMi(oyuncu, slot, id) {
  return (oyuncu.owned[slot] || []).includes(id);
}

export function dolabaEkle(oyuncu, slot, id) {
  if (!oyuncu.owned[slot]) oyuncu.owned[slot] = [];
  if (!oyuncu.owned[slot].includes(id)) oyuncu.owned[slot].push(id);
}
