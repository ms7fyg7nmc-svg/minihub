# Sunucu Kurulumu (Jeton ve İlerleme Artık Sunucuda)

Şu ana kadar jeton bakiyen, oyun rekorların ve ejderhanın durumu **sadece
kendi telefonunda/tarayıcında** tutuluyordu. Bunun sakıncası: biri tarayıcı
ayarlarından bu kaydı elle değiştirebiliyordu (sana bunu canlı göstermiştim).

Bu adımdan sonra bu bilgiler **sunucuda** (Cloudflare'in ücretsiz veritabanı
hizmeti D1) tutulacak ve her istek Telegram'ın imzaladığı bir bilgiyle
doğrulanacak — yani artık kimse kendi bakiyesini uydurup sunucuya
yazdıramayacak.

**Bu adımı atlarsan hiçbir şey bozulmaz** — oyun bugünkü gibi, verileri
cihazda tutarak çalışmaya devam eder. Sadece bakiye cihazdan cihaza taşınmaz
ve (daha önce gösterdiğim gibi) teknik olarak değiştirilebilir kalır.

**Önce şu tamamlanmış olmalı:** [KURULUM-BOT.md](KURULUM-BOT.md) — botun
zaten çalışıyor olması, `BOT_TOKEN` ve Worker'ın zaten var olması gerekiyor.
Aşağıdaki adımlar o Worker'ın **üzerine ekleme** yapıyor, yeni bir Worker
açmıyor.

Tahmini süre: 20 dakika. Maliyet: 0 ₺ (D1'in ücretsiz katmanı bu ölçekte
fazlasıyla yeter).

---

## A. D1 veritabanını oluştur

1. Cloudflare panelinde sol menüden **Storage & Databases** → **D1 SQL
   Database**'e gir (Compute/Workers menüsünün yakınında)
2. **Create database** butonuna bas
3. Bir isim ver: `minihub-db`
4. **Create** ile onayla

> Cloudflare arayüzü zaman zaman değişiyor. "D1" ismini ara, bulamazsan
> panelin arama kutusuna "D1" yaz.

---

## B. Veritabanını Worker'a bağla

1. **Workers & Pages**'e dön, botunun Worker'ını aç (`minihub-bot`)
2. **Settings** sekmesi → **Bindings** (veya **Variables and Bindings**)
   bölümünü bul
3. **Add binding** → **D1 database** seç
4. **Variable name** kutusuna tam olarak şunu yaz (büyük harflerle):
   ```
   DB
   ```
5. **D1 database** açılır listesinden A adımında oluşturduğun `minihub-db`'yi
   seç
6. **Deploy** ile kaydet

> ⚠️ Değişken adı tam olarak `DB` olmalı — kod bu ismi arıyor. Başka bir isim
> yazarsan sunucu "veritabanı bağlanmamış" hatası verir.

---

## C. Tabloları oluştur

1. D1 veritabanının sayfasına git (Storage & Databases → `minihub-db`)
2. **Console** sekmesine gir
3. Bu klasördeki [schema.sql](schema.sql) dosyasının **içindeki her şeyi**
   kopyala
4. Konsola yapıştır, **Run** (veya **Execute**) butonuna bas

Üç tablonun oluştuğuna dair bir onay mesajı görmelisin. Bu adımı bir daha
çalıştırırsan hata vermez, hiçbir şeyi silmez (dosyanın en başında bu
açıklanıyor).

### "Requests without any query are not supported" hatası alırsan

Bazı hesaplarda D1 konsolu üç `CREATE TABLE` komutunu **tek seferde** kabul
etmiyor. Çözüm: aşağıdaki üç bloğu **teker teker** kopyala — her birini
konsola yapıştır, **Run**'a bas, konsolu temizle, sıradakine geç.

