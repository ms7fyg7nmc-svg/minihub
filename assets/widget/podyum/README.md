# Liderlik podyumu

Liderlik tablosunun ilk üçünün üzerinde durduğu kaideler, tacı ve
yedekleri. `css/style.css` → `.podyum-kaide` / `.podyum-tac`.

| Dosya | Oran (w/h) | Nerede |
|---|---|---|
| `kaide-1.webp` | 0,921 | Birinci — en yüksek, altın |
| `kaide-2.webp` | 1,139 | İkinci — gümüş |
| `kaide-3.webp` | 1,481 | Üçüncü — bronz |
| `tac.webp` | 1,338 | Birincinin rozetinin üstünde |

Üretim: tek kolaj, **GPT Image 2.5 Flare**, 13 CU, 10 Ekim 2026.
`assets/widget/lider.webp` (eski kupa ikonu) referans verildi, o yüzden
hub'ın altın/koyu widget diliyle aynı metalde duruyorlar. Ham sayfa
`_kaynak/`, kullanılmayan defne ve parıltı `_alternatifler/`.

## Ölçüler neden CSS'te değil görselde

Kaidelerin **genişliği sabit** (88px), **yüksekliği `aspect-ratio`dan**
geliyor. Gerçek bir podyumda üç blok aynı genişlikte, farklı
yüksekliktedir — bu kurulum tam olarak onu veriyor ve boy farkı
çizimin kendi oranından çıkıyor, elle girilen piksellerden değil.

Tersi denendi ve çöktü: genişlik `%100` verilince kaide sütunun tamamını
(~144px) kaplıyor, oran 0,92 olduğu için yükseklik de 155 piksele
çıkıyor ve podyum paneli yutuyordu. Eskiden CSS degradesiyle 62/44/34'tü.

`flex: none` şart — kaide bir flex öğesi, varsayılan `flex-shrink` hem
sabit yüksekliği hem `aspect-ratio`yu eziyor.

## Sayılar

Sıra numarası kaidenin ortasına değil **ön yüzüne** oturuyor: çizimde ön
yüz %5–78 arasında, altta bir taban çıkıntısı var, `padding-bottom: 17%`
sayıyı onun üstüne itiyor.

Yazı koyu (`#2a1c00`), rozetlerdeki çözümün aynısı — beyaz yazı gümüş
kaidede kayboluyordu. İlk denemede 15px'ti ve metalin dokusunda
eriyordu; 21px'te okunuyor.
