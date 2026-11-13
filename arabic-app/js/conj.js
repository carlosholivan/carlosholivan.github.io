// Arabic verb conjugation engine (Modern Standard Arabic, fully vocalised).
// Sound verbs (forms I–X) are generated from the root; weak verbs use the
// classical model paradigms (hollow, defective, assimilated, doubled).

const F = 'َ', K = 'ِ', D = 'ُ', S = 'ْ', SH = 'ّ';

export const PERSONS = [
  { id: '1s', ar: 'أَنَا', es: 'yo', en: 'I' },
  { id: '1p', ar: 'نَحْنُ', es: 'nosotros', en: 'we' },
  { id: '2ms', ar: 'أَنْتَ', es: 'tú (m.)', en: 'you (m.)' },
  { id: '2fs', ar: 'أَنْتِ', es: 'tú (f.)', en: 'you (f.)' },
  { id: '2d', ar: 'أَنْتُمَا', es: 'vosotros dos', en: 'you two' },
  { id: '2mp', ar: 'أَنْتُمْ', es: 'vosotros', en: 'you (m. pl.)' },
  { id: '2fp', ar: 'أَنْتُنَّ', es: 'vosotras', en: 'you (f. pl.)' },
  { id: '3ms', ar: 'هُوَ', es: 'él', en: 'he' },
  { id: '3fs', ar: 'هِيَ', es: 'ella', en: 'she' },
  { id: '3md', ar: 'هُمَا', es: 'ellos dos', en: 'they two (m.)' },
  { id: '3fd', ar: 'هُمَا', es: 'ellas dos', en: 'they two (f.)' },
  { id: '3mp', ar: 'هُمْ', es: 'ellos', en: 'they (m.)' },
  { id: '3fp', ar: 'هُنَّ', es: 'ellas', en: 'they (f.)' },
];
const IDS = PERSONS.map(p => p.id);
export const IMP_PERSONS = ['2ms', '2fs', '2d', '2mp', '2fp'];

export const TENSES = [
  { id: 'past', ar: 'المَاضِي', es: 'Pasado', en: 'Past', note_en: 'Completed action: كَتَبْتُ = I wrote / I have written. The endings show the person.', note: 'Acción terminada: كَتَبْتُ = escribí / he escrito. Las terminaciones indican la persona.' },
  { id: 'pres', ar: 'المُضَارِع', es: 'Presente', en: 'Present', note_en: 'Habitual or ongoing action: أَكْتُبُ = I write. With سَـ / سَوْفَ in front it is future: سَأَكْتُبُ.', note: 'Acción habitual o en curso: أَكْتُبُ = escribo. Con سَـ / سَوْفَ delante es futuro: سَأَكْتُبُ.' },
  { id: 'subj', ar: 'المَنْصُوب', es: 'Subjuntivo', en: 'Subjunctive', note_en: 'After أَنْ، لَنْ، لِـ، كَيْ، حَتَّى: أُرِيدُ أَنْ أَكْتُبَ · لَنْ أَكْتُبَ (I won’t write).', note: 'Tras أَنْ، لَنْ، لِـ، كَيْ، حَتَّى: أُرِيدُ أَنْ أَكْتُبَ · لَنْ أَكْتُبَ (no escribiré).' },
  { id: 'juss', ar: 'المَجْزُوم', es: 'Yusivo', en: 'Jussive', note_en: 'After لَمْ (negated past), prohibitive لَا and the لِـ of command: لَمْ أَكْتُبْ (I didn’t write) · لَا تَكْتُبْ (don’t write!).', note: 'Tras لَمْ (pasado negado), لَا prohibitivo y لِـ de mandato: لَمْ أَكْتُبْ (no escribí) · لَا تَكْتُبْ (¡no escribas!).' },
  { id: 'imp', ar: 'الأَمْر', es: 'Imperativo', en: 'Imperative', note_en: 'Only for “you” (sing. and pl.): it is formed from the jussive by dropping the prefix تَـ.', note: 'Solo para «tú», «vosotros»…: se forma desde el yusivo quitando el prefijo تَـ.' },
];

