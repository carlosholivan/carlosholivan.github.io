// Verb-form names, short usage hints and Reference links used by the text reader (French).
// g = colour group: pres | past | fut | subj (conditional / subjunctive) | imp | nf (non-finite) | peri (periphrases and modals)
// fr = name of the form (French, the target language); es = name in the learner's language.

const H = (es) => ({ es });
export const TENSES = {
  'inf':       { g: 'nf', fr: 'Infinitif', es: 'Infinitivo',
    hint: H('Forma base del verbo (-er, -ir, -re, -oir). Tras otro verbo (je veux partir), tras preposición (avant de partir, pour apprendre) y en instrucciones.') },
  'ppres':     { g: 'nf', fr: 'Participe présent', es: 'Participio presente',
    hint: H('Raíz de nous + -ant (parlant, finissant). Sustituye a una oración de relativo o de causa, sobre todo por escrito: les étudiants ayant fini… = que han terminado.') },
  'ger':       { g: 'nf', fr: 'Gérondif', es: 'Gerundio (en + -ant)', hint: H('en + participio presente: simultaneidad (il chante en travaillant), modo o condición (c’est en forgeant qu’on devient forgeron).') },
  'pp':        { g: 'nf', fr: 'Participe passé', es: 'Participio', hint: H('Con avoir/être forma los tiempos compuestos y con être la pasiva. Como adjetivo concuerda: une porte fermée.') },
  'pres':      { g: 'pres', fr: 'Présent', es: 'Presente', hint: H('Lo que pasa ahora o habitualmente, verdades generales y también acciones en curso (je travaille = trabajo / estoy trabajando).') },
  'encours':   { g: 'pres', fr: 'Être en train de', es: 'Estar + gerundio', hint: H('être en train de + infinitivo: insiste en que la acción está en curso ahora mismo.') },
  'passerec':  { g: 'past', fr: 'Passé récent', es: 'Pasado reciente', hint: H('venir de + infinitivo: acabar de (je viens d’arriver = acabo de llegar).') },
  'pc':        { g: 'past', fr: 'Passé composé', es: 'Pretérito perfecto / indefinido', hint: H('avoir o être + participio: acciones terminadas en el pasado. Equivale a «he comido» y también a «comí». Con être el participio concuerda con el sujeto.') },
  'imparf':    { g: 'past', fr: 'Imparfait', es: 'Pretérito imperfecto', hint: H('Descripción, contexto, costumbres y acciones en curso en el pasado (il faisait beau, je jouais souvent…). Raíz de nous + -ais, -ait, -ions…') },
  'pqp':       { g: 'past', fr: 'Plus-que-parfait', es: 'Pluscuamperfecto', hint: H('Imperfecto de avoir/être + participio: algo anterior a otro momento del pasado (quand je suis arrivé, il était parti).') },
  'ps':        { g: 'past', fr: 'Passé simple', es: 'Pretérito indefinido (literario)', hint: H('Tiempo de la narración escrita: novelas, cuentos, biografías (il ouvrit la porte). En la lengua hablada se usa el passé composé.') },
  'futproche': { g: 'fut', fr: 'Futur proche', es: 'Futuro próximo', hint: H('aller + infinitivo: lo que va a pasar pronto o ya está decidido (je vais partir = voy a irme).') },
  'fut':       { g: 'fut', fr: 'Futur simple', es: 'Futuro', hint: H('Infinitivo + -ai, -as, -a, -ons, -ez, -ont: predicciones, promesas y planes más lejanos. Tras quand con valor futuro: quand tu viendras…') },
  'futant':    { g: 'fut', fr: 'Futur antérieur', es: 'Futuro perfecto', hint: H('Futuro de avoir/être + participio: algo terminado antes de un momento futuro (quand tu auras fini…) o una suposición sobre el pasado.') },
  'cond':      { g: 'subj', fr: 'Conditionnel présent', es: 'Condicional', hint: H('Raíz del futuro + -ais, -ait…: cortesía (je voudrais), consejos (tu devrais), hipótesis (si j’avais le temps, je voyagerais) e información no confirmada.') },
  'condp':     { g: 'subj', fr: 'Conditionnel passé', es: 'Condicional compuesto', hint: H('Condicional de avoir/être + participio: lo que habría pasado (si j’avais su, je serais venu) y reproches (tu aurais dû…).') },
  'subj':      { g: 'subj', fr: 'Subjonctif présent', es: 'Presente de subjuntivo', hint: H('Tras expresiones de necesidad, deseo, emoción, duda y ciertas conjunciones: il faut que, je veux que, bien que, pour que, avant que.') },
  'subjp':     { g: 'subj', fr: 'Subjonctif passé', es: 'Pretérito perfecto de subjuntivo', hint: H('Subjuntivo de avoir/être + participio: acción ya terminada (je suis content que tu sois venu).') },
  'imp':       { g: 'imp', fr: 'Impératif', es: 'Imperativo', hint: H('Órdenes, consejos e instrucciones sin sujeto (viens, allons-y, écoutez). Los verbos en -er pierden la -s en tu (regarde !).') },
  'modal':     { g: 'peri', fr: 'Verbe modal + infinitif', es: 'Verbo modal + infinitivo', hint: H('pouvoir, devoir, vouloir, savoir, falloir + infinitivo: poder, deber, querer, saber hacer, hacer falta.') },
  'pas':       { g: 'peri', fr: 'Voix passive', es: 'Voz pasiva', hint: H('être (en el tiempo que corresponda) + participio concordado: le pont a été construit par… El agente va con par.') },
  'causatif':  { g: 'peri', fr: 'Faire + infinitif', es: 'Construcción causativa', hint: H('faire + infinitivo: hacer que otro haga algo o mandar hacer (j’ai fait réparer la voiture = me arreglaron el coche).') },
};

