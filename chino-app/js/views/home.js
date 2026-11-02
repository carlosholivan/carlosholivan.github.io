import { S, isUnitDone, isUnitUnlocked, update } from '../state.js?v=202611021344';
import { register, go } from '../router.js?v=202611021344';
import { loadUnits } from '../data.js?v=202611021344';
import { bottomNav, header, progressBar, streakBadge } from '../ui/components.js?v=202611021344';
import { icon } from '../ui/icons.js?v=202611021344';
import { t } from '../i18n.js?v=202611021344';
import { levelChips, levelLabel } from '../levels.js?v=202611021344';

register('home', async (el) => {
  const units = await loadUnits(S.level);
  const totalDone = units.filter((_, i) => isUnitDone(S.level, i + 1)).length;
  const pct = Math.round((totalDone / units.length) * 100);

  el.innerHTML = `<div class="fade">
    ${header('中文 · ' + t('chinese'))}
    <div class="card" style="padding:20px;margin-bottom:20px">
      <div class="flex items-center justify-between mb-8">
        <div>
          <div class="h2">${levelLabel(S.level)}</div>
          <div class="muted small">${totalDone}/${units.length} ${t('lessons')}</div>
        </div>
        <div style="text-align:right">
          ${streakBadge()}
          <div class="muted small mt-8">${S.xp} XP</div>
        </div>
      </div>
      ${progressBar(pct)}
    </div>

    ${levelChips(S.level, '__setLevel')}
    <div class="home-banners">
      <div class="card drill-banner" onclick="window.__nav('vocab-list')">📋 <strong>词汇</strong> <span class="muted small">· ${t('vocabList')}</span><span class="grow"></span>›</div>
      <div class="card drill-banner" onclick="window.__nav('hanzi')">✍️ <strong>汉字</strong> <span class="muted small">· ${t('hanzi')}</span><span class="grow"></span>›</div>
      <div class="card drill-banner" onclick="window.__nav('pron')">🗣️ <strong>发音</strong> <span class="muted small">· ${t('pronunciation')}</span><span class="grow"></span>›</div>
      <div class="card drill-banner" onclick="window.__nav('pinyin-chart')">🔤 <strong>拼音</strong> <span class="muted small">· ${t('sylChart')}</span><span class="grow"></span>›</div>
      <div class="card drill-banner" onclick="window.__nav('drills')">🎯 <strong>语法练习</strong> <span class="muted small">· ${t('grammarPractice')}</span><span class="grow"></span>›</div>
    </div>

    <div class="lesson-tree">
      ${units.map((u, i) => {
        const num = i + 1;
        const done = isUnitDone(S.level, num);
        const unlocked = isUnitUnlocked(S.level, num);
        const status = done ? 'done' : unlocked ? 'current' : 'locked';
        return `<div class="lesson-node" onclick="${unlocked ? `window.__startUnit(${num})` : ''}">
          <div class="lesson-circle ${status}">${done ? icon('check', 20, '#fff') : num}</div>
          <div class="grow">
            <div style="font-weight:600;font-size:15px">${u.title[S.lang] || u.title.en}</div>
            <div class="muted small">${u.desc[S.lang] || u.desc.en}</div>
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
