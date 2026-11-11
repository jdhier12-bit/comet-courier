// Season Shift v5.0 — SEASON_SHIFT_V5_0
// An original 3D endless runner for Joseph. A giant panda, Bloom & Aurora.
// Path corners / T-junctions, tilt to steer, swipe to turn, Bloom/Aurora theme.
import * as THREE from './lib/three.module.min.js';
import { GLTFLoader } from './lib/GLTFLoader.js';

const VERSION = 'SEASON_SHIFT_V5_0';
const SAVE_KEY = 'cometCourierSave';
const BEST_KEY = 'cometCourierBest';

// Character model is isolated so it can be swapped after Joseph approves a new one.
// Do not ship pip-v4.glb, pip-v5.glb, or pip-red-panda.glb to Pages or the iOS zip.
const CHARACTER_MODEL = './assets/models/panda.glb';
const CHARACTER_HEIGHT = 1.0;
const HURDLE_MODELS = [
  './assets/models/hurdle-spring.glb',
  './assets/models/hurdle-summer.glb',
  './assets/models/hurdle-autumn.glb',
  './assets/models/hurdle-winter.glb'
];
const HURDLE_REF_WIDTH = 5.5;

const BLOOM = 0, AURORA = 1;
const PHASE_NAME = ['BLOOM', 'AURORA'];
const PHASE_COL = [0xff8fb3, 0x7cffcf];
const PHASE_COL_B = [0xe85a8c, 0x7b4dff];
const LANE_W = 1.1; // invisible tracks for coins / partial obstacles at ±1.1 and 0
function laneX(lane) { return -lane * LANE_W; } // +lane is screen-right, negative path-x
const SPAWN_AHEAD = 72;
const WARMUP = 22;
const MAX_DT = 0.05;
const PATH_W = 4.2;
const TILT_DEADZONE = 3;      // degrees from the calibrated neutral
const TILT_FULL = 24;         // degrees for max lateral speed
const STEER_MAX_SPEED = 8.0;  // path units / sec at full tilt or held arrow
const STEER_RESP = 12;        // velocity follow rate (1/s)
const STEER_EDGE = PATH_W * 0.5 - 0.38; // 1.72, body stays on the dirt
const HURDLE_W_ALL = 3.85;
const HURDLE_W_WIDE = 2.20;
const HURDLE_W_LANE = 1.05;
const GATE_ALL_HALF = PATH_W * 0.5 - 0.10; // 2.00
const STEER_WHOOSH_VX = 6.2;
const STEER_WHOOSH_CD = 0.45;
const TILT_TURN_OFF = 8; // leftover hysteresis for the tilt filter only
const CORNER_SAFE_SEC = 1.75; // no obstacles/gates for this many seconds after a corner
const COIN_SCALE = 0.63;       // visual size vs. the original 0.26-radius coins
const COIN_R = 0.26 * COIN_SCALE;
const COIN_THICK = 0.07 * COIN_SCALE;
const COIN_RIM = 0.04 * COIN_SCALE;
const COIN_GAP = 2;            // constant path-distance spacing, same lane and across lines
const COIN_Y = 0.46;
const CAM_TURN_DUR = 0.26;     // camera yaw eases around a sharp 90° gameplay snap
const TURN_POSE_DUR = 0.36;    // readable TurnL/TurnR window
const HURDLE_CLEAR = 0.52;     // jumpY must reach this to clear a hurdle (peak jump is ~1.54)
const HURDLE_H = 0.55;

const SEASONS = [
  { id: 'spring', name: 'SPRING', tag: 'Blossom Trails',
    music: 'assets/music/spring.mp3',
    skyZenith: 0x5eb6ff, skyHorizon: 0xffe3bf, fog: 0xdceec8,
    ground: 0x5fb85a, groundDark: 0x3e9348, path: 0xc9a067, pathDark: 0xa47c45,
    accent: 0xff8fb3, light: 0xfff3d8, sun: 0xffe29a, sunDir: [0.35, 0.85, 0.25],
    particle: 'petal' },
  { id: 'summer', name: 'SUMMER', tag: 'Shoreline Dash',
    music: 'assets/music/summer.mp3',
    skyZenith: 0x3aa6ff, skyHorizon: 0xffdca0, fog: 0xc5e7ff,
    ground: 0xe8c97a, groundDark: 0xd0a75a, path: 0xd7b36a, pathDark: 0xb8944e,
    accent: 0xffd15c, light: 0xfff6e0, sun: 0xffefb0, sunDir: [0.45, 0.9, 0.15],
    particle: 'spark', ocean: 0x2b9ec8, oceanDeep: 0x1a6f96 },
  { id: 'autumn', name: 'AUTUMN', tag: 'Amber Woods',
    music: 'assets/music/autumn.mp3',
    skyZenith: 0xef8a4a, skyHorizon: 0xffd0a4, fog: 0xebc496,
    ground: 0x8a5a32, groundDark: 0x6a3f20, path: 0x7a4e28, pathDark: 0x5a3518,
    accent: 0xff6b2a, light: 0xffe0c0, sun: 0xffb060, sunDir: [0.55, 0.7, 0.2],
    particle: 'leaf' },
  { id: 'winter', name: 'WINTER', tag: 'Frosty Lane',
    music: 'assets/music/winter.mp3',
    skyZenith: 0x7e97bb, skyHorizon: 0xe8f2ff, fog: 0xd4e2f2,
    ground: 0xeef6ff, groundDark: 0xd4e3f0, path: 0xd5e0ec, pathDark: 0xb7c6d6,
    accent: 0x9fe8ff, light: 0xf4f8ff, sun: 0xf0f6ff, sunDir: [0.2, 0.8, 0.4],
    particle: 'snow' }
];

const UPGRADES = [
  { id: 'magnet',      name: 'Coin Magnet',  blurb: 'Pulls nearby coins toward you.',  prices: [50, 120, 250, 500, 900] },
  { id: 'shield',      name: 'Trail Shield', blurb: 'Start each run with extra hit shields.', prices: [80, 180, 350, 700, 1200] },
  { id: 'doubleCoins', name: 'Double Coins', blurb: 'Coins from a run are worth more.',     prices: [100, 250, 500, 1000, 2000] },
  { id: 'headStart',   name: 'Head Start',   blurb: 'Begin each run already up to speed.',  prices: [60, 150, 300, 600, 1100] },
  { id: 'extraLife',   name: 'Extra Life',   blurb: 'Survive a hit and keep running.',      prices: [150, 400, 800, 1500, 2500] }
];

const COSTUMES = [
  { id: 'classic',    name: 'Classic',      price: 0,   hoodie: 0xff5a46, trim: 0xd44232, acc: 'none' },
  { id: 'beanie',     name: 'Beanie',       price: 180, hoodie: 0x2aa89a, trim: 0x1e7e74, acc: 'beanie' },
  { id: 'scarf',      name: 'Scarf',        price: 200, hoodie: 0xf3efe6, trim: 0xd9d0c2, acc: 'scarf' },
  { id: 'sunglasses', name: 'Sunglasses',   price: 300, hoodie: 0x2a3a66, trim: 0x1c2748, acc: 'glasses' },
  { id: 'raincoat',   name: 'Raincoat',     price: 350, hoodie: 0xffd23a, trim: 0xe0b000, acc: 'raincoat' },
  { id: 'headphones', name: 'Headphones',   price: 400, hoodie: 0x7b4dff, trim: 0x5a32d0, acc: 'phones' },
  { id: 'parka',      name: 'Winter Parka', price: 500, hoodie: 0x2f6a45, trim: 0x1e4a2e, acc: 'parka' },
  { id: 'ninja',      name: 'Ninja',        price: 800, hoodie: 0x1c1c22, trim: 0x0e0e12, acc: 'ninja' }
];

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function hexCol(n) { return '#' + (n >>> 0).toString(16).padStart(6, '0'); }
function col(n) { return new THREE.Color(n); }
function rand(a = 1, b) { return b == null ? Math.random() * a : a + Math.random() * (b - a); }
function irand(n) { return (Math.random() * n) | 0; }
function pick(arr) { return arr[irand(arr.length)]; }
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function yawVec(yaw) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const sx = Math.cos(yaw), sz = -Math.sin(yaw);
  return { fx, fz, sx, sz, yaw };
}
function angLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function pathClearance() { return PATH_W * 0.5 + 3.35; }
function distToSeg(seg, x, z) {
  const v = yawVec(seg.yaw0);
  const dx = x - seg.x0, dz = z - seg.z0;
  const along = dx * v.fx + dz * v.fz;
  const lat = dx * v.sx + dz * v.sz;
  if (seg.type === 'straight') {
    if (along < -0.8 || along > seg.length + 0.8) {
      return Math.min(Math.hypot(x - seg.x0, z - seg.z0), Math.hypot(x - (seg.x1 ?? seg.x0), z - (seg.z1 ?? seg.z0)));
    }
    return Math.abs(lat);
  }
  // Square corner / T tile centered on the junction.
  const half = PATH_W * 0.5;
  const qx = clamp(lat, -half, half);
  const qz = clamp(along, -half, half);
  return Math.hypot(lat - qx, along - qz);
}
function allPathSegs(path) {
  return path.visuals();
}
function onAnyPath(path, x, z, pad) {
  const need = pad == null ? pathClearance() : pad;
  for (const seg of allPathSegs(path)) {
    if (distToSeg(seg, x, z) < need) return true;
  }
  return false;
}

window.__VERSION = VERSION;
window.__SHOP = { UPGRADES, COSTUMES };
window.__SEASONS = SEASONS;
window.__PHASE = { BLOOM, AURORA, NAME: PHASE_NAME, COL: PHASE_COL, COL_B: PHASE_COL_B };
window.__TILT = { DEADZONE: TILT_DEADZONE, FULL: TILT_FULL, MAX_SPEED: STEER_MAX_SPEED, RESP: STEER_RESP, EDGE: STEER_EDGE };
window.__PATH = { W: PATH_W, LANE: LANE_W, EDGE: STEER_EDGE, WARMUP, CORNER_SAFE_SEC };
window.__COIN = { SCALE: COIN_SCALE, GAP: COIN_GAP, R: COIN_R, Y: COIN_Y };
window.__HURDLE = { CLEAR: HURDLE_CLEAR, H: HURDLE_H, CAM_TURN: CAM_TURN_DUR };

// ---------------- save ----------------
function defaultSave() {
  return {
    coins: 0, best: 0,
    seasonBest: [0, 0, 0, 0],
    upgrades: { magnet: 0, shield: 0, doubleCoins: 0, headStart: 0, extraLife: 0 },
    owned: { classic: true, beanie: false, scarf: false, raincoat: false, sunglasses: false, headphones: false, parka: false, ninja: false },
    equipped: 'classic',
    muted: false,
    season: 0
  };
}
function loadSave() {
  let s = defaultSave();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      s = Object.assign(s, raw);
      s.upgrades = Object.assign(defaultSave().upgrades, raw.upgrades || {});
      s.owned = Object.assign(defaultSave().owned, raw.owned || {});
      s.seasonBest = [0, 0, 0, 0].map((v, i) => (raw.seasonBest && raw.seasonBest[i]) || 0);
      if (!s.owned.classic) s.owned.classic = true;
      if (!COSTUMES.some(c => c.id === s.equipped && s.owned[c.id])) s.equipped = 'classic';
    } else {
      const legacy = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
      if (legacy) s.best = legacy;
    }
  } catch (e) {}
  applyCheats(s);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}
function applyCheats(s) {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('coins')) s.coins = parseInt(q.get('coins') || '0', 10) || s.coins;
    if (q.get('unlockall') === '1') {
      COSTUMES.forEach(c => { s.owned[c.id] = true; });
      s.upgrades = { magnet: 1, shield: 1, doubleCoins: 1, headStart: 1, extraLife: 1 };
      if (!q.has('coins')) s.coins = Math.max(s.coins, 99999);
    }
  } catch (e) {}
}
function saveSave(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    const best = Math.max(s.best || 0, ...(s.seasonBest || [0]));
    localStorage.setItem(BEST_KEY, String(best));
  } catch (e) {}
}

// ---------------- audio ----------------
const Sfx = {
  ctx: null,
  master: null,
  _noise: null,
  muted: false,
  _coinLast: 0,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // Voices -> bus (+6 dB vs. the old 0.28 master) -> compressor -> limiter -> dest
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.56;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16;
      this.comp.knee.value = 10;
      this.comp.ratio.value = 3.5;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.14;
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1.2;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.001;
      this.limiter.release.value = 0.06;
      this.master.connect(this.comp);
      this.comp.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 0.4;
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      const p = this.ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  },
  setMuted(m) { this.muted = !!m; },
  _ok() { return !!(this.ctx && this.ctx.state === 'running' && !this.muted && this.master); },
  _out() { return this.master || (this.ctx && this.ctx.destination); },
  tone(f1, f2, dur, type = 'square', vol = 0.1, delay = 0) {
    const c = this.ctx; if (!this._ok()) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._out()); o.start(t); o.stop(t + dur + 0.03);
  },
  whoosh(dur, vol, fFrom, fTo) {
    const c = this.ctx; if (!this._ok() || !this._noise) return;
    const src = c.createBufferSource(); src.buffer = this._noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(fFrom, c.currentTime);
    bp.frequency.exponentialRampToValueAtTime(Math.max(fTo, 80), c.currentTime + dur);
    bp.Q.value = 0.8;
    const g = c.createGain(); const t = c.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this._out());
    src.start(t); src.stop(t + dur + 0.02);
  },
  coin() {
    if (!this._ok()) return;
    const now = this.ctx.currentTime;
    const gap = now - (this._coinLast || 0);
    this._coinLast = now;
    const spread = (Math.random() - 0.5) * 90;
    const vol = gap < 0.09 ? 0.55 : (gap < 0.16 ? 0.78 : 1);
    this.tone(988 + spread, 1318 + spread, 0.09, 'triangle', 0.22 * vol);
    this.tone(1318 + spread, 1760 + spread, 0.13, 'triangle', 0.16 * vol, 0.045);
  },
  coinMiss() { this.tone(240, 180, 0.07, 'sine', 0.08); },
  jump() {
    this.whoosh(0.13, 0.24, 400, 1400);
    this.tone(240, 640, 0.13, 'sine', 0.24);
    this.tone(640, 300, 0.15, 'sine', 0.14, 0.08);
  },
  slide() { this.whoosh(0.2, 0.22, 1000, 180); this.tone(340, 140, 0.16, 'sine', 0.06); },
  lane() { this.whoosh(0.1, 0.18, 700, 1200); this.tone(520, 640, 0.06, 'sine', 0.055); },
  steerWhoosh() { this.whoosh(0.12, 0.08, 520, 1080); },
  turn() { this.whoosh(0.16, 0.26, 500, 1400); this.tone(440, 660, 0.1, 'sine', 0.08); },
  nearMiss() { this.whoosh(0.14, 0.2, 1200, 400); this.tone(880, 440, 0.08, 'triangle', 0.06); },
  step() {
    if (!this._ok() || !this._noise) return;
    const c = this.ctx, t = c.currentTime;
    const f0 = 85 + Math.random() * 35;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f0 * 0.55, 40), t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.075, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(this._out()); o.start(t); o.stop(t + 0.08);
    const src = c.createBufferSource(); src.buffer = this._noise;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240 + Math.random() * 80, t);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.075, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(lp); lp.connect(ng); ng.connect(this._out());
    src.start(t); src.stop(t + 0.08);
  },
  phase(p) {
    if (p === AURORA) {
      this.tone(659, 988, 0.2, 'sine', 0.11);
      this.tone(988, 1318, 0.28, 'triangle', 0.08, 0.05);
      this.tone(523, 784, 0.18, 'sine', 0.06, 0.08);
      this.whoosh(0.24, 0.13, 800, 2000);
    } else {
      this.tone(523, 523, 0.18, 'sine', 0.12);
      this.tone(659, 659, 0.2, 'sine', 0.1, 0.06);
      this.tone(784, 784, 0.28, 'triangle', 0.09, 0.12);
    }
  },
  hit() { this.tone(180, 50, 0.4, 'sawtooth', 0.16); this.whoosh(0.28, 0.24, 300, 80); },
  tick() { this.tone(760, 760, 0.08, 'square', 0.07); },
  go() { this.tone(523, 784, 0.16, 'triangle', 0.12); this.tone(784, 1046, 0.18, 'triangle', 0.1, 0.08); }
};

class Music {
  constructor() {
    this.tracks = SEASONS.map(s => {
      const a = new Audio(s.music);
      a.loop = true; a.preload = 'auto'; a.volume = 0;
      a.crossOrigin = 'anonymous';
      return a;
    });
    this.current = -1;
    this.unlocked = false;
    this.muted = false;
    this.fadeFrom = -1;
    this.fadeT = 1;
  }
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.tracks.forEach(a => { const p = a.play(); if (p && p.catch) p.catch(() => {}); a.pause(); a.currentTime = 0; });
  }
  setMuted(m) {
    this.muted = m;
    this.tracks.forEach((a) => { a.muted = m; if (m) a.volume = 0; });
    if (!m && this.current >= 0) this.tracks[this.current].volume = 1;
  }
  play(i, snap = false) {
    if (i === this.current || i < 0 || i > 3) return;
    this.unlock();
    const prev = this.current;
    this.current = i;
    const next = this.tracks[i];
    const go = next.play(); if (go && go.catch) go.catch(() => {});
    if (this.muted) { next.volume = 0; if (prev >= 0) { this.tracks[prev].pause(); this.tracks[prev].volume = 0; } return; }
    if (snap || prev < 0) {
      next.volume = 1;
      if (prev >= 0) { this.tracks[prev].pause(); this.tracks[prev].volume = 0; }
      this.fadeT = 1; this.fadeFrom = -1;
    } else {
      this.fadeFrom = prev; this.fadeT = 0;
    }
  }
  update(dt) {
    if (this.fadeFrom >= 0 && this.fadeT < 1) {
      this.fadeT = Math.min(1, this.fadeT + dt / 0.55);
      const a = this.fadeT * this.fadeT * (3 - 2 * this.fadeT);
      if (!this.muted) {
        this.tracks[this.current].volume = a;
        this.tracks[this.fadeFrom].volume = 1 - a;
      }
      if (this.fadeT >= 1) {
        this.tracks[this.fadeFrom].pause();
        this.tracks[this.fadeFrom].volume = 0;
        this.fadeFrom = -1;
      }
    }
  }
}