**1. blok:**
```sql
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,
  points     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**2. blok:**
```sql
CREATE TABLE IF NOT EXISTS player_data (
  player_id  TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, key)
);
```

**3. blok:**
```sql
CREATE TABLE IF NOT EXISTS spend_log (
  player_id      TEXT NOT NULL,
  op_id          TEXT NOT NULL,
  delta          INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (player_id, op_id)
);
```

Üçü de hatasız çalıştıysa D adımına geç. (Hâlâ aynı hatayı alıyorsan konsol
kutusuna gerçekten bir şey yapıştırıldığından emin ol — bazen kopyalama
GitHub'ın önizleme ekranından değil, dosyanın "Raw" görünümünden yapılmalı:
schema.sql sayfasında **Raw** butonuna basıp oradan kopyala.)

---

## D. Oyunun sunucu adresini gir

1. GitHub'da deponu aç, `js/store.js` dosyasına gir, kalem simgesiyle
   düzenlemeye başla
2. Dosyanın başlarında şu satırı bul:
   ```js
   const API_BASE = 'https://minihub-bot.KULLANICIADIN.workers.dev';
   ```
3. `KULLANICIADIN` kısmını, [KURULUM-BOT.md](KURULUM-BOT.md)'nin **C**
   adımında not ettiğin gerçek adresle değiştir — Worker'ın kendi sayfasının
   en üstünde de yazıyor, oradan da kopyalayabilirsin
4. Sayfanın altından **Commit changes** ile kaydet

> ⚠️ Bu adres gizli değil (URL'ler zaten görülebilir), rahatça commit
> edebilirsin. Gizli olanlar sadece `BOT_TOKEN` ve `WEBHOOK_SECRET`.

---

## E. Yeni worker.js'i yapıştır

`bot/worker.js` bu güncellemeyle değişti (jeton/ilerleme uçları eklendi).
[KURULUM-BOT.md](KURULUM-BOT.md)'nin **C** adımındaki gibi:

1. Worker sayfasında **Edit code**
2. Soldaki editördeki **her şeyi sil**
3. Bu klasördeki [worker.js](worker.js) dosyasının tamamını kopyala, yapıştır
4. **Deploy**

Botun mesaj gönderme davranışı (webhook) hiç değişmedi — sadece yeni uçlar
eklendi, mevcut hiçbir şeye dokunulmadı.

---

## F. Dene

1. Telegram'da Mini App'i aç (herhangi bir oyunu oyna, jeton kazan ya da
   ejderhayı besle)
2. Tarayıcının geliştirici araçlarını aç (Mini App'i masaüstü Telegram'da
   veya tarayıcıda test ediyorsan), **Application/Storage → Local Storage**
   kısmından `hub_points` kaydını sil, sayfayı yenile
3. Bakiye **aynı kaldıysa** (sıfırlanmadıysa) sunucu çalışıyor demektir —
   çünkü artık kaynak cihazında değil, sunucuda

### Beklenmedik bir şey olursa

Tarayıcı konsolunda (F12 → Console) şunlardan biri görünebilir:

- **"sunucu veritabanı bağlanmamış (D1 binding DB eksik)"** → B adımı
  eksik/yanlış yapılmış, binding adının tam olarak `DB` olduğunu kontrol et
- **"kimlik doğrulanamadı"** → Mini App gerçekten Telegram içinde açılmıyor
  olabilir (tarayıcıda doğrudan test ediyorsan bu normal, misafir moduna
  düşer) ya da `BOT_TOKEN` Worker'da yanlış/eksik
- Hiçbir hata yok ama bakiye hâlâ cihazda kalıyor gibi görünüyor → D adımında
  `API_BASE` adresini doğru girip GitHub'a commit ettiğinden emin ol; GitHub
  Pages'in güncellenmesi birkaç dakika sürebilir

Hiçbiri olmuyorsa oyun zaten sessizce eski (cihazda tutma) davranışına
düşüyor — hiçbir zaman kırılmıyor, sadece sunucu avantajını kullanmıyor
olursun.

---

## Sonradan değiştirmek istersen

- **Tablo yapısı**: `bot/schema.sql` — değiştirirsen D1 konsolunda tekrar
  çalıştırman gerekir
- **Uç noktaların mantığı**: `bot/worker.js` içindeki `/api/*` bölümü
  (`handleSync`, `applyDelta`, `handleBest`, `handleState`)
- **Hangi sitenin sunucuya istek atabileceği**: `worker.js` başındaki
  `ALLOWED_ORIGIN`
- **İstemci tarafı (oyun/ejderha) davranışı**: `js/store.js` — oyunların
  hiçbiri bu dosyayı bilmeden kullanıyor, değişiklik yapman gerekirse sadece
  burası yeterli

Değiştirdikten sonra `worker.js`'i tekrar Cloudflare editörüne yapıştırıp
**Deploy** demen yeterli.
