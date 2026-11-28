// How to write each Arabic letter (steps, in the order a native writer draws it) and how it joins with others.
// Used by the letter sheet (views/hanzi.js).
import { S } from './state.js?v=202611282202';

const L = o => (o && (o[S.lang] || o.en || o.es)) || '';

// Letters that never join to the following letter (on their left).
export const NONJOIN = new Set([...'اأإآٱدذرزوؤءة']);
const isAr = ch => /[ء-يٱ]/.test(ch);

// Writing steps per shape family (es / en). Arabic is written right to left; the body first, then the dots and hamza.
const FAM = {
  alif: { es: ['Un trazo vertical de arriba abajo.', 'No se une con la letra siguiente: después se levanta el lápiz.'], en: ['One vertical stroke, top to bottom.', 'It never joins the next letter: lift the pen afterwards.'] },
  ba: { es: ['Empieza a la derecha con un pequeño gancho hacia arriba.', 'Traza una base horizontal, como un barco, hacia la izquierda y sube un poco al final.', 'Por último, los puntos ({d}).'], en: ['Start on the right with a small upward hook.', 'Draw a flat, boat-like base leftwards, curving up slightly at the end.', 'Finally add the dots ({d}).'] },
  jim: { es: ['Trazo horizontal corto de izquierda a derecha en la parte de arriba.', 'Baja en diagonal hacia la izquierda y haz una gran curva (como una «c» abierta) que vuelve hacia la derecha por debajo de la línea.', 'Por último, el punto ({d}).'], en: ['A short horizontal stroke at the top, left to right.', 'Go down diagonally to the left and make a large curve (an open «c») that sweeps back right below the line.', 'Finally the dot ({d}).'] },
  dal: { es: ['Pequeño trazo inclinado hacia abajo a la izquierda.', 'Gira y traza una base corta hacia la izquierda (como un ángulo).', 'No se une con la letra siguiente. {d}'], en: ['A small stroke slanting down to the left.', 'Turn and draw a short base to the left (like an angle).', 'It never joins the next letter. {d}'] },
  ra: { es: ['Una curva corta que baja desde la línea hacia abajo a la izquierda, como una coma grande.', 'Cae por debajo de la línea de escritura. No se une con la siguiente. {d}'], en: ['A short curve going down below the line to the left, like a big comma.', 'It drops below the writing line. It never joins the next letter. {d}'] },
  sin: { es: ['Tres pequeños dientes de derecha a izquierda.', 'Termina con una curva profunda como la de ن que baja de la línea.', '{d}'], en: ['Three small teeth from right to left.', 'Finish with a deep curve like ن dropping below the line.', '{d}'] },
  sad: { es: ['Haz un lazo ovalado alargado hacia la izquierda y vuelve a la derecha.', 'Un pequeño diente y después una curva profunda bajo la línea.', '{d}'], en: ['Make a long oval loop to the left and come back right.', 'A small tooth, then a deep curve below the line.', '{d}'] },
  ta: { es: ['Haz el lazo ovalado tumbado (como ص, sin diente).', 'Después, el trazo vertical de arriba abajo que toca el lazo.', '{d}'], en: ['Draw the lying oval loop (like ص, without a tooth).', 'Then the vertical stroke, top to bottom, touching the loop.', '{d}'] },
  ayn: { es: ['Arriba, una pequeña curva abierta a la izquierda (como una «c» al revés).', 'Desde ahí, baja con una gran curva como la de ج que vuelve bajo la línea.', '{d}'], en: ['At the top, a small curve open to the left (a reversed «c»).', 'From there, sweep down in a big curve like ج back under the line.', '{d}'] },
  fa: { es: ['Un pequeño círculo (la cabeza) arriba a la derecha.', 'Sigue con una base larga hacia la izquierda que sube al final ({x}).', '{d}'], en: ['A small circle (the head) at the top right.', 'Continue with a long base to the left that rises at the end ({x}).', '{d}'] },
  kaf: { es: ['Trazo vertical de arriba abajo.', 'Gira a la izquierda y traza la base horizontal.', 'Añade la pequeña «s» (hamza alargada) dentro, arriba.'], en: ['Vertical stroke, top to bottom.', 'Turn left and draw the horizontal base.', 'Add the small «s» shape (an elongated hamza) inside, at the top.'] },
  lam: { es: ['Trazo vertical alto de arriba abajo.', 'Baja por debajo de la línea con una curva hacia la izquierda que vuelve a subir.', 'Con alif forma la ligadura obligatoria لا.'], en: ['A tall vertical stroke, top to bottom.', 'Drop below the line with a curve to the left that rises again.', 'With alif it forms the compulsory ligature لا.'] },
  mim: { es: ['Un pequeño círculo cerrado.', 'Aislada o final, una cola recta que baja desde el círculo.'], en: ['A small closed circle.', 'Isolated or final, a straight tail going down from the circle.'] },
  nun: { es: ['Una curva profunda como un cuenco, bajo la línea.', 'Un punto encima, en el centro.'], en: ['A deep bowl-shaped curve below the line.', 'One dot above, in the middle.'] },
  ha: { es: ['Aislada: un lazo redondo; inicial: como un «8» abierto (هـ); media: ـهـ; final: ـه.', 'Practica las cuatro formas: cambia mucho según la posición.'], en: ['Isolated: a round loop; initial: like an open «8» (هـ); medial: ـهـ; final: ـه.', 'Practise all four forms: it changes a lot with position.'] },
  waw: { es: ['Un pequeño círculo (la cabeza) arriba.', 'Una cola que baja curvándose bajo la línea, como ر.', 'No se une con la letra siguiente.'], en: ['A small circle (the head) on top.', 'A tail curving down below the line, like ر.', 'It never joins the next letter.'] },
  ya: { es: ['Aislada o final: una «s» con una gran curva bajo la línea que vuelve a la derecha.', 'Inicial y media son como ب: un diente.', 'Dos puntos debajo.'], en: ['Isolated or final: an «s» shape with a big curve under the line sweeping back right.', 'Initial and medial look like ب: a tooth.', 'Two dots below.'] },
  hamza: { es: ['Una pequeña «c» con una cola, a media altura.', 'Va sola o sobre un soporte (أ ؤ ئ); nunca se une.'], en: ['A small «c» with a tail, at mid height.', 'It stands alone or on a seat (أ ؤ ئ); it never joins.'] },
  tam: { es: ['Es una ه final con dos puntos encima.', 'Solo aparece al final de palabra (normalmente femenino).'], en: ['It is a final ه with two dots on top.', 'It only appears at the end of a word (usually feminine).'] },
};
const DOTS = {
  'ب': ['1 punto debajo', '1 dot below'], 'ت': ['2 puntos encima', '2 dots above'], 'ث': ['3 puntos encima', '3 dots above'],
  'ج': ['1 punto dentro de la curva', '1 dot inside the curve'], 'ح': ['sin puntos', 'no dots'], 'خ': ['1 punto encima', '1 dot above'],
  'د': ['Sin puntos.', 'No dots.'], 'ذ': ['1 punto encima.', '1 dot above.'], 'ر': ['Sin puntos.', 'No dots.'], 'ز': ['1 punto encima.', '1 dot above.'],
  'س': ['Sin puntos.', 'No dots.'], 'ش': ['3 puntos encima de los dientes.', '3 dots above the teeth.'], 'ص': ['Sin puntos.', 'No dots.'], 'ض': ['1 punto encima.', '1 dot above.'],
  'ط': ['Sin puntos.', 'No dots.'], 'ظ': ['1 punto encima, a la derecha del trazo vertical.', '1 dot above, right of the vertical stroke.'],
  'ع': ['Sin puntos.', 'No dots.'], 'غ': ['1 punto encima.', '1 dot above.'], 'ف': ['1 punto encima', '1 dot above'], 'ق': ['2 puntos encima', '2 dots above'],
};
const FAMOF = {
  'ا': 'alif', 'ب': 'ba', 'ت': 'ba', 'ث': 'ba', 'ج': 'jim', 'ح': 'jim', 'خ': 'jim', 'د': 'dal', 'ذ': 'dal', 'ر': 'ra', 'ز': 'ra', 'س': 'sin', 'ش': 'sin',
  'ص': 'sad', 'ض': 'sad', 'ط': 'ta', 'ظ': 'ta', 'ع': 'ayn', 'غ': 'ayn', 'ف': 'fa', 'ق': 'fa', 'ك': 'kaf', 'ل': 'lam', 'م': 'mim', 'ن': 'nun', 'ه': 'ha',
  'و': 'waw', 'ي': 'ya', 'ء': 'hamza', 'ة': 'tam',
};

