import { S, completeUnit, completeSet, update } from '../state.js?v=202611140100';
import { buildReview } from '../engine/review.js?v=202611140100';
import { addCards } from '../engine/anki.js?v=202611140100';
import { register, go } from '../router.js?v=202611140100';
import { loadUnit, loadVocab, loadExtra } from '../data.js?v=202611140100';
import { generateExercises, unitVocab, reshuffle, tr, checkTyped } from '../engine/exercises.js?v=202611140100';
import { tonedPinyin, ruby, pyReady, sylReady } from '../ja.js?v=202611140100';
import { recordAnswer } from '../engine/srs.js?v=202611140100';
import { progressBar } from '../ui/components.js?v=202611140100';
import { icon } from '../ui/icons.js?v=202611140100';
import { t } from '../i18n.js?v=202611140100';
import { speak, stop as stopAudio } from '../audio.js?v=202611140100';
import { allHanzi } from './review.js?v=202611140100';
import { charWord, hasChars } from '../chars.js?v=202611140100';

const MAX_HEARTS = 5;

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmt(key, arg) {
  return t(key).replace('{w}', esc(arg));
}

const onlyHan = s => [...String(s)].filter(c => /[\u3400-\u9fff]/.test(c)).join('');

// Chinese answer with pinyin above (ruby) when the pinyin is known.
function zhAnswer(text, py) {
  return /[\u3400-\u9fff]/.test(text) ? ruby(text, py ? { py } : {}) : esc(text);
}

