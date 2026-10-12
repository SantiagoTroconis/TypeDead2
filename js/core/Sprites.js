// Procedural sprite cache: each sprite is painted once onto an offscreen canvas
// and reused every frame via Sprites.get(id).
const Sprites = (() => {
  const cache = new Map();
  let missing = null;

  function missingSprite() {
    if (!missing) {
      missing = document.createElement('canvas');
      missing.width = missing.height = 64;
      const mx = missing.getContext('2d');
      mx.fillStyle = '#ff00ff';
      mx.fillRect(0, 0, 64, 64);
    }
    return missing;
  }

  return {
    define(id, w, h, paint) {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      try { paint(cv.getContext('2d'), w, h); }
      catch (e) { console.warn(`[Sprites] paint failed for "${id}":`, e); }
      cache.set(id, cv);
      return cv;
    },
    get(id) {
      const cv = cache.get(id);
      if (!cv) console.warn(`[Sprites] unknown sprite "${id}"`);
      return cv || missingSprite();
    }
  };
})();
