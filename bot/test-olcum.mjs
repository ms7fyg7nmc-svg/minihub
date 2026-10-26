/* olcum.js'i gercek bir SQLite ile sinar: sahte oyuncular uretip
   bilinen bir geri donus orani kurar, fonksiyon onu buluyor mu bakar. */
import { DatabaseSync } from 'node:sqlite';
import { gunuIsaretle, geriDonus, gunlukAktif, gunAdi } from '/Users/vtredi/minihub/bot/olcum.js';

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE players (id TEXT PRIMARY KEY, created_at INTEGER);
         CREATE TABLE gun_aktif (player_id TEXT, gun TEXT, PRIMARY KEY(player_id,gun));`);

// D1 benzeri sarmalayici
const env = { DB: { prepare(sql) {
  return { bind(...a) {
    return {
      run(){ db.prepare(sql).run(...a); return {}; },
      first(){ return db.prepare(sql).get(...a) ?? null; },
      all(){ return { results: db.prepare(sql).all(...a) }; },
    };
  },
  run(){ db.prepare(sql).run(); return {}; },
  first(){ return db.prepare(sql).get() ?? null; },
  all(){ return { results: db.prepare(sql).all() }; } };
} } };

const GUN = 86400000, simdi = Date.now();
// 5 gun once 10 oyuncu kaydoldu; 6'si ertesi gun geri dondu  -> D1 = %60
const kayitMs = simdi - 5*GUN;
for (let i=1;i<=10;i++){
  db.prepare('INSERT INTO players (id,created_at) VALUES (?,?)').run('p'+i, kayitMs);
  await gunuIsaretle(env,'p'+i, kayitMs);                 // kayit gunu
  if (i<=6) await gunuIsaretle(env,'p'+i, kayitMs+GUN);   // ertesi gun geri dondu
}
// ayni gun iki kez acmak yeni satir uretmemeli
await gunuIsaretle(env,'p1', kayitMs);
const tekrar = db.prepare("SELECT COUNT(*) n FROM gun_aktif WHERE player_id='p1'").get().n;

const d1 = await geriDonus(env,1);
const dau = await gunlukAktif(env);
console.log('p1 satir sayisi (2 olmali, tekrar yazma uretmemeli):', tekrar);
console.log('D1 beklenen %60  ->  bulunan %' + d1.toplam.oran, ` (${d1.toplam.donen}/${d1.toplam.kayit})`);
console.log('DAU:', dau.map(x=>`${x.gun}:${x.oyuncu}`).join('  '));
const ok = tekrar===2 && d1.toplam.oran===60;
console.log(ok ? '\nTEST GECTI' : '\nTEST KALDI');
process.exit(ok?0:1);
