// Comet Courier — an original endless runner by Grok Bot for Joseph.
// All art is drawn procedurally with Phaser Graphics. No external assets.
(() => {
'use strict';
const W = 720;
const H = Math.round(Math.min(Math.max(W * (window.innerHeight / Math.max(window.innerWidth, 1)), 1280), 1700));
const VPX = W / 2, HY = Math.round(H * 0.34), PY = H - 200, LW = 200, D = 22, SPAWNZ = 170;
const BEST_KEY = 'cometCourierBest';
const SOLAR = 0, LUNAR = 1;
const PAL = [
  { skyTop: 0x2a0b3d, skyBot: 0xff7a59, road: 0x2b1640, edge: 0xffb347, accent: 0xff5e7e, name: 'SOLAR' },
  { skyTop: 0x030b2a, skyBot: 0x1f5f8b, road: 0x0e1c38, edge: 0x5ef2ff, accent: 0x9b7bff, name: 'LUNAR' }
];
const PHASE_COL = [0xffa53d, 0x4fe3ff];

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  const r = lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t), g = lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t), b = lerp(c1 & 255, c2 & 255, t);
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}
function proj(lane, z, h = 0) {
  const s = D / (D + Math.max(z, -D + 1));
  return { x: VPX + lane * LW * s, y: HY + (PY - HY) * s - h * s, s };
}
function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { return 0; } }
function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }

// ---------- tiny synth (created on first user gesture: iOS-safe) ----------
const Sfx = {
  ctx: null,
  unlock() {
    if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
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
  phase(p) { p ? this.tone(900, 300, 0.25, 'sine', 0.1) : this.tone(300, 900, 0.25, 'sine', 0.1); },
  hit() { this.tone(220, 40, 0.5, 'sawtooth', 0.15); }
};

class RunScene extends Phaser.Scene {
  constructor() { super('run'); }

  create() {
    this.bgG = this.add.graphics();
    this.g = this.add.graphics();
    this.fxG = this.add.graphics();
    this.stars = [];
    for (let i = 0; i < 120; i++) this.stars.push({ x: Math.random() * W, y: Math.random() * HY * 1.05, r: Math.random() * 2.2 + 0.4, tw: Math.random() * 6 });
    this.particles = [];
    this.best = loadBest();
    this.t = 0;
    this.makeUI();
    this.resetRun();
    this.state = 'title';
    this.showTitle(true);
    this.setupInput();
  }

  txt(x, y, s, size, color = '#ffffff', extra = {}) {
    return this.add.text(x, y, s, Object.assign({ fontFamily: '"Trebuchet MS", "Avenir Next", Arial, sans-serif', fontSize: size + 'px', color, fontStyle: 'bold', align: 'center', stroke: '#140826', strokeThickness: Math.max(4, size / 7) }, extra)).setOrigin(0.5).setDepth(10);
  }

  makeUI() {
    this.scoreT = this.txt(30, 60, '0', 52).setOrigin(0, 0.5);
    this.coinT = this.txt(W - 30, 60, '0', 44, '#ffe066').setOrigin(1, 0.5);
    this.phaseT = this.txt(VPX, H - 70, 'SOLAR', 34);
    this.hintT = this.txt(VPX, H - 30, 'tap to phase-shift', 22, '#ffffffaa', { strokeThickness: 3 });
    this.toastT = this.txt(VPX, 300, '', 40, '#ffffff').setAlpha(0);

    this.titleT = this.txt(VPX, 200, 'COMET\nCOURIER', 104, '#ffd166', { strokeThickness: 14, lineSpacing: -18 });
    this.subT = this.txt(VPX, HY - 50, 'Deliver the starmail. Dodge the debris.', 28, '#ffffff');
    this.helpT = this.txt(VPX, HY + 250, 'Swipe ← → to switch lanes\nSwipe ↑ jump  ·  Swipe ↓ slide\nTAP to Phase-Shift: SOLAR ⇄ LUNAR\nwalls of your phase are solid,\nthe other phase you ghost through', 27, '#e8ddff', { lineSpacing: 8 });
    this.startT = this.txt(VPX, H - 120, 'TAP TO START', 52, '#ffffff');
    this.bestT = this.txt(VPX, H - 55, '', 28, '#ffe066');

    this.overT = this.txt(VPX, 330, 'PARCEL\nLOST!', 96, '#ff6b8b', { strokeThickness: 14, lineSpacing: -14 });
    this.finalT = this.txt(VPX, 560, '', 44, '#ffffff', { lineSpacing: 12 });
    this.newBestT = this.txt(VPX, 720, 'NEW BEST!', 54, '#ffe066');
    this.retryT = this.txt(VPX, H - 150, 'TAP TO RUN AGAIN', 48, '#ffffff');
    this.showOver(false);
  }

  showTitle(v) {
    [this.titleT, this.subT, this.helpT, this.startT, this.bestT].forEach(o => o.setVisible(v));
    [this.scoreT, this.coinT, this.phaseT, this.hintT].forEach(o => o.setVisible(!v));
    this.bestT.setText(this.best ? 'BEST  ' + this.best : '');
  }
  showOver(v) { [this.overT, this.finalT, this.newBestT, this.retryT].forEach(o => o.setVisible(v)); }

  resetRun() {
    this.objs = [];
    this.lane = 0; this.px = 0;
    this.jumpH = 0; this.jumpV = 0; this.slideT = 0;
    this.phase = SOLAR; this.phaseMix = 0; this.phaseCd = 0;
    this.speed = 46; this.dist = 0; this.nextRow = 40; this.elapsed = 0;
    this.coins = 0; this.score = 0; this.rowCount = 0; this.lastGateRow = -10;
    this.shake = 0; this.flash = 0; this.deadT = 0;
  }

  // ---------------- input ----------------
  setupInput() {
    this.input.addPointer(2);
    this.input.on('pointerdown', p => { Sfx.unlock(); this.sw = { x: p.x, y: p.y, t: performance.now(), done: false }; });
    this.input.on('pointermove', p => {
      if (!this.sw || this.sw.done || !p.isDown) return;
      const dx = p.x - this.sw.x, dy = p.y - this.sw.y;
      if (Math.hypot(dx, dy) > 50) { this.sw.done = true; this.swipe(dx, dy); }
    });
    this.input.on('pointerup', p => {
      if (!this.sw) return;
      const dx = p.x - this.sw.x, dy = p.y - this.sw.y;
      if (!this.sw.done) {
        if (Math.hypot(dx, dy) > 30) this.swipe(dx, dy); else this.tap();
      }
      this.sw = null;
    });
    const kb = this.input.keyboard;
    kb.on('keydown', e => {
      Sfx.unlock();
      const k = e.code;
      if (this.state !== 'play') { if (['Space', 'Enter', 'ArrowUp', 'KeyW'].includes(k)) this.tap(); return; }
      if (k === 'ArrowLeft' || k === 'KeyA') this.move(-1);
      else if (k === 'ArrowRight' || k === 'KeyD') this.move(1);
      else if (k === 'ArrowUp' || k === 'KeyW') this.jump();
      else if (k === 'ArrowDown' || k === 'KeyS') this.slide();
      else if (k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight' || k === 'KeyE') this.togglePhase();
    });
  }
  swipe(dx, dy) {
    if (this.state !== 'play') return;
    if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1);
    else if (dy < 0) this.jump(); else this.slide();
  }
  tap() {
    if (this.state === 'title') return this.startRun();
    if (this.state === 'over') { if (this.deadT > 0.7) this.startRun(); return; }
    this.togglePhase();
  }
  move(d) { const n = Phaser.Math.Clamp(this.lane + d, -1, 1); if (n !== this.lane) { this.lane = n; Sfx.lane(); } }
  jump() { if (this.jumpH <= 0.01) { this.jumpV = 980; this.slideT = 0; Sfx.jump(); } }
  slide() { if (this.jumpH > 0) this.jumpV = -1400; this.slideT = 0.62; Sfx.slide(); }
  togglePhase() {
    if (this.phaseCd > 0) return;
    this.phase ^= 1; this.phaseCd = 0.18; Sfx.phase(this.phase);
    for (let i = 0; i < 18; i++) this.burst(VPX + this.px * LW, PY - 60, PHASE_COL[this.phase], 1);
  }

  startRun() {
    this.resetRun();
    this.state = 'play';
    this.showTitle(false); this.showOver(false);
    this.toast('Shift phases to slip through walls!', 2.2);
  }
  toast(s, dur = 1.4) { this.toastT.setText(s).setAlpha(1); this.toastDur = dur; }

  // ---------------- spawning ----------------
  spawnRow(z) {
    this.rowCount++;
    const r = Math.random(), e = this.elapsed;
    const lanes = [-1, 0, 1];
    if (e > 6 && r < 0.2 && this.rowCount - this.lastGateRow > 3) {
      // full-width phase gate — the twist
      this.lastGateRow = this.rowCount;
      const ph = Math.random() < 0.7 ? this.phase : this.phase ^ 1;
      this.objs.push({ type: 'gate', lane: 0, z, phase: ph });
      for (let i = 1; i <= 3; i++) this.objs.push({ type: 'coin', lane: this.lane, z: z + i * 6 });
      return;
    }
    if (r > 0.88) { // breather row: coin arc
      const l = lanes[(Math.random() * 3) | 0];
      for (let i = 0; i < 5; i++) this.objs.push({ type: 'coin', lane: l, z: z + i * 5, h: Math.sin(i / 4 * Math.PI) * 120 });
      return;
    }
    const n = Math.random() < Math.min(0.25 + e * 0.012, 0.65) ? 2 : 1;
    Phaser.Utils.Array.Shuffle(lanes);
    for (let i = 0; i < n; i++) {
      const q = Math.random();
      let type = q < 0.4 ? 'wall' : q < 0.7 ? 'low' : 'high';
      const o = { type, lane: lanes[i], z };
      if (type === 'wall' && e > 14 && Math.random() < 0.4) { o.type = 'pwall'; o.phase = Math.random() < 0.5 ? 0 : 1; }
      this.objs.push(o);
    }
    if (Math.random() < 0.6) { const fl = lanes[n]; for (let i = 0; i < 3; i++) this.objs.push({ type: 'coin', lane: fl, z: z + i * 6 }); }
  }

  // ---------------- update ----------------
  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.t += dt;
    if (this.toastDur > 0) { this.toastDur -= dt; if (this.toastDur < 0.4) this.toastT.setAlpha(Math.max(this.toastDur / 0.4, 0)); }

    let spd = 0;
    if (this.state === 'play') {
      this.elapsed += dt;
      this.speed = Math.min(46 + this.elapsed * 1.25, 125);
      spd = this.speed;
      this.phaseCd -= dt;
      // speed-up callouts
      const lvl = Math.floor(this.elapsed / 20);
      if (lvl > (this.lvl || 0)) { this.lvl = lvl; this.toast('SPEED UP!  x' + (1 + lvl * 0.5).toFixed(1)); }
    } else if (this.state === 'title') spd = 22;
    else { this.deadT += dt; spd = 0; }
    if (this.state !== 'play') this.lvl = 0;

    this.dist += spd * dt;
    this.phaseMix = lerp(this.phaseMix, this.phase, Math.min(dt * 8, 1));
    this.px = lerp(this.px, this.lane, Math.min(dt * 16, 1));
    if (this.jumpH > 0 || this.jumpV > 0) { this.jumpV -= 2700 * dt; this.jumpH = Math.max(0, this.jumpH + this.jumpV * dt); if (this.jumpH === 0) this.jumpV = 0; }
    if (this.slideT > 0) this.slideT -= dt;

    if (this.state === 'play') {
      while (this.dist >= this.nextRow) {
        this.spawnRow(SPAWNZ - (this.dist - this.nextRow));
        const gapT = Math.max(0.52, 1.05 - this.elapsed * 0.006);
        this.nextRow += Math.max(this.speed * gapT, 30);
      }
      this.score = Math.floor(this.dist) + this.coins * 25;
      const pl = Math.round(this.px);
      for (const o of this.objs) {
        const pz = o.z; o.z -= spd * dt;
        if (o.dead) continue;
        if (o.type === 'coin') {
          if (pz > 1.5 && o.z <= 1.5 && o.lane === pl && Math.abs((o.h || 0) - this.jumpH) < 110) {
            o.dead = true; this.coins++; Sfx.coin();
            const p = proj(o.lane, 0, (o.h || 0) + 40); for (let i = 0; i < 8; i++) this.burst(p.x, p.y, 0xffe066, 0.7);
          }
        } else if (pz > 0 && o.z <= 0) {
          if (this.collides(o, pl)) { this.die(o); break; }
        }
      }
      this.score = Math.floor(this.dist) + this.coins * 25;
      this.scoreT.setText(String(this.score));
      this.coinT.setText('★ ' + this.coins);
      this.phaseT.setText((this.phase ? '☾ ' : '☀ ') + PAL[this.phase].name).setColor(this.phase ? '#7ff0ff' : '#ffc06b');
    } else {
      for (const o of this.objs) o.z -= spd * dt;
    }
    this.objs = this.objs.filter(o => o.z > -12 && !(o.dead && o.type === 'coin'));

    // particles
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    this.shake = Math.max(0, this.shake - dt * 2); this.flash = Math.max(0, this.flash - dt * 2.5);
    this.cameras.main.setScroll((Math.random() - 0.5) * 30 * this.shake, (Math.random() - 0.5) * 30 * this.shake);

    if (this.state === 'title') { this.startT.setAlpha(0.55 + 0.45 * Math.sin(this.t * 4)); this.titleT.y = 200 + Math.sin(this.t * 2) * 6; }
    if (this.state === 'over') this.retryT.setAlpha(this.deadT > 0.7 ? 0.55 + 0.45 * Math.sin(this.t * 4) : 0);

    this.draw();
  }

  collides(o, pl) {
    if (o.type === 'gate') return o.phase === this.phase;
    if (o.lane !== pl) return false;
    if (o.type === 'wall') return true;
    if (o.type === 'pwall') return o.phase === this.phase;
    if (o.type === 'low') return this.jumpH < 55;
    if (o.type === 'high') return this.slideT <= 0;
    return false;
  }

  die() {
    this.state = 'over'; this.deadT = 0; this.shake = 1; this.flash = 1;
    Sfx.hit();
    for (let i = 0; i < 30; i++) this.burst(VPX + this.px * LW, PY - 60, i % 2 ? 0xff8a3d : 0xffffff, 1.4);
    const nb = this.score > this.best;
    if (nb) { this.best = this.score; saveBest(this.best); }
    this.finalT.setText('SCORE  ' + this.score + '\n★ ' + this.coins + ' stamps\nBEST  ' + this.best);
    this.showOver(true); this.newBestT.setVisible(nb);
    this.hintT.setVisible(false); this.phaseT.setVisible(false);
    this.scoreT.setText(String(this.score));
  }

  burst(x, y, col, f) {
    const a = Math.random() * Math.PI * 2, v = (150 + Math.random() * 350) * f;
    this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: 0.5 + Math.random() * 0.4, col, r: 3 + Math.random() * 5 });
  }

  // ---------------- drawing ----------------
  draw() {
    const m = this.phaseMix, A = PAL[0], B = PAL[1];
    const bg = this.bgG, g = this.g;
    bg.clear(); g.clear();
    const top = lerpColor(A.skyTop, B.skyTop, m), bot = lerpColor(A.skyBot, B.skyBot, m);
    bg.fillGradientStyle(top, top, bot, bot, 1); bg.fillRect(-40, -40, W + 80, HY + 60);
    // space floor below horizon
    bg.fillStyle(lerpColor(0x1a0a2e, 0x030817, m), 1); bg.fillRect(-40, HY + 18, W + 80, H);
    // stars
    for (const s of this.stars) { bg.fillStyle(0xffffff, (0.35 + 0.65 * Math.abs(Math.sin(this.t * 1.5 + s.tw))) * (0.35 + m * 0.65)); bg.fillCircle(s.x, s.y, s.r); }
    // sun / moon body that morphs with phase
    const cx = 540, cy = HY - 180;
    bg.fillStyle(lerpColor(0xffd166, 0xe9f6ff, m), 0.18); bg.fillCircle(cx, cy, 140);
    bg.fillStyle(lerpColor(0xffb347, 0xdff3ff, m), 1); bg.fillCircle(cx, cy, 95);
    bg.fillStyle(top, m); bg.fillCircle(cx + 45, cy - 25, 88 * m + 0.01);
    // ringed planet
    bg.fillStyle(lerpColor(0x7a3cff, 0x2d6cdf, m), 1); bg.fillCircle(150, HY - 110, 55);
    bg.lineStyle(7, lerpColor(0xffc6e0, 0x9ef3ff, m), 0.9); bg.strokeEllipse(150, HY - 110, 190, 40);
    bg.fillStyle(lerpColor(0x7a3cff, 0x2d6cdf, m), 1); bg.fillRect(95, HY - 145, 110, 32); bg.fillCircle(150, HY - 130, 50);
    // floating asteroid silhouettes near horizon
    bg.fillStyle(lerpColor(0x3d1a55, 0x0b1a3a, m), 1);
    for (let i = 0; i < 7; i++) { const x = ((i * 137 + this.dist * 0.6) % (W + 200)) - 100; bg.fillEllipse(x, HY + 10 - (i % 3) * 8, 90 + (i % 3) * 40, 26); }

    // road (sky-highway made of light)
    const road = lerpColor(A.road, B.road, m), edge = lerpColor(A.edge, B.edge, m), acc = lerpColor(A.accent, B.accent, m);
    const f1 = proj(-1.5, SPAWNZ + 20), f2 = proj(1.5, SPAWNZ + 20), n1 = proj(-1.5, -10), n2 = proj(1.5, -10);
    g.fillStyle(road, 1); g.fillPoints([f1, f2, n2, n1], true);
    // cross tiles for speed sense
    const off = this.dist % 12;
    for (let z = SPAWNZ + 12 - off; z > -10; z -= 12) {
      const a = proj(-1.5, z), b = proj(1.5, z);
      g.lineStyle(Math.max(1, 3 * a.s), acc, 0.25 * Math.min(1, a.s * 3)); g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // lane dashes
    for (const ln of [-0.5, 0.5]) for (let z = SPAWNZ - (this.dist % 16); z > -10; z -= 16) {
      const a = proj(ln, z), b = proj(ln, z - 7);
      g.lineStyle(Math.max(1.5, 8 * b.s), 0xffffff, 0.35 * Math.min(1, a.s * 3)); g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // glowing rails
    for (const side of [-1.5, 1.5]) {
      const a = proj(side, SPAWNZ + 20), b = proj(side, -10);
      g.lineStyle(18, edge, 0.25); g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(6, edge, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    }

    // objects far to near, player interleaved
    const list = this.objs.filter(o => !o.dead).sort((a, b) => b.z - a.z);
    let playerDrawn = false;
    for (const o of list) {
      if (!playerDrawn && o.z < 0) { this.drawPlayer(g); playerDrawn = true; }
      this.drawObj(g, o);
    }
    if (!playerDrawn) this.drawPlayer(g);

    // particles + flash
    const fx = this.fxG; fx.clear();
    for (const p of this.particles) { fx.fillStyle(p.col, Math.min(1, p.life * 2)); fx.fillCircle(p.x, p.y, p.r); }
    if (this.flash > 0) { fx.fillStyle(0xffffff, this.flash * 0.6); fx.fillRect(-40, -40, W + 80, H + 80); }
    // phase pill
    if (this.state === 'play') {
      fx.fillStyle(0x000000, 0.35); fx.fillRoundedRect(VPX - 130, H - 100, 260, 60, 30);
      fx.lineStyle(3, PHASE_COL[this.phase], 1); fx.strokeRoundedRect(VPX - 130, H - 100, 260, 60, 30);
    }
    if (this.state === 'title') { fx.fillStyle(0x0b0620, 0.55); fx.fillRoundedRect(40, HY + 120, W - 80, 260, 28); }
    if (this.state === 'over' || this.state === 'title') { fx.fillStyle(0x0b0620, this.state === 'over' ? Math.min(0.6, this.deadT) : 0.35); fx.fillRect(-40, -40, W + 80, H + 80); }
  }

  drawObj(g, o) {
    const fade = Math.min(1, (SPAWNZ + 5 - o.z) / 25);
    if (o.type === 'coin') {
      const p = proj(o.lane, o.z, (o.h || 0) + 50), r = 26 * p.s, sx = Math.abs(Math.cos(this.t * 5 + o.z * 0.2));
      g.fillStyle(0xffe066, 0.25 * fade); g.fillCircle(p.x, p.y, r * 1.6);
      this.star(g, p.x, p.y, r, r * 0.45, Math.max(sx, 0.15), 0xffd23f, fade);
      this.star(g, p.x, p.y, r * 0.55, r * 0.25, Math.max(sx, 0.15), 0xfff5c0, fade);
      return;
    }
    const b = proj(o.lane, o.z), s = b.s, hw = LW * 0.42 * s;
    if (o.type === 'wall') { // drifting space rock
      const h = 210 * s;
      g.fillStyle(0x000000, 0.3 * fade); g.fillEllipse(b.x, b.y, hw * 2.2, 24 * s);
      g.fillStyle(0x6b5a7e, fade);
      g.fillPoints([{ x: b.x - hw, y: b.y }, { x: b.x - hw * 1.05, y: b.y - h * 0.55 }, { x: b.x - hw * 0.6, y: b.y - h }, { x: b.x + hw * 0.5, y: b.y - h * 0.95 }, { x: b.x + hw * 1.05, y: b.y - h * 0.5 }, { x: b.x + hw, y: b.y }], true);
      g.fillStyle(0x8d7aa3, fade); g.fillPoints([{ x: b.x - hw * 0.9, y: b.y - h * 0.55 }, { x: b.x - hw * 0.55, y: b.y - h * 0.95 }, { x: b.x + hw * 0.45, y: b.y - h * 0.9 }, { x: b.x, y: b.y - h * 0.6 }], true);
      g.fillStyle(0x4a3c5c, fade); g.fillCircle(b.x - hw * 0.35, b.y - h * 0.35, 18 * s); g.fillCircle(b.x + hw * 0.45, b.y - h * 0.25, 12 * s); g.fillCircle(b.x + hw * 0.1, b.y - h * 0.7, 10 * s);
    } else if (o.type === 'low') { // energy hurdle: jump
      const h = 70 * s;
      g.fillStyle(0x000000, 0.3 * fade); g.fillEllipse(b.x, b.y, hw * 2.2, 18 * s);
      g.fillStyle(0x3a3a55, fade); g.fillRect(b.x - hw, b.y - h, 10 * s, h); g.fillRect(b.x + hw - 10 * s, b.y - h, 10 * s, h);
      g.fillStyle(0xff4d6d, fade); g.fillRect(b.x - hw, b.y - h, hw * 2, 26 * s);
      g.fillStyle(0xffffff, fade); for (let i = 0; i < 4; i++) g.fillRect(b.x - hw + (i * 2 + 0.5) * hw / 4, b.y - h, hw / 4, 26 * s);
      g.fillStyle(0xff4d6d, 0.25 * fade * (0.6 + 0.4 * Math.sin(this.t * 10))); g.fillRect(b.x - hw, b.y - h + 26 * s, hw * 2, h - 26 * s);
    } else if (o.type === 'high') { // laser bar: slide under
      const y1 = 120 * s, y2 = 230 * s;
      g.fillStyle(0x3a3a55, fade); g.fillRect(b.x - hw, b.y - y2, 12 * s, y2); g.fillRect(b.x + hw - 12 * s, b.y - y2, 12 * s, y2);
      g.fillStyle(0x66ff99, 0.3 * fade); g.fillRect(b.x - hw, b.y - y2, hw * 2, y2 - y1);
      g.lineStyle(10 * s, 0x66ff99, fade); g.lineBetween(b.x - hw, b.y - y1, b.x + hw, b.y - y1); g.lineBetween(b.x - hw, b.y - y2, b.x + hw, b.y - y2);
      g.lineStyle(4 * s, 0xffffff, fade); g.lineBetween(b.x - hw, b.y - y1, b.x + hw, b.y - y1);
    } else if (o.type === 'gate' || o.type === 'pwall') {
      const solid = o.phase === this.phase, col = PHASE_COL[o.phase];
      const L = o.type === 'gate' ? proj(-1.5, o.z) : proj(o.lane - 0.42, o.z), R = o.type === 'gate' ? proj(1.5, o.z) : proj(o.lane + 0.42, o.z);
      const h = 260 * s, x1 = L.x, x2 = R.x, w = x2 - x1;
      if (solid) {
        g.fillStyle(col, 0.82 * fade); g.fillRect(x1, b.y - h, w, h);
        g.fillStyle(0xffffff, 0.18 * fade);
        for (let i = 0; i < 6; i++) { const yy = b.y - h + ((i * h / 6 + this.t * 80 * s) % h); g.fillRect(x1, yy, w, 6 * s); }
        g.lineStyle(6 * s, 0xffffff, fade); g.strokeRect(x1, b.y - h, w, h);
      } else {
        g.lineStyle(4 * s, col, 0.45 * fade);
        for (let x = x1; x < x2; x += 30 * s) g.lineBetween(x, b.y - h, Math.min(x + 15 * s, x2), b.y - h);
        for (let x = x1; x < x2; x += 30 * s) g.lineBetween(x, b.y, Math.min(x + 15 * s, x2), b.y);
        g.lineBetween(x1, b.y - h, x1, b.y); g.lineBetween(x2, b.y - h, x2, b.y);
        g.fillStyle(col, 0.08 * fade); g.fillRect(x1, b.y - h, w, h);
      }
      // phase emblem
      const ex = b.x + (o.type === 'gate' ? 0 : 0), ey = b.y - h * 0.55, er = 30 * s;
      if (o.phase === SOLAR) this.sun(g, ex, ey, er, solid ? 0xffffff : col, solid ? fade : 0.5 * fade);
      else this.moon(g, ex, ey, er, solid ? 0xffffff : col, solid ? fade : 0.5 * fade, solid ? col : lerpColor(PAL[0].road, PAL[1].road, this.phaseMix));
    }
  }

  star(g, x, y, R, r, sx, col, a) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; pts.push({ x: x + Math.cos(ang) * rr * sx, y: y + Math.sin(ang) * rr }); }
    g.fillStyle(col, a); g.fillPoints(pts, true);
  }
  sun(g, x, y, r, col, a) {
    g.fillStyle(col, a); g.fillCircle(x, y, r * 0.6);
    g.lineStyle(Math.max(2, r * 0.15), col, a);
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; g.lineBetween(x + Math.cos(an) * r * 0.8, y + Math.sin(an) * r * 0.8, x + Math.cos(an) * r * 1.15, y + Math.sin(an) * r * 1.15); }
  }
  moon(g, x, y, r, col, a, cut) {
    g.fillStyle(col, a); g.fillCircle(x, y, r);
    g.fillStyle(cut, 1); g.fillCircle(x + r * 0.45, y - r * 0.25, r * 0.85);
  }

  // Nova: a round little comet-fox courier with a starmail satchel
  drawPlayer(g) {
    if (this.state === 'over' && this.deadT > 0.05) { // tumble
    }
    const x = VPX + this.px * LW, ground = PY, j = this.jumpH;
    const sliding = this.slideT > 0 && j <= 0.01;
    const run = this.state === 'play' || this.state === 'title' ? this.t * 16 : 0;
    const col = PHASE_COL[this.phase];
    // shadow
    g.fillStyle(0x000000, 0.35 * Math.max(0.3, 1 - j / 300)); g.fillEllipse(x, ground, 110 * Math.max(0.5, 1 - j / 400), 26);
    // comet trail
    const tilt = (this.lane - this.px) * 0.6;
    for (let i = 0; i < 6; i++) {
      g.fillStyle(col, 0.18 - i * 0.025); g.fillCircle(x - tilt * 60 * i * 0.2, ground - (sliding ? 30 : 60) - j + i * 22, 40 - i * 5);
    }
    if (sliding) {
      const by = ground - 34;
      g.fillStyle(0xff8a3d, 1); g.fillEllipse(x, by, 120, 60);
      g.fillStyle(0xfff1e0, 1); g.fillEllipse(x, by + 10, 70, 30);
      g.fillStyle(0x1b2a4a, 1); g.fillEllipse(x, by - 8, 70, 26);
      g.fillStyle(0x9ef3ff, 1); g.fillEllipse(x - 12, by - 12, 22, 8);
      g.fillStyle(0xff8a3d, 1); g.fillTriangle(x - 50, by - 20, x - 34, by - 50, x - 22, by - 24); g.fillTriangle(x + 50, by - 20, x + 34, by - 50, x + 22, by - 24);
      return;
    }
    const bob = j > 0 ? 0 : Math.abs(Math.sin(run)) * 8;
    const by = ground - 70 - j - bob;
    // legs
    const l1 = Math.sin(run) * 16, l2 = -l1;
    g.fillStyle(0x3b1f4f, 1);
    g.fillRoundedRect(x - 26 + (j > 0 ? -6 : 0), by + 30 + Math.max(0, l1 * 0.6), 18, 34 - Math.max(0, l1 * 0.6), 8);
    g.fillRoundedRect(x + 8 + (j > 0 ? 6 : 0), by + 30 + Math.max(0, l2 * 0.6), 18, 34 - Math.max(0, l2 * 0.6), 8);
    // tail (bushy comet tail)
    g.fillStyle(0xff8a3d, 1); g.fillEllipse(x + 48, by + 22 + Math.sin(run) * 4, 40, 28);
    g.fillStyle(0xfff1e0, 1); g.fillCircle(x + 64, by + 18 + Math.sin(run) * 4, 10);
    // body
    g.fillStyle(0xff8a3d, 1); g.fillCircle(x, by, 50);
    g.fillStyle(0xfff1e0, 1); g.fillEllipse(x, by + 22, 56, 40);
    // ears
    g.fillStyle(0xff8a3d, 1); g.fillTriangle(x - 44, by - 22, x - 34, by - 74, x - 10, by - 44); g.fillTriangle(x + 44, by - 22, x + 34, by - 74, x + 10, by - 44);
    g.fillStyle(0xffd3b0, 1); g.fillTriangle(x - 36, by - 32, x - 32, by - 62, x - 18, by - 42); g.fillTriangle(x + 36, by - 32, x + 32, by - 62, x + 18, by - 42);
    // courier visor (seen from behind: helmet band + glow)
    g.fillStyle(0x1b2a4a, 1); g.fillRoundedRect(x - 46, by - 24, 92, 26, 12);
    g.fillStyle(col, 1); g.fillRoundedRect(x - 40, by - 19, 80, 8, 4);
    // satchel strap + bag
    g.lineStyle(9, 0x2d6cdf, 1); g.lineBetween(x - 36, by - 2, x + 30, by + 40);
    g.fillStyle(0x2d6cdf, 1); g.fillRoundedRect(x + 10, by + 22, 44, 34, 8);
    g.fillStyle(0xffe066, 1); this.star(g, x + 32, by + 39, 10, 4.5, 1, 0xffe066, 1);
    // antenna with star tip
    g.lineStyle(4, 0x1b2a4a, 1); g.lineBetween(x, by - 48, x + 6, by - 92);
    this.star(g, x + 6, by - 96, 12, 5, 1, col, 1);
  }
}

window.addEventListener('load', () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0b0620',
    width: W, height: H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true },
    input: { activePointers: 3 },
    scene: [RunScene]
  });
  window.__game = game;
  document.addEventListener('gesturestart', e => e.preventDefault());
});
})();
