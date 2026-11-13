"""Builds lessons from the hand-written texts in tools/texts/<level>.txt.

For every level:
  * texts.json  – reading texts with translation, questions and per-line tokens (furigana + dictionary key)
  * units.json  – one unit per "## n" block; its newVocab = the level words that first appear in that unit's texts.
                  Levels without a text file get frequency-ordered units of ~25 words.
  * vocab.json  – adds unit / u to every word
  * extra.json  – practice sets 2–7 per unit (fill-in, word order, translation choice, from the texts)
and data/furi.json with the furigana of every line, sentence and word used by the app.

Prints, per level, the words of the level list that no text uses yet.
Usage: python3 tools/build_texts.py
"""
import json, re, random
from pathlib import Path
import fugashi

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']
KANJI = re.compile(r'[㐀-鿿豈-﫿々〆ヶ]')
tagger = fugashi.Tagger()
legacy = json.load(open(ROOT / 'tools' / 'legacy_data.json', encoding='utf8'))
GEXTRA = json.load(open(ROOT / 'tools' / 'grammar_extra.json', encoding='utf8'))

def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in (s or ''))

READ_FIX = {'私': 'わたし', '日本': 'にほん', '日本人': 'にほんじん', '日本語': 'にほんご', '今日': 'きょう', '明日': 'あした',
            '昨日': 'きのう', '一人': 'ひとり', '二人': 'ふたり', '大人': 'おとな', '今年': 'ことし', '今朝': 'けさ', '昨夜': 'ゆうべ',
            '一昨日': 'おととい', '明後日': 'あさって', '上手': 'じょうず', '下手': 'へた', '二十歳': 'はたち', '八百屋': 'やおや',
            '眼鏡': 'めがね', '果物': 'くだもの', '時計': 'とけい', '部屋': 'へや', '一日': None, '何': None}

def tokens(line):
    out = []
    for w in tagger(line):
        f = w.feature
        surf = w.surface
        rd = hira(f.kana) if f.kana and f.kana != '*' else ''
        lemma = (f.lemma or '').split('-')[0] if f.lemma and f.lemma != '*' else surf
        base = f.orthBase if getattr(f, 'orthBase', None) and f.orthBase != '*' else lemma
        if surf in READ_FIX and READ_FIX[surf]:
            rd = READ_FIX[surf]
        out.append({'s': surf, 'r': rd, 'l': lemma, 'b': base, 'pos': f.pos1, 'pos2': f.pos2})
    # 何 before a counter / です / の is なん
    for i, t in enumerate(out):
        if t['s'] == '何':
            nx = out[i + 1]['s'] if i + 1 < len(out) else ''
            t['r'] = 'なん' if re.match(r'^(で|の|と|歳|時|人|曜|月|日|回|年|冊|枚|本|個|台|匹|杯|階|分|円|語|か)', nx) else 'なに'
    return out

def align(surf, rd):
    """'食べ' + 'たべ' → [['食','た'],['べ',None]]; kana-only → [[surf,None]]."""
    if not KANJI.search(surf) or not rd:
        return [[surf, None]]
    runs = re.findall(r'[㐀-鿿豈-﫿々〆ヶ]+|[^㐀-鿿豈-﫿々〆ヶ]+', surf)
    pat = ''.join('(.+?)' if KANJI.match(r) else '(' + re.escape(hira(r)) + ')' for r in runs)
    m = re.fullmatch(pat, rd)
    if not m:
        return [[surf, rd]]
    return [[r, m.group(i + 1) if KANJI.match(r) else None] for i, r in enumerate(runs)]

def furi_line(toks):
    segs = []
    for t in toks:
        for s, r in align(t['s'], t['r']):
            if r is None and segs and segs[-1][1] is None:
                segs[-1][0] += s
            else:
                segs.append([s, r])
    return segs

def word_furi(w, r):
    if not KANJI.search(w):
        return [[w, None]]
    return align(w, r)

