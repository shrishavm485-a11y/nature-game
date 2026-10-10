import './style.css';
import * as T from 'three';
import { H, G, SP, LAKE, VIL, WF, ss, uTime, buildTerrain, buildSky, buildWorld } from './world.js';
import { createAudio } from './audio.js';

const $ = s => document.querySelector(s), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const touch = matchMedia('(pointer:coarse)').matches, KEY = 'serenity.v1';
const S = Object.assign({ vol: { master: .8, nature: 1, vehicle: .7, music: .35 }, quality: touch ? 'medium' : 'high', time: 'afternoon', weather: 'clear', season: 'summer', vehicle: 'foot', cam: 'third', fav: [], found: [], loc: 'lake' }, (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { } };
const QL = { low: { dpr: .8, sh: 0, tr: .35, gr: .25 }, medium: { dpr: 1.25, sh: 1024, tr: .7, gr: .6 }, high: { dpr: 2, sh: 2048, tr: 1, gr: 1 } };
const TOD = {
  morning: { n: 'Early morning', top: 0x6fa6d8, bot: 0xf6d2a6, fog: 0xdccdb6, sun: 0xffd7a0, si: 1.5, el: 18, le: 18, hi: .7, nt: 0 },
  afternoon: { n: 'Bright afternoon', top: 0x3d8fe0, bot: 0xbfe0f5, fog: 0xc4dded, sun: 0xffffff, si: 2.6, el: 62, le: 62, hi: .9, nt: 0 },
  golden: { n: 'Golden hour', top: 0x5f95c9, bot: 0xf2c27a, fog: 0xe5c595, sun: 0xffc27a, si: 2.1, el: 12, le: 12, hi: .75, nt: 0 },
  sunset: { n: 'Sunset', top: 0x3b4a8c, bot: 0xff7f5a, fog: 0xc98275, sun: 0xff7a4a, si: 1.4, el: 2, le: 6, hi: .55, nt: .15 },
  blue: { n: 'Blue hour', top: 0x14234f, bot: 0x5a73ab, fog: 0x3d4d7c, sun: 0x7f99ff, si: .45, el: -4, le: 25, hi: .4, nt: .6 },
  night: { n: 'Starry night', top: 0x030614, bot: 0x0f1c38, fog: 0x0b1428, sun: 0x7f93d6, si: .35, el: -30, le: 45, hi: .3, nt: 1 },
};
const WX = { clear: { n: 'Clear', g: 0, d: 0, f: .0028, r: 0, w: 0 }, cloudy: { n: 'Cloudy', g: .5, d: .45, f: .0035, r: 0, w: .4 }, mist: { n: 'Misty', g: .4, d: .2, f: .009, r: 0, w: .1 }, fog: { n: 'Light fog', g: .5, d: .3, f: .006, r: 0, w: .1 }, rain: { n: 'Gentle rain', g: .6, d: .5, f: .005, r: 1, w: .5 }, storm: { n: 'Distant thunder', g: .75, d: .7, f: .006, r: 1, w: 1 } };
const LOCS = { lake: 'Mountain Lake', forest: 'Waterfall Forest', village: 'Peaceful Village', coast: 'Ocean Coast', meadow: 'Flower Meadow' };
const SEAS = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

// ---------- renderer / scene ----------
const fail = (msg, reload) => { const e = $('#err'); e.hidden = false; e.innerHTML = `<h2>${msg}</h2>${reload ? '<button class="big" id="retry">Try again</button>' : ''}`; $('#retry')?.addEventListener('click', () => location.reload()); };
let R; try { R = new T.WebGLRenderer({ canvas: $('#c'), antialias: !touch, powerPreference: 'high-performance' }); } catch { fail('Serenity needs WebGL, which this browser or device does not support.', true); }
const scene = new T.Scene(), cam = new T.PerspectiveCamera(65, 1, .3, 1600); cam.rotation.order = 'YXZ';
if (R) { R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = .95; }
scene.fog = new T.FogExp2(0xc4dded, .003);
const hemi = new T.HemisphereLight(0xffffff, 0x4a5a3a, .9), sun = new T.DirectionalLight(0xffffff, 2);
sun.shadow.camera.left = sun.shadow.camera.bottom = -50; sun.shadow.camera.right = sun.shadow.camera.top = 50; sun.shadow.camera.far = 320; sun.shadow.bias = -.0004; sun.shadow.normalBias = .05;
scene.add(hemi, sun, sun.target, cam);
let W, terrain, sky, audio, built = false, rain, pollen, flies;

// ---------- vehicles ----------
const mat = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: .6, ...o });
function mkBike() {
  const g = new T.Group(), wheels = [], wg = new T.TorusGeometry(.34, .035, 6, 18).rotateY(Math.PI / 2);
  for (const z of [-.55, .55]) { const w = new T.Mesh(wg, mat(0x222222)); w.position.set(0, .37, z); g.add(w); wheels.push(w); }
  const bx = (w, h, d, c, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  bx(.05, .05, 1.1, 0x2f7f86, 0, .6, 0); bx(.05, .5, .05, 0x2f7f86, 0, .6, .25).rotation.x = .3; bx(.4, .05, .15, 0x222222, 0, .85, .3); bx(.55, .04, .04, 0x222222, 0, .98, -.5); bx(.04, .6, .04, 0x2f7f86, 0, .65, -.52);
  return { g, wheels, type: 'bike', x: 0, z: 0, yaw: 0, v: 0, r: .37, lean: 0 };
}
function mkCar() {
  const g = new T.Group(), body = new T.Group(), wheels = [];
  const bx = (p, w, h, d, c, x, y, z, o) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  bx(body, 1.8, .6, 3.8, 0x6b9a7a, 0, .65, 0); bx(body, 1.5, .55, 1.8, 0x7fae8c, 0, 1.2, .3); bx(body, 1.52, .35, 1.4, 0x1b2a30, 0, 1.22, .3);
  const hl = [-.6, .6].map(x => bx(body, .35, .2, .08, 0xffffff, x, .75, -1.92, { emissive: 0xfff0b0, emissiveIntensity: 0 }));
  g.add(body); const wgm = new T.CylinderGeometry(.35, .35, .25, 12).rotateZ(Math.PI / 2);
  for (const [x, z] of [[-.95, -1.25], [.95, -1.25], [-.95, 1.25], [.95, 1.25]]) { const w = new T.Mesh(wgm, mat(0x1a1a1a)); w.position.set(x, .35, z); w.castShadow = true; g.add(w); wheels.push(w); }
  const spot = new T.SpotLight(0xfff0c0, 0, 60, .6, .5, 1.5); spot.position.set(0, .8, -1.8); spot.target.position.set(0, 0, -20); g.add(spot, spot.target);
  return { g, body, wheels, hl, spot, type: 'car', x: 0, z: 0, yaw: 0, v: 0, r: .35 };
}
const V = { bike: mkBike(), car: mkCar() };

// ---------- environment ----------
const mk = () => ({ top: new T.Color(), bot: new T.Color(), fog: new T.Color(), sun: new T.Color(), si: 2, hi: .9, el: 60, le: 60, n: 0, fd: .003, dark: 0, rain: 0, wind: 0 });
const E = mk(), TG = mk(), tmp = new T.Color(), WH = new T.Color(1, 1, 1); let primed = false;
function target() {
  const t = TOD[S.time], w = WX[S.weather], tint = (o, h) => { o.set(h); const l = (o.r + o.g + o.b) / 3; o.lerp(tmp.setRGB(l, l, l), w.g).multiplyScalar(1 - w.d * .5); };
  tint(TG.top, t.top); tint(TG.bot, t.bot); tint(TG.fog, t.fog); TG.sun.set(t.sun);
  Object.assign(TG, { si: t.si * (1 - w.d), hi: t.hi * (1 - w.d * .4), el: t.el, le: t.le, n: t.nt, fd: w.f, dark: w.d, rain: w.r, wind: w.w });
  if (!primed && W) { primed = true; for (const k of ['top', 'bot', 'fog', 'sun']) E[k].copy(TG[k]); for (const k of ['si', 'hi', 'el', 'le', 'n', 'fd', 'dark', 'rain', 'wind']) E[k] = TG[k]; }
}
function applySeason() {
  if (!W) return; const s = S.season, w = W.set;
  terrain.userData.paint(s);
  w.pineMat.color.set({ spring: 0x2f6b3a, summer: 0x25592f, autumn: 0x2c5630, winter: 0x4d7a68 }[s]);
  w.broadMat.color.set({ spring: 0x86c660, summer: 0x3f8f3a, autumn: 0xd2802a, winter: 0x777777 }[s]); w.bI.visible = s !== 'winter';
  w.grassMat.color.set({ spring: 0x74b14e, summer: 0x5c9a3e, autumn: 0xa89040, winter: 0xffffff }[s]); w.grass.visible = s !== 'winter'; w.flow.visible = s !== 'winter';
  pollen.material.color.set({ spring: 0xffd0e0, summer: 0xfff3a0, autumn: 0xd2802a, winter: 0xffffff }[s]);
}
function applyQ() {
  const q = QL[S.quality]; if (!R) return;
  R.setPixelRatio(Math.min(devicePixelRatio, q.dpr)); R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  sun.castShadow = !!q.sh; if (q.sh) { sun.shadow.mapSize.set(q.sh, q.sh); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  if (W) { W.count(q.tr); W.set.grass.count = Math.floor(W.set.grass.userData.n * q.gr); }
}
addEventListener('resize', applyQ);

// ---------- world build ----------
function build() {
  terrain = buildTerrain(); scene.add(terrain); sky = buildSky(scene); W = buildWorld(scene);
  scene.add(V.bike.g, V.car.g);
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(new Float32Array(220 * 3), 3));
  pollen = new T.Points(pg, new T.PointsMaterial({ size: .14, transparent: true, opacity: .8, depthWrite: false })); pollen.frustumCulled = false;
  const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(new Float32Array(120 * 3), 3));
  flies = new T.Points(fg, new T.PointsMaterial({ color: 0xd8ff80, size: .22, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); flies.frustumCulled = false;
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(new Float32Array(1000 * 6), 3));
  rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0xaabbdd, transparent: true, opacity: .35 })); rain.frustumCulled = false; rain.visible = false;
  for (const a of [pollen, flies, rain]) { const p = a.geometry.attributes.position; for (let i = 0; i < p.count; i += a === rain ? 2 : 1) { const x = (Math.random() - .5) * 50, y = Math.random() * 20, z = (Math.random() - .5) * 50; p.setXYZ(i, x, y, z); if (a === rain) p.setXYZ(i + 1, x, y + .8, z); } }
  scene.add(pollen, flies, rain); W.set.grass.userData.n = W.set.grass.count; built = true;
  target(); applySeason(); applyQ();
}

