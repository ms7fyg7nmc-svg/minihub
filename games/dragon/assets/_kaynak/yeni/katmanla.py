# KATMAN SISTEMI
#
# Sorun: layerize parcalari kendi sinirlarina kirpilmis ve farkli
# olceklerde donduruyor. Her seferinde "neresi acaba" diye tahmin
# etmek birlesme hatalarina yol aciyor.
#
# Cozum uc asamali. Sektorde (Spine, DragonBones, uretken NFT
# koleksiyonlari) kullanilan model de bu: parca kendi konumunu
# tasimaz, ISIMLENDIRILMIS BIR CAPAYA baglanir.
#
#   1. KILITLEME  - her katman kaynakla PIKSEL ESLESTIRILEREK tuvale
#                   oturtulur. Tahmin yok: dogru yerde hata ~0 cikar,
#                   yanlis yerde buyuk. Esigi gecemezse basarisiz
#                   oldugunu SOYLER, sessizce yanlis yere koymaz.
#                   Bir kez calisir, sonuc dosyaya yazilir.
#
#   2. CAPA CIKARMA - iki katmanin EKLEMI, o iki katmanin ortusme
#                   bolgesidir. Kafa n govde = boyun. Ayak n govde =
#                   ayak bilegi. Olculur, uydurulmaz.
#                   Her capa: merkez (x, y) + kalinlik.
#
#   3. BAGLAMA    - her aksesuar bir capa ADI'na baglanir. Yerlesim
#                   = capa noktasi, olcek = parcanin kok kalinligi
#                   capa kalinligina esitlenecek sekilde.
#                   Aksesuar eklemek tek satir: {'slot': 'boyun'}.
#
# Cikti: katmanlar TAM TUVALDE, son konumunda + capa.json
# Oyun kodu hicbir hesap yapmaz.

import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.signal import fftconvolve

KOK = os.path.dirname(os.path.abspath(__file__))
TUVAL = 1024
ESIK_ALFA = 40


# ---------------------------------------------------------------- 1


def _dizi(im):
    a = np.array(im.convert('RGBA'))
    return a[:, :, :3].astype(np.float32), (a[:, :, 3] > ESIK_ALFA)


def _hata_haritasi(L, Lm, S, Sm):
    """Her otelemede, ortusen maskedeki ortalama mutlak RGB farki.

    SSD'yi FFT ile hesapliyoruz: sum((L-S)^2) = sum(L^2) - 2*sum(L*S)
    + sum(S^2), hepsi maskeyle sinirli. Dogrudan tarama cok yavas.
    """
    flip = lambda M: M[::-1, ::-1]
    ort = fftconvolve(Sm.astype(np.float32), flip(Lm.astype(np.float32)), 'valid')
    ssd = np.zeros_like(ort)
    for k in range(3):
        Lk, Sk = L[:, :, k] * Lm, S[:, :, k] * Sm
        ssd += (fftconvolve(Sk ** 2, flip(Lm.astype(np.float32)), 'valid')
                - 2 * fftconvolve(Sk, flip(Lk), 'valid')
                + fftconvolve(Sm.astype(np.float32), flip(Lk ** 2), 'valid'))
    gecerli = ort > (Lm.sum() * 0.25)          # yeterince ortusmeyen konum sayilmaz
    hata = np.sqrt(np.maximum(ssd, 0) / np.maximum(ort * 3, 1))
    hata[~gecerli] = 1e9
    return hata, ort


