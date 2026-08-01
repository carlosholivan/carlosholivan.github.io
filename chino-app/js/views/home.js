import { S, isUnitDone, isUnitUnlocked } from '../state.js';
import { register, go } from '../router.js';
import { loadUnits } from '../data.js';
import { bottomNav, header, progressBar, streakBadge } from '../ui/components.js';
import { icon } from '../ui/icons.js';

register('home', async (el) => {
  const units = await loadUnits(S.level);
  const totalDone = units.filter((_, i) => isUnitDone(S.level, i + 1)).length;
  const pct = Math.round((totalDone / units.length) * 100);

  el.innerHTML = `<div class="fade">
    ${header('中文 Chino')}
    <div class="card" style="padding:20px;margin-bottom:20px">
      <div class="flex items-center justify-between mb-8">
        <div>
          <div class="h2">${S.level.toUpperCase()}</div>
          <div class="muted small">${totalDone}/${units.length} lecciones</div>
        </div>
        <div style="text-align:right">
          ${streakBadge()}
          <div class="muted small mt-8">${S.xp} XP</div>
        </div>
      </div>
      ${progressBar(pct)}
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
            <div style="font-weight:600;font-size:15px">${u.title}</div>
            <div class="muted small">${u.desc}</div>
          </div>
          ${!unlocked ? icon('lock', 18, 'var(--ink2)') : ''}
        </div>`;
      }).join('')}
    </div>
  </div>
  ${bottomNav('home')}`;
});

window.__startUnit = (num) => {
  go('lesson', { level: S.level, unit: num });
};
