// Chinese helpers: pinyin lookup, ruby rendering with tone colours, pinyin answer comparison.
import { S } from './state.js?v=202611141100';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const isHan = ch => /[\u3400-\u9fff\uf900-\ufaff]/.test(ch);

// data/py.json = { s: {sentence: "syl syl …"}, w: {word: "syl syl"}, c: {char: "syl"} }
// built by tools/build_data.py with pypinyin + the HSK lists (context-aware readings and tone sandhi).
let PY = null;
export const pyReady = fetch('data/py.json').then(r => r.json()).then(d => { PY = d; }).catch(() => { PY = { s: {}, w: {}, c: {} }; });

const MAXW = 6;
// Returns an array with one syllable (or null) per character of text.
export function syllables(text) {
  text = String(text ?? '');
  const chars = [...text];
  const out = new Array(chars.length).fill(null);
  if (!PY) return out;
  const whole = PY.s[text.trim()];
  if (whole) {
    const syl = whole.split(' ');
    let k = 0;
    chars.forEach((ch, i) => { if (isHan(ch)) out[i] = syl[k++] || null; });
    sandhi(chars, out);
    return out;
  }
  // Greedy longest-match segmentation against the word list, char readings as fallback.
  let i = 0;
  while (i < chars.length) {
    if (!isHan(chars[i])) { i++; continue; }
    let hit = 0;
    for (let n = Math.min(MAXW, chars.length - i); n > 1; n--) {
      const w = chars.slice(i, i + n).join('');
      if (PY.w[w]) { PY.w[w].split(' ').forEach((s, k) => { out[i + k] = s; }); hit = n; break; }
    }
    if (!hit) { out[i] = PY.w[chars[i]] || PY.c[chars[i]] || null; hit = 1; }
    i += hit;
  }
  sandhi(chars, out);
  return out;
}

// 一 and 不 change tone before other syllables (yī → yí/yì, bù → bú).
function sandhi(chars, out) {
  const tone = s => { const m = toneOf(s); return m; };
  for (let i = 0; i < chars.length - 1; i++) {
    const next = out[i + 1];
    if (!next || !isHan(chars[i + 1])) continue;
    if (chars[i] === '不' && out[i] === 'bù' && tone(next) === 4) out[i] = 'bú';
    if (chars[i] === '一' && out[i] === 'yī') {
      const prevNum = i > 0 && /[一二三四五六七八九十第]/.test(chars[i - 1]);
      if (!prevNum && !/[二三四五六七八九十]/.test(chars[i + 1])) out[i] = tone(next) === 4 || tone(next) === 5 ? 'yí' : 'yì';
    }
  }
}

const TONE_MARKS = { 'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4, 'ē': 1, 'é': 2, 'ě': 3, 'è': 4, 'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4, 'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4, 'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4, 'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4, 'ń': 2, 'ň': 3, 'ǹ': 4, 'ḿ': 2 };
export function toneOf(syl) {
  for (const ch of String(syl || '')) if (TONE_MARKS[ch]) return TONE_MARKS[ch];
  return 5;
}

// Splits a pinyin word ("péngyou") into syllables for tone colouring.
export function splitPinyin(p) {
  return String(p).match(/[^aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s'’-]*[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:ng|n(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]))?|[^\s'’-]+/gi) || [p];
}

// Syllable table (data/syllables.json): toned syllable → a character read with exactly that sound.
let SYL = null;
export const sylReady = fetch('data/syllables.json').then(r => r.json()).then(list => {
  SYL = { list, char: {} };
  for (const s of list) for (const f of Object.values(s.t)) SYL.char[f.py] = f.c;
}).catch(() => { SYL = { list: [], char: {} }; });
export const syllableList = () => (SYL ? SYL.list : []);
export const sylChar = (py) => SYL && SYL.char[String(py).toLowerCase().replace(/[^a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, '')];

// With {play: true} each syllable is clickable and plays that syllable in its tone.
export function tonedPinyin(p, opts = {}) {
  return String(p ?? '').split(/(\s+)/).map(word => /^\s*$/.test(word) ? word : splitPinyin(word).map(s => {
    const c = opts.play && toneOf(s) < 5 && sylChar(s);
    return c ? `<span class="t${toneOf(s)} syl-play" onclick="event.stopPropagation();window.__sylPlay('${c}')">${esc(s)}</span>`
      : `<span class="t${toneOf(s)}">${esc(s)}</span>`;
  }).join('')).join('');
}

// Ruby markup: pinyin above every character; pinyin visibility is controlled by body.nopy.
export function ruby(text, opts = {}) {
  const chars = [...String(text ?? '')];
  const syl = opts.py ? alignGiven(chars, opts.py) : syllables(text);
  let html = '';
  chars.forEach((ch, i) => {
    if (isHan(ch) && syl[i]) html += `<ruby class="t${toneOf(syl[i])}">${esc(ch)}<rt>${esc(syl[i])}</rt></ruby>`;
    else html += ch === '\n' ? '<br>' : esc(ch);
  });
  return `<span class="zh${opts.cls ? ' ' + opts.cls : ''}">${html}</span>`;
}

function alignGiven(chars, py) {
  const syl = Array.isArray(py) ? py : splitPinyin(py);
  let k = 0;
  return chars.map(ch => (isHan(ch) ? syl[k++] || null : null));
}

export function pinyinText(text) {
  return syllables(text).filter(Boolean).join(' ');
}

// Pinyin answer comparison: accepts tone marks or tone numbers (ni3 hao3), ignores spaces/case/apostrophes.
// Compares the letters and the sequence of non-neutral tones.
const BASE = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v', 'ń': 'n', 'ň': 'n', 'ǹ': 'n', 'ḿ': 'm' };
function canon(x) {
  const s = String(x).toLowerCase().normalize('NFC').replace(/u:/g, 'v');
  let letters = '', tones = '';
  for (const ch of s) {
    if (BASE[ch]) { letters += BASE[ch]; const t = TONE_MARKS[ch]; if (t) tones += t; }
    else if (/[1-4]/.test(ch)) tones += ch;
    else if (/[a-z]/.test(ch)) letters += ch;
  }
  return { letters, tones };
}
export function samePinyin(a, b, { tones = true } = {}) {
  const A = canon(a), B = canon(b);
  return A.letters === B.letters && (!tones || A.tones === B.tones);
}

export function applyPinyinPref() {
  document.body.classList.toggle('nopy', S.pinyin === false);
  document.body.classList.toggle('notone', S.toneColors === false);
}

// Meaning in the user's language with English fallback.
export function mean(m, lang = S.lang) {
  if (!m) return '';
  if (typeof m === 'string') return m;
  return m[lang] || m.en || m.es || '';
}
