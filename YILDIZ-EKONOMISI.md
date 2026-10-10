# Yıldız ekonomisi raporu

> **10 Ekim 2026 — UYGULANDI.** Yıldız sandığı ızgaradan kaldırıldı.
> Aşağıdaki teşhis olduğu gibi duruyor; sonunda ne yapıldığı var.


Ejderha Adası · 10 Ekim 2026 · kaynak: `games/dragon/ekonomi.js`,
`gorevler.js`, `siparis.js`, `dragon.js`

Bütün sayılar koddan okundu ve hesaplandı, tahmin yok. Beklenen değerler
her bandın orta noktası × olasılığı toplanarak bulundu. Birleştirme
kuralı **iki tanesi bir üst kademe** (`grid.js` → `birlesebilir` +
`lv + 1`).

---

## 1. Sandıkların değeri

| Kademe | Aralık | Beklenen | Süre | Atlama | Bekleme verimi |
|---|---|---|---|---|---|
| 1 · kese | 7–12 ★ | **8,8 ★** | 10 dk | 2 ★ | 0,89 ★/dk |
| 2 · sepet | 30–100 ★ | **51,4 ★** | 30 dk | 5 ★ | 1,71 ★/dk |
| 3 · sandık | 250–500 ★ | **384,5 ★** | 60 dk | 9 ★ | 6,41 ★/dk |
| 4 · usta sandığı | 1.200–2.500 ★ | **1.790,3 ★** | 90 dk | 13 ★ | 19,89 ★/dk |

Kademeler arası değer sıçraması 5,8× → 7,5× → 4,7×. Bekleme verimi ise
0,89'dan 19,89'a çıkıyor — yani üst kademe sandık hem daha çok veriyor
hem **dakika başına 22 kat** daha hızlı veriyor.

---

## 2. En büyük sorun: atlama bir gider değil, bir gelir

`atlamaFiyati()` kalan her 7 dakika için 1 yıldız alıyor. Kodda şöyle
yazıyor:

> *"Bu, oyunun ilk SINIRSIZ yildiz harcama kalemi"*

Yem sandıkları için doğru: yıldız ödüyorsun, yem alıyorsun — temiz bir
gider. **Ama yıldız sandığında ödediğin de aldığın da aynı para.**

| Kademe | Ödüyorsun | Alıyorsun | Net | Katsayı |
|---|---|---|---|---|
| kese | 2 ★ | 8,8 ★ | **+6,8 ★** | ×4,4 |
| sepet | 5 ★ | 51,4 ★ | **+46,4 ★** | ×10,3 |
| sandık | 9 ★ | 384,5 ★ | **+375,5 ★** | ×42,7 |
| usta sandığı | 13 ★ | 1.790,3 ★ | **+1.777,3 ★** | ×137,7 |

Bir usta sandığını 13 yıldız ödeyip anında açıyorsun ve 1.790 yıldız
alıyorsun. Sınırlayıcı olan yıldız değil, elindeki sandık sayısı —
yıldız hiçbir zaman bitmiyor.

**Sebep:** atlama fiyatı yalnızca SÜREYE bakıyor, sandığın içindekine
bakmıyor. 90 dakikalık bir sandık, içinde 12 yıldız da olsa 2.500 yıldız
da olsa 13 yıldıza açılıyor.

---

## 3. İkinci sorun: açmak hiçbir zaman doğru hamle değil

İki tanesi birleşip bir üst kademe oluyor:

| Hamle | Açarsan | Birleştirirsen | Fark |
|---|---|---|---|
| 2 × kese | 17,7 ★ | 51,4 ★ | **×2,90** |
| 2 × sepet | 102,8 ★ | 384,5 ★ | **×3,74** |
| 2 × sandık | 769,0 ★ | 1.790,3 ★ | **×2,33** |
| 8 × kese → usta | 70,8 ★ | 1.790,3 ★ | **×25,3** |

Yani Lv1–Lv3 bir yıldız sandığını açmanın **hiçbir koşulda** mantığı
yok. "Şimdi mi açsam, birleştirsem mi?" diye bir karar yok; tek doğru
cevap var ve oyun bunu söylemiyor. Yeni oyuncu keseleri açarak
başlıyor ve farkında olmadan değerinin yirmi beşte birini alıyor.

