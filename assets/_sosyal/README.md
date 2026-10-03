# Sosyal medya görselleri

Telegram kanalı ve sosyal paylaşımlar için üretilen görseller. **Oyunun
içinde kullanılmıyorlar.**

Klasör adı alt çizgiyle başlıyor, bu yüzden GitHub Pages bunları
yayınlamıyor (bkz. `assets/README.md`) — git'te duruyorlar ama oyuncunun
telefonuna inmiyorlar. Pazarlama görselleri megabaytlarca yer tutar,
siteye çıkmalarının bir anlamı yok.

| Dosya | Konu | Boyut |
|---|---|---|
| `davet-arkadas.{jpg,webp}` | Arkadaş davet — iki büyücü el sıkışıyor | 2048×2048 |

JPG her yere yüklenir; WebP Telegram için daha küçük ve aynı kalitede.

## Üretim notu

Büyücü, `assets/tutorial/wizard-greet.png` **referans görsel olarak
Scenario'ya verilerek** üretildi — tarif tek başına aynı yüzü getirmiyor
(bkz. `assets/tutorial/README.md`).

Görsellerde **yazı yok**, bilerek. Yapay zeka metinde güvenilir değil ve
gömülü yazı dört dile çevrilemez. Başlık/çağrı metni paylaşırken
gönderinin kendisine yazılmalı, ya da üstüne ayrı bir katman olarak
eklenmeli.

`davet-arkadas` görselinde üç ejderha silüeti çıkmıştı, üçüncüsü sağ
üstten koddan silindi (gökyüzü düz bir geçiş olduğu için yatay
enterpolasyonla kapandı). İstenen sayı ikiydi.
