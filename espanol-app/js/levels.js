export const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'];
// i18n keys for the level names
export const LEVEL_NAME = { a1: 'beginner', a2: 'elementary', b1: 'intermediate', b2: 'upperIntermediate', c1: 'advanced' };

export function levelChips(current, handler) {
  return `<div class="flex gap-8 mb-16 level-chips">${LEVELS.map(l =>
    `<button class="chip ${current === l ? 'on' : ''}" onclick="window.${handler}('${l}')">${l.toUpperCase()}</button>`).join('')}</div>`;
}
