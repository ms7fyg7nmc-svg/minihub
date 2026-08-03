/* Oyunlarin ceviri koprusu.

   Her oyun kendi metinlerini registerTexts() ile buraya kaydeder (yedek olarak).
   Bir metin istendiginde once projenin asil dil sistemine (js/i18n.js) bakariz;
   orada karsilik varsa secili dilde doner, yoksa oyunun kendi metni kullanilir.

   Anahtarlar oyunun icinde kisa yazilir ("score"), asil sozlukte ise oyun adiyla
   birlikte aranir ("match3.score"). */

import { initLang, t as coreT, getLang } from './i18n.js';

let gameId = '';
let fallbackTexts = {};

/** Oyun acilirken kendi yedek metinlerini kaydeder. */
export function registerTexts(id, texts) {
  gameId = id;
  fallbackTexts = texts || {};
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

  const own = fallbackTexts[key];
  return own === undefined ? fullKey : fillParams(own, params);
}

/** Sayfadaki data-i18n ve data-i18n-title etiketli metinleri doldurur. */
export function applyStaticTexts(root = document) {
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
