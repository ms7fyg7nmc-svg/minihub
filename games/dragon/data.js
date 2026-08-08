/* Dragon Island - KOZMETIK KATALOGU

   Butun gorunum parcalari burada tanimli. Yeni bir renk, desen veya aksesuar
   eklemek icin SADECE bu dosyaya satir yazilir - oyun kodu, dukkan kodu ve
   cizim kodu degismez.

   RENK VE DESEN ARTIK AYRI

   Eski Ejderham'da desen renge yapisikti: 'Buz' rengini secen mecburen pullu
   olurdu. Burada ikisi ayri slot, yani 9 renk x 6 desen = 54 farkli govde
   kombinasyonu cikiyor. Ayni parayla cok daha fazla kendini ifade etme alani.

   SLOTLAR

   Gorunum sabit alanlardan degil, asagidaki SLOTS listesinden uretiliyor.
   V2'de yeni bir slot (kanat, kolye, sirt esyasi) eklemek icin listeye bir
   satir eklemek yeterli; dolap, dukkan ve kayit bicimi kendiliginden uyum
   saglar. */

export const SLOTS = [
  { key: 'color', title: 'shopColors' },
  { key: 'skin',  title: 'shopSkins' },
  { key: 'head',  title: 'shopHeads' },
  { key: 'face',  title: 'shopFaces' },
  { key: 'aura',  title: 'shopAuras' },
];

export const VARSAYILAN_GORUNUM = {
  color: 'violet',
  skin: 'none',
  head: 'none',
  face: 'none',
  aura: 'none',
};

/* --- RENK: govde paleti --- */
export const COLORS = {
  violet:     { price: 0,     nameKey: 'colViolet',  body: '#a978e8', dark: '#7b4fd0', belly: '#e6d6fa', horn: '#f5b942' },
  crimson:    { price: 400,   nameKey: 'colCrimson', body: '#e05a52', dark: '#a8342d', belly: '#f7cdc6', horn: '#f5b942' },
  emerald:    { price: 700,   nameKey: 'colEmerald', body: '#3fbf7a', dark: '#248a53', belly: '#cdf0dd', horn: '#f5d76e' },
  ice:        { price: 1200,  nameKey: 'colIce',     body: '#5fc8e8', dark: '#2a8bb0', belly: '#d6f2fb', horn: '#eaf7ff' },
  gold:       { price: 2000,  nameKey: 'colGold',    body: '#e8b13c', dark: '#b07d16', belly: '#fbe9c0', horn: '#fff3d0' },
  shadow:     { price: 3200,  nameKey: 'colShadow',  body: '#4a4560', dark: '#2b2739', belly: '#8a83a8', horn: '#c4b6f0' },
  inferno:    { price: 5000,  nameKey: 'colInferno', body: '#f2703a', dark: '#a83318', belly: '#ffd9a8', horn: '#ffe066', needLevel: 40 },
  runic:      { price: 8000,  nameKey: 'colRunic',   body: '#4d6b8f', dark: '#2b3f5c', belly: '#cfe0f0', horn: '#8fe3d8', needLevel: 65 },
  /* Obsidyen + altin. Sahne zemininden ayirt edilecek kadar acik tutuldu;
     daha koyusunda kanatlar arka plana karisiyor. */
  dragonlord: { price: 12000, nameKey: 'colLord',    body: '#4a4166', dark: '#332c4a', belly: '#b6a8dd', horn: '#f5c74a', needLevel: 80 },
};

/* --- DESEN: govdeye islenen doku ---
   ink: desenin cizgi rengi. null ise rengin kendi koyu tonu kullanilir. */
export const SKINS = {
  none:   { price: 0,     nameKey: 'skNone' },
  scales: { price: 900,   nameKey: 'skScales', kind: 'scales', ink: null },
  plates: { price: 1800,  nameKey: 'skPlates', kind: 'plates', ink: '#f5c74a' },
  cracks: { price: 3500,  nameKey: 'skCracks', kind: 'cracks', ink: '#ffe066', needLevel: 30 },
  runes:  { price: 6000,  nameKey: 'skRunes',  kind: 'runes',  ink: '#8fe3d8', needLevel: 55 },
  frost:  { price: 9000,  nameKey: 'skFrost',  kind: 'frost',  ink: '#eaf7ff', needLevel: 70 },
};

/* --- BAS: taclar ve baslikklar --- */
export const HEADS = {
  none:    { price: 0,     nameKey: 'hdNone' },
  silver:  { price: 600,   nameKey: 'hdSilver',  metal: '#d8dde8', edge: '#9aa2b5', gem: '#8fd0ff' },
  gold:    { price: 1500,  nameKey: 'hdGold',    metal: '#f5c74a', edge: '#c9922a', gem: '#fff3d0' },
  ruby:    { price: 3000,  nameKey: 'hdRuby',    metal: '#f5c74a', edge: '#c9922a', gem: '#e2544e' },
  ancient: { price: 6000,  nameKey: 'hdAncient', metal: '#c9b7f5', edge: '#8b6fd6', gem: '#6ee7a8', needLevel: 50 },
  dragon:  { price: 11000, nameKey: 'hdDragon',  metal: '#f0d78a', edge: '#a8761c', gem: '#ff6b4a', needLevel: 75 },
};

/* --- YUZ: ikincil aksesuar slotu --- */
export const FACES = {
  none:    { price: 0,    nameKey: 'fcNone' },
  scar:    { price: 800,  nameKey: 'fcScar',   kind: 'scar',   color: '#ffd9c0' },
  warpaint:{ price: 1600, nameKey: 'fcPaint',  kind: 'paint',  color: '#e2544e' },
  monocle: { price: 2400, nameKey: 'fcMonocle',kind: 'monocle',color: '#f5c74a' },
  visor:   { price: 4500, nameKey: 'fcVisor',  kind: 'visor',  color: '#8fd0ff', needLevel: 45 },
};

/* --- HALE: satin alinan animasyonlar --- */
export const AURAS = {
  none:   { price: 0,    nameKey: 'auNone' },
  embers: { price: 500,  nameKey: 'auEmbers', color: '#f5b942', kind: 'rise' },
  flame:  { price: 1400, nameKey: 'auFlame',  color: '#f2703a', kind: 'rise' },
  storm:  { price: 2800, nameKey: 'auStorm',  color: '#8fd0ff', kind: 'storm' },
  halo:   { price: 4200, nameKey: 'auHalo',   color: '#c079f2', kind: 'aura' },
  stars:  { price: 6500, nameKey: 'auStars',  color: '#ffe066', kind: 'rise', needLevel: 60 },
};

/* Slot anahtarindan katalog tablosuna */
export const KATALOG = {
  color: COLORS,
  skin: SKINS,
  head: HEADS,
  face: FACES,
  aura: AURAS,
};

export function parca(slot, id) {
  const tablo = KATALOG[slot];
  return tablo?.[id] ?? tablo?.[VARSAYILAN_GORUNUM[slot]];
}

/* Bir gorunumun tam paleti: renk + desenin murekkebi */
export function palet(look) {
  const renk = COLORS[look.color] || COLORS.violet;
  const desen = SKINS[look.skin] || SKINS.none;
  return { ...renk, pattern: desen.kind || null, ink: desen.ink || renk.dark };
}
