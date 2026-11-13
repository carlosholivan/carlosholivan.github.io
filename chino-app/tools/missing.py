"""Lists the vocabulary of each HSK level that does not appear in any reading yet.
Writes tools/missing_hskN.txt (word, pinyin, meaning, unit) ordered by frequency."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'data')
LV = [f'hsk{i}' for i in range(1, 8)]
vocab = {lv: json.load(open(f'{D}/{lv}/vocab.json')) for lv in LV}
allw = {v['word'] for lv in LV for v in vocab[lv]}
seen = set()
for lv in LV:
    for t in json.load(open(f'{D}/{lv}/texts.json')):
        for p in t['paragraphs'] + [t['title'].get('zh', '')]:
            i = 0
            while i < len(p):
                for n in range(6, 0, -1):
                    if p[i:i + n] in allw: seen.add(p[i:i + n]); i += n; break
                else: i += 1
            # also plain substring hits for multi-char words
for lv in LV:
    for t in json.load(open(f'{D}/{lv}/texts.json')):
        body = ''.join(t['paragraphs'])
        for v in vocab[lv]:
            if len(v['word']) > 1 and v['word'] in body: seen.add(v['word'])
tot = 0
for lv in LV:
    miss = [v for v in sorted(vocab[lv], key=lambda v: v.get('q', 1e9)) if v['word'] not in seen]
    tot += len(miss)
    with open(f'{ROOT}/tools/missing_{lv}.txt', 'w') as f:
        for v in miss:
            m = v.get('m') or v.get('meaning') or {}
            es = m.get('es', '') if isinstance(m, dict) else str(m)
            f.write(f"{v['word']}\t{v.get('p', v.get('pinyin', ''))}\t{es[:60]}\t{v.get('unit', '')}\n")
    print(lv, len(vocab[lv]), 'missing', len(miss))
print('total', tot)
