"""Vocabulary by theme (data/topics.json) for the Topics view, organised like the lexical themes
("contenidos léxico-temáticos") of the Escuelas Oficiales de Idiomas curriculum. Words are classified by
keywords matched on the first Spanish meaning of each word (unmatched words stay out).
Each theme is split into nouns / verbs / adjectives / expressions.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
TOPICS = [  # id, badge, name, Spanish keywords (regex fragments) matched on the first Spanish meaning of the word
    ('individuo', '👤', {'es': 'Identificación personal: cuerpo y carácter'}, r'cuerpo|cabeza|pelo|cabello|ojo|nariz|boca|oreja|oído|mano|brazo|pierna|pie|dedo|diente|espalda|cara|cuello|hombro|rodilla|piel|alto|bajo|gordo|delgado|guapo|bonito|feo|joven|viejo|tímido|amable|educado|maleducado|vago|perezoso|listo|inteligente|testarudo|egoísta|generoso|honrado|valiente|paciente|carácter|personalidad|alegre|serio|gracioso|nervioso|orgulloso|celoso|sensible|rubio|moreno|simpático|majo'),
    ('relaciones', '❤️', {'es': 'Familia y relaciones humanas'}, r'madre|padre|padres|hermano|hermana|hijo|hija|abuelo|abuela|abuelos|tío|tía|primo|prima|sobrino|sobrina|marido|esposa|mujer, esposa|familia|amigo|amiga|novio|novia|pareja|casado|divorciarse|boda|amor|bebé|niño|vecino|soltero|relación|amistad|abrazar|besar|beso|casarse'),
    ('alimentacion', '🍽️', {'es': 'Alimentación y restauración'}, r'comida|comer|beber|bebida|desayuno|cena|cenar|pan|arroz|carne|pescado|pollo|huevo|queso|jamón|fruta|manzana|naranja|plátano|verdura|patata|tomate|cebolla|ensalada|sopa|azúcar|sal|aceite|leche|café|té|zumo|cerveza|vino|agua|pastel|tarta|postre|dulce|cocinar|cocina|receta|freír|hervir|restaurante|camarero|menú|plato|vaso|taza|cuchara|tenedor|cuchillo|delicioso|picante|hambre|sed|mantequilla|mermelada|harina|chocolate|crepe|pasta|bocadillo|helado|legumbre|marisco'),
    ('educacion', '🎓', {'es': 'Educación y actividad académica'}, r'escuela|colegio|instituto|universidad|estudiante|alumno|profesor|profe|clase|lección|examen|estudiar|aprender|deberes|asignatura|curso|título|nota|cuaderno|lápiz|bolígrafo|libro|biblioteca|diccionario|enseñar|beca|licenciado|aprobar|suspender|matrícula|inscripción'),
    ('trabajo', '💼', {'es': 'Trabajo y ocupaciones'}, r'trabajo|trabajar|empleo|oficina|jefe|empresa|empleado|sueldo|salario|contrato|reunión|entrevista|carrera|profesión|oficio|médico|abogado|ingeniero|enfermero|policía|bombero|periodista|secretario|jubilarse|jubilado|paro|desempleo|compañero de trabajo|negocio|obrero|panadero|vendedor|informático|cantante|músico|pintor|escritor|director|taller|fábrica|puesto'),
    ('ocio', '⚽', {'es': 'Tiempo libre, ocio y deporte'}, r'deporte|fútbol|tenis|baloncesto|nadar|natación|correr|esquí|juego|jugar|afición|ocio|fiesta|cine|película|música|canción|cantar|bailar|baile|concierto|teatro|museo|vacaciones|fin de semana|pasear|paseo|playa|camping|senderismo|ajedrez|equipo|partido|jugador|pelota|videojuego|bici|bicicleta|excursión|velada'),
    ('medios', '📰', {'es': 'Lengua, comunicación y medios'}, r'noticia|periódico|revista|televisión|tele|radio|internet|web|correo|mensaje|teléfono|móvil|llamar|carta|anuncio|prensa|medios|lengua|idioma|palabra|frase|hablar|decir|escribir|leer|comunicación|información'),
    ('vivienda', '🏠', {'es': 'Vivienda, hogar y entorno'}, r'casa|hogar|piso|apartamento|habitación|dormitorio|cuarto de baño|salón|jardín|puerta|ventana|pared|suelo|tejado|escalera|ascensor|mueble|mesa|silla|cama|sofá|armario|nevera|alquiler|alquilar|llave|balcón|terraza|garaje|lámpara|espejo|cajón|edificio|barrio|vecino|mudarse|planta, piso'),
    ('servicios', '🏛️', {'es': 'Bienes y servicios'}, r'banco|correos|sello|formulario|documento|pasaporte|cita|trámite|certificado|comisaría|ayuntamiento|seguro|reclamación|tarjeta|cheque'),
    ('compras', '🛍️', {'es': 'Compras, ropa y actividades comerciales'}, r'tienda|comprar|vender|precio|barato|caro|dinero|pagar|efectivo|descuento|rebajas|talla|ropa|prenda|camisa|camiseta|pantalón|falda|vestido|zapato|abrigo|chaqueta|cazadora|sombrero|bolso|mercado|supermercado|cliente|recibo|jersey|vaqueros|gafas|probador|caja|cambio, dinero|panadería|farmacia|compra'),
    ('salud', '🩺', {'es': 'Salud y cuidados físicos'}, r'salud|enfermo|enfermedad|dolor|doler|fiebre|tos|resfriado|gripe|medicamento|medicina|pastilla|hospital|médico|dentista|farmacia|herida|sangre|corazón|ambulancia|sano|cansado|ducha|lavar'),
    ('viajes', '✈️', {'es': 'Viajes, alojamiento y transporte'}, r'viaje|viajar|turista|turismo|hotel|equipaje|maleta|billete|vuelo|avión|aeropuerto|tren|estación|autobús|coche|taxi|barco|carretera|calle|tráfico|conducir|mapa|plano|andén|visado|parada|autopista|metro|cruce|semáforo|puente|estancia|reservar|destino'),
    ('economia', '💶', {'es': 'Economía y empresa'}, r'economía|económico|impuesto|banco|comercio|invertir|inversión|deuda|préstamo|beneficio|presupuesto|inflación|industria|finanzas|acción|euro|céntimo|moneda'),
    ('ciencia', '🔬', {'es': 'Ciencia y tecnología'}, r'ciencia|científico|tecnología|ordenador|máquina|investigación|experimento|laboratorio|datos|aparato|robot|energía|pantalla|digital|inventar|descubrir|descubrimiento|informática'),
    ('politica', '⚖️', {'es': 'Política, ley y sociedad'}, r'política|gobierno|presidente|ministro|elecciones|votar|ley|tribunal|juez|delito|crimen|policía|derecho|sociedad|ciudadano|guerra|paz|ejército|manifestación|inmigración|igualdad|libertad|democracia|parlamento|república|rey|reina|nación|nacional|país'),
    ('arte', '🎨', {'es': 'Arte, cultura y entretenimiento'}, r'arte|artista|pintar|pintura|dibujar|dibujo|novela|poema|poeta|escritor|literatura|actor|actriz|cultura|cultural|escultura|guitarra|piano|cuadro|obra|exposición|monumento|catedral|castillo|palacio|leyenda|historia'),
    ('religion', '🕊️', {'es': 'Religión, valores y filosofía'}, r'religión|dios|iglesia|rezar|fe|creencia|creer|alma|espíritu|moral|ética|filosofía|templo|sagrado|misa|paraíso|cementerio'),
    ('naturaleza', '🌿', {'es': 'Clima, naturaleza y medio ambiente'}, r'naturaleza|tiempo atmosférico|lluvia|llover|nieve|nevar|viento|sol|nube|tormenta|calor|frío|estación \(del año\)|primavera|verano|otoño|invierno|mar|río|lago|montaña|bosque|árbol|flor|planta|animal|perro|gato|pájaro|pez|caballo|vaca|isla|desierto|costa|medio ambiente|contaminación|clima|planeta|tierra|campo|hierba|piedra|cielo|estrella|valle|acantilado|serpiente|burro|grado'),
    ('tiempo', '🕒', {'es': 'Tiempo, números y cantidades'}, r'uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|veinte|treinta|cuarenta|cincuenta|sesenta|cien|mil|millón|lunes|martes|miércoles|jueves|viernes|sábado|domingo|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|hoy|mañana|ayer|semana|mes|año|hora|minuto|tarde|noche|siempre|nunca|a menudo|temprano|pronto|ahora|día|siglo|época|momento|fecha|media hora|kilo|litro|metro \(medida\)|kilómetro|cuarto|medio'),
    ('general', '💬', {'es': 'Conectores y expresiones'}, r'y|pero|o|porque|aunque|sin embargo|por lo tanto|así que|si|cuando|mientras|desde|de hecho|por otra parte|por ejemplo|en resumen|sobre todo|de todos modos|entonces|luego|después|primero|por fin|finalmente|también|tampoco'),
]
SUBS = [('n', {'es': 'Sustantivos'}), ('v', {'es': 'Verbos'}), ('a', {'es': 'Adjetivos y adverbios'}), ('x', {'es': 'Expresiones'})]
RX = {tid: re.compile(r'(?:' + kw + r')(?:s|es)?', re.I) for tid, _, _, kw in TOPICS}
# Conjugated forms and grammar chunks of the lessons (hablaré, hayas visto, es posible que…) are not themes.



def kind(v):
    w, pos = v['word'], v.get('pos', '')
    if v.get('g') or re.match(r"(le|la|les) |l'", w):
        return 'n'
    if ' ' in w.strip():
        return 'x'
    if 'verb' in pos and re.search(r'(er|ir|re|oir)$', w):
        return 'v'
    if 'adjective' in pos or 'adverb' in pos:
        return 'a'
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
            first = re.split(r'[,;(·]', v['m']['es'])[0].strip().lower()
            tid = next((t for t, *_ in TOPICS if RX[t].fullmatch(first)), None)
        if v.get('pos', '').split('/')[0] in ('determiner', 'pronoun', 'preposition', 'conjunction') and tid != 'general':
            continue
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
