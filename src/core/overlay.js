import { buildStyles } from '../ui/styles.js';
import { ProgressBar } from '../ui/progress.js';

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
export class Overlay {
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
    this.canvasW = canvasW;
    this.canvasH = canvasH;
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
    this.wrap = document.createElement('div');
    this.wrap.className = 'gl-canvas-wrap';
    this.wrap.style.width = canvasW + 'px';
    this.canvas = document.createElement('canvas');
    this.wrap.appendChild(this.canvas);
    this.root.appendChild(this.wrap);

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

    // Scale the game box to fit the overlay (container or viewport),
    // re-fitting whenever the overlay resizes.
    this._fit();
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._fit());
      this._ro.observe(this.root);
    } else {
      this._onResize = () => this._fit();
      window.addEventListener('resize', this._onResize);
    }
  }

  /**
   * Shrink the canvas box so the whole overlay (message, scores, canvas,
   * progress, hint) fits inside the available height and width. The canvas
   * keeps its aspect ratio; its internal resolution is untouched (CSS-only
   * scaling), so games and input mapping are unaffected.
   */
  _fit() {
    const rootW = this.root.clientWidth;
    const rootH = this.root.clientHeight;
    if (!rootW || !rootH) return;

    // height used by everything except the canvas box
    let otherH = 0;
    let items = 0;
    for (const el of this.root.children) {
      items++;
      if (el !== this.wrap) otherH += el.offsetHeight;
    }
    const gap = 16; // matches .gl-overlay gap
    const padding = 24;
    const availH = rootH - otherH - gap * (items - 1) - padding;
    const availW = rootW - 32;
    const scale = Math.max(
      0.3,
      Math.min(1, availW / this.canvasW, availH / this.canvasH)
    );
    const w = Math.floor(this.canvasW * scale);
    if (this.wrap.style.width !== w + 'px') this.wrap.style.width = w + 'px';
  }

  /**
   * Fade out, then remove from DOM. Resolves when done.
   */
  unmount() {
    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
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
