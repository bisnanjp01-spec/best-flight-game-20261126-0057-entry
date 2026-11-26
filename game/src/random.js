// Ridge Runner — seeded random numbers.
//
// Deterministic terrain: the same seed always grows the same valley, so a
// mission plays the same course every run and screenshots reproduce.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rand, min, max) {
  return min + rand() * (max - min);
}

export function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

// Smooth 1D value noise: a wobbly line through seeded control points.
export function makeNoise1D(seed, step, amplitude) {
  const rand = mulberry32(seed);
  const points = [];
  const count = 64;
  for (let i = 0; i < count; i += 1) points.push(rand() * 2 - 1);
  const smooth = (t) => t * t * (3 - 2 * t);
  return function noise(x) {
    const pos = x / step;
    const i = Math.floor(pos);
    const f = smooth(pos - i);
    const a = points[((i % count) + count) % count];
    const b = points[(((i + 1) % count) + count) % count];
    return (a + (b - a) * f) * amplitude;
  };
}
