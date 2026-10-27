import { S, update } from '../state.js';
import { register, go } from '../router.js';
import { loadTexts, loadUnits, loadGrammar } from '../data.js';
import { TENSES, PERSONS, NOTE_KINDS, REF_LINKS } from '../tenses.js';
import { isUnitDone } from '../state.js';
import { bottomNav, header } from '../ui/components.js';
import { t } from '../i18n.js';
import { levelChips, LEVELS } from '../levels.js';
import { speak, stop } from '../audio.js';

const WORD = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g;

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const tr = (o) => (o && (o[S.lang] || o.en)) || '';
const norm = (s) => (s.match(WORD) || []).join(' ').toLowerCase();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wordCount = (tx) => tx.paragraphs.join(' ').match(WORD).length;

// Unit the learner is working on in this level (first not completed).
async function currentUnit(level) {
  const units = await loadUnits(level).catch(() => []);
  const i = units.findIndex((_, k) => !isUnitDone(level, k + 1));
  return i < 0 ? units.length : i + 1;
}

const isRead = (tx) => (S.texts || {})[tx.id]?.q != null;

// Texts sorted by difficulty + the one that best matches the learner's progress:
// the easiest unread text of the most advanced unit already reached, else the easiest unread one.
export async function textsWithRecommendation(level) {
  const texts = [...await loadTexts(level)].sort((a, b) => (a.order || 0) - (b.order || 0));
  const reached = await currentUnit(level);
  // Prefer unread texts from the unit closest to the current one (easiest first), then earlier units.
  const unread = texts.filter(tx => !isRead(tx));
  const fit = unread.filter(tx => (tx.unit || 0) <= reached)
    .sort((a, b) => (b.unit || 0) - (a.unit || 0) || a.order - b.order);
  const rec = fit[0] || unread[0] || null;
  return { texts, reached, rec };
}

// ── List ──────────────────────────────────────────────────────────
register('texts', async (el) => {
  const { texts, reached, rec } = await textsWithRecommendation(S.level);
  const done = S.texts || {};
  const readCount = texts.filter(isRead).length;
  el.innerHTML = `<div class="fade">
    ${header(t('texts'))}
    ${levelChips(S.level, '__textsLevel')}
    ${texts.length ? `<div class="muted small mb-12">${readCount} / ${texts.length} · ${t('textsOrderHint')}</div>` : ''}
    ${rec ? `<div class="card rec-text" onclick="window.__openText('${rec.id}')">
        <div class="small" style="font-weight:700;color:var(--accent)">⭐ ${t('recommended')}</div>
        <div style="font-weight:800;font-size:18px;margin-top:4px">${esc(rec.title.es)}</div>
        <div class="muted small">${esc(tr(rec.title))} · #${rec.order} · ${wordCount(rec)} ${t('words')}</div>
        <div class="small" style="margin-top:4px">${esc(tr(rec.summary))}</div>
      </div>` : ''}
    ${texts.length ? texts.map(tx => {
      const st = done[tx.id] || {};
      const ahead = (tx.unit || 0) > reached;
      return `<div class="card ref-topic ${ahead ? 'ahead' : ''} ${rec && rec.id === tx.id ? 'is-rec' : ''}" onclick="window.__openText('${tx.id}')">
        <div class="flex items-center gap-8">
          <span class="text-num">${tx.order || ''}</span>
          ${tx.unit ? `<span class="unit-badge">${ahead ? '🔒 ' : ''}${t('unit')} ${tx.unit}</span>` : ''}
          <div class="grow" style="font-weight:700;font-size:16px">${esc(tx.title.es)}</div>
          ${st.q != null ? `<span class="small" style="color:var(--ok);font-weight:700">✓ ${st.q}%</span>` : ''}
        </div>
        <div class="muted small">${esc(tr(tx.title))} · ${wordCount(tx)} ${t('words')}</div>
        <div class="small" style="margin-top:4px">${esc(tr(tx.summary))}</div>
      </div>`;
    }).join('') : `<div class="muted" style="text-align:center;padding:40px 0">${t('noTexts')}</div>`}
  </div>${bottomNav('texts')}`;
});

window.__textsLevel = (l) => { update({ level: l }); go('texts'); };
window.__openText = (id) => go('text', { level: S.level, id });
window.__go = (v, p) => go(v, p);
window.__nextText = async () => {
  const { rec } = await textsWithRecommendation(S.level);
  rec ? window.__openText(rec.id) : go('texts');
};

