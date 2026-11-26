// Story mode: the same lessons, in the same order, lived as a story. Each level is a chapter of the hero's life;
// each lesson opens with a short scene (with a choice that changes the dialogue, never the content), then a friend
// sets the lesson's exercises as challenges inside the scene (no jump to study mode), and a short scene closes it.
// Data: data/story/meta.json (cast, chapters) and data/story/<level>.json (built from tools/story_src/).
import { CFG } from '../app-config.js?v=202611262115';
import { S, update, completeUnit } from '../state.js?v=202611262115';
import { register, go } from '../router.js?v=202611262115';
import { LEVELS, levelLabel } from '../levels.js?v=202611262115';
import { loadUnits, loadVocab, loadUnit } from '../data.js?v=202611262115';
import { addCards } from '../engine/anki.js?v=202611262115';
import { unitVocab } from '../engine/exercises.js?v=202611262115';
import { bottomNav, pyToggle } from '../ui/components.js?v=202611262115';
import { speak, speakAs, stop } from '../audio.js?v=202611262115';
import { ruby, pyReady, sylReady, esc } from '../zh.js?v=202611262115';

const L = o => (o && (o[S.lang] || (S.lang === 'es' ? o.es : o.en) || o.es || o.en)) || '';
// Target-language text, with pinyin / furigana / transliteration when the app has it. `s` = precomputed ruby
// segments (Japanese furigana from MeCab, built by tools/build_story.py) when present.
const T = (t, s) => ruby(t, s ? { segs: s } : {});
const LG = { chino: 'zh', nihongo: 'ja', arabic: 'ar', espanol: 'es', english: 'en', francais: 'fr', deutsch: 'de' }[CFG.id] || 'en';
const TX = {
  mode: { es: 'Modo historia', en: 'Story mode' }, study: { es: 'Modo estudio', en: 'Study mode' },
  chapter: { es: 'Capítulo', en: 'Chapter' }, lesson: { es: 'Lección', en: 'Lesson' },
  play: { es: 'Jugar', en: 'Play' }, replay: { es: 'Volver a ver', en: 'Replay' },
  next: { es: 'Siguiente', en: 'Next' }, skip: { es: 'Saltar escena', en: 'Skip scene' },
  mission: { es: 'Misión', en: 'Mission' }, start: { es: 'Empezar la lección', en: 'Start the lesson' },
  again: { es: 'Repetir la lección', en: 'Redo the lesson' }, toMap: { es: 'Volver al mapa', en: 'Back to the map' },
  locked: { es: 'Termina la lección anterior para llegar aquí.', en: 'Finish the previous lesson to get here.' },
  lockedLv: { es: 'Llega a este nivel en tu aprendizaje (o termina el capítulo anterior) para desbloquearlo.', en: 'Reach this level in your studies (or finish the previous chapter) to unlock it.' },
  tr: { es: 'Traducción', en: 'Translation' }, choose: { es: '¿Qué dices?', en: 'What do you say?' },
  done: { es: '¡Capítulo completado!', en: 'Chapter complete!' }, friends: { es: 'Amistad', en: 'Friendship' },
  unlocked: { es: 'Desbloqueado', en: 'Unlocked' }, cont: { es: 'Continuar la historia', en: 'Continue the story' },
  life: { es: 'Tu historia', en: 'Your story' }, art: { es: 'Arte provisional', en: 'Provisional art' },
  soon: { es: 'Este capítulo se está escribiendo.', en: 'This chapter is being written.' },
  finale: { es: 'Final del capítulo', en: 'Chapter finale' }, scene: { es: 'escena', en: 'scene' },
  words: { es: 'Palabras de esta escena', en: 'Words in this scene' }, wordsSub: { es: 'Repásalas antes de empezar: aparecen en el diálogo.', en: 'Review them first: they appear in the dialogue.' },
  play: { es: 'Empezar la escena', en: 'Start the scene' },
  trial: { es: 'Empezar el reto', en: 'Start the challenge' }, trialAgain: { es: 'Repetir el reto', en: 'Redo the challenge' },
  dares: { es: 'te reta', en: 'challenges you' }, full: { es: 'Práctica completa en modo estudio', en: 'Full practice in study mode' },
  good: { es: '¡Muy bien!', en: 'Well done!' }, bad: { es: 'Casi. La respuesta era:', en: 'Not quite. The answer was:' },
  cont2: { es: 'Continuar', en: 'Continue' }, meaning: { es: '¿Qué significa?', en: 'What does it mean?' },
  listen: { es: 'Escucha y elige', en: 'Listen and choose' }, order: { es: 'Ordena la frase', en: 'Put the sentence in order' },
  fill: { es: 'Completa la frase', en: 'Fill in the blank' }, sayIt: { es: '¿Cómo se dice?', en: 'How do you say it?' },
  pairs: { es: 'Une cada palabra con su significado', en: 'Match each word to its meaning' },
  passed: { es: 'Reto superado', en: 'Challenge complete' }, check: { es: 'Comprobar', en: 'Check' }, gift: { es: 'Regalo', en: 'Gift' },
};
const tx = k => L(TX[k]);

