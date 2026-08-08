/* Dragon Island - VERI MODELI

   TEK EJDERHA VAR AMA MODEL COKLU:

   V1'de oyuncunun bir ejderhasi var. Yine de kayit "tek ejderha" seklinde
   degil, bir LISTE olarak tutuluyor:

     oyuncu.dragons[]  +  oyuncu.activeId

   Boylece V2'de koleksiyon, yumurta ve ureme geldiginde kayit bicimini
   degistirip herkesin ilerlemesini goce sokmak gerekmeyecek; listeye ikinci
   ejderhayi eklemek yetecek.

   DOLAP OYUNCUNUN, EJDERHANIN DEGIL:

   Satin alinan kozmetikler oyuncuda (owned) tutuluyor, ejderhada degil.
   Ileride ikinci ejderha geldiginde ayni taci ona da takabilsin diye. */

import { loadState, saveState } from '../../js/store.js';
import { SLOTS, VARSAYILAN_GORUNUM } from './data.js';

const OYUN_ID = 'dragon';
const SURUM = 1;

/* Bos bir oyuncu kaydi */
function yeniOyuncu() {
  return {
    v: SURUM,
    dragons: [yeniEjderha('d1')],
    activeId: 'd1',
    /* Dolap: her slot icin sahip olunan parcalar */
    owned: Object.fromEntries(SLOTS.map((s) => [s.key, [VARSAYILAN_GORUNUM[s.key]]])),
  };
}

export function yeniEjderha(id) {
  const simdi = Date.now();
  return {
    id,
    name: null,          /* bos ise tur adi gosterilir */
    species: 'ember',    /* V2: tur/element sistemi buradan buyuyecek */
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

/* --- Eski Ejderham kaydindan gecis ---

   Oyuncular Ejderham'da seviye atlamis ve kozmetik satin almis olabilir.
   Dragon Island ayri bir oyun oldugu icin o ilerleme kaybolmasin diye
   state_pet kaydi bir kereligine buraya tasiniyor.

   Eski surumde desen renge yapisikti (ornegin 'ice' hep pullu gelirdi).
   Yeni surumde renk ve desen ayri secilebiliyor; goc sirasinda eski rengin
   deseni ayri bir parca olarak dolaba ekleniyor. */
const ESKI_DESEN = {
  ice: 'scales', gold: 'scales', shadow: 'scales',
  inferno: 'cracks', runic: 'runes', dragonlord: 'plates',
};

function eskidenAktar(eski) {
  const o = yeniOyuncu();
  const d = o.dragons[0];

  d.level = Math.max(1, Number(eski.level) || 1);
  d.xp = Number(eski.xp) || 0;
  d.lastFed = Number(eski.lastFed) || Date.now();

  const eq = eski.eq || {};
  const sahip = eski.owned || {};

  const renk = eq.color || 'violet';
  d.look.color = renk;
  d.look.head = eq.crown && eq.crown !== 'none' ? eq.crown : 'none';
  d.look.aura = eq.effect && eq.effect !== 'none' ? eq.effect : 'none';
  d.look.skin = ESKI_DESEN[renk] || 'none';

  o.owned.color = [...new Set(['violet', ...(sahip.color || [])])];
  o.owned.head = [...new Set(['none', ...(sahip.crown || [])])];
  o.owned.aura = [...new Set(['none', ...(sahip.effect || [])])];
  /* Sahip olunan her rengin deseni de dolaba girer */
  o.owned.skin = [...new Set(['none', ...(sahip.color || []).map((c) => ESKI_DESEN[c]).filter(Boolean)])];

  return o;
}

/* --- Yukleme / kaydetme --- */

export async function oyuncuyuYukle() {
  const kayit = await loadState(OYUN_ID);
  if (kayit && Array.isArray(kayit.dragons) && kayit.dragons.length) {
    return duzelt(kayit);
  }

  /* Dragon Island kaydi yoksa eski Ejderham ilerlemesine bak */
  const eski = await loadState('pet');
  if (eski && Number(eski.level) > 0) {
    const tasinan = eskidenAktar(eski);
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

/* Eksik alanlari tamamlar: eski bir kayit yeni bir slot tanimayabilir */
function duzelt(o) {
  o.v = SURUM;
  o.owned = o.owned || {};
  for (const s of SLOTS) {
    if (!Array.isArray(o.owned[s.key])) o.owned[s.key] = [VARSAYILAN_GORUNUM[s.key]];
  }
  for (const d of o.dragons) {
    d.look = { ...VARSAYILAN_GORUNUM, ...(d.look || {}) };
    d.happiness = Number.isFinite(d.happiness) ? d.happiness : 100;
    d.lastPlayed = Number(d.lastPlayed) || 0;
  }
  if (!o.dragons.some((d) => d.id === o.activeId)) o.activeId = o.dragons[0].id;
  return o;
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
