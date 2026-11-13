import { S, isUnitDone } from '../state.js?v=202611132300';
import { register } from '../router.js?v=202611132300';
import { loadUnits } from '../data.js?v=202611132300';
import { bottomNav, header, progressBar } from '../ui/components.js?v=202611132300';
import { allVocab } from './review.js?v=202611132300';
import { wordStatus } from '../engine/status.js?v=202611132300';
import { t } from '../i18n.js?v=202611132300';
import { LEVELS, LEVEL_NAME, levelLabel } from '../levels.js?v=202611132300';

register('progress', async (el) => {
  const levels = await Promise.all(LEVELS.map(async l => {
    const units = await loadUnits(l).catch(() => []);
    return { l, total: units.length, done: units.filter((_, i) => isUnitDone(l, i + 1)).length };
  }));

  // Counted over real HSK words only, combining lessons (S.vocab) and the card deck (S.cards).
  const vm = await allVocab();
  let totalWords = 0, masteredWords = 0;
  for (const w of vm.keys()) {
    const st = wordStatus(w);
    if (st !== 'unseen') totalWords++;
    if (st === 'master') masteredWords++;
  }

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

    ${levels.filter(x => x.total).map(({ l, total, done }) => `
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-12">${levelLabel(l)} — ${t(LEVEL_NAME[l])}</div>
      <div class="flex items-center justify-between mb-8">
        <span class="muted small">${done}/${total} ${t('lessons')}</span>
        <span class="small" style="font-weight:600">${Math.round(done / total * 100)}%</span>
      </div>
      ${progressBar(done / total * 100)}
    </div>`).join('')}
  </div>${bottomNav('progress')}`;
});
