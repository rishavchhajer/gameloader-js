import { GameBase } from './game-base.js';

/**
 * Snake — classic grid snake. Eat food to grow and score; speed ramps up
 * with every meal. Hitting a wall or yourself ends the game.
 * Controls: Arrow keys / WASD. Touch: swipe in the direction to turn.
 */
export class SnakeGame extends GameBase {
  static id = 'snake';
  static hint = 'ARROWS / WASD to steer · touch: swipe to turn';
  static width = 400;
  static height = 400;

  constructor(opts) {
    super(opts);
    const DIRS = {
      ArrowUp: [0, -1], KeyW: [0, -1],
      ArrowDown: [0, 1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], KeyA: [-1, 0],
      ArrowRight: [1, 0], KeyD: [1, 0],
    };
    this.input.on('keydown', (code) => {
      if (!this.over && DIRS[code]) this.turn(DIRS[code]);
    });
    this.input.on('pointerdown', (p) => {
      if (!this.over) this._swipeStart = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p) => {
      if (this.over || !this._swipeStart) return;
      const dx = p.x - this._swipeStart.x;
      const dy = p.y - this._swipeStart.y;
      this._swipeStart = null;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return; // too small
      if (Math.abs(dx) > Math.abs(dy)) this.turn([Math.sign(dx), 0]);
      else this.turn([0, Math.sign(dy)]);
    });
    this.init();
  }

  init() {
    this.cols = 20;
    this.rows = 20;
    this.cell = this.r.w / this.cols;
    const cx = (this.cols / 2) | 0;
    const cy = (this.rows / 2) | 0;
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    this.dir = [1, 0];        // current direction
    this.nextDir = [1, 0];    // buffered turn (applied on next step)
    this.stepEvery = 0.14;
    this.stepTimer = 0;
    this._swipeStart = null;
    this.food = null;
    this.placeFood();
  }

  turn([dx, dy]) {
    // disallow reversing into yourself
    if (dx === -this.dir[0] && dy === -this.dir[1]) return;
    this.nextDir = [dx, dy];
  }

  placeFood() {
    const free = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    if (free.length === 0) {
      // board full — you win; treat as game over with max glory
      this.food = null;
      this.gameOver();
      return;
    }
    this.food = free[(Math.random() * free.length) | 0];
  }

  step() {
    this.dir = this.nextDir;
    const head = this.snake[0];
    const nx = head.x + this.dir[0];
    const ny = head.y + this.dir[1];

    // wall collision
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.gameOver();
      return;
    }
    // self collision (tail cell is fine — it moves away this step, unless we just ate)
    const willGrow = this.food && nx === this.food.x && ny === this.food.y;
    const body = willGrow ? this.snake : this.snake.slice(0, -1);
    if (body.some((s) => s.x === nx && s.y === ny)) {
      this.gameOver();
      return;
    }

    this.snake.unshift({ x: nx, y: ny });
    if (willGrow) {
      this.addScore(10);
      this.stepEvery = Math.max(0.06, this.stepEvery - 0.003);
      this.placeFood();
    } else {
      this.snake.pop();
    }
  }

  update(dt) {
    if (this.over) return;
    this.stepTimer += dt;
    if (this.stepTimer >= this.stepEvery) {
      this.stepTimer = 0;
      this.step();
    }
  }

  render() {
    const { r, theme } = this;
    r.clear(theme.canvasBg);

    // subtle grid
    for (let i = 1; i < this.cols; i++) {
      r.line(i * this.cell, 0, i * this.cell, r.h, 'rgba(255,255,255,0.04)', 1);
      r.line(0, i * this.cell, r.w, i * this.cell, 'rgba(255,255,255,0.04)', 1);
    }

    // food (pulsing circle)
    if (this.food) {
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 180);
      r.circle(
        this.food.x * this.cell + this.cell / 2,
        this.food.y * this.cell + this.cell / 2,
        (this.cell / 2 - 3) * pulse,
        theme.danger
      );
    }

    // snake (head brighter, body slightly inset)
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const s = this.snake[i];
      const inset = i === 0 ? 1 : 2;
      r.rect(
        s.x * this.cell + inset,
        s.y * this.cell + inset,
        this.cell - inset * 2,
        this.cell - inset * 2,
        i === 0 ? theme.text : theme.accent
      );
    }

    if (this.over) this.renderGameOver();
  }
}
