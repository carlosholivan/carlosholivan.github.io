#!/usr/bin/env python3
"""English for the hand-written extra readings (tools/texts/hskN.txt).

  python3 tools/en_todo.py <level> [chunk]          → next untranslated strings, numbered
  python3 tools/en_todo.py <level> --merge FILE     → FILE has "n<TAB>English" lines for those numbers

Translations live in tools/texts/en/<level>.json ({Spanish: English}); add_texts.py reads them.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def strings(lv):
    out = []
    add = lambda s: s and s not in out and out.append(s)
    for line in open(os.path.join(ROOT, 'tools', 'texts', f'{lv}.txt'), encoding='utf-8'):
        line = line.strip()
        if line.startswith('### '):
            p = [x.strip() for x in line[4:].split('|')]
            if len(p) < 3 or not p[2]: add(p[1])
        elif line.startswith('> '): add(line[2:].strip())
        elif line.startswith('? '): add(line[2:].split('|')[1].strip())
        elif ' = ' in line and not line.startswith('#'): add(line.split(' = ', 1)[1].strip())
    return out


def store(lv):
    p = os.path.join(ROOT, 'tools', 'texts', 'en', f'{lv}.json')
    return p, (json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {})


if __name__ == '__main__':
    lv = sys.argv[1]
    path, en = store(lv)
    todo = [s for s in strings(lv) if s not in en]
    if len(sys.argv) > 3 and sys.argv[2] == '--merge':
        n = 0
        for line in open(sys.argv[3], encoding='utf-8'):
            if '\t' not in line: continue
            i, t = line.rstrip('\n').split('\t', 1)
            i = int(i)
            if 0 <= i < len(todo) and t.strip():
                en[todo[i]] = t.strip(); n += 1
        os.makedirs(os.path.dirname(path), exist_ok=True)
        json.dump(en, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        print(f'merged {n}; left {len(todo) - n}')
    else:
        k = int(sys.argv[2]) if len(sys.argv) > 2 else 120
        print(f'# {len(todo)} left')
        for i, s in enumerate(todo[:k]): print(f'{i}\t{s}')
