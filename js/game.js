// Abood in Liwa: a small free-roam dune safari.
// One canvas, no image files: the dunes, the buggy, Abood and every landmark are drawn in code,
// then baked into cached tiles and sprites so each frame mostly copies images.
import { T, getLang, applyLang, setLang, onLang, hasStoredLang, FLAG } from './i18n.js?v=__BUILD__';

const TAU = Math.PI * 2, INK = '#2b1a12', SHEMAGH = '#c8202b';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = (a, b, v) => { v = clamp((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const $ = id => document.getElementById(id);
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
const nf = n => Math.round(n).toLocaleString('en-US');
const pick = a => a[Math.random() * a.length | 0];
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const coarse = matchMedia('(pointer: coarse)').matches;

// ---------- save data ----------
const SAVE_KEY = 'abood-liwa-v1';
const save = { coins: 0, best: 0, cards: [], color: 'white', colors: ['white'], tank: 0, muted: false, runs: 0, xp: 0, lvl: 1, up: {}, missions: [], medals: {}, times: {}, day: '', streak: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
save.up = Object.assign({ engine: 0, tyres: 0, balance: 0, tank: Math.min(5, save.tank || 0), magnet: 0 }, save.up);
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const COLORS = { // white first: the classic desert car, and Abood's red shemagh stands out against it
  white: { main: '#fbf9f2', dark: '#8f887a', trim: SHEMAGH, cost: 0 }, teal: { main: '#1f7a74', dark: '#123f3c', trim: '#fffaf0', cost: 150 },
  yellow: { main: '#f2c230', dark: '#7a5a12', trim: '#2b1a12', cost: 300 }, red: { main: SHEMAGH, dark: '#6e1118', trim: '#fffaf0', cost: 500 },
  black: { main: '#2f2b28', dark: '#151312', trim: '#e0a72a', cost: 1000 },
};

// ---------- the world: a round reserve of dunes, 6.8 km of pixels across ----------
const R = 3400, WX = 0.866, WY = 0.5; // WX,WY: the wind direction that shapes the dunes
const SITES = [
  { id: 'camp', x: 0, y: 0, r: 250 }, { id: 'moreeb', x: 1500, y: -1750, r: 120, hill: 200 }, { id: 'oasis', x: -1950, y: -850, r: 300 },
  { id: 'fort', x: 2350, y: 650, r: 240 }, { id: 'camels', x: -750, y: 1750, r: 230 }, { id: 'oryx', x: 950, y: 1500, r: 180 },
  { id: 'falcon', x: -2350, y: 1250, r: 150 }, { id: 'well', x: 650, y: -950, r: 170 }, { id: 'sabkha', x: -550, y: -2350, r: 380 },
  { id: 'festival', x: -1300, y: 350, r: 230 }, { id: 'gate', x: 350, y: 2850, r: 170 },
];
for (const s of SITES) { s.f2 = s.r * s.r; s.coins = Math.round(10 + Math.hypot(s.x, s.y) / 60); }
const site = id => SITES.find(s => s.id === id);

function hash2(ix, iy) { let n = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ 0x5bd1e995; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function vn(x, y) { // smooth value noise
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// one dune ridge: a long gentle windward side (share a) and a short steep slip face
function ridge(u, a) { const s = u - Math.floor(u); return s < a ? 0.5 - 0.5 * Math.cos(Math.PI * s / a) : 0.5 + 0.5 * Math.cos(Math.PI * (s - a) / (1 - a)); }
// ground height at any point. The drawing and the driving both read this one function.
function H(x, y) {
  const w = vn(x * 0.0011 + 7.3, y * 0.0011 - 2.1) - 0.5;
  const amp = 0.3 + 0.7 * sstep(0.28, 0.66, vn(x * 0.0006 - 4.2, y * 0.0006 + 9.7));
  let h = ridge((x * WX + y * WY) / 560 + w * 1.7, 0.72) * 64 * amp
    + ridge((x * 0.5 - y * 0.866) / 250 + w * 0.9 + 3.1, 0.66) * 12 * (0.4 + amp * 0.6)
    + vn(x * 0.0024 + 1.7, y * 0.0024 + 5.1) * 12;
  for (const s of SITES) {
    const dx = x - s.x, dy = y - s.y, d2 = dx * dx + dy * dy;
    if (s.hill) { if (d2 < 1.6e6) h += s.hill * Math.exp(-d2 / 217800); } // Tal Moreeb: one big dune
    else if (d2 < s.f2 * 6) { const f = Math.exp(-d2 / s.f2); h = h * (1 - f) + 5 * f; } // level ground around a landmark
  }
  const d = Math.hypot(x, y); if (d > R - 150) { const e = (d - (R - 150)) / 150; h += e * e * 45; } // the rim rises
  return h;
}

// ---------- ground tiles: height-shaded sand, baked once and cached ----------
const TS = 256, TP = 128, TILE_MAX = 150, LX = -0.5, LY = -0.62, LZ = 0.6;
const tiles = new Map(), HG = new Float32Array((TP + 2) * (TP + 2));
let bakeBudget = 0;
function sand(k, out, o) { // k 0..1 = shadow..lit
  if (k < 0.5) { const f = k * 2; out[o] = 168 + 61 * f; out[o + 1] = 98 + 74 * f; out[o + 2] = 58 + 46 * f; }
  else { const f = (k - 0.5) * 2; out[o] = 229 + 23 * f; out[o + 1] = 172 + 56 * f; out[o + 2] = 104 + 66 * f; }
}
function shadeAt(dx, dy, c, wx, wy) {
  const sh = (-dx * LX - dy * LY + LZ) / Math.sqrt(dx * dx + dy * dy + 1);
  let k = (sh - LZ) * 1.25 + 0.5 + (c - 30) * 0.0013 + Math.sin((wx * WX + wy * WY) * 0.42 + vn(wx * 0.01, wy * 0.01) * 5) * 0.02;
  k = clamp(k, 0, 1); return k * 0.55 + Math.round(k * 6) / 6 * 0.45; // half smooth, half banded: a drawn look
}
const SAB = site('sabkha');
function bakeTile(ix, iy) {
  const cv = mk(TP, TP), g = cv.getContext('2d'), img = g.createImageData(TP, TP), px = img.data, N = TP + 2, st = TS / TP;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) HG[j * N + i] = H(ix * TS + (i - 0.5) * st, iy * TS + (j - 0.5) * st);
  for (let j = 0; j < TP; j++) for (let i = 0; i < TP; i++) {
    const p = (j + 1) * N + i + 1, o = (j * TP + i) * 4, wx = ix * TS + (i + 0.5) * st, wy = iy * TS + (j + 0.5) * st;
    const k = shadeAt((HG[p + 1] - HG[p - 1]) / (2 * st), (HG[p + N] - HG[p - N]) / (2 * st), HG[p], wx, wy);
    sand(k, px, o);
    const ds = Math.hypot(wx - SAB.x, wy - SAB.y);
    if (ds < SAB.r) { const f = sstep(SAB.r, SAB.r * 0.72, ds) * 0.85, v = 0.9 + 0.1 * k; px[o] += (236 * v - px[o]) * f; px[o + 1] += (226 * v - px[o + 1]) * f; px[o + 2] += (206 * v - px[o + 2]) * f; }
    const d = Math.hypot(wx, wy);
    if (d > R) { const f = sstep(R, R + 140, d) * 0.6; px[o] += (120 - px[o]) * f; px[o + 1] += (84 - px[o + 1]) * f; px[o + 2] += (66 - px[o + 2]) * f; }
    px[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return cv;
}
function tile(ix, iy) {
  const key = ix + ',' + iy; let c = tiles.get(key);
  if (c) { tiles.delete(key); tiles.set(key, c); return c; }
  if (bakeBudget <= 0) return null; bakeBudget--;
  c = bakeTile(ix, iy); tiles.set(key, c); if (tiles.size > TILE_MAX) tiles.delete(tiles.keys().next().value);
  return c;
}
// the whole reserve in one small picture, for the round map
const MS = 264, miniBase = mk(MS, MS);
async function bakeMini(progress) {
  const g = miniBase.getContext('2d'), img = g.createImageData(MS, MS), px = img.data, k = 2 * R * 1.04 / MS, hg = new Float32Array(MS * MS);
  for (let j = 0; j < MS; j++) { for (let i = 0; i < MS; i++) hg[j * MS + i] = H((i + 0.5 - MS / 2) * k, (j + 0.5 - MS / 2) * k); if (j % 44 === 43) { progress(j / MS); await nextFrame(); } }
  for (let j = 1; j < MS - 1; j++) for (let i = 1; i < MS - 1; i++) {
    const wx = (i + 0.5 - MS / 2) * k, wy = (j + 0.5 - MS / 2) * k, d = Math.hypot(wx, wy), o = (j * MS + i) * 4, p = j * MS + i; if (d > R * 1.03) continue;
    sand(shadeAt((hg[p + 1] - hg[p - 1]) / (2 * k) * 1.6, (hg[p + MS] - hg[p - MS]) / (2 * k) * 1.6, hg[p], wx, wy), px, o); px[o + 3] = 255;
    if (Math.hypot(wx - SAB.x, wy - SAB.y) < SAB.r * 0.8) { px[o] = 236; px[o + 1] = 226; px[o + 2] = 206; }
    if (d > R) { px[o] = 120; px[o + 1] = 84; px[o + 2] = 66; }
  }
  g.putImageData(img, 0, 0);
}

// ---------- sound (ZzFX sound effects, a small Hijaz-scale tune, and an engine hum) ----------
let actx = null, master = null, ZZ = null, nextNote = 0, step = 0, eng = null;
const SND = {};
const SFX_DEF = {
  date: [[1, 0, 1400, 0, .02, .12, 1, 1.6, 0, 0, 520, .04, 0, 0, 0, 0, 0, .6, .01], .3],
  power: [[1, 0, 440, .02, .2, .35, 0, 1.6, 0, 0, 220, .07, .07, 0, 0, 0, 0, .8, .02], .5],
  hit: [[1, .1, 120, 0, .04, .28, 4, 2.2, -8, 0, 0, 0, 0, 1.5, 0, .15, 0, .6, .04], .6],
  smash: [[1, .15, 90, 0, .03, .4, 4, 1.2, -2, 0, 0, 0, 0, 2.5, 0, .3, 0, .5, .05], .55],
  whoosh: [[1, .2, 500, .06, .06, .24, 3, 1, -18, 0, 0, 0, 0, .8, 0, 0, 0, .5, .05], .4],
  zone: [[1, 0, 520, .02, .3, .45, 0, 1.4, 0, 0, 260, .12, .12, 0, 0, 0, 0, .7, .02], .45],
  lose: [[1, 0, 330, .02, .25, .6, 1, 1.4, -2.5, 0, -110, .18, 0, 0, 0, 0, 0, .7, .05], .5],
  dum: [[1, 0, 95, 0, .02, .22, 0, 3, -3.5, 0, 0, 0, 0, 0, 0, 0, 0, .4, .05], .9],
  tek: [[1, 0, 1800, 0, 0, .05, 4, 1, 0, 0, 0, 0, 0, 4, 0, 0, 0, .3, .02], .3],
};
async function initAudio() {
  try { ZZ = (await import('./vendor/zzfx.js?v=__BUILD__')).ZZFX; actx = ZZ.audioContext; }
  catch (e) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e2) { actx = null; } }
  if (!actx) return;
  master = actx.createGain(); master.gain.value = save.muted ? 0 : 1; master.connect(actx.destination);
  if (!ZZ) return;
  for (const [name, [p, vol]] of Object.entries(SFX_DEF)) {
    try { const s = ZZ.buildSamples(...p); const b = actx.createBuffer(1, s.length, ZZ.sampleRate); b.getChannelData(0).set(s); SND[name] = { b, vol }; } catch (e) {}
    await nextFrame();
  }
}
let unlocked = false;
function unlockAudio() {
  if (!actx) return;
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  if (!unlocked) { unlocked = true; try { const s = actx.createBufferSource(); s.buffer = actx.createBuffer(1, 1, 22050); s.connect(actx.destination); s.start(0); } catch (e) {} }
}
function play(name, rate = 1, vol = 1, at = 0) {
  const s = SND[name]; if (!s || !actx || save.muted || actx.state !== 'running') return;
  const src = actx.createBufferSource(), g = actx.createGain();
  src.buffer = s.b; src.playbackRate.value = rate; g.gain.value = s.vol * vol;
  src.connect(g).connect(master); src.start(at || actx.currentTime);
}
function tone(f, d, type, vol, at) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, at); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g).connect(master); o.start(at); o.stop(at + d + 0.02);
}
// Hijaz maqam on D with a maqsum darbuka beat, at a slower desert pace than the runner
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
const MEL = [0, -1, 2, 3, 4, -1, 3, 2, 1, -1, 2, -1, 0, -1, -1, -1, 4, -1, 5, 6, 7, -1, 6, 5, 4, 3, 4, -1, 2, -1, -1, -1,
  7, -1, 6, 5, 4, -1, 5, 4, 3, 2, 3, -1, 1, -1, 2, -1, 4, 3, 2, 1, 2, -1, 1, 0, 1, -1, 0, -1, -1, -1, -1, -1];
const BASS = [0, 0, 3, 3, 4, 4, 0, 0];
function music() {
  if (!actx || save.muted || st !== 'play' || actx.state !== 'running') { if (actx) nextNote = actx.currentTime + 0.05; return; }
  const SP = 60 / 116 / 2;
  if (nextNote < actx.currentTime) nextNote = actx.currentTime + 0.05;
  while (nextNote < actx.currentTime + 0.12) {
    const s = step % MEL.length, b = step % 8, at = nextNote;
    if (MEL[s] >= 0) { const f = 293.66 * Math.pow(2, HIJAZ[MEL[s]] / 12); tone(f, SP * 1.6, 'triangle', 0.02, at); tone(f * 2, SP * 0.7, 'square', 0.004, at); }
    if (b === 0 || b === 4) play('dum', b === 0 ? 1 : 0.9, 0.45, at);
    if (b === 1 || b === 3 || b === 6) play('tek', 1, b === 3 ? 0.45 : 0.3, at);
    if (s % 4 === 0) tone(146.83 * Math.pow(2, HIJAZ[BASS[(s / 4 | 0) % 8]] / 12), SP * 3, 'sine', 0.03, at);
    nextNote += SP; step++;
  }
}
function engine(speed, thr) { // one filtered saw wave whose pitch follows the speed
  if (!actx || actx.state !== 'running') return;
  if (!eng) { try { const o = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; o.connect(f).connect(g).connect(master); o.start(); eng = { o, g }; } catch (e) { return; } }
  const on = st === 'play' && !save.muted, now = actx.currentTime;
  eng.o.frequency.setTargetAtTime(48 + speed * 0.2 + thr * 22, now, 0.08);
  eng.g.gain.setTargetAtTime(on ? 0.012 + Math.abs(thr) * 0.02 + speed * 0.00003 : 0, now, 0.1);
}
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

// ---------- art: people ----------
function limb(c, a, len, w, col, end) {
  c.save(); c.rotate(a); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1.4;
  c.beginPath(); c.roundRect(-w / 2, 0, w, len, w / 2); c.fill(); c.stroke(); if (end) end(c, len); c.restore();
}
const sandalFoot = (c, len) => {
  c.fillStyle = '#5a341c'; c.beginPath(); c.ellipse(2.2, len + 0.6, 5.4, 2, 0, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = '#a0643a'; c.lineWidth = 1.6; c.beginPath(); c.arc(2.5, len, 3, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.strokeStyle = INK;
};
const hand = skin => (c, l) => { c.fillStyle = skin; c.beginPath(); c.arc(0, l + 1, 2.8, 0, TAU); c.fill(); c.stroke(); };
// person(): feet at (x,y), facing right, standing. Same proportions and outlines as the other Abood games:
// kandura with collar and tassel, big-eyed head, shemagh or ghutra held by the black agal.
function person(c, x, y, ph, o) {
  c.save(); c.translate(x, y); c.scale(o.s, o.s); c.lineJoin = 'round'; c.lineCap = 'round';
  const skin = o.skin, skinD = o.skinD, skinL = o.skinL || skin, robe = o.robe || '#fbfaf4', robeD = o.robeD || '#dcd8cb', b = o.belly || 0;
  c.save(); c.translate(-1, -20); limb(c, 0.05, 19, 4.4, skinD, sandalFoot); c.restore();
  c.save(); c.translate(1, -20); limb(c, -0.05, 19, 4.4, skin, sandalFoot); c.restore();
  c.save(); c.translate(-1, -40); limb(c, o.arm === 'wave' ? 0.3 : 0.1, 15, 6, robeD, hand(skinD)); c.restore();
  const rg = c.createLinearGradient(-14, 0, 13 + b, 0); rg.addColorStop(0, robeD); rg.addColorStop(0.5, robe); rg.addColorStop(1, robe);
  const robePath = () => { c.beginPath(); c.moveTo(-8, -44); c.quadraticCurveTo(0, -47, 8, -44); c.quadraticCurveTo(10 + b * 0.6, -36, 10 + b, -28);
    c.quadraticCurveTo(13 + b, -18, 12, -10); c.lineTo(-13, -9); c.quadraticCurveTo(-12, -24, -9, -34); c.closePath(); };
  robePath(); c.fillStyle = rg; c.fill();
  c.save(); c.clip(); c.fillStyle = 'rgba(120,108,85,.16)'; c.fillRect(-20, -15, 40, 7); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(0, -46, 5, 40);
  c.strokeStyle = 'rgba(150,140,120,.45)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-6, -13); c.quadraticCurveTo(-7.5, -26, -5, -40); c.moveTo(1, -10); c.quadraticCurveTo(2, -20, 0, -30); c.stroke(); c.restore();
  robePath(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  c.strokeStyle = '#cfc9ba'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-4, -44.5); c.quadraticCurveTo(2, -42.5, 7, -44.5); c.stroke();
  c.beginPath(); c.moveTo(5, -43); c.quadraticCurveTo(6.5, -38, 6, -32); c.stroke(); c.fillStyle = '#c4bdac'; c.beginPath(); c.ellipse(6, -31, 1.5, 2.6, 0, 0, TAU); c.fill();
  // head
  const hs = o.hs || 1; c.save(); c.translate(2, -46); c.scale(hs, hs); c.translate(-2, 46);
  const hg = c.createRadialGradient(5, -55.5, 1, 2, -52, 10); hg.addColorStop(0, skinL); hg.addColorStop(0.55, skin); hg.addColorStop(1, skinD);
  c.fillStyle = hg; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.arc(2, -52, 9, 0, TAU); c.fill(); c.stroke();
  if (o.beard) { const bg = c.createLinearGradient(0, -56, 0, -43); bg.addColorStop(0, '#3a261b'); bg.addColorStop(1, '#1c110b');
    c.fillStyle = bg; c.beginPath(); c.arc(2, -52, 9.6, -0.15, Math.PI * 0.75); c.quadraticCurveTo(0, -46, 4, -46.8); c.quadraticCurveTo(8, -47.6, 11.2, -52); c.closePath(); c.fill(); }
  else { c.fillStyle = 'rgba(240,110,110,.35)'; c.beginPath(); c.arc(6.2, -48.6, 2.3, 0, TAU); c.fill(); }
  c.strokeStyle = skinD; c.lineWidth = 1.2; c.beginPath(); c.moveTo(10.6, -52.4); c.quadraticCurveTo(12.4, -50.6, 10.5, -49.6); c.stroke();
  c.fillStyle = INK; c.strokeStyle = INK;
  if (o.bigEyes) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(7.3, -52.6, 2.6, 3.1, 0, 0, TAU); c.fill(); c.lineWidth = 0.9; c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(8, -52.3, 1.65, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(8.6, -53.1, 0.6, 0, TAU); c.fill(); }
  else { c.beginPath(); c.arc(7, -52, 1.5, 0, TAU); c.fill(); }
  c.fillStyle = INK; c.lineWidth = o.angry ? 2.3 : 1.6; c.beginPath();
  if (o.angry) { c.moveTo(3.6, -57.2); c.lineTo(10.2, -54.6); } else if (o.mouth === 'o') { c.moveTo(4.5, -56); c.quadraticCurveTo(7, -59, 10, -57.2); } else { c.moveTo(4.8, -56.6); c.quadraticCurveTo(7.5, -58.4, 10.2, -56.2); }
  c.stroke(); c.lineWidth = 1.5;
  if (o.mouth === 'o') { c.fillStyle = '#5a1414'; c.beginPath(); c.ellipse(8.5, -47.4, 1.8, 2.4, 0, 0, TAU); c.fill(); }
  else if (o.mouth === 'talk') { c.beginPath(); c.moveTo(7, -47.4); c.lineTo(10, -47.4 + Math.sin(ph * 2) * 0.8); c.stroke(); }
  else { c.beginPath(); c.arc(7.6, -49.2, 2.7, 0.15, Math.PI - 0.55); c.stroke(); }
  if (o.beard) { c.fillStyle = '#1d120d'; c.beginPath(); c.moveTo(4.6, -49.4); c.quadraticCurveTo(8.4, -51.6, 11.8, -49.2); c.quadraticCurveTo(8.4, -48.3, 4.6, -49.4); c.fill(); }
  // shemagh or ghutra, with the agal
  const wv = Math.sin(ph * 1.3) * 3 * (o.flap || 1), w2 = Math.cos(ph * 1.1) * 3 * (o.flap || 1), tipY = -45 + wv * 1.6 + (o.droop || 0);
  const scarfPath = () => { c.beginPath(); c.moveTo(10.5, -55); c.quadraticCurveTo(11, -63, 1, -63.5); c.quadraticCurveTo(-9, -63, -11, -54);
    c.quadraticCurveTo(-14, -46, -15, -38); c.quadraticCurveTo(-24, -40 + wv, -33, tipY);
    c.quadraticCurveTo(-22, -49 + w2, -10, -46); c.quadraticCurveTo(-5, -48, -4, -52); c.quadraticCurveTo(3, -57.5, 10.5, -55); c.closePath(); };
  scarfPath(); c.fillStyle = o.scarf; c.fill();
  c.save(); c.clip(); c.fillStyle = 'rgba(40,10,10,.16)'; c.fillRect(-40, -50, 34, 16); c.fillRect(-14, -64, 4, 30);
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-6, -61.5); c.quadraticCurveTo(2, -63.4, 8.5, -60); c.stroke(); c.restore();
  scarfPath(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  c.strokeStyle = o.fringe || '#f2ece4'; c.lineWidth = 1.1; c.beginPath();
  for (let k = 0; k < 4; k++) { const fx = -33 + k * 2.4, fy = tipY - 1.2 + k * 1.7; c.moveTo(fx, fy); c.lineTo(fx - 3.6, fy + 2.2 + Math.sin(ph * 2 + k) * 0.8); }
  c.stroke();
  if (o.messy) { c.fillStyle = o.scarf; c.strokeStyle = INK; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-3, -63); c.quadraticCurveTo(-9, -71 + w2, -14, -69); c.quadraticCurveTo(-9, -64, -7, -61); c.closePath(); c.fill(); c.stroke(); }
  const at = o.agalTilt || 0, ay = -60.5 + (o.agalY || 0);
  c.strokeStyle = '#121212'; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, ay, 10.6, 2.6, at, 0, TAU); c.stroke(); c.lineWidth = 1.1; c.beginPath(); c.ellipse(0, ay + 2.3, 10.4, 2.3, at, 0.15, Math.PI - 0.15); c.stroke();
  const tx = -9.6, ty = ay + 2 - Math.sin(at) * 9;
  c.lineWidth = 1.2; c.fillStyle = '#121212'; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx - 3 + wv * 0.3, ty + 6, tx - 4 + wv * 0.5, ty + 12); c.moveTo(tx + 1, ty); c.quadraticCurveTo(tx - 1 + wv * 0.3, ty + 6, tx - 1.5 + wv * 0.5, ty + 13); c.stroke();
  c.beginPath(); c.arc(tx - 4 + wv * 0.5, ty + 12.5, 1.1, 0, TAU); c.arc(tx - 1.5 + wv * 0.5, ty + 13.5, 1.1, 0, TAU); c.fill();
  c.restore();
  c.save(); c.translate(2, -41); limb(c, o.arm === 'wave' ? -1.42 + Math.sin(ph * 2) * 0.22 : o.arm === 'hips' ? -0.5 : -0.1, 15, 6, robe, hand(skin)); // 'wave': pointing out at the dunes c.restore();
  c.restore();
}
const ABOOD = { s: 1, skin: '#c98b5a', skinD: '#a8704a', skinL: '#e0a978', robe: '#fbfaf4', robeD: '#dcd8cb', scarf: SHEMAGH, fringe: '#fff1e8', flap: 1.2, hs: 1.16, bigEyes: 1, agalTilt: -0.08 };
const BABA = { s: 1.38, skin: '#b97a4c', skinD: '#956039', skinL: '#cf9465', scarf: '#f4f3ee', fringe: '#dcd8cc', beard: 1, belly: 4, messy: 1, agalTilt: 0.32, agalY: -1, flap: 1.8, droop: 6, mouth: 'talk', arm: 'hips' };
function drawAvatar(cnv, ph, mood) { // the menu card: Abood in his car, turning slowly so you see him and the car from each side
  const c = cnv.getContext('2d'), S = cnv.width;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S);
  c.fillStyle = '#e3ad68'; c.strokeStyle = INK; c.lineWidth = S / 62; c.beginPath(); c.moveTo(-5, S * 0.74); c.quadraticCurveTo(S * 0.3, S * 0.62, S * 0.62, S * 0.72); c.quadraticCurveTo(S * 0.85, S * 0.79, S + 5, S * 0.68); c.lineTo(S + 5, S + 5); c.lineTo(-5, S + 5); c.closePath(); c.fill(); c.stroke();
  const a = Math.PI / 2 + Math.sin(ph * 0.11) * 1.05;
  c.fillStyle = 'rgba(43,26,18,.2)'; c.beginPath(); c.ellipse(S / 2 + S * 0.02, S * 0.86, S * 0.3, S * 0.1, 0, 0, TAU); c.fill();
  drawCar3D(c, S / 2, S * 0.84, S / 300 * 1.72, { ang: a, steer: Math.cos(ph * 0.11) * 0.7, spin: ph * 0.6, speed: 150, t: ph * 0.2, mouth: mood === 'o' ? 'o' : '', col: COLORS[save.color] || COLORS.white });
}

