import { GameBase } from './game-base.js';

/**
 * Road Fighter — classic vertical-scrolling racer. Speed up the highway,
 * weave through traffic, grab fuel cans, and don't crash: hitting a car or
 * the roadside costs a life. Running out of fuel ends the run.
 * Controls: ←→/A-D steer, ↑/W accelerate, ↓/S brake.
 * Touch: drag to steer (auto-accelerates).
 */
const CAR_COLORS = ['#4d6aff', '#ffd24d', '#c04dff', '#4dff88'];

export class RoadFighterGame extends GameBase {
  static id = 'roadfighter';
  static hint = '←→ steer · ↑ accelerate · grab fuel cans · touch: drag';
  static width = 360;
  static height = 480;

  constructor(opts) {
    super(opts);
    this.init();
  }

  init() {
    this.roadW = 240;
    this.roadX = (this.r.w - this.roadW) / 2;
    this.lanes = 4;
    this.car = {
      x: this.r.w / 2,
      y: this.r.h - 70,
      w: 22,
      h: 38,
      steer: 260,
    };
    this.baseSpeed = 220;   // cruise scroll speed (px/s)
    this.maxSpeed = 560;
    this.speed = this.baseSpeed;
    this.scroll = 0;        // for dashed line animation
    this.distance = 0;
    this.fuel = 100;
    this.lives = 3;
    this.invuln = 0;        // seconds of post-crash blinking
    this.traffic = [];
    this.pickups = [];
    this.particles = [];
    this.spawnTimer = 0.5;
    this.fuelTimer = 6;
  }

  laneCenter(i) {
    return this.roadX + (this.roadW / this.lanes) * (i + 0.5);
  }

