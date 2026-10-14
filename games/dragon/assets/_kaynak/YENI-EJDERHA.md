# Yeni ejderha — üretim öncesi kontrol listesi

11 Ekim 2026. Mevcut ejderhayla yola devam edilmiyor. Bu belge, 38 parçanın
gövdeye oturmaması krizinden çıkan dersleri yeni karaktere uygular.

**Scenario kredisi sıfırlandı.** Buradaki kuralların amacı, bir daha
"üretip sonra düzeltmek" zorunda kalmamak. Her madde bir kere yaşanmış bir
hatanın karşılığı.

---

## A. Gövde (base) — her şeyin bağlı olduğu karar

Eski ejderhanın tek ve en pahalı kusuru: **omuz ve kalça yok.** Cepheden
oturuyor, kolları yanında. Takacak yer olmadığı için hiçbir kanat
inandırıcı bağlanamadı, maskeli üretim bile omzu yoktan var etmek zorunda
kaldı.

Yeni gövde üretilmeden önce şunlar kesinleşmeli:

- [ ] **Poz, kanat ve kuyruğun çıkacağı yeri gösteriyor mu?** Hafif
      dörtte üç (3/4) poz, cepheden oturan pozdan çok daha affedici:
      omuz da kalça da görünür olur.
- [ ] **Omuz çıkıntısı var mı?** Kanadın kökünün ardında kaybolacağı bir
      hacim olmalı. Düz bir sırt, kökü saklayacak yer bırakmaz.
- [ ] **Boyun ile çene arasında kolyeye yer var mı?** Eski gövdede yoktu;
      6 kolyenin hepsi çene hattının üstüne biniyordu.
- [ ] Gövde **1024 px kare**, saydam zeminde, tek dosya.

İlk üretim kanat/kuyruk DEĞİL, **sadece gövde** olmalı. Gövde onaylanmadan
tek bir aksesuar üretilmez.

## B. Parçalar — nasıl istenmeli

Sektör standardı: her parça **ortak tuvalde, kendi son konumunda** çizilir.
Bizim yaptığımız bunun tam tersiydi — her parça kendi karesinde, kendi
ölçeğinde, birbirinden habersiz üretildi.

- [ ] Mümkünse parça **gövdenin üstünde** üretilsin (maskeli üretim).
      Hizalama yapı gereği doğru olur, ışık ve perspektif de tutar.
- [ ] Maskeli üretimde **parçanın doğru bir örneğini de ikinci referans
      görsel olarak ver.** Yalnızca gövdeyi referans verince model kanadı
      ters çizdi — kol kemiğini alta koydu, pençeyi aşağı baktırdı.
- [ ] İstemde **anatomiyi açıkça yaz:** "kol kemiği üstte, ön kenarda;
      pençe kanadın dış ucunda yukarıda; zar parmakların arasından aşağı
      sarkar."
- [ ] **Stil tek cümleyle sabitlensin** ve her istemde aynen tekrarlansın.
      Eski sette `lightning` ve `crystal` çizgi film efekti, `phoenix` kuş
      kanadı, gövde ise gerçekçi 3B render — bu sonradan düzeltilemez.
- [ ] Parçalar **kolaj halinde** üretilsin (6-10 parça tek sayfada,
      ~13 CU). Hem ucuz hem stil tutarlılığını garantiliyor.

## C. Hizalama — kod tarafı (bedava)

Bu kısım çözüldü, `hizala.py` içinde çalışıyor. Yeni sette de aynısı
kullanılacak.

- [ ] Parça **kök ucundan** yerleştirilir, içerik kutusunun köşesinden
      değil. Kök = kalın olan uç; ağırlık merkezi ve kalınlığı ölçülür.
- [ ] Ölçek, **kök kalınlığı hedef eklem kalınlığına eşit** olacak şekilde
      seçilir. Böylece bütün kanatlar aynı kalınlıkta bir omuzdan çıkar.
- [ ] Toplam açıklığa **tavan** konur; ince kökten geniş açıklık çıkan
      çizimler yoksa karakteri yutar.
- [ ] Kök, gövdenin ~30 px **içine** sokulur ki silueti ardında kalsın.
- [ ] **Kanat ve kuyruk gövdenin ARKASINDA** çizilir.
      Sıra: `kanat → kuyruk → GÖVDE → taç → yüz → kolye`
- [ ] **Aynalama yönü doğrulanır.** Çizimin kökü sol altta, ucu sağ üstte
      ise o parça SAĞ tarafa aittir. Ters aynalama iki kanadı birden
      bozar ve gözden kaçması kolaydır.
- [ ] Gövdeye yaslanan parçaya (taç, kolye) **temas gölgesi** pişirilir.
- [ ] Her parça **tam 1024 tuvale, son konumunda** yazılır. Oyun kodu
      hiçbir hesap yapmaz. (Boş saydam alan WebP'de sıkışıyor: parça
      başına yalnızca ~2 KB.)

## D. Kabul testi — "oldu" demeden önce

Bu listenin tamamı geçilmeden hiçbir parça onaylanmış sayılmaz.

1. [ ] **Gerçek oyun boyunda bak:** ejderha 192 px, hub döşemesi 46 px,
       widget ikonu 34 px. 1024'te güzel duran şey 46'da lekeye dönüşebilir.
2. [ ] **Birleşme yerinin 3× yakınını** render et. Boşluk, sert kenar,
       dikiş var mı?
3. [ ] **Parçanın kendi doğruluğu:** anatomi doğru mu? Stil gövdeyle aynı mı?
4. [ ] **Bütün varyantlar aynı noktadan mı çıkıyor?** Dört farklı parçayı
       üst üste koyup eklem noktasını karşılaştır.
5. [ ] **Rastgele 12 kombinasyon** üret ve tek bir karakter gibi
       okunuyorlar mı diye bak.

Sayı ile göz çelişirse **göz haklıdır.** Bir kez "%62'si görünür" diye
ölçüp kuyrukların çubuk gibi durduğunu kaçırdım.

## E. Deneme motoru

`motor.html` — katmanları üst üste koyup anında gösterir, oyunun yapacağı
işin aynısı. Yeni sette de ilk kurulacak şey bu olmalı: tek tek dosyalara
bakarak karar verilemiyor.

- Yerel: `http://localhost:8766/games/dragon/assets/_kaynak/motor.html`
- Sunucusuz tek dosya: `ejderha-motoru.html` (görseller gömülü, çift tıkla
  açılır, telefona AirDrop'la gönderilebilir)

Tek dosya sürümünü yeniden üretmek için `motor.html` değiştikten sonra
gömme betiği tekrar çalıştırılır.

---

## Eldeki durum (devredilen)

| | Parça | Durum |
|---|---|---|
| Taç | 8 | kalibre edildi + temas gölgesi |
| Yüz işareti | 8 | sorunsuz |
| Kolye | 6 | çene hattının altına indirildi + temas gölgesi |
| Kanat | 8 | kök hizalaması, aynalama düzeltildi |
| Kuyruk | 8 | kök hizalaması |
| Kızgın yüz | 1 | maskeli üretim, dar maske, kimlik korundu |
| Maskeli kanat | 1 | **anatomisi ters**, kullanılmıyor |

91.853 kullanılabilir kombinasyon. Hepsi `katman/` içinde, 762 KB.

Açık tek kozmetik not: `celestial`, `crystal`, `flame`, `lightning`
kuyrukları diğerlerinden ince — çizimin kendisinden, hizalamadan değil.