let META = null;
const cache = {};
const meta = async () => META || (META = await fetch('data/story/meta.json').then(r => r.json()));
const chapter = async lv => cache[lv] || (cache[lv] = await fetch(`data/story/${lv}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
const st = () => S.story || { friend: {}, seen: {}, choice: {} };
const saveSt = patch => update({ story: { ...st(), ...patch } });
const unitDone = (lv, u) => !!(S.completed || {})[`${lv}-${u}`];

// The map's stops. A scene usually belongs to one lesson ("5"), but in levels with many lessons one scene can
// cover a run of consecutive lessons ("7-12"): its mission is to finish all of them, in order.
function nodesOf(units, ch) {
  const keys = Object.keys((ch && ch.units) || {});
  const keyOf = id => keys.find(k => k === String(id)) || keys.find(k => { const m = /^(\d+)-(\d+)$/.exec(k); return m && +id >= +m[1] && +id <= +m[2]; });
  const out = [];
  for (const u of units) {
    const k = keyOf(u.id) || String(u.id), last = out[out.length - 1];
    if (last && last.key === k) last.units.push(u); else out.push({ key: k, units: [u], sc: ch && ch.units[k] });
  }
  return out;
}
const nodeDone = n => n.units.every(u => unitDone(level, u.id));

function levelOpen(lv, units) {
  const i = LEVELS.indexOf(lv), cur = LEVELS.indexOf(S.level);
  if (i <= Math.max(0, cur)) return true;
  const prev = LEVELS[i - 1];
  return prev && (units[prev] || []).every(u => unitDone(prev, u.id));
}

let root = null, level = null;

// ---------- the night sky: navy background with tiny falling snowflakes (canvas, stops when leaving the view) ----------
function sky() {
  document.body.classList.add('sm-on');
  if (document.getElementById('sm-sky')) return;
  const c = document.createElement('canvas');
  c.id = 'sm-sky';
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, flakes = [];
  const size = () => { W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; };
  size(); addEventListener('resize', size);
  const N = Math.round(Math.min(140, innerWidth * innerHeight / 9000));
  for (let k = 0; k < N; k++) flakes.push({ x: Math.random(), y: Math.random(), r: .5 + Math.random() * 1.6, v: .00025 + Math.random() * .0007, d: Math.random() * 6.28, o: .35 + Math.random() * .55 });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false; const t0 = performance.now();   // the screen may still be loading: wait for it before deciding we left
  const tick = () => {
    const on = document.querySelector('[data-sm]');
    if (on) seen = true;
    if (!on && (seen || performance.now() - t0 > 8000)) { c.remove(); document.body.classList.remove('sm-on'); removeEventListener('resize', size); return; }
    if (!on) { requestAnimationFrame(tick); return; }
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      if (!reduce) { f.y += f.v; f.d += .01; f.x += Math.sin(f.d) * .0002; if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); } }
      ctx.globalAlpha = f.o; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r * dpr, 0, 6.29); ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
// Chapter accent colours (from meta), used for glows and the landscape.
const accent = () => (((META || {}).chapters || {})[level] || {}).bg || ['#7fb0ff', '#9fd0a0'];
// Distant landscape silhouettes, tinted with the chapter colours.
const hills = () => { const [a, b] = accent(); return `<svg class="sm-hills" viewBox="0 0 400 140" preserveAspectRatio="none">
  <path d="M0 90 Q60 40 120 80 T240 70 T400 60 V140 H0Z" fill="${a}" opacity=".22"/>
  <path d="M0 110 Q80 70 170 100 T320 95 T400 90 V140 H0Z" fill="${b}" opacity=".30"/>
  <path d="M0 128 Q100 105 200 122 T400 118 V140 H0Z" fill="#0a1330" opacity=".9"/></svg>`; };
register('story', async (el, params = {}) => {
  root = el;
  css(); sky();
  update({ mode: 'story' });
  await Promise.all([pyReady, sylReady]);
  const m = await meta();
  level = params.level || level || (LEVELS.includes(S.level) ? S.level : LEVELS[0]);
  if (params.outro) {               // back from a lesson: play its closing scene once (when its whole run is done)
    const ch = await chapter(level), units = await loadUnits(level);
    const n = nodesOf(units, ch).find(x => x.units.some(u => String(u.id) === String(params.outro)));
    const key = n && `${level}-${n.key}-o`;
    if (n && n.sc && nodeDone(n) && !st().seen[key]) {
      return player(n.sc.outro || [], { after: () => { saveSt({ seen: { ...st().seen, [key]: 1 } }); afterOutro(); } });
    }
    if (n && n.units.length > 1 && !nodeDone(n)) return missionScreen(n);   // next lesson of the same episode
  }
  map(m);
});

async function afterOutro() {
  const ch = await chapter(level), units = await loadUnits(level);
  const all = units.every(u => unitDone(level, u.id));
  const key = `${level}-finale`;
  if (all && ch && !st().seen[key]) {
    return player(ch.finale || [], { after: () => { saveSt({ seen: { ...st().seen, [key]: 1 } }); reward(); } });
  }
  map(await meta());
}

// ---------- the chapter map ----------
async function map(m) {
  const allUnits = {};
  await Promise.all(LEVELS.map(async l => { allUnits[l] = await loadUnits(l).catch(() => []); }));
  const units = allUnits[level] || [];
  const ch = await chapter(level);
  if (ch && ch.intro && ch.intro.length && !st().seen[`${level}-intro`]) {        // the chapter's opening scene, once
    return vocabScreen(ch.intro, [units.length ? units[0].id : 1], () => player(ch.intro, { after: () => { saveSt({ seen: { ...st().seen, [`${level}-intro`]: 1 } }); map(m); } }));
  }
  const info = (m.chapters || {})[level] || {};
  const ns = nodesOf(units, ch);
  const cur = ns.find(n => !nodeDone(n));
  const nodes = ns.map((n, i) => {
    const done = nodeDone(n), isCur = n === cur;
    const state = done ? 'done' : isCur ? 'cur' : 'lock';
    const x = [50, 24, 50, 76][i % 4];
    const part = n.units.length > 1 ? `<em>${n.units.filter(u => unitDone(level, u.id)).length}/${n.units.length}</em>` : '';
    return `<div class="sm-node ${state}" style="left:${x}%;top:${i * 162 + 20}px" onclick="window.__smOpen('${n.key}')">
      <span>${done ? '★' : isCur ? '▶' : '🔒'}</span><small>${i + 1}</small>${part}</div>`;
  });
  const bg = info.bg || ['#bfe7ff', '#a6dc78'];
  root.innerHTML = `<div class="fade sm" data-sm>
    <div class="sm-top">
      <button class="chip" onclick="window.__smStudy()">📖 ${tx('study')}</button>
      <div class="flex gap-8">${pyToggle()}<button class="chip" onclick="window.__smLife()">🧭 ${tx('life')}</button></div>
    </div>
    <div class="sm-levels">${LEVELS.map(l => `<button class="chip ${l === level ? 'on' : ''} ${levelOpen(l, allUnits) ? '' : 'locked'}" onclick="window.__smLevel('${l}')">${levelOpen(l, allUnits) ? '' : '🔒 '}${levelLabel(l)}</button>`).join('')}</div>
    <div class="sm-head card">
      <div class="small muted">${tx('chapter')} ${LEVELS.indexOf(level) + 1} · ${levelLabel(level)}</div>
      <div class="sm-title">${info.t ? T(info.t, info.s) : ''}</div>
      <div class="muted">${esc(L(info.n))}</div>
      ${ch ? '' : `<div class="small mt-8" style="color:var(--no)">${tx('soon')}</div>`}
    </div>
    <div class="sm-world" style="--a:${bg[0]};--b:${bg[1]}">
      <svg class="sm-path" viewBox="0 0 100 ${ns.length * 18 + 10}" preserveAspectRatio="none">
        <path d="${pathD(ns.length)}" stroke="${bg[0]}" stroke-opacity=".18" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        <path d="${pathD(ns.length)}" stroke="rgba(255,255,255,.55)" stroke-width="3" fill="none" stroke-dasharray="1 10" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
      ${nodes.join('')}
      <div class="sm-end" style="top:${ns.length * 162 + 20}px">🏁 ${tx('finale')}</div>
    </div>
  </div>${bottomNav('home')}`;
  root.querySelector('.sm-world').style.height = `${ns.length * 162 + 90}px`;
  const c = root.querySelector('.sm-node.cur');
  if (c) setTimeout(() => c.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
}
function pathD(n) {
  let d = 'M50 2';
  for (let i = 0; i < n; i++) d += ` L${[50, 24, 50, 76][i % 4]} ${i * 18 + 5.6}`;
  return d;
}
window.__smLevel = async l => {
  const allUnits = {};
  await Promise.all(LEVELS.map(async x => { allUnits[x] = await loadUnits(x).catch(() => []); }));
  if (!levelOpen(l, allUnits)) return toast(tx('lockedLv'));
  level = l; map(await meta());
};
window.__smStudy = () => { stop(); update({ mode: 'study' }); go('study-pick'); };

// ---------- a lesson's scene ----------
window.__smOpen = async key => {
  key = String(key);
  const ch = await chapter(level), ns = nodesOf(await loadUnits(level), ch);
  const n = ns.find(x => x.key === key);
  if (!n) return;
  const cur = ns.find(x => !nodeDone(x));
  if (!nodeDone(n) && n !== cur) return toast(tx('locked'));
  const seenKey = `${level}-${key}-i`;
  // An episode of several lessons plays its opening scene once; afterwards it opens on the mission.
  if (!n.sc || (n.units.length > 1 && st().seen[seenKey])) return missionScreen(n);
  const go2 = () => player(n.sc.intro || [], { choice: n.sc.choice, choiceKey: `${level}-${key}`, after: () => { saveSt({ seen: { ...st().seen, [seenKey]: 1 } }); nodeDone(n) ? missionScreen(n) : trial(n); } });
  vocabScreen(sceneLines(n.sc), n.units.map(u => u.id), go2);
};
const sceneLines = sc => (sc.intro || []).concat(sc.choice ? [sc.choice.q || {}].concat(sc.choice.options || [], ...(sc.choice.options || []).map(o => o.reply || [])) : [], sc.outro || []);

// ---------- vocabulary before a scene: the words of these lessons (and earlier ones) that appear in the dialogue ----------
const VOC = {};
const plain = t => String(t || '').normalize('NFC').replace(/[\u064B-\u0652\u0670]/g, '').toLowerCase();   // Arabic: ignore vowel marks
async function vocabScreen(lines, unitIds, next) {
  let list = [];
  try {
    const vocab = VOC[level] || (VOC[level] = await loadVocab(level));
    const text = plain(lines.map(l => l && l.t).filter(Boolean).join(' \n '));
    const latin = /^[a-zà-ÿäöüßœæ' -]+$/i;
    const has = w => { const p = plain(w); if (!p || p.length < 2 && !/[\u3400-\u9fff]/.test(p)) return false;
      return latin.test(p) ? new RegExp(`(^|[^a-zà-ÿäöüß])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zà-ÿäöüß]|$)`, 'i').test(text) : text.includes(p); };
    const ids = unitIds.map(Number);
    const maxU = Math.max(...ids);
    const pool = vocab.filter(v => v.unit <= maxU);
    const inScene = pool.filter(v => has(v.word || v.w));
    inScene.sort((a, b) => (ids.includes(b.unit) - ids.includes(a.unit)) || (plain(b.word).length - plain(a.word).length));
    const seen = new Set();
    for (const v of inScene) { const k = plain(v.word); if (!seen.has(k)) { seen.add(k); list.push(v); } if (list.length >= 12) break; }
  } catch (e) { list = []; }
  if (!list.length) return next();
  stop();
  window.__stVoc = next;
  window.__stWord = k => speak(list[k].word || list[k].w);
  root.innerHTML = `<div class="fade sv" data-sm>
    <div class="sv-head"><div class="sv-k">📖 ${tx('words')}</div><div class="sv-sub">${tx('wordsSub')}</div></div>
    <div class="sv-grid">${list.map((v, k) => `<button class="sv-card" style="--i:${k}" onclick="window.__stWord(${k})">
      <div class="sv-w" lang="${LG}">${T(v.word || v.w)}</div>
      ${v.p && v.p !== (v.word || v.w) && LG !== 'zh' && LG !== 'ar' ? `<div class="sv-p">${esc(v.p)}</div>` : ''}
      <div class="sv-m">${esc(L(v.m))}</div><span class="sv-a">🔊</span></button>`).join('')}</div>
    <button class="btn sv-go" onclick="window.__stVoc()">${tx('play')} ▶</button>
  </div>`;
}

function missionScreen(n) {
  stop();
  const sc = n.sc, done = nodeDone(n), multi = n.units.length > 1;
  const next = n.units.find(u => !unitDone(level, u.id)) || n.units[0];
  const list = multi ? `<div class="sm-ulist mt-12">${n.units.map(u => {
    const d = unitDone(level, u.id), isNext = !done && u === next;
    return `<button class="sm-urow ${d ? 'done' : isNext ? 'cur' : 'lock'}" ${d || isNext ? `onclick="window.__smTrial('${n.key}','${u.id}')"` : 'disabled'}>
      <i>${d ? '✓' : isNext ? '▶' : '·'}</i><span>${tx('lesson')} ${esc(u.id)} · ${esc(L(u.title))}</span></button>`;
  }).join('')}</div>` : `<div class="muted small mt-8">${tx('lesson')} ${esc(next.id)} · ${esc(L(next.title))}</div>`;
  root.innerHTML = `<div class="fade sm-mission" data-sm>
    <div class="card sm-mcard">
      <div class="small" style="color:var(--accent);font-weight:800;letter-spacing:.06em">🎯 ${tx('mission').toUpperCase()}</div>
      <div class="h3 mt-8">${esc(L(sc && sc.mission) || L(next.desc))}</div>
      ${list}
      <button class="btn mt-16" onclick="window.__smTrial('${n.key}')">${done ? tx('trialAgain') : multi && n.units.some(u => unitDone(level, u.id)) ? tx('cont') : tx('trial')} ▶</button>
      ${sc && multi ? `<button class="btn btn-ghost mt-8" onclick="window.__smScene('${n.key}')">${tx('replay')}: ${tx('scene')}</button>` : ''}
      ${done && sc && sc.outro ? `<button class="btn btn-ghost mt-8" onclick="window.__smOutro('${n.key}')">${tx('replay')}: ${tx('finale').toLowerCase()}</button>` : ''}
      <button class="btn btn-ghost mt-8" onclick="window.__smLesson('${next.id}')">📖 ${tx('full')}</button>
      <button class="btn btn-ghost mt-8" onclick="window.__go('story',{level:'${level}'})">${tx('toMap')}</button>
    </div>
  </div>`;
}
window.__smLesson = id => go('lesson', { level, unit: +id || id, story: true });
window.__smOutro = async key => { const ch = await chapter(level); player(ch.units[key].outro || [], { after: () => map(META) }); };
window.__smScene = async key => {
  const ch = await chapter(level), n = nodesOf(await loadUnits(level), ch).find(x => x.key === key);
  player(n.sc.intro || [], { choice: n.sc.choice, choiceKey: `${level}-${key}`, after: () => missionScreen(n) });
};

// ---------- the lesson inside the story: a friend sets its exercises as challenges, in the scene ----------
window.__smTrial = async (key, from) => {
  const ch = await chapter(level), n = nodesOf(await loadUnits(level), ch).find(x => x.key === String(key));
  if (n) trial(n, from);
};
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = x => String(x || '').replace(/[\s。．.!！?？,，、]/g, '').toLowerCase();
// Who sets the challenges: the friend who talks most in this episode's scene (not the hero, not the narrator).
function coach(n) {
  const m = META || {}, hero = m.hero, cnt = {};
  for (const l of n.sc ? sceneLines(n.sc) : []) if (l && l.who && l.who !== 'narr' && l.who !== hero && (m.cast || {})[l.who]) cnt[l.who] = (cnt[l.who] || 0) + 1;
  const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  return best || Object.keys(m.cast || {}).find(k => k !== hero && k !== 'narr') || hero;
}
// Up to 8 challenges per lesson, from its own exercises (plus two word checks), in a varied order.
function challenges(unit, words, pool) {
  const ex = unit.exercises || [], out = [];
  const by = t => shuf(ex.filter(e => e.type === t));
  const pairs = by('match')[0];
  if (pairs) out.push({ k: 'match', pairs: shuf(pairs.pairs).slice(0, 4) });
  const others = shuf(pool.filter(v => !words.some(w => w.word === v.word)));
  for (const w of shuf(words).slice(0, pairs ? 1 : 2)) {
    const opts = shuf([w].concat(shuf(words.filter(x => x !== w)).concat(others).slice(0, 3)));
    out.push({ k: 'word', w, opts });
  }
  const trans = ex.filter(e => e.type === 'translate' || e.type === 'order');
  const mix = [].concat(by('fill').slice(0, 2), by('choose').slice(0, 2), by('listen').slice(0, 1), by('order').slice(0, 1), by('translate').slice(0, 1));
  for (const e of shuf(mix)) {
    if (e.type === 'translate') {   // as a choice between this lesson's sentences (no typing inside the story)
      const alt = shuf(trans.filter(x => x !== e).map(x => x.answer)).filter(a => norm(a) !== norm(e.answer)).slice(0, 2);
      if (alt.length) out.push({ k: 'choose', prompt: e.prompt, opts: shuf([e.answer, ...alt]), ok: e.answer, py: e.py });
    } else if (e.type === 'choose') out.push({ k: 'choose', prompt: e.prompt, opts: shuf(e.options), ok: e.correct, hint: e.hint });
    else if (e.type === 'fill') out.push({ k: 'fill', e, opts: shuf(e.options) });
    else if (e.type === 'listen') out.push({ k: 'listen', text: e.text, opts: shuf(e.options), ok: e.correct });
    else if (e.type === 'order') out.push({ k: 'order', e, words: shuf(e.words) });
    if (out.length >= 8) break;
  }
  return out.slice(0, 8);
}
async function trial(n, from) {
  stop();
  const m = META || await meta(), cid = coach(n), who = (m.cast || {})[cid] || {};
  const pool = VOC[level] || (VOC[level] = await loadVocab(level).catch(() => []));
  let todo = n.units.filter(u => !unitDone(level, u.id));
  if (from) todo = n.units.slice(n.units.findIndex(u => String(u.id) === String(from)));
  if (!todo.length) todo = n.units.slice();
  let ui = 0, list = [], qi = 0, words = [];
  const startUnit = async () => {
    const unit = await loadUnit(level, todo[ui].id) || await loadUnit(level, String(todo[ui].id));
    words = unit ? unitVocab(unit, pool) : [];
    list = unit ? challenges(unit, words, pool) : []; qi = 0;
    next();
  };
  const finishUnit = () => {
    const u = todo[ui];
    addCards(words.map(w => w.word), 'v');
    completeUnit(level, u.id);
    ui++;
    frame(`<div class="tc-done">✨ ${tx('passed')} · ${tx('lesson')} ${esc(u.id)}</div>`, `<button class="btn" onclick="window.__tcGo()">${tx('cont2')} ▶</button>`, true);
    window.__tcGo = () => { window.__tcGo = () => {}; ui < todo.length ? startUnit() : endNode(); };
  };
  const endNode = () => {
    const key = `${level}-${n.key}-o`;
    if (n.sc && nodeDone(n) && !st().seen[key]) return player(n.sc.outro || [], { after: () => { saveSt({ seen: { ...st().seen, [key]: 1 } }); afterOutro(); } });
    afterOutro();
  };
  // The scene with the friend on stage; the challenge sits in the dialogue box.
  const frame = (box, below, cheer) => {
    root.innerHTML = `<div class="sp-scene tc" data-sm>
      <div class="sp-top"><span class="chip sp-chip">🎯 ${esc(L(who.n))} ${tx('dares')}</span><span class="flex gap-8">${pyToggle()}<button class="chip sp-chip" onclick="window.__go('story',{level:'${level}'})">✕</button></span></div>
      <div class="sp-stage">${hills()}${portrait(cid, who, false).replace('class="pt ', `class="pt ${cheer ? 'cheer ' : ''}`)}</div>
      <div class="sp-prog"><i style="width:${Math.min(100, Math.round(100 * (ui + qi / Math.max(1, list.length)) / todo.length))}%"></i></div>
      <div class="sp-box tc-box">${box}</div>
      ${below ? `<div class="tc-below">${below}</div>` : ''}</div>`;
  };
  const next = () => {
    if (qi >= list.length) return finishUnit();
    const c = list[qi];
    window.__tcSay = t => speak(t);
    if (c.k === 'word') {
      speak(c.w.word);
      frame(`<div class="tc-q">${tx('meaning')}</div><div class="sp-line tc-big" lang="${LG}" onclick="window.__tcSay(this.dataset.t)" data-t="${esc(c.w.word)}">${T(c.w.word)} <span class="tc-snd">🔊</span></div>`,
        opts(c.opts.map(o => esc(L(o.m))), c.opts.indexOf(c.w), () => `${T(c.w.word)} = ${esc(L(c.w.m))}`));
    } else if (c.k === 'choose') {
      frame(`<div class="tc-q">${esc(L(c.prompt))}</div>`, opts(c.opts.map(o => `<span lang="${LG}">${T(o)}</span>`), c.opts.indexOf(c.ok), () => `<span lang="${LG}">${T(c.ok)}</span>${c.hint ? `<div class="muted small">${esc(L(c.hint))}</div>` : ''}`, c.ok));
    } else if (c.k === 'listen') {
      speak(c.text);
      frame(`<div class="tc-q">${tx('listen')}</div><button class="chip tc-play" onclick="window.__tcSay(${JSON.stringify(c.text).replace(/"/g, '&quot;')})">🔊 ▶</button>`,
        opts(c.opts.map(o => `<span lang="${LG}">${T(o)}</span>`), c.opts.indexOf(c.ok), () => `<span lang="${LG}">${T(c.ok)}</span>`, c.ok));
    } else if (c.k === 'fill') {
      const e = c.e, [a, b] = String(e.sentence).split('___');
      frame(`<div class="tc-q">${tx('fill')}</div><div class="sp-line" lang="${LG}">${T(a || '')}<span class="tc-gap">＿＿</span>${T(b || '')}</div>${e.tr ? `<div class="sp-tr ${S.storyTr === false ? 'hide' : ''}">${esc(L(e.tr))}</div>` : ''}`,
        opts(c.opts.map(o => `<span lang="${LG}">${T(o)}</span>`), c.opts.indexOf(e.blank), () => `<span lang="${LG}">${T(String(e.sentence).replace('___', e.blank))}</span>${e.hint ? `<div class="muted small">${esc(L(e.hint))}</div>` : ''}`, String(e.sentence).replace('___', e.blank)));
    } else if (c.k === 'order') {
      const e = c.e; let picked = [];
      const draw = () => frame(`<div class="tc-q">${tx('order')}</div>${e.prompt ? `<div class="sp-tr">${esc(L(e.prompt))}</div>` : ''}
          <div class="tc-ans" lang="${LG}">${picked.map((k, j) => `<button class="tc-tile on" onclick="window.__tcUn(${j})">${T(c.words[k])}</button>`).join('') || '<span class="muted">…</span>'}</div>`,
        `<div class="tc-bank" lang="${LG}">${c.words.map((w, k) => picked.includes(k) ? `<span class="tc-tile ghost">${T(w)}</span>` : `<button class="tc-tile" onclick="window.__tcPk(${k})">${T(w)}</button>`).join('')}</div>
         <button class="btn mt-12" ${picked.length === c.words.length ? '' : 'disabled'} onclick="window.__tcChk()">${tx('check')}</button>`);
      window.__tcPk = k => { picked.push(k); draw(); };
      window.__tcUn = j => { picked.splice(j, 1); draw(); };
      window.__tcChk = () => { const ok = norm(picked.map(k => c.words[k]).join(LG === 'zh' || LG === 'ja' ? '' : ' ')) === norm(e.answer); result(ok, `<span lang="${LG}">${T(e.answer)}</span>`, e.answer); };
      draw();
    } else if (c.k === 'match') {
      let sel = null; const done = new Set(), right = shuf(c.pairs.map((p, k) => k)); let miss = 0;
      const draw = () => frame(`<div class="tc-q">${tx('pairs')}</div>`,
        `<div class="tc-match"><div>${c.pairs.map((p, k) => `<button class="tc-tile ${done.has(k) ? 'ok' : sel === k ? 'on' : ''}" ${done.has(k) ? 'disabled' : ''} lang="${LG}" onclick="window.__tcL(${k})">${T(p[0])}</button>`).join('')}</div>
          <div>${right.map(k => `<button class="tc-tile ${done.has(k) ? 'ok' : ''}" ${done.has(k) ? 'disabled' : ''} onclick="window.__tcR(${k})">${esc(L(c.pairs[k][1]))}</button>`).join('')}</div></div>`);
      window.__tcL = k => { sel = k; speak(c.pairs[k][0]); draw(); };
      window.__tcR = k => {
        if (sel === null) return;
        if (k === sel) { done.add(k); sel = null; if (done.size === c.pairs.length) return result(miss < 2, '', null); }
        else { miss++; sel = null; }
        draw();
      };
      draw();
    }
  };
  // Multiple-choice buttons under the box.
  const opts = (labels, okIdx, answer, say) => {
    window.__tcPick = k => result(k === okIdx, answer(), say, k);
    return `<div class="tc-opts">${labels.map((l, k) => `<button class="card tc-opt" onclick="window.__tcPick(${k})">${l}</button>`).join('')}</div>`;
  };
  const result = (ok, answerHtml, say) => {
    if (say) speak(say);
    if (!ok && !list[qi].again) list.push({ ...list[qi], again: 1 });
    const box = ok ? `<div class="tc-res ok">✓ ${tx('good')}</div>` : `<div class="tc-res no">${tx('bad')}</div><div class="tc-answer">${answerHtml}</div>`;
    frame(box, `<button class="btn" onclick="window.__tcNext()">${tx('cont2')} ▶</button>`, ok);
    window.__tcNext = () => { window.__tcNext = () => {}; qi++; next(); };
  };
  startUnit();
}

