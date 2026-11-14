"""Optional practice sets 2–7 for every lesson (data/<level>/extra.json), in the same format as the
sibling apps: { "<unit>": { "sets": [[exercise…] ×6], "words": [[word…] ×6] } }.

Every set mixes: a matching board of unit words, "which sentence means…" (choose), gap fills from the
level's grammar drills, gap fills of unit words in course sentences, and word-order sentences.
All sentences and translations come from the course (drills + readings), so en/ja/zh are complete.
Deterministic (seeded) so rebuilding doesn't reshuffle users' sets.
"""
import json, random, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
LANGS = ['en', 'ja', 'zh']
WORD = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")
BUILD = {'en': "Build: “{s}”", 'ja': '並べ替え：「{s}」', 'zh': '组句：“{s}”'}
WHICH = {'en': 'Which sentence means: “{s}”?', 'ja': '「{s}」という意味の文は？', 'zh': '哪句话的意思是“{s}”？'}

load = lambda p: json.loads(p.read_text(encoding='utf-8'))
exec(compile(open(ROOT / 'tools' / 'build_examples.py', encoding='utf-8').read().split('# index:')[0], 'ex', 'exec'))  # → sentences, split_es…


def drill_items(lv):
    out = []
    for d in load(ROOT / 'data' / lv / 'drills.json'):
        for it in d.get('items', []):
            if '___' in it['q'] and it.get('tr'):
                out.append({'type': 'fill', 'sentence': it['q'], 'blank': it['o'][it['a']], 'options': it['o'],
                            'tr': {l: it['tr'].get(l, '') for l in LANGS}})
    return out


def has_word(s, w):
    return re.search(r'(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])' + re.escape(w) + r'(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])', s, re.I)


total = 0
for li, lv in enumerate(LEVELS):
    rnd = random.Random(f'extra-{lv}')
    V = load(ROOT / 'data' / lv / 'vocab.json')
    U = load(ROOT / 'data' / lv / 'units.json')
    meaning = {v['word']: v['m'] for v in V}
    pool = [x for x in sentences if x[2] <= li]
    drills = drill_items(lv)
    rnd.shuffle(drills)
    out = {}
    for ui, u in enumerate(U):
        words = [w for w in u.get('newVocab', []) if w in meaning]
        if len(words) < 3:
            continue
        mine = [x for x in pool if any(has_word(x[0], w) for w in words)]
        rnd.shuffle(mine)
        others = [x for x in pool if x not in mine]
        rnd.shuffle(others)
        sents = mine + others
        sets, wsets = [], []
        si = 0
        for k in range(6):
            win = [words[(k * 3 + j) % len(words)] for j in range(min(6, len(words)))]
            win = list(dict.fromkeys(win))
            ex = [{'type': 'match', 'pairs': [[w, meaning[w]] for w in win[:5]]}] if len(win) >= 3 else []
            # choose: translation → the Spanish sentence
            for _ in range(2):
                s, trd, _ = sents[si % len(sents)]; si += 1
                wrong = [x[0] for x in rnd.sample(pool, 6) if x[0] != s][:2]
                ex.append({'type': 'choose', 'prompt': {l: WHICH[l].format(s=trd[l]) for l in LANGS},
                           'options': [s] + wrong, 'correct': s})
            # fill a unit word inside a course sentence
            for _ in range(2):
                for tries in range(len(sents)):
                    s, trd, _ = sents[si % len(sents)]; si += 1
                    hit = next((w for w in win if has_word(s, w)), None)
                    if hit:
                        m = has_word(s, hit)
                        cands = [w for w in words if w != hit and ' ' not in w] or [w for w in words if w != hit]
                        opts = [hit] + rnd.sample(cands, min(3, len(cands)))
                        ex.append({'type': 'fill', 'sentence': s[:m.start()] + '___' + s[m.end():], 'blank': m.group(0),
                                   'options': list(dict.fromkeys([m.group(0)] + opts[1:])), 'tr': trd})
                        break
            # grammar drills of the level
            for _ in range(3):
                if drills:
                    ex.append(drills[(ui * 18 + k * 3 + _) % len(drills)])
            # word order with a short sentence
            short = [x for x in sents if 4 <= len(WORD.findall(x[0])) <= 8]
            if short:
                s, trd, _ = short[(ui + k * 5) % len(short)]
                toks = s.split()
                ex.append({'type': 'order', 'prompt': {l: BUILD[l].format(s=trd[l]) for l in LANGS},
                           'words': toks, 'answer': s})
            sets.append(ex)
            wsets.append(win)
        out[str(u['id'])] = {'sets': sets, 'words': wsets}
    (ROOT / 'data' / lv / 'extra.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    total += len(out)
    print(lv, len(out), 'units with extra sets')
