// Spanish verb conjugation (Spain: vosotros is included). Regular endings + per-verb irregularities:
//   st: stem change in the present ('ie' e→ie, 'ue' o→ue, 'i' e→i, 'uy' -uir → y)
//   yo: irregular 1st person of the present (the present subjunctive is built from it)
//   pret: strong preterite stem (tuv-, hic-, dij-…)   fut: irregular future/conditional stem
//   tu: irregular tú imperative   part / ger: irregular participle / gerund
//   over: whole tenses given form by form (ser, ir, haber…)

export const PERSONS = [
  { id: 0, es: 'yo' },
  { id: 1, es: 'tú' },
  { id: 2, es: 'él / ella / usted' },
  { id: 3, es: 'nosotros' },
  { id: 4, es: 'vosotros' },
  { id: 5, es: 'ellos / ustedes' },
];
// Imperative: tú, usted, nosotros, vosotros, ustedes (no yo).
export const IMP_PERSONS = [
  { id: 1, es: 'tú' }, { id: 2, es: 'usted' }, { id: 3, es: 'nosotros' }, { id: 4, es: 'vosotros' }, { id: 5, es: 'ustedes' },
];

// Tense names: Spanish name shown first, then the user's language.
export const TENSES = [
  { id: 'pres', es: 'Presente', en: 'Present', ja: '直説法現在', zh: '陈述式现在时',
    note: { en: 'Habits, facts, what happens now; also near-future plans.', ja: '習慣・事実・今のこと。近い未来の予定にも。', zh: '习惯、事实、现在发生的事；也可表示近期计划。' } },
  { id: 'perf', es: 'Pretérito perfecto', en: 'Present perfect', ja: '現在完了', zh: '现在完成时',
    note: { en: 'haber + participle. In Spain: past actions in a period that includes now (hoy, este año, ya, nunca).', ja: 'haber＋過去分詞。スペインでは「今日・今年・もう・一度も」など今を含む期間の過去に。', zh: 'haber + 过去分词。西班牙用于包含现在的时间段（hoy、este año、ya、nunca）。' } },
  { id: 'pret', es: 'Pretérito indefinido', en: 'Preterite', ja: '点過去', zh: '简单过去时',
    note: { en: 'Finished actions at a finished time (ayer, en 2019) and sequences of events.', ja: '終わった時点で完了した出来事（昨日、2019年に）や出来事の連続。', zh: '在已结束的时间完成的动作（ayer、en 2019）以及一连串事件。' } },
  { id: 'imperf', es: 'Pretérito imperfecto', en: 'Imperfect', ja: '線過去', zh: '过去未完成时',
    note: { en: 'Background, descriptions and habits in the past (de niño jugaba…).', ja: '過去の背景・描写・習慣（子どもの頃よく遊んでいた）。', zh: '过去的背景、描写和习惯（de niño jugaba…）。' } },
  { id: 'fut', es: 'Futuro', en: 'Future', ja: '未来', zh: '将来时',
    note: { en: 'Future actions and guesses about the present (¿Dónde estará?).', ja: '未来のこと、現在の推量（どこにいるだろう？）。', zh: '将来的动作，也表示对现在的推测（¿Dónde estará?）。' } },
  { id: 'cond', es: 'Condicional', en: 'Conditional', ja: '過去未来（条件法）', zh: '条件式',
    note: { en: '“would”: hypotheses, polite requests and advice (Yo que tú, iría).', ja: '「〜だろう」：仮定・丁寧な依頼・助言。', zh: '“会……”：假设、礼貌请求和建议（Yo que tú, iría）。' } },
  { id: 'subj', es: 'Presente de subjuntivo', en: 'Present subjunctive', ja: '接続法現在', zh: '虚拟式现在时',
    note: { en: 'After wishes, doubts, emotions and purpose (quiero que vengas, para que lo sepas).', ja: '願望・疑い・感情・目的のあと（来てほしい、知っておくように）。', zh: '用于愿望、怀疑、情感和目的之后（quiero que vengas）。' } },
  { id: 'impsubj', es: 'Imperfecto de subjuntivo', en: 'Imperfect subjunctive', ja: '接続法過去', zh: '虚拟式过去时',
    note: { en: 'Subjunctive in the past and unreal conditions (si tuviera tiempo…).', ja: '過去の文脈の接続法、反実仮想（もし時間があれば…）。', zh: '过去语境的虚拟式和非真实条件（si tuviera tiempo…）。' } },
  { id: 'imp', es: 'Imperativo', en: 'Imperative', ja: '命令法', zh: '命令式',
    note: { en: 'Commands (affirmative). Negative commands use the subjunctive: no hables.', ja: '肯定命令。否定命令は接続法を使う：no hables。', zh: '肯定命令。否定命令用虚拟式：no hables。' } },
];

