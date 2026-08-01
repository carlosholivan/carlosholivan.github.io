const STORAGE_KEY = 'chino_state';

const DEFAULT_STATE = {
  level: 'a1',
  dark: false,
  streak: 0,
  lastDay: null,
  xp: 0,
  completed: {},
  vocab: {},
  settings: { sound: true }
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
}

export function reset() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(S, DEFAULT_STATE);
  S.completed = {};
  S.vocab = {};
}

export let S = load();

export function update(patch) {
  Object.assign(S, patch);
  save(S);
}

export function completeUnit(level, unit) {
  S.completed[`${level}-${unit}`] = true;
  S.xp += 10;
  const today = new Date().toISOString().slice(0, 10);
  if (S.lastDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    S.streak = (S.lastDay === yesterday) ? S.streak + 1 : 1;
    S.lastDay = today;
  }
  save(S);
}

export function isUnitDone(level, unit) {
  return !!S.completed[`${level}-${unit}`];
}

export function isUnitUnlocked(level, unit) {
  if (unit === 1) return true;
  return isUnitDone(level, unit - 1);
}