// ---------- art: the car, a small 3D model drawn in code ----------
// The car is built from boxes, cylinders and lines in its own space (x forward, y right, z up), turned by its
// heading and by the slope under it, then drawn back to front. So it turns smoothly, tilts on the dunes,
// and Abood is seen at the wheel from every side.
const CS = 1.35, ZS = 0.85, VN = Math.hypot(ZS, 1), VY = ZS / VN, VZ = 1 / VN; // model scale; how far "up" moves a point up the screen; the direction to the viewer
const SUNX = -0.45, SUNY = -0.5, SUNZ = 0.74, EC = 0.819, ES = 0.574;          // the sun; the head is drawn as if seen from 35 degrees up, so the face shows
const shadeCache = new Map();
function shade(hex, f) {
  const q = Math.round(clamp(f, 0, 1.12) * 16), key = hex + q; let s = shadeCache.get(key);
  if (!s) { const n = parseInt(hex.slice(1), 16), k = q / 16; s = `rgb(${Math.min(255, (n >> 16) * k | 0)},${Math.min(255, (n >> 8 & 255) * k | 0)},${Math.min(255, (n & 255) * k | 0)})`; shadeCache.set(key, s); }
  return s;
}
function mFace(out, pts, col, cx, cy, cz, o) { // a flat polygon whose outside is the side facing away from (cx,cy,cz)
  const ax = pts[3] - pts[0], ay = pts[4] - pts[1], az = pts[5] - pts[2], bx = pts[6] - pts[0], by = pts[7] - pts[1], bz = pts[8] - pts[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1, n = pts.length / 3; nx /= l; ny /= l; nz /= l;
  let mx = 0, my = 0, mz = 0; for (let i = 0; i < pts.length; i += 3) { mx += pts[i]; my += pts[i + 1]; mz += pts[i + 2]; } mx /= n; my /= n; mz /= n;
  if (nx * (mx - cx) + ny * (my - cy) + nz * (mz - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
  const it = { k: 'f', m: pts, n: [nx, ny, nz], c: [mx, my, mz], col }; if (o) Object.assign(it, o); out.push(it); return it;
}
function mHull(out, b, t, col, o) { // a box, or a tapered box: bottom and top rectangles as [x0, x1, y0, y1, z]
  const P = (r, i, j) => [i ? r[1] : r[0], j ? r[3] : r[2], r[4]], v = [P(b, 0, 0), P(b, 1, 0), P(b, 1, 1), P(b, 0, 1), P(t, 0, 0), P(t, 1, 0), P(t, 1, 1), P(t, 0, 1)];
  const cx = (b[0] + b[1] + t[0] + t[1]) / 4, cy = (b[2] + b[3] + t[2] + t[3]) / 4, cz = (b[4] + t[4]) / 2;
  for (const q of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) mFace(out, q.flatMap(i => v[i]), col, cx, cy, cz, o);
}
function mCyl(out, c, a, u, v, r, w, n, colSide, colCap) { // a wheel: centre, axle direction, and two directions across it
  const ring = s => { const p = []; for (let i = 0; i < n; i++) { const an = i / n * TAU, cs = Math.cos(an) * r, sn = Math.sin(an) * r; p.push(c[0] + a[0] * s + u[0] * cs + v[0] * sn, c[1] + a[1] * s + u[1] * cs + v[1] * sn, c[2] + a[2] * s + u[2] * cs + v[2] * sn); } return p; };
  const r0 = ring(-w / 2), r1 = ring(w / 2);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; mFace(out, [r0[i * 3], r0[i * 3 + 1], r0[i * 3 + 2], r0[j * 3], r0[j * 3 + 1], r0[j * 3 + 2], r1[j * 3], r1[j * 3 + 1], r1[j * 3 + 2], r1[i * 3], r1[i * 3 + 1], r1[i * 3 + 2]], colSide, c[0], c[1], c[2], { ink: '#0e0c0b', iw: 0.9 }); }
  mFace(out, r0, colCap, c[0], c[1], c[2]); mFace(out, r1, colCap, c[0], c[1], c[2]);
}
function mLine(out, pts, col, w, o) {
  let mx = 0, my = 0, mz = 0; const n = pts.length / 3; for (let i = 0; i < pts.length; i += 3) { mx += pts[i]; my += pts[i + 1]; mz += pts[i + 2]; }
  const it = { k: 'l', m: pts, c: [mx / n, my / n, mz / n], col, w }; if (o) Object.assign(it, o); out.push(it);
}
const WHEELS = [[-25, -20, 0], [-25, 20, 0], [25, -20, 1], [25, 20, 1]], TYRE = '#2a2623', STEEL = '#2f2a27';
function buildCar() { // the parts that never move
  const M = [];
  mHull(M, [-34, 30, -13, 13, 8], [-36, 33, -15, 15, 20], 'main');                                   // the tub
  mHull(M, [8, 33, -15, 15, 20], [11, 30, -12, 12, 26], 'main');                                     // bonnet
  mFace(M, [12, -3, 26.2, 29.5, -3, 26.2, 29.5, 3, 26.2, 12, 3, 26.2], 'trim', 20, 0, 0, { b: 0.6, noInk: 1 }); // racing stripe
  mHull(M, [-36, -16, -15, 15, 20], [-35, -17, -14, 14, 25], 'main');                                // rear deck
  mFace(M, [-16, -12.5, 20.2, 8, -12.5, 20.2, 8, 12.5, 20.2, -16, 12.5, 20.2], '#3a322c', 0, 0, 0, { b: 0.4 }); // cockpit floor
  mHull(M, [-16, 8, -15, -13, 20], [-16, 8, -15, -13, 27], 'main'); mHull(M, [-16, 8, 13, 15, 20], [-16, 8, 13, 15, 27], 'main'); // doors
  mHull(M, [6, 9, -13, 13, 20], [6, 9, -13, 13, 28], 'dark');                                        // dashboard
  mHull(M, [-17, -12.5, -9.5, 9.5, 20], [-18, -13.5, -9.5, 9.5, 36], '#4a4440');                     // seat back
  for (const sg of [-1, 1]) {
    mHull(M, [33, 34.6, sg * 9 - 3, sg * 9 + 3, 20.5], [33, 34.6, sg * 9 - 3, sg * 9 + 3, 25], '#fff3c4', { raw: 1 });   // headlights
    mHull(M, [-36.6, -35.5, sg * 10 - 2.5, sg * 10 + 2.5, 21], [-36.6, -35.5, sg * 10 - 2.5, sg * 10 + 2.5, 24], '#e8112d', { raw: 1 }); // tail lights
    for (const wx of [-25, 25]) { const y0 = sg > 0 ? 15 : -26, y1 = sg > 0 ? 26 : -15; mHull(M, [wx - 14, wx + 14, y0, y1, 25.6], [wx - 11, wx + 11, y0, y1, 27.4], 'main'); } // mudguards
  }
  mFace(M, [33.3, -5, 12.5, 33.3, 5, 12.5, 33.3, 5, 19, 33.3, -5, 19], '#2a2623', 0, 0, 16, { b: 0.5 });  // grille
  mHull(M, [-33, -27, 5, 12, 25], [-33, -27, 5, 12, 34], '#b3261e');                                 // jerrycan
  mCyl(M, [-39.5, 0, 21], [1, 0, 0], [0, 1, 0], [0, 0, 1], 9, 6, 10, TYRE, '#3a3531');               // spare wheel
  mLine(M, [-18, -14, 25, -21, -14, 58, -21, 14, 58, -18, 14, 25], STEEL, 2.8, { ol: 1 });           // roll bar, behind Abood
  mLine(M, [-21, -14, 58, -34, -13, 25], STEEL, 2.4, { ol: 1 }); mLine(M, [-21, 14, 58, -34, 13, 25], STEEL, 2.4, { ol: 1 });
  for (const y of [-9, -3, 3, 9]) mHull(M, [-22.5, -19.5, y - 2.4, y + 2.4, 58.5], [-22.5, -19.5, y - 2.4, y + 2.4, 63], '#ffd95a', { raw: 1 }); // roof lights
  mLine(M, [9, -13, 27, 6.5, -13, 39, 6.5, 13, 39, 9, 13, 27], STEEL, 1.8);                          // windscreen frame
  mFace(M, [9, -13, 27, 6.5, -13, 39, 6.5, 13, 39, 9, 13, 27], '#cfeef4', 0, 0, 33, { ds: 1, raw: 1, a: 0.3, noInk: 1 });
  mLine(M, [34, -13, 11, 38, -13, 21, 38, 13, 21, 34, 13, 11], '#8a817a', 2.4, { ol: 1 }); mLine(M, [38, -13, 16, 38, 13, 16], '#8a817a', 2, { ol: 1 }); // bull bar
  mLine(M, [9, 0, 25, 3.5, 0, 31.5], '#1b1715', 1.8);                                               // steering column
  mHull(M, [-12.5, -3.5, -7, 7, 21], [-12.5, -4.5, -8.8, 8.8, 39], '#fbfaf4');                               // Abood's kandura
  mLine(M, [-4.2, 0, 38.5, -3.8, 0, 31], '#cfc9ba', 0.9, { b: 0.5 });                                    // its tassel
  return M;
}
const CAR_STATIC = buildCar(), carItems = [];
const comb = (a, ka, b, kb, c, kc) => { const x = a[0] * ka + b[0] * kb + c[0] * kc, y = a[1] * ka + b[1] * kb + c[1] * kc, z = a[2] * ka + b[2] * kb + c[2] * kc, l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
function drawHead(c, hx, hy, r, f, s, u, mouth, sc) { // Abood's head: red shemagh, black agal, big eyes
  const hp = (v, m) => [hx + v[0] * m, hy + (v[1] * ES - v[2] * EC) * m], see = v => v[1] * EC + v[2] * ES;
  c.fillStyle = SHEMAGH; c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.fill();
  c.save(); c.clip();
  const fd = comb(f, 1, u, -0.2, s, 0);
  if (see(fd) > -0.4) {
    let p = hp(fd, r * 0.5); const g = c.createRadialGradient(p[0], p[1] - r * 0.2, r * 0.1, p[0], p[1], r * 0.8); g.addColorStop(0, '#e0a978'); g.addColorStop(0.6, '#c98b5a'); g.addColorStop(1, '#a8704a');
    c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], r * 0.74, 0, TAU); c.fill(); c.strokeStyle = 'rgba(43,26,18,.55)'; c.lineWidth = 1.1 * sc; c.stroke();
    const look = hp(f, r * 0.07);
    for (const sd of [-1, 1]) { const e = comb(f, 0.86, s, sd * 0.5, u, 0.2); if (see(e) < 0.12) continue; p = hp(e, r * 0.93);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 0.9 * sc; c.beginPath(); c.ellipse(p[0], p[1], r * 0.23, r * 0.26, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(p[0] + look[0] - hx, p[1] + look[1] - hy, r * 0.14, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(p[0] + look[0] - hx + r * 0.05, p[1] + look[1] - hy - r * 0.06, r * 0.05, 0, TAU); c.fill(); }
    for (const sd of [-1, 1]) { const ch = comb(f, 0.8, s, sd * 0.62, u, -0.22); if (see(ch) < 0.3) continue; p = hp(ch, r * 0.93); c.fillStyle = 'rgba(240,110,110,.4)'; c.beginPath(); c.arc(p[0], p[1], r * 0.13, 0, TAU); c.fill(); }
    const m = comb(f, 1, u, -0.3, s, 0);
    if (see(m) > 0.25) { p = hp(m, r * 0.93); c.strokeStyle = INK; c.lineWidth = 1.4 * sc; c.beginPath();
      if (mouth === 'o') { c.fillStyle = '#5a1414'; c.ellipse(p[0], p[1] - r * 0.05, r * 0.15, r * 0.19, 0, 0, TAU); c.fill(); c.stroke(); }
      else { c.arc(p[0], p[1] - r * 0.14, r * 0.2, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); } }
  }
  c.restore();
  c.beginPath(); for (let i = 0; i < 16; i++) { const an = i / 16 * TAU, cs = Math.cos(an) * 0.82, sn = Math.sin(an) * 0.82, p = hp([u[0] * 0.5 + f[0] * cs + s[0] * sn, u[1] * 0.5 + f[1] * cs + s[1] * sn, u[2] * 0.5 + f[2] * cs + s[2] * sn], r); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
  c.closePath(); c.fillStyle = SHEMAGH; c.fill(); c.strokeStyle = '#121212'; c.lineWidth = 2.5 * sc; c.stroke();     // the top of the shemagh, ringed by the agal
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.3 * sc; c.beginPath(); c.arc(hx, hy - r * 0.42, r * 0.36, Math.PI * 1.15, Math.PI * 1.7); c.stroke();
  c.strokeStyle = INK; c.lineWidth = 1.5 * sc; c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.stroke();
}
// o: ang (heading), pit and rol (tilt), lift (height off the ground), steer, spin (wheel turn), speed, lat (sideways speed), t, air, mouth, col
function drawCar3D(c, x, y, sc, o) {
  const GA = c.globalAlpha, col = o.col, k = CS * sc, th = o.pit || 0, ph = o.rol || 0, cp = Math.cos(th), sp = Math.sin(th), cr = Math.cos(ph), sr = Math.sin(ph), ca = Math.cos(o.ang), sa = Math.sin(o.ang);
  const yaw = (vx, vy, vz) => [vx * ca - vy * sa, vx * sa + vy * ca, vz];
  const F = yaw(cp, 0, sp), R = yaw(-sp * sr, cr, cp * sr), U = yaw(-sp * cr, -sr, cp * cr), oy = y - (o.lift || 0) * 0.7 * sc;
  const st = (o.steer || 0) * 0.5, spd = o.speed || 0, tt = o.t || 0, spin = o.spin || 0, D = [];
  // wheels: the front pair turns with the steering, all four spin
  for (const [wx, wy, front] of WHEELS) {
    const s = front ? st : 0, a = [-Math.sin(s), Math.cos(s), 0], u = [Math.cos(s), Math.sin(s), 0], v = [0, 0, 1], sg = Math.sign(wy), cx = wx, cy = wy, cz = 12.5;
    mCyl(D, [cx, cy, cz], a, u, v, 12.5, 10.5, 12, TYRE, '#3a3531');
    const hub = [], hx = cx + a[0] * sg * 5.6, hy = cy + a[1] * sg * 5.6; for (let i = 0; i < 6; i++) { const an = spin + i / 6 * TAU, cs = Math.cos(an) * 6.6, sn = Math.sin(an) * 6.6; hub.push(hx + u[0] * cs, hy + u[1] * cs, cz + sn); }
    const hf = mFace(D, hub, '#d9cfbd', cx, cy, cz, { b: 0.8 });
    mLine(D, [hub[0], hub[1], hub[2], hub[9], hub[10], hub[11]], '#6b635c', 1.3, { b: 1.2, n: hf.n }); mLine(D, [hub[3], hub[4], hub[5], hub[12], hub[13], hub[14]], '#6b635c', 1.3, { b: 1.2, n: hf.n });
  }
  // Abood: arms on the wheel (up in the air on a jump), the steering wheel, the tail of his shemagh streaming back
  const up = o.air, hl = up ? [-3, -15, 64] : [2.6 - st * 2.4, -4.4, 31.8 + st * 2], hr = up ? [-3, 15, 64] : [2.6 + st * 2.4, 4.4, 31.8 - st * 2];
  mLine(D, [-8, -9, 37, hl[0], hl[1], hl[2]], '#fbfaf4', 4.6, { ol: 1 }); mLine(D, [-8, 9, 37, hr[0], hr[1], hr[2]], '#fbfaf4', 4.6, { ol: 1 });
  D.push({ k: 'd', c: hl, r: 3, col: '#c98b5a' }, { k: 'd', c: hr, r: 3, col: '#c98b5a' });
  const ring = []; for (let i = 0; i <= 10; i++) { const an = i / 10 * TAU + st * 2, cs = Math.cos(an) * 4.8, sn = Math.sin(an) * 4.8; ring.push(3.5 - sn * 0.45, cs, 31.5 + sn * 0.89); } mLine(D, ring, '#1b1715', 2);
  const fl = clamp(Math.abs(spd) * 0.07, 0, 20), wv = Math.sin(tt * 10) * (1.5 + fl * 0.12), lat = clamp(-(o.lat || 0) * 0.05, -7, 7), tx = -20 - fl, tz = 51 - Math.max(0, 16 - fl) + wv * 0.5;
  mFace(D, [-16, -8, 52, -16, 8, 52, -13.6, 9.4, 39, -13.6, -9.4, 39], SHEMAGH, -7, 0, 45, { ds: 1 });                    // shemagh over the shoulders
  mFace(D, [-17, -6.5, 55, -17, 6.5, 55, tx, lat + wv + 3.5, tz, tx, lat + wv - 3.5, tz], SHEMAGH, -7, 0, 20, { ds: 1 }); // and its tail
  mLine(D, [tx, lat + wv - 3.5, tz, tx, lat + wv + 3.5, tz], '#fff1e8', 1.6);
  D.push({ k: 'h', c: [-7, 0, 52], r: 12.5 });
  // the whip mast every dune car carries, with the UAE flag, leaning back with the speed
  const ln = clamp(-spd * 0.05, -15, 5) + Math.sin(tt * 9) * 1.2, bx = -34, by = -13, mx = bx + ln, my = by + lat, mz = 80;
  mLine(D, [bx, by, 25, bx + ln * 0.3, by + lat * 0.3, 52, mx, my, mz], INK, 1.2);
  const fw = Math.sin(tt * 12) * 1.5, band = (z0, z1, hex) => mFace(D, [mx - 4, my, mz - z0, mx - 15, my + fw, mz - z0, mx - 15, my + fw, mz - z1, mx - 4, my, mz - z1], hex, 0, 0, 0, { ds: 1, raw: 1, iw: 0.7 });
  band(0, 3, '#00732f'); band(3, 6, '#ffffff'); band(6, 9, '#111111'); mFace(D, [mx, my, mz, mx - 4, my, mz, mx - 4, my, mz - 9, mx, my, mz - 9], '#e8112d', 0, 0, 0, { ds: 1, raw: 1, iw: 0.7 });
  // sort back to front, dropping faces that point away
  carItems.length = 0;
  const add = it => {
    if (it.n) { const n = it.n, nx = F[0] * n[0] + R[0] * n[1] + U[0] * n[2], ny = F[1] * n[0] + R[1] * n[1] + U[1] * n[2], nz = F[2] * n[0] + R[2] * n[1] + U[2] * n[2], vis = ny * VY + nz * VZ;
      if (vis <= 0.02 && !it.ds) return; it.f = 0.72 + 0.4 * Math.max(0, (nx * SUNX + ny * SUNY + nz * SUNZ) * (vis < 0 ? -1 : 1)); }
    const m = it.c; it.d = (F[1] * m[0] + R[1] * m[1] + U[1] * m[2]) * VY + (F[2] * m[0] + R[2] * m[1] + U[2] * m[2]) * VZ + (it.b || 0); carItems.push(it);
  };
  for (const it of CAR_STATIC) add(it); for (const it of D) add(it);
  carItems.sort((a, b) => a.d - b.d);
  const path = m => { c.beginPath(); for (let i = 0; i < m.length; i += 3) { const X = F[0] * m[i] + R[0] * m[i + 1] + U[0] * m[i + 2], Y = F[1] * m[i] + R[1] * m[i + 1] + U[1] * m[i + 2], Z = F[2] * m[i] + R[2] * m[i + 1] + U[2] * m[i + 2]; if (i) c.lineTo(x + X * k, oy + (Y - ZS * Z) * k); else c.moveTo(x + X * k, oy + (Y - ZS * Z) * k); } };
  const pt = m => { const X = F[0] * m[0] + R[0] * m[1] + U[0] * m[2], Y = F[1] * m[0] + R[1] * m[1] + U[1] * m[2], Z = F[2] * m[0] + R[2] * m[1] + U[2] * m[2]; return [x + X * k, oy + (Y - ZS * Z) * k]; };
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const it of carItems) {
    const hex = it.col && (it.col[0] === '#' ? it.col : col[it.col]);
    if (it.k === 'f') { path(it.m); c.closePath(); if (it.a) c.globalAlpha = it.a * GA; c.fillStyle = it.raw ? hex : shade(hex, it.f); c.fill(); if (it.a) c.globalAlpha = GA;
      if (!it.noInk) { c.strokeStyle = it.ink || INK; c.lineWidth = (it.iw || 1.25) * sc; c.stroke(); } }
    else if (it.k === 'l') { path(it.m); if (it.ol) { c.strokeStyle = INK; c.lineWidth = (it.w + 1.7) * k; c.stroke(); } c.strokeStyle = hex; c.lineWidth = it.w * k; c.stroke(); }
    else if (it.k === 'd') { const p = pt(it.c); c.fillStyle = hex; c.strokeStyle = INK; c.lineWidth = 1.2 * sc; c.beginPath(); c.arc(p[0], p[1], it.r * k, 0, TAU); c.fill(); c.stroke(); }
    else { const p = pt(it.c), hy = st * 0.7, ch = Math.cos(hy), sh = Math.sin(hy);
      drawHead(c, p[0], p[1], it.r * k, [F[0] * ch + R[0] * sh, F[1] * ch + R[1] * sh, F[2] * ch + R[2] * sh], [R[0] * ch - F[0] * sh, R[1] * ch - F[1] * sh, R[2] * ch - F[2] * sh], U, o.mouth, sc); }
  }
}

// ---------- art: scenery, drawn standing up on the sand (feet at 0,0) ----------
const ink = (c, w = 1.6) => { c.strokeStyle = INK; c.lineWidth = w; };
const fs = c => { c.fill(); c.stroke(); };
function uaeFlag(c, x, y, w, h) { c.fillStyle = '#00732f'; c.fillRect(x, y, w, h / 3); c.fillStyle = '#fff'; c.fillRect(x, y + h / 3, w, h / 3); c.fillStyle = '#111'; c.fillRect(x, y + h * 2 / 3, w, h / 3); c.fillStyle = '#e8112d'; c.fillRect(x, y, w * 0.28, h); ink(c, 1.3); c.strokeRect(x, y, w, h); }
function aPalm(c) {
  ink(c); c.fillStyle = '#9a6a3c'; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(-1, -40, 3, -72); c.lineTo(9, -72); c.quadraticCurveTo(6, -40, 6, 0); c.closePath(); fs(c);
  c.strokeStyle = 'rgba(43,26,18,.45)'; c.lineWidth = 1.1; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(-4 + i * 0.9, -i * 9); c.lineTo(6 + i * 0.3, -i * 9 - 3); c.stroke(); }
  ink(c, 1.5);
  for (const [a, l, col] of [[-3.5, 30, '#3c9a58'], [0.35, 30, '#2f7d4a'], [-2.95, 40, '#2f7d4a'], [-0.2, 40, '#3c9a58'], [-2.4, 44, '#3c9a58'], [-0.75, 44, '#2f7d4a'], [-1.9, 40, '#2f7d4a'], [-1.25, 40, '#3c9a58']]) {
    const ex = 6 + Math.cos(a) * l, ey = -74 + Math.sin(a) * l * 0.8 + 14, mx = 6 + Math.cos(a) * l * 0.5, my = -74 + Math.sin(a) * l * 0.9 - 6;
    c.fillStyle = col; c.beginPath(); c.moveTo(6, -75); c.quadraticCurveTo(mx, my - 8, ex, ey); c.quadraticCurveTo(mx, my + 5, 6, -71); c.closePath(); fs(c);
  }
  c.fillStyle = '#c9772b'; c.beginPath(); c.ellipse(1, -64, 4, 6, 0.3, 0, TAU); fs(c); c.beginPath(); c.ellipse(11, -63, 3.5, 5.5, -0.3, 0, TAU); fs(c);
}
function aTent(c) { // bayt al-sha'ar: the black goat-hair tent with a red sadu band
  ink(c); c.fillStyle = '#f3e3c2'; c.beginPath(); c.moveTo(-70, 0); c.lineTo(-62, -34); c.lineTo(62, -34); c.lineTo(70, 0); c.closePath(); fs(c);
  c.fillStyle = SHEMAGH; c.beginPath(); c.roundRect(-50, -12, 38, 10, 4); fs(c); c.fillStyle = '#1f7a74'; c.beginPath(); c.roundRect(10, -12, 38, 10, 4); fs(c);
  c.strokeStyle = '#fffaf0'; c.lineWidth = 1.2; c.beginPath(); for (let i = -46; i < -14; i += 6) { c.moveTo(i, -11); c.lineTo(i, -3); } for (let i = 14; i < 46; i += 6) { c.moveTo(i, -11); c.lineTo(i, -3); } c.stroke();
  ink(c); c.fillStyle = '#2f2622'; c.beginPath(); c.moveTo(-86, -30); c.lineTo(-58, -52); c.lineTo(-30, -44); c.lineTo(0, -60); c.lineTo(30, -44); c.lineTo(58, -52); c.lineTo(86, -30); c.lineTo(74, -24); c.lineTo(-74, -24); c.closePath(); fs(c);
  c.fillStyle = SHEMAGH; c.fillRect(-74, -30, 148, 5); c.fillStyle = '#fffaf0'; for (let i = -70; i < 70; i += 12) { c.beginPath(); c.moveTo(i, -25); c.lineTo(i + 6, -30); c.lineTo(i + 12, -25); c.fill(); }
  ink(c, 1.3); c.strokeRect(-74, -30, 148, 5);
  c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(-62, 0); c.lineTo(-62, -30); c.moveTo(0, 0); c.lineTo(0, -30); c.moveTo(62, 0); c.lineTo(62, -30); c.stroke();
  ink(c, 1.2); c.beginPath(); c.moveTo(-86, -30); c.lineTo(-100, 0); c.moveTo(86, -30); c.lineTo(100, 0); c.stroke();
}
function aFire(c) {
  ink(c); c.fillStyle = '#6b4a2b'; c.save(); c.rotate(0.25); c.beginPath(); c.roundRect(-14, -5, 28, 6, 3); fs(c); c.restore(); c.save(); c.rotate(-0.25); c.beginPath(); c.roundRect(-14, -5, 28, 6, 3); fs(c); c.restore();
  c.fillStyle = '#f28c28'; c.beginPath(); c.moveTo(-8, -4); c.quadraticCurveTo(-12, -16, -2, -26); c.quadraticCurveTo(0, -18, 5, -22); c.quadraticCurveTo(12, -12, 8, -4); c.closePath(); fs(c);
  c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(-3, -5); c.quadraticCurveTo(-5, -12, 0, -17); c.quadraticCurveTo(5, -11, 3, -5); c.closePath(); c.fill();
  c.fillStyle = '#e0a72a'; c.beginPath(); c.moveTo(20, 0); c.lineTo(18, -9); c.quadraticCurveTo(24, -19, 30, -9); c.lineTo(28, 0); c.closePath(); fs(c); // the dallah coffee pot
  c.beginPath(); c.moveTo(30, -10); c.lineTo(37, -14); c.stroke(); c.beginPath(); c.arc(16, -7, 4, Math.PI * 0.6, Math.PI * 1.5); c.stroke();
}
function aFort(c) {
  ink(c); c.fillStyle = '#d8a25f';
  c.beginPath(); c.moveTo(-70, 0); c.lineTo(-70, -58); for (let x = -70; x < 90; x += 16) { c.lineTo(x, -66); c.lineTo(x + 8, -66); c.lineTo(x + 8, -58); c.lineTo(x + 16, -58); } c.lineTo(90, 0); c.closePath(); fs(c);
  c.fillStyle = 'rgba(120,70,30,.18)'; c.fillRect(-70, -22, 160, 22);
  c.fillStyle = '#e3b271'; c.beginPath(); c.moveTo(-96, 0); c.lineTo(-92, -92); c.lineTo(-88, -100); c.lineTo(-80, -92); c.lineTo(-72, -100); c.lineTo(-64, -92); c.lineTo(-56, -100); c.lineTo(-52, -92); c.lineTo(-48, 0); c.closePath(); fs(c);
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-90, -90, 10, 90);
  c.fillStyle = '#1f7a74'; c.beginPath(); c.moveTo(-4, 0); c.lineTo(-4, -26); c.quadraticCurveTo(10, -44, 24, -26); c.lineTo(24, 0); c.closePath(); fs(c);
  c.beginPath(); c.moveTo(10, 0); c.lineTo(10, -35); c.stroke(); c.fillStyle = '#e0a72a'; for (const [x, y] of [[3, -10], [3, -20], [17, -10], [17, -20]]) { c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill(); }
  c.fillStyle = '#4a2d18'; for (const x of [-34, 48, 70]) { c.beginPath(); c.roundRect(x, -44, 8, 14, 4); fs(c); } c.beginPath(); c.roundRect(-76, -70, 8, 14, 4); fs(c);
  c.strokeStyle = '#6b4a2b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-72, -98); c.lineTo(-72, -132); c.stroke(); uaeFlag(c, -72, -132, 28, 15);
}
// Animals of the Liwa sands, drawn side-on and facing right, in four walking frames (q = 0..3).
function tube(c, p, w, col) { // a limb or horn: a thick line with an ink edge
  c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
  c.strokeStyle = INK; c.lineWidth = w + 2.6; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
function leg(c, hx, hy, a, up, lo, w, col, back, foot, band) { // hip, swing, upper and lower length; hind legs bend the other way
  const kx = hx + Math.sin(a) * up, ky = hy + Math.cos(a) * up, b = a * 0.4 + (back ? -0.2 : 0.12), sx = Math.sin(b), cy = Math.cos(b), fx = kx + sx * lo, fy = ky + cy * lo;
  tube(c, [kx, ky, fx, fy], w * 0.7, col); tube(c, [hx, hy, kx, ky], w, col);
  if (band) { c.strokeStyle = band; c.lineWidth = w * 0.7; c.beginPath(); c.moveTo(kx + sx * lo * 0.7, ky + cy * lo * 0.7); c.lineTo(kx + sx * lo * 0.9, ky + cy * lo * 0.9); c.stroke(); }
  c.fillStyle = foot; c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.ellipse(fx + 1.2, fy, w * 0.72, w * 0.42, 0, 0, TAU); c.fill(); c.stroke();
}
function aCamel(c, q) { // the dromedary: one hump, long curved neck, long legs on broad pads, a red rope halter
  const A = q * Math.PI / 2, sw = o => Math.sin(A + o) * 0.3, body = '#d6ab70', dark = '#b3884f', pad = '#8a6a44';
  leg(c, -18, -54, sw(0), 26, 27, 7, dark, 1, pad); leg(c, 20, -54, sw(Math.PI), 26, 27, 6.4, dark, 0, pad);
  tube(c, [-31, -66, -36, -54, -35, -44], 2.6, body); c.fillStyle = '#6b4a2b'; c.beginPath(); c.ellipse(-35, -40, 2.6, 5, 0.1, 0, TAU); c.fill();
  const shape = () => { c.beginPath(); c.moveTo(-30, -66); c.bezierCurveTo(-30, -82, -20, -84, -14, -92); c.quadraticCurveTo(-6, -106, 4, -90); c.quadraticCurveTo(10, -82, 18, -82);
    c.bezierCurveTo(28, -84, 30, -104, 40, -110); c.quadraticCurveTo(46, -115, 54, -109); c.lineTo(62, -101); c.quadraticCurveTo(65, -96, 58, -94.5); c.quadraticCurveTo(50, -95, 46, -98);
    c.bezierCurveTo(39, -88, 35, -66, 22, -56); c.quadraticCurveTo(0, -45, -22, -52); c.quadraticCurveTo(-32, -56, -30, -66); c.closePath(); };
  const g = c.createLinearGradient(0, -108, 0, -46); g.addColorStop(0, '#ecd09c'); g.addColorStop(0.45, body); g.addColorStop(1, dark);
  shape(); c.fillStyle = g; c.fill(); c.save(); c.clip();
  c.fillStyle = 'rgba(120,80,40,.18)'; c.beginPath(); c.ellipse(-2, -50, 30, 8, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-8, -96, 9, 4, -0.2, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(120,80,40,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-12, -96); c.lineTo(-10, -90); c.moveTo(-6, -99); c.lineTo(-5, -92); c.moveTo(0, -95); c.lineTo(0, -89); c.moveTo(24, -78); c.quadraticCurveTo(30, -84, 32, -94); c.stroke(); c.restore();
  shape(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = body; c.beginPath(); c.moveTo(41, -110); c.quadraticCurveTo(38, -118, 43, -116); c.quadraticCurveTo(45, -113, 45, -110); c.closePath(); c.fill(); c.stroke();      // ear
  c.strokeStyle = SHEMAGH; c.lineWidth = 1.7; c.beginPath(); c.moveTo(56.5, -106.5); c.lineTo(57.5, -95); c.moveTo(56.8, -104); c.lineTo(45, -109); c.moveTo(57, -97); c.quadraticCurveTo(50, -84, 44, -80); c.stroke(); // halter and rope
  c.fillStyle = INK; c.beginPath(); c.ellipse(51, -106, 1.6, 1.3, 0, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(48.6, -108); c.lineTo(53.6, -107.6); c.moveTo(60.5, -100.5); c.lineTo(62, -99.5); c.moveTo(58, -97.4); c.lineTo(63, -97.8); c.stroke();
  leg(c, -24, -53, sw(Math.PI), 26, 26, 7.4, body, 1, pad); leg(c, 15, -53, sw(0), 26, 26, 6.8, body, 0, pad);
}
function aOryx(c, q) { // Arabian oryx: bright white, brown legs with white above the hooves, black face stripes, long ringed horns, tufted tail
  const A = q * Math.PI / 2, sw = o => Math.sin(A + o) * 0.3, white = '#f8f6f0', brown = '#5b3b25', far = '#452b1a', hoof = '#1d1410', mark = '#33211a';
  leg(c, -14, -41, sw(0), 19, 21, 4.6, far, 1, hoof); leg(c, 16, -41, sw(Math.PI), 19, 21, 4.4, far, 0, hoof);
  tube(c, [-24, -58, -29, -47, -28, -38], 2, white); c.fillStyle = mark; c.beginPath(); c.ellipse(-28, -33, 2.6, 5.4, 0.1, 0, TAU); c.fill();
  for (const [x0, x1, x2] of [[30, 20, 13], [27.5, 16, 7]]) { tube(c, [x0, -85, x1, -108, x2, -131], 2.3, '#3a2a20');       // horns, nearly straight, ringed on the lower half
    c.strokeStyle = 'rgba(255,240,220,.4)'; c.lineWidth = 0.9; c.beginPath(); for (let i = 1; i < 7; i++) { const k = i / 12, hx = x0 + (x1 - x0) * k * 2, hy = -85 - 23 * k * 2; c.moveTo(hx - 1.2, hy - 0.5); c.lineTo(hx + 1.2, hy + 0.5); } c.stroke(); }
  const shape = () => { c.beginPath(); c.moveTo(-25, -56); c.bezierCurveTo(-24, -68, -8, -66, 2, -66); c.quadraticCurveTo(10, -73, 16, -68); c.quadraticCurveTo(20, -78, 26, -85);
    c.quadraticCurveTo(37, -85, 43, -68); c.quadraticCurveTo(44.5, -63, 40, -63); c.quadraticCurveTo(34, -66, 30, -70); c.quadraticCurveTo(28, -58, 22, -50); c.quadraticCurveTo(0, -36, -18, -42); c.quadraticCurveTo(-27, -46, -25, -56); c.closePath(); };
  const g = c.createLinearGradient(0, -84, 0, -38); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, white); g.addColorStop(1, '#d6d0c2');
  shape(); c.fillStyle = g; c.fill(); c.save(); c.clip();
  c.strokeStyle = '#8a6a4a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(20, -49); c.quadraticCurveTo(0, -36.5, -18, -42.5); c.stroke();                       // brown line along the belly
  c.fillStyle = mark; c.save(); c.translate(37.5, -73); c.rotate(1.02); c.beginPath(); c.ellipse(0, 0, 6.5, 2.5, 0, 0, TAU); c.fill(); c.restore();           // nose blaze
  c.beginPath(); c.ellipse(29, -83.5, 3.4, 2, 0.5, 0, TAU); c.fill();                                                                                         // forehead patch
  c.strokeStyle = mark; c.lineWidth = 2.3; c.beginPath(); c.moveTo(27.5, -84); c.quadraticCurveTo(30, -76, 36, -65); c.stroke();                               // stripe from the horn, across the eye, to the mouth
  c.lineWidth = 2; c.beginPath(); c.moveTo(22, -74); c.quadraticCurveTo(25, -68, 30, -68.5); c.stroke(); c.restore();                                         // throat stripe
  shape(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = white; c.beginPath(); c.moveTo(25, -84); c.quadraticCurveTo(17, -90, 18, -84); c.quadraticCurveTo(20, -81, 24, -81); c.closePath(); c.fill(); c.stroke();   // ear
  c.fillStyle = '#0d0907'; c.beginPath(); c.arc(31, -77.6, 1.4, 0, TAU); c.fill(); c.beginPath(); c.arc(42, -65.4, 0.9, 0, TAU); c.fill();
  leg(c, -20, -42, sw(Math.PI), 19, 21, 5, brown, 1, hoof, white); leg(c, 12, -42, sw(0), 19, 21, 4.8, brown, 0, hoof, white);
}
function aGazelle(c, q) { // reem, the Arabian sand gazelle: pale sandy back, white belly and face, curved ringed horns, short black tail
  const A = q * Math.PI / 2, sw = o => Math.sin(A + o) * 0.34, sandy = '#e3c690', far = '#c9a973', hoof = '#2a1c14';
  leg(c, -9, -28, sw(0), 13, 15, 3, far, 1, hoof); leg(c, 11, -28, sw(Math.PI), 13, 15, 2.8, far, 0, hoof);
  tube(c, [-16, -40, -19.5, -34], 2.2, '#231710');
  tube(c, [18.5, -60, 16, -70, 20, -79], 1.7, '#2a1c14'); tube(c, [16.5, -60, 12, -70, 14.5, -80], 1.7, '#2a1c14');
  const shape = () => { c.beginPath(); c.moveTo(-16, -38); c.bezierCurveTo(-15, -48, -4, -46, 4, -46); c.quadraticCurveTo(10, -48, 13, -57); c.quadraticCurveTo(14, -61, 16, -61.5);
    c.quadraticCurveTo(22, -62, 25.5, -54); c.quadraticCurveTo(26, -51, 22.5, -51); c.quadraticCurveTo(19.5, -52, 18, -48); c.quadraticCurveTo(17, -40, 12, -32); c.quadraticCurveTo(0, -26, -11, -30); c.quadraticCurveTo(-17, -32, -16, -38); c.closePath(); };
  shape(); c.fillStyle = sandy; c.fill(); c.save(); c.clip();
  c.fillStyle = '#fbf8f0'; c.beginPath(); c.ellipse(-1, -28, 17, 6.5, -0.08, 0, TAU); c.fill(); c.beginPath(); c.ellipse(21, -56, 6, 6, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-16, -37, 3.6, 5, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(150,110,60,.55)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-13, -34.5); c.quadraticCurveTo(0, -32, 13, -35.5); c.stroke(); c.restore();
  shape(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  c.fillStyle = sandy; c.beginPath(); c.moveTo(14, -60.5); c.quadraticCurveTo(7, -67, 8.5, -60); c.quadraticCurveTo(10.5, -57.5, 13.5, -57.5); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#0d0907'; c.beginPath(); c.arc(19.6, -56.6, 1.2, 0, TAU); c.fill(); c.beginPath(); c.arc(24.6, -52.6, 0.8, 0, TAU); c.fill();
  leg(c, -12, -29, sw(Math.PI), 13, 15, 3.2, sandy, 1, hoof); leg(c, 8, -29, sw(0), 13, 15, 3, sandy, 0, hoof);
}
function aGhaf(c) { // the ghaf, the UAE's desert tree
  ink(c); c.fillStyle = '#7a5433'; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(-2, -20, -12, -38); c.lineTo(-4, -40); c.quadraticCurveTo(2, -30, 3, -22); c.quadraticCurveTo(8, -32, 16, -38); c.lineTo(20, -33); c.quadraticCurveTo(8, -20, 7, 0); c.closePath(); fs(c);
  c.fillStyle = '#5f9a55'; c.beginPath(); c.moveTo(-44, -40); c.quadraticCurveTo(-48, -62, -22, -64); c.quadraticCurveTo(-8, -78, 12, -66); c.quadraticCurveTo(40, -68, 44, -46); c.quadraticCurveTo(46, -34, 26, -36); c.quadraticCurveTo(4, -28, -16, -36); c.quadraticCurveTo(-40, -30, -44, -40); c.closePath(); fs(c);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-8, -58, 20, 6, -0.1, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,40,0,.16)'; c.beginPath(); c.ellipse(8, -40, 26, 5, 0, 0, TAU); c.fill();
}
function aPerch(c) { // a hunting falcon on its block (wakir), wearing the leather hood falconers use
  ink(c); c.fillStyle = '#7a5433'; c.beginPath(); c.roundRect(-2.5, -36, 5, 36, 2); fs(c); c.fillStyle = '#1f7a74'; c.beginPath(); c.roundRect(-13, -44, 26, 9, 4.5); fs(c);
  c.strokeStyle = '#e0a72a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -44); c.lineTo(-4, -48); c.moveTo(3, -44); c.lineTo(4, -48); c.stroke();                       // yellow feet
  ink(c); c.fillStyle = '#4a3324'; c.beginPath(); c.moveTo(-7, -48); c.lineTo(-10, -30); c.lineTo(-3, -44); c.closePath(); fs(c);                                        // tail and wing tips
  const body = () => { c.beginPath(); c.moveTo(-8, -50); c.quadraticCurveTo(-12, -70, -3, -80); c.quadraticCurveTo(7, -82, 9, -70); c.quadraticCurveTo(10, -56, 4, -47); c.quadraticCurveTo(-2, -44, -8, -50); c.closePath(); };
  body(); c.fillStyle = '#f1e2c4'; c.fill(); c.save(); c.clip();
  c.fillStyle = '#6b4a30'; c.beginPath(); c.ellipse(-9, -62, 8, 20, 0.12, 0, TAU); c.fill();                                                                             // folded wing, brown back
  c.fillStyle = '#5a3d25'; for (const [x, y] of [[2, -70], [5, -65], [1, -62], [5, -58], [2, -54], [6, -52], [0, -50]]) { c.beginPath(); c.ellipse(x, y, 1, 1.9, 0.2, 0, TAU); c.fill(); } c.restore();
  body(); ink(c); c.stroke();
  c.fillStyle = '#8a5a34'; c.beginPath(); c.arc(1, -83, 7, 0, TAU); fs(c); c.fillStyle = SHEMAGH; c.beginPath(); c.arc(1, -84, 7, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); fs(c);   // the hood
  c.strokeStyle = '#e0a72a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-1, -90); c.lineTo(-1, -95); c.moveTo(1, -90); c.lineTo(2, -96); c.moveTo(3, -90); c.lineTo(5, -94); c.stroke();
  ink(c, 1.3); c.fillStyle = '#e0a72a'; c.beginPath(); c.moveTo(7, -85); c.lineTo(10, -84.5); c.lineTo(10, -82); c.lineTo(7, -81); c.closePath(); fs(c);                     // yellow cere
  c.fillStyle = '#3a3531'; c.beginPath(); c.moveTo(10, -84.5); c.quadraticCurveTo(14, -83, 11.5, -78.5); c.lineTo(10, -82); c.closePath(); fs(c);                           // hooked beak
}
function aWell(c) {
  ink(c); c.strokeStyle = '#6b4a2b'; c.lineWidth = 4; c.beginPath(); c.moveTo(-22, -10); c.lineTo(-22, -56); c.moveTo(22, -10); c.lineTo(22, -56); c.stroke();
  ink(c); c.fillStyle = '#8a5a34'; c.beginPath(); c.roundRect(-28, -60, 56, 7, 3); fs(c); c.beginPath(); c.moveTo(0, -53); c.lineTo(0, -34); c.stroke();
  c.fillStyle = '#7a5433'; c.beginPath(); c.moveTo(-6, -34); c.lineTo(6, -34); c.lineTo(5, -24); c.lineTo(-5, -24); c.closePath(); fs(c);
  c.fillStyle = '#c9b08a'; c.beginPath(); c.moveTo(-28, -4); c.lineTo(-28, -18); c.quadraticCurveTo(0, -28, 28, -18); c.lineTo(28, -4); c.quadraticCurveTo(0, 8, -28, -4); c.closePath(); fs(c);
  c.strokeStyle = 'rgba(43,26,18,.4)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-28, -11); c.quadraticCurveTo(0, -1, 28, -11); for (let x = -18; x <= 18; x += 12) { c.moveTo(x, -8); c.lineTo(x, 1); } c.stroke();
  ink(c); c.fillStyle = '#2f5f73'; c.beginPath(); c.ellipse(0, -18, 28, 7, 0, 0, TAU); fs(c);
}
function aStall(c) { // the date festival stall
  ink(c); c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(-58, 0); c.lineTo(-58, -64); c.moveTo(58, 0); c.lineTo(58, -64); c.stroke(); ink(c);
  c.fillStyle = '#8a5a34'; c.beginPath(); c.roundRect(-62, -26, 124, 26, 3); fs(c); c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(-62, -10, 124, 10);
  for (const x of [-38, 0, 38]) { c.fillStyle = '#6b3d1c'; c.beginPath(); c.arc(x, -30, 15, Math.PI, 0); c.closePath(); fs(c); c.fillStyle = '#d9b57f'; c.beginPath(); c.moveTo(x - 17, -30); c.lineTo(x + 17, -30); c.lineTo(x + 13, -20); c.lineTo(x - 13, -20); c.closePath(); fs(c);
    c.fillStyle = '#a05a24'; for (const [dx, dy] of [[-6, -35], [1, -39], [7, -34]]) { c.beginPath(); c.ellipse(x + dx, dy, 3.4, 2.2, 0.4, 0, TAU); c.fill(); } }
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fffaf0' : '#1f7a74'; c.beginPath(); c.moveTo(-68 + i * 17, -66); c.lineTo(-51 + i * 17, -66); c.lineTo(-51 + i * 17, -52); c.quadraticCurveTo(-59.5 + i * 17, -44, -68 + i * 17, -52); c.closePath(); fs(c); }
  c.fillStyle = SHEMAGH; c.beginPath(); c.roundRect(-70, -72, 140, 8, 3); fs(c);
}
function aGate(c) {
  ink(c); c.fillStyle = '#8a5a34'; for (const x of [-74, 66]) { c.beginPath(); c.roundRect(x, -92, 8, 92, 3); fs(c); }
  c.fillStyle = '#f3dfb8'; c.beginPath(); c.roundRect(-82, -112, 164, 30, 6); fs(c); c.strokeStyle = SHEMAGH; c.lineWidth = 2; c.beginPath(); c.roundRect(-78, -108, 156, 22, 4); c.stroke();
  c.fillStyle = INK; c.font = '800 15px "Baloo Bhaijaan 2", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T('gateSign'), 0, -96.5);
}
function aSummit(c) {
  ink(c); c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -74); c.stroke(); ink(c);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) { c.fillStyle = (i + j) % 2 ? '#fffaf0' : SHEMAGH; c.fillRect(2 + i * 9, -74 + j * 8, 9, 8); } c.strokeRect(2, -74, 36, 24);
  c.fillStyle = '#e0a72a'; c.beginPath(); c.arc(0, -76, 3, 0, TAU); fs(c);
}
function aSign(c) { ink(c); c.fillStyle = '#8a5a34'; c.beginPath(); c.roundRect(-2.5, -34, 5, 34, 2); fs(c); c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(-18, -44); c.lineTo(14, -44); c.lineTo(22, -37); c.lineTo(14, -30); c.lineTo(-18, -30); c.closePath(); fs(c);
  c.strokeStyle = '#1f7a74'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -37); c.lineTo(10, -37); c.stroke(); }
function aTrough(c) { ink(c); c.fillStyle = '#8a5a34'; c.beginPath(); c.moveTo(-30, -16); c.lineTo(30, -16); c.lineTo(24, 0); c.lineTo(-24, 0); c.closePath(); fs(c); c.fillStyle = '#4f8fa8'; c.beginPath(); c.ellipse(0, -16, 29, 4, 0, 0, TAU); fs(c); }
function aBasket(c) { ink(c); c.fillStyle = '#6b3d1c'; c.beginPath(); c.arc(0, -12, 12, Math.PI, 0); c.closePath(); fs(c); c.fillStyle = '#d9b57f'; c.beginPath(); c.moveTo(-14, -12); c.lineTo(14, -12); c.lineTo(10, 0); c.lineTo(-10, 0); c.closePath(); fs(c);
  c.strokeStyle = 'rgba(43,26,18,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-12, -6); c.lineTo(12, -6); c.stroke(); }
function aShrub(c) { ink(c, 1.3); c.fillStyle = '#8a9a52'; for (const [x, w, h] of [[-8, 7, 12], [0, 8, 17], [8, 7, 11]]) { c.beginPath(); c.moveTo(x - w, 0); c.quadraticCurveTo(x - w * 0.6, -h, x, -h - 2); c.quadraticCurveTo(x + w * 0.6, -h, x + w, 0); c.closePath(); fs(c); } }
function aPost(c) { ink(c, 1.3); c.fillStyle = '#8a5a34'; c.beginPath(); c.roundRect(-2, -30, 4, 30, 1.5); fs(c); c.fillStyle = SHEMAGH; c.beginPath(); c.moveTo(2, -30); c.lineTo(17, -25); c.lineTo(2, -20); c.closePath(); fs(c); }
function aFlag(c) { ink(c); c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -92); c.stroke(); uaeFlag(c, 0, -92, 36, 19); }
function aDate(c) { ink(c, 1.4); c.fillStyle = '#8a4b25'; c.beginPath(); c.ellipse(0, 0, 5.2, 8, 0.25, 0, TAU); fs(c); c.fillStyle = 'rgba(255,220,160,.55)'; c.beginPath(); c.ellipse(-1.6, -2.5, 1.4, 3.2, 0.25, 0, TAU); c.fill(); c.fillStyle = '#e0a72a'; c.beginPath(); c.ellipse(-1.4, -7.4, 2.2, 1.5, 0.25, 0, TAU); fs(c); }
function aCan(c) { ink(c); c.fillStyle = SHEMAGH; c.beginPath(); c.roundRect(-9, -22, 18, 22, 3); fs(c); c.fillStyle = '#8e141d'; c.fillRect(-8, -6, 16, 5); c.beginPath(); c.roundRect(-6, -27, 8, 6, 2); c.fillStyle = '#2a2623'; fs(c);
  c.strokeStyle = '#fffaf0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-5, -18); c.lineTo(5, -8); c.moveTo(5, -18); c.lineTo(-5, -8); c.stroke(); }
// kind -> [drawing, bake box x0,y0,w,h, collision radius]
const KIND = {
  palm: [aPalm, [-44, -124, 98, 128], 9], tent: [aTent, [-104, -64, 208, 68], 60], fire: [aFire, [-18, -30, 60, 36], 14], fort: [aFort, [-100, -136, 196, 140], 84],
  ghaf: [aGhaf, [-52, -82, 104, 86], 10], perch: [aPerch, [-18, -100, 38, 104], 9], well: [aWell, [-34, -64, 68, 76], 28], stall: [aStall, [-74, -76, 148, 80], 58],
  gate: [aGate, [-86, -116, 172, 120], 0], summit: [aSummit, [-6, -82, 50, 86], 5], sign: [aSign, [-22, -48, 48, 52], 5], trough: [aTrough, [-34, -24, 68, 28], 26],
  basket: [aBasket, [-18, -28, 36, 32], 12], shrub: [aShrub, [-18, -24, 36, 28], 0], post: [aPost, [-6, -34, 28, 38], 0], flag: [aFlag, [-6, -96, 48, 100], 4],
  baba: [c => person(c, 0, 0, 0.6, BABA), [-58, -102, 96, 108], 13], date: [aDate, [-9, -12, 18, 24], 0], can: [aCan, [-12, -30, 24, 34], 0],
  camel: [aCamel, [-42, -122, 112, 128], 26], oryx: [aOryx, [-36, -138, 86, 144], 20], gazelle: [aGazelle, [-26, -86, 58, 90], 11],
};
const SPR = new Map(), BR = 2;
function spr(kind, q) {
  const key = q === undefined ? kind : kind + q; let e = SPR.get(key); if (e) return e;
  const [fn, b] = KIND[kind], cv = mk(b[2] * BR, b[3] * BR), g = cv.getContext('2d');
  g.scale(BR, BR); g.translate(-b[0], -b[1]); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g, q);
  e = { c: cv, x: b[0], y: b[1], w: b[2], h: b[3] }; SPR.set(key, e); return e;
}
function blit(c, e, x, y, flip) {
  if (flip) { c.save(); c.translate(x, y); c.scale(-1, 1); c.drawImage(e.c, e.x, e.y, e.w, e.h); c.restore(); }
  else c.drawImage(e.c, x + e.x, y + e.y, e.w, e.h);
}

// ---------- things placed on the map ----------
function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let v = Math.imul(seed ^ seed >>> 15, 1 | seed); v = v + Math.imul(v ^ v >>> 7, 61 | v) ^ v; return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const PROPS = [], DATES = [], CANS = [], ANIMALS = [];
(function place() {
  const P = (kind, x, y, flip) => PROPS.push({ kind, x, y, flip: !!flip, rad: KIND[kind][2] });
  let q = site('camp'); P('tent', q.x, q.y - 70); P('fire', q.x - 105, q.y + 34); P('baba', q.x - 60, q.y - 4); P('palm', q.x + 138, q.y - 58); P('flag', q.x + 92, q.y - 96);
  q = site('moreeb'); P('summit', q.x, q.y);
  q = site('oasis'); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + 0.3; P('palm', q.x + Math.cos(a) * (150 + (k % 3) * 22), q.y + 20 + Math.sin(a) * (92 + (k % 2) * 18), k % 2); }
  q = site('fort'); P('fort', q.x, q.y - 20); P('palm', q.x - 150, q.y + 34); P('palm', q.x + 152, q.y + 12, 1);
  q = site('camels'); P('trough', q.x, q.y); q = site('oryx'); P('ghaf', q.x, q.y - 30);
  q = site('falcon'); P('perch', q.x, q.y); q = site('well'); P('well', q.x, q.y); P('palm', q.x + 82, q.y - 40);
  q = site('sabkha'); P('sign', q.x, q.y);
  q = site('festival'); P('stall', q.x, q.y - 30); P('palm', q.x - 122, q.y - 8); P('palm', q.x + 126, q.y, 1); P('basket', q.x + 44, q.y + 44); P('basket', q.x - 34, q.y + 54);
  q = site('gate'); P('gate', q.x, q.y); PROPS.push({ kind: 'post', x: q.x - 70, y: q.y, rad: 7, hide: 1 }, { kind: 'post', x: q.x + 70, y: q.y, rad: 7, hide: 1 });
  for (let k = 0; k < 170; k++) { const a = k / 170 * TAU; P('post', Math.cos(a) * (R + 12), Math.sin(a) * (R + 12)); } // the ring of flags round the reserve
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { // scattered desert shrubs
    if (hash2(i, j + 99) > 0.3) continue; const x = (i + hash2(i + 7, j)) * 280, y = (j + hash2(i, j - 7)) * 280;
    if (Math.hypot(x, y) < R - 80 && SITES.every(s => Math.hypot(s.x - x, s.y - y) > s.r + 30)) P('shrub', x, y, hash2(i, j) > 0.5);
  }
  const r = rng(20261110);
  for (let i = 0; i < 6; i++) DATES.push({ x: 170 + i * 50, y: 120 - i * 14 }); // a first trail leading out of the camp
  for (let k = 0; k < 48; k++) { // lines of dates curving across the dunes
    const a = r() * TAU, d = 300 + Math.sqrt(r()) * (R - 560), bend = (r() - 0.5) * 0.3, n = 5 + (r() * 3 | 0); let x = Math.cos(a) * d, y = Math.sin(a) * d, an = r() * TAU;
    for (let i = 0; i < n; i++) { if (Math.hypot(x, y) < R - 120) DATES.push({ x, y }); an += bend; x += Math.cos(an) * 48; y += Math.sin(an) * 48; }
  }
  CANS.push({ x: 540, y: -280 });
  for (let tries = 0; CANS.length < 16 && tries < 4000; tries++) { const a = r() * TAU, d = 500 + Math.sqrt(r()) * (R - 760), x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (CANS.every(o => Math.hypot(o.x - x, o.y - y) > 640) && SITES.every(s => Math.hypot(s.x - x, s.y - y) > 150)) CANS.push({ x, y }); }
  const herd = (kind, id, n, spread) => { const s = typeof id === 'string' ? site(id) : id; for (let k = 0; k < n; k++) { const a = k / n * TAU + 0.6, x = s.x + Math.cos(a) * spread, y = s.y + Math.sin(a) * spread * 0.7;
    ANIMALS.push({ kind, x, y, hx: s.x, hy: s.y, tx: x, ty: y, ph: k, dir: k % 2 ? 1 : -1, wait: 1 + k, run: 0, rx: 0, ry: 0, rad: KIND[kind][2] }); } };
  herd('camel', 'camels', 5, 130); herd('oryx', 'oryx', 4, 110);
  herd('gazelle', { x: 1750, y: -330 }, 5, 90); herd('gazelle', { x: -1480, y: -1480 }, 4, 80); herd('gazelle', { x: -200, y: 950 }, 3, 70); herd('camel', { x: 1250, y: 380 }, 2, 60); // loose herds out on the sand
})();

// ---------- state ----------
let st = 'load', t = 0, W = 0, Hh = 0, zoom = 1, dpr = 1, rs = 1, camx = 0, camy = 0, shake = 0, noteT = 0, slow = 0, hudKey = '', miniTick = 0, edgeT = 0, hitT = 0;
const car = {}, run = { dist: 0, dates: 0, air: 0, rolls: 0, cards: [], fuel: 100, max: 100, over: 0, low: false, seen: {}, vis: [], live: false };
const PH = { acc: 350, grip: 3.4, rr: 26, tip: 0.4, pick: 1700 }; // what the upgrades change, set at the start of a run
const parts = [], floats = [], tracks = [[], []], keys = {}, joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
const ACC = 350, BRAKE = 520, DRAG = 0.75, RR = 26, GR = 700, GRIP = 3.4, // base values; see PH
   TURN = 2.7, GRAV = 520, BURN = 100 / 110, JOY_R = 56, TIP = 0.4;
function resetCar() {
  Object.assign(car, { x: 70, y: 120, ang: -0.28, vx: 0, vy: 0, z: H(70, 120), vz: 0, gvz: 0, air: false, airT: 0, steer: 0, thr: 0, tip: 0, roll: 0, rollT: 0, rdx: 0, rdy: 0, safe: 0, sf: 0, trk: 0, pit: 0, rol: 0, spin: 0, rside: 1,
    drift: false, dsc: 0, dyaw: 0, tside: 1, twoT: 0, lean: 0, fp: 0, fy: 0, a0: 0 });
  tracks[0].length = tracks[1].length = 0; parts.length = floats.length = 0;
}
const cv = $('cv'), ctx = cv.getContext('2d', { alpha: false });
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2) * rs; // phones start at a lower render resolution
  const w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
  if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; }
  W = w; Hh = h; zoom = Math.sqrt(W * Hh / (800 * 470)); // every screen shape sees about the same amount of desert
}
function note(text, cls, secs = 2.4) { const n = $('note'); n.textContent = text; n.className = cls || ''; n.hidden = false; noteT = secs; }
function float(x, y, txt, col) { floats.push({ x, y, txt, col: col || '#fffaf0', life: 1.3 }); if (floats.length > 12) floats.shift(); }
function puff(x, y, vx, vy, n, big) { for (let i = 0; i < n && parts.length < 110; i++) parts.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: vx + (Math.random() - 0.5) * 70, vy: vy + (Math.random() - 0.5) * 70, life: 0.5 + Math.random() * 0.4, r: (big ? 7 : 4) + Math.random() * 4 }); }

