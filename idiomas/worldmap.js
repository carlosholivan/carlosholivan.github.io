// The world map of the language picker: every language lights up the countries where it is spoken, with a short card
// on why it is worth learning. Data: world.json (Natural Earth 110m outlines, made with world-atlas + d3-geo).

export const INFO = {
  english: { color: '#4c8dff', glyph: 'En', name: 'Inglés', native: 'English', speakers: '≈ 1.500 millones',
    why: 'La lengua de internet, la ciencia y los negocios: abre puertas en casi cualquier trabajo y te deja ver series y leer la mitad de la web sin traducción.',
    facts: ['🌍 Oficial en más de 50 países', '💼 Idioma nº 1 de las empresas', '🎬 Cine, música y videojuegos'] },
  chino: { color: '#ff4d4d', glyph: '中', name: 'Chino mandarín', native: '中文', speakers: '≈ 1.100 millones',
    why: 'La lengua materna más hablada del mundo. Pocos extranjeros la dominan, así que destaca en cualquier CV, y sus caracteres cuentan historias de 3.000 años.',
    facts: ['🗣️ Nº 1 en hablantes nativos', '🎵 4 tonos que cambian el significado', '🏮 Puerta a China, Taiwán y Singapur'] },
  espanol: { color: '#ffb703', glyph: 'Es', name: 'Español', native: 'Español', speakers: '≈ 600 millones',
    why: 'Segunda lengua materna del mundo y oficial en 21 países: de Madrid a la Patagonia, con una literatura, una música y una comida que se disfrutan el doble entendiéndolas.',
    facts: ['🌎 21 países', '📈 Uno de los idiomas que más se estudian', '💃 Se escribe como se pronuncia'] },
  francais: { color: '#b388ff', glyph: 'Fr', name: 'Francés', native: 'Français', speakers: '≈ 320 millones',
    why: 'Se habla en los cinco continentes y es lengua oficial de la ONU, la UE y los Juegos Olímpicos. Además, la mayoría de sus hablantes futuros estarán en África.',
    facts: ['🌍 Unos 29 países', '🥐 Cocina, moda y arte', '🏛️ Lengua de la diplomacia'] },
  arabic: { color: '#2ec4a6', glyph: 'ع', name: 'Árabe', native: 'العربية', speakers: '≈ 400 millones',
    why: 'Une más de 20 países desde el Atlántico hasta el golfo Pérsico. Su alfabeto se escribe de derecha a izquierda y está detrás de muchas palabras del español: aceite, almohada, ojalá.',
    facts: ['🕌 Unos 22 países', '🇺🇳 Uno de los 6 idiomas de la ONU', '✍️ Caligrafía milenaria'] },
  deutsch: { color: '#ff8a3d', glyph: 'De', name: 'Alemán', native: 'Deutsch', speakers: '≈ 130 millones',
    why: 'La lengua materna más hablada de la Unión Europea y la de su mayor economía: ingeniería, ciencia, música clásica y universidades públicas casi gratuitas.',
    facts: ['🇪🇺 Nº 1 en la UE', '🔧 Industria y empleo', '🎓 Becas y universidades públicas'] },
  nihongo: { color: '#ff6fa8', glyph: '日', name: 'Japonés', native: '日本語', speakers: '≈ 125 millones',
    why: 'Anime, manga, videojuegos, cocina y una cultura única. Tres escrituras (hiragana, katakana y kanji) que se aprenden paso a paso, y una gramática más lógica de lo que parece.',
    facts: ['🎌 Cultura pop mundial', '🍣 Tradición y tecnología', '✏️ 3 escrituras'] },
};

