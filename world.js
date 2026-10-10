import * as T from 'three';
import { mergeGeometries as merge } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const hash = (x, z) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = ss(0, 1, x - ix), fz = ss(0, 1, z - iz), a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; };
const fbm = (x, z) => { let s = 0, a = .5; for (let i = 0; i < 4; i++) { s += vn(x, z) * a; x *= 2; z *= 2; a /= 2; } return s; };
export const LAKE = { x: -70, z: -50 }, VIL = { x: 70, z: 20 }, WF = { x: -20, z: -150 }, LH = { x: 60, z: 132 }, MEA = { x: -100, z: 60 };
const la = .3;
export const SP = {
  lake: { x: LAKE.x + Math.cos(la) * 56, z: LAKE.z + Math.sin(la) * 56, fx: LAKE.x, fz: LAKE.z },
  forest: { x: -20, z: -124, fx: -20, fz: -150 },
  village: { x: 70, z: 40, fx: 70, fz: 15 },
  coast: { x: 30, z: 118, fx: 30, fz: 200 },
  meadow: { x: MEA.x, z: MEA.z, fx: -60, fz: 100 },
};
export function H(x, z) {
  const n = fbm(x / 110, z / 110);
  let h = Math.max(.5, 1.5 + (n - .4) * 30);
  const sea = ss(120, 190, z);
  h += ss(170, 300, Math.hypot(x, z)) * (1 - sea) * (50 + n * 60);
  h = h * (1 - sea) - 6 * sea;
  const l = ss(55, 25, Math.hypot(x - LAKE.x, z - LAKE.z)); h = h * (1 - l) - 4 * l;
  const v = ss(45, 28, Math.hypot(x - VIL.x, z - VIL.z)); h = h * (1 - v) + 2 * v;
  return h;
}
export const uTime = { value: 0 };
// ground height for walking: the dock deck is walkable over the water
export const G = (x, z) => { const dx = x - LAKE.x, dz = z - LAKE.z, u = dx * Math.cos(la) + dz * Math.sin(la), v = -dx * Math.sin(la) + dz * Math.cos(la); return u > 25.5 && u < 48 && Math.abs(v) < 1.3 ? -.45 : H(x, z); };
function sway(mat, amp) {
  mat.onBeforeCompile = s => {
    s.uniforms.uT = uTime;
    s.vertexShader = 'uniform float uT;\n' + s.vertexShader.replace('#include <begin_vertex>',
      `vec3 transformed=position;float w=sin(uT*1.6+instanceMatrix[3].x*.4+instanceMatrix[3].z*.3)*${amp}*max(position.y,0.);transformed.x+=w;transformed.z+=w*.6;`);
  };
}
const M = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: .9, ...o });
const G0 = { spring: 0x6fae4e, summer: 0x4f8f3a, autumn: 0x9a8a3a, winter: 0xe6eef2 };

export function buildTerrain() {
  const g = new T.PlaneGeometry(700, 700, 200, 200).rotateX(-Math.PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const col = new T.BufferAttribute(new Float32Array(p.count * 3), 3); g.setAttribute('color', col);
  const mat = M(0xffffff, { vertexColors: true, roughness: .95 }), mesh = new T.Mesh(g, mat); mesh.receiveShadow = true;
  const c = new T.Color(), gc = new T.Color(), rock = new T.Color(0x7d7a74), sand = new T.Color(0xd8c590), snow = new T.Color(0xf2f5f8);
  mesh.userData.paint = s => {
    gc.set(G0[s]);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), ny = g.attributes.normal.getY(i), v = hash(p.getX(i) * .7, p.getZ(i) * .7) * .18;
      c.copy(gc).multiplyScalar(.85 + v);
      if (y < .6) c.copy(sand).multiplyScalar(.85 + v);
      c.lerp(rock, Math.max(ss(.82, .65, ny), ss(35, 50, y)));
      c.lerp(snow, s === 'winter' ? ss(30, 45, y) : ss(62, 80, y));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  };
  mesh.userData.paint('summer');
  return mesh;
}

