// Conjugation exercises for the lessons: a verb of the lesson (or a common one), a person and a tense of this
// level, to choose among look-alike forms (other persons, other tenses, the same form with a wrong accent) or to type.
import { VERBS, PERSONS, IMP_PERSONS, TENSES, conjugate } from './conj.js?v=202611282202';
import { S } from './state.js?v=202611282202';

const BY_LEVEL = { a1: ['pres'], a2: ['pres', 'pc', 'imparf', 'fut'], b1: ['pc', 'imparf', 'fut', 'cond', 'pqp'], b2: ['imparf', 'cond', 'pqp', 'subj', 'imp'], c1: ['subj', 'cond', 'condp', 'pqp'], c2: ['subj', 'condp', 'ps', 'pqp'] };
const EASY_P = null;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const L = o => (o && (S.lang === 'en' ? (o.en || o.es) : (o.es || o.en))) || '';
const nfc = s => s ? String(s).normalize('NFC') : s;
const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');

export function conjExercises(level, words = [], n = 2) {
  const tenses = (BY_LEVEL[level] || BY_LEVEL.a1).filter(id => TENSES.some(t => t.id === id));
  if (!tenses.length) return [];
  const inUnit = new Set(words.map(w => String(w.word || w.w || '').replace(/^(to |el |la |der |die |das |le |la |l')/i, '')));
  const mine = VERBS.filter(v => inUnit.has(v.w));
  const out = [];
  for (let k = 0; k < n * 4 && out.length < n; k++) {
    const v = pick(mine.length && k % 2 === 0 ? mine : VERBS), tn = pick(tenses);
    const persons = (tn === 'imp' ? IMP_PERSONS : PERSONS).map(p => p.id !== undefined ? p.id : p).filter(id => !EASY_P || level > 'a2' || EASY_P.includes(id));
    const p = pick(persons);
    let answer; try { answer = nfc(conjugate(v, tn, p)); } catch (e) { continue; }
    if (!answer || out.some(e => e.correct === answer || e.answer === answer)) continue;
    const P = (tn === 'imp' ? IMP_PERSONS : PERSONS).find(x => (x.id !== undefined ? x.id : x) === p) || {}, T = TENSES.find(x => x.id === tn);
    const prompt = `${v.w}${L(v) ? ` (${L(v)})` : ''} → ${typeof P === 'object' ? L(P) || P.w || p : P} · ${L(T)}`;
    const hint = S.lang === 'en' ? '🔤 Conjugate the verb' : '🔤 Conjuga el verbo';
    const typing = true && out.length % 2 === 1;
    if (typing) { out.push({ type: 'translate', prompt, hint, answer, accept: [answer], conj: true }); continue; }
    // look-alikes: the same tense in other persons, the same person in other tenses, and the form without its accent
    const pool = new Set();
    for (const q of persons) { try { const f = nfc(conjugate(v, tn, q)); if (f && f !== answer) pool.add(f); } catch (e) {} }
    for (const t2 of TENSES.map(t => t.id)) if (t2 !== tn && t2 !== 'imp') { try { const f = nfc(conjugate(v, t2, p)); if (f && f !== answer) pool.add(f); } catch (e) {} }
    if (strip(answer) !== answer) pool.add(strip(answer));
    const near = shuffle([...pool]).sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length)).slice(0, 3);
    if (near.length < 2) continue;
    out.push({ type: 'choose', prompt, hint, correct: answer, options: shuffle([answer, ...near]), conj: true });
  }
  return out;
}
