// ✨ AI tutor with the learner's own Gemini key (Google AI Studio) — the same file in the four apps.
// The key lives only in this browser (localStorage, shared with the Gemini voice); requests go straight from the
// browser to Google, so they never touch the app owner's account. Used by: texts (select text / tapped word),
// lessons (why was my answer wrong?), grammar pages (free questions) and Settings (key + instructions).
import { S } from './state.js?v=202611282046';
import { go } from './router.js?v=202611282046';

const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { return null; } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const APP = (location.pathname.match(/(chino|nihongo|arabic|espanol|english)-app/) || [])[1] || 'chino';
const TARGET = { chino: 'Mandarin Chinese', nihongo: 'Japanese', arabic: 'Modern Standard Arabic', espanol: 'Spanish', english: 'English (British, with American differences when useful)' }[APP];
const READING = { chino: 'Give pinyin with tone marks for every Chinese word or sentence you write.', nihongo: 'Give the reading in hiragana for every kanji word or sentence you write.', arabic: 'Write Arabic with full vowel marks (harakat) and add a Latin transliteration.', espanol: '', english: '', francais: '', deutsch: '' }[APP];
const LANG_NAME = { es: 'Spanish (español)', en: 'English', ja: 'Japanese (日本語)', ko: 'Korean (한국어)', zh: 'Simplified Chinese (简体中文)' };

