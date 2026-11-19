"""Confusable words for the card backs: tools/synonym_notes.txt → data/<level>/synonyms.json.
Line format:  word1 / word2 [/ …] = note (en) | 説明 (ja) | 说明 (zh)
Usage: python3 tools/build_synonyms.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LV = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
lvof = {}
for lv in LV:
    for v in json.load(open(ROOT / 'data' / lv / 'vocab.json', encoding='utf8')):
        lvof.setdefault(v['word'], lv)
SYN = {lv: {} for lv in LV}
notes = {}
for line in open(ROOT / 'tools' / 'synonym_notes.txt', encoding='utf8'):
    if line.startswith('#') or '=' not in line:
        continue
    left, rest = line.split('=', 1)
    parts = [x.strip() for x in rest.split('|')]
    ok = [w.strip() for w in left.split('/') if w.strip() in lvof]
    if len(ok) < 2:
        continue
    for w in ok:
        e = SYN[lvof[w]].setdefault(w, {'s': []})
        e['s'] = list(dict.fromkeys(e['s'] + [x for x in ok if x != w]))
        notes.setdefault(w, []).append(parts)
        e['n'] = {k: '\n'.join(n[i] for n in notes[w] if i < len(n)) for i, k in enumerate(('en', 'ja', 'zh'))}
for lv in LV:
    (ROOT / 'data' / lv / 'synonyms.json').write_text(json.dumps(SYN[lv], ensure_ascii=False, separators=(',', ':')), encoding='utf8')
print({lv: len(SYN[lv]) for lv in LV})
