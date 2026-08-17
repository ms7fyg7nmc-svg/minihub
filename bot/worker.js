
const MINI_APP_URL = 'https://ms7fyg7nmc-svg.github.io/minihub/';
const BOT_USERNAME = 'minihubgames_bot';
const CHANNEL_URL = 'https://t.me/minihubgames';

const ALLOWED_ORIGIN = 'https://ms7fyg7nmc-svg.github.io';

const MAX_ENERGY = 24;
const ENERGY_REGEN_MS = 30 * 60 * 1000;
const ENERGY_PER_EARN = 1;
const EMPTY_ENERGY_CARPAN = 0.25;

const STREAK_REWARDS = [100, 150, 200, 300, 400, 500, 1000];
const STREAK_MIN_GAP_MS = 24 * 3600 * 1000;
const STREAK_RESET_GAP_MS = 48 * 3600 * 1000;

const SPIN_MIN_GAP_MS = 24 * 3600 * 1000;

const REFERRAL_SIGNUP_BONUS = 500;
const REFERRAL_LEVEL_MILESTONES = [
  [5, 750], [15, 1500], [30, 3000], [50, 5000], [75, 7500], [99, 10000],
];

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

const MAX_EARN_PER_REQUEST = 10000;
const DAILY_EARN_CAP = 30000;

const MAX_SPEND_PER_REQUEST = 100000;

const GECERLI_OYUNLAR = new Set([
  '2048', 'blockblast', 'watersort', 'match3', 'tripletile',
  'flow', 'snake', 'dragon', 'pet',
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

async function applyReferralMilestones(env, playerId, state) {
  const seviye = Math.max(0, Math.min(99, Math.floor(Number(state?.dragons?.[0]?.level)) || 0));
  if (seviye < REFERRAL_LEVEL_MILESTONES[0][0]) return;

  const oyuncu = await env.DB.prepare('SELECT referrer_id FROM players WHERE id = ?').bind(playerId).first();
  const referrerId = oyuncu?.referrer_id;
  if (!referrerId) return;

  await ensurePlayer(env, referrerId);
  for (const [esik, odul] of REFERRAL_LEVEL_MILESTONES) {
    if (seviye < esik) break;
    await applyDelta(env, referrerId, `ref:lvl:${esik}:${playerId}`, odul);
  }
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
  const kazanilan = Math.floor((now - son) / ENERGY_REGEN_MS);
  if (kazanilan <= 0) return { energy: row.energy, energyAt: son, degisti: !row.energy_at };
  const yeni = Math.min(MAX_ENERGY, row.energy + kazanilan);
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
  for (const r of rows.results) {
    state[r.key] = JSON.parse(r.value);
    meta[r.key] = r.version;
  }

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
    spin: { ...spinDurumu(player, now), prizes: SPIN_PRIZES.map((p) => ({ tur: p.tur, miktar: p.miktar })) },
    state,
    meta,
  };
}

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
      'INSERT INTO spend_log (player_id, op_id, delta, balance_after, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(playerId, key, verilecek, total, now).run();

    return { ok: true, total, energy: yeniEnerji, credited: verilecek };
  }

  const azaltilmis = Math.min(Math.round(requestedAmount * EMPTY_ENERGY_CARPAN), kalanHak);
  const yedek = await applyDelta(env, playerId, key, azaltilmis);
  return { ...yedek, energy: 0, credited: azaltilmis };
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

    const sql = odul.tur === 'enerji'
      ? 'UPDATE players SET energy = ?, last_spin_at = ?, updated_at = ? WHERE id = ? AND last_spin_at = ?'
      : 'UPDATE players SET points = points + ?, last_spin_at = ?, updated_at = ? WHERE id = ? AND last_spin_at = ?';
    const deger = odul.tur === 'enerji' ? MAX_ENERGY : odul.miktar;

    const res = await env.DB.prepare(sql).bind(deger, now, now, playerId, row.last_spin_at).run();
    if (res.meta.changes === 0) continue;

    const player = await env.DB.prepare('SELECT points, energy FROM players WHERE id = ?').bind(playerId).first();
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

const LIDER_LIMIT = 50;

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

async function handleReferral(env, playerId) {
  const kazanc = await env.DB.prepare(
    "SELECT COALESCE(SUM(delta), 0) AS toplam FROM spend_log WHERE player_id = ? AND op_id LIKE 'ref:%'",
  ).bind(playerId).first();

  const rows = await env.DB.prepare(
    `SELECT p.id, p.name, pd.value AS durum
     FROM players p LEFT JOIN player_data pd ON pd.player_id = p.id AND pd.key = 'state_dragon'
     WHERE p.referrer_id = ? ORDER BY p.created_at DESC LIMIT 100`,
  ).bind(playerId).all();

  const arkadaslar = rows.results.map((r) => {
    let seviye = 0;
    try { seviye = Math.max(0, Math.floor(Number(JSON.parse(r.durum)?.dragons?.[0]?.level)) || 0); } catch {}
    return { ad: r.name || '', seviye };
  });

  return {
    toplamKazanc: kazanc ? kazanc.toplam : 0,
    sayi: arkadaslar.length,
    arkadaslar,
  };
}

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

  const isRecord = res.meta.changes === 1;

  const row = await env.DB.prepare('SELECT value FROM player_data WHERE player_id = ? AND key = ?')
    .bind(playerId, key).first();
  const best = row ? Number(JSON.parse(row.value)) || 0 : score;

  return { best, isRecord };
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

  if (game === 'dragon') await applyReferralMilestones(env, playerId, kayitliDurum);

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
      case '/api/points/earn':
        return json(await applyEarn(env, playerId, body.opId, guvenliSayi(body.amount, MAX_EARN_PER_REQUEST)));
      case '/api/energy/spend':
        return json(await handleEnergySpend(env, playerId, body.opId));
      case '/api/energy/ad-refill':
        return json(await handleAdRefill(env, playerId, body.opId));
      case '/api/energy/star-invoice':
        return json(await handleStarInvoice(env, playerId));
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
      case '/api/referral':
        return json(await handleReferral(env, playerId));
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
    } else {
      await send(env, chatId, t.nudge, keyboard(t, chatIdStr));
    }

    return new Response('ok');
  },
};
