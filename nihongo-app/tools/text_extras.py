"""Adds to every text in data/<level>/texts.json what the Chinese app's reader has:
  * glossary – the difficult words of the text: words of a higher level (or, when there are few, the rarest words
               of its own level) → enables the "⚠️ Difficult words" button.
  * notes    – grammar points of the text's unit (then of the level) found in the text, with the fragment and an
               explanation taken from the unit's grammar intro → "📌 grammar note" (dashed underline + list).
  * tok      – each token [surface, segs, key] gets a grammar tag and, for endings / helper verbs / verb forms, a
               function code: [surface, segs, key, tag, fn]. tag ∈ vb aux pt adj cj (colours of "🔤 Verbs & grammar").
Safe to run again (it recomputes everything from the tokens). Usage: python3 tools/text_extras.py [n5 n4 …]
"""
import json, re, sys, html
from pathlib import Path
import fugashi

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']
tagger = fugashi.Tagger()
KANJI = re.compile(r'[一-鿿々]')
NEEDS_V = {'こと', 'の', 'もの', 'ところ', 'ため', 'はず', 'つもり', 'わけ', 'ほう', 'まま', 'とき'}
STOP = {'お願いします', 'みたい', 'しまった', 'だと', 'よし', 'らしい', 'ような', 'ように', 'そうだ', 'ところ', 'もの', 'こと', 'わけ', 'はず'}

AFTER_TE = {'居る': 'teiru', 'いる': 'teiru', '仕舞う': 'shimau', 'しまう': 'shimau', '置く': 'oku', 'おく': 'oku',
            '見る': 'miru', 'みる': 'miru', '来る': 'kuru', 'くる': 'kuru', '行く': 'iku', 'いく': 'iku', '有る': 'tearu',
            'ある': 'tearu', '上げる': 'juju', 'あげる': 'juju', '呉れる': 'juju', 'くれる': 'juju', '貰う': 'juju',
            'もらう': 'juju', '頂く': 'juju', 'いただく': 'juju', '下さる': 'kudasai', 'くださる': 'kudasai',
            '差し上げる': 'juju', 'やる': 'juju', '遣る': 'juju', '欲しい': 'hoshii', 'ほしい': 'hoshii'}
AUX_FN = {'ない': 'neg', 'ず': 'neg', 'ぬ': 'neg', 'た': 'ta', 'ます': 'masu', 'たい': 'tai', 'だ': 'cop', 'です': 'cop',
          'まい': 'mai', 'らしい': 'rashii', 'う': 'vol', 'よう': 'vol', 'せる': 'sase', 'させる': 'sase', 'たがる': 'tagaru'}


def raw_tokens(line):
    out = []
    for w in tagger(line):
        f = w.feature
        out.append({'s': w.surface, 'pos': f.pos1, 'pos2': f.pos2, 'l': (f.lemma or '').split('-')[0],
                    'ct': f.cType or '', 'cf': f.cForm or ''})
    return out


def verb_form(t):
    cf, ct, l, s = t['cf'], t['ct'], t['l'], t['s']
    if cf.startswith('意志推量'): return 'vvol'
    if cf.startswith('命令'): return 'vimp'
    if cf.startswith('仮定'): return 'vcond'
    if ct.startswith('下一段') and l and l[-1] in 'うくぐすつぬぶむ' and l != s: return 'vpot'
    if ct.startswith('下一段') and l.endswith('る') and len(l) >= 2 and s.startswith(l[:-1] + 'れ') and not l.endswith('れる'):
        return 'vpot'
    return None


