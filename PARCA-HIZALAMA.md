# Parça hizalama sorunu — araştırma ve çözüm

10 Ekim 2026 · `games/dragon/assets/_kaynak` · 1 gövde + 38 parça

---

## Sorun nedir

Eylülde üretilen 38 parça (8 kanat, 8 kuyruk, 8 taç, 8 yüz, 6 kolye)
gövdeye oturtulduğunda düzgün birleşmedi. Sebebini ölçtüm:

| | |
|---|---|
| `crown-bronze` | tuvalinin **%42 × %36**'sını kaplıyor |
| `crown-celestial` | tuvalinin **%74 × %84**'ünü kaplıyor |
| kanatlar | %63 – %84 arası |
| kuyruklar | %60 – %90 arası |
| tuval boyutları | gövde 1024, kolyeler 1024, geri kalanı 512 |

Her parça **kendi karesinde, kendi ölçeğinde ortalanmış.** Ortak bir
çapa noktası yok. Hepsini aynı yere aynı ölçekle koyunca bronz taç
minicik, göksel taç devasa çıkıyor.

Bu bir üretim hatası değil, bir **iş akışı** hatası: parçalar tek tek,
birbirinden habersiz üretildi.

---

## Sektör ne yapıyor

Üretken koleksiyonların (PFP/NFT) standart yöntemi net ve bizim
yaptığımızın tam tersi:

