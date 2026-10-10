# Hizalanmış katmanlar

39 dosya, hepsi **1024×1024**, toplam 768 KB. `hizala.py` üretiyor.

Her parça **kendi son konumuna** çizilmiş; gerisi saydam. Birleştirmek
için hiçbir hesap gerekmiyor — sırayla üst üste bindirmek yeterli:

```
kanat → kuyruk → base → taç → yüz → kolye
```

Kanat ve kuyruk gövdenin **arkasında**, çünkü ikisi de arkadan çıkıyor
ve köklerinin gövde tarafından örtülmesi gerekiyor. Taç, yüz işareti ve
kolye önde.

## Neden böyle

Ham parçalar (`../*.png`) birbirinden habersiz üretilmişti: her biri
kendi karesinde, kendi ölçeğinde ortalanmış. `crown-bronze` tuvalinin
%42'sini kaplıyor, `crown-celestial` %84'ünü — ikisi de 512 piksellik
dosya. Ortak çapa noktası olmadığı için aynı yere aynı ölçekle konunca
biri minicik, biri devasa çıkıyordu.

Çözüm, konumu **dosyaya gömmek**. Sektörün üretken koleksiyonlarda
yaptığı da bu: her parça ortak tuvalde, son konumunda çizilir, istemci
sadece yığar.

DMD'de yavaş bağlantıda görülen "kel ördek" bunun kanıtı — eksik katman
*yanlış yerde* değil, hiç yok. Gelen her katman doğru yerde, çünkü
konum dosyanın içinde.

## Maliyet

Tam tuvale yazmak parça başına yalnızca **~2 KB** ekliyor; WebP boş
saydam alanı sıkıştırıp yok ediyor. En küçük dosya 7 KB, en büyük
58 KB, ortalama 17 KB.

## Yeni parça eklemek

1. Ham PNG'yi `_kaynak/` içine `slot-ad.png` olarak koy.
2. `python3 hizala.py --onizle` çalıştır.
3. `onizleme/slot.png`'ye bak; kaymışsa `hizala.py` → `OZEL` tablosuna
   bir satır ekle (`s` ölçek, `x`/`y` konum).
4. Tekrar çalıştır.

Oyun kodunda hiçbir şey değişmez.

## Bilinen kusurlar

- `tail-crystal` yatay duruyor, gövdeden dışarı fırlıyor — parçanın
  kendi çizimi öyle, öteleme ve ölçekle düzelmiyor.
- Bazı geniş kanatlar (`phoenix`, `king`) gövdenin kenarına biniyor.
- Yüz işaretlerinin hepsi alında; `demon` boynuzları için daha yukarısı
  gerekebilir.

Bunlar kalibrasyonla değil, parçanın yeniden çizilmesiyle düzelir —
maskeli üretim yolu için aday listesi (bkz. `PARCA-HIZALAMA.md`).
