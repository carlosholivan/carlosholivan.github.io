// Builds a mixed review lesson: weak words + failed grammar drills + the last studied units.
import { S } from '../state.js';
import { loadUnit, loadVocab, loadDrills } from '../data.js';
import { generateExercises, unitVocab, shuffle, tr } from './exercises.js';
import { getWordLevel } from './mastery.js';

const ORDER = ['a1', 'a2', 'b1', 'b2', 'c1'];
const MAX = 15;

function recentUnits() {
  const keys = [...(S.recent || [])];
  if (keys.length < 3) {
    const done = Object.keys(S.completed || {})
      .filter(k => S.completed[k] && !keys.includes(k))
      .sort((a, b) => {
        const [la, ua] = a.split('-'), [lb, ub] = b.split('-');
        return (ORDER.indexOf(lb) - ORDER.indexOf(la)) || (+ub - +ua);
      });
    keys.push(...done);
  }
  return keys.slice(0, 3).map(k => { const [level, unit] = k.split('-'); return { level, unit: +unit }; });
}

function weakWords() {
  const now = Date.now();
  return Object.entries(S.vocab || {})
    .filter(([w, v]) => v.seen > 0 && w.split(' ').length <= 3)
    .map(([word, v]) => {
      const acc = v.correct / v.seen;
      const lvl = getWordLevel(word);
      const days = v.lastSeen ? (now - v.lastSeen) / 86400000 : 0;
      const prio = (lvl === 'ghost' ? 3 : 0) + (1 - acc) * 2 + (days >= (v.interval || 1) ? 1 : 0);
      return { word, prio, acc };
    })
    .filter(x => x.acc < 0.8 || x.prio >= 1)
    .sort((a, b) => b.prio - a.prio);
}

async function vocabIndex(levels) {
  const map = new Map();
  for (const l of levels) {
    try { for (const v of await loadVocab(l)) if (v.word && !map.has(v.word)) map.set(v.word, v); } catch (e) {}
  }
  return map;
}

function wordExercise(v, pool, kind, lang) {
  const meaning = tr(v.m, lang);
  const others = shuffle(pool.filter(p => p.word !== v.word && tr(p.m, lang))).slice(0, 3);
  if (kind === 0) return { type: 'choose', vocab: v.word, promptKey: 'whatMeans', promptArg: v.word, speak: v.word,
    correct: meaning, options: shuffle([meaning, ...others.map(o => tr(o.m, lang))]), src: 'weak' };
  if (kind === 1) return { type: 'translate', vocab: v.word, promptKey: 'writeThis', promptArg: meaning,
    answer: v.word, accept: [v.word], src: 'weak' };
  return { type: 'listen', vocab: v.word, text: v.word, correct: v.word,
    options: shuffle([v.word, ...others.map(o => o.word)]), src: 'weak' };
}

export async function buildReview() {
  const lang = S.lang || 'en';
  const lvIdx = ORDER.indexOf(S.level);
  const levels = ORDER.slice(0, Math.max(lvIdx, 0) + 1);
  const out = { weak: [], drills: [], recent: [], units: [] };

  // 1. Weak words (low accuracy, forgotten or due).
  const vmap = await vocabIndex(levels);
  const pool = [...vmap.values()];
  const weak = weakWords().filter(w => vmap.has(w.word)).slice(0, 6);
  weak.forEach((w, i) => out.weak.push(wordExercise(vmap.get(w.word), pool, i % 3, lang)));

  // 2. Grammar drill items that were answered wrong.
  const bad = [];
  for (const [k, st] of Object.entries(S.drills || {})) {
    if (!(st.bad || []).length) continue;
    const [level, ...rest] = k.split('-');
    const cats = await loadDrills(level);
    const cat = cats.find(c => c.id === rest.join('-'));
    if (!cat) continue;
    for (const i of st.bad) if (cat.items[i]) bad.push({ it: cat.items[i], ts: st.ts || 0 });
  }
  shuffle(bad).sort((a, b) => b.ts - a.ts);
  for (const { it } of bad.slice(0, 4)) {
    out.drills.push({ type: 'fill', sentence: it.q, blank: it.o[it.a], options: shuffle([...it.o]),
      hint: `${tr(it.tr, lang)}`, src: 'drill' });
  }

  // 3. Exercises from the last studied units.
  const units = recentUnits();
  const per = Math.max(2, Math.ceil((MAX - out.weak.length - out.drills.length) / Math.max(units.length, 1)));
  for (const { level, unit } of units) {
    const u = await loadUnit(level, unit);
    if (!u) continue;
    let lv = [];
    try { lv = await loadVocab(level); } catch (e) {}
    const exs = generateExercises(u, unitVocab(u, lv), lv).filter(e => e.type !== 'match');
    out.units.push({ level, unit, title: tr(u.title, lang) });
    out.recent.push(...shuffle(exs).slice(0, per).map(e => ({ ...e, src: 'recent' })));
  }

  // Interleave so the lesson mixes sources; cap the total.
  const queue = [];
  const lists = [out.recent, out.weak, out.drills].map(l => [...l]);
  while (queue.length < MAX && lists.some(l => l.length)) {
    for (const l of lists) if (l.length && queue.length < MAX) queue.push(l.shift());
  }
  return { queue, counts: { weak: out.weak.length, drills: out.drills.length, recent: out.recent.length }, units: out.units };
}
