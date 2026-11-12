"""Builds the Japanese vocabulary and kanji data -> data/<level>/vocab.json, data/<level>/hanzi.json,
data/kanji-extra.json, data/strokes/<kanji>.json.

Sources (downloaded into REF, see README in tools/):
  * legacy_data.json        – the vocabulary of the old single-file Nihongo app (Waller JLPT lists)
  * jmdict-all-*.json       – JMdict (jmdict-simplified), Spanish/English glosses
  * jmdict-examples-eng-*   – Tatoeba example sentences attached to JMdict senses
  * kanjidic2-all-*.json    – KANJIDIC2: readings, Spanish/English meanings, strokes, radical
  * kanji.json              – davidluzgouveia/kanji-data: JLPT level (Tanos, 'jlpt_new')
  * kradfile-*.json         – kanji components
  * hwjp/data/*.json        – hanzi-writer-data-jp stroke data (KanjiVG based)
  * ja_50k.txt              – hermitdave/FrequencyWords (OpenSubtitles 2016) frequency ranks

Usage: python3 tools/build_ja.py <REF dir>
"""
import json, re, sys, glob, shutil, unicodedata
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from clean_es import clean_es

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
REF = Path(sys.argv[1])
LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']
LOOKS_EN = re.compile(r"^(to |a |an |the )|\b(the|of|something|someone|one's|thing|be|is|are)\b", re.I)
KANJI = re.compile(r'[㐀-鿿豈-﫿々]')
KATA = re.compile(r'^[゠-ヿー]+$')

legacy = json.load(open(ROOT / 'tools' / 'legacy_data.json', encoding='utf8'))
ES_MANUAL = json.load(open(ROOT / 'tools' / 'es_manual.json', encoding='utf8'))  # hand translations where JMdict has no Spanish
jm = json.load(open(glob.glob(str(REF / 'jmdict-all-*.json'))[0], encoding='utf8'))['words']
kd = json.load(open(glob.glob(str(REF / 'kanjidic2-all-*.json'))[0], encoding='utf8'))['characters']
kref = json.load(open(REF / 'kanji.json', encoding='utf8'))
krad = json.load(open(glob.glob(str(REF / 'kradfile-*.json'))[0], encoding='utf8'))['kanji']
freq = {}
for i, line in enumerate(open(REF / 'ja_50k.txt', encoding='utf8')):
    w = line.split(' ')[0]
    freq.setdefault(w, i + 1)

# ── helpers ──────────────────────────────────────────────────────────
def kata2hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

def clean_form(s):
    """'～日' → '日', 'そう; そうです' → 'そう', 'スーパー(マーケット)' → 'スーパー'."""
    s = re.sub(r'\s+', '', s).replace('～', '').replace('〜', '').replace('~', '')
    s = re.split(r'[;；,]', s)[0]
    s = re.sub(r'\(.*?\)|（.*?）', '', s)
    return s or None

def all_forms(s):
    s = re.sub(r'\s+', '', s).replace('～', '').replace('〜', '').replace('~', '')
    s = re.sub(r'\(.*?\)|（.*?）', '', s)
    return [x for x in re.split(r'[;；]', s) if x]

# JMdict index: (kanji|kana form, kana) → entries
jm_by_form = {}
for e in jm:
    kanj = [k['text'] for k in e['kanji']]
    kana = [k['text'] for k in e['kana']]
    for f in kanj + kana:
        jm_by_form.setdefault(f, []).append(e)

STOP = set('to a an the of in on at for be with by as or (n) (v)'.split())
def words_of(s):
    return {w for w in re.findall(r'[a-z]+', (s or '').lower()) if w not in STOP and len(w) > 2}

def gloss(e, lang):
    out = []
    for s in e['sense']:
        g = [x['text'] for x in s['gloss'] if x['lang'] == lang]
        if g:
            out.append(g)
    return out

def pick_entry(forms, reading, en_hint):
    reading_h = kata2hira(reading or '')
    cands = []
    for f in forms:
        for e in jm_by_form.get(f, []):
            if e not in cands:
                cands.append(e)
    if not cands:
        return None
    hint = words_of(en_hint)
    def score(e):
        kana = {kata2hira(k['text']) for k in e['kana']}
        sc = 0
        if reading_h and reading_h in kana: sc += 10
        if any(k['text'] in forms for k in e['kanji']): sc += 3
        eng = ' '.join(' '.join(g) for g in gloss(e, 'eng')[:3])
        sc += 2 * len(hint & words_of(eng))
        if any(k.get('common') for k in e['kana'] + e['kanji']): sc += 1
        if gloss(e, 'spa'): sc += 1
        return sc
    return max(cands, key=score)