// Suffixes ---------------------------------------------------------------
const PAST_CONS = { '1s': S + 'تُ', '1p': S + 'نَا', '2ms': S + 'تَ', '2fs': S + 'تِ', '2d': S + 'تُمَا', '2mp': S + 'تُمْ', '2fp': S + 'تُنَّ', '3fp': S + 'نَ' };
const PAST_VOW = { '3ms': F, '3fs': F + 'تْ', '3md': F + 'ا', '3fd': F + 'تَا', '3mp': D + 'وا' };
const PREFIX = { '1s': 'أ', '1p': 'ن', '2ms': 'ت', '2fs': 'ت', '2d': 'ت', '2mp': 'ت', '2fp': 'ت', '3ms': 'ي', '3fs': 'ت', '3md': 'ي', '3fd': 'ت', '3mp': 'ي', '3fp': 'ي' };
const END = {
  pres: { '1s': D, '1p': D, '2ms': D, '2fs': K + 'ينَ', '2d': F + 'انِ', '2mp': D + 'ونَ', '2fp': S + 'نَ', '3ms': D, '3fs': D, '3md': F + 'انِ', '3fd': F + 'انِ', '3mp': D + 'ونَ', '3fp': S + 'نَ' },
  subj: { '1s': F, '1p': F, '2ms': F, '2fs': K + 'ي', '2d': F + 'ا', '2mp': D + 'وا', '2fp': S + 'نَ', '3ms': F, '3fs': F, '3md': F + 'ا', '3fd': F + 'ا', '3mp': D + 'وا', '3fp': S + 'نَ' },
  juss: { '1s': S, '1p': S, '2ms': S, '2fs': K + 'ي', '2d': F + 'ا', '2mp': D + 'وا', '2fp': S + 'نَ', '3ms': S, '3fs': S, '3md': F + 'ا', '3fd': F + 'ا', '3mp': D + 'وا', '3fp': S + 'نَ' },
};
const VOWEL_END = (end) => !end.startsWith(S); // endings that keep a vowel on the last radical

// Sound verbs ------------------------------------------------------------
function soundStems(v) {
  const [a, b, c] = v.root;
  const assim = { 'ص': 'ط', 'ض': 'ط', 'ط': 'ط', 'ظ': 'ط', 'د': 'د', 'ذ': 'د', 'ز': 'د' };
  switch (v.form) {
    case 1: return v.assimilated
      ? { past: a + F + b + v.pv + c, pv: F, pres: b + v.av + c, imp: '' }
      : { past: a + F + b + v.pv + c, pv: F, pres: a + S + b + v.av + c, imp: v.av === D ? 'اُ' : 'اِ' };
    case 2: return { past: a + F + b + SH + F + c, pv: D, pres: a + F + b + SH + K + c, imp: '' };
    case 3: return { past: a + F + 'ا' + b + F + c, pv: D, pres: a + F + 'ا' + b + K + c, imp: '' };
    case 4: return { past: 'أَ' + a + S + b + F + c, pv: D, pres: a + S + b + K + c, imp: 'أَ' };
    case 5: return { past: 'تَ' + a + F + b + SH + F + c, pv: F, pres: 'تَ' + a + F + b + SH + F + c, imp: '' };
    case 6: return { past: 'تَ' + a + F + 'ا' + b + F + c, pv: F, pres: 'تَ' + a + F + 'ا' + b + F + c, imp: '' };
    case 7: return { past: 'اِنْ' + a + F + b + F + c, pv: F, pres: 'نْ' + a + F + b + K + c, imp: 'اِ' };
    case 8: { const t = assim[a] || 'ت'; return { past: 'اِ' + a + S + t + F + b + F + c, pv: F, pres: a + S + t + F + b + K + c, imp: 'اِ' }; }
    case 10: return { past: 'اِسْتَ' + a + S + b + F + c, pv: F, pres: 'سْتَ' + a + S + b + K + c, imp: 'اِ' };
  }
}

function sound(v, tense, p) {
  const st = soundStems(v);
  if (tense === 'past') return st.past + (PAST_CONS[p] || PAST_VOW[p]);
  if (tense === 'imp') return st.imp + st.pres + END.juss[p];
  return PREFIX[p] + st.pv + st.pres + END[tense][p];
}

