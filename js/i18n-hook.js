
import { initLang, t as coreT, getLang } from './i18n.js?v85';
export { locale } from './i18n.js?v85';

let gameId = '';
let fallbackTexts = {};
let itemTexts = null;

export function registerTexts(id, texts) {
  gameId = id;
  fallbackTexts = texts || {};
}

export function registerItemTexts(pack) {
  itemTexts = pack || null;
}

function fillParams(text, params) {
  return String(text).replace(/\{(\w+)\}/g, (match, name) =>
    (params[name] !== undefined ? params[name] : match));
}

const MH_ICON = '<img class="mh-icon" src="../../assets/coin.png" alt="$MH">';

export function mhHtml(text) {
  return String(text).replace(/\$MH/g, MH_ICON);
}

export function t(key, params = {}) {
  const fullKey = gameId + '.' + key;
  const translated = coreT(fullKey, params);

  if (translated && translated !== fullKey) return translated;

  if (key.includes('.')) {
    const shared = coreT(key, params);
    if (shared && shared !== key) return shared;
  }

  if (itemTexts) {
    const dil = getLang();
    const bulunan = itemTexts[dil]?.[key] ?? itemTexts.en?.[key];
    if (bulunan !== undefined) return fillParams(bulunan, params);
  }

  const own = fallbackTexts[key];
  return own === undefined ? fullKey : fillParams(own, params);
}

export function applyStaticTexts(root = document) {
  document.documentElement.lang = getLang();

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.innerHTML = mhHtml(t(el.dataset.i18n));
  });

  const titleHolder = root.querySelector('[data-i18n-title]');
  if (titleHolder) document.title = t(titleHolder.dataset.i18nTitle);
}

initLang().then(() => {
  if (!gameId) return;
  applyStaticTexts();
  document.dispatchEvent(new CustomEvent('langchange', { detail: getLang() }));
});
