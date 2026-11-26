// German conjugation reference: choose a verb, see every tense with every person, plus a quick quiz.
// window.__conj(tense, verb) opens it from anywhere.
import { register, go } from '../router.js?v=202611262115';
import { header, bottomNav } from '../ui/components.js?v=202611262115';
import { speak } from '../audio.js?v=202611262115';
import { VERBS, PERSONS, IMP_PERSONS, TENSES, conjugate, withSubject, participle, gerund, auxOf, principalParts } from '../conj.js?v=202611262115';
import { S } from '../state.js?v=202611262115';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsq = s => esc(s).replace(/&#39;/g, "\\'");
const L = o => (o && (o[S.lang] || o.es)) || '';

const TX = {
  title: { es: 'Conjugación', en: 'Conjugation' },
  intro: {
    es: 'Los verbos alemanes son <b>débiles</b> (regulares: machen → machte → gemacht), <b>fuertes</b> (cambian la vocal: fahren → fuhr → gefahren) o <b>mixtos</b> (denken → dachte → gedacht). Los verbos con prefijo <b>separable</b> lo mandan al final (ich stehe um 7 Uhr <b>auf</b>); los <b>inseparables</b> (be-, ver-, er-…) no llevan ge- en el participio (verstanden). Elige un verbo y un tiempo; toca una forma para oírla.',
    en: 'German verbs are <b>weak</b> (regular: machen → machte → gemacht), <b>strong</b> (they change their vowel: fahren → fuhr → gefahren) or <b>mixed</b> (denken → dachte → gedacht). Verbs with a <b>separable</b> prefix send it to the end (ich stehe um 7 Uhr <b>auf</b>); <b>inseparable</b> prefixes (be-, ver-, er-…) take no ge- in the participle (verstanden). Choose a verb and a tense; tap a form to hear it.',
  },
  quiz: { es: 'Practicar conjugaciones', en: 'Practise conjugations' },
  participle: { es: 'Participio II', en: 'Past participle' },
  gerund: { es: 'Participio I', en: 'Present participle' },
  aux: { es: 'Auxiliar del Perfekt', en: 'Perfekt auxiliary' },
  parts: { es: 'Formas básicas', en: 'Principal parts' },
  neg: { es: 'Negativo', en: 'Negative' },
  groups: {
    irr: [{ es: 'Los más irregulares', en: 'The most irregular' }, { es: 'sein, haben y werden son también auxiliares; wissen y tun son muy frecuentes. Apréndelos primero.', en: 'sein, haben and werden are also auxiliaries; wissen and tun are very frequent. Learn them first.' }],
    modal: [{ es: 'Verbos modales', en: 'Modal verbs' }, { es: 'Cambian la vocal en singular y no llevan terminación en ich / er (ich kann, er muss). El infinitivo va al final: Ich kann gut schwimmen. möchte es el Konjunktiv II de mögen.', en: 'They change their vowel in the singular and take no ending with ich / er (ich kann, er muss). The infinitive goes to the end: Ich kann gut schwimmen. möchte is the Konjunktiv II of mögen.' }],
    weak: [{ es: 'Verbos débiles (regulares)', en: 'Weak (regular) verbs' }, { es: 'Raíz + -e, -st, -t, -en, -t, -en; pasado con -te; participio ge- … -t. Con raíz en -t / -d o consonante + m / n se añade una e (du arbeitest, er öffnet). Los verbos en -ieren no llevan ge- (studiert).', en: 'Stem + -e, -st, -t, -en, -t, -en; past with -te; participle ge- … -t. Stems ending in -t / -d or consonant + m / n add an e (du arbeitest, er öffnet). Verbs in -ieren take no ge- (studiert).' }],
    strong: [{ es: 'Verbos fuertes', en: 'Strong verbs' }, { es: 'Cambian la vocal en el pasado y a menudo en el participio, que acaba en -en (sprechen → sprach → gesprochen). Muchos cambian también en du / er del presente: a → ä (fahren → fährt), e → i / ie (geben → gibt, lesen → liest).', en: 'They change their vowel in the past and often in the participle, which ends in -en (sprechen → sprach → gesprochen). Many also change in du / er of the present: a → ä (fahren → fährt), e → i / ie (geben → gibt, lesen → liest).' }],
    mixed: [{ es: 'Verbos mixtos', en: 'Mixed verbs' }, { es: 'Cambian la vocal como los fuertes pero llevan las terminaciones de los débiles: denken → dachte → gedacht, bringen → brachte → gebracht.', en: 'They change their vowel like strong verbs but take the endings of weak verbs: denken → dachte → gedacht, bringen → brachte → gebracht.' }],
    sep: [{ es: 'Verbos separables', en: 'Separable verbs' }, { es: 'El prefijo (an-, auf-, aus-, ein-, mit-, zu-…) va al final de la frase principal; en el participio, ge- va entre prefijo y verbo (angerufen) y con zu: anzurufen. En subordinadas se escribe junto: …, weil ich früh aufstehe.', en: 'The prefix (an-, auf-, aus-, ein-, mit-, zu-…) goes to the end of the main clause; in the participle, ge- goes between prefix and verb (angerufen), and with zu: anzurufen. In subordinate clauses it is written as one word: …, weil ich früh aufstehe.' }],
    insep: [{ es: 'Verbos inseparables', en: 'Inseparable verbs' }, { es: 'be-, emp-, ent-, er-, ge-, miss-, ver-, zer- no se separan nunca y el participio no lleva ge-: besuchen → besucht, verstehen → verstanden.', en: 'be-, emp-, ent-, er-, ge-, miss-, ver-, zer- never separate and the participle has no ge-: besuchen → besucht, verstehen → verstanden.' }],
    refl: [{ es: 'Verbos reflexivos', en: 'Reflexive verbs' }, { es: 'mich, dich, sich, uns, euch, sich van detrás del verbo conjugado. El Perfekt se forma con haben: Ich habe mich gefreut.', en: 'mich, dich, sich, uns, euch, sich go after the conjugated verb. The Perfekt is formed with haben: Ich habe mich gefreut.' }],
  },
};

let verbIdx = 0;
let tense = 'praes';
let quiz = null;

const form = (f) => f && f !== '—'
  ? `<span class="cj-es" onclick="event.stopPropagation();window.__cjSay('${jsq(f)}')">${esc(f)}</span>`
  : '—';

function table(v) {
  const persons = tense === 'imp' ? IMP_PERSONS : v.only3 ? PERSONS.filter(p => p.id === 2) : PERSONS;
  return `<table class="cj-table">${persons.map(p => {
    const f = withSubject(v, tense, p.id);
    return `<tr onclick="window.__cjSay('${jsq(f)}')"><th><span class="cj-pr">${esc(p.de)}</span> <span class="muted small">${esc(L(p))}</span></th><td>${form(f)}</td></tr>`;
  }).join('')}</table>`;
}

// "ich arbeite nicht", "ich habe nicht gearbeitet", "ich stehe nicht auf"
function negative(v) {
  if (tense === 'imp') return '';
  const f = conjugate(v, tense, 0);
  if (!f) return '';
  const parts = f.split(' ');
  let neg;
  if (['perf', 'plusq', 'k2v', 'fut1', 'fut2'].includes(tense) || (tense === 'k2' && parts.length > 1 && /^würde$/.test(parts[0]))) {
    const n = /^(mich|dich|sich|uns|euch)$/.test(parts[1]) ? 2 : 1;
    neg = [...parts.slice(0, n), 'nicht', ...parts.slice(n)].join(' ');
  } else if (parts.length > 1 && !/^(mich|dich|sich|uns|euch)$/.test(parts[parts.length - 1])) {
    neg = [...parts.slice(0, -1), 'nicht', parts[parts.length - 1]].join(' ');
  } else neg = f + ' nicht';
  return `<div class="muted small mt-8"><b>${L(TX.neg)}:</b> ${form('ich ' + neg)} <span class="muted">(nicht)</span></div>`;
}

register('conj', async (el, params = {}) => {
  if (params.t && TENSES.some(x => x.id === params.t)) tense = params.t;
  if (params.v) { const i = VERBS.findIndex(x => x.w === params.v); if (i >= 0) verbIdx = i; }
  const v = VERBS[verbIdx];
  const T = TENSES.find(x => x.id === tense);
  el.innerHTML = `<div class="fade">
    ${header('Konjugation · ' + L(TX.title))}
    <div class="card cj-intro">
      <p class="small" style="margin:0 0 8px">${L(TX.intro)}</p>
      <button class="btn mt-8" onclick="window.__cjQuiz()">🎯 ${L(TX.quiz)}</button>
    </div>
    <div id="cj-quiz"></div>
    ${Object.entries(TX.groups).map(([g, [label, note]]) => {
      const list = VERBS.map((x, i) => [x, i]).filter(([x]) => x.group === g);
      return `<div class="sec-label">${esc(L(label))}</div><div class="muted small mb-8">${esc(L(note))}</div>
        <div class="cj-verbs">${list.map(([x, i]) => `<button class="set-chip ${i === verbIdx ? 'done' : ''}" onclick="window.__cjVerb(${i})">${esc(x.w)}</button>`).join('')}</div>`;
    }).join('')}
    <div class="card mt-12" id="cj-table">
      <div class="flex items-center gap-8" style="flex-wrap:wrap">
        <span class="cj-big" onclick="window.__cjSay('${jsq(v.w)}')">${esc(v.w)}</span>
        <span class="muted">${esc(L(v))}</span>
      </div>
      <div class="cj-facts small">
        <div><b>${L(TX.participle)}:</b> ${form(participle(v))}</div>
        <div><b>${L(TX.gerund)}:</b> ${form(gerund(v))}</div>
        <div><b>${L(TX.aux)}:</b> ${esc(auxOf(v))}</div>
        ${principalParts(v.w) ? `<div><b>${L(TX.parts)}:</b> ${form(principalParts(v.w))}</div>` : ''}
      </div>
      <div class="cj-tabs">${TENSES.map(x => `<button class="chip ${x.id === tense ? 'on' : ''}" onclick="window.__cjTense('${x.id}')">${esc(x.de)}</button>`).join('')}</div>
      <div class="muted small mb-8"><b class="cj-tname">${esc(T.de)}</b> · ${esc(L(T))} — ${esc(L(T.note))}</div>
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
const QUIZ_TENSES = ['praes', 'praes', 'praes', 'perf', 'perf', 'praet', 'praet', 'fut1', 'k2', 'imp'];
function newQ() {
  const v = pick(VERBS.filter(x => x.group !== 'modal' || true));
  const tn = pick(QUIZ_TENSES);
  if (tn === 'imp' && v.group === 'modal') return newQ();
  const p = pick((tn === 'imp' ? IMP_PERSONS : PERSONS).map(x => x.id));
  const answer = conjugate(v, tn, p);
  const pool = new Set();
  for (const t2 of ['praes', 'praet', 'perf', 'k2']) for (const q of PERSONS) { const f = conjugate(v, t2, q.id); if (f && f !== answer) pool.add(f); }
  for (const q of PERSONS) { const f = conjugate(v, tn, q.id); if (f && f !== answer) pool.add(f); }
  // The same form can belong to several persons (wir / sie kaufen): such forms are not offered twice.
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
    <div class="cj-qv">${esc(q.v.w)} <span class="muted small">(${esc(L(q.v))})</span></div>
    <div class="mb-12"><b>${esc(T.de)}</b> <span class="muted small">${esc(L(T))}</span> · <span class="cj-pr">${esc(P.de)}</span> <span class="muted small">(${esc(L(P))})</span></div>
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
