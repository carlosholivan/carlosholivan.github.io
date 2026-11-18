"""Look-alike characters for the card backs → data/similar.json {char: [similar chars]}.

Every character of the app (all levels' hanzi.json) is drawn with Noto Sans CJK, blurred and compared with all the
others (cosine similarity of the bitmaps); the closest ones above a threshold are kept, plus a curated list of
classic confusions. Usage: python3 tools/build_similar.py   (needs Pillow, numpy and the Noto CJK fonts)
"""
import json, glob
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
JA = ROOT.name.startswith('nihongo')
FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 56, index=0 if JA else 2)
CURATED = ['己已巳', '未末', '土士', '人入八', '天夫', '刀力', '千干于', '午牛', '大太犬', '王玉主', '白百自目', '日曰目',
           '右石', '失矢', '鳥烏島', '鸟乌岛', '免兔', '戊戌戍', '侯候', '析折', '拔拨', '辨辩辫', '贝见页', '买卖',
           '即既', '衷哀衰', '綱網鋼', '撤徹', '拾捨', '幣弊', '識織職', '績積責', '輸輪', '栽裁載', '貧貪', '壊懐', '券巻',
           '冶治', '抜扱', '崇祟', '微徴', '持待特侍', '問間聞', '问间闻', '晴清情請精', '睛晴', '体休', '入人', '小少',
           '末朱未', '准淮', '洒酒', '账帐', '历厉', '复夏', '鬼魂', '思恩', '使便', '住往注', '找我', '午年']
THRESH, MAX = 0.86, 4

chars = sorted({h['c'] for f in glob.glob(str(ROOT / 'data' / '*' / 'hanzi.json')) for h in json.load(open(f, encoding='utf8'))})
pos = {c: i for i, c in enumerate(chars)}


def vec(c):
    im = Image.new('L', (64, 64), 0)
    ImageDraw.Draw(im).text((4, -6), c, fill=255, font=FONT)
    im = im.filter(ImageFilter.GaussianBlur(1.6)).resize((32, 32))
    v = np.asarray(im, dtype=np.float32).ravel()
    v -= v.mean()
    return v / (np.linalg.norm(v) or 1)


M = np.stack([vec(c) for c in chars])
S = M @ M.T
np.fill_diagonal(S, 0)
out = {}
for i, c in enumerate(chars):
    order = np.argsort(-S[i])[:MAX]
    out[c] = [chars[j] for j in order if S[i, j] >= THRESH]
for grp in CURATED:
    g = [c for c in grp if c in pos]
    for c in g:
        out[c] = list(dict.fromkeys([x for x in g if x != c] + out.get(c, [])))[:6]
out = {c: v for c, v in out.items() if v}
(ROOT / 'data' / 'similar.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
print(len(chars), 'characters,', len(out), 'with look-alikes')
