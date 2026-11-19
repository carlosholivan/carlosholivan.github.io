// French verb conjugation. Regular patterns (-er, -ir like finir, -re like vendre) with the usual spelling changes,
// plus per-verb data for the irregular ones:
//   pres: the six present forms   fut: future/conditional stem   pp: past participle   aux: 'être' for être verbs
//   subj: [stem for je/tu/il/ils, stem for nous/vous] when it is not built from the present (fasse, puisse, aille…)
//   ps: [type, stem] of the passé simple (type 'a' = -ai, 'i' = -is, 'u' = -us, 'in' = -ins)
//   sp: spelling change of -er verbs: 'll' (appelle), 'tt' (jette), 'è' (achète), 'é' (préfère), 'y' (paie)
//   pron: pronominal verb (se lever)   imp: irregular imperative [tu, nous, vous]   only3: impersonal (il faut, il pleut)

export const PERSONS = [
  { id: 0, fr: 'je', es: 'yo' },
  { id: 1, fr: 'tu', es: 'tú' },
  { id: 2, fr: 'il / elle / on', es: 'él / ella / se' },
  { id: 3, fr: 'nous', es: 'nosotros' },
  { id: 4, fr: 'vous', es: 'vosotros / usted(es)' },
  { id: 5, fr: 'ils / elles', es: 'ellos / ellas' },
];
export const IMP_PERSONS = [
  { id: 1, fr: '(tu)', es: 'tú' }, { id: 3, fr: '(nous)', es: 'nosotros' }, { id: 4, fr: '(vous)', es: 'vosotros / usted(es)' },
];

export const TENSES = [
  { id: 'pres', fr: 'Présent', es: 'Presente', note: { es: 'Lo que pasa ahora, hábitos y verdades generales. También acciones en curso: je mange = como / estoy comiendo.' } },
  { id: 'pc', fr: 'Passé composé', es: 'Pretérito perfecto / indefinido', note: { es: 'avoir o être + participio. Acciones terminadas en el pasado: hier, j’ai vu… Con être, el participio concuerda con el sujeto.' } },
  { id: 'imparf', fr: 'Imparfait', es: 'Pretérito imperfecto', note: { es: 'Descripciones, costumbres y acciones en curso en el pasado (quand j’étais petit…). Se forma con la raíz de nous del presente.' } },
  { id: 'pqp', fr: 'Plus-que-parfait', es: 'Pluscuamperfecto', note: { es: 'Imperfecto de avoir/être + participio: una acción anterior a otra pasada (il était déjà parti).' } },
  { id: 'fut', fr: 'Futur simple', es: 'Futuro', note: { es: 'Infinitivo (sin la -e de -re) + -ai, -as, -a, -ons, -ez, -ont. Muchos verbos tienen raíz irregular: ser-, aur-, ir-, fer-, pourr-…' } },
  { id: 'cond', fr: 'Conditionnel présent', es: 'Condicional', note: { es: 'Raíz del futuro + terminaciones del imperfecto. Hipótesis (si j’avais…, je…), cortesía (je voudrais) y consejos.' } },
  { id: 'condp', fr: 'Conditionnel passé', es: 'Condicional compuesto', note: { es: 'Condicional de avoir/être + participio: lo que habría pasado (si j’avais su, je serais venu).' } },
  { id: 'subj', fr: 'Subjonctif présent', es: 'Presente de subjuntivo', note: { es: 'Tras il faut que, vouloir que, bien que, pour que, avant que… Raíz de ils en presente + -e, -es, -e, -ions, -iez, -ent.' } },
  { id: 'imp', fr: 'Impératif', es: 'Imperativo', note: { es: 'Órdenes sin sujeto. Los verbos en -er pierden la -s en tu (parle !), salvo delante de y / en (vas-y).' } },
  { id: 'ps', fr: 'Passé simple', es: 'Pretérito indefinido (literario)', note: { es: 'Tiempo de la narración escrita y literaria (il entra, ils furent). Hay que reconocerlo, casi nunca se usa al hablar.' } },
];

