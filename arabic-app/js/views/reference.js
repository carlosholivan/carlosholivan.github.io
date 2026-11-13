// Grammar reference: every unit's grammar explanation by HSK level, plus shortcuts to drills, vocab and pinyin.
import { S, update } from '../state.js?v=202611131500';
import { register, go } from '../router.js?v=202611131500';
import { loadUnits } from '../data.js?v=202611131500';
import { bottomNav, header } from '../ui/components.js?v=202611131500';
import { t } from '../i18n.js?v=202611131500';
import { levelChips, levelLabel } from '../levels.js?v=202611131500';
import { speak } from '../audio.js?v=202611131500';
import { ruby, pyReady, esc, mean, tonedPinyin, sylReady } from '../ar.js?v=202611131500';
import { allVocab } from './review.js?v=202611131500';
import { wordStatus, statusLegend, STATUS } from '../engine/status.js?v=202611131500';

const tr = (o) => (o && (o[S.lang] || o.en)) || '';

let refTab = 'grammar';

register('reference', async (el, params = {}) => {
  await pyReady;
  if (params.tab) refTab = params.tab;
  const tabs = [['grammar', '📖 ' + t('grammar')], ['vocab', '📝 ' + t('vocabulary')], ['pinyin', 'أ Alfabeto']];
  el.innerHTML = `<div class="fade">
    ${header(t('reference'))}
    <div class="tabbar mb-12">${tabs.map(([id, l]) =>
      `<button class="tab ${refTab === id ? 'on' : ''}" onclick="window.__refTab('${id}')">${l}</button>`).join('')}</div>
    <div id="ref-content"></div>
  </div>${bottomNav('reference')}`;
  const box = el.querySelector('#ref-content');
  if (refTab === 'vocab') await renderVocab(box);
  else if (refTab === 'pinyin') renderPinyin(box);
  else await renderGrammar(box);
});

async function renderGrammar(box) {
  const units = await loadUnits(S.level).catch(() => []);
  box.innerHTML = `<div class="slideup">
    ${levelChips(S.level, '__refLevel')}
    <div class="card drill-banner" onclick="window.__nav('conj')">🔁 <strong>${ruby('تَصْرِيفُ الأَفْعَال')}</strong> <span class="muted small">· Conjugación</span><span class="grow"></span>›</div>
    <div class="card drill-banner" onclick="window.__nav('drills')">🎯 <strong>${ruby('تَمَارِينُ القَوَاعِد')}</strong> <span class="muted small">· ${t('grammarPractice')}</span><span class="grow"></span>›</div>
    ${units.filter(u => u.grammarIntro || (u.grammar || []).length).map(u => `
      <div class="card ref-topic" onclick="window.__go('grammar-detail',{level:'${S.level}',id:${u.id}})">
        <div class="flex items-center gap-8">
          <span class="unit-badge">${t('unit')} ${u.id}</span>
          <div style="font-weight:700;font-size:16px">${u.title?.ja ? ruby(u.title.ja) : ''}</div>
        </div>
        <div class="muted small">${esc(tr(u.title))}</div>
        ${(u.grammar || []).length ? `<div class="small" style="margin-top:4px">${(u.gnames || u.grammar).map(g => esc(g)).join(' · ')}</div>` : ''}
      </div>`).join('') || `<div class="muted" style="text-align:center;padding:40px 0">—</div>`}
  </div>`;
}

async function renderVocab(box) {
  await sylReady;
  const vm = await allVocab();
  const list = [...vm.values()].filter(v => v.lv === S.level).sort((a, b) => (a.q || 99999) - (b.q || 99999));
  const counts = {};
  const st = list.map(v => { const k = wordStatus(v.w); counts[k] = (counts[k] || 0) + 1; return k; });
  box.innerHTML = `<div class="slideup">
    ${levelChips(S.level, '__refLevel')}
    <div class="muted small mb-8">${list.length} ${t('words')} · ${levelLabel(S.level)}</div>
    ${statusLegend(counts)}
    <div class="card drill-banner" onclick="window.__go('vocab-list',{level:'${S.level}'})">☑️ <strong>${t('vocabList')}</strong> <span class="muted small">· ${t('allLevelWords')}</span><span class="grow"></span>›</div>
    <div class="card drill-banner" onclick="window.__go('review',{deck:'v'})">🃏 <strong>${ruby('مُرَاجَعَةُ الكَلِمَات')}</strong> <span class="muted small">· ${t('vocabulary')}</span><span class="grow"></span>›</div>
    <div class="ref-vocab">${list.map((v, i) => `<div class="rv-row" onclick="window.__refSpeak('${esc(v.w)}')">
      <span class="st-dot" style="background:${STATUS[st[i]].color}"></span>
      <span class="rv-w zh-word" style="color:${STATUS[st[i]].color}">${esc(v.w)}</span>
      <span class="rv-p">${tonedPinyin(v.p)}</span>
      <span class="rv-m muted small">${esc(mean(v.m))}</span>
    </div>`).join('')}</div>
  </div>`;
}

function renderPinyin(box) {
  box.innerHTML = `<div class="slideup">
    <div class="card drill-banner" onclick="window.__nav('hanzi')">✍️ <strong>${ruby('الحُرُوف')}</strong> <span class="muted small">· ${t('hanzi')}</span><span class="grow"></span>›</div>
  </div>`;
}

window.__refTab = (id) => { refTab = id; go('reference'); };
window.__refLevel = (lvl) => { update({ level: lvl }); go('reference'); };
window.__refSpeak = (w) => speak(w);
window.__go = (v, p) => go(v, p);

register('grammar-detail', async (el, params) => {
  await pyReady;
  const units = await loadUnits(params.level).catch(() => []);
  const u = units.find(x => String(x.id) === String(params.id));
  if (!u) { go('reference'); return; }
  const html = u.grammarIntro ? tr(u.grammarIntro)
    : `<ul>${(u.gnames || u.grammar || []).map(g => `<li><strong>${esc(g)}</strong></li>`).join('')}</ul>`;
  el.innerHTML = `<div class="fade">
    ${header(`${levelLabel(params.level)} · ${t('unit')} ${u.id}`, true)}
    <div class="h2 mb-4">${u.title?.ja ? ruby(u.title.ja) : ''}</div>
    <div class="muted mb-12">${esc(tr(u.title))}</div>
    <div class="card grammar-section" style="padding:20px" onclick="window.__refZh(event)">${html}</div>
    <button class="btn mt-16" onclick="window.__go('lesson',{level:'${params.level}',unit:${u.id}})">📚 ${t('unit')} ${u.id} →</button>
  </div>`;
});
window.__refZh = (e) => { const z = e.target.closest('.zh'); if (z) speak(z.textContent.trim()); };