// ---------- player ----------
const P = { x: 0, z: 0, yaw: 0, pitch: 0, mode: 'foot', veh: null, ey: 2, bob: 0, sit: false, speed: 0, snap: true };
let relax = false, relaxT = 0, relaxA = 0, menuOpen = false, playing = false, photoReq = false;
function go(loc) {
  const sp = loc.startsWith('fav') ? S.fav[+loc.slice(3)] : SP[loc]; if (!sp) return go('lake');
  P.x = sp.x; P.z = sp.z; P.yaw = sp.yaw ?? Math.atan2(-(sp.fx - sp.x), -(sp.fz - sp.z)); P.pitch = -.05; P.sit = false; P.snap = true;
  const c = Math.cos(P.yaw), s = Math.sin(P.yaw), f = [-s, -c], r = [c, -s];
  Object.assign(V.bike, { x: P.x + r[0] * 3 + f[0] * 2, z: P.z + r[1] * 3 + f[1] * 2, yaw: P.yaw, v: 0 }); Object.assign(V.car, { x: P.x - r[0] * 4 + f[0] * 4, z: P.z - r[1] * 4 + f[1] * 4, yaw: P.yaw, v: 0 });
  S.loc = loc; save(); P.veh = null; P.mode = 'foot'; buildBtns(); if (S.vehicle !== 'foot') setMode(S.vehicle);
}
function setMode(m) {
  if (m !== 'foot') { P.veh = V[m]; P.x = P.veh.x; P.z = P.veh.z; P.yaw = P.veh.yaw; P.snap = true; } else if (P.veh) { const v = P.veh, c = Math.cos(v.yaw), s = Math.sin(v.yaw); P.x = v.x + c * 1.8; P.z = v.z - s * 1.8; P.yaw = v.yaw; P.veh = null; }
  P.mode = m; P.sit = false; if (m === 'foot' ? 0 : 1) S.vehicle = m; else S.vehicle = S.vehicle; buildBtns();
}
function interact() {
  if (relax || menuOpen || !playing) return;
  if (P.mode !== 'foot') { S.vehicle = P.mode; save(); setMode('foot'); return; }
  for (const k of ['bike', 'car']) if (Math.hypot(V[k].x - P.x, V[k].z - P.z) < 3.5) { setMode(k); return; }
  const b = W.benches.find(b => Math.hypot(b.x - P.x, b.z - P.z) < 2.6); if (b) { P.sit = !P.sit; if (P.sit) { P.x = b.x; P.z = b.z; P.yaw = b.yaw; } }
}
const toggleCam = () => { S.cam = S.cam === 'third' ? 'first' : 'third'; save(); };

