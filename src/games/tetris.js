import { GameBase } from './game-base.js';

const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const COLORS = {
  I: '#4dd2ff', O: '#ffd24d', T: '#c04dff',
  S: '#4dff88', Z: '#ff4d6a', J: '#4d6aff', L: '#ff9a4d',
};
const NAMES = Object.keys(SHAPES);

/**
 * Tetris — classic falling blocks on a 10x18 grid.
 * Controls: Left/Right move, Up rotate, Down soft drop, Space hard drop.
 * Touch: tap left/right thirds to move, tap middle to rotate, swipe down to drop.
 */
export class TetrisGame extends GameBase {
  static id = 'tetris';
  static hint = 'ARROWS move/rotate · SPACE drop · touch: tap sides/middle, swipe down';
  static width = 340;
  static height = 440;

  constructor(opts) {
    super(opts);
    this.input.on('keydown', (code) => {
      if (this.over) return;
      if (code === 'ArrowLeft') this.move(-1);
      if (code === 'ArrowRight') this.move(1);
      if (code === 'ArrowUp') this.rotate();
      if (code === 'Space') this.hardDrop();
    });
    this.input.on('pointerdown', (p) => {
      if (this.over) return;
      this._touchStart = { x: p.x, y: p.y, t: performance.now() };
    });
    this.input.on('pointerup', (p) => {
      if (this.over || !this._touchStart) return;
      const dy = p.y - this._touchStart.y;
      const dt = performance.now() - this._touchStart.t;
      if (dy > 60 && dt < 400) {
        this.hardDrop();
      } else if (dt < 300) {
        const third = this.r.w / 3;
        if (p.x < third) this.move(-1);
        else if (p.x > third * 2) this.move(1);
        else this.rotate();
      }
      this._touchStart = null;
    });
    this.init();
  }

  init() {
    this.cols = 10;
    this.rows = 18;
    this.cell = 22;
    this.gridX = (this.r.w - this.cols * this.cell) / 2 - 40;
    this.gridY = (this.r.h - this.rows * this.cell) / 2;
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.dropEvery = 0.8;
    this.dropTimer = 0;
    this.softTimer = 0;
    this.lines = 0;
    this.next = this.randPiece();
    this.spawn();
  }

  randPiece() {
    const name = NAMES[(Math.random() * NAMES.length) | 0];
    return { name, cells: SHAPES[name].map(([x, y]) => [x, y]), x: 3, y: 0 };
  }

  spawn() {
    this.piece = this.next;
    this.piece.x = 3;
    this.piece.y = 0;
    this.next = this.randPiece();
    if (this.collides(this.piece.cells, this.piece.x, this.piece.y)) {
      this.gameOver();
    }
  }

  collides(cells, px, py) {
    for (const [cx, cy] of cells) {
      const x = px + cx, y = py + cy;
      if (x < 0 || x >= this.cols || y >= this.rows) return true;
      if (y >= 0 && this.grid[y][x]) return true;
    }
    return false;
  }

  move(dir) {
    if (!this.collides(this.piece.cells, this.piece.x + dir, this.piece.y)) {
      this.piece.x += dir;
    }
  }

  rotate() {
    if (this.piece.name === 'O') return;
    const rotated = this.piece.cells.map(([x, y]) => [-y + 1, x]); // 90° around (1,1)-ish pivot
    // normalize to non-negative
    const minX = Math.min(...rotated.map((c) => c[0]));
    const minY = Math.min(...rotated.map((c) => c[1]));
    const cells = rotated.map(([x, y]) => [x - minX, y - minY]);
    // try in place, then wall kicks
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!this.collides(cells, this.piece.x + kick, this.piece.y)) {
        this.piece.cells = cells;
        this.piece.x += kick;
        return;
      }
    }
  }

  step() {
    if (!this.collides(this.piece.cells, this.piece.x, this.piece.y + 1)) {
      this.piece.y += 1;
      return true;
    }
    this.lock();
    return false;
  }

  hardDrop() {
    while (this.step()) { /* fall */ }
  }

  lock() {
    for (const [cx, cy] of this.piece.cells) {
      const x = this.piece.x + cx, y = this.piece.y + cy;
      if (y >= 0) this.grid[y][x] = COLORS[this.piece.name];
    }
    // clear lines
    let cleared = 0;
    this.grid = this.grid.filter((row) => {
      if (row.every((c) => c)) { cleared++; return false; }
      return true;
    });
    while (this.grid.length < this.rows) this.grid.unshift(Array(this.cols).fill(null));
    if (cleared) {
      this.lines += cleared;
      this.addScore([0, 100, 300, 500, 800][cleared]);
      this.dropEvery = Math.max(0.15, 0.8 - this.lines * 0.02);
    }
    this.spawn();
  }

  update(dt) {
    if (this.over) return;
    // soft drop
    if (this.input.keys.has('ArrowDown')) {
      this.softTimer += dt;
      if (this.softTimer > 0.05) {
        this.softTimer = 0;
        this.step();
        this.dropTimer = 0;
      }
    }
    this.dropTimer += dt;
    if (this.dropTimer >= this.dropEvery) {
      this.dropTimer = 0;
      this.step();
    }
  }

  drawCell(gx, gy, color) {
    const { r } = this;
    const x = this.gridX + gx * this.cell;
    const y = this.gridY + gy * this.cell;
    r.rect(x + 1, y + 1, this.cell - 2, this.cell - 2, color);
  }

  render() {
    const { r, theme } = this;
    r.clear(theme.canvasBg);

    // board frame
    r.strokeRect(this.gridX - 1, this.gridY - 1, this.cols * this.cell + 2, this.rows * this.cell + 2, theme.accent, 2);

    // settled cells
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x]) this.drawCell(x, y, this.grid[y][x]);
      }
    }

    // active piece + ghost
    if (!this.over && this.piece) {
      let gy = this.piece.y;
      while (!this.collides(this.piece.cells, this.piece.x, gy + 1)) gy++;
      for (const [cx, cy] of this.piece.cells) {
        if (gy + cy >= 0) {
          const x = this.gridX + (this.piece.x + cx) * this.cell;
          const y = this.gridY + (gy + cy) * this.cell;
          r.strokeRect(x + 1, y + 1, this.cell - 2, this.cell - 2, 'rgba(255,255,255,0.25)', 1);
        }
      }
      for (const [cx, cy] of this.piece.cells) {
        if (this.piece.y + cy >= 0) {
          this.drawCell(this.piece.x + cx, this.piece.y + cy, COLORS[this.piece.name]);
        }
      }
    }

    // next piece preview
    const px = this.gridX + this.cols * this.cell + 16;
    r.text('NEXT', px, this.gridY + 12, { color: theme.text, size: 12 });
    for (const [cx, cy] of this.next.cells) {
      r.rect(px + cx * 14, this.gridY + 22 + cy * 14, 12, 12, COLORS[this.next.name]);
    }
    r.text('LINES', px, this.gridY + 100, { color: theme.text, size: 12 });
    r.text(String(this.lines), px, this.gridY + 118, { color: theme.accent, size: 16, weight: 'bold' });

    if (this.over) this.renderGameOver();
  }
}
