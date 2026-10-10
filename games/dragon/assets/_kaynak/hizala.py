# PARCALARI GOVDEYE HIZALA
#
# Uretilen 38 parca (kanat/kuyruk/tac/yuz/kolye) birbirinden habersiz
# uretildi: her biri KENDI karesinde, KENDI olceginde ortalanmis.
# crown-bronze tuvalinin %42'sini kapliyor, crown-celestial %84'unu -
# ikisi de 512 piksellik dosya. Ortak capa noktasi yok, o yuzden ayni
# yere ayni olcekle konunca biri minicik biri devasa cikiyor.
#
# COZUM: konumu DOSYAYA GOM. Her parca, govdeyle ayni 1024'luk tuvale,
# kendi son konumunda yaziliyor. Oyun kodu hicbir hesap yapmiyor,
# sadece ust uste bindiriyor - DMD'nin yaptigi da bu (yavas baglantida
# gorulen "kel ordek" bunun kaniti: eksik katman YANLIS YERDE degil,
# hic yok).
#
# Bos saydam alan WebP'de sikisip yok oluyor: tam tuvale yazmak parca
# basina yalnizca ~2 KB ekliyor.
#
# Calistir:  python3 hizala.py           -> katman/ klasorunu uretir
#            python3 hizala.py --onizle  -> ayrica slot inceleme sayfalari
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import glob, os, sys

KOK = os.path.dirname(os.path.abspath(__file__))
CIKTI = os.path.join(KOK, 'katman')
ONIZLEME = os.path.join(KOK, 'onizleme')

# Capa: govdenin ICERIK KUTUSUNA gore oranlar.
#   x, y  : capanin govde kutusundaki yeri (0-1)
#   s     : parcanin genisligi, govde GENISLIGINE oran
#   hiza  : parcanin hangi noktasi capaya oturacak
#   aynala: True ise parca bir de aynalanip karsi tarafa konur (kanatlar)
SLOT = {
    # Kanatlar omuzdan cikmali, kafadan degil: ilk ayarda (x=0.07)
    # govdeden fazla uzaktaydilar ve basin hizasinda duruyorlardi.
    'wing':     dict(x=0.15, y=0.40, s=0.56, hiza='sag-ust', aynala=True),
    'tail':     dict(x=0.84, y=0.72, s=0.55, hiza='sol-ust'),
    'crown':    dict(x=0.50, y=0.03, s=0.44, hiza='alt-orta'),
    'face':     dict(x=0.50, y=0.19, s=0.30, hiza='orta'),
    # Kolye BOYUNDA durmali. Ilk ayarda (y=0.40) yuzun uzerine biniyor,
    # gozleri kapatiyordu.
    'necklace': dict(x=0.50, y=0.56, s=0.46, hiza='orta'),
}

# PARCA BASINA ince ayar. Slot varsayilanini ezen alanlar yazilir.
# Alev kuyrugu uzun, kristal kuyruk kisa - tek bir sayi hepsine uymuyor.
# Her satirin sebebi yanina yazili; gozle bakip duzeltildiler.
OZEL = {
    # --- KANAT ---
    'wing-phoenix':   dict(s=0.48),            # en genis cizim, govdeyi yutuyordu
    'wing-demon':     dict(s=0.60, y=0.42),    # ince ve koyu, biraz buyuyup insin
    'wing-lightning': dict(s=0.52),            # genis kutulu, kuculdu

    # --- KUYRUK ---
    'tail-celestial': dict(y=0.68),            # fazla asagi sarkiyordu
    'tail-crystal':   dict(y=0.70, s=0.58),    # yatay ve ince
    'tail-demon':     dict(s=0.62),            # cok ince kaliyordu
    'tail-lightning': dict(y=0.66, s=0.50),    # dik asagi iniyordu

    # --- TAC ---
    'crown-ice':      dict(s=0.30, y=0.06),    # uzun buz blogu, basi eziyordu
    'crown-king':     dict(y=0.06),            # basin uzerinde havada kaliyordu
    'crown-silver':   dict(y=0.06),            # ayni
    'crown-celestial': dict(s=0.48),           # digerlerine gore kucuk kaliyordu

    # --- KOLYE ---
    'necklace-fang':  dict(s=0.42, y=0.54),    # ip ince, dis asagi sarkiyor
}

