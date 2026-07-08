# GameLoader.js

A plug-and-play, zero-dependency JavaScript library that turns boring loading
screens into playable mini-games. Pure vanilla JS + Canvas 2D — no images, no
frameworks, no CSS conflicts (rendered inside Shadow DOM).

The integrating developer configures **one game**; users play it while your
content loads.

## Games

| id        | Game        | Controls (desktop)                       | Controls (touch)                        |
|-----------|-------------|------------------------------------------|-----------------------------------------|
| `dino`    | Dino Runner | Space/↑ jump, ↓ duck                     | Tap to jump                             |
| `tetris`  | Tetris      | ←→ move, ↑ rotate, ↓ soft drop, Space hard drop | Tap sides/middle, swipe down      |
| `shooter` | Shooter     | ←→/A-D move, Space shoot                 | Drag to move (auto-fire)                |
| `archery` | Archery     | Hold Space to draw, release to shoot, ↑↓ aim | Hold to draw, release to shoot      |
| `snake`   | Snake       | Arrows/WASD to steer                     | Swipe to turn                           |
| `pacman`  | Pacman      | Arrows/WASD to steer                     | Swipe to turn                           |
| `roadfighter` | Road Fighter | ←→ steer, ↑ accelerate, ↓ brake      | Drag to steer (auto-accelerate)         |
| `crossword` | Crossword   | Click cell + type, Space = row/col       | Tap cell + on-screen keyboard           |

## Install

**CDN (script tag, UMD):**

```html
<script src="https://cdn.jsdelivr.net/npm/gameloader-js/dist/gameloader.umd.min.js"></script>
<script>
  const loader = GameLoader.init({ game: 'dino' });
  loader.show();
</script>
```

**npm:**

```bash
npm install gameloader-js
```

```js
import GameLoader from 'gameloader-js';
const loader = GameLoader.init({ game: 'tetris' });
```

**Self-hosted:** copy `dist/gameloader.umd.min.js` (or the `.esm` build) into
your assets and reference it directly.

## Usage

```js
const loader = GameLoader.init({
  game: 'dino',              // REQUIRED: 'dino' | 'tetris' | 'shooter' | 'archery' | 'snake' | 'pacman' | 'roadfighter' | 'crossword'
  container: document.body,  // optional: element to mount in (default: fullscreen)
  message: 'Loading...',     // optional: heading text
  showProgress: true,        // optional: progress bar (indeterminate until setProgress)
  highScores: true,          // optional: persist best score in localStorage
  minDisplayTime: 1000,      // optional: min ms visible (avoids flash on fast loads)
  theme: {                   // optional: partial overrides
    bg: '#101418',           // overlay background
    canvasBg: '#0a0d10',     // game canvas background
    text: '#e8e8e8',
    accent: '#35d07f',       // ship/dino/bow/progress color
    danger: '#ff5a5a',       // enemies/obstacles/target color
  },
});

loader.show();               // display the loader
loader.setProgress(42);      // 0-100; switches bar from indeterminate to determinate
loader.setMessage('Almost there...');
await loader.hide();         // fade out + cleanup (respects minDisplayTime)
```

### Promise wrapper

```js
// Shows the loader, hides automatically when the promise settles.
const data = await GameLoader.wrap(fetch('/api/data'), { game: 'shooter' });
```

### Notes

- `GameLoader.games` lists valid game ids.
- Passing an invalid/missing `game` throws with the list of valid options.
- When using a custom `container`, give it `position: relative` — the overlay
  is absolutely positioned inside it.
- The game box auto-scales (aspect ratio preserved) to fit the container or
  viewport, and re-fits on resize — tall games work in short containers.
- All styles live in Shadow DOM; your site's CSS is never affected.
- Works on desktop and mobile: every game has both keyboard and touch
  controls (crossword ships its own on-screen keyboard).

## Development

```bash
npm install
npm run build     # builds dist/ (UMD + ESM, minified variants)
npm run serve     # serve repo root, open http://localhost:8080/demo/
```

`test.html` in the repo root is an interactive test bench covering every
config option, the promise wrapper, and error handling.

## Changelog

### 1.2.1
- Crossword UX: how-to-play intro, pre-filled starter letters, always-visible
  row+column clues, HINT key (3 per puzzle), blinking cursor

### 1.2.0
- New game: **crossword** (word-square puzzles, on-screen keyboard for touch)

### 1.1.0
- New games: **snake**, **pacman**, **roadfighter**
- Overlay auto-scales the game box to fit small containers / short viewports
- Fixes: road fighter speed cap, overlapping spawns, traffic cleanup while
  braking; pacman ghost-farming exploit

### 1.0.1
- Fixes: `hide()` re-entrancy crash, NaN touch coordinates on `touchend`,
  restart double-firing game actions, unreachable bird hitbox in dino,
  unbounded array growth in archery

### 1.0.0
- Initial release: dino, tetris, shooter, archery; progress bar, theming,
  high scores, promise wrapper, Shadow DOM isolation

## License

MIT
