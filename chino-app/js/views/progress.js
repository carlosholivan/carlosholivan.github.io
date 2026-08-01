import { S, isUnitDone } from '../state.js';
import { register } from '../router.js';
import { loadUnits } from '../data.js';
import { bottomNav, header, progressBar } from '../ui/components.js';

register('progress', async (el) => {
  const units = await loadUnits(S.level);
  const done = units.filter((_, i) => isUnitDone(S.level, i + 1)).length;
  const total = units.length;
  const pct = Math.round((done / total) * 100);

  const vocabEntries = Object.entries(S.vocab);
  const totalWords = vocabEntries.length;
  const mastered = vocabEntries.filter(([, v]) => v.interval >= 8).length;

  el.innerHTML = `<div class="fade">
    ${header('Progreso')}
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-8">Lecciones</div>
      <div class="flex items-center justify-between mb-8">
        <span class="muted">${done} de ${total} completadas</span>
        <span style="font-weight:600">${pct}%</span>
      </div>
      ${progressBar(pct)}
    </div>
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-8">Vocabulario</div>
      <div class="flex items-center justify-between mb-8">
        <span class="muted">${totalWords} palabras vistas</span>
        <span style="font-weight:600">${mastered} dominadas</span>
      </div>
      ${progressBar(totalWords ? Math.round((mastered / totalWords) * 100) : 0)}
    </div>
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-8">Estadísticas</div>
      <div class="flex items-center justify-between mb-8">
        <span class="muted">XP total</span><span style="font-weight:600">${S.xp}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="muted">Racha</span><span style="font-weight:600">🔥 ${S.streak || 0} días</span>
      </div>
    </div>
  </div>
  ${bottomNav('progress')}`;
});
