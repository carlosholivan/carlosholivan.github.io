import { S, update, isUnitDone } from '../state.js?v=202611130700';
import { register, go } from '../router.js?v=202611130700';
import { loadTexts, loadUnits, loadVocab } from '../data.js?v=202611130700';
import { bottomNav, header } from '../ui/components.js?v=202611130700';
import { t } from '../i18n.js?v=202611130700';
import { levelChips, LEVELS, levelLabel } from '../levels.js?v=202611130700';
import { wordStatus, statusLegend, STATUS } from '../engine/status.js?v=202611130700';
import { speak, stop } from '../audio.js?v=202611130700';
import { ruby, rubySegs, pyReady, sylReady, tonedPinyin, isHan, esc, mean, applyPinyinPref, syllables } from '../ja.js?v=202611130700';
import { addCards } from '../engine/anki.js?v=202611130700';
import { allHanzi } from './review.js?v=202611130700';

const tr = (o) => (o && (o[S.lang] || o.es || o.en)) || '';
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hanCount = (tx) => [...tx.paragraphs.join('')].filter(isHan).length;
// Dialogue turn: "名字：…" at the start of a line.
const SPEAKER = /^([^：:\n]{1,8})[：:]/;

async function currentUnit(level) {
  const units = await loadUnits(level).catch(() => []);
  const i = units.findIndex((_, k) => !isUnitDone(level, k + 1));
  return i < 0 ? units.length : i + 1;
}

const isRead = (tx) => (S.texts || {})[tx.id]?.q != null;

// Texts sorted by difficulty + the easiest unread one of the most advanced unit reached.
export async function textsWithRecommendation(level) {
  const texts = [...await loadTexts(level)].sort((a, b) => (a.order || 0) - (b.order || 0));
  const reached = await currentUnit(level);
  const unread = texts.filter(tx => !isRead(tx));
  const fit = unread.filter(tx => (tx.unit || 0) <= reached)
    .sort((a, b) => (b.unit || 0) - (a.unit || 0) || a.order - b.order);
  const rec = fit[0] || unread[0] || null;
  return { texts, reached, rec };
}