const V = (w, es, group, x = {}) => ({ w, es, group, ...x });
export const VERBS = [
  // Regular -er
  V('parler', 'hablar', 'er'),
  V('aimer', 'gustar, querer', 'er'),
  V('travailler', 'trabajar', 'er'),
  V('habiter', 'vivir (en un lugar)', 'er'),
  V('regarder', 'mirar', 'er'),
  V('écouter', 'escuchar', 'er'),
  V('arriver', 'llegar', 'er', { aux: 'être' }),
  V('rester', 'quedarse', 'er', { aux: 'être' }),
  V('se lever', 'levantarse', 'er', { pron: true, sp: 'è' }),
  V('s’habiller', 'vestirse', 'er', { pron: true }),
  // -er with spelling changes
  V('manger', 'comer', 'sp'),
  V('commencer', 'empezar', 'sp'),
  V('appeler', 'llamar', 'sp', { sp: 'll' }),
  V('jeter', 'tirar', 'sp', { sp: 'tt' }),
  V('acheter', 'comprar', 'sp', { sp: 'è' }),
  V('préférer', 'preferir', 'sp', { sp: 'é' }),
  V('payer', 'pagar', 'sp', { sp: 'y' }),
  V('envoyer', 'enviar', 'sp', { sp: 'y', fut: 'enverr' }),
  // -ir (finir) and -re (vendre)
  V('finir', 'terminar', 'ir'),
  V('choisir', 'elegir', 'ir'),
  V('réussir', 'conseguir, aprobar', 'ir'),
  V('grandir', 'crecer', 'ir'),
  V('vendre', 'vender', 're'),
  V('attendre', 'esperar', 're'),
  V('répondre', 'responder', 're'),
  V('entendre', 'oír', 're'),
  V('perdre', 'perder', 're'),
  V('descendre', 'bajar', 're', { aux: 'être' }),
  // The most irregular
  V('être', 'ser, estar', 'irr', { pres: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], fut: 'ser', pp: 'été', imparf: 'ét', subj: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'], ps: ['u', 'f'], imp: ['sois', 'soyons', 'soyez'] }),
  V('avoir', 'tener, haber', 'irr', { pres: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], fut: 'aur', pp: 'eu', subj: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'], ps: ['u', ''], imp: ['aie', 'ayons', 'ayez'] }),
  V('aller', 'ir', 'irr', { ps: ['a', 'all'], pp: 'allé', pres: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], fut: 'ir', aux: 'être', subjs: ['aill', 'all'], imp: ['va', 'allons', 'allez'] }),
  V('faire', 'hacer', 'irr', { pres: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'], fut: 'fer', pp: 'fait', subjs: ['fass', 'fass'], ps: ['i', 'f'] }),
  V('dire', 'decir', 'irr', { pres: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'], pp: 'dit', ps: ['i', 'd'] }),
  V('pouvoir', 'poder', 'irr', { pres: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'], fut: 'pourr', pp: 'pu', subjs: ['puiss', 'puiss'], ps: ['u', 'p'], imp: [null, null, null] }),
  V('vouloir', 'querer', 'irr', { pres: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'], fut: 'voudr', pp: 'voulu', subjs: ['veuill', 'voul'], ps: ['u', 'voul'], imp: ['veuille', 'veuillons', 'veuillez'] }),
  V('savoir', 'saber', 'irr', { pres: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'], fut: 'saur', pp: 'su', subjs: ['sach', 'sach'], ps: ['u', 's'], imp: ['sache', 'sachons', 'sachez'] }),
  V('devoir', 'deber, tener que', 'irr', { pres: ['dois', 'dois', 'doit', 'devons', 'devez', 'doivent'], fut: 'devr', pp: 'dû', ps: ['u', 'd'] }),
  V('falloir', 'hacer falta (il faut)', 'irr', { only3: true, pres: [null, null, 'faut', null, null, null], fut: 'faudr', pp: 'fallu', imparf: 'fall', subjs: ['faill', 'faill'], ps: ['u', 'fall'], imp: [null, null, null] }),
  // Irregular -ir / -oir / -re
  V('venir', 'venir', 'irr2', { pres: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'], fut: 'viendr', pp: 'venu', aux: 'être', ps: ['in', 'v'] }),
  V('tenir', 'sostener, tener', 'irr2', { pres: ['tiens', 'tiens', 'tient', 'tenons', 'tenez', 'tiennent'], fut: 'tiendr', pp: 'tenu', ps: ['in', 't'] }),
  V('prendre', 'coger, tomar', 'irr2', { pres: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'], pp: 'pris', ps: ['i', 'pr'] }),
  V('mettre', 'poner', 'irr2', { pres: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'], pp: 'mis', ps: ['i', 'm'] }),
  V('voir', 'ver', 'irr2', { pres: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], fut: 'verr', pp: 'vu', ps: ['i', 'v'] }),
  V('croire', 'creer', 'irr2', { pres: ['crois', 'crois', 'croit', 'croyons', 'croyez', 'croient'], pp: 'cru', ps: ['u', 'cr'] }),
  V('boire', 'beber', 'irr2', { pres: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'], pp: 'bu', ps: ['u', 'b'] }),
  V('lire', 'leer', 'irr2', { pres: ['lis', 'lis', 'lit', 'lisons', 'lisez', 'lisent'], pp: 'lu', ps: ['u', 'l'] }),
  V('écrire', 'escribir', 'irr2', { pres: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'], pp: 'écrit', ps: ['i', 'écriv'] }),
  V('connaître', 'conocer', 'irr2', { pres: ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent'], pp: 'connu', ps: ['u', 'conn'] }),
  V('partir', 'irse, salir', 'irr2', { pres: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'], pp: 'parti', aux: 'être', ps: ['i', 'part'] }),
  V('sortir', 'salir', 'irr2', { pres: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'], pp: 'sorti', aux: 'être', ps: ['i', 'sort'] }),
  V('dormir', 'dormir', 'irr2', { pres: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'], pp: 'dormi', ps: ['i', 'dorm'] }),
  V('ouvrir', 'abrir', 'irr2', { pres: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'], pp: 'ouvert', ps: ['i', 'ouvr'], er: true }),
  V('recevoir', 'recibir', 'irr2', { pres: ['reçois', 'reçois', 'reçoit', 'recevons', 'recevez', 'reçoivent'], fut: 'recevr', pp: 'reçu', ps: ['u', 'reç'] }),
  V('vivre', 'vivir', 'irr2', { pres: ['vis', 'vis', 'vit', 'vivons', 'vivez', 'vivent'], pp: 'vécu', ps: ['u', 'véc'] }),
  V('suivre', 'seguir', 'irr2', { pres: ['suis', 'suis', 'suit', 'suivons', 'suivez', 'suivent'], pp: 'suivi', ps: ['i', 'suiv'] }),
  V('courir', 'correr', 'irr2', { pres: ['cours', 'cours', 'court', 'courons', 'courez', 'courent'], fut: 'courr', pp: 'couru', ps: ['u', 'cour'] }),
  V('mourir', 'morir', 'irr2', { pres: ['meurs', 'meurs', 'meurt', 'mourons', 'mourez', 'meurent'], fut: 'mourr', pp: 'mort', aux: 'être', ps: ['u', 'mour'] }),
  V('naître', 'nacer', 'irr2', { pres: ['nais', 'nais', 'naît', 'naissons', 'naissez', 'naissent'], pp: 'né', aux: 'être', ps: ['i', 'naqu'] }),
  V('conduire', 'conducir', 'irr2', { pres: ['conduis', 'conduis', 'conduit', 'conduisons', 'conduisez', 'conduisent'], pp: 'conduit', ps: ['i', 'conduis'] }),
  V('craindre', 'temer', 'irr2', { pres: ['crains', 'crains', 'craint', 'craignons', 'craignez', 'craignent'], pp: 'craint', ps: ['i', 'craign'] }),
  V('plaire', 'gustar, agradar', 'irr2', { pres: ['plais', 'plais', 'plaît', 'plaisons', 'plaisez', 'plaisent'], pp: 'plu', ps: ['u', 'pl'] }),
  V('rire', 'reír', 'irr2', { pres: ['ris', 'ris', 'rit', 'rions', 'riez', 'rient'], pp: 'ri', ps: ['i', 'r'] }),
  V('s’asseoir', 'sentarse', 'irr2', { pron: true, pres: ['assieds', 'assieds', 'assied', 'asseyons', 'asseyez', 'asseyent'], fut: 'assiér', pp: 'assis', ps: ['i', 'ass'] }),
  V('paraître', 'parecer', 'irr2', { pres: ['parais', 'parais', 'paraît', 'paraissons', 'paraissez', 'paraissent'], pp: 'paru', ps: ['u', 'par'] }),
  V('battre', 'batir, golpear', 'irr2', { pres: ['bats', 'bats', 'bat', 'battons', 'battez', 'battent'], pp: 'battu', ps: ['i', 'batt'] }),
  V('servir', 'servir', 'irr2', { pres: ['sers', 'sers', 'sert', 'servons', 'servez', 'servent'], pp: 'servi', ps: ['i', 'serv'] }),
  V('sentir', 'sentir, oler', 'irr2', { pres: ['sens', 'sens', 'sent', 'sentons', 'sentez', 'sentent'], pp: 'senti', ps: ['i', 'sent'] }),
  V('offrir', 'regalar, ofrecer', 'irr2', { pres: ['offre', 'offres', 'offre', 'offrons', 'offrez', 'offrent'], pp: 'offert', ps: ['i', 'offr'], er: true }),
  V('pleuvoir', 'llover (il pleut)', 'irr2', { only3: true, pres: [null, null, 'pleut', null, null, null], imparf: 'pleuv', fut: 'pleuvr', pp: 'plu', subjs: ['pleuv', 'pleuv'], ps: ['u', 'pl'], imp: [null, null, null] }),
];

const VOWEL = /^[aeiouéèêëàâîïôûùœh]/i;
const H_ASPIRÉ = /^(haïr|héros|honte|hâte|hasard|hurler|haut|hache|harceler)/;
export const elides = (f) => VOWEL.test(f) && !H_ASPIRÉ.test(f);
const base = (v) => v.w.replace(/^(se |s’)/, '');
const type = (v) => (v.er ? 'er' : /er$/.test(base(v)) && v.group !== 'irr' && v.group !== 'irr2' ? 'er' : v.group === 'ir' ? 'ir' : v.group === 're' ? 're' : 'x');
const REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];
const refl = (p, f) => (p === 3 || p === 4 ? REFL[p] + ' ' : elides(f) ? REFL[p][0] + '’' : REFL[p] + ' ');

// Join stem + ending keeping the sound of c / g (mangeons, commençons; mangions, commencions).
function join(stem, e) {
  if (/^[aoâû]/.test(e)) { if (/g$/.test(stem)) stem += 'e'; else if (/c$/.test(stem)) stem = stem.slice(0, -1) + 'ç'; }
  else if (/^[eéiî]/.test(e)) { if (/ge$/.test(stem)) stem = stem.slice(0, -1); else if (/ç$/.test(stem)) stem = stem.slice(0, -1) + 'c'; }
  return stem + e;
}
// Stem of an -er verb before a silent ending (appelle, jette, achète, préfère, paie).
function muteStem(v, stem) {
  switch (v.sp) {
    case 'll': return stem + 'l';
    case 'tt': return stem + 't';
    case 'è': return stem.replace(/e([^aeiouéèê]+)$/, 'è$1');
    case 'é': return stem.replace(/é([^aeiouéèê]+)$/, 'è$1');
    case 'y': return stem.replace(/y$/, 'i');
    default: return stem;
  }
}

function present(v, p) {
  if (v.pres) return v.pres[p];
  const w = base(v), t = type(v), stem = w.slice(0, -2);
  if (t === 'er') {
    const e = ['e', 'es', 'e', 'ons', 'ez', 'ent'][p];
    return join([0, 1, 2, 5].includes(p) ? muteStem(v, stem) : stem, e);
  }
  if (t === 'ir') return stem + ['is', 'is', 'it', 'issons', 'issez', 'issent'][p];
  return stem + ['s', 's', '', 'ons', 'ez', 'ent'][p];
}
const imparfStem = (v) => v.imparf || present(v, 3)?.replace(/ons$/, '') || '';
function imparfait(v, p) { return join(imparfStem(v), ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'][p]); }
function futStem(v) {
  if (v.fut) return v.fut;
  const w = base(v), t = type(v);
  if (t === 'er') return v.sp && v.sp !== 'é' ? muteStem(v, w.slice(0, -2)) + 'er' : w;
  return w.replace(/e$/, '');
}
function subjunctive(v, p) {
  if (v.subj) return v.subj[p];
  const s1 = v.subjs ? v.subjs[0] : (present(v, 5) || '').replace(/ent$/, '');
  const s2 = v.subjs ? v.subjs[1] : imparfStem(v);
  return join([0, 1, 2, 5].includes(p) ? s1 : s2, ['e', 'es', 'e', 'ions', 'iez', 'ent'][p]);
}
function passeSimple(v, p) {
  let [k, stem] = v.ps || (type(v) === 'er' ? ['a', base(v).slice(0, -2)] : ['i', base(v).slice(0, -2)]);
  const E = {
    a: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
    i: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
    u: ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'],
    in: ['ins', 'ins', 'int', 'înmes', 'întes', 'inrent'],
  }[k];
  if (v.w === 'avoir') return ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent'][p];
  return join(stem, E[p]);
}
export function participle(v) {
  if (v.pp) return v.pp;
  const t = type(v), stem = base(v).slice(0, -2);
  return t === 'er' ? stem + 'é' : t === 'ir' ? stem + 'i' : stem + 'u';
}
export const auxOf = (v) => (v.aux === 'être' || v.pron ? 'être' : 'avoir');
const AUX = { être: VERBS.find(x => x.w === 'être'), avoir: VERBS.find(x => x.w === 'avoir') };
function compound(v, p, auxTense) {
  const a = auxOf(v), pp = participle(v);
  const pl = [3, 4, 5].includes(p);
  const agree = a === 'être' && !v.only3 ? pp + (/s$/.test(pp) ? (pl ? '(es)' : '(e)') : (pl ? '(e)s' : '(e)')) : pp;
  return conjugate(AUX[a], auxTense, p) + ' ' + agree;
}
function imperative(v, p) {
  const i = { 1: 0, 3: 1, 4: 2 }[p];
  if (i === undefined) return null;
  if (v.imp) return v.imp[i];
  let f = present(v, p);
  if (p === 1 && (type(v) === 'er' || v.er)) f = f.replace(/s$/, '');
  return f;
}

// Form for person p (0–5) without the subject pronoun; reflexive pronouns are included (me lève, nous sommes levés).
export function conjugate(v, tense, p) {
  if (v.only3 && p !== 2) return null;
  let f;
  switch (tense) {
    case 'pres': f = present(v, p); break;
    case 'imparf': f = imparfait(v, p); break;
    case 'fut': f = join(futStem(v), ['ai', 'as', 'a', 'ons', 'ez', 'ont'][p]); break;
    case 'cond': f = join(futStem(v), ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'][p]); break;
    case 'subj': f = subjunctive(v, p); break;
    case 'ps': f = passeSimple(v, p); break;
    case 'pc': f = compound(v, p, 'pres'); break;
    case 'pqp': f = compound(v, p, 'imparf'); break;
    case 'condp': f = compound(v, p, 'cond'); break;
    case 'imp': {
      f = imperative(v, p);
      if (f && v.pron) f += '-' + { 1: 'toi', 3: 'nous', 4: 'vous' }[p];
      return f;
    }
    default: return '';
  }
  if (!f) return f;
  return v.pron ? refl(p, f) + f : f;
}

// Subject pronoun + form, with elision (j’aime, je m’habille) and que before the subjunctive.
export function withSubject(v, tense, p) {
  const f = conjugate(v, tense, p);
  if (!f) return '—';
  if (tense === 'imp') return f;
  const subj = v.only3 ? 'il' : ['je', 'tu', 'il', 'nous', 'vous', 'ils'][p];
  const s = subj === 'je' && elides(f) ? 'j’' + f : subj + ' ' + f;
  if (tense !== 'subj') return s;
  return (/^[aeiouéèêiy]/.test(s) ? 'qu’' : 'que ') + s;
}

export function gerund(v) {
  const f = present(v, 3) || (v.w === 'falloir' ? null : '');
  if (v.w === 'être') return 'étant';
  if (v.w === 'avoir') return 'ayant';
  if (v.w === 'savoir') return 'sachant';
  if (!f) return '—';
  return join(f.replace(/ons$/, ''), 'ant');
}

// Any verb (for the text tools): a verb of the table, a compound of one (comprendre ← prendre, devenir ← venir),
// a verb of the same pattern (construire ← conduire, peindre ← craindre, apercevoir ← recevoir) or a regular one.
const PATTERNS = [['uire', 'conduire'], ['indre', 'craindre'], ['aître', 'connaître'], ['rir', 'offrir'], ['cevoir', 'recevoir'], ['entir', 'sentir']];
function clone(b, w, k) {
  const oldPre = b.w.slice(0, b.w.length - k), newPre = w.slice(0, w.length - k);
  const f = (x) => (typeof x !== 'string' ? x : oldPre === '' ? newPre + x : x.startsWith(oldPre) ? newPre + x.slice(oldPre.length) : x);
  const o = { ...b, w, es: '', group: 'derived' };
  for (const key of ['pres', 'subj', 'subjs', 'imp']) if (b[key]) o[key] = b[key].map(f);
  for (const key of ['fut', 'pp', 'imparf']) if (b[key]) o[key] = f(b[key]);
  if (b.ps) o.ps = [b.ps[0], f(b.ps[1])];
  return o;
}
export function verbFor(w0) {
  const pron = /^(se |s’|s')/.test(w0);
  const w = w0.replace(/^(se |s’|s')/, '');
  let v = VERBS.find(x => x.w.replace(/^(se |s’)/, '') === w);
  if (!v) {
    const base = VERBS.filter(x => !x.pron && !['er', 'sp', 'ir', 're'].includes(x.group) && w.endsWith(x.w) && w.length > x.w.length)
      .sort((a, b) => b.w.length - a.w.length)[0];
    const pat = PATTERNS.find(([suf]) => w.endsWith(suf));
    if (base && (!pat || base.w.length >= pat[0].length)) v = clone(base, w, base.w.length);
    else if (pat) v = clone(VERBS.find(x => x.w === pat[1]), w, pat[0].length);
  }
  if (!v) {
    if (/er$/.test(w)) {
      const sp = /^(appeler|rappeler|jeter|rejeter|projeter)$/.test(w) ? 'll' : /y[e]r$/.test(w) ? 'y' : /é[^aeiouéèêy]+er$/.test(w) ? 'é' : /e[^aeiouéèêy]{1}er$/.test(w) ? 'è' : undefined;
      v = { w, es: '', group: sp ? 'sp' : 'er', ...(sp ? { sp } : {}) };
    } else if (/ir$/.test(w)) v = { w, es: '', group: 'ir' };
    else v = { w, es: '', group: 're' };
  }
  return pron && !v.pron ? { ...v, pron: true } : v;
}