// ---------------- materials / geo cache ----------------
function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color, roughness: 0.58, metalness: 0.0
  }, extra));
}
let _toonRamp = null;
function toonRamp() {
  if (_toonRamp) return _toonRamp;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 1;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 4, 0);
  g.addColorStop(0, '#606060');
  g.addColorStop(0.35, '#9a9a9a');
  g.addColorStop(0.7, '#d0d0d0');
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  _toonRamp = tex;
  return tex;
}
function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial(Object.assign({
    color, gradientMap: toonRamp()
  }, extra));
}
function makePathTexture() {
  // Even dirt, no edge bands or stripes — those read as confusing "lane lines".
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9a067';
  ctx.fillRect(0, 0, 128, 256);
  const img = ctx.getImageData(0, 0, 128, 256);
  const d = img.data;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 128; x++) {
      // Tileable, very mild grain. No structured longitudinal or transverse bands.
      const u = (x + 0.5) / 128, v = (y + 0.5) / 256;
      // Isotropic grain only — no sine bands that would read as stripes down the road.
      const n = (hash(x * 0.37, y * 0.53) - 0.5) * 0.028
        + (hash(x * 1.13 + 2.1, y * 0.91) - 0.5) * 0.018;
      const i = (y * 128 + x) * 4;
      const k = n * 255;
      d[i] = clamp(d[i] + k, 0, 255);
      d[i + 1] = clamp(d[i + 1] + k * 0.92, 0, 255);
      d[i + 2] = clamp(d[i + 2] + k * 0.75, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
let _pathTex = null;
function pathTex() { return _pathTex || (_pathTex = makePathTexture()); }

function _pushCornerTri(pos, nor, uv, ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, ua, va, ub, vb, uc, vc) {
  pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  uv.push(ua, va, ub, vb, uc, vc);
}
function cornerAcrossU(typ, x, z) {
  const half = PATH_W * 0.5;
  if (typ === 'right') return (Math.max(x, z) + half) / PATH_W;
  if (typ === 'left') return (Math.max(-x, z) + half) / PATH_W;
  // tee: incoming (south) uses X, both exits use Z
  return (z < 0 ? (x + half) : (z + half)) / PATH_W;
}
function cornerAlongV(typ, x, z) {
  const half = PATH_W * 0.5;
  if (typ === 'right') return (Math.min(x, z) + half) / 8;
  if (typ === 'left') return (Math.min(-x, z) + half) / 8;
  return (z + half) / 8;
}
function buildCornerTileGeom(typ) {
  const half = PATH_W * 0.5;
  const y0 = -0.08, y1 = 0.08;
  const pos = [], nor = [], uv = [];
  const top = (x, z) => [x, y1, z, cornerAcrossU(typ, x, z), cornerAlongV(typ, x, z)];
  const topTri = (ax, az, bx, bz, cx, cz) => {
    const A = top(ax, az), B = top(bx, bz), C = top(cx, cz);
    // Winding A,C,B is CCW from +Y so the road face is not back-face culled.
    _pushCornerTri(pos, nor, uv, A[0], A[1], A[2], C[0], C[1], C[2], B[0], B[1], B[2], 0, 1, 0, A[3], A[4], C[3], C[4], B[3], B[4]);
  };
  const wall = (ax, az, bx, bz, outwardX, outwardZ) => {
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const nx = outwardX, nz = outwardZ;
    _pushCornerTri(pos, nor, uv, ax, y0, az, bx, y0, bz, bx, y1, bz, nx, 0, nz, 0, 0, 1, 0, 1, 1);
    _pushCornerTri(pos, nor, uv, ax, y0, az, bx, y1, bz, ax, y1, az, nx, 0, nz, 0, 0, 1, 1, 0, 1);
  };
  if (typ === 'right') {
    // Miter along z = x, from inner (-half,-half) to outer (half,half).
    topTri(-half, -half, half, -half, half, half);
    topTri(-half, -half, half, half, -half, half);
    // Walls only on closed sides. Incoming (z=-half) and exit (x=-half) stay open
    // so a vertical lip cannot show as a line across the joint.
    wall(half, -half, half, half, 1, 0);
    wall(half, half, -half, half, 0, 1);
  } else if (typ === 'left') {
    // Miter along z = -x, from inner (half,-half) to outer (-half,half).
    topTri(half, -half, -half, -half, -half, half);
    topTri(half, -half, -half, half, half, half);
    wall(-half, -half, -half, half, -1, 0);
    wall(-half, half, half, half, 0, 1);
  } else {
    // Tee: south half incoming UVs, north half exit UVs, split on z = 0.
    topTri(-half, -half, half, -half, half, 0);
    topTri(-half, -half, half, 0, -half, 0);
    topTri(-half, 0, half, 0, half, half);
    topTri(-half, 0, half, half, -half, half);
    wall(-half, half, half, half, 0, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

function cornerArcRadius(lx, side) {
  const half = PATH_W * 0.5;
  return side > 0 ? Math.abs(lx + half) : Math.abs(half - lx);
}
function cornerCenter(side) {
  const half = PATH_W * 0.5;
  return side > 0 ? { x: -half, z: -half } : { x: half, z: -half };
}
function cornerExitPoint(lx, side) {
  const half = PATH_W * 0.5;
  return side > 0 ? { x: -half, z: lx } : { x: half, z: -lx };
}
function makeDashMat() {
  return new THREE.MeshBasicMaterial({
    color: 0xfffcf0,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}
function _pushDashQuad(pos, nor, ax, az, bx, bz, y, halfW) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.04) return;
  const ux = dx / len, uz = dz / len;
  const rx = -uz * halfW, rz = ux * halfW;
  const y2 = y;
  // 2 triangles, 6 verts
  const verts = [
    ax - rx, y2, az - rz,
    ax + rx, y2, az + rz,
    bx - rx, y2, bz - rz,
    ax + rx, y2, az + rz,
    bx + rx, y2, bz + rz,
    bx - rx, y2, bz - rz
  ];
  for (const v of verts) pos.push(v);
  for (let i = 0; i < 6; i++) { nor.push(0, 1, 0); }
}
function _emitDashes(pos, nor, x0, z0, x1, z1, y, phase0) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.05) return;
  const ux = (x1 - x0) / len, uz = (z1 - z0) / len;
  const period = DASH_LEN + DASH_GAP;
  let s = ((phase0 % period) + period) % period;
  let t;
  if (s < DASH_LEN) {
    const b = Math.min(len, DASH_LEN - s);
    _pushDashQuad(pos, nor, x0, z0, x0 + ux * b, z0 + uz * b, y, DASH_W * 0.5);
    t = (DASH_LEN - s) + DASH_GAP;
  } else {
    t = period - s;
  }
  while (t < len - 0.02) {
    const a = t;
    const b = Math.min(len, t + DASH_LEN);
    if (b - a > 0.04) {
      _pushDashQuad(pos, nor, x0 + ux * a, z0 + uz * a, x0 + ux * b, z0 + uz * b, y, DASH_W * 0.5);
    }
    t += period;
  }
}
function _emitArcDashes(pos, nor, cx, cz, r, a0, a1, y, phase0) {
  if (r < 0.12) return;
  let dA = a1 - a0;
  while (dA > Math.PI) dA -= Math.PI * 2;
  while (dA < -Math.PI) dA += Math.PI * 2;
  // Prefer the quarter-ish shorter arc; if almost equal, keep the sign of dA
  const arcLen = Math.abs(dA) * r;
  if (arcLen < 0.05) return;
  const dir = dA >= 0 ? 1 : -1;
  const period = DASH_LEN + DASH_GAP;
  let s = ((phase0 % period) + period) % period;
  const angAt = (t) => a0 + dir * (t / r);
  const xz = (t) => {
    const a = angAt(t);
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r };
  };
  const emit = (t0, t1) => {
    const steps = Math.max(2, Math.ceil((t1 - t0) / 0.11));
    let p = xz(t0);
    for (let i = 1; i <= steps; i++) {
      const t = t0 + (t1 - t0) * (i / steps);
      const q = xz(t);
      _pushDashQuad(pos, nor, p.x, p.z, q.x, q.z, y, DASH_W * 0.5);
      p = q;
    }
  };
  let t;
  if (s < DASH_LEN) {
    emit(0, Math.min(arcLen, DASH_LEN - s));
    t = (DASH_LEN - s) + DASH_GAP;
  } else {
    t = period - s;
  }
  while (t < arcLen - 0.02) {
    const b = Math.min(arcLen, t + DASH_LEN);
    if (b - t > 0.04) emit(t, b);
    t += period;
  }
}
function finishDashMesh(pos, nor, mat) {
  if (pos.length < 18) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = false;
  m.castShadow = false;
  m.renderOrder = 2;
  return m;
}

function geoCache() {
  return {
    sphere: new THREE.SphereGeometry(1, 20, 16),
    sphereLo: new THREE.SphereGeometry(1, 14, 10),
    sphereMid: new THREE.SphereGeometry(1, 16, 12),
    ico: new THREE.IcosahedronGeometry(1, 1),
    icoLo: new THREE.IcosahedronGeometry(1, 0),
    capBody: new THREE.CapsuleGeometry(0.26, 0.20, 8, 16),
    capHead: new THREE.SphereGeometry(0.30, 22, 16),
    capLeg: new THREE.CapsuleGeometry(0.07, 0.12, 6, 10),
    foot: new THREE.SphereGeometry(0.13, 12, 8),
    flipper: new THREE.CapsuleGeometry(0.06, 0.26, 6, 12),
    beak: new THREE.ConeGeometry(0.09, 0.22, 10),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
    cylTaper: new THREE.CylinderGeometry(0.12, 0.22, 1.6, 12),
    cone: new THREE.ConeGeometry(1, 1, 14),
    frond: new THREE.SphereGeometry(0.5, 12, 8),
    box: new THREE.BoxGeometry(1, 1, 1),
    coin: new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_THICK, 22),
    coinI: new THREE.TorusGeometry(COIN_R, COIN_RIM, 8, 22),
    plane: new THREE.PlaneGeometry(1, 1, 1, 1),
    hood: new THREE.SphereGeometry(0.34, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    daisy: new THREE.CircleGeometry(0.12, 8),
    streak: new THREE.BoxGeometry(0.03, 0.03, 1.4),
    pathSlab: new THREE.PlaneGeometry(1, 1),
    cornerSlab: new THREE.BoxGeometry(PATH_W, 0.16, PATH_W),
    curb: new THREE.BoxGeometry(0.22, 0.22, 1),
    wing: new THREE.BoxGeometry(10, 0.08, 1),
    chevron: new THREE.ConeGeometry(0.28, 0.7, 3),
    arrow: makeArrowGeom()
  };
}

function makeTerrainMat(season) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uGround: { value: col(season.ground) },
      uGroundDark: { value: col(season.groundDark) },
      uWinter: { value: season.id === 'winter' ? 1 : 0 },
      uSummer: { value: season.id === 'summer' ? 1 : 0 }
    },
    vertexShader: `
      varying vec3 vW;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uGround,uGroundDark;
      uniform float uWinter,uSummer;
      varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      void main(){
        float n = noise(vW.xz*1.4);
        float n2 = noise(vW.xz*4.2);
        vec3 grass = mix(uGroundDark, uGround, 0.4 + n*0.6 + n2*0.15);
        gl_FragColor = vec4(grass, 1.0);
      }`
  });
  return m;
}

function makeSkyMat(season) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: col(season.skyZenith) },
      uHorizon: { value: col(season.skyHorizon) },
      uSun: { value: col(season.sun) },
      uSunDir: { value: new THREE.Vector3(...season.sunDir).normalize() },
      uWash: { value: new THREE.Color(0xff8fb3) },
      uWashAmt: { value: 0 }
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vDir = position;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uZenith,uHorizon,uSun,uSunDir,uWash;
      uniform float uWashAmt;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(uHorizon, uZenith, smoothstep(-0.08, 0.72, h));
        float sun = pow(max(0.0, dot(d, normalize(uSunDir))), 48.0);
        float glow = pow(max(0.0, dot(d, normalize(uSunDir))), 4.0);
        c += uSun * sun * 1.1 + uSun * glow * 0.22;
        float wash = uWashAmt * smoothstep(0.85, -0.05, h);
        c = mix(c, uWash, wash);
        gl_FragColor = vec4(c, 1.0);
      }`
  });
}

function makeOceanMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: col(0x4ec4d6) },
      uDeep: { value: col(0x1a6f96) }
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vW;
      void main(){
        vec3 p = position;
        p.z += sin(p.x*0.15 + uTime*0.8)*0.15 + sin(p.y*0.2 + uTime*1.1)*0.1;
        vec4 w = modelMatrix * vec4(p,1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uShallow,uDeep; uniform float uTime; varying vec3 vW;
      void main(){
        float w = 0.5 + 0.5*sin(vW.z*0.3 + vW.x*0.15 + uTime);
        float foam = smoothstep(0.82, 1.0, w);
        vec3 c = mix(uDeep, uShallow, w);
        c = mix(c, vec3(0.9,0.97,1.0), foam*0.55);
        gl_FragColor = vec4(c, 1.0);
      }`
  });
}

function makeArrowGeom() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.15);
  s.lineTo(0.72, -0.05);
  s.lineTo(0.28, -0.05);
  s.lineTo(0.28, -1.15);
  s.lineTo(-0.28, -1.15);
  s.lineTo(-0.28, -0.05);
  s.lineTo(-0.72, -0.05);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, 0);
  return g;
}

// ---------------- path ----------------
function straightLenFor(elapsed) {
  const u = clamp(elapsed / 70, 0, 1);
  return lerp(44, 16, u * u * 0.3 + u * 0.7);
}
const SNAP_DUR = 0.12; // short body ease; camera uses CAM_TURN_DUR

function poseAtStraight(seg, d, lx) {
  const t = d - seg.dist0;
  const v = yawVec(seg.yaw0);
  return {
    x: seg.x0 + v.fx * t + v.sx * lx,
    z: seg.z0 + v.fz * t + v.sz * lx,
    yaw: seg.yaw0,
    fx: v.fx, fz: v.fz, sx: v.sx, sz: v.sz
  };
}
function turnYaw(yaw, dir) {
  return yaw + (dir < 0 ? 1 : -1) * Math.PI * 0.5;
}

class PathSystem {
  constructor() { this.resetPreview(); }
  _clear() {
    this.segs = [];
    this.pending = null;
    this.pendingCorner = null;
    this.branches = { left: null, right: null };
    this.end = { x: 0, z: 0, yaw: 0, dist: 0 };
    this.preview = false;
    this._id = 1;
    this._lastAbandoned = null;
  }
  resetPreview() {
    this._clear();
    this.preview = true;
    this._pushStraight(400);
  }
  resetRun(elapsed = 0) {
    this._clear();
    this._pushStraight(WARMUP + 18);
    this._planTurn(elapsed);
  }
  _pushStraight(len, onto) {
    const s = onto || this.end;
    const v = yawVec(s.yaw);
    const seg = {
      id: this._id++, type: 'straight',
      dist0: s.dist, dist1: s.dist + len, length: len,
      x0: s.x, z0: s.z, yaw0: s.yaw,
      x1: s.x + v.fx * len, z1: s.z + v.fz * len, yaw1: s.yaw,
      cap0: onto ? 'corner' : 'flat',
      cap1: 'flat'
    };
    if (!onto) {
      this.segs.push(seg);
      this.end = { x: seg.x1, z: seg.z1, yaw: seg.yaw1, dist: seg.dist1 };
    }
    return seg;
  }
  _markEndCorner() {
    const last = this.segs[this.segs.length - 1];
    if (last && last.type === 'straight') last.cap1 = 'corner';
  }
  _makeCorner(start, typ) {
    return {
      id: this._id++, type: typ, dir: typ === 'left' ? -1 : typ === 'right' ? 1 : 0,
      dist0: start.dist, dist1: start.dist, length: 0,
      x0: start.x, z0: start.z, yaw0: start.yaw,
      x1: start.x, z1: start.z, yaw1: start.yaw
    };
  }
  _buildBranch(start, dir, afterLen) {
    const yaw1 = turnYaw(start.yaw, dir);
    const mid = { x: start.x, z: start.z, yaw: yaw1, dist: start.dist };
    const st = this._pushStraight(afterLen, mid);
    st.id = this._id++;
    const v = yawVec(yaw1);
    st.dist0 = start.dist; st.dist1 = start.dist + afterLen; st.length = afterLen;
    st.x0 = start.x; st.z0 = start.z; st.yaw0 = yaw1;
    st.x1 = start.x + v.fx * afterLen; st.z1 = start.z + v.fz * afterLen; st.yaw1 = yaw1;
    st.cap0 = 'corner'; st.cap1 = 'flat';
    st.turnDir = dir;
    return {
      segs: [st],
      end: { x: st.x1, z: st.z1, yaw: st.yaw1, dist: st.dist1 }
    };
  }
  _planTurn(elapsed) {
    const typ = this.preview ? null : pick(['left', 'right', 'left', 'right', 'tee']);
    if (!typ) return;
    this._markEndCorner();
    this.pending = {
      type: typ,
      dist: this.end.dist,
      x: this.end.x, z: this.end.z, yaw: this.end.yaw,
      committed: false, chosen: 0
    };
    this.pendingCorner = this._makeCorner(this.end, typ);
    const after = straightLenFor(elapsed);
    this.branches.left = (typ === 'left' || typ === 'tee') ? this._buildBranch(this.end, -1, after) : null;
    this.branches.right = (typ === 'right' || typ === 'tee') ? this._buildBranch(this.end, 1, after) : null;
  }
  commit(dir, elapsed = 0) {
    const p = this.pending;
    if (!p || p.committed) return false;
    if (p.type === 'left' && dir !== -1) return false;
    if (p.type === 'right' && dir !== 1) return false;
    const branch = dir < 0 ? this.branches.left : this.branches.right;
    if (!branch) return false;
    p.committed = true;
    p.chosen = dir;
    if (this.pendingCorner) {
      this.pendingCorner.chosen = dir;
      this.segs.push(this.pendingCorner);
    }
    for (const seg of branch.segs) this.segs.push(seg);
    this.end = branch.end;
    const unused = dir < 0 ? this.branches.right : this.branches.left;
    this.pending = null;
    this.pendingCorner = null;
    this.branches = { left: null, right: null };
    this._lastAbandoned = unused;
    this._planTurn(elapsed);
    return true;
  }
  officialEndDist() {
    return this.pending ? this.pending.dist : this.end.dist;
  }
  resolve(dist, lx = 0, followPending = false) {
    for (let i = this.segs.length - 1; i >= 0; i--) {
      const seg = this.segs[i];
      if (seg.length <= 1e-6) continue;
      if (dist <= seg.dist1 + 1e-4 && dist >= seg.dist0 - 1e-4) {
        return this._poseSeg(seg, dist, lx);
      }
    }
    // last official
    if (this.segs.length) {
      const last = this.segs[this.segs.length - 1];
      if (dist < last.dist0) return this._poseSeg(this.segs[0], this.segs[0].dist0, lx);
      if (!followPending) return poseAtStraight({
        dist0: last.dist1, x0: last.x1, z0: last.z1, yaw0: last.yaw1
      }, dist, lx);
    }
    if (followPending && this.pending) {
      const typ = this.pending.type;
      const br = typ === 'left' ? this.branches.left
        : typ === 'right' ? this.branches.right
        : (this.branches.left || this.branches.right);
      if (br) {
        for (let i = br.segs.length - 1; i >= 0; i--) {
          const seg = br.segs[i];
          if (seg.length <= 1e-6) continue;
          if (dist <= seg.dist1 + 1e-4 && dist >= seg.dist0 - 1e-4) {
            return this._poseSeg(seg, dist, lx);
          }
        }
        const last = br.segs[br.segs.length - 1];
        if (dist > last.dist1) return poseAtStraight({
          dist0: last.dist1, x0: last.x1, z0: last.z1, yaw0: last.yaw1
        }, dist, lx);
      }
    }
    const e = this.end;
    return poseAtStraight({ dist0: e.dist, x0: e.x, z0: e.z, yaw0: e.yaw }, dist, lx);
  }
  resolveBranch(dist, lx, side) {
    const br = side < 0 ? this.branches.left : this.branches.right;
    if (!br) return this.resolve(dist, lx, true);
    for (const seg of br.segs) {
      if (dist <= seg.dist1 + 1e-4 && dist >= seg.dist0 - 1e-4) return this._poseSeg(seg, dist, lx);
    }
    return this._poseSeg(br.segs[br.segs.length - 1], br.segs[br.segs.length - 1].dist1, lx);
  }
  _poseSeg(seg, dist, lx) {
    return poseAtStraight(seg, dist, lx);
  }
  extendPreview(playerDist) {
    if (!this.preview) return;
    while (this.end.dist < playerDist + 160) this._pushStraight(80);
  }
  // Used by tests to plant a specific upcoming corner just ahead.
  forceTurn(type, atDist) {
    // Truncate official path at atDist (must be on the current last straight) and plan that turn.
    const last = this.segs[this.segs.length - 1];
    if (!last || last.type !== 'straight') return false;
    const d = clamp(atDist, last.dist0 + 2, last.dist1);
    const pose = poseAtStraight(last, d, 0);
    last.dist1 = d; last.length = d - last.dist0;
    last.x1 = pose.x; last.z1 = pose.z; last.yaw1 = pose.yaw;
    this.end = { x: pose.x, z: pose.z, yaw: pose.yaw, dist: d };
    last.cap1 = 'corner';
    this.pending = null;
    this.pendingCorner = null;
    this.branches = { left: null, right: null };
    this.pending = { type, dist: d, x: pose.x, z: pose.z, yaw: pose.yaw, committed: false, chosen: 0 };
    this.pendingCorner = this._makeCorner(this.end, type);
    const after = 28;
    this.branches.left = (type === 'left' || type === 'tee') ? this._buildBranch(this.end, -1, after) : null;
    this.branches.right = (type === 'right' || type === 'tee') ? this._buildBranch(this.end, 1, after) : null;
    return true;
  }
  visuals() {
    const list = this.segs.slice();
    if (this.pendingCorner) list.push(this.pendingCorner);
    if (this.branches.left) list.push(...this.branches.left.segs);
    if (this.branches.right) list.push(...this.branches.right.segs);
    if (this._lastAbandoned) list.push(...this._lastAbandoned.segs);
    return list;
  }
}

