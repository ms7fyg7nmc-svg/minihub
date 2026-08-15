/* Hub (ana menu) ekraninin mantigi.
Yeni oyun eklemek istedigimizde sadece asagidaki gameList() fonksiyonuna satir ekliyoruz. */

import { initTelegram, getUser, haptic, hideBackButton, isTelegramUser } from './tg.js?v42';
import {
   getPoints, getBest, sunucuDurumu,
   getEnergy, getStreak, claimStreak, getSpin, spinWheel, odulDurumu, liderTablosu,
} from './store.js?v42';
import { initLang, t, locale, applyTranslations, renderLangSwitcher } from './i18n.js?v42';

/* Botun Telegram adresi. Kendi botunun adini yazarsan tarayicida acan
   kullanicilar uyariya dokununca dogrudan bota gider. Bos birakilirsa
   uyari yine gorunur, sadece tiklanabilir olmaz.
   Ornek: 'https://t.me/oyunhub_bot' */
const BOT_LINK = '';

/* Kart ikonlari.

   Emoji yerine kendi cizdigimiz SVG'ler kullaniyoruz: emoji her telefonda
   farkli gorunuyor (Apple, Android ve masaustu ayni sekli bambaska ciziyor)
   ve renk paletimizle uyusmuyordu. Bu ikonlar oyunun mekanigini gosteriyor -
   2048'de tas izgarasi, Blok Bulmaca'da bir parca, Su Siralama'da tupler.

   Hepsi ayni dilde: 24x24 kutu, beyaz sekiller, arkadaki renk gecisi
   uzerinde farkli saydamliklarla derinlik. */