const TX = {
  tutor: { es: 'Tutor IA', en: 'AI tutor', ja: 'AIチューター', ko: 'AI 튜터', zh: 'AI 辅导' },
  explain: { es: 'Explícame', en: 'Explain', ja: '説明して', ko: '설명해 줘', zh: '讲解一下' },
  why: { es: '¿Por qué?', en: 'Why?', ja: 'なぜ？', ko: '왜?', zh: '为什么？' },
  askGrammar: { es: 'Pregunta tus dudas al tutor', en: 'Ask the tutor your questions', ja: 'チューターに質問する', ko: '튜터에게 질문하기', zh: '向辅导老师提问' },
  slow: { es: 'La IA está tardando demasiado (puede que Google esté saturado). Vuelve a intentarlo en un momento.', en: 'The AI is taking too long (Google may be busy). Please try again in a moment.', ja: 'AI の応答に時間がかかりすぎています（Google が混雑している可能性があります）。少ししてからもう一度お試しください。', ko: 'AI 응답이 너무 오래 걸립니다(Google이 혼잡할 수 있어요). 잠시 후 다시 시도해 주세요.', zh: 'AI 响应时间过长（Google 可能比较繁忙）。请稍后再试。' },
  net: { es: 'No se pudo conectar con la IA. Revisa tu conexión a internet y vuelve a intentarlo.', en: 'Could not reach the AI. Check your internet connection and try again.', ja: 'AI に接続できませんでした。インターネット接続を確認して、もう一度お試しください。', ko: 'AI에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', zh: '无法连接 AI。请检查网络连接后重试。' },
  empty: { es: 'La IA no ha devuelto ninguna respuesta. Prueba a preguntarlo de otra forma.', en: 'The AI returned no answer. Try asking in a different way.', ja: 'AI から回答がありませんでした。聞き方を変えてみてください。', ko: 'AI가 답을 주지 않았어요. 다르게 질문해 보세요.', zh: 'AI 没有返回回答。换个方式提问试试。' },
  thinking: { es: 'Pensando…', en: 'Thinking…', ja: '考え中…', ko: '생각 중…', zh: '思考中…' },
  follow: { es: 'Pregunta algo más…', en: 'Ask something else…', ja: '続けて質問…', ko: '더 물어보기…', zh: '继续提问……' },
  send: { es: 'Enviar', en: 'Send', ja: '送信', ko: '보내기', zh: '发送' },
  close: { es: 'Cerrar', en: 'Close', ja: '閉じる', ko: '닫기', zh: '关闭' },
  noKey: { es: 'Para usar el tutor necesitas tu propia clave gratuita de Gemini (Google). Se configura una sola vez en Ajustes y tarda 2 minutos.', en: 'To use the tutor you need your own free Gemini (Google) key. You set it up once in Settings; it takes 2 minutes.', ja: 'チューターを使うには、無料の Gemini（Google）キーが必要です。設定で一度入力するだけ（約2分）です。', ko: '튜터를 쓰려면 무료 Gemini(Google) 키가 필요합니다. 설정에서 한 번만 입력하면 됩니다(약 2분).', zh: '使用辅导功能需要你自己的免费 Gemini（Google）密钥。在设置里配置一次即可，约需 2 分钟。' },
  goSettings: { es: 'Ir a Ajustes', en: 'Open Settings', ja: '設定を開く', ko: '설정 열기', zh: '打开设置' },
  title: { es: '✨ Tutor IA (Gemini)', en: '✨ AI tutor (Gemini)', ja: '✨ AIチューター（Gemini）', ko: '✨ AI 튜터 (Gemini)', zh: '✨ AI 辅导（Gemini）' },
  intro: { es: 'Selecciona una frase en un texto, toca una palabra o pulsa «¿Por qué?» cuando falles un ejercicio, y la IA de Google te lo explica en tu idioma. Es gratis, pero cada persona usa su propia clave.', en: 'Select a sentence in a text, tap a word or press “Why?” when you get an exercise wrong, and Google’s AI explains it in your language. It’s free, but each person uses their own key.', ja: '文章の一部を選択したり、単語をタップしたり、間違えたときに「なぜ？」を押すと、Google の AI があなたの言語で説明します。無料ですが、各自のキーを使います。', ko: '텍스트에서 문장을 선택하거나, 단어를 누르거나, 틀렸을 때 "왜?"를 누르면 Google AI가 당신의 언어로 설명해 줍니다. 무료이지만 각자 자신의 키를 사용합니다.', zh: '在文章中选中句子、点一个词，或在答错时点“为什么？”，Google 的 AI 就会用你的语言讲解。免费，但每个人使用自己的密钥。' },
  how: { es: 'Cómo conseguir tu clave (gratis, 2 minutos)', en: 'How to get your key (free, 2 minutes)', ja: 'キーの取得方法（無料・2分）', ko: '키 받는 방법 (무료, 2분)', zh: '如何获取密钥（免费，2 分钟）' },
  steps: {
    es: ['Pulsa el botón <b>«Abrir Google AI Studio»</b> de abajo. Se abre una página de Google.', 'Entra con tu <b>cuenta de Google</b> (la misma de Gmail o YouTube). Si te pide aceptar las condiciones, márcalas y pulsa <b>Continuar</b>.', 'Pulsa el botón azul <b>«Create API key»</b> (Crear clave de API). Si te pregunta por un proyecto, elige el que aparezca o «Create project».', 'Aparece un código largo que empieza por <b>AIza…</b> Pulsa el icono de <b>copiar</b> que hay a su lado.', 'Vuelve a esta app, <b>pega</b> el código en la casilla de abajo (mantén pulsado → Pegar) y pulsa <b>Guardar y probar</b>. Si sale ✓, ¡listo!'],
    en: ['Tap the <b>“Open Google AI Studio”</b> button below. A Google page opens.', 'Sign in with your <b>Google account</b> (the same as Gmail or YouTube). If asked to accept the terms, tick them and tap <b>Continue</b>.', 'Tap the blue <b>“Create API key”</b> button. If it asks about a project, pick the one shown or “Create project”.', 'A long code starting with <b>AIza…</b> appears. Tap the <b>copy</b> icon next to it.', 'Come back to this app, <b>paste</b> the code in the box below (long-press → Paste) and tap <b>Save and test</b>. If you see ✓, you’re done!'],
    ja: ['下の<b>「Google AI Studio を開く」</b>を押すと、Google のページが開きます。', '<b>Google アカウント</b>（Gmail や YouTube と同じもの）でログインします。規約への同意を求められたらチェックして<b>続行</b>を押します。', '青い<b>「Create API key」</b>（API キーを作成）ボタンを押します。プロジェクトを聞かれたら、表示されたもの（または「Create project」）を選びます。', '<b>AIza…</b> で始まる長いコードが表示されます。横の<b>コピー</b>アイコンを押します。', 'このアプリに戻り、下の欄にコードを<b>貼り付け</b>（長押し → 貼り付け）、<b>保存してテスト</b>を押します。✓ が出たら完了です！'],
    ko: ['아래 <b>"Google AI Studio 열기"</b> 버튼을 누르면 Google 페이지가 열립니다.', '<b>Google 계정</b>(Gmail, YouTube와 같은 계정)으로 로그인합니다. 약관 동의를 요청하면 체크하고 <b>계속</b>을 누릅니다.', '파란색 <b>"Create API key"</b>(API 키 만들기) 버튼을 누릅니다. 프로젝트를 물으면 표시된 것(또는 "Create project")을 고릅니다.', '<b>AIza…</b>로 시작하는 긴 코드가 나타납니다. 옆의 <b>복사</b> 아이콘을 누릅니다.', '이 앱으로 돌아와 아래 칸에 코드를 <b>붙여넣고</b>(길게 누르기 → 붙여넣기) <b>저장 및 테스트</b>를 누릅니다. ✓가 보이면 끝!'],
    zh: ['点击下面的<b>“打开 Google AI Studio”</b>按钮，会打开一个 Google 页面。', '用你的 <b>Google 账号</b>登录（和 Gmail、YouTube 是同一个）。如果要求接受条款，勾选后点<b>继续</b>。', '点击蓝色的<b>“Create API key”</b>（创建 API 密钥）按钮。如果询问项目，选择显示的那个或“Create project”。', '会出现一串以 <b>AIza…</b> 开头的长代码。点击旁边的<b>复制</b>图标。', '回到本应用，把代码<b>粘贴</b>到下面的框里（长按 → 粘贴），然后点<b>保存并测试</b>。看到 ✓ 就完成了！'],
  },
  open: { es: 'Abrir Google AI Studio', en: 'Open Google AI Studio', ja: 'Google AI Studio を開く', ko: 'Google AI Studio 열기', zh: '打开 Google AI Studio' },
  keyPh: { es: 'Pega aquí tu clave (AIza…)', en: 'Paste your key here (AIza…)', ja: 'ここにキーを貼り付け（AIza…）', ko: '여기에 키 붙여넣기 (AIza…)', zh: '在此粘贴密钥（AIza…）' },
  save: { es: 'Guardar y probar', en: 'Save and test', ja: '保存してテスト', ko: '저장 및 테스트', zh: '保存并测试' },
  forget: { es: 'Borrar clave', en: 'Remove key', ja: 'キーを削除', ko: '키 삭제', zh: '删除密钥' },
  ok: { es: '✓ Funciona. Ya puedes usar el tutor (y la voz Gemini).', en: '✓ It works. You can now use the tutor (and the Gemini voice).', ja: '✓ 使えます。チューター（と Gemini の音声）が利用できます。', ko: '✓ 작동합니다. 이제 튜터(와 Gemini 음성)를 쓸 수 있어요.', zh: '✓ 可以使用了。现在可以用辅导功能（以及 Gemini 语音）。' },
  bad: { es: '✗ La clave no funciona. Comprueba que la has copiado entera (empieza por AIza) y sin espacios.', en: '✗ The key doesn’t work. Check you copied all of it (it starts with AIza) with no spaces.', ja: '✗ キーが使えません。全体を（AIza から）空白なしでコピーしたか確認してください。', ko: '✗ 키가 작동하지 않습니다. AIza로 시작하는 전체를 공백 없이 복사했는지 확인하세요.', zh: '✗ 密钥无效。请检查是否完整复制（以 AIza 开头）且没有空格。' },
  privacy: { es: '🔒 La clave se guarda solo en este móvil u ordenador y se envía únicamente a Google. No la compartas con nadie. El uso gratuito tiene un límite diario; si se agota, vuelve a funcionar al día siguiente.', en: '🔒 The key is stored only on this phone or computer and is sent only to Google. Don’t share it with anyone. Free use has a daily limit; if you reach it, it works again the next day.', ja: '🔒 キーはこの端末にだけ保存され、Google にだけ送られます。誰とも共有しないでください。無料枠には1日の上限があり、超えた場合は翌日また使えます。', ko: '🔒 키는 이 기기에만 저장되고 Google에만 전송됩니다. 다른 사람과 공유하지 마세요. 무료 사용은 하루 한도가 있으며, 다 쓰면 다음 날 다시 됩니다.', zh: '🔒 密钥只保存在这台手机或电脑上，只发送给 Google。请勿与他人分享。免费使用有每日上限，用完后第二天恢复。' },
  quota: { es: 'Has llegado al límite gratuito de hoy. Prueba más tarde o mañana.', en: 'You’ve reached today’s free limit. Try later or tomorrow.', ja: '本日の無料上限に達しました。後でまたは明日お試しください。', ko: '오늘의 무료 한도에 도달했습니다. 나중에 또는 내일 다시 시도하세요.', zh: '已达到今天的免费上限，请稍后或明天再试。' },
};
const tt = k => { const o = TX[k]; return (o && (o[S.lang] || o.en)) || ''; };

