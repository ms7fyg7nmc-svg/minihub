/* BIRLESTIRME IZGARASI
   Hucrelerde uc tur nesne durabilir: yumurta, yem sandigi, yildiz sandigi.
   Ayni turden ve ayni seviyeden iki nesne ust uste surukleninde bir ust
   seviye oluyor. Kilitli hucreler yildizla aciliyor ve icindeki odulu
   dogrudan oyuncuya veriyor. */

import { EN_UST_YUMURTA, EN_UST_SANDIK } from './ekonomi.js?v130';

const SANDIK_ADI = { 1: 'pouch', 2: 'basket', 3: 'chest', 4: 'chest-premium' };

export function gorselYolu(hucre) {
  if (!hucre) return '';
  if (hucre.t === 'egg') return `assets/eggs/egg-${Math.min(EN_UST_YUMURTA, hucre.lv)}.webp`;
  const onek = hucre.t === 'star' ? 'star' : 'meat';
  return `../../assets/packs/${onek}-${SANDIK_ADI[Math.min(EN_UST_SANDIK, hucre.lv)]}-256.webp`;
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

  function hucreIndexi(x, y) {
    const hedef = document.elementFromPoint(x, y);
    const cell = hedef?.closest?.('.cell');
    if (!cell || !el.contains(cell)) return -1;
    return Number(cell.dataset.i);
  }

  function hayalet(hucre, x, y) {
    const img = document.createElement('img');
    img.className = 'drag-ghost';
    img.src = gorselYolu(hucre);
    img.alt = '';
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
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
                tasidi: false, x0: e.clientX, y0: e.clientY };
    wrap.classList.add('dragging');
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  function hareket(e) {
    if (!surukle) return;
    surukle.ghost.style.left = `${e.clientX}px`;
    surukle.ghost.style.top = `${e.clientY}px`;
    if (Math.abs(e.clientX - surukle.x0) > 6 || Math.abs(e.clientY - surukle.y0) > 6) {
      surukle.tasidi = true;
    }
    vurguTemizle();
    const hedef = hucreIndexi(e.clientX, e.clientY);
    if (hedef >= 0 && hedef !== surukle.i) {
      const h = grid.cells[hedef];
      if (h === null || birlesebilir(surukle.hucre, h)) {
        el.querySelector(`.cell[data-i="${hedef}"]`)?.classList.add('drop-ok');
      }
    }
  }

  function bitir(e) {
    if (!surukle) return;

    if (surukle.kilitDokunus) {
      const { i } = surukle;
      surukle = null;
      onPick?.(i, grid.cells[i]);
      return;
    }

    const { i, hucre, ghost, tasidi } = surukle;
    ghost.remove();
    vurguTemizle();
    surukle = null;

    const hedef = hucreIndexi(e.clientX, e.clientY);

    /* Kisa dokunus: bilgi penceresi acilsin */
    if (!tasidi || hedef === i) {
      ciz();
      onPick?.(i, grid.cells[i]);
      return;
    }
    if (hedef < 0) { ciz(); return; }

    const hedefHucre = grid.cells[hedef];

    if (hedefHucre === null) {
      grid.cells[hedef] = hucre;
      grid.cells[i] = null;
      ciz();
      onChange?.();
      return;
    }

    if (birlesebilir(hucre, hedefHucre)) {
      const yeni = { t: hucre.t, lv: hucre.lv + 1 };
      grid.cells[hedef] = yeni;
      grid.cells[i] = null;
      ciz();
      patlat(hedef);
      onChange?.();
      onMerge?.(yeni, hedef);
      return;
    }

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
    get grid() { return grid; },
  };
}
