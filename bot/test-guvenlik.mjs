/* SUNUCU GUVENLIK TESTLERI

   NASIL CALISTIRILIR (terminal gerektirir - kullanici icin degil, kodu
   degistiren gelistirici/asistan icin):

     node --experimental-sqlite bot/test-guvenlik.mjs

   worker.js'te kazanc/harcama/limit mantigina dokunan her degisiklikten
   SONRA calistirilmali: buradaki testler "hile yapilamiyor" garantisini
   kayit altina aliyor, sessizce bozulmasin diye.

   Gercek bot/worker.js'i, gercek SQL calistiran bir D1-benzeri adapterla
   (node:sqlite) test eder. Bu dosya SALDIRGAN gibi davranir: gecerli bir
   initData imzasi uretip (yani "gercek bir oyuncu" olup) sunucuya kotu
   niyetli istekler atar ve sinirlarin tuttugunu dogrular. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

/* Depo tasinsa da calissin diye yollar bu dosyanin konumundan turetiliyor */
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

const DB = makeDb();
const env = { DB, BOT_TOKEN };
const initData = signedInitData(111);

/* ================= 1. TEMEL DAVRANIS BOZULMADI MI ================= */
let r = await api(env, 'sync', { initData, points: 0, state: {} });
check('sync: energy 24', r.energy === 24);
check('sync: streak var', !!r.streak);
check('sync: spin var', !!r.spin);
check('odul merdiveni sunucudan geliyor (5x)',
      JSON.stringify(r.streak.rewards) === JSON.stringify([100,150,200,300,400,500,1000]),
      `-> ${JSON.stringify(r.streak.rewards)}`);

/* ================= 2. SALDIRI: DEV MIKTAR ISTEMEK ================= */
r = await api(env, 'points/earn', { initData, opId: 'atk-1', amount: 999999999 });
check('dev miktar istek basi tavana kirpildi (10.000)', r.credited === 10000, `-> ${r.credited}`);
check('dev miktar sonrasi bakiye 10.000', r.total === 10000, `-> ${r.total}`);

/* ================= 3. SALDIRI: GUNLUK TAVANI ASMAK ================= */
/* Tekrar tekrar 10.000 iste - toplamda 30.000'de durmali */
for (let i = 2; i <= 8; i++) {
  r = await api(env, 'points/earn', { initData, opId: `atk-${i}`, amount: 999999999 });
}
check('gunluk tavan tuttu: bakiye 30.000de kaldi', r.total === 30000, `-> ${r.total}`);
check('tavan dolunca sonraki kazanc 0', r.credited === 0, `-> ${r.credited}`);

/* ================= 4. SALDIRI: BOZUK SAYILAR ================= */
const DB2 = makeDb(); const env2 = { DB: DB2, BOT_TOKEN }; const id2 = signedInitData(222);
await api(env2, 'sync', { initData: id2, points: 0, state: {} });
/* JSON.stringify(Infinity) "null" urettigi icin Infinity'yi normal yoldan
   yollamak mumkun degil. Gercek saldirgan HAM JSON metni yollar: 1e400
   gecerli JSON'dur ve JSON.parse onu Infinity'ye cevirir. Asagisi tam
   olarak bunu yapiyor - guvenliSayi'daki Number.isFinite kontrolunu
   sinayan senaryo bu. */
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

/* ================= 5. SALDIRI: SAHTE BASLANGIC BAKIYESI ================= */
const DB3 = makeDb(); const env3 = { DB: DB3, BOT_TOKEN }; const id3 = signedInitData(333);
r = await api(env3, 'sync', { initData: id3, points: 999999999, state: {} });
check('sahte baslangic bakiyesi 5.000e kirpildi', r.points === 5000, `-> ${r.points}`);

/* ================= 6. SALDIRI: UYDURMA OYUN KIMLIGI ================= */
r = await api(env3, 'best', { initData: id3, game: 'uydurma-oyun', score: 100 });
check('bilinmeyen oyun icin rekor reddedildi', r.error === 'bilinmeyen oyun', `-> ${JSON.stringify(r)}`);
r = await api(env3, 'state', { initData: id3, game: '../../etc', state: { x: 1 }, expectedVersion: 0 });
check('bilinmeyen oyun icin durum reddedildi', r.error === 'bilinmeyen oyun', `-> ${JSON.stringify(r)}`);
const satirSayisi = DB3.prepare('SELECT COUNT(*) AS n FROM player_data WHERE player_id = ?').bind('333').first();
check('reddedilen istekler veritabanina satir yazmadi', satirSayisi.n === 0, `-> ${satirSayisi.n}`);
r = await api(env3, 'best', { initData: id3, game: '2048', score: 5000 });
check('gecerli oyun icin rekor hala calisiyor', r.best === 5000, `-> ${JSON.stringify(r)}`);

