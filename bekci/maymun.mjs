/* MAYMUN — minihub oyunlarini rastgele oynayip hata arayan bekci.
 *
 * Model kullanmaz. Tarayiciyi dogrudan surer, JavaScript hatalarini,
 * cokmus istekleri, yatay tasmayi ve donmayi KESIN olarak yakalar.
 * Gordugu her kusurun ekran goruntusunu saklar.
 *
 * Kullanim:
 *   node maymun.mjs                   sessizce oynar
 *   node maymun.mjs --gorunur         tarayici penceresi acik, izleyebilirsin
 *   node maymun.mjs --sure 45         her oyunda 45 saniye kalir
 *   node maymun.mjs --oyun dragon     tek oyun oynar
 *   node maymun.mjs --canli-api       GERCEK sunucuya yazmasina izin verir
 *
 * Varsayilan olarak canli Worker'a giden her istek KESILIR. Boylece
 * maymun gercek skor tablosuna sahte kayit atamaz.
 */

import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const KOK = process.env.BEKCI_KOK ?? 'http://localhost:8765';
const BURASI = path.dirname(new URL(import.meta.url).pathname);
const GORUNTU = path.join(BURASI, 'goruntuler');
const RAPOR = path.join(BURASI, 'raporlar');

/* Canli arka uc. Maymun buraya yazarsa gercek oyuncularin verisine karisir. */
const CANLI_API = /minihub-bot\.[^/]*\.workers\.dev/;

/* Uc yeni oyun (kule, ilkucus, dortbekci) 2026-10-30'da eklendi.
   Listede olmadiklari icin maymun onlari HIC denememisti - oysa
   ucunde de tuvalin cerceveyi tasirdigi gercek bir hata vardi ve
   bunu maymun degil, elle bakarken bulduk. Yeni oyun eklendiginde
   bu liste de guncellenmeli. */
const OYUNLAR = ['2048', 'blockblast', 'coindrop', 'dortbekci', 'dragon',
                 'flow', 'ilkucus', 'kule', 'match3', 'snake',
                 'tripletile', 'wheelrush'];

/* ---- ayarlar ---- */
const arg = (ad, varsayilan) => {
   const i = process.argv.indexOf('--' + ad);
   return i === -1 ? varsayilan : (process.argv[i + 1] ?? true);
};
const bayrak = (ad) => process.argv.includes('--' + ad);

const AYAR = {
   gorunur: bayrak('gorunur'),
   sure: Number(arg('sure', 30)) * 1000,
   tur: Number(arg('tur', 1)),
   canliApi: bayrak('canli-api'),
   oyunlar: arg('oyun', null) ? [arg('oyun')] : OYUNLAR,
   genislik: Number(arg('genislik', 390)),   // telefon eni
   yukseklik: Number(arg('yukseklik', 844)),
};

/* ---- bulgu toplayici ---- */
const bulgular = [];
const oturumlar = [];
let sayac = 0;

function bulgu(tur, yer, mesaj, ek = {}) {
   /* Ayni hata yuzlerce kez tekrar edebilir; ilk 3'unu sakla, gerisini say. */
   /* Ekran boyu anahtara giriyor: ayni kusur farkli telefon boyunda ayri
    * bir bulgudur, cunku hangi boyda ciktigi duzeltmenin yarisidir. */
   const anahtar = `${tur}|${yer}|${EKRAN.ad}|${mesaj}`.slice(0, 300);
   const onceki = bulgular.find(b => b.anahtar === anahtar);
   if (onceki) { onceki.tekrar++; return onceki; }
   const b = { no: ++sayac, anahtar, tur, yer, ekran: EKRAN.ad, mesaj, tekrar: 1,
               zaman: new Date().toISOString(), ...ek };
   bulgular.push(b);
   return b;
}

const uyu = (ms) => new Promise(r => setTimeout(r, ms));
const ozet = (s, n = 240) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/* Her tur ayni ekran boyunda gecerse 30 tur ayni seyi test eder. Gercek
 * telefon boylari sirayla deneniyor; yatay tasma zaten boyuta bagli bir
 * kusur, onu ancak boy degisince yakalayabiliyoruz.
 * --genislik verilirse bu liste yok sayilir, o boy sabitlenir. */
