// Story mode: the same lessons, in the same order, lived as a story. Each level is a chapter of the hero's life;
// each lesson opens with a short scene (with a choice that changes the dialogue, never the content), becomes a
// "mission" that starts the normal lesson, and closes with a short scene when the lesson is completed.
// Data: data/story/meta.json (cast, chapters) and data/story/<level>.json (built from tools/story_src/).
// Art is provisional (portrait placeholders) until the illustrations are made.
import { S, update } from '../state.js?v=202611260830';
import { register, go } from '../router.js?v=202611260830';
import { LEVELS, levelLabel } from '../levels.js?v=202611260830';
import { loadUnits } from '../data.js?v=202611260830';
import { bottomNav, pyToggle } from '../ui/components.js?v=202611260830';
import { speak, stop } from '../audio.js?v=202611260830';
import { ruby, pyReady, sylReady, esc } from '../zh.js?v=202611260830';

const L = o => (o && (o[S.lang] || (S.lang === 'es' ? o.es : o.en) || o.es || o.en)) || '';
const T = t => ruby(t);                       // target-language text (with pinyin / furigana when the app has it)
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
  finale: { es: 'Final del capítulo', en: 'Chapter finale' }, gift: { es: 'Regalo', en: 'Gift' },
};
const tx = k => L(TX[k]);