const ICONS = {
   /* Tas izgarasi; bir tas parlak, otekiler soluk (birlesme hissi) */
   '2048': `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".5"/>
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".32"/>
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".32"/>
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff"/>
   </svg>`,

   /* L seklinde bir blok parcasi */
   blockblast: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.4" fill="#fff" opacity=".92"/>
   </svg>`,

   /* Iki tup, farkli seviyelerde sivi. Tup govdesi biraz belirgin tutuldu,
      yoksa kucukken sadece iki beyaz leke gibi duruyor. */
   watersort: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="2.5" width="7" height="19" rx="3.5" fill="#fff" opacity=".38"/>
      <rect x="3.5" y="9.5" width="7" height="12" rx="3.5" fill="#fff"/>
      <rect x="13.5" y="2.5" width="7" height="19" rx="3.5" fill="#fff" opacity=".38"/>
      <rect x="13.5" y="15" width="7" height="6.5" rx="3.25" fill="#fff"/>
   </svg>`,

   /* Yan yana eslesmis uc seker. Once ustte/altta soluk komsular da vardi
      ama 30 pikselde hepsi birbirine girip dagilmis bir nokta obegi gibi
      goruyordu - sadece siranin kendisi kaldi. */
   match3: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="4.6" cy="12" r="3.5" fill="#fff"/>
      <circle cx="12" cy="12" r="3.5" fill="#fff"/>
      <circle cx="19.4" cy="12" r="3.5" fill="#fff"/>
   </svg>`,

   /* Ust uste binmis uc tas (capraz basamak). Kutunun tam ortasinda
      dursun diye 3..21 / 4..19 araligina yerlestirildi. */
   tripletile: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="10" width="9" height="9" rx="2.5" fill="#fff" opacity=".45"/>
      <rect x="7.5" y="7" width="9" height="9" rx="2.5" fill="#fff" opacity=".7"/>
      <rect x="12" y="4" width="9" height="9" rx="2.5" fill="#fff"/>
   </svg>`,

   /* Iki nokta ve aralarindaki yol */
   flow: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6.5v5a3.5 3.5 0 0 0 3.5 3.5H18" fill="none" stroke="#fff"
            stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
      <circle cx="6" cy="6.5" r="3.2" fill="#fff"/>
      <circle cx="18" cy="15" r="3.2" fill="#fff"/>
   </svg>`,

   /* Ejderha: acik kanatlar, kose hatli bas ve geriye supurulmus boynuzlar.
      Oyundaki cizimin kucuk hali - kartla oyun ekrani birbirini tutsun. */
   pet: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 10 1.2 4.4Q-0.6 10 2 14.6L4 12.2 5.4 14.8 7.2 12.2 8.6 14.6z"
            fill="#fff" opacity=".6"/>
      <path d="M15 10 22.8 4.4Q24.6 10 22 14.6L20 12.2 18.6 14.8 16.8 12.2 15.4 14.6z"
            fill="#fff" opacity=".6"/>
      <path d="M12 13.4q4.6 0 5.6 3.4Q18 21 12 21T6.4 16.8Q7.4 13.4 12 13.4z"
            fill="#fff" opacity=".92"/>
      <path d="M8.2 8.4 7.6 3.6 9.8 6.4z" fill="#fff" opacity=".72"/>
      <path d="M15.8 8.4 16.4 3.6 14.2 6.4z" fill="#fff" opacity=".72"/>
      <path d="M8 9.2 8.6 5.2 12 3.6l3.4 1.6.6 4Q14.6 13 12 13T8 9.2z" fill="#fff"/>
      <path d="M9.6 8.2 11 8.8 9.6 9.4z" fill="#3a2a4d"/>
      <path d="M14.4 8.2 13 8.8l1.4.6z" fill="#3a2a4d"/>
   </svg>`,

   /* Dragon Island: yuzen ada ve uzerinde ejderha.
      40 pikselde okunmasi gerektigi icin az sayida buyuk parcadan olusuyor -
      once daha detayli bir surum vardi ama kucukken lekeye donusuyordu. */
   dragon: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 14 2.6 9.6 12 5.2l9.4 4.4z" fill="#fff" opacity=".45"/>
      <path d="M2.6 9.6 12 14v2.4L2.6 12z" fill="#fff" opacity=".25"/>
      <path d="M21.4 9.6 12 14v2.4L21.4 12z" fill="#fff" opacity=".18"/>
      <path d="M7.6 15.4 12 17.4l4.4-2-2 4.2L12 22l-2.4-2.4z" fill="#fff" opacity=".3"/>
      <path d="M9 8.4 4.4 4.6q-1.2 3 .6 5.4l1.4-1.6 1 1.8 1.4-1.8z" fill="#fff"/>
      <path d="M15 8.4 19.6 4.6q1.2 3-.6 5.4l-1.4-1.6-1 1.8-1.4-1.8z" fill="#fff"/>
      <path d="M12 6.6q2.8 0 3.4 2.2Q16 11.6 12 11.6T8.6 8.8Q9.2 6.6 12 6.6z" fill="#fff"/>
      <path d="M9.6 5.4 9.2 2.2l2 2.4z" fill="#fff"/>
      <path d="M14.4 5.4 14.8 2.2l-2 2.4z" fill="#fff"/>
   </svg>`,

   /* Kivrilan bir yilan govdesi ve onundeki yem */
   snake: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17h6a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h5" fill="none" stroke="#fff"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="19" cy="3.5" r="2.6" fill="#fff" opacity=".55"/>
   </svg>`,

   /* Izgaranin ortasinda bir mayin */
   minesweeper: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="#fff"
            stroke-width="1.5" opacity=".4"/>
      <path d="M9 2.5v19M15 2.5v19M2.5 9h19M2.5 15h19" stroke="#fff"
            stroke-width="1.1" opacity=".26"/>
      <circle cx="12" cy="12" r="3.1" fill="#fff"/>
      <path d="M12 6.2V4.4M12 17.8v1.8M6.2 12H4.4M17.8 12h1.8" stroke="#fff"
            stroke-width="1.7" stroke-linecap="round"/>
   </svg>`,
};

function gameList() {
   return [
      {
         id: 'dragon',
         title: t('game.dragon.title'),
         desc: t('game.dragon.desc'),
         icon: ICONS.dragon,
         url: 'games/dragon/index.html',
         gradient: 'linear-gradient(140deg, #b083ec, #7b4fd0)',
         accent: '#a978e8',
         /* Rekor yok: bu oyun skor tutmuyor, kazanilan jetonu harciyor */
         noBest: true,
         ready: true,
      },
      /* Ejderham (games/pet/) Dragon Island ile ayni isi yapiyordu, ikisi ayni
         jetonu harcadigi icin menude birlikte durmalari anlamsizdi. Dosyalar
         diskte duruyor; seviye ve satin alinanlar Dragon Island'a otomatik
         tasiniyor (model.js icindeki goc). Geri istenirse asagidaki kaydi
         yorumdan cikarmak yeterli:

      {
         id: 'pet',
         title: t('game.pet.title'),
         desc: t('game.pet.desc'),
         icon: ICONS.pet,
         url: 'games/pet/index.html',
         gradient: 'linear-gradient(140deg, #b083ec, #7b4fd0)',
         accent: '#a978e8',
         noBest: true,
         ready: true,
      },
      */
      {
         id: '2048',
         title: t('game.2048.title'),
         desc: t('game.2048.desc'),
         icon: ICONS['2048'],
         gradient: 'linear-gradient(140deg, #f2b179, #ed6b4a)',
         accent: '#f2884b',
         url: 'games/2048/index.html',
         ready: true,
      },
      {
         id: 'blockblast',
         title: t('game.blockblast.title'),
         desc: t('game.blockblast.desc'),
         icon: ICONS.blockblast,
         url: 'games/blockblast/index.html',
         gradient: 'linear-gradient(140deg, #7f9bff, #5b6bff)',
         accent: '#5b8cff',
         ready: true,
      },
      {
         id: 'watersort',
         title: t('game.watersort.title'),
         desc: t('game.watersort.desc'),
         icon: ICONS.watersort,
         url: 'games/watersort/index.html',
         gradient: 'linear-gradient(140deg, #4ecb8b, #2fa9a0)',
         accent: '#4ecb8b',
         /* Burada rekor bir skor degil, ulasilan bolum numarasi */
         bestKey: 'hub.level',
         ready: true,
      },
      {
         id: 'match3',
         title: t('game.match3.title'),
         desc: t('game.match3.desc'),
         icon: ICONS.match3,
         url: 'games/match3/index.html',
         gradient: 'linear-gradient(140deg, #e2679c, #c0507f)',
         accent: '#e2679c',
         ready: true,
      },
      {
         id: 'tripletile',
         title: t('game.tripletile.title'),
         desc: t('game.tripletile.desc'),
         icon: ICONS.tripletile,
         url: 'games/tripletile/index.html',
         gradient: 'linear-gradient(140deg, #f5b942, #f2884b)',
         accent: '#f5b942',
         ready: true,
      },
      {
         id: 'flow',
         title: t('game.flow.title'),
         desc: t('game.flow.desc'),
         icon: ICONS.flow,
         url: 'games/flow/index.html',
         gradient: 'linear-gradient(140deg, #3fc7d4, #2f8fa8)',
         accent: '#3fc7d4',
         /* Burada rekor bir skor degil, ulasilan bolum numarasi */
         bestKey: 'hub.level',
         ready: true,
      },
      {
         id: 'snake',
         title: t('game.snake.title'),
         desc: t('game.snake.desc'),
         icon: ICONS.snake,
         url: 'games/snake/index.html',
         gradient: 'linear-gradient(140deg, #6ee7a8, #2fa06a)',
         accent: '#4ecb8b',
         ready: true,
      },
      /* Mayin Tarlasi menuden cikarildi.

         Sebep oyunun bozuk olmasi degil - calisiyor ve tahtalari tahmin
         gerektirmiyor. Sorun hub'a uymamasi: kurallarini onceden bilmeyi
         gerektiriyor, oysa buradaki oyunlar "ac ve oyna" olmali. Sadelestirip
         anlatim da ekledik ama sahibi de test eden arkadaslari da anlamadi;
         bu noktada sorun anlatim degil, oyunun kendisi.

         Dosyalar duruyor (games/minesweeper/). Geri istenirse asagidaki
         kaydi yorumdan cikarmak yeterli:

         {
            id: 'minesweeper',
            title: t('game.minesweeper.title'),
            desc: t('game.minesweeper.desc'),
            icon: ICONS.minesweeper,
            url: 'games/minesweeper/index.html',
            gradient: 'linear-gradient(140deg, #e2685e, #a83a33)',
            accent: '#e2685e',
            bestKey: 'hub.level',
            ready: true,
         },
      */
   ];
}

initTelegram();
hideBackButton();

await initLang();
applyTranslations();
renderLangSwitcher(document.getElementById('lang-switcher'));

renderProfile();
renderGames();
renderTelegramNotice();
renderSyncBadge();
renderDailyCard();
wireDailyPanel();
renderLiderCard();
wireLiderPanel();

document.addEventListener('langchange', () => {
   applyTranslations();
   renderProfile();
   renderGames();
   renderSyncBadge();
   renderDailyCard();
   renderLiderCard();
});

/* Sayfa Telegram disinda acildiysa puanlarin kaybolabilecegini hatirlatir */
function renderTelegramNotice() {
   const notice = document.getElementById('tg-notice');
   if (!notice || isTelegramUser()) return;

   notice.hidden = false;
   if (BOT_LINK) {
      notice.href = BOT_LINK;
      notice.target = '_blank';
      notice.rel = 'noopener';
   } else {
      notice.classList.add('is-static'); /* gidilecek adres yok, ok isareti gizlensin */
   }
}

/* "Kurulumu bitirdim ama degisiklik gormuyorum" sorusunun cevabi: Telegram
   icindeyken jeton/ilerlemenin sunucuya mi baglandigini yoksa (D1/Worker/
   API_BASE eksik oldugu icin) hala cihazda mi kaldigini gosterir. Misafir
   modunda hicbir sey gostermez - o zaten buyuk uyariyla anlatiliyor. */
async function renderSyncBadge() {
   const badge = document.getElementById('sync-badge');
   if (!badge) return;

   const durum = await sunucuDurumu();
   if (durum === 'misafir') return; /* hidden kalir */

   badge.hidden = false;
   badge.classList.toggle('is-sunucu', durum === 'sunucu');
   badge.classList.toggle('is-yerel', durum === 'yerel');
   document.getElementById('sync-text').textContent =
      durum === 'sunucu' ? t('hub.sync.server') : t('hub.sync.local');
}

function refreshPointsChip() {
   getPoints().then((points) => {
      document.getElementById('points').textContent = points.toLocaleString(locale());
   });
}

function renderProfile() {
   const user = getUser();
   document.getElementById('username').textContent = user.name;

const avatar = document.getElementById('avatar');
   if (user.photo) {
      avatar.style.backgroundImage = `url("${user.photo}")`;
   } else {
      avatar.textContent = user.name.charAt(0).toUpperCase();
   }

refreshPointsChip();
}

function renderGames() {
   const container = document.getElementById('games');
   container.textContent = '';

gameList().forEach((game, index) => {
   const card = document.createElement('button');
   card.className = 'game-card';
   card.disabled = !game.ready;
   card.style.setProperty('--i', index); /* kartlar sirayla belirsin */

   card.innerHTML = `
   <div class="game-icon${game.ready ? '' : ' soon'}">${game.icon}</div>
   <div class="game-info">
   <h3></h3>
   <p></p>
   </div>
   <div class="badge"></div>
   `;
   card.querySelector('h3').textContent = game.title;
   card.querySelector('p').textContent = game.desc;

   /* Yeni oyunlarin kart ikonuna renk gecisi ver */
   if (game.gradient) {
      card.querySelector('.game-icon').style.background = game.gradient;
   }

   /* Kartin sol kenarindaki ince renk seridi */
   if (game.accent) card.style.setProperty('--card-accent', game.accent);

   const badge = card.querySelector('.badge');
   if (game.ready) {
      badge.textContent = t('hub.play');
      /* noBest: skor tutmayan oyunlar (ornek: Ordegim) rozette rekor gostermez */
      if (!game.noBest) {
         getBest(game.id).then((best) => {
            if (best > 0) {
               badge.textContent = t(game.bestKey ?? 'hub.record', { best: best.toLocaleString(locale()) });
               badge.classList.add('record');
            }
         });
      }
      card.addEventListener('click', () => {
         haptic.tap();
         window.location.href = game.url;
      });
   } else {
      badge.textContent = t('hub.soon');
   }

   container.appendChild(card);
});
}

/* --- Gunluk Oduller: enerji + gunluk seri + gunluk cark ---

   Ucu de sadece Telegram/sunucu modunda anlamli (bkz. store.js) - hepsi
   sunucu tarafinda dogrulaniyor, misafirde null doner ve kart hic
   gosterilmez. Cark dilimlerinin renkleri worker.js'teki SPIN_PRIZES
   dizisiyle AYNI SIRADA olmali (10, 20, 30, 50, 75, 100, enerji, 150). */
const WHEEL_COLORS = ['#5b8cff', '#4ecb8b', '#f2884b', '#c079f2', '#e2679c', '#3fc7d4', '#8be9ff', '#ffd166'];

let dailyPrizes = null;   /* /api/sync'ten gelen cark dilim listesi, bir kez cekilir */
let wheelRotation = 0;    /* birikimli aci - cark her zaman ileri doner, geriye siçramaz */
let panelOpen = false;

function polar(cx, cy, r, angleDeg) {
   const a = (angleDeg * Math.PI) / 180;
   return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

function buildWheel(prizes) {
   const svg = document.getElementById('wheel');
   if (!svg || !prizes?.length) return;
   const n = prizes.length;
   const segAngle = 360 / n;
   const cx = 100, cy = 100, r = 94, labelR = r * 0.62;

   let html = '';
   prizes.forEach((prize, i) => {
      const start = polar(cx, cy, r, i * segAngle);
      const end = polar(cx, cy, r, (i + 1) * segAngle);
      const mid = i * segAngle + segAngle / 2;
      const label = polar(cx, cy, labelR, mid);
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
      const isEnergy = prize.tur === 'enerji';
      const text = isEnergy ? t('hub.daily.energy').toUpperCase() : prize.miktar;

      /* Sayilar dilimin DIS YAYINA PARALEL duruyor (teget yonu).
         polar()'da aci tepeden saat yonunde olctugu icin teget yonu tam
         olarak rotate(mid); alt yaridaki dilimlerde yazi bas asagi
         dusecegi icin onlar 180 derece daha ceviriliyor. */
      const yazAci = (mid > 90 && mid < 270) ? mid + 180 : mid;
      html += `
      <path d="M${cx},${cy} L${start.x.toFixed(2)},${start.y.toFixed(2)}
               A${r},${r} 0 0,1 ${end.x.toFixed(2)},${end.y.toFixed(2)} Z"
            fill="${color}" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/>
      <g transform="translate(${label.x.toFixed(2)} ${label.y.toFixed(2)}) rotate(${yazAci.toFixed(1)})">
        <text text-anchor="middle" dominant-baseline="middle" fill="#fff" font-weight="800"
              font-size="${isEnergy ? 10 : 14}"
              style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))">${text}</text>
      </g>`;
   });
   svg.innerHTML = html;
}

/* Carkin index'i pointer'in (ustte, 0 derece) tam altina getirecek sekilde
   dondurulmesi. Segment ortasina degil, icinde kucuk rastgele bir kaymayla
   duruyor - hep tam ortada durmasi robotik gorunuyordu. Aci her cagrida
   sadece ARTIYOR (asla geriye siçramiyor), yoksa cark bir onceki sonuctan
   bu sonuca "geri sarma" gibi goruyor. */
function spinToIndex(index, segmentCount) {
   const svg = document.getElementById('wheel');
   if (!svg) return;
   const segAngle = 360 / segmentCount;
   const mid = index * segAngle + segAngle / 2;
   /* Rastgele kayma YOK: dilim tam ibrenin altinda duruyor, boylece
      etiketin kendi donusu yaziyi tam yatay birakiyor. */
   const targetMod = (((360 - mid) % 360) + 360) % 360;
   const current = ((wheelRotation % 360) + 360) % 360;
   let delta = targetMod - current;
   if (delta <= 0) delta += 360;
   wheelRotation += delta + 5 * 360; /* +5 tam tur, gorsel etki icin */
   svg.style.transform = `rotate(${wheelRotation}deg)`;
}

/* "5h 42m" gibi kisa geri sayim metni.
   Kisaltmalar SABIT DEGIL, secili dilden geliyor - onceden Turkce 's/d/sn'
   sabit yazilmisti ve oyunu Ingilizce oynayan da saat/dakika kisaltmasini
   Turkce goruyordu. */
function kalanMetin(ms) {
   const sn = Math.max(0, Math.ceil(ms / 1000));
   const saat = Math.floor(sn / 3600), dk = Math.floor((sn % 3600) / 60);
   if (saat > 0) return `${saat}${t('hub.time.h')} ${dk}${t('hub.time.m')}`;
   if (dk > 0) return `${dk}${t('hub.time.m')}`;
   return `${sn % 60}${t('hub.time.s')}`;
}

/* Panel acikken saniyede bir geri sayimlari tazeler. Tek zamanlayici
   kullaniliyor; panel kapaninca durduruluyor ki arka planda calismasin. */
let sayacTimer = null;
function sayaclariBaslat() {
   clearInterval(sayacTimer);
   sayacTimer = setInterval(() => {
      /* Panel kapaliyken de calisiyor: ana sayfadaki kartin geri sayimi
         da ayni mekanizmayi kullaniyor. Geri sayilacak bir sey kalmazsa
         zamanlayici kendini durduruyor. */
      const hedefler = document.querySelectorAll('[data-bitis]');
      if (!hedefler.length) { clearInterval(sayacTimer); sayacTimer = null; return; }
      hedefler.forEach((el) => {
         const kalan = Number(el.dataset.bitis) - Date.now();
         el.textContent = kalan > 0 ? kalanMetin(kalan) : '';
         if (kalan <= 0) { delete el.dataset.bitis; renderStreakSection(); renderSpinSection(); }
      });
   }, 1000);
}

function pipsHtml(energy, max, small) {
   let html = '';
   for (let i = 0; i < max; i++) html += `<span class="energy-pip${i < energy ? ' is-full' : ''}"></span>`;
   return html;
}

async function renderDailyCard() {
   const card = document.getElementById('daily-card');
   if (!card) return;

   const [energy, streak, spin] = await Promise.all([getEnergy(), getStreak(), getSpin()]);
   /* misafirde energy null donuyor; sunucu GUNCELLENMEDEN once (eski
      worker.js hala calisiyorsa) energy/maxEnergy alanlari yanitta hic
      olmayabilir - o zaman ikisi de 0 gelir, "0/0 enerji" gibi bozuk
      gorunmesin diye kart hic gosterilmiyor. Worker guncellenince
      maxEnergy>0 gelmeye baslar, kart otomatik gorunur olur. */
   if (!energy || !energy.max) { card.hidden = true; return; }

   const durum = await odulDurumu();
   /* Telegram icinde olup sunucuya ulasamiyorsak oyuncunun gercek seri ve
      cark durumunu bilmiyoruz - "HAZIR!" demek yaniltici olur. */
   if (durum === 'yerel') { card.hidden = true; return; }
   const kilitli = durum === 'misafir';

   card.hidden = false;
   document.getElementById('daily-card-energy').textContent = `${energy.energy}/${energy.max}`;

   /* Misafirde de "HAZIR!" gosteriliyor - amac odulu gosterip Telegram'dan
      girmeye tesvik etmek. */
   const hazir = kilitli || streak?.canClaim || spin?.canSpin;
   const ipucu = document.getElementById('daily-card-hint');
   document.getElementById('daily-card-dot').hidden = !hazir;

   /* Hazirsa oyunlarin USTUNDE, beklemedeyse ALTINDA duruyor: alinacak
      bir sey yokken ekranin tepesini isgal etmesi rahatsiz ediyordu. */
   const oyunlar = document.getElementById('games');
   const basliklar = document.querySelectorAll('.section-title');

   if (hazir) {
      if (basliklar[0]) basliklar[0].before(card);
      ipucu.textContent = t('hub.daily.ready');
      ipucu.className = 'daily-card-hint is-ready';
      delete ipucu.dataset.bitis;
   } else {
      if (oyunlar) oyunlar.after(card);
      /* Ikisi de beklemedeyse EN ERKEN bitecek olanin geri sayimi */
      const kalanlar = [];
      if (streak && !streak.canClaim) kalanlar.push(streak.nextInMs || 0);
      if (spin && !spin.canSpin) kalanlar.push(spin.nextInMs || 0);
      const enYakin = kalanlar.length ? Math.min(...kalanlar) : 0;
      /* Ciplak bir sayi yerine ne oldugunu soyleyen bir satir */
      ipucu.className = 'daily-card-hint';
      ipucu.innerHTML = `<span class="etiket">${t('hub.daily.nextIn')}</span>` +
                        `<span class="sure geri-sayim" data-bitis="${Date.now() + enYakin}">${kalanMetin(enYakin)}</span>`;
   }
   sayaclariBaslat();
}

function wireDailyPanel() {
   const card = document.getElementById('daily-card');
   const overlay = document.getElementById('daily-overlay');
   const closeBtn = document.getElementById('daily-close');
   const streakBtn = document.getElementById('streak-claim-btn');
   const spinBtn = document.getElementById('spin-btn');
   if (!card || !overlay) return;

   card?.addEventListener('click', openDailyModal);
   closeBtn?.addEventListener('click', closeDailyModal);
   overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDailyModal(); });


   streakBtn?.addEventListener('click', async () => {
      streakBtn.disabled = true;
      const sonuc = await claimStreak();
      if (sonuc?.ok) {
         haptic.success();
         showDailyToast(t('hub.daily.won', { amount: sonuc.reward }));
         refreshPointsChip();
      }
      await renderStreakSection();
      await renderDailyCard();
      streakBtn.disabled = false;
   });

   spinBtn?.addEventListener('click', async () => {
      spinBtn.disabled = true;
      spinBtn.classList.add('is-spinning');
      const sonuc = await spinWheel();
      if (sonuc?.ok && dailyPrizes) {
         spinToIndex(sonuc.index, dailyPrizes.length);
         const onWheel = () => {
            document.getElementById('wheel').removeEventListener('transitionend', onWheel);
            spinBtn.classList.remove('is-spinning');
            haptic.success();
            const kazanilan = sonuc.prize.tur === 'enerji' ? t('hub.daily.wonEnergy') : t('hub.daily.won', { amount: sonuc.prize.miktar });
            showDailyToast(kazanilan);
            refreshPointsChip();
            renderEnergySection();
            renderSpinSection();
            renderDailyCard();
         };
         document.getElementById('wheel').addEventListener('transitionend', onWheel);
      } else {
         spinBtn.classList.remove('is-spinning');
         spinBtn.disabled = false;
      }
   });
}

async function openDailyModal() {
   const overlay = document.getElementById('daily-overlay');
   if (!overlay) return;
   overlay.hidden = false;
   panelOpen = true;
   haptic.tap();
   await Promise.all([renderEnergySection(), renderStreakSection(), renderSpinSection()]);
   sayaclariBaslat();
}

function closeDailyModal() {
   const overlay = document.getElementById('daily-overlay');
   if (overlay) overlay.hidden = true;
   panelOpen = false;
}

async function renderEnergySection() {
   const energy = await getEnergy();
   if (!energy) return;
   document.getElementById('energy-pips-modal').innerHTML = pipsHtml(energy.energy, energy.max);
   const etiket = document.getElementById('energy-label');
   if (energy.energy >= energy.max) {
      etiket.textContent = t('hub.daily.energyFull');
      delete etiket.dataset.bitis;
   } else {
      /* Bir sonraki enerjiye kalan sure - enerji artik zamanla doluyor */
      etiket.textContent = `${energy.energy}/${energy.max}`;
      const ipucu = document.getElementById('energy-next');
      if (ipucu && energy.nextMs > 0) ipucu.dataset.bitis = String(Date.now() + energy.nextMs);
   }
}

async function renderStreakSection() {
   const streak = await getStreak();
   const row = document.getElementById('streak-row');
   const btn = document.getElementById('streak-claim-btn');
   if (!streak || !row || !btn) return;

   /* Merdiven SUNUCUDAN geliyor. Onceden burada sabit yaziliydi ve
      sunucudaki odul 5 katina cikinca ekranda hala eski sayilar
      goruyordu - tam olarak bu hata yasandi. */
   const rewards = streak.rewards || [100, 150, 200, 300, 400, 500, 1000];
   const kilitli = (await odulDurumu()) === 'misafir';
   /* streak.nextDay ve streak.broken sunucudan (streakDurumu) geliyor -
      burada tekrar hesaplamiyoruz. Seri kirildiyse (broken) 1..count
      gunleri "alindi" gostermek yanlis olur, yeni dongu 1'den basliyor. */
   const gecerliSayim = streak.broken ? 0 : streak.count;

   row.innerHTML = rewards.map((odul, i) => {
      const gun = i + 1;
      let durum = 'is-future';
      if (gun <= gecerliSayim) durum = 'is-done';
      else if (gun === streak.nextDay) durum = streak.canClaim ? 'is-current' : 'is-future';
      const jackpot = gun === 7 ? ' is-jackpot' : '';
      return `
      <div class="streak-pill ${durum}${jackpot}">
        <span class="day">${gun}</span>
        <span class="amt">${odul}</span>
      </div>`;
   }).join('');

   if (kilitli) {
      btn.textContent = t('hub.daily.loginToClaim');
      btn.disabled = true;
      btn.classList.add('is-locked');
   } else if (streak.canClaim) {
      btn.innerHTML = `${t('hub.daily.claim')} · +${streak.nextReward}`;
      btn.disabled = false;
      btn.classList.remove('is-locked');
   } else {
      /* Ilk metin hemen yaziliyor. Bos birakilip saniyelik tikleyiciye
         birakildiginda, sure sifirsa (ya da tikleyici o an calismiyorsa)
         "Yarin tekrar gel" yaninda hic bir sey gorunmuyordu. */
      const kalan = streak.nextInMs || 0;
      btn.innerHTML = `${t('hub.daily.comeTomorrow')} <span class="geri-sayim" data-bitis="${Date.now() + kalan}">${kalanMetin(kalan)}</span>`;
      btn.disabled = true;
      btn.classList.remove('is-locked');
   }
}

async function renderSpinSection() {
   const spin = await getSpin();
   const btn = document.getElementById('spin-btn');
   const btnText = document.getElementById('spin-btn-text');
   if (!spin || !btn) return;

   if (!dailyPrizes) {
      dailyPrizes = spin.prizes;
      buildWheel(dailyPrizes);
   }

   const kilitli = (await odulDurumu()) === 'misafir';
   btn.disabled = kilitli || !spin.canSpin;
   btn.classList.toggle('is-locked', kilitli);
   /* Geri sayim carkin TAM ORTASINDA (dugmenin icinde) - altta ayri bir
      satirda dururken bosta kaliyor ve kotu duruyordu. */
   if (kilitli) {
      btnText.textContent = '—';
      delete btnText.dataset.bitis;
      btn.classList.remove('is-bekliyor');
   } else if (spin.canSpin) {
      btnText.textContent = t('hub.daily.spinBtn');
      delete btnText.dataset.bitis;
      btn.classList.remove('is-bekliyor');
   } else {
      btnText.textContent = kalanMetin(spin.nextInMs || 0);
      btnText.dataset.bitis = String(Date.now() + (spin.nextInMs || 0));
      btn.classList.add('is-bekliyor');
   }
}

function showDailyToast(text) {
   const toast = document.getElementById('daily-toast');
   if (!toast) return;
   toast.textContent = text;
   toast.hidden = false;
   /* animasyonu her seferinde bastan oynatmak icin klonla-degistir hilesi */
   const yeni = toast.cloneNode(true);
   toast.parentNode.replaceChild(yeni, toast);
   setTimeout(() => { yeni.hidden = true; }, 2600);
}

/* ==========================================================================
   LIDERLIK TABLOSU

   Siralama toplam KAZANCA gore (bkz. worker.js handleLeaderboard) - mevcut
   bakiyeye gore olsaydi ejderhasina harcayan oyuncu listede geriye duserdi.

   Isimler Telegram'dan dogrulanmis olarak geliyor ama yine de textContent
   ile basiliyor: baskasinin adinda HTML olsa bile calismasin. */

async function renderLiderCard() {
   const card = document.getElementById('lider-card');
   if (!card) return;

   /* Sadece sunucuya bagliyken anlamli - misafirde siralama yok */
   if ((await odulDurumu()) !== 'sunucu') { card.hidden = true; return; }

   const veri = await liderTablosu();
   if (!veri) { card.hidden = true; return; }

   card.hidden = false;
   /* Siralama disi hesap (bkz. worker.js LIDER_HARIC) listeyi goruyor ama
      kendi sirasi yok - rozette tire duruyor. */
   document.getElementById('lider-sira').textContent =
      veri.kendi ? `#${veri.kendi.sira}` : '—';
   document.getElementById('lider-hint').textContent =
      t('hub.rank.of', { n: veri.toplam });
}