// ---------- scene player: one line at a time, tap to continue ----------
function player(lines, opts = {}) {
  const m = META || {};
  let i = 0, queue = lines.slice(), chose = false;
  const show = () => {
    if (i >= queue.length) {
      if (opts.choice && !chose) return choiceView();
      stop(); return opts.after && opts.after();
    }
    const ln = queue[i], who = (m.cast || {})[ln.who] || {};
    const narr = ln.who === 'narr';
    const prevWho = i > 0 && queue[i - 1] && queue[i - 1].who;
    root.innerHTML = `<div class="sp-scene" data-sm onclick="window.__stNext()">
      <div class="sp-top"><span class="chip sp-chip">${tx('mode')}</span><span class="flex gap-8">${pyToggle()}<button class="chip sp-chip" onclick="event.stopPropagation();window.__stSkip()">${tx('skip')} ⏭</button></span></div>
      <div class="sp-stage"><div class="sp-moon" style="--a:${accent()[0]}"></div>${hills()}${narr ? '' : portrait(ln.who, who, prevWho !== ln.who)}</div>
      <div class="sp-prog"><i style="width:${Math.round(100 * (i + 1) / queue.length)}%"></i></div>
      <div class="sp-box ${narr ? 'narr' : ''}" onclick="event.stopPropagation();window.__stNext()">
        ${narr ? '' : `<div class="sp-name" style="background:${who.color || 'var(--accent)'}">${who.t && who.t !== L(who.n) ? T(who.t, who.s) + ' ' : ''}${esc(L(who.n))}</div>`}
        <div class="sp-line" lang="${LG}">${T(ln.t, ln.s)}</div>
        <div class="sp-tr ${S.storyTr === false ? 'hide' : ''}">${esc(L(ln.tr))}</div>
        <div class="sp-ctrl"><button class="chip" onclick="event.stopPropagation();window.__stSay()">🔊</button>
          <button class="chip ${S.storyTr === false ? '' : 'on'}" onclick="event.stopPropagation();window.__stTr()">🌐 ${tx('tr')}</button>
          <span class="grow"></span><span class="muted small">${tx('next')} ▸</span></div>
      </div></div>`;
    speakAs(ln.who, ln.t);
  };
  const choiceView = () => {
    chose = true;
    const c = opts.choice;
    root.innerHTML = `<div class="sp-scene" data-sm>
      <div class="sp-top"><span class="chip sp-chip">${tx('mode')}</span>${pyToggle()}</div>
      <div class="sp-stage"><div class="sp-moon" style="--a:${accent()[0]}"></div>${hills()}</div>
      <div class="sp-box">
        <div class="small muted mb-8">💬 ${tx('choose')}</div>
        ${c.q ? `<div class="sp-line">${T(c.q.t, c.q.s)}</div><div class="sp-tr">${esc(L(c.q.tr))}</div>` : ''}
      </div>
      <div class="sp-opts">${c.options.map((o, k) => `<button class="card sp-opt" onclick="window.__stPick(${k})">
        <div class="sp-line" lang="${LG}">${T(o.t, o.s)}</div><div class="sp-tr">${esc(L(o.tr))}</div></button>`).join('')}</div></div>`;
  };
  window.__stNext = () => { i++; show(); };
  window.__stSkip = () => { i = queue.length; show(); };
  window.__stSay = () => queue[i] && speakAs(queue[i].who, queue[i].t);
  window.__stTr = () => { update({ storyTr: S.storyTr === false }); show(); };
  window.__stPick = k => {
    const o = opts.choice.options[k];
    const s = st();
    saveSt({ choice: { ...s.choice, [opts.choiceKey]: k }, friend: o.f ? { ...s.friend, [o.f]: (s.friend[o.f] || 0) + 1 } : s.friend });
    queue = queue.slice(0, i).concat([{ who: (META && META.hero) || 'hero', t: o.t, tr: o.tr }], o.reply || []);
    show();
  };
  show();
}