// ---------------- character (panda) ----------------
class Penguin {
  constructor() {
    this.root = new THREE.Group();
    this.hop = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.hop);
    this.hop.add(this.model);

    this.phase = BLOOM;
    this.costume = 'classic';
    this.runT = 0;
    this.burst = [];
    this.hoodieMats = [];
    this.trimMats = [];
    this.patchMats = [];
    this.bones = {};
    this.mixer = null;
    this.actions = {};
    this.currentClip = null;
    this.ready = false;

    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 20),
      std(0x000000, { transparent: true, opacity: 0.38, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.025;
    this.blob.castShadow = false;
    this.root.add(this.blob);

    this._buildAura();
  }

  _buildAura() {
    // Thin ground ring at the feet so the dark back silhouette stays readable.
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.032, 8, 28),
      new THREE.MeshBasicMaterial({
        color: PHASE_COL[BLOOM],
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    this.ring.renderOrder = 3;
    this.root.add(this.ring);

    this.auraLight = new THREE.PointLight(PHASE_COL[BLOOM], 0.28, 1.8, 2);
    this.auraLight.position.set(0, 0.85, -0.2);
    this.hop.add(this.auraLight);

    this.sparkG = new THREE.Group();
    this.hop.add(this.sparkG);
    this.sparks = [];
    const sm = new THREE.MeshBasicMaterial({
      color: PHASE_COL[BLOOM],
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), sm.clone());
      this.sparkG.add(m);
      this.sparks.push({
        mesh: m,
        a: (i / 8) * Math.PI * 2,
        r: 0.32 + (i % 3) * 0.04,
        y: 0.18 + (i % 4) * 0.16,
        sp: 0.7 + (i % 3) * 0.25
      });
    }
    this.rimUniforms = [];
    this.halo = null;
    this.rimMesh = null;
  }

  _applyRim(mat) {
    if (!mat || mat.userData._rimHook) return;
    mat.userData._rimHook = true;
    const uni = {
      uRimColor: { value: new THREE.Color(PHASE_COL[BLOOM]) },
      uRimAmt: { value: 1.15 }
    };
    mat.userData.rimUni = uni;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = uni.uRimColor;
      shader.uniforms.uRimAmt = uni.uRimAmt;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimAmt;'
        )
        .replace(
          '#include <opaque_fragment>',
          'float rimN = dot(normalize(normal), normalize(-vViewPosition));\n' +
          'float rim = pow(clamp(1.0 - abs(rimN), 0.0, 1.0), 2.6);\n' +
          'outgoingLight += uRimColor * rim * uRimAmt;\n' +
          '#include <opaque_fragment>'
        );
    };
    mat.needsUpdate = true;
    this.rimUniforms.push(uni);
  }

  async load() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(CHARACTER_MODEL);
    this.mount(gltf);
  }

  mount(gltf) {
    const scene = gltf.scene;
    this.model.add(scene);
    this.gltf = gltf;

    const box = new THREE.Box3().setFromObject(scene);
    const h = box.max.y - box.min.y;
    if (h > 0.01) {
      const s = CHARACTER_HEIGHT / h;
      if (Math.abs(s - 1) > 0.04) scene.scale.multiplyScalar(s);
      box.setFromObject(scene);
    }
    scene.position.y -= box.min.y;

    scene.traverse(o => {
      if (o.isBone) this.bones[o.name] = o;
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        if (!m) return;
        m.roughness = m.roughness != null ? Math.min(0.85, m.roughness + 0.08) : 0.6;
        m.metalness = 0;
        const n = (m.name || '').toLowerCase();
        // Bloom/Aurora is a rim on the white fur only — never a body tint, and black stays black.
        if (n === 'body') this._applyRim(m);
        if (n === 'furblack' || n === 'black') {
          if (m.color) m.color.setHex(0x0a0a0a);
          m.roughness = Math.max(m.roughness || 0, 0.86);
          if (m.emissive) { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; }
        }
        if (n === 'hoodie') this.hoodieMats.push(m);
        else if (n === 'hoodietrim' || n === 'hoodiestring') this.trimMats.push(m);
        else if (n === 'hoodiepatch') this.patchMats.push(m);
      });
    });

    this.mixer = new THREE.AnimationMixer(scene);
    this.actions = {};
    for (const clip of gltf.animations || []) {
      const act = this.mixer.clipAction(clip);
      act.enabled = true;
      if (clip.name === 'TurnL' || clip.name === 'TurnR') {
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
      } else {
        act.setLoop(THREE.LoopRepeat, Infinity);
      }
      this.actions[clip.name] = act;
    }
    this._buildAccessories();
    this.ready = true;
    this.setCostume(this.costume || 'classic');
    this.setForm(this.phase, true);
    this._play('Idle', 0);
  }

  _buildAccessories() {
    const head = this.bones.Head || this.model;
    const body = this.bones.Body || this.model;
    const mk = (mat, geo, parent, pos, rot, scl) => {
      const m = new THREE.Mesh(geo, mat);
      if (pos) m.position.set(pos[0], pos[1], pos[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      if (scl) m.scale.set(scl[0], scl[1], scl[2]);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    this.mBeanie = std(0xe85d5d, { roughness: 0.75 });
    this.mBeaniePom = std(0xf7f1e8, { roughness: 0.8 });
    this.mScarf = std(0xd94a3a, { roughness: 0.7 });
    this.mScarf2 = std(0xf4efe6, { roughness: 0.7 });
    this.mGlass = std(0x111118, { roughness: 0.15, metalness: 0.4 });
    this.mGlassArm = std(0x22222a, { roughness: 0.3, metalness: 0.5 });
    this.mPhones = std(0x1a1a22, { roughness: 0.4, metalness: 0.2 });
    this.mPhonesAcc = std(0xff4d8a, { roughness: 0.45 });
    this.mFurTrim = std(0xf4efe6, { roughness: 0.85 });
    this.mNinja = std(0x111118, { roughness: 0.65 });

    this.accBeanie = new THREE.Group(); head.add(this.accBeanie);
    this.accBeanie.position.set(0, 0.16, 0);
    mk(this.mBeanie, new THREE.SphereGeometry(0.11, 16, 12), this.accBeanie, [0, 0.02, 0], null, [1, 0.55, 1]);
    mk(this.mBeanie, new THREE.CylinderGeometry(0.105, 0.11, 0.04, 14), this.accBeanie, [0, -0.03, 0]);
    mk(this.mBeaniePom, new THREE.SphereGeometry(0.035, 10, 8), this.accBeanie, [0, 0.08, -0.02]);

    this.accScarf = new THREE.Group(); body.add(this.accScarf);
    this.accScarf.position.set(0, 0.22, 0);
    mk(this.mScarf, new THREE.TorusGeometry(0.12, 0.025, 8, 16), this.accScarf, [0, 0, 0], [Math.PI / 2, 0, 0]);
    this.scarfT1 = mk(this.mScarf, new THREE.BoxGeometry(0.05, 0.22, 0.02), this.accScarf, [-0.05, -0.1, -0.1]);
    this.scarfT2 = mk(this.mScarf2, new THREE.BoxGeometry(0.05, 0.26, 0.02), this.accScarf, [0.06, -0.12, -0.08]);

    this.accGlasses = new THREE.Group(); head.add(this.accGlasses);
    this.accGlasses.position.set(0, 0.06, 0.11);
    mk(this.mGlass, new THREE.BoxGeometry(0.055, 0.032, 0.015), this.accGlasses, [-0.04, 0, 0]);
    mk(this.mGlass, new THREE.BoxGeometry(0.055, 0.032, 0.015), this.accGlasses, [0.04, 0, 0]);
    mk(this.mGlassArm, new THREE.BoxGeometry(0.03, 0.012, 0.012), this.accGlasses, [0, 0, 0]);

    this.accPhones = new THREE.Group(); head.add(this.accPhones);
    mk(this.mPhones, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), this.accPhones, [-0.11, 0.04, 0], [0, 0, Math.PI / 2]);
    mk(this.mPhones, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), this.accPhones, [0.11, 0.04, 0], [0, 0, Math.PI / 2]);
    mk(this.mPhonesAcc, new THREE.CylinderGeometry(0.025, 0.025, 0.016, 10), this.accPhones, [-0.125, 0.04, 0], [0, 0, Math.PI / 2]);
    mk(this.mPhonesAcc, new THREE.CylinderGeometry(0.025, 0.025, 0.016, 10), this.accPhones, [0.125, 0.04, 0], [0, 0, Math.PI / 2]);

    this.accParka = new THREE.Group(); head.add(this.accParka);
    mk(this.mFurTrim, new THREE.TorusGeometry(0.1, 0.03, 8, 16), this.accParka, [0, 0.02, 0.02], [Math.PI / 2.4, 0, 0]);

    this.accNinja = new THREE.Group(); head.add(this.accNinja);
    mk(this.mNinja, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14), this.accNinja, [0, 0.05, 0.02]);

    this.accRain = new THREE.Group(); body.add(this.accRain);
    mk(std(0xe0b000, { roughness: 0.5 }), new THREE.BoxGeometry(0.04, 0.16, 0.02), this.accRain, [0, 0.08, 0.16]);

    this.accessories = {
      none: [],
      beanie: [this.accBeanie],
      scarf: [this.accScarf],
      glasses: [this.accGlasses],
      raincoat: [this.accRain],
      phones: [this.accPhones],
      parka: [this.accParka],
      ninja: [this.accNinja]
    };
    Object.values(this.accessories).forEach(arr => arr.forEach(g => { g.visible = false; }));
  }

  _play(name, fade = 0.15) {
    if (!this.actions[name] || this.currentClip === name) return;
    const next = this.actions[name];
    const prev = this.currentClip && this.actions[this.currentClip];
    next.reset();
    next.play();
    if (prev && fade > 0) {
      prev.crossFadeTo(next, fade, false);
    } else if (prev) {
      prev.stop();
    }
    this.currentClip = name;
  }

  setCostume(id) {
    const c = COSTUMES.find(x => x.id === id) || COSTUMES[0];
    this.costume = c.id;
    this._tint(this.hoodieMats, c.hoodie, 0);
    this._tint(this.trimMats, c.trim, 0);
    this.patchMats.forEach(m => {
      m.color.setHex(c.trim);
      m.emissive.setHex(0x000000);
      m.emissiveIntensity = 0;
    });
    if (this.accessories) {
      Object.keys(this.accessories).forEach(k => {
        this.accessories[k].forEach(g => { g.visible = (k === c.acc); });
      });
    }
    this.setForm(this.phase, true);
  }

  _tint(list, hex, emissiveHex) {
    list.forEach(m => {
      m.color.setHex(hex);
      if (emissiveHex) {
        m.emissive.setHex(emissiveHex);
        m.emissiveIntensity = 0.22;
      } else {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    });
  }

  setForm(phase, instant = false) {
    this.phase = phase;
    const a = PHASE_COL[phase], b = PHASE_COL_B[phase];
    const rimCol = phase === AURORA ? b : a;
    if (this.rimUniforms) this.rimUniforms.forEach(u => { u.uRimColor.value.setHex(rimCol); u.uRimAmt.value = phase === AURORA ? 1.35 : 1.15; });
    if (this.ring) this.ring.material.color.setHex(a);
    if (this.auraLight) this.auraLight.color.setHex(a);
    if (this.sparks) this.sparks.forEach((s, i) => s.mesh.material.color.setHex(i % 2 ? a : b));
    // Clothing is never recolored by the form switch — only the glow / rim / aura changes.
    if (!instant) this._burst();
  }

  _burst() {
    this.burst.length = 0;
    for (let i = 0; i < 20; i++) {
      this.burst.push({
        x: rand(-0.3, 0.3), y: rand(0.4, 1.2), z: rand(-0.3, 0.3),
        vx: rand(-1.4, 1.4), vy: rand(0.8, 2.4), vz: rand(-1.4, 1.4),
        life: rand(0.28, 0.55), max: 0
      });
      this.burst[i].max = this.burst[i].life;
    }
  }

  animate(dt, ev) {
    const spd = ev.moving ? ev.speed : (ev.idleRun ? 8 : 0);
    const freq = ev.sliding ? 0 : (0.9 + spd * 0.055);
    if (ev.moving || ev.idleRun) this.runT += dt * freq;

    if (this.mixer && this.ready) {
      let clip = 'Idle';
      if (ev.falling) clip = this.actions.Fall ? 'Fall' : 'Jump';
      else if (ev.sliding) clip = 'Slide';
      else if (ev.jumpY > 0.02) clip = 'Jump';
      else if (ev.turning && ev.turnDir < 0 && this.actions.TurnL) clip = 'TurnL';
      else if (ev.turning && this.actions.TurnR) clip = 'TurnR';
      else if (ev.moving || ev.idleRun) clip = 'Run';
      this._play(clip, ev.sliding || ev.jumpY > 0.02 || ev.turning ? 0.08 : 0.16);
      if ((clip === 'TurnL' || clip === 'TurnR') && this.actions[clip]) {
        this.actions[clip].timeScale = 1.2;
      }
      if (this.actions.Run) {
        this.actions.Run.timeScale = ev.idleRun ? 0.85 : (0.75 + spd * 0.055);
      }
      this.mixer.update(dt);
    }

    if (ev.falling) {
      const f = ev.fallT || 0;
      this.hop.position.y = Math.max(0, ev.jumpY + Math.max(0, 0.4 - f * 1.2));
      this.hop.rotation.x = Math.min(0.9, f * 1.4);
    } else {
      this.hop.position.y = ev.jumpY || 0;
      this.hop.rotation.x = 0;
    }
    const lean = ev.lean || 0;
    this.hop.rotation.z = lerp(this.hop.rotation.z, -lean * 0.35, clamp(10 * dt, 0, 1));
    const wantYaw = ev.homeThreeQ ? (Math.PI - 0.72) : 0;
    this.hop.rotation.y = lerp(this.hop.rotation.y, wantYaw, clamp(6 * dt, 0, 1));

    const shadowScale = ev.jumpY > 0 ? clamp(1 - ev.jumpY * 0.35, 0.4, 1) : 1;
    this.blob.scale.set(shadowScale, shadowScale, 1);
    this.blob.material.opacity = 0.38 * shadowScale;

    // Thin rim (shader) + ground ring + faint sparks. Clothing and the dark back stay put.
    const time = ev.time || this.runT;
    const pulse = 1 + Math.sin(time * 3.2) * 0.05;
    if (this.phase === AURORA) {
      const w = 0.5 + 0.5 * Math.sin(time * 2.4);
      const mixC = col(PHASE_COL[AURORA]).lerp(col(PHASE_COL_B[AURORA]), w);
      if (this.rimUniforms) this.rimUniforms.forEach(u => u.uRimColor.value.copy(mixC));
      if (this.ring) this.ring.material.color.copy(mixC);
      if (this.auraLight) this.auraLight.color.copy(mixC);
    }
    if (this.ring) {
      const s = (ev.jumpY > 0.05) ? clamp(1 - ev.jumpY * 0.35, 0.45, 1) : 1;
      this.ring.scale.set(s * pulse, s * pulse, 1);
      this.ring.material.opacity = 0.55 + 0.15 * pulse;
    }
    if (this.auraLight) this.auraLight.intensity = 0.22 + pulse * 0.1;
    if (this.sparks) {
      for (const s of this.sparks) {
        s.a += dt * s.sp;
        s.mesh.position.set(Math.cos(s.a) * s.r, s.y + Math.sin(s.a * 2 + time) * 0.04, Math.sin(s.a) * s.r);
        s.mesh.material.opacity = 0.28 + 0.25 * (0.5 + 0.5 * Math.sin(s.a * 3 + time));
        s.mesh.scale.setScalar(0.7 + 0.3 * pulse);
      }
    }

    if (this.burst.length) {
      for (let i = this.burst.length - 1; i >= 0; i--) {
        const p = this.burst[i];
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vy -= 4 * dt;
        if (p.life <= 0) this.burst.splice(i, 1);
      }
    }
  }
}