// ── List ──────────────────────────────────────────────────────────
register('texts', async (el) => {
  await pyReady;
  const { texts, reached, rec } = await textsWithRecommendation(S.level);
  const done = S.texts || {};
  const readCount = texts.filter(isRead).length;
  el.innerHTML = `<div class="fade">
    ${header(t('texts'))}
    ${levelChips(S.level, '__textsLevel')}
    ${texts.length ? `<div class="muted small mb-12">${readCount} / ${texts.length} · ${t('textsOrderHint')}</div>` : ''}
    ${rec ? `<div class="card rec-text" onclick="window.__openText('${rec.id}')">
        <div class="small" style="font-weight:700;color:var(--accent)">⭐ ${t('recommended')}</div>
        <div style="font-weight:800;font-size:20px;margin-top:4px">${ruby(rec.title.ja)}</div>
        <div class="muted small">${esc(tr(rec.title))} · #${rec.order} · ${hanCount(rec)} 字</div>
        <div class="small" style="margin-top:4px">${esc(tr(rec.summary))}</div>
      </div>` : ''}
    ${texts.length ? texts.map(tx => {
      const st = done[tx.id] || {};
      const ahead = (tx.unit || 0) > reached;
      return `<div class="card ref-topic ${ahead ? 'ahead' : ''} ${rec && rec.id === tx.id ? 'is-rec' : ''}" onclick="window.__openText('${tx.id}')">
        <div class="flex items-center gap-8">
          <span class="text-num">${tx.order || ''}</span>
          ${tx.unit ? `<span class="unit-badge">${ahead ? '🔒 ' : ''}${t('unit')} ${tx.unit}</span>` : ''}
          <div class="grow" style="font-weight:700;font-size:17px">${ruby(tx.title.ja)}</div>
          ${st.q != null ? `<span class="small" style="color:var(--ok);font-weight:700">✓ ${st.q}%</span>` : ''}
        </div>
        <div class="muted small">${esc(tr(tx.title))} · ${hanCount(tx)} 漢字</div>
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

// Dictionary for the word popup: vocab of every level up to the text level + 1, plus the text glossary.
async function buildDict(level, glossary) {
  const dict = new Map();
  const upto = Math.min(LEVELS.length - 1, LEVELS.indexOf(level) + 1);
  for (let i = 0; i <= upto; i++) {
    const vs = await loadVocab(LEVELS[i]).catch(() => []);
    for (const v of vs) if (!dict.has(v.word)) dict.set(v.word, { p: v.p, m: v.m, lv: LEVELS[i], q: v.q });
  }
  for (const [w, g] of Object.entries(glossary || {})) {
    const { py, ...m } = g;
    const prev = dict.get(w);
    dict.set(w, { p: py || prev?.p, m: prev?.m || m, lv: prev?.lv, gl: true });
  }
  return dict;
}

// Greedy longest match over the dictionary → [{s, w}] (w = true for dictionary words / single hanzi).
function segment(text, dict) {
  const chars = [...text], out = [];
  let i = 0, plain = '';
  const flush = () => { if (plain) { out.push({ s: plain }); plain = ''; } };
  while (i < chars.length) {
    if (!isHan(chars[i])) { plain += chars[i++]; continue; }
    let n = Math.min(8, chars.length - i);
    for (; n > 1; n--) if (dict.has(chars.slice(i, i + n).join(''))) break;
    flush();
    out.push({ s: chars.slice(i, i + n).join(''), w: true });
    i += n;
  }
  flush();
  return out;
}

const AUX = new Set(['能', '会', '可以', '要', '想', '应该', '应当', '必须', '得', '愿意', '敢', '肯', '可能', '需要', '打算', '能够', '该']);
const CJ = new Set(['因为', '所以', '但是', '可是', '虽然', '如果', '要是', '而且', '或者', '还是', '不但', '不仅', '然后', '只要', '只有', '即使', '既然', '不过', '于是', '因此', '而', '并且', '尽管', '无论', '不管', '否则', '除了', '以及', '和', '跟', '同时', '甚至', '然而', '因而', '从而', '假如', '哪怕']);
const MW = new Set(['个', '本', '只', '张', '件', '条', '杯', '位', '次', '块', '辆', '双', '把', '岁', '口', '家', '台', '支', '瓶', '碗', '片', '份', '种', '节', '门', '层', '座', '棵', '朵', '匹', '头', '篇', '首', '部', '场', '顿', '遍', '趟', '套', '束', '封', '间', '所', '架', '道', '幅', '项', '名', '群', '些', '点', '斤', '公斤', '米', '公里', '元', '分钟', '小时', '天', '年', '月', '周', '号']);
const NOTVB = new Set(['不', '没', '别', '也', '都', '就', '还', '很', '再', '又', '才']);
const NUMQ = /[一二两三四五六七八九十百千万几这那每哪半多〇零0-9]/;

// ── Detail ────────────────────────────────────────────────────────
register('text', async (el, params) => {
  const tx = (await loadTexts(params.level)).find(x => x.id === params.id);
  if (!tx) { go('texts'); return; }
  await Promise.all([pyReady, sylReady]);
  const dict = await buildDict(params.level, tx.glossary);
  const hmap = await allHanzi().catch(() => null);
  const notes = tx.notes || [];
  const lvIdx = LEVELS.indexOf(params.level);
  const above = (w) => { const d = dict.get(w); return d && (d.gl || (d.lv && LEVELS.indexOf(d.lv) > lvIdx)); };
  const view = { tab: 'read', showDiff: false, showTr: false, showGram: false, showStatus: false };
  const vbr = (tx.vb || []).map(r => { const o = []; for (let k = 0; k < r.length; k += 2) o.push([r[k], r[k + 1]]); return o; });
  // Grammar highlighting: rules for function words, jieba POS ranges for verbs.
  function gramOf(w, start, pi, prev) {
    if (/^[了过着]$/.test(w)) return 'asp';
    if (/^[的地得]$/.test(w)) return 'str';
    if (/^[把被]$/.test(w)) return 'ba';
    if (AUX.has(w)) return 'aux';
    if (CJ.has(w)) return 'cj';
    if (MW.has(w) && NUMQ.test(prev.slice(-1))) return 'mw';
    if (!NOTVB.has(w) && (vbr[pi] || []).some(([a, b]) => start >= a && start < b)) return 'vb';
    return '';
  }

  // Ranges [start, end, noteIndex] of note fragments in paragraph pi.
  function noteRanges(p, pi) {
    const out = [];
    notes.forEach((n, k) => {
      if (n.p !== pi || !n.f) return;
      let j = p.indexOf(n.f);
      while (j >= 0) { out.push([j, j + n.f.length, k]); j = p.indexOf(n.f, j + n.f.length); }
    });
    return out;
  }

  // One line of a paragraph → word spans with furigana from the precomputed tokens (tx.tok); "名前：" speaker in bold.
  const lineIdx = {};
  function renderLine(line, pi, offset) {
    const li = lineIdx[pi] = (lineIdx[pi] ?? -1) + 1;
    const toks = (tx.tok && tx.tok[pi] && tx.tok[pi][li]) || [[line, [[line, null]], null]];
    let html = '', k = 0;
    const sp = toks.findIndex(x => x[0] === '：');
    if (sp > 0 && sp <= 3) {
      html += `<span class="speaker">${toks.slice(0, sp).map(x => rubySegs(x[1])).join('')}：</span>`;
      k = sp + 1;
    }
    for (; k < toks.length; k++) {
      const [surf, segs, key] = toks[k];
      const w = key && dict.has(key) ? key : (dict.has(surf) ? surf : null);
      if (!w) { html += rubySegs(segs); continue; }
      const cls = 'tw' + (above(w) ? ' dw' : '') + ` st-${wordStatus(w)}`;
      html += `<span class="${cls}" data-w="${esc(w)}" data-p="${pi}">${rubySegs(segs)}</span>`;
    }
    return html;
  }

  function renderParagraph(p, pi) {
    lineIdx[pi] = -1;
    const ls = p.split('\n');
    let off = 0;
    const parts = ls.map(l => { const h = renderLine(l, pi, off); off += l.length + 1; return { h, turn: SPEAKER.test(l) }; });
    if (parts.length === 1) return parts[0].h;
    return parts.map(x => `<span class="dl ${x.turn ? 'turn' : ''}">${x.h}</span>`).join('');
  }
  const trLines = (s) => { const ls = String(s || '').split('\n'); return ls.length === 1 ? esc(s) : ls.map(l => `<span class="dl">${esc(l)}</span>`).join(''); };

  function shell(body) {
    el.innerHTML = `<div class="fade text-view">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__nav('texts')" style="padding:4px">←</button>
        <div class="grow"><div class="h3">${ruby(tx.title.ja)}</div><div class="muted small">${esc(tr(tx.title))} · ${levelLabel(params.level)}</div></div>
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
    const glossWords = Object.keys(tx.glossary || {});
    shell(`<div class="flex gap-8 mb-12" style="flex-wrap:wrap">
        <button class="chip ${S.pinyin !== false ? 'on' : ''}" onclick="window.__togglePy()">ふりがな</button>
        <button class="chip ${view.showTr ? 'on' : ''}" onclick="window.__toggleTr()">🌐 ${t('translateText')}</button>
        ${glossWords.length ? `<button class="chip ${view.showDiff ? 'on' : ''}" onclick="window.__toggleDiff()">⚠️ ${t('difficultWords')}</button>` : ''}
        <button class="chip ${view.showStatus ? 'on' : ''}" onclick="window.__toggleStatus()">🎨 ${t('myWords')}</button>
      </div>
      <div class="muted small mb-12">💡 ${t('tapWordHint')}</div>
      ${view.showStatus ? statusLegend() : ''}
      ${view.showGram ? `<div class="verb-legend mb-12">${['vb', 'aux', 'asp', 'str', 'ba', 'mw', 'cj'].map(k =>
        `<span class="g-${k}">${t({ vb: 'gVerb', aux: 'gAux', asp: 'gAsp', str: 'gStr', ba: 'gBa', mw: 'gMw', cj: 'gCj' }[k])}</span>`).join('')}${notes.length ? `<span style="border-bottom:2px dashed var(--accent)">📌 ${t('gNote')}</span>` : ''}</div>` : ''}
      <div id="reading" class="card reading reading-zh ${view.showDiff ? 'show-diff' : ''} ${view.showGram ? 'show-gram' : ''} ${view.showStatus ? 'show-status' : ''}">
        ${tx.paragraphs.map((p, i) => `<div class="para">
          <button class="para-audio" onclick="window.__speakPara(${i})" title="${t('listen')}">🔊</button>
          <p>${renderParagraph(p, i)}</p>
          ${view.showTr ? `<p class="para-tr">${trLines(tx.translation?.[S.lang]?.[i] || tx.translation?.en?.[i] || '')}</p>` : ''}
        </div>`).join('')}
      </div>
      ${view.showDiff && glossWords.length ? `<div class="card" style="padding:16px 18px">
        <div class="h3 mb-8">⚠️ ${t('difficultWords')}</div>
        ${glossWords.map(w => `<div class="gloss-row"><strong>${ruby(w)}</strong><span class="muted">${tonedPinyin(tx.glossary[w].py || '')} · ${esc(tr(tx.glossary[w]))}</span></div>`).join('')}
      </div>` : ''}
      ${view.showGram && notes.length ? `<div class="card" style="padding:16px 18px">
        <div class="h3 mb-8">📌 ${t('grammarNote')}</div>
        ${notes.map(n => `<div class="note-row"><strong>${ruby(n.f)}</strong> <span class="tense-badge note-badge">${noteKind(n.k)}</span><div class="small">${esc(tr(n.e))}</div></div>`).join('')}
      </div>` : ''}
      <button class="btn mt-16" onclick="window.__textTab('questions')">${t('questions')} →</button>`);

    document.getElementById('reading').addEventListener('click', (e) => {
      const w = e.target.closest('.tw');
      if (w) showWord(w);
    });
  }

  const noteKind = (k) => ({ grammar: '文法 · ' + t('stepGrammar'), culture: '文化', word: '言葉' }[k] || k || '');

  window.__togglePy = () => { update({ pinyin: S.pinyin === false }); applyPinyinPref(); renderRead(); };
  window.__toggleDiff = () => { view.showDiff = !view.showDiff; renderRead(); };
  window.__toggleTr = () => { view.showTr = !view.showTr; renderRead(); };
  window.__toggleGram = () => { view.showGram = !view.showGram; renderRead(); };
  window.__toggleStatus = () => { view.showStatus = !view.showStatus; renderRead(); };
  window.__speakPara = (i) => speak(tx.paragraphs[i].replace(/^[^：\n]{1,8}：/gm, ''));

  const gName = (span) => { const m = span.className.match(/g-(\w+)/); return m ? ` · <span class="tense-badge g-${m[1]}">${t({ vb: 'gVerb', aux: 'gAux', asp: 'gAsp', str: 'gStr', ba: 'gBa', mw: 'gMw', cj: 'gCj' }[m[1]])}</span>` : ''; };
  function showWord(span) {
    document.querySelectorAll('.tw.sel').forEach(x => x.classList.remove('sel'));
    span.classList.add('sel');
    const w = span.dataset.w;
    const d = dict.get(w) || {};
    const n = span.dataset.n != null ? notes[+span.dataset.n] : null;
    const chars = [...w].filter(c => hmap && hmap.has(c));
    const pop = document.getElementById('word-pop');
    const inDeck = !!(S.cards || {})[w];
    window.__popSpeak = () => speak(w);
    window.__popAdd = () => {
      addCards([w], 'v', () => d.q ?? 99999);
      document.getElementById('pop-add').outerHTML = `<span class="small" style="color:var(--ok)">✓ ${t('inDeck')}</span>`;
    };
    pop.innerHTML = `<div class="flex items-center gap-8">
        <button class="listen-mini" onclick="window.__popSpeak()">🔊</button>
        <div class="grow">
          <div class="pop-es zh-word">${esc(w)} <span class="pop-py">${d.p ? tonedPinyin(d.p, { play: true }) : ''}</span></div>
          <div class="pop-tr">${esc(mean(d.m)) || '—'}</div>
          <div class="muted small">${d.lv ? levelLabel(d.lv) : ''}${d.gl ? ' · ' + t('difficultWords') : ''} · <span style="color:${STATUS[wordStatus(w)].color};font-weight:700">● ${t(STATUS[wordStatus(w)].key)}</span>${gName(span)}</div>
        </div>
        <button class="muted" style="font-size:20px;padding:4px 8px" onclick="document.getElementById('word-pop').style.display='none'">×</button>
      </div>
      ${chars.length ? `<div class="pop-extra">${chars.map(c => { const x = hmap.get(c); return `<div class="gloss-row" style="cursor:pointer" onclick="window.__charSheet('${esc(c)}')"><strong class="jp" style="font-size:20px">${esc(c)}</strong><span>${esc(mean(x.m))} ›</span></div>`; }).join('')}</div>` : ''}
      ${n ? `<div class="pop-extra"><div class="pop-row"><span class="tense-badge note-badge">📌 ${noteKind(n.k)}</span> <strong>${esc(n.f)}</strong></div><div class="pop-hint">${esc(tr(n.e))}</div></div>` : ''}
      ${d.m ? `<div class="mt-8">${inDeck ? `<span class="small muted">✓ ${t('inDeck')}</span>` : `<button id="pop-add" class="chip" onclick="window.__popAdd()">＋ ${t('addToDeck')}</button>`}</div>` : ''}`;
    pop.style.display = 'block';
    speak(w);
  }

  // ── Comprehension questions ──
  let qi, qScore;
  function startQuestions() { qi = 0; qScore = 0; renderQuestion(); }

  function renderQuestion() {
    if (qi >= tx.questions.length) return finishQuestions();
    const q = tx.questions[qi];
    shell(`<details class="card peek mb-12"><summary>📖 ${t('showText')}</summary>
        ${tx.paragraphs.map(p => `<p>${p.split('\n').map(l => ruby(l)).join('<br>')}</p>`).join('')}</details>
      <div class="muted small mb-8">${qi + 1} / ${tx.questions.length}</div>
      <div class="h3 mb-16">${esc(tr(q.q))}</div>
      <div id="opts">${q.options.map((o, i) => `<button class="exercise-option zh-opt" data-i="${i}" onclick="window.__answerQ(${i})">${ruby(o)}</button>`).join('')}</div>
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
  { let pos = 0; for (const a of (tx.gaps?.items || [])) { const j = full.indexOf(a, pos); if (j >= 0) { gapPos.push([j, a]); pos = j + a.length; } } }
  let filled, bank, active, checked;

  function startGaps() {
    filled = gapPos.map(() => null);
    bank = shuffle([...gapPos.map(g => g[1]), ...(tx.gaps?.distractors || [])].map((w, i) => ({ w, id: i })));
    active = 0; checked = false;
    renderGaps();
  }
  // Contextual reading of every character of the full text (per line), so partial chunks keep the right pinyin.
  const fullChars = [...full];
  const fullSyl = full.split('\n').flatMap((l, i) => [...(i ? [null] : []), ...syllables(l)]);
  let chunkPos = 0;
  const zhChunk = (s) => {
    const start = full.indexOf(s, chunkPos) >= 0 ? [...full.slice(0, full.indexOf(s, chunkPos))].length : -1;
    return s.split('\n').map((l, k, arr) => {
      if (start < 0) return ruby(l);
      const off = start + arr.slice(0, k).reduce((n, x) => n + [...x].length + 1, 0);
      const py = fullSyl.slice(off, off + [...l].length).filter((_, j) => isHan(fullChars[off + j]));
      return ruby(l, py.every(Boolean) ? { py } : {});
    }).join('</p><p>');
  };
  function renderGaps() {
    let html = '', last = 0;
    const word = (id) => bank.find(b => b.id === id).w;
    chunkPos = 0;
    gapPos.forEach(([j, a], gi) => {
      chunkPos = last;
      html += zhChunk(full.slice(last, j));
      const f = filled[gi];
      const cls = checked ? (f != null && word(f) === a ? 'ok' : 'no') : (gi === active ? 'active' : '');
      html += `<button class="gap ${cls} ${f != null ? 'full' : ''}" onclick="window.__gapClick(${gi})">${f != null ? esc(word(f)) : `<span class="muted">${gi + 1}</span>`}</button>`;
      if (checked && cls === 'no') html += `<span class="gap-fix">${ruby(a)}</span>`;
      last = j + a.length;
    });
    chunkPos = last;
    html += zhChunk(full.slice(last));
    const used = new Set(filled.filter(x => x != null));
    const correct = checked ? gapPos.filter(([, a], gi) => filled[gi] != null && word(filled[gi]) === a).length : 0;

    shell(`<div class="muted small mb-12">${t('gapsHint')}</div>
      <div class="card reading reading-zh gaps-text"><p>${html}</p></div>
      ${checked ? `<div class="feedback ${correct === gapPos.length ? 'ok' : 'no'} mt-12" style="font-weight:700">${correct} / ${gapPos.length}</div>
        <button class="btn mt-12" onclick="window.__textTab('gaps')">${t('tryAgain')}</button>`
      : `<div class="wordbank mt-12">${bank.map(b => `<button class="wordchip zh-opt ${used.has(b.id) ? 'used' : ''}" ${used.has(b.id) ? 'disabled' : ''} onclick="window.__bankClick(${b.id})">${ruby(b.w)}</button>`).join('')}</div>
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