KATMAN_SIRASI = ['wing', 'tail', 'crown', 'face', 'necklace']


def ac(yol):
    return Image.open(yol).convert('RGBA')


def icerik_kutusu(im):
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 18)
    if len(xs) == 0:
        return None
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def icerige_kirp(im):
    k = icerik_kutusu(im)
    return im.crop(k) if k else im


def ayar(ad):
    slot = ad.split('-')[0]
    d = dict(SLOT[slot])
    d.update(OZEL.get(ad, {}))
    return d


def yerlestir(tuval, parca, d, gk, aynali=False):
    """Parcayi govde kutusuna gore hesaplanan yere, tuvalin uzerine koyar."""
    gx0, gy0, gx1, gy1 = gk
    gw, gh = gx1 - gx0, gy1 - gy0

    ic = icerige_kirp(parca)
    if aynali:
        ic = ic.transpose(Image.FLIP_LEFT_RIGHT)

    hedef_w = max(1, round(gw * d['s']))
    o = hedef_w / ic.width
    ic = ic.resize((hedef_w, max(1, round(ic.height * o))), Image.LANCZOS)

    fx = 1 - d['x'] if aynali else d['x']      # aynada x ekseni doner
    hiza = d['hiza']
    if aynali:
        hiza = {'sag-ust': 'sol-ust', 'sol-ust': 'sag-ust'}.get(hiza, hiza)

    cx, cy = gx0 + gw * fx, gy0 + gh * d['y']
    if hiza == 'orta':       x, y = cx - ic.width / 2, cy - ic.height / 2
    elif hiza == 'alt-orta': x, y = cx - ic.width / 2, cy - ic.height
    elif hiza == 'ust-orta': x, y = cx - ic.width / 2, cy
    elif hiza == 'sag-ust':  x, y = cx - ic.width,     cy
    elif hiza == 'sol-ust':  x, y = cx,                cy
    else:                    x, y = cx, cy
    tuval.alpha_composite(ic, (int(round(x)), int(round(y))))


def katman(ad, boyut, gk):
    """Tek bir parcayi TAM TUVALE, son konumunda yazar."""
    d = ayar(ad)
    t = Image.new('RGBA', boyut, (0, 0, 0, 0))
    p = ac(os.path.join(KOK, ad + '.png'))
    yerlestir(t, p, d, gk)
    if d.get('aynala'):
        yerlestir(t, p, d, gk, aynali=True)
    return t


def main():
    gov = ac(os.path.join(KOK, 'dragon-base.png'))
    gk = icerik_kutusu(gov)
    os.makedirs(CIKTI, exist_ok=True)

    adlar = []
    for slot in KATMAN_SIRASI:
        for p in sorted(glob.glob(os.path.join(KOK, f'{slot}-*.png'))):
            adlar.append(os.path.basename(p)[:-4])

    toplam = 0
    for ad in adlar:
        t = katman(ad, gov.size, gk)
        yol = os.path.join(CIKTI, ad + '.webp')
        t.save(yol, 'WEBP', quality=90, method=6)
        toplam += os.path.getsize(yol)
    gov.save(os.path.join(CIKTI, 'base.webp'), 'WEBP', quality=92, method=6)
    toplam += os.path.getsize(os.path.join(CIKTI, 'base.webp'))

    print(f'{len(adlar)} katman + govde yazildi -> katman/  ({toplam // 1024} KB)')

    if '--onizle' in sys.argv:
        onizle(gov, gk, adlar)


def yazi(p, kalin=False):
    y = ('/System/Library/Fonts/Supplemental/Arial Bold.ttf' if kalin
         else '/System/Library/Fonts/Supplemental/Arial.ttf')
    try:
        return ImageFont.truetype(y, p)
    except Exception:
        return ImageFont.load_default()


