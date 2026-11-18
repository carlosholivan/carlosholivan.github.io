"""Merges the curated groups of tools/synonym_notes.txt into data/<level>/synonyms.json.

Line format:  word1 / word2 [/ …] = nota (es) | note (en)
Every word of a group that exists in a vocabulary list (also matched by kana reading, e.g. きれい → 綺麗) gets the
other words as near-synonyms and the note on how they differ, shown on the back of its card.
Usage: python3 tools/add_synonyms.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'data'
LV = ['n5', 'n4', 'n3', 'n2', 'n1']


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in (s or ''))


lvof, byread = {}, {}
for lv in LV:
    for v in json.load(open(D / lv / 'vocab.json', encoding='utf8')):
        lvof.setdefault(v['word'], lv)
        byread.setdefault(hira(v.get('p') or v.get('r') or ''), []).append((v.get('q') or 99999, v['word']))


def resolve(w):
    if w in lvof:
        return w
    c = sorted(byread.get(hira(w), []))
    return c[0][1] if c else None


SYN = {lv: json.load(open(D / lv / 'synonyms.json', encoding='utf8')) for lv in LV}
groups = 0
notes = {}
for line in open(ROOT / 'tools' / 'synonym_notes.txt', encoding='utf8'):
    if line.startswith('#') or '=' not in line:
        continue
    left, note = line.split('=', 1)
    es, _, en = note.partition('|')
    ws = [x for x in (resolve(w.strip()) for w in left.split('/')) if x]
    ws = list(dict.fromkeys(ws))
    if len(ws) < 2:
        continue
    groups += 1
    for w in ws:
        e = SYN[lvof[w]].setdefault(w, {})
        e['s'] = list(dict.fromkeys([x for x in ws if x != w] + [x for x in e.get('s', []) if x not in ws]))
        notes.setdefault(w, []).append((es.strip(), en.strip()))
        e['n'] = {'es': '\n'.join(n[0] for n in notes[w]), 'en': '\n'.join(n[1] for n in notes[w])}
for lv in LV:
    (D / lv / 'synonyms.json').write_text(json.dumps(SYN[lv], ensure_ascii=False, separators=(',', ':')), encoding='utf8')
print(groups, 'groups;', {lv: len(SYN[lv]) for lv in LV})
