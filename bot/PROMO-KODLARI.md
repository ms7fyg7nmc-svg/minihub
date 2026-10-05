# Promosyon kodları

Kodlar `bot/worker.js` içindeki `PROMO_KODLARI` tablosunda duruyor.
Nerede kullanılır: **Hub → Ayarlar → Promosyon kodu**.

Yazarken büyük/küçük harf ve tire önemli değil — `di yumurta 8`,
`DI-YUMURTA-8` ve `di_yumurta_8` aynı koda gider.

---

## Varlık kodları (herkese açık)

Bu kodları **herhangi bir hesap** kullanabilir, ama **oyuncu başına bir
kez**.

**Sen istisnasın:** senin hesabında hepsi sınırsız tekrar çalışır, çünkü
test eden sensin. Kimlik kontrolü Telegram'ın imzaladığı `initData`'dan
geliyor, kimse kendini sahip ilan edemez.

### Neden tek seferlik?

Kodlar bir şekilde sızar — biri ekran görüntüsü alır, bir gruba düşürür.
Tek seferlik bir kodun sızması "herkes bir kez alır" demek. **Sınırsız
tekrarlanan** bir kodun sızması ekonominin sonu demek ve geri dönüşü yok:
dağılan $MH insanların bakiyesinde kalır.

Bu yüzden `tekrarli: true` ile `sahip: false` birlikte kullanılmamalı.
Test bunu kontrol ediyor (`promo: halka açık + sınırsız tekrar eden kod
YOK`).

### $MH ve enerji (anında gelir)

| Kod | Ne verir |
|---|---|
| `MH-COIN-10K` | 10.000 $MH |
| `MH-COIN-100K` | 100.000 $MH |
| `MH-ENERJI` | **Enerjiyi tavana çıkarır (15)** |

### Ejderha Adası — yem ve yıldız

Bunlar hub'da değil, **Ejderha Adası'nı açtığında** iniyor. Kodu
yazdıktan sonra oyuna gir, ödül kendiliğinden gelir.

| Kod | Ne verir |
|---|---|
| `DI-YEM-10K` | 10.000 yem |
| `DI-YEM-1M` | 1.000.000 yem |
| `DI-YILDIZ-100` | 100 yıldız |
| `DI-YILDIZ-5K` | 5.000 yıldız |

### Ejderha Adası — ızgara nesneleri

| Kod | Ne verir |
|---|---|
| `DI-YUMURTA-1` | 6 adet Sv.1 yumurta |
| `DI-YUMURTA-4` | 4 adet Sv.4 yumurta |
| `DI-YUMURTA-6` | 3 adet Sv.6 yumurta |
| `DI-YUMURTA-8` | 2 adet Sv.8 yumurta |
| `DI-KAP-1` | 4 adet Sv.1 yem kabı |
| `DI-KAP-4` | 3 adet Sv.4 yem kabı |
| `DI-YILDIZKAP-1` | 4 adet Sv.1 yıldız kabı |
| `DI-YILDIZKAP-4` | 3 adet Sv.4 yıldız kabı |

### Hepsi birden

| Kod | Ne verir |
|---|---|
| `DI-HEPSI` | 100.000 $MH + tavan enerji + 500.000 yem + 2.000 yıldız + 3×Sv.6 ve 2×Sv.8 yumurta + 2×Sv.4 yem kabı + 2×Sv.4 yıldız kabı |

**Not:** Izgara doluysa nesneler "Sırada" şeridinde bekler, kaybolmaz.

---

## Halka açık kodlar

Oyuncu başına **bir kez** kullanılabilir ve bir **süresi** vardır.

| Kod | Ne verir | Süre |
|---|---|---|
| `HOSGELDIN` | 5.000 $MH + 5 enerji | 5 Ekim 2026'dan itibaren 7 gün |

---

## Kim hangi kodu kullandı

**Hub → Ayarlar → Kod kayıtları.** Bu satır yalnızca senin hesabında
görünür; başkası doğrudan sunucuya sorsa bile "yetki yok" cevabı alır.

Listede her kullanım için: oyuncunun adı, Telegram kimliği, hangi kod,
ne zaman, ve tekrar kullanım mı. En üstte kod başına kaç kez
kullanıldığının özeti var.

Kayıt için **ayrı bir tablo açılmadı** — her kullanım zaten `spend_log`'a
düşüyordu, çünkü "bu kodu bir kez kullandın" koruması oradan geliyor.
Yani kayıt en baştan beri tutuluyordu; eklenen şey onu okuma yoluydu.
Geçmişe dönük kayıtlar da listede görünür.

## Yeni kod eklemek

`bot/worker.js` → `PROMO_KODLARI`. Ekledikten sonra **deploy gerekiyor**
(`npx wrangler deploy`), çünkü liste veritabanında değil kodda duruyor.
Bu bilerek böyle: liste sunucuda yazılı olduğu sürece kimse veritabanına
satır ekleyerek kendine $MH basamaz ve her değişiklik git geçmişinde
kalır.

Şablon:

```js
'KODUN-ADI': {
  odul: {
    coin: 5000,                                  // $MH
    enerji: 5,                                   // enerji (tavan 15)
    yem: 10000,                                  // ejderha yemi
    yildiz: 100,                                 // yıldız
    nesneler: [{ t: 'egg', lv: 6, adet: 3 }],    // t: egg | food | star
  },
  baslar: Date.parse('2026-11-01T00:00:00Z'),    // başlangıç
  gun: 7,                                        // kaç gün geçerli (0 = süresiz)
  sahip: false,                                  // true = sadece sahip
  tekrarli: false,                               // true = tekrar kullanılabilir
},
```

**Dikkat:** `tekrarli: true` ile `sahip: false` birlikte kullanılmamalı —
herkesin sınırsız $MH basabileceği bir kod olur. Test bunu kontrol
ediyor (`promo: halka açık + sınırsız tekrar eden kod YOK`).

Varsayılanlar zaten doğru: hiçbir bayrak yazmazsan kod **herkese açık ve
oyuncu başına bir kez** olur, senin hesabında ise sınırsız.

Yumurta seviyesi 1–8, kap seviyesi 1–4 ile sınırlı; sunucu bunun dışına
çıkan değerleri kırpıyor.
