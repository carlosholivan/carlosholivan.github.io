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

PREF = ['وبال', 'فبال', 'وكال', 'وللل', 'ولل', 'فلل', 'وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'وس', 'فس', 'وب', 'فب', 'ول', 'فل', 'وك', 'و', 'ف', 'ب', 'ل', 'ك', 'س']
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

CONJ_LINK = {'presente': ('pres', 'كَتَبَ'), 'pasado': ('past', 'كَتَبَ'), 'pasado2': ('past', 'كَتَبَ'), 'imperativo': ('imp', 'كَتَبَ'),
             'futuro': ('pres', 'سَافَرَ'), 'lam': ('juss', 'كَتَبَ'), 'lan': ('subj', 'كَتَبَ'), 'an': ('subj', 'شَرِبَ'),
             'prohibicion': ('juss', 'ذَهَبَ'), 'huecos': ('past', 'قَالَ'), 'defectivos': ('pres', 'مَشَى'), 'kana': ('past', 'كَانَ'),
             'formas_verbales': ('past', 'دَرَّسَ'), 'formas_6_8': ('past', 'تَعَاوَنَ'), 'participios': ('past', 'كَتَبَ'),
             'masdar': ('past', 'سَافَرَ'), 'lam_amr': ('juss', 'كَتَبَ'), 'kana_madi': ('past', 'كَانَ')}

GRAMMAR_EN = json.load(open(ROOT / 'tools' / 'grammar_ar_en.json', encoding='utf8')) if (ROOT / 'tools' / 'grammar_ar_en.json').exists() else {}
def grammar_html(ids, lang='es'):
    html = []
    for g in ids:
        e = GRAMMAR.get(g)
        if not e: continue
        if lang == 'en' and g in GRAMMAR_EN: e = {**e, **GRAMMAR_EN[g]}
        html.append(f"<h3>{e['t']} — {e['es']}</h3>"
                    + (f"<p><b>{'Form' if lang == 'en' else 'Forma'}:</b> <span class=\"zh\">{e['form']}</span></p>" if e.get('form') else '')
                    + (f"<p>{e['nuance']}</p>" if e.get('nuance') else '')
                    + (f"<div class=\"tip\">💡 <span class=\"ar\">{e['tip']}</span>{(' — ' + e['tip_es']) if e.get('tip_es') else ''}</div>" if e.get('tip') else '')
                    + (f"<p><a class=\"vf\" onclick=\"window.__conj('{CONJ_LINK[g][0]}','{CONJ_LINK[g][1]}')\">🔁 {'See the full conjugation' if lang == 'en' else 'Ver la conjugación completa'}</a></p>" if g in CONJ_LINK else ''))
    return ''.join(html)

LBY = {L['c']: L for L in LETTERS}
POS = ['aislada', 'inicial', 'media', 'final']
POS_EN = ['isolated', 'initial', 'medial', 'final']
def letters_html(ls, lang='es'):
    if not ls: return ''
    en = lang == 'en'
    out = ['<h3>New letters</h3><p class="small muted">Tap a letter to open its sheet and words that use it.</p>' if en else
           '<h3>Letras nuevas</h3><p class="small muted">Toca una letra para ver su ficha y palabras que la usan.</p>']
    for c in ls:
        L = LBY.get(c)
        if not L: continue
        forms = ''.join(f'<div><b>{f or "—"}</b><span>{(POS_EN if en else POS)[i]}</span></div>' for i, f in enumerate(L['forms']))
        out.append(f'<div class="card" style="padding:12px;margin:10px 0;cursor:pointer" onclick="window.__charSheet(\'{c}\')">'
                   f'<div class="flex items-center gap-8"><span class="ar" style="font-size:44px">{c}</span>'
                   f'<div><b>{L["name_en"] if en and L.get("name_en") else L["name"]}</b> · <i>{L["tr"]}</i><div class="small muted">{L["sound_en"] if en and L.get("sound_en") else L["sound"]}</div></div></div>'
                   f'<div class="forms mt-8">{forms}</div></div>')
    return ''.join(out)

# English translations ({Spanish: English}, tools/texts/en/<level>.json, filled with nihongo-app/tools/en_todo.py).
EN = {}
SENT_EN = {}
MEANINGS_EN = {}
def L(es, wrap=''):
    w = (lambda x: f'{wrap[:1]}{x}{wrap[1:]}') if wrap else (lambda x: x)
    out = {'es': w(es)}
    en = EN.get(es) or SENT_EN.get(es)
    if en: out['en'] = w(en)
    return out

def sentences(texts):
    out = []
    for t in texts:
        for para in t['paras']:
            for ar, es in para:
                ar2, es2 = SPK.sub('', ar), re.sub(r'^[^:]{1,20}:\s*', '', es)
                if es in EN: SENT_EN[es2] = re.sub(r'^[^:]{1,20}:\s*', '', EN[es])
                if 2 <= len(ar2.split()) <= 28: out.append((ar2, es2))
    return out


# Grammar drills generated from the level's own texts: one form of a closed set is blanked out.
DRILL_EN = {
    'interrog': ('Which question word is missing? Look at the translation.', 'مَا / مَاذَا = what (مَاذَا with a verb) · مَنْ = who · أَيْنَ = where · كَيْفَ = how · كَمْ = how many/much · مَتَى = when · لِمَاذَا = why · هَلْ = yes/no question.'),
    'demos': ('This, that: agreement in gender.', 'هٰذَا (m.) / هٰذِهِ (f. and plurals of things) = this · ذٰلِكَ (m.) / تِلْكَ (f.) = that.'),
    'prep': ('Choose the right preposition.', 'فِي = in · مِنْ = from · إِلَى = to, towards · عَلَى = on · عَنْ = about, from · مَعَ = with · بَيْنَ = between · قَبْلَ / بَعْدَ = before / after · مُنْذُ = for, since · حَتَّى = until.'),
    'neg': ('لَا, لَمْ, لَنْ or لَيْسَ: look at the verb form or whether there is no verb.', 'لَا + present · لَمْ + jussive (past) · لَنْ + subjunctive (future) · لَيْسَ / لَيْسَتْ / لَسْتُ in sentences without a verb.'),
    'conj': ('Join the ideas with the right connector.', 'لِأَنَّ = because · لٰكِنْ / لٰكِنَّ = but · ثُمَّ = then · أَوْ = or · عِنْدَمَا = when · لِذٰلِكَ = so, therefore · إِذَا = if (real) · لَوْ = if (unreal) · رَغْمَ = despite.'),
    'anna': ('أَنْ goes with a verb; أَنَّ / إِنَّ with a noun or pronoun (إِنَّ after قَالَ).', 'أَنْ + subjunctive (أُرِيدُ أَنْ أَذْهَبَ) · أَنَّ + noun/pronoun (أَعْرِفُ أَنَّهُ…) · after قَالَ, إِنَّ is used.'),
    'rel': ('الَّذِي, الَّتِي or الَّذِينَ according to the antecedent.', 'الَّذِي (m. sg.) · الَّتِي (f. sg. and plurals of things) · الَّذِينَ (people, plural). Only after a definite antecedent.'),
    'kana': ('Was, became, is still…', 'كَانَ = was · أَصْبَحَ / صَارَ = became · مَا زَالَ = is still. They agree with the subject: ـَتْ feminine, ـْتُ I, ـْنَا we.'),
}
DRILL_CATS = [
    ('interrog', '❓', 'أَدَوَاتُ الاِسْتِفْهَام', 'Interrogativos', 'Interrogatives', '¿Qué palabra interrogativa falta? Fíjate en la traducción.',
     ['مَا', 'مَنْ', 'أَيْنَ', 'كَيْفَ', 'كَمْ', 'مَتَى', 'لِمَاذَا', 'هَلْ', 'مَاذَا'],
     'مَا / مَاذَا = qué (مَاذَا con verbo) · مَنْ = quién · أَيْنَ = dónde · كَيْفَ = cómo · كَمْ = cuánto · مَتَى = cuándo · لِمَاذَا = por qué · هَلْ = pregunta de sí/no.'),
    ('demos', '👉', 'أَسْمَاءُ الإِشَارَة', 'Demostrativos', 'Demonstratives', 'Este, esta, ese, esa: concordancia en género.',
     ['هٰذَا', 'هٰذِهِ', 'ذٰلِكَ', 'تِلْكَ'],
     'هٰذَا (m.) / هٰذِهِ (f. y plurales de cosas) = este, esta · ذٰلِكَ (m.) / تِلْكَ (f.) = ese, aquel.'),
    ('prep', '📍', 'حُرُوفُ الجَرّ', 'Preposiciones', 'Prepositions', 'Elige la preposición correcta.',
     ['فِي', 'مِنْ', 'إِلَى', 'عَلَى', 'عَنْ', 'مَعَ', 'بَيْنَ', 'قَبْلَ', 'بَعْدَ', 'مُنْذُ', 'حَتَّى'],
     'فِي = en · مِنْ = de, desde · إِلَى = a, hacia · عَلَى = sobre · عَنْ = de, acerca de · مَعَ = con · بَيْنَ = entre · قَبْلَ / بَعْدَ = antes / después de · مُنْذُ = desde hace · حَتَّى = hasta.'),
    ('neg', '🚫', 'النَّفْي', 'Negación', 'Negation', 'لَا, لَمْ, لَنْ o لَيْسَ: mira la forma del verbo o si no hay verbo.',
     ['لَا', 'لَمْ', 'لَنْ', 'لَيْسَ', 'لَيْسَتْ', 'لَسْتُ'],
     'لَا + presente · لَمْ + yusivo (pasado) · لَنْ + subjuntivo (futuro) · لَيْسَ / لَيْسَتْ / لَسْتُ en frases sin verbo.'),
    ('conj', '🔗', 'أَدَوَاتُ الرَّبْط', 'Conectores', 'Connectors', 'Une las ideas con el conector adecuado.',
     ['لِأَنَّ', 'لٰكِنْ', 'لٰكِنَّ', 'ثُمَّ', 'أَوْ', 'عِنْدَمَا', 'لِذٰلِكَ', 'إِذَا', 'لَوْ', 'رَغْمَ', 'أَيْضًا'],
     'لِأَنَّ = porque · لٰكِنْ / لٰكِنَّ = pero · ثُمَّ = luego · أَوْ = o · عِنْدَمَا = cuando · لِذٰلِكَ = por eso · إِذَا = si (real) · لَوْ = si (irreal) · رَغْمَ = a pesar de.'),
    ('anna', '✳️', 'أَنْ وَأَنَّ وَإِنَّ', 'أَنْ · أَنَّ · إِنَّ', 'an · anna · inna', 'أَنْ va con verbo; أَنَّ / إِنَّ con nombre o pronombre (إِنَّ tras قَالَ).',
     ['أَنْ', 'أَنَّ', 'إِنَّ', 'أَنَّهُ', 'إِنَّهُ', 'أَنَّنِي', 'إِنِّي', 'أَنَّكَ', 'أَنَّكِ', 'إِنَّهُم'],
     'أَنْ + subjuntivo (أُرِيدُ أَنْ أَذْهَبَ) · أَنَّ + nombre/pronombre (أَعْرِفُ أَنَّهُ…) · tras قَالَ se usa إِنَّ.'),
    ('rel', '🧩', 'الأَسْمَاءُ المَوْصُولَة', 'Relativos', 'Relative pronouns', 'الَّذِي, الَّتِي o الَّذِينَ según el antecedente.',
     ['الَّذِي', 'الَّتِي', 'الَّذِينَ'],
     'الَّذِي (m. sg.) · الَّتِي (f. sg. y plurales de cosas) · الَّذِينَ (personas en plural). Solo tras un antecedente definido.'),
    ('kana', '⏳', 'كَانَ وَأَخَوَاتُهَا', 'كَانَ y sus «hermanas»', 'kāna and its sisters', 'Era, se volvió, sigue…',
     ['كَانَ', 'كَانَتْ', 'كُنْتُ', 'كُنَّا', 'أَصْبَحَ', 'أَصْبَحَتْ', 'صَارَ', 'صَارَتْ', 'مَا زَالَ', 'مَا زَالَتْ'],
     'كَانَ = era/estaba · أَصْبَحَ / صَارَ = se volvió · مَا زَالَ = sigue. Concuerdan con el sujeto: ـَتْ femenino, ـْتُ yo, ـْنَا nosotros.'),
]

def make_drills(lv, texts, rng):
    sents = []
    for t in texts:
        for para in t['paras']:
            for ar, es in para:
                ar2, es2 = SPK.sub('', ar), re.sub(r'^[^:]{1,25}:\s*', '', es)
                if len(ar2.split()) <= 18: sents.append((ar2, es2))
    out = []
    for cid, icon, zh, es, en, desc, forms, expl in DRILL_CATS:
        desc_en, expl_en = DRILL_EN.get(cid, (desc, expl))
        items, seen = [], set()
        for ar, tr_es in sents:
            words = ar.split(' ')
            for i, w in enumerate(words):
                core = re.sub('[،؟.!«»:]+$', '', w)
                tail = w[len(core):]
                multi = None
                if i + 1 < len(words) and f'{core} {re.sub("[،؟.!«»:]+$", "", words[i+1])}' in forms:
                    multi = f'{core} {re.sub("[،؟.!«»:]+$", "", words[i+1])}'
                ans = multi or (core if core in forms else None)
                if not ans or (ar, ans) in seen: continue
                seen.add((ar, ans))
                n = 2 if multi else 1
                q = ' '.join(words[:i] + ['___' + (re.sub('^.*?([،؟.!«»:]*)$', r'\1', words[i + n - 1]))] + words[i + n:])
                pool = [f for f in forms if f != ans and not (cid == 'neg' and {f, ans} <= {'لَيْسَ', 'لَيْسَتْ', 'لَسْتُ'} and False)]
                opts = [ans] + rng.sample(pool, min(3, len(pool)))
                rng.shuffle(opts)
                items.append({'q': q, 'o': opts, 'a': opts.index(ans), 'tr': L(tr_es), 'e': {'es': expl, 'en': expl_en}})
                break
        if len(items) >= 5:
            rng.shuffle(items)
            out.append({'id': cid, 'icon': icon, 'title': {'zh': zh, 'ja': zh, 'es': es, 'en': en}, 'desc': {'es': desc, 'en': desc_en}, 'items': items[:40]})
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
        ex.append({'type': 'fill', 'sentence': ar.replace(target, '___', 1), 'blank': target, 'options': opts, 'tr': L(es)})
        used.add(ar)
    for ar, es in sents:
        if sum(e['type'] == 'order' for e in ex) >= n_order: break
        if ar in used: continue
        ws = ar.split()
        if 3 <= len(ws) <= 7:
            ex.append({'type': 'order', 'prompt': L(es), 'words': ws, 'answer': ar, 'rtl': True})
            used.add(ar)
    rest = [s for s in sents if s[0] not in used and len(s[0].split()) <= 14]
    for ar, es in rest[:n_choose]:
        others = [s[0] for s in sents if s[0] != ar and len(s[0].split()) <= 14]
        if len(others) < 2: break
        opts = [ar] + rng.sample(others, 2); rng.shuffle(opts)
        ex.append({'type': 'choose', 'prompt': L(es, '«»'), 'options': opts, 'correct': ar})
    # Top up with vocabulary questions (meaning → word) when the texts give too few sentence exercises.
    meanings = MEANINGS
    pool = [w for w in unit_words if w in meanings]
    rng.shuffle(pool)
    target_n = n_fill + n_order + n_choose
    for w in pool:
        if len(ex) >= target_n: break
        others = [x for x in all_words if norm(x) != norm(w)]
        if len(others) < 3: break
        opts = [w] + rng.sample(others, 3); rng.shuffle(opts)
        ex.append({'type': 'choose', 'prompt': {'es': f'«{meanings[w]}»', **({'en': f'«{MEANINGS_EN[w]}»'} if MEANINGS_EN.get(w) else {})}, 'options': opts, 'correct': w})
    return ex

MEANINGS = {}

def main():
    prev_index = {}
    order_q = 0
    for lv in LEVELS:
        (DATA / lv).mkdir(parents=True, exist_ok=True)
        path = ROOT / 'tools' / 'texts' / f'{lv}.txt'
        EN.clear(); SENT_EN.clear()
        enp = ROOT / 'tools' / 'texts' / 'en' / f'{lv}.json'
        if enp.exists(): EN.update(json.load(open(enp, encoding='utf8')))
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
                    if norm(past)[:1] in 'يت' and v['x'] and norm(v['x'])[:1] not in 'يت': past, pres = v['x'], v['w']
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
        for v in vocab: MEANINGS.setdefault(v['w'], v['m']['es'] if isinstance(v.get('m'), dict) else v.get('es', ''))
        for v in vocab: MEANINGS_EN.setdefault(v['w'], v['m'].get('en', '') if isinstance(v.get('m'), dict) else v.get('en', ''))
        units_out, texts_out, extra = [], [], {}
        order = 0
        for u in units:
            for t in u['texts']:
                order += 1
                texts_out.append({
                    'id': f'{lv}-t{order}', 'level': lv, 'order': order, 'unit': u['id'],
                    'title': {'ar': t['ar'], 'ja': t['ar'], 'es': t['es'], 'en': EN.get(t['es'], t['es'])}, 'summary': {'es': ''},
                    'paragraphs': ['\n'.join(a for a, _ in para) for para in t['paras']],
                    'translation': {'es': ['\n'.join(e for _, e in para) for para in t['paras']],
                                    **({'en': ['\n'.join(EN[e] for _, e in para) for para in t['paras']]}
                                       if all(e in EN for para in t['paras'] for _, e in para) else {})},
                    'questions': [{**q, 'q': L(q['q']['es']),
                                   **({'options_en': [EN.get(o, o) for o in q['options']]} if any(o in EN for o in q['options']) else {})}
                                  for q in t['qs']],
                    'gaps': {'items': [], 'distractors': []},
                    'tok': [[tokenize(a, index) for a, _ in para] for para in t['paras']],
                })
            new = u['listed']
            sents = sentences(u['texts'])
            units_out.append({
                'id': u['id'], 'title': {'es': u['es'], 'en': u['en'], 'ja': u['texts'][0]['ar'] if u['texts'] else ''},
                'desc': {'es': u['desc'], 'en': EN.get(u['desc'], u['desc'])}, 'grammar': u['grammar'], 'gnames': [GRAMMAR[g]['t'] for g in u['grammar'] if g in GRAMMAR], 'gnames_en': [GRAMMAR_EN.get(g, GRAMMAR[g])['t'] for g in u['grammar'] if g in GRAMMAR], 'letters': u['letters'], 'newVocab': new,
                **({'grammarIntro': {'es': letters_html(u['letters']) + grammar_html(u['grammar']),
                                     'en': letters_html(u['letters'], 'en') + grammar_html(u['grammar'], 'en')}} if u['grammar'] or u['letters'] else {}),
                'exercises': make_exercises(rng, sents, new, words, index),
            })
            extra[str(u['id'])] = {'sets': [make_exercises(random.Random(f'{lv}-{u["id"]}-{n}'), sents, new, words, index, 3, 3, 2) for n in range(6)],
                                   'words': [new[n * len(new) // 6:(n + 1) * len(new) // 6 + 4] or new[:6] for n in range(6)]}
        hanzi = [{'c': L['c'], 'm': {'es': f"{L['name']} — {L['sound']}", 'en': f"{L['name_en']} — {L['sound_en']}"}, 'p': L['tr'],
                  'forms': L['forms'], 'ex': L.get('ex', []), 'q': i + 1} for i, L in enumerate(LETTERS)] if lv == 'a1' else []
        for name, obj in [('vocab', vocab), ('units', units_out), ('texts', texts_out), ('extra', extra), ('drills', make_drills(lv, [t for u in units for t in u['texts']], random.Random('drills-' + lv))), ('hanzi', hanzi)]:
            json.dump(obj, open(DATA / lv / f'{name}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        index['__seen__'] = sorted(seen)
        prev_index = index
        print(f'{lv}: {len(units_out)} units, {len(vocab)} words, {len(texts_out)} texts')

if __name__ == '__main__':
    main()

# Example sentences for the vocabulary cards (data/<level>/examples.json).
import runpy as _r; _r.run_path(str(__import__("pathlib").Path(__file__).with_name("build_examples.py")))
