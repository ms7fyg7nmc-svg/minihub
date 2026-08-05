/* Mini HUB karsilama botu.

   Tek isi var: birisi bota yazdiginda ona hos geldin mesaji ve "Oyna"
   butonunu gondermek. Puan saklamiyor, veritabani yok, kullanici verisi
   tutmuyor - gelen mesaja bakip cevap veriyor, o kadar.

   Nerede calisir: Cloudflare Workers (ucretsiz katman fazlasiyla yeter).
   Kurulum adimlari: KURULUM-BOT.md

   Cloudflare'de tanimlanmasi gereken iki gizli deger:
     BOT_TOKEN       BotFather'in verdigi token
     WEBHOOK_SECRET  kendi uydurdugun uzun bir parola (Telegram disindan
                     gelen sahte isteklerin elenmesi icin)
*/

/* Oyunun adresi ve botun kullanici adi. Degistirirsen buradan degistir. */
const MINI_APP_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/';
const BOT_USERNAME = 'minihubgames_bot';

/* Karsilama mesajinin ustundeki banner gorseli. Ayni repo'da barinir,
   degistirmek istersen bot/assets/banner.png dosyasinin uzerine yaz ve
   GitHub'a yolla - adres ayni kalir. */
const BANNER_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/bot/assets/banner.png';

/* Telegram bize kullanicinin dilini soyluyor; bilmedigimiz bir dilse Ingilizce */
const TEXTS = {
  en: {
    welcome:
      '👋 <b>Welcome to Mini HUB Pocket Games</b>\n\n' +
      'Five mini games, all inside Telegram:\n' +
      '🧮 2048   🧱 Block Puzzle   💧 Water Sort\n' +
      '🍬 Match Candy   🀄 Triple Tile\n\n' +
      'Every game you finish earns hub points. No download, no ads.\n\n' +
      'Tap <b>Play</b> below to start.',
    help:
      '🎮 <b>How it works</b>\n\n' +
      'Open the hub, pick a game, play. Your score is saved automatically ' +
      'and turns into hub points.\n\n' +
      'Your points and records follow your Telegram account, so they stay ' +
      'with you even if you change phone.\n\n' +
      'Tap <b>Play</b> to jump in.',
    nudge: 'Tap <b>Play</b> to open the games 👇',
    play: '🎮 Play',
    invite: '👤 Invite a friend',
    shareText: 'Five mini games right inside Telegram — come beat my score!',
  },
  tr: {
    welcome:
      "👋 <b>Mini HUB Pocket Games'e hoş geldin</b>\n\n" +
      "Telegram'ın içinde beş mini oyun:\n" +
      '🧮 2048   🧱 Blok Bulmaca   💧 Su Sıralama\n' +
      '🍬 Şeker Eşleştir   🀄 Üçlü Eşleştir\n\n' +
      'Bitirdiğin her oyun sana hub puanı kazandırır. İndirme yok, reklam yok.\n\n' +
      'Başlamak için aşağıdaki <b>Oyna</b> düğmesine bas.',
    help:
      '🎮 <b>Nasıl çalışıyor</b>\n\n' +
      'Hub’ı aç, bir oyun seç, oyna. Skorun kendiliğinden kaydedilir ve ' +
      'hub puanına dönüşür.\n\n' +
      'Puanların ve rekorların Telegram hesabına bağlı, telefon değiştirsen ' +
      'bile seninle gelir.\n\n' +
      'Başlamak için <b>Oyna</b>’ya bas.',
    nudge: 'Oyunları açmak için <b>Oyna</b>’ya bas 👇',
    play: '🎮 Oyna',
    invite: '👤 Arkadaşını davet et',
    shareText: "Telegram'ın içinde beş mini oyun — gel skorumu geç bakalım!",
  },
  es: {
    welcome:
      '👋 <b>Bienvenido a Mini HUB Pocket Games</b>\n\n' +
      'Cinco minijuegos, todos dentro de Telegram:\n' +
      '🧮 2048   🧱 Block Puzzle   💧 Water Sort\n' +
      '🍬 Match Candy   🀄 Triple Ficha\n\n' +
      'Cada partida que terminas te da puntos de hub. Sin descargas, sin anuncios.\n\n' +
      'Pulsa <b>Jugar</b> para empezar.',
    help:
      '🎮 <b>Cómo funciona</b>\n\n' +
      'Abre el hub, elige un juego y juega. Tu puntuación se guarda sola y ' +
      'se convierte en puntos de hub.\n\n' +
      'Tus puntos y récords van con tu cuenta de Telegram, así que se quedan ' +
      'contigo aunque cambies de teléfono.\n\n' +
      'Pulsa <b>Jugar</b> para entrar.',
    nudge: 'Pulsa <b>Jugar</b> para abrir los juegos 👇',
    play: '🎮 Jugar',
    invite: '👤 Invitar a un amigo',
    shareText: 'Cinco minijuegos dentro de Telegram: ¡ven a superar mi puntuación!',
  },
  ru: {
    welcome:
      '👋 <b>Добро пожаловать в Mini HUB Pocket Games</b>\n\n' +
      'Пять мини-игр прямо в Telegram:\n' +
      '🧮 2048   🧱 Block Puzzle   💧 Water Sort\n' +
      '🍬 Match Candy   🀄 Тройная плитка\n\n' +
      'За каждую игру начисляются очки хаба. Без загрузок и без рекламы.\n\n' +
      'Нажми <b>Играть</b>, чтобы начать.',
    help:
      '🎮 <b>Как это работает</b>\n\n' +
      'Открой хаб, выбери игру и играй. Счёт сохраняется сам и превращается ' +
      'в очки хаба.\n\n' +
      'Очки и рекорды привязаны к твоему аккаунту Telegram, поэтому останутся ' +
      'с тобой даже при смене телефона.\n\n' +
      'Нажми <b>Играть</b>, чтобы начать.',
    nudge: 'Нажми <b>Играть</b>, чтобы открыть игры 👇',
    play: '🎮 Играть',
    invite: '👤 Пригласить друга',
    shareText: 'Пять мини-игр прямо в Telegram — попробуй побить мой счёт!',
  },
};

