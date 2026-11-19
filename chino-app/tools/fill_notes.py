"""Grammar notes for the texts that have none (data/<level>/texts.json → notes): each grammar point of the text's unit
(then of its level) is searched literally in the text ('A/B' alternatives, 'A…B' discontinuous patterns); the note
takes the fragment and the explanation of the matching block of the unit's grammar intro (es/en/ja/ko).
Single characters (之, 其…) only count when they are not part of a longer vocabulary word there.
Usage: python3 chino-app/tools/fill_notes.py
"""
import json, re, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LV = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6', 'hsk7']
VOC = set()
for lv in LV:
    VOC |= {v['w'] for v in json.load(open(ROOT / 'data' / lv / 'vocab.json', encoding='utf8')) if len(v['w']) > 1}
PUNCT = '，。！？；：、“”‘’（）《》\n「」…—'


def blocks(intro):
    out = []
    for b in re.split(r'<h3>', intro or '')[1:]:
        title, _, rest = b.partition('</h3>')
        p = re.search(r'<p>(.*?)</p>', rest, re.S)
        txt = html.unescape(re.sub(r'<[^>]+>', '', p.group(1))).strip() if p else ''
        out.append((html.unescape(re.sub(r'<[^>]+>', '', title)).strip(), txt))
    return out


def explain(item, intro):
    alts = [a for a in re.split(r'[/／、,，]', item) if a]
    e = {}
    for lang in ('es', 'en', 'ja', 'ko'):
        bl = blocks(intro.get(lang, ''))
        hit = next((b for b in bl if any(a.replace('…', '') in b[0] or a.split('…')[0] in b[0] for a in alts)), None)
        if hit:
            t, p = hit
            p = p if len(p) <= 240 else p[:237].rsplit(' ', 1)[0] + '…'
            e[lang] = f'{t}. {p}'.strip()
    return e


def find(item, paras):
    for alt in sorted([a for a in re.split(r'[/／、,，]', item) if a], key=len, reverse=True):
        alt = alt.strip()
        if len(alt) == 1:
            continue  # single characters (之, 也, 其…) are too ambiguous in modern texts
        if re.search(r'[A-ZＡ-Ｚ]', alt):  # 一A一B, 东A西B: each letter = one character
            rx = re.compile(''.join('[\u4e00-\u9fff]' if re.match(r'[A-ZＡ-Ｚ]', c) else re.escape(c) for c in alt.replace(' ', '') if c not in '…～~'))
            for pi, p in enumerate(paras):
                m = rx.search(p)
                if m:
                    return pi, m.group()
            continue
        parts = [x for x in re.split(r'…+|～|~|\.\.\.', alt) if x.strip()]
        parts = [x.strip() for x in parts]
        if parts and all(len(x) == 1 for x in parts) and '…' in alt:  # 一…一…, 不…不…, 东…西…: one character per slot
            rx = re.compile(''.join('[\u4e00-\u9fff]' if seg.startswith('…') else re.escape(seg) for seg in re.findall(r'…+|[^…]', alt)))
            for pi, p in enumerate(paras):
                m = rx.search(p)
                if m:
                    return pi, m.group()
            continue
        if not parts:
            continue
        for pi, p in enumerate(paras):
            for m in re.finditer(re.escape(parts[0]), p):
                i = m.start()
                L = len(parts[0])
                if any(p[max(0, i - a):i + L + b] in VOC for a in (0, 1, 2) for b in (0, 1, 2) if a + b and p[max(0, i - a):i + L + b] != parts[0]):
                    continue  # inside a longer word (巴不得 ≠ 不得)
                end, ok = m.end(), True
                for part in parts[1:]:
                    j = p.find(part, end)
                    if j < 0 or j - end > 14 or any(c in p[end:j] for c in '。！？\n'):
                        ok = False; break
                    end = j + len(part)
                if not ok:
                    continue
                # extend a little to the right (to the next punctuation, max 6 chars) for context
                k = end
                while k < len(p) and k - end < 4 and p[k] not in PUNCT:
                    k += 1
                return pi, p[i:k]
    return None


for lv in LV:
    path = ROOT / 'data' / lv / 'texts.json'
    raw = path.read_text(encoding='utf8'); T = json.loads(raw)
    units = {u['id']: u for u in json.load(open(ROOT / 'data' / lv / 'units.json', encoding='utf8'))}
    n = added = 0
    for tx in T:
        if tx.get('notes'):
            continue
        u = units.get(tx.get('unit')) or {}
        pool = [(g, u) for g in (u.get('grammar') or [])] + [(g, x) for x in units.values() if x is not u for g in (x.get('grammar') or [])]
        notes = []
        for g, src in pool:
            if len(notes) >= 6 or (src is not u and len(notes) >= 4 and sum(1 for _ in notes) >= 4):
                break
            hit = find(g, tx['paragraphs'])
            if not hit or any(nt['p'] == hit[0] and (nt['f'] in hit[1] or hit[1] in nt['f']) for nt in notes):
                continue
            e = explain(g, src.get('grammarIntro') or {})
            if not e.get('es') and not e.get('en'):
                continue
            notes.append({'p': hit[0], 'f': hit[1], 'k': 'grammar', 'e': e})
        if notes:
            tx['notes'] = notes; n += 1; added += len(notes)
    path.write_text(json.dumps(T, ensure_ascii=False, indent=1 if raw.startswith('[\n') else None), encoding='utf8')
    print(lv, n, 'texts given', added, 'notes')
