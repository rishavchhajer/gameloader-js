import { GameBase } from './game-base.js';

/**
 * Shooter — space-invaders style. Move ship left/right, shoot descending
 * enemies. Enemies get faster as score climbs.
 * Controls: Arrow keys / A-D to move, Space to shoot.
 * Touch: drag to move, ship auto-fires.
 */
export class ShooterGame extends GameBase {
  static id = 'shooter';
  static hint = 'ARROWS to move · SPACE to shoot · touch: drag (auto-fire)';
  static width = 480;
  static height = 360;

  constructor(opts) {
    super(opts);
    this.touchActive = false;
    this.input.on('pointerdown', (p) => {
      if (!this.over) {
        this.touchActive = true;
        this.ship.tx = p.x;
      }
    });
    this.input.on('pointermove', (p) => {
      if (this.input.pointer.down) this.ship.tx = p.x;
    });
    this.init();
  }

  init() {
    this.ship = { x: this.r.w / 2, y: this.r.h - 30, w: 30, h: 18, speed: 320, tx: null };
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.cooldown = 0;
    this.spawnTimer = 0;
    this.wave = 1;
  }

  shoot() {
    if (this.cooldown > 0) return;
    this.cooldown = 0.25;
    this.bullets.push({ x: this.ship.x, y: this.ship.y - 12, vy: -520 });
  }

  update(dt) {
    if (this.over) return;
    const s = this.ship;

    // keyboard movement
    const k = this.input.keys;
    if (k.has('ArrowLeft') || k.has('KeyA')) { s.x -= s.speed * dt; s.tx = null; }
    if (k.has('ArrowRight') || k.has('KeyD')) { s.x += s.speed * dt; s.tx = null; }
    if (k.has('Space')) this.shoot();

    // touch target movement + autofire
    if (s.tx != null && this.input.pointer.down) {
      const diff = s.tx - s.x;
      s.x += Math.sign(diff) * Math.min(Math.abs(diff), s.speed * dt);
      this.shoot();
    }
    s.x = Math.max(s.w / 2, Math.min(this.r.w - s.w / 2, s.x));

    this.cooldown -= dt;

    // spawn enemies
    this.spawnTimer -= dt;
    const difficulty = 1 + this.score / 200;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.35, 1.1 / difficulty);
      this.enemies.push({
        x: 20 + Math.random() * (this.r.w - 40),
        y: -15,
        w: 24, h: 16,
        vy: (50 + Math.random() * 50) * difficulty,
        vx: (Math.random() - 0.5) * 60,
      });
    }

    // bullets
    for (const b of this.bullets) b.y += b.vy * dt;
    this.bullets = this.bullets.filter((b) => b.y > -10);

    // enemies
    for (const e of this.enemies) {
      e.y += e.vy * dt;
      e.x += e.vx * dt;
      if (e.x < e.w / 2 || e.x > this.r.w - e.w / 2) e.vx *= -1;
      // reached bottom -> game over
      if (e.y + e.h / 2 >= this.r.h) this.gameOver();
      // hit ship
      if (
        Math.abs(e.x - s.x) < (e.w + s.w) / 2 &&
        Math.abs(e.y - s.y) < (e.h + s.h) / 2
      ) {
        this.gameOver();
      }
    }

    // bullet-enemy collisions
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (Math.abs(b.x - e.x) < e.w / 2 + 3 && Math.abs(b.y - e.y) < e.h / 2 + 6) {
          e.dead = true;
          b.dead = true;
          this.addScore(10);
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x: e.x, y: e.y,
              vx: (Math.random() - 0.5) * 240,
              vy: (Math.random() - 0.5) * 240,
              life: 0.4,
            });
          }
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  render() {
    const { r, theme } = this;
    r.clear(theme.canvasBg);

    // stars backdrop (deterministic, cheap)
    for (let i = 0; i < 30; i++) {
      const x = (i * 97) % r.w;
      const y = (i * 53 + ((performance.now() / 40 + i * 13) % r.h)) % r.h;
      r.rect(x, y, 2, 2, 'rgba(255,255,255,0.25)');
    }

    // ship (triangle + base)
    const s = this.ship;
    r.triangle(s.x, s.y - s.h, s.x - s.w / 2, s.y + s.h / 2, s.x + s.w / 2, s.y + s.h / 2, theme.accent);
    r.rect(s.x - 4, s.y + s.h / 2, 8, 4, theme.accent);

    // bullets
    for (const b of this.bullets) r.rect(b.x - 2, b.y - 8, 4, 10, theme.text);

    // enemies
    for (const e of this.enemies) {
      r.rect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, theme.danger);
      r.rect(e.x - e.w / 2 - 4, e.y - 3, 4, 6, theme.danger);
      r.rect(e.x + e.w / 2, e.y - 3, 4, 6, theme.danger);
    }

    // particles
    for (const p of this.particles) {
      r.rect(p.x, p.y, 3, 3, theme.accent);
    }

    if (this.over) this.renderGameOver();
  }
}
