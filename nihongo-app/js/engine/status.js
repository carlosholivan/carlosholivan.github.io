// Learning status of a word, combining the Anki deck (S.cards) with lesson mastery (S.vocab).
import { S } from '../state.js?v=202611140200';
import { isForgotten } from './anki.js?v=202611140200';
import { getWordLevel } from './mastery.js?v=202611140200';
import { t } from '../i18n.js?v=202611140200';

export const STATUS = {
  unseen:   { color: '#95a5a6', key: 'stUnseen' },
  learning: { color: '#e67e22', key: 'stLearning' },
  review:   { color: '#3498db', key: 'stReview' },
  master:   { color: '#27ae60', key: 'stMaster' },
  ghost:    { color: '#e74c3c', key: 'stGhost' },
};
export const STATUS_ORDER = ['unseen', 'learning', 'review', 'master', 'ghost'];

export function wordStatus(w) {
  const c = (S.cards || {})[w];
  if (c) {
    if (c.s === 'known') return 'master';
    if (c.s !== 'new' && isForgotten(c)) return 'ghost';
    // Like Anki: answering a new card (even 'easy') only graduates it; it counts as learned once it has
    // survived reviews on later days and its interval reaches a week.
    if (c.s === 'review') return c.ivl >= 21 ? 'master' : c.ivl >= 7 ? 'review' : 'learning';
    if (c.s === 'learn' || c.s === 'relearn') return 'learning';
  }
  const m = S.vocab?.[w] ? getWordLevel(w) : 'new';
  return { new: c && c.s !== 'new' ? 'learning' : 'unseen', beginner: 'learning', intermediate: 'review', master: 'master', ghost: 'ghost' }[m];
}

// A word counts as learned once it has graduated (en repaso / dominada). Used by every counter in the app.
export const isLearned = (w) => { const s = wordStatus(w); return s === 'review' || s === 'master'; };

export const statusLegend = (counts) => `<div class="st-legend">${STATUS_ORDER.map(k =>
  `<span><i style="background:${STATUS[k].color}"></i>${t(STATUS[k].key)}${counts ? ` <b>${counts[k] || 0}</b>` : ''}</span>`).join('')}</div>`;
