
import { t } from './i18n.js?v238';

export const tg = window.Telegram?.WebApp ?? null;

function supports(version) {
   if (!tg?.version) return false;
   const [a, b = 0] = String(tg.version).split('.').map(Number);
   const [x, y = 0] = version.split('.').map(Number);
   return a > x || (a === x && b >= y);
}

export function initTelegram() {
   if (!tg) return;

tg.ready();
   tg.expand();

if (supports('7.7') && tg.disableVerticalSwipes) tg.disableVerticalSwipes();
   if (supports('8.0') && tg.lockOrientation) tg.lockOrientation();

   /* TAM EKRAN
      expand() sadece sayfayi azami yuksekliğe cikariyor; Telegram'in
      ust cubugu yerinde kaliyor. Gercek tam ekran Bot API 8.0'daki ayri
      bir cagri - DMD gibi oyunlarin kullandigi bu.

      Tam ekranda sayfa durum cubugunun ve Telegram'in kendi kapat/menu
      dugmelerinin ALTINA uzaniyor, o yuzden guvenli alan paylari CSS
      degiskeni olarak disari veriliyor. Istemeden cagirmak HUD'u
      centigin altinda birakirdi. */
   if (supports('8.0') && tg.requestFullscreen) {
      try { tg.requestFullscreen(); } catch { /* reddedilirse expand yeterli */ }
      tg.onEvent('fullscreenChanged', syncViewport);
      tg.onEvent('safeAreaChanged', syncViewport);
      tg.onEvent('contentSafeAreaChanged', syncViewport);
   }
   syncViewport();

applyTheme();
   tg.onEvent('themeChanged', applyTheme);
   tg.onEvent('viewportChanged', syncViewport);
}

/* GUVENLI ALAN - SADECE TAM EKRANDA

   Ilk surumde paylar kosulsuz uygulaniyordu ve yorumda "tam ekran
   degilken ikisi de sifir gelir" yaziyordu. O varsayim YANLISTI:
   iPhone'da safeAreaInset.top centik payini tam ekran olmasa da
   bildiriyor. Telegram kendi basligini zaten centigin altina ciziyor,
   yani pay bir kez daha eklenince icerik ~47 piksel asagi kayiyor ve
   `overflow: hidden` olan govde alt sekme barini kirpiyordu - oyuncu
   sekmelere ulasamaz hale geliyordu.

   Pay artik sadece gercekten tam ekrandayken uygulaniyor. */
function guvenliPaylar() {
   if (!tg?.isFullscreen) return { ust: 0, alt: 0 };
   const a = tg.safeAreaInset || {};
   const b = tg.contentSafeAreaInset || {};
   const say = (x) => Math.max(0, Number(x) || 0);
   return { ust: say(a.top) + say(b.top), alt: say(a.bottom) + say(b.bottom) };
}

/* --app-h ARTIK KULLANILABILIR yukseklik: paylar dusulmus hali.

   Once govdeye padding veriliyordu, ama kabuk `min-height: var(--app-h)`
   kullandigi icin kabuk govdeden tam pay kadar uzun kaliyor ve alti
   kirpiliyordu. Payi yukseklikten DUSUP kabugu asagi kaydirmak ayni
   gorunumu veriyor, hicbir seyi kirpmiyor. */
/* Gercek gorunur yukseklik. Oncelik sirasi:
     1. Telegram'in bildirdigi yukseklik - en dogrusu, orada varsa bu
     2. visualViewport - Android'de tarayici cubugu ve klavye hareket
        ettiginde innerHeight gec kaliyor, bu anlik dogru
     3. innerHeight - son care */
function gorunenYukseklik() {
   return tg?.viewportStableHeight
      || Math.round(window.visualViewport?.height || 0)
      || window.innerHeight;
}

function syncViewport() {
   const kok = document.documentElement;
   const tam = gorunenYukseklik();
   if (!tam) return;

   let { ust, alt } = guvenliPaylar();

   /* Guvenlik kelepcesi: paylar ekranin ucte birini gecerse bildirilen
      deger saglikli degil demektir - yok sayiliyor. Oyunun oynanamaz
      hale gelmesindense centigin altinda kalmasi yeglenir. */
   if (ust + alt > tam / 3) { ust = 0; alt = 0; }

   kok.style.setProperty('--app-h', `${tam - ust - alt}px`);
   kok.style.setProperty('--guvenli-ust', `${ust}px`);
   kok.style.setProperty('--guvenli-alt', `${alt}px`);
   kok.classList.toggle('tam-ekran', !!tg?.isFullscreen);
}

syncViewport();
window.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', syncViewport);

/* Android'de adres cubugu ve klavye resize olayi uretmeden yuksekligi
   degistirebiliyor; visualViewport bunlari bildiriyor. */
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);

/* Yon degisiminde olcum bazen eski degeri veriyor: bir kare sonra tekrar. */
window.addEventListener('orientationchange', () => setTimeout(syncViewport, 250));

function applyTheme() {
   if (!tg) return;
   const root = document.documentElement;
   root.dataset.tgTheme = tg.colorScheme || 'light';
   for (const [key, value] of Object.entries(tg.themeParams || {})) {
      root.style.setProperty(`--tg-${key.replace(/_/g, '-')}`, value);
   }
   if (supports('6.1')) {
      tg.setHeaderColor?.('bg_color');
      tg.setBackgroundColor?.(tg.themeParams?.bg_color || '#12131a');
   }
}

export function isTelegramUser() {
   return !!tg?.initDataUnsafe?.user;
}

export function getUser() {
   const u = tg?.initDataUnsafe?.user;
   if (!u) return { id: 'guest', name: t('hub.guest'), photo: null };
   return {
      id: String(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || t('hub.player'),
      photo: u.photo_url || null,
   };
}

export function getInitData() {
   return tg?.initData || '';
}

export function openShareLink(url) {
   if (tg?.openTelegramLink) tg.openTelegramLink(url);
   else window.open(url, '_blank', 'noopener');
}

// Telegram Stars odeme sayfasini acar. onStatus('paid'|'failed'|'cancelled'|'pending')
// ile sonucu bildirir. Telegram disinda (openInvoice yoksa) hicbir sey yapmaz.
export function openInvoice(link, onStatus) {
   if (tg?.openInvoice) tg.openInvoice(link, onStatus);
   else onStatus?.('failed');
}

export const haptic = {
   tap(style = 'light') {
      if (supports('6.1')) tg?.HapticFeedback?.impactOccurred(style);
   },
   success() {
      if (supports('6.1')) tg?.HapticFeedback?.notificationOccurred('success');
   },
   error() {
      if (supports('6.1')) tg?.HapticFeedback?.notificationOccurred('error');
   },
};

export function showBackButton(handler) {
   if (!supports('6.1') || !tg?.BackButton) return;
   tg.BackButton.show();
   tg.BackButton.onClick(handler);
}

export function hideBackButton() {
   if (supports('6.1')) tg?.BackButton?.hide();
}

const RESUME_LIMIT_MS = 60000;

export function backToHubOnResume(hubUrl = '../../index.html') {
   let hiddenAt = 0;

   document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
         hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > RESUME_LIMIT_MS) {
         window.location.replace(hubUrl);
      }
   });
}
