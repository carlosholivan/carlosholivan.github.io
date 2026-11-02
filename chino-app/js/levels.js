export const LEVELS = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6', 'hsk7'];
// i18n keys for the level names
export const LEVEL_NAME = { hsk1: 'lvName1', hsk2: 'lvName2', hsk3: 'lvName3', hsk4: 'lvName4', hsk5: 'lvName5', hsk6: 'lvName6', hsk7: 'lvName7' };

export function levelLabel(l) {
  return l === 'hsk7' ? 'HSK 7–9' : 'HSK ' + l.slice(3);
}

export function levelChips(current, handler) {
  return `<div class="flex gap-8 mb-16 level-chips">${LEVELS.map(l =>
    `<button class="chip ${current === l ? 'on' : ''}" onclick="window.${handler}('${l}')">${levelLabel(l)}</button>`).join('')}</div>`;
}
