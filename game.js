// Season Shift v4 — SEASON_SHIFT_V4
// An original 3D endless runner for Joseph. Pip the penguin, Bloom & Aurora.
// Path corners / T-junctions, tilt lanes, swipe jump-slide-turn, Bloom/Aurora theme.
import * as THREE from './lib/three.module.min.js';
import { GLTFLoader } from './lib/GLTFLoader.js';

const VERSION = 'SEASON_SHIFT_V4';
const SAVE_KEY = 'cometCourierSave';
const BEST_KEY = 'cometCourierBest';

// Character model is isolated so it can be swapped after Joseph approves a new one.
// Do not point this at pip-v4.glb or pip-v5.glb until he approves them.
const CHARACTER_MODEL = './assets/models/pip.glb';
const CHARACTER_HEIGHT = 1.0;

const BLOOM = 0, AURORA = 1;
const PHASE_NAME = ['BLOOM', 'AURORA'];
const PHASE_COL = [0xff8fb3, 0x7cffcf];
const PHASE_COL_B = [0xe85a8c, 0x7b4dff];
const LANE_W = 1.7;
function laneX(lane) { return -lane * LANE_W; }
const SPAWN_AHEAD = 72;
const WARMUP = 36;
const MAX_DT = 0.05;
const PATH_W = 6.3;
const TURN_R = 2.6;

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
  { id: 'magnet',      name: 'Coin Magnet',  blurb: 'Pulls nearby coins into your lane.',  prices: [50, 120, 250, 500, 900] },
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