> Her özellik (trait) **ortak boyutlu bir tuvalde**, saydam zeminde,
> **kendi son konumunda** çizilir. Katman sırası sabittir.
> ([Scrappy Squirrels](https://medium.com/scrappy-squirrels/creating-trait-artwork-for-generative-nfts-995fc163a662),
> [Fair.xyz](https://fair.xyz/blog/how-to-create-a-generative-art-nft-collection/))

Yani **hizalama birleştirme anında değil, çizim anında çözülür.**
Parça zaten doğru yerdedir; birleştirme sadece üst üste koymaktır.

Araştırmada "çapa noktası şablonu" diye yerleşik bir standart
bulamadım — çünkü ihtiyaç yok: sanatçı ortak şablona çizdiği için
sorun hiç doğmuyor. Bizde doğmasının sebebi parçaları bir modele tek
tek ürettirmemiz.

---

## DMD bunu nasıl yapıyor

Sahibin gözlemi: *"İnternet kötü olduğunda render'da kel ördeği
görebiliyorum."*

**Bu, sorunun cevabı.** Kel ördek görmek iki şeyi birden kanıtlıyor:

1. **Katmanlar istemcide, çalışma anında birleştiriliyor.** Tek parça
   hazır görsel olsaydı ya hiçbir şey görünürdü ya da tam ördek; gövde
   gelip aksesuarların sonra gelmesi ancak ayrı dosyalar üst üste
   bindiriliyorsa olur.
2. **Daha önemlisi:** yüklenemeyen katman **eksik** görünüyor, *yanlış
   yerde* değil. Şapka ördeğin yanında havada asılı kalmıyor, hiç
   gelmiyor. Yani yüklenen katmanlar her zaman doğru yerde — çünkü
   konum dosyanın **içinde**.

Yani DMD'de her aksesuar, **gövdeyle aynı boyutta, çoğu saydam, parça
kendi son konumuna çizilmiş** bir dosya. İstemci hiçbir hesap yapmıyor,
sadece üst üste koyuyor. Sektör standardının ta kendisi — ve bizim
yapmadığımız şey.

(DMD'nin dosyalarını doğrudan inceleyemedim: `game.duckmyduck.com`
Telegram dışına 503 dönüyor, `api.duckmyduck.com` kimlik istiyor.
Telegram hesabına girerek bakmak söz konusu değil. Ama kel ördek
gözlemi zaten yeterli kanıt.)

### "Tam tuval" pahalı değil

İlk akla gelen itiraz: *1024'lük tuvalin çoğu boşsa dosya şişmez mi?*
Kendi parçalarımızla ölçtüm:

| Parça | Kırpılmış | Tam tuval | Fark |
|---|---|---|---|
| `crown-celestial` | 11 KB | 10 KB | **−2 KB** |
| `wing-flame` | 17 KB | 19 KB | +2 KB |
| `tail-lightning` | 16 KB | 19 KB | +2 KB |
| `necklace-royal` | 14 KB | 16 KB | +2 KB |
| `face-kingmark` | 9 KB | 12 KB | +2 KB |

**Parça başına +2 KB.** WebP boş saydam alanı sıkıştırıp yok ediyor.
38 parçanın tamamı ~590 KB.

Yani yöntemin "pahalı" görünen kısmı bedava, ve karşılığında çalışma
anındaki bütün hizalama matematiği ortadan kalkıyor.

---

## Üç yol

### A. Mevcut 38 parçayı kalibre et · **0 CU**

Her parçayı önce kendi alfa içerik kutusuna kırp (tuvaldeki boşluğu
at), sonra gövdenin içerik kutusuna göre oransal bir çapa tablosu
yaz: her slot için `{x, y, ölçek, hizalama}`.

Prototipini kurdum, çalışıyor — ama kaba. Şu anki tablo:

```js
wing:     (0.07, 0.34, 0.62, 'sağ-üst')   // aynalanarak iki yana
tail:     (0.86, 0.74, 0.55, 'sol-üst')
crown:    (0.50, 0.03, 0.46, 'alt-orta')
face:     (0.50, 0.19, 0.30, 'orta')
necklace: (0.50, 0.40, 0.52, 'orta')
```

Slot başına tek bir sayı seti bütün parçalar için kullanılıyor; oysa
her parçanın kendi payı var (alev kuyruğu uzun, kristal kuyruk kısa).
Düzgün sonuç için **parça başına** ince ayar gerekiyor: 38 × 3 sayı.

- **Artısı:** bedava, tekrarlanabilir, tablo kodda durur, sonsuza
  kadar çalışır.
- **Eksisi:** emek. Ve bazı parçalar kurtarılamayabilir — perspektifi
  gövdeye uymayan bir parça öteleme ve ölçekle düzelmez.

### B. Parçayı gövdenin ÜSTÜNDE ürettir · **~11 CU/parça**

Kullandığımız model (**GPT Image 2.5 Flare**) `mask` parametresini
destekliyor:

> *"An optional PNG that marks which parts of the first reference image
> to change. It uses transparency: fully transparent areas are edited,
> fully opaque areas are kept."*

Yani:

1. Referans olarak **gövdeyi** ver (1024 tuval).
2. Maske olarak, yalnızca o slotun bölgesi **saydam**, geri kalanı
   opak bir PNG ver.
3. "Buraya altın bir taç çiz" de.
4. Çıktı, tacın **gövdenin üstünde, doğru yerde ve doğru
   perspektifte** durduğu tam görüntü olur.
5. Çıktıyı gövdeyle piksel piksel karşılaştırıp farkı al — parça,
   konumu baştan doğru olan saydam bir katman olarak çıkar.

Hizalama **yapı gereği** doğru: model gövdeyi gördüğü için parçayı
ona göre çiziyor. Üstelik ışık ve perspektif de tutuyor — kalibrasyonun
asla veremeyeceği iki şey.

- **Artısı:** sorunun kökünü çözer, sektörün yaptığının yapay zekâ
  karşılığı.
- **Eksisi:** 38 parça × 11 CU ≈ **418 CU**. Ve fark alma gürültülü
  olabilir: model maske dışına da dokunursa temiz katman çıkmaz.
  (Belge "opak alanlar korunur" diyor ama **ölçmeden güvenmemek
  gerek** — tek parçalık bir deneme 11 CU.)

### C. Birleştirmeyi tamamen bırak, LoRA eğit · **~450 CU + üretim**

Gövde karakterini LoRA ile öğretip her ejderhayı tek seferde ürettirmek.

**Bu yol koleksiyonu öldürür.** 24.576 kombinasyon için 24.576 ayrı
üretim gerekir. Üretken koleksiyonun bütün mantığı az parçadan çok
kombinasyon çıkarmaktır; LoRA bunu ortadan kaldırır.

Eylülde denenen de buydu ve bırakılmıştı — haklı olarak.

---

## Önerim

**DMD'nin yolu: konumu dosyaya göm.**

Bu, A'nın daha iyi bir biçimi. Çapa tablosunu **çalışma anında**
kullanmak yerine **bir kez, üretim aşamasında** uygula ve sonucu tam
tuvale yazdır:

1. Her parçayı içerik kutusuna kırp.
2. Çapa tablosuyla gövdeye göre yerine koy, ince ayarını yap.
3. **1024×1024 saydam tuvale, son konumunda kaydet.**
4. Oyun kodu hiçbir hesap yapmaz — sadece `egg → wing → body → tail →
   crown → face → necklace` sırasıyla üst üste bindirir.

Neden bu daha iyi:

- Oyun kodu aptal kalıyor; hizalama hatası çalışma anında oluşamaz.
- Çapa tablosu bir üretim aracı olur, bir çalışma-anı bağımlılığı değil.
- Yeni parça eklendiğinde tek yapılacak iş onu doğru yere yerleştirip
  kaydetmek — kodda hiçbir şey değişmez.
- DMD'nin yaptığı bu, ve sahibin kel ördek gördüğü an bunun kanıtı.

**Sonra kalanlara B.**

1. **A'yı bitir (0 CU).** Parça başına ince ayarlı çapa tablosu yaz.
   38 parçanın çoğu öteleme + ölçekle kurtulur; gövde ve parçalar aynı
   cepheden çizilmiş, perspektif uyumsuzluğu az.
2. **Kurtulamayanları işaretle.** Kalibrasyonla düzelmeyen parça
   sayısı belli olunca B'nin gerçek maliyeti de belli olur — 38 değil,
   belki 6.
3. **B'yi önce TEK parçada dene (11 CU).** Fark alma temiz çıkıyor mu,
   onu ölçmeden 418 CU'luk karar verilmez.

Bu sıra en kötü durumda bile para kaybettirmiyor: A bedava, B'nin
kapsamı A bittikten sonra küçülüyor.

### Bir not: 24.576 çok fazla

Plandaki hedef ~5.000 kombinasyondu. Eldeki parçalar 24.576 veriyor.
Slot başına parça sayısını kırpmak (8→6 kanat, 8→6 kuyruk, 8→5 taç)
**5.400**'e indiriyor ve hizalanacak parça sayısını da 38'den 27'ye
düşürüyor — yani A'nın emeğini ve B'nin maliyetini birlikte azaltıyor.

---

## Kaynaklar

- [Creating Trait Artwork for Generative NFTs — Scrappy Squirrels](https://medium.com/scrappy-squirrels/creating-trait-artwork-for-generative-nfts-995fc163a662)
- [How to create a generative art NFT collection — Fair.xyz](https://fair.xyz/blog/how-to-create-a-generative-art-nft-collection/)
- [How I created a generative art NFT collection — Design Bootcamp](https://medium.com/design-bootcamp/how-i-created-a-generative-art-nft-collection-from-start-to-finish-d804f9031d69)
- [Inpainting, Outpainting, and Bounding Box — Invoke](https://support.invoke.ai/support/solutions/articles/151000096702-inpainting-outpainting-and-bounding-box)
- [Beginner's guide to inpainting — Stable Diffusion Art](https://stable-diffusion-art.com/inpainting_basics/)
- [Multiple character combine (mask/control) — Civitai](https://civitai.com/models/1445366/multiple-character-combine-mask-control?modelVersionId=1657623)
