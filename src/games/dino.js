import { GameBase } from './game-base.js';

/**
 * Dino Runner — jump over cacti, duck under birds. Speed ramps up.
 * Controls: Space / ArrowUp / tap = jump, ArrowDown = duck.
 */
export class DinoGame extends GameBase {
  static id = 'dino';
  static hint = 'SPACE / TAP to jump · ARROW DOWN to duck';
  static width = 600;
  static height = 220;

  constructor(opts) {
    super(opts);
    this.input.on('keydown', (code) => {
      if (!this.over && (code === 'Space' || code === 'ArrowUp')) this.jump();
    });
    this.input.on('pointerdown', () => {
      if (!this.over) this.jump();
    });
    this.init();
  }

  init() {
    this.groundY = this.r.h - 30;
    this.dino = {
      x: 50, y: this.groundY, w: 26, h: 40,
      vy: 0, jumping: false, ducking: false,
    };
    this.gravity = 2200;
    this.jumpV = -780;
    this.speed = 260;
    this.maxSpeed = 620;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnEvery = 1.4;
    this.distance = 0;
    this.legTick = 0;
  }

  jump() {
    if (!this.dino.jumping) {
      this.dino.vy = this.jumpV;
      this.dino.jumping = true;
    }
  }

  update(dt) {
    if (this.over) return;
    const d = this.dino;

    // duck state (keyboard only)
    d.ducking = this.input.keys.has('ArrowDown') && !d.jumping;

    // physics
    d.vy += this.gravity * dt;
    d.y += d.vy * dt;
    if (d.y >= this.groundY) {
      d.y = this.groundY;
      d.vy = 0;
      d.jumping = false;
    }

    // difficulty ramp
    this.speed = Math.min(this.maxSpeed, this.speed + 8 * dt);
    this.spawnEvery = Math.max(0.75, this.spawnEvery - 0.01 * dt);

    // spawn obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnEvery * (0.7 + Math.random() * 0.6);
      const isBird = this.speed > 350 && Math.random() < 0.3;
      if (isBird) {
        // Bird hitbox spans groundY-46 .. groundY-28: hits a standing dino
        // (top at groundY-40) but clears a ducking one (top at groundY-22).
        this.obstacles.push({
          x: this.r.w + 20, y: this.groundY - 28, w: 30, h: 18, bird: true,
        });
      } else {
        const h = 25 + Math.random() * 25;
        const w = 14 + Math.random() * 18;
        this.obstacles.push({ x: this.r.w + 20, y: this.groundY, w, h, bird: false });
      }
    }

    // move obstacles, collide
    const dw = d.ducking ? d.w + 10 : d.w;
    const dh = d.ducking ? d.h * 0.55 : d.h;
    const dx = d.x, dy = d.y - dh;
    for (const o of this.obstacles) {
      o.x -= this.speed * dt;
      const oy = o.y - o.h;
      if (dx < o.x + o.w && dx + dw > o.x && dy < oy + o.h && dy + dh > oy) {
        this.gameOver();
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > -10);

    // score = distance
    this.distance += this.speed * dt;
    this.setScore(Math.floor(this.distance / 10));
    this.legTick += dt * 10;
  }

  render() {
    const { r, theme } = this;
    r.clear(theme.canvasBg);

    // ground
    r.line(0, this.groundY + 1, r.w, this.groundY + 1, theme.text, 2);

    // dino (rects: body + head + legs)
    const d = this.dino;
    const duck = d.ducking;
    const h = duck ? d.h * 0.55 : d.h;
    const w = duck ? d.w + 10 : d.w;
    const bx = d.x, by = d.y - h;
    r.rect(bx, by, w, h - 8, theme.accent);                      // body
    r.rect(bx + w - 10, by - (duck ? 0 : 10), 14, 12, theme.accent); // head
    // legs animate
    const step = Math.floor(this.legTick) % 2 === 0;
    if (!d.jumping) {
      r.rect(bx + 3, d.y - 8, 6, step ? 8 : 5, theme.accent);
      r.rect(bx + w - 9, d.y - 8, 6, step ? 5 : 8, theme.accent);
    } else {
      r.rect(bx + 3, d.y - 8, 6, 6, theme.accent);
      r.rect(bx + w - 9, d.y - 8, 6, 6, theme.accent);
    }

    // obstacles
    for (const o of this.obstacles) {
      if (o.bird) {
        const flap = Math.floor(this.legTick) % 2 === 0;
        // body bottom-aligned with hitbox bottom, wings flap above
        const bodyTop = o.y - o.h * 0.6;
        r.rect(o.x, bodyTop, o.w, o.h * 0.6, theme.danger);
        r.triangle(
          o.x + o.w / 2, bodyTop,
          o.x + o.w / 2 + 10, bodyTop - (flap ? 10 : -2),
          o.x + o.w / 2 - 10, bodyTop - (flap ? 10 : -2),
          theme.danger
        );
      } else {
        r.rect(o.x, o.y - o.h, o.w, o.h, theme.danger);
        r.rect(o.x - 5, o.y - o.h * 0.6, 5, 6, theme.danger);
        r.rect(o.x + o.w, o.y - o.h * 0.5, 5, 6, theme.danger);
      }
    }

    if (this.over) this.renderGameOver();
  }
}
