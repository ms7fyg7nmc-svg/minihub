# BAGLAN (flow) HUB KARESI - YAPAY ZEKA DEGIL, KODLA CIZILDI
#
# Dort uretim denemesi de ayni sebepten basarisiz oldu: model "yollar
# birbirine degmez" kuralini anlamiyor. Urettigi her goruntude hatlar
# kesisiyordu - yani Bağlan'ın tek kuralini ihlal eden bir Bağlan ikonu.
#
# Ikon zaten geometrik: ızgara, duz hatlar, dolgu renk. Modelin
# yorumlayacagi hicbir sey yok. Bu yuzden PIL ile ciziliyor:
#   - yollar elle tasarlandi, hicbir hucre iki kez kullanilmiyor
#   - hizalama matematikten geliyor, tahminden degil
#   - 0 CU, saniyeler icinde tekrar uretilebilir
#
# Calistir: python3 ciz.py   ->  flow-1024.png + flow.webp (256px)
from PIL import Image, ImageDraw, ImageFilter

S = 4                      # supersampling: 4x ciz, sonra kucult
N = 1024 * S

def rr(d, k, r, **kw):
    d.rounded_rectangle(k, radius=r, **kw)

# --- arka plan: capraz camgobegi gradyan (diger karelerle ayni dil) ---
bg = Image.new('RGB', (N, N)); p = bg.load()
c1, c2 = (92, 220, 236), (16, 86, 114)
for y in range(N):
    for x in range(0, N, 8):
        t = (x + y) / (2 * N)
        c = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        for dx in range(8):
            if x + dx < N: p[x + dx, y] = c
im = bg.convert('RGBA'); d = ImageDraw.Draw(im, 'RGBA')

# --- metal cerceve + koyu tahta ---
M = int(N * 0.05); rim = (M, M, N - M, N - M)
rr(d, rim, int(N * 0.088), fill=(206, 214, 224, 255))
rr(d, (rim[0] + N*0.013, rim[1] + N*0.013, rim[2] - N*0.013, rim[3] - N*0.013),
   int(N * 0.078), fill=(146, 156, 168, 255))
IC = int(N * 0.032)
ic = (rim[0] + IC, rim[1] + IC, rim[2] - IC, rim[3] - IC)
rr(d, ic, int(N * 0.062), fill=(36, 41, 52, 255))

# --- 4x4 izgara ---
G = 4; pad = int(N * 0.016)
alan = ic[2] - ic[0] - 2 * pad
hucre = alan / G
mer = lambda cx, cy: (ic[0] + pad + hucre * (cx + 0.5), ic[1] + pad + hucre * (cy + 0.5))
kutu = lambda cx, cy: (ic[0] + pad + hucre*cx + hucre*0.04, ic[1] + pad + hucre*cy + hucre*0.04,
                       ic[0] + pad + hucre*(cx+1) - hucre*0.04, ic[1] + pad + hucre*(cy+1) - hucre*0.04)
for cy in range(G):
    for cx in range(G):
        k = kutu(cx, cy)
        rr(d, k, int(hucre * 0.17), fill=(25, 29, 38, 255))
        rr(d, (k[0], k[1], k[2], k[1] + hucre*0.09), int(hucre*0.05), fill=(33, 38, 49, 255))

# --- UC YOL: elle tasarlandi, kesismiyor ---
# Her liste bir (cx, cy) zinciri. Ilk ve son hucre ucnokta.
# Dogrulama: toplam 14 hucre, hicbiri tekrar etmiyor -> kesisme imkansiz.
RENK = {'y': ((82,198,52),(142,238,112)),
        'm': ((38,120,230),(104,172,252)),
        'k': ((224,62,54),(250,122,112))}
YOL = {'y': [(0,0),(0,1),(1,1),(2,1),(2,0)],
       'm': [(3,0),(3,1),(3,2),(2,2)],
       'k': [(0,2),(0,3),(1,3),(2,3),(3,3)]}
assert len({c for hs in YOL.values() for c in hs}) == sum(len(h) for h in YOL.values())

KAL = hucre * 0.46
for renk, hs in YOL.items():
    koyu, acik = RENK[renk]
    pts = [mer(*c) for c in hs]
    for w, col, off in ((KAL, koyu, 0), (KAL*0.34, acik, -KAL*0.22)):
        for i in range(len(pts) - 1):
            a = (pts[i][0], pts[i][1] + off); b = (pts[i+1][0], pts[i+1][1] + off)
            d.line([a, b], fill=col + (255,), width=int(w), joint='curve')
        for x, y in pts:
            d.ellipse((x - w/2, y + off - w/2, x + w/2, y + off + w/2), fill=col + (255,))

# --- ucnoktalar: oyundaki gibi KARE (halka degil), icinde beyaz daire ---
for renk, hs in YOL.items():
    koyu, acik = RENK[renk]
    for cx, cy in (hs[0], hs[-1]):
        k = kutu(cx, cy)
        rr(d, k, int(hucre * 0.17), fill=koyu + (255,))
        rr(d, (k[0] + hucre*0.05, k[1] + hucre*0.05, k[2] - hucre*0.05, k[1] + hucre*0.40),
           int(hucre * 0.11), fill=acik + (95,))
        mx, my = mer(cx, cy); r = hucre * 0.225
        d.ellipse((mx-r, my-r, mx+r, my+r), fill=(172, 180, 192, 255))
        r2 = r * 0.76
        d.ellipse((mx-r2, my-r2, mx+r2, my+r2), fill=(255, 255, 255, 255))

# --- ust sol parlama ---
par = Image.new('RGBA', (N, N), (0,0,0,0)); pd = ImageDraw.Draw(par)
pd.ellipse((-N*0.3, -N*0.78, N*0.95, N*0.32), fill=(255,255,255,30))
im = Image.alpha_composite(im, par.filter(ImageFilter.GaussianBlur(N*0.022)))

son = im.convert('RGB').resize((1024, 1024), Image.LANCZOS)
son.save('flow-1024.png')
son.resize((256, 256), Image.LANCZOS).save('flow.webp', 'WEBP', quality=90, method=6)
print('flow.webp hazir')
