"""Pilot: picks a few characters per app and 3 short lines each, and writes a voice description for each one.
Output: pilot.json [{app, who, lang, qlang, instruct, ref_text, lines:[...]}]"""
import json, glob
APPS = {'nihongo': ('ja', 'Japanese'), 'deutsch': ('de', 'German'), 'arabic': ('ar', None), 'chino': ('zh', 'Chinese')}
AGE = {'kid': {'m': 'a 10-year-old boy, bright, curious and lively', 'f': 'a 10-year-old girl, bright, cheerful and sweet'},
       'adult': {'m': 'a man around 40, warm, calm and kind', 'f': 'a woman around 40, warm, gentle and caring'},
       'old': {'m': 'an elderly man around 75, slow, wise and friendly', 'f': 'an elderly woman around 75, soft, slow and kind, a storyteller'}}
out = []
for app, (lang, qlang) in APPS.items():
    m = json.load(open(f'../../../{app}-app/data/story/meta.json', encoding='utf8'))
    lines = {}
    for f in sorted(glob.glob(f'../../../{app}-app/data/story/*.json')):
        if f.endswith('meta.json'): continue
        def walk(x):
            if isinstance(x, dict):
                if x.get('who') and isinstance(x.get('t'), str): lines.setdefault(x['who'], []).append(x['t'].strip())
                for v in x.values(): walk(v)
            elif isinstance(x, list):
                for v in x: walk(v)
        walk(json.load(open(f, encoding='utf8')))
    other = lambda age: [k for k, c in m['cast'].items() if k != m['hero'] and (c.get('voice') or {}).get('age') == age][:1]
    want = [m['hero']] + other('kid') + other('old')
    for who in want:
        v = m['cast'][who].get('voice') or {}
        ls = [t for t in lines.get(who, []) if 8 <= len(t) <= 60][:3]
        desc = AGE.get(v.get('age'), AGE['adult'])[v.get('g', 'f')]
        out.append({'app': app, 'who': who, 'lang': lang, 'qlang': qlang, 'ref_text': ls[0] if ls else '',
                    'instruct': f'{desc}. Natural, expressive storytelling voice, clear studio recording, moderate pace.',
                    'lines': ls[1:] + m.get('coach', [])[:2]})
json.dump(out, open('pilot.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'characters')
