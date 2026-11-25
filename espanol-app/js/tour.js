// First-run guided tour: one screen at a time, the place to look framed in black with an arrow,
// "Next" / "Back" / "Skip". It runs once per app (and again from Settings) and ends on Mochi's welcome.
import { S } from './state.js?v=202611260930';
import { go } from './router.js?v=202611260930';

const APP = (location.pathname.match(/([\w-]+)-app\//) || [])[1] || 'app';
const DONE = `tour_done_${APP}`;
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
export const needsTour = () => LS(DONE) !== '1';

const UI = {
  next: { es: 'Siguiente', en: 'Next' },
  back: { es: 'Atrás', en: 'Back' },
  skip: { es: 'Saltar guía', en: 'Skip tour' },
  end: { es: '¡Empezar!', en: "Let's start!" },
};

// view/params: screen to open · sel: what to frame (first match; centred card if none) · text: es / en.
const STEPS = [
  { text: {
    es: '<b>¡Bienvenido!</b> Te enseño cómo funciona la app en unos pocos pasos. Pulsa <b>Siguiente</b> para continuar o <b>Saltar guía</b> si ya la conoces.',
    en: '<b>Welcome!</b> Let me show you how the app works in a few steps. Tap <b>Next</b> to continue, or <b>Skip tour</b> if you already know it.' } },
  { view: 'study-pick', sel: '.study-pick .study-opt:not(.review-opt)', text: {
    es: 'Cada vez que entras empiezas aquí: <b>¿Qué quieres aprender hoy?</b> Elige gramática, vocabulario, práctica o una lectura de tu lección actual.',
    en: 'Every time you come in you start here: <b>What do you want to learn today?</b> Pick grammar, vocabulary, practice or a reading from your current lesson.' } },
  { view: 'study-pick', sel: '.study-pick .btn-link', text: {
    es: '¿Prefieres ir directo a tus lecciones? Toca <b>este texto al final de la página</b> y te saltas esta pantalla.',
    en: 'Prefer to go straight to your lessons? Tap <b>this text at the bottom of the page</b> to skip this screen.' } },
  { view: 'home', sel: '.lvl-card', text: {
    es: 'Esta es la pantalla de inicio. Aquí ves <b>tu nivel y tu progreso</b>: vocabulario, gramática, lecturas…',
    en: 'This is the home screen. Here you see <b>your level and progress</b>: vocabulary, grammar, readings…' } },
  { view: 'home', sel: '.lvl-row', text: {
    es: 'Aquí puedes <b>cambiar de nivel</b> cuando quieras. Cada nivel guarda su propio progreso.',
    en: 'Here you can <b>change level</b> whenever you like. Each level keeps its own progress.' } },
  { view: 'home', sel: '.lesson-tree .lesson-node', text: {
    es: 'Las <b>lecciones</b> van en orden. Toca una para empezarla: explicación, vocabulario y ejercicios.',
    en: 'The <b>lessons</b> go in order. Tap one to start it: explanation, vocabulary and exercises.' } },
  { view: 'home', sel: '.set-chips', text: {
    es: 'Cada lección tiene <b>tandas extra</b> (2, 3, 4…) con ejercicios nuevos. Hazlas para <b>reforzar</b> lo aprendido y que no se te olvide.',
    en: 'Each lesson has <b>extra sets</b> (2, 3, 4…) with new exercises. Do them to <b>reinforce</b> what you learned so you don’t forget it.' } },
  { view: 'home', sel: '.menu-grid', text: {
    es: '<b>Practicar y consultar</b>: textos, tarjetas, lista de vocabulario, temas, verbos, gramática… Todo a un toque.',
    en: '<b>Practise and look things up</b>: texts, cards, vocabulary list, topics, verbs, grammar… All one tap away.' } },
  { view: 'review', params: { deck: 'v' }, sel: '.bottomnav .navitem:nth-child(4)', text: {
    es: '<b>Repaso de vocabulario</b> (tarjetas): cada día te salen las palabras que toca repasar. Intenta recordarla, toca para ver la respuesta y elige <b>Otra vez, Difícil, Bien o Fácil</b>. La app decide cuándo volver a enseñártela. ¡Unos minutos al día bastan!',
    en: '<b>Vocabulary review</b> (cards): each day you get the words that are due. Try to remember, tap to see the answer and choose <b>Again, Hard, Good or Easy</b>. The app decides when to show it again. A few minutes a day is enough!' } },
  { view: 'texts', sel: '.bottomnav .navitem:nth-child(3)', text: {
    es: '<b>¡No te olvides de los textos!</b> Cada nivel tiene muchas lecturas con audio y traducción. Toca una palabra para ver qué significa y responde las preguntas al final.',
    en: '<b>Don’t forget the texts!</b> Each level has many readings with audio and translation. Tap a word to see what it means and answer the questions at the end.' } },
  { view: 'vocab-list', sel: 'button[onclick="window.__back()"]', text: {
    es: 'Para <b>volver atrás</b>, toca la flecha de arriba a la izquierda.',
    en: 'To <b>go back</b>, tap the arrow at the top left.' } },
  { view: 'settings', sel: '#tutor-settings', text: {
    es: '<b>Tutor IA (Gemini)</b>: pega aquí tu clave gratuita de Google (los pasos están explicados). Después podrás seleccionar una frase, tocar una palabra o pulsar <b>«¿Por qué?»</b> al fallar un ejercicio, y la IA te lo explica.',
    en: '<b>AI tutor (Gemini)</b>: paste your free Google key here (the steps are explained). Then you can select a sentence, tap a word or press <b>“Why?”</b> when you get an exercise wrong, and the AI explains it.' } },
  { view: 'settings', sel: '.bottomnav', text: {
    es: 'Con la <b>barra de abajo</b> vas a cada sección: inicio, gramática, textos, repaso, ranking, progreso y ajustes.',
    en: 'Use the <b>bottom bar</b> to reach each section: home, grammar, texts, review, ranking, progress and settings.' } },
  { view: 'settings', sel: '#lang-switch', text: {
    es: 'Arriba puedes <b>cambiar de idioma</b>. Cada idioma tiene su propio progreso. Puedes volver a ver esta guía desde <b>Ajustes</b>.',
    en: 'At the top you can <b>switch language</b>. Each language keeps its own progress. You can see this tour again from <b>Settings</b>.' } },
];

const L = o => (o && (o[S.lang] || (S.lang === 'es' ? o.es : o.en) || o.es)) || '';
let i = 0, ov = null, target = null, raf = 0;

export function startTour() {
  i = 0;
  css();
  document.querySelectorAll('.tour-ov').forEach(x => x.remove());
  ov = document.createElement('div');
  ov.className = 'tour-ov';
  ov.innerHTML = `<div class="tour-hole"></div><svg class="tour-arrow" width="44" height="60" viewBox="0 0 44 60" aria-hidden="true">
    <path d="M22 4 L22 50" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="M8 38 L22 54 L36 38" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="tour-tip" role="dialog" aria-live="polite"></div>`;
  ov.addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(ov);
  addEventListener('resize', place); addEventListener('scroll', place, true);
  show();
}
window.__tour = startTour;

function finish() {
  LS(DONE, '1');
  removeEventListener('resize', place); removeEventListener('scroll', place, true);
  cancelAnimationFrame(raf);
  ov && ov.remove(); ov = null;
  go('welcome');                       // ends on Mochi's welcome screen
}

let seq = 0;
async function show() {
  const st = STEPS[i], my = ++seq;
  ov.classList.add('busy');
  ov.querySelectorAll('.tour-tip button').forEach(b => { b.disabled = true; });
  if (st.view) {
    const cur = ov.dataset.view || '';
    const key = st.view + JSON.stringify(st.params || {});
    if (cur !== key) { go(st.view, st.params || {}); ov.dataset.view = key; }
  }
  target = st.sel ? await waitFor(st.sel) : null;
  if (my !== seq || !ov) return;
  if (target) {
    // Tall blocks (e.g. the Gemini card) are shown from their top; the frame then covers only that part.
    const tall = target.getBoundingClientRect().height > innerHeight * 0.42;
    target.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'instant' });
    if (tall) scrollBy({ top: -70, behavior: 'instant' });
    await new Promise(r => setTimeout(r, 120));
    if (my !== seq || !ov) return;
  }
  const last = i === STEPS.length - 1;
  ov.querySelector('.tour-tip').innerHTML = `
    <div class="tour-txt">${L(st.text)}</div>
    <div class="tour-dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="tour-btns">
      ${last ? '<span></span>' : `<button class="tour-skip">${L(UI.skip)}</button>`}
      <span class="tour-r">${i ? `<button class="tour-back">${L(UI.back)}</button>` : ''}<button class="tour-next">${L(last ? UI.end : UI.next)}</button></span>
    </div>`;
  const tip = ov.querySelector('.tour-tip');
  tip.querySelector('.tour-next').onclick = () => { if (last) finish(); else { i++; show(); } };
  if (tip.querySelector('.tour-back')) tip.querySelector('.tour-back').onclick = () => { i--; show(); };
  if (tip.querySelector('.tour-skip')) tip.querySelector('.tour-skip').onclick = finish;
  ov.classList.remove('busy');
  place();
  tip.querySelector('.tour-next').focus({ preventScroll: true });
}

// Waits (up to 4 s) for the element to be rendered and visible.
function waitFor(sel) {
  return new Promise(res => {
    const t0 = Date.now();
    (function poll() {
      const el = [...document.querySelectorAll(sel)].find(e => e.getClientRects().length && !e.closest('.tour-ov'));
      if (el || Date.now() - t0 > 4000) return res(el || null);
      setTimeout(poll, 100);
    })();
  });
}

function place() {
  if (!ov) return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const hole = ov.querySelector('.tour-hole'), tip = ov.querySelector('.tour-tip'), arrow = ov.querySelector('.tour-arrow');
    const W = innerWidth, H = innerHeight, pad = 6;
    const tw = Math.min(380, W - 32);
    tip.style.width = tw + 'px';
    if (!target || !target.isConnected) {
      hole.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:0;height:0;border-width:0`;
      arrow.style.display = 'none';
      tip.style.left = (W - tw) / 2 + 'px'; tip.style.top = Math.max(16, (H - tip.offsetHeight) / 2) + 'px';
      return;
    }
    const r = target.getBoundingClientRect();
    const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad);
    const w = Math.min(W - 8, r.right + pad) - x;
    let h = Math.min(H - 8, r.bottom + pad) - y;
    if (h > H * 0.42) h = Math.round(H * 0.3);
    hole.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    const th = tip.offsetHeight, gap = 62;
    const below = y + h + gap + th + 12 <= H || y < H - (y + h);
    let ty = below ? y + h + gap : y - gap - th;
    ty = Math.max(12, Math.min(H - th - 12, ty));
    const cx = Math.max(24, Math.min(W - 24, x + w / 2));
    tip.style.left = Math.max(16, Math.min(W - tw - 16, cx - tw / 2)) + 'px';
    tip.style.top = ty + 'px';
    // Black arrow from the card to the framed element (hidden when they overlap).
    const room = below ? ty - (y + h) : y - (ty + th);
    arrow.style.display = room >= 40 ? '' : 'none';
    arrow.style.left = cx - 22 + 'px';
    arrow.style.top = (below ? y + h + (room - 60) / 2 + 2 : ty + th + (room - 60) / 2 - 2) + 'px';
    arrow.style.transform = below ? 'rotate(180deg)' : 'none';
  });
}

function css() {
  if (document.getElementById('tour-css')) return;
  const s = document.createElement('style');
  s.id = 'tour-css';
  s.textContent = `
.tour-ov{position:fixed;inset:0;z-index:10000}
.tour-hole{position:fixed;border:4px solid #111;border-radius:14px;box-shadow:0 0 0 4px #fff,0 0 0 9999px rgba(0,0,0,.55);transition:all .3s ease;pointer-events:none;animation:tourPulse 1.6s infinite}
@keyframes tourPulse{0%,100%{box-shadow:0 0 0 4px #fff,0 0 0 9999px rgba(0,0,0,.55)}50%{box-shadow:0 0 0 9px #fff,0 0 0 9999px rgba(0,0,0,.55)}}
.tour-arrow{position:fixed;pointer-events:none;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff);animation:tourBob 1s infinite ease-in-out}
@keyframes tourBob{0%,100%{translate:0 0}50%{translate:0 5px}}
.tour-tip{position:fixed;background:var(--bg,#fff);color:var(--ink,#222);border:3px solid #111;border-radius:16px;padding:16px 16px 12px;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:top .3s ease,left .3s ease}
.tour-ov.busy .tour-tip{opacity:.6}
.tour-txt{font-size:15px;line-height:1.5}
.tour-dots{display:flex;gap:5px;justify-content:center;margin:12px 0 10px}.tour-dots i{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.25}.tour-dots i.on{opacity:1;width:18px;border-radius:4px}
.tour-btns{display:flex;align-items:center;justify-content:space-between;gap:8px}.tour-r{display:flex;gap:8px}
.tour-btns button{font:inherit;font-size:14px;font-weight:700;border-radius:10px;padding:9px 14px;cursor:pointer;border:2px solid #111}
.tour-next{background:#111;color:#fff}.tour-back{background:transparent;color:inherit}
.tour-skip{background:none;border:none!important;padding:9px 4px!important;color:inherit;opacity:.7;text-decoration:underline}
body.dark .tour-tip{border-color:#fff}body.dark .tour-next{background:#fff;color:#111;border-color:#fff}body.dark .tour-back{border-color:#fff}
@media (prefers-reduced-motion:reduce){.tour-hole,.tour-arrow{animation:none}.tour-hole,.tour-tip{transition:none}}`;
  document.head.appendChild(s);
}