def spa_meaning(e, max_senses=2, max_per=3):
    senses = gloss(e, 'spa')
    if not senses:
        return None
    parts = []
    for g in senses[:max_senses]:
        uniq = []
        for x in g:
            x = x.strip()
            if x and x.lower() not in [u.lower() for u in uniq]:
                uniq.append(x)
        parts.append(', '.join(uniq[:max_per]))
    return '; '.join(parts)

def rank(word, reading):
    forms = all_forms(word) + [kata2hira(reading or '')]
    rs = [freq[f] for f in forms if f in freq]
    return min(rs) if rs else 99999

# ── vocabulary ───────────────────────────────────────────────────────
seen = {}
vocab = {}
stats = {}
for L in ['N5', 'N4', 'N3', 'N2', 'N1']:
    lv = L.lower()
    out = []
    n_es_src = {'legacy': 0, 'jmdict': 0, 'en': 0}
    rows = []
    for v in legacy['vocab'][L]:
        ws, rs = v['w'].split('、'), v['r'].split('、')
        if len(ws) > 1 and len(ws) == len(rs):
            rows += [{**v, 'w': a.strip(), 'r': b.strip()} for a, b in zip(ws, rs)]
        else:
            rows.append(v)
    for v in rows:
        w0 = clean_form(v['w'])
        r0 = clean_form(v['r']) or w0
        if not w0:
            continue
        # readings stored as kanji in a few rows (e.g. うそ / 嘘): swap so w has the kanji
        if KANJI.search(r0) and not KANJI.search(w0):
            w0, r0 = r0, w0
        # One entry per written form (cards are keyed by it): a second reading is merged into the first entry.
        if w0 in seen:
            first = seen[w0]
            r2 = kata2hira(r0)
            if r2 != first['r'] and r2 not in first.get('alt', []):
                first.setdefault('alt', []).append(r2)
                es2 = v['m'].get('es') or ''
                if es2 and es2 not in first['m']['es'] and not LOOKS_EN.search(es2):
                    first['m']['es'] += f' / {es2} ({r2})'
            continue
        en = v['m'].get('en', '')
        e = pick_entry(all_forms(v['w']) + ([r0] if not KANJI.search(w0) else []), r0, en)
        es = v['m'].get('es')
        if es and (es.strip().lower() == en.strip().lower() or LOOKS_EN.search(es) or 'eng:' in es):
            es = None
        if es:
            n_es_src['legacy'] += 1
        else:
            es = spa_meaning(e) if e else None
            if not es and w0 in ES_MANUAL: es = ES_MANUAL[w0]
            if es: n_es_src['jmdict'] += 1
            else: n_es_src['en'] += 1
        item = {
            'word': w0, 'w': w0, 'r': kata2hira(r0) if not KATA.match(w0) else r0, 'p': '',
            'm': {'es': clean_es(es, en) or en, 'en': en}, 'q': rank(v['w'], r0),
        }
        if not es:
            item['m']['es_missing'] = True
        if e:
            item['jm'] = e['id']
        # kana-only words have no furigana; p is the reading shown under the word
        item['p'] = item['r'] if KANJI.search(w0) else ''
        out.append(item)
        seen[w0] = item
    vocab[lv] = out
    stats[L] = (len(out), n_es_src)

