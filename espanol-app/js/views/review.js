// Vocabulary deck with Anki (SM-2) scheduling: forgotten and due cards first, then new ones.
import { S, update } from '../state.js';
import { register } from '../router.js';
import { loadVocab, loadUnits } from '../data.js';
import { LEVELS } from '../levels.js';
import { addCards, seedFromHistory, deckStats, buildQueue, answer, previewLabel, isForgotten } from '../engine/anki.js';
import { unitVocab, tr } from '../engine/exercises.js';
import { failedWords, markFixed } from '../engine/srs.js';
import { bottomNav, header, progressBar } from '../ui/components.js';
import { speak } from '../audio.js';
import { t } from '../i18n.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let vocabMap = null;
export async function allVocab() {
  if (vocabMap) return vocabMap;
  vocabMap = new Map();
  for (const l of LEVELS) {
    try { for (const v of await loadVocab(l)) if (v.word && !vocabMap.has(v.word)) vocabMap.set(v.word, v); } catch (e) {}
  }
  return vocabMap;
}

// First visit: import practised words and the vocabulary of units already completed.
async function seed(vm) {
  if (S.cardsSeeded) return;
  seedFromHistory(new Set(vm.keys()));
  for (const l of LEVELS) {
    if (!Object.keys(S.completed || {}).some(k => k.startsWith(l + '-'))) continue;
    let units = [], lv = [];
    try { units = await loadUnits(l); lv = await loadVocab(l); } catch (e) { continue; }
    units.forEach((u, i) => { if (S.completed[`${l}-${i + 1}`]) addCards(unitVocab(u, lv).map(w => w.word)); });
  }
}

const ARTICLE = { m: 'el', f: 'la' };

