#!/usr/bin/env python3
"""Build data/topics.json: the vocabulary of every level grouped by theme (category › subcategory).

Each noun is classified from (1) the JMdict field tags of its first sense and (2) the WordNet
hypernyms of its first English gloss. Verbs/adjectives only enter through JMdict field tags.

Usage: NLTK data must contain 'wordnet'.  python3 tools/build_topics.py <dir with jmdict-all-*.json>
"""
import glob, json, re, sys
from collections import defaultdict
from pathlib import Path
from nltk.corpus import wordnet as wn

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']
REF = Path(sys.argv[1]) if len(sys.argv) > 1 else None

# Taxonomy: category id → (badge, es, en, [(sub id, es, en)])
CATS = [
    ('food', '食', 'Comida', 'Food', [
        ('fish', 'Pescado y marisco', 'Fish & seafood'), ('meat', 'Carne', 'Meat'), ('veg', 'Verduras y setas', 'Vegetables'),
        ('fruit', 'Fruta', 'Fruit'), ('drink', 'Bebidas', 'Drinks'), ('sweet', 'Dulces y postres', 'Sweets'),
        ('dish', 'Platos e ingredientes', 'Dishes & ingredients'), ('kitchen', 'Cocina y utensilios', 'Cooking & utensils')]),
    ('travel', '旅', 'Viajes', 'Travel', [
        ('country', 'Países y regiones', 'Countries & regions'), ('transport', 'Transporte', 'Transport'),
        ('trip', 'Turismo y alojamiento', 'Tourism & lodging')]),
    ('body', '体', 'Cuerpo y salud', 'Body & health', [
        ('parts', 'Partes del cuerpo', 'Body parts'), ('illness', 'Enfermedades y síntomas', 'Illness & symptoms'),
        ('medicine', 'Medicina y hospital', 'Medicine & hospital')]),
    ('nature', '自', 'Naturaleza', 'Nature', [
        ('animal', 'Animales', 'Animals'), ('bird', 'Aves', 'Birds'), ('insect', 'Insectos', 'Insects'),
        ('plant', 'Plantas y flores', 'Plants & flowers'), ('weather', 'Tiempo y clima', 'Weather'),
        ('geo', 'Paisaje y geografía', 'Landscape'), ('space', 'Espacio', 'Space')]),
    ('people', '人', 'Personas', 'People', [
        ('family', 'Familia', 'Family'), ('job', 'Profesiones', 'Jobs'), ('person', 'Gente y relaciones', 'People & relations')]),
    ('mind', '心', 'Emociones y carácter', 'Feelings & character', [
        ('feeling', 'Emociones', 'Feelings'), ('trait', 'Carácter', 'Character')]),
    ('home', '家', 'Casa', 'Home', [
        ('furniture', 'Muebles y objetos', 'Furniture & objects'), ('rooms', 'Partes de la casa', 'Rooms'),
        ('tools', 'Herramientas', 'Tools')]),
    ('clothes', '服', 'Ropa y moda', 'Clothes', [('clothes', 'Ropa y accesorios', 'Clothes & accessories')]),
    ('city', '町', 'Ciudad', 'City', [('building', 'Edificios y lugares', 'Buildings & places'), ('shop', 'Tiendas y compras', 'Shops')]),
    ('school', '学', 'Estudios y lengua', 'Study & language', [
        ('school', 'Escuela y estudios', 'School'), ('language', 'Lengua y escritura', 'Language & writing')]),
    ('work', '仕', 'Trabajo y economía', 'Work & economy', [
        ('money', 'Dinero y economía', 'Money & economy'), ('company', 'Empresa y oficina', 'Company & office')]),
    ('leisure', '遊', 'Ocio', 'Leisure', [
        ('sport', 'Deportes', 'Sports'), ('art', 'Música y arte', 'Music & art'), ('game', 'Juegos y aficiones', 'Games & hobbies')]),
    ('society', '社', 'Sociedad', 'Society', [
        ('politics', 'Política y gobierno', 'Politics'), ('law', 'Ley y delito', 'Law & crime'),
        ('military', 'Ejército y guerra', 'Military'), ('religion', 'Religión', 'Religion')]),
    ('science', '科', 'Ciencia y tecnología', 'Science & tech', [
        ('science', 'Ciencia', 'Science'), ('tech', 'Tecnología y máquinas', 'Technology')]),
    ('time', '時', 'Tiempo y calendario', 'Time', [('time', 'Tiempo y fechas', 'Time & dates')]),
    ('measure', '数', 'Números, formas y colores', 'Numbers & shapes', [
        ('number', 'Números y medidas', 'Numbers & measures'), ('shape', 'Formas', 'Shapes'), ('color', 'Colores', 'Colours')]),
]

