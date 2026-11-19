// Small banner shown at the top of every language app to jump to another language or to the hub.
// It only links between apps: each app keeps its own index.html, data and progress.
(function () {
  const APPS = [
    { id: 'english', path: 'english-app', glyph: 'En', name: 'Inglés' },
    { id: 'francais', path: 'francais-app', glyph: 'Fr', name: 'Francés' },
    { id: 'nihongo', path: 'nihongo-app', glyph: '日', name: 'Japonés' },
    { id: 'chino', path: 'chino-app', glyph: '中', name: 'Chino' },
    { id: 'arabic', path: 'arabic-app', glyph: 'ع', name: 'Árabe' },
    { id: 'espanol', path: 'espanol-app', glyph: 'Es', name: 'Español' },
  ];
  const here = APPS.find(a => location.pathname.includes('/' + a.path + '/'));
  if (!here || document.getElementById('lang-switch')) return;
  let chosen = null;
  try { chosen = JSON.parse(localStorage.getItem('idiomas_hub_langs') || 'null'); } catch (e) {}
  const list = APPS.filter(a => a === here || !chosen || !chosen.length || chosen.includes(a.id));

  const css = document.createElement('style');
  css.textContent = `
    #lang-switch { max-width: 440px; margin: 0 auto; padding: 10px 20px 0; display: flex; align-items: center; gap: 6px;
      overflow-x: auto; scrollbar-width: none; font: 600 13px -apple-system, system-ui, sans-serif }
    #lang-switch::-webkit-scrollbar { display: none }
    #lang-switch a { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px;
      text-decoration: none; color: var(--ink2, #6b6358); background: var(--soft, #f3ede4); border: 1px solid transparent; white-space: nowrap }
    #lang-switch a.on { color: var(--accent2, #876535); border-color: var(--accent, #9c7842); background: transparent }
    #lang-switch a .g { font-family: 'Hiragino Mincho ProN', 'Songti SC', Georgia, serif; font-size: 14px; color: var(--accent2, #876535) }
    #lang-switch .all { margin-left: auto }`;
  document.head.appendChild(css);

  const bar = document.createElement('nav');
  bar.id = 'lang-switch';
  bar.setAttribute('aria-label', 'Cambiar de idioma');
  bar.innerHTML = list.map(a => `<a href="../${a.path}/" class="${a === here ? 'on' : ''}" ${a === here ? 'aria-current="page"' : ''}><span class="g">${a.glyph}</span>${a.name}</a>`).join('')
    + `<a class="all" href="../idiomas/" title="Todos los idiomas">🌐 Todos</a>`;
  const app = document.getElementById('app');
  (app ? app.parentNode : document.body).insertBefore(bar, app || document.body.firstChild);
  const on = bar.querySelector('.on');
  if (on && on.offsetLeft + on.offsetWidth > bar.clientWidth) bar.scrollLeft = on.offsetLeft - 20;
})();
