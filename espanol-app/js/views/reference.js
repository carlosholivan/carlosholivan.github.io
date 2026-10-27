import { S } from '../state.js';
import { register, go } from '../router.js';
import { loadGrammar, loadVocab } from '../data.js';
import { bottomNav, header } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { t } from '../i18n.js';
import { levelChips } from '../levels.js';
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
      ${levelChips(S.level, '__refLevel')}
      <div class="card drill-banner" onclick="window.__nav('drills')">🎯 <strong>Práctica de gramática</strong> <span class="muted small">· ${t('grammarPractice')}</span><span class="grow"></span>›</div>
      ${grammar.map(g => `
        <div class="card ref-topic" onclick="window.__showGrammar('${g.id}')">
          <div class="flex items-center gap-8">
            <span class="unit-badge ${g.unit ? '' : 'extra'}">${g.unit ? `${t('unit')} ${g.unit}` : '+'}</span>
            <div style="font-weight:600;font-size:15px">${g.title[S.lang] || g.title.en}</div>
          </div>
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
      ${levelChips(S.level, '__vocabLevel')}
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
    const P = ['yo', 'tú', 'él/ella', 'nosotros', 'vosotros', 'ellos'];
    const groups = [
      { label: { en: 'Regular', zh: '规则动词', ja: '規則動詞' }, verbs: [
        ['hablar', '-ar', 'habl==o== habl==as== habl==a== habl==amos== habl==áis== habl==an=='],
        ['comer', '-er', 'com==o== com==es== com==e== com==emos== com==éis== com==en=='],
        ['vivir', '-ir', 'viv==o== viv==es== viv==e== viv==imos== viv==ís== viv==en=='],
      ]},
      { label: { en: 'Stem change o → ue (not nosotros/vosotros)', zh: '词干 o → ue（nosotros/vosotros 不变）', ja: '語幹 o → ue（nosotros/vosotros は変化なし）' }, verbs: [
        ['poder', 'o→ue', 'p==ue==do p==ue==des p==ue==de podemos podéis p==ue==den'],
        ['dormir', 'o→ue', 'd==ue==rmo d==ue==rmes d==ue==rme dormimos dormís d==ue==rmen'],
        ['volver', 'o→ue', 'v==ue==lvo v==ue==lves v==ue==lve volvemos volvéis v==ue==lven'],
        ['jugar', 'u→ue', 'j==ue==go j==ue==gas j==ue==ga jugamos jugáis j==ue==gan'],
      ]},
      { label: { en: 'Stem change e → ie', zh: '词干 e → ie', ja: '語幹 e → ie' }, verbs: [
        ['querer', 'e→ie', 'qu==ie==ro qu==ie==res qu==ie==re queremos queréis qu==ie==ren'],
        ['pensar', 'e→ie', 'p==ie==nso p==ie==nsas p==ie==nsa pensamos pensáis p==ie==nsan'],
        ['empezar', 'e→ie', 'emp==ie==zo emp==ie==zas emp==ie==za empezamos empezáis emp==ie==zan'],
      ]},
      { label: { en: 'Stem change e → i (-ir verbs)', zh: '词干 e → i（-ir 动词）', ja: '語幹 e → i（-ir 動詞）' }, verbs: [
        ['pedir', 'e→i', 'p==i==do p==i==des p==i==de pedimos pedís p==i==den'],
        ['repetir', 'e→i', 'rep==i==to rep==i==tes rep==i==te repetimos repetís rep==i==ten'],
      ]},
      { label: { en: 'Irregular "yo" only (-go, -zco…)', zh: '只有 yo 不规则（-go、-zco…）', ja: 'yo だけ不規則（-go・-zco…）' }, verbs: [
        ['hacer', 'yo-go', 'ha==go== haces hace hacemos hacéis hacen'],
        ['poner', 'yo-go', 'pon==go== pones pone ponemos ponéis ponen'],
        ['salir', 'yo-go', 'sal==go== sales sale salimos salís salen'],
        ['conocer', '-zco', 'cono==zco== conoces conoce conocemos conocéis conocen'],
        ['saber', 'yo', '==sé== sabes sabe sabemos sabéis saben'],
        ['ver', 'yo', 'v==eo== ves ve vemos veis ven'],
      ]},
      { label: { en: 'Yo-go + stem change', zh: 'yo-go + 词干变化', ja: 'yo-go ＋ 語幹変化' }, verbs: [
        ['tener', 'go + e→ie', 'ten==go== t==ie==nes t==ie==ne tenemos tenéis t==ie==nen'],
        ['venir', 'go + e→ie', 'ven==go== v==ie==nes v==ie==ne venimos venís v==ie==nen'],
        ['decir', 'go + e→i', 'di==go== d==i==ces d==i==ce decimos decís d==i==cen'],
      ]},
      { label: { en: 'Totally irregular', zh: '完全不规则', ja: '完全な不規則' }, verbs: [
        ['ser', '', 'soy eres es somos sois son'],
        ['estar', '', 'est==oy== est==á==s est==á== estamos estáis est==á==n'],
        ['ir', '', 'voy vas va vamos vais van'],
      ]},
    ];
    const L = S.lang || 'en';

    box.innerHTML = `<div class="slideup">
      ${groups.map(g => `
        <div class="h3 mt-16 mb-8">${g.label[L] || g.label.en}</div>
        ${g.verbs.map(([inf, tag, forms]) => `
          <div class="card" style="padding:14px 18px;margin-bottom:10px;cursor:pointer" onclick="window.__toggleVerb(this)">
            <div class="flex items-center justify-between">
              <div><span style="font-weight:600;font-size:16px">${inf}</span>
                ${tag ? `<span class="muted small" style="margin-left:8px">${tag}</span>` : ''}</div>
              <span class="muted">▼</span>
            </div>
            <div class="verb-detail" style="display:none;margin-top:12px">
              <div class="conj-grid">${forms.split(' ').map((f, i) => `<div><span class="muted">${P[i]}</span> <strong>${hl(f)}</strong></div>`).join('')}</div>
            </div>
          </div>`).join('')}
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
              ${Object.entries(forms).map(([p,f]) => `<div><span class="muted">${p}</span> <strong>${hl(f)}</strong></div>`).join('')}
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

// ==x== highlights the changing letters; ~~x~~ marks a wrong form.
function hl(text) {
  return String(text)
    .replace(/==(.+?)==/g, '<mark class="hl">$1</mark>')
    .replace(/~~(.+?)~~/g, '<s class="wrong">$1</s>');
}

function formatExplanation(text) {
  return hl(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
