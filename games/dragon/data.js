
export const RARITIES = {
  common:    { sira: 0, renk: '#9aa2b5', nameKey: 'rarCommon' },
  uncommon:  { sira: 1, renk: '#4ecb8b', nameKey: 'rarUncommon' },
  rare:      { sira: 2, renk: '#5b8cff', nameKey: 'rarRare' },
  epic:      { sira: 3, renk: '#c079f2', nameKey: 'rarEpic' },
  legendary: { sira: 4, renk: '#f5b942', nameKey: 'rarLegendary' },
  mythic:    { sira: 5, renk: '#ff6b8a', nameKey: 'rarMythic' },
};

export const SLOTS = [
  { key: 'wings',    title: 'shopWings' },
  { key: 'necklace', title: 'shopNecklaces' },
  { key: 'head',     title: 'shopHeads' },
  { key: 'face',     title: 'shopFaces' },
  { key: 'aura',     title: 'shopAuras' },
];

export const VARSAYILAN_GORUNUM = {
  color: 'ember',
  skin: 'none',
  wings: 'leather',
  necklace: 'none',
  head: 'none',
  face: 'none',
  aura: 'none',
};

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
               aurora: ['#63e6c0', '#5ea8f0', '#9b6ef0', '#f07ac0'],
               needLevel: 75 },
};

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

export const NECKLACES = {
  none:      { price: 0,     rarity: 'common',    nameKey: 'nkNone',     descKey: 'nkNoneD' },
  fang:      { price: 150,   rarity: 'common',    nameKey: 'nkFang',     descKey: 'nkFangD' },
  bronze:    { price: 500,   rarity: 'uncommon',  nameKey: 'nkBronze',   descKey: 'nkBronzeD' },
  sapphire:  { price: 1800,  rarity: 'rare',      nameKey: 'nkSapphire',descKey: 'nkSapphireD' },
  flame:     { price: 9000,  rarity: 'epic',      nameKey: 'nkFlame',   descKey: 'nkFlameD',   needLevel: 35 },
  royal:     { price: 26000, rarity: 'legendary', nameKey: 'nkRoyal',   descKey: 'nkRoyalD',   needLevel: 60 },
  celestial: { price: 58000, rarity: 'mythic',    nameKey: 'nkCelestial',descKey:'nkCelestialD',
               isilti: true, needLevel: 80 },
};

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

export const ISLANDS = {
  grassland: {
    price: 0, rarity: 'common', nameKey: 'islGrass', descKey: 'islGrassD',
    img: 'assets/islands/grassland.jpg',
    partikul: { tur: 'toz', renk: '#ffe9a8', adet: 14 },
  },
  fire: {
    price: 2500, rarity: 'uncommon', nameKey: 'islFire', descKey: 'islFireD',
    img: 'assets/islands/fire.jpg',
    partikul: { tur: 'kor', renk: '#ff9a4d', adet: 16 },
  },
  ice: {
    price: 7000, rarity: 'rare', nameKey: 'islIce', descKey: 'islIceD',
    img: 'assets/islands/ice.jpg',
    partikul: { tur: 'kar', renk: '#ffffff', adet: 20 },
  },
  volcanic: {
    price: 18000, rarity: 'epic', nameKey: 'islVolcanic', descKey: 'islVolcanicD',
    needLevel: 40,
    img: 'assets/islands/volcanic.jpg',
    partikul: { tur: 'kor', renk: '#ffb347', adet: 22 },
  },
  celestial: {
    price: 45000, rarity: 'legendary', nameKey: 'islCelestial', descKey: 'islCelestialD',
    needLevel: 65,
    img: 'assets/islands/celestial.jpg',
    partikul: { tur: 'yildiz', renk: '#e9dcff', adet: 22 },
  },
  kingdom: {
    price: 110000, rarity: 'mythic', nameKey: 'islKingdom', descKey: 'islKingdomD',
    needLevel: 85,
    img: 'assets/islands/kingdom.jpg',
    partikul: { tur: 'yildiz', renk: '#ffe9a8', adet: 24 },
  },
};

/* Butun adalarda ejderha ayni orantisal noktada duruyor (adaya gore ayri
   ayarlanmiyor). Yumurta/kulucka asamasinda tam yuvanin ortasinda, hatch
   sonrasinda ise yuvanin biraz onunde/altinda duruyor - buyumus bir
   ejderhanin kucuk dal yuvasinin icinde oturması tuhaf gorunuyordu. */
export const DRAGON_ANCHOR = {
  egg:   { x: 0.49, y: 0.50, scale: 1.0 },
  grown: { x: 0.49, y: 0.58, scale: 0.88 },
};

export const KATALOG = {
  color: COLORS,
  skin: SKINS,
  wings: WINGS,
  necklace: NECKLACES,
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

export function palet(look) {
  const renk = COLORS[look.color] || COLORS.ember;
  const desen = SKINS[look.skin] || SKINS.none;
  return {
    ...renk,
    pattern: desen.kind || null,
    ink: desen.ink || renk.dark,
    wings: WINGS[look.wings] || WINGS.leather,
  };
}
