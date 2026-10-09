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

## Uretim

Tek sayfada alti-yedi kare, GPT Image 2.5 Flare, 3584x512 istendi.
**Model 3584x1200 donduruyor** ve sanati ortada bir banda koyuyor;
panel genisligi kadar kare o bandin icinden kirpiliyor. Arka plan
`opaque` - kareler tam dolu, kose yuvarlamayi CSS yapiyor.

Her kare oyunun hub'daki mevcut renk kimligini koruyor (bkz. hub.js
`gradient`), yoksa izgaranin karakteri degisiyor.
