/* Mini HUB karsilama botu + oyuncu verisi sunucusu.

   IKI AYRI ISI VAR, TEK WORKER'DA:

   1) Telegram webhook'u: birisi bota yazinca hos geldin mesaji ve "Oyna"
      butonunu gonderir. Asagida hic degismedi, hep boyle calisiyordu.

   2) /api/* ucuyla baslayan istekler: Mini App'in jeton bakiyesini, oyun
      rekorlarini ve ejderha durumunu okuyup yazan uc noktalar. Bunlar YENI -
      once her sey tarayicida (localStorage) tutuluyordu, yani herkes kendi
      bakiyesini konsoldan degistirebiliyordu. Artik gercek kaynak burasi.

   Nerede calisir: Cloudflare Workers (ucretsiz katman fazlasiyla yeter).
   Kurulum adimlari: bot webhook'u icin KURULUM-BOT.md, /api/* icin
   KURULUM-SUNUCU.md (D1 veritabani baglama adimlari orada).

   Cloudflare'de tanimlanmasi gereken degerler:
     BOT_TOKEN       BotFather'in verdigi token (webhook YANITLARI icin,
                     ARTIK AYRICA /api/* isteklerinin imzasini dogrulamak
                     icin de kullaniliyor - yeni bir gizli deger gerekmedi)
     WEBHOOK_SECRET  kendi uydurdugun uzun bir parola (Telegram disindan
                     gelen sahte webhook isteklerinin elenmesi icin -
                     sadece webhook'u ilgilendirir, /api/* bunu kullanmaz)
     DB              D1 veritabani baglantisi (binding adi tam olarak "DB"
                     olmali - KURULUM-SUNUCU.md'de nasil baglanacagi var)
*/

/* Oyunun adresi ve botun kullanici adi. Degistirirsen buradan degistir. */
const MINI_APP_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/';
const BOT_USERNAME = 'minihubgames_bot';
const CHANNEL_URL = 'https://t.me/minihubgames';

/* /api/* isteklerine izin verilen TEK kaynak. Genel '*' degil, cunku bunlar
   kimlik dogrulamali YAZMA istekleri - baska bir siteden bu adrese istek
   atilamamasi gerekiyor. */
const ALLOWED_ORIGIN = 'https://ms7fyg7nmc-svg.github.io';

/* --- Enerji, gunluk seri ve gunluk cark ayarlari ---
   Rakamlar oyunlarin olculen kazanc hizina gore secildi (bir tur ortalama
   10-30 Coin veriyor - bkz. her oyunun POINTS_DIVISOR/POINTS_PER_LEVEL
   sabiti). Sadece burayi degistirerek dengeyi ayarlayabilirsin, baska hicbir
   yeri degistirmen gerekmez. */
const MAX_ENERGY = 24;            /* enerji tavani */
/* Enerji kendiliginden dolar: her ENERGY_REGEN_MS'de 1. Reklam butonu
   kaldirildigi icin (su an reklam agimiz yok) enerjinin dolmasinin BASKA
   yolu kalmadi - bu olmadan oyuncu bir kez tuketince kalici olarak dusuk
   kazanca mahkum oluyordu. 30 dk x 24 = tam dolum 12 saat. */
const ENERGY_REGEN_MS = 30 * 60 * 1000;
const ENERGY_PER_EARN = 1;        /* her Coin kazanma istegi 1 enerji harcar */
const EMPTY_ENERGY_CARPAN = 0.25; /* enerji bittiyse kazanc bu orana duser (kesilmez) */

/* 7 gunluk dongu, 7. gun buyuk odul. Dongu sonunda 1. gune donuluyor. */
const STREAK_REWARDS = [100, 150, 200, 300, 400, 500, 1000];
const STREAK_MIN_GAP_MS = 20 * 3600 * 1000;   /* bundan once tekrar alinamaz */
const STREAK_RESET_GAP_MS = 48 * 3600 * 1000; /* bundan sonra seri sifirlanir */

const SPIN_MIN_GAP_MS = 20 * 3600 * 1000;

/* Agirlik toplami 1000 - tahmini kazanc ~1 oyun turu kadar, cok nadir buyuk
   odul ve cok nadir "enerji dolumu" dilimi var. */
const SPIN_PRIZES = [
  { tur: 'coin',   miktar: 50,          agirlik: 260 },
  { tur: 'coin',   miktar: 100,         agirlik: 250 },
  { tur: 'coin',   miktar: 150,         agirlik: 200 },
  { tur: 'coin',   miktar: 250,         agirlik: 150 },
  { tur: 'coin',   miktar: 375,         agirlik: 80  },
  { tur: 'coin',   miktar: 500,         agirlik: 45  },
  { tur: 'enerji', miktar: MAX_ENERGY,  agirlik: 10  },
  { tur: 'coin',   miktar: 750,         agirlik: 5   },
];

