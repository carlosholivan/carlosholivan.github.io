"""Adds the hand-written extra readings in tools/texts/hskN.txt to data/hskN/texts.json.

Source format (one block per reading):
  ### 中文标题 | título en español | English title
  > resumen en español
  @ 5                          (optional: unit id; otherwise the unit that owns most of the words)
  中文段落……… = traducción del párrafo
  ? 中文问题 | pregunta en español | *正确 / 错误 / 错误 / 错误

Readings added by this script carry "x": 1 and are replaced on every run (idempotent).
Also adds verb ranges (vb) and sentence readings to data/py.json.
"""
import json, os, re, sys, glob
import jieba, logging
from pypinyin import lazy_pinyin, Style
jieba.setLogLevel(logging.ERROR)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
HAN = re.compile(r'[㐀-鿿]')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from integrate import verb_ranges  # noqa


def parse(path):
    out, cur = [], None
    for raw in open(path, encoding='utf-8'):
        line = raw.strip()
        if not line or line.startswith('#!'): continue
        if line.startswith('### '):
            zh, es, en = (line[4:].split('|') + ['', ''])[:3]
            cur = {'zh': zh.strip(), 'es': es.strip(), 'en': en.strip() or es.strip(), 'sum': '', 'unit': None, 'paras': [], 'qs': []}
            out.append(cur)
        elif line.startswith('> '): cur['sum'] = line[2:].strip()
        elif line.startswith('@ '): cur['unit'] = int(line[2:])
        elif line.startswith('? '):
            q, qes, opts = [x.strip() for x in line[2:].split('|')]
            opts = [o.strip() for o in opts.split('/')]
            ans = next(i for i, o in enumerate(opts) if o.startswith('*'))
            cur['qs'].append({'q': {'zh': q, 'es': qes, 'en': qes}, 'options': [o.lstrip('*') for o in opts], 'answer': ans,
                              'explain': {'es': '', 'en': ''}})
        elif ' = ' in line:
            zh, es = line.split(' = ', 1)
            cur['paras'].append((zh.strip(), es.strip()))
        else:
            raise SystemExit(f'{path}: unrecognised line: {line[:60]}')
    return out


def gaps_for(body, lvwords, rng):
    """Gap-fill exercise: up to 8 words of the level that occur in the reading + 6 distractors."""
    found = [w for w in lvwords if w in body]
    rng.shuffle(found)
    items = []
    for w in sorted(found, key=len, reverse=True):
        if not any(w in x or x in w for x in items): items.append(w)
        if len(items) == 8: break
    others = [w for w in lvwords if w not in body]
    return {'items': items, 'distractors': rng.sample(others, min(6, len(others)))}


def main():
    py = json.load(open(os.path.join(DATA, 'py.json')))
    wpy = py['w']
    for w in wpy: jieba.add_word(w, freq=2000)

    def reading(s):
        out = []
        for tok in jieba.lcut(s):
            han = [c for c in tok if HAN.match(c)]
            if not han: continue
            if len(han) > 1 and tok in wpy and len(wpy[tok].split()) == len(han): out += wpy[tok].split()
            else: out += [x for x in lazy_pinyin(''.join(han), style=Style.TONE) if x]
        return ' '.join(out)

    added = 0
    for src in sorted(glob.glob(os.path.join(ROOT, 'tools', 'texts', 'hsk*.txt'))):
        lv = os.path.basename(src)[:-4]
        d = os.path.join(DATA, lv)
        texts = [t for t in json.load(open(os.path.join(d, 'texts.json'))) if not t.get('x')]
        enp = os.path.join(ROOT, 'tools', 'texts', 'en', f'{lv}.json')
        EN = json.load(open(enp, encoding='utf-8')) if os.path.exists(enp) else {}
        vocab = json.load(open(os.path.join(d, 'vocab.json')))
        unit_of = {v['word']: v.get('unit') for v in vocab}
        order = max([t['order'] for t in texts] + [0])
        import random
        rng = random.Random(lv)
        lvwords = [v['word'] for v in vocab if len(v['word']) > 1]
        for r in parse(src):
            order += 1
            body = ''.join(p for p, _ in r['paras'])
            unit = r['unit']
            if unit is None:
                votes = {}
                for w, u in unit_of.items():
                    if len(w) > 1 and w in body: votes[u] = votes.get(u, 0) + 1
                unit = max(votes, key=votes.get) if votes else 1
            paras = [p for p, _ in r['paras']]
            texts.append({
                'id': f'{lv}-t{order}', 'level': lv, 'order': order, 'unit': unit, 'x': 1,
                'title': {'zh': r['zh'], 'es': r['es'], 'en': EN.get(r['es'], r['en'])},
                'summary': {'es': r['sum'], 'en': EN.get(r['sum'], r['sum'])},
                'paragraphs': paras,
                'translation': {'es': [e for _, e in r['paras']],
                                **({'en': [EN[e] for _, e in r['paras']]} if all(e in EN for _, e in r['paras']) else {})},
                'glossary': {}, 'questions': [{**q, 'q': {**q['q'], 'en': EN.get(q['q']['es'], q['q']['es'])}} for q in r['qs']],
                'gaps': gaps_for(body, lvwords, rng), 'notes': [],
                'vb': [verb_ranges(p) for p in paras],
            })
            for s in [r['zh']] + paras + [q['q']['zh'] for q in r['qs']] + [o for q in r['qs'] for o in q['options']]:
                for line in s.split('\n'):
                    line = line.strip()
                    if HAN.search(line):
                        rd = reading(line)
                        if len(rd.split()) == len(HAN.findall(line)): py['s'][line] = rd
            added += 1
        json.dump(texts, open(os.path.join(d, 'texts.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(py, open(os.path.join(DATA, 'py.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('extra readings:', added)


main()
