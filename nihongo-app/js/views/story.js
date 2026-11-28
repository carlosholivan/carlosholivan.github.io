// Story mode: the same lessons, in the same order, lived as a story. Each level is a chapter of the hero's life;
// each lesson opens with a short scene (with a choice that changes the dialogue, never the content), then a friend
// sets the lesson's exercises as challenges inside the scene (no jump to study mode), and a short scene closes it.
// Data: data/story/meta.json (cast, chapters) and data/story/<level>.json (built from tools/story_src/).
import { CFG } from '../app-config.js?v=202611281751';
import { S, update, completeUnit } from '../state.js?v=202611281751';
import { register, go } from '../router.js?v=202611281751';
import { LEVELS, levelLabel } from '../levels.js?v=202611281751';
import { loadUnits, loadVocab, loadUnit } from '../data.js?v=202611281751';
import { addCards, buildQueue, answer } from '../engine/anki.js?v=202611281751';
import { R as rew, gems, chestReady, openChest, SHOP, buy, wear, readFact, factsRead, lives, loseLife, lifeIn, livesFullAt, addGems, LIFE_MAX, earned, refillLives, REFILL_COST } from '../rewards.js?v=202611281751';
import { cheer, boo, sfx, burst, shout, floatUp } from '../../../idiomas/juice.js?v=202611281751';
import { unitVocab } from '../engine/exercises.js?v=202611281751';
import { bottomNav, pyToggle } from '../ui/components.js?v=202611281751';
import { speak, speakAs, stop } from '../audio.js?v=202611281751';
import { ruby, pyReady, sylReady, esc } from '../ja.js?v=202611281751';

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
  shop: { es: 'Tienda', en: 'Shop' }, gemsWhy: { es: 'Ganas 💎 con todo lo que estudias (lecciones, repaso, textos, retos) y con el cofre diario.', en: 'You earn 💎 with everything you study (lessons, reviews, texts, challenges) and from the daily chest.' },
  chestOk: { es: '¡cofre diario abierto!', en: 'daily chest opened!' }, chestHint: { es: 'Estudia hoy y abre el cofre junto al santuario', en: 'Study today to open the chest by the shrine' },
  buyIt: { es: 'Comprar', en: 'Buy' }, wearIt: { es: 'Ponerse', en: 'Wear' }, wearing: { es: 'Puesto', en: 'Wearing' }, takeOff: { es: 'Quitar', en: 'Take off' }, have: { es: 'Tienes', en: 'You have' },
  slots: { es: { outfit: 'Trajes', hat: 'Sombreros', cape: 'Capas', pet: 'Compañeros', shield: 'Racha' }, en: { outfit: 'Outfits', hat: 'Hats', cape: 'Capes', pet: 'Companions', shield: 'Streak' } },
  rv: { es: 'repasa contigo', en: 'reviews with you' }, rvDone: { es: '¡Repaso hecho! Vuelve mañana: tus amigos tendrán más palabras.', en: 'Review done! Come back tomorrow: your friends will have more words.' }, rvNone: { es: 'Hoy no hay palabras pendientes. ¡Repasemos unas cuantas igualmente!', en: 'No words due today. Let\'s review a few anyway!' },
  map: { es: 'Mapa', en: 'Map' }, food: { es: 'Comida típica', en: 'Typical food' }, custom: { es: 'Costumbre', en: 'Custom' }, manners: { es: 'Educado y no educado', en: 'Polite and rude' }, dialect: { es: 'Cómo se habla', en: 'How people speak' },
  tapPlace: { es: 'Toca un lugar del mapa para conocerlo.', en: 'Tap a place on the map to learn about it.' }, figures: { es: 'Personajes históricos', en: 'Historical figures' }, whoWas: { es: '¿Quién fue…?', en: 'Who was…?' },
  todayIn: { es: 'Hoy en', en: 'Today in' }, tomorrowIn: { es: 'Mañana en', en: 'Tomorrow in' }, soonIn: { es: 'En {n} días en', en: 'In {n} days in' }, approx: { es: 'Fecha aproximada: depende del calendario lunar.', en: 'Approximate date: it depends on the lunar calendar.' },
  didYou: { es: '¿Sabías que…?', en: 'Did you know…?' }, factsN: { es: 'Curiosidades descubiertas: {n}', en: 'Facts discovered: {n}' },
  gymLocked: { es: 'El templo se abre cuando completes todos los pueblos de esta región', en: 'The temple opens when you finish every town in this region' },
  medal: { es: '¡Medalla de {l} conseguida!', en: '{l} medal earned!' }, nextRegion: { es: 'Se ha abierto una nueva región: {l}.', en: 'A new region is open: {l}.' }, allRegions: { es: '¡Has conquistado todas las regiones!', en: 'You have conquered every region!' },
  drag: { es: 'Toca el suelo para caminar · desliza para girar', en: 'Tap the ground to walk · drag to turn' }, locked: { es: 'Completa antes el episodio anterior', en: 'Finish the previous episode first' },
  trial: { es: 'Empezar el reto', en: 'Start the challenge' }, trialAgain: { es: 'Repetir el reto', en: 'Redo the challenge' },
  dares: { es: 'te reta', en: 'challenges you' }, full: { es: 'Práctica completa en modo estudio', en: 'Full practice in study mode' },
  good: { es: '¡Muy bien!', en: 'Well done!' }, bad: { es: 'Casi. La respuesta era:', en: 'Not quite. The answer was:' },
  cont2: { es: 'Continuar', en: 'Continue' }, meaning: { es: '¿Qué significa?', en: 'What does it mean?' },
  listen: { es: 'Escucha y elige', en: 'Listen and choose' }, order: { es: 'Ordena la frase', en: 'Put the sentence in order' },
  fill: { es: 'Completa la frase', en: 'Fill in the blank' }, sayIt: { es: '¿Cómo se dice?', en: 'How do you say it?' },
  pairs: { es: 'Une cada palabra con su significado', en: 'Match each word to its meaning' },
  whatSaid: { es: '¿Qué ha dicho {n}?', en: 'What did {n} say?' }, whatReply: { es: '¿Qué le respondes?', en: 'What do you answer?' },
  understood: { es: 'frases entendidas', en: 'lines understood' }, qGood: { es: '¡Lo has entendido!', en: 'You got it!' }, qBad: { es: 'Era esta:', en: 'It was this one:' },
  passed: { es: 'Reto superado', en: 'Challenge complete' }, check: { es: 'Comprobar', en: 'Check' }, gift: { es: 'Regalo', en: 'Gift' },
};
const tx = k => L(TX[k]);
const GTX = {
  play: { es: 'Jugar con {n}', en: 'Play with {n}' }, review: { es: 'Repasar con {n}', en: 'Review with {n}' },
  playSub: { es: 'Une cada palabra con su significado antes de que se acabe el tiempo. Cuenta como repaso.', en: 'Match each word with its meaning before time runs out. It counts as review.' },
  pairs: { es: 'Parejas', en: 'Pairs' }, time: { es: 'Tiempo', en: 'Time' }, go: { es: '¡A jugar!', en: 'Play!' },
  ready: { es: 'Toca una palabra y luego su significado. ¡Encadena aciertos para hacer combos!', en: 'Tap a word, then its meaning. Chain right answers for combos!' },
  tapWord: { es: '¡Encuentra las parejas!', en: 'Find the pairs!' }, again: { es: 'Otra partida', en: 'Play again' },
  best: { es: 'Mejor combo', en: 'Best combo' }, record: { es: '¡Nuevo récord!', en: 'New record!' }, learnt: { es: 'palabras repasadas', en: 'words reviewed' },
};
const gx = (k, n = '') => L(GTX[k]).replace('{n}', n);

