# Hub oyun kareleri

`js/hub.js` icindeki `foto:` alanindan cagriliyorlar; `.tile-icon.is-foto`
gradyani ve SVG ikonu kapatip bu gorseli koyuyor. Ekranda **46 piksel**
(dar ekranda 42) goruluyorlar.

## Kural: oyunun KENDI parcalarini goster

Ilk tur (`_kaynak/v1-2026-10/`) turun klisesinden uretildi ve yanlis
oldu: blok bulmacaya yapboz parcasi, ucluye bos turuncu dikdortgen,
coin drop'a para istifi cizilmisti. Hicbiri oyundaki seye benzemiyordu.

Ikinci tur once oyunlar ACILIP bakilarak yazildi:

| Oyun | Gercekte ne var |
|---|---|
| 2048 | Krem kiremit, koyu kahve rakam |
| Blok Bulmaca | Mor/sari/pembe kalin bloklar, 8x8 izgara |
| Seker Eslestir | Elma, kiraz, limon, uzum renkli karelerde |
| Uclu Eslestir | Ust uste binmis meyveli kiremitler |
| Baglan | Beyaz merkezli renkli noktalar, koyu izgara |
| Coin Drop | Numarali bronz paralar, birlesiyorlar |

Yilan ilk turdan KALDI: o ikon zaten dogruydu ve ikinci kolajda model
yedi yerine alti panel uretti. Tek kare icin 13 CU vermeye degmedi.

## Kirpma: panelin KENDI icerigine gore ortala

Model paneli istenen yukseklikte degil, sanati ortada bir banda koyarak
donderebiliyor; ustelik band her panelde ayni yerde degil. Kareyi
goruntunun dikey ortasindan kirpmak icerigi kaydiriyor - ilk turda alti
panelin ALTISI birden 4 ile 69 piksel arasinda yukari kaymisti ve
"match candy yukari tasmis" sikayeti buydu.

Dogrusu: her panelin kenar enerjisinden (bulanik gri + fark) icerik
sinirini bul, kareyi O merkeze gore kirp. Esik `max * 0.25`; daha
dusuk esik gradyanin kendi gurultusunu icerik saniyor.

## Uretim

Tek sayfada alti-yedi kare, GPT Image 2.5 Flare, 3584x512 istendi.
**Model 3584x1200 donduruyor** ve sanati ortada bir banda koyuyor;
panel genisligi kadar kare o bandin icinden kirpiliyor. Arka plan
`opaque` - kareler tam dolu, kose yuvarlamayi CSS yapiyor.

Her kare oyunun hub'daki mevcut renk kimligini koruyor (bkz. hub.js
`gradient`), yoksa izgaranin karakteri degisiyor.

## tripletile-v2.webp (10 Ekim 2026) — kodla çizildi

Üçlü Eşleştir'in taşları 9 Ekim'de emojiden gerçek çizimlere geçti
(`assets/tripletile/`). Eski hub karesi başka bir elden çıkma üç limon
gösteriyordu; yani bu klasörün kuralını — **kare oyunun KENDİ
parçalarını gösterir** — artık çiğniyordu.

Yenisi üretilmedi, **kodla çizildi** (`_kaynak/tripletile-kodla/ciz.py`,
0 CU): oyunun kendi `lemon.webp` dosyası, oyunun kendi karo rengi
(`#f5b942`), `tripletile.css`'teki köşe yarıçapıyla. Taşlar değişirse
betik tekrar çalıştırılır.

Üç karar not olarak kalsın:

- **Üç farklı taş** (oyunun ilk üç türü). Önce üçü de limon yapıldı —
  "aynı şeyden üç tane topla" mekaniğini tek bakışta anlatsın diye.
  Fikir doğruydu, **46 pikselde çöktü**: hub ızgarasındaki gerçek ölçü
  bu ve orada aynı renkten üç karo tek bir sarı lekeye dönüşüyor. Eski
  limon karesi de yıllardır aynı dertten muzdaripti, kimse fark
  etmemişti. Yan komşu Match Candy'nin okunmasının sebebi tam tersi:
  dört ayrı renk.
- **Match Candy'den ayrışma renkle değil dizilimle.** O düz bir 2×2
  ızgara; bu, üstüste binen eğik bir yığın — oyunun rafına giden taş
  yığını. İkisi yan yana duruyor, aynı görünemezler.
- **Zemin teal.** Dört zemin (amber / teal / bordo / lacivert) 72
  pikselde kıyaslandı. Amber, karolarla aynı renk ailesinde olduğu için
  taşlar zemine yapışıyordu.
- **Ölçü ve eğim 46 pikselde seçildi, 256'da değil.** Büyük eğim (8–9
  derece) büyükte hoş duruyor, küçükte karo kenarlarını bulanıklaştırıp
  yığını tek kütleye çeviriyor.

Dosya adında `-v2` var: görseller sürüm damgası almıyor, eski isimle
üzerine yazmak mevcut oyunculara önbellekten eskisini gösterirdi.

### PIL tuzağı

`ImageDraw.Draw(im, 'RGBA')` RGBA bir görüntüde yarı saydam dolguyu
**karıştırmıyor, üzerine yazıyor**. `(255,255,255,26)` ile çizilen bir
vurgu, karonun rengini silip neredeyse şeffaf bir delik bırakıyor —
yani aydınlatması gereken şey karartıyor. Doğrusu: ayrı katmana çizip
`alpha_composite` ile bindirmek (`ciz.py` içindeki `kat()`).
