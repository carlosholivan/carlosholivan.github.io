"""Builds data/<level>/texts.json (graded readings of the German app) from tools/texts_src/<level>.txt.

Source format (one text per block; every translation in Spanish AND English):
  === <unit> | German title ¦ Spanish title ¦ English title
  sum: Spanish summary ¦ English summary
  p: German paragraph            (+ continuation line of the same paragraph, e.g. dialogue turns)
  = Spanish translation          (=+ continuation line)
  ~ English translation          (~+ continuation line)
  note: fragment ¦ kind ¦ explanation in Spanish ¦ explanation in English     (kind: see NOTE_KINDS in js/tenses.js)
  q: German question ¦ Spanish question ¦ English question ¦ option / option / option ¦ index of the right one ¦ why (a quote)

Computed:
  glossary   every word of the text with its meaning {es, en} (course vocabulary, tools/texts_src/extra_gloss.txt,
             the lemma given by spaCy de_core_news_lg, the verb forms of js/conj.js, inflection endings, compounds)
  verbs      verb forms with their tense: TIGER dependencies (oc = verb chain, svp = separable particle) plus the
             conjugation tables of js/conj.js to tell Präsens / Konjunktiv I and Präteritum / Konjunktiv II apart
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
LET = 'A-Za-zÀ-ÖØ-öø-ÿ'
WORD = re.compile(rf"[{LET}]+")          # same tokens as js/views/texts.js
ART = re.compile(r"^(der |die |das |sich )")
nlp = spacy.load('de_core_news_lg')


def bare(w):
    """'der Tisch' → 'tisch', 'sich freuen' → 'freuen' (nouns are listed with their article)."""
    return ART.sub('', w.lower().strip())


# ── meanings ─────────────────────────────────────────────────────────────
VOC, LVOF, HEAD = {}, {}, {}
for lv in LEVELS:
    p = ROOT / 'data' / lv / 'vocab.json'
    if not p.exists():
        continue
    for v in json.loads(p.read_text(encoding='utf8')):
        k = bare(v['word'])
        m = {'es': v['m']['es'], 'en': v['m'].get('en', v['m']['es'])}
        VOC.setdefault(k, m); LVOF.setdefault(k, lv); HEAD.setdefault(k, v['word'])
EXTRA = {}
xp = ROOT / 'tools' / 'texts_src' / 'extra_gloss.txt'
if xp.exists():
    for line in open(xp, encoding='utf8'):
        if line.strip() and not line.startswith('#'):
            parts = [x.strip() for x in line.rstrip('\n').split('|')]
            if len(parts) < 3:
                raise SystemExit(f'extra_gloss: needs word | es | en: {line}')
            EXTRA[bare(parts[0])] = {'es': parts[1], 'en': parts[2]}
            HEAD.setdefault(bare(parts[0]), parts[0])
PHRASES = sorted([k for k in list(VOC) + list(EXTRA) if len(WORD.findall(k)) > 1], key=len, reverse=True)
FUNC = set("der die das den dem des ein eine einen einem einer eines und oder aber denn sondern ich du er sie es wir ihr man mich dich sich uns euch "
           "mir dir ihm ihn ihnen mein meine dein deine sein seine ihr ihre unser unsere euer eure in an auf aus bei mit nach von zu zum zur für um "
           "über unter vor hinter neben zwischen durch gegen ohne nicht kein keine ist sind bin bist hat habe haben war waren wird werden auch "
           "noch schon sehr so wie was wer wo wann dass ob wenn als ja nein doch mal nur dann da hier".split())
NUMS = set('eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf zwanzig hundert tausend sein haben werden machen gehen'.split())


def mean(k):
    return EXTRA.get(k) or VOC.get(k)


def with_head(k, m, lem=None):
    """Meaning shown in the reader: the dictionary form (with its article for nouns) when it differs from the word."""
    h = lem if lem else HEAD.get(k, k)
    if h.lower() != k:
        return {'es': f'{h}: {m["es"]}', 'en': f'{h}: {m["en"]}'}
    return m


# ── verb forms (js/conj.js) ──────────────────────────────────────────────
FORMS, PPS, INFS = {}, {}, set()
K2SET = set('wäre wärst wären wärt hätte hättest hätten hättet würde würdest würden würdet könnte könntest könnten könntet müsste müsstest müssten '
            'dürfte dürftest dürften sollte solltest sollten wüsste wüssten käme kämen ginge gingen gäbe '
            'gäben bräuchte bräuchten täte täten ließe ließen fände fänden bliebe blieben hielte läge lägen stünde stände sähe nähme nähmen hülfe'.split())


def load_forms(lemmas):
    js = f"""import('{(ROOT / 'js' / 'conj.js').as_uri()}').then(m => {{
      const out = {{}};
      for (const w of JSON.parse(process.argv[1])) {{
        try {{
          const v = m.verbFor(w); const o = {{ pp: m.participle(v) }};
          for (const t of ['praes', 'praet', 'k1', 'imp']) o[t] = [0, 1, 2, 3, 4, 5].map(p => {{ try {{ return m.conjugate(v, t, p); }} catch (e) {{ return null; }} }});
          out[w] = o;
        }} catch (e) {{}}
      }}
      console.log(JSON.stringify(out));
    }})"""
    r = subprocess.run(['node', '--input-type=module', '-e', js, json.dumps(sorted(lemmas))], capture_output=True, text=True, timeout=600)
    if r.returncode:
        raise SystemExit(r.stderr)
    for w, o in json.loads(r.stdout).items():
        INFS.add(w)
        if o['pp']:
            PPS.setdefault(o['pp'].lower(), w)
        for t in ('praes', 'praet', 'k1', 'imp'):
            for p, f in enumerate(o[t]):
                if f and ' ' not in f:
                    first = f.lower()
                    if t == 'imp' and p not in (1, 4, 5):
                        continue
                    FORMS.setdefault(first, []).append((w, t, p))


def verb_lemmas():
    out = set()
    for lv in LEVELS:
        p = ROOT / 'data' / lv / 'vocab.json'
        if p.exists():
            for v in json.loads(p.read_text(encoding='utf8')):
                w = bare(v['word'])
                if v.get('pos') == 'verb' and re.fullmatch(rf'[{LET}]+(e?n|ern|eln)', w):
                    out.add(w)
    return out


load_forms(verb_lemmas() | {k for k, m in EXTRA.items() if m['en'].startswith('to ') and re.fullmatch(rf'[{LET}]+n', k)} | {'sein', 'haben', 'werden', 'können', 'müssen', 'dürfen', 'sollen', 'wollen', 'mögen', 'wissen', 'lassen'})
INF_OF = {}
for f, lst in FORMS.items():
    for w, t, p in lst:
        INF_OF.setdefault(f, w)

UML = str.maketrans('äöü', 'aou')
ENDINGS = ['', 'e', 'en', 'n', 'er', 'es', 's', 'em', 'ern', 'nen', 'ns', 'st', 'ste', 'sten', 'ster', 'stem', 'stes', 'est', 'este', 'esten',
           'ere', 'eren', 'erer', 'erem', 'eres']


def stem_cands(s):
    out = []
    for e in ENDINGS:
        if e and not s.endswith(e):
            continue
        b = s[:len(s) - len(e)] if e else s
        if len(b) < 2:
            continue
        out += [b, b + 'e', b + 'en', b + 'n']
        if re.search('[äöü]', b):
            ub = b.translate(UML)
            out += [ub, ub + 'e']
    return out


def zu_inf(s):
    """aufzustehen → aufstehen, kennenzulernen → kennenlernen."""
    m = re.match(rf'^([{LET}]+?)zu([{LET}]+e?n)$', s)
    return m.group(1) + m.group(2) if m and (m.group(1) + m.group(2)) in INFS | set(VOC) else None


def simple_gloss(k):
    m = mean(k)
    if m:
        return with_head(k, m)
    for c in [INF_OF.get(k), PPS.get(k), zu_inf(k)] + stem_cands(k):
        if c and c != k and mean(c):
            return with_head(k, mean(c), HEAD.get(c, c))
    return None


def compound_gloss(k):
    """Kinderzimmer → Kinder + Zimmer: niño + habitación (longest known last part, then a known first part)."""
    for i in range(3, len(k) - 2):
        left, right = k[:i], k[i:]
        mr = simple_gloss(right)
        if not mr or len(right) < 3:
            continue
        for l2 in (left, left[:-1] if left.endswith(('s', 'n', 'e')) else None, left[:-2] if left.endswith('en') else None, left + 'en', left + 'e'):
            if l2 and len(l2) >= 3:
                ml = simple_gloss(l2)
                if ml:
                    hl, hr = HEAD.get(l2, l2), HEAD.get(right, right)
                    clean = lambda s: re.sub(r'^[^:]+: ', '', s)
                    return {'es': f'{k.capitalize()} ({ART.sub("", hl)} + {ART.sub("", hr)}): {clean(ml["es"])} + {clean(mr["es"])}',
                            'en': f'{k.capitalize()} ({ART.sub("", hl)} + {ART.sub("", hr)}): {clean(ml["en"])} + {clean(mr["en"])}'}
    return None


def gloss_of(k, tok, lemma_override=None):
    """Meaning of the word k (lower case) whose spaCy token is tok (or None)."""
    if lemma_override and mean(lemma_override):
        return with_head(k, mean(lemma_override), HEAD.get(lemma_override, lemma_override))
    g = simple_gloss(k)
    if g:
        return g
    if tok is not None:
        lem = tok.lemma_.lower()
        if lem != k and mean(lem):
            return with_head(k, mean(lem), HEAD.get(lem, lem))
    return compound_gloss(k)


# ── verb phrases ─────────────────────────────────────────────────────────
MODALS = {'können', 'müssen', 'dürfen', 'sollen', 'wollen', 'mögen', 'möchten'}
SEIN_PERS = {'ich': 0, 'du': 1, 'er': 2, 'sie': 2, 'es': 2, 'man': 2, 'wir': 3, 'ihr': 4}


def chain(tok):
    """Non-finite verbs that depend on tok through oc (the verb chain), in sentence order."""
    out = []
    for c in tok.children:
        if c.dep_ in ('oc', 'pd') and c.tag_ in ('VVPP', 'VVINF', 'VMINF', 'VAINF', 'VAPP', 'VMPP', 'VVIZU', 'VAFIN'):
            if c.tag_ == 'VVIZU' and tok.lemma_ not in ('haben', 'sein', 'scheinen', 'brauchen'):
                continue
            if c.tag_ == 'VAFIN' and c.lemma_ not in ('haben', 'sein'):
                continue
            out.append(c)
            out += chain(c)
    return sorted(out, key=lambda t: t.i)


def base_lemma(tok):
    lem = tok.lemma_.lower()
    f = tok.text.lower()
    if lem not in INFS and f in INF_OF:
        lem = INF_OF[f]
    return lem


def full_lemma(tok):
    lem = base_lemma(tok)
    if tok.tag_ == 'VVPP' and lem == tok.text.lower():
        lem = PPS.get(lem, lem)
    if tok.tag_ == 'VVIZU':
        lem = zu_inf(tok.text.lower()) or lem
    for c in tok.children:
        if c.dep_ == 'svp':
            lem2 = c.text.lower() + lem
            if mean(lem2) or lem2 in INFS:
                return lem2
    return lem


def finite_tense(tok, lem):
    f = tok.text.lower()
    cands = [(w, t, p) for w, t, p in FORMS.get(f, []) if w == lem] or FORMS.get(f, [])
    ts = {t for _, t, _ in cands}
    subj = next((c.text.lower() for c in tok.children if c.dep_ == 'sb'), None)
    h = tok
    while subj is None and h.dep_ in ('cj', 'cd') and h.head is not h:
        h = h.head
        subj = next((c.text.lower() for c in h.children if c.dep_ == 'sb'), None)
    if f in K2SET:
        return 'k2'
    start = tok.i == tok.sent.start or tok.doc[tok.i - 1].is_punct or tok.doc[tok.i - 1].text in ('und', 'bitte', 'Bitte', 'doch', 'mal')
    end = tok.sent.text.rstrip(' “"»«„’)')[-1:]
    nx = tok.doc[tok.i + 1] if tok.i + 1 < len(tok.doc) else None
    if start and nx is not None and nx.text == 'Sie' and end != '?' and f.endswith('en'):
        return 'imp'
    if 'imp' in ts and start and not subj and end != '?':
        if 'praes' not in ts or end == '!':
            return 'imp'
    if 'k1' in ts and 'praes' not in ts:
        return 'k1'
    if 'k1' in ts and 'praes' in ts:
        # habe / komme: Präsens with ich (or plural), Konjunktiv I with a 3rd-person subject
        if subj and subj not in SEIN_PERS and not tok.morph.get('Number') == ['Plur']:
            return 'k1' if any(p == 2 for _, t, p in cands if t == 'k1') else 'praes'
        if subj in ('er', 'sie', 'es', 'man') and any(p == 2 for _, t, p in cands if t == 'k1'):
            return 'k1' if tok.morph.get('Number') != ['Plur'] else 'praes'
        return 'praes'
    if 'praes' in ts:
        return 'praes'
    if 'praet' in ts:
        return 'praet'
    mood, tense = tok.morph.get('Mood'), tok.morph.get('Tense')
    if mood == ['Imp']:
        return 'imp'
    return 'praet' if tense == ['Past'] else 'praes'


def verb_phrases(doc):
    out, used = [], set()
    for tok in doc:
        if tok.i in used:
            continue
        lone_imp = tok.pos_ not in ('VERB', 'AUX') and tok.text[:1].isupper() and tok.i == tok.sent.start \
            and any(t == 'imp' for _, t, _ in FORMS.get(tok.text.lower(), []))
        if lone_imp:
            lem = next(w for w, t, _ in FORMS[tok.text.lower()] if t == 'imp')
            for x in tok.sent[tok.i - tok.sent.start + 1:]:
                if x.text.lower() + lem in INFS or mean(x.text.lower() + lem):
                    lem = x.text.lower() + lem
            if mean(lem):
                used.add(tok.i)
                out.append({'s': tok.idx, 'e': tok.idx + len(tok.text), 't': 'imp', 'l': lem, 'm': mean(lem)})
            continue
        if tok.pos_ not in ('VERB', 'AUX'):
            continue
        if not (tok.tag_.endswith('FIN') or tok.tag_ == 'VVIMP' or tok.tag_ == 'VVIZU'):
            continue
        lem = full_lemma(tok)
        ch = chain(tok)
        kind, main = None, lem
        if ch:
            parts = [c for c in ch]
            vv = [c for c in parts if c.tag_.startswith('VV')]
            mainok = vv[-1] if vv else parts[-1]
            main = full_lemma(mainok)
            base = finite_tense(tok, base_lemma(tok))
            has_pp = any(c.tag_ in ('VVPP', 'VAPP', 'VMPP') for c in parts)
            has_inf = any(c.tag_ in ('VVINF', 'VAINF', 'VMINF') for c in parts)
            tl = base_lemma(tok)
            if tl == 'werden':
                if has_pp and any(c.lemma_ in ('haben', 'sein') for c in parts):
                    kind = 'fut2'
                elif has_pp:
                    kind = 'pas'
                elif has_inf:
                    kind = 'k2' if base == 'k2' else 'fut1'
            elif tl in ('haben', 'sein') and (has_pp or any(c.tag_ == 'VMINF' for c in parts)):
                pp = next((c for c in parts if c.tag_ in ('VVPP', 'VAPP', 'VMPP')), None)
                if tl == 'sein' and pp is not None and pp.dep_ == 'pd':
                    kind = 'zpas'
                elif any(c.lemma_ == 'werden' and c.tag_ in ('VAPP',) or c.text.lower() == 'worden' for c in parts):
                    kind = 'pas'
                else:
                    kind = {'praes': 'perf', 'praet': 'plusq', 'k2': 'k2v', 'k1': 'k1'}.get(base, 'perf')
            elif tl in ('haben', 'sein') and any(c.tag_ == 'VVIZU' for c in parts):
                kind = 'modal'
            elif tl in MODALS:
                kind = 'k2' if base == 'k2' else 'modal'
            elif tl == 'lassen':
                kind = 'lassen'
            elif tl in ('gehen', 'bleiben', 'lernen', 'hören', 'sehen', 'helfen') and has_inf:
                kind = base
                main = lem
                parts = []
            else:
                kind, main, parts = base, lem, []
            if kind is None:
                kind, main, parts = base, lem, []
            items = [tok] + parts
        else:
            if tok.tag_ == 'VVIZU':
                kind = 'zuinf'
            else:
                kind = finite_tense(tok, lem)
            items = [tok]
        m = mean(main)
        if not m:
            continue
        for it in items:
            used.add(it.i)
            out.append({'s': it.idx, 'e': it.idx + len(it.text), 't': kind, 'l': main, 'm': m})
    return out


def src_files(lv):
    """<level>.txt first, then the extra batches <level>-2.txt, <level>-3.txt … (new texts are appended, so ids stay stable)."""
    d = ROOT / 'tools' / 'texts_src'
    return [d / f'{lv}.txt'] + sorted(d.glob(f'{lv}-*.txt'), key=lambda q: int(re.sub(r'\D', '', q.stem.split('-')[-1]) or 0))


def parse(lv):
    texts, cur, para = [], None, None
    for fp in src_files(lv):
        if not fp.exists():
            continue
        for raw in open(fp, encoding='utf8'):
            line = raw.rstrip('\n')
            if not line.strip() or line.startswith('#'):
                continue
            m = re.match(r'^=== (\d+) \| (.*)$', line)
            if m:
                cur = {'unit': int(m.group(1)), 'title': [x.strip() for x in m.group(2).split(SEP)], 'paras': [], 'notes': [], 'qs': []}
                assert len(cur['title']) == 3, (lv, line)
                texts.append(cur); continue
            if line.startswith('sum:'):
                cur['sum'] = [x.strip() for x in line[4:].split(SEP)]
                assert len(cur['sum']) == 2, (lv, line)
            elif line.startswith('p:'):
                para = [line[2:].strip(), None, None]; cur['paras'].append(para)
            elif line.startswith('+ '):
                para[0] += '\n' + line[2:]
            elif line.startswith('=+'):
                para[1] += '\n' + line[2:].strip()
            elif line.startswith('~+'):
                para[2] += '\n' + line[2:].strip()
            elif line.startswith('='):
                para[1] = line[1:].strip()
            elif line.startswith('~'):
                para[2] = line[1:].strip()
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
            if p[1] is None or p[2] is None:
                raise SystemExit(f'{lv} "{tx["title"][0]}": paragraph without es / en translation: {p[0][:50]}')
        g, verbs, found = {}, [], []
        svp_done = set()
        for pi, para in enumerate(paras):
            doc = nlp(para.replace('’', "'"))
            bystart = {t.idx: t for t in doc}
            vph = verb_phrases(doc)
            vlem = {v['s']: v['l'] for v in vph}
            toks = [(m.start(), m.end(), m.group(0).lower()) for m in WORD.finditer(para)]
            for s, e, k in toks:
                t = bystart.get(s)
                if t is not None and t.pos_ == 'PROPN' and not mean(k) and para[s:s + 1].isupper():
                    continue
                if (t is not None and t.like_num) or len(k) == 1:
                    continue
                lo = vlem.get(s) if (t is not None and t.dep_ != 'svp') else None
                if lo and t is not None and t.lemma_.lower() == lo:
                    lo = None
                m = gloss_of(k, t, lo)
                if t is not None and t.dep_ == 'svp':
                    fl = full_lemma(t.head)
                    if mean(fl) and fl != k:
                        mv = mean(fl); h = HEAD.get(fl, fl)
                        clip = lambda x: x.split(' · ')[0]
                        m = {'es': (clip(m['es']) + ' · ' if m else '') + f'{h}: {clip(mv["es"])}',
                             'en': (clip(m['en']) + ' · ' if m else '') + f'{h}: {clip(mv["en"])}'}
                        if k in g and k not in svp_done:
                            g[k] = {'es': g[k]['es'] + f' · {h}: {clip(mv["es"])}', 'en': g[k]['en'] + f' · {h}: {clip(mv["en"])}'}
                        svp_done.add(k)
                if m:
                    g.setdefault(k, m)
                    lem = (t.lemma_.lower() if t is not None else k)
                    if k in levelwords and k not in FUNC:
                        found.append((k, para[s:e]))
                    elif lem in levelwords and lem not in FUNC:
                        found.append((lem, para[s:e]))
                else:
                    missing.setdefault(k, tx['title'][0])
            # parts of a hyphenated word (E-Mail, Baden-Württemberg) get the meaning of the whole word
            for hm in re.finditer(rf"[{LET}]+(?:-[{LET}]+)+", para):
                whole = hm.group(0).lower()
                m = mean(whole)
                if m:
                    for part in whole.split('-'):
                        if part not in g or not mean(part):
                            g[part] = {'es': f'{HEAD.get(whole, whole)}: {m["es"]}', 'en': f'{HEAD.get(whole, whole)}: {m["en"]}'}
                            missing.pop(part, None)
            low = ' ' + ' '.join(k for _, _, k in toks) + ' '
            for ph in PHRASES:
                phn = ' '.join(m.group(0).lower() for m in WORD.finditer(ph))
                if phn and f' {phn} ' in low:
                    if ph not in g:
                        g[ph] = mean(ph)
                        if ph in levelwords:
                            found.append((ph, ph))
                    for part in phn.split():
                        if part not in g:
                            g[part] = {'es': f'{ph}: {mean(ph)["es"]}', 'en': f'{ph}: {mean(ph)["en"]}'}
                            missing.pop(part, None)
            for v in vph:
                verbs.append({'p': pi, 'f': para[v['s']:v['e']], 'l': v['l'], 't': v['t'], 'per': '', 'm': v['m']})
        seen = set(); vv = []
        for v in verbs:
            key = (v['p'], v['f'])
            if key not in seen:
                seen.add(key); vv.append(v)
        notes = []
        for nt in tx['notes']:
            if len(nt) != 4:
                raise SystemExit(f'{lv} "{tx["title"][0]}": note needs fragment ¦ kind ¦ es ¦ en: {nt}')
            f, k, es, en = nt
            pi = next((i for i, q in enumerate(paras) if f in q), None)
            if pi is None:
                raise SystemExit(f'{lv} "{tx["title"][0]}": note fragment not found: {f}')
            notes.append({'p': pi, 'f': f, 'k': k, 'e': {'es': es, 'en': en}})
        qs = []
        for q in tx['qs']:
            if len(q) != 6:
                raise SystemExit(f'{lv} "{tx["title"][0]}": question needs 6 fields: {q}')
            opts = [x.strip() for x in q[3].split(' / ')]
            assert 0 <= int(q[4]) < len(opts), (lv, q)
            qs.append({'q': {'de': q[0], 'es': q[1], 'en': q[2]}, 'options': opts, 'answer': int(q[4]), 'explain': {'es': q[5], 'en': q[5]}})
        rank = {bare(v['word']): (v.get('unit') or 999) for v in vocab}
        diff, dseen = [], set()
        for lem, surf in sorted(found, key=lambda x: abs(rank.get(x[0], 999) - tx['unit'])):
            if lem not in dseen and lem not in FUNC and lem not in NUMS and len(lem) > 2:
                dseen.add(lem); diff.append(lem)
        diff = diff[:12]
        rnd = random.Random(f'{lv}{n}')
        surfaces = []
        for lem, surf in found:
            if lem in diff and surf not in surfaces and ' ' not in surf and re.search(rf'(?<![{LET}])' + re.escape(surf) + rf'(?![{LET}])', '\n'.join(paras)):
                surfaces.append(surf)
        items = surfaces[:8]
        pool = [v['word'] if v['word'][:1].isupper() else bare(v['word']) for v in vocab]
        pool = [w for w in pool if ' ' not in ART.sub('', w) and ART.sub('', w).isalpha() and bare(w) not in dseen]
        pool = [ART.sub('', w) for w in pool]
        out.append({'id': f'{lv}-t{n}', 'level': lv, 'unit': tx['unit'], 'order': n,
                    'title': {'de': tx['title'][0], 'es': tx['title'][1], 'en': tx['title'][2]},
                    'summary': {'es': tx['sum'][0], 'en': tx['sum'][1]},
                    'paragraphs': paras, 'translation': {'es': [p[1] for p in tx['paras']], 'en': [p[2] for p in tx['paras']]},
                    'glossary': g, 'difficult': diff, 'questions': qs,
                    'gaps': {'items': items, 'distractors': rnd.sample(pool, 6)}, 'verbs': vv, 'notes': notes})
    out.sort(key=lambda t: (t['unit'], t['order']))   # extra texts join their unit; ids stay stable
    (ROOT / 'data' / lv / 'texts.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'{lv}: {len(out)} texts · {sum(len(t["verbs"]) for t in out)} verbs · {sum(len(t["notes"]) for t in out)} notes · {len(missing)} words without meaning')
    if missing:
        print('  missing:', ', '.join(sorted(missing)))


if __name__ == '__main__':
    for lv in sys.argv[1:] or [l for l in LEVELS if (ROOT / 'tools' / 'texts_src' / f'{l}.txt').exists()]:
        build(lv)
