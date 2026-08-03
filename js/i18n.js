/* Dil (i18n) destegi.
Varsayilan dil Ingilizce'dir. Kullanicilar hub'a girdiginde ustteki
dil sectiriciden istedikleri an baska bir dile gecebilir. Sectikleri dil
tarayicida ve (varsa) Telegram bulutunda saklanir, boylece bir dahaki
girislerinde ayni dili gorurler. */

export const SUPPORTED_LANGS = ['en', 'tr', 'es', 'ru'];
export const DEFAULT_LANG = 'en';

const LOCALE_MAP = { en: 'en-US', tr: 'tr-TR', es: 'es-ES', ru: 'ru-RU' };
const LABELS = { en: 'EN', tr: 'TR', es: 'ES', ru: 'RU' };

const DICT = {
  en: {
    'hub.hello': 'Hi',
    'hub.title': 'Game Hub',
    'hub.subtitle': 'Play, earn points. Points will turn into tokens later.',
    'hub.gamesTitle': 'Games',
    'hub.footer': 'Version 0.1 - Phase 1',
    'hub.play': 'Play',
    'hub.soon': 'Soon',
    'hub.record': 'Record {best}',
    'hub.guest': 'Guest',
    'hub.player': 'Player',
    'hub.language': 'Language',
    'game.2048.title': '2048',
    'game.2048.desc': 'Swipe, merge, reach 2048',
    'game.match3.title': 'Match Candy',
    'game.match3.desc': 'Soon',
    'game.runner.title': 'Endless Runner',
    'game.runner.desc': 'Soon',
    'g2048.subtitle': 'Merge matching numbers',
    'g2048.score': 'SCORE',
    'g2048.best': 'BEST',
    'g2048.newGame': 'New Game',
    'g2048.backToHub': 'Back to Hub',
    'g2048.hint': 'Swipe with your finger (arrow keys on computer).',
    'g2048.gameOver': 'Game Over',
    'g2048.playAgain': 'Play Again',
    'g2048.continue': 'Continue',
    'g2048.wonText': 'Great job. You can keep going for a higher score.',
    'g2048.yourScore': 'Your score: {score}',
    'g2048.newRecord': 'New record!',
    'g2048.pointsEarned': '+{earned} hub points earned.',
  },
  tr: {
    'hub.hello': 'Merhaba',
    'hub.title': 'Oyun Hub',
    'hub.subtitle': 'Oyna, puan topla. Puanlar ileride tokena donusecek.',
    'hub.gamesTitle': 'Oyunlar',
    'hub.footer': 'Surum 0.1 - Faz 1',
    'hub.play': 'Oyna',
    'hub.soon': 'Yakinda',
    'hub.record': 'Rekor {best}',
    'hub.guest': 'Misafir',
    'hub.player': 'Oyuncu',
    'hub.language': 'Dil',
    'game.2048.title': '2048',
    'game.2048.desc': 'Kaydir, birlestir, 2048e ulas',
    'game.match3.title': 'Seker Eslestir',
    'game.match3.desc': 'Yakinda',
    'game.runner.title': 'Sonsuz Kosu',
    'game.runner.desc': 'Yakinda',
    'g2048.subtitle': 'Ayni sayilari birlestir',
    'g2048.score': 'SKOR',
    'g2048.best': 'REKOR',
    'g2048.newGame': 'Yeni oyun',
    'g2048.backToHub': 'Huba don',
    'g2048.hint': 'Parmaginla kaydir (bilgisayarda ok tuslari).',
    'g2048.gameOver': 'Oyun bitti',
    'g2048.playAgain': 'Yeniden oyna',
    'g2048.continue': 'Devam et',
    'g2048.wonText': 'Harika. Devam edip daha yuksege cikabilirsin.',
    'g2048.yourScore': 'Skorun: {score}',
    'g2048.newRecord': 'Yeni rekor!',
    'g2048.pointsEarned': '+{earned} hub puani kazandin.',
  },
  es: {
    'hub.hello': 'Hola',
    'hub.title': 'Centro de Juegos',
    'hub.subtitle': 'Juega y gana puntos. Los puntos se convertiran en tokens mas adelante.',
    'hub.gamesTitle': 'Juegos',
    'hub.footer': 'Version 0.1 - Fase 1',
    'hub.play': 'Jugar',
    'hub.soon': 'Pronto',
    'hub.record': 'Record {best}',
    'hub.guest': 'Invitado',
    'hub.player': 'Jugador',
    'hub.language': 'Idioma',
    'game.2048.title': '2048',
    'game.2048.desc': 'Desliza, combina, llega a 2048',
    'game.match3.title': 'Combina Caramelos',
    'game.match3.desc': 'Pronto',
    'game.runner.title': 'Corredor Infinito',
    'game.runner.desc': 'Pronto',
    'g2048.subtitle': 'Combina numeros iguales',
    'g2048.score': 'PUNTOS',
    'g2048.best': 'RECORD',
    'g2048.newGame': 'Nuevo juego',
    'g2048.backToHub': 'Volver al Hub',
    'g2048.hint': 'Desliza con el dedo (flechas en el ordenador).',
    'g2048.gameOver': 'Juego terminado',
    'g2048.playAgain': 'Jugar de nuevo',
    'g2048.continue': 'Continuar',
    'g2048.wonText': 'Genial. Puedes seguir jugando para conseguir mas puntos.',
    'g2048.yourScore': 'Tu puntuacion: {score}',
    'g2048.newRecord': 'Nuevo record!',
    'g2048.pointsEarned': '+{earned} puntos de hub ganados.',
  },
  ru: {
    'hub.hello': 'Privet',
    'hub.title': 'Igrovoy Hab',
    'hub.subtitle': 'Igray i zarabatyvay ochki. Ochki pozzhe prevratyatsya v tokeny.',
    'hub.gamesTitle': 'Igry',
    'hub.footer': 'Versiya 0.1 - Etap 1',
    'hub.play': 'Igrat',
    'hub.soon': 'Skoro',
    'hub.record': 'Rekord {best}',
    'hub.guest': 'Gost',
    'hub.player': 'Igrok',
    'hub.language': 'Yazyk',
    'game.2048.title': '2048',
    'game.2048.desc': 'Swipe, soedinyay, doydi do 2048',
    'game.match3.title': 'Soberi Sladosti',
    'game.match3.desc': 'Skoro',
    'game.runner.title': 'Beskonechny Zabeg',
    'game.runner.desc': 'Skoro',
    'g2048.subtitle': 'Soedinyay odinakovye chisla',
    'g2048.score': 'SCHET',
    'g2048.best': 'REKORD',
    'g2048.newGame': 'Novaya igra',
    'g2048.backToHub': 'Nazad v hab',
    'g2048.hint': 'Svaypay paltsem (strelki na kompyutere).',
    'g2048.gameOver': 'Igra okonchena',
    'g2048.playAgain': 'Igrat snova',
    'g2048.continue': 'Prodolzhit',
    'g2048.wonText': 'Otlichno. Mozhesh prodolzhat i nabrat bolshe ochkov.',
    'g2048.yourScore': 'Tvoy schet: {score}',
    'g2048.newRecord': 'Novy rekord!',
    'g2048.pointsEarned': '+{earned} ochkov haba zarabotano.',
  },
};

