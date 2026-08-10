# Ejderha ve kozmetik görselleri — Scenario ile üretim rehberi

Bu dosya, oyundaki ejderhayı ve market öğelerini yapay zekâ ile üretmek için
adım adım ne yapılacağını anlatıyor. Promptlar İngilizce — bu araçlar
İngilizce'de belirgin şekilde daha iyi sonuç veriyor, olduğu gibi kopyala.

---

## Neden bu yol

Ejderhayı kodla (SVG) çizmeyi denedik, sonuç kötü oldu. Referanstaki
kalitede bir görsel elle yazılmış eğrilerle çıkmıyor. Doğru yol: görseli
yapay zekâ üretsin, kod sadece yerleştirsin.

**Önemli karar:** Her kozmetik için ejderhanın tamamını yeniden ürettirmiyoruz
(8 kanat × 8 kuyruk × 8 taç = binlerce kombinasyon eder). Bunun yerine
**parçaları ayrı ayrı** ürettiriyoruz — gövde bir kez, taçlar tek tek,
kanatlar tek tek — ve kod bunları üst üste bindiriyor. Oyunun şu anki yapısı
zaten böyle çalışıyor, sadece çizim yerine görsel koyacağız.

---

## Aşama 0 — Hesap ve model seçimi

1. [scenario.com](https://scenario.com) → kayıt ol
2. Sol menüden **Models** → **Explore** → hazır modellerden şunu ara:
   **"Stylized 3D Game Assets"** veya **"Toon Render"**
   (Referansındaki parlak, hacimli, mobil oyun havası bu ailede)
3. Beğendiğin modeli **favorilere ekle** — Aşama 1'de bunu kullanacağız

---

## Aşama 1 — Referanstan tutarlı bir set üret (bootstrap)

Elinde tek bir referans görsel var; model eğitmek için 15-20 görsel gerekiyor.
Bu yüzden önce referansı kullanarak **aynı ejderhanın farklı açılarını**
ürettirip kendi eğitim setini oluşturuyoruz.

1. **Images** → **Generate**
2. Az önce seçtiğin modeli seç
3. **Image Reference** (veya "IP Adapter") düğmesine bas → **referans
   ejderha görselini yükle**
4. Etki gücünü (**strength / influence**) **0.6 - 0.7** yap
   — 1.0 yaparsan aynı görseli kopyalar, 0.3 yaparsan benzemez
5. Aşağıdaki promptu yapıştır ve **20 görsel** üret:

```
chibi baby dragon character, cute but fierce, seated pose, three-quarter
view facing left, large head, short thick neck, long tapered snout, two
large horns swept back, spiky frill along neck and spine, plated chest
scales, membrane wings, long curled tail with spikes, glowing violet eyes,
deep purple scales with magenta rim lighting, stylized 3D mobile game asset,
glossy clean shading, centered composition, plain neutral background,
full body visible
```

**Negative prompt** (varsa "Negative" kutusuna):

```
text, watermark, logo, blurry, extra limbs, extra heads, realistic photo,
cluttered background, multiple characters, cropped, cut off
```

6. Çıkanlardan **en tutarlı 15-20 tanesini** seç (aynı ejderha gibi
   duranlar). Farklı görünenleri **alma** — eğitimi bozarlar.

---

## Aşama 2 — Kendi modelini eğit

1. **Models** → **Train a Model** → **Character** türünü seç
2. Aşama 1'de seçtiğin 15-20 görseli yükle
3. Model adı: `minihub-dragon`
4. **Trigger word** (tetikleyici kelime): `mnhbdragon`
   — Bundan sonra promptlarında bu kelimeyi kullanınca senin ejderhan gelecek
5. Eğitimi başlat (15-30 dakika sürer)

Eğitim bitince test et:

```
mnhbdragon, seated three-quarter view facing left, plain background,
full body
```

Aynı ejderha geliyorsa hazırsın. Gelmiyorsa eğitim setindeki tutarsız
görselleri ayıklayıp tekrar eğit.

---

## Aşama 3 — Oyun için görselleri üret

### 3a. Ana gövde (bir kez)

```
mnhbdragon, seated three-quarter view facing left, no crown, no accessories,
plain wings folded, neutral expression, full body, centered,
isolated on plain white background, even lighting, no shadows on background
```

- **Boyut:** 1024 × 1024
- Üretim sonrası **Remove Background** (Scenario'da hazır düğme var)
- Ejderha karenin **ortasında**, ayakları alt kenardan **%15 yukarıda** olsun
- Dosya adı: `dragon-base.png`

### 3b. Taçlar (8 adet, tek tek)

Her taç **ejderhasız**, tek başına üretilecek — kod onu kafaya oturtacak.

```
mnhbdragon style, a single [ÖĞE] floating, three-quarter view facing left,
game item icon, glossy stylized 3D, centered, isolated on plain white
background, no character, no head, item only
```

`[ÖĞE]` yerine sırayla:

| Dosya | `[ÖĞE]` |
|---|---|
| `crown-1-tiny.png` | `thin silver circlet with one small gem` |
| `crown-2-simple.png` | `simple bronze crown with three small points` |
| `crown-3-points.png` | `silver crown with five sharp points and blue gems` |
| `crown-4-jewel.png` | `golden royal crown with a large diamond on top` |
| `crown-5-flame.png` | `golden crown with flames burning on its points` |
| `crown-6-ice.png` | `crown made of jagged ice crystals, pale blue, frosted` |
| `crown-7-king.png` | `ornate dragon king crown with side wings and a red ruby` |
| `crown-8-celestial.png` | `celestial golden crown with a glowing halo ring and floating star crystals` |

### 3c. Kanatlar (8 adet)

```
mnhbdragon style, a single dragon wing, [ÖĞE], side view, spread open,
game asset, glossy stylized 3D, isolated on plain white background,
no character, wing only
```

| Dosya | `[ÖĞE]` |
|---|---|
| `wing-1-leather.png` | `plain leathery membrane, dark purple` |
| `wing-2-flame.png` | `edges burning with orange flames` |
| `wing-3-crystal.png` | `translucent ice crystal, pale blue, faceted` |
| `wing-4-demon.png` | `torn tattered membrane with barbed tips, dark` |
| `wing-5-phoenix.png` | `fiery feathered plumes, orange and gold, glowing` |
| `wing-6-lightning.png` | `electric arcs crackling across the membrane, cyan` |
| `wing-7-king.png` | `gold-trimmed ornate membrane, royal, jeweled` |
| `wing-8-celestial.png` | `glowing membrane filled with stars and nebula, golden trim` |

### 3d. Kuyruklar (8 adet)

```
mnhbdragon style, a single dragon tail, [ÖĞE], side view, curled,
game asset, glossy stylized 3D, isolated on plain white background,
no character, tail only
```

| Dosya | `[ÖĞE]` |
|---|---|
| `tail-1-basic.png` | `smooth tapering scaled tail` |
| `tail-2-spiked.png` | `row of bone spikes along its length` |
| `tail-3-flame.png` | `tip burning with orange fire` |
| `tail-4-crystal.png` | `ice crystal shards growing along it` |
| `tail-5-demon.png` | `barbed arrow tip, dark and menacing` |
| `tail-6-lightning.png` | `electricity crackling along it, cyan glow` |
| `tail-7-king.png` | `golden rings and ornate jeweled tip` |
| `tail-8-celestial.png` | `glowing with orbiting star motes, golden` |

---

## Kritik: hepsi AYNI kare içinde üretilmeli

Kod parçaları üst üste bindirecek. Bunun çalışması için:

- **Her görsel 1024 × 1024** olmalı — istisnasız
- **Arka plan şeffaf** (Remove Background sonrası PNG)
- Öğeler karenin **ortasında** dursun
- Bir öğeyi büyütüp küçültme — kod ölçekleyecek

Bunlara uyarsan ben her parçanın ejderhanın neresine oturacağını koda
yazarım; sen sadece dosyaları vereceksin.

---

## Bana nasıl vereceksin

Üretim bitince dosyaları şu klasöre koy:

```
games/dragon/assets/
```

Sonra bana "görseller hazır" de — gerisini ben hallederim (kodun çizim
yapan kısmını görsel yükleyen kısımla değiştirmek, hizaları ayarlamak,
market kutucuklarını bağlamak).

**Sırayla gitmek istersen:** önce sadece `dragon-base.png` üret, bana ver,
oyuna bağlayayım. Doğru göründüğünü birlikte gördükten sonra kozmetiklere
geçeriz — 40 parça üretip sonunda hizanın tutmadığını görmek yerine.
