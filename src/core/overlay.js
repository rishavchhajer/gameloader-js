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
