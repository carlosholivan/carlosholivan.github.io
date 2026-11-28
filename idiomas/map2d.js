// The story's region map: a hand-drawn-style 2D map (SVG) of the level's region, shared by every language app.
// Towns along a winding road (one per episode), the start gate, the temple (the level's "gym"), the hero's friends
// standing by the road, signposts with facts, and the daily chest. It follows the device clock (dawn, day, dusk,
// night) and the season, and each country has its own houses, trees and landscape. Loads instantly: no WebGL.
//
// regionMap(opts) returns { svg, H }. Taps call window.__mpNode(key), __mpFriend(id), __mpSign(i), __mpChest(),
// __mpGym(), which the story view defines.

export function sceneTime(d = new Date()) {
  const m = d.getMonth(), h = d.getHours() + d.getMinutes() / 60;
  const season = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][m];
  const phase = h < 5.5 || h >= 19.5 ? 'night' : h < 7.5 ? 'dawn' : h >= 17.5 ? 'dusk' : 'day';
  return { season, phase, hour: h };
}

const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const f = n => Math.round(n * 10) / 10;
const pick = (r, a) => a[Math.floor(r() * a.length)];
const escX = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// one cubic segment per pair of points (Catmull-Rom), so the finished part of the road can reuse the same curve
function segments(P) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out.push(` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`);
  }
  return out;
}

const PAL = {
  ground: { spring: '#b4dc8c', summer: '#9dd178', autumn: '#cfc27c', winter: '#edf2f6' },
  sand: { spring: '#efd8a0', summer: '#f0d698', autumn: '#ead09a', winter: '#e6d3a8' },
  sky: { day: ['#7fc6fb', '#d8f0ff'], dawn: ['#7a86d6', '#ffd2a8'], dusk: ['#5a4fa8', '#ff9f7c'], night: ['#08123a', '#22356b'] },
};

// ---------- trees and small things ----------
function tree(kind, x, y, s, season, r) {
  const sh = `<ellipse cx="${f(x + 3 * s)}" cy="${f(y)}" rx="${f(11 * s)}" ry="${f(3.6 * s)}" fill="rgba(0,0,0,.16)"/>`;
  const trunk = (h = 11, c = '#7a5534') => `<rect x="${f(x - 1.7 * s)}" y="${f(y - h * s)}" width="${f(3.4 * s)}" height="${f(h * s)}" rx="${f(s)}" fill="${c}"/>`;
  if (kind === 'pine') {
    const g = season === 'winter' ? '#46745a' : '#3c7a4c', snow = season === 'winter';
    let o = sh + trunk(7);
    [[0, 12], [8, 10], [15, 7.5]].forEach(([dy, w]) => {
      const b = y - 6 * s - dy * s, t = b - 13 * s;
      o += `<path d="M${f(x - w * s)} ${f(b)} L${f(x)} ${f(t)} L${f(x + w * s)} ${f(b)} Z" fill="${g}"/>`;
      if (snow) o += `<path d="M${f(x - w * .45 * s)} ${f(t + 6 * s)} L${f(x)} ${f(t)} L${f(x + w * .45 * s)} ${f(t + 6 * s)} Z" fill="#fff"/>`;
    });
    return o;
  }
  if (kind === 'palm') {
    const top = [x + 5 * s, y - 27 * s];
    let o = sh + `<path d="M${f(x)} ${f(y)} Q${f(x - 2 * s)} ${f(y - 14 * s)} ${f(top[0])} ${f(top[1])}" stroke="#9a7444" stroke-width="${f(3.4 * s)}" fill="none" stroke-linecap="round"/>`;
    const g = season === 'winter' ? '#4f8f52' : '#3f9a4a';
    [-150, -110, -70, -30, 10, 200, 240].forEach(a => {
      const rad = a * Math.PI / 180, ex = top[0] + Math.cos(rad) * 15 * s, ey = top[1] + Math.sin(rad) * 9 * s + 6 * s;
      o += `<path d="M${f(top[0])} ${f(top[1])} Q${f((top[0] + ex) / 2)} ${f(Math.min(top[1], ey) - 5 * s)} ${f(ex)} ${f(ey)}" stroke="${g}" stroke-width="${f(2.8 * s)}" fill="none" stroke-linecap="round"/>`;
    });
    return o + `<circle cx="${f(top[0])}" cy="${f(top[1] + 1.5 * s)}" r="${f(2.2 * s)}" fill="#7a5530"/>`;
  }
  if (kind === 'shrub') return `<ellipse cx="${f(x + 2 * s)}" cy="${f(y)}" rx="${f(9 * s)}" ry="${f(3 * s)}" fill="rgba(0,0,0,.14)"/><ellipse cx="${f(x)}" cy="${f(y - 4 * s)}" rx="${f(8 * s)}" ry="${f(5.5 * s)}" fill="#9aa95e"/><ellipse cx="${f(x - 2 * s)}" cy="${f(y - 6 * s)}" rx="${f(4 * s)}" ry="${f(3 * s)}" fill="#b6c272"/>`;
  if (kind === 'rock') return `<ellipse cx="${f(x)}" cy="${f(y - 3 * s)}" rx="${f(8 * s)}" ry="${f(5 * s)}" fill="#b9ab92"/><ellipse cx="${f(x - 2 * s)}" cy="${f(y - 5 * s)}" rx="${f(4 * s)}" ry="${f(2.2 * s)}" fill="#d6cab3"/>`;
  if (kind === 'bamboo') {
    let o = `<ellipse cx="${f(x + 2 * s)}" cy="${f(y)}" rx="${f(8 * s)}" ry="${f(2.6 * s)}" fill="rgba(0,0,0,.14)"/>`;
    [-4, 0, 4].forEach((dx, k) => { const h = (24 + k * 5) * s; o += `<path d="M${f(x + dx * s)} ${f(y)} V${f(y - h)}" stroke="${season === 'winter' ? '#7fa37a' : '#6fae4e'}" stroke-width="${f(2.2 * s)}"/><path d="M${f(x + dx * s)} ${f(y - h + 4 * s)} l${f(6 * s)} ${f(-3 * s)} M${f(x + dx * s)} ${f(y - h + 9 * s)} l${f(-6 * s)} ${f(-3 * s)}" stroke="#5c9c3e" stroke-width="${f(1.6 * s)}" stroke-linecap="round"/>`; });
    return o;
  }
  // round tree; 'cherry' turns pink in spring and red (maple) in autumn
  const col = kind === 'cherry'
    ? { spring: ['#f4a9c6', '#ffd6e6'], summer: ['#4d9f49', '#7cc46a'], autumn: ['#d6452f', '#f07a4a'], winter: ['#d9e4ea', '#ffffff'] }[season]
    : { spring: ['#6cc066', '#a6e08a'], summer: ['#3f9a45', '#6cc061'], autumn: [pick(r, ['#e08a3a', '#d9672e', '#e3b23c']), '#f2c66a'], winter: ['#d9e4ea', '#ffffff'] }[season];
  let o = sh + trunk(12);
  o += `<circle cx="${f(x)}" cy="${f(y - 18 * s)}" r="${f(10.5 * s)}" fill="${col[0]}"/><circle cx="${f(x - 3.5 * s)}" cy="${f(y - 21 * s)}" r="${f(5.5 * s)}" fill="${col[1]}" opacity=".7"/>`;
  if (season === 'spring' && kind !== 'cherry') o += `<circle cx="${f(x + 4 * s)}" cy="${f(y - 15 * s)}" r="${f(1.6 * s)}" fill="#ffd1e3"/><circle cx="${f(x - 5 * s)}" cy="${f(y - 13 * s)}" r="${f(1.4 * s)}" fill="#fff"/>`;
  return o;
}

