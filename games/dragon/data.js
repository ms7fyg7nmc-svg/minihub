/* Dragon Island - KOZMETIK KATALOGU

   Butun gorunum parcalari ve adalar burada tanimli. Yeni bir item eklemek
   icin SADECE bu dosyaya satir yazilir - oyun kodu, dukkan kodu ve cizim
   kodu degismez.

   FIYAT VE IHTISAM BIRLIKTE ARTAR

   Kademeler oyunlarin gercek kazandirma hizina gore secildi: cogu oyun
   skor/10 veriyor, Su Siralama 25/bolum, Baglan 20/bolum. Tipik bir seans
   500-2.000 jeton, hevesli bir oyuncu gunde ~5.000 jeton kazaniyor.

     Kademe 1  bedava       baslangic gorunumu
     Kademe 2  ~350         ilk oturumda alinir
     Kademe 3  ~800         birkac oturum
     Kademe 4  ~1.800       bir hafta sonu
     Kademe 5  ~4.000       bir hafta
     Kademe 6  ~9.000       birkac hafta
     Kademe 7  ~20.000      uzun vadeli hedef
     Kademe 8  ~45.000      aylarca oynayanin rozeti

   Kategoriler farkli carpanlar kullaniyor: kanat silueti en cok degistiren
   sey oldugu icin pahali, yuz isareti en incelikli oldugu icin ucuz.

   HER ITEM'IN ALANLARI
     id        anahtar (kayitta bu tutuluyor)
     nameKey   ceviri anahtari  (i18n-items.js)
     descKey   aciklama anahtari
     price     jeton
     rarity    common | uncommon | rare | epic | legendary | mythic
     needLevel varsa seviye kilidi
     + cizim icin gereken gorsel alanlar */

/* --- Nadirlik --- */
export const RARITIES = {
  common:    { sira: 0, renk: '#9aa2b5', nameKey: 'rarCommon' },
  uncommon:  { sira: 1, renk: '#4ecb8b', nameKey: 'rarUncommon' },
  rare:      { sira: 2, renk: '#5b8cff', nameKey: 'rarRare' },
  epic:      { sira: 3, renk: '#c079f2', nameKey: 'rarEpic' },
  legendary: { sira: 4, renk: '#f5b942', nameKey: 'rarLegendary' },
  mythic:    { sira: 5, renk: '#ff6b8a', nameKey: 'rarMythic' },
};

/* --- Slotlar ---
   Gorunum sabit alanlardan degil bu listeden uretiliyor. V2'de yeni bir slot
   (kolye, sirt esyasi) eklemek icin listeye bir satir yeter; dolap, dukkan ve
   kayit bicimi kendiliginden uyum saglar. */
export const SLOTS = [
  { key: 'color',  title: 'shopColors' },
  { key: 'skin',   title: 'shopSkins' },
  { key: 'wings',  title: 'shopWings' },
  { key: 'tail',   title: 'shopTails' },
  { key: 'head',   title: 'shopHeads' },
  { key: 'face',   title: 'shopFaces' },
  { key: 'aura',   title: 'shopAuras' },
];

export const VARSAYILAN_GORUNUM = {
  color: 'ember',
  skin: 'none',
  wings: 'leather',
  tail: 'basic',
  head: 'none',
  face: 'none',
  aura: 'none',
};

/* ---------- RENK (8) ----------
   body/dark/belly/horn govdenin ana tonlari. aurora'da ayrica gradient var:
   cizim onu govdeye cok duraklı bir degrade olarak uyguluyor. */
