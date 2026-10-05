import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

const BURASI = new URL('.', import.meta.url);
const SCHEMA = readFileSync(new URL('schema.sql', BURASI), 'utf8');
const worker = await import(new URL('worker.js', BURASI).href);

/* Enerji tavani worker'in KAYNAGINDAN okunuyor, teste sabit yazilmiyor.
   Tavan 24'ten 12'ye indirildiginde dokuz test birden kirildi; artik
   tavan degisince beklentiler kendiliginde uyuyor. */
const WORKER_KAYNAK = readFileSync(new URL('worker.js', BURASI), 'utf8');
const MAX_ENERGY = Number(WORKER_KAYNAK.match(/const MAX_ENERGY = (\d+)/)[1]);
const REFILL = Number(WORKER_KAYNAK.match(/const ENERGY_REFILL_AMOUNT = (\d+)/)[1]);
/* Davet sayilari da ayni sebeple kaynaktan: bonus 500'den 1500'e,
   oranlar %15/%2,5'ten %25/%5'e cikinca yedi test birden kirilmisti. */
const DAVET_BONUS = Number(WORKER_KAYNAK.match(/const REFERRAL_SIGNUP_BONUS = (\d+)/)[1]);
const ORAN1 = Number(WORKER_KAYNAK.match(/const REFERRAL_RATE_DIRECT = ([\d.]+)/)[1]);
const ORAN2 = Number(WORKER_KAYNAK.match(/const REFERRAL_RATE_INDIRECT = ([\d.]+)/)[1]);
const yuzde = (o) => `%${String(o * 100).replace('.', ',')}`;

function makeDb() {
  const sqlite = new DatabaseSync(':memory:');
  const temiz = SCHEMA.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const stmt of temiz.split(';').map((s) => s.trim()).filter(Boolean)) sqlite.exec(stmt + ';');
  return {
    _sqlite: sqlite,
    prepare(sql) {
      return {
        _sql: sql, _args: [],
        bind(...a) { this._args = a; return this; },
        run() { return { meta: { changes: sqlite.prepare(this._sql).run(...this._args).changes } }; },
        first() { return sqlite.prepare(this._sql).get(...this._args) ?? null; },
        all() { return { results: sqlite.prepare(this._sql).all(...this._args) }; },
      };
    },
    async batch(stmts) { const o = []; for (const s of stmts) o.push(s.run()); return o; },
  };
}

const BOT_TOKEN = 'test-bot-token';
function signedInitData(userId) {
  const params = new URLSearchParams();
  params.set('user', JSON.stringify({ id: userId, first_name: 'Test' }));
  params.set('auth_date', String(Math.floor(Date.now() / 1000)));
  const dcs = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', createHmac('sha256', secret).update(dcs).digest('hex'));
  return params.toString();
}

let passed = 0, failed = 0;
function check(name, cond, detay = '') {
  if (cond) { passed++; console.log(`OK   ${name}`); }
  else { failed++; console.log(`FAIL ${name} ${detay}`); }
}

/* /api/points/earn KALDIRILDI: istemcinin dogrudan miktar soyleyebildigi
   kapi oydu. Kazanc artik SKORDAN hesaplaniyor, bu yuzden "su kadar
   kazandir" demek icin skoru bolucuyle carpiyoruz. snake'in bolucusu 5.
   Sayiyi yine KAYNAKTAN okuyoruz. */
const SNAKE_BOLUCU = Number(WORKER_KAYNAK.match(/snake:\s*\{ bolucu: (\d+)/)[1]);
const SNAKE_TAVAN = Number(WORKER_KAYNAK.match(/snake:\s*\{ bolucu: \d+,\s*tavan: (\d+)/)[1]);

function kazandir(env, initData, miktar, opId) {
  return api(env, 'best', { initData, game: 'snake', score: miktar * SNAKE_BOLUCU, opId });
}

async function api(env, path, body) {
  const res = await worker.default.fetch(
    new Request(`https://x/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), env);
  return res.json();
}

// Bot webhook (Stars odeme akisi dahil) gercek Telegram API'sine fetch()
// atiyor - testte gercek aga cikmayalim diye api.telegram.org cagrilarini
// yakalayip sahte cevap donduruyoruz, gerisini olduğu gibi birakiyoruz.
const telegramCagrilari = [];
const gercekFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('api.telegram.org')) {
    const govde = opts?.body ? JSON.parse(opts.body) : null;
    telegramCagrilari.push({ url: u, govde });
    if (u.includes('/createInvoiceLink')) {
      return { ok: true, json: async () => ({ ok: true, result: 'https://t.me/$sahte-fatura' }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  }
  return gercekFetch(url, opts);
};

async function webhook(env, update) {
  const res = await worker.default.fetch(
    new Request('https://x/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': env.WEBHOOK_SECRET },
      body: JSON.stringify(update),
    }), env);
  return res;
}

const DB = makeDb();
const env = { DB, BOT_TOKEN, BAKIM: '' };
const initData = signedInitData(111);

let r = await api(env, 'sync', { initData, points: 0, state: {} });
check(`sync: energy ${MAX_ENERGY}`, r.energy === MAX_ENERGY, `-> ${r.energy}`);
check('sync: streak var', !!r.streak);
check('sync: spin var', !!r.spin);
/* Sayilari burada SABIT yazmiyoruz; worker.js'ten okuyoruz. Eskiden
   [100,150,...] elle yaziliydi ve odulleri iki katina cikarmak testi
   kirdi - oysa kirilmasi gereken bir sey yoktu. */
const STREAK_BEKLENEN = JSON.parse('[' + WORKER_KAYNAK.match(/const STREAK_REWARDS = \[([^\]]+)\]/)[1] + ']');
check('odul merdiveni sunucudan geliyor',
      JSON.stringify(r.streak.rewards) === JSON.stringify(STREAK_BEKLENEN),
      `-> ${JSON.stringify(r.streak.rewards)} vs ${JSON.stringify(STREAK_BEKLENEN)}`);

/* Istek basi tavan artik OYUNUN SKOR TAVANINDAN geliyor: uydurma bir
   skor gonderilse bile odeme tavan/bolucu'yu gecemiyor. */
const ISTEK_TAVANI = Math.floor(SNAKE_TAVAN / SNAKE_BOLUCU);
r = await kazandir(env, initData, 999999999, 'atk-1');
check(`dev skor oyun tavanina kirpildi (${ISTEK_TAVANI})`, r.earned === ISTEK_TAVANI, `-> ${r.earned}`);
check('dev skor sonrasi bakiye tavan kadar', r.total === ISTEK_TAVANI, `-> ${r.total}`);

for (let i = 2; i <= 40 && r.total < 30000; i++) {
  r = await kazandir(env, initData, 999999999, `atk-${i}`);
}
check('gunluk tavan tuttu: bakiye 30.000de kaldi', r.total === 30000, `-> ${r.total}`);
r = await kazandir(env, initData, 999999999, 'atk-son');
check('tavan dolunca sonraki kazanc 0', r.earned === 0, `-> ${r.earned}`);

const DB2 = makeDb(); const env2 = { DB: DB2, BOT_TOKEN, BAKIM: '' }; const id2 = signedInitData(222);
await api(env2, 'sync', { initData: id2, points: 0, state: {} });
async function hamApi(env, path, hamGovde) {
  const res = await worker.default.fetch(new Request(`https://x/api/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hamGovde,
  }), env);
  return res.json();
}
r = await hamApi(env2, 'best', `{"initData":${JSON.stringify(id2)},"game":"snake","opId":"inf","score":1e400}`);
check('ham JSON 1e400 (=Infinity) skor 0 sayildi, sunucu cokmedi',
      r.earned === 0 && r.best === 0, `-> ${JSON.stringify(r)}`);
r = await hamApi(env2, 'best', `{"initData":${JSON.stringify(id2)},"game":"snake","opId":"buyuk","score":1e308}`);
check('devasa ama sonlu skor oyun tavanina kirpildi',
      r.earned === Math.floor(SNAKE_TAVAN / SNAKE_BOLUCU), `-> ${r.earned}`);
r = await api(env2, 'best', { initData: id2, game: 'snake', opId: 'nan', score: 'abc' });
check('metin skor 0 sayildi', r.earned === 0, `-> ${r.earned}`);
r = await api(env2, 'best', { initData: id2, game: 'snake', opId: 'neg', score: -5000 });
check('negatif skor 0 sayildi (bakiye dusurulemedi)', r.earned === 0, `-> ${r.earned}`);

/* Kaldirilan uc nokta gercekten kapali olmali - bu testin kendisi, acik
   kalmis bir para muslugunu yakalayan sey. */
const kaldirilan = await worker.default.fetch(new Request('https://x/api/points/earn', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData: id2, opId: 'kapali', amount: 9999 }),
}), env2);
const kaldirilanGovde = await kaldirilan.json();
check('/api/points/earn kaldirildi (404)',
      kaldirilan.status === 404 && kaldirilanGovde.error === 'bulunamadi',
      `-> ${kaldirilan.status} ${JSON.stringify(kaldirilanGovde)}`);

