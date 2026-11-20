"""Grammar practice (data/<level>/drills.json): one drill set per lesson, made of the lesson's gap-fill
exercises (German sentence ___, right form + distractors, Spanish and English translation, hint).
Options are shuffled once (seeded) so rebuilding doesn't change them.
Usage: python3 tools/build_drills.py [level…]
"""
import json, random, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
ICONS = '🔤📘🧩🧠🎯🛠️🔁📐🗝️🧭⚙️🪄📎🧱🔍📝🎓🌿🪜💬'


def build(lv):
    cats = []
    for i, u in enumerate(json.loads((ROOT / 'data' / lv / 'units.json').read_text(encoding='utf8'))):
        items = []
        for e in u.get('exercises', []):
            if e['type'] != 'fill':
                continue
            opts = list(dict.fromkeys(e['options']))
            random.Random(e['sentence']).shuffle(opts)
            hint = e.get('hint') or {}
            items.append({'q': e['sentence'], 'o': opts, 'a': opts.index(e['blank']), 'tr': e['tr'],
                          'e': {'es': hint.get('es') or '', 'en': hint.get('en') or hint.get('es') or ''}})
        if len(items) < 3:
            continue
        cats.append({'id': f'u{u.get("id", i + 1)}', 'icon': ICONS[i % len(ICONS)],
                     'title': {'de': u['title']['de'], 'es': u['title']['es'], 'en': u['title']['en']},
                     'desc': {'es': (u.get('desc') or {}).get('es', ''), 'en': (u.get('desc') or {}).get('en', '')}, 'items': items})
    (ROOT / 'data' / lv / 'drills.json').write_text(json.dumps(cats, ensure_ascii=False), encoding='utf8')
    print(f'{lv}: {len(cats)} drill sets, {sum(len(c["items"]) for c in cats)} items')


for lv in sys.argv[1:] or LEVELS:
    build(lv)
