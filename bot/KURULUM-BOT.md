# Karşılama Botu Kurulumu

Bu, `/start` yazan kullanıcıya hoş geldin mesajı ve **Oyna** butonu gönderen
küçük bir programdır. Puan saklamaz, veritabanı yoktur.

**Terminal kullanmayacaksın.** Kodu tarayıcıda bir editöre yapıştıracaksın,
son adımı da adres çubuğuna bir link yazarak yapacaksın.

Tahmini süre: 15 dakika. Maliyet: 0 ₺ (ücretsiz katman fazlasıyla yeter).

---

## A. Cloudflare hesabı aç

1. https://dash.cloudflare.com/sign-up adresine git
2. E-posta ve şifre ile ücretsiz hesap aç (kart bilgisi istemiyor)
3. E-postana gelen doğrulama linkine tıkla

---

## B. Worker'ı oluştur

1. Sol menüden **Compute (Workers)** → **Workers & Pages**'e gir
2. **Create** butonuna bas → **Start with Hello World!** seçeneğini seç
3. Bir isim ver: `minihub-bot`
4. **Deploy** butonuna bas (şimdilik örnek kodu yayınlıyor, sorun değil)
5. Yayınlandıktan sonra **Edit code** butonuna bas

> Cloudflare arayüzü zaman zaman değişiyor. Buton isimleri birebir aynı
> değilse "Worker oluştur" ve "Kodu düzenle" anlamına gelen seçenekleri ara.

---

## C. Kodu yapıştır

1. Açılan editörde soldaki `worker.js` dosyasının **içindeki her şeyi sil**
2. Bu klasördeki [worker.js](worker.js) dosyasının tamamını kopyalayıp yapıştır
3. Sağ üstteki **Deploy** butonuna bas

Yayınlandıktan sonra sana şuna benzer bir adres verecek:

```
https://minihub-bot.KULLANICIADIN.workers.dev
```

**Bu adresi not et**, E adımında lazım olacak.

---

## D. İki gizli değeri gir

Worker sayfasında **Settings** sekmesine gir → **Variables and Secrets**
bölümünü bul. **Add** ile iki tane ekle, ikisinin de türü **Secret** olsun
(Text değil — Secret seçersen değer şifreli saklanır ve bir daha kimse göremez):

| İsim | Değer |
|---|---|
| `BOT_TOKEN` | BotFather'ın sana verdiği token |
| `WEBHOOK_SECRET` | Uzun ve rastgele bir parola (aşağıda açıklandı) |

`WEBHOOK_SECRET` senin uydurduğun bir paroladır — Telegram dışından gelen sahte
isteklerin elenmesi için kullanılır. En az 30 karakter, harf ve rakam karışık
olsun. Bir yere kaydet, E adımında aynısını yazacaksın.

Ekledikten sonra **Deploy** de.

> ⚠️ Bu iki değeri kimseyle paylaşma, ekran görüntüsü alma. Token'ı ele geçiren
> biri botun adına mesaj gönderebilir.

---

## E. Telegram'a "bota gelen mesajları buraya yolla" de

Bu adım için tarayıcının adres çubuğunu kullanacaksın. Aşağıdaki adresi
kopyala, **üç yeri kendi bilgilerinle değiştir**, sonra adres çubuğuna yapıştırıp
Enter'a bas:

```
https://api.telegram.org/botTOKENIN/setWebhook?url=WORKER_ADRESIN&secret_token=GIZLI_PAROLAN
```

- `TOKENIN` → BotFather'ın verdiği token (başındaki `bot` yazısı kalsın:
  `.../bot123456:ABC.../setWebhook` gibi olacak)
- `WORKER_ADRESIN` → C adımındaki `https://minihub-bot....workers.dev` adresi
- `GIZLI_PAROLAN` → D adımında yazdığın `WEBHOOK_SECRET`

Ekranda şuna benzer bir yazı çıkarsa tamamdır:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

> ⚠️ Bu adres senin token'ını içeriyor. Ekran görüntüsü alma, kimseye gönderme.
> Adres çubuğu geçmişinden de silmen iyi olur.

---

## F. Dene

Telegram'da botunu aç ve `/start` yaz. Anında karşılama mesajı ve altında
**Oyna** / **Arkadaşını davet et** butonları gelmeli.

Kullanıcının Telegram dili neyse mesaj o dilde gelir (İngilizce, Türkçe,
İspanyolca, Rusça).

### Cevap gelmezse

Şu adresi adres çubuğunda aç (yine token'ını yaz):

```
https://api.telegram.org/botTOKENIN/getWebhookInfo
```

- `"last_error_message"` diye bir satır varsa sorun orada yazıyor
- `"pending_update_count"` yüksekse Worker cevap veremiyor demektir
- `403` hatası görüyorsan `WEBHOOK_SECRET` ile E adımında yazdığın parola
  birbirini tutmuyordur

---

## G. Artık komut menüsünü ekleyebilirsin

Bot artık `/start`, `/play` ve `/help` komutlarının üçüne de cevap veriyor.
Bu yüzden komut menüsünü eklemek artık güvenli (önceden eklemek botu daha
bozuk gösterirdi, çünkü hiçbiri cevap vermiyordu).

BotFather'da `/setcommands` yaz, botu seç, şunu yapıştır:

```
start - Open the game hub
play - Jump straight into the games
help - How points work
```

---

## Sonradan değiştirmek istersen

- **Mesaj metinleri**: `worker.js` içindeki `TEXTS` bölümü
- **Butonlar**: `keyboard()` fonksiyonu
- **Oyunun adresi**: dosyanın başındaki `MINI_APP_URL`

Değiştirdikten sonra kodu tekrar Cloudflare editörüne yapıştırıp **Deploy**
demen yeterli.
