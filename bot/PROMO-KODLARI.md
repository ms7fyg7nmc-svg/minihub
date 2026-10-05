# Promosyon kodları

Kodlar `bot/worker.js` içindeki `PROMO_KODLARI` tablosunda duruyor.
Nerede kullanılır: **Hub → Ayarlar → Promosyon kodu**.

Yazarken büyük/küçük harf ve tire önemli değil — `di yumurta 8`,
`DI-YUMURTA-8` ve `di_yumurta_8` aynı koda gider.

---

## Sahip kodları (sadece sen)

Bu kodlar **yalnızca senin Telegram hesabında** çalışır ve **sınırsız
tekrar** kullanılabilir. Başkası yazarsa "Bu kod geçerli değil" der —
kodun var olduğunu bile söylemez.

Kimlik kontrolü Telegram'ın imzaladığı `initData`'dan geliyor, yani
kimse kendini sahip ilan edemez.

### $MH ve enerji (anında gelir)

| Kod | Ne verir |
|---|---|
| `MH-COIN-10K` | 10.000 $MH |
| `MH-COIN-100K` | 100.000 $MH |
| `MH-ENERJI` | Enerjiyi tavana çıkarır (15) |

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
ediyor (`promo: $MH basan her kod ya süreli ya sahibe kilitli`).

Yumurta seviyesi 1–8, kap seviyesi 1–4 ile sınırlı; sunucu bunun dışına
çıkan değerleri kırpıyor.
