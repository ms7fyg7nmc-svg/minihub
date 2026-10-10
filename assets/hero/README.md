# Hub afişleri

Hub'ın tepesindeki başlığın arkasındaki afiş. Üç tasarım var, her
açılışta biri geliyor (`index.html` içindeki kısa betik `<html
data-afis>` ile söylüyor, `css/style.css` → `.hero` onu okuyor).
Aynı afiş üst üste iki kez gelmiyor.

| Dosya | Ne |
|---|---|
| `ejderha.webp` | Kor ışığında bir kayanın üstünde ince, uzun boyunlu kırmızı ejderha |
| `hazine.webp` | Yarasa amblemli, taşan hazine sandığı |
| `yumurta.webp` | Çatlaklarından altın ışık sızan yumurtalar |

1280×279, ~13–26 KB.

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
