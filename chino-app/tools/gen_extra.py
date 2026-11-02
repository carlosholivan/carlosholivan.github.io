"""Builds optional practice sets 2–7 for every lesson -> data/<level>/extra.json.

Sources (nothing is copied from the lesson's own set 1):
  * sentences of the reading texts linked to the unit (line-aligned es/en translations),
    falling back to neighbouring units of the same level when a unit has few lines;
  * the level's grammar drills, spread across units;
  * the rest of the unit's vocabulary band, a different slice per set.
Deterministic (seeded), so sets don't change between runs.

Usage: /tmp/ttsvenv/bin/python tools/gen_extra.py
"""
import json, random, re
from pathlib import Path

import jieba
import jieba.posseg as pseg
from pypinyin import pinyin, Style

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
LEVELS = [f'hsk{i}' for i in range(1, 8)]
EXTRA_SETS = 6
HAN = re.compile(r'[\u3400-\u9fff]')
END = '。！？!?'
PUNCT = '，。！？、；：,.!?;:“”‘’""《》（）()…—'
SPEAKER = re.compile(r'^[^：:]{1,8}[：:]\s*')
SPEAKER_TR = re.compile(r'^[^:：]{1,30}[:：]\s*')

han = lambda s: ''.join(HAN.findall(s))
langs = ('es', 'en')


def split_sents(zh, trs):
    """Splits a line into sentences only when zh and every translation agree on the count."""
    zs = [s for s in re.findall(r'[^。！？!?]+[。！？!?]*', zh) if han(s)]
    ts = {l: [s.strip() for s in re.findall(r'[^.!?¡¿]*[^.!?]*[.!?]+["»”]?|[^.!?]+$', trs[l]) if s.strip()] for l in langs}
    if len(zs) > 1 and all(len(ts[l]) == len(zs) for l in langs):
        return [(zs[i].strip(), {l: ts[l][i] for l in langs}) for i in range(len(zs))]
    return [(zh, trs)]


def text_sentences(t):
    out = []
    for i, para in enumerate(t['paragraphs']):
        zl = para.split('\n')
        tl = {l: t['translation'][l][i].split('\n') for l in langs}
        for j, z in enumerate(zl):
            z0, trs = SPEAKER.sub('', z).strip(), {l: SPEAKER_TR.sub('', tl[l][j]).strip() for l in langs}
            if not han(z0) or not all(trs.values()):
                continue
            for zs, ts in split_sents(z0, trs):
                zs = zs.strip().strip('“”"')
                if 4 <= len(han(zs)) <= 22 and not re.search(r'[“”"《》（）()]', zs):
                    out.append({'zh': zs, 'tr': ts})
    return out


PY_PUNCT = str.maketrans({'，': ',', '。': '.', '！': '!', '？': '?', '、': ',', '；': ';', '：': ':', '…': '…'})


def py_of(zh):
    words = []
    for p in pseg.lcut(zh):
        w = p.word
        if HAN.search(w):
            syl = ''.join(x[0] for x in pinyin(w, style=Style.TONE))
            words.append(syl[:1].upper() + syl[1:] if p.flag in ('nr', 'ns', 'nz', 'nrt') else syl)
        elif w.strip() and words:
            words[-1] += w.translate(PY_PUNCT)
        elif w.strip():
            words.append(w)
    s = ' '.join(words)
    return s[:1].upper() + s[1:]


def tokens_of(zh):
    toks = []
    for w in jieba.lcut(zh):
        if not w.strip():
            continue
        if all(c in PUNCT for c in w) and toks:
            toks[-1] += w
        else:
            toks.append(w)
    return toks


def order_ex(s):
    toks = tokens_of(s['zh'])
    words = [re.sub(f'[{re.escape(PUNCT)}]+$', '', t) for t in toks]
    if not (3 <= len(words) <= 8) or len(set(words)) < len(words) or not all(han(w) for w in words):
        return None
    return {'type': 'order', 'prompt': s['tr'], 'words': words, 'answer': s['zh'], 'py': py_of(s['zh'])}


def fill_ex(s, focus, by_pos, rng):
    """Blanks one word from the unit's vocabulary (or any content word) and offers same-POS distractors."""
    toks = [w for w in jieba.lcut(s['zh'])]
    cands = [w for w in toks if w in focus] or [w for w in toks if len(han(w)) == len(w) and len(w) <= 3 and w in by_pos['_all']]
    rng.shuffle(cands)
    for w in cands:
        if s['zh'].count(w) != 1:
            continue
        # Distractors come from other parts of speech so that only the right word is grammatical.
        pos = by_pos['_pos'].get(w, 'x')
        groups = [g for g in ('n', 'v', 'a', 'd', 'p', 'r', 'm', 'q', 'c', 'u') if g != pos]
        rng.shuffle(groups)
        opts = [w]
        for g in groups:
            cand = [x for x in by_pos.get(g, []) if len(x) == len(w) and x not in s['zh']]
            if cand:
                opts.append(rng.choice(cand))
            if len(opts) == 4:
                break
        if len(opts) < 4:
            continue
        return {'type': 'fill', 'sentence': s['zh'].replace(w, '___', 1), 'blank': w, 'options': opts,
                'py': py_of(s['zh']), 'tr': s['tr']}
    return None