function portrait(id, who, enter) {
  const c = who.color || '#9c7842';
  const sil = `<svg class="pt-sil" viewBox="0 0 120 140"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#0b1530"/></linearGradient></defs>
    <circle cx="60" cy="46" r="26" fill="url(#g${id})"/><path d="M14 140 C16 98 36 80 60 80 C84 80 104 98 106 140Z" fill="url(#g${id})"/></svg>`;
  const art = who.img ? `<img class="pt-img" src="${who.img}" alt="" onerror="this.replaceWith(document.createRange().createContextualFragment(this.dataset.sil))" data-sil='${sil.replace(/'/g, '&#39;')}'>` : sil;
  return `<div class="pt ${enter ? 'enter' : ''}" style="--c:${c}"><div class="pt-glow"></div><div class="pt-art">${art}</div><div class="pt-tag">${esc(L(who.role) || '')}</div></div>`;
}

// ---------- chapter reward ----------
async function reward() {
  const m = await meta(), ch = await chapter(level), info = (m.chapters || {})[level] || {};
  const s = st(), next = LEVELS[LEVELS.indexOf(level) + 1], ni = next && (m.chapters || {})[next];
  stop();
  root.innerHTML = `<div class="fade sm-reward" data-sm>
    <div class="center"><div class="small" style="font-weight:800;letter-spacing:.08em;color:#8b5e1a">${tx('done').toUpperCase()}</div>
      <div class="h1 mt-8">${info.t ? T(info.t, info.s) : ''}</div><div style="font-size:40px;margin-top:6px">⭐⭐⭐</div></div>
    <div class="card sm-rrow"><div style="font-size:28px">💛</div><div><b>${tx('friends')}</b><div class="small muted">${Object.entries(s.friend || {}).map(([k, v]) => `${esc(L((m.cast[k] || {}).n) || k)} ${'♥'.repeat(Math.min(5, v))}`).join(' · ') || '—'}</div></div></div>
    ${ch && ch.gift ? `<div class="card sm-rrow"><div style="font-size:28px">🎁</div><div><b>${tx('gift')}: ${T(ch.gift.t, ch.gift.s)}</b><div class="small muted">${esc(L(ch.gift.tr))}</div></div></div>` : ''}
    ${ni ? `<div class="card sm-rrow"><div style="font-size:28px">🗺️</div><div><b>${tx('unlocked')}: ${T(ni.t, ni.s)}</b><div class="small muted">${esc(L(ni.n))}</div></div></div>` : ''}
    <button class="btn mt-16" onclick="window.__go('story',{level:'${next || level}'})">${tx('cont')} ▶</button>
  </div>`;
}

