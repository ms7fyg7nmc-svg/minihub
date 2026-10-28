# Yeni oyunlar — yapim asamasi

`_` ile basladigi icin GitHub Pages bu klasoru YAYINLAMIYOR. Oyunlar
bitince `games/<ad>/` altina tasinacak.

## labirent/ — "Dort Bekci"

Pac-Man tarzi. Hayaletlerin yerine dort magara bekcisi; her birinin
SEKLI davranisini anlatiyor:

| Bekci | Silueti | Davranisi (Pac-Man kaynagindan) |
|---|---|---|
| Golem | kare, agir | Dogrudan oyuncunun karesini hedefler |
| Orumcek | dikenli, genis | Oyuncunun 4 kare ONUNU hedefler, onunu keser |
| Yarasa | kanatli, uzun | Hedefi GOLEM'in konumuna bagli, tahmin edilemez |
| Imp | kucuk, yuvarlak | Uzaktayken kovalar, YAKLASINCA kacar |

Hayaletler yol bulma algoritmasi KULLANMIYOR: kavsakta dort yone bakip
hedef kareye en yakin olani seciyor, kendi istekleriyle geri donemiyor.
Esitlikte sira: yukari, sol, asagi, sag.

sprite-kolaj-v1.png  — Scenario, 13 CU, tek kolaj
gercek-boy-sinavi.png — 42 ve 28 pikselde okunabilirlik sinavi

BILINEN KUSUR: imp digerlerinden kucuk cizilmis. Oyunda hepsi ayni
gorsel agirlikta olmali; kesim sirasinda GOVDE yuksekligine gore
olceklenecek, kutu yuksekligine gore degil.

## Olculer
Labirent 28x31 kare. 390 px genislikte kare = 13,9 px, karakter = 21 px
CSS (2x ekranda 42 gercek piksel). Sprite'lar bu boyda okunacak sekilde
tasarlandi: kalin siluet, tek duz renk, koyu kontur, buyuk gozler.
