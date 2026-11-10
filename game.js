// Season Shift v3.1 — SEASON_SHIFT_V3_1_1
// An original 3D endless runner for Joseph. Pip the hoodie penguin, Ember & Frost.
import * as THREE from './lib/three.module.min.js';

const VERSION = 'SEASON_SHIFT_V3_1_1';
const SAVE_KEY = 'cometCourierSave';
const BEST_KEY = 'cometCourierBest';
const EMBER = 0, FROST = 1;
const PHASE_COL = [0xff6a21, 0x7ad7ff];
const PHASE_NAME = ['EMBER', 'FROST'];
const LANE_W = 1.7;
function laneX(lane) { return -lane * LANE_W; }
const SPAWN_AHEAD = 72;
const WARMUP = 28;
const MAX_DT = 0.05;

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

window.__VERSION = VERSION;
window.__SHOP = { UPGRADES, COSTUMES };
window.__SEASONS = SEASONS;

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
      if (typeof raw.best === 'number' && raw.best > Math.max(...s.seasonBest)) {
        // keep a global best too
      }
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
      this.master.gain.value = 0.28; // sit under the season music
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
  jump() {
    this.tone(220, 620, 0.11, 'sine', 0.16);
    this.tone(620, 280, 0.16, 'sine', 0.1, 0.08);
  },
  slide() { this.whoosh(0.18, 0.22, 900, 220); this.tone(340, 140, 0.16, 'sine', 0.05); },
  lane() { this.whoosh(0.1, 0.2, 700, 1100); this.tone(520, 640, 0.06, 'sine', 0.05); },
  phase(p) { p ? this.tone(880, 280, 0.22, 'sine', 0.12) : this.tone(280, 880, 0.22, 'sine', 0.12); this.whoosh(0.14, 0.12, 400, 1400); },
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
    this.tracks.forEach((a, i) => { a.muted = m; if (m) a.volume = 0; });
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
    coin: new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20),
    coinI: new THREE.TorusGeometry(0.22, 0.035, 8, 20),
    plane: new THREE.PlaneGeometry(1, 1, 1, 1),
    hood: new THREE.SphereGeometry(0.34, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    daisy: new THREE.CircleGeometry(0.12, 8),
    streak: new THREE.BoxGeometry(0.03, 0.03, 1.4)
  };
}

