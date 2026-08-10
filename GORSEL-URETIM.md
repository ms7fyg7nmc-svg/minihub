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

## Aşama 1 — Sıfırdan tutarlı bir set üret

Referans görsel kullanmıyoruz; ejderhayı promptun kendisi tarif ediyor.
Model eğitmek için 15-20 görsel gerektiği icin önce bu promptla bir havuz
üretip en tutarlılarını seçiyoruz.

1. **Images** → **Generate**
2. Aşama 0'da seçtiğin modeli seç
3. **Boyut:** 1024 × 1024
4. Aşağıdaki promptu yapıştır ve **25-30 görsel** üret

### Ana prompt

```
adorable baby dragon character, chibi proportions with an oversized head
and small sturdy body, cute but fierce expression, seated on the ground in
a three-quarter view facing left, one foreleg planted forward

anatomy: long tapered reptilian snout with small nostrils, strong jawline
with two small fangs showing, heavy brow ridge over large glowing eyes with
vertical slit pupils, two thick horns sweeping back over the skull, a row
of sharp spines running from the back of the head down the neck and spine
to the tail, short thick neck, plated overlapping belly scales on the chest,
clawed paws, long tail curling around the body

wings: bat-like membrane wings with visible finger bones, half spread,
glowing translucent membrane

colors: deep violet and dark purple scales, magenta and pink rim lighting
along the edges, luminous lilac eyes, soft cyan glow accents

style: polished stylized 3D game render, high-end mobile game hero asset,
smooth glossy surfaces, strong volumetric shading, crisp silhouette,
vibrant saturated palette, cinematic rim light, Blizzard and Riot Games
inspired character art

composition: full body fully visible, centered in frame, plain flat neutral
grey background, even studio lighting, no ground shadow
```

### Negative prompt

```
text, watermark, logo, signature, blurry, low quality, extra limbs, extra
heads, two dragons, realistic photo, photorealistic, cluttered background,
scenery, landscape, cropped, cut off, out of frame, human, armor, rider,
flat 2d drawing, sketch, lineart
```

### Ayarlar

| Ayar | Değer | Neden |
|---|---|---|
| Boyut | 1024 × 1024 | Kare şart — parçalar üst üste binecek |
| Guidance / CFG | 6 - 8 | Yüksek olursa yanıyor, düşükse prompttan sapıyor |
| Steps | 30 - 40 | Daha fazlası boşuna bekletiyor |
| Seed | boş bırak | Çeşitlilik gerekiyor, sonra en iyileri seçeceksin |

### Seçim

Çıkan 25-30 görselden **aynı ejderha gibi duran 15-20 tanesini** seç.

Şunlara dikkat et:
- Boynuz sayısı ve şekli aynı mı
- Renk tonu aynı mı (biri mavi biri kırmızıysa alma)
- Oturma pozu ve yön aynı mı
- Gövde oranı aynı mı (biri uzun biri tıknazsa alma)

**Farklı görünenleri alma** — eğitim setindeki her tutarsız görsel modeli
biraz daha bozar. 15 tutarlı görsel, 30 karışık görselden iyidir.

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