// ---------------- world ----------------
class World {
  constructor(scene, geo) {
    this.scene = scene;
    this.geo = geo;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.season = 0;
    this.time = 0;
    this.phase = BLOOM;
    this._segMeshes = new Map();

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), makeSkyMat(SEASONS[0]));
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    this.fogColor = new THREE.Color(SEASONS[0].fog);
    this.fogBase = new THREE.Color(SEASONS[0].fog);
    scene.fog = new THREE.Fog(this.fogColor, 28, 88);

    this.hemi = new THREE.HemisphereLight(0xeef5ff, 0x3d4a32, 0.85);
    scene.add(this.hemi);
    this.dir = new THREE.DirectionalLight(0xfff3d8, 1.35);
    this.dir.position.set(8, 18, 6);
    this.dir.castShadow = true;
    this.dir.shadow.mapSize.set(1024, 1024);
    this.dir.shadow.camera.near = 1;
    this.dir.shadow.camera.far = 40;
    this.dir.shadow.camera.left = -14;
    this.dir.shadow.camera.right = 14;
    this.dir.shadow.camera.top = 14;
    this.dir.shadow.camera.bottom = -14;
    this.dir.shadow.bias = -0.0008;
    scene.add(this.dir);
    this.dirTarget = new THREE.Object3D();
    scene.add(this.dirTarget);
    this.dir.target = this.dirTarget;
    this.fill = new THREE.PointLight(PHASE_COL[0], 0.32, 4.5, 2);
    scene.add(this.fill);

    this.terrainMat = makeTerrainMat(SEASONS[0]);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 200, 1, 1), this.terrainMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.position.y = -0.04;
    this.group.add(this.ground);

    this.oceanMat = makeOceanMat();
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(90, 170, 16, 24), this.oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.set(28, -0.12, 0);
    this.ocean.visible = false;
    this.group.add(this.ocean);

    this.hills = new THREE.Group();
    this.group.add(this.hills);
    this.props = [];
    this.propPool = [];
    this.particles = [];
    this.particleG = new THREE.Group();
    this.group.add(this.particleG);
    this.propG = new THREE.Group();
    this.group.add(this.propG);
    this.pathG = new THREE.Group();
    this.group.add(this.pathG);

    this.fxG = new THREE.Group();
    this.group.add(this.fxG);
    this.fxBits = [];
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(this.geo.sphereLo, std(0xff8fb3, { roughness: 0.4, emissive: 0xff8fb3, emissiveIntensity: 0.6, transparent: true, opacity: 0.9, depthWrite: false }));
      m.visible = false;
      this.fxG.add(m);
      this.fxBits.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0 });
    }

    this.pathMat = std(0xc9a067, { roughness: 0.9, map: pathTex() });
    this.pathMat.map.repeat.set(1, 1);
    this.curbMat = std(0x8a6230, { roughness: 0.7 });
    this.dashMat = makeDashMat();
    this.chevL = [];
    this.chevR = [];

    this._initMats();
    this._buildHills();
    this._resetParticles(0);
  }

  _initMats() {
    this.mTrunk = std(0x6a3f22, { roughness: 0.85 });
    this.mTrunkD = std(0x4a2a14, { roughness: 0.85 });
    this.mPalm = std(0x8a6230, { roughness: 0.8 });
    this.mFrond = toon(0x2f9a4a);
    this.mFrond2 = toon(0x49b85c);
    this.mPink = toon(0xff9ab8);
    this.mPink2 = toon(0xffd0de);
    this.mLeafG = toon(0x3da84c);
    this.mOrange = toon(0xff7a2a);
    this.mRed = toon(0xe03a2a);
    this.mGold = toon(0xffc14d);
    this.mPine = toon(0x1f6a3a);
    this.mPine2 = toon(0x2a8050);
    this.mSnow = std(0xf6fbff, { roughness: 0.85 });
    this.mBush = toon(0x3d9a48);
    this.mFlower = [std(0xff7fa8), std(0xfff176), std(0xff9f43), std(0xf2f2f2)];
    this.mHill = std(0x4a9a55, { roughness: 0.9 });
    this.mRockDeco = std(0xb8c0b0, { roughness: 0.9 });
    this.mChevron = std(0xfff6d2, { roughness: 0.4, emissive: 0xffe9a0, emissiveIntensity: 0.35 });
  }

  _buildHills() {
    this.hills.clear();
    const geo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(geo, this.mHill || std(0x3d7a45));
      const x = (i - 7.5) * 11 + rand(-3, 3);
      const z = 78 + rand(0, 22);
      const sc = rand(10, 18);
      m.position.set(x, sc * 0.18 - 1.2, z);
      m.scale.set(sc * 1.15, sc * 0.34, sc * 0.7);
      m.receiveShadow = true;
      this.hills.add(m);
    }
  }

  _makeTree(season) {
    const g = new THREE.Group();
    const typ = season;
    if (typ === 1) {
      const n = 4;
      let y = 0;
      for (let i = 0; i < n; i++) {
        const seg = new THREE.Mesh(this.geo.cyl, this.mPalm);
        const r = 0.15 - i * 0.015;
        seg.scale.set(r, 0.62, r);
        seg.position.y = y + 0.31;
        seg.rotation.z = (i % 2 ? 1 : -1) * 0.05;
        seg.castShadow = true;
        g.add(seg);
        y += 0.56;
      }
      const top = y + 0.08;
      for (let i = 0; i < 8; i++) {
        const fr = new THREE.Mesh(this.geo.frond, i % 2 ? this.mFrond : this.mFrond2);
        const a = (i / 8) * Math.PI * 2 + 0.1;
        fr.position.set(Math.cos(a) * 0.35, top - 0.05, Math.sin(a) * 0.35);
        fr.rotation.set(1.05, -a, 0);
        fr.scale.set(0.55, 0.1, 1.7);
        fr.castShadow = true;
        g.add(fr);
      }
    } else if (typ === 3) {
      const trunk = new THREE.Mesh(this.geo.cylTaper, this.mTrunkD);
      trunk.position.y = 0.7; trunk.scale.set(0.55, 0.9, 0.55); trunk.castShadow = true; g.add(trunk);
      const layers = 4;
      for (let i = 0; i < layers; i++) {
        const c = new THREE.Mesh(this.geo.cone, i % 2 ? this.mPine : this.mPine2);
        c.position.y = 1.05 + i * 0.55;
        const sc = 1.15 - i * 0.2;
        c.scale.set(sc, 0.85, sc);
        c.castShadow = true; g.add(c);
        const snow = new THREE.Mesh(this.geo.sphereMid, this.mSnow);
        snow.position.y = 1.28 + i * 0.55;
        snow.scale.set(sc * 0.62, 0.18, sc * 0.62);
        g.add(snow);
      }
    } else if (typ === 2) {
      const trunk = new THREE.Mesh(this.geo.cylTaper, this.mTrunk);
      trunk.position.y = 0.8; trunk.scale.set(0.7, 1, 0.7); trunk.castShadow = true; g.add(trunk);
      const cols = [this.mOrange, this.mRed, this.mGold, this.mOrange];
      for (let i = 0; i < 5; i++) {
        const c = new THREE.Mesh(this.geo.sphereMid, cols[i % cols.length]);
        c.position.set(rand(-0.4, 0.4), 1.65 + rand(-0.12, 0.4), rand(-0.4, 0.4));
        c.scale.setScalar(rand(0.52, 0.82));
        c.castShadow = true; g.add(c);
      }
    } else {
      const trunk = new THREE.Mesh(this.geo.cylTaper, this.mTrunk);
      trunk.position.y = 0.75; trunk.scale.set(0.6, 0.95, 0.6); trunk.castShadow = true; g.add(trunk);
      const cols = [this.mPink, this.mPink2, this.mLeafG, this.mPink];
      for (let i = 0; i < 5; i++) {
        const c = new THREE.Mesh(this.geo.sphereMid, cols[i % cols.length]);
        c.position.set(rand(-0.35, 0.35), 1.55 + rand(-0.1, 0.42), rand(-0.35, 0.35));
        c.scale.setScalar(rand(0.5, 0.78));
        c.castShadow = true; g.add(c);
      }
    }
    if (Math.random() < 0.5 && typ !== 1) {
      const b = new THREE.Mesh(this.geo.sphereLo, typ === 3 ? this.mSnow : typ === 2 ? this.mOrange : this.mBush);
      b.position.set(rand(-0.3, 0.3), 0.22, rand(-0.3, 0.3));
      b.scale.set(0.35, 0.28, 0.35);
      g.add(b);
    }
    g.scale.setScalar(rand(0.9, 1.45));
    g.rotation.y = rand(0, Math.PI * 2);
    return g;
  }

  _makeFlower() {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(this.geo.cyl, this.mLeafG);
    stem.scale.set(0.02, 0.22, 0.02); stem.position.y = 0.11; g.add(stem);
    const petal = new THREE.Mesh(this.geo.sphereLo, pick(this.mFlower));
    petal.position.y = 0.24; petal.scale.set(0.08, 0.06, 0.08); g.add(petal);
    return g;
  }

  _obtainProp() { return this.propPool.pop() || { typ: '', mesh: null }; }
  _releaseProp(p) {
    if (p.mesh) { p.mesh.visible = false; this.propPool.push(p); }
  }

  _placeProp(kind, x, z, season) {
    const p = this._obtainProp();
    if (p.mesh) this.propG.remove(p.mesh);
    if (kind === 'tree') p.mesh = this._makeTree(season);
    else if (kind === 'flower') p.mesh = this._makeFlower();
    else {
      p.mesh = new THREE.Mesh(this.geo.sphereLo, season === 3 ? this.mSnow : season === 1 ? std(0xefe0b0) : this.mBush);
      p.mesh.scale.set(rand(0.25, 0.5), rand(0.18, 0.32), rand(0.25, 0.5));
      p.mesh.position.y = 0.15;
    }
    p.kind = kind;
    p.mesh.position.x = x;
    p.mesh.position.z = z;
    if (kind === 'tree') p.mesh.position.y = 0;
    p.mesh.visible = true;
    this.propG.add(p.mesh);
    this.props.push(p);
    return p;
  }

  _clearPathMeshes() {
    while (this.pathG.children.length) this.pathG.remove(this.pathG.children[0]);
    this._segMeshes.clear();
    this.chevL.length = 0;
    this.chevR.length = 0;
  }

  _pathMatFor(season) {
    const s = SEASONS[season];
    if (!this.pathMat) this.pathMat = std(s.path, { roughness: 0.9, map: pathTex() });
    this.pathMat.color.setHex(s.path);
    this.curbMat.color.setHex(s.pathDark);
    return this.pathMat;
  }

  _ensureSegMesh(seg, season, path) {
    const sig = [seg.type, seg.cap0 || '', seg.cap1 || '', Math.round(seg.length * 100), (seg.type === 'tee' ? (seg.chosen || 0) : 0), season].join(':');
    const existing = this._segMeshes.get(seg.id);
    if (existing && existing.userData.sig === sig) return existing;
    if (existing) {
      this.pathG.remove(existing);
      this._segMeshes.delete(seg.id);
    }
    const g = new THREE.Group();
    g.userData.segId = seg.id;
    g.userData.sig = sig;
    const mat = this._pathMatFor(season);
    const half = PATH_W * 0.5;
    if (seg.type === 'straight') {
      // Dirt plane and curbs stop exactly at the corner square. No overlap, so
      // coplanar faces cannot z-fight a hairline across the joint.
      let slabLen = Math.max(0.2, seg.length);
      let slabZ = 0;
      if (seg.cap0 === 'corner') { slabLen -= half; slabZ += half * 0.5; }
      if (seg.cap1 === 'corner') { slabLen -= half; slabZ -= half * 0.5; }
      slabLen = Math.max(0.2, slabLen);
      const slab = new THREE.Mesh(this.geo.pathSlab, mat);
      slab.rotation.x = -Math.PI / 2;
      slab.scale.set(PATH_W, slabLen, 1);
      slab.position.set(0, 0.10, slabZ);
      slab.receiveShadow = true;
      slab.castShadow = false;
      g.add(slab);
      let curbLen = seg.length;
      let curbZ = 0;
      if (seg.cap0 === 'corner') { curbLen -= half; curbZ += half * 0.5; }
      if (seg.cap1 === 'corner') { curbLen -= half; curbZ -= half * 0.5; }
      curbLen = Math.max(0.2, curbLen);
      const curbL = new THREE.Mesh(this.geo.curb, this.curbMat);
      const curbR = new THREE.Mesh(this.geo.curb, this.curbMat);
      curbL.scale.z = curbR.scale.z = curbLen;
      curbL.position.set(-PATH_W * 0.5, 0.12, curbZ);
      curbR.position.set(PATH_W * 0.5, 0.12, curbZ);
      // Curbs do not cast shadows — a thin shadow along the dirt read as a line.
      curbL.castShadow = curbR.castShadow = false;
      curbL.receiveShadow = curbR.receiveShadow = false;
      g.add(curbL, curbR);
      const mid = poseAtStraight(seg, (seg.dist0 + seg.dist1) * 0.5, 0);
      g.position.set(mid.x, 0, mid.z);
      g.rotation.y = seg.yaw0;
    } else {
      // One continuous corner piece (mitered UVs so the dirt reads as the same
      // road as the incoming and outgoing slabs). Gameplay heading still snaps
      // 90°; only the camera yaw still curves around the sharp gameplay snap.
      const typ = (seg.type === 'left' || seg.type === 'right' || seg.type === 'tee') ? seg.type : 'right';
      const tile = new THREE.Mesh(buildCornerTileGeom(typ), mat);
      tile.position.y = 0.021; // 1mm above the straight plane, kills joint z-fight
      tile.receiveShadow = true;
      tile.castShadow = false;
      g.add(tile);
      const edges = typ === 'tee' ? ['fwd']
        : typ === 'left' ? ['left', 'fwd']
        : typ === 'right' ? ['right', 'fwd']
        : ['left', 'right', 'fwd'];
      for (const e of edges) {
        const c = new THREE.Mesh(this.geo.curb, this.curbMat);
        c.scale.z = PATH_W;
        c.castShadow = false;
        c.receiveShadow = false;
        if (e === 'fwd') { c.position.set(0, 0.12, half); c.rotation.y = Math.PI / 2; }
        else if (e === 'left') { c.position.set(-half, 0.12, 0); }
        else { c.position.set(half, 0.12, 0); }
        g.add(c);
      }
      // Caps hide the 90° curb joints at the inner and outer corners of the L/T.
      const cap = (x, z) => {
        const k = new THREE.Mesh(this.geo.box, this.curbMat);
        k.scale.set(0.22, 0.22, 0.22);
        k.position.set(x, 0.12, z);
        k.castShadow = false;
        k.receiveShadow = false;
        g.add(k);
      };
      if (typ === 'right') { cap(half, half); cap(-half, -half); }
      else if (typ === 'left') { cap(-half, half); cap(half, -half); }
      else { cap(-half, half); cap(half, half); cap(-half, -half); cap(half, -half); }
      g.position.set(seg.x0, 0, seg.z0);
      g.rotation.y = seg.yaw0;
    }
    this.pathG.add(g);
    this._segMeshes.set(seg.id, g);
    return g;
  }

  _markPhaseExtra(path, beforeDist, lx) {
    let e = 0;
    const visit = (seg) => {
      if (!seg) return;
      if (seg.type !== 'left' && seg.type !== 'right' && seg.type !== 'tee') return;
      if (seg.dist0 >= beforeDist - 1e-6) return;
      const side = seg.chosen ? seg.chosen : (seg.type === 'left' ? -1 : seg.type === 'right' ? 1 : 0);
      if (!side) return;
      e += cornerArcRadius(lx, side) * Math.PI * 0.5 - PATH_W;
    };
    if (path) {
      for (const seg of path.segs) visit(seg);
      if (path.pendingCorner) visit(Object.assign({}, path.pendingCorner, { chosen: path.pendingCorner.chosen }));
    }
    return e;
  }

  _paintLaneMarks(g, seg, path) {
    return; // v5.0: no painted dashes or corner arcs on the road
    const pos = [], nor = [];
    const half = PATH_W * 0.5;
    const mid = (seg.dist0 + seg.dist1) * 0.5;
    if (seg.type === 'straight') {
      let d0 = seg.dist0;
      let d1 = seg.dist1;
      if (seg.cap0 === 'corner') d0 += half;
      if (seg.cap1 === 'corner') d1 -= half;
      if (d1 - d0 < 0.1) return;
      // If this is the outgoing side of a pending/committed corner, include that corner's extra.
      let cap0Side = 0;
      if (seg.cap0 === 'corner') cap0Side = seg.turnDir || 0;
      for (const lx of LANE_MARKS) {
        let extra = this._markPhaseExtra(path, seg.dist0 - 1e-4, lx);
        if (cap0Side) extra += cornerArcRadius(lx, cap0Side) * Math.PI * 0.5 - PATH_W;
        const z0 = d0 - mid, z1 = d1 - mid;
        _emitDashes(pos, nor, lx, z0, lx, z1, DASH_Y, d0 + extra);
      }
    } else {
      const typ = seg.type;
      const sides = typ === 'tee'
        ? (seg.chosen ? [seg.chosen] : [-1, 1])
        : typ === 'left' ? [-1]
        : typ === 'right' ? [1]
        : [];
      // Pending tee (no chosen yet): paint both exits.
      const paintSides = typ === 'tee' && !seg.chosen ? [-1, 1] : sides;
      for (const side of paintSides) {
        const C = cornerCenter(side);
        for (const lx of LANE_MARKS) {
          const extra = this._markPhaseExtra(path, seg.dist0 - 1e-4, lx);
          const r = cornerArcRadius(lx, side);
          const A = { x: lx, z: -half };
          const B = cornerExitPoint(lx, side);
          const a0 = Math.atan2(A.z - C.z, A.x - C.x);
          const a1 = Math.atan2(B.z - C.z, B.x - C.x);
          // Pick the sweep whose start heading matches incoming +Z.
          let dA = a1 - a0;
          while (dA > Math.PI) dA -= Math.PI * 2;
          while (dA < -Math.PI) dA += Math.PI * 2;
          const head = (da) => {
            // dp/dθ = r(-sin θ, cos θ) for increasing θ; flip if da < 0
            const sign = da >= 0 ? 1 : -1;
            const hz = sign * Math.cos(a0); // z component of heading at A
            return hz;
          };
          if (head(dA) < 0) {
            // flip to the other way around
            if (dA >= 0) dA -= Math.PI * 2; else dA += Math.PI * 2;
          }
          _emitArcDashes(pos, nor, C.x, C.z, r, a0, a0 + dA, DASH_Y, seg.dist0 - half + extra);
        }
      }
    }
    const mesh = finishDashMesh(pos, nor, this.dashMat);
    if (mesh) g.add(mesh);
  }

  _decorateSeg(seg, season) {
    if (seg._decorated === season + ':' + seg.id) return;
    seg._decorated = season + ':' + seg.id;
    if (seg.type !== 'straight') return;
    const step = 4.2;
    const path = this._pathRef;
    const pad = pathClearance();
    for (let d = seg.dist0 + 1.5; d < seg.dist1; d += step) {
      for (const side of [-1, 1]) {
        const lat = side * rand(5.6, 9.2);
        const pose = poseAtStraight(seg, d + rand(-0.8, 0.8), lat);
        if (path && onAnyPath(path, pose.x, pose.z, pad)) continue;
        this._placeProp('tree', pose.x, pose.z, season);
        if (Math.random() < 0.7) {
          const p2 = poseAtStraight(seg, d + 1.2, side * rand(5.4, 8.4));
          if (!(path && onAnyPath(path, p2.x, p2.z, pad))) this._placeProp('bush', p2.x, p2.z, season);
        }
        if (season === 0 && Math.random() < 0.8) {
          const p3 = poseAtStraight(seg, d + 0.6, side * rand(5.2, 7.8));
          if (!(path && onAnyPath(path, p3.x, p3.z, pad))) this._placeProp('flower', p3.x, p3.z, season);
        }
      }
    }
  }

  syncPath(path, season, playerDist) {
    this._pathRef = path;
    const visuals = path.visuals();
    const live = new Set(visuals.map(s => s.id));
    for (const [id, mesh] of this._segMeshes) {
      if (!live.has(id)) {
        this.pathG.remove(mesh);
        this._segMeshes.delete(id);
      }
    }
    for (const seg of visuals) {
      this._ensureSegMesh(seg, season, path);
      if (seg.dist1 > playerDist - 20) this._decorateSeg(seg, season);
    }
    this._syncChevrons(path);
    this._cullPropsOnPath(path);
  }

  _cullPropsOnPath(path) {
    const pad = pathClearance();
    for (const p of this.props) {
      if (!p.mesh) continue;
      const x = p.mesh.position.x, z = p.mesh.position.z;
      if (onAnyPath(path, x, z, pad)) p.mesh.visible = false;
    }
  }

  _syncChevrons(path) {
    // v4.7: no painted arrows / chevrons on the road. The only turn hint is the
    // "Swipe to turn" toast on the first corner.
    for (const c of this.chevL) this.pathG.remove(c);
    for (const c of this.chevR) this.pathG.remove(c);
    this.chevL.length = 0; this.chevR.length = 0;
  }

  setSeason(i, playerZ = 0, path = null) {
    this.season = i;
    const s = SEASONS[i];
    this.sky.material = makeSkyMat(s);
    this.ground.material = makeTerrainMat(s);
    this.terrainMat = this.ground.material;
    this.fogBase.setHex(s.fog);
    this.fogColor.copy(this.fogBase);
    this.scene.fog.color.copy(this.fogColor);
    this.hemi.color.setHex(s.light);
    this.hemi.groundColor.setHex(s.groundDark);
    this.dir.color.setHex(s.light);
    this.dir.position.set(s.sunDir[0] * 20, s.sunDir[1] * 20, s.sunDir[2] * 20);
    this.ocean.visible = false;
    const hillCol = [0x3d7a45, 0xd2b56a, 0xa44a1c, 0xe6eef8][i];
    this.hills.children.forEach((m, k) => {
      if (!m._hmat) { m._hmat = std(hillCol, { roughness: 0.92 }); m.material = m._hmat; }
      else m.material.color.setHex(hillCol);
      if (i === 3 && k % 2 === 0) m.material.color.lerp(new THREE.Color(0xffffff), 0.35);
    });
    for (const p of this.props) this._releaseProp(p);
    this.props.length = 0;
    this._clearPathMeshes();
    if (path) {
      for (const seg of path.segs) seg._decorated = '';
      this.syncPath(path, i, playerZ);
    }
    this._resetParticles(i);
    this._applyPhaseWash(this.phase, true);
  }

  _applyPhaseWash(phase, instant) {
    this.phase = phase;
    const sky = this.sky.material;
    if (!sky.uniforms || !sky.uniforms.uWash) return;
    if (phase === BLOOM) {
      sky.uniforms.uWash.value.setHex(0xff8fb3);
      sky.uniforms.uWashAmt.value = 0.22;
    } else {
      sky.uniforms.uWash.value.setHex(0x4a2a88);
      sky.uniforms.uWashAmt.value = 0.32;
      // a hint of teal on the horizon via wash is enough; also tint fog
    }
    const fogTarget = phase === BLOOM
      ? this.fogBase.clone().lerp(new THREE.Color(0xffd0de), 0.22)
      : this.fogBase.clone().lerp(new THREE.Color(0x2a1848), 0.35);
    if (instant) this.fogColor.copy(fogTarget);
    this._fogTarget = fogTarget;
    this.scene.fog.color.copy(this.fogColor);
  }

  _resetParticles(season) {
    while (this.particleG.children.length) this.particleG.remove(this.particleG.children[0]);
    this.particles.length = 0;
    const n = season === 1 ? 28 : 70;
    const mat = season === 0 ? std(0xffb0c8, { roughness: 0.6 })
      : season === 2 ? std(0xff7a2a, { roughness: 0.6 })
      : season === 3 ? std(0xffffff, { roughness: 0.8 })
      : std(0xffe9a0, { roughness: 0.5, transparent: true, opacity: 0.7 });
    const geo = this.geo.sphereLo;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat);
      if (season === 0) m.scale.set(0.11, 0.035, 0.08);
      else if (season === 2) m.scale.set(0.09, 0.025, 0.12);
      else if (season === 3) m.scale.setScalar(0.045);
      else m.scale.set(0.03, 0.03, 0.12);
      this.particleG.add(m);
      this.particles.push({
        mesh: m,
        x: rand(-8, 8), y: rand(0.6, 5), z: rand(-5, 70),
        vy: season === 3 ? rand(-1.2, -0.4) : rand(-0.6, -0.15),
        vx: rand(-0.3, 0.3),
        spin: rand(-3, 3)
      });
    }
  }

  burst(wx, wy, wz, phase) {
    const colA = PHASE_COL[phase], colB = PHASE_COL_B[phase];
    let used = 0;
    for (const b of this.fxBits) {
      if (b.life > 0 && used > 0) continue;
      if (used >= 20) break;
      if (b.life > 0) continue;
      b.life = rand(0.3, 0.6);
      b.x = wx + rand(-0.3, 0.3);
      b.y = wy + rand(0.3, 1.1);
      b.z = wz + rand(-0.3, 0.3);
      if (phase === BLOOM) {
        b.vx = rand(-1.6, 1.6); b.vy = rand(1.0, 2.8); b.vz = rand(-1.6, 1.6);
        b.mesh.scale.set(0.12, 0.04, 0.08);
      } else {
        b.vx = rand(-0.6, 0.6); b.vy = rand(0.4, 1.6); b.vz = rand(-2.4, 0.2);
        b.mesh.scale.setScalar(0.07);
      }
      b.mesh.material.color.setHex(used % 2 ? colA : colB);
      b.mesh.material.emissive.setHex(used % 2 ? colA : colB);
      b.mesh.material.opacity = 0.95;
      b.mesh.visible = true;
      b.mesh.position.set(b.x, b.y, b.z);
      used++;
    }
  }

  update(dt, playerZ, playerX, speed, phase, pose) {
    this.time += dt;
    const wx = pose ? pose.x : playerX;
    const wz = pose ? pose.z : playerZ;
    const yaw = pose ? pose.yaw : 0;
    const v = pose || yawVec(yaw);
    this.ground.position.set(wx, -0.04, wz);
    this.ground.rotation.y = yaw;
    this.ocean.position.set(wx + v.sx * 22 + v.fx * 8, -0.12, wz + v.sz * 22 + v.fz * 8);
    this.ocean.rotation.y = yaw;
    if (this.ocean.visible) this.oceanMat.uniforms.uTime.value = this.time;
    this.sky.position.set(wx, 0, wz);
    this.hills.position.set(wx + v.fx * 8, 0, wz + v.fz * 8);
    this.hills.rotation.y = yaw;
    this.dirTarget.position.set(wx, 0, wz + 4);
    this.dir.position.set(wx + 8, 16, wz - 4);

    if (this._fogTarget) {
      this.fogColor.lerp(this._fogTarget, clamp(3 * dt, 0, 1));
      this.scene.fog.color.copy(this.fogColor);
    }
    if (this.sky.material.uniforms && this.sky.material.uniforms.uWashAmt) {
      const want = phase === AURORA ? 0.32 : 0.22;
      const u = this.sky.material.uniforms.uWashAmt;
      u.value = lerp(u.value, want, clamp(4 * dt, 0, 1));
    }

    const typ = this.season;
    for (const p of this.particles) {
      p.z -= speed * dt * (typ === 1 ? 0.4 : 0.15);
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      if (p.y < 0.05 || (pose && ((p.x - wx) * v.fx + (p.z - wz) * v.fz) < -8)) {
        p.y = rand(1.5, 5.5);
        p.x = wx + v.sx * rand(-8, 8) + v.fx * rand(6, 50);
        p.z = wz + v.sz * rand(-8, 8) + v.fz * rand(6, 50);
      }
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.z += p.spin * 0.7 * dt;
    }

    for (const b of this.fxBits) {
      if (b.life <= 0) { b.mesh.visible = false; continue; }
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.vy -= 3.5 * dt;
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.material.opacity = Math.max(0, b.life * 2);
      b.mesh.rotation.z += dt * 4;
      if (b.life <= 0) b.mesh.visible = false;
    }
  }
}

