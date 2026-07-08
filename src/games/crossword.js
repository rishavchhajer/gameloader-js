import { GameBase } from './game-base.js';

/**
 * Crossword — mini word-square crosswords: every row AND every column is a
 * word. Select a cell, type letters (physical keyboard or the on-screen
 * one), correct letters score points; finish the grid to get a bonus and a
 * fresh puzzle. There is no game over — it's a relaxing loader pastime.
 *
 * Controls: click/tap a cell (again to switch ROW/COL), type A-Z,
 * Backspace deletes, arrows move, Space/Enter toggles direction.
 */

// Perfect word squares: row i === column i, so one clue list covers both.
const PUZZLES = [
  {
    rows: ['CARD', 'AREA', 'REAR', 'DART'],
    clues: [
      'Ace of spades, e.g.',
      'Length times width',
      'Back side',
      'Pub game projectile',
    ],
  },
  {
    rows: ['LANE', 'AREA', 'NEAR', 'EARS'],
    clues: [
      'Bowling alley unit',
      'Length times width',
      'Close by',
      'They do the hearing',
    ],
  },
  {
    rows: ['HEART', 'EMBER', 'ABUSE', 'RESIN', 'TREND'],
    clues: [
      'Valentine symbol',
      'Glowing coal bit',
      'Cruel treatment',
      'Sticky tree secretion',
      "What's hot right now",
    ],
  },
];

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export class CrosswordGame extends GameBase {
  static id = 'crossword';
  static hint = 'tap a cell (again = row/col) · type letters · finish the grid';
  static width = 330;
  static height = 340;

  constructor(opts) {
    super(opts);
    this.input.on('keydown', (code) => {
      if (this.flash) return;
      if (code.startsWith('Key') && code.length === 4) this.type(code.slice(3));
      else if (code === 'Backspace') this.erase();
      else if (code === 'Space' || code === 'Enter') this.dirAcross = !this.dirAcross;
      else if (code === 'ArrowLeft') this.moveSel(-1, 0);
      else if (code === 'ArrowRight') this.moveSel(1, 0);
      else if (code === 'ArrowUp') this.moveSel(0, -1);
      else if (code === 'ArrowDown') this.moveSel(0, 1);
    });
    this.input.on('pointerdown', (p) => {
      if (this.flash) return;
      this.tap(p.x, p.y);
    });
    this.init();
  }

  init() {
    this.cell = 32;
    this.gridY = 42;
    this.keysTop = 216;
    this.keyH = 30;
    this.puzzleIndex = 0;
    this.flash = null; // { text, t } shown between puzzles
    this.buildKeys();
    this.loadPuzzle(0);
  }

  buildKeys() {
    this.keys = [];
    const kw = 28, gap = 3;
    KEY_ROWS.forEach((row, ri) => {
      const isLast = ri === KEY_ROWS.length - 1;
      const rowW = row.length * kw + (row.length - 1) * gap + (isLast ? 45 + gap : 0);
      let x = (CrosswordGame.width - rowW) / 2;
      const y = this.keysTop + ri * (this.keyH + 4);
      for (const ch of row) {
        this.keys.push({ x, y, w: kw, h: this.keyH, ch });
        x += kw + gap;
      }
      if (isLast) this.keys.push({ x, y, w: 45, h: this.keyH, ch: '⌫' });
    });
  }

  loadPuzzle(i) {
    const p = PUZZLES[i % PUZZLES.length];
    this.puzzle = p;
    this.size = p.rows.length;
    this.gridX = (CrosswordGame.width - this.size * this.cell) / 2;
    this.entries = Array.from({ length: this.size }, () => Array(this.size).fill(''));
    this.scored = new Set();      // cells already awarded points
    this.wordBonus = new Set();   // 'r0'/'c2' words already awarded bonus
    this.sel = { x: 0, y: 0 };
    this.dirAcross = true;
  }

  solutionAt(x, y) {
    return this.puzzle.rows[y][x];
  }

  moveSel(dx, dy) {
    this.sel.x = Math.max(0, Math.min(this.size - 1, this.sel.x + dx));
    this.sel.y = Math.max(0, Math.min(this.size - 1, this.sel.y + dy));
  }

  tap(px, py) {
    // grid?
    const gx = Math.floor((px - this.gridX) / this.cell);
    const gy = Math.floor((py - this.gridY) / this.cell);
    if (gx >= 0 && gx < this.size && gy >= 0 && gy < this.size) {
      if (this.sel.x === gx && this.sel.y === gy) this.dirAcross = !this.dirAcross;
      this.sel = { x: gx, y: gy };
      return;
    }
    // on-screen keyboard?
    for (const k of this.keys) {
      if (px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h) {
        if (k.ch === '⌫') this.erase();
        else this.type(k.ch);
        return;
      }
    }
  }

  type(letter) {
    const { x, y } = this.sel;
    this.entries[y][x] = letter;
    if (letter === this.solutionAt(x, y)) {
      const cellKey = x + ',' + y;
      if (!this.scored.has(cellKey)) {
        this.scored.add(cellKey);
        this.addScore(10);
      }
      this.checkWord('r' + y);
      this.checkWord('c' + x);
      this.checkSolved();
    }
    // advance along current direction
    if (this.dirAcross) this.sel.x = Math.min(this.size - 1, x + 1);
    else this.sel.y = Math.min(this.size - 1, y + 1);
  }

  erase() {
    const { x, y } = this.sel;
    if (this.entries[y][x]) {
      this.entries[y][x] = '';
    } else if (this.dirAcross) {
      this.sel.x = Math.max(0, x - 1);
      this.entries[this.sel.y][this.sel.x] = '';
    } else {
      this.sel.y = Math.max(0, y - 1);
      this.entries[this.sel.y][this.sel.x] = '';
    }
  }

  checkWord(id) {
    if (this.wordBonus.has(id)) return;
    const idx = Number(id.slice(1));
    for (let i = 0; i < this.size; i++) {
      const [x, y] = id[0] === 'r' ? [i, idx] : [idx, i];
      if (this.entries[y][x] !== this.solutionAt(x, y)) return;
    }
    this.wordBonus.add(id);
    this.addScore(50);
  }

  checkSolved() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.entries[y][x] !== this.solutionAt(x, y)) return;
      }
    }
    this.addScore(200);
    this.flash = { text: 'SOLVED! +200', t: 1.6 };
  }

  update(dt) {
    if (this.flash) {
      this.flash.t -= dt;
      if (this.flash.t <= 0) {
        this.flash = null;
        this.puzzleIndex += 1;
        this.loadPuzzle(this.puzzleIndex);
      }
    }
  }

  render() {
    const { r, theme } = this;
    r.clear(theme.canvasBg);
    const c = this.cell;

    // clue bar (for the selected row or column)
    const idx = this.dirAcross ? this.sel.y : this.sel.x;
    const label = (this.dirAcross ? 'ROW ' : 'COL ') + (idx + 1);
    r.text(label + ' · ' + this.puzzle.clues[idx], CrosswordGame.width / 2, 20, {
      color: theme.accent, size: 13, align: 'center', weight: 'bold',
    });

    // row/col index labels
    for (let i = 0; i < this.size; i++) {
      r.text(String(i + 1), this.gridX + i * c + c / 2, this.gridY - 6, {
        color: theme.text, size: 10, align: 'center',
      });
      r.text(String(i + 1), this.gridX - 8, this.gridY + i * c + c / 2 + 3, {
        color: theme.text, size: 10, align: 'right',
      });
    }

    // grid
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cx = this.gridX + x * c;
        const cy = this.gridY + y * c;
        const inWord = this.dirAcross ? y === this.sel.y : x === this.sel.x;
        const isSel = x === this.sel.x && y === this.sel.y;
        r.rect(cx + 1, cy + 1, c - 2, c - 2, isSel ? '#fff7d6' : inWord ? '#e2f2ff' : '#f5f5f5');
        if (isSel) r.strokeRect(cx + 1, cy + 1, c - 2, c - 2, theme.accent, 2);
        const letter = this.entries[y][x];
        if (letter) {
          const ok = letter === this.solutionAt(x, y);
          r.text(letter, cx + c / 2, cy + c / 2 + 6, {
            color: ok ? '#1c1c1c' : theme.danger, size: 18, align: 'center', weight: 'bold',
          });
        }
      }
    }

    // on-screen keyboard
    for (const k of this.keys) {
      r.rect(k.x, k.y, k.w, k.h, 'rgba(255,255,255,0.12)');
      r.text(k.ch, k.x + k.w / 2, k.y + k.h / 2 + 4, {
        color: theme.text, size: 13, align: 'center',
      });
    }

    // solved flash
    if (this.flash) {
      r.ctx.fillStyle = 'rgba(0,0,0,0.55)';
      r.ctx.fillRect(0, 0, r.w, r.h);
      r.text(this.flash.text, r.w / 2, r.h / 2, {
        color: theme.accent, size: 24, align: 'center', weight: 'bold',
      });
    }
  }
}
