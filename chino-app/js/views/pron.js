// Pronunciation: the four tones + neutral, tone sandhi, initials and finals with audio.
import { S } from '../state.js?v=202611132330';
import { register } from '../router.js?v=202611132330';
import { bottomNav, header } from '../ui/components.js?v=202611132330';
import { speak } from '../audio.js?v=202611132330';
import { t } from '../i18n.js?v=202611132330';
import { esc, toneOf, sylReady, syllableList } from '../zh.js?v=202611132330';

const TONES = [
  ['mā', '妈', '˥ 55', { es: 'Alto y plano, como cantar una nota sostenida.', en: 'High and level, like singing a held note.', ja: '高く平らに。音をのばして歌うように。', ko: '높고 평평하게, 음을 길게 부르듯이.' }],
  ['má', '麻', '˧˥ 35', { es: 'Sube, como al preguntar «¿Qué?».', en: 'Rising, like asking "What?".', ja: '上がる。「え？」と聞き返すように。', ko: '올라감. "뭐?"라고 되물을 때처럼.' }],
  ['mǎ', '马', '˨˩˦ 214', { es: 'Baja hasta lo más grave (en el habla normal casi solo baja: «medio tercer tono»).', en: 'Dips low (in normal speech it mostly just stays low: "half third tone").', ja: '低く下がる（普通の会話ではほぼ低いまま＝半三声）。', ko: '낮게 내려감 (보통 말할 때는 낮게만 유지: 반3성).' }],
  ['mà', '骂', '˥˩ 51', { es: 'Cae fuerte y rápido, como una orden: «¡No!».', en: 'Falls sharply, like a command: "No!".', ja: '鋭く下がる。「ダメ！」と命令するように。', ko: '빠르게 뚝 떨어짐. "안 돼!"처럼.' }],
  ['ma', '吗', '·', { es: 'Tono neutro: corto y ligero, sin marca.', en: 'Neutral tone: short and light, no mark.', ja: '軽声：短く軽く、記号なし。', ko: '경성: 짧고 가볍게, 표시 없음.' }],
];

const NOTE = {
  es: '💡 En español el acento cambia la palabra (<b>papa</b> / <b>papá</b>) pero la entonación de la frase es libre. En chino <b>cada sílaba</b> tiene su tono fijo y la frase no puede cambiarlo: <b>mā</b> (madre) y <b>mǎ</b> (caballo) son palabras distintas. Al preguntar no subas el final: usa 吗.',
  en: '💡 In English, pitch carries emotion and questions rise at the end. In Chinese, <b>every syllable</b> has a fixed tone: <b>mā</b> (mother) and <b>mǎ</b> (horse) are different words. Don\'t raise the end of questions — use 吗 instead.',
  ja: '💡 日本語の高低アクセントは「語」単位（箸／橋）ですが、中国語は<b>音節ごと</b>に声調が決まっています。漢字の音読みは似ていても声調は覚え直しが必要です。',
  ko: '💡 한국어는 성조가 없지만, 중국어는 <b>음절마다</b> 성조가 정해져 있습니다. 한자음(마 馬)이 비슷해도 성조는 새로 익혀야 합니다.',
};

const SANDHI = [
  ['你好', 'nǐ hǎo → ní hǎo', { es: '3.º + 3.º → el primero pasa a 2.º tono.', en: '3rd + 3rd → the first becomes 2nd tone.', ja: '3声＋3声 → 前が2声に。', ko: '3성+3성 → 앞이 2성으로.' }],
  ['不是', 'bù shì → bú shì', { es: '不 delante de 4.º tono → bú.', en: '不 before a 4th tone → bú.', ja: '不＋4声 → bú。', ko: '不+4성 → bú.' }],
  ['一个', 'yī gè → yí gè', { es: '一 delante de 4.º tono → yí.', en: '一 before a 4th tone → yí.', ja: '一＋4声 → yí。', ko: '一+4성 → yí.' }],
  ['一天', 'yī tiān → yì tiān', { es: '一 delante de 1.º/2.º/3.º → yì. Contando o al final se mantiene yī.', en: '一 before 1st/2nd/3rd → yì. When counting or at the end it stays yī.', ja: '一＋1・2・3声 → yì。数えるときや末尾は yī。', ko: '一+1·2·3성 → yì. 숫자를 셀 때나 끝에서는 yī.' }],
];

