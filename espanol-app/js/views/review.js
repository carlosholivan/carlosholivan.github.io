import { S } from '../state.js';
import { register, go } from '../router.js';
import { loadVocab } from '../data.js';
import { getReviewWords, recordAnswer } from '../engine/srs.js';
import { bottomNav, header } from '../ui/components.js';
import { t } from '../i18n.js';

register('review', async (el) => {
  const due = getReviewWords(15);

  if (due.length === 0) {
    el.innerHTML = `<div class="fade">
      ${header(t('review'))}
      <div class="center" style="padding-top:60px">
        <div style="font-size:48px;margin-bottom:16px">🎉</div>
        <div class="h3 mb-8">${t('allDone')}</div>
        <div class="muted">${t('noDue')}</div>
        <button class="btn mt-24" onclick="window.__nav('home')">${t('keepLearn')}</button>
      </div>
    </div>${bottomNav('review')}`;
    return;
  }

  const vocab = await loadVocab(S.level);
  let current = 0;
  let correct = 0;

  function renderCard() {
    if (current >= due.length) {
      finishReview();
      return;
    }
    const item = due[current];
    const entry = vocab.find(v => v.word === item.word);

    el.innerHTML = `<div class="fade">
      ${header(t('review'), true)}
      <div class="muted small mb-12">${current + 1}/${due.length}</div>
      <div class="card center" style="padding:40px 20px;margin-bottom:20px">
        <div style="font-size:28px;font-weight:600;margin-bottom:8px">${item.word}</div>
        ${entry ? `<div class="muted">${entry.m[S.lang] || entry.m.en}</div>` : ''}
      </div>
      <div class="flex gap-12">
        <button class="btn btn-ghost grow" onclick="window.__reviewAnswer(false)">${t('dontKnow')}</button>
        <button class="btn btn-ok grow" onclick="window.__reviewAnswer(true)">${t('iKnow')}</button>
      </div>
    </div>${bottomNav('review')}`;
  }

  window.__reviewAnswer = (knew) => {
    recordAnswer(due[current].word, knew);
    if (knew) correct++;
    current++;
    renderCard();
  };

  function finishReview() {
    el.innerHTML = `<div class="fade center" style="padding-top:60px">
      <div style="font-size:48px;margin-bottom:16px">✅</div>
      <div class="h2 mb-8">${t('reviewDone')}</div>
      <div class="muted mb-16">${correct}/${due.length} ${t('remembered')}</div>
      <button class="btn" onclick="window.__nav('home')">${t('goBack')}</button>
    </div>${bottomNav('review')}`;
  }

  renderCard();
});
