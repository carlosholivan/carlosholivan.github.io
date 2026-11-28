// "Starry night" theme for every language app (Settings → Appearance): the story mode's navy sky with gently
// falling snowflakes, applied to the whole app. Remembered in localStorage idiomas_night ('1' = on).
const CSS = `
body.night{--bg:#0f1d42;--bg2:#172a5c;--ink:#eef2ff;--ink2:#a9b6dc;--line:#26407a;--soft:#1c3168;--accent:#ffd36b;--accent2:#ffc04d;--gold:#ffd36b;--ok:#3ddc97;--no:#ff7a8a;
  --shadow:0 1px 3px rgba(0,0,0,.35),0 8px 28px rgba(0,0,0,.3);background:linear-gradient(#0b1638,#1a2d63) fixed !important;color:var(--ink)}
body.night #app{position:relative;z-index:1}
#night-sky{position:fixed;inset:0;z-index:0;pointer-events:none}
body.sm-on #night-sky{display:none}`;
let raf = 0;
function sky(on) {
  let c = document.getElementById('night-sky');
  if (!on) { if (c) c.remove(); cancelAnimationFrame(raf); return; }
  if (c) return;
  c = document.createElement('canvas'); c.id = 'night-sky'; document.body.prepend(c);
  const ctx = c.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  let W, H; const size = () => { W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; }; size(); addEventListener('resize', size);
  const N = Math.round(Math.min(120, innerWidth * innerHeight / 10000));
  const f = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: .5 + Math.random() * 1.5, v: .0002 + Math.random() * .0006, d: Math.random() * 6.3, o: .3 + Math.random() * .5 }));
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = () => {
    if (!document.getElementById('night-sky')) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of f) {
      if (!still) { p.y += p.v; p.d += .01; p.x += Math.sin(p.d) * .0002; if (p.y > 1.02) { p.y = -.02; p.x = Math.random(); } }
      ctx.globalAlpha = p.o; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * dpr, 0, 6.29); ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
export function applyNight(on = localStorage.getItem('idiomas_night') === '1') {
  if (!document.getElementById('night-css')) document.head.insertAdjacentHTML('beforeend', `<style id="night-css">${CSS}</style>`);
  document.body.classList.toggle('night', on);
  if (on) document.body.classList.add('dark');
  sky(on);
}
export function toggleNight() {
  const on = localStorage.getItem('idiomas_night') !== '1';
  try { localStorage.setItem('idiomas_night', on ? '1' : '0'); } catch (e) {}
  if (!on) document.body.classList.toggle('dark', localStorage.getItem('idiomas_dark') === '1');
  applyNight(on);
  return on;
}
applyNight();
