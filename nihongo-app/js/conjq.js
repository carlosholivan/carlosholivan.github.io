// Conjugation exercises for the lessons: a verb of the lesson (or a common one) and a form of this level, to choose
// among look-alikes (its other forms, and the form a learner gets by putting the verb in the wrong group) or to type
// (kana or kanji both count).
import { QUIZ_VERBS, FORM, conjugate } from './conj.js?v=202611282102';
import { S } from './state.js?v=202611282102';

const BY_LEVEL = { n5: ['masu', 'nai', 'te', 'ta'], n4: ['te', 'ta', 'nai', 'vol', 'pot', 'ba', 'tara'], n3: ['pot', 'ba', 'tara', 'pas', 'imp', 'vol'],
  n2: ['pas', 'caus', 'pot', 'imp', 'ba'], n1: ['pas', 'caus', 'pot', 'imp', 'ba'] };
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function conjExercises(level, words = [], n = 2) {
  const forms = (BY_LEVEL[level] || BY_LEVEL.n5).filter(id => FORM[id]);
  const inUnit = new Set(words.map(w => w.word || w.w));
  const mine = QUIZ_VERBS.filter(v => inUnit.has(v[0]));
  const out = [];
  for (let k = 0; k < n * 4 && out.length < n; k++) {
    const v = pick(mine.length && k % 2 === 0 ? mine : QUIZ_VERBS), f = pick(forms);
    let a; try { a = conjugate(v, f); } catch (e) { continue; }
    if (!a || !a.w || out.some(e => (e.correct || e.answer) === a.w)) continue;
    const F = FORM[f], label = (S.lang === 'en' ? F.en || F.label : F.label) || f;
    const prompt = `${v[0]}${v[1] !== v[0] ? `（${v[1]}）` : ''} ${S.lang === 'en' ? v[4] || v[3] : v[3]} → ${label}`;
    const hint = S.lang === 'en' ? '🔤 Conjugate the verb' : '🔤 Conjuga el verbo';
    if (out.length % 2 === 1) { out.push({ type: 'translate', prompt, hint, answer: a.w, accept: [a.w, a.r], py: a.r, conj: true }); continue; }
    const pool = new Set();
    for (const g of v[2] === 1 ? [2] : v[2] === 2 ? [1] : [1, 2]) { try { const x = conjugate([v[0], v[1], g], f); if (x && x.w && x.w !== a.w) pool.add(x.w); } catch (e) {} }
    for (const f2 of ['masu', 'nai', 'te', 'ta', 'vol', 'pot', 'ba', 'pas']) if (f2 !== f && FORM[f2]) { try { const x = conjugate(v, f2); if (x && x.w && x.w !== a.w) pool.add(x.w); } catch (e) {} }
    const wrongGroup = [...pool].slice(0, 2), rest = shuffle([...pool].slice(2));
    const near = [...new Set([...wrongGroup, ...rest])].slice(0, 3);
    if (near.length < 2) continue;
    out.push({ type: 'choose', prompt, hint, correct: a.w, options: shuffle([a.w, ...near]), conj: true });
  }
  return out;
}