/* ==========================================================================
   HILE KORUMASI - KAZANC SINIRLARI

   NEDEN GEREKLI: mini oyunlarin skorunu istemci hesapliyor ve sunucuya
   "su kadar kazandim" diye bildiriyor. Sunucu oyunu yeniden oynatmadigi
   icin bu bildirimin dogrulugunu KANITLAYAMAZ - degistirilmis bir istemci
   (ya da tarayici konsolundan atilan tek bir istek) istedigi sayiyi
   yollayabilir. Oyunu sunucuda yeniden oynatmak bambaska bir is; buradaki
   savunma bunun yerine kazanc HIZINI sinirliyor:

     - istek basi tavan: tek bir istekle absurt bir miktar alinamaz
     - 24 saatlik toplam tavan: asil sinir bu. Hile yapan da en fazla
       cok calisan bir oyuncu kadar kazanabilir, "aninda sinirsiz" olmuyor.

   Sayilar meshru oyunun BOLCA uzerinde secildi: gercek bir oyuncu bu
   sinirlara carpmamali. Carparsa kazanci reddedilmiyor, sadece tavana
   KIRPILIYOR - yani hata gormuyor, oyunu bozulmuyor. */
const MAX_EARN_PER_REQUEST = 10000;  /* tek oyun turu (2048'de 100.000 skor) */
const DAILY_EARN_CAP = 30000;        /* son 24 saatte toplam kazanc */

/* Tek seferde harcanabilecek ust sinir - en pahali kozmetik 45.000 jeton
   (bkz. games/dragon/data.js), uzerine pay birakildi. Amaci hile degil,
   bozuk/tasmis bir sayinin bakiyeyi mahvetmesini onlemek. */
const MAX_SPEND_PER_REQUEST = 100000;

/* Sadece bu oyunlar icin rekor/durum satiri acilabilir. Onceden 'game'
   herhangi bir dize olabiliyordu, yani tek bir oyuncu sonsuz sayida satir
   olusturup veritabanini sisirebilirdi. Menude olmayan ama dosyalari
   duran oyunlar (minesweeper, pet) da listede - dogrudan adresle
   acilabildikleri icin. */
const GECERLI_OYUNLAR = new Set([
  '2048', 'blockblast', 'watersort', 'match3', 'tripletile',
  'flow', 'snake', 'minesweeper', 'dragon', 'pet',
]);

/* Kayitli oyun durumunun (JSON metni) en buyuk boyutu. Ejderha durumu -
   en dolu haliyle bile - 3 KB civari; 32 KB fazlasiyla yeterli. */
const MAX_STATE_BYTES = 32 * 1024;

/* Rekor skorlar ekonomiyi etkilemiyor (jetona cevrilmiyorlar) ama yine de
   absurt degerler kaydedilmesin. */
const MAX_BEST_SCORE = 10000000;

/* Ilk senkronda istemcinin beyan edebilecegi en yuksek yerel bakiye.
   Bkz. handleSync - sunucu oncesi ilerlemeyi kurtarmak icin var, sinirsiz
   olsa yeni her hesap bedava jetonla baslardi. */
const MAX_SEED_POINTS = 5000;

/* player_data'ya yalnizca bu bicimdeki anahtarlar yazilabilir:
   "best_<oyun>" veya "state_<oyun>", oyun da beyaz listede olmali.
   Onceden istemci istedigi anahtari uydurabildigi icin tek bir oyuncu
   sinirsiz satir acabiliyordu. */
function gecerliVeriAnahtari(key) {
  /* Sunucunun kendi tuttugu dahili anahtar - istemci yazamaz */
  if (key === 'dragon_taban') return false;
  if (typeof key !== 'string') return false;
  const ayrac = key.indexOf('_');
  if (ayrac < 0) return false;
  const tur = key.slice(0, ayrac);
  const oyun = key.slice(ayrac + 1);
  return (tur === 'best' || tur === 'state') && GECERLI_OYUNLAR.has(oyun);
}

/* Istemciden gelen sayiyi guvenli hale getirir: sayi degilse, NaN'sa veya
   Infinity'yse 0 olur; her zaman 0..max araliginda bir tam sayi doner.
   (Math.round(Infinity) hala Infinity oldugu icin bu kontrol sart -
   dogrudan SQL'e giderse veritabani hatasi verir.) */
function guvenliSayi(deger, max) {
  const n = Math.round(Number(deger));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, max);
}

/* Karsilama mesajinin ustundeki banner gorseli. Ayni repo'da barinir,
   degistirmek istersen bot/assets/banner.png dosyasinin uzerine yaz ve
   GitHub'a yolla - adres ayni kalir. */
const BANNER_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/bot/assets/banner.jpg';