// ---------- missions, levels, races ----------
// What keeps a run worth starting: three missions at a time (a new one replaces each finished one, harder as the
// level rises), levels from experience, and timed races between places with bronze, silver and gold times.
const UPS = ['engine', 'tyres', 'balance', 'tank', 'magnet'], UP_COST = [100, 250, 500, 900, 1500];
const xpNeed = l => 80 + l * 45, RANKS = [1, 3, 6, 10, 15];
const rankOf = l => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (l >= RANKS[i]) r = i; return r; };
const dayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
const fmtTime = s => Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60).toFixed(1);
function addXP(n) {
  save.xp += Math.round(n);
  while (save.xp >= xpNeed(save.lvl)) { save.xp -= xpNeed(save.lvl); save.lvl++; const c = 20 * save.lvl; save.coins += c; run.lvlUp = save.lvl; note(T('lvlUp', save.lvl, c), 'card', 3.2); play('zone', 1.2); }
}
function newMission() {
  const L = save.lvl, have = save.missions.map(m => m.t), r1 = x => Math.round(x * 10) / 10;
  const t = pick(['dates', 'dist', 'air', 'jump', 'visit', 'noroll', 'cans', 'deliver', 'summit', 'tdates', 'tdist', 'drift', 'two', 'flip', 'spin', 'stunt'].filter(k => !have.includes(k))), m = { t, n: 1, p: 0 }; let w = 1;
  if (t === 'dates') m.n = Math.min(90, 15 + L * 5);
  else if (t === 'dist') m.n = Math.min(4500, 600 + L * 200);
  else if (t === 'air') { m.n = Math.min(12, r1(2 + L * 0.5)); w = 1.2; }
  else if (t === 'jump') { m.n = Math.min(1.6, r1(0.6 + L * 0.05)); w = 1.2; }
  else if (t === 'visit') { m.n = Math.min(8, 2 + (L >> 1)); w = 1.2; }
  else if (t === 'noroll') m.n = Math.min(3000, 500 + L * 150);
  else if (t === 'cans') m.n = Math.min(6, 1 + (L / 3 | 0));
  else if (t === 'deliver') { const ids = SITES.map(s => s.id).filter(id => id !== 'moreeb'); m.a = pick(ids); m.b = pick(ids.filter(id => id !== m.a)); m.n = 2; w = 1.5; }
  else if (t === 'summit') w = 1.5;
  else if (t === 'drift') { m.n = Math.min(3000, 200 + L * 80); w = 1.2; }
  else if (t === 'two') { m.n = Math.min(10, r1(1.5 + L * 0.4)); w = 1.4; }
  else if (t === 'flip') { m.n = Math.min(4, 1 + (L / 5 | 0)); w = 1.5; }
  else if (t === 'spin') { m.n = Math.min(5, 1 + (L / 4 | 0)); w = 1.3; }
  else if (t === 'stunt') { m.n = Math.min(6000, 400 + L * 150); w = 1.2; }
  else if (t === 'tdates') { m.n = 80 + L * 30; w = 1.4; }
  else { m.n = 3000 + L * 600; w = 1.4; }
  m.rw = Math.round((25 + L * 5) * w / 5) * 5; m.xp = Math.round(40 * w); return m;
}
function fillMissions() { save.missions = save.missions.filter(m => !m.done); while (save.missions.length < 3) save.missions.push(newMission()); }
function mProg(m) { // how far a mission has got, counting the run in progress
  const on = run.live;
  switch (m.t) {
    case 'dates': return on ? run.dates : 0;
    case 'dist': return on ? run.dist / 8 : 0;
    case 'air': return on ? run.air : 0;
    case 'jump': return on ? run.maxAir : 0;
    case 'visit': return on ? Object.keys(run.seen).length : 0;
    case 'noroll': return on ? run.noRoll / 8 : 0;
    case 'cans': return on ? run.cans : 0;
    case 'drift': return on ? run.drift + car.dsc : 0;
    case 'two': return on ? run.two : 0;
    case 'flip': return on ? run.flips : 0;
    case 'spin': return on ? run.spins : 0;
    case 'stunt': return on ? run.stunt : 0;
    case 'deliver': { if (!on) return 0; const i = run.vis.indexOf(m.a); return i < 0 ? 0 : run.vis.indexOf(m.b, i + 1) >= 0 ? 2 : 1; }
    case 'summit': return on && run.seen.moreeb ? 1 : 0;
    case 'tdates': return m.p + (on ? run.dates : 0);
    default: return m.p + (on ? run.dist / 8 : 0);
  }
}
const mText = m => m.t === 'deliver' ? T('m_deliver', T('s_' + m.a), T('s_' + m.b)) : T('m_' + m.t, m.n);
const mVal = (m, v) => m.t === 'air' || m.t === 'jump' || m.t === 'two' ? v.toFixed(1) : nf(Math.floor(v));
function checkMissions() {
  for (const m of save.missions) if (!m.done && mProg(m) >= m.n) {
    m.done = 1; save.coins += m.rw; run.mdone++; run.mcoins += m.rw; addXP(m.xp); persist(); coinsUI(); play('zone'); note(T('mDone', mText(m), m.rw), 'card', 3.4);
  }
}
// races: drive through the places in order against the clock. The daily race changes every day.
const RACES = [
  { id: 'camp', lvl: 1, pts: ['camp', 'well', 'festival', 'camp'] }, { id: 'oasis', lvl: 2, pts: ['camp', 'festival', 'oasis', 'falcon'] },
  { id: 'moreeb', lvl: 4, pts: ['well', 'moreeb', 'fort'] }, { id: 'south', lvl: 5, pts: ['fort', 'oryx', 'gate', 'camels'] },
  { id: 'grand', lvl: 7, pts: ['camp', 'moreeb', 'fort', 'oryx', 'gate', 'camels', 'falcon', 'oasis', 'sabkha', 'camp'] },
];
function dailyRace() {
  const d = dayKey(); let h = 7; for (const ch of d) h = Math.imul(h, 31) + ch.charCodeAt(0) | 0;
  const r = rng(h), ids = SITES.map(s => s.id); for (let i = ids.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return { id: 'daily', key: 'daily:' + d, lvl: 1, pts: ids.slice(0, 4) };
}
const raceKey = rc => rc.key || rc.id, reach = s => s.hill ? 130 : s.r + 50;
function raceLen(rc) { let L = 0; for (let i = 1; i < rc.pts.length; i++) { const a = site(rc.pts[i - 1]), b = site(rc.pts[i]); L += Math.hypot(a.x - b.x, a.y - b.y); } return L; }
const raceTargets = rc => { const L = raceLen(rc), k = 3 + rc.pts.length; return [L / 125 + k, L / 165 + k, L / 205 + k]; }; // bronze, silver, gold, in seconds: a pace, plus time to get going and to turn at each place
const GH_KEY = 'abood-liwa-ghost'; let ghosts = {};
try { ghosts = JSON.parse(localStorage.getItem(GH_KEY) || '{}') || {}; } catch (e) {}
function finishRace() {
  const rc = run.race, key = raceKey(rc), tg = raceTargets(rc), tm = run.rt, medal = tm <= tg[2] ? 3 : tm <= tg[1] ? 2 : tm <= tg[0] ? 1 : 0, had = save.medals[key] || 0, k = Math.max(1, Math.round(raceLen(rc) / 4000));
  let gain = 0; for (let i = had + 1; i <= medal; i++) gain += [0, 30, 60, 120][i] * k;
  if (medal > had) save.medals[key] = medal;
  const best = save.times[key], isBest = !best || tm < best;
  if (isBest) { save.times[key] = tm; ghosts[key] = run.rec; try { localStorage.setItem(GH_KEY, JSON.stringify(ghosts)); } catch (e) {} } // your best run becomes the ghost to beat
  save.coins += gain; run.done = { tm, medal, gain, best: isBest ? tm : best, isBest }; addXP(40 + medal * 20); endRun(false);
}

// ---------- driving ----------
// ---------- stunts ----------
// Drift: the back steps out and the car slides sideways under power. Two wheels: lean far enough on a slope or in a
// fast turn and one side lifts; hold it there without going over. In the air: spins and flips, landed on the wheels.
function stunt(pts, label) { pts = Math.round(pts); if (pts <= 0) return; run.stunt += pts; float(car.x, car.y - 125, label + ' +' + pts, '#ffe07a'); play('date', 0.75, 1.2); }
function endDrift() { if (!car.drift) return; car.drift = false; if (car.dsc > 20) { run.drift += car.dsc; stunt(car.dsc, T('st_drift')); } car.dsc = 0; }
function endTwo() { if (car.twoT > 0.4) stunt(car.twoT * 70, T('st_two', car.twoT.toFixed(1))); car.twoT = 0; }
function startRoll(dx, dy) { // the car goes over and tumbles in the direction (dx, dy)
  endDrift(); car.twoT = 0;
  const m = Math.hypot(dx, dy) || 1; car.roll = 1; car.rollT = 0; car.rdx = dx / m; car.rdy = dy / m; car.rside = car.rdy * Math.cos(car.ang) - car.rdx * Math.sin(car.ang) < 0 ? -1 : 1; car.air = false; car.tip = 0; car.fp = car.fy = 0;
  run.rolls++; run.nr = 0; if (!run.race) run.fuel -= 4; shake = 12; buzz(120); play('smash'); puff(car.x, car.y, 0, 0, 14, true);
  float(car.x, car.y - 40, T('rolled'), '#ffd9d0'); note(pick(T('baba')), 'baba', 2.6);
}
function update(dt) {
  if (run.cd > 0) { // race countdown: 3, 2, 1, go
    run.cd -= dt; const n = Math.ceil(run.cd);
    if (n !== run.cdn) { run.cdn = n; if (n > 0) { note(String(n), 'big', 0.95); play('tek', 0.8, 2); } else { note(T('go'), 'big', 0.9); play('zone', 1.3); } }
    camx = car.x; camy = car.y; engine(0, 0.3); return;
  }
  let thr = 0, steer = 0, hb = false, spinIn = 0, flipIn = 0; // hb: handbrake, which starts a drift
  if (joy.id >= 0) { // touch: drag the way you want to go. A sharp change of direction at speed is a drift.
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy);
    if (m > 8) { const d = wrap(Math.atan2(dy, dx) - car.ang); steer = clamp(d * 2.4, -1, 1); thr = clamp(m / JOY_R, 0.25, 1) * (Math.abs(d) > 2 ? 0.55 : 1); hb = Math.abs(d) > 0.9 && Math.abs(d) < 2.5;
      // in the air the drag is read against the take-off direction: sideways spins the car, backwards flips it
      const k = Math.min(1, m / JOY_R) / m, c0 = Math.cos(car.a0), s0 = Math.sin(car.a0), al = (dx * c0 + dy * s0) * k, ac = (dy * c0 - dx * s0) * k; if (Math.abs(ac) > 0.5) spinIn = Math.sign(ac); if (al < -0.5) flipIn = -1; }
  } else { thr = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0); steer = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    hb = !!(keys.Space || keys.ShiftLeft || keys.ShiftRight); if (hb) { spinIn = steer; flipIn = steer ? 0 : thr < 0 ? -1 : 0; } if (keys.KeyF) flipIn = 1; } // keyboard: hold Space for a drift; in the air Space with left or right spins, Space with down is a backflip, F a front flip
  if (run.fuel <= 0) thr = 0;
  car.steer += (steer - car.steer) * Math.min(1, dt * 9); car.thr = thr; car.safe -= dt;
  car.x += car.vx * dt; car.y += car.vy * dt;
  const e = 3, h0 = H(car.x, car.y), gx = (H(car.x + e, car.y) - H(car.x - e, car.y)) / (2 * e), gy = (H(car.x, car.y + e) - H(car.x, car.y - e)) / (2 * e);
  let sp = Math.hypot(car.vx, car.vy); run.dist += sp * dt; run.nr += sp * dt; if (run.nr > run.noRoll) run.noRoll = run.nr;
  if (car.roll) { // tumbling down the slope: no control until the buggy lands back on its wheels
    car.rollT += dt; const k = car.rollT / 1.15, f = Math.min(1, dt * 5), v = 200 * (1 - k * 0.8);
    car.vx += (car.rdx * v - car.vx) * f; car.vy += (car.rdy * v - car.vy) * f; car.z = h0;
    if (Math.random() < dt * 30) puff(car.x, car.y, 0, 0, 1, true);
    if (k >= 1) { car.roll = 0; car.safe = 1.6; car.vx *= 0.4; car.vy *= 0.4; car.gvz = 0; }
  } else if (car.air) {
    car.vz -= GRAV * dt; car.z += car.vz * dt; car.airT += dt;
    // A trick is one full turn, paced to finish before the wheels touch down, so a flip or spin started on a big enough jump lands clean.
    const left = (car.vz + Math.sqrt(Math.max(0, car.vz * car.vz + 2 * GRAV * Math.max(0, car.z - h0)))) / GRAV; // seconds until landing, on level ground
    if (!car.trick && (flipIn || spinIn) && left > 0.42) car.trick = { flip: flipIn, spin: flipIn ? 0 : spinIn, rate: Math.min(17, TAU / Math.max(0.36, left * 0.78)), left: TAU };
    if (car.trick) { const tk = car.trick, d = Math.min(tk.left, tk.rate * dt); tk.left -= d; car.fp += tk.flip * d; car.fy += tk.spin * d; car.ang += tk.spin * d; if (tk.left <= 0) car.trick = null; } // fp: how far the car has flipped, nose down positive
    else car.ang += car.steer * 0.9 * dt;
    if (car.vz < 0 && (car.z - h0) / Math.max(60, -car.vz) < 0.22) { const e = wrap(car.fp); if (Math.abs(e) < 1.1) car.fp -= e * Math.min(1, dt * 14); } // close to the ground: ease the wheels level
    if (car.z <= h0) { // landing
      const cs = Math.cos(car.ang), sn = Math.sin(car.ang), l = -car.vx * sn + car.vy * cs, sl = -gx * sn + gy * cs, gm = Math.hypot(gx, gy), upside = Math.abs(wrap(car.fp)) > 0.8;
      const flips = Math.round(car.fp / TAU), spins = Math.round(car.fy / Math.PI);
      car.air = false; car.z = h0; car.gvz = gx * car.vx + gy * car.vy; car.fp = car.fy = 0; car.trick = null;
      if (car.airT > 0.32 || upside) {
        shake = Math.min(9, 3 + car.airT * 5); play('hit', 0.8, 0.6); puff(car.x, car.y, car.vx * 0.2, car.vy * 0.2, 8, true); buzz(30);
        if (upside || (car.safe <= 0 && ((Math.abs(l) > 0.5 * sp && sp > 150) || Math.abs(sl) > PH.tip + 0.04))) { if (gm > 0.08) startRoll(-gx, -gy); else startRoll(-sn * (l || 1), cs * (l || 1)); }
        else { // a clean landing banks the jump and any tricks done in it
          run.air += car.airT; if (car.airT > run.maxAir) run.maxAir = car.airT;
          let pts = car.airT * 40, label = T('jump', car.airT.toFixed(1));
          if (spins) { const deg = Math.abs(spins) * 180; pts += Math.abs(spins) * 70; label = deg + '!'; run.spins += Math.abs(spins) >> 1; }
          if (flips) { pts += Math.abs(flips) * 160; label = T(flips < 0 ? 'st_back' : 'st_front', Math.abs(flips)) + (spins ? ' ' + Math.abs(spins) * 180 : ''); run.flips += Math.abs(flips); }
          stunt(pts, label); if (flips || Math.abs(spins) > 1 || car.airT > 0.9) note(pick(T('wow')), '', 1.4);
        }
      }
    }
  } else {
    let cs = Math.cos(car.ang), sn = Math.sin(car.ang);
    const want = hb && sp > 150 && Math.abs(car.steer) > 0.3; if (want && !car.drift) { car.drift = true; car.dsc = 0; car.dyaw = 0; play('whoosh', 0.7, 0.5); }
    const yr = car.steer * TURN * clamp((car.vx * cs + car.vy * sn) / 150, -1, 1) * (car.drift ? 1.5 : 1); // how fast the car is turning
    car.ang += yr * dt; cs = Math.cos(car.ang); sn = Math.sin(car.ang);
    let f = car.vx * cs + car.vy * sn, l = -car.vx * sn + car.vy * cs; const sf = gx * cs + gy * sn, sl = -gx * sn + gy * cs; car.sf = sf;
    const push = thr > 0 ? thr * PH.acc : thr < 0 ? (f > 20 ? -BRAKE : thr * PH.acc * 0.5) : 0;
    f += (push - GR * sf - DRAG * f) * dt; f -= clamp(f, -PH.rr * dt, PH.rr * dt);   // engine, gravity along the slope, drag, soft-sand resistance
    l += -GR * sl * dt; l *= Math.exp(-(car.drift ? 0.85 : PH.grip) * dt);                              // the slope pulls sideways; the tyres only half hold in sand
    car.vx = cs * f - sn * l; car.vy = sn * f + cs * l; sp = Math.hypot(car.vx, car.vy);
    const gvz = gx * car.vx + gy * car.vy;
    if ((car.gvz - gvz) / dt > GRAV * 0.75 && sp > 120) { car.air = true; car.vz = car.gvz; car.airT = 0; car.z = h0; play('whoosh', 1, 0.7); } // the ground drops away faster than gravity: take off
    else car.z = h0;
    car.gvz = gvz;
    if (car.air) { endDrift(); endTwo(); car.a0 = car.ang; car.trick = null; car.fp = car.fy = 0; if (car.vz > 0) car.vz *= 1.15; }
    if (car.drift) { // points for how sideways and how fast; a full circle is a donut
      car.dsc += Math.atan2(Math.abs(l), Math.abs(f) + 1) * sp * dt * 0.3; car.dyaw += yr * dt;
      if (Math.abs(car.dyaw) > TAU) { car.dyaw -= Math.sign(car.dyaw) * TAU; car.dsc += 120; float(car.x, car.y - 150, T('st_donut'), '#ffe07a'); }
      if (!want && Math.abs(l) < 30) endDrift();
    }
    // what tips the car: the slope across it, and the pull of a fast turn (much less while it is sliding)
    const q = sl + f * yr / GR * (car.drift ? 0.15 : 0.62), ex = Math.abs(q) - PH.tip;
    if (car.safe <= 0 && ex > 0 && sp > 60 && !car.air) { car.tip += ex * 3.2 * dt * (0.6 + sp / 400) * (1 - 0.5 * car.tip); // slower near the top, so there is a moment to catch it
      car.tside = q > 0 ? 1 : -1; if (car.tip >= 1) startRoll(sn * car.tside, -cs * car.tside); }
    else car.tip = Math.max(0, car.tip - dt * 1.3);
    if (car.tip > 0.3 && !car.roll && !car.air) { car.twoT += dt; run.two += dt; } else if (car.twoT > 0) endTwo(); // on two wheels
    if (!car.roll && !car.air) {
      if ((thr > 0.3 && sp > 50) || Math.abs(l) > 55) { if (Math.random() < dt * (14 + sp * 0.06) * (car.drift ? 4 : 1)) puff(car.x - cs * 38 + (Math.random() - 0.5) * 50 * sn, car.y - sn * 38 - (Math.random() - 0.5) * 50 * cs, -car.vx * 0.25, -car.vy * 0.25, 1, car.drift); }
      car.trk += sp * dt; if (car.trk > 13) { car.trk = 0; for (const s of [0, 1]) { const w = s ? 27 : -27, a = tracks[s]; a.push(car.x - cs * 34 - sn * w, car.y - sn * 34 + cs * w); if (a.length > 520) a.splice(0, 2); } }
    }
  }
  if ((car.air || car.roll) && tracks[0].length && !isNaN(tracks[0][tracks[0].length - 1])) { tracks[0].push(NaN, NaN); tracks[1].push(NaN, NaN); } // break the tyre marks
  // the rim of the reserve turns the buggy back
  const d = Math.hypot(car.x, car.y);
  if (d > R - 30) { const k = (d - (R - 30)) * 5 * dt; car.vx -= car.x / d * k * 60; car.vy -= car.y / d * k * 60; if (d > R + 60) { car.x *= (R + 60) / d; car.y *= (R + 60) / d; } if (edgeT <= 0) { note(T('edge'), '', 2); edgeT = 4; } }
  edgeT -= dt; hitT -= dt;
  // solid things: bump and slow down
  const bump = (o, oy) => { const dx = car.x - o.x, dy = car.y - (o.y - oy), rr = o.rad + 27, d2 = dx * dx + dy * dy; if (d2 >= rr * rr || car.air) return false;
    const dd = Math.sqrt(d2) || 1, nx = dx / dd, ny = dy / dd, vn2 = car.vx * nx + car.vy * ny; car.x += nx * (rr - dd); car.y += ny * (rr - dd);
    if (vn2 < 0) { car.vx -= nx * vn2 * 1.3; car.vy -= ny * vn2 * 1.3; if (vn2 < -90 && hitT <= 0) { play('hit'); shake = 6; hitT = 0.4; buzz(40); } } return true; };
  for (const p of PROPS) if (p.rad && Math.abs(p.x - car.x) < 140 && Math.abs(p.y - car.y) < 140) bump(p, p.rad * 0.35);
  for (const a of ANIMALS) { // animals wander near home and trot away from a fast buggy
    const dx = a.x - car.x, dy = a.y - car.y, dc = Math.hypot(dx, dy);
    const shy = a.kind === 'gazelle'; // gazelles bolt early and fast; camels and oryx only step aside
    if (dc < (shy ? 230 : 115) && sp > (shy ? 60 : 110) && a.run <= 0) { a.run = shy ? 2.2 : 1.5; a.rx = dx / (dc || 1); a.ry = dy / (dc || 1); }
    let mx = 0, my = 0;
    if (a.run > 0) { a.run -= dt; mx = a.rx * (shy ? 210 : 90); my = a.ry * (shy ? 210 : 90); }
    else if (a.wait > 0) a.wait -= dt;
    else { const tx = a.tx - a.x, ty = a.ty - a.y, m = Math.hypot(tx, ty); if (m < 6) { a.wait = 1 + Math.random() * 4; const an = Math.random() * TAU, rr = 40 + Math.random() * 110; a.tx = a.hx + Math.cos(an) * rr; a.ty = a.hy + Math.sin(an) * rr * 0.7; } else { mx = tx / m * 20; my = ty / m * 20; } }
    if (mx || my) { a.x += mx * dt; a.y += my * dt; a.ph += dt * (a.run > 0 ? 13 : 4.5); if (Math.abs(mx) > 2) a.dir = mx > 0 ? 1 : -1; }
    if (dc < 60) bump(a, 8);
  }
  // pick-ups
  for (const o of DATES) if (!o.off) { const dx = o.x - car.x, dy = o.y - car.y; if (dx * dx + dy * dy < PH.pick) { o.off = true; run.dates++; play('date', 1 + (run.dates % 8) * 0.06); } }
  for (const o of CANS) if (!o.off) { const dx = o.x - car.x, dy = o.y - car.y; if (dx * dx + dy * dy < 2200) { o.off = true; run.cans++; run.fuel = Math.min(run.max, run.fuel + 26); run.low = false; play('power'); float(o.x, o.y - 30, T('canPlus'), '#bff0c0'); } }
  let cur = '';
  for (const s of SITES) { const dx = s.x - car.x, dy = s.y - car.y, rr = reach(s); if (dx * dx + dy * dy >= rr * rr) continue; cur = s.id;
    if (!run.seen[s.id]) { run.seen[s.id] = 1; if (!save.cards.includes(s.id)) { save.cards.push(s.id); save.coins += s.coins; run.cards.push(s.id); addXP(30); persist(); coinsUI(); play('zone'); note(T('found', T('s_' + s.id), s.coins), 'card', 3.2); } } }
  if (cur !== run.cur) { run.cur = cur; if (cur) { run.vis.push(cur); if (run.vis.length > 60) run.vis.shift(); } } // the order places were entered, for delivery missions
  run.mt -= dt; if (run.mt <= 0) { run.mt = 0.3; checkMissions(); }
  if (run.race) { // race: clock, ghost recording, next checkpoint. Fuel does not run down.
    run.rt += dt; run.recT -= dt; if (run.recT <= 0) { run.recT += 0.2; if (run.rec.length < 6000) run.rec.push(Math.round(car.x), Math.round(car.y), Math.round(car.ang * 100)); }
    const g = site(run.race.pts[run.ri]), dx = g.x - car.x, dy = g.y - car.y, rr = reach(g);
    if (dx * dx + dy * dy < rr * rr) { run.ri++; play('power', 1.2); buzz(30); float(car.x, car.y - 110, (run.ri - 1) + ' / ' + (run.race.pts.length - 1), '#bff0c0'); if (run.ri >= run.race.pts.length) { finishRace(); return; } }
  } else {
    run.fuel -= dt * (0.25 + 0.75 * Math.abs(thr)) * BURN;
    if (!run.low && run.fuel < run.max * 0.2 && run.fuel > 0) { run.low = true; note(T('fuelLow'), '', 3); }
    if (run.fuel <= 0) { run.fuel = 0; if (sp < 30 && !car.air && !car.roll) { run.over += dt; if (run.over > 0.9) { endRun(false); return; } } }
  }
  // camera looks a little ahead of the buggy
  // the car leans with the ground under it, and noses up or down in the air
  const c2 = Math.cos(car.ang), s2 = Math.sin(car.ang), kt = Math.min(1, dt * 9);
  car.pit += ((car.air ? clamp(car.vz / 380, -0.5, 0.55) : car.roll ? 0 : Math.atan(gx * c2 + gy * s2)) - car.pit) * kt;
  car.rol += ((car.air || car.roll ? 0 : Math.atan(gy * c2 - gx * s2)) - car.rol) * kt;
  car.lean += ((car.air || car.roll ? 0 : car.tside * clamp((car.tip - 0.1) / 0.9, 0, 1) * 0.62) - car.lean) * Math.min(1, dt * 10); // one side lifts as the car tips
  car.spin += (car.vx * c2 + car.vy * s2) / (12.5 * CS) * dt;
  const k = Math.min(1, dt * 4); camx += (car.x + car.vx * 0.3 - camx) * k; camy += (car.y + car.vy * 0.3 - camy) * k;
  engine(sp, thr);
}

