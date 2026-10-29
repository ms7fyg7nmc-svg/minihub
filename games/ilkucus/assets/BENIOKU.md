# İlk Uçuş — kalas görselleri

## Kaynak ve lisans

**Kenney.nl — "Platformer Pack: Medieval Expansion"**
Kenney Vleugels, <https://kenney.nl>
**Lisans: CC0 1.0 (kamu malı)** — <http://creativecommons.org/publicdomain/zero/1.0/>

Paketin `License.txt` dosyası: kişisel ve ticari kullanıma açık, atıf
zorunlu değil. Yine de kaynağı burada yazıyoruz ki "bu dosya nereden
geldi" sorusu bir daha sorulmasın. CC0, token planı olan bir projede
sorun çıkarmayan tek lisans sınıfı.

İndirme: Kenney'in kendi bağlantısı oturum çerezi istiyor, o yüzden
OpenGameArt'taki aynı CC0 kopyası kullanıldı:
<https://opengameart.org/content/platformer-pack-medieval-250>

Aynı paket `games/kule/assets/` içinde de kullanılıyor (taş duvar).

## Hangi dosya hangi kutucuk

| Bizdeki ad | Özgün | Ne işe yarıyor |
|---|---|---|
| `kalas-sol.webp` | `medievalTile_221.png` | Kalasın sol ucu |
| `kalas-orta.webp` | `medievalTile_222.png` | Kalasın ortası (gerilir) |
| `kalas-sag.webp` | `medievalTile_223.png` | Kalasın sağ ucu |

Üçü 70×70, kayıpsız webp, toplam ~360 bayt.

## Neden bu üçü

Aday iki takımdı: 221–223 (düz ahşap, uçlarında gri kapak) ve 224–226
(aynısı, uçları turuncu). Gri olan seçildi; turuncu uçlar koyu gökyüzü
zemininde fazla çığırtkan duruyordu.

135–140 da bakıldı ama onlar taş gövde + ahşap kenar, yani duvara ait
parçalar; havada duran bir platform için uygun değil.

## Dikkat

Kalaslar **13 piksel** yüksekliğinde çiziliyor, kutucuk ise 70×70.
Ahşabın damarı **yatay** olduğu için yatay germe dokuyu bozmuyor;
bu yüzden uçlar kare değil, kalas boyunda tutuluyor. Dikey ezme
dokuyu bozardı.

Kaya türünün rengi (`TUR_RENGI`) kalasın üstüne `multiply` ile
basılıyor. Düz kaya hiç boyanmıyor — ahşap kendi rengiyle kalıyor ki
diğer türler ona göre ayrışsın.
