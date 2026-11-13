// Per-character glosses for flashcards: each hanzi/kanji of a word gets its meaning in small type
// above it and links to its character sheet ('hanzi-detail').
import { S } from './state.js?v=202611140400';

const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isCJK = ch => /[㐀-鿿豈-﫿々]/.test(ch);

// First sense of a meaning object, short enough to sit above a character.
export function shortMean(m, lang = S.lang) {
  if (!m) return '';
  const s = typeof m === 'string' ? m : (m[lang] || m.es || m.en || '');
  // First sense; a sense that is only a note in brackets keeps the note's text ("(partícula posesiva)" → "partícula posesiva").
  const first = s.split(/[;；]/).map(x => x.trim()).find(Boolean) || '';
  const bare = first.replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, '').trim();
  const pick = bare || first.replace(/[()（）[\]]/g, '');
  return pick.split(/[,，/]/).map(x => x.trim()).filter(Boolean)[0] || '';
}

// Font size that keeps long words on one or two lines inside the card.
export function wordSize(word, base = 72) {
  const n = [...String(word)].length;
  if (n <= 1) return base + 12;
  if (n === 2) return base;
  if (n === 3) return Math.round(base * 0.86);
  if (n === 4) return Math.round(base * 0.74);
  if (n <= 6) return Math.round(base * 0.6);
  return Math.round(base * 0.48);
}

// Arabic: the word is shown whole (letters join, so no per-letter glosses), with its transliteration
// under it and, when known, its root as small chips that open the root sheet.
import { ruby } from './ar.js?v=202611140400';
export function charWord(word, hm, { size } = {}) {
  const px = size || 64;
  return `<div class="cg-word ar-card" style="--wsize:${px}px;font-size:${px}px">${ruby(word, { noTr: true })}</div>`;
}

export const hasChars = (word) => /[\u0600-\u06FF]/.test(String(word));
