import { isConfigured, saveStateToCloud } from './firebase-auth.js';

const STORAGE_KEY = 'español_state';

const DEFAULT_STATE = {
  lang: 'en',        // source language: en, zh, ja
  level: 'a1',
  dark: false,
  unit: 1,           // current unit within level
  streak: 0,
  lastDay: null,
  lastReviewPrompt: null,
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
