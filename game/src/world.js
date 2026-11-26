// Ridge Runner — the valley: terrain, rings, crates, runway, birds, wind.
//
// One clear job: build a mission's course from its seed and answer the
// physics' questions about it (how high is the ground here, what is next).

import { GROUND_BASE_Y, VIEW_W } from './config.js';
import { makeNoise1D, mulberry32, range } from './random.js';

export class World {
  constructor(mission) {
    this.mission = mission;
    this.length = mission.length;
    this.rand = mulberry32(mission.seed);
    // Rolling valley floor: slow swells plus sharper teeth.
    this.swell = makeNoise1D(mission.seed + 11, 1500, 62 * mission.roughness);
    this.teeth = makeNoise1D(mission.seed + 23, 420, 96 * mission.roughness);
    this.peaks = makeNoise1D(mission.seed + 37, 2600, 70 * mission.roughness);
    this.runwayStart = 60;
    this.runwayEnd = this.length - 560;
    this.rings = this.buildRings();
    this.crates = this.buildCrates();
    this.birds = this.buildBirds();
    this.clouds = this.buildClouds();
    this.trees = this.buildTrees();
  }

  // Height of the valley floor (screen y) at world x. Flat near both
  // runways so takeoffs and landings are fair.
  groundY(x) {
    const clamped = Math.max(0, Math.min(this.length, x));
    let y = GROUND_BASE_Y + this.swell(clamped) + this.teeth(clamped) * 0.6 + this.peaks(clamped) * 0.35;
    const flatStart = this.fade(clamped, 0, 700);
    const flatEnd = this.fade(this.length - clamped, 0, 700);
    const flat = Math.min(flatStart, flatEnd);
    y = GROUND_BASE_Y + (y - GROUND_BASE_Y) * (1 - flat);
    return Math.min(GROUND_BASE_Y + 4, Math.max(430, y));
  }

  fade(v, from, to) {
    if (v <= from) return 1;
    if (v >= to) return 0;
    const t = (v - from) / (to - from);
    return 1 - t * t * (3 - 2 * t);
  }

  buildRings() {
    const rings = [];
    const count = this.mission.rings;
    // The last ring sits well before the far strip, leaving room for a
    // real final approach instead of a dive at the runway.
    const span = this.length - 2600;
    for (let i = 0; i < count; i += 1) {
      const x = 1100 + (span * (i + 0.5)) / count + range(this.rand, -120, 120);
      const ground = this.groundY(x);
      const height = range(this.rand, 170, 330);
      rings.push({
        index: i,
        x,
        y: Math.max(120, ground - height),
        radius: this.mission.ringRadius,
        passed: false,
        nearMissed: false,
        bobPhase: this.rand() * Math.PI * 2,
      });
    }
    return rings;
  }

  buildCrates() {
    const crates = [];
    const count = this.mission.rings + 2;
    for (let i = 0; i < count; i += 1) {
      const x = range(this.rand, 900, this.length - 1200);
      const ground = this.groundY(x);
      crates.push({
        x,
        y: Math.max(110, ground - range(this.rand, 130, 300)),
        taken: false,
        spin: this.rand() * Math.PI * 2,
      });
    }
    return crates;
  }

  buildBirds() {
    const birds = [];
    for (let i = 0; i < this.mission.birds; i += 1) {
      const x = range(this.rand, 1500, this.length - 1500);
      const ground = this.groundY(x);
      birds.push({
        x,
        y: Math.max(110, ground - range(this.rand, 120, 300)),
        speed: range(this.rand, 18, 42),
        phase: this.rand() * Math.PI * 2,
        dir: this.rand() > 0.5 ? 1 : -1,
      });
    }
    return birds;
  }

  buildClouds() {
    const clouds = [];
    for (let i = 0; i < 26; i += 1) {
      clouds.push({
        x: this.rand() * (this.length + VIEW_W),
        y: range(this.rand, 40, 260),
        scale: range(this.rand, 0.6, 1.7),
        speed: range(this.rand, 4, 12),
        depth: this.rand(),
      });
    }
    return clouds;
  }

  buildTrees() {
    const trees = [];
    for (let x = 200; x < this.length; x += range(this.rand, 90, 260)) {
      trees.push({ x, size: range(this.rand, 0.7, 1.4), lean: range(this.rand, -0.08, 0.08) });
    }
    return trees;
  }

  nextRing() {
    return this.rings.find((ring) => !ring.passed) ?? null;
  }

  ringsDone() {
    return this.rings.filter((ring) => ring.passed).length;
  }

  // Gusty wind at world x and time t: -1 (headwind push down) .. +1.
  windAt(x, t) {
    const base = Math.sin(x * 0.0011 + this.mission.seed) * 0.5;
    const gust = Math.sin(t * 0.9 + x * 0.004) * Math.sin(t * 0.37 + 1.7);
    return (base + gust) * this.mission.wind;
  }

  // Advance birds and clouds; rings bob gently.
  update(dt, t) {
    for (const bird of this.birds) {
      bird.x += bird.dir * bird.speed * dt;
      bird.y += Math.sin(t * 2.2 + bird.phase) * 14 * dt;
      if (bird.x < 800) bird.dir = 1;
      if (bird.x > this.length - 800) bird.dir = -1;
    }
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > this.length + VIEW_W) cloud.x = -300;
    }
  }
}