export const COLORS = {
  ember:     { price: 0,     rarity: 'common',    nameKey: 'colEmber',   descKey: 'colEmberD',
               body: '#e05a52', dark: '#a8342d', belly: '#f7cdc6', horn: '#f5b942' },
  ocean:     { price: 350,   rarity: 'common',    nameKey: 'colOcean',   descKey: 'colOceanD',
               body: '#3fa8e0', dark: '#1f6d9e', belly: '#d3edfb', horn: '#eaf7ff' },
  emerald:   { price: 800,   rarity: 'uncommon',  nameKey: 'colEmerald', descKey: 'colEmeraldD',
               body: '#3fbf7a', dark: '#248a53', belly: '#cdf0dd', horn: '#f5d76e' },
  royal:     { price: 1800,  rarity: 'rare',      nameKey: 'colRoyal',   descKey: 'colRoyalD',
               body: '#8b5cf0', dark: '#5a2fae', belly: '#e6d6fa', horn: '#f5c74a', parlak: true },
  obsidian:  { price: 4000,  rarity: 'epic',      nameKey: 'colObsidian',descKey: 'colObsidianD',
               body: '#3a3446', dark: '#221e2c', belly: '#8a83a8', horn: '#c4b6f0', parlak: true },
  frost:     { price: 9000,  rarity: 'epic',      nameKey: 'colFrost',   descKey: 'colFrostD',
               body: '#a8dcf0', dark: '#5c9cc4', belly: '#f2fbff', horn: '#ffffff', parlak: true,
               needLevel: 30 },
  celestial: { price: 20000, rarity: 'legendary', nameKey: 'colCelestial',descKey:'colCelestialD',
               body: '#f0c04a', dark: '#b07d16', belly: '#fff3d0', horn: '#fffbe8', parlak: true,
               isilti: '#fff0a8', needLevel: 55 },
  aurora:    { price: 45000, rarity: 'mythic',    nameKey: 'colAurora',  descKey: 'colAuroraD',
               body: '#7ad4c8', dark: '#4a5fc0', belly: '#eafdf8', horn: '#ffd9f2', parlak: true,
               isilti: '#b6f5e8',
               /* Govde boyunca gecen aurora bantlari */
               aurora: ['#63e6c0', '#5ea8f0', '#9b6ef0', '#f07ac0'],
               needLevel: 75 },
};

/* ---------- DESEN (none + 8) ---------- */
export const SKINS = {
  none:     { price: 0,     rarity: 'common',    nameKey: 'skNone',    descKey: 'skNoneD' },
  stripes:  { price: 100,   rarity: 'common',    nameKey: 'skStripes', descKey: 'skStripesD', kind: 'stripes' },
  flame:    { price: 300,   rarity: 'common',    nameKey: 'skFlame',   descKey: 'skFlameD',   kind: 'flame',  ink: '#ffb347' },
  tribal:   { price: 700,   rarity: 'uncommon',  nameKey: 'skTribal',  descKey: 'skTribalD',  kind: 'tribal' },
  lightning:{ price: 1600,  rarity: 'rare',      nameKey: 'skLightning',descKey:'skLightningD',kind: 'lightning', ink: '#8fd0ff' },
  runes:    { price: 3600,  rarity: 'rare',      nameKey: 'skRunes',   descKey: 'skRunesD',   kind: 'runes',  ink: '#8fe3d8' },
  armor:    { price: 8000,  rarity: 'epic',      nameKey: 'skArmor',   descKey: 'skArmorD',   kind: 'armor',  ink: '#f5c74a' },
  cosmic:   { price: 18000, rarity: 'legendary', nameKey: 'skCosmic',  descKey: 'skCosmicD',  kind: 'cosmic', ink: '#c9b7f5', needLevel: 45 },
  celestial:{ price: 40000, rarity: 'mythic',    nameKey: 'skCelestial',descKey:'skCelestialD',kind: 'celestial', ink: '#ffe9a8', needLevel: 70 },
};

/* ---------- KANAT (8) ----------
   kind cizim varyantini, span kanat acikligi carpanini belirler.
   Kanat silueti en cok degistiren parca oldugu icin fiyatlar en yuksek. */