register('review', async (el, params = {}) => {
  const vm = await allVocab();
  await seed(vm);
  if (params.mode === 'failed') return runFailed(el, vm);
  const st = deckStats();
  const nFailed = failedWords(new Set(vm.keys()), 999).length;
  const failedBtn = nFailed ? `<button class="card study-opt mt-12" onclick="window.__go('review', {mode:'failed'})">
      <span class="study-ic">❌</span>
      <div class="grow" style="text-align:left"><div class="study-es">${t('failedReview')}</div><div class="muted small">${t('failedReviewTr')} · <b style="color:var(--no)">${nFailed}</b></div></div>
      <span class="muted">›</span></button>` : '';

  if (!st.pending) {
    el.innerHTML = `<div class="fade">
      ${header(t('vocabReview'))}
      ${deckSummary(st)}
      <div class="center" style="padding-top:30px">
        <div style="font-size:48px;margin-bottom:16px">${st.total ? '🎉' : '🗂️'}</div>
        <div class="h3 mb-8">${st.total ? t('allDone') : t('deckEmpty')}</div>
        <div class="muted">${st.total ? t('noDue') : t('deckEmptyHint')}</div>
        <button class="btn mt-24" onclick="window.__nav('home')">${t('keepLearn')}</button>
      </div>
      ${failedBtn}
    </div>${bottomNav('review')}`;
    return;
  }

  let queue = buildQueue();
  const total = queue.length;
  let done = 0, again = 0;
  const lang = S.lang || 'en';
  const reverse = !!S.cardsReverse;

  function render() {
    // Learning cards answered "again" come back within the session once due.
    if (!queue.length) {
      const back = buildQueue(20, Date.now() + 10 * 60 * 1000).filter(w => S.cards[w].s !== 'new' && S.cards[w].s !== 'review');
      if (back.length) queue = back; else return finish();
    }
    const w = queue[0];
    const card = S.cards[w];
    const v = vm.get(w) || { word: w, m: {} };
    const art = v.gender && ARTICLE[v.gender] && !w.includes(' ') ? `<span class="muted">${ARTICLE[v.gender]} </span>` : '';
    const es = `${art}${esc(w)}`;
    const meaning = esc(tr(v.m, lang));
    const tag = card.s === 'new' ? ['new', t('cardNew')] : isForgotten(card) ? ['forgot', t('cardForgotten')] : card.s === 'review' ? ['due', t('cardDue')] : ['learn', t('cardLearning')];
    el.innerHTML = `<div class="fade" style="padding-top:16px">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__nav('review')" style="padding:4px">←</button>
        <div class="grow">${progressBar(done / Math.max(total, done + queue.length) * 100)}</div>
        <button class="chip" style="font-size:12px;padding:4px 10px" onclick="window.__flipDir()">${reverse ? '🌐 → ES' : 'ES → 🌐'}</button>
      </div>
      <div class="card anki-card" id="anki-card" onclick="window.__ankiShow()">
        <span class="anki-tag ${tag[0]}">${tag[1]}</span>
        <button class="anki-spk" onclick="event.stopPropagation();window.__ankiSpeak()">🔊</button>
        <div class="anki-front">${reverse ? meaning : es}</div>
        <div class="anki-back" id="anki-back" style="display:none">
          <div class="anki-sep"></div>
          <div class="anki-ans">${reverse ? es : meaning}</div>
        </div>
        <div class="muted small mt-16" id="anki-hint">${t('tapToReveal')}</div>
      </div>
      <div id="anki-btns" class="anki-btns" style="visibility:hidden">
        ${[[1, 'again', t('ankiAgain')], [2, 'hard', t('ankiHard')], [3, 'good', t('ankiGood')], [4, 'easy', t('ankiEasy')]].map(([r, c, l]) =>
          `<button class="anki-btn ${c}" onclick="window.__ankiRate(${r})"><span class="ivl">${previewLabel(card, r)}</span>${l}</button>`).join('')}
      </div>
      <div class="muted small center mt-12">${t('cardsLeft')}: ${queue.length}</div>
    </div>`;
    if (!reverse) speak(w);
  }

  window.__ankiSpeak = () => speak(queue[0]);
  window.__ankiShow = () => {
    const back = document.getElementById('anki-back');
    if (!back || back.style.display !== 'none') return;
    back.style.display = 'block';
    document.getElementById('anki-hint').style.display = 'none';
    document.getElementById('anki-btns').style.visibility = 'visible';
    if (reverse) speak(queue[0]);
  };
  window.__ankiRate = (r) => {
    const w = queue.shift();
    const c = answer(w, r);
    if (r === 1) again++;
    // Re-show learning cards later in the session.
    if (c.s !== 'review') queue.splice(Math.min(queue.length, 4), 0, w);
    else done++;
    render();
  };
  window.__flipDir = () => { update({ cardsReverse: !S.cardsReverse }); window.__nav('review'); };
  window.__ankiKeys = (e) => {
    if (!document.getElementById('anki-card')) return document.removeEventListener('keydown', window.__ankiKeys);
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); window.__ankiShow(); }
    else if (['1', '2', '3', '4'].includes(e.key) && document.getElementById('anki-btns').style.visibility === 'visible') window.__ankiRate(+e.key);
  };
  document.removeEventListener('keydown', window.__ankiKeys);
  document.addEventListener('keydown', window.__ankiKeys);

  function finish() {
    el.innerHTML = `<div class="fade center" style="padding-top:50px">
      <div style="font-size:56px;margin-bottom:12px">🎉</div>
      <div class="h2 mb-8">${t('reviewDone')}</div>
      <div class="muted mb-16">${done} ${t('cardsStudied')} · ${again} × ${t('ankiAgain')}</div>
      ${deckSummary(deckStats())}
      <button class="btn mt-16" onclick="window.__nav('home')">${t('continue')}</button>
    </div>${bottomNav('review')}`;
  }

  el.innerHTML = `<div class="fade">
    ${header(t('vocabReview'))}
    ${deckSummary(st)}
    <div class="muted small mb-16">${t('ankiExplain')}</div>
    <button class="btn" onclick="window.__ankiStart()">${t('startReview')} (${total})</button>
    ${failedBtn}
  </div>${bottomNav('review')}`;
  window.__ankiStart = render;
});

