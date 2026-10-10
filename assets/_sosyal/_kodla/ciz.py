# SOSYAL DUYURU GORSELLERI - URETILMEDI, KODLA KURULDU
#
# Dort duyuru, oyunun KENDI dosyalarindan: on kademe yumurta, gunluk
# gorevler, haftalik liderlik ve genel afis. Hepsi bos-afis.webp'in
# uzerine kuruluyor - yani zemin uretilmis sanat, uzerindeki nesneler
# oyunun gercek varliklari. 0 CU.
#
# Yazi KONMUYOR. Set'in geri kalaninda oldugu gibi: tek gorsel, basligi
# sonradan istedigin dilde koyarsin. Dort dile dort gorsel uretmek hem
# pahali hem her metin degisikliginde yeniden uretim demek.
#
# Calistir: python3 ciz.py
from PIL import Image, ImageDraw, ImageFilter
import os

KOK = os.path.join(os.path.dirname(__file__), '..', '..', '..')
CIK = os.path.join(os.path.dirname(__file__), '..')
ZEMIN = os.path.join(CIK, 'bos-afis.webp')
W, H = 1536, 864


def ac(yol, boy=None):
    im = Image.open(os.path.join(KOK, yol)).convert('RGBA')
    return im.resize((boy, boy), Image.LANCZOS) if boy else im


def zemin():
    """Bos afisi al, ustune yerlestirecegimiz seyler okunsun diye
    ortasini hafifce karart. Karartma RADYAL: kenarlardaki sandik ve
    yumurta gorunur kalsin, merkez sakinlessin."""
    z = Image.open(ZEMIN).convert('RGBA').resize((W, H), Image.LANCZOS)
    perde = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(perde)
    d.ellipse((-W * 0.15, -H * 0.45, W * 1.15, H * 1.05), fill=96)
    perde = perde.filter(ImageFilter.GaussianBlur(90))
    # Ilk deneme 150 opakliktaydi ve altin gokyuzunu grilestiriyordu;
    # zemin uretilmis sanatin en guzel yani o isik. Perde artik sadece
    # nesnelerin altini sakinlestirecek kadar, ve SICAK bir kahve -
    # soguk lacivert, uzerine konan altin nesneleri kirletiyordu.
    kara = Image.new('RGBA', (W, H), (46, 26, 16, 255))
    kara.putalpha(perde)
    return Image.alpha_composite(z, kara)


def parilti(im, x, y, r, renk=(255, 214, 120), guc=120):
    """Bir nesnenin arkasina sicak isik. Nesne zemine yapismasin diye."""
    kat = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(kat).ellipse((x - r, y - r, x + r, y + r), fill=renk + (guc,))
    return Image.alpha_composite(im, kat.filter(ImageFilter.GaussianBlur(r * 0.45)))


def koy(im, g, mx, my):
    """Merkezi (mx,my) olacak sekilde yerlestir."""
    im.alpha_composite(g, (int(mx - g.width / 2), int(my - g.height / 2)))


# ---------------------------------------------------------------- 1
def on_kademe_yumurta():
    """Zincirin tamami: Lv.1'den Lv.10'a, soldan saga buyuyerek.
    Boy kademeyle artiyor - yukari dogru giden bir sey oldugu
    anlatilmak isteniyor, on esit daire degil."""
    im = zemin()
    n = 10
    sol, sag = 118, W - 118
    adim = (sag - sol) / (n - 1)
    for i in range(n):
        lv = i + 1
        boy = int(84 + 62 * (i / (n - 1)) ** 1.25)      # 84 -> 146
        x = sol + adim * i
        y = H * 0.56 + (1 - i / (n - 1)) * 26            # hafif yukari egim
        im = parilti(im, x, y, boy * 0.72, guc=86)
        koy(im, ac(f'games/dragon/assets/eggs/egg-{lv}-192.webp', boy), x, y)
    return im


# ---------------------------------------------------------------- 2
def gunluk_gorevler():
    """Parsomen ortada, sandik onun onunde: "gorevleri bitir, sandigi
    ac". Sira soldan saga degil, ust-alt: once is, sonra odul."""
    im = zemin()
    im = parilti(im, W * 0.5, H * 0.40, 230, guc=70)
    koy(im, ac('assets/icons/gorev.webp', 300), W * 0.5, H * 0.38)
    im = parilti(im, W * 0.5, H * 0.74, 190, guc=130)
    koy(im, ac('assets/icons/sandik-acik.webp', 268), W * 0.5, H * 0.74)
    # iki yana oyunun para birimi
    im = parilti(im, W * 0.21, H * 0.62, 112, guc=80)
    koy(im, ac('assets/coin-128.webp', 150), W * 0.21, H * 0.62)
    im = parilti(im, W * 0.79, H * 0.62, 112, guc=80)
    koy(im, ac('assets/icons/kese.webp', 170), W * 0.79, H * 0.62)
    return im


# ---------------------------------------------------------------- 3
def haftalik_liderlik():
    """Rozet ortada ve en buyuk, iki yanda sikke ve yildiz kabi.
    Siralama numaralari YOK - sablon her hafta kullanilacak."""
    im = zemin()
    im = parilti(im, W * 0.5, H * 0.52, 250, guc=120)
    koy(im, ac('assets/icons/rozet.webp', 360), W * 0.5, H * 0.50)
    for x, yol, boy in ((0.235, 'assets/coin-128.webp', 168),
                        (0.765, 'assets/packs/star-chest-256.webp', 196)):
        im = parilti(im, W * x, H * 0.63, boy * 0.68, guc=80)
        koy(im, ac(yol, boy), W * x, H * 0.63)
    return im


# ---------------------------------------------------------------- 4
def genel_afis():
    """Uzerine her turlu baslik konabilecek notr afis. Nesneler ALT
    seride toplaniyor, ust ucte bos gokyuzu kaliyor."""
    im = zemin()
    seri = [('games/dragon/assets/eggs/egg-7-192.webp', 0.14, 124),
            ('assets/coin-128.webp', 0.30, 128),
            ('assets/icons/sandik-acik.webp', 0.50, 210),
            ('assets/packs/star-pouch-256.webp', 0.70, 150),
            ('games/dragon/assets/eggs/egg-10-192.webp', 0.86, 132)]
    for yol, x, boy in seri:
        im = parilti(im, W * x, H * 0.76, boy * 0.70, guc=84)
        koy(im, ac(yol, boy), W * x, H * 0.76)
    return im


if __name__ == '__main__':
    for ad, fn in (('on-kademe-yumurta', on_kademe_yumurta),
                   ('gunluk-gorevler', gunluk_gorevler),
                   ('haftalik-liderlik', haftalik_liderlik),
                   ('genel-afis', genel_afis)):
        yol = os.path.join(CIK, ad + '.webp')
        fn().convert('RGB').save(yol, 'WEBP', quality=88, method=6)
        print(f'{ad:22s} {os.path.getsize(yol)//1024} KB')