window.__VERSION = VERSION;
window.__SHOP = { UPGRADES, COSTUMES };
window.__SEASONS = SEASONS;
window.__PHASE = { BLOOM, AURORA, NAME: PHASE_NAME, COL: PHASE_COL, COL_B: PHASE_COL_B };

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
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 0.4;
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  _out() { return this.master || (this.ctx && this.ctx.destination); },
  tone(f1, f2, dur, type = 'square', vol = 0.1, delay = 0) {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._out()); o.start(t); o.stop(t + dur + 0.03);
  },
  whoosh(dur, vol, fFrom, fTo) {
    const c = this.ctx; if (!c || c.state !== 'running' || !this._noise) return;
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
    this.tone(988, 1318, 0.09, 'triangle', 0.16);
    this.tone(1318, 1976, 0.14, 'triangle', 0.12, 0.05);
    this.tone(1976, 2638, 0.08, 'sine', 0.06, 0.09);
  },
  coinMiss() { this.tone(240, 180, 0.07, 'sine', 0.05); },
  jump() {
    this.tone(220, 620, 0.11, 'sine', 0.16);
    this.tone(620, 280, 0.16, 'sine', 0.1, 0.08);
  },
  slide() { this.whoosh(0.18, 0.22, 900, 220); this.tone(340, 140, 0.16, 'sine', 0.05); },
  lane() { this.whoosh(0.1, 0.2, 700, 1100); this.tone(520, 640, 0.06, 'sine', 0.05); },
  turn() { this.whoosh(0.16, 0.24, 500, 1400); this.tone(440, 660, 0.1, 'sine', 0.07); },
  nearMiss() { this.whoosh(0.14, 0.18, 1200, 400); this.tone(880, 440, 0.08, 'triangle', 0.05); },
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
  hit() { this.tone(180, 50, 0.4, 'sawtooth', 0.14); this.whoosh(0.28, 0.22, 300, 80); },
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
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, '#8a6a3a');
  g.addColorStop(0.08, '#c9a067');
  g.addColorStop(0.5, '#d8b57a');
  g.addColorStop(0.92, '#c9a067');
  g.addColorStop(1, '#8a6a3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = 'rgba(255,255,245,0.85)';
  const lanes = [128 * (1.5 * LANE_W) / PATH_W, 128 * 0.5]; // unused, draw by fractions
  const mid = 64;
  const dw = (LANE_W / PATH_W) * 128;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 16]);
  for (const x of [mid - dw * 0.5, mid + dw * 0.5, mid - dw * 1.5, mid + dw * 1.5]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.strokeStyle = 'rgba(255,252,240,0.9)';
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
let _pathTex = null;
function pathTex() { return _pathTex || (_pathTex = makePathTexture()); }

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
    coin: new THREE.CylinderGeometry(0.26, 0.26, 0.07, 22),
    coinI: new THREE.TorusGeometry(0.26, 0.04, 8, 22),
    plane: new THREE.PlaneGeometry(1, 1, 1, 1),
    hood: new THREE.SphereGeometry(0.34, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    daisy: new THREE.CircleGeometry(0.12, 8),
    streak: new THREE.BoxGeometry(0.03, 0.03, 1.4),
    pathSlab: new THREE.BoxGeometry(PATH_W, 0.16, 1),
    curb: new THREE.BoxGeometry(0.22, 0.22, 1),
    wing: new THREE.BoxGeometry(10, 0.08, 1),
    chevron: new THREE.ConeGeometry(0.28, 0.7, 3)
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

function makeArcGeom(dir) {
  // Quarter-ring path slab, centered so start is at origin going +Z, ending at ±X.
  // dir -1 left, +1 right.
  const R = TURN_R;
  const half = PATH_W * 0.5;
  const shape = new THREE.Shape();
  const steps = 14;
  const a0 = dir < 0 ? Math.PI : 0;
  const a1 = Math.PI * 0.5;
  const sign = dir < 0 ? -1 : 1;
  // For left: center at (+R, 0), start at (0,0), end at (R, R) in (x,z)
  // We'll build in XY then rotate.
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = dir < 0 ? (Math.PI + t * Math.PI / 2) : (0 - t * Math.PI / 2);
    // center (dir<0 ? R : -R, 0) in (x,z), radius from half-inner to half-outer
  }
  // Use a lathe-free Extrude of a ring sector in XZ via BufferGeometry
  const inner = R - half, outer = R + half;
  const verts = [], norms = [], uvs = [], idx = [];
  const cx = dir < 0 ? R : -R;
  const cz = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // angle from start: start vector from center is (-dir, wait)
    // left: center (R,0), start (0,0) angle = PI (from +X), to angle = PI/2
    // right: center (-R,0), start (0,0) angle = 0, to angle = -PI/2
    const a = dir < 0 ? (Math.PI - t * Math.PI / 2) : (0 + t * -Math.PI / 2);
    const ca = Math.cos(a), sa = Math.sin(a);
    const x0 = cx + ca * inner, z0 = cz + sa * inner;
    const x1 = cx + ca * outer, z1 = cz + sa * outer;
    verts.push(x0, 0.08, z0, x1, 0.08, z1);
    norms.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t, 1, t);
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------- path ----------------
function straightLenFor(elapsed) {
  const u = clamp(elapsed / 70, 0, 1);
  return lerp(44, 16, u * u * 0.3 + u * 0.7);
}
const ARC_LEN = Math.PI * 0.5 * TURN_R;

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
function poseOnArc(start, dir, distAlong, lx) {
  const t = clamp(distAlong / ARC_LEN, 0, 1);
  const yaw = start.yaw + (dir < 0 ? 1 : -1) * t * Math.PI * 0.5;
  const v0 = yawVec(start.yaw);
  const v = yawVec(yaw);
  const R = TURN_R;
  let x, z;
  if (dir < 0) {
    const cx = start.x + v0.sx * R, cz = start.z + v0.sz * R;
    x = cx - v.sx * R + v.sx * lx;
    z = cz - v.sz * R + v.sz * lx;
  } else {
    const cx = start.x - v0.sx * R, cz = start.z - v0.sz * R;
    x = cx + v.sx * R + v.sx * lx;
    z = cz + v.sz * R + v.sz * lx;
  }
  return { x, z, yaw, fx: v.fx, fz: v.fz, sx: v.sx, sz: v.sz };
}

class PathSystem {
  constructor() { this.resetPreview(); }
  _clear() {
    this.segs = [];
    this.pending = null;
    this.branches = { left: null, right: null };
    this.end = { x: 0, z: 0, yaw: 0, dist: 0 };
    this.preview = false;
    this._id = 1;
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
      x1: s.x + v.fx * len, z1: s.z + v.fz * len, yaw1: s.yaw
    };
    if (!onto) {
      this.segs.push(seg);
      this.end = { x: seg.x1, z: seg.z1, yaw: seg.yaw1, dist: seg.dist1 };
    }
    return seg;
  }
  _buildBranch(start, dir, afterLen) {
    const arc = {
      id: this._id++, type: dir < 0 ? 'left' : 'right', dir,
      dist0: start.dist, dist1: start.dist + ARC_LEN, length: ARC_LEN,
      x0: start.x, z0: start.z, yaw0: start.yaw
    };
    const endPose = poseOnArc(start, dir, ARC_LEN, 0);
    arc.x1 = endPose.x; arc.z1 = endPose.z; arc.yaw1 = endPose.yaw;
    const mid = { x: endPose.x, z: endPose.z, yaw: endPose.yaw, dist: arc.dist1 };
    const st = this._pushStraight(afterLen, mid);
    st.id = this._id++;
    // fix st to start from mid
    const v = yawVec(mid.yaw);
    st.dist0 = mid.dist; st.dist1 = mid.dist + afterLen; st.length = afterLen;
    st.x0 = mid.x; st.z0 = mid.z; st.yaw0 = mid.yaw;
    st.x1 = mid.x + v.fx * afterLen; st.z1 = mid.z + v.fz * afterLen; st.yaw1 = mid.yaw;
    return {
      segs: [arc, st],
      end: { x: st.x1, z: st.z1, yaw: st.yaw1, dist: st.dist1 }
    };
  }
  _planTurn(elapsed) {
    const typ = this.preview ? null : pick(['left', 'right', 'left', 'right', 'tee']);
    if (!typ) return;
    this.pending = {
      type: typ,
      dist: this.end.dist,
      x: this.end.x, z: this.end.z, yaw: this.end.yaw,
      committed: false, chosen: 0
    };
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
    for (const seg of branch.segs) this.segs.push(seg);
    this.end = branch.end;
    const unused = dir < 0 ? this.branches.right : this.branches.left;
    this.pending = null;
    this.branches = { left: null, right: null };
    this._lastAbandoned = unused;
    this._planTurn(elapsed);
    return true;
  }
  officialEndDist() {
    return this.pending ? this.pending.dist : this.end.dist;
  }
  resolve(dist, lx = 0, followPending = false) {
    for (const seg of this.segs) {
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
        for (const seg of br.segs) {
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
    if (seg.type === 'straight') return poseAtStraight(seg, dist, lx);
    return poseOnArc({ x: seg.x0, z: seg.z0, yaw: seg.yaw0, dist: seg.dist0 }, seg.dir || (seg.type === 'left' ? -1 : 1), dist - seg.dist0, lx);
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
    this.pending = null;
    this.branches = { left: null, right: null };
    // plan a specific type
    this.pending = { type, dist: d, x: pose.x, z: pose.z, yaw: pose.yaw, committed: false, chosen: 0 };
    const after = 28;
    this.branches.left = (type === 'left' || type === 'tee') ? this._buildBranch(this.end, -1, after) : null;
    this.branches.right = (type === 'right' || type === 'tee') ? this._buildBranch(this.end, 1, after) : null;
    return true;
  }
  visuals() {
    const list = this.segs.slice();
    if (this.branches.left) list.push(...this.branches.left.segs);
    if (this.branches.right) list.push(...this.branches.right.segs);
    if (this._lastAbandoned) list.push(...this._lastAbandoned.segs);
    return list;
  }
}

// ---------------- penguin ----------------
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
    const haloMat = new THREE.MeshBasicMaterial({
      color: PHASE_COL[BLOOM],
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), haloMat);
    this.halo.scale.set(1.2, 1.5, 1.3);
    this.halo.position.y = 0.62;
    this.halo.renderOrder = 2;
    this.hop.add(this.halo);

    const rimMat = new THREE.MeshBasicMaterial({
      color: PHASE_COL_B[BLOOM],
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.rimMesh = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 12), rimMat);
    this.rimMesh.scale.set(1.12, 1.45, 1.22);
    this.rimMesh.position.y = 0.58;
    this.rimMesh.renderOrder = 1;
    this.hop.add(this.rimMesh);

    this.auraLight = new THREE.PointLight(PHASE_COL[BLOOM], 1.35, 4.2, 2);
    this.auraLight.position.set(0, 0.9, -0.35);
    this.hop.add(this.auraLight);
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
      act.setLoop(THREE.LoopRepeat, Infinity);
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
    if (this.halo) this.halo.material.color.setHex(a);
    if (this.rimMesh) this.rimMesh.material.color.setHex(b);
    if (this.auraLight) this.auraLight.color.setHex(a);
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
      else if (ev.moving || ev.idleRun) clip = 'Run';
      this._play(clip, ev.sliding || ev.jumpY > 0.02 ? 0.08 : 0.16);
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

    // Aura pulse and Aurora teal-violet crawl. Clothing stays put.
    const pulse = 1 + Math.sin((ev.time || this.runT) * 3.2) * 0.06;
    if (this.halo) {
      this.halo.scale.set(1.2 * pulse, 1.5 * pulse, 1.3 * pulse);
      this.halo.material.opacity = 0.12 + 0.06 * pulse;
    }
    if (this.rimMesh) {
      this.rimMesh.scale.set(1.12 * pulse, 1.45 * pulse, 1.22 * pulse);
      if (this.phase === AURORA) {
        const w = 0.5 + 0.5 * Math.sin((ev.time || 0) * 2.4);
        this.rimMesh.material.color.lerpColors(col(PHASE_COL[AURORA]), col(PHASE_COL_B[AURORA]), w);
        if (this.auraLight) this.auraLight.color.lerpColors(col(PHASE_COL[AURORA]), col(PHASE_COL_B[AURORA]), w);
        this.rimMesh.material.opacity = 0.28;
      } else {
        this.rimMesh.material.color.setHex(PHASE_COL_B[BLOOM]);
        this.rimMesh.material.opacity = 0.2;
        if (this.auraLight) this.auraLight.color.setHex(PHASE_COL[BLOOM]);
      }
    }
    if (this.auraLight) this.auraLight.intensity = 0.7 + pulse * 0.25;

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
    this.fill = new THREE.PointLight(PHASE_COL[0], 0.9, 9, 2);
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

    this.pathMat = std(0xc9a067, { roughness: 0.72, map: pathTex() });
    this.pathMat.map.repeat.set(1, 1);
    this.curbMat = std(0x8a6230, { roughness: 0.7 });
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
    if (!this.pathMat) this.pathMat = std(s.path, { roughness: 0.72, map: pathTex() });
    this.pathMat.color.setHex(s.path);
    this.curbMat.color.setHex(s.pathDark);
    return this.pathMat;
  }

  _ensureSegMesh(seg, season) {
    if (this._segMeshes.has(seg.id)) return this._segMeshes.get(seg.id);
    const g = new THREE.Group();
    g.userData.segId = seg.id;
    const mat = this._pathMatFor(season);
    if (seg.type === 'straight') {
      const len = Math.max(0.2, seg.length);
      const slab = new THREE.Mesh(this.geo.pathSlab, mat);
      slab.scale.z = len;
      slab.position.y = 0.02;
      slab.receiveShadow = true;
      slab.castShadow = false;
      g.add(slab);
      const curbL = new THREE.Mesh(this.geo.curb, this.curbMat);
      const curbR = new THREE.Mesh(this.geo.curb, this.curbMat);
      curbL.scale.z = curbR.scale.z = len;
      curbL.position.set(-PATH_W * 0.5, 0.12, 0);
      curbR.position.set(PATH_W * 0.5, 0.12, 0);
      curbL.castShadow = curbR.castShadow = true;
      g.add(curbL, curbR);
      const mid = poseAtStraight(seg, (seg.dist0 + seg.dist1) * 0.5, 0);
      g.position.set(mid.x, 0, mid.z);
      g.rotation.y = seg.yaw0;
    } else {
      const dir = seg.dir || (seg.type === 'left' ? -1 : 1);
      const arc = new THREE.Mesh(makeArcGeom(dir), mat);
      arc.receiveShadow = true;
      g.add(arc);
      g.position.set(seg.x0, 0, seg.z0);
      g.rotation.y = seg.yaw0;
    }
    this.pathG.add(g);
    this._segMeshes.set(seg.id, g);
    return g;
  }

  _decorateSeg(seg, season) {
    if (seg._decorated === season + ':' + seg.id) return;
    seg._decorated = season + ':' + seg.id;
    if (seg.type !== 'straight') return;
    const step = 4.2;
    for (let d = seg.dist0 + 1.5; d < seg.dist1; d += step) {
      for (const side of [-1, 1]) {
        const lat = side * rand(4.5, 8.5);
        const pose = poseAtStraight(seg, d + rand(-0.8, 0.8), lat);
        this._placeProp('tree', pose.x, pose.z, season);
        if (Math.random() < 0.7) {
          const p2 = poseAtStraight(seg, d + 1.2, side * rand(3.6, 6.8));
          this._placeProp('bush', p2.x, p2.z, season);
        }
        if (season === 0 && Math.random() < 0.8) {
          const p3 = poseAtStraight(seg, d + 0.6, side * rand(3.4, 6.2));
          this._placeProp('flower', p3.x, p3.z, season);
        }
      }
    }
  }

  syncPath(path, season, playerDist) {
    const visuals = path.visuals();
    const live = new Set(visuals.map(s => s.id));
    for (const [id, mesh] of this._segMeshes) {
      if (!live.has(id)) {
        this.pathG.remove(mesh);
        this._segMeshes.delete(id);
      }
    }
    for (const seg of visuals) {
      this._ensureSegMesh(seg, season);
      if (seg.dist1 > playerDist - 20) this._decorateSeg(seg, season);
    }
    this._syncChevrons(path);
    this._cullPropsOnPath(path);
  }

  _cullPropsOnPath(path) {
    const half = PATH_W * 0.5 + 1.15;
    for (const p of this.props) {
      if (!p.mesh || !p.mesh.visible) continue;
      const x = p.mesh.position.x, z = p.mesh.position.z;
      for (const seg of path.segs) {
        let pose;
        if (seg.type === 'straight') {
          const v = yawVec(seg.yaw0);
          const dx = x - seg.x0, dz = z - seg.z0;
          const along = dx * v.fx + dz * v.fz;
          if (along < -1 || along > seg.length + 1) continue;
          const lat = Math.abs(dx * v.sx + dz * v.sz);
          if (lat < half) { p.mesh.visible = false; break; }
        } else {
          const mid = path._poseSeg(seg, (seg.dist0 + seg.dist1) * 0.5, 0);
          const d = Math.hypot(x - mid.x, z - mid.z);
          if (d < TURN_R + half) { p.mesh.visible = false; break; }
        }
      }
    }
  }

  _syncChevrons(path) {
    // Remove old chevrons and place new ones approaching the pending turn.
    for (const c of this.chevL) this.pathG.remove(c);
    for (const c of this.chevR) this.pathG.remove(c);
    this.chevL.length = 0; this.chevR.length = 0;
    const p = path.pending;
    if (!p || p.committed) return;
    const showL = p.type === 'left' || p.type === 'tee';
    const showR = p.type === 'right' || p.type === 'tee';
    for (let i = 1; i <= 3; i++) {
      const d = p.dist - 2.4 * i - 1.2;
      if (d < 0) continue;
      const pose = path.resolve(d, 0, false);
      if (showL) {
        const m = new THREE.Mesh(this.geo.chevron, this.mChevron);
        m.rotation.set(-Math.PI / 2, 0, pose.yaw + Math.PI / 2);
        m.position.set(pose.x + pose.sx * -0.85, 0.22, pose.z + pose.sz * -0.85);
        m.scale.set(1.3, 1.6, 1.3);
        this.pathG.add(m); this.chevL.push(m);
      }
      if (showR) {
        const m = new THREE.Mesh(this.geo.chevron, this.mChevron);
        m.rotation.set(-Math.PI / 2, 0, pose.yaw - Math.PI / 2);
        m.position.set(pose.x + pose.sx * 0.85, 0.22, pose.z + pose.sz * 0.85);
        m.scale.set(1.3, 1.6, 1.3);
        this.pathG.add(m); this.chevR.push(m);
      }
    }
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
    for (let i = 0; i < 28; i++) this.coins.push(this._coin());
    for (let i = 0; i < 8; i++) this.gates.push(this._gate());
    for (let i = 0; i < 14; i++) this.obs.push(this._obs());
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
    const beamGeo = new THREE.CapsuleGeometry(0.16, 5.7, 6, 10);
    const panelGeo = new THREE.BoxGeometry(5.7, 1.55, 0.05);
    const mSolid = std(0xff8fb3, { roughness: 0.32, emissive: 0xff8fb3, emissiveIntensity: 0.45, transparent: true, opacity: 0.48, depthWrite: false });
    const mFrame = std(0xff8fb3, { roughness: 0.32, emissive: 0xe85a8c, emissiveIntensity: 0.4 });
    const left = new THREE.Mesh(pillarGeo, mFrame); left.position.set(-3.0, 0.95, 0); left.castShadow = true;
    const right = new THREE.Mesh(pillarGeo, mFrame); right.position.set(3.0, 0.95, 0); right.castShadow = true;
    const top = new THREE.Mesh(beamGeo, mFrame); top.position.set(0, 1.82, 0); top.rotation.z = Math.PI / 2;
    const capL = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), mFrame); capL.position.set(-3.0, 1.82, 0);
    const capR = capL.clone(); capR.position.x = 3.0;
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
    return { type: 'low', mesh: g, live: false, lane: 0, z: 0, height: 0.65, kind: 'low', built: '', nearMissed: false };
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
      o.left.position.x = -3.0; o.right.position.x = 3.0;
      if (o.capL) o.capL.position.x = -3.0;
      if (o.capR) o.capR.position.x = 3.0;
      o.top.scale.x = 1;
      o.panel.scale.x = 1;
    } else {
      o.left.position.x = -0.7; o.right.position.x = 0.7;
      if (o.capL) o.capL.position.x = -0.7;
      if (o.capR) o.capR.position.x = 0.7;
      o.top.scale.x = 0.28;
      o.panel.scale.x = 0.24;
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
  buildObs(o, kind, season) {
    const mesh = o.mesh;
    while (mesh.children.length) mesh.remove(mesh.children[0]);
    o.kind = kind;
    o.type = kind;
    o.height = kind === 'low' ? 0.72 : 1.7;
    o.nearMissed = false;
    if (kind === 'low') {
      // Chunky rounded barriers, readable from far: big saturated body + a vertical glow nib.
      let body, mat;
      if (season === 0) {
        mat = std(0x3da84c, { roughness: 0.62, emissive: 0x1e6a30, emissiveIntensity: 0.12 });
        body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.85, 6, 14), mat);
        body.rotation.z = Math.PI / 2; body.position.y = 0.42; body.castShadow = true; mesh.add(body);
        for (let i = 0; i < 4; i++) {
          const f = new THREE.Mesh(this.geo.sphereLo, std(0xff8fb3, { emissive: 0xff8fb3, emissiveIntensity: 0.3 }));
          f.position.set(-0.48 + i * 0.32, 0.78, 0.12);
          f.scale.setScalar(0.14); mesh.add(f);
        }
      } else if (season === 1) {
        mat = std(0xe8c14a, { roughness: 0.5, emissive: 0xc48a18, emissiveIntensity: 0.12 });
        body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 6, 14), mat);
        body.rotation.z = Math.PI / 2; body.position.y = 0.42; body.castShadow = true; mesh.add(body);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 16), std(0xd48a1a, { emissive: 0xd48a1a, emissiveIntensity: 0.2 }));
        band.rotation.y = Math.PI / 2; band.position.y = 0.42; mesh.add(band);
      } else if (season === 2) {
        mat = std(0xe07a2a, { roughness: 0.62, emissive: 0xb84a10, emissiveIntensity: 0.15 });
        body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.95, 6, 14), mat);
        body.rotation.z = Math.PI / 2; body.position.y = 0.44; body.castShadow = true; mesh.add(body);
        const end1 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), std(0xc45a18));
        end1.position.set(-0.7, 0.44, 0); mesh.add(end1);
        const end2 = end1.clone(); end2.position.x = 0.7; mesh.add(end2);
      } else {
        mat = std(0xbfe9ff, { roughness: 0.22, metalness: 0.18, transparent: true, opacity: 0.9, emissive: 0x7ad7ff, emissiveIntensity: 0.28 });
        body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 6, 14), mat);
        body.rotation.z = Math.PI / 2; body.position.y = 0.44; body.castShadow = true; mesh.add(body);
      }
      const nib = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), std(0xfff0a0, { emissive: 0xffe080, emissiveIntensity: 0.8 }));
      nib.position.set(0, 0.95, 0);
      mesh.add(nib);
    } else {
      const postM = std(0x5a4630, { roughness: 0.65 });
      const barC = [0xff8fb3, 0x4ec4d6, 0xff7a2a, 0x9fe8ff][season];
      const p1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.55, 5, 10), postM);
      const p2 = p1.clone();
      p1.position.set(-0.78, 0.9, 0); p2.position.set(0.78, 0.9, 0);
      p1.castShadow = true; p2.castShadow = true;
      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 1.45, 5, 10), std(barC, { emissive: barC, emissiveIntensity: 0.4 }));
      bar.rotation.z = Math.PI / 2; bar.position.y = 0.95; bar.castShadow = true;
      const bar2 = bar.clone(); bar2.position.y = 1.42;
      mesh.add(p1, p2, bar, bar2);
    }
    o.built = season + kind;
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
    this.lastLane = 0;
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
      // Portrait: gamma is left/right tilt. Tilting the phone right should move Pip right (lane +1).
      this.raw = ev.gamma;
      if (!this.calibrated) { this.neutral = this.raw; this.calibrated = true; }
    });
  }
  calibrate() {
    this.neutral = this.raw;
    this.calibrated = true;
    this.filtered = 0;
  }
  live() {
    return this.hasDevice && (performance.now() - this._lastEvt) < 1500;
  }
  sample() {
    if (!this.live()) return this.lastLane;
    const x = this.raw - this.neutral;
    this.filtered += (x - this.filtered) * 0.22;
    const f = this.filtered;
    let lane = this.lastLane;
    if (lane === 0) {
      if (f > 14) lane = 1;
      else if (f < -14) lane = -1;
    } else if (lane === 1) {
      if (f < 5) lane = 0;
      if (f < -14) lane = -1;
    } else {
      if (f > -5) lane = 0;
      if (f > 14) lane = 1;
    }
    this.lastLane = lane;
    return lane;
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

    this.lane = 0; this.px = 0; this.pz = 0;
    this.wx = 0; this.wz = 0; this.yaw = 0;
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = BLOOM; this.phaseCd = 0;
    this.speed = 11; this.elapsed = 0; this.dist = 0;
    this.score = 0; this.runCoins = 0;
    this.shake = 0; this.deadT = 0; this.invuln = 0;
    this.camX = 0; this.camTilt = 0; this.camFov = 54;
    this.fovKick = 0;
    this.spawnZ = 0; this.rowCount = 0; this.lastGate = -10;
    this.lean = 0;
    this.homeOff = 0;
    this.toastT = 0;
    this.turnBuf = 0; this.turnBufT = 0;
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
    document.getElementById('btn-start').addEventListener('click', ev => { ev.stopPropagation(); this._requestMotion(); this.startRun(); });
    document.getElementById('btn-shop').addEventListener('click', ev => { ev.stopPropagation(); this.openShop(); });
    document.getElementById('btn-shop-close').addEventListener('click', ev => { ev.stopPropagation(); this.closeShop(); });
    document.getElementById('tab-upgrades').addEventListener('click', ev => { ev.stopPropagation(); this.shopTab = 'upgrades'; this.renderShop(); });
    document.getElementById('tab-costumes').addEventListener('click', ev => { ev.stopPropagation(); this.shopTab = 'costumes'; this.renderShop(); });
    document.getElementById('btn-retry').addEventListener('click', ev => { ev.stopPropagation(); this._requestMotion(); this.startRun(); });
    document.getElementById('btn-home').addEventListener('click', ev => { ev.stopPropagation(); this._goHome(); });
    this.$.mute.addEventListener('click', ev => {
      ev.stopPropagation();
      this.save.muted = !this.save.muted;
      this.music.setMuted(this.save.muted);
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
      const dist = Math.hypot(dx, dy);
      const dt = Math.max(1, performance.now() - this.sw.t);
      const flick = dist / dt > 0.4 || dt < 180;
      const touch = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia('(pointer: coarse)').matches;
      // Vertical flicks always jump / slide.
      if (Math.abs(dy) >= Math.abs(dx) && dist > 46) {
        this.sw.done = true; this._swipe(dx, dy);
        return;
      }
      // Horizontal flicks are turns, never lanes. Touch phones never use drag-as-tilt.
      if (Math.abs(dx) > Math.abs(dy) && dist > 46 && (touch || flick || dist > 70)) {
        this.sw.done = true; this._swipe(dx, dy);
        return;
      }
      // Desktop / no-gyro only: a slow held drag stands in for tilt and must not steal swipes.
      if (!touch && !this.tilt.live() && dt > 180 && Math.abs(dx) > 36) {
        const lane = dx > 90 ? 1 : dx < -90 ? -1 : 0;
        if (lane !== this.lane) this.move(lane - this.lane, true);
        this._deskTilt = dx;
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
          if (Math.hypot(dx, dy) > 30) this._swipe(dx, dy); else this._tap();
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
      if (k === 'ArrowLeft' || k === 'KeyA') this.move(-1);
      else if (k === 'ArrowRight' || k === 'KeyD') this.move(1);
      else if (k === 'KeyQ' || k === 'Comma') this.turn(-1);
      else if (k === 'KeyE' || k === 'Period') this.turn(1);
      else if (k === 'ArrowUp' || k === 'KeyW') this.jump();
      else if (k === 'ArrowDown' || k === 'KeyS') this.slide();
      else if (k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight') this.togglePhase();
    });
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
    const n = clamp(this.lane + d, -1, 1);
    if (n !== this.lane) {
      this.lane = n;
      if (!fromTilt) Sfx.lane();
    }
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
    return { before: Math.max(2.8, 0.38 * speed), after: Math.max(1.05, 0.14 * speed) };
  }
  _tryConsumeTurn() {
    const p = this.path.pending;
    if (!p || p.committed || !this.turnBuf) return false;
    const w = this._turnWindow(this.speed);
    if (this.pz < p.dist - w.before || this.pz > p.dist + w.after) return false;
    if (this.path.commit(this.turnBuf, this.elapsed)) {
      Sfx.turn();
      this.fovKick = Math.max(this.fovKick, 6);
      this.shake = Math.max(this.shake, 0.18);
      this.turnBuf = 0; this.turnBufT = 0;
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
      this.toast('Tap to shift  ·  Tilt to move  ·  Swipe to turn', 2.2);
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
    this.pz = 0; this.px = 0; this.lane = 0;
    this.wx = 0; this.wz = 0; this.yaw = 0;
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.speed = 10.5; this.elapsed = 0;
    this.offPath = false;
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
    this.lane = 0; this.px = 0; this.pz = 0;
    this.wx = 0; this.wz = 0; this.yaw = 0;
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = BLOOM; this.phaseCd = 0;
    this.offPath = false;
    this.turnBuf = 0; this.turnBufT = 0;
    this.fovKick = 0;
    this.penguin.setForm(BLOOM, true);
    this.penguin.setCostume(this.save.equipped);
    this.penguin.root.rotation.set(0, 0, 0);
    this.elapsed = 0; this.dist = 0; this.score = 0; this.runCoins = 0;
    this.shake = 0; this.deadT = 0; this.invuln = 0;
    const hs = this.save.upgrades.headStart | 0;
    this.elapsed = hs * 3.5;
    this.speed = this._calcSpeed();
    this.rowCount = 0; this.lastGate = -99;
    this._spdLvl = Math.floor(this.elapsed / 20);
    this.shields = this.save.upgrades.shield | 0;
    this.lives = this.save.upgrades.extraLife | 0;
    this.coinMul = 1 + 0.5 * (this.save.upgrades.doubleCoins | 0);
    this.magLv = this.save.upgrades.magnet | 0;
    this.ignoreHit = false;
    this.path.resetRun(this.elapsed);
    this.spawnZ = this.pz + WARMUP;
    this.world.setSeason(this.season, 0, this.path);
    this.world._applyPhaseWash(BLOOM, true);
    this._formUI();
    this._hud();
    this.tilt.lastLane = 0;
    this.tilt.calibrate();
    if (skipCount) {
      this.state = 'play';
      this.toast('Tap to shift  ·  Tilt to move  ·  Swipe to turn', 2.2);
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
    const u = clamp(this.elapsed / 80, 0, 1);
    return lerp(16.5, 9.2, u * u * 0.35 + u * 0.65);
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

  _ensureSpawn() {
    const limit = this.path.officialEndDist() - 1.5;
    while (this.spawnZ < this.pz + SPAWN_AHEAD && this.spawnZ < limit) {
      this._spawnRow(this.spawnZ);
      this.spawnZ += this._gap();
    }
  }
  _spawnRow(z) {
    this.rowCount++;
    const t = this.elapsed;
    const r = Math.random();
    const lanes = [-1, 0, 1];
    const gateChance = t < 5 ? 0 : Math.min(0.12 + t * 0.0055, 0.36);
    const minGate = t < 8 ? 5 : (t < 25 ? 4 : 3);
    if (r < gateChance && this.rowCount - this.lastGate >= minGate) {
      this.lastGate = this.rowCount;
      const ph = Math.random() < 0.62 ? this.phase : this.phase ^ 1;
      this._addGate(z, ph, 'all');
      const cl = lanes[irand(3)];
      this._addCoinLine(cl, z + 5, 4);
      return;
    }
    if (r < gateChance + 0.12 && t > 10 && this.rowCount - this.lastGate >= 2) {
      this.lastGate = this.rowCount;
      const take = 1 + (Math.random() < Math.min(0.2 + t * 0.01, 0.7) ? 1 : 0);
      const sh = lanes.slice().sort(() => Math.random() - 0.5);
      for (let i = 0; i < take; i++) this._addGate(z, Math.random() < 0.5 ? 0 : 1, 'lane', sh[i]);
      this._addCoinLine(sh[take] ?? 0, z + 3, 3);
      return;
    }
    if (r > 0.86) {
      const l = lanes[irand(3)];
      this._addCoinLine(l, z, 5);
      return;
    }
    const n = Math.random() < Math.min(0.22 + t * 0.01, 0.7) ? 2 : 1;
    const sh = lanes.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const typ = Math.random() < 0.55 ? 'low' : 'high';
      this._addObs(typ, sh[i], z);
    }
    if (Math.random() < 0.7) this._addCoinLine(sh[n] ?? 0, z + 2, 3);
  }
  _addCoinLine(lane, z, n) {
    for (let i = 0; i < n; i++) {
      const ph = (i % 2 === 0) ? ((Math.random() < 0.7) ? this.phase : this.phase ^ 1) : (Math.random() < 0.5 ? 0 : 1);
      this._addCoin(lane, z + i * 1.7, 0, ph);
    }
  }
  _addCoin(lane, z, h, phase) {
    const o = this.pools.obtain(this.pools.coins); if (!o) return;
    o.live = true; o.taken = false; o.lane = lane; o.z = z; o.h = h || 0;
    this.pools.styleCoin(o, phase == null ? (Math.random() < 0.5 ? BLOOM : AURORA) : phase);
    o.mesh.visible = true;
    this._placeOnPath(o);
  }
  _addGate(z, phase, span, lane = 0) {
    const o = this.pools.obtain(this.pools.gates); if (!o) return;
    o.live = true; o.z = z; o.lane = lane; o.type = 'gate';
    this.pools.styleGate(o, phase, span);
    o.mesh.visible = true;
    this._placeOnPath(o);
  }
  _addObs(kind, lane, z) {
    const o = this.pools.obtain(this.pools.obs); if (!o) return;
    o.live = true; o.lane = lane; o.z = z; o.type = kind; o.nearMissed = false;
    this.pools.buildObs(o, kind, this.season);
    o.mesh.visible = true;
    this._placeOnPath(o);
  }
  _placeOnPath(o) {
    const lx = (o.span === 'all') ? 0 : laneX(o.lane || 0);
    const pose = this.path.resolve(o.z, lx, true);
    o.mesh.position.set(pose.x, 0, pose.z);
    o.mesh.rotation.y = pose.yaw;
    if (o.type === 'coin') o.mesh.position.y = 0.55 + (o.h || 0);
  }

  collides(o) {
    if (!o || !o.live || o.taken) return false;
    if (!o.mesh || !o.mesh.visible) return false;
    if (this.offPath) return false;
    const dz = o.z - this.pz;
    if (dz < 0.12 || dz > 1.05) return false;
    if (o.type === 'coin') return false;
    const px = this.px;
    if (o.span === 'all' || (o.type === 'gate' && o.span === 'all')) {
      // full width
    } else {
      const ox = laneX(o.lane || 0);
      const half = (o.type === 'gate') ? 0.75 : 0.62;
      if (Math.abs(px - ox) > half) return false;
    }
    if (o.type === 'gate') return o.phase === this.phase;
    if (o.type === 'low') return this.jumpY < 0.68;
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
    this._die();
  }
  _die() {
    this.state = 'dying';
    this.deadT = 0;
    this.shake = 0.7;
    Sfx.hit();
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
    this.$.overCoins.textContent = 'COINS  +' + earned;
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

    if (playing) {
      this.elapsed += dt;
      this.speed = this._calcSpeed();
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
      if (this.tilt.live()) {
        const tl = this.tilt.sample();
        if (tl !== this.lane) this.move(tl - this.lane, true);
      }
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
      this.speed = Math.max(0, this.speed - 18 * dt);
      if (!this.offPath) this.pz += this.speed * dt;
      if (this.deadT > 0.85) this._endRun();
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

    const targetX = laneX(this.lane);
    const k = 1 - Math.exp(-16 * dt);
    const prevX = this.px;
    this.px += (targetX - this.px) * k;
    this.lean = clamp((targetX - this.px) * 1.8 + (this.px - prevX) / Math.max(dt, 0.0001) * 0.08, -1.5, 1.5);

    if (this.offPath && (playing || dying)) {
      this.offVelY -= 22 * dt;
      this.wx += this.offVelX * dt;
      this.wz += this.offVelZ * dt;
      this.jumpY = Math.max(-4, this.jumpY + this.offVelY * dt);
      if (this.jumpY < -0.6 && this.state === 'play') this._die();
      this.pose = { x: this.wx, z: this.wz, yaw: this.yaw, ...yawVec(this.yaw) };
    } else {
      this.pose = this.path.resolve(this.pz, this.px, false);
      this.wx = this.pose.x; this.wz = this.pose.z; this.yaw = this.pose.yaw;
    }

    this.penguin.root.position.set(this.wx, Math.max(0, this.jumpY < 0 && this.offPath ? this.jumpY : 0), this.wz);
    this.penguin.root.rotation.y = this.yaw;
    this.penguin.animate(dt, {
      moving: playing || home || counting,
      idleRun: home || counting,
      speed: this.speed,
      jumpY: Math.max(0, this.jumpY),
      sliding: this.slideT > 0 && this.jumpY <= 0.02,
      lean: this.lean,
      falling: dying || (this.offPath && this.jumpY < 0.1),
      fallT: this.deadT,
      onGround: this.jumpY <= 0.02,
      homeThreeQ: home,
      time: this.elapsed || this.world.time
    });
    if (this.invuln > 0 && playing) this.penguin.root.visible = (Math.sin(this.invuln * 30) > 0);
    else this.penguin.root.visible = true;

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

  _tickEntities(dt) {
    const t = this.elapsed;
    for (const o of this.pools.coins) {
      if (!o.live || o.taken) continue;
      o.mesh.rotation.y += dt * 4.2;
      const pose = this.path.resolve(o.z, laneX(o.lane), true);
      o.mesh.position.set(pose.x, 0.55 + o.h + Math.sin(t * 4 + o.z) * 0.08, pose.z);
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
      const laneClose = Math.abs(laneX(o.lane) - this.px) < 0.55 || Math.hypot(o.mesh.position.x - this.wx, o.mesh.position.z - this.wz) < 0.7;
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
    const same = Math.abs(laneX(o.lane) - this.px) < 0.7;
    const adj = Math.abs((o.lane || 0) - this.lane) === 1 && Math.abs(laneX(o.lane) - this.px) < 1.4;
    const jumped = o.type === 'low' && same && this.jumpY >= 0.68;
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
    const bob = (this.jumpY <= 0.02 && (playing || home))
      ? Math.sin(this.penguin.runT * Math.PI * 2) * 0.045 : 0;
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const shx = this.shake ? (hash(this.elapsed, 1) - 0.5) * this.shake * 0.35 : 0;
    const shy = this.shake ? (hash(this.elapsed, 2) - 0.5) * this.shake * 0.3 : 0;

    this.camX += (this.px - this.camX) * Math.min(1, 6.2 * dt);
    const v = this.pose || yawVec(this.yaw);
    let dist, height, lookAhead, lookY, fov;
    if (home) {
      dist = 4.4; height = 1.7; lookAhead = 0.55; lookY = 0.62; fov = 46;
    } else {
      dist = 5.8 - speedK * 0.45;
      height = 2.25 + speedK * 0.15;
      lookAhead = 7.2;
      lookY = 0.45 + Math.max(0, this.jumpY) * 0.2;
      fov = 52 + speedK * 8 + this.fovKick;
    }
    const side = home ? 1.85 : 0;
    // Camera tracks a lagged lane offset so Pip visibly moves into a lane (screen-right is +lane).
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
      get save() { return self.save; },
      get VERSION() { return VERSION; },
      get ready() { return !!self.penguin.ready; },
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
      addCoin: (lane, z, h, phase) => self._addCoin(lane, z, h, phase),
      forceTurn: (type, atDist) => self.path.forceTurn(type, atDist),
      pendingTurn: () => self.path.pending && { type: self.path.pending.type, dist: self.path.pending.dist, committed: self.path.pending.committed },
      setInvincible(v) { self.ignoreHit = !!v; },
      objects() {
        return {
          gates: self.pools.gates.filter(o => o.live).map(o => ({ type: o.type, z: o.z, phase: o.phase, span: o.span, lane: o.lane, visible: o.mesh.visible })),
          obs: self.pools.obs.filter(o => o.live).map(o => ({ type: o.type, z: o.z, lane: o.lane, visible: o.mesh.visible })),
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
    await g.penguin.load();
    g.penguin.setCostume(g.save.equipped || 'classic');
    const boot = document.getElementById('boot');
    if (boot) boot.classList.add('hidden');
  } catch (err) {
    console.error(err);
    const boot = document.getElementById('boot');
    if (boot) { boot.classList.remove('hidden'); boot.textContent = 'Could not start the 3D game.'; }
  }
});
