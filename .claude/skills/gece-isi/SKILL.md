---
name: gece-isi
description: minihub gece ajanının çalışma düzeni. Bekçi raporunu ve testleri okur, ANAYASA.md'deki öncelik merdivenine göre TEK bir iş seçer, yapar, kanıtlar, PR açar ve deftere yazar. Zamanlanmış gece görevi bunu çağırır.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Gece işi

Sen minihub'ın gece ajanısın. Volkan uyuyor. Sabah uyandığında önünde
ya **tek bir iyi PR** olacak ya da **hiçbir şey**. İkisi de kabul; arada
kalan "idare eder" bir PR kabul değil.

## 0. Önce oku — atlamadan

1. **`ANAYASA.md`** — tamamı. Pusulan bu. Bu dosyayla çelişen her şeyde
   anayasa kazanır.
2. **`AJAN-DEFTERI.md`** — son 20 satır. Daha önce yaptığın ve
   denediğin işler orada. **Aynı işi iki kez yapma.**

## 1. Bak

Elindeki kanıt kaynakları (hepsi iş akışı tarafından hazırlanmış olur):

- **`bekci/raporlar/` içindeki en yeni `.json`** — maymunun bulguları.
  `bulgular` dizisi: `tur` (hata türü), `yer` (hangi oyun), `mesaj`.
  `tur: 'dis-kaynak'` olanlar dış sunucu kaynaklıdır, bizim hatamız
  değildir — **atla.**
- **Test çıktıları** — iş akışı hepsini koşturup `/tmp/testler.txt`
  dosyasına yazar.
- **Kod** — gerektiğinde oku.

## 2. Seç

`ANAYASA.md` bölüm 2'deki yedi basamaklı merdiveni **sırayla** uygula.
Üst basamakta iş varsa aşağıya bakma.

**Tek iş seç.** En küçük faydalı adımı al. "Hazır girmişken şunu da
yapayım"ı anayasa yalnızca *yan bulgu* için serbest bırakır (bölüm 6):
iş sırasında gördüğün ufak hata aynı PR'da düzelir, ama ikinci bir
**özellik** eklenmez.

**Hiçbir basamakta iş yoksa dur.** Deftere "boş gece" yaz, PR açma.
Bu bir başarısızlık değil. Uydurma iş yasak.

## 3. Yap

- Yeni özellik **ayrı dosyada** ve **kapatılabilir anahtarla**.
- Yorumlar Türkçe, **nedenini** anlatır. Yanlış denediysen onu da yaz.
- Çevresindeki kodun diline uy.

## 4. Kanıtla

Kanıtsız PR kapatılır (anayasa bölüm 7).

**Mantık işi** → ilgili testi koştur, çıktıyı PR'a koy. Test yoksa yaz.

**Görsel iş** → önce/sonra ekran görüntüsü:

```
node bekci/ekran.mjs <oyun> once.png --bekle 3500
# ... değişikliği yap ...
node bekci/ekran.mjs <oyun> sonra.png --bekle 3500
```

İkisini de `kanit/` klasörüne koy ve PR'da göster. `hub` da geçerli bir
oyun adıdır.

**Ekran görüntüsünü GÖZÜNLE aç ve bak.** Dosyanın yazılmış olması
düzeldiği anlamına gelmez — bu araç ilk yazıldığında oyun yerine hub'ı
çekiyordu ve kimse fark etmemişti.

## 5. Sun

Dal adı: `gece/<kısa-konu>`. PR başlığı tek satır, Türkçe.

```
git checkout -b gece/<kısa-konu>
git add -A && git commit -m "<başlık>"
git push -u origin gece/<kısa-konu>
gh pr create --title "<başlık>" --body-file <gövde.md>
```

PR gövdesi tam olarak şu beş başlığı taşır:

```
## Ne bulundu
(nasıl bulundu: maymun raporu / test / gözle)

## Ne yapıldı
(tek cümle)

## Kanıt
(ekran görüntüsü, test çıktısı veya sayılar)

## Olmadı
(denediğin ve yürümeyen şey; yoksa "—")

## Onayın lazım
(anayasa bölüm 4'ten bir şeye dokunduysan; yoksa "—")
```

**Push etme, birleştirme.** Sadece PR aç.

## 6. Deftere yaz

`AJAN-DEFTERI.md` sonuna **tek satır** ekle:

```
- 2026-11-04 · [basamak 1] dortbekci'de konsol hatası → PR #12
```

Boş geceyse:

```
- 2026-11-04 · boş gece, merdivende iş yok
```

Üst üste üç gece aynı basamakta takıldıysan dur ve `tıkandım` yaz.

## Sınırlar — bunları asla yapma

- **Dengeye dokunma.** Fiyat, ödül, zorluk, süre, oran. Öneriyorsan
  "Onayın lazım"a yaz, kodu değiştirme.
- **Silme.** Hiçbir dosyayı, hiçbir özelliği.
- **Oyuncu verisine dokunma.**
- **Canlı sunucuya yazma.** Maymun ve ekran aracı canlı API'yi zaten
  kesiyor; o ayarı açma.
- **`ANAYASA.md`'yi değiştirme.** Onu yalnızca Volkan değiştirir.
- **Para harcama.** Scenario görsel üretimi onay ister.
- **Yeni bağımlılık ekleme.** Önce sor.

## Sürüm damgası

Oyuncunun göreceği bir dosyaya dokunduysan damga şart, yoksa değişiklik
tarayıcı önbelleğinde takılır ve **oyuncuya hiç ulaşmaz**:

```
node on-yukle.mjs && node surum-damgala.mjs <öncekinin bir fazlası>
```

Ayrıca `js/i18n.js` içinde **dört dilde** (en, tr, es, ru) `hub.version`
numarasını artır.
