import { replayRun as replay2048, CODE_TO_DIR as CODES_2048 } from '../games/2048/logic.js';
import { generatePuzzle as generateFlowPuzzle, validateSolution as validateFlowSolution } from '../games/flow/logic.js';

const MINI_APP_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/';
const BOT_USERNAME = 'minihubgames_bot';
const CHANNEL_URL = 'https://t.me/minihubgames';

const ALLOWED_ORIGIN = 'https://ms7fyg7nmc-svg.github.io';

/* Tavan 24'ten 12'ye indirildi: dolu depo 12 saat yerine 6 saatte
   doluyor, yani oyuncu gun icinde daha sik "dolu" oluyor ve enerji
   gercekten bir sinir gibi hissediliyor. */
const MAX_ENERGY = 12;
const ENERGY_REGEN_MS = 30 * 60 * 1000;
const ENERGY_PER_EARN = 1;
const EMPTY_ENERGY_CARPAN = 0.25;

const STREAK_REWARDS = [200, 300, 400, 600, 800, 1000, 2000];
const STREAK_MIN_GAP_MS = 24 * 3600 * 1000;
const STREAK_RESET_GAP_MS = 48 * 3600 * 1000;

const SPIN_MIN_GAP_MS = 24 * 3600 * 1000;
/* Carkin enerji odulu: UC BIRIM enerji (tam depo degil). */
const SPIN_ENERGY_REWARD = 3;

/* Enerji normalde MAX_ENERGY'de durur ve rejenerasyon oraya kadar doldurur.
   Ama ODUL tavani birkac birim asabiliyor. Sebebi su: deposu doluyken
   carki ceviren oyuncu enerji kazanirsa hicbir sey almamis olurdu -
   "3 enerji kazandin" deyip 0 vermek kotu bir odul. Uc birimlik pay
   birakiliyor, boylece odul her zaman tam olarak odeniyor.
     MAX_ENERGY       rejenerasyonun doldurdugu yer (arayuzdeki "x/12"nin paydasi)
     ENERGY_HARD_CAP  deponun tasiyabilecegi mutlak ust sinir
   Sert tavan olmasaydi carki her gun ceviren biri enerji biriktirirdi. */
const ENERGY_HARD_CAP = MAX_ENERGY + SPIN_ENERGY_REWARD;

const REFERRAL_SIGNUP_BONUS = 1500;

/* DAVET KOMISYONU
   Davet ettigin biri $MH kazandiginda sen de kazaniyorsun. Iki kademe:
   dogrudan davet ettiklerinden %15, ONLARIN davet ettiklerinden %2.5.

   Komisyon oyuncunun kazancindan KESILMIYOR - uretiliyor. Arkadasin
   1000 kazandiysa yine 1000 aliyor, sen ayrica 150 aliyorsun. Kesinti
   olsaydi davet edilen kisi cezalandirilmis olurdu.

   Zincir ikinci kademede DURUYOR; komisyonun kendisi komisyon
   uretmiyor, yoksa bir davet agaci yukari dogru sonsuz carpardi. Iki
   oran da kaynaktaki kazancin uzerinden hesaplaniyor.

   Eskiden bunun yerine arkadasin ejderhasi seviye atladikca odeyen bir
   esik merdiveni vardi (5/15/30/50/75/99). Ejderhalar artik 99'a
   cikmadigi icin ustteki basamaklar hic odenmiyordu. */
const REFERRAL_RATE_DIRECT = 0.25;
const REFERRAL_RATE_INDIRECT = 0.05;

/* Komisyon davet edenin KENDI gunluk tavanini (DAILY_EARN_CAP) tuketmiyor;
   kendi oynadigi oyunlardan ayri bir kalem. Ama sinirsiz da degil: cok
   genis bir davet agaci olan biri gunde yuz binlerce $MH uretebilirdi.
   Bu tavan dogrudan ve dolayli komisyonun TOPLAMI icin gunluktur. */
const REFERRAL_DAILY_CAP = 50000;

/* Carkin TABANI 50 $MH idi. Gunluk seri 200-2000, gorev sandigi 2000
   verirken 50, odulden cok tesellidir - ve carkin dondugu an oyuncunun
   gunde bir kez yasadigi tek "sans" ani. Merdivenin tamami yukseldi,
   sekli (agirliklar) aynen korundu.

   Beklenen deger ~162 $MH'den ~600'e cikti; gunluk serinin ortalamasi
   (~757) ile gorev sandiginin (2000) arasinda duruyor. */
const SPIN_PRIZES = [
  { tur: 'coin',   miktar: 250,         agirlik: 260 },
  { tur: 'coin',   miktar: 400,         agirlik: 250 },
  { tur: 'coin',   miktar: 600,         agirlik: 200 },
  { tur: 'coin',   miktar: 900,         agirlik: 150 },
  { tur: 'coin',   miktar: 1200,        agirlik: 80  },
  { tur: 'coin',   miktar: 1600,        agirlik: 45  },
  { tur: 'enerji', miktar: SPIN_ENERGY_REWARD, agirlik: 10 },
  { tur: 'coin',   miktar: 2500,        agirlik: 5   },
];

const MAX_EARN_PER_REQUEST = 10000;
const DAILY_EARN_CAP = 30000;

const MAX_SPEND_PER_REQUEST = 100000;

const GECERLI_OYUNLAR = new Set([
  '2048', 'blockblast', 'watersort', 'match3', 'tripletile',
  'flow', 'snake', 'coindrop', 'dragon', 'pet', 'wheelrush',
]);

const MAX_STATE_BYTES = 32 * 1024;

const MAX_BEST_SCORE = 10000000;

const MAX_SEED_POINTS = 5000;

// Enerji bitince reklam izleyerek ya da Telegram Stars ile doldurma.
// Sinirsiz enerji olmasin diye HER IKI kaynak da gunde ayri ayri
// ENERGY_REFILL_DAILY_LIMIT kere ile sinirli (bkz. refillSayisiBugun).
const ENERGY_REFILL_AMOUNT = 6;
const ENERGY_REFILL_DAILY_LIMIT = 6;
const ENERGY_REFILL_STAR_PRICE = 25;

function gecerliVeriAnahtari(key) {
  if (key === 'dragon_taban') return false;
  if (typeof key !== 'string') return false;
  const ayrac = key.indexOf('_');
  if (ayrac < 0) return false;
  const tur = key.slice(0, ayrac);
  const oyun = key.slice(ayrac + 1);
  return (tur === 'best' || tur === 'state') && GECERLI_OYUNLAR.has(oyun);
}

function guvenliSayi(deger, max) {
  const n = Math.round(Number(deger));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, max);
}

const BANNER_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/bot/assets/banner.jpg?v=3';

const TEXTS = {
  en: {
    welcome:
      '<b>Welcome to MINI HUB GAMES</b>\n\n' +
      'A pocket full of mini games: puzzles, blocks, candy and more.\n\n' +
      'Spend what you earn raising your own dragon on a floating island.\n\n' +
      'Every game you finish earns hub points, the early form of $MH and ' +
      'part of a growing crypto ecosystem. Nothing to download.\n\n' +
      'Tap <b>Play</b> below to start.',
    help:
      '<b>How it works</b>\n\n' +
      'Open the hub, pick a game, play. Your score is saved automatically ' +
      'and turns into hub points.\n\n' +
      'Your points and records follow your Telegram account, so they stay ' +
      'with you even if you change phone.\n\n' +
      'Tap <b>Play</b> to jump in.',
    nudge: 'Tap <b>Play</b> to open the games',
    play: 'Play',
    invite: 'Invite a friend',
    channel: 'Join our channel',
    shareText: 'A pocket full of mini games. Come beat my score!',
    terms:
      '<b>Terms &amp; Conditions</b>\n\n' +
      'Purchases in MINI HUB GAMES (energy refills) are paid in Telegram Stars ' +
      'and delivered instantly as a digital item inside the game - no physical ' +
      "goods are shipped.\n\nBy paying, you agree these are final digital " +
      "purchases. If something goes wrong (energy not credited, duplicate " +
      "charge), use /paysupport to reach us and we'll make it right.",
    paysupport:
      '<b>Payment support</b>\n\n' +
      'Having an issue with a Stars purchase? Message us at ' + CHANNEL_URL +
      " with your payment date, amount, and what went wrong, and we'll help " +
      'or refund you.',
  },
  tr: {
    welcome:
      "<b>MINI HUB GAMES'e hoş geldin</b>\n\n" +
      'Cebinde bir sürü mini oyun: bulmaca, blok, şeker ve dahası.\n\n' +
      'Kazandığın $MH ile uçan adadaki kendi ejderhanı büyüt.\n\n' +
      'Bitirdiğin her oyun hub puanı kazandırır. Bu puanlar, büyüyen bir ' +
      'kripto ekosisteminin parçası olan $MH’ın ilk hali. İndirme yok.\n\n' +
      'Başlamak için aşağıdaki <b>Oyna</b> düğmesine bas.',
    help:
      '<b>Nasıl çalışıyor</b>\n\n' +
      'Hub’ı aç, bir oyun seç, oyna. Skorun kendiliğinden kaydedilir ve ' +
      'hub puanına dönüşür.\n\n' +
      'Puanların ve rekorların Telegram hesabına bağlı, telefon değiştirsen ' +
      'bile seninle gelir.\n\n' +
      'Başlamak için <b>Oyna</b>’ya bas.',
    nudge: 'Oyunları açmak için <b>Oyna</b>’ya bas',
    play: 'Oyna',
    invite: 'Arkadaşını davet et',
    channel: 'Kanalımıza katıl',
    shareText: "Cebinde bir sürü mini oyun. Gel skorumu geç bakalım!",
    terms:
      '<b>Kullanım Şartları</b>\n\n' +
      'MINI HUB GAMES içindeki satın almalar (enerji dolumu) Telegram Stars ile ' +
      'ödenir ve oyun içinde anında dijital olarak teslim edilir - fiziksel bir ' +
      'gönderim yoktur.\n\nÖdeme yaptığında bunların kesin dijital satın almalar ' +
      'olduğunu kabul etmiş olursun. Bir sorun olursa (enerji yüklenmedi, çift ' +
      'ödeme alındı vb.) /paysupport ile bize ulaş, düzeltelim.',
    paysupport:
      '<b>Ödeme desteği</b>\n\n' +
      'Stars ile yaptığın bir satın almada sorun mu yaşadın? Ödeme tarihini, ' +
      'miktarı ve neyin yanlış gittiğini yazarak ' + CHANNEL_URL + ' üzerinden ' +
      'bize ulaş, yardımcı olalım ya da iade edelim.',
  },
  es: {
    welcome:
      '<b>Bienvenido a MINI HUB GAMES</b>\n\n' +
      'Un bolsillo lleno de minijuegos: puzles, bloques, caramelos y más.\n\n' +
      'Gasta lo que ganes criando tu dragón en una isla flotante.\n\n' +
      'Cada partida que terminas te da puntos de hub, la forma inicial de ' +
      '$MH, parte de un ecosistema cripto en crecimiento. Sin descargas.\n\n' +
      'Pulsa <b>Jugar</b> para empezar.',
    help:
      '<b>Cómo funciona</b>\n\n' +
      'Abre el hub, elige un juego y juega. Tu puntuación se guarda sola y ' +
      'se convierte en puntos de hub.\n\n' +
      'Tus puntos y récords van con tu cuenta de Telegram, así que se quedan ' +
      'contigo aunque cambies de teléfono.\n\n' +
      'Pulsa <b>Jugar</b> para entrar.',
    nudge: 'Pulsa <b>Jugar</b> para abrir los juegos',
    play: 'Jugar',
    invite: 'Invitar a un amigo',
    channel: 'Únete a nuestro canal',
    shareText: 'Un bolsillo lleno de minijuegos: ¡ven a superar mi puntuación!',
    terms:
      '<b>Términos y condiciones</b>\n\n' +
      'Las compras en MINI HUB GAMES (recargas de energía) se pagan con Telegram ' +
      'Stars y se entregan al instante como un artículo digital dentro del juego ' +
      '- no se envía nada físico.\n\nAl pagar, aceptas que son compras digitales ' +
      'finales. Si algo sale mal (energía no acreditada, cobro duplicado), usa ' +
      '/paysupport para contactarnos y lo solucionamos.',
    paysupport:
      '<b>Soporte de pagos</b>\n\n' +
      '¿Tuviste un problema con una compra de Stars? Escríbenos a ' + CHANNEL_URL +
      ' con la fecha del pago, el monto y qué salió mal, y te ayudamos o te ' +
      'reembolsamos.',
  },
  ru: {
    welcome:
      '<b>Добро пожаловать в MINI HUB GAMES</b>\n\n' +
      'Целый карман мини-игр: головоломки, блоки, конфеты и не только.\n\n' +
      'Трать заработанное на своего дракона с летающего острова.\n\n' +
      'За каждую игру начисляются очки хаба, ранняя форма $MH и часть ' +
      'растущей крипто-экосистемы. Без загрузок.\n\n' +
      'Нажми <b>Играть</b>, чтобы начать.',
    help:
      '<b>Как это работает</b>\n\n' +
      'Открой хаб, выбери игру и играй. Счёт сохраняется сам и превращается ' +
      'в очки хаба.\n\n' +
      'Очки и рекорды привязаны к твоему аккаунту Telegram, поэтому останутся ' +
      'с тобой даже при смене телефона.\n\n' +
      'Нажми <b>Играть</b>, чтобы начать.',
    nudge: 'Нажми <b>Играть</b>, чтобы открыть игры',
    play: 'Играть',
    invite: 'Пригласить друга',
    channel: 'Подписаться на канал',
    shareText: 'Целый карман мини-игр. Попробуй побить мой счёт!',
    terms:
      '<b>Условия использования</b>\n\n' +
      'Покупки в MINI HUB GAMES (пополнение энергии) оплачиваются Telegram ' +
      'Stars и доставляются мгновенно как цифровой товар внутри игры - ' +
      'физической доставки нет.\n\nОплачивая, ты соглашаешься, что это ' +
      'окончательные цифровые покупки. Если что-то пошло не так (энергия не ' +
      'начислена, двойное списание), напиши /paysupport, и мы всё исправим.',
    paysupport:
      '<b>Поддержка по платежам</b>\n\n' +
      'Возникла проблема с покупкой Stars? Напиши нам в ' + CHANNEL_URL +
      ', указав дату платежа, сумму и что пошло не так - поможем или вернём ' +
      'деньги.',
  },
};