# JMdict field tag → (cat, sub)
FIELD = {
    'food': ('food', 'dish'), 'zool': ('nature', 'animal'), 'bot': ('nature', 'plant'), 'anat': ('body', 'parts'),
    'med': ('body', 'medicine'), 'sports': ('leisure', 'sport'), 'baseb': ('leisure', 'sport'), 'sumo': ('leisure', 'sport'),
    'MA': ('leisure', 'sport'), 'music': ('leisure', 'art'), 'art': ('leisure', 'art'), 'law': ('society', 'law'),
    'finc': ('work', 'money'), 'econ': ('work', 'money'), 'bus': ('work', 'company'), 'mil': ('society', 'military'),
    'comp': ('science', 'tech'), 'engr': ('science', 'tech'), 'elec': ('science', 'tech'), 'chem': ('science', 'science'),
    'physics': ('science', 'science'), 'math': ('measure', 'number'), 'biol': ('science', 'science'), 'geol': ('nature', 'geo'),
    'astron': ('nature', 'space'), 'Buddh': ('society', 'religion'), 'Shinto': ('society', 'religion'),
    'Christn': ('society', 'religion'), 'ling': ('school', 'language'), 'gramm': ('school', 'language'),
    'politics': ('society', 'politics'), 'shogi': ('leisure', 'game'), 'go': ('leisure', 'game'), 'mahj': ('leisure', 'game'),
}

