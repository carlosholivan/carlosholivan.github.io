// Anki (SM-2) decks: vocabulary ('v') and characters ('h'). Forgotten and due cards first, then new ones.
import { deckPie } from '../deck-pie.js?v=202611140500';
import { S, update, touchStreak } from '../state.js?v=202611140500';
import { register, go } from '../router.js?v=202611140500';
import { loadVocab, loadHanzi, loadUnits } from '../data.js?v=202611140500';
import { LEVELS, levelLabel } from '../levels.js?v=202611140500';
import { addCards, deckStats, buildQueue, answer, previewLabel, isForgotten, topUpNew, setKnown } from '../engine/anki.js?v=202611140500';
import { bottomNav, header, progressBar } from '../ui/components.js?v=202611140500';
import { speak } from '../audio.js?v=202611140500';
import { t } from '../i18n.js?v=202611140500';
import { failedWords, markFixed } from '../engine/srs.js?v=202611140500';
import { wordStatus, statusLegend, STATUS, isLearned } from '../engine/status.js?v=202611140500';
import { esc, mean, tonedPinyin, ruby, pyReady, sylReady } from '../zh.js?v=202611140500';
import { charWord, hasChars, wordSize } from '../chars.js?v=202611140500';

let vocabMap = null, hanziMap = null;
export async function allVocab() {
  if (vocabMap) return vocabMap;
  const m = new Map();
  for (const l of LEVELS) {
    try { for (const v of await loadVocab(l)) if (!m.has(v.w)) m.set(v.w, { ...v, lv: l }); } catch (e) {}
  }
  return (vocabMap = m);
}
export async function allHanzi() {
  if (hanziMap) return hanziMap;
  const m = new Map();
  for (const l of LEVELS) {
    try { for (const h of await loadHanzi(l)) if (!m.has(h.c)) m.set(h.c, { ...h, lv: l }); } catch (e) {}
  }
  return (hanziMap = m);
}

// First visit: put the words of completed units into the deck.
async function seed() {
  if (S.cardsSeeded) return;
  for (const l of LEVELS) {
    if (!Object.keys(S.completed || {}).some(k => k.startsWith(l + '-'))) continue;
    try {
      const units = await loadUnits(l), lv = await loadVocab(l);
      units.forEach((u, i) => { if (S.completed[`${l}-${i + 1}`]) addCards(lv.filter(v => v.unit === u.id).map(v => v.w)); });
    } catch (e) {}
  }
  update({ cardsSeeded: true });
}

// Quick full-screen flash after rating a card: green for good/easy, red for again/hard.
function flash(r) {
  const f = document.createElement('div');
  f.className = 'rate-flash';
  f.style.background = ['', 'rgba(231,76,60,.42)', 'rgba(231,76,60,.24)', 'rgba(39,174,96,.24)', 'rgba(39,174,96,.42)'][r] || 'transparent';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 380);
}

export function deckSummary(st, size = 0) {
  return `<div class="deck-stats card mb-16">
    <div><b style="color:#3498db">${st.newToday}</b><span>${t('cardNewToday')}</span></div>
    <div><b style="color:#e67e22">${st.learn - st.fLearn}</b><span>${t('cardLearning')}</span></div>
    <div><b style="color:var(--ok)">${st.due - st.fDue}</b><span>${t('cardDue')}</span></div>
    <div><b style="color:var(--no)">${st.forgotten}</b><span>${t('cardForgotten')}</span></div>
    <div><b>${st.total + st.known}${size ? `<small class="muted">/${size}</small>` : ''}</b><span>${t('cardTotal')}</span></div>
    ${st.known ? `<div><b style="color:#8e44ad">${st.known}</b><span>${t('cardMarkedKnown')}</span></div>` : ''}
  </div>${size ? `<div class="muted small mb-16" style="margin-top:-8px">${t('deckIntroHint')}</div>` : ''}`;
}

// Words of the current level and the levels below, most frequent first (frequency rank q from a large corpus).
export async function freqOrder(level = S.level) {
  const vm = await allVocab();
  const upto = LEVELS.indexOf(level);
  return [...vm.values()].filter(v => LEVELS.indexOf(v.lv) <= upto).sort((a, b) => (a.q || 99999) - (b.q || 99999)).map(v => v.w);
}