// Hollow verbs (قَالَ، بَاعَ، نَامَ) -----------------------------------------
function hollow(v, tense, p) {
  const [a, , c] = v.root;
  const { sv, lv, ps } = v; // short past vowel, long present vowel (ُو/ِي/َا), short present vowel
  if (tense === 'past') return PAST_CONS[p] ? a + sv + c + PAST_CONS[p] : a + F + 'ا' + c + PAST_VOW[p];
  const end = tense === 'imp' ? END.juss[p] : END[tense][p];
  const stem = VOWEL_END(end) ? a + lv + c : a + ps + c;
  return (tense === 'imp' ? '' : PREFIX[p] + F) + stem + end;
}

// Doubled verbs (مَدَّ) ----------------------------------------------------
function doubled(v, tense, p) {
  const [a, b] = v.root; const vw = v.av;
  if (tense === 'past') return PAST_CONS[p] ? a + F + b + F + b + PAST_CONS[p] : a + F + b + SH + PAST_VOW[p];
  let end = tense === 'imp' ? END.juss[p] : END[tense][p];
  if (tense !== 'pres' && end === S) end = F; // jussive/imperative singular: يَمُدَّ، مُدَّ
  if (!VOWEL_END(end)) return (tense === 'imp' ? 'اُ' : PREFIX[p] + F) + a + S + b + vw + b + end;
  return (tense === 'imp' ? '' : PREFIX[p] + F) + a + vw + b + SH + end;
}

// Explicit paradigms for defective verbs and other irregular models ---------
// X/Y = first/second radical. Order of persons as in PERSONS.
const T = {
  mashaa: {
    past: 'XَYَيْتُ XَYَيْنَا XَYَيْتَ XَYَيْتِ XَYَيْتُمَا XَYَيْتُمْ XَYَيْتُنَّ XَYَى XَYَتْ XَYَيَا XَYَتَا XَYَوْا XَYَيْنَ',
    pres: 'أَXْYِي نَXْYِي تَXْYِي تَXْYِينَ تَXْYِيَانِ تَXْYُونَ تَXْYِينَ يَXْYِي تَXْYِي يَXْYِيَانِ تَXْYِيَانِ يَXْYُونَ يَXْYِينَ',
    subj: 'أَXْYِيَ نَXْYِيَ تَXْYِيَ تَXْYِي تَXْYِيَا تَXْYُوا تَXْYِينَ يَXْYِيَ تَXْYِيَ يَXْYِيَا تَXْYِيَا يَXْYُوا يَXْYِينَ',
    juss: 'أَXْYِ نَXْYِ تَXْYِ تَXْYِي تَXْYِيَا تَXْYُوا تَXْYِينَ يَXْYِ تَXْYِ يَXْYِيَا تَXْYِيَا يَXْYُوا يَXْYِينَ',
    imp: 'اِXْYِ اِXْYِي اِXْYِيَا اِXْYُوا اِXْYِينَ',
  },
  daaa: {
    past: 'XَYَوْتُ XَYَوْنَا XَYَوْتَ XَYَوْتِ XَYَوْتُمَا XَYَوْتُمْ XَYَوْتُنَّ XَYَا XَYَتْ XَYَوَا XَYَتَا XَYَوْا XَYَوْنَ',
    pres: 'أَXْYُو نَXْYُو تَXْYُو تَXْYِينَ تَXْYُوَانِ تَXْYُونَ تَXْYُونَ يَXْYُو تَXْYُو يَXْYُوَانِ تَXْYُوَانِ يَXْYُونَ يَXْYُونَ',
    subj: 'أَXْYُوَ نَXْYُوَ تَXْYُوَ تَXْYِي تَXْYُوَا تَXْYُوا تَXْYُونَ يَXْYُوَ تَXْYُوَ يَXْYُوَا تَXْYُوَا يَXْYُوا يَXْYُونَ',
    juss: 'أَXْYُ نَXْYُ تَXْYُ تَXْYِي تَXْYُوَا تَXْYُوا تَXْYُونَ يَXْYُ تَXْYُ يَXْYُوَا تَXْYُوَا يَXْYُوا يَXْYُونَ',
    imp: 'اُXْYُ اُXْYِي اُXْYُوَا اُXْYُوا اُXْYُونَ',
  },
  nasiya: {
    past: 'XَYِيتُ XَYِينَا XَYِيتَ XَYِيتِ XَYِيتُمَا XَYِيتُمْ XَYِيتُنَّ XَYِيَ XَYِيَتْ XَYِيَا XَYِيَتَا XَYُوا XَYِينَ',
    pres: 'أَXْYَى نَXْYَى تَXْYَى تَXْYَيْنَ تَXْYَيَانِ تَXْYَوْنَ تَXْYَيْنَ يَXْYَى تَXْYَى يَXْYَيَانِ تَXْYَيَانِ يَXْYَوْنَ يَXْYَيْنَ',
    subj: 'أَXْYَى نَXْYَى تَXْYَى تَXْYَيْ تَXْYَيَا تَXْYَوْا تَXْYَيْنَ يَXْYَى تَXْYَى يَXْYَيَا تَXْYَيَا يَXْYَوْا يَXْYَيْنَ',
    juss: 'أَXْYَ نَXْYَ تَXْYَ تَXْYَيْ تَXْYَيَا تَXْYَوْا تَXْYَيْنَ يَXْYَ تَXْYَ يَXْYَيَا تَXْYَيَا يَXْYَوْا يَXْYَيْنَ',
    imp: 'اِXْYَ اِXْYَيْ اِXْYَيَا اِXْYَوْا اِXْYَيْنَ',
  },
  ahabba: {
    past: 'أَحْبَبْتُ أَحْبَبْنَا أَحْبَبْتَ أَحْبَبْتِ أَحْبَبْتُمَا أَحْبَبْتُمْ أَحْبَبْتُنَّ أَحَبَّ أَحَبَّتْ أَحَبَّا أَحَبَّتَا أَحَبُّوا أَحْبَبْنَ',
    pres: 'أُحِبُّ نُحِبُّ تُحِبُّ تُحِبِّينَ تُحِبَّانِ تُحِبُّونَ تُحْبِبْنَ يُحِبُّ تُحِبُّ يُحِبَّانِ تُحِبَّانِ يُحِبُّونَ يُحْبِبْنَ',
    subj: 'أُحِبَّ نُحِبَّ تُحِبَّ تُحِبِّي تُحِبَّا تُحِبُّوا تُحْبِبْنَ يُحِبَّ تُحِبَّ يُحِبَّا تُحِبَّا يُحِبُّوا يُحْبِبْنَ',
    juss: 'أُحِبَّ نُحِبَّ تُحِبَّ تُحِبِّي تُحِبَّا تُحِبُّوا تُحْبِبْنَ يُحِبَّ تُحِبَّ يُحِبَّا تُحِبَّا يُحِبُّوا يُحْبِبْنَ',
    imp: 'أَحِبَّ أَحِبِّي أَحِبَّا أَحِبُّوا أَحْبِبْنَ',
  },
};