def tag_group(group, prev):
    """Tag and function code for the raw tokens that make up one reader token. prev = raw token before the group."""
    t = group[-1] if len(group) > 1 else group[0]
    if len(group) > 1:
        vs = [x for x in group if x['pos'] == '動詞']
        if vs: return 'vb', verb_form(vs[-1])
        if any(x['pos'] in ('形容詞', '形状詞') for x in group): return 'adj', None
        if all(x['pos'] == '助動詞' for x in group): return 'aux', AUX_FN.get(group[0]['l'])
        return None, None
    p = t['pos']
    if p == '動詞':
        if prev and prev['pos'] == '助詞' and prev['s'] in ('て', 'で') and t['l'] in AFTER_TE:
            return 'aux', AFTER_TE[t['l']]
        return 'vb', verb_form(t)
    if p == '助動詞':
        if t['l'] in ('れる', 'られる'):
            if prev and prev['pos'] == '動詞' and prev['ct'].startswith('五段'): return 'aux', 'pas'
            if prev and prev['pos'] == '助動詞' and prev['l'] in ('せる', 'させる'): return 'aux', 'cpas'
            if t['s'].startswith('さ') or (prev and prev['l'] in ('為る', 'する')): return 'aux', 'pas'
            return 'aux', 'rare'
        return 'aux', AUX_FN.get(t['l'])
    if p == '形容詞' and t['pos2'] == '非自立可能' and t['l'] in ('無い', 'ない'):
        return 'aux', 'neg'
    if p == '形容詞' and t['l'] in ('欲しい',) and prev and prev['s'] in ('て', 'で'):
        return 'aux', 'hoshii'
    if p == '助詞': return 'pt', None
    if p in ('形容詞', '形状詞'): return 'adj', None
    if p == '接続詞': return 'cj', None
    return None, None


def tag_line(entries, line):
    """entries: reader tokens [surface, segs, key(, …)] of one line → same list with tag/fn appended."""
    raw = raw_tokens(line)
    if ''.join(x['s'] for x in raw) != ''.join(e[0] for e in entries):
        return [e[:3] for e in entries]
    out, k = [], 0
    for e in entries:
        e = e[:3]
        acc, group = '', []
        while k < len(raw) and len(acc) < len(e[0]):
            acc += raw[k]['s']; group.append(raw[k]); k += 1
        if acc != e[0]:  # misaligned (should not happen): leave the rest untagged
            out.append(e); out.extend(x[:3] for x in entries[len(out):]); return out
        prev = raw[k - len(group) - 1] if k - len(group) - 1 >= 0 else None
        tag, fn = tag_group(group, prev)
        if tag in ('aux', 'pt') and e[2] and KANJI.search(e[2]) and not KANJI.search(e[0]):
            e = [e[0], e[1], None]
        if tag: e = e + [tag] + ([fn] if fn else [])
        out.append(e)
    return out


# ── grammar notes ─────────────────────────────────────────────────────
def intro_blocks(intro):
    """grammarIntro HTML → [(title, explanation)] per <h3>."""
    out = []
    for blk in re.split(r'<h3>', intro or '')[1:]:
        title, _, rest = blk.partition('</h3>')
        paras = [re.sub(r'<[^>]+>', '', p) for p in re.findall(r'<p>(.*?)</p>', rest, re.S)]
        paras = [html.unescape(p).strip() for p in paras if p and not re.match(r'^(Forma|Form|形)\s*[:：]', re.sub(r'<[^>]+>', '', p))]
        tip = re.search(r'<div class="tip">(.*?)</div>', rest, re.S)
        ex = html.unescape(re.sub(r'<[^>]+>', '', tip.group(1))).strip() if tip else ''
        out.append((html.unescape(re.sub(r'<[^>]+>', '', title)).strip(), ' '.join(paras[:1]), ex))
    return out


def alternatives(g):
    """'～ようにする' → [['ようにする']]; 'Nしか～ない' → [['しか','ない']]; '～なきゃ／～なくちゃ' → two alternatives."""
    g = g.replace('〜', '～')
    inner = re.findall(r'[（(]([^）)]*～[^）)]*)[）)]', g)
    g = re.sub(r'[（(][^）)]*[）)]', '', g)
    alts = []
    for src in [g] + inner:
        for a in re.split(r'[／/・,、]', src):
            a = re.sub(r'疑問詞|[A-Za-z0-9＋+\s]', '', a)
            pieces = [p for p in re.split(r'[～…]', a) if p]
            if pieces and all(re.fullmatch(r'[ぁ-ゖァ-ヺー一-鿿々]+', p) for p in pieces):
                alts.append(pieces)
    return alts


