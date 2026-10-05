
## gram-64.webp / gram-128.webp — Gram rozeti

Cuzdandaki "Gram" kutusunda kullaniliyor. Gram, **TON'un yerlesik
coin'i** - 15 Haziran 2026'da Toncoin bu adi aldi. Yani bu bir ucuncu
parti jeton degil, oyuncularin cuzdanla gonderecegi paranin kendisi;
bakiyeyi kendi logosuyla etiketlemek dogru olan.

**Kaynak:** <https://ton.org/media> -> "Circular Badge" (zaten
"cuzdanlar ve benzeri yerler icin yuvarlak format" diye tanimlanmis).
Orijinal SVG `_kaynak/gram-circular-badge.svg` altinda duruyor;
yeniden boyutlandirmak gerekirse oradan uretilir.

**Degistirilmedi.** TON'un marka kurallari rengi/bicimi degistirmeyi
yasakliyor - dosya yalnizca olceklendi. CSS'te de soluklastirilmiyor:
`.cuzdan-gram-simge` normalde `opacity: .5` ama logo yuklendiginde
`:has()` kurali bunu 1'e cikariyor (bkz. css/style.css).

Ekranda 40px gorunuyor, bu yuzden HTML **128'liyi** cagiriyor - 3x
ekranda net kalsin diye. 64'luk daha kucuk yerler icin duruyor.

Dosya bir sekilde gelmezse yedek olarak soluk bir **"g" harfi** kaliyor:
img 404 alirsa DOM'dan kaldiriliyor, cuzdanda kirik ikon cikmiyor
(bkz. `js/hub.js` -> `gramSimgesi`).
