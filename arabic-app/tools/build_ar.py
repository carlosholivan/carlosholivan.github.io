#!/usr/bin/env python3
"""Builds the Arabic app data from the hand-written lesson files tools/texts/<level>.txt.

Lesson file syntax
  ## n | Title (es) | Title (en) | description | grammar ids (comma-separated, keys of tools/grammar_ar.json)
  @ ب ت ث                      letters introduced in the lesson (alphabet unit)
  + word | es | en | pos | extra   vocabulary of the lesson (vocalised; extra = plural or present tense for verbs)
  ### Arabic title | Spanish title
  ? question | option / *right option / option
  Arabic line = Spanish translation       (speaker lines: «name: text = Name: text»)

Outputs per level data/<lv>/{vocab,units,texts,extra,drills,hanzi}.json
"""
import json, random, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
GRAMMAR = json.load(open(ROOT / 'tools' / 'grammar_ar.json', encoding='utf8'))
LETTERS = json.load(open(ROOT / 'tools' / 'letters.json', encoding='utf8'))

HARAKAT = re.compile('[ً-ْٰـ]')
def strip(s): return HARAKAT.sub('', s or '')
def norm(s): return re.sub('[أإآٱ]', 'ا', strip(s)).replace('ى', 'ي').replace('ؤ', 'و').replace('ئ', 'ي')

PREF = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك', 'س']
SUFF = ['كما', 'هما', 'كم', 'كن', 'هم', 'هن', 'نا', 'ها', 'ون', 'ين', 'ان', 'ات', 'وا', 'تم', 'ة', 'ه', 'ك', 'ي', 'ت']

def variants(tok):
    """Normalised forms of a text token with clitics stripped, most literal first."""
    t = norm(tok)
    if t.endswith('ا') and 'ً' in tok: t0 = [t, t[:-1]]      # accusative tanwin alif
    else: t0 = [t]
    out = []
    def add(x):
        if len(x) >= 2 and x not in out: out.append(x)
    for w in t0:
        for p in [''] + PREF:
            if p and not w.startswith(p): continue
            add(w[len(p):])
        for p in [''] + PREF:
            if p and not w.startswith(p): continue
            b = w[len(p):]
            for s_ in SUFF:
                if b.endswith(s_) and len(b) - len(s_) >= 2:
                    st = b[:-len(s_)]
                    if st.endswith('ت'): add(st[:-1] + 'ة')
                    add(st); add(st + 'ة')
                    if st.endswith('ا') and s_ == 'ي': add(st[:-1] + 'ة'); add(st + 'ء')
    return out

def verb_forms(past, pres):
    """Normalised conjugated forms of a (mostly regular) verb, for matching only."""
    out = set()
    pa, pr = norm(past), norm(pres)
    if pa:
        out.add(pa)
        for s in ['ت', 'تم', 'تن', 'نا', 'وا', 'تا', 'ا', 'ن']: out.add(pa + s)
    if pr and pr[0] in 'يتان':
        st = pr[1:]
        for p in 'ايتن':
            out.add(p + st)
            for s in ['ون', 'ين', 'ان', 'وا', 'ي', 'ن']: out.add(p + st + s)
        out.add(st)          # imperative stem (اكتب → كتب approx.)
    return out

SPK = re.compile(r'^([^:：=]{1,18})[:：]\s*')

def parse(path):
    units, cur, txt = [], None, None
    for raw in open(path, encoding='utf8'):
        line = raw.rstrip('\n')
        if line.startswith('#') and not line.startswith('##'): continue
        if line.startswith('## '):
            p = [x.strip() for x in line[3:].split('|')]
            cur = {'id': int(p[0]), 'es': p[1], 'en': p[2], 'desc': p[3],
                   'grammar': [g.strip() for g in p[4].split(',')] if len(p) > 4 and p[4] else [],
                   'letters': [], 'vocab': [], 'texts': []}
            units.append(cur); txt = None
        elif line.startswith('~ '):
            a, b = [x.strip() for x in line[2:].split('|')]
            cur.setdefault('alias', []).append((a, b))
        elif line.startswith('@ '):
            cur['letters'] = line[2:].split()
        elif line.startswith('+ '):
            p = [x.strip() for x in line[2:].split('|')] + [''] * 5
            cur['vocab'].append({'w': p[0], 'es': p[1], 'en': p[2], 'pos': p[3], 'x': p[4]})
        elif line.startswith('### '):
            p = [x.strip() for x in line[4:].split('|')]
            txt = {'ar': p[0], 'es': p[1], 'paras': [[]], 'qs': []}
            cur['texts'].append(txt)
        elif line.startswith('? '):
            q, opts = [x.strip() for x in line[2:].split('|')]
            os_ = [o.strip() for o in opts.split('/')]
            ans = next(i for i, o in enumerate(os_) if o.startswith('*'))
            txt['qs'].append({'q': {'es': q}, 'options': [o.lstrip('*') for o in os_], 'answer': ans})
        elif not line.strip():
            if txt and txt['paras'][-1]: txt['paras'].append([])
        elif ' = ' in line and txt is not None:
            ar, es = line.split(' = ', 1)
            txt['paras'][-1].append((ar.strip(), es.strip()))
    for u in units:
        for t in u['texts']:
            t['paras'] = [p for p in t['paras'] if p]
    return units