export const WINGS = {
  leather:  { price: 0,     rarity: 'common',    nameKey: 'wgLeather', descKey: 'wgLeatherD',
              kind: 'plain',   span: 0.86, parmak: 4 },
  flame:    { price: 450,   rarity: 'common',    nameKey: 'wgFlame',   descKey: 'wgFlameD',
              kind: 'flame',   span: 0.94, parmak: 4, kenar: '#ff8a3d' },
  crystal:  { price: 1000,  rarity: 'uncommon',  nameKey: 'wgCrystal', descKey: 'wgCrystalD',
              kind: 'crystal', span: 0.98, parmak: 4, kenar: '#bfeaff' },
  demon:    { price: 2300,  rarity: 'rare',      nameKey: 'wgDemon',   descKey: 'wgDemonD',
              kind: 'demon',   span: 1.10, parmak: 4, kenar: '#6b5a86' },
  phoenix:  { price: 5200,  rarity: 'rare',      nameKey: 'wgPhoenix', descKey: 'wgPhoenixD',
              kind: 'phoenix', span: 1.14, parmak: 5, kenar: '#ffb347' },
  lightning:{ price: 11700, rarity: 'epic',      nameKey: 'wgLightning',descKey:'wgLightningD',
              kind: 'lightning', span: 1.12, parmak: 4, kenar: '#8fd0ff', needLevel: 35 },
  king:     { price: 26000, rarity: 'legendary', nameKey: 'wgKing',    descKey: 'wgKingD',
              kind: 'king',    span: 1.20, parmak: 5, kenar: '#f5c74a', needLevel: 60 },
  celestial:{ price: 58000, rarity: 'mythic',    nameKey: 'wgCelestial',descKey:'wgCelestialD',
              kind: 'celestial', span: 1.26, parmak: 5, kenar: '#fff0a8', isilti: true, needLevel: 80 },
};

/* ---------- KUYRUK (8) ---------- */
export const TAILS = {
  basic:    { price: 0,     rarity: 'common',    nameKey: 'tlBasic',   descKey: 'tlBasicD',   kind: 'plain' },
  spiked:   { price: 350,   rarity: 'common',    nameKey: 'tlSpiked',  descKey: 'tlSpikedD',  kind: 'spiked' },
  flame:    { price: 800,   rarity: 'uncommon',  nameKey: 'tlFlame',   descKey: 'tlFlameD',   kind: 'flame',   kenar: '#ff8a3d' },
  crystal:  { price: 1800,  rarity: 'rare',      nameKey: 'tlCrystal', descKey: 'tlCrystalD', kind: 'crystal', kenar: '#bfeaff' },
  demon:    { price: 4000,  rarity: 'rare',      nameKey: 'tlDemon',   descKey: 'tlDemonD',   kind: 'demon' },
  lightning:{ price: 9000,  rarity: 'epic',      nameKey: 'tlLightning',descKey:'tlLightningD',kind: 'lightning', kenar: '#8fd0ff', needLevel: 35 },
  king:     { price: 20000, rarity: 'legendary', nameKey: 'tlKing',    descKey: 'tlKingD',    kind: 'king',    kenar: '#f5c74a', needLevel: 60 },
  celestial:{ price: 45000, rarity: 'mythic',    nameKey: 'tlCelestial',descKey:'tlCelestialD',kind: 'celestial', kenar: '#fff0a8', isilti: true, needLevel: 80 },
};

