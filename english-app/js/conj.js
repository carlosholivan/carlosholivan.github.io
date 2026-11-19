// English verb forms: base form, past simple, past participle and every tense built with them.
// Same API as the Spanish app's conj.js (VERBS, PERSONS, IMP_PERSONS, TENSES, conjugate, participle, gerund),
// so the shared views (verbs page, reader popups, Reference) work unchanged.
//   past / pp: irregular forms (alternatives after "/": learnt/learned)   dbl: doubles the last consonant (stop → stopped, stopping)

export const PERSONS = [
  { id: 0, en: 'I', es: 'yo', ja: '私', zh: '我' },
  { id: 1, en: 'you', es: 'tú / usted', ja: 'あなた', zh: '你' },
  { id: 2, en: 'he / she / it', es: 'él / ella / ello', ja: '彼・彼女・それ', zh: '他／她／它' },
  { id: 3, en: 'we', es: 'nosotros', ja: '私たち', zh: '我们' },
  { id: 4, en: 'you (plural)', es: 'vosotros / ustedes', ja: 'あなたたち', zh: '你们' },
  { id: 5, en: 'they', es: 'ellos / ellas', ja: '彼ら', zh: '他们' },
];
// Imperative: you (one or more people) and let's.
export const IMP_PERSONS = [
  { id: 1, en: 'you', es: 'tú / vosotros / usted(es)', ja: 'あなた（たち）', zh: '你（们）' },
  { id: 3, en: "let's", es: 'nosotros (vamos a…)', ja: '〜しよう', zh: '我们（让我们…）' },
];

