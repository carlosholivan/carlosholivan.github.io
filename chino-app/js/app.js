import { S, mergeCloudState, reset, save, cloudError } from './state.js?v=202611130800';
import { go } from './router.js?v=202611130800';
import { initFirebase, isConfigured, onAuthChange, loadStateFromCloud, saveStateToCloud, isVerified } from './firebase-auth.js?v=202611130800';

import './views/home.js?v=202611130800';
import './views/lesson.js?v=202611130800';
import './views/review.js?v=202611130800';
import './views/progress.js?v=202611130800';
import './views/settings.js?v=202611130800';
import './views/reference.js?v=202611130800';
import './views/daily-review.js?v=202611130800';
import './views/auth.js?v=202611130800';
import './views/texts.js?v=202611130800';
import './views/drills.js?v=202611130800';
import './views/hanzi.js?v=202611130800';
import './views/pron.js?v=202611130800';
import './views/vocablist.js?v=202611130800';
import './views/ranking.js?v=202611130800';
import { enterApp } from './views/welcome.js?v=202611130800';
import { applyPinyinPref } from './zh.js?v=202611130800';

if (S.dark) document.body.classList.add('dark');
applyPinyinPref();
window.__go = (v, p) => go(v, p);
window.__sylPlay = (c) => import('./audio.js?v=202611130800').then(a => a.speak(c));

window.__nav = (view) => go(view);
window.__back = () => { import('./router.js?v=202611130800').then(r => r.back()); };

// Loads and merges the account's progress. Local progress from a different account is discarded first.
window.__signedIn = async (user) => {
  if (S.uid && S.uid !== user.uid) { const keep = { lang: S.lang, dark: S.dark }; reset(); Object.assign(S, keep); }
  S.uid = user.uid;
  save(S);
  try {
    const cloud = await loadStateFromCloud();
    if (cloud) mergeCloudState(cloud);
    await saveStateToCloud(S);
  } catch (e) { cloudError(e); }
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
