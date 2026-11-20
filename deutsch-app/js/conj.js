// German verb conjugation. Weak verbs follow the regular pattern (with the e-insertion of arbeiten / öffnen
// and the -eln / -ern verbs); strong, mixed and irregular verbs take their principal parts from STRONG.
// Prefixed verbs are built from their base: separable (aufstehen → stehe … auf, aufgestanden),
// inseparable (verstehen → verstanden, no ge-). Reflexive verbs are written "sich freuen".
// Same exports as the conjugation modules of the sibling apps, so the shared views work unchanged.

export const PERSONS = [
  { id: 0, de: 'ich', es: 'yo', en: 'I' },
  { id: 1, de: 'du', es: 'tú', en: 'you (sg.)' },
  { id: 2, de: 'er / sie / es', es: 'él / ella / ello', en: 'he / she / it' },
  { id: 3, de: 'wir', es: 'nosotros', en: 'we' },
  { id: 4, de: 'ihr', es: 'vosotros', en: 'you (pl.)' },
  { id: 5, de: 'sie / Sie', es: 'ellos / usted(es)', en: 'they / you (formal)' },
];
export const IMP_PERSONS = [
  { id: 1, de: '(du)', es: 'tú', en: 'you (sg.)' }, { id: 4, de: '(ihr)', es: 'vosotros', en: 'you (pl.)' }, { id: 5, de: '(Sie)', es: 'usted(es)', en: 'you (formal)' },
];

export const TENSES = [
  { id: 'praes', de: 'Präsens', es: 'Presente', en: 'Present',
    note: { es: 'Lo que pasa ahora, hábitos y también el futuro con un adverbio de tiempo (Morgen fahre ich nach Berlin). Los verbos fuertes cambian la vocal en du y er/sie/es: fahren → du fährst, lesen → er liest.', en: 'What happens now, habits, and also the future with a time adverb (Morgen fahre ich nach Berlin). Strong verbs change their vowel with du and er/sie/es: fahren → du fährst, lesen → er liest.' } },
  { id: 'perf', de: 'Perfekt', es: 'Pretérito perfecto (pasado hablado)', en: 'Present perfect (spoken past)',
    note: { es: 'haben o sein + participio II al final de la frase. Es el pasado de la lengua hablada. Con sein: verbos de movimiento y cambio de estado (gehen, fahren, aufstehen, sterben) y sein, bleiben, werden.', en: 'haben or sein + past participle at the end of the clause. It is the past tense of spoken German. sein is used with verbs of motion and change of state (gehen, fahren, aufstehen, sterben) and with sein, bleiben, werden.' } },
  { id: 'praet', de: 'Präteritum', es: 'Pretérito (pasado escrito)', en: 'Simple past (written past)',
    note: { es: 'El pasado de la narración escrita. Al hablar se usa sobre todo con sein (war), haben (hatte), los modales (konnte, musste) y es gibt (es gab). Débiles: -te; fuertes: cambio de vocal (fahren → fuhr).', en: 'The past tense of written narration. In speech it is mostly used with sein (war), haben (hatte), the modals (konnte, musste) and es gibt (es gab). Weak verbs add -te; strong verbs change their vowel (fahren → fuhr).' } },
  { id: 'plusq', de: 'Plusquamperfekt', es: 'Pluscuamperfecto', en: 'Past perfect',
    note: { es: 'hatte / war + participio II: algo anterior a otro hecho pasado, típico tras nachdem (Nachdem er gegessen hatte, ging er los).', en: 'hatte / war + past participle: something that happened before another past event, typical after nachdem (Nachdem er gegessen hatte, ging er los).' } },
  { id: 'fut1', de: 'Futur I', es: 'Futuro', en: 'Future',
    note: { es: 'werden + infinitivo al final: planes, promesas y predicciones, y también suposiciones sobre el presente (Er wird wohl krank sein).', en: 'werden + infinitive at the end: plans, promises and predictions, and also assumptions about the present (Er wird wohl krank sein).' } },
  { id: 'fut2', de: 'Futur II', es: 'Futuro perfecto', en: 'Future perfect',
    note: { es: 'werden + participio II + haben/sein: algo terminado antes de un momento futuro, o una suposición sobre el pasado (Er wird den Zug verpasst haben).', en: 'werden + past participle + haben/sein: something finished before a future moment, or an assumption about the past (Er wird den Zug verpasst haben).' } },
  { id: 'k2', de: 'Konjunktiv II', es: 'Condicional / subjuntivo II', en: 'Subjunctive II (conditional)',
    note: { es: 'Deseos, hipótesis y cortesía: wäre, hätte, könnte, müsste, würde… Con la mayoría de los verbos se usa würde + infinitivo (ich würde fahren); con sein, haben, los modales y algunos verbos fuertes frecuentes, la forma simple (ich käme, ich ginge).', en: 'Wishes, hypotheses and politeness: wäre, hätte, könnte, müsste, würde… Most verbs use würde + infinitive (ich würde fahren); sein, haben, the modals and some frequent strong verbs use the one-word form (ich käme, ich ginge).' } },
  { id: 'k2v', de: 'Konjunktiv II Vergangenheit', es: 'Condicional compuesto', en: 'Past subjunctive II',
    note: { es: 'hätte / wäre + participio II: lo que habría pasado (Wenn ich das gewusst hätte, wäre ich gekommen) y reproches (Du hättest anrufen sollen).', en: 'hätte / wäre + past participle: what would have happened (Wenn ich das gewusst hätte, wäre ich gekommen) and reproaches (Du hättest anrufen sollen).' } },
  { id: 'k1', de: 'Konjunktiv I', es: 'Subjuntivo I (estilo indirecto)', en: 'Subjunctive I (reported speech)',
    note: { es: 'Raíz del infinitivo + -e, -est, -e, -en, -et, -en. Se usa sobre todo en la 3.ª persona para el estilo indirecto en prensa y textos formales (Er sagte, er sei krank). Si coincide con el indicativo se sustituye por el Konjunktiv II.', en: 'Infinitive stem + -e, -est, -e, -en, -et, -en. Used mainly in the 3rd person for reported speech in the press and formal texts (Er sagte, er sei krank). Where it looks like the indicative, Konjunktiv II is used instead.' } },
  { id: 'imp', de: 'Imperativ', es: 'Imperativo', en: 'Imperative',
    note: { es: 'du: raíz (+e) sin pronombre (Komm! Arbeite! Nimm!); los verbos e → i mantienen el cambio (geben → gib), los a → ä no (fahren → fahr). ihr: como el presente sin pronombre (Kommt!). Sie: infinitivo + Sie (Kommen Sie!).', en: 'du: stem (+e) without the pronoun (Komm! Arbeite! Nimm!); verbs with e → i keep the change (geben → gib), verbs with a → ä do not (fahren → fahr). ihr: like the present without the pronoun (Kommt!). Sie: infinitive + Sie (Kommen Sie!).' } },
];

