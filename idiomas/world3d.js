// The story map as a small 3D adventure world (shared by every language app), in the spirit of classic 3D
// adventure games: a sunny valley between rocky cliffs, a dirt path with fences and signposts, round trees,
// one shrine per episode (gold = done, glowing portal = current, stone with a lock = locked), and the hero seen
// from behind, walking the path. Swipe up/down to walk; tap a shrine to walk there; a minimap sits bottom-left.
// Rewards live here too: the daily chest by the current shrine, and the outfit, hat, cape and companion bought
// in the shop are worn by the hero. Everything is built in code (no model files): light, and cached offline.
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

// ---------- the world ----------
export function mountWorld(el, opt) {
  const { nodes, accent = ['#7fb4ff', '#6fbf73'], heroStyle, onOpen, wear = {} } = opt;
  const W = () => el.clientWidth || 360, Hh = () => el.clientHeight || 480;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(W(), Hh());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  el.appendChild(renderer.domElement);
  document.body.classList.add('sm-3d');
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe3f2', 26, 70);
  const cam = new THREE.PerspectiveCamera(55, W() / Hh(), .1, 200);

  // sky: blue dome fading to a hazy horizon, with soft clouds
  const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#3f86d8') }, hor: { value: new THREE.Color('#d9ecf7') } },
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top, hor; varying vec3 v; void main(){ gl_FragColor = vec4(mix(hor, top, smoothstep(-.02,.55,v.y)),1.); }' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), skyM); scene.add(sky);
  const cloudM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: .9, fog: false });
  const Rc = rng(5);
  for (let k = 0; k < 14; k++) {
    const cg = new THREE.Group();
    for (let j = 0; j < 5; j++) { const pf = new THREE.Mesh(new THREE.SphereGeometry(3 + Rc() * 3, 12, 8), cloudM); pf.position.set(j * 4 - 8, Rc() * 2, Rc() * 3); pf.scale.y = .55; cg.add(pf); }
    const a = Rc() * 6.28; cg.position.set(Math.cos(a) * 110, 38 + Rc() * 18, Math.sin(a) * 110); cg.lookAt(0, cg.position.y, 0); sky.add(cg);
  }
  scene.add(new THREE.HemisphereLight('#cfe6ff', '#5a6b3a', 1.15));
  const sun = new THREE.DirectionalLight('#fff1d2', 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004;
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
  scene.add(sun, sun.target);

  // the path through the valley (it heads towards -z)
  const N = nodes.length, SP = 9, R = rng(N * 97 + 13);
  const pts = [];
  for (let i = -1; i <= N + 1; i++) pts.push(new THREE.Vector3(Math.sin(i * 1.05) * 5 + Math.sin(i * .37) * 2, 0, -i * SP));
  const curve = new THREE.CatmullRomCurve3(pts);
  const u = i => (Math.max(-1, Math.min(N + 1, i)) + 1) / (N + 2);
  const at = i => curve.getPoint(u(i));
  const dirAt = i => curve.getTangent(u(i));
  const samples = curve.getSpacedPoints(N * 20 + 30);
  const distPath = (x, z) => { let d = 1e9; for (const p of samples) { const dx = p.x - x, dz = p.z - z, q = dx * dx + dz * dz; if (q < d) d = q; } return Math.sqrt(d); };

  // valley floor rising into rocky cliffs at the sides
  const len = N * SP + 46, gw = 64;
  const gg = new THREE.PlaneGeometry(gw, len, 96, Math.round(len / .7));
  gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -len / 2 + 18);
  const pos = gg.attributes.position, cols = [];
  const grassA = new THREE.Color('#5c9a3c'), grassB = new THREE.Color('#7fb24a'), dirt = new THREE.Color('#b08a5a'), rock = new THREE.Color('#8a7f6e'), rockD = new THREE.Color('#6d6456');
  const tint = new THREE.Color(accent[1]);
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), d = distPath(x, z);
    const n1 = Math.sin(x * .35 + z * .17) + Math.sin(z * .29 - x * .23) * .8 + Math.sin(x * 1.3 + z * .9) * .25;
    const away = Math.max(0, d - 9);
    const h = n1 * .35 * Math.min(1, Math.max(0, (d - 2) / 4)) + Math.pow(away, 1.55) * .32 + (away > 0 ? Math.sin(z * .8 + x) * away * .06 : 0);
    pos.setY(k, h);
    let col;
    if (d < 1.4) col = dirt.clone().offsetHSL(0, 0, (R() - .5) * .05);
    else if (h > 3) col = (R() < .5 ? rock : rockD).clone().offsetHSL(0, 0, (R() - .5) * .06);
    else col = grassA.clone().lerp(grassB, .5 + n1 * .25).lerp(tint, .12).offsetHSL(0, 0, (R() - .5) * .04);
    cols.push(col.r, col.g, col.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  gg.computeVertexNormals();
  const grain = canvasTex(256, 256, x => { const R2 = rng(3); x.fillStyle = '#ededed'; x.fillRect(0, 0, 256, 256); for (let k = 0; k < 7000; k++) { const v = 215 + R2() * 40 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(R2() * 256, R2() * 256, 1, 2 + R2() * 3); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(gw / 4, len / 4);
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: .95 }));
  ground.receiveShadow = true; scene.add(ground);
  const ray = new THREE.Raycaster();
  const groundY = (x, z) => { ray.set(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObject(ground)[0]; return h ? h.point.y : 0; };

  // props: trees, pines, bushes, boulders on the slopes, a few houses
  const trunkM = std('#6b4a2e'), leafM = toon('#3f7f32'), leafM2 = toon('#5a9a3a'), pineM = toon('#2f5f3a'), rockM = std('#8d8576', { flatShading: true }), woodM = std('#8a6438');
  const roofM = std(new THREE.Color(accent[0]).lerp(new THREE.Color('#a0402e'), .6)), wallM = std('#efe3c8');
  const place = (obj, x, z, sink = 0) => { obj.position.set(x, groundY(x, z) - sink, z); obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(obj); return obj; };
  for (let k = 0; k < N * 14 + 30; k++) {
    const x = (R() - .5) * (gw - 10), z = 14 - R() * (len - 6), d = distPath(x, z);
    if (d < 3.2) continue;
    const t = R(), g = new THREE.Group();
    if (d > 11 && t < .5) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.8 + R() * 1.6, 0), rockM); r.rotation.set(R(), R(), R()); g.add(r);
      place(g, x, z, .4); continue;
    }
    if (t < .55) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.22, .34, 2.2, 8), trunkM); tr.position.y = 1.1; g.add(tr);
      const m = R() < .5 ? leafM : leafM2;
      for (let j = 0; j < 3; j++) { const cc = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 - j * .2, 1), m); cc.position.set((R() - .5) * 1.1, 2.7 + j * .55, (R() - .5) * 1.1); cc.scale.y = .8; g.add(cc); }
      g.scale.setScalar(.9 + R() * .7);
    } else if (t < .75) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, 1, 6), trunkM); tr.position.y = .5; g.add(tr);
      for (let j = 0; j < 3; j++) { const cc = new THREE.Mesh(new THREE.ConeGeometry(1.2 - j * .3, 1.5, 10), pineM); cc.position.y = 1.4 + j * .8; g.add(cc); }
      g.scale.setScalar(.9 + R() * .6);
    } else if (t < .9) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 1), leafM2); b.scale.set(1.3, .7, 1); b.position.y = .3; g.add(b);
    } else if (d < 14) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2), wallM); w.position.y = .9; g.add(w);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.4, 4), roofM); roof.position.y = 2.5; roof.rotation.y = Math.PI / 4; g.add(roof);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(.55, .9), woodM); door.position.set(0, .45, 1.11); g.add(door);
      g.rotation.y = R() * 6;
    } else continue;
    place(g, x, z);
  }
  // wooden fences along both sides of the path, with gaps
  const postG = new THREE.CylinderGeometry(.07, .08, .9, 6), railG = new THREE.BoxGeometry(.06, .08, 1);
  for (let k = 4; k < samples.length - 4; k += 3) {
    if (Math.floor(k / 12) % 3 === 2) continue;
    const p = samples[k], q = samples[k + 3] || p, dir = new THREE.Vector3().subVectors(q, p).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (const s of [-1, 1]) {
      const x = p.x + side.x * 2.3 * s, z = p.z + side.z * 2.3 * s, y = groundY(x, z);
      const post = new THREE.Mesh(postG, woodM); post.position.set(x, y + .45, z); post.castShadow = true; scene.add(post);
      const l = p.distanceTo(q), rail = new THREE.Mesh(railG, woodM);
      rail.scale.z = l; rail.position.set(x + dir.x * l / 2, y + .7, z + dir.z * l / 2); rail.lookAt(x + dir.x * l, y + .7, z + dir.z * l); rail.castShadow = true; scene.add(rail);
    }
  }

  // shrines, each with a signpost showing the episode number
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd36b', emissive: '#a8751a', emissiveIntensity: .5, metalness: .7, roughness: .3, flatShading: true });
  const blue = new THREE.MeshStandardMaterial({ color: '#9cc8ff', emissive: '#3d7dff', emissiveIntensity: 2.2, flatShading: true });
  const grey = std('#8a8e99', { flatShading: true }), stone = std('#b9b2a2', { flatShading: true });
  const pick = [], spin = [];
  nodes.forEach((n, i) => {
    const p = at(i), d = dirAt(i), side = new THREE.Vector3(-d.z, 0, d.x), g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, .4, 8), n.state === 'lock' ? grey : stone); base.position.y = .2; g.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.05, .25, 8), n.state === 'lock' ? grey : stone); top.position.y = .52; g.add(top);
    if (n.state === 'done') {
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.45, 0), gold); cr.position.y = 1.5; g.add(cr); spin.push(cr);
    } else if (n.state === 'cur') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.95, .1, 10, 32), blue); ring.position.y = 1.7; g.add(ring); spin.push(ring);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.38, 0), blue); cr.position.y = 1.7; g.add(cr); spin.push(cr);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1, 12, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#8fc0ff', transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 6.5; g.add(beam);
    } else {
      const lk = new THREE.Mesh(new THREE.BoxGeometry(.46, .4, .22), grey); lk.position.y = .9; g.add(lk);
      const sh = new THREE.Mesh(new THREE.TorusGeometry(.15, .05, 6, 12, Math.PI), grey); sh.position.y = 1.1; g.add(sh);
    }
    g.position.set(p.x, groundY(p.x, p.z), p.z);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.i = i; } });
    scene.add(g); pick.push(g);
    const sx = p.x + side.x * 2.9, sz = p.z + side.z * 2.9, sg = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 1.6, 6), woodM); post.position.y = .8; sg.add(post);
    const tex = canvasTex(256, 128, x => { x.fillStyle = '#9a7043'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#6b4a2e'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 118);
      x.fillStyle = n.state === 'lock' ? '#d8cbb5' : '#fff6dc'; x.font = 'bold 64px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText((n.state === 'done' ? '★ ' : n.state === 'lock' ? '' : '▶ ') + (i + 1), 128, 68); });
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: .9 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, .6, .08), [woodM, woodM, woodM, woodM, face, face]);
    board.position.y = 1.55; sg.add(board);
    sg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.i = i; } });
    place(sg, sx, sz); sg.rotation.y = Math.atan2(d.x, d.z) + Math.PI; pick.push(sg);
  });
  { const g = new THREE.Group(), p = at(N);
    for (const s of [-1, 1]) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.15, 6, 10), stone); tw.position.set(s * 2.8, 3, 0); g.add(tw);
      const r = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.8, 10), roofM); r.position.set(s * 2.8, 6.9, 0); g.add(r);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1, .6), std(accent[0], { side: THREE.DoubleSide })); fl.position.set(s * 2.8 + .5, 8.2, 0); g.add(fl); spin.push({ flag: fl }); }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1, 1.4), stone); arch.position.y = 4.6; g.add(arch);
    place(g, p.x, p.z); }

  // the daily chest beside the current shrine
  const cur = Math.max(0, nodes.findIndex(n => n.state === 'cur'));
  let chest = null;
  if (opt.chest) {
    const p = at(cur), d = dirAt(cur), side = new THREE.Vector3(-d.z, 0, d.x), c = new THREE.Group();
    const boxM = std('#8a5a2b'), bandM = new THREE.MeshStandardMaterial({ color: '#e6b84a', metalness: .8, roughness: .3 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, .6, .7), boxM); box.position.y = .3; c.add(box);
    const lid = new THREE.Group(); lid.position.set(0, .6, -.35); c.add(lid);
    const lm = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1, 12, 1, false, 0, Math.PI), boxM); lm.rotation.z = Math.PI / 2; lm.position.z = .35; lid.add(lm);
    for (const s of [-.3, .3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, .62, .72), bandM); b.position.set(s, .3, 0); c.add(b); }
    const glow = new THREE.PointLight('#ffd36b', 6, 4, 2); glow.position.y = 1; c.add(glow);
    c.traverse(o => { if (o.isMesh) o.userData.chest = true; });
    place(c, p.x - side.x * 2.9, p.z - side.z * 2.9); c.rotation.y = Math.atan2(side.x, side.z);
    chest = { g: c, lid, glow, open: false, t: 0 }; pick.push(c);
  }

  // villagers: the hero's friends stand by the path; the ones with words to review have a "!" over their head
  const PAL = ['#c9503f', '#3f7fbf', '#7a5aa8', '#d19a32', '#3f8f6a', '#b0476e', '#5a6b8a'];
  const npcs = [];
  (opt.npcs || []).forEach((n, k) => {
    const h = [...n.id].reduce((a2, ch) => a2 + ch.charCodeAt(0), 0);
    const st = n.style || { style: n.g === 'f' ? (h % 2 ? 'braid' : 'curly') : (h % 2 ? 'short' : 'messy'), top: PAL[h % PAL.length], bottom: '#3b3a4a',
      skirt: n.g === 'f' ? PAL[(h + 3) % PAL.length] : null, hair: ['#2a1d17', '#5a3a22', '#c0602a', '#17141c'][h % 4], accent: '#e6c27a', skin: ['#f2c9a0', '#e8b98f', '#c99a6e', '#f5d5bd'][h % 4] };
    const v = hero(st, {});
    const ti = Math.max(-.4, [cur - .12, cur - .02, cur - .75][k] ?? cur - 1 - k * .5), p = at(ti), d = dirAt(ti), side = new THREE.Vector3(-d.z, 0, d.x), sg = k % 2 ? 1 : -1;
    const x = p.x + side.x * 1.6 * sg, z = p.z + side.z * 1.6 * sg;
    v.position.set(x, groundY(x, z), z); v.rotation.y = Math.atan2(-side.x * sg, -side.z * sg);
    v.traverse(o => { if (o.isMesh) o.userData.npc = n.id; });
    scene.add(v); pick.push(v);
    let mark = null;
    if (n.due) {
      mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, c2 => { c2.fillStyle = '#ffd36b'; c2.strokeStyle = '#4a2a00'; c2.lineWidth = 8;
        c2.beginPath(); c2.arc(64, 58, 46, 0, 7); c2.fill(); c2.stroke(); c2.fillStyle = '#4a2a00'; c2.font = 'bold 70px Georgia'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('!', 64, 62); }), depthWrite: false }));
      mark.scale.set(.8, .8, 1); mark.userData.npc = n.id; scene.add(mark); pick.push(mark);
    }
    npcs.push({ v, mark, base: v.position.clone() });
  });

  // the hero (just before the current shrine) and the companion
  const me = hero(heroStyle, wear);
  let heroT = cur - .35, heroGoal = heroT;
  scene.add(me);
  const pet = wear.pet ? companion(wear.pet) : null;
  if (pet) scene.add(pet);
  const maxT = cur + .2;

  // input: swipe up = walk forward, down = back; tap a shrine or sign to walk there; tap the chest to open it
  let drag = null, moved = 0, arrive = null;
  const cvs = renderer.domElement;
  cvs.style.touchAction = 'none';
  cvs.addEventListener('pointerdown', e => { drag = { y: e.clientY, x: e.clientX, g: heroGoal }; moved = 0; cvs.setPointerCapture(e.pointerId); });
  cvs.addEventListener('pointermove', e => {
    if (!drag) return;
    const dy = drag.y - e.clientY; moved = Math.max(moved, Math.abs(dy) + Math.abs(e.clientX - drag.x));
    if (moved > 8) { heroGoal = Math.max(-.6, Math.min(maxT, drag.g + dy / 90)); arrive = null; }
  });
  cvs.addEventListener('pointerup', e => {
    if (!drag) return;
    const tap = moved < 8; drag = null;
    if (!tap) return;
    const r = cvs.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, cam);
    const hit = ray.intersectObjects(pick, true)[0];
    if (!hit) return;
    if (hit.object.userData.chest && chest && !chest.open) { chest.open = true; opt.onChest && opt.onChest(); return; }
    if (hit.object.userData.npc) { opt.onNpc && opt.onNpc(hit.object.userData.npc); return; }
    const i = hit.object.userData.i;
    if (i === undefined) return;
    if (nodes[i].state === 'lock') { opt.onLocked && opt.onLocked(i); return; }
    heroGoal = i - .35; arrive = () => onOpen && onOpen(nodes[i].key, i);
  });
  cvs.addEventListener('pointercancel', () => { drag = null; });

  // minimap, bottom-left, centred on the hero
  const mm = document.createElement('canvas'); mm.className = 'w3-map'; mm.width = mm.height = 220; el.appendChild(mm);
  const mx = mm.getContext('2d');
  function minimap(hp, ang) {
    const K = 4.2, cx = 110, cy = 110;
    mx.clearRect(0, 0, 220, 220);
    mx.save(); mx.beginPath(); mx.arc(cx, cy, 104, 0, 7); mx.clip();
    mx.fillStyle = 'rgba(40,120,110,.6)'; mx.fillRect(0, 0, 220, 220);
    mx.translate(cx, cy);
    const P = q => [(q.x - hp.x) * K, (q.z - hp.z) * K];
    mx.strokeStyle = 'rgba(255,240,200,.95)'; mx.lineWidth = 7; mx.lineCap = 'round'; mx.beginPath();
    samples.forEach((q, k) => { const [x, y] = P(q); k ? mx.lineTo(x, y) : mx.moveTo(x, y); }); mx.stroke();
    nodes.forEach((n, i) => { const [x, y] = P(at(i)); if (Math.abs(x) > 120 || Math.abs(y) > 120) return;
      mx.fillStyle = n.state === 'done' ? '#ffd36b' : n.state === 'cur' ? '#7fb0ff' : '#9aa1b3'; mx.beginPath(); mx.arc(x, y, 8, 0, 7); mx.fill(); mx.strokeStyle = '#1b2340'; mx.lineWidth = 2; mx.stroke(); });
    mx.rotate(ang); mx.fillStyle = '#ffe14d'; mx.strokeStyle = '#4a2a00'; mx.lineWidth = 2;
    mx.beginPath(); mx.moveTo(0, -12); mx.lineTo(8, 9); mx.lineTo(0, 4); mx.lineTo(-8, 9); mx.closePath(); mx.fill(); mx.stroke();
    mx.restore();
    mx.strokeStyle = 'rgba(255,255,255,.9)'; mx.lineWidth = 4; mx.beginPath(); mx.arc(cx, cy, 104, 0, 7); mx.stroke();
  }

  // post-processing: soft bloom on the bright bits (portal, crystals, chest), at half resolution
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W() / 2, Hh() / 2), .45, .5, .9);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  const clock = new THREE.Clock(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let raf = 0, alive = true, first = true, face = Math.PI;
  const resize = () => { renderer.setSize(W(), Hh()); composer.setSize(W(), Hh()); bloom.setSize(W() / 2, Hh() / 2); cam.aspect = W() / Hh(); cam.updateProjectionMatrix(); };
  addEventListener('resize', resize);
  function frame() {
    if (!alive) return;
    if (!el.isConnected) return dispose();
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    const d = heroGoal - heroT, walking = Math.abs(d) > .005;
    if (walking) heroT += Math.sign(d) * Math.min(Math.abs(d), dt * 1.25);
    else if (arrive) { const a = arrive; arrive = null; a(); }
    const p = at(heroT), tan = dirAt(heroT), fwd = new THREE.Vector3(tan.x, 0, tan.z).normalize();
    const y = groundY(p.x, p.z);
    me.position.set(p.x, y, p.z);
    const want = Math.atan2(fwd.x, fwd.z) + (d < -.005 ? Math.PI : 0);
    face += (((want - face) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * .15;
    me.rotation.y = face;
    const { body, limbs } = me.userData, sw = walking ? Math.sin(t * 11) * .75 : 0;
    limbs.ll.rotation.x = sw; limbs.lr.rotation.x = -sw; limbs.al.rotation.x = -sw * .7; limbs.ar.rotation.x = sw * .7;
    body.position.y = walking ? Math.abs(Math.sin(t * 11)) * .08 : Math.sin(t * 2) * .02;
    if (pet) {
      const back = at(heroT - .12), s = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const tx = back.x + s.x * 1.1, tz = back.z + s.z * 1.1;
      pet.position.x += (tx - pet.position.x) * .08; pet.position.z += (tz - pet.position.z) * .08;
      pet.position.y = groundY(pet.position.x, pet.position.z) + (pet.userData.fly ? 1.9 + Math.sin(t * 3) * .2 : Math.abs(Math.sin(t * 8)) * (walking ? .15 : .03));
      pet.rotation.y = face;
      if (pet.userData.wl) { pet.userData.wl.rotation.y = -.6 + Math.sin(t * 30) * .5; pet.userData.wr.rotation.y = .6 - Math.sin(t * 30) * .5; }
    }
    // camera: behind and above the hero, looking ahead along the path (smoothed)
    const wantPos = new THREE.Vector3(p.x - fwd.x * 7.5, y + 4.2, p.z - fwd.z * 7.5);
    const ahead = at(heroT + .55);
    const wantLook = new THREE.Vector3(ahead.x, groundY(ahead.x, ahead.z) + 1.2, ahead.z);
    if (first) { camPos.copy(wantPos); camLook.copy(wantLook); first = false; }
    camPos.lerp(wantPos, .08); camLook.lerp(wantLook, .1);
    cam.position.copy(camPos); cam.lookAt(camLook);
    sun.position.set(p.x + 14, y + 26, p.z + 10); sun.target.position.set(p.x, y, p.z - 6);
    sky.position.copy(cam.position);
    for (const s of spin) { if (s.flag) s.flag.rotation.y = Math.sin(t * 3) * .35; else s.rotation.y += dt * 1.3; }
    if (chest) {
      if (chest.open && chest.t < 1) { chest.t = Math.min(1, chest.t + dt * 1.5); chest.lid.rotation.x = -chest.t * 1.9; chest.glow.intensity = 6 + chest.t * 20; }
      else if (!chest.open) chest.glow.intensity = 4 + Math.sin(t * 3) * 2;
      else chest.glow.intensity *= .97;
    }
    for (const n of npcs) {
      n.v.userData.body.position.y = Math.sin(t * 2 + n.base.x) * .02;
      if (n.mark) n.mark.position.set(n.base.x, n.base.y + 2.25 + Math.sin(t * 3) * .1, n.base.z);
    }
    minimap(p, Math.atan2(fwd.x, -fwd.z));
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
  return { dispose };
}

export const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };
