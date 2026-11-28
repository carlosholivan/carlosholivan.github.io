// "Play with <friend>": a Candy-Crush-style word game shared by every language app. The board is full of bright
// tiles: half show words in the language, half their meanings. Tap a word and then its meaning: the pair pops,
// the tiles above fall and a new pair drops in. Fast pairs in a row build combos. Every pair is a real review:
// the first try at each word is reported to the app (right or wrong) so it feeds spaced repetition.
//
// playMatch(el, opt) — opt: {
//   words: [{ key, t, sub, m }]   key: the word as the deck knows it; t: text on the tile; sub: pinyin etc.; m: meaning
//   lang, friend: { name, img, color }, secs (90), rows (6), cols (5),
//   tx: { pairs, time, combo, go, ready, tapWord, end } (labels), lifeChip(): html, onSay(t), onResult(key, ok),
//   onMiss(el), onEnd({ pairs, score, stars, best, misses }) }
import { cheer, sfx, burst, shout, floatUp, combo } from './juice.js?v=202611281751';

const CANDY = [['#ff5c8a', '#ffb3c8'], ['#ffb020', '#ffe08a'], ['#29c98b', '#a6f0cf'], ['#3fa9f5', '#b4e0ff'], ['#9b6cff', '#d6c4ff'], ['#ff7a45', '#ffc8a8']];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };

