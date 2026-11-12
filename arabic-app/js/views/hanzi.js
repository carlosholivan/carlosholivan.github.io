// Arabic alphabet: grid of letters, letter sheet (name, sound, the four positional forms, words that use it).
import { S, update } from '../state.js?v=202611131200';
import { register } from '../router.js?v=202611131200';
import { loadHanzi } from '../data.js?v=202611131200';
import { levelLabel, LEVELS } from '../levels.js?v=202611131200';
import { addCards } from '../engine/anki.js?v=202611131200';
import { bottomNav, header } from '../ui/components.js?v=202611131200';
import { speak } from '../audio.js?v=202611131200';
import { t } from '../i18n.js?v=202611131200';
import { esc, mean, ruby, strip, translit } from '../ar.js?v=202611131200';
import { allVocab, allHanzi } from './review.js?v=202611131200';

const POS = ['aislada', 'inicial', 'media', 'final'];

register('hanzi', async (el) => {
  const list = await loadHanzi('a1').catch(() => []);
  const deck = S.hcards || {};
  el.innerHTML = `<div class="fade">
    ${header('حُرُوف · ' + t('hanzi'))}
    <div class="muted small mb-12">${list.length} · ${t('hanziHint')}</div>
    <div class="letter-grid">${list.map(h => `<button class="card letter-cell ${deck[h.c] ? 'in-deck' : ''}" onclick="window.__charSheet('${esc(h.c)}')">
      <div class="lc">${esc(h.c)}</div><div class="ln">${esc(h.m.es.split(' — ')[0])} · ${esc(h.p)}</div></button>`).join('')}</div>
    <button class="btn mt-16" onclick="window.__hzAddAll()">🗂️ ${t('addToDeck')} (${list.filter(h => !deck[h.c]).length})</button>
    <button class="btn btn-ghost mt-12" onclick="window.__go('review',{deck:'h'})">${t('hanziReview')}</button>
  </div>${bottomNav('hanzi')}`;
});

window.__hzAddAll = async () => {
  const list = await loadHanzi('a1');
  addCards(list.map(h => h.c), 'h');
  window.__go('hanzi');
};

async function sheetHtml(c) {
  const hm = await allHanzi();
  const h = hm.get(c);
  if (!h) return null;
  const vm = await allVocab();
  const [name, sound] = (mean(h.m, S.lang) || '').split(' — ');
  const words = [...vm.values()].filter(v => strip(v.w).includes(c)).sort((a, b) => (LEVELS.indexOf(a.lv) - LEVELS.indexOf(b.lv)) || ((a.q || 0) - (b.q || 0))).slice(0, 24);
  const inDeck = !!(S.hcards || {})[c];
  return `<div class="ks-head">
      <div class="ks-big ar" style="font-size:96px;line-height:1.3">${esc(c)}</div>
      <div><div class="h2">${esc(name)}</div><div class="muted">${esc(h.p)} · ${esc(sound || '')}</div>
        <div class="flex gap-8 mt-8"><button class="btn btn-soft btn-small" onclick="window.__speakZh('${esc(c)}')">🔊</button>
        <button class="btn btn-soft btn-small" ${inDeck ? 'disabled' : ''} onclick="window.__hzAdd('${esc(c)}', this)">${inDeck ? t('inDeck') : '🗂️ ' + t('addToDeck')}</button></div></div>
    </div>
    ${h.forms && h.forms.some(Boolean) ? `<div class="sec-label">Formas</div><div class="forms">${h.forms.map((f, i) => `<div><b>${esc(f || '—')}</b><span>${POS[i]}</span></div>`).join('')}</div>` : ''}
    <div class="sec-label">${t('wordsWithN').replace('{c}', esc(c))}</div>
    <div class="ks-words">${words.map(v => `<div class="ks-word" onclick="window.__speakZh('${esc(v.w)}')">${ruby(v.w)}<span class="muted small" style="margin-inline-start:8px">${esc(mean(v.m, S.lang))} · ${levelLabel(v.lv)}</span></div>`).join('') || '<div class="muted small">—</div>'}</div>`;
}

register('hanzi-detail', async (el, params = {}) => {
  const html = await sheetHtml(params.c);
  el.innerHTML = `<div class="fade">${header(params.c || '', true)}${html || `<div class="muted">${t('noCharData')}</div>`}</div>${bottomNav('hanzi')}`;
});

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
};

window.__speakZh = (w) => speak(w);
window.__hzAdd = (c, btn) => { addCards([c], 'h'); btn.disabled = true; btn.textContent = t('inDeck'); };