const T = (id, en, es, ja, zh, note) => ({ id, en, es, ja, zh, note });
export const TENSES = [
  T('pres', 'Present simple', 'Presente simple', '現在形', '一般现在时',
    { es: 'Hábitos, rutinas, hechos y horarios. Ojo a la -s de la 3.ª persona: she works. Preguntas y negativas con do/does.', ja: '習慣・事実・時刻表。3人称単数の -s に注意（she works）。疑問文・否定文は do/does。', zh: '习惯、事实和时间表。注意第三人称单数加 -s（she works）。疑问句和否定句用 do/does。' }),
  T('prog', 'Present continuous', 'Presente continuo', '現在進行形', '现在进行时',
    { es: 'am/is/are + -ing. Lo que pasa ahora o en esta época, y planes ya organizados (I\'m meeting Ana tomorrow).', ja: 'am/is/are＋-ing。今起きていること、この時期のこと、決まった予定（I\'m meeting Ana tomorrow）。', zh: 'am/is/are + -ing。表示此刻或这段时间正在发生的事，以及已安排好的计划（I\'m meeting Ana tomorrow）。' }),
  T('past', 'Past simple', 'Pasado simple', '過去形', '一般过去时',
    { es: 'Acciones terminadas en un momento terminado (yesterday, in 2019, two days ago). Regulares en -ed; las irregulares hay que aprenderlas.', ja: '終わった時点で完了した出来事（yesterday, in 2019, ago）。規則動詞は -ed、不規則動詞は覚える。', zh: '在已结束的时间完成的动作（yesterday, in 2019, ago）。规则动词加 -ed，不规则动词要记。' }),
  T('pastprog', 'Past continuous', 'Pasado continuo', '過去進行形', '过去进行时',
    { es: 'was/were + -ing. Acción en curso en un momento del pasado; el fondo de una historia (I was cooking when you called).', ja: 'was/were＋-ing。過去のある時点で進行中だった動作、物語の背景（I was cooking when you called）。', zh: 'was/were + -ing。过去某一时刻正在进行的动作，故事的背景（I was cooking when you called）。' }),
  T('perf', 'Present perfect', 'Present perfect', '現在完了', '现在完成时',
    { es: 'have/has + participio. Experiencias (ever, never), resultados presentes (I\'ve lost my keys) y periodos que llegan hasta ahora (for, since). No con momentos terminados: ✗ I have seen him yesterday.', ja: 'have/has＋過去分詞。経験（ever, never）、現在への結果、今まで続く期間（for, since）。終わった時点とは使えない：✗ I have seen him yesterday。', zh: 'have/has + 过去分词。经历（ever, never）、对现在的结果、持续到现在（for, since）。不能和已结束的时间连用：✗ I have seen him yesterday。' }),
  T('perfprog', 'Present perfect continuous', 'Present perfect continuo', '現在完了進行形', '现在完成进行时',
    { es: 'have/has been + -ing. Actividad que empezó en el pasado y sigue o acaba de parar, con énfasis en la duración (I\'ve been waiting for an hour).', ja: 'have/has been＋-ing。過去に始まり今も続く（または直前まで続いた）動作、継続時間を強調（I\'ve been waiting for an hour）。', zh: 'have/has been + -ing。从过去开始一直持续到现在（或刚停止）的动作，强调持续时间（I\'ve been waiting for an hour）。' }),
  T('plup', 'Past perfect', 'Pasado perfecto', '過去完了', '过去完成时',
    { es: 'had + participio. El pasado del pasado: When I arrived, the film had started.', ja: 'had＋過去分詞。過去のさらに前：When I arrived, the film had started。', zh: 'had + 过去分词。过去的过去：When I arrived, the film had started。' }),
  T('will', 'Future with will', 'Futuro con will', 'will の未来', 'will 将来时',
    { es: 'Predicciones, decisiones en el momento, promesas y ofrecimientos (I\'ll help you).', ja: '予測、その場の決定、約束、申し出（I\'ll help you）。', zh: '预测、当场决定、承诺和提议（I\'ll help you）。' }),
  T('goingto', 'Future with going to', 'Futuro con going to', 'be going to の未来', 'be going to 将来时',
    { es: 'Planes e intenciones ya decididos, y predicciones con pruebas (Look at the sky: it\'s going to rain).', ja: '既に決めた予定・意図、根拠のある予測（Look at the sky: it\'s going to rain）。', zh: '已决定的计划和打算，以及有迹象的预测（Look at the sky: it\'s going to rain）。' }),
  T('cond', 'Conditional (would)', 'Condicional (would)', '仮定（would）', '条件式（would）',
    { es: 'Situaciones imaginarias y peticiones educadas: I would travel more if I had time. Would you like…?', ja: '仮定の状況や丁寧な依頼：I would travel more if I had time. Would you like…?', zh: '假设的情况和礼貌的请求：I would travel more if I had time. Would you like…?' }),
  T('condperf', 'Conditional perfect', 'Condicional perfecto', '仮定法過去完了（would have）', '过去条件式（would have）',
    { es: 'would have + participio. Pasado imaginario: If I had known, I would have come.', ja: 'would have＋過去分詞。過去の仮定：If I had known, I would have come。', zh: 'would have + 过去分词。与过去事实相反：If I had known, I would have come。' }),
  T('imp', 'Imperative', 'Imperativo', '命令形', '祈使句',
    { es: 'La forma base, sin sujeto: Sit down. Negativo con don\'t: Don\'t touch it. Para incluirte: Let\'s go.', ja: '主語なしの原形：Sit down。否定は don\'t：Don\'t touch it。自分も含めるときは Let\'s go。', zh: '用动词原形，不带主语：Sit down。否定用 don\'t：Don\'t touch it。包括自己时用 Let\'s go。' }),
];

const V = (w, es, ja, zh, group, x = {}) => ({ w, es, ja, zh, group, ...x });
const I = (w, past, pp, es, ja, zh, x = {}) => V(w, es, ja, zh, past === w && pp === w ? 'aaa' : past === pp ? 'abb' : 'abc', { past, pp, ...x });
export const VERBS = [
  // Regular
  V('work', 'trabajar', '働く', '工作', 'reg'),
  V('play', 'jugar; tocar', '遊ぶ・演奏する', '玩；演奏', 'reg'),
  V('live', 'vivir', '住む', '住；生活', 'reg'),
  V('study', 'estudiar', '勉強する', '学习', 'reg'),
  V('stop', 'parar', '止まる・やめる', '停止', 'reg', { dbl: 1 }),
  V('watch', 'mirar, ver', '見る', '看', 'reg'),
  V('try', 'intentar; probar', '試す', '尝试', 'reg'),
  V('travel', 'viajar', '旅行する', '旅行', 'reg', { dbl: 1 }),
  V('plan', 'planear', '計画する', '计划', 'reg', { dbl: 1 }),
  V('decide', 'decidir', '決める', '决定', 'reg'),
  V('want', 'querer', '欲しい・〜したい', '想要', 'reg'),
  V('listen', 'escuchar', '聞く', '听', 'reg'),
  V('prefer', 'preferir', '好む', '更喜欢', 'reg', { dbl: 1 }),
  V('cry', 'llorar', '泣く', '哭', 'reg'),
  V('enjoy', 'disfrutar', '楽しむ', '享受', 'reg'),
  V('open', 'abrir', '開ける', '打开', 'reg'),
  // Special
  V('be', 'ser, estar', 'である・いる', '是；在', 'irr', { past: 'was/were', pp: 'been' }),
  V('have', 'tener; haber', '持つ', '有', 'irr', { past: 'had', pp: 'had' }),
  V('do', 'hacer', 'する', '做', 'irr', { past: 'did', pp: 'done' }),
  V('go', 'ir', '行く', '去', 'irr', { past: 'went', pp: 'gone' }),
  // Same three forms
  I('cut', 'cut', 'cut', 'cortar', '切る', '切', { dbl: 1 }),
  I('put', 'put', 'put', 'poner', '置く', '放', { dbl: 1 }),
  I('let', 'let', 'let', 'dejar, permitir', '〜させる', '让', { dbl: 1 }),
  I('hit', 'hit', 'hit', 'golpear', '打つ', '打', { dbl: 1 }),
  I('cost', 'cost', 'cost', 'costar', '（費用が）かかる', '花费', {}),
  I('hurt', 'hurt', 'hurt', 'doler; hacer daño', '痛む・傷つける', '疼；伤害', {}),
  I('set', 'set', 'set', 'poner; fijar', '置く・設定する', '放置；设定', { dbl: 1 }),
  I('shut', 'shut', 'shut', 'cerrar', '閉める', '关上', { dbl: 1 }),
  I('read', 'read', 'read', 'leer', '読む', '读', {}),
  I('quit', 'quit', 'quit', 'dejar, abandonar', 'やめる', '放弃；辞职', { dbl: 1 }),
  I('spread', 'spread', 'spread', 'extender(se)', '広げる・広がる', '传播；展开', {}),
  I('bet', 'bet', 'bet', 'apostar', '賭ける', '打赌', { dbl: 1 }),
  I('burst', 'burst', 'burst', 'reventar', '破裂する', '爆裂', {}),
  I('broadcast', 'broadcast', 'broadcast', 'emitir', '放送する', '广播', {}),
  I('upset', 'upset', 'upset', 'disgustar', '動揺させる', '使不安', { dbl: 1 }),
  // Two forms the same
  I('buy', 'bought', 'bought', 'comprar', '買う', '买', {}),
  I('bring', 'brought', 'brought', 'traer', '持ってくる', '带来', {}),
  I('think', 'thought', 'thought', 'pensar', '思う・考える', '想；认为', {}),
  I('teach', 'taught', 'taught', 'enseñar', '教える', '教', {}),
  I('catch', 'caught', 'caught', 'coger, atrapar', '捕まえる', '抓住', {}),
  I('fight', 'fought', 'fought', 'luchar, pelear', '戦う', '打架；战斗', {}),
  I('seek', 'sought', 'sought', 'buscar', '求める', '寻求', {}),
  I('make', 'made', 'made', 'hacer, fabricar', '作る', '做；制造', {}),
  I('say', 'said', 'said', 'decir', '言う', '说', {}),
  I('pay', 'paid', 'paid', 'pagar', '払う', '付钱', {}),
  I('lay', 'laid', 'laid', 'poner, colocar', '横たえる・置く', '放置', {}),
  I('sell', 'sold', 'sold', 'vender', '売る', '卖', {}),
  I('tell', 'told', 'told', 'decir, contar', '話す・伝える', '告诉', {}),
  I('find', 'found', 'found', 'encontrar', '見つける', '找到', {}),
  I('have', 'had', 'had', 'tener', '持つ', '有', { hide: 1 }),
  I('hear', 'heard', 'heard', 'oír', '聞こえる', '听见', {}),
  I('hold', 'held', 'held', 'sostener; celebrar', '持つ・開催する', '拿着；举行', {}),
  I('keep', 'kept', 'kept', 'guardar; mantener', '保つ', '保持', {}),
  I('sleep', 'slept', 'slept', 'dormir', '眠る', '睡觉', {}),
  I('feel', 'felt', 'felt', 'sentir(se)', '感じる', '感觉', {}),
  I('meet', 'met', 'met', 'conocer; quedar con', '会う', '见面', {}),
  I('leave', 'left', 'left', 'salir de; dejar', '出発する・去る', '离开', {}),
  I('lend', 'lent', 'lent', 'prestar', '貸す', '借给', {}),
  I('send', 'sent', 'sent', 'enviar', '送る', '寄；发送', {}),
  I('spend', 'spent', 'spent', 'gastar; pasar (tiempo)', '費やす', '花费', {}),
  I('build', 'built', 'built', 'construir', '建てる', '建造', {}),
  I('lose', 'lost', 'lost', 'perder', '失う', '丢失；输', {}),
  I('mean', 'meant', 'meant', 'significar', '意味する', '意思是', {}),
  I('lead', 'led', 'led', 'guiar, dirigir', '導く', '带领', {}),
  I('feed', 'fed', 'fed', 'dar de comer', '食べ物を与える', '喂', {}),
  I('stand', 'stood', 'stood', 'estar de pie', '立つ', '站', {}),
  I('understand', 'understood', 'understood', 'entender', '理解する', '理解', {}),
  I('sit', 'sat', 'sat', 'sentarse', '座る', '坐', { dbl: 1 }),
  I('win', 'won', 'won', 'ganar', '勝つ', '赢', { dbl: 1 }),
  I('get', 'got', 'got', 'conseguir; llegar; ponerse', '得る・着く・なる', '得到；到达；变得', { dbl: 1, ppUS: 'gotten' }),
  I('shoot', 'shot', 'shot', 'disparar; rodar', '撃つ・撮影する', '射击；拍摄', {}),
  I('light', 'lit', 'lit', 'encender', '火をつける', '点燃', {}),
  I('stick', 'stuck', 'stuck', 'pegar', '貼る・くっつく', '粘贴', {}),
  I('hang', 'hung', 'hung', 'colgar', '掛ける', '挂', {}),
  I('dig', 'dug', 'dug', 'cavar', '掘る', '挖', { dbl: 1 }),
  I('swing', 'swung', 'swung', 'balancear(se)', '揺れる', '摆动', {}),
  I('bend', 'bent', 'bent', 'doblar', '曲げる', '弯曲', {}),
  I('learn', 'learnt/learned', 'learnt/learned', 'aprender', '学ぶ', '学习', {}),
  I('dream', 'dreamt/dreamed', 'dreamt/dreamed', 'soñar', '夢を見る', '做梦', {}),
  I('burn', 'burnt/burned', 'burnt/burned', 'quemar', '燃やす', '燃烧', {}),
  I('smell', 'smelt/smelled', 'smelt/smelled', 'oler', 'においがする', '闻；有气味', {}),
  I('spell', 'spelt/spelled', 'spelt/spelled', 'deletrear', 'つづる', '拼写', {}),
  I('spill', 'spilt/spilled', 'spilt/spilled', 'derramar', 'こぼす', '洒出', {}),
  I('lie', 'lay', 'lain', 'estar tumbado', '横になる', '躺', {}),
  // All three different
  I('begin', 'began', 'begun', 'empezar', '始める', '开始', { dbl: 1 }),
  I('drink', 'drank', 'drunk', 'beber', '飲む', '喝', {}),
  I('swim', 'swam', 'swum', 'nadar', '泳ぐ', '游泳', { dbl: 1 }),
  I('sing', 'sang', 'sung', 'cantar', '歌う', '唱歌', {}),
  I('ring', 'rang', 'rung', 'sonar; llamar', '鳴る・電話する', '响；打电话', {}),
  I('run', 'ran', 'run', 'correr', '走る', '跑', { dbl: 1 }),
  I('come', 'came', 'come', 'venir', '来る', '来', {}),
  I('become', 'became', 'become', 'llegar a ser, volverse', '〜になる', '成为', {}),
  I('see', 'saw', 'seen', 'ver', '見る', '看见', {}),
  I('eat', 'ate', 'eaten', 'comer', '食べる', '吃', {}),
  I('give', 'gave', 'given', 'dar', '与える', '给', {}),
  I('take', 'took', 'taken', 'tomar; llevar', '取る・持っていく', '拿；带走', {}),
  I('write', 'wrote', 'written', 'escribir', '書く', '写', {}),
  I('drive', 'drove', 'driven', 'conducir', '運転する', '开车', {}),
  I('ride', 'rode', 'ridden', 'montar', '乗る', '骑', {}),
  I('rise', 'rose', 'risen', 'subir, elevarse', '上がる', '升起', {}),
  I('speak', 'spoke', 'spoken', 'hablar', '話す', '说', {}),
  I('break', 'broke', 'broken', 'romper', '壊す', '打破；弄坏', {}),
  I('choose', 'chose', 'chosen', 'elegir', '選ぶ', '选择', {}),
  I('forget', 'forgot', 'forgotten', 'olvidar', '忘れる', '忘记', { dbl: 1 }),
  I('get up', 'got up', 'got up', 'levantarse', '起きる', '起床', { hide: 1 }),
  I('steal', 'stole', 'stolen', 'robar', '盗む', '偷', {}),
  I('wake', 'woke', 'woken', 'despertar(se)', '目を覚ます', '醒来', {}),
  I('wear', 'wore', 'worn', 'llevar puesto', '着ている', '穿；戴', {}),
  I('tear', 'tore', 'torn', 'rasgar', '破る', '撕', {}),
  I('know', 'knew', 'known', 'saber; conocer', '知っている', '知道；认识', {}),
  I('grow', 'grew', 'grown', 'crecer; cultivar', '育つ・育てる', '成长；种植', {}),
  I('throw', 'threw', 'thrown', 'lanzar, tirar', '投げる', '扔', {}),
  I('blow', 'blew', 'blown', 'soplar', '吹く', '吹', {}),
  I('draw', 'drew', 'drawn', 'dibujar', '描く', '画', {}),
  I('fly', 'flew', 'flown', 'volar', '飛ぶ', '飞', {}),
  I('show', 'showed', 'shown', 'mostrar', '見せる', '展示', {}),
  I('fall', 'fell', 'fallen', 'caer(se)', '落ちる', '落下；摔倒', {}),
  I('forgive', 'forgave', 'forgiven', 'perdonar', '許す', '原谅', {}),
  I('hide', 'hid', 'hidden', 'esconder(se)', '隠す・隠れる', '隐藏', {}),
  I('bite', 'bit', 'bitten', 'morder', '噛む', '咬', {}),
  I('shake', 'shook', 'shaken', 'sacudir; temblar', '振る・揺れる', '摇动', {}),
  I('freeze', 'froze', 'frozen', 'congelar(se)', '凍る', '冻结', {}),
  I('beat', 'beat', 'beaten', 'vencer; batir', '打ち負かす', '打败', {}),
  I('do', 'did', 'done', 'hacer', 'する', '做', { hide: 1 }),
  I('undertake', 'undertook', 'undertaken', 'emprender', '引き受ける', '承担', {}),
  I('withdraw', 'withdrew', 'withdrawn', 'retirar(se)', '引き出す・撤退する', '撤回；取款', {}),
  I('arise', 'arose', 'arisen', 'surgir', '生じる', '出现', {}),
  I('overcome', 'overcame', 'overcome', 'superar', '克服する', '克服', {}),
  I('sink', 'sank', 'sunk', 'hundir(se)', '沈む', '下沉', {}),
  I('shrink', 'shrank', 'shrunk', 'encoger(se)', '縮む', '缩小', {}),
  I('stink', 'stank', 'stunk', 'apestar', '悪臭を放つ', '发臭', {}),
  I('swear', 'swore', 'sworn', 'jurar; decir palabrotas', '誓う・ののしる', '发誓；骂人', {}),
  I('weave', 'wove', 'woven', 'tejer', '織る', '编织', {}),
  I('forbid', 'forbade', 'forbidden', 'prohibir', '禁じる', '禁止', { dbl: 1 }),
  I('bear', 'bore', 'borne', 'soportar', '耐える', '忍受', {}),
  I('seek', 'sought', 'sought', 'buscar', '求める', '寻求', { hide: 1 }),
].filter(v => !v.hide);

