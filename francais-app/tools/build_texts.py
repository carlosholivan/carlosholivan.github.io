"""Builds data/<level>/texts.json (graded readings of the French app) from tools/texts_src/<level>.txt.

Source format (one text per block, Spanish translations only after the line "#! es"):
  === <unit> | French title ¦ Spanish title
  sum: Spanish summary
  p: French paragraph            (+ continuation line of the same paragraph, e.g. dialogue turns)
  = Spanish translation          (=+ continuation line of the translation)
  note: fragment ¦ kind ¦ explanation in Spanish     (kind: see NOTE_KINDS in js/tenses.js)
  q: French question ¦ Spanish question ¦ option / option / option ¦ index of the right one ¦ why (Spanish)

Computed:
  glossary   every word of the text with its meaning (course vocabulary, tools/texts_src/extra_gloss.txt, the lemma
             given by spaCy fr_core_news_lg, the verb forms of js/conj.js and plural / feminine endings)
  verbs      verb phrases with their tense (passé composé, futur proche, subjonctif…), found with the conjugation
             tables of js/conj.js (spaCy's tense tags are not reliable enough)
  difficult  the level's words that appear in the text, closest lessons first
  gaps       words for the fill-in-the-gaps exercise
Usage: python3 tools/build_texts.py [level…]
"""
import json, random, re, subprocess, sys
from pathlib import Path
import spacy

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
SEP = '¦'
LET = 'A-Za-zÀ-ÖØ-öø-ÿŒœÆæ'
WORD = re.compile(rf"[Aa]ujourd['’]hui|[{LET}]+(?:['’](?=[{LET}]))?")   # same tokens as js/views/texts.js
ART = re.compile(r"^(le |la |les |l'|l’|se |s'|s’)")
nlp = spacy.load('fr_core_news_lg')


def bare(w):
    """'le livre' → 'livre', "l'école" → 'école' (nouns are listed with their article)."""
    return ART.sub('', w.lower().replace('’', "'"))


# ── meanings ─────────────────────────────────────────────────────────────
VOC, LVOF, HEAD = {}, {}, {}
for lv in LEVELS:
    p = ROOT / 'data' / lv / 'vocab.json'
    if not p.exists():
        continue
    for v in json.loads(p.read_text(encoding='utf8')):
        k = bare(v['word'])
        VOC.setdefault(k, v['m']); LVOF.setdefault(k, lv); HEAD.setdefault(k, v['word'])
EXTRA = {}
xp = ROOT / 'tools' / 'texts_src' / 'extra_gloss.txt'
if xp.exists():
    for line in open(xp, encoding='utf8'):
        if line.strip() and not line.startswith('#'):
            w, es = [x.strip() for x in line.rstrip('\n').split('|')][:2]
            EXTRA[w.lower().replace('’', "'")] = {'es': es}
ELID = {"t": '(t de enlace: a-t-il)', "l'": 'el / la (delante de vocal)', "j'": 'yo', "d'": 'de', "qu'": 'que', "n'": 'no (ne)', "s'": 'se / si', "c'": 'esto, eso (ce)',
        "m'": 'me', "t'": 'te', "jusqu'": 'hasta (jusque)', "lorsqu'": 'cuando (lorsque)', "puisqu'": 'puesto que (puisque)', "quelqu'": 'alguien (quelqu’un)'}
PHRASES = sorted([k for k in list(VOC) + list(EXTRA) if len(WORD.findall(k)) > 1], key=len, reverse=True)
FUNC = set("le la les l' un une des du de d' à au aux et ou mais donc or ni car je j' tu il elle on nous vous ils elles me m' te t' se s' lui leur leurs y en ce c' cet cette ces "
           "mon ma mes ton ta tes son sa ses notre nos votre vos qui que qu' quoi dont où ne n' pas plus est sont a ont être avoir dans sur sous par pour avec sans "
           "chez si oui non très bien aussi tout tous toute toutes".split())
NUMS = set('un deux trois quatre cinq six sept huit neuf dix onze douze vingt trente cent mille premier aller faire dire avoir être'.split())


def mean(k):
    return EXTRA.get(k) or VOC.get(k)


def with_head(k, m, lem=None):
    """Meaning shown in the reader: the dictionary form (with its article for nouns) when it differs from the word."""
    h = HEAD.get(k, k)
    if lem and lem != h:
        return {'es': f'{lem}: {m["es"]}'}
    if h != k:
        return {'es': f'{h}: {m["es"]}'}
    return m