/* ---------- TAC (none + 8) ---------- */
export const HEADS = {
  none:    { price: 0,     rarity: 'common',    nameKey: 'hdNone',   descKey: 'hdNoneD' },
  tiny:    { price: 150,   rarity: 'common',    nameKey: 'hdTiny',   descKey: 'hdTinyD',
             kind: 'tiny',   metal: '#b9c0cf', edge: '#8a90a0', gem: '#dfe6f5' },
  bronze:  { price: 400,   rarity: 'common',    nameKey: 'hdBronze', descKey: 'hdBronzeD',
             kind: 'simple', metal: '#c8874a', edge: '#8f5a29', gem: '#f0c9a0' },
  silver:  { price: 900,   rarity: 'uncommon',  nameKey: 'hdSilver', descKey: 'hdSilverD',
             kind: 'points', metal: '#d8dde8', edge: '#9aa2b5', gem: '#8fd0ff' },
  golden:  { price: 2000,  rarity: 'rare',      nameKey: 'hdGolden', descKey: 'hdGoldenD',
             kind: 'jewel',  metal: '#f5c74a', edge: '#c9922a', gem: '#fff3d0' },
  flame:   { price: 4400,  rarity: 'rare',      nameKey: 'hdFlame',  descKey: 'hdFlameD',
             kind: 'flame',  metal: '#e8a13c', edge: '#a8621c', gem: '#ff7a3d' },
  ice:     { price: 10000, rarity: 'epic',      nameKey: 'hdIce',    descKey: 'hdIceD',
             kind: 'ice',    metal: '#cfeeff', edge: '#79b6d8', gem: '#ffffff', needLevel: 40 },
  king:    { price: 22000, rarity: 'legendary', nameKey: 'hdKing',   descKey: 'hdKingD',
             kind: 'king',   metal: '#f0d78a', edge: '#a8761c', gem: '#e2544e', needLevel: 65 },
  celestial:{ price: 50000, rarity: 'mythic',   nameKey: 'hdCelestial',descKey:'hdCelestialD',
             kind: 'celestial', metal: '#ffe9a8', edge: '#c9922a', gem: '#8fe3ff',
             isilti: true, needLevel: 85 },
};

/* ---------- YUZ (none + 8) ---------- */
export const FACES = {
  none:     { price: 0,     rarity: 'common',    nameKey: 'fcNone',   descKey: 'fcNoneD' },
  scar:     { price: 80,    rarity: 'common',    nameKey: 'fcScar',   descKey: 'fcScarD',   kind: 'scar',    color: '#ffd9c0' },
  twinScar: { price: 200,   rarity: 'common',    nameKey: 'fcTwin',   descKey: 'fcTwinD',   kind: 'twinScar',color: '#ffd9c0' },
  warPaint: { price: 500,   rarity: 'uncommon',  nameKey: 'fcPaint',  descKey: 'fcPaintD',  kind: 'paint',   color: '#e2544e' },
  darkMark: { price: 1100,  rarity: 'rare',      nameKey: 'fcDark',   descKey: 'fcDarkD',   kind: 'darkMark',color: '#5a3f8f' },
  flameFace:{ price: 2400,  rarity: 'rare',      nameKey: 'fcFlame',  descKey: 'fcFlameD',  kind: 'flame',   color: '#ff8a3d' },
  runeFace: { price: 5400,  rarity: 'epic',      nameKey: 'fcRune',   descKey: 'fcRuneD',   kind: 'rune',    color: '#8fe3d8', needLevel: 30 },
  demon:    { price: 12000, rarity: 'legendary', nameKey: 'fcDemon',  descKey: 'fcDemonD',  kind: 'demon',   color: '#e2544e', needLevel: 50 },
  kingMark: { price: 27000, rarity: 'mythic',    nameKey: 'fcKing',   descKey: 'fcKingD',   kind: 'kingMark',color: '#ffe9a8',
              isilti: true, needLevel: 75 },
};

