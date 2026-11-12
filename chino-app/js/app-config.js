// Language-specific settings for the shared app code (the Japanese app has its own copy of this file).
export const CFG = {
  id: 'chino',
  appTitle: '中文',
  hello: '你好',
  langKey: 'chinese',
  charBadge: '字',
  // Badges of the home progress rows: vocabulary, grammar, readings, characters
  progBadges: ['词', '文', '读', '字'],
  // Home tools menu: [badge, i18n title key, i18n subtitle key, view]
  tools: [
    ['课', 'texts', 'textsSub', 'texts'],
    ['卡', 'cardsNav', 'cardsSub', 'review'],
    ['词', 'vocabList', 'vocabListSub', 'vocab-list'],
    ['字', 'hanzi', 'hanziSub', 'hanzi'],
    ['练', 'grammarPractice', 'drillsSub', 'drills'],
    ['音', 'pronunciation', 'pronSub', 'pron'],
    ['拼', 'sylChart', 'pinyinSub', 'pinyin-chart'],
  ],
};
