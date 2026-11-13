#!/usr/bin/env python3
"""English translations of the course content (shared by nihongo-app and arabic-app).

  python3 nihongo-app/tools/en_todo.py <app> <level> [chunk]   → prints the next untranslated strings, numbered
  python3 nihongo-app/tools/en_todo.py <app> <level> --merge FILE  → FILE has "n<TAB>English" lines for those numbers

Translations live in <app>/tools/texts/en/<level>.json  ({Spanish: English}); the builders read them.
"""
import json, re, sys, os

LATIN = re.compile(r'[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡]')

def strings(app, lv):
    out = []
    add = lambda s: s and s not in out and out.append(s)
    for line in open(f'{app}/tools/texts/{lv}.txt', encoding='utf8'):
        line = line.rstrip('\n')
        if line.startswith('## '):
            p = [x.strip() for x in line[3:].split('|')]
            if len(p) > 3: add(p[3])
        elif line.startswith('### '):
            p = [x.strip() for x in line[4:].split('|')]
            if len(p) > 1: add(p[1])
        elif line.startswith('? '):
            q, opts = [x.strip() for x in line[2:].split('|')]
            add(q)
            for o in opts.split('/'):
                o = o.strip().lstrip('*').strip()
                if LATIN.search(o): add(o)
        elif line.startswith('!! '):
            p = [x.strip() for x in line[3:].split('|')]
            if p[0] == 'choose': add(p[1])
            elif p[0] == 'fill' and len(p) > 4: add(p[4])
        elif line.startswith('#') or line.startswith('+ ') or line.startswith('@ ') or line.startswith('~ '):
            continue
        elif ' = ' in line:
            add(line.split(' = ', 1)[1].strip())
    return out

def store(app, lv):
    p = f'{app}/tools/texts/en/{lv}.json'
    return p, (json.load(open(p, encoding='utf8')) if os.path.exists(p) else {})

if __name__ == '__main__':
    app, lv = sys.argv[1], sys.argv[2]
    path, en = store(app, lv)
    todo = [s for s in strings(app, lv) if s not in en]
    if len(sys.argv) > 4 and sys.argv[3] == '--merge':
        n = 0
        for line in open(sys.argv[4], encoding='utf8'):
            if '\t' not in line: continue
            i, t = line.rstrip('\n').split('\t', 1)
            i = int(i)
            if 0 <= i < len(todo) and t.strip():
                en[todo[i]] = t.strip(); n += 1
        json.dump(en, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
        print(f'merged {n}; left {len(todo) - n}')
    else:
        k = int(sys.argv[3]) if len(sys.argv) > 3 else 120
        print(f'# {len(todo)} left')
        for i, s in enumerate(todo[:k]):
            print(f'{i}\t{s}')
