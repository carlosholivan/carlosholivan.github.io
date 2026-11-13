import { S } from '../state.js?v=202611140130';
import { splitPinyin, toneOf, pinyinText } from '../zh.js?v=202611140130';

export function tr(obj, lang = S.lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.es || '';
}

// The unit's new words as { word, p, m } (newVocab holds hanzi strings from the level list).
export function unitVocab(unit, levelVocab = []) {
  const byWord = new Map(levelVocab.map(v => [v.word, v]));
  const list = (unit.newVocab && unit.newVocab.length ? unit.newVocab : (unit.vocab || []).slice(0, 12))
    .map(w => byWord.get(typeof w === 'string' ? w : w.word)).filter(Boolean);
  return list.map(v => ({ word: v.word, p: v.p, m: v.m }));
}

export function generateExercises(unit, words = [], pool = []) {
  const lang = S.lang;
  const authored = (unit.exercises || []).map(ex => buildExercise(ex, lang));
  const generated = vocabExercises(words, pool, lang);
  // Progression: recognise words and tones → grammar practice → produce words.
  const half = Math.ceil(authored.length / 2);
  return [...generated.intro, ...authored.slice(0, half), ...generated.middle, ...authored.slice(half), ...generated.production];
}

// ── Tones ───────────────────────────────────────────────────────
const MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
function bare(s) {
  return s.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').normalize('NFC');
}
// Puts tone n (1–4, 5 = neutral) on a toneless syllable following the standard placement rules.
export function withTone(syl, n) {
  const b = bare(syl);
  if (n === 5) return b;
  const lower = b.toLowerCase();
  let idx = lower.search(/[ae]/);
  if (idx < 0) idx = lower.indexOf('ou');
  if (idx < 0) { for (let i = lower.length - 1; i >= 0; i--) if ('iouü'.includes(lower[i])) { idx = i; break; } }
  if (idx < 0) return b;
  const v = lower[idx];
  return b.slice(0, idx) + MARKS[v][n - 1] + b.slice(idx + 1);
}
// Plausible wrong pinyin: same syllables, one or two tones changed.
export function toneVariants(p, n = 3) {
  const syl = splitPinyin(p);
  const out = new Set();
  let guard = 0;
  while (out.size < n && guard++ < 60) {
    const s = [...syl];
    const k = Math.floor(Math.random() * s.length);
    const cur = toneOf(s[k]);
    const choices = [1, 2, 3, 4].filter(t => t !== cur);
    s[k] = withTone(s[k], choices[Math.floor(Math.random() * choices.length)]);
    if (s.length > 1 && Math.random() < 0.3) {
      const j = (k + 1) % s.length; const cj = toneOf(s[j]);
      const ch = [1, 2, 3, 4].filter(t => t !== cj); s[j] = withTone(s[j], ch[Math.floor(Math.random() * ch.length)]);
    }
    const v = s.join(' ');
    if (v !== syl.join(' ')) out.add(v);
  }
  return [...out];
}

function vocabExercises(words, pool, lang) {
  const out = { intro: [], middle: [], production: [] };
  const items = words.filter(w => w.word && tr(w.m, lang));
  if (items.length < 2) return out;
  const all = uniqueBy([...shuffle([...items]), ...shuffle(pool.filter(p => p.word && tr(p.m, lang)))], w => w.word);
  const picks = shuffle([...items]);
  const take = (n) => picks.splice(0, Math.min(n, picks.length));
  const refill = () => { if (!picks.length) picks.push(...shuffle([...items])); };

  if (items.length >= 3) {
    out.intro.push({ type: 'match', pairs: shuffle([...items]).slice(0, 5).map(w => ({ left: w.word, right: tr(w.m, lang), py: w.p })) });
  }
  for (const w of take(3)) {
    const correct = tr(w.m, lang);
    out.intro.push({ type: 'choose', vocab: w.word, py: w.p, promptKey: 'whatMeans', promptArg: w.word, speak: w.word,
      correct, options: withDistractors(correct, all.map(x => tr(x.m, lang))) });
  }
  refill();
  for (const w of take(2)) {
    if (!w.p) continue;
    const correct = splitPinyin(w.p).join(' ');
    out.intro.push({ type: 'choose', kind: 'tone', vocab: w.word, py: w.p, promptKey: 'whichPinyin', promptArg: w.word, speak: w.word,
      correct, options: shuffle([correct, ...toneVariants(w.p)]) });
  }
  refill();
  for (const w of take(2)) {
    out.middle.push({ type: 'choose', vocab: w.word, py: w.p, promptKey: 'howSay', promptArg: tr(w.m, lang),
      correct: w.word, options: withDistractors(w.word, all.map(x => x.word)) });
  }
  refill();
  for (const w of take(2)) {
    out.middle.push({ type: 'listen', vocab: w.word, py: w.p, text: w.word, correct: w.word,
      options: withDistractors(w.word, all.map(x => x.word)) });
  }
  refill();
  for (const w of take(2)) {
    out.production.push({ type: 'translate', vocab: w.word, promptKey: 'writeThis', promptArg: tr(w.m, lang),
      answer: w.word, py: w.p, accept: [w.word] });
  }
  return out;
}

