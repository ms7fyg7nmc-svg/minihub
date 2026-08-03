# Kurulum Rehberi (Faz 1)

Bu rehber, bilgisayarındaki dosyaları internete koyup Telegram'a bağlamanı sağlar.
Terminal komutu yok, hepsi tarayıcıdan. Tahmini süre: 20-30 dakika.

Tek seferlik yapman gerekenler: **A → B → C → D**. Sonrasında her değişiklikte
sadece **F** bölümünü tekrarlayacaksın.

---

## A. Dosyaları GitHub'a yükle

GitHub, dosyaların internette durduğu ücretsiz bir yer. Oradan doğrudan web
sitesi yayınlayabiliyoruz.

1. https://github.com adresine gir, hesabın yoksa **Sign up** ile ücretsiz aç.
2. Giriş yaptıktan sonra sağ üstteki **+** işaretine tıkla → **New repository**.
3. Formu şöyle doldur:
   - **Repository name**: `minihub`
   - **Public** seçili olsun (ücretsiz yayın için şart)
   - Alttaki "Add a README file" kutusunu **işaretleme**
4. **Create repository** butonuna bas.
5. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
6. Bilgisayarında `minihub` klasörünü aç. İçindeki şu öğeleri **hepsini birden
   seçip** tarayıcıdaki yükleme alanına sürükle:
   - `index.html`
   - `css` klasörü
   - `js` klasörü
   - `games` klasörü

   > `.claude` klasörünü yüklemene gerek yok, o sadece bende çalışan bir ayar.

7. Yükleme bitince sayfanın altındaki yeşil **Commit changes** butonuna bas.

Artık dosyaların GitHub'da.

---

## B. Siteyi yayına al (GitHub Pages)

1. Deponun üst menüsünden **Settings** sekmesine gir.
2. Sol menüden **Pages**'e tıkla.
3. "Build and deployment" altında:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` seç, yanındaki klasör kutusunda `/ (root)` kalsın
4. **Save** butonuna bas.
5. 1-2 dakika bekle, sayfayı yenile. Üstte şuna benzer bir adres çıkacak:

   ```
   https://KULLANICIADIN.github.io/minihub/
   ```

6. Bu adresi telefonunun tarayıcısında aç ve oyunun çalıştığını gör.
   **Bu adresi bir yere not et, C ve D adımlarında lazım olacak.**

> Adres açılmıyorsa 5 dakika daha bekle, ilk yayın bazen gecikir.

---

## C. Telegram botunu oluştur

1. Telegram'da arama kutusuna **@BotFather** yaz ve doğrulanmış (mavi tikli)
   olanı aç. **Start** / **Başlat** de.
2. Mesaj olarak `/newbot` yaz, gönder.
3. BotFather sırayla iki şey soracak:
   - **Bot'un görünen adı**: örn. `Game Hub`
   - **Bot'un kullanıcı adı**: mutlaka `bot` ile bitmeli, örn. `oyunhub_bot`
     (alınmışsa başka bir isim dener)
4. BotFather sana bir **token** verecek — uzun bir harf/rakam dizisi.
   Bunu kimseyle paylaşma, bir yere kaydet. (Faz 1'de kullanmayacağız ama
   Faz 2'de lazım olacak.)

---

## D. Mini App'i bota bağla

1. BotFather sohbetinde `/mybots` yaz.
2. Az önce oluşturduğun botu seç.
3. **Bot Settings** → **Menu Button** → **Configure menu button**
4. BotFather adres isteyecek. B adımındaki adresi yapıştır:

   ```
   https://KULLANICIADIN.github.io/minihub/
   ```

5. Sonra buton yazısını soracak. Şunu yaz: `Oyna`

Bitti. Şimdi kendi botunu Telegram'da aç — mesaj kutusunun yanında **Oyna**
butonu göreceksin. Bastığında oyun hub'ı açılacak.

---

## E. Kontrol listesi

- [ ] Hub açılıyor, adın ve profil fotoğrafın görünüyor
- [ ] 2048 kartına basınca oyun açılıyor
- [ ] Parmakla kaydırınca taşlar hareket ediyor
- [ ] Oyun bitince "Oyun bitti" ekranı ve kazanılan puan çıkıyor
- [ ] Hub'a döndüğünde puan ve rekor görünüyor
- [ ] Uygulamayı kapatıp tekrar açtığında puanın duruyor

---

## F. Değişiklik yapmak istediğinde

Bir dosyayı güncellediğimde:

1. GitHub'da deponu aç.
2. Değişen dosyanın bulunduğu klasöre gir, dosyaya tıkla.
3. Sağ üstteki **kalem** simgesine bas.
4. İçeriği sil, benim verdiğim yeni içeriği yapıştır.
5. Alttaki **Commit changes** butonuna bas.
6. 1-2 dakika sonra Telegram'da Mini App'i kapatıp tekrar aç.

> Değişikliği görmüyorsan: Telegram → Ayarlar → Veri ve Depolama → Önbelleği
> temizle, sonra botu yeniden aç.

---

## Şu an ne var, ne yok

**Var:**
- Oyun hub menüsü (Telegram teması ve kullanıcı bilgisiyle uyumlu)
- Tam çalışan 2048: kaydırma, birleştirme, animasyon, titreşim
- Skor + rekor + toplam hub puanı (Telegram bulutunda saklanır, telefon
  değişse bile kaybolmaz)
- Yarım kalan oyun kaydedilir, geri döndüğünde kaldığın yerden devam eder
- Puan kuralı: her 10 oyun skoru = 1 hub puanı (`games/2048/2048.js` içindeki
  `POINTS_DIVISOR` değeriyle ayarlanır)

**Yok (Faz 2 ve sonrası):**
- Sunucu ve veritabanı — şu an skorlar sadece kullanıcının kendi cihazında/
  Telegram bulutunda. Ortak liderlik tablosu ve hile önleme için sunucu gerekir.
- Cüzdan bağlama, airdrop, presale, referans sistemi
- Puanların gerçek token'a çevrilmesi

**Maliyet:** Faz 1 tamamen ücretsiz. GitHub Pages ve Telegram için ödeme yok.
