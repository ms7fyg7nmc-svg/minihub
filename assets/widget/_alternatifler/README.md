# Liderlik widget'ı — alternatif temalar

10 Ekim 2026, tek kolaj, **13 CU**. Mevcut `lider.webp` (kupa + podyum)
referans verildi, o yüzden sekizi de aynı altın/koyu widget dilinde.

## Seçilen: defne çelengi

Canlıdaki `assets/widget/lider-v2.webp`. Dört aday hub ızgarasındaki
**gerçek boyutta — 34 piksel** — kıyaslandı:

| Aday | 34px'te |
|---|---|
| **defne** (çelenk + kalkan) | ✅ halka silueti bozulmuyor, en net |
| kupa (eski) | kabul edilir, ama tepesi lapalaşıyor |
| taht | detay kayboluyor, tanımsız bir kütle |
| podyum + ejderha | ejderha tamamen kayboluyor |
| sancak | ince dikey, zayıf |

İkon dosyası 108 piksel ama ekranda 34 piksel çiziliyor. Karar o boyutta
verildi — 108'de hepsi güzel duruyor, soru o değil.

Dosya **yeni isimle** kondu (`lider-v2.webp`): görseller sürüm damgası
almıyor, eski isimle üzerine yazmak mevcut oyunculara önbellekten
kupayı göstermeye devam ederdi. `js/hub.js`'teki açılış perdesinin
ön yükleme listesi de güncellendi — orası eski dosyayı beklemeye devam
etseydi perde görünmeyen bir şeyi bekler, yeni ikon ise geç gelirdi.

## Kullanılmayanlar

`lider-taht`, `lider-podyum`, `lider-sancak` — diğer üç tema.
`lider-kupa-eski` — önceki canlı ikon.

### Madalyalar neden kullanılmadı

Altın, gümüş ve bronz madalya da üretildi (`lider-madalya-*`) ama
**panele konmadı.** Liderlik tablosunun ilk üç sırası zaten CSS ile
çiziliyor (`css/style.css` → `.lider-satir.tepe-1/2/3`) ve o çözüm
daha iyi: madalyanın **içinde sıra numarası** duruyor, her boyuta
ölçekleniyor, gündüz/gece temasına uyuyor ve sıfır bayt yer kaplıyor.
Ürettiğim madalyaların yüzü boş; koymak için numarayı üstlerine ayrıca
yazmak gerekirdi. Geri adım olurdu.

`lider-baslik-susu` (çapraz sancaklar + defne) panel başlığının üstüne
konabilir — şu an kullanılmıyor.
