import { S, completeUnit } from '../state.js';
import { register, go } from '../router.js';
import { loadUnit } from '../data.js';
import { generateExercises } from '../engine/exercises.js';
import { recordAnswer } from '../engine/srs.js';
import { progressBar } from '../ui/components.js';
import { icon } from '../ui/icons.js';

register('lesson', async (el, params) => {
  const unit = await loadUnit(params.level, params.unit);
  if (!unit) { go('home'); return; }

  const exercises = generateExercises(unit);
  let current = 0;
  let hearts = 3;
  let correct = 0;

  if (unit.grammarIntro) {
    renderGrammarIntro();
  } else {
    renderExercise();
  }

  function renderGrammarIntro() {
    const vocabHtml = (unit.newVocab || []).map(v =>
      `<span class="vocab-pill"><span class="zh">${v.hanzi}</span><span class="py">${v.pinyin}</span><span class="tr">${v.es}</span></span>`
    ).join('');

    el.innerHTML = `<div class="grammar-page fade">
      <div class="flex items-center gap-12 mb-16">
        <button onclick="window.__quitLesson()" style="padding:4px">${icon('back', 20, 'var(--ink2)')}</button>
        <div class="grow"><span class="h3">${unit.title}</span></div>
      </div>
      ${vocabHtml ? `<div class="muted small mb-8" style="font-weight:600">Vocabulario nuevo</div><div class="vocab-pills">${vocabHtml}</div>` : ''}
      <div class="grammar-section">${unit.grammarIntro}</div>
      <button class="btn" onclick="window.__startExercises()">Empezar ejercicios</button>
    </div>`;
  }

  window.__startExercises = () => renderExercise();

  function renderExercise() {
    if (current >= exercises.length) { finish(); return; }
    const ex = exercises[current];
    const pct = Math.round((current / exercises.length) * 100);

    el.innerHTML = `<div class="fade" style="padding-top:16px">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__quitLesson()" style="padding:4px">${icon('back', 20, 'var(--ink2)')}</button>
        <div class="grow">${progressBar(pct)}</div>
        <div class="flex items-center gap-8">${'❤️'.repeat(hearts)}</div>
      </div>
      <div id="exercise-area">${renderByType(ex)}</div>
    </div>`;
  }

  function renderByType(ex) {
    switch (ex.type) {
      case 'choose': return renderChoose(ex);
      case 'translate': return renderTranslate(ex);
      case 'fill': return renderFill(ex);
      case 'order': return renderOrder(ex);
      case 'match': return renderMatch(ex);
      default: return '<div>Tipo desconocido</div>';
    }
  }

  function renderChoose(ex) {
    return `<div class="slideup">
      ${ex.hint ? `<div class="muted small mb-8">${ex.hint}</div>` : ''}
      <div class="h3 mb-16">${ex.prompt}</div>
      <div id="options">${ex.options.map((opt, i) =>
        `<button class="exercise-option" onclick="window.__choose(${i})">${opt}</button>`
      ).join('')}</div>
      <div id="feedback"></div>
    </div>`;
  }

  function renderTranslate(ex) {
    return `<div class="slideup">
      ${ex.hint ? `<div class="muted small mb-8">${ex.hint}</div>` : ''}
      <div class="h3 mb-16">${ex.prompt}</div>
      <input type="text" id="answer-input" placeholder="Escribe en chino..." autocomplete="off" autocapitalize="off" style="margin-bottom:14px">
      <button class="btn" onclick="window.__checkTranslate()">Comprobar</button>
      <div id="feedback" class="mt-12"></div>
    </div>`;
  }

  function renderFill(ex) {
    const parts = ex.sentence.split('___');
    return `<div class="slideup">
      ${ex.hint ? `<div class="muted small mb-8">${ex.hint}</div>` : ''}
      <div class="card" style="padding:20px;margin-bottom:16px;font-size:18px;line-height:1.8">
        ${parts[0]}<span style="border-bottom:2px solid var(--accent);min-width:60px;display:inline-block;text-align:center" id="blank-slot">&nbsp;</span>${parts[1] || ''}
      </div>
      <div id="options">${ex.options.map((opt, i) =>
        `<button class="exercise-option" onclick="window.__fillChoose(${i})">${opt}</button>`
      ).join('')}</div>
      <div id="feedback"></div>
    </div>`;
  }

  function renderOrder(ex) {
    return `<div class="slideup">
      ${ex.hint ? `<div class="muted small mb-8">${ex.hint}</div>` : ''}
      <div class="h3 mb-16">${ex.prompt}</div>
      <div class="sentence-area" id="sentence-area"></div>
      <div class="wordbank" id="wordbank">${ex.words.map((w, i) =>
        `<button class="wordchip" id="wc-${i}" onclick="window.__pickWord(${i})">${w}</button>`
      ).join('')}</div>
      <button class="btn mt-16" onclick="window.__checkOrder()">Comprobar</button>
      <div id="feedback" class="mt-12"></div>
    </div>`;
  }

  function renderMatch(ex) {
    return `<div class="slideup">
      <div class="h3 mb-16">Conecta las parejas</div>
      <div id="match-area" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${ex.pairs.map((p, i) =>
        `<button class="exercise-option" data-side="left" data-idx="${i}" onclick="window.__matchPick('left',${i})">${p.left}</button>
         <button class="exercise-option" data-side="right" data-idx="${i}" onclick="window.__matchPick('right',${i})">${p.right}</button>`
      ).join('')}</div>
      <div id="feedback" class="mt-12"></div>
    </div>`;
  }

  let pickedWords = [];
  window.__pickWord = (i) => {
    const ex = exercises[current];
    const chip = document.getElementById(`wc-${i}`);
    if (chip.classList.contains('used')) return;
    chip.classList.add('used');
    pickedWords.push(ex.words[i]);
    document.getElementById('sentence-area').innerHTML = pickedWords.map((w, idx) =>
      `<button class="wordchip" onclick="window.__unpickWord(${idx})">${w}</button>`
    ).join('');
  };

  window.__unpickWord = (idx) => {
    const removed = pickedWords.splice(idx, 1)[0];
    const ex = exercises[current];
    const origIdx = ex.words.indexOf(removed);
    const chip = document.getElementById(`wc-${origIdx}`);
    if (chip) chip.classList.remove('used');
    document.getElementById('sentence-area').innerHTML = pickedWords.map((w, i) =>
      `<button class="wordchip" onclick="window.__unpickWord(${i})">${w}</button>`
    ).join('');
  };

  window.__checkOrder = () => {
    const ex = exercises[current];
    const isCorrect = pickedWords.join('') === ex.answer || pickedWords.join(' ') === ex.answer;
    showFeedback(isCorrect, ex.answer);
    recordAnswer(ex.answer, isCorrect);
  };

  let matchSelection = null;
  let matchedPairs = new Set();
  window.__matchPick = (side, idx) => {
    if (matchedPairs.has(idx)) return;
    const btn = document.querySelector(`[data-side="${side}"][data-idx="${idx}"]`);
    if (!matchSelection) {
      matchSelection = { side, idx, btn };
      btn.classList.add('selected');
    } else {
      if (matchSelection.side === side) {
        matchSelection.btn.classList.remove('selected');
        matchSelection = { side, idx, btn };
        btn.classList.add('selected');
      } else {
        const leftIdx = side === 'left' ? idx : matchSelection.idx;
        const rightIdx = side === 'right' ? idx : matchSelection.idx;
        if (leftIdx === rightIdx) {
          btn.classList.add('correct');
          matchSelection.btn.classList.add('correct');
          matchedPairs.add(leftIdx);
          correct++;
        } else {
          btn.classList.add('wrong');
          matchSelection.btn.classList.add('wrong');
          setTimeout(() => { btn.classList.remove('wrong'); matchSelection.btn.classList.remove('wrong'); }, 600);
        }
        matchSelection.btn.classList.remove('selected');
        matchSelection = null;
        if (matchedPairs.size === exercises[current].pairs.length) setTimeout(nextExercise, 800);
      }
    }
  };

  window.__choose = (i) => {
    const ex = exercises[current];
    const isCorrect = ex.options[i] === ex.correct;
    document.querySelectorAll('.exercise-option').forEach((btn, idx) => {
      if (ex.options[idx] === ex.correct) btn.classList.add('correct');
      else if (idx === i) btn.classList.add('wrong');
      btn.style.pointerEvents = 'none';
    });
    showFeedback(isCorrect, ex.correct);
    recordAnswer(ex.correct, isCorrect);
  };

  window.__fillChoose = (i) => {
    const ex = exercises[current];
    const isCorrect = ex.options[i] === ex.blank;
    const slot = document.getElementById('blank-slot');
    slot.textContent = ex.options[i];
    slot.style.color = isCorrect ? 'var(--ok)' : 'var(--no)';
    document.querySelectorAll('.exercise-option').forEach((btn, idx) => {
      if (ex.options[idx] === ex.blank) btn.classList.add('correct');
      else if (idx === i && !isCorrect) btn.classList.add('wrong');
      btn.style.pointerEvents = 'none';
    });
    showFeedback(isCorrect, ex.blank);
    recordAnswer(ex.sentence, isCorrect);
  };

  window.__checkTranslate = () => {
    const ex = exercises[current];
    const input = document.getElementById('answer-input');
    const userAnswer = input.value.trim();
    const accepted = ex.accept.map(a => a.toLowerCase().replace(/\s/g, ''));
    const isCorrect = accepted.includes(userAnswer.toLowerCase().replace(/\s/g, ''));
    input.style.borderColor = isCorrect ? 'var(--ok)' : 'var(--no)';
    input.disabled = true;
    showFeedback(isCorrect, ex.answer);
    recordAnswer(ex.answer, isCorrect);
  };

  function showFeedback(isCorrect, correctAnswer) {
    if (isCorrect) correct++;
    else hearts--;
    const fb = document.getElementById('feedback');
    fb.innerHTML = `<div class="card pop" style="padding:14px 18px;margin-top:12px;border-color:${isCorrect ? 'var(--ok)' : 'var(--no)'}">
      <div style="font-weight:600;color:${isCorrect ? 'var(--ok)' : 'var(--no)'}">${isCorrect ? '¡Correcto!' : 'Incorrecto'}</div>
      ${!isCorrect ? `<div class="muted small mt-8">Respuesta: <strong>${correctAnswer}</strong></div>` : ''}
    </div>
    <button class="btn mt-12 ${isCorrect ? 'btn-ok' : ''}" onclick="window.__next()">Continuar</button>`;
    if (hearts <= 0) {
      fb.innerHTML += `<div class="muted small center mt-8">Sin vidas — reiniciando</div>`;
      setTimeout(() => { current = 0; hearts = 3; correct = 0; pickedWords = []; renderExercise(); }, 1500);
    }
  }

  function nextExercise() { current++; pickedWords = []; matchSelection = null; matchedPairs = new Set(); renderExercise(); }
  window.__next = () => nextExercise();
  window.__quitLesson = () => go('home');

  function finish() {
    const stars = hearts === 3 ? 3 : hearts === 2 ? 2 : 1;
    completeUnit(params.level, params.unit);
    el.innerHTML = `<div class="fade center" style="padding-top:60px">
      <div style="font-size:60px;margin-bottom:16px">${'⭐'.repeat(stars)}</div>
      <div class="h1 mb-8">¡Lección completada!</div>
      <div class="muted mb-16">${correct}/${exercises.length} correctas</div>
      <div class="card" style="padding:20px;margin-bottom:20px">
        <div class="flex items-center justify-between"><span>XP ganados</span><strong>+10</strong></div>
      </div>
      <button class="btn" onclick="window.__nav('home')">Continuar</button>
    </div>`;
  }
});