const V = (w, en, ja, zh, group, x = {}) => ({ w, en, ja, zh, group, ...x });
export const VERBS = [
  // Regular
  V('hablar', 'to speak', '話す', '说', 'reg'),
  V('trabajar', 'to work', '働く', '工作', 'reg'),
  V('estudiar', 'to study', '勉強する', '学习', 'reg'),
  V('comer', 'to eat', '食べる', '吃', 'reg'),
  V('beber', 'to drink', '飲む', '喝', 'reg'),
  V('aprender', 'to learn', '学ぶ', '学', 'reg'),
  V('vivir', 'to live', '住む・生きる', '住；生活', 'reg'),
  V('escribir', 'to write', '書く', '写', 'reg', { part: 'escrito' }),
  V('abrir', 'to open', '開ける', '打开', 'reg', { part: 'abierto' }),
  // Spelling changes
  V('buscar', 'to look for', '探す', '找', 'orto'),
  V('llegar', 'to arrive', '着く', '到达', 'orto'),
  V('empezar', 'to begin', '始める', '开始', 'orto', { st: 'ie' }),
  V('leer', 'to read', '読む', '读', 'orto'),
  V('construir', 'to build', '建てる', '建造', 'orto', { st: 'uy' }),
  V('conocer', 'to know (someone)', '知っている（人・場所）', '认识', 'orto', { yo: 'conozco' }),
  V('conducir', 'to drive', '運転する', '开车', 'orto', { yo: 'conduzco', pret: 'conduj' }),
  V('coger', 'to take, to catch', '取る・つかむ', '拿；乘', 'orto', { yo: 'cojo' }),
  // Stem changes
  V('pensar', 'to think', '考える', '想', 'stem', { st: 'ie' }),
  V('querer', 'to want, to love', '欲しい・愛する', '想要；爱', 'stem', { st: 'ie', pret: 'quis', fut: 'querr' }),
  V('entender', 'to understand', '理解する', '理解', 'stem', { st: 'ie' }),
  V('preferir', 'to prefer', '好む', '更喜欢', 'stem', { st: 'ie' }),
  V('sentir', 'to feel', '感じる', '感觉', 'stem', { st: 'ie' }),
  V('poder', 'can, to be able to', 'できる', '能', 'stem', { st: 'ue', pret: 'pud', fut: 'podr', ger: 'pudiendo' }),
  V('volver', 'to return', '戻る', '回来', 'stem', { st: 'ue', part: 'vuelto' }),
  V('dormir', 'to sleep', '眠る', '睡觉', 'stem', { st: 'ue' }),
  V('jugar', 'to play', '遊ぶ・（スポーツを）する', '玩', 'stem', { st: 'ue' }),
  V('encontrar', 'to find', '見つける', '找到', 'stem', { st: 'ue' }),
  V('pedir', 'to ask for, to order', '頼む・注文する', '要；点（菜）', 'stem', { st: 'i' }),
  V('repetir', 'to repeat', '繰り返す', '重复', 'stem', { st: 'i' }),
  V('seguir', 'to follow, to continue', '続ける・従う', '跟随；继续', 'stem', { st: 'i', yo: 'sigo' }),
  // Irregular 1st person
  V('hacer', 'to do, to make', 'する・作る', '做', 'yo', { yo: 'hago', pret: 'hic', fut: 'har', tu: 'haz', part: 'hecho' }),
  V('poner', 'to put', '置く', '放', 'yo', { yo: 'pongo', pret: 'pus', fut: 'pondr', tu: 'pon', part: 'puesto' }),
  V('salir', 'to go out, to leave', '出る', '出去', 'yo', { yo: 'salgo', fut: 'saldr', tu: 'sal' }),
  V('tener', 'to have', '持つ', '有', 'yo', { st: 'ie', yo: 'tengo', pret: 'tuv', fut: 'tendr', tu: 'ten' }),
  V('venir', 'to come', '来る', '来', 'yo', { st: 'ie', yo: 'vengo', pret: 'vin', fut: 'vendr', tu: 'ven' }),
  V('decir', 'to say, to tell', '言う', '说', 'yo', { st: 'i', yo: 'digo', pret: 'dij', fut: 'dir', tu: 'di', part: 'dicho' }),
  V('traer', 'to bring', '持ってくる', '带来', 'yo', { yo: 'traigo', pret: 'traj' }),
  V('oír', 'to hear', '聞こえる', '听见', 'yo', { yo: 'oigo' }),
  V('saber', 'to know (a fact)', '知っている', '知道', 'yo', { yo: 'sé', pret: 'sup', fut: 'sabr' }),
  V('dar', 'to give', '与える', '给', 'yo', { yo: 'doy' }),
  V('ver', 'to see', '見る', '看', 'yo', { yo: 'veo', part: 'visto' }),
  V('estar', 'to be (state, place)', 'いる・ある（状態・場所）', '在；是（状态）', 'yo', { yo: 'estoy', pret: 'estuv' }),
  // Very irregular
  V('ser', 'to be', '〜である', '是', 'irr'),
  V('ir', 'to go', '行く', '去', 'irr'),
  V('haber', 'to have (auxiliary); there is', '（助動詞）／ある', '（助动词）；有', 'irr'),
];