// ---------- drawing a frame ----------
const draws = [];
function drawCar(c) {
  const alt = Math.max(0, car.z - H(car.x, car.y)), col = COLORS[save.color] || COLORS.white, cs = Math.cos(car.ang), sn = Math.sin(car.ang);
  const f = car.vx * cs + car.vy * sn, l = -car.vx * sn + car.vy * cs, ss = 1 - Math.min(0.4, alt / 400);
  c.save(); c.translate(car.x + 7 + alt * 0.4, car.y + 9 + alt * 0.3); c.rotate(car.ang); c.scale(ss, ss);
  c.fillStyle = 'rgba(60,30,15,' + (0.3 - Math.min(0.15, alt / 800)) + ')'; c.beginPath(); c.roundRect(-52, -33, 104, 66, 18); c.fill(); c.restore();
  const tumble = car.roll ? -car.rside * car.rollT / 1.15 * TAU * 2 : car.lean + car.tip * 0.05 * Math.sin(t * 24);
  drawCar3D(c, car.x, car.y, 1, { ang: car.ang, pit: car.pit - car.fp, rol: car.rol + tumble, lift: alt + (car.roll ? 8 + Math.abs(Math.sin(tumble)) * 16 : Math.abs(Math.sin(car.lean)) * 34 + Math.abs(Math.sin(car.fp)) * 20), steer: car.steer, spin: car.spin,
    speed: f, lat: l, t, air: car.air && car.airT > 0.12, mouth: car.air || car.roll || car.tip > 0.35 ? 'o' : '', col });
  const live = car.drift && car.dsc > 12 ? T('st_drift') + ' ' + Math.round(car.dsc) : car.twoT > 0.25 ? T('st_two', car.twoT.toFixed(1)) : ''; // the stunt in progress, counted above the car
  if (live) { c.font = '800 22px "Baloo Bhaijaan 2", sans-serif'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = INK; c.strokeText(live, car.x, car.y - 150); c.fillStyle = '#ffe07a'; c.fillText(live, car.x, car.y - 150); }
  if (car.tip > 0.7 && !car.roll) { c.fillStyle = SHEMAGH; c.strokeStyle = '#fffaf0'; c.lineWidth = 4; c.font = '800 32px "Baloo Bhaijaan 2", sans-serif'; c.textAlign = 'center'; c.strokeText('!', car.x, car.y - 122); c.fillText('!', car.x, car.y - 122); }
}
function decals(c, x0, y0, x1, y1) { // flat things painted on the ground under everything else
  let s = site('oasis');
  if (s.x > x0 - 320 && s.x < x1 + 320 && s.y > y0 - 320 && s.y < y1 + 320) {
    c.fillStyle = 'rgba(96,150,70,.5)'; c.beginPath(); c.ellipse(s.x, s.y + 20, 200, 130, 0, 0, TAU); c.fill();
    c.fillStyle = '#3f93ad'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.ellipse(s.x, s.y + 20, 96, 52, 0, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(s.x - 14, s.y + 12, 46, 18, 0, 3.4, 5); c.stroke(); c.beginPath(); c.ellipse(s.x + 20, s.y + 34, 40, 12, 0, 0.3, 1.9); c.stroke();
  }
  s = SAB;
  if (s.x > x0 - 400 && s.x < x1 + 400 && s.y > y0 - 400 && s.y < y1 + 400) { // salt crust cracks
    c.strokeStyle = 'rgba(120,96,70,.35)'; c.lineWidth = 1.4; c.beginPath();
    for (let k = 0; k < 46; k++) { const a = hash2(k, 5) * TAU, d = Math.sqrt(hash2(k, 9)) * s.r * 0.72, x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d, b = hash2(k, 3) * TAU;
      c.moveTo(x, y); c.lineTo(x + Math.cos(b) * 26, y + Math.sin(b) * 26); c.lineTo(x + Math.cos(b) * 26 + Math.cos(b + 1.1) * 20, y + Math.sin(b) * 26 + Math.sin(b + 1.1) * 20); c.moveTo(x, y); c.lineTo(x + Math.cos(b + 2.2) * 22, y + Math.sin(b + 2.2) * 22); }
    c.stroke();
  }
  s = site('camp');
  if (s.x > x0 - 200 && s.x < x1 + 200 && s.y > y0 - 200 && s.y < y1 + 200) { // the sadu rug in front of the tent
    c.save(); c.translate(s.x, s.y - 20); c.fillStyle = SHEMAGH; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.roundRect(-56, -22, 112, 44, 4); c.fill(); c.stroke();
    c.fillStyle = '#2f2622'; c.fillRect(-56, -14, 112, 5); c.fillRect(-56, 9, 112, 5); c.fillStyle = '#fffaf0'; for (let i = -50; i < 50; i += 12) { c.beginPath(); c.moveTo(i, 4); c.lineTo(i + 6, -4); c.lineTo(i + 12, 4); c.closePath(); c.fill(); } c.restore();
  }
}
function render(dt) {
  const c = ctx; bakeBudget = st === 'play' ? 2 : 3;
  let shx = 0, shy = 0; if (shake > 0.2) { shx = (Math.random() - 0.5) * shake * dpr; shy = (Math.random() - 0.5) * shake * dpr; shake *= Math.pow(0.02, dt); }
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#e3ad68'; c.fillRect(0, 0, W, Hh);
  c.setTransform(zoom, 0, 0, zoom, W / 2 - camx * zoom + shx, Hh / 2 - camy * zoom + shy);
  const hw = W / 2 / zoom + 8, hh = Hh / 2 / zoom + 8, x0 = camx - hw, x1 = camx + hw, y0 = camy - hh, y1 = camy + hh;
  for (let iy = Math.floor(y0 / TS); iy <= Math.floor(y1 / TS); iy++) for (let ix = Math.floor(x0 / TS); ix <= Math.floor(x1 / TS); ix++) { const tl = tile(ix, iy); if (tl) c.drawImage(tl, ix * TS, iy * TS, TS + 0.6, TS + 0.6); }
  decals(c, x0, y0, x1, y1);
  const racing = run.race && (st === 'play' || st === 'pause') && run.ri < run.race.pts.length, goal = racing ? site(run.race.pts[run.ri]) : null;
  if (goal) { // the next checkpoint: a turning ring on the sand and a column of light
    const rr = reach(goal); c.strokeStyle = 'rgba(31,122,116,.9)'; c.lineWidth = 7; c.setLineDash([24, 16]); c.lineDashOffset = -t * 50; c.beginPath(); c.arc(goal.x, goal.y, rr, 0, TAU); c.stroke(); c.setLineDash([]);
    const lg = c.createLinearGradient(0, goal.y - 520, 0, goal.y); lg.addColorStop(0, 'rgba(255,250,240,0)'); lg.addColorStop(1, 'rgba(255,250,240,.5)'); c.fillStyle = lg; c.fillRect(goal.x - 20, goal.y - 520, 40, 520);
  }
  c.strokeStyle = 'rgba(110,62,34,.3)'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); // tyre marks
  for (const a of tracks) { let pen = false; for (let i = 0; i < a.length; i += 2) { if (isNaN(a[i])) { pen = false; continue; } if (pen) c.lineTo(a[i], a[i + 1]); else c.moveTo(a[i], a[i + 1]); pen = true; } }
  c.stroke();
  const inView = (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  if (st !== 'menu' && st !== 'load') {
    const eD = spr('date'), eC = spr('can'); c.fillStyle = 'rgba(60,30,15,.2)';
    for (let i = 0; i < DATES.length; i++) { const o = DATES[i]; if (o.off || !inView(o.x, o.y, 20)) continue; c.beginPath(); c.ellipse(o.x + 2, o.y + 8, 6, 2.5, 0, 0, TAU); c.fill(); blit(c, eD, o.x, o.y - 5 - Math.sin(t * 3 + i) * 2.5); }
    for (let i = 0; i < CANS.length; i++) { const o = CANS[i]; if (o.off || !inView(o.x, o.y, 30)) continue; c.beginPath(); c.ellipse(o.x + 2, o.y + 3, 12, 4, 0, 0, TAU); c.fill(); blit(c, eC, o.x, o.y - 3 - Math.sin(t * 2.4 + i) * 3); }
  }
  // standing things and the buggy, sorted so nearer ones overlap farther ones
  draws.length = 0;
  for (const p of PROPS) if (!p.hide && inView(p.x, p.y, 130)) draws.push(p);
  for (const a of ANIMALS) if (inView(a.x, a.y, 90)) draws.push(a);
  if (racing && run.ghost && run.cd <= 0) { // the ghost of your best run in this race
    const g = run.ghost, u = run.rt / 0.2, i = Math.floor(u) * 3, f = u % 1;
    if (i + 5 < g.length) { c.globalAlpha = 0.34; drawCar3D(c, g[i] + (g[i + 3] - g[i]) * f, g[i + 1] + (g[i + 4] - g[i + 1]) * f, 1, { ang: g[i + 2] / 100 + wrap((g[i + 5] - g[i + 2]) / 100) * f, speed: 200, spin: t * 8, t, col: COLORS.black }); c.globalAlpha = 1; }
  }
  draws.push(car); draws.sort((a, b) => a.y - b.y);
  for (const o of draws) {
    if (o === car) { drawCar(c); continue; }
    const e = o.hx !== undefined ? spr(o.kind, (o.ph | 0) % 4) : spr(o.kind);
    c.fillStyle = 'rgba(60,30,15,.2)'; c.beginPath(); c.ellipse(o.x + e.w * 0.06, o.y + 1, e.w * 0.34, Math.min(9, e.w * 0.08), 0, 0, TAU); c.fill();
    blit(c, e, o.x, o.y, o.hx !== undefined ? o.dir < 0 : o.flip);
  }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
    c.fillStyle = 'rgba(244,214,160,' + Math.min(0.6, p.life) + ')'; c.beginPath(); c.arc(p.x, p.y, p.r * (1.4 - p.life), 0, TAU); c.fill(); }
  c.font = '800 20px "Baloo Bhaijaan 2", sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = INK;
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; if (f.life <= 0) { floats.splice(i, 1); continue; } f.y -= 26 * dt; c.globalAlpha = Math.min(1, f.life * 2); c.strokeText(f.txt, f.x, f.y); c.fillStyle = f.col; c.fillText(f.txt, f.x, f.y); }
  c.globalAlpha = 1;
  if (goal && st === 'play') { // an arrow at the edge of the view, pointing to the next checkpoint
    const dx = goal.x - car.x, dy = goal.y - car.y, d = Math.hypot(dx, dy);
    if (d > 300) { const a = Math.atan2(dy, dx), ax = W / 2 + Math.cos(a) * W * 0.34, ay = Hh / 2 + Math.sin(a) * Hh * 0.3, u = dpr;
      c.setTransform(u, 0, 0, u, ax, ay); c.rotate(a); c.fillStyle = '#1f7a74'; c.strokeStyle = '#fffaf0'; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath(); c.moveTo(24, 0); c.lineTo(-12, -16); c.lineTo(-4, 0); c.lineTo(-12, 16); c.closePath(); c.fill(); c.stroke();
      c.setTransform(u, 0, 0, u, ax - Math.cos(a) * 34, ay - Math.sin(a) * 34); c.font = '800 15px "Baloo Bhaijaan 2", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = INK; c.strokeText(nf(d / 8), 0, 0); c.fillStyle = '#fffaf0'; c.fillText(nf(d / 8), 0, 0); c.textBaseline = 'alphabetic'; }
  }
  if (joy.id >= 0 && st === 'play') { // the drag ring under the finger
    c.setTransform(dpr, 0, 0, dpr, 0, 0); const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy) || 1, k = Math.min(1, JOY_R / m);
    c.strokeStyle = 'rgba(255,250,240,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(joy.ox, joy.oy, JOY_R, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(200,32,43,.8)'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(joy.ox + dx * k, joy.oy + dy * k, 20, 0, TAU); c.fill(); c.stroke();
  }
}
function drawMap(cnv, big) {
  const g = cnv.getContext('2d'), S = cnv.width, k = S / (2 * R * 1.04), u = S / 264, px = x => S / 2 + x * k;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.imageSmoothingEnabled = true; g.drawImage(miniBase, 0, 0, S, S);
  g.strokeStyle = INK; g.lineWidth = 2 * u; g.beginPath(); g.arc(S / 2, S / 2, R * k, 0, TAU); g.stroke();
  if (st === 'play' || st === 'pause') { g.fillStyle = SHEMAGH; for (const o of CANS) if (!o.off) { g.beginPath(); g.arc(px(o.x), px(o.y), 2.6 * u, 0, TAU); g.fill(); } }
  g.font = `800 ${Math.round(big ? 9 * u : 10 * u)}px "Baloo Bhaijaan 2", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  SITES.forEach((s, i) => { const on = save.cards.includes(s.id), r = (big ? 7 : 5.5) * u;
    g.fillStyle = on ? '#1f7a74' : '#d9b57f'; g.strokeStyle = INK; g.lineWidth = 1.5 * u; g.beginPath(); g.arc(px(s.x), px(s.y), r, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = on ? '#fffaf0' : INK; g.fillText(big ? String(i + 1) : on ? '' : '?', px(s.x), px(s.y) + 0.5 * u); });
  if (run.race && (st === 'play' || st === 'pause') && run.ri < run.race.pts.length) { // the race route still to drive
    g.strokeStyle = '#fffaf0'; g.lineWidth = 2.2 * u; g.setLineDash([5 * u, 4 * u]); g.beginPath(); g.moveTo(px(car.x), px(car.y)); for (let i = run.ri; i < run.race.pts.length; i++) { const q = site(run.race.pts[i]); g.lineTo(px(q.x), px(q.y)); } g.stroke(); g.setLineDash([]);
    const q = site(run.race.pts[run.ri]); g.strokeStyle = SHEMAGH; g.lineWidth = 3 * u; g.beginPath(); g.arc(px(q.x), px(q.y), (9 + Math.sin(t * 6) * 2) * u, 0, TAU); g.stroke();
  }
  if (st === 'play' || st === 'pause') { g.save(); g.translate(px(car.x), px(car.y)); g.rotate(car.ang); g.fillStyle = SHEMAGH; g.strokeStyle = '#fffaf0'; g.lineWidth = 1.6 * u;
    g.beginPath(); g.moveTo(9 * u, 0); g.lineTo(-6 * u, -6 * u); g.lineTo(-3 * u, 0); g.lineTo(-6 * u, 6 * u); g.closePath(); g.fill(); g.stroke(); g.restore(); }
}
function hud() { // only touch the page when a value changes
  if (run.race) { const key = (run.rt * 10 | 0) + '|' + run.ri; if (key === hudKey) return; hudKey = key; $('mDist').textContent = fmtTime(run.rt); $('mDates').textContent = (run.ri - 1) + '/' + (run.race.pts.length - 1); return; }
  const m = Math.round(run.dist / 8), f = Math.round(run.fuel / run.max * 100), key = m + '|' + f + '|' + run.dates; if (key === hudKey) return; hudKey = key;
  $('mDist').textContent = nf(m); $('mDates').textContent = nf(run.dates);
  $('fuelFill').style.transform = `scaleX(${f / 100})`; $('bar').classList.toggle('danger', f < 20);
  const ms = save.missions.find(q => !q.done), el = $('mis'); // the mission you are working on, with its progress
  if (ms) { const tx = mText(ms) + ' · ' + mVal(ms, Math.min(ms.n, mProg(ms))) + ' / ' + mVal(ms, ms.n); if (el.textContent !== tx) el.textContent = tx; } el.hidden = !ms;
}
// ---------- the loop ----------
let last = 0, avPh = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const cap = st === 'play' ? 1000 / 62 : 1000 / 31; // at most 60 frames a second in a run, 30 behind the menus
  if (now - last < cap - 1.5) return;
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;
  if (st === 'play') {
    update(dt); if (st === 'play') { hud(); if (++miniTick % 6 === 0) drawMap($('mini')); }
    slow = dt > 0.024 ? slow + dt : Math.max(0, slow - dt * 0.5); // frames running slow for a few seconds: lower the render resolution
    if (slow > 3 && rs > 0.6) { rs = Math.max(0.6, rs - 0.15); slow = 0; resize(); }
  } else if (st === 'menu' || st === 'load') { camx = Math.cos(t * 0.07) * 150; camy = 20 + Math.sin(t * 0.07) * 90; engine(0, 0); }
  else engine(0, 0);
  if (st !== 'load') render(dt);
  if (noteT > 0 && (noteT -= dt) <= 0) $('note').hidden = true;
  avPh += dt * 5; if (st === 'menu' && !$('menu').hidden) drawAvatar($('avMenu'), avPh, 'grin'); else if (st === 'over') drawAvatar($('avOver'), avPh, run.cards.length || run.newBest ? 'grin' : 'o');
  music();
}

// ---------- screens ----------
const show = (id, on) => { $(id).hidden = !on; };
function coinsUI() { document.querySelectorAll('.coinVal').forEach(e => { e.textContent = nf(save.coins); }); document.querySelectorAll('.lvVal').forEach(e => { e.textContent = T('lv', save.lvl); }); }
const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>', ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM17 9.5l5 5M22 9.5l-5 5"/></svg>';
function muteUI() { $('menuMute').innerHTML = save.muted ? ICON_OFF : ICON_ON; $('menuMute').setAttribute('aria-pressed', save.muted); $('mute').textContent = save.muted ? '×' : '♪'; if (master) master.gain.value = save.muted ? 0 : 1; }
function toggleMute() { save.muted = !save.muted; persist(); unlockAudio(); muteUI(); }
function showMenu() {
  st = 'menu'; resetCar(); for (const o of DATES) o.off = false; for (const o of CANS) o.off = false;
  ['hud', 'miniBtn', 'pauseBtn', 'mute', 'over', 'pausePop', 'sheet'].forEach(id => show(id, false)); show('menu', true); coinsUI();
  const b = $('menuBest'); b.hidden = !save.best; b.textContent = T('best', save.best); releaseWake();
}
function startRun(rc) { // rc: a race to drive, or nothing for a free safari
  unlockAudio(); st = 'play'; resetCar(); for (const o of DATES) o.off = false; for (const o of CANS) o.off = false;
  const u = save.up; Object.assign(PH, { acc: ACC * (1 + 0.07 * u.engine), grip: GRIP + 0.45 * u.tyres, rr: RR - 2.5 * u.tyres, tip: TIP + 0.022 * u.balance, pick: (41 + 13 * u.magnet) ** 2 });
  Object.assign(run, { dist: 0, dates: 0, air: 0, rolls: 0, cards: [], max: 100 + u.tank * 12, over: 0, low: false, seen: {}, newBest: false, live: true, maxAir: 0, cans: 0, stunt: 0, drift: 0, two: 0, flips: 0, spins: 0, nr: 0, noRoll: 0, vis: [], cur: '', mdone: 0, mcoins: 0, lvlUp: 0, mt: 0,
    race: rc || null, ri: 1, rt: 0, cd: rc ? 3 : 0, cdn: 0, rec: [], recT: 0, ghost: rc ? ghosts[raceKey(rc)] : null, done: null }); run.fuel = run.max;
  if (rc) { const a = site(rc.pts[0]), b = site(rc.pts[1]), an = Math.atan2(b.y - a.y, b.x - a.x), d = reach(a) + 40; car.x = a.x + Math.cos(an) * d; car.y = a.y + Math.sin(an) * d; car.ang = an; car.z = H(car.x, car.y); }
  $('distLbl').textContent = rc ? '' : T('m'); $('dateLbl').textContent = rc ? T('cp') : T('dates'); show('fuelBox', !rc);
  const mi = $('mis'); mi.hidden = !rc; if (rc) mi.textContent = T('raceHud', T('r_' + rc.id), fmtTime(raceTargets(rc)[2]));
  camx = car.x; camy = car.y; hudKey = ''; joy.id = -1; for (const k in keys) keys[k] = 0;
  ['menu', 'over', 'pausePop', 'sheet'].forEach(id => show(id, false)); ['hud', 'miniBtn', 'pauseBtn', 'mute'].forEach(id => show(id, true));
  save.runs++; persist(); drawMap($('mini')); wake();
}
function pause() { if (st !== 'play') return; st = 'pause'; joy.id = -1; show('pausePop', true); releaseWake(); }
function resume() { if (st !== 'pause') return; st = 'play'; show('pausePop', false); show('sheet', false); last = performance.now(); wake(); }
async function endRun(early) {
  if (st !== 'play' && st !== 'pause') return;
  const dn = run.done, raced = !!run.race;
  st = 'over'; joy.id = -1; play(dn ? 'power' : 'lose'); releaseWake(); ['hud', 'miniBtn', 'pauseBtn', 'pausePop', 'sheet'].forEach(id => show(id, false)); $('note').hidden = true;
  const m = Math.round(run.dist / 8), air = Math.round(run.air * 10) / 10, cS = Math.floor(run.dates / 10), cD = Math.floor(m / 250), cA = Math.floor(run.stunt / 50), total = cS + cD + cA;
  run.newBest = !raced && m > save.best; if (run.newBest) save.best = m; save.coins += total;
  endDrift(); endTwo(); checkMissions(); addXP(m / 40 + run.dates / 2 + run.stunt / 25);
  for (const q of save.missions) if (!q.done && (q.t === 'tdates' || q.t === 'tdist')) q.p = Math.min(q.n, mProg(q)); // missions that add up over several runs keep their progress
  run.live = false; fillMissions(); persist();
  // ads hook, the same one the other Abood games offer: the results card waits for it, for 15 seconds at most
  try { if (typeof window.aboodAfterRun === 'function') await Promise.race([window.aboodAfterRun({ distance: m, dates: run.dates }), new Promise(r => setTimeout(r, 15000))]); } catch (e) {}
  $('overQuote').textContent = pick(T('overQuote')); $('overTitle').textContent = raced ? (dn ? T('medal' + dn.medal) : T('raceQuit')) : run.newBest ? T('newBest') : T(early ? 'overTitleEnd' : 'overTitle');
  $('overMsg').textContent = raced ? (dn ? T('raceMsg', fmtTime(dn.tm), fmtTime(dn.best)) : T('raceQuitMsg')) : T('overMsg', m, run.dates);
  $('sDist').textContent = nf(m); $('sAir').textContent = air.toFixed(1); $('sBest').textContent = nf(save.best);
  $('swDates').textContent = nf(run.dates); $('swCoins').textContent = '+' + nf(total);
  $('swPartS').textContent = T('partS', run.dates, cS); $('swPartD').textContent = T('partD', m, cD); $('swPartA').textContent = T('partA', run.stunt, cA);
  const extra = []; if (dn && dn.gain) extra.push(T('overMedal', dn.gain)); if (dn && dn.isBest) extra.push(T('overBestTime')); if (run.mdone) extra.push(T('overMis', run.mdone, run.mcoins)); if (run.lvlUp) extra.push(T('overLvl', run.lvlUp));
  if (run.cards.length) extra.push(T('overCards', run.cards.map(id => T('s_' + id)).join(getLang() === 'ar' ? '، ' : ', ')));
  const oc = $('overCards'); oc.hidden = !extra.length; oc.textContent = extra.join(' · ');
  const ic = $('swDateIc').getContext('2d'); ic.setTransform(1, 0, 0, 1, 0, 0); ic.clearRect(0, 0, 64, 64); ic.setTransform(2.6, 0, 0, 2.6, 32, 34); aDate(ic);
  coinsUI(); show('over', true);
}

// sheets: postcards, garage, map, how to play
let sheetId = null;
function siteIcon(cnv, id) {
  const g = cnv.getContext('2d'), S = cnv.width; g.setTransform(1, 0, 0, 1, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, S); sky.addColorStop(0, '#fbeccd'); sky.addColorStop(0.62, '#f6d6a0'); sky.addColorStop(0.63, '#e3ad68'); sky.addColorStop(1, '#d09556'); g.fillStyle = sky; g.fillRect(0, 0, S, S);
  const main = { camp: 'tent', oasis: 'palm', fort: 'fort', camels: 'camel', oryx: 'oryx', falcon: 'perch', well: 'well', festival: 'stall', gate: 'gate', moreeb: 'summit', sabkha: 'sign' }[id];
  if (id === 'moreeb') { g.fillStyle = '#e9b872'; g.strokeStyle = INK; g.lineWidth = S / 60; g.beginPath(); g.moveTo(-4, S * 0.86); g.quadraticCurveTo(S * 0.4, S * 0.2, S * 0.62, S * 0.34); g.quadraticCurveTo(S * 0.8, S * 0.6, S + 4, S * 0.8); g.lineTo(S + 4, S + 4); g.lineTo(-4, S + 4); g.closePath(); g.fill(); g.stroke(); }
  if (id === 'sabkha') { g.fillStyle = '#efe6d6'; g.beginPath(); g.ellipse(S / 2, S * 0.8, S * 0.44, S * 0.13, 0, 0, TAU); g.fill(); }
  const e = main === 'camel' || main === 'oryx' ? spr(main, 0) : spr(main), k = Math.min(S * 0.8 / e.w, S * (id === 'moreeb' ? 0.4 : 0.72) / e.h);
  const bx = id === 'moreeb' ? S * 0.6 : S / 2 - (e.x + e.w / 2) * k, by = id === 'moreeb' ? S * 0.36 : S * 0.86;
  g.setTransform(k, 0, 0, k, bx, by); g.drawImage(e.c, e.x, e.y, e.w, e.h);
}
function openSheet(id) {
  sheetId = id; const body = $('sheetBody'); body.innerHTML = ''; $('sheetTitle').textContent = T({ cards: 'cardsTitle', garage: 'garageTitle', map: 'mapTitle', help: 'helpTitle', missions: 'misTitle', races: 'raceTitle' }[id]);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  if (id === 'cards') {
    body.append(el('p', 'label', T('cardsNote', save.cards.length, SITES.length))); const grid = el('div', 'cards');
    for (const s of SITES) { const on = save.cards.includes(s.id), card = el('div', 'card' + (on ? '' : ' locked')), cn = mk(192, 192); siteIcon(cn, s.id); card.append(cn, el('b', '', on ? T('s_' + s.id) : T('unknown')), el('small', '', `+${s.coins}`)); grid.append(card); }
    body.append(grid);
  } else if (id === 'garage') {
    body.append(el('p', 'label', T('garageNote'))); const grid = el('div', 'cards');
    for (const [cid, col] of Object.entries(COLORS)) {
      const own = save.colors.includes(cid), on = save.color === cid, card = el('div', 'card' + (on ? ' on' : '')), cn = mk(192, 192), g = cn.getContext('2d');
      g.fillStyle = '#e9b872'; g.fillRect(0, 0, 192, 192); drawCar3D(g, 92, 158, 1.18, { ang: 0.95, steer: 0.5, speed: 90, t: 1, col });
      const btn = el('button', on || own ? 'sec' : '', on ? T('using') : own ? T('use') : T('buy', col.cost)); btn.type = 'button'; btn.disabled = on;
      btn.onclick = () => { if (!own) { if (save.coins < col.cost) return note(T('notEnough')); save.coins -= col.cost; save.colors.push(cid); note(T('bought')); play('power'); } save.color = cid; persist(); coinsUI(); openSheet('garage'); };
      card.append(cn, el('b', '', T('c_' + cid)), el('small', '', col.cost ? nf(col.cost) : T('free')), btn); grid.append(card);
    }
    body.append(grid, el('p', 'label', T('upTitle'))); const ug = el('div', 'cards'), mine = COLORS[save.color] || COLORS.white;
    for (const uid of UPS) { // five upgrades, five levels each
      const lv = save.up[uid], card = el('div', 'card'), cn = mk(192, 192), g = cn.getContext('2d'); g.fillStyle = '#e9b872'; g.fillRect(0, 0, 192, 192);
      if (uid === 'tank') { g.setTransform(5, 0, 0, 5, 96, 168); aCan(g); }
      else if (uid === 'magnet') { for (const [x, y, k] of [[60, 120, 4], [112, 86, 5.5], [140, 140, 3.4]]) { g.setTransform(k, 0, 0, k, x, y); aDate(g); } }
      else drawCar3D(g, 92, 158, 1.18, uid === 'engine' ? { ang: 0.25, speed: 320, t: 1, col: mine } : uid === 'tyres' ? { ang: 1.25, steer: 1, speed: 60, t: 1, col: mine } : { ang: 0.6, rol: 0.42, speed: 60, t: 1, col: mine });
      const maxed = lv >= 5, btn = el('button', '', maxed ? T('upMax') : T('buy', UP_COST[lv])); btn.type = 'button'; btn.disabled = maxed;
      btn.onclick = () => { const cost = UP_COST[save.up[uid]]; if (save.coins < cost) return note(T('notEnough')); save.coins -= cost; save.up[uid]++; persist(); coinsUI(); note(T('bought')); play('power'); openSheet('garage'); };
      const pips = el('span', 'pips'); for (let i = 0; i < 5; i++) pips.append(el('i', i < lv ? 'on' : ''));
      card.append(cn, el('b', '', T('u_' + uid)), el('small', '', T('ud_' + uid)), pips, btn); ug.append(card);
    }
    body.append(ug);
  } else if (id === 'map') {
    const wrap2 = el('div', 'map-wrap'), cn = mk(600, 600), ul = el('ul', 'legend'); drawMap(cn, true);
    SITES.forEach((s, i) => { const on = save.cards.includes(s.id), li = el('li', on ? '' : 'off'); li.append(el('i', '', String(i + 1)), el('span', '', on ? T('s_' + s.id) : T('unknown'))); ul.append(li); });
    const side = el('div', 'menu-text'); side.append(el('p', 'label', T('mapNote')), ul); wrap2.append(cn, side); body.append(wrap2);
  } else if (id === 'missions') {
    const top = el('div', 'rank'), bar = el('div', 'pbar'), fill = el('i'); fill.style.width = Math.round(save.xp / xpNeed(save.lvl) * 100) + '%'; bar.append(fill);
    top.append(el('b', '', T('rank')[rankOf(save.lvl)]), el('span', '', T('lv', save.lvl)), bar, el('small', '', nf(save.xp) + ' / ' + nf(xpNeed(save.lvl)))); body.append(top);
    for (const m of save.missions) { const row = el('div', 'mrow' + (m.done ? ' done' : '')), v = Math.min(m.n, mProg(m)), pb = el('div', 'pbar'), pf = el('i'); pf.style.width = Math.round(v / m.n * 100) + '%'; pb.append(pf);
      const rw = el('span', 'rw'); rw.append(el('i', 'coin'), el('b', '', '+' + m.rw)); row.append(el('b', '', mText(m)), rw, pb, el('small', '', m.done ? T('mDoneShort') : mVal(m, v) + ' / ' + mVal(m, m.n))); body.append(row); }
    body.append(el('p', 'hint', T('misNote', save.streak)));
  } else if (id === 'races') {
    body.append(el('p', 'label', T('raceNote')));
    for (const rc of [dailyRace(), ...RACES]) { const key = raceKey(rc), tg = raceTargets(rc), med = save.medals[key] || 0, best = save.times[key], locked = save.lvl < rc.lvl, row = el('div', 'rrow' + (rc.id === 'daily' ? ' daily' : ''));
      const info = el('div', 'rinfo'), tm = el('div', 'rtimes'); info.append(el('b', '', T('r_' + rc.id)), el('small', '', rc.pts.map(id => T('s_' + id)).join(getLang() === 'ar' ? ' ← ' : ' → ')));
      tg.forEach((sec, i) => { const sp = el('span', 'md m' + (i + 1) + (med > i ? ' on' : '')); sp.append(el('i'), el('span', '', fmtTime(sec))); tm.append(sp); }); if (best) tm.append(el('span', 'best', T('bestTime', fmtTime(best)))); info.append(tm);
      const btn = el('button', 'btn', locked ? T('locked', rc.lvl) : T('raceGo')); btn.type = 'button'; btn.disabled = locked; btn.onclick = () => startRun(rc); row.append(info, btn); body.append(row); }
  } else { const ol = el('ol', 'help-list'); for (const line of T('help')) ol.append(el('li', '', line)); body.append(ol); }
  show('sheet', true);
}
function closeSheet() { show('sheet', false); sheetId = null; if (st === 'pause' && $('pausePop').hidden) resume(); }

// screen stays awake during a run
let wl = null;
async function wake() { try { if (navigator.wakeLock && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) {} }
function releaseWake() { try { wl && wl.release(); } catch (e) {} wl = null; }

// ---------- input ----------
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return; keys[e.code] = 1;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') { if (!$('sheet').hidden) closeSheet(); else if (st === 'play') pause(); else if (st === 'pause') resume(); }
  if (e.code === 'Enter' && $('sheet').hidden && $('langPick').hidden) { if (st === 'menu') startRun(); else if (st === 'over') startRun(run.race); else if (st === 'pause') resume(); }
});
addEventListener('keyup', e => { keys[e.code] = 0; });
cv.addEventListener('pointerdown', e => { if (st !== 'play' || joy.id >= 0) return; unlockAudio(); joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
cv.addEventListener('pointermove', e => { if (e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const joyEnd = e => { if (e.pointerId === joy.id) joy.id = -1; };
cv.addEventListener('pointerup', joyEnd); cv.addEventListener('pointercancel', joyEnd);
cv.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
$('startBtn').onclick = () => startRun(); $('againBtn').onclick = () => startRun(run.race); $('overMenuBtn').onclick = showMenu;
$('pauseBtn').onclick = pause; $('resumeBtn').onclick = resume; $('pauseMenuBtn').onclick = () => endRun(true);
$('mute').onclick = toggleMute; $('menuMute').onclick = toggleMute; $('sheetClose').onclick = closeSheet;
$('miniBtn').onclick = () => { if (st === 'play') { st = 'pause'; joy.id = -1; releaseWake(); openSheet('map'); } };
document.querySelectorAll('[data-sheet]').forEach(b => { b.onclick = () => { unlockAudio(); openSheet(b.dataset.sheet); }; });
document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); const p = e.target.closest('[data-pick]'); if (p) { setLang(p.dataset.pick); show('langPick', false); unlockAudio(); } });
const fsEl = document.documentElement;
if (fsEl.requestFullscreen && !/iPhone|iPad/.test(navigator.userAgent)) { show('fsBtn', true); $('fsBtn').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else fsEl.requestFullscreen().catch(() => {}); }; }
onLang(() => { SPR.delete('gate'); coinsUI(); const b = $('menuBest'); b.textContent = T('best', save.best); if (sheetId && !$('sheet').hidden) openSheet(sheetId); });
if (location.hash === '#debug') window.liwa = { car, run, save }; // a handle for testing from the console
new ResizeObserver(resize).observe(cv); // after layout, before paint: the picture is never shown stretched

// ---------- loading ----------
(async function boot() {
  applyLang(); muteUI(); resize(); requestAnimationFrame(frame);
  $('flagAr').innerHTML = FLAG.ar; $('flagEn').innerHTML = FLAG.en;
  const tips = T('tips'); $('ldTip').textContent = pick(tips);
  const prog = p => { $('ldFill').style.transform = `scaleX(${p})`; $('ldPct').textContent = Math.round(p * 100) + '%'; drawLoader(); };
  const drawLoader = () => { const c = $('ldCv').getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 480, 300); c.setTransform(3, 0, 0, 3, 250, 270 - Math.abs(Math.sin(performance.now() / 160)) * 14); person(c, 0, 0, performance.now() / 200, Object.assign({}, ABOOD, { arm: 'wave' })); };
  $('ldMsg').textContent = T('loading'); prog(0.03);
  try { await Promise.race([Promise.all([document.fonts.load('800 20px "Baloo Bhaijaan 2"', 'عبود'), document.fonts.load('800 20px "Baloo Bhaijaan 2"', 'Abood')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  prog(0.12); await nextFrame();
  await initAudio(); prog(0.3);
  await bakeMini(p => prog(0.3 + p * 0.25)); prog(0.55); await nextFrame();
  let n = 0; for (let iy = -3; iy <= 2; iy++) for (let ix = -4; ix <= 3; ix++) { bakeBudget = 1; tile(ix, iy); if (++n % 4 === 0) { prog(0.55 + n / 48 * 0.35); await nextFrame(); } }
  for (const k of Object.keys(KIND)) { if (k === 'camel' || k === 'oryx' || k === 'gazelle') for (let q = 0; q < 4; q++) spr(k, q); else spr(k); } // bake every sprite once
  prog(1); $('ldMsg').textContent = T('ready'); await nextFrame();
  const today = dayKey(); for (const o of [save.medals, save.times, ghosts]) for (const k of Object.keys(o)) if (k.startsWith('daily:') && k !== 'daily:' + today) delete o[k];
  fillMissions(); showMenu(); $('loader').classList.add('done');
  if (save.day !== today) { const y = new Date(); y.setDate(y.getDate() - 1); save.streak = save.day === dayKey(y) ? save.streak + 1 : 1; save.day = today; const c = 15 * Math.min(7, save.streak); save.coins += c; persist(); coinsUI(); note(T('daily', save.streak, c), 'card', 4.5); } setTimeout(() => { $('loader').hidden = true; }, 500);
  if (!hasStoredLang()) show('langPick', true);
  if (/iPhone|iPad/.test(navigator.userAgent) && !navigator.standalone) show('iosHint', true);
  // offline cache, and a note when a new version has been installed
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const had = !!navigator.serviceWorker.controller; navigator.serviceWorker.register('./sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) show('toast', true); }); $('toastBtn').onclick = () => location.reload();
  }
})();