TOKRX = re.compile('[\u0621-\u065f\u0670\u0671\u0640]+|[\u060c\u061b\u061f]|[^\u0621-\u065f\u0670\u0671\u0640\u060c\u061b\u061f]+')

def tokenize(line, index):
    toks = []
    m = SPK.match(line)
    if m and re.search('[؀-ۿ]', m.group(1)):
        toks.append([m.group(1), [[m.group(1), None]], None])
        toks.append(['：', [['：', None]], None])
        line = line[m.end():]
    for t in TOKRX.findall(line):
        key = None
        if re.search('[ء-ي]', t):
            ex = re.sub('[َُِ]$', '', t)
            for v in ['=' + ex, '=' + re.sub('^و', '', ex)] + variants(t):
                if v in index: key = index[v]; break
        toks.append([t, [[t, None]], key])
    return toks

def grammar_html(ids):
    html = []
    for g in ids:
        e = GRAMMAR.get(g)
        if not e: continue
        html.append(f"<h3>{e['t']} — {e['es']}</h3>"
                    + (f"<p><b>Forma:</b> <span class=\"zh\">{e['form']}</span></p>" if e.get('form') else '')
                    + (f"<p>{e['nuance']}</p>" if e.get('nuance') else '')
                    + (f"<div class=\"tip\">💡 <span class=\"ar\">{e['tip']}</span>{(' — ' + e['tip_es']) if e.get('tip_es') else ''}</div>" if e.get('tip') else ''))
    return ''.join(html)

LBY = {L['c']: L for L in LETTERS}
POS = ['aislada', 'inicial', 'media', 'final']
def letters_html(ls):
    if not ls: return ''
    out = ['<h3>Letras nuevas</h3><p class="small muted">Toca una letra para ver su ficha y palabras que la usan.</p>']
    for c in ls:
        L = LBY.get(c)
        if not L: continue
        forms = ''.join(f'<div><b>{f or "—"}</b><span>{POS[i]}</span></div>' for i, f in enumerate(L['forms']))
        out.append(f'<div class="card" style="padding:12px;margin:10px 0;cursor:pointer" onclick="window.__charSheet(\'{c}\')">'
                   f'<div class="flex items-center gap-8"><span class="ar" style="font-size:44px">{c}</span>'
                   f'<div><b>{L["name"]}</b> · <i>{L["tr"]}</i><div class="small muted">{L["sound"]}</div></div></div>'
                   f'<div class="forms mt-8">{forms}</div></div>')
    return ''.join(out)

def sentences(texts):
    out = []
    for t in texts:
        for para in t['paras']:
            for ar, es in para:
                ar2, es2 = SPK.sub('', ar), re.sub(r'^[^:]{1,20}:\s*', '', es)
                if 2 <= len(ar2.split()) <= 9: out.append((ar2, es2))
    return out

def make_exercises(rng, sents, unit_words, all_words, index, n_fill=4, n_order=3, n_choose=2):
    ex, used = [], set()
    sents = list(sents); rng.shuffle(sents)
    uw = set(unit_words)
    for ar, es in sents:
        if sum(e['type'] == 'fill' for e in ex) >= n_fill: break
        words = ar.split()
        hit = next((i for i, w in enumerate(words) if any(index.get(v) in uw for v in variants(w))), None)
        if hit is None or ar in used: continue
        target = re.sub(r'[.,!?؟،]+$', '', words[hit])
        others = [w for w in all_words if norm(w) != norm(target)]
        opts = [target] + rng.sample(others, min(3, len(others)))
        rng.shuffle(opts)
        ex.append({'type': 'fill', 'sentence': ar.replace(target, '___', 1), 'blank': target, 'options': opts, 'tr': {'es': es}})
        used.add(ar)
    for ar, es in sents:
        if sum(e['type'] == 'order' for e in ex) >= n_order: break
        if ar in used: continue
        ws = ar.split()
        if 3 <= len(ws) <= 7:
            ex.append({'type': 'order', 'prompt': {'es': es}, 'words': ws, 'answer': ar, 'rtl': True})
            used.add(ar)
    rest = [s for s in sents if s[0] not in used]
    for ar, es in rest[:n_choose]:
        others = [s[0] for s in sents if s[0] != ar]
        if len(others) < 2: break
        opts = [ar] + rng.sample(others, 2); rng.shuffle(opts)
        ex.append({'type': 'choose', 'prompt': {'es': f'«{es}»'}, 'options': opts, 'correct': ar})
    return ex

