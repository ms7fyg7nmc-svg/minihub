# Hub afişleri

Hub'ın tepesindeki başlığın arkasındaki afiş. Üç tasarım var, her
açılışta biri geliyor (`index.html` içindeki kısa betik `<html
data-afis>` ile söylüyor, `css/style.css` → `.hero` onu okuyor).
Aynı afiş üst üste iki kez gelmiyor.

| Dosya | Ne |
|---|---|
| `ejderha-v2.webp` | Kor ışığında bir kayanın üstünde ince, uzun boyunlu kırmızı ejderha |
| `hazine-v3.webp` | Yarasa amblemli, taşan hazine sandığı |
| `yumurta-v2.webp` | Çatlaklarından altın ışık sızan yumurtalar |

1280×279, ~17–24 KB.

## Sandık küçültüldü (16 Ekim 2026)

Afiş 1280×279, yani **4,59:1**. Telefonda kutu 343×108 oluyor — **3,18:1**.
`cover` yüksekliği tutturmak için görseli büyütüyor ve **genişlikten**
kesiyor; sandık görselin sağ ucunda ve kocaman olduğu için tam o kesilen
yere denk geliyordu: kapağının sağı ve altındaki para yığını çerçevenin
dışında kalıyordu.

`hazine-v3.webp`'te sandık ham dosyadan **%55'e** küçültülüp sağ kenardan
**55 px** içeri alındı. Boşalan yer ham dosyanın kendi koyu sol şeridinden
gerildi, iki katman solda 170 px / sağda 22 px'lik yumuşak bir geçişle
birleştirildi — dikiş yok. Artık sandığın dört yanında da pay var ve
telefonda bütün görünüyor. **Yine 0 CU.**

Eski kadraj: `_alternatifler/hazine-v2.webp`.

Not: aynı sıkışma ejderha ve yumurtada yok, onlar v2 kadrajında kaldı.

## Yeniden kadrajlama (15 Ekim 2026)

İlk kırpmalar konunun **üstünü** kesiyordu: ejderhanın kafası afişin
dışında kalıyordu, sandığın yarasa amblemi ve yumurtaların tepesi de
yarımdı. Üçü de `_kaynak/` içindeki 1536×512 ham dosyalardan yeniden
kesildi — **görsel yeniden üretilmedi, 0 CU.**

Ham dosyada konunun kapladığı dikey alan:

| | konu | tam genişlikten kesilebilen pencere |
|---|---|---|
| ejderha | y 13–511 (487 px) | 335 px |
| hazine | y 21–506 (485 px) | 335 px |
| yumurta | y 22–476 (454 px) | 335 px |

Hiçbiri sığmıyor. Hazine ve yumurtada pencere **üstten** alındı: konunun
tepesi görünüyor, altındaki sikke yığını ve yuva çerçevenin dışına
taşıyor — afişte bu doğal durur. Ejderhada aynısı bacakları ortadan
kesiyordu, o yüzden görsel küçültülüp **sağa yaslandı**; sol boşluk en
sol şeridin yatayda gerilmesiyle dolduruldu (orası zaten düz koyu bir
geçiş, dikiş görünmüyor).

Görüntülenirken `cover` + `right center` uygulanıyor ve afişin solundaki
%17 zaten hiç görünmüyor — sol boşluk bedava.

Eski kırpmalar `_alternatifler/` altında (`ejderha.webp`, `hazine.webp`,
`yumurta.webp`).

## Neden değiştirildi (10 Ekim 2026)

Önceki üçü soyut **mor/uzay** desenleriydi — bulutsu, takımyıldız, cam
kartlar. Güzeldiler ama oyunun dünyasıyla hiçbir bağları yoktu: ne
ejderha, ne hazine, ne yumurta. Hub'ın en çok görülen yeri, her
açılışta ilk bakılan şey.

Eski set `_alternatifler/` altında (`mor-*`), dördüncü eski tasarım da
orada (`ufuk`).

## Kurallar — yeni bir afiş yapılacaksa

**Süslemenin tamamı SAĞDA**, sola doğru sönerek. Başlık ve alt satır
solda duruyor; sol üçte iki neredeyse boş ve koyu olmalı. Prompt'ta bu
açıkça yazılı, yoksa model kadrajı ortalıyor ve yazı desenin üstüne
biniyor.

**Afiş koyu olmalı.** Yazı iki temada da açık renk; afis gündüz
temasında da koyu kalıyor.

**Afişte tek bir harf yok.** Yazı DOM'da duruyor ve dört dile
çevriliyor; afise gömülen bir başlık çeviriyi öldürürdü.

**Mor değil.** `.hero`nun zemini ve soldaki perdesi `#0e0b18`'di
(mor-siyah) ve kor tonundaki afişlerin üstüne soğuk bir tül atıyordu;
`#140d0a` / `rgba(20,13,10,…)` oldu. Başlığın renk geçişi de mordan
altına giderken artık kremden altına, oradan sıcak kırmızıya gidiyor.

## Üretim

Üçü ayrı ayrı üretildi — 4,6:1 oranında kolaj yapılamıyor, her biri tam
bir kompozisyon. **GPT Image 2.5 Flare**, 1536×336 istendi, model
1536×512 döndürdü ve içerik ağırlık merkezine göre kırpıldı (betik
mantığı: sağ üçte birin satır parlaklığından ağırlık merkezi).

`assets/_sosyal/davet-arkadas.webp` referans verildi — sosyal setle aynı
dünyada dursunlar diye. **4 × 11 = 44 CU** (ejderha iki kez: ilki tombul
çıktı, ham hali `_alternatifler/ejderha-tombul-ham.webp`).

Ham çıktılar `_kaynak/`.
