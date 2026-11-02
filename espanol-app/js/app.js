import { S, mergeCloudState, reset, save } from './state.js';
import { go } from './router.js';
import { initFirebase, isConfigured, onAuthChange, loadStateFromCloud, saveStateToCloud, isVerified } from './firebase-auth.js';

import './views/home.js';
import './views/lesson.js';
import './views/review.js';
import './views/progress.js';
import './views/settings.js';
import './views/reference.js';
import './views/daily-review.js';
import './views/auth.js';
import './views/texts.js';
import './views/drills.js';
import { enterApp } from './views/welcome.js';

if (S.dark) document.body.classList.add('dark');

window.__nav = (view) => go(view);
window.__go = (view, params) => go(view, params);
window.__back = () => { import('./router.js').then(r => r.back()); };

// Loads and merges the account's progress. Local progress from a different account is discarded first.
window.__signedIn = async (user) => {
  if (S.uid && S.uid !== user.uid) { const keep = { lang: S.lang, dark: S.dark }; reset(); Object.assign(S, keep); }
  S.uid = user.uid;
  save(S);
  try {
    const cloud = await loadStateFromCloud();
    if (cloud) mergeCloudState(cloud);
    await saveStateToCloud(S);
  } catch (e) {}
  enterApp();
};

if (isConfigured()) {
  initFirebase();
  onAuthChange(async (user) => {
    if (!user) return go('auth', { mode: 'login' });
    if (!isVerified(user)) return go('verify');
    window.__signedIn(user);
  });
} else {
  go('auth', { mode: 'login' });
}