/* Telegram bize kullanicinin dilini soyluyor; bilmedigimiz bir dilse Ingilizce */
const TEXTS = {
  en: {
    welcome:
      '<b>Welcome to MINI HUB GAMES</b>\n\n' +
      'A pocket full of mini games — puzzles, blocks, candy and more.\n\n' +
      'Spend what you earn raising your own dragon on a floating island.\n\n' +
      'Every game you finish earns hub points, the early form of $MH — ' +
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
    shareText: 'A pocket full of mini games — come beat my score!',
  },
  tr: {
    welcome:
      "<b>MINI HUB GAMES'e hoş geldin</b>\n\n" +
      'Cebinde bir sürü mini oyun — bulmaca, blok, şeker ve dahası.\n\n' +
      'Kazandığın jetonlarla uçan adadaki kendi ejderhanı büyüt.\n\n' +
      'Bitirdiğin her oyun sana hub puanı kazandırır - büyüyen bir kripto ' +
      'ekosisteminin ilk hali olan $MH’ın öncüsü. İndirme yok.\n\n' +
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
    shareText: "Cebinde bir sürü mini oyun — gel skorumu geç bakalım!",
  },
  es: {
    welcome:
      '<b>Bienvenido a MINI HUB GAMES</b>\n\n' +
      'Un bolsillo lleno de minijuegos: puzles, bloques, caramelos y más.\n\n' +
      'Gasta lo que ganes criando tu dragón en una isla flotante.\n\n' +
      'Cada partida que terminas te da puntos de hub, la forma inicial de ' +
      '$MH — parte de un ecosistema cripto en crecimiento. Sin descargas.\n\n' +
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
  },
  ru: {
    welcome:
      '<b>Добро пожаловать в MINI HUB GAMES</b>\n\n' +
      'Целый карман мини-игр: головоломки, блоки, конфеты и не только.\n\n' +
      'Трать заработанное на своего дракона с летающего острова.\n\n' +
      'За каждую игру начисляются очки хаба - ранняя форма $MH, части ' +
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
    shareText: 'Целый карман мини-игр — попробуй побить мой счёт!',
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

/* Karsilama mesaji banner gorseliyle gider. Diger cevaplar duz metin kalir,
   yoksa kullanici her yazdiginda resim inip sohbeti agirlastirir.

   GORSEL GIDEMEZSE METIN YINE GITSIN

   Once bu yedek yoktu: banner adresi bir sebeple ulasilamaz olunca (dosya
   adi degisti, GitHub Pages gecici olarak cevap vermedi) sendPhoto sessizce
   basarisiz oluyor ve /start yazan kullanici HICBIR sey gormuyordu. Artik
   gorsel gitmezse ayni metin duz mesaj olarak gonderiliyor - bot hicbir
   durumda sessiz kalmiyor. */
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
    /* ag hatasi - asagidaki duz metne dusulur */
  }

  await send(env, chatId, caption, replyMarkup);
}

/* ==========================================================================
   /api/*  -  OYUNCU VERISI SUNUCUSU

   Asagidaki her sey Mini App'ten gelen istekleri karsilar. Bot webhook'uyla
   hicbir ortak kodu yok - farkli bir guven modeli kullaniyorlar (webhook
   sabit bir parolayla dogrulanir, /api/* ise her istekte Telegram'in
   IMZALADIGI initData ile).
   ========================================================================== */

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

/* Iki metni, uzunluklarindan veya karakterlerinden erken cikmadan karsilastirir.
   Duz '!==' de bu is icin pratikte yeterliydi ama imza dogrulama gibi
   guvenlikle ilgili bir karsilastirmada zamanlama farkindan bilgi sizmasin
   diye standart yontem buyle. */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/* Telegram Mini App'in initData imzasini dogrular.
   Algoritma Telegram'in resmi dokumaninda tanimli:
     secret_key = HMAC_SHA256(bot_token, key="WebAppData")
     hash       = HMAC_SHA256(data_check_string, key=secret_key)
   data_check_string, hash disindaki tum alanlarin "key=value" seklinde
   alfabetik siraya dizilip \n ile birlestirilmesiyle olusur.

   Basarili olursa dogrulanmis Telegram kullanici kimligini doner - istemci
   BUNU KENDI SOYLEYEMEZ, sadece imzali initData icinden cikarilabilir. */
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

  /* Cok eski (calinmis/tekrar oynatilan) bir initData kabul edilmesin */
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

  /* Ad yalnizca lider tablosunda gostermek icin. Telegram'in verdigi
     first_name aliniyor; soyad ve kullanici adi ALINMIYOR - tabloda
     kimsenin tam kimligi tesir etmesin. */
  const ad = typeof user.first_name === 'string' ? user.first_name.slice(0, 24) : '';
  return { id: String(user.id), ad, authDate };
}

/* players satirinin var oldugundan emin olur, yoksa olusturur.
   Donen deger: satir bu cagriyla mi olusturuldu (true) yoksa zaten var miydi
   (false) - sadece /api/sync bu bilgiyi kullanir (ilk kayitta yerel veriyi
   tasimak icin), digerleri icin bu fonksiyon sadece bir guvenlik agi. */
async function ensurePlayer(env, playerId, initialPoints = 0) {
  const now = Date.now();
  const res = await env.DB.prepare(
    'INSERT INTO players (id, points, energy, energy_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
  ).bind(playerId, initialPoints, MAX_ENERGY, now, now, now).run();
  return res.meta.changes === 1;
}

/* Su an kacinci gunun odulu alinabilir, ne kadar, ne zaman - hem
   handleSync'in gosterdigi "bugun alinabilir mi" bilgisi hem de
   handleStreakClaim'in kendisi bunu kullanir, iki yerde ayni mantik
   tekrarlanmasin diye tek fonksiyonda toplandi. */
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
    /* Odul merdivenini sunucu bildiriyor. Onceden istemci bunu kendi
       icinde sabit tutuyordu ve sunucudaki rakamlar degisince ekranda
       eski sayilar kaliyordu (5x guncellemesinde tam bu oldu). */
    rewards: STREAK_REWARDS,
    /* true: gun kacirildi, seri kirildi - istemci "1..count gunleri alindi"
       gostermemeli, yeni bir dongu basliyor. Sadece bilgi amacli - claim
       kendi kararini zaten gelecekGun uzerinden bagimsiz veriyor. */
    broken: sonAlim > 0 && gecenSure > STREAK_RESET_GAP_MS,
  };
}

