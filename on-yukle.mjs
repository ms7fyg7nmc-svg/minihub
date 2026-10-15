/* MODUL ON YUKLEME ETIKETLERINI URET.

   Her sayfanin <script type="module"> girisinden baslayip import
   agacini cikariyor ve her modul icin bir <link rel="modulepreload">
   yaziyor. Boylece tarayici modulleri giris dosyasini ayristirmayi
   BEKLEMEDEN, hepsini birden indiriyor.

   Neden elle yazilmiyor: ag degistikce liste bozulur. Eksik kalan bir
   modul merdiveni geri getirir, fazladan yazilan bir modul bosuna
   indirilir. Bu betik agaci dosyalardan okuyor.

   Adresler ?vNN TASIMADAN yaziliyor; surum damgalayici (surum-damgala.mjs)
   href="...js" kaliplarini da damgaliyor ve import'takiyle ayni surumu
   koyuyor. Adres harfi harfine ayni olmazsa tarayici dosyayi IKI KEZ
   indirir.

   Kullanim: node on-yukle.mjs   (sonra: node surum-damgala.mjs <n>)
*/
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const BAS = '  <!-- ON YUKLEME: otomatik uretildi, elle duzenleme (node on-yukle.mjs) -->';
const SON = '  <!-- /ON YUKLEME -->';

function importlar(dosya) {
  const s = readFileSync(dosya, 'utf8');
  const bul = [...s.matchAll(/from\s+['"](\.[^'"]+?\.js)(\?v\d+)?['"]/g)].map((m) => m[1]);
  return [...new Set(bul)];
}

function agac(giris) {
  const gorulen = new Set();
  const sira = [giris];
  while (sira.length) {
    const d = sira.shift();
    if (gorulen.has(d) || !existsSync(d)) continue;
    gorulen.add(d);
    for (const i of importlar(d)) sira.push(resolve(dirname(d), i));
  }
  gorulen.delete(giris);
  return [...gorulen];
}

function sayfalar() {
  const out = [];
  if (existsSync('index.html')) out.push('index.html');
  for (const g of readdirSync('games')) {
    if (g.startsWith('_') || g.startsWith('.')) continue;
    const y = join('games', g, 'index.html');
    if (existsSync(y)) out.push(y);
  }
  return out;
}

let degisen = 0;
for (const sayfa of sayfalar()) {
  let html = readFileSync(sayfa, 'utf8');
  const m = html.match(/<script type="module" src="([^"?]+)(\?v\d+)?"><\/script>/);
  if (!m) continue;
  const giris = resolve(dirname(sayfa), m[1]);
  const moduller = agac(giris).map((d) => relative(dirname(sayfa), d).split('\\').join('/'));
  if (!moduller.length) continue;

  const blok = [BAS, `  <link rel="modulepreload" href="${m[1]}">`,
    ...moduller.sort().map((d) => `  <link rel="modulepreload" href="${d.startsWith('.') ? d : './' + d}">`),
    SON].join('\n');

  const varMi = html.includes(BAS);
  if (varMi) {
    html = html.replace(new RegExp(`${BAS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${SON.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), blok);
  } else {
    html = html.replace(/(<script src="https:\/\/telegram\.org\/js\/telegram-web-app\.js"><\/script>\n)/,
      `$1\n${blok}\n`);
  }
  writeFileSync(sayfa, html);
  console.log(`${sayfa}: ${moduller.length + 1} modul`);
  degisen++;
}
console.log(`${degisen} sayfa guncellendi`);
