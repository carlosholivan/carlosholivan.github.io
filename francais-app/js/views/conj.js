// French conjugation reference: choose a verb, see every tense with every person, plus a quick quiz.
// window.__conj(tense, verb) opens it from anywhere.
import { register, go } from '../router.js?v=202611260900';
import { header, bottomNav } from '../ui/components.js?v=202611260900';
import { speak } from '../audio.js?v=202611260900';
import { VERBS, PERSONS, IMP_PERSONS, TENSES, conjugate, withSubject, participle, gerund, auxOf } from '../conj.js?v=202611260900';
import { S } from '../state.js?v=202611260900';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsq = s => esc(s).replace(/&#39;/g, "\\'");
const L = o => (o && (o[S.lang] || o.es)) || '';

const TX = {
  title: { es: 'Conjugación' },
  intro: {
    es: 'Los verbos franceses se agrupan por su infinitivo: <b>-er</b> (parler, el grupo más grande y regular), <b>-ir</b> como finir (nous fin<b>iss</b>ons) y los irregulares, que conviene aprender de memoria. Muchas formas suenan igual aunque se escriban distinto (<i>parle, parles, parlent</i>). Elige un verbo y un tiempo; toca una forma para oírla.',
  },
  quiz: { es: 'Practicar conjugaciones' },
  participle: { es: 'Participio' },
  gerund: { es: 'Participio presente' },
  aux: { es: 'Auxiliar' },
  neg: { es: 'Negativo' },
  groups: {
    er: [{ es: 'Verbos en -er' }, { es: 'El modelo es parler: -e, -es, -e, -ons, -ez, -ent. Los verbos de movimiento y cambio de estado (arriver, rester…) y los pronominales forman el passé composé con être.' }],
    sp: [{ es: '-er con cambios ortográficos' }, { es: 'Cambian la ortografía para mantener el sonido: mangeons, commençons; o ante una e muda: appelle, jette, achète, préfère, paie.' }],
    ir: [{ es: 'Verbos en -ir (finir) y en -re (vendre)' }, { es: 'finir: nous fin-iss-ons, participio fini. vendre: il vend (sin -t), participio vendu.' }],
    irr: [{ es: 'Los más irregulares' }, { es: 'être, avoir, aller, faire y los modales (pouvoir, vouloir, devoir, savoir): son los más frecuentes. Apréndelos primero.' }],
    irr2: [{ es: 'Otros verbos irregulares' }, { es: 'Muy frecuentes: venir, prendre, mettre, voir, partir… Fíjate en el participio (pris, mis, vu) y en la raíz del futuro (viendr-, verr-).' }],
  },
};

let verbIdx = 0;
let tense = 'pres';
let quiz = null;

const form = (f) => f && f !== '—'
  ? `<span class="cj-es" onclick="event.stopPropagation();window.__cjSay('${jsq(f)}')">${esc(f)}</span>`
  : '—';

function table(v) {
  const persons = tense === 'imp' ? IMP_PERSONS : v.only3 ? PERSONS.filter(p => p.id === 2) : PERSONS;
  return `<table class="cj-table">${persons.map(p => {
    const f = withSubject(v, tense, p.id);
    return `<tr onclick="window.__cjSay('${jsq(f)}')"><th><span class="cj-pr">${esc(p.es)}</span></th><td>${form(f)}</td></tr>`;
  }).join('')}</table>`;
}

function negative(v) {
  if (tense === 'imp' || v.only3) return '';
  const f = conjugate(v, tense, 0);
  if (!f) return '';
  const parts = f.split(' ');
  let neg;
  if (['pc', 'pqp', 'condp'].includes(tense)) {
    const i = v.pron ? 1 : 0;   // je ne me suis pas levé
    neg = (v.pron ? 'ne ' + parts.slice(0, i + 1).join(' ') : 'n’' + parts[0]) + ' pas ' + parts.slice(i + 1).join(' ');
    if (!v.pron && !/^[aeiouéèêh]/.test(parts[0])) neg = 'ne ' + parts[0] + ' pas ' + parts.slice(1).join(' ');
  } else {
    neg = (/^[aeiouéèêh]/.test(f) ? 'n’' : 'ne ') + f + ' pas';
    if (v.pron) neg = 'ne ' + f + ' pas';
  }
  neg = neg.replace(/^ne (m’|t’|s’)/, 'ne $1');
  const s = (tense === 'subj' ? 'que ' : '') + 'je ' + neg;
  return `<div class="muted small mt-8"><b>${L(TX.neg)}:</b> ${form(s)} <span class="muted">(ne … pas)</span></div>`;
}

register('conj', async (el, params = {}) => {
  if (params.t && TENSES.some(x => x.id === params.t)) tense = params.t;
  if (params.v) { const i = VERBS.findIndex(x => x.w === params.v); if (i >= 0) verbIdx = i; }
  const v = VERBS[verbIdx];
  const T = TENSES.find(x => x.id === tense);
  el.innerHTML = `<div class="fade">
    ${header('Conjugaison · ' + L(TX.title))}
    <div class="card cj-intro">
      <p class="small" style="margin:0 0 8px">${L(TX.intro)}</p>
      <button class="btn mt-8" onclick="window.__cjQuiz()">🎯 ${L(TX.quiz)}</button>
    </div>
    <div id="cj-quiz"></div>
    ${Object.entries(TX.groups).map(([g, [label, note]]) => {
      const list = VERBS.map((x, i) => [x, i]).filter(([x]) => x.group === g || (g === 'ir' && x.group === 're'));
      return `<div class="sec-label">${esc(L(label))}</div><div class="muted small mb-8">${esc(L(note))}</div>
        <div class="cj-verbs">${list.map(([x, i]) => `<button class="set-chip ${i === verbIdx ? 'done' : ''}" onclick="window.__cjVerb(${i})">${esc(x.w)}</button>`).join('')}</div>`;
    }).join('')}
    <div class="card mt-12" id="cj-table">
      <div class="flex items-center gap-8" style="flex-wrap:wrap">
        <span class="cj-big" onclick="window.__cjSay('${jsq(v.w)}')">${esc(v.w)}</span>
        <span class="muted">${esc(v.es)}</span>
      </div>
      <div class="cj-facts small">
        <div><b>${L(TX.participle)}:</b> ${form(participle(v))}</div>
        <div><b>${L(TX.gerund)}:</b> ${form(gerund(v))}</div>
        <div><b>${L(TX.aux)}:</b> ${esc(auxOf(v))}</div>
      </div>
      <div class="cj-tabs">${TENSES.map(x => `<button class="chip ${x.id === tense ? 'on' : ''}" onclick="window.__cjTense('${x.id}')">${esc(x.fr)}</button>`).join('')}</div>
      <div class="muted small mb-8"><b class="cj-tname">${esc(T.fr)}</b> · ${esc(T.es)} — ${esc(L(T.note))}</div>
      ${table(v)}
      ${negative(v)}
    </div>
  </div>${bottomNav('reference')}`;
  if (params.t || params.v) document.getElementById('cj-table')?.scrollIntoView({ block: 'start' });
});

window.__cjVerb = (i) => { verbIdx = i; go('conj'); setTimeout(() => document.getElementById('cj-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
window.__cjTense = (id) => { tense = id; go('conj'); setTimeout(() => document.getElementById('cj-table')?.scrollIntoView({ block: 'start' }), 30); };
window.__cjSay = (w) => speak(w);
window.__conj = (t, v) => window.__nav('conj', { t, v });

// Quiz: verb + tense + person → choose the right form among other forms of the same verb.
const pick = a => a[Math.floor(Math.random() * a.length)];
const QUIZ_TENSES = ['pres', 'pres', 'pres', 'pc', 'pc', 'imparf', 'imparf', 'fut', 'cond', 'subj', 'imp'];
function newQ() {
  const v = pick(VERBS.filter(x => !x.only3 && x.w !== 'pouvoir'));
  const tn = pick(QUIZ_TENSES);
  const p = pick((tn === 'imp' ? IMP_PERSONS : PERSONS).map(x => x.id));
  const answer = conjugate(v, tn, p);
  const pool = new Set();
  for (const t2 of ['pres', 'imparf', 'fut', 'cond', 'subj', 'pc']) for (const q of PERSONS) { const f = conjugate(v, t2, q.id); if (f && f !== answer) pool.add(f); }
  for (const q of PERSONS) { const f = conjugate(v, tn, q.id); if (f && f !== answer) pool.add(f); }
  // Forms that sound or look the same for this person are not good distractors (parle / parles).
  const opts = [answer, ...[...pool].sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
  return { v, tn, p, answer, opts };
}
function drawQuiz() {
  const box = document.getElementById('cj-quiz'); if (!box) return;
  const q = quiz.q;
  const P = (q.tn === 'imp' ? IMP_PERSONS : PERSONS).find(x => x.id === q.p);
  const T = TENSES.find(x => x.id === q.tn);
  box.innerHTML = `<div class="card mt-12">
    <div class="flex items-center"><b>🎯 ${quiz.ok}/${quiz.n}</b><span class="grow"></span><button class="btn btn-soft btn-small" onclick="window.__cjQuizClose()">✕</button></div>
    <div class="cj-qv">${esc(q.v.w)} <span class="muted small">(${esc(q.v.es)})</span></div>
    <div class="mb-12"><b>${esc(T.fr)}</b> <span class="muted small">${esc(T.es)}</span> · <span class="cj-pr">${esc(P.fr)}</span> <span class="muted small">(${esc(P.es)})</span></div>
    <div class="cj-opts">${q.opts.map(o => `<button class="btn btn-soft" onclick="window.__cjAns(this,'${jsq(o)}')">${esc(o)}</button>`).join('')}</div></div>`;
}
window.__cjQuiz = () => { quiz = { ok: 0, n: 0, q: newQ() }; drawQuiz(); document.getElementById('cj-quiz')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
window.__cjQuizClose = () => { quiz = null; const b = document.getElementById('cj-quiz'); if (b) b.innerHTML = ''; };
window.__cjAns = (btn, o) => {
  const q = quiz.q; quiz.n++;
  const ok = o === q.answer; if (ok) quiz.ok++;
  document.querySelectorAll('.cj-opts .btn').forEach(b => { b.disabled = true; if (b.textContent === q.answer) b.classList.add('ok'); });
  if (!ok) btn.classList.add('bad');
  speak(withSubject(q.v, q.tn, q.p));
  setTimeout(() => { quiz.q = newQ(); drawQuiz(); }, ok ? 900 : 1800);
};
