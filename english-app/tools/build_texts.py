"""Builds data/<level>/texts.json from the hand-written readings in tools/texts_src/<level>.txt.

Translations are Spanish only. The A1 source also has Japanese and Chinese cells (ignored); a source that
starts with "#! es" has a single Spanish cell everywhere.
Source format (one block per text; snippets separated by ¦):
  === <unit> | English title ¦ es ¦ ja ¦ zh
  sum: es ¦ ja ¦ zh
  p: English paragraph                    (dialogue: one turn per line, lines starting with "— ")
  = es translation of the paragraph
  = ja
  = zh
  note: fragment ¦ kind ¦ es ¦ ja ¦ zh      (kind: see NOTE_KINDS in js/tenses.js; the paragraph is found automatically)
  q: question ¦ es ¦ ja ¦ zh ¦ option / option / option ¦ right index ¦ why es ¦ ja ¦ zh

Computed with spaCy (en_core_web_sm):
  glossary   every word of the text → meaning (lemma meaning from the course lists, "lemma: …" for inflected forms)
             + the multiword entries of the lists found in the text (get up, a lot of…)
  verbs      every verb phrase with its form (present simple, present perfect, passive, modal…) — see js/tenses.js
  difficult  words of the text's level found in it (the newest ones first)
  gaps       up to 8 of those words to fill in + distractors from the level list
Usage: python3 tools/build_texts.py [level…]
"""
import json, re, random, sys
from pathlib import Path
import spacy

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
L3 = ['es']
SEP = '¦'
nlp = spacy.load('en_core_web_sm')

# ── meanings ─────────────────────────────────────────────────────────────
VOC, LVOF = {}, {}
for lv in LEVELS:
    p = ROOT / 'data' / lv / 'vocab.json'
    if not p.exists():
        continue
    for v in json.loads(p.read_text(encoding='utf8')):
        for k in {v['word'].lower(), v.get('us', '').lower()} - {''}:
            VOC.setdefault(k, v['m']); LVOF.setdefault(k, lv)
EXTRA = {}
xp = ROOT / 'tools' / 'texts_src' / 'extra_gloss.txt'
if xp.exists():
    for line in open(xp, encoding='utf8'):
        if line.strip() and not line.startswith('#'):
            w, es = [x.strip() for x in line.rstrip('\n').split('|')][:2]
            EXTRA[w.lower()] = {'es': es}
PHRASES = sorted([k for k in list(VOC) + list(EXTRA) if ' ' in k], key=len, reverse=True)
NUMS = set('one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred first second third all some any many much say get go do make have very'.split())
FUNC = set('a an the and or but i you he she it we they me him her us them my your his its our their this that these those is am are was were be been do does did to of in on at for with from by not no yes so as if than then there here what who how when where why which'.split())


def mean(k):
    return EXTRA.get(k) or VOC.get(k)


def gloss_of(tok):
    s = tok.text.lower().replace('’', "'")
    m = mean(s)
    if m:
        return m
    lem = tok.lemma_.lower()
    if lem in ("n't",):
        return {'es': 'no'}
    m = mean(lem)
    if m and lem != s:
        return {l: f'{lem}: {m[l]}' for l in L3}
    return m


# ── verb phrases ─────────────────────────────────────────────────────────
MODALS = {'can', 'could', 'may', 'might', 'must', 'should', 'shall', 'ought'}


