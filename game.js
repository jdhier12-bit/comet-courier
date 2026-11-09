// Season Shift v2 — SEASON_SHIFT_V2_TAVI
// An original trail runner for Joseph. Tavi the tiger cub, Ember & Frost form-shift.
// All 40 routes share one continuous difficulty curve (kept from v1).
// Chase-cam: over-the-shoulder view, path running to the horizon.
(() => {
'use strict';
const W = 720;
const H = Math.round(Math.min(Math.max(W * (window.innerHeight / Math.max(window.innerWidth, 1)), 1280), 1700));
const VPX = W / 2, HY = Math.round(H * 0.40), PY = H - 170, LW = 200, D = 18, SPAWNZ = 190;
const SAVE_KEY = 'cometCourierSave';
const BEST_KEY = 'cometCourierBest';
const EMBER = 0, FROST = 1;
const LEVELS_PER = 10, LEVEL_COUNT = 40;
const PHASE_COL = [0xff6a21, 0x7ad7ff];
const PHASE_NAME = ['EMBER', 'FROST'];
const VERSION = 'SEASON_SHIFT_V2_TAVI';

const SEASONS = [
  { name: 'SPRING', short: 'SPRING', hint: 'Blossoms on the meadow trail.',
    lows: ['log', 'fence', 'rock'], weather: 'petal', accent: 0xff9ab8 },
  { name: 'SUMMER', short: 'SUMMER', hint: 'A sun-baked path along the shore.',
    lows: ['log', 'fence', 'rock'], weather: 'dust', accent: 0xffc14d },
  { name: 'AUTUMN', short: 'AUTUMN', hint: 'Falling leaves on the forest trail.',
    lows: ['log', 'fence', 'rock'], weather: 'leaf', accent: 0xff7a3d },
  { name: 'WINTER', short: 'WINTER', hint: 'Snow and ice on the mountain path.',
    lows: ['snowbank', 'rock', 'log'], weather: 'snow', accent: 0xb8e0ff }
];

const UPGRADES = [
  { id: 'magnet',      name: 'Coin Magnet',   blurb: 'Pulls nearby acorns into your lane.',
    prices: [50, 120, 250, 500, 900] },
  { id: 'shield',      name: 'Trail Shield',  blurb: 'Start each run with extra hit shields.',
    prices: [80, 180, 350, 700, 1200] },
  { id: 'doubleCoins', name: 'Double Coins',  blurb: 'Acorns from a run are worth more.',
    prices: [100, 250, 500, 1000, 2000] },
  { id: 'headStart',   name: 'Head Start',    blurb: 'Begin each trail further down the path.',
    prices: [60, 150, 300, 600, 1100] },
  { id: 'extraLife',   name: 'Extra Life',    blurb: 'Survive a hit and keep running.',
    prices: [150, 400, 800, 1500, 2500] }
];
const COSTUMES = [
  { id: 'classic',    name: 'Classic',     price: 0,   key: 'tavi-ember-run1' },
  { id: 'scarf',      name: 'Scarf',       price: 200, key: 'tavi-costume-scarf' },
  { id: 'raincoat',   name: 'Raincoat',    price: 350, key: 'tavi-costume-raincoat' },
  { id: 'sunglasses', name: 'Sunglasses',  price: 300, key: 'tavi-costume-sunglasses' },
  { id: 'parka',      name: 'Winter Parka',price: 500, key: 'tavi-costume-parka' },
  { id: 'ninja',      name: 'Ninja',       price: 800, key: 'tavi-costume-ninja' }
];

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  const r = lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t), g = lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t), b = lerp(c1 & 255, c2 & 255, t);
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}
let CAMX = 0;
function proj(lane, z, h = 0) {
  const s = D / (D + Math.max(z, -D + 1));
  return { x: VPX + (lane - CAMX) * LW * s, y: HY + (PY - HY) * s - h * s, s };
}

// One continuous difficulty curve across all 40 levels (index 0..39).
// u(i) is strictly increasing, so every later route is harder than the one before:
//   Season N, Level 1  (index 10N)  is harder than  Season N-1, Level 10  (index 10N-1)
//   on speed, obstacle density, switch-wall frequency, and tighter gaps.
// A small in-level ramp uses only 40% of the step to the next route, so a level's
// hardest moment still stays easier than the next level's starting stats.
function curveU(i) {
  const t = Math.max(0, i) / 39;
  return t * 0.68 + t * t * 0.32;
}
function difficulty(i) {
  const idx = Math.max(0, Math.min(LEVEL_COUNT - 1, i | 0));
  const u = curveU(idx);
  return {
    index: idx,
    season: (idx / LEVELS_PER) | 0,
    stage: (idx % LEVELS_PER) + 1,
    u,
    baseSpeed: 44 + 70 * u,
    density: 0.12 + 0.58 * u,
    gateChance: idx < 2 ? 0 : 0.12 + 0.34 * u,
    pwallChance: idx < 3 ? 0 : 0.10 + 0.48 * u,
    gapT: 1.20 - 0.64 * u,
    breather: 0.26 - 0.20 * u,
    minGateGap: idx < 2 ? 99 : Math.max(2, Math.round(6 - 3.5 * u)),
    goal: 300 + idx * 20
  };
}
function mixDiff(i, progress) {
  const a = difficulty(i), p = Math.max(0, Math.min(1, progress));
  const uNext = i >= LEVEL_COUNT - 1 ? a.u + 0.04 : curveU(i + 1);
  const u = a.u + (uNext - a.u) * 0.4 * p;
  const virt = a.index + 0.4 * p;
  return {
    index: a.index, season: a.season, stage: a.stage, goal: a.goal, u, progress: p,
    baseSpeed: 44 + 70 * u,
    density: 0.12 + 0.58 * u,
    gateChance: a.index < 2 ? 0 : 0.12 + 0.34 * u,
    pwallChance: a.index < 3 ? 0 : 0.10 + 0.48 * u,
    gapT: 1.20 - 0.64 * u,
    breather: 0.26 - 0.20 * u,
    minGateGap: a.index < 2 ? 99 : Math.max(2, Math.round(6 - 3.5 * u))
  };
}
window.__difficulty = difficulty;
window.__mixDiff = mixDiff;
window.__LEVEL_COUNT = LEVEL_COUNT;
window.__SHOP = { UPGRADES, COSTUMES };
window.__VERSION = VERSION;

function defaultSave() {
  return {
    unlocked: 1, cleared: 0, best: 0, levelBest: {},
    coins: 0,
    upgrades: { magnet: 0, shield: 0, doubleCoins: 0, headStart: 0, extraLife: 0 },
    owned: { classic: true, scarf: false, raincoat: false, sunglasses: false, parka: false, ninja: false },
    equipped: 'classic',
    seasonCleared: [0, 0, 0, 0],
    muted: false
  };
}
function applyCheats(s) {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('unlockall') === '1') {
      s.unlocked = LEVEL_COUNT;
      s.seasonCleared = [LEVELS_PER, LEVELS_PER, LEVELS_PER, LEVELS_PER];
    }
    const c = parseInt(q.get('coins') || '', 10);
    if (c > 0) s.coins = c;
  } catch (e) {}
  return s;
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    const base = defaultSave();
    if (!s || typeof s !== 'object') {
      const legacy = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
      return applyCheats(Object.assign(base, { best: legacy }));
    }
    s.unlocked = Math.max(1, Math.min(LEVEL_COUNT, s.unlocked | 0));
    s.cleared = Math.max(0, Math.min(LEVEL_COUNT, s.cleared | 0));
    s.best = s.best | 0; s.levelBest = s.levelBest || {};
    s.coins = Math.max(0, s.coins | 0);
    s.upgrades = Object.assign({ magnet: 0, shield: 0, doubleCoins: 0, headStart: 0, extraLife: 0 }, s.upgrades || {});
    s.owned = Object.assign({ classic: true, scarf: false, raincoat: false, sunglasses: false, parka: false, ninja: false }, s.owned || {});
    if (!COSTUMES.some(c => c.id === s.equipped && s.owned[c.id])) s.equipped = 'classic';
    if (!Array.isArray(s.seasonCleared) || s.seasonCleared.length !== 4) {
      const c = s.cleared | 0;
      s.seasonCleared = [0, 0, 0, 0];
      for (let seas = 0; seas < 4; seas++) s.seasonCleared[seas] = Math.max(0, Math.min(LEVELS_PER, c - seas * LEVELS_PER));
    } else {
      s.seasonCleared = s.seasonCleared.map(n => Math.max(0, Math.min(LEVELS_PER, n | 0)));
    }
    s.muted = !!s.muted;
    return applyCheats(s);
  } catch (e) { return applyCheats(defaultSave()); }
}
function writeSave(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    if (s.best) localStorage.setItem(BEST_KEY, String(s.best));
  } catch (e) {}
}