// Feeds today's new cards by frequency and gives every vocabulary card its rank so new ones are shown most-frequent first.
async function feedByFrequency(lv = deckLevel('v')) {
  const vm = await allVocab();
  const rank = w => (vm.get(w) || {}).q ?? 99999;
  let fixed = false;
  for (const [w, c] of Object.entries(S.cards || {})) if (c.r == null) { c.r = rank(w); fixed = true; }
  if (fixed) update({});
  if (S.freqStudy !== false) topUpNew(await freqOrder(lv === 'all' ? S.level : lv), 'v', rank, await deckFilter('v', lv));
}

// Level decks are cumulative: the HSK 3 deck holds every word (or character) of HSK 1–3. 'all' = every card in the collection.
export function deckLevel(d) {
  const l = (S.deckLv || {})[d];
  return l === 'all' || LEVELS.includes(l) ? l : (S.level || LEVELS[0]);
}
async function deckFilter(d, lv = deckLevel(d)) {
  if (lv === 'all') return null;
  const m = d === 'h' ? await allHanzi() : await allVocab();
  const upto = LEVELS.indexOf(lv);
  return w => { const x = m.get(w); return !!x && LEVELS.indexOf(x.lv) <= upto; };
}
// Characters enter the deck in frequency order (each level list is already sorted by frequency).
async function feedHanzi(lv = deckLevel('h')) {
  if (S.freqStudy === false) return;
  const upto = LEVELS.indexOf(lv === 'all' ? S.level : lv);
  const order = [];
  for (const l of LEVELS.slice(0, upto + 1)) try { for (const h of await loadHanzi(l)) order.push(h.c); } catch (e) {}
  const pos = new Map(order.map((c, i) => [c, i]));
  topUpNew(order, 'h', c => pos.get(c) ?? 99999, await deckFilter('h', lv));
}

const pieName = (lvFix, d) => { const l = lvFix || deckLevel(d); return l === 'all' ? t('deckAll') : levelLabel(l); };
async function levelDecks(d) {
  const m = d === 'h' ? await allHanzi() : await allVocab();
  const store = (d === 'h' ? S.hcards : S.cards) || {};
  const cur = deckLevel(d);
  let n = 0, learned = 0;
  const chips = LEVELS.map(l => {
    for (const x of m.values()) if (x.lv === l) {
      n++;
      const c = store[d === 'h' ? x.c : x.w];
      if (d === 'h' ? c && (c.s === 'known' || c.s === 'review') : isLearned(x.w)) learned++;
    }
    const pct = n ? Math.round(learned / n * 100) : 0;
    return `<button class="deck-lv ${cur === l ? 'on' : ''}" onclick="window.__deckLv('${d}','${l}')">
      <b>${levelLabel(l)}</b><span>${n} ${d === 'h' ? '字' : t('deckWords')}</span>
      <span class="deck-lv-bar"><i style="width:${pct}%"></i></span><span>${pct}%</span></button>`;
  });
  chips.push(`<button class="deck-lv ${cur === 'all' ? 'on' : ''}" onclick="window.__deckLv('${d}','all')"><b>${t('deckAll')}</b><span>${n} ${d === 'h' ? '字' : t('deckWords')}</span><span class="deck-lv-bar"><i style="width:${n ? Math.round(learned / n * 100) : 0}%"></i></span><span>${n ? Math.round(learned / n * 100) : 0}%</span></button>`);
  return `<div class="muted small mb-8">${t('deckLevelHint')}</div><div class="deck-lvs mb-16">${chips.join('')}</div>`;
}
window.__deckLv = (d, l) => { update({ deckLv: { ...(S.deckLv || {}), [d]: l } }); go('review', { deck: d }); };

function failedBtn(n) {
  return n ? `<button class="card study-opt mt-12" style="width:100%" onclick="window.__go('review', {mode:'failed'})">
      <span class="kbadge sm">错</span>
      <div class="grow" style="text-align:left"><div class="study-es">${t('failedReview')}</div><div class="muted small">${t('failedReviewTr')} · <b style="color:var(--no)">${n}</b></div></div>
      <span class="muted">›</span></button>` : '';
}