# ── parse ─────────────────────────────────────────────────────────────
def parse(path):
    units, cur, txt = [], None, None
    for raw in open(path, encoding='utf8'):
        line = raw.rstrip('\n')
        if line.startswith('# ') or line.startswith('#\t') or (line.startswith('#') and not line.startswith('##')):
            continue
        if line.startswith('## '):
            p = [x.strip() for x in line[3:].split('|')]
            cur = {'id': int(p[0]), 'es': p[1], 'en': p[2], 'desc': p[3], 'grammar': [g.strip() for g in p[4].split(',')] if len(p) > 4 and p[4] else [], 'texts': []}
            units.append(cur)
        elif line.startswith('### '):
            p = [x.strip() for x in line[4:].split('|')]
            txt = {'ja': p[0], 'es': p[1], 'paras': [[]], 'qs': []}
            cur['texts'].append(txt)
        elif line.startswith('!! '):
            # Hand-written exercise for the unit:
            #   !! choose | prompt (es) | *correct / wrong / wrong
            #   !! fill | sentence with ___ | answer | wrong / wrong / wrong | translation (es)
            p = [x.strip() for x in line[3:].split('|')]
            if p[0] == 'choose':
                os_ = [o.strip() for o in p[2].split('/')]
                cur.setdefault('xex', []).append({'type': 'choose', 'prompt': L(p[1]), 'options': [o.lstrip('*') for o in os_],
                                                  'correct': next(o.lstrip('*') for o in os_ if o.startswith('*'))})
            elif p[0] == 'fill':
                cur.setdefault('xex', []).append({'type': 'fill', 'sentence': p[1], 'blank': p[2],
                                                  'options': [p[2]] + [o.strip() for o in p[3].split('/')], 'tr': L(p[4]) if len(p) > 4 else {'es': ''}})
            random.Random(line).shuffle(cur['xex'][-1]['options'])
        elif line.startswith('? '):
            q, opts = [x.strip() for x in line[2:].split('|')]
            os_ = [o.strip() for o in opts.split('/')]
            ans = next(i for i, o in enumerate(os_) if o.startswith('*'))
            txt['qs'].append({'q': {'es': q}, 'options': [o.lstrip('*') for o in os_], 'answer': ans})
        elif not line.strip():
            if txt and txt['paras'][-1]:
                txt['paras'].append([])
        elif ' = ' in line and txt is not None:
            ja, es = line.split(' = ', 1)
            txt['paras'][-1].append((ja.strip(), es.strip()))
    for u in units:
        for t in u['texts']:
            t['paras'] = [p for p in t['paras'] if p]
    return units

