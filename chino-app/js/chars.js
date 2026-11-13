// Per-character glosses for flashcards: each hanzi/kanji of a word gets its meaning in small type
// above it and links to its character sheet ('hanzi-detail').
import { S } from './state.js?v=202611141900';

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

// hm: Map char → {c, m, ...}. back: view to return to from the sheet.
export function charWord(word, hm, { back = 'review', size } = {}) {
  const px = size || wordSize(word);
  const chars = [...String(word)];
  const cells = chars.map(ch => {
    const h = isCJK(ch) && hm ? hm.get(ch) : null;
    if (!h) return `<span class="cg kana"><span class="cg-m none">·</span><span class="cg-c">${escH(ch)}</span></span>`;
    return `<a class="cg" onclick="event.stopPropagation();window.__charSheet('${escH(ch)}')">
      <span class="cg-m">${escH(shortMean(h.m))}</span><span class="cg-c">${escH(ch)}</span></a>`;
  }).join('');
  return `<div class="cg-word" style="--wsize:${px}px">${cells}</div>`;
}

export const hasChars = (word, hm) => [...String(word)].some(ch => isCJK(ch) && hm && hm.has(ch));
