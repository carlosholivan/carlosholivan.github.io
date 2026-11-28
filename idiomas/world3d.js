// The story mode as a small open 3D world (shared by every language app). Each level is a region with one town
// per episode, joined by dirt roads, with lakes, hills and a ring of mountains; the level's temple stands at the
// far end and gives its medal (and opens the next region) once every episode is done. Light follows the learner's
// clock (day, sunset, night) and the land follows the season (cherry blossom, summer, autumn leaves, snow).
// Friends wait in the current town to review words with you, each town has an elder's stone with a "did you
// know?" about the country, and the daily chest sits by the current portal. Built in code (no model files).
import * as THREE from './vendor/three.module.min.js';
import { EffectComposer } from './vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/jsm/postprocessing/OutputPass.js';

const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
let ramp = null;
const toonRamp = () => {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  return ramp;
};
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra });
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...extra });
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1410, side: THREE.BackSide });
function inked(geo, mat, k = 1.05) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
  const o = new THREE.Mesh(geo, OUTLINE); o.scale.setScalar(k); g.add(o);
  return g;
}
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

// ---------- the hero: adventurer proportions (not chibi), coloured per language, wearing the shop items ----------
export const OUTFITS = {
  green: { top: '#3f8f3a', sleeve: '#3f8f3a', bottom: '#e8dcc0', accent: '#7a4a24' },
  crimson: { top: '#a8323a', sleeve: '#a8323a', bottom: '#3a2f2a', accent: '#e0b04a' },
  night: { top: '#1d2a5c', sleeve: '#1d2a5c', bottom: '#14182c', accent: '#ffd36b' },
  snow: { top: '#eef3ff', sleeve: '#cfe0ff', bottom: '#5a7fb0', accent: '#5a7fb0' },
};
export function hero(base = {}, wear = {}) {
  const c = { skin: '#f2c9a0', hair: '#2a1d17', top: '#5a7fb0', bottom: '#3b3a4a', boots: '#5a3a24', accent: '#c9503f', eye: '#1c1622', ...base, ...(OUTFITS[wear.outfit] || {}) };
  if (OUTFITS[wear.outfit]) c.skirt = null;
  const H = new THREE.Group(), body = new THREE.Group(); H.add(body);
  const head = new THREE.Group(); head.position.y = 2.05; body.add(head);
  head.add(inked(new THREE.SphereGeometry(.42, 24, 18), toon(c.skin)));
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), new THREE.MeshBasicMaterial({ color: c.eye }));
    e.scale.set(1, 1.3, .5); e.position.set(s * .15, .02, .39); head.add(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 5), new THREE.MeshBasicMaterial({ color: '#fff' })); hl.position.set(s * .15 + .018, .05, .425); head.add(hl);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), toon(c.skin)); ear.scale.set(.6, 1, .8); ear.position.set(s * .41, 0, 0); head.add(ear);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 6, 10, Math.PI), new THREE.MeshBasicMaterial({ color: '#5a2a2a' }));
  mouth.rotation.z = Math.PI; mouth.position.set(0, -.14, .4); head.add(mouth);
  const hairM = toon(c.hair);
  const capH = inked(new THREE.SphereGeometry(.45, 24, 18, 0, Math.PI * 2, 0, Math.PI * .55), hairM, 1.04);
  capH.position.y = .04; capH.rotation.x = -.22; head.add(capH);
  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = inked(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
  const style = c.style || 'short';
  if (style === 'topknot') add(head, new THREE.SphereGeometry(.14, 12, 10), hairM, 0, .48, -.1);
  if (style === 'messy') for (let i = 0; i < 6; i++) add(head, new THREE.ConeGeometry(.11, .3, 6), hairM, Math.cos(i) * .28, .38, Math.sin(i) * .2 - .08, -.3 + Math.sin(i) * .4, 0, Math.cos(i) * .5);
  if (style === 'curly') for (let i = 0; i < 9; i++) add(head, new THREE.SphereGeometry(.14, 10, 8), hairM, Math.cos(i * .7) * .38, .1 + Math.sin(i * 1.3) * .18, Math.sin(i * .7) * .34 - .12);
  if (style === 'braid') for (let i = 0; i < 5; i++) add(head, new THREE.SphereGeometry(.09 - i * .008, 10, 8), hairM, .2, -.25 - i * .14, -.3);
  if (style === 'beret' && !wear.hat) add(head, new THREE.CylinderGeometry(.42, .46, .11, 20), toon(c.hat || '#6b3d2a'), .04, .38, -.03, -.15, 0, .15);
  if (style === 'scarf' && !wear.hat) {
    const sc = inked(new THREE.SphereGeometry(.48, 24, 18, 0, Math.PI * 2, 0, Math.PI * .6), toon(c.hat || '#e8a33c'), 1.03);
    sc.rotation.x = -.35; head.add(sc);
    add(body, new THREE.ConeGeometry(.36, .6, 16), toon(c.hat || '#e8a33c'), 0, 1.6, -.2, .25);
  }
  if (wear.hat === 'cap') add(head, new THREE.ConeGeometry(.42, 1.05, 18), toon(c.top), 0, .42, -.34, -1.0);
  if (wear.hat === 'straw') { add(head, new THREE.CylinderGeometry(.75, .75, .05, 24), toon('#e0c27a'), 0, .34, 0); add(head, new THREE.CylinderGeometry(.32, .4, .26, 20), toon('#e0c27a'), 0, .46, 0); }
  if (wear.hat === 'flowers') for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), toon(['#ff8fab', '#ffd36b', '#ffffff', '#a0d8ff'][i % 4])); f.position.set(Math.cos(i * .8) * .4, .3, Math.sin(i * .8) * .4 - .04); head.add(f); }
  if (wear.hat === 'wool') { add(head, new THREE.SphereGeometry(.47, 20, 14, 0, Math.PI * 2, 0, Math.PI * .5), toon('#c94a3f'), 0, .08, 0, -.15); add(head, new THREE.SphereGeometry(.12, 10, 8), toon('#ffffff'), 0, .55, -.08); }
  if (c.strawHat && !wear.hat) add(body, new THREE.ConeGeometry(.5, .25, 20), toon('#d9b56a'), 0, 1.75, -.42, -1.35);
  const torso = inked(new THREE.CylinderGeometry(.27, .34, .78, 16), toon(c.top)); torso.position.y = 1.32; body.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(.33, .345, .1, 16), toon(c.accent)); belt.position.y = 1.0; body.add(belt);
  if (c.skirt) { const sk = inked(new THREE.CylinderGeometry(.33, .5, .55, 16), toon(c.skirt)); sk.position.y = .72; body.add(sk); }
  else { const tunic = inked(new THREE.CylinderGeometry(.34, .44, .32, 16), toon(c.top)); tunic.position.y = .82; body.add(tunic); }
  if (c.scarfNeck) { const nk = new THREE.Mesh(new THREE.TorusGeometry(.22, .07, 8, 16), toon(c.scarfNeck)); nk.rotation.x = Math.PI / 2; nk.position.y = 1.68; body.add(nk); }
  if (wear.cape) { const cp = inked(new THREE.ConeGeometry(.55, 1.25, 18, 1, true), toon(wear.cape === 'blue' ? '#2d5bb0' : '#b8323a', { side: THREE.DoubleSide }), 1.02); cp.position.set(0, 1.12, -.1); cp.scale.set(1, 1, .55); body.add(cp); }
  const limbs = {};
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * .36, 1.62, 0);
    const a = inked(new THREE.CapsuleGeometry(.085, .5, 4, 8), toon(c.sleeve || c.top)); a.position.y = -.3; arm.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), toon(c.skin)); hand.position.y = -.62; arm.add(hand);
    arm.rotation.z = s * .12; body.add(arm); limbs[s < 0 ? 'al' : 'ar'] = arm;
    const leg = new THREE.Group(); leg.position.set(s * .14, .78, 0);
    const l = inked(new THREE.CapsuleGeometry(.1, .5, 4, 8), toon(c.bottom)); l.position.y = -.33; leg.add(l);
    const boot = inked(new THREE.SphereGeometry(.13, 10, 8), toon(c.boots)); boot.scale.set(1, .75, 1.4); boot.position.set(0, -.7, .05); leg.add(boot);
    body.add(leg); limbs[s < 0 ? 'll' : 'lr'] = leg;
  }
  if (c.bag) { const bag = inked(new THREE.BoxGeometry(.3, .32, .14), toon(c.bag)); bag.position.set(0, 1.35, -.34); body.add(bag); }
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.45, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = .03; H.add(sh);
  H.userData = { body, limbs };
  H.scale.setScalar(.72);
  return H;
}

