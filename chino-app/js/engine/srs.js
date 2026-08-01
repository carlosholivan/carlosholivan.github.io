import { S, save } from '../state.js';

export function recordAnswer(item, correct) {
  if (!S.vocab[item]) {
    S.vocab[item] = { seen: 0, correct: 0, lastSeen: 0, interval: 1 };
  }
  const v = S.vocab[item];
  v.seen++;
  v.lastSeen = Date.now();
  if (correct) {
    v.correct++;
    v.interval = Math.min(v.interval * 2, 30);
  } else {
    v.interval = 1;
  }
  save(S);
}