export function playMatch(el, opt) {
  const COLS = opt.cols || 5, ROWS = opt.rows || 6, SECS = opt.secs || 90;
  const words = opt.words.slice();
  const half = Math.floor(COLS * ROWS / 2);
  const rows = words.length >= half ? ROWS : Math.max(3, Math.floor(words.length * 2 / COLS));
  const N = COLS * rows;
  let uid = 0, sel = null, pairs = 0, score = 0, misses = 0, best = 0, left = SECS, over = false, last = Date.now(), timer = null;
  const tried = new Set(), used = new Map();     // first try per word; when each word was last on the board
  const grid = Array.from({ length: COLS }, () => Array(rows).fill(null));

  el.innerHTML = `<div class="wg">
    <div class="wg-top">
      <div class="wg-friend">${opt.friend.img ? `<img src="${esc(opt.friend.img)}" alt="">` : ''}<div><b>${esc(opt.friend.name)}</b><span class="wg-say">${esc(opt.tx.tapWord)}</span></div></div>
      ${opt.lifeChip ? opt.lifeChip() : ''}
    </div>
    <div class="wg-hud"><div><small>${esc(opt.tx.pairs)}</small><b class="wg-pairs">0</b></div><div class="wg-scorebox"><small>★</small><b class="wg-score">0</b></div><div><small>${esc(opt.tx.time)}</small><b class="wg-time">${SECS}</b></div></div>
    <div class="wg-bar"><i></i></div>
    <div class="wg-wrap"><div class="wg-board" style="--cols:${COLS};--rows:${rows}"></div>
      <div class="wg-start"><div><p>${esc(opt.tx.ready)}</p><button class="btn wg-go">${esc(opt.tx.go)} ▶</button></div></div></div>
  </div>`;
  const board = el.querySelector('.wg-board'), say = el.querySelector('.wg-say');
  const pos = (t, c, r) => { t.c = c; t.r = r; t.el.style.setProperty('--c', c); t.el.style.setProperty('--r', r); };

  // the next word to drop in: due words first (they come first in the list), then whichever was seen longest ago
  const onBoard = new Set();
  const nextWord = () => {
    const free = words.filter(w => !onBoard.has(w.key));
    if (!free.length) return null;
    free.sort((a, b) => (used.get(a.key) || 0) - (used.get(b.key) || 0));
    const w = free[0]; used.set(w.key, Date.now()); onBoard.add(w.key);
    return w;
  };
  const tile = (w, side, c, r, fromRow) => {
    const [a, b] = CANDY[Math.floor(Math.random() * CANDY.length)];
    const text = side === 'w' ? w.t : w.m, len = [...String(text)].length, long = Math.max(...String(text).split(/\s+/).map(x => [...x].length));
    const t = { id: ++uid, w, side, el: document.createElement('button') };
    t.el.className = `wg-t ${side === 'w' ? 'tw' : 'tm'} ${len > 14 || long > 9 ? 'xs' : len > 8 || long > 7 ? 'sm' : ''}`;
    t.el.style.cssText = `--a:${a};--b:${b}`;
    t.el.innerHTML = side === 'w'
      ? `<span lang="${opt.lang}">${esc(w.t)}</span>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`
      : `<span>${esc(w.m)}</span>`;
    t.el.onclick = () => tap(t);
    board.appendChild(t.el);
    pos(t, c, fromRow);
    if (fromRow !== r) { t.el.getBoundingClientRect(); requestAnimationFrame(() => pos(t, c, r)); }
    grid[c][r] = t;
    return t;
  };
  // fill: put each new pair into two random empty cells (falling from above the board)
  const fill = () => {
    const empty = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < rows; r++) if (!grid[c][r]) empty.push([c, r]);
    shuffle(empty);
    while (empty.length >= 2) {
      const w = nextWord(); if (!w) break;
      const [[c1, r1], [c2, r2]] = [empty.pop(), empty.pop()];
      tile(w, 'w', c1, r1, r1 - rows - 1); tile(w, 'm', c2, r2, r2 - rows - 1);
    }
  };
  const gravity = () => {
    for (let c = 0; c < COLS; c++) {
      const col = grid[c].filter(Boolean);
      grid[c] = Array(rows - col.length).fill(null).concat(col);
      grid[c].forEach((t, r) => t && pos(t, c, r));
    }
  };
  const remove = t => { grid[t.c][t.r] = null; t.el.classList.add('pop'); setTimeout(() => t.el.remove(), 320); };
  const select = t => { if (sel) sel.el.classList.remove('on'); sel = t; if (t) { t.el.classList.add('on'); if (t.side === 'w' && opt.onSay) opt.onSay(t.w.key); } };

  function tap(t) {
    if (over || !started) return;
    last = Date.now();
    if (!sel || sel === t) return select(sel === t ? null : t);
    if (sel.side === t.side) return select(t);
    const a = sel, ok = a.w === t.w;
    if (ok) {
      if (!tried.has(t.w.key)) { tried.add(t.w.key); opt.onResult && opt.onResult(t.w.key, true); }
      const n = cheer(t.el); best = Math.max(best, n);
      const pts = 100 * Math.min(n, 5) + (Math.abs(a.c - t.c) <= 1 && Math.abs(a.r - t.r) <= 1 ? 50 : 0);
      score += pts; pairs++;
      floatUp(`+${pts}`, t.el, '#fff3a6');
      if (n === 5 || n === 10) bonus();
      sel = null; onBoard.delete(t.w.key);
      remove(a); remove(t);
      setTimeout(() => { gravity(); fill(); }, 200);
      say.textContent = `${a.w.t} = ${a.w.m}`;
      if (opt.onSay) opt.onSay(t.w.key);
    } else {
      misses++;
      const w = a.side === 'w' ? a.w : t.w;      // the word whose meaning was mistaken
      if (!tried.has(w.key)) { tried.add(w.key); opt.onResult && opt.onResult(w.key, false); }
      [a, t].forEach(x => { x.el.classList.add('bad'); setTimeout(() => x.el.classList.remove('bad'), 450); });
      if (opt.onMiss) opt.onMiss(t.el); else { combo.bad(); sfx('bad'); }
      select(null);
    }
    draw();
  }
  // a combo of 5 (and 10) sets off a rainbow: one more pair pops by itself
  function bonus() {
    const all = []; for (const col of grid) for (const t of col) if (t && t.side === 'w') all.push(t);
    const t = all[Math.floor(Math.random() * all.length)]; if (!t) return;
    let m = null; for (const col of grid) for (const x of col) if (x && x.w === t.w && x.side === 'm') m = x;
    if (!m) return;
    setTimeout(() => {
      if (over || !t.el.isConnected) return;
      shout('🌈 Bonus!'); burst(t.el, 40, 1.3); burst(m.el, 40, 1.3); sfx('gem');
      score += 300; pairs++; onBoard.delete(t.w.key);
      if (sel === t || sel === m) sel = null;
      remove(t); remove(m); setTimeout(() => { gravity(); fill(); draw(); }, 200);
    }, 500);
  }
  const draw = () => {
    el.querySelector('.wg-pairs').textContent = pairs;
    el.querySelector('.wg-score').textContent = score;
    el.querySelector('.wg-time').textContent = Math.ceil(left);
    el.querySelector('.wg-bar i').style.width = `${100 * left / SECS}%`;
    el.querySelector('.wg-bar').classList.toggle('low', left <= 10);
  };
  // after a few seconds without a move, a pair winks to help
  const hint = () => {
    if (Date.now() - last < 7000 || sel) return;
    const ws = []; for (const col of grid) for (const t of col) if (t && t.side === 'w') ws.push(t);
    const t = ws[Math.floor(Math.random() * ws.length)]; if (!t) return;
    t.el.classList.add('wink'); setTimeout(() => t.el.classList.remove('wink'), 1200); last = Date.now();
  };
  let started = false;
  fill();
  el.querySelector('.wg-go').onclick = () => {
    el.querySelector('.wg-start').remove(); started = true; combo.bad(); last = Date.now();
    sfx('ok', 1);
    let prev = performance.now();
    timer = setInterval(() => {
      const now = performance.now(), dt = (now - prev) / 1000; prev = now;
      if (document.hidden) return;
      left = Math.max(0, left - dt); draw(); hint();
      if (left <= 0) end();
    }, 250);
  };
  function end() {
    if (over) return; over = true; clearInterval(timer);
    const stars = pairs >= 22 ? 3 : pairs >= 14 ? 2 : pairs >= 6 ? 1 : 0;
    board.classList.add('done');
    setTimeout(() => opt.onEnd && opt.onEnd({ pairs, score, stars, best, misses }), 700);
  }
  draw();
  return { stop: () => { over = true; clearInterval(timer); } };
}

