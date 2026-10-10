# Sezon çerçeveleri — HENÜZ KULLANILMIYOR

Altı dönemsel çerçeve: `sezon-kis`, `sezon-ilkbahar`, `sezon-yaz`,
`sezon-sonbahar`, `sezon-yilbasi`, `sezon-yildonumu`. 512 piksel
genişlik, ortaları gerçekten şeffaf.

Üretim: tek kolaj, 13 CU, 10 Ekim 2026. `pirinc.webp` referans verildi,
o yüzden mevcut dört çerçeveyle aynı ağırlıkta duruyorlar.

## Dikkat: hepsi 9-slice'a uygun değil

Mevcut çerçeveler CSS `border-image` ile kullanılıyor; yani kenarların
ORTASI gerilip uzatılıyor, sadece köşeler sabit kalıyor. Süsü köşede
olan çerçeve bunu kaldırır, süsü kenar ortasında olan kalkmaz:

| Çerçeve | Süs nerede | 9-slice |
|---|---|---|
| `sezon-sonbahar` | yaprak ve palamut köşelerde | ✅ sorunsuz |
| `sezon-yilbasi` | havai fişek köşelerde | ✅ (kenardaki yıldızlar hafif uzar) |
| `sezon-ilkbahar` | asma kenarlarda, çiçek köşelerde | ⚠️ sınırda |
| `sezon-kis` | buz sarkıtları üst kenar boyunca | ❌ gerilince ezilir |
| `sezon-yaz` | güneş üst kenarın ORTASINDA | ❌ gerilince ezilir |
| `sezon-yildonumu` | defne üstte, kurdele altta ORTADA | ❌ gerilince ezilir |

Yani bunlar **sabit ölçülü dekoratif çerçeve** olarak kullanılmalı —
kare bir avatarın, rozetin ya da ödül kartının etrafında, kendi
oranlarında. Oyun tahtası kenarlığı olarak yalnızca ilk ikisi uygun.

Ölçülen kenar kalınlıkları (`border-image-slice` için):

| Çerçeve | slice |
|---|---|
| `sezon-sonbahar` | %11,8 |
| `sezon-yilbasi` | %10,0 |
| `sezon-yaz` | %11,5 |
| `sezon-yildonumu` | %12,9 |
| `sezon-kis` | %14,5 |
| `sezon-ilkbahar` | %14,9 |

Kıyas: `pirinc` %6,2 · `duz` %8,7 · `celik` %9,3 · `vinil` %11,2.
