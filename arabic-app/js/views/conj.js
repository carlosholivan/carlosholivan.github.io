// Arabic conjugation reference: choose a verb, see every tense and person, participles and nombre verbal,
// plus a quick quiz. window.__conj(tense) opens it from any grammar explanation (links built by tools/build_ar.py).
import { register, go } from '../router.js?v=202611140130';
import { header, bottomNav } from '../ui/components.js?v=202611140130';
import { speak } from '../audio.js?v=202611140130';
import { translit } from '../ar.js?v=202611140130';
import { VERBS, PERSONS, IMP_PERSONS, TENSES, conjugate, participles } from '../conj.js?v=202611140130';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GROUPS = [
  ['I', 'Forma I (فَعَلَ)', 'La forma básica. La vocal del presente (a, i, u) hay que aprenderla con cada verbo.'],
  ['II', 'Forma II (فَعَّلَ)', 'Duplica la 2.ª radical: suele ser causativa o intensiva. Presente con يُـ.'],
  ['III', 'Forma III (فَاعَلَ)', 'Alarga la 1.ª vocal: acción hacia otra persona. Presente con يُـ.'],
  ['IV', 'Forma IV (أَفْعَلَ)', 'Prefijo أَ: causativa. Presente con يُـ; imperativo con أَ.'],
  ['V', 'Forma V (تَفَعَّلَ)', 'تَـ + forma II: reflexiva de la II.'],
  ['VI', 'Forma VI (تَفَاعَلَ)', 'تَـ + forma III: acción recíproca.'],
  ['VII', 'Forma VII (اِنْفَعَلَ)', 'Prefijo اِنْـ: pasiva o media.'],
  ['VIII', 'Forma VIII (اِفْتَعَلَ)', 'تـ infijada tras la 1.ª radical: reflexiva.'],
  ['X', 'Forma X (اِسْتَفْعَلَ)', 'Prefijo اِسْتَـ: pedir, considerar.'],
  ['hueco', 'Verbos huecos', 'و / ي en medio: vocal larga que se acorta ante consonante (قَالَ → قُلْتُ).'],
  ['defectivo', 'Verbos defectivos', 'و / ي al final: la última sílaba cambia según la persona (مَشَى، دَعَا، نَسِيَ).'],
  ['asimilado', 'Verbos asimilados', 'و inicial que desaparece en el presente (وَجَدَ → يَجِدُ).'],
  ['doble', 'Verbos dobles', '2.ª y 3.ª radical iguales: se funden con شَدَّة (مَدَّ، أَحَبَّ).'],
];

let verbIdx = 0;
let tense = 'past';
let quiz = null;

const word = (w) => `<span class="cj-ar" onclick="event.stopPropagation();window.__cjSay('${esc(w)}')">${esc(w)}</span><span class="cj-tr">${esc(translit(w))}</span>`;

function table(v) {
  const persons = tense === 'imp' ? PERSONS.filter(p => IMP_PERSONS.includes(p.id)) : PERSONS;
  const pre = tense === 'subj' ? 'لَنْ ' : tense === 'juss' ? 'لَمْ ' : '';
  return `<table class="cj-table ar-table">${persons.map(p => {
    const f = conjugate(v, tense, p.id);
    return `<tr onclick="window.__cjSay('${esc(pre + f)}')"><th><span class="cj-pr">${esc(p.ar)}</span><span>${esc(p.es)}</span></th>
      <td>${word(pre + f)}</td></tr>`;
  }).join('')}</table>`;
}

register('conj', async (el, params = {}) => {
  if (params.t && TENSES.some(x => x.id === params.t)) tense = params.t;
  if (params.v) { const i = VERBS.findIndex(x => x.w === params.v); if (i >= 0) verbIdx = i; }
  const v = VERBS[verbIdx];
  const [act, pas] = participles(v);
  const T = TENSES.find(x => x.id === tense);
  el.innerHTML = `<div class="fade">
    ${header('تَصْرِيف · Conjugación')}
    <div class="card cj-intro">
      <p class="small" style="margin:0 0 8px">Los verbos árabes se construyen sobre una <b>raíz</b> de tres consonantes. El pasado añade <b>terminaciones</b>; el presente, <b>prefijos</b> (أَ، نَ، تَ، يَ) y a veces terminaciones. Elige un verbo y un tiempo; toca una forma para oírla.</p>
      <button class="btn mt-8" onclick="window.__cjQuiz()">🎯 Practicar conjugaciones</button>
    </div>
    <div id="cj-quiz"></div>
    ${GROUPS.map(([g, label, note]) => {
      const list = VERBS.map((x, i) => [x, i]).filter(([x]) => x.group === g);
      if (!list.length) return '';
      return `<div class="sec-label">${esc(label)}</div><div class="muted small mb-8">${esc(note)}</div>
        <div class="cj-verbs">${list.map(([x, i]) => `<button class="set-chip ar-chip ${i === verbIdx ? 'done' : ''}" onclick="window.__cjVerb(${i})">${esc(x.w)}</button>`).join('')}</div>`;
    }).join('')}
    <div class="card mt-12" id="cj-table">
      <div class="flex items-center gap-8" style="flex-wrap:wrap">
        <span class="cj-big">${esc(v.w)}</span>
        <span class="muted">${esc(v.es)}</span><span class="grow"></span>
        <span class="cj-tag">${esc(v.group)}</span>
      </div>
      <div class="cj-facts small">
        <div><b>Presente:</b> ${word(conjugate(v, 'pres', '3ms'))}</div>
        <div><b>Nombre verbal:</b> ${word(v.masdar)}</div>
        <div><b>Participio activo:</b> ${act === '—' ? '—' : word(act)}</div>
        <div><b>Participio pasivo:</b> ${pas === '—' ? '—' : word(pas)}</div>
      </div>
      <div class="cj-tabs">${TENSES.map(x => `<button class="chip ${x.id === tense ? 'on' : ''}" onclick="window.__cjTense('${x.id}')">${esc(x.es)}</button>`).join('')}</div>
      <div class="muted small mb-8"><b class="cj-tname">${esc(T.ar)}</b> — ${esc(T.note)}</div>
      ${table(v)}
      ${tense === 'pres' ? `<div class="muted small mt-8">Futuro: ${word('سَ' + conjugate(v, 'pres', '1s'))} · Negación: ${word('لَا ' + conjugate(v, 'pres', '1s'))}</div>` : ''}
    </div>
  </div>${bottomNav('reference')}`;
  if (params.t || params.v) document.getElementById('cj-table')?.scrollIntoView({ block: 'start' });
});

window.__cjVerb = (i) => { verbIdx = i; go('conj'); setTimeout(() => document.getElementById('cj-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
window.__cjTense = (id) => { tense = id; go('conj'); setTimeout(() => document.getElementById('cj-table')?.scrollIntoView({ block: 'start' }), 30); };
window.__cjSay = (w) => speak(w);
window.__conj = (t, v) => window.__nav('conj', { t, v });

// Quiz: a verb + tense + person → choose the right form among forms of the same verb.
const pick = a => a[Math.floor(Math.random() * a.length)];
function newQ() {
  const v = pick(VERBS);
  const tn = pick(['past', 'pres', 'pres', 'subj', 'juss', 'imp']);
  const p = pick(tn === 'imp' ? IMP_PERSONS : PERSONS.map(x => x.id));
  const answer = conjugate(v, tn, p);
  const pool = new Set();
  for (const t2 of ['past', 'pres', 'subj', 'juss']) for (const q of PERSONS) { const f = conjugate(v, t2, q.id); if (f && f !== answer) pool.add(f); }
  const opts = [answer, ...[...pool].sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
  return { v, tn, p, answer, opts };
}
function drawQuiz() {
  const box = document.getElementById('cj-quiz'); if (!box) return;
  const q = quiz.q; const P = PERSONS.find(x => x.id === q.p); const T = TENSES.find(x => x.id === q.tn);
  box.innerHTML = `<div class="card mt-12">
    <div class="flex items-center"><b>🎯 ${quiz.ok}/${quiz.n}</b><span class="grow"></span><button class="btn btn-soft btn-small" onclick="window.__cjQuizClose()">✕</button></div>
    <div class="cj-qv">${esc(q.v.w)} <span class="muted small">(${esc(q.v.es)})</span></div>
    <div class="mb-12">${esc(T.es)} · <span class="cj-pr">${esc(P.ar)}</span> (${esc(P.es)})</div>
    <div class="cj-opts">${q.opts.map(o => `<button class="btn btn-soft" onclick="window.__cjAns(this,'${esc(o)}')">${esc(o)}</button>`).join('')}</div></div>`;
}
window.__cjQuiz = () => { quiz = { ok: 0, n: 0, q: newQ() }; drawQuiz(); document.getElementById('cj-quiz')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
window.__cjQuizClose = () => { quiz = null; const b = document.getElementById('cj-quiz'); if (b) b.innerHTML = ''; };
window.__cjAns = (btn, o) => {
  const q = quiz.q; quiz.n++;
  const ok = o === q.answer; if (ok) quiz.ok++;
  document.querySelectorAll('.cj-opts .btn').forEach(b => { b.disabled = true; if (b.textContent === q.answer) b.classList.add('ok'); });
  if (!ok) btn.classList.add('bad');
  speak(q.answer);
  setTimeout(() => { quiz.q = newQ(); drawQuiz(); }, ok ? 900 : 1800);
};