def choose_ex(s, others, rng):
    """Shows the translation; pick the Chinese sentence that says it."""
    pool = [o['zh'] for o in others if o['zh'] != s['zh'] and abs(len(o['zh']) - len(s['zh'])) <= 6]
    if len(pool) < 2:
        return None
    return {'type': 'choose', 'prompt': s['tr'], 'options': [s['zh']] + rng.sample(pool, 2), 'correct': s['zh']}


def translate_ex(s):
    if len(han(s['zh'])) > 9:
        return None
    return {'type': 'translate', 'prompt': s['tr'], 'answer': s['zh'], 'py': py_of(s['zh']), 'accept': []}


def drill_ex(it):
    if it['q'].count('___') != 1:
        return None
    tr = {l: it['tr'][l] for l in langs if it.get('tr', {}).get(l)}
    if len(tr) < 2:
        return None
    ex = {'type': 'fill', 'sentence': it['q'], 'blank': it['o'][it['a']], 'options': list(it['o']), 'py': it.get('py', ''), 'tr': tr}
    if it.get('ex'):
        ex['hint'] = it['ex']
    return ex


def main():
    jieba.setLogLevel(60)
    cum_vocab = []
    for lv in LEVELS:
        units = json.loads((DATA / lv / 'units.json').read_text())
        vocab = json.loads((DATA / lv / 'vocab.json').read_text())
        cum_vocab += [v['word'] for v in vocab]
        texts = json.loads((DATA / lv / 'texts.json').read_text())
        drills = json.loads((DATA / lv / 'drills.json').read_text())

        by_pos = {'_all': [w for w in cum_vocab if han(w) == w], '_pos': {}}
        for w in by_pos['_all']:
            p = next(iter(pseg.lcut(w)), None)
            f = (p.flag[:1] if p else 'x')
            by_pos['_pos'][w] = f
            by_pos.setdefault(f, []).append(w)

        set1 = set()
        for u in units:
            for e in u['exercises']:
                for k in ('answer', 'correct', 'sentence'):
                    if isinstance(e.get(k), str):
                        set1.add(han(e[k].replace('___', e.get('blank', ''))))

        sents = {}
        for t in texts:
            sents.setdefault(t['unit'], []).extend(text_sentences(t))

        drill_items = [d for c in drills for d in (drill_ex(i) for i in c['items']) if d and han(d['sentence'].replace('___', d['blank'])) not in set1]
        random.Random(lv).shuffle(drill_items)

        out = {}
        for ui, u in enumerate(units):
            n = ui + 1
            rng = random.Random(f'{lv}-{n}')
            own = list(sents.get(n, []))
            # Borrow from neighbours (earlier units first) until there is enough material.
            k = 1
            while len(own) < 60 and k < len(units):
                for m in (n - k, n + k):
                    own += sents.get(m, [])
                k += 1
            seen, pool = set(), []
            for s in own:
                h = han(s['zh'])
                if h in set1 or h in seen:
                    continue
                seen.add(h)
                pool.append(s)
            local = pool[:]
            rng.shuffle(pool)
            focus = set(u.get('vocab') or []) | set(u.get('newVocab') or [])
            mine = drill_items[ui::len(units)]

            used = set()
            def take(fn, need):
                got = []
                for s in pool:
                    if len(got) >= need:
                        break
                    if s['zh'] in used:
                        continue
                    ex = fn(s)
                    if ex:
                        used.add(s['zh'])
                        got.append(ex)
                return got

            new_words = [w for w in (u.get('newVocab') or [])]
            band = [w for w in (u.get('vocab') or []) if w not in new_words]
            rng.shuffle(band)
            sets, words = [], []
            for si in range(EXTRA_SETS):
                ex = []
                ex += take(lambda s: choose_ex(s, local, rng), 2)
                ex += take(lambda s: fill_ex(s, focus, by_pos, rng), 2)
                ex += mine[si::EXTRA_SETS][:2]
                ex += take(order_ex, 3)
                ex += take(translate_ex, 1)
                # Interleave types so a set doesn't feel like blocks of the same exercise.
                order = {'choose': 0, 'fill': 1, 'order': 2, 'translate': 3}
                ex.sort(key=lambda e: (order[e['type']], rng.random()))
                sets.append(ex)
                chunk = band[si * 6:(si + 1) * 6]
                if len(chunk) < 4:
                    extra = [w for w in new_words + band if w not in chunk]
                    random.Random(f'{lv}-{n}-{si}').shuffle(extra)
                    chunk += extra[:6 - len(chunk)]
                words.append(chunk)
            out[str(n)] = {'sets': sets, 'words': words}
        (DATA / lv / 'extra.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
        sizes = [len(s) for v in out.values() for s in v['sets']]
        print(lv, 'units', len(out), 'exercises/set min', min(sizes), 'avg', round(sum(sizes) / len(sizes), 1), 'total', sum(sizes))


if __name__ == '__main__':
    main()
