# Büyücü dede — karakter künyesi

Ejderha Adası'nın tutorial karakteri. Yeni oyuncuya yumurta çıkarmayı,
birleştirmeyi ve yumurtayı açmayı o anlatıyor
(bkz. `games/dragon/tutorial.js`).

## Envanterdeki pozlar

| Poz | Dosya | Ne yapıyor | Nerede |
|---|---|---|---|
| `greet` | `wizard-greet-{256,384}.webp` | El sallıyor, karşılama | Tutorial'ın ilk adımı |
| `teach` | `wizard-teach-{256,384}.webp` | Açık kitabı iki eliyle tutuyor, anlatıyor | Anlatım adımları |
| `cheer` | `wizard-cheer-{256,384}.webp` | Başparmak yukarı, gözleri kapalı, gülüyor | Oyuncu bir adımı başarınca |

Her poz iki boyda: **384** ekranda kullanılan, **256** küçük yerler için.
`.png` dosyaları üretim ustaları — kodda kullanılmıyor, yedek olarak duruyor.

## Karakterin künyesi

Yeni poz üretilecekse karakterin bu tarifle eşleşmesi gerekiyor, yoksa
aynı kişi gibi durmaz:

- Yaşlı, tombul, kısa boylu bir büyücü. Sıcak ve babacan, görkemli değil.
- **Saç ve sakal:** bembeyaz, gür, uzun dolgun sakal, kalın beyaz kaşlar.
- **Yüz:** yuvarlak kırmızı burun, pembe yanaklar, gülen kıvrık gözler.
- **Cüppe:** derin bordo/kiremit kırmızısı, altın şeritli yakalar ve
  etek ucu, ortada yuvarlak tokalı altın kemer.
- **Kitap:** kahverengi deri cilt, kapağında **altın MH ejderha amblemi**
  (hub'ın logosu — markayı taşıyan detay, kaldırma).
- **Ayakkabı:** koyu kahverengi çizme.
- **Tarz:** stilize 3B mobil oyun render'ı, yumuşak ışık, kalın hatlar,
  belirgin hacim. Gerçekçi değil, çizgi film değil — arası.
- **Şapka YOK.** Klasik sivri büyücü şapkası bilerek kullanılmadı.

## Kare düzeni

384×384 saydam tuval. Karakter **yatayda ortalı**, **dikeyde tabana
yaslı**: dolu alan x 66–317, y 12–370. Yeni pozlar aynı düzende
üretilmeli, yoksa tutorial'da poz değişince karakter zıplar.

## Yeni poz üretirken

1. Yukarıdaki künyeyi prompt'a olduğu gibi koy.
2. Mevcut bir pozu Scenario'ya **referans görsel** olarak ver — tarif tek
   başına aynı yüzü vermiyor.
3. Saydam zeminde değil, düz koyu zeminde üret; kesimi sonra yap.
4. 384 ve 256 olarak dışa aktar, `wizard-<poz>-<boy>.webp` adıyla kaydet.
5. `games/dragon/tutorial.js` içindeki `POZ` nesnesine ekle — oradaki
   `pozListesi()` tutorial açılmadan görselleri ön yüklüyor.

## Akılda tutulacak

Karakter şu an yalnızca Ejderha Adası'nda. Hub'ın kendi tanıtımında ya da
başka bir oyunun tutorial'ında da kullanılabilir; dosyalar oyuna değil
`assets/` altına konuldu tam da bu yüzden.