/* ---------- AURA (none + 8) ---------- */
export const AURAS = {
  none:     { price: 0,     rarity: 'common',    nameKey: 'auNone',    descKey: 'auNoneD' },
  sparkle:  { price: 120,   rarity: 'common',    nameKey: 'auSparkle', descKey: 'auSparkleD', kind: 'star',   color: '#fff3d0', yogunluk: 0.6 },
  ember:    { price: 350,   rarity: 'common',    nameKey: 'auEmber',   descKey: 'auEmberD',   kind: 'ember',  color: '#f5b942' },
  frost:    { price: 800,   rarity: 'uncommon',  nameKey: 'auFrost',   descKey: 'auFrostD',   kind: 'frost',  color: '#bfeaff' },
  electric: { price: 1800,  rarity: 'rare',      nameKey: 'auElectric',descKey: 'auElectricD',kind: 'bolt',   color: '#8fd0ff' },
  shadow:   { price: 4000,  rarity: 'rare',      nameKey: 'auShadow',  descKey: 'auShadowD',  kind: 'mist',   color: '#6b5a86' },
  golden:   { price: 9000,  rarity: 'epic',      nameKey: 'auGolden',  descKey: 'auGoldenD',  kind: 'ember',  color: '#ffd76e', yogunluk: 1.2, needLevel: 35 },
  cosmic:   { price: 20000, rarity: 'legendary', nameKey: 'auCosmic',  descKey: 'auCosmicD',  kind: 'cosmic', color: '#b98cf5', needLevel: 60 },
  celestial:{ price: 45000, rarity: 'mythic',    nameKey: 'auCelestial',descKey:'auCelestialD',kind: 'celestial', color: '#ffe9a8', needLevel: 85 },
};

/* ---------- ADA (6) ----------
   Ada oyuncuya ait, ejderhaya degil: V2'de ikinci ejderha geldiginde ayni
   adada yasayacaklar.

   Her tema island.js tarafindan VERI olarak okunuyor - zemin renkleri,
   hangi susleri kullanacagi, gokyuzu, isik ve partikul turu. Yeni bir ada
   eklemek icin buraya bir satir yazmak yeterli, cizim kodu degismez. */