const DB3 = makeDb(); const env3 = { DB: DB3, BOT_TOKEN, BAKIM: '' }; const id3 = signedInitData(333);
r = await api(env3, 'sync', { initData: id3, points: 999999999, state: {} });
check('sahte baslangic bakiyesi 5.000e kirpildi', r.points === 5000, `-> ${r.points}`);

const DB3b = makeDb(); const env3b = { DB: DB3b, BOT_TOKEN, BAKIM: '' }; const id3b = signedInitData(334);
r = await api(env3b, 'sync', {
  initData: id3b, points: 0,
  state: { best_2048: 999999999, state_dragon: { dragons: [{ level: 99 }], owned: { color: ['celestial'] }, ownedIslands: ['kingdom'] } },
});
check('ilk senkronda gelen sahte rekor de tavana kirpiliyor', r.state?.best_2048 === 10000000, `-> ${r.state?.best_2048}`);
const tabanSatir3b = DB3b.prepare("SELECT value FROM player_data WHERE player_id = ? AND key = 'dragon_taban'").bind('334').first();
check('ilk senkrondaki ejderha iddiasi hemen taban olarak kilitleniyor', !!tabanSatir3b, `-> ${JSON.stringify(tabanSatir3b)}`);
r = await api(env3b, 'state', { initData: id3b, game: 'dragon',
  state: { dragons: [{ level: 99 }], owned: { color: ['celestial', 'aurora'] }, ownedIslands: ['kingdom'] },
  expectedVersion: 1 });
check('senkronla kilitlenen tabanin uzerine harcamasiz yukselis reddediliyor', r.reddedildi === true, `-> ${JSON.stringify(r).slice(0, 90)}`);

/* SURUM CAKISMASI - istemcideki sira mekanizmasinin VARLIK SEBEBI.

   Sunucu beklenen surum tutmazsa YAZMIYOR ve o anda kayitli olani geri
   donduruyor. Istemci bunu kosulsuz kabul ederse, es zamanli iki kayit
   gonderildiginde ikincisi sessizce silinir ve tahta geri doner - oyuncu
   bunu "birlestirirken dondu" diye yasiyor (bkz. js/store.js saveState,
   kayitUcusta/kayitBekleyen).

   Bu test o sunucu davranisini sabitliyor: degisirse istemcideki sira
   da gozden gecirilmeli. */
const DBv = makeDb(); const envv = { DB: DBv, BOT_TOKEN, BAKIM: '' }; const idv = signedInitData(777001);
await api(envv, 'sync', { initData: idv, points: 0, state: {} });

r = await api(envv, 'state', { initData: idv, game: '2048', state: { a: 1 }, expectedVersion: 0 });
check('surum: ilk yazma gecti (surum 1)', r.version === 1 && r.state?.a === 1, `-> ${JSON.stringify(r)}`);

/* Es zamanli ikinci kayit: ILK yanit gelmedigi icin hala eski surumu
   tasiyor. Sunucu yazmiyor ve ESKI state'i donduruyor. */
r = await api(envv, 'state', { initData: idv, game: '2048', state: { a: 2 }, expectedVersion: 0 });
check('surum: bayat surumle gelen yazma REDDEDILDI (a hala 1)',
      r.state?.a === 1 && r.version === 1, `-> ${JSON.stringify(r)}`);

/* Taze surumle ayni yazma geciyor - istemci sirada bekleyip bunu yapiyor. */
r = await api(envv, 'state', { initData: idv, game: '2048', state: { a: 2 }, expectedVersion: 1 });
check('surum: taze surumle ayni yazma gecti (a = 2)',
      r.state?.a === 2 && r.version === 2, `-> ${JSON.stringify(r)}`);

r = await api(env3, 'best', { initData: id3, game: 'uydurma-oyun', score: 100 });
check('bilinmeyen oyun icin rekor reddedildi', r.error === 'bilinmeyen oyun', `-> ${JSON.stringify(r)}`);
r = await api(env3, 'state', { initData: id3, game: '../../etc', state: { x: 1 }, expectedVersion: 0 });
check('bilinmeyen oyun icin durum reddedildi', r.error === 'bilinmeyen oyun', `-> ${JSON.stringify(r)}`);
const satirSayisi = DB3.prepare('SELECT COUNT(*) AS n FROM player_data WHERE player_id = ?').bind('333').first();
check('reddedilen istekler veritabanina satir yazmadi', satirSayisi.n === 0, `-> ${satirSayisi.n}`);
r = await api(env3, 'best', { initData: id3, game: '2048', score: 5000 });
check('gecerli oyun icin rekor hala calisiyor', r.best === 5000, `-> ${JSON.stringify(r)}`);

const kocaman = { cop: 'x'.repeat(200000) };
r = await api(env3, 'state', { initData: id3, game: 'dragon', state: kocaman, expectedVersion: 0 });
check('32 KB ustu durum yazilmadi', r.state === null, `-> ${JSON.stringify(r).slice(0, 80)}`);
r = await api(env3, 'state', { initData: id3, game: 'dragon', state: { level: 5 }, expectedVersion: 0 });
check('normal boyutlu durum hala yaziliyor', r.state?.level === 5, `-> ${JSON.stringify(r)}`);

const sahte = new URLSearchParams({ user: JSON.stringify({ id: 555 }), auth_date: String(Math.floor(Date.now() / 1000)), hash: 'a'.repeat(64) }).toString();
const sahteRes = await worker.default.fetch(new Request('https://x/api/best', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData: sahte, game: 'snake', opId: 'x', score: 1000 }),
}), env);
check('sahte imza 401 ile reddedildi', sahteRes.status === 401, `-> ${sahteRes.status}`);

const DB5 = makeDb(); const env5 = { DB: DB5, BOT_TOKEN, BAKIM: '' }; const id5 = signedInitData(666);
await api(env5, 'sync', { initData: id5, points: 0, state: {} });
let toplamKazanc = 0;
for (let i = 0; i < MAX_ENERGY; i++) {
  const rr = await kazandir(env5, id5, 100, `n-${i}`);
  toplamKazanc += rr.credited;
}
check(`meshru oyun: ${MAX_ENERGY} tur tam odul aldi (${MAX_ENERGY * 100})`,
      toplamKazanc === MAX_ENERGY * 100, `-> ${toplamKazanc}`);
r = await kazandir(env5, id5, 100, 'n-bos');
check('enerji bitince odul %25e dustu (25)', r.credited === 25, `-> ${r.credited}`);

DB5.prepare('UPDATE players SET energy = 0, energy_at = ? WHERE id = ?')
  .bind(Date.now() - 2 * 3600 * 1000, '666').run();
let re1 = await api(env5, 'sync', { initData: id5, points: 0, state: {} });
check('2 saat sonra 4 enerji yenilendi', re1.energy === 4, `-> ${re1.energy}`);
DB5.prepare('UPDATE players SET energy = 0, energy_at = ? WHERE id = ?')
  .bind(Date.now() - 400 * 3600 * 1000, '666').run();
re1 = await api(env5, 'sync', { initData: id5, points: 0, state: {} });
check(`cok bekleyince tavanda duruyor (${MAX_ENERGY})`, re1.energy === MAX_ENERGY, `-> ${re1.energy}`);
const oncekiBakiye = r.total;
r = await kazandir(env5, id5, 100, 'n-bos');
check('ayni opId tekrar uygulanmadi', r.total === oncekiBakiye && r.credited === 0, `-> ${JSON.stringify(r)}`);
r = await api(env5, 'streak/claim', { initData: id5 });
check(`gunluk seri hala calisiyor (gun 1, ${STREAK_BEKLENEN[0]} jeton)`,
      r.ok && r.streak === 1 && r.reward === STREAK_BEKLENEN[0], `-> ${JSON.stringify(r)}`);
r = await api(env5, 'spin', { initData: id5 });
check('gunluk cark hala calisiyor', r.ok === true, `-> ${JSON.stringify(r)}`);

/* CARKIN ENERJI ODULU: UC BIRIM, VE DEPO DOLUYKEN DE ODENIYOR.
   Bu test iki hatanin tekrarina karsi. Birincisi: enerji okunurken
   MAX_ENERGY'ye kirpiliyordu, yani tavan ustu odul bir sonraki okumada
   sessizce siliniyordu. Ikincisi: odul "energy = X" olarak ATANIYORDU,
   yani eklemek yerine depoyu sabit bir degere kuruyordu. */
const SPIN_ODUL = Number(WORKER_KAYNAK.match(/const SPIN_ENERGY_REWARD = (\d+)/)[1]);
const SERT_TAVAN = MAX_ENERGY + SPIN_ODUL;

const DBe = makeDb(); const enve = { DB: DBe, BOT_TOKEN, BAKIM: '' }; const ide = signedInitData(4242);
await api(enve, 'sync', { initData: ide, points: 0, state: {} });
DBe.prepare('UPDATE players SET energy = ?, energy_at = ? WHERE id = ?')
  .bind(SERT_TAVAN, Date.now(), '4242').run();

r = await api(enve, 'sync', { initData: ide, points: 0, state: {} });
check(`cark odulu: tavan ustu enerji okunurken kirpilmiyor (${SERT_TAVAN})`,
      r.energy === SERT_TAVAN, `-> ${r.energy}`);

