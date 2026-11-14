"""Vocabulary by theme (data/topics.json) for the Topics view, organised like the "nociones específicas"
of the Instituto Cervantes curriculum (the reference for the DELE). Words added with a topic (field t)
keep it; the rest are classified by keywords of their English meaning (unmatched words stay out).
Each theme is split into nouns / verbs / adjectives / expressions.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
T = lambda en, ja, zh: {'en': en, 'ja': ja, 'zh': zh}
TOPICS = [  # id, badge, name, English keywords (regex fragments)
    ('individuo', '👤', T('People: body & character', '人：体と性格', '个人：身体与性格'), r'body|head|hair|eye|nose|mouth|ear|hand|arm|leg|foot|finger|tooth|back\b|face|neck|shoulder|knee|skin|tall|short\b|fat|thin|slim|handsome|pretty|ugly|young|old\b|shy|kind\b|polite|rude|lazy|clever|intelligent|stubborn|selfish|generous|honest|brave|patient|character|personality|cheerful|serious|funny\b|nervous|proud|jealous|sensitive'),
    ('relaciones', '❤️', T('Family & relationships', '家族と人間関係', '家庭与人际关系'), r'mother|father|parent|brother|sister|son\b|daughter|grand|uncle|aunt|cousin|nephew|niece|husband|wife|family|friend|boyfriend|girlfriend|partner|couple|married|divorc|wedding|love|baby|child|neighbour|in-law|single\b|relationship|friendship|hug|kiss|marry'),
    ('alimentacion', '🍽️', T('Food & drink', '食べ物と飲み物', '饮食'), r'food|eat|drink|meal|breakfast|lunch|dinner|bread|rice|meat|fish|chicken|egg|cheese|ham|fruit|apple|orange\b|banana|vegetable|potato|tomato|onion|salad|soup|sugar|salt|oil|milk|coffee|tea\b|juice|beer|wine|water|cake|dessert|sweet|cook|recipe|fry|boil|bake|kitchen|restaurant|waiter|menu|plate|glass\b|cup|spoon|fork|knife|delicious|spicy|tasty|hungry|thirsty'),
    ('educacion', '🎓', T('Education', '教育', '教育'), r'school|university|student|pupil|teacher|class\b|lesson|exam|study|learn|homework|subject|course|degree|grade|mark\b|notebook|pencil|pen\b|book\b|library|dictionary|test\b|teach|scholarship|graduate'),
    ('trabajo', '💼', T('Work', '仕事', '工作'), r'work|job|office|boss|company|employee|salary|contract|meeting|interview|career|profession|doctor|lawyer|engineer|nurse|police|firefighter|journalist|secretary|retire|unemploy|colleague|business'),
    ('ocio', '⚽', T('Free time & sport', '余暇とスポーツ', '休闲与运动'), r'sport|football|tennis|basketball|swim|run\b|ski|game|play\b|hobby|party|cinema|film|music|song|sing|dance|concert|theatre|museum|holiday|weekend|walk|beach|camp|hiking|chess|fun|team|match|player|ball'),
    ('medios', '📰', T('Media & communication', 'メディアと通信', '媒体与通讯'), r'news|newspaper|magazine|television|tv|radio|internet|website|email|mail|message|phone|mobile|call\b|letter|social media|advert|press|journalist|media'),
    ('vivienda', '🏠', T('Home', '住まい', '住房'), r'house|home|flat|apartment|room|kitchen|bathroom|bedroom|living room|garden|door|window|wall|floor|roof|stairs|lift|furniture|table|chair|bed|sofa|wardrobe|fridge|rent|neighbour|key\b|balcony|terrace|garage'),
    ('servicios', '🏛️', T('Services & paperwork', 'サービスと手続き', '服务与手续'), r'bank|post office|stamp|form\b|document|passport|appointment|procedure|certificate|police station|town hall|insurance|complaint|card\b'),
    ('compras', '🛍️', T('Shopping & clothes', '買い物と服', '购物与服装'), r'shop|buy|sell|price|cheap|expensive|money|pay|cash|discount|sale|size|clothes|shirt|trousers|skirt|dress|shoe|coat|jacket|hat|bag|market|supermarket|customer|receipt'),
    ('salud', '🩺', T('Health', '健康', '健康'), r'health|ill|sick|disease|pain|hurt|fever|cough|cold\b|flu|medicine|pill|hospital|doctor|nurse|dentist|chemist|pharmacy|injur|wound|blood|heart|ambulance|healthy|tired'),
    ('viajes', '✈️', T('Travel & transport', '旅行と交通', '旅行与交通'), r'travel|trip|journey|tourist|hotel|luggage|suitcase|ticket|flight|plane|airport|train|station|bus\b|car\b|taxi|bicycle|bike|boat|ship|road|street|traffic|drive|map|platform|passport|visa|stop\b|motorway'),
    ('economia', '💶', T('Economy & business', '経済とビジネス', '经济与商业'), r'econom|money|tax|bank|price|market|trade|invest|debt|loan|profit|budget|inflation|industry|company|business|finance|share\b|stock'),
    ('ciencia', '🔬', T('Science & technology', '科学と技術', '科学与技术'), r'science|scien|technolog|computer|machine|research|experiment|laboratory|data|device|robot|energy|internet|app\b|screen|digital|invent|discover'),
    ('politica', '⚖️', T('Politics, law & society', '政治・法律・社会', '政治、法律与社会'), r'politic|government|president|minister|election|vote|law|court|judge|crime|police|right\b|rights|society|citizen|war|peace|army|protest|immigra|equality|freedom|democra|parliament|party \(politic'),
    ('arte', '🎨', T('Arts & culture', '芸術と文化', '艺术与文化'), r'art\b|artist|paint|draw|music|novel|poem|poet|writer|literature|theatre|actor|actress|film|culture|museum|sculpt|song|guitar|piano'),
    ('religion', '🕊️', T('Religion & philosophy', '宗教と哲学', '宗教与哲学'), r'relig|god|church|pray|faith|belief|believe|soul|spirit|moral|ethic|philosoph|temple|holy'),
    ('naturaleza', '🌿', T('Nature & weather', '自然と天気', '自然与天气'), r'nature|weather|rain|snow|wind|sun\b|cloud|storm|hot\b|cold\b|season|spring|summer|autumn|winter|sea\b|river|lake|mountain|forest|tree|flower|animal|dog|cat\b|bird|fish|horse|cow|island|desert|beach|coast|environment|pollution|climate|planet|earth'),
    ('tiempo', '🕒', T('Time & numbers', '時間と数', '时间与数字'), r'^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a hundred|a thousand)\b|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may\b|june|july|august|september|october|november|december|today|tomorrow|yesterday|week|month|year|hour|minute|morning|afternoon|evening|night|o.clock|always|never|often|early|late\b|soon|now\b'),
    ('general', '💬', T('Connectors & expressions', '接続表現と慣用句', '连接词与惯用语'), r'^(and|but|or|because|although|however|therefore|so\b|if\b|when\b|while|since|in fact|on the other hand|for example|in short|above all|anyway)'),
]
SUBS = [('n', T('Nouns', '名詞', '名词')), ('v', T('Verbs', '動詞', '动词')), ('a', T('Adjectives & adverbs', '形容詞・副詞', '形容词与副词')), ('x', T('Expressions', '表現', '表达'))]
RX = {tid: re.compile(r'(?<![a-z])(?:' + kw + r')(?:s|es)?(?![a-z])', re.I) for tid, _, _, kw in TOPICS}
# Conjugated forms and grammar chunks of the lessons (hablaré, hayas visto, es posible que…) are not themes.
INFLECTED = re.compile(r"^(\(?that\)?|i |you |he |she |we |they |it's |let's )|form\b|!|\(t[uú]\)", re.I)


def kind(v):
    w, en = v['word'], v['m'].get('en', '')
    if ' ' in w.strip() and not w.startswith(('el ', 'la ')):
        return 'x'
    if en.startswith('to ') or re.search(r'(ar|er|ir|ír)(se)?$', w) and en.startswith('to'):
        return 'v'
    if v.get('gender') in ('m', 'f'):
        return 'n'
    return 'a'


cats = {tid: {s: [] for s, _ in SUBS} for tid, *_ in TOPICS}
seen = set()
for lv in LEVELS:
    p = ROOT / 'data' / lv / 'vocab.json'
    if not p.exists():
        continue
    for v in sorted(json.loads(p.read_text(encoding='utf-8')), key=lambda v: v.get('q', 0)):
        tid = v.get('t')
        if not tid:
            en = v['m'].get('en', '')
            if INFLECTED.search(en) or re.search(r'\bque$', v['word']):
                continue
            first = re.split(r'[;(]', en)[0]
            tid = next((t for t, *_ in TOPICS if RX[t].search(first)), None)
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
