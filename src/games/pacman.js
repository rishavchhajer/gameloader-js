import { GameBase } from './game-base.js';

/**
 * Pacman — eat all pellets while dodging three ghosts. Power pellets in the
 * corners turn the tables for a few seconds. Clearing the maze starts a
 * faster level.
 * Controls: Arrows / WASD. Touch: swipe to turn.
 *
 * Movement is tile-to-tile with interpolation: every entity walks from its
 * current tile to an adjacent one (progress 0..1); decisions happen only on
 * tile arrival, which keeps wall collision exact.
 */

// 19 x 15 maze: # wall, . pellet, o power pellet, P pacman start, G ghost start
const MAZE = [
  '###################',
  '#o.......#.......o#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '#.##.###.#.###.##.#',
  '#.#....G.G.G....#.#',
  '#.##.###.#.###.##.#',
  '#....#...#...#....#',
  '#.##.#.#####.#.##.#',
  '#........P........#',
  '#.##.###.#.###.##.#',
  '#o.......#.......o#',
  '###################',
];

const GHOST_COLORS = ['#ff4d6a', '#ff9a4d', '#4dd2ff'];
const FRIGHT_TIME = 6; // seconds of power mode
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class PacmanGame extends GameBase {
  static id = 'pacman';
  static hint = 'ARROWS / WASD to steer · touch: swipe · corner pellets = power';
  static width = 19 * 22;        // 418
  static height = 15 * 22 + 30;  // maze + status line

  constructor(opts) {
    super(opts);
    const KEYS = {
      ArrowUp: [0, -1], KeyW: [0, -1],
      ArrowDown: [0, 1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], KeyA: [-1, 0],
      ArrowRight: [1, 0], KeyD: [1, 0],
    };
    this.input.on('keydown', (code) => {
      if (!this.over && KEYS[code]) this.desired = KEYS[code];
    });
    this.input.on('pointerdown', (p) => {
      if (!this.over) this._swipeStart = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p) => {
      if (this.over || !this._swipeStart) return;
      const dx = p.x - this._swipeStart.x;
      const dy = p.y - this._swipeStart.y;
      this._swipeStart = null;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      this.desired = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    });
    this.init();
  }

  init() {
    this.cols = MAZE[0].length;
    this.rows = MAZE.length;
    this.cell = 22;
    this.level = 1;
    this.lives = 3;
    this.fright = 0;
    this.mouthTick = 0;
    this.desired = [-1, 0];
    this._swipeStart = null;
    this.loadMaze();
    this.resetPositions();
  }

  loadMaze() {
    this.walls = [];
    this.pellets = new Map(); // "x,y" -> 1 (pellet) | 2 (power)
    this.pacStart = null;
    this.ghostStarts = [];
    for (let y = 0; y < this.rows; y++) {
      this.walls.push([]);
      for (let x = 0; x < this.cols; x++) {
        const ch = MAZE[y][x];
        this.walls[y].push(ch === '#');
        if (ch === '.') this.pellets.set(x + ',' + y, 1);
        if (ch === 'o') this.pellets.set(x + ',' + y, 2);
        if (ch === 'P') this.pacStart = { x, y };
        if (ch === 'G') this.ghostStarts.push({ x, y });
      }
    }
  }

  resetPositions() {
    const speedUp = 1 + (this.level - 1) * 0.08;
    this.pac = this.makeEntity(this.pacStart, 4.4 * speedUp);
    this.pac.dir = [-1, 0];
    this.desired = [-1, 0];
    this.ghosts = this.ghostStarts.map((g, i) =>
      Object.assign(this.makeEntity(g, 3.6 * speedUp), {
        color: GHOST_COLORS[i % GHOST_COLORS.length],
        home: { ...g },
      })
    );
    this.fright = 0;
  }

  makeEntity(tile, speed) {
    return {
      tx: tile.x, ty: tile.y,   // current tile
      ntx: tile.x, nty: tile.y, // tile being walked to
      p: 1,                     // progress toward next tile (1 = arrived)
      dir: [0, 0],
      speed,                    // tiles per second
    };
  }

  isWall(x, y) {
    // wrap for (potential) tunnels
    const wx = (x + this.cols) % this.cols;
    const wy = (y + this.rows) % this.rows;
    return this.walls[wy][wx];
  }

  /** Advance an entity; call `decide(entity)` on every tile arrival. */
  walk(e, dt, decide) {
    let remaining = e.speed * dt;
    while (remaining > 0) {
      if (e.p >= 1) {
        // arrived: snap to next tile (with wrap) and pick a new direction
        e.tx = (e.ntx + this.cols) % this.cols;
        e.ty = (e.nty + this.rows) % this.rows;
        decide(e);
        if (e.dir[0] === 0 && e.dir[1] === 0) return; // stopped
        e.ntx = e.tx + e.dir[0];
        e.nty = e.ty + e.dir[1];
        e.p = 0;
      }
      const step = Math.min(remaining, 1 - e.p);
      e.p += step;
      remaining -= step;
    }
  }

  pixelPos(e) {
    const x = (e.tx + (e.ntx - e.tx) * e.p + 0.5) * this.cell;
    const y = (e.ty + (e.nty - e.ty) * e.p + 0.5) * this.cell;
    return { x, y };
  }

  decidePac(e) {
    const [ddx, ddy] = this.desired;
    if (!this.isWall(e.tx + ddx, e.ty + ddy)) {
      e.dir = [ddx, ddy];
    } else if (this.isWall(e.tx + e.dir[0], e.ty + e.dir[1])) {
      e.dir = [0, 0]; // blocked both ways: stop
    }
  }

  decideGhost(g) {
    const options = DIRS.filter(([dx, dy]) => !this.isWall(g.tx + dx, g.ty + dy));
    let choices = options;
    if (options.length > 1) {
      // don't reverse unless dead end
      choices = options.filter(([dx, dy]) => !(dx === -g.dir[0] && dy === -g.dir[1]));
      if (choices.length === 0) choices = options;
    }
    const frightened = this.fright > 0 && !g.calm;
    if (Math.random() < 0.25) {
      g.dir = choices[(Math.random() * choices.length) | 0];
      return;
    }
    // chase pacman (or flee when frightened) by manhattan distance
    let best = choices[0];
    let bestScore = frightened ? -Infinity : Infinity;
    for (const [dx, dy] of choices) {
      const dist =
        Math.abs(g.tx + dx - this.pac.tx) + Math.abs(g.ty + dy - this.pac.ty);
      if (frightened ? dist > bestScore : dist < bestScore) {
        bestScore = dist;
        best = [dx, dy];
      }
    }
    g.dir = best;
  }

  update(dt) {
    if (this.over) return;
    this.mouthTick += dt * 10;
    if (this.fright > 0) this.fright = Math.max(0, this.fright - dt);

    // pacman moves; if stopped, retry desired direction immediately
    this.walk(this.pac, dt, (e) => this.decidePac(e));
    if (this.pac.dir[0] === 0 && this.pac.dir[1] === 0) this.decidePac(this.pac);

    // eat pellet on current tile
    const key = this.pac.tx + ',' + this.pac.ty;
    const pellet = this.pellets.get(key);
    if (pellet) {
      this.pellets.delete(key);
      if (pellet === 2) {
        this.addScore(50);
        this.fright = FRIGHT_TIME;
        for (const g of this.ghosts) g.calm = false; // everyone edible again
      } else {
        this.addScore(10);
      }
      if (this.pellets.size === 0) {
        this.level += 1;
        this.loadMaze();
        this.resetPositions();
        return;
      }
    }

    // ghosts move (slower while frightened)
    for (const g of this.ghosts) {
      const saved = g.speed;
      if (this.fright > 0) g.speed = saved * 0.6;
      this.walk(g, dt, (e) => this.decideGhost(e));
      g.speed = saved;
    }

    // collisions (pixel distance)
    const pp = this.pixelPos(this.pac);
    for (const g of this.ghosts) {
      const gp = this.pixelPos(g);
      if (Math.hypot(pp.x - gp.x, pp.y - gp.y) < this.cell * 0.6) {
        if (this.fright > 0 && !g.calm) {
          // eat ghost: send it home; it stays inedible ("calm") until the
          // next power pellet, so it can't be farmed at its home tile
          this.addScore(200);
          Object.assign(g, this.makeEntity(g.home, g.speed));
          g.calm = true;
        } else {
          this.lives -= 1;
          if (this.lives <= 0) {
            this.gameOver();
          } else {
            this.resetPositions();
          }
          return;
        }
      }
    }
  }

  render() {
    const { r, theme } = this;
    r.clear(theme.canvasBg);
    const c = this.cell;

    // walls
    r.ctx.save();
    r.ctx.globalAlpha = 0.4;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.walls[y][x]) r.rect(x * c + 1, y * c + 1, c - 2, c - 2, theme.accent);
      }
    }
    r.ctx.restore();

    // pellets
    for (const [key, type] of this.pellets) {
      const [x, y] = key.split(',').map(Number);
      if (type === 2) {
        const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 150);
        r.circle(x * c + c / 2, y * c + c / 2, 5 * pulse, theme.text);
      } else {
        r.circle(x * c + c / 2, y * c + c / 2, 2, theme.text);
      }
    }

    // pacman (arc with chomping mouth, rotated to direction)
    const pp = this.pixelPos(this.pac);
    const moving = this.pac.dir[0] !== 0 || this.pac.dir[1] !== 0;
    const mouth = moving ? (0.08 + 0.22 * Math.abs(Math.sin(this.mouthTick))) * Math.PI : 0.15 * Math.PI;
    const ang = Math.atan2(this.pac.dir[1], this.pac.dir[0]);
    r.ctx.fillStyle = '#ffd24d';
    r.ctx.beginPath();
    r.ctx.moveTo(pp.x, pp.y);
    r.ctx.arc(pp.x, pp.y, c / 2 - 2, ang + mouth, ang - mouth);
    r.ctx.closePath();
    r.ctx.fill();

    // ghosts
    const flash = this.fright > 0 && this.fright < 2 && Math.floor(performance.now() / 200) % 2 === 0;
    for (const g of this.ghosts) {
      const gp = this.pixelPos(g);
      const frightened = this.fright > 0 && !g.calm;
      const color = frightened ? (flash ? '#f5f5f5' : '#4d6aff') : g.color;
      const rad = c / 2 - 3;
      // dome + skirt
      r.ctx.fillStyle = color;
      r.ctx.beginPath();
      r.ctx.arc(gp.x, gp.y - 1, rad, Math.PI, 0);
      r.ctx.rect(gp.x - rad, gp.y - 1, rad * 2, rad);
      r.ctx.fill();
      // eyes
      r.circle(gp.x - 3, gp.y - 3, 2, '#fff');
      r.circle(gp.x + 3, gp.y - 3, 2, '#fff');
      r.circle(gp.x - 3 + g.dir[0], gp.y - 3 + g.dir[1], 1, '#222');
      r.circle(gp.x + 3 + g.dir[0], gp.y - 3 + g.dir[1], 1, '#222');
    }

    // status line: lives + level
    const sy = this.rows * c + 19;
    for (let i = 0; i < this.lives; i++) {
      r.ctx.fillStyle = '#ffd24d';
      r.ctx.beginPath();
      r.ctx.moveTo(14 + i * 22, sy);
      r.ctx.arc(14 + i * 22, sy, 7, 0.25 * Math.PI, -0.25 * Math.PI);
      r.ctx.closePath();
      r.ctx.fill();
    }
    r.text('LEVEL ' + this.level, r.w - 12, sy + 4, {
      color: theme.text, size: 12, align: 'right',
    });

    if (this.over) this.renderGameOver();
  }
}
