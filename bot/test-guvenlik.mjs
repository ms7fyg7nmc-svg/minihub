import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

const BURASI = new URL('.', import.meta.url);
const SCHEMA = readFileSync(new URL('schema.sql', BURASI), 'utf8');
const worker = await import(new URL('worker.js', BURASI).href);

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
const env = { DB, BOT_TOKEN };
const initData = signedInitData(111);

let r = await api(env, 'sync', { initData, points: 0, state: {} });
check('sync: energy 24', r.energy === 24);
check('sync: streak var', !!r.streak);
check('sync: spin var', !!r.spin);
check('odul merdiveni sunucudan geliyor (5x)',
      JSON.stringify(r.streak.rewards) === JSON.stringify([100,150,200,300,400,500,1000]),
      `-> ${JSON.stringify(r.streak.rewards)}`);

r = await api(env, 'points/earn', { initData, opId: 'atk-1', amount: 999999999 });
check('dev miktar istek basi tavana kirpildi (10.000)', r.credited === 10000, `-> ${r.credited}`);
check('dev miktar sonrasi bakiye 10.000', r.total === 10000, `-> ${r.total}`);

for (let i = 2; i <= 8; i++) {
  r = await api(env, 'points/earn', { initData, opId: `atk-${i}`, amount: 999999999 });
}
check('gunluk tavan tuttu: bakiye 30.000de kaldi', r.total === 30000, `-> ${r.total}`);
check('tavan dolunca sonraki kazanc 0', r.credited === 0, `-> ${r.credited}`);

