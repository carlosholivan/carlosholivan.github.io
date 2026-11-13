import { S, isUnitDone, isUnitUnlocked, update } from '../state.js?v=202611131800';
import { register, go } from '../router.js?v=202611131800';
import { loadUnits, loadVocab, loadTexts, loadHanzi } from '../data.js?v=202611131800';
import { bottomNav, progressBar } from '../ui/components.js?v=202611131800';
import { icon } from '../ui/icons.js?v=202611131800';
import { mascot } from '../ui/mascot.js?v=202611131800';
import { t } from '../i18n.js?v=202611131800';
import { LEVELS, levelLabel } from '../levels.js?v=202611131800';
import { deckStats } from '../engine/anki.js?v=202611131800';
import { isLearned } from '../engine/status.js?v=202611131800';
import { CFG } from '../app-config.js?v=202611131800';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

register('home', async (el) => {
  const units = await loadUnits(S.level);
  const totalDone = units.filter((_, i) => isUnitDone(S.level, i + 1)).length;
  const pct = units.length ? Math.round((totalDone / units.length) * 100) : 0;
  const next = units.findIndex((_, i) => !isUnitDone(S.level, i + 1));
  const due = deckStats('v').pending;
  const levelPct = {};
  await Promise.all(LEVELS.map(async l => {
    const us = await loadUnits(l).catch(() => []);
    levelPct[l] = us.length ? Math.round(us.filter((_, i) => isUnitDone(l, i + 1)).length / us.length * 100) : 0;
  }));
  const bd = await breakdown(S.level, units);
  const pctAll = bd.length ? Math.round(bd.reduce((a, r) => a + r.pct, 0) / bd.length) : pct;
  const msg = due ? t('mascotDue').replace('{n}', due) : S.streak ? t('mascotStreak').replace('{n}', S.streak) : t('mascotStart');

  el.innerHTML = `<div class="fade">
    <div class="home-top">
      <div><div class="home-hi">${CFG.hello}</div><div class="h2">${esc(S.name || t('hello'))}</div></div>
      <button class="card icon-btn" onclick="window.__nav('settings')" aria-label="${t('settings')}">${icon('gear', 22)}</button>
    </div>

    <div class="card mascot-card">
      <div>${mascot(S.streak > 0 ? 'proud' : 'happy', 68)}</div>
      <div class="grow"><div class="mc-t">${t('mascotHi')} ${icon('dango', 18)}</div><div class="mc-s">${msg}</div></div>
    </div>

    <div class="stat-row">
      <div class="card" onclick="window.__nav('progress')">${icon('flame', 24)}<b>${S.streak || 0}</b><span>${t('curStreak')}</span></div>
      <div class="card" onclick="window.__nav('review')">${icon('cards', 24)}<b>${due}</b><span>${t('cardsNav')}</span></div>
      <div class="card" onclick="window.__nav('ranking')">${icon('trophy', 24)}<b>${S.xp || 0}</b><span>XP</span></div>
    </div>

    <div class="card lvl-card">
      <div class="flex justify-between" style="align-items:baseline;margin-bottom:6px">
        <div class="lvl-k">${t('levelNow').toUpperCase()} · ${levelLabel(S.level)}</div>
        <div class="lvl-p">${pctAll}%</div>
      </div>
      ${progressBar(pctAll)}
      <div class="muted small mt-8 mb-16">${t('globalProg')} · ${totalDone}/${units.length} ${t('levelProg')}</div>
      ${bd.map(r => `<div class="bd-row" onclick="window.__nav('${r.view}')">
        <div class="bd-top"><span class="bd-b">${r.badge}</span><span class="bd-l">${t(r.key)}</span>
          <span class="bd-n">${r.done}/${r.total}</span><span class="bd-p">${r.pct}%</span></div>
        ${progressBar(r.pct)}</div>`).join('')}
      ${next >= 0 ? `<button class="btn mt-16" onclick="window.__startUnit(${next + 1})">${t('keepGoing')} · ${next + 1}. ${esc((units[next].title || {})[S.lang] || (units[next].title || {}).es || '')}</button>` : ''}
    </div>

    <div class="sec-label">${t('changeLevel')}</div>
    <div class="lvl-row">${LEVELS.map(l => `<div class="card ${l === S.level ? 'on' : ''}" onclick="window.__setLevel('${l}')"><b>${levelLabel(l)}</b><span>${levelPct[l]}%</span></div>`).join('')}</div>

    <div class="sec-label">${t('toolsLabel')}</div>
    <div class="menu-grid">${CFG.tools.map(([b, k, sub, view]) => `<button class="card lvlcard" onclick="window.__nav('${view}')">
      <div class="kbadge sm">${b}</div><div class="grow"><div class="lc-t">${t(k)}</div><div class="lc-s">${t(sub)}</div></div></button>`).join('')}</div>

    <div class="sec-label">${t('lessonsLabel')}</div>
    <div class="lesson-tree">
      ${units.map((u, i) => {
        const num = i + 1;
        const done = isUnitDone(S.level, num);
        const unlocked = isUnitUnlocked(S.level, num);
        const status = done ? 'done' : unlocked ? 'current' : 'locked';
        return `<div class="lesson-node" onclick="${unlocked ? `window.__startUnit(${num})` : ''}">
          <div class="lesson-circle ${status}">${done ? icon('check', 20, '#fff') : num}</div>
          <div class="grow">
            <div style="font-weight:600;font-size:15px;font-family:var(--serif)">${esc(u.title[S.lang] || u.title.en || u.title.es)}</div>
            <div class="muted small">${esc((u.desc || {})[S.lang] || (u.desc || {}).en || (u.desc || {}).es || '')}</div>
            ${done ? setChips(num) : ''}
          </div>
          ${!unlocked ? icon('lock', 18, 'var(--ink2)') : ''}
        </div>`;
      }).join('')}
    </div>
  </div>
  ${bottomNav('home')}`;
});