def kilitle(katman_yolu, kaynak_im, olcek_araligi=(0.08, 0.80),
            kaba_boy=256, min_guven=1.8):
    """Katmani kaynaga piksel eslestirerek konumlandirir.

    Olcut MUTLAK hata degil, GUVEN. Layerize ciktiyi 2K'da yeniden
    isledigi icin pikseller birebir ayni degil: dogru konumda bile
    ~14/255 taban hata var. Onemli olan en iyi konumun digerlerinden
    ne kadar AYRISTIGI - keskin bir minimum kilidin dogru oldugunu
    gosterir, duz bir alan tahmin ettigimizi.

    guven = (komsulugun medyan hatasi) / (en iyi hata)

    Doner: dict(olcek, x, y, hata, guven) ya da guven dusukse None.
    """
    kat = Image.open(katman_yolu).convert('RGBA')
    S_tam, Sm_tam = _dizi(kaynak_im)
    W = kaynak_im.width

    # --- kaba tarama (kucuk cozunurlukte, genis olcek araligi)
    k = kaba_boy / W
    S_k = np.array(kaynak_im.convert('RGBA').resize((kaba_boy, kaba_boy), Image.LANCZOS))
    Sk_rgb, Sk_m = S_k[:, :, :3].astype(np.float32), (S_k[:, :, 3] > ESIK_ALFA)

    en = None
    for s in np.arange(olcek_araligi[0], olcek_araligi[1], 0.01):
        w, h = int(kat.width * s * k), int(kat.height * s * k)
        if w < 6 or h < 6 or w > kaba_boy or h > kaba_boy:
            continue
        A = np.array(kat.resize((w, h), Image.LANCZOS))
        Lm = A[:, :, 3] > ESIK_ALFA
        if Lm.sum() < 60:
            continue
        hata, _ = _hata_haritasi(A[:, :, :3].astype(np.float32), Lm, Sk_rgb, Sk_m)
        y, x = np.unravel_index(np.argmin(hata), hata.shape)
        v = float(hata[y, x])
        if en is None or v < en[0]:
            en = (v, float(s), int(x / k), int(y / k))

    if en is None:
        return None

    # --- ince tarama (tam cozunurlukte, dar pencere)
    _, s0, x0, y0 = en
    iyi = None
    for s in np.arange(max(0.02, s0 - 0.02), s0 + 0.02, 0.0025):
        w, h = int(kat.width * s), int(kat.height * s)
        if w < 8 or h < 8 or w > W or h > W:
            continue
        A = np.array(kat.resize((w, h), Image.LANCZOS))
        L, Lm = A[:, :, :3].astype(np.float32), (A[:, :, 3] > ESIK_ALFA)
        if Lm.sum() < 200:
            continue
        for dy in range(-14, 15, 2):
            for dx in range(-14, 15, 2):
                x, y = x0 + dx, y0 + dy
                if x < 0 or y < 0 or x + w > W or y + h > W:
                    continue
                pen_m = Sm_tam[y:y + h, x:x + w]
                ort = Lm & pen_m
                n = int(ort.sum())
                if n < Lm.sum() * 0.25:
                    continue
                fark = np.abs(L[ort] - S_tam[y:y + h, x:x + w][ort]).mean(axis=1)
                # ORTALAMA degil UYAN PIKSEL ORANI: layerize katmanlari
                # tamamliyor (kafatasinda goz yok, govdede kollarin arkasi
                # dolduruldu), o bolgeler ortalamayi her yerde yukseltip
                # minimumu yok ediyordu. Uyan oran, doldurulan yerleri
                # aykiri deger olarak disarida birakir.
                d = -float((fark < 22).mean())
                if iyi is None or d < iyi[0]:
                    iyi = (d, float(s), x, y)

    if iyi is None:
        return None

    # --- guven: en iyi konum komsularindan ne kadar ayrisiyor
    d0, s, x, y = iyi
    kat2 = kat.resize((int(kat.width * s), int(kat.height * s)), Image.LANCZOS)
    A = np.array(kat2)
    L, Lm = A[:, :, :3].astype(np.float32), (A[:, :, 3] > ESIK_ALFA)
    h, w = Lm.shape
    komsu = []
    for dy in range(-40, 41, 5):
        for dx in range(-40, 41, 5):
            xx, yy = x + dx, y + dy
            if xx < 0 or yy < 0 or xx + w > W or yy + h > W:
                continue
            ort = Lm & Sm_tam[yy:yy + h, xx:xx + w]
            if ort.sum() < Lm.sum() * 0.25:
                continue
            f = np.abs(L[ort] - S_tam[yy:yy + h, xx:xx + w][ort]).mean(axis=1)
            komsu.append(-float((f < 22).mean()))
    guven = float(d0 / np.median(komsu)) if komsu and np.median(komsu) < 0 else 0.0
    if guven < min_guven:
        return None
    return dict(olcek=round(s, 4), x=x, y=y,
                uyan=round(-d0, 3), guven=round(guven, 2))


