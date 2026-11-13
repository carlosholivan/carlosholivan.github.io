// Spanish conjugation reference: choose a verb, see every tense and person, plus a quick quiz.
// window.__conj(tense, verb) opens it from anywhere.
import { register, go } from '../router.js?v=202611141200';
import { header, bottomNav } from '../ui/components.js?v=202611141200';
import { speak } from '../audio.js?v=202611141200';
import { VERBS, PERSONS, IMP_PERSONS, TENSES, conjugate, participle, gerund } from '../conj.js?v=202611141200';
import { S } from '../state.js?v=202611141200';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L = o => (o && (o[S.lang] || o.en)) || '';

const TX = {
  title: { en: 'Conjugation', ja: '活用', zh: '动词变位' },
  intro: {
    en: 'Spanish verbs end in <b>-ar</b>, <b>-er</b> or <b>-ir</b>. Each tense adds endings that show <b>who</b> does the action, so the subject pronoun is usually dropped (<i>hablo</i> = I speak). Choose a verb and a tense; tap a form to hear it.',
    ja: 'スペイン語の動詞は <b>-ar</b>・<b>-er</b>・<b>-ir</b> で終わります。時制ごとの語尾が<b>誰が</b>するかを示すので、主語はふつう省略します（<i>hablo</i>＝私は話す）。動詞と時制を選び、形をタップすると発音が聞けます。',
    zh: '西班牙语动词以 <b>-ar</b>、<b>-er</b> 或 <b>-ir</b> 结尾。每个时态的词尾表示<b>谁</b>做动作，所以主语代词通常省略（<i>hablo</i> = 我说）。选择一个动词和时态，点击变位形式即可听发音。',
  },
  quiz: { en: 'Practise conjugations', ja: '活用を練習する', zh: '练习变位' },
  participle: { en: 'Participle', ja: '過去分詞', zh: '过去分词' },
  gerund: { en: 'Gerund', ja: '現在分詞', zh: '副动词' },
  neg: { en: 'Negative: no + subjunctive', ja: '否定：no＋接続法', zh: '否定：no + 虚拟式' },
  groups: {
    reg: [{ en: 'Regular verbs', ja: '規則動詞', zh: '规则动词' }, { en: 'They follow the model endings of -ar (hablar), -er (comer) and -ir (vivir).', ja: '-ar（hablar）・-er（comer）・-ir（vivir）の語尾どおりに活用。', zh: '按照 -ar（hablar）、-er（comer）、-ir（vivir）的词尾规则变位。' }],
    orto: [{ en: 'Spelling changes', ja: '綴りが変わる動詞', zh: '拼写变化' }, { en: 'Regular in sound, but the spelling changes to keep it: busqué, llegué, empecé, leyó, conozco.', ja: '音は規則的ですが、音を保つために綴りが変わります：busqué, llegué, empecé, leyó, conozco。', zh: '发音规则，但为保持发音拼写会变：busqué、llegué、empecé、leyó、conozco。' }],
    stem: [{ en: 'Stem-changing verbs', ja: '語幹が変わる動詞', zh: '词根变化动词' }, { en: 'The stressed vowel changes: e→ie (pienso), o→ue (puedo), e→i (pido). Not in nosotros / vosotros.', ja: 'アクセントのある母音が変化：e→ie（pienso）、o→ue（puedo）、e→i（pido）。nosotros / vosotros では変わりません。', zh: '重读元音变化：e→ie（pienso）、o→ue（puedo）、e→i（pido）。nosotros / vosotros 不变。' }],
    yo: [{ en: 'Irregular “yo” and strong past', ja: '1人称単数が不規則な動詞', zh: '第一人称不规则动词' }, { en: 'Irregular first person (tengo, hago, digo) and preterite with a new stem (tuve, hice, dije).', ja: '1人称が不規則（tengo, hago, digo）で、点過去の語幹も変わります（tuve, hice, dije）。', zh: '第一人称不规则（tengo、hago、digo），简单过去时词根也变（tuve、hice、dije）。' }],
    irr: [{ en: 'Very irregular', ja: '特に不規則な動詞', zh: '特殊不规则动词' }, { en: 'The most frequent verbs — learn them by heart. Note that ser and ir share the preterite (fui).', ja: '最も頻度が高い動詞なので丸ごと覚えましょう。ser と ir は点過去が同じ（fui）。', zh: '最常用的动词，需要熟记。ser 和 ir 的简单过去时相同（fui）。' }],
  },
};

let verbIdx = 0;
let tense = 'pres';
let quiz = null;

const form = (f) => f && f !== '—'
  ? `<span class="cj-es" onclick="event.stopPropagation();window.__cjSay('${esc(f)}')">${esc(f)}</span>`
  : '—';

function table(v) {
  const persons = tense === 'imp' ? IMP_PERSONS : PERSONS;
  return `<table class="cj-table">${persons.map(p => {
    const f = conjugate(v, tense, p.id);
    return `<tr onclick="window.__cjSay('${esc(f)}')"><th><span class="cj-pr">${esc(p.es)}</span></th><td>${form(f)}</td></tr>`;
  }).join('')}</table>`;
}

register('conj', async (el, params = {}) => {
  if (params.t && TENSES.some(x => x.id === params.t)) tense = params.t;
  if (params.v) { const i = VERBS.findIndex(x => x.w === params.v); if (i >= 0) verbIdx = i; }
  const v = VERBS[verbIdx];
  const T = TENSES.find(x => x.id === tense);
  el.innerHTML = `<div class="fade">
    ${header('Conjugación · ' + L(TX.title))}
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
        <span class="cj-big" onclick="window.__cjSay('${esc(v.w)}')">${esc(v.w)}</span>
        <span class="muted">${esc(L(v))}</span>
      </div>
      <div class="cj-facts small">
        <div><b>${L(TX.participle)}:</b> ${form(participle(v))}</div>
        <div><b>${L(TX.gerund)}:</b> ${form(gerund(v))}</div>
      </div>
      <div class="cj-tabs">${TENSES.map(x => `<button class="chip ${x.id === tense ? 'on' : ''}" onclick="window.__cjTense('${x.id}')">${esc(x.es)}</button>`).join('')}</div>
      <div class="muted small mb-8"><b class="cj-tname">${esc(T.es)}</b> · ${esc(L(T))} — ${esc(L(T.note))}</div>
      ${table(v)}
      ${tense === 'imp' && v.w !== 'haber' ? `<div class="muted small mt-8">${L(TX.neg)}: ${form('no ' + conjugate(v, 'subj', 1))}</div>` : ''}
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
const QUIZ_TENSES = ['pres', 'pres', 'pret', 'pret', 'imperf', 'fut', 'cond', 'subj', 'perf', 'impsubj', 'imp'];
function newQ() {
  const v = pick(VERBS.filter(x => x.w !== 'haber'));
  const tn = pick(QUIZ_TENSES);
  const p = pick((tn === 'imp' ? IMP_PERSONS : PERSONS).map(x => x.id));
  const answer = conjugate(v, tn, p);
  const pool = new Set();
  for (const t2 of ['pres', 'pret', 'imperf', 'fut', 'subj']) for (const q of PERSONS) { const f = conjugate(v, t2, q.id); if (f && f !== answer) pool.add(f); }
  for (const q of PERSONS) { const f = conjugate(v, tn, q.id); if (f && f !== answer) pool.add(f); }
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
    <div class="mb-12"><b>${esc(T.es)}</b> <span class="muted small">${esc(L(T))}</span> · <span class="cj-pr">${esc(P.es)}</span></div>
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
