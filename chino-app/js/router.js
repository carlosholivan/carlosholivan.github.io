const views = {};
let currentView = null;
let appEl = null;

export function register(name, fn) {
  views[name] = fn;
}

export function go(name, params = {}) {
  currentView = name;
  if (!appEl) appEl = document.getElementById('app');
  appEl.innerHTML = '';
  if (views[name]) views[name](appEl, params);
}

window.__nav = (name) => go(name);