export const tutorKey = () => LS('gemini_tts_key') || LS('nh_gemini_key') || '';
const setKey = v => { LS('gemini_tts_key', v ? v.trim() : null); LS('nh_gemini_key', null); };

// Models this key can't use (e.g. "no longer available to new users"), so they are never picked again.
const badModels = () => { try { return JSON.parse(LS('gemini_bad_models') || '[]'); } catch { return []; } };
const markBad = m => LS('gemini_bad_models', JSON.stringify([...new Set([...badModels(), m])]));
const ver = m => parseFloat((m.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);

async function pickModel(key, fresh) {
  const bad = badModels();
  const saved = LS('gemini_tutor_model');
  if (!fresh && saved && !bad.includes(saved)) return saved;
  let m = 'gemini-3.8-flash';
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    const j = await r.json();
    const ms = (j.models || []).filter(x => (x.supportedGenerationMethods || []).includes('generateContent') && /gemini/.test(x.name) && !/tts|image|embed|audio|live|thinking/.test(x.name))
      .map(x => x.name.replace('models/', '')).filter(x => !bad.includes(x)).sort((a, b) => ver(b) - ver(a));
    m = ms.find(x => /flash/.test(x) && !/lite|preview|exp/.test(x)) || ms.find(x => /flash/.test(x)) || ms[0] || m;
  } catch {}
  LS('gemini_tutor_model', m);
  return m;
}