export const PERSONS = {};

export const NOTE_KINDS = {
  'prep':         { fr: 'Prépositions', es: 'Preposiciones' },
  'article':      { fr: 'Articles', es: 'Artículos y partitivos' },
  'tense':        { fr: 'Choix du temps', es: 'Elección de tiempo' },
  'pronoun':      { fr: 'Pronoms', es: 'Pronombres' },
  'y-en':         { fr: 'Y et en', es: 'Los pronombres y / en' },
  'agreement':    { fr: 'Accord', es: 'Concordancia' },
  'negation':     { fr: 'Négation', es: 'Negación' },
  'subjunctive':  { fr: 'Subjonctif', es: 'Subjuntivo' },
  'conditional':  { fr: 'Hypothèse', es: 'Condicionales' },
  'relative':     { fr: 'Pronoms relatifs', es: 'Pronombres relativos' },
  'reported':     { fr: 'Discours rapporté', es: 'Estilo indirecto' },
  'passive':      { fr: 'Voix passive', es: 'Pasiva' },
  'comparison':   { fr: 'Comparaison', es: 'Comparación' },
  'linker':       { fr: 'Connecteurs', es: 'Conectores' },
  'question':     { fr: 'Interrogation', es: 'Preguntas' },
  'word-order':   { fr: 'Ordre des mots', es: 'Orden de palabras' },
  'collocation':  { fr: 'Collocation', es: 'Colocación' },
  'false-friend': { fr: 'Faux ami', es: 'Falso amigo' },
  'idiom':        { fr: 'Expression', es: 'Expresión' },
  'register':     { fr: 'Registre', es: 'Registro' },
  'emphasis':     { fr: 'Mise en relief', es: 'Énfasis' },
  'inversion':    { fr: 'Inversion', es: 'Inversión' },
  'other':        { fr: 'Grammaire', es: 'Gramática' },
};

// Reference topics [level, id] for each verb form / note kind; the most advanced one at or below the text level is used.
export const REF_LINKS = {
  'pres': [['a1', 'a1-er-verbs'], ['a1', 'a1-ir-re']], 'encours': [['a2', 'a2-recent-progressive']], 'passerec': [['a2', 'a2-recent-progressive']],
  'pc': [['a1', 'a1-passe-compose'], ['a2', 'a2-passe-compose'], ['a2', 'a2-pc-etre']], 'imparf': [['a2', 'a2-imparfait'], ['a2', 'a2-pc-imparfait']],
  'pqp': [['b1', 'b1-plus-que-parfait']], 'ps': [['c1', 'c1-passe-simple']],
  'futproche': [['a1', 'a1-futur-proche']], 'fut': [['a2', 'a2-futur-simple']], 'futant': [['b1', 'b1-futur-anterieur']],
  'cond': [['a2', 'a2-politeness'], ['b1', 'b1-conditionnel'], ['b1', 'b1-hypothese']], 'condp': [['b2', 'b2-conditionnel-passe']],
  'subj': [['b1', 'b1-subjonctif'], ['b1', 'b1-subjonctif-emotions'], ['b2', 'b2-subjonctif-avance']], 'subjp': [['c1', 'c1-subjonctif-passe']],
  'imp': [['a1', 'a1-imperative']], 'modal': [['a1', 'a1-pouvoir-vouloir'], ['a2', 'a2-devoir-falloir']],
  'inf': [['a1', 'a1-pouvoir-vouloir'], ['b1', 'b1-infinitive-clauses']], 'ppres': [['b2', 'b2-participe-present']], 'ger': [['b1', 'b1-gerondif']],
  'pp': [['a2', 'a2-passe-compose'], ['b2', 'b2-accord-participe']], 'pas': [['b1', 'b1-passif'], ['b2', 'b2-passif-avance']], 'causatif': [['b2', 'b2-faire-causatif']],
  'prep': [['a1', 'a1-aller-venir'], ['a1', 'a1-il-y-a']], 'article': [['a1', 'a1-articles'], ['a1', 'a1-partitive']],
  'pronoun': [['a2', 'a2-object-pronouns'], ['a2', 'a2-indirect-pronouns'], ['b1', 'b1-double-pronouns']], 'y-en': [['a2', 'a2-y-en']],
  'agreement': [['a1', 'a1-adjectives'], ['b2', 'b2-accord-participe']], 'negation': [['a1', 'a1-er-verbs'], ['a2', 'a2-negation']],
  'subjunctive': [['b1', 'b1-subjonctif'], ['b2', 'b2-subjonctif-avance']], 'conditional': [['b1', 'b1-hypothese'], ['b2', 'b2-conditionnel-passe']],
  'relative': [['a2', 'a2-relatives'], ['b1', 'b1-dont-lequel']], 'reported': [['b1', 'b1-discours-indirect'], ['b2', 'b2-discours-passe']],
  'passive': [['b1', 'b1-passif'], ['b2', 'b2-passif-avance']], 'comparison': [['a2', 'a2-comparatives'], ['a2', 'a2-superlatives']],
  'linker': [['b1', 'b1-cause-consequence'], ['b1', 'b1-opposition'], ['b2', 'b2-connecteurs']], 'question': [['a1', 'a1-questions']],
  'emphasis': [['b1', 'b1-mise-en-relief'], ['c1', 'c1-mise-en-relief']], 'inversion': [['c1', 'c1-inversion']], 'tense': [['a2', 'a2-pc-imparfait']],
};
