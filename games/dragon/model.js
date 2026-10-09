
import { loadState, saveState } from '../../js/store.js?v237';
import { KILITLI_HUCRELER, EN_UST_YUMURTA, EN_UST_SANDIK, YUVA_TAVANI,
         GENISLEME_N, GENISLEME_KILITLERI, GENISLEME_YUVA,
         bostaHesapla } from './ekonomi.js?v237';
import { CONFIG, eskiToplamHarcama } from './config.js?v237';
import { turCek, turBul } from './turler.js?v237';

const OYUN_ID = 'dragon';
const SURUM = 7;

export const IZGARA_N = 4;
/* Yuva sayisinda oyun siniri yok; bu sadece kotu veriye karsi tavan. */
export const EN_COK_YUVA = YUVA_TAVANI;

/* Gorunum tek bir alandan ibaret: `tur`. Her tur butun bir sprite
   (bkz. art.js).

   Tur ARTIK YUVA SIRASINDAN GELMIYOR. Once 4. yuva hep altin ejderhayi
   veriyordu; bu, ejderhayi odul degil satin alma yapiyordu. Tur ejderha
   kazanildigi an cekiliyor ve ejderhanin uzerinde kaliyor - dizideki
   yeri degisse bile. */
export const gorunum = (turId) => ({ tur: turBul(turId).id });

export function baslangicIzgarasi(n = IZGARA_N) {
  const cells = Array.from({ length: n * n }, (_, i) => {
    const k = KILITLI_HUCRELER[i];
    return k ? { kilit: true, fiyat: k.fiyat, odul: { ...k.odul } } : null;
  });
  return { n, cells };
}

/* IZGARAYI GENISLET: 4x4 -> 5x5, yeni sira SOLA ve USTE.

   Her eski hucre (r,c) yeni izgarada (r+1,c+1)'e tasiniyor; boylece
   oyuncunun tahtasindaki hicbir sey yer degistirmis GIBI hissettirmiyor,
   etrafinda yeni bir cerceve beliriyor. Yeni hucrelerin tamami kilitli.

   Bir kez calisiyor: grid.n zaten GENISLEME_N ise dokunmuyor. */
export function izgarayiGenislet(kayit) {
  const eski = kayit.grid;
  if (!eski || !Array.isArray(eski.cells)) return false;
  const n = Number(eski.n) || IZGARA_N;
  if (n >= GENISLEME_N) return false;
  if (eski.cells.length !== n * n) return false;

  const yeniN = GENISLEME_N;
  const cells = Array.from({ length: yeniN * yeniN }, (_, j) => {
    const k = GENISLEME_KILITLERI[j];
    return k ? { kilit: true, fiyat: k.fiyat, odul: { ...k.odul } } : null;
  });

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      cells[(r + 1) * yeniN + (c + 1)] = eski.cells[r * n + c];
    }
  }

  kayit.grid = { n: yeniN, cells };
  return true;
}

/* Genisleme hakki dogdu mu? (Ikinci yuva acildiginda.) */
export const genislemeHakki = (kayit) =>
  (Number(kayit?.unlockedSlots) || 1) >= GENISLEME_YUVA && (Number(kayit?.grid?.n) || IZGARA_N) < GENISLEME_N;

export const bugun = () => new Date().toISOString().slice(0, 10);

function yeniSayaclar() {
  return {
    merges: 0, feeds: 0, collects: 0, maxEggLv: 1,
    chests: 0,      /* acilan kap sayisi */
    maxPackLv: 0,   /* ulasilan en yuksek kap seviyesi */
    unlocks: 0,     /* acilan kilitli hucre sayisi */
  };
}

export function yeniEjderha(id, turId = 'ember') {
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
    /* Bosta uretim sayaci: `son` en son yumurta dustugu an,
       `biriken` toplanmayi bekleyen yumurta sayisi. */
    bosta: { son: simdi, biriken: 0 },
    look: gorunum(turId),
    createdAt: simdi,
    updatedAt: simdi,
  };
}

