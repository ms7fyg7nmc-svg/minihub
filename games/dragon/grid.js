/* BIRLESTIRME IZGARASI
   Hucrelerde uc tur nesne durabilir: yumurta, yem sandigi, yildiz sandigi.
   Ayni turden ve ayni seviyeden iki nesne ust uste surukleninde bir ust
   seviye oluyor. Kilitli hucreler yildizla aciliyor ve icindeki odulu
   dogrudan oyuncuya veriyor. */

import { EN_UST_YUMURTA, EN_UST_SANDIK, kapSuresi } from './ekonomi.js?v220';
import { belir, zipla, AKIS } from './canlandir.js?v220';
import { iz } from '../../js/tani.js?v220';

/* Kap gorselleri v2: kaplar artik ACIK ve iceriklerini gosteriyor.
   Eski set sekiz kabin da ayni kirmizi kutu olmasi yuzunden 64 pikselde
   et kesesiyle yildiz kesesini ayirt ettirmiyordu - oyuncu neyi
   acacagini ve hangisinin hangisiyle birlesecegini goremiyordu.
   Artik renk para birimini (sicak=et, soguk=yildiz), sekil kademeyi
   anlatiyor. Lv2 artik piknik sepeti degil cuval.

   Klasor v2: gorseller ?v damgasi tasimadigi icin ayni isimle uzerine
   yazmak tarayicilara eskisini sunmaya devam ettiriyordu. */
const SANDIK_ADI = { 1: 'pouch', 2: 'sack', 3: 'chest', 4: 'royal' };

/* Izgarada bir oge en fazla ~64 CSS px ciziliyor; DPR 3'te 192 gercek
   piksel yetiyor. 256'lik kaynaklar duruyor ama sayfa 192'likleri cekiyor:
   ayni netlik, 1.8 kat az cozme isi. */
export function gorselYolu(hucre) {
  if (!hucre) return '';
  if (hucre.t === 'egg') return `assets/eggs/egg-${Math.min(EN_UST_YUMURTA, hucre.lv)}-192.webp`;
  const onek = hucre.t === 'star' ? 'star' : 'meat';
  return `../../assets/packs/v2/${onek}-${SANDIK_ADI[Math.min(EN_UST_SANDIK, hucre.lv)]}-192.webp`;
}

/* 8:24 / 1:05:00 gibi kisa bicim - hucreye sigmasi gerekiyor */
export function sureKisa(ms) {
  const sn = Math.max(0, Math.ceil(ms / 1000));
  const sa = Math.floor(sn / 3600);
  const dk = Math.floor((sn % 3600) / 60);
  const kn = sn % 60;
  if (sa > 0) return `${sa}:${String(dk).padStart(2, '0')}`;
  return `${dk}:${String(kn).padStart(2, '0')}`;
}

export function onYukleListesi() {
  const liste = [];
  for (let i = 1; i <= EN_UST_YUMURTA; i += 1) liste.push(gorselYolu({ t: 'egg', lv: i }));
  for (let i = 1; i <= EN_UST_SANDIK; i += 1) {
    liste.push(gorselYolu({ t: 'food', lv: i }));
    liste.push(gorselYolu({ t: 'star', lv: i }));
  }
  return liste;
}

export const kilitliMi = (h) => !!h && h.kilit === true;
export const nesneMi = (h) => !!h && !h.kilit;
export const kapMi = (h) => nesneMi(h) && h.t !== 'egg';

/* Kap acma sayacinin durumu: baslamamis / iliyor / hazir */
export function kapDurumu(h, simdi = Date.now()) {
  if (!kapMi(h)) return null;
  if (!h.acilis) return { hal: 'bekliyor', kalan: kapSuresi(h.lv) };
  const kalan = h.acilis + kapSuresi(h.lv) - simdi;
  return kalan <= 0 ? { hal: 'hazir', kalan: 0 } : { hal: 'iliyor', kalan };
}