function textsFor(languageCode) {
  const lang = String(languageCode || '').slice(0, 2).toLowerCase();
  return TEXTS[lang] || TEXTS.en;
}

/* Mesajin altinda cikan butonlar */
function keyboard(t) {
  const shareUrl =
    'https://t.me/share/url?url=' + encodeURIComponent(`https://t.me/${BOT_USERNAME}`) +
    '&text=' + encodeURIComponent(t.shareText);

  return {
    inline_keyboard: [
      [{ text: t.play, web_app: { url: MINI_APP_URL } }],
      [{ text: t.invite, url: shareUrl }],
    ],
  };
}

async function send(env, chatId, text, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: replyMarkup,
    }),
  });
}

/* Karsilama mesaji banner gorseliyle gider. Diger cevaplar duz metin kalir,
   yoksa kullanici her yazdiginda resim inip sohbeti agirlastirir. */
async function sendWithBanner(env, chatId, caption, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: BANNER_URL,
      caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

export default {
  async fetch(request, env) {
    /* Tarayicidan acilirsa calistigini gostersin */
    if (request.method !== 'POST') {
      return new Response('Mini HUB bot is running.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    /* Telegram disindan gelen sahte istekleri ele.
       Bu basligi Telegram, webhook'u kurarken verdigin gizli sozle gonderiyor. */
    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('ok'); /* bozuk istek: Telegram tekrar denemesin */
    }

    const message = update.message;
    const chatId = message?.chat?.id;
    const incoming = (message?.text || '').trim();

    /* Telegram guncellemeyi basarili saysin diye her durumda 200 donuyoruz */
    if (!chatId) return new Response('ok');

    const t = textsFor(message.from?.language_code);
    const command = incoming.split(/[\s@]/)[0].toLowerCase();

    if (command === '/start' || command === '/play') {
      await sendWithBanner(env, chatId, t.welcome, keyboard(t));
    } else if (command === '/help') {
      await send(env, chatId, t.help, keyboard(t));
    } else {
      /* Bot hicbir mesaji cevapsiz birakmasin */
      await send(env, chatId, t.nudge, keyboard(t));
    }

    return new Response('ok');
  },
};
