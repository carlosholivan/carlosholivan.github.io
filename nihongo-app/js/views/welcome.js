import { S, update } from '../state.js?v=202611141600';
import { register, go } from '../router.js?v=202611141600';
import { t } from '../i18n.js?v=202611141600';
import { speak } from '../audio.js?v=202611141600';
import { deckStats } from '../engine/anki.js?v=202611141600';
import { failedWords } from '../engine/srs.js?v=202611141600';
import { allVocab } from './review.js?v=202611141600';
import { loadUnits } from '../data.js?v=202611141600';
import { isUnitDone, hasHistory, touchActive, daysAway } from '../state.js?v=202611141600';
import { textsWithRecommendation } from './texts.js?v=202611141600';
import { ruby, pyReady } from '../ja.js?v=202611141600';
import { LEVELS, levelLabel, LEVEL_NAME } from '../levels.js?v=202611141600';
import { mascot } from '../ui/mascot.js?v=202611141600';

const zh = (s) => ruby(s);

const WELCOME_MS = 3600;
let welcomeTimer = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Entry point once the user is past the auth screen.
export function enterApp() {
  touchActive();
  if (!S.name) go('name');
  else if (needsLevel()) go('level-pick');
  else go('welcome');
}

// Only brand-new learners pick a starting level; existing users keep theirs.
function needsLevel() {
  if (S.levelChosen) return false;
  if (hasHistory()) { update({ levelChosen: true }); return false; }
  return true;
}

const LEVEL_ICONS = ['五', '四', '三', '二', '一'];
const STUDY_BADGE = { '📖': '文', '🗂️': '語', '✍️': '練', '📚': '語', '🎧': '聴' };

register('level-pick', async (el) => {
  await pyReady;
  el.innerHTML = `<div class="fade study-pick">
    <div class="h1 mb-8">${zh('日本語のレベルはどのくらいですか？')}</div>
    <div class="muted mb-16">${t('whatLevel')}</div>
    ${LEVELS.map((id, i) => `<button class="card study-opt" style="animation-delay:${i * 0.07}s" onclick="window.__pickLevel('${id}')">
      <span class="kbadge sm">${LEVEL_ICONS[i]}</span>
      <div class="grow" style="text-align:left"><div class="study-es">${t(LEVEL_NAME[id])} <span class="study-level" style="margin-left:6px">${levelLabel(id)}</span></div><div class="muted small">${t('lvDesc' + (i + 1))}</div></div>
      <span class="muted">›</span>
    </button>`).join('')}
    <div class="muted small mt-8">${t('levelChangeLater')}</div>
  </div>`;
  speak('日本語のレベルはどのくらいですか？');
});

window.__pickLevel = (level) => {
  update({ level, unit: 1, levelChosen: true });
  go('welcome');
};

function continueToApp() {
  clearTimeout(welcomeTimer);
  go('study-pick');
}

register('name', async (el) => {
  await pyReady;
  el.innerHTML = `<div class="fade welcome-name">
    <div class="welcome-wave">${mascot('cheer', 110)}</div>
    <div class="h1 mb-8">${zh('お名前は何ですか？')}</div>
    <div class="muted mb-16">${t('whatsYourName')}</div>
    <input id="name-input" type="text" maxlength="30" autocomplete="given-name" placeholder="${t('namePlaceholder')}" style="margin-bottom:8px">
    <div id="name-error" class="small mb-12" style="color:var(--no);min-height:18px"></div>
    <button class="btn" onclick="window.__saveName()">${t('continue')}</button>
  </div>`;
  const input = document.getElementById('name-input');
  input.focus();
  input.addEventListener('keydown', e => { if (e.key === 'Enter') window.__saveName(); });
});

window.__saveName = () => {
  const name = document.getElementById('name-input').value.trim();
  if (!name) {
    document.getElementById('name-error').textContent = t('nameRequired');
    return;
  }
  update({ name });
  if (needsLevel()) go('level-pick');
  else go('welcome');
};

