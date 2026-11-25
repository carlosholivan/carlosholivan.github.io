"""Builds the story mode data (data/story/<level>.json) from tools/story_src/<level>.txt.

Format (one item per line; "target | es | en" everywhere):
  == intro / == finale / == <unit id>      start a block
  who: target | es | en                    a line of dialogue (who = a cast id from meta.json, or narr)
  ? target | es | en                       the question of the choice (optional)
  > friend: target | es | en               a choice option (friend = cast id whose friendship grows, or -)
    who: target | es | en                  (indented) the reply to that option
  mission: es | en                         the mission shown before the lesson
  --                                       what follows is the closing scene (after the lesson)
  gift: target | es | en                   (in finale) the chapter's reward
Usage: python3 tools/build_story.py            (all levels)
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def tri(s):
    p = [x.strip() for x in s.split('|')]
    if len(p) != 3: raise ValueError(f'expected "target | es | en": {s!r}')
    return p[0], {'es': p[1], 'en': p[2]}


def build(path):
    lv = os.path.basename(path)[:-4]
    out = {'level': lv, 'units': {}}
    blk = None
    for n, raw in enumerate(open(path, encoding='utf8'), 1):
        line = raw.rstrip('\n')
        if not line.strip() or line.lstrip().startswith('#'): continue
        try:
            if line.startswith('== '):
                name = line[3:].strip()
                blk = {'intro': [], 'outro': [], '_part': 'intro'}
                if name in ('intro', 'finale'): out[name] = blk
                else: out['units'][name] = blk
                continue
            s = line.strip()
            if s == '--': blk['_part'] = 'outro'; continue
            if s.startswith('mission:'):
                es, en = [x.strip() for x in s[8:].split('|')]; blk['mission'] = {'es': es, 'en': en}; continue
            if s.startswith('gift:'):
                t, tr = tri(s[5:]); out['gift'] = {'t': t, 'tr': tr}; continue
            if s.startswith('?'):
                t, tr = tri(s[1:]); blk.setdefault('choice', {'options': []})['q'] = {'t': t, 'tr': tr}; continue
            if s.startswith('>'):
                f, rest = s[1:].split(':', 1)
                t, tr = tri(rest)
                opt = {'t': t, 'tr': tr, 'reply': []}
                if f.strip() != '-': opt['f'] = f.strip()
                blk.setdefault('choice', {'options': []})['options'].append(opt); continue
            m = re.match(r'(\s*)(\w+):\s*(.*)$', line)
            if not m: raise ValueError('unknown line')
            t, tr = tri(m.group(3))
            item = {'who': m.group(2), 't': t, 'tr': tr}
            if m.group(1) and blk.get('choice'): blk['choice']['options'][-1]['reply'].append(item)
            else: blk[blk['_part']].append(item)
        except Exception as e:
            sys.exit(f'{path}:{n}: {e}\n  {line}')
    for b in [out.get('intro'), out.get('finale'), *out['units'].values()]:
        if b: b.pop('_part', None)
    if 'finale' in out: out['finale'] = out['finale']['intro']
    if 'intro' in out: out['intro'] = out['intro']['intro']
    os.makedirs(f'{ROOT}/data/story', exist_ok=True)
    json.dump(out, open(f'{ROOT}/data/story/{lv}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    units = json.load(open(f'{ROOT}/data/{lv}/units.json', encoding='utf8'))
    missing = [str(u['id']) for u in units if str(u['id']) not in out['units']]
    print(f'{lv}: {len(out["units"])} scenes', f'(missing: {", ".join(missing)})' if missing else '')


if __name__ == '__main__':
    for p in sorted(glob.glob(f'{HERE}/story_src/*.txt')): build(p)
    meta = f'{HERE}/story_src/meta.json'
    if os.path.exists(meta):
        json.dump(json.load(open(meta, encoding='utf8')), open(f'{ROOT}/data/story/meta.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
