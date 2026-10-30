# GitHub iş akışları — şimdilik beklemede

Bu klasördeki iki dosya **çalışmıyor.** `.github/workflows/` altında
olsalardı çalışırlardı; oraya konmuyorlar çünkü iki engel var.

## Neden burada duruyorlar

**1. Jeton yok.** `claude-code-action` `CLAUDE_CODE_OAUTH_TOKEN`
istiyor. O jeton `claude setup-token` ile üretiliyor ve bu komut
tarayıcıdan Claude'a giriş yapmayı gerektiriyor — Volkan'ın
makinesinde o giriş çalışmıyor. API anahtarı alternatifi ayrıca
faturalanıyor, yani "aboneliğinden yer" avantajını bitiriyor.

**2. Push bile edilemiyor.** Depoya bağlı jetonun `workflow` yetkisi
yok; `.github/workflows/` altına dosya koymaya çalışan her push
GitHub tarafından reddediliyor — sadece o dosya değil, **o push'un
tamamı.** Yani orada dururken hiçbir şey yayınlanamıyordu.

## Yerine ne yapıldı

Gece ajanı **Volkan'ın Mac'inde** çalışıyor: masaüstü uygulamasının
zamanlanmış görevi olarak, uygulamanın kendi oturumuyla.

    ~/.claude/scheduled-tasks/minihub-gece-ajani/
    Salı ve Cuma 02:00

Jeton, GitHub uygulaması ve gizli anahtar — üçü de gereksiz.

Yerelin iki üstünlüğü var: Bekçi'nin **gözü** (`goz.py`, yalnızca
Apple Silicon) çalışabiliyor ve gerçek tarayıcı var. Bedeli:
uygulama kapalıyken görev bir sonraki açılışa kalıyor.

## Ne zaman geri konur

İki engel de kalkarsa:

1. `claude setup-token` ile jeton üretilip depoya
   `CLAUDE_CODE_OAUTH_TOKEN` adıyla gizli anahtar olarak eklenirse
2. Push jetonuna `workflow` yetkisi verilirse

O zaman iki dosya `.github/workflows/` altına taşınır ve
`gece-ajani.yml` içindeki `schedule` satırlarının başındaki `#`
kaldırılır. Dosyaların içeriği hazır, değiştirmek gerekmiyor.

**Bulutun tek üstünlüğü:** Mac kapalıyken de çalışır.
