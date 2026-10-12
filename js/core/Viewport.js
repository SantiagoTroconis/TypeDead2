// Fits the whole page to a 1280x720 design resolution. The root element is
// scaled uniformly and expanded along the non-limiting axis, so the game fills
// any window without letterboxing while HUD/overlays keep their proportions.
const Viewport = (() => {
  const DESIGN_W = 1280, DESIGN_H = 720;
  const state = { scale: 1, width: DESIGN_W, height: DESIGN_H };

  function fit() {
    const rw = window.innerWidth || DESIGN_W;
    const rh = window.innerHeight || DESIGN_H;
    state.scale = Math.min(rw / DESIGN_W, rh / DESIGN_H) || 1;
    state.width = rw / state.scale;
    state.height = rh / state.scale;
    const root = document.documentElement.style;
    root.width = state.width + 'px';
    root.height = state.height + 'px';
    root.transformOrigin = '0 0';
    root.transform = `scale(${state.scale})`;
    root.overflow = 'hidden';
  }

  // Registered before the game's own resize listener, so it always runs first.
  window.addEventListener('resize', fit);
  fit();

  return {
    get width() { return state.width; },
    get height() { return state.height; },
    // Canvas backing-store pixels per design pixel (keeps rendering crisp when scaled up).
    get pixelRatio() { return Math.min(state.scale * (window.devicePixelRatio || 1), 3); }
  };
})();