// ---------------- entities ----------------
function makeBloomEmblem() {
  const g = new THREE.Group();
  const m = std(0xffffff, { emissive: 0xff8fb3, emissiveIntensity: 0.85, roughness: 0.4 });
  const mid = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), m);
  g.add(mid);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m);
    const a = (i / 5) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0);
    p.scale.set(1.15, 0.7, 0.5);
    g.add(p);
  }
  return g;
}
function makeAuroraEmblem() {
  const g = new THREE.Group();
  const m = std(0xffffff, { emissive: 0x7cffcf, emissiveIntensity: 0.85, roughness: 0.35 });
  const m2 = std(0xffffff, { emissive: 0x7b4dff, emissiveIntensity: 0.7, roughness: 0.35 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 18, Math.PI * 1.2), m);
  arc.rotation.z = -0.3;
  g.add(arc);
  const arc2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 8, 16, Math.PI), m2);
  arc2.rotation.z = 0.4;
  arc2.position.y = -0.02;
  g.add(arc2);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), m));
  return g;
}

class Pools {
  constructor(scene, geo) {
    this.scene = scene;
    this.geo = geo;
    this.coins = [];
    this.gates = [];
    this.obs = [];
    this._hurdleTpl = [null, null, null, null];
    this.hurdlesReady = false;
    for (let i = 0; i < 72; i++) this.coins.push(this._coin());
    for (let i = 0; i < 16; i++) this.gates.push(this._gate());
    for (let i = 0; i < 56; i++) this.obs.push(this._obs());
  }
  _coin() {
    const g = new THREE.Group();
    const m = std(0xff8fb3, { roughness: 0.25, metalness: 0.28, emissive: 0xe85a8c, emissiveIntensity: 0.35 });
    const body = new THREE.Mesh(this.geo.coin, m);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    g.add(body);
    const rim = new THREE.Mesh(this.geo.coinI, std(0xffd0de, { roughness: 0.3, metalness: 0.4, emissive: 0xff8fb3, emissiveIntensity: 0.2 }));
    rim.rotation.y = Math.PI / 2;
    g.add(rim);
    g.visible = false;
    this.scene.add(g);
    return { type: 'coin', mesh: g, body, rim, live: false, lane: 0, z: 0, h: 0, taken: false, phase: BLOOM };
  }
  styleCoin(o, phase) {
    o.phase = phase;
    const a = PHASE_COL[phase], b = PHASE_COL_B[phase];
    o.body.material.color.setHex(a);
    o.body.material.emissive.setHex(b);
    o.rim.material.color.setHex(phase === BLOOM ? 0xffd0de : 0xc8b8ff);
    o.rim.material.emissive.setHex(a);
  }
  _gate() {
    const g = new THREE.Group();
    const pillarGeo = new THREE.CapsuleGeometry(0.22, 1.45, 6, 12);
    const beamGeo = new THREE.CapsuleGeometry(0.16, GATE_ALL_HALF * 2, 6, 10);
    const panelGeo = new THREE.BoxGeometry(GATE_ALL_HALF * 2, 1.55, 0.05);
    const mSolid = std(0xff8fb3, { roughness: 0.32, emissive: 0xff8fb3, emissiveIntensity: 0.45, transparent: true, opacity: 0.48, depthWrite: false });
    const mFrame = std(0xff8fb3, { roughness: 0.32, emissive: 0xe85a8c, emissiveIntensity: 0.4 });
    const left = new THREE.Mesh(pillarGeo, mFrame); left.position.set(-GATE_ALL_HALF, 0.95, 0); left.castShadow = true;
    const right = new THREE.Mesh(pillarGeo, mFrame); right.position.set(GATE_ALL_HALF, 0.95, 0); right.castShadow = true;
    const top = new THREE.Mesh(beamGeo, mFrame); top.position.set(0, 1.82, 0); top.rotation.z = Math.PI / 2;
    const capL = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), mFrame); capL.position.set(-GATE_ALL_HALF, 1.82, 0);
    const capR = capL.clone(); capR.position.x = GATE_ALL_HALF;
    const panel = new THREE.Mesh(panelGeo, mSolid); panel.position.set(0, 0.95, 0);
    const bloom = makeBloomEmblem(); bloom.position.set(0, 1.05, 0.14); bloom.scale.setScalar(1.45);
    const aurora = makeAuroraEmblem(); aurora.position.set(0, 1.05, 0.14); aurora.scale.setScalar(1.45);
    g.add(left, right, top, capL, capR, panel, bloom, aurora);
    g.visible = false;
    this.scene.add(g);
    return { type: 'gate', mesh: g, live: false, lane: 0, z: 0, phase: 0, span: 'all', panel, mSolid, mFrame, bloom, aurora, left, right, top, capL, capR, crawl: 0 };
  }
  _obs() {
    const g = new THREE.Group();
    g.visible = false;
    this.scene.add(g);
    return { type: 'low', mesh: g, live: false, lane: 0, z: 0, height: HURDLE_H, kind: 'low', built: '', nearMissed: false, span: 'lane', cover: [0], clearance: HURDLE_CLEAR };
  }
  obtain(list) {
    for (const o of list) if (!o.live) return o;
    return null;
  }
  releaseAll() {
    for (const list of [this.coins, this.gates, this.obs]) {
      for (const o of list) { o.live = false; o.mesh.visible = false; o.taken = false; o.nearMissed = false; }
    }
  }
  styleGate(o, phase, span) {
    const c = PHASE_COL[phase], c2 = PHASE_COL_B[phase];
    o.phase = phase;
    o.span = span;
    o.mSolid.color.setHex(c);
    o.mSolid.emissive.setHex(c2);
    o.mFrame.color.setHex(c);
    o.mFrame.emissive.setHex(c2);
    o.mFrame.emissiveIntensity = 0.45;
    o.bloom.visible = phase === BLOOM;
    o.aurora.visible = phase === AURORA;
    if (span === 'all') {
      o.left.position.x = -GATE_ALL_HALF; o.right.position.x = GATE_ALL_HALF;
      if (o.capL) o.capL.position.x = -GATE_ALL_HALF;
      if (o.capR) o.capR.position.x = GATE_ALL_HALF;
      o.top.scale.x = 1;
      o.panel.scale.x = 1;
    } else {
      const h = 0.52;
      o.left.position.x = -h; o.right.position.x = h;
      if (o.capL) o.capL.position.x = -h;
      if (o.capR) o.capR.position.x = h;
      o.top.scale.x = (h * 2) / (GATE_ALL_HALF * 2);
      o.panel.scale.x = (h * 2) / (GATE_ALL_HALF * 2);
    }
  }
  setGateSolid(o, solid, dt) {
    o.mSolid.opacity = solid ? 0.52 : 0.12;
    o.mSolid.emissiveIntensity = solid ? 0.6 : 0.12;
    o.mSolid.transparent = true;
    o.mSolid.depthWrite = false;
    o.crawl = (o.crawl || 0) + (dt || 0);
    const crawl = o.phase === AURORA ? 0.22 * Math.sin(o.crawl * 2.3) : 0;
    o.mFrame.emissiveIntensity = (solid ? 0.5 : 0.18) + crawl;
    o.panel.scale.z = solid ? 1 : 0.4;
  }

  async loadHurdles() {
    const loader = new GLTFLoader();
    const loaded = await Promise.all(HURDLE_MODELS.map(url => loader.loadAsync(url)));
    for (let s = 0; s < 4; s++) {
      const scene = loaded[s].scene;
      scene.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this._hurdleTpl[s] = scene;
    }
    this.hurdlesReady = true;
  }
  _fitHurdle(inst, season, span, width) {
    if (season === 2) {
      const groups = [];
      inst.traverse(o => {
        if (/^Pumpkin[ABC]$/.test(o.name)) groups.push(o);
      });
      groups.sort((a, b) => a.name.localeCompare(b.name));
      if (span === 'lane' && groups.length >= 3) {
        groups[0].visible = false;
        groups[2].visible = false;
      } else if (span === 'wide' && groups.length >= 3) {
        groups[0].visible = false;
        inst.position.x -= 0.65;
      }
      return;
    }
    const ref = HURDLE_REF_WIDTH;
    if (width > 0.1 && Math.abs(width - ref) > 0.05) inst.scale.x = width / ref;
  }

  buildObs(o, kind, season) {
    const mesh = o.mesh;
    while (mesh.children.length) mesh.remove(mesh.children[0]);
    o.kind = kind;
    o.nearMissed = false;
    if (kind === 'high') {
      o.type = 'high';
      o.height = 1.7;
      o.clearance = 0;
      const span = o.span || 'lane';
      const half = span === 'all' ? (HURDLE_W_ALL * 0.5) : (span === 'wide' ? (HURDLE_W_WIDE * 0.5) : (HURDLE_W_LANE * 0.5));
      const barLen = Math.max(0.4, half * 2 - 0.12);
      const postM = std(0x5a4630, { roughness: 0.65 });
      const barC = [0xff8fb3, 0x4ec4d6, 0xff7a2a, 0x9fe8ff][season];
      const p1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.55, 5, 10), postM);
      const p2 = p1.clone();
      p1.position.set(-half, 0.9, 0); p2.position.set(half, 0.9, 0);
      p1.castShadow = true; p2.castShadow = true;
      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, barLen, 5, 10), std(barC, { emissive: barC, emissiveIntensity: 0.4 }));
      bar.rotation.z = Math.PI / 2; bar.position.y = 0.95; bar.castShadow = true;
      const bar2 = bar.clone(); bar2.position.y = 1.42;
      mesh.add(p1, p2, bar, bar2);
    } else {
      // Low jumpables: Blender-authored season hurdles (hedge, log, pumpkins, snowbank).
      o.type = 'low';
      o.height = HURDLE_H;
      o.clearance = HURDLE_CLEAR;
      const span = o.span || 'lane';
      const width = span === 'all' ? HURDLE_W_ALL : (span === 'wide' ? HURDLE_W_WIDE : HURDLE_W_LANE);
      const tpl = this._hurdleTpl[season];
      if (tpl) {
        const inst = tpl.clone(true);
        this._fitHurdle(inst, season, span, width);
        mesh.add(inst);
      }
    }
    o.built = season + kind + (o.span || '');
  }
}

// ---------------- tilt ----------------
class TiltSteer {
  constructor() {
    this.enabled = false;
    this.hasDevice = false;
    this.raw = 0;
    this.filtered = 0;
    this.neutral = 0;
    this.calibrated = false;
    this.armed = true;
    this._bound = false;
    this._lastEvt = 0;
  }
  async request() {
    const ask = async (C) => {
      if (typeof C !== 'undefined' && typeof C.requestPermission === 'function') {
        try { return await C.requestPermission(); } catch (e) { return 'denied'; }
      }
      return 'granted';
    };
    const a = await ask(window.DeviceOrientationEvent);
    if (typeof window.DeviceMotionEvent !== 'undefined' && typeof window.DeviceMotionEvent.requestPermission === 'function') {
      try { await window.DeviceMotionEvent.requestPermission(); } catch (e) {}
    }
    if (a === 'granted' || a === 'denied' || true) this._listen();
    return a;
  }
  _listen() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener('deviceorientation', ev => {
      if (ev.gamma == null) return;
      this.hasDevice = true;
      this._lastEvt = performance.now();
      // Portrait: gamma is left/right tilt. A right tilt (positive gamma) steers right.
      this.raw = ev.gamma;
      if (!this.calibrated) { this.neutral = this.raw; this.calibrated = true; }
    });
  }
  calibrate() {
    this.neutral = this.raw;
    this.calibrated = true;
    this.filtered = 0;
    this.armed = true;
  }
  live() {
    return this.hasDevice && (performance.now() - this._lastEvt) < 1500;
  }
  inject(gamma, neutral) {
    this._listen();
    this.hasDevice = true;
    this._lastEvt = performance.now();
    if (neutral != null) { this.neutral = neutral; this.calibrated = true; }
    this.raw = gamma;
    if (!this.calibrated) { this.neutral = 0; this.calibrated = true; }
  }
  angle() {
    if (!this.live()) return this.filtered;
    const x = this.raw - this.neutral;
    this.filtered += (x - this.filtered) * 0.4;
    if (Math.abs(this.filtered) <= TILT_TURN_OFF) this.armed = true;
    return this.filtered;
  }
  // Edge-triggered: +1 right, -1 left, 0 none. Call only inside a turn window
  // so a held tilt still fires once on entry, then needs a return to neutral.
  pollTurn() {
    const f = this.angle();
    if (!this.live()) return 0;
    if (!this.armed) return 0;
    if (f >= TILT_FULL) { this.armed = false; return 1; }
    if (f <= -TILT_FULL) { this.armed = false; return -1; }
    return 0;
  }
  // Analog steer in [-1, 1]. +1 is player-right (screen-right).
  steerAmt() {
    const f = this.angle();
    if (!this.live()) return 0;
    const mag = Math.abs(f);
    if (mag <= TILT_DEADZONE) return 0;
    return Math.sign(f) * clamp((mag - TILT_DEADZONE) / (TILT_FULL - TILT_DEADZONE), 0, 1);
  }
}

