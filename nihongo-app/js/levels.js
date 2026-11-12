export const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];
// i18n keys for the level names
export const LEVEL_NAME = { n5: 'lvName1', n4: 'lvName2', n3: 'lvName3', n2: 'lvName4', n1: 'lvName5' };

export function levelLabel(l) {
  return l ? 'N' + String(l).slice(1) : '';
}

export function levelChips(current, handler) {
  return `<div class="flex gap-8 mb-16 level-chips">${LEVELS.map(l =>
    `<button class="chip ${current === l ? 'on' : ''}" onclick="window.${handler}('${l}')">${levelLabel(l)}</button>`).join('')}</div>`;
}
