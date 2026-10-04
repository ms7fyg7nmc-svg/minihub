# Arayüz ikonları

| Dosya | Ne | Durum |
|---|---|---|
| `settings.webp` | Ayarlar — dişli | Hub üst barında kullanılıyor |
| `wallet.webp` | Cüzdan | Hub üst barında kullanılıyor |
| `btn-*.webp`, `node-*.webp`, `chain.webp` | Ejderha Adası arayüz parçaları | Kullanılıyor |

## settings / wallet

Hub üst barında kullanılıyorlar. İki not:


**1. Boyut.** 96×96 şeffaf tuval, ortalanmış. Ekranda 24px'te
tasarlandılar ve o boyutta denendi.

**2. Aydınlık tema.** İkisi de açık gri ve içlerinde pişmiş gölge var —
rengi değiştirilemez. Önce butonun zeminini koyulaştırmayı denedim;
sonuç üst barda **iki siyah lekeydi** ve ikonlar o lekenin içinde
kayboldu. Çalışan çözüm, zemini olduğu gibi bırakıp **ikonu** koyu
siluete çevirmek:

```css
:root[data-tg-theme="light"] .arac-btn img {
  filter: brightness(0) opacity(0.55);
}
```

Kabartma gölgesi aydınlık temada kayboluyor — ama o gölge zaten koyu
zemin için yapılmıştı; orada önemli olan şeklin okunması.

Seçilmeyen üç işlem `_alternatifler/` içinde: `-1` ince kontur,
`-2` düz dolgu, `-4` buzlu cam. 1 ve 2 düz tek renk olduğu için
CSS'ten renklendirilebilir; aydınlık tema için chip istemeyen bir
çözüm gerekirse oradan alınabilir.
