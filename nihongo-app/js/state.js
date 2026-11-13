import { isConfigured, saveStateToCloud } from './firebase-auth.js?v=202611132200';

const STORAGE_KEY = 'nihongo_state';

// Older versions (or the Spanish app's data) may have left a level this app doesn't have, e.g. 'a1'.
const LEVEL_IDS = ['n5', 'n4', 'n3', 'n2', 'n1'];
function fixLevel(s) {
  if (!LEVEL_IDS.includes(s.level)) { s.level = 'n5'; s.unit = 1; }
  // Drop lesson keys from other apps (e.g. Spanish 'a1-3') that an old version copied in.
  for (const f of ['completed', 'sets']) {
    if (s[f] && Object.keys(s[f]).some(k => !/^n[1-5]-\d+$/.test(k))) {
      s[f] = Object.fromEntries(Object.entries(s[f]).filter(([k]) => /^n[1-5]-\d+$/.test(k)));
    }
  }
  s.recent = (s.recent || []).filter(k => /^n[1-5]-\d+$/.test(k));
  return s;
}

const DEFAULT_STATE = {
  lang: 'es',        // user's language: es, en, ja, ko
  name: '',
  welcomed: false,
  texts: {},         // reading texts: {id: {q: best %, gaps: bool}}
  drills: {},        // grammar drills: {'<level>-<cat>': {best: %, ok: [item indexes answered right]}}
  level: 'n5',
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
  sets: {},          // optional practice sets 2–7: { 'hsk1-3': [2, 5] }
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
    if (raw) return fixLevel({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    const old = localStorage.getItem('nm_state');
    if (old) return fixLevel(migrateOld(JSON.parse(old)));
  } catch(e) {}
  return { ...DEFAULT_STATE };
}

// Progress from the old single-file Nihongo app (nm_state): learned words and kanji become review cards.
function migrateOld(o) {
  const s = { ...DEFAULT_STATE, completed: {}, sets: {}, vocab: {}, cards: {}, hcards: {}, settings: { sound: o.sound !== false, haptics: true } };
  const now = Date.now(), DAY = 86400000;
  if (o.lang) s.lang = o.lang === 'en' ? 'en' : 'es';
  if (o.level) { s.level = String(o.level).toLowerCase(); s.levelChosen = true; }
  if (o.theme === 'dark') s.dark = true;
  if (o.newPerDay) s.newPerDay = Math.max(5, o.newPerDay);
  if (o.user && o.user.email) s.name = o.user.email.split('@')[0];
  s.streak = o.streak || 0;
  const card = (i) => ({ s: 'review', step: 0, due: now + (i % 5) * DAY, ivl: 3, ef: 2.5, reps: 1, lapses: 0, added: now });
  let i = 0;
  for (const p of Object.values(o.progress || {})) {
    for (const id of (p.vocab && p.vocab.learned) || []) if (id.startsWith('v_')) s.cards[id.slice(2)] = card(i++);
    for (const id of (p.kanji && p.kanji.learned) || []) if (id.startsWith('k_')) s.hcards[id.slice(2)] = card(i++);
  }
  if (i) { s.welcomed = true; s.cardsSeeded = true; }
  return s;
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

export const afterSync = [];
export function flushCloud() {
  clearTimeout(cloudTimer);
  cloudTimer = null;
  if (!isConfigured()) return Promise.resolve();
  return saveStateToCloud(S).then(() => { syncInfo.ok = Date.now(); syncInfo.err = null; afterSync.forEach(f => f()); }, cloudError);
}

export const syncInfo = { ok: null, err: null };

// Cloud errors were previously swallowed; show them so sync problems are visible.
export function cloudError(e) {
  console.error('Cloud sync failed:', e);
  syncInfo.err = (e && (e.code || e.message)) || String(e);
  let el = document.getElementById('cloud-err');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cloud-err';
    el.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:9999;background:#c62828;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px';
    el.onclick = () => el.remove();
    document.body.appendChild(el);
  }
  el.textContent = '☁️ ' + (e && (e.code || e.message) || e);
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cloudTimer) flushCloud(); });
addEventListener('pagehide', () => { if (cloudTimer) flushCloud(); });

export function reset() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(S, DEFAULT_STATE);
  S.completed = {};
  S.sets = {};
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
  merged.sets = { ...(cloudState.sets || {}) };
  for (const [k, v] of Object.entries(S.sets || {})) merged.sets[k] = [...new Set([...(merged.sets[k] || []), ...v])].sort((a, b) => a - b);
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
  fixLevel(merged);
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

// Any study (lessons, sets, cards) keeps the streak alive.
export function touchStreak() {
  const before = S.lastDay;
  updateStreak();
  if (S.lastDay !== before) save(S);
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

export function completeSet(level, unit, set) {
  const k = `${level}-${unit}`;
  const sets = { ...(S.sets || {}) };
  sets[k] = [...new Set([...(sets[k] || []), set])].sort((a, b) => a - b);
  S.sets = sets;
  S.xp += 5;
  updateStreak();
  save(S);
}