const Sfx = {
  ctx: null,
  unlock() {
    if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    Music.unlock();
  },
  tone(f1, f2, dur, type = 'square', vol = 0.08) {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  coin() { this.tone(880, 1760, 0.12, 'triangle', 0.09); },
  jump() { this.tone(300, 700, 0.18, 'sine', 0.1); },
  slide() { this.tone(400, 150, 0.18, 'sawtooth', 0.04); },
  lane() { this.tone(500, 560, 0.05, 'sine', 0.05); },
  phase(p) { p ? this.tone(900, 280, 0.28, 'sine', 0.1) : this.tone(280, 900, 0.28, 'sine', 0.1); },
  hit() { this.tone(220, 40, 0.5, 'sawtooth', 0.15); },
  buy() { this.tone(520, 880, 0.16, 'triangle', 0.1); },
  win() { this.tone(520, 780, 0.18, 'triangle', 0.1); setTimeout(() => this.tone(780, 1040, 0.25, 'triangle', 0.1), 140); }
};

function isLevelOpen(save, i) {
  if ((save.unlocked | 0) >= LEVEL_COUNT) return true;
  const seas = (i / LEVELS_PER) | 0, n = i % LEVELS_PER;
  const sc = (save.seasonCleared && save.seasonCleared[seas]) | 0;
  return n <= sc;
}
function totalCleared(save) {
  const sc = save.seasonCleared || [0, 0, 0, 0];
  return sc.reduce((a, b) => a + (b | 0), 0);
}

const MUSIC_NAMES = ['spring', 'summer', 'autumn', 'winter'];
const Music = {
  muted: false,
  unlocked: false,
  intended: null,
  current: null,
  audios: {},
  missing: {},
  fade: 0,
  vol: 0.46,
  ensure(name) {
    if (!name || this.missing[name]) return null;
    if (this.audios[name]) return this.audios[name];
    const a = new Audio();
    a.src = 'assets/music/' + name + '.mp3';
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    a.addEventListener('error', () => { this.missing[name] = true; this.audios[name] = null; });
    this.audios[name] = a;
    return a;
  },
  unlock() {
    this.unlocked = true;
    // Warm every season track inside the user gesture so iOS will allow later play()
    MUSIC_NAMES.forEach(n => {
      const a = this.ensure(n);
      if (!a) return;
      const p = a.play();
      if (p && p.then) {
        p.then(() => { if (this.current !== n) { a.pause(); a.volume = 0; } }).catch(() => {});
      }
    });
    if (this.intended && !this.muted) this.play(this.intended, false);
  },
  setMuted(m) {
    this.muted = !!m;
    if (this.muted) {
      Object.keys(this.audios).forEach(k => { const a = this.audios[k]; if (a) { a.pause(); a.volume = 0; } });
      this.current = null;
    } else if (this.intended) {
      this.play(this.intended, true);
    }
  },
  play(name, force) {
    this.intended = name;
    if (!name || this.muted) return;
    const a = this.ensure(name);
    if (!a || this.missing[name]) return;
    if (this.current === name && !a.paused && !force) return;
    const prev = this.current && this.audios[this.current];
    this.current = name;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    this.fade = 0.7;
    this._from = prev && prev !== a ? prev : null;
    this._to = a;
    if (!this._from) a.volume = this.vol;
  },
  stop() {
    this.intended = null;
    this.fade = 0.55;
    this._from = this.current && this.audios[this.current];
    this._to = null;
    this.current = null;
  },
  update(dt) {
    if (this.fade > 0) {
      const start = 0.7;
      this.fade = Math.max(0, this.fade - dt);
      const k = this.fade <= 0 ? 1 : Math.min(1, 1 - this.fade / start);
      if (this._from) {
        this._from.volume = Math.max(0, this.vol * (1 - k));
        if (k >= 1) { this._from.pause(); this._from.volume = 0; this._from = null; }
      }
      if (this._to) this._to.volume = this.vol * k;
    }
  }
};
window.__Music = Music;

const ASSET_KEYS = [
  'bg-spring','bg-summer','bg-autumn','bg-winter',
  'ground-spring','ground-summer','ground-autumn','ground-winter',
  'tavi-ember-run1','tavi-ember-run2','tavi-ember-jump','tavi-ember-slide',
  'tavi-frost-run1','tavi-frost-run2','tavi-frost-jump','tavi-frost-slide',
  'tavi-costume-scarf','tavi-costume-scarf-jump','tavi-costume-scarf-slide',
  'tavi-costume-raincoat','tavi-costume-raincoat-jump','tavi-costume-raincoat-slide',
  'tavi-costume-sunglasses','tavi-costume-sunglasses-jump','tavi-costume-sunglasses-slide',
  'tavi-costume-parka','tavi-costume-parka-jump','tavi-costume-parka-slide',
  'tavi-costume-ninja','tavi-costume-ninja-jump','tavi-costume-ninja-slide',
  'obs-log','obs-fence','obs-rock','obs-snowbank','obs-branch','obs-stump',
  'wall-fire','wall-ice','coin-acorn','part-leaf','part-petal'
];

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    const barBg = this.add.rectangle(VPX, H * 0.55, 440, 22, 0x0d1a0c, 0.9).setOrigin(0.5);
    const bar = this.add.rectangle(VPX - 214, H * 0.55, 4, 14, 0xffc14d, 1).setOrigin(0, 0.5);
    this.add.text(VPX, H * 0.42, 'SEASON SHIFT', {
      fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif',
      fontSize: '64px', color: '#fff4d6', fontStyle: 'bold', stroke: '#1a2a14', strokeThickness: 8
    }).setOrigin(0.5);
    this.add.text(VPX, H * 0.48, 'Loading the trails…', {
      fontFamily: 'Trebuchet MS, Avenir Next, Arial, sans-serif', fontSize: '24px', color: '#dce8c8'
    }).setOrigin(0.5);
    this.load.on('progress', p => { bar.width = 4 + 424 * p; });
    for (const k of ASSET_KEYS) {
      const ext = k.startsWith('bg-') || k.startsWith('ground-') ? 'jpg' : 'png';
      this.load.image(k, 'assets/' + k + '.' + ext);
    }
  }
  create() { this.scene.start('run'); }
}

class RunScene extends Phaser.Scene {
  constructor() { super('run'); }

  create() {
    this.save = loadSave();
    Music.setMuted(!!this.save.muted);
    writeSave(this.save);
    this.best = this.save.best;
    this.t = 0;
    this.viewSeason = this.currentSeasonView();
    this.selLevel = Math.min(this.save.unlocked - 1, LEVEL_COUNT - 1);
    this.route = 0; this.endless = false;
    this.shopTab = 'upgrades';
    this.particles = [];
    this.weather = [];
    this.objs = [];
    this.sprPool = [];
    this.mapHits = [];
    this.uiHits = [];

    this.bgSpr = this.add.image(VPX, 0, 'bg-spring').setOrigin(0.5, 0).setDepth(0);
    this.fitBackdrop();

    this.roadCanvas = document.createElement('canvas');
    this.roadCanvas.width = W; this.roadCanvas.height = H;
    this.roadCtx = this.roadCanvas.getContext('2d');
    if (this.textures.exists('roadCanvas')) this.textures.remove('roadCanvas');
    this.roadTex = this.textures.addCanvas('roadCanvas', this.roadCanvas);
    this.roadSpr = this.add.image(0, 0, 'roadCanvas').setOrigin(0, 0).setDepth(1);

    this.g = this.add.graphics().setDepth(2);
    this.fxG = this.add.graphics().setDepth(20);
    this.mapG = this.add.graphics().setDepth(8);
    this.uiG = this.add.graphics().setDepth(9);

    this.playerSpr = this.add.image(VPX, PY, 'tavi-ember-run1').setOrigin(0.5, 0.9).setDepth(15);
    this.playerSpr.setDisplaySize(210, 250);

    this.groundImgs = {
      0: this.textures.get('ground-spring').getSourceImage(),
      1: this.textures.get('ground-summer').getSourceImage(),
      2: this.textures.get('ground-autumn').getSourceImage(),
      3: this.textures.get('ground-winter').getSourceImage()
    };

    this.makeUI();
    this.resetRun();
    this.state = 'home';
    this.showHome(true);
    this.setupInput();
    this.seedWeather(80);
  }

  fitBackdrop() {
    const key = 'bg-' + (SEASONS[this.seasonIndex()] || SEASONS[0]).name.toLowerCase();
    if (this.textures.exists(key) && this.bgSpr.texture.key !== key) this.bgSpr.setTexture(key);
    const tex = this.textures.get(this.bgSpr.texture.key);
    const src = tex.getSourceImage();
    // Extra width covers chase-cam pans so the sky never leaves a green gap
    const scale = Math.max((W + 220) / src.width, (HY + 80) / (src.height * 0.62));
    this.bgSpr.setScale(scale);
    this.bgSpr.y = 0;
    this.bgSpr.x = VPX - ((this.state === 'play' ? this.camX : 0) || 0) * 36;
  }
  seasonIndex() {
    if (this.state === 'play' || this.state === 'over' || this.state === 'clear') return (this.diff && this.diff.season) || 0;
    return this.viewSeason || 0;
  }
  currentSeasonView() {
    if (this.viewSeason >= 0 && this.viewSeason <= 3) return this.viewSeason;
    const sc = this.save.seasonCleared || [0, 0, 0, 0];
    for (let s = 0; s < 4; s++) if (sc[s] < LEVELS_PER) return s;
    return 3;
  }

  txt(x, y, s, size, color = '#ffffff', extra = {}) {
    return this.add.text(x, y, s, Object.assign({
      fontFamily: '"Trebuchet MS", "Avenir Next", Arial, sans-serif',
      fontSize: size + 'px', color, fontStyle: 'bold', align: 'center',
      stroke: '#1a140c', strokeThickness: Math.max(4, size / 7)
    }, extra)).setOrigin(0.5).setDepth(10);
  }

