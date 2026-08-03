/* Telegram Mini App baglantisi.
   Telegram icinde acildiginda: tema renkleri, kullanici bilgisi, titresim.
   Normal tarayicida acildiginda: her sey yine calisir (test edebilmen icin). */

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
}

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

/* Giris yapan Telegram kullanicisi (yoksa misafir) */
export function getUser() {
  const u = tg?.initDataUnsafe?.user;
  if (!u) return { id: 'guest', name: 'Misafir', photo: null };
  return {
    id: String(u.id),
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Oyuncu',
    photo: u.photo_url || null,
  };
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