def onizle(gov, gk, adlar):
    """Her slot icin: o slotun butun parcalari govdenin uzerinde yan yana.
       Hangi parcanin kaydigini ancak boyle gorulebiliyor."""
    os.makedirs(ONIZLEME, exist_ok=True)
    for slot in KATMAN_SIRASI:
        liste = [a for a in adlar if a.startswith(slot + '-')]
        if not liste:
            continue
        B = 190
        G = 8
        W = 20 * 2 + len(liste) * (B + G)
        im = Image.new('RGB', (W, 44 + B + 22), (24, 22, 32))
        d = ImageDraw.Draw(im)
        d.text((20, 14), f'{slot}  ({len(liste)})', font=yazi(14, True), fill=(230, 234, 248))
        for i, ad in enumerate(liste):
            kare = Image.new('RGBA', gov.size, (0, 0, 0, 0))
            kat = katman(ad, gov.size, gk)
            # Kanat/kuyruk govdenin ARKASINDA, tac/yuz/kolye ONUNDE
            if slot in ('wing', 'tail'):
                kare.alpha_composite(kat); kare.alpha_composite(gov)
            else:
                kare.alpha_composite(gov); kare.alpha_composite(kat)
            kare = kare.resize((B, B), Image.LANCZOS)
            kut = Image.new('RGB', (B, B), (38, 34, 50))
            kut.paste(kare, (0, 0), kare)
            im.paste(kut, (20 + i * (B + G), 40))
            d.text((20 + i * (B + G), 40 + B + 4), ad.split('-', 1)[1],
                   font=yazi(9), fill=(152, 158, 186))
        im.save(os.path.join(ONIZLEME, f'{slot}.png'))
    print('inceleme sayfalari -> onizleme/')


def ejderha(gov, gk, secim):
    """Tam bir ejderha. Katman sirasi:
         kanat -> kuyruk -> GOVDE -> tac -> yuz -> kolye

    Kanat ve kuyruk arkada, cunku ikisi de govdenin arkasindan cikiyor;
    kokleri govdenin altinda kalmali. Tac, yuz isareti ve kolye onde."""
    t = Image.new('RGBA', gov.size, (0, 0, 0, 0))
    # Kanat ve kuyruk govdenin ARKASINDA: ikisi de arkadan cikiyor ve
    # koklerinin govde tarafindan ortulmesi dogru olan.
    for slot in ('wing', 'tail'):
        if secim.get(slot):
            t.alpha_composite(katman(secim[slot], gov.size, gk))
    t.alpha_composite(gov)
    for slot in ('crown', 'face', 'necklace'):
        if secim.get(slot):
            t.alpha_composite(katman(secim[slot], gov.size, gk))
    return t


def kombinasyon_sayfasi():
    """Rastgele sekiz kombinasyon - hizalamanin asil sinavi."""
    import random
    gov = ac(os.path.join(KOK, 'dragon-base.png'))
    gk = icerik_kutusu(gov)
    havuz = {s: sorted(os.path.basename(p)[:-4]
                       for p in glob.glob(os.path.join(KOK, f'{s}-*.png')))
             for s in KATMAN_SIRASI}
    random.seed(7)
    B, G = 230, 10
    KOL = 4
    im = Image.new('RGB', (20 * 2 + KOL * (B + G), 44 + 2 * (B + 24)), (24, 22, 32))
    d = ImageDraw.Draw(im)
    toplam = 1
    for v in havuz.values():
        toplam *= len(v)
    d.text((20, 14), f'KOMB\u0130NASYON \u00d6RNEKLER\u0130  \u00b7  toplam {toplam:,} olas\u0131l\u0131k'.replace(',', '.'),
           font=yazi(14, True), fill=(230, 234, 248))
    for i in range(8):
        secim = {s: random.choice(havuz[s]) for s in KATMAN_SIRASI}
        kare = ejderha(gov, gk, secim).resize((B, B), Image.LANCZOS)
        kut = Image.new('RGB', (B, B), (38, 34, 50))
        kut.paste(kare, (0, 0), kare)
        x = 20 + (i % KOL) * (B + G)
        y = 40 + (i // KOL) * (B + 24)
        im.paste(kut, (x, y))
        d.text((x, y + B + 3), ' + '.join(secim[s].split('-', 1)[1] for s in KATMAN_SIRASI),
               font=yazi(8), fill=(150, 156, 184))
    os.makedirs(ONIZLEME, exist_ok=True)
    im.save(os.path.join(ONIZLEME, 'kombinasyon.png'))
    print('kombinasyon ornekleri -> onizleme/kombinasyon.png')


if __name__ == '__main__':
    main()
    if '--kombin' in sys.argv:
        kombinasyon_sayfasi()
