"""Builds optional practice sets 2–7 for every lesson -> data/<level>/extra.json.

Every exercise is tied to the lesson: it must contain one of the lesson's grammar
markers or new words (nothing is copied from the lesson's own set 1).
  * sentences from the reading texts of this unit, earlier units of the level and
    earlier levels (never later units, so no unseen material leaks in);
  * grammar drills whose sentence/answer uses the lesson's grammar or words;
  * fill-in blanks only on the lesson's own words/markers.
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
    """Blanks one of the lesson's own words/markers and offers same-POS distractors."""
    toks = [w for w in jieba.lcut(s['zh'])]
    cands = [w for w in toks if w in focus]
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
    if it.get('e'):
        ex['hint'] = it['e']
    return ex


def markers(unit, vocab_set):
    """Grammar points -> list of alternatives, each a list of Han pieces that must appear in order."""
    alts = []
    for g in unit.get('grammar') or []:
        g = re.sub(r'[（(][^）)]*[）)]', '', g)
        for alt in re.split(r'[/／]', g):
            pieces = [p for p in (han(x) for x in re.split(r'[…+＋\s.]+|\.\.\.', alt)) if p]
            if pieces:
                alts.append(pieces)
    return alts


def has_alt(zh, alt):
    i = 0
    for p in alt:
        j = zh.find(p, i)
        if j < 0:
            return False
        i = j + len(p)
    return True


def relevance(zh, alts, words):
    # Single-character markers (了, 去, 而...) are everywhere, so they weigh little.
    g = sum(3 if len(''.join(a)) > 1 else 1 for a in alts if has_alt(zh, a))
    w = sum(1 for x in words if x in zh)
    return g + 2 * w


def main():
    jieba.setLogLevel(60)
    cum_vocab, prev_sents = [], []
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
        vocab_set = set(cum_vocab)
        drill_use = {}

        out = {}
        for ui, u in enumerate(units):
            n = ui + 1
            rng = random.Random(f'{lv}-{n}')
            alts = markers(u, vocab_set)
            new_words = [w for w in (u.get('newVocab') or []) if han(w)]
            focus = set(new_words) | {p for a in alts for p in a if len(a) == 1}
            # Candidate sentences: this unit, earlier units of this level, earlier levels.
            cand = [(0, s) for s in sents.get(n, [])]
            cand += [(1, s) for m in range(n - 1, 0, -1) for s in sents.get(m, [])]
            cand += [(2, s) for s in prev_sents]
            seen, scored, fallback = set(), [], []
            for src, s in cand:
                h = han(s['zh'])
                if h in seen:
                    continue
                if h in set1:
                    if src == 0 or relevance(s['zh'], alts, new_words):
                        fallback.append(s)
                    continue
                seen.add(h)
                r = relevance(s['zh'], alts, new_words)
                # The lesson's own texts are always on-topic; other texts only if they use the lesson's grammar/words.
                if r >= 2 or src == 0:
                    scored.append((r, src, rng.random(), s))
            # Most relevant first; own-unit sentences win ties.
            scored.sort(key=lambda x: (-x[0], x[1], x[2]))
            pool = [x[3] for x in scored[:120]]
            local = pool[:]
            rng.shuffle(pool)
            pool.sort(key=lambda s: -min(relevance(s['zh'], alts, new_words), 6))
            def drill_rel(d):
                full = d['sentence'].replace('___', d['blank'])
                return 2 * relevance(d['blank'], alts, new_words) + relevance(full, alts, new_words)
            mine = sorted((d for d in drill_items if relevance(d['blank'], alts, new_words) >= 2),
                          key=lambda d: (drill_use.get(id(d), 0), -drill_rel(d), rng.random()))[:EXTRA_SETS * 2]
            for d in mine:
                drill_use[id(d)] = drill_use.get(id(d), 0) + 1

            # A sentence may reappear in a later set but never twice with the same exercise type,
            # nor twice inside one set.
            used, in_set = set(), set()
            fb_seen = {f['zh'] for f in fallback}
            for e in u['exercises']:
                zh = e.get('answer') if e['type'] in ('translate', 'order') else (
                    e['sentence'].replace('___', e.get('blank', '')) if e['type'] == 'fill' else None)
                tr = e.get('prompt') if e['type'] in ('translate', 'order') else e.get('tr')
                if not zh or not isinstance(tr, dict) or not all(tr.get(l) for l in langs):
                    continue
                used.add((e['type'], zh))
                if zh not in fb_seen and 4 <= len(han(zh)) <= 22:
                    fb_seen.add(zh)
                    fallback.append({'zh': zh, 'tr': {l: tr[l] for l in langs}})
            def take(fn, need):
                got = []
                for s in pool:
                    if len(got) >= need:
                        break
                    if s['zh'] in in_set:
                        continue
                    ex = fn(s)
                    if ex and (ex['type'], s['zh']) not in used:
                        used.add((ex['type'], s['zh']))
                        in_set.add(s['zh'])
                        got.append(ex)
                return got
            meaning = {v['word']: v['m'] for v in vocab}
            match_words = [w for w in new_words if w in meaning]

            sets, words = [], []
            for si in range(EXTRA_SETS):
                ex = []
                in_set.clear()
                if len(match_words) >= 4:
                    k = len(match_words)
                    pick = [match_words[(si * 3 + j) % k] for j in range(min(5, k))]
                    ex.append({'type': 'match', 'pairs': [[w, {l: meaning[w][l] for l in langs}] for w in pick]})
                ex += take(lambda s: choose_ex(s, local, rng), 2)
                ex += take(lambda s: fill_ex(s, focus, by_pos, rng), 2)
                ex += mine[si::EXTRA_SETS][:2]
                ex += take(order_ex, 3)
                ex += take(translate_ex, 1)
                if len(ex) < 6 and fallback:
                    # Thin lessons: reuse set-1 sentences, but as other exercise types (order/choose).
                    pool, saved = fallback, pool
                    ex += take(order_ex, 6 - len(ex))
                    ex += take(lambda s: choose_ex(s, local + fallback, rng), 6 - len(ex))
                    pool = saved
                if len(ex) < 5 and len(match_words) >= 3:
                    # Last resort: meaning -> word, with the lesson's other new words as options.
                    for j in range(5 - len(ex)):
                        w = match_words[(si * 2 + j) % len(match_words)]
                        others = [x for x in match_words if x != w]
                        ex.append({'type': 'choose', 'prompt': {l: meaning[w][l] for l in langs},
                                   'options': [w] + rng.sample(others, 2), 'correct': w})
                # Interleave types so a set doesn't feel like blocks of the same exercise.
                order = {'match': -1, 'choose': 0, 'fill': 1, 'order': 2, 'translate': 3}
                ex.sort(key=lambda e: (order[e['type']], rng.random()))
                sets.append(ex)
                # Words shown in each set: rotating subsets of the lesson's own new words.
                rot = new_words[si % max(1, len(new_words)):] + new_words[:si % max(1, len(new_words))]
                words.append(rot[:6])
            out[str(n)] = {'sets': sets, 'words': words}
        prev_sents += [s for m in sorted(sents) for s in sents[m]]
        (DATA / lv / 'extra.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
        sizes = [len(s) for v in out.values() for s in v['sets']]
        print(lv, 'units', len(out), 'exercises/set min', min(sizes), 'avg', round(sum(sizes) / len(sizes), 1), 'total', sum(sizes))


if __name__ == '__main__':
    main()