/* Zaman gecmesi tavan ustu depoyu daha da doldurmamali. */
DBe.prepare('UPDATE players SET energy_at = ? WHERE id = ?')
  .bind(Date.now() - 48 * 3600 * 1000, '4242').run();
r = await api(enve, 'sync', { initData: ide, points: 0, state: {} });
check('cark odulu: rejenerasyon tavan ustu depoyu daha da doldurmuyor',
      r.energy === SERT_TAVAN, `-> ${r.energy}`);

/* Odulun GERCEKTEN eklendigini cevirerek kanitliyoruz. Cark rastgele
   seciyor, o yuzden Math.random'i enerji dilimine denk gelecek sekilde
   sabitliyoruz: agirliklarin toplami 1000 ve enerji dilimi [985,995)
   araligina dusuyor. */
const gercekRandom = Math.random;
Math.random = () => 0.99;
try {
  DBe.prepare('UPDATE players SET energy = ?, energy_at = ?, last_spin_at = 0 WHERE id = ?')
    .bind(5, Date.now(), '4242').run();
  r = await api(enve, 'spin', { initData: ide });
  check(`cark odulu: enerji dilimi ${SPIN_ODUL} birim EKLIYOR (5 -> ${5 + SPIN_ODUL})`,
        r.ok && r.prize?.tur === 'enerji' && r.energy === 5 + SPIN_ODUL,
        `-> ${JSON.stringify({ tur: r.prize?.tur, energy: r.energy })}`);

  /* Deposu doluyken de odul kayboluyor olmamali - tam tavana kadar
     cikabilmeli, yoksa "3 enerji kazandin" deyip 0 vermis oluruz. */
  DBe.prepare('UPDATE players SET energy = ?, energy_at = ?, last_spin_at = 0 WHERE id = ?')
    .bind(MAX_ENERGY, Date.now(), '4242').run();
  r = await api(enve, 'spin', { initData: ide });
  check(`cark odulu: depo doluyken de odeniyor (${MAX_ENERGY} -> ${SERT_TAVAN})`,
        r.ok && r.energy === SERT_TAVAN, `-> ${r.energy}`);

  /* Ama sert tavani asamamali. */
  DBe.prepare('UPDATE players SET energy = ?, energy_at = ?, last_spin_at = 0 WHERE id = ?')
    .bind(SERT_TAVAN, Date.now(), '4242').run();
  r = await api(enve, 'spin', { initData: ide });
  check('cark odulu: sert tavani asmiyor', r.ok && r.energy === SERT_TAVAN, `-> ${r.energy}`);
} finally {
  Math.random = gercekRandom;
}

check(`cark odulu: sert tavanin ustu kirpiliyor (9999 -> ${SERT_TAVAN})`,
      r.energy === SERT_TAVAN, `-> ${r.energy}`);
r = await api(env5, 'points/spend', { initData: id5, opId: 'harca-1', amount: 50 });
check('harcama hala calisiyor', r.ok === true, `-> ${JSON.stringify(r)}`);
r = await api(env5, 'points/spend', { initData: id5, opId: 'harca-2', amount: 99999999 });
check('bakiyeden fazla harcanamiyor', r.ok === false, `-> ${JSON.stringify(r)}`);

const DB6 = makeDb(); const env6 = { DB: DB6, BOT_TOKEN, BAKIM: '' }; const id6 = signedInitData(777);
await api(env6, 'sync', { initData: id6, points: 0, state: {} });

const mutevazi = { v: 2, dragons: [{ id: 'd1', level: 3, xp: 0, look: {} }],
                   owned: { color: ['ember'] }, ownedIslands: ['grassland'] };
r = await api(env6, 'state', { initData: id6, game: 'dragon', state: mutevazi, expectedVersion: 0 });
check('yeni oyuncunun ilk durumu taban olarak kabul edildi', r.state?.dragons?.[0]?.level === 3,
      `-> ${JSON.stringify(r).slice(0, 80)}`);

const hileli = { v: 2, dragons: [{ id: 'd1', level: 99, xp: 0, look: {} }],
                 owned: { color: ['ember', 'aurora'], wings: ['celestial'], head: ['celestial'] },
                 ownedIslands: ['grassland', 'dragonKingdom'] };
r = await api(env6, 'state', { initData: id6, game: 'dragon', state: hileli, expectedVersion: 1 });
check('harcamasiz seviye 99 + mythic esyalar REDDEDILDI', r.reddedildi === true, `-> ${JSON.stringify(r).slice(0, 90)}`);
check('reddedilince sunucudaki eski durum korundu', r.state?.dragons?.[0]?.level === 3, `-> ${r.state?.dragons?.[0]?.level}`);

const DB7 = makeDb(); const env7 = { DB: DB7, BOT_TOKEN, BAKIM: '' }; const id7 = signedInitData(888);
await api(env7, 'sync', { initData: id7, points: 0, state: {} });
DB7.prepare('UPDATE players SET points = 900000 WHERE id = ?').bind('888').run();
r = await api(env7, 'state', { initData: id7, game: 'dragon', state: mutevazi, expectedVersion: 0 });
for (let i = 0; i < 9; i++) {
  await api(env7, 'points/spend', { initData: id7, opId: `harca-${i}`, amount: 100000 });
}
r = await api(env7, 'state', { initData: id7, game: 'dragon', state: hileli, expectedVersion: 1 });
check('gercekten harcayan oyuncu ayni ilerlemeyi YAZABILDI', r.reddedildi !== true && r.state?.dragons?.[0]?.level === 99,
      `-> ${JSON.stringify(r).slice(0, 90)}`);

r = await api(env6, 'state', { initData: id6, game: 'taban', state: { maliyet: 0 }, expectedVersion: 0 });
check('istemci dahili taban anahtarini yazamiyor', r.error === 'bilinmeyen oyun', `-> ${JSON.stringify(r)}`);

const dataJs = await import('/Users/vtredi/minihub/games/dragon/data.js');
const workerKaynak = readFileSync('/Users/vtredi/minihub/bot/worker.js', 'utf8');
// 'tail' burada yok: kategori hub'dan kaldirildi, data.js'te artik satis
// kataloğu yok - worker.js'teki FIYAT.tail sadece eskiden sahip olan
// oyunculari degerlendirmek icin (bkz. iddiaMaliyeti) donuk halde duruyor,
// karsilastirilacak canli bir client listesi kalmadi.
const gruplar = { color: 'COLORS', skin: 'SKINS', wings: 'WINGS',
                  head: 'HEADS', face: 'FACES', aura: 'AURAS', island: 'ISLANDS' };
let ayrisan = [];
for (const [slot, disaAd] of Object.entries(gruplar)) {
  for (const [id, item] of Object.entries(dataJs[disaAd])) {
    if (!item.price) continue;
    const kalip = new RegExp(`\\b${id}: ${item.price}\\b`);
    if (!kalip.test(workerKaynak)) ayrisan.push(`${slot}.${id}=${item.price}`);
  }
}
check('sunucu fiyat tablosu data.js ile ayni', ayrisan.length === 0, `-> ayrisan: ${ayrisan.join(', ')}`);

const hubKaynak = readFileSync('/Users/vtredi/minihub/js/hub.js', 'utf8');
const workerSignup = /REFERRAL_SIGNUP_BONUS = (\d+)/.exec(workerKaynak)?.[1];
const hubSignup = /REFERRAL_SIGNUP_BONUS = (\d+)/.exec(hubKaynak)?.[1];
check('referral: afis katilim bonusu sunucuyla ayni', workerSignup && workerSignup === hubSignup,
      `-> worker=${workerSignup} hub=${hubSignup}`);

/* Oranlar iki dosyada ayri yaziliyor (sunucu odiyor, hub anlatiyor).
   Ayrisirlarsa oyuncuya yanlis yuzde gosterilir - burada yakalaniyor. */
const oran = (kaynak, ad) => /REFERRAL_RATE_DIRECT = ([\d.]+)/.exec(kaynak)?.[1] + '/'
                           + /REFERRAL_RATE_INDIRECT = ([\d.]+)/.exec(kaynak)?.[1];
check('referral: komisyon oranlari sunucuyla ayni',
      oran(workerKaynak) === oran(hubKaynak) && !oran(workerKaynak).includes('undefined'),
      `-> worker=${oran(workerKaynak)} hub=${oran(hubKaynak)}`);

const DB8 = makeDb(); const env8 = { DB: DB8, BOT_TOKEN, BAKIM: '' }; const id8 = signedInitData(999);
await api(env8, 'sync', { initData: id8, points: 0, state: {} });

r = await kazandir(env8, id8, 120, 'restart-earn-1');
check('restart: skor puana cevrilip krediliyor', r.total === 120, `-> ${r.total}`);
check(`restart: puan eklemek kendi enerjisini dusuyor (${MAX_ENERGY} -> ${MAX_ENERGY - 1})`,
      r.energy === MAX_ENERGY - 1, `-> ${r.energy}`);

r = await api(env8, 'energy/spend', { initData: id8, opId: 'restart-empty-1' });
check('restart: skor yokken de -1 enerji uygulaniyor',
      r.ok === true && r.energy === MAX_ENERGY - 2, `-> ${JSON.stringify(r)}`);
check('restart: enerji dusrken puan bakiyesi degismiyor', r.total === 120, `-> ${r.total}`);

r = await api(env8, 'energy/spend', { initData: id8, opId: 'restart-empty-1' });
check('restart: ayni opId tekrar enerji dusurmuyor (idempotent)',
      r.energy === MAX_ENERGY - 2, `-> ${r.energy}`);

for (let i = 0; i < 30; i++) await api(env8, 'energy/spend', { initData: id8, opId: `restart-drain-${i}` });
r = await api(env8, 'energy/spend', { initData: id8, opId: 'restart-drain-son' });
check('restart: enerji 0da tikaniyor, negatife dusmuyor', r.energy === 0, `-> ${r.energy}`);

const WEBHOOK_SECRET = 'test-webhook-secret';
const DB10 = makeDb(); const env10 = { DB: DB10, BOT_TOKEN, WEBHOOK_SECRET }; const id10 = signedInitData(4242);
await api(env10, 'sync', { initData: id10, points: 0, state: {} });
DB10.prepare('UPDATE players SET energy = 0 WHERE id = ?').bind('4242').run();

r = await api(env10, 'energy/ad-refill', { initData: id10, opId: 'ad-1' });
check('reklam refill enerjiyi +6 artiriyor', r.ok === true && r.energy === 6, `-> ${JSON.stringify(r)}`);
r = await api(env10, 'energy/ad-refill', { initData: id10, opId: 'ad-1' });
check('ayni opId ile reklam refill tekrar uygulanmiyor (idempotent)', r.energy === 6, `-> ${r.energy}`);

for (let i = 2; i <= 6; i++) await api(env10, 'energy/ad-refill', { initData: id10, opId: `ad-${i}` });
r = await api(env10, 'energy/ad-refill', { initData: id10, opId: 'ad-7' });
check('reklamla gunde 6dan fazla enerji doldurulamiyor', r.ok === false && r.reason === 'gunluk-limit', `-> ${JSON.stringify(r)}`);

const syncSonrasi = await api(env10, 'sync', { initData: id10, points: 0, state: {} });
check('sync gunluk reklam hakkini dogru raporluyor (0 kaldi)', syncSonrasi.energyRefill?.adLeft === 0, `-> ${JSON.stringify(syncSonrasi.energyRefill)}`);
check('sync gunluk star hakki hala tam (6)', syncSonrasi.energyRefill?.starLeft === 6, `-> ${JSON.stringify(syncSonrasi.energyRefill)}`);

const DB10b = makeDb(); const env10b = { DB: DB10b, BOT_TOKEN, WEBHOOK_SECRET }; const id10b = signedInitData(4243);
await api(env10b, 'sync', { initData: id10b, points: 0, state: {} });
DB10b.prepare('UPDATE players SET energy = ? WHERE id = ?').bind(MAX_ENERGY - 2, '4243').run();
r = await api(env10b, 'energy/ad-refill', { initData: id10b, opId: 'ad-cap-test' });
check(`enerji dolumu MAX_ENERGY (${MAX_ENERGY}) ustune cikmiyor`,
      r.ok === true && r.energy === MAX_ENERGY, `-> ${JSON.stringify(r)}`);

r = await api(env10, 'energy/star-invoice', { initData: id10 });
check('star fatura linki uretiliyor', r.link === 'https://t.me/$sahte-fatura', `-> ${JSON.stringify(r)}`);
const invoiceCagrisi = telegramCagrilari.find((c) => c.url.includes('/createInvoiceLink'));
check('star fatura XTR para birimiyle ve dogru fiyatla isteniyor',
      invoiceCagrisi?.govde?.currency === 'XTR' && invoiceCagrisi?.govde?.prices?.[0]?.amount === 25,
      `-> ${JSON.stringify(invoiceCagrisi?.govde)}`);
check('star fatura payload\'inda oyuncu id dogru', invoiceCagrisi?.govde?.payload === 'energy_refill:4242', `-> ${invoiceCagrisi?.govde?.payload}`);

DB10.prepare('UPDATE players SET energy = 10 WHERE id = ?').bind('4242').run();
let onOnayRes = await webhook(env10, {
  pre_checkout_query: { id: 'pcq-1', invoice_payload: 'energy_refill:4242' },
});
const onOnayCagrisi = telegramCagrilari.find((c) => c.url.includes('/answerPreCheckoutQuery') && c.govde?.pre_checkout_query_id === 'pcq-1');
check('gecerli on-odeme kabul ediliyor', onOnayCagrisi?.govde?.ok === true, `-> ${JSON.stringify(onOnayCagrisi?.govde)}`);

await webhook(env10, {
  message: {
    chat: { id: 4242 },
    successful_payment: { invoice_payload: 'energy_refill:4242', telegram_payment_charge_id: 'charge-abc-1' },
  },
});
let oyuncu10 = DB10.prepare('SELECT energy FROM players WHERE id = ?').bind('4242').first();
check(`basarili Stars odemesi enerjiyi +${REFILL} kredilendiriyor`,
      oyuncu10.energy === Math.min(MAX_ENERGY, 10 + REFILL), `-> ${oyuncu10.energy}`);

await webhook(env10, {
  message: {
    chat: { id: 4242 },
    successful_payment: { invoice_payload: 'energy_refill:4242', telegram_payment_charge_id: 'charge-abc-1' },
  },
});
oyuncu10 = DB10.prepare('SELECT energy FROM players WHERE id = ?').bind('4242').first();
check('ayni telegram_payment_charge_id tekrar gelirse enerji ikinci kez kredilenmiyor',
      oyuncu10.energy === Math.min(MAX_ENERGY, 10 + REFILL), `-> ${oyuncu10.energy}`);

for (let i = 2; i <= 6; i++) {
  await webhook(env10, {
    message: {
      chat: { id: 4242 },
      successful_payment: { invoice_payload: 'energy_refill:4242', telegram_payment_charge_id: `charge-abc-${i}` },
    },
  });
}
r = await api(env10, 'energy/star-invoice', { initData: id10 });
check('star ile de gunde 6dan fazla fatura uretilmiyor', r.error === 'gunluk-limit', `-> ${JSON.stringify(r)}`);

onOnayRes = await webhook(env10, {
  pre_checkout_query: { id: 'pcq-limit-asildi', invoice_payload: 'energy_refill:4242' },
});
const reddedilenOnOnay = telegramCagrilari.find((c) => c.url.includes('/answerPreCheckoutQuery') && c.govde?.pre_checkout_query_id === 'pcq-limit-asildi');
check('gunluk star limiti dolunca on-odeme de reddediliyor', reddedilenOnOnay?.govde?.ok === false, `-> ${JSON.stringify(reddedilenOnOnay?.govde)}`);

await webhook(env10, { message: { chat: { id: 4242 }, text: '/terms', from: {} } });
const termsCagrisi = telegramCagrilari.find((c) => c.url.includes('/sendMessage') && c.govde?.text?.includes('Terms'));
check('/terms komutu kullanim sartlarini gonderiyor', !!termsCagrisi, '-> bulunamadi');

await webhook(env10, { message: { chat: { id: 4242 }, text: '/paysupport', from: {} } });
const paysupportCagrisi = telegramCagrilari.find((c) => c.url.includes('/sendMessage') && c.govde?.text?.includes('Payment support'));
check('/paysupport komutu odeme destegini gonderiyor', !!paysupportCagrisi, '-> bulunamadi');

globalThis.fetch = gercekFetch;

check('referral: payload ayristirma calisiyor', worker.parseReferralPayload('/start r1001') === '1001',
      `-> ${worker.parseReferralPayload('/start r1001')}`);
check('referral: bosluksuz /start payload uretmiyor', worker.parseReferralPayload('/start') === null);
check('referral: gecersiz payload yok sayiliyor', worker.parseReferralPayload('/start abc') === null);

const DB9 = makeDb(); const env9 = { DB: DB9, BOT_TOKEN, BAKIM: '' }; const idRef = signedInitData(1001);
await api(env9, 'sync', { initData: idRef, points: 0, state: {} });

const idA = signedInitData(2002);
DB9.prepare('INSERT INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)')
  .bind('2002', '1001', Date.now()).run();
r = await api(env9, 'sync', { initData: idA, points: 0, state: {} });
check(`referral: davet edilen arkadas hos geldin bonusu aldi (+${DAVET_BONUS})`, r.points === DAVET_BONUS, `-> ${r.points}`);

let referrerRow = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first();
check(`referral: davet eden kayit bonusu aldi (+${DAVET_BONUS})`, referrerRow.points === DAVET_BONUS, `-> ${referrerRow.points}`);

const bekleyenA = DB9.prepare('SELECT * FROM pending_referrals WHERE user_id = ?').bind('2002').first();
check('referral: bekleyen davet tuketildi', !bekleyenA);

/* --- KOMISYON: %15 dogrudan, %2,5 dolayli --- */

/* Zincir: 1001 -> 2002 -> 3003. 3003 kazaninca 2002 %15, 1001 %2,5 alir. */
const idC2 = signedInitData(3003);
DB9.prepare('INSERT INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)')
  .bind('3003', '2002', Date.now()).run();
await api(env9, 'sync', { initData: idC2, points: 0, state: {} });

const once1001 = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first().points;
const once2002 = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('2002').first().points;

r = await kazandir(env9, idC2, 1000, 'k-1');
check('referral: kazanan oyuncunun kendi kazanci kesilmedi (tam 1000)', r.credited === 1000, `-> ${r.credited}`);

let p2002 = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('2002').first().points;
let p1001 = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first().points;
check(`referral: dogrudan davet eden ${yuzde(ORAN1)} aldi (${1000 * ORAN1})`,
      p2002 - once2002 === 1000 * ORAN1, `-> ${p2002 - once2002}`);
check(`referral: bir ust kademe ${yuzde(ORAN2)} aldi (${1000 * ORAN2})`,
      p1001 - once1001 === 1000 * ORAN2, `-> ${p1001 - once1001}`);

/* Komisyonun kendisi komisyon uretmemeli: 2002'nin aldigi dogrudan
   komisyon icin 1001'e AYRICA bir odeme yapilmamis olmali. Yukaridaki
   iki kontrol bunu zaten kanitliyor - fark tam olarak orani kadar. */

r = await kazandir(env9, idC2, 1000, 'k-1');
const p2002Tekrar = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('2002').first().points;
check('referral: ayni opId tekrar gonderilince komisyon iki kez odenmiyor',
      p2002Tekrar === p2002, `-> ${p2002Tekrar} vs ${p2002}`);

/* Zincirin tepesindeki kisinin ustu yok: 2002 kazandiginda 1001
   dogrudan orani alir, daha yukarisi olmadigi icin baska odeme olmaz. */
const once1001b = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first().points;
await kazandir(env9, idA, 400, 'k-2');
p1001 = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first().points;
check(`referral: zincirin tepesi dogrudan orani aliyor (${400 * ORAN1})`,
      p1001 - once1001b === 400 * ORAN1, `-> ${p1001 - once1001b}`);

/* Daveti olmayan bir oyuncunun kazanci kimseye komisyon uretmemeli. */
const idYalniz = signedInitData(7007);
await api(env9, 'sync', { initData: idYalniz, points: 0, state: {} });
const oncePool = DB9.prepare("SELECT COALESCE(SUM(delta),0) AS t FROM spend_log WHERE op_id LIKE 'ref1:%' OR op_id LIKE 'ref2:%'").first().t;
await kazandir(env9, idYalniz, 1000, 'k-3');
const sonraPool = DB9.prepare("SELECT COALESCE(SUM(delta),0) AS t FROM spend_log WHERE op_id LIKE 'ref1:%' OR op_id LIKE 'ref2:%'").first().t;
check('referral: daveti olmayan oyuncu komisyon uretmiyor', sonraPool === oncePool, `-> ${sonraPool} vs ${oncePool}`);

/* Hic kazanmamis ikinci bir arkadas: listede "0" olarak gorunmeli,
   kaybolmamali - davet eden kimi davet ettigini gormek ister. */
const idB = signedInitData(2003);
DB9.prepare('INSERT INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)')
  .bind('2003', '1001', Date.now()).run();
await api(env9, 'sync', { initData: idB, points: 0, state: {} });
p1001 = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first().points;

const idC = signedInitData(2004);
DB9.prepare('INSERT INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)')
  .bind('2004', '2004', Date.now()).run();
r = await api(env9, 'sync', { initData: idC, points: 0, state: {} });
check('referral: kendi kendini davet etmek odul kazandirmiyor', r.points === 0, `-> ${r.points}`);

r = await api(env9, 'referral', { initData: idRef });
check('referral: /api/referral arkadas sayisi dogru (2, kendi-davet haric)', r.sayi === 2, `-> ${r.sayi}`);
check('referral: /api/referral toplam kazanc kayit bonusu + komisyonu kapsiyor',
      r.toplamKazanc === p1001, `-> ${r.toplamKazanc} vs ${p1001}`);
const kazandirdilar = r.arkadaslar.map((a) => a.kazandirdi).sort((a, b) => a - b);
check('referral: arkadas listesi arkadas basina komisyonu gosteriyor',
      JSON.stringify(kazandirdilar) === JSON.stringify([0, 400 * ORAN1]), `-> ${JSON.stringify(kazandirdilar)}`);
check(`referral: dolayli kazanc ayrica raporlaniyor (${1000 * ORAN2})`,
      r.dolayliKazanc === 1000 * ORAN2, `-> ${r.dolayliKazanc}`);

const DB11 = makeDb(); const env11 = { DB: DB11, BOT_TOKEN, BAKIM: '' }; const idHaric = signedInitData(8100679296);
const idNormal = signedInitData(5555);
await api(env11, 'sync', { initData: idHaric, points: 0, state: {} });
await api(env11, 'sync', { initData: idNormal, points: 0, state: {} });
await kazandir(env11, idNormal, 500, 'lb-1');

r = await api(env11, 'leaderboard', { initData: idNormal });
check('haric tutulan hesap listede gorunmuyor', !r.liste.some((x) => x.ben === true && x.kazanilan === 0) && r.toplam === 1,
      `-> toplam=${r.toplam}`);

r = await api(env11, 'leaderboard', { initData: idHaric });
check('haric tutulan hesap kendi ekraninda sabit #99 goruyor', r.kendi?.sira === 99 && r.haric === true,
      `-> ${JSON.stringify(r.kendi)}`);
check('haric tutulan hesap listenin disinda tutuluyor (kendisi listede yok)', !r.liste.some((x) => x.ben),
      `-> ${JSON.stringify(r.liste)}`);

// --- 2048 "replay" dogrulamasi: sunucu tohumu kendisi veriyor, istemcinin
// hamlelerini kendi mantigiyla yeniden oynatip skoru KENDISI hesapliyor. ---
const logic2048 = await import(new URL('../games/2048/logic.js', BURASI).href);

function oyna2048(seed, adim) {
  const rng = logic2048.mulberry32(seed);
  let { board } = logic2048.createBoard(rng);
  const moves = [];
  let score = 0;
  const yonler = ['right', 'down', 'left', 'up'];
  for (let i = 0; i < adim; i++) {
    const yon = yonler[i % 4];
    const sonuc = logic2048.applyMove(board, yon, rng);
    if (!sonuc.moved) continue;
    board = sonuc.board;
    score += sonuc.gained;
    moves.push(logic2048.DIR_TO_CODE[yon]);
  }
  return { moves, score };
}

const DB12 = makeDb(); const env12 = { DB: DB12, BOT_TOKEN, BAKIM: '' }; const id12 = signedInitData(7777);
await api(env12, 'sync', { initData: id12, points: 0, state: {} });

let baslat = await api(env12, 'game/start', { initData: id12, game: '2048' });
check('2048: /api/game/start seed ve runId donuyor', typeof baslat.seed === 'number' && typeof baslat.runId === 'string',
      `-> ${JSON.stringify(baslat)}`);

const oyun1 = oyna2048(baslat.seed, 40);
let bitir = await api(env12, 'game/finish', { initData: id12, game: '2048', runId: baslat.runId, moves: oyun1.moves });
check('2048: replay istemciyle AYNI gercek skoru hesapliyor', bitir.ok === true && bitir.score === oyun1.score,
      `-> ${JSON.stringify(bitir)} beklenen=${oyun1.score}`);
check('2048: ilk oyun rekor olarak kaydediliyor', bitir.best === oyun1.score && bitir.isRecord === true,
      `-> ${JSON.stringify(bitir)}`);
const beklenenKazanc = Math.floor(oyun1.score / 23);
check('2048: kazanc dogru boluniyor (POINTS_DIVISOR=23)', bitir.earned === beklenenKazanc,
      `-> ${bitir.earned} vs ${beklenenKazanc}`);

let sahteIddia = await api(env12, 'game/finish', {
  initData: id12, game: '2048', runId: baslat.runId, moves: oyun1.moves, claimedScore: 999999999,
});
check('2048: istemcinin sismis skor iddiasi yok sayiliyor (gercek skor donuyor)', sahteIddia.score === oyun1.score,
      `-> ${JSON.stringify(sahteIddia)}`);
check('2048: ayni runId tekrar gonderilince ikinci kez kredi verilmiyor (idempotent)', sahteIddia.earned === 0,
      `-> ${sahteIddia.earned}`);

const baslat2 = await api(env12, 'game/start', { initData: id12, game: '2048' });
let uyusmaz = await api(env12, 'game/finish', { initData: id12, game: '2048', runId: baslat.runId, moves: oyun1.moves });
check('2048: uzerine yazilmis (eski) runId ile finish reddediliyor', uyusmaz.ok === false && uyusmaz.reason === 'kosu-uyusmuyor',
      `-> ${JSON.stringify(uyusmaz)}`);

let gecersiz = await api(env12, 'game/finish', { initData: id12, game: '2048', runId: baslat2.runId, moves: ['U', 'X', 'D'] });
check('2048: gecersiz hamle kodu iceren liste reddediliyor', gecersiz.ok === false && gecersiz.reason === 'gecersiz-hamle-listesi',
      `-> ${JSON.stringify(gecersiz)}`);

const cokUzunListe = Array.from({ length: 20001 }, () => 'U');
let asiri = await api(env12, 'game/finish', { initData: id12, game: '2048', runId: baslat2.runId, moves: cokUzunListe });
check('2048: asiri uzun hamle listesi reddediliyor', asiri.ok === false && asiri.reason === 'gecersiz-hamle-listesi',
      `-> ${JSON.stringify(asiri)}`);

const DB13 = makeDb(); const env13 = { DB: DB13, BOT_TOKEN, BAKIM: '' }; const id13 = signedInitData(9999);
await api(env13, 'sync', { initData: id13, points: 0, state: {} });
let kosuYok = await api(env13, 'game/finish', { initData: id13, game: '2048', runId: 'uydurma-run-id', moves: ['U'] });
check('2048: hic /api/game/start cagrilmadan finish reddediliyor', kosuYok.ok === false && kosuYok.reason === 'aktif-kosu-yok',
      `-> ${JSON.stringify(kosuYok)}`);

// --- Flow Connect "cozum dogrulama": sunucu tohumu ve seviyeyi kendisi
// veriyor (seviye = best_flow+1, istemci atlayamiyor), istemcinin gonderdigi
// NIHAI yollari (paths) generatePuzzle(level,seed) ile bagimsiz uretilen
// bulmacaya karsi validateSolution() ile dogruluyor. ---
const logicFlow = await import(new URL('../games/flow/logic.js', BURASI).href);

// generatePuzzle() ile AYNI sirada AYNI saf fonksiyonlari cagirarak o
// bulmacanin gercek (dogru) cozumunu (segmentleri) yeniden kurar.
function cozFlow(level, seed) {
  const rng = logicFlow.mulberry32(seed);
  const size = logicFlow.sizeFor(level);
  const colorCount = logicFlow.colorCountFor(level, size);
  const route = logicFlow.randomHamiltonianPath(size, rng);
  const paths = logicFlow.splitIntoSegments(route, colorCount, rng);
  return { size, paths };
}

const DB14 = makeDb(); const env14 = { DB: DB14, BOT_TOKEN, BAKIM: '' }; const id14 = signedInitData(5555);
await api(env14, 'sync', { initData: id14, points: 0, state: {} });

let flowBaslat = await api(env14, 'game/start', { initData: id14, game: 'flow' });
check('flow: /api/game/start seed, runId ve seviye 1 donuyor',
      typeof flowBaslat.seed === 'number' && typeof flowBaslat.runId === 'string' && flowBaslat.level === 1,
      `-> ${JSON.stringify(flowBaslat)}`);

const cozum1 = cozFlow(1, flowBaslat.seed);
let flowBitir = await api(env14, 'game/finish', { initData: id14, game: 'flow', runId: flowBaslat.runId, paths: cozum1.paths });
check('flow: gercek cozum kabul ediliyor, skor = seviye', flowBitir.ok === true && flowBitir.score === 1,
      `-> ${JSON.stringify(flowBitir)}`);
check('flow: ilk seviye rekor olarak kaydediliyor', flowBitir.best === 1 && flowBitir.isRecord === true,
      `-> ${JSON.stringify(flowBitir)}`);
check('flow: sabit POINTS_PER_LEVEL (48) kazandiriyor', flowBitir.earned === 48,
      `-> ${flowBitir.earned}`);

let flowTekrar = await api(env14, 'game/finish', { initData: id14, game: 'flow', runId: flowBaslat.runId, paths: cozum1.paths });
check('flow: ayni runId tekrar gonderilince ikinci kez kredi verilmiyor (idempotent)', flowTekrar.earned === 0,
      `-> ${flowTekrar.earned}`);

let flowBaslat2 = await api(env14, 'game/start', { initData: id14, game: 'flow' });
check('flow: bir sonraki /api/game/start otomatik olarak 2. seviyeyi veriyor', flowBaslat2.level === 2,
      `-> ${JSON.stringify(flowBaslat2)}`);

let flowSahteAtlama = await api(env14, 'game/finish', {
  initData: id14, game: 'flow', runId: flowBaslat2.runId, paths: cozFlow(1, flowBaslat.seed).paths,
});
check('flow: 1. seviyenin cozumu 2. seviyenin bulmacasina karsi reddediliyor', flowSahteAtlama.ok === false,
      `-> ${JSON.stringify(flowSahteAtlama)}`);

const bozukCozum = cozFlow(2, flowBaslat2.seed).paths.map((p, i) => (i === 0 ? p.slice(0, -1) : p));
let flowBozuk = await api(env14, 'game/finish', { initData: id14, game: 'flow', runId: flowBaslat2.runId, paths: bozukCozum });
check('flow: eksik/hatali cozum reddediliyor', flowBozuk.ok === false && flowBozuk.reason === 'cozum-dogrulanamadi',
      `-> ${JSON.stringify(flowBozuk)}`);

let flowYanlisSekil = await api(env14, 'game/finish', {
  initData: id14, game: 'flow', runId: flowBaslat2.runId, paths: [[0, 1], [2, 3]],
});
check('flow: yol sayisi renk sayisiyla uyusmuyorsa reddediliyor', flowYanlisSekil.ok === false && flowYanlisSekil.reason === 'gecersiz-cozum-sekli',
      `-> ${JSON.stringify(flowYanlisSekil)}`);

const flowBaslat3 = await api(env14, 'game/start', { initData: id14, game: 'flow' });
let flowEskiRunId = await api(env14, 'game/finish', { initData: id14, game: 'flow', runId: flowBaslat2.runId, paths: cozFlow(2, flowBaslat2.seed).paths });
check('flow: uzerine yazilmis (eski) runId ile finish reddediliyor', flowEskiRunId.ok === false && flowEskiRunId.reason === 'kosu-uyusmuyor',
      `-> ${JSON.stringify(flowEskiRunId)}`);

const cozum3 = cozFlow(2, flowBaslat3.seed);
let flowBitir3 = await api(env14, 'game/finish', { initData: id14, game: 'flow', runId: flowBaslat3.runId, paths: cozum3.paths });
check('flow: 2. seviye dogru cozulunce best_flow 2 oluyor', flowBitir3.ok === true && flowBitir3.best === 2 && flowBitir3.isRecord === true,
      `-> ${JSON.stringify(flowBitir3)}`);

// --- Bakim kilidi ---
// Diger testler BAKIM:'' ile calisiyor (guvenlik mantigini olcuyorlar).
// Burada kilidin kendisini olcuyoruz: bakimdaki oyun sahibe acik, herkese kapali.
const DB15 = makeDb();
const envBakim = { DB: DB15, BOT_TOKEN, BAKIM: 'dragon' };
const idSahip = signedInitData(8100679296);
const idBaskasi = signedInitData(515151);

const bakimSync = await api(envBakim, 'sync', { initData: idBaskasi });
check('bakim: sync bakimdaki oyunu bildiriyor',
      Array.isArray(bakimSync.bakim) && bakimSync.bakim.includes('dragon'),
      `-> ${JSON.stringify(bakimSync.bakim)}`);

const sahipSync = await api(envBakim, 'sync', { initData: idSahip });
check('bakim: sahibe bakim listesi bos geliyor',
      Array.isArray(sahipSync.bakim) && sahipSync.bakim.length === 0,
      `-> ${JSON.stringify(sahipSync.bakim)}`);

const yabanciYaz = await api(envBakim, 'state', {
  initData: idBaskasi, game: 'dragon', expectedVersion: 0, state: { v: 2, dragons: [] },
});
check('bakim: baskasi ejderha durumunu yazamiyor',
      yabanciYaz.error === 'bakimda', `-> ${JSON.stringify(yabanciYaz)}`);

const yabanciSkor = await api(envBakim, 'best', { initData: idBaskasi, game: 'dragon', score: 500 });
check('bakim: baskasi ejderha skoru gonderemiyor',
      yabanciSkor.error === 'bakimda', `-> ${JSON.stringify(yabanciSkor)}`);

const sahipYaz = await api(envBakim, 'state', {
  initData: idSahip, game: 'dragon', expectedVersion: 0, state: { v: 2, dragons: [] },
});
check('bakim: sahip ejderha durumunu yazabiliyor',
      sahipYaz.error === undefined && sahipYaz.version === 1, `-> ${JSON.stringify(sahipYaz)}`);

const baskaOyun = await api(envBakim, 'best', { initData: idBaskasi, game: 'snake', score: 10 });
check('bakim: bakimda olmayan oyun etkilenmiyor',
      baskaOyun.error === undefined && baskaOyun.best === 10, `-> ${JSON.stringify(baskaOyun)}`);

/* ---------------- GUNLUK GOREVLER ---------------- */

const GOREV_ODUL = Number(WORKER_KAYNAK.match(/const GOREV_ODUL = (\d+)/)[1]);