export function buildSky(scene) {
  const u = { top: { value: new T.Color() }, bot: { value: new T.Color() } };
  const dome = new T.Mesh(new T.SphereGeometry(1000, 16, 10), new T.ShaderMaterial({ uniforms: u, side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top,bot;varying vec3 vP;void main(){gl_FragColor=vec4(mix(bot,top,smoothstep(-.05,.6,normalize(vP).y)),1.);#include <colorspace_fragment>\n}' }));
  dome.renderOrder = -2; dome.frustumCulled = false;
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) { const a = Math.random() * 6.283, e = Math.acos(Math.random()) * .98; sp.set([Math.cos(a) * Math.sin(e) * 900, Math.cos(e) * 900, Math.sin(a) * Math.sin(e) * 900], i * 3); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({ size: 2.2, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false })); stars.frustumCulled = false;
  const sun = new T.Mesh(new T.SphereGeometry(28, 12, 8), new T.MeshBasicMaterial({ color: 0xfff1c8, fog: false })); sun.frustumCulled = false;
  const cm = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, fog: false, depthWrite: false }), clouds = [];
  for (let i = 0; i < 12; i++) {
    const c = new T.Group(); for (let j = 0; j < 5; j++) { const s = new T.Mesh(new T.SphereGeometry(1, 8, 6), cm); s.position.set((j - 2) * 1.1, Math.random() * .3, Math.random() - .5); s.scale.set(1.3, .6, 1); c.add(s); }
    c.scale.setScalar(25 + Math.random() * 25); c.position.set((Math.random() - .5) * 900, 110 + Math.random() * 40, (Math.random() - .5) * 900); clouds.push(c); scene.add(c);
  }
  scene.add(dome, stars, sun);
  return { u, dome, stars, sun, cm, clouds };
}

export function buildWorld(scene, Q) {
  const W = { circ: [], trees: new Map(), benches: [], pois: [], win: [], lamp: [], roadPts: [], anim: [], flames: null };
  const add = (o, x, z, y = 0) => { o.position.set(x, H(x, z) + y, z); scene.add(o); return o; };
  W.near = (x, z, r) => W.roadPts.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r);
  W.hit = (p, r) => {
    let hit = false;
    const chk = (x, z, rr) => { const dx = p.x - x, dz = p.z - z, m = r + rr, d2 = dx * dx + dz * dz; if (d2 < m * m) { const d = Math.sqrt(d2) || .01; p.x = x + dx / d * m; p.z = z + dz / d * m; hit = true; } };
    for (const c of W.circ) chk(c.x, c.z, c.r);
    const cx = Math.floor(p.x / 10), cz = Math.floor(p.z / 10);
    for (let i = -1; i < 2; i++) for (let j = -1; j < 2; j++) { const a = W.trees.get((cx + i) + ',' + (cz + j)); if (a) for (const t of a) chk(t[0], t[1], .5); }
    return hit;
  };
  // water
  const wm = (c, o) => new T.MeshStandardMaterial({ color: c, roughness: .12, metalness: .25, transparent: true, opacity: .86, ...o });
  const lake = new T.Mesh(new T.CircleGeometry(62, 48).rotateX(-Math.PI / 2), wm(0x3a9fb4)); lake.position.set(LAKE.x, -1, LAKE.z); scene.add(lake);
  const og = new T.PlaneGeometry(900, 420, 70, 36).rotateX(-Math.PI / 2), ocean = new T.Mesh(og, wm(0x24819f)); ocean.position.set(0, -1, 330); scene.add(ocean);
  const op = og.attributes.position, ox = [], oz = []; for (let i = 0; i < op.count; i++) { ox.push(op.getX(i)); oz.push(op.getZ(i)); }
  W.anim.push(t => { for (let i = 0; i < op.count; i++) op.setY(i, Math.sin(ox[i] * .07 + t * 1.2) * .25 + Math.cos(oz[i] * .1 + t * .9) * .22); op.needsUpdate = true; lake.position.y = -1 + Math.sin(t * .8) * .02; });
  // roads
  const roadMat = M(0x9a8e78, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const strip = run => {
    const pos = [], idx = [];
    run.forEach((p, i) => { const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l * 2.6, nz = tx / l * 2.6;
      for (const s of [1, -1]) { const x = p.x + nx * s, z = p.z + nz * s; pos.push(x, H(x, z) + .06, z); } if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, roadMat); m.receiveShadow = true; scene.add(m);
  };
  const road = pts => {
    const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], 0, p[1]))), P = c.getSpacedPoints(Math.ceil(c.getLength() / 3)); let run = [];
    for (const p of P) { if (H(p.x, p.z) > -.2) { run.push(p); W.roadPts.push(p); } else { if (run.length > 1) strip(run); run = []; } }
    if (run.length > 1) strip(run);
  };
  road([[-20, -122], [-35, -85], [-35, -32], [0, -10], [70, 20], [45, 80], [30, 118], [62, 126]]);
  road([[0, -10], [-50, 30], [-100, 60]]); road([[70, 20], [120, -10], [125, -45]]);
  // props
  const house = (x, z, w, d, h, wall, roof, rot = 0) => {
    const g = new T.Group(), b = new T.Mesh(new T.BoxGeometry(w, h, d), M(wall)); b.position.y = h / 2;
    const r = new T.Mesh(new T.ConeGeometry(w * .78, h * .6, 4), M(roof)); r.rotation.y = Math.PI / 4; r.scale.z = d / w; r.position.y = h * 1.3;
    const ch = new T.Mesh(new T.BoxGeometry(.5, h * .5, .5), M(0x6b5a50)); ch.position.set(w * .25, h * 1.3, 0);
    g.add(b, r, ch);
    for (const s of [-1, 1]) { const m = M(0x222222, { emissive: 0xffc870, emissiveIntensity: 0 }); W.win.push(m); const wn = new T.Mesh(new T.PlaneGeometry(1, 1.1), m); wn.position.set(s * w * .27, h * .55, d / 2 + .02); g.add(wn); }
    const dr = new T.Mesh(new T.PlaneGeometry(1, 1.9), M(0x4a3426)); dr.position.set(0, .95, d / 2 + .03); g.add(dr);
    g.traverse(o => o.isMesh && (o.castShadow = true)); g.rotation.y = rot; add(g, x, z); W.circ.push({ x, z, r: Math.max(w, d) / 2 + .8 }); return g;
  };
  const bench = (x, z, yaw) => {
    const g = new T.Group(), s = new T.Mesh(new T.BoxGeometry(1.8, .12, .5), M(0x7a5a3a)), b = new T.Mesh(new T.BoxGeometry(1.8, .5, .08), M(0x7a5a3a));
    s.position.y = .5; b.position.set(0, .8, .25); g.add(s, b); for (const k of [-.8, .8]) { const l = new T.Mesh(new T.BoxGeometry(.1, .5, .45), M(0x333333)); l.position.set(k, .25, 0); g.add(l); }
    g.rotation.y = yaw; add(g, x, z); W.benches.push({ x, z, yaw });
  };
  const lamp = (x, z) => { const g = new T.Group(), p = new T.Mesh(new T.CylinderGeometry(.06, .08, 3.6, 6), M(0x2b2b2b)); p.position.y = 1.8; const m = M(0x222222, { emissive: 0xffd28a, emissiveIntensity: 0 }); W.lamp.push(m); const b = new T.Mesh(new T.SphereGeometry(.25, 8, 6), m); b.position.y = 3.7; g.add(p, b); add(g, x, z); };
  const walls = [0xe8d9c0, 0xd9b99b, 0xc9d6cf, 0xe6c9c0, 0xf0e6d0], roofs = [0x8a3d32, 0x5d4037, 0x4b6b5a, 0x7a4a2a];
  [[50, 10, 0], [88, 6, -.2], [60, 40, .1], [92, 34, -.4], [48, 30, .3], [100, 28, 0], [78, 50, 0]].forEach(([x, z, r], i) => house(x, z, 5 + i % 3, 4.5, 3.2, walls[i % 5], roofs[i % 4], r));
  const cafe = house(76, 12, 8, 5, 3.6, 0xf2e2c2, 0x2f6b5a); const aw = new T.Mesh(new T.BoxGeometry(8.4, .15, 1.6), M(0xc44a3a)); aw.position.set(0, 2.6, 3.2); cafe.add(aw);
  const bus = new T.Mesh(new T.BoxGeometry(3, 2.4, 1.2), M(0x6b8e9a)); add(bus, 64, 26, 1.2); bus.castShadow = true;
  [[56, 20], [66, 14], [82, 18], [72, 30], [88, 24], [58, 34]].forEach(p => lamp(...p));
  bench(62, 30, 0); bench(36, 124, Math.PI); bench(SP.lake.x - 2, SP.lake.z + 3, Math.atan2(-(SP.lake.x - LAKE.x), -(SP.lake.z - LAKE.z)));
  // farm, windmill
  house(110, -38, 8, 6, 4, 0xa8432f, 0x4a3a30, .3);
  const wmL = new T.Group(), tw = new T.Mesh(new T.CylinderGeometry(1.6, 2.6, 10, 8), M(0xe6dccb)), rf = new T.Mesh(new T.ConeGeometry(2.2, 3, 8), M(0x7a4a2a)); tw.position.y = 5; rf.position.y = 11.5;
  const bl = new T.Group(); for (let i = 0; i < 4; i++) { const b = new T.Mesh(new T.BoxGeometry(.5, 8, .1), M(0xf5f0e6)); b.position.y = 4; const a = new T.Group(); a.rotation.z = i * Math.PI / 2; a.add(b); bl.add(a); } bl.position.set(0, 9.5, 2.3);
  wmL.add(tw, rf, bl); wmL.traverse(o => o.isMesh && (o.castShadow = true)); add(wmL, 125, -55); W.circ.push({ x: 125, z: -55, r: 3.4 }); W.anim.push((t, dt) => { bl.rotation.z += dt * .5; });
  // lighthouse
  const lh = new T.Group(); for (let i = 0; i < 4; i++) { const c = new T.Mesh(new T.CylinderGeometry(2 - i * .22, 2.2 - i * .22, 3, 12), M(i % 2 ? 0xc43a30 : 0xf5f0e6)); c.position.y = 1.5 + i * 3; lh.add(c); }
  const lm = M(0x222222, { emissive: 0xffe0a0, emissiveIntensity: 0 }), lan = new T.Mesh(new T.CylinderGeometry(1, 1, 1.6, 10), lm); lan.position.y = 12.8; const lr = new T.Mesh(new T.ConeGeometry(1.5, 1.6, 10), M(0xc43a30)); lr.position.y = 14.4; lh.add(lan, lr);
  lh.traverse(o => o.isMesh && (o.castShadow = true)); add(lh, LH.x, LH.z); W.circ.push({ x: LH.x, z: LH.z, r: 2.8 }); W.lhMat = lm;
  // lake: dock, cabin, campfire
  const lp = (a, d) => [LAKE.x + Math.cos(a) * d, LAKE.z + Math.sin(a) * d];
  const dock = new T.Mesh(new T.BoxGeometry(2.6, .2, 22), M(0x8a6a48)); dock.rotation.y = Math.PI / 2 - la; dock.position.set(...lp(la, 37).slice(0, 1), -.45, lp(la, 37)[1]); scene.add(dock); dock.receiveShadow = true;
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const [x, z] = lp(la, 28 + i * 4); const px = x + Math.sin(la) * 1.2 * s, pz = z - Math.cos(la) * 1.2 * s; const p = new T.Mesh(new T.CylinderGeometry(.1, .1, 1.6, 6), M(0x5a4a3a)); p.position.set(px, -.6, pz); scene.add(p); }
  const [cx, cz] = lp(-.7, 53); house(cx, cz, 6, 5, 3, 0x8a6a48, 0x4a3a30, 1.2);
  const [fx, fz] = lp(-.5, 50), fire = new T.Group(), fm = new T.MeshBasicMaterial({ color: 0xff9a3a }), fl = [];
  for (let i = 0; i < 3; i++) { const c = new T.Mesh(new T.ConeGeometry(.25, .8, 6), fm); c.position.set((i - 1) * .15, .4, 0); fire.add(c); fl.push(c); }
  const fli = new T.PointLight(0xff9a4a, 40, 22, 2); fli.position.y = 1; fire.add(fli); add(fire, fx, fz); W.anim.push(t => { fl.forEach((c, i) => c.scale.set(1, .8 + Math.sin(t * 9 + i * 2) * .3, 1)); fli.intensity = 30 + Math.sin(t * 13) * 8; });
  // picnic
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx2 = cv.getContext('2d'); cx2.fillStyle = '#f2ece0'; cx2.fillRect(0, 0, 64, 64); cx2.fillStyle = '#c4473a'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) cx2.fillRect(i * 16, j * 16, 16, 16);
  const bt = new T.CanvasTexture(cv); bt.colorSpace = T.SRGBColorSpace; const bk = new T.Mesh(new T.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), M(0xffffff, { map: bt })); add(bk, MEA.x + 8, MEA.z - 2, .08);
  const bas = new T.Mesh(new T.BoxGeometry(.5, .3, .35), M(0x9a6a3a)); add(bas, MEA.x + 8.4, MEA.z - 2, .25);
  // waterfall
  const wg = H(WF.x, WF.z), cliff = new T.Mesh(new T.BoxGeometry(18, 26, 10), M(0x6f6c66)); cliff.position.set(WF.x, wg + 11, WF.z); scene.add(cliff); cliff.castShadow = true; W.circ.push({ x: WF.x, z: WF.z, r: 9 });
  const fc = document.createElement('canvas'); fc.width = 64; fc.height = 256; const f2 = fc.getContext('2d'); for (let i = 0; i < 40; i++) { f2.fillStyle = `rgba(255,255,255,${.2 + Math.random() * .6})`; f2.fillRect(Math.random() * 64, 0, 2 + Math.random() * 4, 256); }
  const ft = new T.CanvasTexture(fc); ft.wrapS = ft.wrapT = T.RepeatWrapping; const fall = new T.Mesh(new T.PlaneGeometry(5, 24), new T.MeshBasicMaterial({ map: ft, transparent: true, opacity: .85, depthWrite: false })); fall.position.set(WF.x, wg + 11, WF.z + 5.1); scene.add(fall);
  const pool = new T.Mesh(new T.CircleGeometry(9, 24).rotateX(-Math.PI / 2), wm(0x4fb0c0)); pool.position.set(WF.x, wg + .15, WF.z + 12); scene.add(pool);
  const mist = new T.Mesh(new T.SphereGeometry(5, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .18, depthWrite: false })); mist.position.set(WF.x, wg + 1.5, WF.z + 8); mist.scale.y = .5; scene.add(mist);
  W.anim.push(t => { ft.offset.y = -t * 1.4; mist.scale.setScalar(1 + Math.sin(t) * .06); mist.scale.y = .5; });
  // trees
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pineF = merge([new T.ConeGeometry(2.4, 5.5, 7).translate(0, 4.2, 0), new T.ConeGeometry(1.7, 4.2, 7).translate(0, 6.8, 0)]);
  const broadF = new T.IcosahedronGeometry(2.3, 1).scale(1, .9, 1).translate(0, 4.4, 0), trunkG = new T.CylinderGeometry(.22, .32, 2.6, 6).translate(0, 1.3, 0);
  const pm = M(0x25592f), bm = M(0x3f8f3a), tm = M(0x5a4030), gm = M(0x5c9a3e, { side: T.DoubleSide }); sway(pm, .012); sway(bm, .01); sway(gm, .06);
  const pines = [], broads = [], mt = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), ps = new T.Vector3();
  const spawns = Object.values(SP);
  for (let i = 0; i < 14000 && pines.length + broads.length < 1000; i++) {
    const x = (rnd() - .5) * 580, z = (rnd() - .5) * 580, y = H(x, z); if (y < .8 || y > 38) continue;
    const fd = fbm(x / 45 + 7, z / 45 - 3) + (Math.hypot(x - WF.x, z - WF.z) < 70 ? .25 : 0);
    if (fd < .52 || rnd() > (fd - .5) * 6 + .3) continue;
    if (Math.hypot(x - VIL.x, z - VIL.z) < 38 || Math.hypot(x - MEA.x, z - MEA.z) < 40 || Math.hypot(x - WF.x, z - WF.z) < 17 || spawns.some(p => Math.hypot(x - p.x, z - p.z) < 10) || W.near(x, z, 5)) continue;
    const k = rnd() > .7, size = k ? .8 + rnd() * .5 : .8 + rnd() * .8; e.set(0, rnd() * 6.28, 0); q.setFromEuler(e); mt.compose(ps.set(x, y - .1, z), q, sc.setScalar(size));
    (k ? broads : pines).push(mt.clone());
    const key = Math.floor(x / 10) + ',' + Math.floor(z / 10); (W.trees.get(key) || W.trees.set(key, []).get(key)).push([x, z]);
  }
  const inst = (g, m, arr, shadow) => { const im = new T.InstancedMesh(g, m, arr.length); arr.forEach((a, i) => im.setMatrixAt(i, a)); im.castShadow = shadow; im.userData.n = arr.length; scene.add(im); return im; };
  const pI = inst(pineF, pm, pines, true), bI = inst(broadF, bm, broads, true), tI = inst(trunkG, tm, pines, false), tJ = inst(trunkG, tm, broads, false);
  const col = new T.Color(); pines.forEach((_, i) => pI.setColorAt(i, col.setScalar(.8 + rnd() * .4))); broads.forEach((_, i) => bI.setColorAt(i, col.setHSL(rnd() * .08, .0, .8 + rnd() * .4).setRGB(.8 + rnd() * .3, .8 + rnd() * .3, .8 + rnd() * .2)));
  // grass, flowers, rocks, lilies
  const gA = []; for (let i = 0; i < 12000 && gA.length < 6000; i++) { const x = (rnd() - .5) * 320, z = (rnd() - .5) * 320, y = H(x, z); if (y < .7 || y > 28 || Math.hypot(x - VIL.x, z - VIL.z) < 24 || W.near(x, z, 3.2)) continue; mt.compose(ps.set(x, y, z), q.setFromEuler(e.set(0, rnd() * 6, 0)), sc.setScalar(.7 + rnd() * .8)); gA.push(mt.clone()); }
  const grass = inst(new T.ConeGeometry(.12, .8, 3).translate(0, .4, 0), gm, gA, false);
  const fA = [], pal = [0xf4d35e, 0xee6c8a, 0xffffff, 0xa77bd8, 0xf08a4b];
  for (let i = 0; i < 1500; i++) { const m = i < 1100, x = m ? MEA.x + (rnd() - .5) * 110 : (rnd() - .5) * 240, z = m ? MEA.z + (rnd() - .5) * 110 : (rnd() - .5) * 240, y = H(x, z); if (y < .7 || y > 25 || W.near(x, z, 3)) { continue; } mt.compose(ps.set(x, y + .25, z), q.identity(), sc.setScalar(.8 + rnd() * .6)); fA.push(mt.clone()); }
  const flow = inst(new T.IcosahedronGeometry(.16, 0), M(0xffffff), fA, false); fA.forEach((_, i) => flow.setColorAt(i, col.set(pal[i % 5])));
  const rA = []; for (let i = 0; i < 4000 && rA.length < 160; i++) { const x = (rnd() - .5) * 400, z = (rnd() - .5) * 400, y = H(x, z), dl = Math.hypot(x - LAKE.x, z - LAKE.z); if (!((dl > 36 && dl < 52) || (z > 128 && z < 150)) || y < -1.2 || y > 2.5) continue; mt.compose(ps.set(x, y, z), q.setFromEuler(e.set(rnd(), rnd() * 6, 0)), sc.set(.6 + rnd() * 1.6, .4 + rnd() * .8, .6 + rnd() * 1.4)); rA.push(mt.clone()); }
  inst(new T.DodecahedronGeometry(1, 0), M(0x7a7872), rA, true);
  const lA = []; for (let i = 0; i < 70; i++) { const a = rnd() * 6.28, d = 8 + rnd() * 18; mt.compose(ps.set(LAKE.x + Math.cos(a) * d, -.96, LAKE.z + Math.sin(a) * d), q.identity(), sc.setScalar(.7 + rnd() * .6)); lA.push(mt.clone()); }
  inst(new T.CircleGeometry(.6, 8).rotateX(-Math.PI / 2), M(0x4f8f4a), lA, false);
  // POIs
  W.pois = [['the lakeside dock', ...lp(la, 36)], ['the waterfall', WF.x, WF.z + 14], ['the lighthouse', LH.x, LH.z], ['the windmill', 125, -55], ['the village café', 76, 18], ['a campfire by the cabin', fx, fz], ['the picnic spot', MEA.x + 8, MEA.z - 2]].map(([n, x, z]) => ({ n, x, z }));
  W.set = { pineMat: pm, broadMat: bm, grassMat: gm, pI, bI, tI, tJ, grass, flow };
  W.count = f => { pI.count = Math.floor(pI.userData.n * f); bI.count = Math.floor(bI.userData.n * f); tI.count = pI.count; tJ.count = bI.count; };
  return W;
}
