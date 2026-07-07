/**
 * Scoped styles injected into the Shadow DOM. Theme values are applied
 * as CSS custom properties on the host wrapper.
 */
export function buildStyles(theme) {
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
