
const MUTE_KEY = 'mh_sound_muted';

let ctx = null;
function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(v) {
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
  }
}

function tone(c, freq, dur, type, gain, delay = 0) {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function sweep(c, f0, f1, dur, type, gain, delay = 0) {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(c, dur, gain, filterFreq, delay = 0, filterEnd = null) {
  const t0 = c.currentTime + delay;
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  if (filterEnd !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(filterEnd, 40), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

function guard(fn) {
  return (...args) => {
    if (isMuted()) return;
    const c = getCtx();
    if (!c) return;
    try {
      fn(c, ...args);
    } catch {
    }
  };
}

export const SFX = {
  gameOver: guard((c) => {
    sweep(c, 420, 150, 0.28, 'triangle', 0.15);
    sweep(c, 300, 90, 0.30, 'triangle', 0.10, 0.05);
  }),

  pickup: guard((c) => {
    tone(c, 660, 0.07, 'square', 0.11);
    tone(c, 880, 0.07, 'square', 0.09, 0.045);
  }),

  goldenPickup: guard((c) => {
    tone(c, 660, 0.08, 'triangle', 0.13);
    tone(c, 880, 0.08, 'triangle', 0.13, 0.06);
    tone(c, 1180, 0.14, 'triangle', 0.12, 0.12);
  }),

  place: guard((c) => {
    tone(c, 210, 0.05, 'square', 0.09);
  }),

  pop: guard((c) => {
    noiseBurst(c, 0.11, 0.16, 2600);
    sweep(c, 260, 120, 0.14, 'sawtooth', 0.10, 0.015);
  }),

  pour: guard((c) => {
    noiseBurst(c, 0.22, 0.11, 2600, 0, 450);
    noiseBurst(c, 0.16, 0.07, 900, 0.035, 260);
    sweep(c, 360, 200, 0.18, 'sine', 0.045, 0.02);
  }),

  match: guard((c) => {
    tone(c, 760, 0.06, 'sine', 0.11);
    tone(c, 1020, 0.08, 'sine', 0.10, 0.05);
  }),

  merge: guard((c) => {
    tone(c, 500, 0.08, 'triangle', 0.12);
    tone(c, 700, 0.08, 'triangle', 0.10, 0.04);
  }),
};

export function soundToggleHtml() {
  return `
    <button class="sound-toggle" id="sound-toggle" type="button" aria-label="Sound" aria-pressed="false">
      <svg class="icon-on" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/>
        <path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>
      </svg>
      <svg class="icon-off" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/>
        <path d="M15.8 9.2 20.2 14.8M20.2 9.2 15.8 14.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>`;
}

export function mountSoundToggle(btn) {
  if (!btn) return;
  const sync = () => {
    const muted = isMuted();
    btn.classList.toggle('is-muted', muted);
    btn.setAttribute('aria-pressed', String(!muted));
  };
  sync();
  btn.addEventListener('click', () => {
    setMuted(!isMuted());
    sync();
  });
}
