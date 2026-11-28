// Hand-drawn style icons for the gems and each language's lives (onigiri, dumplings, falafel, paella, tea, croissant,
// pretzel), in the app's candy look, so they match on every phone instead of depending on the system's emoji.
const D = {
  gem: `<defs><linearGradient id="igG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ee7ff"/><stop offset=".55" stop-color="#5b7cff"/><stop offset="1" stop-color="#b388ff"/></linearGradient></defs>
    <path d="M9 5h14l6 8-13 15L3 13z" fill="url(#igG)" stroke="#3a4fc4" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M3 13h26M9 5l4 8 3-8 3 8 4-8M13 13l3 15 3-15" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M10 7l-2.5 4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>`,
  onigiri: `<path d="M16 3c3 0 13 15 13 20s-4 6-13 6S3 28 3 23 13 3 16 3z" fill="#fff" stroke="#cfc6b6" stroke-width="1.4"/>
    <path d="M9 20h14v9c-2 .3-4.5.5-7 .5s-5-.2-7-.5z" fill="#26352c"/><path d="M11 22h3" stroke="#4d6656" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="13" cy="11" r=".9" fill="#d8cfbf"/><circle cx="18" cy="14" r=".9" fill="#d8cfbf"/><circle cx="15" cy="16" r=".8" fill="#d8cfbf"/>`,
  jiaozi: `<path d="M3 20c0-8 6-13 13-13s13 5 13 13c0 2-2 3-4 3H7c-2 0-4-1-4-3z" fill="#f6e7c8" stroke="#cfae78" stroke-width="1.4"/>
    <path d="M8 10c1 3 1 5 0 7M12 8c1 3 1 6 0 9M16 7v10M20 8c-1 3-1 6 0 9M24 10c-1 3-1 5 0 7" fill="none" stroke="#d6b886" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="16" cy="25" rx="11" ry="2.4" fill="#000" opacity=".12"/>`,
  falafel: `<circle cx="11" cy="19" r="7" fill="#a8642c" stroke="#7a4219" stroke-width="1.2"/><circle cx="21" cy="19" r="7" fill="#b8722f" stroke="#7a4219" stroke-width="1.2"/>
    <circle cx="16" cy="11" r="7" fill="#c27c35" stroke="#7a4219" stroke-width="1.2"/>
    <g fill="#6fae4e"><circle cx="14" cy="9" r="1"/><circle cx="18" cy="12" r=".9"/><circle cx="9" cy="18" r=".9"/><circle cx="22" cy="17" r="1"/><circle cx="12" cy="21" r=".8"/></g>
    <g fill="#f3d39b"><circle cx="15" cy="13" r=".7"/><circle cx="20" cy="21" r=".7"/><circle cx="10" cy="20" r=".7"/></g>`,
  paella: `<ellipse cx="16" cy="18" rx="14" ry="8.5" fill="#3c3c44"/><path d="M1 16h3M28 16h3" stroke="#3c3c44" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="16" cy="17" rx="12" ry="6.8" fill="#f3b72b"/><g fill="#f7d35c"><circle cx="10" cy="16" r="1"/><circle cx="20" cy="15" r="1"/><circle cx="15" cy="20" r="1"/></g>
    <path d="M8 15c2-2 5-1 5 1M19 19c2-2 5-1 5 1" fill="none" stroke="#ff7a59" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 13l4 1M11 20l3-1" stroke="#d83b3b" stroke-width="1.6" stroke-linecap="round"/><path d="M22 12a3 3 0 0 1 4 3h-4z" fill="#fff2a1" stroke="#e0c64a" stroke-width=".8"/>
    <circle cx="17" cy="17" r="1.1" fill="#5aa04a"/>`,
  tea: `<path d="M6 13h18v6a9 9 0 0 1-18 0z" fill="#4c8dff" stroke="#2c5fc4" stroke-width="1.4"/><path d="M24 15c4 0 4 6 0 6" fill="none" stroke="#2c5fc4" stroke-width="2"/>
    <path d="M6 15c-3-1-4-4-3-6 2 1 3 2 3 4" fill="#4c8dff" stroke="#2c5fc4" stroke-width="1.2"/><path d="M9 13c0-3 3-4 6-4s6 1 6 4" fill="#6aa3ff" stroke="#2c5fc4" stroke-width="1.2"/>
    <circle cx="15" cy="8" r="1.6" fill="#ffd36b"/><path d="M10 19c2 1 6 1 9 0" stroke="#fff" stroke-opacity=".7" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M27 6c-1 2 1 3 0 5M23 4c-1 2 1 3 0 5" stroke="#b9c7e6" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  croissant: `<path d="M3 20c2-8 8-12 13-12s11 4 13 12c-2 2-5 1-6-1-1 3-4 4-7 4s-6-1-7-4c-1 2-4 3-6 1z" fill="#e8a33d" stroke="#a8641c" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M10 11c2 3 2 7 0 11M16 8v14M22 11c-2 3-2 7 0 11" fill="none" stroke="#b8732a" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M12 10c2-1 4-1 6 0" stroke="#ffd88e" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  pretzel: `<path d="M16 25c-5-3-12-8-12-14a6 6 0 0 1 11-3l1 2 1-2a6 6 0 0 1 11 3c0 6-7 11-12 14z" fill="none" stroke="#9a5420" stroke-width="4" stroke-linejoin="round"/>
    <path d="M10 22l12-11M22 22L10 11" stroke="#9a5420" stroke-width="4" stroke-linecap="round"/>
    <path d="M16 25c-5-3-12-8-12-14a6 6 0 0 1 11-3" fill="none" stroke="#c47a35" stroke-width="1.6"/>
    <g fill="#fff"><rect x="8" y="9" width="1.6" height="1.2" rx=".3"/><rect x="21" y="8" width="1.6" height="1.2" rx=".3"/><rect x="15" y="17" width="1.6" height="1.2" rx=".3"/><rect x="11" y="19" width="1.4" height="1.1" rx=".3"/><rect x="23" y="15" width="1.4" height="1.1" rx=".3"/></g>`,
  heart: `<path d="M16 28S3 20 3 11a6.5 6.5 0 0 1 13-2 6.5 6.5 0 0 1 13 2c0 9-13 17-13 17z" fill="#ff5c8a" stroke="#c23a63" stroke-width="1.3"/>`,
};
const LIFE = { nihongo: 'onigiri', chino: 'jiaozi', arabe: 'falafel', arabic: 'falafel', espanol: 'paella', english: 'tea', francais: 'croissant', deutsch: 'pretzel' };
let n = 0;
// an inline SVG; each call gets its own gradient id so several gems on a page do not clash
export function icon(name, size = 18, off = false) {
  const id = 'ig' + (++n);
  const body = (D[name] || D.heart).replace(/igG/g, id);
  const va = typeof size === 'number' ? `${Math.round(size * .18)}px` : '.2em';
  return `<svg class="ic${off ? ' ic-off' : ''}" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" style="vertical-align:-${va};${off ? 'filter:grayscale(1);opacity:.35' : ''}">${body}</svg>`;
}
export const lifeIcon = (app, size, off) => icon(LIFE[app] || 'heart', size, off);
export const gemIcon = size => icon('gem', size);

