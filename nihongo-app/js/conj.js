// Japanese verb / adjective conjugation engine and the reference data of every form.
// Groups: 1 = godan (う-verbs), 2 = ichidan (る-verbs), 3 = irregular (する, 来る).

const ROW = { // godan ending → [a, i, e, o]
  'う': ['わ', 'い', 'え', 'お'], 'く': ['か', 'き', 'け', 'こ'], 'ぐ': ['が', 'ぎ', 'げ', 'ご'],
  'す': ['さ', 'し', 'せ', 'そ'], 'つ': ['た', 'ち', 'て', 'と'], 'ぬ': ['な', 'に', 'ね', 'の'],
  'ぶ': ['ば', 'び', 'べ', 'ぼ'], 'む': ['ま', 'み', 'め', 'も'], 'る': ['ら', 'り', 'れ', 'ろ'],
};
const TE = { 'う': 'って', 'つ': 'って', 'る': 'って', 'む': 'んで', 'ぶ': 'んで', 'ぬ': 'んで', 'く': 'いて', 'ぐ': 'いで', 'す': 'して' };

// Example verbs used in the tables (word, reading, group, meaning).
export const VERBS = [
  ['書く', 'かく', 1, 'escribir', 'to write'], ['泳ぐ', 'およぐ', 1, 'nadar', 'to swim'], ['話す', 'はなす', 1, 'hablar', 'to speak'],
  ['待つ', 'まつ', 1, 'esperar', 'to wait'], ['死ぬ', 'しぬ', 1, 'morir', 'to die'], ['遊ぶ', 'あそぶ', 1, 'jugar', 'to play'],
  ['飲む', 'のむ', 1, 'beber', 'to drink'], ['帰る', 'かえる', 1, 'volver', 'to go back'], ['買う', 'かう', 1, 'comprar', 'to buy'],
  ['行く', 'いく', 1, 'ir', 'to go'],
  ['食べる', 'たべる', 2, 'comer', 'to eat'], ['見る', 'みる', 2, 'ver', 'to see'], ['起きる', 'おきる', 2, 'levantarse', 'to get up'],
  ['する', 'する', 3, 'hacer', 'to do'], ['来る', 'くる', 3, 'venir', 'to come'], ['勉強する', 'べんきょうする', 3, 'estudiar', 'to study'],
];
// Extra verbs for the quiz.
export const QUIZ_VERBS = VERBS.concat([
  ['会う', 'あう', 1, 'ver a alguien', 'to meet'], ['持つ', 'もつ', 1, 'tener', 'to have'], ['読む', 'よむ', 1, 'leer', 'to read'], ['休む', 'やすむ', 1, 'descansar', 'to rest'],
  ['急ぐ', 'いそぐ', 1, 'darse prisa', 'to hurry'], ['呼ぶ', 'よぶ', 1, 'llamar', 'to call'], ['作る', 'つくる', 1, 'hacer', 'to do'], ['入る', 'はいる', 1, 'entrar', 'to enter'],
  ['走る', 'はしる', 1, 'correr', 'to run'], ['知る', 'しる', 1, 'saber', 'to know'], ['切る', 'きる', 1, 'cortar', 'to cut'], ['貸す', 'かす', 1, 'prestar', 'to lend'],
  ['使う', 'つかう', 1, 'usar', 'to use'], ['聞く', 'きく', 1, 'oír', 'to hear'], ['寝る', 'ねる', 2, 'dormir', 'to sleep'], ['教える', 'おしえる', 2, 'enseñar', 'to teach'],
  ['借りる', 'かりる', 2, 'tomar prestado', 'to borrow'], ['忘れる', 'わすれる', 2, 'olvidar', 'to forget'], ['着る', 'きる', 2, 'ponerse (ropa)', 'to put on (clothes)'],
  ['出る', 'でる', 2, 'salir', 'to go out'], ['決める', 'きめる', 2, 'decidir', 'to decide'], ['連絡する', 'れんらくする', 3, 'contactar', 'to contact'],
]);