// Strong, mixed and irregular base verbs: infinitive : er-form of the present when the vowel changes : Präteritum : Partizip II : auxiliary (h, s, hs, sh) [: Konjunktiv II]
// A Präteritum ending in -te (or wurde) takes the weak endings (mixed verbs).
const STRONG_SRC = `
backen::backte:gebacken:h
befehlen:befiehlt:befahl:befohlen:h
beginnen::begann:begonnen:h
beißen::biss:gebissen:h
bergen:birgt:barg:geborgen:h
biegen::bog:gebogen:hs
bieten::bot:geboten:h
binden::band:gebunden:h
bitten::bat:gebeten:h
blasen:bläst:blies:geblasen:h
bleiben::blieb:geblieben:s
braten:brät:briet:gebraten:h
brechen:bricht:brach:gebrochen:hs
brennen::brannte:gebrannt:h
bringen::brachte:gebracht:h:brächte
denken::dachte:gedacht:h:dächte
dringen::drang:gedrungen:s
empfehlen:empfiehlt:empfahl:empfohlen:h
erschrecken:erschrickt:erschrak:erschrocken:s
essen:isst:aß:gegessen:h
fahren:fährt:fuhr:gefahren:sh
fallen:fällt:fiel:gefallen:s
fangen:fängt:fing:gefangen:h
finden::fand:gefunden:h:fände
flechten:flicht:flocht:geflochten:h
fliegen::flog:geflogen:sh
fliehen::floh:geflohen:s
fließen::floss:geflossen:s
fressen:frisst:fraß:gefressen:h
frieren::fror:gefroren:h
gebären::gebar:geboren:h
geben:gibt:gab:gegeben:h:gäbe
gedeihen::gedieh:gediehen:s
gehen::ging:gegangen:s:ginge
gelingen::gelang:gelungen:s
gelten:gilt:galt:gegolten:h
genesen::genas:genesen:s
genießen::genoss:genossen:h
geschehen:geschieht:geschah:geschehen:s
gewinnen::gewann:gewonnen:h
gießen::goss:gegossen:h
gleichen::glich:geglichen:h
gleiten::glitt:geglitten:s
graben:gräbt:grub:gegraben:h
greifen::griff:gegriffen:h
halten:hält:hielt:gehalten:h
hängen::hing:gehangen:h
heben::hob:gehoben:h
heißen::hieß:geheißen:h
helfen:hilft:half:geholfen:h
kennen::kannte:gekannt:h
klingen::klang:geklungen:h
kommen::kam:gekommen:s:käme
kriechen::kroch:gekrochen:s
laden:lädt:lud:geladen:h
lassen:lässt:ließ:gelassen:h:ließe
laufen:läuft:lief:gelaufen:s
leiden::litt:gelitten:h
leihen::lieh:geliehen:h
lesen:liest:las:gelesen:h
liegen::lag:gelegen:h:läge
lügen::log:gelogen:h
meiden::mied:gemieden:h
messen:misst:maß:gemessen:h
misslingen::misslang:misslungen:s
nehmen:nimmt:nahm:genommen:h
nennen::nannte:genannt:h
pfeifen::pfiff:gepfiffen:h
preisen::pries:gepriesen:h
raten:rät:riet:geraten:h
reiben::rieb:gerieben:h
reißen::riss:gerissen:hs
reiten::ritt:geritten:sh
rennen::rannte:gerannt:s
riechen::roch:gerochen:h
ringen::rang:gerungen:h
rufen::rief:gerufen:h
saufen:säuft:soff:gesoffen:h
scheiden::schied:geschieden:hs
scheinen::schien:geschienen:h
schieben::schob:geschoben:h
schießen::schoss:geschossen:h
schlafen:schläft:schlief:geschlafen:h
schlagen:schlägt:schlug:geschlagen:h
schleichen::schlich:geschlichen:s
schließen::schloss:geschlossen:h
schmeißen::schmiss:geschmissen:h
schmelzen:schmilzt:schmolz:geschmolzen:s
schneiden::schnitt:geschnitten:h
schreiben::schrieb:geschrieben:h
schreien::schrie:geschrien:h
schreiten::schritt:geschritten:s
schweigen::schwieg:geschwiegen:h
schwimmen::schwamm:geschwommen:sh
schwinden::schwand:geschwunden:s
schwören::schwor:geschworen:h
sehen:sieht:sah:gesehen:h
singen::sang:gesungen:h
sinken::sank:gesunken:s
sinnen::sann:gesonnen:h
sitzen::saß:gesessen:h
spinnen::spann:gesponnen:h
sprechen:spricht:sprach:gesprochen:h
sprießen::spross:gesprossen:s
springen::sprang:gesprungen:s
stechen:sticht:stach:gestochen:h
stehen::stand:gestanden:h
stehlen:stiehlt:stahl:gestohlen:h
steigen::stieg:gestiegen:s
sterben:stirbt:starb:gestorben:s
stinken::stank:gestunken:h
stoßen:stößt:stieß:gestoßen:h
streichen::strich:gestrichen:h
streiten::stritt:gestritten:h
tragen:trägt:trug:getragen:h
treffen:trifft:traf:getroffen:h
treiben::trieb:getrieben:h
treten:tritt:trat:getreten:hs
trinken::trank:getrunken:h
trügen::trog:getrogen:h
verderben:verdirbt:verdarb:verdorben:hs
vergessen:vergisst:vergaß:vergessen:h
verlieren::verlor:verloren:h
verzeihen::verzieh:verziehen:h
wachsen:wächst:wuchs:gewachsen:s
wägen::wog:gewogen:h
waschen:wäscht:wusch:gewaschen:h
weichen::wich:gewichen:s
weisen::wies:gewiesen:h
werben:wirbt:warb:geworben:h
werfen:wirft:warf:geworfen:h
wiegen::wog:gewogen:h
winden::wand:gewunden:h
ziehen::zog:gezogen:hs
zwingen::zwang:gezwungen:h
`;