// ---------- the whole life ----------
window.__smLife = async () => {
  const m = await meta();
  const allUnits = {};
  await Promise.all(LEVELS.map(async x => { allUnits[x] = await loadUnits(x).catch(() => []); }));
  root.innerHTML = `<div class="fade sm-life" data-sm>
    <button class="chip" onclick="window.__go('story',{level:'${level}'})">← ${tx('toMap')}</button>
    <div class="small mt-16" style="opacity:.8;letter-spacing:.08em">${esc(L(m.title)).toUpperCase()}</div>
    <div class="h1 mt-4">${esc(L(m.subtitle))}</div>
    <div class="small mt-4" style="opacity:.85">${esc(L(m.pitch))}</div>
    <div class="mt-16" style="display:grid;gap:9px">${LEVELS.map(l => {
      const c = (m.chapters || {})[l] || {}, us = allUnits[l] || [], d = us.filter(u => unitDone(l, u.id)).length;
      const cls = us.length && d === us.length ? 'on' : l === level ? 'cur' : levelOpen(l, allUnits) ? '' : 'lock';
      return `<div class="tl ${cls}" onclick="window.__smLevel('${l}')"><span>${levelLabel(l)}</span><div><b>${c.t ? T(c.t, c.s) : ''}</b><small>${esc(L(c.n))}</small></div><i>${cls === 'on' ? '✓' : cls === 'lock' ? '🔒' : `${d}/${us.length}`}</i></div>`;
    }).join('')}</div></div>`;
};

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'sm-toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

