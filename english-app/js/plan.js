// Daily study plan. The learner chooses "the app guides me" (a checklist for today sized to 15, 30 or 60 minutes)
// or "I study what I want" (just a daily time goal). Study time is measured while the app is open and in use,
// per screen, so each task ticks itself off when enough time has been spent on it (cards also when none are due).
import { S, update } from './state.js?v=202611281710';
import { currentName, render } from './router.js?v=202611281710';
import { deckStats } from './engine/anki.js?v=202611281710';
import { tutorKey } from './tutor.js?v=202611281710';

const L = o => (o && (o[S.lang] || (S.lang === 'es' ? o.es : o.en) || o.es)) || '';
const day = () => new Date().toLocaleDateString('sv');   // local YYYY-MM-DD

const TX = {
  how: { es: '¿Cómo quieres estudiar?', en: 'How do you want to study?' },
  howSub: { es: 'Puedes cambiarlo cuando quieras en Ajustes.', en: 'You can change it any time in Settings.' },
  guided: { es: 'La app me guía', en: 'The app guides me' },
  guidedSub: { es: 'Cada día te preparo un plan: tarjetas, lección, lectura y práctica oral.', en: 'Every day I prepare a plan for you: cards, lesson, reading and speaking.' },
  free: { es: 'Estudio yo lo que quiero', en: 'I study what I want' },
  freeSub: { es: 'Tú eliges qué hacer; yo llevo la cuenta del tiempo.', en: 'You choose what to do; I keep track of the time.' },
  perDay: { es: 'Tiempo al día', en: 'Time per day' },
  h1: { es: '1 hora', en: '1 hour' },
  start: { es: 'Empezar', en: 'Start' }, save: { es: 'Guardar', en: 'Save' },
  today: { es: 'Tu plan de hoy', en: 'Your plan for today' },
  goal: { es: 'Tu objetivo de hoy', en: 'Your goal for today' },
  done: { es: '¡Objetivo de hoy cumplido! 🎉', en: 'Today’s goal achieved! 🎉' },
  studied: { es: 'estudiados hoy', en: 'studied today' },
  freeHint: { es: 'Elige abajo lo que te apetezca.', en: 'Pick whatever you like below.' },
  change: { es: 'Cambiar', en: 'Change' },
  section: { es: 'Mi forma de estudiar', en: 'My way of studying' },
  timeUp: { es: 'tiempo cumplido', en: 'time done' }, nextUp: { es: 'Siguiente', en: 'Next' },
  stay: { es: 'Seguir aquí', en: 'Keep going' }, goNow: { es: 'Ir ahora', en: 'Go now' }, great: { es: '¡Genial!', en: 'Great!' },
  allDone: { es: '¡Plan de hoy completado!', en: 'Today’s plan completed!' }, allDoneSub: { es: 'Puedes seguir estudiando lo que quieras.', en: 'You can keep studying whatever you like.' },
  tCards: { es: 'Repaso de tarjetas', en: 'Flashcard review' }, tCardsSub: { es: 'las palabras que tocan hoy', en: 'the words due today' },
  tLesson: { es: 'Lección', en: 'Lesson' }, tLessonSub: { es: 'sigue donde lo dejaste', en: 'carry on where you left off' },
  tDrills: { es: 'Tanda de ejercicios', en: 'Exercise set' }, tDrillsSub: { es: 'práctica de gramática para reforzar', en: 'grammar practice to reinforce' },
  tRead: { es: 'Lectura', en: 'Reading' }, tReadSub: { es: 'un texto de tu nivel', en: 'a text at your level' },
  tDict: { es: 'Dictado', en: 'Dictation' }, tDictSub: { es: 'escucha y escribe', en: 'listen and type' },
  tPron: { es: 'Pronunciación', en: 'Pronunciation' }, tPronSub: { es: 'lee en voz alta', en: 'read aloud' },
  tConv: { es: 'Conversación con la IA', en: 'Conversation with the AI' }, tConvSub: { es: 'una situación de tu nivel', en: 'a situation at your level' },
};
const tx = k => L(TX[k]);

