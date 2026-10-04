# Wheel Rush hub karesi

| Dosya | Ne |
|---|---|
| `yol.webp` | Hub izgarasindaki kare — gece asfalti, farin sicak konisi, toz |

Oncesinde kare bir gradyan + SVG tekerlek ikonuydu; oyunun ne oldugunu
anlatmiyordu. Scenario ile dort secenek uretildi, **1 numara** secildi
(duz yol + bugi): 46 pikselde okunan tek tasarim oydu, digerleri
(kayalar, paralar, lastik izi) o boyutta lekeye donusuyordu.

## Kirpma

Gorsel **tam kare degil, merkezden kirpilmis** olarak kaydedildi.
Tamami kullanildiginda 46 pikselde ortaya cikan sey siyah bir kareydi -
aracin cevresindeki genis karanlik asfalt tum kareyi yutuyordu. Kirpma
merkezi `(0.50W, 0.56H)`, yarim kenar `0.26W`; bu, bugiyi ve farin
parlamasini karenin icine dolduruyor.

Orijinalin tamami ve secilmeyen uc tasarim `_alternatifler/` altinda
(`kaya`, `para`, `iz`). Silinmiyorlar - her biri CU harcadi.

## CSS tuzagi

Yol `--tile-foto` ozel degiskeniyle veriliyor ama **mutlak adres olarak**
(`new URL(foto, document.baseURI).href`). Goreli bir `url()` ozel
degiskene konup `style.css` icinde `var()` ile kullanilinca tarayici onu
**stil dosyasina** gore cozuyor ve `/css/assets/...` diye 404 veriyor.
Yerelde de, `/minihub/` altinda da dogru calisan tek yol mutlak adres.