// ---------- input ----------
const K = new Set(), B = {}, stick = { x: 0, y: 0 }, I = {};
function readInput() {
  const k = (...c) => c.some(x => K.has(x)) ? 1 : 0, h = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
  I.mx = h + stick.x; I.mz = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown') - stick.y; I.run = k('ShiftLeft', 'ShiftRight') || B.run;
  I.gas = k('KeyW', 'ArrowUp') || B.gas ? 1 : 0; I.brake = k('KeyS', 'ArrowDown', 'Space') || B.brake ? 1 : 0; I.steer = clamp(h + (B.right ? 1 : 0) - (B.left ? 1 : 0) + stick.x, -1, 1);
}
addEventListener('keydown', e => {
  if (!playing) return; if (e.code === 'Escape') { menuOpen ? closeMenu() : openMenu(false); return; } if (menuOpen) return;
  if (relax) { if (performance.now() - relaxT > 500) endRelax(); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyE') interact(); if (e.code === 'KeyC') toggleCam(); K.add(e.code);
});
addEventListener('keyup', e => K.delete(e.code)); addEventListener('blur', () => K.clear());
const cv = $('#c');
cv.addEventListener('click', () => { if (relax && performance.now() - relaxT > 500) endRelax(); else if (!touch && playing && !menuOpen && !relax) cv.requestPointerLock?.(); });
document.addEventListener('mousemove', e => { if (document.pointerLockElement === cv && P.mode === 'foot' && !P.sit || document.pointerLockElement === cv && P.sit) { P.yaw -= e.movementX * .0022; P.pitch = clamp(P.pitch - e.movementY * .0022, -1.3, 1.3); } });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && playing && !menuOpen && !relax) openMenu(false); });
cv.addEventListener('wheel', e => { cam.fov = clamp(cam.fov + e.deltaY * .03, 30, 75); cam.updateProjectionMatrix(); }, { passive: true });
for (const el of [cv, $('#touch')]) el.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
const st = $('#stick'), knob = st.firstElementChild; let sid = null;
const mv = e => { const b = st.getBoundingClientRect(), r = b.width / 2, dx = e.clientX - b.left - r, dy = e.clientY - b.top - r, l = Math.min(1, Math.hypot(dx, dy) / r), a = Math.atan2(dy, dx); stick.x = Math.cos(a) * l; stick.y = Math.sin(a) * l; knob.style.transform = `translate(${stick.x * r * .6}px,${stick.y * r * .6}px)`; };
st.addEventListener('pointerdown', e => { sid = e.pointerId; st.setPointerCapture(sid); mv(e); }); st.addEventListener('pointermove', e => e.pointerId === sid && mv(e));
const sup = e => { if (e.pointerId === sid) { sid = null; stick.x = stick.y = 0; knob.style.transform = ''; } }; st.addEventListener('pointerup', sup); st.addEventListener('pointercancel', sup);
const lk = $('#look'); let lid = null, lx = 0, ly = 0;
lk.addEventListener('pointerdown', e => { if (relax) { if (performance.now() - relaxT > 500) endRelax(); return; } lid = e.pointerId; lk.setPointerCapture(lid); lx = e.clientX; ly = e.clientY; });
lk.addEventListener('pointermove', e => { if (e.pointerId !== lid) return; if (P.mode === 'foot') { P.yaw -= (e.clientX - lx) * .005; P.pitch = clamp(P.pitch - (e.clientY - ly) * .004, -1.3, 1.3); } lx = e.clientX; ly = e.clientY; });
lk.addEventListener('pointerup', () => lid = null); lk.addEventListener('pointercancel', () => lid = null);
const LAB = { use: 'Use', run: 'Run', gas: 'Go', brake: 'Brake', left: '\u25C0', right: '\u25B6', cam: 'View', exit: 'Exit' };
function buildBtns() {
  const ks = P.mode === 'foot' ? ['use', 'run'] : P.mode === 'bike' ? ['gas', 'brake', 'exit'] : ['left', 'right', 'gas', 'brake', 'cam', 'exit'];
  $('#btns').innerHTML = ks.map(k => `<div class="tb" data-k="${k}">${LAB[k]}</div>`).join(''); st.style.display = P.mode === 'car' ? 'none' : ''; for (const k in B) B[k] = 0; stick.x = stick.y = 0;
}
$('#btns').addEventListener('pointerdown', e => { const k = e.target.dataset.k; if (!k) return; e.target.setPointerCapture(e.pointerId); if (k === 'use' || k === 'exit') interact(); else if (k === 'cam') toggleCam(); else B[k] = 1; });
const bup = e => { const k = e.target.dataset?.k; if (k) B[k] = 0; }; $('#btns').addEventListener('pointerup', bup); $('#btns').addEventListener('pointercancel', bup);

