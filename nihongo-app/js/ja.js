// Japanese helpers (same interface as zh.js in the Chinese app): furigana ruby, readings, answer comparison.
import { S } from './state.js?v=202611132100';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const isHan = ch => /[㐀-鿿豈-﫿々]/.test(ch);
export const hira = s => String(s ?? '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

// data/furi.json = { text: [[segment, reading|null], …] } for every word, text line and exercise sentence
// (built by tools/build_texts.py with MeCab/UniDic).
let FURI = null, KEYS = [];
export const pyReady = fetch('data/furi.json').then(r => r.json()).then(d => {
  FURI = d;
  KEYS = Object.keys(d).filter(k => [...k].length <= 8 && /[㐀-鿿]/.test(k));
}).catch(() => { FURI = {}; });
export const sylReady = Promise.resolve();

function segsOf(text) {
  if (!FURI) return [[text, null]];
  const hit = FURI[text] || FURI[text.trim()];
  if (hit) return hit;
  // Longest match against known words; kana and unknown kanji pass through.
  const out = [];
  const chars = [...text];
  let i = 0, plain = '';
  while (i < chars.length) {
    if (!isHan(chars[i])) { plain += chars[i++]; continue; }
    let n = Math.min(8, chars.length - i), seg = null;
    for (; n > 0; n--) { const w = chars.slice(i, i + n).join(''); if (FURI[w]) { seg = FURI[w]; break; } }
    if (plain) { out.push([plain, null]); plain = ''; }
    if (seg) { out.push(...seg); i += n; } else { out.push([chars[i], null]); i++; }
  }
  if (plain) out.push([plain, null]);
  return out;
}

export function rubySegs(segs) {
  return segs.map(([s, r]) => r ? `<ruby>${esc(s)}<rt>${esc(r)}</rt></ruby>` : esc(s).replace(/\n/g, '<br>')).join('');
}

// Ruby markup: furigana above kanji; visibility is controlled by body.nopy (the "furigana" toggle).
export function ruby(text, opts = {}) {
  const segs = opts.segs || segsOf(String(text ?? ''));
  return `<span class="zh jp${opts.cls ? ' ' + opts.cls : ''}">${rubySegs(segs)}</span>`;
}

// Reading of a text in hiragana.
export function pinyinText(text) {
  return hira(segsOf(String(text ?? '')).map(([s, r]) => r || s).join(''));
}

// Readings are plain kana (no tones).
export function tonedPinyin(p) { return `<span class="kana">${esc(p || '')}</span>`; }
export function toneOf() { return 5; }
export function splitPinyin(p) { return [String(p ?? '')]; }
export function syllables(text) { return [...String(text ?? '')].map(() => null); }
export const syllableList = () => [];
export const sylChar = () => null;

export function samePinyin(a, b) {
  const n = x => hira(String(x).replace(/[\s・。、.,!?！？ー]/g, ''));
  return n(a) === n(b);
}

export function applyPinyinPref() {
  document.body.classList.toggle('nopy', S.pinyin === false);
}

export function mean(m, lang = S.lang) {
  if (!m) return '';
  if (typeof m === 'string') return m;
  return m[lang] || m.es || m.en || '';
}