// Recent Gemini models "think" before answering, which can take a minute or more: ask for little thinking.
// Older models reject the option, so it is dropped if the API complains about it.
const thinkCfg = m => /gemini-2\.5/.test(m) ? { thinkingBudget: /pro/.test(m) ? 128 : 0 } : ver(m) >= 3 ? { thinkingLevel: 'low' } : null;
const fail = (k, status = 0) => { const e = new Error(tt(k)); e.status = status; return e; };

async function call(contents, retry = 2, forced = null, noThink = false, sys = null) {
  const key = tutorKey();
  const model = forced || await pickModel(key, retry < 2);
  const gen = { temperature: 0.4, maxOutputTokens: 4096 };
  const tc = !noThink && thinkCfg(model);
  if (tc) gen.thinkingConfig = tc;
  // Never leave "Thinking…" on screen forever: give up after 60 s with a clear message.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  let r, j;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: ctrl.signal,
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: sys || system() }] }, generationConfig: gen }),
    });
    j = await r.json().catch(() => ({}));
  } catch (e) {
    throw fail(e && e.name === 'AbortError' ? 'slow' : 'net');
  } finally { clearTimeout(timer); }
  if (!r.ok) {
    const msg = j.error?.message || '';
    if (tc && r.status === 400 && /think/i.test(msg)) return call(contents, retry, model, true, sys);
    // Retired or unknown model: remember it, follow Google's suggestion ("use models/…") or pick another one.
    if (retry > 0 && r.status !== 429 && (r.status === 404 || /model|no longer available|deprecated|not supported/i.test(msg))) {
      markBad(model); LS('gemini_tutor_model', null);
      const sug = (msg.match(/models\/(gemini-[\w.-]*\w)/g) || []).map(x => x.slice(7)).find(x => x !== model && !badModels().includes(x));
      if (sug) LS('gemini_tutor_model', sug);
      return call(contents, retry - 1, sug, false, sys);
    }
    const e = new Error(msg || String(r.status)); e.status = r.status; throw e;
  }
  const out = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
  if (!out) {
    if (retry > 0 && !noThink) return call(contents, retry - 1, model, true, sys);
    throw fail('empty');
  }
  return out;
}

