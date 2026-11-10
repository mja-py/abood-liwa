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
const save = { coins: 0, best: 0, cards: [], color: 'red', colors: ['red'], tank: 0, muted: false, runs: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const COLORS = {
  red: { main: SHEMAGH, dark: '#8e141d', trim: '#fffaf0', cost: 0 }, teal: { main: '#1f7a74', dark: '#145651', trim: '#fffaf0', cost: 150 },
  yellow: { main: '#f2c230', dark: '#b98a12', trim: '#2b1a12', cost: 300 }, white: { main: '#f4f1e8', dark: '#c9c3b2', trim: SHEMAGH, cost: 500 },
  black: { main: '#2a2623', dark: '#121010', trim: '#e0a72a', cost: 1000 },
};
const TANK_COST = [200, 500, 1000], TANK_STEP = 15;

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
function drawAvatar(cnv, ph, mood) {
  const c = cnv.getContext('2d'), S = cnv.width, sc = S / 100;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S);
  c.fillStyle = '#e3ad68'; c.strokeStyle = INK; c.lineWidth = 1.6 * sc; c.beginPath(); c.moveTo(-5, S * 0.86); c.quadraticCurveTo(S * 0.3, S * 0.74, S * 0.62, S * 0.86); c.quadraticCurveTo(S * 0.85, S * 0.93, S + 5, S * 0.8); c.lineTo(S + 5, S + 5); c.lineTo(-5, S + 5); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(43,26,18,.16)'; c.beginPath(); c.ellipse(S / 2, S * 0.9, S * 0.2, S * 0.03, 0, 0, TAU); c.fill();
  c.save(); c.translate(S / 2 + 6 * sc, S * 0.9); c.scale(sc, sc); person(c, 0, 0, ph, Object.assign({}, ABOOD, { mouth: mood || 'grin', arm: 'wave' })); c.restore();
}