const tg = window.Telegram?.WebApp ?? null;
const cloud = tg?.CloudStorage ?? null;
const cloudReady = !!cloud && !!tg?.version && parseFloat(tg.version) >= 6.9;

function detectInitial() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch {}
  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(nav) ? nav : DEFAULT_LANG;
}

let currentLang = detectInitial();

/** Telegram bulutunda kayitli bir dil varsa yukler ve uygular. */
export function initLang() {
  return new Promise((resolve) => {
    if (!cloudReady) return resolve(currentLang);
    cloud.getItem('lang', (err, value) => {
      if (!err && value && SUPPORTED_LANGS.includes(value)) {
        currentLang = value;
        try { localStorage.setItem('lang', value); } catch {}
      }
      resolve(currentLang);
    });
  });
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
  if (cloudReady) cloud.setItem('lang', lang, () => {});
  applyTranslations();
  document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

export function t(key, params = {}) {
  const str = (DICT[currentLang] && DICT[currentLang][key]) || DICT[DEFAULT_LANG][key] || key;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
}

export function locale() {
  return LOCALE_MAP[currentLang] || 'en-US';
}

/** Sayfadaki data-i18n etiketli elementlerin metnini gunceller. */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

/** Verilen konteynere bir dil sectirici (select) ekler. */
export function renderLangSwitcher(container) {
  if (!container) return;
  container.innerHTML = '';
  const select = document.createElement('select');
  select.className = 'lang-select';
  select.setAttribute('aria-label', 'Language');
  for (const lang of SUPPORTED_LANGS) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = LABELS[lang] || lang.toUpperCase();
    if (lang === currentLang) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => setLang(select.value));
  container.appendChild(select);
}