let lastArgs = [0, null];

// ---------- time tracking ----------
let lastInput = Date.now(), unsaved = 0;
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(e => addEventListener(e, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
const STEP = 15;
setInterval(() => {
  if (document.visibilityState !== 'visible' || Date.now() - lastInput > 90000) return;
  const v = currentName && currentName();
  if (!v) return;
  const d = day();
  const st = S.studyTime && S.studyTime.d === d ? S.studyTime : { d, t: 0, v: {} };
  st.t += STEP;
  st.v = { ...st.v, [v]: (st.v[v] || 0) + STEP };
  S.studyTime = st;
  unsaved += STEP;
  if (unsaved >= 60) { unsaved = 0; update({ studyTime: st }); }
  if (v === 'study-pick' || v === 'home') refreshBox();
  if (S.plan && S.plan.mode === 'guided') checkNext(v);
}, STEP * 1000);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && unsaved) { unsaved = 0; update({ studyTime: S.studyTime }); } });

const secsToday = () => (S.studyTime && S.studyTime.d === day() ? S.studyTime : { t: 0, v: {} });
const fmt = s => `${Math.floor(s / 60)} min`;

// ---------- the plan ----------
const VIEWS = { cards: ['review', 'cards', 'daily-review'], lesson: ['lesson'], drills: ['drills', 'drill'], read: ['text', 'texts'], speak: ['speak'] };
function tasks(num, rec) {
  const m = S.plan?.mins || 15;
  const odd = new Date().getDate() % 2;
  const sp = odd ? ['tPron', 'pron'] : ['tDict', 'dict'];
  const T = (id, key, mins, grp, go) => ({ id, key, mins, grp, go });
  const cards = T('cards', 'tCards', 0, 'cards', "window.__nav('review')");
  const lesson = T('lesson', 'tLesson', 0, 'lesson', num ? `window.__studyPick('grammar', ${num})` : "window.__nav('study-pick')");
  const drills = T('drills', 'tDrills', 0, 'drills', "window.__nav('drills')");
  const read = T('read', 'tRead', 0, 'read', rec ? `window.__openText('${rec.id}')` : "window.__nav('texts')");
  const speak = T('speak', sp[0], 0, 'speak', `window.__nav('speak',{tab:'${sp[1]}'})`);
  const conv = tutorKey() ? T('conv', 'tConv', 0, 'speak', "window.__nav('speak',{tab:'conv'})")
    : T('conv', odd ? 'tDict' : 'tPron', 0, 'speak', `window.__nav('speak',{tab:'${odd ? 'dict' : 'pron'}'})`);
  const set = (t, mins) => ({ ...t, mins });
  if (m >= 60) return [set(cards, 10), set(lesson, 15), set(drills, 10), set(read, 10), set(speak, 7), set(conv, 8)];
  if (m >= 30) return [set(cards, 8), set(lesson, 10), set(read, 7), set(speak, 5)];
  return [set(cards, 5), set(lesson, 7), set(speak, 3)];
}
// Time spent in each group of screens today is shared out among that group's tasks, in order.
function progress(list) {
  const v = secsToday().v || {};
  const pool = {};
  for (const [g, names] of Object.entries(VIEWS)) pool[g] = names.reduce((a, n) => a + (v[n] || 0), 0);
  let due = null;
  try { due = deckStats().pending; } catch (e) {}
  return list.map(t => {
    const need = t.mins * 60 * 0.7;
    const got = Math.min(pool[t.grp], need);
    pool[t.grp] -= got;
    const ok = got >= need || (t.id === 'cards' && due === 0 && (v.review || v.cards || 0) > 0);
    return { ...t, pct: ok ? 100 : Math.round(got / need * 100), ok };
  });
}

// The box at the top of "What do you want to learn today?" (and the plan / goal on home).
export function planBox(num, rec) {
  lastArgs = [num, rec];
  css();
  return `<div id="plan-box">${boxHTML(num, rec)}</div>`;
}
function refreshBox() { const b = document.getElementById('plan-box'); if (b) b.innerHTML = boxHTML(...lastArgs); }

