/**
 * Base class every mini-game extends.
 *
 * Lifecycle:
 *   constructor({ renderer, input, theme, onScore })
 *   init()        - reset state, called before engine starts and on restart
 *   update(dt)    - advance simulation, dt in seconds
 *   render()      - draw current frame
 *   destroy()     - cleanup (input listeners are cleaned centrally)
 *
 * Conventions:
 *   - Use this.r (Renderer) for all drawing; logical size this.r.w x this.r.h
 *   - Report score changes via this.setScore(n)
 *   - When the player dies, call this.gameOver(); base shows a
 *     "game over / tap to restart" state and handles restart input.
 */
export class GameBase {
  static id = 'base';
  static hint = '';
  // logical canvas size; games may override
  static width = 600;
  static height = 300;

  constructor({ renderer, input, theme, onScore }) {
    this.r = renderer;
    this.input = input;
    this.theme = theme;
    this.onScore = onScore || (() => {});
    this.score = 0;
    this.over = false;

    // Restart handling (space / tap when game over).
    // Listens on key/pointer UP so the same event that triggers the restart
    // doesn't also fire a game action in subclass keydown/pointerdown
    // handlers registered after super() (they'd see over === false).
    input.on('keyup', (code) => {
      if (this.over && (code === 'Space' || code === 'Enter')) this.restart();
    });
    input.on('pointerup', () => {
      if (this.over) this.restart();
    });
  }

  setScore(n) {
    this.score = n;
    this.onScore(n);
  }

  addScore(n) {
    this.setScore(this.score + n);
  }

  gameOver() {
    this.over = true;
    this._overAt = performance.now();
  }

  restart() {
    // small debounce so the tap that ends the game doesn't instantly restart
    if (performance.now() - (this._overAt || 0) < 400) return;
    this.over = false;
    this.setScore(0);
    this.init();
  }

  renderGameOver() {
    const { r } = this;
    r.ctx.save();
    r.ctx.fillStyle = 'rgba(0,0,0,0.55)';
    r.ctx.fillRect(0, 0, r.w, r.h);
    r.text('GAME OVER', r.w / 2, r.h / 2 - 12, {
      color: this.theme.text, size: 26, align: 'center', weight: 'bold',
    });
    r.text('press SPACE or tap to retry', r.w / 2, r.h / 2 + 16, {
      color: this.theme.accent, size: 13, align: 'center',
    });
    r.ctx.restore();
  }

  /* to be overridden */
  init() {}
  update(dt) {}
  render() {}
  destroy() {}
}