function makeGroundShader(season) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uPath: { value: col(season.path) },
      uPathDark: { value: col(season.pathDark) },
      uGround: { value: col(season.ground) },
      uGroundDark: { value: col(season.groundDark) },
      uLine: { value: new THREE.Color('#f4efe4') },
      uPathW: { value: 3.15 },
      uLane: { value: LANE_W },
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
      uniform vec3 uPath,uPathDark,uGround,uGroundDark,uLine;
      uniform float uPathW,uLane,uWinter,uSummer;
      varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      void main(){
        float n = noise(vW.xz*1.6);
        float n2 = noise(vW.xz*4.5);
        float ax = abs(vW.x);
        float pathM = smoothstep(uPathW+0.55, uPathW-0.15, ax);
        vec3 dirt = mix(uPathDark, uPath, 0.45 + n*0.55);
        vec3 grass = mix(uGroundDark, uGround, 0.4 + n*0.6 + n2*0.15);
        vec3 colr = mix(grass, dirt, pathM);
        // lane dashed lines
        float dash = step(0.42, fract(vW.z*0.42));
        float lineW = 0.055;
        float l0 = smoothstep(lineW, 0.0, abs(ax - uLane*0.5));
        float l1 = smoothstep(lineW, 0.0, abs(ax - uLane*1.5));
        float l2 = smoothstep(lineW, 0.0, abs(ax + uLane*0.5));
        float l3 = smoothstep(lineW, 0.0, abs(ax + uLane*1.5));
        float lines = max(max(l0,l1), max(l2,l3)) * dash * pathM;
        colr = mix(colr, uLine, lines * (uWinter>0.5 ? 0.55 : 0.9));
        // path edge
        float edge = smoothstep(0.12, 0.0, abs(ax-uPathW)) * (1.0-uWinter);
        colr = mix(colr, uPathDark*0.75, edge*0.8);
        if (uSummer > 0.5) {
          float shore = smoothstep(6.2, 8.4, vW.x);
          vec3 sand = mix(uGround, vec3(0.95,0.86,0.62), 0.4);
          vec3 water = mix(vec3(0.10,0.42,0.58), vec3(0.30,0.75,0.82), 0.45 + 0.35*noise(vW.xz*0.35));
          float foam = smoothstep(7.6, 8.4, vW.x) * (1.0-smoothstep(8.4, 9.2, vW.x));
          colr = mix(colr, sand, smoothstep(5.2, 6.4, vW.x));
          colr = mix(colr, water, shore);
          colr = mix(colr, vec3(0.92,0.97,1.0), foam*0.8);
        }
        gl_FragColor = vec4(colr, 1.0);
      }`
  });
  m.extensions = m.extensions || {};
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
      uSunDir: { value: new THREE.Vector3(...season.sunDir).normalize() }
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vDir = position;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uZenith,uHorizon,uSun,uSunDir;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(uHorizon, uZenith, smoothstep(-0.08, 0.72, h));
        float sun = pow(max(0.0, dot(d, normalize(uSunDir))), 48.0);
        float glow = pow(max(0.0, dot(d, normalize(uSunDir))), 4.0);
        c += uSun * sun * 1.1 + uSun * glow * 0.22;
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

// ---------------- penguin ----------------
class Penguin {
  constructor(geo) {
    this.geo = geo;
    this.root = new THREE.Group();
    this.hop = new THREE.Group();
    this.bodyG = new THREE.Group();
    this.root.add(this.hop);
    this.hop.add(this.bodyG);

    this.mHoodie = std(0xff5a46, { roughness: 0.62 });
    this.mTrim = std(0xd44232, { roughness: 0.62 });
    this.mFur = std(0x1a2230, { roughness: 0.7 });
    this.mBelly = std(0xf6efe3, { roughness: 0.72 });
    this.mBeak = std(0xff9f43, { roughness: 0.38 });
    this.mFoot = std(0xff7a1a, { roughness: 0.42 });
    this.mEye = std(0xffffff, { roughness: 0.3 });
    this.mPupil = std(0x16161c, { roughness: 0.3 });
    this.mBlush = std(0xff8a9a, { roughness: 0.8 });
    this.mString = std(0xf2e6d0, { roughness: 0.65 });
    this.mHoodIn = std(0xffe8dc, { roughness: 0.7, side: THREE.BackSide });
    this.mPatch = std(0xff6a21, { roughness: 0.5, emissive: 0xff6a21, emissiveIntensity: 0.25 });
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

    this._build();
    this.phase = EMBER;
    this.costume = 'classic';
    this.runT = 0;
    this.burst = [];
    this.setCostume('classic');
    this.setForm(EMBER, true);
  }

  _mesh(geo, mat, parent, x = 0, y = 0, z = 0, sx, sy, sz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (sx != null) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  _build() {
    const g = this.geo;
    // Short legs, big slappy orange feet
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.11, 0.26, 0);
    this.legR.position.set(0.11, 0.26, 0);
    this.bodyG.add(this.legL, this.legR);
    this._mesh(g.capLeg, this.mFur, this.legL, 0, -0.08, 0);
    this._mesh(g.capLeg, this.mFur, this.legR, 0, -0.08, 0);
    this.footL = new THREE.Group(); this.footR = new THREE.Group();
    this.footL.position.set(0, -0.20, 0.05);
    this.footR.position.set(0, -0.20, 0.05);
    this.legL.add(this.footL); this.legR.add(this.footR);
    this._mesh(g.foot, this.mFoot, this.footL, 0, 0, 0.08, 1.45, 0.42, 2.15);
    this._mesh(g.foot, this.mFoot, this.footR, 0, 0, 0.08, 1.45, 0.42, 2.15);
    for (const foot of [this.footL, this.footR]) {
      for (const ox of [-0.08, 0, 0.08]) this._mesh(g.foot, this.mFoot, foot, ox, 0.01, 0.2, 0.42, 0.28, 0.6);
    }

    // Compact torso: BLACK back, WHITE belly, short hoodie on top
    this.torso = new THREE.Group();
    this.torso.position.y = 0.52;
    this.bodyG.add(this.torso);
    this.body = this._mesh(g.capBody, this.mFur, this.torso, 0, -0.02, 0, 1, 1, 0.95);
    // white belly wrapping the front and sides
    this.belly = this._mesh(g.sphere, this.mBelly, this.torso, 0, -0.04, 0.14, 0.22, 0.26, 0.16);
    // short hoodie garment (doesn't swallow the head)
    this.hoodie = this._mesh(g.capBody, this.mHoodie, this.torso, 0, -0.05, 0.03, 1.16, 0.84, 1.12);
    this.hem = this._mesh(g.cyl, this.mTrim, this.torso, 0, -0.24, 0, 0.30, 0.07, 0.30);
    this._mesh(g.cyl, this.mTrim, this.torso, 0, 0.16, 0, 0.24, 0.06, 0.24); // collar
    this.patch = this._mesh(g.sphere, this.mPatch, this.torso, 0, 0.02, -0.26, 0.07, 0.08, 0.04);
    // small tail under the hem
    this.tail = this._mesh(g.sphere, this.mFur, this.torso, 0, -0.26, -0.24, 0.07, 0.055, 0.09);

    // Arms: colored sleeves + BLACK flippers that clearly poke out
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.armL.position.set(-0.28, 0.08, 0);
    this.armR.position.set(0.28, 0.08, 0);
    this.torso.add(this.armL, this.armR);
    this._mesh(g.flipper, this.mHoodie, this.armL, -0.03, -0.12, 0, 1.05, 0.7, 1.05);
    this._mesh(g.flipper, this.mHoodie, this.armR, 0.03, -0.12, 0, 1.05, 0.7, 1.05);
    this._mesh(g.flipper, this.mFur, this.armL, -0.03, -0.30, 0.02, 0.9, 0.85, 1.15);
    this._mesh(g.flipper, this.mFur, this.armR, 0.03, -0.30, 0.02, 0.9, 0.85, 1.15);

    // BIG black head sitting above the hoodie
    this.headG = new THREE.Group();
    this.headG.position.set(0, 0.42, 0.06);
    this.torso.add(this.headG);
    this.head = this._mesh(g.capHead, this.mFur, this.headG, 0, 0.02, 0);
    // white eye patches (classic penguin face) + big eyes slightly to the sides
    this._mesh(g.sphere, this.mBelly, this.headG, -0.14, 0.06, 0.18, 0.12, 0.13, 0.1);
    this._mesh(g.sphere, this.mBelly, this.headG, 0.14, 0.06, 0.18, 0.12, 0.13, 0.1);
    this._mesh(g.sphere, this.mBlush, this.headG, -0.18, -0.04, 0.16, 0.07, 0.05, 0.05);
    this._mesh(g.sphere, this.mBlush, this.headG, 0.18, -0.04, 0.16, 0.07, 0.05, 0.05);
    const eyeL = this._mesh(g.sphere, this.mEye, this.headG, -0.13, 0.07, 0.22, 0.09, 0.1, 0.08);
    const eyeR = this._mesh(g.sphere, this.mEye, this.headG, 0.13, 0.07, 0.22, 0.09, 0.1, 0.08);
    this._mesh(g.sphere, this.mPupil, eyeL, 0.05, 0, 0.55, 0.5, 0.55, 0.4);
    this._mesh(g.sphere, this.mPupil, eyeR, -0.05, 0, 0.55, 0.5, 0.55, 0.4);
    const beak = this._mesh(g.beak, this.mBeak, this.headG, 0, -0.04, 0.30, 1.15, 1.1, 1.15);
    beak.rotation.x = Math.PI / 2.05;

    // OPEN hood: a cowl behind and around the head, face and most of the
    // black head stay visible from behind and 3/4
    this.hood = new THREE.Group();
    this.headG.add(this.hood);
    // cowl pulled back so the black head, eyes and beak stay in the open
    const hoodM = this._mesh(g.hood, this.mHoodie, this.hood, 0, 0.12, -0.12, 1.06, 0.95, 1.0);
    hoodM.rotation.x = 0.72;
    const hoodIn = this._mesh(g.hood, this.mHoodIn, this.hood, 0, 0.12, -0.12, 0.94, 0.86, 0.9);
    hoodIn.rotation.x = 0.72;
    hoodIn.castShadow = false;
    this.stringL = this._mesh(g.cyl, this.mString, this.hood, -0.12, -0.18, 0.10, 0.012, 0.28, 0.012);
    this.stringR = this._mesh(g.cyl, this.mString, this.hood, 0.12, -0.18, 0.10, 0.012, 0.28, 0.012);
    this._mesh(g.sphere, this.mTrim, this.stringL, 0, -0.55, 0, 1.8, 0.2, 1.8);
    this._mesh(g.sphere, this.mTrim, this.stringR, 0, -0.55, 0, 1.8, 0.2, 1.8);

    // accessories (kept, retuned to the bigger head)
    this.accBeanie = new THREE.Group(); this.headG.add(this.accBeanie);
    this._mesh(g.sphere, this.mBeanie, this.accBeanie, 0, 0.2, 0, 1.05, 0.55, 1.05);
    this._mesh(g.cyl, this.mBeanie, this.accBeanie, 0, 0.08, 0, 0.29, 0.1, 0.29);
    this._mesh(g.sphere, this.mBeaniePom, this.accBeanie, 0, 0.38, -0.02, 0.1, 0.1, 0.1);

    this.accScarf = new THREE.Group(); this.torso.add(this.accScarf);
    this._mesh(g.cyl, this.mScarf, this.accScarf, 0, 0.24, 0.04, 0.22, 0.08, 0.22);
    this.scarfT1 = this._mesh(g.box, this.mScarf, this.accScarf, -0.08, 0.02, -0.22, 0.1, 0.42, 0.05);
    this.scarfT2 = this._mesh(g.box, this.mScarf2, this.accScarf, 0.1, -0.04, -0.2, 0.1, 0.5, 0.05);

    this.accGlasses = new THREE.Group(); this.headG.add(this.accGlasses);
    this._mesh(g.box, this.mGlass, this.accGlasses, -0.13, 0.07, 0.26, 0.14, 0.08, 0.04);
    this._mesh(g.box, this.mGlass, this.accGlasses, 0.13, 0.07, 0.26, 0.14, 0.08, 0.04);
    this._mesh(g.box, this.mGlassArm, this.accGlasses, 0, 0.07, 0.26, 0.08, 0.03, 0.03);
    this._mesh(g.box, this.mGlassArm, this.accGlasses, -0.22, 0.07, 0.1, 0.03, 0.025, 0.22);
    this._mesh(g.box, this.mGlassArm, this.accGlasses, 0.22, 0.07, 0.1, 0.03, 0.025, 0.22);

    this.accPhones = new THREE.Group(); this.headG.add(this.accPhones);
    this._mesh(g.sphere, this.mPhones, this.accPhones, 0, 0.2, 0, 1.12, 0.5, 1.05);
    this._mesh(g.cyl, this.mPhones, this.accPhones, -0.30, 0.04, 0.02, 0.1, 0.08, 0.1).rotation.z = Math.PI / 2;
    this._mesh(g.cyl, this.mPhones, this.accPhones, 0.30, 0.04, 0.02, 0.1, 0.08, 0.1).rotation.z = Math.PI / 2;
    this._mesh(g.cyl, this.mPhonesAcc, this.accPhones, -0.32, 0.04, 0.02, 0.07, 0.04, 0.07).rotation.z = Math.PI / 2;
    this._mesh(g.cyl, this.mPhonesAcc, this.accPhones, 0.32, 0.04, 0.02, 0.07, 0.04, 0.07).rotation.z = Math.PI / 2;

    this.accParka = new THREE.Group(); this.headG.add(this.accParka);
    this._mesh(g.sphere, this.mFurTrim, this.accParka, 0, 0.02, -0.1, 0.36, 0.28, 0.32);

    this.accNinja = new THREE.Group(); this.headG.add(this.accNinja);
    this._mesh(g.cyl, this.mNinja, this.accNinja, 0, 0.08, 0.04, 0.29, 0.12, 0.29);
    this.ninjaKnot = this._mesh(g.sphere, this.mNinja, this.accNinja, 0, 0.1, -0.28, 0.08, 0.07, 0.08);
    this._mesh(g.box, this.mNinja, this.accNinja, -0.06, 0.04, -0.34, 0.06, 0.16, 0.03);
    this._mesh(g.box, this.mNinja, this.accNinja, 0.06, 0.0, -0.34, 0.06, 0.18, 0.03);

    this.accRain = new THREE.Group(); this.torso.add(this.accRain);
    this._mesh(g.box, this.mTrim, this.accRain, 0, 0.0, 0.26, 0.07, 0.3, 0.04);

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

    this.blob = this._mesh(new THREE.CircleGeometry(0.5, 20), std(0x000000, { transparent: true, opacity: 0.38, depthWrite: false }), this.root, 0, 0.025, 0.05);
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.castShadow = false;
  }

  setCostume(id) {
    const c = COSTUMES.find(x => x.id === id) || COSTUMES[0];
    this.costume = c.id;
    this.baseHoodie = c.hoodie;
    this.baseTrim = c.trim;
    this.mHoodie.color.setHex(c.hoodie);
    this.mTrim.color.setHex(c.trim);
    const hoodUp = c.acc === 'none' || c.acc === 'raincoat' || c.acc === 'parka' || c.acc === 'scarf' || c.acc === 'glasses';
    this.hood.visible = hoodUp && c.acc !== 'ninja' && c.acc !== 'beanie' && c.acc !== 'phones';
    // scarf can have hood down so tails read better? keep hood up for classic look, scarf still visible
    if (c.acc === 'scarf') this.hood.visible = false;
    Object.keys(this.accessories).forEach(k => {
      this.accessories[k].forEach(g => { g.visible = (k === c.acc); });
    });
    this.setForm(this.phase, true);
  }

  setForm(phase, instant = false) {
    this.phase = phase;
    const formC = PHASE_COL[phase];
    const c = COSTUMES.find(x => x.id === this.costume) || COSTUMES[0];
    if (c.id === 'classic') {
      this.mHoodie.color.setHex(phase === EMBER ? 0xff5a46 : 0x5ec3ff);
      this.mTrim.color.setHex(phase === EMBER ? 0xd44232 : 0x3a8ec8);
    } else {
      this.mHoodie.color.setHex(c.hoodie);
      this.mTrim.color.setHex(c.trim);
    }
    this.mHoodie.emissive.setHex(formC);
    this.mHoodie.emissiveIntensity = 0.22;
    this.mPatch.color.setHex(formC);
    this.mPatch.emissive.setHex(formC);
    this.mPatch.emissiveIntensity = 0.55;
    this.stringL.material = this.mString;
    if (!instant) this._burst();
  }

  _burst() {
    this.burst.length = 0;
    for (let i = 0; i < 16; i++) {
      this.burst.push({
        x: rand(-0.3, 0.3), y: rand(0.5, 1.2), z: rand(-0.3, 0.3),
        vx: rand(-1.2, 1.2), vy: rand(0.6, 2.2), vz: rand(-1.2, 1.2),
        life: rand(0.25, 0.5)
      });
    }
  }

  animate(dt, ev) {
    // ev: { moving, speed, jumpY, sliding, lean, falling, fallT, onGround }
    const spd = ev.moving ? ev.speed : (ev.idleRun ? 8 : 0);
    const freq = ev.sliding ? 0 : (0.9 + spd * 0.055);
    if (ev.moving || ev.idleRun) this.runT += dt * freq;
    const t = this.runT * Math.PI * 2;
    const onG = ev.onGround && !ev.sliding && !ev.falling;

    let legA = Math.sin(t) * (onG ? 0.85 : 0);
    let legB = -legA;
    let armA = Math.sin(t + Math.PI) * (onG ? 0.55 : 0.15);
    let armB = -armA;
    let bob = onG ? Math.abs(Math.sin(t)) * 0.06 : 0;
    let waddle = onG ? Math.sin(t) * 0.1 : 0;
    let squash = onG ? 1 - Math.abs(Math.cos(t)) * 0.045 : 1;

    if (ev.jumpY > 0.02 && !ev.falling) {
      const up = clamp(ev.jumpY / 1.4, 0, 1);
      legA = -0.55 - up * 0.2; legB = -0.55 - up * 0.15;
      armA = 0.7; armB = 0.7;
      squash = 1 + up * 0.08;
      bob = ev.jumpY;
    }
    if (ev.sliding) {
      this.bodyG.rotation.x = lerp(this.bodyG.rotation.x, 1.15, clamp(14 * dt, 0, 1));
      this.bodyG.position.y = lerp(this.bodyG.position.y, -0.22, clamp(14 * dt, 0, 1));
      legA = 0.9; legB = 0.35;
      armA = 1.1; armB = 0.9;
      squash = 0.92;
      bob = 0;
      waddle = 0;
    } else {
      this.bodyG.rotation.x = lerp(this.bodyG.rotation.x, ev.falling ? 0.9 : 0.08, clamp(10 * dt, 0, 1));
      this.bodyG.position.y = lerp(this.bodyG.position.y, 0, clamp(12 * dt, 0, 1));
    }
    if (ev.falling) {
      const f = ev.fallT || 0;
      this.bodyG.rotation.x = 0.4 + f * 1.6;
      this.bodyG.rotation.z = Math.sin(f * 14) * 0.25;
      this.hop.position.y = Math.max(0, 0.4 - f * 1.2);
      squash = 1;
    } else {
      this.bodyG.rotation.z = 0;
      this.hop.position.y = ev.jumpY;
    }

    this.legL.rotation.x = legA;
    this.legR.rotation.x = legB;
    // slap: plant the foot flat and a little extra when it hits the ground
    const slapL = onG ? Math.max(0, -Math.sin(t)) * 0.35 : 0;
    const slapR = onG ? Math.max(0, Math.sin(t)) * 0.35 : 0;
    this.footL.rotation.x = -legA * 0.5 + 0.18 + slapL;
    this.footR.rotation.x = -legB * 0.5 + 0.18 + slapR;
    this.armL.rotation.x = armA;
    this.armR.rotation.x = armB;
    this.armL.rotation.z = 0.35;
    this.armR.rotation.z = -0.35;

    const lean = ev.lean || 0;
    this.hop.rotation.z = lerp(this.hop.rotation.z, -lean * 0.4, clamp(10 * dt, 0, 1));
    this.hop.rotation.y = waddle * 0.35;
    this.hop.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    this.torso.position.y = 0.52 + (onG ? Math.abs(Math.sin(t)) * 0.02 : 0);

    if (this.tail) this.tail.rotation.x = Math.sin(t * 1.2) * 0.25;
    if (this.scarfT1) {
      this.scarfT1.rotation.x = 0.15 + Math.sin(t) * 0.2;
      this.scarfT2.rotation.x = 0.2 + Math.sin(t + 1) * 0.25;
    }
    if (this.stringL) {
      this.stringL.rotation.x = 0.15 + Math.sin(t + 0.4) * 0.15;
      this.stringR.rotation.x = 0.15 + Math.sin(t + 1.1) * 0.15;
    }
    this.headG.rotation.x = (ev.sliding ? -0.28 : -0.02) + Math.sin(t * 0.5) * 0.03;
    this.headG.rotation.z = -lean * 0.1;

    const shadowScale = ev.jumpY > 0 ? clamp(1 - ev.jumpY * 0.35, 0.4, 1) : 1;
    this.blob.scale.set(shadowScale, shadowScale, 1);
    this.blob.material.opacity = 0.38 * shadowScale;
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

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), makeSkyMat(SEASONS[0]));
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    this.fogColor = new THREE.Color(SEASONS[0].fog);
    scene.fog = new THREE.Fog(this.fogColor, 28, 88);

    this.hemi = new THREE.HemisphereLight(0xeef5ff, 0x3d4a32, 0.85);
    scene.add(this.hemi);
    this.dir = new THREE.DirectionalLight(0xfff3d8, 1.35);
    this.dir.position.set(8, 18, 6);
    this.dir.castShadow = true;
    this.dir.shadow.mapSize.set(1024, 1024);
    this.dir.shadow.camera.near = 1;
    this.dir.shadow.camera.far = 40;
    this.dir.shadow.camera.left = -10;
    this.dir.shadow.camera.right = 10;
    this.dir.shadow.camera.top = 10;
    this.dir.shadow.camera.bottom = -10;
    this.dir.shadow.bias = -0.0008;
    scene.add(this.dir);
    this.dirTarget = new THREE.Object3D();
    scene.add(this.dirTarget);
    this.dir.target = this.dirTarget;
    this.fill = new THREE.PointLight(PHASE_COL[0], 0.8, 8, 2);
    scene.add(this.fill);

    this.groundMat = makeGroundShader(SEASONS[0]);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 160, 1, 1), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.position.y = 0;
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
    this.partPool = [];
    this.particleG = new THREE.Group();
    this.group.add(this.particleG);
    this.propG = new THREE.Group();
    this.group.add(this.propG);

    this._initMats();
    this._buildHills();
    this._fillWorld(0, 0);
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
    this.mRockDeco = std(0xb8c0b0, { roughness: 0.9 }); // decorative only, not obstacles
  }

  _buildHills() {
    this.hills.clear();
    const geo = new THREE.SphereGeometry(1, 8, 6);
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
      // palm — smooth tapered trunk + rounded fronds
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
      // pine — rounded cones, soft snow caps
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
      // autumn — overlapping rounded canopies
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
      // spring blossom — soft rounded puffs
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
    // bush / tuft at base sometimes
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

  _obtainProp() {
    return this.propPool.pop() || { typ: '', mesh: null };
  }
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

  _fillWorld(season, z0) {
    for (const p of this.props) this._releaseProp(p);
    this.props.length = 0;
    const zEnd = z0 + 120;
    for (let z = z0 - 10; z < zEnd; z += rand(3.4, 5.8)) {
      for (const side of [-1, 1]) {
        const x = side * rand(4.4, 8.0);
        this._placeProp('tree', x, z + rand(-1.5, 1.5), season);
        if (Math.random() < 0.7) this._placeProp('bush', side * rand(3.5, 6.8), z + rand(1, 3), season);
        if (season === 0 && Math.random() < 0.8) this._placeProp('flower', side * rand(3.3, 6.2), z + rand(0, 2), season);
      }
    }
    // some farther rows of trees for depth
    for (let z = z0 + 8; z < zEnd; z += rand(8, 12)) {
      for (const side of [-1, 1]) this._placeProp('tree', side * rand(7.5, 13), z, season);
    }
  }

  setSeason(i, playerZ = 0) {
    this.season = i;
    const s = SEASONS[i];
    this.sky.material = makeSkyMat(s);
    this.ground.material = makeGroundShader(s);
    this.groundMat = this.ground.material;
    this.fogColor.setHex(s.fog);
    this.scene.fog.color.copy(this.fogColor);
    this.hemi.color.setHex(s.light);
    this.hemi.groundColor.setHex(s.groundDark);
    this.dir.color.setHex(s.light);
    this.dir.position.set(s.sunDir[0] * 20, s.sunDir[1] * 20, s.sunDir[2] * 20);
    this.ocean.visible = false;
    // hills recolor
    const hillCol = [0x3d7a45, 0xd2b56a, 0xa44a1c, 0xe6eef8][i];
    this.hills.children.forEach((m, k) => {
      if (!m._hmat) { m._hmat = std(hillCol, { roughness: 0.92 }); m.material = m._hmat; }
      else m.material.color.setHex(hillCol);
      if (i === 3 && k % 2 === 0) m.material.color.lerp(new THREE.Color(0xffffff), 0.35);
    });
    this._fillWorld(i, playerZ);
    this._resetParticles(i);
  }

  _resetParticles(season) {
    while (this.particleG.children.length) this.particleG.remove(this.particleG.children[0]);
    this.particles.length = 0;
    const n = season === 1 ? 28 : 70;
    const mat = season === 0 ? std(0xffb0c8, { roughness: 0.6 })
      : season === 2 ? std(0xff7a2a, { roughness: 0.6 })
      : season === 3 ? std(0xffffff, { roughness: 0.8 })
      : std(0xffe9a0, { roughness: 0.5, transparent: true, opacity: 0.7 });
    const geo = (season === 3) ? this.geo.sphereLo : this.geo.sphereLo;
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

  update(dt, playerZ, playerX, speed, phase) {
    this.time += dt;
    this.ground.position.set(0, 0, playerZ + 40);
    this.ocean.position.set(22, -0.12, playerZ + 40);
    if (this.ocean.visible) this.oceanMat.uniforms.uTime.value = this.time;
    this.sky.position.set(playerX, 0, playerZ);
    this.hills.position.set(0, 0, playerZ);
    this.dirTarget.position.set(playerX, 0, playerZ + 4);
    this.dir.position.set(playerX + 8, 16, playerZ - 4);

    // recycle props
    const behind = playerZ - 12;
    const ahead = playerZ + 90;
    for (const p of this.props) {
      if (p.mesh.position.z < behind) {
        p.mesh.position.z = ahead + rand(0, 10);
        const side = p.mesh.position.x < 0 ? -1 : 1;
        const minX = p.kind === 'tree' ? 4.4 : 3.6;
        p.mesh.position.x = side * rand(minX, p.kind === 'tree' ? 12 : 8);
        p.mesh.rotation.y = rand(0, Math.PI * 2);
      }
    }

    const typ = this.season;
    for (const p of this.particles) {
      p.z -= speed * dt * (typ === 1 ? 0.4 : 0.15);
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      if (p.y < 0.05 || p.z < playerZ - 6) {
        p.y = rand(1.5, 5.5);
        p.x = playerX + rand(-8, 8);
        p.z = playerZ + rand(8, 70);
      }
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.z += p.spin * 0.7 * dt;
    }
  }
}

// ---------------- entities ----------------
function makeFlameEmblem() {
  const g = new THREE.Group();
  const m = std(0xffffff, { emissive: 0xff6a21, emissiveIntensity: 0.8 });
  const a = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), m);
  a.position.y = 0.05; g.add(a);
  const b = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), m);
  b.position.set(0.08, -0.02, 0.02); g.add(b);
  return g;
}
function makeSnowEmblem() {
  const g = new THREE.Group();
  const m = std(0xffffff, { emissive: 0x7ad7ff, emissiveIntensity: 0.8 });
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), m);
    bar.rotation.z = i * Math.PI / 3;
    g.add(bar);
  }
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m));
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
    const m = std(0xffd23f, { roughness: 0.25, metalness: 0.35, emissive: 0xcc9900, emissiveIntensity: 0.2 });
    const body = new THREE.Mesh(this.geo.coin, m);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    g.add(body);
    const rim = new THREE.Mesh(this.geo.coinI, std(0xfff0a0, { roughness: 0.3, metalness: 0.4 }));
    rim.rotation.y = Math.PI / 2;
    g.add(rim);
    g.visible = false;
    this.scene.add(g);
    return { type: 'coin', mesh: g, live: false, lane: 0, z: 0, h: 0, taken: false };
  }
  _gate() {
    const g = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(0.32, 1.85, 0.38);
    const beamGeo = new THREE.BoxGeometry(6.3, 0.22, 0.38);
    const panelGeo = new THREE.BoxGeometry(5.7, 1.55, 0.05);
    const mSolid = std(0xff6a21, { roughness: 0.35, emissive: 0xff6a21, emissiveIntensity: 0.45, transparent: true, opacity: 0.48, depthWrite: false });
    const mFrame = std(0xff6a21, { roughness: 0.35, emissive: 0xff6a21, emissiveIntensity: 0.35 });
    const left = new THREE.Mesh(pillarGeo, mFrame); left.position.set(-3.0, 0.92, 0); left.castShadow = true;
    const right = new THREE.Mesh(pillarGeo, mFrame); right.position.set(3.0, 0.92, 0); right.castShadow = true;
    const top = new THREE.Mesh(beamGeo, mFrame); top.position.set(0, 1.82, 0);
    const capL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.46), mFrame); capL.position.set(-3.0, 1.82, 0);
    const capR = capL.clone(); capR.position.x = 3.0;
    const panel = new THREE.Mesh(panelGeo, mSolid); panel.position.set(0, 0.95, 0);
    const flame = makeFlameEmblem(); flame.position.set(0, 1.05, 0.12); flame.scale.setScalar(1.35);
    const snow = makeSnowEmblem(); snow.position.set(0, 1.05, 0.12); snow.scale.setScalar(1.35);
    g.add(left, right, top, capL, capR, panel, flame, snow);
    g.visible = false;
    this.scene.add(g);
    return { type: 'gate', mesh: g, live: false, lane: 0, z: 0, phase: 0, span: 'all', panel, mSolid, mFrame, flame, snow, left, right, top, capL, capR };
  }
  _obs() {
    const g = new THREE.Group();
    g.visible = false;
    this.scene.add(g);
    return { type: 'low', mesh: g, live: false, lane: 0, z: 0, height: 0.65, kind: 'low', built: '' };
  }
  obtain(list) {
    for (const o of list) if (!o.live) return o;
    return null;
  }
  releaseAll() {
    for (const list of [this.coins, this.gates, this.obs]) {
      for (const o of list) { o.live = false; o.mesh.visible = false; o.taken = false; }
    }
  }
  styleGate(o, phase, span, seasonAccent) {
    const c = PHASE_COL[phase];
    o.phase = phase;
    o.span = span;
    o.mSolid.color.setHex(c);
    o.mSolid.emissive.setHex(c);
    o.mFrame.color.setHex(c);
    o.mFrame.emissive.setHex(c);
    o.mFrame.emissiveIntensity = 0.4;
    o.flame.visible = phase === EMBER;
    o.snow.visible = phase === FROST;
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
      o.top.scale.x = 0.26;
      o.panel.scale.x = 0.24;
    }
  }
  setGateSolid(o, solid) {
    o.mSolid.opacity = solid ? 0.5 : 0.12;
    o.mSolid.emissiveIntensity = solid ? 0.55 : 0.12;
    o.mSolid.transparent = true;
    o.mSolid.depthWrite = false;
    o.mFrame.emissiveIntensity = solid ? 0.5 : 0.18;
    o.panel.scale.z = solid ? 1 : 0.4;
  }
  buildObs(o, kind, season) {
    const mesh = o.mesh;
    while (mesh.children.length) mesh.remove(mesh.children[0]);
    o.kind = kind;
    o.type = kind;
    o.height = kind === 'low' ? 0.62 : 1.6;
    if (kind === 'low') {
      let body, mat;
      if (season === 0) {
        mat = std(0x3da84c, { roughness: 0.7 });
        body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.62, 0.7), mat);
        body.position.y = 0.31; body.castShadow = true; mesh.add(body);
        for (let i = 0; i < 4; i++) {
          const f = new THREE.Mesh(this.geo.sphereLo, std(0xff8fb3));
          f.position.set(-0.4 + i * 0.28, 0.66, 0.1);
          f.scale.setScalar(0.1); mesh.add(f);
        }
      } else if (season === 1) {
        mat = std(0xe8c14a, { roughness: 0.55 });
        body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.58, 0.7), mat);
        body.position.y = 0.29; body.castShadow = true; mesh.add(body);
        const band = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 0.72), std(0xd48a1a));
        band.position.y = 0.29; mesh.add(band);
      } else if (season === 2) {
        mat = std(0xe0a84a, { roughness: 0.7 });
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.35, 12), mat);
        body.rotation.z = Math.PI / 2; body.position.y = 0.38; body.castShadow = true; mesh.add(body);
        const end1 = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), std(0xc48a30));
        end1.position.set(-0.68, 0.38, 0); end1.rotation.y = Math.PI / 2; mesh.add(end1);
        const end2 = end1.clone(); end2.position.x = 0.68; end2.rotation.y = -Math.PI / 2; mesh.add(end2);
      } else {
        mat = std(0xbfe9ff, { roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.88, emissive: 0x7ad7ff, emissiveIntensity: 0.15 });
        body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.64, 0.72), mat);
        body.position.y = 0.32; body.castShadow = true; mesh.add(body);
      }
    } else {
      // high slide bar
      const postM = std(0x5a4630, { roughness: 0.7 });
      const barC = [0xff8fb3, 0x4ec4d6, 0xff7a2a, 0x9fe8ff][season];
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.12), postM);
      const p2 = p1.clone();
      p1.position.set(-0.7, 0.85, 0); p2.position.set(0.7, 0.85, 0);
      p1.castShadow = true; p2.castShadow = true;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.16, 0.16), std(barC, { emissive: barC, emissiveIntensity: 0.25 }));
      bar.position.y = 0.95; bar.castShadow = true;
      const bar2 = bar.clone(); bar2.position.y = 1.35;
      mesh.add(p1, p2, bar, bar2);
    }
    o.built = season + kind;
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
    this.penguin = new Penguin(this.geo);
    this.scene.add(this.penguin.root);
    this.penguin.setCostume(this.save.equipped || 'classic');

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
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = EMBER; this.phaseCd = 0;
    this.speed = 11; this.elapsed = 0; this.dist = 0;
    this.score = 0; this.runCoins = 0;
    this.shake = 0; this.deadT = 0; this.invuln = 0;
    this.camX = 0; this.camTilt = 0; this.camFov = 54;
    this.spawnZ = 0; this.rowCount = 0; this.lastGate = -10;
    this.lean = 0;
    this.homeOff = 0; // swipe offset for seasons
    this.toastT = 0;
    this._v = new THREE.Vector3();

    this._bindUI();
    this._bindInput();
    this._goHome(true);
    this._applySeasonVisuals(this.season, true);
    this._resize();
    window.addEventListener('resize', () => this._resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clock.getDelta(); });

    const boot = document.getElementById('boot');
    if (boot) boot.classList.add('hidden');

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
    document.getElementById('btn-start').addEventListener('click', ev => { ev.stopPropagation(); this.startRun(); });
    document.getElementById('btn-shop').addEventListener('click', ev => { ev.stopPropagation(); this.openShop(); });
    document.getElementById('btn-shop-close').addEventListener('click', ev => { ev.stopPropagation(); this.closeShop(); });
    document.getElementById('tab-upgrades').addEventListener('click', ev => { ev.stopPropagation(); this.shopTab = 'upgrades'; this.renderShop(); });
    document.getElementById('tab-costumes').addEventListener('click', ev => { ev.stopPropagation(); this.shopTab = 'costumes'; this.renderShop(); });
    document.getElementById('btn-retry').addEventListener('click', ev => { ev.stopPropagation(); this.startRun(); });
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
      if (Math.hypot(dx, dy) > 46) { this.sw.done = true; this._swipe(dx, dy); }
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
        } else if (this.state === 'over' && this.deadT > 0.6) {
          // let buttons handle retry/home
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
        if (k === 'Space' || k === 'Enter') this.startRun();
        if (k === 'KeyM') this.$.mute.click();
        return;
      }
      if (this.state === 'shop') { if (k === 'Escape') this.closeShop(); return; }
      if (this.state === 'over') {
        if (k === 'Space' || k === 'Enter') this.startRun();
        if (k === 'Escape' || k === 'KeyH') this._goHome();
        return;
      }
      if (this.state !== 'play') return;
      if (k === 'ArrowLeft' || k === 'KeyA') this.move(-1);
      else if (k === 'ArrowRight' || k === 'KeyD') this.move(1);
      else if (k === 'ArrowUp' || k === 'KeyW') this.jump();
      else if (k === 'ArrowDown' || k === 'KeyS') this.slide();
      else if (k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight' || k === 'KeyE') this.togglePhase();
    });
    document.addEventListener('gesturestart', e => e.preventDefault());
  }

  _swipe(dx, dy) {
    this.lastInput = { type: 'swipe', dx, dy, state: this.state };
    if (this.state !== 'play') return;
    if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1);
    else if (dy < 0) this.jump(); else this.slide();
  }
  _tap() {
    if (this.state === 'play') this.togglePhase();
  }
  move(d) {
    const n = clamp(this.lane + d, -1, 1);
    if (n !== this.lane) { this.lane = n; Sfx.lane(); }
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
    this._formUI();
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
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
    // 25% of the 400%-wide track equals one viewport page
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
    this.world.setSeason(i, this.pz);
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
      this.toast('Tap to shift  ·  Swipe to steer', 2.0);
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
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.speed = 10.5; this.elapsed = 0;
    this.pools.releaseAll();
    this.penguin.root.position.set(0, 0, 0);
    this.penguin.setCostume(this.save.equipped);
    this.world.setSeason(this.season, 0);
    this.$.home.classList.remove('hidden');
    this.$.hud.classList.add('hidden');
    this.$.shop.classList.add('hidden');
    this.$.over.classList.add('hidden');
    this._refreshCoins();
    this._refreshMute();
    if (!first) this.music.play(this.season, false);
    // first: wait for a gesture to actually start audio
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
    this.jumpY = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = EMBER; this.phaseCd = 0;
    this.penguin.setForm(EMBER, true);
    this.penguin.setCostume(this.save.equipped);
    this.elapsed = 0; this.dist = 0; this.score = 0; this.runCoins = 0;
    this.shake = 0; this.deadT = 0; this.invuln = 0;
    const hs = this.save.upgrades.headStart | 0;
    this.elapsed = hs * 3.5;
    this.speed = this._calcSpeed();
    this.rowCount = 0; this.lastGate = -99;
    this.spawnZ = this.pz + WARMUP;
    this.shields = this.save.upgrades.shield | 0;
    this.lives = this.save.upgrades.extraLife | 0;
    this.coinMul = 1 + 0.5 * (this.save.upgrades.doubleCoins | 0);
    this.magLv = this.save.upgrades.magnet | 0;
    this.ignoreHit = false;
    this.world.setSeason(this.season, 0);
    this._formUI();
    this._hud();
    if (skipCount) {
      this.state = 'play';
      this.toast('Tap to shift  ·  Swipe to steer', 2.0);
    } else {
      this.state = 'countdown';
      this.countT = 3.2;
      this._countShown = -1;
      this._tickCountdown(0);
    }
  }

  _calcSpeed() {
    const t = this.elapsed;
    return Math.min(10.5 + t * 0.38, 26.5);
  }
  _gap() {
    const u = clamp(this.elapsed / 80, 0, 1);
    return lerp(16.5, 9.2, u * u * 0.35 + u * 0.65);
  }
  _formUI() {
    this.$.form.textContent = PHASE_NAME[this.phase];
    this.$.form.classList.toggle('frost', this.phase === FROST);
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

  // ------ spawn ------
  _ensureSpawn() {
    while (this.spawnZ < this.pz + SPAWN_AHEAD) {
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
      // single-lane phase walls, leave a safe or opposite-color path
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
      const q = Math.random();
      const typ = q < 0.55 ? 'low' : 'high';
      this._addObs(typ, sh[i], z);
    }
    if (Math.random() < 0.7) this._addCoinLine(sh[n] ?? 0, z + 2, 3);
  }
  _addCoinLine(lane, z, n) {
    for (let i = 0; i < n; i++) this._addCoin(lane, z + i * 1.7, 0);
  }
  _addCoin(lane, z, h) {
    const o = this.pools.obtain(this.pools.coins); if (!o) return;
    o.live = true; o.taken = false; o.lane = lane; o.z = z; o.h = h || 0;
    o.mesh.visible = true;
    o.mesh.position.set(laneX(lane), 0.55 + o.h, z);
  }
  _addGate(z, phase, span, lane = 0) {
    const o = this.pools.obtain(this.pools.gates); if (!o) return;
    o.live = true; o.z = z; o.lane = lane; o.type = 'gate';
    this.pools.styleGate(o, phase, span, SEASONS[this.season].accent);
    o.mesh.visible = true;
    o.mesh.position.set(span === 'all' ? 0 : laneX(lane), 0, z);
  }
  _addObs(kind, lane, z) {
    const o = this.pools.obtain(this.pools.obs); if (!o) return;
    o.live = true; o.lane = lane; o.z = z; o.type = kind;
    this.pools.buildObs(o, kind, this.season);
    o.mesh.visible = true;
    o.mesh.position.set(laneX(lane), 0, z);
  }

  // ------ collision ------
  // Only objects that are visible, in front of the penguin, and within a tight z window can hit.
  collides(o) {
    if (!o || !o.live || o.taken) return false;
    if (!o.mesh || !o.mesh.visible) return false;
    const dz = o.z - this.pz;
    if (dz < 0.12 || dz > 1.05) return false;
    if (o.type === 'coin') return false;
    const px = this.px;
    if (o.span === 'all' || o.type === 'gate' && o.span === 'all') {
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

  // ------ loop ------
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
      this.pz += this.speed * dt;
      this.dist += this.speed * dt;
      this.score = Math.floor(this.dist * 8 + this.runCoins * 10);
      this.phaseCd -= dt;
      this.invuln -= dt;
      this._ensureSpawn();
      const lvl = Math.floor(this.elapsed / 20);
      if (lvl > (this._spdLvl || 0) && lvl > 0) {
        this._spdLvl = lvl;
        this.toast('SPEED UP!', 1.2);
      }
    } else if (home) {
      this.speed = 10.5;
      this.pz += this.speed * dt;
      // keep scenery flowing in the preview; no obstacles
      if (this.pz > 400) {
        this.pz = 0;
        this.world.setSeason(this.season, 0);
      }
    } else if (dying) {
      this.deadT += dt;
      this.speed = Math.max(0, this.speed - 18 * dt);
      this.pz += this.speed * dt;
      if (this.deadT > 0.85) this._endRun();
    } else if (this.state === 'over') {
      this.deadT += dt;
    }

    // jump / slide
    if (playing || dying) {
      if (this.jumpY > 0 || this.jumpV > 0) {
        this.jumpV -= 24 * dt;
        this.jumpY += this.jumpV * dt;
        if (this.jumpY <= 0) { this.jumpY = 0; this.jumpV = 0; }
      }
      if (this.slideT > 0) this.slideT -= dt;
    }

    const targetX = laneX(this.lane);
    const k = 1 - Math.exp(-16 * dt);
    const prevX = this.px;
    this.px += (targetX - this.px) * k;
    this.lean = clamp((targetX - this.px) * 1.8 + (this.px - prevX) / Math.max(dt, 0.0001) * 0.08, -1.5, 1.5);

    this.penguin.root.position.set(this.px, 0, this.pz);
    this.penguin.animate(dt, {
      moving: playing || home || counting,
      idleRun: home || counting,
      speed: this.speed,
      jumpY: this.jumpY,
      sliding: this.slideT > 0 && this.jumpY <= 0.02,
      lean: this.lean,
      falling: dying,
      fallT: this.deadT,
      onGround: this.jumpY <= 0.02
    });
    if (this.invuln > 0 && playing) this.penguin.root.visible = (Math.sin(this.invuln * 30) > 0);
    else this.penguin.root.visible = true;

    this.world.update(dt, this.pz, this.px, this.speed, this.phase);
    this.world.fill.position.set(this.px, 1.1 + this.jumpY, this.pz);

    // entities
    if (playing) this._tickEntities(dt);
    else {
      for (const list of [this.pools.coins, this.pools.gates, this.pools.obs]) {
        for (const o of list) {
          if (!o.live) continue;
          if (o.z < this.pz - 8) { o.live = false; o.mesh.visible = false; }
        }
      }
    }

    this._camera(dt);
    if (playing) this._hud();
  }

  _tickEntities(dt) {
    const t = this.elapsed;
    for (const o of this.pools.coins) {
      if (!o.live || o.taken) continue;
      o.mesh.rotation.y += dt * 4.2;
      o.mesh.position.y = 0.55 + o.h + Math.sin(t * 4 + o.z) * 0.08;
      o.mesh.position.x = laneX(o.lane);
      o.mesh.position.z = o.z;
      // magnet
      if (this.magLv > 0) {
        const reach = 0.9 + this.magLv * 0.7;
        const dx = this.px - o.mesh.position.x;
        const dz = this.pz - o.z;
        if (Math.abs(dz) < 4 + this.magLv && Math.hypot(dx, dz) < reach + 2.2) {
          o.mesh.position.x += dx * Math.min(1, 4 * dt);
          o.z += dz * Math.min(1, 3 * dt);
        }
      }
      const dz = o.z - this.pz;
      const dx = o.mesh.position.x - this.px;
      if (dz > 0.05 && dz < 0.85 && Math.abs(dx) < 0.55 && this.jumpY < 1.3) {
        o.taken = true; o.live = false; o.mesh.visible = false;
        this.runCoins += 1;
        Sfx.coin();
      } else if (o.z < this.pz - 6) { o.live = false; o.mesh.visible = false; }
    }
    for (const o of this.pools.gates) {
      if (!o.live) continue;
      o.mesh.position.z = o.z;
      o.mesh.position.x = o.span === 'all' ? 0 : laneX(o.lane);
      const solid = o.phase === this.phase;
      this.pools.setGateSolid(o, solid);
      if (this.collides(o)) this._hit(o);
      else if (o.z < this.pz - 6) { o.live = false; o.mesh.visible = false; }
    }
    for (const o of this.pools.obs) {
      if (!o.live) continue;
      o.mesh.position.z = o.z;
      o.mesh.position.x = laneX(o.lane);
      if (this.collides(o)) this._hit(o);
      else if (o.z < this.pz - 6) { o.live = false; o.mesh.visible = false; }
    }
  }

  _camera(dt) {
    const playing = this.state === 'play' || this.state === 'dying' || this.state === 'countdown';
    const home = this.state === 'home' || this.state === 'shop';
    const speedK = clamp((this.speed - 10.5) / 16, 0, 1);
    this.camX += (this.px - this.camX) * Math.min(1, 6.2 * dt);
    this.camTilt += (-this.lean * 0.09 - this.camTilt) * Math.min(1, 8 * dt);
    const bob = (this.jumpY <= 0.02 && (playing || home))
      ? Math.sin(this.penguin.runT * Math.PI * 2) * 0.045 : 0;
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const shx = this.shake ? (hash(this.elapsed, 1) - 0.5) * this.shake * 0.35 : 0;
    const shy = this.shake ? (hash(this.elapsed, 2) - 0.5) * this.shake * 0.3 : 0;

    let dist, height, lookAhead, lookY, fov;
    if (home) {
      // Frame Pip in the open band between the title and the START button.
      dist = 5.4; height = 2.15; lookAhead = 5.8; lookY = 0.15; fov = 50;
    } else {
      dist = 5.8 - speedK * 0.45;
      height = 2.25 + speedK * 0.15;
      lookAhead = 7.2;
      lookY = 0.45 + this.jumpY * 0.2;
      fov = 52 + speedK * 8;
    }
    this.camera.position.set(this.camX + shx, height + bob + shy + this.jumpY * 0.12, this.pz - dist);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.camX * 0.2 + this.px * 0.8, lookY, this.pz + lookAhead);
    this.camera.rotateZ(this.camTilt + (this.shake ? (hash(this.elapsed, 3) - 0.5) * this.shake * 0.08 : 0));
    if (Math.abs(fov - this.camera.fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }

    // speed lines
    const show = playing && speedK > 0.35;
    for (let i = 0; i < this.streaks.length; i++) {
      const s = this.streaks[i];
      if (!show) { s.mesh.visible = false; continue; }
      if (!s.mesh.visible || s.z < this.pz - 2) {
        s.x = this.px + (Math.random() < 0.5 ? -1 : 1) * rand(0.8, 2.8);
        s.y = rand(0.3, 2.4);
        s.z = this.pz + rand(2, 10);
        s.mesh.visible = true;
        s.mesh.material.opacity = 0.15 + speedK * 0.35;
      }
      s.z -= (this.speed * 1.8 + 12) * dt;
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
      get phase() { return self.phase; },
      get speed() { return self.speed; },
      get elapsed() { return self.elapsed; },
      get score() { return self.score; },
      get coins() { return self.runCoins; },
      get jumpY() { return self.jumpY; },
      get slideT() { return self.slideT; },
      get save() { return self.save; },
      get VERSION() { return VERSION; },
      startRun: (skip) => self.startRun(skip),
      laneX: laneX,
      get countT() { return self.countT; },
      get cam() { return self.camera; },
      goHome: () => self._goHome(),
      openShop: () => self.openShop(),
      closeShop: () => self.closeShop(),
      setSeason: i => self._setSeason(i, true),
      move: d => self.move(d),
      jump: () => self.jump(),
      slide: () => self.slide(),
      togglePhase: () => self.togglePhase(),
      collides: o => self.collides(o),
      addGate: (z, phase, span, lane) => self._addGate(z, phase, span, lane),
      addObs: (kind, lane, z) => self._addObs(kind, lane, z),
      addCoin: (lane, z, h) => self._addCoin(lane, z, h),
      setInvincible(v) { self.ignoreHit = !!v; },
      objects() {
        return {
          gates: self.pools.gates.filter(o => o.live).map(o => ({ type: o.type, z: o.z, phase: o.phase, span: o.span, lane: o.lane, visible: o.mesh.visible })),
          obs: self.pools.obs.filter(o => o.live).map(o => ({ type: o.type, z: o.z, lane: o.lane, visible: o.mesh.visible })),
          coins: self.pools.coins.filter(o => o.live).map(o => ({ z: o.z, lane: o.lane }))
        };
      },
      core: self
    };
  }
}

window.addEventListener('load', () => {
  try {
    const g = new Game();
    window.__gameCore = g;
  } catch (err) {
    console.error(err);
    const boot = document.getElementById('boot');
    if (boot) { boot.classList.remove('hidden'); boot.textContent = 'Could not start the 3D game.'; }
  }
});
