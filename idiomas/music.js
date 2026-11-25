// Background music for the start menus (hub, "What do you want to learn today?" and home): an original, slow,
// melancholic solo-piano piece in 3/4, synthesised live with the Web Audio API (no audio files). It fades in on
// those screens and out as soon as the learner starts studying. On/off in each app's Settings (shared by all apps).
(() => {
  const KEY = 'idiomas_music';
  const on = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };
  const isHub = /\/idiomas\/?($|index\.html)/.test(location.pathname);
  const inMenu = () => isHub || !!document.querySelector('.study-pick, .lvl-card');

  // ---- the piece: A minor, ~64 bpm in 3/4. [chord root (MIDI), chord type] and melody [[note, beats], …] per bar.
  const BPM = 64, BEAT = 60 / BPM, BAR = 3 * BEAT;
  const N = s => { const m = s.match(/^([A-G])(#|b)?(\d)$/); return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const CH = { m: [0, 7, 15, 19], M: [0, 7, 16, 19] };          // root, fifth, tenth, twelfth
  const BARS = [
    ['A2', 'm', [['E5', 2], ['A4', 1]]], ['F2', 'M', [['C5', 1.5], ['B4', .5], ['A4', 1]]],
    ['C3', 'M', [['G4', 2], ['E4', 1]]], ['G2', 'M', [['D5', 3]]],
    ['A2', 'm', [['E5', 1], ['A5', 1], ['G5', 1]]], ['F2', 'M', [['F5', 1.5], ['E5', .5], ['C5', 1]]],
    ['D3', 'm', [['D5', 1], ['F5', 1], ['E5', 1]]], ['E2', 'M', [['B4', 2], ['G#4', 1]]],
    ['F2', 'M', [['A5', 2], ['G5', 1]]], ['G2', 'M', [['F5', 1], ['E5', 1], ['D5', 1]]],
    ['E2', 'm', [['E5', 2], ['B4', 1]]], ['A2', 'm', [['C5', 3]]],
    ['D3', 'm', [['D5', 1], ['F5', 1], ['A5', 1]]], ['G2', 'M', [['G5', 1.5], ['F5', .5], ['D5', 1]]],
    ['C3', 'M', [['E5', 1], ['C5', 1], ['G4', 1]]], ['E2', 'M', [['G#4', 2], ['B4', 1]]],
    // quieter coda-like second pass of the opening, an octave lower in the melody
    ['A2', 'm', [['E4', 2], ['A4', 1]]], ['F2', 'M', [['C5', 1.5], ['B4', .5], ['A4', 1]]],
    ['D3', 'm', [['F4', 1], ['A4', 1], ['D5', 1]]], ['E2', 'M', [['B4', 1.5], ['G#4', .5], ['E4', 1]]],
  ];
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  let ctx = null, master = null, verb = null, timer = null, nextBar = 0, t0 = 0, playing = false;

  function setup(c) {
    ctx = c || new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    // Soft room reverb: decaying noise as impulse response.
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.45;
    verb.connect(wet); wet.connect(master);
  }

  // A simple piano-like tone: a few slightly inharmonic partials, fast attack, decay faster for higher partials.
  function key(m, t, dur, vel) {
    const f = freq(m), out = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * 7); lp.Q.value = 0.3;
    out.connect(lp); lp.connect(master); lp.connect(verb);
    [[1, 1], [2, .42], [3, .2], [4, .1], [5, .05]].forEach(([n, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * n * (1 + 0.00035 * n * n);
      const peak = a * vel, tail = Math.max(0.6, dur * 1.6) / Math.sqrt(n);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.25 / Math.sqrt(n));
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 + tail);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.3 + tail);
    });
  }

  function scheduleBar(i, t) {
    const [root, type, mel] = BARS[i % BARS.length];
    const r = N(root), c = CH[type];
    // Left hand: rolling eighths root–5th–10th–5th–12th–10th, the root held a little longer.
    [c[0], c[1], c[2], c[1], c[3], c[2]].forEach((iv, k) => key(r + iv, t + k * BEAT / 2, k ? BEAT * 0.9 : BAR, k ? 0.11 : 0.16));
    // Right hand: the melody, with a touch of human timing.
    let b = 0;
    for (const [n, len] of mel) { key(N(n), t + b * BEAT + Math.random() * 0.015, len * BEAT, 0.2 + Math.random() * 0.04); b += len; }
  }

  function tick() {
    while (t0 + nextBar * BAR < ctx.currentTime + 1.2) { scheduleBar(nextBar, t0 + nextBar * BAR); nextBar++; }
  }

  function start() {
    if (playing || !on()) return;
    if (!ctx) setup();
    ctx.resume();
    playing = true;
    nextBar = 0; t0 = ctx.currentTime + 0.15;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.5);
    tick(); timer = setInterval(tick, 250);
  }
  function stop(fast) {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + (fast ? 0.3 : 1.5));
    setTimeout(() => { if (!playing) ctx.suspend(); }, fast ? 400 : 1700);
  }

  // Browsers only allow sound after a tap: start on the first interaction while on a menu.
  let unlocked = false;
  const unlock = () => { unlocked = true; check(); };
  addEventListener('pointerdown', unlock, { capture: true });
  addEventListener('keydown', unlock, { capture: true });

  function check() {
    const want = unlocked && on() && inMenu() && document.visibilityState === 'visible';
    if (want) start(); else stop(!inMenu());
  }
  setInterval(check, 700);
  document.addEventListener('visibilitychange', check);

  // Offline render (used to preview the piece as a file): returns the rendered AudioBuffer.
  window.__musicRender = async (secs = 60) => {
    const live = ctx, off = new OfflineAudioContext(2, 44100 * secs, 44100);
    setup(off); master.gain.value = 0.55;
    for (let i = 0; i * BAR < secs; i++) scheduleBar(i, 0.1 + i * BAR);
    const buf = await off.startRendering();
    ctx = live;
    return buf;
  };

  // Settings switch (shared by all apps).
  window.__musicOn = on;
  window.__musicToggle = (btn) => {
    try { localStorage.setItem(KEY, on() ? '0' : '1'); } catch (e) {}
    if (btn) btn.textContent = btn.textContent.replace(/✓|✗/, on() ? '✓' : '✗');
    check();
  };
})();
