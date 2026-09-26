/* BIRLESTIRME IZGARASI
   Hucrelerde uc tur nesne durabilir: yumurta, yem sandigi, yildiz sandigi.
   Ayni turden ve ayni seviyeden iki nesne ust uste surukleninde bir ust
   seviye oluyor. Kilitli hucreler yildizla aciliyor ve icindeki odulu
   dogrudan oyuncuya veriyor. */

import { EN_UST_YUMURTA, EN_UST_SANDIK } from './ekonomi.js?v147';
import { belir, zipla, AKIS } from './canlandir.js?v147';

const SANDIK_ADI = { 1: 'pouch', 2: 'basket', 3: 'chest', 4: 'chest-premium' };

/* Izgarada bir oge en fazla ~64 CSS px ciziliyor; DPR 3'te 192 gercek
   piksel yetiyor. 256'lik kaynaklar duruyor ama sayfa 192'likleri cekiyor:
   ayni netlik, 1.8 kat az cozme isi. */
export function gorselYolu(hucre) {
  if (!hucre) return '';
  if (hucre.t === 'egg') return `assets/eggs/egg-${Math.min(EN_UST_YUMURTA, hucre.lv)}-192.webp`;
  const onek = hucre.t === 'star' ? 'star' : 'meat';
  return `../../assets/packs/${onek}-${SANDIK_ADI[Math.min(EN_UST_SANDIK, hucre.lv)]}-192.webp`;
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

  function ciz() {
    if (!grid) return;
    el.style.setProperty('--n', grid.n);
    el.innerHTML = '';

    grid.cells.forEach((hucre, i) => {
      const satir = Math.floor(i / grid.n);
      const sutun = i % grid.n;
      const cell = document.createElement('div');
      cell.className = `cell${(satir + sutun) % 2 ? ' alt' : ''}`;
      cell.dataset.i = String(i);
      if (i === secili) cell.classList.add('sel');

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
      } else if (nesneMi(hucre)) {
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
      }

      el.appendChild(cell);
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
    for (const k of surukle?.kutular || []) {
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

  function basla(e) {
    if (!grid) return;

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
                sonX: e.clientX, sonY: e.clientY,
                kutular: kutulariTara(), vurgu: -2, kare: 0 };
    wrap.classList.add('dragging');
    eslesenleriIsaretle(i, hucre);
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  /* Parmak hareketi sadece koordinati not ediyor; asil is kare basina
     bir kez yapiliyor, boylece 120 Hz dokunmatik orneklemesi DOM'u
     saniyede 120 kez dovmuyor. */
  function hareket(e) {
    if (!surukle || surukle.kilitDokunus) return;
    surukle.sonX = e.clientX;
    surukle.sonY = e.clientY;
    if (surukle.kare) return;
    surukle.kare = requestAnimationFrame(kareIsle);
  }

  function kareIsle() {
    if (!surukle) return;
    surukle.kare = 0;
    const { sonX: x, sonY: y } = surukle;

    hayaletTasi(surukle.ghost, x, y);
    if (Math.abs(x - surukle.x0) > 6 || Math.abs(y - surukle.y0) > 6) surukle.tasidi = true;

    /* Vurgu sadece hedef hucre degistiginde yaziliyor. */
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

    const an = ghost.animate([
      { transform: ghost.style.transform },
      { transform: `translate3d(${kutu.left + kutu.width / 2}px, ${kutu.top + kutu.height / 2}px, 0) scale(.85)` },
    ], { duration: 170, easing: AKIS, fill: 'forwards' });

    const tamam = () => { ghost.remove(); bitince(); };
    an.onfinish = tamam;
    an.oncancel = tamam;
  }

  const parca = (i) => el.querySelector(`.cell[data-i="${i}"] .piece`);

  function bitir(e) {
    if (!surukle) return;

    if (surukle.kilitDokunus) {
      const { i } = surukle;
      surukle = null;
      onPick?.(i, grid.cells[i]);
      return;
    }

    const { i, hucre, ghost, tasidi } = surukle;
    if (surukle.kare) cancelAnimationFrame(surukle.kare);
    vurguTemizle();
    eslesmeTemizle();
    const hedef = hizliIndex(e.clientX, e.clientY);
    surukle = null;

    /* Kisa dokunus: bilgi penceresi acilsin */
    if (!tasidi || hedef === i) {
      ghost.remove();
      ciz();
      onPick?.(i, grid.cells[i]);
      return;
    }
    if (hedef < 0) { ghost.remove(); ciz(); return; }

    const hedefHucre = grid.cells[hedef];

    /* Bos hucreye tasima: parca yerine suzuluyor */
    if (hedefHucre === null) {
      grid.cells[i] = null;
      ciz();
      suzul(ghost, hedef, () => {
        grid.cells[hedef] = hucre;
        ciz();
        belir(parca(hedef), 300);
        onChange?.();
      });
      return;
    }

    /* Birlestirme: once kaynak hucre bosaliyor, parca hedefe suzuluyor,
       sonra ust seviye taskinli bir sekilde yerine oturuyor. */
    if (birlesebilir(hucre, hedefHucre)) {
      grid.cells[i] = null;
      ciz();
      suzul(ghost, hedef, () => {
        const yeni = { t: hucre.t, lv: hucre.lv + 1 };
        grid.cells[hedef] = yeni;
        ciz();
        patlat(hedef);
        zipla(parca(hedef), 1.32, 480);
        onChange?.();
        onMerge?.(yeni, hedef);
      });
      return;
    }

    ghost.remove();
    ciz();
  }

  el.addEventListener('pointerdown', basla);
  el.addEventListener('pointermove', hareket);
  el.addEventListener('pointerup', bitir);
  el.addEventListener('pointercancel', bitir);

  return {
    bagla(yeniGrid) { grid = yeniGrid; ciz(); },
    sec(i) {
      secili = Number.isInteger(i) ? i : -1;
      el.querySelectorAll('.cell.sel').forEach((c) => c.classList.remove('sel'));
      if (secili >= 0) el.querySelector(`.cell[data-i="${secili}"]`)?.classList.add('sel');
    },
    ciz,
    hucreKutusu: (i) => el.querySelector(`.cell[data-i="${i}"]`)?.getBoundingClientRect() || null,
    parcaBul: (i) => parca(i),
    get grid() { return grid; },
  };
}