function css() {
  if (document.getElementById('sm-css')) return;
  const s = document.createElement('style');
  s.id = 'sm-css';
  s.textContent = `
.tc .sp-stage{height:34vh;min-height:200px}
.tc-box{max-height:none}
.tc-q{font-size:13px;font-weight:800;letter-spacing:.04em;color:#ffd98a;text-transform:uppercase;margin-bottom:8px}
.tc-big{font-size:34px;cursor:pointer}.tc-snd{font-size:16px;opacity:.7}
.tc-gap{display:inline-block;min-width:2.4em;border-bottom:2px solid #ffd36b;margin:0 4px;color:#ffd36b;text-align:center}
.tc-below{position:relative;z-index:3;padding:10px 16px 24px}
.tc-opts{display:grid;gap:10px;padding:10px 16px 24px;position:relative;z-index:3}
.tc-opt{background:rgba(255,255,255,.08) !important;border:1px solid rgba(255,255,255,.18) !important;color:#eef2ff !important;text-align:left;padding:14px 16px !important;font-size:17px;border-radius:16px !important;transition:transform .12s}
.tc-opt:active{transform:scale(.97)}
.tc-res{font-size:22px;font-weight:800}.tc-res.ok{color:#7ee2a0}.tc-res.no{color:#ffb4a8;font-size:16px}
.tc-answer{font-size:20px;margin-top:6px}
.tc-done{font-size:22px;font-weight:800;color:#ffd36b;text-align:center}
.tc-play{font-size:20px;padding:10px 18px !important}
.tc-ans{min-height:52px;display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding:8px;border-radius:12px;background:rgba(0,0,0,.2)}
.tc-bank{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.tc-tile{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);color:#eef2ff;border-radius:12px;padding:9px 12px;font-size:17px;font-family:inherit}
.tc-tile.on{background:#ffd36b;color:#1b2340;border-color:#ffd36b}.tc-tile.ghost{opacity:.25}
.tc-tile.ok{background:rgba(126,226,160,.25);border-color:#7ee2a0;opacity:.6}
.tc-match{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tc-match>div{display:grid;gap:8px;align-content:start}
.pt.cheer .pt-art{animation:tcj .6s ease}
@keyframes tcj{0%,100%{transform:translateY(0)}35%{transform:translateY(-18px) scale(1.03)}60%{transform:translateY(0)}80%{transform:translateY(-6px)}}
body.sm-on #lang-switch{display:none}
body.sm-on{background:radial-gradient(120% 80% at 50% -10%,#21376b 0%,#0f1d42 45%,#081128 100%) fixed !important;color:#eef2ff}
body.sm-on #app,body.sm-on main,body.sm-on .page{background:transparent !important}
#sm-sky{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:52}
[data-sm]{position:relative;z-index:1}
body.sm-on .bottom-nav,body.sm-on nav{z-index:20}
.sm{padding-bottom:100px}.sm-top{display:flex;justify-content:space-between;align-items:center;padding:14px 0 8px}
body.sm-on [data-sm] .chip,body.sm-on [data-sm] .chip *{color:#e8eeff !important}
body.sm-on [data-sm] .chip{background:rgba(255,255,255,.08) !important;border:1px solid rgba(255,255,255,.18) !important;backdrop-filter:blur(6px)}
body.sm-on [data-sm] .chip.on{background:#ffd36b !important;border-color:#ffd36b !important}body.sm-on [data-sm] .chip.on,body.sm-on [data-sm] .chip.on *{color:#1b2340 !important}
[data-sm] .tr{color:#ffd98a !important;opacity:.9}[data-sm] .ar{color:inherit}
.sm-levels{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px}.sm-levels .chip{flex:none}.sm-levels .locked{opacity:.5}
.glass,.sm-head,.sm-mcard,.sm-rrow{background:linear-gradient(160deg,rgba(255,255,255,.13),rgba(255,255,255,.04)) !important;border:1px solid rgba(255,255,255,.16) !important;
  box-shadow:0 20px 40px -18px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.18) !important;backdrop-filter:blur(10px);color:#eef2ff;border-radius:22px}
.sm-head{padding:16px 18px;margin:6px 0 14px}.sm-title{font-size:23px;font-weight:800;margin:4px 0;letter-spacing:.01em}
body.sm-on .muted{color:rgba(225,232,255,.68) !important}
.sm-world{position:relative;border-radius:28px;overflow:hidden;perspective:900px;
  background:radial-gradient(70% 40% at 50% 0%,color-mix(in srgb,var(--a) 30%,transparent),transparent),linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));
  border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 0 60px rgba(0,0,0,.35)}
.sm-path{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 0 8px rgba(255,255,255,.25))}
.sm-node{position:absolute;transform:translateX(-50%);width:66px;height:66px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:#fff;font-weight:900;font-size:20px;cursor:pointer;transition:transform .2s}
.sm-node::after{content:'';position:absolute;left:50%;bottom:-14px;width:54px;height:12px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(rgba(0,0,0,.45),transparent 70%)}
.sm-node:hover{transform:translateX(-50%) translateY(-3px) scale(1.05)}
.sm-node small{font-size:11px;opacity:.9;margin-top:-2px}
.sm-node em{position:absolute;bottom:-26px;font-style:normal;font-size:11px;font-weight:800;background:rgba(10,18,45,.8);color:#fff;border-radius:999px;padding:1px 8px;border:1px solid rgba(255,255,255,.2)}
.sm-node.done{background:radial-gradient(circle at 32% 28%,#fff6c8,#ffcc4d 38%,#c98a12 80%);box-shadow:0 0 18px rgba(255,204,77,.55),inset 0 -6px 10px rgba(0,0,0,.25);color:#5a3900}
.sm-node.cur{background:radial-gradient(circle at 32% 28%,#e6f2ff,#7fb0ff 40%,#2f5fb8 85%);box-shadow:0 0 0 6px rgba(127,176,255,.25),0 0 30px rgba(127,176,255,.8),inset 0 -6px 10px rgba(0,0,0,.25);animation:smPulse 1.8s infinite}
.sm-node.lock{background:radial-gradient(circle at 32% 28%,#8a93b5,#4a5478 55%,#2a3150);box-shadow:inset 0 -6px 10px rgba(0,0,0,.35);color:rgba(255,255,255,.7);font-size:16px}
@keyframes smPulse{50%{transform:translateX(-50%) translateY(-4px) scale(1.06)}}
.sm-end{position:absolute;left:50%;transform:translateX(-50%);background:linear-gradient(#ff8a6b,#d9453a);color:#fff;font-weight:800;padding:10px 18px;border-radius:999px;box-shadow:0 0 24px rgba(255,120,90,.5)}
.sm-ulist{display:flex;flex-direction:column;gap:6px;text-align:left;max-height:46vh;overflow:auto}
.sm-urow{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#eef2ff;font:inherit;font-size:14px;cursor:pointer;text-align:left}
.sm-urow i{font-style:normal;width:18px;text-align:center;font-weight:800}.sm-urow.done i{color:#8fe3a0}
.sm-urow.cur{border-color:#7fb0ff;background:rgba(127,176,255,.18);box-shadow:0 0 18px rgba(127,176,255,.35)}.sm-urow.lock{opacity:.45;cursor:default}
.sm-mission{padding:40px 0}.sm-mcard{padding:24px}
body.sm-on .btn-ghost{background:rgba(255,255,255,.06);color:#eef2ff;border:1px solid rgba(255,255,255,.18)}
body.sm-on .btn:not(.btn-ghost){background:linear-gradient(#ffd877,#f0b237);color:#2a1d00;box-shadow:0 6px 0 #a8730f,0 14px 28px -8px rgba(240,178,55,.6)}
/* vocabulary */
.sv{padding:22px 0 110px}.sv-head{text-align:center;margin-bottom:16px}.sv-k{font-size:22px;font-weight:800}.sv-sub{opacity:.7;font-size:14px;margin-top:4px}
.sv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;perspective:800px}
.sv-card{position:relative;text-align:left;font:inherit;color:#eef2ff;cursor:pointer;padding:14px 14px 12px;border-radius:18px;
  background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.16);
  box-shadow:0 16px 30px -16px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.2);transform:rotateX(8deg);animation:svIn .5s calc(var(--i)*45ms) both;transition:transform .25s}
.sv-card:hover{transform:rotateX(0) translateY(-4px)}
@keyframes svIn{from{opacity:0;transform:rotateX(40deg) translateY(16px)}}
.sv-w{font-size:24px;font-weight:700;line-height:1.5}.sv-p{font-size:13px;opacity:.7}.sv-m{font-size:13.5px;opacity:.85;margin-top:4px}.sv-a{position:absolute;top:10px;right:12px;opacity:.6;font-size:13px}
.sv-go{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);width:min(440px,88vw);z-index:5}
/* scene player */
.sp-scene{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;cursor:pointer;color:#eef2ff;padding:0 max(0px,calc((100vw - 560px)/2));
  background:radial-gradient(120% 70% at 50% -10%,#24407a 0%,#11214a 45%,#081128 100%)}
.sp-top{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;position:relative;z-index:3}
.sp-stage{flex:1;position:relative;display:flex;align-items:flex-end;justify-content:center;perspective:900px;overflow:hidden}
.sp-moon{position:absolute;top:8%;right:14%;width:86px;height:86px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#fffbe8,#ffe9a8 55%,transparent 72%);
  box-shadow:0 0 60px 20px color-mix(in srgb,var(--a) 35%,transparent);opacity:.9}
.sm-hills{position:absolute;left:0;right:0;bottom:0;width:100%;height:42%}
.pt{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:6px;transform-style:preserve-3d;animation:ptFloat 5s ease-in-out infinite}
.pt.enter{animation:ptIn .45s cubic-bezier(.2,.9,.3,1.2) both,ptFloat 5s 0.45s ease-in-out infinite}
@keyframes ptFloat{50%{transform:translateY(-6px) rotateY(3deg)}}
@keyframes ptIn{from{opacity:0;transform:translateY(30px) rotateY(-25deg) scale(.92)}}
.pt-glow{position:absolute;bottom:20px;width:230px;height:230px;border-radius:50%;background:radial-gradient(color-mix(in srgb,var(--c) 60%,transparent),transparent 68%);filter:blur(8px);opacity:.75;z-index:-1}
.pt-art{width:min(250px,58vw);height:min(260px,36vh);display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 18px 22px rgba(0,0,0,.55))}
.pt-img{max-width:100%;max-height:100%;object-fit:contain;-webkit-mask-image:linear-gradient(#000 82%,transparent);mask-image:linear-gradient(#000 82%,transparent)}
.pt-sil{height:100%;opacity:.95}
.pt-tag{background:rgba(10,18,45,.7);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:3px 12px;font-size:12px;font-weight:700;color:#dfe6ff;backdrop-filter:blur(6px)}
.sp-prog{height:3px;margin:0 22px 18px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}.sp-prog i{display:block;height:100%;background:#ffd36b;transition:width .3s}
.sp-box{margin:0 14px 22px;border-radius:24px;padding:20px 18px 12px;position:relative;cursor:pointer;color:#f2f5ff;z-index:3;
  background:linear-gradient(165deg,rgba(28,44,92,.88),rgba(12,22,52,.92));border:1px solid rgba(255,255,255,.16);
  box-shadow:0 26px 50px -20px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.2);backdrop-filter:blur(12px);transform:perspective(800px) rotateX(2deg);animation:boxIn .35s both}
@keyframes boxIn{from{opacity:.4;transform:perspective(800px) rotateX(14deg) translateY(10px)}}
.sp-box.narr{background:linear-gradient(165deg,rgba(60,48,20,.85),rgba(28,22,12,.9));font-style:italic}
.sp-name{position:absolute;top:-14px;left:18px;color:#fff;font-weight:800;border-radius:999px;padding:3px 14px;font-size:14px;box-shadow:0 6px 14px rgba(0,0,0,.35)}
.sp-name rt,.sp-name .tr,.sp-name .rom,.sp-name small{display:none !important}.sp-name *{display:inline !important;font-size:inherit}
.sp-line{font-size:23px;line-height:1.75}.sp-line rt{color:#ffd98a}.sp-tr{color:rgba(220,228,255,.72);font-size:14.5px;margin-top:6px}.sp-tr.hide{display:none}
.sp-ctrl{display:flex;gap:8px;align-items:center;margin-top:10px}
.sp-opts{display:grid;gap:10px;margin:0 14px 24px;position:relative;z-index:3}
.sp-opt{padding:14px 16px;text-align:left;border:1px solid rgba(255,255,255,.18) !important;cursor:pointer;font:inherit;color:#f2f5ff !important;border-radius:18px !important;
  background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05)) !important;backdrop-filter:blur(8px);transition:transform .2s,box-shadow .2s}
.sp-opt:hover{transform:translateY(-3px);box-shadow:0 0 0 2px #ffd36b,0 16px 30px -12px rgba(0,0,0,.7)}
.sm-reward{padding:30px 4px 100px;display:grid;gap:12px}.sm-rrow{display:flex;gap:12px;align-items:center;padding:14px 16px}
.sm-life{min-height:100vh;margin:0 -16px;padding:18px 20px 100px;color:#fff}
.sm-life .tl{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:10px 12px;cursor:pointer}
.sm-life .tl span{flex:none;width:58px;font-weight:800;font-size:12px;opacity:.85}.sm-life .tl div{flex:1}.sm-life .tl small{display:block;opacity:.75;font-size:12px}.sm-life .tl i{font-style:normal}
.sm-life .tl.on{background:rgba(124,195,106,.25)}.sm-life .tl.cur{background:rgba(255,211,107,.16);box-shadow:0 0 0 2px #ffd36b}.sm-life .tl.lock{opacity:.5}
.sm-life rt{color:inherit;opacity:.8}
.sm-toast{position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:#ffd36b;color:#1b2340;font-weight:700;padding:10px 16px;border-radius:14px;z-index:100;max-width:86%;font-size:14px;text-align:center}`;
  document.head.appendChild(s);
}