const EKRANLAR = [
   { ad: 'iPhone SE',     genislik: 375, yukseklik: 667 },
   { ad: 'iPhone 14',     genislik: 390, yukseklik: 844 },
   { ad: 'iPhone 14 Max', genislik: 430, yukseklik: 932 },
   { ad: 'Pixel 7',       genislik: 412, yukseklik: 915 },
   { ad: 'dar Android',   genislik: 360, yukseklik: 800 },
];
let EKRAN = EKRANLAR[1];

/* ---- tek bir sayfayi oyna ---- */
async function oyna(tarayici, ad, url) {
   const baglam = await tarayici.newContext({
      viewport: { width: EKRAN.genislik, height: EKRAN.yukseklik },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'tr-TR',
   });
   const sayfa = await baglam.newPage();

   /* Canli sunucuya giden istekleri kes. */
   if (!AYAR.canliApi) {
      await baglam.route(CANLI_API, (yol) =>
         yol.fulfill({ status: 503, contentType: 'application/json', body: '{"bekci":"kesildi"}' }));
   }

   sayfa.on('pageerror', (e) =>
      bulgu('sayfa-hatasi', ad, ozet(e.message), { yigin: ozet(e.stack, 600) }));

   sayfa.on('console', (m) => {
      if (m.type() !== 'error') return;
      const metin = ozet(m.text());
      /* Kesilen API cagrilari bizim kendi engelimiz, hata sayilmaz. */
      if (!AYAR.canliApi && /503|bekci|Failed to fetch|NetworkError/i.test(metin)) return;
      /* Ag kesintisi oyunun kusuru degil (yukariya bak). */
      if (/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_ADDRESS_UNREACHABLE/.test(metin)) return;
      bulgu('konsol-hatasi', ad, metin);
   });

   sayfa.on('requestfailed', (r) => {
      const u = r.url();
      if (!AYAR.canliApi && CANLI_API.test(u)) return;
      const hata = r.failure()?.errorText ?? '';
      /* Internet kesilince telegram.org ve Google Fonts patliyor; bu oyunun
       * kusuru degil, bizim agimizin durumu. (Olculdu: bir turda 9 bulgunun
       * 8'i buydu.) Oyunun KENDI dosyalari KOK altinda, onlar hala denetleniyor. */
      if (/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_ADDRESS_UNREACHABLE/.test(hata)) return;
      /* ERR_ABORTED = istek yarida kesildi, cogunlukla sayfa degistigi icin.
         Bu suzgec DIS KAYNAK AYRIMINDAN ONCE gelmeli: onceden sonra geliyordu
         ve Google Fonts / telegram.org'un yarida kesilen istekleri 'dis-kaynak'
         diye raporlaniyordu. (Olculdu: 25 turluk kosuda 13 bulgunun 13'u buydu,
         gercek kusur sifirdi.) */
      if (/ERR_ABORTED/.test(hata)) return;
      if (!u.startsWith(KOK)) {
         bulgu('dis-kaynak', ad, `${ozet(hata)} — ${ozet(u, 120)}`);
         return;
      }
      /* ERR_ABORTED = istek yarida kesildi. Maymun ses/gorsel yuklenirken
       * baska sayfaya gecince bu normal olarak cikiyor; kusur degil.
       * Dosya GERCEKTEN yoksa sunucu 404 doner, onu http-hata yakaliyor.
       * (Olculdu: blockblast'ta 5 .m4a "basarisiz" gorundu, hepsi 200 donuyordu.) */
      bulgu('istek-basarisiz', ad, `${ozet(hata)} — ${ozet(u, 160)}`);
   });

   sayfa.on('response', (r) => {
      if (r.status() < 400) return;
      const u = r.url();
      if (!AYAR.canliApi && CANLI_API.test(u)) return;
      bulgu('http-hata', ad, `${r.status()} — ${ozet(u, 160)}`);
   });

   try {
      const yanit = await sayfa.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (!yanit || !yanit.ok()) {
         bulgu('acilmadi', ad, `sayfa ${yanit?.status() ?? '?'} dondu`);
      }
   } catch (e) {
      bulgu('acilmadi', ad, ozet(e.message));
      await baglam.close();
      return;
   }

   await uyu(1500);
   await yatayTasmaKontrol(sayfa, ad);

   /* ---- rastgele oynama dongusu ---- */
   const bitis = Date.now() + AYAR.sure;
   let oncekiOzet = null;
   let ayniKare = 0;
   let hamle = 0;
   /* Hic degismeyen sayfa DONMUS degildir — sadece duragandir (bir basliktan
    * ibaret bir sayfa gibi). Donma, bir ara degisip SONRA durmaktir. O yuzden
    * en az bir degisim gormeden donma bildirilmiyor. */
   let hicDegistiMi = false;
   /* Sayfa kilitlendiyse true. Kilitli sayfada Playwright'in HER
    * cagrisi asili kaliyor, bu yuzden donguden sonraki kontroller
    * ve son goruntu atlanmali — yoksa maymun temizlikte takiliyor. */
   let kilitli = false;
   /* Oturum sayaci: oyun hamlesi mi yapildi, yoksa hep pencere mi gecildi?
    * Rapora yaziliyor — "0 kusur"un sig mi derin mi oldugunu bu gosteriyor. */
   const durum = { yon: null, oyunHamlesi: 0, pencereGecildi: 0, geriDonus: 0, duraganDonem: 0 };

   /* HER HAMLE SURE SINIRLI.
    * Kilitlenmis bir sayfada yalnizca ekran goruntusu degil, $$eval,
    * click, evaluate — Playwright'in sayfaya giden HER cagrisi geri
    * donmuyor. Tek tek sarmak yetmedi; sinir hamlenin tamamina kondu.
    * 8 saniyede bitmeyen bir hamle, sayfanin cevap vermedigi anlamina
    * gelir: donma budur. (Olculdu: sonsuz donguye giren test sayfasinda
    * maymun 600 saniyede zaman asimina ugruyordu.)
    * Ic islem arkada asili kalabilir; baglam hemen kapatildigi icin
    * sorun olmuyor. */
   while (Date.now() < bitis) {
      const hamleSonucu = await Promise.race([
         (async () => {
         hamle++;
         try {
            await birHamle(sayfa, ad, durum);
         } catch { /* tiklanan sey kaybolduysa onemli degil */ }
         await uyu(350);

         /* Maymun oyundan cikmissa geri don. "Hub'a don" yolunu da test etmek
          * icin ara sira basiliyor, ama oradan donmezse oyunun kalan suresi
          * hub'da geciyordu — snake'te 44 hamlenin sonu hub'in AYARLAR paneliydi. */
         if (!sayfa.url().includes(url.replace(KOK, '')) && Date.now() < bitis - 2000) {
            durum.geriDonus++;
            await sayfa.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            await uyu(600);
         }

         /* DONMA, "ekran degismiyor" DEGILDIR.
          * Oyunlar gecersiz girdiyi yok sayiyor: flow'da noktanin uzerinden
          * baslamayan surukleme hicbir sey yapmaz, ekran duragan kalir. Bunu
          * donma saymak yanlis alarm uretiyordu (snake'te AYARLAR paneli,
          * flow'da bos tahta).
          * Gercek donma = sayfa ARTIK JAVASCRIPT'E CEVAP VERMIYOR. Ana is
          * parcacigi kilitlenmisse basit bir ifade bile donmez. Olctugumuz bu. */
         try {
            /* Ekran goruntusu SURE SINIRLI alinmali: kilitlenmis bir sayfada
             * screenshot hic donmuyor ve maymun tam yakalamasi gereken seyde
             * kendisi asiliyor (olculdu: bir tur 4,7 dakikadan 600 saniyeye
             * cikip zaman asimina ugradi). Donmezse zaten donma demektir. */
            const kare = await Promise.race([
               sayfa.screenshot({ type: 'jpeg', quality: 40 }),
               uyu(4000).then(() => null),
            ]);
            /* Ekran goruntusu zaman asimina ugradi: disaridaki yaris
               bunu zaten 'askida' olarak yakalayacak, burada sadece
               donguyu birakiyoruz. */
            if (kare === null) return 'askida';
            const h = createHash('sha1').update(kare).digest('hex');
            if (h === oncekiOzet) {
               if (++ayniKare === 12) {
                  durum.duraganDonem++;
                  const canli = await Promise.race([
                     sayfa.evaluate(() => 1 + 1).then(() => true).catch(() => false),
                     uyu(3000).then(() => false),
                  ]);
                  if (!canli) {
                     const b = bulgu('donma', ad,
                        `${hamle} hamle sonrasi sayfa JavaScript'e 3 saniye cevap vermedi`);
                     await kaydet(sayfa, b);
                  }
                  ayniKare = 0;
               }
            } else {
               if (oncekiOzet !== null) hicDegistiMi = true;
               ayniKare = 0;
            }
            oncekiOzet = h;
         } catch { /* sayfa kapandiysa gec */ }
         })().then((r) => r || 'tamam'),
         uyu(8000).then(() => 'askida'),
      ]);

      if (hamleSonucu === 'askida') {
         kilitli = true;
         const b = bulgu('donma', ad, `${hamle}. hamle 8 saniyede bitmedi — sayfa cevap vermiyor`);
         await sayfa.screenshot({
            path: path.join(GORUNTU, `bulgu-${String(b.no).padStart(3, '0')}-${ad}.png`),
            timeout: 3000,
         }).catch(() => {});
         b.goruntu = `bulgu-${String(b.no).padStart(3, '0')}-${ad}.png`;
         break;   /* kilitli sayfada oynamaya devam etmenin anlami yok */
      }

   }

   if (!kilitli) {
      await yatayTasmaKontrol(sayfa, ad);
      await bosEkranKontrol(sayfa, ad);
   }
   oturumlar.push({ yer: ad, ekran: EKRAN.ad, hamle,
                    oyunHamlesi: durum.oyunHamlesi, pencere: durum.pencereGecildi,
                    geriDonus: durum.geriDonus, duragan: durum.duraganDonem });

   /* Oyun sonu goruntusu — goz katmani bunlara bakacak.
    * Maymun oyunlar arasinda gezinebiliyor (bir oyunun "Hub'a don" dugmesine
    * basip baska bir oyuna girebilir), o yuzden dosya adi girilen oyunun degil
    * EKRANDA DURAN sayfanin adini tasiyor. Yoksa rapor yanlis oyunu suclar. */
   const sonYer = (() => {
      const m = sayfa.url().match(/\/games\/([^/?#]+)/);
      return m ? m[1] : (sayfa.url().includes('index.html') ? 'hub' : ad);
   })();
   const etiket = sonYer === ad ? ad : `${ad}-sonunda-${sonYer}`;
   if (!kilitli) {
      await sayfa.screenshot({ path: path.join(GORUNTU, `son-${etiket}.png`), timeout: 5000 })
         .catch(() => {});
   }

   /* Kapanis da sure sinirli: kilitli bir sayfanin baglami kapanmayi
      reddedebiliyor ve butun kosu orada duruyordu. */
   await Promise.race([baglam.close().catch(() => {}), uyu(6000)]);
}

/* ---- oyun basina oynama bicimi ----
 * Oyunlar farkli girdi istiyor; hepsine rastgele tiklamak cogunda hicbir sey
 * yapmiyordu (25 turluk kosuda skorlar 0 kaldi). Her oyunun kendi yolu:
 *   yon      ok tuslari (ayni yone birkac kez ust uste — 2048 boyle oynanir)
 *   kaydir   tahtada parmak kaydirma
 *   surukle  bir parcayi tutup tahtaya birakma
 *   dokun    tahtaya dokunma
 *   dugme    arayuz dugmeleri (hub, ejderha gibi tiklama oyunlari) */
const STRATEJI = {
   '2048':       'yon',
   'snake':      'yon',
   'match3':     'kaydir',
   'coindrop':   'kaydir',
   'blockblast': 'surukle',
   'flow':       'surukle',
   'tripletile': 'dokun',
   'wheelrush':  'dokun',
   'dragon':     'dugme',
   'hub':        'dugme',
};

/* Oyundan CIKARAN dugmeler. Maymun bunlara basinca oturum erken bitiyordu —
 * 20 saniyenin buyuk kismi "Oyunu bitirelim mi?" penceresinde geciyordu.
 * Artik bunlara ancak seyrek basiliyor; o yolu da test etmek gerekiyor. */
const CIKIS = /bitir|hub'a d|hub.a d|ana men|çıkış|cikis/i;
/* Oyuna DEVAM ettiren dugmeler: bir pencere acilinca once bunlar denenir. */
const DEVAM = /devam|yeni oyun|yeniden|tekrar|atla|başla|basla|oyna|vazgeç|vazgec|kapat/i;

/* Oynanan alan: once tuval, yoksa ekranin ortasindaki en buyuk kutu. */
async function tahta(sayfa) {
   const tuval = await sayfa.$('canvas');
   if (tuval) { const k = await tuval.boundingBox(); if (k && k.width > 80) return k; }
   const k = await sayfa.evaluate(() => {
      let en = null;
      for (const el of document.querySelectorAll('div, section, main, ul')) {
         const r = el.getBoundingClientRect();
         if (r.width < 120 || r.height < 120) continue;
         if (r.width > innerWidth * 0.98 && r.height > innerHeight * 0.9) continue;  // sayfanin kendisi
         const a = r.width * r.height;
         if (!en || a > en.a) en = { x: r.x, y: r.y, width: r.width, height: r.height, a };
      }
      return en;
   }).catch(() => null);
   if (k) return k;
   const g = sayfa.viewportSize();
   return { x: g.width * 0.1, y: g.height * 0.3, width: g.width * 0.8, height: g.height * 0.4 };
}

const nokta = (k, ex = 0.15) => [
   k.x + k.width * (ex + Math.random() * (1 - 2 * ex)),
   k.y + k.height * (ex + Math.random() * (1 - 2 * ex)),
];

/* ---- tek hamle: gercek bir oyuncunun yapacagi sey ---- */
async function birHamle(sayfa, ad, durum) {
   /* 1) Ekranda bir pencere varsa once onu gec. Yoksa oyun girdisi bosa gidiyor. */
   const SEC = 'button, [role="button"], a[href], .btn, [onclick]';
   /* Gorunurluk + yazi + "katman icinde mi" TEK bir sayfa cagrisinda toplaniyor.
    * Onceden her dugme icin ayri cagri yapiliyordu: hamle basina ~60 gidis-gelis,
    * bir tur 4,7 dakikadan 22,3 dakikaya cikmisti. */
   const bilgi = await sayfa.$$eval(SEC, (ogeler) => ogeler.map((n) => {
      const r = n.getBoundingClientRect();
      const c0 = getComputedStyle(n);
      const gorunur = r.width > 0 && r.height > 0 &&
                      c0.visibility !== 'hidden' && c0.display !== 'none' &&
                      Number(c0.opacity) > 0.05;
      let pencerede = false;
      for (let a = n; a && a !== document.body; a = a.parentElement) {
         const c = getComputedStyle(a);
         if ((c.position === 'fixed' || c.position === 'absolute') &&
             (parseInt(c.zIndex, 10) || 0) > 1) { pencerede = true; break; }
      }
      return { yazi: (n.innerText || '').trim(), gorunur, pencerede };
   })).catch(() => []);
   const tutamaklar = await sayfa.$$(SEC);
   const gorunur = [];
   for (let i = 0; i < Math.min(bilgi.length, tutamaklar.length, 60); i++) {
      if (bilgi[i].gorunur) gorunur.push({ el: tutamaklar[i], ...bilgi[i] });
   }
   const devamlar = gorunur.filter(d => d.pencerede && DEVAM.test(d.yazi));
   if (devamlar.length && Math.random() < 0.85) {
      durum.pencereGecildi++;
      await devamlar[Math.floor(Math.random() * devamlar.length)]
         .el.click({ timeout: 1200 }).catch(() => {});
      return;
   }

   /* 2) Oyunun kendi oynanisi. */
   const yontem = STRATEJI[ad] ?? 'dugme';

   if (yontem === 'yon' && Math.random() < 0.9) {
      /* Ayni yone ust uste basmak 2048'de taslari gercekten birlestiriyor;
       * her hamlede yon degistirmek tahtayi yerinde sayditiyordu. */
      if (durum.yon === null || Math.random() < 0.25) {
         durum.yon = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'][Math.floor(Math.random() * 4)];
      }
      await sayfa.keyboard.press(durum.yon);
      durum.oyunHamlesi++;
      return;
   }

   if ((yontem === 'kaydir' || yontem === 'surukle') && Math.random() < 0.9) {
      const k = await tahta(sayfa);
      const [x1, y1] = nokta(k);
      let x2, y2;
      if (yontem === 'kaydir') {
         /* Komsuya it: kisa ve eksenel bir kaydirma. */
         const u = Math.max(28, Math.min(k.width, k.height) / 7);
         const yatay = Math.random() < 0.5;
         x2 = x1 + (yatay ? (Math.random() < 0.5 ? -u : u) : 0);
         y2 = y1 + (yatay ? 0 : (Math.random() < 0.5 ? -u : u));
      } else {
         [x2, y2] = nokta(k);               /* parcayi tahtaya birak */
      }
      await sayfa.mouse.move(x1, y1);
      await sayfa.mouse.down();
      await sayfa.mouse.move(x2, y2, { steps: 8 });
      await sayfa.mouse.up();
      durum.oyunHamlesi++;
      return;
   }

   if (yontem === 'dokun' && Math.random() < 0.9) {
      const k = await tahta(sayfa);
      const [x, y] = nokta(k);
      await sayfa.mouse.click(x, y);
      durum.oyunHamlesi++;
      return;
   }

   /* 3) Arayuz dugmesi. Cikis dugmelerine ancak seyrek basiliyor. */
   const guvenli = gorunur.filter(d => !CIKIS.test(d.yazi));
   const havuz = (guvenli.length && Math.random() > 0.03) ? guvenli : gorunur;
   if (havuz.length) {
      await havuz[Math.floor(Math.random() * havuz.length)]
         .el.click({ timeout: 1200 }).catch(() => {});
      /* Ejderha ve hub DUGMEYLE oynaniyor; bu oyunlarda dugmeye basmak
         oyunun kendisidir. Onceden sayilmiyordu ve rapor "dragon: 0 oyun
         hamlesi" diyordu — sanki gelistirdigimiz oyun hic denenmiyormus
         gibi. Yanlis olan oyun degil, sayactı. */
      if (yontem === 'dugme') durum.oyunHamlesi++;
      return;
   }

   await sayfa.keyboard.press(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'][Math.floor(Math.random() * 6)]);
}

/* ---- yatay tasma: telefonda saga dogru kayan sayfa ---- */
async function yatayTasmaKontrol(sayfa, ad) {
   const sonuc = await sayfa.evaluate(() => {
      const k = document.documentElement;
      if (k.scrollWidth <= k.clientWidth + 2) return null;
      /* Tasmaya hangi oge sebep oluyor? */
      const sucluler = [];
      for (const el of document.querySelectorAll('body *')) {
         const r = el.getBoundingClientRect();
         if (r.width === 0) continue;
         if (r.right > k.clientWidth + 2 || r.left < -2) {
            sucluler.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} (${Math.round(r.left)}..${Math.round(r.right)})`);
         }
         if (sucluler.length >= 4) break;
      }
      return { genislik: k.scrollWidth, ekran: k.clientWidth, sucluler };
   }).catch(() => null);

   if (sonuc) {
      const b = bulgu('yatay-tasma', ad,
         `sayfa ${sonuc.genislik}px, ekran ${sonuc.ekran}px — ${sonuc.sucluler.join(' · ') || 'kaynak bulunamadi'}`);
      await kaydet(sayfa, b);
   }
}

/* ---- bos ekran: oyun aciliyor ama hicbir sey cizilmemis ---- */
async function bosEkranKontrol(sayfa, ad) {
   const bos = await sayfa.evaluate(() => {
      const g = document.body.innerText.replace(/\s+/g, '');
      const tuval = document.querySelector('canvas');
      const resim = document.images.length;
      return g.length < 3 && !tuval && resim === 0;
   }).catch(() => false);
   if (bos) {
      const b = bulgu('bos-ekran', ad, 'sayfada ne yazi, ne tuval, ne resim var');
      await kaydet(sayfa, b);
   }
}

async function kaydet(sayfa, b) {
   const dosya = path.join(GORUNTU, `bulgu-${String(b.no).padStart(3, '0')}-${b.yer}.png`);
   await sayfa.screenshot({ path: dosya, fullPage: false }).catch(() => {});
   b.goruntu = path.basename(dosya);
}

/* ---- rapor ---- */
async function raporYaz() {
   const damga = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
   const siraNo = { 'acilmadi': 0, 'sayfa-hatasi': 1, 'donma': 2, 'bos-ekran': 3,
                    'http-hata': 4, 'istek-basarisiz': 5, 'konsol-hatasi': 6, 'yatay-tasma': 7, 'dis-kaynak': 8 };
   bulgular.sort((a, b) => (siraNo[a.tur] ?? 9) - (siraNo[b.tur] ?? 9) || b.tekrar - a.tekrar);

   await fs.writeFile(path.join(RAPOR, `${damga}.json`),
      JSON.stringify({ zaman: damga, kok: KOK, ayar: AYAR, oturumlar, bulgular }, null, 2));

   const satir = [`# Bekçi raporu — ${damga.replace('T', ' ').replace(/-/g, ':').slice(0, 19)}`, ''];
   satir.push(`Adres: ${KOK} · ${AYAR.oyunlar.length} oyun · her birinde ${AYAR.sure / 1000} saniye · ${AYAR.tur} tur`);
   satir.push(AYAR.canliApi ? '**Canlı API açıktı.**' : 'Canlı API kesildi (gerçek sunucuya hiçbir şey yazılmadı).');
   satir.push('');

   /* Oynama derinligi: "0 kusur" sonucunun ne kadar anlamli oldugunu bu gosterir.
    * Hep pencere gecildiyse oyun aslinda oynanmamis demektir. */
   if (oturumlar.length) {
      const topla = (k) => oturumlar.reduce((t, o) => t + o[k], 0);
      satir.push('## Ne kadar derin oynandı', '');
      satir.push(`${oturumlar.length} oturum · ${topla('hamle')} hamle · ` +
                 `**${topla('oyunHamlesi')} gerçek oyun hamlesi** · ${topla('pencere')} pencere geçildi`);
      satir.push('');
      satir.push('| Sayfa | Oturum | Oyun hamlesi | Pencere | Geri dönüş | Durağan dönem |');
      satir.push('|---|---|---|---|---|---|');
      const yerler = [...new Set(oturumlar.map(o => o.yer))];
      for (const y of yerler) {
         const o = oturumlar.filter(x => x.yer === y);
         satir.push(`| ${y} | ${o.length} | ${o.reduce((t, x) => t + x.oyunHamlesi, 0)} | ` +
                    `${o.reduce((t, x) => t + x.pencere, 0)} | ` +
                    `${o.reduce((t, x) => t + (x.geriDonus ?? 0), 0)} | ` +
                    `${o.reduce((t, x) => t + (x.duragan ?? 0), 0)} |`);
      }
      satir.push('');
   }

   if (!bulgular.length) {
      satir.push('Hiçbir kusur bulunamadı.');
   } else {
      satir.push(`## ${bulgular.length} ayrı kusur`, '');
      satir.push('| # | Tür | Nerede | Ekran | Kaç kez | Ne |');
      satir.push('|---|---|---|---|---|---|');
      for (const b of bulgular) {
         satir.push(`| ${b.no} | ${b.tur} | ${b.yer} | ${b.ekran ?? '-'} | ${b.tekrar} | ${b.mesaj.replace(/\|/g, '\\|')} |`);
      }
      satir.push('');
      for (const b of bulgular.filter(x => x.goruntu || x.yigin)) {
         satir.push(`### ${b.no}. ${b.tur} — ${b.yer}`, '', b.mesaj, '');
         if (b.yigin) satir.push('```', b.yigin, '```', '');
         if (b.goruntu) satir.push(`![](../goruntuler/${b.goruntu})`, '');
      }
   }
   const md = path.join(RAPOR, `${damga}.md`);
   await fs.writeFile(md, satir.join('\n'));
   return md;
}

/* ---- ana ---- */
const t0 = Date.now();
await fs.mkdir(GORUNTU, { recursive: true });
await fs.mkdir(RAPOR, { recursive: true });

console.log(`Bekçi başlıyor — ${KOK}`);
console.log(AYAR.canliApi ? '!! canlı API AÇIK' : 'canlı API kesildi');

/* Kurulu Google Chrome kullaniliyor: Playwright'in kendi Chromium indirmesi
 * bu makinede acilma asamasinda takiliyor. Playwright gecici ve BOS bir profil
 * acar — senin sekmelerine, gecmisine, sifrelerine dokunmaz. */
/* Sunucu ayakta mi? Degilse 250 oturumun hepsi "acilmadi" olur ve ortaya
 * bir sey ogretmeyen bir rapor cikar. Basta durup soylemek daha dogru.
 * (Olculdu: onizleme kapaninca 1 tur 20 "acilmadi" bulgusu uretti.) */
try {
   const y = await fetch(`${KOK}/index.html`, { signal: AbortSignal.timeout(5000) });
   if (!y.ok) throw new Error(`sunucu ${y.status} dondu`);
} catch (e) {
   console.error(`\nOyun sunucusuna ulasilamadi: ${KOK}`);
   console.error(`  ${e.message}`);
   console.error('Claude Code\'da "minihub" onizlemesini baslat, sonra tekrar dene.');
   process.exit(2);
}

/* Tarayici secimi: BEKCI_TARAYICI boşsa Playwright'in KENDI chromium'u
   kullaniliyor. Once varsayilan 'chrome' idi, yani kurulu Google
   Chrome; o yerel Mac'te vardi ama GitHub'in sunucusunda YOK ve gece
   gorevi her seferinde patlardi. Yerelde kurulu Chrome'u kullanmak
   icin BEKCI_TARAYICI=chrome ver (bkz. BENIOKU.md). */
const tarayici = await chromium.launch({
   channel: process.env.BEKCI_TARAYICI || undefined,
   headless: !AYAR.gorunur,
});

/* --genislik elle verilmisse o boy sabitlenir; verilmemisse her tur sirayla
 * baska bir telefon boyu denenir. */
const BOY_SABIT = process.argv.includes('--genislik');
if (BOY_SABIT) EKRAN = { ad: 'elle', genislik: AYAR.genislik, yukseklik: AYAR.yukseklik };

for (let tur = 1; tur <= AYAR.tur; tur++) {
   if (!BOY_SABIT) EKRAN = EKRANLAR[(tur - 1) % EKRANLAR.length];
   if (AYAR.tur > 1) {
      console.log(`\n--- tur ${tur}/${AYAR.tur} · ${EKRAN.ad} ${EKRAN.genislik}x${EKRAN.yukseklik} ---`);
   }
   console.log('hub');
   await oyna(tarayici, 'hub', `${KOK}/index.html`);
   for (const o of AYAR.oyunlar) {
      console.log('  ' + o);
      await oyna(tarayici, o, `${KOK}/games/${o}/`);
   }
}

await tarayici.close();
const md = await raporYaz();
const dk = ((Date.now() - t0) / 60000).toFixed(1);
console.log(`\nBitti — ${dk} dakika, ${bulgular.length} kusur.`);
console.log(`Rapor: ${md}`);
