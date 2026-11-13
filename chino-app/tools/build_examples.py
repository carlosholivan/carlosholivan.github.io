"""Example sentences for the vocabulary cards, taken from the app's own readings (with Spanish translation).
Writes data/<level>/examples.json: { word: [[segments_or_text, {es, en?}], ...] } (max 2 per word, shortest first).
Usage: python3 tools/build_examples.py  (run from the app folder; works for nihongo-app, arabic-app and chino-app)."""
import json, re, glob, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT.name
DATA = ROOT / 'data'
SPK_ES = re.compile(r'^[^:：]{1,25}[:：]\s*')
SPK_ZH = re.compile(r'^[^:：]{1,12}[:：]\s*')

def levels():
    return sorted(p.parent.name for p in DATA.glob('*/texts.json'))

def vocab_words():
    words = {}
    for lv in levels():
        f = DATA / lv / 'vocab.json'
        if f.exists():
            for v in json.load(open(f)): words.setdefault(v['w'], lv)
    return words

def lines_of(t, lang):
    tr = t.get('translation', {}).get(lang) or []
    out = []
    for pi, para in enumerate(t['paragraphs']):
        src = para.split('\n')
        trl = (tr[pi] if pi < len(tr) else '').split('\n')
        if len(src) != len(trl): continue
        for li, (a, b) in enumerate(zip(src, trl)):
            out.append((pi, li, a, SPK_ES.sub('', b).strip()))
    return out

def main():
    words = vocab_words()
    global LV; LV = [p.parent.name for p in sorted(DATA.glob('*/vocab.json'))]
    order = {'chino-app': ['hsk1','hsk2','hsk3','hsk4','hsk5','hsk6','hsk7'], 'nihongo-app': ['n5','n4','n3','n2','n1'], 'arabic-app': ['a1','a2','b1','b2','c1','c2']}[APP]
    LV = [l for l in order if l in LV] + [l for l in LV if l not in order]
    cands = {}
    for lv in levels():
        for t in json.load(open(DATA / lv / 'texts.json')):
            es_lines = lines_of(t, 'es')
            en = {(pi, li): b for pi, li, _, b in lines_of(t, 'en')}
            for pi, li, src, es in es_lines:
                if not es: continue
                tr = {'es': es}
                if (pi, li) in en and en[(pi, li)]: tr['en'] = en[(pi, li)]
                if 'tok' in t:  # nihongo / arabic: tokens carry the vocabulary key
                    try: toks = t['tok'][pi][li]
                    except IndexError: continue
                    if len(toks) > 1 and toks[1][0] == '：': toks = toks[2:]
                    keys = {k[2] for k in toks if k[2]}
                    if APP == 'nihongo-app':
                        segs = [s for tk in toks for s in tk[1]]
                        text = ''.join(s[0] for s in segs)
                        ex = [[s[0], s[1]] if s[1] else s[0] for s in segs]
                        size = len(text)
                    else:
                        text = ''.join(tk[0] for tk in toks).strip()
                        ex, size = text, len(text.split())
                else:  # chinese: greedy longest-match segmentation over the vocabulary
                    text = SPK_ZH.sub('', src).strip()
                    keys, i = set(), 0
                    while i < len(text):
                        for n in (4, 3, 2, 1):
                            if text[i:i + n] in words: keys.add(text[i:i + n]); i += n; break
                        else: i += 1
                    ex, size = text, len(text)
                for k in keys:
                    if k in words: cands.setdefault(k, []).append((size, ex, tr, text, LV.index(lv)))
    lo, hi = (3, 16) if APP == 'arabic-app' else (6, 38)
    out = {}
    for w, cs in cands.items():
        wl = LV.index(words[w]) if words[w] in LV else 0
        good = [c for c in cs if lo <= c[0] <= hi] or cs
        # prefer readings of the word's own level (or the closest), then medium-short sentences
        good.sort(key=lambda c: (c[4] < wl, abs(c[4] - wl), abs(c[0] - (lo + hi) / 3)))
        seen, pick = set(), []
        for size, ex, tr, text, _ in good:
            if text in seen: continue
            seen.add(text); pick.append([ex, tr])
            if len(pick) == 2: break
        out.setdefault(words[w], {})[w] = pick
    for lv, d in out.items():
        json.dump(d, open(DATA / lv / 'examples.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    out = {w: x for d in out.values() for w, x in d.items()}
    print(APP, f'{len(out)}/{len(words)} words with examples')

main()
