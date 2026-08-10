/* SÜRÜM DAMGALAYICI

   NE ISE YARAR: Telegram'in WebView'i ve tarayicilar JS dosyalarini
   onbellege aliyor ve yeni surum yayinlandiginda eskisini gostermeye devam
   ediyor. Adrese "?v12" gibi bir etiket eklenince adres degistigi icin
   yeniden indirmek zorunda kaliyorlar.

   NEDEN BIR BETIK GEREKTI: index.html'deki <script src> etiketini elle
   guncellemek YETMIYOR. hub.js kendi icinde "./store.js" ve "./i18n.js"
   diye baska dosyalari cagiriyor; o adreslerde etiket olmadigi icin
   tarayici onlarin ESKI kopyasini kullanmaya devam ediyordu. Sonuc:
   ekranda yeni tasarim ama eski metinler (surum numarasi 0.03 kalmisti,
   bu betik tam olarak o yuzden yazildi).

   NASIL CALISTIRILIR:
     node surum-damgala.mjs 12
   Hem HTML'deki script adreslerini hem de JS dosyalarinin ic import
   satirlarini ayni etiketle damgalar. */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const surum = process.argv[2];
if (!surum) {
  console.error('Kullanim: node surum-damgala.mjs <numara>   ornek: node surum-damgala.mjs 12');
  process.exit(1);
}

/* Aranacak yerler: kok + js + her oyun klasoru. node_modules ve gizli
   klasorler atlanir. */
function dosyalariTara(dizin, uzantilar, sonuc = []) {
  for (const ad of readdirSync(dizin)) {
    if (ad.startsWith('.') || ad === 'node_modules') continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) dosyalariTara(yol, uzantilar, sonuc);
    else if (uzantilar.some((u) => ad.endsWith(u))) sonuc.push(yol);
  }
  return sonuc;
}

let degisen = 0;

/* 1) HTML: <script src="js/hub.js?v11"> - sadece YEREL adresler.
      Telegram'in kendi betigine (https://...) dokunulmuyor. */
for (const yol of dosyalariTara('.', ['.html'])) {
  const eski = readFileSync(yol, 'utf8');
  const yeni = eski.replace(/(src="(?!https?:)[^"]*?\.js)(\?v\d+)?"/g, `$1?v${surum}"`);
  if (yeni !== eski) { writeFileSync(yol, yeni); degisen++; }
}

/* 2) JS: import ... from './store.js?v11' - goreli yollar.
      Asil onbellek sorunu buradaydi. */
for (const yol of dosyalariTara('.', ['.js'])) {
  const eski = readFileSync(yol, 'utf8');
  const yeni = eski.replace(
    /(from\s+['"])(\.[^'"]*?\.js)(\?v\d+)?(['"])/g,
    `$1$2?v${surum}$4`,
  );
  if (yeni !== eski) { writeFileSync(yol, yeni); degisen++; }
}

console.log(`${degisen} dosya v${surum} ile damgalandi`);