function templ(v, tense, p) {
  const t = T[v.model][tense].split(' ');
  const i = tense === 'imp' ? IMP_PERSONS.indexOf(p) : IDS.indexOf(p);
  const [x, y] = v.root;
  return t[i].replace(/X/g, x).replace(/Y/g, y);
}

// Verb list ------------------------------------------------------------
// type: s = sound, h = hollow, d = defective, a = assimilated, g = doubled, x = irregular
const V = (w, es, o) => ({ w, es, ...o });
const VERB_EN = {'escribir': 'to write', 'estudiar': 'to study', 'beber': 'to drink', 'entender': 'to understand', 'trabajar': 'to work', 'ir': 'to go', 'abrir': 'to open', 'sentarse': 'to sit down', 'volver': 'to return', 'conocer, saber': 'to know', 'entrar': 'to enter', 'salir': 'to go out', 'oír': 'to hear', 'jugar': 'to play', 'vivir (habitar)': 'to live (dwell)', 'enseñar': 'to teach', 'limpiar': 'to clean', 'ayudar': 'to help', 'viajar': 'to travel', 'ver, mirar': 'to see, to watch', 'enviar': 'to send', 'cerrar': 'to close', 'hablar': 'to speak', 'aprender': 'to learn', 'colaborar': 'to cooperate', 'intercambiar': 'to exchange', 'mudarse': 'to move (house)', 'partir': 'to set off', 'reunirse': 'to meet', 'esperar': 'to wait', 'escuchar': 'to listen', 'usar': 'to use', 'recibir (a alguien)': 'to receive (someone)', 'decir': 'to say', 'ser, estar (pasado)': 'to be (past)', 'visitar': 'to visit', 'vender': 'to sell', 'dormir': 'to sleep', 'caminar': 'to walk', 'llorar': 'to cry', 'invitar, llamar': 'to invite, to call', 'olvidar': 'to forget', 'quedarse': 'to stay', 'encontrar': 'to find', 'llegar': 'to arrive', 'extender': 'to extend', 'amar, gustar': 'to love, to like', 'comer': 'to eat', 'tomar, coger': 'to take'};
export const VERBS = [
  V('كَتَبَ', 'escribir', { group: 'I', form: 1, root: 'كتب', pv: F, av: D, masdar: 'كِتَابَة' }),
  V('دَرَسَ', 'estudiar', { group: 'I', form: 1, root: 'درس', pv: F, av: D, masdar: 'دِرَاسَة' }),
  V('شَرِبَ', 'beber', { group: 'I', form: 1, root: 'شرب', pv: K, av: F, masdar: 'شُرْب' }),
  V('فَهِمَ', 'entender', { group: 'I', form: 1, root: 'فهم', pv: K, av: F, masdar: 'فَهْم' }),
  V('عَمِلَ', 'trabajar', { group: 'I', form: 1, root: 'عمل', pv: K, av: F, masdar: 'عَمَل' }),
  V('ذَهَبَ', 'ir', { intr: true, group: 'I', form: 1, root: 'ذهب', pv: F, av: F, masdar: 'ذَهَاب' }),
  V('فَتَحَ', 'abrir', { group: 'I', form: 1, root: 'فتح', pv: F, av: F, masdar: 'فَتْح' }),
  V('جَلَسَ', 'sentarse', { intr: true, group: 'I', form: 1, root: 'جلس', pv: F, av: K, masdar: 'جُلُوس' }),
  V('رَجَعَ', 'volver', { intr: true, group: 'I', form: 1, root: 'رجع', pv: F, av: K, masdar: 'رُجُوع' }),
  V('عَرَفَ', 'conocer, saber', { group: 'I', form: 1, root: 'عرف', pv: F, av: K, masdar: 'مَعْرِفَة' }),
  V('دَخَلَ', 'entrar', { intr: true, group: 'I', form: 1, root: 'دخل', pv: F, av: D, masdar: 'دُخُول' }),
  V('خَرَجَ', 'salir', { intr: true, group: 'I', form: 1, root: 'خرج', pv: F, av: D, masdar: 'خُرُوج' }),
  V('سَمِعَ', 'oír', { group: 'I', form: 1, root: 'سمع', pv: K, av: F, masdar: 'سَمَاع' }),
  V('لَعِبَ', 'jugar', { group: 'I', form: 1, root: 'لعب', pv: K, av: F, masdar: 'لَعِب' }),
  V('سَكَنَ', 'vivir (habitar)', { group: 'I', form: 1, root: 'سكن', pv: F, av: D, masdar: 'سَكَن' }),
  V('دَرَّسَ', 'enseñar', { group: 'II', form: 2, root: 'درس', masdar: 'تَدْرِيس' }),
  V('عَلَّمَ', 'enseñar', { group: 'II', form: 2, root: 'علم', masdar: 'تَعْلِيم' }),
  V('نَظَّفَ', 'limpiar', { group: 'II', form: 2, root: 'نظف', masdar: 'تَنْظِيف' }),
  V('سَاعَدَ', 'ayudar', { group: 'III', form: 3, root: 'سعد', masdar: 'مُسَاعَدَة' }),
  V('سَافَرَ', 'viajar', { group: 'III', form: 3, root: 'سفر', masdar: 'سَفَر' }),
  V('شَاهَدَ', 'ver, mirar', { group: 'III', form: 3, root: 'شهد', masdar: 'مُشَاهَدَة' }),
  V('أَرْسَلَ', 'enviar', { group: 'IV', form: 4, root: 'رسل', masdar: 'إِرْسَال' }),
  V('أَغْلَقَ', 'cerrar', { group: 'IV', form: 4, root: 'غلق', masdar: 'إِغْلَاق' }),
  V('تَكَلَّمَ', 'hablar', { intr: true, group: 'V', form: 5, root: 'كلم', masdar: 'تَكَلُّم' }),
  V('تَعَلَّمَ', 'aprender', { group: 'V', form: 5, root: 'علم', masdar: 'تَعَلُّم' }),
  V('تَعَاوَنَ', 'colaborar', { intr: true, group: 'VI', form: 6, root: 'عون', masdar: 'تَعَاوُن' }),
  V('تَبَادَلَ', 'intercambiar', { group: 'VI', form: 6, root: 'بدل', masdar: 'تَبَادُل' }),
  V('اِنْتَقَلَ', 'mudarse', { intr: true, group: 'VII', form: 7, root: 'تقل', masdar: 'اِنْتِقَال' }),
  V('اِنْطَلَقَ', 'partir', { intr: true, group: 'VII', form: 7, root: 'طلق', masdar: 'اِنْطِلَاق' }),
  V('اِجْتَمَعَ', 'reunirse', { intr: true, group: 'VIII', form: 8, root: 'جمع', masdar: 'اِجْتِمَاع' }),
  V('اِنْتَظَرَ', 'esperar', { group: 'VIII', form: 8, root: 'نظر', masdar: 'اِنْتِظَار' }),
  V('اِسْتَمَعَ', 'escuchar', { group: 'VIII', form: 8, root: 'سمع', masdar: 'اِسْتِمَاع' }),
  V('اِسْتَعْمَلَ', 'usar', { group: 'X', form: 10, root: 'عمل', masdar: 'اِسْتِعْمَال' }),
  V('اِسْتَقْبَلَ', 'recibir (a alguien)', { group: 'X', form: 10, root: 'قبل', masdar: 'اِسْتِقْبَال' }),
  V('قَالَ', 'decir', { group: 'hueco', kind: 'h', root: 'قول', sv: D, lv: D + 'و', ps: D, masdar: 'قَوْل' }),
  V('كَانَ', 'ser, estar (pasado)', { group: 'hueco', kind: 'h', root: 'كون', sv: D, lv: D + 'و', ps: D, masdar: 'كَوْن' }),
  V('زَارَ', 'visitar', { group: 'hueco', kind: 'h', root: 'زور', sv: D, lv: D + 'و', ps: D, masdar: 'زِيَارَة' }),
  V('بَاعَ', 'vender', { group: 'hueco', kind: 'h', root: 'بيع', sv: K, lv: K + 'ي', ps: K, masdar: 'بَيْع' }),
  V('نَامَ', 'dormir', { group: 'hueco', kind: 'h', root: 'نوم', sv: K, lv: F + 'ا', ps: F, masdar: 'نَوْم' }),
  V('مَشَى', 'caminar', { group: 'defectivo', kind: 't', model: 'mashaa', root: 'مش', masdar: 'مَشْي' }),
  V('بَكَى', 'llorar', { group: 'defectivo', kind: 't', model: 'mashaa', root: 'بك', masdar: 'بُكَاء' }),
  V('دَعَا', 'invitar, llamar', { group: 'defectivo', kind: 't', model: 'daaa', root: 'دع', masdar: 'دَعْوَة' }),
  V('نَسِيَ', 'olvidar', { group: 'defectivo', kind: 't', model: 'nasiya', root: 'نس', masdar: 'نِسْيَان' }),
  V('بَقِيَ', 'quedarse', { group: 'defectivo', kind: 't', model: 'nasiya', root: 'بق', masdar: 'بَقَاء' }),
  V('وَجَدَ', 'encontrar', { group: 'asimilado', form: 1, root: 'وجد', pv: F, av: K, assimilated: true, masdar: 'وُجُود' }),
  V('وَصَلَ', 'llegar', { group: 'asimilado', form: 1, root: 'وصل', pv: F, av: K, assimilated: true, masdar: 'وُصُول' }),
  V('مَدَّ', 'extender', { group: 'doble', kind: 'g', root: 'مد', av: D, masdar: 'مَدّ' }),
  V('أَحَبَّ', 'amar, gustar', { group: 'doble', kind: 't', model: 'ahabba', root: 'حب', masdar: 'حُبّ' }),
];
for (const v of VERBS) v.en = VERB_EN[v.es] || v.es;