def tuvale_yaz(katman_yolu, yer, boyut):
    kat = Image.open(katman_yolu).convert('RGBA')
    s = yer['olcek']
    kat = kat.resize((int(kat.width * s), int(kat.height * s)), Image.LANCZOS)
    t = Image.new('RGBA', boyut, (0, 0, 0, 0))
    t.alpha_composite(kat, (yer['x'], yer['y']))
    return t


# ---------------------------------------------------------------- 2


def capa_cikar(a, b):
    """Iki katmanin EKLEMI = ortusme bolgesi. Olculur, uydurulmaz.

    Doner: dict(x, y, kalinlik, alan) - kalinlik eklemin dar eksenindeki
    genisligi, yani aksesuarin kok kalinliginin esitlenecegi sayi.
    """
    A = np.array(a)[:, :, 3] > ESIK_ALFA
    B = np.array(b)[:, :, 3] > ESIK_ALFA
    O = A & B
    n = int(O.sum())
    if n < 50:
        return None
    ys, xs = np.nonzero(O)
    gen = xs.max() - xs.min() + 1
    yuk = ys.max() - ys.min() + 1
    return dict(x=int(round(xs.mean())), y=int(round(ys.mean())),
                kalinlik=int(min(gen, yuk)), genislik=int(gen),
                yukseklik=int(yuk), alan=n)


# ---------------------------------------------------------------- 3


def bagla(parca_im, capa, hedef='genislik', kok_ucu='sol', kok_pay=0.10,
          ic=0.0, kaydir=(0, 0), tuval=(TUVAL, TUVAL), aynali=False):
    """Bir aksesuari ISIMLENDIRILMIS BIR CAPAYA baglar.

    Sektordeki 'bone / point attachment' modelinin karsiligi: parca
    kendi konumunu tasimaz, capanin konumunu devralir.

      - Parcanin KOK ucu bulunur (kalin olan uc), merkezi ve kalinligi
        olculur.
      - Olcek, kok kalinligi capanin olcusune esit olacak sekilde
        secilir. Boylem butun varyantlar AYNI kalinlikta baglanir.
      - Kok merkezi capa noktasina oturur; 'ic' kadar govdenin icine
        kaydirilir ki kok silueti ardinda kalsin.

    hedef: capanin hangi olcusune esitlenecek - 'genislik', 'yukseklik'
           ya da 'kalinlik'.
    """
    ic_im = _icerige_kirp(parca_im)
    (kx, ky), kalin = _kok_olc(ic_im, kok_ucu, kok_pay)

    olcek = float(capa[hedef]) / max(1.0, kalin)
    w, h = max(1, round(ic_im.width * olcek)), max(1, round(ic_im.height * olcek))
    ic_im = ic_im.resize((w, h), Image.LANCZOS)
    kx *= olcek
    ky *= olcek
    if aynali:
        ic_im = ic_im.transpose(Image.FLIP_LEFT_RIGHT)
        kx = w - kx

    x = capa['x'] + kaydir[0] + (ic if aynali else -ic)
    y = capa['y'] + kaydir[1]
    t = Image.new('RGBA', tuval, (0, 0, 0, 0))
    t.alpha_composite(ic_im, (int(round(x - kx)), int(round(y - ky))))
    return t