# ── verb forms (js/conj.js) ──────────────────────────────────────────────
SIMPLE = ['pres', 'imparf', 'fut', 'cond', 'subj', 'ps', 'imp']
FORMS, PPS, PPRES, INFS, PPL = {}, {}, {}, set(), {}
ETRE_VERBS = set('aller venir arriver partir sortir entrer rentrer rester tomber naître mourir devenir revenir monter descendre retourner passer parvenir intervenir survenir décéder'.split())


def load_forms(lemmas):
    js = f"""import('{(ROOT / 'js' / 'conj.js').as_uri()}').then(m => {{
      const out = {{}};
      for (const w of JSON.parse(process.argv[1])) {{
        const v = m.verbFor(w); const o = {{ pp: m.participle(v), ger: m.gerund(v) }};
        for (const t of {json.dumps(SIMPLE)}) o[t] = [0, 1, 2, 3, 4, 5].map(p => {{ try {{ return m.conjugate({{ ...v, pron: false }}, t, p); }} catch (e) {{ return null; }} }});
        out[w] = o;
      }}
      console.log(JSON.stringify(out));
    }})"""
    r = subprocess.run(['node', '--input-type=module', '-e', js, json.dumps(sorted(lemmas))], capture_output=True, text=True, timeout=300)
    if r.returncode:
        raise SystemExit(r.stderr)
    for w, o in json.loads(r.stdout).items():
        INFS.add(w)
        pp = o['pp']
        for suf in ('', 'e', 's', 'es'):
            if pp and not (pp.endswith('s') and suf in ('s',)):
                PPS.setdefault(pp + suf, w)
                PPL.setdefault(pp + suf, set()).add(w)
        if o['ger'] and o['ger'] != '—':
            PPRES.setdefault(o['ger'], w)
        for t in SIMPLE:
            for p, f in enumerate(o[t]):
                if f:
                    FORMS.setdefault(f, []).append((w, t, p))


def verb_lemmas():
    out = set()
    for lv in LEVELS:
        p = ROOT / 'data' / lv / 'vocab.json'
        if p.exists():
            for v in json.loads(p.read_text(encoding='utf8')):
                w = bare(v['word'])
                if re.search(r'(er|ir|re|oir)$', w) and ' ' not in w and ('verb' in v.get('pos', '') or w in ('être', 'avoir')):
                    out.add(w)
    return out


load_forms(verb_lemmas() | {'être', 'avoir', 'aller', 'venir', 'faire', 'pouvoir', 'devoir', 'vouloir', 'savoir', 'falloir'})
INF_OF = {}
for f, lst in FORMS.items():
    for w, t, p in lst:
        INF_OF.setdefault(f, w)


def gloss_of(k, tok):
    """Meaning of the word k (lower case) whose spaCy token is tok (or None)."""
    if k in ELID:
        return {'es': ELID[k]}
    m = mean(k)
    if m:
        return with_head(k, m)
    cands = []
    if tok is not None:
        cands.append(tok.lemma_.lower())
    cands += [INF_OF.get(k), PPS.get(k), PPRES.get(k)]
    s = k
    cands += [s[:-1] if s.endswith(('s', 'x')) else None, s[:-1] if s.endswith('e') else None, s[:-2] if s.endswith('es') else None,
              s[:-3] + 'al' if s.endswith('aux') else None, s[:-1] if s.endswith('eaux') else None, s[:-4] + 'eux' if s.endswith('euse') else None,
              s[:-3] + 'if' if s.endswith('ive') else None, s[:-4] + 'if' if s.endswith('ives') else None, s[:-3] + 'er' if s.endswith('ère') else None,
              s[:-4] + 'er' if s.endswith('ères') else None, s[:-2] if s.endswith('ne') and s[-3:-2] in 'neo' else None, s[:-3] if s.endswith('nes') else None,
              s[:-4] + 'eur' if s.endswith('euse') else None, s[:-4] + 'teur' if s.endswith('trice') else None, s[:-5] + 'teur' if s.endswith('trices') else None]
    for c in cands:
        if c and c != k and len(c) > 1 and mean(c):
            return {'es': f'{HEAD.get(c, c)}: {mean(c)["es"]}'}
    return None