// Whole tenses that don't follow the rules.
const OVER = {
  ser: {
    pres: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    pret: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperf: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    subj: ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean'],
    imp: [null, 'sé', 'sea', 'seamos', 'sed', 'sean'],
  },
  ir: {
    pres: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    pret: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperf: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    subj: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan'],
    imp: [null, 've', 'vaya', 'vamos', 'id', 'vayan'],
  },
  haber: {
    pres: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
    pret: ['hube', 'hubiste', 'hubo', 'hubimos', 'hubisteis', 'hubieron'],
    subj: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
    fut: ['habré', 'habrás', 'habrá', 'habremos', 'habréis', 'habrán'],
    cond: ['habría', 'habrías', 'habría', 'habríamos', 'habríais', 'habrían'],
    imp: [null, '—', '—', '—', '—', '—'],
  },
  estar: {
    pres: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    subj: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'],
    imp: [null, 'está', 'esté', 'estemos', 'estad', 'estén'],
  },
  dar: {
    pres: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
    pret: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
    subj: ['dé', 'des', 'dé', 'demos', 'deis', 'den'],
  },
  ver: {
    pres: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
    pret: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'],
    imperf: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
    subj: ['vea', 'veas', 'vea', 'veamos', 'veáis', 'vean'],
  },
  saber: { subj: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan'] },
  oír: { pres: ['oigo', 'oyes', 'oye', 'oímos', 'oís', 'oyen'] },
  hacer: { pret: ['hice', 'hiciste', 'hizo', 'hicimos', 'hicisteis', 'hicieron'] },
};

const ACC = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
const type = v => v.w.slice(-2).replace('ír', 'ir');
const root = v => v.w.slice(0, -2);
const isVowel = c => /[aeiouáéíóú]/.test(c);
// Stem ends in a vowel sound (le-, o-, tra-), not in the silent u of gu/qu (segu-).
const vowelEnd = r => isVowel(r.slice(-1)) && !/[gq]u$/.test(r);

// e→ie / o→ue / u→ue (jugar) / e→i in the last stem vowel.
function changeStem(r, st) {
  const m = r.match(/^(.*?)([eiou])((?:gu|qu|[^aeiou])*)$/);
  if (!m) return r;
  const [, a, vow, b] = m;
  if (st === 'ie' && vow === 'e') return a + 'ie' + b;
  if (st === 'ie' && vow === 'i') return a + 'ie' + b;
  if (st === 'ue' && (vow === 'o' || vow === 'u')) return a + 'ue' + b;
  if (st === 'i' && vow === 'e') return a + 'i' + b;
  return r;
}
// The -ir stem change in the preterite 3rd persons, subjunctive nosotros/vosotros and the gerund.
function weakStem(v) {
  if (type(v) !== 'ir' || !v.st || v.st === 'uy') return root(v);
  const r = root(v);
  const m = r.match(/^(.*?)([eo])((?:gu|qu|[^aeiou])*)$/);
  if (!m) return r;
  return m[1] + (m[2] === 'e' ? 'i' : 'u') + m[3];
}

const END = {
  pres: { ar: ['o', 'as', 'a', 'amos', 'áis', 'an'], er: ['o', 'es', 'e', 'emos', 'éis', 'en'], ir: ['o', 'es', 'e', 'imos', 'ís', 'en'] },
  imperf: { ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'], er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'] },
  fut: ['é', 'ás', 'á', 'emos', 'éis', 'án'],
  cond: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  pret: { ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'], er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'] },
  strong: ['e', 'iste', 'o', 'imos', 'isteis', 'ieron'],
};

