"""Builds data/syllables.json: every Mandarin syllable with its 4 tones (+ neutral when it exists), each with a
common character that has ONLY that reading, so TTS of the character = the syllable in that tone.
Needs pypinyin + jieba (char frequency). Run: python tools/build_syllables.py"""
import json, re, collections
from pathlib import Path
from pypinyin.pinyin_dict import pinyin_dict
import jieba

ROOT = Path(__file__).resolve().parent.parent
MARK = {'ā': ('a', 1), 'á': ('a', 2), 'ǎ': ('a', 3), 'à': ('a', 4), 'ē': ('e', 1), 'é': ('e', 2), 'ě': ('e', 3), 'è': ('e', 4),
        'ī': ('i', 1), 'í': ('i', 2), 'ǐ': ('i', 3), 'ì': ('i', 4), 'ō': ('o', 1), 'ó': ('o', 2), 'ǒ': ('o', 3), 'ò': ('o', 4),
        'ū': ('u', 1), 'ú': ('u', 2), 'ǔ': ('u', 3), 'ù': ('u', 4), 'ǖ': ('ü', 1), 'ǘ': ('ü', 2), 'ǚ': ('ü', 3), 'ǜ': ('ü', 4)}
INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w']

def base_tone(s):
    b, t = '', 5
    for ch in s:
        if ch in MARK: b += MARK[ch][0]; t = MARK[ch][1]
        else: b += ch
    return b, t

# char frequency: jieba dictionary (words weighted by frequency) + HSK list order
freq = collections.Counter()
for line in open(Path(jieba.__file__).parent / 'dict.txt', encoding='utf-8'):
    w, f, *_ = line.split()
    for c in w: freq[c] += int(f)
hsk = {}
for n in range(1, 8):
    for i, h in enumerate(json.load(open(ROOT / f'data/hsk{n}/hanzi.json', encoding='utf-8'))): hsk[h['c']] = n * 10000 + i

best = {}  # (base, tone) -> (score, char)
for cp, rd in pinyin_dict.items():
    c = chr(cp)
    if not ('\u4e00' <= c <= '\u9fff'): continue
    reads = rd.split(',')
    s = reads[0]                           # TTS reads a lone polyphone with its main (first) reading
    poly = len(reads) > 1
    if not re.fullmatch(r"[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+", s) or s in ('ê', 'm', 'n', 'ng', 'hm', 'hng'): continue
    key = base_tone(s)
    if base_tone(s)[1] == 5: continue      # neutral tone doesn't exist on an isolated syllable
    if c not in hsk and freq[c] < 20: continue
    # HSK chars first (monophonic preferred), then frequent non-HSK chars
    score = (0 if c in hsk else 1, poly, hsk.get(c, 0), -freq[c])
    if key not in best or score < best[key][0]: best[key] = (score, c, s)

syl = collections.defaultdict(dict)
for (b, t), (_, c, s) in best.items():
    syl[b][t] = {'py': s, 'c': c}
def initial(b):
    for i in INITIALS:
        if b.startswith(i) and b != i: return i
    return ''
out = [{'s': b, 'i': initial(b), 'f': b[len(initial(b)):], 't': {str(k): v for k, v in sorted(syl[b].items())}}
       for b in sorted(syl, key=lambda b: (INITIALS.index(initial(b)) if initial(b) else -1, b))]
(ROOT / 'data/syllables.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(len(out), 'syllables,', sum(len(x['t']) for x in out), 'toned forms')