S = lambda n: wn.synset(n)
# WordNet hypernym → (cat, sub), checked in this order (first match wins).
HYPER = [
    ('seafood.n.01', 'food', 'fish'), ('fish.n.01', 'food', 'fish'), ('fish.n.02', 'food', 'fish'), ('shellfish.n.01', 'food', 'fish'),
    ('crustacean.n.01', 'food', 'fish'), ('mollusk.n.01', 'food', 'fish'), ('meat.n.01', 'food', 'meat'),
    ('vegetable.n.01', 'food', 'veg'), ('edible_fruit.n.01', 'food', 'fruit'), ('fruit.n.01', 'food', 'fruit'), ('beverage.n.01', 'food', 'drink'),
    ('alcohol.n.01', 'food', 'drink'), ('dessert.n.01', 'food', 'sweet'), ('sweet.n.03', 'food', 'sweet'),
    ('baked_goods.n.01', 'food', 'dish'), ('dish.n.02', 'food', 'dish'), ('foodstuff.n.02', 'food', 'dish'),
    ('food.n.01', 'food', 'dish'), ('food.n.02', 'food', 'dish'), ('meal.n.01', 'food', 'dish'),
    ('kitchen_utensil.n.01', 'food', 'kitchen'), ('cookware.n.01', 'food', 'kitchen'), ('tableware.n.01', 'food', 'kitchen'),
    ('bird.n.01', 'nature', 'bird'), ('insect.n.01', 'nature', 'insect'), ('arthropod.n.01', 'nature', 'insect'),
    ('animal.n.01', 'nature', 'animal'), ('flower.n.01', 'nature', 'plant'), ('plant.n.02', 'nature', 'plant'),
    ('tree.n.01', 'nature', 'plant'), ('celestial_body.n.01', 'nature', 'space'), ('weather.n.01', 'nature', 'weather'),
    ('atmospheric_phenomenon.n.01', 'nature', 'weather'), ('season.n.02', 'time', 'time'),
    ('geological_formation.n.01', 'nature', 'geo'), ('body_of_water.n.01', 'nature', 'geo'), ('land.n.04', 'nature', 'geo'),
    ('country.n.02', 'travel', 'country'), ('state.n.04', 'travel', 'country'), ('continent.n.01', 'travel', 'country'),
    ('city.n.01', 'travel', 'country'), ('conveyance.n.03', 'travel', 'transport'), ('vehicle.n.01', 'travel', 'transport'),
    ('vessel.n.02', 'travel', 'transport'), ('aircraft.n.01', 'travel', 'transport'), ('road.n.01', 'travel', 'transport'),
    ('station.n.01', 'travel', 'transport'), ('hotel.n.01', 'travel', 'trip'), ('journey.n.01', 'travel', 'trip'),
    ('body_part.n.01', 'body', 'parts'), ('disease.n.01', 'body', 'illness'), ('illness.n.01', 'body', 'illness'),
    ('symptom.n.01', 'body', 'illness'), ('injury.n.01', 'body', 'illness'), ('drug.n.01', 'body', 'medicine'),
    ('medicine.n.02', 'body', 'medicine'), ('medical_care.n.01', 'body', 'medicine'), ('hospital.n.01', 'body', 'medicine'),
    ('relative.n.01', 'people', 'family'), ('family.n.01', 'people', 'family'), ('worker.n.01', 'people', 'job'),
    ('professional.n.01', 'people', 'job'), ('person.n.01', 'people', 'person'),
    ('feeling.n.01', 'mind', 'feeling'), ('trait.n.01', 'mind', 'trait'),
    ('clothing.n.01', 'clothes', 'clothes'), ('footwear.n.02', 'clothes', 'clothes'), ('accessory.n.01', 'clothes', 'clothes'),
    ('jewelry.n.01', 'clothes', 'clothes'), ('headdress.n.01', 'clothes', 'clothes'),
    ('furniture.n.01', 'home', 'furniture'), ('furnishing.n.02', 'home', 'furniture'), ('home_appliance.n.01', 'home', 'furniture'),
    ('room.n.01', 'home', 'rooms'), ('building_material.n.01', 'home', 'tools'), ('hand_tool.n.01', 'home', 'tools'),
    ('tool.n.01', 'home', 'tools'), ('mercantile_establishment.n.01', 'city', 'shop'), ('building.n.01', 'city', 'building'),
    ('facility.n.01', 'city', 'building'), ('educational_institution.n.01', 'school', 'school'),
    ('discipline.n.01', 'school', 'school'), ('language_unit.n.01', 'school', 'language'), ('language.n.01', 'school', 'language'),
    ('writing.n.02', 'school', 'language'), ('character.n.08', 'school', 'language'),
    ('money.n.01', 'work', 'money'), ('currency.n.01', 'work', 'money'), ('tax.n.01', 'work', 'money'),
    ('payment.n.01', 'work', 'money'), ('financial_gain.n.01', 'work', 'money'), ('cost.n.01', 'work', 'money'),
    ('company.n.01', 'work', 'company'), ('occupation.n.01', 'work', 'company'),
    ('sport.n.01', 'leisure', 'sport'), ('athletic_game.n.01', 'leisure', 'sport'), ('musical_instrument.n.01', 'leisure', 'art'),
    ('music.n.01', 'leisure', 'art'), ('art.n.01', 'leisure', 'art'), ('game.n.01', 'leisure', 'game'),
    ('crime.n.01', 'society', 'law'), ('law.n.01', 'society', 'law'), ('legal_document.n.01', 'society', 'law'),
    ('weapon.n.01', 'society', 'military'), ('military_unit.n.01', 'society', 'military'), ('war.n.01', 'society', 'military'),
    ('religion.n.01', 'society', 'religion'), ('spiritual_being.n.01', 'society', 'religion'),
    ('government.n.01', 'society', 'politics'), ('election.n.01', 'society', 'politics'), ('political_unit.n.01', 'society', 'politics'),
    ('chemical_element.n.01', 'science', 'science'), ('compound.n.02', 'science', 'science'), ('natural_science.n.01', 'science', 'science'),
    ('machine.n.01', 'science', 'tech'), ('electronic_equipment.n.01', 'science', 'tech'), ('computer.n.01', 'science', 'tech'),
    ('time_period.n.01', 'time', 'time'), ('time_unit.n.01', 'time', 'time'), ('calendar_day.n.01', 'time', 'time'),
    ('day_of_the_week.n.01', 'time', 'time'), ('calendar_month.n.01', 'time', 'time'),
    ('chromatic_color.n.01', 'measure', 'color'), ('achromatic_color.n.01', 'measure', 'color'), ('color.n.01', 'measure', 'color'),
    ('shape.n.02', 'measure', 'shape'), ('unit_of_measurement.n.01', 'measure', 'number'), ('number.n.02', 'measure', 'number'),
    ('definite_quantity.n.01', 'measure', 'number'),
]
HYPER = [(S(n), c, s) for n, c, s in HYPER]
LEX = {'noun.body': ('body', 'parts'), 'noun.feeling': ('mind', 'feeling'), 'noun.time': ('time', 'time'),
       'noun.plant': ('nature', 'plant'), 'noun.animal': ('nature', 'animal'), 'noun.food': ('food', 'dish'),
       'noun.shape': ('measure', 'shape')}