let WORLD = null;
const load = async () => WORLD || (WORLD = await fetch(new URL('./world.json', import.meta.url)).then(r => r.json()));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// el: container. opt: { ids: [app ids shown], selected: Set, focus: id|null, onToggle(id), onFocus(id) }
export async function worldMap(el, opt) {
  const w = await load();
  const ids = opt.ids;
  const count = id => w.c.filter(c => c.l.includes(id)).length + w.dots.filter(d => d.l.includes(id)).length;
  const fill = c => {
    const f = opt.focus;
    if (f) return c.l.includes(f) ? INFO[f].color : '#2a3966';
    const k = ids.includes(c.p) ? c.p : c.l.find(x => ids.includes(x));
    return k ? INFO[k].color : '#2a3966';
  };
  const op = c => opt.focus ? 1 : (opt.selected.has(c.p) || c.l.some(x => opt.selected.has(x)) ? .95 : .55);
  const grid = [-60, -30, 0, 30, 60].map(k => `<path d="M0 ${w.h / 2 - k * 3.9} H${w.w}" stroke="rgba(255,255,255,.05)" stroke-width="1"/>`).join('');
  const f = opt.focus, I = f && INFO[f];
  el.innerHTML = `<div class="wm ${f ? 'focus' : ''}">
    <svg viewBox="0 0 ${w.w} ${w.h}" class="wm-svg" role="img" aria-label="Mapa de idiomas">
      <defs><radialGradient id="wmSea" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#173068"/><stop offset="1" stop-color="#0b1838"/></radialGradient>
        <filter id="wmGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect width="${w.w}" height="${w.h}" fill="url(#wmSea)"/>${grid}
      <g class="wm-land">${w.c.map((c, k) => `<path d="${c.d}" fill="${fill(c)}" fill-opacity="${op(c)}" data-k="${k}" class="${f && c.l.includes(f) ? 'on' : ''}"><title>${esc(c.n)}</title></path>`).join('')}</g>
      ${f ? `<g filter="url(#wmGlow)" opacity=".55" pointer-events="none">${w.c.filter(c => c.l.includes(f)).map(c => `<path d="${c.d}" fill="${I.color}"/>`).join('')}</g>` : ''}
      ${w.dots.filter(d => !f || d.l.includes(f)).map(d => `<circle cx="${d.x}" cy="${d.y}" r="${f ? 6 : 4}" fill="${INFO[f || d.l[0]].color}" stroke="#fff" stroke-width="1.5"><title>${esc(d.n)}</title></circle>`).join('')}
    </svg>
    <div class="wm-card">${I ? `
      <div class="wm-h"><span class="wm-g" style="background:${I.color}">${esc(I.glyph)}</span><div><b>${esc(I.name)}</b><small>${esc(I.native)}</small></div>
        <button class="wm-x" aria-label="Cerrar">✕</button></div>
      <div class="wm-stats"><span>🗣️ ${esc(I.speakers)} de hablantes</span><span>🗺️ ${count(f)} ${count(f) === 1 ? 'país' : 'países'}</span></div>
      <p>${esc(I.why)}</p>
      <div class="wm-facts">${I.facts.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      <button class="btn wm-add ${opt.selected.has(f) ? 'ghost' : ''}" style="${opt.selected.has(f) ? '' : `background:${I.color};border-color:${I.color}`}">${opt.selected.has(f) ? '✓ En tus idiomas · quitar' : '＋ Quiero aprenderlo'}</button>`
      : `<div class="wm-hint">👆 Toca un país o un idioma para descubrir dónde se habla y por qué aprenderlo.</div>
      <div class="wm-leg">${ids.map(id => `<button data-id="${id}"><i style="background:${INFO[id].color}"></i>${esc(INFO[id].name)}</button>`).join('')}</div>`}</div>
  </div>`;
  el.querySelectorAll('.wm-land path').forEach(p => p.onclick = () => {
    const c = w.c[+p.dataset.k], k = ids.includes(c.p) ? c.p : c.l.find(x => ids.includes(x));
    if (k) opt.onFocus(k === opt.focus ? null : k);
  });
  el.querySelectorAll('.wm-leg button').forEach(b => b.onclick = () => opt.onFocus(b.dataset.id));
  const x = el.querySelector('.wm-x'); if (x) x.onclick = () => opt.onFocus(null);
  const add = el.querySelector('.wm-add'); if (add) add.onclick = () => opt.onToggle(f);
  // zoom in on where the focused language is spoken (Japan is tiny on a world map)
  const svg = el.querySelector('.wm-svg');
  const to = (() => {
    if (!f) return [0, 0, w.w, w.h];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    svg.querySelectorAll('.wm-land path.on').forEach(p => { const b = p.getBBox(); if (b.width > 300) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
    if (x0 > x1) return [0, 0, w.w, w.h];
    let bw = Math.max(240, (x1 - x0) * 1.35), bh = Math.max(120, (y1 - y0) * 1.35);
    if (bw / bh > 2) bh = bw / 2; else bw = bh * 2;
    bw = Math.min(bw, w.w); bh = Math.min(bh, w.h);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [Math.max(0, Math.min(w.w - bw, cx - bw / 2)), Math.max(0, Math.min(w.h - bh, cy - bh / 2)), bw, bh];
  })();
  const from = (el.__vb || [0, 0, w.w, w.h]); el.__vb = to;
  const t0 = performance.now(), D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
  const step = now => { const k = D ? Math.min(1, (now - t0) / D) : 1, e = 1 - Math.pow(1 - k, 3);
    svg.setAttribute('viewBox', from.map((v, i) => v + (to[i] - v) * e).join(' ')); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

export const CSS = `
.wm{margin:14px 0 16px;border-radius:22px;overflow:hidden;background:#0b1838;box-shadow:0 10px 30px rgba(11,24,56,.25)}
.wm-svg{display:block;width:100%;height:auto}
.wm-land path{stroke:#0b1838;stroke-width:.7;cursor:pointer;transition:fill .35s,fill-opacity .35s}
.wm-land path:hover{fill-opacity:1}
.wm.focus .wm-land path.on{animation:wmIn .6s ease-out}
@keyframes wmIn{from{fill-opacity:.2}}
.wm-card{padding:14px 16px 16px;color:#eef2ff;background:linear-gradient(#0f1f48,#0b1838)}
.wm-card p{margin:8px 0 10px;line-height:1.5;font-size:14.5px;color:#dfe6ff}
.wm-h{display:flex;align-items:center;gap:10px}.wm-h b{display:block;font-size:19px}.wm-h small{opacity:.75}
.wm-g{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-weight:800;font-size:20px;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.3)}
.wm-x{margin-left:auto;background:rgba(255,255,255,.1);border:0;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer}
.wm-stats{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:13px;font-weight:700;color:#ffd36b}
.wm-facts{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.wm-facts span{font-size:12.5px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:4px 10px}
.wm-add{width:100%;color:#fff}.wm-add.ghost{background:transparent;color:#dfe6ff;border-color:rgba(255,255,255,.3)}
.wm-hint{font-size:14px;color:#dfe6ff;margin-bottom:10px}
.wm-leg{display:flex;flex-wrap:wrap;gap:6px}.wm-leg button{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:999px;padding:5px 11px;font:600 13px system-ui;cursor:pointer}
.wm-leg i{width:10px;height:10px;border-radius:50%;display:inline-block}`;