function chooser(inSettings) {
  const p = S.plan || {};
  const mode = window.__planDraft?.mode || p.mode || 'guided', mins = window.__planDraft?.mins || p.mins || 15;
  return `<div class="card plan-card">
    ${inSettings ? `<div class="h3 mb-8">${tx('section')}</div>` : `<div class="h3">${tx('how')}</div><div class="muted small mb-12">${tx('howSub')}</div>`}
    <div class="plan-modes">${[['guided', '🧭'], ['free', '🎯']].map(([k, i]) => `<button class="plan-mode ${mode === k ? 'on' : ''}" onclick="window.__planSet('mode','${k}')">
      <span class="plan-ico">${i}</span><b>${tx(k)}</b><span class="muted small">${tx(k + 'Sub')}</span></button>`).join('')}</div>
    <div class="muted small mt-12 mb-8">${tx('perDay')}</div>
    <div class="flex gap-8 mb-12">${[15, 30, 60].map(n => `<button class="chip ${mins === n ? 'on' : ''}" onclick="window.__planSet('mins',${n})">${n === 60 ? tx('h1') : n + ' min'}</button>`).join('')}</div>
    <button class="btn btn-primary btn-block" onclick="window.__planSave()">${inSettings ? tx('save') : tx('start')}</button>
  </div>`;
}
window.__planSet = (k, v) => {
  window.__planDraft = { mode: S.plan?.mode || 'guided', mins: S.plan?.mins || 15, ...(window.__planDraft || {}), [k]: v };
  document.querySelectorAll('.plan-chooser-host').forEach(h => { h.innerHTML = chooser(h.dataset.settings === '1'); });
  const b = document.getElementById('plan-box');
  if (b && !S.plan) b.innerHTML = boxHTML(...lastArgs);
};
window.__planSave = () => {
  const d = { mode: 'guided', mins: 15, ...(S.plan || {}), ...(window.__planDraft || {}) };
  window.__planDraft = null;
  update({ plan: d });
  render();
};
window.__planEdit = () => { window.__planDraft = S.plan ? { ...S.plan } : null; update({ plan: null }); render(); };

function boxHTML(num, rec) {
  if (!S.plan) return `<div class="plan-chooser-host">${chooser(false)}</div>`;
  const goal = S.plan.mins * 60, t = secsToday().t || 0;
  const pct = Math.min(100, Math.round(t / goal * 100));
  const bar = `<div class="plan-bar"><i style="width:${pct}%"></i></div>`;
  if (S.plan.mode === 'free') {
    return `<div class="card plan-card">
      <div class="flex items-center justify-between"><b>🎯 ${tx('goal')}: ${S.plan.mins === 60 ? tx('h1') : S.plan.mins + ' min'}</b>
        <button class="btn-link small" onclick="window.__planEdit()">${tx('change')}</button></div>
      ${bar}<div class="muted small">${pct >= 100 ? tx('done') : `${fmt(t)} ${tx('studied')} · ${tx('freeHint')}`}</div></div>`;
  }
  const list = progress(tasks(num, rec));
  const all = list.every(x => x.ok);
  return `<div class="card plan-card">
    <div class="flex items-center justify-between"><b>🧭 ${tx('today')} · ${S.plan.mins === 60 ? tx('h1') : S.plan.mins + ' min'}</b>
      <button class="btn-link small" onclick="window.__planEdit()">${tx('change')}</button></div>
    ${bar}<div class="muted small mb-8">${all || pct >= 100 ? tx('done') : `${fmt(t)} ${tx('studied')}`}</div>
    ${list.map(x => `<button class="plan-task ${x.ok ? 'ok' : ''}" onclick="${x.go}">
      <span class="plan-check">${x.ok ? '✓' : ''}</span>
      <span class="grow" style="text-align:left"><b>${tx(x.key)}</b> <span class="muted small">· ${x.mins} min</span><br><span class="muted small">${tx(x.key + 'Sub')}</span>
        ${!x.ok && x.pct ? `<span class="plan-mini"><i style="width:${x.pct}%"></i></span>` : ''}</span>
      <span class="muted">›</span></button>`).join('')}
  </div>`;
}

