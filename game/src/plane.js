// Ridge Runner — flight physics for the Kestrel-7 bush plane.
//
// One clear job: turn pilot input, wind and the valley into motion, fuel
// burn and damage. The renderer only reads this state; it never moves it.
//
// Coordinates: x is distance down the course in pixels, alt is height
// above the valley floor in pixels. The camera follows x; the screen
// position is derived at draw time, never stored here.

import { PLANE } from './config.js';

export class Plane {
  constructor(mission) {
    this.groundBelow = 618;
    this.reset(mission);
  }

  reset(mission) {
    this.x = 150;
    this.alt = 0; // parked on the strip, wheels on the ground
    this.speed = 0;
    this.pitch = 0; // degrees, positive is nose up
    this.bank = 0; // degrees, positive is right wing down
    this.heading = 90; // degrees, 090 is the course heading
    this.throttle = 0;
    this.fuel = mission.fuel;
    this.damage = 0;
    this.airborne = false;
    this.verticalSpeed = 0;
    this.hitCooldown = 0;
    this.flaps = false;
    this.propAngle = 0;
  }

  get altitudePx() {
    return Math.max(0, this.alt);
  }

  get speedKt() {
    return Math.round(this.speed * 0.9);
  }

  get altitudeFt() {
    return Math.max(0, Math.round(this.alt * 3));
  }

  // Screen y of the plane for the mouse-steering input.
  screenY(groundYAtPlane) {
    return groundYAtPlane - this.alt;
  }

  update(dt, input, world, wind, t) {
    this.groundBelow = world.groundY(this.x);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);

    // Throttle: Shift (or mouse hold) spools up, Ctrl spools down, the
    // wheel nudges it. No fuel, no thrust.
    if (this.fuel <= 0) {
      this.throttle = Math.max(0, this.throttle - dt * 0.5);
    } else if (input.throttleUp()) {
      this.throttle = Math.min(1, this.throttle + dt * 0.9);
    } else if (input.throttleDown()) {
      this.throttle = Math.max(0, this.throttle - dt * 0.9);
    }
    const wheel = input.wheelDelta();
    if (wheel !== 0) this.throttle = Math.max(0, Math.min(1, this.throttle - wheel * 0.0006));

    this.flaps = input.flaps();

    // Pitch follows the stick (or the mouse); it eases back to level.
    // Full stick is 32 degrees: enough authority to climb over a ridge or
    // sink onto the strip even at approach speed.
    const pitchInput = input.pitchInput(this.screenY(this.groundBelow));
    const pitchTarget = pitchInput * 32;
    this.pitch += (pitchTarget - this.pitch) * Math.min(1, dt * 5);

    // Bank follows the turn keys; heading follows the bank, then drifts
    // back to the course heading when the wings level.
    const turnInput = input.turnInput();
    const bankTarget = turnInput * 32;
    this.bank += (bankTarget - this.bank) * Math.min(1, dt * 4);
    this.heading += (this.bank / 32) * PLANE.turnRate * dt;
    if (Math.abs(turnInput) < 0.1) {
      const diff = 90 - this.heading;
      this.heading += Math.max(-PLANE.headingReturn * dt, Math.min(PLANE.headingReturn * dt, diff));
    }
    this.heading = ((this.heading % 360) + 360) % 360;

    // Speed chases the throttle's target; drag grows with speed, flaps add more.
    const targetSpeed = this.throttle * PLANE.maxSpeed;
    const drag = PLANE.drag * (this.speed / PLANE.maxSpeed) + (this.flaps ? PLANE.flapsDrag / PLANE.maxSpeed : 0);
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 0.5);
    this.speed -= this.speed * drag * dt;
    this.speed = Math.max(0, Math.min(PLANE.maxSpeed, this.speed));

    // Lift: climb with pitch while fast, sink when slow or stalled. Pitch
    // keeps part of its authority at approach speed, so a descent onto the
    // strip always answers the stick.
    const speedFactor = Math.max(0, Math.min(1, (this.speed - PLANE.stallSpeed) / 120));
    const authority = 0.45 + 0.55 * speedFactor;
    let climb = Math.sin((this.pitch * Math.PI) / 180) * PLANE.climbRate * authority;
    if (this.flaps) climb += PLANE.flapsLift * speedFactor;
    if (this.speed < PLANE.stallSpeed && this.airborne) climb -= PLANE.stallSink * (1 - this.speed / PLANE.stallSpeed);
    if (!this.airborne && this.speed < 95) climb = Math.min(0, climb);
    climb += wind * 26;
    this.verticalSpeed = climb;
    this.alt += climb * dt;

    // The ceiling is a hard sky; the ground is met by the game, not here.
    const ceiling = Math.max(120, this.groundBelow - 56);
    if (this.alt > ceiling) this.alt = ceiling;
    if (this.alt < 0) this.alt = 0;
    if (this.speed > 95 && this.alt > 2) this.airborne = true;
    if (this.alt <= 0 && this.speed < 40) this.airborne = false;

    this.x += this.speed * dt;
    this.propAngle += (2 + this.throttle * 26) * dt;

    // Fuel burns with throttle; empty tanks glide.
    const burn = this.airborne
      ? PLANE.fuelIdleBurn + this.throttle * PLANE.fuelBurn
      : PLANE.fuelIdleBurn * 0.5;
    this.fuel = Math.max(0, this.fuel - burn * dt);

    return this;
  }

  // A hard hit: damage, a bounce off the ground, brief mercy.
  registerHit() {
    if (this.hitCooldown > 0) return false;
    this.damage += 1;
    this.hitCooldown = PLANE.hitCooldownSec;
    this.speed *= 0.55;
    this.alt = 46;
    this.verticalSpeed = 60;
    return true;
  }

  get crashed() {
    return this.damage >= PLANE.maxDamage;
  }

  get outOfFuel() {
    return this.fuel <= 0;
  }

  get onCourse() {
    const diff = Math.abs(this.heading - 90);
    return Math.min(diff, 360 - diff) < 10;
  }
}
