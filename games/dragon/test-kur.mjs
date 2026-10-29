/* KUR DENETCISI

   Iki referans oyunu inceledigimizde gorduk ki tek capa yetmiyor; o
   capaya UYULDUGUNU kontrol eden bir sey de gerekiyor. Yoksa kur
   dosyasi dururken oduller yine elle yazilip kayiyor.

   Bu dosya oyunun BUTUN odul tablolarini gezip su sorulari soruyor:

     1. Capa duzgun turetildi mi?
     2. Her odul sekli fiyatlanabiliyor mu? (Yeni bir odul tipi
        eklendiginde bu test patlar - bilerek.)
     3. Kilit merdiveni yildiz YIYOR mu, yoksa URETIYOR mu?
     4. Gunluk odul merdiveni yukari mi gidiyor?
     5. Gorev kademeleri yukari mi gidiyor?

   Calistirmak: node games/dragon/test-kur.mjs                        */

import { YILDIZ_YEM, YEM_DAKIKA, yemDegeri, yildizdanYem,
         sandikBeklenen, yumurtaBeklenen }
  from '/Users/vtredi/minihub/games/dragon/kur.js';
import { KILITLI_HUCRELER, GENISLEME_KILITLERI, GUNLUK_ODULLER, KAP_SURESI,
         YILDIZ_BASINA_DAKIKA, atlamaFiyati, yuvaFiyati }
  from '/Users/vtredi/minihub/games/dragon/ekonomi.js';
import { GOREV_HARITASI, KADEMELER }
  from '/Users/vtredi/minihub/games/dragon/gorevler.js';

let ok = 0, kotu = 0;
const t = (ad, sart, ek = '') => {
  if (sart) { ok++; console.log('OK   ' + ad); }
  else { kotu++; console.log('FAIL ' + ad + (ek ? '  ' + ek : '')); }
};
const bil = (s) => console.log('     · ' + s);
const bicim = (n) => Math.round(n).toLocaleString('tr-TR');

/* ---------- 1. CAPA ---------- */
console.log('\n--- 1. CAPA ---');
t('YEM_DAKIKA turetildi ve pozitif', Number.isFinite(YEM_DAKIKA) && YEM_DAKIKA > 0, `-> ${YEM_DAKIKA}`);
t('YILDIZ_YEM turetildi ve pozitif', Number.isFinite(YILDIZ_YEM) && YILDIZ_YEM > 0, `-> ${YILDIZ_YEM}`);
t('capa = yildiz dakikasi x yem dakikasi',
  Math.abs(YILDIZ_YEM - YILDIZ_BASINA_DAKIKA * YEM_DAKIKA) <= 5,
  `${YILDIZ_YEM} vs ${YILDIZ_BASINA_DAKIKA * YEM_DAKIKA}`);
bil(`1 yildiz = ${YILDIZ_BASINA_DAKIKA} dk = ${YILDIZ_YEM} yem`);

/* ---------- 2. HER ODUL FIYATLANABILIYOR MU ---------- */
console.log('\n--- 2. ODUL SEKILLERI ---');
const tumOduller = [
  ...Object.values(KILITLI_HUCRELER).map((k) => ({ ad: 'kilit', o: k.odul })),
  ...Object.values(GENISLEME_KILITLERI).map((k) => ({ ad: 'genisleme', o: k.odul })),
  ...GUNLUK_ODULLER.map((o, i) => ({ ad: `gun${i + 1}`, o })),
  ...KADEMELER.flatMap((k) => GOREV_HARITASI[k].map((g) => ({ ad: g.id, o: g.odul }))),
];
let patlayan = 0;
for (const { ad, o } of tumOduller) {
  try { const d = yemDegeri(o); if (!Number.isFinite(d) || d < 0) { patlayan++; console.log(`     ! ${ad}: gecersiz deger ${d}`); } }
  catch (e) { patlayan++; console.log(`     ! ${ad}: ${e.message}`); }
}
t(`${tumOduller.length} odulun hepsi fiyatlanabiliyor`, patlayan === 0, `-> ${patlayan} tanesi olmadi`);
t('taninmayan odul sessizce 0 donmuyor', (() => {
  try { yemDegeri({ zumrut: 5 }); return false; } catch { return true; }
})());

/* ---------- 3. KILIT MERDIVENI: SINK MI, KAYNAK MI ---------- */
console.log('\n--- 3. KILIT MERDIVENI ---');

/* En ucuzdan baslayarak acan oyuncunun yildiz kasasini takip ediyor.
   Hicbir noktada sifirin ustune cikmamali: ciksa merdiven kendi
   kendini finanse eder ve kilitler gider olmaktan cikar. */