/* Gecen sureye gore kazanilmis enerjiyi hesaplar. Cagiran taraf sonucu
   veritabanina yazmakla yukumlu (degisti=true ise). */
function enerjiTazele(row, now) {
  const son = row.energy_at || now;
  const kazanilan = Math.floor((now - son) / ENERGY_REGEN_MS);
  if (kazanilan <= 0) return { energy: row.energy, energyAt: son, degisti: !row.energy_at };
  const yeni = Math.min(MAX_ENERGY, row.energy + kazanilan);
  /* Tavandaysa sayac simdiye cekilir; degilse yalnizca tam bolum kadar
     ilerletilir ki artan sure bir sonraki birime sayilsin. */
  const yeniAt = yeni >= MAX_ENERGY ? now : son + kazanilan * ENERGY_REGEN_MS;
  return { energy: yeni, energyAt: yeniAt, degisti: true };
}

function spinDurumu(row, now) {
  const sonCark = row.last_spin_at || 0;
  const gecenSure = sonCark ? now - sonCark : Infinity;
  const canSpin = gecenSure >= SPIN_MIN_GAP_MS;
  return { canSpin, nextInMs: canSpin ? 0 : SPIN_MIN_GAP_MS - gecenSure };
}

/* Agirlikli rastgele secim - sunucu tarafinda, istemci sadece sonucu
   gosterir. Boylece cark "hangi dilime dusecegini" kimse onceden bilemez
   ya da degistiremez. */
function carkCek() {
  const toplam = SPIN_PRIZES.reduce((s, p) => s + p.agirlik, 0);
  let r = Math.random() * toplam;
  for (let i = 0; i < SPIN_PRIZES.length; i++) {
    r -= SPIN_PRIZES[i].agirlik;
    if (r < 0) return i;
  }
  return SPIN_PRIZES.length - 1;
}

/* Ilk acilista tum bakiyeyi/durumu tek istekte doner.

   ILK KAYIT (isNew): istemcinin o ana kadar yerelde biriktirdigi her sey
   (jeton + butun best_ ve state_ degerleri) oldugu gibi sunucuya tasinir -
   yoksa gecmis ilerleme kaybolur.

   SONRAKI HER ACILIS (isNew degil): jeton ve state_ degerleri artik
   sunucuda otoriter, istemcinin yerel kopyasi gormezden gelinir - iki cihaz
   ayni oyuncuyu actiginda biri digerinin ilerlemesini silmesin diye. Sadece
   best_* rekorlari "buyukse guncelle" ile her seferinde birlestirilir, cunku
   bu islem kayipsiz ve tekrar uygulanmasi zararsizdir. */
