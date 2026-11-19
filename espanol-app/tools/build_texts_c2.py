"""Builds data/c2/texts.json from the hand-written texts in tools/texts_c2/batch*.json.

Authoring format per text: {topic, title{es,en,ja,zh}, summary{en,ja,zh}, paras[[es,en,ja,zh]…],
  notes[[paragraph, fragment, kind, en, ja, zh]…], qs[[q_es,q_en,q_ja,q_zh,[4 options],answer,exp_en,exp_ja,exp_zh]…]}
Computed: glossary (every word: meanings from the course glossaries / vocabulary), difficult (C2 words in the text),
verbs (conjugated forms found with js/conj.js for every infinitive of the course: tense, person, meaning),
gaps (C2 words to fill + distractors), unit (first C2 lesson of the topic).
Usage: python3 tools/build_texts_c2.py
"""
import json, re, glob, random, subprocess, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'data'
LV = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
WORD = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")
low = lambda s: s.lower()

# ── meanings ───────────────────────────────────────────────────────────
gloss = {}
for lv in LV:
    for t in json.loads((D / lv / 'texts.json').read_text(encoding='utf8')):
        for k, v in (t.get('glossary') or {}).items():
            gloss.setdefault(low(k), {x: v[x] for x in ('en', 'ja', 'zh') if x in v})
vocab = {}
for lv in LV:
    for v in json.loads((D / lv / 'vocab.json').read_text(encoding='utf8')):
        vocab.setdefault(low(v['word']), {**{x: v['m'][x] for x in ('en', 'ja', 'zh') if x in v.get('m', {})}, 'lv': lv})
c2words = [v['word'] for v in json.loads((D / 'c2' / 'vocab.json').read_text(encoding='utf8'))]

# ── conjugated forms of every infinitive ─────────────────────────────────
infs = sorted({w for w in list(vocab) + list(gloss) if re.fullmatch(r'[a-záéíóúñü]+(ar|er|ir|ír)(se)?', w)})
js = f"""import('{(ROOT / 'js' / 'conj.js').as_uri()}').then(m => {{
  const infs = {json.dumps(infs, ensure_ascii=False)};
  const out = [];
  const T = {{pres:'pres', pret:'pret-indef', imperf:'imperf', fut:'fut', cond:'cond', subj:'pres-subj', impsubj:'imperf-subj', imp:'imper'}};
  const P = ['1s','2s','3s','1p','2p','3p'];
  for (const raw of infs) {{
    const w = raw.replace(/se$/, '');
    const v = m.VERBS.find(x => x.w === w) || {{ w }};
    try {{
      for (const t in T) for (let p = 0; p < 6; p++) {{ const f = m.conjugate(v, t, p); if (f && f !== '—') out.push([f, w, T[t], P[p]]); }}
      const pa = m.participle(v);
      for (let p = 0; p < 6; p++) {{ out.push([m.conjugate({{w:'haber'}}, 'pres', p) + ' ' + pa, w, 'pret-perf', P[p]]); out.push([m.conjugate(m.VERBS.find(x => x.w === 'haber') || {{w:'haber'}}, 'imperf', p) + ' ' + pa, w, 'pluscuam', P[p]]); }}
      out.push([m.gerund(v), w, 'ger', '']); out.push([pa, w, 'part', '']); out.push([w, w, 'inf', '']);
    }} catch (e) {{}}
  }}
  console.log(JSON.stringify(out));
}})"""
r = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, timeout=300)
forms = {}
for f, w, t, p in json.loads(r.stdout):
    k = low(f)
    if k not in forms or (p == '3s' and forms[k][0] == w and forms[k][1] == t):
        forms[k] = (w, t, p)  # identical 1s/3s forms: the 3rd person is the usual one in a narrative
STOP = {'una', 'uno', 'unos', 'unas', 'como', 'para', 'sobre', 'entre', 'bajo', 'nada', 'casa', 'cura', 'baja', 'vino', 'río', 'peso', 'paso', 'medio', 'fin', 'don',
        've', 'ser', 'era', 'sino', 'sal', 'ama', 'cara', 'alto', 'libre', 'canto', 'poco', 'fue'} - {'era', 'fue', 'ser'}

EXTRA = json.loads((ROOT / 'tools' / 'texts_c2' / 'extra_gloss.json').read_text(encoding='utf8')) if (ROOT / 'tools' / 'texts_c2' / 'extra_gloss.json').exists() else {}
deacc = lambda s: ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').replace('n\u0303', 'ñ')
def mean_of(k):
    if k in EXTRA: return EXTRA[k]
    if k in gloss: return gloss[k]
    if k in vocab: return {x: vocab[k][x] for x in ('en', 'ja', 'zh') if x in vocab[k]}
    return None
def lookup(k):
    m = mean_of(k)
    if m: return m
    cands = [k[:-1], k[:-2], re.sub('a$', 'o', k), re.sub('as$', 'os', k)[:-1], re.sub('es$', '', k)]
    for c in cands:
        if c and mean_of(c): return mean_of(c)
    for kk in (k, deacc(re.sub('(me|te|se|lo|la|le|nos|os|los|las|les)+$', '', k))):
        if kk in forms:
            mm = mean_of(forms[kk][0])
            if mm: return mm
    return None

