# Sosyal medya ve duyuru görselleri

Bu klasör **oyuna inmiyor.** `_` ile başladığı için GitHub Pages burayı
yayınlamıyor — dosyalar Telegram kanalına, duyurulara ve paylaşımlara
elle konmak için duruyor.

| Dosya | Ölçü | Nerede kullanılır |
|---|---|---|
| `kanal-kapagi.webp` | 1536×864 | Telegram kanalının üst görseli |
| `miniapp-onizleme.webp` | 1280×720 | Telegram'da oyunun önizleme kartı |
| `minihub-nedir.webp` | 1536×864 | Sabitlenmiş tanıtım gönderisi |
| `tuccar-geldi.webp` | 1536×864 | Tüccar / sipariş duyurusu |
| `ejderha-yakalandi.webp` | 1536×864 | Nadir an kutlaması, oyuncu paylaşsın diye |
| `odul-carki.webp` | 1536×864 | Günlük dönüş / enerji hatırlatması |
| `promosyon-kodu.webp` | 1536×864 | Kod dağıtım duyurusu |
| `bos-afis.webp` | 1536×864 | Üzerine yazı eklenebilen boş şablon |
| `davet-arkadas.webp` | 2048×2048 | Arkadaş davet görseli (daha eski) |

Bunlar **üretilmedi, kodla kuruldu** (`_kodla/ciz.py`, 0 CU) — zemin
`bos-afis.webp`, üzerindeki her şey oyunun kendi dosyası:

| Dosya | Ölçü | Nerede kullanılır |
|---|---|---|
| `on-kademe-yumurta.webp` | 1536×864 | Yumurta zincirinin tanıtımı — Lv.1'den Lv.10'a |
| `gunluk-gorevler.webp` | 1536×864 | "Her gün yeni görev" duyurusu |
| `haftalik-liderlik.webp` | 1536×864 | Haftalık sıralama şablonu |
| `genel-afis.webp` | 1536×864 | Nesneli genel duyuru şablonu |

Taşlar, sandıklar ya da yumurtalar değişirse `python3 _kodla/ciz.py`
yeniden kurar. Üretim gerekmiyor çünkü bu dördü kompozisyon, sahne
değil — oyunun varlıklarını diziyorlar.

Hepsinde **yazı için boşluk** var ve hiçbirinin içinde yazı yok —
başlığı sonradan, istediğin dilde koyabilirsin. Dört dilde ayrı görsel
üretmek yerine tek görsel + sonradan yazı, hem ucuz hem esnek.

## Üretim (10 Ekim 2026)

Sekizi tek oturumda, **GPT Image 2.5 Flare** ile, toplam **~84 CU**.
Ham dosyalar `_kaynak/` altında; yayına giren kopyalar kalite 88'e
sıkıştırıldı (10,6 MB → 1,4 MB, sosyal medyada fark edilmiyor).

### Karakteri tutturan şey: referans görsel

Asıl numara prompt değil, **`davet-arkadas.webp`'in referans görsel
olarak verilmesi** oldu. Tek başına metinle "sıcak resimsi fantezi"
demek yetmiyor; sekiz görsel sekiz ayrı dünyada çıkıyor. Referansla
birlikte hepsi aynı büyücüyü, aynı altın ışığı, aynı yarasa amblemli
sandıkları ve aynı fırça dokusunu taşıyor.

Bu, sahibin koyduğu kuralın uygulaması: *"Eğer scenario kullanacaksan
oyunun şuanki karakterine benzer bir yapı oluştur."* Yeni bir sosyal
görsel gerektiğinde **aynı referansı ver**, yoksa set dağılır.

Referans yüklemesi: `upload_asset` → parçayı `curl -T` ile PUT et →
`upload_asset_complete`. Dönen `asset_id` `referenceImages` dizisine
konuyor (tek görsel için bile dizi olmak zorunda).

### Promptlarda sabit kalan kısım

Her promptun başında şu duruyor:

> Keep the exact art style of the reference image: warm painterly
> storybook fantasy illustration, soft golden light, rounded friendly
> character shapes, rich saturated colours. Same world, same palette,
> same brushwork.

ve sonunda:

> No text, no letters, no numbers, no logo, no watermark anywhere.

Ortadaki sahne tarifi her görselde değişiyor. Oyunun gerçek
kaynakları tarife açıkça yazılıyor — altın yıldız, kırmızı et, yarasa
kanatlı amblemli sikke, pullu yumurta — yoksa model genel fantezi
nesneleri koyuyor ve görsel oyunla bağını kaybediyor.
