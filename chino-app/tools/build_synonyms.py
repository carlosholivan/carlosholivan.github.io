#!/usr/bin/env python3
"""Build data/<level>/synonyms.json for intermediate+ levels of the three apps.

Two words are offered as near-synonyms when their Spanish and English glosses share meanings
(both languages must agree, to avoid accidental matches like "banco" = bank/bench).
Curated notes on how they differ come from <app>/tools/synonym_notes.txt:
    word1 / word2 [/ word3] = nota en español | note in English
Usage (from the site root): python3 chino-app/tools/build_synonyms.py [app ...]
"""
import json, re, sys, os, unicodedata
from collections import defaultdict

APPS = {
    'chino-app': (['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6', 'hsk7'], 3),
    'nihongo-app': (['n5', 'n4', 'n3', 'n2', 'n1'], 2),
    'arabic-app': (['a1', 'a2', 'b1', 'b2', 'c1', 'c2'], 2),
}
STOP_ES = set('ser estar hacer tener haber dar ir poner decir algo cosa persona gente muy más menos y o de del la el los las un una uno lo se'.split())
STOP_EN = set('be do make have get give go put say thing something person people very more less and or of the a an one it'.split())


def strip_acc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def terms(gloss, lang):
    if not gloss:
        return set()
    g = re.sub(r'\([^)]*\)|（[^）]*）|\[[^\]]*\]', ' ', gloss.lower())
    out = set()
    for part in re.split(r'[;,/、]', g):
        p = part.strip(' .…~-!?¡¿"\'')
        if lang == 'en':
            p = re.sub(r'^(to|a|an|the) ', '', p)
        else:
            p = re.sub(r'^(el|la|los|las|un|una|lo) ', '', p)
            p = strip_acc(p)
        p = re.sub(r'\s+', ' ', p).strip()
        if len(p) < 3 or p in (STOP_EN if lang == 'en' else STOP_ES):
            continue
        out.add(p)
    return out


def load_notes(app):
    notes = {}
    f = f'{app}/tools/synonym_notes.txt'
    if not os.path.exists(f):
        return notes
    for line in open(f, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        ws, txt = line.split('=', 1)
        ws = [w.strip() for w in ws.split('/') if w.strip()]
        es, _, en = txt.partition('|')
        for w in ws:
            notes[w] = {'ws': ws, 'es': es.strip(), 'en': en.strip() or es.strip()}
    return notes


def build(app):
    levels, start = APPS[app]
    vocab = []
    for i, lv in enumerate(levels):
        for v in json.load(open(f'{app}/data/{lv}/vocab.json', encoding='utf-8')):
            m = v.get('m') or {}
            vocab.append({'w': v['w'], 'li': i, 'q': v.get('q') or 99999,
                          'es': terms(m.get('es'), 'es'), 'en': terms(m.get('en'), 'en')})
    seen = {}
    for v in vocab:
        seen.setdefault(v['w'], v)
    vocab = list(seen.values())
    idx = {'es': defaultdict(list), 'en': defaultdict(list)}
    for v in vocab:
        for L in ('es', 'en'):
            for t in v[L]:
                idx[L][t].append(v)
    generic = {L: {t for t, vs in idx[L].items() if len(vs) > 14} for L in idx}
    notes = load_notes(app)
    stats = {}
    for li in range(len(levels)):  # below `start` only curated groups (with notes) are kept
        out = {}
        for v in vocab:
            if v['li'] != li:
                continue
            score = defaultdict(lambda: [0, 0])
            for k, L in enumerate(('es', 'en')):
                for t in v[L] - generic[L]:
                    for u in idx[L][t]:
                        if u['w'] != v['w'] and u['li'] <= li + 1:
                            score[u['w']][k] += 1
            cands = [(s, seen[w]) for w, s in score.items() if s[0] and s[1]]
            cands.sort(key=lambda x: (-(x[0][0] + x[0][1]), x[1]['q']))
            syn = [u['w'] for _, u in cands[:3]]
            n = notes.get(v['w'])
            if li < start:
                if not n:
                    continue
                syn = []
            if n:  # curated group first, then the automatic ones
                syn = [w for w in n['ws'] if w != v['w'] and w in seen] + [w for w in syn if w not in n['ws']]
                syn = syn[:4]
            if syn:
                out[v['w']] = {'s': syn}
                if n:
                    out[v['w']]['n'] = {'es': n['es'], 'en': n['en']}
        json.dump(out, open(f'{app}/data/{levels[li]}/synonyms.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        stats[levels[li]] = (len(out), sum(1 for x in out.values() if 'n' in x))
    print(app, stats)


if __name__ == '__main__':
    for a in sys.argv[1:] or APPS:
        build(a)
