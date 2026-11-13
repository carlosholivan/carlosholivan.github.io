// Leaderboard: points from learned vocabulary, learned grammar (completed lessons and sets) and the current streak.
import { S, afterSync } from '../state.js?v=202611140800';
import { register } from '../router.js?v=202611140800';
import { bottomNav, header } from '../ui/components.js?v=202611140800';
import { t } from '../i18n.js?v=202611140800';
import { esc } from '../ja.js?v=202611140800';
import { wordStatus } from '../engine/status.js?v=202611140800';
import { allVocab } from './review.js?v=202611140800';
import { getUser, isVerified, publishRank, loadRanking, rankPosition } from '../firebase-auth.js?v=202611140800';

const WORD_PTS = { learning: 1, ghost: 1, review: 2, master: 4 };
const LESSON_PTS = 25, SET_PTS = 5, STREAK_PTS = 10;

// The streak only counts while it is alive (last study day today or yesterday).
function liveStreak() {
  const day = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  return S.lastDay === day(0) || S.lastDay === day(1) ? (S.streak || 0) : 0;
}

export async function computeScore() {
  const vm = await allVocab();
  let words = 0, mastered = 0, vocabPts = 0;
  for (const w of vm.keys()) {
    const st = wordStatus(w);
    if (st === 'unseen') continue;
    words++; if (st === 'master') mastered++;
    vocabPts += WORD_PTS[st] || 0;
  }
  const lessons = Object.keys(S.completed || {}).filter(k => S.completed[k]).length;
  const sets = Object.values(S.sets || {}).reduce((n, v) => n + (Array.isArray(v) ? v.length : Object.keys(v || {}).length), 0);
  const streak = liveStreak();
  const grammarPts = lessons * LESSON_PTS + sets * SET_PTS, streakPts = streak * STREAK_PTS;
  return { score: vocabPts + grammarPts + streakPts, vocabPts, grammarPts, streakPts, words, mastered, lessons, sets, streak };
}

const canRank = () => !!getUser() && isVerified();
const displayName = () => String(S.name || '').replace(/[<>&"'\n]/g, '').trim().slice(0, 30) || t('anonymous');

let lastPub = '';
export async function pushRank() {
  if (!canRank()) return;
  const c = await computeScore();
  const entry = { name: displayName(), score: c.score, words: c.words, mastered: c.mastered, lessons: c.lessons, sets: c.sets, streak: c.streak };
  const key = JSON.stringify(entry);
  if (key === lastPub) return;
  if (await publishRank(entry)) lastPub = key;
}
afterSync.push(() => pushRank().catch(() => {}));

register('ranking', async (el) => {
  const c = await computeScore();
  const mine = `<div class="card mb-16">
    <div class="flex justify-between items-center mb-8"><b>${t('yourPoints')}</b><span class="rk-xp" style="font-size:22px">${c.score} XP</span></div>
    <div class="rk-break muted">
      <span>📚 ${t('rkVocab')} (${c.words} · ${c.mastered} ${t('rkMastered')})</span><b>${c.vocabPts}</b>
      <span>🎯 ${t('rkGrammar')} (${c.lessons} ${t('rkLessons')} · ${c.sets} ${t('rkSets')})</span><b>${c.grammarPts}</b>
      <span>🔥 ${t('rkStreak')} (${c.streak} ${t('rkDays')})</span><b>${c.streakPts}</b>
    </div>
    <div class="muted small mt-8">${t('rkHow')}</div>
  </div>`;
  const shell = body => `<div class="fade">${header('🏆 ' + t('ranking'))}${mine}${body}</div>${bottomNav('ranking')}`;
  if (!canRank()) {
    el.innerHTML = shell(`<div class="card center muted" style="padding:24px">${t('rkLogin')}</div>`);
    return;
  }
  el.innerHTML = shell(`<div class="card center muted" style="padding:24px">…</div>`);
  try {
    await pushRank();
    const [rows, pos] = await Promise.all([loadRanking(50), rankPosition(c.score)]);
    const me = getUser().uid;
    const list = rows.map((r, i) => `<div class="rk-row ${r.uid === me ? 'me' : ''}">
        <span class="rk-pos">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
        <div class="grow"><b>${esc(r.name || t('anonymous'))}</b>
          <div class="muted small">📚 ${r.words | 0} · 🎯 ${r.lessons | 0} · 🔥 ${r.streak | 0}</div></div>
        <span class="rk-xp">${r.score | 0}</span></div>`).join('');
    const meRow = rows.some(r => r.uid === me) ? '' : `<div class="rk-row me mt-8"><span class="rk-pos">${pos}</span><div class="grow"><b>${esc(displayName())}</b></div><span class="rk-xp">${c.score}</span></div>`;
    el.innerHTML = shell(`<div class="card" style="padding:6px">${list || `<div class="muted center" style="padding:16px">${t('rkEmpty')}</div>`}</div>${meRow}
      <div class="muted small mt-8">${t('rkPublic')}</div>`);
  } catch (e) {
    el.innerHTML = shell(`<div class="card" style="padding:16px;color:var(--no)">${t('rkError')}<div class="muted small mt-8">${esc(e.code || e.message || String(e))}</div></div>`);
  }
});
