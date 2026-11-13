// Anki-style spaced repetition (SM-2 with learning steps).
// Two decks: 'v' = vocabulary (S.cards[word]), 'h' = characters (S.hcards[char]).
// card = { s: 'new'|'learn'|'review'|'relearn'|'known', step, due (ms), ivl (days), ef, reps, lapses, added, r (frequency rank) }
// 'known' = marked as learned by the user: never shown.
import { S, save } from '../state.js?v=202611140100';

const MIN = 60 * 1000, DAY = 86400000;
const LEARN_STEPS = [1, 10];      // minutes
const RELEARN_STEPS = [10];       // minutes
const GRAD_IVL = 1, EASY_IVL = 4; // days
export const NEW_PER_DAY = { v: 15, h: 10 };
const perDay = d => (d === 'v' && S.newPerDay) || NEW_PER_DAY[d];

const KEYS = { v: ['cards', 'cardsDay'], h: ['hcards', 'hcardsDay'] };
const cards = (d = 'v') => (S[KEYS[d][0]] ||= {});
const dayOf = (d = 'v') => S[KEYS[d][1]] || {};
const today = () => new Date().toISOString().slice(0, 10);
const fuzz = d => d < 3 ? d : Math.round(d * (0.95 + Math.random() * 0.1));

const newCard = (r) => ({ s: 'new', step: 0, due: 0, ivl: 0, ef: 2.5, reps: 0, lapses: 0, added: Date.now(), ...(r != null ? { r } : {}) });

// rank(word) → frequency rank used to order new cards (lower = more frequent).
export function addCards(words, d = 'v', rank = null) {
  const c = cards(d);
  let n = 0;
  for (const w of words) {
    if (!w || c[w]) continue;
    c[w] = newCard(rank ? rank(w) : null);
    n++;
  }
  if (n) save(S);
  return n;
}

// Imports words already practised with the old SRS so the deck isn't empty for existing users.
export function seedFromHistory(known) {
  if (S.cardsSeeded) return;
  const c = cards('v');
  for (const [w, v] of Object.entries(S.vocab || {})) {
    if (c[w] || !known.has(w) || !v.lastSeen) continue;
    const ivl = Math.max(1, Math.round(v.interval || 1));
    c[w] = { s: 'review', step: 0, due: v.lastSeen + ivl * DAY, ivl, ef: 2.5, reps: v.seen || 1,
      lapses: Math.max(0, (v.seen || 0) - (v.correct || 0) > 1 ? 1 : 0), added: v.lastSeen };
  }
  S.cardsSeeded = true;
  save(S);
}

// Marks words as already learned (they leave the study queue) or puts them back as new cards.
export function setKnown(words, known, d = 'v', rank = null) {
  const c = cards(d);
  for (const w of words) {
    if (known) c[w] = { ...(c[w] || newCard(rank ? rank(w) : null)), s: 'known', known: Date.now() };
    else if (c[w] && c[w].s === 'known') c[w] = c[w].reps ? { ...c[w], s: 'review', due: Date.now() } : newCard(c[w].r);
  }
  save(S);
}

// Fills today's new-card allowance from an ordered candidate list (most frequent first).
// inDeck(word) restricts counting to one level deck (null = whole collection).
export function topUpNew(ordered, d = 'v', rank = null, inDeck = null) {
  const c = cards(d);
  let waiting = Object.entries(c).filter(([w, x]) => x.s === 'new' && (!inDeck || inDeck(w))).length;
  const want = newLeftToday(d) - waiting;
  if (want <= 0) return 0;
  const add = [];
  for (const w of ordered) {
    if (add.length >= want) break;
    if (!c[w]) add.push(w);
  }
  return addCards(add, d, rank);
}

export function cardState(w, d = 'v') {
  return (cards(d)[w] || {}).s || null;
}

export function isForgotten(card, now = Date.now()) {
  return card.s === 'relearn' || (card.s === 'review' && card.lapses > 0 && card.due <= now)
    || (card.s === 'review' && now - card.due > card.ivl * DAY);
}

export function deckStats(d = 'v', now = Date.now(), inDeck = null) {
  const st = { total: 0, new: 0, learn: 0, due: 0, forgotten: 0, mature: 0, known: 0 };
  for (const [w, card] of Object.entries(cards(d))) {
    if (inDeck && !inDeck(w)) continue;
    if (card.s === 'known') { st.known++; continue; }
    st.total++;
    if (card.s === 'new') st.new++;
    else if (card.due <= now) {
      if (card.s === 'review') st.due++; else st.learn++;
      if (isForgotten(card, now)) st.forgotten++;
    }
    if (card.s === 'review' && card.ivl >= 21) st.mature++;
  }
  st.newToday = Math.min(st.new, newLeftToday(d));
  st.pending = st.learn + st.due + st.newToday;
  return st;
}

function newLeftToday(d = 'v') {
  const day = dayOf(d);
  return Math.max(0, perDay(d) - (day.date === today() ? day.n : 0));
}

// Session queue: forgotten first, then learning/review due (most overdue first), then today's new cards.
// mode: 'all' (due + new), 'due' (only words already seen), 'new' (only today's new words),
// 'extra' (practice ahead: seen words that are not due yet, soonest first; never empty while there are seen cards).
export function buildQueue(d = 'v', limit = 40, now = Date.now(), inDeck = null, mode = 'all') {
  const due = [], fresh = [], ahead = [];
  for (const [w, card] of Object.entries(cards(d))) {
    if (card.s === 'known' || (inDeck && !inDeck(w))) continue;
    if (card.s === 'new') fresh.push([w, card]);
    else if (card.due <= now) due.push([w, card]);
    else ahead.push([w, card]);
  }
  if (mode === 'extra') {
    // Weakest first (lapses, short intervals), then the ones due soonest; shuffled a bit so sessions differ.
    ahead.push(...due);
    ahead.sort((a, b) => ((b[1].lapses || 0) - (a[1].lapses || 0)) || ((a[1].ivl || 0) - (b[1].ivl || 0)) || (a[1].due - b[1].due));
    const top = ahead.slice(0, limit * 2).map(x => x[0]);
    for (let i = top.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [top[i], top[j]] = [top[j], top[i]]; }
    return top.slice(0, limit);
  }
  due.sort((a, b) => (isForgotten(b[1], now) - isForgotten(a[1], now)) || (a[1].due - b[1].due));
  // New cards: most frequent first (cards without a rank keep the order they were added).
  fresh.sort((a, b) => ((a[1].r ?? 1e9) - (b[1].r ?? 1e9)) || (a[1].added - b[1].added));
  const dueW = due.map(x => x[0]), newW = fresh.slice(0, newLeftToday(d)).map(x => x[0]);
  if (mode === 'due') return dueW.slice(0, limit);
  if (mode === 'new') return newW.slice(0, limit);
  return [...dueW, ...newW].slice(0, limit);
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

export function answer(word, rating, d = 'v') {
  const c = cards(d);
  if (!c[word]) return;
  if (c[word].s === 'new') {
    const day = dayOf(d);
    S[KEYS[d][1]] = { date: today(), n: (day.date === today() ? day.n : 0) + 1 };
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
