/* TUTORIAL
   Buyucu dede yeni oyuncuya once yumurta cikarmayi, sonra birlestirmeyi,
   sonra da yumurtayi acmayi gosteriyor. Adimlar olaylarla ilerliyor:
   bekledigi olay gelene kadar "Devam" dugmesi gizli kaliyor. */

const POZ = {
  greet: '../../assets/tutorial/wizard-greet-384.webp',
  teach: '../../assets/tutorial/wizard-teach-384.webp',
  cheer: '../../assets/tutorial/wizard-cheer-384.webp',
};

export function pozListesi() {
  return Object.values(POZ);
}

export function createTutorial({ kok, maske, buyucu, metin, ileriBtn, t, bitince }) {
  let adimlar = [];
  let i = -1;
  let acik = false;

  function delikAc(el) {
    if (!el) {
      maske.classList.remove('has-hole');
      return;
    }
    const r = el.getBoundingClientRect();
    const p = 8;
    maske.style.setProperty('--hx1', `${Math.max(0, r.left - p)}px`);
    maske.style.setProperty('--hy1', `${Math.max(0, r.top - p)}px`);
    maske.style.setProperty('--hx2', `${r.right + p}px`);
    maske.style.setProperty('--hy2', `${r.bottom + p}px`);
    maske.classList.add('has-hole');
  }

  function goster(adim) {
    buyucu.src = POZ[adim.poz || 'teach'];
    metin.textContent = t(adim.key, adim.params || {});
    ileriBtn.hidden = !!adim.bekle;
    delikAc(typeof adim.delik === 'function' ? adim.delik() : null);
    adim.girince?.();
  }

  function ilerle() {
    i += 1;
    if (i >= adimlar.length) {
      kapat();
      bitince?.();
      return;
    }
    goster(adimlar[i]);
  }

  function kapat() {
    acik = false;
    kok.hidden = true;
    maske.classList.remove('has-hole');
  }

  ileriBtn.addEventListener('click', () => { if (acik) ilerle(); });

  return {
    basla(yeniAdimlar) {
      adimlar = yeniAdimlar;
      i = -1;
      acik = true;
      kok.hidden = false;
      ilerle();
    },
    /* Oyundan gelen olay (spawn / merge / hatch / feed) bekleniyorsa adimi gecer. */
    olay(ad) {
      if (!acik) return;
      const adim = adimlar[i];
      if (adim?.bekle === ad) ilerle();
    },
    yenidenKonumla() {
      if (!acik) return;
      const adim = adimlar[i];
      delikAc(typeof adim?.delik === 'function' ? adim.delik() : null);
    },
    get acikMi() { return acik; },
    kapat,
  };
}
