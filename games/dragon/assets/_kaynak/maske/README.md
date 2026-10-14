# Maskeli üretim testleri — 11 Ekim 2026

Eylülden beri süren "parçalar ejderhaya oturmuyor" sorununun çözümü.
Kalibrasyon (öteleme+ölçek) başarısız oldu; bu klasör işe yarayan
yöntemin kanıtı.

## Yöntem

GPT Image 2.5 Flare'in `mask` parametresi: **saydam alan düzenlenir,
opak alan korunur.** Gövdeyi referans olarak verip maskeyi sadece
ilgili bölgede açıyoruz. Model gövdeyi gördüğü için parçayı ona göre,
doğru perspektifte ve doğru ışıkta çiziyor. Hizalama yapı gereği doğru.

Katman çıkarma: katmanın alfası = **maskenin açıklığı** (ters alfa),
gövdenin siluetiyle kesiştirilmiş. Maske yumuşak kenarlı olduğu için
katman da geçişli bitiyor, birleşme çizgisi oluşmuyor.

## Testler

| Test | Maske | CU | Sonuç |
|---|---|---|---|
| Kanat | iki omuz, gövdeyle örtüşen elips | 11 | ✅ omuz eklemiyle gerçekten bağlı kanat |
| Kafa (geniş) | %55'e kadar bütün kafa | 11 | ❌ ifade değişti ama **kimlik kaydı** — boynuz büyüdü, kafatası genişledi |
| Yüz (dar) | sadece kaş/göz/burun/ağız | 11 | ✅ boynuz, ibik, kafatası aynen korundu; yalnız ifade değişti |

**Ders: maske ne kadar darsa kimlik o kadar korunur.** Değiştirilecek
şeyin dışındaki her piksel maskenin dışında kalmalı.

## Bilinen kusur

Dar maskenin üst kenarı ortadaki ibik dikenini sıyırıyor; birleşikte
diken base'dekinden biraz daha ince çıkıyor. Sonraki üretimde maskenin
üst kenarı birkaç piksel aşağı alınmalı ya da ibik sütunu maskeden
oyulmalı.

## Dosyalar

- `maske-yuz.png`, `maske-kanat.png` — maskeler
- `yuz-kizgin.png` — modelin ham çıktısı
- `yuz-kizgin-katman.png` — çıkarılmış saydam katman (base'in üstüne konur)
- `yuz-birlesik.png` — base + katman
- `YUZ-KIYAS.png` — nötr / geniş maske / dar maske
- `YUZ-KATMAN.png` — base / katman / birleşik

---

## Deneme motoru

`_kaynak/motor.html` — tarayıcıda açılan kombinasyon motoru. Katmanları
`katman/` klasöründen alıp üst üste bindiriyor; oyunun yapacağı işin
aynısı, hiçbir hizalama hesabı yok.

Yerel adres (sunucu açıkken):
`http://localhost:8765/games/dragon/assets/_kaynak/motor.html`

`_` ile başlayan klasörler GitHub Pages'te yayınlanmaz, yani bu sayfa
yalnızca bilgisayarda çalışır — canlıya çıkmaz.

---

## DÜZELTME — maskeli kanat da kırık

Yukarıda "✅ omuz eklemiyle gerçekten bağlı" yazan kanat testi
**anatomik olarak ters.** Bağlanma, ışık ve perspektif doğru; kanadın
kendi yapısı yanlış:

| Doğrusu | Bizimki |
|---|---|
| Kalın kol kemiği **üstte**, ön kenarda | Üst kenar kemiksiz, desteksiz zar yayı |
| Pençe kanadın **dış ucunda, yukarıda** | Pençe **aşağı** bakıyor |
| Zar parmakların arasından aşağı sarkar | Kemikler omuzdan aşağı açılıyor |

Her iki kanatta da aynı. Sebep: modele referans olarak **yalnızca gövde**
verildi, kanadın yapısı yazıyla anlatıldı — model yapıyı uydurdu.
Elimizde doğru çizilmiş 8 kanat varken hiçbiri referans verilmemişti.

**Maskeli üretim şunu kanıtladı:** gövdeye bağlanma, ışık/perspektif
uyumu, kimliğin korunması. **Şunu kanıtlamadı:** parçanın kendi
anatomisinin doğru çıkacağı.

Sonraki denemede: gövdenin yanına **doğru çizilmiş bir kanat da ikinci
referans görsel** olarak verilecek (Flare 10 referansa kadar destekliyor)
ve istem anatomiyi açıkça yazacak. Sonuç, "oldu" denmeden önce ön kenar
ve pençe yönünden kontrol edilecek.
