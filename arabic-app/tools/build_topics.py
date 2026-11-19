#!/usr/bin/env python3
"""Build data/topics.json: the vocabulary of every level grouped by theme (category › part of speech),
following the lexical themes of the Escuelas Oficiales de Idiomas curriculum.

Words are classified from their first English gloss: (1) keyword lists per theme and (2), for nouns,
the WordNet lexicographer file of that gloss (food, body, animal, plant, time…). Unmatched words stay out.
Usage: python3 tools/build_topics.py   (needs nltk with the 'wordnet' corpus)
"""
import json, re
from pathlib import Path
from nltk.corpus import wordnet as wn

ROOT = Path(__file__).resolve().parent.parent
LEVELS = sorted([p.name for p in (ROOT / 'data').iterdir() if (p / 'vocab.json').exists()],
                key=lambda s: (re.sub(r'\d', '', s), int(re.sub(r'\D', '', s) or 0)))

K = lambda s: s.split('|')
TOPICS = [  # id, badge, names, English keywords (whole first gloss, singular)
    ('individuo', '👤', ('Identificación personal: cuerpo y carácter', 'Personal identity: body & character', '個人：体と性格', '개인: 몸과 성격'),
     K('body|head|hair|eye|nose|mouth|ear|hand|arm|leg|foot|finger|tooth|back|face|neck|shoulder|knee|skin|tall|short|fat|thin|slim|beautiful|pretty|handsome|ugly|young|old|shy|kind|polite|rude|lazy|clever|smart|intelligent|stubborn|selfish|generous|honest|brave|patient|character|personality|cheerful|serious|funny|nervous|proud|jealous|sensitive|name|age|male|female|man|woman|person|people|gentleman|lady|birthday|lip|tongue|chest|belly|stomach|heart|brain|bone|blood|toe|eyebrow|beard|wrist|waist|calm|careful|diligent|hardworking|humble|modest|optimistic|pessimistic|curious|cute|strong|weak|gentle|naughty|vain|arrogant')),
    ('relaciones', '❤️', ('Familia y relaciones humanas', 'Family & relationships', '家族と人間関係', '가족과 인간관계'),
     K('mother|mom|father|dad|parent|parents|brother|older brother|younger brother|sister|older sister|younger sister|son|daughter|child|children|grandfather|grandmother|grandparents|uncle|aunt|cousin|nephew|niece|husband|wife|family|friend|boyfriend|girlfriend|couple|married|marry|to marry|get married|divorce|wedding|love|to love|baby|kid|neighbor|neighbour|single|relationship|friendship|hug|kiss|guest|relative|relatives|classmate|colleague|partner|fiance|bride|groom|ancestor|descendant|elder|orphan|widow|stranger|acquaintance|to date|date|to visit|visit')),
    ('alimentacion', '🍽️', ('Alimentación y restauración', 'Food & eating out', '食べ物と外食', '음식과 외식'),
     K('food|to eat|eat|to drink|drink|beverage|breakfast|lunch|dinner|supper|meal|bread|rice|meat|fish|chicken|egg|cheese|ham|fruit|apple|orange|banana|vegetable|potato|tomato|onion|salad|soup|sugar|salt|oil|milk|coffee|tea|juice|beer|wine|water|cake|dessert|sweet|candy|to cook|cook|cooking|kitchen|recipe|restaurant|waiter|waitress|menu|dish|plate|cup|bowl|spoon|fork|knife|chopsticks|delicious|tasty|spicy|hungry|thirsty|butter|jam|flour|chocolate|noodles|dumpling|tofu|pork|beef|mutton|lamb|duck|shrimp|vinegar|soy sauce|sauce|pepper|garlic|ginger|melon|watermelon|grape|pear|peach|strawberry|lemon|snack|steamed bun|porridge|cabbage|carrot|mushroom|bean|corn|wheat|nut|honey|ice cream|bottle|to fry|to boil|to bake|sour|bitter|salty|bland|fresh|full|appetite|to order food|chef|canteen|cafeteria|bar')),
    ('educacion', '🎓', ('Educación y actividad académica', 'Education & study', '教育と学習', '교육과 학습'),
     K('school|university|college|student|pupil|teacher|professor|class|lesson|course|exam|examination|test|to study|study|to learn|learn|homework|subject|degree|grade|score|mark|notebook|pencil|pen|book|library|dictionary|to teach|teach|scholarship|graduate|to graduate|graduation|to pass|to fail|semester|term|classroom|blackboard|textbook|lecture|thesis|research|knowledge|education|tuition|kindergarten|primary school|middle school|high school|campus|dormitory|major|exercise|question|answer|to review|review|to read aloud|vocabulary|grammar|character|word|sentence|essay|composition|chalk|eraser|ruler|principal|headmaster|academy')),
    ('trabajo', '💼', ('Trabajo y ocupaciones', 'Work & jobs', '仕事と職業', '일과 직업'),
     K('work|job|to work|employment|office|boss|company|employee|staff|salary|wage|wages|pay|contract|meeting|interview|career|profession|occupation|doctor|lawyer|engineer|nurse|police|policeman|police officer|firefighter|journalist|reporter|secretary|to retire|retire|retirement|unemployed|unemployment|colleague|business|worker|farmer|peasant|baker|salesperson|seller|driver|singer|musician|painter|writer|author|director|manager|factory|workshop|position|post|to hire|to fire|to resign|resign|overtime|to apply|application|resume|cv|duty|task|labor|labour|industry|enterprise|firm|clerk|accountant|cashier|waiter|cook|chef|guide|tour guide|soldier|scientist|programmer|architect|actor|actress|athlete|coach|businessman|merchant|boss|leader|assistant|intern|vacation|leave|promotion|to promote|shift|to go to work|to get off work|to be on duty')),
    ('ocio', '⚽', ('Tiempo libre, ocio y deporte', 'Free time, leisure & sport', '余暇とスポーツ', '여가와 스포츠'),
     K('sport|sports|football|soccer|tennis|basketball|volleyball|table tennis|ping-pong|badminton|to swim|swim|swimming|to run|run|running|ski|skiing|game|to play|play|hobby|leisure|party|cinema|movie|film|music|song|to sing|sing|to dance|dance|concert|theater|theatre|museum|holiday|holidays|vacation|weekend|to take a walk|walk|stroll|beach|camping|hiking|to climb a mountain|chess|team|match|player|ball|video game|bike|bicycle|to ride a bike|excursion|trip|to travel|karaoke|to go shopping|fishing|to fish|gym|yoga|exercise|to exercise|competition|race|champion|championship|to win|to lose|fan|ticket|toy|park|zoo|picnic|photo|photograph|to take photos|camera|guitar|piano|drum|kite|cards|puzzle|amusement park|olympics|marathon|to train|training|boxing|martial arts|kung fu|tai chi')),
    ('medios', '📰', ('Lengua, comunicación y medios', 'Language, communication & media', '言語・通信・メディア', '언어·통신·미디어'),
     K('news|newspaper|magazine|television|tv|radio|internet|website|web|email|e-mail|mail|message|telephone|phone|mobile phone|cell phone|to call|to phone|letter|advertisement|ad|press|media|language|word|phrase|to speak|speak|to say|say|to talk|talk|to write|write|to read|read|communication|information|to tell|to chat|chat|to ask|to answer|to reply|reply|to explain|explain|to translate|translation|to discuss|discussion|to describe|conversation|dialogue|speech|voice|program|programme|channel|broadcast|to broadcast|reporter|journalist|interview|article|report|to report|to announce|announcement|blog|online|network|to post|to publish|publication|text message|to send|signal|computer|to type|keyboard|dialect|accent|pronunciation|Chinese|English|Arabic|French|Spanish|Japanese|mandarin|foreign language|to listen|listen|to hear|hear|to understand|understand|to express|expression|meaning|to mean')),
    ('vivienda', '🏠', ('Vivienda, hogar y entorno', 'Home & surroundings', '住まいと環境', '주거와 환경'),
     K('house|home|apartment|flat|room|bedroom|bathroom|living room|garden|yard|door|window|wall|floor|roof|stairs|staircase|elevator|lift|furniture|table|desk|chair|bed|sofa|wardrobe|closet|fridge|refrigerator|rent|to rent|key|balcony|terrace|garage|lamp|light|mirror|drawer|building|neighborhood|neighbourhood|to move|to move house|ceiling|kitchen|toilet|shower|bath|bathtub|curtain|carpet|pillow|blanket|towel|soap|toothbrush|toothpaste|cupboard|shelf|courtyard|gate|corridor|hall|basement|address|landlord|tenant|to clean|to tidy up|housework|to sweep|broom|trash|garbage|rubbish|washing machine|air conditioner|heating|fan|electricity|community|residence|to live|live|village|town|city|street|district')),
    ('servicios', '🏛️', ('Bienes y servicios', 'Goods & services', '公共サービス', '공공 서비스'),
     K('bank|post office|stamp|form|document|passport|appointment|procedure|certificate|police station|town hall|city hall|insurance|complaint|card|credit card|cheque|check|ID card|identity card|visa|embassy|consulate|to sign|signature|to register|registration|counter|queue|to line up|service|repair|to repair|to fix|hairdresser|barber|laundry|post|parcel|package|envelope|deposit|to deposit|to withdraw|account|password|receipt|invoice|fee|to apply for|license|licence|permit')),
    ('compras', '🛍️', ('Compras, ropa y comercio', 'Shopping, clothes & commerce', '買い物と衣服', '쇼핑과 옷'),
     K('shop|store|to buy|buy|to sell|sell|price|cheap|expensive|money|to pay|pay|cash|discount|sale|size|clothes|clothing|garment|shirt|t-shirt|trousers|pants|skirt|dress|shoe|shoes|coat|jacket|hat|cap|bag|handbag|market|supermarket|customer|receipt|sweater|jeans|glasses|fitting room|change|bakery|pharmacy|shopping|to go shopping|goods|product|commodity|brand|quality|to bargain|yuan|kuai|dollar|euro|coin|wallet|purse|sock|socks|glove|gloves|scarf|tie|belt|boots|sandals|underwear|pajamas|button|pocket|zipper|fashion|style|color|colour|red|blue|green|yellow|black|white|purple|pink|brown|grey|gray|orange|wear|to wear|to put on|to take off|jewelry|ring|necklace|watch|umbrella|mall|department store|vendor|stall|to cost|cost|free|refund|delivery|online shopping|order|to order')),
    ('salud', '🩺', ('Salud y cuidados físicos', 'Health & body care', '健康と医療', '건강과 의료'),
     K('health|healthy|ill|sick|illness|disease|pain|to hurt|hurt|ache|headache|stomachache|toothache|fever|cough|to cough|cold|flu|medicine|drug|pill|hospital|doctor|dentist|clinic|pharmacy|wound|injury|injured|blood|ambulance|tired|exhausted|shower|to wash|to rest|rest|to sleep|sleep|to wake up|to get up|to see a doctor|patient|nurse|surgery|operation|to operate|to examine|examination|symptom|treatment|to treat|to cure|cure|to recover|recovery|allergy|virus|infection|vaccine|injection|prescription|diet|to lose weight|weight|height|fit|fitness|to brush teeth|to bathe|bath|hygiene|mental health|stress|depression|cancer|diabetes|heart disease|to faint|to vomit|dizzy|itchy|swollen|bandage|thermometer|massage|acupuncture|traditional Chinese medicine')),
    ('viajes', '✈️', ('Viajes, alojamiento y transporte', 'Travel, accommodation & transport', '旅行・宿泊・交通', '여행·숙박·교통'),
     K('travel|to travel|trip|journey|tourist|tourism|hotel|luggage|baggage|suitcase|ticket|flight|plane|airplane|aeroplane|airport|train|railway|railway station|station|bus|bus stop|car|taxi|boat|ship|road|street|traffic|to drive|drive|map|platform|visa|stop|highway|motorway|subway|underground|metro|crossroads|intersection|traffic light|bridge|stay|to stay|to book|booking|reservation|to reserve|destination|passenger|driver|pilot|to fly|to take off|to land|to depart|departure|to arrive|arrival|to transfer|seat|window seat|aisle|route|direction|north|south|east|west|left|right|straight|corner|tunnel|port|harbor|harbour|bicycle|motorcycle|scenery|landscape|scenic spot|sightseeing|guide|guidebook|to get on|to get off|to board|border|customs|abroad|overseas|foreign country|country|province|capital|passport|hostel|inn|check in|check out|single room|double room|reception|front desk|tent|backpack|souvenir')),
    ('economia', '💶', ('Economía y empresa', 'Economy & business', '経済と企業', '경제와 기업'),
     K('economy|economic|tax|bank|commerce|trade|to invest|investment|debt|loan|profit|budget|inflation|industry|finance|financial|stock|share|shares|currency|market|price|cost|income|expense|expenditure|capital|interest|interest rate|to export|export|to import|import|company|corporation|enterprise|consumer|consumption|to consume|production|to produce|growth|to develop|development|crisis|recession|competition|competitor|monopoly|brand|marketing|sales|client|supplier|contract|deal|negotiation|to negotiate|fund|funding|wealth|rich|poor|poverty|GDP|employment|tariff|subsidy|insurance|bankruptcy|merger|shareholder|revenue|turnover|asset|assets|property|real estate|economist')),
    ('ciencia', '🔬', ('Ciencia y tecnología', 'Science & technology', '科学と技術', '과학과 기술'),
     K('science|scientist|scientific|technology|technological|computer|machine|research|to research|experiment|laboratory|lab|data|device|robot|energy|screen|digital|to invent|invention|to discover|discovery|software|hardware|program|programming|code|internet|artificial intelligence|AI|electricity|electronic|engine|chemistry|physics|biology|mathematics|math|maths|astronomy|space|satellite|rocket|planet|atom|molecule|cell|gene|DNA|theory|hypothesis|formula|equation|calculation|to calculate|to measure|measurement|instrument|microscope|telescope|technique|engineer|engineering|innovation|to innovate|network|system|chip|battery|signal|frequency|wave|temperature|degree|percent|percentage|statistics|analysis|to analyze|to analyse|evidence|result|method|medicine|medical science|geography|history')),
    ('politica', '⚖️', ('Política, ley y sociedad', 'Politics, law & society', '政治・法律・社会', '정치·법·사회'),
     K('politics|political|government|president|minister|prime minister|election|to vote|vote|law|court|judge|crime|criminal|police|right|rights|society|social|citizen|war|peace|army|military|soldier|demonstration|protest|immigration|immigrant|equality|freedom|liberty|democracy|parliament|congress|republic|king|queen|emperor|nation|national|country|state|policy|party|communist party|leader|official|mayor|governor|to govern|to rule|power|authority|constitution|legal|illegal|lawyer|trial|prison|jail|to arrest|to punish|punishment|justice|corruption|reform|revolution|independence|union|international|diplomacy|embassy|treaty|agreement|to negotiate|conflict|terrorism|public|population|community|class|social class|welfare|human rights|refugee|minority|ethnic group|people|masses|to oppose|opposition|to support|support|campaign|candidate|official|civil servant|bureaucracy|administration|council|committee|organization|organisation|institution')),
    ('arte', '🎨', ('Arte, cultura y entretenimiento', 'Art, culture & entertainment', '芸術と文化', '예술과 문화'),
     K('art|artist|to paint|painting|to draw|drawing|picture|novel|poem|poetry|poet|writer|literature|actor|actress|culture|cultural|sculpture|statue|guitar|piano|work|works|exhibition|monument|cathedral|castle|palace|legend|myth|story|history|historical|tradition|traditional|custom|festival|Spring Festival|opera|Peking opera|calligraphy|ink|brush|seal|porcelain|silk|craft|handicraft|design|designer|architecture|style|classic|classical|ancient|antique|relic|heritage|museum|gallery|theater|theatre|drama|play|performance|to perform|stage|audience|show|comedy|tragedy|character|hero|heroine|plot|chapter|author|publisher|edition|masterpiece|aesthetic|beauty|melody|rhythm|orchestra|symphony|composer|dancer|folk|folk song|lantern|dragon|zodiac|idiom|proverb|fairy tale')),
    ('religion', '🕊️', ('Religión, valores y filosofía', 'Religion, values & philosophy', '宗教と価値観', '종교와 가치관'),
     K('religion|religious|god|gods|church|mosque|temple|to pray|prayer|faith|belief|to believe|soul|spirit|moral|morality|ethics|philosophy|philosopher|sacred|holy|heaven|paradise|hell|cemetery|tomb|grave|Buddha|Buddhism|Buddhist|Taoism|Confucianism|Confucius|Islam|Muslim|Christian|Christianity|Bible|Koran|Quran|prophet|monk|nun|priest|imam|fate|destiny|virtue|sin|to forgive|forgiveness|truth|wisdom|value|values|principle|conscience|dignity|respect|honor|honour|loyalty|filial piety|meditation|ritual|ceremony|to worship|incense|ghost|devil|angel|miracle|eternal|life|death|to die|to be born|birth|meaning of life')),
    ('naturaleza', '🌿', ('Clima, naturaleza y medio ambiente', 'Weather, nature & environment', '天気・自然・環境', '날씨·자연·환경'),
     K('nature|weather|rain|to rain|snow|to snow|wind|sun|sunny|cloud|cloudy|storm|thunder|lightning|typhoon|hot|cold|warm|cool|heat|season|spring|summer|autumn|fall|winter|sea|ocean|river|lake|mountain|hill|forest|wood|woods|tree|flower|plant|grass|leaf|leaves|animal|dog|cat|bird|fish|horse|cow|pig|sheep|goat|chicken|duck|tiger|lion|panda|bear|elephant|monkey|wolf|fox|rabbit|mouse|rat|snake|insect|butterfly|bee|ant|mosquito|fly|island|desert|coast|beach|environment|environmental|pollution|to pollute|climate|planet|earth|land|field|countryside|stone|rock|sand|sky|star|moon|valley|cliff|waterfall|cave|volcano|earthquake|flood|drought|fog|ice|frost|rainbow|temperature|degree|natural|wild|wildlife|species|ecology|ecosystem|recycling|to recycle|resource|resources|water resources|oil|coal|gas|air|soil|seed|root|branch|bamboo|willow|pine|rose|lotus|garden|farm|crop|harvest|agriculture|to plant|to grow')),
    ('tiempo', '🕒', ('Tiempo, números y cantidades', 'Time, numbers & quantities', '時間・数・量', '시간·숫자·양'),
     K('one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|ten thousand|million|hundred million|billion|zero|half|number|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|today|tomorrow|yesterday|the day after tomorrow|the day before yesterday|week|month|year|hour|minute|second|o\'clock|morning|afternoon|evening|night|noon|midnight|always|never|often|usually|sometimes|early|late|soon|now|day|century|era|period|moment|date|time|quarter|calendar|clock|watch|past|present|future|last year|next year|this year|weekend|daytime|dawn|dusk|age|kilogram|kilo|gram|liter|litre|meter|metre|kilometer|kilometre|centimeter|centimetre|percent|double|first|second|last|next|previous|before|after|already|still|yet|just|recently|lately|finally|suddenly|immediately|quickly|slowly|forever|temporary|once|twice|times|several|many|much|few|little|some|all|every|each|quantity|amount|total|pair|dozen|piece|part|whole|majority|minority')),
    ('general', '💬', ('Conectores y expresiones', 'Connectors & expressions', '接続詞と表現', '접속사와 표현'),
     K('and|but|or|because|although|though|however|therefore|so|if|when|while|since|in fact|on the other hand|for example|in short|in summary|especially|anyway|then|afterwards|first|first of all|finally|at last|also|too|either|neither|moreover|furthermore|besides|in addition|otherwise|unless|even if|even though|as long as|as soon as|in order to|so that|thus|hence|nevertheless|nonetheless|whereas|instead|rather|meanwhile|in other words|that is|namely|after all|of course|certainly|indeed|perhaps|maybe|probably|hello|hi|goodbye|bye|thanks|thank you|sorry|excuse me|please|you\'re welcome|congratulations|cheers|welcome')),
]
NAMES = ('es', 'en', 'ja', 'ko')
SUBS = [('n', ('Sustantivos', 'Nouns', '名詞', '명사')), ('v', ('Verbos', 'Verbs', '動詞', '동사')),
        ('a', ('Adjetivos y adverbios', 'Adjectives & adverbs', '形容詞・副詞', '형용사·부사')), ('x', ('Expresiones', 'Expressions', '表現', '표현'))]
