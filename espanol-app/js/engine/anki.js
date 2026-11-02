// Anki-style spaced repetition (SM-2 with learning steps), stored in S.cards[word].
// card = { s: 'new'|'learn'|'review'|'relearn', step, due (ms), ivl (days), ef, reps, lapses, added }
import { S, save } from '../state.js';

const MIN = 60 * 1000, DAY = 86400000;
const LEARN_STEPS = [1, 10];      // minutes
const RELEARN_STEPS = [10];       // minutes
const GRAD_IVL = 1, EASY_IVL = 4; // days
export const NEW_PER_DAY = 15;

const cards = () => (S.cards ||= {});
const today = () => new Date().toISOString().slice(0, 10);
const fuzz = d => d < 3 ? d : Math.round(d * (0.95 + Math.random() * 0.1));

export function addCards(words) {
  const c = cards();
  let n = 0;
  for (const w of words) {
    if (!w || c[w]) continue;
    c[w] = { s: 'new', step: 0, due: 0, ivl: 0, ef: 2.5, reps: 0, lapses: 0, added: Date.now() };
    n++;
  }
  if (n) save(S);
  return n;
}

// Imports words already practised with the old SRS so the deck isn't empty for existing users.
export function seedFromHistory(known) {
  if (S.cardsSeeded) return;
  const c = cards();
  for (const [w, v] of Object.entries(S.vocab || {})) {
    if (c[w] || !known.has(w) || !v.lastSeen) continue;
    const ivl = Math.max(1, Math.round(v.interval || 1));
    c[w] = { s: 'review', step: 0, due: v.lastSeen + ivl * DAY, ivl, ef: 2.5, reps: v.seen || 1,
      lapses: Math.max(0, (v.seen || 0) - (v.correct || 0) > 1 ? 1 : 0), added: v.lastSeen };
  }
  S.cardsSeeded = true;
  save(S);
}

export function isForgotten(card, now = Date.now()) {
  return card.s === 'relearn' || (card.s === 'review' && card.lapses > 0 && card.due <= now)
    || (card.s === 'review' && now - card.due > card.ivl * DAY);
}

export function deckStats(now = Date.now()) {
  const st = { total: 0, new: 0, learn: 0, due: 0, forgotten: 0, mature: 0 };
  for (const card of Object.values(cards())) {
    st.total++;
    if (card.s === 'new') st.new++;
    else if (card.due <= now) {
      if (card.s === 'review') st.due++; else st.learn++;
      if (isForgotten(card, now)) st.forgotten++;
    }
    if (card.s === 'review' && card.ivl >= 21) st.mature++;
  }
  st.newToday = Math.min(st.new, newLeftToday());
  st.pending = st.learn + st.due + st.newToday;
  return st;
}

function newLeftToday() {
  const d = S.cardsDay || {};
  return Math.max(0, NEW_PER_DAY - (d.date === today() ? d.n : 0));
}

// Session queue: forgotten first, then learning/review due (most overdue first), then today's new cards.
export function buildQueue(limit = 40, now = Date.now()) {
  const due = [], fresh = [];
  for (const [w, card] of Object.entries(cards())) {
    if (card.s === 'new') fresh.push([w, card]);
    else if (card.due <= now) due.push([w, card]);
  }
  due.sort((a, b) => (isForgotten(b[1], now) - isForgotten(a[1], now)) || (a[1].due - b[1].due));
  fresh.sort((a, b) => a[1].added - b[1].added);
  return [...due.map(x => x[0]), ...fresh.slice(0, newLeftToday()).map(x => x[0])].slice(0, limit);
}

// Returns a copy of the card after answering with rating 1 (again) .. 4 (easy).
export function schedule(card, rating, now = Date.now()) {
  const c = { ...card };
  const learning = c.s === 'new' || c.s === 'learn';
  if (learning || c.s === 'relearn') {
    const steps = c.s === 'relearn' ? RELEARN_STEPS : LEARN_STEPS;
    if (c.s === 'new') c.s = 'learn';
    if (rating === 1) { c.step = 0; c.due = now + steps[0] * MIN; }
    else if (rating === 2) { c.due = now + (steps[c.step] + (steps[c.step + 1] || steps[c.step])) / 2 * MIN; }
    else if (rating === 3 && c.step + 1 < steps.length) { c.step++; c.due = now + steps[c.step] * MIN; }
    else {
      const easy = rating === 4;
      if (c.s === 'relearn') c.ivl = Math.max(1, c.ivl);
      else c.ivl = easy ? EASY_IVL : GRAD_IVL;
      if (easy && c.s === 'relearn') c.ivl = Math.max(c.ivl, 2);
      c.s = 'review'; c.step = 0; c.due = now + c.ivl * DAY;
    }
  } else {
    const late = Math.max(0, (now - c.due) / DAY);
    if (rating === 1) {
      c.lapses++; c.ef = Math.max(1.3, c.ef - 0.2);
      c.ivl = Math.max(1, Math.round(c.ivl * 0.2));
      c.s = 'relearn'; c.step = 0; c.due = now + RELEARN_STEPS[0] * MIN;
    } else {
      if (rating === 2) { c.ef = Math.max(1.3, c.ef - 0.15); c.ivl = Math.max(c.ivl + 1, c.ivl * 1.2); }
      if (rating === 3) c.ivl = Math.max(c.ivl + 1, (c.ivl + late / 2) * c.ef);
      if (rating === 4) { c.ef += 0.15; c.ivl = Math.max(c.ivl + 1, (c.ivl + late) * c.ef * 1.3); }
      c.ivl = Math.min(fuzz(Math.round(c.ivl)), 3650);
      c.due = now + c.ivl * DAY;
    }
  }
  c.reps++;
  return c;
}

export function answer(word, rating) {
  const c = cards();
  if (!c[word]) return;
  if (c[word].s === 'new') {
    const d = S.cardsDay || {};
    S.cardsDay = { date: today(), n: (d.date === today() ? d.n : 0) + 1 };
  }
  c[word] = schedule(c[word], rating);
  save(S);
  return c[word];
}

export function previewLabel(card, rating) {
  const now = Date.now();
  const ms = schedule(card, rating, now).due - now;
  if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))} h`;
  const d = ms / DAY;
  if (d < 30) return `${Math.round(d)} d`;
  if (d < 365) return `${(d / 30).toFixed(1).replace('.0', '')} m`;
  return `${(d / 365).toFixed(1).replace('.0', '')} a`;
}