---

## 4. Üçüncü sorun: kilitler yıldız yemiyor, yıldız üretiyor

| Kalem | Tutar |
|---|---|
| Kilitli hücreler (7 adet) | 710 ★ |
| Genişleme kilitleri (9 adet) | 2.760 ★ |
| **Toplam ödenen** | **3.470 ★** |
| Kilitlerden çıkan 3 × Lv4 yıldız sandığı | **5.371 ★** |
| **NET** | **+1.901 ★** |

Tahtanın tamamını açmak yıldız harcamıyor, **yıldız kazandırıyor.**
Üç kilit (hücre 15, genişleme 3, genişleme 0) Lv4 yıldız sandığı
veriyor; her biri ~1.790 ★, üçü birden bütün kilit merdiveninin
fiyatını aşıyor.

---

## 5. İlk ay dengesi

| | |
|---|---|
| **Gelir** · kilitlerden 3 × Lv4 sandık | 5.371 ★ |
| · görevler (acemi 3 + orta 21 + pro 487) | 511 ★ |
| · partner görevleri | 1.842 ★ |
| · günlük ödül (4 hafta × 13) | 51 ★ |
| **Toplam** | **7.775 ★** |
| | |
| **Gider** · 16 kilit | 3.470 ★ |
| · ilk 6 yuva | 3.500 ★ |
| **Toplam** | **6.970 ★** |
| | |
| **NET** | **+805 ★** |

Bu hesap **tüccar siparişlerini ve atlama kârını hiç saymıyor.** İkisi
de eklenince ilk ay rahatça birkaç bin yıldız fazla veriyor.

Günlük ödülün haftada 13 yıldız vermesi bu tabloda görünmez hale
geliyor — tek bir Lv4 sandık 138 haftalık günlük ödüle bedel.

---

## 6. Gerçekten sınırsız olan tek gider: yuvalar

`YUVA_FIYATLARI` altıdan sonra her adımda 2,2 katına çıkıyor:

| Yuva | Fiyat |
|---|---|
| 2.–6. | 50 · 150 · 400 · 900 · 2.000 ★ |
| 7. | 4.400 ★ |
| 8. | 9.700 ★ |
| 9. | 21.300 ★ |
| 10. | 46.900 ★ |

Uzun vadede yıldızı emen tek şey bu. Oyunun geri kalanı — kilitler,
sandıklar, atlama — net olarak yıldız üretiyor.

---

## Öneriler

Üçü de tek satırlık değişiklikler, hiçbiri yeni mekanik gerektirmiyor.

### a) Atlama fiyatı sandığın değerine bağlansın

Şu an yalnızca süreye bakıyor. Yıldız sandığı için beklenen içeriğin
bir oranı olsa (örneğin **%35**) karar gerçek bir karar olur:

| Kademe | Şimdi | %35 olsa | Kalan kâr |
|---|---|---|---|
| kese | 2 ★ | 4 ★ | +5 ★ |
| sepet | 5 ★ | 18 ★ | +33 ★ |
| sandık | 9 ★ | 135 ★ | +249 ★ |
| usta | 13 ★ | 627 ★ | +1.163 ★ |

Hâlâ kârlı — ama artık "atlasam mı, beklesem mi" diye düşünülüyor.
Yem sandıklarında mevcut süre tabanlı fiyat kalabilir; orası zaten
doğru çalışıyor.

### b) Kilit ödülleri Lv4 yerine Lv3 olsun

3 × 384,5 = **1.153 ★**. Kilit merdiveni 3.470 ★ gideri karşısında
**−2.317 ★** net olur; yani tahtayı açmak gerçekten bir yatırım
hâline gelir. Şu anki hâli +1.901 ★ kâr.

### c) Alt kademeyi açmak tamamen anlamsız olmasın

×25,3 fark kapanmayacak kadar büyük — birleştirme oyununda normal.
Ama oyuncuya söylenmeli: kap panelinde "birleştirirsen ~X ★" diye
bir satır, açma düğmesinin yanında. Üretim gerekmiyor, tek satır
arayüz.

---

## Hesaplamanın varsayımları