# Fixes for wrong rows of the old list: written form → (reading or None, Spanish meaning).
FIX = {'中': ('なか', 'dentro, en medio; durante (じゅう・ちゅう)'), '一月': ('ひとつき', 'un mes'), '夜': (None, 'noche'),
       '低い': (None, 'bajo'), '風邪': (None, 'resfriado, catarro'), '答える': (None, 'responder, contestar'), '年': ('とし', 'año; edad'),
       '辺': (None, 'zona, alrededores'), '黒': (None, 'negro (color)'), '白': (None, 'blanco (color)'), '赤': (None, 'rojo (color)'),
       '青': (None, 'azul (color)'), '外': ('そと', 'fuera; exterior'),
       'ぶどう': (None, 'uva'), 'おる': (None, 'estar (humilde)'), '焼ける': (None, 'asarse, quemarse'), '伝える': (None, 'transmitir, comunicar'),
       '包む': (None, 'envolver'), '通う': (None, 'ir con regularidad (a la escuela, al trabajo)'), 'あ': (None, '¡ah!'), 'おき': (None, 'cada (intervalo): 一日おき'),
       'だす': (None, 'sacar; enviar'), '為': (None, 'para, por el bien de; a causa de'), '光': (None, 'luz'), '字': (None, 'letra, carácter'),
       '釣る': (None, 'pescar (con caña)'), 'どんどん': (None, 'rápidamente, uno tras otro'), '一生懸命': (None, 'con todas las fuerzas'),
       'すっと': (None, 'de golpe; con alivio'), '拾う': (None, 'recoger (del suelo)'), '怖い': (None, 'que da miedo, terrible'), '交通': (None, 'tráfico, transporte'),
       '汚れる': (None, 'ensuciarse'), '落す': (None, 'dejar caer; perder'), '皆': (None, 'todos'), '下る': (None, 'bajar, descender'),
       '合う': (None, 'coincidir; quedar bien'), '機会': (None, 'oportunidad'), '今度': (None, 'esta vez; la próxima vez'), '点': (None, 'punto; nota'),
       '気': (None, 'ánimo, espíritu; atención'), '適当': (None, 'adecuado; a la ligera'), '程': (None, 'grado; (más o menos) tanto como'),
       'やはり': (None, 'como era de esperar; después de todo'), '代': (None, 'tarifa; generación; década'), '表': (None, 'cara, anverso; tabla'),
       '通り': (None, 'calle, avenida'), '割合': (None, 'proporción; relativamente'), '用': (None, 'asunto, recado'), '熱心': (None, 'entusiasta, aplicado'),
       '急行': (None, 'tren rápido'), '込む': (None, 'estar lleno, abarrotado'), '空く': (None, 'quedar libre, vaciarse'), '大体': (None, 'más o menos, en general'),
       '堅': (None, 'duro, firme'), '鳴る': (None, 'sonar'), '沸く': (None, 'hervir'), '会': (None, 'reunión, asociación'), '僕': (None, 'yo (masculino)'),
       '表': (None, 'anverso, fachada; tabla'), 'ステレオ': (None, 'estéreo'), 'テキスト': (None, 'libro de texto'), 'パート': (None, 'trabajo a tiempo parcial'),
       'レポート': (None, 'informe, trabajo'), 'ガラス': (None, 'vidrio, cristal'), 'ガス': (None, 'gas'), 'オーバー': (None, 'abrigo; exagerado'),
       'ジャム': (None, 'mermelada'), 'ソフト': (None, 'software; suave'), 'タイプ': (None, 'tipo'), 'スーパー': (None, 'supermercado'),
       'スーツケース': (None, 'maleta'), 'パパ': (None, 'papá'), 'ハンバーグ': (None, 'filete de hamburguesa'), 'ガソリン': (None, 'gasolina'),
       '員': (None, 'miembro, empleado (sufijo)'), '製': (None, 'hecho en, de (material)'), '軒': (None, 'casas (contador)'), '建て': (None, 'de … pisos (sufijo)'),
       '冷房': (None, 'aire acondicionado'), '下宿': (None, 'pensión, alojamiento'), '一杯': (None, 'una copa / un vaso; lleno'), '格好': (None, 'aspecto, pinta'),
       '向かう': (None, 'dirigirse a'), '代わり': (None, 'en lugar de; sustituto'), '先輩': (None, 'compañero veterano'), '承知': (None, 'entender, estar de acuerdo')}

for lv_ in vocab:
    for v in vocab[lv_]:
        if v['w'] in FIX:
            r, es = FIX[v['w']]
            if r and r != v['r']:
                v['alt'] = [x for x in [v['r']] + v.get('alt', []) if x != r]
                v['r'] = v['p'] = r
            v['m']['es'] = es

# ── kanji ────────────────────────────────────────────────────────────
kd_by = {c['literal']: c for c in kd}
RAD = {i + 1: unicodedata.normalize('NFKC', chr(0x2F00 + i)) for i in range(214)}