// Words failed in previous lessons: meaning → recall hanzi + pinyin, until each is known on first sight.
let hmFailed = null;
function runFailed(el, vm) {
  let queue = failedWords(new Set(vm.keys()));
  const lang = S.lang || 'es';
  const total = queue.length;
  const tries = {};
  let fixed = 0;
  if (!total) {
    el.innerHTML = `<div class="fade">${header(t('failedReview'))}
      <div class="center" style="padding-top:30px"><div style="font-size:48px;margin-bottom:16px">🎉</div>
      <div class="h3 mb-8">${t('noFailed')}</div>
      <button class="btn mt-24" onclick="window.__go('review',{deck:'v'})">${t('vocabReview')}</button></div>
    </div>${bottomNav('review')}`;
    return;
  }
  function render() {
    if (!queue.length) return finish();
    const w = queue[0];
    const v = vm.get(w) || { w, p: '', m: {} };
    const sv = S.vocab[w] || {};
    const miss = sv.miss ?? Math.max(1, (sv.seen || 0) - (sv.correct || 0));
    el.innerHTML = `<div class="fade" style="padding-top:16px">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__go('review',{deck:'v'})" style="padding:4px">←</button>
        <div class="grow">${progressBar(fixed / total * 100)}</div>
      </div>
      <div class="card anki-card" id="anki-card" onclick="window.__ankiShow()">
        <span class="anki-tag forgot">${t('failedTimes').replace('{n}', miss)}</span>
        <button class="anki-spk" onclick="event.stopPropagation();window.__ankiSpeak()">🔊</button>
        <div class="anki-front"><div class="anki-mean">${esc(mean(v.m, lang))}</div></div>
        <div class="anki-back" id="anki-back" style="display:none">
          <div class="anki-sep"></div>${charWord(w, hmFailed)}${vocabBack(v, lang)}
        </div>
        <div class="muted small mt-16" id="anki-hint">${t('tapToReveal')}</div>
      </div>
      <div id="anki-btns" class="anki-btns" style="visibility:hidden;grid-template-columns:1fr 1fr">
        <button class="anki-btn again" onclick="window.__ankiRate(1)">${t('ankiAgain')}</button>
        <button class="anki-btn good" onclick="window.__ankiRate(3)">${t('iKnewIt')}</button>
      </div>
      <div class="muted small center mt-12">${t('cardsLeft')}: ${queue.length}</div>
    </div>`;
  }
  window.__ankiSpeak = () => speak(queue[0]);
  window.__ankiShow = () => {
    const back = document.getElementById('anki-back');
    if (!back || back.style.display !== 'none') return;
    back.style.display = 'block'; fillExamples(back);
    document.getElementById('anki-hint').style.display = 'none';
    document.getElementById('anki-btns').style.visibility = 'visible';
    speak(queue[0]);
  };
  window.__ankiRate = (r) => {
    flash(r === 1 ? 1 : 4);
    const w = queue.shift();
    if (r === 1) { tries[w] = 1; queue.splice(Math.min(queue.length, 3), 0, w); }
    else { markFixed(w, !tries[w]); fixed++; }
    addCards([w], 'v', x => (vm.get(x) || {}).q ?? 99999);
    render();
  };
  window.__ankiKeys = (e) => {
    if (!document.getElementById('anki-card')) return document.removeEventListener('keydown', window.__ankiKeys);
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); window.__ankiShow(); }
    else if ((e.key === '1' || e.key === '2') && document.getElementById('anki-btns').style.visibility === 'visible') window.__ankiRate(e.key === '1' ? 1 : 3);
  };
  document.removeEventListener('keydown', window.__ankiKeys);
  document.addEventListener('keydown', window.__ankiKeys);
  function finish() {
    const left = failedWords(new Set(vm.keys()), 999).length;
    const ok = total - Object.keys(tries).length;
    el.innerHTML = `<div class="fade center" style="padding-top:50px">
      <div style="font-size:56px;margin-bottom:12px">💪</div>
      <div class="h2 mb-8">${t('reviewDone')}</div>
      <div class="muted mb-16">${ok}/${total} ✓${left ? ` · ${left} ${t('stillFailed')}` : ''}</div>
      <button class="btn mt-16" onclick="window.__go('review',{deck:'v'})">${t('continue')}</button>
    </div>${bottomNav('review')}`;
  }
  render();
}