// ---------- companions (shop) ----------
function companion(kind) {
  const g = new THREE.Group();
  if (kind === 'fairy') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe6ff').multiplyScalar(2.4), toneMapped: false })));
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(.2, 16), new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: .6, side: THREE.DoubleSide })); w.position.x = s * .2; w.rotation.y = s * .6; g.add(w); g.userData[s < 0 ? 'wl' : 'wr'] = w; }
    g.add(new THREE.PointLight('#9fd8ff', 3, 4, 2));
    g.userData.fly = true;
  } else if (kind === 'mochi') {
    const b = inked(new THREE.SphereGeometry(.32, 20, 14), toon('#fbf1ec')); b.scale.set(1.15, .8, 1.1); b.position.y = .26; g.add(b);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#3a2a2a' })); e.position.set(s * .11, .3, .32); g.add(e);
      const bl = new THREE.Mesh(new THREE.CircleGeometry(.05, 10), new THREE.MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: .6 })); bl.position.set(s * .2, .24, .31); g.add(bl); }
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 6), toon('#4fae5c')); leaf.position.set(.06, .55, 0); leaf.rotation.z = -.6; g.add(leaf);
  } else if (kind === 'fox') {
    const fur = toon('#f5f7ff');
    const b = inked(new THREE.CapsuleGeometry(.17, .35, 4, 10), fur); b.rotation.x = Math.PI / 2; b.position.y = .3; g.add(b);
    const hd = inked(new THREE.SphereGeometry(.17, 14, 10), fur); hd.position.set(0, .47, .27); g.add(hd);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(.08, .18, 8), fur); sn.rotation.x = Math.PI / 2; sn.position.set(0, .44, .45); g.add(sn);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 6), fur); ear.position.set(s * .09, .64, .25); g.add(ear); }
    const tail = inked(new THREE.SphereGeometry(.15, 10, 8), fur); tail.scale.set(.8, .8, 1.8); tail.position.set(0, .4, -.38); g.add(tail);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// A slowly turning preview of the hero, for the shop.
export function previewHero(el, base, wear) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(el.clientWidth, el.clientHeight); r.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, .1, 50);
  cam.position.set(0, 1.05, 5.6); cam.lookAt(0, .82, 0);
  sc.add(new THREE.HemisphereLight('#ffffff', '#6a7a5a', 1.6));
  const d = new THREE.DirectionalLight('#fff3d6', 2); d.position.set(2, 4, 3); sc.add(d);
  const h = hero(base, wear); h.scale.setScalar(.95); sc.add(h);
  let pet = null;
  if (wear.pet) { pet = companion(wear.pet); pet.position.set(.85, 0, .3); sc.add(pet); }
  let a = 0, alive = true;
  const loop = () => {
    if (!alive || !el.isConnected) { r.dispose(); return; }
    a += .012; h.rotation.y = Math.sin(a) * .9;
    if (pet) pet.position.y = pet.userData.fly ? 1.4 + Math.sin(a * 4) * .1 : 0;
    r.render(sc, cam); requestAnimationFrame(loop);
  };
  loop();
  return () => { alive = false; r.domElement.remove(); };
}

// ---------- time of day and season, from the learner's own clock ----------
// Season by month (northern hemisphere, like the countries of every language here); light by hour.
export function sceneTime(d = new Date()) {
  const m = d.getMonth(), h = d.getHours() + d.getMinutes() / 60;
  const season = m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  const elev = Math.sin(((h - 6) / 12) * Math.PI);           // sun height: 0 at 6:00 and 18:00, 1 at noon
  return { season, hour: h, elev, night: elev < -.05 };
}
const SEASON = {
  spring: { grass: ['#6fb24a', '#8cc45a'], crowns: ['#ffb7d0', '#ffc9dc', '#7cc25a', '#f7a8c4'], pine: '#3f7a45', fall: '#ffc0d6' },
  summer: { grass: ['#4f9a35', '#6aaa40'], crowns: ['#3f8f32', '#5aa03a', '#2f7a2c'], pine: '#2f5f3a', fall: null },
  autumn: { grass: ['#9a9a3a', '#b0943e'], crowns: ['#d9772b', '#c9402e', '#e0b040', '#b8562a'], pine: '#3a5a32', fall: '#e0852e' },
  winter: { grass: ['#e9eef7', '#dfe7f3'], crowns: ['#f4f7ff', '#e8eef8'], pine: '#2f5546', fall: '#ffffff' },
};
const DESERT = { grass: ['#d9b97a', '#e3c78d'], crowns: ['#4f8f3a', '#6aa040'], pine: '#4f8f3a' };