/* ================= 7. SALDIRI: DEV DURUM YAZMAK ================= */
const kocaman = { cop: 'x'.repeat(200000) };
r = await api(env3, 'state', { initData: id3, game: 'dragon', state: kocaman, expectedVersion: 0 });
check('32 KB ustu durum yazilmadi', r.state === null, `-> ${JSON.stringify(r).slice(0, 80)}`);
r = await api(env3, 'state', { initData: id3, game: 'dragon', state: { level: 5 }, expectedVersion: 0 });
check('normal boyutlu durum hala yaziliyor', r.state?.level === 5, `-> ${JSON.stringify(r)}`);


/* ================= 9. SALDIRI: SAHTE IMZA ================= */
const sahte = new URLSearchParams({ user: JSON.stringify({ id: 555 }), auth_date: String(Math.floor(Date.now() / 1000)), hash: 'a'.repeat(64) }).toString();
const sahteRes = await worker.default.fetch(new Request('https://x/api/points/earn', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData: sahte, opId: 'x', amount: 1000 }),
}), env);
check('sahte imza 401 ile reddedildi', sahteRes.status === 401, `-> ${sahteRes.status}`);

/* ================= 10. ONCEKI DAVRANIS KORUNDU MU ================= */
const DB5 = makeDb(); const env5 = { DB: DB5, BOT_TOKEN }; const id5 = signedInitData(666);
await api(env5, 'sync', { initData: id5, points: 0, state: {} });
/* enerji dolu: 24 tur tam odul */
let toplamKazanc = 0;
for (let i = 0; i < 24; i++) {
  const rr = await api(env5, 'points/earn', { initData: id5, opId: `n-${i}`, amount: 100 });
  toplamKazanc += rr.credited;
}
check('meshru oyun: 24 tur tam odul aldi (2400)', toplamKazanc === 2400, `-> ${toplamKazanc}`);
r = await api(env5, 'points/earn', { initData: id5, opId: 'n-bos', amount: 100 });
check('enerji bitince odul %25e dustu (25)', r.credited === 25, `-> ${r.credited}`);

/* --- ENERJI ZAMANLA YENILENIYOR MU ---
   Reklam butonu kaldirildi; enerjinin dolmasinin tek yolu bu kaldi.
   Calismazsa oyuncu bir kez tuketince kalici olarak dusuk kazanca duser. */
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

/* ================= 11. SALDIRI: BEDAVA SEVIYE 99 + TUM ESYALAR =================
   Ejderha durumu istemci tarafindan yaziliyor. Dogrulama olmadan
   degistirilmis bir istemci hic harcama yapmadan "seviye 99, butun mythic
   esyalar bende" diyebiliyordu. */
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

/* Gercekten harcayan oyuncu ayni ilerlemeyi yazabilmeli */
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

/* Istemci sunucunun dahili taban anahtarini yazamamali */
r = await api(env6, 'state', { initData: id6, game: 'taban', state: { maliyet: 0 }, expectedVersion: 0 });
check('istemci dahili taban anahtarini yazamiyor', r.error === 'bilinmeyen oyun', `-> ${JSON.stringify(r)}`);

/* ================= 12. FIYAT TABLOLARI AYRISMIS MI =================
   worker.js kendi fiyat kopyasini tutuyor (istemciye guvenemez). Iki taraf
   ayrisirsa dogrulama yanlis calisir - burada yakalaniyor. */
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

/* ================= 13. RESTART: PUANI SIFIRLAMADAN ENERJI DUSMEK =================
   Restart Game bir oyunu yarim birakip skoru silmemeli (settleAbandonedRun
   -> addPoints), hicbir skor yoksa da bedava bir reroll olmamali
   (spendRestartEnergy -> /api/energy/spend). */
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

/* Enerji 0'a inince negatife dusmemeli */
for (let i = 0; i < 30; i++) await api(env8, 'energy/spend', { initData: id8, opId: `restart-drain-${i}` });
r = await api(env8, 'energy/spend', { initData: id8, opId: 'restart-drain-son' });
check('restart: enerji 0da tikaniyor, negatife dusmuyor', r.energy === 0, `-> ${r.energy}`);

console.log(`\n${passed} basarili, ${failed} basarisiz`);
process.exit(failed > 0 ? 1 : 0);