async function handleSync(env, playerId, body, ad) {
  const now = Date.now();
  /* Ilk senkronda istemcinin "yerelde su kadar jetonum vardi" beyani
     kabul ediliyor - sunucu oncesi ilerleme baska turlu kurtarilamiyor.
     Ama bu beyan sinirsiz olamaz: aksi halde yeni acilan her hesap
     istedigi bakiyeyle baslayabilirdi (sahte Telegram hesabi + degistirilmis
     istemci = bedava jeton). Tavan, sunucu oncesi makul bir yerel
     ilerlemeyi kurtaracak kadar yuksek, istismari anlamsiz kilacak kadar
     dusuk secildi. */
  const seedPoints = guvenliSayi(body.points, MAX_SEED_POINTS);
  const isNew = await ensurePlayer(env, playerId, seedPoints);

  /* Ad her senkronda tazeleniyor - oyuncu Telegram'da adini degistirirse
     tabloda da degissin. */
  if (ad) await env.DB.prepare('UPDATE players SET name = ? WHERE id = ?').bind(ad, playerId).run();

  const gelenState = (body.state && typeof body.state === 'object') ? body.state : {};

  if (isNew) {
    const stmts = [];
    for (const [key, value] of Object.entries(gelenState)) {
      if (!gecerliVeriAnahtari(key)) continue;
      const json = JSON.stringify(value);
      if (json.length > MAX_STATE_BYTES) continue;
      stmts.push(env.DB.prepare(
        'INSERT INTO player_data (player_id, key, value, updated_at) VALUES (?, ?, ?, ?)',
      ).bind(playerId, key, json, now));
    }
    if (stmts.length) await env.DB.batch(stmts);
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

  /* Enerji zamanla doluyor - okundugu anda hesaplanip kalici hale getiriliyor */
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
  for (const r of rows.results) {
    state[r.key] = JSON.parse(r.value);
    meta[r.key] = r.version;
  }

  return {
    points: player.points,
    energy: player.energy,
    maxEnergy: MAX_ENERGY,
    /* Bir sonraki enerji birimine kalan sure - istemci geri sayim gosteriyor */
    energyNextMs: player.energy >= MAX_ENERGY
      ? 0 : Math.max(0, ENERGY_REGEN_MS - (now - player.energy_at)),
    streak: streakDurumu(player, now),
    spin: { ...spinDurumu(player, now), prizes: SPIN_PRIZES.map((p) => ({ tur: p.tur, miktar: p.miktar })) },
    state,
    meta,
  };
}

/* Jeton harcar (delta<0) veya kazandirir (delta>0). Tek bir kosullu SQL
   ifadesiyle atomik uygulanir - iki istek ayni anda gelse bile ikisi de
   ayni satiri gorup ikisi de "yeterli bakiye var" sanip cift harcama
   yapamaz, SQLite bu ifadeyi sirali calistirir.

   opId (istemcinin uydurdugu tekillik anahtari) daha once islendiyse
   islem TEKRAR UYGULANMAZ, o zamanki sonuc dondurulur - parmak titremesi,
   cift dokunus veya agin isteği tekrar denemesi bakiyeyi bozmaz. */
async function applyDelta(env, playerId, opId, delta) {
  const key = opId || crypto.randomUUID();
  const now = Date.now();

  const prior = await env.DB.prepare(
    'SELECT balance_after FROM spend_log WHERE player_id = ? AND op_id = ?',
  ).bind(playerId, key).first();
  if (prior) return { ok: true, total: prior.balance_after };

  if (delta < 0) {
    const gerekli = -delta;
    const res = await env.DB.prepare(
      'UPDATE players SET points = points + ?, updated_at = ? WHERE id = ? AND points >= ?',
    ).bind(delta, now, playerId, gerekli).run();

    if (res.meta.changes === 0) {
      /* Bakiye yetersiz: hicbir sey degismedi, guncel bakiyeyi bildir */
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
    'INSERT INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, ?, ?, ?)',
  ).bind(playerId, key, delta, total, now).run();

  return { ok: true, total };
}

/* Oyun ici kazanc (bir turun/bolumun sonunda cagrilir) - applyDelta'dan
   farkli olarak enerjiye bakiyor: enerji varsa istenen miktarin tamami
   verilir ve 1 enerji harcanir, enerji 0'sa miktar EMPTY_ENERGY_CARPAN
   oranina duser (kesilmez) ve enerji degismez.

   points VE energy AYNI ANDA degistigi icin applyDelta'nin tek WHERE
   kosulu yetmiyor - "okudugum enerji hala aynı mi" diye WHERE energy = ?
   ile korunuyor (handleState'teki version kontroluyle ayni fikir). Araya
   baska bir istek girip enerjiyi degistirsimse (ornegin reklam izlendi)
   bu deneme basarisiz olur, en fazla 3 kez tekrar dener. */
async function applyEarn(env, playerId, opId, requestedAmount) {
  const key = opId || crypto.randomUUID();
  const now = Date.now();

  const prior = await env.DB.prepare(
    'SELECT balance_after FROM spend_log WHERE player_id = ? AND op_id = ?',
  ).bind(playerId, key).first();
  if (prior) {
    /* Bu opId zaten islenmis: islemi TEKRAR uygulamiyoruz ama bakiyeyi
       o anki degil GUNCEL haliyle donuyoruz - arada baska islemler olmus
       olabilir ve istemci bu sayiyi ekrana yaziyor. */
    const guncel = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    return { ok: true, total: guncel ? guncel.points : prior.balance_after, energy: guncel ? guncel.energy : 0, credited: 0 };
  }

  /* Son 24 saatte kazanilan toplam. Gunluk tavana ne kadar yer kaldigini
     buradan buluyoruz - ayri bir sayac sutunu tutmak yerine spend_log'un
     kendisinden hesaplaniyor, boylece "gun donunce sifirlama" gibi bir
     durum yok, kayan 24 saatlik pencere kendiliginden dogru. */
  const pencere = await env.DB.prepare(
    'SELECT COALESCE(SUM(delta), 0) AS toplam FROM spend_log WHERE player_id = ? AND delta > 0 AND created_at > ?',
  ).bind(playerId, now - 24 * 3600 * 1000).first();
  const kalanHak = Math.max(0, DAILY_EARN_CAP - (pencere ? pencere.toplam : 0));

  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare('SELECT energy, energy_at FROM players WHERE id = ?').bind(playerId).first();
    /* Once gecen surede kazanilmis enerjiyi ekle, sonra harcamayi uygula */
    const tz = row ? enerjiTazele(row, now) : { energy: 0, energyAt: now };
    const enerji = tz.energy;
    const doluMu = enerji > 0;
    const hamMiktar = doluMu ? requestedAmount : Math.round(requestedAmount * EMPTY_ENERGY_CARPAN);
    /* Gunluk tavani asan kisim reddedilmiyor, KIRPILIYOR: meshru bir
       oyuncu (cok nadir de olsa) tavana carparsa hata gormesin, oyunu
       kesintiye ugramasin. */
    const verilecek = Math.min(hamMiktar, kalanHak);
    const yeniEnerji = doluMu ? Math.max(0, enerji - ENERGY_PER_EARN) : 0;

    /* Enerji tavandan dustugu an sayac simdiden baslar; zaten doluysa
       (harcama yok) sayaci ileri tasimaya gerek yok. */
    const yeniAt = enerji >= MAX_ENERGY && yeniEnerji < MAX_ENERGY ? now : tz.energyAt;
    const res = await env.DB.prepare(
      'UPDATE players SET points = points + ?, energy = ?, energy_at = ?, updated_at = ? WHERE id = ? AND energy = ?',
    ).bind(verilecek, yeniEnerji, yeniAt, now, playerId, row ? row.energy : 0).run();

    if (res.meta.changes === 0) continue; /* araya baska istek girdi, tekrar dene */

    const player = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
    const total = player.points;

    await env.DB.prepare(
      'INSERT INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(playerId, key, verilecek, total, now).run();

    return { ok: true, total, energy: yeniEnerji, credited: verilecek };
  }

  /* 3 denemede de yaris kaybedildi (cok nadir) - enerjisiz varsayip en
     azindan azaltilmis odulu vermeyi garanti et, kazanci hic kaybetme.
     Gunluk tavan burada da gecerli, yoksa bu yol bir kacak olurdu. */
  const azaltilmis = Math.min(Math.round(requestedAmount * EMPTY_ENERGY_CARPAN), kalanHak);
  const yedek = await applyDelta(env, playerId, key, azaltilmis);
  return { ...yedek, energy: 0, credited: azaltilmis };
}

/* Bir mini oyun yarim birakilip Restart'a basildiginda cagrilir.
   Oyuncunun o ana kadarki skoru zaten puana cevrilip applyEarn ile
   krediliyorsa (o cagri kendi ENERGY_PER_EARN'unu zaten dusuyor) buraya
   hic gelinmiyor - bu uc nokta yalnizca "hic puan olusmadan restart"
   durumu icin: Restart'in bedava bir "yeniden dagit/reroll" haline
   gelmemesi icin sabit 1 enerji dusuyor. Puan eklemiyor, sadece enerji. */
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

    if (res.meta.changes === 0) continue; /* araya baska istek girdi, tekrar dene */

    await env.DB.prepare(
      'INSERT INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, 0, ?, ?)',
    ).bind(playerId, key, row.points, now).run();

    return { ok: true, total: row.points, energy: yeniEnerji };
  }
  return { ok: false, reason: 'yeniden dene' };
}

