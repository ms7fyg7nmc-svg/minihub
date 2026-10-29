# Kule — taş görselleri

## Kaynak ve lisans

**Kenney.nl — "Platformer Pack: Medieval Expansion"**
Kenney Vleugels, <https://kenney.nl>

**Lisans: CC0 1.0 (kamu malı)**
<http://creativecommons.org/publicdomain/zero/1.0/>

Paketin kendi `License.txt` dosyasından:

> You may use these assets in personal and commercial projects.
> Credit (Kenney or www.kenney.nl) would be nice but is not mandatory.

Yani **atıf zorunlu değil**, ama kaynağı burada yazıyoruz ki ileride
"bu dosya nereden geldi, kullanabilir miyiz" sorusu bir daha sorulmasın.
CC0 ticari kullanıma, değiştirmeye ve yeniden dağıtmaya açık — token
planı olan bir projede sorun çıkarmayan tek lisans sınıfı bu.

İndirme: paketin kendi sitesindeki bağlantı oturum çerezi istiyor,
o yüzden OpenGameArt'taki aynı CC0 kopyası kullanıldı:
<https://opengameart.org/content/platformer-pack-medieval-250>

## Hangi dosya hangi kutucuk

Özgün paketteki adlar numara olduğu için burada eşleme tutuluyor.

| Bizdeki ad | Özgün | Ne işe yarıyor |
|---|---|---|
| `tas-govde.webp` | `medievalTile_064.png` | Bloğun ortasında tekrarlayan düz taş |
| `tas-sol.webp` | `medievalTile_066.png` | Bloğun sol ucu (kenar sütunu) |
| `tas-sag.webp` | `medievalTile_068.png` | Bloğun sağ ucu |
| `tas-tac.webp` | `medievalTile_018.png` | Kulenin tepesindeki mazgallı siper |
| `mesale-a.webp` | `medievalTile_187.png` | Meşale, yanma karesi 1 |
| `mesale-b.webp` | `medievalTile_188.png` | Meşale, yanma karesi 2 |

Hepsi 70×70, kayıpsız webp'ye çevrildi; altısı toplam ~2,5 KB.

## Neden bu kutucuklar

268 kutucuğun hepsine tek tek bakıldı. Düz taş adayları 064, 065, 066,
067 ve 068'di; 066/067/068'in kenarında dikey bir ışık var, o yüzden
onlar uç sütunu oldu, dokusu en sakin olan 064 gövdeye gitti —
tekrarlanınca dikiş izi vermeyen tek taş o.

Taç için 017 ve 018 vardı: 017'nin altı eğimli (köşe parçası), 018 düz.
Düz olan seçildi.

## Dikkat

Kutucuklar **tek renk** (soğuk gri-mavi). Katın rengi `kule.js` içinde
`overlay` birleştirmesiyle üstüne basılıyor, düz boyamayla değil —
düz boyama taşın dokusunu tamamen eziyordu.