  crash() {
    if (this.invuln > 0) return;
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: this.car.x, y: this.car.y,
        vx: (Math.random() - 0.5) * 320,
        vy: (Math.random() - 0.5) * 320,
        life: 0.6,
        color: Math.random() < 0.5 ? '#ff9a4d' : '#ff5a5a',
      });
    }
    this.lives -= 1;
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    this.car.x = this.r.w / 2;
    this.speed = this.baseSpeed;
    this.invuln = 2;
  }

  update(dt) {
    if (this.over) return;
    const c = this.car;
    const k = this.input.keys;

    // throttle
    const difficulty = 1 + Math.min(1.5, this.distance / 8000);
    const accel = k.has('ArrowUp') || k.has('KeyW') || this.input.pointer.down;
    const brake = k.has('ArrowDown') || k.has('KeyS');
    const target = Math.min(
      this.maxSpeed,
      (brake ? this.baseSpeed * 0.6 : accel ? this.maxSpeed : this.baseSpeed) *
        Math.min(difficulty, 1.25)
    );
    this.speed += (target - this.speed) * Math.min(1, dt * 1.5);

    // steering
    if (k.has('ArrowLeft') || k.has('KeyA')) c.x -= c.steer * dt;
    if (k.has('ArrowRight') || k.has('KeyD')) c.x += c.steer * dt;
    if (this.input.pointer.down) {
      const diff = this.input.pointer.x - c.x;
      c.x += Math.sign(diff) * Math.min(Math.abs(diff), c.steer * dt);
    }

    // roadside collision
    if (c.x - c.w / 2 < this.roadX + 4 || c.x + c.w / 2 > this.roadX + this.roadW - 4) {
      c.x = Math.max(this.roadX + 4 + c.w / 2, Math.min(this.roadX + this.roadW - 4 - c.w / 2, c.x));
      this.crash();
    }

    // fuel
    this.fuel -= dt * (2 + (this.speed / this.maxSpeed) * 2.5);
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.gameOver();
      return;
    }

    // distance/score
    this.distance += this.speed * dt;
    this.setScore(Math.floor(this.distance / 10));
    this.scroll = (this.scroll + this.speed * dt) % 40;
    if (this.invuln > 0) this.invuln -= dt;

    // spawn traffic
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.35, 1.05 / difficulty) * (0.7 + Math.random() * 0.6);
      const lane = (Math.random() * this.lanes) | 0;
      const laneX = this.laneCenter(lane);
      // don't spawn on top of a car already near the top of this lane
      const blocked = this.traffic.some(
        (t) => Math.abs(t.x - laneX) < 40 && t.y < 60
      );
      if (!blocked) this.traffic.push({
        x: laneX,
        y: -50,
        w: 22, h: 38,
        speed: this.baseSpeed * (0.45 + Math.random() * 0.25), // slower than player
        color: CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0],
        swerve: Math.random() < 0.25 ? (Math.random() < 0.5 ? -1 : 1) * 40 : 0,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // spawn fuel cans
    this.fuelTimer -= dt;
    if (this.fuelTimer <= 0) {
      this.fuelTimer = 5 + Math.random() * 4;
      const lane = (Math.random() * this.lanes) | 0;
      this.pickups.push({ x: this.laneCenter(lane), y: -30, w: 18, h: 22 });
    }

    // move traffic (relative to player speed)
    for (const t of this.traffic) {
      t.y += (this.speed - t.speed) * dt;
      if (t.swerve) {
        t.phase += dt * 1.5;
        t.x += Math.sin(t.phase) * t.swerve * dt;
        t.x = Math.max(this.roadX + t.w / 2 + 4, Math.min(this.roadX + this.roadW - t.w / 2 - 4, t.x));
      }
      // collision with player
      if (
        this.invuln <= 0 &&
        Math.abs(t.x - c.x) < (t.w + c.w) / 2 - 4 &&
        Math.abs(t.y - c.y) < (t.h + c.h) / 2 - 4
      ) {
        this.crash();
      }
    }
    // overtake bonus for cars that scroll off the bottom
    for (const t of this.traffic) {
      if (!t.passed && t.y > c.y + 40) {
        t.passed = true;
        this.addScore(20);
      }
    }
    // drop cars past the bottom AND cars that drifted off the top
    // (possible while braking, when traffic is faster than the player)
    this.traffic = this.traffic.filter((t) => t.y < this.r.h + 60 && t.y > -120);

    // pickups
    for (const p of this.pickups) {
      p.y += this.speed * dt;
      if (Math.abs(p.x - c.x) < (p.w + c.w) / 2 && Math.abs(p.y - c.y) < (p.h + c.h) / 2) {
        p.dead = true;
        this.fuel = Math.min(100, this.fuel + 30);
        this.addScore(50);
      }
    }
    this.pickups = this.pickups.filter((p) => !p.dead && p.y < this.r.h + 40);

    // particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  drawCar(x, y, w, h, color) {
    const { r } = this;
    r.rect(x - w / 2, y - h / 2, w, h, color);                        // body
    r.rect(x - w / 2 + 3, y - h / 2 + 5, w - 6, 8, 'rgba(0,0,0,0.45)');  // windshield
    r.rect(x - w / 2 + 3, y + h / 2 - 11, w - 6, 6, 'rgba(0,0,0,0.45)'); // rear window
    r.rect(x - w / 2 - 2, y - h / 2 + 4, 3, 8, '#222');               // wheels
    r.rect(x + w / 2 - 1, y - h / 2 + 4, 3, 8, '#222');
    r.rect(x - w / 2 - 2, y + h / 2 - 12, 3, 8, '#222');
    r.rect(x + w / 2 - 1, y + h / 2 - 12, 3, 8, '#222');
  }

  render() {
    const { r, theme } = this;
    r.clear('#1c4022'); // grass

    // roadside rumble strips
    for (let y = -40 + this.scroll; y < r.h + 40; y += 40) {
      const red = Math.floor(y / 40) % 2 === 0;
      r.rect(this.roadX - 8, y, 8, 40, red ? '#c23b3b' : '#e8e8e8');
      r.rect(this.roadX + this.roadW, y, 8, 40, red ? '#e8e8e8' : '#c23b3b');
    }

    // road
    r.rect(this.roadX, 0, this.roadW, r.h, '#3a3f45');

    // lane dashes
    for (let i = 1; i < this.lanes; i++) {
      const x = this.roadX + (this.roadW / this.lanes) * i;
      for (let y = -40 + this.scroll; y < r.h + 40; y += 40) {
        r.rect(x - 2, y, 4, 22, 'rgba(255,255,255,0.35)');
      }
    }

    // pickups (fuel cans)
    for (const p of this.pickups) {
      r.rect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, '#ff5a5a');
      r.rect(p.x - p.w / 2 + 3, p.y - p.h / 2 - 4, 6, 4, '#ff5a5a');
      r.text('F', p.x, p.y + 4, { color: '#fff', size: 12, align: 'center', weight: 'bold' });
    }

    // traffic
    for (const t of this.traffic) this.drawCar(t.x, t.y, t.w, t.h, t.color);

    // player car (blink while invulnerable)
    const blink = this.invuln > 0 && Math.floor(performance.now() / 120) % 2 === 0;
    if (!blink) this.drawCar(this.car.x, this.car.y, this.car.w, this.car.h, theme.danger);

    // crash particles
    for (const p of this.particles) r.rect(p.x, p.y, 4, 4, p.color);

    // HUD: fuel bar + lives
    r.text('FUEL', 8, 18, { color: theme.text, size: 11 });
    r.strokeRect(8, 24, 60, 8, theme.text, 1);
    const fuelColor = this.fuel < 25 ? theme.danger : theme.accent;
    r.rect(8, 24, 60 * (this.fuel / 100), 8, fuelColor);
    for (let i = 0; i < this.lives; i++) {
      r.rect(r.w - 16 - i * 14, 12, 10, 16, theme.danger);
    }
    const kmh = Math.round(this.speed * 0.6);
    r.text(kmh + ' km/h', r.w - 10, r.h - 12, { color: theme.text, size: 12, align: 'right' });

    if (this.over) this.renderGameOver();
  }
}
