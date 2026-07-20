import { S, isUnitDone } from '../state.js';
import { register } from '../router.js';
import { loadUnits } from '../data.js';
import { bottomNav, header, progressBar } from '../ui/components.js';
import { t } from '../i18n.js';

register('progress', async (el) => {
  const a1Units = await loadUnits('a1');
  const a2Units = await loadUnits('a2');
  const b1Units = await loadUnits('b1');

  const a1Done = a1Units.filter((_, i) => isUnitDone('a1', i + 1)).length;
  const a2Done = a2Units.filter((_, i) => isUnitDone('a2', i + 1)).length;
  const b1Done = b1Units.filter((_, i) => isUnitDone('b1', i + 1)).length;

  const totalWords = Object.keys(S.vocab).length;
  const masteredWords = Object.values(S.vocab).filter(v => v.correct >= 3 && v.interval >= 7).length;

  el.innerHTML = `<div class="fade">
    ${header(t('progress'))}

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="flex items-center justify-between mb-12">
        <div class="h3">${t('stats')}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="card" style="padding:14px;text-align:center;border-radius:14px">
          <div style="font-size:24px;font-weight:700;color:var(--accent)">${S.xp}</div>
          <div class="muted small">${t('totalXp')}</div>
        </div>
        <div class="card" style="padding:14px;text-align:center;border-radius:14px">
          <div style="font-size:24px;font-weight:700;color:var(--gold)">${S.streak}</div>
          <div class="muted small">${t('streak')}</div>
        </div>
        <div class="card" style="padding:14px;text-align:center;border-radius:14px">
          <div style="font-size:24px;font-weight:700;color:var(--ok)">${totalWords}</div>
          <div class="muted small">${t('wordsSeen')}</div>
        </div>
        <div class="card" style="padding:14px;text-align:center;border-radius:14px">
          <div style="font-size:24px;font-weight:700">${masteredWords}</div>
          <div class="muted small">${t('mastered')}</div>
        </div>
      </div>
    </div>

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-12">A1 — ${t('beginner')}</div>
      <div class="flex items-center justify-between mb-8">
        <span class="muted small">${a1Done}/${a1Units.length} ${t('lessons')}</span>
        <span class="small" style="font-weight:600">${Math.round(a1Done/a1Units.length*100)}%</span>
      </div>
      ${progressBar(a1Done/a1Units.length*100)}
    </div>

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-12">A2 — ${t('elementary')}</div>
      <div class="flex items-center justify-between mb-8">
        <span class="muted small">${a2Done}/${a2Units.length} ${t('lessons')}</span>
        <span class="small" style="font-weight:600">${Math.round(a2Done/a2Units.length*100)}%</span>
      </div>
      ${progressBar(a2Done/a2Units.length*100)}
    </div>

    <div class="card" style="padding:20px">
      <div class="h3 mb-12">B1 — ${t('intermediate')}</div>
      <div class="flex items-center justify-between mb-8">
        <span class="muted small">${b1Done}/${b1Units.length} ${t('lessons')}</span>
        <span class="small" style="font-weight:600">${Math.round(b1Done/b1Units.length*100)}%</span>
      </div>
      ${progressBar(b1Done/b1Units.length*100)}
    </div>
  </div>${bottomNav('progress')}`;
});
