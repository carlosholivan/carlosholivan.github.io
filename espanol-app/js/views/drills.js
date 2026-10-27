// "Práctica de gramática": choose-the-correct-form drills per level and category.
import { S, update } from '../state.js';
import { register, go } from '../router.js';
import { loadDrills } from '../data.js';
import { bottomNav, header, progressBar } from '../ui/components.js';
import { t } from '../i18n.js';
import { levelChips } from '../levels.js';
import { speak, stop } from '../audio.js';

const ROUND = 10;
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tr = (o) => (o && (o[S.lang] || o.en)) || '';
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const key = (level, cat) => `${level}-${cat}`;
const stats = () => S.drills || {};

// ── Category list ──
register('drills', async (el) => {
  const cats = await loadDrills(S.level);
  el.innerHTML = `<div class="fade">
    ${header(t('grammarPractice'))}
    ${levelChips(S.level, '__drillsLevel')}
    <div class="muted small mb-12">🎯 ${t('drillsHint')}</div>
    ${cats.length ? cats.map(c => {
      const st = stats()[key(S.level, c.id)];
      return `<div class="card ref-topic drill-cat" onclick="window.__openDrill('${c.id}')">
        <div class="flex items-center gap-12">
          <span class="drill-ic">${c.icon}</span>
          <div class="grow">
            <div style="font-weight:700;font-size:16px">${esc(c.title.es)}</div>
            <div class="muted small">${esc(tr(c.title))} · ${c.items.length} ${t('exercisesShort')}</div>
            <div class="small" style="margin-top:2px">${esc(tr(c.desc))}</div>
          </div>
          ${st ? `<span class="small" style="color:${st.best >= 80 ? 'var(--ok)' : 'var(--ink2)'};font-weight:700">${st.best}%</span>` : ''}
        </div>
      </div>`;
    }).join('') : `<div class="muted" style="text-align:center;padding:40px 0">${t('noTexts')}</div>`}
  </div>${bottomNav('reference')}`;
});

window.__drillsLevel = (l) => { update({ level: l }); go('drills'); };
window.__openDrill = (cat) => go('drill', { level: S.level, cat });

// ── Drill session ──
register('drill', async (el, params) => {
  const cats = await loadDrills(params.level);
  const cat = cats.find(c => c.id === params.cat);
  if (!cat) { go('drills'); return; }
  const k = key(params.level, cat.id);
  // Prefer items never answered correctly, then the rest, keeping some randomness.
  const right = new Set(stats()[k]?.ok || []);
  const pool = [...shuffle(cat.items.map((_, i) => i).filter(i => !right.has(i))), ...shuffle(cat.items.map((_, i) => i).filter(i => right.has(i)))];
  const round = pool.slice(0, Math.min(ROUND, pool.length));
  let pos = 0, score = 0;
  const newlyOk = [], gotRight = new Set(), gotWrong = new Set();

  function render() {
    if (pos >= round.length) return finish();
    const it = cat.items[round[pos]];
    const order = shuffle(it.o.map((_, i) => i));
    const [before, after] = it.q.split('___');
    el.innerHTML = `<div class="fade text-view">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__nav('drills')" style="padding:4px">←</button>
        <div class="grow"><div class="h3">${cat.icon} ${esc(cat.title.es)}</div>${progressBar(pos / round.length * 100)}</div>
        <span class="muted small">${pos + 1}/${round.length}</span>
      </div>
      <div class="muted small mb-8">${t('chooseCorrectForm')}</div>
      <div class="card drill-q mb-16">${esc(before)}<span class="drill-gap" id="drill-gap">___</span>${esc(after)}</div>
      <div id="opts">${order.map(i => `<button class="exercise-option" data-i="${i}" onclick="window.__drillAnswer(${i})">${esc(it.o[i])}</button>`).join('')}</div>
      <div id="drill-fb"></div>
    </div>`;
    window.__drillAnswer = (i) => {
      const ok = i === it.a;
      if (ok) { score++; gotRight.add(round[pos]); if (!right.has(round[pos])) newlyOk.push(round[pos]); }
      else gotWrong.add(round[pos]);
      document.querySelectorAll('#opts .exercise-option').forEach(b => {
        b.disabled = true;
        const bi = +b.dataset.i;
        if (bi === it.a) b.classList.add('correct');
        else if (bi === i) b.classList.add('wrong');
      });
      const gap = document.getElementById('drill-gap');
      gap.textContent = it.o[it.a];
      gap.classList.add(ok ? 'ok' : 'no');
      const full = before + it.o[it.a] + after;
      document.getElementById('drill-fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'} mt-12">
          <div style="font-weight:800">${ok ? '✓ ' + t('correct') : '✗ ' + esc(it.o[i]) + ' → ' + esc(it.o[it.a])}</div>
          <div class="small" style="color:var(--ink);margin-top:6px">🌐 ${esc(tr(it.tr))}</div>
          <div class="small" style="color:var(--ink);margin-top:6px">💡 ${esc(tr(it.e))}</div>
        </div>
        <button class="btn mt-16" onclick="window.__drillNext()">${t('continue')} →</button>`;
      speak(full);
    };
  }

  window.__drillNext = () => { stop(); pos++; render(); };

  function finish() {
    const pct = Math.round(score / round.length * 100);
    const prev = stats()[k] || { best: 0, ok: [] };
    const ok = [...new Set([...(prev.ok || []), ...newlyOk])];
    // "bad" = items failed and not answered right since; they feed the review lesson.
    const bad = [...new Set([...(prev.bad || []).filter(i => !gotRight.has(i)), ...gotWrong])];
    update({ drills: { ...stats(), [k]: { best: Math.max(prev.best || 0, pct), ok, bad, ts: Date.now() } }, xp: S.xp + newlyOk.length });
    el.innerHTML = `<div class="fade" style="text-align:center;padding-top:40px">
      <div style="font-size:56px">${pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
      <div class="h1 mt-8">${score} / ${round.length}</div>
      <div class="muted mb-16">${esc(cat.title.es)} · ${ok.length} / ${cat.items.length} ${t('mastered')}</div>
      ${newlyOk.length ? `<div class="mb-16" style="color:var(--accent);font-weight:700">+${newlyOk.length} XP</div>` : ''}
      <button class="btn" onclick="window.__openDrill('${cat.id}')">🔁 ${t('anotherRound')}</button>
      <button class="btn btn-soft mt-8" onclick="window.__nav('drills')">${t('grammarPractice')}</button>
    </div>`;
  }

  render();
});