/* Gunluk seri odulunu talep eder - streakDurumu'nun hesapladigi gunu ve
   odulu, "hala o an okudugum last_claim_at mi" korumasiyla (WHERE
   last_claim_at = ?) atomik olarak uygular. */
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
    /* Alim SONRASI durum da doner: istemci onbellegindeki seriyi bununla
       degistiriyor. Onceden sadece "artik alamazsin" bilgisi gidiyordu,
       nextInMs eski degerinde (0) kaliyordu - cunku odul alinabilir
       oldugu icin zaten 0'di - ve "Yarin tekrar gel" yazisinin yanindaki
       geri sayim bos cikiyordu. Bekleme suresi sunucunun sabiti; istemci
       kendi hesaplamasin diye buradan gonderiliyor. */
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

/* Gunluk carki cevirir - sonucu sunucu secer (carkCek), istemci sadece o
   sonuca kilitlenen bir animasyon oynatir. */
async function handleSpin(env, playerId) {
  const now = Date.now();
  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare('SELECT last_spin_at FROM players WHERE id = ?').bind(playerId).first();
    if (!row) return { ok: false, reason: 'oyuncu yok' };

    const durum = spinDurumu(row, now);
    if (!durum.canSpin) return { ok: false, reason: 'erken', nextInMs: durum.nextInMs };

    const index = carkCek();
    const odul = SPIN_PRIZES[index];

    const sql = odul.tur === 'enerji'
      ? 'UPDATE players SET energy = ?, last_spin_at = ?, updated_at = ? WHERE id = ? AND last_spin_at = ?'
      : 'UPDATE players SET points = points + ?, last_spin_at = ?, updated_at = ? WHERE id = ? AND last_spin_at = ?';
    const deger = odul.tur === 'enerji' ? MAX_ENERGY : odul.miktar;

    const res = await env.DB.prepare(sql).bind(deger, now, now, playerId, row.last_spin_at).run();
    if (res.meta.changes === 0) continue;

    const player = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
    /* Cevirme SONRASI durum - bkz. handleStreakClaim'deki ayni aciklama.
       Bu gitmeyince carkin ortasindaki geri sayim "0s" kaliyordu. */
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

/* ==========================================================================
   EJDERHA DURUMU DOGRULAMASI

   state_dragon icinde ejderhanin SEVIYESI ve sahip olunan KOZMETIKLER
   duruyor ve bunlari istemci yaziyor. Dogrulama olmadan degistirilmis bir
   istemci "seviye 99, butun mythic esyalar bende" diye yazabiliyordu -
   tek jeton harcamadan. Jeton bakiyesi korunuyordu ama ilerlemenin kendisi
   korunmuyordu; NFT plani da tam olarak bu ilerlemeye yaslanacagi icin
   burasi acik kalamazdi.

   NASIL DOGRULANIYOR: iddia edilen durumun MINIMUM maliyeti hesaplaniyor
   (seviye icin besleme + sahip olunan her esyanin fiyati) ve oyuncunun
   spend_log'daki gercek harcamasiyla karsilastiriliyor. Harcamanin
   uzerindeki iddia reddediliyor; sunucudaki son gecerli durum geri
   donduruluyor.

   ESKI OYUNCULAR: bu kontrol eklenmeden onceki ilerleme dogrulanamaz
   (harcama sunucuya hic ugramamis olabilir). Ilk yazmada mevcut durum
   TABAN olarak kaydediliyor ve o taban her zaman kabul ediliyor; kontrol
   yalnizca tabanin USTUNE cikan yeni iddialar icin isliyor. */

/* Fiyatlar games/dragon/data.js'ten kopyalandi. Sunucu istemcinin
   bildirdigi fiyata guvenemez, kendi kopyasi olmali. Iki tarafin
   ayrisip ayrismadigini bot/test-guvenlik.mjs kontrol ediyor. */
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

/* games/dragon/config.js ile ayni egri */
const xpGerekli = (seviye) => 2 + Math.floor(seviye / 8);
const beslemeUcreti = (seviye) => 8 + Math.floor(seviye * 1.5);

/* 1. seviyeden hedefe kadar TOPLAM besleme maliyeti */
function seviyeMaliyeti(seviye) {
  let toplam = 0;
  for (let l = 1; l < Math.min(seviye, 99); l++) toplam += xpGerekli(l) * beslemeUcreti(l);
  return toplam;
}

/* Ejderha "Oyna" ile de XP kazaniyor (4 saatte 1, bedava). Bu yuzden
   seviyenin tamami harcamayla aciklanmak zorunda degil - hesabin yasina
   dusen bedava XP kadari mazur goruluyor. Cömert tutuldu: mesru oyuncu
   yanlislikla engellenmesin. */
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

  /* Sahip olunan kozmetikler */
  const dolap = durum?.owned || {};
  for (const [slot, idler] of Object.entries(dolap)) {
    const tablo = FIYAT[slot];
    if (!tablo || !Array.isArray(idler)) continue;
    for (const id of idler) maliyet += tablo[id] || 0;
  }
  for (const id of (durum?.ownedIslands || [])) maliyet += FIYAT.island[id] || 0;

  return maliyet;
}