# ── verb phrases ─────────────────────────────────────────────────────────
SKIP = set("ne n' pas plus jamais rien point guère déjà toujours encore bien mal beaucoup peu trop vraiment souvent même aussi tout enfin jamais".split())
SUBJ_PRON = set("je j' tu il elle on nous vous ils elles qui".split())
REFL = set("me m' te t' se s' nous vous".split())
OBJ = set("en y le la l' les lui leur".split())
AUX_TENSE = {'pres': 'pc', 'imparf': 'pqp', 'fut': 'futant', 'cond': 'condp', 'subj': 'subjp', 'ps': 'pqp'}
MODALS = {'pouvoir', 'devoir', 'vouloir', 'savoir', 'falloir'}
SUBJ_TRIG = re.compile(r"\b(faut|faudrait|veux|veut|voulez|voudrais|voudrait|souhaite|aimerais|bien que|pour que|afin que|avant que|sans que|à moins que|jusqu'à ce que|"
                       r"peur|content|contente|heureux|heureuse|désolé|désolée|important|nécessaire|essentiel|possible|impossible|dommage|doute|douter|pense pas|crois pas|exige|préfère|regrette|étonnant|normal)\b")


def tenses_of(f, lemma=None):
    return [(w, t, p) for (w, t, p) in FORMS.get(f, []) if lemma is None or w == lemma]


def inverted(text, e):
    """Verb followed by -je / -tu / -il … in a question (allez-vous ?) — not an imperative."""
    m = re.match(r"-(t-)?(je|tu|il|elle|on|nous|vous|ils|elles)\b", text[e:])
    if not m:
        return False
    end = re.search(r"[.!?]", text[e:])
    return bool(end and end.group(0) == '?')


def verb_phrases(text, toks, doc):
    """toks: [(start, end, lower)] with the JS tokenisation; doc: spaCy doc of the same text."""
    pos = {t.idx: t for t in doc}
    out, used = [], set()
    n = len(toks)

    def nxt(i):
        j = i + 1
        while j < n and toks[j][2] in SKIP:
            j += 1
        return j if j < n else None

    def inf_after(j):
        """Index of the infinitive at j, skipping object pronouns (de m'appeler, de le faire)."""
        while j < n and (toks[j][2] in OBJ or toks[j][2] in REFL):
            j += 1
        return j if j < n and toks[j][2] in INFS else None

    def is_verb(i):
        s, e, k = toks[i]
        t = pos.get(s)
        if not (FORMS.get(k) or k in PPS or k in INFS or k in PPRES):
            return False
        if t is not None and t.pos_ in ('VERB', 'AUX'):
            return True
        prev = toks[i - 1][2] if i else ''
        return prev in SUBJ_PRON or prev in REFL or prev in ("n'", 'ne', 'que', "qu'")

    for i in range(n):
        if i in used or not is_verb(i):
            continue
        s, e, k = toks[i]
        cands = FORMS.get(k, [])
        lemmas = {w for w, _, _ in cands}
        j = nxt(i)
        jk = toks[j][2] if j is not None else ''
        kind, end, lem = None, i, None
        # compound tenses and the passive: avoir / être + participle
        if lemmas & {'avoir', 'être'} and j is not None and jk in PPS:
            auxl = 'être' if 'être' in lemmas else 'avoir'
            at = [t for w, t, p in cands if w == auxl]
            ppl = PPS[jk]
            sp = pos.get(toks[j][0])
            if sp is not None and sp.lemma_.lower() in PPL.get(jk, ()):
                ppl = sp.lemma_.lower()
            if jk == 'plu' and 'il' == (toks[i - 1][2] if i else ''):
                ppl = 'pleuvoir'
            if auxl == 'être' and jk.startswith('été') is False and j + 1 < n and False:
                pass
            if auxl == 'avoir' and jk == 'été':           # a été + participle → passive
                j2 = nxt(j)
                if j2 is not None and toks[j2][2] in PPS:
                    kind, end, lem = 'pas', j2, PPS[toks[j2][2]]
            if kind is None:
                refl = i > 0 and toks[i - 1][2] in REFL
                if auxl == 'être' and ppl not in ETRE_VERBS and not refl and ppl != 'être':
                    kind, end, lem = 'pas', j, ppl
                else:
                    kind, end, lem = AUX_TENSE.get(at[0] if at else 'pres', 'pc'), j, ppl
        elif 'aller' in lemmas and j is not None and jk in INFS and any(t in ('pres', 'imparf') for w, t, p in cands if w == 'aller'):
            kind, end, lem = 'futproche', j, jk
        elif 'venir' in lemmas and j is not None and jk in ('de', "d'") and inf_after(j + 1) is not None:
            k2 = inf_after(j + 1)
            kind, end, lem = 'passerec', k2, toks[k2][2]
        elif 'être' in lemmas and j is not None and jk == 'en' and j + 3 < n and toks[j + 1][2] == 'train' and toks[j + 2][2] in ('de', "d'") and toks[j + 3][2] in INFS:
            kind, end, lem = 'encours', j + 3, toks[j + 3][2]
        elif 'faire' in lemmas and j is not None and jk in INFS and jk not in ('être', 'avoir'):
            kind, end, lem = 'causatif', j, jk
        elif lemmas & MODALS and j is not None and jk in INFS:
            kind, end, lem = 'modal', j, jk
        if kind is None:
            if i > 0 and toks[i - 1][2] == 'en' and k in PPRES:
                kind, lem = 'ger', PPRES[k]
                s = toks[i - 1][0]
            elif k in INFS and not cands:
                kind, lem = 'inf', k
            elif cands:
                ts = [t for w, t, p in cands]
                lem = cands[0][0]
                sent_start = text.rfind('.', 0, s)
                before = text[max(0, sent_start):s].lower()
                prev = toks[i - 1][2] if i else ''
                if 'subj' in ts and ('pres' not in ts or (re.search(r"\bqu[e']", before[-40:]) and SUBJ_TRIG.search(before))):
                    kind = 'subj'
                elif 'imp' in ts and prev not in SUBJ_PRON and prev not in REFL and prev not in OBJ and prev not in ('que', "qu'", 'se', "s'") and not inverted(text, e):
                    kind = 'imp'
                elif 'pres' in ts:
                    kind = 'pres'
                elif 'imparf' in ts:
                    kind = 'imparf'
                elif 'fut' in ts:
                    kind = 'fut'
                elif 'cond' in ts:
                    kind = 'cond'
                elif 'ps' in ts:
                    kind = 'ps'
                elif 'subj' in ts:
                    kind = 'subj'
                else:
                    continue
                if k in INFS:
                    kind = 'inf'
            else:
                continue
        for x in range(i, end + 1):
            used.add(x)
        lem = lem or k
        m = mean(lem)
        if not m:
            continue
        out.append({'s': s, 'e': toks[end][1], 't': kind, 'l': lem, 'm': m})
    return out


