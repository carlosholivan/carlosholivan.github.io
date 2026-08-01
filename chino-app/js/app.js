import { S } from './state.js';
import { go } from './router.js';
import './views/home.js';
import './views/lesson.js';
import './views/progress.js';
import './views/settings.js';

if (S.dark) document.body.classList.add('dark');

window.__nav = (view) => go(view);

go('home');