def _icerige_kirp(im):
    a = np.array(im)[:, :, 3]
    ys, xs = np.nonzero(a > 18)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def _kok_olc(im, uc='sol', pay=0.10):
    a = np.array(im)[:, :, 3]
    w = max(2, int(im.width * pay))
    sut = range(0, w) if uc == 'sol' else range(im.width - w, im.width)
    top = cx = cy = 0.0
    kal = []
    for x in sut:
        ys = np.nonzero(a[:, x] > 18)[0]
        if not len(ys):
            continue
        kal.append(ys.max() - ys.min() + 1)
        ag = a[ys, x].astype(np.float64)
        top += ag.sum(); cx += x * ag.sum(); cy += (ys * ag).sum()
    if top == 0:
        return (0, im.height / 2), 1.0
    return (cx / top, cy / top), float(np.mean(kal))


# ---------------------------------------------------------------- 1b


def dikis_kapat(ham_yollar, yerler, kaynak_im, govde='govde',
                pencere=22, olcek_pay=0.035, olcek_adim=7):
    """Bagimsiz kilitlenen katmanlarin DIKISLERINI kapatir.

    Her katmani tek tek en iyi yere koymak yetmiyor: layerize parcalari
    temiz bir sinirdan kesip her birini ayri tamamladigi icin, bagimsiz
    yerlesimde aralarinda bosluk kaliyor (boyunda yatay serit, ayakta
    kama).

    Olcut sert ve kontrol edilebilir:
        ACIK  = orijinalin DOLU oldugu ama birlesigin BOS kaldigi piksel
        TASMA = birlesigin orijinal siluetin DISINA tastigi piksel

    Govde sabit tutulur (ebeveyn), cocuk katmanlar kucuk bir pencerede
    skoru (ACIK + 0.6*TASMA) en aza indirecek sekilde kaydirilir.

    Butun otelemeler tek bir FFT korelasyonuyla hesaplanir; tek tek
    yeniden cizmek 7.400 kat daha yavasti.
    """
    O = np.array(kaynak_im)[:, :, 3] > ESIK_ALFA
    H, W = O.shape
    flip = lambda M: M[::-1, ::-1]

    sabit = np.array(tuvale_yaz(ham_yollar[govde], yerler[govde],
                                kaynak_im.size))[:, :, 3] > ESIK_ALFA
    yeni = {govde: dict(yerler[govde])}
    kapali = sabit.copy()

    for ad in [a for a in yerler if a != govde]:
        taban = yerler[ad]
        kat = Image.open(ham_yollar[ad]).convert('RGBA')
        kalan = (O & ~kapali).astype(np.float32)     # kapatilmasi gereken
        disi = (~O).astype(np.float32)               # tasilmamasi gereken
        en = None

        for ds in np.linspace(-olcek_pay, olcek_pay, olcek_adim):
            s = round(taban['olcek'] * (1 + ds), 4)
            w, h = int(kat.width * s), int(kat.height * s)
            if w < 8 or h < 8 or w > W or h > H:
                continue
            M = (np.array(kat.resize((w, h), Image.LANCZOS))[:, :, 3]
                 > ESIK_ALFA).astype(np.float32)
            kapatir = fftconvolve(kalan, flip(M), 'valid')   # her otelemede kapanan
            tasar = fftconvolve(disi, flip(M), 'valid')      # her otelemede tasan
            skor = -kapatir + 0.6 * tasar
            # yalnizca kilit noktasinin cevresindeki pencere
            x0, y0 = taban['x'], taban['y']
            for dy in range(-pencere, pencere + 1):
                for dx in range(-pencere, pencere + 1):
                    x, y = x0 + dx, y0 + dy
                    if x < 0 or y < 0 or y >= skor.shape[0] or x >= skor.shape[1]:
                        continue
                    v = float(skor[y, x])
                    if en is None or v < en[0]:
                        en = (v, s, x, y, M, float(kapatir[y, x]), float(tasar[y, x]))

        _, s, x, y, M, kap, tas = en
        yeni[ad] = dict(olcek=s, x=x, y=y, kapatti=int(kap), tasma=int(tas))
        t = np.zeros((H, W), bool)
        t[y:y + M.shape[0], x:x + M.shape[1]] = M > 0
        kapali |= t

    return yeni, int((O & ~kapali).sum())


