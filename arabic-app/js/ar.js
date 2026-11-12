// Arabic text helpers: vocalisation (harakat) toggle, Latin transliteration generated from fully vowelled text,
// and the same API the shared views use in the Chinese/Japanese apps (ruby, tonedPinyin, pinyinText…).
import { S } from './state.js?v=202611131200';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const mean = (m, lang) => (m || {})[lang] || (m || {}).es || (m || {}).en || '';

const HARAKAT = /[ً-ْٰـ]/g;   // tanwin, short vowels, shadda, sukun, dagger alif, tatweel
export const strip = s => String(s || '').replace(HARAKAT, '');
// Normalised key for matching (no vowels, unified alif/hamza seats, ى→ي)
export const norm = s => strip(s).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
export const isHan = ch => /[؀-ۿ]/.test(ch);
export const isArabic = isHan;

// ── transliteration ────────────────────────────────────────────────
const CONS = {
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ', 'ة': 't',
};
const SUN = new Set('تثدذرزسشصضطظلن');
const FATHA = 'َ', DAMMA = 'ُ', KASRA = 'ِ', SUKUN = 'ْ', SHADDA = 'ّ';
const TAN = { 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in' };
const V = { [FATHA]: 'a', [DAMMA]: 'u', [KASRA]: 'i' };

function trWord(w) {
  // split into letters with their marks
  const L = [];
  for (const ch of w) {
    if (/[ً-ْٰ]/.test(ch) && L.length) L[L.length - 1].m += ch;
    else if (ch !== 'ـ') L.push({ c: ch, m: '' });
  }
  let out = '';
  let i = 0;
  // proclitic + article: al-kitāb, wa-l-kitāb, bi-sh-shams, li-l-bayt
  const clit = { 'و': 'wa', 'ف': 'fa', 'ب': 'bi', 'ل': 'li', 'ك': 'ka' };
  const isArt = k => L[k] && (L[k].c === 'ا' || L[k].c === 'ٱ') && !/[\u064E-\u0650]/.test(L[k].m) && L[k + 1] && L[k + 1].c === 'ل';
  let prefix = '', lam = -1;
  if (L.length > 3 && clit[L[0].c] && /[\u064E\u0650]/.test(L[0].m) && isArt(1)) { prefix = clit[L[0].c] + '-'; lam = 2; }
  else if (L.length > 3 && L[0].c === 'ل' && L[0].m.includes(KASRA) && L[1].c === 'ل' && !/[\u064E-\u0650]/.test(L[1].m)) { prefix = 'li-'; lam = 1; }
  else if (L.length > 2 && isArt(0)) lam = 1;
  if (lam >= 0) {
    const nx = L[lam + 1];
    let art = 'l';
    if (nx && SUN.has(nx.c) && nx.m.includes(SHADDA)) { art = CONS[nx.c]; nx.m = nx.m.replace(SHADDA, ''); }
    out = (prefix || 'a') + art + '-';
    i = lam + 1;
  }
  for (; i < L.length; i++) {
    const { c, m } = L[i];
    const prev = L[i - 1], next = L[i + 1];
    const vowel = Object.keys(V).find(k => m.includes(k));
    const tan = Object.keys(TAN).find(k => m.includes(k));
    // long vowels
    if (c === 'ا' || c === 'ى') {
      if (prev && prev.m.match(/[ً]/)) continue;             // tanwin alif (kitāban)
      if (i === 0) { out += vowel ? V[vowel] : 'a'; continue; }    // hamzat al-wasl at word start
      if (out.endsWith('a')) { out = out.slice(0, -1) + 'ā'; continue; }
      out += 'ā'; continue;
    }
    if (c === 'آ') { out += 'ʾā'; continue; }
    if (c === 'ٰ') { out += 'ā'; continue; }
    if (m.includes('ٰ')) { const k = CONS[c] || ''; out += (m.includes(SHADDA) ? k + k : k) + 'ā'; continue; }
    if ((c === 'و' && out.endsWith('u') && !vowel && !m.includes(SHADDA)) ) { out = out.slice(0, -1) + 'ū'; continue; }
    if ((c === 'ي' && out.endsWith('i') && !vowel && !m.includes(SHADDA))) { out = out.slice(0, -1) + 'ī'; continue; }
    if (c === 'ة') {
      if (vowel) out += 't' + V[vowel];
      else if (tan) out += 't' + TAN[tan];
      else if (!out.endsWith('a')) out += 'a';
      continue;
    }
    let cons = CONS[c];
    if (cons === undefined) { out += c; continue; }
    if (i === 0 && (c === 'أ' || c === 'إ')) cons = '';                  // initial hamza not written: ʾ omitted at start
    if (m.includes(SHADDA)) cons = cons + cons;
    out += cons;
    if (c === 'إ' && !vowel) out += 'i';
    else if (vowel) out += V[vowel];
    else if (tan) out += TAN[tan];
  }
  return out;
}

export function translit(text) {
  return String(text || '').split(/(\s+|[.,:;!?؟،؛«»"()\-—]+)/).map(t => /[؀-ۿ]/.test(t) ? trWord(t) : t)
    .join('').replace(/؟/g, '?').replace(/،/g, ',').replace(/؛/g, ';');
}

// ── rendering ──────────────────────────────────────────────────────
const showH = () => S.harakat !== false;
const showT = () => S.pinyin !== false;            // the shared "show reading" preference = transliteration
export const shown = s => showH() ? s : strip(s);

// ruby(text): Arabic (right to left) with the transliteration under it when enabled.
export function ruby(text, opts = {}) {
  const t = String(text || '');
  if (!/[؀-ۿ]/.test(t)) return esc(t);
  const tr = opts.noTr ? '' : `<span class="tr">${esc(translit(t))}</span>`;
  return `<span class="arw${opts.big ? ' big' : ''}"><span class="ar" dir="rtl" lang="ar">${esc(shown(t))}</span>${tr}</span>`;
}
export const rubySegs = segs => ruby((segs || []).map(s => s[0]).join(''));
// tonedPinyin(p): transliteration chip (p is already Latin, or Arabic to transliterate).
export function tonedPinyin(p, opts = {}) {
  const s = /[؀-ۿ]/.test(p || '') ? translit(p) : (p || '');
  return `<span class="tr-chip"${opts.play ? ` onclick="event.stopPropagation();window.__say && window.__say('${esc(p)}')"` : ''}>${esc(s)}</span>`;
}
export const pinyinText = p => /[؀-ۿ]/.test(p || '') ? translit(p) : (p || '');
export const hira = s => norm(s);           // normalisation for typed answers
export const pyReady = Promise.resolve();
export const sylReady = Promise.resolve();
export const toneOf = () => 0;
export const splitPinyin = p => String(p || '').split(/\s+/);
export const syllables = () => [];
export const sylChar = () => null;
export const samePinyin = (a, b) => norm(a) === norm(b);
export function applyPinyinPref() {
  document.body.classList.toggle('nopy', !showT());
  document.body.classList.toggle('noharakat', !showH());
}
