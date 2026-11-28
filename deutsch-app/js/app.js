import { S, mergeCloudState, reset, save, cloudError } from './state.js?v=202611281825';
import { go } from './router.js?v=202611281825';
import { initFirebase, isConfigured, onAuthChange, loadStateFromCloud, saveStateToCloud, isVerified } from './firebase-auth.js?v=202611281825';

import './views/home.js?v=202611281825';
import './views/lesson.js?v=202611281825';
import './views/story.js?v=202611281825';
import './views/review.js?v=202611281825';
import './views/progress.js?v=202611281825';
import './views/settings.js?v=202611281825';
import './views/reference.js?v=202611281825';
import './views/daily-review.js?v=202611281825';
import './views/auth.js?v=202611281825';
import './views/texts.js?v=202611281825';
import './views/drills.js?v=202611281825';
import './views/conj.js?v=202611281825';
import './views/topics.js?v=202611281825';
import './views/speak.js?v=202611281825';
import './plan.js?v=202611281825';
import './views/vocablist.js?v=202611281825';
import './views/ranking.js?v=202611281825';
import { enterApp } from './views/welcome.js?v=202611281825';
import { applyPinyinPref } from './es.js?v=202611281825';

if (S.dark) document.body.classList.add('dark');
applyPinyinPref();
window.__go = (v, p) => go(v, p);
window.__sylPlay = (c) => import('./audio.js?v=202611281825').then(a => a.speak(c));

window.__nav = (view, params) => go(view, params || {});
window.__back = () => { import('./router.js?v=202611281825').then(r => r.back()); };

// Loads and merges the account's progress. Local progress from a different account is discarded first.
window.__signedIn = async (user) => {
  if (S.uid && S.uid !== user.uid) { const keep = { lang: S.lang, dark: S.dark }; reset(); Object.assign(S, keep); }
  S.uid = user.uid;
  if (!S.name) { try { const n = localStorage.getItem('idiomas_name'); if (n) S.name = n; } catch (e) {} }
  try {
    save(S);
    const cloud = await loadStateFromCloud();
    if (cloud) mergeCloudState(cloud);
    // The upload must not hold the app back (a big state can take a while on a phone).
    saveStateToCloud(S).catch(cloudError);
  } catch (e) { cloudError(e); }
  enterApp();
};

// Sign-in happens once, on the shared hub page (../idiomas/): without an account session this app sends
// the learner there, unless they chose to continue without an account.
const guest = () => { try { return localStorage.getItem('idiomas_guest') === '1'; } catch (e) { return false; } };
const toHub = () => location.replace('../idiomas/?next=' + encodeURIComponent(location.pathname));
window.__toHub = toHub;

if (isConfigured()) {
  initFirebase();
  onAuthChange(async (user) => {
    if (!user || !isVerified(user)) return guest() && !user ? enterApp() : toHub();
    window.__signedIn(user);
  });
} else {
  enterApp();
}
