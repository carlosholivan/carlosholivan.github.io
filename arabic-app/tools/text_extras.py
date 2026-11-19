"""Adds to every Arabic text (data/<level>/texts.json) what the Chinese and Japanese readers have:
  * glossary – difficult words: words of a higher level (or the rarest of its own level) → "⚠️ Difficult words".
  * notes    – grammar points of the text's unit (then of the level) found in the text, with the fragment and the
               explanation from tools/grammar_ar.json / grammar_ar_en.json → "📌 grammar note".
  * tok      – each token [surface, segs, key] gets a grammar tag (vb adj pt pr cj) and, for verbs, the tense
               (past / pres / fut / pas): [surface, segs, key, tag, fn] → colours of "🔤 Verbs & grammar".
Safe to run again. Usage: python3 tools/text_extras.py [a1 a2 …]
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
HARAKAT = re.compile(r'[ً-ْٰـ]')
GR = json.loads((ROOT / 'tools' / 'grammar_ar.json').read_text(encoding='utf8'))
GR_EN = json.loads((ROOT / 'tools' / 'grammar_ar_en.json').read_text(encoding='utf8'))


def strip(s):
    return HARAKAT.sub('', s or '')


def norm(s):
    return re.sub('[أإآٱ]', 'ا', strip(s)).replace('ى', 'ي').replace('ة', 'ه')


POS_TAG = {'v': 'vb', 'adj': 'adj', 'prep': 'pt', 'part': 'pt', 'pron': 'pr', 'conj': 'cj'}
FUNC = {  # function words without a vocab key → tag
    **{w: 'pt' for w in 'في من إلى الى على عن مع حتى منذ عند لدى قبل بعد بين حول ضد نحو دون عبر خلال لا لم لن قد سوف هل ما إن أن ان لكي كي إلا غير سوى ليس'.split()},
    **{w: 'cj' for w in 'و ف ثم أو او أم لكن لكنّ بل إذا اذا لو لأن لان لذلك أيضا كما حيث بينما أما إذن'.split()},
    **{w: 'pr' for w in 'أنا انا أنت انت أنتِ هو هي نحن أنتم انتم هم هن هذا هذه ذلك تلك هؤلاء الذي التي الذين'.split()},
}


def tense(surf, key, pres):
    s, k = norm(surf), norm(key)
    if re.match(r'^(وس|فس|س)[يتنا]', s) and len(s) > 3 and not s.startswith(k[:2]):
        return 'fut'
    if len(surf) > 1 and surf[1] == '\u064F' and '\u0650' in surf[2:-1]:
        return 'pas'  # كُتِبَ, وُلِدَ: ḍamma on the 1st letter + kasra before the last one
    if s.startswith(k[:2]) or (s[:1] in 'وف' and s[1:].startswith(k[:2])):
        return 'past'
    if s.lstrip('وف')[:1] in 'يتنا':
        return 'pres'
    return 'past'


def tag_tokens(ents, vinfo):
    out = []
    for e in ents:
        e = e[:3]
        surf, key = e[0], e[2]
        tag = fn = None
        if key and key in vinfo:
            v = vinfo[key]
            tag = POS_TAG.get(v.get('pos'))
            if tag == 'vb':
                fn = tense(surf, key, v.get('pres'))
        else:
            s = strip(surf)
            for pre in ('', 'و', 'ف'):
                if s.startswith(pre) and s[len(pre):] in FUNC:
                    tag = FUNC[s[len(pre):]]; break
            if not tag and re.match(r'^(وس|فس|س)[يتنأ]', s) and len(s) > 3:
                tag, fn = 'vb', 'fut'
        if tag:
            e = e + [tag] + ([fn] if fn else [])
        out.append(e)
    return out


# Detectors: grammar key → function(tokens, i) → True when token i shows the point (fragment = token i [+ next word]).
W = lambda *ws: (lambda T, i: strip(T[i][0]).lstrip('وف') in ws or strip(T[i][0]) in ws)
FN = lambda *fs: (lambda T, i: len(T[i]) > 4 and T[i][4] in fs)
KEY = lambda *ks: (lambda T, i: T[i][2] and norm(T[i][2]) in {norm(k) for k in ks})
DET = {
    'articulo': lambda T, i: strip(T[i][0]).startswith('ال') and len(strip(T[i][0])) > 3,
    'demostrativos': W('هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء'),
    'interrogativos': W('هل', 'ماذا', 'أين', 'متى', 'كيف', 'لماذا', 'كم', 'أي'),
    'pronombres': W('أنا', 'أنت', 'هو', 'هي', 'نحن', 'أنتم', 'هم'),
    'inda': lambda T, i: strip(T[i][0]).lstrip('و').startswith('عند'),
    'hunak': W('هناك', 'هنا'),
    'preposiciones': lambda T, i: len(T[i]) > 3 and T[i][3] == 'pt' and strip(T[i][0]) in ('في', 'من', 'إلى', 'على', 'عن', 'مع'),
    'uhibbu': lambda T, i: norm(strip(T[i][0])).lstrip('و') [:3] in ('احب', 'يحب', 'تحب', 'نحب'),
    'negacion': W('لم'),
    'pasado': FN('past'), 'pasado2': FN('past'), 'presente': FN('pres'), 'futuro': FN('fut'),
    'an': W('أن', 'أنْ'), 'lan': W('لن'), 'kana': KEY('كان'), 'kana_madi': KEY('كان'), 'qad': W('قد'), 'mundhu': W('منذ'),
    'inna': W('إن', 'إنّ', 'إنه', 'إنها', 'لكن', 'لكنّ', 'كأن'), 'relativos': W('الذي', 'التي', 'الذين', 'اللذان', 'اللواتي'),
    'comparativo': lambda T, i: i + 2 < len(T) and strip(T[i][0]).startswith('أ') and len(strip(T[i][0])) == 4 and strip(T[i + 2][0]) == 'من',
    'prohibicion': lambda T, i: strip(T[i][0]) == 'لا' and i + 2 < len(T) and strip(T[i + 2][0])[:1] == 'ت',
    'finalidad': lambda T, i: strip(T[i][0]) in ('لكي', 'كي', 'حتى') or strip(T[i][0]).startswith('لكي'),
    'lam': lambda T, i: strip(T[i][0]) in ('لكي', 'لِـ') or (strip(T[i][0]).startswith('لي') and len(T[i]) > 3 and T[i][3] == 'vb'),
    'condicional': W('إذا', 'لو', 'إن'), 'in_shart': W('إن'),
    'concesion': lambda T, i: strip(T[i][0]) in ('رغم', 'بالرغم') or (strip(T[i][0]) == 'مع' and i + 2 < len(T) and strip(T[i + 2][0]).startswith('أن')),
    'conectores': W('لكن', 'ثم', 'أيضا', 'أيضًا', 'لذلك', 'أما', 'كما', 'بل', 'إذن', 'بينما'), 'ahraf_atf': W('ثم', 'أو', 'بل', 'لكن', 'حتى'),
    'estilo_indirecto': lambda T, i: strip(T[i][0]) in ('قال', 'قالت', 'يقول', 'تقول', 'قالوا') and i + 2 < len(T) and strip(T[i + 2][0]).startswith(('إن', 'أن')),
    'pasiva': FN('pas'), 'excepcion': W('إلا', 'غير', 'سوى'), 'kullama': W('كلما'), 'kam_khabariya': W('كم'),
    'kada': lambda T, i: norm(strip(T[i][0]))[:3] in ('كاد', 'يكا', 'تكا'),
    'tawkid': lambda T, i: strip(T[i][0]).startswith(('نفس', 'كل')) and len(strip(T[i][0])) > 3,
    'exclamacion': lambda T, i: strip(T[i][0]) == 'ما' and i + 2 < len(T) and strip(T[i + 2][0]).startswith('أ'),
    'la_nafiya': W('لا'), 'hasr': W('إنما', 'إلا'), 'qasam': W('والله', 'تالله', 'أقسم'), 'madh': W('نعم', 'بئس'),
    'ism_fil': W('هيهات', 'آمين', 'صه', 'حي'), 'tahdhir': lambda T, i: strip(T[i][0]).startswith('إياك'),
    'nun_tawkid': lambda T, i: len(T[i]) > 3 and T[i][3] == 'vb' and T[i][0].endswith(('نَّ', 'نَّ')),
    'lam_amr': lambda T, i: re.match(r'^(ف|و)?ل[يت]', strip(T[i][0])) is not None and len(T[i]) > 3 and T[i][3] == 'vb',
    'numeros': lambda T, i: len(T[i]) > 2 and T[i][2] and False,
}


def note_for(key, lang):
    g = (GR if lang == 'es' else GR_EN).get(key) or GR.get(key)
    if not g:
        return ''
    t = g.get('t', '')
    nu = g.get('nuance', '')
    first = re.split(r'(?<=[.!?])\s', nu)[0] if nu else ''
    return f"{t} — {g.get('es', '')}. {first}".strip()


def main(levels):
    vinfo, vlevel = {}, {}
    for lv in LEVELS:
        for v in json.loads((DATA / lv / 'vocab.json').read_text(encoding='utf8')):
            vinfo.setdefault(v['word'], v); vlevel.setdefault(v['word'], lv)
    for lv in levels:
        units = {u['id']: u for u in json.loads((DATA / lv / 'units.json').read_text(encoding='utf8'))}
        path = DATA / lv / 'texts.json'
        raw = path.read_text(encoding='utf8')
        T = json.loads(raw)
        li = LEVELS.index(lv)
        lvkeys = [k for u in units.values() for k in (u.get('grammar') or [])]
        ng = nn = 0
        for tx in T:
            tx['tok'] = [[tag_tokens(ents, vinfo) for ents in para] for para in tx['tok']]
            # glossary
            words = []
            for para in tx['tok']:
                for ents in para:
                    for e in ents:
                        if e[2] and e[2] in vlevel and e[2] not in words and vinfo[e[2]].get('pos') not in ('prep', 'part', 'pron', 'conj'):
                            words.append(e[2])
            hard = [w for w in words if LEVELS.index(vlevel[w]) > li]
            if len(hard) < 6:
                same = sorted((w for w in words if vlevel[w] == lv and w not in hard), key=lambda w: -(vinfo[w].get('q') or 0))
                hard += same[:6 - len(hard)]
            tx['glossary'] = {w: {'py': '', **{k: x for k, x in (vinfo[w].get('m') or {}).items() if k in ('es', 'en')}} for w in hard[:15]}
            ng += len(tx['glossary'])
            # notes
            own = (units.get(tx.get('unit')) or {}).get('grammar') or []
            notes, seen = [], set()
            for keys, cap in ((own, 6), ([k for k in lvkeys if k not in own], 3)):
                added = 0
                for key in dict.fromkeys(keys):
                    if key in seen or key not in DET or added >= cap:
                        continue
                    hit = None
                    for pi, para in enumerate(tx['tok']):
                        for ents in para:
                            body = next((i + 1 for i, e in enumerate(ents[:4]) if e[0] == '：'), 0)
                            for i in range(body, len(ents)):
                                if ents[i][0].strip() and DET[key](ents, i):
                                    j = i + 2 if (i + 2 < len(ents) and len(strip(ents[i][0])) <= 3) else i
                                    f = ''.join(e[0] for e in ents[i:j + 1]).strip()
                                    hit = (pi, f); break
                            if hit: break
                        if hit: break
                    if not hit or any(n['p'] == hit[0] and (n['f'] in hit[1] or hit[1] in n['f']) for n in notes):
                        continue
                    e = {'es': note_for(key, 'es'), 'en': note_for(key, 'en')}
                    if not e['es']:
                        continue
                    seen.add(key); added += 1
                    notes.append({'p': hit[0], 'f': hit[1], 'k': 'grammar', 'e': e})
            tx['notes'] = notes
            nn += len(notes)
        path.write_text(json.dumps(T, ensure_ascii=False, indent=1 if raw.startswith('[\n') else None), encoding='utf8')
        print(lv, len(T), 'texts ·', ng, 'glossary words ·', nn, 'grammar notes')


if __name__ == '__main__':
    main(sys.argv[1:] or LEVELS)
