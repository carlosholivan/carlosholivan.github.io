// Spanish text helpers. Same API as zh.js / ja.js / ar.js in the sibling apps, so the shared views work
// unchanged: Spanish needs no reading aid, so ruby() is plain escaped text and the pinyin helpers are no-ops.
import { S } from './state.js?v=202611141300';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// A "word character" of the target language (used to tokenise texts).
export const isHan = ch => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(ch);

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

// Meaning in the user's language with English fallback (Spanish is the target language, never a gloss).
export function mean(m, lang = S.lang) {
  if (!m) return '';
  if (typeof m === 'string') return m;
  return m[lang] || m.en || '';
}

// Lower case, no accents, no punctuation: for lenient answer comparison.
export function fold(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:«»"“”'’()\-–—…]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Same as fold but keeps accents and ñ (to tell "right but check the accents" from "right").
export function tidy(s) {
  return String(s ?? '').toLowerCase().normalize('NFC')
    .replace(/[¿?¡!.,;:«»"“”'’()\-–—…]/g, ' ').replace(/\s+/g, ' ').trim();
}