- Beklenen değer = Σ (bandın orta noktası × olasılık). `sandikDegeri()`
  bandı seçip içinde düzgün dağılımla rastgele sayı veriyor, yani orta
  nokta doğru tahmin.
- Birleştirme 2→1 (`grid.js:501`).
- Tüccar siparişleri hesaba katılmadı: `siparis.js` her üçüncü siparişe
  `max(1, min(3, ceil(lv/2)))` yıldız koyuyor, yani 1–3 ★ — tablodaki
  sayıların yanında ihmal edilebilir ama hep artı yönde.
- Partner görevleri bir kez alınabiliyor kabul edildi.


---

# Ne yapıldı

**Yıldız kabı ızgaradan kaldırıldı** (sürüm 2.11). Üç kırığın da kökü
aynıydı — *ödediğin parayla aldığın para aynı* — ve kaynağı kapatmak
üçünü birden kapattı.

Yıldız hâlâ ödül, ama artık **doğrudan veriliyor**: ızgarada bekleyen,
sayacı işleyen, birleştirilen bir nesne değil. Miktarlar eski
kademelerin beklenen değerinden geliyor, yuvarlanmış haliyle:

| Eski kap | Yeni ödül |
|---|---|
| Lv1 kese (8,8 ★) | **10 ★** |
| Lv2 sepet (51,4 ★) | **50 ★** |
| Lv3 sandık (384,5 ★) | **400 ★** |
| Lv4 usta sandığı (1.790,3 ★) | **1.800 ★** |

Rastgelelik kalktığı için yuvarlak sayı daha dürüst: oyuncuya "10
yıldız" demek "8 ile 12 arası bir şey" demekten iyi.

Değişen yerler: üç kilit ödülü (`KILITLI_HUCRELER[15]`,
`GENISLEME_KILITLERI[3]` ve `[0]`), günlük ödülün 7. günü, beş görev
(`o2`, `p2`, `p5`, `p7`, partner) ve partner büyük ödülü.

## Mevcut oyunculara dokunulmadı

Izgarasında yıldız kabı olan bir kayıt yüklendiğinde **kap yerinde
duruyor ve eskisi gibi çalışıyor** — birleşiyor, sayacı işliyor,
açılıyor. Aynı şekilde mevcut kayıtlardaki kilitler de eski ödüllerini
koruyor: o kilitler kayıtta saklı, yeni tablo yalnızca yeni ızgaralara
uygulanıyor.

Kazanılmış bir şey geri alınmaz. Sayıları da sınırlı ve artmıyor, yani
ekonomiye etkisi kendiliğinden tükeniyor.

## Yol boyunca çıkan iki hata

**Kilit ödülü her kayıt turunda siliniyordu.** `model.js` →
`hucreDuzelt` kilit ödülünü yalnızca nesne şekliyle tanıyordu
(`{t, lv}`); `{stars: 1800}` sessizce `{t:'egg', lv:1}`'e dönüyordu.
Yani üç kilidin ödülü ilk yeniden yüklemede kayboluyordu. Kayıt-yükleme
turu testle doğrulandı.

**Kilidin arkasındaki görsel bozuktu.** `gorselYolu` `{stars}` şeklini
tanımayınca `meat-undefined-192.webp` üretiyordu ve kilidin arkası
bomboş çıkıyordu. Yıldız simgesine bağlandı.

İkincisi bir de önbellek dersi verdi: `grid.js`'i düzelttim ama sürüm
numarasını artırmadım, tarayıcı eski kopyayı sunmaya devam etti ve 404
sürüyor sandım. Görsel değişikliklerde yeni dosya adı, **kod
değişikliklerinde yeni sürüm numarası** şart.

## Hâlâ açık

Raporun (b) önerisi uygulanmadı: kilit merdiveni **hâlâ net yıldız
üretiyor**. Üç kilit 1.800 ★ veriyor (toplam 5.400), merdivenin tamamı
3.470 ★ tutuyor — net **+1.930 ★**. Sandık kalktığı için artık
birleştirilip katlanamıyor, ama tahtayı açmak yine de kâr.

Düşürülmek istenirse ödülü 1.800 yerine **400** yapmak yeterli:
3 × 400 = 1.200 ★, merdiven **−2.270 ★** net olur.
