# Denenmis ama kullanilmayan varliklar

`assets/README.md` kurali: bu klasordeki hicbir sey silinmez. Her biri CU maliyetiyle uretildi.

## Orta parmak kolu (11 Ekim 2026) — KULLANILMIYOR

`kol-a.png`, `kol-b.png` bos zeminde ayri uretilmis iki kol adayi (temiz, tek parca).
`kol-a-kirpik.png` ucu kirpilip yumusatilmis hali. `kol-orta-parmak.png` tuvale
yerlestirilmis katman. `kol-sol.png` eski kol katmanindan ayrilan sol kol.
`kol-ham.png` maskeli uretimin tam govde ciktisi.

**Neden kullanilmadi:** base ejderhada OMUZ YOK. Layerize kolu kesip cikardi ve
deligi sade gobekle doldurdu - eklem yaratmadi. Orijinal kol mukemmel oturuyor
(fark 0.0014/255) cunku kol ile delik ayni cizimden kesildi; kolun konturu zaten
deligin kenari. Baska bir cizimden gelen kol o delige oturmuyor: konturu hicbir
seye denk gelmiyor, altinda baglanacak omuz yok.

**Ders:** katman yapmak YUVA YARATMAZ. Bir parcanin DEGISTIRILEBILIR olmasi icin
govdenin o eklemi cizilmis olmali. Sapka calisti cunku sapka kafanin USTUNE
konur ve altindakini gizler; kol ise govdenin PARCASI.

Poz degisiklikleri katman olarak degil, ayri govde varyanti olarak tutulmali.
