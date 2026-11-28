// "Juice": the bright, bouncy feedback that makes a right answer feel good (confetti bursts, combo counters,
// floating gems, short synthesized sounds). Shared by every language app. No assets: shapes are DOM elements
// animated with the Web Animations API, and sounds are generated with Web Audio. Respects reduced motion and the
// sound switch (localStorage idiomas_sfx = '0' turns sounds off).

import { autoIcons } from './icons.js?v=202611282200';
autoIcons();   // gems and lives drawn in the app's style, not as system emoji

const CANDY = ['#ff4d6d', '#ffb703', '#3ddc97', '#4cc9f0', '#b388ff', '#ff8fab', '#ffd60a', '#06d6a0'];
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let ctx = null;
const ac = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; } catch (e) { return null; } };

function tone(freq, t0, dur, type = 'sine', vol = .18) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + .012);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + t0 + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + .05);
}

// kind: 'ok' (rises with the combo), 'bad', 'gem', 'win', 'life'
export function sfx(kind, combo = 1) {
  if (localStorage.idiomas_sfx === '0') return;
  const base = 523.25 * Math.pow(2, Math.min(combo - 1, 7) / 12);
  if (kind === 'ok') { tone(base, 0, .16, 'triangle'); tone(base * 1.26, .07, .18, 'triangle'); tone(base * 1.5, .14, .26, 'triangle', .14); }
  else if (kind === 'bad') { tone(220, 0, .18, 'sine', .14); tone(185, .09, .22, 'sine', .12); }
  else if (kind === 'gem') { [1568, 2093, 2637].forEach((f, k) => tone(f, k * .05, .14, 'sine', .08)); }
  else if (kind === 'life') { tone(392, 0, .12, 'square', .05); tone(330, .1, .2, 'square', .05); }
  else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, k) => tone(f, k * .11, .3, 'triangle', .15)); tone(1047, .48, .6, 'triangle', .12); }
}

const centre = el => { if (!el) return [innerWidth / 2, innerHeight / 2]; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

// A burst of confetti from an element (or the middle of the screen).
export function burst(el, n = 26, spread = 1) {
  if (calm()) return;
  const [x, y] = centre(el);
  for (let k = 0; k < n; k++) {
    const p = document.createElement('i'), s = 6 + Math.random() * 7, round = Math.random() < .4;
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${s}px;height:${round ? s : s * .55}px;border-radius:${round ? '50%' : '2px'};background:${CANDY[k % CANDY.length]};z-index:9999;pointer-events:none;box-shadow:0 0 6px ${CANDY[k % CANDY.length]}88`;
    document.body.appendChild(p);
    const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 120) * spread;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 60 * spread;
    p.animate([{ transform: 'translate(-50%,-50%) rotate(0) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540}deg) scale(1)`, opacity: 1, offset: .55 },
      { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy + 160}px)) rotate(${Math.random() * 720}deg) scale(.6)`, opacity: 0 }],
      { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
  }
}

// Big rainbow text that pops in the middle of the screen ("Combo x4!", "Perfect!").
export function shout(text, el) {
  const [x, y] = el ? centre(el) : [innerWidth / 2, innerHeight * .38];
  const d = document.createElement('div');
  d.textContent = text;
  d.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;pointer-events:none;font:900 30px/1 system-ui,sans-serif;white-space:nowrap;
    background:linear-gradient(90deg,#ff4d6d,#ffb703,#3ddc97,#4cc9f0,#b388ff);-webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 3px 0 #fff) drop-shadow(0 6px 14px rgba(0,0,0,.35))`;
  document.body.appendChild(d);
  d.animate(calm() ? [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }] : [
    { transform: 'translate(-50%,-50%) scale(.2) rotate(-8deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.25) rotate(3deg)', opacity: 1, offset: .25 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1, offset: .6 },
    { transform: 'translate(-50%,-90%) scale(.9)', opacity: 0 }], { duration: 1300, easing: 'ease-out' }).onfinish = () => d.remove();
}

// "+3 💎" floating up from an element.
export function floatUp(text, el, color = '#ffd36b') {
  const [x, y] = centre(el);
  const d = document.createElement('div');
  d.textContent = text;
  d.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;pointer-events:none;font:900 20px system-ui;color:${color};text-shadow:0 2px 0 rgba(0,0,0,.35),0 0 12px ${color}`;
  document.body.appendChild(d);
  d.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-120%) scale(1.15)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 }],
    { duration: 1200, easing: 'ease-out' }).onfinish = () => d.remove();
}

// A quick squash-and-stretch on an element; 'shake' for a wrong answer.
export function pop(el, kind = 'pop') {
  if (!el || calm()) return;
  el.animate(kind === 'shake'
    ? [{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }]
    : [{ transform: 'scale(1)' }, { transform: 'scale(1.12,.9)' }, { transform: 'scale(.95,1.08)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
}

// Right answers in a row. good() returns the new streak; bad() resets it.
let run = 0;
export const combo = { good() { return ++run; }, bad() { run = 0; }, get n() { return run; } };

// One call for a right answer: sound, confetti from the tapped button, a combo shout from 3 in a row.
export function cheer(el) {
  const n = combo.good();
  sfx('ok', n); pop(el); burst(el, n >= 5 ? 40 : 22, n >= 5 ? 1.4 : 1);
  if (n >= 3) setTimeout(() => shout(n >= 10 ? `🔥 x${n}!` : `Combo x${n}!`), 120);
  return n;
}
// One call for a wrong answer.
export function boo(el) { combo.bad(); sfx('bad'); pop(el, 'shake'); }

// The lives of each language app: a local food.
export const lifeOf = app => ({ nihongo: '🍙', chino: '🥟', arabe: '🧆', arabic: '🧆', espanol: '🥘', english: '🫖', francais: '🥐', deutsch: '🥨' }[app] || '❤️');

// A life earned back by reviewing: celebrate it wherever the learner is.
addEventListener('lifeearned', () => {
  const app = (location.pathname.match(/\/(\w+)-app\//) || [])[1];
  sfx('gem'); shout(`+1 ${lifeOf(app)}`);
});
export const lifeName = (app, lang) => ((({ nihongo: ['onigiris', 'onigiri'], chino: ['jiaozi', 'dumplings'], arabe: ['falafels', 'falafels'], arabic: ['falafels', 'falafels'],
  espanol: ['paellas', 'paellas'], english: ['teteras', 'teapots'], francais: ['cruasanes', 'croissants'], deutsch: ['pretzels', 'pretzels'] })[app]) || ['vidas', 'lives'])[lang === 'en' ? 1 : 0];
