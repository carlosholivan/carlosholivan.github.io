"""Adds translated examples to every grammar point of the lesson intros (units.json → grammarIntro es/en).

For each <h3> block (one grammar point) it looks for sentences that use the point:
  1. the unit's grammar exercises (tools/grammar_ex/<level>.json, already translated),
  2. sentences of the level's texts (with their translation), preferring the unit's own texts,
and appends up to 3 of them, with furigana and translation, inside <div class="gex">…</div> (replaced on every run).
Usage: python3 tools/grammar_intro.py [n5 n4 …]
"""
import json, re, sys, html
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from text_extras import alternatives, find_fragment, tag_line, SPECIAL, tagger, LEVELS

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
KANJI = re.compile(r'[㐀-鿿豈-﫿々〆ヶ]')
SPK = re.compile(r'^[^：]{1,8}：')
SPK_T = re.compile(r'^[^:：]{1,24}[:：]\s*')
HEAD = {'es': '📝 Ejemplos', 'en': '📝 Examples'}


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in (s or ''))


def align(surf, rd):
    if not KANJI.search(surf) or not rd:
        return [[surf, None]]
    runs = re.findall(r'[㐀-鿿豈-﫿々〆ヶ]+|[^㐀-鿿豈-﫿々〆ヶ]+', surf)
    pat = ''.join('(.+?)' if KANJI.match(r) else '(' + re.escape(hira(r)) + ')' for r in runs)
    m = re.fullmatch(pat, rd)
    if not m:
        return [[surf, rd]]
    return [[r, m.group(i + 1) if KANJI.match(r) else None] for i, r in enumerate(runs)]


def entries(line):
    out = []
    for w in tagger(line):
        rd = hira(w.feature.kana) if w.feature.kana and w.feature.kana != '*' else ''
        out.append([w.surface, align(w.surface, rd), None])
    return tag_line(out, line)


def ruby_html(ents, frag):
    h = ''.join(''.join(f'<ruby>{html.escape(s)}<rt>{html.escape(r)}</rt></ruby>' if r else html.escape(s) for s, r in e[1]) for e in ents)
    return h


def point_hits(title, lines):
    """Does grammar point (block title head, e.g. '～ようにする') appear in the line?"""
    head = title.split(' — ')[0].strip()
    return find_fragment(head, lines)


def main(levels):
    for lv in levels:
        up = DATA / lv / 'units.json'
        raw = up.read_text(encoding='utf8')
        U = json.loads(raw)
        gx_path = ROOT / 'tools' / 'grammar_ex' / f'{lv}.json'
        GX = json.loads(gx_path.read_text(encoding='utf8')) if gx_path.exists() else {}
        T = json.loads((DATA / lv / 'texts.json').read_text(encoding='utf8'))
        # candidate sentences from texts: (unit, ja, es, en, entries)
        cands = []
        for tx in T:
            tr = tx.get('translation') or {}
            for pi, para in enumerate(tx['paragraphs']):
                ls = para.split('\n')
                es = (tr.get('es') or [''] * 99)[pi].split('\n') if pi < len(tr.get('es') or []) else []
                en = (tr.get('en') or [''] * 99)[pi].split('\n') if pi < len(tr.get('en') or []) else []
                for li, l in enumerate(ls):
                    if li >= len(es) or li >= len(en) or not es[li] or not en[li]:
                        continue
                    ja = SPK.sub('', l)
                    if not (6 <= len(ja) <= 38):
                        continue
                    toks = tx['tok'][pi][li]
                    k = next((i + 1 for i, e in enumerate(toks[:4]) if e[0] == '：'), 0)
                    cands.append((tx.get('unit'), ja, SPK_T.sub('', es[li]), SPK_T.sub('', en[li]), toks[k:]))
        added = 0
        for u in U:
            intro = u.get('grammarIntro')
            if not intro or not intro.get('es'):
                continue
            ex_items = []
            for it in GX.get(str(u['id']), []):
                ja = it['q'].replace('___', it['a'])
                ex_items.append((ja, it['es'], it['en'], entries(ja)))
            new = {}
            blocks_by_lang = {}
            for lang in ('es', 'en'):
                h = re.sub(r'<div class="gex">.*?</div><!--/gex-->', '', intro.get(lang, ''), flags=re.S)
                blocks_by_lang[lang] = re.split(r'(?=<h3>)', h)
            n_blocks = len(blocks_by_lang['es'])
            picks = []
            seen = set()
            for bi in range(n_blocks):
                blk = blocks_by_lang['es'][bi]
                m = re.match(r'<h3>(.*?)</h3>', blk, re.S)
                if not m:
                    picks.append([]); continue
                title = html.unescape(re.sub(r'<[^>]+>', '', m.group(1)))
                chosen = []
                for ja, es, en, ents in ex_items:
                    if len(chosen) >= 2: break
                    if point_hits(title, [(0, ja, ents)]) and ja not in seen:
                        chosen.append((ja, es, en, ents)); seen.add(ja)
                for own in (True, False):
                    for un, ja, es, en, ents in cands:
                        if len(chosen) >= 3: break
                        if (un == u['id']) != own or ja in seen: continue
                        if point_hits(title, [(0, ja, ents)]):
                            chosen.append((ja, es, en, ents)); seen.add(ja)
                picks.append(chosen)
            for lang in ('es', 'en'):
                bl = blocks_by_lang[lang]
                out = []
                for bi, blk in enumerate(bl):
                    ch = picks[bi] if bi < len(picks) else []
                    if ch:
                        # an untranslated tip is redundant once there are translated examples
                        blk = re.sub(r'<div class="tip">💡 ([^<（(=]*)</div>', lambda m: '' if not re.search(r'[A-Za-zÁ-ú]', m.group(1)) else m.group(0), blk)
                        lis = ''.join(f'<li><span class="zh jp" data-s="{html.escape(ja)}">{ruby_html(ents, None)}</span>'
                                      f'<div class="gex-tr">{html.escape(es if lang == "es" else en)}</div></li>' for ja, es, en, ents in ch)
                        blk = blk + f'<div class="gex"><div class="gex-h">{HEAD[lang]}</div><ul>{lis}</ul></div><!--/gex-->'
                        added += len(ch) if lang == 'es' else 0
                    out.append(blk)
                intro[lang] = ''.join(out)
        up.write_text(json.dumps(U, ensure_ascii=False, indent=1 if raw.startswith('[\n') else None), encoding='utf8')
        nb = sum(len(re.findall('<h3>', (u.get('grammarIntro') or {}).get('es', ''))) for u in U)
        nw = sum(len(re.findall(r'<h3>(?:(?!<h3>).)*?<div class="gex">', (u.get('grammarIntro') or {}).get('es', ''), re.S)) for u in U)
        print(lv, 'examples', added, '· points with examples', nw, '/', nb)


if __name__ == '__main__':
    main(sys.argv[1:] or LEVELS)
