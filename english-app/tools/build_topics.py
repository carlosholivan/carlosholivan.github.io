"""Vocabulary by theme (data/topics.json) for the Topics view, organised like the lexical themes
("contenidos léxico-temáticos") of the Escuelas Oficiales de Idiomas curriculum. Words are classified by
keywords matched on the English headword itself (unmatched words stay out).
Each theme is split into nouns / verbs / adjectives / expressions.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
T = lambda en, ja, zh: {'en': en, 'ja': ja, 'zh': zh}
TOPICS = [  # id, badge, name, English keywords (regex fragments)
    ('individuo', '👤', {'es': 'Identificación personal: cuerpo y carácter'}, r'body|head|hair|eye|nose|mouth|ear|hand|arm|leg|foot|finger|tooth|back\b|face|neck|shoulder|knee|skin|tall|short\b|fat|thin|slim|handsome|pretty|ugly|young|old\b|shy|kind\b|polite|rude|lazy|clever|intelligent|stubborn|selfish|generous|honest|brave|patient|character|personality|cheerful|serious|funny\b|nervous|proud|jealous|sensitive'),
    ('relaciones', '❤️', {'es': 'Familia y relaciones humanas'}, r'mother|father|parent|brother|sister|son\b|daughter|grand|uncle|aunt|cousin|nephew|niece|husband|wife|family|friend|boyfriend|girlfriend|partner|couple|married|divorc|wedding|love|baby|child|neighbour|in-law|single\b|relationship|friendship|hug|kiss|marry'),
    ('alimentacion', '🍽️', {'es': 'Alimentación y restauración'}, r'food|eat|drink|meal|breakfast|lunch|dinner|bread|rice|meat|fish|chicken|egg|cheese|ham|fruit|apple|orange\b|banana|vegetable|potato|tomato|onion|salad|soup|sugar|salt|oil|milk|coffee|tea\b|juice|beer|wine|water|cake|dessert|sweet|cook|recipe|fry|boil|bake|kitchen|restaurant|waiter|menu|plate|glass\b|cup|spoon|fork|knife|delicious|spicy|tasty|hungry|thirsty'),
    ('educacion', '🎓', {'es': 'Educación y actividad académica'}, r'school|university|student|pupil|teacher|class\b|lesson|exam|study|learn|homework|subject|course|degree|grade|mark\b|notebook|pencil|pen\b|book\b|library|dictionary|test\b|teach|scholarship|graduate'),
    ('trabajo', '💼', {'es': 'Trabajo y ocupaciones'}, r'work|job|office|boss|company|employee|salary|contract|meeting|interview|career|profession|doctor|lawyer|engineer|nurse|police|firefighter|journalist|secretary|retire|unemploy|colleague|business'),
    ('ocio', '⚽', {'es': 'Tiempo libre, ocio y deporte'}, r'sport|football|tennis|basketball|swim|run\b|ski|game|play\b|hobby|party|cinema|film|music|song|sing|dance|concert|theatre|museum|holiday|weekend|walk|beach|camp|hiking|chess|fun|team|match|player|ball'),
    ('medios', '📰', {'es': 'Lengua, comunicación y medios'}, r'news|newspaper|magazine|television|tv|radio|internet|website|email|mail|message|phone|mobile|call\b|letter|social media|advert|press|journalist|media'),
    ('vivienda', '🏠', {'es': 'Vivienda, hogar y entorno'}, r'house|home|flat|apartment|room|kitchen|bathroom|bedroom|living room|garden|door|window|wall|floor|roof|stairs|lift|furniture|table|chair|bed|sofa|wardrobe|fridge|rent|neighbour|key\b|balcony|terrace|garage'),
    ('servicios', '🏛️', {'es': 'Bienes y servicios'}, r'bank|post office|stamp|form\b|document|passport|appointment|procedure|certificate|police station|town hall|insurance|complaint|card\b'),
    ('compras', '🛍️', {'es': 'Compras, ropa y actividades comerciales'}, r'shop|buy|sell|price|cheap|expensive|money|pay|cash|discount|sale|size|clothes|shirt|trousers|skirt|dress|shoe|coat|jacket|hat|bag|market|supermarket|customer|receipt'),
    ('salud', '🩺', {'es': 'Salud y cuidados físicos'}, r'health|ill|sick|disease|pain|hurt|fever|cough|cold\b|flu|medicine|pill|hospital|doctor|nurse|dentist|chemist|pharmacy|injur|wound|blood|heart|ambulance|healthy|tired'),
    ('viajes', '✈️', {'es': 'Viajes, alojamiento y transporte'}, r'travel|trip|journey|tourist|hotel|luggage|suitcase|ticket|flight|plane|airport|train|station|bus\b|car\b|taxi|bicycle|bike|boat|ship|road|street|traffic|drive|map|platform|passport|visa|stop\b|motorway'),
    ('economia', '💶', {'es': 'Economía y empresa'}, r'econom|money|tax|bank|price|market|trade|invest|debt|loan|profit|budget|inflation|industry|company|business|finance|share\b|stock'),
    ('ciencia', '🔬', {'es': 'Ciencia y tecnología'}, r'science|scien|technolog|computer|machine|research|experiment|laboratory|data|device|robot|energy|internet|app\b|screen|digital|invent|discover'),
    ('politica', '⚖️', {'es': 'Política, ley y sociedad'}, r'politic|government|president|minister|election|vote|law|court|judge|crime|police|right\b|rights|society|citizen|war|peace|army|protest|immigra|equality|freedom|democra|parliament|party \(politic'),
    ('arte', '🎨', {'es': 'Arte, cultura y entretenimiento'}, r'art\b|artist|paint|draw|music|novel|poem|poet|writer|literature|theatre|actor|actress|film|culture|museum|sculpt|song|guitar|piano'),
    ('religion', '🕊️', {'es': 'Religión, valores y filosofía'}, r'relig|god|church|pray|faith|belief|believe|soul|spirit|moral|ethic|philosoph|temple|holy'),
    ('naturaleza', '🌿', {'es': 'Clima, naturaleza y medio ambiente'}, r'nature|weather|rain|snow|wind|sun\b|cloud|storm|hot\b|cold\b|season|spring|summer|autumn|winter|sea\b|river|lake|mountain|forest|tree|flower|animal|dog|cat\b|bird|fish|horse|cow|island|desert|beach|coast|environment|pollution|climate|planet|earth'),
    ('tiempo', '🕒', {'es': 'Tiempo, números y cantidades'}, r'^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a hundred|a thousand)\b|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may\b|june|july|august|september|october|november|december|today|tomorrow|yesterday|week|month|year|hour|minute|morning|afternoon|evening|night|o.clock|always|never|often|early|late\b|soon|now\b'),
    ('general', '💬', {'es': 'Conectores y expresiones'}, r'^(and|but|or|because|although|however|therefore|so\b|if\b|when\b|while|since|in fact|on the other hand|for example|in short|above all|anyway)'),
]
SUBS = [('n', {'es': 'Sustantivos'}), ('v', {'es': 'Verbos'}), ('a', {'es': 'Adjetivos y adverbios'}), ('x', {'es': 'Expresiones'})]
RX = {tid: re.compile(r'(?:' + kw + r')(?:s|es|ed|ing|er|ers)?', re.I) for tid, _, _, kw in TOPICS}
# Conjugated forms and grammar chunks of the lessons (hablaré, hayas visto, es posible que…) are not themes.
INFLECTED = re.compile(r"^(\(?that\)?|i |you |he |she |we |they |it's |let's )|form\b|!|\(t[uú]\)", re.I)


def kind(v):
    w, pos = v['word'], v.get('pos', '')
    if ' ' in w.strip():
        return 'x'
    first = pos.split('/')[0]
    return {'noun': 'n', 'verb': 'v', 'adjective': 'a', 'adverb': 'a'}.get(first, 'n' if 'noun' in pos else 'a')


cats = {tid: {s: [] for s, _ in SUBS} for tid, *_ in TOPICS}
seen = set()
for lv in LEVELS:
    p = ROOT / 'data' / lv / 'vocab.json'
    if not p.exists():
        continue
    for v in sorted(json.loads(p.read_text(encoding='utf-8')), key=lambda v: v.get('q', 0)):
        tid = v.get('t')
        if not tid:
            if v.get('pos', '').split('/')[0] in ('determiner', 'pronoun', 'preposition', 'conjunction', 'be-verb', 'do-verb', 'have-verb', 'modal auxiliary', 'infinitive-to'):
                continue
            tid = next((t for t, *_ in TOPICS if RX[t].fullmatch(v['word'])), None)
        if tid in cats and v['word'].lower() not in seen:
            seen.add(v['word'].lower())
            cats[tid][kind(v)].append(f"{lv}|{v['word']}")

out = []
for tid, badge, name, _ in TOPICS:
    subs = [{'id': s, **sname, 'w': cats[tid][s]} for s, sname in SUBS if cats[tid][s]]
    if subs:
        out.append({'id': tid, 'b': badge, **name, 'subs': subs})
(ROOT / 'data' / 'topics.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print({c['id']: sum(len(s['w']) for s in c['subs']) for c in out})