function parseReferralPayload(startText) {
  const payload = startText.split(/\s+/)[1] || '';
  const eslesme = /^r(\d{1,20})$/.exec(payload);
  return eslesme ? eslesme[1] : null;
}

function textsFor(languageCode) {
  const lang = String(languageCode || '').slice(0, 2).toLowerCase();
  return TEXTS[lang] || TEXTS.en;
}

function keyboard(t, inviterId) {
  const inviteLink = inviterId
    ? `https://t.me/${BOT_USERNAME}?start=r${inviterId}`
    : `https://t.me/${BOT_USERNAME}`;
  const shareUrl =
    'https://t.me/share/url?url=' + encodeURIComponent(inviteLink) +
    '&text=' + encodeURIComponent(t.shareText);

  return {
    inline_keyboard: [
      [{ text: t.play, web_app: { url: MINI_APP_URL } }],
      [{ text: t.invite, url: shareUrl }],
      [{ text: t.channel, url: CHANNEL_URL }],
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

async function sendWithBanner(env, chatId, caption, replyMarkup) {
  try {
    const cevap = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
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
    if (cevap.ok) {
      const sonuc = await cevap.json().catch(() => null);
      if (sonuc?.ok) return;
    }
  } catch {
  }

  await send(env, chatId, caption, replyMarkup);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

async function verifyInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string' || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const enc = new TextEncoder();
  const secretKeyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const secretKeyBytes = await crypto.subtle.sign('HMAC', secretKeyMaterial, enc.encode(botToken));

  const signKey = await crypto.subtle.importKey(
    'raw', secretKeyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', signKey, enc.encode(dataCheckString));
  const hex = [...new Uint8Array(sigBytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

  if (!timingSafeEqual(hex, hash)) return null;

  const authDate = Number(params.get('auth_date')) || 0;
  const ONE_DAY = 24 * 3600;
  if (!authDate || Date.now() / 1000 - authDate > ONE_DAY) return null;

  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    user = null;
  }
  if (!user || !user.id) return null;

  const ad = typeof user.first_name === 'string' ? user.first_name.slice(0, 24) : '';
  return { id: String(user.id), ad, authDate };
}

async function ensurePlayer(env, playerId, initialPoints = 0) {
  const now = Date.now();
  const res = await env.DB.prepare(
    'INSERT INTO players (id, points, energy, energy_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
  ).bind(playerId, initialPoints, MAX_ENERGY, now, now, now).run();
  return res.meta.changes === 1;
}

async function applyReferralSignup(env, playerId) {
  const bekleyen = await env.DB.prepare(
    'SELECT referrer_id FROM pending_referrals WHERE user_id = ?',
  ).bind(playerId).first();
  if (!bekleyen) return;

  await env.DB.prepare('DELETE FROM pending_referrals WHERE user_id = ?').bind(playerId).run();

  const referrerId = bekleyen.referrer_id;
  if (!referrerId || referrerId === playerId) return;

  await env.DB.prepare('UPDATE players SET referrer_id = ? WHERE id = ?').bind(referrerId, playerId).run();

  await ensurePlayer(env, referrerId);
  await applyDelta(env, referrerId, `ref:signup:${playerId}`, REFERRAL_SIGNUP_BONUS);
  await applyDelta(env, playerId, `ref:welcome:${playerId}`, REFERRAL_SIGNUP_BONUS);
}

/* Bir oyuncu kazandiginda zincirde yukari dogru komisyon odiyor.

   op_id'ye KAYNAK oyuncunun kimligi de yaziliyor (`ref1:<kaynak>:<op>`);
   boylece davet eden kisinin ekraninda "bu arkadas sana ne kazandirdi"
   tek bir SQL gruplamasiyla cikariliyor (bkz. handleReferral).

   Idempotentlik kaynagin op_id'sinden geliyor: ayni kazanc iki kez
   gonderilirse komisyon da iki kez odenmiyor. */
async function odeReferralKomisyon(env, kaynakId, opKey, kazanc) {
  if (!(kazanc > 0) || !opKey) return;

  const kaynak = await env.DB.prepare('SELECT referrer_id FROM players WHERE id = ?')
    .bind(kaynakId).first();
  const birinci = kaynak?.referrer_id;
  if (!birinci || String(birinci) === String(kaynakId)) return;

  const ikinciSatir = await env.DB.prepare('SELECT referrer_id FROM players WHERE id = ?')
    .bind(birinci).first();
  const ikinci = ikinciSatir?.referrer_id;

  await komisyonYaz(env, birinci, `ref1:${kaynakId}:${opKey}`,
                    Math.round(kazanc * REFERRAL_RATE_DIRECT));

  /* Dolayli kademe yalnizca UCUNCU bir kisi varsa: zincir A -> B -> C
     iken C'nin kazancindan B %15, A %2.5 aliyor. A ile C ayni kisiyse
     (dairesel davet) odeme yok. */
  if (ikinci && String(ikinci) !== String(birinci) && String(ikinci) !== String(kaynakId)) {
    await komisyonYaz(env, ikinci, `ref2:${kaynakId}:${opKey}`,
                      Math.round(kazanc * REFERRAL_RATE_INDIRECT));
  }
}

/* Gunluk komisyon tavanina gore kirpip yaziyor. Tavan dogrudan ve
   dolayli komisyonun toplamina bakiyor (op_id'si ref1/ref2 ile
   baslayanlar); kayit bonusu (ref:signup) buna dahil degil. */
async function komisyonYaz(env, alanId, opId, miktar) {
  if (!(miktar > 0)) return;
  await ensurePlayer(env, alanId);

  const now = Date.now();
  const pencere = await env.DB.prepare(
    `SELECT COALESCE(SUM(delta), 0) AS toplam FROM spend_log
     WHERE player_id = ? AND created_at > ?
       AND (op_id LIKE 'ref1:%' OR op_id LIKE 'ref2:%')`,
  ).bind(alanId, now - 24 * 3600 * 1000).first();

  const kalan = Math.max(0, REFERRAL_DAILY_CAP - (pencere ? pencere.toplam : 0));
  if (kalan <= 0) return;

  await applyDelta(env, alanId, opId, Math.min(miktar, kalan));
}

/* ---------------- GUNLUK GOREVLER ----------------

   Oyuncunun yarin geri gelmek icin tek sebebi gunluk odul ve carkti;
   ikisi de pasif - ac, al, kapat. Gorev sistemi OYNAMAYI gerektiren ilk
   sebep, ve dokuz oyunu birbirine baglayan ilk sey.

   Gorevler VERITABANINDA TUTULMUYOR. Her gun ucu birden gun numarasindan
   hesaplaniyor; sunucu da istemci de ayni gun icin ayni ucunu bulur.
   Saklanan tek sey oyuncunun ilerlemesi - o da yeni bir tablo degil,
   player_data'daki 'gorev' satiri. Bu anahtar gecerliVeriAnahtari()
   testinden gecmiyor, yani istemci onu /api/state ile yazamaz.

   Her gun bir arcade, bir ejderha, bir genel gorev: boylece yalnizca
   hub oyunlarini oynayan da, yalnizca Dragon Island oynayan da gunun
   icinde bir yere varabiliyor. */

const GOREV_ODUL = 2000;
const GUN_MS = 86400000;

const GOREV_HAVUZ = {
  arcade: [
    { id: 'skor', hedef: 400 },   /* tek bir turda */
    { id: 'oyun', hedef: 3 },     /* farkli oyun */
    { id: 'tur', hedef: 5 },      /* tamamlanan tur */
  ],
  ejderha: [
    { id: 'merge', hedef: 8 },
    { id: 'besle', hedef: 5 },
    { id: 'yumurta', hedef: 3 },
  ],
  genel: [
    { id: 'mh', hedef: 800 },
    { id: 'cark', hedef: 1 },
    { id: 'seri', hedef: 1 },
  ],
};

/* Istemcinin dogrudan bildirebilecegi olaylar. Ejderha icindeki
   birlestirme/besleme sunucuda gorunmuyor - durum tek parca JSON olarak
   kaydediliyor, tek tek hamleler degil. Bu yuzden bunlar bildiriliyor.
   Kotuye kullanim siniri gunde bir sandik: hedefi asan ilerleme ise
   yaramiyor, odul de gune bagli tek bir opId ile oduyor. */
const GOREV_ISTEMCI_OLAYLARI = new Set(['merge', 'besle', 'yumurta']);

const gunNo = (now) => Math.floor(now / GUN_MS);

function gununGorevleri(gun) {
  /* Uc havuz ayri hizda donuyor (gun, gun+1, gun+2) ki ucu birden ayni
     anda basa sarmasin - aksi halde dokuz gunde bir tekrar yerine her
     uc gunde bir ayni ucluyu gorurduk. */
  return [
    GOREV_HAVUZ.arcade[gun % GOREV_HAVUZ.arcade.length],
    GOREV_HAVUZ.ejderha[(gun + 1) % GOREV_HAVUZ.ejderha.length],
    GOREV_HAVUZ.genel[(gun + 2) % GOREV_HAVUZ.genel.length],
  ];
}

async function gorevOku(env, playerId, now) {
  const gun = gunNo(now);
  const row = await env.DB.prepare(
    "SELECT value FROM player_data WHERE player_id = ? AND key = 'gorev'",
  ).bind(playerId).first();

  let v = null;
  try { v = row ? JSON.parse(row.value) : null; } catch { v = null; }
  /* Gun degistiyse sayac sifirlanir; eski satiri silmeye gerek yok,
     uzerine yaziliyor. */
  if (!v || typeof v !== 'object' || v.gun !== gun) return { gun, ilerleme: {}, oyunlar: [], alindi: false };
  if (!v.ilerleme || typeof v.ilerleme !== 'object') v.ilerleme = {};
  if (!Array.isArray(v.oyunlar)) v.oyunlar = [];
  return v;
}

async function gorevYaz(env, playerId, v, now) {
  await env.DB.prepare(
    `INSERT INTO player_data (player_id, key, value, updated_at) VALUES (?, 'gorev', ?, ?)
     ON CONFLICT(player_id, key) DO UPDATE
       SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(playerId, JSON.stringify(v), now).run();
}

function gorevRapor(v) {
  const liste = gununGorevleri(v.gun).map((g) => {
    const ilerleme = Math.min(g.hedef, Math.max(0, Number(v.ilerleme[g.id]) || 0));
    return { id: g.id, hedef: g.hedef, ilerleme, bitti: ilerleme >= g.hedef };
  });
  return {
    gun: v.gun,
    gorevler: liste,
    hepsiBitti: liste.every((g) => g.bitti),
    alindi: !!v.alindi,
    odul: GOREV_ODUL,
    /* Gun sonuna kalan sure: arayuz "yarin yenilenir" diyebilsin diye. */
    kalanMs: (v.gun + 1) * GUN_MS - Date.now(),
  };
}

/* Gorev sayaci ASLA ana islemi bozmamali. Burada atilan bir hata
   oyuncunun puanini yazmayi, rekorunu kaydetmeyi engellerse gorev
   sistemi oyunun kendisinden daha pahaliya mal olur - bu yuzden her sey
   tek bir try/catch icinde ve sessizce vazgeciyor. */
async function gorevKaydet(env, playerId, olay) {
  try {
    const now = Date.now();
    const v = await gorevOku(env, playerId, now);
    const aktif = gununGorevleri(v.gun);
    const varMi = (id) => aktif.some((g) => g.id === id);
    const il = v.ilerleme;
    let degisti = false;

    const topla = (id, n) => {
      if (!varMi(id) || !(n > 0)) return;
      il[id] = (Number(il[id]) || 0) + n;
      degisti = true;
    };
    const enBuyuk = (id, n) => {
      if (!varMi(id) || !(n > 0) || n <= (Number(il[id]) || 0)) return;
      il[id] = n;
      degisti = true;
    };

    if (olay.oyunAdi) {
      topla('tur', 1);
      enBuyuk('skor', Number(olay.skor) || 0);   /* en iyi TEK tur, toplam degil */
      if (varMi('oyun') && !v.oyunlar.includes(olay.oyunAdi)) {
        v.oyunlar.push(olay.oyunAdi);
        il.oyun = v.oyunlar.length;
        degisti = true;
      }
    }
    if (olay.mh) topla('mh', Number(olay.mh) || 0);
    if (olay.cark) topla('cark', 1);
    if (olay.seri) topla('seri', 1);
    if (olay.ejderha) topla(olay.ejderha, Math.min(Number(olay.miktar) || 1, 20));

    if (degisti) await gorevYaz(env, playerId, v, now);
  } catch { /* gorev sayaci oyunu bozmaz */ }
}

async function handleGorev(env, playerId) {
  return gorevRapor(await gorevOku(env, playerId, Date.now()));
}

async function handleGorevOlay(env, playerId, body) {
  const tur = String(body.olay || '').trim();
  if (!GOREV_ISTEMCI_OLAYLARI.has(tur)) return { ok: false, reason: 'bilinmeyen olay' };
  await gorevKaydet(env, playerId, { ejderha: tur, miktar: guvenliSayi(body.miktar, 20) || 1 });
  return { ok: true, ...(await handleGorev(env, playerId)) };
}

async function handleGorevAl(env, playerId) {
  const now = Date.now();
  const v = await gorevOku(env, playerId, now);
  const rapor = gorevRapor(v);
  if (!rapor.hepsiBitti) return { ok: false, reason: 'tamamlanmadi', ...rapor };
  if (v.alindi) return { ok: false, reason: 'alindi', ...rapor };

  v.alindi = true;
  await gorevYaz(env, playerId, v, now);
  /* opId gune bagli: satir yazmayla odeme arasinda bir yaris olsa bile
     ayni gun icin ikinci bir odeme gecmez (applyDelta idempotent). */
  const sonuc = await applyDelta(env, playerId, `gorev:${v.gun}`, GOREV_ODUL);
  return { ok: true, total: sonuc.total, ...gorevRapor(v) };
}

/* ---------------- PROMOSYON KODLARI ----------------

   Kodlar BU DOSYADA tanimli, veritabaninda degil. Yeni bir kod eklemek
   deploy gerektiriyor; bu bir eksiklik degil, tercih: kod listesi
   sunucuda yazili oldugu surece kimse veritabanina satir ekleyerek
   kendine $MH basamaz, ve her kod degisikligi git gecmisinde duruyor.

   Iki cesit kod var:

   - HALKA ACIK kodlar. Oyuncu basina BIR KEZ. Tekrar koruması
     applyDelta'nin op_id'sinden geliyor (`promo:<KOD>`), yani ayni anda
     iki kez gonderilse bile yalnizca biri geciyor.

   - SAHIP kodlari (`sahip: true`). Yalnizca SAHIP_ID kullanabilir ve
     TEKRAR TEKRAR kullanilabilir (`tekrarli: true`) - test ederken ayni
     varligi defalarca almak gerekiyor. Kimlik Telegram initData'dan
     dogrulanarak geldigi icin istemci kendini sahip ilan edemez.

   SURE: `gun` alani kac gun gecerli oldugunu soyluyor; `baslar` da
   baslangic ani. gun = 0 ise kodun suresi yok. Kalan sure cevapta
   `kalanMs` olarak doniyor, arayuz geri sayimi ondan yaziyor. */

const PROMO_GUN_MS = 86400000;

/* Odul alanlari:
     coin     $MH            (sunucuda, aninda)
     enerji   enerji         (sunucuda, sert tavana kirpilir)
     yem      ejderha yemi   (istemcide - Ejderha Adasi acilinca iner)
     yildiz   yildiz         (istemcide)
     nesneler izgara nesnesi (istemcide) [{ t:'egg'|'food'|'star', lv, adet }]

   Ejderha tarafi neden istemcide: ejderha durumu sunucuda tek parca JSON
   olarak duruyor, icindeki yem/yildiz/nesne alanlarini sunucu
   yorumlamiyor. Odul bu yuzden bir "kutu"ya konuyor (player_data ->
   promo_kutu) ve Ejderha Adasi acilinca oradan aliniyor. */

const PROMO_KODLARI = {
  /* --- Halka acik --- */
  'HOSGELDIN': {
    odul: { coin: 5000, enerji: 5 },
    baslar: Date.parse('2026-10-05T00:00:00Z'),
    gun: 7,
  },

  /* --- SAHIP kodlari: yalnizca SAHIP_ID, sinirsiz tekrar --- */
  'MH-COIN-10K':    { sahip: true, tekrarli: true, odul: { coin: 10000 } },
  'MH-COIN-100K':   { sahip: true, tekrarli: true, odul: { coin: 100000 } },
  'MH-ENERJI':      { sahip: true, tekrarli: true, odul: { enerji: ENERGY_HARD_CAP } },

  'DI-YEM-10K':     { sahip: true, tekrarli: true, odul: { yem: 10000 } },
  'DI-YEM-1M':      { sahip: true, tekrarli: true, odul: { yem: 1000000 } },
  'DI-YILDIZ-100':  { sahip: true, tekrarli: true, odul: { yildiz: 100 } },
  'DI-YILDIZ-5K':   { sahip: true, tekrarli: true, odul: { yildiz: 5000 } },

  'DI-YUMURTA-1':   { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'egg', lv: 1, adet: 6 }] } },
  'DI-YUMURTA-4':   { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'egg', lv: 4, adet: 4 }] } },
  'DI-YUMURTA-6':   { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'egg', lv: 6, adet: 3 }] } },
  'DI-YUMURTA-8':   { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'egg', lv: 8, adet: 2 }] } },
  'DI-KAP-1':       { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'food', lv: 1, adet: 4 }] } },
  'DI-KAP-4':       { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'food', lv: 4, adet: 3 }] } },
  'DI-YILDIZKAP-1': { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'star', lv: 1, adet: 4 }] } },
  'DI-YILDIZKAP-4': { sahip: true, tekrarli: true, odul: { nesneler: [{ t: 'star', lv: 4, adet: 3 }] } },

  /* Her seyden bol: hizli bir test kurulumu. */
  'DI-HEPSI': {
    sahip: true, tekrarli: true,
    odul: {
      coin: 100000, enerji: ENERGY_HARD_CAP, yem: 500000, yildiz: 2000,
      nesneler: [
        { t: 'egg', lv: 6, adet: 3 },
        { t: 'egg', lv: 8, adet: 2 },
        { t: 'food', lv: 4, adet: 2 },
        { t: 'star', lv: 4, adet: 2 },
      ],
    },
  },
};

/* Oyuncunun yazdigi seyi kod listesine uyduruyoruz: bosluklar atiliyor,
   buyuk harfe ceviriliyor. "di yumurta 8" ile "DI-YUMURTA-8" ayni sey -
   telefonda yazarken tire koymak zor. */
function promoNormalle(ham) {
  return String(ham || '').trim().toUpperCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

function promoSure(kod, now) {
  if (!kod.gun) return { basladi: true, bitti: false, kalanMs: 0 };
  const bas = Number(kod.baslar) || 0;
  const bitis = bas + kod.gun * PROMO_GUN_MS;
  return { basladi: now >= bas, bitti: now >= bitis, kalanMs: Math.max(0, bitis - now) };
}

const PROMO_NESNE_TURLERI = new Set(['egg', 'food', 'star']);

/* Odulun istemci tarafina ait parcasi (ejderha varliklari). Sunucu
   bunlari yorumlamiyor ama GECERLILIGINI kontrol ediyor - kutuya
   yalnizca tanidigi sekilde veri giriyor. */
function promoIstemciParcasi(odul) {
  const parca = {};
  if (odul.yem > 0) parca.yem = Math.min(10000000, Math.round(odul.yem));
  if (odul.yildiz > 0) parca.yildiz = Math.min(1000000, Math.round(odul.yildiz));
  if (Array.isArray(odul.nesneler)) {
    const temiz = odul.nesneler
      .filter((n) => n && PROMO_NESNE_TURLERI.has(n.t))
      .map((n) => ({
        t: n.t,
        lv: Math.max(1, Math.min(n.t === 'egg' ? 8 : 4, Math.round(Number(n.lv) || 1))),
        adet: Math.max(1, Math.min(20, Math.round(Number(n.adet) || 1))),
      }));
    if (temiz.length) parca.nesneler = temiz;
  }
  return Object.keys(parca).length ? parca : null;
}

async function promoKutuyaKoy(env, playerId, parca, now) {
  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare(
      "SELECT value, version FROM player_data WHERE player_id = ? AND key = 'promo_kutu'",
    ).bind(playerId).first();

    if (!row) {
      const res = await env.DB.prepare(
        `INSERT OR IGNORE INTO player_data (player_id, key, value, version, updated_at)
         VALUES (?, 'promo_kutu', ?, 1, ?)`,
      ).bind(playerId, JSON.stringify([parca]), now).run();
      if (res.meta.changes > 0) return true;
      continue;                         /* araya baskasi girdi, bastan oku */
    }

    let liste = [];
    try { liste = JSON.parse(row.value); } catch { liste = []; }
    if (!Array.isArray(liste)) liste = [];
    /* Kutu sinirsiz buyumesin: hic acmayan bir hesapta birikmesin. */
    if (liste.length >= 50) liste.shift();
    liste.push(parca);

    const res = await env.DB.prepare(
      `UPDATE player_data SET value = ?, version = version + 1, updated_at = ?
       WHERE player_id = ? AND key = 'promo_kutu' AND version = ?`,
    ).bind(JSON.stringify(liste), now, playerId, row.version).run();
    if (res.meta.changes > 0) return true;
  }
  return false;
}

/* Kutuyu OKUYUP AYNI ANDA bosaltiyor. Iki ayri cagri olsaydi (once oku,
   sonra sil) arada kopan bir baglanti odulu iki kez verdirirdi. */
async function handlePromoKutu(env, playerId) {
  const now = Date.now();
  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare(
      "SELECT value, version FROM player_data WHERE player_id = ? AND key = 'promo_kutu'",
    ).bind(playerId).first();
    if (!row) return { ok: true, parcalar: [] };

    let liste = [];
    try { liste = JSON.parse(row.value); } catch { liste = []; }
    if (!Array.isArray(liste) || liste.length === 0) return { ok: true, parcalar: [] };

    const res = await env.DB.prepare(
      `UPDATE player_data SET value = '[]', version = version + 1, updated_at = ?
       WHERE player_id = ? AND key = 'promo_kutu' AND version = ?`,
    ).bind(now, playerId, row.version).run();
    if (res.meta.changes > 0) return { ok: true, parcalar: liste };
  }
  return { ok: false, reason: 'yeniden dene', parcalar: [] };
}

async function handlePromo(env, playerId, body) {
  const ad = promoNormalle(body.kod);
  if (!ad || ad.length > 40) return { ok: false, reason: 'gecersiz' };

  const kod = PROMO_KODLARI[ad];
  if (!kod) return { ok: false, reason: 'gecersiz' };

  /* Sahip kontrolu kimlige bagli: initData Telegram tarafindan
     imzalaniyor, istemci kendini sahip ilan edemiyor. */
  if (kod.sahip && String(playerId) !== SAHIP_ID) return { ok: false, reason: 'gecersiz' };

  const now = Date.now();
  const sure = promoSure(kod, now);
  if (!sure.basladi) return { ok: false, reason: 'henuz-baslamadi' };
  if (sure.bitti) return { ok: false, reason: 'suresi-doldu' };

  const opId = kod.tekrarli ? `promo:${ad}:${crypto.randomUUID()}` : `promo:${ad}`;

  if (!kod.tekrarli) {
    const once = await env.DB.prepare(
      'SELECT 1 FROM spend_log WHERE player_id = ? AND op_id = ?',
    ).bind(playerId, opId).first();
    if (once) return { ok: false, reason: 'kullanilmis' };
  }

  const odul = kod.odul || {};
  const coin = Math.max(0, Math.min(10000000, Math.round(Number(odul.coin) || 0)));

  /* applyDelta op_id'yi ATOMIK olarak sahipleniyor; iki es zamanli istek
     gelse bile yalnizca biri odulu veriyor. coin 0 olsa bile cagriliyor,
     cunku "bu kod kullanildi" isaretini o satir tutuyor. */
  const sonuc = await applyDelta(env, playerId, opId, coin);

  let enerji = null;
  const istenenEnerji = Math.max(0, Math.min(ENERGY_HARD_CAP, Math.round(Number(odul.enerji) || 0)));
  if (istenenEnerji > 0) {
    const row = await env.DB.prepare('SELECT energy, energy_at FROM players WHERE id = ?')
      .bind(playerId).first();
    const tz = row ? enerjiTazele(row, now) : null;
    if (tz) {
      const yeni = Math.min(ENERGY_HARD_CAP, tz.energy + istenenEnerji);
      await env.DB.prepare('UPDATE players SET energy = ?, energy_at = ?, updated_at = ? WHERE id = ?')
        .bind(yeni, tz.energyAt, now, playerId).run();
      enerji = yeni;
    }
  }

  const parca = promoIstemciParcasi(odul);
  if (parca) await promoKutuyaKoy(env, playerId, parca, now);

  return {
    ok: true,
    kod: ad,
    odul: { coin, enerji: istenenEnerji, ...(parca || {}) },
    total: sonuc.total,
    energy: enerji,
    /* Ejderha varligi varsa arayuz "Ejderha Adasi'nda seni bekliyor"
       diyebilsin diye. */
    ejderhada: !!parca,
    kalanMs: sure.kalanMs,
  };
}

function streakDurumu(row, now) {
  const sonAlim = row.last_claim_at || 0;
  const gecenSure = sonAlim ? now - sonAlim : Infinity;
  const canClaim = gecenSure >= STREAK_MIN_GAP_MS;
  const devamEdiyor = sonAlim > 0 && gecenSure <= STREAK_RESET_GAP_MS;
  const gelecekGun = devamEdiyor ? (row.streak_count % STREAK_REWARDS.length) + 1 : 1;
  return {
    count: row.streak_count,
    canClaim,
    nextDay: gelecekGun,
    nextReward: STREAK_REWARDS[gelecekGun - 1],
    nextInMs: canClaim ? 0 : STREAK_MIN_GAP_MS - gecenSure,
    rewards: STREAK_REWARDS,
    broken: sonAlim > 0 && gecenSure > STREAK_RESET_GAP_MS,
  };
}

function enerjiTazele(row, now) {
  const son = row.energy_at || now;
  /* Kirpma SERT tavana gore, yumusak olana gore degil. Eskiden burada
     MAX_ENERGY'ye kirpiliyordu; o haliyle carkin uc depoluk odulu bir
     sonraki okumada sessizce 12'ye dusurulur, oyuncu kazandigi seyi
     hic goremezdi. Tavani asan enerji artik duruyor ve harcanabiliyor;
     kirpma yalnizca akil disi degerlere karsi (ornegin eski bir
     surumden kalan) son bir emniyet. */
  const mevcut = Math.min(ENERGY_HARD_CAP, row.energy);
  const kirpildi = mevcut !== row.energy;
  const kazanilan = Math.floor((now - son) / ENERGY_REGEN_MS);
  if (kazanilan <= 0) return { energy: mevcut, energyAt: son, degisti: !row.energy_at || kirpildi };
  /* Rejenerasyon YUMUSAK tavanda duruyor: depo oduller sayesinde 12'nin
     ustundeyse zaman gecmesi onu daha da doldurmuyor. */
  const yeni = mevcut >= MAX_ENERGY ? mevcut : Math.min(MAX_ENERGY, mevcut + kazanilan);
  const yeniAt = yeni >= MAX_ENERGY ? now : son + kazanilan * ENERGY_REGEN_MS;
  return { energy: yeni, energyAt: yeniAt, degisti: true };
}

function spinDurumu(row, now) {
  const sonCark = row.last_spin_at || 0;
  const gecenSure = sonCark ? now - sonCark : Infinity;
  const canSpin = gecenSure >= SPIN_MIN_GAP_MS;
  return { canSpin, nextInMs: canSpin ? 0 : SPIN_MIN_GAP_MS - gecenSure };
}

function carkCek() {
  const toplam = SPIN_PRIZES.reduce((s, p) => s + p.agirlik, 0);
  let r = Math.random() * toplam;
  for (let i = 0; i < SPIN_PRIZES.length; i++) {
    r -= SPIN_PRIZES[i].agirlik;
    if (r < 0) return i;
  }
  return SPIN_PRIZES.length - 1;
}

async function handleSync(env, playerId, body, ad) {
  const now = Date.now();
  const seedPoints = guvenliSayi(body.points, MAX_SEED_POINTS);
  const isNew = await ensurePlayer(env, playerId, seedPoints);

  if (ad) await env.DB.prepare('UPDATE players SET name = ? WHERE id = ?').bind(ad, playerId).run();

  const gelenState = (body.state && typeof body.state === 'object') ? body.state : {};

  if (isNew) {
    await applyReferralSignup(env, playerId);

    const stmts = [];
    let ejderhaKaydedildi = null;
    for (const [key, value] of Object.entries(gelenState)) {
      if (!gecerliVeriAnahtari(key)) continue;
      // best_* skorlar da mevcut oyuncularin senkron yolundaki gibi tavana
      // kirpiliyor - aksi halde ilk senkron devasa/sacma bir rekoru oldugu
      // gibi kaydediyordu (points alaninin aksine buraya kirpma yoktu).
      const toWrite = key.startsWith('best_') ? guvenliSayi(value, MAX_BEST_SCORE) : value;
      const json = JSON.stringify(toWrite);
      if (json.length > MAX_STATE_BYTES) continue;
      stmts.push(env.DB.prepare(
        'INSERT INTO player_data (player_id, key, value, updated_at) VALUES (?, ?, ?, ?)',
      ).bind(playerId, key, json, now));
      if (key === 'state_dragon') ejderhaKaydedildi = toWrite;
    }
    if (stmts.length) await env.DB.batch(stmts);

    // Ilk senkronda gelen ejderha durumu icin de "taban" maliyeti hemen
    // kilitleniyor - aksi halde bu satir hic olusmuyordu ve ayni hesap ilk
    // gercek /api/state cagrisinda TEKRAR sinirsiz bir iddiayla tabani
    // sisirebiliyordu (iki ayri bedava hamle). Ilk iddia yine de oldugu
    // gibi kabul edilir (yerel ilerlemeyi Telegram'a tasima senaryosu icin
    // kasitli), ama bundan sonraki her yukselis gercek harcamayla sinirlanir.
    if (ejderhaKaydedildi && typeof ejderhaKaydedildi === 'object') {
      await ejderhaIddiasiReddedilsinMi(env, playerId, ejderhaKaydedildi, now);
    }
  } else {
    const stmts = [];
    for (const [key, value] of Object.entries(gelenState)) {
      if (!key.startsWith('best_') || !gecerliVeriAnahtari(key)) continue;
      const skor = guvenliSayi(value, MAX_BEST_SCORE);
      stmts.push(env.DB.prepare(
        `INSERT INTO player_data (player_id, key, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(player_id, key) DO UPDATE
           SET value = excluded.value, updated_at = excluded.updated_at
           WHERE CAST(player_data.value AS INTEGER) < ?`,
      ).bind(playerId, key, JSON.stringify(skor), now, skor));
    }
    if (stmts.length) await env.DB.batch(stmts);
  }

  const player = await env.DB.prepare(
    'SELECT points, energy, energy_at, streak_count, last_claim_at, last_spin_at FROM players WHERE id = ?',
  ).bind(playerId).first();

  const enj = enerjiTazele(player, now);
  if (enj.degisti) {
    await env.DB.prepare('UPDATE players SET energy = ?, energy_at = ? WHERE id = ?')
      .bind(enj.energy, enj.energyAt, playerId).run();
    player.energy = enj.energy;
    player.energy_at = enj.energyAt;
  }
  const rows = await env.DB.prepare('SELECT key, value, version FROM player_data WHERE player_id = ?').bind(playerId).all();

  const state = {};
  const meta = {};
  let gorevSatiri = null;
  let promoBekleyen = 0;
  for (const r of rows.results) {
    /* 'gorev' ham ilerleme sayaci - istemcinin isine yaramaz, asagida
       islenmis haliyle ayri bir alanda gidiyor. */
    if (r.key === 'gorev') { try { gorevSatiri = JSON.parse(r.value); } catch { gorevSatiri = null; } continue; }
    /* promo_kutu Ejderha Adasi'nin alacagi ham odul listesi - hub'in
       state'ine girmesinin anlami yok, yalnizca "bekleyen var mi"
       bilgisi asagida gidiyor. */
    if (r.key === 'promo_kutu') {
      try { promoBekleyen = (JSON.parse(r.value) || []).length; } catch { promoBekleyen = 0; }
      continue;
    }
    state[r.key] = JSON.parse(r.value);
    meta[r.key] = r.version;
  }

  const gorevDurum = (gorevSatiri && gorevSatiri.gun === gunNo(now))
    ? gorevSatiri
    : { gun: gunNo(now), ilerleme: {}, oyunlar: [], alindi: false };

  const [adSayi, starSayi] = await Promise.all([
    refillSayisiBugun(env, playerId, 'ad'),
    refillSayisiBugun(env, playerId, 'star'),
  ]);

  return {
    points: player.points,
    energy: player.energy,
    maxEnergy: MAX_ENERGY,
    energyNextMs: player.energy >= MAX_ENERGY
      ? 0 : Math.max(0, ENERGY_REGEN_MS - (now - player.energy_at)),
    energyRefill: {
      amount: ENERGY_REFILL_AMOUNT,
      dailyLimit: ENERGY_REFILL_DAILY_LIMIT,
      adLeft: Math.max(0, ENERGY_REFILL_DAILY_LIMIT - adSayi),
      starLeft: Math.max(0, ENERGY_REFILL_DAILY_LIMIT - starSayi),
      starPrice: ENERGY_REFILL_STAR_PRICE,
    },
    streak: streakDurumu(player, now),
    gorev: gorevRapor(gorevDurum),
    promoBekleyen,
    spin: { ...spinDurumu(player, now), prizes: SPIN_PRIZES.map((p) => ({ tur: p.tur, miktar: p.miktar })) },
    state,
    meta,
    // Bu oyuncuya kapali olan oyunlar. Sahipte bos dizi doner.
    bakim: [...bakimdakiOyunlar(env)].filter((g) => bakimdaMi(env, playerId, g)),
  };
}

async function applyDelta(env, playerId, opId, delta) {
  const key = opId || crypto.randomUUID();
  const now = Date.now();

  const prior = await env.DB.prepare(
    'SELECT balance_after FROM spend_log WHERE player_id = ? AND op_id = ?',
  ).bind(playerId, key).first();
  if (prior) return { ok: true, total: prior.balance_after };

  // op_id'yi bakiyeye dokunmadan ONCE atomik olarak "isliyorum" diye
  // isaretliyoruz. Ayni op_id ile es zamanli iki istek yukaridaki SELECT'i
  // ikisi de bos gorup gecebilir - ama bu INSERT'i sadece biri "kazanir"
  // (player_id+op_id PRIMARY KEY), digeri bakiyeye hic dokunmadan erken
  // donuyor. Onceden bu INSERT en sonda oluyordu, iki istek de UPDATE'i
  // calistirip bakiyeyi iki kez degistirebiliyordu (ikinci INSERT sadece
  // sonradan, gec kalmis sekilde cakisiyordu).
  const claim = await env.DB.prepare(
    'INSERT OR IGNORE INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, ?, 0, ?)',
  ).bind(playerId, key, delta, now).run();

  if (claim.meta.changes === 0) {
    const row = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
    return { ok: true, total: row ? row.points : 0 };
  }

  if (delta < 0) {
    const gerekli = -delta;
    const res = await env.DB.prepare(
      'UPDATE players SET points = points + ?, updated_at = ? WHERE id = ? AND points >= ?',
    ).bind(delta, now, playerId, gerekli).run();

    if (res.meta.changes === 0) {
      await env.DB.prepare('DELETE FROM spend_log WHERE player_id = ? AND op_id = ?').bind(playerId, key).run();
      const row = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
      return { ok: false, total: row ? row.points : 0 };
    }
  } else if (delta > 0) {
    await env.DB.prepare(
      'UPDATE players SET points = points + ?, updated_at = ? WHERE id = ?',
    ).bind(delta, now, playerId).run();
  }

  const row = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
  const total = row ? row.points : 0;

  await env.DB.prepare(
    'UPDATE spend_log SET balance_after = ? WHERE player_id = ? AND op_id = ?',
  ).bind(total, playerId, key).run();

  return { ok: true, total };
}

async function applyEarn(env, playerId, opId, requestedAmount) {
  const key = opId || crypto.randomUUID();
  const now = Date.now();

  const prior = await env.DB.prepare(
    'SELECT balance_after FROM spend_log WHERE player_id = ? AND op_id = ?',
  ).bind(playerId, key).first();
  if (prior) {
    const guncel = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    return { ok: true, total: guncel ? guncel.points : prior.balance_after, energy: guncel ? guncel.energy : 0, credited: 0 };
  }

  // Ayni sebep: op_id'yi hesaplamadan ONCE iddia ediyoruz ki es zamanli bir
  // ikinci istek gunluk tavan hesabini ve enerji dusumunu TEKRARLAMASIN.
  const claim = await env.DB.prepare(
    'INSERT OR IGNORE INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, 0, 0, ?)',
  ).bind(playerId, key, now).run();
  if (claim.meta.changes === 0) {
    const guncel = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    return { ok: true, total: guncel ? guncel.points : 0, energy: guncel ? guncel.energy : 0, credited: 0 };
  }

  const pencere = await env.DB.prepare(
    'SELECT COALESCE(SUM(delta), 0) AS toplam FROM spend_log WHERE player_id = ? AND delta > 0 AND created_at > ?',
  ).bind(playerId, now - 24 * 3600 * 1000).first();
  const kalanHak = Math.max(0, DAILY_EARN_CAP - (pencere ? pencere.toplam : 0));

  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare('SELECT energy, energy_at FROM players WHERE id = ?').bind(playerId).first();
    const tz = row ? enerjiTazele(row, now) : { energy: 0, energyAt: now };
    const enerji = tz.energy;
    const doluMu = enerji > 0;
    const hamMiktar = doluMu ? requestedAmount : Math.round(requestedAmount * EMPTY_ENERGY_CARPAN);
    const verilecek = Math.min(hamMiktar, kalanHak);
    const yeniEnerji = doluMu ? Math.max(0, enerji - ENERGY_PER_EARN) : 0;

    const yeniAt = enerji >= MAX_ENERGY && yeniEnerji < MAX_ENERGY ? now : tz.energyAt;
    const res = await env.DB.prepare(
      'UPDATE players SET points = points + ?, energy = ?, energy_at = ?, updated_at = ? WHERE id = ? AND energy = ?',
    ).bind(verilecek, yeniEnerji, yeniAt, now, playerId, row ? row.energy : 0).run();

    if (res.meta.changes === 0) continue;

    const player = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
    const total = player.points;

    await env.DB.prepare(
      'UPDATE spend_log SET delta = ?, balance_after = ? WHERE player_id = ? AND op_id = ?',
    ).bind(verilecek, total, playerId, key).run();

    await gorevKaydet(env, playerId, { mh: verilecek });

    /* Davet zincirine komisyon. Oyuncunun aldigi miktardan kesilmiyor,
       uzerine uretiliyor (bkz. REFERRAL_RATE_DIRECT). */
    await odeReferralKomisyon(env, playerId, key, verilecek);

    return { ok: true, total, energy: yeniEnerji, credited: verilecek };
  }

  // 3 deneme de enerji CAS'inde kaybettiyse (ayni oyuncunun cok nadir gorulen
  // es zamanli farkli istekleri): applyDelta'yi TEKRAR cagirmiyoruz - bu
  // op_id zaten yukarida iddia edildigi icin applyDelta onu "zaten var"
  // sanip hicbir sey uygulamadan donerdi. Indirimli miktari dogrudan
  // uyguluyoruz.
  const azaltilmis = Math.min(Math.round(requestedAmount * EMPTY_ENERGY_CARPAN), kalanHak);
  if (azaltilmis > 0) {
    await env.DB.prepare('UPDATE players SET points = points + ?, updated_at = ? WHERE id = ?')
      .bind(azaltilmis, now, playerId).run();
  }
  const row = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
  const total = row ? row.points : 0;
  await env.DB.prepare('UPDATE spend_log SET delta = ?, balance_after = ? WHERE player_id = ? AND op_id = ?')
    .bind(azaltilmis, total, playerId, key).run();
  return { ok: true, total, energy: 0, credited: azaltilmis };
}

async function handleEnergySpend(env, playerId, opId) {
  const key = opId || crypto.randomUUID();
  const now = Date.now();

  const prior = await env.DB.prepare(
    'SELECT balance_after FROM spend_log WHERE player_id = ? AND op_id = ?',
  ).bind(playerId, key).first();
  if (prior) {
    const guncel = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    return { ok: true, total: guncel ? guncel.points : prior.balance_after, energy: guncel ? guncel.energy : 0 };
  }

  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare('SELECT energy, energy_at, points FROM players WHERE id = ?').bind(playerId).first();
    if (!row) return { ok: false, reason: 'oyuncu yok' };

    const tz = enerjiTazele(row, now);
    const yeniEnerji = Math.max(0, tz.energy - 1);
    const res = await env.DB.prepare(
      'UPDATE players SET energy = ?, energy_at = ?, updated_at = ? WHERE id = ? AND energy = ?',
    ).bind(yeniEnerji, tz.energyAt, now, playerId, row.energy).run();

    if (res.meta.changes === 0) continue;

    await env.DB.prepare(
      'INSERT INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, 0, ?, ?)',
    ).bind(playerId, key, row.points, now).run();

    return { ok: true, total: row.points, energy: yeniEnerji };
  }
  return { ok: false, reason: 'yeniden dene' };
}

// kaynak: 'ad' (Adsgram reklami) veya 'star' (Telegram Stars odemesi).
// Ikisi de spend_log'da 'energy:<kaynak>:...' onekiyle ayri ayri sayiliyor,
// gunluk ENERGY_REFILL_DAILY_LIMIT'i asan istekler reddediliyor.
async function refillSayisiBugun(env, playerId, kaynak) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM spend_log WHERE player_id = ? AND op_id LIKE ? AND created_at > ?",
  ).bind(playerId, `energy:${kaynak}:%`, Date.now() - 24 * 3600 * 1000).first();
  return row ? row.n : 0;
}

// opId burada TAM anahtar (orn. 'energy:ad:<uuid>' ya da
// 'energy:star:<telegram_payment_charge_id>') - cagiran taraf onekliyor,
// boylece refillSayisiBugun'daki LIKE deseni her zaman dogru sayiyor.
async function applyEnergyRefill(env, playerId, opId, kaynak) {
  const now = Date.now();

  const prior = await env.DB.prepare(
    'SELECT 1 FROM spend_log WHERE player_id = ? AND op_id = ?',
  ).bind(playerId, opId).first();
  if (prior) {
    const guncel = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    return { ok: true, total: guncel ? guncel.points : 0, energy: guncel ? guncel.energy : 0 };
  }

  const sayi = await refillSayisiBugun(env, playerId, kaynak);
  if (sayi >= ENERGY_REFILL_DAILY_LIMIT) return { ok: false, reason: 'gunluk-limit' };

  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    if (!row) return { ok: false, reason: 'oyuncu yok' };

    const yeniEnerji = Math.min(MAX_ENERGY, row.energy + ENERGY_REFILL_AMOUNT);
    const res = await env.DB.prepare(
      'UPDATE players SET energy = ?, updated_at = ? WHERE id = ? AND energy = ?',
    ).bind(yeniEnerji, now, playerId, row.energy).run();
    if (res.meta.changes === 0) continue;

    await env.DB.prepare(
      'INSERT INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, 0, ?, ?)',
    ).bind(playerId, opId, row.points, now).run();

    return { ok: true, total: row.points, energy: yeniEnerji };
  }
  return { ok: false, reason: 'yeniden dene' };
}

async function handleAdRefill(env, playerId, opId) {
  const key = `energy:ad:${opId || crypto.randomUUID()}`;
  return applyEnergyRefill(env, playerId, key, 'ad');
}

// Sadece bir Telegram Stars fatura linki uretir - gercek odul, botun
// successful_payment webhook'unda (fetch handler'daki pre_checkout_query/
// successful_payment bloklari) uygulanir, burada degil.
async function handleStarInvoice(env, playerId) {
  if (!env.BOT_TOKEN) return { error: 'sunucu yapilandirilmamis' };

  const sayi = await refillSayisiBugun(env, playerId, 'star');
  if (sayi >= ENERGY_REFILL_DAILY_LIMIT) return { error: 'gunluk-limit' };

  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Energy Refill',
      description: `+${ENERGY_REFILL_AMOUNT} energy`,
      payload: `energy_refill:${playerId}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: `+${ENERGY_REFILL_AMOUNT} Energy`, amount: ENERGY_REFILL_STAR_PRICE }],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!data?.ok) return { error: 'fatura-hatasi' };
  return { link: data.result };
}

async function handleStreakClaim(env, playerId) {
  const now = Date.now();
  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare(
      'SELECT streak_count, last_claim_at FROM players WHERE id = ?',
    ).bind(playerId).first();
    if (!row) return { ok: false, reason: 'oyuncu yok' };

    const durum = streakDurumu(row, now);
    if (!durum.canClaim) return { ok: false, reason: 'erken', nextInMs: durum.nextInMs, streak: durum.count };

    const res = await env.DB.prepare(
      `UPDATE players SET points = points + ?, streak_count = ?, last_claim_at = ?, updated_at = ?
       WHERE id = ? AND last_claim_at = ?`,
    ).bind(durum.nextReward, durum.nextDay, now, now, playerId, row.last_claim_at).run();

    if (res.meta.changes === 0) continue;

    const player = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
    await gorevKaydet(env, playerId, { seri: 1 });
    return {
      ok: true,
      streak: durum.nextDay,
      reward: durum.nextReward,
      total: player.points,
      durum: streakDurumu({ streak_count: durum.nextDay, last_claim_at: now }, now),
    };
  }
  return { ok: false, reason: 'yeniden dene' };
}

async function handleSpin(env, playerId) {
  const now = Date.now();
  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare('SELECT last_spin_at FROM players WHERE id = ?').bind(playerId).first();
    if (!row) return { ok: false, reason: 'oyuncu yok' };

    const durum = spinDurumu(row, now);
    if (!durum.canSpin) return { ok: false, reason: 'erken', nextInMs: durum.nextInMs };

    const index = carkCek();
    const odul = SPIN_PRIZES[index];

    /* Enerji odulu EKLENIYOR, atanmiyor. Eskiden `energy = MAX_ENERGY`
       yaziliyordu, yani odul "deposunu doldur" demekti; artik "uc birim
       ekle". MIN ile sert tavani asmiyor. */
    const sql = odul.tur === 'enerji'
      ? 'UPDATE players SET energy = MIN(?, energy + ?), last_spin_at = ?, updated_at = ? WHERE id = ? AND last_spin_at = ?'
      : 'UPDATE players SET points = points + ?, last_spin_at = ?, updated_at = ? WHERE id = ? AND last_spin_at = ?';

    const res = odul.tur === 'enerji'
      ? await env.DB.prepare(sql).bind(ENERGY_HARD_CAP, odul.miktar, now, now, playerId, row.last_spin_at).run()
      : await env.DB.prepare(sql).bind(odul.miktar, now, now, playerId, row.last_spin_at).run();
    if (res.meta.changes === 0) continue;

    const player = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    await gorevKaydet(env, playerId, { cark: 1 });
    return {
      ok: true,
      index,
      prize: odul,
      total: player.points,
      energy: player.energy,
      durum: spinDurumu({ last_spin_at: now }, now),
    };
  }
  return { ok: false, reason: 'yeniden dene' };
}

const FIYAT = {
  color: { ocean: 350, emerald: 800, royal: 1800, obsidian: 4000, frost: 9000, celestial: 20000, aurora: 45000 },
  skin: { stripes: 100, flame: 300, tribal: 700, lightning: 1600, runes: 3600, armor: 8000, cosmic: 18000, celestial: 40000 },
  wings: { flame: 450, crystal: 1000, demon: 2300, phoenix: 5200, lightning: 11700, king: 26000, celestial: 58000 },
  tail: { spiked: 350, flame: 800, crystal: 1800, demon: 4000, lightning: 9000, king: 20000, celestial: 45000 },
  head: { tiny: 150, bronze: 400, silver: 900, golden: 2000, flame: 4400, ice: 10000, king: 22000, celestial: 50000 },
  face: { scar: 80, twinScar: 200, warPaint: 500, darkMark: 1100, flameFace: 2400, runeFace: 5400, demon: 12000, kingMark: 27000 },
  aura: { sparkle: 120, ember: 350, frost: 800, electric: 1800, shadow: 4000, golden: 9000, cosmic: 20000, celestial: 45000 },
  island: { fire: 2500, ice: 7000, volcanic: 18000, celestial: 45000, kingdom: 110000 },
};

const xpGerekli = (seviye) => 2 + Math.floor(seviye / 8);
const beslemeUcreti = (seviye) => 8 + Math.floor(seviye * 1.5);

function seviyeMaliyeti(seviye) {
  let toplam = 0;
  for (let l = 1; l < Math.min(seviye, 99); l++) toplam += xpGerekli(l) * beslemeUcreti(l);
  return toplam;
}

const BEDAVA_XP_GUNLUK = 6;

function iddiaMaliyeti(durum, hesapYasiGun) {
  const ejderha = durum?.dragons?.[0];
  if (!ejderha) return 0;

  const seviye = Math.max(1, Math.min(99, Number(ejderha.level) || 1));
  let toplamXp = 0;
  for (let l = 1; l < seviye; l++) toplamXp += xpGerekli(l);
  const bedavaXp = Math.min(toplamXp, hesapYasiGun * BEDAVA_XP_GUNLUK + BEDAVA_XP_GUNLUK);
  const odenenOran = toplamXp > 0 ? Math.max(0, (toplamXp - bedavaXp) / toplamXp) : 0;
  let maliyet = Math.round(seviyeMaliyeti(seviye) * odenenOran);

  const dolap = durum?.owned || {};
  for (const [slot, idler] of Object.entries(dolap)) {
    const tablo = FIYAT[slot];
    if (!tablo || !Array.isArray(idler)) continue;
    for (const id of idler) maliyet += tablo[id] || 0;
  }
  for (const id of (durum?.ownedIslands || [])) maliyet += FIYAT.island[id] || 0;

  return maliyet;
}

/* ---------------- OYUN ODEME TABLOSU ----------------

   EN BUYUK ACIK BURADAYDI.

   $MH bolucusu yalnizca ISTEMCIDE duruyordu (her oyunun kendi
   POINTS_DIVISOR'u). Sunucu ise /api/points/earn'e gelen sayiya
   inaniyordu: "bana 10.000 $MH ver". Oyun oynamaya hic gerek yoktu -
   dogru adrese dogru govdeyi gondermek yetiyordu, gunluk tavana kadar.

   Artik bolucu SUNUCUDA ve odemeyi sunucu hesapliyor. Istemci yalnizca
   SKORU soyleyebiliyor; o skor da oyun basina gercekci bir tavana
   kirpiliyor. Hile icin artik skoru da uydurmak gerekiyor, ve uydurulan
   skorun ustune cikabilecegi bir tavan var.

   tavan: TEK BIR KOSUDA ulasilabilecek en yuksek skor. Rekor da zaten
   tek bir kosunun skoru oldugu icin ayni sayi ikisini birden kapiyor.
   Sayilar GERCEKCI tutuldu, comert degil: tavan ayni zamanda tek bir
   istekte alinabilecek en yuksek $MH'i belirliyor (tavan / bolucu).
   10.000.000'luk tek tip tavan hicbir seyi kesmiyordu.

   Bunun KAPATMADIGI sey: gunluk tavana kadar (DAILY_EARN_CAP) uydurma
   skor gondermek hala mumkun. Onu tam kapatan tek sey her oyun icin
   /api/game/start + /api/game/finish tekrar dogrulamasi - 2048 ve
   flow'da oldugu gibi. Kalan yedi oyun icin yapilacak is bu. */

const OYUN_ODEME = {
  /* 2048 ve flow ZATEN dogrulaniyor (bkz. GAME_RUNNERS) - tavanlari
     yalnizca akil disi degerlere karsi. */
  '2048':     { bolucu: 23,  tavan: 300000 },
  blockblast: { bolucu: 9,   tavan: 50000 },
  coindrop:   { bolucu: 100, tavan: 60000 },
  match3:     { bolucu: 19,  tavan: 60000 },
  snake:      { bolucu: 5,   tavan: 15000 },
  /* tripletile'in kendi SCORE_CAP'i 3600; tavan ondan geliyor. */
  tripletile: { bolucu: 6,   tavan: 3600 },
  wheelrush:  { bolucu: 10,  tavan: 60000 },
  /* watersort'ta skor = ulasilan SEVIYE, odeme seviyeye gore bir formul. */
  watersort:  { formul: 'watersort', tavan: 300 },
  /* flow dogrulanmis yoldan (/api/game/finish) odeniyor; skor = seviye. */
  flow:       { bolucu: 0,   tavan: 1000 },
  /* Ejderha Adasi $MH KAZANDIRMIYOR - yalnizca harciyor. Skoru ayri bir
     olcekte oldugu icin tavani da yuksek. */
  dragon:     { bolucu: 0,   tavan: 100000000 },
  pet:        { bolucu: 0,   tavan: 1000000 },
};

/* watersort'un odemesi istemcideki formulun aynisi (bkz.
   games/watersort/watersort.js pointsFor). Seviye arttikca renk ve
   kapasite artiyor, odeme de onunla. */
function watersortOdeme(seviye) {
  const lv = Math.max(1, Math.min(300, Math.round(seviye) || 1));
  const renk = lv <= 13 ? Math.min(3 + Math.floor((lv - 1) / 2), 9)
    : lv <= 24 ? 9
      : Math.min(9 + Math.floor((lv - 25) / 3) + 1, 12);
  const kapasite = lv < 14 ? 4 : Math.min(4 + Math.floor((lv - 14) / 4) + 1, 7);
  return 90 + (renk - 3) * 5 + (kapasite - 4) * 8;
}

const oyunTavani = (game) => OYUN_ODEME[game]?.tavan ?? MAX_BEST_SCORE;

/* Bir skorun kac $MH ettigi. Bilinmeyen oyun ya da odeme yapmayan oyun
   icin 0 - "bilmiyorsam odeme yapma" tarafinda hata yapiyoruz. */
function skorOdemesi(game, skor) {
  const kural = OYUN_ODEME[game];
  if (!kural) return 0;
  const temiz = Math.max(0, Math.min(kural.tavan, Math.round(Number(skor) || 0)));
  if (kural.formul === 'watersort') return temiz > 0 ? watersortOdeme(temiz) : 0;
  if (!kural.bolucu) return 0;
  return Math.floor(temiz / kural.bolucu);
}

const LIDER_LIMIT = 50;

// Sahibin Telegram kimligi. Bakim kilidi ve liderlik tablosu ayni kaynagi
// kullaniyor ki iki yerde birbirini tutmayan kimlik olmasin.
const SAHIP_ID = '8100679296';

/* Bakimdaki oyunlar: SAHIP_ID disindaki herkese kapali.
   Varsayilan kodda duruyor ama Cloudflare'deki BAKIM degiskeni onu eziyor,
   boylece bakim kod deploy etmeden acilip kapanabiliyor (bos deger = bakim yok).
   Dragon Island yeni merge surumuyle 2026-09-26'da herkese acildi; liste
   simdilik bos, bir oyunu kapatmak gerekirse buraya ya da BAKIM degiskenine
   yazmak yeterli. */
const BAKIM_VARSAYILAN = '';

function bakimdakiOyunlar(env) {
  const ham = env && env.BAKIM !== undefined && env.BAKIM !== null
    ? String(env.BAKIM) : BAKIM_VARSAYILAN;
  return new Set(ham.split(',').map((s) => s.trim()).filter(Boolean));
}

function bakimdaMi(env, playerId, game) {
  if (String(playerId) === SAHIP_ID) return false;
  return bakimdakiOyunlar(env).has(game);
}

const LIDER_HARIC = new Set([SAHIP_ID]);
// Haric tutulan (sahip) hesap listede hic gorunmuyor, ama kendi ekranindaki
// widget bos/tire kalmasin diye sabit bir siralama numarasi gosteriliyor.
const HARIC_GOSTERILEN_SIRA = 99;

async function handleLeaderboard(env, playerId) {
  const kazanc = `p.points + COALESCE((SELECT -SUM(s.delta) FROM spend_log s
                    WHERE s.player_id = p.id AND s.delta < 0), 0)`;

  const haric = [...LIDER_HARIC];
  const haricSql = haric.length ? `WHERE p.id NOT IN (${haric.map(() => '?').join(',')})` : '';

  const rows = await env.DB.prepare(
    `SELECT p.id, p.name, ${kazanc} AS kazanilan
     FROM players p ${haricSql} ORDER BY kazanilan DESC, p.created_at ASC LIMIT ?`,
  ).bind(...haric, LIDER_LIMIT).all();

  const liste = rows.results.map((r, i) => ({
    sira: i + 1,
    ad: r.name || '',
    kazanilan: r.kazanilan,
    ben: r.id === playerId,
  }));

  if (LIDER_HARIC.has(playerId)) {
    const benim = await env.DB.prepare(
      `SELECT ${kazanc} AS kazanilan FROM players p WHERE p.id = ?`,
    ).bind(playerId).first();
    return {
      liste,
      kendi: { sira: HARIC_GOSTERILEN_SIRA, ad: '', kazanilan: benim ? benim.kazanilan : 0, ben: true },
      haric: true,
      toplam: liste.length,
    };
  }

  let kendi = liste.find((x) => x.ben) || null;
  if (!kendi) {
    const benim = await env.DB.prepare(
      `SELECT ${kazanc} AS kazanilan FROM players p WHERE p.id = ?`,
    ).bind(playerId).first();
    if (benim) {
      const ust = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM players p
         WHERE ${kazanc} > ?${haric.length ? ` AND p.id NOT IN (${haric.map(() => '?').join(',')})` : ''}`,
      ).bind(benim.kazanilan, ...haric).first();
      kendi = { sira: (ust?.n || 0) + 1, ad: '', kazanilan: benim.kazanilan, ben: true };
    }
  }

  return { liste, kendi, toplam: liste.length };
}

async function handleReferral(env, playerId) {
  /* 'ref%' uc kalemi birden yakaliyor: ref:signup (kayit bonusu),
     ref1: (dogrudan komisyon), ref2: (dolayli komisyon). Eskiden
     'ref:%' yaziyordu; komisyon op_id'leri iki nokta tasimadigi icin
     o desen artik yetmezdi. */
  const kazanc = await env.DB.prepare(
    "SELECT COALESCE(SUM(delta), 0) AS toplam FROM spend_log WHERE player_id = ? AND op_id LIKE 'ref%'",
  ).bind(playerId).first();

  /* Arkadas basina komisyon. op_id 'ref1:<arkadasId>:<op>' bicimindeki
     ortadaki parcayi ayirip tek sorguda gruplayabiliyoruz - arkadas
     basina ayri sorgu atmaya gerek kalmiyor. */
  const komisyon = await env.DB.prepare(
    `SELECT substr(op_id, 6, instr(substr(op_id, 6), ':') - 1) AS arkadas,
            COALESCE(SUM(delta), 0) AS toplam
     FROM spend_log
     WHERE player_id = ? AND op_id LIKE 'ref1:%'
     GROUP BY arkadas`,
  ).bind(playerId).all();
  const basina = new Map((komisyon.results || []).map((r) => [String(r.arkadas), r.toplam]));

  /* Dolayli kademe toplami ayri gosteriliyor: oyuncunun "agacin ikinci
     katindan" ne kazandigini gormesi, sistemin calistigini anlatan sey. */
  const dolayli = await env.DB.prepare(
    "SELECT COALESCE(SUM(delta), 0) AS toplam FROM spend_log WHERE player_id = ? AND op_id LIKE 'ref2:%'",
  ).bind(playerId).first();

  const rows = await env.DB.prepare(
    `SELECT id, name FROM players WHERE referrer_id = ? ORDER BY created_at DESC LIMIT 100`,
  ).bind(playerId).all();

  const arkadaslar = rows.results.map((r) => ({
    ad: r.name || '',
    kazandirdi: basina.get(String(r.id)) || 0,
  }));

  return {
    toplamKazanc: kazanc ? kazanc.toplam : 0,
    dolayliKazanc: dolayli ? dolayli.toplam : 0,
    sayi: arkadaslar.length,
    arkadaslar,
  };
}

async function handleBest(env, playerId, body) {
  const game = String(body.game || '').trim();
  if (!GECERLI_OYUNLAR.has(game)) return { error: 'bilinmeyen oyun' };
  if (bakimdaMi(env, playerId, game)) return { error: 'bakimda' };
  const key = `best_${game}`;
  /* Tek tip 10.000.000 tavani yerine OYUNUN kendi tavani. */
  const score = guvenliSayi(body.score, oyunTavani(game));
  const now = Date.now();

  const res = await env.DB.prepare(
    `INSERT INTO player_data (player_id, key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id, key) DO UPDATE
       SET value = excluded.value, updated_at = excluded.updated_at
       WHERE CAST(player_data.value AS INTEGER) < ?`,
  ).bind(playerId, key, JSON.stringify(score), now, score).run();

  const isRecord = res.meta.changes === 1;

  const row = await env.DB.prepare('SELECT value FROM player_data WHERE player_id = ? AND key = ?')
    .bind(playerId, key).first();
  const best = row ? Number(JSON.parse(row.value)) || 0 : score;

  await gorevKaydet(env, playerId, { oyunAdi: game, skor: score });

  /* ODEMEYI SUNUCU YAPIYOR. Istemci artik ayrica /api/points/earn
     cagirmiyor; kac $MH ettigini burada hesapliyoruz. opId kosuya degil
     ISTEGE bagli (body.opId), yani ag tekrarinda ikinci kez odenmiyor. */
  const kazanc = skorOdemesi(game, score);
  let earn = null;
  if (kazanc > 0) {
    earn = await applyEarn(env, playerId, String(body.opId || '') || crypto.randomUUID(), kazanc);
  }

  /* Kazanc satirlari applyEarn'den oldugu gibi geciyor: `earned` yeni ad,
     `credited`/`total`/`energy` eski sozlesmeyle ayni - istemcinin ve
     testlerin iki ayri sekil ogrenmesine gerek yok. */
  return {
    best,
    isRecord,
    earned: earn ? (earn.credited || 0) : 0,
    credited: earn ? (earn.credited || 0) : 0,
    total: earn ? earn.total : undefined,
    energy: earn ? earn.energy : undefined,
  };
}

// Skor-sahteciligine karsi "replay"/"cozum dogrulama" olan oyunlar. Sunucu
// tohumu (seed) kendisi uretir, istemci ne yaptigini (hamle listesi ya da
// nihai cozum) bildirir, sunucu bunu KENDI mantigiyla (games/<oyun>/logic.js)
// bagimsiz olarak dogrulayip GERCEK skoru kendisi hesaplar - istemcinin
// iddia ettigi skor asla krediye girmiyor. Her oyun kendi start()/finish()
// mantigini tanimlar; ortak kosu(run)/idempotent-kredi iskeleti asagida.
const RUN_MAX_MOVES = 20000;
// games/2048/2048.js'teki POINTS_DIVISOR ile AYNI olmali.
const GAME_2048_DIVISOR = 23;
const GAME_2048_MOVE_CODES = new Set(Object.keys(CODES_2048));
// games/flow/flow.js'teki POINTS_PER_LEVEL ile AYNI olmali.
const FLOW_POINTS_PER_LEVEL = 48;
// 8x8'lik en buyuk Flow tahtasinin tum hucre sayisi - tek bir yolun asla
// asamayacagi guvenli bir ust sinir.
const FLOW_MAX_PATH_CELLS = 64;

async function upsertBestScore(env, playerId, game, score) {
  const bestKey = `best_${game}`;
  const now = Date.now();
  const bestRes = await env.DB.prepare(
    `INSERT INTO player_data (player_id, key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id, key) DO UPDATE
       SET value = excluded.value, updated_at = excluded.updated_at
       WHERE CAST(player_data.value AS INTEGER) < ?`,
  ).bind(playerId, bestKey, JSON.stringify(score), now, score).run();
  const isRecord = bestRes.meta.changes === 1;
  const bestRow = await env.DB.prepare('SELECT value FROM player_data WHERE player_id = ? AND key = ?')
    .bind(playerId, bestKey).first();
  const best = bestRow ? Number(JSON.parse(bestRow.value)) || 0 : score;
  return { best, isRecord };
}

async function readBestScore(env, playerId, game) {
  const bestRow = await env.DB.prepare('SELECT value FROM player_data WHERE player_id = ? AND key = ?')
    .bind(playerId, `best_${game}`).first();
  return bestRow ? Number(JSON.parse(bestRow.value)) || 0 : 0;
}

const GAME_RUNNERS = {
  '2048': {
    async start() {
      const seed = Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
      return { seed, extra: {} };
    },
    async finish(env, playerId, run, body) {
      const movesGiris = Array.isArray(body.moves) ? body.moves : [];
      if (movesGiris.length > RUN_MAX_MOVES || !movesGiris.every((m) => GAME_2048_MOVE_CODES.has(m))) {
        return { ok: false, reason: 'gecersiz-hamle-listesi' };
      }

      const { score: hamSkor } = replay2048(run.seed, movesGiris, RUN_MAX_MOVES);
      const verifiedScore = guvenliSayi(hamSkor, MAX_BEST_SCORE);
      const earnAmount = guvenliSayi(Math.floor(verifiedScore / GAME_2048_DIVISOR), MAX_EARN_PER_REQUEST);
      const { best, isRecord } = await upsertBestScore(env, playerId, '2048', verifiedScore);
      return { ok: true, score: verifiedScore, best, isRecord, earnAmount };
    },
  },
  flow: {
    // Seviye (level) istemciden GELMIYOR - "bir sonraki seviye" her zaman
    // sunucunun kendi kaydettigi best_flow + 1'dir, boylece bir istemci
    // dogrudan yuksek bir seviye numarasi iddia edip atlama yapamaz.
    async start(env, playerId) {
      const currentBest = await readBestScore(env, playerId, 'flow');
      const level = currentBest + 1;
      const seed = Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
      return { seed, extra: { level } };
    },
    async finish(env, playerId, run, body) {
      const level = guvenliSayi(run.level, 100000);
      if (!level) return { ok: false, reason: 'gecersiz-seviye' };

      const puzzle = generateFlowPuzzle(level, run.seed);
      const pathsGiris = Array.isArray(body.paths) ? body.paths : null;
      const sekilUygun = pathsGiris
        && pathsGiris.length === puzzle.endpoints.length
        && pathsGiris.every((p) => Array.isArray(p) && p.length <= FLOW_MAX_PATH_CELLS);
      if (!sekilUygun) return { ok: false, reason: 'gecersiz-cozum-sekli' };

      if (!validateFlowSolution(puzzle.size, puzzle.endpoints, pathsGiris)) {
        return { ok: false, reason: 'cozum-dogrulanamadi' };
      }

      const { best, isRecord } = await upsertBestScore(env, playerId, 'flow', level);
      return { ok: true, score: level, best, isRecord, earnAmount: FLOW_POINTS_PER_LEVEL };
    },
  },
};

async function handleGameStart(env, playerId, game) {
  if (bakimdaMi(env, playerId, game)) return { error: 'bakimda' };
  const runner = GAME_RUNNERS[game];
  if (!runner) return { error: 'desteklenmeyen oyun' };

  const { seed, extra } = await runner.start(env, playerId);
  const runId = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO player_data (player_id, key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id, key) DO UPDATE
       SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(playerId, `run_${game}`, JSON.stringify({ seed, runId, startedAt: now, ...extra }), now).run();

  return { seed, runId, ...extra };
}

async function handleGameFinish(env, playerId, game, body) {
  if (bakimdaMi(env, playerId, game)) return { error: 'bakimda' };
  const runner = GAME_RUNNERS[game];
  if (!runner) return { error: 'desteklenmeyen oyun' };

  const runId = String(body.runId || '');
  if (!runId) return { ok: false, reason: 'gecersiz-runId' };

  const runSatir = await env.DB.prepare(
    'SELECT value FROM player_data WHERE player_id = ? AND key = ?',
  ).bind(playerId, `run_${game}`).first();
  if (!runSatir) return { ok: false, reason: 'aktif-kosu-yok' };

  let run;
  try { run = JSON.parse(runSatir.value); } catch { run = null; }
  // runId eslesmiyorsa: baska bir sekme/oturum ayni oyun icin YENI bir
  // /api/game/start cagirip bu satiri ustune yazmis demektir - eski
  // hamleleri/cozumu YANLIS tohuma/seviyeye karsi degerlendirmek yerine
  // dogrudan reddediyoruz.
  if (!run || run.runId !== runId) return { ok: false, reason: 'kosu-uyusmuyor' };

  const sonuc = await runner.finish(env, playerId, run, body);
  if (!sonuc.ok) return sonuc;

  const opId = `game:${game}:${runId}`;
  let earnResult;
  if (sonuc.earnAmount > 0) {
    // applyEarn kendi op_id kontroluyle idempotent - ayni runId ikinci kez
    // gelirse (ag tekrari vb.) burada TEKRAR kredi verilmiyor, ilk sonuc
    // aynen donuyor.
    earnResult = await applyEarn(env, playerId, opId, sonuc.earnAmount);
  } else {
    const oyuncu = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
    earnResult = { total: oyuncu ? oyuncu.points : 0, credited: 0 };
  }

  /* Dogrulanmis yol /api/best'e ugramiyor, gorev sayaci oraya bagli
     olsaydi 2048 ve flow hicbir gorevi ilerletmezdi. */
  await gorevKaydet(env, playerId, { oyunAdi: game, skor: sonuc.score });

  return {
    ok: true,
    score: sonuc.score,
    best: sonuc.best,
    isRecord: sonuc.isRecord,
    earned: earnResult.credited || 0,
    total: earnResult.total,
  };
}

async function ejderhaIddiasiReddedilsinMi(env, playerId, durum, now) {
  if (!durum || typeof durum !== 'object') return false;

  const oyuncu = await env.DB.prepare('SELECT created_at FROM players WHERE id = ?')
    .bind(playerId).first();
  const yasGun = oyuncu ? Math.max(0, (now - oyuncu.created_at) / 86400000) : 0;

  const iddia = iddiaMaliyeti(durum, yasGun);

  const h = await env.DB.prepare(
    'SELECT COALESCE(-SUM(delta), 0) AS toplam FROM spend_log WHERE player_id = ? AND delta < 0',
  ).bind(playerId).first();
  const harcama = h ? h.toplam : 0;

  const tabanSatir = await env.DB.prepare(
    "SELECT value FROM player_data WHERE player_id = ? AND key = 'dragon_taban'",
  ).bind(playerId).first();

  if (!tabanSatir) {
    await env.DB.prepare(
      `INSERT INTO player_data (player_id, key, value, version, updated_at)
       VALUES (?, 'dragon_taban', ?, 1, ?)`,
    ).bind(playerId, JSON.stringify({ maliyet: iddia }), now).run();
    return false;
  }

  let taban = 0;
  try { taban = JSON.parse(tabanSatir.value).maliyet || 0; } catch { taban = 0; }

  return iddia > taban + harcama;
}

async function handleState(env, playerId, body) {
  const game = String(body.game || '').trim();
  if (!GECERLI_OYUNLAR.has(game)) return { error: 'bilinmeyen oyun' };
  if (bakimdaMi(env, playerId, game)) return { error: 'bakimda' };
  const key = `state_${game}`;
  const now = Date.now();
  const expected = Number(body.expectedVersion) || 0;
  const valueJson = JSON.stringify(body.state ?? null);

  if (valueJson.length > MAX_STATE_BYTES) {
    const mevcut = await env.DB.prepare('SELECT value, version FROM player_data WHERE player_id = ? AND key = ?')
      .bind(playerId, key).first();
    return mevcut
      ? { state: JSON.parse(mevcut.value), version: mevcut.version }
      : { state: null, version: 0 };
  }

  if (game === 'dragon') {
    const red = await ejderhaIddiasiReddedilsinMi(env, playerId, body.state, now);
    if (red) {
      const mevcut = await env.DB.prepare(
        'SELECT value, version FROM player_data WHERE player_id = ? AND key = ?',
      ).bind(playerId, key).first();
      return mevcut
        ? { state: JSON.parse(mevcut.value), version: mevcut.version, reddedildi: true }
        : { state: null, version: 0, reddedildi: true };
    }
  }

  await env.DB.prepare(
    `INSERT INTO player_data (player_id, key, value, version, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(player_id, key) DO UPDATE
       SET value = excluded.value, version = player_data.version + 1, updated_at = excluded.updated_at
       WHERE player_data.version = ?`,
  ).bind(playerId, key, valueJson, now, expected).run();

  const row = await env.DB.prepare('SELECT value, version FROM player_data WHERE player_id = ? AND key = ?')
    .bind(playerId, key).first();
  const kayitliDurum = JSON.parse(row.value);

  /* Burada eskiden applyReferralMilestones cagriliyordu: arkadasin
     ejderhasi seviye atladikca davet edene odeme yapiliyordu. Komisyon
     artik SEVIYEYE degil KAZANCA bagli, o yuzden odeme noktasi
     applyEarn'a tasindi (bkz. odeReferralKomisyon). */

  return { state: kayitliDurum, version: row.version };
}

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }
  if (!env.DB) {
    return json({ error: 'sunucu veritabani baglanmamis (D1 binding "DB" eksik)' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bozuk istek govdesi' }, 400);
  }

  const auth = await verifyInitData(body.initData, env.BOT_TOKEN);
  if (!auth) return json({ error: 'kimlik dogrulanamadi' }, 401);
  const playerId = auth.id;

  try {
    if (url.pathname === '/api/sync') {
      return json(await handleSync(env, playerId, body, auth.ad));
    }

    await ensurePlayer(env, playerId);

    switch (url.pathname) {
      case '/api/points/spend':
        return json(await applyDelta(env, playerId, body.opId, -guvenliSayi(body.amount, MAX_SPEND_PER_REQUEST)));
      /* /api/points/earn KALDIRILDI.

         Istemcinin "bana su kadar $MH ver" diyebildigi tek kapi oydu ve
         oyun oynamaya hic gerek birakmiyordu: dogru govdeyi gondermek
         gunluk tavana kadar para basiyordu. Kazanc artik SKORDAN,
         sunucudaki bolucuyle hesaplaniyor (bkz. OYUN_ODEME, handleBest).
         applyEarn duruyor ama yalnizca ICERDEN cagriliyor. */
      case '/api/energy/spend':
        return json(await handleEnergySpend(env, playerId, body.opId));
      case '/api/energy/ad-refill':
        return json(await handleAdRefill(env, playerId, body.opId));
      case '/api/energy/star-invoice':
        return json(await handleStarInvoice(env, playerId));
      case '/api/best':
        return json(await handleBest(env, playerId, body));
      case '/api/game/start':
        return json(await handleGameStart(env, playerId, String(body.game || '').trim()));
      case '/api/game/finish':
        return json(await handleGameFinish(env, playerId, String(body.game || '').trim(), body));
      case '/api/state':
        return json(await handleState(env, playerId, body));
      case '/api/streak/claim':
        return json(await handleStreakClaim(env, playerId));
      case '/api/spin':
        return json(await handleSpin(env, playerId));
      case '/api/leaderboard':
        return json(await handleLeaderboard(env, playerId));
      case '/api/referral':
        return json(await handleReferral(env, playerId));
      case '/api/gorev':
        return json(await handleGorev(env, playerId));
      case '/api/gorev/olay':
        return json(await handleGorevOlay(env, playerId, body));
      case '/api/gorev/al':
        return json(await handleGorevAl(env, playerId));
      case '/api/promo':
        return json(await handlePromo(env, playerId, body));
      case '/api/promo/kutu':
        return json(await handlePromoKutu(env, playerId));
      default:
        return json({ error: 'bulunamadi' }, 404);
    }
  } catch (err) {
    return json({ error: 'sunucu hatasi', detail: String(err?.message || err) }, 500);
  }
}

export { parseReferralPayload };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    if (request.method !== 'POST') {
      return new Response('Mini HUB bot is running.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('ok');
    }

    // Enerji dolumu icin Stars odemesi: once on-onay (kalan hakkini kontrol
    // ediyoruz), sonra basarili odeme sonrasi asil enerji krediyi uyguluyoruz.
    // Ikisi de /api/* kimlik dogrulamasindan (initData HMAC) BAGIMSIZ -
    // Telegram'in kendisi cagiriyor, playerId invoice payload'indan geliyor.
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const [tur, playerId] = String(q.invoice_payload || '').split(':');
      let ok = tur === 'energy_refill' && !!playerId;
      if (ok) {
        const sayi = await refillSayisiBugun(env, playerId, 'star');
        if (sayi >= ENERGY_REFILL_DAILY_LIMIT) ok = false;
      }
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ok
          ? { pre_checkout_query_id: q.id, ok: true }
          : { pre_checkout_query_id: q.id, ok: false, error_message: 'Daily energy refill limit reached, try again tomorrow.' }),
      });
      return new Response('ok');
    }

    const successfulPayment = update.message?.successful_payment;
    if (successfulPayment) {
      const [tur, playerId] = String(successfulPayment.invoice_payload || '').split(':');
      if (tur === 'energy_refill' && playerId) {
        await ensurePlayer(env, playerId);
        await applyEnergyRefill(env, playerId, `energy:star:${successfulPayment.telegram_payment_charge_id}`, 'star');
      }
      return new Response('ok');
    }

    const message = update.message;
    const chatId = message?.chat?.id;
    const incoming = (message?.text || '').trim();

    if (!chatId) return new Response('ok');

    const t = textsFor(message.from?.language_code);
    const command = incoming.split(/[\s@]/)[0].toLowerCase();
    const chatIdStr = String(chatId);

    if (command === '/start' || command === '/play') {
      const referrerId = parseReferralPayload(incoming);
      if (referrerId && referrerId !== chatIdStr) {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)',
        ).bind(chatIdStr, referrerId, Date.now()).run();
      }
      await sendWithBanner(env, chatId, t.welcome, keyboard(t, chatIdStr));
    } else if (command === '/help') {
      await send(env, chatId, t.help, keyboard(t, chatIdStr));
    } else if (command === '/terms') {
      await send(env, chatId, t.terms);
    } else if (command === '/paysupport') {
      await send(env, chatId, t.paysupport);
    } else {
      await send(env, chatId, t.nudge, keyboard(t, chatIdStr));
    }

    return new Response('ok');
  },
};

/* Testin icerden gorebilmesi icin. Worker'in calismasini etkilemiyor -
   Cloudflare yalnizca default export'a bakiyor. Sure mantigini aga
   cikmadan dogrudan sinamak, kod listesindeki tarihlere bagli ve bir
   gun kendiliginden kirilacak testler yazmaktan iyi. */
export { PROMO_KODLARI, promoSure, promoNormalle };
