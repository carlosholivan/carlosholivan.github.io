// Speaking & listening practice, per level: 1) dictation (hear a sentence, type it), 2) pronunciation (read it aloud,
// the browser's speech recognition checks it), 3) guided role-play conversations with the Gemini tutor.
// Sentences come from the level's example sentences (data/<level>/examples.json), which have recorded audio.
// Same file in every app; the language comes from CFG.id.
import { S, update } from '../state.js?v=202611261740';
import { register } from '../router.js?v=202611261740';
import { LEVELS, levelLabel } from '../levels.js?v=202611261740';
import { header, bottomNav } from '../ui/components.js?v=202611261740';
import { speak, stop } from '../audio.js?v=202611261740';
import { CFG } from '../app-config.js?v=202611261740';
import { chatGemini, tutorKey, errText, thinkingHTML } from '../tutor.js?v=202611261740';

const APP = CFG.id;
const LANG = { espanol: ['es-ES', 'Spanish'], english: ['en-GB', 'English'], francais: ['fr-FR', 'French'], deutsch: ['de-DE', 'German'],
  chino: ['zh-CN', 'Mandarin Chinese (simplified characters)'], nihongo: ['ja-JP', 'Japanese'], arabic: ['ar-SA', 'Modern Standard Arabic'] }[APP] || ['en-GB', 'English'];