// ---------- buildings ----------
function house(arch, app, x, y, i, lights) {
  const v = i % 3;
  if (arch === 'asia') {
    const roof = app === 'chino' ? ['#2f6f6a', '#8a3b2c', '#3a5878'][v] : ['#3f4652', '#5b4a3d', '#2f4f5a'][v];
    lights.push([x - 9, y - 21, 18, 9]);
    return `<rect x="${x - 21}" y="${y - 4}" width="42" height="5" rx="1.5" fill="#9a8f80"/>
      <rect x="${x - 15}" y="${y - 25}" width="30" height="21" fill="#f6f1e6" stroke="#5a4636" stroke-width="1.2"/>
      <rect x="${x - 9}" y="${y - 21}" width="18" height="9" fill="#efe3c4" stroke="#8a7458" stroke-width=".8"/><path d="M${x} ${y - 21}V${y - 12}M${x - 9} ${y - 16.5}H${x + 9}" stroke="#8a7458" stroke-width=".7"/>
      ${v !== 1 ? `<rect x="${x - 16}" y="${y - 25}" width="3.2" height="21" fill="#b8382c"/><rect x="${x + 12.8}" y="${y - 25}" width="3.2" height="21" fill="#b8382c"/>` : ''}
      <path d="M${x - 26} ${y - 22} Q${x - 14} ${y - 25} ${x - 11} ${y - 36} L${x + 11} ${y - 36} Q${x + 14} ${y - 25} ${x + 26} ${y - 22} Q${x} ${y - 27} ${x - 26} ${y - 22}Z" fill="${roof}"/>
      <path d="M${x - 12} ${y - 36}H${x + 12}" stroke="#222" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (arch === 'arab') {
    lights.push([x - 12, y - 20, 5, 7], [x + 7, y - 20, 5, 7]);
    return `<rect x="${x - 17}" y="${y - 28}" width="34" height="28" fill="#f4ead6" stroke="#c9b28a" stroke-width="1"/>
      ${v === 1 ? `<rect x="${x - 18}" y="${y - 31}" width="36" height="3.5" fill="#e3d2b0"/>` : `<path d="M${x - 11} ${y - 28} A11 11 0 0 1 ${x + 11} ${y - 28} Z" fill="${['#3a8fb0', '#d9a441', '#3f9a8a'][v]}"/><path d="M${x} ${y - 39} v-4" stroke="#c9a23a" stroke-width="1.6"/>`}
      <path d="M${x - 4.5} ${y} V${y - 10} A4.5 4.5 0 0 1 ${x + 4.5} ${y - 10} V${y} Z" fill="#7a5230"/>
      <rect x="${x - 12}" y="${y - 20}" width="5" height="7" rx="2.5" fill="#6b5a44"/><rect x="${x + 7}" y="${y - 20}" width="5" height="7" rx="2.5" fill="#6b5a44"/>`;
  }
  const roof = ['#c25b3a', '#8a5a3c', '#55657e'][v], wall = ['#f3e6cf', '#f6efe2', '#ead9bd'][v];
  lights.push([x - 13, y - 21, 7, 6], [x + 6, y - 21, 7, 6]);
  return `<rect x="${x - 16}" y="${y - 26}" width="32" height="26" fill="${wall}" stroke="#b59a77" stroke-width="1"/>
    ${app === 'deutsch' ? `<path d="M${x - 16} ${y - 13}H${x + 16}M${x - 8} ${y - 26}V${y}M${x + 8} ${y - 26}V${y}M${x - 16} ${y - 26}L${x - 8} ${y - 13}M${x + 16} ${y - 26}L${x + 8} ${y - 13}" stroke="#6b4a30" stroke-width="1.6"/>` : ''}
    <rect x="${x + 7}" y="${y - 47}" width="5" height="10" fill="#8a6a55"/>
    <path d="M${x - 21} ${y - 25} L${x} ${y - 45} L${x + 21} ${y - 25} Z" fill="${roof}"/>
    <rect x="${x - 4}" y="${y - 12}" width="8" height="12" rx="1" fill="#7a4b2a"/>
    <rect x="${x - 13}" y="${y - 21}" width="7" height="6" fill="#6f7f95"/><rect x="${x + 6}" y="${y - 21}" width="7" height="6" fill="#6f7f95"/>`;
}

function gate(arch, x, y) {
  if (arch === 'asia') return `<rect x="${x - 26}" y="${y - 40}" width="5" height="40" fill="#c0392b"/><rect x="${x + 21}" y="${y - 40}" width="5" height="40" fill="#c0392b"/>
    <path d="M${x - 36} ${y - 44} Q${x} ${y - 38} ${x + 36} ${y - 44} L${x + 34} ${y - 38} Q${x} ${y - 33} ${x - 34} ${y - 38}Z" fill="#a52c22"/><rect x="${x - 30}" y="${y - 32}" width="60" height="4" fill="#c0392b"/><path d="M${x - 36} ${y - 44} Q${x} ${y - 38} ${x + 36} ${y - 44}" stroke="#222" stroke-width="2" fill="none"/>`;
  if (arch === 'arab') return `<rect x="${x - 30}" y="${y - 40}" width="12" height="40" fill="#e3cc9c"/><rect x="${x + 18}" y="${y - 40}" width="12" height="40" fill="#e3cc9c"/>
    <path d="M${x - 18} ${y} V${y - 26} A18 18 0 0 1 ${x + 18} ${y - 26} V${y}" stroke="#e3cc9c" stroke-width="7" fill="none"/><path d="M${x - 32} ${y - 42}h64" stroke="#cdb17d" stroke-width="5"/>`;
  return `<rect x="${x - 30}" y="${y - 36}" width="11" height="36" fill="#bdb4a4"/><rect x="${x + 19}" y="${y - 36}" width="11" height="36" fill="#bdb4a4"/>
    <path d="M${x - 19} ${y - 18} A19 19 0 0 1 ${x + 19} ${y - 18}" stroke="#bdb4a4" stroke-width="8" fill="none"/><path d="M${x - 33} ${y - 38}h66" stroke="#a69c8a" stroke-width="5"/>`;
}

function temple(arch, x, y, won) {
  const g = won ? `<ellipse cx="${x}" cy="${y - 40}" rx="75" ry="60" fill="url(#mpGold)"/>` : '';
  let b;
  if (arch === 'asia') {
    b = `<rect x="${x - 42}" y="${y - 6}" width="84" height="7" fill="#8f8577"/>`;
    [[0, 34, 20], [26, 26, 17], [48, 19, 15]].forEach(([dy, w, h]) => {
      const by = y - 6 - dy;
      b += `<rect x="${x - w + 6}" y="${by - h}" width="${(w - 6) * 2}" height="${h}" fill="#f4ecdc" stroke="#5a4636"/><rect x="${x - w + 6}" y="${by - h}" width="4" height="${h}" fill="#b8382c"/><rect x="${x + w - 10}" y="${by - h}" width="4" height="${h}" fill="#b8382c"/>
        <path d="M${x - w - 8} ${by - h + 3} Q${x - w + 4} ${by - h} ${x - w + 8} ${by - h - 9} L${x + w - 8} ${by - h - 9} Q${x + w - 4} ${by - h} ${x + w + 8} ${by - h + 3} Q${x} ${by - h - 3} ${x - w - 8} ${by - h + 3}Z" fill="#7a2a22"/>`;
    });
    b += `<path d="M${x} ${y - 96} V${y - 112}" stroke="#c9a23a" stroke-width="3"/><circle cx="${x}" cy="${y - 113}" r="3" fill="#e8c14a"/>`;
  } else if (arch === 'arab') {
    b = `<rect x="${x - 48}" y="${y - 40}" width="96" height="40" fill="#f2e3c2" stroke="#c9b28a"/>
      <rect x="${x - 56}" y="${y - 60}" width="16" height="60" fill="#ead6ad"/><rect x="${x + 40}" y="${y - 60}" width="16" height="60" fill="#ead6ad"/>
      ${[-56, -51, -46, 40, 45, 50].map(dx => `<rect x="${x + dx}" y="${y - 65}" width="4" height="5" fill="#ead6ad"/>`).join('')}
      <path d="M${x - 24} ${y - 40} A24 26 0 0 1 ${x + 24} ${y - 40} Z" fill="#2f86a8"/><path d="M${x} ${y - 66} v-8" stroke="#d6b04a" stroke-width="2.5"/>
      <path d="M${x - 9} ${y} V${y - 18} A9 9 0 0 1 ${x + 9} ${y - 18} V${y} Z" fill="#7a5230"/>`;
  } else {
    b = `<rect x="${x - 44}" y="${y - 38}" width="88" height="38" fill="#cfc6b6" stroke="#9e9482"/>
      ${[-44, -32, -20, -8, 4, 16, 28, 40].map(dx => `<rect x="${x + dx}" y="${y - 44}" width="6" height="6" fill="#cfc6b6"/>`).join('')}
      <rect x="${x - 58}" y="${y - 58}" width="20" height="58" fill="#c4baa8" stroke="#9e9482"/><rect x="${x + 38}" y="${y - 58}" width="20" height="58" fill="#c4baa8" stroke="#9e9482"/>
      <path d="M${x - 61} ${y - 58} L${x - 48} ${y - 78} L${x - 35} ${y - 58}Z M${x + 35} ${y - 58} L${x + 48} ${y - 78} L${x + 61} ${y - 58}Z" fill="#4f5f80"/>
      <path d="M${x - 48} ${y - 78} v-10 l9 3 -9 3" fill="#d9453a" stroke="#555" stroke-width="1"/>
      <path d="M${x - 10} ${y} V${y - 16} A10 10 0 0 1 ${x + 10} ${y - 16} V${y} Z" fill="#6b4a30"/>`;
  }
  return g + `<g ${won ? '' : 'filter="url(#mpGrey)"'}>${b}</g>`;
}

// ---------- the sky band and the horizon ----------
function skyBand(W, SKY, t, arch, r, season) {
  const [a, b] = PAL.sky[t.phase];
  let o = `<rect x="0" y="0" width="${W}" height="${SKY + 20}" fill="url(#mpSky)"/>`;
  if (t.phase === 'night') {
    for (let k = 0; k < 40; k++) o += `<circle cx="${f(r() * W)}" cy="${f(r() * SKY * .8)}" r="${f(.5 + r() * 1.1)}" fill="#fff" opacity="${f(.4 + r() * .6)}"/>`;
    o += `<circle cx="${f(W * .78)}" cy="38" r="14" fill="#fdf6d8"/><circle cx="${f(W * .78 + 6)}" cy="34" r="12" fill="${a}"/>`;
  } else {
    const sy = t.phase === 'day' ? 38 : SKY - 44, sc = t.phase === 'day' ? '#fff3a6' : '#ffb36b';
    o += `<circle cx="${f(W * .8)}" cy="${sy}" r="26" fill="${sc}" opacity=".35"/><circle cx="${f(W * .8)}" cy="${sy}" r="15" fill="${sc}"/>`;
    for (let k = 0; k < 3; k++) { const cx = r() * W, cy = 18 + r() * 40; o += `<g fill="#fff" opacity="${t.phase === 'day' ? .9 : .55}"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="22" ry="8"/><ellipse cx="${f(cx + 12)}" cy="${f(cy - 5)}" rx="13" ry="8"/><ellipse cx="${f(cx - 12)}" cy="${f(cy - 2)}" rx="10" ry="6"/></g>`; }
  }
  const snow = season === 'winter';
  if (arch === 'arab') {
    o += `<path d="M0 ${SKY - 22} Q${W * .2} ${SKY - 48} ${W * .45} ${SKY - 26} T${W} ${SKY - 34} V${SKY + 20} H0Z" fill="#e2bf82"/><path d="M0 ${SKY - 6} Q${W * .3} ${SKY - 30} ${W * .6} ${SKY - 10} T${W} ${SKY - 14} V${SKY + 20} H0Z" fill="#d6ab66"/>`;
  } else {
    const mc = arch === 'asia' ? '#7d8fb5' : '#8a9bb8';
    o += `<path d="M${W * .05} ${SKY} L${W * .3} ${SKY - 70} L${W * .55} ${SKY}Z" fill="${mc}"/><path d="M${W * .3 - 13} ${SKY - 53} L${W * .3} ${SKY - 70} L${W * .3 + 13} ${SKY - 53} L${W * .3 + 6} ${SKY - 50} L${W * .3} ${SKY - 55} L${W * .3 - 6} ${SKY - 50}Z" fill="#fff"/>
      <path d="M${W * .4} ${SKY} L${W * .66} ${SKY - 52} L${W * .92} ${SKY}Z" fill="${mc}" opacity=".85"/>${snow ? `<path d="M${W * .66 - 10} ${SKY - 40} L${W * .66} ${SKY - 52} L${W * .66 + 10} ${SKY - 40}Z" fill="#fff"/>` : ''}
      <path d="M0 ${SKY - 12} Q${W * .25} ${SKY - 38} ${W * .5} ${SKY - 16} T${W} ${SKY - 20} V${SKY + 20} H0Z" fill="${snow ? '#dfe9ef' : arch === 'asia' ? '#86b277' : '#7fb26a'}"/>`;
  }
  return o;
}

export function regionMap(o) {
  const { W, nodes, arch, app, season, phase } = o;
  const desert = o.biome === 'desert';
  const r = rng((o.seed || 1) * 9301 + 49297);
  const SKY = 150, GAP = 118, gateY = SKY + 54, y0 = SKY + 150;
  const P = nodes.map((n, i) => [Math.round(W * Math.min(.8, Math.max(.2, .5 + .28 * Math.sin(i * 1.25 + (o.seed || 1) * .7)))), y0 + i * GAP]);
  const templeY = (P.length ? P[P.length - 1][1] : y0) + 170, H = templeY + 70;
  const road = [[W / 2, gateY], ...P, [W / 2, templeY - 8]];
  const segs = segments(road);
  const curI = nodes.findIndex(n => n.state === 'cur'), doneTo = curI < 0 ? (nodes.every(n => n.state === 'done') ? road.length - 1 : 0) : curI + 1;
  // points along the road, to keep trees off it
  const samples = [];
  for (let i = 0; i < road.length - 1; i++) { const [a, b] = [road[i], road[i + 1]]; const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 9); for (let k = 0; k <= n; k++) samples.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  const riverLeft = (o.seed || 1) % 2 === 0, riverX = y => (riverLeft ? W * .075 : W * .925) + Math.sin(y / 70) * W * .025;
  // where friends, signposts and the chest stand (decided first so trees leave room for them)
  const side = i => (P[i][0] > W / 2 ? -1 : 1);
  const friendAt = [], spots = [];
  // friends wait along the whole road (one every few towns, taking turns), so there is always someone to review with
  const fl = o.friends || [];
  if (fl.length) for (let i = 1, k = 0; i < Math.max(2, P.length); i += 3, k++) {
    const ii = Math.min(P.length - 1, i), fr = fl[k % fl.length];
    if (!P[ii]) break;
    const y = P[ii][1] + GAP / 2, mx = (P[ii][0] + (P[ii + 1] || P[ii])[0]) / 2;
    const cand = [mx - 80, mx + 80, W * .2, W * .8].map(x => Math.min(W - 34, Math.max(34, x)));
    const far = x => Math.min(...P.map(([a, b]) => Math.hypot(a - x, b - y)), ...spots.map(([a, b]) => Math.hypot(a - x, b - y)), ...samples.map(([a, b]) => Math.hypot(a - x, b - y) + 22));
    const x = cand.sort((a, b) => far(b) - far(a))[0];
    friendAt.push({ ...fr, x, y, cid: `${fr.id}-${k}` }); spots.push([x, y, 34]);
  }
  const signAt = nodes.map((n, i) => i % 3 === 2 && P[i] ? { i, x: Math.min(W - 24, Math.max(24, P[i][0] + side(i) * 54)), y: P[i][1] - 6, lock: n.state === 'lock' } : null).filter(Boolean);
  signAt.forEach(s => spots.push([s.x, s.y, 26]));
  const chestAt = { x: Math.min(W - 28, Math.max(28, W / 2 + 62)), y: gateY + 34 };
  spots.push([chestAt.x, chestAt.y, 26]);
  const clear = (x, y, d) => samples.every(([a, b]) => Math.hypot(a - x, b - y) > d) && P.every(([a, b]) => Math.hypot(a - x, b - y) > 54)
    && spots.every(([a, b, rr]) => Math.hypot(a - x, b - y) > rr) && Math.abs(x - riverX(y)) > 24 && Math.hypot(W / 2 - x, gateY - y) > 48 && Math.hypot(W / 2 - x, templeY - 40 - y) > 90;

  let g = '';
  // ground
  const ground = desert ? PAL.sand[season] : PAL.ground[season];
  g += `<rect x="0" y="${SKY - 4}" width="${W}" height="${H - SKY + 4}" fill="${ground}"/>`;
  for (let k = 0; k < H / 60; k++) g += `<ellipse cx="${f(r() * W)}" cy="${f(SKY + r() * (H - SKY))}" rx="${f(30 + r() * 60)}" ry="${f(14 + r() * 26)}" fill="${desert ? '#d9b874' : season === 'winter' ? '#ffffff' : season === 'autumn' ? '#b9a85e' : '#86c266'}" opacity=".28"/>`;
  for (let k = 0; k < H / 5; k++) {
    const x = r() * W, y = SKY + 6 + r() * (H - SKY - 10);
    if (desert) g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.8 + r())}" fill="#c9a666" opacity=".6"/>`;
    else g += `<path d="M${f(x)} ${f(y)} l-2 -5 M${f(x)} ${f(y)} l0 -6 M${f(x)} ${f(y)} l2 -5" stroke="${season === 'winter' ? '#c3d3de' : season === 'autumn' ? '#9c8f4a' : '#5f9e48'}" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>`;
  }
  if (!desert && (season === 'spring' || season === 'summer')) for (let k = 0; k < H / 14; k++) g += `<circle cx="${f(r() * W)}" cy="${f(SKY + 8 + r() * (H - SKY - 12))}" r="1.7" fill="${pick(r, ['#fff', '#ffe066', '#ffb3d1', '#c9b6ff'])}"/>`;
  // river (an oasis canal in the desert)
  let rv = `M${f(riverX(SKY))} ${SKY}`;
  for (let y = SKY + 20; y <= H; y += 20) rv += ` L${f(riverX(y))} ${y}`;
  g += `<path d="${rv}" stroke="${season === 'winter' ? '#d8eef8' : '#cfeaf7'}" stroke-width="${desert ? 18 : 24}" fill="none" stroke-linecap="round"/><path d="${rv}" stroke="${season === 'winter' ? '#a9d6ec' : '#6cb8e2'}" stroke-width="${desert ? 11 : 16}" fill="none" stroke-linecap="round"/><path d="${rv}" stroke="#fff" stroke-width="1.4" fill="none" stroke-dasharray="6 26" opacity=".7"/>`;
  // the road, and the stretch already travelled
  const rc = desert ? ['#c7a46a', '#f0dcae'] : arch === 'asia' ? ['#b39b6e', '#e6d6b0'] : ['#a8977a', '#ddd1b6'];
  const rd = `M${road[0][0]} ${road[0][1]}${segs.join('')}`;
  g += `<path d="${rd}" stroke="${rc[0]}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="${rd}" stroke="${season === 'winter' ? '#f4f1ea' : rc[1]}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  if (doneTo > 0) g += `<path d="M${road[0][0]} ${road[0][1]}${segs.slice(0, doneTo).join('')}" stroke="#e8b84a" stroke-width="3.5" fill="none" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  // trees, drawn from the back (top) to the front
  const kinds = desert ? ['palm', 'palm', 'palm', 'shrub', 'shrub', 'rock'] : arch === 'asia' ? ['cherry', 'cherry', 'round', 'pine', 'pine', 'bamboo'] : ['round', 'round', 'round', 'pine', 'pine'];
  const trees = [];
  for (let tries = 0, want = Math.round(H / 10); tries < want * 5 && trees.length < want; tries++) {
    const x = 8 + r() * (W - 16), y = SKY + 14 + r() * (H - SKY - 20);
    if (clear(x, y, 32) && trees.every(t => Math.hypot(t[0] - x, t[1] - y) > 15)) trees.push([x, y, .8 + r() * .45, pick(r, kinds)]);
  }
  if (desert) for (let k = 0; k < 10; k++) { const y = SKY + 40 + r() * (H - SKY - 60), x = riverX(y) + (riverLeft ? 26 : -26); if (clear(x, y, 26)) trees.push([x, y, 1, 'palm']); }
  // lanterns along the road
  const lamps = [];
  for (let k = 10; k < samples.length; k += 15) { const [x, y] = samples[k], [x2, y2] = samples[Math.min(samples.length - 1, k + 1)], d = Math.hypot(x2 - x, y2 - y) || 1, nx = -(y2 - y) / d * 17, ny = (x2 - x) / d * 17; const lx = x + nx * (k % 2 ? 1 : -1), ly = y + ny * (k % 2 ? 1 : -1); if (P.every(([a, b]) => Math.hypot(a - lx, b - ly) > 30)) lamps.push([lx, ly]); }
  const things = trees.map(t => [t[1], tree(t[3], t[0], t[1], t[2], season, r)]);
  lamps.forEach(([x, y]) => things.push([y, `<path d="M${f(x)} ${f(y)} v-14" stroke="#5a4636" stroke-width="1.6"/>${arch === 'asia' ? `<ellipse cx="${f(x)}" cy="${f(y - 16)}" rx="3.6" ry="4.6" fill="#d9483a"/>` : `<rect x="${f(x - 2.6)}" y="${f(y - 20)}" width="5.2" height="6" rx="1" fill="#3d3a36"/>`}`]));
  const lights = [];
  // gate and towns
  things.push([gateY, gate(arch, W / 2, gateY)]);
  nodes.forEach((n, i) => {
    const [x, y] = P[i], l = [];
    let s = `<g class="mp-town ${n.state}" onclick="window.__mpNode('${escX(n.key)}')">`;
    if (n.state === 'cur') s += `<ellipse cx="${x}" cy="${y - 2}" rx="42" ry="13" fill="#fff6c4" class="mp-glow"/>`;
    s += `<ellipse cx="${x + 3}" cy="${y}" rx="24" ry="5" fill="rgba(0,0,0,.18)"/>`;
    s += `<g transform="translate(${x} ${y}) scale(1.3) translate(${-x} ${-y})" ${n.state === 'lock' ? 'filter="url(#mpGrey)"' : ''}>${house(arch, app, x, y, i, l)}</g>`;
    if (n.state === 'lock') s += `<ellipse cx="${x}" cy="${y - 18}" rx="30" ry="22" fill="#fff" opacity=".35"/>`;
    s += `<rect x="${x - 26}" y="${y - 50}" width="52" height="64" fill="transparent"/></g>`;
    if (n.state !== 'lock') lights.push(...l.map(([lx, ly, w, h]) => [x + (lx - x) * 1.3, y + (ly - y) * 1.3, w * 1.3, h * 1.3]));
    things.push([y, s]);
  });
  things.push([templeY, `<g class="mp-temple" onclick="window.__mpGym()">${temple(arch, W / 2, templeY, o.gym === 'won')}<rect x="${W / 2 - 60}" y="${templeY - 100}" width="120" height="104" fill="transparent"/></g>`]);
  // signposts and the chest
  signAt.forEach(s2 => things.push([s2.y, `<g class="mp-sign" onclick="window.__mpSign(${s2.i})" opacity="${s2.lock ? .5 : 1}"><path d="M${f(s2.x)} ${f(s2.y)} v-18" stroke="#7a5534" stroke-width="2.4"/><rect x="${f(s2.x - 14)}" y="${f(s2.y - 30)}" width="28" height="17" rx="3" fill="#c99b5c" stroke="#8a6a43"/><text x="${f(s2.x)}" y="${f(s2.y - 17.5)}" text-anchor="middle" font-size="11">${o.signIcon ? o.signIcon(s2.i) : s2.i % 6 === 5 ? '👤' : '📜'}</text><rect x="${f(s2.x - 18)}" y="${f(s2.y - 34)}" width="36" height="38" fill="transparent"/></g>`]));
  things.push([chestAt.y, `<g class="mp-chest ${o.chest ? 'ready' : ''}" onclick="window.__mpChest()"><ellipse cx="${chestAt.x + 2}" cy="${chestAt.y}" rx="14" ry="3.5" fill="rgba(0,0,0,.18)"/><rect x="${chestAt.x - 12}" y="${chestAt.y - 14}" width="24" height="14" rx="2" fill="${o.chest ? '#b5793a' : '#9d8f80'}"/><path d="M${chestAt.x - 12} ${chestAt.y - 14} Q${chestAt.x} ${chestAt.y - 25} ${chestAt.x + 12} ${chestAt.y - 14}Z" fill="${o.chest ? '#8c5524' : '#7f7366'}"/><rect x="${chestAt.x - 2.5}" y="${chestAt.y - 12}" width="5" height="6" fill="#f2c94c"/>${o.chest ? `<text x="${chestAt.x + 13}" y="${chestAt.y - 20}" font-size="12">✨</text>` : ''}<rect x="${chestAt.x - 18}" y="${chestAt.y - 30}" width="36" height="34" fill="transparent"/></g>`]);
  things.sort((a, b) => a[0] - b[0]);
  g += things.map(t => t[1]).join('');

  // time of day: tint everything, then switch on windows and lanterns
  const tint = { night: ['#0a1838', .45], dusk: ['#4a2f7a', .16], dawn: ['#ff9a5a', .08], day: null }[phase];
  if (tint) g += `<rect x="0" y="${SKY - 4}" width="${W}" height="${H - SKY + 4}" fill="${tint[0]}" opacity="${tint[1]}"/>`;
  if (phase === 'night' || phase === 'dusk') {
    lights.forEach(([x, y, w, h]) => { g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffd46b"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.max(w, h) + 6}" fill="url(#mpLamp)"/>`; });
    lamps.forEach(([x, y]) => { g += `<circle cx="${f(x)}" cy="${f(y - 16)}" r="16" fill="url(#mpLamp)"/><circle cx="${f(x)}" cy="${f(y - 16)}" r="2.6" fill="#fff1b8"/>`; });
  }
  // labels and markers on top, always readable
  nodes.forEach((n, i) => {
    const [x, y] = P[i];
    g += `<g class="mp-lbl" onclick="window.__mpNode('${escX(n.key)}')"><rect x="${x - 17}" y="${y + 6}" width="34" height="17" rx="8.5" fill="${n.state === 'done' ? '#e8b84a' : n.state === 'cur' ? '#3d7dff' : 'rgba(20,28,60,.72)'}" stroke="#fff" stroke-width="1.5"/>
      <text x="${x}" y="${y + 18.5}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">${n.state === 'lock' ? '🔒' : n.state === 'done' ? '★ ' + (i + 1) : i + 1}</text>${n.sub ? `<text x="${x}" y="${y + 36}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" stroke="rgba(20,28,60,.8)" stroke-width="3" paint-order="stroke">${escX(n.sub)}</text>` : ''}</g>`;
  });
  friendAt.forEach(fr => {
    g += `<g class="mp-friend" onclick="window.__mpFriend('${escX(fr.id)}')"><ellipse cx="${f(fr.x + 2)}" cy="${f(fr.y + 21)}" rx="16" ry="4" fill="rgba(0,0,0,.2)"/>
      <circle cx="${f(fr.x)}" cy="${f(fr.y)}" r="21" fill="${fr.color || '#9c7842'}" stroke="#fff" stroke-width="3"/>
      <text x="${f(fr.x)}" y="${f(fr.y + 6)}" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">${escX(String(fr.name || '?').slice(0, 1))}</text>
      ${fr.img ? `<image href="${escX(fr.img)}" x="${f(fr.x - 19)}" y="${f(fr.y - 19)}" width="38" height="38" clip-path="url(#mpC-${escX(fr.cid)})" preserveAspectRatio="xMidYMin slice"/>` : ''}
      <text x="${f(fr.x)}" y="${f(fr.y + 36)}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" stroke="rgba(20,28,60,.85)" stroke-width="3.5" paint-order="stroke">${escX(fr.name)}</text>
      <g class="mp-bub"><circle cx="${f(fr.x + 17)}" cy="${f(fr.y - 17)}" r="10" fill="${fr.due ? '#ff5a5a' : '#fff'}" stroke="#fff" stroke-width="2"/><text x="${f(fr.x + 17)}" y="${f(fr.y - 13.2)}" text-anchor="middle" font-size="${fr.due ? 10 : 10}" font-weight="800" fill="${fr.due ? '#fff' : '#333'}">${fr.due ? Math.min(99, fr.due) : '💬'}</text></g></g>`;
  });
  if (curI >= 0 && o.hero) {
    const [x, y] = P[curI];
    g += `<g class="mp-me" onclick="window.__mpNode('${escX(nodes[curI].key)}')"><path d="M${x - 7} ${y - 58} L${x} ${y - 47} L${x + 7} ${y - 58}Z" fill="#fff"/><circle cx="${x}" cy="${y - 76}" r="20" fill="#24407a" stroke="#fff" stroke-width="3"/>
      ${o.hero.img ? `<image href="${escX(o.hero.img)}" x="${x - 18}" y="${y - 94}" width="36" height="36" clip-path="url(#mpC-hero)" preserveAspectRatio="xMidYMin slice"/>` : ''}
      ${o.hero.hat ? `<text x="${x - 20}" y="${y - 88}" font-size="15">${o.hero.hat}</text>` : ''}${o.hero.pet ? `<text x="${x + 13}" y="${y - 56}" font-size="17">${o.hero.pet}</text>` : ''}</g>`;
  }
  const cp = (id, x, y, rr) => `<clipPath id="mpC-${escX(id)}"><circle cx="${f(x)}" cy="${f(y)}" r="${rr}"/></clipPath>`;
  const defs = `<defs><linearGradient id="mpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAL.sky[phase][0]}"/><stop offset="1" stop-color="${PAL.sky[phase][1]}"/></linearGradient>
    <radialGradient id="mpLamp"><stop offset="0" stop-color="#ffd46b" stop-opacity=".55"/><stop offset="1" stop-color="#ffd46b" stop-opacity="0"/></radialGradient>
    <radialGradient id="mpGold"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".8"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
    <filter id="mpGrey"><feColorMatrix type="saturate" values=".15"/></filter>
    ${friendAt.map(fr => cp(fr.cid, fr.x, fr.y, 18.5)).join('')}${curI >= 0 ? cp('hero', P[curI][0], P[curI][1] - 76, 17.5) : ''}</defs>`;
  const svg = `<svg class="mp-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">${defs}${skyBand(W, SKY, { phase }, arch, r, season)}${g}</svg>`;
  return { svg, H, curY: curI >= 0 ? P[curI][1] : (nodes.length ? P[P.length - 1][1] : 0) };
}
