"""Adds grammar exercises to the lessons: tools/grammar_ex/<level>.json → data/<level>/units.json.

Each item: {"q": sentence with ___, "a": right form, "o": [3 confusable wrong forms],
            "es"/"en": translation, "ees"/"een": why (shown when the answer is wrong)}
They become 'fill' exercises tagged g:true (rebuilding first removes the old tagged ones), so running it again is safe.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for lv in sys.argv[1:] or ['n5', 'n4', 'n3', 'n2', 'n1']:
    src = ROOT / 'tools' / 'grammar_ex' / f'{lv}.json'
    if not src.exists():
        continue
    G = json.loads(src.read_text(encoding='utf-8'))
    up = ROOT / 'data' / lv / 'units.json'
    raw = up.read_text(encoding='utf-8')
    U = json.loads(raw)
    n = 0
    for u in U:
        u['exercises'] = [e for e in u.get('exercises', []) if not e.get('g')]
        for it in G.get(str(u['id']), []):
            assert '___' in it['q'] and it['a'] not in it['o'], it
            if it.get('t') == 'choose':  # «translation» → which sentence is right?
                full = lambda x: it['q'].replace('___', x)
                u['exercises'].append({'type': 'choose', 'g': True, 'prompt': {'es': f"«{it['es']}» — ¿qué frase es correcta?",
                                       'en': f"«{it['en']}» — which sentence is correct?"},
                                       'options': [full(it['a']), *map(full, it['o'])], 'correct': full(it['a']),
                                       'e': {'es': it['ees'], 'en': it['een']}})
            else:
                u['exercises'].append({'type': 'fill', 'g': True, 'sentence': it['q'], 'blank': it['a'],
                                       'options': [it['a'], *it['o']], 'tr': {'es': it['es'], 'en': it['en']},
                                       'e': {'es': it['ees'], 'en': it['een']}})
            n += 1
    up.write_text(json.dumps(U, ensure_ascii=False, indent=1 if raw.startswith('[\n') else None), encoding='utf-8')
    print(lv, n, 'grammar exercises')