const vowel = c => /[aeiou]/.test(c);
// Third person singular: works, watches, studies, goes, has.
function third(w) {
  if (w === 'have') return 'has';
  if (w === 'be') return 'is';
  if (/(s|sh|ch|x|z|o)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}
export function gerund(v) {
  const w = v.w;
  if (/ie$/.test(w)) return w.slice(0, -2) + 'ying';
  if (/[^e]e$/.test(w) && w !== 'be' && !/(ee|ye|oe)$/.test(w)) return w.slice(0, -1) + 'ing';
  if (v.dbl) return w + w.slice(-1) + 'ing';
  return w + 'ing';
}
function regPast(v) {
  const w = v.w;
  if (/e$/.test(w)) return w + 'd';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ied';
  if (v.dbl) return w + w.slice(-1) + 'ed';
  return w + 'ed';
}
const first = s => String(s).split('/')[0];
export function pastOf(v) { return v.past || regPast(v); }
export function participle(v) { return v.pp || regPast(v); }

const BE_PRES = ['am', 'are', 'is', 'are', 'are', 'are'];
const BE_PAST = ['was', 'were', 'was', 'were', 'were', 'were'];
const HAVE = p => (p === 2 ? 'has' : 'have');
const SUBJ = ['I', 'you', 'he', 'we', 'you', 'they'];

// Forms are shown with the subject (I work, she works) because English verbs barely change on their own.
export function conjugate(v, t, p) {
  const s = SUBJ[p];
  const base = v.w, ing = gerund(v), pp = first(participle(v));
  switch (t) {
    case 'pres': return `${s} ${base === 'be' ? BE_PRES[p] : p === 2 ? third(base) : base}`;
    case 'prog': return `${s} ${BE_PRES[p]} ${ing}`;
    case 'past': return `${s} ${base === 'be' ? BE_PAST[p] : first(pastOf(v))}`;
    case 'pastprog': return `${s} ${BE_PAST[p]} ${ing}`;
    case 'perf': return `${s} ${HAVE(p)} ${pp}`;
    case 'perfprog': return `${s} ${HAVE(p)} been ${ing}`;
    case 'plup': return `${s} had ${pp}`;
    case 'will': return `${s} will ${base}`;
    case 'goingto': return `${s} ${BE_PRES[p]} going to ${base}`;
    case 'cond': return `${s} would ${base}`;
    case 'condperf': return `${s} would have ${pp}`;
    case 'passive': return `${s} ${BE_PRES[p]} ${pp}`;
    case 'imp': return p === 3 ? `let's ${base}` : base === 'be' ? 'be' : base;
    // Spanish-app compatibility (reader / quiz ids)
    case 'subj': return `don't ${base}`;
    default: return '—';
  }
}
