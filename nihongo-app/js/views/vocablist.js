// Vocabulary list per HSK level, ordered by frequency, with single/multiple selection to mark words as learned.
import { S, update } from '../state.js?v=202611141700';
import { register } from '../router.js?v=202611141700';
import { LEVELS, levelChips, levelLabel } from '../levels.js?v=202611141700';
import { setKnown, addCards, cardState } from '../engine/anki.js?v=202611141700';
import { bottomNav, header } from '../ui/components.js?v=202611141700';
import { speak } from '../audio.js?v=202611141700';
import { t } from '../i18n.js?v=202611141700';
import { esc, mean, tonedPinyin, sylReady } from '../ja.js?v=202611141700';
import { allVocab } from './review.js?v=202611141700';
import { wordStatus, statusLegend, STATUS, STATUS_ORDER, isLearned } from '../engine/status.js?v=202611141700';

const PAGE = 100;
const sel = new Set();
let lastClicked = null;
let view = { level: null, filter: 'all', q: '', page: 0 };

const strip = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function rows() {
  const vm = await allVocab();
  const q = strip(view.q).replace(/\s+/g, '');
  // Searching looks in every level; otherwise only the selected level.
  let list = [...vm.values()].sort((a, b) => (a.q || 99999) - (b.q || 99999));
  const rk = {};
  for (const v of list) { rk[v.lv] = (rk[v.lv] || 0) + 1; v.rk = rk[v.lv]; }
  if (!q) list = list.filter(v => v.lv === view.level);
  // Filters follow the same word status as the rest of the app (status.js).
  if (view.filter !== 'all') list = list.filter(v => {
    const s = wordStatus(v.w);
    return s === view.filter;
  });
  if (q) list = list.filter(v => v.w.includes(view.q.trim()) || strip(v.p).replace(/\s+/g, '').includes(q)
    || Object.values(v.m || {}).some(m => strip(m).includes(strip(view.q.trim()))));
  return list;
}

register('vocab-list', async (el, params = {}) => {
  if (params.level) view = { ...view, level: params.level, page: 0 };
  if (!view.level) view.level = S.level;
  const list = await rows();
  await sylReady;
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  view.page = Math.min(view.page, pages - 1);
  const slice = list.slice(view.page * PAGE, (view.page + 1) * PAGE);
  const lang = S.lang;
  // One label per word, the same status (and colour) used in the reader, the deck and the progress screens.
  const status = w => {
    const k = wordStatus(w);
    if (k === 'unseen') return cardState(w) === 'new' ? `<span class="vl-st new">${t('vlNewInDeck')}</span>` : '';
    const lbl = cardState(w) === 'known' ? '✓ ' + t('cardMarkedKnown') : t(STATUS[k].key);
    return `<span class="vl-st" style="background:${STATUS[k].color}22;color:${STATUS[k].color}">${lbl}</span>`;
  };
  const counts = {};
  const vm = await allVocab();
  const lvWords = [...vm.values()].filter(v => v.lv === view.level);
  for (const v of lvWords) { const k = wordStatus(v.w); counts[k] = (counts[k] || 0) + 1; }
  const total = lvWords.length;
  const nLearned = (counts.review || 0) + (counts.master || 0);

  el.innerHTML = `<div class="fade" style="padding-bottom:90px">
    ${header(t('vocabList'), true)}
    ${levelChips(view.level, '__vlLevel')}
    <div class="muted small mb-8">${levelLabel(view.level)} · ${total} · ✓ ${nLearned} ${t('fKnown').toLowerCase()} (${total ? Math.round(nLearned / total * 100) : 0}%) — ${t('vocabListHint')}</div>
    <div class="vl-progress mb-8">${['master', 'review', 'learning', 'ghost'].map(k => `<span style="width:${(counts[k] || 0) / total * 100}%;background:${STATUS[k].color}"></span>`).join('')}</div>
    <input id="vl-q" class="vl-search" type="search" placeholder="${t('searchWord')}" value="${esc(view.q)}">
    <div class="flex gap-8 mt-8 mb-8" style="flex-wrap:wrap">
      <button class="chip ${view.filter === 'all' ? 'on' : ''}" onclick="window.__vlFilter('all')">${t('fAll')} <b>${total}</b></button>
      ${STATUS_ORDER.map(k => `<button class="chip ${view.filter === k ? 'on' : ''}" onclick="window.__vlFilter('${k}')"><i class="vl-dot" style="background:${STATUS[k].color}"></i>${t(STATUS[k].key)} <b>${counts[k] || 0}</b></button>`).join('')}
    </div>
    <div class="flex gap-8 mb-8 small">
      <button class="btn-link" onclick="window.__vlSelPage()">☑️ ${t('selectPage')}</button>
      <button class="btn-link" onclick="window.__vlSelNone()">✖ ${t('selectNone')}</button>
    </div>
    <div class="vl-list">${slice.map(v => `<div class="vl-row ${sel.has(v.w) ? 'sel' : ''} ${isLearned(v.w) ? 'is-known' : ''}" data-w="${esc(v.w)}">
      <input type="checkbox" ${sel.has(v.w) ? 'checked' : ''} onclick="window.__vlToggle(event, '${esc(v.w)}')">
      <span class="vl-rk muted small">${v.rk}</span>
      <span class="st-dot" style="background:${STATUS[wordStatus(v.w)].color}"></span>
      <span class="vl-w" style="color:${STATUS[wordStatus(v.w)].color}" onclick="window.__vlSpeak('${esc(v.w)}')">${esc(v.w)}</span>
      <span class="vl-main"><span class="vl-p">${tonedPinyin(v.p, { play: true })}${view.q && v.lv !== view.level ? ` <span class="badge">${levelLabel(v.lv)}</span>` : ''}</span><span class="vl-m muted small">${esc(mean(v.m, lang))}</span></span>
      ${status(v.w)}
    </div>`).join('') || `<div class="muted center mt-16">—</div>`}</div>
    ${pages > 1 ? `<div class="flex gap-8 mt-16 items-center" style="justify-content:center">
      <button class="chip" ${view.page ? '' : 'disabled'} onclick="window.__vlPage(${view.page - 1})">‹</button>
      <span class="small">${view.page + 1} / ${pages}</span>
      <button class="chip" ${view.page < pages - 1 ? '' : 'disabled'} onclick="window.__vlPage(${view.page + 1})">›</button></div>` : ''}
    <div class="vl-bar ${sel.size ? 'show' : ''}">
      <b>${sel.size} ${t('selected')}</b>
      <button class="btn btn-small" style="background:#8e44ad" onclick="window.__vlAct('known')">✓ ${t('markKnown')}</button>
      <button class="btn btn-small btn-ghost" onclick="window.__vlAct('unknown')">↺ ${t('unmarkKnown')}</button>
      <button class="btn btn-small btn-ghost" onclick="window.__vlAct('study')">🗂️ ${t('studyThese')}</button>
    </div>
    <div id="vl-toast" class="vl-toast"></div>
  </div>${bottomNav('review')}`;

  const inp = document.getElementById('vl-q');
  let tm;
  inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { view.q = inp.value; view.page = 0; rerender(true); }, 250); });
  window.__vlSlice = slice.map(v => v.w);
  window.__vlAll = list.map(v => v.w);
});