export const ISLANDS = {
  grassland: {
    price: 0, rarity: 'common', nameKey: 'islGrass', descKey: 'islGrassD',
    gok: ['#171429', '#100d1c'], parilti: 'rgba(150,120,255,0.20)',
    zemin: { ust: '#579f60', ustAcik: '#63b96b', ustKoyu: '#478f53',
             yanSol: '#6b4a32', yanSag: '#523827', kaya: '#39323f', kayaAcik: '#4a4152' },
    su: { ana: '#3f9fd0', parlak: '#6fc4ec' },
    susler: ['agac', 'agac', 'kaya', 'agac', 'kutuk', 'cicek', 'cicek', 'kaya', 'agac', 'kaya', 'cicek'],
    yuva: 'orgu',
    partikul: { tur: 'toz', renk: '#ffe9a8', adet: 14 },
  },
  fire: {
    price: 2500, rarity: 'uncommon', nameKey: 'islFire', descKey: 'islFireD',
    gok: ['#2b1418', '#160b0e'], parilti: 'rgba(255,110,50,0.24)',
    zemin: { ust: '#6b3630', ustAcik: '#7d3f36', ustKoyu: '#5a2d29',
             yanSol: '#4a2420', yanSag: '#361a17', kaya: '#2e1a19', kayaAcik: '#412421' },
    su: { ana: '#e0561f', parlak: '#ffb347' },
    susler: ['volkanKaya', 'volkanKaya', 'olukAgac', 'kaya', 'volkanKaya', 'ember', 'ember', 'kaya', 'olukAgac', 'volkanKaya', 'ember'],
    yuva: 'kor',
    partikul: { tur: 'kor', renk: '#ff9a4d', adet: 16 },
    duman: true,
  },
  ice: {
    price: 7000, rarity: 'rare', nameKey: 'islIce', descKey: 'islIceD',
    gok: ['#141d33', '#0c1220'], parilti: 'rgba(140,200,255,0.22)',
    zemin: { ust: '#cfe6f2', ustAcik: '#e4f2fa', ustKoyu: '#b3d2e4',
             yanSol: '#7fa8bf', yanSag: '#5e8399', kaya: '#3b4a5c', kayaAcik: '#4e6377' },
    su: { ana: '#5fc8e8', parlak: '#d6f2fb' },
    susler: ['karAgac', 'buzKristal', 'buzKristal', 'karAgac', 'kaya', 'buzKristal', 'kar', 'kar', 'karAgac', 'buzKristal', 'kar'],
    yuva: 'buz',
    partikul: { tur: 'kar', renk: '#ffffff', adet: 20 },
  },
  volcanic: {
    price: 18000, rarity: 'epic', nameKey: 'islVolcanic', descKey: 'islVolcanicD',
    needLevel: 40,
    gok: ['#33131a', '#170a0d'], parilti: 'rgba(255,80,30,0.30)',
    zemin: { ust: '#3a2b2c', ustAcik: '#463334', ustKoyu: '#2e2223',
             yanSol: '#33211f', yanSag: '#241615', kaya: '#241413', kayaAcik: '#35201e' },
    su: { ana: '#ff5a1f', parlak: '#ffd76e' },
    susler: ['volkan', 'volkanKaya', 'lavCatlak', 'volkanKaya', 'lavCatlak', 'ember', 'kaya', 'ember', 'volkanKaya', 'lavCatlak', 'ember'],
    yuva: 'kor',
    partikul: { tur: 'kor', renk: '#ffb347', adet: 22 },
    duman: true,
    lavAkintisi: true,
  },
  celestial: {
    price: 45000, rarity: 'legendary', nameKey: 'islCelestial', descKey: 'islCelestialD',
    needLevel: 65,
    gok: ['#231a4d', '#0f0b22'], parilti: 'rgba(160,120,255,0.34)',
    zemin: { ust: '#5b4b96', ustAcik: '#6d5aad', ustKoyu: '#4b3d80',
             yanSol: '#3b2f6b', yanSag: '#2a2050', kaya: '#241d47', kayaAcik: '#372c66' },
    su: { ana: '#7a6ff0', parlak: '#c9b7f5' },
    susler: ['kristal', 'parlakBitki', 'kristal', 'yuzenKaya', 'parlakBitki', 'kristal', 'yuzenKaya', 'parlakBitki', 'kristal', 'yuzenKaya', 'parlakBitki'],
    yuva: 'kristal',
    partikul: { tur: 'yildiz', renk: '#e9dcff', adet: 22 },
    yuzenAdacik: true,
  },
  kingdom: {
    price: 110000, rarity: 'mythic', nameKey: 'islKingdom', descKey: 'islKingdomD',
    needLevel: 85,
    gok: ['#2a1f52', '#120d27'], parilti: 'rgba(245,199,74,0.30)',
    zemin: { ust: '#5f5498', ustAcik: '#7265b0', ustKoyu: '#4e4482',
             yanSol: '#3d3470', yanSag: '#2b2454', kaya: '#241d47', kayaAcik: '#3b3070' },
    su: { ana: '#5fc8e8', parlak: '#fff3d0' },
    susler: ['heykel', 'altinYol', 'kristal', 'sutun', 'altinYol', 'selale', 'sutun', 'kristal', 'altinYol', 'yuzenKaya', 'parlakBitki'],
    yuva: 'altin',
    partikul: { tur: 'yildiz', renk: '#ffe9a8', adet: 24 },
    yuzenAdacik: true,
    altinIsik: true,
  },
};

/* Slot anahtarindan katalog tablosuna */
export const KATALOG = {
  color: COLORS,
  skin: SKINS,
  wings: WINGS,
  tail: TAILS,
  head: HEADS,
  face: FACES,
  aura: AURAS,
};

export function parca(slot, id) {
  const tablo = KATALOG[slot];
  return tablo?.[id] ?? tablo?.[VARSAYILAN_GORUNUM[slot]];
}

export function ada(id) {
  return ISLANDS[id] ?? ISLANDS.grassland;
}

/* Bir gorunumun tam paleti: renk + desenin murekkebi + kanat/kuyruk varyanti */
export function palet(look) {
  const renk = COLORS[look.color] || COLORS.ember;
  const desen = SKINS[look.skin] || SKINS.none;
  return {
    ...renk,
    pattern: desen.kind || null,
    ink: desen.ink || renk.dark,
    wings: WINGS[look.wings] || WINGS.leather,
    tail: TAILS[look.tail] || TAILS.basic,
  };
}
