// Characters per HSK level: grid, detail card with stroke-order animation and a writing quiz (Hanzi Writer).
import { S, update } from '../state.js?v=202611021754';
import { register } from '../router.js?v=202611021754';
import { loadHanzi } from '../data.js?v=202611021754';
import { levelChips, levelLabel } from '../levels.js?v=202611021754';
import { addCards } from '../engine/anki.js?v=202611021754';
import { bottomNav, header } from '../ui/components.js?v=202611021754';
import { speak } from '../audio.js?v=202611021754';
import { t } from '../i18n.js?v=202611021754';
import { esc, mean, tonedPinyin, toneOf, sylReady } from '../zh.js?v=202611021754';
import { allVocab, allHanzi, hanziExtra } from './review.js?v=202611021754';

const PAGE = 120;

register('hanzi', async (el, params = {}) => {
  const level = params.level || S.hanziLevel || S.level;
  const page = params.page || 0;
  const list = await loadHanzi(level).catch(() => []);
  const deck = S.hcards || {};
  const slice = list.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.ceil(list.length / PAGE);
  el.innerHTML = `<div class="fade">
    ${header('汉字 · ' + t('hanzi'))}
    ${levelChips(level, '__hzLevel')}
    <div class="muted small mb-12">${levelLabel(level)} · ${list.length} ${t('hanzi').toLowerCase()} · ${t('hanziHint')}</div>
    <div class="hz-grid">${slice.map(h => `<button class="hz-cell t${toneOf(h.p)} ${deck[h.c] ? 'in-deck' : ''}" onclick="window.__go('hanzi-detail',{c:'${esc(h.c)}',level:'${level}'})">
      <span class="hz-c">${esc(h.c)}</span><span class="hz-p">${esc(h.p)}</span></button>`).join('')}</div>
    ${pages > 1 ? `<div class="flex gap-8 mt-16" style="flex-wrap:wrap">${Array.from({ length: pages }, (_, i) =>
      `<button class="chip ${i === page ? 'on' : ''}" onclick="window.__go('hanzi',{level:'${level}',page:${i}})">${i * PAGE + 1}–${Math.min(list.length, (i + 1) * PAGE)}</button>`).join('')}</div>` : ''}
    <button class="btn mt-16" onclick="window.__hzAddAll('${level}', ${page})">🗂️ ${t('addToDeck')} (${slice.filter(h => !deck[h.c]).length})</button>
    <button class="btn btn-ghost mt-12" onclick="window.__go('review',{deck:'h'})">${t('hanziReview')}</button>
  </div>${bottomNav('hanzi')}`;
});

window.__hzLevel = (l) => { update({ hanziLevel: l }); window.__go('hanzi', { level: l }); };
window.__hzAddAll = async (level, page) => {
  const list = await loadHanzi(level);
  addCards(list.slice(page * PAGE, (page + 1) * PAGE).map(h => h.c), 'h');
  window.__go('hanzi', { level, page });
};

let writer = null;
register('hanzi-detail', async (el, params = {}) => {
  const hm = await allHanzi();
  await sylReady;
  const h = hm.get(params.c);
  if (!h) { el.innerHTML = `<div class="fade">${header(params.c, true)}<div class="muted">—</div></div>`; return; }
  const vm = await allVocab();
  const lang = S.lang;
  const words = (h.words || []).map(w => vm.get(w)).filter(Boolean).slice(0, 8);
  const inDeck = !!(S.hcards || {})[h.c];
  el.innerHTML = `<div class="fade">
    ${header(h.c, true)}
    <div class="card" style="padding:20px;text-align:center">
      <div id="hz-writer" class="hz-writer"></div>
      <div class="anki-py" style="font-size:22px">${tonedPinyin(h.p, { play: true })}${(h.pa || []).length ? ` <span class="muted small">(${h.pa.map(esc).join(', ')})</span>` : ''}
        <button class="anki-spk" style="position:static" onclick="window.__speakZh('${esc(h.c)}')">🔊</button></div>
      <div class="anki-ans">${esc(mean(h.m, lang))}</div>
      ${hanziExtra(h, lang)}
      <div class="muted small mt-8">${levelLabel(h.lv)}</div>
      <div class="flex gap-8 mt-16" style="justify-content:center;flex-wrap:wrap">
        <button class="btn btn-soft btn-small" onclick="window.__hzAnim()">▶️ ${t('strokeOrder')}</button>
        <button class="btn btn-soft btn-small" onclick="window.__hzQuiz()">✍️ ${t('practiceWriting')}</button>
        <button class="btn btn-soft btn-small" ${inDeck ? 'disabled' : ''} onclick="window.__hzAdd('${esc(h.c)}', this)">🗂️ ${inDeck ? t('inDeck') : t('addToDeck')}</button>
      </div>
      <div id="hz-msg" class="small mt-8"></div>
    </div>
    ${words.length ? `<div class="h3 mt-16 mb-8">${t('wordsWith')} ${esc(h.c)}</div>
    <div class="card" style="padding:12px">${words.map(w => `<div class="hz-word" onclick="window.__speakZh('${esc(w.w)}')">
      <span class="zh-big-inline">${esc(w.w)}</span> <span class="small">${tonedPinyin(w.p, { play: true })}</span>
      <span class="muted small">· ${esc(mean(w.m, lang))}</span> <span class="badge">${levelLabel(w.lv)}</span></div>`).join('')}</div>` : ''}
  </div>${bottomNav('hanzi')}`;
  speak(h.c);
  writer = null;
  if (window.HanziWriter) {
    const dark = document.body.classList.contains('dark');
    writer = window.HanziWriter.create('hz-writer', h.c, {
      width: 200, height: 200, padding: 8, showOutline: true,
      strokeColor: dark ? '#eee' : '#222', outlineColor: dark ? '#444' : '#ddd', radicalColor: '#e74c3c',
      strokeAnimationSpeed: 1.2, delayBetweenStrokes: 250,
      charDataLoader: (c, ok, fail) => fetch(`data/strokes/${c}.json`).then(r => r.json()).then(ok).catch(fail),
    });
    writer.animateCharacter();
  }
});

window.__speakZh = (w) => speak(w);
window.__hzAnim = () => { if (writer) { writer.cancelQuiz(); writer.showCharacter(); writer.animateCharacter(); } };
window.__hzQuiz = () => {
  if (!writer) return;
  const msg = document.getElementById('hz-msg');
  msg.textContent = t('writeHint');
  writer.hideCharacter();
  writer.quiz({
    showHintAfterMisses: 2,
    onComplete: (d) => { msg.textContent = `✅ ${d.totalMistakes ? d.totalMistakes + ' ✗' : '💯'}`; },
  });
};
window.__hzAdd = (c, btn) => { addCards([c], 'h'); btn.disabled = true; btn.textContent = '🗂️ ' + t('inDeck'); };
