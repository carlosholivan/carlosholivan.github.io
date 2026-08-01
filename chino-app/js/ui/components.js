import { S } from '../state.js';
import { icon } from './icons.js';

export function header(title) {
  return `<div class="flex items-center justify-between" style="padding:16px 0 12px">
    <div class="h1">${title}</div>
  </div>`;
}

export function progressBar(pct) {
  return `<div class="progbar"><div class="progfill" style="width:${pct}%"></div></div>`;
}

export function streakBadge() {
  if (!S.streak) return '';
  return `<span class="streak">🔥 ${S.streak}</span>`;
}

export function bottomNav(active) {
  const items = [
    { id: 'home', label: 'Inicio', icon: 'home' },
    { id: 'progress', label: 'Progreso', icon: 'chart' },
    { id: 'settings', label: 'Ajustes', icon: 'gear' },
  ];
  return `<nav class="bottomnav">${items.map(it =>
    `<div class="navitem ${active === it.id ? 'on' : ''}" onclick="window.__nav('${it.id}')">
      ${icon(it.icon, 24, active === it.id ? 'var(--accent)' : 'var(--ink2)')}
      <span>${it.label}</span>
    </div>`
  ).join('')}</nav>`;
}
