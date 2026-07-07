/**
 * Canvas 2D rendering helpers. All games draw with simple shapes/text —
 * no external image assets.
 */
export class Renderer {
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
