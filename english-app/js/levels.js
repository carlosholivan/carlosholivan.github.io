export const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
// i18n keys for the level names
export const LEVEL_NAME = { a1: 'lvName1', a2: 'lvName2', b1: 'lvName3', b2: 'lvName4', c1: 'lvName5', c2: 'lvName6' };

export function levelLabel(l) {
  return l ? String(l).toUpperCase() : '';
}

export function levelChips(current, handler) {
  return `<div class="flex gap-8 mb-16 level-chips">${LEVELS.map(l =>
    `<button class="chip ${current === l ? 'on' : ''}" onclick="window.${handler}('${l}')">${levelLabel(l)}</button>`).join('')}</div>`;
}
