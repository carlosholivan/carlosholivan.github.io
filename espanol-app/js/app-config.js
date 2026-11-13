// Language-specific settings for the shared app code (each sibling app has its own copy of this file).
export const CFG = {
  id: 'espanol',
  appTitle: 'Español',
  hello: '¡Hola!',
  langKey: 'spanish',
  charBadge: 'ñ',
  // Badges of the home progress rows: vocabulary, grammar, readings
  progBadges: ['V', 'G', 'L', 'ñ'],
  // Home tools menu: [badge, i18n title key, i18n subtitle key, view]
  tools: [
    ['L', 'texts', 'textsSub', 'texts'],
    ['T', 'cardsNav', 'cardsSub', 'review'],
    ['V', 'vocabList', 'vocabListSub', 'vocab-list'],
    ['G', 'grammarPractice', 'drillsSub', 'drills'],
    ['C', 'conjNav', 'conjSub', 'conj'],
    ['R', 'reference', 'grammarRefSub', 'reference'],
  ],
};
