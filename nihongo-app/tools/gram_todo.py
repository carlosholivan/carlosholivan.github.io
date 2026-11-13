#!/usr/bin/env python3
"""English for the grammar explanations used by the lessons (grammar_extra.json + legacy_data.json).

  python3 tools/gram_todo.py [chunk]          → next untranslated strings, numbered
  python3 tools/gram_todo.py --merge FILE     → FILE has "n<TAB>English" lines for those numbers

Translations live in tools/grammar_en.json ({Spanish: English}); build_texts.py reads them.
"""
import json, re, sys, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']
legacy = json.load(open(ROOT / 'tools' / 'legacy_data.json', encoding='utf8'))
GEXTRA = json.load(open(ROOT / 'tools' / 'grammar_extra.json', encoding='utf8'))
STORE = ROOT / 'tools' / 'grammar_en.json'


def find(p, level):
    L = level.upper()
    gl = legacy['grammar'].get(L, []) + [x for k, v in legacy['grammar'].items() if k != L for x in v]
    if p in GEXTRA: return {'p': p, **GEXTRA[p], 'explain': GEXTRA[p]}
    norm = lambda x: re.split(r'[ (（]', x.replace('～', ''))[0]
    for g in gl:
        if g['p'].replace('～', '').replace(' ', '') == p.replace('～', '').replace(' ', '') or norm(g['p']) == norm(p): return g
    return None


def strings():
    out = []
    for lv in LEVELS:
        for line in open(ROOT / 'tools' / 'texts' / f'{lv}.txt', encoding='utf8'):
            if not line.startswith('## '): continue
            p = [x.strip() for x in line[3:].split('|')]
            for gp in ([g.strip() for g in p[4].split(',')] if len(p) > 4 and p[4] else []):
                g = find(gp, lv)
                if not g: continue
                e = g.get('explain', {})
                for s in (g.get('es', ''), e.get('form', ''), e.get('nuance', ''), e.get('tip', '')):
                    if s and s not in out: out.append(s)
    return out


if __name__ == '__main__':
    en = json.load(open(STORE, encoding='utf8')) if STORE.exists() else {}
    todo = [s for s in strings() if s not in en]
    if len(sys.argv) > 2 and sys.argv[1] == '--merge':
        n = 0
        for line in open(sys.argv[2], encoding='utf8'):
            if '\t' not in line: continue
            i, t = line.rstrip('\n').split('\t', 1)
            i = int(i)
            if 0 <= i < len(todo) and t.strip():
                en[todo[i]] = t.strip(); n += 1
        json.dump(en, open(STORE, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
        print(f'merged {n}; left {len(todo) - n}')
    else:
        k = int(sys.argv[1]) if len(sys.argv) > 1 else 200
        print(f'# {len(todo)} left')
        for i, s in enumerate(todo[:k]): print(f'{i}\t{s}')