def parse(lv):
    p = ROOT / 'tools' / 'texts_src' / f'{lv}.txt'
    texts, cur, para = [], None, None
    for raw in open(p, encoding='utf8'):
        line = raw.rstrip('\n')
        if not line.strip() or line.startswith('#'):
            continue
        m = re.match(r'^=== (\d+) \| (.*)$', line)
        if m:
            cur = {'unit': int(m.group(1)), 'title': [x.strip() for x in m.group(2).split(SEP)][:2], 'paras': [], 'notes': [], 'qs': []}
            texts.append(cur); continue
        if line.startswith('sum:'):
            cur['sum'] = line[4:].strip()
        elif line.startswith('p:'):
            para = [line[2:].strip()]; cur['paras'].append(para)
        elif line.startswith('+ '):
            para[0] += '\n' + line[2:]
        elif line.startswith('=+'):
            para[-1] += '\n' + line[2:].strip()
        elif line.startswith('='):
            para.append(line[1:].strip())
        elif line.startswith('note:'):
            cur['notes'].append([x.strip() for x in line[5:].split(SEP)])
        elif line.startswith('q:'):
            cur['qs'].append([x.strip() for x in line[2:].split(SEP)])
        else:
            raise SystemExit(f'{lv}: unknown line: {line}')
    return texts


