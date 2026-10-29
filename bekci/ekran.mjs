/* EKRAN — tek bir oyunun telefon boyutunda ekran goruntusunu alir.

   NEDEN AYRI BIR ARAC

   Gece ajani GitHub'in sunucusunda calisiyor ve orada Claude'un kendi
   tarayici penceresi YOK. Anayasa her gorsel is icin once/sonra ekran
   goruntusu istiyor (bolum 7), yani ajanin kaniti kendi uretebilmesi
   lazim. Bu dosya onu veriyor.

   Kullanim:
     node bekci/ekran.mjs <oyun> <cikti.png> [--bekle 2500] [--once]

     <oyun>     oyun klasorunun adi, ya da 'hub' icin hub
     --bekle    sayfa acildiktan sonra kac ms beklenecek
     --once     'Baslamak icin dokun' perdesine dokunmadan cek

   Adres BEKCI_KOK ile degisir (varsayilan http://localhost:8765).

   DIKKAT: oyunlarin cogu requestAnimationFrame ile ciziliyor ve bazi
   ortamlarda rAF saniyede 1-2 kare calisiyor. Bu yuzden 'bekle' suresi
   comert tutuldu; kisa tutulursa oyun henuz hicbir sey cizmemis olur
   ve bos bir kare cikar. */

import { chromium } from 'playwright';

const KOK = process.env.BEKCI_KOK ?? 'http://localhost:8765';
const CANLI_API = /minihub-bot\.[^/]*\.workers\.dev/;

const arg = (ad, varsayilan) => {
  const i = process.argv.indexOf('--' + ad);
  return i === -1 ? varsayilan : (process.argv[i + 1] ?? true);
};

const oyun = process.argv[2];
const cikti = process.argv[3];
if (!oyun || !cikti) {
  console.error('Kullanim: node bekci/ekran.mjs <oyun|hub> <cikti.png> [--bekle 2500] [--once]');
  process.exit(1);
}

const bekle = Number(arg('bekle', 2500));
const dokunma = process.argv.includes('--once');
const adres = oyun === 'hub' ? `${KOK}/index.html` : `${KOK}/games/${oyun}/index.html`;

const tarayici = await chromium.launch({
  channel: process.env.BEKCI_TARAYICI || undefined,
  headless: true,
});

/* Telefon olcusu: maymunun kullandigi varsayilanla ayni kalsin ki iki
   aracin goruntuleri karsilastirilabilir olsun. */
const baglam = await tarayici.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

/* Canli API KESILIYOR. Gece ajani gercek sunucuya hicbir sey yazmamali;
   maymunda da ayni kural var. Kesilmezse ekran goruntusu almak bile
   oyuncu kayitlarina dokunabilirdi. */
await baglam.route(CANLI_API, (yol) => yol.fulfill({
  status: 503, contentType: 'application/json', body: '{"hata":"bekci"}',
}));

/* OYUN SAYFALARI DOGRUDAN ACILMIYOR. Her oyunun index.html'inde bir
   kapi var: sessionStorage'da 'mh_hub_open' damgasi yoksa sayfa kendini
   hub'a atiyor ("Uygulama dogrudan bu oyun sayfasinda acildiysa once
   hub'i goster"). Damga hub acildiginda konuyor.

   Bu kapi dogru bir davranis, kaldirilmamali. Ama arac ona uymazsa her
   seferinde HUB'in ekran goruntusunu alir ve oyunu cektigini sanir -
   gece ajani da o goruntuyu "kanit" diye PR'a koyardi. Ilk denemede
   tam olarak bu oldu.

   addInitScript sayfa kodundan ONCE calisiyor, yani damga kapi
   kontrolune yetisiyor. */
await baglam.addInitScript(() => {
  try { sessionStorage.setItem('mh_hub_open', '1'); } catch (e) {}
});

const sayfa = await baglam.newPage();
const hatalar = [];
sayfa.on('pageerror', (e) => hatalar.push(String(e)));
sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });

await sayfa.goto(adres, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sayfa.waitForTimeout(bekle);

/* Cogu oyun 'Baslamak icin dokun' perdesiyle aciliyor; perdeli hali
   oyunun kendisini gostermiyor. --once verilmediyse bir kere dokunup
   oyunu baslatiyoruz. */
if (!dokunma) {
  const tuval = await sayfa.$('canvas');
  if (tuval) {
    const k = await tuval.boundingBox();
    if (k) await sayfa.mouse.click(k.x + k.width / 2, k.y + k.height / 2);
    await sayfa.waitForTimeout(Math.min(2000, bekle));
  }
}

await sayfa.screenshot({ path: cikti });
await tarayici.close();

console.log(`${cikti} yazildi — ${adres}`);
if (hatalar.length) {
  console.log(`DIKKAT: ${hatalar.length} konsol hatasi:`);
  for (const h of hatalar.slice(0, 5)) console.log('  ' + h.slice(0, 200));
}