// Guided mode: when the time for the task you are on is up, a small banner (not a blocking pop-up) suggests
// the next task; you can go now or keep going where you are. Once per task and day.
function checkNext(view) {
  const grp = Object.keys(VIEWS).find(g => VIEWS[g].includes(view));
  if (!grp || document.getElementById('plan-next')) return;
  const list = progress(tasks(...lastArgs));
  const d = day();
  const told = S.planTold && S.planTold.d === d ? S.planTold.ids : [];
  const just = list.find(t => t.grp === grp && t.ok && !told.includes(t.id));
  if (!just) return;
  update({ planTold: { d, ids: [...told, just.id] } });
  const next = list.find(t => !t.ok);
  css();
  const el = document.createElement('div');
  el.id = 'plan-next';
  el.setAttribute('role', 'status');
  el.innerHTML = next
    ? `<div><b>✓ ${tx(just.key)}</b> · ${tx('timeUp')}<br><span class="muted small">${tx('nextUp')}: <b>${tx(next.key)}</b> · ${next.mins} min</span></div>
       <div class="plan-next-btns"><button class="btn btn-soft btn-small" data-x="stay">${tx('stay')}</button><button class="btn btn-primary btn-small" data-x="go">${tx('goNow')}</button></div>`
    : `<div><b>🎉 ${tx('allDone')}</b><br><span class="muted small">${tx('allDoneSub')}</span></div>
       <div class="plan-next-btns"><button class="btn btn-primary btn-small" data-x="stay">${tx('great')}</button></div>`;
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  el.querySelector('[data-x=stay]').onclick = close;
  const g = el.querySelector('[data-x=go]');
  if (g) g.onclick = () => { close(); new Function(next.go)(); };
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(close, 25000);
}

// Settings section.
export function planSettings() {
  css();
  return `<div class="plan-chooser-host mb-16" data-settings="1">${chooser(true)}</div>`;
}

function css() {
  if (document.getElementById('plan-css')) return;
  const s = document.createElement('style');
  s.id = 'plan-css';
  s.textContent = `
.plan-card{padding:16px;margin-bottom:16px}
.plan-modes{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.plan-mode{display:flex;flex-direction:column;gap:4px;align-items:flex-start;text-align:left;padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;cursor:pointer}
.plan-mode.on{border:2px solid var(--accent);background:var(--soft)}
.plan-ico{font-size:24px}
.plan-bar{height:8px;border-radius:6px;background:var(--soft);overflow:hidden;margin:10px 0 6px}.plan-bar i{display:block;height:100%;background:var(--accent);border-radius:6px;transition:width .4s}
.plan-task{display:flex;align-items:center;gap:12px;width:100%;padding:10px 4px;border:none;border-top:1px solid var(--line);background:none;color:var(--ink);font:inherit;cursor:pointer}
.plan-check{width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex:none}
.plan-task.ok .plan-check{background:var(--ok);border-color:var(--ok)}
.plan-task.ok b{text-decoration:line-through;opacity:.6}
.plan-mini{display:block;height:4px;border-radius:3px;background:var(--soft);margin-top:5px;overflow:hidden;max-width:160px}.plan-mini i{display:block;height:100%;background:var(--gold)}
.btn-block{width:100%}
#plan-next{position:fixed;left:12px;right:12px;bottom:84px;z-index:9000;max-width:520px;margin:0 auto;display:flex;gap:10px;align-items:center;justify-content:space-between;
  padding:12px 14px;border-radius:16px;background:var(--bg2);color:var(--ink);border:2px solid var(--accent);box-shadow:0 10px 30px rgba(0,0,0,.18);
  transform:translateY(140%);opacity:0;transition:transform .3s ease,opacity .3s ease;font-size:14px}
#plan-next.in{transform:none;opacity:1}
.plan-next-btns{display:flex;gap:6px;flex:none}`;
  document.head.appendChild(s);
}