// ---------------- game ----------------
class Game {
  constructor() {
    this.save = loadSave();
    this.state = 'home';
    this.season = this.save.season | 0;
    this.geo = geoCache();
    this.music = new Music();
    this.music.setMuted(!!this.save.muted);
    Sfx.setMuted(!!this.save.muted);
    this.path = new PathSystem();
    this.tilt = new TiltSteer();

    this.canvas = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(54, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 220);
    this.scene.add(this.camera);
    this.clock = new THREE.Clock();

    this.world = new World(this.scene, this.geo);
    this.penguin = new Penguin();
    this.scene.add(this.penguin.root);

    this.pools = new Pools(this.scene, this.geo);

    this.streaks = [];
    const sMat = std(0xffffff, { transparent: true, opacity: 0.0, depthWrite: false });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(this.geo.streak, sMat.clone());
      m.visible = false;
      this.scene.add(m);
      this.streaks.push({ mesh: m, x: 0, y: 0, z: 0 });
    }

    this.lane = 0; this.px = 0; this.pxVel = 0; this.pz = 0;
    this.wx = 0; this.wz = 0; this.yaw = 0;
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = BLOOM; this.phaseCd = 0;
    this.speed = 11; this.elapsed = 0; this.dist = 0;
    this.score = 0; this.runCoins = 0;
    this.shake = 0; this.deadT = 0; this.invuln = 0;
    this.prevPz = 0; this.hitZ = null; this.stoppedAt = null; this._stepStamp = null;
    this.camX = 0; this.camTilt = 0; this.camFov = 54;
    this.camYaw = 0;
    this.fovKick = 0;
    this.snap = null; this.snapAt = null; this.snapDir = 0;
    this.turnLean = 0;
    this.spawnZ = 0; this.rowCount = 0; this.lastGate = -10;
    this.lastHurdleZ = 0; this.lastHazardZ = 0;
    this.camTurn = null; this.turnPoseT = 0; this.turnPoseDir = 0;
    this.lean = 0;
    this.homeOff = 0;
    this.toastT = 0;
    this.turnBuf = 0; this.turnBufT = 0;
    this._keySteerL = false; this._keySteerR = false;
    this._steerWhooshT = 0;
    this.offPath = false;
    this.pose = { x: 0, z: 0, yaw: 0, fx: 0, fz: 1, sx: 1, sz: 0 };
    this._deskTilt = 0;
    this._v = new THREE.Vector3();