export const enUstSeviye = (tip) => (tip === 'egg' ? EN_UST_YUMURTA : EN_UST_SANDIK);

export function bosHucreVarMi(grid) {
  return grid.cells.some((c) => c === null);
}

/* Bos ve acik bir hucreye nesne koyar; yer yoksa -1 doner. */
export function nesneKoy(grid, nesne) {
  const bos = grid.cells.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  if (!bos.length) return -1;
  const i = bos[Math.floor(Math.random() * bos.length)];
  grid.cells[i] = { ...nesne };
  return i;
}

export function createBoard(el, { onMerge, onPick, onChange } = {}) {
  let grid = null;
  let surukle = null;
  let secili = -1;   /* bilgi paneli icin secili hucre */

  /* IZGARA CIZIMI - ARTIMLI

     Eskiden her cizim `el.innerHTML = ''` ile 16 hucreyi de yok edip
     bastan kuruyordu. Bir birlestirmede ciz() iki ya da uc kez
     cagriliyor, yani telefon tek bir hamlede 48 yeni <img> olusturuyordu.
     Iki sonucu vardi:

       1. Gorunur takilma. Her img yeniden cozulmek zorundaydi.
       2. Birlestirme animasyonu HIC gorunmuyordu - zipla() ve patlat()
          calistiktan hemen sonra siradanDoldur() yeni bir ciz() yapip
          animasyonun uzerinde oldugu elementi cope atiyordu.

     Artik hucre elemanlari yasiyor; sadece icerigi degisen hucre
     yeniden yaziliyor. Imza, hucrenin DOM'unu belirleyen her seyi
     tutuyor - geri sayim yazisi haric, onu sayaclariTazele guncelliyor. */

  let hucreEl = [];        /* indeksine gore hucre elemanlari */
  let cizilen = [];        /* en son cizilen imzalar */
  let cizilenN = 0;

  function imza(hucre) {
    if (kilitliMi(hucre)) return `k${hucre.fiyat}:${hucre.odul?.t}${hucre.odul?.lv}`;
    if (!nesneMi(hucre)) return '0';
    const d = kapDurumu(hucre);
    return `n${hucre.t}${hucre.lv}:${d ? d.hal : '-'}`;
  }

  function hucreIskelet() {
    el.style.setProperty('--n', grid.n);
    el.innerHTML = '';
    hucreEl = [];
    cizilen = [];
    grid.cells.forEach((_, i) => {
      const satir = Math.floor(i / grid.n);
      const sutun = i % grid.n;
      const cell = document.createElement('div');
      cell.className = `cell${(satir + sutun) % 2 ? ' alt' : ''}`;
      cell.dataset.i = String(i);
      hucreEl.push(cell);
      cizilen.push(null);
      el.appendChild(cell);
    });
    cizilenN = grid.n;
  }

  function hucreDoldur(cell, hucre, i) {
    const satir = Math.floor(i / grid.n);
    const sutun = i % grid.n;
    /* className bastan yaziliyor, o yuzden secili hali burada korunuyor;
       surukleme sinifi ise bitir() tarafindan elle temizleniyor. */
    cell.className = `cell${(satir + sutun) % 2 ? ' alt' : ''}${i === secili ? ' sel' : ''}`;
    cell.innerHTML = '';
    delete cell.dataset.lv;
    delete cell.dataset.t;

    if (kilitliMi(hucre)) {
      cell.classList.add('locked');
      const img = document.createElement('img');
      img.className = 'peek';
      img.src = gorselYolu(hucre.odul);
      img.alt = '';
      img.draggable = false;
      cell.appendChild(img);

      const kilit = document.createElement('span');
      kilit.className = 'lock';
      kilit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0110 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/></svg>';
      cell.appendChild(kilit);
      return;
    }

    if (!nesneMi(hucre)) return;

    cell.dataset.lv = String(hucre.lv);
    cell.dataset.t = hucre.t;

    const wrap = document.createElement('div');
    wrap.className = 'piece';
    wrap.dataset.i = String(i);

    const img = document.createElement('img');
    img.src = gorselYolu(hucre);
    img.alt = '';
    img.draggable = false;
    wrap.appendChild(img);
    cell.appendChild(wrap);

    const durum = kapDurumu(hucre);
    if (durum && durum.hal !== 'bekliyor') {
      cell.classList.add(durum.hal === 'hazir' ? 'kap-hazir' : 'kap-iliyor');
      if (durum.hal === 'iliyor') {
        const rozet = document.createElement('span');
        rozet.className = 'kap-sayac';
        rozet.dataset.i = String(i);
        rozet.textContent = sureKisa(durum.kalan);
        cell.appendChild(rozet);
      }
    }
  }

  function ciz() {
    if (!grid) return;
    if (cizilenN !== grid.n || hucreEl.length !== grid.cells.length) hucreIskelet();

    grid.cells.forEach((hucre, i) => {
      const im = imza(hucre);
      if (cizilen[i] === im) return;
      cizilen[i] = im;
      hucreDoldur(hucreEl[i], hucre, i);
    });
  }

  /* Hayalet parmagi transform ile takip ediyor. left/top olsaydi her
     pointermove'da yeniden yerlesim ve boyama gerekirdi; transform
     dogrudan compositor'da isleniyor. */
  const hayaletTasi = (img, x, y) => {
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.12)`;
  };

  function hayalet(hucre, x, y) {
    const img = document.createElement('img');
    img.className = 'drag-ghost';
    img.src = gorselYolu(hucre);
    img.alt = '';
    hayaletTasi(img, x, y);
    document.body.appendChild(img);
    return img;
  }

  const vurguTemizle = () => el.querySelectorAll('.cell.drop-ok')
    .forEach((c) => c.classList.remove('drop-ok'));

  function patlat(i) {
    const cell = el.querySelector(`.cell[data-i="${i}"]`);
    if (!cell) return;
    const fx = document.createElement('i');
    fx.className = 'merge-burst';
    cell.appendChild(fx);
    setTimeout(() => fx.remove(), 520);
  }

  const birlesebilir = (a, b) => (
    nesneMi(a) && nesneMi(b) && a.t === b.t && a.lv === b.lv && a.lv < enUstSeviye(a.t)
  );

  /* Hucre kutulari surukleme baslarken bir kez olculuyor. Eskiden her
     parmak hareketinde elementFromPoint cagriliyordu; o her seferinde
     tarayiciyi yerlesim hesabi yapmaya zorluyordu ve telefonda saniyede
     120 kez geliyordu. Artik 16 kutuluk bir listede aritmetik arama var. */
  function kutulariTara() {
    return [...el.querySelectorAll('.cell')].map((c) => {
      const r = c.getBoundingClientRect();
      return { i: Number(c.dataset.i), sol: r.left, ust: r.top, sag: r.right, alt: r.bottom };
    });
  }

  function hizliIndex(x, y) {
    if (!surukle) return -1;

    /* Kutular surukleme basinda bir kez olculuyor. Arada sayfa kaydiysa
       o olcumler yalan soyluyor: parmak dogru hucrenin uzerindeyken
       hizliIndex baskasini - ya da hicbirini - buluyor, birakinca
       yumurta yerine donuyor ve oyuncu "bir sey olmadi" diyor.
       Kaymayi yakalayip yeniden olcuyoruz; kaymadigi surece hicbir
       maliyeti yok. */
    const kayma = window.scrollY + (el.closest('.screen')?.scrollTop || 0);
    if (kayma !== surukle.kayma) {
      surukle.kayma = kayma;
      surukle.kutular = kutulariTara();
    }

    for (const k of surukle.kutular || []) {
      if (x >= k.sol && x <= k.sag && y >= k.ust && y <= k.alt) return k.i;
    }
    return -1;
  }

  /* Suruklenen parcayla birlesebilecek hucreler altin cerceveyle
     isaretleniyor: oyuncu neyin neyle birlestigini denemeden goruyor. */
  function eslesenleriIsaretle(i, hucre) {
    grid.cells.forEach((h, j) => {
      if (j !== i && birlesebilir(hucre, h)) {
        el.querySelector(`.cell[data-i="${j}"]`)?.classList.add('esles');
      }
    });
  }

  const eslesmeTemizle = () => el.querySelectorAll('.cell.esles')
    .forEach((c) => c.classList.remove('esles'));

  /* Suruklemeden cikisin TEK yolu. Ne sebeple biterse bitsin ayni
     temizlik calisiyor: kare istegi iptal, siniflar silinir, surukle
     bosaltilir. Donen deger sona eren surukleme (ya da null). */
  function temizle() {
    if (!surukle) return null;
    const s = surukle;
    surukle = null;
    if (s.kare) cancelAnimationFrame(s.kare);
    s.wrap?.classList.remove('dragging');
    vurguTemizle();
    eslesmeTemizle();
    return s;
  }

  /* Hedefe birakmadan vazgecme: uygulama arka plana atilinca, pencere
     odagi gidince ya da bekleyen bir surukleme bayatlayinca. */
  function iptal() {
    const s = temizle();
    if (!s) return;
    s.ghost?.remove();
    ciz();
  }

  /* Bir surukleme en fazla bu kadar surer; otesi takilmis demektir.
     8 saniyeydi. Telefondaki kayit, donma aninda HIC merge satiri
     olmadigini gosterdi - yani birlestirme baslamiyor bile, dokunus
     tahtaya hic ulasmiyor. Takilmis bir surukleme tam bunu yapiyor:
     bitir() hic cagrilmazsa (Telegram sistem hareketini kapiyorsa
     pointerup gelmeyebiliyor) `surukle` dolu kaliyor ve basla() her
     dokunusu 8 saniye boyunca sessizce yutuyor. Gercek bir surukleme
     bir saniyeyi gecmez; 1,2 saniye hem guvenli hem fark edilmez. */
  const BAYAT = 1200;

  function basla(e) {
    if (!grid) return;

    if (surukle) {
      const yas = Date.now() - (surukle.bas || 0);
      /* Ayni parmak degilse ikinci dokunustur, yok sayiliyor.
         AYNI parmak yeniden basiyorsa onceki surukleme oluden
         baskasi degil - hemen temizleniyor, yas beklenmiyor. */
      if (yas < BAYAT && surukle.pid !== undefined && surukle.pid !== e.pointerId) {
        iz('surukle.yutuldu', `yas${yas}`);
        return;
      }
      iz('surukle.bayat', `yas${yas}`);
      iptal();
    }

    /* Kilitli hucre surukleme degil, sadece dokunma kabul ediyor:
       bilgi penceresi acilsin diye ayri isaretleniyor. */
    const cell = e.target.closest?.('.cell');
    const wrap = e.target.closest?.('.piece');
    if (!wrap) {
      const i = cell ? Number(cell.dataset.i) : -1;
      if (i >= 0 && kilitliMi(grid.cells[i])) {
        surukle = { i, kilitDokunus: true, x0: e.clientX, y0: e.clientY };
      }
      return;
    }

    const i = Number(wrap.dataset.i);
    const hucre = grid.cells[i];
    if (!nesneMi(hucre)) return;

    surukle = { i, hucre, ghost: hayalet(hucre, e.clientX, e.clientY),
                tasidi: false, x0: e.clientX, y0: e.clientY,
                sonX: e.clientX, sonY: e.clientY, wrap, bas: Date.now(),
                pid: e.pointerId,
                kutular: kutulariTara(), vurgu: -2, kare: 0,
                kayma: window.scrollY + (el.closest('.screen')?.scrollTop || 0) };
    wrap.classList.add('dragging');
    eslesenleriIsaretle(i, hucre);
    /* Yakalama bazi WebView'larda hata firlatiyor; birakma olaylari
       artik window'da dinlendigi icin zaten sart degil. */
    try { el.setPointerCapture?.(e.pointerId); } catch { /* onemsiz */ }
    e.preventDefault();
  }

  /* Parmak hareketi sadece koordinati not ediyor; asil is kare basina
     bir kez yapiliyor, boylece 120 Hz dokunmatik orneklemesi DOM'u
     saniyede 120 kez dovmuyor. */
  function hareket(e) {
    if (!surukle || surukle.kilitDokunus) return;
    surukle.sonX = e.clientX;
    surukle.sonY = e.clientY;

    /* HAYALET DOGRUDAN TASINIYOR, rAF BEKLEMIYOR.

       Eskiden parmagin takibi de kare dongusune bagliydi: hareket()
       yalnizca koordinati not edip bir rAF siraya koyuyor, hayaleti o
       geri cagri tasiyordu. Bunun bir bedeli vardi - Telegram WebView
       rAF'i durdurabiliyor (arka plan, sistem hareketi, guc tasarrufu).
       rAF durunca `surukle.kare` sifirlanmiyor, sonraki her hareket
       `if (surukle.kare) return` kapisina takiliyor ve YUMURTA PARMAGIN
       ALTINDA DONUYOR. Oyuncunun gordugu sey tam olarak bu.

       Hayaleti tasimak tek bir transform yazmasi; yerlesim hesabi
       gerektirmiyor, compositor isi. Her pointermove'da yapmanin bir
       maliyeti yok. Kare dongusune sadece sinif yazan VURGU isi kaldi -
       asil pahali olan oydu. */
    hayaletTasi(surukle.ghost, surukle.sonX, surukle.sonY);
    if (Math.abs(surukle.sonX - surukle.x0) > 6
        || Math.abs(surukle.sonY - surukle.y0) > 6) surukle.tasidi = true;

    /* Bekleyen bir kare varsa yenisini sıraya koymuyoruz - ama o kare
       cok uzun suredir bekliyorsa (rAF durmus demektir) kilidi aciyoruz.
       Vurgu birkac kare gec gelebilir, kalici olarak kaybolmaz. */
    if (surukle.kare) {
      if (performance.now() - (surukle.kareAn || 0) < 400) return;
      cancelAnimationFrame(surukle.kare);
    }
    surukle.kareAn = performance.now();
    surukle.kare = requestAnimationFrame(kareIsle);
  }

  /* Yalnizca VURGU: hangi hucrenin uzerindeyiz ve orasi birlesir mi. */
  function kareIsle() {
    if (!surukle) return;
    surukle.kare = 0;
    const { sonX: x, sonY: y } = surukle;

    const hedef = hizliIndex(x, y);
    if (hedef === surukle.vurgu) return;
    surukle.vurgu = hedef;
    vurguTemizle();
    if (hedef >= 0 && hedef !== surukle.i) {
      const h = grid.cells[hedef];
      if (h === null || birlesebilir(surukle.hucre, h)) {
        el.querySelector(`.cell[data-i="${hedef}"]`)?.classList.add('drop-ok');
      }
    }
  }

  /* Hayaleti hedef hucrenin ortasina suzdurup bitince haber veriyor.
     Hayaletin transform'u zaten goruntu koordinatinda oldugu icin hedef
     merkezi dogrudan yazilabiliyor. */
  function suzul(ghost, hedef, bitince) {
    const kutu = el.querySelector(`.cell[data-i="${hedef}"]`)?.getBoundingClientRect();
    if (!kutu || !ghost.animate) { ghost.remove(); bitince(); return; }

    /* GUVENLIK AGI
       WAAPI'nin onfinish'i uygulama arka plana atildiginda gelmeyebiliyor
       (Telegram WebView bunu siklikla yapiyor). Bu geri cagriya artik
       oyun durumu bagli degil - sadece gorsel is var - ama hayaletin
       ekranda asili kalmamasi icin yine de bir zamanlayici duruyor. */
    let bitti = false;
    let saat = 0;
    const tamam = () => {
      if (bitti) return;
      bitti = true;
      clearTimeout(saat);
      ghost.remove();
      bitince();
    };

    const an = ghost.animate([
      { transform: ghost.style.transform },
      { transform: `translate3d(${kutu.left + kutu.width / 2}px, ${kutu.top + kutu.height / 2}px, 0) scale(.85)` },
    ], { duration: 170, easing: AKIS, fill: 'forwards' });

    an.onfinish = tamam;
    an.oncancel = tamam;
    saat = setTimeout(tamam, 500);
  }

  const parca = (i) => el.querySelector(`.cell[data-i="${i}"] .piece`);

  function bitir(e) {
    if (!surukle) { iz('surukle.bosbitir', e.type); return; }

    if (surukle.kilitDokunus) {
      const { i } = surukle;
      surukle = null;
      onPick?.(i, grid.cells[i]);
      return;
    }

    const hedef = hizliIndex(e.clientX, e.clientY);
    /* temizle() surukle'yi bosaltiyor; hedef ondan ONCE hesaplanmali
       cunku hizliIndex olculmus kutulari surukle uzerinden okuyor. */
    const { i, hucre, ghost, tasidi } = temizle();

    /* Kisa dokunus: bilgi penceresi acilsin */
    if (!tasidi || hedef === i) {
      ghost.remove();
      ciz();
      onPick?.(i, grid.cells[i]);
      return;
    }
    if (hedef < 0) { iz('surukle.hedefyok'); ghost.remove(); ciz(); return; }

    const hedefHucre = grid.cells[hedef];

    /* ONEMLI: oyun durumu artik animasyonun BITMESINI BEKLEMIYOR.

       Eskiden kaynak hucre hemen bosaliyor, hedefe yazma isi ise
       suzul()'un geri cagrisinda yapiliyordu. O geri cagri gelmezse -
       uygulama arka plana atilirsa WAAPI olaylari gelmeyebiliyor -
       yumurta kaynaktan silinmis ama hedefe hic yazilmamis oluyordu:
       oyuncunun gordugu sey donmus bir tahta ve kaybolmus bir parca.

       Simdi durum once yaziliyor, animasyon sadece bir gorsel katman.
       Animasyon hic calismasa bile tahta dogru. */
    const yerlestir = (yeniHucre) => {
      grid.cells[i] = null;
      grid.cells[hedef] = yeniHucre;
      ciz();
      onChange?.();
    };

    /* Bos hucreye tasima */
    if (hedefHucre === null) {
      yerlestir(hucre);
      const p = parca(hedef);
      if (p) p.style.visibility = 'hidden';
      suzul(ghost, hedef, () => {
        const q = parca(hedef);
        if (!q) return;
        q.style.visibility = '';
        belir(q, 300);
      });
      return;
    }

    /* Birlestirme */
    if (birlesebilir(hucre, hedefHucre)) {
      const yeni = { t: hucre.t, lv: hucre.lv + 1 };
      yerlestir(yeni);
      onMerge?.(yeni, hedef);

      /* parca() onMerge'den SONRA araniyor: siradanDoldur() araya bir
         ciz() daha sokabiliyor ve o elemani tazeleyebiliyor. */
      const p = parca(hedef);
      if (p) p.style.visibility = 'hidden';
      suzul(ghost, hedef, () => {
        const q = parca(hedef);
        if (!q) return;
        q.style.visibility = '';
        patlat(hedef);
        zipla(q, 1.32, 480);
      });
      return;
    }

    iz('surukle.birlesmez', `${hucre.t}${hucre.lv}->${hedefHucre.t}${hedefHucre.lv}`);
    ghost.remove();
    ciz();
  }

  /* BIRAKMA OLAYLARI WINDOW'DA.

     Once hepsi tahtaya bagliydi. Parmagini tahtanin disinda kaldiran
     oyuncuda - telefonda son derece olagan - pointerup baska bir
     elemana gidiyor, bitir() hic calismiyor ve surukle dolu kaliyordu:
     tahta o andan sonra hicbir dokunusu kabul etmiyordu.

     Window'da dinleyince birakma nerede olursa olsun duyuluyor.
     Dinleyiciler surukle bos oldugunda hemen donuyor, maliyeti yok. */
  el.addEventListener('pointerdown', basla);
  window.addEventListener('pointermove', hareket);
  window.addEventListener('pointerup', bitir);
  window.addEventListener('pointercancel', bitir);

  /* Uygulama arka plana atilirsa ya da odak giderse surukleme iptal.
     Telegram WebView bunu sik yapiyor ve donen parmak olayi gelmiyor. */
  window.addEventListener('blur', iptal);
  document.addEventListener('visibilitychange', () => { if (document.hidden) iptal(); });

  /* Yakalama kaybolursa surukleme de biter. setPointerCapture(el)
     yapiyoruz; Telegram bir sistem hareketi icin parmagi kapinca
     tarayici yakalamayi birakiyor ve pointerup BIZE HIC GELMEYEBILIYOR.
     O durumda surukle dolu kalir ve tahta dokunus kabul etmez - telefon
     kaydindaki o 14 saniyelik sessizligin en olasi aciklamasi bu.
     lostpointercapture her zaman geliyor; onu da bir cikis sayiyoruz. */
  el.addEventListener('lostpointercapture', () => {
    if (surukle) { iz('surukle.yakalamakayip'); iptal(); }
  });

  /* Son emniyet: hicbir olay gelmese bile takilmis bir surukleme kendi
     kendine cozulur. Saniyede bir bakmak bedava; BAYAT'i gecmis bir
     surukleme oyuncunun bir daha dokunmasini beklemeden temizleniyor. */
  setInterval(() => {
    if (surukle && Date.now() - (surukle.bas || 0) > BAYAT) {
      iz('surukle.supurge');
      iptal();
    }
  }, 1000);

  return {
    bagla(yeniGrid) { grid = yeniGrid; ciz(); },
    sec(i) {
      secili = Number.isInteger(i) ? i : -1;
      el.querySelectorAll('.cell.sel').forEach((c) => c.classList.remove('sel'));
      if (secili >= 0) el.querySelector(`.cell[data-i="${secili}"]`)?.classList.add('sel');
    },
    /* Sadece sayac yazilarini guncelliyor - tum izgarayi yeniden
       cizmek saniyede bir gereksiz is olurdu. Hal degisirse (iliyor ->
       hazir) true donuyor ki cagiran tam cizim yapsin. */
    sayaclariTazele() {
      if (!grid) return false;
      let halDegisti = false;
      grid.cells.forEach((h, i) => {
        const durum = kapDurumu(h);
        if (!durum) return;
        /* Elemanlar artik elde: saniyede 16 querySelector yapmaya gerek yok. */
        const cell = hucreEl[i];
        if (!cell) return;
        const rozet = cell.querySelector('.kap-sayac');
        if (durum.hal === 'iliyor' && rozet) rozet.textContent = sureKisa(durum.kalan);
        else if (durum.hal === 'hazir' && !cell.classList.contains('kap-hazir')) halDegisti = true;
      });
      return halDegisti;
    },
    ciz,
    hucreKutusu: (i) => el.querySelector(`.cell[data-i="${i}"]`)?.getBoundingClientRect() || null,
    parcaBul: (i) => parca(i),
    get grid() { return grid; },
  };
}