function wireLiderPanel() {
   const card = document.getElementById('lider-card');
   const overlay = document.getElementById('lider-overlay');
   if (!card || !overlay) return;
   card.addEventListener('click', acLiderPanel);
   document.getElementById('lider-close')?.addEventListener('click', () => { overlay.hidden = true; });
   overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.hidden = true; });
}

async function acLiderPanel() {
   const overlay = document.getElementById('lider-overlay');
   overlay.hidden = false;
   haptic.tap();

   const veri = await liderTablosu();
   const liste = document.getElementById('lider-liste');
   liste.textContent = '';
   if (!veri) return;

   for (const s of veri.liste) {
      const satir = document.createElement('div');
      satir.className = 'lider-satir' + (s.ben ? ' benim' : '') +
         (s.sira <= 3 ? ` tepe tepe-${s.sira}` : '');

      const sira = document.createElement('span');
      sira.className = 'lider-no';
      sira.textContent = s.sira;

      const ad = document.createElement('span');
      ad.className = 'lider-ad';
      ad.textContent = s.ad || t('hub.player');

      const puan = document.createElement('span');
      puan.className = 'lider-puan';
      puan.textContent = s.kazanilan.toLocaleString(locale());

      satir.append(sira, ad, puan);
      liste.appendChild(satir);
   }

   /* Ilk 50'de degilse kendi sirasi altta sabit gosterilir */
   const kendi = document.getElementById('lider-kendi');
   if (veri.kendi && !veri.liste.some((x) => x.ben)) {
      kendi.hidden = false;
      kendi.textContent = '';
      const satir = document.createElement('div');
      satir.className = 'lider-satir benim';
      const a = document.createElement('span'); a.className = 'lider-no'; a.textContent = veri.kendi.sira;
      const b = document.createElement('span'); b.className = 'lider-ad'; b.textContent = t('hub.rank.you');
      const c = document.createElement('span'); c.className = 'lider-puan';
      c.textContent = veri.kendi.kazanilan.toLocaleString(locale());
      satir.append(a, b, c);
      kendi.appendChild(satir);
   } else {
      kendi.hidden = true;
   }
}