    this._bindUI();
    this._bindInput();
    this._goHome(true);
    this._applySeasonVisuals(this.season, true);
    this._resize();
    window.addEventListener('resize', () => this._resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clock.getDelta(); });

    this._expose();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _resize() {
    const w = window.innerWidth, h = Math.max(1, window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(w, h);
  }

  _bindUI() {
    this.$ = {
      home: document.getElementById('home'),
      hud: document.getElementById('hud'),
      shop: document.getElementById('shop'),
      over: document.getElementById('over'),
      toast: document.getElementById('toast'),
      track: document.getElementById('season-track'),
      countdown: document.getElementById('countdown'),
      countNum: document.querySelector('#countdown span'),
      dots: document.getElementById('dots'),
      homeCoins: document.getElementById('home-coins'),
      shopCoins: document.getElementById('shop-coins'),
      shopList: document.getElementById('shop-list'),
      mute: document.getElementById('btn-mute'),
      score: document.getElementById('hud-score'),
      hudCoins: document.getElementById('hud-coin-n'),
      form: document.getElementById('hud-form'),
      overTitle: document.getElementById('over-title'),
      overScore: document.getElementById('over-score'),
      overBest: document.getElementById('over-best'),
      overCoins: document.getElementById('over-coins'),
      overNew: document.getElementById('over-new')
    };
    document.getElementById('btn-start').addEventListener('click', ev => { ev.stopPropagation(); Sfx.unlock(); this.music.unlock(); this._requestMotion(); this.startRun(); });
    document.getElementById('btn-shop').addEventListener('click', ev => { ev.stopPropagation(); this.openShop(); });
    document.getElementById('btn-shop-close').addEventListener('click', ev => { ev.stopPropagation(); this.closeShop(); });
    document.getElementById('tab-upgrades').addEventListener('click', ev => { ev.stopPropagation(); this.shopTab = 'upgrades'; this.renderShop(); });
    document.getElementById('tab-costumes').addEventListener('click', ev => { ev.stopPropagation(); this.shopTab = 'costumes'; this.renderShop(); });
    document.getElementById('btn-retry').addEventListener('click', ev => { ev.stopPropagation(); Sfx.unlock(); this.music.unlock(); this._requestMotion(); this.startRun(); });
    document.getElementById('btn-home').addEventListener('click', ev => { ev.stopPropagation(); this._goHome(); });
    this.$.mute.addEventListener('click', ev => {
      ev.stopPropagation();
      this.save.muted = !this.save.muted;
      this.music.setMuted(this.save.muted);
      Sfx.setMuted(this.save.muted);
      saveSave(this.save);
      this._refreshMute();
    });
    this.shopTab = 'upgrades';
    [...this.$.dots.children].forEach((d, i) => {
      d.addEventListener('click', ev => { ev.stopPropagation(); this._setSeason(i, false); });
    });
    this._refreshMute();
    this._refreshCoins();
  }

  _refreshMute() {
    this.$.mute.textContent = this.save.muted ? '♪̸' : '♪';
    this.$.mute.style.opacity = this.save.muted ? '0.55' : '1';
  }
  _refreshCoins() {
    this.$.homeCoins.textContent = this.save.coins | 0;
    this.$.shopCoins.textContent = this.save.coins | 0;
  }

  _requestMotion() {
    this.tilt.request().then(() => this.tilt.calibrate());
    this.tilt.calibrate();
  }

  _bindInput() {
    this.sw = null;
    const down = (x, y, target) => {
      Sfx.unlock(); this.music.unlock();
      if (target && target.closest && target.closest('.hit, button, .sheet')) return;
      this.sw = { x, y, t: performance.now(), done: false };
    };
    const move = (x, y) => {
      if (!this.sw || this.sw.done) return;
      const dx = x - this.sw.x, dy = y - this.sw.y;
      if (this.state === 'home') {
        this.homeOff = dx;
        this._layoutHome(true);
        return;
      }
      if (this.state !== 'play') return;
      const horiz = Math.abs(dx) > Math.abs(dy);
      // Dominant axis. A short horizontal swipe is a turn, never a tap.
      if (horiz && Math.abs(dx) >= 24) {
        this.sw.done = true; this._swipe(dx, dy);
        return;
      }
      if (!horiz && Math.abs(dy) >= 40) {
        this.sw.done = true; this._swipe(dx, dy);
        return;
      }
    };
    const up = (x, y) => {
      if (!this.sw) return;
      const dx = x - this.sw.x, dy = y - this.sw.y;
      if (!this.sw.done) {
        if (this.state === 'home') {
          const vw = Math.max(1, window.innerWidth);
          if (Math.abs(dx) > Math.max(40, vw * 0.12) && Math.abs(dx) > Math.abs(dy)) {
            this._setSeason(this.season + (dx < 0 ? 1 : -1), false);
          } else {
            this.homeOff = 0;
            this._layoutHome(false);
          }
        } else if (this.state === 'play') {
          const dist = Math.hypot(dx, dy);
          const horiz = Math.abs(dx) > Math.abs(dy);
          if (horiz && Math.abs(dx) >= 24) this._swipe(dx, dy);
          else if (!horiz && Math.abs(dy) >= 40) this._swipe(dx, dy);
          else if (dist < 24) this._tap();
        }
      } else if (this.state === 'home') {
        this.homeOff = 0;
        this._layoutHome(false);
      }
      this.sw = null;
    };
    const evXY = e => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      return [t.clientX, t.clientY, e.target];
    };
    window.addEventListener('touchstart', () => { Sfx.unlock(); this.music.unlock(); }, { passive: true });
    window.addEventListener('pointerdown', e => { const [x, y, t] = evXY(e); down(x, y, t); });
    window.addEventListener('pointermove', e => { const [x, y] = evXY(e); move(x, y); });
    window.addEventListener('pointerup', e => { const [x, y] = evXY(e); up(x, y); });
    window.addEventListener('pointercancel', () => { this.sw = null; this.homeOff = 0; if (this.state === 'home') this._layoutHome(false); });
    window.addEventListener('keydown', e => {
      Sfx.unlock(); this.music.unlock();
      const k = e.code;
      if (this.state === 'home') {
        if (k === 'ArrowLeft' || k === 'KeyA') this._setSeason(this.season - 1, false);
        if (k === 'ArrowRight' || k === 'KeyD') this._setSeason(this.season + 1, false);
        if (k === 'Space' || k === 'Enter') { this._requestMotion(); this.startRun(); }
        if (k === 'KeyM') this.$.mute.click();
        return;
      }
      if (this.state === 'shop') { if (k === 'Escape') this.closeShop(); return; }
      if (this.state === 'over') {
        if (k === 'Space' || k === 'Enter') { this._requestMotion(); this.startRun(); }
        if (k === 'Escape' || k === 'KeyH') this._goHome();
        return;
      }
      if (this.state === 'countdown') {
        if (k === 'ArrowLeft' || k === 'KeyA' || k === 'ArrowRight' || k === 'KeyD') this._requestMotion();
        return;
      }
      if (this.state !== 'play') return;
      if (k === 'ArrowLeft') { this._keySteerL = true; e.preventDefault(); }
      else if (k === 'ArrowRight') { this._keySteerR = true; e.preventDefault(); }
      else if (k === 'KeyA' || k === 'KeyQ' || k === 'Comma') this.turn(-1);
      else if (k === 'KeyD' || k === 'KeyE' || k === 'Period') this.turn(1);
      else if (k === 'ArrowUp' || k === 'KeyW') this.jump();
      else if (k === 'ArrowDown' || k === 'KeyS') this.slide();
      else if (k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight') this.togglePhase();
    });
    window.addEventListener('keyup', e => {
      const k = e.code;
      if (k === 'ArrowLeft') this._keySteerL = false;
      else if (k === 'ArrowRight') this._keySteerR = false;
    });
    window.addEventListener('blur', () => { this._keySteerL = false; this._keySteerR = false; });
    document.addEventListener('gesturestart', e => e.preventDefault());
  }

  _swipe(dx, dy) {
    this.lastInput = { type: 'swipe', dx, dy, state: this.state };
    if (this.state !== 'play') return;
    if (Math.abs(dx) > Math.abs(dy)) this.turn(dx > 0 ? 1 : -1);
    else if (dy < 0) this.jump(); else this.slide();
  }
  _tap() {
    if (this.state === 'play') this.togglePhase();
  }
  move(d, fromTilt = false) {
    // Lanes are gone. Kept as a no-op so leftover callers cannot snap the panda.
  }
  turn(dir) {
    if (this.state !== 'play' || this.offPath) return;
    this.turnBuf = dir < 0 ? -1 : 1;
    this.turnBufT = 0.5;
    this.lastInput = Object.assign(this.lastInput || {}, { turn: this.turnBuf });
    this._tryConsumeTurn();
  }
  jump() {
    this.lastInput = Object.assign(this.lastInput || {}, { jumpTry: true, jumpY: this.jumpY, slideT: this.slideT, state: this.state });
    if (this.jumpY <= 0.02 && this.slideT <= 0.08) { this.jumpV = 8.6; this.jumpY = Math.max(this.jumpY, 0.08); this.slideT = 0; Sfx.jump(); this.lastInput.jumped = true; }
  }
  slide() {
    if (this.jumpY > 0.02) this.jumpV = -12;
    this.slideT = 0.62; Sfx.slide();
  }
  togglePhase() {
    if (this.state !== 'play' || this.phaseCd > 0) return;
    this.phase ^= 1; this.phaseCd = 0.18;
    Sfx.phase(this.phase);
    this.penguin.setForm(this.phase, false);
    this.world.fill.color.setHex(PHASE_COL[this.phase]);
    this.world._applyPhaseWash(this.phase, false);
    this.world.burst(this.wx, 0.8 + this.jumpY, this.wz, this.phase);
    this.fovKick = Math.max(this.fovKick, 5);
    this._formUI();
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
  }

  _turnWindow(speed) {
    // Earlier swipe-to-turn window (~half a second), restored now that tilt no longer turns.
    return { before: Math.max(2.8, 0.38 * speed), after: Math.max(1.05, 0.14 * speed) };
  }
  _tryConsumeTurn() {
    const p = this.path.pending;
    if (!p || p.committed || !this.turnBuf) return false;
    const w = this._turnWindow(this.speed);
    if (this.pz < p.dist - w.before || this.pz > p.dist + w.after) return false;
    const cornerDist = p.dist;
    const dir = this.turnBuf;
    if (this.path.commit(dir, this.elapsed)) {
      Sfx.turn();
      this.fovKick = Math.max(this.fovKick, 3.5);
      this.shake = Math.max(this.shake, 0.1);
      this.turnBuf = 0; this.turnBufT = 0;
      this.snapAt = cornerDist;
      this.snapDir = dir;
      if (this.pz >= cornerDist - 0.25) this._beginSnap(dir);
      this.world.syncPath(this.path, this.season, this.pz);
      this._ensureSpawn();
      return true;
    }
    return false;
  }
  _missTurn() {
    if (this.offPath || this.ignoreHit) return;
    this.offPath = true;
    const v = yawVec(this.yaw);
    this.offVelX = v.fx * this.speed;
    this.offVelZ = v.fz * this.speed;
    this.offVelY = 1.6;
    this.shake = 0.45;
    this.fovKick = 8;
    this.snap = null; this.snapAt = null;
    this.camTurn = null;
  }
  _beginSnap(dir) {
    const destYaw = turnYaw(this.yaw, dir);
    this.snap = {
      t: 0,
      dur: SNAP_DUR,
      dir,
      yaw0: this.yaw,
      destYaw,
      x0: this.wx,
      z0: this.wz
    };
    this.camTurn = {
      t: 0,
      dur: CAM_TURN_DUR,
      yaw0: this.camYaw != null ? this.camYaw : this.yaw,
      yaw1: destYaw
    };
    this.turnPoseT = TURN_POSE_DUR;
    this.turnPoseDir = dir;
    this.snapAt = null;
  }

  _setSeason(i, snap) {
    const n = (i + 4) % 4;
    if (n === this.season && !snap) {
      this.homeOff = 0;
      this._layoutHome(false);
      this.music.play(n, false);
      return;
    }
    this.season = n;
    this.save.season = n;
    saveSave(this.save);
    this.homeOff = 0;
    this._applySeasonVisuals(n, !!snap);
    this._layoutHome(!!snap);
    this.music.play(n, snap);
  }
  _layoutHome(instant) {
    if (!this.$.track) return;
    const vw = Math.max(1, window.innerWidth);
    const x = -this.season * 25 + (this.homeOff / vw) * 25;
    this.$.track.style.transition = instant ? 'none' : 'transform 0.32s cubic-bezier(.2,.8,.2,1)';
    this.$.track.style.transform = 'translateX(' + x + '%)';
    const nearest = ((Math.round(this.season - this.homeOff / vw) % 4) + 4) % 4;
    [...this.$.dots.children].forEach((d, k) => d.classList.toggle('on', k === nearest));
  }
  _applySeasonVisuals(i, snap) {
    const s = SEASONS[i];
    document.documentElement.style.setProperty('--accent', hexCol(s.accent));
    [...this.$.dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    this.world.setSeason(i, this.pz, this.path);
    this.penguin.setCostume(this.save.equipped);
  }
  _hideCount() {
    if (this.$.countdown) this.$.countdown.classList.add('hidden');
    if (this.$.countNum) this.$.countNum.classList.remove('show');
  }
  _tickCountdown(dt) {
    this.countT -= dt;
    const t = this.countT;
    let label, idx;
    if (t > 2.2) { label = '3'; idx = 3; }
    else if (t > 1.2) { label = '2'; idx = 2; }
    else if (t > 0.4) { label = '1'; idx = 1; }
    else if (t > 0) { label = 'GO'; idx = 0; }
    else {
      this._hideCount();
      this.state = 'play';
      this.tilt.calibrate();
      this.toast('Tilt to steer · Swipe to turn', 2.2);
      return;
    }
    if (idx !== this._countShown) {
      this._countShown = idx;
      const el = this.$.countdown, span = this.$.countNum;
      if (el && span) {
        el.classList.remove('hidden');
        span.classList.remove('show');
        span.textContent = label;
        void span.offsetWidth;
        span.classList.add('show');
      }
      if (idx === 0) Sfx.go(); else Sfx.tick();
    }
  }

  _goHome(first = false) {
    this.state = 'home';
    this._hideCount();
    this.homeOff = 0;
    this.pz = 0; this.px = 0; this.pxVel = 0; this.lane = 0;
    this.wx = 0; this.wz = 0; this.yaw = 0;
    this.camYaw = 0;
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.speed = 10.5; this.elapsed = 0;
    this.offPath = false;
    this.snap = null; this.snapAt = null; this.snapDir = 0;
    this.turnLean = 0;
    this.path.resetPreview();
    this.pools.releaseAll();
    this.penguin.root.position.set(0, 0, 0);
    this.penguin.root.rotation.set(0, 0, 0);
    this.penguin.setCostume(this.save.equipped);
    this.world.setSeason(this.season, 0, this.path);
    this.$.home.classList.remove('hidden');
    this.$.hud.classList.add('hidden');
    this.$.shop.classList.add('hidden');
    this.$.over.classList.add('hidden');
    this._refreshCoins();
    this._refreshMute();
    if (!first) this.music.play(this.season, false);
    this._layoutHome(true);
  }

  openShop() {
    if (this.state !== 'home' && this.state !== 'shop') return;
    this.state = 'shop';
    this.$.home.classList.add('hidden');
    this.$.shop.classList.remove('hidden');
    this.renderShop();
  }
  closeShop() {
    this.$.shop.classList.add('hidden');
    this.$.home.classList.remove('hidden');
    this.state = 'home';
    this.penguin.setCostume(this.save.equipped);
  }
  renderShop() {
    this._refreshCoins();
    document.getElementById('tab-upgrades').classList.toggle('on', this.shopTab === 'upgrades');
    document.getElementById('tab-costumes').classList.toggle('on', this.shopTab === 'costumes');
    const box = this.$.shopList;
    box.innerHTML = '';
    if (this.shopTab === 'upgrades') {
      UPGRADES.forEach(u => {
        const lv = this.save.upgrades[u.id] | 0;
        const max = lv >= u.prices.length;
        const price = max ? 0 : u.prices[lv];
        const row = document.createElement('div');
        row.className = 'up-row';
        const pips = Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
        row.innerHTML = `<div class="meta"><div class="name">${u.name}</div><div class="blurb">${u.blurb}</div><div class="pips">${pips}</div></div>`;
        const btn = document.createElement('button');
        btn.className = 'buy hit';
        btn.textContent = max ? 'MAX' : price;
        btn.disabled = max || this.save.coins < price;
        btn.addEventListener('click', ev => { ev.stopPropagation(); this._buyUp(u.id); });
        row.appendChild(btn);
        box.appendChild(row);
      });
    } else {
      COSTUMES.forEach(c => {
        const owned = !!this.save.owned[c.id];
        const eq = this.save.equipped === c.id;
        const row = document.createElement('div');
        row.className = 'cos-row';
        row.innerHTML = `<div class="swatch" style="background:${hexCol(c.hoodie)}"></div><div class="meta"><div class="name">${c.name}</div><div class="blurb">${owned ? (eq ? 'Equipped' : 'Owned') : 'Unlock with coins'}</div></div>`;
        const btn = document.createElement('button');
        btn.className = 'equip hit' + (eq ? ' on' : '');
        btn.textContent = eq ? 'ON' : (owned ? 'WEAR' : String(c.price));
        btn.disabled = eq;
        btn.addEventListener('click', ev => { ev.stopPropagation(); this._buyCos(c.id); });
        row.appendChild(btn);
        box.appendChild(row);
      });
    }
  }
  _buyUp(id) {
    const u = UPGRADES.find(x => x.id === id); if (!u) return;
    const lv = this.save.upgrades[id] | 0;
    if (lv >= u.prices.length) return;
    const price = u.prices[lv];
    if (this.save.coins < price) return;
    this.save.coins -= price;
    this.save.upgrades[id] = lv + 1;
    saveSave(this.save);
    this.renderShop();
    this._refreshCoins();
  }
  _buyCos(id) {
    const c = COSTUMES.find(x => x.id === id); if (!c) return;
    if (!this.save.owned[id]) {
      if (this.save.coins < c.price) return;
      this.save.coins -= c.price;
      this.save.owned[id] = true;
    }
    this.save.equipped = id;
    this.penguin.setCostume(id);
    saveSave(this.save);
    this.renderShop();
    this._refreshCoins();
  }

  startRun(skipCount) {
    this.$.home.classList.add('hidden');
    this.$.shop.classList.add('hidden');
    this.$.over.classList.add('hidden');
    this.$.hud.classList.remove('hidden');
    this._hideCount();
    this.music.play(this.season, false);
    this.pools.releaseAll();
    this.lane = 0; this.px = 0; this.pxVel = 0; this.pz = 0;
    this.wx = 0; this.wz = 0; this.yaw = 0;
    this.camYaw = 0;
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = BLOOM; this.phaseCd = 0;
    this.offPath = false;
    this.turnBuf = 0; this.turnBufT = 0;
    this.fovKick = 0;
    this.snap = null; this.snapAt = null; this.snapDir = 0;
    this.turnLean = 0;
    this.penguin.setForm(BLOOM, true);
    this.penguin.setCostume(this.save.equipped);
    this.penguin.root.rotation.set(0, 0, 0);
    this.elapsed = 0; this.dist = 0; this.score = 0; this.runCoins = 0;
    this.shake = 0; this.deadT = 0; this.invuln = 0;
    this.prevPz = 0; this.hitZ = null; this.stoppedAt = null; this._stepStamp = null;
    const hs = this.save.upgrades.headStart | 0;
    this.elapsed = hs * 3.5;
    this.speed = this._calcSpeed();
    this.rowCount = 0; this.lastGate = -99;
    this.lastHurdleZ = 0; this.lastHazardZ = 0;
    this.camTurn = null; this.turnPoseT = 0; this.turnPoseDir = 0;
    this._spdLvl = Math.floor(this.elapsed / 20);
    this.shields = this.save.upgrades.shield | 0;
    this.lives = this.save.upgrades.extraLife | 0;
    this.coinMul = 1 + 0.5 * (this.save.upgrades.doubleCoins | 0);
    this.magLv = this.save.upgrades.magnet | 0;
    this._coinAt = { [-1]: -Infinity, 0: -Infinity, 1: -Infinity };
    this.ignoreHit = false;
    this.path.resetRun(this.elapsed);
    this.spawnZ = this.pz + WARMUP;
    this.world.setSeason(this.season, 0, this.path);
    this.world._applyPhaseWash(BLOOM, true);
    this._formUI();
    this._hud();
    this.camX = 0;
    this.camYaw = 0;
    this.camTilt = 0;
    if (this.penguin && this.penguin.hop) this.penguin.hop.rotation.set(0, 0, 0);
    this.penguin.root.visible = true;
    this._turnHintShown = false;
    this._keySteerL = false; this._keySteerR = false;
    this._steerWhooshT = 0;
    this.frozen = false;
    this.tilt.calibrate();
    if (skipCount) {
      this.state = 'play';
      this.toast('Tilt to steer · Swipe to turn', 2.2);
    } else {
      this.state = 'countdown';
      this.countT = 3.2;
      this._countShown = -1;
      this._tickCountdown(0);
    }
  }

  _calcSpeed() {
    const t = this.elapsed;
    const base = Math.min(10.5 + t * 0.36, 26.5);
    const terrace = Math.floor(t / 8) * 0.08;
    const pulse = (this.state === 'play') ? Math.sin(t * 1.65) * 0.12 : 0;
    return Math.min(base + terrace, 26.5) + pulse;
  }
  _gap() {
    // ~0.55s between rows so almost every row can hold a hazard (about 3x v4.9).
    return Math.max(5.4, 0.55 * this.speed);
  }
  _formUI() {
    this.$.form.textContent = PHASE_NAME[this.phase];
    this.$.form.classList.toggle('aurora', this.phase === AURORA);
    this.$.form.classList.remove('frost');
    this.$.form.style.borderColor = hexCol(PHASE_COL[this.phase]);
    this.world.fill.color.setHex(PHASE_COL[this.phase]);
  }
  _hud() {
    this.$.score.textContent = String(this.score | 0);
    this.$.hudCoins.textContent = String(this.runCoins | 0);
  }
  toast(msg, dur = 1.4) {
    this.$.toast.textContent = msg;
    this.$.toast.style.opacity = '1';
    this.toastT = dur;
  }

  _steerLateral(dt, playing) {
    const canSteer = playing && !this.frozen && !this.offPath && this.state === 'play';
    if (!canSteer) {
      this.pxVel = 0;
      this.lean += (0 - this.lean) * Math.min(1, 8 * dt);
      return;
    }
    const key = (this._keySteerR ? 1 : 0) + (this._keySteerL ? -1 : 0);
    const input = key !== 0 ? clamp(key, -1, 1) : this.tilt.steerAmt();
    // +input is player-right; path-x is mirrored (laneX(1) is negative).
    const targetV = -input * STEER_MAX_SPEED;
    const k = 1 - Math.exp(-STEER_RESP * dt);
    this.pxVel += (targetV - this.pxVel) * k;
    this.px += this.pxVel * dt;
    if (this.px > STEER_EDGE) { this.px = STEER_EDGE; if (this.pxVel > 0) this.pxVel = 0; }
    else if (this.px < -STEER_EDGE) { this.px = -STEER_EDGE; if (this.pxVel < 0) this.pxVel = 0; }
    this._steerWhooshT = Math.max(0, (this._steerWhooshT || 0) - dt);
    if (Math.abs(this.pxVel) >= STEER_WHOOSH_VX && this._steerWhooshT <= 0) {
      Sfx.steerWhoosh();
      this._steerWhooshT = STEER_WHOOSH_CD;
    }
    this.lean = clamp(input * 0.85 + this.pxVel * 0.06, -1.5, 1.5);
    this.lane = clamp(Math.round(-this.px / LANE_W), -1, 1);
  }
  _tickTurnHint() {
    this.tilt.angle(); // keep the low-pass filter current
    const pend = this.path.pending;
    if (this.offPath || !pend || pend.committed) return;
    const w = this._turnWindow(this.speed);
    if (!this._turnHintShown && this.pz >= pend.dist - Math.max(w.before, 10) && this.pz <= pend.dist + w.after) {
      this.toast('Swipe to turn', 1.8);
      this._turnHintShown = true;
    }
  }
  _tickTiltTurn() { this._tickTurnHint(); }
  _cornerSafeDist() {
    return Math.max(PATH_W * 0.5 + 2, CORNER_SAFE_SEC * this.speed);
  }
  _inCornerSafe(z) {
    const marginIn = PATH_W * 0.5 + 0.4;
    const after = this._cornerSafeDist();
    const hit = (d) => z >= d - marginIn && z <= d + after;
    if (this.path.pending && hit(this.path.pending.dist)) return true;
    if (this.path.pendingCorner && hit(this.path.pendingCorner.dist0)) return true;
    for (const seg of this.path.segs) {
      if (seg.type === 'left' || seg.type === 'right' || seg.type === 'tee') {
        if (hit(seg.dist0)) return true;
      }
    }
    return false;
  }

  _ensureSpawn() {
    const limit = this.path.officialEndDist() - 1.5;
    while (this.spawnZ < this.pz + SPAWN_AHEAD && this.spawnZ < limit) {
      this._spawnRow(this.spawnZ);
      this.spawnZ += this._gap();
    }
  }
  _hazardGap() {
    // Side blockers can sit on consecutive rows (~0.55s). Always a reachable dodge.
    return Math.max(5.4, 0.55 * this.speed);
  }
  _hurdleGap() {
    const u = clamp((this.speed - 10.5) / 16, 0, 1);
    // Full/wide jumps every ~0.95s at the start, tightening to ~0.78s.
    return lerp(0.95, 0.78, u) * this.speed;
  }
  _spawnRow(z) {
    this.rowCount++;
    const t = this.elapsed;
    const r = Math.random();
    const tracks = [-1, 0, 1];
    const coinOn = (avoid, n, off) => {
      const free = tracks.filter(tr => !(avoid || []).includes(tr));
      this._addCoinLine(free.length ? free[irand(free.length)] : 0, z + (off || 2), n);
    };
    if (this._inCornerSafe(z)) {
      this._addCoinLine(tracks[irand(3)], z, 4);
      return;
    }
    const sinceH = z - (this.lastHurdleZ || 0);
    const sinceHaz = z - (this.lastHazardZ || 0);
    const hazOk = sinceHaz >= this._hazardGap();
    const hurdleDue = sinceH >= this._hurdleGap() && hazOk;
    if (!hazOk) {
      this._addCoinLine(tracks[irand(3)], z, 3);
      return;
    }
    // Almost every legal row is a real hazard: jump, slide, or a side blocker
    // with a reachable gap. Full-width jumps stay on their own slightly longer beat.
    if (hurdleDue && r < 0.88) {
      if (Math.random() < 0.5) this._addHurdle('all', z);
      else {
        const a = irand(2);
        this._addHurdle([a - 1, a], z);
      }
      this.lastHurdleZ = z;
      this.lastHazardZ = z;
      coinOn(null, 3, 3);
      return;
    }
    const gateChance = t < 3 ? 0.12 : Math.min(0.18 + t * 0.006, 0.34);
    const minGate = t < 8 ? 4 : 3;
    if (Math.random() < gateChance && this.rowCount - this.lastGate >= minGate) {
      this.lastGate = this.rowCount;
      this.lastHazardZ = z;
      if (Math.random() < 0.55) {
        const ph = Math.random() < 0.55 ? this.phase : this.phase ^ 1;
        this._addGate(z, ph, 'all');
        coinOn(null, 3, 4);
      } else {
        const sh = tracks.slice().sort(() => Math.random() - 0.5);
        const take = Math.random() < 0.45 ? 2 : 1;
        for (let i = 0; i < take; i++) this._addGate(z, Math.random() < 0.5 ? 0 : 1, 'lane', sh[i]);
        coinOn(sh.slice(0, take), 3, 3);
      }
      return;
    }
    // Side blockers and slide-unders. Never close every track unless the
    // action is a single full-width slide.
    const sh = tracks.slice().sort(() => Math.random() - 0.5);
    const roll = Math.random();
    if (roll < 0.28) {
      this._addObs('high', 0, z, 'all');
      this.lastHazardZ = z;
      coinOn(null, 3, 3);
      return;
    }
    if (roll < 0.50) {
      this._addObs('high', sh[0], z);
      this.lastHazardZ = z;
      coinOn([sh[0]], 3, 2);
      return;
    }
    const n = Math.random() < 0.55 ? 2 : 1;
    for (let i = 0; i < n; i++) this._addObs('low', sh[i], z);
    this.lastHazardZ = z;
    coinOn(sh.slice(0, n), 3, 2);
  }
  _nextCoinZ(lane, z) {
    const gap = COIN_GAP;
    let z0 = Math.ceil((z - 1e-6) / gap) * gap;
    const last = this._coinAt && this._coinAt[lane];
    if (last != null && last !== -Infinity && z0 < last + gap - 1e-6) z0 = last + gap;
    return z0;
  }
  _coinSlotBlocked(z) {
    const near = 0.7;
    for (const list of [this.pools.gates, this.pools.obs]) {
      for (const o of list) {
        if (o.live && Math.abs(o.z - z) < near) return true;
      }
    }
    return false;
  }
  _addCoinLine(lane, z, n) {
    if (!this._coinAt) this._coinAt = { [-1]: -Infinity, 0: -Infinity, 1: -Infinity };
    let z0 = this._nextCoinZ(lane, z);
    let placed = 0, guard = 0;
    while (placed < n && guard++ < 48) {
      if (this._coinSlotBlocked(z0)) { z0 += COIN_GAP; continue; }
      const ph = (placed % 2 === 0) ? ((Math.random() < 0.7) ? this.phase : this.phase ^ 1) : (Math.random() < 0.5 ? 0 : 1);
      this._addCoin(lane, z0, 0, ph);
      this._coinAt[lane] = z0;
      placed++;
      z0 += COIN_GAP;
    }
  }
  _addCoin(lane, z, h, phase) {
    const o = this.pools.obtain(this.pools.coins); if (!o) return;
    o.live = true; o.taken = false; o.lane = lane; o.lx = laneX(lane); o.z = z; o.h = h || 0;
    this.pools.styleCoin(o, phase == null ? (Math.random() < 0.5 ? BLOOM : AURORA) : phase);
    o.mesh.visible = true;
    this._placeOnPath(o);
  }
  _addGate(z, phase, span, lane = 0) {
    const o = this.pools.obtain(this.pools.gates); if (!o) return;
    o.live = true; o.z = z; o.lane = lane; o.lx = laneX(lane); o.type = 'gate';
    this.pools.styleGate(o, phase, span);
    o.mesh.visible = true;
    this._placeOnPath(o);
  }
  _addObs(kind, lane, z, span) {
    const o = this.pools.obtain(this.pools.obs); if (!o) return;
    let cover, mid, kindSpan;
    if (span === 'all') { cover = [-1, 0, 1]; mid = 0; kindSpan = 'all'; }
    else if (Array.isArray(span)) {
      cover = span.slice().sort((a, b) => a - b);
      mid = cover.reduce((a, b) => a + b, 0) / cover.length;
      kindSpan = cover.length >= 2 ? 'wide' : 'lane';
    } else {
      cover = [lane]; mid = lane; kindSpan = 'lane';
    }
    o.live = true; o.lane = mid; o.lx = laneX(mid); o.z = z; o.type = kind; o.nearMissed = false;
    o.span = kindSpan; o.cover = cover;
    this.pools.buildObs(o, kind, this.season);
    o.mesh.visible = true;
    this._placeOnPath(o);
    return o;
  }
  _addHurdle(span, z) {
    const o = this.pools.obtain(this.pools.obs); if (!o) return;
    let cover, mid, kindSpan;
    if (span === 'all' || (Array.isArray(span) && span.length >= 3)) {
      cover = [-1, 0, 1]; mid = 0; kindSpan = 'all';
    } else if (Array.isArray(span)) {
      cover = span.slice().sort((a, b) => a - b);
      mid = cover.reduce((a, b) => a + b, 0) / cover.length;
      kindSpan = cover.length >= 2 ? 'wide' : 'lane';
    } else {
      cover = [span | 0]; mid = cover[0]; kindSpan = 'lane';
    }
    o.live = true; o.lane = mid; o.lx = laneX(mid); o.z = z; o.nearMissed = false;
    o.span = kindSpan; o.cover = cover;
    this.pools.buildObs(o, 'hurdle', this.season);
    o.mesh.visible = true;
    this._placeOnPath(o);
    return o;
  }
  _placeOnPath(o) {
    const lx = (o.span === 'all') ? 0
      : (o.cover && o.cover.length > 1)
        ? o.cover.reduce((a, l) => a + laneX(l), 0) / o.cover.length
        : (o.lx != null ? o.lx : laneX(o.lane || 0));
    o.lx = lx;
    const pose = this.path.resolve(o.z, lx, true);
    o.mesh.position.set(pose.x, 0, pose.z);
    o.mesh.rotation.y = pose.yaw;
    if (o.type === 'coin') o.mesh.position.y = COIN_Y + (o.h || 0);
  }

  collides(o) {
    if (!o || !o.live || o.taken) return false;
    if (!o.mesh || !o.mesh.visible) return false;
    if (this.offPath) return false;
    if (o.type === 'coin') return false;
    // Swept path-distance test. The old 0.12–1.05 window was narrower than
    // one high-speed frame (up to ~1.3 units), so a hit could be missed or
    // only registered after the runner had already overlapped the prop.
    const prev = (this.prevPz != null) ? this.prevPz : this.pz;
    const z0 = Math.min(prev, this.pz);
    const z1 = Math.max(prev, this.pz);
    const hitNear = o.z - 1.15;
    const hitFar = o.z + 0.2;
    if (z1 < hitNear || z0 > hitFar) return false;
    const px = this.px;
    if (o.span === 'all' || (o.type === 'gate' && o.span === 'all')) {
      // full width
    } else if (o.cover && o.cover.length) {
      const xs = o.cover.map(laneX);
      const pad = (o.type === 'gate') ? 0.52 : 0.48;
      if (px < Math.min(...xs) - pad || px > Math.max(...xs) + pad) return false;
    } else {
      const ox = (o.lx != null) ? o.lx : laneX(o.lane || 0);
      const half = (o.type === 'gate') ? 0.52 : 0.48;
      if (Math.abs(px - ox) > half) return false;
    }
    if (o.type === 'gate') return o.phase === this.phase;
    if (o.type === 'low' || o.type === 'hurdle') return this.jumpY < (o.clearance != null ? o.clearance : HURDLE_CLEAR);
    if (o.type === 'high') return this.slideT <= 0;
    return false;
  }

  _hit(o) {
    if (this.ignoreHit || this.invuln > 0 || this.state !== 'play') return;
    if (this.shields > 0) {
      this.shields--; this.invuln = 1.0; this.shake = 0.35;
      this.toast('Shield!', 0.8); Sfx.hit();
      o.live = false; o.mesh.visible = false;
      return;
    }
    if (this.lives > 0) {
      this.lives--; this.invuln = 1.15; this.shake = 0.4;
      this.toast('Kept going!', 0.8); Sfx.hit();
      o.live = false; o.mesh.visible = false;
      return;
    }
    this._die(o);
  }
  _die(hitObj) {
    if (this.state === 'dying' || this.state === 'over') return;
    this.state = 'dying';
    this.deadT = 0;
    this.shake = 0.7;
    this.jumpV = Math.min(this.jumpV, 0);
    // Obstacle hits stop on the spot, just in front of the prop. A missed
    // turn still lets the panda run off the edge, then uses the same overlay.
    if (hitObj && !this.offPath) {
      const standOff = 0.55;
      this.pz = Math.min(this.pz, hitObj.z - standOff);
      this.prevPz = this.pz;
      this.speed = 0;
      this.hitZ = hitObj.z;
      this.stoppedAt = this.pz;
    } else if (!this.offPath) {
      this.speed = 0;
    }
    Sfx.hit();
    if (this.penguin && this.penguin.ready) {
      this.penguin._play(this.penguin.actions.Fall ? 'Fall' : 'Jump', 0.08);
    }
    if (navigator.vibrate) try { navigator.vibrate([30, 40, 30]); } catch (e) {}
  }
  _endRun() {
    this.state = 'over';
    this._hideCount();
    const earned = Math.round(this.runCoins * this.coinMul);
    this.save.coins += earned;
    const sc = this.score | 0;
    const prev = this.save.seasonBest[this.season] | 0;
    const isNew = sc > prev;
    if (isNew) this.save.seasonBest[this.season] = sc;
    if (sc > (this.save.best | 0)) this.save.best = sc;
    saveSave(this.save);
    this.$.over.classList.remove('hidden');
    this.$.hud.classList.add('hidden');
    this.$.overScore.textContent = String(sc);
    this.$.overBest.textContent = 'BEST  ' + (this.save.seasonBest[this.season] | 0);
    const collected = this.runCoins | 0;
    this.$.overCoins.textContent = (this.coinMul > 1 && earned !== collected)
      ? ('COINS COLLECTED  ' + collected + '  (+' + earned + ')')
      : ('COINS COLLECTED  ' + collected);
    this.$.overNew.textContent = isNew && sc > 0 ? 'NEW BEST!' : '';
    this._refreshCoins();
  }

  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(this.clock.getDelta(), MAX_DT);
    this._update(dt);
    this._render();
  }

  _update(dt) {
    this.music.update(dt);
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT < 0.35) this.$.toast.style.opacity = String(Math.max(0, this.toastT / 0.35));
      if (this.toastT <= 0) this.$.toast.style.opacity = '0';
    }

    const playing = this.state === 'play';
    const dying = this.state === 'dying';
    const counting = this.state === 'countdown';
    const home = this.state === 'home' || this.state === 'shop';

    if (counting) this._tickCountdown(dt);

    if (playing && this.frozen) {
      this.speed = 0;
    } else if (playing) {
      this.elapsed += dt;
      this.speed = this._calcSpeed();
      this.prevPz = this.pz;
      if (!this.offPath) this.pz += this.speed * dt;
      this.dist += this.speed * dt;
      this.score = Math.floor(this.dist * 8 + this.runCoins * 10);
      this.phaseCd -= dt;
      this.invuln -= dt;
      if (this.turnBufT > 0) {
        this.turnBufT -= dt;
        if (this.turnBufT <= 0) this.turnBuf = 0;
      }
      this._tryConsumeTurn();
      if (this.snapAt != null && !this.snap && this.pz >= this.snapAt) this._beginSnap(this.snapDir);
      if (this.turnPoseT > 0) this.turnPoseT = Math.max(0, this.turnPoseT - dt);
      const pend = this.path.pending;
      if (pend && !pend.committed && !this.offPath) {
        const w = this._turnWindow(this.speed);
        if (this.pz > pend.dist + w.after) this._missTurn();
      }
      this._ensureSpawn();
      this.world.syncPath(this.path, this.season, this.pz);
      const lvl = Math.floor(this.elapsed / 20);
      if (lvl > (this._spdLvl || 0) && lvl > 0) {
        this._spdLvl = lvl;
        this.toast('SPEED UP!', 1.2);
        this.fovKick = Math.max(this.fovKick, 8);
        this.shake = Math.max(this.shake, 0.22);
      }
      this._tickTurnHint();
    } else if (home) {
      this.speed = 10.5;
      this.pz += this.speed * dt;
      this.path.extendPreview(this.pz);
      this.world.syncPath(this.path, this.season, this.pz);
      if (this.pz > 350) {
        this.pz = 0;
        this.path.resetPreview();
        this.world.setSeason(this.season, 0, this.path);
      }
    } else if (dying) {
      this.deadT += dt;
      if (this.offPath) this.speed = Math.max(0, this.speed - 18 * dt);
      else this.speed = 0;
      if (this.deadT > 1.0) this._endRun();
    } else if (this.state === 'over') {
      this.deadT += dt;
    }

    const wasAir = this.jumpY > 0.02;
    if (playing || dying) {
      if (this.jumpY > 0 || this.jumpV > 0) {
        this.jumpV -= 24 * dt;
        this.jumpY += this.jumpV * dt;
        if (this.jumpY <= 0) {
          this.jumpY = 0; this.jumpV = 0;
          if (wasAir && playing) this.shake = Math.max(this.shake, 0.08);
        }
      }
      if (this.slideT > 0) this.slideT -= dt;
    }

    this._steerLateral(dt, playing);

    if (this.offPath && (playing || dying)) {
      this.offVelY -= 22 * dt;
      this.wx += this.offVelX * dt;
      this.wz += this.offVelZ * dt;
      this.jumpY = Math.max(-4, this.jumpY + this.offVelY * dt);
      if (this.jumpY < -0.6 && this.state === 'play') this._die();
      this.pose = { x: this.wx, z: this.wz, yaw: this.yaw, ...yawVec(this.yaw) };
      this.turnLean *= Math.max(0, 1 - 10 * dt);
    } else {
      const logical = this.path.resolve(this.pz, this.px, false);
      if (this.snap) {
        this.snap.t += dt;
        const u = clamp(this.snap.t / this.snap.dur, 0, 1);
        const e = 1 - (1 - u) * (1 - u);
        const dest = (this.snap.destYaw != null) ? this.snap.destYaw : logical.yaw;
        this.yaw = angLerp(this.snap.yaw0, dest, e);
        this.wx = lerp(this.snap.x0, logical.x, e);
        this.wz = lerp(this.snap.z0, logical.z, e);
        this.pose = { x: this.wx, z: this.wz, yaw: this.yaw, ...yawVec(this.yaw) };
        this.turnLean = this.snap.dir * Math.sin(u * Math.PI) * 0.9;
        if (u >= 1) { this.yaw = dest; this.snap = null; this.turnLean *= 0.4; }
      } else {
        this.pose = logical;
        this.wx = logical.x; this.wz = logical.z; this.yaw = logical.yaw;
        this.turnLean *= Math.max(0, 1 - 12 * dt);
      }
    }

    this.penguin.root.position.set(this.wx, Math.max(0, this.jumpY < 0 && this.offPath ? this.jumpY : 0), this.wz);
    this.penguin.root.rotation.y = this.yaw;
    this.penguin.animate(dt, {
      moving: playing || home || counting,
      idleRun: counting,
      speed: this.speed,
      jumpY: Math.max(0, this.jumpY),
      sliding: this.slideT > 0 && this.jumpY <= 0.02,
      lean: this.lean + this.turnLean,
      turning: this.turnPoseT > 0,
      turnDir: this.turnPoseDir || (this.snap ? this.snap.dir : 0),
      falling: dying || this.state === 'over' || (this.offPath && this.jumpY < 0.1),
      fallT: this.deadT,
      onGround: this.jumpY <= 0.02,
      homeThreeQ: false,
      time: this.elapsed || this.world.time
    });
    const hidePanda = home || this.state === 'over';
    if (hidePanda) this.penguin.root.visible = false;
    else if (this.invuln > 0 && playing) this.penguin.root.visible = (Math.sin(this.invuln * 30) > 0);
    else this.penguin.root.visible = true;
    this._tickSteps(playing);

    this.world.update(dt, this.pz, this.px, this.speed, this.phase, this.pose);
    this.world.fill.position.set(this.wx, 1.1 + Math.max(0, this.jumpY), this.wz);

    if (playing) this._tickEntities(dt);
    else {
      for (const list of [this.pools.coins, this.pools.gates, this.pools.obs]) {
        for (const o of list) {
          if (!o.live) continue;
          if (o.z < this.pz - 8) { o.live = false; o.mesh.visible = false; }
        }
      }
    }

    this.fovKick = Math.max(0, this.fovKick - dt * 10);
    this._camera(dt);
    if (playing) this._hud();
  }

  _tickSteps(playing) {
    const running = playing && !this.offPath && this.jumpY <= 0.02 && this.slideT <= 0;
    if (!running) { this._stepStamp = null; return; }
    const stamp = Math.floor(this.penguin.runT * 2);
    if (this._stepStamp != null && stamp !== this._stepStamp) Sfx.step();
    this._stepStamp = stamp;
  }

  _tickEntities(dt) {
    const t = this.elapsed;
    for (const o of this.pools.coins) {
      if (!o.live || o.taken) continue;
      o.mesh.rotation.y += dt * 4.2;
      const pose = this.path.resolve(o.z, (o.lx != null ? o.lx : laneX(o.lane)), true);
      o.mesh.position.set(pose.x, COIN_Y + o.h + Math.sin(t * 4 + o.z) * 0.05, pose.z);
      o.mesh.rotation.y = pose.yaw + t * 4.2;
      const match = o.phase === this.phase;
      o.mesh.scale.setScalar(match ? 1 : 0.82);
      o.body.material.emissiveIntensity = match ? 0.45 : 0.12;
      if (this.magLv > 0 && match) {
        const reach = 0.9 + this.magLv * 0.7;
        const dx = this.wx - o.mesh.position.x;
        const dz = this.wz - o.mesh.position.z;
        const along = o.z - this.pz;
        if (Math.abs(along) < 4 + this.magLv && Math.hypot(dx, dz) < reach + 2.2) {
          o.mesh.position.x += dx * Math.min(1, 4 * dt);
          o.mesh.position.z += dz * Math.min(1, 3 * dt);
        }
      }
      const dz = o.z - this.pz;
      const dx = (o.mesh.position.x - this.wx) * (this.pose.sx || 0) + (o.mesh.position.z - this.wz) * (this.pose.sz || 0);
      // Use lane-space for pickup: path-distance window + lane closeness
      const ox = (o.lx != null) ? o.lx : laneX(o.lane);
      const laneClose = Math.abs(ox - this.px) < 0.55 || Math.hypot(o.mesh.position.x - this.wx, o.mesh.position.z - this.wz) < 0.7;
      if (dz > 0.05 && dz < 0.85 && laneClose && this.jumpY < 1.3) {
        if (o.phase === this.phase) {
          o.taken = true; o.live = false; o.mesh.visible = false;
          this.runCoins += 1;
          Sfx.coin();
        } else {
          o.taken = true; o.live = false; o.mesh.visible = false;
          Sfx.coinMiss();
        }
      } else if (o.z < this.pz - 6) { o.live = false; o.mesh.visible = false; }
    }
    for (const o of this.pools.gates) {
      if (!o.live) continue;
      this._placeOnPath(o);
      const solid = o.phase === this.phase;
      this.pools.setGateSolid(o, solid, dt);
      if (this.collides(o)) this._hit(o);
      else if (o.z < this.pz - 6) { o.live = false; o.mesh.visible = false; }
    }
    for (const o of this.pools.obs) {
      if (!o.live) continue;
      this._placeOnPath(o);
      if (this.collides(o)) this._hit(o);
      else {
        this._nearMissCheck(o);
        if (o.z < this.pz - 6) { o.live = false; o.mesh.visible = false; }
      }
    }
  }

  _nearMissCheck(o) {
    if (o.nearMissed || this.offPath) return;
    const dz = o.z - this.pz;
    if (dz > 0.35 || dz < -0.15) return;
    const covers = o.cover && o.cover.length ? o.cover : [o.lane || 0];
    const xs = covers.map(laneX);
    const same = o.span === 'all' || xs.some(x => Math.abs(x - this.px) < 0.7);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const adj = !same && this.px < maxX + 1.6 && this.px > minX - 1.6;
    const need = (o.clearance != null ? o.clearance : 0.68);
    const jumped = (o.type === 'low' || o.type === 'hurdle') && same && this.jumpY >= need;
    const slid = o.type === 'high' && same && this.slideT > 0;
    if (jumped || slid || adj) {
      o.nearMissed = true;
      this.shake = Math.max(this.shake, 0.22);
      this.fovKick = Math.max(this.fovKick, 4.5);
      Sfx.nearMiss();
    }
  }

  _camera(dt) {
    const playing = this.state === 'play' || this.state === 'dying' || this.state === 'countdown';
    const home = this.state === 'home' || this.state === 'shop';
    const speedK = clamp((this.speed - 10.5) / 16, 0, 1);
    this.camTilt += (-this.lean * 0.09 - this.camTilt) * Math.min(1, 8 * dt);
    const bob = (!home && this.jumpY <= 0.02 && playing)
      ? Math.sin(this.penguin.runT * Math.PI * 2) * 0.045 : 0;
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const shx = this.shake ? (hash(this.elapsed, 1) - 0.5) * this.shake * 0.35 : 0;
    const shy = this.shake ? (hash(this.elapsed, 2) - 0.5) * this.shake * 0.3 : 0;

    this.camX += (this.px - this.camX) * Math.min(1, 6.2 * dt);
    if (this.camTurn) {
      this.camTurn.t += dt;
      const u = clamp(this.camTurn.t / this.camTurn.dur, 0, 1);
      const e = u * u * (3 - 2 * u); // smoothstep, a 0.26s swing instead of a pop
      this.camYaw = angLerp(this.camTurn.yaw0, this.camTurn.yaw1, e);
      if (u >= 1) { this.camYaw = this.camTurn.yaw1; this.camTurn = null; }
    } else {
      this.camYaw = angLerp(this.camYaw || 0, this.yaw, 1 - Math.exp(-16 * dt));
    }
    const v = yawVec(this.camYaw);
    let dist, height, lookAhead, lookY, fov;
    if (home) {
      // Scenic chase view down the empty season path. The panda is hidden here.
      dist = 6.4; height = 3.2; lookAhead = 14; lookY = 0.7; fov = 54;
    } else {
      dist = 5.3 - speedK * 0.35;
      height = 2.12 + speedK * 0.12;
      lookAhead = 6.5;
      lookY = 0.45 + Math.max(0, this.jumpY) * 0.2;
      fov = 52 + speedK * 8 + this.fovKick;
    }
    const side = 0;
    // Camera tracks a lagged lane offset so the runner visibly moves into a lane (screen-right is +lane).
    const camLat = this.camX;
    const lookLat = this.camX * 0.2 + this.px * 0.8;
    const cx = this.wx - v.sx * this.px - v.fx * dist + v.sx * (camLat + side + shx);
    const cz = this.wz - v.sz * this.px - v.fz * dist + v.sz * (camLat + side + shx);
    const cy = height + bob + shy + Math.max(0, this.jumpY) * 0.12;
    this.camera.position.set(cx, cy, cz);
    this.camera.up.set(0, 1, 0);
    const lx = this.wx - v.sx * this.px + v.sx * lookLat + v.fx * lookAhead;
    const lz = this.wz - v.sz * this.px + v.sz * lookLat + v.fz * lookAhead;
    this.camera.lookAt(lx, lookY, lz);
    this.camera.rotateZ(this.camTilt + (this.shake ? (hash(this.elapsed, 3) - 0.5) * this.shake * 0.08 : 0));
    if (Math.abs(fov - this.camera.fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }

    const show = playing && speedK > 0.35 && !this.offPath;
    for (let i = 0; i < this.streaks.length; i++) {
      const s = this.streaks[i];
      if (!show) { s.mesh.visible = false; continue; }
      if (!s.mesh.visible || ((s.x - this.wx) * v.fx + (s.z - this.wz) * v.fz) < -2) {
        const lat = (Math.random() < 0.5 ? -1 : 1) * rand(0.8, 2.8);
        const ahead = rand(2, 10);
        s.x = this.wx + v.sx * lat + v.fx * ahead;
        s.y = rand(0.3, 2.4);
        s.z = this.wz + v.sz * lat + v.fz * ahead;
        s.mesh.visible = true;
        s.mesh.material.opacity = 0.15 + speedK * 0.35;
        s.mesh.rotation.y = this.yaw;
      }
      s.x -= v.fx * (this.speed * 1.8 + 12) * dt;
      s.z -= v.fz * (this.speed * 1.8 + 12) * dt;
      s.mesh.position.set(s.x, s.y, s.z);
      s.mesh.scale.z = 0.8 + speedK * 1.6;
    }
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }

  _expose() {
    const self = this;
    window.__game = {
      get state() { return self.state; },
      get season() { return self.season; },
      get lane() { return self.lane; },
      get px() { return self.px; },
      get pz() { return self.pz; },
      get wx() { return self.wx; },
      get wz() { return self.wz; },
      get yaw() { return self.yaw; },
      get phase() { return self.phase; },
      get speed() { return self.speed; },
      get elapsed() { return self.elapsed; },
      get score() { return self.score; },
      get coins() { return self.runCoins; },
      get jumpY() { return self.jumpY; },
      get slideT() { return self.slideT; },
      get offPath() { return self.offPath; },
      get hitZ() { return self.hitZ; },
      get stoppedAt() { return self.stoppedAt; },
      get deadT() { return self.deadT; },
      get save() { return self.save; },
      get VERSION() { return VERSION; },
      get ready() { return !!self.penguin.ready && !!self.pools.hurdlesReady; },
      startRun: (skip) => self.startRun(skip),
      laneX: laneX,
      get countT() { return self.countT; },
      get cam() { return self.camera; },
      goHome: () => self._goHome(),
      openShop: () => self.openShop(),
      closeShop: () => self.closeShop(),
      setSeason: i => self._setSeason(i, true),
      move: d => self.move(d),
      turn: d => self.turn(d),
      jump: () => self.jump(),
      slide: () => self.slide(),
      togglePhase: () => self.togglePhase(),
      collides: o => self.collides(o),
      addGate: (z, phase, span, lane) => self._addGate(z, phase, span, lane),
      addObs: (kind, lane, z) => self._addObs(kind, lane, z),
      addHurdle: (span, z) => self._addHurdle(span, z),
      arrowCount: () => (self.world.chevL.length + self.world.chevR.length),
      addCoin: (lane, z, h, phase) => self._addCoin(lane, z, h, phase),
      forceTurn: (type, atDist) => self.path.forceTurn(type, atDist),
      pendingTurn: () => self.path.pending && { type: self.path.pending.type, dist: self.path.pending.dist, committed: self.path.pending.committed },
      setInvincible(v) { self.ignoreHit = !!v; },
      injectTilt(gamma, neutral) { self.tilt.inject(gamma, neutral == null ? 0 : neutral); },
      tiltAngle() { return self.tilt.angle(); },
      tiltArmed() { return self.tilt.armed; },
      steerAmt() { return self.tilt.steerAmt(); },
      get pxVel() { return self.pxVel; },
      get steerEdge() { return STEER_EDGE; },
      laneMarkCount() {
        let n = 0;
        self.world.pathG.traverse(obj => {
          if (!obj.isMesh || !obj.material) return;
          if (obj.material === self.world.dashMat) n++;
        });
        return n;
      },
      inCornerSafe: z => self._inCornerSafe(z),
      cornerSafeDist: () => self._cornerSafeDist(),
      objects() {
        return {
          gates: self.pools.gates.filter(o => o.live).map(o => ({ type: o.type, z: o.z, phase: o.phase, span: o.span, lane: o.lane, visible: o.mesh.visible })),
          obs: self.pools.obs.filter(o => o.live).map(o => ({ type: o.type, kind: o.kind, z: o.z, lane: o.lane, span: o.span, cover: o.cover, height: o.height, clearance: o.clearance, visible: o.mesh.visible })),
          coins: self.pools.coins.filter(o => o.live).map(o => ({ z: o.z, lane: o.lane, phase: o.phase }))
        };
      },
      core: self
    };
  }
}

window.addEventListener('load', async () => {
  try {
    const g = new Game();
    window.__gameCore = g;
    await Promise.all([g.penguin.load(), g.pools.loadHurdles()]);
    g.penguin.setCostume(g.save.equipped || 'classic');
    const boot = document.getElementById('boot');
    if (boot) boot.classList.add('hidden');
  } catch (err) {
    console.error(err);
    const boot = document.getElementById('boot');
    if (boot) { boot.classList.remove('hidden'); boot.textContent = 'Could not start the 3D game.'; }
  }
});