// ---------- art: the buggy, seen from above, facing right ----------
function drawBuggy(c, col, steer, roll, flagX, flagY) {
  const k = Math.cos(roll);
  c.save(); c.scale(1, Math.max(0.14, Math.abs(k))); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 1.8;
  for (const [wx, wy, front] of [[-17, -15, 0], [-17, 15, 0], [18, -15, 1], [18, 15, 1]]) {
    c.save(); c.translate(wx, wy); if (front) c.rotate(steer * 0.45); c.fillStyle = '#2a2623'; c.beginPath(); c.roundRect(-8.5, -5.5, 17, 11, 3.5); c.fill(); c.stroke();
    c.strokeStyle = '#5a534d'; c.lineWidth = 1.2; c.beginPath(); for (let i = -4; i <= 4; i += 4) { c.moveTo(i, -4); c.lineTo(i, 4); } c.stroke(); c.restore(); c.strokeStyle = INK; c.lineWidth = 1.8;
  }
  if (k < 0) { // rolled over: the underside
    c.fillStyle = '#4a4440'; c.beginPath(); c.roundRect(-25, -11, 51, 22, 6); c.fill(); c.stroke();
    c.strokeStyle = '#2a2623'; c.lineWidth = 3; c.beginPath(); c.moveTo(-17, -12); c.lineTo(-17, 12); c.moveTo(18, -12); c.lineTo(18, 12); c.moveTo(-17, 0); c.lineTo(18, 0); c.stroke();
    c.restore(); return;
  }
  const body = () => { c.beginPath(); c.moveTo(-26, -10); c.lineTo(8, -11.5); c.quadraticCurveTo(27, -9, 28, 0); c.quadraticCurveTo(27, 9, 8, 11.5); c.lineTo(-26, 10); c.quadraticCurveTo(-28, 0, -26, -10); c.closePath(); };
  body(); c.fillStyle = col.main; c.fill(); c.save(); c.clip();
  c.fillStyle = col.dark; c.fillRect(-30, 5, 60, 10); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-30, -11, 60, 4);
  c.fillStyle = col.trim; c.fillRect(11, -2.2, 18, 4.4); c.restore(); body(); c.stroke();
  c.fillStyle = '#fff3c4'; c.lineWidth = 1.2; for (const hy of [-7.5, 7.5]) { c.beginPath(); c.arc(23, hy, 2.3, 0, TAU); c.fill(); c.stroke(); }
  c.fillStyle = '#3a322c'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(-14, -8.5, 20, 17, 4); c.fill(); c.stroke();          // cockpit
  c.strokeStyle = '#1b1715'; c.lineWidth = 2; c.beginPath(); c.arc(5, 0, 4.2, -1.2, 1.2); c.stroke();                         // steering wheel
  c.strokeStyle = INK; c.lineWidth = 1.4;
  c.fillStyle = '#fbfaf4'; c.beginPath(); c.ellipse(-5, 0, 5, 7.6, 0, 0, TAU); c.fill(); c.stroke();                          // Abood's shoulders in the white kandura
  c.fillStyle = '#c98b5a'; c.beginPath(); c.arc(2.5, -4.5, 1.8, 0, TAU); c.arc(2.5, 4.5, 1.8, 0, TAU); c.fill();             // hands on the wheel
  c.fillStyle = SHEMAGH; c.beginPath(); c.moveTo(-3, -5.6); c.quadraticCurveTo(-16 + flagX * 0.25, -4 + flagY * 0.3, -17 + flagX * 0.4, flagY * 0.5); c.quadraticCurveTo(-12, 4, -3, 5.6); c.closePath(); c.fill(); c.stroke(); // shemagh tail, blowing back
  c.beginPath(); c.arc(-3.5, 0, 6.2, 0, TAU); c.fill(); c.stroke();                                                          // his head in the red shemagh
  c.strokeStyle = '#121212'; c.lineWidth = 2; c.beginPath(); c.arc(-3.5, 0, 4.1, 0, TAU); c.stroke();                          // the agal
  c.strokeStyle = '#2a2623'; c.lineWidth = 2.4; c.beginPath(); c.roundRect(-16, -10.5, 24, 21, 5); c.stroke();                // roll cage
  c.fillStyle = '#b3261e'; c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.roundRect(-25, -4.5, 7, 9, 2); c.fill(); c.stroke(); // spare jerrycan
  c.restore();
  // the whip flag every dune buggy carries, leaning back with the speed
  c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-22, 8); c.lineTo(-22 + flagX, 8 + flagY); c.stroke();
  c.fillStyle = '#f28c28'; c.beginPath(); c.moveTo(-22 + flagX, 8 + flagY); c.lineTo(-22 + flagX * 1.45 - 3, 5 + flagY * 1.3); c.lineTo(-22 + flagX * 1.45 + 3, 11 + flagY * 1.3); c.closePath(); c.fill(); c.stroke();
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
function aCamel(c, q) {
  const body = '#d9a868', dark = '#b98549', A = q * Math.PI / 2; ink(c);
  for (const [x, o, col] of [[-13, 0, dark], [13, Math.PI, dark], [-9, Math.PI, body], [17, 0, body]]) { c.save(); c.translate(x, -28); limb(c, Math.sin(A + o) * 0.32, 27, 4.6, col); c.restore(); }
  c.fillStyle = body; c.beginPath(); c.moveTo(-24, -30); c.quadraticCurveTo(-26, -46, -12, -47); c.quadraticCurveTo(-4, -64, 6, -47); c.quadraticCurveTo(22, -47, 24, -36); c.quadraticCurveTo(22, -24, 0, -23); c.quadraticCurveTo(-20, -23, -24, -30); c.closePath(); fs(c);
  c.beginPath(); c.moveTo(16, -42); c.quadraticCurveTo(26, -52, 28, -70); c.lineTo(36, -70); c.quadraticCurveTo(34, -48, 24, -32); c.closePath(); fs(c);
  c.beginPath(); c.ellipse(36, -72, 9.5, 5.6, 0.25, 0, TAU); fs(c); c.beginPath(); c.moveTo(28, -76); c.lineTo(26, -82); c.lineTo(31, -77); c.closePath(); fs(c);
  c.fillStyle = INK; c.beginPath(); c.arc(37, -74, 1.3, 0, TAU); c.fill(); c.beginPath(); c.moveTo(40, -69.5); c.lineTo(44.5, -68.5); c.stroke();
  c.fillStyle = SHEMAGH; c.beginPath(); c.moveTo(-12, -47); c.quadraticCurveTo(-4, -62, 5, -47); c.lineTo(8, -36); c.lineTo(-15, -36); c.closePath(); fs(c);
  c.strokeStyle = '#fffaf0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, -40); c.lineTo(7, -40); c.stroke(); ink(c);
  c.beginPath(); c.moveTo(-24, -34); c.quadraticCurveTo(-31, -30, -29, -20); c.stroke();
}
function aOryx(c, q) {
  const A = q * Math.PI / 2; ink(c);
  for (const [x, o] of [[-11, 0], [11, Math.PI], [-7, Math.PI], [15, 0]]) { c.save(); c.translate(x, -22); limb(c, Math.sin(A + o) * 0.3, 21, 3.6, '#4a2d18'); c.restore(); }
  c.fillStyle = '#f7f3ea'; c.beginPath(); c.ellipse(1, -27, 21, 10.5, 0, 0, TAU); fs(c);
  c.fillStyle = 'rgba(120,90,60,.2)'; c.beginPath(); c.ellipse(1, -21, 18, 4, 0, 0, TAU); c.fill();
  c.fillStyle = '#f7f3ea'; c.beginPath(); c.moveTo(15, -32); c.lineTo(22, -44); c.lineTo(30, -44); c.lineTo(24, -26); c.closePath(); fs(c);
  c.beginPath(); c.ellipse(28, -44, 8, 5, 0.3, 0, TAU); fs(c);
  c.fillStyle = '#3a2416'; c.beginPath(); c.ellipse(30, -43.5, 4, 2.4, 0.3, 0, TAU); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(26, -46, 1.1, 0, TAU); c.fill();
  c.strokeStyle = '#3a2416'; c.lineWidth = 2; c.beginPath(); c.moveTo(24, -48); c.lineTo(8, -82); c.moveTo(27, -48.5); c.lineTo(14, -84); c.stroke();
  ink(c); c.beginPath(); c.moveTo(-20, -28); c.quadraticCurveTo(-26, -22, -24, -14); c.stroke();
}
function aGhaf(c) { // the ghaf, the UAE's desert tree
  ink(c); c.fillStyle = '#7a5433'; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(-2, -20, -12, -38); c.lineTo(-4, -40); c.quadraticCurveTo(2, -30, 3, -22); c.quadraticCurveTo(8, -32, 16, -38); c.lineTo(20, -33); c.quadraticCurveTo(8, -20, 7, 0); c.closePath(); fs(c);
  c.fillStyle = '#5f9a55'; c.beginPath(); c.moveTo(-44, -40); c.quadraticCurveTo(-48, -62, -22, -64); c.quadraticCurveTo(-8, -78, 12, -66); c.quadraticCurveTo(40, -68, 44, -46); c.quadraticCurveTo(46, -34, 26, -36); c.quadraticCurveTo(4, -28, -16, -36); c.quadraticCurveTo(-40, -30, -44, -40); c.closePath(); fs(c);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-8, -58, 20, 6, -0.1, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,40,0,.16)'; c.beginPath(); c.ellipse(8, -40, 26, 5, 0, 0, TAU); c.fill();
}
function aPerch(c) {
  ink(c); c.fillStyle = '#7a5433'; c.beginPath(); c.roundRect(-3, -40, 6, 40, 2); fs(c); c.fillStyle = '#1f7a74'; c.beginPath(); c.roundRect(-12, -47, 24, 8, 4); fs(c);
  c.fillStyle = '#8a6a4a'; c.beginPath(); c.moveTo(-6, -47); c.quadraticCurveTo(-10, -66, 0, -72); c.quadraticCurveTo(9, -66, 6, -47); c.closePath(); fs(c);
  c.fillStyle = '#f3e3c2'; c.beginPath(); c.ellipse(1, -57, 4, 8, 0, 0, TAU); c.fill(); c.fillStyle = '#5a3d25'; for (const y of [-62, -57, -52]) { c.beginPath(); c.arc(1, y, 1, 0, TAU); c.fill(); }
  c.fillStyle = '#8a6a4a'; c.beginPath(); c.arc(1, -74, 6, 0, TAU); fs(c); c.fillStyle = SHEMAGH; c.beginPath(); c.arc(1, -76, 6, Math.PI, 0); c.closePath(); fs(c); // the falcon's hood
  c.fillStyle = '#e0a72a'; c.beginPath(); c.moveTo(6, -74); c.lineTo(11, -72); c.lineTo(6, -70); c.closePath(); fs(c);
  c.strokeStyle = '#e0a72a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-1, -82); c.lineTo(0, -86); c.lineTo(2, -82); c.stroke();
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
  ghaf: [aGhaf, [-52, -82, 104, 86], 10], perch: [aPerch, [-16, -90, 34, 94], 9], well: [aWell, [-34, -64, 68, 76], 28], stall: [aStall, [-74, -76, 148, 80], 58],
  gate: [aGate, [-86, -116, 172, 120], 0], summit: [aSummit, [-6, -82, 50, 86], 5], sign: [aSign, [-22, -48, 48, 52], 5], trough: [aTrough, [-34, -24, 68, 28], 26],
  basket: [aBasket, [-18, -28, 36, 32], 12], shrub: [aShrub, [-18, -24, 36, 28], 0], post: [aPost, [-6, -34, 28, 38], 0], flag: [aFlag, [-6, -96, 48, 100], 4],
  baba: [c => person(c, 0, 0, 0.6, BABA), [-58, -102, 96, 108], 13], date: [aDate, [-9, -12, 18, 24], 0], can: [aCan, [-12, -30, 24, 34], 0],
  camel: [aCamel, [-36, -88, 88, 94], 22], oryx: [aOryx, [-30, -90, 72, 96], 18],
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
  const herd = (kind, id, n, spread) => { const s = site(id); for (let k = 0; k < n; k++) { const a = k / n * TAU + 0.6, x = s.x + Math.cos(a) * spread, y = s.y + Math.sin(a) * spread * 0.7;
    ANIMALS.push({ kind, x, y, hx: s.x, hy: s.y, tx: x, ty: y, ph: k, dir: k % 2 ? 1 : -1, wait: 1 + k, run: 0, rx: 0, ry: 0, rad: KIND[kind][2] }); } };
  herd('camel', 'camels', 5, 120); herd('oryx', 'oryx', 3, 95);
})();

