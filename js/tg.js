
import { t } from './i18n.js?v85';

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

applyTheme();
   tg.onEvent('themeChanged', applyTheme);
   tg.onEvent('viewportChanged', syncViewport);
}

function syncViewport() {
   const height = tg?.viewportStableHeight || window.innerHeight;
   if (height) document.documentElement.style.setProperty('--app-h', `${height}px`);
}

syncViewport();
window.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', syncViewport);

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
