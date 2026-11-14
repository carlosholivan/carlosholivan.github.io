"""Adds words to a level list (beyond the lessons, like the HSK/JLPT lists of the sibling apps) and
gives every word its course rank q (lower = learn first; levels in order, lesson words first).

  python3 tools/add_vocab.py <level> <file.tsv>   # lines: word<TAB>g<TAB>en<TAB>ja<TAB>zh  (g = m | f | -)
  python3 tools/add_vocab.py --rank               # only recompute q
Words already in any level (case-insensitive) are skipped and reported.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
load = lambda p: json.loads(p.read_text(encoding='utf-8'))
dump = lambda p, d: p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def rank():
    q = 1
    for lv in LEVELS:
        p = ROOT / 'data' / lv / 'vocab.json'
        V = load(p)
        V.sort(key=lambda v: (v.get('unit') is None, v.get('unit') or 0))   # lesson words first (stable)
        for v in V:
            v['q'] = q; q += 1
        dump(p, V)
    print('ranked', q - 1, 'words')


if sys.argv[1] == '--rank':
    rank(); sys.exit()

lv, f = sys.argv[1], sys.argv[2]
known = {}
for l in LEVELS:
    for v in load(ROOT / 'data' / l / 'vocab.json'):
        known[v['word'].lower()] = l
p = ROOT / 'data' / lv / 'vocab.json'
V = load(p)
added, dup = 0, []
for line in open(f, encoding='utf-8'):
    line = line.rstrip('\n')
    if not line.strip():
        continue
    parts = line.split('\t')
    if len(parts) != 5:
        print('BAD', line); continue
    w, g, en, ja, zh = [x.strip() for x in parts]
    if w.lower() in known:
        dup.append(f'{w}({known[w.lower()]})'); continue
    known[w.lower()] = lv
    V.append({'word': w, 'w': w, 'p': '', 'm': {'en': en, 'zh': zh, 'ja': ja}, 'gender': g if g in ('m', 'f') else None, 'unit': None})
    added += 1
dump(p, V)
print(f'{lv}: +{added} (now {len(V)}); skipped {len(dup)}:', ' '.join(dup[:40]))
rank()
