# Bekçi — maymun

Oyunları kendi kendine oynayıp hata arayan araç. Gece ajanının gözü.

## İki kopya var — dikkat

| Nerede | Ne var | Ne zaman çalışır |
|---|---|---|
| `~/minihub-bekci/` | maymun **+ göz** (`goz.py`) | Volkan'ın Mac'inde, elle |
| `minihub/bekci/` (burası) | yalnızca maymun | GitHub'da, gece görevinde |

**Göz buraya gelmedi** çünkü `goz.py` mlx-vlm kullanıyor ve o yalnızca
Apple Silicon'da çalışıyor; GitHub'ın Linux sunucusunda açılmaz.
Yani bulutta maymun **işlevsel** hataları buluyor (çöken sayfa, konsol
hatası, donma), **görsel** denetim Mac'te kalıyor.

**Sürüklenme riski:** `maymun.mjs` iki yerde duruyor. Birini
değiştirirsen ötekini de güncelle, yoksa ikisi ayrışır. Uzun vadede
tek kopyaya inmek daha doğru; şimdilik ikisi de lazım.

## Dosyalar

- **`maymun.mjs`** — oyunları oynar, bulduklarını `raporlar/` altına
  JSON ve Markdown olarak yazar.
- **`ekran.mjs`** — tek bir oyunun telefon boyutunda ekran görüntüsünü
  alır. Gece ajanı kanıt üretmek için bunu kullanıyor.

## Kullanım

```
node bekci/maymun.mjs --sure 20 --tur 2
node bekci/ekran.mjs kule kanit/once.png --bekle 3500
```

Adres `BEKCI_KOK` ile değişir (varsayılan `http://localhost:8765`).

## İki kural

**Canlı API kesilir.** İkisi de `minihub-bot...workers.dev` isteklerini
503 ile karşılıyor. Kesilmezse araçlar gerçek oyuncu kayıtlarına yazar.
Bu ayarı açma.

**Oyun sayfası doğrudan açılmaz.** Her oyunun `index.html`'inde bir
kapı var: `sessionStorage`'da `mh_hub_open` damgası yoksa sayfa kendini
hub'a atıyor. İkisi de bu damgayı koyarak giriyor. Koymazsan oyun
yerine **hub'ın** görüntüsünü alırsın ve aldığını sanırsın — `ekran.mjs`
ilk yazıldığında tam olarak bu oldu.

## Oyun listesi

`maymun.mjs` içindeki `OYUNLAR` dizisi. **Yeni oyun eklenince buraya da
eklenmeli.** Kule, İlk Uçuş ve Dört Bekçi listede olmadığı için aylarca
hiç denenmediler; üçünde de gerçek bir hata vardı ve maymun değil, elle
bakarken bulundu.
