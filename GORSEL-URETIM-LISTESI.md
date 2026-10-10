# Görsel Üretim Listesi

Minihub · 9 Ekim 2026 · Scenario sıfırlanmadan önce

Bu liste beraber düzenlemek için. Üzerine not düşün, sıra değiştir, madde
ekleyip çıkar — sonra onayladıklarını üretiriz.

---

## Bütçe gerçeği

Son 31 günde **641 CU** harcanmış. **Kalan bakiyeyi API vermiyor** —
Scenario panelinden bakman gerek (Settings → Billing). Plan `cu-basic`.

Maliyet hakkında bugün öğrendiklerimiz:

- **GPT Image 2.5 Flare**, 2560×1536, kalite `high` → **13 CU/sayfa**.
  Kalite burada belirleyici; Qwen'in ürettiği yavan çıktılar bu modelle
  kıyas kabul etmiyor.
- **Kolaj şart.** Bir sayfaya 6–10 görsel sığıyor ve hepsi aynı 13 CU.
  Tek tek üretmek hem on kat pahalı hem stil tutmuyor.
- **Şeffaf arka plan** bu modelde hazır geliyor — arka plan silme adımı
  (ayrı 1 CU) artık gereksiz.
- Qwen'de üç zaman aşımı yedik, her biri 6 CU ve karşılığında hiçbir şey
  yok. **Qwen'i artık kullanmayalım.**

Kabaca: **her sayfa 13 CU**, bir sayfada 6–10 varlık.

---

## Öncelik 1 — Her gün görülen eksikler · 26 CU

Hub'ın ana ekranında, her açılışta görünüyor ve şu an **yer tutucu**.

### 1.1 Yedi oyun karesi — en büyük açık

Dokuz oyundan yalnızca **Dragon Island** ve **Tekerlek Yarışı** gerçek
görsel taşıyor. Kalan yedisi CSS gradyanı + SVG ikon:

2048 · Blok Bulmaca · Şeker Eşleştir · Üçlü Eşleştir · Bağlan · Yılan ·
Coin Drop

Hub'ın ilk izlenimi bu ızgara. Yedi kare tek sayfada üretilebilir.

**1 sayfa · 13 CU**

### ~~1.2 Üçlü Eşleştir'in taşları~~ ✅ 9 Ekim · 14 CU

Oyunun on taşı **emoji** idi — cihazdan cihaza değişiyor ve alt kattaki
taşlar karartılınca kayboluyordu. On ikiye çıkarıldı (biri $MH sikkesi,
biri ejderha yumurtası), hepsi tek kolajdan. `assets/tripletile/`.

### ~~1.3 Yeni özelliklerin ikonları~~ ✅ 10 Ekim · 13 CU

Tek kolajdan 8 ikon: görev parşömeni, tüccar tezgahı, promosyon bileti,
açık sandık, kapalı sandık, rozet, hediye, kese. `assets/icons/`.

Bağlananlar:

- **Günlük görevler** — kart başlığına parşömen ikonu
- **Promosyon kodu** — Ayarlar'daki etiketin başına bilet ikonu
- **Tüccar** — Ejderha Adası'nın sekme çubuğunda büyücünün tüm portresi
  26 piksele sıkışıyordu; yerine tezgah ikonu. Büyücünün kendisi tüccar
  ekranının başında duruyor, karakter kaybolmadı.
- **Sandık açılışı** — asıl eksik buradaydı. "Sandığı aç"a basınca
  ekranda hiçbir şey olmuyordu: düğme "alındı"ya dönüyor, bakiye sessizce
  artıyordu. Artık perde + açılan sandık + kazanılan miktar
  (`js/odul.js`).

Yedekte kalanlar: kapalı sandık, rozet, hediye, kese.

### Match Candy'nin taşları — ÜRETİLDİ, KULLANILMADI · 13 CU

8 şeker üretildi (nane, karamela, lolipop, sakız, jelibon, mor şeker,
trüf, kalp). **Sahibin kararı: oyun olduğu gibi kalsın** — renk ayrımı
net, nesneler okunabiliyor, Candy formatından çıkarmaya gerek yok.

Dosyalar silinmedi, `assets/match3/_kaynak/kesim/` altında duruyor
(`_` ile başladığı için yayınlanmıyor). Ayrıntı: `assets/match3/README.md`.

**Kural olarak kalsın:** Scenario kullanılacaksa oyunun şu anki
karakterine benzer bir yapı kurulmalı. Şekerler bu yüzden tutmadı.


---

## ~~Öncelik 2 — Sosyal medya ve duyuru~~ ✅ 10 Ekim · 84 CU

