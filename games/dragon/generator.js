/* GENERATOR — yalnizca SAHIP gorur.
 *
 * Katmanlari ust uste koyup kombinasyon dener. Hicbir hizalama hesabi
 * yapmaz: her katman dosyasi 1024'luk tam tuvalde, kendi son
 * konumundadir. assets/generator/katmanlar.json yuvalari, cizim
 * sirasini ve cakisma kurallarini tasir.
 *
 * Sekme sunucu "sahip: true" demedikce DOM'a bile eklenmiyor; sahip
 * olmayan oyuncu bu dosyayi hic indirmiyor (dinamik import).
 */
const KOK = 'assets/generator/';

/* katmanlar.json'u surumle cagiriyoruz. Surum damgalayici yalnizca
   .js ve .css'i damgaliyor; JSON damgasiz kalinca yeni parca ekledigimde
   oyuncunun tarayicisi eski listeyi onbellekten veriyor ve yeni
   aksesuarlar hic gorunmuyordu. Sayfanin kendi <meta name="surum">
   degerini kullanmak bunu kendiliginden guncel tutuyor. */
const SURUM = document.querySelector('meta[name="surum"]')?.content || '';

let veri = null;          // katmanlar.json
const secim = {};         // yuva adi -> dosya adi ('' = bos)

async function yukle() {
  if (veri) return veri;
  const r = await fetch(KOK + 'katmanlar.json' + (SURUM ? '?v' + SURUM : ''));
  veri = await r.json();
  veri.yuvalar.forEach((y) => {
    secim[y.ad] = y.zorunlu && y.parcalar.length ? y.parcalar[0].dosya : '';
  });
  return veri;
}

/* Bir yuva doluyken gizlenecek katmanlar. Sapka boynuzu gizler cunku
   boynuzlar sapkanin DISINA tasiyor; cizim sirasiyla gizlenemiyorlar. */
function gizliler() {
  const g = new Set();
  for (const [ad, k] of Object.entries(veri.cakismalar || {})) {
    if (secim[ad] && Array.isArray(k.gizler)) k.gizler.forEach((x) => g.add(x));
  }
  return g;
}

function cakismayiUygula(ad) {
  const k = (veri.cakismalar || {})[ad];
  if (secim[ad] && k && Array.isArray(k.birlikte_olamaz)) {
    k.birlikte_olamaz.forEach((x) => { secim[x] = ''; });
  }
}

function yiginHTML() {
  const g = gizliler();
  return veri.yuvalar
    .filter((y) => secim[y.ad] && !g.has(y.ad))
    .map((y) => `<img src="${KOK}${secim[y.ad]}" alt="">`)
    .join('');
}

function kombinasyonSayisi() {
  return veri.yuvalar.reduce(
    (n, y) => n * (y.parcalar.length + (y.zorunlu ? 0 : 1) || 1), 1);
}

function rastgele() {
  veri.yuvalar.forEach((y) => {
    const p = y.parcalar;
    if (!p.length) { secim[y.ad] = ''; return; }
    if (y.zorunlu) secim[y.ad] = p[(Math.random() * p.length) | 0].dosya;
    else secim[y.ad] = Math.random() < 0.45 ? p[(Math.random() * p.length) | 0].dosya : '';
  });
  Object.keys(veri.cakismalar || {}).forEach(cakismayiUygula);
}

function ciz(kok) {
  const h = yiginHTML();
  kok.querySelector('#gen-buyuk').innerHTML = h;
  kok.querySelector('#gen-kucuk').innerHTML = h;
  kok.querySelectorAll('select[data-yuva]').forEach((s) => {
    s.value = secim[s.dataset.yuva] || '';
  });
  const g = gizliler();
  kok.querySelectorAll('.gen-yuva').forEach((d) => {
    d.classList.toggle('gizli', g.has(d.dataset.yuva));
  });
}

/* Kombinasyonu PNG olarak indir: katmanlari canvas'a cizip blob verir. */
async function indir() {
  const g = gizliler();
  const yollar = veri.yuvalar
    .filter((y) => secim[y.ad] && !g.has(y.ad))
    .map((y) => KOK + secim[y.ad]);
  const [w, h] = veri.tuval;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (const yol of yollar) {
    const im = new Image();
    im.src = yol;
    await im.decode();
    ctx.drawImage(im, 0, 0, w, h);
  }
  const url = c.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ejderha.png';
  a.click();
}

export async function generatorKur(kok) {
  await yukle();
  const yuvaHTML = veri.yuvalar.map((y) => {
    const bos = y.zorunlu ? '' : '<option value="">— yok —</option>';
    const secenek = y.parcalar
      .map((p) => `<option value="${p.dosya}">${p.ad}</option>`).join('');
    return `<div class="gen-yuva" data-yuva="${y.ad}">
        <label>${y.ad}${y.capa ? `<i>${y.capa}</i>` : ''}</label>
        <select data-yuva="${y.ad}">${bos}${secenek}</select>
      </div>`;
  }).join('');

  kok.innerHTML = `
    <div class="gen-sahne">
      <div class="gen-yigin buyuk" id="gen-buyuk"></div>
      <div class="gen-kucuk-sar">
        <div class="gen-yigin kucuk" id="gen-kucuk"></div>
        <small>192 px — ızgaradaki boy</small>
      </div>
    </div>
    <div class="gen-dugmeler">
      <button class="btn btn-red" id="gen-rastgele">Rastgele</button>
      <button class="btn btn-grey" id="gen-indir">PNG indir</button>
    </div>
    <div class="gen-panel">${yuvaHTML}</div>
    <p class="gen-not">
      <b id="gen-sayi"></b> olası kombinasyon.
      Katmanlar 1024 px tuvalde kendi son konumunda duruyor; oyun hiçbir
      hizalama hesabı yapmıyor, sırayla üst üste koyuyor.
      Şapka takılıyken boynuz gizleniyor, şapka ve taç birlikte çıkamıyor.
    </p>`;

  kok.querySelector('#gen-sayi').textContent =
    kombinasyonSayisi().toLocaleString('tr-TR');

  kok.querySelector('.gen-panel').addEventListener('change', (e) => {
    const s = e.target.closest('select[data-yuva]');
    if (!s) return;
    secim[s.dataset.yuva] = s.value;
    cakismayiUygula(s.dataset.yuva);
    ciz(kok);
  });
  kok.querySelector('#gen-rastgele').addEventListener('click', () => {
    rastgele(); ciz(kok);
  });
  kok.querySelector('#gen-indir').addEventListener('click', indir);

  rastgele();
  ciz(kok);
}
