import { S, save } from '../state.js?v=202611131900';

export function recordAnswer(word, correct) {
  if (!S.vocab[word]) {
    S.vocab[word] = { seen: 0, correct: 0, lastSeen: null, interval: 1 };
  }
  const v = S.vocab[word];
  v.seen++;
  v.lastSeen = Date.now();
  if (correct) {
    v.correct++;
    v.interval = Math.min(v.interval * 2.5, 30);
  } else {
    v.interval = 1;
    v.miss = (v.miss ?? Math.max(0, v.seen - 1 - (v.correct || 0))) + 1;
    v.lastMiss = Date.now();
  }
  save(S);
}

export function getReviewWords(limit = 20) {
  const now = Date.now();
  const due = [];

  for (const [word, data] of Object.entries(S.vocab)) {
    if (!data.lastSeen) continue;
    const elapsed = (now - data.lastSeen) / (1000 * 60 * 60 * 24);
    if (elapsed >= data.interval) {
      due.push({ word, ...data, overdue: elapsed / data.interval });
    }
  }

  due.sort((a, b) => b.overdue - a.overdue);
  return due.slice(0, limit);
}

export function getAccuracy(word) {
  const v = S.vocab[word];
  if (!v || !v.seen) return 0;
  return v.correct / v.seen;
}

// Words failed in lessons and not yet fixed in a "failed words" review (legacy entries: seen > correct).
export function failedWords(known, limit = 30) {
  const out = [];
  for (const [w, v] of Object.entries(S.vocab || {})) {
    if (!known.has(w)) continue;
    const miss = v.miss ?? Math.max(0, (v.seen || 0) - (v.correct || 0));
    if (miss > 0) out.push([w, miss, v.lastMiss || v.lastSeen || 0]);
  }
  out.sort((a, b) => (b[1] - a[1]) || (b[2] - a[2]));
  return out.slice(0, limit).map(x => x[0]);
}

export function markFixed(word, fixed) {
  const v = S.vocab[word];
  if (!v) return;
  if (fixed) v.miss = 0; else { v.miss = Math.max(1, v.miss || 0) + 1; v.lastMiss = Date.now(); }
  save(S);
}
