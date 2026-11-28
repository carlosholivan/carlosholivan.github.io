// English verbs reference: the three forms of every irregular verb, every tense with every person, plus a quiz.
// window.__conj(tense, verb) opens it from anywhere.
import { register, go } from '../router.js?v=202611282113';
import { header, bottomNav } from '../ui/components.js?v=202611282113';
import { speak } from '../audio.js?v=202611282113';
import { VERBS, PERSONS, IMP_PERSONS, TENSES, conjugate, participle, gerund, pastOf } from '../conj.js?v=202611282113';
import { S } from '../state.js?v=202611282113';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsq = s => esc(s).replace(/&#39;/g, "\\'");
const L = o => (o && (o[S.lang] || o.es)) || '';

const TX = {
  title: { es: 'Verbos', ja: '動詞', zh: '动词' },
  intro: {
    es: 'Los verbos ingleses apenas cambian: casi todo depende de los <b>auxiliares</b> (do, be, have, will, would). Lo que hay que aprender de memoria son las <b>tres formas</b> de los irregulares: forma base, pasado y participio (<i>go – went – gone</i>). Elige un verbo y un tiempo; toca una forma para oírla.',
    ja: '英語の動詞はほとんど形が変わらず、<b>助動詞</b>（do, be, have, will, would）で時制を作ります。覚えるべきなのは不規則動詞の<b>3つの形</b>：原形・過去形・過去分詞（<i>go – went – gone</i>）。動詞と時制を選び、形をタップすると発音が聞けます。',
    zh: '英语动词变化很少，时态主要靠<b>助动词</b>（do、be、have、will、would）。需要记住的是不规则动词的<b>三种形式</b>：原形、过去式、过去分词（<i>go – went – gone</i>）。选择一个动词和时态，点击即可听发音。',
  },
  quiz: { es: 'Practicar los irregulares', ja: '不規則動詞を練習する', zh: '练习不规则动词' },
  forms: { es: 'Las tres formas', ja: '3つの形', zh: '三种形式' },
  base: { es: 'Forma base', ja: '原形', zh: '原形' },
  past: { es: 'Pasado', ja: '過去形', zh: '过去式' },
  participle: { es: 'Participio', ja: '過去分詞', zh: '过去分词' },
  gerund: { es: 'Forma -ing', ja: '-ing 形', zh: '-ing 形式' },
  third: { es: '3.ª persona', ja: '3人称単数', zh: '第三人称单数' },
  neg: { es: 'Negativo', ja: '否定', zh: '否定' },
  us: { es: 'En EE. UU. también', ja: '米国では', zh: '美式英语也用' },
  qPast: { es: '¿Cuál es el pasado?', ja: '過去形は？', zh: '过去式是？' },
  qPp: { es: '¿Cuál es el participio?', ja: '過去分詞は？', zh: '过去分词是？' },
  groups: {
    reg: [{ es: 'Verbos regulares', ja: '規則動詞', zh: '规则动词' }, { es: 'Pasado y participio en -ed. Ojo a la ortografía: liked, studied, stopped, travelled (en EE. UU. traveled).', ja: '過去形・過去分詞は -ed。つづりに注意：liked, studied, stopped, travelled（米：traveled）。', zh: '过去式和过去分词加 -ed。注意拼写：liked、studied、stopped、travelled（美式 traveled）。' }],
    irr: [{ es: 'Los más irregulares', ja: '特に重要な不規則動詞', zh: '最重要的不规则动词' }, { es: 'be, have, do y go: los más frecuentes y también auxiliares. Apréndelos primero.', ja: 'be・have・do・go：最頻出で、助動詞にもなります。最初に覚えましょう。', zh: 'be、have、do 和 go：最常用，也作助动词。先学它们。' }],
    aaa: [{ es: 'Tres formas iguales', ja: '3つとも同じ形', zh: '三种形式相同' }, { es: 'cut – cut – cut: el pasado y el participio son iguales a la forma base. Solo cambia la 3.ª persona del presente (she cuts).', ja: 'cut – cut – cut：過去形も過去分詞も原形と同じ。現在形の3人称単数だけ -s（she cuts）。', zh: 'cut – cut – cut：过去式、过去分词与原形相同。只有一般现在时第三人称单数加 -s（she cuts）。' }],
    abb: [{ es: 'Pasado = participio', ja: '過去形＝過去分詞', zh: '过去式 = 过去分词' }, { es: 'buy – bought – bought: dos formas iguales. Muchos acaban en -ought/-aught o -t (sleep – slept).', ja: 'buy – bought – bought：2つの形が同じ。-ought/-aught や -t で終わるものが多い（sleep – slept）。', zh: 'buy – bought – bought：两种形式相同。很多以 -ought/-aught 或 -t 结尾（sleep – slept）。' }],
    abc: [{ es: 'Tres formas distintas', ja: '3つとも違う形', zh: '三种形式都不同' }, { es: 'go – went – gone, see – saw – seen, write – wrote – written. Hay que aprender las tres.', ja: 'go – went – gone、see – saw – seen、write – wrote – written。3つとも覚える必要があります。', zh: 'go – went – gone、see – saw – seen、write – wrote – written。三种都要记。' }],
  },
};

let verbIdx = 0;
let tense = 'pres';
let quiz = null;

const forms = (f) => String(f).split('/').map(form).join(' / ');
const form = (f) => f && f !== '—'
  ? `<span class="cj-es" onclick="event.stopPropagation();window.__cjSay('${jsq(f)}')">${esc(f)}</span>`
  : '—';

function table(v) {
  const persons = tense === 'imp' ? IMP_PERSONS : PERSONS;
  return `<table class="cj-table">${persons.map(p => {
    const f = conjugate(v, tense, p.id);
    return `<tr onclick="window.__cjSay('${jsq(f)}')"><th><span class="cj-pr">${esc(L(p))}</span></th><td>${form(f)}</td></tr>`;
  }).join('')}</table>`;
}

register('conj', async (el, params = {}) => {
  if (params.t && TENSES.some(x => x.id === params.t)) tense = params.t;
  if (params.v) { const i = VERBS.findIndex(x => x.w === params.v); if (i >= 0) verbIdx = i; }
  const v = VERBS[verbIdx];
  const T = TENSES.find(x => x.id === tense);
  el.innerHTML = `<div class="fade">
    ${header('Verbs · ' + L(TX.title))}
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
        <div><b>${L(TX.base)}:</b> ${form(v.w)}</div>
        <div><b>${L(TX.past)}:</b> ${forms(pastOf(v))}</div>
        <div><b>${L(TX.participle)}:</b> ${forms(participle(v))}${v.ppUS ? ` <span class="muted">(${L(TX.us)} ${form(v.ppUS)})</span>` : ''}</div>
        <div><b>${L(TX.gerund)}:</b> ${form(gerund(v))}</div>
      </div>
      <div class="cj-tabs">${TENSES.map(x => `<button class="chip ${x.id === tense ? 'on' : ''}" onclick="window.__cjTense('${x.id}')">${esc(x.en)}</button>`).join('')}</div>
      <div class="muted small mb-8"><b class="cj-tname">${esc(T.en)}</b> · ${esc(L(T))} — ${esc(L(T.note))}</div>
      ${table(v)}
      ${tense === 'imp' ? `<div class="muted small mt-8">${L(TX.neg)}: ${form("don't " + v.w)} · ${form("let's not " + v.w)}</div>` : ''}
    </div>
  </div>${bottomNav('reference')}`;
  if (params.t || params.v) document.getElementById('cj-table')?.scrollIntoView({ block: 'start' });
});

window.__cjVerb = (i) => { verbIdx = i; go('conj'); setTimeout(() => document.getElementById('cj-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
window.__cjTense = (id) => { tense = id; go('conj'); setTimeout(() => document.getElementById('cj-table')?.scrollIntoView({ block: 'start' }), 30); };
window.__cjSay = (w) => speak(w);
window.__conj = (t, v) => window.__nav('conj', { t, v });

// Quiz: past or participle of an irregular verb, or a verb + tense + person.
const pick = a => a[Math.floor(Math.random() * a.length)];
const QUIZ_TENSES = ['pres', 'past', 'past', 'perf', 'perf', 'prog', 'pastprog', 'plup', 'will', 'cond', 'condperf'];
function newQ() {
  const irr = VERBS.filter(x => x.group !== 'reg');
  if (Math.random() < 0.6) {
    const v = pick(irr), kind = Math.random() < 0.5 ? 'past' : 'pp';
    const answer = first(kind === 'past' ? pastOf(v) : participle(v));
    const pool = new Set([v.w, first(pastOf(v)), first(participle(v)), v.w + 'ed', gerund(v), first(pastOf(v)) + 'ed', v.w.replace(/e?$/, 'en')]);
    pool.delete(answer);
    if (kind === 'pp' && answer === first(pastOf(v))) pool.delete(first(pastOf(v)));
    const opts = [answer, ...[...pool].filter(x => x !== answer).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
    return { v, kind, answer, opts };
  }
  const v = pick(VERBS);
  const tn = pick(QUIZ_TENSES);
  const p = pick(PERSONS.map(x => x.id));
  const answer = conjugate(v, tn, p);
  const pool = new Set();
  for (const t2 of QUIZ_TENSES) { const f = conjugate(v, t2, p); if (f && f !== answer) pool.add(f); }
  const opts = [answer, ...[...pool].sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
  return { v, tn, p, answer, opts };
}
const first = s => String(s).split('/')[0];
function drawQuiz() {
  const box = document.getElementById('cj-quiz'); if (!box) return;
  const q = quiz.q;
  let ask;
  if (q.kind) ask = `<div class="mb-12"><b>${L(q.kind === 'past' ? TX.qPast : TX.qPp)}</b></div>`;
  else {
    const P = PERSONS.find(x => x.id === q.p);
    const T = TENSES.find(x => x.id === q.tn);
    ask = `<div class="mb-12"><b>${esc(T.en)}</b> <span class="muted small">${esc(L(T))}</span> · <span class="cj-pr">${esc(P.en)}</span></div>`;
  }
  box.innerHTML = `<div class="card mt-12">
    <div class="flex items-center"><b>🎯 ${quiz.ok}/${quiz.n}</b><span class="grow"></span><button class="btn btn-soft btn-small" onclick="window.__cjQuizClose()">✕</button></div>
    <div class="cj-qv">${esc(q.v.w)} <span class="muted small">(${esc(L(q.v))})</span></div>
    ${ask}
    <div class="cj-opts">${q.opts.map(o => `<button class="btn btn-soft" onclick="window.__cjAns(this,'${jsq(o)}')">${esc(o)}</button>`).join('')}</div></div>`;
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