window.__setLevel = (lvl) => {
  update({ level: lvl });
  go('home');
};

window.__startUnit = (num) => {
  go('lesson', { level: S.level, unit: num });
};

// Completed lessons offer optional sets 2–7 (set 1 is the lesson itself).
function setChips(num) {
  const got = new Set((S.sets || {})[`${S.level}-${num}`] || []);
  return `<div class="set-chips" title="${t('extraSets')}"><span class="muted small">${t('extraSet')}:</span>${[2, 3, 4, 5, 6, 7].map(n =>
    `<button class="set-chip ${got.has(n) ? 'done' : ''}" onclick="event.stopPropagation();window.__startSet(${num},${n})">${n}</button>`).join('')}</div>`;
}

window.__startSet = (num, set) => go('lesson', { level: S.level, unit: num, set });

// Level progress by area (as in the old Nihongo home): vocabulary, grammar, readings and characters.
const learned = c => c && (c.s === 'known' || c.s === 'review');
async function breakdown(level, units) {
  const [vocab, texts, hanzi] = await Promise.all([loadVocab(level).catch(() => []), loadTexts(level).catch(() => []), loadHanzi(level).catch(() => [])]);
  const cards = S.cards || {}, hcards = S.hcards || {};
  const gTotal = units.reduce((a, u) => a + (u.grammar || []).length, 0);
  const gDone = units.reduce((a, u, i) => a + (isUnitDone(level, i + 1) ? (u.grammar || []).length : 0), 0);
  const rows = [
    { key: 'vocabulary', badge: CFG.progBadges[0], view: 'vocab-list', done: vocab.filter(v => isLearned(v.w || v.word)).length, total: vocab.length },
    { key: 'grammar', badge: CFG.progBadges[1], view: 'reference', done: gDone, total: gTotal },
    { key: 'readingsLbl', badge: CFG.progBadges[2], view: 'texts', done: texts.filter(x => (S.texts || {})[x.id]?.q != null).length, total: texts.length },
    { key: 'hanzi', badge: CFG.progBadges[3], view: 'hanzi', done: hanzi.filter(h => learned(hcards[h.c])).length, total: hanzi.length },
  ].filter(r => r.total);
  rows.forEach(r => { r.pct = Math.round(r.done / r.total * 100); });
  return rows;
}