const CJK = APP === 'chino' || APP === 'nihongo';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L = o => (o && (o[S.lang] || (S.lang === 'es' ? o.es : o.en) || o.es)) || '';
const UI_NAME = { es: 'Spanish', en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Simplified Chinese' }[S.lang] || 'English';

const TX = {
  title: { es: 'Hablar y escuchar', en: 'Speaking & listening' },
  intro: { es: 'Practica el oído, la pronunciación y la conversación con frases y situaciones de tu nivel.', en: 'Practise listening, pronunciation and conversation with sentences and situations at your level.' },
  dict: { es: 'Dictado', en: 'Dictation' }, pron: { es: 'Pronunciación', en: 'Pronunciation' }, conv: { es: 'Conversación', en: 'Conversation' },
  dictHint: { es: 'Escucha la frase y escríbela tal como la oyes.', en: 'Listen to the sentence and type it as you hear it.' },
  dictCJK: { es: 'Escucha la frase y escríbela con el teclado del idioma (caracteres o kana).', en: 'Listen and type it with that language’s keyboard (characters or kana).' },
  typeHere: { es: 'Escribe lo que oyes…', en: 'Type what you hear…' },
  again: { es: 'Otra vez', en: 'Again' }, check: { es: 'Comprobar', en: 'Check' }, skip: { es: 'Saltar', en: 'Skip' },
  hint: { es: 'Pista', en: 'Hint' }, next: { es: 'Siguiente', en: 'Next' }, retry: { es: 'Repetir', en: 'Try again' },
  listen: { es: 'Escuchar', en: 'Listen' },
  pronHint: { es: 'Lee la frase en voz alta. Pulsa el micrófono, habla y espera a que termine.', en: 'Read the sentence aloud. Tap the microphone, speak and wait for it to finish.' },
  tapMic: { es: 'Toca para hablar', en: 'Tap to speak' }, listening: { es: 'Te escucho…', en: 'Listening…' },
  heard: { es: 'He entendido', en: 'I heard' },
  micStuck: { es: 'El micrófono no responde. Comprueba que esta web tiene permiso de micrófono, cierra otras apps que lo usen y vuelve a intentarlo. En iPhone usa Safari con Siri activado; en Android, Chrome.', en: 'The microphone isn’t responding. Check this site has microphone permission, close other apps using it and try again. On iPhone use Safari with Siri enabled; on Android, Chrome.' },
  noSR: { es: 'Tu navegador no tiene reconocimiento de voz. Usa Chrome (Android, ordenador) o Safari (iPhone, con Siri activado).', en: 'Your browser has no speech recognition. Use Chrome (Android, computer) or Safari (iPhone, with Siri enabled).' },
  micDenied: { es: 'No hay permiso para usar el micrófono. Actívalo en los ajustes del navegador para esta web.', en: 'No permission to use the microphone. Allow it in the browser settings for this site.' },
  noSpeech: { es: 'No he oído nada. Acércate al micrófono y vuelve a intentarlo.', en: 'I didn’t hear anything. Get closer to the microphone and try again.' },
  great: { es: '¡Excelente!', en: 'Excellent!' }, good: { es: '¡Bien! Casi perfecto.', en: 'Good! Almost perfect.' }, meh: { es: 'Vas bien, pero repasa lo marcado.', en: 'Getting there — check the marked parts.' },
  bad: { es: 'Inténtalo otra vez.', en: 'Try again.' },
  legend: { es: 'verde = bien · ámbar = casi (tilde o letra) · rojo = falta o mal', en: 'green = right · amber = almost (accent or letter) · red = missing or wrong' },
  you: { es: 'Tú', en: 'You' },
  round: { es: 'Ronda terminada', en: 'Round finished' }, avg: { es: 'Media', en: 'Average' }, newRound: { es: 'Otra ronda', en: 'Another round' },
  done: { es: 'hechas', en: 'done' },
  convIntro: { es: 'Elige una situación. La IA hace un papel y tú conversas: escribe o pulsa el micrófono. Te corrige los errores y puedes ver la traducción.', en: 'Pick a situation. The AI plays a role and you talk: type or tap the microphone. It corrects your mistakes and you can see the translation.' },
  needKey: { es: 'Para conversar necesitas el tutor IA (Gemini) con tu clave gratuita de Google. Se configura en Ajustes en 2 minutos.', en: 'To have conversations you need the AI tutor (Gemini) with your free Google key. Set it up in Settings in 2 minutes.' },
  goSettings: { es: 'Ir a Ajustes', en: 'Go to Settings' },
  goal: { es: 'Objetivo', en: 'Goal' }, write: { es: 'Escribe tu respuesta…', en: 'Write your answer…' }, send: { es: 'Enviar', en: 'Send' },
  end: { es: 'Terminar', en: 'Finish' }, showTr: { es: 'Ver traducción', en: 'Show translation' },
  free: { es: 'Conversación libre', en: 'Free conversation' }, freeGoal: { es: 'Habla de lo que quieras: la IA te sigue el hilo.', en: 'Talk about anything: the AI follows your lead.' },
  thinking: { es: 'Pensando…', en: 'Thinking…' }, back: { es: 'Situaciones', en: 'Situations' },
  restart: { es: 'Empezar de nuevo', en: 'Start again' },
};
const tx = k => L(TX[k]);

// ---------- level, sentences ----------
const BAND = { a1: 0, a2: 1, b1: 2, b2: 3, c1: 4, c2: 5, hsk1: 0, hsk2: 1, hsk3: 2, hsk4: 3, hsk5: 4, hsk6: 5, hsk7: 5, n5: 0, n4: 1, n3: 2, n2: 3, n1: 4 };
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
let level = null, tab = 'dict';
const cache = {};

// Sentences are plain strings, or (Japanese) arrays of text and [kanji, reading] pairs.
const plain = s => Array.isArray(s) ? s.map(t => Array.isArray(t) ? t[0] : t).join('') : String(s);
const reading = s => Array.isArray(s) ? s.map(t => Array.isArray(t) ? t[1] : t).join('') : '';
const rubyHTML = s => Array.isArray(s) ? s.map(t => Array.isArray(t) ? `<ruby>${esc(t[0])}<rt>${esc(t[1])}</rt></ruby>` : esc(t)).join('') : esc(s);

async function sentences(lv) {
  if (cache[lv]) return cache[lv];
  const data = await fetch(`data/${lv}/examples.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const seen = new Set(), out = [];
  for (const list of Object.values(data)) for (const x of list || []) {
    const s = Array.isArray(x) ? x[0] : x;
    const tr = Array.isArray(x) ? x[1] : null;
    const p = plain(s).trim();
    const n = CJK ? p.length : p.split(/\s+/).length;
    if (!p || seen.has(p) || n < (CJK ? 5 : 3) || n > (CJK ? 30 : 16)) continue;
    seen.add(p);
    out.push({ s, p, tr });
  }
  return (cache[lv] = out);
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const trOf = it => it.tr ? (it.tr[S.lang] || it.tr.es || it.tr.en || '') : '';

// ---------- comparison ----------
const kata2hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function norm(s) {
  let t = String(s).normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'");
  if (APP === 'arabic') t = t.replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');
  if (APP === 'nihongo') t = kata2hira(t);
  return t.replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const base = w => w.normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss');
const toks = s => CJK ? [...norm(s).replace(/\s/g, '')] : norm(s).split(' ').filter(Boolean);

// Aligns the target with what was typed / heard (weighted LCS): 1 exact, 0.75 only accents, 0.5 one letter off.
function near(a, b) {
  if (a === b) return 1;
  if (CJK) return 0;
  if (base(a) === base(b)) return 0.75;
  if (a.length > 3 && Math.abs(a.length - b.length) <= 1) {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    let j = 0; while (j < a.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    if (i + j >= Math.max(a.length, b.length) - 1) return 0.5;
  }
  return 0;
}
function compare(targetText, said, alt = '') {
  const run = (T) => {
    const U = toks(said), n = T.length, m = U.length;
    const D = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      const v = near(T[i], U[j]);
      D[i][j] = Math.max(D[i + 1][j], D[i][j + 1], v ? v + D[i + 1][j + 1] : 0);
    }
    const marks = [];
    let i = 0, j = 0;
    while (i < n) {
      const v = j < m ? near(T[i], U[j]) : 0;
      if (j < m && v && D[i][j] === v + D[i + 1][j + 1]) { marks.push(v === 1 ? 'ok' : 'near'); i++; j++; }
      else if (j < m && D[i][j + 1] >= D[i + 1][j]) j++;
      else { marks.push('miss'); i++; }
    }
    return { score: n ? D[0][0] / n : 0, marks };
  };
  const r = run(toks(targetText));
  if (alt) { const r2 = run(toks(alt)); if (r2.score > r.score) return { ...r, score: r2.score, marks: r.marks.map(() => r2.score >= 0.95 ? 'ok' : 'near') }; }
  return r;
}
// The target sentence with each word (or character) coloured by the result.
function marked(text, marks) {
  const parts = CJK ? [...String(text)] : String(text).split(/(\s+)/);
  let k = 0;
  return parts.map(p => {
    if (/^\s+$/.test(p) || !toks(p).length) return esc(p);
    const cls = marks[k++] || 'miss';
    return `<span class="sp-${cls}">${esc(p)}</span>`;
  }).join('');
}
const verdict = sc => sc >= 0.95 ? tx('great') : sc >= 0.8 ? tx('good') : sc >= 0.5 ? tx('meh') : tx('bad');
const pct = sc => Math.round(sc * 100);

function count(kind) {
  const pr = { ...(S.practice || {}) };
  const lv = { ...(pr[level] || {}) };
  lv[kind] = (lv[kind] || 0) + 1;
  pr[level] = lv;
  update({ practice: pr });
}

// ---------- speech recognition ----------
// In the browser: Web Speech API (Chrome, Safari). In the native app (Capacitor) the WebView has no Web Speech API,
// so the plugin @capacitor-community/speech-recognition is used instead (the phone's own recognizer; see
// idiomas/NATIVE_APP.md). Both return a list of alternatives for the last utterance.
let rec = null, nativeStop = null, forceEnd = null;
const NATIVE = () => (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition) || null;
const canListen = () => !!(NATIVE() || SR);
function stopListening() { try { nativeStop ? nativeStop() : forceEnd ? forceEnd() : rec && rec.stop(); } catch (e) {} }
function abortListening() { try { nativeStop ? nativeStop() : rec && rec.abort(); } catch (e) {} rec = null; forceEnd = null; }

async function listenNative(P, onInterim) {
  const av = await P.available().catch(() => ({ available: false }));
  if (!av || !av.available) throw new Error('nosr');
  let perm = await P.checkPermissions().catch(() => ({}));
  if (perm.speechRecognition !== 'granted') perm = await P.requestPermissions().catch(() => ({}));
  if (perm.speechRecognition !== 'granted') throw new Error('not-allowed');
  return new Promise((resolve, reject) => {
    let matches = [], timer = null, done = false;
    const finish = async () => {
      if (done) return;
      done = true; clearTimeout(timer); nativeStop = null;
      try { await P.stop(); } catch (e) {}
      try { await P.removeAllListeners(); } catch (e) {}
      resolve(matches);
    };
    // iOS keeps listening until told to stop: stop after a short silence (or 10 s with nothing heard).
    const quiet = ms => { clearTimeout(timer); timer = setTimeout(finish, ms); };
    nativeStop = finish;
    Promise.all([
      P.addListener('partialResults', d => { if (d && d.matches && d.matches.length) { matches = d.matches; onInterim && onInterim(matches[0]); quiet(1600); } }),
      P.addListener('listeningState', d => { if (d && d.status === 'stopped') setTimeout(finish, 400); }),
    ]).then(() => {
      quiet(10000);
      return P.start({ language: LANG[0], maxResults: 4, partialResults: true, popup: false });
    }).then(r => { if (r && r.matches && r.matches.length) { matches = r.matches; finish(); } })
      .catch(e => { if (!done) { done = true; clearTimeout(timer); nativeStop = null; reject(new Error((e && e.message) || 'error')); } });
  });
}

function listen(onInterim) {
  stop();
  abortListening();
  const P = NATIVE();
  if (P) return listenNative(P, onInterim);
  // Some phones never fire the end events (the recognizer hangs): a watchdog always settles the promise, so the
  // microphone button can never stay stuck. Listening lasts at most 15 s; tapping the button again ends it.
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('nosr'));
    const r = rec = new SR();
    r.lang = LANG[0];
    r.interimResults = true;
    r.maxAlternatives = 4;
    r.continuous = false;
    let alts = [], last = '', done = false, started = false;
    const timers = [];
    const finish = (err) => {
      if (done) return;
      done = true; timers.forEach(clearTimeout); forceEnd = null;
      if (rec === r) rec = null;
      try { r.abort(); } catch (e) {}
      if (err && !alts.length && !last) reject(err); else resolve(alts.length ? alts : last ? [last] : []);
    };
    const soft = () => { try { r.stop(); } catch (e) {} timers.push(setTimeout(() => finish(), 1500)); };
    forceEnd = soft;
    r.onstart = () => { started = true; };
    r.onresult = e => {
      const res = e.results[e.results.length - 1];
      last = [...e.results].map(x => x[0].transcript).join(' ');
      onInterim && onInterim(last);
      if (res.isFinal) { alts = [...res].map(a => a.transcript); timers.push(setTimeout(() => finish(), 800)); }
    };
    r.onerror = e => finish(new Error(e.error || 'error'));
    r.onend = () => finish();
    timers.push(setTimeout(() => { if (!started) finish(new Error('start-timeout')); }, 4000));
    timers.push(setTimeout(soft, 15000));
    try { r.start(); } catch (e) { finish(e); }
  });
}
const srError = e => e.message === 'nosr' ? tx('noSR') : /not-allowed|service-not-allowed|permission/i.test(e.message) ? tx('micDenied') : /no-speech|aborted/.test(e.message) ? tx('noSpeech') : /start-timeout|audio-capture|network/.test(e.message) ? tx('micStuck') : esc(e.message);

// ---------- view ----------
let root = null;
register('speak', async (el, params = {}) => {
  root = el;
  if (!level || params.level) level = params.level || (LEVELS.includes(S.level) ? S.level : LEVELS[0]);
  if (params.tab) tab = params.tab;
  css();
  shell();
});

function shell() {
  const pr = (S.practice || {})[level] || {};
  root.innerHTML = `<div class="fade sp" style="padding-bottom:110px">
    ${header(tx('title'), true)}
    <div class="muted small mb-12">${tx('intro')}</div>
    <div class="flex gap-8 mb-12" style="flex-wrap:wrap">${LEVELS.map(l => `<button class="chip ${l === level ? 'on' : ''}" onclick="window.__spLv('${l}')">${levelLabel(l)}</button>`).join('')}</div>
    <div class="sp-tabs mb-16">${[['dict', '🎧'], ['pron', '🗣️'], ['conv', '💬']].map(([k, i]) =>
      `<button class="${tab === k ? 'on' : ''}" onclick="window.__spTab('${k}')"><span>${i}</span>${tx(k)}${pr[k[0]] ? `<small>${pr[k[0]]} ${tx('done')}</small>` : ''}</button>`).join('')}</div>
    <div id="sp-body"></div>
  </div>${bottomNav('home')}`;
  if (tab === 'dict') dictation(true);
  else if (tab === 'pron') pronunciation(true);
  else conversation();
}
window.__spLv = l => { level = l; stopAll(); round = null; chat = null; shell(); };
window.__spTab = k => { tab = k; stopAll(); round = null; shell(); };
function stopAll() { stop(); abortListening(); }
const body = () => root.querySelector('#sp-body');

// ---------- 1. dictation & 2. pronunciation share a 10-sentence round ----------
let round = null;
async function newRound(kind) {
  const all = await sentences(level);
  round = { kind, items: shuffle(all.slice()).slice(0, 10), i: 0, scores: [] };
}
const cur = () => round.items[round.i];
const roundHead = () => `<div class="sp-count muted small">${round.i + 1} / ${round.items.length}</div>`;

async function dictation(fresh) {
  if (fresh || !round || round.kind !== 'dict') await newRound('dict');
  if (!round.items.length) return (body().innerHTML = '<div class="card muted">—</div>');
  if (round.i >= round.items.length) return summary();
  const it = cur();
  body().innerHTML = `<div class="card sp-card">
    ${roundHead()}
    <div class="muted small mb-12">${tx(CJK ? 'dictCJK' : 'dictHint')}</div>
    <div class="flex gap-8 mb-12" style="justify-content:center">
      <button class="sp-play" onclick="window.__spSay()">🔊</button>
    </div>
    <textarea id="sp-in" class="sp-in" rows="2" lang="${LANG[0]}" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="${tx('typeHere')}"></textarea>
    <div id="sp-hint" class="muted small mt-8"></div>
    <div id="sp-res"></div>
    <div class="flex gap-8 mt-12 sp-btns" id="sp-acts">
      <button class="btn btn-soft" onclick="window.__spHint()">💡 ${tx('hint')}</button>
      <button class="btn btn-soft" onclick="window.__spNext(true)">${tx('skip')}</button>
      <button class="btn btn-primary" onclick="window.__spCheck()">${tx('check')}</button>
    </div>
  </div>`;
  const inp = body().querySelector('#sp-in');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.__spCheck(); } });
  setTimeout(() => speak(it.p), 250);
}
window.__spSay = () => round && speak(cur().p);
window.__spHint = () => {
  const it = cur(), h = body().querySelector('#sp-hint');
  if (!h) return;
  const first = CJK ? it.p.slice(0, 2) + '…' : it.p.split(/\s+/)[0] + ' …';
  h.innerHTML = `${esc(trOf(it))}${trOf(it) ? ' · ' : ''}<b>${esc(first)}</b>`;
};
window.__spCheck = () => {
  const it = cur(), v = body().querySelector('#sp-in').value;
  if (!v.trim()) return;
  const r = compare(it.p, v, APP === 'nihongo' ? reading(it.s) : '');
  round.scores.push(r.score);
  count('d');
  showResult(it, r, v, 'dict');
};
window.__spNext = (skip) => { if (skip) round.scores.push(0); round.i++; tab === 'dict' ? dictation() : pronunciation(); };

function showResult(it, r, said, kind) {
  const res = body().querySelector('#sp-res');
  res.innerHTML = `<div class="sp-result ${r.score >= 0.8 ? 'good' : r.score >= 0.5 ? 'mid' : 'low'}">
    <div class="sp-score">${pct(r.score)}%</div><div class="sp-verdict">${verdict(r.score)}</div>
    <div class="sp-target" lang="${LANG[0]}">${APP === 'nihongo' && Array.isArray(it.s) && kind === 'dict' ? rubyHTML(it.s) + '<br>' : ''}${marked(it.p, r.marks)}</div>
    ${said ? `<div class="muted small mt-8">${kind === 'pron' ? tx('heard') : tx('you')}: «${esc(said)}»</div>` : ''}
    ${trOf(it) ? `<div class="muted small mt-8">${esc(trOf(it))}</div>` : ''}
    <div class="muted small mt-8 sp-legend">${tx('legend')}</div>
  </div>`;
  const acts = body().querySelector('#sp-acts');
  acts.innerHTML = kind === 'dict'
    ? `<button class="btn btn-soft" onclick="window.__spSay()">🔊 ${tx('listen')}</button><button class="btn btn-primary" onclick="window.__spNext()">${tx('next')}</button>`
    : `<button class="btn btn-soft" onclick="window.__spRetry()">${tx('retry')}</button><button class="btn btn-primary" onclick="window.__spNext()">${tx('next')}</button>`;
}

async function pronunciation(fresh) {
  if (fresh || !round || round.kind !== 'pron') await newRound('pron');
  if (!round.items.length) return (body().innerHTML = '<div class="card muted">—</div>');
  if (round.i >= round.items.length) return summary();
  const it = cur();
  body().innerHTML = `<div class="card sp-card">
    ${roundHead()}
    ${canListen() ? `<div class="muted small mb-12">${tx('pronHint')}</div>` : `<div class="sp-warn mb-12">${tx('noSR')}</div>`}
    <div class="sp-say" lang="${LANG[0]}" dir="auto">${rubyHTML(it.s)}</div>
    ${trOf(it) ? `<div class="muted small mt-8">${esc(trOf(it))}</div>` : ''}
    <div class="flex gap-12 mt-16" style="justify-content:center;align-items:center">
      <button class="sp-play sm" onclick="window.__spSay()" title="${tx('listen')}">🔊</button>
      <button class="sp-mic" id="sp-mic" onclick="window.__spMic()" ${canListen() ? '' : 'disabled'}>${micSVG}</button>
    </div>
    <div class="muted small mt-8" id="sp-live" style="text-align:center">${canListen() ? tx('tapMic') : ''}</div>
    <div id="sp-res"></div>
    <div class="flex gap-8 mt-12 sp-btns" id="sp-acts">
      <button class="btn btn-soft" onclick="window.__spNext(true)">${tx('skip')}</button>
    </div>
  </div>`;
}
window.__spRetry = () => pronunciation();
window.__spMic = async () => {
  const it = cur(), mic = body().querySelector('#sp-mic'), live = body().querySelector('#sp-live');
  if (!mic || mic.classList.contains('on')) { stopListening(); return; }
  mic.classList.add('on'); live.textContent = tx('listening');
  try {
    const alts = await listen(t => { live.textContent = t; });
    mic.classList.remove('on');
    if (!alts.length) { live.textContent = tx('noSpeech'); return; }
    const alt = APP === 'nihongo' ? reading(it.s) : '';
    let best = null, said = '';
    for (const a of alts) { const r = compare(it.p, a, alt); if (!best || r.score > best.score) { best = r; said = a; } }
    live.textContent = '';
    round.scores[round.i] = Math.max(round.scores[round.i] || 0, best.score);
    count('p');
    showResult(it, best, said, 'pron');
  } catch (e) {
    mic.classList.remove('on');
    live.innerHTML = `<span style="color:var(--no)">${srError(e)}</span>`;
  }
};

function summary() {
  const sc = round.scores.filter(x => x != null);
  const avg = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0;
  body().innerHTML = `<div class="card sp-card" style="text-align:center">
    <div style="font-size:40px">🎉</div>
    <div class="h3 mt-8">${tx('round')}</div>
    <div class="sp-score mt-8">${pct(avg)}%</div><div class="muted">${tx('avg')}</div>
    <button class="btn btn-primary mt-16" onclick="window.__spTab('${round.kind}')">${tx('newRound')}</button>
  </div>`;
}

// ---------- 3. conversation ----------
const SCEN = [
  [ // A1
    ['☕', { es: 'Pedir en una cafetería', en: 'Ordering at a café' }, 'a waiter in a café', { es: 'Pide una bebida y algo de comer, y pregunta cuánto es.', en: 'Order a drink and something to eat, and ask how much it is.' }],
    ['👋', { es: 'Presentarte', en: 'Introducing yourself' }, 'a new classmate on the first day of a language course', { es: 'Di cómo te llamas, de dónde eres, y pregúntale lo mismo.', en: 'Say your name and where you are from, and ask the same.' }],
    ['🛍️', { es: 'En una tienda de ropa', en: 'In a clothes shop' }, 'a shop assistant in a clothes shop', { es: 'Pide una camiseta de tu talla y color, y paga.', en: 'Ask for a T-shirt in your size and colour, and pay.' }],
    ['📍', { es: 'Preguntar el camino', en: 'Asking the way' }, 'a friendly passer-by in the street', { es: 'Averigua cómo llegar a la estación.', en: 'Find out how to get to the station.' }],
    ['👤', { es: 'Hablar de tu familia', en: 'Talking about your family' }, 'a friendly new neighbour', { es: 'Describe a tu familia y pregunta por la suya.', en: 'Describe your family and ask about theirs.' }],
    ['🕒', { es: 'Quedar con un amigo', en: 'Making plans with a friend' }, 'a friend', { es: 'Poneos de acuerdo en el día, la hora y el sitio para veros.', en: 'Agree on a day, time and place to meet.' }],
  ],
  [ // A2
    ['🏠', { es: 'Llegar al hotel', en: 'Hotel check-in' }, 'a hotel receptionist', { es: 'Haz el check-in y pregunta por el desayuno y el wifi.', en: 'Check in and ask about breakfast and wifi.' }],
    ['🍽️', { es: 'En el restaurante', en: 'At the restaurant' }, 'a waiter in a restaurant', { es: 'Pide un menú completo, pregunta por un ingrediente y pide la cuenta.', en: 'Order a full meal, ask about an ingredient and ask for the bill.' }],
    ['🩺', { es: 'En el médico', en: 'At the doctor’s' }, 'a family doctor', { es: 'Explica qué te pasa y entiende los consejos.', en: 'Explain what is wrong and understand the advice.' }],
    ['📅', { es: 'Tu fin de semana', en: 'Your weekend' }, 'a colleague on Monday morning', { es: 'Cuenta qué hiciste el fin de semana (en pasado).', en: 'Tell what you did at the weekend (past tense).' }],
    ['🔑', { es: 'Alquilar un piso', en: 'Renting a flat' }, 'a landlord showing a flat', { es: 'Pregunta por el piso, el precio y las condiciones.', en: 'Ask about the flat, the price and the conditions.' }],
    ['✈️', { es: 'Comprar billetes', en: 'Buying tickets' }, 'a clerk at a train station ticket office', { es: 'Compra un billete de ida y vuelta para el fin de semana.', en: 'Buy a return ticket for the weekend.' }],
  ],
  [ // B1
    ['💼', { es: 'Entrevista de trabajo', en: 'Job interview' }, 'a job interviewer at a company', { es: 'Habla de tu experiencia, tus puntos fuertes y por qué quieres el puesto.', en: 'Talk about your experience, strengths and why you want the job.' }],
    ['📦', { es: 'Hacer una reclamación', en: 'Making a complaint' }, 'a customer service agent', { es: 'Reclama por un producto defectuoso y consigue una solución.', en: 'Complain about a faulty product and get a solution.' }],
    ['🧭', { es: 'Planear un viaje', en: 'Planning a trip' }, 'a travel agent', { es: 'Organiza un viaje de una semana con tu presupuesto.', en: 'Plan a one-week trip within your budget.' }],
    ['🎬', { es: 'Recomendar una película', en: 'Recommending a film' }, 'a friend who wants something to watch', { es: 'Recomienda una película o un libro y justifica por qué.', en: 'Recommend a film or book and explain why.' }],
    ['🤝', { es: 'Pedir un favor', en: 'Asking a favour' }, 'a busy colleague', { es: 'Pide ayuda con un proyecto y negocia cuándo.', en: 'Ask for help with a project and agree when.' }],
    ['🌱', { es: 'Hábitos saludables', en: 'Healthy habits' }, 'a personal trainer', { es: 'Habla de tus hábitos y ponte objetivos realistas.', en: 'Talk about your habits and set realistic goals.' }],
  ],
  [ // B2
    ['⚖️', { es: 'Debate: el teletrabajo', en: 'Debate: remote work' }, 'a colleague who strongly disagrees with you about remote work', { es: 'Defiende tu opinión con argumentos y responde a los suyos.', en: 'Defend your opinion with arguments and answer theirs.' }],
    ['🏛️', { es: 'Reunión de vecinos', en: 'Residents’ meeting' }, 'a neighbour at a residents’ meeting about noise and parking', { es: 'Propón una solución y convence a los demás.', en: 'Propose a solution and convince the others.' }],
    ['📰', { es: 'Comentar una noticia', en: 'Discussing the news' }, 'a friend who has just read a surprising science news story', { es: 'Comenta la noticia, da tu opinión y haz hipótesis.', en: 'Discuss the story, give your view and speculate.' }],
    ['💶', { es: 'Negociar un precio', en: 'Negotiating a price' }, 'a seller of a second-hand car', { es: 'Negocia un buen precio y las condiciones.', en: 'Negotiate a good price and the conditions.' }],
    ['🎓', { es: 'Elegir estudios', en: 'Choosing what to study' }, 'a university admissions adviser', { es: 'Compara opciones, pros y contras, y decide.', en: 'Compare options, pros and cons, and decide.' }],
    ['🌿', { es: 'Medio ambiente', en: 'The environment' }, 'a journalist interviewing people in the street about the environment', { es: 'Responde y argumenta qué debería cambiar.', en: 'Answer and argue what should change.' }],
  ],
  [ // C1
    ['🎯', { es: 'Presentar un proyecto', en: 'Pitching a project' }, 'a demanding investor', { es: 'Presenta tu idea y responde a las objeciones.', en: 'Pitch your idea and handle the objections.' }],
    ['🧠', { es: 'Felicidad y éxito', en: 'Happiness and success' }, 'a thoughtful friend who enjoys philosophical conversations', { es: 'Debatid si el éxito da la felicidad, con matices.', en: 'Discuss whether success brings happiness, with nuance.' }],
    ['🤝', { es: 'Resolver un conflicto', en: 'Resolving a conflict' }, 'an upset colleague who feels ignored in a project', { es: 'Calma la situación con tacto y llegad a un acuerdo.', en: 'Calm things down tactfully and reach an agreement.' }],
    ['📚', { es: 'Club de lectura', en: 'Book club' }, 'a member of a book club', { es: 'Analiza los temas y personajes de una novela que hayas leído.', en: 'Analyse the themes and characters of a novel you have read.' }],
    ['🔬', { es: 'Ciencia y ética', en: 'Science and ethics' }, 'a researcher in artificial intelligence', { es: 'Debatid los límites éticos de la tecnología.', en: 'Discuss the ethical limits of technology.' }],
    ['🏛️', { es: 'Mejorar tu ciudad', en: 'Improving your city' }, 'a city councillor collecting proposals from citizens', { es: 'Defiende una propuesta concreta para tu ciudad.', en: 'Argue for a specific proposal for your city.' }],
  ],
  [ // C2
    ['🎭', { es: 'Humor e ironía', en: 'Humour and irony' }, 'a witty friend who loves wordplay, idioms and irony', { es: 'Sigue la conversación con humor, ironía y expresiones idiomáticas.', en: 'Keep up the conversation with humour, irony and idioms.' }],
    ['🕊️', { es: 'Negociación diplomática', en: 'Diplomatic negotiation' }, 'a diplomat from another country', { es: 'Llegad a un compromiso con un lenguaje matizado y cortés.', en: 'Reach a compromise using nuanced, courteous language.' }],
    ['📢', { es: 'Entrevista en la radio', en: 'Radio interview' }, 'a sharp radio host', { es: 'Responde como experto en un tema que elijas.', en: 'Answer as an expert on a topic of your choice.' }],
    ['✍️', { es: 'Defender una tesis', en: 'Defending a thesis' }, 'a tough examiner on a thesis committee', { es: 'Defiende tu tesis ante preguntas difíciles.', en: 'Defend your thesis under difficult questions.' }],
    ['🍽️', { es: 'Cena formal', en: 'Formal dinner' }, 'a distinguished host at a formal dinner', { es: 'Conversa con el registro adecuado y referencias culturales.', en: 'Make conversation with the right register and cultural references.' }],
    ['🧩', { es: 'Un dilema moral', en: 'A moral dilemma' }, 'a partner deciding together on a complex ethical dilemma', { es: 'Analizad el dilema desde varios puntos de vista y decidid.', en: 'Analyse the dilemma from several angles and decide.' }],
  ],
];
const FREE = ['💬', TX.free, 'a friendly native speaker who chats about anything', TX.freeGoal];

let chat = null;    // { sc, msgs: [{role, text}], busy }
function conversation() {
  if (chat) return chatView();
  const band = BAND[level] ?? 0;
  if (!tutorKey()) {
    body().innerHTML = `<div class="card sp-card"><div class="mb-12">${tx('needKey')}</div>
      <button class="btn btn-primary" onclick="window.__nav('settings')">${tx('goSettings')}</button></div>`;
    return;
  }
  body().innerHTML = `<div class="muted small mb-12">${tx('convIntro')}</div>
    <div class="sp-scens">${[...SCEN[band], FREE].map((s, i) => `<button class="card sp-scen" onclick="window.__spScen(${i})">
      <span class="sp-scen-i">${s[0]}</span><span><b>${esc(L(s[1]))}</b><br><span class="muted small">${esc(L(s[3]))}</span></span></button>`).join('')}</div>`;
}
window.__spScen = i => {
  const band = BAND[level] ?? 0;
  chat = { sc: [...SCEN[band], FREE][i], msgs: [], busy: false };
  chatView();
  reply();
};

function sysPrompt() {
  const band = CEFR[BAND[level] ?? 0], [ico, title, role, goal] = chat.sc;
  const helper = APP === 'chino' && (BAND[level] ?? 0) <= 3 ? `\n- After your reply, add a line starting with "🔤 " with the pinyin (tone marks) of your reply.`
    : APP === 'nihongo' && (BAND[level] ?? 0) <= 2 ? `\n- After your reply, add a line starting with "🔤 " with your reply written in hiragana.` : '';
  return `You are a role-play conversation partner for a learner of ${LANG[1]} at CEFR level ${band} (${levelLabel(level)}).
Your role: ${role}. Scene: ${L(title)}. The learner's goal: ${goal.en}.
Rules:
- Speak ONLY ${LANG[1]} in your in-character reply: 1–3 short, natural sentences, with vocabulary and grammar suitable for ${band}. Stay in character and end with a question or a prompt that moves the scene forward.
- Start the conversation yourself with a natural opening line for the scene.${helper}
- Then add a line starting with "🌐 " with a translation of your reply into ${UI_NAME}.
- If the learner's last message has mistakes (grammar, vocabulary, spelling, unnatural phrasing), add a line starting with "✏️ " in ${UI_NAME}: give the corrected sentence in ${LANG[1]} and a very short explanation. If it was correct, do not add this line. If they wrote in another language, encourage them (in ${UI_NAME}) to try in ${LANG[1]} and give them a model sentence.
- When the goal has been achieved (or after about 10 exchanges), add a final line starting with "🏁 " in ${UI_NAME}: congratulate them briefly and give 2 concrete tips to improve.
- No markdown, no lists, no headings. Keep each line short.`;
}
function parse(text) {
  const out = { say: [], tr: '', fix: '', end: '', aux: '' };
  for (const line of String(text).split('\n').map(x => x.trim()).filter(Boolean)) {
    if (/^🌐/.test(line)) out.tr += line.replace(/^🌐\s*/, '') + ' ';
    else if (/^✏️?/.test(line)) out.fix += line.replace(/^✏️?\s*/, '') + ' ';
    else if (/^🏁/.test(line)) out.end += line.replace(/^🏁\s*/, '') + ' ';
    else if (/^🔤/.test(line)) out.aux += line.replace(/^🔤\s*/, '') + ' ';
    else out.say.push(line.replace(/^\*+|\*+$/g, ''));
  }
  out.say = out.say.join(' ');
  return out;
}

function chatView() {
  const [ico, title, , goal] = chat.sc;
  body().innerHTML = `<div class="card sp-card sp-chat">
    <div class="flex items-center justify-between mb-8"><b>${ico} ${esc(L(title))}</b>
      <button class="btn btn-soft btn-small" onclick="window.__spEnd()">${tx('back')}</button></div>
    <div class="muted small mb-12">🎯 ${tx('goal')}: ${esc(L(goal))}</div>
    <div class="sp-log" id="sp-log">${chat.msgs.map(bubble).join('')}${chat.busy ? `<div class="sp-b ai">${thinkingHTML()}</div>` : ''}</div>
    <div class="sp-compose">
      <button class="sp-mic sm" id="sp-cmic" onclick="window.__spDictate()" ${canListen() ? '' : 'disabled'} title="${tx('tapMic')}">${micSVG}</button>
      <textarea id="sp-msg" rows="1" lang="${LANG[0]}" dir="auto" placeholder="${tx('write')}"></textarea>
      <button class="btn btn-primary" onclick="window.__spSend()" ${chat.busy ? 'disabled' : ''}>${tx('send')}</button>
    </div>
    <div id="sp-cerr" class="small mt-8"></div>
  </div>`;
  const ta = body().querySelector('#sp-msg');
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.__spSend(); } });
  const log = body().querySelector('#sp-log');
  log.scrollTop = log.scrollHeight;
}
function bubble(m, i) {
  if (m.role === 'user') return `<div class="sp-b me" dir="auto">${esc(m.text)}</div>`;
  const p = parse(m.text);
  return `<div class="sp-b ai">
    <div class="sp-say-line" lang="${LANG[0]}" dir="auto">${esc(p.say)} <button class="sp-mini" onclick="window.__spSpeak(${i})">🔊</button></div>
    ${p.aux ? `<div class="sp-aux">${esc(p.aux)}</div>` : ''}
    ${p.tr ? `<details class="sp-tr"><summary>${tx('showTr')}</summary>${esc(p.tr)}</details>` : ''}
    ${p.fix ? `<div class="sp-fix">✏️ ${esc(p.fix)}</div>` : ''}
    ${p.end ? `<div class="sp-endnote">🏁 ${esc(p.end)}</div>` : ''}
  </div>`;
}
window.__spSpeak = i => { const m = chat && chat.msgs[i]; if (m) speak(parse(m.text).say); };
window.__spEnd = () => { stopAll(); chat = null; shell(); };
window.__spSend = () => {
  const ta = body().querySelector('#sp-msg');
  const v = ta && ta.value.trim();
  if (!v || chat.busy) return;
  chat.msgs.push({ role: 'user', text: v });
  reply();
};
window.__spDictate = async () => {
  const b = body().querySelector('#sp-cmic'), ta = body().querySelector('#sp-msg'), err = body().querySelector('#sp-cerr');
  if (b.classList.contains('on')) { stopListening(); return; }
  b.classList.add('on'); err.textContent = '';
  const before = ta.value ? ta.value + ' ' : '';
  try {
    const alts = await listen(t => { ta.value = before + t; });
    if (alts[0]) ta.value = before + alts[0];
  } catch (e) { err.innerHTML = `<span style="color:var(--no)">${srError(e)}</span>`; }
  b.classList.remove('on');
};
async function reply() {
  chat.busy = true;
  chatView();
  const contents = chat.msgs.length
    ? chat.msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
    : [{ role: 'user', parts: [{ text: '(Start the scene.)' }] }];
  if (contents[0].role === 'model') contents.unshift({ role: 'user', parts: [{ text: '(Start the scene.)' }] });
  const me = chat;
  try {
    const out = await chatGemini(contents, sysPrompt());
    if (me !== chat) return;
    chat.msgs.push({ role: 'model', text: out });
    chat.busy = false;
    if (chat.msgs.filter(m => m.role === 'user').length === 1) count('c');
    chatView();
    speak(parse(out).say);
  } catch (e) {
    if (me !== chat) return;
    chat.busy = false;
    chatView();
    body().querySelector('#sp-cerr').innerHTML = `<span style="color:var(--no)">${esc(errText(e))}</span>`;
  }
}

const micSVG = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/></svg>`;

function css() {
  if (document.getElementById('sp-css')) return;
  const s = document.createElement('style');
  s.id = 'sp-css';
  s.textContent = `
.sp-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sp-tabs button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 6px;border-radius:16px;border:1px solid var(--line);background:var(--bg2);color:var(--ink);font:inherit;font-weight:600;font-size:14px;cursor:pointer}
.sp-tabs button span{font-size:22px}.sp-tabs button small{font-weight:400;color:var(--ink2);font-size:11px}
.sp-tabs button.on{border:2px solid var(--accent);background:var(--soft)}
.sp-card{padding:18px}.sp-count{text-align:right;margin-bottom:4px}
.sp-play{width:72px;height:72px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:30px;cursor:pointer;box-shadow:var(--shadow)}
.sp-play.sm{width:52px;height:52px;font-size:22px;background:var(--soft);color:var(--ink)}
.sp-in{width:100%;box-sizing:border-box;font:inherit;font-size:18px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--ink);resize:vertical}
.sp-btns{justify-content:flex-end;flex-wrap:wrap}
.sp-result{margin-top:14px;padding:14px;border-radius:14px;background:var(--soft)}
.sp-result.good{box-shadow:inset 4px 0 0 var(--ok)}.sp-result.mid{box-shadow:inset 4px 0 0 var(--gold)}.sp-result.low{box-shadow:inset 4px 0 0 var(--no)}
.sp-score{font-size:30px;font-weight:800;color:var(--accent)}.sp-verdict{font-weight:700;margin-bottom:8px}
.sp-target{font-size:19px;line-height:1.7}
.sp-ok{color:var(--ok);font-weight:600}.sp-near{color:#b8860b;font-weight:600;text-decoration:underline dotted}.sp-miss{color:var(--no);font-weight:600;text-decoration:underline}
.sp-say{font-size:22px;line-height:1.8;text-align:center;font-family:var(--serif)}
.sp-say rt{font-size:.5em;color:var(--ink2)}
.sp-mic{width:84px;height:84px;border-radius:50%;border:none;background:var(--accent);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow);flex:none}
.sp-mic.sm{width:44px;height:44px}.sp-mic.sm svg{width:22px;height:22px}
.sp-mic[disabled]{opacity:.4}
.sp-mic.on{background:var(--no);animation:spPulse 1.1s infinite}
@keyframes spPulse{0%,100%{box-shadow:0 0 0 0 rgba(181,101,79,.45)}50%{box-shadow:0 0 0 14px rgba(181,101,79,0)}}
.sp-warn{padding:10px 12px;border-radius:12px;background:var(--soft);color:var(--no);font-size:14px}
.sp-scens{display:grid;gap:10px}
.sp-scen{display:flex;gap:14px;align-items:flex-start;text-align:left;padding:14px;cursor:pointer;font:inherit;color:inherit;border:1px solid var(--line);width:100%}
.sp-scen-i{font-size:26px;line-height:1}
.sp-log{max-height:52vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px 0 10px}
.sp-b{max-width:88%;padding:10px 12px;border-radius:16px;line-height:1.5}
.sp-b.me{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px}
.sp-b.ai{align-self:flex-start;background:var(--soft);border-bottom-left-radius:4px}
.sp-say-line{font-size:17px}.sp-aux{font-size:13px;color:var(--ink2);margin-top:4px}
.sp-mini{border:none;background:none;cursor:pointer;font-size:16px;padding:0 2px;color:inherit}
.sp-tr{margin-top:6px;font-size:13px;color:var(--ink2)}.sp-tr summary{cursor:pointer;color:var(--accent);font-weight:600}
.sp-fix{margin-top:8px;font-size:13px;padding:8px 10px;border-radius:10px;background:var(--bg2);border-left:3px solid var(--gold)}
.sp-endnote{margin-top:8px;font-size:13px;padding:8px 10px;border-radius:10px;background:var(--bg2);border-left:3px solid var(--ok)}
.sp-compose{display:flex;gap:8px;align-items:flex-end;border-top:1px solid var(--line);padding-top:10px}
.sp-compose textarea{flex:1;font:inherit;font-size:16px;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--ink);resize:none;min-height:44px;max-height:120px}`;
  document.head.appendChild(s);
}
