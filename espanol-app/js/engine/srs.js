import { S, save } from '../state.js';

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
