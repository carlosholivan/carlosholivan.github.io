import { S, save } from '../state.js';
import { register, go } from '../router.js';
import { loadVocab } from '../data.js';
import { getDailyReviewWords, markDailyReviewShown, LEVELS, getWordLevel } from '../engine/mastery.js';
import { recordAnswer } from '../engine/srs.js';
import { progressBar } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { t } from '../i18n.js';

register('daily-review', async (el) => {
  const due = getDailyReviewWords(10);
  markDailyReviewShown();
  save(S);

  if (due.length === 0) {
    go('home');
    return;
  }

  const allVocab = [...await loadVocab('a1'), ...await loadVocab('a2')];
  let current = 0;
  let correct = 0;
  let flipped = false;

  function renderCard() {
    if (current >= due.length) {
      finishReview();
      return;
    }
    const item = due[current];
    const entry = allVocab.find(v => v.word === item.word);
    const level = LEVELS[item.level];
    flipped = false;

    el.innerHTML = `<div class="fade" style="padding-top:20px">
      <div class="flex items-center justify-between mb-16">
        <div class="h3">${t('dailyReview')}</div>
        <span class="muted small">${current + 1}/${due.length}</span>
      </div>
      ${progressBar((current / due.length) * 100)}

      <div class="card center" style="padding:40px 20px;margin:20px 0;cursor:pointer" onclick="window.__flipCard()">
        <div style="font-size:11px;padding:3px 10px;border-radius:10px;display:inline-block;background:${level.color};color:#fff;margin-bottom:12px">${level.label[S.lang] || level.label.en}</div>
        <div style="font-size:28px;font-weight:600;margin-bottom:8px">${item.word}</div>
        <div id="card-meaning" style="min-height:24px">
          <span class="muted small">${t('tapToReveal')}</span>
        </div>
      </div>

      <div id="review-buttons" style="display:none">
        <div class="flex gap-12">
          <button class="btn btn-ghost grow" style="border-color:var(--no);color:var(--no)" onclick="window.__dailyAnswer(false)">${t('forgot')}</button>
          <button class="btn btn-ok grow" onclick="window.__dailyAnswer(true)">${t('remembered')}</button>
        </div>
      </div>
    </div>`;
  }

  window.__flipCard = () => {
    if (flipped) return;
    flipped = true;
    const item = due[current];
    const entry = allVocab.find(v => v.word === item.word);
    const meaning = entry ? (entry.m[S.lang] || entry.m.en) : '';

    document.getElementById('card-meaning').innerHTML = `<div style="font-size:16px;color:var(--ink)">${meaning}</div>`;
    document.getElementById('review-buttons').style.display = 'block';
  };

  window.__dailyAnswer = (knew) => {
    const item = due[current];
    recordAnswer(item.word, knew);
    if (knew) correct++;
    current++;
    renderCard();
  };

  function finishReview() {
    el.innerHTML = `<div class="fade center" style="padding-top:60px">
      <div style="font-size:48px;margin-bottom:16px">${correct >= due.length * 0.7 ? '🎉' : '💪'}</div>
      <div class="h2 mb-8">${t('reviewDone')}</div>
      <div class="muted mb-16">${correct}/${due.length} ${t('remembered')}</div>
      <div class="card" style="padding:16px;margin-bottom:20px">
        <div class="muted small">${t('ghostWords')}: ${due.filter(d => d.level === 'ghost').length}</div>
      </div>
      <button class="btn" onclick="window.__nav('home')">${t('startLearning')}</button>
    </div>`;
  }

  renderCard();
});