let META = null;
const cache = {};
const meta = async () => META || (META = await fetch('data/story/meta.json').then(r => r.json()));
const chapter = async lv => cache[lv] || (cache[lv] = await fetch(`data/story/${lv}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
const st = () => S.story || { friend: {}, seen: {}, choice: {} };
const saveSt = patch => update({ story: { ...st(), ...patch } });
const unitDone = (lv, u) => !!(S.completed || {})[`${lv}-${u}`];

function levelOpen(lv, units) {
  const i = LEVELS.indexOf(lv), cur = LEVELS.indexOf(S.level);
  if (i <= Math.max(0, cur)) return true;
  const prev = LEVELS[i - 1];
  return prev && (units[prev] || []).every(u => unitDone(prev, u.id));
}

let root = null, level = null;
register('story', async (el, params = {}) => {
  root = el;
  css();
  update({ mode: 'story' });
  await Promise.all([pyReady, sylReady]);
  const m = await meta();
  level = params.level || level || (LEVELS.includes(S.level) ? S.level : LEVELS[0]);
  if (params.outro) {               // back from a lesson: play its closing scene once
    const ch = await chapter(level), sc = ch && ch.units[params.outro];
    const key = `${level}-${params.outro}-o`;
    if (sc && unitDone(level, params.outro) && !st().seen[key]) {
      return player(sc.outro || [], { after: () => { saveSt({ seen: { ...st().seen, [key]: 1 } }); afterOutro(); } });
    }
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
    return player(ch.intro, { after: () => { saveSt({ seen: { ...st().seen, [`${level}-intro`]: 1 } }); map(m); } });
  }
  const info = (m.chapters || {})[level] || {};
  const cur = units.find(u => !unitDone(level, u.id));
  const nodes = units.map((u, i) => {
    const done = unitDone(level, u.id), isCur = cur && u.id === cur.id;
    const state = done ? 'done' : isCur ? 'cur' : 'lock';
    const x = [50, 24, 50, 76][i % 4];
    return `<div class="sm-node ${state}" style="left:${x}%;top:${i * 162 + 20}px" onclick="window.__smOpen('${u.id}')">
      <span>${done ? '★' : isCur ? '▶' : '🔒'}</span><small>${i + 1}</small></div>`;
  });
  const bg = info.bg || ['#bfe7ff', '#a6dc78'];
  root.innerHTML = `<div class="fade sm">
    <div class="sm-top">
      <button class="chip" onclick="window.__smStudy()">📖 ${tx('study')}</button>
      <div class="flex gap-8">${pyToggle()}<button class="chip" onclick="window.__smLife()">🧭 ${tx('life')}</button></div>
    </div>
    <div class="sm-levels">${LEVELS.map(l => `<button class="chip ${l === level ? 'on' : ''} ${levelOpen(l, allUnits) ? '' : 'locked'}" onclick="window.__smLevel('${l}')">${levelOpen(l, allUnits) ? '' : '🔒 '}${levelLabel(l)}</button>`).join('')}</div>
    <div class="sm-head card">
      <div class="small muted">${tx('chapter')} ${LEVELS.indexOf(level) + 1} · ${levelLabel(level)}</div>
      <div class="sm-title">${info.t ? T(info.t) : ''}</div>
      <div class="muted">${esc(L(info.n))}</div>
      ${ch ? '' : `<div class="small mt-8" style="color:var(--no)">${tx('soon')}</div>`}
    </div>
    <div class="sm-world" style="background:linear-gradient(${bg[0]}, ${bg[1]})">
      <svg class="sm-path" viewBox="0 0 100 ${units.length * 18 + 10}" preserveAspectRatio="none">
        <path d="${pathD(units.length)}" stroke="rgba(255,255,255,.8)" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        <path d="${pathD(units.length)}" stroke="rgba(0,0,0,.12)" stroke-width="3" fill="none" stroke-dasharray="2 12" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
      ${nodes.join('')}
      <div class="sm-end" style="top:${units.length * 162 + 20}px">🏁 ${tx('finale')}</div>
    </div>
    <div class="muted small center mt-8">🎨 ${tx('art')}</div>
  </div>${bottomNav('home')}`;
  root.querySelector('.sm-world').style.height = `${units.length * 162 + 90}px`;
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
window.__smOpen = async id => {
  const units = await loadUnits(level);
  id = String(id);
  const idx = units.findIndex(u => String(u.id) === id);
  const done = unitDone(level, id);
  const cur = units.find(u => !unitDone(level, u.id));
  if (!done && (!cur || String(cur.id) !== id)) return toast(tx('locked'));
  const ch = await chapter(level);
  const sc = ch && ch.units[id];
  const u = units[idx];
  const missionCard = () => missionScreen(u, sc, done);
  if (!sc) return missionCard();
  const key = `${level}-${id}-i`;
  player(sc.intro || [], { choice: sc.choice, choiceKey: `${level}-${id}`, after: () => { saveSt({ seen: { ...st().seen, [key]: 1 } }); missionCard(); } });
};

function missionScreen(u, sc, done) {
  stop();
  root.innerHTML = `<div class="fade sm-mission">
    <div class="card sm-mcard">
      <div class="small" style="color:var(--accent);font-weight:800;letter-spacing:.06em">🎯 ${tx('mission').toUpperCase()}</div>
      <div class="h3 mt-8">${esc(L(sc && sc.mission) || L(u.desc))}</div>
      <div class="muted small mt-8">${tx('lesson')} ${esc(u.id)} · ${esc(L(u.title))}</div>
      <button class="btn mt-16" onclick="window.__smLesson('${u.id}')">${done ? tx('again') : tx('start')} ▶</button>
      ${done && sc && sc.outro ? `<button class="btn btn-ghost mt-8" onclick="window.__smOutro('${u.id}')">${tx('replay')}: ${tx('finale').toLowerCase()}</button>` : ''}
      <button class="btn btn-ghost mt-8" onclick="window.__go('story',{level:'${level}'})">${tx('toMap')}</button>
    </div>
  </div>`;
}
window.__smLesson = id => go('lesson', { level, unit: +id || id, story: true });
window.__smOutro = async id => { const ch = await chapter(level); player(ch.units[id].outro || [], { after: () => map(META) }); };

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
    root.innerHTML = `<div class="sp-scene" onclick="window.__spNext()">
      <div class="sp-top"><span class="chip">${tx('mode')}</span><span class="flex gap-8">${pyToggle()}<button class="chip" onclick="event.stopPropagation();window.__spSkip()">${tx('skip')} ⏭</button></span></div>
      <div class="sp-stage">${narr ? '' : portrait(ln.who, who)}</div>
      <div class="sp-box ${narr ? 'narr' : ''}" onclick="event.stopPropagation();window.__spNext()">
        ${narr ? '' : `<div class="sp-name" style="background:${who.color || 'var(--accent)'}">${T(who.t || '')} ${esc(L(who.n))}</div>`}
        <div class="sp-line" lang="zh">${T(ln.t)}</div>
        <div class="sp-tr ${S.storyTr === false ? 'hide' : ''}">${esc(L(ln.tr))}</div>
        <div class="sp-ctrl"><button class="chip" onclick="event.stopPropagation();window.__spSay()">🔊</button>
          <button class="chip ${S.storyTr === false ? '' : 'on'}" onclick="event.stopPropagation();window.__spTr()">🌐 ${tx('tr')}</button>
          <span class="grow"></span><span class="muted small">${tx('next')} ▸</span></div>
      </div></div>`;
    speak(ln.t);
  };
  const choiceView = () => {
    chose = true;
    const c = opts.choice;
    root.innerHTML = `<div class="sp-scene">
      <div class="sp-top"><span class="chip">${tx('mode')}</span>${pyToggle()}</div>
      <div class="sp-box">
        <div class="small muted mb-8">💬 ${tx('choose')}</div>
        ${c.q ? `<div class="sp-line">${T(c.q.t)}</div><div class="sp-tr">${esc(L(c.q.tr))}</div>` : ''}
      </div>
      <div class="sp-opts">${c.options.map((o, k) => `<button class="card sp-opt" onclick="window.__spPick(${k})">
        <div class="sp-line" lang="zh">${T(o.t)}</div><div class="sp-tr">${esc(L(o.tr))}</div></button>`).join('')}</div></div>`;
  };
  window.__spNext = () => { i++; show(); };
  window.__spSkip = () => { i = queue.length; show(); };
  window.__spSay = () => speak(queue[i] && queue[i].t);
  window.__spTr = () => { update({ storyTr: S.storyTr === false }); show(); };
  window.__spPick = k => {
    const o = opts.choice.options[k];
    const s = st();
    saveSt({ choice: { ...s.choice, [opts.choiceKey]: k }, friend: o.f ? { ...s.friend, [o.f]: (s.friend[o.f] || 0) + 1 } : s.friend });
    queue = queue.slice(0, i).concat([{ who: (META && META.hero) || 'hero', t: o.t, tr: o.tr }], o.reply || []);
    show();
  };
  show();
}

function portrait(id, who) {
  const c = who.color || '#9c7842';
  return `<div class="pt" style="--c:${c}"><div class="pt-face">${T(who.t || '?').replace(/<rt>.*?<\/rt>/g, '')}</div><div class="pt-tag">${esc(L(who.role) || '')}</div></div>`;
}

// ---------- chapter reward ----------
async function reward() {
  const m = await meta(), ch = await chapter(level), info = (m.chapters || {})[level] || {};
  const s = st(), next = LEVELS[LEVELS.indexOf(level) + 1], ni = next && (m.chapters || {})[next];
  stop();
  root.innerHTML = `<div class="fade sm-reward">
    <div class="center"><div class="small" style="font-weight:800;letter-spacing:.08em;color:#8b5e1a">${tx('done').toUpperCase()}</div>
      <div class="h1 mt-8">${info.t ? T(info.t) : ''}</div><div style="font-size:40px;margin-top:6px">⭐⭐⭐</div></div>
    <div class="card sm-rrow"><div style="font-size:28px">💛</div><div><b>${tx('friends')}</b><div class="small muted">${Object.entries(s.friend || {}).map(([k, v]) => `${esc(L((m.cast[k] || {}).n) || k)} ${'♥'.repeat(Math.min(5, v))}`).join(' · ') || '—'}</div></div></div>
    ${ch && ch.gift ? `<div class="card sm-rrow"><div style="font-size:28px">🎁</div><div><b>${tx('gift')}: ${T(ch.gift.t)}</b><div class="small muted">${esc(L(ch.gift.tr))}</div></div></div>` : ''}
    ${ni ? `<div class="card sm-rrow"><div style="font-size:28px">🗺️</div><div><b>${tx('unlocked')}: ${T(ni.t)}</b><div class="small muted">${esc(L(ni.n))}</div></div></div>` : ''}
    <button class="btn mt-16" onclick="window.__go('story',{level:'${next || level}'})">${tx('cont')} ▶</button>
  </div>`;
}

// ---------- the whole life ----------
window.__smLife = async () => {
  const m = await meta();
  const allUnits = {};
  await Promise.all(LEVELS.map(async x => { allUnits[x] = await loadUnits(x).catch(() => []); }));
  root.innerHTML = `<div class="fade sm-life">
    <button class="chip" onclick="window.__go('story',{level:'${level}'})">← ${tx('toMap')}</button>
    <div class="small mt-16" style="opacity:.8;letter-spacing:.08em">${esc(L(m.title)).toUpperCase()}</div>
    <div class="h1 mt-4">${esc(L(m.subtitle))}</div>
    <div class="small mt-4" style="opacity:.85">${esc(L(m.pitch))}</div>
    <div class="mt-16" style="display:grid;gap:9px">${LEVELS.map(l => {
      const c = (m.chapters || {})[l] || {}, us = allUnits[l] || [], d = us.filter(u => unitDone(l, u.id)).length;
      const cls = us.length && d === us.length ? 'on' : l === level ? 'cur' : levelOpen(l, allUnits) ? '' : 'lock';
      return `<div class="tl ${cls}" onclick="window.__smLevel('${l}')"><span>${levelLabel(l)}</span><div><b>${c.t ? T(c.t) : ''}</b><small>${esc(L(c.n))}</small></div><i>${cls === 'on' ? '✓' : cls === 'lock' ? '🔒' : `${d}/${us.length}`}</i></div>`;
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
.sm{padding-bottom:100px}.sm-top{display:flex;justify-content:space-between;align-items:center;padding:14px 0 8px}
.sm-levels{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px}.sm-levels .chip{flex:none}.sm-levels .locked{opacity:.55}
.sm-head{padding:14px 16px;margin:6px 0 12px}.sm-title{font-size:22px;font-weight:800;margin:4px 0}
.sm-world{position:relative;border-radius:24px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04)}
.sm-path{position:absolute;inset:0;width:100%;height:100%}
.sm-node{position:absolute;transform:translateX(-50%);width:62px;height:62px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:#fff;font-weight:900;font-size:20px;box-shadow:0 6px 0 rgba(0,0,0,.18);cursor:pointer}
.sm-node small{font-size:11px;opacity:.9;margin-top:-2px}
.sm-node.done{background:#f2b632}.sm-node.cur{background:#5b8fd6;outline:6px solid rgba(255,255,255,.85);animation:smPulse 1.6s infinite}.sm-node.lock{background:#b9c2b0}
@keyframes smPulse{50%{transform:translateX(-50%) scale(1.07)}}
.sm-end{position:absolute;left:50%;transform:translateX(-50%);background:#e8574a;color:#fff;font-weight:800;padding:10px 16px;border-radius:999px;box-shadow:0 6px 0 rgba(0,0,0,.18)}
.sp-scene{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;background:linear-gradient(#ffcf99,#ffe9c7 55%,#a5d77a 55.2%,#86c262);max-width:520px;margin:0 auto;cursor:pointer}
.sp-top{display:flex;justify-content:space-between;align-items:center;padding:14px 16px}
.sp-stage{flex:1;display:flex;align-items:flex-end;justify-content:center;padding-bottom:10px}
.pt{display:flex;flex-direction:column;align-items:center;gap:6px}
.pt-face{width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,color-mix(in srgb,var(--c) 35%,#fff) 60%,var(--c));
  display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.25);box-shadow:0 10px 24px rgba(0,0,0,.18),inset 0 -8px 0 rgba(0,0,0,.08)}
.pt-tag{background:rgba(255,255,255,.85);border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;color:#5a4a3a}
.sp-box{margin:0 14px 22px;background:#fff;border-radius:22px;padding:18px 16px 12px;box-shadow:0 6px 0 rgba(0,0,0,.08),0 14px 30px rgba(0,0,0,.15);position:relative;cursor:pointer;color:#2b2722}
.sp-box.narr{background:#fffaf0;font-style:italic}
.sp-name{position:absolute;top:-14px;left:16px;color:#fff;font-weight:800;border-radius:999px;padding:3px 12px;font-size:14px}
.sp-name rt{display:none}
.sp-line{font-size:23px;line-height:1.7}.sp-tr{color:#7a6f63;font-size:14px;margin-top:4px}.sp-tr.hide{display:none}
.sp-ctrl{display:flex;gap:8px;align-items:center;margin-top:10px}
.sp-opts{display:grid;gap:10px;margin:0 14px 24px}.sp-opt{padding:12px 16px;text-align:left;border:2px solid transparent;cursor:pointer;font:inherit;color:#2b2722;background:#fff}
.sp-opt:hover{border-color:#5b8fd6}
.sm-mission{padding:40px 0}.sm-mcard{padding:22px}
.sm-reward{padding:30px 4px 100px;display:grid;gap:12px}.sm-rrow{display:flex;gap:12px;align-items:center;padding:12px 16px}
.sm-life{min-height:100vh;margin:0 -16px;padding:18px 20px 100px;background:linear-gradient(#1d2a4a,#3b4f7a 60%,#e8b86b);color:#fff}
.sm-life .tl{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.12);border-radius:16px;padding:10px 12px;cursor:pointer}
.sm-life .tl span{flex:none;width:58px;font-weight:800;font-size:12px;opacity:.85}.sm-life .tl div{flex:1}.sm-life .tl small{display:block;opacity:.75;font-size:12px}.sm-life .tl i{font-style:normal}
.sm-life .tl.on{background:rgba(124,195,106,.35)}.sm-life .tl.cur{background:#fff;color:#2b2722;box-shadow:0 0 0 3px #ffd36b}.sm-life .tl.lock{opacity:.6}
.sm-life rt{color:inherit;opacity:.8}
.sm-toast{position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:#2b2722;color:#fff;padding:10px 16px;border-radius:14px;z-index:100;max-width:86%;font-size:14px;text-align:center}`;
  document.head.appendChild(s);
}