def kanji_entry(c, lv):
    k = kd_by.get(c)
    ref = kref.get(c, {})
    on, kun, es, en = [], [], [], []
    if k and k.get('readingMeaning'):
        for g in k['readingMeaning']['groups']:
            for r in g['readings']:
                if r['type'] == 'ja_on': on.append(r['value'])
                if r['type'] == 'ja_kun': kun.append(re.sub(r'\.(.+)$', r'(\1)', r['value']))
            for m in g['meanings']:
                if m['lang'] == 'es': es.append(m['value'])
                if m['lang'] == 'en': en.append(m['value'])
    rad = None
    if k:
        cl = [r['value'] for r in k['radicals'] if r['type'] == 'classical']
        if cl: rad = RAD.get(cl[0])
    strokes = (k['misc']['strokeCounts'][0] if k and k['misc']['strokeCounts'] else ref.get('strokes'))
    q = (k['misc'].get('frequency') if k else None) or ref.get('freq') or 9999
    item = {
        'c': c, 'on': on, 'kun': kun,
        'p': '・'.join(on[:3]) + (' / ' if on and kun else '') + '・'.join(kun[:3]),
        'm': {'es': clean_es(', '.join(es[:4]), ', '.join(en[:4])) if es else ', '.join(en[:4]), 'en': ', '.join(en[:4])},
        'rad': rad, 'n': strokes, 'q': q,
        'parts': [x for x in krad.get(c, []) if x != c],
    }
    if not es:
        item['m']['es_missing'] = True
    return item

kanji = {lv: [] for lv in LEVELS}
for c, info in kref.items():
    n = info.get('jlpt_new')
    if n in (1, 2, 3, 4, 5):
        kanji[f'n{n}'].append(kanji_entry(c, f'n{n}'))
for lv in LEVELS:
    kanji[lv].sort(key=lambda x: x['q'])

# Words using each kanji, and kanji that appear in the vocabulary but are not in the JLPT kanji lists.
listed = {k['c'] for lv in LEVELS for k in kanji[lv]}
uses = {}
for lv in LEVELS:
    for v in vocab[lv]:
        for ch in v['w']:
            if KANJI.match(ch):
                uses.setdefault(ch, []).append(v['w'])
extra = [kanji_entry(c, None) for c in sorted(uses) if c not in listed and c in kd_by]
for lv in LEVELS:
    for k in kanji[lv]:
        k['words'] = uses.get(k['c'], [])[:20]
for k in extra:
    k['words'] = uses.get(k['c'], [])[:20]

# Example sentences (Tatoeba via JMdict) for kanji sheets and higher-level exercises.
exf = glob.glob(str(REF / 'jmdict-examples-eng-*.json'))
examples = {}
if exf:
    ex = json.load(open(exf[0], encoding='utf8'))['words']
    by_id = {}
    for e in ex:
        for s in e['sense']:
            for x in s.get('examples', []):
                ja = next((t['text'] for t in x.get('sentences', []) if t.get('lang') == 'jpn'), None)
                eng = next((t['text'] for t in x.get('sentences', []) if t.get('lang') == 'eng'), None)
                if ja and eng:
                    by_id.setdefault(e['id'], []).append({'ja': ja, 'en': eng, 'w': x.get('text')})
    for lv in LEVELS:
        for v in vocab[lv]:
            if v.get('jm') in by_id:
                examples[v['w']] = by_id[v['jm']][:2]

# ── write ────────────────────────────────────────────────────────────
for lv in LEVELS:
    (DATA / lv).mkdir(parents=True, exist_ok=True)
    json.dump(vocab[lv], open(DATA / lv / 'vocab.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(kanji[lv], open(DATA / lv / 'hanzi.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(extra, open(DATA / 'kanji-extra.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(examples, open(DATA / 'examples.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

sd = DATA / 'strokes'
sd.mkdir(exist_ok=True)
need = listed | {k['c'] for k in extra}
copied = 0
for c in need:
    src = REF / 'hwjp' / 'data' / f'{c}.json'
    if src.exists():
        shutil.copy(src, sd / f'{c}.json'); copied += 1
for lic in [x for x in (REF / "hwjp" / "licenses").rglob("*") if x.is_file()]:
    shutil.copy(lic, sd / lic.name)

for L, (n, src) in stats.items():
    print(L, n, 'words; es from', src)
print('kanji', {lv: len(kanji[lv]) for lv in LEVELS}, 'extra', len(extra), 'strokes', copied, '/', len(need))
print('examples for', len(examples), 'words')