SKIP = {'thing', 'matter', 'stuff', 'way', 'kind', 'part', 'side', 'point', 'place', 'case', 'one', 'sort', 'piece', 'end'}


def first_gloss(en):
    g = re.split(r'[;,]', en or '')[0]
    g = re.sub(r'\(.*?\)', '', g).strip().lower()
    g = re.sub(r'^(a|an|the|to) ', '', g)
    return g


def synset_class(g, edible=False):
    """Classify one English noun phrase; tries the phrase and then its head (last word)."""
    for cand in (g, g.split(' ')[-1] if ' ' in g else None):
        if not cand or cand in SKIP:
            continue
        syns = wn.synsets(cand.replace(' ', '_'), pos=wn.NOUN)[:3]
        if not syns:
            continue
        # Prefer an edible reading when one of the main senses is food (beef, chicken, fish…)
        food = [x for x in syns[:2] if x.lexname() == 'noun.food'] if edible else []
        for s in ([food[0]] if food else []) + [syns[0]]:
            hyp = set(s.closure(lambda x: x.hypernyms() + x.instance_hypernyms())) | {s}
            for h, c, sub in HYPER:
                if h in hyp:
                    return (c, sub)
            if s.lexname() in LEX:
                return LEX[s.lexname()]
        return None
    return None


def classify(v, jsenses):
    sense = (jsenses or [{}])[0]
    pos = ' '.join(sense.get('partOfSpeech', []))
    for f in sense.get('field', []):
        if f in FIELD:
            return FIELD[f]
    if jsenses and not pos.startswith('n'):
        return None
    gl = [g['text'] for g in sense.get('gloss', []) if g.get('lang') == 'eng'][:4] or [v['m'].get('en', '')]
    es = v['m'].get('es', '').lower()
    edible = bool(re.search(r'carne|pescado|comida|fruta|verdura|bebida|dulce|plato|marisco|filete|pollo', es))
    votes = []
    for g in gl:
        g = first_gloss(g)
        if g and len(g) <= 30:
            votes.append(synset_class(g, edible))
    got = [x for x in votes if x]
    if not got:
        return None
    # Majority over the glosses; a lone vote only counts if it comes from the first gloss and the others are silent.
    best = max(set(got), key=got.count)
    if got.count(best) >= 2 or (len(got) == 1 and votes[0] == best):
        return best
    return None


def main():
    jm = {}
    if REF:
        for e in json.load(open(glob.glob(str(REF / 'jmdict-all-*.json'))[0], encoding='utf8'))['words']:
            jm[e['id']] = e['sense']
    groups = defaultdict(list)
    ov = json.load(open(ROOT / 'tools' / 'topics_overrides.json', encoding='utf8'))
    drop, move = set(ov['remove'].split()), ov['move']
    n = 0
    for lv in LEVELS:
        for v in json.load(open(ROOT / 'data' / lv / 'vocab.json', encoding='utf8')):
            r = classify(v, jm.get(v.get('jm')))
            if v['w'] in move:
                r = tuple(move[v['w']].split('.'))
            if v['w'] in drop:
                r = None
            if r:
                groups[r].append([lv, v['w'], v.get('q', 99999)])
                n += 1
    out = []
    for cid, badge, es, en, subs in CATS:
        ss = []
        for sid, ses, sen in subs:
            ws = sorted(groups.get((cid, sid), []), key=lambda x: (LEVELS.index(x[0]), x[2]))
            if ws:
                ss.append({'id': sid, 'es': ses, 'en': sen, 'w': [f'{lv}|{w}' for lv, w, _ in ws]})
        if ss:
            out.append({'id': cid, 'b': badge, 'es': es, 'en': en, 'subs': ss})
    json.dump(out, open(ROOT / 'data' / 'topics.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print('classified', n)
    for c in out:
        print(c['b'], c['es'], ' · '.join(f"{s['es']} {len(s['w'])}" for s in c['subs']))


if __name__ == '__main__':
    main()