// ---------- the world: one open region per level ----------
// Towns (one per episode) are spread over the region and joined by dirt roads; the level's temple stands at the
// far end and gives its medal once every episode is done. Tap the ground to walk there, drag sideways to turn
// the camera; tap a town's portal, a friend, an elder's stone, the chest or the temple to use it.
export function mountWorld(el, opt) {
  const { nodes, accent = ['#7fb4ff', '#6fbf73'], heroStyle, onOpen, wear = {} } = opt;
  const arch = opt.arch || 'europe', desert = opt.biome === 'desert';
  const T0 = opt.time || sceneTime(), SEA = desert ? { ...SEASON[T0.season], ...DESERT, fall: T0.season === 'winter' ? null : null } : SEASON[T0.season];
  const W = () => el.clientWidth || 360, Hh = () => el.clientHeight || 480;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(W(), Hh());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  el.appendChild(renderer.domElement);
  document.body.classList.add('sm-3d');
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, W() / Hh(), .1, 400);

  // ----- light: blend night → day by the sun's height, warm near sunrise and sunset -----
  const day = Math.min(1, Math.max(0, (T0.elev + .12) / .4)), dusk = Math.max(0, 1 - Math.abs(T0.elev) * 4) * (T0.elev > -.25 ? 1 : 0);
  const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
  const skyTop = mix('#050b24', '#3f86d8', day).lerp(new THREE.Color('#4a3f8a'), dusk * .5);
  const skyHor = mix('#22306a', '#d9ecf7', day).lerp(new THREE.Color('#ffae7a'), dusk * .75);
  const fogC = mix('#141d40', '#cfe3f2', day).lerp(new THREE.Color('#e8b99a'), dusk * .5);
  scene.fog = new THREE.Fog(fogC, 70, 220);
  renderer.toneMappingExposure = 1.05 + (1 - day) * .15;
  const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: skyTop }, hor: { value: skyHor } },
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top, hor; varying vec3 v; void main(){ gl_FragColor = vec4(mix(hor, top, smoothstep(-.02,.55,v.y)),1.); }' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyM); scene.add(sky);
  if (day < .6) {        // stars and moon
    const sp = [], R0 = rng(7);
    for (let k = 0; k < 1200; k++) { const u2 = R0(), a = R0() * 6.283, y = u2 * .95 + .05, r = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * r * 280, y * 280, Math.sin(a) * r * 280); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sky.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.1, fog: false, transparent: true, opacity: .9 * (1 - day) })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff4d6', fog: false, toneMapped: false }));
    moon.position.set(-90, 120, -170); sky.add(moon);
  }
  if (day > .2) {        // clouds
    const cloudM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: .85 * day, fog: false });
    const Rc = rng(5);
    for (let k = 0; k < 16; k++) {
      const cg = new THREE.Group();
      for (let j = 0; j < 5; j++) { const pf = new THREE.Mesh(new THREE.SphereGeometry(6 + Rc() * 6, 12, 8), cloudM); pf.position.set(j * 8 - 16, Rc() * 4, Rc() * 6); pf.scale.y = .5; cg.add(pf); }
      const a = Rc() * 6.28; cg.position.set(Math.cos(a) * 230, 80 + Rc() * 40, Math.sin(a) * 230); cg.lookAt(0, cg.position.y, 0); sky.add(cg);
    }
  }
  const hemi = new THREE.HemisphereLight(mix('#3a4a8a', '#cfe6ff', day), mix('#101820', '#5a6b3a', day), .35 + day * .8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(day > .3 ? mix('#ffb36b', '#fff1d2', Math.min(1, day * 1.4 - dusk * .6)) : new THREE.Color('#b9c8ff'), day > .3 ? 1 + day * 1.6 : .7);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004;
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(day > .3 ? 18 : -14, day > .3 ? 10 + 30 * Math.max(.2, T0.elev) : 30, 12).normalize();
  const lit = day < .45;           // windows and lanterns light up at dusk and night

  // ----- the region: towns placed from the south (start) to the north (temple) -----
  const N = nodes.length, R = rng(N * 131 + (opt.seed || 7));
  const S = 70 + N * 9;            // region size
  const places = [];
  const start = new THREE.Vector2(0, S / 2 - 16);
  for (let i = 0; i < N; i++) {
    const f = (i + .5) / N;
    let p, tries = 0;
    do {
      p = new THREE.Vector2((R() - .5) * (S - 40) * (.45 + .55 * Math.sin(f * Math.PI)), S / 2 - 22 - f * (S - 50) + (R() - .5) * 10);
      tries++;
    } while (tries < 40 && places.some(q => q.distanceTo(p) < 17));
    places.push(p);
  }
  const temple = new THREE.Vector2(0, -S / 2 + 16);
  // roads: start → 1 → 2 … → temple, plus a few side roads between nearby towns
  const segs = [[start, places[0] || temple]];
  for (let i = 0; i < N - 1; i++) segs.push([places[i], places[i + 1]]);
  segs.push([places[N - 1] || start, temple]);
  for (let i = 0; i < N; i++) for (let j = i + 2; j < N; j++) if (places[i].distanceTo(places[j]) < 24 && R() < .5) segs.push([places[i], places[j]]);
  const segDist = (x, z) => {
    let d = 1e9;
    for (const [a, b] of segs) {
      const abx = b.x - a.x, aby = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.y) * aby) / (abx * abx + aby * aby || 1)));
      const dx = x - (a.x + abx * t), dz = z - (a.y + aby * t), q = dx * dx + dz * dz; if (q < d) d = q;
    }
    return Math.sqrt(d);
  };
  const plazaDist = (x, z) => { let d = 1e9; for (const p of [...places, temple, start]) { const q = Math.hypot(x - p.x, z - p.y); if (q < d) d = q; } return d; };
  const lakes = [];
  for (let k = 0; k < 2 + Math.floor(N / 5); k++) { const c = new THREE.Vector2((R() - .5) * (S - 50), (R() - .5) * (S - 50)); if (segDist(c.x, c.y) > 12 && plazaDist(c.x, c.y) > 16) lakes.push({ c, r: 6 + R() * 6 }); }
  // height: rolling hills, a ring of mountains at the edge, lakes; flat on roads and town squares
  const rawH = (x, z) => {
    let h = Math.sin(x * .07) * 1.6 + Math.sin(z * .09 + x * .03) * 1.4 + Math.sin(x * .23 + z * .19) * .45;
    const edge = Math.max(0, Math.max(Math.abs(x), Math.abs(z)) - (S / 2 - 12));
    h += Math.pow(edge, 1.5) * 1.1 + (edge > 0 ? Math.sin(x * .3 + z * .2) * edge * .25 : 0);
    for (const l of lakes) { const d = Math.hypot(x - l.c.x, z - l.c.y); if (d < l.r + 4) h -= (1 - Math.min(1, Math.max(0, (d - l.r + 2) / 6))) * 2.6; }
    return h;
  };
  const flatK = (x, z) => Math.min(Math.min(1, Math.max(0, (segDist(x, z) - 1.8) / 4)), Math.min(1, Math.max(0, (plazaDist(x, z) - 6) / 5)));
  const Hf = (x, z) => { const k = flatK(x, z), base = rawH(x, z); return base * k + Math.max(-.2, base) * (1 - k) * .15 * k; };
  const groundY = (x, z) => Math.max(Hf(x, z), -.35);

  const seg = Math.min(220, Math.round(S / 1.1));
  const gg = new THREE.PlaneGeometry(S + 60, S + 60, seg, seg); gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position, cols = [];
  const gA = new THREE.Color(SEA.grass[0]), gB = new THREE.Color(SEA.grass[1]), dirt = new THREE.Color(desert ? '#c9a46a' : T0.season === 'winter' ? '#cfc2b0' : '#b08a5a');
  const rock = new THREE.Color(T0.season === 'winter' && !desert ? '#f2f5fb' : '#8a7f6e'), rockD = new THREE.Color('#6d6456'), stoneC = new THREE.Color('#c9c1b0'), sand = new THREE.Color('#d9c79a');
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), h = Hf(x, z), rd = segDist(x, z), pd = plazaDist(x, z);
    pos.setY(k, h);
    let c;
    if (pd < 5.5) c = stoneC.clone().offsetHSL(0, 0, (R() - .5) * .05);
    else if (rd < 1.7) c = dirt.clone().offsetHSL(0, 0, (R() - .5) * .05);
    else if (h < -.15) c = sand.clone();
    else if (h > 5) c = (R() < .5 ? rock : rockD).clone();
    else c = gA.clone().lerp(gB, .5 + Math.sin(x * .2 + z * .13) * .4).offsetHSL(0, 0, (R() - .5) * .04);
    cols.push(c.r, c.g, c.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  gg.computeVertexNormals();
  const grain = canvasTex(256, 256, x => { const R2 = rng(3); x.fillStyle = '#ededed'; x.fillRect(0, 0, 256, 256); for (let k = 0; k < 7000; k++) { const v = 215 + R2() * 40 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(R2() * 256, R2() * 256, 1, 2 + R2() * 3); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(S / 5, S / 5);
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: .95 }));
  ground.receiveShadow = true; scene.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(S + 60, S + 60), new THREE.MeshStandardMaterial({ color: day > .4 ? '#2a6fb0' : '#10284f', roughness: .12, metalness: .6, transparent: true, opacity: .88 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -.4; scene.add(water);

  // ----- trees, as instanced meshes (hundreds, cheap) -----
  const spots = [];
  for (let k = 0; k < S * S / 20; k++) {
    const x = (R() - .5) * (S + 20), z = (R() - .5) * (S + 20);
    if (segDist(x, z) < 3.4 || plazaDist(x, z) < 9 || Hf(x, z) < -.1 || Hf(x, z) > 9) continue;
    spots.push([x, z, R(), .8 + R() * .8]);
  }
  const dummy = new THREE.Object3D();
  const inst = (geo, mat, list, f) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length; list.forEach((s, k) => { f(s, dummy); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  const broad = spots.filter(s => s[2] < (desert ? .45 : .6)), pines = desert ? [] : spots.filter(s => s[2] >= .6 && s[2] < .88), bushes = spots.filter(s => s[2] >= .88);
  const trunkM = std('#6b4a2e');
  inst(new THREE.CylinderGeometry(.22, .34, desert ? 4.2 : 2.2, 7), trunkM, broad, (s, d) => { d.position.set(s[0], groundY(s[0], s[1]) + (desert ? 2.1 : 1.1) * s[3], s[1]); d.scale.setScalar(s[3]); d.rotation.set(0, 0, desert ? .12 : 0); });
  const crownCols = SEA.crowns.map(c => toon(c));
  crownCols.forEach((mat, ci) => {
    const mine = broad.filter((s, k) => k % crownCols.length === ci);
    if (desert) inst(new THREE.ConeGeometry(1.6, .5, 7), mat, mine, (s, d) => { d.position.set(s[0], groundY(s[0], s[1]) + 4.3 * s[3], s[1]); d.scale.setScalar(s[3]); d.rotation.set(Math.PI, s[2] * 9, 0); });
    else inst(new THREE.IcosahedronGeometry(1.45, 1), mat, mine, (s, d) => { d.position.set(s[0], groundY(s[0], s[1]) + 3 * s[3], s[1]); d.scale.set(s[3], s[3] * .85, s[3]); d.rotation.set(0, s[2] * 9, 0); });
  });
  const pineM = toon(SEA.pine), pineSnow = toon('#ffffff');
  for (let j = 0; j < 3; j++) {
    inst(new THREE.ConeGeometry(1.3 - j * .32, 1.6, 9), pineM, pines, (s, d) => { d.position.set(s[0], groundY(s[0], s[1]) + (1.3 + j * .85) * s[3], s[1]); d.scale.setScalar(s[3]); d.rotation.set(0, 0, 0); });
    if (T0.season === 'winter' && !desert) inst(new THREE.ConeGeometry((1.3 - j * .32) * .55, .55, 9), pineSnow, pines, (s, d) => { d.position.set(s[0], groundY(s[0], s[1]) + (1.75 + j * .85) * s[3], s[1]); d.scale.setScalar(s[3]); });
  }
  inst(new THREE.CylinderGeometry(.14, .2, 1, 6), trunkM, pines, (s, d) => { d.position.set(s[0], groundY(s[0], s[1]) + .5 * s[3], s[1]); d.scale.setScalar(s[3]); });
  inst(new THREE.IcosahedronGeometry(.7, 1), toon(SEA.crowns[SEA.crowns.length - 1]), bushes, (s, d) => { d.position.set(s[0], groundY(s[0], s[1]) + .3, s[1]); d.scale.set(1.3 * s[3], .7 * s[3], s[3]); });

  // ----- buildings in the style of the country -----
  const wallM = std(arch === 'arab' ? '#f1e6cf' : arch === 'asia' ? '#efe6d6' : '#efe3c8');
  const roofM = std(arch === 'asia' ? '#4a4f5c' : arch === 'arab' ? '#e8dcc4' : new THREE.Color(accent[0]).lerp(new THREE.Color('#a0402e'), .65));
  const woodM = std('#7a5634'), stone = std('#b9b2a2', { flatShading: true }), grey = std('#8a8e99', { flatShading: true });
  const glowM = new THREE.MeshBasicMaterial({ color: lit ? new THREE.Color('#ffc85c').multiplyScalar(2.2) : new THREE.Color('#6a4a2a'), toneMapped: !lit });
  const lanterns = [];
  function house(x, z, rot, k = 1) {
    const g = new THREE.Group();
    if (arch === 'arab') {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 2.6), wallM); w.position.y = 1.1; g.add(w);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(3, .2, 2.8), roofM); lip.position.y = 2.25; g.add(lip);
      if (R() < .35) { const dm = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 10, 0, 6.3, 0, 1.6), roofM); dm.position.y = 2.3; g.add(dm); }
    } else if (arch === 'asia') {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.7, 2.4), wallM); w.position.y = .85; g.add(w);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 4), roofM); rf.position.y = 2.15; rf.rotation.y = Math.PI / 4; rf.scale.set(1.25, 1, 1.05); g.add(rf);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3, .14, 2.6), woodM); beam.position.y = 1.62; g.add(beam);
    } else {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 2.2), wallM); w.position.y = .95; g.add(w);
      const rf = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.7, 1.3, 4, 1), roofM); rf.position.y = 2.55; rf.rotation.y = Math.PI / 4; rf.scale.set(1.15, 1, .95); g.add(rf);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(.3, .8, .3), stone); ch.position.set(.6, 2.9, .3); g.add(ch);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(.6, 1), woodM); door.position.set(0, .5, arch === 'arab' ? 1.31 : 1.21); g.add(door);
    for (const s of [-1, 1]) { const wi = new THREE.Mesh(new THREE.PlaneGeometry(.45, .45), glowM); wi.position.set(s * .85, 1.05, arch === 'arab' ? 1.31 : 1.21); g.add(wi); }
    g.scale.setScalar(k); g.position.set(x, groundY(x, z), z); g.rotation.y = rot;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
  }
  function lantern(x, z) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 1.5, 6), woodM); post.position.y = .75; g.add(post);
    const lamp = new THREE.Mesh(arch === 'asia' ? new THREE.SphereGeometry(.22, 10, 8) : new THREE.BoxGeometry(.3, .32, .3), arch === 'asia' ? new THREE.MeshBasicMaterial({ color: lit ? new THREE.Color('#ff7a4a').multiplyScalar(2) : '#c9503f', toneMapped: !lit }) : glowM);
    lamp.position.y = 1.6; g.add(lamp);
    g.position.set(x, groundY(x, z), z); scene.add(g); lanterns.push(g);
  }

  // ----- towns: a square with houses, a lantern, the episode's portal, a name board and an elder's stone -----
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd36b', emissive: '#a8751a', emissiveIntensity: .6, metalness: .7, roughness: .3, flatShading: true });
  const blue = new THREE.MeshStandardMaterial({ color: '#9cc8ff', emissive: '#3d7dff', emissiveIntensity: 2.2, flatShading: true });
  const pick = [], spin = [], markers = [];
  const cur = Math.max(0, nodes.findIndex(n => n.state === 'cur'));
  const sign = (txt, sub, locked) => canvasTex(256, 128, x => { x.fillStyle = '#9a7043'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#6b4a2e'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 118);
    x.fillStyle = locked ? '#d8cbb5' : '#fff6dc'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 52px Georgia, serif'; x.fillText(txt, 128, sub ? 52 : 66);
    if (sub) { x.font = '22px Georgia, serif'; x.fillText(sub, 128, 98); } });
  nodes.forEach((n, i) => {
    const p = places[i], y = groundY(p.x, p.y);
    const hc = 3 + (i % 3);
    for (let k = 0; k < hc; k++) { const a = (k / hc) * Math.PI * 2 + R() * .5 + .4, rr = 8 + R() * 2.5; const hx = p.x + Math.cos(a) * rr, hz = p.y + Math.sin(a) * rr; if (segDist(hx, hz) > 2.6) house(hx, hz, Math.atan2(p.x - hx, p.y - hz), .9 + R() * .25); }
    lantern(p.x + 3.4, p.y + 2.6); lantern(p.x - 3.4, p.y - 2.6);
    // the episode's portal on a stone base
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, .4, 8), n.state === 'lock' ? grey : stone); base.position.y = .2; g.add(base);
    if (n.state === 'done') { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.45, 0), gold); cr.position.y = 1.4; g.add(cr); spin.push(cr); }
    else if (n.state === 'cur') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.95, .1, 10, 32), blue); ring.position.y = 1.6; g.add(ring); spin.push(ring);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.38, 0), blue); cr.position.y = 1.6; g.add(cr); spin.push(cr);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1, 16, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#8fc0ff', transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 8.5; g.add(beam);
    } else { const lk = new THREE.Mesh(new THREE.BoxGeometry(.46, .4, .22), grey); lk.position.y = .8; g.add(lk); }
    g.position.set(p.x, y, p.y); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.i = i; } }); scene.add(g); pick.push(g);
    // name board
    const sg = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 1.7, 6), woodM); post.position.y = .85; sg.add(post);
    const face = new THREE.MeshStandardMaterial({ map: sign((n.state === 'done' ? '★ ' : n.state === 'cur' ? '▶ ' : '') + (i + 1), n.name || '', n.state === 'lock'), roughness: .9 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, .75, .08), [woodM, woodM, woodM, woodM, face, face]); board.position.y = 1.7; sg.add(board);
    sg.position.set(p.x + 2.6, y, p.y + 1.2); sg.rotation.y = .3; sg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.i = i; } }); scene.add(sg); pick.push(sg);
    // the elder's stone: a tablet with a "did you know" about the country (towns you have reached)
    if (n.state !== 'lock' && opt.onFact) {
      const tg = new THREE.Group();
      const tab = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.2, .25), std('#9a948a', { flatShading: true })); tab.position.y = .6; tg.add(tab);
      const scroll = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, c2 => { c2.font = '90px serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('📜', 64, 70); }), depthWrite: false }));
      scroll.scale.set(.9, .9, 1); scroll.position.y = 1.8; tg.add(scroll); markers.push(scroll);
      tg.position.set(p.x - 2.8, y, p.y + 1.6); tg.traverse(o => { o.userData.fact = i; }); scene.add(tg); pick.push(tg);
    }
  });
  // the start: a little gate
  { const g = new THREE.Group();
    for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.25, .3, 3.4, 8), arch === 'asia' ? std('#b8322a') : woodM); pl.position.set(s * 2, 1.7, 0); g.add(pl); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(5.4, .35, .5), arch === 'asia' ? std('#b8322a') : woodM); top.position.y = 3.5; g.add(top);
    g.position.set(start.x, groundY(start.x, start.y), start.y + 4); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); }

  // ----- the temple: the level's final challenge; gives the medal -----
  { const g = new THREE.Group(), gs = opt.gym || 'lock';
    const mat = gs === 'lock' ? grey : stone;
    const plat = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 10), mat); plat.position.y = .5; g.add(plat);
    if (arch === 'asia') {
      for (let k = 0; k < 3; k++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(6 - k * 1.4, 2, 5 - k * 1.2), wallM); w.position.y = 2 + k * 2.6; g.add(w);
        const rf = new THREE.Mesh(new THREE.ConeGeometry(5.4 - k * 1.3, 1.3, 4), std('#3a3f4c')); rf.rotation.y = Math.PI / 4; rf.scale.set(1.3, 1, 1.1); rf.position.y = 3.5 + k * 2.6; g.add(rf);
      }
    } else if (arch === 'arab') {
      const w = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6.5), wallM); w.position.y = 3; g.add(w);
      const dm = new THREE.Mesh(new THREE.SphereGeometry(2.8, 24, 14, 0, 6.3, 0, 1.6), std('#3f8fb0', { metalness: .3, roughness: .4 })); dm.position.y = 5; g.add(dm);
      for (const s of [-1, 1]) { const t2 = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, 8, 10), wallM); t2.position.set(s * 4.6, 4.5, 3); g.add(t2); }
    } else {
      const w = new THREE.Mesh(new THREE.BoxGeometry(7, 4.4, 5), wallM); w.position.y = 3.2; g.add(w);
      for (const s of [-1, 1]) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 7.5, 12), stone); tw.position.set(s * 4.2, 4.3, 1); g.add(tw);
        const cr = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.4, 12), roofM); cr.position.set(s * 4.2, 9.2, 1); g.add(cr); }
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), gs === 'lock' ? grey : new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd36b').multiplyScalar(gs === 'open' ? 2.2 : 1.2), toneMapped: false }));
    door.position.set(0, 2.2, arch === 'arab' ? 3.27 : arch === 'asia' ? 2.52 : 2.52); g.add(door);
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .15, 24), gs === 'won' ? gold : grey); medal.rotation.x = Math.PI / 2; medal.position.y = arch === 'asia' ? 11.6 : 9; g.add(medal); spin.push(medal);
    g.position.set(temple.x, groundY(temple.x, temple.y), temple.y); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.gym = true; } }); scene.add(g); pick.push(g);
  }

  // ----- the daily chest, friends and the hero in the current town -----
  const cp = places[cur] || start;
  let chest = null;
  if (opt.chest) {
    const c = new THREE.Group(), boxM = std('#8a5a2b'), bandM = new THREE.MeshStandardMaterial({ color: '#e6b84a', metalness: .8, roughness: .3 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, .6, .7), boxM); box.position.y = .3; c.add(box);
    const lid = new THREE.Group(); lid.position.set(0, .6, -.35); c.add(lid);
    const lm = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1, 12, 1, false, 0, Math.PI), boxM); lm.rotation.z = Math.PI / 2; lm.position.z = .35; lid.add(lm);
    for (const s of [-.3, .3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, .62, .72), bandM); b.position.set(s, .3, 0); c.add(b); }
    const glow = new THREE.PointLight('#ffd36b', 6, 4, 2); glow.position.y = 1; c.add(glow);
    c.position.set(cp.x - 3.6, groundY(cp.x - 3.6, cp.y - 1), cp.y - 1); c.rotation.y = .5;
    c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.chest = true; } }); scene.add(c);
    chest = { lid, glow, open: false, t: 0 }; pick.push(c);
  }
  const PAL = ['#c9503f', '#3f7fbf', '#7a5aa8', '#d19a32', '#3f8f6a', '#b0476e', '#5a6b8a'];
  const npcs = [];
  (opt.npcs || []).forEach((n, k) => {
    const h = [...n.id].reduce((a2, ch) => a2 + ch.charCodeAt(0), 0);
    const st = n.style || { style: n.g === 'f' ? (h % 2 ? 'braid' : 'curly') : (h % 2 ? 'short' : 'messy'), top: PAL[h % PAL.length], bottom: '#3b3a4a',
      skirt: n.g === 'f' ? PAL[(h + 3) % PAL.length] : null, hair: ['#2a1d17', '#5a3a22', '#c0602a', '#17141c'][h % 4], accent: '#e6c27a', skin: ['#f2c9a0', '#e8b98f', '#c99a6e', '#f5d5bd'][h % 4] };
    const v = hero(st, {});
    const a = -.6 + k * 1.3, x = cp.x + Math.cos(a) * 4.2, z = cp.y + 3 + Math.sin(a) * 1.5;
    v.position.set(x, groundY(x, z), z); v.rotation.y = Math.atan2(cp.x - x, cp.y + 6 - z);
    v.traverse(o => { if (o.isMesh) o.userData.npc = n.id; }); scene.add(v); pick.push(v);
    let mark = null;
    if (n.due) {
      mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, c2 => { c2.fillStyle = '#ffd36b'; c2.strokeStyle = '#4a2a00'; c2.lineWidth = 8; c2.beginPath(); c2.arc(64, 58, 46, 0, 7); c2.fill(); c2.stroke(); c2.fillStyle = '#4a2a00'; c2.font = 'bold 70px Georgia'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('!', 64, 62); }), depthWrite: false }));
      mark.scale.set(.8, .8, 1); mark.userData.npc = n.id; scene.add(mark); pick.push(mark);
    }
    npcs.push({ v, mark, base: v.position.clone() });
  });
  const me = hero(heroStyle, wear);
  const heroPos = new THREE.Vector3(cp.x, 0, cp.y + 6.5);
  heroPos.y = groundY(heroPos.x, heroPos.z);
  me.position.copy(heroPos); scene.add(me);
  const pet = wear.pet ? companion(wear.pet) : null;
  if (pet) { pet.position.copy(heroPos).add(new THREE.Vector3(1, 0, 1)); scene.add(pet); }
  // a soft light that follows the hero at night
  const heroLight = new THREE.PointLight('#ffd9a0', lit ? 9 : 0, 10, 1.8); scene.add(heroLight);

  // ----- falling things for the season: petals, leaves, snow (and fireflies on summer nights) -----
  let fall = null;
  const fallC = SEA.fall || (T0.season === 'summer' && lit && !desert ? '#ffe96a' : null);
  if (fallC) {
    const n = 500, fp = new Float32Array(n * 3), FR = rng(11);
    for (let k = 0; k < n; k++) { fp[k * 3] = (FR() - .5) * 60; fp[k * 3 + 1] = FR() * 22; fp[k * 3 + 2] = (FR() - .5) * 60; }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const glowy = T0.season === 'summer';
    fall = new THREE.Points(fg, new THREE.PointsMaterial({ color: glowy ? new THREE.Color(fallC).multiplyScalar(2.5) : fallC, size: T0.season === 'winter' ? .16 : .22, transparent: true, opacity: .9, depthWrite: false, toneMapped: !glowy }));
    fall.userData.kind = T0.season; scene.add(fall);
  }

  // ----- input: tap the ground to walk; drag sideways to turn the camera; tap things to use them -----
  let yaw = 0, drag = null, moved = 0, target = null, arrive = null;
  const ray = new THREE.Raycaster();
  const cvs = renderer.domElement;
  cvs.style.touchAction = 'none';
  cvs.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw }; moved = 0; cvs.setPointerCapture(e.pointerId); });
  cvs.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; moved = Math.max(moved, Math.abs(dx) + Math.abs(e.clientY - drag.y)); if (moved > 8) yaw = drag.yaw - dx / 140; });
  const walkTo = (x, z, then, stopAt = 0) => {
    const v = new THREE.Vector3(x, 0, z), d = new THREE.Vector3().subVectors(v, heroPos); d.y = 0;
    const L = d.length(); if (L > stopAt) v.copy(heroPos).add(d.multiplyScalar((L - stopAt) / L));
    const lim = S / 2 - 6; v.x = Math.max(-lim, Math.min(lim, v.x)); v.z = Math.max(-lim, Math.min(lim, v.z));
    target = v; arrive = then || null;
  };
  cvs.addEventListener('pointerup', e => {
    if (!drag) return;
    const tap = moved < 8; drag = null;
    if (!tap) return;
    const r = cvs.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, cam);
    const hit = ray.intersectObjects(pick, true)[0];
    if (hit) {
      const o = hit.object.userData, at = hit.point;
      if (o.chest && chest && !chest.open) return walkTo(at.x, at.z, () => { chest.open = true; opt.onChest && opt.onChest(); }, 1.6);
      if (o.npc) return walkTo(at.x, at.z, () => opt.onNpc && opt.onNpc(o.npc), 1.8);
      if (o.fact !== undefined) return walkTo(at.x, at.z, () => opt.onFact && opt.onFact(o.fact), 1.6);
      if (o.gym) return walkTo(temple.x, temple.y + 7, () => opt.onGym && opt.onGym());
      if (o.i !== undefined) {
        const n = nodes[o.i];
        if (n.state === 'lock') { opt.onLocked && opt.onLocked(o.i); return walkTo(places[o.i].x, places[o.i].y + 3.5); }
        return walkTo(places[o.i].x, places[o.i].y + 2.2, () => onOpen && onOpen(n.key, o.i));
      }
    }
    const g = ray.intersectObject(ground)[0];
    if (g) walkTo(g.point.x, g.point.z);
  });
  cvs.addEventListener('pointercancel', () => { drag = null; });

  // ----- minimap: the whole region, north up -----
  const mm = document.createElement('canvas'); mm.className = 'w3-map'; mm.width = mm.height = 220; el.appendChild(mm);
  const mx = mm.getContext('2d');
  const bg = document.createElement('canvas'); bg.width = bg.height = 220;
  { const b = bg.getContext('2d'), K = 200 / S, P = (x, z) => [110 + x * K, 110 + z * K];
    b.fillStyle = desert ? 'rgba(190,150,90,.7)' : T0.season === 'winter' ? 'rgba(170,190,210,.7)' : 'rgba(40,120,90,.65)'; b.beginPath(); b.arc(110, 110, 106, 0, 7); b.fill();
    b.fillStyle = 'rgba(60,140,220,.85)'; for (const l of lakes) { const [x, y] = P(l.c.x, l.c.y); b.beginPath(); b.arc(x, y, l.r * K, 0, 7); b.fill(); }
    b.strokeStyle = 'rgba(255,240,200,.95)'; b.lineWidth = 4; b.lineCap = 'round';
    for (const [a, c] of segs) { const [x1, y1] = P(a.x, a.y), [x2, y2] = P(c.x, c.y); b.beginPath(); b.moveTo(x1, y1); b.lineTo(x2, y2); b.stroke(); }
    nodes.forEach((n, i) => { const [x, y] = P(places[i].x, places[i].y); b.fillStyle = n.state === 'done' ? '#ffd36b' : n.state === 'cur' ? '#7fb0ff' : '#9aa1b3'; b.beginPath(); b.arc(x, y, 7, 0, 7); b.fill(); b.strokeStyle = '#1b2340'; b.lineWidth = 2; b.stroke(); });
    const [tx, ty] = P(temple.x, temple.y); b.font = '20px serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('🏯', tx, ty); }
  function minimap() {
    const K = 200 / S;
    mx.clearRect(0, 0, 220, 220); mx.drawImage(bg, 0, 0);
    mx.save(); mx.translate(110 + heroPos.x * K, 110 + heroPos.z * K); mx.rotate(-me.rotation.y + Math.PI);
    mx.fillStyle = '#ffe14d'; mx.strokeStyle = '#4a2a00'; mx.lineWidth = 2;
    mx.beginPath(); mx.moveTo(0, -11); mx.lineTo(7, 8); mx.lineTo(0, 4); mx.lineTo(-7, 8); mx.closePath(); mx.fill(); mx.stroke(); mx.restore();
    mx.strokeStyle = 'rgba(255,255,255,.9)'; mx.lineWidth = 4; mx.beginPath(); mx.arc(110, 110, 106, 0, 7); mx.stroke();
  }

  // ----- post-processing: bloom on lights, at half resolution -----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W() / 2, Hh() / 2), lit ? .75 : .4, .5, lit ? .7 : .9);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  const clock = new THREE.Clock(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let raf = 0, alive = true, first = true, face = Math.PI;
  const resize = () => { renderer.setSize(W(), Hh()); composer.setSize(W(), Hh()); bloom.setSize(W() / 2, Hh() / 2); cam.aspect = W() / Hh(); cam.updateProjectionMatrix(); };
  addEventListener('resize', resize);
  function frame() {
    if (!alive) return;
    if (!el.isConnected) return dispose();
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    let walking = false;
    if (target) {
      const d = new THREE.Vector3(target.x - heroPos.x, 0, target.z - heroPos.z), L = d.length();
      if (L < .08) { target = null; if (arrive) { const a = arrive; arrive = null; a(); } }
      else { walking = true; const step = Math.min(L, dt * 5.5); heroPos.x += d.x / L * step; heroPos.z += d.z / L * step; face += (((Math.atan2(d.x, d.z) - face) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * .2; }
    }
    heroPos.y = groundY(heroPos.x, heroPos.z);
    me.position.copy(heroPos); me.rotation.y = face;
    const { body, limbs } = me.userData, sw = walking ? Math.sin(t * 12) * .75 : 0;
    limbs.ll.rotation.x = sw; limbs.lr.rotation.x = -sw; limbs.al.rotation.x = -sw * .7; limbs.ar.rotation.x = sw * .7;
    body.position.y = walking ? Math.abs(Math.sin(t * 12)) * .08 : Math.sin(t * 2) * .02;
    heroLight.position.set(heroPos.x, heroPos.y + 3, heroPos.z);
    if (pet) {
      const bx = heroPos.x - Math.sin(face) * 1.3 + Math.cos(face) * .9, bz = heroPos.z - Math.cos(face) * 1.3 - Math.sin(face) * .9;
      pet.position.x += (bx - pet.position.x) * .08; pet.position.z += (bz - pet.position.z) * .08;
      pet.position.y = groundY(pet.position.x, pet.position.z) + (pet.userData.fly ? 1.9 + Math.sin(t * 3) * .2 : Math.abs(Math.sin(t * 8)) * (walking ? .15 : .03));
      pet.rotation.y = face;
      if (pet.userData.wl) { pet.userData.wl.rotation.y = -.6 + Math.sin(t * 30) * .5; pet.userData.wr.rotation.y = .6 - Math.sin(t * 30) * .5; }
    }
    // camera: behind the hero; while walking it slowly swings behind the walking direction
    if (walking && !drag) yaw += (((face + Math.PI - yaw) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * .02;
    const wantPos = new THREE.Vector3(heroPos.x + Math.sin(yaw) * 10.5, heroPos.y + 5.4, heroPos.z + Math.cos(yaw) * 10.5);
    wantPos.y = Math.max(wantPos.y, groundY(wantPos.x, wantPos.z) + 2);
    const wantLook = new THREE.Vector3(heroPos.x - Math.sin(yaw) * 9, heroPos.y + 2.2, heroPos.z - Math.cos(yaw) * 9);
    if (first) { camPos.copy(wantPos); camLook.copy(wantLook); first = false; }
    camPos.lerp(wantPos, .1); camLook.lerp(wantLook, .12);
    cam.position.copy(camPos); cam.lookAt(camLook);
    sun.position.copy(heroPos).addScaledVector(sunDir, 50); sun.target.position.copy(heroPos);
    sky.position.copy(cam.position);
    for (const s of spin) s.rotation.y += dt * 1.3;
    for (const m of markers) m.position.y = 1.8 + Math.sin(t * 2.5) * .1;
    for (const n of npcs) { n.v.userData.body.position.y = Math.sin(t * 2 + n.base.x) * .02; if (n.mark) n.mark.position.set(n.base.x, n.base.y + 2.25 + Math.sin(t * 3) * .1, n.base.z); }
    if (chest) {
      if (chest.open && chest.t < 1) { chest.t = Math.min(1, chest.t + dt * 1.5); chest.lid.rotation.x = -chest.t * 1.9; chest.glow.intensity = 6 + chest.t * 20; }
      else if (!chest.open) chest.glow.intensity = 4 + Math.sin(t * 3) * 2; else chest.glow.intensity *= .97;
    }
    if (fall) {
      const a = fall.geometry.attributes.position, k0 = fall.userData.kind;
      for (let k = 0; k < a.count; k++) {
        let y = a.getY(k) - dt * (k0 === 'winter' ? 1.2 : k0 === 'summer' ? 0 : .9);
        let x = a.getX(k) + Math.sin(t + k) * dt * (k0 === 'summer' ? .6 : .5);
        if (k0 === 'summer') y += Math.sin(t * 1.3 + k) * dt * .4;
        if (y < 0) y = 22;
        a.setXY(k, x, y);
      }
      a.needsUpdate = true; fall.position.set(heroPos.x, k0 === 'summer' ? heroPos.y - 1 : heroPos.y, heroPos.z);
    }
    minimap();
    composer.render();
    raf = requestAnimationFrame(frame);
  }
  function dispose() {
    alive = false; cancelAnimationFrame(raf); removeEventListener('resize', resize);
    document.body.classList.remove('sm-3d');
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
    composer.dispose(); renderer.dispose(); renderer.domElement.remove(); mm.remove();
  }
  frame();
  return { dispose, time: T0 };
}

export const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };
