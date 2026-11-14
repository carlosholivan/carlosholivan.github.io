// Conjugation reference: verb groups, every form with its rules, full tables and a quick quiz.
// window.__conj(id) opens a form sheet from any grammar explanation (links built by tools/build_texts.py).
import { register, go } from '../router.js?v=202611141800';
import { header, bottomNav } from '../ui/components.js?v=202611141800';
import { t } from '../i18n.js?v=202611141800';
import { speak } from '../audio.js?v=202611141800';
import { S, update } from '../state.js?v=202611141800';
import { VERBS, QUIZ_VERBS, FORMS, FORM, TABLE_FORMS, GROUP_LABEL, GROUP_LABEL_EN, conjugate } from '../conj.js?v=202611141800';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cell = ({ w, r }) => `<span class="cj-w" onclick="event.stopPropagation();window.__cjSay('${esc(r)}')">${esc(w)}</span>${w !== r ? `<span class="cj-r">${esc(r)}</span>` : ''}`;
const SAMPLE = [['書く', 'かく', 1], ['飲む', 'のむ', 1], ['帰る', 'かえる', 1], ['食べる', 'たべる', 2], ['する', 'する', 3], ['来る', 'くる', 3]];
const GBADGE = { 1: 'I', 2: 'II', 3: 'III' };

// Spanish users get the original text; everyone else gets English.
const ES = () => (S.lang || 'es') === 'es';
const F = (f, k) => (!ES() && f.en?.[k]) || f[k];
const VM = v => (!ES() && v[4]) || v[3];
const TX = {
  es: { title: '活用 · Conjugación', which: '¿De qué grupo es el verbo?',
    g1: 'Grupo 1 · godan', g1d: 'Terminan en -u: 書く, 飲む, 話す, 待つ, 買う… y los -る cuya vocal anterior es a/u/o (取る, 作る, 登る).',
    g2: 'Grupo 2 · ichidan', g2d: 'Terminan en -iる / -eる: 食べる, 見る, 起きる, 寝る. Se quita る y se añade la terminación.',
    g3: 'Grupo 3 · irregulares', g3d: 'する (y todos los ～する: 勉強する) y 来る (くる).',
    warn: '⚠️ Parecen del grupo 2 pero son del grupo 1: 帰る, 入る, 走る, 知る, 切る, 要る, 減る, 限る, 喋る, 滑る.',
    practice: '🎯 Practicar conjugaciones', forms: 'Formas y cómo se construyen', table: 'Tabla completa',
    nakatta: 'Pasado negativo llano', used: 'Se usa en:', review: '活用 · Repaso', all: 'Ver toda la conjugación →' },
  en: { title: '活用 · Conjugation', which: 'Which group is the verb in?',
    g1: 'Group 1 · godan', g1d: 'They end in -u: 書く, 飲む, 話す, 待つ, 買う… and the -る verbs whose previous vowel is a/u/o (取る, 作る, 登る).',
    g2: 'Group 2 · ichidan', g2d: 'They end in -iる / -eる: 食べる, 見る, 起きる, 寝る. Drop る and add the ending.',
    g3: 'Group 3 · irregular', g3d: 'する (and every ～する verb: 勉強する) and 来る (くる).',
    warn: '⚠️ They look like group 2 but are group 1: 帰る, 入る, 走る, 知る, 切る, 要る, 減る, 限る, 喋る, 滑る.',
    practice: '🎯 Practise conjugations', forms: 'Forms and how to build them', table: 'Full table',
    nakatta: 'Plain past negative', used: 'Used in:', review: '活用 · Review', all: 'See the whole conjugation →' },
};
const X = k => (ES() ? TX.es : TX.en)[k];

let verbIdx = 0;
let quiz = null;

function formCard(f, open) {
  const ex = f.id === 'plain' || f.id === 'adj' ? '' : `<div class="cj-mini">${SAMPLE.map(v => `<div><span class="cj-g g${v[2]}">${GBADGE[v[2]]}</span>${cell(conjugate(v, 'dict'))}<span class="cj-arrow">→</span>${cell(conjugate(v, f.id))}</div>`).join('')}</div>`;
  return `<div class="card cj-form ${open ? 'open' : ''}" id="cj-${f.id}">
    <div class="cj-head" onclick="this.parentNode.classList.toggle('open')"><span class="cj-tag">${esc(F(f, 'short'))}</span><b>${esc(F(f, 'label'))}</b><span class="muted small">${f.ja}</span><span class="grow"></span><span class="cj-chev">›</span></div>
    <div class="cj-body">
      <p>${esc(F(f, 'what'))}</p>
      <ul>${F(f, 'rules').map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      ${ex}
      <div class="small muted mt-8"><b>${X('used')}</b> ${esc(F(f, 'uses'))}</div>
    </div></div>`;
}

register('conj', async (el, params = {}) => {
  const focus = params.f;
  const v = VERBS[verbIdx];
  el.innerHTML = `<div class="fade">
    ${header(X('title'), true)}
    <div class="card cj-intro">
      <div class="h3 mb-8">${X('which')}</div>
      <div class="cj-groups">
        <div><span class="cj-g g1">I</span><b>${X('g1')}</b><br><span class="small">${X('g1d')}</span></div>
        <div><span class="cj-g g2">II</span><b>${X('g2')}</b><br><span class="small">${X('g2d')}</span></div>
        <div><span class="cj-g g3">III</span><b>${X('g3')}</b><br><span class="small">${X('g3d')}</span></div>
      </div>
      <div class="small muted mt-8">${X('warn')}</div>
    </div>
    <button class="btn mt-12" onclick="window.__cjQuiz()">${X('practice')}</button>
    <div id="cj-quiz"></div>

    <div class="sec-label">${X('forms')}</div>
    ${FORMS.map(f => formCard(f, f.id === focus)).join('')}

    <div class="sec-label">${X('table')}</div>
    <div class="cj-verbs">${VERBS.map((x, i) => `<button class="set-chip ${i === verbIdx ? 'done' : ''}" onclick="window.__cjVerb(${i})">${x[0]}</button>`).join('')}</div>
    <div class="card" id="cj-table">
      <div class="flex items-center gap-8 mb-8"><span class="cj-g g${v[2]}">${GBADGE[v[2]]}</span><b style="font-size:20px">${v[0]}</b><span class="muted">${v[1]} · ${esc(VM(v))}</span></div>
      <div class="muted small mb-8">${(ES() ? GROUP_LABEL : GROUP_LABEL_EN)[v[2]]}</div>
      <table class="cj-table">${TABLE_FORMS.map(id => `<tr onclick="window.__conj('${id}')"><th>${esc(F(FORM[id], 'short'))}<span>${esc(F(FORM[id], 'label'))}</span></th><td>${cell(conjugate(v, id))}</td></tr>`).join('')}
        <tr><th>V-なかった<span>${X('nakatta')}</span></th><td>${cell(conjugate(v, 'nakatta'))}</td></tr></table>
    </div>
  </div>${bottomNav('reference')}`;
  if (focus) setTimeout(() => document.getElementById('cj-' + focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
});

window.__cjVerb = (i) => { verbIdx = i; go('conj'); };
window.__cjSay = (r) => speak(r);

// Bottom sheet with one form — opened from grammar explanations.
window.__conj = (id) => {
  const f = FORM[id];
  if (!f) return go('conj');
  document.querySelectorAll('.conj-sheet').forEach(x => x.remove());
  const sh = document.createElement('div');
  sh.className = 'sheet-backdrop conj-sheet fade';
  sh.innerHTML = `<div class="sheet slideup" style="max-height:88vh">
    <div class="flex items-center justify-between mb-12"><span class="h3">${X('review')}</span>
      <button class="btn btn-soft btn-small" onclick="this.closest('.sheet-backdrop').remove()">${t('close')}</button></div>
    ${formCard(f, true)}
    <button class="btn mt-12" onclick="this.closest('.sheet-backdrop').remove();window.__nav('conj',{f:'${id}'})">${X('all')}</button></div>`;
  sh.addEventListener('click', e => { if (e.target === sh) sh.remove(); });
  document.body.appendChild(sh);
};

// Quick quiz: random verb + form, four options built from other forms of the same verb.
const QF = ['masu', 'stem', 'nai', 'te', 'ta', 'ba', 'vol', 'pot', 'pas', 'caus', 'imp'];
function newQ() {
  const v = QUIZ_VERBS[Math.floor(Math.random() * QUIZ_VERBS.length)];
  const f = QF[Math.floor(Math.random() * QF.length)];
  const ans = conjugate(v, f).w;
  const opts = new Set([ans]);
  // plausible wrong answers: forms easily confused with this one, the same form built as another group, then the rest
  const NEAR = { masu: ['stem', 'nai'], stem: ['masu', 'naistem'], nai: ['naistem', 'vol', 'pas'], te: ['ta', 'tara'], ta: ['te', 'tara'],
    ba: ['pot', 'imp', 'tara'], vol: ['imp', 'nai'], pot: ['pas', 'caus', 'ba'], pas: ['pot', 'caus'], caus: ['pas', 'pot'], imp: ['ba', 'vol', 'pot'] };
  const pool = [];
  for (const g of [1, 2]) if (g !== v[2] && v[2] !== 3) pool.push(conjugate([v[0], v[1], g], f).w);
  if (v[2] === 3) pool.push(...['pas', 'pot', 'caus'].map(x => conjugate(v, x).w));
  pool.push(...(NEAR[f] || []).map(x => conjugate(v, x).w));
  pool.push(...QF.map(x => conjugate(v, x).w));
  for (const w of pool) { if (opts.size >= 4) break; if (w && w !== ans) opts.add(w); }
  return { v, f, ans, opts: [...opts].sort(() => Math.random() - .5), ok: 0, n: 0 };
}
function drawQuiz() {
  const box = document.getElementById('cj-quiz');
  if (!box || !quiz) return;
  const { v, f } = quiz.q;
  box.innerHTML = `<div class="card mt-12 cj-q">
    <div class="muted small">${quiz.ok}/${quiz.n} · <span class="cj-g g${v[2]}">${GBADGE[v[2]]}</span></div>
    <div class="cj-qv">${v[0]} <span class="muted small">(${v[1]} · ${esc(VM(v))})</span></div>
    <div class="mb-12">→ <b>${esc(F(FORM[f], 'label'))}</b> <a class="vf" onclick="window.__conj('${f}')">?</a></div>
    <div class="cj-opts">${quiz.q.opts.map(o => `<button class="btn btn-soft" onclick="window.__cjAns(this,'${esc(o)}')">${esc(o)}</button>`).join('')}</div></div>`;
}
window.__cjQuiz = () => { quiz = { ok: 0, n: 0, q: newQ() }; drawQuiz(); document.getElementById('cj-quiz')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
window.__cjAns = (btn, o) => {
  if (quiz.lock) return;
  quiz.lock = true; quiz.n++;
  const good = o === quiz.q.ans;
  if (good) { quiz.ok++; update({ xp: (S.xp || 0) + 1 }); }
  btn.parentNode.querySelectorAll('button').forEach(b => {
    if (b.textContent === quiz.q.ans) b.classList.add('ok');
    else if (b === btn) b.classList.add('bad');
  });
  speak(conjugate(quiz.q.v, quiz.q.f).r);
  setTimeout(() => { quiz.lock = false; quiz.q = newQ(); drawQuiz(); }, good ? 900 : 2000);
};
