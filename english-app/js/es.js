// English text helpers (file name kept from the Spanish app). Same API as zh.js / ja.js / ar.js in the sibling
// apps, so the shared views work unchanged: English needs no reading aid, so ruby() is plain escaped text and the pinyin helpers are no-ops.
import { S } from './state.js?v=202611282108';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// A "word character" of the target language (used to tokenise texts).
export const isHan = ch => /[A-Za-z]/.test(ch);

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

// Meaning in the user's language with Spanish fallback (English is the target language, never a gloss).
export function mean(m, lang = S.lang) {
  if (!m) return '';
  if (typeof m === 'string') return m;
  return m[lang] || m.es || '';
}

// Lower case, no accents, no punctuation: for lenient answer comparison.
export function fold(s) {
  return spelling(contractions(String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'")))
    .replace(/[?!.,;:«»"“”'()\-–—…]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Contractions count as the full form (I'm = I am, don't = do not), British/American spellings as the same word.
function contractions(s) {
  return s.replace(/\bcan't\b/g, 'cannot').replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not').replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will').replace(/'d\b/g, ' would')
    .replace(/\bcannot\b/g, 'can not');
}
function spelling(s) {
  return s.replace(/\b(\w+?)our(s|ed|ing|ite|ites|able|ful|less)?\b/g, (m, a, e) => /^(y|f|h|t|p|s|fl|sc|dev|cont|det|gl|am|vel|ar|hon)$/.test(a) && a !== 'hon' ? m : a + 'or' + (e || ''))
    .replace(/\b(\w+)ise(d|s)?\b/g, (m, a, e) => /^(r|w|prem|pr|exerc|adv|surpr|comprom|dev|desp|disgu|exc|enterpr|franch|merchand|rev|superv|telev|tw|appr|compr)$/.test(a) ? m : a + 'ize' + (e || ''));
}
// Same as fold but keeps the spelling (to tell "right but check the spelling" from "right").
export function tidy(s) {
  return contractions(String(s ?? '').toLowerCase().normalize('NFC').replace(/[’‘]/g, "'"))
    .replace(/[?!.,;:«»"“”()\-–—…]/g, ' ').replace(/\s+/g, ' ').trim();
}
