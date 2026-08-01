import { S, save, reset } from '../state.js';
import { register, go } from '../router.js';
import { bottomNav, header } from '../ui/components.js';

register('settings', async (el) => {
  const dark = S.dark;

  el.innerHTML = `<div class="fade">
    ${header('Ajustes')}
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="flex items-center justify-between">
        <div>
          <div style="font-weight:600">Modo oscuro</div>
          <div class="muted small">Cambia la apariencia</div>
        </div>
        <div class="toggle ${dark ? 'on' : ''}" id="dark-toggle"></div>
      </div>
    </div>
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:8px">Reiniciar progreso</div>
      <div class="muted small mb-12">Esto borrará todo tu progreso</div>
      <button class="btn" style="background:var(--no)" onclick="window.__resetProgress()">Reiniciar</button>
    </div>
  </div>
  ${bottomNav('settings')}`;

  document.getElementById('dark-toggle').addEventListener('click', (e) => {
    S.dark = !S.dark;
    save(S);
    e.currentTarget.classList.toggle('on', S.dark);
    document.body.classList.toggle('dark', S.dark);
  });
});

window.__resetProgress = () => {
  if (confirm('¿Seguro que quieres reiniciar todo tu progreso?')) {
    reset();
    go('home');
  }
};