function merdivenDenetle(ad, tablo) {
  const sirali = Object.entries(tablo)
    .map(([i, k]) => ({ i: Number(i), ...k }))
    .sort((a, b) => a.fiyat - b.fiyat);

  let kasa = 0, enIyi = 0, masraf = 0, gelir = 0;
  const uretenler = [];
  for (const k of sirali) {
    kasa -= k.fiyat;
    masraf += k.fiyat;
    const y = Number(k.odul?.stars) || 0;
    if (y) { kasa += y; gelir += y; }
    if (y > k.fiyat) uretenler.push(`hucre ${k.i}: -${k.fiyat} +${y} = net +${y - k.fiyat}`);
    enIyi = Math.max(enIyi, kasa);
  }

  bil(`${ad}: ${sirali.length} kilit, masraf ${bicim(masraf)} yildiz, yildiz odulu ${bicim(gelir)}`);
  t(`${ad}: merdiven net yildiz GIDERI`, gelir < masraf,
    `net ${gelir - masraf > 0 ? '+' : ''}${gelir - masraf}`);
  t(`${ad}: hicbir kilit tek basina yildiz uretmiyor`, uretenler.length === 0,
    uretenler.length ? '\n       ' + uretenler.join('\n       ') : '');
  t(`${ad}: en ucuzdan acan oyuncu kara gecemiyor`, enIyi <= 0, `en yuksek kasa +${enIyi}`);
  return { masraf, gelir };
}

const a = merdivenDenetle('4x4 kilitleri', KILITLI_HUCRELER);
const b = merdivenDenetle('5x5 genislemesi', GENISLEME_KILITLERI);
const toplamNet = (a.gelir + b.gelir) - (a.masraf + b.masraf);
t('16 kilidin tamami net gider', toplamNet < 0, `net ${toplamNet > 0 ? '+' : ''}${toplamNet} yildiz`);

/* ---------- 4. GUNLUK ODUL MERDIVENI ---------- */
console.log('\n--- 4. GUNLUK ODUL ---');
const gunler = GUNLUK_ODULLER.map((o, i) => ({ gun: i + 1, o, d: yemDegeri(o) }));
for (const g of gunler) bil(`Gun ${g.gun}: ${bicim(g.d)} yem degerinde`);
const dususler = gunler.filter((g, i) => i > 0 && g.d < gunler[i - 1].d)
  .map((g) => `gun ${g.gun} (${bicim(g.d)}) < gun ${g.gun - 1} (${bicim(gunler[g.gun - 2].d)})`);
t('hafta bastan sona yukari gidiyor', dususler.length === 0,
  dususler.length ? '\n       ' + dususler.join('\n       ') : '');

/* ---------- 5. GOREV KADEMELERI ---------- */
console.log('\n--- 5. GOREVLER ---');
let oncekiKademeToplam = 0;
for (const k of KADEMELER) {
  const liste = GOREV_HARITASI[k].map((g) => ({ id: g.id, d: yemDegeri(g.odul) }));
  const toplam = liste.reduce((s, g) => s + g.d, 0);
  bil(`${k}: toplam ${bicim(toplam)} yem degeri  [${liste.map((g) => bicim(g.d)).join(' · ')}]`);
  t(`${k} kademesi oncekinden daha cok odiyor`, toplam > oncekiKademeToplam,
    `${bicim(toplam)} vs ${bicim(oncekiKademeToplam)}`);
  oncekiKademeToplam = toplam;
}

/* Kademe sonu gorevi (7.) o kademenin en buyuk odulu olmali: oyuncuyu
   kademeyi bitirmeye cekmesi gereken sey o. */
for (const k of KADEMELER) {
  const liste = GOREV_HARITASI[k].map((g) => yemDegeri(g.odul));
  const son = liste[liste.length - 1];
  t(`${k}: kademe sonu en buyuk odul`, son === Math.max(...liste),
    `son ${bicim(son)}, en buyuk ${bicim(Math.max(...liste))}`);
}

/* ---------- 6. BILGI: SANDIK ATLAMA KURU ---------- */
console.log('\n--- 6. SANDIK ATLAMA (bilgi) ---');
const oranlar = [];
for (let lv = 1; lv <= 4; lv++) {
  const e = sandikBeklenen('food', lv);
  const atla = atlamaFiyati(KAP_SURESI[lv]);
  oranlar.push(e / atla);
  bil(`Lv${lv}: ${atla} yildizla atlanir, ${bicim(e)} yem verir -> ${bicim(e / atla)} yem/yildiz`);
}
const yayilma = Math.max(...oranlar) / Math.min(...oranlar);
bil(`yayilma ${yayilma.toFixed(1)} kat (capa ${YILDIZ_YEM} yem/yildiz)`);
t('atlama kuru capanin 3 katini gecmiyor', Math.max(...oranlar) <= YILDIZ_YEM * 3,
  `en yuksek ${bicim(Math.max(...oranlar))}`);

console.log(`\n${ok} basarili, ${kotu} basarisiz\n`);
process.exit(kotu ? 1 : 0);