// Irregular touches for hamzated Form I verbs: أَكَلَ / أَخَذَ.
VERBS.push(
  V('أَكَلَ', 'comer', { group: 'I', form: 1, root: 'أكل', pv: F, av: D, masdar: 'أَكْل', fix: { pres: { '1s': 'آكُلُ' }, subj: { '1s': 'آكُلَ' }, juss: { '1s': 'آكُلْ' }, imp: { '2ms': 'كُلْ', '2fs': 'كُلِي', '2d': 'كُلَا', '2mp': 'كُلُوا', '2fp': 'كُلْنَ' } } }),
  V('أَخَذَ', 'tomar, coger', { group: 'I', form: 1, root: 'أخذ', pv: F, av: D, masdar: 'أَخْذ', fix: { pres: { '1s': 'آخُذُ' }, subj: { '1s': 'آخُذَ' }, juss: { '1s': 'آخُذْ' }, imp: { '2ms': 'خُذْ', '2fs': 'خُذِي', '2d': 'خُذَا', '2mp': 'خُذُوا', '2fp': 'خُذْنَ' } } }),
);

export function conjugate(v, tense, p) {
  return assimilateN(conj0(v, tense, p));
}
// ن + نَ/نَا → نَّ/نَّا (سَكَنَّا، كُنَّا، يَسْكُنَّ)
const assimilateN = (w) => w.replace(/نْن([َا]|$)/g, 'نّ$1').replace(/نَّ/g, 'نَّ');

