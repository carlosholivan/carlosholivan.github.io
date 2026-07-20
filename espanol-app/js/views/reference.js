import { S } from '../state.js';
import { register, go } from '../router.js';
import { loadGrammar, loadVocab } from '../data.js';
import { bottomNav, header } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { t } from '../i18n.js';
import { getWordLevel, LEVELS, getWordStats } from '../engine/mastery.js';

register('reference', async (el) => {
  el.innerHTML = `<div class="fade">
    ${header(t('reference'))}
    <div class="tabbar" id="ref-tabs">
      <button class="tab on" onclick="window.__refTab('grammar')">📖 ${t('grammar')}</button>
      <button class="tab" onclick="window.__refTab('vocab')">📝 ${t('vocabulary')}</button>
      <button class="tab" onclick="window.__refTab('conjugation')">🔄 ${t('conjugation')}</button>
    </div>
    <div id="ref-content"></div>
  </div>${bottomNav('reference')}`;

  window.__refTab = (tab) => {
    document.querySelectorAll('.tab').forEach((t, i) => {
      t.classList.toggle('on', ['grammar','vocab','conjugation'][i] === tab);
    });
    renderTab(tab);
  };

  renderTab('grammar');

  async function renderTab(tab) {
    const box = document.getElementById('ref-content');
    if (tab === 'grammar') await renderGrammar(box);
    else if (tab === 'vocab') await renderVocabList(box);
    else if (tab === 'conjugation') renderConjugation(box);
  }

  async function renderGrammar(box) {
    const grammar = await loadGrammar(S.level);
    box.innerHTML = `<div class="slideup">
      <div class="flex gap-8 mb-12">
        <button class="chip ${S.level === 'a1' ? 'on' : ''}" onclick="window.__refLevel('a1')">A1</button>
        <button class="chip ${S.level === 'a2' ? 'on' : ''}" onclick="window.__refLevel('a2')">A2</button>
      </div>
      ${grammar.map(g => `
        <div class="card" style="padding:16px 18px;margin-bottom:12px;cursor:pointer" onclick="window.__showGrammar('${g.id}')">
          <div style="font-weight:600;font-size:15px">${g.title[S.lang] || g.title.en}</div>
          <div class="muted small">${g.summary[S.lang] || g.summary.en}</div>
        </div>
      `).join('')}
    </div>`;
  }

  window.__refLevel = (lvl) => {
    S.level = lvl;
    renderTab('grammar');
  };

  window.__showGrammar = async (id) => {
    go('grammar-detail', { level: S.level, id });
  };

  async function renderVocabList(box) {
    const vocab = await loadVocab(S.level);
    box.innerHTML = `<div class="slideup">
      <div class="flex gap-8 mb-12">
        <button class="chip ${S.level === 'a1' ? 'on' : ''}" onclick="window.__vocabLevel('a1')">A1</button>
        <button class="chip ${S.level === 'a2' ? 'on' : ''}" onclick="window.__vocabLevel('a2')">A2</button>
      </div>
      <div class="flex items-center justify-between mb-12">
        <span class="muted small">${vocab.length} ${t('words')}</span>
        <div class="flex gap-8" style="font-size:11px">
          <span style="color:${LEVELS.master.color}">● ${t('master')}</span>
          <span style="color:${LEVELS.intermediate.color}">● ${t('intermediate2')}</span>
          <span style="color:${LEVELS.beginner.color}">● ${t('beginner2')}</span>
          <span style="color:${LEVELS.ghost.color}">● ${t('ghost')}</span>
        </div>
      </div>
      <div style="max-height:60vh;overflow-y:auto">
        ${vocab.map(v => {
          const level = getWordLevel(v.word);
          const lv = LEVELS[level];
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
            <div class="flex items-center gap-8">
              <span style="width:8px;height:8px;border-radius:50%;background:${lv.color};flex-shrink:0"></span>
              <span style="font-weight:600">${v.word}</span>
              ${v.gender ? `<span class="muted small">${v.gender === 'm' ? '♂' : '♀'}</span>` : ''}
            </div>
            <div class="muted small" style="text-align:right;max-width:50%">${v.m[S.lang] || v.m.en}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  window.__vocabLevel = (lvl) => {
    S.level = lvl;
    renderTab('vocab');
  };

  function renderConjugation(box) {
    const verbs = [
      { inf: 'ser', type: 'irregular', present: { yo:'soy', tú:'eres', 'él':'es', nosotros:'somos', vosotros:'sois', ellos:'son' }, pret: { yo:'fui', tú:'fuiste', 'él':'fue', nosotros:'fuimos', vosotros:'fuisteis', ellos:'fueron' } },
      { inf: 'estar', type: 'irregular', present: { yo:'estoy', tú:'estás', 'él':'está', nosotros:'estamos', vosotros:'estáis', ellos:'están' }, pret: { yo:'estuve', tú:'estuviste', 'él':'estuvo', nosotros:'estuvimos', vosotros:'estuvisteis', ellos:'estuvieron' } },
      { inf: 'tener', type: 'irregular', present: { yo:'tengo', tú:'tienes', 'él':'tiene', nosotros:'tenemos', vosotros:'tenéis', ellos:'tienen' }, pret: { yo:'tuve', tú:'tuviste', 'él':'tuvo', nosotros:'tuvimos', vosotros:'tuvisteis', ellos:'tuvieron' } },
      { inf: 'ir', type: 'irregular', present: { yo:'voy', tú:'vas', 'él':'va', nosotros:'vamos', vosotros:'vais', ellos:'van' }, pret: { yo:'fui', tú:'fuiste', 'él':'fue', nosotros:'fuimos', vosotros:'fuisteis', ellos:'fueron' } },
      { inf: 'hacer', type: 'irregular', present: { yo:'hago', tú:'haces', 'él':'hace', nosotros:'hacemos', vosotros:'hacéis', ellos:'hacen' }, pret: { yo:'hice', tú:'hiciste', 'él':'hizo', nosotros:'hicimos', vosotros:'hicisteis', ellos:'hicieron' } },
      { inf: 'poder', type: 'irregular', present: { yo:'puedo', tú:'puedes', 'él':'puede', nosotros:'podemos', vosotros:'podéis', ellos:'pueden' }, pret: { yo:'pude', tú:'pudiste', 'él':'pudo', nosotros:'pudimos', vosotros:'pudisteis', ellos:'pudieron' } },
      { inf: 'querer', type: 'irregular', present: { yo:'quiero', tú:'quieres', 'él':'quiere', nosotros:'queremos', vosotros:'queréis', ellos:'quieren' }, pret: { yo:'quise', tú:'quisiste', 'él':'quiso', nosotros:'quisimos', vosotros:'quisisteis', ellos:'quisieron' } },
      { inf: 'hablar', type: '-ar regular', present: { yo:'hablo', tú:'hablas', 'él':'habla', nosotros:'hablamos', vosotros:'habláis', ellos:'hablan' }, pret: { yo:'hablé', tú:'hablaste', 'él':'habló', nosotros:'hablamos', vosotros:'hablasteis', ellos:'hablaron' } },
      { inf: 'comer', type: '-er regular', present: { yo:'como', tú:'comes', 'él':'come', nosotros:'comemos', vosotros:'coméis', ellos:'comen' }, pret: { yo:'comí', tú:'comiste', 'él':'comió', nosotros:'comimos', vosotros:'comisteis', ellos:'comieron' } },
      { inf: 'vivir', type: '-ir regular', present: { yo:'vivo', tú:'vives', 'él':'vive', nosotros:'vivimos', vosotros:'vivís', ellos:'viven' }, pret: { yo:'viví', tú:'viviste', 'él':'vivió', nosotros:'vivimos', vosotros:'vivisteis', ellos:'vivieron' } },
    ];

    box.innerHTML = `<div class="slideup">
      ${verbs.map(v => `
        <div class="card" style="padding:16px 18px;margin-bottom:12px;cursor:pointer" onclick="window.__toggleVerb(this)">
          <div class="flex items-center justify-between">
            <div>
              <span style="font-weight:600;font-size:16px">${v.inf}</span>
              <span class="muted small" style="margin-left:8px">${v.type}</span>
            </div>
            <span class="muted">▼</span>
          </div>
          <div class="verb-detail" style="display:none;margin-top:12px">
            <div class="small muted mb-8" style="font-weight:600">${t('present')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:14px;margin-bottom:12px">
              ${Object.entries(v.present).map(([p,f]) => `<div><span class="muted">${p}</span> <strong>${f}</strong></div>`).join('')}
            </div>
            <div class="small muted mb-8" style="font-weight:600">${t('preterite')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:14px">
              ${Object.entries(v.pret).map(([p,f]) => `<div><span class="muted">${p}</span> <strong>${f}</strong></div>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  window.__toggleVerb = (el) => {
    const detail = el.querySelector('.verb-detail');
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  };
});

register('grammar-detail', async (el, params) => {
  const grammar = await loadGrammar(params.level);
  const item = grammar.find(g => g.id === params.id);
  if (!item) { go('reference'); return; }

  const explanation = item.explanation[S.lang] || item.explanation.en;

  el.innerHTML = `<div class="fade">
    ${header(item.title[S.lang] || item.title.en, true)}

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-12">${t('explanation')}</div>
      <div style="font-size:14px;line-height:1.8;white-space:pre-wrap">${formatExplanation(explanation)}</div>
    </div>

    ${item.conjugation ? `
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="h3 mb-12">${t('conjugation')}</div>
        ${Object.entries(item.conjugation).map(([verb, forms]) => `
          <div style="margin-bottom:14px">
            <div style="font-weight:600;margin-bottom:6px">${verb}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:14px">
              ${Object.entries(forms).map(([p,f]) => `<div><span class="muted">${p}</span> <strong>${f}</strong></div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${item.examples ? `
      <div class="card" style="padding:20px">
        <div class="h3 mb-12">${t('examples')}</div>
        ${item.examples.map(ex => `
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--line)">
            <div style="font-weight:600;font-size:15px">${ex.es}</div>
            <div class="muted small">${ex[S.lang] || ex.en}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>`;
});

function formatExplanation(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
