
import { ada as adaTemasi } from './data.js?v50';

const KARE_MS = 33;

export function createIsland(arkaCanvas, onCanvas, adaId = 'grassland') {
  const arka = arkaCanvas.getContext('2d');
  const on = onCanvas.getContext('2d');

  let tema = adaTemasi(adaId);
  let yuklenenTema = null;
  let genislik = 0;
  let yukseklikPx = 0;
  let dpr = 1;

  let img = null;
  let partikuller = [];
  let calisiyor = false;
  let sonKare = 0;
  let rafId = 0;

  function resimYukle(hedefTema) {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      if (tema !== hedefTema) return;
      img = im;
      if (genislik) ciz(performance.now());
    };
    im.src = hedefTema.img;
  }

  function boyutlandir() {
    const kutu = arkaCanvas.getBoundingClientRect();
    if (!kutu.width) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    genislik = kutu.width;
    yukseklikPx = kutu.height;

    for (const c of [arkaCanvas, onCanvas]) {
      c.width = Math.round(genislik * dpr);
      c.height = Math.round(yukseklikPx * dpr);
    }

    partikullerYarat();
    ciz(performance.now());
    return true;
  }

  function partikullerYarat() {
    const p = tema.partikul || { adet: 12, renk: '#fff' };
    partikuller = Array.from({ length: p.adet }, () => ({
      x: Math.random() * genislik,
      y: Math.random() * yukseklikPx,
      hiz: 0.12 + Math.random() * 0.28,
      faz: Math.random() * Math.PI * 2,
      r: 1 + Math.random() * 1.8,
    }));
  }

  function yildizCiz(ctx, x, y, r2) {
    ctx.beginPath();
    ctx.moveTo(x, y - r2);
    ctx.lineTo(x + r2 * 0.35, y - r2 * 0.35);
    ctx.lineTo(x + r2, y);
    ctx.lineTo(x + r2 * 0.35, y + r2 * 0.35);
    ctx.lineTo(x, y + r2);
    ctx.lineTo(x - r2 * 0.35, y + r2 * 0.35);
    ctx.lineTo(x - r2, y);
    ctx.lineTo(x - r2 * 0.35, y - r2 * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  function ciz(zaman) {
    if (!genislik) return;

    arka.setTransform(dpr, 0, 0, dpr, 0, 0);
    arka.clearRect(0, 0, genislik, yukseklikPx);
    if (img) {
      arka.drawImage(img, 0, 0, genislik, yukseklikPx);
    } else {
      arka.fillStyle = '#171429';
      arka.fillRect(0, 0, genislik, yukseklikPx);
    }

    const tur = tema.partikul?.tur || 'toz';
    const renk = tema.partikul?.renk || '#ffe9a8';
    for (const p of partikuller) {
      p.y += tur === 'kar' ? p.hiz : -p.hiz;
      if (tur === 'kar' && p.y > yukseklikPx + 10) p.y = -10;
      if (tur !== 'kar' && p.y < -10) p.y = yukseklikPx + 10;

      const kayma = Math.sin(zaman / 900 + p.faz) * 8;
      arka.globalAlpha = tur === 'kar' ? 0.7 : 0.25 + Math.sin(zaman / 500 + p.faz) * 0.25;
      arka.fillStyle = renk;

      if (tur === 'yildiz') {
        yildizCiz(arka, p.x + kayma, p.y, p.r * 1.6);
      } else {
        arka.beginPath();
        arka.arc(p.x + kayma, p.y, p.r, 0, Math.PI * 2);
        arka.fill();
      }
    }
    arka.globalAlpha = 1;

    on.setTransform(dpr, 0, 0, dpr, 0, 0);
    on.clearRect(0, 0, genislik, yukseklikPx);
  }

  function dongu(zaman) {
    if (!calisiyor) return;
    rafId = requestAnimationFrame(dongu);
    if (zaman - sonKare < KARE_MS) return;
    sonKare = zaman;
    ciz(zaman);
  }

  function ejderhaNoktasi() {
    const p = tema.dragonPoint || { x: 0.5, y: 0.55, scale: 1 };
    return {
      x: p.x * genislik,
      y: p.y * yukseklikPx,
      olcek: p.scale ?? 1,
    };
  }

  return {
    boyutlandir,
    ejderhaNoktasi,
    temaDegistir(yeniId) {
      const yeniTema = adaTemasi(yeniId);
      tema = yeniTema;
      if (genislik) partikullerYarat();
      if (yuklenenTema !== yeniTema) {
        yuklenenTema = yeniTema;
        img = null;
        resimYukle(yeniTema);
      }
      if (genislik) ciz(performance.now());
    },
    temaBilgisi: () => tema,
    tekKare(zaman = 0) { ciz(zaman); },
    basla() {
      if (calisiyor) return;
      calisiyor = true;
      rafId = requestAnimationFrame(dongu);
    },
    dur() {
      calisiyor = false;
      cancelAnimationFrame(rafId);
    },
  };
}