// ---------- state ----------
let st = 'load', t = 0, W = 0, Hh = 0, zoom = 1, dpr = 1, rs = 1, camx = 0, camy = 0, shake = 0, noteT = 0, slow = 0, hudKey = '', miniTick = 0, edgeT = 0, hitT = 0;
const car = {}, run = { dist: 0, dates: 0, air: 0, rolls: 0, cards: [], fuel: 100, max: 100, over: 0, low: false };
const parts = [], floats = [], tracks = [[], []], keys = {}, joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
const ACC = 350, BRAKE = 520, DRAG = 0.75, RR = 26, GR = 700, GRIP = 3.4, TURN = 2.7, GRAV = 520, BURN = 100 / 110, JOY_R = 56, TIP = 0.4;
function resetCar() {
  Object.assign(car, { x: 70, y: 120, ang: -0.28, vx: 0, vy: 0, z: H(70, 120), vz: 0, gvz: 0, air: false, airT: 0, steer: 0, thr: 0, tip: 0, roll: 0, rollT: 0, rdx: 0, rdy: 0, safe: 0, sf: 0, trk: 0 });
  tracks[0].length = tracks[1].length = 0; parts.length = floats.length = 0;
}
const cv = $('cv'), ctx = cv.getContext('2d', { alpha: false });
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2) * rs; // phones start at a lower render resolution
  const w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
  if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; }
  W = w; Hh = h; zoom = Math.sqrt(W * Hh / (920 * 540)); // every screen shape sees about the same amount of desert
}
function note(text, cls, secs = 2.4) { const n = $('note'); n.textContent = text; n.className = cls || ''; n.hidden = false; noteT = secs; }
function float(x, y, txt, col) { floats.push({ x, y, txt, col: col || '#fffaf0', life: 1.3 }); if (floats.length > 12) floats.shift(); }
function puff(x, y, vx, vy, n, big) { for (let i = 0; i < n && parts.length < 110; i++) parts.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: vx + (Math.random() - 0.5) * 70, vy: vy + (Math.random() - 0.5) * 70, life: 0.5 + Math.random() * 0.4, r: (big ? 7 : 4) + Math.random() * 4 }); }

