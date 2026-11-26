// The story map as a small 3D world (shared by every language app): a winding path across a night-time island,
// one shrine per episode (gold = done, glowing portal = current, grey stone = locked), lanterns, trees, houses,
// water, and the hero as a toon-shaded chibi who walks to the shrine you tap. Drag up/down to travel the path.
// Everything is built in code (no model files), so it is light and works offline once cached.
import * as THREE from './vendor/three.module.min.js';

// ---------- small helpers ----------
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const toonRamp = (() => {
  let t = null;
  return () => {
    if (t) return t;
    const d = new Uint8Array([90, 170, 255]);
    t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
    return t;
  };
})();
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra });
const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .9, metalness: 0, ...extra });
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x14101c, side: THREE.BackSide });
// A mesh with a cartoon outline (the same shape slightly larger, drawn from the inside, in near-black).
function inked(geo, mat, k = 1.06) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
  const o = new THREE.Mesh(geo, OUTLINE); o.scale.setScalar(k); g.add(o);
  return g;
}

// ---------- the hero: a chibi built from simple shapes, coloured per language (meta.hero3d) ----------
function hero(st = {}) {
  const c = {
    skin: '#f2c9a0', hair: '#2a1d17', top: '#5a7fb0', bottom: '#3b3a4a', boots: '#5a3a24', accent: '#d9534f', eye: '#1c1622',
    ...st,
  };
  const H = new THREE.Group(), body = new THREE.Group(); H.add(body);
  const head = inked(new THREE.SphereGeometry(.62, 24, 18), toon(c.skin)); head.position.y = 1.62; body.add(head);
  // eyes with a highlight, blush
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 10), new THREE.MeshBasicMaterial({ color: c.eye }));
    e.scale.set(1, 1.35, .6); e.position.set(s * .21, 1.6, .6); body.add(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    hl.position.set(s * .21 + .025, 1.65, .655); body.add(hl);
    const b = new THREE.Mesh(new THREE.CircleGeometry(.08, 12), new THREE.MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: .55 }));
    b.position.set(s * .34, 1.46, .54); b.rotation.y = s * .55; body.add(b);
  }
  {
    const mo = new THREE.Mesh(new THREE.TorusGeometry(.07, .018, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: '#5a2a2a' }));
    mo.rotation.z = Math.PI; mo.position.set(0, 1.43, .615); body.add(mo);
  }
  // hair: a cap over the head, then the style's extra pieces
  const hairM = toon(c.hair);
  const cap = inked(new THREE.SphereGeometry(.66, 24, 18, 0, Math.PI * 2, 0, Math.PI * .52), hairM, 1.04);
  cap.position.y = 1.66; cap.rotation.x = -.18; body.add(cap);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, k) => { const m = inked(geo, mat, k); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); body.add(m); return m; };
  const style = c.style || 'short';
  if (style === 'topknot') add(new THREE.SphereGeometry(.2, 14, 12), hairM, 0, 2.32, -.12);
  if (style === 'bun') add(new THREE.SphereGeometry(.22, 14, 12), hairM, 0, 2.05, -.5);
  if (style === 'messy') for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(.16, .42, 6), hairM, Math.cos(i) * .4, 2.12 + (i % 2) * .05, Math.sin(i) * .3 - .1, -.3 + Math.sin(i) * .4, 0, Math.cos(i) * .5);
  if (style === 'curly') for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(.2, 10, 8), hairM, Math.cos(i * .7) * .55, 1.75 + Math.sin(i * 1.3) * .25, Math.sin(i * .7) * .5 - .15);
  if (style === 'braid') for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(.13 - i * .015, 10, 8), hairM, .3, 1.35 - i * .2, -.42);
  if (style === 'beret') { const b = add(new THREE.CylinderGeometry(.6, .66, .16, 20), toon(c.hat || '#6b3d2a'), .05, 2.14, -.05, -.15, 0, .15); b.scale.set(1, 1, .95); }
  if (style === 'scarf') {   // headscarf over the hair, framing the face
    const s = inked(new THREE.SphereGeometry(.7, 24, 18, 0, Math.PI * 2, 0, Math.PI * .62), toon(c.hat || '#e8a33c'), 1.03);
    s.position.y = 1.62; s.rotation.x = -.3; body.add(s);
    add(new THREE.ConeGeometry(.5, .8, 16), toon(c.hat || '#e8a33c'), 0, 1.05, -.25, .25);
  }
  if (c.strawHat) add(new THREE.ConeGeometry(.62, .3, 20), toon('#d9b56a'), 0, 1.25, -.62, -1.35);
  // torso, belt/sash, arms, legs, boots
  const torso = inked(new THREE.CylinderGeometry(.34, .46, .78, 16), toon(c.top)); torso.position.y = .92; body.add(torso);
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(.43, .45, .12, 16), toon(c.accent)); sash.position.y = .7; body.add(sash);
  if (c.skirt) { const sk = inked(new THREE.CylinderGeometry(.44, .62, .5, 16), toon(c.skirt)); sk.position.y = .45; body.add(sk); }
  if (c.scarfNeck) { const nk = new THREE.Mesh(new THREE.TorusGeometry(.3, .09, 8, 16), toon(c.scarfNeck)); nk.rotation.x = Math.PI / 2; nk.position.y = 1.28; body.add(nk); }
  const limbs = {};
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * .46, 1.18, 0);
    const a = inked(new THREE.CapsuleGeometry(.11, .42, 4, 8), toon(c.sleeve || c.top)); a.position.y = -.26; arm.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), toon(c.skin)); hand.position.y = -.55; arm.add(hand);
    arm.rotation.z = s * .18; body.add(arm); limbs[s < 0 ? 'al' : 'ar'] = arm;
    const leg = new THREE.Group(); leg.position.set(s * .17, .5, 0);
    const l = inked(new THREE.CapsuleGeometry(.12, .3, 4, 8), toon(c.bottom)); l.position.y = -.2; leg.add(l);
    const boot = inked(new THREE.SphereGeometry(.15, 10, 8), toon(c.boots)); boot.scale.set(1, .7, 1.35); boot.position.set(0, -.44, .06); leg.add(boot);
    body.add(leg); limbs[s < 0 ? 'll' : 'lr'] = leg;
  }
  if (c.bag) { const bag = inked(new THREE.BoxGeometry(.36, .36, .16), toon(c.bag)); bag.position.set(0, .95, -.42); body.add(bag); }
  // soft round shadow under the feet
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.55, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .32, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = .02; H.add(sh);
  H.userData = { body, limbs };
  H.scale.setScalar(.9);
  return H;
}