const DBG = makeDb(); const envG = { DB: DBG, BOT_TOKEN, BAKIM: '' };
const idG = signedInitData(9100);
await api(envG, 'sync', { initData: idG, points: 0, state: {} });

let g = await api(envG, 'gorev', { initData: idG });
check('gorev: gunde uc gorev geliyor', Array.isArray(g.gorevler) && g.gorevler.length === 3,
      `-> ${JSON.stringify(g.gorevler)}`);
check('gorev: ucu de sifirdan basliyor', g.gorevler.every((x) => x.ilerleme === 0 && !x.bitti),
      `-> ${JSON.stringify(g.gorevler)}`);
check('gorev: baslangicta odul alinabilir degil', g.hepsiBitti === false && g.alindi === false,
      `-> ${JSON.stringify({ h: g.hepsiBitti, a: g.alindi })}`);

/* Gunun gorevleri havuzlardan birer tane olmali - yoksa yalnizca hub
   oynayan ya da yalnizca ejderha oynayan bir oyuncu tikanirdi. */
const ARCADE = new Set(['skor', 'oyun', 'tur']);
const EJDER = new Set(['merge', 'besle', 'yumurta']);
const GENEL = new Set(['mh', 'cark', 'seri']);
const idler = g.gorevler.map((x) => x.id);
check('gorev: her havuzdan bir tane var',
      idler.filter((i) => ARCADE.has(i)).length === 1 &&
      idler.filter((i) => EJDER.has(i)).length === 1 &&
      idler.filter((i) => GENEL.has(i)).length === 1, `-> ${JSON.stringify(idler)}`);

/* Istemci 'gorev' satirini /api/state ile yazamamali - yazabilseydi
   butun gorevleri tamamlanmis isaretleyip sandigi alabilirdi. */
const sahteYazma = await api(envG, 'state', {
  initData: idG, game: 'gorev', expectedVersion: 0, state: { gun: 0, ilerleme: {} },
});
check('gorev: istemci ilerleme satirini /api/state ile yazamiyor',
      sahteYazma.error !== undefined, `-> ${JSON.stringify(sahteYazma)}`);

check('gorev: bilinmeyen olay reddediliyor',
      (await api(envG, 'gorev/olay', { initData: idG, olay: 'uydurma', miktar: 99 })).ok === false);

/* Tamamlanmamisken odul verilmemeli. */
let al = await api(envG, 'gorev/al', { initData: idG });
check('gorev: tamamlanmadan odul alinamiyor', al.ok === false && al.reason === 'tamamlanmadi',
      `-> ${JSON.stringify(al)}`);

/* Gunun hangi gorevleri geldiyse onlari tamamla. */
async function gorevleriBitir(env, initData, liste) {
  for (const gr of liste) {
    if (gr.id === 'skor') {
      await api(env, 'best', { initData, game: 'snake', score: gr.hedef });
    } else if (gr.id === 'oyun') {
      for (const oyun of ['snake', 'coindrop', 'match3', 'tripletile'].slice(0, gr.hedef)) {
        await api(env, 'best', { initData, game: oyun, score: 10 });
      }
    } else if (gr.id === 'tur') {
      for (let i = 0; i < gr.hedef; i++) {
        await api(env, 'best', { initData, game: 'snake', score: 10 + i });
      }
    } else if (gr.id === 'mh') {
      await kazandir(env, initData, gr.hedef, `gv-${Math.random()}`);
    } else if (gr.id === 'cark') {
      await api(env, 'spin', { initData });
    } else if (gr.id === 'seri') {
      await api(env, 'streak/claim', { initData });
    } else {
      await api(env, 'gorev/olay', { initData, olay: gr.id, miktar: gr.hedef });
    }
  }
}

await gorevleriBitir(envG, idG, g.gorevler);
g = await api(envG, 'gorev', { initData: idG });
check('gorev: ucu de tamamlandi', g.hepsiBitti === true, `-> ${JSON.stringify(g.gorevler)}`);
check('gorev: ilerleme hedefin ustune cikmiyor',
      g.gorevler.every((x) => x.ilerleme === x.hedef), `-> ${JSON.stringify(g.gorevler)}`);

const onceG = DBG.prepare('SELECT points FROM players WHERE id = ?').bind('9100').first().points;
al = await api(envG, 'gorev/al', { initData: idG });
const sonraG = DBG.prepare('SELECT points FROM players WHERE id = ?').bind('9100').first().points;
check(`gorev: sandik ${GOREV_ODUL} $MH veriyor`, al.ok === true && sonraG - onceG === GOREV_ODUL,
      `-> ${sonraG - onceG}`);
check('gorev: sandik enerji harcamiyor', al.ok === true, `-> ${JSON.stringify(al.reason || '')}`);

const al2 = await api(envG, 'gorev/al', { initData: idG });
const sonraG2 = DBG.prepare('SELECT points FROM players WHERE id = ?').bind('9100').first().points;
check('gorev: sandik ikinci kez alinamiyor', al2.ok === false && al2.reason === 'alindi',
      `-> ${JSON.stringify(al2)}`);
check('gorev: ikinci deneme puan eklemiyor', sonraG2 === sonraG, `-> ${sonraG2} vs ${sonraG}`);

/* Gun degisince sayac sifirlanmali. Satirdaki gun numarasini elle
   geriye alip taklit ediyoruz - sunucu gun numarasini kendi hesapliyor,
   eskimis satiri gormezden gelmeli. */
const ham = JSON.parse(DBG.prepare("SELECT value FROM player_data WHERE player_id = ? AND key = 'gorev'")
  .bind('9100').first().value);
DBG.prepare("UPDATE player_data SET value = ? WHERE player_id = ? AND key = 'gorev'")
  .bind(JSON.stringify({ ...ham, gun: ham.gun - 1 }), '9100').run();
const yeniGun = await api(envG, 'gorev', { initData: idG });
check('gorev: gun degisince ilerleme sifirlaniyor',
      yeniGun.gorevler.every((x) => x.ilerleme === 0) && yeniGun.alindi === false,
      `-> ${JSON.stringify(yeniGun.gorevler)}`);

/* Sync cevabi gorev durumunu da tasimali - hub ayri bir istek atmasin. */
const syncG = await api(envG, 'sync', { initData: idG, points: 0, state: {} });
check('gorev: sync cevabinda gorev durumu var',
      syncG.gorev && Array.isArray(syncG.gorev.gorevler) && syncG.gorev.gorevler.length === 3,
      `-> ${JSON.stringify(syncG.gorev)}`);
check('gorev: ham ilerleme satiri state icinde sizmiyor',
      syncG.state.gorev === undefined, `-> ${JSON.stringify(Object.keys(syncG.state))}`);

/* ---------------- PROMOSYON KODLARI ---------------- */

const { PROMO_KODLARI, promoSure, promoNormalle } = worker;
const SAHIP = '8100679296';

/* Sure mantigi dogrudan sinaniyor - kod listesindeki gercek tarihlere
   bagli bir test bir gun kendiliginden kirilirdi. */
const simdi = Date.now();
check('promo: suresiz kod her zaman gecerli',
      promoSure({ gun: 0 }, simdi).bitti === false && promoSure({ gun: 0 }, simdi).basladi === true);
check('promo: suresi dolmus kod bitti isaretleniyor',
      promoSure({ baslar: simdi - 8 * 86400000, gun: 7 }, simdi).bitti === true);
check('promo: 7 gunluk kodun ilk gununde ~7 gun kaliyor',
      Math.round(promoSure({ baslar: simdi, gun: 7 }, simdi).kalanMs / 86400000) === 7,
      `-> ${promoSure({ baslar: simdi, gun: 7 }, simdi).kalanMs}`);
check('promo: baslangici gelecekte olan kod henuz baslamamis',
      promoSure({ baslar: simdi + 86400000, gun: 7 }, simdi).basladi === false);

check('promo: bosluk ve kucuk harf normalize ediliyor',
      promoNormalle('  di yumurta 8 ') === 'DI-YUMURTA-8', `-> ${promoNormalle('  di yumurta 8 ')}`);

/* Sahip kodlarinin tamami gercekten sahibe kilitli ve tekrarli olmali -
   biri yanlislikla halka acik birakilirsa herkes $MH basardi. */
const sahipKodlari = Object.entries(PROMO_KODLARI).filter(([, k]) => k.sahip);
check('promo: sahip kodlarinin hepsi tekrarli',
      sahipKodlari.every(([, k]) => k.tekrarli === true), `-> ${sahipKodlari.length} kod`);
check('promo: $MH basan her kod ya sureli ya sahibe kilitli',
      Object.entries(PROMO_KODLARI).every(([, k]) => !k.odul?.coin || k.sahip || k.gun > 0));

const DBP = makeDb(); const envP = { DB: DBP, BOT_TOKEN, BAKIM: '' };
const idYabanci = signedInitData(9500);
const idSahipP = signedInitData(Number(SAHIP));
await api(envP, 'sync', { initData: idYabanci, points: 0, state: {} });
await api(envP, 'sync', { initData: idSahipP, points: 0, state: {} });