# ── vocabulary matching ───────────────────────────────────────────────
ALIAS = {'終る': '終わる', '曲る': '曲がる', '在る': 'ある', '有る': 'ある', '居る': 'いる', '要る': 'いる', '下さい': 'ください', '一月': 'ひとつき', 'がる': 'たがる', 'ごらんになる': 'ごらん', 'おいでになる': 'おいで', '楽む': '楽しむ', '落る': '落ちる', '落す': '落とす', '下る': '下がる', 'いくらても': 'いくらでも', '堅': '堅い', 'おわる': '終わる', 'だす': '出す', 'いくらても': 'いくらでも', '下る': '下がる', 'すくなくとも': '少なくとも', '付合う': '付き合う', '清む': '澄む', '浮ぶ': '浮かぶ', '引受る': '引き受ける', '落着く': '落ち着く', '腰掛': '腰掛け', 'かたづく': '片付く', 'まざる': '混ざる', 'まじる': '混じる', 'ふくめる': '含める', 'かけざん': '掛け算', 'ひゃっかじてん': '百科事典', 'こくせき': '国籍', 'かしょ': '箇所', '田ぼ': '田んぼ', '日日': '日々', '思いっ切り': '思いっきり', '果して': '果たして', '何しろ': 'なにしろ', '始めに': '初めに', '真似る': '真似する', '間も無く': '間もなく', '剥す': '剥がす', '傾らか': 'なだらか', '適確': '的確', '手ごろ': '手頃', 'つうか': '通貨', 'すまない': 'すまなかっ'}
# UniDic lemmas written in kanji for words the vocabulary lists in kana (and a few spelling variants).
LEMMA_OF = {'する': ['為る'], 'くらい': ['位'], 'うち': ['内'], 'そば': ['側', '傍'], 'いい': ['良い', '好い'], '下さい': ['下さる'],
            'かける': ['掛ける'], 'つける': ['付ける', '点ける', '着ける'], 'かぶる': ['被る'], 'たち': ['達'], 'まだ': ['未だ'],
            'みんな': ['皆'], 'うかがう': ['伺う'], 'あげる': ['上げる'], 'おる': ['居る'], 'にくい': ['難い', '憎い'],
            'たて': ['立て', '建て'], 'おき': ['置き'], 'ある': ['有る', '在る'], 'いる': ['居る'], 'なる': ['成る'], 'できる': ['出来る'],
            'もらう': ['貰う'], 'くれる': ['呉れる'], 'やる': ['遣る'], 'しまう': ['仕舞う'], 'こと': ['事'], 'もの': ['物', '者'],
            'とき': ['時'], 'ところ': ['所'], 'ほう': ['方'], 'わけ': ['訳'], 'はず': ['筈'], 'ため': ['為'], 'よう': ['様'],
            'ごらんになる': ['御覧'], '点く': ['付く'], 'ごみ': ['塵'], 'おもちゃ': ['玩具'], 'とても': ['迚も'], 'たくさん': ['沢山'], '年寄': ['年寄り'], '清む': ['澄む'], '釣': ['釣り'], '偶': ['偶に'], '極': ['極めて'], '訓': ['訓読み']}

def keys_for(v):
    w, r = v['w'], v['r']
    ks = {w} | set(LEMMA_OF.get(w, []))
    if w in ALIAS: ks.add(ALIAS[w])
    if w.endswith('じる') and KANJI.search(w): ks.add(w[:-2] + 'ずる')  # 命じる → 命ずる (UniDic lemma)
    if w.endswith('する') and len(w) > 2: ks.add(w[:-2])
    if not KANJI.search(w):
        ks.add(hira(w))
    elif len(r) >= 3:
        ks.add(r)  # words often written in kana (沢山 → たくさん)
    return ks

def text_hits(toks_lines, vocab):
    """Set of vocab words used in the token lines (lemma match or token-boundary sequence match)."""
    idx = {}
    for v in vocab:
        for k in keys_for(v):
            idx.setdefault(k, set()).add(v['w'])
    hits = set()
    for toks in toks_lines:
        for i, t in enumerate(toks):
            for k in {t['l'], t['b'], t['s'], hira(t['s'])}:
                if k in idx: hits |= idx[k]
            acc = ''
            for j in range(i, min(i + 5, len(toks))):
                acc += toks[j]['s']
                if j > i and acc in idx: hits |= idx[acc]
                if j > i and hira(acc) in idx: hits |= idx[hira(acc)]
        line = ''.join(t['s'] for t in toks)
        for v in vocab:
            if KANJI.search(v['w']) and len(v['w']) >= 2 and v['w'] in line:
                hits.add(v['w'])
            # conjugated multi-token expressions (お目に掛かれて, 気に入った, 思い付いた)
            elif KANJI.search(v['w']) and len(v['w']) >= 4 and v['w'][-1] in 'うくぐすつぬぶむるい' and v['w'][:-1] in line:
                hits.add(v['w'])
    return hits

# ── exercises from text sentences ─────────────────────────────────────
CONTENT = {'名詞', '動詞', '形容詞', '副詞', '形状詞', '代名詞', '連体詞', '感動詞', '接続詞'}
def chunks(toks):
    out = []
    for t in toks:
        if t['pos'] == '補助記号':
            if out: out[-1] += t['s']
            continue
        if out and (t['pos'] in ('助詞', '助動詞', '接尾辞') or (t['pos'] == '動詞' and t['pos2'] == '非自立可能' and out[-1][-1:] in 'てで')):
            out[-1] += t['s']
        else:
            out.append(t['s'])
    return out

