# Çark çerçeveleri

Scenario ile üretilmiş, ejderha temalı antik rün çerçeveleri. Her dosyanın
**ortası şeffaf** — çark halkanın içinden görünüyor, çerçeve çarkın üstünde
duruyor ve kenarlarını örtüyor.

| Dosya | Tarz | Delik oranı | Durum |
|---|---|---|---|
| `stone.webp` | Taş halka, mor rünler, dört altın mızrak | **0.547** | Hub'ın günlük çarkında kullanılıyor |
| `energy.webp` | Enerji dilimindeki altın pil simgesi | — | Çark diliminde kullanılıyor |
| `pointer.webp` | Kazanan dilimi gösteren ejderha kafası | — | İşaretçi olarak kullanılıyor |
| `_alternatifler/rune.webp` | Dökme altın halka, kazınmış rünler, bronz perçinler | **0.590** | Envanterde bekliyor |

`rune.webp` bilerek duruyor: Ejderha Adası'na ileride bir çark eklenirse
oyunun kendi çarkı o olacak. Hub ile oyun ayrı çerçeve taşısın diye ikisi
birden üretildi. Envanter kuralı için bkz. `assets/README.md`. **Silme.**

## Delik oranı ne demek

Çerçevenin ortasındaki boşluğun çapı, dosyanın genişliğine oranı. Çark bu
orana göre ölçekleniyor, yoksa halkanın altına kayar veya ortada yüzer.
Dosyaların merkezi, DELİĞİN merkezi görüntünün merkezine denk gelecek
şekilde kaydırılarak kaydedildi — yani CSS'te ortalamak yetiyor.

## Çerçeveyi değiştirmek

`css/style.css` → `.wheel-wrap` içinde iki satır:

```css
--cark-cerceve: url("../assets/wheel/stone.webp");
--cark-delik: 0.547;
```

Çarkın çapı, işaretçinin yeri ve göbeğin boyu bu orandan türüyor; başka
hiçbir yeri elle ayarlamak gerekmiyor.

## Yeni bir çerçeve eklerken

1. Ortası tamamen **saydam** olmalı (düz siyah değil — PNG/WebP alfa).
2. Deliğin merkezi görüntünün merkezinde olmalı.
3. Delik oranını ölç ve yukarıdaki tabloya yaz.

## İşaretçi

`pointer.webp`, **4 numaralı çark tasarımının** tepesindeki ejderha
kafasından kesildi — o tasarım seçilmedi ama kafası işe yaradı. Zaten
aşağı bakıyor, yani çevirmeye gerek kalmadı.

Kesim tam temiz değil: kafa halkanın bandının üstünde duruyordu ve bandın
altın kenarı kafayla aynı tonda, otomatik ayırma ikisini ayıramadı. Alt
yanlarda birkaç piksel bant kırıntısı kaldı. Ekranda 26–35px'te
görünmüyorlar, siluete karışıyorlar — büyütülecekse yeniden kesilmeli.
