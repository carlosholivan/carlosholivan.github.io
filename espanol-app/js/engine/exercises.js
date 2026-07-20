import { S } from '../state.js';

export function generateExercises(unit) {
  const exercises = [];
  const lang = S.lang;

  for (const ex of unit.exercises) {
    exercises.push(buildExercise(ex, lang, unit));
  }
  return exercises;
}

function buildExercise(ex, lang, unit) {
  switch (ex.type) {
    case 'choose':
      return {
        type: 'choose',
        prompt: ex.prompt[lang] || ex.prompt.en,
        correct: ex.correct,
        options: shuffle([...ex.options]),
        hint: ex.hint ? (ex.hint[lang] || ex.hint.en) : null
      };

    case 'translate':
      return {
        type: 'translate',
        prompt: ex.prompt[lang] || ex.prompt.en,
        answer: ex.answer,
        accept: ex.accept || [ex.answer],
        hint: ex.hint ? (ex.hint[lang] || ex.hint.en) : null
      };

    case 'fill':
      return {
        type: 'fill',
        sentence: ex.sentence,
        blank: ex.blank,
        options: shuffle([...ex.options]),
        hint: ex.hint ? (ex.hint[lang] || ex.hint.en) : null
      };

    case 'order':
      return {
        type: 'order',
        prompt: ex.prompt[lang] || ex.prompt.en,
        words: shuffle([...ex.words]),
        answer: ex.answer,
        hint: ex.hint ? (ex.hint[lang] || ex.hint.en) : null
      };

    case 'match':
      return {
        type: 'match',
        pairs: shuffle(ex.pairs.map(p => ({
          left: p[0],
          right: p[1][lang] || p[1].en
        }))),
      };

    case 'listen':
      return {
        type: 'listen',
        text: ex.text,
        prompt: ex.prompt[lang] || ex.prompt.en,
        options: shuffle([...ex.options]),
        correct: ex.correct
      };

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