function yeniOyuncu() {
  return {
    v: SURUM,
    dragons: [yeniEjderha('d1', 'ember')],
    activeId: 'd1',
    unlockedSlots: 1,
    grid: baslangicIzgarasi(IZGARA_N),
    sira: [],                                  /* izgara doluyken bekleyen oduller */
    food: 3,
    stars: 0,
    sayaclar: yeniSayaclar(),
    gorevler: { bitti: [] },
    siparisler: [],                            /* tuccarin acik siparisleri */
    partner: { alinan: [], buyukOdul: false },   /* "oyun:kademe" anahtarlari */
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
  if (t === 'egg') return { t, lv };
  /* Kaplarda acilis sayacinin baslangici duruyor; 0 ise henuz
     baslatilmamis demek. Duvar saati oldugu icin oyun kapaliyken de
     ilerliyor. */
  return { t, lv, acilis: Math.max(0, Number(c.acilis) || 0) };
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
  (kayit.dragons || []).forEach((d) => {
    d.look = gorunum(d.look?.tur);
    d.feeds = 0;
    d.pencereBas = 0;
    d.pencereSayi = 0;
    delete d.xp;
    delete d.lastPlayed;
    delete d.species;
    delete d.element;
  });
  return kayit;
}

/* v6 -> v7: gorev haritasi uc kademeye bolundu ve gorev kimlikleri
   degisti (m1 -> a1 gibi). Eski kimlikler yeni listede karsiliga sahip
   olmadigi icin ilerleme sifirlaniyor; ama sayaclar (birlestirme,
   besleme, kirma) duruyor, yani oyuncu ilk gorevleri aninda geri
   kazaniyor - kaybi yok. */
function v6Tasi(kayit) {
  kayit.gorevler = { bitti: [] };
  kayit.partner = { alinan: [], buyukOdul: false };
  return kayit;
}

function duzelt(o) {
  o.v = SURUM;
  o.dragons = Array.isArray(o.dragons) ? o.dragons : [];
  if (!o.dragons.length) { o.dragons = [yeniEjderha('d1', 'ember')]; o.activeId = 'd1'; }

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
  /* Ikinci yuvasi acik olup hala 4x4 oynayan kayitlar (yani bu surumden
     onceki herkes) yukleme aninda genisliyor - yeni hucreler kilitli
     geldigi icin kimseye bedava alan verilmis olmuyor. */
  if (genislemeHakki(o)) izgarayiGenislet(o);
  /* Ejderha sayisi acik yuva sayisini gecebilir: kilitli yuvada bekler. */
  o.tutorial = Number(o.tutorial) || 0;

  o.sayaclar = { ...yeniSayaclar(), ...(o.sayaclar || {}) };
  o.gorevler = o.gorevler || { bitti: [] };
  if (!Array.isArray(o.gorevler.bitti)) o.gorevler.bitti = [];
  o.partner = o.partner || { alinan: [], buyukOdul: false };
  if (!Array.isArray(o.partner.alinan)) o.partner.alinan = [];
  o.partner.buyukOdul = !!o.partner.buyukOdul;
  o.gunluk = o.gunluk || { sonGun: '', seri: 0 };

  /* Tur artik KAYITTAN okunuyor: ejderha kazanildigi an cekilmis ve
     uzerinde kaliyor. Bilinmeyen/eski bir tur gelirse turBul ilk tura
     dusuyor, yani kayit bozulmuyor. */
  o.dragons.forEach((d) => {
    d.look = gorunum(d.look?.tur);
    d.level = Math.min(CONFIG.MAX_LEVEL, Math.max(1, Number(d.level) || 1));
    d.feeds = Math.max(0, Number(d.feeds) || 0);
    d.lastFed = Number(d.lastFed) || 0;
    d.pencereBas = Number(d.pencereBas) || 0;
    d.pencereSayi = Math.max(0, Number(d.pencereSayi) || 0);
    d.happiness = Number.isFinite(d.happiness) ? d.happiness : 100;

    /* Eski kayitlarda bosta sayaci yok. Simdiden baslatiyoruz, yoksa
       `son: 0` yuzunden oyuncu aninda tavani dolu buluyor. */
    const b = d.bosta;
    d.bosta = {
      son: Number(b?.son) || Date.now(),
      biriken: Math.max(0, Math.min(3, Number(b?.biriken) || 0)),
    };
  });
  if (o.dragons.length > EN_COK_YUVA) o.dragons.length = EN_COK_YUVA;
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
    if (surum < 7) hazir = v6Tasi(hazir);
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

/* Yeni ejderha ilk BOS yuvaya iniyor - o yuva kilitli olsa bile.
   Kilitli yuvada duran ejderha beslenemiyor ama seritte gorunuyor;
   oyuncu neyi kacirdigini gorsun diye (bkz. dragon.js slotlariCiz). */
/* Butun ACIK yuvalardaki ejderhalarin bosta sayacini ilerletiyor.
   Kilitli yuvadaki ejderha uretmiyor - yuvayi acmanin dogrudan karsiligi
   bu. Degisen bir sey olduysa true donuyor ki cagiran kaydetsin. */
export function bostaIsle(oyuncu, simdi = Date.now()) {
  let degisti = false;
  oyuncu.dragons.forEach((d, sira) => {
    if (sira >= oyuncu.unlockedSlots) return;
    const y = bostaHesapla(d.bosta, simdi);
    if (y.biriken !== d.bosta.biriken || y.son !== d.bosta.son) degisti = true;
    d.bosta = { son: y.son, biriken: y.biriken };
  });
  return degisti;
}

/* Acik yuvalarda toplanmayi bekleyen toplam yumurta. */
export function bekleyenYumurta(oyuncu) {
  return oyuncu.dragons.reduce(
    (t, d, sira) => t + (sira < oyuncu.unlockedSlots ? d.bosta.biriken : 0), 0);
}

/* Yeni ejderha ilk BOS yuvaya iniyor - o yuva kilitli olsa bile.
   Kilitli yuvadaki ejderha beslenemiyor ama seritte gorunuyor; yuvayi
   acmak icin en guclu sebep bu.

   Tur disaridan verilmezse burada cekiliyor (bkz. turler.js turCek). */
export function ejderhaEkle(oyuncu, tur = null) {
  if (oyuncu.dragons.length >= EN_COK_YUVA) return null;
  const secilen = tur || turCek();
  const id = `d${oyuncu.dragons.length + 1}_${Date.now().toString(36)}`;
  const yeni = yeniEjderha(id, secilen.id);
  oyuncu.dragons.push(yeni);
  return yeni;
}
