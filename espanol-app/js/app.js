import { S, mergeCloudState } from './state.js';
import { go } from './router.js';
import { shouldShowDailyReview } from './engine/mastery.js';
import { initFirebase, isConfigured, onAuthChange, loadStateFromCloud, saveStateToCloud } from './firebase-auth.js';

import './views/home.js';
import './views/lesson.js';
import './views/review.js';
import './views/progress.js';
import './views/settings.js';
import './views/reference.js';
import './views/daily-review.js';
import './views/auth.js';

if (S.dark) document.body.classList.add('dark');

window.__nav = (view) => go(view);
window.__back = () => { import('./router.js').then(r => r.back()); };

if (isConfigured()) {
  initFirebase();
  onAuthChange(async (user) => {
    if (user) {
      try {
        const cloud = await loadStateFromCloud();
        if (cloud) {
          mergeCloudState(cloud);
        } else {
          await saveStateToCloud(S);
        }
      } catch (e) {}
      if (shouldShowDailyReview()) {
        go('daily-review');
      } else {
        go('home');
      }
    }
  });

  if (shouldShowDailyReview()) {
    go('daily-review');
  } else {
    go('home');
  }
} else {
  if (shouldShowDailyReview()) {
    go('daily-review');
  } else {
    go('home');
  }
}