function system() {
  const L = LANG_NAME[S.lang] || 'English';
  return `You are a friendly, precise ${TARGET} teacher inside a language-learning app. The learner's level is ${String(S.level || '').toUpperCase() || 'unknown'}.
ALWAYS answer in ${L}. Be concise (about 150 words unless asked for more). Structure: meaning in context; the grammar (form, conjugation or structure) and why it is used here; what it is often confused with and the difference; two short new examples with translation into ${L}.
${READING} Use **bold** for key forms. Never invent facts about the text; if something is ambiguous, say so.`;
}

// Minimal Markdown → HTML (bold, italics, bullets, line breaks).
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
  .replace(/^\s*[-*•] (.*)\n?/gm, '<li>$1</li>').replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`).replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');

// "Thinking…" with three dots that bounce in turn while the answer is on its way.
export function thinkingHTML() {
  if (!document.getElementById('tutor-dots-css')) {
    const st = document.createElement('style'); st.id = 'tutor-dots-css';
    st.textContent = `.tutor-think{display:inline-flex;align-items:center;gap:10px;color:var(--muted,#888)}
.tutor-dots{display:inline-flex;gap:5px}.tutor-dots i{width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.35;animation:tutorDot 1.2s infinite ease-in-out}
.tutor-dots i:nth-child(2){animation-delay:.15s}.tutor-dots i:nth-child(3){animation-delay:.3s}
@keyframes tutorDot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-6px);opacity:1}}
@media (prefers-reduced-motion:reduce){.tutor-dots i{animation:none;opacity:.7}}`;
    document.head.appendChild(st);
  }
  return `<span class="tutor-think" role="status"><span class="tutor-dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(tt('thinking'))}</span>`;
}

// Opens the tutor sheet: `ctx` (shown as a quote) + `question` (first message). The learner can keep asking.
// Free-form chat with Gemini and a custom system prompt (role-play conversations in the speaking practice).
export const chatGemini = (contents, sys) => call(contents, 2, null, false, sys);
export const errText = e => e && (e.status === 429 || /quota|exhausted/i.test(e.message || '')) ? tt('quota') : e && (e.status === 400 || e.status === 403) ? tt('bad') : (e && e.message) || '';

