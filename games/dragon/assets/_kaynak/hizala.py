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
from PIL import Image, ImageDraw, ImageFont, ImageFilter
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
    # Cizimin kokü sol altta, ucu sag ustte: bu kanat SAG tarafa ait.
    # Once x=0.15 (sol) yazilmisti, yani ham kanat sola, aynasi saga
    # gidiyordu - ikisi de TERS takiliyordu: kol kemigi altta, pence
    # asagi bakiyordu. x=0.85'e alindi, ikisi de yer degistirdi.
    # y de 0.40'tan 0.47'ye indi: kok boyuna degil OMUZA gelsin diye.
    'wing':     dict(x=0.85, y=0.47, s=0.56, hiza='sol-ust', aynala=True),
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
    # KANAT ve KUYRUK artik EKLEM tablosundan, kok hizalamasiyla
    # yerlesiyor - parca basina ince ayara gerek kalmadi. Eski
    # 's' ve 'y' degerleri silindi; okuyan yanilmasin.

    # --- TAC ---
    # Taclar kafatasinin 12-17 piksel USTUNDE havada duruyordu (olculdu:
    # tacin alt kenari ile kafa yuzeyi arasindaki bosluk). Her taci
    # kafaya ~14 piksel gomulene kadar indirdim; boylece takilmis
    # gorunuyor, yapistirilmis degil.
    'crown-bronze':   dict(y=0.066),
    'crown-flame':    dict(y=0.065),
    'crown-golden':   dict(y=0.066),
    'crown-tiny':     dict(y=0.066),
    'crown-ice':      dict(s=0.30, y=0.056),   # uzun buz blogu, basi eziyordu
    'crown-king':     dict(y=0.065),
    'crown-silver':   dict(y=0.065),
    'crown-celestial': dict(s=0.48, y=0.072),  # digerlerine gore kucuk kaliyordu

    # --- KOLYE ---
    # Zincirlerin ust kemeri CENE HATTININ uzerinden geciyordu (olculdu:
    # her kolye boyun cizgisini 36-75 px asiyordu, bazisi agzin uzerinden
    # geciyordu). Her birini kendi asimi kadar asagi indirdim; artik
    # zincir boyunda, kolye gogsun uzerinde duruyor.
    'necklace-bronze':    dict(y=0.647),
    'necklace-celestial': dict(y=0.616),
    'necklace-fang':      dict(s=0.42, y=0.648),   # ip ince, dis asagi sarkiyor
    'necklace-flame':     dict(y=0.656),
    'necklace-royal':     dict(y=0.616),
    'necklace-sapphire':  dict(y=0.643),
}

# Kanat ve kuyruk GOVDENIN ARKASINDA cizilir. One cizilince kokleri
# govdenin uzerine sert bir kenarla biniyor, yapistirilmis duruyor;
# arkaya alininca kok govdenin ardinda kaliyor ve parca gercekten
# arkadan cikiyormus gibi okunuyor.
ARKA = {'wing', 'tail'}

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


# Temas golgesi: parca govdeye DEGIYOR gorunsun diye altina yumusak
# bir golge koyar. Golge parcanin kendi siluetinden uretilir, birkac
# piksel asagi kaydirilip bulaniklastirilir ve GOVDENIN siluetiyle
# kesilir - yani golge yalnizca ejderhanin uzerine duser, havaya degil.
# Golge katmanin icine pisirilir; oyun kodu fazladan is yapmaz.
GOLGE = {'crown': dict(kay=7, bulanik=7, siddet=0.38),
         'necklace': dict(kay=5, bulanik=5, siddet=0.30)}


def temas_golgesi(parca_katman, govde, ayarlar):
    a = np.array(parca_katman)[:, :, 3].astype(np.float32)
    g = np.zeros_like(a)
    k = ayarlar['kay']
    g[k:, :] = a[:-k, :]
    g = np.array(Image.fromarray(g.astype(np.uint8))
                 .filter(ImageFilter.GaussianBlur(ayarlar['bulanik']))).astype(np.float32)
    g *= np.array(govde)[:, :, 3].astype(np.float32) / 255.0   # sadece govdeye dus
    g *= (1.0 - a / 255.0)                                     # parcanin altinda kalmasin
    out = np.zeros(a.shape + (4,), np.uint8)
    out[:, :, 3] = (g * ayarlar['siddet']).astype(np.uint8)
    return Image.fromarray(out)



# ---------------------------------------------------------------------
# KOK HIZALAMA  (parcanin cercevesine gore degil, EKLEMINE gore)
#
# Onceki yontem parcayi kendi icerik kutusunun bir kosesinden
# yerlestiriyordu. Ama kutunun kosesi kanadin kokü degil: her kanat
# kendi karesinde farkli yerde duruyor, o yuzden hicbiri ayni noktada
# oturmuyordu ("milimetrik oturmuyor").
#
# Bunun yerine:
#   1. Parcanin KOK UCUNU bul (kalin olan uc; bu setin hepsinde SOL).
#   2. O ucun agirlik merkezini ve KALINLIGINI olc.
#   3. Olcegi, kok kalinligi hedef eklem kalinligina esit olacak sekilde
#      sec - boylece 8 kanadin hepsi AYNI kalinlikta bir omuzdan cikar.
#   4. Kok merkezini govdedeki sabit eklem noktasina oturt, biraz da
#      govdenin icine sok ki kok silueti ardinda kalsin.
# ---------------------------------------------------------------------