# ---------------------------------------------------------------- 1c


def acigi_yamala(kat, kaynak_im, ebeveyn='govde', tasir=3, halka=15):
    """Hicbir katmanin kaplamadigi pikselleri EBEVEYN katmana yamalar.

    Layerize parcalari temiz bir sinirdan kesiyor ve her birini ayri
    tamamliyor; arada kimseye ait olmayan bir serit kaliyor (boyunda
    yatay serit, ayakta kama). Kaydirmak bunu kapatmiyor - olculdu,
    8931 -> 8897, yani bir YERLESIM hatasi degil, eksik malzeme.

    O piksellerin DOGRU rengi orijinalde yazili, oradan aliniyor.
    Tek puruz: layerize ciktiyi yeniden isledigi icin katman renkleri
    orijinalden ~14/255 kayik, dogrudan kopyalayinca yama ton olarak
    siritiyor. Bu yuzden yamanin cevresindeki halkada olculen ton farki
    yamaya da uygulaniyor.

    DENENIP ELENEN IKI YOL (tekrar denenmesin):
      - Ortak olcek: butun katmanlari tek olcege zorlamak. Daha kotu
        (acik 8897 -> 16435, tasma patliyor). Layerize her katmani
        gercekten farkli olcekte donduruyor.
      - En yakin komsu dolgusu: bosluga en yakin saglam govde pikselini
        kopyalamak. Felaket - bosluklar KONTURA bitisik oldugu icin
        siyah bulasiyor.
    """
    OK = np.array(kaynak_im).astype(np.float32)
    O = OK[:, :, 3] > ESIK_ALFA
    kapali = np.zeros(O.shape, bool)
    for im in kat.values():
        kapali |= np.array(im)[:, :, 3] > ESIK_ALFA

    acik = ndimage.binary_closing(O & ~kapali, np.ones((3, 3)))
    if not acik.any():
        return kat, 0
    yama = ndimage.binary_dilation(acik, np.ones((tasir, tasir))) & O

    g = np.array(kat[ebeveyn]).astype(np.float32)
    gm = np.array(kat[ebeveyn])[:, :, 3] > ESIK_ALFA
    cevre = (ndimage.binary_dilation(yama, np.ones((halka, halka)))
             & ~yama & gm)
    for k in range(3):
        d = (g[:, :, k][cevre] - OK[:, :, k][cevre]).mean() if cevre.any() else 0.0
        g[:, :, k][yama] = np.clip(OK[:, :, k][yama] + d, 0, 255)
    g[:, :, 3][yama] = 255

    kat = dict(kat)
    kat[ebeveyn] = Image.fromarray(g.astype(np.uint8))
    return kat, int(yama.sum())


# ---------------------------------------------------------------- 1d