// ---------- UI ----------
let toastT; function toast(t) { const e = $('#toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => e.style.opacity = 0, 3200); }
let homeMode = S.vehicle === 'foot' ? 'foot' : S.vehicle, homeLoc = LOCS[S.loc] ? S.loc : 'lake';
const MODES = { foot: 'Explore on foot', bike: 'Ride bicycle', car: 'Drive car', relax: 'Relax mode' };
function drawHome() {
  $('#modes').innerHTML = Object.entries(MODES).map(([k, t]) => `<button data-m="${k}" class="${k === homeMode ? 'on' : ''}">${t}</button>`).join('');
  $('#locs').innerHTML = Object.entries(LOCS).map(([k, t]) => `<button data-l="${k}" class="${k === homeLoc ? 'on' : ''}">${t}</button>`).join('');
}
$('#modes').onclick = e => { if (e.target.dataset.m) { homeMode = e.target.dataset.m; drawHome(); } }; $('#locs').onclick = e => { if (e.target.dataset.l) { homeLoc = e.target.dataset.l; drawHome(); } }; drawHome();
const lock = () => { if (!touch) return; document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape')).catch(() => { }); };
$('#rotbtn').onclick = () => { lock(); setTimeout(() => { if (matchMedia('(orientation:portrait)').matches) { $('#rotmsg').textContent = 'Your browser did not allow rotation lock. Please rotate your phone manually.'; $('#rotbtn').textContent = 'Continue in portrait'; $('#rotbtn').onclick = () => document.body.classList.add('okp'); } }, 700); };
$('#enter').onclick = async () => {
  if (!R) return; lock();
  try { audio ||= createAudio(S); audio.resume(); } catch { audio = null; }
  $('#load').hidden = false; await new Promise(r => requestAnimationFrame(() => setTimeout(r, 40)));
  try { if (!built) build(); } catch (err) { console.error(err); $('#load').hidden = true; fail('Serenity could not build the world on this device.', true); return; }
  S.vehicle = homeMode === 'relax' ? 'foot' : homeMode; go(homeLoc); relax = homeMode === 'relax'; relaxT = performance.now();
  $('#home').hidden = true; $('#hud').hidden = false; $('#touch').hidden = !touch || relax; playing = true; $('#load').hidden = true; last = performance.now(); loop();
  toast(relax ? 'Just listen. Tap anywhere to move again.' : touch ? 'Welcome to Serenity' : 'Click the world to look around. E to use, Esc for the menu.');
};
function endRelax() { relax = false; $('#touch').hidden = !touch; }
const sel = (l, key, o) => `<label>${l}<select data-s="${key}">${o.map(([v, t]) => `<option value="${v}" ${S[key] == v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
const rng = (l, k) => `<label>${l}<input type="range" min="0" max="1" step=".05" data-v="${k}" value="${S.vol[k]}"></label>`;
function openMenu(home) {
  menuOpen = true; document.exitPointerLock?.(); const m = $('#menu'); m.hidden = false;
  const locs = [...Object.entries(LOCS), ...S.fav.map((_, i) => ['fav' + i, '\u2605 Favourite ' + (i + 1)])];
  m.innerHTML = `<div class="card"><h3>${home ? 'Settings' : 'Paused'}</h3>
  ${home ? '' : `<div class="row"><button data-a="resume">Resume</button><button data-a="photo">Take photo</button><button data-a="relax">Just listen</button></div>
  <div class="row"><button data-a="veh:foot">On foot</button><button data-a="veh:bike">Bicycle</button><button data-a="veh:car">Car</button></div>
  <label>Location<select data-loc>${locs.map(([v, t]) => `<option value="${v}" ${S.loc === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`}
  ${sel('Time', 'time', Object.entries(TOD).map(([k, v]) => [k, v.n]))}${sel('Weather', 'weather', Object.entries(WX).map(([k, v]) => [k, v.n]))}${sel('Season', 'season', Object.entries(SEAS))}
  ${rng('Master volume', 'master')}${rng('Nature sounds', 'nature')}${rng('Vehicle sounds', 'vehicle')}${rng('Music', 'music')}
  ${sel('Graphics', 'quality', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])}
  ${home ? '' : `<div class="row"><button data-a="fav">Favourite this spot</button><button data-a="home">Return to home</button></div><p>Discovered ${S.found.length} of ${W.pois.length} scenic places.</p>`}
  <div class="row"><button data-a="${home ? 'close' : 'resume'}">${home ? 'Close' : 'Back to the world'}</button></div><small>All scenery is generated in code and all sound is synthesized, so there are no outside assets to credit.</small></div>`;
}
function closeMenu() { menuOpen = false; $('#menu').hidden = true; last = performance.now(); }
$('#menu').addEventListener('change', e => {
  const t = e.target, d = t.dataset; if (d.s) { S[d.s] = t.value; if (d.s === 'time' || d.s === 'weather') target(); if (d.s === 'season') applySeason(); if (d.s === 'quality') applyQ(); }
  else if (d.v) { S.vol[d.v] = +t.value; audio?.vol(d.v, +t.value); } else if ('loc' in d) { closeMenu(); go(t.value); } save();
});
$('#menu').addEventListener('input', e => { const d = e.target.dataset; if (d.v) { S.vol[d.v] = +e.target.value; audio?.vol(d.v, +e.target.value); } });
$('#menu').addEventListener('click', e => {
  const a = e.target.dataset.a; if (!a) return;
  if (a === 'resume' || a === 'close') closeMenu(); else if (a === 'photo') { closeMenu(); photoReq = true; } else if (a === 'relax') { closeMenu(); relax = true; relaxT = performance.now(); $('#touch').hidden = true; toast('Just listen. Tap anywhere to move again.'); }
  else if (a.startsWith('veh:')) { closeMenu(); const m = a.slice(4); if (P.mode !== 'foot') setMode('foot'); if (m !== 'foot') { const v = V[m]; v.x = P.x + Math.cos(P.yaw) * 2; v.z = P.z - Math.sin(P.yaw) * 2; v.yaw = P.yaw; v.v = 0; setMode(m); } S.vehicle = m; save(); }
  else if (a === 'fav') { S.fav.push({ x: P.x, z: P.z, yaw: P.yaw }); save(); toast('Saved as a favourite place'); closeMenu(); }
  else if (a === 'home') { closeMenu(); playing = false; relax = false; $('#home').hidden = false; $('#hud').hidden = true; $('#touch').hidden = true; K.clear(); drawHome(); }
});
$('#pause').onclick = () => openMenu(false); $('#gear').onclick = () => openMenu(true);

// ---------- loop ----------
let last = 0, tt = 0, slow = 0, frames = 0, disc = 0, zone = { forest: 0 }, lightning = 5, flash = 0, loopOn = false;
function loop() { if (loopOn) return; loopOn = true; requestAnimationFrame(frame); }
function frame() {
  if (!loopOn) return; requestAnimationFrame(frame); const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
  if (playing) { tick(dt); frames++; slow += dt; if (slow > 3) { if (frames / slow < 26 && S.quality !== 'low') { S.quality = S.quality === 'high' ? 'medium' : 'low'; save(); applyQ(); toast('Lowering graphics to keep things smooth'); } slow = frames = 0; } }
}
function tick(dt) {
  tt += dt; uTime.value = tt; readInput(); const w = WX[S.weather]; let gy = P.mode === 'foot' ? G(P.x, P.z) : H(P.x, P.z);
  if (!menuOpen && !relax) {
    if (P.mode === 'foot') {
      const c = Math.cos(P.yaw), s = Math.sin(P.yaw); let mx = I.mx, mz = I.mz; const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; } if (l > .1) P.sit = false;
      const sp = I.run ? 6.5 : 3.2; P.speed = 0;
      if (!P.sit && l > .02) { const p = { x: P.x + (-s * mz + c * mx) * sp * dt, z: P.z + (-c * mz - s * mx) * sp * dt }; if (G(p.x, p.z) > -.8 && Math.hypot(p.x, p.z) < 300) { W.hit(p, .4); P.x = p.x; P.z = p.z; P.speed = Math.min(1, l) * sp; P.bob += P.speed * dt * 1.8; } }
      gy = G(P.x, P.z); for (const k of ['bike', 'car']) pose(V[k], dt, 0);
    } else {
      const v = P.veh, bike = v.type === 'bike', fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), slope = (H(v.x + fx * 1.2, v.z + fz * 1.2) - H(v.x - fx * 1.2, v.z - fz * 1.2)) / 2.4;
      if (bike) { if (I.gas) v.v += 3 * dt; if (I.brake) v.v -= Math.sign(v.v) * Math.min(Math.abs(v.v), 9 * dt); v.v -= slope * 3.9 * dt; v.v -= v.v * (I.gas ? .12 : .3) * dt; v.v = clamp(v.v, -1, 11); }
      else { if (I.gas && v.v < 15) v.v += 5 * dt; if (I.brake) v.v -= (v.v > .3 ? 10 : 3.5) * dt; v.v -= v.v * .4 * dt + slope * 1.5 * dt; v.v = clamp(v.v, -4, 15); }
      v.yaw -= I.steer * (bike ? 1.3 : 1.1) * dt * clamp(v.v / 2.5, -1, 1);
      const p = { x: v.x - Math.sin(v.yaw) * v.v * dt, z: v.z - Math.cos(v.yaw) * v.v * dt };
      if (H(p.x, p.z) < -.8 || Math.hypot(p.x, p.z) > 300) v.v *= -.2; else { if (W.hit(p, bike ? .5 : 1.2)) v.v *= .5; v.x = p.x; v.z = p.z; }
      P.x = v.x; P.z = v.z; P.speed = v.v; gy = H(v.x, v.z); pose(v, dt, I.steer); pose(V[bike ? 'car' : 'bike'], dt, 0);
    }
  }
  // camera
  const targetEy = gy + (P.sit ? 1.15 : 1.7) + Math.sin(P.bob * 2) * .035; P.ey = P.snap ? targetEy : P.ey + (targetEy - P.ey) * (1 - Math.exp(-dt * 10));
  if (relax) {
    relaxA += dt * .06; const cx = P.x + Math.cos(relaxA) * 16, cz = P.z + Math.sin(relaxA) * 16; cam.position.set(cx, Math.max(H(cx, cz) + 2, gy + 4 + Math.sin(tt * .2)), cz); cam.lookAt(P.x, gy + 3, P.z);
  } else if (P.mode === 'foot' || menuOpen && P.mode === 'foot') { cam.position.set(P.x, P.ey, P.z); cam.rotation.set(P.pitch, P.yaw, 0); }
  else {
    const v = P.veh, car = v.type === 'car', fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
    if (car && S.cam === 'first') { cam.position.set(v.x + fx * .2, gy + 1.3, v.z + fz * .2); cam.rotation.set(0, v.yaw, 0); }
    else { const d = car ? 7.5 : 4.2, h = car ? 3.4 : 2, k = P.snap ? 1 : 1 - Math.exp(-dt * 4); cam.position.lerp(tmp3.set(v.x - fx * d, gy + h, v.z - fz * d), k); cam.position.y = Math.max(cam.position.y, H(cam.position.x, cam.position.z) + 1); cam.lookAt(v.x, gy + 1.2, v.z); }
  }
  P.snap = false;
  // environment
  target(); const k = 1 - Math.exp(-dt * 1.2); for (const n of ['top', 'bot', 'fog', 'sun']) E[n].lerp(TG[n], k); for (const n of ['si', 'hi', 'el', 'le', 'n', 'fd', 'dark', 'rain', 'wind']) E[n] += (TG[n] - E[n]) * k;
  scene.fog.color.copy(E.fog); scene.fog.density = E.fd; sky.u.top.value.copy(E.top); sky.u.bot.value.copy(E.bot);
  if (w.r > .5 && S.weather === 'storm') { lightning -= dt; if (lightning < 0) { flash = 1; lightning = 8 + Math.random() * 10; setTimeout(() => audio?.thunder(), 1200 + Math.random() * 1500); } } flash *= Math.exp(-dt * 6);
  sun.color.copy(E.sun); sun.intensity = E.si; hemi.intensity = E.hi + flash * 3; hemi.color.copy(E.bot).lerp(WH, .4);
  const ce = Math.cos(E.le * Math.PI / 180), dv = tmp3.set(.3 * ce, Math.sin(E.le * Math.PI / 180), .95 * ce).normalize(); sun.position.copy(P.veh ? P.veh.g.position : cam.position).addScaledVector(dv, 120); sun.target.position.copy(sun.position).addScaledVector(dv, -120);
  const ve = Math.cos(E.el * Math.PI / 180); sky.sun.position.set(cam.position.x + .3 * ve * 850, cam.position.y + Math.sin(E.el * Math.PI / 180) * 850, cam.position.z + .95 * ve * 850); sky.sun.visible = E.el > -3; sky.sun.material.color.copy(E.sun).lerp(WH, .5);
  sky.dome.position.copy(cam.position); sky.stars.position.copy(cam.position); sky.stars.material.opacity = ss(.4, .9, E.n) * (1 - E.dark * .8);
  sky.cm.color.copy(E.fog).lerp(WH, .45).multiplyScalar(1 - E.dark * .4); for (const c of sky.clouds) { c.position.x += dt * 3; if (c.position.x > 450) c.position.x = -450; }
  for (const m of W.win) m.emissiveIntensity = E.n * 1.6; for (const m of W.lamp) m.emissiveIntensity = E.n * 2; W.lhMat.emissiveIntensity = E.n * 3; terrain.material.roughness = .95 - .4 * E.rain;
  const car = V.car; car.spot.intensity = P.mode === 'car' ? 80 * ss(.25, .7, E.n) : 0; car.hl.forEach(m => m.material.emissiveIntensity = ss(.25, .7, E.n) * 2);
  for (const a of W.anim) a(tt, dt);
  // particles
  const cx = cam.position.x, cz = cam.position.z, wrap = (v, c) => v < c - 25 ? v + 50 : v > c + 25 ? v - 50 : v;
  const pp = pollen.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { let x = pp.getX(i) + dt * (.6 + Math.sin(tt + i) * .4 + E.wind), y = pp.getY(i) + Math.sin(tt * .7 + i) * dt * .3 - (S.season === 'autumn' || S.season === 'winter' ? dt * .8 : 0), z = pp.getZ(i) + Math.cos(tt * .5 + i) * dt * .3; x = wrap(x, cx); z = wrap(z, cz); if (y < gy - 1) y = gy + 6; if (y > gy + 8) y = gy; pp.setXYZ(i, x, y, z); } pp.needsUpdate = true;
  const fp = flies.geometry.attributes.position; flies.material.opacity = ss(.4, .9, E.n) * (1 - E.rain);
  if (flies.material.opacity > .01) { for (let i = 0; i < fp.count; i++) { const x = wrap(fp.getX(i) + Math.sin(tt * .6 + i) * dt * .8, cx), z = wrap(fp.getZ(i) + Math.cos(tt * .5 + i * 2) * dt * .8, cz); fp.setXYZ(i, x, gy + .6 + (i % 7) * .4 + Math.sin(tt + i) * .3, z); } fp.needsUpdate = true; }
  rain.visible = E.rain > .05; if (rain.visible) { const rp = rain.geometry.attributes.position; for (let i = 0; i < rp.count; i += 2) { let y = rp.getY(i) - 35 * dt, x = wrap(rp.getX(i), cx), z = wrap(rp.getZ(i), cz); if (y < gy - 3) y += 24; rp.setXYZ(i, x, y, z); rp.setXYZ(i + 1, x + .05, y + .8, z); } rp.needsUpdate = true; }
  // discovery + audio
  disc += dt; if (disc > .5) {
    disc = 0; for (const p of W.pois) if (Math.hypot(p.x - P.x, p.z - P.z) < 14 && !S.found.includes(p.n)) { S.found.push(p.n); save(); toast(`Discovered ${p.n} (${S.found.length} of ${W.pois.length})`); }
    let n = 0; const cxk = Math.floor(P.x / 10), czk = Math.floor(P.z / 10); for (let i = -1; i < 2; i++) for (let j = -1; j < 2; j++) n += (W.trees.get((cxk + i) + ',' + (czk + j)) || []).length; zone.forest = clamp(n / 22, 0, 1);
    let txt = ''; if (P.mode === 'foot' && playing && !menuOpen && !relax) { const near = k => Math.hypot(V[k].x - P.x, V[k].z - P.z) < 3.5; txt = near('bike') ? 'Enter bicycle' : near('car') ? 'Enter car' : W.benches.some(b => Math.hypot(b.x - P.x, b.z - P.z) < 2.6) ? (P.sit ? 'Stand up' : 'Sit and listen') : ''; if (txt && !touch) txt = 'E \u2014 ' + txt; }
    const pr = $('#prompt'); pr.textContent = txt; pr.style.opacity = txt ? 1 : 0;
  }
  if (audio) { const fd = Math.hypot(P.x - WF.x, P.z - (WF.z + 10)), ld = Math.max(0, Math.hypot(P.x - LAKE.x, P.z - LAKE.z) - 42), fall = clamp(1 - fd / 90, 0, 1) ** 2;
    audio.update({ wind: clamp(.3 + E.wind * .7 + ss(5, 40, gy) * .4, 0, 1), forest: zone.forest, lake: Math.max(clamp(1 - ld / 50, 0, 1) * .8, fall * .6), fall, ocean: ss(110, 160, P.z), rain: E.rain, village: 1 - ss(15, 70, Math.hypot(P.x - VIL.x, P.z - VIL.z)), night: ss(.3, .9, E.n), mode: P.mode, speed: P.speed }, tt); }
  R.render(scene, cam);
  if (photoReq) { photoReq = false; const a = document.createElement('a'); a.download = 'serenity.png'; a.href = cv.toDataURL('image/png'); a.click(); toast('Photo saved'); }
}
const tmp3 = new T.Vector3();
function pose(v, dt, steer) {
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), y = H(v.x, v.z), sl = Math.atan((H(v.x + fx * 1.2, v.z + fz * 1.2) - H(v.x - fx * 1.2, v.z - fz * 1.2)) / 2.4);
  v.g.rotation.order = 'YXZ'; v.lean = (v.lean || 0) + ((v.type === 'bike' ? -steer * clamp(Math.abs(v.v) / 6, 0, 1) * .25 : 0) - (v.lean || 0)) * (1 - Math.exp(-dt * 5));
  v.g.rotation.set(sl, v.yaw, v.lean); v.g.position.set(v.x, y, v.z); for (const w of v.wheels) w.rotation.x -= v.v * dt / v.r;
  if (v.body) v.body.position.y = Math.sin(tt * 9) * .012 * clamp(Math.abs(v.v) / 8, 0, 1);
}
// context loss and tab visibility
cv.addEventListener('webglcontextlost', e => { e.preventDefault(); loopOn = false; fail('The graphics context was lost. Reload to continue.', true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { loopOn = false; audio?.A.suspend(); } else if (playing) { audio?.A.resume(); last = performance.now(); loop(); } });
applyQ();
