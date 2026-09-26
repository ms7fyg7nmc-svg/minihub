
import { loadState, saveState } from '../../js/store.js?v147';
import { KILITLI_HUCRELER, EN_UST_YUMURTA, EN_UST_SANDIK, YUVA_FIYATLARI } from './ekonomi.js?v147';
import { CONFIG, eskiToplamHarcama } from './config.js?v147';

const OYUN_ID = 'dragon';
const SURUM = 6;

export const IZGARA_N = 4;
export const EN_COK_YUVA = YUVA_FIYATLARI.length;

/* Ejderha artik aksesuarsiz: tac, kolye, yuz isareti ve aura yok.
   Kanat govdenin parcasi oldugu icin duruyor (art.js zaten kanatsiz
   ejderha cizmiyor, varsayilana dusuyor). */
export const SADE_GORUNUM = {
  color: 'ember', skin: 'none', wings: 'leather',
  necklace: 'none', head: 'none', face: 'none', aura: 'none',
};

export function baslangicIzgarasi(n = IZGARA_N) {
  const cells = Array.from({ length: n * n }, (_, i) => {
    const k = KILITLI_HUCRELER[i];
    return k ? { kilit: true, fiyat: k.fiyat, odul: { ...k.odul } } : null;
  });
  return { n, cells };
}

export const bugun = () => new Date().toISOString().slice(0, 10);

function yeniSayaclar() {
  return { merges: 0, feeds: 0, collects: 0, maxEggLv: 1 };
}

export function yeniEjderha(id) {
  const simdi = Date.now();
  return {
    id,
    name: null,
    level: 1,
    feeds: 0,               /* bu seviyede verilen toplam besleme */
    lastFed: 0,
    pencereBas: 0,          /* 4 saatlik istah penceresinin baslangici */
    pencereSayi: 0,         /* pencere icinde kacinci besleme */
    happiness: 100,
    look: { ...SADE_GORUNUM },
    createdAt: simdi,
    updatedAt: simdi,
  };
}

function yeniOyuncu() {
  return {
    v: SURUM,
    dragons: [yeniEjderha('d1')],
    activeId: 'd1',
    unlockedSlots: 1,
    grid: baslangicIzgarasi(IZGARA_N),
    sira: [],                                  /* izgara doluyken bekleyen oduller */
    food: 3,
    stars: 0,
    sayaclar: yeniSayaclar(),
    gorevler: { bitti: [] },
    gunluk: { sonGun: '', seri: 0 },
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
  return { t, lv };
}

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
  return kayit;
}

function v2Tasi(kayit) {
  delete kayit.island;
  delete kayit.ownedIslands;
  kayit.food = Number.isFinite(kayit.food) ? kayit.food : 5;
  kayit.stars = Number(kayit.stars) || 0;
  kayit.unlockedSlots = 1;
  kayit.tutorial = (kayit.dragons || []).length ? 99 : 0;
  return v3Tasi(kayit);
}

/* v4: seviye tavani 99'dan 3'e indi, eski $MH harcamasi yem olarak iade edildi. */
function v4Tasi(kayit) {
  const cells = kayit.grid?.cells;
  if (Array.isArray(cells)) {
    for (const [i, k] of Object.entries(KILITLI_HUCRELER)) {
      if (cells[i] === null || cells[i] === undefined) {
        cells[i] = { kilit: true, fiyat: k.fiyat, odul: { ...k.odul } };
      }
    }
  }
  let iade = 0;
  for (const d of kayit.dragons || []) {
    const eskiSeviye = Math.max(1, Number(d.level) || 1);
    if (eskiSeviye > 1) iade += eskiToplamHarcama(eskiSeviye);
    d.level = 1;
    d.xp = 0;
  }
  if (iade > 0) {
    kayit.food = (Number(kayit.food) || 0) + iade;
    kayit.iadeEdilenYem = iade;
  }
  return kayit;
}

/* v5 -> v6: gunluk odul, gorev haritasi, bekleme sirasi, sade gorunum. */
function v5Tasi(kayit) {
  kayit.sira = [];
  kayit.sayaclar = yeniSayaclar();
  kayit.gorevler = { bitti: [] };
  kayit.gunluk = { sonGun: '', seri: 0 };
  delete kayit.tasks;
  delete kayit.owned;
  for (const d of kayit.dragons || []) {
    d.look = { ...SADE_GORUNUM };
    d.feeds = 0;
    d.pencereBas = 0;
    d.pencereSayi = 0;
    delete d.xp;
    delete d.lastPlayed;
    delete d.species;
    delete d.element;
  }
  return kayit;
}

function duzelt(o) {
  o.v = SURUM;
  o.dragons = Array.isArray(o.dragons) ? o.dragons : [];
  if (!o.dragons.length) { o.dragons = [yeniEjderha('d1')]; o.activeId = 'd1'; }

  const n = o.grid?.n || IZGARA_N;
  if (!o.grid || !Array.isArray(o.grid.cells) || o.grid.cells.length !== n * n) {
    o.grid = baslangicIzgarasi(n);
  }
  o.grid.cells = o.grid.cells.map(hucreDuzelt);

  /* Sira sinirsiz: kazanilan hicbir odul kaybolmuyor. */
  o.sira = Array.isArray(o.sira) ? o.sira.map(hucreDuzelt).filter(Boolean) : [];
  o.food = Math.max(0, Math.round(Number(o.food) || 0));
  o.stars = Math.max(0, Math.round(Number(o.stars) || 0));
  o.unlockedSlots = Math.min(EN_COK_YUVA, Math.max(1, Number(o.unlockedSlots) || 1));
  o.tutorial = Number(o.tutorial) || 0;

  o.sayaclar = { ...yeniSayaclar(), ...(o.sayaclar || {}) };
  o.gorevler = o.gorevler || { bitti: [] };
  if (!Array.isArray(o.gorevler.bitti)) o.gorevler.bitti = [];
  o.gunluk = o.gunluk || { sonGun: '', seri: 0 };

  for (const d of o.dragons) {
    d.look = { ...SADE_GORUNUM };
    d.level = Math.min(CONFIG.MAX_LEVEL, Math.max(1, Number(d.level) || 1));
    d.feeds = Math.max(0, Number(d.feeds) || 0);
    d.lastFed = Number(d.lastFed) || 0;
    d.pencereBas = Number(d.pencereBas) || 0;
    d.pencereSayi = Math.max(0, Number(d.pencereSayi) || 0);
    d.happiness = Number.isFinite(d.happiness) ? d.happiness : 100;
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
    if (surum < 5) hazir = v4Tasi(hazir);
    if (surum < 6) hazir = v5Tasi(hazir);
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

/* Sinirsiz ejderha tutulabilir ama sadece acik yuvadakiler beslenebilir. */
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
