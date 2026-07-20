import { icon } from './icons.js';
import { S } from '../state.js';
import { t } from '../i18n.js';

export function bottomNav(active) {
  const items = [
    { id: 'home', icon: 'home', label: t('home') },
    { id: 'reference', icon: 'book', label: t('reference') },
    { id: 'review', icon: 'star', label: t('review') },
    { id: 'progress', icon: 'chart', label: t('progress') },
    { id: 'settings', icon: 'gear', label: t('settings') },
  ];
  return `<nav class="bottomnav">${items.map(it => `
    <button class="navitem ${active === it.id ? 'on' : ''}" onclick="window.__nav('${it.id}')">
      ${icon(it.icon, 22, active === it.id ? 'var(--accent)' : 'var(--ink2)')}
      <span>${it.label}</span>
    </button>`).join('')}</nav>`;
}

export function progressBar(pct) {
  return `<div class="progbar"><div class="progfill" style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>`;
}

export function streakBadge() {
  if (!S.streak) return '';
  return `<span class="streak">${icon('flame', 14, '#fff')} ${S.streak}</span>`;
}

export function header(title, showBack = false) {
  const backBtn = showBack ? `<button onclick="window.__back()" style="padding:8px">${icon('back', 20, 'var(--ink)')}</button>` : '';
  return `<div class="flex items-center justify-between" style="padding:16px 0 12px">
    <div class="flex items-center gap-12">${backBtn}<span class="h3">${title}</span></div>
    ${streakBadge()}
  </div>`;
}