SPECIAL = [('使役受身', 'cpas'), ('受身', 'pas|rare'), ('使役', 'sase'), ('可能', 'vpot|rare'), ('意向形', 'vvol|vol'),
           ('命令形', 'vimp'), ('～ば', 'vcond'), ('ている', 'teiru'), ('てしまう', 'shimau'), ('ておく', 'oku'), ('てみる', 'miru')]


def find_fragment(g, lines):
    """First place where grammar point g appears: (paragraph, fragment) or None. lines: [(pi, line, entries)]."""
    fns = next((f.split('|') for key, f in SPECIAL if re.match(r'^[^～]*～?' + re.escape(key) + r'(?![ぁ-ゖ～])', g) and (key in ('使役受身', '受身', '使役', '可能', '意向形', '命令形') or g.startswith('～' + key))), None)
    for pi, line, ents in lines:
        starts, pos = [], 0
        for e in ents:
            starts.append(pos); pos += len(e[0])
        body0 = next((i + 1 for i, e in enumerate(ents[:4]) if e[0] == '：'), 0)

        def frag(i, j):
            a = i
            while a > body0 and i - a < 3 and ents[a - 1][0] not in '、。！？「」『』：　 ' and \
                    (len(ents[a - 1]) < 4 or ents[a - 1][3] != 'pt' or ents[a - 1][0] in ('て', 'で')):
                a -= 1
            b = j
            while b + 1 < len(ents) and len(ents[b + 1]) > 3 and ents[b + 1][3] == 'aux' and b - j < 2:
                b += 1
            return ''.join(e[0] for e in ents[a:b + 1])

        if fns:
            for i, e in enumerate(ents):
                if i >= body0 and len(e) > 4 and e[4] in fns:
                    return pi, frag(i, i)
        for pieces in alternatives(g):
            if sum(len(p) for p in pieces) < 2 and not (len(pieces) == 1 and pieces[0] in ('し', 'ば', 'と', 'ても', 'のに', 'ので')):
                continue
            for i in range(body0, len(ents)):
                k, j, ok = 0, i, True
                # first piece must start at a token boundary; single kana must be a whole token
                cur = i
                for p in pieces:
                    found = None
                    for x in range(cur, min(len(ents), cur + (1 if p is pieces[0] else 8))):
                        s = ''.join(e[0] for e in ents[x:x + 6])
                        if s.startswith(p) and (len(p) > 1 or ents[x][0] == p):
                            n, acc = x, ''
                            while len(acc) < len(p): acc += ents[n][0]; n += 1
                            found = n - 1; break
                    if found is None: ok = False; break
                    cur = found + 1
                prevg = ents[i - 1][3] if i > 0 and len(ents[i - 1]) > 3 else None
                if ok and len(pieces) == 1 and len(pieces[0]) == 1 and not ((len(ents[i]) > 3 and ents[i][3] == 'pt') and prevg in ('vb', 'aux', 'adj')):
                    ok = False
                if ok and len(pieces) == 1 and pieces[0] in NEEDS_V and not (i > 0 and len(ents[i - 1]) > 3 and ents[i - 1][3] in ('vb', 'aux', 'adj')):
                    ok = False
                if ok:
                    return pi, frag(i, cur - 1)
    return None


def build_notes(tx, unit_points, level_points):
    lines = []
    for pi, para in enumerate(tx.get('tok', [])):
        for li, ents in enumerate(para):
            lines.append((pi, ''.join(e[0] for e in ents), ents))
    notes, seen = [], set()
    for pts, cap in ((unit_points, 6), (level_points, 4)):
        added = 0
        for g, blk in pts:
            if g in seen or len(notes) >= 8 or added >= cap: continue
            hit = find_fragment(g, lines)
            if not hit: continue
            pi, f = hit
            if not f or any(n['p'] == pi and (n['f'] in f or f in n['f']) for n in notes): continue
            seen.add(g); added += 1
            e = {}
            for lang in ('es', 'en'):
                title, expl, ex = blk.get(lang) or blk.get('es')
                e[lang] = f'{title}. {expl}'.strip() + (f' ({ex.lstrip("💡 ")})' if ex and len(expl) < 60 else '')
            notes.append({'p': pi, 'f': f, 'k': 'grammar', 'e': e})
    return notes