KW = {tid: {k.lower() for k in kws} for tid, _, _, kws in TOPICS}
LEX = {'noun.food': 'alimentacion', 'noun.body': 'individuo', 'noun.animal': 'naturaleza', 'noun.plant': 'naturaleza',
       'noun.phenomenon': 'naturaleza', 'noun.time': 'tiempo'}


def first_gloss(m):
    g = re.sub(r'\([^)]*\)', '', (m.get('en') or '')).strip()
    g = re.split(r'[;,/]', g)[0].strip().lower()
    return re.sub(r'^(a|an|the)\s+', '', g)


def singular(w):
    for suf, rep in (('ies', 'y'), ('ves', 'f'), ('es', ''), ('s', '')):
        if w.endswith(suf) and len(w) > 4:
            yield w[:-len(suf)] + rep


def classify(g):
    cands = [g, *singular(g)]
    for tid, *_ in TOPICS:
        if any(c in KW[tid] for c in cands):
            return tid
    if ' ' not in g and not g.startswith('to '):
        ss = wn.synsets(g, pos=wn.NOUN)
        if ss and ss[0].lexname() in LEX and g in [l.lower() for l in ss[0].lemma_names()]:
            return LEX[ss[0].lexname()]
    return None


def kind(v, g):
    pos = (v.get('pos') or '').lower()
    if pos in ('n', 'noun', 'name') or pos.startswith('n'):
        return 'n'
    if pos.startswith('v'):
        return 'v'
    if pos.startswith(('adj', 'adv', 'a')):
        return 'a'
    if pos.startswith(('expr', 'phr', 'x')):
        return 'x'
    if g.startswith('to '):
        return 'v'
    w = g.split(' ')[0]
    if ' ' in g and len(g.split()) > 2:
        return 'x'
    if wn.synsets(w, pos=wn.NOUN):
        return 'n'
    if wn.synsets(w, pos=wn.ADJ) or wn.synsets(w, pos=wn.ADV):
        return 'a'
    return 'x'


cats = {tid: {s: [] for s, _ in SUBS} for tid, *_ in TOPICS}
seen = set()
for lv in LEVELS:
    for v in sorted(json.loads((ROOT / 'data' / lv / 'vocab.json').read_text(encoding='utf-8')), key=lambda v: v.get('q', 0)):
        g = first_gloss(v['m'])
        if not g:
            continue
        tid = classify(g)
        if tid and v['word'] not in seen:
            seen.add(v['word'])
            cats[tid][kind(v, g)].append(f"{lv}|{v['word']}")

out = []
for tid, badge, names, _ in TOPICS:
    subs = [{'id': s, **dict(zip(NAMES, sn)), 'w': cats[tid][s]} for s, sn in SUBS if cats[tid][s]]
    if subs:
        out.append({'id': tid, 'b': badge, **dict(zip(NAMES, names)), 'subs': subs})
(ROOT / 'data' / 'topics.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(LEVELS, {c['id']: sum(len(s['w']) for s in c['subs']) for c in out}, len(seen))
