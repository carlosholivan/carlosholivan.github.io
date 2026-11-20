"""Example sentences for the back of the vocabulary cards (data/<level>/examples.json).

Sources, all from the course itself (so every sentence has its Spanish and English translation):
  · lesson exercises and grammar drills: the completed sentence + its translations
  · readings: sentences of a paragraph, paired with the translations' sentences when the counts match
For every word: up to 2 sentences, shortest first, preferring sentences from its own level or below.
Format: { word: [[sentence, {es, en}], ...] }   (a word also matches its inflected forms: -e, -en, -er, -es, -t, -st…)
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
LANGS = ['es', 'en']
LEVELS = [l for l in LEVELS if (ROOT / 'data' / l / 'vocab.json').exists()]
LET = 'A-Za-zÀ-ÖØ-öø-ÿ'
WORD = re.compile(rf"[{LET}]+(?:-[{LET}]+)*")
ART = re.compile(r"^(der |die |das |sich )")
ENDS = ['ern', 'en', 'em', 'er', 'es', 'est', 'et', 'st', 'te', 'ten', 'tet', 'e', 'n', 's', 't']


def stems(w):
    out = set()
    for e in ENDS:
        if w.endswith(e) and len(w) - len(e) >= 3:
            out.add(w[:-len(e)])
    return out


def load(p):
    return json.loads(p.read_text(encoding='utf-8'))


def split_es(p):  # German source sentences (name kept from the Spanish app)
    p = re.sub(r'\s+', ' ', p.strip())
    parts = re.split(r'(?<=[.!?…"“”»])\s+(?=[„«"“A-ZÀ-ÖØ-Þ])', p)
    return [x.strip() for x in parts if x.strip()]


def split_tr(p, lang):
    p = re.sub(r'\s+', ' ', (p or '').strip())
    parts = re.split(r'(?<=[.!?…»"”])\s+(?=[¿¡«"“(A-ZÁÉÍÓÚÑ])', p)
    return [x.strip() for x in parts if x.strip()]


def unquote(x):
    # a sentence cut out of a quotation keeps only one of its quote marks: drop the stray one
    for a, b in (('„', '“'), ('"', '"'), ('“', '”'), ('«', '»')):
        if a == b and x.count(a) % 2:
            x = x.strip(a).strip()
        elif a != b and x.count(a) != x.count(b):
            x = x.replace(a, '').replace(b, '').strip()
    return re.sub(r'([.!?])[».,]+$', r'\1', x)


sentences = []   # (sentence, tr, level index)
for li, lv in enumerate(LEVELS):
    for u in load(ROOT / 'data' / lv / 'units.json'):
        for e in u.get('exercises', []):
            if e['type'] == 'fill' and all(e.get('tr', {}).get(l) for l in LANGS):
                sentences.append((e['sentence'].replace('___', e['blank']).replace(' ,', ','), {l: e['tr'][l] for l in LANGS}, li))
            elif e['type'] in ('order', 'translate') and all(e.get('tr', {}).get(l) for l in LANGS) and e.get('answer'):
                a = e['answer'].strip()
                if a[-1:] not in '.!?':
                    a += '?' if e['tr']['es'].rstrip().endswith('?') else '.'
                sentences.append((a, {l: e['tr'][l] for l in LANGS}, li))
    for d in load(ROOT / 'data' / lv / 'drills.json'):
        for it in d.get('items', []):
            if not it.get('tr') or '___' not in it['q']:
                continue
            s = it['q'].replace('___', it['o'][it['a']])
            if all(it['tr'].get(l) for l in LANGS):
                sentences.append((s, {l: it['tr'][l] for l in LANGS}, li))
    for tx in load(ROOT / 'data' / lv / 'texts.json'):
        trs = tx.get('translation', {})
        for i, p in enumerate(tx['paragraphs']):
            if '\n' in p:
                continue                      # dialogue turns don't pair reliably
            es = split_es(p)
            tl = {l: split_tr((trs.get(l) or [''] * 999)[i] if i < len(trs.get(l) or []) else '', l) for l in LANGS}
            if not all(len(tl[l]) == len(es) for l in LANGS):
                continue
            for k, s in enumerate(es):
                n = len(WORD.findall(s))
                if 4 <= n <= 20:
                    sentences.append((unquote(s), {l: unquote(tl[l][k]) for l in LANGS}, li))

# index: lower-case word form -> sentence ids
index = {}
for si, (s, _, _) in enumerate(sentences):
    for w in set(x.lower() for x in WORD.findall(s)):
        index.setdefault(w, []).append(si)
        for base in stems(w) | {w}:
            index.setdefault('~' + base, []).append(si)

total = 0
for li, lv in enumerate(LEVELS):
    out = {}
    for v in load(ROOT / 'data' / lv / 'vocab.json'):
        w = v['word']
        wb = ART.sub('', w.lower())
        wb = re.sub(r',.*$', '', wb)
        toks = [x.lower() for x in WORD.findall(wb)]
        if not toks:
            continue
        cand = set(index.get(toks[0], []))
        if len(toks) == 1 and len(toks[0]) > 3:
            for b in stems(toks[0]) | {toks[0]}:
                cand |= set(index.get('~' + b, []))
        for t in toks[1:]:
            cand &= set(index.get(t, []))
        if len(toks) > 1:   # multiword: must appear as a phrase
            rx = re.compile(rf'(?<![{LET}])' + re.escape(wb) + rf'(?![{LET}])', re.I)
            cand = {i for i in cand if rx.search(sentences[i][0])}
        ranked = sorted(cand, key=lambda i: (sentences[i][2] > li, wb not in sentences[i][0].lower(), len(sentences[i][0])))
        seen, ex = set(), []
        for i in ranked:
            s, trd, _ = sentences[i]
            if s in seen:
                continue
            seen.add(s)
            ex.append([s, trd])
            if len(ex) == 2:
                break
        if ex:
            out[w] = ex
    (ROOT / 'data' / lv / 'examples.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    total += len(out)
    print(lv, len(out), 'words with examples')
print(len(sentences), 'sentences;', total, 'words')
