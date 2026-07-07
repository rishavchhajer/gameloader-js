import { GameBase } from './game-base.js';

/**
 * Archery — hold to draw the bow (power meter), release to fire an arrow
 * with projectile arc at a moving target. Score by ring accuracy.
 * You have a limited quiver; hits refill arrows, misses don't.
 * Controls: hold SPACE / hold pointer to draw, release to shoot.
 * Aim follows pointer Y (or Up/Down arrows).
 */
export class ArcheryGame extends GameBase {
  static id = 'archery';
  static hint = 'HOLD space/pointer to draw · release to shoot · aim with mouse or ↑↓';
  static width = 600;
  static height = 300;

  constructor(opts) {
    super(opts);
    this.input.on('keydown', (code) => {
      if (!this.over && code === 'Space') this.startDraw();
    });
    this.input.on('keyup', (code) => {
      if (!this.over && code === 'Space') this.release();
    });
    this.input.on('pointerdown', () => {
      if (!this.over) this.startDraw();
    });
    this.input.on('pointerup', () => {
      if (!this.over) this.release();
    });
    this.init();
  }

  init() {
    this.bow = { x: 60, y: this.r.h / 2, angle: 0 };
    this.drawing = false;
    this.power = 0;
    this.arrows = [];
    this.quiver = 5;
    this.gravity = 420;
    this.target = {
      x: this.r.w - 60,
      y: this.r.h / 2,
      r: 34,
      vy: 60,
      minY: 60,
      maxY: this.r.h - 60,
    };
    this.floatTexts = [];
  }

  startDraw() {
    if (this.quiver <= 0) return;
    this.drawing = true;
    this.power = 0;
  }

  release() {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.power < 0.08) return; // too weak, cancel
    this.quiver -= 1;
    const speed = 260 + this.power * 480;
    this.arrows.push({
      x: this.bow.x + 14,
      y: this.bow.y,
      vx: Math.cos(this.bow.angle) * speed,
      vy: Math.sin(this.bow.angle) * speed,
    });
  }

  update(dt) {
    if (this.over) return;

    // aim: pointer y or arrow keys tilt the shot angle
    const k = this.input.keys;
    if (k.has('ArrowUp')) this.bow.y -= 140 * dt;
    else if (k.has('ArrowDown')) this.bow.y += 140 * dt;
    else if (this.input.pointer.down || this.drawing) {
      // follow pointer while aiming (only when pointer engaged)
      if (this.input.pointer.y) {
        this.bow.y += (this.input.pointer.y - this.bow.y) * Math.min(1, dt * 8);
      }
    }
    this.bow.y = Math.max(30, Math.min(this.r.h - 30, this.bow.y));
    this.bow.angle = -0.12; // slight upward tilt; gravity does the rest

    // charge power
    if (this.drawing) this.power = Math.min(1, this.power + dt * 1.1);

    // target bobs up and down
    const t = this.target;
    t.y += t.vy * dt;
    if (t.y < t.minY || t.y > t.maxY) t.vy *= -1;

    // arrows fly
    for (const a of this.arrows) {
      a.vy += this.gravity * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      const dx = a.x - t.x, dy = a.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (!a.dead && dist <= t.r) {
        a.dead = true;
        // ring score: bullseye 50, then 30/20/10
        let pts = 10;
        if (dist < t.r * 0.25) pts = 50;
        else if (dist < t.r * 0.5) pts = 30;
        else if (dist < t.r * 0.75) pts = 20;
        this.addScore(pts);
        this.quiver = Math.min(7, this.quiver + (pts >= 30 ? 2 : 1));
        this.floatTexts.push({ x: t.x, y: t.y - t.r - 8, text: '+' + pts, life: 0.9 });
        // speed the target up a bit
        t.vy *= 1.06;
      }
      if (a.x > this.r.w + 20 || a.y > this.r.h + 20) a.dead = true;
    }
    this.arrows = this.arrows.filter((a) => !a.dead);

    // float texts
    for (const f of this.floatTexts) {
      f.y -= 30 * dt;
      f.life -= dt;
    }
    this.floatTexts = this.floatTexts.filter((f) => f.life > 0);

    // out of arrows and nothing in flight -> game over
    if (this.quiver <= 0 && this.arrows.length === 0 && !this.drawing) {
      this.gameOver();
    }
  }

  render() {
    const { r, theme } = this;
    r.clear(theme.canvasBg);

    // ground line
    r.line(0, r.h - 12, r.w, r.h - 12, 'rgba(255,255,255,0.15)', 1);

    // target: concentric rings on a stand
    const t = this.target;
    r.line(t.x, t.y + t.r, t.x, r.h - 12, theme.text, 3);
    r.circle(t.x, t.y, t.r, '#f5f5f5');
    r.circle(t.x, t.y, t.r * 0.75, theme.danger);
    r.circle(t.x, t.y, t.r * 0.5, '#f5f5f5');
    r.circle(t.x, t.y, t.r * 0.25, theme.danger);

    // bow (arc + string)
    const b = this.bow;
    const pull = this.drawing ? this.power * 12 : 0;
    r.ctx.strokeStyle = theme.accent;
    r.ctx.lineWidth = 3;
    r.ctx.beginPath();
    r.ctx.arc(b.x, b.y, 26, -Math.PI / 2.4, Math.PI / 2.4);
    r.ctx.stroke();
    const topY = b.y - 26 * Math.sin(Math.PI / 2.4);
    const botY = b.y + 26 * Math.sin(Math.PI / 2.4);
    const tipX = b.x + 26 * Math.cos(Math.PI / 2.4);
    r.line(tipX, topY, b.x - pull, b.y, theme.text, 1);
    r.line(b.x - pull, b.y, tipX, botY, theme.text, 1);

    // nocked arrow while drawing
    if (this.drawing) {
      r.line(b.x - pull, b.y, b.x + 30, b.y, theme.text, 2);
      r.triangle(b.x + 34, b.y, b.x + 26, b.y - 4, b.x + 26, b.y + 4, theme.text);
      // power meter
      r.strokeRect(b.x - 20, b.y + 40, 60, 8, theme.text, 1);
      const pc = this.power > 0.8 ? theme.danger : theme.accent;
      r.rect(b.x - 20, b.y + 40, 60 * this.power, 8, pc);
    }

    // flying arrows (oriented by velocity)
    for (const a of this.arrows) {
      const ang = Math.atan2(a.vy, a.vx);
      const len = 16;
      r.line(a.x - Math.cos(ang) * len, a.y - Math.sin(ang) * len, a.x, a.y, theme.text, 2);
      r.triangle(
        a.x + Math.cos(ang) * 5, a.y + Math.sin(ang) * 5,
        a.x - Math.sin(ang) * 3, a.y + Math.cos(ang) * 3,
        a.x + Math.sin(ang) * 3, a.y - Math.cos(ang) * 3,
        theme.text
      );
    }

    // quiver indicator
    for (let i = 0; i < this.quiver; i++) {
      r.line(14 + i * 10, 14, 14 + i * 10, 30, theme.accent, 2);
      r.triangle(14 + i * 10, 12, 11 + i * 10, 18, 17 + i * 10, 18, theme.accent);
    }

    // floating score texts
    for (const f of this.floatTexts) {
      r.text(f.text, f.x, f.y, { color: theme.accent, size: 14, align: 'center', weight: 'bold' });
    }

    if (this.over) this.renderGameOver();
  }
}
