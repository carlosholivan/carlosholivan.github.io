import { isConfigured, saveStateToCloud } from './firebase-auth.js';

const STORAGE_KEY = 'español_state';

const DEFAULT_STATE = {
  lang: 'en',        // source language: en, zh, ja
  name: '',
  welcomed: false,
  texts: {},         // reading texts: {id: {q: best %, gaps: bool}}
  drills: {},        // grammar drills: {'<level>-<cat>': {best: %, ok: [item indexes answered right]}}
  level: 'a1',
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

export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (isConfigured()) {
    saveStateToCloud(state).catch(() => {});
  }
}

export function reset() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(S, DEFAULT_STATE);
  S.completed = {};
  S.vocab = {};
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
  merged.completed = { ...S.completed, ...(cloudState.completed || {}) };
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