// ---------- lives: a local food per language. Missing answers costs one; having none never blocks playing ----------
const LIFE = { nihongo: ['🍙', { es: 'onigiris', en: 'onigiri' }], chino: ['🥟', { es: 'jiaozi', en: 'dumplings' }], arabe: ['🧆', { es: 'falafels', en: 'falafels' }],
  arabic: ['🧆', { es: 'falafels', en: 'falafels' }], espanol: ['🥘', { es: 'paellas', en: 'paellas' }], english: ['🫖', { es: 'teteras', en: 'teapots' }],
  francais: ['🥐', { es: 'cruasanes', en: 'croissants' }], deutsch: ['🥨', { es: 'pretzels', en: 'pretzels' }] }[CFG.id] || ['❤️', { es: 'vidas', en: 'lives' }];
const LTX = {
  lifeWhy: { es: 'Cada fallo cuesta {i}. Se recupera uno cada 20 minutos. Sin {n} puedes seguir jugando igual, pero cada reto que termines con {n} te da 💎 extra: 2 por cada {i} que te quede.', en: 'Each mistake costs one {i}. One comes back every 20 minutes. Without {n} you can still play, but every challenge you finish with {n} pays extra 💎: 2 for each {i} left.' },
  lifeNext: { es: '+1 en {m} min', en: '+1 in {m} min' }, lifeFull: { es: '¡Llenos!', en: 'Full!' },
  lifeBonus: { es: 'Bonus por tus {n}', en: 'Bonus for your {n}' }, lifeNone: { es: 'Sin {n} no hay bonus esta vez: vuelven en {m} min.', en: 'No {n}, no bonus this time: they come back in {m} min.' },
  lifeNote: { es: '¡Tus {n} están llenos! {i} Vuelve y gana el bonus de 💎.', en: 'Your {n} are full! {i} Come back for the 💎 bonus.' }, perfect: { es: '¡Perfecto!', en: 'Perfect!' },
};
const lt = (k, o = {}) => L(LTX[k]).replace(/\{i\}/g, LIFE[0]).replace(/\{n\}/g, L(LIFE[1])).replace(/\{m\}/g, o.m == null ? '' : o.m);
const lifeChip = () => `<span class="chip sp-chip lv-chip">${LIFE[0]} ${lives()}</span>`;
const lifeRow = () => `<button class="lv-row" onclick="window.__lvWhy()">${Array.from({ length: LIFE_MAX }, (_, k) => `<span class="${k < lives() ? '' : 'off'}">${LIFE[0]}</span>`).join('')}<small>${lives() >= LIFE_MAX ? lt('lifeFull') : lt('lifeNext', { m: Math.ceil(lifeIn() / 60000) })}</small></button>`;
// Losing one: it flies off the chip, and on the phone a notification is set for when they are all back.
function miss(el) {
  boo(el);
  if (lives() <= 0) return;
  loseLife();
  const chip = root && root.querySelector('.lv-chip');
  if (chip) { chip.textContent = `${LIFE[0]} ${lives()}`; floatUp(`-1 ${LIFE[0]}`, chip, '#ff8fa3'); }
  sfx('life');
  const N = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  const at = livesFullAt();
  if (N && at) N.schedule({ notifications: [{ id: 7400, title: `${LIFE[0]} ${lt('lifeFull')}`, body: lt('lifeNote'), schedule: { at: new Date(at), allowWhileIdle: true } }] }).catch(() => {});
}
// End of a challenge: 2 gems for every life left, with fanfare.
function lifeBonus(el) {
  const n = lives();
  if (n <= 0) return `<div class="lv-bonus off">${lt('lifeNone', { m: Math.ceil(lifeIn() / 60000) })}</div>`;
  addGems(n * 2);
  setTimeout(() => { sfx('win'); burst(el || null, 60, 1.6); if (n >= LIFE_MAX) shout(lt('perfect')); }, 200);
  return `<div class="lv-bonus">${lt('lifeBonus')}: ${LIFE[0].repeat(n)} → 💎 +${n * 2}</div>`;
}
// No lives left: starting something new opens the sheet (review to earn one, refill with gems, wait, or do free things).
// Returns true when it blocked. Whatever is already under way can always be finished.
async function gate(retry) {
  if (lives() > 0) return false;
  const lg = await import('../../../idiomas/lives.js?v=202611281751');
  lg.showGate({ lang: S.lang, icon: LIFE[0], name: L(LIFE[1]), minutes: Math.ceil(lifeIn() / 60000), gems: gems(), cost: REFILL_COST, earned: earned(),
    onPractice: async () => { const f = friends(META || await meta())[0]; f ? npcReview(f) : window.__go('review'); },
    onRefill: () => { if (!refillLives()) return false; sfx('win'); shout(`${LIFE[0].repeat(LIFE_MAX)}`); retry && setTimeout(retry, 300); return true; },
    onFree: () => window.__go('story', { level }), onClose: () => {} });
  return true;
}
window.__lvWhy = () => { const md = root.querySelector('.w3-modal'); if (!md) return toast(lt('lifeWhy'));
  md.innerHTML = `<div class="w3-card"><div class="lv-big">${Array.from({ length: LIFE_MAX }, (_, k) => `<span class="${k < lives() ? '' : 'off'}">${LIFE[0]}</span>`).join('')}</div><h3>${esc(L(LIFE[1]))}</h3><p>${lt('lifeWhy')}</p><p class="small muted">${lives() >= LIFE_MAX ? lt('lifeFull') : lt('lifeNext', { m: Math.ceil(lifeIn() / 60000) })}</p><button class="btn mt-12" onclick="this.closest('.w3-modal').hidden=true">OK</button></div>`; md.hidden = false; };

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
  // The region map (shared module in /idiomas/): towns along a road, friends who review with you, facts, the temple.
  const flat = root.querySelector('.sm-world');
  const mp = await import('../../../idiomas/map2d.js?v=202611281751').catch(() => null);
  if (!flat.isConnected || !mp) { flat.style.height = `${ns.length * 162 + 90}px`; return; }
  const NOW = window.__w3time ? new Date(window.__w3time) : new Date(), time = mp.sceneTime(NOW);
  const hero = (m.cast || {})[m.hero] || {}, wr = rew().wear || {}, icon = id => (SHOP.find(x => x.id === id) || {}).icon || '';
  const ARCH = { chino: 'asia', nihongo: 'asia', arabe: 'arab', arabic: 'arab' }[CFG.id] || 'europe';
  const allDone = ns.length && ns.every(nodeDone);
  const cult = await import('../../../idiomas/culture.js').catch(() => null);
  const cu = cult ? await cult.loadCulture(CFG.id).catch(() => null) : null;
  const lvI = LEVELS.indexOf(level), places = (cu && cu.places) || [], here = places.length ? places[lvI % places.length] : null;
  const due = dueCount();
  const box = document.createElement('div'); box.className = `mp mp-${time.season} mp-${time.phase}`;
  box.innerHTML = `<div class="mp-top"><div class="mp-hud">
      <div class="w3-me">${hero.img ? `<span class="mp-av" style="--c:${OUTFIT[wr.outfit] || '#24407a'}"><img src="${hero.img}" alt="">${wr.hat ? `<i>${icon(wr.hat)}</i>` : ''}${wr.pet ? `<u>${icon(wr.pet)}</u>` : ''}</span>` : ''}<div><b>${esc(L(hero.n))}</b><span>🔥 ${S.streak || 0} · 💎 <i class="w3-gems">${gems()}</i></span></div></div>
      <button class="chip w3-shop" onclick="window.__smShop()">🛍️ ${tx('shop')}</button></div>
    <div class="mp-chips">${lifeRow()}
      ${here ? `<button class="chip" onclick="window.__smPlace()">📍 ${esc(here.n)}</button>` : ''}${places.length ? `<button class="chip" onclick="window.__smMap()">🗺️ ${tx('map')}</button>` : ''}</div></div>
    <button class="mp-fest" hidden onclick="window.__smFest()"></button>
    <div class="mp-scroll"><div class="mp-fx"></div></div>
    <div class="sm-hint mp-hint"></div>
    <div class="w3-modal" hidden></div>`;
  flat.replaceWith(box);
  const W = Math.min(520, box.clientWidth || 380);
  const friendList = friends(m).map(id => { const c = (m.cast || {})[id] || {}; return { id, img: c.img, name: L(c.n), color: c.color, due }; });
  const out = mp.regionMap({
    W, arch: ARCH, app: CFG.id, biome: /^arab/.test(CFG.id) ? 'desert' : null, seed: lvI + 3, season: time.season, phase: time.phase,
    nodes: ns.map(n => ({ key: n.key, state: nodeDone(n) ? 'done' : n === cur ? 'cur' : 'lock', sub: n.units.length > 1 ? `${n.units.filter(u => unitDone(level, u.id)).length}/${n.units.length}` : '' })),
    friends: friendList, chest: chestReady(), gym: allDone ? 'won' : 'lock',
    hero: { img: hero.img, hat: icon(wr.hat), pet: icon(wr.pet) },
  });
  const sc = box.querySelector('.mp-scroll');
  sc.insertAdjacentHTML('beforeend', out.svg);
  fx(box.querySelector('.mp-fx'), time, /^arab/.test(CFG.id));
  const hint = (t2, ms = 2200, bad) => { const h = box.querySelector('.mp-hint'); h.textContent = t2; h.classList.toggle('on', !!bad); h.classList.add('show'); clearTimeout(hint.t); hint.t = setTimeout(() => h.classList.remove('show', 'on'), ms); };
  const modal = html => { const md = box.querySelector('.w3-modal'); md.innerHTML = `<div class="w3-card">${html}<button class="btn mt-12" onclick="this.closest('.w3-modal').hidden=true">${tx('cont2')}</button></div>`; md.hidden = false; };
  const placeCard = pl => `<div class="w3-k">📍 ${esc(cu.country)}</div><h3>${esc(pl.n)}</h3><p>${esc(pl.d)}</p>
    <p><b>🍜 ${tx('food')}:</b> ${esc(pl.food)}</p><p><b>🎎 ${tx('custom')}:</b> ${esc(pl.cos)}</p><p><b>🙇 ${tx('manners')}:</b> ${esc(pl.eti)}</p><p><b>🗣️ ${tx('dialect')}:</b> ${esc(pl.dia)}</p>`;
  if (here) window.__smPlace = () => modal(placeCard(here));
  if (places.length) window.__smMap = async () => {
    const mpp = await cult.loadMap(CFG.id);
    const dot = (pl, k) => { if (!mpp || !cult.inMap(mpp, pl.ll)) return ''; const [x, y] = cult.project(mpp, pl.ll), st2 = k === lvI ? 'cur' : k < lvI ? 'done' : '';
      return `<g class="w3-dot ${st2}" onclick="window.__smMapPick(${k})"><circle cx="${x}" cy="${y}" r="${k === lvI ? 13 : 10}"/><text x="${x}" y="${y - 16}">${esc(pl.n.split(' (')[0])}</text></g>`; };
    const far = places.map((pl, k) => [pl, k]).filter(([pl]) => mpp && !cult.inMap(mpp, pl.ll));
    modal(`<div class="w3-k">🗺️ ${esc(cu.country)}</div>
      ${mpp ? `<svg class="w3-svg" viewBox="0 0 ${mpp.w} ${mpp.h}"><g class="o">${mpp.other.map(d => `<path d="${d}"/>`).join('')}</g><g class="m">${mpp.main.map(d => `<path d="${d}"/>`).join('')}</g>${places.map(dot).join('')}</svg>` : ''}
      ${far.length ? `<div class="w3-far">${far.map(([pl, k]) => `<button class="chip" onclick="window.__smMapPick(${k})">🌍 ${esc(pl.n)}</button>`).join('')}</div>` : ''}
      <div class="w3-pick small muted">${tx('tapPlace')}</div>
      ${(cu.figures || []).length ? `<div class="w3-k" style="margin-top:12px">👤 ${tx('figures')}</div>${cu.figures.map(fg => `<details class="w3-fig"><summary><b>${esc(fg.n)}</b> <span class="muted small">${esc(fg.y)}</span></summary><p>${esc(fg.t)}</p></details>`).join('')}` : ''}`);
    window.__smMapPick = k => { const el2 = box.querySelector('.w3-pick'); el2.classList.remove('small', 'muted'); el2.innerHTML = placeCard(places[k]); el2.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  };
  if (cu) {
    const f = cult.upcoming(cu, 7, NOW)[0];
    if (f) {
      const b2 = box.querySelector('.mp-fest');
      const when = f.in === 0 ? tx('todayIn') : f.in === 1 ? tx('tomorrowIn') : tx('soonIn').replace('{n}', f.in);
      b2.textContent = `🎎 ${when} ${cu.country}: ${f.n}`; b2.hidden = false;
      window.__smFest = () => modal(`<div class="w3-k">🎎 ${when} ${esc(cu.country)}</div><h3>${esc(f.n)}</h3><p>${esc(f.t)}</p>${f.approx ? `<p class="small muted">${tx('approx')}</p>` : ''}`);
    }
  }
  const setGems = () => { const g2 = box.querySelector('.w3-gems'); if (g2) g2.textContent = gems(); };
  window.__mpNode = key => window.__smOpen(key);
  window.__mpFriend = id => {
    const c = (m.cast || {})[id] || {}, nm = esc(L(c.n));
    modal(`${c.img ? `<img class="fr-img" src="${c.img}" alt="">` : ''}<h3>${nm}</h3>
      <button class="btn fr-play" onclick="this.closest('.w3-modal').hidden=true;window.__wgPlay('${id}')">🎮 ${gx('play', nm)}</button>
      <p class="small muted" style="text-align:center">${gx('playSub')}</p>
      <button class="btn btn-ghost fr-rv" onclick="this.closest('.w3-modal').hidden=true;window.__mpReview('${id}')">💬 ${gx('review', nm)}${due ? ` · ${due}` : ''}</button>`);
  };
  window.__mpReview = id => npcReview(id);
  window.__mpChest = () => { if (!chestReady()) return hint('🎁 ' + tx('chestHint'), 2800, true); const n = openChest(); setGems(); hint(`🎁 +${n} 💎 · ${tx('chestOk')}`, 3200); const c = box.querySelector('.mp-chest'); if (c) c.classList.remove('ready'); };
  window.__mpGym = () => {
    const nx = LEVELS[lvI + 1];
    if (!allDone) return hint('🏯 ' + tx('gymLocked'), 2800, true);
    modal(`<div class="w3-medal">🏅</div><h3>${tx('medal').replace('{l}', esc(levelLabel(level)))}</h3><p>${nx ? tx('nextRegion').replace('{l}', esc(levelLabel(nx))) : tx('allRegions')}</p>${nx ? `<button class="btn" onclick="window.__go('story',{level:'${nx}'})">${esc(levelLabel(nx))} ▶</button>` : ''}`);
  };
  window.__mpSign = i => {
    if (ns[i] && !nodeDone(ns[i]) && ns[i] !== cur) return hint('🔒 ' + tx('locked'), 1800, true);
    if (cu && (cu.figures || []).length && i % 6 === 5) {
      const k = Math.floor(i / 6) % cu.figures.length, fg = cu.figures[k], isNew = readFact(`${CFG.id}-fig-${k}`);
      modal(`<div class="w3-k">👤 ${tx('whoWas')}</div><h3>${esc(fg.n)}</h3><p class="small muted">${esc(fg.y)}</p><p class="w3-fact">${esc(fg.t)}</p><p class="small muted">${isNew ? '💎 +3 · ' : ''}${tx('factsN').replace('{n}', factsRead())}</p>`);
      return setGems();
    }
    const f = cult && cu ? cult.factFor(cu, lvI * 40 + i, NOW) : null;
    if (!f) return;
    const isNew = readFact(`${CFG.id}-${f.k}`);
    modal(`<div class="w3-k">📜 ${tx('didYou')}</div><p class="w3-fact">${esc(f.t)}</p><p class="small muted">${isNew ? '💎 +3 · ' : ''}${tx('factsN').replace('{n}', factsRead())}</p>`);
    setGems();
  };
  setTimeout(() => { if (box.isConnected) window.scrollTo({ top: Math.max(0, sc.getBoundingClientRect().top + scrollY + out.curY - innerHeight * .55), behavior: 'smooth' }); }, 250);
}
// Outfit colours, shown as the ring around the hero's portrait.
const OUTFIT = { green: '#3f9a4a', crimson: '#b8323a', night: '#2a2f6e', snow: '#cfe6f5' };
// Falling petals, leaves or snow, and fireflies on summer nights: a few CSS-animated specks over the map.
function fx(el, t, desert) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const kind = t.phase === 'night' && t.season !== 'winter' ? 'fly' : desert ? (t.season === 'winter' ? '' : 'dust') : { spring: 'petal', autumn: 'leaf', winter: 'snow', summer: 'bfly' }[t.season];
  if (!kind) return;
  const n = kind === 'snow' ? 26 : kind === 'bfly' ? 4 : 14;
  el.innerHTML = Array.from({ length: n }, (_, k) => `<i class="fx-${kind}" style="left:${(k * 37 + 11) % 100}%;animation-delay:${-(k * 1.7) % 12}s;animation-duration:${9 + (k * 7) % 8}s;--s:${.7 + (k % 5) * .12}"></i>`).join('');
}
// A character's pitch for words they have no recording of (the app's recordings use a woman's voice).
const toneOf = id => { const v = ((((META || {}).cast || {})[id] || {}).voice) || {}; if (v.age === 'pet') return 1.15;
  return v.g === 'm' ? ({ kid: .93, old: .78 }[v.age] || .82) : ({ kid: 1.07, old: .94 }[v.age] || 1); };
