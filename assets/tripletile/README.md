# Üçlü Eşleştir — taş yüzleri

12 ikon. Oyunda `games/tripletile/tripletile.js` içindeki `KINDS`
tablosundan çağrılıyor; dosya adı tablodaki `img` alanı.

## Neden üretildi

Taşların yüzü önceden **emoji** idi (`🍎🍋🍇…`). İki sorun vardı:

1. **Emoji cihazın yazı tipinden gelir.** Aynı oyun iPhone'da,
   Android'de ve masaüstünde birbirine benzemeyen üç ayrı set
   gösteriyordu. Oyunun görünüşü bizim elimizde değildi.
2. **Okunmuyorlardı.** Üstünde başka taş olan taşlar `brightness(0.45)
   saturate(0.5)` ile karartılıyor; ince detaylı, küçük emoji o
   karartmada kayboluyordu.

Şimdi hepsi tek sayfada, tek elden çıkma: kalın koyu konturlu, iki-üç
tonlu, 30 piksele küçüldüğünde bile silueti okunan ikonlar.

## Üretim

Tek kolaj — **GPT Image 2.5 Flare**, 2048×1536, kalite `high`, şeffaf
arka plan, 4 sütun × 3 satır. **14 CU.** Ham sayfa
`_kaynak/sayfa-4x3-2048.png` olarak duruyor; tek tek üretilseydi on
katına mal olur ve aralarında stil tutmazdı.

Kesim koordinatla değil **alfa sınırıyla** yapıldı: her hücrede
`alpha > 18` olan piksellerin kutusu bulunup nesne oradan kesildi,
sonra hepsi 192×192'ye, en büyük kenarı %89 olacak şekilde
yerleştirildi. Böylece on iki ikon aynı görsel ağırlıkta duruyor.
(Modelin sanatı hücrenin tam ortasına koymadığı daha önce öğrenilmişti;
şeffaf arka planda alfa sınırı bunu kesin olarak çözüyor.)

192 piksel bilinçli: oyundaki karo en büyük ekranda 92 CSS pikseli,
ikon karonun %70'i, cihaz piksel oranı 3 → ~193 piksel. Daha büyüğü
boşuna yer kaplardı. On iki dosya toplam ~124 KB.

## Renkler

Karo rengi `KINDS` tablosunda, ikonun yanında duruyor ve ikonun rengine
yakın seçildi ("kırmızı olan elma"). **Hiçbiri koyu değil** — koyu bir
karo, oyun onu karartınca siyaha düşüyor.

İki yeni öğe bu yüzden tersine gidiyor:

| Öğe | Karo | Neden |
|---|---|---|
| `mh` — $MH sikkesi | indigo `#6c5ce7` | Sikke altın; indigo altının zıttı, karartılmış halde bile seçiliyor |
| `egg` — ejderha yumurtası | terrakota `#c9654f` | Yumurta mavi; sıcak zemin onu öne çıkarıyor |

Üç aday palet 64 pikselde, hem açık hem karartılmış halde kıyaslandı.
Koyu karo (antrasit sikke / lacivert yumurta) denendi ve elendi.

## Sıra

`kindCountFor()` tablonun **ilk N** öğesini kullanıyor, yani baştaki
dörtlü her oyunda görülüyor. O dörtlü birbirinden en uzak renkler
olacak şekilde dizildi: kırmızı, turkuaz, amber, mor. $MH sikkesi
7. seviyede, ejderha yumurtası 10. seviyede devreye giriyor.

## Ekleme / değiştirme

Yeni bir öğe `KINDS`'a eklenir ve buraya aynı adla bir `.webp` konur.
Listeyi yeniden sıralamak güvenli: kayıtlı oyun `kind` sayısını
tutuyor, eşleşme mantığı indekse göre çalışıyor, yalnızca devam eden
bir tahtanın görselleri değişir.
