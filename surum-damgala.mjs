
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const surum = process.argv[2];
if (!surum) {
  console.error('Kullanim: node surum-damgala.mjs <numara>   ornek: node surum-damgala.mjs 12');
  process.exit(1);
}

function dosyalariTara(dizin, uzantilar, sonuc = []) {
  for (const ad of readdirSync(dizin)) {
    /* Alt cizgiyle baslayan klasorleri GitHub Pages yayinlamiyor
       (bkz. assets/README.md). Oradaki dosyalar oyuncuya hic inmedigi
       icin onbellek damgasina da ihtiyaclari yok; damgalamak sadece
       git farkini gurultuye bogardi. games/_pet ve games/_watersort
       bu yuzden atlaniyor. */
    if (ad.startsWith('.') || ad.startsWith('_') || ad === 'node_modules') continue;
    /* bot/: Cloudflare Worker esbuild ile derleniyor, ?vNN import'u bozar.
       standalone-apps/: ayri paketlenen kopyalar, hub surumunden bagimsiz. */
    if (dizin === '.' && (ad === 'bot' || ad === 'standalone-apps')) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) dosyalariTara(yol, uzantilar, sonuc);
    else if (uzantilar.some((u) => ad.endsWith(u))) sonuc.push(yol);
  }
  return sonuc;
}

let degisen = 0;

for (const yol of dosyalariTara('.', ['.html'])) {
  const eski = readFileSync(yol, 'utf8');
  let yeni = eski.replace(/(src="(?!https?:)[^"]*?\.js)(\?v\d+)?"/g, `$1?v${surum}"`);
  yeni = yeni.replace(/(href="(?!https?:)[^"]*?\.css)(\?v\d+)?"/g, `$1?v${surum}"`);

  /* Sayfa kendi surumunu tasiyor. js/guncel.js bunu sunucudaki
     surum.json ile karsilastirip eskiyse sayfayi tazeliyor - yoksa
     Telegram'in WebView'i eski HTML'i tutup eski ?vNN dosyalarini
     cagirmaya devam ediyor ve guncellemeler oyuncuya hic ulasmiyor. */
  const etiket = `<meta name="surum" content="${surum}">`;
  if (/<meta name="surum" content="\d+">/.test(yeni)) {
    yeni = yeni.replace(/<meta name="surum" content="\d+">/, etiket);
  } else {
    yeni = yeni.replace(/(<meta charset="[^"]*">)/i, `$1\n  ${etiket}`);
  }

  if (yeni !== eski) { writeFileSync(yol, yeni); degisen++; }
}

for (const yol of dosyalariTara('.', ['.js'])) {
  const eski = readFileSync(yol, 'utf8');
  /* IKI KALIP birden: statik `from './x.js'` ve DINAMIK `import('./x.js')`.
     Uzun sure yalnizca ilki vardi ve js/store.js icindeki
     `import('./tani.js?v210')` yirmi dokuz surum boyunca v210'da asili
     kaldi. Kimse fark etmedi cunku dosya sorgu dizesinden bagimsiz
     servis ediliyor - yani kod CALISIYORDU; bozulan sey onbellek
     kirilmasiydi. Tarayicisinda v210 duran oyuncu, telefonda ne
     oldugunu anlatmasi gereken tani kaydinin eski kopyasini
     calistirmaya devam ediyordu. */
  let yeni = eski.replace(
    /(from\s+['"])(\.[^'"]*?\.js)(\?v\d+)?(['"])/g,
    `$1$2?v${surum}$4`,
  );
  yeni = yeni.replace(
    /(import\s*\(\s*['"])(\.[^'"]*?\.js)(\?v\d+)?(['"])/g,
    `$1$2?v${surum}$4`,
  );
  if (yeni !== eski) { writeFileSync(yol, yeni); degisen++; }
}

writeFileSync('surum.json', `{ "v": ${surum} }\n`);

console.log(`${degisen} dosya v${surum} ile damgalandi, surum.json yazildi`);
