# Arayüz ikonları

| Dosya | Ne | Durum |
|---|---|---|
| `settings.webp` | Ayarlar — dişli | **Onaylandı, henüz bağlı değil** |
| `wallet.webp` | Cüzdan | **Onaylandı, henüz bağlı değil** |
| `btn-*.webp`, `node-*.webp`, `chain.webp` | Ejderha Adası arayüz parçaları | Kullanılıyor |

## settings / wallet

Hub'da şu an **Settings veya Wallet ekranı yok**. İkonlar o ekranlar
yapıldığında hazır olsun diye önceden üretildi. Bağlayan kişi için iki
not:

**1. Boyut.** 96×96 şeffaf tuval, ortalanmış. Ekranda 24px'te
tasarlandılar ve o boyutta denendi.

**2. Aydınlık tema.** İkisi de açık gri ve içlerinde pişmiş gölge var —
rengi CSS'ten değiştirilemez. Aydınlık temada beyaz kartın üzerinde
**kaybolmuyorlar ama soluyorlar**: okunur, sadece zayıf. Çözüm, oyun
karelerinde zaten kullandığımız desen: ikonun altına koyu, yuvarlatılmış
küçük bir zemin (chip) koymak. O zaman iki temada da aynı dosya,
aynı net görüntü.

```css
/* aydinlik temada ikonun arkasina koyu zemin */
:root[data-tg-theme="light"] .ayar-ikon {
  background: #2c2a3c;
  border-radius: 8px;
  padding: 4px;
}
```

Seçilmeyen üç işlem `_alternatifler/` içinde: `-1` ince kontur,
`-2` düz dolgu, `-4` buzlu cam. 1 ve 2 düz tek renk olduğu için
CSS'ten renklendirilebilir; aydınlık tema için chip istemeyen bir
çözüm gerekirse oradan alınabilir.
