"""Story-mode language hook for Japanese: furigana segments for each line (MeCab/UniDic via fugashi),
the same way tools/build_texts.py makes them for the lessons. Used by tools/build_story.py."""
import re
import fugashi

KANJI = re.compile(r'[㐀-鿿豈-﫿々〆ヶ]')
tagger = fugashi.Tagger()

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


def segs(text):
    return furi_line(tokens(text)) if KANJI.search(text) else None
