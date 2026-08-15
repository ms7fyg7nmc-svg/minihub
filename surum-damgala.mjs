
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const surum = process.argv[2];
if (!surum) {
  console.error('Kullanim: node surum-damgala.mjs <numara>   ornek: node surum-damgala.mjs 12');
  process.exit(1);
}

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

for (const yol of dosyalariTara('.', ['.html'])) {
  const eski = readFileSync(yol, 'utf8');
  let yeni = eski.replace(/(src="(?!https?:)[^"]*?\.js)(\?v\d+)?"/g, `$1?v${surum}"`);
  yeni = yeni.replace(/(href="(?!https?:)[^"]*?\.css)(\?v\d+)?"/g, `$1?v${surum}"`);
  if (yeni !== eski) { writeFileSync(yol, yeni); degisen++; }
}

for (const yol of dosyalariTara('.', ['.js'])) {
  const eski = readFileSync(yol, 'utf8');
  const yeni = eski.replace(
    /(from\s+['"])(\.[^'"]*?\.js)(\?v\d+)?(['"])/g,
    `$1$2?v${surum}$4`,
  );
  if (yeni !== eski) { writeFileSync(yol, yeni); degisen++; }
}

console.log(`${degisen} dosya v${surum} ile damgalandi`);
