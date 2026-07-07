/**
 * Game engine: owns the requestAnimationFrame loop and drives the
 * active game's update/render cycle with a delta-time clamp.
 */
export class Engine {
  /**
   * @param {object} game - instance implementing update(dt) / render()
   */
  constructor(game) {
    this.game = game;
    this.running = false;
    this.paused = false;
    this._raf = null;
    this._last = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.running) return;
    this.paused = false;
    this._last = performance.now();
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _tick(now) {
    if (!this.running) return;
    // clamp dt to 50ms so tab-switches don't teleport entities
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    if (!this.paused) {
      this.game.update(dt);
    }
    this.game.render();
    this._raf = requestAnimationFrame(this._tick);
  }
}
