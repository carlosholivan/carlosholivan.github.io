import { S } from '../state.js';

export const LEVELS = {
  new: { label: { en: 'New', zh: '新', ja: '新規' }, color: 'var(--ink2)' },
  beginner: { label: { en: 'Beginner', zh: '初学', ja: '初級' }, color: '#e67e22' },
  intermediate: { label: { en: 'Intermediate', zh: '中等', ja: '中級' }, color: '#3498db' },
  master: { label: { en: 'Master', zh: '掌握', ja: 'マスター' }, color: 'var(--ok)' },
  ghost: { label: { en: 'Ghost', zh: '遗忘', ja: '忘却' }, color: 'var(--no)' },
};

export function getWordLevel(word) {
  const v = S.vocab[word];
  if (!v) return 'new';

  const now = Date.now();
  const daysSince = v.lastSeen ? (now - v.lastSeen) / (1000 * 60 * 60 * 24) : 999;
  const accuracy = v.seen > 0 ? v.correct / v.seen : 0;

  if (daysSince > v.interval * 2 && v.seen >= 3) return 'ghost';
  if (v.correct >= 5 && accuracy >= 0.85 && v.interval >= 7) return 'master';
  if (v.correct >= 3 && accuracy >= 0.7) return 'intermediate';
  if (v.seen >= 1) return 'beginner';
  return 'new';
}

export function getWordStats() {
  const stats = { new: 0, beginner: 0, intermediate: 0, master: 0, ghost: 0 };
  for (const word of Object.keys(S.vocab)) {
    stats[getWordLevel(word)]++;
  }
  return stats;
}

export function getDailyReviewWords(limit = 10) {
  const now = Date.now();
  const candidates = [];

  for (const [word, data] of Object.entries(S.vocab)) {
    if (!data.lastSeen) continue;
    const daysSince = (now - data.lastSeen) / (1000 * 60 * 60 * 24);
    const level = getWordLevel(word);

    if (level === 'ghost' || daysSince >= data.interval) {
      candidates.push({ word, ...data, level, priority: level === 'ghost' ? 100 : daysSince / data.interval });
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.slice(0, limit);
}

export function shouldShowDailyReview() {
  const today = new Date().toISOString().slice(0, 10);
  if (S.lastReviewPrompt === today) return false;
  return getDailyReviewWords(1).length > 0;
}

export function markDailyReviewShown() {
  S.lastReviewPrompt = new Date().toISOString().slice(0, 10);
}
