"""Merges generated content (units / texts / drills) into data/hskN/*.json.

usage: python tools/integrate.py CONTENT_DIR
CONTENT_DIR has units/hskN_a-b.json, texts/hskN_a-b.json, drills/hskN_*.json.
Every word of the level is assigned to a unit: the unit's newVocab first, the remaining
words split by frequency across the units. data/py.json gets sentence readings ("s").
Needs jieba + pypinyin (e.g. /tmp/ttsvenv/bin/python).
"""
import glob, json, os, re, sys
import jieba, logging
from pypinyin import lazy_pinyin, Style

jieba.setLogLevel(logging.ERROR)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
LEVELS = [f'hsk{i}' for i in range(1, 8)]
HAN = re.compile(r'[\u3400-\u9fff]')
SYL = re.compile(r"[a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]+")


def load(p, default=None):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def dump(p, obj):
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))


def merged(content, kind, lv):
    out = []
    for p in sorted(glob.glob(os.path.join(content, kind, f'{lv}_*.json'))):
        try:
            out += load(p, [])
        except json.JSONDecodeError as e:
            print(f'  ! {p}: {e}')
    return out


def split_py(p):
    from re import findall
    return findall(r"[^aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s'’-]*[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:ng|n(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]))?|[^\s'’-]+", p.lower())


def verb_ranges(p):
    """Flat [start, end, start, end, ...] character ranges of verbs in paragraph p (jieba POS)."""
    import jieba.posseg as ps
    out, i = [], 0
    for tok in ps.cut(p):
        if tok.flag.startswith('v') and tok.flag != 'vn':
            out += [i, i + len(tok.word)]
        i += len(tok.word)
    return out


def main(content):
    py = load(os.path.join(DATA, 'py.json'))
    wpy = py['w']
    for w in wpy:
        jieba.add_word(w, freq=2000)

    def reading(s):
        """Space-separated syllables for the Han characters of s: HSK readings for multi-char words,
        pypinyin in context for the rest."""
        out = []
        for tok in jieba.lcut(s):
            han = [c for c in tok if HAN.match(c)]
            if not han:
                continue
            if len(han) > 1 and tok in wpy and len(wpy[tok].split()) == len(han):
                out += wpy[tok].split()
            else:
                out += [x for x in lazy_pinyin(''.join(han), style=Style.TONE) if x]
        return ' '.join(out)

    sentences = set()
    plan = load(os.path.join(content, 'plan.json'), {})

    def add(s):
        if not isinstance(s, str):
            return
        for line in s.replace('___', '').split('\n'):
            line = line.strip()
            if HAN.search(line):
                sentences.add(line)
                m = re.match(r'^([^：:]{1,8})[：:]', line)
                if m:
                    sentences.add(m.group(1))

    for lv in LEVELS:
        d = os.path.join(DATA, lv)
        vocab = load(os.path.join(d, 'vocab.json'))
        units = sorted(merged(content, 'units', lv), key=lambda u: u['id'])
        expected = len(plan.get(lv, [])) if plan else 0
        ids = [u['id'] for u in units]
        if units and (sorted(ids) != list(range(1, expected + 1))):
            print(f'  ! {lv}: units incomplete {sorted(set(range(1, expected + 1)) - set(ids))}, kept old units.json')
            units = []
        if units:
            by_word = {v['word']: v for v in vocab}
            owner = {}
            for u in units:
                u['newVocab'] = [w for w in u.get('newVocab', []) if w in by_word and w not in owner]
                for w in u['newVocab']:
                    owner[w] = u['id']
            rest = [v['word'] for v in sorted(vocab, key=lambda v: v.get('q', 1e9)) if v['word'] not in owner]
            n = len(units)
            for k, w in enumerate(rest):
                owner[w] = units[k * n // len(rest)]['id'] if rest else units[0]['id']
            for u in units:
                u['vocab'] = u['newVocab'] + [w for w in rest if owner[w] == u['id']]
                u.setdefault('grammar', [])
                for key in ('title', 'desc'):
                    add((u.get(key) or {}).get('zh'))
                for ex in u.get('exercises', []):
                    if ex.get('type') == 'fill':
                        add(ex.get('sentence', '').replace('___', ex.get('blank', '')))
                    for k in ('prompt', 'answer'):
                        add(ex.get(k))
                    for o in ex.get('options', []) or []:
                        add(o)
            for v in vocab:
                v['unit'] = owner.get(v['word'], v.get('unit'))
                v['u'] = f"{lv}-{v['unit']}"
            dump(os.path.join(d, 'units.json'), units)
            dump(os.path.join(d, 'vocab.json'), vocab)
        texts = sorted(merged(content, 'texts', lv), key=lambda t: t.get('order', 0))
        if texts:
            for tx in texts:
                tx['vb'] = [verb_ranges(p) for p in tx['paragraphs']]
            dump(os.path.join(d, 'texts.json'), texts)
            for tx in texts:
                add(tx['title'].get('zh'))
                for p in tx['paragraphs']:
                    add(p)
                for q in tx.get('questions', []):
                    add(q['q'].get('zh'))
                    for o in q.get('options', []):
                        add(o)
                for n in tx.get('notes', []):
                    add(n.get('f'))
        drills = merged(content, 'drills', lv)
        if drills:
            dump(os.path.join(d, 'drills.json'), drills)
            for c in drills:
                add(c['title'].get('zh'))
                for it in c['items']:
                    add(it['q'].replace('___', it['o'][it['a']]))
                    for o in it['o']:
                        add(o)
        print(f'{lv}: {len(units)} units, {len(texts)} texts, {len(drills)} drill sets')

    py['s'] = {s: reading(s) for s in sorted(sentences)}
    # Keep only readings that align one syllable per Han character.
    py['s'] = {s: r for s, r in py['s'].items() if len(r.split()) == len(HAN.findall(s))}
    dump(os.path.join(DATA, 'py.json'), py)
    print(f'py.json: {len(py["s"])} sentence readings')


if __name__ == '__main__':
    main(sys.argv[1])
