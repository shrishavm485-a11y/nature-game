// Procedural Web Audio: no external files. Created on a user gesture.
export function createAudio(S) {
  const A = new (window.AudioContext || window.webkitAudioContext)();
  const mk = (dst, v) => { const g = A.createGain(); g.gain.value = v; g.connect(dst); return g; };
  const master = mk(A.destination, S.vol.master), nat = mk(master, S.vol.nature), veh = mk(master, S.vol.vehicle), mus = mk(master, S.vol.music);
  const buf = A.createBuffer(1, A.sampleRate * 3, A.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = (type, f, q, dst) => { const s = A.createBufferSource(); s.buffer = buf; s.loop = true; const fl = A.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = mk(dst, 0); s.connect(fl); fl.connect(g); s.start(0, Math.random() * 2); return g; };
  const L = { wind: noise('bandpass', 450, .5, nat), water: noise('lowpass', 1400, .4, nat), fall: noise('bandpass', 1100, .25, nat), waves: noise('lowpass', 750, .4, nat), rain: noise('highpass', 1800, .3, nat), village: noise('bandpass', 250, 1, nat), road: noise('bandpass', 900, .8, veh), bike: noise('bandpass', 2600, 2, veh) };
  // crickets: 4.3 kHz tone, gated by a 9 Hz square LFO
  const co = A.createOscillator(); co.frequency.value = 4300; const cBus = mk(nat, 0), am = mk(cBus, .5); co.connect(am); const lfo = A.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 9; const lg = mk(am.gain, .5); lfo.connect(lg); co.start(); lfo.start();
  // engine
  const eo = A.createOscillator(); eo.type = 'sawtooth'; eo.frequency.value = 55; const ef = A.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 320; const eg = mk(veh, 0); eo.connect(ef); ef.connect(eg); eo.start();
  // music: slow Am7 pad
  [110, 164.8, 220, 261.6, 329.6].forEach((f, i) => { const o = A.createOscillator(); o.frequency.value = f; o.detune.value = (i - 2) * 4; const g = mk(mus, .05); o.connect(g); o.start(); });
  const birdBus = mk(nat, 0);
  const chirp = () => { const n = 1 + Math.floor(Math.random() * 3), f0 = 2200 + Math.random() * 1800; for (let i = 0; i < n; i++) { const t = A.currentTime + i * .14, o = A.createOscillator(), g = mk(birdBus, 0); o.connect(g); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.2 + Math.random() * .5), t + .1); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .02); g.gain.linearRampToValueAtTime(0, t + .11); o.start(t); o.stop(t + .14); } };
  const birdLoop = setInterval(() => { if (A.state === 'running' && birdBus.gain.value > .02 && Math.random() < .8) chirp(); }, 1700);
  const thunder = () => { const s = A.createBufferSource(); s.buffer = buf; const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; const g = mk(nat, 0); s.connect(f); f.connect(g); const t = A.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .3); g.gain.exponentialRampToValueAtTime(.001, t + 4); s.start(t, Math.random()); s.stop(t + 4.2); };
  const set = (g, v) => g.gain.setTargetAtTime(v, A.currentTime, .6);
  return {
    A, thunder,
    resume: () => A.resume(),
    vol: (k, v) => { ({ master, nature: nat, vehicle: veh, music: mus })[k].gain.value = v; },
    update(st, t) {
      set(L.wind, .05 + st.wind * .25); set(birdBus, st.forest * (1 - st.night) * (1 - st.rain) * .9 + .06 * (1 - st.night) * (1 - st.rain));
      set(L.water, st.lake * .35); set(L.fall, st.fall * .8); set(L.waves, st.ocean * (.55 + .35 * Math.sin(t * .7)));
      set(L.rain, st.rain * .35); set(L.village, st.village * .08); set(cBus, st.night * .08 * (1 - st.rain));
      const car = st.mode === 'car', bike = st.mode === 'bike', sp = Math.abs(st.speed);
      set(eg, car ? .12 + sp * .004 : 0); eo.frequency.setTargetAtTime(48 + sp * 4.5, A.currentTime, .2);
      set(L.road, car ? Math.min(.15, sp * .01) : 0); set(L.bike, bike ? Math.min(.05, sp * .008) : 0);
    },
    close() { clearInterval(birdLoop); A.close(); },
  };
}
