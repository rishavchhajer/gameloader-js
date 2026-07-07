import { Overlay } from './core/overlay.js';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { Renderer } from './core/renderer.js';
import { getGame, GAMES } from './games/registry.js';
import { getHighScore, setHighScore } from './core/storage.js';

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

export default GameLoader;