def verb_phrases(doc):
    out = []
    used = set()
    for t in doc:
        if t.i in used:
            continue
        main = t.pos_ == 'VERB' or (t.pos_ == 'AUX' and t.lemma_ == 'be' and t.dep_ in ('ROOT', 'conj', 'ccomp', 'advcl', 'relcl', 'xcomp', 'csubj'))
        if not main:
            continue
        if t.dep_ in ('amod', 'compound', 'nmod') or (t.dep_ == 'pobj' and t.tag_ == 'VBG') or t.tag_ in ('JJ', 'NN'):
            continue
        auxs = sorted([c for c in t.children if c.dep_ in ('aux', 'auxpass') and c.i < t.i], key=lambda c: c.i)
        neg = [c for c in t.children if c.dep_ == 'neg']
        lem = t.lemma_.lower()
        al = [a.lemma_.lower() for a in auxs]
        at = [a.text.lower().replace('’', "'") for a in auxs]
        passive = any(a.dep_ == 'auxpass' for a in auxs)
        kind = None
        # be going to / have to / used to: the verb after "to" carries the phrase
        head = t.head
        if t.dep_ == 'xcomp' and head.i < t.i and any(c.dep_ == 'aux' and c.text == 'to' for c in t.children):
            if head.lemma_ == 'go' and head.tag_ == 'VBG' and any(c.dep_ == 'aux' and c.lemma_ == 'be' for c in head.children):
                kind = 'goingto'; start = min([c.i for c in head.children if c.dep_ == 'aux'] + [head.i])
                used.add(head.i)
            elif head.lemma_ == 'have' and head.tag_ in ('VBP', 'VBZ', 'VBD', 'VB') and not any(c.lemma_ == 'have' and c.dep_ == 'aux' for c in head.children):
                kind = 'haveto'; start = min([c.i for c in head.children if c.dep_ == 'aux'] + [head.i]); used.add(head.i)
            elif head.lemma_ == 'use' and head.tag_ in ('VBD', 'VB'):
                kind = 'usedto'; start = min([c.i for c in head.children if c.dep_ == 'aux'] + [head.i]); used.add(head.i)
        if kind is None:
            if passive:
                kind = 'pas'
            elif t.tag_ == 'VBG' and al and al[-1] == 'be':
                kind = 'perfprog' if 'have' in al and at[0] in ('have', 'has', "'ve", "'s") else 'plupprog' if 'have' in al else 'willprog' if 'will' in al else 'pastprog' if at[-1] in ('was', 'were') else 'modal' if set(al) & MODALS else 'prog'
            elif t.tag_ == 'VBN' and 'have' in al:
                if 'will' in al: kind = 'willperf'
                elif 'would' in al: kind = 'condperf'
                elif set(al) & MODALS: kind = 'modalperf'
                elif any(x in ('had', "'d") for x in at): kind = 'plup'
                else: kind = 'perf'
            elif al and al[0] == 'will' or (at and at[0] == "'ll"):
                kind = 'will'
            elif al and (al[0] == 'would' or at[0] == "'d"):
                kind = 'cond'
            elif set(al) & MODALS:
                kind = 'modal'
            elif al and al[0] == 'do':
                kind = 'past' if at[0] in ('did', "didn't") else 'imp' if t.tag_ == 'VB' and not [c for c in t.children if c.dep_ == 'nsubj'] and at[0] in ('do', "don't") and t.i == auxs[0].i + (2 if neg else 1) and (auxs[0].i == 0 or doc[auxs[0].i - 1].is_punct) else 'pres'
            elif t.lemma_ == 'be' and t.pos_ == 'AUX':
                kind = 'wasbe' if t.text.lower() in ('was', 'were', "wasn't", "weren't") else 'be'
            elif t.tag_ in ('VBZ', 'VBP'):
                kind = 'pres'
            elif t.tag_ == 'VBD':
                kind = 'past'
            elif t.tag_ == 'VB':
                if any(c.dep_ == 'aux' and c.text.lower() == 'to' for c in t.children):
                    kind = 'inf'
                elif not [c for c in t.children if c.dep_ in ('nsubj', 'nsubjpass')] and t.dep_ in ('ROOT', 'conj') and (t.i == t.sent.start or doc[t.i - 1].is_punct or doc[t.i - 1].lower_ in ('please', 'and', 'then', "let's", 'just')):
                    kind = 'imp'
                else:
                    kind = 'base'
            elif t.tag_ == 'VBG':
                kind = 'ger'
            elif t.tag_ == 'VBN':
                kind = 'part'
            else:
                continue
            start = auxs[0].i if auxs and kind not in ('inf',) else t.i
            if kind == 'inf':
                start = t.i
        # the phrase is the contiguous text from its first auxiliary to the verb
        if kind in ('be', 'wasbe') and start == t.i and t.i > 0 and doc[t.i - 1].lower_ in ('there',):
            pass
        end = t.i + 1
        if end < len(doc) and doc[end].dep_ == 'prt' and doc[end].head.i == t.i:
            end += 1  # phrasal verb particle right after the verb (get up, find out)
        span = doc[start:end]
        if len(span) > 6:
            span = doc[t.i:t.i + 1]
        if kind in ('base', 'part') and t.dep_ not in ('ROOT', 'conj', 'xcomp', 'ccomp', 'advcl'):
            continue
        m = mean(lem) or mean(t.text.lower())
        if not m and lem != 'be':
            continue
        if lem == 'be':
            m = mean('be')
        out.append({'s': span.start_char, 'e': span.end_char, 't': kind, 'l': lem, 'm': m})
    return out


