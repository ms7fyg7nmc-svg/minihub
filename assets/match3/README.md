# Match Candy — KULLANILMIYOR

Bu klasörde oyuna bağlı hiçbir dosya yok. Match Candy taşlarını
`games/match3/match3.js` içindeki `KINDS` tablosundan, **emoji** olarak
çiziyor ve öyle kalıyor.

## Ne oldu

10 Ekim 2026'da sekiz şeker üretildi (nane şekeri, karamela, lolipop,
sakız topu, jelibon, mor şeker, trüf, kalp şeker — tek kolaj, **13 CU**).
Gerekçe: taşlar emoji olduğu için görünüş cihazın yazı tipine bağlıydı,
ve oyunun adı Match Candy iken taşları meyveydi.

**Sahibin kararı: oyun olduğu gibi kalsın.** Renk ayrımı net, nesneler
okunabiliyor, ve Candy formatından çıkarmaya gerek yok.

Dosyalar silinmedi — `_kaynak/kesim/` altında duruyorlar (CU'ya mal olan
hiçbir şey silinmiyor, bkz. `assets/README.md`). `_` ile başladığı için
GitHub Pages bu klasörü yayınlamıyor, yani oyuncuya inmiyorlar.

Ham sayfa: `_kaynak/sayfa-4x2-2048.png`

## Fikir değişirse

Kesimler 160×160 webp olarak hazır. Bağlamak için `KINDS`'daki
`icon: '🍒'` alanları `img: 'mint'` gibi bir alana çevrilir ve
Üçlü Eşleştir'deki yöntem uygulanır (bkz. `assets/tripletile/README.md`):
`background-image` + `background-size`, taş rengi altta kalır.