def main(levels):
    vocab = {lv: json.loads((DATA / lv / 'vocab.json').read_text(encoding='utf8')) for lv in LEVELS}
    vlevel, vinfo = {}, {}
    for lv in LEVELS:
        for v in vocab[lv]:
            vlevel.setdefault(v['word'], lv); vinfo.setdefault(v['word'], v)
    for lv in levels:
        units = json.loads((DATA / lv / 'units.json').read_text(encoding='utf8'))
        upts, allpts = {}, []
        for u in units:
            gl = u.get('grammar') or []
            intro = u.get('grammarIntro') or {}
            blks = {lang: intro_blocks(intro.get(lang, '')) for lang in ('es', 'en')}
            pts = []
            last = {lang: None for lang in blks}
            for i, g in enumerate(gl):
                b = {}
                for lang in ('es', 'en'):
                    bl = blks[lang]
                    hit = next((x for x in bl if x[0].split(' — ')[0].strip() == g), None) or \
                          next((x for x in bl if g in x[0].split(' — ')[0] or x[0].split(' — ')[0].strip() in g), None)
                    if not hit and len(bl) == len(gl): hit = bl[i]
                    hit = hit or last[lang] or (g, '', '')
                    last[lang] = hit; b[lang] = hit
                pts.append((g, b))
            upts[u['id']] = pts; allpts += pts
        path = DATA / lv / 'texts.json'
        raw = path.read_text(encoding='utf8')
        T = json.loads(raw)
        li = LEVELS.index(lv)
        nn = ng = 0
        for tx in T:
            # tags
            tx['tok'] = [[tag_line(ents, ''.join(e[0] for e in ents)) for ents in para] for para in tx['tok']]
            # glossary
            words = []
            for para in tx['tok']:
                for ents in para:
                    for e in ents:
                        if e[2] and e[2] in vlevel and e[2] not in words and (KANJI.search(e[0]) or not KANJI.search(e[2])):
                            words.append(e[2])
            func = set()
            for para in tx['tok']:
                for ents in para:
                    for e in ents:
                        if e[2] and len(e) > 3 and e[3] in ('aux', 'pt', 'cj'): func.add(e[2])
            ok = lambda w: w not in func and w not in STOP and (KANJI.search(w) or len(w) >= 3 and vinfo[w].get('word') == w and not w.endswith(('ます', 'た', 'て')))
            words = [w for w in words if ok(w)]
            hard = [w for w in words if LEVELS.index(vlevel[w]) > li]
            if len(hard) < 6:
                same = sorted((w for w in words if vlevel[w] == lv and (vinfo[w].get('q') or 0) > 6000),
                              key=lambda w: -(vinfo[w].get('q') or 0))
                hard += same[:6 - len(hard)]
            gloss = {}
            for w in hard[:15]:
                v = vinfo[w]
                gloss[w] = {'py': v.get('p') or v.get('r') or '', **{k: x for k, x in (v.get('m') or {}).items() if k in ('es', 'en')}}
            tx['glossary'] = gloss
            # notes
            tx['notes'] = build_notes(tx, upts.get(tx.get('unit'), []), [p for p in allpts if p not in upts.get(tx.get('unit'), [])])
            nn += len(tx['notes']); ng += len(gloss)
        path.write_text(json.dumps(T, ensure_ascii=False, indent=1 if raw.startswith('[\n') else None, separators=None if raw.startswith('[\n') else (',', ':')), encoding='utf8')
        print(lv, len(T), 'texts ·', ng, 'glossary words ·', nn, 'grammar notes')


if __name__ == '__main__':
    main(sys.argv[1:] or LEVELS)