export const CSS = `
.wg{color:#fff;padding-bottom:20px}
.wg-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.wg-friend{display:flex;align-items:center;gap:10px;min-width:0}
.wg-friend img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:50% 12%;border:3px solid #ffd36b;background:#24407a;flex:none}
.wg-friend b{display:block;font-size:15px}.wg-say{display:block;font-size:13px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56vw}
.wg-hud{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:8px;margin-bottom:8px}
.wg-hud>div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:14px;text-align:center;padding:6px 4px}
.wg-hud small{display:block;font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.06em}.wg-hud b{font-size:22px;font-weight:900}
.wg-scorebox b{background:linear-gradient(90deg,#ffd36b,#ff8fab,#b388ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.wg-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin-bottom:12px}
.wg-bar i{display:block;height:100%;background:linear-gradient(90deg,#3ddc97,#4cc9f0);transition:width .25s linear}.wg-bar.low i{background:linear-gradient(90deg,#ff4d6d,#ffb703);animation:wgLow .5s infinite alternate}
@keyframes wgLow{to{opacity:.5}}
.wg-board{position:relative;width:100%;aspect-ratio:var(--cols)/var(--rows);--g:6px;border-radius:20px;padding:var(--g);box-sizing:border-box;
  background:radial-gradient(120% 90% at 50% 0%,rgba(122,150,255,.25),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 2px 20px rgba(0,0,0,.35);overflow:hidden}
.wg-t{position:absolute;--w:calc((100% - var(--g) * 2) / var(--cols));--h:calc((100% - var(--g) * 2) / var(--rows));
  left:calc(var(--g) + var(--w) * var(--c));top:calc(var(--g) + var(--h) * var(--r));width:calc(var(--w) - 6px);height:calc(var(--h) - 6px);margin:3px;
  border:0;border-radius:16px;padding:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#fff;
  background:radial-gradient(circle at 30% 22%,var(--b) 0,var(--a) 55%,color-mix(in srgb,var(--a) 70%,#000) 100%);
  box-shadow:inset 0 -5px 0 rgba(0,0,0,.18),inset 0 3px 0 rgba(255,255,255,.35),0 4px 10px rgba(0,0,0,.3);
  transition:top .42s cubic-bezier(.3,1.35,.5,1),left .3s,transform .15s;font:800 15px/1.15 system-ui,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.35);overflow:hidden;-webkit-tap-highlight-color:transparent}
.wg-t span{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-align:center;word-break:normal;overflow-wrap:normal;hyphens:auto}
.wg-t.tw span{font-size:20px;hyphens:none}.wg-t.tw.sm span{font-size:15px}.wg-t.tw.xs span{font-size:12px}
.wg-t.tm span{font-size:13px;font-weight:700}.wg-t.tm.sm span{font-size:11.5px}.wg-t.tm.xs span{font-size:10px}
.wg-t small{font-size:10px;opacity:.9;font-weight:700;margin-top:1px}
.wg-t.tm{border-radius:50% / 38%}
.wg-t.on{transform:scale(1.1);z-index:2;box-shadow:0 0 0 3px #fff,0 0 22px 6px var(--b),inset 0 -5px 0 rgba(0,0,0,.18)}
.wg-t.bad{animation:wgShake .4s}
.wg-t.pop{animation:wgPop .32s forwards;pointer-events:none}
.wg-t.wink{animation:wgWink 1.2s}
@keyframes wgShake{20%{transform:translateX(-6px) rotate(-4deg)}40%{transform:translateX(6px) rotate(4deg)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
@keyframes wgPop{40%{transform:scale(1.35);filter:brightness(1.6)}100%{transform:scale(0);opacity:0}}
@keyframes wgWink{25%,75%{transform:scale(1.12) rotate(-5deg)}50%{transform:scale(1.12) rotate(5deg)}}
.wg-board.done .wg-t{filter:grayscale(.6) brightness(.8);pointer-events:none;transition:filter .5s}
.wg-wrap{position:relative}
.wg-start{position:absolute;inset:0;z-index:3;display:grid;place-items:center;text-align:center;background:rgba(10,16,40,.55);backdrop-filter:blur(2px);border-radius:20px;padding:20px}
.wg-start p{margin:0 0 14px;font-size:15px;line-height:1.45;color:#eef2ff;max-width:280px}
.wg-start .btn{font-size:20px;padding:14px 34px;border-radius:999px;background:linear-gradient(90deg,#ff4d6d,#ffb703);border:0;box-shadow:0 8px 24px rgba(255,120,80,.5);animation:wgWink 1.6s infinite}
@media (prefers-reduced-motion: reduce){.wg-t{transition:none}.wg-start .btn{animation:none}}`;