export function askTutor(question, ctx = '') {
  document.querySelectorAll('.tutor-sheet').forEach(x => x.remove());
  const sh = document.createElement('div');
  sh.className = 'sheet-backdrop tutor-sheet fade';
  sh.innerHTML = `<div class="sheet slideup" style="max-height:88vh;display:flex;flex-direction:column">
    <div class="flex items-center justify-between mb-8"><span class="h3">✨ ${tt('tutor')}</span>
      <button class="btn btn-soft btn-small" data-close>${tt('close')}</button></div>
    ${ctx ? `<div class="tutor-ctx">${esc(ctx)}</div>` : ''}
    <div class="tutor-log" style="overflow:auto;flex:1"></div>
    ${tutorKey() ? `<form class="tutor-form flex gap-8 mt-8"><input class="vl-search" style="flex:1" placeholder="${esc(tt('follow'))}"><button class="btn btn-small">${tt('send')}</button></form>` : ''}
  </div>`;
  sh.addEventListener('click', e => { if (e.target === sh || e.target.closest('[data-close]')) sh.remove(); });
  document.body.appendChild(sh);
  const log = sh.querySelector('.tutor-log');
  if (!tutorKey()) {
    log.innerHTML = `<p>${tt('noKey')}</p><button class="btn mt-8" data-go>${tt('goSettings')}</button>`;
    log.querySelector('[data-go]').onclick = () => { sh.remove(); LS('open_tutor_settings', '1'); go('settings'); };
    return;
  }
  const contents = [];
  const send = async (text, shown) => {
    contents.push({ role: 'user', parts: [{ text }] });
    if (shown) log.insertAdjacentHTML('beforeend', `<div class="tutor-q">${esc(shown)}</div>`);
    const a = document.createElement('div'); a.className = 'tutor-a'; a.innerHTML = thinkingHTML(); log.appendChild(a);
    a.scrollIntoView({ block: 'nearest' });
    try {
      const out = await call(contents);
      contents.push({ role: 'model', parts: [{ text: out }] });
      a.innerHTML = md(out);
    } catch (e) {
      contents.pop();
      a.innerHTML = `<span style="color:var(--no)">${e.status === 429 ? tt('quota') : e.status === 400 || e.status === 403 ? tt('bad') : esc(e.message)}</span>`;
    }
  };
  send(question);
  sh.querySelector('.tutor-form')?.addEventListener('submit', e => {
    e.preventDefault(); const i = e.target.querySelector('input'); const v = i.value.trim(); if (!v) return; i.value = ''; send(v, v);
  });
}

// Helpers for the three entry points.
export const explainSelection = (sel, sentence) => askTutor(
  `In the sentence «${sentence}», explain «${sel}».`, sel === sentence ? sel : `${sel} — «${sentence}»`);
export const taskOf = ex => [ex.prompt, ex.sentence, ex.text && !ex.prompt ? '(listening) ' + ex.text : '', ex.trans,
  ex.options ? 'Options: ' + ex.options.join(' / ') : ''].filter(Boolean).join('\n');
export const plain = s => { const d = document.createElement('div'); d.innerHTML = String(s ?? ''); d.querySelectorAll('rt').forEach(x => x.remove()); return d.textContent.trim(); };
export const explainMistake = (task, right, wrong) => askTutor(
  `Exercise: ${task}\nCorrect answer: ${right}\n${wrong ? `My answer: ${wrong}\n` : ''}Why is the correct answer right${wrong ? ' and mine wrong' : ''}? Explain the grammar.`,
  `${task.replace(/\n/g, ' ')} → ${right}`);
export const askAbout = (topic) => askTutor(
  `I'm studying this grammar: ${topic}. Explain it simply with examples, then ask me if I have a specific question.`, topic);

// Text without furigana / ruby annotations from a DOM range.
export function rangeText(range) {
  const f = range.cloneContents();
  f.querySelectorAll('rt, rp, .ar-line-tr, .para-tr').forEach(x => x.remove());
  return f.textContent.replace(/\s+/g, ' ').trim();
}

// The line / paragraph around a node, without furigana or transliteration.
export function sentenceOf(node) {
  const el = (node && node.nodeType === 1 ? node : node?.parentElement)?.closest('.dl, .ar-l, p');
  if (!el) return '';
  const r = document.createRange(); r.selectNodeContents(el);
  return rangeText(r).replace(/^🔊\s*/, '');
}
export const wordOf = (el) => { const r = document.createRange(); r.selectNodeContents(el); return rangeText(r); };

