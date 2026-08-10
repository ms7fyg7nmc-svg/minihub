/* Telegram Mini App baglantisi.
Telegram icinde acildiginda: tema renkleri, kullanici bilgisi, titresim.
Normal tarayicida acildiginda: her sey yine calisir (test edebilmen icin). */

import { t } from './i18n.js?v21';

export const tg = window.Telegram?.WebApp ?? null;

/* Telegram surumu kontrolu: eski surumlerde olmayan ozellikleri cagirmayalim */
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

/* Kullanici yukari/asagi kaydirinca Mini App kapanmasin (oyun icin sart) */
if (supports('7.7') && tg.disableVerticalSwipes) tg.disableVerticalSwipes();
   if (supports('8.0') && tg.lockOrientation) tg.lockOrientation();

applyTheme();
   tg.onEvent('themeChanged', applyTheme);
   tg.onEvent('viewportChanged', syncViewport);
}

/* Ekranin gercek gorunur yuksekligini --app-h degiskenine yazar.
Mobilde 100vh, tarayici cubuklarinin kapladigi yeri de sayip birkac piksel
fazla cikiyor; sayfanin parmakla oynamasinin sebebi bu. Telegram bize tam
degeri veriyor, disarida ise pencerenin kendi yuksekligini kullaniyoruz. */
function syncViewport() {
   const height = tg?.viewportStableHeight || window.innerHeight;
   if (height) document.documentElement.style.setProperty('--app-h', `${height}px`);
}

syncViewport();
window.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', syncViewport);

/* Telegram'in tema renklerini CSS'e aktarir (acik/koyu tema uyumu) */
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

/* Sayfa gercekten Telegram icinde mi acilmis (yani kullanici tanimli mi).
Tarayicida acildiginda false doner; o zaman puanlar sadece o cihazda kalir. */
export function isTelegramUser() {
   return !!tg?.initDataUnsafe?.user;
}

/* Giris yapan Telegram kullanicisi (yoksa misafir) */
export function getUser() {
   const u = tg?.initDataUnsafe?.user;
   if (!u) return { id: 'guest', name: t('hub.guest'), photo: null };
   return {
      id: String(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || t('hub.player'),
      photo: u.photo_url || null,
   };
}

/* Ham, IMZALI initData metni - initDataUnsafe'in aksine bu sunucuda
   dogrulanabilir. Sunucuya giden her istekte bu gonderilir; sunucu Telegram'in
   verdigi HMAC imzasini kontrol edip kullanici kimligini BURADAN degil,
   kendi cozdugu imzali veriden cikarir - istemci kendi kimligini soyleyemez. */
export function getInitData() {
   return tg?.initData || '';
}

/* Titresim / dokunsal geri bildirim */
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

/* Telegram'in sol ustteki "Geri" tusu */
export function showBackButton(handler) {
   if (!supports('6.1') || !tg?.BackButton) return;
   tg.BackButton.show();
   tg.BackButton.onClick(handler);
}

export function hideBackButton() {
   if (supports('6.1')) tg?.BackButton?.hide();
}

/* Telegram, mini app'i kapattigimizda sayfayi bellekte tutabiliyor; bota
tekrar girildiginde ayni oyun ekranini geri gosteriyor. Oyuncu uygulamadan
uzun sure ayrilip dondugunde onu hub'a getiriyoruz. Oyun ilerlemesi zaten
her hamlede kaydedildigi icin hicbir sey kaybolmuyor. */
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
