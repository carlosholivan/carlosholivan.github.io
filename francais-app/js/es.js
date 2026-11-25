// French text helpers (file name kept from the Spanish app). Same API as zh.js / ja.js / ar.js in the sibling
// apps, so the shared views work unchanged: French needs no reading aid, so ruby() is plain escaped text and the pinyin helpers are no-ops.
import { S } from './state.js?v=202611261000';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// A "word character" of the target language (used to tokenise texts).
export const isHan = ch => /[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]/.test(ch);

export const pyReady = Promise.resolve();
export const sylReady = Promise.resolve();
export const syllables = text => [...String(text ?? '')].map(() => null);
export const toneOf = () => 5;
export const splitPinyin = p => (p ? [String(p)] : []);
export const syllableList = () => [];
export const sylChar = () => null;
export const tonedPinyin = () => '';
export const pinyinText = text => String(text ?? '');
export const samePinyin = (a, b) => fold(a) === fold(b);

export function ruby(text, opts = {}) {
  const html = esc(text).replace(/\n/g, '<br>');
  return `<span class="es${opts.cls ? ' ' + opts.cls : ''}">${html}</span>`;
}

export function applyPinyinPref() {
  document.body.classList.add('nopy');
}

// Meaning in the user's language with Spanish fallback (French is the target language, never a gloss).
export function mean(m, lang = S.lang) {
  if (!m) return '';
  if (typeof m === 'string') return m;
  return m[lang] || m.es || '';
}

// Lower case, no accents, no punctuation: for lenient answer comparison (œ = oe, typographic apostrophes and spaces unified).
export function fold(s) {
  return String(s ?? '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'")
    .replace(/[?!.,;:«»"“”'()\-–—…\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Same as fold but keeps the spelling (to tell "right but check the spelling" from "right").
export function tidy(s) {
  return String(s ?? '').toLowerCase().normalize('NFC').replace(/[’‘]/g, "'")
    .replace(/[?!.,;:«»"“”()\-–—…\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
}
