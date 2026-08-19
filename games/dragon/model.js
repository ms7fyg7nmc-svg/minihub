
import { loadState, saveState } from '../../js/store.js?v100';
import { SLOTS, VARSAYILAN_GORUNUM } from './data.js?v100';

const OYUN_ID = 'dragon';
const SURUM = 2;

function yeniOyuncu() {
  return {
    v: SURUM,
    dragons: [yeniEjderha('d1')],
    activeId: 'd1',
    island: 'grassland',
    ownedIslands: ['grassland'],
    owned: Object.fromEntries(SLOTS.map((s) => [s.key, [VARSAYILAN_GORUNUM[s.key]]])),
  };
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
    lastFed: simdi,
    lastPlayed: 0,
    happiness: 100,
    look: { ...VARSAYILAN_GORUNUM },
    createdAt: simdi,
    updatedAt: simdi,
  };
}

const ESKI_ID = {
  color: {
    violet: 'royal', crimson: 'ember', emerald: 'emerald', ice: 'frost',
    gold: 'celestial', shadow: 'obsidian', inferno: 'ember',
    runic: 'ocean', dragonlord: 'obsidian',
  },
  skin: {
    scales: 'tribal', plates: 'armor', cracks: 'flame',
    runes: 'runes', frost: 'cosmic',
  },
  head: {
    silver: 'silver', gold: 'golden', ruby: 'flame',
    ancient: 'king', dragon: 'celestial',
  },
  face: {
    scar: 'scar', warpaint: 'warPaint', monocle: 'darkMark', visor: 'runeFace',
  },
  aura: {
    embers: 'ember', flame: 'golden', storm: 'electric',
    halo: 'cosmic', stars: 'celestial',
  },
};

const PET_DESEN = {
  ice: 'tribal', gold: 'tribal', shadow: 'tribal',
  inferno: 'flame', runic: 'runes', dragonlord: 'armor',
};

const cevir = (slot, id) => (id && ESKI_ID[slot]?.[id]) || null;

function listeyiCevir(slot, liste, varsayilan) {
  const yeni = (liste || []).map((id) => cevir(slot, id)).filter(Boolean);
  return [...new Set([varsayilan, ...yeni])];
}

function petTasi(eski) {
  const o = yeniOyuncu();
  const d = o.dragons[0];

  d.level = Math.max(1, Number(eski.level) || 1);
  d.xp = Number(eski.xp) || 0;
  d.lastFed = Number(eski.lastFed) || Date.now();

  const eq = eski.eq || {};
  const sahip = eski.owned || {};
  const renk = eq.color || 'violet';

  d.look.color = cevir('color', renk) || VARSAYILAN_GORUNUM.color;
  d.look.head = cevir('head', eq.crown) || 'none';
  d.look.aura = cevir('aura', eq.effect) || 'none';
  d.look.skin = PET_DESEN[renk] || 'none';

  o.owned.color = listeyiCevir('color', sahip.color, VARSAYILAN_GORUNUM.color);
  o.owned.head = listeyiCevir('head', sahip.crown, 'none');
  o.owned.aura = listeyiCevir('aura', sahip.effect, 'none');
  o.owned.skin = [...new Set(['none',
    ...(sahip.color || []).map((c) => PET_DESEN[c]).filter(Boolean)])];

  return o;
}

function v1Tasi(kayit) {
  for (const d of kayit.dragons) {
    d.look = d.look || {};
    for (const slot of ['color', 'skin', 'head', 'face', 'aura']) {
      const yeni = cevir(slot, d.look[slot]);
      d.look[slot] = yeni || (d.look[slot] === 'none' ? 'none' : VARSAYILAN_GORUNUM[slot]);
    }
  }
  for (const slot of ['color', 'skin', 'head', 'face', 'aura']) {
    kayit.owned[slot] = listeyiCevir(
      slot, kayit.owned?.[slot],
      slot === 'color' ? VARSAYILAN_GORUNUM.color : 'none',
    );
  }
  return kayit;
}

export async function oyuncuyuYukle() {
  const kayit = await loadState(OYUN_ID);
  if (kayit && Array.isArray(kayit.dragons) && kayit.dragons.length) {
    const guncel = (Number(kayit.v) || 1) >= 2 ? kayit : v1Tasi(duzelt(kayit));
    const son = duzelt(guncel);
    saveState(OYUN_ID, son);
    return son;
  }

  const eski = await loadState('pet');
  if (eski && Number(eski.level) > 0) {
    const tasinan = petTasi(eski);
    saveState(OYUN_ID, tasinan);
    return tasinan;
  }

  const taze = yeniOyuncu();
  saveState(OYUN_ID, taze);
  return taze;
}

export function oyuncuyuKaydet(oyuncu) {
  aktifEjderha(oyuncu).updatedAt = Date.now();
  saveState(OYUN_ID, oyuncu);
}

function duzelt(o) {
  o.v = SURUM;
  o.owned = o.owned || {};
  for (const s of SLOTS) {
    if (!Array.isArray(o.owned[s.key])) o.owned[s.key] = [VARSAYILAN_GORUNUM[s.key]];
  }
  if (!Array.isArray(o.ownedIslands) || !o.ownedIslands.length) o.ownedIslands = ['grassland'];
  if (!o.island || !o.ownedIslands.includes(o.island)) o.island = o.ownedIslands[0];

  for (const d of o.dragons) {
    d.look = { ...VARSAYILAN_GORUNUM, ...(d.look || {}) };
    d.happiness = Number.isFinite(d.happiness) ? d.happiness : 100;
    d.lastPlayed = Number(d.lastPlayed) || 0;
  }
  if (!o.dragons.some((d) => d.id === o.activeId)) o.activeId = o.dragons[0].id;
  return o;
}

export function adaSahipMi(oyuncu, id) {
  return (oyuncu.ownedIslands || []).includes(id);
}

export function adaEkle(oyuncu, id) {
  if (!oyuncu.ownedIslands) oyuncu.ownedIslands = [];
  if (!oyuncu.ownedIslands.includes(id)) oyuncu.ownedIslands.push(id);
}

export function aktifEjderha(oyuncu) {
  return oyuncu.dragons.find((d) => d.id === oyuncu.activeId) || oyuncu.dragons[0];
}

export function sahipMi(oyuncu, slot, id) {
  return (oyuncu.owned[slot] || []).includes(id);
}

export function dolabaEkle(oyuncu, slot, id) {
  if (!oyuncu.owned[slot]) oyuncu.owned[slot] = [];
  if (!oyuncu.owned[slot].includes(id)) oyuncu.owned[slot].push(id);
}