const INITIALS = [
  ['b', '八', 'bā'], ['p', '怕', 'pà'], ['m', '妈', 'mā'], ['f', '发', 'fā'], ['d', '大', 'dà'], ['t', '他', 'tā'], ['n', '那', 'nà'], ['l', '拉', 'lā'],
  ['g', '哥', 'gē'], ['k', '可', 'kě'], ['h', '喝', 'hē'], ['j', '鸡', 'jī'], ['q', '七', 'qī'], ['x', '西', 'xī'],
  ['zh', '知', 'zhī'], ['ch', '吃', 'chī'], ['sh', '是', 'shì'], ['r', '日', 'rì'], ['z', '字', 'zì'], ['c', '次', 'cì'], ['s', '四', 'sì'],
];
const FINALS = [
  ['a', '啊', 'ā'], ['o', '哦', 'ó'], ['e', '饿', 'è'], ['i', '一', 'yī'], ['u', '五', 'wǔ'], ['ü', '鱼', 'yú'], ['ai', '爱', 'ài'], ['ei', '黑', 'hēi'],
  ['ao', '好', 'hǎo'], ['ou', '狗', 'gǒu'], ['an', '饭', 'fàn'], ['en', '人', 'rén'], ['ang', '忙', 'máng'], ['eng', '冷', 'lěng'], ['ong', '中', 'zhōng'],
  ['ia', '家', 'jiā'], ['ie', '谢', 'xiè'], ['iao', '小', 'xiǎo'], ['iu', '六', 'liù'], ['ian', '天', 'tiān'], ['in', '新', 'xīn'], ['iang', '想', 'xiǎng'], ['ing', '听', 'tīng'],
  ['ua', '花', 'huā'], ['uo', '我', 'wǒ'], ['uai', '快', 'kuài'], ['ui', '对', 'duì'], ['uan', '晚', 'wǎn'], ['un', '问', 'wèn'], ['uang', '黄', 'huáng'], ['üe', '学', 'xué'], ['üan', '远', 'yuǎn'],
];
const HARD = {
  es: ['<b>zh ch sh r</b>: lengua curvada hacia atrás (retrofleja); <b>r</b> suena parecido a la «j» francesa, nunca vibrante.', '<b>j q x</b>: lengua plana contra los dientes de abajo, siempre con i/ü; <b>x</b> ≈ «s» muy suave, no «j» española.', '<b>p t k / q ch c</b> llevan aspiración (soplo); <b>b d g</b> NO son sonoras como en español: son p t k sin soplo.', '<b>h</b> suena como la «j» española suave.', '<b>e</b> ≈ vocal entre «e» y «o» (como «uh»); <b>ü</b> = «i» con labios redondeados.', '<b>zi ci si / zhi chi shi ri</b>: la «i» no es «i», es un zumbido de la consonante.'],
  en: ['<b>zh ch sh r</b>: tongue curled back (retroflex).', '<b>j q x</b>: flat tongue behind the lower teeth, only before i/ü.', '<b>b d g</b> are unaspirated (like p t k in "spy, sty, sky"); <b>p t k q ch c</b> are strongly aspirated.', '<b>e</b> ≈ "uh"; <b>ü</b> = "ee" with rounded lips.', '<b>zi ci si / zhi chi shi ri</b>: the "i" is just a buzz of the consonant.'],
  ja: ['<b>zh ch sh r</b>：舌をそり上げる（そり舌音）。', '<b>j q x</b>：舌先を下の歯の裏に。i/ü の前のみ。', '<b>b d g</b> は濁音ではなく無気音、<b>p t k q ch c</b> は強い有気音。', '<b>e</b> は「ウ」と「オ」の中間、<b>ü</b> は「イ」の口で唇を丸める。', '<b>n</b>（前鼻音）と <b>ng</b>（後鼻音）を区別。日本語の「ン」とは違う。'],
  ko: ['<b>zh ch sh r</b>: 혀를 뒤로 말아 올림(권설음).', '<b>j q x</b>: 혀를 평평하게, i/ü 앞에서만.', '<b>b d g</b>는 예사소리(ㅂㄷㄱ)에 가깝고 <b>p t k q ch c</b>는 거센소리(ㅍㅌㅋ).', '<b>f</b>와 <b>p</b>를 구별 (f는 윗니를 아랫입술에).', '<b>e</b>는 "어"에 가깝고, <b>ü</b>는 "위"를 입술을 둥글게 유지하며.'],
};

