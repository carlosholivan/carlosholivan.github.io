import { S } from './state.js';

const T = {
  // Navigation
  home:       { en: 'Home', zh: '首页', ja: 'ホーム' },
  review:     { en: 'Review', zh: '复习', ja: '復習' },
  progress:   { en: 'Progress', zh: '进度', ja: '進捗' },
  settings:   { en: 'Settings', zh: '设置', ja: '設定' },

  // Home
  lessons:    { en: 'lessons', zh: '课', ja: 'レッスン' },
  spanish:    { en: 'Spanish', zh: '西班牙语', ja: 'スペイン語' },

  // Lesson
  continue:   { en: 'Continue', zh: '继续', ja: '続ける' },
  check:      { en: 'Check', zh: '检查', ja: '確認' },
  correct:    { en: 'Correct!', zh: '正确！', ja: '正解！' },
  incorrect:  { en: 'Incorrect', zh: '不正确', ja: '不正解' },
  answer:     { en: 'Answer', zh: '答案', ja: '答え' },
  quit:       { en: 'Quit', zh: '退出', ja: '終了' },
  noLives:    { en: 'No lives left — restarting', zh: '没有生命了——重新开始', ja: 'ライフ切れ — リスタート' },
  completed:  { en: 'Lesson completed!', zh: '课程完成！', ja: 'レッスン完了！' },
  xpEarned:   { en: 'XP earned', zh: '获得经验', ja: '獲得XP' },
  correctCount: { en: 'correct', zh: '正确', ja: '正解' },

  // Review
  allDone:    { en: 'All caught up!', zh: '全部完成！', ja: '全部完了！' },
  noDue:      { en: 'No words due for review.', zh: '没有需要复习的单词。', ja: '復習が必要な単語はありません。' },
  keepLearn:  { en: 'Keep learning', zh: '继续学习', ja: '学習を続ける' },
  iKnow:      { en: 'I know it', zh: '我知道', ja: '知ってる' },
  dontKnow:   { en: "Don't know", zh: '不知道', ja: '知らない' },
  reviewDone: { en: 'Review complete', zh: '复习完成', ja: '復習完了' },
  remembered: { en: 'remembered', zh: '记住了', ja: '覚えた' },
  goBack:     { en: 'Go back', zh: '返回', ja: '戻る' },

  // Progress
  stats:      { en: 'Statistics', zh: '统计', ja: '統計' },
  totalXp:    { en: 'Total XP', zh: '总经验', ja: '合計XP' },
  streak:     { en: 'Streak', zh: '连续', ja: '連続' },
  wordsSeen:  { en: 'Words seen', zh: '已见单词', ja: '学習済み単語' },
  mastered:   { en: 'Mastered', zh: '已掌握', ja: 'マスター済み' },
  beginner:   { en: 'Beginner', zh: '初学者', ja: '初級' },
  elementary: { en: 'Elementary', zh: '基础', ja: '初中級' },

  // Settings
  sourceLang: { en: 'Your language', zh: '你的语言', ja: 'あなたの言語' },
  appearance: { en: 'Appearance', zh: '外观', ja: '外観' },
  darkMode:   { en: 'Dark mode', zh: '深色模式', ja: 'ダークモード' },
  sound:      { en: 'Sound', zh: '声音', ja: '音声' },
  soundFx:    { en: 'Sound effects', zh: '音效', ja: '効果音' },
  data:       { en: 'Data', zh: '数据', ja: 'データ' },
  resetAll:   { en: 'Reset all progress', zh: '重置所有进度', ja: '全進捗をリセット' },
  confirmReset: { en: 'Delete all progress? This cannot be undone.', zh: '删除所有进度？此操作不可撤销。', ja: '全進捗を削除しますか？元に戻せません。' },

  // Exercises
  writeSpanish: { en: 'Write in Spanish...', zh: '用西班牙语写……', ja: 'スペイン語で書いて……' },
  connectPairs: { en: 'Connect the pairs', zh: '连接配对', ja: 'ペアを繋げて' },

  // Daily review
  dailyReview:  { en: 'Daily Review', zh: '每日复习', ja: '毎日の復習' },
  tapToReveal:  { en: 'Tap to reveal meaning', zh: '点击显示意思', ja: 'タップして意味を表示' },
  forgot:       { en: 'Forgot', zh: '忘了', ja: '忘れた' },
  remembered:   { en: 'Remembered', zh: '记住了', ja: '覚えた' },
  ghostWords:   { en: 'Ghost words recovered', zh: '遗忘词汇恢复', ja: '忘却単語の回復' },
  startLearning:{ en: 'Start learning', zh: '开始学习', ja: '学習を始める' },
  reviewFirst:  { en: 'You have words to review!', zh: '你有单词需要复习！', ja: '復習が必要な単語があります！' },
  skipReview:   { en: 'Skip', zh: '跳过', ja: 'スキップ' },
  doReview:     { en: 'Review now', zh: '现在复习', ja: '今すぐ復習' },

  // Grammar explanations header
  grammarTip: { en: 'Grammar tip', zh: '语法提示', ja: '文法ヒント' },

  // Reference
  reference:  { en: 'Reference', zh: '参考', ja: '参考' },
  grammar:    { en: 'Grammar', zh: '语法', ja: '文法' },
  vocabulary: { en: 'Vocabulary', zh: '词汇', ja: '語彙' },
  conjugation:{ en: 'Conjugation', zh: '动词变位', ja: '動詞活用' },
  words:      { en: 'words', zh: '个单词', ja: '単語' },
  explanation:{ en: 'Explanation', zh: '说明', ja: '説明' },
  examples:   { en: 'Examples', zh: '例句', ja: '例文' },
  present:    { en: 'Present', zh: '现在时', ja: '現在形' },
  preterite:  { en: 'Preterite', zh: '过去时', ja: '点過去' },
  master:     { en: 'Master', zh: '掌握', ja: 'マスター' },
  intermediate2: { en: 'Learning', zh: '学习中', ja: '学習中' },
  beginner2:  { en: 'New', zh: '初学', ja: '初級' },
  ghost:      { en: 'Ghost', zh: '遗忘', ja: '忘却' },

  // Auth
  login:        { en: 'Log in', zh: '登录', ja: 'ログイン' },
  createAccount:{ en: 'Create account', zh: '创建账号', ja: 'アカウント作成' },
  loginSubtitle:{ en: 'Sign in to sync your progress', zh: '登录以同步你的进度', ja: 'ログインして進捗を同期' },
  registerSubtitle: { en: 'Create an account to save progress', zh: '创建账号以保存进度', ja: 'アカウント作成で進捗を保存' },
  email:        { en: 'Email', zh: '邮箱', ja: 'メール' },
  password:     { en: 'Password', zh: '密码', ja: 'パスワード' },
  forgotPassword: { en: 'Forgot password?', zh: '忘记密码？', ja: 'パスワードを忘れた？' },
  noAccount:    { en: "Don't have an account?", zh: '没有账号？', ja: 'アカウントがない？' },
  hasAccount:   { en: 'Already have an account?', zh: '已有账号？', ja: 'アカウントをお持ちですか？' },
  continueWithout: { en: 'Continue without account', zh: '不登录继续', ja: 'アカウントなしで続ける' },
  fillFields:   { en: 'Please fill in all fields', zh: '请填写所有字段', ja: 'すべてのフィールドを入力してください' },
  passwordMin:  { en: 'Password must be at least 6 characters', zh: '密码至少6个字符', ja: 'パスワードは6文字以上' },
  emailInUse:   { en: 'Email already in use', zh: '邮箱已被使用', ja: 'このメールは既に使用されています' },
  invalidEmail: { en: 'Invalid email address', zh: '邮箱格式不正确', ja: '無効なメールアドレス' },
  weakPassword: { en: 'Password too weak', zh: '密码太弱', ja: 'パスワードが弱すぎます' },
  userNotFound: { en: 'Account not found', zh: '找不到账号', ja: 'アカウントが見つかりません' },
  wrongPassword:{ en: 'Wrong email or password', zh: '邮箱或密码错误', ja: 'メールまたはパスワードが違います' },
  tooManyRequests: { en: 'Too many attempts, try later', zh: '尝试次数过多，请稍后再试', ja: '試行回数が多すぎます。後でお試しください' },
  enterEmail:   { en: 'Enter your email first', zh: '请先输入邮箱', ja: 'まずメールを入力してください' },
  resetSent:    { en: 'Password reset email sent!', zh: '密码重置邮件已发送！', ja: 'パスワードリセットメール送信済み！' },
  logout:       { en: 'Log out', zh: '退出登录', ja: 'ログアウト' },
  loggedInAs:   { en: 'Logged in as', zh: '已登录为', ja: 'ログイン中：' },
  account:      { en: 'Account', zh: '账号', ja: 'アカウント' },
  synced:       { en: 'Progress synced to cloud', zh: '进度已同步到云端', ja: '進捗はクラウドに同期済み' },
};

export function t(key) {
  const entry = T[key];
  if (!entry) return key;
  return entry[S.lang] || entry.en;
}