// Fully irregular verbs: present forms, Präteritum (weak endings when it ends in -te / -de), Partizip II, aux, Konjunktiv II, Konjunktiv I
const IRR = {
  sein: { pres: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'], praet: 'war', pp: 'gewesen', aux: 's', k2: 'wäre', k1: ['sei', 'seist', 'sei', 'seien', 'seiet', 'seien'], imp: ['sei', 'seid', 'seien Sie'] },
  haben: { pres: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'], praet: 'hatte', pp: 'gehabt', aux: 'h', k2: 'hätte' },
  werden: { pres: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'], praet: 'wurde', pp: 'geworden', aux: 's', k2: 'würde' },
  wissen: { pres: ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'], praet: 'wusste', pp: 'gewusst', aux: 'h', k2: 'wüsste' },
  tun: { pres: ['tue', 'tust', 'tut', 'tun', 'tut', 'tun'], praet: 'tat', pp: 'getan', aux: 'h', k2: 'täte', imp: ['tu', 'tut', 'tun Sie'] },
  können: { pres: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'], praet: 'konnte', pp: 'gekonnt', aux: 'h', k2: 'könnte', modal: true },
  müssen: { pres: ['muss', 'musst', 'muss', 'müssen', 'müsst', 'müssen'], praet: 'musste', pp: 'gemusst', aux: 'h', k2: 'müsste', modal: true },
  dürfen: { pres: ['darf', 'darfst', 'darf', 'dürfen', 'dürft', 'dürfen'], praet: 'durfte', pp: 'gedurft', aux: 'h', k2: 'dürfte', modal: true },
  sollen: { pres: ['soll', 'sollst', 'soll', 'sollen', 'sollt', 'sollen'], praet: 'sollte', pp: 'gesollt', aux: 'h', k2: 'sollte', modal: true },
  wollen: { pres: ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'], praet: 'wollte', pp: 'gewollt', aux: 'h', k2: 'wollte', modal: true },
  mögen: { pres: ['mag', 'magst', 'mag', 'mögen', 'mögt', 'mögen'], praet: 'mochte', pp: 'gemocht', aux: 'h', k2: 'möchte', modal: true },
};

export const STRONG = {};
for (const line of STRONG_SRC.trim().split('\n')) {
  const [inf, p3, praet, pp, aux, k2] = line.split(':');
  STRONG[inf] = { p3: p3 || null, praet, pp, aux, k2: k2 || null };
}

// Weak verbs that take sein in the Perfekt, and auxiliaries of derived verbs that differ from their base.
const SEIN_WEAK = new Set(('reisen wandern folgen begegnen passieren landen klettern joggen segeln rudern paddeln tauchen starten scheitern explodieren verunglücken ' +
  'erwachen aufwachen erkranken platzen stolpern stürzen rutschen eilen bummeln spazieren flüchten radeln sprinten verreisen auswandern einwandern zurückkehren ' +
  'heimkehren umkehren abstürzen ausrutschen erröten verblühen verwelken vertrocknen erfrieren einschlafen aufstehen auftauchen schmelzen trocknen ' +
  'verschwinden zusammenbrechen zusammenstoßen joggen surfen gelangen geraten erstarren altern verarmen verstummen').split(' '));
const AUX_FIX = {
  bekommen: 'h', gefallen: 'h', verstehen: 'h', erfahren: 'h', bestehen: 'h', entstehen: 's', erscheinen: 's', vergehen: 's', entkommen: 's', ertrinken: 's',
  einschlafen: 's', aufstehen: 's', auftreten: 's', vorkommen: 's', ankommen: 's', zunehmen: 'h', abnehmen: 'h', befahren: 'h', verlassen: 'h', übersetzen: 'h',
  umziehen: 's', einziehen: 's', ausziehen: 's', anziehen: 'h', aufwachsen: 's', entgehen: 's', zergehen: 's', geschehen: 's', begehen: 'h', übergehen: 'h',
  umgehen: 's', verfahren: 'h', erfrieren: 's', gefrieren: 's', entfliehen: 's', zerbrechen: 's', abbrechen: 'h', aufbrechen: 's', ausbrechen: 's', einbrechen: 's',
  ausgehen: 's', untergehen: 's', aufgehen: 's', bestehenbleiben: 's', entscheiden: 'h', verbleiben: 's', ausfallen: 's', einfallen: 's', auffallen: 's', gefallen_: 'h',
  zurückfahren: 's', verlaufen: 's', aufhören: 'h', loslaufen: 's', weglaufen: 's', abfahren: 's', losfahren: 's', mitfahren: 's', vorbeikommen: 's',
};
// Weak verbs that only look like a prefix + strong verb.
const WEAK_LIKE = new Set(['bereiten', 'begleiten', 'verbreiten', 'bearbeiten', 'beleiten', 'gelangen', 'verlangen', 'erlangen', 'bewegen', 'beantragen',
  'veranlassen', 'beauftragen', 'veranstalten', 'verwenden', 'schaffen', 'senden', 'wenden', 'beschaffen', 'erschaffen_', 'bestreiten_', 'bebauen', 'beerdigen', 'befreien', 'erleichtern']);

// Separable and inseparable prefixes. über-, unter-, um-, durch-, wider-, wieder- are inseparable in the verbs of INSEP.
const SEP = ['zurecht', 'zusammen', 'zurück', 'entgegen', 'gegenüber', 'herunter', 'heraus', 'herein', 'herauf', 'herbei', 'hinaus', 'hinein', 'hinauf', 'hinunter',
  'vorbei', 'voraus', 'voran', 'vorüber', 'weiter', 'wieder', 'nieder', 'bereit', 'kennen', 'kaputt', 'spazieren', 'stehen', 'statt', 'empor', 'durch', 'fern', 'fest', 'fort',
  'frei', 'heim', 'hoch', 'klar', 'nach', 'offen', 'teil', 'übrig', 'unter', 'über', 'wahr', 'weg', 'dar', 'her', 'hin', 'los', 'mit', 'vor', 'ab', 'an', 'auf', 'aus', 'bei', 'ein', 'um', 'zu'];
// Verbs that only look separable.
const NOT_SEP = new Set('herrschen hindern antworten ankern umgarnen zuckern mitteln hinken abonnieren analysieren einigen'.split(' '));
const INSEP_PRE = ['miss', 'emp', 'ent', 'ver', 'zer', 'be', 'er', 'ge'];
const INSEP = new Set(('übersetzen überlegen übernehmen überraschen übertreiben überzeugen überweisen übertragen überholen überleben überprüfen übersehen überstehen ' +
  'überwinden überwachen überfallen überlassen überschreiten übertreffen überqueren übernachten überreden überschätzen überwiegen überfordern übergeben ' +
  'unterbrechen unterhalten unternehmen unterrichten unterscheiden unterschreiben unterstützen untersuchen unterdrücken unterlassen unterliegen unterschätzen unterstreichen unterziehen ' +
  'umarmen umgeben umfassen umringen umkreisen umschreiben durchsuchen durchqueren durchschauen durchdringen durchlaufen widersprechen widerstehen widerlegen ' +
  'wiederholen hinterlassen hintergehen vollenden vollziehen frühstücken').split(' '));

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isBase = (w) => has(STRONG, w) || has(IRR, w);

// Splits a verb into { refl, sep, insep, base }: "sich anziehen" → { refl: true, sep: 'an', base: 'ziehen' }.
export function analyse(w0) {
  let w = w0.trim(), refl = false;
  if (/^sich /.test(w)) { refl = true; w = w.slice(5); }
  const out = { w: w0, inf: w, refl, sep: '', insep: '', base: w };
  if (isBase(w) || INSEP.has(w) || WEAK_LIKE.has(w)) {
    if (INSEP.has(w)) out.insep = INSEP_PRE.find(p => w.startsWith(p)) || w.match(/^(über|unter|um|durch|wider|wieder|hinter|voll)/)?.[0] || '';
    if (out.insep && isBase(w.slice(out.insep.length))) out.base = w.slice(out.insep.length);
    return out;
  }
  for (const p of SEP) {
    if (w.startsWith(p) && w.length > p.length + 2) {
      const rest = w.slice(p.length);
      if (/^(n|en|ern|eln)$/.test(rest)) continue;
      if (!/(en|ern|eln|n)$/.test(rest) || rest.length < 3) continue;
      const sub = analyse(rest);
      // a separable prefix when the rest is a verb we know or looks like one (a consonant first: an-fangen, auf-passen; not "an-tworten")
      if (isBase(rest) || isBase(sub.base) || WEAK_LIKE.has(rest) || INSEP.has(rest) || (/^[bcdfghjklmnpqrstvwxzß]/.test(rest) && !NOT_SEP.has(w))) {
        out.sep = p; out.base = sub.base; out.insep = sub.insep; out.sub = rest;
        return out;
      }
    }
  }
  const ip = INSEP_PRE.find(p => w.startsWith(p) && w.length > p.length + 3);
  if (ip) {
    out.insep = ip;
    const rest = w.slice(ip.length);
    if (isBase(rest) && !WEAK_LIKE.has(w)) out.base = rest;
  }
  return out;
}

const UML = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' };
const stemOf = (inf) => inf.replace(/(e?n)$/, '');
// e-insertion: arbeiten → arbeitest, öffnen → öffnest (consonant + m/n, but not lm, rn, hn…)
const needsE = (stem) => /[td]$/.test(stem) || (/[^aeiouäöülrh][mn]$/.test(stem) && !/(mm|nn)$/.test(stem));
const sibilant = (stem) => /(s|ß|z|x|ss)$/.test(stem);

function weakPresent(inf, p) {
  if (/(eln|ern)$/.test(inf)) {
    const st = inf.slice(0, -1);   // sammel-, wander-
    if (p === 0) return /eln$/.test(inf) ? st.replace(/el$/, 'le') : st + 'e';
    return [null, st + 'st', st + 't', inf, st + 't', inf][p];
  }
  const st = stemOf(inf);
  const e = needsE(st) ? 'e' : '';
  return [st + 'e', st + (sibilant(st) ? (e ? 'est' : 't') : e + 'st'), st + e + 't', st + 'en', st + e + 't', st + 'en'][p];
}

function strongPresent(inf, d, p) {
  if (d.p3 && (p === 1 || p === 2)) {
    const er = d.p3;
    if (p === 2) return er;
    // du-form from the er-form: fährt → fährst, liest → liest, hält → hältst, tritt → trittst, lädt → lädst
    if (/(st|ßt)$/.test(er)) return er;
    if (/ädt$/.test(er)) return er.replace(/t$/, 'st');
    if (/(ält|ät|itt|ilt|icht)$/.test(er)) return er + 'st';
    return er.replace(/t$/, 'st');
  }
  return weakPresent(inf, p);
}

// Present of the base verb (no prefix), person p
function presentBase(base, p) {
  if (has(IRR, base)) return IRR[base].pres[p];
  if (has(STRONG, base)) return strongPresent(base, STRONG[base], p);
  return weakPresent(base, p);
}

function weakPraetStem(inf) {
  if (/(eln|ern)$/.test(inf)) return inf.slice(0, -1) + 'te';
  const st = stemOf(inf);
  return st + (needsE(st) ? 'ete' : 'te');
}
function praetBase(base, p) {
  let pr;
  if (has(IRR, base)) pr = IRR[base].praet;
  else if (has(STRONG, base)) pr = STRONG[base].praet;
  else pr = weakPraetStem(base);
  if (/(te|de)$/.test(pr)) return [pr, pr + 'st', pr, pr + 'n', pr + 't', pr + 'n'][p];
  // strong: fuhr, fuhrst, fuhr, fuhren, fuhrt, fuhren (fand → fandest, fandet; las → lasest)
  const e = /[td]$/.test(pr) ? 'e' : '';
  const du = sibilant(pr) ? pr + 'est' : pr + e + 'st';
  return [pr, du, pr, pr + 'en', pr + e + 't', pr + 'en'][p];
}
function k2Base(base, p) {
  let k;
  if (has(IRR, base)) k = IRR[base].k2;
  else if (has(STRONG, base)) {
    const d = STRONG[base];
    if (d.k2) k = d.k2;
    else if (/te$/.test(d.praet)) k = d.praet;
    else k = d.praet.replace(/(au|[aou])(?=[^aouäöü]*$)/, (m) => (m === 'au' ? 'äu' : UML[m])) + (/e$/.test(d.praet) ? '' : 'e');
  } else k = weakPraetStem(base);
  if (/e$/.test(k)) return [k, k + 'st', k, k + 'n', k + 't', k + 'n'][p];
  return [k, k + 'st', k, k + 'n', k + 't', k + 'n'][p];
}
function k1Base(base, p) {
  if (has(IRR, base) && IRR[base].k1) return IRR[base].k1[p];
  const st = /(eln|ern)$/.test(base) ? base.slice(0, -1) : stemOf(base);
  if (has(IRR, base) && IRR[base].modal) return [st + 'e', st + 'est', st + 'e', st + 'en', st + 'et', st + 'en'][p];
  if (/(eln|ern)$/.test(base)) return [st.replace(/el$/, 'le') + '', st + 'est', st + 'e', base, st + 'et', base][p].replace(/^(.*)$/, (x) => x);
  return [st + 'e', st + 'est', st + 'e', st + 'en', st + 'et', st + 'en'][p];
}
function ppBase(a) {
  const { base, insep } = a;
  let pp;
  if (has(IRR, base)) pp = IRR[base].pp;
  else if (has(STRONG, base)) pp = STRONG[base].pp;
  else pp = 'ge' + weakPraetStem(base).replace(/e$/, '').replace(/te$/, 't').replace(/([^e])t$/, '$1t');
  if (!has(IRR, base) && !has(STRONG, base)) {
    const st = /(eln|ern)$/.test(base) ? base.slice(0, -1) : stemOf(base);
    pp = 'ge' + st + (needsE(st) && !/(eln|ern)$/.test(base) ? 'et' : 't');
  }
  // no ge- after an inseparable prefix and in -ieren verbs
  if (insep || /ieren$/.test(base)) pp = pp.replace(/^ge/, '');
  return pp;
}

const STRONG_LIKE = (a) => isBase(a.base);

// The verb as stored in the tables.
export function verbFor(w0, x = {}) {
  const found = VERBS.find(v => v.w === w0);
  if (found) return found;
  return { w: w0, es: '', en: '', group: 'derived', ...x };
}

function info(v) {
  if (!v._a) Object.defineProperty(v, '_a', { value: analyse(v.w), enumerable: false });
  return v._a;
}

// Finite form of the whole verb without the separable prefix: verstehe, stehe (+ auf separately)
function finite(v, tense, p) {
  const a = info(v);
  const head = a.sep ? (a.sub || a.inf.slice(a.sep.length)) : a.inf;
  const ins = head.slice(0, head.length - a.base.length);     // ver-, be-… in front of a known base
  const known = isBase(a.base) && !WEAK_LIKE.has(head);
  const b = known ? a.base : head;
  let f;
  if (tense === 'praes') f = known ? presentBase(b, p) : weakPresent(b, p);
  else if (tense === 'praet') f = praetBase(b, p);
  else if (tense === 'k2') f = k2Base(b, p);
  else if (tense === 'k1') f = k1Base(b, p);
  return (known ? ins : '') + f;
}

export function participle(v) {
  const a = info(v);
  const head = a.sep ? (a.sub || a.inf.slice(a.sep.length)) : a.inf;
  const ins = head.slice(0, head.length - a.base.length);
  const known = isBase(a.base) && !WEAK_LIKE.has(head);
  let pp;
  if (known) {
    pp = ppBase({ base: a.base, insep: '' });
    if (ins) pp = ins + pp.replace(/^ge/, '');
  } else {
    pp = ppBase({ base: head, insep: a.insep && !a.sep ? a.insep : (INSEP_PRE.some(p => head.startsWith(p) && head.length > p.length + 3) || INSEP.has(head) ? 'x' : '') });
  }
  if (v.pp) pp = v.pp;
  return (a.sep || '') + pp;
}

export const auxOf = (v) => {
  const a = info(v);
  if (v.aux) return v.aux;
  if (a.refl) return 'haben';
  if (has(AUX_FIX, a.inf)) return AUX_FIX[a.inf] === 's' ? 'sein' : 'haben';
  if (SEIN_WEAK.has(a.inf)) return 'sein';
  const head = a.sep ? (a.sub || a.inf.slice(a.sep.length)) : a.inf;
  if (has(AUX_FIX, head)) return AUX_FIX[head] === 's' ? 'sein' : 'haben';
  if (SEIN_WEAK.has(head)) return 'sein';
  const d = has(IRR, a.base) ? IRR[a.base] : has(STRONG, a.base) ? STRONG[a.base] : null;
  if (!d || WEAK_LIKE.has(head)) return 'haben';
  // an inseparable prefix usually makes a motion verb transitive (bekommen, verstehen): haben
  if (head !== a.base && a.insep) return 'haben';
  return /^s/.test(d.aux) ? 'sein' : 'haben';
};

const REFL = ['mich', 'dich', 'sich', 'uns', 'euch', 'sich'];
const SUBJ = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
const HABEN = { w: 'haben' }, SEIN = { w: 'sein' }, WERDEN = { w: 'werden' };
// Verbs whose one-word Konjunktiv II is common; the rest use würde + infinitive.
const K2_SIMPLE = new Set(['sein', 'haben', 'werden', 'wissen', 'können', 'müssen', 'dürfen', 'sollen', 'wollen', 'mögen', 'kommen', 'gehen', 'geben', 'lassen', 'finden', 'brauchen', 'liegen', 'tun', 'bekommen', 'denken', 'bringen']);

function imperative(v, p) {
  const a = info(v);
  if (has(IRR, a.inf) && IRR[a.inf].imp) return IRR[a.inf].imp[{ 1: 0, 4: 1, 5: 2 }[p]];
  if (IRR[a.base] && IRR[a.base].modal) return null;
  const sep = a.sep ? ' ' + a.sep : '';
  const r = a.refl ? ' ' + ({ 1: 'dich', 4: 'euch', 5: 'sich' }[p]) : '';
  if (p === 5) return a.inf.slice(a.sep.length) + ' Sie' + r + sep;
  if (p === 4) return finite(v, 'praes', 4) + r + sep;
  // du: e → i/ie verbs keep the change (gib, lies, nimm, sieh); a → ä do not (fahr, lauf)
  const du = finite(v, 'praes', 1);
  const head = a.sep ? (a.sub || a.inf.slice(a.sep.length)) : a.inf;
  let f;
  const d = STRONG[a.base];
  if (d && d.p3 && /[ie]/.test(d.p3) && !/[äöüa]/.test(d.p3.replace(/[^aeiouäöü]/g, '').slice(0, 1)) && /e/.test(a.base.replace(/en$/, ''))) {
    f = du.replace(/s?t$/, '').replace(/ss$/, 'ss');
    if (a.base === 'sehen') f = (head.slice(0, head.length - 5)) + 'sieh';
    if (/isst$/.test(du)) f = du.replace(/isst$/, 'iss');
    if (/liest$/.test(du)) f = du.replace(/liest$/, 'lies');
  } else {
    const st = /(eln|ern)$/.test(head) ? head.slice(0, -1) : stemOf(head);
    f = (needsE(st) || /ig$/.test(st)) && !/(eln|ern)$/.test(head) ? st + 'e' : st;
    if (/eln$/.test(head)) f = st.replace(/el$/, 'le');
    if (/ern$/.test(head)) f = st + 'e';
  }
  return f + r + sep;
}

// Form for person p (0–5) without the subject pronoun: "stehe auf", "bin aufgestanden", "freue mich", "werde fahren".
export function conjugate(v, tense, p) {
  const a = info(v);
  const r = a.refl ? ' ' + REFL[p] : '';
  const sep = a.sep ? ' ' + a.sep : '';
  const inf = a.inf;
  const pp = participle(v);
  const aux = auxOf(v) === 'sein' ? SEIN : HABEN;
  switch (tense) {
    case 'praes': case 'praet': case 'k1':
      return finite(v, tense, p) + r + sep;
    case 'k2':
      if (K2_SIMPLE.has(a.base) && (a.base === inf || a.sep || isBase(a.base))) return finite(v, 'k2', p) + r + sep;
      return finite(WERDEN, 'k2', p) + r + ' ' + inf;
    case 'perf': return finite(aux, 'praes', p) + r + ' ' + pp;
    case 'plusq': return finite(aux, 'praet', p) + r + ' ' + pp;
    case 'k2v': return finite(aux, 'k2', p) + r + ' ' + pp;
    case 'fut1': return finite(WERDEN, 'praes', p) + r + ' ' + inf;
    case 'fut2': return finite(WERDEN, 'praes', p) + r + ' ' + pp + ' ' + aux.w;
    case 'imp': return imperative(v, p);
    default: return '';
  }
}

// Subject pronoun + form (ich stehe auf); the imperative has no subject.
export function withSubject(v, tense, p) {
  const f = conjugate(v, tense, p);
  if (!f) return '—';
  if (tense === 'imp') return f + '!';
  return SUBJ[p] + ' ' + f;
}

// Partizip I (lesend, laufend): used as an adjective or adverb.
export function gerund(v) {
  const a = info(v);
  if (a.inf === 'sein') return 'seiend';
  if (a.inf === 'tun') return 'tuend';
  return a.inf + 'd';
}

// "fährt, fuhr, ist gefahren" — the principal parts shown with strong, mixed and irregular verbs.
export function principalParts(w) {
  const v = verbFor(w);
  const a = info(v);
  const head = a.sep ? (a.sub || a.inf.slice(a.sep.length)) : a.inf;
  if (!isBase(a.base) || WEAK_LIKE.has(head)) return '';
  const aux = auxOf(v) === 'sein' ? 'ist' : 'hat';
  return `${conjugate({ w: a.inf }, 'praes', 2)}, ${conjugate({ w: a.inf }, 'praet', 2)}, ${aux} ${participle(v)}`;
}

// Verbs of the conjugation page.
const V = (w, es, en, group, x = {}) => ({ w, es, en, group, ...x });
export const VERBS = [
  // the most irregular
  V('sein', 'ser, estar', 'to be', 'irr'),
  V('haben', 'tener, haber', 'to have', 'irr'),
  V('werden', 'llegar a ser, volverse; (auxiliar)', 'to become; (auxiliary)', 'irr'),
  V('wissen', 'saber', 'to know (a fact)', 'irr'),
  V('tun', 'hacer', 'to do', 'irr'),
  // modals
  V('können', 'poder, saber hacer', 'can, to be able to', 'modal'),
  V('müssen', 'tener que, deber', 'must, to have to', 'modal'),
  V('dürfen', 'poder (tener permiso)', 'may, to be allowed to', 'modal'),
  V('sollen', 'deber (por encargo)', 'should, to be supposed to', 'modal'),
  V('wollen', 'querer', 'to want', 'modal'),
  V('mögen', 'gustar; (möchte) querría', 'to like; (möchte) would like', 'modal'),
  // weak
  V('machen', 'hacer', 'to do, to make', 'weak'),
  V('spielen', 'jugar, tocar (un instrumento)', 'to play', 'weak'),
  V('wohnen', 'vivir (en un sitio)', 'to live (somewhere)', 'weak'),
  V('lernen', 'aprender, estudiar', 'to learn, to study', 'weak'),
  V('kaufen', 'comprar', 'to buy', 'weak'),
  V('arbeiten', 'trabajar', 'to work', 'weak'),
  V('warten', 'esperar', 'to wait', 'weak'),
  V('öffnen', 'abrir', 'to open', 'weak'),
  V('reisen', 'viajar', 'to travel', 'weak'),
  V('tanzen', 'bailar', 'to dance', 'weak'),
  V('sammeln', 'coleccionar, recoger', 'to collect', 'weak'),
  V('wandern', 'hacer senderismo', 'to hike', 'weak'),
  V('studieren', 'estudiar (en la universidad)', 'to study (at university)', 'weak'),
  // strong
  V('fahren', 'ir (en vehículo), conducir', 'to go (by vehicle), to drive', 'strong'),
  V('schlafen', 'dormir', 'to sleep', 'strong'),
  V('laufen', 'correr, andar', 'to run, to walk', 'strong'),
  V('sprechen', 'hablar', 'to speak', 'strong'),
  V('geben', 'dar', 'to give', 'strong'),
  V('nehmen', 'tomar, coger', 'to take', 'strong'),
  V('essen', 'comer', 'to eat', 'strong'),
  V('helfen', 'ayudar', 'to help', 'strong'),
  V('lesen', 'leer', 'to read', 'strong'),
  V('sehen', 'ver', 'to see', 'strong'),
  V('gehen', 'ir (a pie), andar', 'to go, to walk', 'strong'),
  V('kommen', 'venir', 'to come', 'strong'),
  V('bleiben', 'quedarse', 'to stay', 'strong'),
  V('schreiben', 'escribir', 'to write', 'strong'),
  V('finden', 'encontrar; opinar', 'to find; to think', 'strong'),
  V('trinken', 'beber', 'to drink', 'strong'),
  V('stehen', 'estar de pie', 'to stand', 'strong'),
  V('sitzen', 'estar sentado', 'to sit', 'strong'),
  V('liegen', 'estar tumbado, encontrarse', 'to lie, to be located', 'strong'),
  V('ziehen', 'tirar de; mudarse', 'to pull; to move', 'strong'),
  V('fliegen', 'volar', 'to fly', 'strong'),
  V('tragen', 'llevar (puesto), cargar', 'to carry, to wear', 'strong'),
  V('treffen', 'encontrarse con, quedar', 'to meet', 'strong'),
  V('vergessen', 'olvidar', 'to forget', 'strong'),
  // mixed
  V('denken', 'pensar', 'to think', 'mixed'),
  V('bringen', 'traer, llevar', 'to bring', 'mixed'),
  V('kennen', 'conocer', 'to know (a person, a place)', 'mixed'),
  V('rennen', 'correr', 'to run', 'mixed'),
  V('nennen', 'llamar, nombrar', 'to name, to call', 'mixed'),
  // separable and inseparable
  V('aufstehen', 'levantarse', 'to get up', 'sep'),
  V('anrufen', 'llamar (por teléfono)', 'to call (on the phone)', 'sep'),
  V('einkaufen', 'hacer la compra', 'to go shopping', 'sep'),
  V('fernsehen', 'ver la tele', 'to watch TV', 'sep'),
  V('mitkommen', 'venir (con alguien)', 'to come along', 'sep'),
  V('ankommen', 'llegar', 'to arrive', 'sep'),
  V('einladen', 'invitar', 'to invite', 'sep'),
  V('verstehen', 'entender', 'to understand', 'insep'),
  V('bekommen', 'recibir, conseguir', 'to get, to receive', 'insep'),
  V('besuchen', 'visitar', 'to visit', 'insep'),
  V('erzählen', 'contar, relatar', 'to tell (a story)', 'insep'),
  V('verlieren', 'perder', 'to lose', 'insep'),
  V('übersetzen', 'traducir', 'to translate', 'insep'),
  // reflexive
  V('sich freuen', 'alegrarse', 'to be glad', 'refl'),
  V('sich waschen', 'lavarse', 'to wash (oneself)', 'refl'),
  V('sich anziehen', 'vestirse', 'to get dressed', 'refl'),
  V('sich interessieren', 'interesarse', 'to be interested', 'refl'),
];
