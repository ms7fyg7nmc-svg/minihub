/* Oyunlarin ceviri koprusu.

   Her oyun kendi metinlerini registerTexts() ile buraya kaydeder (yedek olarak).
   Bir metin istendiginde once projenin asil dil sistemine (js/i18n.js) bakariz;
   orada karsilik varsa secili dilde doner, yoksa oyunun kendi metni kullanilir.

   Anahtarlar oyunun icinde kisa yazilir ("score"), asil sozlukte ise oyun adiyla
   birlikte aranir ("match3.score"). */

import { initLang, t as coreT, getLang } from './i18n.js?v28';
export { locale } from './i18n.js?v28';

let gameId = '';
let fallbackTexts = {};
let itemTexts = null;

/** Oyun acilirken kendi yedek metinlerini kaydeder. */
export function registerTexts(id, texts) {
  gameId = id;
  fallbackTexts = texts || {};
}

/** Cok dilli item paketi: { en: {...}, tr: {...}, ... }

    Dragon Island'in kozmetik katalogu 60'tan fazla item ve aciklama tutuyor.
    Bunlari js/i18n.js'e koymak ana sozlugu (ve dolayisiyla HUB'in acilisini)
    gereksiz yere sisirirdi; burada kayitli olunca sadece o oyun acildiginda
    yukleniyor. */
export function registerItemTexts(pack) {
  itemTexts = pack || null;
}

/* "{score}" gibi yer tutuculari gercek degerlerle degistirir */
function fillParams(text, params) {
  return String(text).replace(/\{(\w+)\}/g, (match, name) =>
    (params[name] !== undefined ? params[name] : match));
}

/** Metni secili dilde dondurur, bulamazsa oyunun kendi metnini kullanir. */
export function t(key, params = {}) {
  const fullKey = gameId + '.' + key;
  const translated = coreT(fullKey, params);

  /* i18n.js karsilik bulamazsa anahtarin kendisini geri verir */
  if (translated && translated !== fullKey) return translated;

  /* Ortak anahtarlar (ornek: "hub.version") oyun adi olmadan da aranir */
  if (key.includes('.')) {
    const shared = coreT(key, params);
    if (shared && shared !== key) return shared;
  }

  /* Oyunun kendi cok dilli item paketi: once secili dil, sonra Ingilizce */
  if (itemTexts) {
    const dil = getLang();
    const bulunan = itemTexts[dil]?.[key] ?? itemTexts.en?.[key];
    if (bulunan !== undefined) return fillParams(bulunan, params);
  }

  const own = fallbackTexts[key];
  return own === undefined ? fullKey : fillParams(own, params);
}

/** Sayfadaki data-i18n ve data-i18n-title etiketli metinleri doldurur. */
export function applyStaticTexts(root = document) {
  /* Sayfanin dil etiketini secili dile cek */
  document.documentElement.lang = getLang();

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  const titleHolder = root.querySelector('[data-i18n-title]');
  if (titleHolder) document.title = t(titleHolder.dataset.i18nTitle);
}

/* Telegram bulutunda kayitli dil, tarayicidakinden farkli olabilir.
   Bulut cevabi gelince metinleri sessizce tazeleriz. */
initLang().then(() => {
  if (!gameId) return;
  applyStaticTexts();
  document.dispatchEvent(new CustomEvent('langchange', { detail: getLang() }));
});