SPK = re.compile(r'^[^：]{1,8}：')
# English translations ({Spanish: English}, tools/texts/en/<level>.json, filled with tools/en_todo.py).
EN = {}
SENT_EN = {}
def L(es, wrap=''):
    out = {'es': f'{wrap[:1]}{es}{wrap[1:]}' if wrap else es}
    en = EN.get(es) or SENT_EN.get(es)
    if en: out['en'] = f'{wrap[:1]}{en}{wrap[1:]}' if wrap else en
    return out
def strip_en(en):
    return re.sub(r'^[^:]{1,20}:\s*', '', en)
def sentences(units_texts):
    out = []
    for t in units_texts:
        for para in t['paras']:
            for ja, es in para:
                ja2, es2 = SPK.sub('', ja), re.sub(r'^[^:]{1,20}:\s*', '', es)
                en2 = strip_en(EN[es]) if es in EN else None
                # A whole line of dialogue: drop the quotes (and the speaker in the translation).
                if ja2.startswith('「') and ja2.endswith('」') and ja2.count('「') == 1:
                    ja2, es2 = ja2[1:-1], es2.strip().strip('«»')
                    if en2: en2 = en2.strip().strip('«»“”"')
                if en2: SENT_EN[es2] = en2
                if 4 <= len(ja2) <= 32 and '「' not in ja2:
                    out.append((ja2, es2))
    return out

def make_exercises(rng, sents, unit_words, all_words, n_fill=4, n_order=3, n_choose=2):
    ex = []
    pool = [w for w in all_words]
    rng.shuffle(sents)
    used = set()
    # fill: blank one of the unit words in a sentence
    for ja, es in sents:
        if len([e for e in ex if e['type'] == 'fill']) >= n_fill: break
        cand = [w for w in unit_words if len(w) >= 1 and w in ja and KANJI.search(w) or (len(w) >= 2 and w in ja)]
        if not cand or ja in used: continue
        w = max(cand, key=len)
        cand_o = [x for x in pool if x != w and abs(len(x) - len(w)) <= 2 and x not in ja]
        if len(cand_o) < 3: cand_o = [x for x in pool if x != w and x not in ja]
        opts = [w] + rng.sample(cand_o, 3)
        rng.shuffle(opts)
        ex.append({'type': 'fill', 'sentence': ja.replace(w, '___', 1), 'blank': w, 'options': opts, 'tr': L(es)})
        used.add(ja)
    for ja, es in sents:
        if len([e for e in ex if e['type'] == 'order']) >= n_order: break
        if ja in used: continue
        ch = chunks(tokens(ja))
        if 3 <= len(ch) <= 7:
            ex.append({'type': 'order', 'prompt': L(es), 'words': ch, 'answer': ja})
            used.add(ja)
    rest = [s for s in sents if s[0] not in used]
    for ja, es in rest[:n_choose]:
        others = [s[0] for s in sents if s[0] != ja]
        if len(others) < 2: break
        opts = [ja] + rng.sample(others, 2)
        rng.shuffle(opts)
        ex.append({'type': 'choose', 'prompt': L(es, '«»'), 'options': opts, 'correct': ja})
        used.add(ja)
    return ex

def make_gaps(t, vocab, rng):
    full = '\n'.join(ja for para in t['paras'] for ja, _ in para)
    body = SPK.sub('', full)
    words = sorted({v['w'] for v in vocab if len(v['w']) >= 2 and v['w'] in body}, key=lambda w: body.find(w))
    items, pos = [], 0
    for w in words:
        j = full.find(w, pos)
        if j >= 0 and not any(w in x or x in w for x in items):
            items.append(w); pos = j + len(w)
        if len(items) >= 6: break
    others = [v['w'] for v in vocab if v['w'] not in items and len(v['w']) >= 2]
    return {'items': items, 'distractors': rng.sample(others, min(3, len(others)))}


