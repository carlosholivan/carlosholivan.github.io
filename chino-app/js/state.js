import { isConfigured, saveStateToCloud } from './firebase-auth.js?v=202611021344';

const STORAGE_KEY = 'chino_state';

const DEFAULT_STATE = {
  lang: 'es',        // user's language: es, en, ja, ko
  name: '',
  welcomed: false,
  texts: {},         // reading texts: {id: {q: best %, gaps: bool}}
  drills: {},        // grammar drills: {'<level>-<cat>': {best: %, ok: [item indexes answered right]}}
  level: 'hsk1',
  pinyin: true,      // show pinyin over characters
  hcards: {},        // Anki deck for characters
  dark: false,
  unit: 1,           // current unit within level
  streak: 0,
  lastDay: null,
  lastReviewPrompt: null,
  lastActive: null,  // timestamp of the last visit
  levelChosen: false,
  recent: [],        // recently completed units, newest first: ['a1-5', ...]
  lastReview: null,  // date of the last review lesson
  xp: 0,
  completed: {},     // { "a1-1": true, "a1-2": true, ... }
  vocab: {},         // { word: { seen, correct, lastSeen, interval } }
  cards: {},         // Anki deck: { word: { s, step, due, ivl, ef, reps, lapses, added } }
  settings: {
    sound: true,
    haptics: true
  }
};

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch(e) {}
  return { ...DEFAULT_STATE };
}

// Local save is immediate; the cloud copy is debounced and flushed when the tab is hidden or closed.
let cloudTimer = null;
export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (isConfigured()) {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(flushCloud, 3000);
  }
}

export function flushCloud() {
  clearTimeout(cloudTimer);
  cloudTimer = null;
  if (!isConfigured()) return Promise.resolve();
  return saveStateToCloud(S).catch(() => {});
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cloudTimer) flushCloud(); });
addEventListener('pagehide', () => { if (cloudTimer) flushCloud(); });

export function reset() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(S, DEFAULT_STATE);
  S.completed = {};
  S.vocab = {};
  S.cards = {};
  S.hcards = {};
  S.settings = { sound: true, haptics: true };
}

export let S = load();

export function mergeCloudState(cloudState) {
  if (!cloudState) return;
  const merged = { ...S };
  if ((cloudState.xp || 0) > (S.xp || 0)) {
    merged.xp = cloudState.xp;
    merged.streak = cloudState.streak || 0;
    merged.lastDay = cloudState.lastDay || null;
    merged.level = cloudState.level || S.level;
    merged.unit = cloudState.unit || S.unit;
  }
  if (cloudState.name && !S.name) merged.name = cloudState.name;
  if (cloudState.welcomed) merged.welcomed = true;
  merged.texts = { ...(cloudState.texts || {}), ...(S.texts || {}) };
  merged.drills = { ...(cloudState.drills || {}), ...(S.drills || {}) };
  if ((cloudState.lastActive || 0) > (S.lastActive || 0)) merged.lastActive = cloudState.lastActive;
  if (cloudState.levelChosen) merged.levelChosen = true;
  if (!(S.recent || []).length && cloudState.recent) merged.recent = cloudState.recent;
  if ((cloudState.lastReview || '') > (S.lastReview || '')) merged.lastReview = cloudState.lastReview;
  for (const k of ['cardsDay', 'hcardsDay']) {
    const cd = cloudState[k], ld = S[k];
    if (cd && (!ld || cd.date > ld.date || (cd.date === ld.date && cd.n > ld.n))) merged[k] = cd;
  }
  merged.completed = { ...S.completed, ...(cloudState.completed || {}) };
  for (const d of ['cards', 'hcards']) {
    merged[d] = { ...(cloudState[d] || {}) };
    for (const [w, c] of Object.entries(S[d] || {})) {
      if (!merged[d][w] || (c.reps || 0) >= (merged[d][w].reps || 0)) merged[d][w] = c;
    }
  }
  if (cloudState.cardsSeeded) merged.cardsSeeded = true;
  merged.vocab = { ...(S.vocab || {}) };
  const cloudVocab = cloudState.vocab || {};
  for (const [word, data] of Object.entries(cloudVocab)) {
    if (!merged.vocab[word] || (data.lastSeen || 0) > (merged.vocab[word].lastSeen || 0)) {
      merged.vocab[word] = data;
    }
  }
  Object.assign(S, merged);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
}

export function update(patch) {
  Object.assign(S, patch);
  save(S);
}

export function completeUnit(level, unit) {
  S.completed[`${level}-${unit}`] = true;
  const k = `${level}-${unit}`;
  S.recent = [k, ...(S.recent || []).filter(x => x !== k)].slice(0, 10);
  S.xp += 10;
  updateStreak();
  save(S);
}

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (S.lastDay === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  S.streak = (S.lastDay === yesterday) ? S.streak + 1 : 1;
  S.lastDay = today;
}

export function isUnitDone(level, unit) {
  return !!S.completed[`${level}-${unit}`];
}

export function isUnitUnlocked(level, unit) {
  if (unit === 1) return true;
  return isUnitDone(level, unit - 1);
}

export function hasHistory() {
  return Object.keys(S.completed || {}).length > 0 || Object.keys(S.vocab || {}).length > 0;
}

// Calendar days since the previous visit (-1 = first visit). Computed once per session.
export let daysAway = -1;
let touched = false;
export function touchActive() {
  const now = Date.now();
  if (!touched) {
    touched = true;
    if (S.lastActive) {
      const day = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
      daysAway = Math.round((day(now) - day(S.lastActive)) / 86400000);
    }
  }
  S.lastActive = now;
  save(S);
  return daysAway;
}
