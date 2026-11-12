// Language-specific settings for the shared app code (the Chinese app has its own copy of this file).
export const CFG = {
  id: 'nihongo',
  appTitle: '日本語',
  hello: 'こんにちは',
  langKey: 'chinese',
  charBadge: '漢',
  // Home tools menu: [badge, i18n title key, i18n subtitle key, view]
  tools: [
    ['読', 'texts', 'textsSub', 'texts'],
    ['札', 'cardsNav', 'cardsSub', 'review'],
    ['語', 'vocabList', 'vocabListSub', 'vocab-list'],
    ['漢', 'hanzi', 'hanziSub', 'hanzi'],
    ['文', 'reference', 'grammarRefSub', 'reference'],
  ],
};