function withDistractors(correct, candidates, n = 4) {
  const others = uniqueBy(shuffle(candidates.filter(c => c && c !== correct)), c => c).slice(0, n - 1);
  return shuffle([correct, ...others]);
}

function buildExercise(ex, lang) {
  const hint = ex.hint ? tr(ex.hint, lang) : null;
  switch (ex.type) {
    case 'choose':
      return { type: 'choose', prompt: tr(ex.prompt, lang), correct: ex.correct, options: shuffle([...ex.options]), hint };
    case 'translate':
      return { type: 'translate', prompt: tr(ex.prompt, lang), answer: ex.answer, py: ex.py, accept: [ex.answer, ...(ex.accept || [])], hint };
    case 'fill':
      return { type: 'fill', sentence: ex.sentence, blank: ex.blank, py: ex.py, options: shuffle([...ex.options]), hint, trans: tr(ex.tr, lang) };
    case 'order':
      return { type: 'order', prompt: tr(ex.prompt, lang), words: shuffle([...ex.words]), answer: ex.answer, py: ex.py, hint };
    case 'match':
      return { type: 'match', pairs: ex.pairs.map(p => ({ left: p[0], right: tr(p[1], lang) })) };
    case 'listen':
      return { type: 'listen', text: ex.text, correct: ex.correct, options: shuffle([...ex.options]) };
    default:
      return ex;
  }
}

// Answer check for typed answers: hanzi (punctuation/spaces ignored) or pinyin (tone marks or numbers).
// Returns { ok, note } where note = 'tones' when only the tones were missing/wrong.
const HAN_RE = /[\u3400-\u9fff]/;
const onlyHan = s => [...String(s)].filter(c => HAN_RE.test(c)).join('');
function pyCanon(x) {
  const s = bare(String(x).toLowerCase()).replace(/ü|u:/g, 'v');
  return s.replace(/[^a-z]/g, '');
}
function pyTones(x) {
  const s = String(x).toLowerCase();
  let t = '';
  for (const ch of s.normalize('NFC')) {
    const n = 'āēīōūǖ'.includes(ch) ? 1 : 'áéíóúǘ'.includes(ch) ? 2 : 'ǎěǐǒǔǚ'.includes(ch) ? 3 : 'àèìòùǜ'.includes(ch) ? 4 : /[1-4]/.test(ch) ? +ch : 0;
    if (n) t += n;
  }
  return t;
}
export function checkTyped(input, ex) {
  const user = String(input).trim();
  if (!user) return { ok: false };
  const accepted = ex.accept && ex.accept.length ? ex.accept : [ex.answer];
  if (HAN_RE.test(user)) return { ok: accepted.some(a => onlyHan(a) === onlyHan(user)) };
  const pys = [ex.py, ...accepted.map(a => pinyinText(a))].filter(Boolean);
  const hit = pys.find(p => pyCanon(p) === pyCanon(user));
  if (!hit) return { ok: false };
  const ut = pyTones(user);
  if (!ut) return { ok: true, note: 'tones' };
  return ut === pyTones(hit) ? { ok: true } : { ok: true, note: 'tones' };
}

export function reshuffle(ex) {
  const copy = { ...ex, retry: true };
  if (copy.options) copy.options = shuffle([...copy.options]);
  if (copy.words) copy.words = shuffle([...copy.words]);
  return copy;
}

function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter(x => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
