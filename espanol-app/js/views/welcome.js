import { S, update } from '../state.js';
import { register, go } from '../router.js';
import { t } from '../i18n.js';
import { speak } from '../audio.js';
import { shouldShowDailyReview } from '../engine/mastery.js';
import { loadUnits } from '../data.js';
import { isUnitDone, hasHistory, touchActive, daysAway } from '../state.js';
import { textsWithRecommendation } from './texts.js';

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

const LEVEL_OPTS = [
  ['a1', '🌱', 'Principiante básico', 'lvlA1'],
  ['a2', '🌿', 'Principiante', 'lvlA2'],
  ['b1', '🌳', 'Intermedio básico', 'lvlB1'],
  ['b2', '🏔️', 'Intermedio avanzado', 'lvlB2'],
  ['c1', '🚀', 'Avanzado', 'lvlC1'],
];

register('level-pick', (el) => {
  el.innerHTML = `<div class="fade study-pick">
    <div class="h1 mb-8">¿Cuál es tu nivel de español?</div>
    <div class="muted mb-16">${t('whatLevel')}</div>
    ${LEVEL_OPTS.map(([id, ic, es, k], i) => `<button class="card study-opt" style="animation-delay:${i * 0.07}s" onclick="window.__pickLevel('${id}')">
      <span class="study-ic">${ic}</span>
      <div class="grow" style="text-align:left"><div class="study-es">${es} <span class="study-level" style="margin-left:6px">${id.toUpperCase()}</span></div><div class="muted small">${t(k)}</div></div>
      <span class="muted">›</span>
    </button>`).join('')}
    <div class="muted small mt-8">${t('levelChangeLater')}</div>
  </div>`;
  speak('¿Cuál es tu nivel de español?');
});

window.__pickLevel = (level) => {
  update({ level, unit: 1, levelChosen: true });
  go('welcome');
};

function continueToApp() {
  clearTimeout(welcomeTimer);
  go('study-pick');
}

register('name', (el) => {
  el.innerHTML = `<div class="fade welcome-name">
    <div class="welcome-wave">👋</div>
    <div class="h1 mb-8">¿Cómo te llamas?</div>
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

register('welcome', (el) => {
  const returning = !!S.welcomed;
  const hello = `¡Hola, ${S.name}!`;
  const away = returning ? awayLine() : null;
  const line = away ? away.es : returning ? 'Encantado de tenerte de vuelta.' : 'Encantado de conocerte.';
  const letters = [...hello].map((c, i) =>
    `<span class="wl" style="animation-delay:${0.35 + i * 0.05}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  const lineDelay = 0.35 + hello.length * 0.05 + 0.2;

  el.innerHTML = `<div class="welcome" onclick="window.__welcomeContinue()">
    <div class="welcome-bubbles"><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div class="welcome-wave">👋</div>
    <div class="welcome-hello">${letters}</div>
    <div class="welcome-line" style="animation-delay:${lineDelay}s">${line}</div>
    <div class="welcome-tr muted" style="animation-delay:${lineDelay + 0.3}s">${esc(away ? away.tr : t(returning ? 'welcomeBackTr' : 'niceToMeetTr').replace('{n}', S.name))}</div>
    <div class="welcome-bar"><div style="animation-duration:${WELCOME_MS}ms"></div></div>
    <div class="welcome-tap muted small">${t('tapToContinue')}</div>
  </div>`;

  if (!returning) update({ welcomed: true });
  speak(line);
  clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(continueToApp, WELCOME_MS);
});

window.__welcomeContinue = continueToApp;

// Message about the time since the last visit (null when it was today/yesterday).
function awayLine() {
  const d = daysAway;
  if (d < 2) return null;
  if (d >= 30) return { es: '¡Cuánto tiempo! Te echábamos de menos.', tr: t('awayLong') };
  return { es: `Hace ${d} días que no te veíamos.`, tr: t('awayDays').replace('{d}', d) };
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
  const opts = [
    ['grammar', '📖', 'Gramática', t('stepGrammar')],
    ['vocab', '🗂️', 'Vocabulario', t('stepVocab')],
    ['practice', '✍️', 'Ejercicios', t('stepPractice')],
  ];
  const review = shouldShowDailyReview();
  const history = hasHistory();
  const away = daysAway >= 2;
  const info = history ? awayInfo() : '';
  const { rec } = await textsWithRecommendation(S.level);

  el.innerHTML = `<div class="fade study-pick">
    <div class="h1 mb-8">¿Qué quieres estudiar hoy?</div>
    <div class="muted mb-16">${t('whatStudyToday')}</div>
    ${info ? `<div class="away-info ${away ? 'warn' : ''} mb-12">${esc(info)}</div>` : ''}
    ${history ? `<button class="card study-opt review-opt ${away ? 'hot' : ''}" onclick="window.__startReview()">
      <span class="study-ic">🔁</span>
      <div class="grow" style="text-align:left"><div class="study-es">Repaso</div><div class="muted small">${t('reviewLessonTr')}</div></div>
      <span class="muted">›</span>
    </button>` : ''}
    <div class="study-unit card mb-16">
      <span class="study-level">${S.level.toUpperCase()}</span>
      <div class="grow"><div class="muted small">${t('unit')} ${num}</div><div style="font-weight:700">${title}</div></div>
    </div>
    ${opts.map(([id, ic, es, tr], i) => `<button class="card study-opt" style="animation-delay:${i * 0.08}s" onclick="window.__studyPick('${id}', ${num})">
      <span class="study-ic">${ic}</span>
      <div class="grow" style="text-align:left"><div class="study-es">${es}</div><div class="muted small">${tr}</div></div>
      <span class="muted">›</span>
    </button>`).join('')}
    ${rec ? `<button class="card study-opt" style="animation-delay:.24s" onclick="window.__openText('${rec.id}')">
      <span class="study-ic">📄</span>
      <div class="grow" style="text-align:left"><div class="study-es">Lectura</div><div class="muted small">${t('texts')} · ${esc(rec.title.es)}</div></div>
      <span class="muted">›</span>
    </button>` : ''}
    <button class="card study-opt" style="animation-delay:.28s" onclick="window.__nav('drills')">
      <span class="study-ic">🎯</span>
      <div class="grow" style="text-align:left"><div class="study-es">Práctica de gramática</div><div class="muted small">${t('grammarPractice')}</div></div>
      <span class="muted">›</span>
    </button>
    ${review ? `<button class="card study-opt" style="animation-delay:.32s" onclick="window.__nav('daily-review')">
      <span class="study-ic">🔁</span>
      <div class="grow" style="text-align:left"><div class="study-es">Tarjetas de vocabulario</div><div class="muted small">${t('dailyReviewTr')}</div></div>
      <span class="muted">›</span>
    </button>` : ''}
    <button class="btn-link muted small mt-16" onclick="window.__nav('home')">${t('goToMap')}</button>
  </div>`;
  speak('¿Qué quieres estudiar hoy?');
});

window.__studyPick = (start, unit) => go('lesson', { level: S.level, unit, start });

window.__startReview = () => go('lesson', { review: 1 });
