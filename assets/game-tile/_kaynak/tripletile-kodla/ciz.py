# UCLU ESLESTIR (tripletile) HUB KARESI - KODLA CIZILDI
#
# Kural (bkz. ../../README.md): hub karesi oyunun KENDI parcalarini
# gosterir. Oyunun taslari 9 Ekim'de emojiden gercek cizimlere gecti
# (assets/tripletile/), dolayisiyla eski kare - baska bir elden cikma
# uc limon - artik oyunda olmayan bir sey gosteriyordu.
#
# Yeni kare o ikonlarin TA KENDISINDEN kuruluyor: ayni dosyalar, ayni
# karo renkleri, oyundakiyle ayni kose yariciligi. Uretim gerekmiyor,
# 0 CU, ve oyunun taslari degisirse bu betik tekrar calistirilir.
#
# Calistir: python3 ciz.py  ->  tripletile-1024.png + tripletile.webp
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

S = 4
N = 1024 * S
IK = os.path.join(os.path.dirname(__file__), '../../../tripletile')

# UCU DE AYNI TAS. Once uc farkli oge (elma/can/limon) denendi ve
# oyunun cesitliligini gosteriyordu, ama karenin anlatmasi gereken sey
# cesitlilik degil MEKANIK: "ayni seyden uc tane topla". Tek bakista
# bunu soyleyen sey ucunun de ayni olmasi.
# Limon, KINDS[2] - oyunun kendi dosyasi, oyunun kendi karo rengi.
TASLAR = [('lemon', '#f5b942')] * 3
hx = lambda c: tuple(int(c[i:i+2], 16) for i in (1, 3, 5))

def rr(d, k, r, **kw):
    d.rounded_rectangle(k, radius=r, **kw)

# --- arka plan: derin teal, capraz isik ---
# Dort zemin denendi (amber / teal / bordo / lacivert) ve 72 pikselde
# kiyaslandi. Amber zemin karolarla ayni renk ailesinde oldugu icin
# taslar zemine yapisiyordu; teal, amberin tam karsisinda durdugu icin
# karolari one cikariyor.
bg = Image.new('RGB', (N, N)); p = bg.load()
c1, c2 = (38, 122, 132), (14, 54, 66)
for y in range(N):
    for x in range(0, N, 8):
        t = (x + y) / (2 * N)
        c = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        for dx in range(8):
            if x + dx < N: p[x + dx, y] = c
im = bg.convert('RGBA')

def kat(px, ciz):
    """Yari saydam bir sekli AYRI katmana cizip dondurur.

    PIL'in ImageDraw.Draw(im, 'RGBA') kipi RGBA bir goruntude beklenen
    karisimi YAPMIYOR: yari saydam dolguyu altindaki pikselle
    harmanlamak yerine uzerine YAZIYOR. (255,255,255,26) ile cizilen bir
    vurgu, karonun rengini silip neredeyse seffaf bir delik birakiyor ve
    altindaki koyu tahta goruluyor - yani aydinlatmasi gereken sey
    karartiyor. Dogrusu: ayri katman + alpha_composite."""
    k = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    ciz(ImageDraw.Draw(k))
    return k


def tas(ad, renk, px):
    """Oyundaki .tile ile ayni: renkli yuvarlak kare + %70 ikon."""
    r = int(px * 0.13)                       # tripletile.css: border-radius 12/92
    t = kat(px, lambda d: rr(d, (0, 0, px - 1, px - 1), r, fill=hx(renk) + (255,)))
    # ust kenarda hafif aydinlik, altta koyu: taslara kalinlik hissi
    t.alpha_composite(kat(px, lambda d: rr(d, (0, 0, px - 1, int(px * 0.34)), r,
                                           fill=(255, 255, 255, 30))))
    t.alpha_composite(kat(px, lambda d: rr(d, (0, int(px * 0.74), px - 1, px - 1), r,
                                           fill=(0, 0, 0, 34))))
    # Vurgular karonun DISINA tasmasin: silueti tekrar maskele.
    maske = kat(px, lambda d: rr(d, (0, 0, px - 1, px - 1), r, fill=(255, 255, 255, 255)))
    t.putalpha(Image.fromarray(
        (np.array(t.split()[3], dtype=np.uint16) * np.array(maske.split()[3], dtype=np.uint16)
         // 255).astype('uint8')))
    ik = Image.open(os.path.join(IK, ad + '.webp')).convert('RGBA')
    s = int(px * 0.70)
    t.alpha_composite(ik.resize((s, s), Image.LANCZOS), ((px - s) // 2, (px - s) // 2))
    return t

# --- uc tas, hafif donuk, ustuste binen bir yigin ---
# Aci ve konum elle secildi: ucu de tam gorunuyor, hicbiri digerinin
# ikonunu kapatmiyor.
# Karolar kadraji DOLDURUYOR. Ilk denemede 0.545 idi ve etrafinda genis
# bos zemin kaliyordu; 72 piksele indiginde tas kalmiyordu geriye.
PX = int(N * 0.615)
YER = [(-8, (-0.045, -0.020)), (9, (0.395, -0.055)), (-3, (0.175, 0.370))]
for (ad, renk), (aci, (fx, fy)) in zip(TASLAR, YER):
    kare = tas(ad, renk, PX)
    golge = kat(PX, lambda d: rr(d, (0, 0, PX - 1, PX - 1), int(PX * 0.13),
                                 fill=(0, 0, 0, 150)))
    golge = golge.rotate(aci, expand=True, resample=Image.BICUBIC)
    golge = golge.filter(ImageFilter.GaussianBlur(N * 0.013))
    kare = kare.rotate(aci, expand=True, resample=Image.BICUBIC)
    x, y = int(N * fx), int(N * fy)
    im.alpha_composite(golge, (x, y + int(N * 0.018)))
    im.alpha_composite(kare, (x, y))

# --- ust sol parlama ---
par = Image.new('RGBA', (N, N), (0, 0, 0, 0))
ImageDraw.Draw(par).ellipse((-N * 0.3, -N * 0.8, N * 0.95, N * 0.30), fill=(255, 255, 255, 26))
im = Image.alpha_composite(im, par.filter(ImageFilter.GaussianBlur(N * 0.022)))

son = im.convert('RGB').resize((1024, 1024), Image.LANCZOS)
son.save(os.path.join(os.path.dirname(__file__), 'tripletile-1024.png'))
son.resize((256, 256), Image.LANCZOS).save(
    os.path.join(os.path.dirname(__file__), 'tripletile.webp'), 'WEBP', quality=90, method=6)
print('tripletile.webp hazir')