// ---------- the world ----------
export function mountWorld(el, opt) {
  const { nodes, accent = ['#7fb4ff', '#6fbf73'], heroStyle, onOpen, labels = {} } = opt;
  const W = () => el.clientWidth || 360, Hh = () => el.clientHeight || 480;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(W(), Hh());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const night = new THREE.Color('#0f1d42');
  scene.background = night; scene.fog = new THREE.Fog(night, 18, 46);
  const cam = new THREE.PerspectiveCamera(42, W() / Hh(), .1, 120);

  scene.add(new THREE.HemisphereLight('#8fa2ff', '#1d2a22', 1.05));
  const moon = new THREE.DirectionalLight('#dfe6ff', 1.6);
  moon.position.set(-8, 16, 6); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  scene.add(moon, moon.target);

  // path: winding along -z, one shrine every SP units
  const N = nodes.length, SP = 6.5, R = rng(N * 97 + 13);
  const pts = [];
  for (let i = -1; i <= N + 1; i++) pts.push(new THREE.Vector3(Math.sin(i * 1.15) * 4.2 + Math.sin(i * .37) * 1.5, 0, -i * SP));
  const curve = new THREE.CatmullRomCurve3(pts);
  const at = i => curve.getPoint((i + 1) / (N + 2));            // world position of node i (i may be fractional)
  const samples = curve.getSpacedPoints(N * 14 + 20);
  const distPath = (x, z) => { let d = 1e9; for (const p of samples) { const dx = p.x - x, dz = p.z - z, q = dx * dx + dz * dz; if (q < d) d = q; } return Math.sqrt(d); };

  // island ground: gentle low-poly hills, flat along the path, snow on the high spots
  const len = N * SP + 30, gw = 34;
  const gg = new THREE.PlaneGeometry(gw, len, 34, Math.round(len / 1.2));
  gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -len / 2 + 12);
  const pos = gg.attributes.position, cols = [];
  const grass = new THREE.Color(accent[1]).lerp(new THREE.Color('#1f3b2a'), .55), snow = new THREE.Color('#e9efff'), sand = new THREE.Color('#c9b58e');
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), d = distPath(x, z);
    const edge = Math.max(0, Math.abs(x) - gw / 2 + 6);           // sink at the shore
    let h = (Math.sin(x * .55 + z * .21) + Math.sin(z * .37 - x * .19) * .7 + R() * .5) * Math.min(1, Math.max(0, (d - 1.6) / 4)) * 1.1;
    h -= edge * .55;
    pos.setY(k, h);
    const col = d < 1.25 ? sand.clone() : h > 1.25 ? snow.clone() : grass.clone().offsetHSL(0, 0, (R() - .5) * .04 + h * .03);
    cols.push(col.r, col.g, col.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, len + 120), new THREE.MeshStandardMaterial({ color: '#173a6b', roughness: .25, metalness: .4, transparent: true, opacity: .92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -.9, -len / 2 + 12); scene.add(water);
  const groundY = (x, z) => { const r = new THREE.Raycaster(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0)); const h = r.intersectObject(ground)[0]; return h ? h.point.y : 0; };

  // stepping stones along the path
  const stoneG = new THREE.CylinderGeometry(.42, .48, .12, 7), stoneM = flat('#b9aa8a');
  for (let k = 0; k < samples.length; k += 2) {
    const p = samples[k], s = new THREE.Mesh(stoneG, stoneM);
    s.position.set(p.x + (R() - .5) * .5, .05, p.z); s.rotation.y = R() * 3; s.receiveShadow = true; scene.add(s);
  }

  // decorations: snowy pines, round trees, rocks, a few houses; kept away from the path
  const pineM = flat('#24543a'), snowM = flat('#eef3ff'), trunkM = flat('#5b3b26'), rockM = flat('#7d8496'), leafM = flat(new THREE.Color(accent[1]).lerp(new THREE.Color('#2e6b3a'), .5));
  const roofM = flat(new THREE.Color(accent[0]).lerp(new THREE.Color('#8b2e2e'), .5)), wallM = flat('#e8dcc6'), winM = new THREE.MeshBasicMaterial({ color: '#ffd36b' });
  const place = (obj, x, z) => { obj.position.set(x, groundY(x, z), z); obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(obj); };
  for (let k = 0; k < N * 9 + 20; k++) {
    const x = (R() - .5) * (gw - 6), z = 10 - R() * (len - 4);
    if (distPath(x, z) < 2.6) continue;
    const t = R(), g = new THREE.Group();
    if (t < .5) {
      const s = .7 + R() * .7;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, .6, 6), trunkM); tr.position.y = .3; g.add(tr);
      for (let j = 0; j < 3; j++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(1 - j * .25, 1.1, 7), pineM); c.position.y = .9 + j * .55; g.add(c);
        const sc = new THREE.Mesh(new THREE.ConeGeometry((1 - j * .25) * .55, .45, 7), snowM); sc.position.y = 1.25 + j * .55; g.add(sc);
      }
      g.scale.setScalar(s);
    } else if (t < .75) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.12, .18, .8, 6), trunkM); tr.position.y = .4; g.add(tr);
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 0), leafM); c.position.y = 1.3; g.add(c);
      g.scale.setScalar(.8 + R() * .5);
    } else if (t < .93) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.4 + R() * .5, 0), rockM); r.position.y = .2; r.rotation.set(R(), R(), R()); g.add(r);
    } else {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.3), wallM); w.position.y = .55; g.add(w);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, .9, 4), roofM); roof.position.y = 1.55; roof.rotation.y = Math.PI / 4; g.add(roof);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(.35, .35), winM); win.position.set(0, .6, .66); g.add(win);
      g.rotation.y = R() * 6;
    }
    place(g, x, z);
  }

  // shrines
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd36b', emissive: '#a8751a', emissiveIntensity: .6, metalness: .6, roughness: .3, flatShading: true });
  const blue = new THREE.MeshStandardMaterial({ color: '#9cc8ff', emissive: '#3d7dff', emissiveIntensity: 1.4, flatShading: true });
  const grey = flat('#6d7385'), stone = flat('#9aa1b3'), lanternM = new THREE.MeshBasicMaterial({ color: '#ffc85c' });
  const pick = [], spin = [];
  const label = (txt, color) => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
    const x = cv.getContext('2d'); x.font = 'bold 40px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 8; x.strokeStyle = 'rgba(10,14,30,.85)'; x.strokeText(txt, 64, 34); x.fillStyle = color; x.fillText(txt, 64, 34);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true }));
    s.scale.set(1.6, .8, 1); return s;
  };
  nodes.forEach((n, i) => {
    const p = at(i), g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, .35, 8), n.state === 'lock' ? grey : stone); base.position.y = .17; g.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.75, .9, .2, 8), n.state === 'lock' ? grey : stone); top.position.y = .45; g.add(top);
    if (n.state === 'done') {
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.42, 0), gold); cr.position.y = 1.25; g.add(cr); spin.push(cr);
    } else if (n.state === 'cur') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.85, .09, 10, 32), blue); ring.position.y = 1.45; g.add(ring); spin.push(ring);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.36, 0), blue); cr.position.y = 1.45; g.add(cr); spin.push(cr);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .9, 8, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#7fb0ff', transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 4.4; g.add(beam);
      const pl = new THREE.PointLight('#7fb0ff', 14, 9, 1.6); pl.position.y = 1.6; g.add(pl);
    } else {
      const lk = new THREE.Mesh(new THREE.BoxGeometry(.42, .36, .2), grey); lk.position.y = .8; g.add(lk);
      const sh = new THREE.Mesh(new THREE.TorusGeometry(.14, .05, 6, 12, Math.PI), grey); sh.position.y = .98; g.add(sh);
    }
    // a lantern beside every shrine
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 1.3, 6), trunkM); post.position.set(1.5, .65, .2); g.add(post);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.28, .3, .28), lanternM); lamp.position.set(1.5, 1.4, .2); g.add(lamp);
    if (n.state !== 'lock') { const ll = new THREE.PointLight('#ffb347', 4, 5, 2); ll.position.set(1.5, 1.4, .2); g.add(ll); }
    const lb = label(String(i + 1), n.state === 'done' ? '#ffd36b' : n.state === 'cur' ? '#cfe2ff' : '#9aa1b3'); lb.position.y = 2.6; g.add(lb);
    g.position.copy(p); g.userData.i = i;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.i = i; } });
    scene.add(g); pick.push(g);
  });
  // the end: a little castle gate with a flag
  { const g = new THREE.Group(), p = at(N);
    for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.6, .7, 3.4, 8), stone); t.position.set(s * 1.7, 1.7, 0); g.add(t);
      const r = new THREE.Mesh(new THREE.ConeGeometry(.8, 1.1, 8), roofM); r.position.set(s * 1.7, 3.95, 0); g.add(r); }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(2.8, .6, .8), stone); arch.position.y = 2.6; g.add(arch);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.4, 6), trunkM); pole.position.set(0, 3.6, 0); g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5), new THREE.MeshStandardMaterial({ color: accent[0], side: THREE.DoubleSide })); flag.position.set(.4, 4.05, 0); g.add(flag); spin.push({ flag });
    g.position.copy(p); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); }

  // the hero, standing by the current shrine
  const cur = Math.max(0, nodes.findIndex(n => n.state === 'cur'));
  const me = hero(heroStyle);
  let heroT = cur, heroGoal = cur;
  { const p = at(cur); me.position.set(p.x, 0, p.z + 1.6); me.rotation.set(0, 0, 0); scene.add(me); }

  // camera: follows a focus point along the path; drag to move it
  let focus = cur, vel = 0, drag = null, moved = 0;
  const camAt = () => {
    const p = at(Math.max(-.6, Math.min(N, focus)));
    cam.position.set(p.x * .6, 4.3, p.z + 8.6);
    cam.lookAt(p.x * .85, 1.3, p.z - 1.5);
    moon.position.set(p.x - 8, 16, p.z + 6); moon.target.position.set(p.x, 0, p.z);
  };
  const cvs = renderer.domElement;
  cvs.style.touchAction = 'none';
  cvs.addEventListener('pointerdown', e => { drag = { y: e.clientY, x: e.clientX, f: focus }; moved = 0; vel = 0; cvs.setPointerCapture(e.pointerId); });
  cvs.addEventListener('pointermove', e => {
    if (!drag) return;
    const dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dy) + Math.abs(e.clientX - drag.x));
    const nf = drag.f + dy / 120; vel = nf - focus; focus = nf;
  });
  const up = e => {
    if (!drag) return;
    const wasTap = moved < 8; drag = null;
    if (!wasTap) return;
    const r = cvs.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, cam);
    const hit = ray.intersectObjects(pick, true).find(h => h.object.userData.i !== undefined);
    if (hit) tap(hit.object.userData.i);
  };
  cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', () => { drag = null; });

  // tapping a shrine: the hero walks there; on arrival, the card for that episode opens
  let arrive = null;
  function tap(i) {
    const n = nodes[i];
    if (n.state === 'lock') { opt.onLocked && opt.onLocked(i); return; }
    heroGoal = i; focus = i; arrive = () => onOpen && onOpen(n.key, i);
    if (Math.abs(heroGoal - heroT) < .05) { arrive(); arrive = null; }
  }

  const clock = new THREE.Clock();
  let raf = 0, alive = true;
  const resize = () => { renderer.setSize(W(), Hh()); cam.aspect = W() / Hh(); cam.updateProjectionMatrix(); };
  addEventListener('resize', resize);
  function frame() {
    if (!alive) return;
    if (!el.isConnected) return dispose();
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    if (!drag) { focus += vel; vel *= .9; }
    focus = Math.max(-.6, Math.min(N, focus));
    camAt();
    // hero walk
    const d = heroGoal - heroT, walking = Math.abs(d) > .01;
    if (walking) { heroT += Math.sign(d) * Math.min(Math.abs(d), dt * 1.6); }
    else if (arrive) { const a = arrive; arrive = null; a(); }
    const p = at(heroT), q = at(heroT + (d >= 0 ? .05 : -.05));
    me.position.set(p.x, 0, p.z + 1.6);
    const ang = Math.atan2(q.x - p.x, q.z - p.z);
    me.rotation.y = walking ? ang : me.rotation.y + ((0) - me.rotation.y) * .08;   // face the camera when standing
    const { body, limbs } = me.userData, sw = walking ? Math.sin(t * 12) * .7 : 0;
    limbs.ll.rotation.x = sw; limbs.lr.rotation.x = -sw; limbs.al.rotation.x = -sw * .8; limbs.ar.rotation.x = sw * .8;
    body.position.y = walking ? Math.abs(Math.sin(t * 12)) * .12 : Math.sin(t * 2.2) * .04;
    if (!walking) { limbs.ar.rotation.z = .18 + Math.max(0, Math.sin(t * 1.3)) * .12; }
    for (const s of spin) { if (s.flag) s.flag.rotation.y = Math.sin(t * 3) * .3; else { s.rotation.y += dt * 1.2; s.position.y += Math.sin(t * 2) * .002; } }
    water.material.opacity = .9 + Math.sin(t) * .03;
    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  }
  function dispose() {
    alive = false; cancelAnimationFrame(raf); removeEventListener('resize', resize);
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
    renderer.dispose(); renderer.domElement.remove();
  }
  frame();
  return { dispose, focus: i => { focus = i; } };
}

export const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };
