let currentView = null;
let viewStack = [];
const app = document.getElementById('app');

const views = {};

export function register(name, renderFn) {
  views[name] = renderFn;
}

export function go(name, params = {}) {
  if (currentView) viewStack.push(currentView);
  currentView = { name, params };
  render();
}

export function back() {
  if (viewStack.length > 0) {
    currentView = viewStack.pop();
    render();
  }
}

export function render() {
  if (!currentView || !views[currentView.name]) return;
  app.innerHTML = '';
  // Async views that fail would otherwise leave a blank page.
  let r;
  try { r = views[currentView.name](app, currentView.params); } catch (e) { r = Promise.reject(e); }
  Promise.resolve(r).catch(e => {
    console.error(e);
    const msg = String(e && e.message || e).replace(/[<>&]/g, '');
    app.innerHTML = `<div class="card" style="padding:20px;margin-top:24px"><b>Error</b>
      <pre style="white-space:pre-wrap;font-size:12px">${msg}</pre>
      <button class="btn mt-12" onclick="window.__nav('home')">Inicio / Home</button></div>`;
  });
}

export function getApp() {
  return app;
}
