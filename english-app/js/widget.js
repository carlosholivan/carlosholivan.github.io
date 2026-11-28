// Home-screen widgets of the installed app: this file hands the streak and the next review words to the widgets,
// and applies the answers given on the widget ("I know it" / "Again") to the flashcard deck.
// Only does anything inside the Android app (Capacitor + Preferences plugin); in the browser it is inert.
import { S } from './state.js?v=202611282202';
import { CFG } from './app-config.js?v=202611282202';
import { buildQueue, answer } from './engine/anki.js?v=202611282202';
import { LEVELS } from './levels.js?v=202611282202';
import { loadVocab } from './data.js?v=202611282202';

const NAMES = { chino: '中文 · Chino', nihongo: '日本語 · Japonés', arabic: 'العربية · Árabe', espanol: 'Español', english: 'English · Inglés', francais: 'Français · Francés', deutsch: 'Deutsch · Alemán' };
const prefs = () => { const C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && ((C.Plugins && C.Plugins.Preferences) || (C.registerPlugin && (C.Plugins.Preferences = C.registerPlugin('Preferences')))); };
const L = m => (m && (m[S.lang] || m.es || m.en)) || '';

let vocab = null;
async function lookup(words) {
  if (!vocab) {
    vocab = new Map();
    for (const lv of LEVELS) { try { for (const v of await loadVocab(lv)) if (!vocab.has(v.word)) vocab.set(v.word, v); } catch (e) {} }
  }
  return words.map(w => { const v = vocab.get(w) || {}; return { w, p: v.p && v.p !== w ? v.p : '', m: L(v.m) }; }).filter(x => x.m);
}

// Answers given on the widget since the last time this language was opened.
async function applyAnswers(P) {
  try {
    const { value } = await P.get({ key: 'mochigo_answers' });
    const list = JSON.parse(value || '[]');
    const mine = list.filter(a => a.app === CFG.id), rest = list.filter(a => a.app !== CFG.id);
    for (const a of mine) answer(a.w, a.r === 'ok' ? 3 : 1);
    if (mine.length) await P.set({ key: 'mochigo_answers', value: JSON.stringify(rest) });
  } catch (e) {}
}

export async function syncWidget() {
  const P = prefs();
  if (!P) return;
  try {
    let words = buildQueue('v', 50, Date.now(), null, 'due');
    if (words.length < 20) words = words.concat(buildQueue('v', 30, Date.now(), null, 'extra').filter(w => !words.includes(w)));
    // nothing (or little) in the deck yet, e.g. right after installing: the words of your level, lesson by lesson
    if (words.length < 20) {
      try { const lv = (await loadVocab(S.level || LEVELS[0])).slice().sort((x, y) => (+x.unit || 0) - (+y.unit || 0));
        for (const v of lv) { if (words.length >= 50) break; if (!words.includes(v.word)) words.push(v.word); } } catch (e) {}
    }
    const cards = await lookup(words.slice(0, 50));
    await P.set({ key: 'mochigo_widget', value: JSON.stringify({ app: CFG.id, label: NAMES[CFG.id] || CFG.id, streak: S.streak || 0, lastDay: S.lastDay || '', cards, at: Date.now() }) });
  } catch (e) {}
}

(async () => {
  const P = prefs();
  if (!P) return;
  await applyAnswers(P);
  setTimeout(syncWidget, 2500);
  document.addEventListener('visibilitychange', () => { if (document.hidden) syncWidget(); else applyAnswers(P); });
})();
