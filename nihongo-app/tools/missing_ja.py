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
tot = 0
for lv in LV:
    vocab = json.load(open(f'{D}/{lv}/vocab.json'))
    miss = [v for v in sorted(vocab, key=lambda v: v.get('q', 1e9)) if v['w'] not in seen]
    tot += len(miss)
    with open(f'{ROOT}/tools/missing_{lv}.txt', 'w') as f:
        for v in miss:
            f.write(f"{v['w']}\t{v.get('r', '')}\t{v['m'].get('es', '')[:50]}\t{v.get('unit', '')}\n")
    print(lv, len(vocab), 'missing', len(miss))
print('total', tot)
