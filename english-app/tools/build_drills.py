"""Grammar practice (data/<level>/drills.json) from tools/drills_src/<level>.txt:
  ## id | icon | English title | Spanish title | description (es)
  sentence with ___ ¦ right answer ¦ wrong / wrong / wrong ¦ Spanish translation ¦ why (es)
Options are shuffled once (seeded) so rebuilding doesn't change them.
Usage: python3 tools/build_drills.py [level…]
"""
import json, random, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']


def build(lv):
    cats, cur = [], None
    for raw in open(ROOT / 'tools' / 'drills_src' / f'{lv}.txt', encoding='utf8'):
        line = raw.rstrip('\n')
        if not line.strip() or line.startswith('#!') or (line.startswith('#') and not line.startswith('##')):
            continue
        if line.startswith('## '):
            cid, icon, title, tes, desc = [x.strip() for x in line[3:].split('|')]
            cur = {'id': cid, 'icon': icon, 'title': {'en': title, 'es': tes}, 'desc': {'es': desc}, 'items': []}
            cats.append(cur); continue
        c = [x.strip() for x in line.split('¦')]
        if len(c) < 5 or '___' not in c[0]:
            raise SystemExit(f'{lv}: bad drill line: {line}')
        q, right, wrong, tr, why = c[:5]
        opts = [right] + [w.strip() for w in wrong.split(' / ') if w.strip()]
        random.Random(q).shuffle(opts)
        cur['items'].append({'q': q, 'o': opts, 'a': opts.index(right), 'tr': {'es': tr}, 'e': {'es': why}})
    (ROOT / 'data' / lv / 'drills.json').write_text(json.dumps(cats, ensure_ascii=False), encoding='utf8')
    print(f'{lv}: {len(cats)} drill sets, {sum(len(c["items"]) for c in cats)} items')


for lv in sys.argv[1:] or [l for l in LEVELS if (ROOT / 'tools' / 'drills_src' / f'{l}.txt').exists()]:
    build(lv)
