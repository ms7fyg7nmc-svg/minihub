# Oyunlar

Hub'ın oyun listesi `js/hub.js` içindeki dizide duruyor. Bir klasörün
burada olması oyunun hub'da görüneceği anlamına **gelmiyor** — iki ayrı
şey.

## Yayından kaldırılanlar

`_pet` (My Dragon) ve `_watersort` (Water Sort), 10 Ekim 2026'da yayından
kaldırıldı.

İkisi de hub listesinde zaten yoktu, ama **dosyaları yayınlanıyordu**:
`.../games/pet/index.html` adresi canlıda 200 dönüyordu, yani linki bilen
herkes açıp oynayabiliyordu.

Çözüm, projenin kendi mekanizması: klasör adının başına **alt çizgi**.
GitHub Pages (Jekyll) alt çizgiyle başlayan klasörleri servis etmiyor —
`assets/_alternatifler/` ve `assets/_kaynak/` aynı kuralla çalışıyor.
Kod git'te duruyor, siteye çıkmıyor.

Aynı anda iki şey daha değişti:

- **`surum-damgala.mjs` artık `_` klasörlerini atlıyor.** Oyuncuya hiç
  inmeyen dosyaların önbellek damgasına ihtiyacı yok; damgalamak sadece
  git farkını gürültüye boğuyordu.
- **`watersort`un ödemesi sıfırlandı** (`bot/worker.js` → `OYUN_ODEME`).
  Oyun erişilemiyorsa oraya gelen her skor tanımı gereği uydurma.
  Tavanı 300'dü, yani açık büyük değildi, ama kapalı bir oyundan para
  çıkmasının meşru yolu yok. Skorun **kaydı** hâlâ kabul ediliyor:
  eskiden kuyruğa girmiş bir gönderim "bilinmeyen oyun" hatası almasın
  diye. `pet` zaten ödeme yapmıyordu.

### Geri yayına almak

1. Klasörün başındaki alt çizgiyi kaldır (`games/_pet` → `games/pet`).
2. `js/hub.js`'teki oyun listesine ekle — `id`, `title`, `desc`, `url`,
   `foto`. Hub karesi de gerekir; kural, karenin **oyunun kendi
   parçalarını** göstermesi (bkz. `assets/game-tile/README.md`).
3. `watersort` için `OYUN_ODEME`'deki satırı
   `{ formul: 'watersort', tavan: 300 }` haline döndür ve
   `bot/test-guvenlik.mjs`'teki testi geri al.
4. `node surum-damgala.mjs <n>` — klasör artık damgalanır.
5. Ön yüz `git push`, arka uç `npx wrangler deploy`. İkisi ayrı.