function freqPanel(lvFix) {
  const on = S.freqStudy !== false;
  return `<div class="card mb-16" style="padding:14px">
    <div class="flex items-center justify-between"><b>📈 ${t('freqStudy')}</b>
      <div class="toggle ${on ? 'on' : ''}" onclick="window.__freqToggle()"></div></div>
    <div class="muted small mt-8">${t('freqStudyHint').replace('{l}', (lvFix ? 'HSK 1–6' : levelLabel(deckLevel('v') === 'all' ? S.level : deckLevel('v'))))}</div>
    ${on ? `<div class="flex items-center gap-8 mt-8 small">${t('newPerDay')}:
      ${[5, 10, 15, 20, 30, 50].map(n => `<button class="chip ${(S.newPerDay || 15) === n ? 'on' : ''}" style="padding:2px 10px" onclick="window.__newPerDay(${n})">${n}</button>`).join('')}</div>` : ''}
    <button class="btn btn-ghost mt-12" style="width:100%" onclick="window.__go('vocab-list')">📋 ${t('vocabList')}</button>
  </div>`;
}
let lastSelf = 'review';
window.__freqToggle = () => { update({ freqStudy: S.freqStudy === false }); window.__go(lastSelf, { deck: 'v' }); };
window.__newPerDay = (n) => { update({ newPerDay: n }); window.__go(lastSelf, { deck: 'v' }); };

function deckTabs(d) {
  const sv = deckStats('v'), sh = deckStats('h');
  return `<div class="deck-tabs mb-16">
    <button class="chip ${d === 'v' ? 'on' : ''}" onclick="window.__go('review',{deck:'v'})">📚 ${t('deckVocab')} <span class="badge">${sv.pending}</span></button>
    <button class="chip ${d === 'h' ? 'on' : ''}" onclick="window.__go('review',{deck:'h'})">✍️ ${t('deckHanzi')} <span class="badge">${sh.pending}</span></button>
  </div>`;
}

