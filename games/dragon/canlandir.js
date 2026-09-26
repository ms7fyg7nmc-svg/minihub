/* HAREKET KATMANI
   Oyunun "tokluk" hissi buradan geliyor: bir sey kazanildiginda ekranda
   yazi belirmiyor, nesne kazanildigi yerden gittigi yere ucuyor ve
   vardigi sayac zipliyor.

   Hepsi Web Animations API ile yapiliyor: animasyonlar compositor'da
   isletiliyor, bitince onfinish ile haber veriyorlar, yani zincirlemek
   icin setTimeout tahmini gerekmiyor.

   Egriler olculdu, tahmin degil: 1'i asan cubic-bezier son degerleri
   nesnenin hedefi bir tik gecip geri oturmasini sagliyor - "pop" hissi
   tam olarak o taskintinin kendisi. */

export const POP = 'cubic-bezier(.34, 1.56, .64, 1)';   /* taskinli oturma */
export const AKIS = 'cubic-bezier(.4, 0, .2, 1)';       /* duz, yumusak gecis */

const azHareket = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function merkez(o) {
  const r = o instanceof Element ? o.getBoundingClientRect() : o;
  if (!r || (!r.width && !r.height && !r.left)) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* Nesneyi kaynaktan hedefe ucuruyor. Birden fazla parca istenirse
   hafif gecikmeyle pesi sira gidiyorlar, boylece "akin" hissi olusuyor. */
export function ucur({ kaynak, hedef, gorsel, adet = 1, boy = 30, sure = 620, bitince }) {
  const a = merkez(kaynak);
  const b = merkez(hedef);
  if (!a || !b || !gorsel || azHareket()) { bitince?.(); return; }

  const toplam = Math.max(1, Math.min(7, adet));
  let kalan = toplam;

  for (let i = 0; i < toplam; i += 1) {
    const el = document.createElement('img');
    el.className = 'ucus';
    el.src = gorsel;
    el.alt = '';
    el.style.width = `${boy}px`;
    el.style.height = `${boy}px`;
    el.style.left = `${a.x - boy / 2}px`;
    el.style.top = `${a.y - boy / 2}px`;
    document.body.appendChild(el);

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    /* Ara nokta: once yukari savrulup sonra hedefe dusuyor, duz cizgi
       yerine yay cizsin diye. Her parca biraz farkli savruluyor. */
    const sx = dx * 0.3 + (Math.random() - 0.5) * 80;
    const sy = dy * 0.2 - 55 - Math.random() * 50;

    const an = el.animate([
      { transform: 'translate3d(0, 0, 0) scale(.45)', opacity: 0 },
      { transform: `translate3d(${sx}px, ${sy}px, 0) scale(1.15)`, opacity: 1, offset: 0.3 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(.4)`, opacity: 0.9 },
    ], { duration: sure, delay: i * 55, easing: AKIS, fill: 'forwards' });

    const bitir = () => {
      el.remove();
      kalan -= 1;
      if (kalan === 0) bitince?.();
    };
    an.onfinish = bitir;
    an.oncancel = bitir;
  }
}

/* Hedefe varinca sayacin kendisi de tepki versin. */
export function zipla(el, olcek = 1.2, sure = 420) {
  if (!el || azHareket()) return;
  el.animate([
    { transform: 'scale(1)' },
    { transform: `scale(${olcek})`, offset: 0.45 },
    { transform: 'scale(1)' },
  ], { duration: sure, easing: POP });
}

/* Yeni dogan / birlesen parca yerine otururken taskinli buyuyor. */
export function belir(el, sure = 460) {
  if (!el || azHareket()) return;
  el.animate([
    { transform: 'scale(.4)', opacity: 0 },
    { transform: 'scale(1)', opacity: 1 },
  ], { duration: sure, easing: POP });
}

/* Sayi bir anda degismiyor, hedefe dogru akiyor. Sona dogru yavasliyor
   (easeOutCubic) cunku goz son rakamlari okuyabilsin istiyoruz. */
export function sayacAkit(el, bas, son, bicimle, sure = 700) {
  if (!el) return;
  if (bas === son || azHareket() || Math.abs(son - bas) < 2) {
    el.textContent = bicimle(son);
    return;
  }
  const bastan = performance.now();
  const fark = son - bas;

  (function adim(simdi) {
    const t = Math.min(1, (simdi - bastan) / sure);
    const yumusak = 1 - (1 - t) ** 3;
    el.textContent = bicimle(Math.round(bas + fark * yumusak));
    if (t < 1) requestAnimationFrame(adim);
    else el.textContent = bicimle(son);
  })(bastan);
}