// ---------- driving ----------
function startRoll(gx, gy) {
  const m = Math.hypot(gx, gy) || 1; car.roll = 1; car.rollT = 0; car.rdx = -gx / m; car.rdy = -gy / m; car.air = false; car.tip = 0;
  run.rolls++; run.fuel -= 4; shake = 12; buzz(120); play('smash'); puff(car.x, car.y, 0, 0, 14, true);
  float(car.x, car.y - 40, T('rolled'), '#ffd9d0'); note(pick(T('baba')), 'baba', 2.6);
}
function update(dt) {
  let thr = 0, steer = 0;
  if (joy.id >= 0) { // touch: drag the way you want to go
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy);
    if (m > 8) { const d = wrap(Math.atan2(dy, dx) - car.ang); steer = clamp(d * 2.4, -1, 1); thr = clamp(m / JOY_R, 0.25, 1) * (Math.abs(d) > 2 ? 0.55 : 1); }
  } else { thr = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0); steer = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0); }
  if (run.fuel <= 0) thr = 0;
  car.steer += (steer - car.steer) * Math.min(1, dt * 9); car.thr = thr; car.safe -= dt;
  car.x += car.vx * dt; car.y += car.vy * dt;
  const e = 3, h0 = H(car.x, car.y), gx = (H(car.x + e, car.y) - H(car.x - e, car.y)) / (2 * e), gy = (H(car.x, car.y + e) - H(car.x, car.y - e)) / (2 * e);
  let sp = Math.hypot(car.vx, car.vy); run.dist += sp * dt;
  if (car.roll) { // tumbling down the slope: no control until the buggy lands back on its wheels
    car.rollT += dt; const k = car.rollT / 1.15, f = Math.min(1, dt * 5), v = 200 * (1 - k * 0.8);
    car.vx += (car.rdx * v - car.vx) * f; car.vy += (car.rdy * v - car.vy) * f; car.z = h0;
    if (Math.random() < dt * 30) puff(car.x, car.y, 0, 0, 1, true);
    if (k >= 1) { car.roll = 0; car.safe = 1.6; car.vx *= 0.4; car.vy *= 0.4; car.gvz = 0; }
  } else if (car.air) {
    car.vz -= GRAV * dt; car.z += car.vz * dt; car.airT += dt; car.ang += car.steer * 0.9 * dt;
    if (car.z <= h0) { // landing
      const cs = Math.cos(car.ang), sn = Math.sin(car.ang), l = -car.vx * sn + car.vy * cs, sl = -gx * sn + gy * cs;
      car.air = false; car.z = h0; car.gvz = gx * car.vx + gy * car.vy;
      if (car.airT > 0.32) {
        const s = car.airT.toFixed(1); run.air += car.airT; shake = Math.min(9, 3 + car.airT * 5); play('hit', 0.8, 0.6); puff(car.x, car.y, car.vx * 0.2, car.vy * 0.2, 8, true); buzz(30);
        float(car.x, car.y - 46, car.airT > 0.9 ? T('bigJump', s) : T('jump', s), '#fff3c4'); if (car.airT > 0.9) note(pick(T('wow')), '', 1.4);
        if (car.safe <= 0 && ((Math.abs(l) > 0.5 * sp && sp > 150) || Math.abs(sl) > 0.44)) startRoll(gx, gy);
      }
    }
  } else {
    let cs = Math.cos(car.ang), sn = Math.sin(car.ang);
    car.ang += car.steer * TURN * clamp((car.vx * cs + car.vy * sn) / 150, -1, 1) * dt; cs = Math.cos(car.ang); sn = Math.sin(car.ang);
    let f = car.vx * cs + car.vy * sn, l = -car.vx * sn + car.vy * cs; const sf = gx * cs + gy * sn, sl = -gx * sn + gy * cs; car.sf = sf;
    const push = thr > 0 ? thr * ACC : thr < 0 ? (f > 20 ? -BRAKE : thr * ACC * 0.5) : 0;
    f += (push - GR * sf - DRAG * f) * dt; f -= clamp(f, -RR * dt, RR * dt);   // engine, gravity along the slope, drag, soft-sand resistance
    l += -GR * sl * dt; l *= Math.exp(-GRIP * dt);                              // the slope pulls sideways; the tyres only half hold in sand
    car.vx = cs * f - sn * l; car.vy = sn * f + cs * l; sp = Math.hypot(car.vx, car.vy);
    const gvz = gx * car.vx + gy * car.vy;
    if ((car.gvz - gvz) / dt > GRAV * 0.75 && sp > 120) { car.air = true; car.vz = car.gvz; car.airT = 0; car.z = h0; play('whoosh', 1, 0.7); } // the ground drops away faster than gravity: take off
    else car.z = h0;
    car.gvz = gvz;
    if (car.safe <= 0 && Math.abs(sl) > TIP && sp > 60) { car.tip += (Math.abs(sl) - TIP) * 5 * dt * (0.6 + sp / 400); if (car.tip >= 1) startRoll(gx, gy); }
    else car.tip = Math.max(0, car.tip - dt * 1.5);
    if (!car.roll && !car.air) {
      if ((thr > 0.3 && sp > 50) || Math.abs(l) > 55) { if (Math.random() < dt * (14 + sp * 0.06)) puff(car.x - cs * 20, car.y - sn * 20, -car.vx * 0.25, -car.vy * 0.25, 1); }
      car.trk += sp * dt; if (car.trk > 13) { car.trk = 0; for (const s of [0, 1]) { const w = s ? 15 : -15, a = tracks[s]; a.push(car.x - cs * 17 - sn * w, car.y - sn * 17 + cs * w); if (a.length > 520) a.splice(0, 2); } }
    }
  }
  if ((car.air || car.roll) && tracks[0].length && !isNaN(tracks[0][tracks[0].length - 1])) { tracks[0].push(NaN, NaN); tracks[1].push(NaN, NaN); } // break the tyre marks
  // the rim of the reserve turns the buggy back
  const d = Math.hypot(car.x, car.y);
  if (d > R - 30) { const k = (d - (R - 30)) * 5 * dt; car.vx -= car.x / d * k * 60; car.vy -= car.y / d * k * 60; if (d > R + 60) { car.x *= (R + 60) / d; car.y *= (R + 60) / d; } if (edgeT <= 0) { note(T('edge'), '', 2); edgeT = 4; } }
  edgeT -= dt; hitT -= dt;
  // solid things: bump and slow down
  const bump = (o, oy) => { const dx = car.x - o.x, dy = car.y - (o.y - oy), rr = o.rad + 17, d2 = dx * dx + dy * dy; if (d2 >= rr * rr || car.air) return false;
    const dd = Math.sqrt(d2) || 1, nx = dx / dd, ny = dy / dd, vn2 = car.vx * nx + car.vy * ny; car.x += nx * (rr - dd); car.y += ny * (rr - dd);
    if (vn2 < 0) { car.vx -= nx * vn2 * 1.3; car.vy -= ny * vn2 * 1.3; if (vn2 < -90 && hitT <= 0) { play('hit'); shake = 6; hitT = 0.4; buzz(40); } } return true; };
  for (const p of PROPS) if (p.rad && Math.abs(p.x - car.x) < 140 && Math.abs(p.y - car.y) < 140) bump(p, p.rad * 0.35);
  for (const a of ANIMALS) { // animals wander near home and trot away from a fast buggy
    const dx = a.x - car.x, dy = a.y - car.y, dc = Math.hypot(dx, dy);
    if (dc < 105 && sp > 110 && a.run <= 0) { a.run = 1.5; a.rx = dx / (dc || 1); a.ry = dy / (dc || 1); }
    let mx = 0, my = 0;
    if (a.run > 0) { a.run -= dt; mx = a.rx * 90; my = a.ry * 90; }
    else if (a.wait > 0) a.wait -= dt;
    else { const tx = a.tx - a.x, ty = a.ty - a.y, m = Math.hypot(tx, ty); if (m < 6) { a.wait = 1 + Math.random() * 4; const an = Math.random() * TAU, rr = 40 + Math.random() * 110; a.tx = a.hx + Math.cos(an) * rr; a.ty = a.hy + Math.sin(an) * rr * 0.7; } else { mx = tx / m * 20; my = ty / m * 20; } }
    if (mx || my) { a.x += mx * dt; a.y += my * dt; a.ph += dt * (a.run > 0 ? 12 : 4.5); if (Math.abs(mx) > 2) a.dir = mx > 0 ? 1 : -1; }
    if (dc < 60) bump(a, 8);
  }
  // pick-ups
  for (const o of DATES) if (!o.off) { const dx = o.x - car.x, dy = o.y - car.y; if (dx * dx + dy * dy < 1150) { o.off = true; run.dates++; play('date', 1 + (run.dates % 8) * 0.06); } }
  for (const o of CANS) if (!o.off) { const dx = o.x - car.x, dy = o.y - car.y; if (dx * dx + dy * dy < 1500) { o.off = true; run.fuel = Math.min(run.max, run.fuel + 26); run.low = false; play('power'); float(o.x, o.y - 30, T('canPlus'), '#bff0c0'); } }
  for (const s of SITES) if (!run.seen[s.id]) { const dx = s.x - car.x, dy = s.y - car.y, rr = s.hill ? 130 : s.r + 50;
    if (dx * dx + dy * dy < rr * rr) { run.seen[s.id] = 1; if (!save.cards.includes(s.id)) { save.cards.push(s.id); save.coins += s.coins; run.cards.push(s.id); persist(); coinsUI(); play('zone'); note(T('found', T('s_' + s.id), s.coins), 'card', 3.2); } } }
  // fuel
  run.fuel -= dt * (0.25 + 0.75 * Math.abs(thr)) * BURN;
  if (!run.low && run.fuel < run.max * 0.2 && run.fuel > 0) { run.low = true; note(T('fuelLow'), '', 3); }
  if (run.fuel <= 0) { run.fuel = 0; if (sp < 30 && !car.air && !car.roll) { run.over += dt; if (run.over > 0.9) endRun(false); } }
  // camera looks a little ahead of the buggy
  const k = Math.min(1, dt * 4); camx += (car.x + car.vx * 0.3 - camx) * k; camy += (car.y + car.vy * 0.3 - camy) * k;
  engine(sp, thr);
}

