// Language-specific settings for the shared app code.
export const CFG = {
  id: 'arabe',
  appTitle: 'عربي',
  hello: 'مَرْحَبًا',
  langKey: 'arabic',
  charBadge: 'ح',
  // Badges of the home progress rows: vocabulary, grammar, readings, letters
  progBadges: ['ك', 'ق', 'ن', 'ح'],
  // Home tools menu: [badge, i18n title key, i18n subtitle key, view]
  tools: [
    ['ن', 'texts', 'textsSub', 'texts'],
    ['ب', 'cardsNav', 'cardsSub', 'review'],
    ['ك', 'vocabList', 'vocabListSub', 'vocab-list'],
    ['ح', 'hanzi', 'hanziSub', 'hanzi'],
    ['ص', 'conjNav', 'conjSub', 'conj'],
    ['ق', 'reference', 'grammarRefSub', 'reference'],
  ],
};