def build(lv):
    texts = parse(lv)
    vocab = json.loads((ROOT / 'data' / lv / 'vocab.json').read_text(encoding='utf8'))
    levelwords = {bare(v['word']): v for v in vocab}
    out, missing = [], {}
    for n, tx in enumerate(texts, 1):
        paras = [p[0] for p in tx['paras']]
        for p in tx['paras']:
            assert len(p) == 2, (lv, tx['title'][0], p[0][:40], len(p))
        g, verbs, found = {}, [], []
        for pi, para in enumerate(paras):
            doc = nlp(para.replace('’', "'"))
            bystart = {t.idx: t for t in doc}
            toks = [(m.start(), m.end(), m.group(0).lower().replace('’', "'")) for m in WORD.finditer(para)]
            for s, e, k in toks:
                t = bystart.get(s)
                if t is not None and t.pos_ == 'PROPN' and not mean(k) and para[s:s + 1].isupper():
                    continue
                m = gloss_of(k, t)
                if m:
                    g.setdefault(k, m)
                    lem = (t.lemma_.lower() if t is not None else k)
                    if k in levelwords and k not in FUNC:
                        found.append((k, para[s:e]))
                    elif lem in levelwords and lem not in FUNC:
                        found.append((lem, para[s:e]))
                elif not (t is not None and t.like_num) and not para[s:s + 1].isupper():
                    missing.setdefault(k, tx['title'][0])
                elif para[s:s + 1].isupper() and not (t is not None and t.pos_ == 'PROPN'):
                    missing.setdefault(k, tx['title'][0])
            # parts of a hyphenated word (week-end, sous-titres) get the meaning of the whole word
            for hm in re.finditer(rf"[{LET}]+(?:-[{LET}]+)+", para):
                whole = hm.group(0).lower()
                m = mean(whole)
                if m:
                    for part in whole.split('-'):
                        if part not in g or not mean(part):
                            g[part] = {'es': f'{whole}: {m["es"]}'}
                            missing.pop(part, None)
            low = ' ' + ' '.join(k for _, _, k in toks) + ' '
            for ph in PHRASES:
                phn = ' '.join(m.group(0).lower() for m in WORD.finditer(ph))
                if phn and f' {phn} ' in low:
                    if ph not in g:
                        g[ph] = mean(ph)
                        if ph in levelwords:
                            found.append((ph, ph))
                    for part in phn.split():            # d'abord → abord, grâce à → grâce
                        if part not in g:
                            g[part] = {'es': f'{ph}: {mean(ph)["es"]}'}
                            missing.pop(part, None)
            for v in verb_phrases(para, toks, doc):
                verbs.append({'p': pi, 'f': para[v['s']:v['e']], 'l': v['l'], 't': v['t'], 'per': '', 'm': v['m']})
        seen = set(); vv = []
        for v in verbs:
            key = (v['p'], v['f'])
            if key not in seen:
                seen.add(key); vv.append(v)
        notes = []
        for nt in tx['notes']:
            f, k, es = nt[:3]
            pi = next((i for i, q in enumerate(paras) if f in q), None)
            if pi is None:
                raise SystemExit(f'{lv} "{tx["title"][0]}": note fragment not found: {f}')
            notes.append({'p': pi, 'f': f, 'k': k, 'e': {'es': es}})
        qs = []
        for q in tx['qs']:
            opts = [x.strip() for x in q[2].split(' / ')]
            qs.append({'q': {'fr': q[0], 'es': q[1]}, 'options': opts, 'answer': int(q[3]), 'explain': {'es': q[4]}})
        rank = {bare(v['word']): (v.get('unit') or 999) for v in vocab}
        diff, dseen = [], set()
        for lem, surf in sorted(found, key=lambda x: abs(rank.get(x[0], 999) - tx['unit'])):
            if lem not in dseen and lem not in FUNC and lem not in NUMS and len(lem) > 2:
                dseen.add(lem); diff.append(lem)
        diff = diff[:12]
        rnd = random.Random(f'{lv}{n}')
        surfaces = []
        for lem, surf in found:
            if lem in diff and surf not in surfaces and ' ' not in surf and "'" not in surf and re.search(rf'(?<![{LET}])' + re.escape(surf) + rf'(?![{LET}])', '\n'.join(paras)):
                surfaces.append(surf)
        items = surfaces[:8]
        pool = [bare(v['word']) for v in vocab if bare(v['word']) not in dseen and ' ' not in bare(v['word']) and bare(v['word']).isalpha()]
        out.append({'id': f'{lv}-t{n}', 'level': lv, 'unit': tx['unit'], 'order': n,
                    'title': {'fr': tx['title'][0], 'es': tx['title'][1]}, 'summary': {'es': tx.get('sum', '')},
                    'paragraphs': paras, 'translation': {'es': [p[1] for p in tx['paras']]},
                    'glossary': g, 'difficult': diff, 'questions': qs,
                    'gaps': {'items': items, 'distractors': rnd.sample(pool, 6)}, 'verbs': vv, 'notes': notes})
    (ROOT / 'data' / lv / 'texts.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'{lv}: {len(out)} texts · {sum(len(t["verbs"]) for t in out)} verbs · {sum(len(t["notes"]) for t in out)} notes · {len(missing)} words without meaning')
    if missing:
        print('  missing:', ', '.join(sorted(missing)))


if __name__ == '__main__':
    for lv in sys.argv[1:] or [l for l in LEVELS if (ROOT / 'tools' / 'texts_src' / f'{l}.txt').exists()]:
        build(lv)
