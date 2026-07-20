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
  views[currentView.name](app, currentView.params);
}

export function getApp() {
  return app;
}
