// Ridge Runner — particles: exhaust, bursts, smoke, spray, confetti.
//
// One clear job: little things that move and fade. The game spawns them;
// this file owns their life and their drawing.

export class Particles {
  constructor() {
    this.list = [];
  }

  spawn(x, y, vx, vy, life, size, color, gravity = 0) {
    this.list.push({ x, y, vx, vy, life, maxLife: life, size, color, gravity });
  }

  // Engine exhaust: a puff behind the tail, drifting back and down.
  exhaust(x, y, throttle) {
    if (Math.random() > 0.35 + throttle * 0.5) return;
    this.spawn(
      x, y + (Math.random() - 0.5) * 6,
      -60 - Math.random() * 60, 12 + Math.random() * 20,
      0.5 + Math.random() * 0.3, 3 + Math.random() * 4,
      'rgba(220,225,230,0.55)',
    );
  }

  // A ring burst: golden sparks flying outward.
  burst(x, y) {
    for (let i = 0; i < 26; i += 1) {
      const a = (i / 26) * Math.PI * 2;
      const speed = 90 + Math.random() * 160;
      this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.7 + Math.random() * 0.4, 2.5 + Math.random() * 3, '#ffcf5c');
    }
  }

  // A crate pickup: green sparkles rising.
  sparkle(x, y) {
    for (let i = 0; i < 14; i += 1) {
      this.spawn(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 40, -40 - Math.random() * 60, 0.8, 2 + Math.random() * 2.5, '#8be28b');
    }
  }

  // A crash: smoke, fire and debris.
  explosion(x, y) {
    for (let i = 0; i < 46; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 260;
      const colors = ['#ff7a2e', '#ffcf5c', '#5a5a5a', '#2e2e2e'];
      this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed - 40, 0.9 + Math.random() * 0.9, 3 + Math.random() * 6, colors[i % colors.length], 60);
    }
  }

  // Touchdown smoke: white puffs at the wheels.
  touchdown(x, y) {
    for (let i = 0; i < 12; i += 1) {
      this.spawn(x + (Math.random() - 0.5) * 40, y, -30 - Math.random() * 50, -10 - Math.random() * 25, 0.7, 4 + Math.random() * 5, 'rgba(235,235,235,0.6)');
    }
  }

  // Landing confetti for a mission done.
  confetti(x, y) {
    const colors = ['#ffb02e', '#7fd4ff', '#8be28b', '#ff7a9e'];
    for (let i = 0; i < 60; i += 1) {
      this.spawn(x + (Math.random() - 0.5) * 500, y - Math.random() * 120, (Math.random() - 0.5) * 30, 30 + Math.random() * 60, 1.6 + Math.random(), 3 + Math.random() * 3, colors[i % colors.length], 26);
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 0.4 * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx, cameraX) {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
