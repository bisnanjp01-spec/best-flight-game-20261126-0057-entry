// Ridge Runner — tuning, missions and palettes.
// One clear job: every number the game balances on lives here, so the
// other files read values instead of inventing them.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// The valley floor sits near this screen height; the plane flies above it.
export const GROUND_BASE_Y = 618;
// Highest the plane may climb (screen y of the sky ceiling).
export const SKY_TOP_Y = 56;

// Flight model.
export const PLANE = {
  maxSpeed: 305, // px per second at full throttle
  cruiseSpeed: 175, // px per second the engine holds without input
  stallSpeed: 62, // below this the wing stops flying and she sinks
  accel: 95, // px/s^2 gained toward the throttle's target speed
  drag: 0.22, // extra speed bled per second at high speed
  climbRate: 118, // px/s of climb at full pull and good speed
  sinkRate: 66, // px/s of sink at full push
  stallSink: 95, // px/s of sink while stalled
  turnRate: 42, // degrees of heading per second at full bank
  headingReturn: 26, // degrees per second heading drifts back to course
  flapsLift: 14, // extra px/s of lift while flaps are out (small: flaps slow you, they must not cancel a descent)
  flapsDrag: 52, // px/s of speed bled while flaps are out
  maxDamage: 3, // hard hits before the sortie ends
  hitCooldownSec: 2.0, // seconds of mercy after a hit
  fuelBurn: 1.15, // fuel units per second at full throttle
  fuelIdleBurn: 0.28, // fuel units per second at idle
  crateFuel: 18, // fuel a supply crate restores
};

// Scoring.
export const SCORE = {
  ring: 100,
  onCourseBonus: 25, // ring passed with heading near 090
  nearMiss: 25, // skimmed a ring without passing through it
  crate: 50,
  landing: 500,
  fuelBonusPerUnit: 5, // leftover fuel at landing
  timeBonusPerSec: 4, // seconds under the mission par time
};

// Three missions: same valley, rising trouble. Seeds pin the terrain so a
// mission always plays the same course.
export const MISSIONS = [
  {
    id: 1,
    name: 'Dawn Patrol',
    brief: 'Learn the sky. Eight rings down the valley, gentle wind, full tanks.',
    seed: 101,
    rings: 8,
    ringRadius: 80,
    fuel: 100,
    wind: 0.22,
    birds: 2,
    roughness: 0.7,
    length: 11000,
    parSec: 95,
    palette: 'dawn',
  },
  {
    id: 2,
    name: 'Ridge Run',
    brief: 'Tighter rings, gusty wind, rock teeth in the valley. Mind the peaks.',
    seed: 207,
    rings: 10,
    ringRadius: 66,
    fuel: 100,
    wind: 0.55,
    birds: 4,
    roughness: 1.0,
    length: 13000,
    parSec: 105,
    palette: 'day',
  },
  {
    id: 3,
    name: 'Storm Crossing',
    brief: 'Dusk, hard gusts, thin fuel, twelve rings. Land her or walk home.',
    seed: 313,
    rings: 12,
    ringRadius: 58,
    fuel: 90,
    wind: 0.9,
    birds: 6,
    roughness: 1.3,
    length: 15000,
    parSec: 120,
    palette: 'dusk',
  },
];

// Sky, terrain and light per mission palette.
export const PALETTES = {
  dawn: {
    skyTop: '#2e4a7a', skyMid: '#7fa3c8', skyLow: '#f6c98d',
    sun: '#ffd9a0', sunX: 0.78, sunY: 0.2,
    far: '#6b7fa3', mid: '#4d6486', near: '#3c5a44',
    ground: '#5d7a4a', groundDark: '#46603a', river: '#7fb8d8',
    cloud: 'rgba(255,244,230,0.85)',
  },
  day: {
    skyTop: '#2f6fb4', skyMid: '#79b4e0', skyLow: '#cfe8f5',
    sun: '#fff3c4', sunX: 0.2, sunY: 0.16,
    far: '#7d9cc0', mid: '#5b7fa6', near: '#41704e',
    ground: '#6d8a52', groundDark: '#527040', river: '#5fa8d3',
    cloud: 'rgba(255,255,255,0.9)',
  },
  dusk: {
    skyTop: '#1d2340', skyMid: '#5a4a72', skyLow: '#e07a4f',
    sun: '#ff9a5c', sunX: 0.72, sunY: 0.3,
    far: '#4a4468', mid: '#37355a', near: '#2c4638',
    ground: '#3d5a3e', groundDark: '#2e4630', river: '#4a7d99',
    cloud: 'rgba(214,164,150,0.7)',
  },
};

// Ring colours: the next ring glows amber, later ones cool blue.
export const RING_NEXT = '#ffb02e';
export const RING_LATER = '#7fd4ff';
export const RING_DONE = '#8be28b';

// Best score key in localStorage.
export const BEST_KEY = 'ridgeRunnerBestV1';
