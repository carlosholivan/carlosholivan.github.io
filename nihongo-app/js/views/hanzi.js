// Characters per HSK level: grid, detail card with stroke-order animation and a writing quiz (Hanzi Writer).
import { S, update } from '../state.js?v=202611140500';
import { register } from '../router.js?v=202611140500';
import { loadHanzi } from '../data.js?v=202611140500';
import { levelChips, levelLabel } from '../levels.js?v=202611140500';
import { addCards } from '../engine/anki.js?v=202611140500';
import { bottomNav, header } from '../ui/components.js?v=202611140500';
import { speak } from '../audio.js?v=202611140500';
import { t } from '../i18n.js?v=202611140500';
import { esc, mean, tonedPinyin, toneOf, sylReady, ruby, pyReady } from '../ja.js?v=202611140500';
import { allVocab, allHanzi, hanziExtra } from './review.js?v=202611140500';
import { LEVELS } from '../levels.js?v=202611140500';
import { icon } from '../ui/icons.js?v=202611140500';
import { shortMean } from '../chars.js?v=202611140500';

const PAGE = 120;

register('hanzi', async (el, params = {}) => {
  const level = params.level || S.hanziLevel || S.level;
  const page = params.page || 0;
  const list = await loadHanzi(level).catch(() => []);
  const deck = S.hcards || {};
  const slice = list.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.ceil(list.length / PAGE);
  el.innerHTML = `<div class="fade">
    ${header('漢字 · ' + t('hanzi'))}
    ${levelChips(level, '__hzLevel')}
    <div class="muted small mb-12">${levelLabel(level)} · ${list.length} ${t('hanzi').toLowerCase()} · ${t('hanziHint')}</div>
    <div class="hz-grid">${slice.map(h => `<button class="hz-cell t${toneOf(h.p)} ${deck[h.c] ? 'in-deck' : ''}" onclick="window.__go('hanzi-detail',{c:'${esc(h.c)}',level:'${level}'})">
      <span class="hz-c">${esc(h.c)}</span><span class="hz-p">${esc((h.on || [])[0] || (h.kun || [])[0] || '')}</span></button>`).join('')}</div>
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

// Midori-style character sheet: meaning, readings, strokes, components and the words that use it.
// Shown as a page ('hanzi-detail') or as an overlay over flashcards (window.__charSheet) so a review session isn't lost.
async function sheetHtml(c) {
  const hm = await allHanzi();
  await sylReady; await pyReady;
  const h = hm.get(c);
  if (!h) return null;
  const vm = await allVocab();
  const lang = S.lang;
  const inDeck = !!(S.hcards || {})[h.c];
  // Every word of every level that contains the character, by level then frequency.
  const all = [...vm.values()].filter(v => v.w.includes(h.c));
  const order = l => LEVELS.indexOf(l);
  all.sort((a, b) => (order(a.lv) - order(b.lv)) || ((a.q || 99999) - (b.q || 99999)));
  const words = all.slice(0, 14);
  const parts = (h.parts || []).filter(x => x !== h.c);
  const hl = w => esc(w).split(esc(h.c)).join(`<b>${esc(h.c)}</b>`);
  const strokes = h.n || await strokeCount(h.c);
  const exs = await examplesFor(h.c);
  return `<div class="card" style="padding:0;overflow:hidden">
      <div class="ks-head">
        <div class="ks-big">${esc(h.c)}</div>
        <div class="grow">
          <div class="ks-mean">${esc(mean(h.m, lang))}</div>
          <div class="ks-tags">${h.lv ? `<span class="ks-tag">${levelLabel(h.lv)}</span>` : ""}${strokes ? `<span class="ks-tag">${t('strokesN').replace('{n}', strokes)}</span>` : ''}${h.rad ? `<span class="ks-tag">${t('radicalLbl')} ${esc(h.rad)}</span>` : ''}${h.t && h.t !== h.c ? `<span class="ks-tag">${t('traditional')} ${esc(h.t)}</span>` : ''}</div>
        </div>
      </div>
      <div class="ks-read">
        <div><div class="k">${t('onyomi')}</div><div class="v">${(h.on || []).map(esc).join('、') || '—'}</div></div>
        <div><div class="k">${t('kunyomi')}</div><div class="v">${(h.kun || []).map(esc).join('、') || '—'}</div></div>
      </div>
      <div class="flex gap-8" style="justify-content:center;padding:0 20px 14px">
        <button class="icon-btn card" style="width:42px;height:42px" onclick="window.__speakZh('${esc(h.c)}')">${icon('speaker', 20)}</button>
        <button class="icon-btn card" style="width:42px;height:42px" onclick="window.__hzAnim()">${icon('play', 20)}</button>
        <button class="icon-btn card" style="width:42px;height:42px" onclick="window.__hzQuiz()">${icon('pencil', 20)}</button>
      </div>
      <div style="padding:0 20px 18px;text-align:center">
        <div id="hz-writer" class="hz-writer"></div>
        <div id="hz-msg" class="small mt-8"></div>
        ${hanziExtra({ ...h, rad: null, t: null }, lang)}
        <button class="btn btn-soft btn-small mt-12" ${inDeck ? 'disabled' : ''} onclick="window.__hzAdd('${esc(h.c)}', this)">${inDeck ? t('inDeck') : t('addToDeck')}</button>
      </div>
    </div>
    ${parts.length ? `<div class="ks-sec">${t('partsLbl')}</div><div class="ks-parts">${parts.map(p => {
      const ph = hm.get(p);
      return `<div class="ks-part" onclick="window.__charSheet('${esc(p)}')"><span>${esc(p)}</span><small>${esc(ph ? shortMean(ph.m) : '')}</small></div>`;
    }).join('')}</div>` : ''}
    ${words.length ? `<div class="ks-sec">${t('wordsWithN').replace('{c}', esc(h.c))} · ${all.length}</div>
    <div class="card" style="padding:0">${words.map(w => `<div class="ks-word" onclick="window.__speakZh('${esc(w.w)}')">
      <span class="w">${hl(w.w)}</span><span class="r">${esc(w.r && w.r !== w.w ? w.r : '')}</span><span class="m">${esc(mean(w.m, lang))}</span><span class="lv">${levelLabel(w.lv)}</span></div>`).join('')}</div>` : ''}
    ${exs.length ? `<div class="ks-sec">${t('examplesLbl')}</div><div class="card" style="padding:0">${exs.map(x => `<div class="ks-ex" onclick="window.__speakZh('${esc(x.ja)}')">${ruby(x.ja)}<div class="tr">${esc(x.en)}</div></div>`).join('')}</div>` : ''}`;
}

let EXS = null;
async function examplesFor(c) {
  if (!EXS) EXS = await fetch('data/examples.json').then(r => r.json()).catch(() => ({}));
  const out = [];
  for (const [w, list] of Object.entries(EXS)) {
    if (!w.includes(c)) continue;
    for (const x of list) if (out.length < 3 && x.ja.length <= 40) out.push(x);
    if (out.length >= 3) break;
  }
  return out;
}

async function strokeCount(c) {
  try { const d = await fetch(`data/strokes/${c}.json`).then(r => r.json()); return (d.strokes || []).length; } catch (e) { return 0; }
}

function mountWriter(c) {
  writer = null;
  if (!window.HanziWriter || !document.getElementById('hz-writer')) return;
  const dark = document.body.classList.contains('dark');
  writer = window.HanziWriter.create('hz-writer', c, {
    width: 180, height: 180, padding: 8, showOutline: true,
    strokeColor: dark ? '#ece6db' : '#2b2722', outlineColor: dark ? '#3a352b' : '#e8e2d9', radicalColor: dark ? '#c9a86a' : '#9c7842',
    strokeAnimationSpeed: 1.2, delayBetweenStrokes: 250,
    charDataLoader: (ch, ok, fail) => fetch(`data/strokes/${ch}.json`).then(r => r.json()).then(ok).catch(fail),
  });
  writer.animateCharacter();
}

register('hanzi-detail', async (el, params = {}) => {
  const html = await sheetHtml(params.c);
  el.innerHTML = `<div class="fade">${header(params.c || '', true)}${html || `<div class="muted">${t('noCharData')}</div>`}</div>${bottomNav('hanzi')}`;
  if (html) { speak(params.c); mountWriter(params.c); }
});

// Overlay version, used from flashcards and lessons.
window.__charSheet = async (c) => {
  document.querySelectorAll('.char-sheet').forEach(x => x.remove());
  const html = await sheetHtml(c);
  const sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop char-sheet fade';
  sheet.innerHTML = `<div class="sheet slideup" style="max-height:90vh">
    <div class="flex items-center justify-between mb-12"><span class="h3">${t('charSheet')}</span>
      <button class="btn btn-soft btn-small" onclick="this.closest('.sheet-backdrop').remove()">${t('close')}</button></div>
    ${html || `<div class="muted">${t('noCharData')}</div>`}</div>`;
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
  document.body.appendChild(sheet);
  if (html) { speak(c); mountWriter(c); }
};

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
window.__hzAdd = (c, btn) => { addCards([c], 'h'); btn.disabled = true; btn.textContent = t('inDeck'); };