# ── conjugation links in grammar formulas ─────────────────────────────
# Every verb/adjective form in a formula becomes a clear chip that opens the conjugation review sheet.
V = r'(?<![A-Za-z])(?:[Vv]erbo\s*|V1?\s*-?\s*)'
FORM_RULES = [
    (V + r'(?:ない|forma ない)\s*\(?sin ない\)?', 'naistem', 'V-ない sin ない'),
    (V + r'ます\s*\(?(?:sin ます|raíz)\)?', 'stem', 'V-ます sin ます'),
    (V + r'ます', 'stem', 'V-ます sin ます'),
    (r'Raíz(?:\s*ます)?(?=\s*\+)', 'stem', 'V-ます sin ます'),
    (V + r'(?:dicc\.?|diccionario|辞書形|る(?!れる))', 'dict', 'V-dicc. (る)'),
    (V + r'(?:普通形|forma (?:simple|llana))', 'plain', 'V forma llana'),
    (r'forma (?:simple|llana)|普通形', 'plain', 'forma llana'),
    (V + r'ない', 'nai', 'V-ない'),
    (V + r'たら', 'tara', 'V-たら'),
    (V + r'て', 'te', 'V-て'),
    (V + r'た', 'ta', 'V-た'),
    (V + r'(?:forma )?ば', 'ba', 'V-ば'),
    (V + r'(?:よう|意向形|forma volitiva)', 'vol', 'V-よう (volitiva)'),
    (V + r'(?:\(?causativ[oa]\)?|forma causativa)', 'caus', 'V-causativa'),
    (V + r'forma pasiva', 'pas', 'V-pasiva'),
    (V + r'(?:可能|forma potencial)', 'pot', 'V-potencial'),
    (r'(?<![A-Za-z])(?:Adj-(?:くて|なで|な|い|ければ|くない|く)|A(?:い|な)(?![a-z]))', 'adj', None),
]
FORM_RX = re.compile('|'.join(f'({r})' for r, _, _ in FORM_RULES))
# English formulas (tools/grammar_en.json) use their own labels.
VE = r'(?<![A-Za-z])(?:[Vv]erb\s*|V1?\s*-?\s*)'
FORM_RULES_EN = [
    (VE + r'ない\s*\(?(?:without ない|stem)\)?', 'naistem', 'V-ない without ない'),
    (VE + r'ます\s*\(?(?:without ます|stem)\)?', 'stem', 'V-ます stem'),
    (VE + r'ます', 'stem', 'V-ます stem'),
    (r'Stem(?:\s*ます)?(?=\s*\+)', 'stem', 'V-ます stem'),
    (VE + r'(?:dict\.?|dictionary|辞書形|る(?!れる))', 'dict', 'V-dict. (る)'),
    (VE + r'(?:普通形|plain form)', 'plain', 'V plain form'),
    (r'plain form|普通形', 'plain', 'plain form'),
    (VE + r'ない', 'nai', 'V-ない'),
    (VE + r'たら', 'tara', 'V-たら'),
    (VE + r'て', 'te', 'V-て'),
    (VE + r'た', 'ta', 'V-た'),
    (VE + r'ば', 'ba', 'V-ば'),
    (VE + r'(?:よう|意向形|volitional)', 'vol', 'V-よう (volitional)'),
    (VE + r'(?:\(?causative\)?|causative form)', 'caus', 'V-causative'),
    (VE + r'passive form', 'pas', 'V-passive'),
    (VE + r'(?:可能|potential)', 'pot', 'V-potential'),
    (r'(?<![A-Za-z])(?:Adj-(?:くて|なで|な|い|ければ|くない|く)|A(?:い|な)(?![a-z]))', 'adj', None),
]
FORM_RX_EN = re.compile('|'.join(f'({r})' for r, _, _ in FORM_RULES_EN))
GEN = json.load(open(ROOT / 'tools' / 'grammar_en.json', encoding='utf8'))
def link_forms(form, en=False):
    rules, rx = (FORM_RULES_EN, FORM_RX_EN) if en else (FORM_RULES, FORM_RX)
    def rep(m):
        i = next(k for k, g in enumerate(m.groups()) if g is not None)
        fid, label = rules[i][1], rules[i][2]
        txt = label or m.group(0)
        return f'<a class="vf" onclick="event.stopPropagation();window.__conj(\'{fid}\')">{txt}</a>'
    return rx.sub(rep, form)

