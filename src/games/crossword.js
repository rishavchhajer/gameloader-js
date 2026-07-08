import { GameBase } from './game-base.js';

/**
 * Crossword — mini word-square crosswords: every row AND every column is a
 * word. A few letters are pre-filled so the pattern is obvious; both clues
 * for the selected cell are always visible; a HINT key reveals letters.
 * Finish the grid for a bonus and a fresh puzzle. No game over — it's a
 * relaxing loader pastime.
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
const GIVEN_COUNT = 3;   // pre-filled letters per puzzle
const HINTS_PER_PUZZLE = 3;

export class CrosswordGame extends GameBase {
  static id = 'crossword';
  static hint = 'every row & column is a word · tap a cell and type';
  static width = 330;
  static height = 350;

  constructor(opts) {
    super(opts);
    this.input.on('keydown', (code) => {
      if (this.flash) return;
      this.intro = false;
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
      if (this.intro) {
        this.intro = false;
        return; // first tap just dismisses the how-to overlay
      }
      this.tap(p.x, p.y);
    });
    this.init();
  }

  init() {
    this.cell = 32;
    this.gridY = 56;
    this.keysTop = 230;
    this.keyH = 30;
    this.puzzleIndex = 0;
    this.flash = null;   // { text, t } shown between puzzles
    this.intro = true;   // how-to-play overlay until first interaction
    this.blink = 0;
    this.buildKeys();
    this.loadPuzzle(0);
  }

  buildKeys() {
    this.keys = [];
    const kw = 28, gap = 3;
    KEY_ROWS.forEach((row, ri) => {
      const isLast = ri === KEY_ROWS.length - 1;
      const extras = isLast ? 45 + 52 + gap * 2 : 0; // ⌫ + HINT
      const rowW = row.length * kw + (row.length - 1) * gap + extras;
      let x = (CrosswordGame.width - rowW) / 2;
      const y = this.keysTop + ri * (this.keyH + 4);
      for (const ch of row) {
        this.keys.push({ x, y, w: kw, h: this.keyH, ch });
        x += kw + gap;
      }
      if (isLast) {
        this.keys.push({ x, y, w: 45, h: this.keyH, ch: '⌫' });
        x += 45 + gap;
        this.keys.push({ x, y, w: 52, h: this.keyH, ch: 'HINT' });
      }
    });
  }

  loadPuzzle(i) {
    const p = PUZZLES[i % PUZZLES.length];
    this.puzzle = p;
    this.size = p.rows.length;
    this.gridX = (CrosswordGame.width - this.size * this.cell) / 2;
    this.entries = Array.from({ length: this.size }, () => Array(this.size).fill(''));
    this.locked = new Set();      // pre-filled / hint-revealed cells
    this.scored = new Set();      // cells already awarded points
    this.wordBonus = new Set();   // 'r0'/'c2' words already awarded bonus
    this.hintsLeft = HINTS_PER_PUZZLE;
    this.sel = { x: 0, y: 0 };
    this.dirAcross = true;

    // pre-fill a few letters so the puzzle isn't a blank wall
    let placed = 0;
    let guard = 0;
    while (placed < GIVEN_COUNT && guard++ < 100) {
      const x = (Math.random() * this.size) | 0;
      const y = (Math.random() * this.size) | 0;
      const key = x + ',' + y;
      if (this.locked.has(key)) continue;
      this.locked.add(key);
      this.scored.add(key); // given letters never score
      this.entries[y][x] = this.solutionAt(x, y);
      placed++;
    }
    // select the first empty cell so typing works immediately
    outer: for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.entries[y][x]) { this.sel = { x, y }; break outer; }
      }
    }
  }

  solutionAt(x, y) {
    return this.puzzle.rows[y][x];
  }

  isLocked(x, y) {
    return this.locked.has(x + ',' + y);
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
        else if (k.ch === 'HINT') this.useHint();
        else this.type(k.ch);
        return;
      }
    }
  }

  advance() {
    if (this.dirAcross) this.sel.x = Math.min(this.size - 1, this.sel.x + 1);
    else this.sel.y = Math.min(this.size - 1, this.sel.y + 1);
  }

  type(letter) {
    const { x, y } = this.sel;
    if (this.isLocked(x, y)) {
      this.advance(); // can't change given letters, just move on
      return;
    }
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
    this.advance();
  }

  erase() {
    const { x, y } = this.sel;
    if (this.entries[y][x] && !this.isLocked(x, y)) {
      this.entries[y][x] = '';
      return;
    }
    // step back and clear (skipping locked cells)
    if (this.dirAcross) this.sel.x = Math.max(0, x - 1);
    else this.sel.y = Math.max(0, y - 1);
    if (!this.isLocked(this.sel.x, this.sel.y)) {
      this.entries[this.sel.y][this.sel.x] = '';
    }
  }

  useHint() {
    if (this.hintsLeft <= 0) return;
    let { x, y } = this.sel;
    // if the selected cell is already solved, find the next unsolved one
    if (this.entries[y][x] === this.solutionAt(x, y)) {
      let found = false;
      for (let yy = 0; yy < this.size && !found; yy++) {
        for (let xx = 0; xx < this.size && !found; xx++) {
          if (this.entries[yy][xx] !== this.solutionAt(xx, yy)) {
            x = xx; y = yy; found = true;
          }
        }
      }
      if (!found) return; // nothing left to reveal
    }
    this.hintsLeft -= 1;
    this.sel = { x, y };
    this.entries[y][x] = this.solutionAt(x, y);
    this.locked.add(x + ',' + y);
    this.scored.add(x + ',' + y); // revealed letters never score
    this.checkWord('r' + y);
    this.checkWord('c' + x);
    this.checkSolved();
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
    this.blink += dt;
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

    // both clues for the selected cell; the active direction is highlighted
    const rowClue = 'ROW ' + (this.sel.y + 1) + ': ' + this.puzzle.clues[this.sel.y];
    const colClue = 'COL ' + (this.sel.x + 1) + ': ' + this.puzzle.clues[this.sel.x];
    r.text((this.dirAcross ? '▸ ' : '') + rowClue, CrosswordGame.width / 2, 18, {
      color: this.dirAcross ? theme.accent : 'rgba(255,255,255,0.45)',
      size: 12, align: 'center', weight: this.dirAcross ? 'bold' : 'normal',
    });
    r.text((!this.dirAcross ? '▸ ' : '') + colClue, CrosswordGame.width / 2, 34, {
      color: !this.dirAcross ? theme.accent : 'rgba(255,255,255,0.45)',
      size: 12, align: 'center', weight: !this.dirAcross ? 'bold' : 'normal',
    });

    // row/col index labels
    for (let i = 0; i < this.size; i++) {
      r.text(String(i + 1), this.gridX + i * c + c / 2, this.gridY - 4, {
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
        const given = this.isLocked(x, y);
        const bg = isSel ? '#fff7d6' : given ? '#d9d9d9' : inWord ? '#e2f2ff' : '#f5f5f5';
        r.rect(cx + 1, cy + 1, c - 2, c - 2, bg);
        if (isSel) r.strokeRect(cx + 1, cy + 1, c - 2, c - 2, theme.accent, 2);
        const letter = this.entries[y][x];
        if (letter) {
          const ok = letter === this.solutionAt(x, y);
          r.text(letter, cx + c / 2, cy + c / 2 + 6, {
            color: given ? '#2a6fdb' : ok ? '#1c1c1c' : theme.danger,
            size: 18, align: 'center', weight: 'bold',
          });
        } else if (isSel && Math.floor(this.blink * 2) % 2 === 0) {
          // blinking cursor invites typing
          r.rect(cx + c / 2 - 5, cy + c - 8, 10, 2, theme.accent);
        }
      }
    }

    // on-screen keyboard
    for (const k of this.keys) {
      const isHint = k.ch === 'HINT';
      const disabled = isHint && this.hintsLeft <= 0;
      r.rect(k.x, k.y, k.w, k.h, isHint ? 'rgba(53,208,127,0.25)' : 'rgba(255,255,255,0.12)');
      const label = isHint ? 'HINT ' + this.hintsLeft : k.ch;
      r.text(label, k.x + k.w / 2, k.y + k.h / 2 + 4, {
        color: disabled ? 'rgba(255,255,255,0.3)' : theme.text,
        size: isHint ? 10 : 13, align: 'center',
      });
    }

    // how-to-play intro overlay (until first interaction)
    if (this.intro) {
      r.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      r.ctx.fillRect(0, 0, r.w, r.h);
      r.text('HOW TO PLAY', r.w / 2, r.h / 2 - 52, {
        color: theme.accent, size: 18, align: 'center', weight: 'bold',
      });
      const lines = [
        'Every ROW and COLUMN is a word',
        'Tap a cell, then type the answer',
        'Tap the cell again to switch row/col',
        'Gray letters are given · HINT reveals one',
        '',
        'tap anywhere to start',
      ];
      lines.forEach((line, i) => {
        r.text(line, r.w / 2, r.h / 2 - 24 + i * 18, {
          color: i === lines.length - 1 ? theme.accent : theme.text,
          size: 12, align: 'center',
        });
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