function conj0(v, tense, p) {
  if (tense === 'imp' && !IMP_PERSONS.includes(p)) return '';
  const fixed = v.fix?.[tense]?.[p];
  if (fixed) return fixed;
  if (v.kind === 'h') return hollow(v, tense, p);
  if (v.kind === 'g') return doubled(v, tense, p);
  if (v.kind === 't') return templ(v, tense, p);
  let out = sound(v, tense, p);
  // hamza seat for the 1st person singular of verbs starting with أ (أَ + أْ → آ)
  if (v.root[0] === 'أ' && v.form === 1 && tense !== 'past' && tense !== 'imp') out = out.replace(/^أَأْ/, 'آ');
  return out;
}

// Participles for sound verbs (activo / pasivo).
export function participles(v) {
  if (v.kind || v.assimilated) {
    const map = { 'قَالَ': ['قَائِل', 'مَقُول'], 'كَانَ': ['كَائِن', '—'], 'زَارَ': ['زَائِر', 'مَزُور'], 'بَاعَ': ['بَائِع', 'مَبِيع'], 'نَامَ': ['نَائِم', '—'],
      'مَشَى': ['مَاشٍ', '—'], 'بَكَى': ['بَاكٍ', '—'], 'دَعَا': ['دَاعٍ', 'مَدْعُوّ'], 'نَسِيَ': ['نَاسٍ', 'مَنْسِيّ'], 'بَقِيَ': ['بَاقٍ', '—'],
      'وَجَدَ': ['وَاجِد', 'مَوْجُود'], 'وَصَلَ': ['وَاصِل', 'مَوْصُول'], 'مَدَّ': ['مَادّ', 'مَمْدُود'], 'أَحَبَّ': ['مُحِبّ', 'مَحْبُوب'] };
    return map[v.w] || ['—', '—'];
  }
  const [a, b, c] = v.root;
  if (v.form === 1) return [(a === 'أ' ? 'آ' : a + F + 'ا') + b + K + c, v.intr ? '—' : 'مَ' + a + S + b + D + 'و' + c];
  if (v.intr) return ['مُ' + (v.form === 5 || v.form === 6 ? soundStems(v).pres.replace(new RegExp(F + '(' + c + ')$'), K + '$1') : soundStems(v).pres), '—'];
  const st = soundStems(v);
  const act = 'مُ' + (v.form === 5 || v.form === 6 ? st.pres.replace(new RegExp(F + '(' + c + ')$'), K + '$1') : st.pres);
  const pas = 'مُ' + st.pres.replace(new RegExp(K + '(' + c + ')$'), F + '$1');
  return [act, pas];
}