  makeUI() {
    this.scoreT = this.txt(30, 58, '0', 44).setOrigin(0, 0.5);
    this.coinT = this.txt(W - 30, 58, '0', 36, '#ffe066').setOrigin(1, 0.5);
    this.routeT = this.txt(VPX, 58, '', 26, '#fff0c8');
    this.phaseT = this.txt(VPX, H - 70, 'EMBER', 34, '#ffb06a');
    this.hintT = this.txt(VPX, H - 30, 'tap to shift form', 20, '#ffffffaa', { strokeThickness: 3 });
    this.livesT = this.txt(30, 118, '', 24, '#ff8a8a').setOrigin(0, 0.5);
    this.toastT = this.txt(VPX, H - 280, '', 32, '#ffffff').setAlpha(0).setDepth(30);

    this.titleT = this.txt(VPX, 92, 'SEASON SHIFT', 62, '#fff4d6', {
      fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif',
      strokeThickness: 12
    });
    this.subT = this.txt(VPX, 150, 'Tavi the tiger  ·  Ember & Frost', 24, '#ffe7b0');
    this.homeHelpT = this.txt(VPX, 190, 'Pick a season. Swipe to run, jump and slide. Tap to shift form.', 18, '#efe6d2', { strokeThickness: 3 });
    this.playT = this.txt(VPX, 0, '', 1, '#fff').setVisible(false);
    this.trailsT = this.txt(VPX, 0, '', 1, '#fff').setVisible(false);
    this.shopT = this.txt(VPX, H - 118, 'SHOP', 32, '#fff4d6');
    this.muteT = this.txt(W - 86, H - 118, 'MUSIC', 20, '#fff4d6');
    this.homeWalletT = this.txt(VPX, H - 48, '', 26, '#ffe066');
    this.homeBestT = this.txt(VPX, H - 18, '', 18, '#efe6d2', { strokeThickness: 3 });
    this.hubNameT = []; this.hubProgT = []; this.hubHintT = []; this.hubImgs = []; this.hubMasks = [];
    const CARD_COL = [0x3a6a3a, 0x2a6288, 0x8a3e1c, 0x2a4a6a];
    for (let s = 0; s < 4; s++) {
      const key = 'bg-' + SEASONS[s].name.toLowerCase();
      const img = this.add.image(0, 0, key).setDepth(10).setVisible(false).setOrigin(0.5, 0.35);
      const gmask = this.make.graphics({ x: 0, y: 0, add: false });
      img.setMask(gmask.createGeometryMask());
      this.hubImgs.push(img);
      this.hubMasks.push(gmask);
      this.hubNameT.push(this.txt(0, 0, SEASONS[s].name, 36, '#fff4d6', { fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif', strokeThickness: 8 }));
      this.hubProgT.push(this.txt(0, 0, '', 22, '#ffe066'));
      this.hubHintT.push(this.txt(0, 0, SEASONS[s].hint, 16, '#efe6d2', { strokeThickness: 3, wordWrap: { width: 300 } }));
    }
    this.hubItems = [...this.hubImgs, ...this.hubNameT, ...this.hubProgT, ...this.hubHintT, this.muteT];

    this.mapTitleT = this.txt(VPX, 70, 'CHOOSE A TRAIL', 44, '#fff4d6', { fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif' });
    this.mapSubT = this.txt(VPX, 130, '', 26, '#efe6d2');
    this.mapHintT = this.txt(VPX, 255, '', 22, '#ffffffaa', { strokeThickness: 3 });
    this.mapProgT = this.txt(VPX, H - 200, '', 26, '#ffe066');
    this.endlessT = this.txt(VPX, H - 130, 'ENDLESS RUN', 40, '#ffffff');
    this.mapBackT = this.txt(VPX, H - 60, 'HOME', 28, '#ffffffaa');
    this.seasonTs = []; this.levelTs = [];
    for (let s = 0; s < 4; s++) this.seasonTs.push(this.txt(90 + s * 180, 250, SEASONS[s].short, 18, '#ffffff'));
    for (let i = 0; i < 10; i++) this.levelTs.push(this.txt(0, 0, String(i + 1), 36, '#ffffff'));
    this.mapItems = [this.mapTitleT, this.mapSubT, this.mapHintT, this.mapProgT, this.endlessT, this.mapBackT, ...this.seasonTs, ...this.levelTs];

    this.shopTitleT = this.txt(VPX, 70, 'SHOP', 52, '#fff4d6', { fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif' });
    this.shopWalletT = this.txt(VPX, 125, '', 28, '#ffe066');
    this.shopTabUpT = this.txt(VPX - 150, 190, 'UPGRADES', 26, '#1a140c', { strokeThickness: 0 });
    this.shopTabCoT = this.txt(VPX + 150, 190, 'COSTUMES', 26, '#fff4d6');
    this.shopBackT = this.txt(VPX, H - 60, 'HOME', 28, '#ffffffaa');
    this.shopLines = [];
    for (let i = 0; i < 12; i++) {
      this.shopLines.push(this.txt(0, 0, '', 24, '#fff4d6').setVisible(false));
    }
    this.shopPreview = this.add.image(0, 0, 'tavi-ember-run1').setVisible(false).setDepth(11).setOrigin(0.5, 0.6);
    this.shopItems = [this.shopTitleT, this.shopWalletT, this.shopTabUpT, this.shopTabCoT, this.shopBackT, this.shopPreview, ...this.shopLines];

    this.overT = this.txt(VPX, 300, 'TRAIL\nLOST!', 90, '#ff6b8b', { strokeThickness: 14, lineSpacing: -12 });
    this.finalT = this.txt(VPX, 530, '', 40, '#ffffff', { lineSpacing: 10 });
    this.newBestT = this.txt(VPX, 700, 'NEW BEST!', 50, '#ffe066');
    this.retryT = this.txt(VPX, H - 220, 'TAP TO RETRY', 42, '#ffffff');
    this.toMapT = this.txt(VPX, H - 140, 'TRAILS', 32, '#ffffff');
    this.toHomeT = this.txt(VPX, H - 80, 'HOME', 28, '#ffffffcc');

    this.clearT = this.txt(VPX, 300, 'TRAIL\nCLEAR!', 90, '#7CF7A0', { strokeThickness: 14, lineSpacing: -12 });
    this.clearSubT = this.txt(VPX, 530, '', 40, '#ffffff', { lineSpacing: 10 });
    this.nextT = this.txt(VPX, H - 220, 'NEXT TRAIL', 42, '#ffffff');
  }

  setGroup(arr, v) { arr.forEach(o => { if (o && o.setVisible) o.setVisible(v); }); }
  hudItems() { return [this.scoreT, this.coinT, this.routeT, this.phaseT, this.hintT, this.livesT]; }
  homeItems() { return [this.titleT, this.subT, this.homeHelpT, this.shopT, this.muteT, this.homeWalletT, this.homeBestT, ...this.hubItems]; }
  overItems() { return [this.overT, this.finalT, this.newBestT, this.retryT, this.toMapT, this.toHomeT]; }
  clearItems() { return [this.clearT, this.clearSubT, this.nextT, this.toMapT, this.toHomeT]; }

  hideAll() {
    this.setGroup(this.homeItems(), false);
    this.setGroup(this.hudItems(), false);
    this.setGroup(this.mapItems, false);
    this.setGroup(this.shopItems, false);
    this.setGroup(this.overItems(), false);
    this.setGroup(this.clearItems(), false);
    this.shopPreview.setVisible(false);
    if (this.hideShopExtras) this.hideShopExtras();
    this.mapG.clear(); this.uiG.clear();
    this.uiHits = [];
  }

  showHome(v) {
    this.hideAll();
    if (!v) return;
    Music.stop();
    this.setGroup(this.homeItems(), true);
    const cleared = totalCleared(this.save);
    this.homeWalletT.setText('Acorns  ' + this.save.coins);
    this.homeBestT.setText(this.save.best
      ? ('BEST  ' + this.save.best + '   ·   ' + cleared + ' / 40 TRAILS')
      : 'All four seasons are open  ·  later seasons run harder');
    this.layoutHome();
  }
  layoutHome() {
    const g = this.uiG; g.clear(); this.uiHits = [];
    const bottom = 170;
    const top = 220;
    const gapX = 18, gapY = 16;
    const cardW = Math.round((W - 56 - gapX) / 2);
    const cardH = Math.round((H - top - bottom - gapY) / 2);
    const left = Math.round((W - cardW * 2 - gapX) / 2);
    const CARD_EDGE = [0xff9ab8, 0xffc14d, 0xff7a3d, 0xb8e0ff];
    for (let s = 0; s < 4; s++) {
      const col = s % 2, row = (s / 2) | 0;
      const x = left + col * (cardW + gapX), y = top + row * (cardH + gapY);
      g.fillStyle(0x0b1208, 0.35);
      g.fillRoundedRect(x + 4, y + 6, cardW, cardH, 26);
      g.fillStyle(0x1a2414, 0.55);
      g.fillRoundedRect(x, y, cardW, cardH, 26);
      g.lineStyle(4, CARD_EDGE[s], 0.95);
      g.strokeRoundedRect(x, y, cardW, cardH, 26);
      const img = this.hubImgs[s];
      img.setVisible(true).setPosition(x + cardW / 2, y + cardH * 0.42);
      const sc = Math.max(cardW / Math.max(1, img.width), (cardH * 0.85) / Math.max(1, img.height));
      img.setScale(sc).setAlpha(0.92);
      const mg = this.hubMasks[s];
      mg.clear();
      mg.fillStyle(0xffffff, 1);
      mg.fillRoundedRect(x + 6, y + 6, cardW - 12, cardH - 12, 22);
      const scleared = (this.save.seasonCleared && this.save.seasonCleared[s]) | 0;
      this.hubNameT[s].setPosition(x + cardW / 2, y + 36).setVisible(true).setDepth(12);
      this.hubProgT[s].setText(scleared + ' / 10 trails').setPosition(x + cardW / 2, y + 72).setVisible(true).setDepth(12);
      this.hubHintT[s].setPosition(x + cardW / 2, y + cardH - 28).setVisible(true).setDepth(12);
      this.uiHits.push({ kind: 'season', s, x, y, w: cardW, h: cardH });
    }
    // shop + mute
    g.fillStyle(0x6b3a1f, 1); g.fillRoundedRect(VPX - 150, H - 150, 220, 64, 32);
    g.fillStyle(this.save.muted ? 0x3a2a20 : 0x2d5a27, 1); g.fillRoundedRect(W - 150, H - 150, 120, 64, 32);
    this.shopT.setPosition(VPX - 40, H - 118).setVisible(true);
    this.muteT.setText(this.save.muted ? 'MUTED' : 'MUSIC').setPosition(W - 90, H - 118).setVisible(true);
    this.uiHits.push({ kind: 'shop', x: VPX - 150, y: H - 150, w: 220, h: 64 });
    this.uiHits.push({ kind: 'mute', x: W - 150, y: H - 150, w: 120, h: 64 });
  }

  showMap(v) {
    this.hideAll();
    if (!v) return;
    this.setGroup(this.mapItems, true);
    this.layoutMap();
  }
  layoutMap() {
    const g = this.mapG; g.clear();
    const cleared = totalCleared(this.save);
    const sc = (this.save.seasonCleared && this.save.seasonCleared[this.viewSeason]) | 0;
    this.mapHits = []; this.uiHits = [];
    this.mapSubT.setText(SEASONS[this.viewSeason].name);
    this.mapHintT.setText(SEASONS[this.viewSeason].hint);
    this.mapProgT.setText(SEASONS[this.viewSeason].name + '  ' + sc + ' / 10    ·    ' + cleared + ' / 40 trails');
    for (let s = 0; s < 4; s++) {
      const x = 24 + s * 174, y = 168, w = 162, h = 58;
      const active = s === this.viewSeason;
      g.fillStyle(active ? 0xffc14d : 0x2d5a27, 1);
      g.fillRoundedRect(x, y, w, h, 16);
      if (active) { g.lineStyle(3, 0xffffff, 1); g.strokeRoundedRect(x, y, w, h, 16); }
      this.seasonTs[s].setPosition(x + w / 2, y + h / 2).setColor(active ? '#1a140c' : '#ffffff').setText(SEASONS[s].short);
      this.mapHits.push({ kind: 'season', s, x, y, w, h });
    }
    const start = this.viewSeason * LEVELS_PER;
    for (let n = 0; n < 10; n++) {
      const i = start + n, col = n % 5, row = (n / 5) | 0;
      const x = 86 + col * 137, y = 340 + row * 155, r = 52;
      const isCleared = n < sc, isOpen = isLevelOpen(this.save, i), isSel = i === this.selLevel;
      g.fillStyle(isCleared ? 0x2d6a4f : (isOpen ? 0x3d5a27 : 0x1a1520), 1);
      g.fillCircle(x, y, r);
      g.lineStyle(isSel ? 6 : 3, isCleared ? 0x7CF7A0 : (isOpen ? (isSel ? 0xffc14d : 0xc4e38a) : 0x333328), 1);
      g.strokeCircle(x, y, r);
      this.levelTs[n].setPosition(x, y).setText(String(n + 1)).setColor(isOpen ? '#ffffff' : '#555544');
      this.mapHits.push({ kind: 'level', i, x: x - r, y: y - r, w: r * 2, h: r * 2 });
    }
    g.fillStyle(0x2d6cdf, 1); g.fillRoundedRect(VPX - 180, H - 160, 360, 64, 32);
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(VPX - 80, H - 85, 160, 48, 24);
    this.mapHits.push({ kind: 'endless', x: VPX - 180, y: H - 160, w: 360, h: 64 });
    this.mapHits.push({ kind: 'back', x: VPX - 80, y: H - 85, w: 160, h: 48 });
  }

  showShop(v) {
    this.hideAll();
    if (!v) return;
    this.setGroup([this.shopTitleT, this.shopWalletT, this.shopTabUpT, this.shopTabCoT, this.shopBackT], true);
    this.layoutShop();
  }
  layoutShop() {
    const g = this.uiG; g.clear(); this.uiHits = [];
    this.shopLines.forEach(t => t.setVisible(false));
    this.shopPreview.setVisible(false);
    this.shopWalletT.setText('Acorns  ' + this.save.coins);
    const up = this.shopTab === 'upgrades';
    g.fillStyle(up ? 0xffc14d : 0x2a241c, 1); g.fillRoundedRect(VPX - 280, 160, 250, 60, 20);
    g.fillStyle(!up ? 0xffc14d : 0x2a241c, 1); g.fillRoundedRect(VPX + 30, 160, 250, 60, 20);
    this.shopTabUpT.setColor(up ? '#1a140c' : '#fff4d6').setPosition(VPX - 155, 190);
    this.shopTabCoT.setColor(!up ? '#1a140c' : '#fff4d6').setPosition(VPX + 155, 190);
    this.uiHits.push({ kind: 'tab', tab: 'upgrades', x: VPX - 280, y: 160, w: 250, h: 60 });
    this.uiHits.push({ kind: 'tab', tab: 'costumes', x: VPX + 30, y: 160, w: 250, h: 60 });
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(VPX - 80, H - 85, 160, 48, 24);
    this.uiHits.push({ kind: 'back', x: VPX - 80, y: H - 85, w: 160, h: 48 });

    if (up) {
      UPGRADES.forEach((u, i) => {
        const y = 250 + i * 155;
        const lv = this.save.upgrades[u.id] | 0;
        const max = u.prices.length;
        const done = lv >= max;
        const cost = done ? 0 : u.prices[lv];
        g.fillStyle(0x1a140c, 0.72); g.fillRoundedRect(40, y, W - 80, 140, 20);
        const t0 = this.shopLines[i * 2]; const t1 = this.shopLines[i * 2 + 1];
        t0.setVisible(true).setOrigin(0, 0.5).setPosition(64, y + 40)
          .setText(u.name + '   Lv ' + lv + '/' + max).setColor('#fff4d6').setFontSize('28px');
        t1.setVisible(true).setOrigin(0, 0.5).setPosition(64, y + 82)
          .setText(u.blurb).setColor('#d8d0c0').setFontSize('20px').setStroke('#1a140c', 3);
        const label = done ? 'MAX' : ('BUY  ' + cost);
        const can = !done && this.save.coins >= cost;
        g.fillStyle(done ? 0x2d5a27 : (can ? 0xffc14d : 0x4a4438), 1);
        g.fillRoundedRect(W - 250, y + 36, 170, 68, 16);
        const bt = this.shopLines[10] && i === 0 ? null : null;
        // per-row button label uses leftover lines 10+ or we draw text via a dedicated line
        const btn = this.ensureShopBtn(i, W - 165, y + 70, label, done || can ? (done ? '#ffffff' : '#1a140c') : '#aaa088');
        this.uiHits.push({ kind: 'buyUp', id: u.id, x: W - 250, y: y + 36, w: 170, h: 68 });
      });
    } else {
      COSTUMES.forEach((c, i) => {
        const col = i % 2, row = (i / 2) | 0;
        const x = 40 + col * 340, y = 250 + row * 280, w = 320, h = 260;
        const owned = !!this.save.owned[c.id];
        const eq = this.save.equipped === c.id;
        g.fillStyle(eq ? 0x3d5a27 : 0x1a140c, 0.8); g.fillRoundedRect(x, y, w, h, 20);
        if (eq) { g.lineStyle(4, 0xffc14d, 1); g.strokeRoundedRect(x, y, w, h, 20); }
        const spr = this.ensureShopSpr(i, c.key, x + w / 2, y + 110);
        const label = eq ? 'EQUIPPED' : (owned ? 'EQUIP' : ('BUY  ' + c.price));
        const can = eq || owned || this.save.coins >= c.price;
        this.shopLines[i].setVisible(true).setOrigin(0.5).setPosition(x + w / 2, y + 210)
          .setText(c.name).setColor('#fff4d6').setFontSize('24px');
        g.fillStyle(eq ? 0x2d6a4f : (can ? 0xffc14d : 0x4a4438), 1);
        g.fillRoundedRect(x + 50, y + 220, w - 100, 32, 14);
        this.shopLines[i + 6].setVisible(true).setOrigin(0.5).setPosition(x + w / 2, y + 236)
          .setText(label).setColor(eq || !can ? '#ffffff' : '#1a140c').setFontSize('16px').setStroke('#000000', 2);
        this.uiHits.push({ kind: 'costume', id: c.id, x, y, w, h });
      });
    }
  }
  ensureShopBtn(i, x, y, label, color) {
    // reuse shopLines 10 is not enough; use the name line's sibling already set. Draw label with a reserved text:
    // We packed 2 lines per upgrade (0-9). Put button labels on a floating set by hijacking nothing —
    // instead create leftover: shopLines only has 12. For 5 upgrades we used 0-9. Use a graphics-only button
    // and overlay text via a map we store on this.shopBtns
    if (!this.shopBtns) {
      this.shopBtns = [];
      for (let k = 0; k < 6; k++) this.shopBtns.push(this.txt(0, 0, '', 22, '#1a140c', { strokeThickness: 0 }).setDepth(12));
    }
    const t = this.shopBtns[i];
    t.setVisible(true).setPosition(x, y).setText(label).setColor(color);
    return t;
  }
  ensureShopSpr(i, key, x, y) {
    if (!this.shopSprs) {
      this.shopSprs = [];
      for (let k = 0; k < 6; k++) this.shopSprs.push(this.add.image(0, 0, 'tavi-ember-run1').setDepth(11).setOrigin(0.5, 0.7));
    }
    const s = this.shopSprs[i];
    if (s.texture.key !== key && this.textures.exists(key)) s.setTexture(key);
    s.setVisible(true).setPosition(x, y);
    s.setDisplaySize(150, 170);
    return s;
  }
  hideShopExtras() {
    (this.shopBtns || []).forEach(t => t.setVisible(false));
    (this.shopSprs || []).forEach(s => s.setVisible(false));
  }

  showOver(v) {
    this.hideAll();
    if (!v) return;
    this.setGroup(this.overItems(), v);
    this.clearT.setVisible(false); this.clearSubT.setVisible(false); this.nextT.setVisible(false);
  }
  showClear(v) {
    this.hideAll();
    if (!v) return;
    this.setGroup(this.clearItems(), v);
    this.overT.setVisible(false); this.finalT.setVisible(false); this.newBestT.setVisible(false); this.retryT.setVisible(false);
  }

  resetRun() {
    this.recycleAll();
    this.objs = [];
    this.lane = 0; this.px = 0; this.camX = 0; CAMX = 0;
    this.jumpH = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = EMBER; this.phaseMix = 0; this.phaseCd = 0;
    const d = difficulty(this.endless ? 0 : this.route);
    this.diff = d;
    const hs = (this.save.upgrades.headStart | 0) * 0.07;
    this.dist = (this.state === 'play' && !this.endless) ? d.goal * hs : 0;
    this.speed = d.baseSpeed; this.nextRow = this.dist + 40; this.elapsed = 0;
    this.coins = 0; this.score = 0; this.rowCount = 0; this.lastGateRow = -10;
    this.shake = 0; this.flash = 0; this.deadT = 0; this.virtLevel = this.route;
    this.shields = this.save.upgrades.shield | 0;
    this.lives = this.save.upgrades.extraLife | 0;
    this.invuln = 0;
    this.coinMul = 1 + 0.5 * (this.save.upgrades.doubleCoins | 0);
    this.magLv = this.save.upgrades.magnet | 0;
  }

  recycleAll() {
    this.objs.forEach(o => {
      if (o.spr) { o.spr.setVisible(false).setActive(false); o.spr = null; }
      if (o.sprs) { o.sprs.forEach(s => { s.setVisible(false).setActive(false); }); o.sprs = null; }
    });
    (this.sprPool || []).forEach(s => { s.setVisible(false).setActive(false); });
  }
  getSpr(key) {
    let s = this.sprPool.find(x => !x.active);
    if (!s) { s = this.add.image(0, 0, key).setDepth(10); this.sprPool.push(s); }
    if (s.texture.key !== key && this.textures.exists(key)) s.setTexture(key);
    s.setActive(true).setVisible(true).setAlpha(1).clearTint();
    return s;
  }

  setupInput() {
    this.input.addPointer(2);
    this.input.on('pointerdown', p => { Sfx.unlock(); this.sw = { x: p.x, y: p.y, t: performance.now(), done: false }; });
    this.input.on('pointermove', p => {
      if (!this.sw || this.sw.done || !p.isDown) return;
      const dx = p.x - this.sw.x, dy = p.y - this.sw.y;
      if (this.state === 'play' && Math.hypot(dx, dy) > 50) { this.sw.done = true; this.swipe(dx, dy); }
    });
    this.input.on('pointerup', p => {
      if (!this.sw) return;
      const dx = p.x - this.sw.x, dy = p.y - this.sw.y;
      if (!this.sw.done) {
        if (this.state === 'play' && Math.hypot(dx, dy) > 30) this.swipe(dx, dy);
        else this.tapAt(p.x, p.y);
      }
      this.sw = null;
    });
    const kb = this.input.keyboard;
    kb.on('keydown', e => {
      Sfx.unlock();
      const k = e.code;
      if (this.state === 'map') return this.mapKey(k);
      if (this.state === 'shop') {
        if (k === 'Escape' || k === 'Backspace' || k === 'KeyH') this.goHome();
        else if (k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ') { this.shopTab = 'upgrades'; this.hideShopExtras(); this.layoutShop(); }
        else if (k === 'ArrowRight' || k === 'KeyD' || k === 'KeyE') { this.shopTab = 'costumes'; this.hideShopExtras(); this.layoutShop(); }
        return;
      }
      if (this.state !== 'play') {
        if (k === 'Escape' || k === 'Backspace' || k === 'KeyH') { if (this.state !== 'home') this.goHome(); return; }
        if (k === 'KeyM' && this.state === 'home') { this.toggleMute(); return; }
        if (k === 'KeyS' && this.state === 'home') { this.openShop(); return; }
        if (this.state === 'home' && (k === 'Digit1' || k === 'Digit2' || k === 'Digit3' || k === 'Digit4')) {
          this.openSeason(parseInt(k.slice(-1), 10) - 1); return;
        }
        if (['Space', 'Enter', 'ArrowUp', 'KeyW'].includes(k)) this.tapAt(VPX, H - 340);
        return;
      }
      if (k === 'ArrowLeft' || k === 'KeyA') this.move(-1);
      else if (k === 'ArrowRight' || k === 'KeyD') this.move(1);
      else if (k === 'ArrowUp' || k === 'KeyW') this.jump();
      else if (k === 'ArrowDown' || k === 'KeyS') this.slide();
      else if (k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight' || k === 'KeyE') this.togglePhase();
      else if (k === 'Escape') this.openMap();
    });
  }
  swipe(dx, dy) {
    if (this.state !== 'play') return;
    if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1);
    else if (dy < 0) this.jump(); else this.slide();
  }
  tapAt(x, y) {
    if (this.state === 'home') return this.hitHome(x, y);
    if (this.state === 'map') return this.hitMap(x, y);
    if (this.state === 'shop') return this.hitShop(x, y);
    if (this.state === 'over') {
      if (this.deadT < 0.7) return;
      if (y > H - 105) this.goHome();
      else if (y > H - 170) this.openMap();
      else this.startRun(this.route, this.endless);
      return;
    }
    if (this.state === 'clear') {
      if (this.deadT < 0.7) return;
      if (y > H - 105) this.goHome();
      else if (y > H - 170) this.openSeason(this.viewSeason);
      else if ((this.route % LEVELS_PER) < LEVELS_PER - 1) this.startRun(this.route + 1, false);
      else this.goHome();
      return;
    }
    this.togglePhase();
  }
  hitHome(x, y) {
    const hit = (this.uiHits || []).find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.kind === 'shop') this.openShop();
    else if (hit.kind === 'mute') this.toggleMute();
    else if (hit.kind === 'season') this.openSeason(hit.s);
  }
  toggleMute() {
    this.save.muted = !this.save.muted;
    writeSave(this.save);
    Music.setMuted(this.save.muted);
    Sfx.lane();
    this.layoutHome();
  }
  hitShop(x, y) {
    const hit = (this.uiHits || []).find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.kind === 'back') return this.goHome();
    if (hit.kind === 'tab') { this.shopTab = hit.tab; this.hideShopExtras(); this.layoutShop(); return; }
    if (hit.kind === 'buyUp') return this.buyUpgrade(hit.id);
    if (hit.kind === 'costume') return this.buyOrEquip(hit.id);
  }
  buyUpgrade(id) {
    const u = UPGRADES.find(x => x.id === id); if (!u) return;
    const lv = this.save.upgrades[id] | 0;
    if (lv >= u.prices.length) return this.toast('Already maxed');
    const cost = u.prices[lv];
    if (this.save.coins < cost) return this.toast('Not enough acorns');
    this.save.coins -= cost;
    this.save.upgrades[id] = lv + 1;
    writeSave(this.save);
    Sfx.buy();
    this.toast(u.name + ' is now level ' + (lv + 1));
    this.hideShopExtras(); this.layoutShop();
  }
  buyOrEquip(id) {
    const c = COSTUMES.find(x => x.id === id); if (!c) return;
    if (this.save.owned[id]) {
      this.save.equipped = id; writeSave(this.save); Sfx.lane();
      this.toast(c.name + ' equipped');
      this.hideShopExtras(); this.layoutShop(); return;
    }
    if (this.save.coins < c.price) return this.toast('Not enough acorns');
    this.save.coins -= c.price;
    this.save.owned[id] = true;
    this.save.equipped = id;
    writeSave(this.save);
    Sfx.buy();
    this.toast(c.name + ' equipped!');
    this.hideShopExtras(); this.layoutShop();
  }
  hitMap(x, y) {
    const hit = (this.mapHits || []).find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.kind === 'season') {
      this.viewSeason = hit.s;
      Music.play(MUSIC_NAMES[hit.s], false);
      const sc = (this.save.seasonCleared && this.save.seasonCleared[hit.s]) | 0;
      this.selLevel = hit.s * LEVELS_PER + Math.min(sc, LEVELS_PER - 1);
      this.layoutMap(); return;
    }
    if (hit.kind === 'level') {
      if (!isLevelOpen(this.save, hit.i)) return this.toast('Clear the previous trail first');
      this.selLevel = hit.i; this.startRun(hit.i, false); return;
    }
    if (hit.kind === 'endless') {
      const sc = this.save.seasonCleared || [0, 0, 0, 0];
      let best = 0;
      for (let s = 0; s < 4; s++) if (sc[s] > 0) best = Math.max(best, s * LEVELS_PER + sc[s] - 1);
      return this.startRun(best, true);
    }
    if (hit.kind === 'back') return this.goHome();
  }
  mapKey(k) {
    if (k === 'Escape' || k === 'Backspace' || k === 'KeyH') return this.goHome();
    if (k === 'ArrowLeft' || k === 'KeyA') { this.selLevel = Math.max(this.viewSeason * 10, this.selLevel - 1); this.layoutMap(); }
    else if (k === 'ArrowRight' || k === 'KeyD') { this.selLevel = Math.min(this.viewSeason * 10 + 9, this.selLevel + 1); this.layoutMap(); }
    else if (k === 'ArrowUp' || k === 'KeyW') { this.selLevel = Math.max(this.viewSeason * 10, this.selLevel - 5); this.layoutMap(); }
    else if (k === 'ArrowDown' || k === 'KeyS') { this.selLevel = Math.min(this.viewSeason * 10 + 9, this.selLevel + 5); this.layoutMap(); }
    else if (k === 'KeyQ') { if (this.viewSeason > 0) { this.viewSeason--; this.selLevel = this.viewSeason * 10; Music.play(MUSIC_NAMES[this.viewSeason], false); this.layoutMap(); } }
    else if (k === 'KeyE') { if (this.viewSeason < 3) { this.viewSeason++; this.selLevel = this.viewSeason * 10; Music.play(MUSIC_NAMES[this.viewSeason], false); this.layoutMap(); } }
    else if (k === 'Space' || k === 'Enter') {
      if (isLevelOpen(this.save, this.selLevel)) this.startRun(this.selLevel, false);
      else this.toast('Clear the previous trail first');
    }
    else if (k === 'KeyN') {
      const sc = this.save.seasonCleared || [0, 0, 0, 0];
      let best = 0;
      for (let s = 0; s < 4; s++) if (sc[s] > 0) best = Math.max(best, s * LEVELS_PER + sc[s] - 1);
      this.startRun(best, true);
    }
  }

  move(d) { const n = Phaser.Math.Clamp(this.lane + d, -1, 1); if (n !== this.lane) { this.lane = n; Sfx.lane(); } }
  jump() { if (this.jumpH <= 0.01) { this.jumpV = 980; this.slideT = 0; Sfx.jump(); } }
  slide() { if (this.jumpH > 0) this.jumpV = -1400; this.slideT = 0.62; Sfx.slide(); }
  togglePhase() {
    if (this.phaseCd > 0) return;
    this.phase ^= 1; this.phaseCd = 0.18; Sfx.phase(this.phase);
    for (let i = 0; i < 18; i++) this.burst(VPX + this.px * LW, PY - 60 - this.jumpH, PHASE_COL[this.phase], 1);
  }

  goHome() {
    this.hideShopExtras();
    this.state = 'home';
    Music.stop();
    this.showHome(true);
    this.resetRun();
  }
  openSeason(s) {
    this.hideShopExtras();
    this.viewSeason = Math.max(0, Math.min(3, s | 0));
    const sc = (this.save.seasonCleared && this.save.seasonCleared[this.viewSeason]) | 0;
    this.selLevel = this.viewSeason * LEVELS_PER + Math.min(sc, LEVELS_PER - 1);
    this.state = 'map';
    Music.play(MUSIC_NAMES[this.viewSeason], false);
    this.showMap(true);
    this.resetRun();
  }
  openMap() {
    this.openSeason(this.viewSeason || this.seasonIndex() || 0);
  }
  openShop() {
    this.state = 'shop';
    this.shopTab = 'upgrades';
    this.showShop(true);
    this.resetRun();
  }
  startNext() {
    const i = Math.min(this.save.cleared, LEVEL_COUNT - 1);
    const idx = i < this.save.unlocked ? i : Math.max(0, this.save.unlocked - 1);
    this.startRun(idx, false);
  }
  startRun(index, endless) {
    this.hideShopExtras();
    this.route = index | 0; this.endless = !!endless; this.selLevel = this.route;
    this.viewSeason = (this.route / LEVELS_PER) | 0;
    this.state = 'play';
    Music.play(MUSIC_NAMES[this.viewSeason], false);
    this.resetRun();
    this.hideAll();
    this.setGroup(this.hudItems(), true);
    this.hintT.setVisible(true); this.phaseT.setVisible(true);
    if (this.endless) this.toast('Endless run — how far can you go?', 2.0);
    else if (this.route < 2) this.toast('Swipe to change lanes, jump and slide!', 2.2);
    else this.toast('Tap to shift Ember and Frost!', 2.2);
  }
  toast(s, dur = 1.4) { this.toastT.setText(s).setAlpha(1).setVisible(true); this.toastDur = dur; }

  currentDiff() {
    if (this.endless) {
      const i = Math.min(LEVEL_COUNT - 1, Math.floor(this.elapsed / 18));
      const p = Math.min(1, (this.elapsed % 18) / 18);
      const d = mixDiff(Math.min(i, LEVEL_COUNT - 1), i >= LEVEL_COUNT - 1 ? 1 : p);
      d.goal = Infinity;
      return d;
    }
    return mixDiff(this.route, this.diff.goal ? this.dist / this.diff.goal : 0);
  }

  coinLine(lane, z, n, gap) {
    for (let i = 0; i < n; i++) this.objs.push({ type: 'coin', lane, z: z + i * gap, h: 0 });
  }
  coinDiag(l0, l1, z, n, gap) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      this.objs.push({ type: 'coin', lane: l0 + (l1 - l0) * t, z: z + i * gap, h: 0 });
    }
  }
  coinArc(lane, z, n, gap, hMax) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      this.objs.push({ type: 'coin', lane, z: z + i * gap, h: Math.sin(t * Math.PI) * hMax });
    }
  }

  spawnRow(z) {
    this.rowCount++;
    const r = Math.random(), d = this.currentDiff();
    const lanes = [-1, 0, 1];
    const season = SEASONS[d.season || 0];
    if (d.gateChance > 0 && r < d.gateChance && this.rowCount - this.lastGateRow > d.minGateGap) {
      this.lastGateRow = this.rowCount;
      const ph = Math.random() < 0.7 ? (this.phase ^ 1) : this.phase;
      this.objs.push({ type: 'gate', lane: 0, z, phase: ph, visual: ph === EMBER ? 'fire' : 'ice' });
      this.coinLine(this.lane, z + 5, 4, 6);
      return;
    }
    if (r > 1 - d.breather) {
      const kind = Math.random();
      if (kind < 0.4) this.coinLine(lanes[(Math.random() * 3) | 0], z, 6, 5);
      else if (kind < 0.7) {
        const a = lanes[(Math.random() * 3) | 0];
        let b = lanes[(Math.random() * 3) | 0]; if (b === a) b = Phaser.Math.Clamp(a + (Math.random() < 0.5 ? -1 : 1), -1, 1);
        this.coinDiag(a, b, z, 6, 5);
      } else this.coinArc(lanes[(Math.random() * 3) | 0], z, 6, 5, 140);
      return;
    }
    const n = Math.random() < d.density ? 2 : 1;
    Phaser.Utils.Array.Shuffle(lanes);
    const placed = [];
    for (let i = 0; i < n; i++) {
      const q = Math.random();
      let type, visual, phase;
      if (q < 0.52) {
        type = 'low'; visual = season.lows[(Math.random() * season.lows.length) | 0];
      } else if (q < 0.70) {
        type = 'high'; visual = 'branch';
      } else if (q < 0.86 || d.pwallChance <= 0 || Math.random() >= d.pwallChance) {
        type = 'wall'; visual = (Math.random() < 0.65 ? 'stump' : 'rock');
      } else {
        type = 'pwall'; phase = Math.random() < 0.5 ? EMBER : FROST; visual = phase === EMBER ? 'fire' : 'ice';
      }
      const o = { type, lane: lanes[i], z, visual, phase };
      this.objs.push(o);
      placed.push(o);
    }
    const used = new Set(placed.map(o => o.lane));
    const free = [-1, 0, 1].filter(l => !used.has(l));
    const lows = placed.filter(o => o.type === 'low');
    if (lows.length) {
      this.coinArc(lows[0].lane, z - 4, 5, 5, 130);
    } else if (free.length) {
      if (Math.random() < 0.5 && free.length) this.coinLine(free[0], z, 5, 5);
      else if (placed.length) this.coinDiag(placed[0].lane, free[0] != null ? free[0] : this.lane, z, 5, 5);
    }
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.t += dt;
    if (this.toastDur > 0) { this.toastDur -= dt; if (this.toastDur < 0.4) this.toastT.setAlpha(Math.max(this.toastDur / 0.4, 0)); }

    let spd = 0;
    if (this.state === 'play') {
      this.elapsed += dt;
      const d = this.currentDiff();
      this.diffNow = d;
      this.speed = d.baseSpeed;
      spd = this.speed;
      this.phaseCd -= dt;
      if (this.invuln > 0) this.invuln -= dt;
    } else if (this.state === 'home' || this.state === 'map' || this.state === 'shop') spd = 18;
    else { this.deadT += dt; spd = 0; }

    this.dist += spd * dt;
    this.phaseMix = lerp(this.phaseMix, this.phase, Math.min(dt * 8, 1));
    this.px = lerp(this.px, this.lane, Math.min(dt * 16, 1));
    if (this.camX == null) this.camX = this.px;
    // Chase-cam lags the runner so lane changes feel like a camera swinging behind Tavi
    this.camX = lerp(this.camX, this.px, Math.min(dt * 5.2, 1));
    CAMX = (this.state === 'play') ? this.camX : 0;
    Music.update(dt);
    if (this.jumpH > 0 || this.jumpV > 0) {
      this.jumpV -= 2700 * dt;
      this.jumpH = Math.max(0, this.jumpH + this.jumpV * dt);
      if (this.jumpH === 0) this.jumpV = 0;
    }
    if (this.slideT > 0) this.slideT -= dt;

    if (this.state === 'play') {
      while (this.dist >= this.nextRow) {
        this.spawnRow(SPAWNZ - (this.dist - this.nextRow));
        const gapT = this.currentDiff().gapT;
        this.nextRow += Math.max(this.speed * gapT, 26);
      }
      const magR = this.magLv ? (0.4 + 0.45 * this.magLv) : 0;
      for (const o of this.objs) {
        const pz = o.z; o.z -= spd * dt;
        if (o.dead) continue;
        if (o.type === 'coin') {
          if (this.magLv && o.z < 30 && o.z > -2) {
            const dl = this.px - o.lane;
            if (Math.abs(dl) < magR) o.lane += dl * Math.min(1, dt * (2.2 + this.magLv));
          }
          const closeLane = Math.abs(o.lane - this.px) < (this.magLv ? 0.55 : 0.45);
          if (pz > 1.5 && o.z <= 1.5 && closeLane && Math.abs((o.h || 0) - this.jumpH) < 110) {
            o.dead = true; this.coins++; Sfx.coin();
            const p = proj(o.lane, 0, (o.h || 0) + 40); for (let k = 0; k < 8; k++) this.burst(p.x, p.y, 0xffe066, 0.7);
          }
        } else if (pz > 0 && o.z <= 0) {
          if (this.invuln <= 0 && this.collides(o, Math.round(this.px))) {
            this.onHit(o);
            if (this.state !== 'play') break;
          }
        }
      }
      this.score = Math.floor(this.dist) + this.coins * 25;
      this.scoreT.setText(String(this.score));
      this.coinT.setText('🌰 ' + this.coins + (this.coinMul > 1 ? ('  ×' + this.coinMul.toFixed(1)) : ''));
      this.phaseT.setText((this.phase ? '❄  ' : '🔥  ') + PHASE_NAME[this.phase]).setColor(this.phase ? '#9ee8ff' : '#ffb06a');
      const sh = this.shields, lv = this.lives;
      this.livesT.setText((sh ? ('🛡 ' + sh + '   ') : '') + (lv ? ('❤ ' + lv) : ''));
      if (this.endless) this.routeT.setText('ENDLESS');
      else this.routeT.setText(SEASONS[this.diff.season].short + '  ' + this.diff.stage + '/10');
      if (!this.endless && this.dist >= this.diff.goal && this.state === 'play') this.win();
    } else {
      for (const o of this.objs) o.z -= spd * dt;
    }
    this.objs = this.objs.filter(o => {
      const keep = o.z > -14 && !(o.dead && o.type === 'coin');
      if (!keep) {
        if (o.spr) { o.spr.setVisible(false).setActive(false); o.spr = null; }
        if (o.sprs) { o.sprs.forEach(s => { s.setVisible(false).setActive(false); }); o.sprs = null; }
      }
      return keep;
    });

    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    this.updateWeather(dt, spd);
    this.shake = Math.max(0, this.shake - dt * 2); this.flash = Math.max(0, this.flash - dt * 2.5);
    this.cameras.main.setScroll((Math.random() - 0.5) * 30 * this.shake, (Math.random() - 0.5) * 30 * this.shake);

    if (this.state === 'home') { /* season cards are the home call-to-action */ }
    if (this.state === 'over') this.retryT.setAlpha(this.deadT > 0.35 ? 0.7 + 0.3 * Math.sin(this.t * 4) : Math.max(0, this.deadT / 0.35));
    if (this.state === 'clear') this.nextT.setAlpha(this.deadT > 0.35 ? 0.7 + 0.3 * Math.sin(this.t * 4) : Math.max(0, this.deadT / 0.35));

    this.draw();
  }

  onHit(o) {
    if (this.shields > 0) {
      this.shields--; this.invuln = 1.15; this.flash = 0.45;
      Sfx.hit();
      if (o) o.dead = true;
      this.toast('Shield broke!', 1.0);
      for (let i = 0; i < 16; i++) this.burst(VPX + this.px * LW, PY - 60, 0x7ad7ff, 1);
      return;
    }
    if (this.lives > 0) {
      this.lives--; this.invuln = 1.4; this.flash = 0.5; this.shake = 0.5;
      Sfx.hit();
      this.toast('Extra life!', 1.0);
      for (let i = 0; i < 16; i++) this.burst(VPX + this.px * LW, PY - 60, 0xff8a8a, 1);
      return;
    }
    this.die();
  }

  collides(o, pl) {
    if (o.type === 'gate') return o.phase !== this.phase;
    if (Math.abs((o.lane || 0) - pl) > 0.45 && o.type !== 'gate') return false;
    if (o.type === 'wall') return true;
    if (o.type === 'pwall') return o.phase !== this.phase;
    if (o.type === 'low') return this.jumpH < 55;
    if (o.type === 'high') return this.slideT <= 0;
    return false;
  }

  bankCoins() {
    const add = Math.round(this.coins * this.coinMul);
    this.save.coins += add;
    return add;
  }
  recordScore() {
    const nb = this.score > this.save.best;
    if (nb) this.save.best = this.score;
    const key = this.endless ? 'endless' : String(this.route);
    if (!this.save.levelBest[key] || this.score > this.save.levelBest[key]) this.save.levelBest[key] = this.score;
    this.best = this.save.best;
    writeSave(this.save);
    return nb;
  }
  die() {
    this.state = 'over'; this.deadT = 0; this.shake = 1; this.flash = 1;
    this.toastDur = 0; this.toastT.setAlpha(0);
    this.score = Math.floor(this.dist) + this.coins * 25;
    Sfx.hit();
    for (let i = 0; i < 30; i++) this.burst(VPX + this.px * LW, PY - 60, i % 2 ? 0xff8a3d : 0xffffff, 1.4);
    const banked = this.bankCoins();
    const nb = this.recordScore();
    const tag = this.endless ? 'ENDLESS' : (SEASONS[this.diff.season].short + '  ' + this.diff.stage + '/10');
    this.finalT.setText(tag + '\nSCORE  ' + this.score + '\n' + banked + ' acorns banked\nBEST  ' + this.save.best);
    this.showOver(true); this.newBestT.setVisible(nb);
    this.hintT.setVisible(false); this.phaseT.setVisible(false);
    this.scoreT.setText(String(this.score));
  }
  win() {
    this.state = 'clear'; this.deadT = 0;
    this.toastDur = 0; this.toastT.setAlpha(0);
    this.score = Math.floor(this.dist) + this.coins * 25;
    Sfx.win();
    for (let i = 0; i < 24; i++) this.burst(VPX + this.px * LW, PY - 80, i % 2 ? 0x7CF7A0 : 0xffe066, 1.2);
    if (!this.save.seasonCleared) this.save.seasonCleared = [0, 0, 0, 0];
    const seas = (this.route / LEVELS_PER) | 0, n = this.route % LEVELS_PER;
    if (this.save.seasonCleared[seas] < n + 1) this.save.seasonCleared[seas] = n + 1;
    this.save.cleared = totalCleared(this.save);
    if (this.save.unlocked < this.route + 2) this.save.unlocked = Math.min(LEVEL_COUNT, this.route + 2);
    const banked = this.bankCoins();
    const nb = this.recordScore();
    const seasonDone = n >= LEVELS_PER - 1;
    const allDone = this.save.cleared >= LEVEL_COUNT;
    this.clearT.setText(allDone ? 'ALL 40\nTRAILS!' : 'TRAIL\nCLEAR!');
    this.clearSubT.setText(SEASONS[this.diff.season].name + '  ' + this.diff.stage + '/10\nSCORE  ' + this.score + '\n' + banked + ' acorns banked');
    this.nextT.setText(allDone ? 'ALL TRAILS' : (seasonDone ? 'SEASONS' : 'NEXT TRAIL'));
    this.showClear(true); this.newBestT.setVisible(nb).setY(700);
    this.hintT.setVisible(false); this.phaseT.setVisible(false);
  }

  burst(x, y, col, f) {
    const a = Math.random() * Math.PI * 2, v = (150 + Math.random() * 350) * f;
    this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: 0.5 + Math.random() * 0.4, col, r: 3 + Math.random() * 5 });
  }

  seedWeather(n) {
    this.weather = [];
    for (let i = 0; i < n; i++) this.weather.push(this.makeW());
  }
  makeW() {
    return { x: Math.random() * W, y: Math.random() * H, z: Math.random(), sp: 40 + Math.random() * 90, rot: Math.random() * 6, rs: (Math.random() - 0.5) * 3, sc: 0.3 + Math.random() * 0.7 };
  }
  updateWeather(dt, spd) {
    const kind = SEASONS[this.seasonIndex()].weather;
    const wind = (this.px || 0) * 20 + Math.sin(this.t) * 10;
    for (const w of this.weather) {
      const fall = kind === 'snow' ? w.sp * 0.55 : w.sp;
      w.y += fall * dt * (0.7 + spd / 80);
      w.x += (wind + (kind === 'petal' ? Math.sin(this.t * 2 + w.rot) * 30 : 16)) * dt;
      w.rot += w.rs * dt;
      if (w.y > H + 30 || w.x < -40 || w.x > W + 40) {
        w.y = -20; w.x = Math.random() * W; w.z = Math.random();
      }
    }
  }

  playerKey() {
    const sliding = this.slideT > 0 && this.jumpH <= 0.01;
    const jumping = this.jumpH > 20;
    const costume = this.save.equipped || 'classic';
    const frame = (Math.floor(this.t * 10) % 2 === 0) ? 1 : 2;
    if (this.phase === FROST) {
      if (sliding) return 'tavi-frost-slide';
      if (jumping) return 'tavi-frost-jump';
      const k = 'tavi-frost-run' + frame;
      return this.textures.exists(k) ? k : 'tavi-frost-run1';
    }
    if (costume !== 'classic') {
      if (sliding && this.textures.exists('tavi-costume-' + costume + '-slide')) return 'tavi-costume-' + costume + '-slide';
      if (jumping && this.textures.exists('tavi-costume-' + costume + '-jump')) return 'tavi-costume-' + costume + '-jump';
      if (this.textures.exists('tavi-costume-' + costume)) return 'tavi-costume-' + costume;
    }
    if (sliding) return 'tavi-ember-slide';
    if (jumping) return 'tavi-ember-jump';
    return frame === 1 ? 'tavi-ember-run1' : 'tavi-ember-run2';
  }

  draw() {
    this.fitBackdrop();
    this.drawRoad();
    const g = this.g; g.clear();

    // lane dashes and edges
    const acc = SEASONS[this.seasonIndex()].accent;
    for (const ln of [-0.5, 0.5]) {
      for (let z = SPAWNZ - (this.dist % 16); z > -10; z -= 16) {
        const a = proj(ln, z), b = proj(ln, z - 7);
        g.lineStyle(Math.max(1.2, 7 * b.s), 0xffffff, 0.32 * Math.min(1, a.s * 3));
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    for (const side of [-1.62, 1.62]) {
      const a = proj(side, SPAWNZ + 10), b = proj(side, -8);
      g.lineStyle(10, acc, 0.18); g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(3, acc, 0.7); g.lineBetween(a.x, a.y, b.x, b.y);
    }

    // finish line
    if (this.state === 'play' && !this.endless && this.diff.goal - this.dist < 80 && this.diff.goal - this.dist > 0) {
      const z = this.diff.goal - this.dist;
      const a = proj(-1.55, z), b = proj(1.55, z);
      g.lineStyle(10 * a.s, 0x7CF7A0, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
    }

    // objects far-to-near
    const list = this.objs.filter(o => !o.dead).sort((a, b) => b.z - a.z);
    let playerDrawn = false;
    for (const o of list) {
      if (!playerDrawn && o.z < 0) { this.placePlayer(); playerDrawn = true; }
      this.placeObj(o);
    }
    if (!playerDrawn) this.placePlayer();
    // hide unused pooled sprites
    const used = new Set(list.map(o => o.spr).filter(Boolean));
    for (const s of this.sprPool) if (s.active && !used.has(s) && s !== this.playerSpr) { /* kept if attached */ }

    const fx = this.fxG; fx.clear();
    // weather
    this.drawWeather(fx);
    for (const p of this.particles) { fx.fillStyle(p.col, Math.min(1, p.life * 2)); fx.fillCircle(p.x, p.y, p.r); }
    if (this.flash > 0) { fx.fillStyle(0xffffff, this.flash * 0.55); fx.fillRect(-40, -40, W + 80, H + 80); }
    if (this.state === 'play') {
      if (this.shields > 0 || this.invuln > 0) {
        const x = VPX + (this.px - CAMX) * LW, y = PY - 90 - this.jumpH;
        fx.lineStyle(4, this.invuln > 0 ? 0xffffff : 0x7ad7ff, 0.55 + 0.35 * Math.sin(this.t * 8));
        fx.strokeEllipse(x, y, 160, 200);
      }
      fx.fillStyle(0x000000, 0.4); fx.fillRoundedRect(VPX - 130, H - 100, 260, 60, 30);
      fx.lineStyle(3, PHASE_COL[this.phase], 1); fx.strokeRoundedRect(VPX - 130, H - 100, 260, 60, 30);
      if (!this.endless) {
        const p = Math.max(0, Math.min(1, this.dist / this.diff.goal));
        fx.fillStyle(0x000000, 0.4); fx.fillRoundedRect(40, 96, W - 80, 14, 7);
        fx.fillStyle(0x7CF7A0, 1); fx.fillRoundedRect(40, 96, (W - 80) * p, 14, 7);
      }
    }
    if (this.state === 'home' || this.state === 'shop' || this.state === 'map' || this.state === 'over' || this.state === 'clear') {
      const a = (this.state === 'over' || this.state === 'clear') ? Math.min(0.62, 0.38 + this.deadT * 0.5) : (this.state === 'shop' || this.state === 'map' ? 0.42 : 0.16);
      fx.fillStyle(0x0b1208, a);
      fx.fillRect(-40, -40, W + 80, H + 80);
    }
    if ((this.state === 'over' || this.state === 'clear') && this.deadT > 0.2) {
      const ug = this.uiG;
      ug.fillStyle(0xffc14d, 0.95);
      ug.fillRoundedRect(VPX - 200, H - 258, 400, 76, 38);
      ug.fillStyle(0x2d5a27, 0.95);
      ug.fillRoundedRect(VPX - 120, H - 165, 240, 52, 26);
      ug.fillStyle(0x1a140c, 0.7);
      ug.fillRoundedRect(VPX - 90, H - 100, 180, 44, 22);
      const gy = this.state === 'clear' ? this.nextT : this.retryT;
      gy.setColor('#1a140c').setStroke('#000000', 0).setDepth(12);
      this.toMapT.setColor('#ffffff').setDepth(12);
      this.toHomeT.setColor('#ffffff').setDepth(12);
    }
  }

  drawRoad() {
    const ctx = this.roadCtx;
    ctx.clearRect(0, 0, W, H);
    const img = this.groundImgs[this.seasonIndex()];
    if (!img) { this.roadTex.refresh(); return; }
    const tw = img.width, th = img.height;
    const off = this.dist * 0.55;
    const yStart = Math.max(0, HY - 4);
    for (let y = yStart; y < H; y++) {
      const rel = (y - HY) / (PY - HY);
      if (rel <= 0.002) continue;
      const s = rel;
      const z = D / s - D;
      const shHalf = 2.2 * LW * s;
      const rdHalf = 1.62 * LW * s;
      let ty = (off + z * 8.8) % th;
      if (ty < 0) ty += th;
      const sy = Math.min(th - 1, ty | 0);
      const fade = Math.min(1, rel * 2.8);
      const mid = VPX - CAMX * LW * s;
      ctx.globalAlpha = fade * 0.8;
      try { ctx.drawImage(img, 0, sy, tw, 1, mid - shHalf, y, shHalf * 2, 1.5); } catch (e) {}
      ctx.globalAlpha = fade;
      try { ctx.drawImage(img, 0, sy, tw, 1, mid - rdHalf, y, rdHalf * 2, 1.5); } catch (e) {}
    }
    ctx.globalAlpha = 1;
    const grd = ctx.createLinearGradient(0, HY - 8, 0, HY + 110);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, HY + 110);
    ctx.globalCompositeOperation = 'source-over';
    this.roadTex.refresh();
  }

  placePlayer() {
    const x = VPX + (this.px - CAMX) * LW, ground = PY, j = this.jumpH;
    const sliding = this.slideT > 0 && j <= 0.01;
    const key = this.playerKey();
    if (this.playerSpr.texture.key !== key && this.textures.exists(key)) this.playerSpr.setTexture(key);
    const bob = (j > 0 || sliding) ? 0 : Math.abs(Math.sin(this.t * 16)) * 8;
    const ratio = this.playerSpr.width / Math.max(1, this.playerSpr.height);
    if (this.state === 'home') {
      this.playerSpr.setVisible(true);
      this.playerSpr.setRotation(0);
      this.playerSpr.setPosition(W - 88, 168);
      this.playerSpr.setDisplaySize(118 * ratio, 118);
      this.playerSpr.setAlpha(1);
    } else if (this.state === 'play') {
      this.playerSpr.setVisible(true);
      this.playerSpr.setPosition(x, ground - j - bob);
      this.playerSpr.setRotation((this.px - CAMX) * 0.12);
      const h = sliding ? 200 : 340;
      this.playerSpr.setDisplaySize(h * ratio, h);
      this.playerSpr.setAlpha(this.invuln > 0 ? (0.5 + 0.5 * Math.sin(this.t * 20)) : 1);
    } else {
      this.playerSpr.setVisible(false);
      this.playerSpr.setRotation(0);
    }
    this.playerSpr.setDepth(15);
    if (this.state === 'play' || this.state === 'home') {
      const shx = this.state === 'home' ? W - 88 : x;
      const shy = this.state === 'home' ? 168 + 8 : ground + 8;
      const sh = this.g;
      sh.fillStyle(0x000000, this.state === 'home' ? 0.18 : 0.36 * Math.max(0.25, 1 - j / 300));
      sh.fillEllipse(shx, shy, this.state === 'home' ? 50 : 150 * Math.max(0.5, 1 - j / 400), 24);
    }
  }

  placeObj(o) {
    if (this.state !== 'play') {
      if (o.spr) o.spr.setVisible(false);
      if (o.sprs) o.sprs.forEach(s => s.setVisible(false));
      return;
    }
    let key = 'coin-acorn';
    if (o.type === 'coin') key = 'coin-acorn';
    else if (o.visual === 'fire') key = 'wall-fire';
    else if (o.visual === 'ice') key = 'wall-ice';
    else if (o.visual) key = 'obs-' + o.visual;
    else if (o.type === 'high') key = 'obs-branch';
    else if (o.type === 'wall') key = 'obs-stump';
    else if (o.type === 'low') key = 'obs-log';
    if (!o.spr || !o.spr.active) o.spr = this.getSpr(key);
    else if (o.spr.texture.key !== key && this.textures.exists(key)) o.spr.setTexture(key);
    const fade = Math.min(1, (SPAWNZ + 5 - o.z) / 25);
    const s = Math.max(0.04, proj(o.lane || 0, o.z).s);
    o.spr.setAlpha(fade);
    o.spr.setDepth(10 + (20 - o.z) * 0.05);
    if (o.type === 'coin') {
      const p = proj(o.lane, o.z, (o.h || 0) + 50);
      const spin = Math.max(0.2, Math.abs(Math.cos(this.t * 5 + o.z * 0.2)));
      const sz = 56 * p.s;
      o.spr.setPosition(p.x, p.y);
      o.spr.setDisplaySize(sz * spin, sz);
      o.spr.setOrigin(0.5, 0.5);
      o.spr.setTint(0xffffff);
      return;
    }
    const b = proj(o.lane || 0, o.z);
    if (o.type === 'gate' || o.type === 'pwall') {
      const solid = o.phase !== this.phase;
      const h = 300 * s;
      const tintOn = !solid;
      const placeWall = (spr, lane, width) => {
        const p = proj(lane, o.z);
        spr.setOrigin(0.5, 1);
        spr.setPosition(p.x, p.y);
        spr.setDisplaySize(width, h);
        spr.setAlpha(fade * (solid ? 1 : 0.38));
        spr.setDepth(10 + (20 - o.z) * 0.05);
        spr.setVisible(true).setActive(true);
        if (tintOn) spr.setTint(0xccffff); else spr.clearTint();
      };
      if (o.type === 'gate') {
        if (o.spr) { o.spr.setVisible(false).setActive(false); o.spr = null; }
        if (!o.sprs || o.sprs.length < 3) o.sprs = [this.getSpr(key), this.getSpr(key), this.getSpr(key)];
        const width = Math.max(20, (proj(0.42, o.z).x - proj(-0.42, o.z).x));
        for (let i = 0; i < 3; i++) {
          if (o.sprs[i].texture.key !== key && this.textures.exists(key)) o.sprs[i].setTexture(key);
          placeWall(o.sprs[i], i - 1, width);
        }
      } else {
        const width = Math.max(20, (proj((o.lane || 0) + 0.42, o.z).x - proj((o.lane || 0) - 0.42, o.z).x));
        placeWall(o.spr, o.lane || 0, width);
      }
      return;
    }
    if (o.type === 'high') {
      const p = proj(o.lane, o.z, 0);
      o.spr.setOrigin(0.5, 1);
      o.spr.setPosition(p.x, p.y - 90 * s);
      o.spr.setDisplaySize(200 * s, 90 * s);
      return;
    }
    // low or wall (stump/rock) sitting on the ground
    const p = proj(o.lane, o.z);
    o.spr.setOrigin(0.5, 0.92);
    o.spr.setPosition(p.x, p.y);
    if (o.type === 'low') {
      const isSnow = o.visual === 'snowbank';
      const isFence = o.visual === 'fence';
      const bw = (isSnow ? 200 : isFence ? 190 : 175) * s;
      const bh = (isSnow ? 80 : isFence ? 95 : 70) * s;
      o.spr.setDisplaySize(bw, bh);
    } else {
      const isStump = o.visual === 'stump';
      o.spr.setDisplaySize((isStump ? 160 : 170) * s, (isStump ? 230 : 180) * s);
    }
  }

  drawWeather(fx) {
    const kind = SEASONS[this.seasonIndex()].weather;
    if (kind === 'snow' || kind === 'dust') {
      if (this.wSprs) this.wSprs.forEach(s => s.setVisible(false));
      for (const w of this.weather) {
        if (kind === 'snow') { fx.fillStyle(0xffffff, 0.35 + w.sc * 0.5); fx.fillCircle(w.x, w.y, 2 + w.sc * 3.2); }
        else { fx.fillStyle(0xffe6a0, 0.18 + w.sc * 0.2); fx.fillCircle(w.x, w.y, 1.2 + w.sc * 1.8); }
      }
      return;
    }
    // petals / leaves as tiny rotated diamonds if images aren't blitted; use images via a couple of pooled...
    // Keep it cheap: draw tinted ellipses / leaf diamonds, plus occasional image stamps through graphics isn't possible.
    // Use the particle textures via a small rotating image pool.
    if (!this.wSprs) {
      this.wSprs = [];
      for (let i = 0; i < 40; i++) {
        const s = this.add.image(0, 0, kind === 'leaf' ? 'part-leaf' : 'part-petal').setDepth(16).setOrigin(0.5);
        this.wSprs.push(s);
      }
    }
    const want = kind === 'leaf' ? 'part-leaf' : 'part-petal';
    for (let i = 0; i < this.wSprs.length; i++) {
      const s = this.wSprs[i], w = this.weather[i];
      if (!w) { s.setVisible(false); continue; }
      if (s.texture.key !== want) s.setTexture(want);
      s.setVisible(true).setPosition(w.x, w.y).setRotation(w.rot).setScale(0.12 * w.sc, 0.12 * w.sc).setAlpha(0.85);
    }
  }
}

window.addEventListener('load', () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1a2a14',
    width: W, height: H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 3 },
    scene: [BootScene, RunScene]
  });
  window.__game = game;
  document.addEventListener('gesturestart', e => e.preventDefault());
});
})();