// Conjugate one string (written form or reading) — the two are processed in parallel.
function conjStr(w, g, form, isReading) {
  if (g === 3) {
    if (w.endsWith('する')) {
      const b = w.slice(0, -2);
      const S = { dict: 'する', masu: 'します', stem: 'し', nai: 'しない', naistem: 'し', zu: 'せず', te: 'して', ta: 'した', ba: 'すれば', tara: 'したら',
        vol: 'しよう', pot: 'できる', pas: 'される', caus: 'させる', imp: 'しろ', nakatta: 'しなかった', cond: 'すれば' };
      return b + S[form];
    }
    // 来る: kanji keeps 来, the reading changes
    const K = { dict: 'くる', masu: 'きます', stem: 'き', nai: 'こない', naistem: 'こ', zu: 'こず', te: 'きて', ta: 'きた', ba: 'くれば', tara: 'きたら',
      vol: 'こよう', pot: 'こられる', pas: 'こられる', caus: 'こさせる', imp: 'こい', nakatta: 'こなかった' };
    const k = K[form];
    const b = w.slice(0, -2);
    return isReading || !w.endsWith('来る') ? b + k : b + '来' + k.slice(1);
  }
  if (g === 2) {
    const b = w.slice(0, -1);
    return b + { dict: 'る', masu: 'ます', stem: '', nai: 'ない', naistem: '', zu: 'ず', te: 'て', ta: 'た', ba: 'れば', tara: 'たら',
      vol: 'よう', pot: 'られる', pas: 'られる', caus: 'させる', imp: 'ろ', nakatta: 'なかった' }[form];
  }
  const e = w.slice(-1), b = w.slice(0, -1), r = ROW[e];
  if (!r) return w;
  const iku = /(行|い)く$/.test(w) && (w === '行く' || w === 'いく' || w.endsWith('行く'));
  const te = iku ? 'って' : TE[e];
  const ta = te.replace('て', 'た').replace('で', 'だ');
  return {
    dict: w, masu: b + r[1] + 'ます', stem: b + r[1], nai: b + r[0] + 'ない', naistem: b + r[0], zu: b + r[0] + 'ず',
    te: b + te, ta: b + ta, ba: b + r[2] + 'ば', tara: b + ta + 'ら', vol: b + r[3] + 'う', pot: b + r[2] + 'る',
    pas: b + r[0] + 'れる', caus: b + r[0] + 'せる', imp: b + r[2], nakatta: b + r[0] + 'なかった',
  }[form];
}

export function conjugate([w, r, g], form) {
  return { w: conjStr(w, g, form, false), r: conjStr(r, g, form, true) };
}

