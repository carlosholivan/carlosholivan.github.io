"""Gives a difficult-words glossary to the texts that don't have one (data/<level>/texts.json):
the text is segmented by longest match against the vocabulary of all levels; the glossary takes the words of a
higher level, or else the rarest words of its own level (up to 12), with pinyin and meaning.
Usage: python3 chino-app/tools/fill_glossary.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LV = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6', 'hsk7']
vinfo, vlv = {}, {}
for i, lv in enumerate(LV):
    for v in json.load(open(ROOT / 'data' / lv / 'vocab.json', encoding='utf8')):
        vinfo.setdefault(v['w'], v); vlv.setdefault(v['w'], i)
MAXL = max(map(len, vinfo))
for i, lv in enumerate(LV):
    p = ROOT / 'data' / lv / 'texts.json'
    raw = p.read_text(encoding='utf8'); T = json.loads(raw); n = 0
    for tx in T:
        if tx.get('glossary'):
            continue
        text = '\n'.join(tx['paragraphs'])
        words, k = [], 0
        while k < len(text):
            for L in range(min(MAXL, len(text) - k), 1, -1):
                w = text[k:k + L]
                if w in vinfo:
                    if w not in words: words.append(w)
                    k += L; break
            else:
                k += 1
        hard = [w for w in words if vlv[w] > i]
        if len(hard) < 6:
            hard += sorted((w for w in words if vlv[w] == i and w not in hard and len(w) > 1), key=lambda w: -(vinfo[w].get('q') or 0))[:6 - len(hard)]
        tx['glossary'] = {w: {'py': vinfo[w].get('p', ''), **{k2: x for k2, x in (vinfo[w].get('m') or {}).items()}} for w in hard[:12]}
        n += 1
    p.write_text(json.dumps(T, ensure_ascii=False, indent=1 if raw.startswith('[\n') else None), encoding='utf8')
    print(lv, n, 'texts given a glossary')