def main():
    prev_index = {}
    order_q = 0
    for lv in LEVELS:
        (DATA / lv).mkdir(parents=True, exist_ok=True)
        path = ROOT / 'tools' / 'texts' / f'{lv}.txt'
        units = parse(path) if path.exists() else []
        rng = random.Random(lv)
        vocab, index = [], dict(prev_index)
        seen = set(prev_index.get('__seen__', []))
        for u in units:
            keep = []
            u['listed'] = [v['w'] for v in u['vocab']]
            for v in u['vocab']:
                k = v['w'].rstrip('؟').strip()
                if k in seen: continue
                seen.add(k); keep.append(v)
            u['vocab'] = keep
            for v in u['vocab']:
                order_q += 1
                e = {'word': v['w'], 'w': v['w'], 'r': '', 'p': v['w'], 'm': {'es': v['es'], 'en': v['en']},
                     'pos': v['pos'], 'q': order_q, 'unit': u['id'], 'u': f"{lv}-{u['id']}"}
                if v['pos'] == 'v' and v['x']: e['pres'] = v['x']
                elif v['x']: e['pl'] = v['x']
                vocab.append(e)
                index.setdefault(norm(v['w']), v['w'])
                index.setdefault('=' + re.sub('[َُِ]$', '', v['w']), v['w'])
                if e.get('pl'): index.setdefault(norm(e['pl']), v['w'])
                if v['pos'] == 'v':
                    past, pres = v['w'], v['x']
                    if norm(past)[:1] in 'يت' and len(norm(past)) > 3 and v['x'] and norm(v['x'])[:1] not in 'يت': past, pres = v['x'], v['w']
                    for f in verb_forms(past, pres): index.setdefault(f, v['w'])
        for u in units:
            for a, b in u.get('alias', []):
                for f in a.split(): index.setdefault('=' + re.sub('[َُِ]$', '', f), b); index.setdefault(norm(f), b)
        for v in vocab:
            parts = v['w'].replace('؟', '').split()
            if len(parts) > 1:
                for part in parts:
                    if len(norm(part)) > 2: index.setdefault(norm(part), v['w'])
        words = [v['w'] for v in vocab]
        units_out, texts_out, extra = [], [], {}
        order = 0
        for u in units:
            for t in u['texts']:
                order += 1
                texts_out.append({
                    'id': f'{lv}-t{order}', 'level': lv, 'order': order, 'unit': u['id'],
                    'title': {'ar': t['ar'], 'ja': t['ar'], 'es': t['es'], 'en': t['es']}, 'summary': {'es': ''},
                    'paragraphs': ['\n'.join(a for a, _ in para) for para in t['paras']],
                    'translation': {'es': ['\n'.join(e for _, e in para) for para in t['paras']]},
                    'questions': t['qs'],
                    'gaps': {'items': [], 'distractors': []},
                    'tok': [[tokenize(a, index) for a, _ in para] for para in t['paras']],
                })
            new = u['listed']
            sents = sentences(u['texts'])
            units_out.append({
                'id': u['id'], 'title': {'es': u['es'], 'en': u['en'], 'ja': u['texts'][0]['ar'] if u['texts'] else ''},
                'desc': {'es': u['desc'], 'en': u['desc']}, 'grammar': u['grammar'], 'letters': u['letters'], 'newVocab': new,
                **({'grammarIntro': {'es': letters_html(u['letters']) + grammar_html(u['grammar'])}} if u['grammar'] or u['letters'] else {}),
                'exercises': make_exercises(rng, sents, new, words, index),
            })
            extra[str(u['id'])] = {'sets': [make_exercises(random.Random(f'{lv}-{u["id"]}-{n}'), sents, new, words, index, 3, 3, 2) for n in range(6)],
                                   'words': [new[n * len(new) // 6:(n + 1) * len(new) // 6 + 4] or new[:6] for n in range(6)]}
        hanzi = [{'c': L['c'], 'm': {'es': f"{L['name']} — {L['sound']}", 'en': f"{L['name_en']} — {L['sound_en']}"}, 'p': L['tr'],
                  'forms': L['forms'], 'ex': L.get('ex', []), 'q': i + 1} for i, L in enumerate(LETTERS)] if lv == 'a1' else []
        for name, obj in [('vocab', vocab), ('units', units_out), ('texts', texts_out), ('extra', extra), ('drills', []), ('hanzi', hanzi)]:
            json.dump(obj, open(DATA / lv / f'{name}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        index['__seen__'] = sorted(seen)
        prev_index = index
        print(f'{lv}: {len(units_out)} units, {len(vocab)} words, {len(texts_out)} texts')

if __name__ == '__main__':
    main()