units = json.loads((D / 'c2' / 'units.json').read_text(encoding='utf8'))
topics = {t['id']: t for t in json.loads((D / 'topics.json').read_text(encoding='utf8'))}


def unit_of(topic):
    name = topics.get(topic, {}).get('en', '')
    return next((u['id'] for u in units if name and u['title'].get('en', '').startswith(name)), 1)


texts = []
for f in sorted(glob.glob(str(ROOT / 'tools' / 'texts_c2' / 'batch*.json'))):
    texts += json.loads(Path(f).read_text(encoding='utf8'))
out = []
for n, tx in enumerate(texts, 1):
    paras = [p[0] for p in tx['paras']]
    full = '\n'.join(paras)
    # glossary
    g = {}
    for w in WORD.findall(full):
        k = low(w)
        m = lookup(k)
        if m and k not in g:
            g[k] = m
    lf = low(full)
    difficult = [w for w in c2words if re.search(r'(?<![a-záéíóúñü])' + re.escape(low(w)) + r'(?![a-záéíóúñü])', lf)]
    for w in difficult:
        if low(w) not in g and low(w) in vocab:
            g[low(w)] = {x: vocab[low(w)][x] for x in ('en', 'ja', 'zh') if x in vocab[low(w)]}
    # verbs (two-word compound forms first)
    verbs = []
    for pi, p in enumerate(paras):
        toks = [(m.group(), m.start()) for m in WORD.finditer(p)]
        used = set()
        for i in range(len(toks)):
            if i in used:
                continue
            two = low(toks[i][0] + ' ' + toks[i + 1][0]) if i + 1 < len(toks) else ''
            if two in forms and forms[two][1] in ('pret-perf', 'pluscuam'):
                w, t, per = forms[two]; f = p[toks[i][1]:toks[i + 1][1] + len(toks[i + 1][0])]; used |= {i, i + 1}
            elif low(toks[i][0]) in forms and low(toks[i][0]) not in STOP:
                w, t, per = forms[low(toks[i][0])]; f = toks[i][0]
                if t == 'inf' and low(f) != w:
                    continue
            else:
                continue
            m = gloss.get(w) or ({x: vocab[w][x] for x in ('en', 'ja', 'zh') if x in vocab[w]} if w in vocab else None)
            if not m or not re.match(r'^\(?to ', m.get('en', '')):
                continue  # not a verb (mujer, familiar…)
            tok = low(f)
            other = gloss.get(tok) or vocab.get(tok)
            if ' ' not in tok and tok != w and other and not re.match(r'^\(?to ', other.get('en', '')) and t in ('pres', 'pres-subj', 'imper', 'part'):
                continue  # also a noun/adjective/determiner (una, saludo, ayuda, desaire…)
            verbs.append({'p': pi, 'f': f, 'l': w, 't': t, 'per': per, 'm': m})
    notes = []
    for pi, f, k, en, ja, zh in tx['notes']:
        if f not in paras[pi]:
            pi = next((i for i, q in enumerate(paras) if f in q), None)
            assert pi is not None, (tx['title']['es'], f)
        notes.append({'p': pi, 'f': f, 'k': k, 'e': {'en': en, 'ja': ja, 'zh': zh}})
    qs = [{'q': {'es': q[0], 'en': q[1], 'ja': q[2], 'zh': q[3]}, 'options': q[4], 'answer': q[5],
           'explain': {'en': q[6], 'ja': q[7], 'zh': q[8]}} for q in tx['qs']]
    rnd = random.Random(n)
    items = [w for w in difficult if w in full][:8]
    if len(items) < 6:
        items += [nt['f'] for nt in notes if len(nt['f'].split()) <= 4 and nt['f'] not in items][:8 - len(items)]
    others = [w for w in c2words if w not in difficult and ' ' not in w]
    out.append({'id': f'c2-t{n}', 'level': 'c2', 'unit': unit_of(tx['topic']), 'order': n,
                'title': tx['title'], 'summary': tx['summary'], 'paragraphs': paras,
                'translation': {l: [p[i] for p in tx['paras']] for i, l in ((1, 'en'), (2, 'ja'), (3, 'zh'))},
                'glossary': g, 'difficult': difficult, 'questions': qs,
                'gaps': {'items': items, 'distractors': rnd.sample(others, 6)}, 'verbs': verbs, 'notes': notes})
(D / 'c2' / 'texts.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
miss = sorted({low(w) for t in out for w in WORD.findall(' '.join(t['paragraphs'])) if low(w) not in t['glossary']})
Path('/tmp/claude-0/-home-claude/e4042321-0658-5ad4-93a2-ce08540bd0e9/scratchpad/c2miss.txt').write_text('\n'.join(miss))
print(len(miss), 'words without meaning')
print(len(out), 'texts ·', sum(len(t['verbs']) for t in out), 'verbs ·', sum(len(t['difficult']) for t in out), 'difficult ·',
      sum(len(t['glossary']) for t in out), 'glossary entries')
