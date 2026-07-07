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
export class Input {
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