const DB2 = makeDb(); const env2 = { DB: DB2, BOT_TOKEN }; const id2 = signedInitData(222);
await api(env2, 'sync', { initData: id2, points: 0, state: {} });
async function hamApi(env, path, hamGovde) {
  const res = await worker.default.fetch(new Request(`https://x/api/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hamGovde,
  }), env);
  return res.json();
}
r = await hamApi(env2, 'points/earn', `{"initData":${JSON.stringify(id2)},"opId":"inf","amount":1e400}`);
check('ham JSON 1e400 (=Infinity) 0 sayildi, sunucu cokmedi', r.ok === true && r.credited === 0, `-> ${JSON.stringify(r)}`);
r = await hamApi(env2, 'points/earn', `{"initData":${JSON.stringify(id2)},"opId":"buyuk","amount":1e308}`);
check('devasa ama sonlu sayi tavana kirpildi', r.credited === 10000, `-> ${r.credited}`);
r = await api(env2, 'points/earn', { initData: id2, opId: 'nan', amount: 'abc' });
check('metin miktar 0 sayildi', r.credited === 0, `-> ${r.credited}`);
r = await api(env2, 'points/earn', { initData: id2, opId: 'neg', amount: -5000 });
check('negatif kazanc 0 sayildi (bakiye dusurulemedi)', r.credited === 0, `-> ${r.credited}`);

const DB3 = makeDb(); const env3 = { DB: DB3, BOT_TOKEN }; const id3 = signedInitData(333);
r = await api(env3, 'sync', { initData: id3, points: 999999999, state: {} });
check('sahte baslangic bakiyesi 5.000e kirpildi', r.points === 5000, `-> ${r.points}`);

const DB3b = makeDb(); const env3b = { DB: DB3b, BOT_TOKEN }; const id3b = signedInitData(334);
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
const sahteRes = await worker.default.fetch(new Request('https://x/api/points/earn', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData: sahte, opId: 'x', amount: 1000 }),
}), env);
check('sahte imza 401 ile reddedildi', sahteRes.status === 401, `-> ${sahteRes.status}`);

const DB5 = makeDb(); const env5 = { DB: DB5, BOT_TOKEN }; const id5 = signedInitData(666);
await api(env5, 'sync', { initData: id5, points: 0, state: {} });
let toplamKazanc = 0;
for (let i = 0; i < 24; i++) {
  const rr = await api(env5, 'points/earn', { initData: id5, opId: `n-${i}`, amount: 100 });
  toplamKazanc += rr.credited;
}
check('meshru oyun: 24 tur tam odul aldi (2400)', toplamKazanc === 2400, `-> ${toplamKazanc}`);
r = await api(env5, 'points/earn', { initData: id5, opId: 'n-bos', amount: 100 });
check('enerji bitince odul %25e dustu (25)', r.credited === 25, `-> ${r.credited}`);

DB5.prepare('UPDATE players SET energy = 0, energy_at = ? WHERE id = ?')
  .bind(Date.now() - 2 * 3600 * 1000, '666').run();
let re1 = await api(env5, 'sync', { initData: id5, points: 0, state: {} });
check('2 saat sonra 4 enerji yenilendi', re1.energy === 4, `-> ${re1.energy}`);
DB5.prepare('UPDATE players SET energy = 0, energy_at = ? WHERE id = ?')
  .bind(Date.now() - 400 * 3600 * 1000, '666').run();
re1 = await api(env5, 'sync', { initData: id5, points: 0, state: {} });
check('cok bekleyince tavanda duruyor (24)', re1.energy === 24, `-> ${re1.energy}`);
const oncekiBakiye = r.total;
r = await api(env5, 'points/earn', { initData: id5, opId: 'n-bos', amount: 100 });
check('ayni opId tekrar uygulanmadi', r.total === oncekiBakiye && r.credited === 0, `-> ${JSON.stringify(r)}`);
r = await api(env5, 'streak/claim', { initData: id5 });
check('gunluk seri hala calisiyor (gun 1, 100 jeton)', r.ok && r.streak === 1 && r.reward === 100, `-> ${JSON.stringify(r)}`);
r = await api(env5, 'spin', { initData: id5 });
check('gunluk cark hala calisiyor', r.ok === true, `-> ${JSON.stringify(r)}`);
r = await api(env5, 'points/spend', { initData: id5, opId: 'harca-1', amount: 50 });
check('harcama hala calisiyor', r.ok === true, `-> ${JSON.stringify(r)}`);
r = await api(env5, 'points/spend', { initData: id5, opId: 'harca-2', amount: 99999999 });
check('bakiyeden fazla harcanamiyor', r.ok === false, `-> ${JSON.stringify(r)}`);

const DB6 = makeDb(); const env6 = { DB: DB6, BOT_TOKEN }; const id6 = signedInitData(777);
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

const DB7 = makeDb(); const env7 = { DB: DB7, BOT_TOKEN }; const id7 = signedInitData(888);
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
const gruplar = { color: 'COLORS', skin: 'SKINS', wings: 'WINGS', tail: 'TAILS',
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

const workerBlok = workerKaynak.match(/REFERRAL_LEVEL_MILESTONES = \[([\s\S]*?)\];/)?.[1] || '';
const workerEsikler = [...workerBlok.matchAll(/\[(\d+),\s*(\d+)\]/g)].map((m) => `${m[1]}:${m[2]}`);
const hubBlok = hubKaynak.match(/REFERRAL_TIERS = \[([\s\S]*?)\];/)?.[1] || '';
const hubEsikler = [...hubBlok.matchAll(/\{\s*lv:\s*(\d+),\s*amt:\s*(\d+)\s*\}/g)].map((m) => `${m[1]}:${m[2]}`);
check('referral: afis esikleri sunucuyla ayni',
      workerEsikler.length > 0 && JSON.stringify(workerEsikler) === JSON.stringify(hubEsikler),
      `-> worker=${JSON.stringify(workerEsikler)} hub=${JSON.stringify(hubEsikler)}`);

const DB8 = makeDb(); const env8 = { DB: DB8, BOT_TOKEN }; const id8 = signedInitData(999);
await api(env8, 'sync', { initData: id8, points: 0, state: {} });

r = await api(env8, 'points/earn', { initData: id8, opId: 'restart-earn-1', amount: 120 });
check('restart: skor puana cevrilip krediliyor', r.total === 120, `-> ${r.total}`);
check('restart: puan eklemek kendi enerjisini dusuyor (24 -> 23)', r.energy === 23, `-> ${r.energy}`);

r = await api(env8, 'energy/spend', { initData: id8, opId: 'restart-empty-1' });
check('restart: skor yokken de -1 enerji uygulaniyor', r.ok === true && r.energy === 22, `-> ${JSON.stringify(r)}`);
check('restart: enerji dusrken puan bakiyesi degismiyor', r.total === 120, `-> ${r.total}`);

r = await api(env8, 'energy/spend', { initData: id8, opId: 'restart-empty-1' });
check('restart: ayni opId tekrar enerji dusurmuyor (idempotent)', r.energy === 22, `-> ${r.energy}`);

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
DB10b.prepare('UPDATE players SET energy = 20 WHERE id = ?').bind('4243').run();
r = await api(env10b, 'energy/ad-refill', { initData: id10b, opId: 'ad-cap-test' });
check('enerji dolumu MAX_ENERGY (24) ustune cikmiyor', r.ok === true && r.energy === 24, `-> ${JSON.stringify(r)}`);

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
check('basarili Stars odemesi enerjiyi +6 kredilendiriyor', oyuncu10.energy === 16, `-> ${oyuncu10.energy}`);

await webhook(env10, {
  message: {
    chat: { id: 4242 },
    successful_payment: { invoice_payload: 'energy_refill:4242', telegram_payment_charge_id: 'charge-abc-1' },
  },
});
oyuncu10 = DB10.prepare('SELECT energy FROM players WHERE id = ?').bind('4242').first();
check('ayni telegram_payment_charge_id tekrar gelirse enerji ikinci kez kredilenmiyor', oyuncu10.energy === 16, `-> ${oyuncu10.energy}`);

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

globalThis.fetch = gercekFetch;

check('referral: payload ayristirma calisiyor', worker.parseReferralPayload('/start r1001') === '1001',
      `-> ${worker.parseReferralPayload('/start r1001')}`);
check('referral: bosluksuz /start payload uretmiyor', worker.parseReferralPayload('/start') === null);
check('referral: gecersiz payload yok sayiliyor', worker.parseReferralPayload('/start abc') === null);

const DB9 = makeDb(); const env9 = { DB: DB9, BOT_TOKEN }; const idRef = signedInitData(1001);
await api(env9, 'sync', { initData: idRef, points: 0, state: {} });

const idA = signedInitData(2002);
DB9.prepare('INSERT INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)')
  .bind('2002', '1001', Date.now()).run();
r = await api(env9, 'sync', { initData: idA, points: 0, state: {} });
check('referral: davet edilen arkadas hos geldin bonusu aldi (+500)', r.points === 500, `-> ${r.points}`);

let referrerRow = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first();
check('referral: davet eden kayit bonusu aldi (+500)', referrerRow.points === 500, `-> ${referrerRow.points}`);

const bekleyenA = DB9.prepare('SELECT * FROM pending_referrals WHERE user_id = ?').bind('2002').first();
check('referral: bekleyen davet tuketildi', !bekleyenA);

r = await api(env9, 'state', { initData: idA, game: 'dragon',
  state: { v: 2, dragons: [{ id: 'd1', level: 10, xp: 0, look: {} }], owned: {}, ownedIslands: [] },
  expectedVersion: 0 });
check('referral: arkadasin ilk ejderha durumu taban olarak kabul edildi', r.state?.dragons?.[0]?.level === 10,
      `-> ${JSON.stringify(r).slice(0, 80)}`);

referrerRow = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first();
check('referral: seviye 10 sadece esik-5 odulunu tetikledi (500+750=1250)', referrerRow.points === 1250, `-> ${referrerRow.points}`);

const idB = signedInitData(2003);
DB9.prepare('INSERT INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)')
  .bind('2003', '1001', Date.now()).run();
await api(env9, 'sync', { initData: idB, points: 0, state: {} });
r = await api(env9, 'state', { initData: idB, game: 'dragon',
  state: { v: 2, dragons: [{ id: 'd1', level: 99, xp: 0, look: {} }], owned: {}, ownedIslands: [] },
  expectedVersion: 0 });
check('referral: ikinci arkadasin seviye 99 durumu taban olarak kabul edildi', r.state?.dragons?.[0]?.level === 99);

referrerRow = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first();
const beklenenToplam = 1250 + 500 /* B kayit */ + 750 + 1500 + 3000 + 5000 + 7500 + 10000 /* B tum esikler */;
check('referral: ikinci arkadas tum esikleri tek seferde tetikledi', referrerRow.points === beklenenToplam,
      `-> ${referrerRow.points} beklenen ${beklenenToplam}`);

r = await api(env9, 'state', { initData: idB, game: 'dragon',
  state: { v: 2, dragons: [{ id: 'd1', level: 99, xp: 0, look: {} }], owned: {}, ownedIslands: [] },
  expectedVersion: 1 });
referrerRow = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first();
check('referral: ayni seviyeye tekrar senkron odulu tekrarlamiyor', referrerRow.points === beklenenToplam,
      `-> ${referrerRow.points}`);

const idC = signedInitData(2004);
DB9.prepare('INSERT INTO pending_referrals (user_id, referrer_id, created_at) VALUES (?, ?, ?)')
  .bind('2004', '2004', Date.now()).run();
r = await api(env9, 'sync', { initData: idC, points: 0, state: {} });
check('referral: kendi kendini davet etmek odul kazandirmiyor', r.points === 0, `-> ${r.points}`);
referrerRow = DB9.prepare('SELECT points FROM players WHERE id = ?').bind('1001').first();
check('referral: kendi kendini davet referans toplamini etkilemedi', referrerRow.points === beklenenToplam);

r = await api(env9, 'referral', { initData: idRef });
check('referral: /api/referral arkadas sayisi dogru (2, kendi-davet halic)', r.sayi === 2, `-> ${r.sayi}`);
check('referral: /api/referral toplam kazanc dogru', r.toplamKazanc === beklenenToplam, `-> ${r.toplamKazanc}`);
const seviyeler = r.arkadaslar.map((a) => a.seviye).sort((a, b) => a - b);
check('referral: arkadas listesi seviyeleri dogru', JSON.stringify(seviyeler) === JSON.stringify([10, 99]),
      `-> ${JSON.stringify(seviyeler)}`);

console.log(`\n${passed} basarili, ${failed} basarisiz`);
process.exit(failed > 0 ? 1 : 0);
