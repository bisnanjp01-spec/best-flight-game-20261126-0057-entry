// Ridge Runner — canvas drawing: sky, terrain, plane, rings, HUD, dials.
//
// One clear job: turn the game state into a picture. It reads state only;
// it never moves the plane, scores a ring or changes a mission.

import { PALETTES, RING_DONE, RING_LATER, RING_NEXT, VIEW_H, VIEW_W } from './config.js';
import { makeNoise1D } from './random.js';

const PLANE_SCREEN_X = 360;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.farNoise = makeNoise1D(9001, 900, 90);
    this.midNoise = makeNoise1D(9002, 520, 70);
    this.shakeT = 0;
  }

  draw(view) {
    const { ctx } = this;
    const { world, plane, particles, palette, cameraX, t } = view;
    const pal = PALETTES[palette];
    const shake = view.shake > 0 ? view.shake : 0;
    const sx = (Math.random() - 0.5) * shake * 14;
    const sy = (Math.random() - 0.5) * shake * 10;

    ctx.save();
    ctx.translate(sx, sy);
    this.drawSky(pal, t);
    this.drawRidge(pal, cameraX, 0.22, this.farNoise, 300, pal.far);
    this.drawRidge(pal, cameraX, 0.45, this.midNoise, 420, pal.mid);
    this.drawClouds(pal, world, cameraX, t);
    this.drawGround(pal, world, cameraX);
    this.drawRunways(pal, world, cameraX);
    this.drawRings(world, cameraX, t);
    this.drawCrates(world, cameraX, t);
    this.drawBirds(world, cameraX, t);
    this.drawPlane(view);
    particles.draw(ctx, cameraX);
    ctx.restore();

    this.drawHud(view, pal);
    this.drawDeck(view, pal);
    this.drawToasts(view);
  }

  drawSky(pal, t) {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, pal.skyTop);
    grad.addColorStop(0.55, pal.skyMid);
    grad.addColorStop(1, pal.skyLow);
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    // Sun with a soft halo.
    const sunX = pal.sunX * VIEW_W;
    const sunY = pal.sunY * VIEW_H;
    const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
    halo.addColorStop(0, pal.sun);
    halo.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
    ctx.fillStyle = pal.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
    void t;
  }

  drawRidge(pal, cameraX, parallax, noise, baseY, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H);
    for (let sx = -20; sx <= VIEW_W + 20; sx += 16) {
      const wx = cameraX * parallax + sx;
      ctx.lineTo(sx, baseY + noise(wx) + Math.sin(wx * 0.002) * 26);
    }
    ctx.lineTo(VIEW_W + 20, VIEW_H);
    ctx.closePath();
    ctx.fill();
    // Snow caps on the far ridge.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let sx = -20; sx <= VIEW_W + 20; sx += 16) {
      const wx = cameraX * parallax + sx;
      const y = baseY + noise(wx) + Math.sin(wx * 0.002) * 26;
      if (y < baseY - 40) {
        ctx.fillRect(sx, y, 16, 5);
      }
    }
    void pal;
  }

  drawClouds(pal, world, cameraX) {
    const { ctx } = this;
    ctx.fillStyle = pal.cloud;
    for (const cloud of world.clouds) {
      const sx = cloud.x - cameraX * (0.6 + cloud.depth * 0.3);
      if (sx < -260 || sx > VIEW_W + 260) continue;
      const s = cloud.scale;
      ctx.beginPath();
      ctx.ellipse(sx, cloud.y, 52 * s, 17 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + 34 * s, cloud.y + 5, 36 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(sx - 36 * s, cloud.y + 6, 32 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGround(pal, world, cameraX) {
    const { ctx } = this;
    // Valley floor: a filled profile from the terrain function.
    ctx.fillStyle = pal.ground;
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H + 20);
    for (let sx = -20; sx <= VIEW_W + 20; sx += 8) {
      ctx.lineTo(sx, world.groundY(cameraX + sx));
    }
    ctx.lineTo(VIEW_W + 20, VIEW_H + 20);
    ctx.closePath();
    ctx.fill();
    // Darker under-slope for depth.
    ctx.fillStyle = pal.groundDark;
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H + 20);
    for (let sx = -20; sx <= VIEW_W + 20; sx += 8) {
      ctx.lineTo(sx, world.groundY(cameraX + sx) + 26);
    }
    ctx.lineTo(VIEW_W + 20, VIEW_H + 20);
    ctx.closePath();
    ctx.fill();
    // The river: a bright ribbon low in the valley, just under the crest.
    ctx.strokeStyle = pal.river;
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let sx = -20; sx <= VIEW_W + 20; sx += 8) {
      const y = world.groundY(cameraX + sx) + 16 + Math.sin((cameraX + sx) * 0.01) * 4;
      if (sx === -20) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    ctx.stroke();
    // Pine trees on the slopes.
    ctx.fillStyle = '#2c4a2e';
    for (const tree of world.trees) {
      const sx = tree.x - cameraX;
      if (sx < -20 || sx > VIEW_W + 20) continue;
      const gy = world.groundY(tree.x);
      const h = 26 * tree.size;
      ctx.beginPath();
      ctx.moveTo(sx, gy - h);
      ctx.lineTo(sx - 8 * tree.size, gy);
      ctx.lineTo(sx + 8 * tree.size, gy);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawRunways(pal, world, cameraX) {
    const { ctx } = this;
    for (const [from, to] of [[world.runwayStart, world.runwayStart + 500], [world.runwayEnd, world.runwayEnd + 500]]) {
      const sx0 = from - cameraX;
      const sx1 = to - cameraX;
      if (sx1 < -40 || sx0 > VIEW_W + 40) continue;
      const gy = world.groundY(from + 10);
      ctx.fillStyle = '#3a3f45';
      ctx.fillRect(sx0, gy - 6, sx1 - sx0, 10);
      ctx.fillStyle = '#e8e8e8';
      for (let x = sx0 + 20; x < sx1 - 10; x += 46) ctx.fillRect(x, gy - 2, 22, 3);
      // Edge lights, lit amber.
      ctx.fillStyle = '#ffb02e';
      for (let x = sx0; x <= sx1; x += 62) {
        ctx.beginPath();
        ctx.arc(x, gy - 8, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    void pal;
  }

  drawRings(world, cameraX, t) {
    const { ctx } = this;
    const next = world.nextRing();
    for (const ring of world.rings) {
      const sx = ring.x - cameraX;
      if (sx < -140 || sx > VIEW_W + 140) continue;
      const bob = Math.sin(t * 1.6 + ring.bobPhase) * 6;
      const cy = ring.y + bob;
      const color = ring.passed ? RING_DONE : ring === next ? RING_NEXT : RING_LATER;
      const pulse = ring === next ? 1 + Math.sin(t * 4) * 0.08 : 1;
      const r = ring.radius * pulse;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = ring === next ? 22 : 8;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(sx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(sx, cy, r - 7, 0, Math.PI * 2);
      ctx.stroke();
      // Ring number above the ring.
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(ring.index + 1), sx, cy - r - 12);
      // A chevron pointing the way through.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(sx - 10, cy + 4);
      ctx.lineTo(sx + 10, cy + 4);
      ctx.lineTo(sx, cy + 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawCrates(world, cameraX, t) {
    const { ctx } = this;
    for (const crate of world.crates) {
      if (crate.taken) continue;
      const sx = crate.x - cameraX;
      if (sx < -60 || sx > VIEW_W + 60) continue;
      const cy = crate.y + Math.sin(t * 2 + crate.spin) * 5;
      ctx.save();
      ctx.translate(sx, cy);
      ctx.rotate(Math.sin(t + crate.spin) * 0.12);
      // Parachute canopy.
      ctx.fillStyle = '#ff8c42';
      ctx.beginPath();
      ctx.arc(0, -16, 16, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-14, -16);
      ctx.lineTo(-8, 2);
      ctx.moveTo(14, -16);
      ctx.lineTo(8, 2);
      ctx.stroke();
      // The crate itself, glowing green cross.
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(-11, 0, 22, 20);
      ctx.strokeStyle = '#8be28b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#8be28b';
      ctx.shadowBlur = 10;
      ctx.strokeRect(-11, 0, 22, 20);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 20);
      ctx.moveTo(-11, 10);
      ctx.lineTo(11, 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawBirds(world, cameraX, t) {
    const { ctx } = this;
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 2.5;
    for (const bird of world.birds) {
      const sx = bird.x - cameraX;
      if (sx < -30 || sx > VIEW_W + 30) continue;
      const flap = Math.sin(t * 9 + bird.phase) * 6;
      ctx.beginPath();
      ctx.moveTo(sx - 12, bird.y - flap);
      ctx.quadraticCurveTo(sx, bird.y + 3, sx + 12, bird.y - flap);
      ctx.stroke();
    }
  }

  drawPlane(view) {
    const { ctx } = this;
    const { world, plane, cameraX } = view;
    const px = PLANE_SCREEN_X;
    const py = world.groundY(plane.x) - plane.alt;
    const rot = (-plane.pitch * Math.PI) / 180;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    // Prop blur disc and blades.
    ctx.fillStyle = 'rgba(200,210,220,0.28)';
    ctx.beginPath();
    ctx.ellipse(34, 0, 5, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    const pa = plane.propAngle;
    ctx.beginPath();
    ctx.moveTo(34 + Math.cos(pa) * 24, Math.sin(pa) * 24);
    ctx.lineTo(34 - Math.cos(pa) * 24, -Math.sin(pa) * 24);
    ctx.stroke();
    // Tail fin and stabiliser.
    ctx.fillStyle = '#c8442c';
    ctx.beginPath();
    ctx.moveTo(-30, -2);
    ctx.lineTo(-42, -20);
    ctx.lineTo(-32, -20);
    ctx.lineTo(-20, -4);
    ctx.closePath();
    ctx.fill();
    // Fuselage: a built bush plane, cream with a red cheatline.
    ctx.fillStyle = '#f2e8d5';
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8442c';
    ctx.fillRect(-34, 2, 62, 4);
    // Cockpit window, lit.
    ctx.fillStyle = '#9fd8ef';
    ctx.beginPath();
    ctx.ellipse(14, -6, 11, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(12, -8, 4, 2, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Wing.
    ctx.fillStyle = '#e0d3b8';
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.lineTo(6, 2);
    ctx.lineTo(2, 26);
    ctx.lineTo(-16, 26);
    ctx.closePath();
    ctx.fill();
    // Wing strut.
    ctx.strokeStyle = '#8a7a5c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 8);
    ctx.lineTo(-6, 24);
    ctx.stroke();
    // Wheels.
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-12, 14, 5, 0, Math.PI * 2);
    ctx.arc(16, 14, 5, 0, Math.PI * 2);
    ctx.fill();
    // Nav lights: red port, green starboard, blinking with time.
    if (Math.floor(view.t * 2) % 2 === 0) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(-34, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#34d17b';
      ctx.beginPath();
      ctx.arc(36, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Landing light while flaps are out.
    if (plane.flaps) {
      const beam = ctx.createLinearGradient(36, 0, 150, 0);
      beam.addColorStop(0, 'rgba(255,244,190,0.5)');
      beam.addColorStop(1, 'rgba(255,244,190,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(36, -4);
      ctx.lineTo(150, -22);
      ctx.lineTo(150, 22);
      ctx.lineTo(36, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    void cameraX;
  }

  drawHud(view, pal) {
    const { ctx } = this;
    const { plane, world, score, missionIndex, elapsedSec } = view;
    const mission = world.mission;
    // Top bar.
    ctx.fillStyle = 'rgba(10,16,28,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 54);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`MISSION ${missionIndex + 1} · ${mission.name.toUpperCase()}`, 16, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`RINGS ${world.ringsDone()}/${world.rings.length}   SCORE ${score}   TIME ${Math.floor(elapsedSec)}s`, 16, 42);
    // Readouts: ALT / SPD / HDG, lit amber.
    const readouts = [
      ['ALT', `${plane.altitudeFt} FT`],
      ['SPD', `${plane.speedKt} KT`],
      ['HDG', `${String(Math.round(plane.heading)).padStart(3, '0')}°`],
    ];
    ctx.textAlign = 'center';
    readouts.forEach(([label, value], i) => {
      const x = 560 + i * 130;
      ctx.fillStyle = '#8fb8d8';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(label, x, 20);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 20px "SF Mono", ui-monospace, monospace';
      ctx.shadowColor = '#ffb02e';
      ctx.shadowBlur = 8;
      ctx.fillText(value, x, 44);
      ctx.shadowBlur = 0;
    });
    // Fuel bar.
    const fuelX = 960;
    ctx.fillStyle = '#8fb8d8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', fuelX, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(fuelX, 26, 150, 12);
    ctx.fillStyle = plane.fuel < 25 ? '#ff5a4e' : '#8be28b';
    ctx.fillRect(fuelX, 26, 150 * (plane.fuel / 100), 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${Math.round(plane.fuel)}`, fuelX + 156, 36);
    // Damage pips.
    ctx.fillStyle = '#8fb8d8';
    ctx.fillText('HULL', 1130, 20);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < 3 - plane.damage ? '#ff5a4e' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(1145 + i * 22, 32, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wind arrow and throttle, right of the fuel bar is crowded: put wind
    // under the mission line instead.
    const wind = view.wind;
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`WIND ${wind >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(wind * 28))} KT   THR ${Math.round(plane.throttle * 100)}%`, 16, 68);
    void pal;
  }

  drawDeck(view, pal) {
    const { ctx } = this;
    const { plane, world } = view;
    const deckY = VIEW_H - 66;
    ctx.fillStyle = 'rgba(10,16,28,0.78)';
    ctx.fillRect(0, deckY, VIEW_W, 66);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(0, deckY + 0.5);
    ctx.lineTo(VIEW_W, deckY + 0.5);
    ctx.stroke();
    // Attitude dial.
    this.drawAttitude(80, deckY + 30, 22, plane);
    // Airspeed dial.
    this.drawDial(190, deckY + 30, 22, plane.speedKt, 0, 300, 'KT', '#7fd4ff');
    // Altimeter dial.
    this.drawDial(300, deckY + 30, 22, plane.altitudeFt, 0, 1500, 'FT', '#ffd166');
    // Compass strip.
    ctx.fillStyle = '#8fb8d8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HDG', 380, deckY + 18);
    this.drawCompass(380, deckY + 30, 300, plane.heading);
    // Vertical speed.
    ctx.fillStyle = '#8fb8d8';
    ctx.fillText('V/S', 720, deckY + 18);
    const vs = Math.round(plane.verticalSpeed * 3);
    ctx.fillStyle = vs >= 0 ? '#8be28b' : '#ff9a5c';
    ctx.font = 'bold 16px ui-monospace, monospace';
    ctx.fillText(`${vs >= 0 ? '+' : ''}${vs} FT/M`, 720, deckY + 40);
    // Throttle lever.
    ctx.fillStyle = '#8fb8d8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('THR', 900, deckY + 18);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(900, deckY + 26, 130, 8);
    ctx.fillStyle = '#ffb02e';
    ctx.fillRect(900, deckY + 26, 130 * plane.throttle, 8);
    // Flaps + gear lamps, lit when active.
    this.drawLamp(1080, deckY + 26, 'FLAPS', plane.flaps, '#8be28b');
    this.drawLamp(1160, deckY + 26, 'AIR', plane.airborne, '#7fd4ff');
    void world;
    void pal;
  }

  drawAttitude(x, y, r, plane) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#3f7fc4';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(x - r, y, r * 2, r * 2);
    ctx.translate(x, y);
    ctx.rotate((plane.bank * Math.PI) / 180);
    ctx.translate(0, plane.pitch * 0.9);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-r, -1, r * 2, 2);
    ctx.restore();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 5);
    ctx.closePath();
    ctx.fill();
  }

  drawDial(x, y, r, value, min, max, unit, color) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const angle = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (r - 4), y + Math.sin(angle) * (r - 4));
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(value)), x, y + 4);
    ctx.fillStyle = '#8fb8d8';
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillText(unit, x, y + r + 9);
  }

  drawCompass(x, y, width, heading) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, 22);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, y, width, 22);
    const center = x + width / 2;
    for (let h = 0; h < 360; h += 15) {
      let diff = ((h - heading + 540) % 360) - 180;
      const px = center + diff * 2.2;
      if (px < x - 10 || px > x + width + 10) continue;
      const major = h % 90 === 0;
      ctx.strokeStyle = major ? '#ffd166' : 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(px, y + 3);
      ctx.lineTo(px, y + (major ? 10 : 7));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(h).padStart(3, '0'), px, y + 20);
      }
    }
    ctx.restore();
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.moveTo(center - 5, y);
    ctx.lineTo(center + 5, y);
    ctx.lineTo(center, y + 8);
    ctx.closePath();
    ctx.fill();
  }

  drawLamp(x, y, label, on, color) {
    const { ctx } = this;
    ctx.fillStyle = on ? color : 'rgba(255,255,255,0.18)';
    ctx.shadowColor = on ? color : 'transparent';
    ctx.shadowBlur = on ? 10 : 0;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8fb8d8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 20);
  }

  drawToasts(view) {
    const { ctx } = this;
    ctx.textAlign = 'center';
    let y = 120;
    for (const toast of view.toasts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, toast.life / 0.6));
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(10,16,28,0.6)';
      const w = ctx.measureText(toast.text).width + 36;
      ctx.fillRect(VIEW_W / 2 - w / 2, y - 28, w, 40);
      ctx.fillStyle = toast.color;
      ctx.fillText(toast.text, VIEW_W / 2, y);
      y += 46;
    }
    ctx.globalAlpha = 1;
  }
}
