import { S } from '../state.js';

export function tr(obj, lang = S.lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
}

// Normalizes the unit's new words to { word, m: {en,zh,ja}, gender }.
export function unitVocab(unit, levelVocab = []) {
  if (unit.newVocab && unit.newVocab.length) {
    return unit.newVocab.map(v => {
      const ref = levelVocab.find(x => x.word === v.word);
      return { word: v.word, m: { en: v.en, zh: v.zh, ja: v.ja }, gender: v.gender || (ref && ref.gender) || null };
    });
  }
  const byUnit = levelVocab.filter(v => v.unit === unit.id);
  if (byUnit.length) return byUnit.map(v => ({ word: v.word, m: v.m, gender: v.gender || null }));
  return (unit.vocab || [])
    .map(w => levelVocab.find(v => v.word === w))
    .filter(Boolean)
    .map(v => ({ word: v.word, m: v.m, gender: v.gender || null }));
}

export function generateExercises(unit, words = [], pool = []) {
  const lang = S.lang;
  const authored = (unit.exercises || []).map(ex => buildExercise(ex, lang));
  const generated = vocabExercises(words, pool, lang);

  // Duolingo-style progression: recognise words → grammar practice → produce words.
  const half = Math.ceil(authored.length / 2);
  return [
    ...generated.intro,
    ...authored.slice(0, half),
    ...generated.middle,
    ...authored.slice(half),
    ...generated.production,
  ];
}

function vocabExercises(words, pool, lang) {
  const out = { intro: [], middle: [], production: [] };
  const items = words.filter(w => w.word && tr(w.m, lang));
  if (items.length < 2) return out;

  // Distractors come from the unit's own words first, then from the rest of the level.
  const all = uniqueBy([...shuffle([...items]), ...shuffle(pool.filter(p => p.word && tr(p.m, lang)))], w => w.word);
  const picks = shuffle([...items]);
  const take = (n) => picks.splice(0, Math.min(n, picks.length));
  const refill = () => { if (!picks.length) picks.push(...shuffle([...items])); };

  if (items.length >= 3) {
    out.intro.push({
      type: 'match',
      pairs: shuffle([...items]).slice(0, 5).map(w => ({ left: w.word, right: tr(w.m, lang) })),
    });
  }

  for (const w of take(3)) {
    const correct = tr(w.m, lang);
    out.intro.push({
      type: 'choose', vocab: w.word,
      promptKey: 'whatMeans', promptArg: w.word, speak: w.word,
      correct, options: withDistractors(correct, all.map(x => tr(x.m, lang))),
    });
  }

  refill();
  for (const w of take(2)) {
    out.middle.push({
      type: 'choose', vocab: w.word,
      promptKey: 'howSay', promptArg: tr(w.m, lang),
      correct: w.word, options: withDistractors(w.word, all.map(x => x.word)),
    });
  }

  refill();
  for (const w of take(1)) {
    out.middle.push({
      type: 'listen', vocab: w.word, text: w.word,
      correct: w.word, options: withDistractors(w.word, all.map(x => x.word)),
    });
  }

  refill();
  for (const w of take(2)) {
    out.production.push({
      type: 'translate', vocab: w.word,
      promptKey: 'writeThis', promptArg: tr(w.m, lang),
      answer: w.word, accept: [w.word],
    });
  }
  return out;
}

function withDistractors(correct, candidates, n = 4) {
  const others = uniqueBy(candidates.filter(c => c && c !== correct), c => c).slice(0, n - 1);
  return shuffle([correct, ...others]);
}

function buildExercise(ex, lang) {
  const hint = ex.hint ? tr(ex.hint, lang) : null;
  switch (ex.type) {
    case 'choose':
      return { type: 'choose', prompt: tr(ex.prompt, lang), correct: ex.correct, options: shuffle([...ex.options]), hint };
    case 'translate':
      return { type: 'translate', prompt: tr(ex.prompt, lang), answer: ex.answer, accept: ex.accept || [ex.answer], hint };
    case 'fill':
      return { type: 'fill', sentence: ex.sentence, blank: ex.blank, options: shuffle([...ex.options]), hint };
    case 'order':
      return { type: 'order', prompt: tr(ex.prompt, lang), words: shuffle([...ex.words]), answer: ex.answer, hint };
    case 'match':
      return { type: 'match', pairs: ex.pairs.map(p => ({ left: p[0], right: tr(p[1], lang) })) };
    case 'listen':
      return { type: 'listen', text: ex.text, correct: ex.correct, options: shuffle([...ex.options]) };
    default:
      return ex;
  }
}

// Fresh copy with reshuffled options, used when a missed exercise is repeated.
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
