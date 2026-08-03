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
    'hub.level': 'Level {best}',
    'hub.guest': 'Guest',
    'hub.player': 'Player',
    'hub.language': 'Language',
    'game.2048.title': '2048',
    'game.2048.desc': 'Swipe, merge, reach 2048',
    'game.blockblast.title': 'Block Puzzle',
    'game.blockblast.desc': 'Fill the rows, blast them',
    'game.watersort.title': 'Water Sort',
    'game.watersort.desc': 'Separate the colors into tubes',
    'game.match3.title': 'Match Candy',
    'game.match3.desc': 'Best score in 60 seconds',
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
    'blockblast.title': 'Block Puzzle',
    'blockblast.subtitle': 'Fill rows and columns',
    'blockblast.score': 'SCORE',
    'blockblast.best': 'BEST',
    'blockblast.newGame': 'New Game',
    'blockblast.backToHub': 'Back to Hub',
    'blockblast.hint': 'Hold a piece and drag it onto the board.',
    'blockblast.gameOver': 'Game Over',
    'blockblast.playAgain': 'Play Again',
    'blockblast.yourScore': 'Your score: {score}',
    'blockblast.newRecord': 'New record!',
    'blockblast.earnedPoints': '+{points} hub points earned.',
    'watersort.title': 'Water Sort',
    'watersort.subtitle': 'Make every tube a single color',
    'watersort.level': 'LEVEL',
    'watersort.bestLevel': 'BEST',
    'watersort.undo': 'Undo',
    'watersort.restart': 'Restart',
    'watersort.backToHub': 'Back to Hub',
    'watersort.hint': 'Tap a tube, then tap the one to pour into.',
    'watersort.levelDone': 'Level complete!',
    'watersort.nextLevel': 'Next level',
    'watersort.levelResult': 'Finished in {moves} moves.',
    'watersort.earnedPoints': '+{points} hub points earned.',
    'match3.title': 'Match Candy',
    'match3.subtitle': 'Line up 3 of the same candy',
    'match3.score': 'SCORE',
    'match3.time': 'TIME',
    'match3.best': 'BEST',
    'match3.newGame': 'New Game',
    'match3.backToHub': 'Back to Hub',
    'match3.hint': 'Swipe a candy to swap it with its neighbour.',
    'match3.timeUp': "Time's up",
    'match3.playAgain': 'Play Again',
    'match3.yourScore': 'Your score: {score}',
    'match3.newRecord': 'New record!',
    'match3.earnedPoints': '+{points} hub points earned.',
  },
  tr: {
    'hub.hello': 'Merhaba',
    'hub.title': 'Oyun Hub',
    'hub.subtitle': 'Oyna, puan topla. Puanlar ileride tokena dönüşecek.',
    'hub.gamesTitle': 'Oyunlar',
    'hub.footer': 'Sürüm 0.1 - Faz 1',
    'hub.play': 'Oyna',
    'hub.soon': 'Yakında',
    'hub.record': 'Rekor {best}',
    'hub.level': 'Bölüm {best}',
    'hub.guest': 'Misafir',
    'hub.player': 'Oyuncu',
    'hub.language': 'Dil',
    'game.2048.title': '2048',
    'game.2048.desc': 'Kaydır, birleştir, 2048e ulaş',
    'game.blockblast.title': 'Blok Bulmaca',
    'game.blockblast.desc': 'Satırları doldur, patlat',
    'game.watersort.title': 'Su Sıralama',
    'game.watersort.desc': 'Renkleri tüplerde ayır',
    'game.match3.title': 'Şeker Eşleştir',
    'game.match3.desc': '60 saniyede en yüksek skor',
    'game.runner.title': 'Sonsuz Koşu',
    'game.runner.desc': 'Yakında',
    'g2048.subtitle': 'Aynı sayıları birleştir',
    'g2048.score': 'SKOR',
    'g2048.best': 'REKOR',
    'g2048.newGame': 'Yeni oyun',
    'g2048.backToHub': "Hub'a dön",
    'g2048.hint': 'Parmağınla kaydır (bilgisayarda ok tuşları).',
    'g2048.gameOver': 'Oyun bitti',
    'g2048.playAgain': 'Yeniden oyna',
    'g2048.continue': 'Devam et',
    'g2048.wonText': 'Harika. Devam edip daha yükseğe çıkabilirsin.',
    'g2048.yourScore': 'Skorun: {score}',
    'g2048.newRecord': 'Yeni rekor!',
    'g2048.pointsEarned': '+{earned} hub puanı kazandın.',
    'blockblast.title': 'Blok Bulmaca',
    'blockblast.subtitle': 'Satırları ve sütunları doldur',
    'blockblast.score': 'SKOR',
    'blockblast.best': 'REKOR',
    'blockblast.newGame': 'Yeni oyun',
    'blockblast.backToHub': "Hub'a dön",
    'blockblast.hint': 'Parçayı tut ve tahtaya sürükle.',
    'blockblast.gameOver': 'Oyun bitti',
    'blockblast.playAgain': 'Yeniden oyna',
    'blockblast.yourScore': 'Skorun: {score}',
    'blockblast.newRecord': 'Yeni rekor!',
    'blockblast.earnedPoints': '+{points} hub puanı kazandın.',
    'watersort.title': 'Su Sıralama',
    'watersort.subtitle': 'Her tüpü tek renge indir',
    'watersort.level': 'BÖLÜM',
    'watersort.bestLevel': 'EN İYİ',
    'watersort.undo': 'Geri al',
    'watersort.restart': 'Yeniden',
    'watersort.backToHub': "Hub'a dön",
    'watersort.hint': 'Bir tüpe dokun, sonra dökeceğin tüpe dokun.',
    'watersort.levelDone': 'Bölüm tamam!',
    'watersort.nextLevel': 'Sonraki bölüm',
    'watersort.levelResult': '{moves} hamlede bitirdin.',
    'watersort.earnedPoints': '+{points} hub puanı kazandın.',
    'match3.title': 'Şeker Eşleştir',
    'match3.subtitle': '3 aynı şekeri yan yana getir',
    'match3.score': 'SKOR',
    'match3.time': 'SÜRE',
    'match3.best': 'REKOR',
    'match3.newGame': 'Yeni oyun',
    'match3.backToHub': "Hub'a dön",
    'match3.hint': 'Şekeri komşusuyla değiştirmek için parmağınla it.',
    'match3.timeUp': 'Süre doldu',
    'match3.playAgain': 'Yeniden oyna',
    'match3.yourScore': 'Skorun: {score}',
    'match3.newRecord': 'Yeni rekor!',
    'match3.earnedPoints': '+{points} hub puanı kazandın.',
  },
  es: {
    'hub.hello': 'Hola',
    'hub.title': 'Centro de Juegos',
    'hub.subtitle': 'Juega y gana puntos. Los puntos se convertirán en tokens más adelante.',
    'hub.gamesTitle': 'Juegos',
    'hub.footer': 'Versión 0.1 - Fase 1',
    'hub.play': 'Jugar',
    'hub.soon': 'Pronto',
    'hub.record': 'Récord {best}',
    'hub.level': 'Nivel {best}',
    'hub.guest': 'Invitado',
    'hub.player': 'Jugador',
    'hub.language': 'Idioma',
    'game.2048.title': '2048',
    'game.2048.desc': 'Desliza, combina, llega a 2048',
    'game.blockblast.title': 'Rompecabezas de Bloques',
    'game.blockblast.desc': 'Llena las filas y reviéntalas',
    'game.watersort.title': 'Ordenar Agua',
    'game.watersort.desc': 'Separa los colores en tubos',
    'game.match3.title': 'Combina Caramelos',
    'game.match3.desc': 'Mejor puntuación en 60 segundos',
    'game.runner.title': 'Corredor Infinito',
    'game.runner.desc': 'Pronto',
    'g2048.subtitle': 'Combina números iguales',
    'g2048.score': 'PUNTOS',
    'g2048.best': 'RÉCORD',
    'g2048.newGame': 'Nuevo juego',
    'g2048.backToHub': 'Volver al Hub',
    'g2048.hint': 'Desliza con el dedo (flechas en el ordenador).',
    'g2048.gameOver': 'Juego terminado',
    'g2048.playAgain': 'Jugar de nuevo',
    'g2048.continue': 'Continuar',
    'g2048.wonText': 'Genial. Puedes seguir jugando para conseguir más puntos.',
    'g2048.yourScore': 'Tu puntuación: {score}',
    'g2048.newRecord': '¡Nuevo récord!',
    'g2048.pointsEarned': '+{earned} puntos de hub ganados.',
    'blockblast.title': 'Rompecabezas de Bloques',
    'blockblast.subtitle': 'Llena filas y columnas',
    'blockblast.score': 'PUNTOS',
    'blockblast.best': 'RÉCORD',
    'blockblast.newGame': 'Nuevo juego',
    'blockblast.backToHub': 'Volver al Hub',
    'blockblast.hint': 'Mantén la pieza y arrástrala al tablero.',
    'blockblast.gameOver': 'Juego terminado',
    'blockblast.playAgain': 'Jugar de nuevo',
    'blockblast.yourScore': 'Tu puntuación: {score}',
    'blockblast.newRecord': '¡Nuevo récord!',
    'blockblast.earnedPoints': '+{points} puntos de hub ganados.',
    'watersort.title': 'Ordenar Agua',
    'watersort.subtitle': 'Deja cada tubo de un solo color',
    'watersort.level': 'NIVEL',
    'watersort.bestLevel': 'MEJOR',
    'watersort.undo': 'Deshacer',
    'watersort.restart': 'Reiniciar',
    'watersort.backToHub': 'Volver al Hub',
    'watersort.hint': 'Toca un tubo y luego el tubo donde verterlo.',
    'watersort.levelDone': '¡Nivel completado!',
    'watersort.nextLevel': 'Siguiente nivel',
    'watersort.levelResult': 'Terminado en {moves} movimientos.',
    'watersort.earnedPoints': '+{points} puntos de hub ganados.',
    'match3.title': 'Combina Caramelos',
    'match3.subtitle': 'Alinea 3 caramelos iguales',
    'match3.score': 'PUNTOS',
    'match3.time': 'TIEMPO',
    'match3.best': 'RÉCORD',
    'match3.newGame': 'Nuevo juego',
    'match3.backToHub': 'Volver al Hub',
    'match3.hint': 'Desliza un caramelo para cambiarlo con su vecino.',
    'match3.timeUp': 'Se acabó el tiempo',
    'match3.playAgain': 'Jugar de nuevo',
    'match3.yourScore': 'Tu puntuación: {score}',
    'match3.newRecord': '¡Nuevo récord!',
    'match3.earnedPoints': '+{points} puntos de hub ganados.',
  },
  ru: {
    'hub.hello': 'Привет',
    'hub.title': 'Игровой Хаб',
    'hub.subtitle': 'Играй и зарабатывай очки. Очки позже превратятся в токены.',
    'hub.gamesTitle': 'Игры',
    'hub.footer': 'Версия 0.1 - Этап 1',
    'hub.play': 'Играть',
    'hub.soon': 'Скоро',
    'hub.record': 'Рекорд {best}',
    'hub.level': 'Уровень {best}',
    'hub.guest': 'Гость',
    'hub.player': 'Игрок',
    'hub.language': 'Язык',
    'game.2048.title': '2048',
    'game.2048.desc': 'Свайпай, соединяй, дойди до 2048',
    'game.blockblast.title': 'Блок-головоломка',
    'game.blockblast.desc': 'Заполняй ряды и взрывай',
    'game.watersort.title': 'Сортировка воды',
    'game.watersort.desc': 'Раздели цвета по колбам',
    'game.match3.title': 'Собери сладости',
    'game.match3.desc': 'Лучший счёт за 60 секунд',
    'game.runner.title': 'Бесконечный забег',
    'game.runner.desc': 'Скоро',
    'g2048.subtitle': 'Соединяй одинаковые числа',
    'g2048.score': 'СЧЁТ',
    'g2048.best': 'РЕКОРД',
    'g2048.newGame': 'Новая игра',
    'g2048.backToHub': 'Назад в хаб',
    'g2048.hint': 'Свайпай пальцем (стрелки на компьютере).',
    'g2048.gameOver': 'Игра окончена',
    'g2048.playAgain': 'Играть снова',
    'g2048.continue': 'Продолжить',
    'g2048.wonText': 'Отлично. Можешь продолжать и набрать больше очков.',
    'g2048.yourScore': 'Твой счёт: {score}',
    'g2048.newRecord': 'Новый рекорд!',
    'g2048.pointsEarned': '+{earned} очков хаба заработано.',
    'blockblast.title': 'Блок-головоломка',
    'blockblast.subtitle': 'Заполняй ряды и столбцы',
    'blockblast.score': 'СЧЁТ',
    'blockblast.best': 'РЕКОРД',
    'blockblast.newGame': 'Новая игра',
    'blockblast.backToHub': 'Назад в хаб',
    'blockblast.hint': 'Возьми фигуру и перетащи её на поле.',
    'blockblast.gameOver': 'Игра окончена',
    'blockblast.playAgain': 'Играть снова',
    'blockblast.yourScore': 'Твой счёт: {score}',
    'blockblast.newRecord': 'Новый рекорд!',
    'blockblast.earnedPoints': '+{points} очков хаба заработано.',
    'watersort.title': 'Сортировка воды',
    'watersort.subtitle': 'Сделай каждую колбу одноцветной',
    'watersort.level': 'УРОВЕНЬ',
    'watersort.bestLevel': 'ЛУЧШИЙ',
    'watersort.undo': 'Отменить',
    'watersort.restart': 'Заново',
    'watersort.backToHub': 'Назад в хаб',
    'watersort.hint': 'Нажми на колбу, затем на ту, куда перелить.',
    'watersort.levelDone': 'Уровень пройден!',
    'watersort.nextLevel': 'Следующий уровень',
    'watersort.levelResult': 'Пройдено за {moves} ходов.',
    'watersort.earnedPoints': '+{points} очков хаба заработано.',
    'match3.title': 'Собери сладости',
    'match3.subtitle': 'Собери 3 одинаковые конфеты в ряд',
    'match3.score': 'СЧЁТ',
    'match3.time': 'ВРЕМЯ',
    'match3.best': 'РЕКОРД',
    'match3.newGame': 'Новая игра',
    'match3.backToHub': 'Назад в хаб',
    'match3.hint': 'Проведи пальцем, чтобы поменять конфету с соседней.',
    'match3.timeUp': 'Время вышло',
    'match3.playAgain': 'Играть снова',
    'match3.yourScore': 'Твой счёт: {score}',
    'match3.newRecord': 'Новый рекорд!',
    'match3.earnedPoints': '+{points} очков хаба заработано.',
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
