# Görsel envanteri

## Kural

Her klasörde **yalnızca kullanılan dosyalar** durur. Üretilip seçilmeyen
ya da ileride kullanmak üzere saklanan her şey, o klasörün altındaki
`_alternatifler/` içine girer.

```
assets/wheel/stone.webp                  <- canlı, CSS buna bakıyor
assets/wheel/_alternatifler/rune.webp    <- envanterde, bekliyor
```

Alt çizgi bilerek: klasör listelerinde canlı dosyaların arasına
karışmıyor, en başa düşüyor.

Üretim kaynakları (Scenario'dan çıkan ham kolajlar) `_kaynak/` içine
girer — bkz. `assets/packs/_kaynak/`.

**`_alternatifler/` içindekiler silinmez.** Hepsi CU karşılığı üretildi;
bir tasarım kararı değişirse yeniden üretmek yerine oradan alınır.

## Nerede ne var

| Klasör | İçerik | Envanterde bekleyen |
|---|---|---|
| `wheel/` | Günlük çark çerçevesi ve enerji simgesi | `rune.webp` — Ejderha Adası'na çark eklenirse |
| `dragon-tile/` | Dragon Island karesinin zemini ve logosu | `run`, `catlak`, `girdap` — üç zemin alternatifi |
| `hero/` | Hub başlığının dönen afişleri (üçü de canlı) | `ufuk.webp` — dördüncü tasarım |
| `widget/` | Dört widget çizimi (günlük ödül, liderlik, enerji, davet) | — |
| `tutorial/` | Büyücü dede, üç poz — künyesi klasörün README'sinde | — |
| `currency/` | $MH logosu ve yıldız | Üç para tasarımı + kaynak kolajlar |
| `food/` | Et | Üç yem tasarımı |
| `packs/` | Market paketleri | Kaynak kolajlar |
| `frames/`, `ui/`, `icons/`, `bg/`, `board/` | Oyun içi arayüz parçaları | — |

## Karakterler

Tekrar üretilmesi gerekebilecek karakterlerin **künyesi** kendi
klasörlerinde yazılı olur: tarif, kare düzeni, üretim notu. Şu an tek
örnek `tutorial/README.md` (büyücü dede). Yeni bir karakter eklenirse
aynısı yazılmalı — yazılı tarif olmadan aynı karakter geri gelmiyor.

## Sürümleme

Görseller `?v` etiketi **almıyor** (bkz. `surum-damgala.mjs`). Bir
görseli değiştirmek istiyorsan **yeni bir dosya adı** ya da yeni bir
klasör kullan, yoksa oyuncunun telefonunda eski hali asılı kalır.
