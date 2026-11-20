"""Builds the course data of the German app from the hand-written sources. Every translation exists in
Spanish and English (the learner chooses in Settings).

  tools/vocab_src/<level>.txt  — the word list of the level:  headword | es | en
        nouns with article and plural:  der Tisch, -e   die Stadt, ¨-e   das Zimmer, -   das Museum, Museen   die Leute (pl.)
        plural codes: -e -en -n -s -er -nen -se (added), ¨-e ¨-er (umlaut + ending), ¨ (umlaut only), - (no change), or the full plural
        verbs: fahren | ir (en vehículo), conducir | to go (by vehicle), to drive   (principal parts of strong verbs are added
        from js/conj.js);  reflexive verbs with sich: sich freuen
  tools/units_src/<level>.txt  — the lessons (EOI syllabus):
        === <n>
        title: German title ¦ Spanish ¦ English
        desc: Spanish ¦ English
        gram: grammar points in Spanish ¦ … (one cell per point)
        gram_en: the same in English
        ref: reference id
        words: comma-separated headwords (as in the vocabulary, article included)
        intro:      (HTML explanation in Spanish)
        intro_en:   (the same in English)
        ex:
          fill ¦ sentence with ___ ¦ answer ¦ wrong / wrong / wrong ¦ es ¦ en [¦ hint es ¦ hint en]
          choose ¦ prompt es ¦ prompt en ¦ right answer ¦ wrong / wrong / wrong [¦ hint es ¦ hint en]
          order ¦ German sentence ¦ es ¦ en [¦ hint es ¦ hint en]
          translate ¦ es ¦ en ¦ German answer ¦ other accepted answers separated by " / " [¦ hint es ¦ hint en]
          match ¦ word=es=en; word=es=en; …
          listen ¦ German sentence ¦ wrong / wrong / wrong
Writes data/<level>/vocab.json, units.json and grammar.json.
Usage: python3 tools/build_course.py [level…]
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
LANGS = ['es', 'en']
SEP = '¦'
ART = re.compile(r'^(der |die |das |sich )')
UML = {'a': 'ä', 'o': 'ö', 'u': 'ü', 'A': 'Ä', 'O': 'Ö', 'U': 'Ü'}


def bare(w):
    """'der Tisch' → 'tisch', 'sich freuen' → 'freuen'."""
    return ART.sub('', w.strip()).lower()


def umlaut(s):
    """Umlaut on the last full vowel of the stem: Stadt → Städt, Haus → Häus, Buch → Büch."""
    m = list(re.finditer(r'au|[aouAOU](?![eäöü])', s))
    for x in reversed(m):
        if x.group(0) == 'au':
            return s[:x.start()] + 'äu' + s[x.end():]
        return s[:x.start()] + UML[x.group(0)] + s[x.end():]
    return s


def plural(noun, code):
    code = code.strip()
    if code in ('-', '–'):
        return noun
    if code.startswith('¨'):
        return umlaut(noun) + code[1:].lstrip('-')
    if code.startswith('-'):
        return noun + code[1:]
    return code


# ── principal parts of strong verbs (js/conj.js) ─────────────────────────
_PP = {}


def principal_parts(verbs):
    js = f"""import('{(ROOT / 'js' / 'conj.js').as_uri()}').then(m => {{
      const out = {{}};
      for (const w of JSON.parse(process.argv[1])) {{ try {{ out[w] = m.principalParts(w); }} catch (e) {{ out[w] = ''; }} }}
      console.log(JSON.stringify(out));
    }})"""
    r = subprocess.run(['node', '--input-type=module', '-e', js, json.dumps(sorted(verbs))], capture_output=True, text=True, timeout=300)
    if r.returncode:
        raise SystemExit(r.stderr)
    _PP.update(json.loads(r.stdout))


def is_verb(word):
    return bool(re.match(r'^(sich )?[a-zäöüß]+(en|ern|eln|n)$', word)) and not word.endswith(('chen', 'lein')) and ' ' not in ART.sub('', word)


def read_vocab_src(lv):
    out = []
    for line in open(ROOT / 'tools' / 'vocab_src' / f'{lv}.txt', encoding='utf8'):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'):
            continue
        parts = [x.strip() for x in line.split('|')]
        if len(parts) < 3 or not parts[1] or not parts[2]:
            raise SystemExit(f'{lv}: bad vocab line (headword | es | en): {line}')
        out.append(parts[:4])
    return out


def load_vocab(lv, pos_hint=None):
    out = []
    for head, es, en, *rest in read_vocab_src(lv):
        word, g, pl = head, '', ''
        m = re.match(r'^(der|die|das) (.+?)(?:, (.+))?$', head)
        if m:
            art, noun, code = m.groups()
            word = f'{art} {noun.replace(" (pl.)", "").replace(" (sg.)", "")}'
            g = {'der': 'm', 'die': 'f', 'das': 'n'}[art]
            if '(pl.)' in noun:
                g = 'pl'; word = 'die ' + noun.replace(' (pl.)', '')
            elif code:
                pl = plural(noun, code)
        e = {'word': word, 'm': {'es': es, 'en': en}, 'pos': '', 'w': word, 'p': ''}
        if g:
            e['g'] = g; e['pos'] = 'noun'
            if pl:
                e['pl'] = pl
                e['m'] = {'es': f'{es} · pl. die {pl}', 'en': f'{en} · pl. die {pl}'}
            elif g == 'pl':
                e['m'] = {'es': f'{es} · (solo plural)', 'en': f'{en} · (plural only)'}
        elif is_verb(word):
            e['pos'] = 'verb'
        out.append(e)
    return out


def add_parts(vocabs):
    verbs = {v['word'] for vs in vocabs for v in vs if v['pos'] == 'verb'}
    principal_parts(verbs)
    for vs in vocabs:
        for v in vs:
            pp = _PP.get(v['word'])
            if v['pos'] == 'verb' and pp:
                v['pp'] = pp
                v['m'] = {l: f'{v["m"][l]} · {pp}' for l in LANGS}


def parse_units(lv):
    p = ROOT / 'tools' / 'units_src' / f'{lv}.txt'
    if not p.exists():
        return []
    units, cur, block = [], None, None
    for raw in open(p, encoding='utf8'):
        line = raw.rstrip('\n')
        if line.startswith('#'):
            continue
        m = re.match(r'^=== (\d+)\s*$', line)
        if m:
            cur = {'id': int(m.group(1)), 'intro': [], 'intro_en': [], 'ex': [], 'words': []}
            units.append(cur); block = None
            continue
        if cur is None:
            continue
        m = re.match(r'^(title|desc|gram|gram_en|words|ref):\s*(.*)$', line)
        if m and block is None:
            k, v = m.groups()
            if k == 'words':
                cur['words'] += [w.strip() for w in v.split(',') if w.strip()]
            else:
                cur[k] = v
            continue
        if line.strip() in ('intro:', 'intro_en:', 'ex:'):
            block = line.strip()[:-1]; continue
        if block in ('intro', 'intro_en'):
            cur[block].append(line)
        elif block == 'ex' and line.strip():
            cur['ex'].append(line)
    return units


def cells(line):
    return [x.strip() for x in line.split(SEP)]


TPL = {'translate': {'es': 'Traduce: «{s}»', 'en': 'Translate: “{s}”'}, 'order': {'es': 'Ordena: «{s}»', 'en': 'Put in order: “{s}”'}}


def pair(c, i):
    if len(c) <= i + 1 or not c[i]:
        return None
    return {'es': c[i], 'en': c[i + 1]}


def build_ex(line, lv, uid):
    c = cells(line)
    t = c[0]
    try:
        if t == 'fill':
            sent, ans, dis = c[1], c[2], [x.strip() for x in c[3].split('/') if x.strip()]
            assert '___' in sent, 'no ___'
            assert c[4] and c[5], 'translations'
            e = {'type': 'fill', 'sentence': sent, 'blank': ans, 'options': [ans] + dis, 'tr': pair(c, 4)}
            if pair(c, 6): e['hint'] = pair(c, 6)
            return e
        if t == 'choose':
            e = {'type': 'choose', 'prompt': pair(c, 1), 'correct': c[3], 'options': [c[3]] + [x.strip() for x in c[4].split(' / ') if x.strip()]}
            assert e['prompt'] and len(e['options']) > 1
            if pair(c, 5): e['hint'] = pair(c, 5)
            return e
        if t == 'order':
            sent = c[1]
            e = {'type': 'order', 'prompt': {l: TPL['order'][l].format(s=c[2 + i]) for i, l in enumerate(LANGS)}, 'words': sent.split(), 'answer': sent, 'tr': pair(c, 2)}
            assert c[3]
            if pair(c, 4): e['hint'] = pair(c, 4)
            return e
        if t == 'translate':
            ans = c[3]
            acc = [ans] + [x.strip() for x in (c[4] if len(c) > 4 else '').split(' / ') if x.strip()]
            e = {'type': 'translate', 'prompt': {l: TPL['translate'][l].format(s=c[1 + i]) for i, l in enumerate(LANGS)}, 'answer': ans, 'accept': acc, 'tr': pair(c, 1)}
            assert c[2]
            if pair(c, 5): e['hint'] = pair(c, 5)
            return e
        if t == 'match':
            pairs = []
            for pr in c[1].split(';'):
                xs = [x.strip() for x in pr.split('=')]
                assert len(xs) == 3, pr
                pairs.append([xs[0], {'es': xs[1], 'en': xs[2]}])
            return {'type': 'match', 'pairs': pairs}
        if t == 'listen':
            return {'type': 'listen', 'text': c[1], 'correct': c[1], 'options': [c[1]] + [x.strip() for x in c[2].split(' / ')]}
    except Exception as err:
        raise SystemExit(f'{lv} unit {uid}: bad exercise ({err!r}): {line}')
    raise SystemExit(f'{lv} unit {uid}: unknown exercise type: {line}')


def clean_html(h):
    return re.sub(r'>\s+<', '><', re.sub(r'\s*\n\s*', ' ', h)).strip()


def build(lv, vocab, lowerlv):
    vocab = [v for v in vocab if v['word'] not in lowerlv]       # a word belongs to its lowest level
    dup = set(); vv = []
    for v in vocab:                                               # and appears once
        if v['word'] not in dup:
            dup.add(v['word']); vv.append(v)
    vocab = vv
    lower = {}
    for v in vocab:
        lower.setdefault(v['word'], v); lower.setdefault(v['word'].lower(), v); lower.setdefault(bare(v['word']), v)
    units, grammar = [], []
    seen = set(); missing = []
    for u in parse_units(lv):
        title = cells(u['title'])
        desc = cells(u.get('desc', ''))
        assert len(title) == 3 and len(desc) == 2, (lv, u['id'], title, desc)
        if not u['intro_en']:
            raise SystemExit(f'{lv} unit {u["id"]}: no intro_en')
        intro = {'es': '\n'.join(u['intro']), 'en': '\n'.join(u['intro_en'])}
        new = []
        for w in u['words']:
            v = lower.get(w) or lower.get(w.lower()) or lower.get(bare(w))
            if not v:
                if w in lowerlv or bare(w) in {bare(x) for x in lowerlv}:
                    continue
                missing.append(f'{u["id"]}:{w}')
                continue
            if v['word'] in seen:
                continue
            seen.add(v['word']); new.append(v['word'])
            v['unit'] = u['id']; v['u'] = f'{lv}-{u["id"]}'
        g_es = [g.strip() for g in u.get('gram', '').split(SEP) if g.strip()]
        g_en = [g.strip() for g in u.get('gram_en', '').split(SEP) if g.strip()]
        assert len(g_es) == len(g_en), (lv, u['id'], 'gram / gram_en')
        exs = [build_ex(x, lv, u['id']) for x in u['ex']]
        unit = {'id': u['id'], 'title': {'de': title[0], 'es': title[1], 'en': title[2]}, 'desc': {'es': desc[0], 'en': desc[1]},
                'grammarIntro': {l: clean_html(intro[l]) for l in LANGS}, 'grammar': g_es, 'gnames': {'es': g_es, 'en': g_en},
                'newVocab': new, 'vocab': new, 'exercises': exs}
        units.append(unit)
        examples = []
        for e in exs:
            if e['type'] == 'fill':
                examples.append({'de': e['sentence'].replace('___', e['blank']), **e['tr']})
            if e['type'] in ('order', 'translate'):
                examples.append({'de': e['answer'], **e['tr']})
        grammar.append({'id': u.get('ref') or f'{lv}-u{u["id"]}', 'unit': u['id'],
                        'title': {'de': title[0], 'es': ' · '.join(g_es) or title[1], 'en': ' · '.join(g_en) or title[2]},
                        'summary': {'es': ' · '.join(g_es), 'en': ' · '.join(g_en)},
                        'explanation': {l: clean_html(intro[l]) for l in LANGS}, 'examples': examples[:6]})
    if missing:
        raise SystemExit(f'{lv}: words not in the list: ' + ', '.join(missing))
    pos_in_units = {w: i for i, w in enumerate(w for u in units for w in u['newVocab'])}
    vocab.sort(key=lambda v: (0, pos_in_units[v['word']]) if v['word'] in pos_in_units else (1, bare(v['word'])))
    for v in vocab:
        v.setdefault('unit', None); v.setdefault('u', '')
    d = ROOT / 'data' / lv
    d.mkdir(parents=True, exist_ok=True)
    (d / 'vocab.json').write_text(json.dumps(vocab, ensure_ascii=False, indent=0), encoding='utf8')
    if units:
        (d / 'units.json').write_text(json.dumps(units, ensure_ascii=False), encoding='utf8')
        (d / 'grammar.json').write_text(json.dumps(grammar, ensure_ascii=False), encoding='utf8')
    print(f'{lv}: {len(vocab)} words, {len(units)} units, {sum(len(u["newVocab"]) for u in units)} lesson words, {sum(len(u["exercises"]) for u in units)} exercises')


def rank():
    q = 1
    for lv in LEVELS:
        p = ROOT / 'data' / lv / 'vocab.json'
        if not p.exists():
            continue
        vs = json.loads(p.read_text(encoding='utf8'))
        for v in vs:
            v['q'] = q; q += 1
        p.write_text(json.dumps(vs, ensure_ascii=False, indent=0), encoding='utf8')


if __name__ == '__main__':
    have = [l for l in LEVELS if (ROOT / 'tools' / 'vocab_src' / f'{l}.txt').exists()]
    vocabs = {l: load_vocab(l) for l in have}
    add_parts(vocabs.values())
    lvs = sys.argv[1:] or have
    for lv in lvs:
        lowerlv = {}
        for l2 in have[:have.index(lv)]:
            for v in vocabs[l2]:
                lowerlv.setdefault(v['word'], l2)
        build(lv, vocabs[lv], lowerlv)
    rank()
