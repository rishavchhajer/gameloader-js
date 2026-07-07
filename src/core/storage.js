/**
 * High-score persistence via localStorage.
 * Fails silently when storage is unavailable (private mode, disabled, etc).
 */
const PREFIX = 'gameloader:highscore:';

export function getHighScore(gameName) {
  try {
    const v = window.localStorage.getItem(PREFIX + gameName);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

export function setHighScore(gameName, score) {
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
