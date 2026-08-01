export function generateExercises(unit) {
  return unit.exercises.map(ex => buildExercise(ex));
}

function buildExercise(ex) {
  switch (ex.type) {
    case 'choose':
      return { type: 'choose', prompt: ex.prompt, correct: ex.correct, options: shuffle([...ex.options]), hint: ex.hint || null };
    case 'translate':
      return { type: 'translate', prompt: ex.prompt, answer: ex.answer, accept: ex.accept || [ex.answer], hint: ex.hint || null };
    case 'fill':
      return { type: 'fill', sentence: ex.sentence, blank: ex.blank, options: shuffle([...ex.options]), hint: ex.hint || null };
    case 'order':
      return { type: 'order', prompt: ex.prompt, words: shuffle([...ex.words]), answer: ex.answer, hint: ex.hint || null };
    case 'match':
      return { type: 'match', pairs: shuffle(ex.pairs.map(p => ({ left: p[0], right: p[1] }))) };
    default:
      return ex;
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