def parse(lv):
    p = ROOT / 'tools' / 'texts_src' / f'{lv}.txt'
    texts, cur, para = [], None, None
    n = 3
    for raw in open(p, encoding='utf8'):
        line = raw.rstrip('\n')
        if line.strip() == '#! es':
            n = 1; continue
        if not line.strip() or line.startswith('#'):
            continue
        m = re.match(r'^=== (\d+) \| (.*)$', line)
        if m:
            cur = {'unit': int(m.group(1)), 'title': [x.strip() for x in m.group(2).split(SEP)][:2], 'paras': [], 'notes': [], 'qs': [], 'n': n}
            texts.append(cur); continue
        if line.startswith('sum:'):
            cur['sum'] = [x.strip() for x in line[4:].split(SEP)][:1]
        elif line.startswith('p:'):
            para = [line[2:].strip()]; cur['paras'].append(para)
        elif line.startswith('+ '):          # continuation line of the English paragraph (dialogue turns)
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
    levelwords = {v['word'].lower(): v for v in vocab}
    out, missing = [], {}
    for n, tx in enumerate(texts, 1):
        paras = [p[0] for p in tx['paras']]
        for p in tx['paras']:
            assert len(p) == 1 + tx['n'], (lv, tx['title'][0], p[0][:40], len(p))
        g, verbs = {}, []
        found = []
        for pi, para in enumerate(paras):
            doc = nlp(para.replace('—', '-'))
            for t in doc:
                if not t.is_alpha and "'" not in t.text and '’' not in t.text:
                    continue
                k = t.text.lower().replace('’', "'")
                if t.pos_ == 'PROPN' and not mean(k):
                    continue
                if k.startswith("'") or k == "n't":
                    continue
                m = gloss_of(t)
                if m:
                    g.setdefault(k, m)
                    lem = t.lemma_.lower()
                    if lem in levelwords and lem not in FUNC:
                        found.append((lem, t.text))
                    elif k in levelwords and k not in FUNC:
                        found.append((k, t.text))
                elif t.pos_ != 'PROPN' and not t.like_num:
                    missing.setdefault(k, tx['title'][0])
            low = ' ' + re.sub(r'[^a-z\' ]', ' ', para.lower().replace('’', "'")) + ' '
            for ph in PHRASES:
                if f' {ph} ' in low and ph not in g:
                    g[ph] = mean(ph)
                    if ph in levelwords:
                        found.append((ph, ph))
            for v in verb_phrases(doc):
                f = para[v['s']:v['e']]
                verbs.append({'p': pi, 'f': f, 'l': v['l'], 't': v['t'], 'per': '', 'm': v['m']})
        # dedupe verbs (same paragraph + same chunk)
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
            k = tx['n']
            opts = [x.strip() for x in q[1 + k].split(' / ')]
            qs.append({'q': {'en': q[0], 'es': q[1]}, 'options': opts, 'answer': int(q[2 + k]), 'explain': {'es': q[3 + k]}})
        # difficult: the level's words in the text, newest lessons first
        rank = {v['word'].lower(): (v.get('unit') or 999) for v in vocab}
        diff, dseen = [], set()
        for lem, surf in sorted(found, key=lambda x: abs(rank.get(x[0], 999) - tx['unit'])):
            if lem not in dseen and lem not in FUNC and lem not in NUMS and len(lem) > 2:
                dseen.add(lem); diff.append(lem)
        diff = diff[:12]
        rnd = random.Random(f'{lv}{n}')
        surfaces = []
        for lem, surf in found:
            if lem in diff and surf not in surfaces and ' ' not in surf and re.search(r'(?<![A-Za-z])' + re.escape(surf) + r'(?![A-Za-z])', '\n'.join(paras)):
                surfaces.append(surf)
        items = surfaces[:8]
        pool = [v['word'] for v in vocab if v['word'].lower() not in dseen and ' ' not in v['word'] and v['word'].isalpha()]
        out.append({'id': f'{lv}-t{n}', 'level': lv, 'unit': tx['unit'], 'order': n,
                    'title': {'en': tx['title'][0], 'es': tx['title'][1]}, 'summary': {'es': tx.get('sum', [''])[0]},
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
