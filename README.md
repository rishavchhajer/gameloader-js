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

## Install

**Script tag (UMD):**

```html
<script src="dist/gameloader.umd.min.js"></script>
<script>
  const loader = GameLoader.init({ game: 'dino' });
  loader.show();
</script>
```

**ES module:**

```js
import GameLoader from './dist/gameloader.esm.min.js';
const loader = GameLoader.init({ game: 'tetris' });
```

## Usage

```js
const loader = GameLoader.init({
  game: 'dino',              // REQUIRED: 'dino' | 'tetris' | 'shooter' | 'archery' | 'snake' | 'pacman' | 'roadfighter'
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
- All styles live in Shadow DOM; your site's CSS is never affected.

## Development

```bash
npm install
npm run build     # builds dist/ (UMD + ESM, minified variants)
npm run serve     # serve repo root, open http://localhost:8080/demo/
```

## License

MIT
