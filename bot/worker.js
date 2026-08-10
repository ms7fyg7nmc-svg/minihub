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

/* /api/* isteklerine izin verilen TEK kaynak. Genel '*' degil, cunku bunlar
   kimlik dogrulamali YAZMA istekleri - baska bir siteden bu adrese istek
   atilamamasi gerekiyor. */
const ALLOWED_ORIGIN = 'https://ms7fyg7nmc-svg.github.io';

/* --- Enerji, gunluk seri ve gunluk cark ayarlari ---
   Rakamlar oyunlarin olculen kazanc hizina gore secildi (bir tur ortalama
   10-30 Coin veriyor - bkz. her oyunun POINTS_DIVISOR/POINTS_PER_LEVEL
   sabiti). Sadece burayi degistirerek dengeyi ayarlayabilirsin, baska hicbir
   yeri degistirmen gerekmez. */
const MAX_ENERGY = 8;             /* enerji tavani, reklam bunu dolduruyor */
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

/* Karsilama mesajinin ustundeki banner gorseli. Ayni repo'da barinir,
   degistirmek istersen bot/assets/banner.png dosyasinin uzerine yaz ve
   GitHub'a yolla - adres ayni kalir. */
const BANNER_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/bot/assets/banner.jpg';

/* Telegram bize kullanicinin dilini soyluyor; bilmedigimiz bir dilse Ingilizce */
const TEXTS = {
  en: {
    welcome:
      '👋 <b>Welcome to Mini HUB Pocket Games</b>\n\n' +
      'A pocket full of mini games — puzzles, blocks, candy and more.\n\n' +
      'Spend what you earn raising your own dragon on a floating island.\n\n' +
      'Every game you finish earns hub points. Nothing to download.\n\n' +
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
    shareText: 'A pocket full of mini games — come beat my score!',
  },
  tr: {
    welcome:
      "👋 <b>Mini HUB Pocket Games'e hoş geldin</b>\n\n" +
      'Cebinde bir sürü mini oyun — bulmaca, blok, şeker ve dahası.\n\n' +
      'Kazandığın jetonlarla uçan adadaki kendi ejderhanı büyüt.\n\n' +
      'Bitirdiğin her oyun sana hub puanı kazandırır. İndirme yok.\n\n' +
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
    shareText: "Cebinde bir sürü mini oyun — gel skorumu geç bakalım!",
  },
  es: {
    welcome:
      '👋 <b>Bienvenido a Mini HUB Pocket Games</b>\n\n' +
      'Un bolsillo lleno de minijuegos: puzles, bloques, caramelos y más.\n\n' +
      'Gasta lo que ganes criando tu dragón en una isla flotante.\n\n' +
      'Cada partida que terminas te da puntos de hub. Sin descargas.\n\n' +
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
    shareText: 'Un bolsillo lleno de minijuegos: ¡ven a superar mi puntuación!',
  },
  ru: {
    welcome:
      '👋 <b>Добро пожаловать в Mini HUB Pocket Games</b>\n\n' +
      'Целый карман мини-игр: головоломки, блоки, конфеты и не только.\n\n' +
      'Трать заработанное на своего дракона с летающего острова.\n\n' +
      'За каждую игру начисляются очки хаба. Без загрузок.\n\n' +
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

  return { id: String(user.id), authDate };
}

/* players satirinin var oldugundan emin olur, yoksa olusturur.
   Donen deger: satir bu cagriyla mi olusturuldu (true) yoksa zaten var miydi
   (false) - sadece /api/sync bu bilgiyi kullanir (ilk kayitta yerel veriyi
   tasimak icin), digerleri icin bu fonksiyon sadece bir guvenlik agi. */
async function ensurePlayer(env, playerId, initialPoints = 0) {
  const now = Date.now();
  const res = await env.DB.prepare(
    'INSERT INTO players (id, points, energy, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
  ).bind(playerId, initialPoints, MAX_ENERGY, now, now).run();
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
    /* true: gun kacirildi, seri kirildi - istemci "1..count gunleri alindi"
       gostermemeli, yeni bir dongu basliyor. Sadece bilgi amacli - claim
       kendi kararini zaten gelecekGun uzerinden bagimsiz veriyor. */
    broken: sonAlim > 0 && gecenSure > STREAK_RESET_GAP_MS,
  };
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
async function handleSync(env, playerId, body) {
  const now = Date.now();
  const seedPoints = Math.max(0, Math.round(Number(body.points) || 0));
  const isNew = await ensurePlayer(env, playerId, seedPoints);

  const gelenState = (body.state && typeof body.state === 'object') ? body.state : {};

  if (isNew) {
    const stmts = Object.entries(gelenState).map(([key, value]) => env.DB.prepare(
      'INSERT INTO player_data (player_id, key, value, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(playerId, key, JSON.stringify(value), now));
    if (stmts.length) await env.DB.batch(stmts);
  } else {
    const stmts = [];
    for (const [key, value] of Object.entries(gelenState)) {
      if (!key.startsWith('best_')) continue;
      const skor = Number(value) || 0;
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
    'SELECT points, energy, streak_count, last_claim_at, last_spin_at FROM players WHERE id = ?',
  ).bind(playerId).first();
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
  if (prior) return { ok: true, total: prior.balance_after };

  for (let deneme = 0; deneme < 3; deneme++) {
    const row = await env.DB.prepare('SELECT energy FROM players WHERE id = ?').bind(playerId).first();
    const enerji = row ? row.energy : 0;
    const doluMu = enerji > 0;
    const verilecek = doluMu ? requestedAmount : Math.round(requestedAmount * EMPTY_ENERGY_CARPAN);
    const yeniEnerji = doluMu ? Math.max(0, enerji - ENERGY_PER_EARN) : 0;

    const res = await env.DB.prepare(
      'UPDATE players SET points = points + ?, energy = ?, updated_at = ? WHERE id = ? AND energy = ?',
    ).bind(verilecek, yeniEnerji, now, playerId, enerji).run();

    if (res.meta.changes === 0) continue; /* araya baska istek girdi, tekrar dene */

    const player = await env.DB.prepare('SELECT points FROM players WHERE id = ?').bind(playerId).first();
    const total = player.points;

    await env.DB.prepare(
      'INSERT INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(playerId, key, verilecek, total, now).run();

    return { ok: true, total, energy: yeniEnerji, credited: verilecek };
  }

  /* 3 denemede de yaris kaybedildi (cok nadir) - enerjisiz varsayip en
     azindan azaltilmis odulu vermeyi garanti et, kazanci hic kaybetme. */
  const azaltilmis = Math.round(requestedAmount * EMPTY_ENERGY_CARPAN);
  const yedek = await applyDelta(env, playerId, key, azaltilmis);
  return { ...yedek, energy: 0, credited: azaltilmis };
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
    return { ok: true, streak: durum.nextDay, reward: durum.nextReward, total: player.points };
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
    return { ok: true, index, prize: odul, total: player.points, energy: player.energy };
  }
  return { ok: false, reason: 'yeniden dene' };
}

/* Reklam izleme onayi GERCEK REKLAM SDK'si BAGLANANA KADAR burada yok -
   bu uc nokta enerjiyi kosulsuz dolduruyor. Demo/erken asama icin bilerek
   boyle birakildi (kullanici talebi). Ileride bir reklam SDK'si (Monetag
   vb.) entegre edilince, buraya SDK'nin sunucu tarafli "izlendi" onayi
   (postback/callback) dogrulamasi eklenmeden bu uc nokta canliya (gercek
   oyunculara) acik birakilmamali - su an demo/test icin. */
async function handleEnergyRefill(env, playerId) {
  const now = Date.now();
  await env.DB.prepare('UPDATE players SET energy = ?, updated_at = ? WHERE id = ?')
    .bind(MAX_ENERGY, now, playerId).run();
  return { ok: true, energy: MAX_ENERGY };
}

/* Bir oyunun rekorunu gunceller - sadece gelen skor mevcut rekordan
   buyukse. Okuma-sonra-yazma yerine tek UPSERT ifadesi kullaniliyor ki iki
   istek ayni anda gelince biri digerinin guncellemesini kaybetmesin. */
async function handleBest(env, playerId, body) {
  const game = String(body.game || '').trim();
  if (!game) return { error: 'game gerekli' };
  const key = `best_${game}`;
  const score = Math.max(0, Math.round(Number(body.score) || 0));
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
  if (!game) return { error: 'game gerekli' };
  const key = `state_${game}`;
  const now = Date.now();
  const expected = Number(body.expectedVersion) || 0;
  const valueJson = JSON.stringify(body.state ?? null);

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
      return json(await handleSync(env, playerId, body));
    }

    /* Diger uc noktalar icin guvenlik agi: oyuncu satiri yoksa olustur.
       Normal akista /api/sync her zaman ilk cagrilan uc nokta oldugu icin
       bu pratikte hep no-op olur. */
    await ensurePlayer(env, playerId);

    switch (url.pathname) {
      case '/api/points/spend':
        return json(await applyDelta(env, playerId, body.opId, -Math.abs(Math.round(Number(body.amount) || 0))));
      case '/api/points/earn':
        return json(await applyEarn(env, playerId, body.opId, Math.abs(Math.round(Number(body.amount) || 0))));
      case '/api/best':
        return json(await handleBest(env, playerId, body));
      case '/api/state':
        return json(await handleState(env, playerId, body));
      case '/api/energy/refill':
        return json(await handleEnergyRefill(env, playerId));
      case '/api/streak/claim':
        return json(await handleStreakClaim(env, playerId));
      case '/api/spin':
        return json(await handleSpin(env, playerId));
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