// ---------- drawing a frame ----------
const draws = [];
function drawCar(c) {
  const alt = Math.max(0, car.z - H(car.x, car.y)), col = COLORS[save.color] || COLORS.red, cs = Math.cos(car.ang), sn = Math.sin(car.ang);
  const f = car.vx * cs + car.vy * sn, l = -car.vx * sn + car.vy * cs;
  c.save(); c.translate(car.x + 5 + alt * 0.35, car.y + 6 + alt * 0.45); c.rotate(car.ang); const ss = 1 - Math.min(0.4, alt / 400);
  c.scale(ss, ss); c.fillStyle = 'rgba(60,30,15,' + (0.28 - Math.min(0.14, alt / 900)) + ')'; c.beginPath(); c.roundRect(-27, -16, 54, 32, 10); c.fill(); c.restore();
  c.save(); c.translate(car.x, car.y - alt * 0.6); c.rotate(car.ang); const sc = 1 + alt / 260; c.scale(sc * (1 - Math.min(0.18, Math.abs(car.sf) * 0.28)), sc);
  const roll = car.roll ? car.rollT / 1.15 * TAU * 2 : car.tip * 0.7 * Math.sin(t * 22);
  drawBuggy(c, col, car.steer, roll, clamp(-f * 0.03, -13, 6) + Math.sin(t * 9) * 1.2, clamp(-l * 0.05, -8, 8)); c.restore();
  if (car.tip > 0.35 && !car.roll) { c.fillStyle = SHEMAGH; c.strokeStyle = '#fffaf0'; c.lineWidth = 3; c.font = '800 26px "Baloo Bhaijaan 2", sans-serif'; c.textAlign = 'center'; c.strokeText('!', car.x, car.y - 34); c.fillText('!', car.x, car.y - 34); }
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
  c.strokeStyle = 'rgba(110,62,34,.3)'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); // tyre marks
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
  if (st === 'play' || st === 'pause') { g.save(); g.translate(px(car.x), px(car.y)); g.rotate(car.ang); g.fillStyle = SHEMAGH; g.strokeStyle = '#fffaf0'; g.lineWidth = 1.6 * u;
    g.beginPath(); g.moveTo(9 * u, 0); g.lineTo(-6 * u, -6 * u); g.lineTo(-3 * u, 0); g.lineTo(-6 * u, 6 * u); g.closePath(); g.fill(); g.stroke(); g.restore(); }
}
function hud() {
  const m = Math.round(run.dist / 8), f = Math.round(run.fuel / run.max * 100), key = m + '|' + f + '|' + run.dates; if (key === hudKey) return; hudKey = key; // only touch the page when a value changes
  $('mDist').textContent = nf(m); $('mDates').textContent = nf(run.dates);
  $('fuelFill').style.transform = `scaleX(${f / 100})`; $('bar').classList.toggle('danger', f < 20);
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
function coinsUI() { document.querySelectorAll('.coinVal').forEach(e => { e.textContent = nf(save.coins); }); }
const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>', ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM17 9.5l5 5M22 9.5l-5 5"/></svg>';
function muteUI() { $('menuMute').innerHTML = save.muted ? ICON_OFF : ICON_ON; $('menuMute').setAttribute('aria-pressed', save.muted); $('mute').textContent = save.muted ? '×' : '♪'; if (master) master.gain.value = save.muted ? 0 : 1; }
function toggleMute() { save.muted = !save.muted; persist(); unlockAudio(); muteUI(); }
function showMenu() {
  st = 'menu'; resetCar(); for (const o of DATES) o.off = false; for (const o of CANS) o.off = false;
  ['hud', 'miniBtn', 'pauseBtn', 'mute', 'over', 'pausePop', 'sheet'].forEach(id => show(id, false)); show('menu', true); coinsUI();
  const b = $('menuBest'); b.hidden = !save.best; b.textContent = T('best', save.best); releaseWake();
}
function startRun() {
  unlockAudio(); st = 'play'; resetCar(); for (const o of DATES) o.off = false; for (const o of CANS) o.off = false;
  Object.assign(run, { dist: 0, dates: 0, air: 0, rolls: 0, cards: [], max: 100 + save.tank * TANK_STEP, over: 0, low: false, seen: {}, newBest: false }); run.fuel = run.max;
  camx = car.x; camy = car.y; hudKey = ''; joy.id = -1; for (const k in keys) keys[k] = 0;
  ['menu', 'over', 'pausePop', 'sheet'].forEach(id => show(id, false)); ['hud', 'miniBtn', 'pauseBtn', 'mute'].forEach(id => show(id, true));
  save.runs++; persist(); drawMap($('mini')); wake();
}
function pause() { if (st !== 'play') return; st = 'pause'; joy.id = -1; show('pausePop', true); releaseWake(); }
function resume() { if (st !== 'pause') return; st = 'play'; show('pausePop', false); show('sheet', false); last = performance.now(); wake(); }
async function endRun(early) {
  if (st !== 'play' && st !== 'pause') return;
  st = 'over'; joy.id = -1; play('lose'); releaseWake(); ['hud', 'miniBtn', 'pauseBtn', 'pausePop', 'sheet'].forEach(id => show(id, false)); $('note').hidden = true;
  const m = Math.round(run.dist / 8), air = Math.round(run.air * 10) / 10, cS = Math.floor(run.dates / 10), cD = Math.floor(m / 250), cA = Math.floor(run.air), total = cS + cD + cA;
  run.newBest = m > save.best; if (run.newBest) save.best = m; save.coins += total; persist();
  // ads hook, the same one the other Abood games offer: the results card waits for it, for 15 seconds at most
  try { if (typeof window.aboodAfterRun === 'function') await Promise.race([window.aboodAfterRun({ distance: m, dates: run.dates }), new Promise(r => setTimeout(r, 15000))]); } catch (e) {}
  $('overQuote').textContent = pick(T('overQuote')); $('overTitle').textContent = run.newBest ? T('newBest') : T(early ? 'overTitleEnd' : 'overTitle'); $('overMsg').textContent = T('overMsg', m, run.dates);
  $('sDist').textContent = nf(m); $('sAir').textContent = air.toFixed(1); $('sBest').textContent = nf(save.best);
  $('swDates').textContent = nf(run.dates); $('swCoins').textContent = '+' + nf(total);
  $('swPartS').textContent = T('partS', run.dates, cS); $('swPartD').textContent = T('partD', m, cD); $('swPartA').textContent = T('partA', air.toFixed(1), cA);
  const oc = $('overCards'); oc.hidden = !run.cards.length; oc.textContent = T('overCards', run.cards.map(id => T('s_' + id)).join(getLang() === 'ar' ? '، ' : ', '));
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
  sheetId = id; const body = $('sheetBody'); body.innerHTML = ''; $('sheetTitle').textContent = T({ cards: 'cardsTitle', garage: 'garageTitle', map: 'mapTitle', help: 'helpTitle' }[id]);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  if (id === 'cards') {
    body.append(el('p', 'label', T('cardsNote', save.cards.length, SITES.length))); const grid = el('div', 'cards');
    for (const s of SITES) { const on = save.cards.includes(s.id), card = el('div', 'card' + (on ? '' : ' locked')), cn = mk(192, 192); siteIcon(cn, s.id); card.append(cn, el('b', '', on ? T('s_' + s.id) : T('unknown')), el('small', '', `+${s.coins}`)); grid.append(card); }
    body.append(grid);
  } else if (id === 'garage') {
    body.append(el('p', 'label', T('garageNote'))); const grid = el('div', 'cards');
    for (const [cid, col] of Object.entries(COLORS)) {
      const own = save.colors.includes(cid), on = save.color === cid, card = el('div', 'card' + (on ? ' on' : '')), cn = mk(192, 192), g = cn.getContext('2d');
      g.fillStyle = '#e9b872'; g.fillRect(0, 0, 192, 192); g.setTransform(2.9, 0, 0, 2.9, 96, 100); g.rotate(-0.5); drawBuggy(g, col, 0.3, 0, -8, 2);
      const btn = el('button', on || own ? 'sec' : '', on ? T('using') : own ? T('use') : T('buy', col.cost)); btn.type = 'button'; btn.disabled = on;
      btn.onclick = () => { if (!own) { if (save.coins < col.cost) return note(T('notEnough')); save.coins -= col.cost; save.colors.push(cid); note(T('bought')); play('power'); } save.color = cid; persist(); coinsUI(); openSheet('garage'); };
      card.append(cn, el('b', '', T('c_' + cid)), el('small', '', col.cost ? nf(col.cost) : T('free')), btn); grid.append(card);
    }
    const card = el('div', 'card'), cn = mk(192, 192), g = cn.getContext('2d'); g.fillStyle = '#e9b872'; g.fillRect(0, 0, 192, 192); g.setTransform(5, 0, 0, 5, 96, 168); aCan(g);
    const maxed = save.tank >= 3, btn = el('button', '', maxed ? T('tankMax') : T('buy', TANK_COST[save.tank])); btn.type = 'button'; btn.disabled = maxed;
    btn.onclick = () => { const cost = TANK_COST[save.tank]; if (save.coins < cost) return note(T('notEnough')); save.coins -= cost; save.tank++; persist(); coinsUI(); note(T('bought')); play('power'); openSheet('garage'); };
    card.append(cn, el('b', '', T('tank')), el('small', '', T('tankD', save.tank)), btn); grid.append(card); body.append(grid);
  } else if (id === 'map') {
    const wrap2 = el('div', 'map-wrap'), cn = mk(600, 600), ul = el('ul', 'legend'); drawMap(cn, true);
    SITES.forEach((s, i) => { const on = save.cards.includes(s.id), li = el('li', on ? '' : 'off'); li.append(el('i', '', String(i + 1)), el('span', '', on ? T('s_' + s.id) : T('unknown'))); ul.append(li); });
    const side = el('div', 'menu-text'); side.append(el('p', 'label', T('mapNote')), ul); wrap2.append(cn, side); body.append(wrap2);
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
  if (e.code === 'Enter' && $('sheet').hidden && $('langPick').hidden) { if (st === 'menu' || st === 'over') startRun(); else if (st === 'pause') resume(); }
});
addEventListener('keyup', e => { keys[e.code] = 0; });
cv.addEventListener('pointerdown', e => { if (st !== 'play' || joy.id >= 0) return; unlockAudio(); joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
cv.addEventListener('pointermove', e => { if (e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const joyEnd = e => { if (e.pointerId === joy.id) joy.id = -1; };
cv.addEventListener('pointerup', joyEnd); cv.addEventListener('pointercancel', joyEnd);
cv.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
$('startBtn').onclick = startRun; $('againBtn').onclick = startRun; $('overMenuBtn').onclick = showMenu;
$('pauseBtn').onclick = pause; $('resumeBtn').onclick = resume; $('pauseMenuBtn').onclick = () => endRun(true);
$('mute').onclick = toggleMute; $('menuMute').onclick = toggleMute; $('sheetClose').onclick = closeSheet;
$('miniBtn').onclick = () => { if (st === 'play') { st = 'pause'; joy.id = -1; releaseWake(); openSheet('map'); } };
document.querySelectorAll('[data-sheet]').forEach(b => { b.onclick = () => { unlockAudio(); openSheet(b.dataset.sheet); }; });
document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); const p = e.target.closest('[data-pick]'); if (p) { setLang(p.dataset.pick); show('langPick', false); unlockAudio(); } });
const fsEl = document.documentElement;
if (fsEl.requestFullscreen && !/iPhone|iPad/.test(navigator.userAgent)) { show('fsBtn', true); $('fsBtn').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else fsEl.requestFullscreen().catch(() => {}); }; }
onLang(() => { SPR.delete('gate'); coinsUI(); const b = $('menuBest'); b.textContent = T('best', save.best); if (sheetId && !$('sheet').hidden) openSheet(sheetId); });
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
  for (const k of Object.keys(KIND)) { if (k === 'camel' || k === 'oryx') for (let q = 0; q < 4; q++) spr(k, q); else spr(k); } // bake every sprite once
  prog(1); $('ldMsg').textContent = T('ready'); await nextFrame();
  showMenu(); $('loader').classList.add('done'); setTimeout(() => { $('loader').hidden = true; }, 500);
  if (!hasStoredLang()) show('langPick', true);
  if (/iPhone|iPad/.test(navigator.userAgent) && !navigator.standalone) show('iosHint', true);
  // offline cache, and a note when a new version has been installed
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const had = !!navigator.serviceWorker.controller; navigator.serviceWorker.register('./sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) show('toast', true); }); $('toastBtn').onclick = () => location.reload();
  }
})();