def temizle(kat, uzaklik=10, en_kucuk=0.02):
    """Katmanlardaki HAVADA ASILI parcalari atar.

    Layerize bir parcayi kesip cikarirken geride ince cizgi artiklari
    birakiyor; yama asamasi da dagini k bosluklari doldururken kucuk
    adalar olusturuyor. Ikisi ayni degil:

      - dikis dolgusu  -> ana kutleye BITISIK (olculdu: 3.2 px)
      - cizgi artigi   -> ana kutleden UZAKTA (olculdu: 32-351 px)

    Bu yuzden olcut boyut degil UZAKLIK. Boyut esigi iki ayagi birden
    atmaya ya da dolguyu silmeye yol aciyordu.
    """
    cikti, rapor = {}, {}
    for ad, im in kat.items():
        a = np.array(im)
        m = a[:, :, 3] > ESIK_ALFA
        et, n = ndimage.label(m)
        if n <= 1:
            cikti[ad] = im; rapor[ad] = 0; continue
        boy = ndimage.sum(m, et, range(1, n + 1))
        ana = int(np.argmax(boy)) + 1
        mes = ndimage.distance_transform_edt(et != ana)
        at = np.zeros_like(m)
        for i in range(1, n + 1):
            if i == ana:
                continue
            mm = (et == i)
            if boy[i - 1] >= boy.max() * en_kucuk:   # ikinci ayak gibi buyuk parcalar
                continue
            if float(mes[mm].min()) > uzaklik:
                at |= mm
        a = a.copy(); a[:, :, 3][at] = 0
        cikti[ad] = Image.fromarray(a); rapor[ad] = int(at.sum())
    return cikti, rapor


# ---------------------------------------------------------------- 2b


def maskeden_kur(ham_im, M, kaynak_im, sira):
    """Katmanlari MASKEDEN kurar; renkleri ORIJINALDEN alir.

    Layerize'in PIKSELLERINI kullanmak bitmek bilmeyen bir yama
    dongusune sokuyordu: cikti 2K'da yeniden islendigi icin renkler
    ~14/255 kayiktı, boynuzlarin altina golge pismisti, kenarlar
    kayiyordu. Her duzeltme yeni bir kusur yaratti.

    Dogrusu: layerize'dan SADECE SEKIL (maske) alinir, gorunen her
    pikselin rengi orijinalden kopyalanir. Yalnizca ORTULU kalan
    yerler (kafanin arkasindaki boyun gibi) modelin tamamlamasindan
    gelir - zaten gorunmezler, sadece ust katman kaldirilinca ortaya
    cikarlar.

    Sonuc olculdu: fark 6.66/255 -> 0.0005/255.
    """
    OK = np.array(kaynak_im)
    AL = OK[:, :, 3]
    ustteki = np.zeros(AL.shape, bool)
    kat = {}
    for ad in reversed(sira):
        gor = M[ad] & ~ustteki
        ort = M[ad] & ustteki
        a = np.zeros_like(OK)
        a[gor] = OK[gor]
        a[ort] = ham_im[ad][ort]
        a[:, :, 3][M[ad]] = AL[M[ad]]        # kenar yumusakligi orijinalden
        kat[ad] = Image.fromarray(a)
        ustteki |= M[ad]
    return kat


def bosluklari_dagit(M, O, sira):
    """Hicbir maskeye dusmeyen pikselleri EN YAKIN katmana dagitir.

    Bunlari hep ebeveyne (govde) atiyordum; sonuc, siluetin sol
    kenarinda KONTURUN KOPMASIYDI - kolun kenar cizgisi govdeye
    gidince orada siyah cizgi kayboluyor, kenar tirtikli cikiyordu.

    En yakin katmana atamak hem cizgiyi tamamliyor hem parcayi
    semantik olarak dogru yerde tutuyor (kolun konturu kolda kalir).
    Olculdu: acik 1135 -> 4 piksel.
    """
    etiket = np.zeros(O.shape, np.int32)
    for i, ad in enumerate(sira, 1):
        etiket[M[ad]] = i                    # ustteki alttakini ezer
    bos = O & (etiket == 0)
    if not bos.any():
        return M, 0
    _, idx = ndimage.distance_transform_edt(etiket == 0, return_indices=True)
    etiket[bos] = etiket[idx[0][bos], idx[1][bos]]
    M = dict(M)
    for i, ad in enumerate(sira, 1):
        M[ad] = M[ad] | ((etiket == i) & bos)
    return M, int(bos.sum())