def grammar_intro(points, level, en=False):
    T = (lambda x: GEN.get(x, x)) if en else (lambda x: x)
    L = level.upper()
    gl = legacy['grammar'].get(L, []) + [x for k, v in legacy['grammar'].items() if k != L for x in v]
    def find(p):
        if p in GEXTRA: return {'p': p, **GEXTRA[p], 'explain': GEXTRA[p]}
        norm = lambda x: re.split(r'[ (（]', x.replace('～', ''))[0]
        for g in gl:
            if g['p'].replace('～', '').replace(' ', '') == p.replace('～', '').replace(' ', '') or norm(g['p']) == norm(p): return g
        return None
    html = []
    for p in points:
        g = find(p)
        if not g: continue
        e = g.get('explain', {})
        html.append(f"<h3>{g['p']} — {T(g.get('es', ''))}</h3>"
                    + (f"<p><b>{'Form' if en else 'Forma'}:</b> <span class=\"zh\">{link_forms(T(e['form']), en)}</span></p>" if e.get('form') else '')
                    + (f"<p>{T(e['nuance'])}</p>" if e.get('nuance') else '')
                    + (f"<div class=\"tip\">💡 {T(e['tip'])}</div>" if e.get('tip') else ''))
    out = ''.join(html)
    if 'class="vf"' in out:
        out = ('<p class="small muted">👆 Tap a marked form (V-dict., V-ます stem, V-て…) to review how it conjugates in groups I, II and III.</p>' if en else
               '<p class="small muted">👆 Toca una forma marcada (V-dicc., V-ます sin ます, V-て…) para repasar cómo se conjuga en los grupos I, II y III.</p>') + out
    return out

# ── build ─────────────────────────────────────────────────────────────
furi = {}
prev_words = set()
ALLV = {l: json.load(open(DATA / l / 'vocab.json', encoding='utf8')) for l in LEVELS}

ALLR = {v['w']: v['r'] for l in ALLV for v in ALLV[l]}

def merge_compounds(toks, keys):
    """Tokens for the reader: [surface, [[seg, reading]...], key]. Consecutive tokens whose joined surface is a
    dictionary word (お母さん, 日曜日, 図書館) become one clickable token."""
    out, i = [], 0
    while i < len(toks):
        hit = None
        for n in range(min(8, len(toks) - i), 1, -1):
            surf = ''.join(t['s'] for t in toks[i:i + n])
            if surf in keys and not any(t['pos'] == '補助記号' for t in toks[i:i + n]):
                hit = (n, surf); break
        if hit:
            n, surf = hit
            segs = [sg for t in toks[i:i + n] for sg in align(t['s'], t['r'])]
            if keys[surf] == surf and ALLR.get(surf):  # the dictionary reading beats the per-token guess (生意気 = なまいき)
                segs = word_furi(surf, ALLR[surf])
            out.append([surf, segs, keys[surf]]); i += n; continue
        x = toks[i]
        out.append([x['s'], align(x['s'], x['r']), next((keys[k] for k in (x['b'], x['s'], x['l']) if k in keys), None)])
        i += 1
    return out