function rerender(focus) {
  window.__go('vocab-list');
  if (focus) setTimeout(() => { const i = document.getElementById('vl-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 60);
}

window.__vlLevel = (l) => { view = { ...view, level: l, page: 0 }; sel.clear(); rerender(); };
window.__vlFilter = (f) => { view.filter = f; view.page = 0; rerender(); };
window.__vlPage = (p) => { view.page = p; rerender(); window.scrollTo(0, 0); };
window.__vlSpeak = (w) => speak(w);
// Shift+click selects the range from the previous click.
window.__vlToggle = (e, w) => {
  const on = e.target.checked;
  const ws = window.__vlSlice || [];
  if (e.shiftKey && lastClicked && ws.includes(lastClicked)) {
    const [a, b] = [ws.indexOf(lastClicked), ws.indexOf(w)].sort((x, y) => x - y);
    ws.slice(a, b + 1).forEach(x => on ? sel.add(x) : sel.delete(x));
  } else on ? sel.add(w) : sel.delete(w);
  lastClicked = w;
  rerender();
};
window.__vlSelPage = () => { (window.__vlSlice || []).forEach(w => sel.add(w)); rerender(); };
window.__vlSelNone = () => { sel.clear(); rerender(); };
window.__vlAct = async (act) => {
  const ws = [...sel];
  const vm = await allVocab();
  const rank = w => (vm.get(w) || {}).q ?? 99999;
  if (act === 'known') setKnown(ws, true, 'v', rank);
  if (act === 'unknown') setKnown(ws, false, 'v', rank);
  if (act === 'study') {
    setKnown(ws, false, 'v', rank);
    addCards(ws, 'v', () => -1);
    ws.forEach(w => { if (S.cards[w].s === 'new') S.cards[w].r = -1; });
    update({});
  }
  sel.clear();
  rerender();
  setTimeout(() => {
    const el = document.getElementById('vl-toast');
    if (el) { el.textContent = t('doneMarked').replace('{n}', ws.length); el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1800); }
  }, 80);
  if (act === 'study') setTimeout(() => window.__go('review', { deck: 'v' }), 700);
};