KOK_UCU = 'sol'          # bu setin tamami kokü solda cizilmis
KOK_PAY = 0.10           # ucun ilk %10'u "kok bolgesi" sayilir

# Govde ICERIK KUTUSUNA gore eklem noktasi ve hedef eklem kalinligi.
#   x, y      : eklemin yeri (0-1)
#   kalinlik  : kokun govde YUKSEKLIGINE orani
#   ic        : kok bu kadar piksel govdenin icine sokulur (kok gizlenir)
#   maks_en   : parcanin govde GENISLIGINE gore tavan eni
#
# Neden tavan gerekiyor: kok kalinligina gore olceklemek butun eklemleri
# esitliyor, ama ince kokten genis aciklik cikan cizimler (celestial,
# demon, lightning) o zaman kafayi asacak kadar buyuyor. Olcek ikisinin
# KUCUGU: eklem her zaman ayni, hicbir parca da ejderhayi yutmuyor.
EKLEM = {
    'wing': dict(x=0.80, y=0.60, kalinlik=0.072, ic=30, maks_en=0.60),
    'tail': dict(x=0.74, y=0.86, kalinlik=0.115, ic=34, maks_en=0.72),
}


def kok_olc(im):
    """Parcanin kok ucundaki agirlik merkezi (x, y) ve kalinligi."""
    a = np.array(im)[:, :, 3]
    x0, y0, x1, y1 = icerik_kutusu(im)
    g = x1 - x0
    w = max(2, int(g * KOK_PAY))
    sut = range(x0, x0 + w) if KOK_UCU == 'sol' else range(x1 - w, x1)

    toplam = 0.0; cx = 0.0; cy = 0.0; kalinliklar = []
    for x in sut:
        ys = np.nonzero(a[:, x] > 18)[0]
        if not len(ys):
            continue
        kalinliklar.append(ys.max() - ys.min() + 1)
        agirlik = a[ys, x].astype(np.float64)
        toplam += agirlik.sum()
        cx += x * agirlik.sum()
        cy += (ys * agirlik).sum()
    if toplam == 0:
        return (x0, (y0 + y1) / 2), 1.0
    return (cx / toplam, cy / toplam), float(np.mean(kalinliklar))


def koke_gore_yerlestir(tuval, parca, slot, gk, aynali=False):
    """Parcayi KOKUNDEN govdedeki eklem noktasina oturtur."""
    gx0, gy0, gx1, gy1 = gk
    gw, gh = gx1 - gx0, gy1 - gy0
    e = EKLEM[slot]

    ic = icerige_kirp(parca)
    (kx, ky), kalinlik = kok_olc(ic)

    olcek = (gh * e['kalinlik']) / max(1.0, kalinlik)
    tavan = (gw * e['maks_en']) / max(1, ic.width)
    olcek = min(olcek, tavan)
    yeni = (max(1, round(ic.width * olcek)), max(1, round(ic.height * olcek)))
    ic = ic.resize(yeni, Image.LANCZOS)
    kx *= olcek; ky *= olcek

    if aynali:
        ic = ic.transpose(Image.FLIP_LEFT_RIGHT)
        kx = ic.width - kx

    ex = gx0 + gw * (1 - e['x'] if aynali else e['x'])
    ey = gy0 + gh * e['y']
    ex += e['ic'] * (1 if aynali else -1)      # kok govdenin icine kaysin

    tuval.alpha_composite(ic, (int(round(ex - kx)), int(round(ey - ky))))


def katman(ad, boyut, gk, govde=None):
    """Tek bir parcayi TAM TUVALE, son konumunda yazar."""
    d = ayar(ad)
    t = Image.new('RGBA', boyut, (0, 0, 0, 0))
    p = ac(os.path.join(KOK, ad + '.png'))
    slot0 = ad.split('-')[0]
    if slot0 in EKLEM:
        koke_gore_yerlestir(t, p, slot0, gk)
        if d.get('aynala'):
            koke_gore_yerlestir(t, p, slot0, gk, aynali=True)
    else:
        yerlestir(t, p, d, gk)
        if d.get('aynala'):
            yerlestir(t, p, d, gk, aynali=True)

    slot = ad.split('-')[0]
    if slot in GOLGE and govde is not None:
        golge = temas_golgesi(t, govde, GOLGE[slot])
        t = Image.alpha_composite(golge, t)
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
        t = katman(ad, gov.size, gk, gov)
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