for lv in LEVELS:
    vocab = json.load(open(DATA / lv / 'vocab.json', encoding='utf8'))
    for v in vocab:
        furi[v['w']] = word_furi(v['w'], v['r'])
    path = ROOT / 'tools' / 'texts' / f'{lv}.txt'
    EN.clear(); SENT_EN.clear()
    enp = ROOT / 'tools' / 'texts' / 'en' / f'{lv}.json'
    if enp.exists(): EN.update(json.load(open(enp, encoding='utf8')))
    rng = random.Random(lv)
    units_out, texts_out, extra = [], [], {}
    by_word = {v['w']: v for v in vocab}
    assigned = {}
    seen_in = {}
    if path.exists():
        units = parse(path)
        order = 0
        for u in units:
            tl = []
            for k, t in enumerate(u['texts']):
                order += 1
                tok = [[tokens(ja) for ja, _ in para] for para in t['paras']]
                for para in tok:
                    for toks in para:
                        line = ''.join(x['s'] for x in toks)
                        furi[line] = furi_line(toks)
                        furi[SPK.sub('', line)] = furi_line(toks[len(tokens(SPK.match(line).group(0))) if SPK.match(line) else 0:]) if SPK.match(line) else furi[line]
                furi[t['ja']] = furi_line(tokens(t['ja']))
                hits = text_hits([x for para in tok for x in para], vocab)
                for w in hits:
                    seen_in.setdefault(w, [])
                    if u['id'] not in seen_in[w]: seen_in[w].append(u['id'])
                vocab_keys = {}
                for vv in vocab + [x for l2 in LEVELS if l2 != lv for x in ALLV[l2]]:  # this level first, then the rest
                    for kk in keys_for(vv): vocab_keys.setdefault(kk, vv['w'])
                texts_out.append({
                    'id': f'{lv}-t{order}', 'level': lv, 'order': order, 'unit': u['id'],
                    'title': {'ja': t['ja'], 'es': t['es'], 'en': EN.get(t['es'], t['es'])},
                    'summary': {'es': ''},
                    'paragraphs': ['\n'.join(ja for ja, _ in para) for para in t['paras']],
                    'translation': {'es': ['\n'.join(es for _, es in para) for para in t['paras']],
                                    **({'en': ['\n'.join(EN[es] for _, es in para) for para in t['paras']]}
                                       if all(es in EN for para in t['paras'] for _, es in para) else {})},
                    'questions': [{**q, 'q': L(q['q']['es']),
                                   **({'options_en': [EN.get(o, o) for o in q['options']]} if any(o in EN for o in q['options']) else {})}
                                  for q in t['qs']],
                    'gaps': make_gaps(t, vocab, rng),
                    # per paragraph → per line → tokens [surface, [[seg, reading]...], dictionary key]
                    'tok': [[merge_compounds(toks, vocab_keys) for toks in para] for para in tok],
                })
                tl.append(t)
            u['_texts'] = tl
        # Each word is taught in one of the units whose texts use it: the least loaded one,
        # deciding first the words that have the fewest options (keeps lessons balanced).
        load = {u['id']: 0 for u in units}
        for w in sorted(seen_in, key=lambda w: (len(seen_in[w]), seen_in[w][0])):
            if w in prev_words: continue
            uid = min(seen_in[w], key=lambda i: (load[i], i))
            assigned[w] = uid; load[uid] += 1
        for u in units:
            new = [w for w, uid in assigned.items() if uid == u['id'] and w not in prev_words]
            new.sort(key=lambda w: by_word[w].get('q', 99999))
            sents = sentences(u['_texts'])
            units_out.append({
                'id': u['id'], 'title': {'es': u['es'], 'en': u['en'], 'ja': u['_texts'][0]['ja'] if u['_texts'] else ''},
                'desc': {'es': u['desc'], 'en': EN.get(u['desc'], u['desc'])}, 'grammar': u['grammar'], 'newVocab': new,
                'grammarIntro': {'es': grammar_intro(u['grammar'], lv), 'en': grammar_intro(u['grammar'], lv, True)} if u['grammar'] else None,
                'exercises': u.get('xex', []) + make_exercises(rng, list(sents), new, list(by_word)),
            })
            # sets 2–7: different sentences / word slices
            sets, words = [], []
            all_sents = sentences(u['_texts'])
            for n in range(6):
                r2 = random.Random(f'{lv}-{u["id"]}-{n}')
                sl = new[n * len(new) // 6:(n + 1) * len(new) // 6 + 4] if new else []
                sets.append(make_exercises(r2, list(all_sents), new, list(by_word), n_fill=3, n_order=3, n_choose=2))
                words.append(sl or new[:6])
            extra[str(u['id'])] = {'sets': sets, 'words': words}
    # Words not used by any text: frequency-ordered units after the text units.
    rest = [v['w'] for v in sorted(vocab, key=lambda v: v.get('q', 99999)) if v['w'] not in assigned and v['w'] not in prev_words]
    missing = [w for w in rest]
    if rest:
        base = len(units_out)
        size = 25
        for i in range(0, len(rest), size):
            uid = base + i // size + 1
            ws = rest[i:i + size]
            for w in ws: assigned[w] = uid
            units_out.append({'id': uid, 'title': {'es': f'Vocabulario {uid - base}', 'en': f'Vocabulary {uid - base}', 'ja': '・'.join(ws[:3])},
                              'desc': {'es': '、'.join(ws[:6]) + '…', 'en': '、'.join(ws[:6]) + '…'}, 'grammar': [], 'newVocab': ws,
                              'grammarIntro': None, 'exercises': []})
            extra[str(uid)] = {'sets': [[] for _ in range(6)], 'words': [ws[j * 4:(j * 4) + 6] or ws[:6] for j in range(6)]}
    for v in vocab:
        v['unit'] = assigned.get(v['w'])
        v['u'] = f"{lv}-{v['unit']}" if v['unit'] else None
    for u in units_out:
        if not u['grammarIntro']: u.pop('grammarIntro')
    json.dump(vocab, open(DATA / lv / 'vocab.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(units_out, open(DATA / lv / 'units.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(texts_out, open(DATA / lv / 'texts.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(extra, open(DATA / lv / 'extra.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    tests = legacy['tests'].get(lv.upper(), [])
    drills = [{'id': 'jlpt', 'icon': '🎯', 'title': {'ja': '文法テスト', 'es': 'Test de gramática JLPT', 'en': 'JLPT grammar test'},
               'desc': {'es': 'Preguntas tipo examen sobre la gramática del nivel.', 'en': 'Exam-style questions on the level grammar.'},
               'items': [{'q': x['q'], 'o': x['opts'], 'a': x['correct'], 'tr': x.get('ctx', {}), 'e': x.get('exp', {})} for x in tests]}] if tests else []
    json.dump(drills, open(DATA / lv / 'drills.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    for u in units_out:
        for e in u['exercises']:
            for s in [e.get('sentence', '').replace('___', e.get('blank', '')), e.get('answer', ''), *(e.get('options') or [])]:
                if s and s not in furi: furi[s] = furi_line(tokens(s))
    prev_words |= {v['w'] for v in vocab}
    n_text_units = sum(1 for u in units_out if u['exercises'])
    print(f"{lv}: {len(units_out)} units ({n_text_units} with texts), {len(texts_out)} texts; words in texts {len(vocab) - len(missing)}/{len(vocab)}")
    if path.exists():
        (ROOT / 'tools' / f'missing_{lv}.txt').write_text(' '.join(f"{w}({by_word[w]['r']})={by_word[w]['m']['es'].split(';')[0][:16]}" for w in missing), encoding='utf8')

json.dump(furi, open(DATA / 'furi.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('furi entries', len(furi))

# Example sentences for the vocabulary cards (data/<level>/examples.json).
import runpy as _r; _r.run_path(str(__import__("pathlib").Path(__file__).with_name("build_examples.py")))
