/**
 * Progress bar UI. Supports determinate (setProgress 0-100) and
 * indeterminate (animated sweep) modes.
 */
export class ProgressBar {
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