// Swap the gem and food emoji for these icons anywhere on the page, as soon as they appear (text written by any
// screen, sheet or floating "+3 💎"), so no screen has to change how it writes them.
const EMOJI = { '💎': 'gem', '🍙': 'onigiri', '🥟': 'jiaozi', '🧆': 'falafel', '🥘': 'paella', '🫖': 'tea', '🥐': 'croissant', '🥨': 'pretzel' };
const RX = new RegExp(`(${Object.keys(EMOJI).join('|')})`, 'u');
const RXG = new RegExp(`(${Object.keys(EMOJI).join('|')})`, 'gu');
function swap(node) {
  const p = node.parentNode;
  if (!p || /^(SCRIPT|STYLE|TEXTAREA|TITLE|OPTION)$/.test(p.nodeName) || p.closest && p.closest('svg,input,[contenteditable]')) return;
  const parts = node.nodeValue.split(RXG);
  if (parts.length < 2) return;
  const frag = document.createDocumentFragment();
  for (const s of parts) {
    if (EMOJI[s]) { const sp = document.createElement('span'); sp.className = 'ic-wrap'; sp.innerHTML = icon(EMOJI[s], '1.2em').replace(/vertical-align:-[\d.]+px;/, 'vertical-align:-.22em;'); frag.appendChild(sp); }
    else if (s) frag.appendChild(document.createTextNode(s));
  }
  p.replaceChild(frag, node);
}
function scan(root) {
  if (root.nodeType === 3) { if (RX.test(root.nodeValue)) swap(root); return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
  while (w.nextNode()) if (RX.test(w.currentNode.nodeValue)) list.push(w.currentNode);
  list.forEach(swap);
}
let on = false;
export function autoIcons() {
  if (on || typeof MutationObserver === 'undefined') return; on = true;
  const go = () => { scan(document.body); new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') scan(m.target); else m.addedNodes.forEach(scan); } })
    .observe(document.body, { childList: true, subtree: true, characterData: true }); };
  document.body ? go() : addEventListener('DOMContentLoaded', go);
}