check('promo: bilinmeyen kod reddediliyor',
      (await api(envP, 'promo', { initData: idYabanci, kod: 'UYDURMA-KOD' })).reason === 'gecersiz');

/* Sahip kodu baskasinda calismamali - ve "bu kod sahibe ait" diye
   bilgi de sizdirmamali, ayni 'gecersiz' cevabi donuyor. */
const yabanciDeneme = await api(envP, 'promo', { initData: idYabanci, kod: 'MH-COIN-100K' });
check('promo: sahip kodu baskasinda calismiyor',
      yabanciDeneme.ok === false && yabanciDeneme.reason === 'gecersiz', `-> ${JSON.stringify(yabanciDeneme)}`);
const yabanciPuan = DBP.prepare('SELECT points FROM players WHERE id = ?').bind('9500').first().points;
check('promo: basarisiz denemede puan degismiyor', yabanciPuan === 0, `-> ${yabanciPuan}`);

/* Sahip kodu sahibinde calisiyor VE tekrar tekrar calisiyor. */
const p1 = await api(envP, 'promo', { initData: idSahipP, kod: 'MH-COIN-10K' });
const p2 = await api(envP, 'promo', { initData: idSahipP, kod: 'mh coin 10k' });   /* normalize */
const sahipPuan = DBP.prepare('SELECT points FROM players WHERE id = ?').bind(SAHIP).first().points;
check('promo: sahip kodu calisiyor', p1.ok === true, `-> ${JSON.stringify(p1)}`);
check('promo: sahip kodu tekrar kullanilabiliyor (2 x 10000)',
      p2.ok === true && sahipPuan === 20000, `-> ${sahipPuan}`);

/* Ejderha varliklari kutuya giriyor, kutu bir kez okununca bosaliyor. */
await api(envP, 'promo', { initData: idSahipP, kod: 'DI-YUMURTA-8' });
const kutu1 = await api(envP, 'promo/kutu', { initData: idSahipP });
check('promo: ejderha odulu kutuya dustu',
      kutu1.parcalar.length === 1 && kutu1.parcalar[0].nesneler[0].lv === 8,
      `-> ${JSON.stringify(kutu1)}`);
const kutu2 = await api(envP, 'promo/kutu', { initData: idSahipP });
check('promo: kutu okununca bosaliyor', kutu2.parcalar.length === 0, `-> ${JSON.stringify(kutu2)}`);

/* Istemci kutuyu kendi yazamamali - yazabilseydi istedigi varligi
   kendine gonderirdi. */
const kutuYazma = await api(envP, 'state', {
  initData: idYabanci, game: 'promo_kutu', expectedVersion: 0, state: [{ yildiz: 999999 }],
});
check('promo: istemci kutuyu /api/state ile yazamiyor',
      kutuYazma.error !== undefined, `-> ${JSON.stringify(kutuYazma)}`);

/* Halka acik kod: oyuncu basina BIR KEZ. Kodun suresi dolmussa test
   bunu da dogru kabul ediyor (listeye bagli kalmamak icin). */
const acikAd = Object.keys(PROMO_KODLARI).find((k) => !PROMO_KODLARI[k].sahip);
if (acikAd) {
  const gecerli = !promoSure(PROMO_KODLARI[acikAd], Date.now()).bitti;
  const a1 = await api(envP, 'promo', { initData: idYabanci, kod: acikAd });
  const a2 = await api(envP, 'promo', { initData: idYabanci, kod: acikAd });
  if (gecerli) {
    check(`promo: halka acik kod (${acikAd}) bir kez calisiyor`, a1.ok === true, `-> ${JSON.stringify(a1)}`);
    check('promo: ayni kod ikinci kez kullanilamiyor',
          a2.ok === false && a2.reason === 'kullanilmis', `-> ${JSON.stringify(a2)}`);
    const tekPuan = DBP.prepare('SELECT points FROM players WHERE id = ?').bind('9500').first().points;
    check('promo: ikinci deneme puan eklemiyor',
          tekPuan === (PROMO_KODLARI[acikAd].odul.coin || 0), `-> ${tekPuan}`);
  } else {
    check(`promo: suresi dolmus kod (${acikAd}) reddediliyor`,
          a1.ok === false && a1.reason === 'suresi-doldu', `-> ${JSON.stringify(a1)}`);
  }
}

/* Enerji odulu sert tavani asmamali. */
await api(envP, 'promo', { initData: idSahipP, kod: 'MH-ENERJI' });
await api(envP, 'promo', { initData: idSahipP, kod: 'MH-ENERJI' });
const enerjiSon = DBP.prepare('SELECT energy FROM players WHERE id = ?').bind(SAHIP).first().energy;
check(`promo: enerji sert tavani (${MAX_ENERGY + 3}) asilmiyor`,
      enerjiSon <= MAX_ENERGY + 3, `-> ${enerjiSon}`);

/* ---------------- ODEMEYI SUNUCU HESAPLIYOR ---------------- */

const DBO = makeDb(); const envO = { DB: DBO, BOT_TOKEN, BAKIM: '' };
const idO = signedInitData(9700);
await api(envO, 'sync', { initData: idO, points: 0, state: {} });

/* Her oyunun kendi tavani var; tek tip 10.000.000 degil. Uydurma bir
   skor gonderen oyunun tavanindan fazlasini alamiyor. */
const tavanlar = {};
for (const m of WORKER_KAYNAK.matchAll(/^\s+'?([a-z0-9]+)'?:\s+\{ (?:bolucu: (\d+)|formul: '[^']+'),\s+tavan: (\d+) \}/gm)) {
  tavanlar[m[1]] = { bolucu: m[2] ? Number(m[2]) : null, tavan: Number(m[3]) };
}
check('odeme: tablo kaynaktan okunabildi', Object.keys(tavanlar).length >= 8,
      `-> ${Object.keys(tavanlar).join(',')}`);

const tt = await api(envO, 'best', { initData: idO, game: 'tripletile', opId: 'o-1', score: 999999 });
check(`odeme: tripletile skoru tavana kirpildi (${tavanlar.tripletile.tavan})`,
      tt.best === tavanlar.tripletile.tavan, `-> ${tt.best}`);
check('odeme: tripletile kazanci tavan/bolucu',
      tt.earned === Math.floor(tavanlar.tripletile.tavan / tavanlar.tripletile.bolucu), `-> ${tt.earned}`);

/* Ayni skor iki oyunda ayni $MH'i vermemeli - bolucu sunucuda ve oyuna
   gore. (Istemciye inansaydik bu fark hic olmazdi.) */
const sn = await api(envO, 'best', { initData: idO, game: 'snake', opId: 'o-2', score: 1000 });
const bb = await api(envO, 'best', { initData: idO, game: 'blockblast', opId: 'o-3', score: 1000 });
check('odeme: ayni skor oyuna gore farkli $MH veriyor',
      sn.earned === Math.floor(1000 / tavanlar.snake.bolucu)
      && bb.earned === Math.floor(1000 / tavanlar.blockblast.bolucu),
      `-> snake ${sn.earned}, blockblast ${bb.earned}`);

/* Ejderha Adasi $MH KAZANDIRMIYOR - yalnizca harciyor. Skor yolundan
   para alinamamali. */
const dr = await api(envO, 'best', { initData: idO, game: 'dragon', opId: 'o-4', score: 5000000 });
check('odeme: ejderha skoru $MH vermiyor', dr.earned === 0, `-> ${dr.earned}`);

/* watersort seviyeye gore formulle odeniyor; seviye arttikca odeme artar. */
const w1 = await api(envO, 'best', { initData: idO, game: 'watersort', opId: 'o-5', score: 1 });
const w2 = await api(envO, 'best', { initData: idO, game: 'watersort', opId: 'o-6', score: 40 });
check('odeme: watersort seviyesi arttikca odeme artiyor',
      w1.earned > 0 && w2.earned > w1.earned, `-> ${w1.earned} vs ${w2.earned}`);

/* Ayni opId ile tekrar gonderilen skor ikinci kez odeme yapmamali -
   ag tekrarinda ya da kuyruk bosaltilirken bu olur. */
const oncekiToplam = DBO.prepare('SELECT points FROM players WHERE id = ?').bind('9700').first().points;
await api(envO, 'best', { initData: idO, game: 'snake', opId: 'o-2', score: 1000 });
const sonrakiToplam = DBO.prepare('SELECT points FROM players WHERE id = ?').bind('9700').first().points;
check('odeme: ayni opId ikinci kez odeme yapmiyor',
      sonrakiToplam === oncekiToplam, `-> ${sonrakiToplam} vs ${oncekiToplam}`);

/* Bilinmeyen oyun hic odeme yapmamali ve kaydi da reddetmeli. */
const bilinmeyen = await api(envO, 'best', { initData: idO, game: 'uydurma', opId: 'o-7', score: 99999 });
check('odeme: bilinmeyen oyun reddediliyor', bilinmeyen.error === 'bilinmeyen oyun',
      `-> ${JSON.stringify(bilinmeyen)}`);

console.log(`\n${passed} basarili, ${failed} basarisiz`);
process.exit(failed > 0 ? 1 : 0);
