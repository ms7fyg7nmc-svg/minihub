# Görsel envanteri

## Kural

Her klasörde **yalnızca kullanılan dosyalar** durur. Üretilip seçilmeyen
ya da ileride kullanmak üzere saklanan her şey, o klasörün altındaki
`_alternatifler/` içine girer.

```
assets/wheel/stone.webp                  <- canlı, CSS buna bakıyor
assets/wheel/_alternatifler/rune.webp    <- envanterde, bekliyor
```

Alt çizgi bilerek, ve sandığımdan daha işlevli: **GitHub Pages alt
çizgiyle başlayan klasörleri yayınlamıyor** (varsayılan Jekyll davranışı,
depoda `.nojekyll` yok). Yani `_alternatifler/` ve `_kaynak/` içindekiler
git'te duruyor ama siteye hiç çıkmıyor — oyuncunun telefonuna inmiyor,
bant genişliği yemiyor.

**Bunun bir tuzağı var:** `_alternatifler/` içindeki bir dosyaya CSS'ten
ya da koddan referans verirsen yerelde çalışır, canlıda **404** döner.
Bir alternatifi kullanmaya karar verirsen onu önce klasörün dışına
TAŞI, sonra referans ver.

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
| `ui/` | Arayüz ikonları — ayarlar, cüzdan, butonlar | Üç ikon işlemi (`-1`, `-2`, `-4`) |
| `frames/`, `icons/`, `bg/`, `board/` | Oyun içi arayüz parçaları | — |
| `_sosyal/` | Sosyal medya görselleri (siteye çıkmaz) | — |

## Karakterler

Tekrar üretilmesi gerekebilecek karakterlerin **künyesi** kendi
klasörlerinde yazılı olur: tarif, kare düzeni, üretim notu. Şu an tek
örnek `tutorial/README.md` (büyücü dede). Yeni bir karakter eklenirse
aynısı yazılmalı — yazılı tarif olmadan aynı karakter geri gelmiyor.

## Yayınlanan boyut

`_` ile başlamayan her şey siteye çıkıyor. Şu an `tutorial/` içindeki üç
`.png` ustası (toplam 1,1 MB) kodda hiç kullanılmadığı hâlde yayınlanıyor.
İstenirse `tutorial/_kaynak/` altına taşımak yeterli — git'te kalır,
siteden düşer.

## Sürümleme

Görseller `?v` etiketi **almıyor** (bkz. `surum-damgala.mjs`). Bir
görseli değiştirmek istiyorsan **yeni bir dosya adı** ya da yeni bir
klasör kullan, yoksa oyuncunun telefonunda eski hali asılı kalır.

## `_kaynak/` — yayinlanmayan orijinaller

Her gorselin WebP surumu uretildikten sonra ORIJINAL PNG'si duruyor ama
artik `_kaynak/` altinda. Sebep: alt cizgiyle baslayan klasorleri GitHub
Pages yayinlamiyor (bkz. yukarisi), yani dosyalar git'te kaliyor ama
siteye cikmiyor.

Tasinmadan once 3,7 MB'lik 16 PNG yayinlanan klasorlerde duruyordu.
Hicbiri koddan cagrilmiyordu - yani oyuncunun telefonuna inmiyorlardi -
ama depoyu ve her klonu sisiriyorlardi.

Silinmiyorlar: WebP'den geri donmek gerekirse kaynak bunlar.

Kontrol: bir PNG'yi yayinlanan bir klasorde tutmak icin kodda adinin
gectiginden emin ol. `assets/coin.png` ornegin GERCEKTEN kullaniliyor,
bu yuzden yerinde duruyor.
