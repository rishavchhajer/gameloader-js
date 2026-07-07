(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.GameLoader = factory());
})(this, (function () { 'use strict';

  /**
   * Scoped styles injected into the Shadow DOM. Theme values are applied
   * as CSS custom properties on the host wrapper.
   */
  function buildStyles(theme) {
    return `
    :host {
      all: initial;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .gl-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: ${theme.bg};
      color: ${theme.text};
      font-family: 'Courier New', Courier, monospace;
      opacity: 0;
      transition: opacity 0.35s ease;
      touch-action: none;
    }
    .gl-overlay.gl-contained {
      position: absolute;
    }
    .gl-overlay.gl-visible { opacity: 1; }

    .gl-message {
      font-size: 18px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .gl-canvas-wrap {
      position: relative;
      border: 2px solid ${theme.accent};
      border-radius: 6px;
      overflow: hidden;
      background: ${theme.canvasBg};
      max-width: calc(100vw - 32px);
    }
    canvas {
      display: block;
      width: 100%;
      height: auto;
      cursor: crosshair;
    }

    .gl-progress {
      width: 100%;
      max-width: 640px;
      padding: 0 16px;
    }
    .gl-progress-track {
      width: 100%;
      height: 10px;
      border: 1px solid ${theme.accent};
      border-radius: 5px;
      overflow: hidden;
      background: transparent;
    }
    .gl-progress-fill {
      height: 100%;
      width: 0%;
      background: ${theme.accent};
      transition: width 0.25s ease;
    }
    .gl-progress-label {
      margin-top: 6px;
      font-size: 12px;
      text-align: center;
      opacity: 0.8;
    }
    .gl-progress-indeterminate .gl-progress-fill {
      width: 30%;
      animation: gl-slide 1.2s ease-in-out infinite alternate;
    }
    @keyframes gl-slide {
      from { margin-left: 0; }
      to { margin-left: 70%; }
    }

    .gl-hint {
      font-size: 12px;
      opacity: 0.6;
      text-align: center;
      padding: 0 16px;
    }

    .gl-scores {
      display: flex;
      gap: 24px;
      font-size: 13px;
    }
    .gl-scores .gl-hi { color: ${theme.accent}; }
  `;
  }

  /**
   * Progress bar UI. Supports determinate (setProgress 0-100) and
   * indeterminate (animated sweep) modes.
   */
  class ProgressBar {
    constructor(theme) {
      this.el = document.createElement('div');
      this.el.className = 'gl-progress gl-progress-indeterminate';
      this.el.innerHTML = `
      <div class="gl-progress-track"><div class="gl-progress-fill"></div></div>
      <div class="gl-progress-label"></div>
    `;
      this.fill = this.el.querySelector('.gl-progress-fill');
      this.label = this.el.querySelector('.gl-progress-label');
      this.value = null;
    }

    set(pct) {
      this.value = Math.max(0, Math.min(100, pct));
      this.el.classList.remove('gl-progress-indeterminate');
      this.fill.style.width = this.value + '%';
      this.label.textContent = Math.round(this.value) + '%';
    }

    setIndeterminate() {
      this.value = null;
      this.el.classList.add('gl-progress-indeterminate');
      this.fill.style.width = '';
      this.label.textContent = '';
    }
  }

  /**
   * Overlay: builds the loader UI inside a Shadow DOM for complete style
   * isolation from the host page.
   *
   * Structure:
   *   host div (attached to container)
   *     #shadow-root
   *       <style>
   *       .gl-overlay
   *         .gl-message
   *         .gl-scores (score / high score)
   *         .gl-canvas-wrap > canvas
   *         .gl-progress
   *         .gl-hint
   */
  class Overlay {
    /**
     * @param {object} opts
     * @param {HTMLElement} opts.container
     * @param {object} opts.theme
     * @param {string} opts.message
     * @param {boolean} opts.showProgress
     * @param {number} opts.canvasW logical canvas width
     * @param {number} opts.canvasH logical canvas height
     */
    constructor({ container, theme, message, showProgress, canvasW, canvasH }) {
      this.container = container;
      this.host = document.createElement('div');
      this.host.setAttribute('data-gameloader', '');
      this.shadow = this.host.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = buildStyles(theme);
      this.shadow.appendChild(style);

      this.root = document.createElement('div');
      this.root.className = 'gl-overlay';
      if (container !== document.body) this.root.classList.add('gl-contained');

      // message
      this.messageEl = document.createElement('div');
      this.messageEl.className = 'gl-message';
      this.messageEl.textContent = message;
      this.root.appendChild(this.messageEl);

      // scores
      this.scoresEl = document.createElement('div');
      this.scoresEl.className = 'gl-scores';
      this.scoresEl.innerHTML =
        '<span>SCORE <span class="gl-score-val">0</span></span>' +
        '<span class="gl-hi">BEST <span class="gl-best-val">0</span></span>';
      this.scoreVal = this.scoresEl.querySelector('.gl-score-val');
      this.bestVal = this.scoresEl.querySelector('.gl-best-val');
      this.root.appendChild(this.scoresEl);

      // canvas
      const wrap = document.createElement('div');
      wrap.className = 'gl-canvas-wrap';
      wrap.style.width = canvasW + 'px';
      this.canvas = document.createElement('canvas');
      wrap.appendChild(this.canvas);
      this.root.appendChild(wrap);

      // progress
      this.progress = null;
      if (showProgress) {
        this.progress = new ProgressBar(theme);
        this.root.appendChild(this.progress.el);
      }

      // hint
      this.hintEl = document.createElement('div');
      this.hintEl.className = 'gl-hint';
      this.root.appendChild(this.hintEl);

      this.shadow.appendChild(this.root);
    }

    setScore(score) {
      this.scoreVal.textContent = String(score);
    }

    setBest(best) {
      this.bestVal.textContent = String(best);
    }

    setHint(text) {
      this.hintEl.textContent = text;
    }

    setMessage(text) {
      this.messageEl.textContent = text;
    }

    mount() {
      if (!this.host.parentNode) this.container.appendChild(this.host);
      // force reflow so the transition plays
      void this.root.offsetHeight;
      this.root.classList.add('gl-visible');
    }

    /**
     * Fade out, then remove from DOM. Resolves when done.
     */
    unmount() {
      return new Promise((resolve) => {
        this.root.classList.remove('gl-visible');
        const done = () => {
          if (this.host.parentNode) this.host.parentNode.removeChild(this.host);
          resolve();
        };
        this.root.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 500); // fallback if transitionend never fires
      });
    }
  }

  /**
   * Game engine: owns the requestAnimationFrame loop and drives the
   * active game's update/render cycle with a delta-time clamp.
   */
  class Engine {
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

  /**
   * Unified input handler: keyboard + pointer (mouse/touch).
   *
   * Keyboard state is exposed via `keys` (Set of KeyboardEvent.code values).
   * Pointer state is exposed via `pointer` {x, y, down} in canvas coordinates.
   *
   * Games can also subscribe to discrete events:
   *   on('keydown', code), on('keyup', code)
   *   on('pointerdown', {x,y}), on('pointermove', {x,y}), on('pointerup', {x,y})
   */
  class Input {
    /**
     * @param {HTMLElement} target - element to attach pointer listeners to (the canvas)
     * @param {Document|ShadowRoot} keyTarget - where key listeners attach
     */
    constructor(target, keyTarget = window) {
      this.target = target;
      this.keyTarget = keyTarget;
      this.keys = new Set();
      this.pointer = { x: 0, y: 0, down: false };
      this._listeners = {};
      this._bound = [];
      this._attach();
    }

    on(event, fn) {
      (this._listeners[event] = this._listeners[event] || []).push(fn);
      return this;
    }

    _emit(event, payload) {
      const fns = this._listeners[event];
      if (fns) for (const fn of fns) fn(payload);
    }

    _canvasCoords(e) {
      const rect = this.target.getBoundingClientRect();
      // touchend has an empty `touches` list — fall back to changedTouches
      const touch =
        (e.touches && e.touches.length && e.touches[0]) ||
        (e.changedTouches && e.changedTouches.length && e.changedTouches[0]) ||
        null;
      const cx = touch ? touch.clientX : e.clientX;
      const cy = touch ? touch.clientY : e.clientY;
      return {
        x: ((cx - rect.left) / rect.width) * (this.target._logicalW || rect.width),
        y: ((cy - rect.top) / rect.height) * (this.target._logicalH || rect.height),
      };
    }

    _add(el, ev, fn, opts) {
      el.addEventListener(ev, fn, opts);
      this._bound.push([el, ev, fn, opts]);
    }

    _attach() {
      const t = this.target;

      this._add(window, 'keydown', (e) => {
        // Prevent page scroll on space/arrows while the loader is up.
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
        if (!this.keys.has(e.code)) this._emit('keydown', e.code);
        this.keys.add(e.code);
      });

      this._add(window, 'keyup', (e) => {
        this.keys.delete(e.code);
        this._emit('keyup', e.code);
      });

      const down = (e) => {
        e.preventDefault();
        const p = this._canvasCoords(e);
        this.pointer.x = p.x;
        this.pointer.y = p.y;
        this.pointer.down = true;
        this._emit('pointerdown', p);
      };
      const move = (e) => {
        const p = this._canvasCoords(e);
        this.pointer.x = p.x;
        this.pointer.y = p.y;
        this._emit('pointermove', p);
      };
      const up = (e) => {
        const p = this._canvasCoords(e);
        this.pointer.down = false;
        this._emit('pointerup', p);
      };

      this._add(t, 'mousedown', down);
      this._add(t, 'mousemove', move);
      this._add(window, 'mouseup', up);
      this._add(t, 'touchstart', down, { passive: false });
      this._add(t, 'touchmove', move, { passive: false });
      this._add(window, 'touchend', up);
    }

    destroy() {
      for (const [el, ev, fn, opts] of this._bound) el.removeEventListener(ev, fn, opts);
      this._bound = [];
      this._listeners = {};
      this.keys.clear();
    }
  }

  /**
   * Canvas 2D rendering helpers. All games draw with simple shapes/text —
   * no external image assets.
   */
  class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} logicalW - logical width used by game coordinates
     * @param {number} logicalH - logical height used by game coordinates
     */
    constructor(canvas, logicalW, logicalH) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize(logicalW, logicalH);
    }

    resize(logicalW, logicalH) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = logicalW;
      this.h = logicalH;
      this.canvas.width = logicalW * dpr;
      this.canvas.height = logicalH * dpr;
      // expose logical size for input coordinate mapping
      this.canvas._logicalW = logicalW;
      this.canvas._logicalH = logicalH;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    clear(color) {
      if (color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.w, this.h);
      } else {
        this.ctx.clearRect(0, 0, this.w, this.h);
      }
    }

    rect(x, y, w, h, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, w, h);
    }

    strokeRect(x, y, w, h, color, lineWidth = 1) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeRect(x, y, w, h);
    }

    circle(x, y, r, color) {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    strokeCircle(x, y, r, color, lineWidth = 1) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    line(x1, y1, x2, y2, color, lineWidth = 1) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    triangle(x1, y1, x2, y2, x3, y3, color) {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.lineTo(x3, y3);
      this.ctx.closePath();
      this.ctx.fill();
    }

    text(str, x, y, { color = '#fff', size = 14, align = 'left', baseline = 'alphabetic', weight = 'normal', font = 'monospace' } = {}) {
      this.ctx.fillStyle = color;
      this.ctx.font = `${weight} ${size}px ${font}`;
      this.ctx.textAlign = align;
      this.ctx.textBaseline = baseline;
      this.ctx.fillText(str, x, y);
    }
  }

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
  class GameBase {
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

  /**
   * Dino Runner — jump over cacti, duck under birds. Speed ramps up.
   * Controls: Space / ArrowUp / tap = jump, ArrowDown = duck.
   */
  class DinoGame extends GameBase {
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

  /**
   * Shooter — space-invaders style. Move ship left/right, shoot descending
   * enemies. Enemies get faster as score climbs.
   * Controls: Arrow keys / A-D to move, Space to shoot.
   * Touch: drag to move, ship auto-fires.
   */
  class ShooterGame extends GameBase {
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
  class TetrisGame extends GameBase {
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

  /**
   * Archery — hold to draw the bow (power meter), release to fire an arrow
   * with projectile arc at a moving target. Score by ring accuracy.
   * You have a limited quiver; hits refill arrows, misses don't.
   * Controls: hold SPACE / hold pointer to draw, release to shoot.
   * Aim follows pointer Y (or Up/Down arrows).
   */
  class ArcheryGame extends GameBase {
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

  const GAMES = {
    [DinoGame.id]: DinoGame,
    [ShooterGame.id]: ShooterGame,
    [TetrisGame.id]: TetrisGame,
    [ArcheryGame.id]: ArcheryGame,
  };

  function getGame(name) {
    const G = GAMES[name];
    if (!G) {
      throw new Error(
        `[GameLoader] Unknown game "${name}". Valid options: ${Object.keys(GAMES).join(', ')}`
      );
    }
    return G;
  }

  /**
   * High-score persistence via localStorage.
   * Fails silently when storage is unavailable (private mode, disabled, etc).
   */
  const PREFIX = 'gameloader:highscore:';

  function getHighScore(gameName) {
    try {
      const v = window.localStorage.getItem(PREFIX + gameName);
      return v ? parseInt(v, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function setHighScore(gameName, score) {
    try {
      const current = getHighScore(gameName);
      if (score > current) {
        window.localStorage.setItem(PREFIX + gameName, String(score));
        return true; // new high score
      }
    } catch (e) {
      /* noop */
    }
    return false;
  }

  const DEFAULT_THEME = {
    bg: '#101418',
    canvasBg: '#0a0d10',
    text: '#e8e8e8',
    accent: '#35d07f',
    danger: '#ff5a5a',
  };

  const DEFAULTS = {
    game: null,            // required: 'dino' | 'shooter' | 'tetris' | 'archery'
    container: null,       // defaults to document.body (fullscreen overlay)
    theme: {},             // partial theme override
    message: 'Loading...',
    showProgress: true,
    highScores: true,
    minDisplayTime: 0,     // ms the loader stays visible at minimum
  };

  class LoaderInstance {
    constructor(options) {
      const opts = { ...DEFAULTS, ...options };
      opts.theme = { ...DEFAULT_THEME, ...(options && options.theme) };

      if (!opts.game) {
        throw new Error(
          `[GameLoader] "game" option is required. Valid options: ${Object.keys(GAMES).join(', ')}`
        );
      }
      this.GameClass = getGame(opts.game);
      this.opts = opts;
      this.visible = false;
      this._shownAt = 0;
      this._pendingProgress = null;
    }

    show() {
      if (this.visible) return this;
      this.visible = true;
      this._shownAt = Date.now();

      const { opts, GameClass } = this;
      const container = opts.container || document.body;

      this.overlay = new Overlay({
        container,
        theme: opts.theme,
        message: opts.message,
        showProgress: opts.showProgress,
        canvasW: GameClass.width,
        canvasH: GameClass.height,
      });

      this.renderer = new Renderer(this.overlay.canvas, GameClass.width, GameClass.height);
      this.input = new Input(this.overlay.canvas);

      const best = opts.highScores ? getHighScore(GameClass.id) : 0;
      this.overlay.setBest(best);
      this.overlay.setHint(GameClass.hint);

      this.game = new GameClass({
        renderer: this.renderer,
        input: this.input,
        theme: opts.theme,
        onScore: (score) => {
          this.overlay.setScore(score);
          if (opts.highScores && setHighScore(GameClass.id, score)) {
            this.overlay.setBest(score);
          }
        },
      });

      this.engine = new Engine(this.game);
      this.overlay.mount();
      this.engine.start();

      if (this._pendingProgress != null) {
        this.setProgress(this._pendingProgress);
        this._pendingProgress = null;
      }
      return this;
    }

    setProgress(pct) {
      if (!this.visible) {
        this._pendingProgress = pct;
        return this;
      }
      if (this.overlay.progress) this.overlay.progress.set(pct);
      return this;
    }

    setMessage(text) {
      if (this.overlay) this.overlay.setMessage(text);
      else this.opts.message = text;
      return this;
    }

    /**
     * Hide the loader. Respects minDisplayTime. Returns a promise that
     * resolves after the fade-out completes and everything is cleaned up.
     */
    async hide() {
      if (!this.visible || this._hiding) return;
      this._hiding = true;
      const elapsed = Date.now() - this._shownAt;
      const wait = Math.max(0, this.opts.minDisplayTime - elapsed);
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));

      if (this.overlay.progress) this.overlay.progress.set(100);
      this.engine.pause();
      await this.overlay.unmount();

      this.engine.stop();
      this.game.destroy();
      this.input.destroy();
      this.engine = this.game = this.input = this.renderer = this.overlay = null;
      this.visible = false;
      this._hiding = false;
    }
  }

  const GameLoader = {
    /** Available game ids */
    games: Object.keys(GAMES),

    /**
     * Create a loader instance.
     * @param {object} options - { game, container, theme, message, showProgress, highScores, minDisplayTime }
     */
    init(options) {
      return new LoaderInstance(options);
    },

    /**
     * Show a loader around a promise: displays immediately, hides when the
     * promise settles. Resolves/rejects with the promise's outcome.
     * @param {Promise} promise
     * @param {object} options - same as init()
     */
    async wrap(promise, options) {
      const loader = new LoaderInstance(options).show();
      try {
        return await promise;
      } finally {
        await loader.hide();
      }
    },
  };

  return GameLoader;

}));
