"""Builds the course data of the English app from the hand-written sources:

  tools/vocab_src/<level>.txt  — the CEFR-J / Octanove word list of the level translated into es | ja | zh
                                 line: headword[=British headword] | es | ja | zh      (- headword: dropped)
  tools/units_src/<level>.txt  — the lessons (EOI syllabus): title, description, grammar intro, exercises, words

Writes data/<level>/vocab.json, units.json and grammar.json (the Reference entries, one per lesson grammar point).
The app is for Spanish speakers: every translation is Spanish only. The A1 sources were first written with
Japanese and Chinese too ({{es ¦ ja ¦ zh}} snippets, three translation cells); only the Spanish one is kept.
A source that starts with the line "#! es" has a single translation cell everywhere.
Usage: python3 tools/build_course.py [level…]
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
L3 = ['es']
N = 3  # translation cells per entry in the source being read (3 for the A1 sources, 1 with '#! es')
SEP = '¦'
POS = {}  # headword (lower) → [pos…] from the CEFR lists
for f in ['cefrj-vocabulary-profile-1.5.csv', 'octanove-vocabulary-profile-c1c2-1.0.csv']:
    p = ROOT / 'tools' / 'vocab_src' / f
    if p.exists():
        import csv
        for r in csv.DictReader(open(p, encoding='utf8')):
            k = r['headword'].split('/')[0].strip().lower()
            POS.setdefault(k, [])
            if r['pos'] not in POS[k]:
                POS[k].append(r['pos'])


def tri(s):
    """'{{a ¦ b ¦ c}}' snippets → {es, ja, zh} versions of the whole string."""
    out = {}
    for i, l in enumerate(L3):
        def rep(m):
            parts = [x.strip() for x in m.group(1).split(SEP)]
            return parts[0]
        out[l] = re.sub(r'\{\{(.+?)\}\}', rep, s, flags=re.S)
    return out


def dkey(w):
    # names and titles (Miss, May) are other words than miss, may
    return w if w[:1].isupper() and w[1:2].islower() else w.lower()


def load_vocab(lv):
    out = []
    for line in open(ROOT / 'tools' / 'vocab_src' / f'{lv}.txt', encoding='utf8'):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#') or line.startswith('-'):
            continue
        parts = [x.strip() for x in line.split('|')]
        if len(parts) < 2:
            raise SystemExit(f'{lv}: bad vocab line: {line}')
        head, es = parts[:2]
        orig, _, word = head.partition('=')
        word = word or orig
        e = {'word': word, 'm': {'es': es}, 'pos': '/'.join(POS.get(orig.lower(), [])), 'w': word, 'p': ''}
        if word != orig:
            e['us'] = orig
        out.append(e)
    return out


def parse_units(lv):
    p = ROOT / 'tools' / 'units_src' / f'{lv}.txt'
    if not p.exists():
        return []
    global N
    units, cur, block = [], None, None
    N = 3
    for raw in open(p, encoding='utf8'):
        line = raw.rstrip('\n')
        if line.strip() == '#! es':
            N = 1; continue
        if line.startswith('#') and not line.startswith('#!'):
            continue
        m = re.match(r'^=== (\d+)\s*$', line)
        if m:
            cur = {'id': int(m.group(1)), 'intro': [], 'ex': [], 'words': []}
            units.append(cur); block = None
            continue
        if cur is None:
            continue
        m = re.match(r'^(title|desc|gram|words|ref):\s*(.*)$', line)
        if m and block is None:
            k, v = m.groups()
            if k == 'words':
                cur['words'] += [w.strip() for w in v.split(',') if w.strip()]
            else:
                cur[k] = v
            continue
        if line.strip() == 'intro:':
            block = 'intro'; continue
        if line.strip() == 'ex:':
            block = 'ex'; continue
        if block == 'intro':
            cur['intro'].append(line)
        elif block == 'ex' and line.strip():
            cur['ex'].append(line)
    return units


def cells(line):
    return [x.strip() for x in line.split(SEP)]


TPL = {
    'translate': {'es': 'Traduce: «{s}»', 'ja': '英訳しよう：「{s}」', 'zh': '翻译成英语：“{s}”'},
    'order': {'es': 'Ordena: «{s}»', 'ja': '並べ替え：「{s}」', 'zh': '组句：“{s}”'},
}


def hint(c, i):
    h = c[i:i + N]
    return {'es': h[0]} if h and h[0] else None


def tr1(c, i):
    return {'es': c[i]}


def build_ex(line, lv, uid):
    c = cells(line)
    t = c[0]
    try:
        if t == 'fill':
            sent, ans, dis = c[1], c[2], [x.strip() for x in c[3].split('/') if x.strip()]
            assert '___' in sent, sent
            e = {'type': 'fill', 'sentence': sent, 'blank': ans, 'options': [ans] + dis, 'tr': tr1(c, 4)}
            if hint(c, 4 + N): e['hint'] = hint(c, 4 + N)
            return e
        if t == 'choose':
            e = {'type': 'choose', 'prompt': tr1(c, 1), 'correct': c[1 + N], 'options': [c[1 + N]] + [x.strip() for x in c[2 + N].split(' / ') if x.strip()]}
            if hint(c, 3 + N): e['hint'] = hint(c, 3 + N)
            return e
        if t == 'order':
            sent = c[1]
            e = {'type': 'order', 'prompt': {'es': TPL['order']['es'].format(s=c[2])}, 'words': sent.split(), 'answer': sent, 'tr': {'es': c[2]}}
            if hint(c, 2 + N): e['hint'] = hint(c, 2 + N)
            return e
        if t == 'translate':
            ans = c[1 + N]
            acc = [ans] + [x.strip() for x in (c[2 + N] if len(c) > 2 + N else '').split(' / ') if x.strip()]
            e = {'type': 'translate', 'prompt': {'es': TPL['translate']['es'].format(s=c[1])}, 'answer': ans, 'accept': acc, 'tr': {'es': c[1]}}
            if hint(c, 3 + N): e['hint'] = hint(c, 3 + N)
            return e
        if t == 'match':
            pairs = []
            for pr in c[1].split(';'):
                xs = [x.strip() for x in pr.split('=')]
                pairs.append([xs[0], {'es': xs[1]}])
            return {'type': 'match', 'pairs': pairs}
        if t == 'listen':
            return {'type': 'listen', 'text': c[1], 'correct': c[1], 'options': [c[1]] + [x.strip() for x in c[2].split(' / ')]}
    except Exception as err:
        raise SystemExit(f'{lv} unit {uid}: bad exercise ({err}): {line}')
    raise SystemExit(f'{lv} unit {uid}: unknown exercise type: {line}')


def clean_html(h):
    return re.sub(r'>\s+<', '><', re.sub(r'\s*\n\s*', ' ', h)).strip()


def build(lv):
    vocab = load_vocab(lv)
    lower = {v['word'].lower(): v for v in vocab}
    for v in vocab:
        if 'us' in v:
            lower.setdefault(v['us'].lower(), v)
    # words of the lower levels (a unit may revise them, but they keep their level)
    lowerlv = {}
    for l2 in LEVELS[:LEVELS.index(lv)]:
        for v in load_vocab(l2):
            lowerlv[dkey(v['word'])] = l2
    vocab = [v for v in vocab if dkey(v['word']) not in lowerlv]  # a word belongs to its lowest level
    lower = {v['word'].lower(): v for v in vocab}
    for v in vocab:
        if 'us' in v:
            lower.setdefault(v['us'].lower(), v)
    units_src = parse_units(lv)
    units, grammar, order = [], [], []
    seen = set(); missing = []
    for u in units_src:
        title = cells(u['title'])
        desc = cells(u.get('desc', ''))
        intro = tri('\n'.join(u['intro']))
        new = []
        for w in u['words']:
            v = lower.get(w.lower())
            if not v:
                if dkey(w) in lowerlv or w.lower() in lowerlv:
                    continue
                missing.append(f'{u["id"]}:{w}')
                continue
            if v['word'] in seen:
                continue
            seen.add(v['word']); new.append(v['word'])
            v['unit'] = u['id']; v['u'] = f'{lv}-{u["id"]}'
        gnames = [g.strip() for g in u.get('gram', '').split(SEP) if g.strip()]
        exs = [build_ex(x, lv, u['id']) for x in u['ex']]
        unit = {'id': u['id'], 'title': {'en': title[0], 'es': title[1]}, 'desc': {'es': desc[0]},
                'grammarIntro': {l: clean_html(intro[l]) for l in L3}, 'grammar': gnames, 'gnames': gnames,
                'newVocab': new, 'vocab': new, 'exercises': exs}
        units.append(unit)
        # Reference entry: the lesson's grammar explanation + example sentences from its exercises
        examples = []
        for e in exs:
            if e['type'] == 'fill' and e.get('tr', {}).get('es'):
                examples.append({'en': e['sentence'].replace('___', e['blank']), **e['tr']})
            if e['type'] in ('order', 'translate'):
                examples.append({'en': e['answer'], 'es': e['tr']['es']})
        grammar.append({'id': u.get('ref') or f'{lv}-u{u["id"]}', 'unit': u['id'],
                        'title': {'en': ' · '.join(gnames) or title[0], **{l: unit['title'][l] + ('' if not gnames else '') for l in L3}},
                        'summary': {l: ' · '.join(gnames) for l in L3},
                        'explanation': {l: clean_html(intro[l]) for l in L3}, 'examples': examples[:6]})
    if missing:
        raise SystemExit(f'{lv}: words not in the list: ' + ', '.join(missing))
    # vocabulary order: lesson words in lesson order, then the rest of the level list
    pos_in_units = {w: i for i, w in enumerate(w for u in units for w in u['newVocab'])}
    vocab.sort(key=lambda v: (0, pos_in_units[v['word']]) if v['word'] in pos_in_units else (1, v['word'].lower()))
    for v in vocab:
        v.setdefault('unit', None); v.setdefault('u', '')
    d = ROOT / 'data' / lv
    d.mkdir(parents=True, exist_ok=True)
    (d / 'vocab.json').write_text(json.dumps(vocab, ensure_ascii=False, indent=0), encoding='utf8')
    if units:
        (d / 'units.json').write_text(json.dumps(units, ensure_ascii=False), encoding='utf8')
        (d / 'grammar.json').write_text(json.dumps(grammar, ensure_ascii=False), encoding='utf8')
    print(f'{lv}: {len(vocab)} words, {len(units)} units, {sum(len(u["newVocab"]) for u in units)} lesson words, {sum(len(u["exercises"]) for u in units)} exercises')


def rank():
    q = 1
    for lv in LEVELS:
        p = ROOT / 'data' / lv / 'vocab.json'
        if not p.exists():
            continue
        vs = json.loads(p.read_text(encoding='utf8'))
        for v in vs:
            v['q'] = q; q += 1
        p.write_text(json.dumps(vs, ensure_ascii=False, indent=0), encoding='utf8')


if __name__ == '__main__':
    lvs = sys.argv[1:] or [l for l in LEVELS if (ROOT / 'tools' / 'vocab_src' / f'{l}.txt').exists()]
    for lv in lvs:
        build(lv)
    rank()
