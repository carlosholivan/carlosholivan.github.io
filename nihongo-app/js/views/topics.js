// Vocabulary by theme (category › subcategory), across every level, with learning status and quick study.
import { S, update } from '../state.js?v=202611131800';
import { register, go, render } from '../router.js?v=202611131800';
import { LEVELS, levelLabel } from '../levels.js?v=202611131800';
import { setKnown, addCards } from '../engine/anki.js?v=202611131800';
import { bottomNav, header, progressBar } from '../ui/components.js?v=202611131800';
import { speak } from '../audio.js?v=202611131800';
import { t } from '../i18n.js?v=202611131800';
import { esc, mean, tonedPinyin, sylReady } from '../ja.js?v=202611131800';
import { allVocab } from './review.js?v=202611131800';
import { wordStatus, STATUS, statusLegend, isLearned } from '../engine/status.js?v=202611131800';

let topics = null;
let lvFilter = 'all';
const label = o => o[S.lang] || o.en || o.es;
const learned = isLearned;

async function load() {
  if (!topics) topics = await fetch('data/topics.json?v=202611131800').then(r => r.json());
  return topics;
}
// Words of a subcategory as [level, word], filtered by the selected level.
const words = sub => sub.w.map(x => x.split('|')).filter(([l]) => lvFilter === 'all' || l === lvFilter);
const stats = ws => { const n = ws.length, k = ws.filter(([, w]) => learned(w)).length; return { n, k, pct: n ? Math.round(k / n * 100) : 0 }; };

function lvChips() {
  return `<div class="flex gap-8 mb-12 level-chips" style="flex-wrap:wrap">${['all', ...LEVELS].map(l =>
    `<button class="chip ${lvFilter === l ? 'on' : ''}" onclick="window.__tpLv('${l}')">${l === 'all' ? t('fAll') : levelLabel(l)}</button>`).join('')}</div>`;
}

register('topics', async (el, params = {}) => {
  const data = await load();
  const cat = params.cat && data.find(c => c.id === params.cat);
  const sub = cat && params.sub && cat.subs.find(s => s.id === params.sub);
  if (sub) return renderSub(el, cat, sub);
  if (cat) return renderCat(el, cat);
  el.innerHTML = `<div class="fade" style="padding-bottom:90px">
    ${header(t('topicsNav'), true)}
    <div class="muted small mb-12">${t('topicsHint')}</div>
    ${lvChips()}
    <div class="tp-grid">${data.map(c => {
      const st = stats(c.subs.flatMap(words));
      if (!st.n) return '';
      return `<button class="card tp-cat" onclick="window.__nav('topics',{cat:'${c.id}'})">
        <div class="kbadge sm">${c.b}</div>
        <div class="tp-name">${esc(label(c))}</div>
        <div class="tp-meta muted small">${st.n} · ${st.pct}%</div>
        ${progressBar(st.pct)}</button>`;
    }).join('')}</div>
  </div>${bottomNav('review')}`;
});

function renderCat(el, cat) {
  el.innerHTML = `<div class="fade" style="padding-bottom:90px">
    ${header(`${cat.b} ${label(cat)}`, true)}
    ${lvChips()}
    ${cat.subs.map(s => {
      const st = stats(words(s));
      if (!st.n) return '';
      return `<div class="card tp-sub" onclick="window.__nav('topics',{cat:'${cat.id}',sub:'${s.id}'})">
        <div class="flex justify-between items-center"><b>${esc(label(s))}</b><span class="muted small">${st.k}/${st.n} · ${st.pct}% ›</span></div>
        ${progressBar(st.pct)}
        <div class="tp-peek">${words(s).slice(0, 8).map(([, w]) => `<span style="color:${STATUS[wordStatus(w)].color}">${esc(w)}</span>`).join('')}${st.n > 8 ? '<span class="muted">…</span>' : ''}</div>
      </div>`;
    }).join('')}
  </div>${bottomNav('review')}`;
}

async function renderSub(el, cat, sub) {
  const vm = await allVocab();
  await sylReady;
  const ws = words(sub).map(([l, w]) => ({ ...(vm.get(w) || { w, m: {} }), lv: l }));
  const st = stats(words(sub));
  const toLearn = ws.filter(v => !learned(v.w)).length;
  el.innerHTML = `<div class="fade" style="padding-bottom:90px">
    ${header(`${cat.b} ${label(sub)}`, true)}
    ${lvChips()}
    <div class="muted small mb-8">${label(cat)} › ${label(sub)} · ✓ ${st.k}/${st.n}</div>
    ${progressBar(st.pct)}
    <div class="mt-12 mb-8">${statusLegend()}</div>
    ${toLearn ? `<button class="btn mb-12" onclick="window.__tpStudy('${cat.id}','${sub.id}')">🗂️ ${t('topicsStudy').replace('{n}', toLearn)}</button>` : ''}
    <div class="vl-list">${ws.map(v => `<div class="vl-row ${learned(v.w) ? 'is-known' : ''}">
      <span class="st-dot" style="background:${STATUS[wordStatus(v.w)].color}"></span>
      <span class="vl-w" style="color:${STATUS[wordStatus(v.w)].color}" onclick="window.__tpSay('${esc(v.w)}')">${esc(v.w)}</span>
      <span class="vl-main"><span class="vl-p">${v.p ? tonedPinyin(v.p, { play: true }) : ''} <span class="badge">${levelLabel(v.lv)}</span></span>
        <span class="vl-m muted small">${esc(mean(v.m, S.lang))}</span></span>
    </div>`).join('')}</div>
  </div>${bottomNav('review')}`;
}

window.__tpLv = (l) => { lvFilter = l; render(); };
window.__tpSay = (w) => speak(w);
// Put every not-yet-learned word of the subcategory at the front of the new-card queue and open the review.
window.__tpStudy = async (cid, sid) => {
  const cat = topics.find(c => c.id === cid), sub = cat.subs.find(s => s.id === sid);
  const vm = await allVocab();
  const ws = words(sub).map(([, w]) => w).filter(w => !learned(w) && vm.has(w));
  const rank = w => (vm.get(w) || {}).q ?? 99999;
  setKnown(ws, false, 'v', rank);
  addCards(ws, 'v', () => -1);
  ws.forEach(w => { if (S.cards[w] && S.cards[w].s === 'new') S.cards[w].r = -1; });
  update({});
  go('review', { deck: 'v' });
};
