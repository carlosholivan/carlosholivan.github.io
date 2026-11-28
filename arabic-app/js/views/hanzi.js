// Arabic alphabet: grid of letters, letter sheet (name, sound, the four positional forms, words that use it).
import { S, update } from '../state.js?v=202611282102';
import { register } from '../router.js?v=202611282102';
import { loadHanzi } from '../data.js?v=202611282102';
import { levelLabel, LEVELS } from '../levels.js?v=202611282102';
import { addCards } from '../engine/anki.js?v=202611282102';
import { bottomNav, header } from '../ui/components.js?v=202611282102';
import { speak } from '../audio.js?v=202611282102';
import { t } from '../i18n.js?v=202611282102';
import { esc, mean, ruby, strip, translit } from '../ar.js?v=202611282102';
import { allVocab, allHanzi } from './review.js?v=202611282102';
import { writeSteps, formAt, NONJOIN, T as WT, tt } from '../arwrite.js?v=202611282102';

const POS = () => WT.pos[S.lang] || WT.pos.en;

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

let SIMS;
async function sheetHtml(c) {
  const hm = await allHanzi();
  const h = hm.get(c);
  if (!h) return null;
  const vm = await allVocab();
  const [name, sound] = (mean(h.m, S.lang) || '').split(' — ');
  const cand = [...vm.values()].filter(v => strip(v.w).includes(c)).sort((a, b) => (LEVELS.indexOf(a.lv) - LEVELS.indexOf(b.lv)) || ((a.q || 0) - (b.q || 0)));
  const words = cand.slice(0, 24);
  const inDeck = !!(S.hcards || {})[c];
  SIMS ??= fetch('data/similar.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const alike = (((await SIMS) || {})[c] || []).filter(x => hm.has(x));
  return `<div class="ks-head">
      <div class="ks-big ar" style="font-size:96px;line-height:1.3">${esc(c)}</div>
      <div><div class="h2">${esc(name)}</div><div class="muted">${esc(h.p)} · ${esc(sound || '')}</div>
        <div class="flex gap-8 mt-8"><button class="btn btn-soft btn-small" onclick="window.__speakZh('${esc(c)}')">🔊</button>
        <button class="btn btn-soft btn-small" ${inDeck ? 'disabled' : ''} onclick="window.__hzAdd('${esc(c)}', this)">${inDeck ? t('inDeck') : '🗂️ ' + t('addToDeck')}</button></div></div>
    </div>
    ${writeSteps(c).length ? `<div class="sec-label">✍️ ${tt('how')}</div>
    <div class="ar-write card">
      <div class="ar-draw-box"><span class="ar-ghost">${esc(c)}</span><span class="ar-draw" id="ar-draw">${esc(c)}</span></div>
      <div class="grow"><div class="muted small mb-8">⬅️ ${tt('rtl')}</div>
        <ol class="ar-steps">${writeSteps(c).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <button class="btn btn-soft btn-small" onclick="event.stopPropagation();const d=this.closest('.ar-write').querySelector('.ar-draw');d.style.animation='none';d.offsetWidth;d.style.animation=''">↻ ${tt('replay')}</button></div>
    </div>` : ''}
    ${h.forms && h.forms.some(Boolean) ? `<div class="sec-label">🔗 ${tt('join')}</div>
    <div class="muted small mb-8">${NONJOIN.has(c) ? tt('nonjoin') : c === 'ء' ? '' : tt('joins')}${c === 'ل' || c === 'ا' ? ' ' + tt('lamalif') : ''}</div>
    <div class="forms">${h.forms.map((f, i) => `<div><b>${esc(f || '—')}</b><span>${POS()[i]}</span></div>`).join('')}</div>
    ${c !== 'ء' ? `<div class="muted small mt-12 mb-4">${tt('combos')}</div><div class="ar-combos">${(NONJOIN.has(c) ? [['ب', c], ['م', c, 'ب'], [c, 'ب'], [c, 'ل']] : [[c, 'ا'], [c, 'م'], ['م', c], ['م', c, 'م'], ['ب', c, 'ي']]).map(parts =>
      `<div class="ar-combo" onclick="window.__speakZh('${esc(parts.join(''))}')"><b>${esc(parts.join(''))}</b><span>${parts.map(esc).join(' + ')}</span></div>`).join('')}</div>` : ''}
    ${(() => { const ex = [null, null, null, null]; for (const v of cand) { const w = strip(v.w); for (let i = 0; i < w.length; i++) if (w[i] === c) { const f = formAt(w, i); if (!ex[f] && w.length <= 9) ex[f] = [w, i, v]; } if (ex.every(Boolean)) break; }
      const got = ex.map((e, f) => e && `<div class="ar-ex" onclick="window.__speakZh('${esc(e[2].w)}')"><b class="ar">${esc(e[0])}</b><i class="ar-hl">${esc((h.forms || [])[f] || c)}</i><span>${POS()[f]} · ${esc(mean(e[2].m, S.lang))}</span></div>`).filter(Boolean);
      return got.length ? `<div class="muted small mt-12 mb-4">${tt('inWords')}</div><div class="ar-exs">${got.join('')}</div>` : ''; })()}` : ''}
    ${alike.length ? `<div class="sec-label">👀 ${t('similarChars')}</div><div class="ar-combos">${alike.map(x => `<div class="ar-combo" onclick="window.__charSheet('${esc(x)}')"><b>${esc(x)}</b><span>${esc((hm.get(x).m[S.lang] || hm.get(x).m.en || '').split(' — ')[0])}</span></div>`).join('')}</div>` : ''}
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
