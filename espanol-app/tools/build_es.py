"""Brings the course data to the format of the shared app code (same as chino-app / nihongo-app / arabic-app).

Idempotent: run after editing data/<level>/*.json.
  · vocab.json: every entry gets w (= word), p ('' — Spanish needs no reading), u ('<level>-<unit>')
  · units.json: newVocab = list of the unit's words (strings, in vocab order)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']


def load(p):
    return json.loads(p.read_text(encoding='utf-8'))


def dump(p, d):
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


for lv in LEVELS:
    vp, up = ROOT / 'data' / lv / 'vocab.json', ROOT / 'data' / lv / 'units.json'
    V, U = load(vp), load(up)
    for v in V:
        v['w'] = v['word']
        v.setdefault('p', '')
        if v.get('unit') is not None:
            v['u'] = f"{lv}-{v['unit']}"
    dump(vp, V)
    for u in U:
        words = [v['word'] for v in V if v.get('unit') == u['id']]
        if not words:  # fall back to whatever the unit listed
            known = {v['word'] for v in V}
            words = [w if isinstance(w, str) else w['word'] for w in (u.get('newVocab') or u.get('vocab') or [])]
            words = [w for w in words if w in known]
        u['newVocab'] = words
    dump(up, U)
    print(lv, len(V), 'words,', len(U), 'units')