// Every form: id, label, what it is, how to build it per group, and grammar that uses it.
export const FORMS = [
  { id: 'dict', ja: '辞書形', label: 'Forma diccionario', short: 'V-dicc.',
    what: 'La forma con la que el verbo aparece en el diccionario. Es la forma llana (informal) del presente/futuro afirmativo. En las fórmulas de gramática se escribe «V-る» o «V-dicc.».',
    rules: ['Grupo 1: termina en sonido -u (書く, 飲む, 帰る).', 'Grupo 2: termina en -iru / -eru (食べる, 見る).', 'Grupo 3: する y 来る.'],
    uses: '～ことができる, ～前に, ～つもり, ～ようにする, ～ことにする, ～ところだ, ～はずだ, ～べきだ…',
    en: {"label": "Dictionary form", "short": "V-dict.", "what": "The form in which a verb appears in the dictionary. It is the plain (informal) present/future affirmative. In grammar formulas it is written “V-る” or “V-dict.”.", "rules": ["Group 1: ends in an -u sound (書く, 飲む, 帰る).", "Group 2: ends in -iru / -eru (食べる, 見る).", "Group 3: する and 来る."], "uses": "～ことができる, ～前に, ～つもり, ～ようにする, ～ことにする, ～ところだ, ～はずだ, ～べきだ…"} },
  { id: 'masu', ja: 'ます形', label: 'Forma ます', short: 'V-ます',
    what: 'Forma cortés del presente/futuro. Si en una fórmula pone «V-ます + algo», se usa la RAÍZ: se quita ます (ver «raíz ます»).',
    rules: ['Grupo 1: -u → -i + ます (書く→書きます).', 'Grupo 2: quita る + ます (食べる→食べます).', 'Grupo 3: します, 来(き)ます.'], uses: 'Conversación cortés.',
    en: {"label": "ます form", "short": "V-ます", "what": "Polite present/future form. If a formula says “V-ます + something”, use the STEM: drop ます (see “ます stem”).", "rules": ["Group 1: -u → -i + ます (書く→書きます).", "Group 2: drop る + ます (食べる→食べます).", "Group 3: します, 来(き)ます."], "uses": "Polite conversation."} },
  { id: 'stem', ja: 'ます形の語幹', label: 'Raíz ます (sin ます)', short: 'V-ます sin ます',
    what: 'La forma ます quitando ます: 書きます → 書き. Muchísima gramática se pega aquí. En las fórmulas aparece como «V-ます + …» o «V-ます (raíz)».',
    rules: ['Grupo 1: -u → -i (書く→書き, 飲む→飲み).', 'Grupo 2: quita る (食べる→食べ).', 'Grupo 3: する→し, 来る→来(き).'],
    uses: '～たい, ～ながら, ～やすい／にくい, ～すぎる, ～方, ～に行く, ～そうだ (aspecto), ～気味, ～がち, ～かける, ～切る, ～つつ, ～がたい, ～かねる…',
    en: {"label": "ます stem (without ます)", "short": "V-ます stem", "what": "The ます form with ます removed: 書きます → 書き. A huge amount of grammar attaches here. In formulas it appears as “V-ます + …” or “V-ます (stem)”.", "rules": ["Group 1: -u → -i (書く→書き, 飲む→飲み).", "Group 2: drop る (食べる→食べ).", "Group 3: する→し, 来る→来(き)."], "uses": "～たい, ～ながら, ～やすい／にくい, ～すぎる, ～方, ～に行く, ～そうだ (appearance), ～気味, ～がち, ～かける, ～切る, ～つつ, ～がたい, ～かねる…"} },
  { id: 'nai', ja: 'ない形', label: 'Forma ない', short: 'V-ない',
    what: 'Negativo llano (informal) del presente: «no hago / no haré».',
    rules: ['Grupo 1: -u → -a + ない (書く→書かない). ¡Ojo! -う → -わ (買う→買わない).', 'Grupo 2: quita る + ない (食べる→食べない).', 'Grupo 3: しない, 来(こ)ない.', 'Excepción: ある → ない.'],
    uses: '～ないでください, ～なければならない, ～ないほうがいい, ～ないうちに, ～ないことはない, ～ないことには…',
    en: {"label": "ない form", "short": "V-ない", "what": "Plain (informal) present negative: “I don’t / I won’t”.", "rules": ["Group 1: -u → -a + ない (書く→書かない). Careful! -う → -わ (買う→買わない).", "Group 2: drop る + ない (食べる→食べない).", "Group 3: しない, 来(こ)ない.", "Exception: ある → ない."], "uses": "～ないでください, ～なければならない, ～ないほうがいい, ～ないうちに, ～ないことはない, ～ないことには…"} },
  { id: 'naistem', ja: 'ない形の語幹', label: 'Raíz ない (sin ない)', short: 'V-ない sin ない',
    what: 'La forma ない quitando ない: 書かない → 書か. Se usa con ～ず, ～ずに, ～ずにはいられない, ～ざるをえない, ～せる/～れる.',
    rules: ['Grupo 1: -u → -a (書く→書か, 買う→買わ).', 'Grupo 2: quita る (食べる→食べ).', 'Grupo 3: する→せ (せず, せざるをえない), 来る→来(こ).'],
    uses: '～ず（に）, ～ずにはいられない, ～ざるをえない, ～ずじまい, ～んばかり…',
    en: {"label": "ない stem (without ない)", "short": "V-ない without ない", "what": "The ない form with ない removed: 書かない → 書か. Used with ～ず, ～ずに, ～ずにはいられない, ～ざるをえない, ～せる/～れる.", "rules": ["Group 1: -u → -a (書く→書か, 買う→買わ).", "Group 2: drop る (食べる→食べ).", "Group 3: する→せ (せず, せざるをえない), 来る→来(こ)."], "uses": "～ず（に）, ～ずにはいられない, ～ざるをえない, ～ずじまい, ～んばかり…"} },
  { id: 'te', ja: 'て形', label: 'Forma て', short: 'V-て',
    what: 'Forma conectiva: une acciones, pide cosas y forma muchísimas expresiones.',
    rules: ['Grupo 1 según la última sílaba: う・つ・る → って; む・ぶ・ぬ → んで; く → いて; ぐ → いで; す → して. Excepción: 行く → 行って.', 'Grupo 2: quita る + て (食べて).', 'Grupo 3: して, 来(き)て.'],
    uses: '～てください, ～ている, ～てもいい, ～てはいけない, ～てしまう, ～ておく, ～てから, ～てたまらない, ～てこそ…',
    en: {"label": "て form", "short": "V-て", "what": "Connective form: links actions, makes requests and forms a huge number of expressions.", "rules": ["Group 1 by last syllable: う・つ・る → って; む・ぶ・ぬ → んで; く → いて; ぐ → いで; す → して. Exception: 行く → 行って.", "Group 2: drop る + て (食べて).", "Group 3: して, 来(き)て."], "uses": "～てください, ～ている, ～てもいい, ～てはいけない, ～てしまう, ～ておく, ～てから, ～てたまらない, ～てこそ…"} },
  { id: 'ta', ja: 'た形', label: 'Forma た', short: 'V-た',
    what: 'Pasado llano (informal). Se forma igual que la forma て, cambiando て→た y で→だ.',
    rules: ['Grupo 1: 書いた, 泳いだ, 話した, 待った, 飲んだ, 行った.', 'Grupo 2: 食べた.', 'Grupo 3: した, 来(き)た.'],
    uses: '～たことがある, ～たほうがいい, ～たり～たり, ～たら, ～たところ, ～たとたん, ～たきり, ～た末…',
    en: {"label": "た form", "short": "V-た", "what": "Plain (informal) past. Formed like the て form, changing て→た and で→だ.", "rules": ["Group 1: 書いた, 泳いだ, 話した, 待った, 飲んだ, 行った.", "Group 2: 食べた.", "Group 3: した, 来(き)た."], "uses": "～たことがある, ～たほうがいい, ～たり～たり, ～たら, ～たところ, ～たとたん, ～たきり, ～た末…"} },
  { id: 'plain', ja: '普通形', label: 'Forma llana (普通形)', short: 'forma llana',
    what: 'Las cuatro formas informales: presente/pasado, afirmativo/negativo. Cuando una fórmula dice «forma llana» o «普通形», vale cualquiera de ellas. Con adjetivos-な y sustantivos, el presente afirmativo suele cambiar だ por な / の / である según la gramática.',
    rules: ['Verbo: 書く・書かない・書いた・書かなかった.', 'Adj-い: 高い・高くない・高かった・高くなかった.', 'Adj-な: 静かだ・静かではない・静かだった・静かではなかった.', 'Sustantivo: 学生だ・学生ではない・学生だった・学生ではなかった.'],
    uses: '～と思う, ～そうだ (oído), ～らしい, ～かもしれない, ～わけだ, ～からといって, ～としたら…',
    en: {"label": "Plain form (普通形)", "short": "plain form", "what": "The four informal forms: present/past, affirmative/negative. When a formula says “plain form” or “普通形”, any of them will do. With な-adjectives and nouns, the present affirmative usually changes だ to な / の / である depending on the grammar.", "rules": ["Verb: 書く・書かない・書いた・書かなかった.", "い-adj: 高い・高くない・高かった・高くなかった.", "な-adj: 静かだ・静かではない・静かだった・静かではなかった.", "Noun: 学生だ・学生ではない・学生だった・学生ではなかった."], "uses": "～と思う, ～そうだ (hearsay), ～らしい, ～かもしれない, ～わけだ, ～からといって, ～としたら…"} },
  { id: 'ba', ja: '条件形（ば）', label: 'Condicional ば', short: 'V-ば',
    what: 'Condicional «si…». Se forma con la fila -e + ば.',
    rules: ['Grupo 1: -u → -e + ば (書く→書けば).', 'Grupo 2: quita る + れば (食べれば).', 'Grupo 3: すれば, 来(く)れば.', 'Adj-い: 高い→高ければ.'],
    uses: '～ば～ほど, ～さえ～ば, ～ばよかった, ～ばいい…',
    en: {"label": "ば conditional", "short": "V-ば", "what": "Conditional “if…”. Formed with the -e row + ば.", "rules": ["Group 1: -u → -e + ば (書く→書けば).", "Group 2: drop る + れば (食べれば).", "Group 3: すれば, 来(く)れば.", "い-adj: 高い→高ければ."], "uses": "～ば～ほど, ～さえ～ば, ～ばよかった, ～ばいい…"} },
  { id: 'tara', ja: 'たら形', label: 'Condicional たら', short: 'V-たら',
    what: 'Condicional «si / cuando». Es la forma た + ら.',
    rules: ['Todos los grupos: forma た + ら (書いたら, 食べたら, したら, 来(き)たら).'], uses: '～たらいい, ～たらどうですか, ～としたら…',
    en: {"label": "たら conditional", "short": "V-たら", "what": "Conditional “if / when”. It is the た form + ら.", "rules": ["All groups: た form + ら (書いたら, 食べたら, したら, 来(き)たら)."], "uses": "～たらいい, ～たらどうですか, ～としたら…"} },
  { id: 'vol', ja: '意向形', label: 'Forma volitiva', short: 'V-よう',
    what: 'Forma informal de «vamos a… / voy a…». Base de ～ようと思う y ～ようとする.',
    rules: ['Grupo 1: -u → -o + う (書く→書こう).', 'Grupo 2: quita る + よう (食べよう).', 'Grupo 3: しよう, 来(こ)よう.'],
    uses: '～ようと思う, ～ようとする, ～ようではないか, ～ようものなら, ～か～まいか…',
    en: {"label": "Volitional form", "short": "V-よう", "what": "Informal “let’s… / I’ll…”. Basis of ～ようと思う and ～ようとする.", "rules": ["Group 1: -u → -o + う (書く→書こう).", "Group 2: drop る + よう (食べよう).", "Group 3: しよう, 来(こ)よう."], "uses": "～ようと思う, ～ようとする, ～ようではないか, ～ようものなら, ～か～まいか…"} },
  { id: 'pot', ja: '可能形', label: 'Forma potencial', short: 'V-potencial',
    what: '«Poder hacer». El objeto suele llevar が. Funciona como un verbo del grupo 2.',
    rules: ['Grupo 1: -u → -e + る (書く→書ける).', 'Grupo 2: quita る + られる (食べられる).', 'Grupo 3: する→できる, 来る→来(こ)られる.'], uses: '～ようになる, ～ように…',
    en: {"label": "Potential form", "short": "V-potential", "what": "“To be able to do”. The object usually takes が. It behaves like a group 2 verb.", "rules": ["Group 1: -u → -e + る (書く→書ける).", "Group 2: drop る + られる (食べられる).", "Group 3: する→できる, 来る→来(こ)られる."], "uses": "～ようになる, ～ように…"} },
  { id: 'pas', ja: '受身形', label: 'Forma pasiva', short: 'V-pasiva',
    what: 'Pasiva «ser hecho» y también la forma respetuosa (尊敬語) de muchos verbos.',
    rules: ['Grupo 1: -u → -a + れる (書く→書かれる; 買う→買われる).', 'Grupo 2: quita る + られる (食べられる).', 'Grupo 3: される, 来(こ)られる.'], uses: 'Pasiva, pasiva de molestia, 尊敬語 (～れる/られる).',
    en: {"label": "Passive form", "short": "V-passive", "what": "Passive “to be done” and also the respectful form (尊敬語) of many verbs.", "rules": ["Group 1: -u → -a + れる (書く→書かれる; 買う→買われる).", "Group 2: drop る + られる (食べられる).", "Group 3: される, 来(こ)られる."], "uses": "Passive, passive of inconvenience, 尊敬語 (～れる/られる)."} },
  { id: 'caus', ja: '使役形', label: 'Forma causativa', short: 'V-causativa',
    what: '«Hacer / dejar que alguien haga». Base de ～させていただく y de la causativa-pasiva.',
    rules: ['Grupo 1: -u → -a + せる (書く→書かせる).', 'Grupo 2: quita る + させる (食べさせる).', 'Grupo 3: させる, 来(こ)させる.'], uses: '～させてください, ～させていただきます, ～させられる…',
    en: {"label": "Causative form", "short": "V-causative", "what": "“To make / let someone do”. Basis of ～させていただく and the causative-passive.", "rules": ["Group 1: -u → -a + せる (書く→書かせる).", "Group 2: drop る + させる (食べさせる).", "Group 3: させる, 来(こ)させる."], "uses": "～させてください, ～させていただきます, ～させられる…"} },
  { id: 'imp', ja: '命令形', label: 'Imperativo', short: 'V-imperativo',
    what: 'Orden directa y brusca. Se ve en señales, deportes o en estilo indirecto (～と言われた).',
    rules: ['Grupo 1: -u → -e (書く→書け).', 'Grupo 2: quita る + ろ (食べろ).', 'Grupo 3: しろ／せよ, 来(こ)い.'], uses: '～なさい (forma suave), ～な (prohibición: 書くな).',
    en: {"label": "Imperative", "short": "V-imperative", "what": "Direct, blunt order. Seen on signs, in sports or in reported speech (～と言われた).", "rules": ["Group 1: -u → -e (書く→書け).", "Group 2: drop る + ろ (食べろ).", "Group 3: しろ／せよ, 来(こ)い."], "uses": "～なさい (soft form), ～な (prohibition: 書くな)."} },
  { id: 'adj', ja: '形容詞', label: 'Adjetivos い y な', short: 'Adj',
    what: 'Los adjetivos también se conjugan. Adj-い: termina en い (高い). Adj-な: lleva な delante de un sustantivo (静かな町).',
    rules: ['Adj-い: 高い・高くない・高かった・高くて・高ければ・高さ. Excepción: いい → よくない, よかった.', 'Adj-な: 静かだ・静かではない・静かだった・静かで・静かなら・静かな＋N.', 'En fórmulas: «Adj-くて» = forma て del Adj-い; «Adj-なで» = forma て del Adj-な; «Adj-な＋な» = se mantiene な.'],
    uses: '～すぎる, ～そうだ, ～さ, ～くなる／になる, ～くても／でも…',
    en: {"label": "い and な adjectives", "short": "Adj", "what": "Adjectives conjugate too. い-adj: ends in い (高い). な-adj: takes な before a noun (静かな町).", "rules": ["い-adj: 高い・高くない・高かった・高くて・高ければ・高さ. Exception: いい → よくない, よかった.", "な-adj: 静かだ・静かではない・静かだった・静かで・静かなら・静かな＋N.", "In formulas: “Adj-くて” = て form of an い-adj; “Adj-なで” = て form of a な-adj; “Adj-な＋な” = keep な."], "uses": "～すぎる, ～そうだ, ～さ, ～くなる／になる, ～くても／でも…"} },
];
export const FORM = Object.fromEntries(FORMS.map(f => [f.id, f]));
export const TABLE_FORMS = ['dict', 'masu', 'stem', 'nai', 'naistem', 'te', 'ta', 'ba', 'tara', 'vol', 'pot', 'pas', 'caus', 'imp'];
export const GROUP_LABEL_EN = { 1: 'Group 1 (godan, -u verbs)', 2: 'Group 2 (ichidan, -る verbs)', 3: 'Group 3 (irregular)' };
export const GROUP_LABEL = { 1: 'Grupo 1 (godan, verbos -u)', 2: 'Grupo 2 (ichidan, verbos -る)', 3: 'Grupo 3 (irregulares)' };
