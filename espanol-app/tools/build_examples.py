"""Example sentences for the back of the vocabulary cards (data/<level>/examples.json).

Sources, all from the course itself (so every sentence has its translation in en/ja/zh):
  · grammar drills: the completed sentence + its translation
  · readings: sentences of a paragraph, paired with the translation's sentences when the counts match
For every word: up to 2 sentences, shortest first, preferring sentences from its own level or below.
Format: { word: [[sentence, {en, ja, zh}], ...] }
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
LANGS = ['en', 'ja', 'zh']
WORD = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")


def load(p):
    return json.loads(p.read_text(encoding='utf-8'))


def split_es(p):
    p = re.sub(r'\s+', ' ', p.strip())
    parts = re.split(r'(?<=[.!?…])\s+(?=[¿¡«"“—A-ZÁÉÍÓÚÑ])', p)
    return [x.strip() for x in parts if x.strip()]


def split_tr(p, lang):
    p = re.sub(r'\s+', ' ', (p or '').strip())
    if lang == 'en':
        parts = re.split(r'(?<=[.!?…])\s+(?=["“(A-Z])', p)
    else:
        parts = re.split(r'(?<=[。！？])\s*', p)
    return [x.strip() for x in parts if x.strip()]


sentences = []   # (sentence, tr, level index)
for li, lv in enumerate(LEVELS):
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
            if p.lstrip().startswith('—') or '\n' in p:
                continue                      # dialogue turns don't pair reliably
            es = split_es(p)
            tl = {l: split_tr((trs.get(l) or [''] * 999)[i] if i < len(trs.get(l) or []) else '', l) for l in LANGS}
            if not all(len(tl[l]) == len(es) for l in LANGS):
                continue
            for k, s in enumerate(es):
                n = len(WORD.findall(s))
                if 4 <= n <= 20:
                    sentences.append((s, {l: tl[l][k] for l in LANGS}, li))

# index: lower-case word form -> sentence ids
index = {}
for si, (s, _, _) in enumerate(sentences):
    for w in set(x.lower() for x in WORD.findall(s)):
        index.setdefault(w, []).append(si)

total = 0
for li, lv in enumerate(LEVELS):
    out = {}
    for v in load(ROOT / 'data' / lv / 'vocab.json'):
        w = v['word']
        toks = [x.lower() for x in WORD.findall(w)]
        if not toks:
            continue
        cand = set(index.get(toks[0], []))
        for t in toks[1:]:
            cand &= set(index.get(t, []))
        if len(toks) > 1:   # multiword: must appear as a phrase
            rx = re.compile(r'(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])' + re.escape(w) + r'(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])', re.I)
            cand = {i for i in cand if rx.search(sentences[i][0])}
        ranked = sorted(cand, key=lambda i: (sentences[i][2] > li, len(sentences[i][0])))
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
