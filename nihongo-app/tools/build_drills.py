"""Grammar tests per level (data/<level>/drills.json) from the lesson grammar exercises (tools/grammar_ex/<level>.json).
Keeps the hand-written categories and rebuilds the ones with id 'gt-*': one test per group of ~6 grammar units.
Usage: python3 tools/build_drills.py
"""
import json, random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for lv in ['n5', 'n4', 'n3', 'n2', 'n1']:
    src = ROOT / 'tools' / 'grammar_ex' / f'{lv}.json'
    if not src.exists():
        continue
    G = json.loads(src.read_text(encoding='utf8'))
    units = {u['id']: u for u in json.loads((ROOT / 'data' / lv / 'units.json').read_text(encoding='utf8'))}
    path = ROOT / 'data' / lv / 'drills.json'
    D = [c for c in json.loads(path.read_text(encoding='utf8')) if not str(c.get('id', '')).startswith('gt-')]
    ids = sorted((int(k) for k in G if G[k]), key=int)
    groups = [ids[i:i + 6] for i in range(0, len(ids), 6)]
    if len(groups) > 1 and len(groups[-1]) < 3:
        groups[-2] += groups.pop()
    for n, grp in enumerate(groups, 1):
        items = []
        for uid in grp:
            for it in G[str(uid)]:
                opts = [it['a'], *it['o']]
                random.Random(it['q']).shuffle(opts)
                items.append({'q': it['q'], 'o': opts, 'a': opts.index(it['a']), 'tr': {'es': it['es'], 'en': it['en']},
                              'e': {'es': it['ees'], 'en': it['een']}})
        pts = [g for uid in grp for g in (units.get(uid, {}).get('grammar') or [])]
        rng = f'{grp[0]}–{grp[-1]}' if len(grp) > 1 else str(grp[0])
        D.append({'id': f'gt-{n}', 'icon': '📝', 'title': {'ja': f'文法テスト {n}', 'es': f'Test de gramática {n} (unidades {rng})',
                                                          'en': f'Grammar test {n} (units {rng})'},
                  'desc': {'es': ' · '.join(pts[:6]) + (' …' if len(pts) > 6 else ''), 'en': ' · '.join(pts[:6]) + (' …' if len(pts) > 6 else '')},
                  'items': items})
    path.write_text(json.dumps(D, ensure_ascii=False), encoding='utf8')
    print(lv, len(D), 'categories,', sum(len(c['items']) for c in D), 'items')