// Floating "✨ Explain" button for text selections inside `root`.
export function wireSelection(root) {
  if (!root) return;
  let btn = document.getElementById('tutor-float');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'tutor-float'; btn.className = 'btn btn-small tutor-float';
    document.body.appendChild(btn);
  }
  btn.textContent = '✨ ' + tt('explain');
  const hide = () => { btn.style.display = 'none'; };
  hide();
  const onSel = () => {
    if (!document.body.contains(root)) { document.removeEventListener('selectionchange', onSel); hide(); return; }
    const s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount || !root.contains(s.anchorNode)) return hide();
    const text = rangeText(s.getRangeAt(0));
    if (!text || text.length > 300) return hide();
    const r = s.getRangeAt(0).getBoundingClientRect();
    btn.style.left = Math.max(8, Math.min(innerWidth - 150, r.left + r.width / 2 - 60)) + 'px';
    btn.style.top = Math.min(innerHeight - 50, r.bottom + 10) + 'px';
    btn.style.display = 'block';
    btn.onclick = () => { hide(); const sent = sentenceOf(s.anchorNode) || text; s.removeAllRanges(); explainSelection(text, sent); };
  };
  document.addEventListener('selectionchange', onSel);
}

// Button markup for other screens.
export const tutorBtn = (onclick, label = 'explain') => `<button class="btn btn-soft btn-small tutor-btn" onclick="event.stopPropagation();${onclick}">✨ ${tt(label)}</button>`;

// Settings block.
export function tutorSettings() {
  const k = tutorKey();
  setTimeout(focusTutorSettings, 80);
  return `<div class="card" id="tutor-settings" style="padding:20px;margin-bottom:16px">
    <div class="h3 mb-8">${tt('title')}</div>
    <div class="small mb-12">${tt('intro')}</div>
    <details ${k ? '' : 'open'}><summary class="small" style="font-weight:700;cursor:pointer">${tt('how')}</summary>
      <ol class="small mt-8" style="padding-left:20px;line-height:1.6">${(TX.steps[S.lang] || TX.steps.en).map(x => `<li style="margin-bottom:6px">${x}</li>`).join('')}</ol>
      <a class="btn btn-soft btn-small mb-12" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">🔑 ${tt('open')} ↗</a>
    </details>
    <div class="flex gap-8 mt-8">
      <input id="tutor-key" type="password" class="vl-search" style="flex:1" placeholder="${esc(tt('keyPh'))}" value="${esc(k)}" autocomplete="off">
    </div>
    <div class="flex gap-8 mt-8" style="flex-wrap:wrap">
      <button class="btn btn-small" onclick="window.__tutorSave()">${tt('save')}</button>
      ${k ? `<button class="btn btn-ghost btn-small" onclick="window.__tutorForget()">${tt('forget')}</button>` : ''}
    </div>
    <div id="tutor-res" class="small mt-8"></div>
    <div class="muted small mt-12">${tt('privacy')}</div>
  </div>`;
}
window.__tutorSave = async () => {
  const v = (document.getElementById('tutor-key')?.value || '').replace(/\s+/g, '');
  const res = document.getElementById('tutor-res');
  if (!v) return;
  setKey(v); LS('gemini_tutor_model', null);
  if (res) res.textContent = tt('thinking');
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=5', { headers: { 'x-goog-api-key': v } });
    if (!r.ok) throw new Error();
    await pickModel(v, true);
    await call([{ role: 'user', parts: [{ text: 'OK' }] }]);   // checks that the chosen model really answers
    if (res) res.innerHTML = `<span style="color:var(--ok);font-weight:700">${tt('ok')}</span>`;
  } catch (e) { if (res) res.innerHTML = `<span style="color:var(--no);font-weight:700">${e && e.status === 429 ? tt('quota') : !e || !e.status || e.status === 400 || e.status === 401 || e.status === 403 ? tt('bad') : esc(e.message)}</span>`; }
};
window.__tutorForget = () => { setKey(''); LS('gemini_tutor_model', null); go('settings'); };
function focusTutorSettings() {
  if (LS('open_tutor_settings')) { LS('open_tutor_settings', null); document.getElementById('tutor-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
window.__askTutor = askTutor;
window.__askAbout = askAbout;