// Example sentences on the back of vocabulary cards: taken from the app's own readings, with their translation.
const EXC = {};
const exText = s => Array.isArray(s) ? s.map(x => Array.isArray(x) ? x[0] : x).join('') : s;
const exRuby = s => ruby(s);
// Near-synonyms on the back of the card (intermediate+ levels, plus curated groups at every level):
// each one with its reading, meaning and level, and a note on how they differ when there is one.
const SYC = {};
async function fillSyn(root) {
  const box = root?.querySelector('.anki-syn'); if (!box || box.dataset.done) return;
  box.dataset.done = '1';
  const w = box.dataset.w, lv = box.dataset.lv;
  if (!lv) return;
  SYC[lv] ??= fetch(`data/${lv}/synonyms.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const e = ((await SYC[lv]) || {})[w]; if (!e) return;
  const vm = await allVocab();
  const rows = (e.s || []).map(x => vm.get(x)).filter(Boolean);
  if (!rows.length) return;
  const note = e.n ? `<div class="anki-syn-note">💡 ${esc(e.n[S.lang] || (S.lang === 'en' ? e.n.en : e.n.es) || e.n.es)}</div>` : '';
  box.innerHTML = `<div class="anki-ex-label">${t('synonyms')}</div>` + rows.map(v =>
    `<div class="anki-syn-row" onclick="event.stopPropagation();window.__exSay(this)" data-s="${esc(v.w)}"><span class="anki-syn-w">${esc(v.w)}</span><span class="anki-syn-p">${tonedPinyin(v.p)}</span><span class="anki-syn-m">${esc(mean(v.m, S.lang))}</span><span class="badge">${levelLabel(v.lv)}</span></div>`).join('') + note;
}
async function fillExamples(root) {
  fillSyn(root);
  const box = root?.querySelector('.anki-ex'); if (!box || box.dataset.done) return;
  box.dataset.done = '1';
  const w = box.dataset.w, lv = box.dataset.lv;
  EXC[lv] ??= fetch(`data/${lv}/examples.json`).then(r => r.json()).catch(() => ({}));
  let xs = ((await EXC[lv]) || {})[w] || [];
  if (!xs.length) return;
  box.innerHTML = `<div class="anki-ex-label">${t('examples')}</div>` + xs.map(([s, tr]) =>
    `<div class="anki-ex-row" onclick="event.stopPropagation();window.__exSay(this)" data-s="${esc(exText(s))}"><div class="anki-ex-s">${exRuby(s)}</div><div class="anki-ex-t">${esc(tr[S.lang] || tr.es || tr.en || '')}</div></div>`).join('');
}
window.__exSay = (el) => speak(el.dataset.s);

function vocabBack(v, lang) {
  const trad = v.t && v.t !== v.w ? `<div class="muted small">${t('traditional')}: <span class="zh-big-inline">${esc(v.t)}</span></div>` : '';
  const cl = v.cl ? `<div class="muted small mt-8">${t('measureWord')}: ${esc(v.cl.join ? v.cl.join(', ') : v.cl)}</div>` : '';
  const note = v.x && mean(v.x, lang) ? `<div class="note-box mt-12">${esc(mean(v.x, lang))}</div>` : '';
  return `<div class="anki-py">${tonedPinyin(v.p, { play: true })}</div>
    <div class="anki-ans">${esc(mean(v.m, lang))}</div>${trad}${cl}${note}
    <div class="muted small mt-8">${levelLabel(v.lv)}</div><div class="anki-syn" data-w="${esc(v.w)}" data-lv="${esc(v.lv || '')}"></div><div class="anki-ex" data-w="${esc(v.w)}" data-lv="${esc(v.lv || '')}"></div>`;
}

export function hanziExtra(h, lang) {
  const parts = [];
  if (lang === 'ja' && h.jk) parts.push(`<div class="muted small">日本の漢字: <span class="zh-big-inline">${esc(h.jk)}</span></div>`);
  if (lang === 'ko' && h.hj) parts.push(`<div class="muted small">한자: ${esc(h.hj)}</div>`);
  if (h.t && h.t !== h.c) parts.push(`<div class="muted small">${t('traditional')}: <span class="zh-big-inline">${esc(h.t)}</span></div>`);
  if (h.rad) parts.push(`<div class="muted small">${t('radical')}: ${esc(h.rad)}${h.dec ? ` · ${esc(h.dec)}` : ''}</div>`);
  if (h.ety) parts.push(`<div class="muted small">${h.ety.type ? `${esc(t('ety_' + h.ety.type) || h.ety.type)}: ` : ''}${esc(h.ety.hint || mean(h.ety, lang))}</div>`);
  return parts.join('');
}

function hanziBack(h, vm, lang) {
  const words = (h.words || []).slice(0, 4).map(w => vm.get(w)).filter(Boolean);
  return `<div class="anki-py">${tonedPinyin(h.p, { play: true })}</div>
    <div class="anki-ans">${esc(mean(h.m, lang))}</div>
    ${hanziExtra(h, lang)}
    ${words.length ? `<div class="hz-words mt-12">${words.map(w => `<span class="vocab-pill"><span class="es">${esc(w.w)}</span><span class="tr">${esc(w.p)} · ${esc(mean(w.m, lang))}</span></span>`).join('')}</div>` : ''}
    <button class="btn btn-soft btn-small mt-12" onclick="event.stopPropagation();window.__go('hanzi-detail',{c:'${esc(h.c)}',back:'review'})">${t('charSheet')} →</button>`;
}

// "Tarjetas": a fixed cumulative HSK 1–6 vocabulary deck with the learning-status colours of the vocab list.
const CARDS_LV = 'hsk6';
register('cards', (el, params = {}) => reviewView(el, { ...params, deck: 'v', lv: CARDS_LV, self: 'cards' }));

async function statusPanel(vm, upto) {
  const counts = {}, words = [...vm.values()].filter(v => LEVELS.indexOf(v.lv) <= LEVELS.indexOf(upto));
  for (const v of words) { const k = wordStatus(v.w); counts[k] = (counts[k] || 0) + 1; }
  const bar = ['master', 'review', 'learning', 'ghost', 'unseen'].map(k =>
    `<i style="width:${(counts[k] || 0) / words.length * 100}%;background:${STATUS[k].color}"></i>`).join('');
  return `<div class="card mb-16" style="padding:14px 16px"><div class="flex justify-between mb-8"><b>${levelLabel(LEVELS[0])}–${levelLabel(upto)}</b><span class="muted small">${words.length} ${t('deckWords')}</span></div>
    <div class="st-bar">${bar}</div>${statusLegend(counts)}</div>`;
}

register('review', (el, params = {}) => reviewView(el, params));
async function reviewView(el, params = {}) {
  await pyReady; await sylReady;
  if (params.mode === 'failed') { hmFailed = await allHanzi(); return runFailed(el, await allVocab()); }
  const d = params.deck || S.lastDeck || 'v';
  const self = params.self || 'review';
  const lvFix = params.lv || null;
  lastSelf = self;
  if (self === 'review' && S.lastDeck !== d) update({ lastDeck: d });
  const vm = await allVocab();
  const hm = await allHanzi();
  await seed();
  if (d === 'v') await feedByFrequency(lvFix || undefined); else await feedHanzi();
  const inDeck = await deckFilter(d, lvFix || undefined);
  const decks = lvFix ? await statusPanel(vm, lvFix) : await levelDecks(d);
  const tabs = lvFix ? '' : deckTabs(d);
  const st = deckStats(d, Date.now(), inDeck);
  const deckSize = [...(d === 'h' ? hm : vm).keys()].filter(w => !inDeck || inDeck(w)).length;
  const title = lvFix ? t('cardsDeck') : d === 'h' ? t('hanziReview') : t('vocabReview');

  if (!st.pending && !params.start) {
    el.innerHTML = `<div class="fade">
      ${header(title)}${tabs}${decks}
      ${deckSummary(st, deckSize)}
      ${deckPie(d === 'h' ? S.hcards : S.cards, inDeck, S.lang, pieName(lvFix, d))}
      ${d === 'v' ? failedBtn(failedWords(new Set(vm.keys()), 999).length) + freqPanel(lvFix) : ''}
      ${st.total - st.new ? extraBtn() : ''}
      <div class="center" style="padding-top:30px">
        <div style="font-size:48px;margin-bottom:16px">${st.total ? '🎉' : '🗂️'}</div>
        <div class="h3 mb-8">${st.total ? t('allDone') : t('deckEmpty')}</div>
        <div class="muted">${st.total ? t('noDue') : (d === 'h' ? t('deckEmptyHintH') : t('deckEmptyHint'))}</div>
        <button class="btn mt-24" onclick="window.__nav('${d === 'h' ? 'hanzi' : 'home'}')">${t('keepLearn')}</button>
      </div>
    </div>${bottomNav(self)}`;
    return;
  }

  let mode = 'due';
  let queue = [];
  // Like Anki: a card in learning waits until its step is due (1–10 min) while the rest of the session
  // goes on; with nothing else left, cards due within 20 min come early (Anki's "learn ahead limit").
  let pending = [];
  const LEARN_AHEAD = 20 * 60 * 1000;
  const pickNext = () => {
    if (!pending.length) return;
    pending.sort((a, b) => store()[a].due - store()[b].due);
    const first = pending[0], due = store()[first]?.due ?? 0, now = Date.now();
    if (due <= now || (!queue.length && due <= now + LEARN_AHEAD)) { pending.shift(); queue.unshift(first); }
  };
  let total = 0;
  let done = 0, again = 0;
  const lang = S.lang || 'es';
  const revKey = d === 'h' ? 'hcardsReverse' : 'cardsReverse';
  const reverse = !!S[revKey];
  const store = () => (d === 'h' ? S.hcards : S.cards);

  function render() {
    pickNext();
    if (!queue.length) {
      const back = mode === 'extra' ? [] : buildQueue(d, 20, Date.now() + 10 * 60 * 1000, inDeck).filter(w => store()[w].s !== 'new' && store()[w].s !== 'review');
      if (back.length) queue = back; else return finish();
    }
    const w = queue[0];
    const card = store()[w];
    let front, backHtml;
    window.__ankiGloss = null;
    if (d === 'h') {
      const h = hm.get(w) || { c: w, m: {} };
      front = reverse ? `<div class="anki-mean">${esc(mean(h.m, lang))}</div><div class="muted small">${tonedPinyin(h.p || '')}</div>` : `<div class="anki-hz">${esc(w)}</div>`;
      backHtml = (reverse ? `<div class="anki-hz">${esc(w)}</div>` : '') + hanziBack(h, vm, lang);
    } else {
      const v = vm.get(w) || { w, p: '', m: {} };
      // New words show each character's meaning above it (tap → character sheet); seen words reveal it on the back.
      const isNew = card.s === 'new';
      const plain = `<div class="anki-hz word" style="--wsize:${wordSize(w)}px">${esc(w)}</div>`;
      const glossed = hasChars(w, hm) ? charWord(w, hm, { back: self }) : plain;
      front = reverse ? `<div class="anki-mean">${esc(mean(v.m, lang))}</div>` : `<div id="anki-word">${isNew ? glossed : plain}</div>`;
      backHtml = (reverse ? glossed : '') + vocabBack(v, lang) + (hasChars(w, hm) ? `<div class="cg-tip">${t('tapCharHint')}</div>` : '');
      window.__ankiGloss = !reverse && !isNew && glossed !== plain ? glossed : null;
    }
    const stc = d === 'v' ? STATUS[wordStatus(w)] : null;
    const tag = mode === 'extra' && card.s === 'review' ? ['learn', t('extraPractice')] : card.s === 'new' ? ['new', t('tagNew')] : isForgotten(card) ? ['forgot', t('stGhost')] : card.s === 'review' ? ['due', t('tagDue')] : ['learn', t('stLearning')];
    el.innerHTML = `<div class="fade" style="padding-top:16px">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__go('${self}',{deck:'${d}'})" style="padding:4px">←</button>
        <div class="grow">${progressBar(done / Math.max(total, done + queue.length + pending.length) * 100)}</div>
        <button class="chip" style="font-size:12px;padding:4px 10px" onclick="window.__flipDir()">${reverse ? '🌐 → 中' : '中 → 🌐'}</button>
      </div>
      <div class="card anki-card" id="anki-card" onclick="window.__ankiShow()"${stc ? ` style="border-top:5px solid ${stc.color}"` : ''}>
        ${stc ? `<span class="anki-st" style="color:${stc.color}"><i class="st-dot" style="background:${stc.color}"></i> ${t(stc.key)}</span>` : ''}
        <span class="anki-tag ${tag[0]}">${tag[1]}</span>
        ${card.s === 'new' ? `<button class="anki-known" onclick="event.stopPropagation();window.__ankiKnown()">✓ ${t('iKnowIt')}</button>` : ''}
        <button class="anki-spk" onclick="event.stopPropagation();window.__ankiSpeak()">🔊</button>
        <div class="anki-front">${front}</div>
        <div class="anki-back" id="anki-back" style="display:none">
          <div class="anki-sep"></div>${backHtml}
        </div>
        <div class="muted small mt-16" id="anki-hint">${t('tapToReveal')}</div>
      </div>
      <div id="anki-btns" class="anki-btns" style="visibility:hidden">
        ${[[1, 'again', t('ankiAgain')], [2, 'hard', t('ankiHard')], [3, 'good', t('ankiGood')], [4, 'easy', t('ankiEasy')]].map(([r, c, l]) =>
          `<button class="anki-btn ${c}" onclick="window.__ankiRate(${r})"><span class="ivl">${mode === 'extra' && r > 1 && card.s === 'review' ? '=' : previewLabel(card, r)}</span>${l}</button>`).join('')}
      </div>
      <div class="muted small center mt-12">${t('cardsLeft')}: ${queue.length + pending.length}</div>
    </div>`;
  }

  window.__ankiSpeak = () => speak(queue[0]);
  window.__ankiShow = () => {
    const back = document.getElementById('anki-back');
    if (!back || back.style.display !== 'none') return;
    back.style.display = 'block'; fillExamples(back);
    document.getElementById('anki-hint').style.display = 'none';
    document.getElementById('anki-btns').style.visibility = 'visible';
    const wordEl = document.getElementById('anki-word');
    if (wordEl && window.__ankiGloss) wordEl.innerHTML = window.__ankiGloss;
    speak(queue[0]);
  };
  let rating = false;
  window.__ankiRate = (r) => {
    if (rating) return;
    rating = true; flash(r);
    setTimeout(() => { rating = false; rate(r); }, 230);
  };
  const rate = (r) => {
    const w = queue.shift();
    // Extra practice doesn't push intervals forward (like Anki's "review ahead" without rescheduling); a miss still counts.
    if (mode === 'extra' && r > 1 && store()[w].s === 'review') { done++; return render(); }
    const c = answer(w, r, d);
    touchStreak();
    if (r === 1) again++;
    if (c.s !== 'review') pending.push(w);
    else done++;
    render();
  };
  // "I already know it": the card leaves the deck and another new word takes its place.
  window.__ankiKnown = () => {
    const w = queue.shift();
    setKnown([w], true, d);
    if (S.freqStudy !== false) {
      const before = new Set(Object.keys(store()));
      (d === 'v' ? feedByFrequency(lvFix || undefined) : feedHanzi()).then(() => {
        for (const x of Object.keys(store())) if (!before.has(x) && store()[x].s === 'new') queue.push(x);
        render();
      });
    } else render();
  };
  window.__flipDir = () => { update({ [revKey]: !S[revKey] }); go(self, { deck: d }); };
  window.__ankiKeys = (e) => {
    if (!document.getElementById('anki-card')) return document.removeEventListener('keydown', window.__ankiKeys);
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); window.__ankiShow(); }
    else if (['1', '2', '3', '4'].includes(e.key) && document.getElementById('anki-btns').style.visibility === 'visible') window.__ankiRate(+e.key);
  };
  document.removeEventListener('keydown', window.__ankiKeys);
  document.addEventListener('keydown', window.__ankiKeys);

  function finish() {
    el.innerHTML = `<div class="fade center" style="padding-top:50px">
      <div style="font-size:56px;margin-bottom:12px">🎉</div>
      <div class="h2 mb-8">${t('reviewDone')}</div>
      <div class="muted mb-16">${done} ${t('cardsStudied')} · ${again} × ${t('ankiAgain')}</div>
      ${deckSummary(deckStats(d, Date.now(), inDeck), deckSize)}
      ${deckPie(d === 'h' ? S.hcards : S.cards, inDeck, S.lang, pieName(lvFix, d))}
      ${extraBtn()}
      <button class="btn mt-16" onclick="window.__nav('home')">${t('continue')}</button>
    </div>${bottomNav(self)}`;
  }

  el.innerHTML = `<div class="fade">
    ${header(title)}${tabs}${decks}
    ${deckSummary(st, deckSize)}
    <div class="muted small mb-16">${d === 'h' ? t('ankiExplainH') : t('ankiExplain')}</div>
    ${st.learn + st.due ? `<button class="btn mb-12" style="width:100%" onclick="window.__ankiStart('due')">🔁 ${t('reviewSeen')} (${st.learn + st.due})</button>` : `<div class="muted small mb-12">✓ ${t('noDue')}</div>`}
    ${st.newToday ? `<button class="btn btn-soft mb-12" style="width:100%" onclick="window.__ankiStart('new')">🆕 ${t('learnNew')} (${st.newToday})</button>` : ''}
    ${deckPie(d === 'h' ? S.hcards : S.cards, inDeck, S.lang, pieName(lvFix, d))}
    ${st.total - st.new ? extraBtn() : ''}
    ${d === 'v' ? `<div class="mt-16">${failedBtn(failedWords(new Set(vm.keys()), 999).length)}${freqPanel(lvFix)}</div>` : ''}
  </div>${bottomNav(self)}`;
  window.__ankiStart = (m = 'due') => {
    mode = m;
    queue = buildQueue(d, m === 'extra' ? 20 : 9999, Date.now(), inDeck, m);
    pending = [];
    total = queue.length; done = 0; again = 0;
    if (!queue.length) return params.start ? null : go(self, { deck: d });
    render();
  };
  function extraBtn() {
    return `<button class="btn btn-ghost mb-12" style="width:100%" onclick="window.__go('${self}',{deck:'${d}',start:'extra'})">♾️ ${t('extraPractice')}</button>
      <div class="muted small mb-12">${t('extraPracticeHint')}</div>`;
  }
  if (params.start) window.__ankiStart(params.start);
}
