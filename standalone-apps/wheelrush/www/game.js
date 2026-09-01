/* Wheel Rush — self-contained 3-lane endless runner.
   No frameworks, no external assets: everything is canvas-drawn so the whole
   app is a handful of KB and works offline once installed. */

(() => {
  'use strict';

  const LW = 360;   // logical world width
  const LH = 640;   // logical world height
  const LANES = [LW * 0.22, LW * 0.5, LW * 0.78];
  const PLAYER_Y = LH * 0.8;
  const PLAYER_R = 20;
  const ITEM_R = 18;
  const COIN_R = 9;

  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const startOverlay = document.getElementById('start-overlay');
  const overOverlay = document.getElementById('over-overlay');
  const overScoreEl = document.getElementById('over-score');
  const overRecordEl = document.getElementById('over-record');
  const startBtn = document.getElementById('start-btn');
  const retryBtn = document.getElementById('retry-btn');

  let scale = 1;
  function resize() {
    const rect = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    scale = Math.min(rect.width / LW, rect.height / LH);
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    cv.style.width = rect.width + 'px';
    cv.style.height = rect.height + 'px';
    const ox = (rect.width - LW * scale) / 2;
    const oy = (rect.height - LH * scale) / 2;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  }
  window.addEventListener('resize', resize);

  // ---- tiny inline sound (WebAudio, no files) ----
  let actx = null;
  function tone(freq, dur, type, gain, delay = 0) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + delay;
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(actx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* audio not available - silent fallback */ }
  }
  const sfx = {
    coin: () => { tone(1300, 0.09, 'triangle', 0.12); tone(1760, 0.09, 'triangle', 0.09, 0.03); },
    pass: () => tone(900, 0.08, 'square', 0.08),
    crash: () => { tone(160, 0.28, 'sawtooth', 0.16); tone(90, 0.32, 'sawtooth', 0.12, 0.05); },
  };
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* noop */ } }

  // ---- state ----
  const BEST_KEY = 'wheelrush_best';
  let best = Number(localStorage.getItem(BEST_KEY)) || 0;
  bestEl.textContent = best;

  let state = 'ready'; // ready | running | over
  let lane = 1;
  let playerX = LANES[1];
  let items = [];      // {type:'rock'|'coin'|'rival', lane, y, hit}
  let speed = 220;
  let distance = 0;
  let coins = 0;
  let score = 0;
  let spawnTimer = 0;
  let roadOffset = 0;
  let wheelSpin = 0;
  let shake = 0;
  let last = 0;

  function resetRun() {
    lane = 1;
    playerX = LANES[1];
    items = [];
    speed = 220;
    distance = 0;
    coins = 0;
    score = 0;
    spawnTimer = 0;
    roadOffset = 0;
    wheelSpin = 0;
    shake = 0;
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
  }

  // ---- spawning ----
  function spawnWave() {
    // Always leave at least one lane clear so a run is always theoretically
    // survivable - a classic runner-game rule, not optional polish.
    const pattern = Math.random();
    const blocked = new Set();

    if (pattern < 0.32) {
      // one rock
      blocked.add(Math.floor(Math.random() * 3));
    } else if (pattern < 0.5) {
      // two rocks, one gap
      const a = Math.floor(Math.random() * 3);
      let b = Math.floor(Math.random() * 3);
      while (b === a) b = Math.floor(Math.random() * 3);
      blocked.add(a); blocked.add(b);
    } else if (pattern < 0.7) {
      // one rival to dodge
      const l = Math.floor(Math.random() * 3);
      items.push({ type: 'rival', lane: l, y: -40, hit: false, passed: false });
      blocked.add(l);
    }

    for (let l = 0; l < 3; l++) {
      if (blocked.has(l)) {
        if (!items.some((it) => it.lane === l && it.y < 0)) {
          items.push({ type: 'rock', lane: l, y: -40, hit: false });
        }
      } else if (Math.random() < 0.75) {
        items.push({ type: 'coin', lane: l, y: -40, hit: false });
      }
    }
  }

  // ---- input ----
  function setLane(target) {
    lane = Math.max(0, Math.min(2, target));
  }
  cv.addEventListener('pointerdown', (e) => {
    if (state !== 'running') return;
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setLane(x < rect.width / 2 ? lane - 1 : lane + 1);
  });
  window.addEventListener('keydown', (e) => {
    if (state !== 'running') return;
    if (e.key === 'ArrowLeft') setLane(lane - 1);
    if (e.key === 'ArrowRight') setLane(lane + 1);
  });

  // ---- game over / start ----
  function crash() {
    if (state !== 'running') return;
    state = 'over';
    sfx.crash();
    vibrate(60);
    shake = 10;
    const isRecord = score > best;
    if (isRecord) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
    }
    overScoreEl.textContent = `Score: ${score}`;
    overRecordEl.hidden = !isRecord;
    setTimeout(() => { overOverlay.hidden = false; }, 260);
  }

  function startRun() {
    resetRun();
    state = 'running';
    startOverlay.hidden = true;
    overOverlay.hidden = true;
  }

  startBtn.addEventListener('click', startRun);
  retryBtn.addEventListener('click', startRun);

  // ---- update ----
  function update(dt) {
    if (state !== 'running') return;

    speed = Math.min(480, speed + dt * 6.5);
    distance += speed * dt;
    score = Math.floor(distance / 10) + coins * 15;
    updateHud();

    roadOffset = (roadOffset + speed * dt) % 40;
    wheelSpin += (speed * dt) / PLAYER_R;

    // ease player toward target lane
    const targetX = LANES[lane];
    playerX += (targetX - playerX) * Math.min(1, dt * 12);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnWave();
      spawnTimer = Math.max(0.55, 1.05 - speed / 900);
    }

    for (const it of items) {
      it.y += speed * dt;

      const dx = Math.abs(LANES[it.lane] - playerX);
      const closeY = Math.abs(it.y - PLAYER_Y);

      if (!it.hit && it.type === 'coin' && closeY < ITEM_R + PLAYER_R - 6 && dx < 26) {
        it.hit = true;
        coins++;
        sfx.coin();
      } else if (!it.hit && (it.type === 'rock' || it.type === 'rival') &&
                 closeY < ITEM_R + PLAYER_R - 8 && dx < 26) {
        it.hit = true;
        crash();
      } else if (it.type === 'rival' && !it.passed && it.y > PLAYER_Y + PLAYER_R) {
        it.passed = true;
        if (!it.hit) { score += 25; sfx.pass(); }
      }
    }
    items = items.filter((it) => it.y < LH + 60 && !(it.hit && it.type === 'coin' && it.y > 0));

    if (shake > 0) shake = Math.max(0, shake - dt * 30);
  }

  // ---- drawing ----
  function drawWheel(x, y, r, rimColor, hubColor, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = rimColor;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = r * 0.34;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = hubColor;
    ctx.fill();
    ctx.restore();
  }

  function drawRock(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(-16, 8);
    ctx.lineTo(-10, -12);
    ctx.lineTo(4, -16);
    ctx.lineTo(16, -2);
    ctx.lineTo(12, 12);
    ctx.lineTo(-6, 16);
    ctx.closePath();
    ctx.fillStyle = '#6b6478';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(4, -16);
    ctx.lineTo(0, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCoin(x, y, bob) {
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.beginPath();
    ctx.arc(0, 0, COIN_R, 0, Math.PI * 2);
    ctx.fillStyle = '#f5b942';
    ctx.fill();
    ctx.strokeStyle = '#c98a1f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.arc(-3, -3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(-40, -40, LW + 80, LH + 80);

    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(sx, sy);

    // road
    const grd = ctx.createLinearGradient(0, 0, 0, LH);
    grd.addColorStop(0, '#232338');
    grd.addColorStop(1, '#1a1a2a');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, LW, LH);

    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 16]);
    ctx.lineDashOffset = -roadOffset;
    for (const divX of [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2]) {
      ctx.beginPath();
      ctx.moveTo(divX, 0);
      ctx.lineTo(divX, LH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const bob = Math.sin(t / 140) * 2;
    for (const it of items) {
      if (it.hit && it.type !== 'coin') continue;
      if (it.type === 'rock') drawRock(LANES[it.lane], it.y);
      else if (it.type === 'coin') { if (!it.hit) drawCoin(LANES[it.lane], it.y, bob); }
      else drawWheel(LANES[it.lane], it.y, PLAYER_R * 0.92, '#e2544e', '#7a2320', it.y / 14);
    }

    if (state !== 'over') {
      drawWheel(playerX, PLAYER_Y, PLAYER_R, '#f5b942', '#8a5a0d', wheelSpin);
    }

    ctx.restore();
  }

  function loop(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.05) dt = 0.05;
    update(dt);
    draw(ts);
    requestAnimationFrame(loop);
  }

  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv.parentElement);
  requestAnimationFrame(loop);
})();
