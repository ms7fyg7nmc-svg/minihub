/* SURUM TAZELEYICI

   Sorun: GitHub Pages, HTML'i "10 dakika onbellege al" diye isaretliyor
   (cache-control: max-age=600) ve HTML dosyalarinin URL'inde surum etiketi
   yok. Telegram'in WebView'i bu HTML'i cok daha uzun sure tutabiliyor.
   Tuttugu an da is bitiyor: o eski HTML eski ?vNNN adresli CSS/JS'leri
   cagirdigi icin, sunucuya yeni surum yuklenmis olsa bile oyuncu haftalarca
   eski oyunu oynayabiliyor. Dosyalara vurdugumuz ?vNN damgasi bu durumda
   ise yaramiyor, cunku damgayi tasiyan HTML'in kendisi eski.

   Cozum: her sayfa kendi surumunu <meta name="surum"> icinde tasiyor.
   Acilista sunucudaki surum.json onbellege ugramadan okunuyor; numara
   tutmuyorsa sayfa yeni bir adresle bir kez tazeleniyor - yeni adres yeni
   bir onbellek girdisi demek, yani HTML sunucudan taze geliyor.

   Sonsuz donguye karsi iki kilit var: tazeleme oturum basina bir kez
   yapiliyor ve sadece surum.json basariyla okunabildiyse. Aglar kopuksa
   ya da dosya yoksa hicbir sey olmuyor, oyun normal aciliyor. */

const OTURUM_ANAHTARI = 'surum_tazelendi';

export async function surumKontrol() {
  try {
    const bende = document.querySelector('meta[name="surum"]')?.content;
    if (!bende) return;

    /* Oyunlar iki klasor derinde, hub kokte. */
    const yol = location.pathname.includes('/games/') ? '../../surum.json' : 'surum.json';

    const cevap = await fetch(`${yol}?t=${Date.now()}`, { cache: 'no-store' });
    if (!cevap.ok) return;

    const { v } = await cevap.json();
    if (!v || String(v) === String(bende)) return;

    /* Bu oturumda bir kez tazeledik ve hala eskiysek, sorun onbellek
       degil demektir; tekrar tekrar yenilemeyelim. */
    if (sessionStorage.getItem(OTURUM_ANAHTARI) === String(v)) return;
    sessionStorage.setItem(OTURUM_ANAHTARI, String(v));

    location.replace(`${location.pathname}?s=${v}`);
  } catch {
    /* Ag hatasi, gizli sekme, bozuk json: sessizce vazgec. */
  }
}