register('lesson', async (el, params) => {
  await pyReady; await sylReady;
  const review = params.review ? await buildReview() : null;
  if (review && !review.queue.length) {
    el.innerHTML = `<div class="fade center" style="padding-top:60px">
      <div style="font-size:56px;margin-bottom:12px">🌱</div>
      <div class="h2 mb-8">復習</div>
      <div class="muted mb-16">${t('reviewEmpty')}</div>
      <button class="btn" onclick="window.__nav('home')">${t('continue')}</button></div>`;
    return;
  }
  let unit = review
    ? { title: { es: 'Repaso', en: 'Review', ja: '復習', ko: '복습' }, exercises: [] }
    : await loadUnit(params.level, params.unit);
  if (!unit) { go('home'); return; }
  // Sets 2–7 are optional extra practice: different sentences and a different slice of the unit's vocabulary.
  const setNo = review ? 1 : Math.max(1, +params.set || 1);
  if (setNo > 1) {
    let x = null;
    try { x = (await loadExtra(params.level))[String(params.unit)]; } catch (e) {}
    if (!x || !x.sets[setNo - 2]) { go('home'); return; }
    unit = { ...unit, exercises: x.sets[setNo - 2], newVocab: x.words[setNo - 2] };
  }

  const hanziMap = await allHanzi().catch(() => null);
  let levelVocab = [];
  if (!review) try { levelVocab = await loadVocab(params.level); } catch (e) {}

  const lang = S.lang || 'en';
  const vocabSet = new Set(levelVocab.map(v => v.word));
  const words = review ? [] : unitVocab(unit, levelVocab);
  const grammarHtml = unit.grammarIntro
    ? tr(unit.grammarIntro, lang)
    : (unit.grammar || []).length ? `<ul>${unit.grammar.map(g => `<li><strong>${esc(g)}</strong></li>`).join('')}</ul>` : '';

  let queue, total, solved, hearts, mistakes, firstTryCorrect;
  let vocabIdx = 0;

  function resetPractice() {
    queue = review ? review.queue.map(e => ({ ...e })) : generateExercises(unit, words, levelVocab);
    total = queue.length;
    solved = 0;
    hearts = MAX_HEARTS;
    mistakes = 0;
    firstTryCorrect = 0;
  }

  function stepper(active) {
    const steps = [
      grammarHtml ? ['grammar', t('stepGrammar')] : null,
      words.length ? ['vocab', t('stepVocab')] : null,
      ['practice', t('stepPractice')],
    ].filter(Boolean);
    return `<div class="stepper">${steps.map(([id, label], i) =>
      `<button class="step ${id === active ? 'on' : ''}" onclick="window.__goStep('${id}')"><span class="num">${i + 1}</span>${label}</button>`).join('')}</div>`;
  }

  window.__goStep = (id) => {
    if (id === 'grammar') renderGrammar();
    else if (id === 'vocab') startVocab();
    else startPractice();
  };

  function topBar(title, active) {
    return `<div class="flex items-center gap-12 mb-12">
        <button onclick="window.__quitLesson()" style="padding:4px">${icon('back', 20, 'var(--ink2)')}</button>
        <div class="grow"><span class="h3">${esc(title)}</span></div>
      </div>
      ${stepper(active)}`;
  }

  const unitTitle = tr(unit.title, lang);

  // ── Step 1: grammar ───────────────────────────────────────────
  function renderGrammar() {
    el.innerHTML = `<div class="grammar-page fade">
      ${topBar(unitTitle, 'grammar')}
      <div class="grammar-section" onclick="window.__zhSpeak(event)">${grammarHtml}</div>
      <button class="btn" onclick="window.__afterGrammar()">${words.length ? t('toVocab') : t('startExercises')}</button>
    </div>`;
    window.scrollTo(0, 0);
  }

  window.__zhSpeak = (e) => { const z = e.target.closest('.zh'); if (z) speak(z.textContent.trim()); };
  window.__afterGrammar = () => words.length ? startVocab() : startPractice();

  // ── Step 2: vocabulary flashcards ─────────────────────────────
  function startVocab() {
    vocabIdx = 0;
    renderVocab();
  }

  function renderVocab() {
    const w = words[vocabIdx];
    const last = vocabIdx === words.length - 1;
    el.innerHTML = `<div class="fade" style="padding-top:16px">
      ${topBar(unitTitle, 'vocab')}
      <div class="flex items-center gap-12 mb-16">
        <div class="grow">${progressBar(((vocabIdx + 1) / words.length) * 100)}</div>
        <span class="muted small">${vocabIdx + 1} / ${words.length}</span>
      </div>
      <div class="card vocab-card pop" onclick="window.__speakWord()">
        <div class="speaker">🔊</div>
        ${hasChars(w.word, hanziMap) ? charWord(w.word, hanziMap, { size: 60 }) : `<div class="vocab-es zh-word">${esc(w.word)}</div>`}
        <div class="anki-py" style="font-size:20px">${tonedPinyin(w.p || '', { play: true })}</div>
        <div class="vocab-tr">${esc(tr(w.m, lang))}</div>
        <div class="muted small mt-12">${t('listen')}</div>
      </div>
      <div class="flex gap-12 mt-16">
        ${vocabIdx > 0 ? `<button class="btn btn-ghost" onclick="window.__vocabPrev()">${t('prevWord')}</button>` : ''}
        <button class="btn" onclick="window.__vocabNext()">${last ? t('startExercises') : t('nextWord')}</button>
      </div>
      <div class="muted small mb-8 mt-24" style="font-weight:600">${t('newWords')}</div>
      <div class="vocab-pills">${words.map((v, i) =>
        `<span class="vocab-pill ${i === vocabIdx ? 'on' : ''}" onclick="window.__vocabGo(${i})"><span class="es">${esc(v.word)}</span><span class="tr">${tonedPinyin(v.p || '')}</span><span class="tr">${esc(tr(v.m, lang))}</span></span>`).join('')}</div>
    </div>`;
    speak(w.word);
  }

  window.__speakWord = () => speak(words[vocabIdx].word);
  window.__vocabPrev = () => { if (vocabIdx > 0) { vocabIdx--; renderVocab(); } };
  window.__vocabGo = (i) => { vocabIdx = i; renderVocab(); };
  window.__vocabNext = () => {
    if (vocabIdx < words.length - 1) { vocabIdx++; renderVocab(); }
    else startPractice();
  };

  // ── Step 3: practice ──────────────────────────────────────────
  function startPractice() {
    resetPractice();
    renderExercise();
  }

  function current() { return queue[0]; }

  function renderExercise() {
    if (!queue.length) { finish(); return; }
    const ex = current();
    const pct = Math.round((solved / total) * 100);
    const help = grammarHtml || words.length
      ? `<button class="chip" style="font-size:12px;padding:4px 10px;margin-bottom:10px" onclick="window.__showHelp()">📖 ${t('grammarTip')}</button>`
      : '';

    el.innerHTML = `<div class="fade" style="padding-top:16px">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__quitLesson()" style="padding:4px">${icon('back', 20, 'var(--ink2)')}</button>
        <div class="grow">${progressBar(pct)}</div>
        <div class="flex items-center" style="gap:4px;font-weight:700">❤️ ${hearts}</div>
      </div>
      ${help}
      ${ex.retry ? `<div class="muted small mb-8">🔁 ${t('retryNow')}</div>` : ''}
      ${review && !ex.retry && ex.src ? `<div class="review-src small mb-8">${{ weak: '🧠 ' + t('srcWeak'), drill: '🎯 ' + t('srcDrill'), recent: '🕘 ' + t('srcRecent') }[ex.src]}</div>` : ''}
      <div id="exercise-area">${renderByType(ex)}</div>
    </div>`;
    if (ex.type === 'listen') setTimeout(() => speak(ex.text), 300);
    if (ex.type === 'translate') {
      const input = document.getElementById('answer-input');
      input.focus();
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !input.disabled) window.__checkTranslate(); });
    }
  }

  function promptOf(ex) {
    return ex.promptKey ? fmt(ex.promptKey, ex.promptArg) : esc(ex.prompt);
  }

  function hintOf(ex) {
    return ex.hint ? `<div class="muted small mb-8">${esc(ex.hint)}</div>` : '';
  }

  function optionsHtml(ex, handler) {
    return `<div id="options">${ex.options.map((opt, i) =>
      `<button class="exercise-option ${ex.kind === 'tone' ? 'py-opt' : /[\u3400-\u9fff]/.test(opt) ? 'zh-opt' : ''}" onclick="window.${handler}(${i})">${ex.kind === 'tone' ? tonedPinyin(opt) : esc(opt)}</button>`).join('')}</div>`;
  }

  function renderByType(ex) {
    switch (ex.type) {
      case 'choose':
        return `<div class="slideup">${hintOf(ex)}
          <div class="h3 mb-16">${ex.promptKey === 'whatMeans' || ex.promptKey === 'whichPinyin' ? t(ex.promptKey + 'Q') + `<div class="zh-prompt">${esc(ex.promptArg)}</div>` : promptOf(ex)}${ex.speak && ex.kind !== 'tone' ? ` <button onclick="window.__speak()" style="font-size:18px">🔊</button>` : ''}</div>
          ${optionsHtml(ex, '__choose')}<div id="feedback"></div></div>`;
      case 'listen':
        return `<div class="slideup">
          <div class="h3 mb-16">${t('whatHear')}</div>
          <button class="card listen-btn" onclick="window.__speak()">🔊</button>
          ${optionsHtml(ex, '__choose')}<div id="feedback"></div></div>`;
      case 'translate':
        return `<div class="slideup">${hintOf(ex)}
          <div class="h3 mb-16">${promptOf(ex)}</div>
          <input type="text" id="answer-input" lang="ja" placeholder="${t('typeZh')}" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-bottom:8px">
          <div class="muted small mb-12">${t('typeZhHelp')}</div>
          <button class="btn" id="check-btn" onclick="window.__checkTranslate()">${t('check')}</button>
          <div id="feedback" class="mt-12"></div></div>`;
      case 'fill': {
        const parts = ex.sentence.split('___');
        return `<div class="slideup">${hintOf(ex)}
          <div class="card" style="padding:20px;margin-bottom:16px;font-size:22px;line-height:1.8">
            <span class="zh">${esc(parts[0])}<span class="blank" id="blank-slot">&nbsp;</span>${esc(parts[1] || '')}</span>
            ${ex.trans ? `<div class="muted small mt-8" style="font-size:14px">${esc(ex.trans)}</div>` : ''}
          </div>
          ${optionsHtml(ex, '__fillChoose')}<div id="feedback"></div></div>`;
      }
      case 'order':
        return `<div class="slideup">${hintOf(ex)}
          <div class="h3 mb-16">${promptOf(ex)}</div>
          <div class="sentence-area" id="sentence-area"></div>
          <div class="wordbank">${ex.words.map((w, i) =>
            `<button class="wordchip" id="wc-${i}" onclick="window.__pickWord(${i})">${esc(w)}</button>`).join('')}</div>
          <button class="btn mt-16" id="check-btn" onclick="window.__checkOrder()">${t('check')}</button>
          <div id="feedback" class="mt-12"></div></div>`;
      case 'match': {
        // A freshly rendered match board has nothing matched yet (guards against stale state from a previous board).
        if (matchEx !== ex) { matchEx = ex; matched = new Set(); matchErrors = 0; }
        matchSel = null;
        ex.leftOrder = ex.leftOrder || shuffleIdx(ex.pairs.length);
        ex.rightOrder = ex.rightOrder || shuffleIdx(ex.pairs.length);
        const col = (side, order) => `<div class="flex flex-col">${order.map(i =>
          `<button class="exercise-option ${side === 'left' ? 'zh-opt' : ''} ${matched.has(i) ? 'correct' : ''}" data-side="${side}" data-idx="${i}" onclick="window.__matchPick('${side}',${i})">${side === 'left' ? ruby(ex.pairs[i][side]) : esc(ex.pairs[i][side])}</button>`).join('')}</div>`;
        return `<div class="slideup">
          <div class="h3 mb-16">${t('connectPairs')}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${col('left', ex.leftOrder)}${col('right', ex.rightOrder)}</div>
          <div id="feedback" class="mt-12"></div></div>`;
      }
      default:
        return '<div>Unknown exercise type</div>';
    }
  }

  function shuffleIdx(n) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  window.__speak = () => { const ex = current(); speak(ex.text || ex.speak); };

  window.__insertChar = (c) => {
    const input = document.getElementById('answer-input');
    if (!input || input.disabled) return;
    const s = input.selectionStart ?? input.value.length;
    input.value = input.value.slice(0, s) + c + input.value.slice(input.selectionEnd ?? s);
    input.focus();
    input.setSelectionRange(s + 1, s + 1);
  };

  function lockOptions() {
    document.querySelectorAll('#options .exercise-option').forEach(b => { b.style.pointerEvents = 'none'; });
  }

  window.__choose = (i) => {
    const ex = current();
    const isCorrect = ex.options[i] === ex.correct;
    document.querySelectorAll('#options .exercise-option').forEach((btn, idx) => {
      if (ex.options[idx] === ex.correct) btn.classList.add('correct');
      else if (idx === i) btn.classList.add('wrong');
    });
    lockOptions();
    if (ex.type === 'listen' || ex.vocab) speak(ex.vocab || ex.correct);
    const shown = ex.kind === 'tone' ? `${esc(ex.vocab)} ${tonedPinyin(ex.correct)}` : ex.vocab && ex.correct !== ex.vocab ? `${zhAnswer(ex.vocab, ex.py)} = ${esc(ex.correct)}` : zhAnswer(ex.correct, ex.py);
    answered(isCorrect, shown, ex.vocab || ex.correct, '', true);
  };

  window.__fillChoose = (i) => {
    const ex = current();
    const isCorrect = ex.options[i] === ex.blank;
    const slot = document.getElementById('blank-slot');
    slot.textContent = ex.options[i];
    slot.style.color = isCorrect ? 'var(--ok)' : 'var(--no)';
    document.querySelectorAll('#options .exercise-option').forEach((btn, idx) => {
      if (ex.options[idx] === ex.blank) btn.classList.add('correct');
      else if (idx === i) btn.classList.add('wrong');
    });
    lockOptions();
    const full = ex.sentence.replace('___', ex.blank);
    speak(full);
    answered(isCorrect, zhAnswer(full, ex.py), ex.sentence, isCorrect ? zhAnswer(full, ex.py) : '', true);
  };

  window.__checkTranslate = () => {
    const ex = current();
    const input = document.getElementById('answer-input');
    if (!input.value.trim()) return;
    const res = checkTyped(input.value, ex);
    const isCorrect = res.ok;
    let note = isCorrect ? zhAnswer(ex.answer, ex.py) : '';
    if (res.note === 'tones') note = `${t('accentNote')} ${zhAnswer(ex.answer, ex.py)}`;
    input.style.borderColor = isCorrect ? 'var(--ok)' : 'var(--no)';
    input.disabled = true;
    document.getElementById('check-btn').style.display = 'none';
    speak(ex.answer);
    answered(isCorrect, zhAnswer(ex.answer, ex.py), ex.vocab || ex.answer, note, true);
  };

  let picked = [];
  function renderPicked() {
    const ex = current();
    document.getElementById('sentence-area').innerHTML = picked.map((wi, pos) =>
      `<button class="wordchip" onclick="window.__unpickWord(${pos})">${esc(ex.words[wi])}</button>`).join('');
  }
  window.__pickWord = (i) => {
    const chip = document.getElementById(`wc-${i}`);
    if (chip.classList.contains('used')) return;
    chip.classList.add('used');
    picked.push(i);
    renderPicked();
  };
  window.__unpickWord = (pos) => {
    const [wi] = picked.splice(pos, 1);
    const chip = document.getElementById(`wc-${wi}`);
    if (chip) chip.classList.remove('used');
    renderPicked();
  };
  window.__checkOrder = () => {
    const ex = current();
    if (!picked.length) return;
    const user = picked.map(i => ex.words[i]).join('');
    const isCorrect = onlyHan(user) === onlyHan(ex.answer);
    document.getElementById('check-btn').style.display = 'none';
    document.querySelectorAll('.wordchip').forEach(c => { c.style.pointerEvents = 'none'; });
    speak(ex.answer);
    answered(isCorrect, zhAnswer(ex.answer, ex.py), ex.answer, isCorrect ? zhAnswer(ex.answer, ex.py) : '', true);
  };

  let matchSel = null;
  let matched = new Set();
  let matchErrors = 0;
  let matchEx = null;
  window.__matchPick = (side, idx) => {
    if (matched.has(idx)) return;
    const ex = current();
    const btn = document.querySelector(`[data-side="${side}"][data-idx="${idx}"]`);
    if (side === 'left') speak(ex.pairs[idx].left);
    if (!matchSel || matchSel.side === side) {
      if (matchSel) matchSel.btn.classList.remove('selected');
      matchSel = { side, idx, btn };
      btn.classList.add('selected');
      return;
    }
    const prev = matchSel;
    prev.btn.classList.remove('selected');
    matchSel = null;
    if (prev.idx === idx) {
      btn.classList.add('correct');
      prev.btn.classList.add('correct');
      matched.add(idx);
      recordAnswer(ex.pairs[idx].left, true);
      if (matched.size === ex.pairs.length) {
        const perfect = matchErrors === 0;
        if (perfect) firstTryCorrect++;
        solved++;
        queue.shift();
        // matched stays full until the next render so late clicks are ignored
        setTimeout(() => { resetExerciseState(); renderExercise(); }, 600);
      }
    } else {
      matchErrors++;
      mistakes++;
      btn.classList.add('wrong');
      prev.btn.classList.add('wrong');
      setTimeout(() => { btn.classList.remove('wrong'); prev.btn.classList.remove('wrong'); }, 600);
    }
  };

  function answered(isCorrect, correctAnswer, srsKey, note = '', html = false) {
    const ex = current();
    // Only vocabulary words count as "seen" (not whole sentences or translations).
    if (srsKey && (ex.vocab || vocabSet.has(srsKey))) recordAnswer(srsKey, isCorrect);
    if (isCorrect) {
      solved++;
      if (!ex.retry) firstTryCorrect++;
    } else {
      hearts--;
      mistakes++;
    }

    const fb = document.getElementById('feedback');
    fb.innerHTML = `<div class="card pop" style="padding:14px 18px;margin-top:12px;border-color:${isCorrect ? 'var(--ok)' : 'var(--no)'}">
      <div style="font-weight:600;color:${isCorrect ? 'var(--ok)' : 'var(--no)'}">${isCorrect ? t('correct') : t('incorrect')}</div>
      ${note ? `<div class="mt-8 fb-zh">${note}</div>` : ''}
      ${!isCorrect ? `<div class="muted small mt-8">${t('answer')}: <strong>${html ? correctAnswer : esc(correctAnswer)}</strong></div>
        <div class="muted small mt-8">${t('retryLater')}</div>` : ''}
    </div>
    <button class="btn mt-12 ${isCorrect ? 'btn-ok' : ''}" id="next-btn" onclick="window.__next(${isCorrect})">${t('continue')}</button>`;

    if (hearts <= 0) {
      fb.innerHTML += `<div class="muted small center mt-8">${t('noLives')}</div>`;
      document.getElementById('next-btn').remove();
      setTimeout(startPractice, 1800);
    } else {
      document.getElementById('next-btn').focus();
    }
  }

  function resetExerciseState() {
    picked = [];
    matchSel = null;
    matched = new Set();
    matchErrors = 0;
  }

  window.__next = (wasCorrect) => {
    const ex = queue.shift();
    if (!wasCorrect) queue.push(reshuffle(ex));
    resetExerciseState();
    renderExercise();
  };

  window.__quitLesson = () => { stopAudio(); go('home'); };

  window.__showHelp = () => {
    const vocabList = words.map(v =>
      `<span class="vocab-pill"><span class="es">${esc(v.word)}</span><span class="tr">${esc(tr(v.m, lang))}</span></span>`).join('');
    const sheet = document.createElement('div');
    sheet.className = 'sheet-backdrop fade';
    sheet.innerHTML = `<div class="sheet slideup">
      <div class="flex items-center justify-between mb-12">
        <span class="h3">${esc(unitTitle)}</span>
        <button class="btn btn-soft btn-small" onclick="this.closest('.sheet-backdrop').remove()">${t('close')}</button>
      </div>
      ${grammarHtml ? `<div class="grammar-section">${grammarHtml}</div>` : ''}
      ${vocabList ? `<div class="muted small mb-8" style="font-weight:600">${t('newWords')}</div><div class="vocab-pills">${vocabList}</div>` : ''}
    </div>`;
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
    document.body.appendChild(sheet);
  };

  function finishReview() {
    const accuracy = total ? Math.round(firstTryCorrect / total * 100) : 100;
    update({ lastReview: new Date().toISOString().slice(0, 10), xp: S.xp + 5 });
    el.innerHTML = `<div class="fade center" style="padding-top:60px">
      <div style="font-size:60px;margin-bottom:16px">${accuracy >= 80 ? '🎉' : accuracy >= 50 ? '👍' : '💪'}</div>
      <div class="h1 mb-8">${t('reviewDone')}</div>
      <div class="muted mb-16">${firstTryCorrect}/${total} ${t('correctCount')} · ${mistakes} ${t('mistakes')}</div>
      ${review.units.length ? `<div class="card mb-16" style="padding:14px;text-align:left"><div class="muted small mb-8">🕘 ${t('srcRecent')}</div>
        ${review.units.map(u => `<div class="small">${u.level.toUpperCase()} · ${t('unit')} ${u.unit} — ${u.title}</div>`).join('')}</div>` : ''}
      <div class="card" style="padding:20px;margin-bottom:20px">
        <div class="flex items-center justify-between"><span>${t('xpEarned')}</span><strong>+5</strong></div>
      </div>
      <button class="btn" onclick="window.__nav('home')">${t('continue')}</button>
    </div>`;
  }

  function finishSet() {
    const rank = new Map(levelVocab.map(v => [v.word, v.q]));
    addCards(words.map(w => w.word), 'v', w => rank.get(w) ?? 99999);
    completeSet(params.level, params.unit, setNo);
    const accuracy = total ? firstTryCorrect / total : 1;
    const stars = mistakes === 0 ? 3 : accuracy >= 0.8 ? 2 : 1;
    const next = setNo < 7 ? setNo + 1 : 0;
    el.innerHTML = `<div class="fade center" style="padding-top:60px">
      <div style="font-size:60px;margin-bottom:16px">${'⭐'.repeat(stars)}</div>
      <div class="h1 mb-8">${t('setDone').replace('{n}', setNo)}</div>
      <div class="muted mb-16">${firstTryCorrect}/${total} ${t('correctCount')} · ${mistakes} ${t('mistakes')}</div>
      <div class="card" style="padding:20px;margin-bottom:20px">
        <div class="flex items-center justify-between"><span>${t('xpEarned')}</span><strong>+5</strong></div>
      </div>
      ${next ? `<button class="btn mb-12" onclick="window.__go('lesson',{level:'${params.level}',unit:${params.unit},set:${next}})">${t('nextSet')} (${next}/7) →</button>` : ''}
      <button class="btn ${next ? 'btn-ghost' : ''}" onclick="window.__nav('home')">${t('continue')}</button>
    </div>`;
  }

  function finish() {
    if (review) { finishReview(); return; }
    if (setNo > 1) { finishSet(); return; }
    // The unit's new words first, then the rest of its frequency band, ordered by frequency.
    const rank = new Map(levelVocab.map(v => [v.word, v.q]));
    // Only the words taught in the lesson go to the deck; the rest of the band arrives as new cards via "Aprender palabras nuevas".
    addCards(words.map(w => w.word), 'v', w => rank.get(w) ?? 99999);
    const accuracy = total ? firstTryCorrect / total : 1;
    const stars = mistakes === 0 ? 3 : accuracy >= 0.8 ? 2 : 1;
    completeUnit(params.level, params.unit);

    el.innerHTML = `<div class="fade center" style="padding-top:60px">
      <div style="font-size:60px;margin-bottom:16px">${'⭐'.repeat(stars)}</div>
      <div class="h1 mb-8">${t('completed')}</div>
      <div class="muted mb-16">${firstTryCorrect}/${total} ${t('correctCount')} · ${mistakes} ${t('mistakes')}</div>
      <div class="card" style="padding:20px;margin-bottom:20px">
        <div class="flex items-center justify-between">
          <span>${t('xpEarned')}</span><strong>+10</strong>
        </div>
      </div>
      <button class="btn" onclick="window.__nav('home')">${t('continue')}</button>
    </div>`;
  }

  const start = review || setNo > 1 ? 'practice' : params.start;
  if (start === 'practice') startPractice();
  else if (start === 'vocab' && words.length) startVocab();
  else if (grammarHtml) renderGrammar();
  else if (words.length) startVocab();
  else startPractice();
});