Listede 143 CU yazıyordu; **84 CU'ya bitti.** Fark, dördünün
üretilmeyip oyunun kendi varlıklarından kurulmasından geliyor.

### Üretilen 8 görsel · 84 CU · `assets/_sosyal/`

| Görsel | Nerede |
|---|---|
| `kanal-kapagi` | Telegram kanalının üst görseli |
| `miniapp-onizleme` | Telegram'daki oyun kartı |
| `minihub-nedir` | Sabitlenmiş tanıtım gönderisi |
| `tuccar-geldi` | Tüccar / sipariş duyurusu |
| `ejderha-yakalandi` | Nadir an kutlaması |
| `odul-carki` | Günlük dönüş hatırlatması |
| `promosyon-kodu` | Kod dağıtım duyurusu |
| `bos-afis` | Boş şablon |

### Kodla kurulan 4 görsel · 0 CU

`on-kademe-yumurta`, `gunluk-gorevler`, `haftalik-liderlik`,
`genel-afis` — zemin `bos-afis`, üzerindekiler oyunun gerçek dosyaları
(`assets/_sosyal/_kodla/ciz.py`).

### Bu turda öğrenilen: referans görsel

Sekiz görselin aynı dünyada durmasını sağlayan şey prompt değil,
**`davet-arkadas.webp`'in `referenceImages` olarak verilmesi** oldu.
Metinle "sıcak resimsi fantezi" demek yetmiyor; referansla birlikte
hepsi aynı büyücüyü, aynı altın ışığı ve aynı yarasa amblemli
sandıkları taşıyor. Yeni sosyal görselde **aynı referansı ver.**

Hiçbirinin içinde yazı yok — başlık sonradan, istenen dilde konuyor.
Dört dile dört görsel üretmek hem pahalı hem her metin değişikliğinde
yeniden üretim demek.


## Öncelik 3 — Geleceği düşünerek · 52 CU

Henüz yapılmamış ama yol haritasında olan şeyler. Scenario sıfırlanmadan
stoklamaya değer — özellik geldiğinde görsel hazır olur.

### 3.1 Ejderha çiftleştirme · 1 sayfa · 13 CU

Uzun süredir ertelenen özellik. Gerekecek görseller: çiftleştirme ekranı
arka planı, yuva/ısıtma görseli, "yeni yumurta geldi" anı.

### 3.2 Büyücü pozları · 1 sayfa · 13 CU

Elimizde üç poz var (karşılama, anlatma, tebrik). Eksikler:

- **tezgah başında** — tüccar rolü
- **düşünür/şaşkın** — başarısızlık anı
- **işaret eden** — yönlendirme
- **uyuyan** — enerji bitti

Tek karakterin dört pozu, tek sayfada ve stil tutarlı.

### 3.3 Sezon / etkinlik çerçeveleri · 1 sayfa · 13 CU

Kış, yaz, yılbaşı gibi dönemsel etkinlikler için çerçeve ve rozet seti.
Şimdi üretilirse etkinlik zamanı beklemeden açılır.

### 3.4 Yeni oyun kareleri (boş şablon) · 1 sayfa · 13 CU

Hub'a ileride oyun eklenirse kare lazım olacak. Üç–dört nötr, türü belli
olmayan kare şimdiden üretilebilir.

---

## Toplam

| Öncelik | Sayfa / görsel | CU |
|---|---|---|
| ~~1 — oyun kareleri~~ | ✅ yapıldı | — |
| ~~1 — Üçlü Eşleştir taşları~~ | ✅ 9 Ekim | 14 |
| ~~1 — yeni özellik ikonları~~ | ✅ 10 Ekim | 13 |
| ~~Match Candy şekerleri~~ | üretildi, kullanılmadı | 13 |
| ~~2 — Sosyal ve duyuru~~ | ✅ 10 Ekim · 8 üretildi + 4 kodla | 84 |
| 3 — Gelecek | 4 sayfa | 52 |
| **Toplam** | | **221 CU** |

Düzeltme turları için **%30 pay** eklemek gerek — bugün yumurtalarda üç
tur gitti. Gerçekçi hedef **~290 CU**.

---

## Çalışma kuralı

Bugün pahalıya öğrendik, yazılı kalsın:

1. **Önce yazıyla anlaş, sonra üret.** Yön netleşmeden üretmek bugün
   88 CU'ya mal oldu.
2. **Tek deneme, sonra göster.** Arka arkaya tahminle üretme yok.
3. **Her zaman gerçek boyutta kontrol et.** Izgara kareleri 72 pikselde
   görünüyor; orada okunmayan tasarım iyi değildir.
4. **Qwen kullanma.** Zaman aşımına uğruyor ve ücretlendiriyor.
