// "Write a sentence with this word": on the back of a flashcard the learner writes their own sentence with the
// word and the AI tutor (Gemini) checks it: verdict, corrected sentence, why, and a more natural version.
import { S } from './state.js?v=202611281115';
import { CFG } from './app-config.js?v=202611281115';
import { levelLabel } from './levels.js?v=202611281115';
import { chatGemini, tutorKey, errText, thinkingHTML } from './tutor.js?v=202611281115';

const LANG = { espanol: ['es-ES', 'Spanish (from Spain)'], english: ['en-GB', 'British English'], francais: ['fr-FR', 'French'], deutsch: ['de-DE', 'German'],
  chino: ['zh-CN', 'Mandarin Chinese (simplified characters)'], nihongo: ['ja-JP', 'Japanese'], arabic: ['ar', 'Modern Standard Arabic'] }[CFG.id] || ['en', 'English'];
const UI_NAME = () => ({ es: 'Spanish', en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Simplified Chinese' }[S.lang] || 'English');
const L = o => (o && (o[S.lang] || (S.lang === 'es' ? o.es : o.en) || o.es)) || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TX = {
  btn: { es: 'Escribe una frase con esta palabra', en: 'Write a sentence with this word' },
  ph: { es: 'Tu frase con «{w}»…', en: 'Your sentence with “{w}”…' },
  check: { es: 'Corregir', en: 'Check' }, again: { es: 'Otra frase', en: 'Another sentence' },
  thinking: { es: 'Corrigiendo…', en: 'Checking…' },
  needKey: { es: 'Para que la IA corrija tus frases, activa el tutor IA (Gemini) en Ajustes.', en: 'To have the AI check your sentences, set up the AI tutor (Gemini) in Settings.' },
  settings: { es: 'Ir a Ajustes', en: 'Go to Settings' },
};
const tx = (k, w = '') => L(TX[k]).replace('{w}', w);
let cur = { word: '', meaning: '' };

// Button + (hidden) box, placed under the card. Call setWord() each time a card is shown.
export function writeSentenceBox(word, meaning) {
  cur = { word, meaning: meaning || '' };
  css();
  return `<div class="ws" id="ws" style="display:none">
    <button class="btn btn-soft btn-block" id="ws-open" onclick="window.__wsOpen()">✍️ ${tx('btn')}</button>
    <div id="ws-form" style="display:none">
      <textarea id="ws-in" rows="2" lang="${LANG[0]}" dir="auto" placeholder="${esc(tx('ph', word))}"></textarea>
      <div class="flex gap-8 mt-8" style="justify-content:flex-end"><button class="btn btn-primary" id="ws-go" onclick="window.__wsCheck()">${tx('check')}</button></div>
      <div id="ws-out"></div>
    </div>
  </div>`;
}
export const showWriteSentence = () => { const b = document.getElementById('ws'); if (b) b.style.display = 'block'; };

window.__wsOpen = () => {
  document.getElementById('ws-open').style.display = 'none';
  const f = document.getElementById('ws-form');
  f.style.display = 'block';
  if (!tutorKey()) {
    f.innerHTML = `<div class="ws-note">${tx('needKey')}</div><button class="btn btn-soft mt-8" onclick="window.__nav('settings')">${tx('settings')}</button>`;
    return;
  }
  const ta = document.getElementById('ws-in');
  ta.focus();
  ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.__wsCheck(); } });
};

window.__wsCheck = async () => {
  const ta = document.getElementById('ws-in'), out = document.getElementById('ws-out'), go = document.getElementById('ws-go');
  const v = ta && ta.value.trim();
  if (!v) return;
  go.disabled = true;
  out.innerHTML = `<div class="ws-res muted">${thinkingHTML()}</div>`;
  const ui = UI_NAME();
  const sys = `You are a friendly, precise teacher of ${LANG[1]}. The learner (level ${levelLabel(S.level)}) practises the word "${cur.word}"${cur.meaning ? ` (meaning: ${cur.meaning})` : ''} by writing their own sentence with it.
Check the sentence: grammar, spelling, word choice, and whether "${cur.word}" (or a correct form of it) is used with the right meaning and naturally.
Answer in ${ui}, plain text, no markdown, at most 5 short lines, in this format:
- Line 1: "✅ " + a short verdict if it is correct and natural; "✏️ " + a short verdict if it has small mistakes or sounds unnatural; "❌ " + a short verdict if it is wrong or does not use the word.
- If anything should change: a line "→ " followed by the corrected sentence in ${LANG[1]} (keep the learner's idea).
- One or two lines explaining the mistakes simply, in ${ui}.
- Optionally a line "💡 " + a more natural or richer alternative sentence in ${LANG[1]} that uses "${cur.word}", with its translation into ${ui} in parentheses.
If the learner did not write in ${LANG[1]}, say so kindly and give an example sentence with "${cur.word}".`;
  try {
    const ans = await chatGemini([{ role: 'user', parts: [{ text: v }] }], sys);
    const lines = ans.split('\n').map(x => x.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
    out.innerHTML = `<div class="ws-res">${lines.map((l, i) => {
      if (i === 0) return `<div class="ws-verdict">${esc(l)}</div>`;
      if (/^→/.test(l)) return `<div class="ws-fix" lang="${LANG[0]}" dir="auto">${esc(l)}</div>`;
      if (/^💡/.test(l)) return `<div class="ws-alt" dir="auto">${esc(l)}</div>`;
      return `<div class="ws-why">${esc(l)}</div>`;
    }).join('')}</div>
    <button class="btn btn-soft btn-small mt-8" onclick="window.__wsAgain()">${tx('again')}</button>`;
  } catch (e) {
    out.innerHTML = `<div class="ws-res" style="color:var(--no)">${esc(errText(e) || e.message)}</div>`;
  }
  go.disabled = false;
};
window.__wsAgain = () => { const ta = document.getElementById('ws-in'); ta.value = ''; document.getElementById('ws-out').innerHTML = ''; ta.focus(); };

function css() {
  if (document.getElementById('ws-css')) return;
  const s = document.createElement('style');
  s.id = 'ws-css';
  s.textContent = `.ws{margin-top:14px}.btn-block{width:100%}
.ws textarea{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--ink);resize:vertical}
.ws-res{margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--soft);line-height:1.5;font-size:15px}
.ws-verdict{font-weight:700;margin-bottom:4px}.ws-fix{font-weight:600;font-size:17px;margin:6px 0}.ws-why{color:var(--ink2);font-size:14px}
.ws-alt{margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}.ws-note{padding:10px 12px;border-radius:12px;background:var(--soft);font-size:14px}`;
  document.head.appendChild(s);
}