// ── Detail ────────────────────────────────────────────────────────
register('text', async (el, params) => {
  const tx = (await loadTexts(params.level)).find(x => x.id === params.id);
  if (!tx) { go('texts'); return; }

  const gloss = {};
  for (const [k, v] of Object.entries(tx.glossary)) gloss[norm(k)] = v;
  const phrases = Object.keys(gloss).filter(k => k.includes(' ')).sort((a, b) => b.length - a.length);
  const difficult = tx.difficult.map(norm).filter(Boolean);
  const verbs = tx.verbs || [], notes = tx.notes || [];
  const view = { tab: 'read', showDiff: false, showTr: false, showVerbs: false };

  // Character ranges [start, end, index] of every occurrence of the annotated chunks in paragraph pi.
  function chunkRanges(list, pi, p) {
    const out = [];
    list.forEach((it, idx) => {
      if (it.p !== pi || !it.f) return;
      const re = new RegExp(`(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])${it.f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])`, 'g');
      let m;
      while ((m = re.exec(p))) out.push([m.index, m.index + m[0].length, idx]);
    });
    return out;
  }

  // Wrap every word in a span; words inside a "difficult" expression get class "dw".
  function renderParagraph(p, pi) {
    const lower = p.toLowerCase();
    const diffRanges = [];
    for (const d of difficult) {
      const re = new RegExp(`(^|[^a-záéíóúüñ])(${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[^a-záéíóúüñ]+')})(?![a-záéíóúüñ])`, 'gi');
      let m;
      while ((m = re.exec(lower))) diffRanges.push([m.index + m[1].length, m.index + m[0].length]);
    }
    const vR = chunkRanges(verbs, pi, p), nR = chunkRanges(notes, pi, p);
    let out = '', last = 0, m, wi = 0;
    WORD.lastIndex = 0;
    while ((m = WORD.exec(p))) {
      out += esc(p.slice(last, m.index));
      const dw = diffRanges.some(([a, b]) => m.index >= a && m.index < b);
      const v = vR.find(([a, b]) => m.index >= a && m.index < b);
      const n = nR.find(([a, b]) => m.index >= a && m.index < b);
      const cls = 'tw' + (dw ? ' dw' : '') + (v ? ` vb vg-${TENSES[verbs[v[2]].t]?.g || 'nf'}` : '') + (n ? ' nt' : '');
      out += `<span class="${cls}" data-p="${pi}" data-i="${wi++}"${v ? ` data-v="${v[2]}"` : ''}${n ? ` data-n="${n[2]}"` : ''}>${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(p.slice(last));
  }

  function shell(body) {
    el.innerHTML = `<div class="fade text-view">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__nav('texts')" style="padding:4px">←</button>
        <div class="grow"><div class="h3">${esc(tx.title.es)}</div><div class="muted small">${esc(tr(tx.title))}</div></div>
      </div>
      <div class="tabbar mb-12">
        ${[['read', '📖 ' + t('read')], ['questions', '❓ ' + t('questions')], ['gaps', '✏️ ' + t('gaps')]].map(([id, label]) =>
          `<button class="tab ${view.tab === id ? 'on' : ''}" onclick="window.__textTab('${id}')">${label}</button>`).join('')}
      </div>
      ${body}
    </div>
    <div id="word-pop" class="word-pop" style="display:none"></div>`;
    window.scrollTo(0, 0);
  }

  window.__textTab = (id) => { view.tab = id; stop(); ({ read: renderRead, questions: startQuestions, gaps: startGaps })[id](); };

  // ── Read ──
  function renderRead() {
    shell(`<div class="flex gap-8 mb-12" style="flex-wrap:wrap">
        <button class="chip ${view.showDiff ? 'on' : ''}" onclick="window.__toggleDiff()">⚠️ ${t('difficultWords')}</button>
        <button class="chip ${view.showTr ? 'on' : ''}" onclick="window.__toggleTr()">🌐 ${t('translateText')}</button>
        ${verbs.length ? `<button class="chip ${view.showVerbs ? 'on' : ''}" onclick="window.__toggleVerbs()">🔤 ${t('verbsGrammar')}</button>` : ''}
      </div>
      ${view.showVerbs ? `<div class="verb-legend mb-12">${[['pres', 'presente'], ['past', 'pasado'], ['fut', 'futuro / condicional'], ['subj', 'subjuntivo'], ['imp', 'imperativo'], ['peri', 'perífrasis'], ['nf', 'infinitivo / gerundio']]
        .map(([g, l]) => `<span class="vb vg-${g}">${l}</span>`).join('')}<span class="nt">${t('grammarNote')}</span></div>` : ''}
      <div class="muted small mb-12">💡 ${t('tapWordHint')}</div>
      <div id="reading" class="card reading ${view.showDiff ? 'show-diff' : ''} ${view.showVerbs ? 'show-verbs' : ''}">
        ${tx.paragraphs.map((p, i) => `<div class="para">
          <button class="para-audio" onclick="window.__speakPara(${i})" title="${t('listen')}">🔊</button>
          <p>${renderParagraph(p, i)}</p>
          ${view.showTr ? `<p class="para-tr">${esc(tx.translation[S.lang]?.[i] || tx.translation.en[i])}</p>` : ''}
        </div>`).join('')}
      </div>
      ${view.showDiff ? `<div class="card" style="padding:16px 18px">
        <div class="h3 mb-8">⚠️ ${t('difficultWords')}</div>
        ${tx.difficult.map(d => `<div class="gloss-row"><strong>${esc(d)}</strong><span class="muted">${esc(tr(gloss[norm(d)]))}</span></div>`).join('')}
      </div>` : ''}
      <button class="btn mt-16" onclick="window.__textTab('questions')">${t('questions')} →</button>`);

    const reading = document.getElementById('reading');
    reading.addEventListener('click', (e) => {
      const w = e.target.closest('.tw');
      if (!w || !window.getSelection().isCollapsed) return;
      showWord(w);
    });
    reading.addEventListener('mouseup', onSelect);
    reading.addEventListener('touchend', () => setTimeout(onSelect, 50));
  }

  window.__toggleDiff = () => { view.showDiff = !view.showDiff; renderRead(); };
  window.__toggleTr = () => { view.showTr = !view.showTr; renderRead(); };
  window.__toggleVerbs = () => { view.showVerbs = !view.showVerbs; renderRead(); };
  window.__speakPara = (i) => speak(tx.paragraphs[i]);

  function showWord(span) {
    document.querySelectorAll('.tw.sel').forEach(x => x.classList.remove('sel'));
    span.classList.add('sel');
    if (span.dataset.v != null || span.dataset.n != null) return showGrammar(span);
    const word = span.textContent;
    const p = tx.paragraphs[+span.dataset.p].toLowerCase();
    // Multiword expressions of the glossary that contain this word in this paragraph
    const inPhrases = phrases.filter(ph => ph.split(' ').includes(word.toLowerCase()) && norm(p).includes(ph)).slice(0, 2);
    popup(word, tr(gloss[word.toLowerCase()]), inPhrases.map(ph => [ph, tr(gloss[ph])]));
  }

  // Popup for an annotated verb and/or grammar note.
  function showGrammar(span) {
    const pi = span.dataset.p;
    const v = span.dataset.v != null ? verbs[+span.dataset.v] : null;
    const n = span.dataset.n != null ? notes[+span.dataset.n] : null;
    document.querySelectorAll(`.tw[data-p="${pi}"]`).forEach(x => {
      if ((v && x.dataset.v === span.dataset.v) || (n && x.dataset.n === span.dataset.n)) x.classList.add('sel');
    });
    const L = S.lang;
    let html = '';
    if (v) {
      const T = TENSES[v.t] || {};
      const P = PERSONS[v.per];
      const lemmaMeaning = tr(gloss[norm(v.l)]);
      html += `<div class="pop-sec">
        <div class="pop-tr">${esc(tr(v.m))}</div>
        <div class="pop-row"><span class="pop-k">${t('infinitive')}</span><strong>${esc(v.l)}</strong>${lemmaMeaning ? ` <span class="muted">· ${esc(lemmaMeaning)}</span>` : ''}</div>
        <div class="pop-row"><span class="pop-k">${t('tense')}</span><span class="tense-badge vg-${T.g || 'nf'}">${esc(T.es || v.t)}</span>${T[L] && L !== 'es' ? ` <span class="muted small">${esc(T[L])}</span>` : ''}</div>
        ${P ? `<div class="pop-row"><span class="pop-k">${t('person')}</span><strong>${esc(P.es)}</strong> <span class="muted small">${esc(P[L] || P.en)}</span></div>` : ''}
        ${T.hint ? `<div class="pop-hint">💡 ${esc(tr(T.hint))}</div>` : ''}
        ${v.x ? `<div class="pop-hint pop-x">🔎 ${esc(tr(v.x))}</div>` : ''}
        <div id="pop-ref-v"></div>
      </div>`;
    }
    if (n) {
      const K = NOTE_KINDS[n.k] || NOTE_KINDS.other;
      html += `<div class="pop-sec">
        <div class="pop-row"><span class="tense-badge note-badge">📌 ${esc(K.es)}</span>${n.f !== (v && v.f) ? ` <strong>${esc(n.f)}</strong>` : ''}</div>
        <div class="pop-hint">${esc(tr(n.e))}</div>
        <div id="pop-ref-n"></div>
      </div>`;
    }
    const es = v ? v.f : n.f;
    const pop = document.getElementById('word-pop');
    window.__popSpeak = () => speak(es);
    pop.innerHTML = `<div class="flex items-center gap-8">
        <button class="listen-mini" onclick="window.__popSpeak()">🔊</button>
        <div class="grow pop-es">${esc(es)}</div>
        <button class="muted" style="font-size:20px;padding:4px 8px" onclick="document.getElementById('word-pop').style.display='none'">×</button>
      </div><div class="pop-extra">${html}</div>`;
    pop.style.display = 'block';
    if (v) refLink(v.t, 'pop-ref-v');
    if (n) refLink(n.k, 'pop-ref-n');
  }

  // Link to the most advanced Reference topic for this key that exists at or below the text level.
  async function refLink(key, elId) {
    const max = LEVELS.indexOf(params.level);
    let found = null;
    for (const [lvl, id] of REF_LINKS[key] || []) {
      if (LEVELS.indexOf(lvl) > max) continue;
      const g = await loadGrammar(lvl).catch(() => []);
      if (g.some(x => x.id === id)) found = [lvl, id];
    }
    const box = document.getElementById(elId);
    if (found && box) box.innerHTML = `<button class="pop-link" onclick="window.__go('grammar-detail',{level:'${found[0]}',id:'${found[1]}'})">📘 ${t('seeReference')} (${found[0].toUpperCase()}) →</button>`;
  }

  function onSelect() {
    const sel = window.getSelection();
    const text = sel.toString();
    const key = norm(text);
    if (!key || !key.includes(' ')) return;
    if (gloss[key]) { popup(text.trim(), tr(gloss[key]), []); return; }
    const words = key.split(' ');
    popup(text.trim(), '', words.map(w => [w, tr(gloss[w]) || '—']));
  }

  function popup(es, meaning, extra) {
    const pop = document.getElementById('word-pop');
    window.__popSpeak = () => speak(es);
    pop.innerHTML = `<div class="flex items-center gap-8">
        <button class="listen-mini" onclick="window.__popSpeak()">🔊</button>
        <div class="grow"><div class="pop-es">${esc(es)}</div>${meaning ? `<div class="pop-tr">${esc(meaning)}</div>` : ''}</div>
        <button class="muted" style="font-size:20px;padding:4px 8px" onclick="document.getElementById('word-pop').style.display='none'">×</button>
      </div>
      ${extra.length ? `<div class="pop-extra">${extra.map(([a, b]) => `<div class="gloss-row"><strong>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}</div>` : ''}`;
    pop.style.display = 'block';
  }

  // ── Comprehension questions ──
  let qi, qScore;
  function startQuestions() { qi = 0; qScore = 0; renderQuestion(); }

  function renderQuestion() {
    if (qi >= tx.questions.length) return finishQuestions();
    const q = tx.questions[qi];
    shell(`<details class="card peek mb-12"><summary>📖 ${t('showText')}</summary>
        ${tx.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</details>
      <div class="muted small mb-8">${qi + 1} / ${tx.questions.length}</div>
      <div class="h3 mb-4">${esc(q.q.es)}</div>
      <div class="muted small mb-16">${esc(tr(q.q))}</div>
      <div id="opts">${q.options.map((o, i) => `<button class="exercise-option" data-i="${i}" onclick="window.__answerQ(${i})">${esc(o)}</button>`).join('')}</div>
      <div id="q-feedback"></div>`);
  }

  window.__answerQ = (i) => {
    const q = tx.questions[qi];
    const ok = i === q.answer;
    if (ok) qScore++;
    document.querySelectorAll('#opts .exercise-option').forEach(b => {
      b.disabled = true;
      const bi = +b.dataset.i;
      if (bi === q.answer) b.classList.add('correct');
      else if (bi === i) b.classList.add('wrong');
    });
    document.getElementById('q-feedback').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'} mt-12">
        <div style="font-weight:700">${ok ? '✓ ' + t('correct') : '✗ ' + t('incorrect')}</div>
        ${q.explain ? `<div class="small mt-8">${esc(tr(q.explain))}</div>` : ''}
      </div>
      <button class="btn mt-12" onclick="window.__nextQ()">${t('continue')}</button>`;
  };
  window.__nextQ = () => { qi++; renderQuestion(); };

  function finishQuestions() {
    const pct = Math.round(qScore / tx.questions.length * 100);
    const prev = (S.texts || {})[tx.id] || {};
    const firstTime = prev.q == null;
    update({ texts: { ...(S.texts || {}), [tx.id]: { ...prev, q: Math.max(pct, prev.q || 0) } }, xp: S.xp + (firstTime ? qScore * 2 : 0) });
    shell(`<div class="card" style="padding:28px;text-align:center">
        <div style="font-size:48px">${pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚'}</div>
        <div class="h2 mt-8">${qScore} / ${tx.questions.length}</div>
        ${firstTime ? `<div class="muted mt-8">+${qScore * 2} XP</div>` : ''}
      </div>
      <button class="btn mt-16" onclick="window.__textTab('gaps')">✏️ ${t('gaps')} →</button>
      <button class="btn btn-soft mt-8" onclick="window.__nextText()">📄 ${t('nextText')} →</button>
      <button class="btn btn-soft mt-8" onclick="window.__textTab('questions')">${t('tryAgain')}</button>`);
  }

  // ── Fill the gaps ──
  const full = tx.paragraphs.join('\n');
  const gapPos = [];
  { let pos = 0; for (const a of tx.gaps.items) { const j = full.indexOf(a, pos); if (j >= 0) { gapPos.push([j, a]); pos = j + a.length; } } }
  let filled, bank, active, checked;

  function startGaps() {
    filled = gapPos.map(() => null);
    bank = shuffle([...gapPos.map(g => g[1]), ...tx.gaps.distractors].map((w, i) => ({ w, id: i })));
    active = 0; checked = false;
    renderGaps();
  }

  function renderGaps() {
    let html = '', last = 0;
    gapPos.forEach(([j, a], gi) => {
      html += esc(full.slice(last, j));
      const f = filled[gi];
      const cls = checked ? (f && bank.find(b => b.id === f).w === a ? 'ok' : 'no') : (gi === active ? 'active' : '');
      html += `<button class="gap ${cls} ${f != null ? 'full' : ''}" onclick="window.__gapClick(${gi})">${f != null ? esc(bank.find(b => b.id === f).w) : `<span class="muted">${gi + 1}</span>`}</button>`;
      if (checked && cls === 'no') html += `<span class="gap-fix">${esc(a)}</span>`;
      last = j + a.length;
    });
    html += esc(full.slice(last));
    const used = new Set(filled.filter(x => x != null));
    const correct = checked ? gapPos.filter(([, a], gi) => filled[gi] != null && bank.find(b => b.id === filled[gi]).w === a).length : 0;

    shell(`<div class="muted small mb-12">${t('gapsHint')}</div>
      <div class="card reading gaps-text">${html.split('\n').map(p => `<p>${p}</p>`).join('')}</div>
      ${checked ? `<div class="feedback ${correct === gapPos.length ? 'ok' : 'no'} mt-12" style="font-weight:700">${correct} / ${gapPos.length}</div>
        <button class="btn mt-12" onclick="window.__textTab('gaps')">${t('tryAgain')}</button>`
      : `<div class="wordbank mt-12">${bank.map(b => `<button class="wordchip ${used.has(b.id) ? 'used' : ''}" ${used.has(b.id) ? 'disabled' : ''} onclick="window.__bankClick(${b.id})">${esc(b.w)}</button>`).join('')}</div>
        <button class="btn mt-16" ${filled.every(x => x != null) ? '' : 'disabled'} onclick="window.__checkGaps()">${t('check')}</button>`}`);
  }

  window.__gapClick = (gi) => {
    if (checked) return;
    if (filled[gi] != null) filled[gi] = null;
    active = gi;
    renderGaps();
  };
  window.__bankClick = (id) => {
    if (active == null || active < 0) active = filled.findIndex(x => x == null);
    if (active < 0) return;
    filled[active] = id;
    const next = filled.findIndex((x, i) => x == null && i > active);
    active = next >= 0 ? next : filled.findIndex(x => x == null);
    renderGaps();
  };
  window.__checkGaps = () => {
    checked = true;
    const ok = gapPos.every(([, a], gi) => bank.find(b => b.id === filled[gi]).w === a);
    const prev = (S.texts || {})[tx.id] || {};
    if (ok) update({ texts: { ...(S.texts || {}), [tx.id]: { ...prev, gaps: true } } });
    renderGaps();
  };

  renderRead();
});