function present(v, p) {
  const t = type(v), r = root(v);
  if (p === 0 && v.yo) return v.yo;
  if (v.st === 'uy') {
    const e = END.pres.ir[p];
    return p === 3 || p === 4 ? r + e : r + 'y' + e;
  }
  const stem = v.st && p !== 3 && p !== 4 ? changeStem(r, v.st) : r;
  return stem + END.pres[t][p];
}

function subjunctive(v, p) {
  const t = type(v);
  const e = t === 'ar' ? ['e', 'es', 'e', 'emos', 'éis', 'en'] : ['a', 'as', 'a', 'amos', 'áis', 'an'];
  let stem;
  if (v.yo && /o$/.test(v.yo) && v.yo !== 'veo') stem = v.yo.slice(0, -1);                   // teng-, hag-, conozc-, sig-
  else if (v.st === 'uy') stem = root(v) + 'y';
  else {
    const r = root(v);
    if (p === 3 || p === 4) stem = t === 'ir' ? weakStem(v) : r;
    else stem = v.st ? changeStem(r, v.st) : r;
    if (v.st === 'i') stem = weakStem(v);                                      // pida, pidamos
  }
  if (t === 'ar') stem = stem.replace(/c$/, 'qu').replace(/g$/, 'gu').replace(/z$/, 'c');
  return stem + e[p];
}

function preterite(v, p) {
  const t = type(v), r = root(v);
  if (v.pret) {
    let e = END.strong[p];
    if (/j$/.test(v.pret) && p === 5) e = 'eron';
    return v.pret + e;
  }
  if (t === 'ar') {
    let stem = r;
    if (p === 0) stem = r.replace(/c$/, 'qu').replace(/g$/, 'gu').replace(/z$/, 'c');
    return stem + END.pret.ar[p];
  }
  const vowelStem = vowelEnd(r);
  let stem = (p === 2 || p === 5) ? weakStem(v) : r;
  if (vowelStem || v.st === 'uy') {                                         // leer, oír, construir
    if (p === 2) return r + 'yó';
    if (p === 5) return r + 'yeron';
    if (v.st === 'uy') return r + END.pret.er[p];
    return r + ['í', 'íste', '', 'ímos', 'ísteis', ''][p];
  }
  return stem + END.pret.er[p];
}

function imperfect(v, p) {
  const t = type(v);
  return root(v) + (t === 'ar' ? END.imperf.ar : END.imperf.er)[p];
}

function future(v, p, cond) {
  const stem = v.fut || v.w.replace('í', 'i');
  return stem + (cond ? END.cond : END.fut)[p];
}

function impSubj(v, p) {
  const p3 = conjugate(v, 'pret', 5);                   // hablaron → habla-
  const base = p3.slice(0, -3);
  const e = ['ra', 'ras', 'ra', 'ramos', 'rais', 'ran'][p];
  if (p === 3) return base.slice(0, -1) + ACC[base.slice(-1)] + e;  // habláramos, tuviéramos
  return base + e;
}

function imperative(v, p) {
  if (p === 0) return null;
  if (p === 1) return v.tu || conjugate(v, 'pres', 2);
  if (p === 4) return v.w === 'oír' ? 'oíd' : v.w.slice(0, -1) + 'd';
  return conjugate(v, 'subj', p);
}

export function participle(v) {
  if (v.part) return v.part;
  const t = type(v), r = root(v);
  if (t === 'ar') return r + 'ado';
  return r + (vowelEnd(r) && v.st !== 'uy' ? 'ído' : 'ido');
}

export function gerund(v) {
  if (v.ger) return v.ger;
  if (v.w === 'ir') return 'yendo';
  const t = type(v), r = root(v);
  if (t === 'ar') return r + 'ando';
  if (vowelEnd(r) || v.st === 'uy') return r + 'yendo';
  return weakStem(v) + 'iendo';
}

export function conjugate(v, tense, p) {
  const o = OVER[v.w]?.[tense];
  if (o) return o[p];
  switch (tense) {
    case 'pres': return present(v, p);
    case 'subj': return subjunctive(v, p);
    case 'pret': return preterite(v, p);
    case 'imperf': return imperfect(v, p);
    case 'fut': return future(v, p, false);
    case 'cond': return future(v, p, true);
    case 'impsubj': return impSubj(v, p);
    case 'imp': return imperative(v, p);
    case 'perf': return OVER.haber.pres[p] + ' ' + participle(v);
    default: return '';
  }
}
