-- Mini HUB sunucu semasi.
--
-- NASIL CALISTIRILIR: Cloudflare Dashboard -> Workers & Pages -> D1 ->
-- veritabanini ac -> "Console" sekmesi -> bu dosyanin TAMAMINI yapistir -> Run.
-- Adimlar bot/KURULUM-SUNUCU.md dosyasinda tek tek anlatiliyor.
--
-- Bu dosya bir KEZ calistirilir (veritabani ilk kurulurken). Tekrar
-- calistirmak istersen "IF NOT EXISTS" sayesinde hata vermez, hicbir seyi
-- silmez.

-- Her oyuncunun jeton bakiyesi. id, Telegram kullanici kimligi (initData
-- icinden dogrulanarak cikarilir - istemci hicbir zaman kendi id'sini
-- soyleyemez).
--
-- energy: oyun enerjisi (bkz. worker.js MAX_ENERGY). Bittiginde Coin
-- kazanci kesilmiyor, sadece azaliyor.
-- streak_count / last_claim_at: gunluk seri odulu icin.
-- last_spin_at: gunluk cark hakki icin.
-- energy_at: enerji zamanla kendiliginden doluyor (bkz. worker.js
-- enerjiTazele). energy_at son hesaplama anini tutar; enerji okundugu anda
-- gecen sureye gore ilerletilip kalici hale getirilir.
CREATE TABLE IF NOT EXISTS players (
  id            TEXT PRIMARY KEY,
  points        INTEGER NOT NULL DEFAULT 0,
  energy        INTEGER NOT NULL DEFAULT 24,
  streak_count  INTEGER NOT NULL DEFAULT 0,
  last_claim_at INTEGER NOT NULL DEFAULT 0,
  last_spin_at  INTEGER NOT NULL DEFAULT 0,
  energy_at     INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- ONEMLI: eger bu semayi DAHA ONCE calistirdiysan (players tablosu zaten
-- varsa), yukaridaki CREATE TABLE IF NOT EXISTS hicbir sey yapmaz - var olan
-- tabloya yeni sutun eklemez. O zaman D1 konsolunda asagidaki UC satiri TEK
-- TEK, bir kez calistir (zaten calistirdiysan "duplicate column" hatasi
-- alirsin, zararsizdir, gormezden gel):
--
--   ALTER TABLE players ADD COLUMN energy INTEGER NOT NULL DEFAULT 24;
--   ALTER TABLE players ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE players ADD COLUMN last_claim_at INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE players ADD COLUMN last_spin_at INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE players ADD COLUMN energy_at INTEGER NOT NULL DEFAULT 0;

-- Rekorlar (best_2048 gibi) ve oyun durumlari (state_dragon gibi) tek
-- tabloda: key alani hangisi oldugunu ayirt eder. value her zaman JSON
-- metni olarak tutulur, sayisal skorlar bile.
--
-- version: state_* yazmalarinda "eskiyen yazma araya girmesin" korumasi
-- icin kullanilir (bkz. worker.js handleState). Ilk denemede bunun yerine
-- updated_at (milisaniye) kullanilmisti ama iki yazma ayni milisaniyeye
-- denk gelince koruma atlaniyordu - test bunu yakaladi. version her basarili
-- yazmada 1 artan bir sayac oldugu icin bu sorun olmuyor.
CREATE TABLE IF NOT EXISTS player_data (
  player_id  TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, key)
);

-- Jeton harcama/kazanma islemlerinin gecmisi. Asil amaci ayni istegin iki kez
-- islenmesini onlemek (op_id tekil oldugu icin bir daha ayni islem
-- uygulanmiyor, onceki sonuc geri donuyor).
CREATE TABLE IF NOT EXISTS spend_log (
  player_id      TEXT NOT NULL,
  op_id          TEXT NOT NULL,
  delta          INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (player_id, op_id)
);