/* LIDER TABLOSU

   Siralama MEVCUT BAKIYEYE degil TOPLAM KAZANCA gore. Bakiyeye gore
   siralamak, ejderhasina jeton harcayan oyuncuyu cezalandirip hic
   harcamayani one cikarirdi - yani oyunu oynamak siralamada geriye
   dusururdu. Toplam kazanc = su anki bakiye + bugune kadarki tum harcama
   (harcamalar spend_log'da negatif delta olarak duruyor).

   Isimler istemciden DEGIL, dogrulanmis initData'dan geliyor (bkz.
   handleSync) - kimse baskasinin adiyla listeye giremez. */
const LIDER_LIMIT = 50;

/* Siralamaya GIRMEYEN hesaplar. Oyunun sahibi kendi tablosunda birinci
   durmasin diye: bakiyesi test/yonetim islemleriyle sismis durumda,
   listede olmasi gercek oyuncularin yarisini anlamsiz kiliyor. */
const LIDER_HARIC = new Set(['8100679296']);

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

  /* Oyuncu ilk 50'de degilse kendi sirasini ayrica bildir - insan once
     kendini arar, listede yoksa nerede oldugunu bilmek ister. */
  /* Haric tutulan hesap listede YER ALMIYOR ama listeyi GORUYOR - kimin ne
     kadar oynadigini takip edebilmesi gerekiyor. Kendi sirasi olmadigi icin
     kendi=null, haric=true ile bildiriliyor. */
  if (LIDER_HARIC.has(playerId)) return { liste, kendi: null, haric: true, toplam: liste.length };

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

/* Bir oyunun rekorunu gunceller - sadece gelen skor mevcut rekordan
   buyukse. Okuma-sonra-yazma yerine tek UPSERT ifadesi kullaniliyor ki iki
   istek ayni anda gelince biri digerinin guncellemesini kaybetmesin. */
async function handleBest(env, playerId, body) {
  const game = String(body.game || '').trim();
  if (!GECERLI_OYUNLAR.has(game)) return { error: 'bilinmeyen oyun' };
  const key = `best_${game}`;
  const score = guvenliSayi(body.score, MAX_BEST_SCORE);
  const now = Date.now();

  const res = await env.DB.prepare(
    `INSERT INTO player_data (player_id, key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id, key) DO UPDATE
       SET value = excluded.value, updated_at = excluded.updated_at
       WHERE CAST(player_data.value AS INTEGER) < ?`,
  ).bind(playerId, key, JSON.stringify(score), now, score).run();

  /* changes===1 demek ya satir ilk kez olusturuldu ya da WHERE kosulu
     tuttu (yani bu skor gercekten oncekini gecti) - ikisi de "yeni rekor". */
  const isRecord = res.meta.changes === 1;

  const row = await env.DB.prepare('SELECT value FROM player_data WHERE player_id = ? AND key = ?')
    .bind(playerId, key).first();
  const best = row ? Number(JSON.parse(row.value)) || 0 : score;

  return { best, isRecord };
}

/* Iddia edilen ejderha durumu harcamayla aciklanabiliyor mu?

   Doner: true  -> reddet (harcamanin ustunde bir ilerleme iddia ediliyor)
          false -> kabul et

   TABAN: kontrol eklenmeden onceki ilerleme dogrulanamayacagi icin ilk
   yazmada mevcut iddia taban olarak kaydedilir ve hep kabul edilir. */