// Words the learner got wrong in previous lessons: simple know / don't-know cards until each is fixed.
function runFailed(el, vm) {
  let queue = failedWords(new Set(vm.keys()));
  const lang = S.lang || 'en';
  const total = queue.length;
  let fixed = 0;
  if (!total) {
    el.innerHTML = `<div class="fade">${header(t('failedReview'))}
      <div class="center" style="padding-top:30px"><div style="font-size:48px;margin-bottom:16px">🎉</div>
      <div class="h3 mb-8">${t('noFailed')}</div>
      <button class="btn mt-24" onclick="window.__nav('review')">${t('vocabReview')}</button></div>
    </div>${bottomNav('review')}`;
    return;
  }
  function render() {
    if (!queue.length) return finish();
    const w = queue[0];
    const v = vm.get(w) || { word: w, m: {} };
    const art = v.gender && ARTICLE[v.gender] && !w.includes(' ') ? `<span class="muted">${ARTICLE[v.gender]} </span>` : '';
    const sv = S.vocab[w] || {};
    const miss = sv.miss ?? Math.max(1, (sv.seen || 0) - (sv.correct || 0));
    el.innerHTML = `<div class="fade" style="padding-top:16px">
      <div class="flex items-center gap-12 mb-12">
        <button onclick="window.__nav('review')" style="padding:4px">←</button>
        <div class="grow">${progressBar(fixed / total * 100)}</div>
      </div>
      <div class="card anki-card" id="anki-card" onclick="window.__ankiShow()">
        <span class="anki-tag forgot">${t('failedTimes').replace('{n}', miss)}</span>
        <button class="anki-spk" onclick="event.stopPropagation();window.__ankiSpeak()">🔊</button>
        <div class="anki-front">${esc(tr(v.m, lang))}</div>
        <div class="anki-back" id="anki-back" style="display:none">
          <div class="anki-sep"></div>
          <div class="anki-ans">${art}${esc(w)}</div>
        </div>
        <div class="muted small mt-16" id="anki-hint">${t('tapToReveal')}</div>
      </div>
      <div id="anki-btns" class="anki-btns" style="visibility:hidden;grid-template-columns:1fr 1fr">
        <button class="anki-btn again" onclick="window.__ankiRate(1)">${t('ankiAgain')}</button>
        <button class="anki-btn good" onclick="window.__ankiRate(3)">${t('iKnewIt')}</button>
      </div>
      <div class="muted small center mt-12">${t('cardsLeft')}: ${queue.length}</div>
    </div>`;
  }
  window.__ankiSpeak = () => speak(queue[0]);
  window.__ankiShow = () => {
    const back = document.getElementById('anki-back');
    if (!back || back.style.display !== 'none') return;
    back.style.display = 'block';
    document.getElementById('anki-hint').style.display = 'none';
    document.getElementById('anki-btns').style.visibility = 'visible';
    speak(queue[0]);
  };
  const tries = {};
  window.__ankiRate = (r) => {
    const w = queue.shift();
    if (r === 1) {
      tries[w] = 1;
      queue.splice(Math.min(queue.length, 3), 0, w);
    } else {
      // Known on first sight in this session → fixed; otherwise it stays in the failed list for next time.
      markFixed(w, !tries[w]);
      fixed++;
    }
    addCards([w]);
    render();
  };
  window.__ankiKeys = (e) => {
    if (!document.getElementById('anki-card')) return document.removeEventListener('keydown', window.__ankiKeys);
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); window.__ankiShow(); }
    else if ((e.key === '1' || e.key === '2') && document.getElementById('anki-btns').style.visibility === 'visible') window.__ankiRate(e.key === '1' ? 1 : 3);
  };
  document.removeEventListener('keydown', window.__ankiKeys);
  document.addEventListener('keydown', window.__ankiKeys);
  function finish() {
    const left = failedWords(new Set(vm.keys()), 999).length;
    el.innerHTML = `<div class="fade center" style="padding-top:50px">
      <div style="font-size:56px;margin-bottom:12px">💪</div>
      <div class="h2 mb-8">${t('reviewDone')}</div>
      <div class="muted mb-16">${Object.keys(tries).length ? `${total - Object.keys(tries).length}/${total} ✓` : `${total}/${total} ✓`}${left ? ` · ${left} ${t('stillFailed')}` : ''}</div>
      <button class="btn mt-16" onclick="window.__nav('review')">${t('continue')}</button>
    </div>${bottomNav('review')}`;
  }
  render();
}

function deckSummary(st) {
  return `<div class="deck-stats card mb-16">
    <div><b style="color:#3498db">${st.newToday}</b><span>${t('cardNew')}</span></div>
    <div><b style="color:#e67e22">${st.learn}</b><span>${t('cardLearning')}</span></div>
    <div><b style="color:var(--ok)">${st.due}</b><span>${t('cardDue')}</span></div>
    <div><b style="color:var(--no)">${st.forgotten}</b><span>${t('cardForgotten')}</span></div>
    <div><b>${st.total}</b><span>${t('cardTotal')}</span></div>
  </div>`;
}

