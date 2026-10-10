# Oyun sonu perdesi — durum ikonları

Dokuz oyunun ortak bitiş perdesinde (`css/game.css` → `.overlay`)
başlığın üstünde duran ikonlar.

## Neden

Perdede bir başlık, bir satır yazı ve bir düğmeden başka hiçbir şey
yoktu. **On dakikalık bir koşunun sonu da, yeni bir rekorun da aynı
görünüyordu.** Oyuncunun o anda hissetmesi gereken şey birbirinin tam
tersi iki şey.

## Durumlar

| Dosya | Ne anlatıyor | Nerede |
|---|---|---|
| `bitti` | Çatlamış taş tablet | 2048, Blok Bulmaca, Üçlü Eşleştir, Yılan |
| `rekor` | Kupa + yıldızlar | Hepsi — `result.isRecord` olduğunda |
| `sure` | Kumu bitmiş kum saati | Match Candy (süre dolması bir kayıp değil, normal bitiş) |
| `kaza` | Kırık tekerlek | Wheel Rush |
| `kasa` | Taşan sandık | Coin Drop — kazanırken doldurup kaybederken taşırıyorsun, ikisinde de doğru |
| `tamam` | Defne + onay | 2048, 2048'e ulaşınca |
| `seviye` | Yukarı ok | Flow Connect |
| `bonus` | Mor taş | Yedek, kullanılmıyor |

**Rekor ayrıcalıklı:** ikonun arkasından altın bir ışık açılıyor
(`.ik-rekor::before`). Yalnızca rekorda — her bitişte parlasaydı
rekorun anlamı kalmazdı.

## Bağlantı

`showOverlay(baslik, metin, dugme, islem, ikon = 'bitti')`. Dokuz oyunda
dokuz ayrı kopyası var ve hepsi aynı; imzaya eklenen beşinci parametre
`overlayIkon.className`'i kuruyor. Varsayılanı `'bitti'` — çağıran taraf
bir şey söylemezse perde yine açılıyor, sadece nötr ikonla.

Dosyalar oyunların klasörlerinin **dışında**: dokuz oyun aynı sekiz
görseli paylaşıyor, tarayıcı bir kez indiriyor. Toplam 100 KB, 192px.

Üretim: tek kolaj, 13 CU, 10 Ekim 2026. `assets/icons/sandik-acik.webp`
referans verildi.
