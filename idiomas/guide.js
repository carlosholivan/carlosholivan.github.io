// The welcome guide of the language hub: a few swipeable cards shown once, before choosing languages, about
// everything the apps do (two modes, the story map, friends and games, lives, culture, the AI tutor, settings).
// Shown again from the "Guía" link. Spanish, or English when the browser is not in Spanish.
const EN = !/^es/i.test(navigator.language || 'es');
const C = EN ? [
  ['🍡', 'Welcome to Mochigo', 'Learn <b>Chinese, Japanese, Arabic, Spanish, English, French and German</b>, from the first word to an advanced level. Free, on the web and on your phone.'],
  ['📖🗺️', 'Two ways to learn', '<b>Study mode</b>: lessons with grammar, vocabulary, exercises, dictations, conjugation and readings.<br><b>Story mode</b>: the same lessons lived as a story, with characters who talk to you in their own voice.'],
  ['🏯', 'Your region’s map', 'Every level is a region of the country: towns along a road (one per episode) and a <b>temple</b> at the end where you win the level’s medal. It follows your clock (day and night) and the seasons.'],
  ['👧🧒', 'Friends who help you', 'Your friends wait along the road. Tap them to <b>review</b> the words you are about to forget, or to play: <b>word pairs</b>, <b>write characters</b> stroke by stroke and <b>verbs</b>.'],
  ['💬', 'Understanding is the game', 'In the scenes, every few lines they ask what someone said, or what you answer. Words with no translation (onigiri, souq, tapas…) are <b>underlined</b> with a short explanation.'],
  ['🍙🥨🥐', 'Lives with local food', 'A mistake costs a life (onigiri, pretzel, croissant…). Without lives you cannot start something new, but you can always <b>review to earn them back</b>, refill them with 💎, or keep using everything that is free.'],
  ['🔥💎', 'A little every day', 'Your streak, a daily chest, gems for the shop, reminders, and notices of the country’s festivals and their story.'],
  ['✨', 'AI tutor and settings', 'Got something wrong? Tap <b>«Why?»</b> and the AI explains it (with your free Gemini key). In <b>Settings</b>: sounds, colours, the starry-night theme and the voice speed.'],
  ['🌍', 'Choose your languages', 'On the next screen you will see a world map: tap a language to see where it is spoken and why it is worth learning.'],
] : [
  ['🍡', 'Bienvenido a Mochigo', 'Aprende <b>chino, japonés, árabe, español, inglés, francés y alemán</b>, desde la primera palabra hasta un nivel avanzado. Gratis, en la web y en el móvil.'],
  ['📖🗺️', 'Dos formas de aprender', '<b>Modo estudio</b>: lecciones con gramática, vocabulario, ejercicios, dictados, conjugación y lecturas.<br><b>Modo historia</b>: las mismas lecciones vividas como una historia, con personajes que te hablan con su propia voz.'],
  ['🏯', 'El mapa de tu región', 'Cada nivel es una región del país: pueblos a lo largo de un camino (uno por episodio) y un <b>templo</b> al final donde ganas la medalla del nivel. Sigue tu reloj (día y noche) y las estaciones.'],
  ['👧🧒', 'Amigos que te ayudan', 'Tus amigos te esperan junto al camino. Tócalos para <b>repasar</b> las palabras que se te van a olvidar o para jugar: <b>parejas de palabras</b>, <b>escribir caracteres</b> trazo a trazo y <b>verbos</b>.'],
  ['💬', 'Entender es el juego', 'En las escenas, cada pocas frases te preguntan qué ha dicho alguien o qué le respondes. Las palabras sin traducción (onigiri, zoco, tapas…) salen <b>subrayadas</b> con una breve explicación.'],
  ['🍙🥨🥐', 'Vidas con comida del país', 'Cada fallo cuesta una vida (onigiri, pretzel, cruasán…). Sin vidas no puedes empezar algo nuevo, pero siempre puedes <b>repasar para recuperarlas</b>, rellenarlas con 💎 o seguir con todo lo gratis.'],
  ['🔥💎', 'Un poco cada día', 'Tu racha, un cofre diario, gemas para la tienda, recordatorios y avisos de las festividades del país y su historia.'],
  ['✨', 'Tutor IA y ajustes', '¿Has fallado? Toca <b>«¿Por qué?»</b> y la IA te lo explica (con tu clave gratuita de Gemini). En <b>Ajustes</b>: sonidos, colores, el tema noche estrellada y la velocidad de la voz.'],
  ['🌍', 'Elige tus idiomas', 'En la siguiente pantalla verás un mapa del mundo: toca un idioma para ver dónde se habla y por qué merece la pena aprenderlo.'],
];
const UI = EN ? { next: 'Next', skip: 'Skip', go: 'Let’s start!' } : { next: 'Siguiente', skip: 'Saltar', go: '¡Empezar!' };
export const guideSeen = () => { try { return localStorage.getItem('idiomas_guide') === '1'; } catch (e) { return true; } };

export function showGuide(done) {
  let i = 0;
  if (!document.getElementById('gd-css')) document.head.insertAdjacentHTML('beforeend', `<style id="gd-css">${CSS}</style>`);
  const d = document.createElement('div'); d.className = 'gd';
  document.body.appendChild(d);
  const close = () => { try { localStorage.setItem('idiomas_guide', '1'); } catch (e) {} d.remove(); done && done(); };
  const draw = () => {
    const [ic, h, t] = C[i], last = i === C.length - 1;
    d.innerHTML = `<div class="gd-card" key="${i}"><div class="gd-ic">${ic}</div><h2>${h}</h2><p>${t}</p>
      <div class="gd-dots">${C.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="gd-btns">${last ? '' : `<button class="gd-skip">${UI.skip}</button>`}<button class="gd-next">${last ? UI.go : UI.next} ▶</button></div></div>`;
    d.querySelector('.gd-next').onclick = () => last ? close() : (i++, draw());
    const s = d.querySelector('.gd-skip'); if (s) s.onclick = close;
  };
  let x0 = null;
  d.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  d.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (dx < -50 && i < C.length - 1) { i++; draw(); } else if (dx > 50 && i > 0) { i--; draw(); } });
  draw();
}

const CSS = `
.gd{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;padding:20px;background:radial-gradient(120% 80% at 50% 0%,#2b4fa0,#0b1638 70%)}
.gd-card{width:100%;max-width:420px;color:#eef2ff;text-align:center;animation:gdIn .35s cubic-bezier(.2,1.2,.4,1)}
.gd-ic{font-size:64px;line-height:1.1;margin-bottom:10px;filter:drop-shadow(0 8px 20px rgba(0,0,0,.35))}
.gd h2{font-size:26px;margin:0 0 10px;color:#fff}.gd p{font-size:16px;line-height:1.55;color:#dfe6ff;margin:0 0 22px;min-height:110px}.gd b{color:#ffd36b}
.gd-dots{display:flex;justify-content:center;gap:6px;margin-bottom:22px}.gd-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}.gd-dots i.on{width:22px;border-radius:5px;background:#ffd36b}
.gd-btns{display:flex;gap:10px;justify-content:center}
.gd-btns button{border:0;border-radius:999px;padding:13px 24px;font:700 16px system-ui;cursor:pointer}
.gd-next{background:linear-gradient(90deg,#ffd36b,#ffb347);color:#3b2a00;box-shadow:0 6px 18px rgba(255,190,80,.4)}.gd-skip{background:rgba(255,255,255,.1);color:#dfe6ff}
@keyframes gdIn{from{opacity:0;transform:translateY(16px) scale(.97)}}`;