async function ejderhaIddiasiReddedilsinMi(env, playerId, durum, now) {
  if (!durum || typeof durum !== 'object') return false;

  const oyuncu = await env.DB.prepare('SELECT created_at FROM players WHERE id = ?')
    .bind(playerId).first();
  const yasGun = oyuncu ? Math.max(0, (now - oyuncu.created_at) / 86400000) : 0;

  const iddia = iddiaMaliyeti(durum, yasGun);

  /* Bugune kadarki gercek harcama (spend_log'da negatif delta) */
  const h = await env.DB.prepare(
    'SELECT COALESCE(-SUM(delta), 0) AS toplam FROM spend_log WHERE player_id = ? AND delta < 0',
  ).bind(playerId).first();
  const harcama = h ? h.toplam : 0;

  /* Taban: ilk kez dogrulanan durum */
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

  /* Tabanin ustundeki her sey harcamayla aciklanmali */
  return iddia > taban + harcama;
}

/* Bir oyunun kayitli durumunu (yarim kalan oyun, ejderha dolabi, vs) yazar.

   ESKIYEN YAZMAYA KARSI KORUMA: istemci "en son gordugum surum buydu" diye
   expectedVersion gonderir. Sunucudaki surum bundan farkliysa (araya baska
   bir cihazin yazmasi girmisse) bu yazma sessizce reddedilir ve sunucunun
   GUNCEL degeri geri doner - istemci bunu kabul eder. Boylece gec gelen bir
   istek, arada baska bir cihazin yazdigi daha yeni veriyi silemez.

   NEDEN "version" SAYACI, "updated_at" ZAMAN DAMGASI DEGIL:
   Ilk denemede bu kontrol updated_at (milisaniye) ile yapiliyordu. Test
   ederken yakalandi: iki yazma ayni milisaniyeye denk gelince (gercekci bir
   ihtimal - D1 hizli) ikinci yazma birincinin zaman damgasiyla hala
   "eslesiyor" sanilip yanlislikla kabul ediliyordu. version her basarili
   yazmada tam olarak 1 arttigi icin bu belirsizlik olmuyor.

   Hic yazilmamis bir anahtar icin expectedVersion=0 gonderilir; satir henuz
   yoksa INSERT ilk surumu (1) vererek kosulsuz uygulanir. */
async function handleState(env, playerId, body) {
  const game = String(body.game || '').trim();
  if (!GECERLI_OYUNLAR.has(game)) return { error: 'bilinmeyen oyun' };
  const key = `state_${game}`;
  const now = Date.now();
  const expected = Number(body.expectedVersion) || 0;
  const valueJson = JSON.stringify(body.state ?? null);

  /* Bir oyuncu buraya megabaytlarca veri yazip veritabanini (ve faturayi)
     sisiremesin. Meshru en buyuk durum (dolu bir ejderha dolabi) 3 KB
     civari oldugu icin bu sinir hicbir gercek kaydi engellemiyor. */
  if (valueJson.length > MAX_STATE_BYTES) {
    const mevcut = await env.DB.prepare('SELECT value, version FROM player_data WHERE player_id = ? AND key = ?')
      .bind(playerId, key).first();
    return mevcut
      ? { state: JSON.parse(mevcut.value), version: mevcut.version }
      : { state: null, version: 0 };
  }

  /* Ejderha durumu: iddia edilen ilerleme gercek harcamayla ortusuyor mu */
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

  return { state: JSON.parse(row.value), version: row.version };
}

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }
  if (!env.DB) {
    /* D1 henuz baglanmamis - KURULUM-SUNUCU.md tamamlanmadan buraya
       dusulurse anlasilir bir hata donsun, "internal error" degil. */
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

    /* Diger uc noktalar icin guvenlik agi: oyuncu satiri yoksa olustur.
       Normal akista /api/sync her zaman ilk cagrilan uc nokta oldugu icin
       bu pratikte hep no-op olur. */
    await ensurePlayer(env, playerId);

    switch (url.pathname) {
      case '/api/points/spend':
        return json(await applyDelta(env, playerId, body.opId, -guvenliSayi(body.amount, MAX_SPEND_PER_REQUEST)));
      case '/api/points/earn':
        return json(await applyEarn(env, playerId, body.opId, guvenliSayi(body.amount, MAX_EARN_PER_REQUEST)));
      case '/api/energy/spend':
        return json(await handleEnergySpend(env, playerId, body.opId));
      case '/api/best':
        return json(await handleBest(env, playerId, body));
      case '/api/state':
        return json(await handleState(env, playerId, body));
      case '/api/streak/claim':
        return json(await handleStreakClaim(env, playerId));
      case '/api/spin':
        return json(await handleSpin(env, playerId));
      case '/api/leaderboard':
        return json(await handleLeaderboard(env, playerId));
      default:
        return json({ error: 'bulunamadi' }, 404);
    }
  } catch (err) {
    return json({ error: 'sunucu hatasi', detail: String(err?.message || err) }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* /api/* isteklerini bot webhook mantigindan tamamen ayri tut - iki
       farkli guven modeli birbirine karismasin. */
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    /* --- Asagisi bot webhook'u: hic degismedi --- */

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