export function writeSteps(c) {
  const f = FAM[FAMOF[c]];
  if (!f) return [];
  const k = S.lang === 'es' ? 0 : 1;
  const d = DOTS[c] ? DOTS[c][k] : '';
  const x = c === 'ق' ? (k ? 'deeper and rounder, like ن' : 'más honda y redonda, como ن') : (k ? 'flat on the line' : 'plana sobre la línea');
  return (S.lang === 'es' ? f.es : f.en).map(s => s.replace('{d}', d).replace('{x}', x)).filter(s => s.trim());
}

// Position of the letter at index i of a word without vowel marks: 0 isolated, 1 initial, 2 medial, 3 final.
export function formAt(w, i) {
  const prev = w[i - 1], next = w[i + 1];
  const jp = i > 0 && isAr(prev) && !NONJOIN.has(prev) && w[i] !== 'ء';
  const jn = i < w.length - 1 && isAr(next) && !NONJOIN.has(w[i]);
  return jp && jn ? 2 : jp ? 3 : jn ? 1 : 0;
}

export const T = {
  how: { es: 'Cómo se escribe', en: 'How to write it', ja: '書き方', ko: '쓰는 법' },
  replay: { es: 'Ver otra vez', en: 'Replay', ja: 'もう一度', ko: '다시 보기' },
  rtl: { es: 'El árabe se escribe de derecha a izquierda.', en: 'Arabic is written right to left.', ja: 'アラビア語は右から左へ書きます。', ko: '아랍어는 오른쪽에서 왼쪽으로 씁니다.' },
  join: { es: 'Cómo se une con otras letras', en: 'How it joins other letters', ja: '他の文字とのつながり方', ko: '다른 글자와 연결되는 방식' },
  pos: { es: ['aislada', 'inicial', 'media', 'final'], en: ['isolated', 'initial', 'medial', 'final'], ja: ['独立形', '語頭形', '語中形', '語尾形'], ko: ['독립형', '어두형', '어중형', '어말형'] },
  nonjoin: { es: 'No se une con la letra siguiente (a su izquierda): por eso solo tiene dos formas, y la letra que va después empieza de nuevo en forma inicial o aislada.', en: 'It never joins the following letter (on its left): so it has only two forms, and the next letter starts again in initial or isolated form.', ja: '次の文字（左側）とはつながりません。そのため字形は2つだけで、次の文字は語頭形か独立形になります。', ko: '다음 글자(왼쪽)와 연결되지 않습니다. 그래서 형태가 둘뿐이고, 다음 글자는 어두형이나 독립형으로 다시 시작합니다.' },
  joins: { es: 'Se une por los dos lados: cambia de forma según la posición en la palabra.', en: 'It joins on both sides: its shape changes with its position in the word.', ja: '両側につながり、語中の位置で形が変わります。', ko: '양쪽으로 연결되며, 단어 속 위치에 따라 형태가 바뀝니다.' },
  combos: { es: 'Combinaciones', en: 'Combinations', ja: '組み合わせ', ko: '조합' },
  inWords: { es: 'En palabras: la forma que toma en cada posición', en: 'In words: the shape it takes in each position', ja: '単語の中での形', ko: '단어 속에서의 형태' },
  lamalif: { es: 'ل + ا se escriben siempre juntas como لا (ligadura obligatoria).', en: 'ل + ا are always written together as لا (compulsory ligature).', ja: 'ل + ا は必ず لا という合字になります。', ko: 'ل + ا 는 항상 لا 로 합쳐 씁니다(필수 합자).' },
};
export const tt = k => L(T[k]);