register('pron', (el) => {
  const L = S.lang;
  const tr = o => o[L] || o.en;
  const cell = ([lab, ch, py]) => `<button class="pron-cell" onclick="window.__speakZh('${ch}')"><b>${esc(lab)}</b><span class="t${toneOf(py)}">${ch} ${esc(py)}</span></button>`;
  el.innerHTML = `<div class="fade">
    ${header('发音 · ' + t('pronunciation'))}
    <button class="card drill-banner mb-16" style="width:100%" onclick="window.__nav('pinyin-chart')">🔤 <strong>${t('sylChart')}</strong> <span class="muted small">· ${t('sylChartHint')}</span><span class="grow"></span>›</button>
    <div class="h3 mb-8">${t('tones')}</div>
    <div class="card mb-16" style="padding:12px">${TONES.map(([py, ch, contour, d]) => `<div class="tone-row" onclick="window.__speakZh('${ch}')">
      <span class="tone-py t${toneOf(py)}">${py}</span><span class="tone-ch">${ch}</span><span class="muted small" style="min-width:60px">${contour}</span>
      <span class="small grow">${tr(d)}</span><span>🔊</span></div>`).join('')}
      <div class="note-box mt-12">${tr(NOTE)}</div>
    </div>
    <div class="h3 mb-8">${t('toneSandhi')}</div>
    <div class="card mb-16" style="padding:12px">${SANDHI.map(([ch, py, d]) => `<div class="tone-row" onclick="window.__speakZh('${ch}')">
      <span class="tone-ch">${ch}</span><span class="small" style="min-width:130px">${esc(py)}</span><span class="small grow">${tr(d)}</span><span>🔊</span></div>`).join('')}</div>
    <div class="h3 mb-8">${t('initials')}</div>
    <div class="pron-grid mb-16">${INITIALS.map(cell).join('')}</div>
    <div class="h3 mb-8">${t('finals')}</div>
    <div class="pron-grid mb-16">${FINALS.map(cell).join('')}</div>
    <div class="h3 mb-8">${t('hardSounds')}</div>
    <div class="card mb-16" style="padding:12px"><ul class="small" style="margin:0;padding-left:18px;line-height:1.7">${(HARD[L] || HARD.en).map(x => `<li>${x}</li>`).join('')}</ul></div>
  </div>${bottomNav('pron')}`;
});

window.__speakZh = (w) => speak(w);

// Full syllable table: every syllable with its four tones, each playable (audio of a character with that exact reading).
let chartFilter = 'all';
register('pinyin-chart', async (el) => {
  await sylReady;
  const list = syllableList();
  const groups = {};
  for (const x of list) (groups[x.i || '∅'] ||= []).push(x);
  const keys = Object.keys(groups);
  const shown = chartFilter === 'all' ? keys : [chartFilter];
  const forms = list.reduce((n, x) => n + Object.keys(x.t).length, 0);
  el.innerHTML = `<div class="fade">
    ${header(t('sylChart'), true)}
    <div class="muted small mb-8">${list.length} ${t('syllables')} · ${forms} ${t('withTone')}. ${t('sylChartHelp')}</div>
    <div class="flex gap-8 mb-12" style="flex-wrap:wrap">
      <button class="chip ${chartFilter === 'all' ? 'on' : ''}" onclick="window.__chartF('all')">${t('fAll')}</button>
      ${keys.map(k => `<button class="chip ${chartFilter === k ? 'on' : ''}" style="padding:4px 10px" onclick="window.__chartF('${k}')">${k}</button>`).join('')}
    </div>
    <input id="syl-q" class="vl-search mb-12" type="search" placeholder="${t('sylSearch')}">
    ${shown.map(k => `<div class="syl-group" data-g="${k}">
      <div class="h3 mt-8 mb-8">${k === '∅' ? t('noInitial') : k}</div>
      <div class="syl-grid">${groups[k].map(x => `<div class="syl-card" data-s="${x.s}">
        <div class="syl-base" onclick="window.__sylAll('${x.s}')" title="▶ 1-2-3-4">${esc(x.s)} <span class="muted">▶</span></div>
        <div class="syl-tones">${[1, 2, 3, 4].map(n => {
          const f = x.t[n];
          return f ? `<button class="syl-t t${n}" onclick="window.__sylPlay('${f.c}')"><b>${esc(f.py)}</b><span>${f.c}</span></button>`
            : `<span class="syl-t off">—</span>`;
        }).join('')}</div>
      </div>`).join('')}</div></div>`).join('')}
  </div>${bottomNav('pron')}`;
  const q = document.getElementById('syl-q');
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').replace('v', 'ü');
    document.querySelectorAll('.syl-card').forEach(c => { c.style.display = !v || c.dataset.s.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').startsWith(v.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '')) ? '' : 'none'; });
    document.querySelectorAll('.syl-group').forEach(g => { g.style.display = [...g.querySelectorAll('.syl-card')].some(c => c.style.display !== 'none') ? '' : 'none'; });
  });
});

window.__chartF = (k) => { chartFilter = k; window.__nav('pinyin-chart'); };
// Plays the four tones of a syllable one after another.
window.__sylAll = async (s) => {
  const x = syllableList().find(y => y.s === s);
  if (!x) return;
  const { speakAsync } = await import('../audio.js?v=202611132330');
  for (const n of [1, 2, 3, 4]) if (x.t[n]) await speakAsync(x.t[n].c);
};
