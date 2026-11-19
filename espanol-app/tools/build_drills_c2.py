"""data/c2/drills.json from tools/texts_c2/drills.json:
[[id, icon, title, desc, [[q, options (right first), right index, tr_en, tr_zh, tr_ja, why_en, why_zh, why_ja], …]], …]"""
import json, random
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
out = []
for cid, icon, title, desc, items in json.loads((ROOT / 'tools' / 'texts_c2' / 'drills.json').read_text(encoding='utf8')):
    its = []
    for q, o, a, en, zh, ja, een, ezh, eja in items:
        opts = o[:]; ans = opts[a]; random.Random(q).shuffle(opts)
        its.append({'q': q, 'o': opts, 'a': opts.index(ans), 'tr': {'en': en, 'zh': zh, 'ja': ja}, 'e': {'en': een, 'zh': ezh, 'ja': eja}})
    out.append({'id': cid, 'icon': icon, 'title': title, 'desc': desc, 'items': its})
(ROOT / 'data' / 'c2' / 'drills.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf8')
print(len(out), sum(len(c['items']) for c in out))