const coachSay = (id, k) => { const c = (META || {}).coach || []; if (c[k]) speakAs(id, c[k]); };

// ---------- villagers who help you review: the hero's friends stand by the path in the 3D world ----------
const dueCount = () => buildQueue('v', 50, Date.now(), null, 'due').length;
function friends(m) {
  const cnt = {};
  for (const lv of Object.values(cache)) for (const sc of Object.values((lv && lv.units) || {})) for (const l of sceneLines(sc)) if (l && l.who) cnt[l.who] = (cnt[l.who] || 0) + 1;
  return Object.keys(m.cast || {}).filter(k => k !== m.hero && k !== 'narr' && ((m.cast[k].voice || {}).age !== 'pet'))
    .sort((a, b) => (!!m.cast[b].img - !!m.cast[a].img) || (cnt[b] || 0) - (cnt[a] || 0)).slice(0, 3);
}
let ALLV = null;
async function allVocab() {
  if (ALLV) return ALLV;
  ALLV = new Map();
  for (const lv of LEVELS) { try { for (const w of await loadVocab(lv)) if (!ALLV.has(w.word)) ALLV.set(w.word, w); } catch (e) {} }
  return ALLV;
}
async function npcReview(cid) {
  stop();
  const m = META || await meta(), who = (m.cast || {})[cid] || {};
  let words = buildQueue('v', 8, Date.now(), null, 'due'), none = !words.length;
  if (none) words = buildQueue('v', 6, Date.now(), null, 'extra');
  // this level's words first (fast); the other levels only if a word to review is not in it
  const here = VOC[level] || (VOC[level] = await loadVocab(level).catch(() => []));
  let V = new Map(here.map(w => [w.word, w]));
  if (words.some(w => !V.has(w))) V = await allVocab();
  const pool = here.length > 8 ? here : [...V.values()];
  const list = words.map(w => V.get(w)).filter(Boolean).map(w => ({ w, opts: shuf([w, ...shuf(pool.filter(x => x.word !== w.word)).slice(0, 3)]) }));
  let qi = 0, ok = 0;
  const frame = (box, below, cheer) => {
    root.innerHTML = `<div class="sp-scene tc" data-sm>
      <div class="sp-top"><span class="chip sp-chip">💬 ${esc(L(who.n))} ${tx('rv')}</span><span class="flex gap-8">${lifeChip()}<button class="chip sp-chip" onclick="window.__go('story',{level:'${level}'})">✕</button></span></div>
      <div class="sp-stage">${hills()}${portrait(cid, who, false).replace('class="pt ', `class="pt ${cheer ? 'cheer ' : ''}`)}</div>
      <div class="sp-prog"><i style="width:${Math.round(100 * qi / Math.max(1, list.length))}%"></i></div>
      <div class="sp-box tc-box">${box}</div>${below ? `<div class="tc-below">${below}</div>` : ''}</div>`;
  };
  const next = () => {
    if (qi >= list.length) {
      frame(`<div class="tc-done">✨ ${ok}/${list.length} · 💎 +${Math.floor(ok / 2) + 2}</div>${lifeBonus()}<p class="sp-tr" style="text-align:center">${tx('rvDone')}</p>`,
        `<button class="btn" onclick="window.__go('story',{level:'${level}'})">${tx('toMap')} ▶</button>`, true);
      update({ xp: (S.xp || 0) + ok + 4 });
      coachSay(cid, 4);
      return;
    }
    const c = list[qi];
    if (qi === 0) { coachSay(cid, 0); setTimeout(() => list[qi] === c && speakAs(cid, c.w.word, toneOf(cid)), 1700); }
    else speakAs(cid, c.w.word, toneOf(cid));
    window.__tcSay = t => speakAs(cid, t, toneOf(cid));
    frame(`${none && qi === 0 ? `<div class="sp-tr">${tx('rvNone')}</div>` : ''}<div class="tc-q">${tx('meaning')}</div><div class="sp-line tc-big" lang="${LG}" onclick="window.__tcSay(this.dataset.t)" data-t="${esc(c.w.word)}">${T(c.w.word)} <span class="tc-snd">🔊</span></div>`,
      `<div class="tc-opts">${c.opts.map((o, k) => `<button class="card tc-opt" onclick="window.__rvPick(${k})">${esc(L(o.m))}</button>`).join('')}</div>`);
    window.__rvPick = k => {
      const good = c.opts[k] === c.w;
      answer(c.w.word, good ? 3 : 1); if (good) ok++;
      coachSay(cid, good ? 1 + (qi % 2) : 3);
      frame(good ? `<div class="tc-res ok">✓ ${tx('good')}</div>` : `<div class="tc-res no">${tx('bad')}</div><div class="tc-answer">${T(c.w.word)} = ${esc(L(c.w.m))}</div>`,
        `<button class="btn" onclick="window.__rvNext()">${tx('cont2')} ▶</button>`, good);
      const res = root.querySelector('.tc-res'); good ? cheer(res) : miss(res);
      window.__rvNext = () => { window.__rvNext = () => {}; qi++; next(); };
    };
  };
  next();
}

// ---------- "play with a friend": the word-pairs game (shared module /idiomas/wordmatch.js) ----------
window.__wgPlay = async cid => {
  if (await gate(() => window.__wgPlay(cid))) return;
  stop();
  const m = META || await meta(), who = (m.cast || {})[cid] || {};
  const wm = await import('../../../idiomas/wordmatch.js?v=202611281751');
  if (!document.getElementById('wg-css')) document.head.insertAdjacentHTML('beforeend', `<style id="wg-css">${wm.CSS}</style>`);
  // words: due for review first, then this level's (only short meanings fit on a tile)
  const here = VOC[level] || (VOC[level] = await loadVocab(level).catch(() => []));
  let V = new Map(here.map(w => [w.word, w]));
  const due = buildQueue('v', 30, Date.now(), null, 'due');
  if (due.some(w => !V.has(w))) V = await allVocab();
  const pick = [], seen = new Set();
  const add = w => { if (!w || seen.has(w.word) || pick.length >= 40) return; const mm = String(L(w.m) || '').split(/[;,/(·]/)[0].trim(); if (!mm || mm.length > 22) return; seen.add(w.word); pick.push({ key: w.word, t: w.word, sub: w.p && w.p !== w.word ? w.p : '', m: mm }); };
  due.forEach(w => add(V.get(w)));
  shuf(here.slice()).forEach(add);
  root.innerHTML = `<div class="sp-scene wg-scene" data-sm><div class="sp-top"><button class="chip sp-chip" onclick="window.__wgQuit()">✕</button><span class="chip sp-chip">🎮 ${esc(L(who.n))}</span></div><div class="wg-host"></div><div class="w3-modal" hidden></div></div>`;
  const game = wm.playMatch(root.querySelector('.wg-host'), {
    words: pick, lang: LG, cols: /^(zh|ja|ar)$/.test(LG) ? 5 : 4, rows: /^(zh|ja|ar)$/.test(LG) ? 6 : 7, friend: { name: L(who.n), img: who.img, color: who.color },
    tx: { pairs: gx('pairs'), time: gx('time'), go: gx('go'), ready: gx('ready'), tapWord: gx('tapWord') },
    lifeChip, onSay: t => speakAs(cid, t, toneOf(cid)),
    onResult: (key, ok) => answer(key, ok ? 3 : 1),
    onMiss: el => miss(el),
    onEnd: r => wgEnd(cid, who, r, pick.length),
  });
  window.__wgQuit = () => { game.stop(); window.__go('story', { level }); };
};
function wgEnd(cid, who, r, n) {
  const rec = (rew().wgBest || 0), isRec = r.score > rec;
  if (isRec) { const x = rew(); x.wgBest = r.score; update({ rew: { ...x, t: Date.now() } }); }
  const g = Math.floor(r.pairs / 2) + r.stars * 3;
  addGems(g); update({ xp: (S.xp || 0) + r.pairs });
  coachSay(cid, r.stars >= 2 ? 4 : r.stars ? 1 : 3);
  root.querySelector('.wg-host').innerHTML = `<div class="wg-end">
    ${who.img ? `<img class="fr-img" src="${who.img}" alt="">` : ''}
    <div class="wg-stars">${[0, 1, 2].map(k => `<span class="${k < r.stars ? 'on' : ''}" style="animation-delay:${.2 + k * .25}s">★</span>`).join('')}</div>
    ${isRec ? `<div class="wg-rec">🏆 ${gx('record')}</div>` : ''}
    <div class="wg-big">${r.score}</div>
    <div class="wg-row"><span>🧩 ${r.pairs} ${gx('pairs').toLowerCase()}</span><span>🔥 ${gx('best')} x${r.best}</span><span>💎 +${g}</span></div>
    <p class="small" style="opacity:.8;text-align:center">${r.pairs} ${gx('learnt')}</p>
    ${lifeBonus()}
    <button class="btn mt-12" onclick="window.__wgPlay('${cid}')">🎮 ${gx('again')}</button>
    <button class="btn btn-ghost mt-8" onclick="window.__go('story',{level:'${level}'})">${tx('toMap')}</button></div>`;
  if (r.stars) setTimeout(() => { sfx('win'); burst(null, 70, 1.7); }, 300);
}

// ---------- the shop: looks for the hero, bought with gems ----------
window.__smShop = async () => {
  const m = META || await meta(), r = rew(), lang = S.lang === 'en' ? 'en' : 'es';
  const slots = ['outfit', 'hat', 'cape', 'pet', 'shield'];
  const card = it => {
    const own = r.owned[it.id], on = (r.wear || {})[it.slot] === it.id, can = gems() >= it.cost;
    const btn = it.slot === 'shield' ? `<button class="btn btn-sm" ${can ? '' : 'disabled'} onclick="window.__shBuy('${it.id}')">💎 ${it.cost}</button>`
      : own ? (on ? `<button class="btn btn-ghost btn-sm" onclick="window.__shWear('${it.slot}','')">✓ ${tx('wearing')}</button>` : `<button class="btn btn-sm" onclick="window.__shWear('${it.slot}','${it.id}')">${tx('wearIt')}</button>`)
      : `<button class="btn btn-sm" ${can ? '' : 'disabled'} onclick="window.__shBuy('${it.id}')">💎 ${it.cost}</button>`;
    return `<div class="sh-item ${on ? 'on' : ''}"><span class="sh-ic">${it.icon}</span><span class="sh-n">${esc(it.n[lang])}${it.slot === 'shield' && r.shield ? ` · ${tx('have')} ${r.shield}` : ''}</span>${btn}</div>`;
  };
  root.innerHTML = `<div class="fade sm sh" data-sm>
    <div class="sm-top"><button class="chip" onclick="window.__go('story',{level:'${level}'})">← ${tx('toMap')}</button><span class="chip">💎 ${gems()}</span></div>
    <div class="sh-stage"></div>
    <p class="small muted sh-why">${tx('gemsWhy')}</p>
    ${slots.map(sl => `<div class="sh-h">${tx('slots')[sl]}</div>${SHOP.filter(i => i.slot === sl).map(card).join('')}`).join('')}
  </div>${bottomNav('home')}`;
  const hero = (m.cast || {})[m.hero] || {}, wr = rew().wear || {}, icon = id => (SHOP.find(x => x.id === id) || {}).icon || '';
  const st2 = root.querySelector('.sh-stage');
  if (st2) st2.innerHTML = `<div class="sh-av ${wr.cape ? 'cape-' + wr.cape : ''}" style="--c:${OUTFIT[wr.outfit] || '#24407a'}">${hero.img ? `<img src="${hero.img}" alt="">` : ''}${wr.hat ? `<i>${icon(wr.hat)}</i>` : ''}${wr.pet ? `<u>${icon(wr.pet)}</u>` : ''}</div><b>${esc(L(hero.n))}</b>`;
};
window.__shBuy = id => { if (buy(id)) window.__smShop(); };
window.__shWear = (slot, id) => { wear(slot, id); window.__smShop(); };
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
  if (!nodeDone(n) && await gate(() => window.__smOpen(key))) return;
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
  if (n && !nodeDone(n) && await gate(() => window.__smTrial(key, from))) return;
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
    frame(`<div class="tc-done">✨ ${tx('passed')} · ${tx('lesson')} ${esc(u.id)}</div>${lifeBonus()}`, `<button class="btn" onclick="window.__tcGo()">${tx('cont2')} ▶</button>`, true);
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
      <div class="sp-top"><span class="chip sp-chip">🎯 ${esc(L(who.n))} ${tx('dares')}</span><span class="flex gap-8">${lifeChip()}${pyToggle()}<button class="chip sp-chip" onclick="window.__go('story',{level:'${level}'})">✕</button></span></div>
      <div class="sp-stage">${hills()}${portrait(cid, who, false).replace('class="pt ', `class="pt ${cheer ? 'cheer ' : ''}`)}</div>
      <div class="sp-prog"><i style="width:${Math.min(100, Math.round(100 * (ui + qi / Math.max(1, list.length)) / todo.length))}%"></i></div>
      <div class="sp-box tc-box">${box}</div>
      ${below ? `<div class="tc-below">${below}</div>` : ''}</div>`;
  };
  const next = () => {
    if (qi >= list.length) return finishUnit();
    const c = list[qi];
    window.__tcSay = t => speakAs(cid, t, toneOf(cid));
    if (c.k === 'word') {
      speakAs(cid, c.w.word, toneOf(cid));
      frame(`<div class="tc-q">${tx('meaning')}</div><div class="sp-line tc-big" lang="${LG}" onclick="window.__tcSay(this.dataset.t)" data-t="${esc(c.w.word)}">${T(c.w.word)} <span class="tc-snd">🔊</span></div>`,
        opts(c.opts.map(o => esc(L(o.m))), c.opts.indexOf(c.w), () => `${T(c.w.word)} = ${esc(L(c.w.m))}`));
    } else if (c.k === 'choose') {
      frame(`<div class="tc-q">${esc(L(c.prompt))}</div>`, opts(c.opts.map(o => `<span lang="${LG}">${T(o)}</span>`), c.opts.indexOf(c.ok), () => `<span lang="${LG}">${T(c.ok)}</span>${c.hint ? `<div class="muted small">${esc(L(c.hint))}</div>` : ''}`, c.ok));
    } else if (c.k === 'listen') {
      speakAs(cid, c.text, toneOf(cid));
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
      window.__tcL = k => { sel = k; speakAs(cid, c.pairs[k][0], toneOf(cid)); draw(); };
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
    if (ok) coachSay(cid, 1 + (qi % 2)); else if (say) speakAs(cid, say, toneOf(cid)); else coachSay(cid, 3);
    if (!ok && !list[qi].again) list.push({ ...list[qi], again: 1 });
    const box = ok ? `<div class="tc-res ok">✓ ${tx('good')}</div>` : `<div class="tc-res no">${tx('bad')}</div><div class="tc-answer">${answerHtml}</div>`;
    frame(box, `<button class="btn" onclick="window.__tcNext()">${tx('cont2')} ▶</button>`, ok);
    const res = root.querySelector('.tc-res'); ok ? cheer(res) : miss(res);
    window.__tcNext = () => { window.__tcNext = () => {}; qi++; next(); };
  };
  startUnit();
}

// ---------- scene player: one line at a time, tap to continue ----------
// Understanding is the game: every few lines the scene stops and asks what a character just said (pick its meaning)
// or what the hero answers (pick the right line in the language). Wrong answers just show the right one.
function quizPool() {
  const out = [];
  for (const ch of Object.values(cache)) {
    if (!ch) continue;
    (ch.intro || []).concat(ch.finale || [], ...Object.values(ch.units || {}).map(sceneLines)).forEach(l => { if (l && l.t && l.tr && l.who !== 'narr') out.push(l); });
  }
  return out;
}
const hashS = t => { let h = 0; for (const c of String(t)) h = (h * 31 + c.codePointAt(0)) | 0; return (h >>> 0).toString(36); };
const shuffle = a => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
function quizPlan(lines, hero) {
  const pool = quizPool(), plan = {};
  let gap = 2;
  lines.forEach((ln, k) => {
    gap++;
    if (gap < 3 || !ln || ln.who === 'narr' || !ln.t || !L(ln.tr)) return;
    const reply = ln.who === hero;
    if (reply && (!lines[k - 1] || lines[k - 1].who === hero || lines[k - 1].who === 'narr')) return;
    const near = (arr, key) => arr.filter((x, j, all) => all.findIndex(y => key(y) === key(x)) === j)
      .sort((a, b) => Math.abs(key(a).length - key(ln).length) - Math.abs(key(b).length - key(ln).length)).slice(0, 10);
    const others = reply ? near(pool.filter(x => x.who === hero && x.t !== ln.t), x => x.t) : near(pool.filter(x => L(x.tr) !== L(ln.tr)), x => L(x.tr));
    if (others.length < 2) return;
    plan[k] = { reply, opts: shuffle([ln, ...shuffle(others).slice(0, 2)]) };
    gap = 0;
  });
  return plan;
}

function player(lines, opts = {}) {
  const m = META || {};
  let i = 0, queue = lines.slice(), chose = false;
  const plan = opts.quiz === false ? {} : quizPlan(lines, m.hero), done = {};
  let qOk = 0, qN = 0;
  const show = () => {
    if (i >= queue.length) {
      if (opts.choice && !chose) return choiceView();
      stop();
      if (qN) toast(`💬 ${qOk}/${qN} ${tx('understood')}`);
      return opts.after && opts.after();
    }
    if (plan[i] && queue[i] === lines[i] && !(i in done)) return quizView();
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
        <div class="sp-tr ${S.storyTr === false && !(i in done) ? 'hide' : ''}">${esc(L(ln.tr))}</div>
        <div class="sp-ctrl"><button class="chip" onclick="event.stopPropagation();window.__stSay()">🔊</button>
          <button class="chip ${S.storyTr === false ? '' : 'on'}" onclick="event.stopPropagation();window.__stTr()">🌐 ${tx('tr')}</button>
          <span class="grow"></span><span class="muted small">${tx('next')} ▸</span></div>
      </div></div>`;
    speakAs(ln.who, ln.t);
  };
  const quizView = () => {
    const ln = queue[i], q = plan[i], who = (m.cast || {})[ln.who] || {}, prev = queue[i - 1], pw = prev && (m.cast || {})[prev.who] || {};
    const asker = q.reply ? prev : ln, aw = q.reply ? pw : who;
    root.innerHTML = `<div class="sp-scene" data-sm>
      <div class="sp-top"><span class="chip sp-chip">${tx('mode')}</span><span class="flex gap-8">${lifeChip()}${pyToggle()}<button class="chip sp-chip" onclick="window.__stSkip()">${tx('skip')} ⏭</button></span></div>
      <div class="sp-stage"><div class="sp-moon" style="--a:${accent()[0]}"></div>${hills()}${portrait(asker.who, aw, false)}</div>
      <div class="sp-prog"><i style="width:${Math.round(100 * (i + 1) / queue.length)}%"></i></div>
      <div class="sp-box">
        <div class="sp-name" style="background:${aw.color || 'var(--accent)'}">${esc(L(aw.n))}</div>
        <div class="sp-line" lang="${LG}">${T(asker.t, asker.s)}</div>
        ${q.reply && S.storyTr !== false ? `<div class="sp-tr">${esc(L(asker.tr))}</div>` : ''}
        <div class="sp-ctrl"><button class="chip" onclick="window.__stSay()">🔊</button><span class="grow"></span><b class="sp-q">💬 ${q.reply ? tx('whatReply') : tx('whatSaid').replace('{n}', esc(L(aw.n)))}</b></div>
      </div>
      <div class="sp-opts">${q.opts.map((o, k) => `<button class="card sp-opt sp-qo" onclick="window.__stQ(${k})">${q.reply ? `<div class="sp-line" lang="${LG}">${T(o.t, o.s)}</div>` : `<div class="sp-mean">${esc(L(o.tr))}</div>`}</button>`).join('')}</div></div>`;
    speakAs(asker.who, asker.t);
  };
  window.__stQ = k => {
    const q = plan[i], ln = queue[i]; if (!q || i in done) return;
    const ok = q.opts[k] === ln, btns = root.querySelectorAll('.sp-qo');
    done[i] = ok; qN++; if (ok) qOk++;
    btns.forEach((b, j) => { b.disabled = true; if (q.opts[j] === ln) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); });
    const gem = ok && readFact(`${CFG.id}-q-${hashS(ln.who + '|' + ln.t)}`);
    ok ? cheer(btns[k]) : miss(btns[k]);
    if (gem) setTimeout(() => { sfx('gem'); floatUp('+3 💎', btns[k]); }, 250);
    const box = root.querySelector('.sp-box');
    box.insertAdjacentHTML('beforeend', `<div class="sp-verdict ${ok ? 'ok' : 'bad'}">${ok ? `✓ ${tx('qGood')}${gem ? ' · 💎 +3' : ''}` : `${tx('qBad')} <b>${q.reply ? '' : esc(L(ln.tr))}</b>`}</div>`);
    if (q.reply || !ok) speakAs(ln.who, ln.t);
    setTimeout(() => { if (done[i] === ok && root.querySelector('.sp-qo')) show(); }, ok ? 1300 : 2600);
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
  window.__stSkip = () => { i = queue.length; qN = 0; show(); };
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
body.sm-on #lang-switch,body.sm-on .bottomnav{display:none !important}
body.sm-3d #sm-sky{display:none}
.sp-q{font-size:13px;color:#ffd36b}
.wg-scene{padding:12px 16px 30px}.wg-host{padding:0 14px}.wg-scene .sp-top{margin-bottom:10px}
.fr-img{width:96px;height:96px;border-radius:50%;object-fit:cover;object-position:50% 12%;border:4px solid #ffd36b;display:block;margin:0 auto 6px;background:#24407a}
.fr-play{width:100%;font-size:17px;background:linear-gradient(90deg,#ff4d6d,#ffb703) !important;border:0 !important;color:#fff !important;box-shadow:0 6px 18px rgba(255,120,80,.45);margin-top:6px}
body.sm-on [data-sm] .w3-card .fr-rv{width:100%;margin-top:4px;color:#2b2340 !important;background:#f3eadb !important;border:1px solid #e0d3bd !important}
.wg-end{text-align:center;padding:16px 4px;color:#fff}.wg-end .btn{width:100%}
.wg-stars{font-size:54px;letter-spacing:6px;line-height:1;margin:6px 0}.wg-stars span{color:rgba(255,255,255,.18);display:inline-block}
.wg-stars span.on{color:#ffd36b;text-shadow:0 0 18px rgba(255,211,107,.8);animation:wgStar .5s backwards cubic-bezier(.3,1.6,.5,1)}
@keyframes wgStar{from{transform:scale(0) rotate(-90deg)}}
.wg-big{font-size:52px;font-weight:900;background:linear-gradient(90deg,#ffd36b,#ff8fab,#b388ff,#4cc9f0);-webkit-background-clip:text;background-clip:text;color:transparent}
.wg-rec{display:inline-block;background:linear-gradient(90deg,#ffe08a,#ffc96b);color:#3b2a00;font-weight:800;border-radius:999px;padding:4px 14px;margin-bottom:4px}
.wg-row{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 0}.wg-row span{background:rgba(255,255,255,.1);border-radius:999px;padding:5px 12px;font-weight:700;font-size:14px}
.tc-opt,.sp-qo{border-bottom-width:4px !important}
.tc-opt:nth-child(4n+1),.sp-qo:nth-child(4n+1){background:linear-gradient(135deg,rgba(255,77,109,.30),rgba(255,143,171,.12)) !important;border-color:rgba(255,143,171,.6) !important}
.tc-opt:nth-child(4n+2),.sp-qo:nth-child(4n+2){background:linear-gradient(135deg,rgba(255,183,3,.30),rgba(255,214,10,.12)) !important;border-color:rgba(255,200,60,.6) !important}
.tc-opt:nth-child(4n+3),.sp-qo:nth-child(4n+3){background:linear-gradient(135deg,rgba(61,220,151,.28),rgba(6,214,160,.1)) !important;border-color:rgba(61,220,151,.6) !important}
.tc-opt:nth-child(4n+4),.sp-qo:nth-child(4n+4){background:linear-gradient(135deg,rgba(76,201,240,.3),rgba(179,136,255,.14)) !important;border-color:rgba(120,190,255,.6) !important}
.tc-opt:active,.sp-qo:active{transform:translateY(2px) scale(.99)}
.sp-opts .sp-qo.ok{outline:3px solid #3ddc97;background:linear-gradient(135deg,rgba(61,220,151,.55),rgba(61,220,151,.25)) !important;box-shadow:0 0 24px rgba(61,220,151,.5)}.sp-opts .sp-qo.bad{outline:3px solid #ff6b81;background:rgba(255,107,129,.3) !important;opacity:.85}
.lv-row{display:flex;align-items:center;gap:2px;border:0;cursor:pointer;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:3px 10px 3px 6px;font-size:17px;line-height:1}
.lv-row span.off,.lv-big span.off{filter:grayscale(1);opacity:.35}.lv-row small{font-size:11px;color:#fff;margin-left:6px;font-weight:700}
.lv-big{font-size:34px;letter-spacing:2px}
.lv-chip{white-space:nowrap;display:inline-flex;align-items:center;gap:4px}
.lv-bonus{margin:8px auto 0;text-align:center;font-weight:800;font-size:15px;color:#3b2a00;background:linear-gradient(90deg,#ffe08a,#ffc96b);border-radius:12px;padding:8px 12px;box-shadow:0 4px 14px rgba(255,190,80,.4)}
.lv-bonus.off{background:rgba(255,255,255,.12);color:#dfe6ff;box-shadow:none;font-weight:600;font-size:13px}
.tc-res.ok{background:linear-gradient(90deg,#3ddc97,#4cc9f0);-webkit-background-clip:text;background-clip:text;color:transparent !important;font-size:26px !important;font-weight:900 !important}
.sp-mean{font-size:15px;line-height:1.35;text-align:left}

.sp-verdict{margin-top:8px;font-size:13px;font-weight:700;padding:6px 10px;border-radius:10px}.sp-verdict.ok{background:rgba(62,207,122,.18);color:#bff5d6}.sp-verdict.bad{background:rgba(255,107,107,.18);color:#ffd0d0}
.mp{position:relative;margin:10px -16px 0}
.mp-top{position:sticky;top:0;z-index:4;background:linear-gradient(#0f1d42 90%,rgba(15,29,66,0));padding-bottom:4px}
.mp-hud{display:flex;justify-content:space-between;align-items:center;padding:10px 12px 6px}
.mp-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}
.mp-chips .chip{font-size:12px;padding:5px 10px}
.mp-chips .chip,.mp-chips .chip *{background:rgba(255,255,255,.12) !important;color:#fff !important;border-color:rgba(255,255,255,.28) !important}
.mp-fest[hidden]{display:none}.mp-fest{display:block;width:calc(100% - 24px);margin:0 12px 10px;text-align:left;border:0;border-radius:14px;padding:9px 12px;font:650 13px system-ui;color:#3b2a00;background:linear-gradient(90deg,#ffe08a,#ffc96b);box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}
.mp-scroll{position:relative;border-radius:26px 26px 0 0;overflow:hidden;box-shadow:0 -6px 30px rgba(0,0,0,.35)}
.mp-svg{display:block;width:100%;height:auto}
.mp-svg .mp-town,.mp-svg .mp-lbl,.mp-svg .mp-friend,.mp-svg .mp-sign,.mp-svg .mp-chest,.mp-svg .mp-temple,.mp-svg .mp-me{cursor:pointer}
.mp-svg .mp-town.lock{cursor:default}
.mp-glow{animation:mpGlow 1.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes mpGlow{50%{opacity:.35;transform:scale(1.15)}}
.mp-me{animation:mpBob 1.6s ease-in-out infinite}
@keyframes mpBob{50%{transform:translateY(-5px)}}
.mp-friend .mp-bub{animation:mpBob 2.2s ease-in-out infinite}
.mp-chest.ready{animation:mpWig 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
@keyframes mpWig{0%,80%,100%{transform:rotate(0)}85%{transform:rotate(-6deg)}90%{transform:rotate(6deg)}95%{transform:rotate(-3deg)}}
.mp-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}
.mp-fx i{position:absolute;top:-20px;display:block;animation:fxFall linear infinite}
.fx-petal{width:9px;height:6px;border-radius:70% 0 70% 0;background:#ffc2d9;opacity:.9}
.fx-leaf{width:10px;height:7px;border-radius:80% 0 80% 0;background:#e58a3a;opacity:.9}
.fx-snow{width:5px;height:5px;border-radius:50%;background:#fff;opacity:.9;box-shadow:0 0 4px rgba(255,255,255,.8)}
.fx-dust{width:3px;height:3px;border-radius:50%;background:#fff3d0;opacity:.5}
.fx-fly{width:4px;height:4px;border-radius:50%;background:#fff6a0;box-shadow:0 0 8px 3px rgba(255,240,120,.7);animation-name:fxFly !important}
.fx-bfly{width:12px;height:9px;background:radial-gradient(circle at 30% 50%,#ffd35a 45%,transparent 50%),radial-gradient(circle at 70% 50%,#ffb347 45%,transparent 50%);animation-name:fxBfly !important}
@keyframes fxFall{0%{transform:translate(0,0) rotate(0) scale(var(--s))}50%{transform:translate(30px,50vh) rotate(200deg) scale(var(--s))}100%{transform:translate(-10px,100vh) rotate(400deg) scale(var(--s))}}
@keyframes fxFly{0%{transform:translate(0,30vh);opacity:0}20%{opacity:1}50%{transform:translate(40px,45vh)}80%{opacity:1}100%{transform:translate(-20px,60vh);opacity:0}}
@keyframes fxBfly{0%{transform:translate(0,25vh) scaleX(1)}25%{transform:translate(60px,30vh) scaleX(.3)}50%{transform:translate(120px,22vh) scaleX(1)}75%{transform:translate(60px,35vh) scaleX(.3)}100%{transform:translate(0,25vh) scaleX(1)}}
.mp-hint{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);z-index:20;opacity:0;pointer-events:none;transition:all .25s;background:rgba(10,16,40,.85);color:#fff;font-size:13px;white-space:normal;max-width:86vw;text-align:center}
.mp-hint.show{opacity:1;transform:translate(-50%,0)}.mp-hint.on{background:rgba(160,60,60,.92)}
.mp .w3-modal{position:fixed}
.mp-av,.sh-av{position:relative;display:inline-block}
.mp-av img{width:44px;height:44px;border-radius:50%;object-fit:cover;object-position:50% 12%;border:3px solid var(--c);background:#24407a;display:block}
.mp-av i,.sh-av i{position:absolute;left:-6px;top:-10px;font-style:normal;font-size:18px}.mp-av u,.sh-av u{position:absolute;right:-8px;bottom:-4px;text-decoration:none;font-size:16px}
.sh-stage{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:200px;color:#fff}
.sh-av img{width:120px;height:120px;border-radius:50%;object-fit:cover;object-position:50% 12%;border:6px solid var(--c);background:#24407a;display:block;box-shadow:0 0 30px rgba(255,211,107,.35)}
.sh-av i{font-size:40px;left:-10px;top:-22px}.sh-av u{font-size:38px;right:-24px;bottom:-6px}
.sh-av.cape-red img{box-shadow:0 0 0 10px #c0392b,0 0 30px rgba(255,211,107,.35)}.sh-av.cape-blue img{box-shadow:0 0 0 10px #2e6fb5,0 0 30px rgba(255,211,107,.35)}
.w3-card{max-height:86%;overflow:auto;text-align:left}.w3-card>.btn{width:100%}
.w3-svg{width:100%;height:auto;border-radius:14px;background:#cfe6f5;margin:6px 0}
.w3-svg .o path{fill:#ece5d6;stroke:#c9bfa9;stroke-width:1}.w3-svg .m path{fill:#bfe0a8;stroke:#6f9a5a;stroke-width:1.5}
.w3-dot{cursor:pointer}.w3-dot circle{fill:#9aa1b3;stroke:#fff;stroke-width:3}.w3-dot.done circle{fill:#e6b84a}.w3-dot.cur circle{fill:#3d7dff;animation:w3p 1.4s infinite}
.w3-dot text{font:700 18px system-ui;fill:#2b2340;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:4px}
@keyframes w3p{50%{stroke-width:9px}}
.w3-far{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}body.sm-on [data-sm] .w3-card .chip,body.sm-on [data-sm] .w3-card .chip *{background:#f1e8d8 !important;color:#2b2340 !important;border-color:#e0d3bd !important}.w3-fig summary{text-align:left}
.w3-fig{border-top:1px solid #eadfcd;padding:8px 0}.w3-fig summary{cursor:pointer}.w3-fig p{margin:6px 0 0}
.w3-modal{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(8,12,30,.45);padding:18px}.w3-modal[hidden]{display:none}
.w3-card{max-width:340px;background:#fffaf2;color:#2b2340;border-radius:22px;padding:18px 18px 14px;box-shadow:0 16px 40px rgba(0,0,0,.35);text-align:center}
.w3-card h3{margin:6px 0 8px;font-size:20px}.w3-card p{margin:0 0 6px;line-height:1.45;text-align:left}
.w3-k{font-weight:800;color:#9c7842;font-size:13px;letter-spacing:.04em}.w3-fact{font-size:16px}.w3-medal{font-size:64px;line-height:1}
body.sm-on [data-sm] .w3-card .muted{color:#8a7c6c !important}
.w3-me{display:flex;gap:8px;align-items:center;background:rgba(15,29,66,.62);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:4px 12px 4px 4px;color:#fff}
.w3-me img{width:44px;height:44px;border-radius:50%;object-fit:cover;object-position:50% 12%;border:2px solid #ffd36b;background:#24407a}
.w3-me b{display:block;font-size:13px}.w3-me span{font-size:12px;opacity:.95}.w3-me i{font-style:normal}
.w3-shop,.w3-shop *{background:rgba(15,29,66,.62) !important;color:#fff !important}
.sm-hint.gold{background:rgba(180,130,20,.85)}
.sh-stage{height:260px;margin:4px -16px 0;background:radial-gradient(60% 60% at 50% 60%,rgba(255,211,107,.18),transparent)}
.sh-why{color:#c9d3f0;text-align:center;margin:0 8px 6px}
.sh-h{margin:14px 4px 6px;font-weight:800;color:#ffd98a;font-size:13px;letter-spacing:.05em;text-transform:uppercase}
.sh-item{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:8px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#eef2ff}
.sh-item.on{border-color:#ffd36b;background:rgba(255,211,107,.12)}
.sh-ic{font-size:22px}.sh-n{flex:1;font-size:15px}
.btn-sm{padding:7px 12px !important;font-size:13px !important;min-height:0 !important}
.sm-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:2;font-size:12px;color:#dfe6ff;background:rgba(10,16,40,.55);padding:6px 12px;border-radius:999px;backdrop-filter:blur(6px);white-space:nowrap;transition:background .2s}
.sm-hint.on{background:rgba(160,60,60,.75)}
.sm-2d{position:absolute;right:12px;top:12px;z-index:2}
body.sm-on{background:radial-gradient(120% 80% at 50% -10%,#21376b 0%,#0f1d42 45%,#081128 100%) fixed !important;color:#eef2ff}
body.sm-on #app,body.sm-on main,body.sm-on .page{background:transparent !important}
#sm-sky{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:52}
[data-sm]{position:relative;z-index:1}
body.sm-on .bottom-nav,body.sm-on nav{z-index:20}
[data-sm].sm{padding-bottom:28px}.sm-top{display:flex;justify-content:space-between;align-items:center;padding:14px 0 8px}
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
