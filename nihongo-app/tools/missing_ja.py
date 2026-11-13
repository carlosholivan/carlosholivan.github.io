"""Lists the vocabulary of each JLPT level that does not occur (as a token key) in any reading.
Writes tools/missing_nX.txt: word, reading, meaning, unit — ordered by frequency."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'data')
LV = ['n5', 'n4', 'n3', 'n2', 'n1']
seen = set()
for lv in LV:
    for t in json.load(open(f'{D}/{lv}/texts.json')):
        for para in t.get('tok', []):
            for line in para:
                for tk in line:
                    if tk[2]: seen.add(tk[2])
import re
KANJI = re.compile(r'[\u3400-\u9fff]')
by_r = {}
for l in LV:
    for v in json.load(open(f'{D}/{l}/vocab.json')): by_r.setdefault(v.get('r'), []).append(v)
tot = 0
for lv in LV:
    vocab = json.load(open(f'{D}/{lv}/vocab.json'))
    # Spelling variants of a word already seen (なにしろ / 何しろ, 生意気 / 生意気な) count as covered.
    def covered(v):
        if v['w'] in seen: return True
        return any(o['w'] in seen and (not KANJI.search(v['w']) or not KANJI.search(o['w']) or o['w'].startswith(v['w']) or v['w'].startswith(o['w']) or o['w'][0] == v['w'][0])
                   for o in by_r.get(v.get('r'), []) if o is not v)
    miss = [v for v in sorted(vocab, key=lambda v: v.get('q', 1e9)) if not covered(v)]
    tot += len(miss)
    with open(f'{ROOT}/tools/missing_{lv}.txt', 'w') as f:
        for v in miss:
            f.write(f"{v['w']}\t{v.get('r', '')}\t{v['m'].get('es', '')[:50]}\t{v.get('unit', '')}\n")
    print(lv, len(vocab), 'missing', len(miss))
print('total', tot)