register('welcome', async (el) => {
  await pyReady;
  const returning = !!S.welcomed;
  const hello = `こんにちは、${String(S.name).replace(/[<>&"']/g, '')}さん！`;
  const away = returning ? awayLine() : null;
  const lineZh = away ? away.es : returning ? 'おかえりなさい！' : 'はじめまして！';
  const line = zh(lineZh);
  const letters = [...hello].map((c, i) =>
    `<span class="wl" style="animation-delay:${0.35 + i * 0.05}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  const lineDelay = 0.35 + hello.length * 0.05 + 0.2;

  el.innerHTML = `<div class="welcome" onclick="window.__welcomeContinue()">
    <div class="welcome-bubbles"><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div class="welcome-wave">${mascot('cheer', 110)}</div>
    <div class="welcome-hello">${letters}</div>
    <div class="welcome-line" style="animation-delay:${lineDelay}s">${line}</div>
    <div class="welcome-tr muted" style="animation-delay:${lineDelay + 0.3}s">${esc(away ? away.tr : t(returning ? 'welcomeBackTr' : 'niceToMeetTr').replace('{n}', S.name))}</div>
    <div class="welcome-bar"><div style="animation-duration:${WELCOME_MS}ms"></div></div>
    <div class="welcome-tap muted small">${t('tapToContinue')}</div>
  </div>`;

  if (!returning) update({ welcomed: true });
  speak(lineZh);
  clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(continueToApp, WELCOME_MS);
});

window.__welcomeContinue = continueToApp;

// Message about the time since the last visit (null when it was today/yesterday).
function awayLine() {
  const d = daysAway;
  if (d < 2) return null;
  if (d >= 30) return { es: 'お久しぶりです！会いたかったです。', tr: t('awayLong') };
  return { es: `${d}日ぶりですね。`, tr: t('awayDays').replace('{d}', d) };
}

function awayInfo() {
  const d = daysAway;
  if (d < 0) return '';
  if (d === 0) return `☀️ ${t('awayToday')}`;
  if (d === 1) return `📅 ${t('awayYesterday')}`;
  return `⏰ ${d >= 30 ? t('awayLong') : t('awayDays').replace('{d}', d)} ${t('awaySuggestReview')}`;
}

// "What do you want to study today?" — jumps to the current unit of the current level.
register('study-pick', async (el) => {
  const units = await loadUnits(S.level);
  let idx = units.findIndex((_, i) => !isUnitDone(S.level, i + 1));
  if (idx < 0) idx = units.length - 1;
  const unit = units[idx];
  const num = idx + 1;
  const title = unit ? esc(unit.title[S.lang] || unit.title.en) : '';
  await pyReady;
  const opts = [
    ['grammar', '📖', zh('文法'), t('stepGrammar')],
    ['vocab', '🗂️', zh('単語'), t('stepVocab')],
    ['practice', '✍️', zh('練習'), t('stepPractice')],
  ];
  const deck = deckStats();
  let nFailed = 0;
  try { nFailed = failedWords(new Set((await allVocab()).keys()), 999).length; } catch (e) {}
  const history = hasHistory();
  const away = daysAway >= 2;
  const info = history ? awayInfo() : '';
  const { rec } = await textsWithRecommendation(S.level);

  el.innerHTML = `<div class="fade study-pick">
    <div class="h1 mb-8">${zh('今日は何を勉強しますか？')}</div>
    <div class="muted mb-16">${t('whatStudyToday')}</div>
    ${info ? `<div class="away-info ${away ? 'warn' : ''} mb-12">${esc(info)}</div>` : ''}
    ${history ? `<button class="card study-opt review-opt ${away ? 'hot' : ''}" onclick="window.__startReview()">
      <span class="kbadge sm">復</span>
      <div class="grow" style="text-align:left"><div class="study-es">${zh('復習')}</div><div class="muted small">${t('reviewLessonTr')}</div></div>
      <span class="muted">›</span>
    </button>` : ''}
    <div class="study-unit card mb-16">
      <span class="study-level">${levelLabel(S.level)}</span>
      <div class="grow"><div class="muted small">${t('unit')} ${num}</div><div style="font-weight:700">${title}</div></div>
    </div>
    ${opts.map(([id, ic, es, tr], i) => `<button class="card study-opt" style="animation-delay:${i * 0.08}s" onclick="window.__studyPick('${id}', ${num})">
      <span class="kbadge sm">${STUDY_BADGE[ic] || ic}</span>
      <div class="grow" style="text-align:left"><div class="study-es">${es}</div><div class="muted small">${tr}</div></div>
      <span class="muted">›</span>
    </button>`).join('')}
    ${rec ? `<button class="card study-opt" style="animation-delay:.24s" onclick="window.__openText('${rec.id}')">
      <span class="kbadge sm">読</span>
      <div class="grow" style="text-align:left"><div class="study-es">${zh('読み物')}</div><div class="muted small">${t('texts')} · ${esc(rec.title[S.lang] || rec.title.en)} · <span lang="zh">${esc(rec.title.zh || '')}</span></div></div>
      <span class="muted">›</span>
    </button>` : ''}
    <button class="card study-opt" style="animation-delay:.28s" onclick="window.__nav('drills')">
      <span class="kbadge sm">練</span>
      <div class="grow" style="text-align:left"><div class="study-es">${zh('文法練習')}</div><div class="muted small">${t('grammarPractice')}</div></div>
      <span class="muted">›</span>
    </button>
    <button class="card study-opt" style="animation-delay:.32s" onclick="window.__go('review',{deck:'v'})">
      <span class="kbadge sm">札</span>
      <div class="grow" style="text-align:left"><div class="study-es">${zh('単語の復習')}</div><div class="muted small">${t('vocabReviewTr')}${deck.pending ? ` · <b style="color:var(--accent)">${deck.pending} ${t('cardsPending')}</b>` : ''}${deck.forgotten ? ` · <span style="color:var(--no)">${deck.forgotten} ${t('cardForgotten').toLowerCase()}</span>` : ''}</div></div>
      <span class="muted">›</span>
    </button>
    ${nFailed ? `<button class="card study-opt" style="animation-delay:.36s" onclick="window.__go('review', {mode:'failed'})">
      <span class="kbadge sm">誤</span>
      <div class="grow" style="text-align:left"><div class="study-es">${zh('間違えた単語')}</div><div class="muted small">${t('failedReview')} · ${t('failedReviewTr')} · <b style="color:var(--no)">${nFailed}</b></div></div>
      <span class="muted">›</span>
    </button>` : ''}
    <button class="card study-opt" style="animation-delay:.4s" onclick="window.__nav('vocab-list')">
      <span class="kbadge sm">語</span>
      <div class="grow" style="text-align:left"><div class="study-es">${zh('単語リスト')}</div><div class="muted small">${t('vocabListHint')}</div></div>
      <span class="muted">›</span>
    </button>
    <button class="btn-link muted small mt-16" onclick="window.__nav('home')">${t('goToMap')}</button>
  </div>`;
  speak('今日は何を勉強しますか？');
});

window.__studyPick = (start, unit) => go('lesson', { level: S.level, unit, start });

window.__startReview = () => go('lesson', { review: 1 });
