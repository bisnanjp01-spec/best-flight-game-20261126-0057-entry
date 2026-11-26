// Ridge Runner — game loop, states, scoring and missions.
//
// One clear job: own the state machine (title, briefing, flying, paused,
// done, crashed, victory) and wire input, physics, world, sound and
// rendering together. The files it imports do the work; this file decides.

import { BEST_KEY, MISSIONS, SCORE, VIEW_H, VIEW_W } from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Plane } from './plane.js';
import { Particles } from './particles.js';
import { Renderer } from './render.js';

const SCREENS = ['title', 'brief', 'pause', 'over', 'done', 'win'];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.sound = new SoundEngine();
    this.particles = new Particles();
    this.renderer = new Renderer(canvas);
    this.state = 'title';
    this.missionIndex = 0;
    this.score = 0;
    this.missionScore = 0;
    this.totalScore = 0;
    this.best = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
    this.elapsedSec = 0;
    this.t = 0;
    this.toasts = [];
    this.shake = 0;
    this.cameraX = 0;
    this.wind = 0;
    this.landingBonus = 0;
    this.crashReason = '';
    this.last = 0;
    this.loadMission(0);
    this.bindScreens();
    this.applySceneParam();
    window.__ridge = this;
  }

  loadMission(index) {
    this.missionIndex = index;
    this.mission = MISSIONS[index];
    this.world = new World(this.mission);
    this.plane = new Plane(this.mission);
    this.missionScore = 0;
    this.elapsedSec = 0;
    this.toasts = [];
    this.shake = 0;
    this.cameraX = 0;
    this.warnedLowFuel = false;
    this.announcedAllRings = false;
    this.particles = new Particles();
  }

  bindScreens() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => {
        this.sound.ensure();
        this.sound.click();
        fn();
      });
    };
    on('btn-start', () => this.showBriefing());
    on('btn-fly', () => this.startFlying());
    on('btn-resume', () => this.togglePause());
    on('btn-next', () => this.nextMission());
    on('btn-retry', () => this.retryMission());
    on('btn-again', () => this.backToTitle());
    on('btn-win-again', () => this.backToTitle());
    on('btn-quit', () => this.backToTitle());
  }

  // Staging for screenshots and playtests: ?scene=flight|ring|landing
  // starts the real game at a real moment of a mission.
  applySceneParam() {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get('scene');
    if (!scene) return;
    const mission = Math.max(1, Math.min(3, Number(params.get('mission') ?? 1))) - 1;
    this.loadMission(mission);
    this.state = 'flying';
    this.hideScreens();
    if (scene === 'flight') {
      const ring = this.world.rings[1] ?? this.world.rings[0];
      this.plane.x = ring.x - 620;
      this.plane.alt = Math.max(60, this.world.groundY(ring.x) - ring.y);
      this.plane.speed = 185;
      this.plane.throttle = 0.72;
      this.plane.airborne = true;
    } else if (scene === 'ring') {
      const ring = this.world.rings[0];
      this.plane.x = ring.x - 300;
      this.plane.alt = Math.max(60, this.world.groundY(ring.x) - ring.y);
      this.plane.speed = 195;
      this.plane.throttle = 0.75;
      this.plane.airborne = true;
    } else if (scene === 'landing') {
      this.plane.x = this.world.runwayEnd - 950;
      this.plane.alt = 64;
      this.plane.speed = 150;
      this.plane.throttle = 0.32;
      this.plane.airborne = true;
      this.plane.flaps = true;
    }
  }

  showBriefing() {
    this.loadMission(this.missionIndex);
    document.getElementById('brief-name').textContent = `Mission ${this.missionIndex + 1} — ${this.mission.name}`;
    document.getElementById('brief-text').textContent = this.mission.brief;
    document.getElementById('brief-detail').textContent =
      `${this.mission.rings} rings · fuel ${this.mission.fuel} · wind ${Math.round(this.mission.wind * 100)}% · par ${this.mission.parSec}s`;
    this.setState('brief');
  }

  startFlying() {
    this.setState('flying');
    this.addToast(`${this.mission.name} — hold SHIFT to spool up`, '#ffd166');
  }

  togglePause() {
    if (this.state === 'flying') this.setState('paused');
    else if (this.state === 'paused') this.setState('flying');
  }

  retryMission() {
    this.loadMission(this.missionIndex);
    this.setState('flying');
  }

  nextMission() {
    if (this.missionIndex + 1 < MISSIONS.length) {
      this.loadMission(this.missionIndex + 1);
      this.showBriefing();
    } else {
      this.setState('win');
    }
  }

  backToTitle() {
    this.loadMission(0);
    this.totalScore = 0;
    this.setState('title');
  }

  setState(state) {
    this.state = state;
    this.showScreen(state);
  }

  showScreen(state) {
    this.hideScreens();
    const map = { title: 'screen-title', brief: 'screen-brief', paused: 'screen-pause', crashed: 'screen-over', done: 'screen-done', win: 'screen-win' };
    const id = map[state];
    if (id) document.getElementById(id).classList.remove('hidden');
    if (state === 'title') {
      document.getElementById('best-line').textContent = this.best > 0 ? `Best score: ${this.best}` : 'No flights logged yet — make the first one count.';
    }
    if (state === 'crashed') {
      document.getElementById('over-reason').textContent = this.crashReason;
      document.getElementById('over-score').textContent = `Score ${this.totalScore + this.missionScore} · Best ${this.best}`;
    }
    if (state === 'done') {
      document.getElementById('done-score').textContent =
        `Rings ${this.world.ringsDone()}/${this.world.rings.length} · landing +${this.landingBonus} · mission ${this.lastMissionScore} · total ${this.totalScore}`;
    }
    if (state === 'win') {
      document.getElementById('win-score').textContent = `Final score ${this.totalScore} · Best ${this.best}`;
    }
  }

  hideScreens() {
    for (const id of SCREENS) {
      const el = document.getElementById(`screen-${id}`);
      if (el) el.classList.add('hidden');
    }
  }

  addToast(text, color = '#ffffff', life = 2.4) {
    this.toasts.push({ text, color, life });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  saveBest() {
    const total = this.totalScore + this.missionScore;
    if (total > this.best) {
      this.best = total;
      window.localStorage.setItem(BEST_KEY, String(total));
    }
  }

  crash(reason) {
    if (this.state !== 'flying') return;
    this.crashReason = reason;
    this.shake = 1;
    this.sound.crash();
    this.particles.explosion(360, this.world.groundY(this.plane.x) - this.plane.alt);
    this.saveBest();
    this.setState('crashed');
  }

  land() {
    const fuelBonus = Math.round(this.plane.fuel) * SCORE.fuelBonusPerUnit;
    const timeBonus = Math.max(0, Math.round(this.mission.parSec - this.elapsedSec)) * SCORE.timeBonusPerSec;
    this.landingBonus = SCORE.landing + fuelBonus + timeBonus;
    this.missionScore += this.landingBonus;
    // Bank the mission's score into the total once, and park the plane:
    // level wings, no speed, no throttle, no climb.
    this.lastMissionScore = this.missionScore;
    this.totalScore += this.missionScore;
    this.missionScore = 0;
    this.plane.speed = 0;
    this.plane.throttle = 0;
    this.plane.verticalSpeed = 0;
    this.plane.pitch = 0;
    this.plane.bank = 0;
    this.sound.fanfare();
    this.particles.touchdown(360, this.world.groundY(this.plane.x));
    this.particles.confetti(640, 200);
    this.saveBest();
    this.addToast(`Landed! +${this.landingBonus}`, '#8be28b', 3);
    this.setState('done');
  }

  // One frame of the flying state.
  updateFlying(dt) {
    this.elapsedSec += dt;
    this.wind = this.world.windAt(this.plane.x, this.t);
    const prevX = this.plane.x;
    this.plane.update(dt, this.input, this.world, this.wind, this.t);
    this.world.update(dt, this.t);

    // Exhaust puffs while the engine works.
    if (this.plane.airborne && this.plane.throttle > 0.15) {
      this.particles.exhaust(360 - 34, this.world.groundY(this.plane.x) - this.plane.alt, this.plane.throttle);
    }

    // Rings: crossing a ring's x scores it, skimming it is a near miss.
    const planeY = this.world.groundY(this.plane.x) - this.plane.alt;
    for (const ring of this.world.rings) {
      if (ring.passed) continue;
      if (prevX < ring.x && this.plane.x >= ring.x) {
        const dist = Math.abs(planeY - ring.y);
        if (dist <= ring.radius) {
          ring.passed = true;
          let gained = SCORE.ring;
          if (this.plane.onCourse) gained += SCORE.onCourseBonus;
          this.missionScore += gained;
          this.sound.ring();
          this.particles.burst(360, planeY);
          this.addToast(`Ring ${ring.index + 1} +${gained}`, '#ffd166');
        } else if (dist <= ring.radius * 1.6 && !ring.nearMissed) {
          ring.nearMissed = true;
          this.missionScore += SCORE.nearMiss;
          this.addToast(`Near miss +${SCORE.nearMiss}`, '#7fd4ff');
        }
      }
    }

    // Supply crates: fuel and points.
    for (const crate of this.world.crates) {
      if (crate.taken) continue;
      const dx = this.plane.x - crate.x;
      const dy = planeY - crate.y;
      if (Math.abs(dx) < 46 && Math.abs(dy) < 46) {
        crate.taken = true;
        this.plane.fuel = Math.min(100, this.plane.fuel + 18);
        this.missionScore += SCORE.crate;
        this.sound.crate();
        this.particles.sparkle(360, planeY);
        this.addToast(`Supplies +${SCORE.crate} · fuel +18`, '#8be28b');
      }
    }

    // Birds: a hit costs hull.
    for (const bird of this.world.birds) {
      const dx = this.plane.x - bird.x;
      const dy = planeY - bird.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 26) {
        if (this.plane.registerHit()) {
          this.shake = 0.7;
          this.sound.crash();
          this.sound.warning();
          this.addToast(`Bird strike! Hull ${3 - this.plane.damage}/3`, '#ff5a4e');
          if (this.plane.crashed) this.crash('The Kestrel took three hits and came down in the valley.');
        }
      }
    }

    // Ground: landing on a runway, rolling on the home strip, or a hard
    // meeting with the valley.
    if (this.plane.alt <= 0 && this.plane.airborne) {
      const onStartRunway =
        this.plane.x >= this.world.runwayStart && this.plane.x <= this.world.runwayStart + 500;
      const onEndRunway =
        this.plane.x >= this.world.runwayEnd && this.plane.x <= this.world.runwayEnd + 500;
      const gentle = Math.abs(this.plane.verticalSpeed) < 75 && this.plane.speed < 210;
      if (onEndRunway && gentle) {
        this.plane.airborne = false;
        this.land();
        return;
      }
      if (onStartRunway && gentle) {
        // Touched back down at home: roll out, no damage, keep taxiing.
        this.plane.airborne = false;
        this.plane.speed *= 0.98;
        return;
      }
      if (this.plane.registerHit()) {
        this.shake = 0.7;
        this.sound.crash();
        this.addToast(`Terrain hit! Hull ${3 - this.plane.damage}/3`, '#ff5a4e');
        if (this.plane.crashed) this.crash('The Kestrel met the mountain and lost.');
      }
    }

    // Overshot the strip entirely.
    if (this.plane.x > this.world.length + 120) {
      this.crash('Overshot the strip and flew into the far ridge.');
      return;
    }

    // Out of fuel, on the ground, nowhere near a runway.
    if (this.plane.outOfFuel && this.plane.alt <= 0 && this.plane.speed < 30) {
      this.crash('Out of fuel, down in the valley far from the strip.');
      return;
    }

    // Low fuel warning, once per crossing of the threshold.
    if (this.plane.fuel < 25 && !this.warnedLowFuel) {
      this.warnedLowFuel = true;
      this.sound.warning();
      this.addToast('LOW FUEL — find a crate or land soon', '#ff5a4e', 3);
    }
    if (this.plane.fuel >= 25) this.warnedLowFuel = false;

    // Mission complete needs the landing; rings alone are not enough.
    if (this.world.ringsDone() === this.world.rings.length && !this.announcedAllRings) {
      this.announcedAllRings = true;
      this.addToast('All rings! Now land on the far strip', '#8be28b', 3);
    }
  }

  frame(now) {
    const dt = Math.max(0.001, Math.min(0.05, (now - this.last) / 1000 || 0.016));
    this.last = now;
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 1.4);
    for (const toast of this.toasts) toast.life -= dt;
    this.toasts = this.toasts.filter((toast) => toast.life > 0);

    // Global keys.
    if (this.input.wasPressed('m')) {
      this.sound.ensure();
      this.sound.setMuted(!this.sound.muted);
      this.addToast(this.sound.muted ? 'Sound off' : 'Sound on', '#ffffff', 1.2);
    }
    if (this.input.wasPressed('p') && (this.state === 'flying' || this.state === 'paused')) {
      this.togglePause();
    }
    if (this.input.wasPressed('r') && (this.state === 'flying' || this.state === 'crashed' || this.state === 'paused')) {
      this.retryMission();
    }
    if (this.input.wasPressed('enter')) {
      this.sound.ensure();
      if (this.state === 'title') this.showBriefing();
      else if (this.state === 'brief') this.startFlying();
      else if (this.state === 'done') this.nextMission();
      else if (this.state === 'crashed') this.retryMission();
      else if (this.state === 'win') this.backToTitle();
    }

    if (this.state === 'flying') {
      this.updateFlying(dt);
      this.sound.update(this.plane.throttle, this.plane.speed / 305, this.plane.airborne);
    } else if (this.state === 'title') {
      // Attract mode: slow drift over the home valley.
      this.cameraX = (this.t * 22) % 900;
      this.world.update(dt, this.t);
    }
    if (this.state !== 'title') {
      this.cameraX = Math.max(0, this.plane.x - 360);
    }
    this.particles.update(dt);

    this.renderer.draw({
      world: this.world,
      plane: this.plane,
      particles: this.particles,
      palette: this.mission.palette,
      cameraX: this.cameraX,
      t: this.t,
      shake: this.shake,
      wind: this.wind,
      score: this.totalScore + this.missionScore,
      missionIndex: this.missionIndex,
      elapsedSec: this.elapsedSec,
      toasts: this.toasts,
    });

    this.input.endFrame();
  }

  start() {
    this.showScreen(this.state);
    const loop = (now) => {
      this.frame(now);
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);
  }
}

// Boot when the page is ready.
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  game.start();
});
