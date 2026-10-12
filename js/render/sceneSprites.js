// Scenery sprites — tombstones, dead trees, fences, moon, house, windows.
// Painted once at load; drawn with Sprites.get(id).

Sprites.define('tombstone', 60, 80, (ctx, w, h) => {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.95, w * 0.45, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stone body — rounded top
  ctx.fillStyle = '#4a4a52';
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.9);
  ctx.lineTo(w * 0.15, h * 0.35);
  ctx.arc(w * 0.5, h * 0.35, w * 0.35, Math.PI, 0, false);
  ctx.lineTo(w * 0.85, h * 0.9);
  ctx.closePath();
  ctx.fill();
  // Highlights
  ctx.fillStyle = '#5f5f68';
  ctx.fillRect(w * 0.2, h * 0.42, w * 0.08, h * 0.45);
  // Shadow side
  ctx.fillStyle = '#2e2e36';
  ctx.fillRect(w * 0.72, h * 0.42, w * 0.1, h * 0.45);
  // RIP
  ctx.fillStyle = '#1a1a1f';
  ctx.font = `bold ${Math.floor(h * 0.14)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('RIP', w * 0.5, h * 0.5);
  // Crack
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.6);
  ctx.lineTo(w * 0.42, h * 0.78);
  ctx.lineTo(w * 0.38, h * 0.88);
  ctx.stroke();
});

Sprites.define('cross', 48, 72, (ctx, w, h) => {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.96, w * 0.4, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b2a1d';
  ctx.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.85);
  ctx.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.12);
  ctx.fillStyle = '#5a4330';
  ctx.fillRect(w * 0.42, h * 0.1, w * 0.05, h * 0.85);
  ctx.fillRect(w * 0.2, h * 0.3, w * 0.6, 0.03 * h);
});

Sprites.define('deadtree', 160, 220, (ctx, w, h) => {
  ctx.strokeStyle = '#201612';
  ctx.fillStyle = '#201612';
  ctx.lineCap = 'round';
  // Trunk
  ctx.lineWidth = w * 0.08;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h);
  ctx.lineTo(w * 0.48, h * 0.4);
  ctx.stroke();
  // Branches
  const branches = [
    [0.48, 0.55, 0.15, 0.3, 0.05],
    [0.48, 0.6, 0.85, 0.35, 0.045],
    [0.48, 0.45, 0.25, 0.15, 0.035],
    [0.48, 0.42, 0.78, 0.1, 0.03],
    [0.48, 0.5, 0.6, 0.2, 0.03],
    [0.48, 0.52, 0.35, 0.22, 0.03]
  ];
  for (const [x1, y1, x2, y2, lw] of branches) {
    ctx.lineWidth = w * lw;
    ctx.beginPath();
    ctx.moveTo(w * x1, h * y1);
    ctx.quadraticCurveTo(w * ((x1 + x2) / 2), h * (y1 - 0.1), w * x2, h * y2);
    ctx.stroke();
    // Twigs
    ctx.lineWidth = w * 0.015;
    ctx.beginPath();
    ctx.moveTo(w * x2, h * y2);
    ctx.lineTo(w * (x2 + (x2 - 0.5) * 0.15), h * (y2 - 0.05));
    ctx.stroke();
  }
});

Sprites.define('fence', 180, 70, (ctx, w, h) => {
  ctx.fillStyle = '#1a1a1a';
  // Horizontal rails
  ctx.fillRect(0, h * 0.35, w, h * 0.08);
  ctx.fillRect(0, h * 0.65, w, h * 0.08);
  // Pickets
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * w + w * 0.04;
    ctx.fillRect(x, h * 0.1, w * 0.08, h * 0.85);
    // Pointed top
    ctx.beginPath();
    ctx.moveTo(x, h * 0.1);
    ctx.lineTo(x + w * 0.04, h * 0.02);
    ctx.lineTo(x + w * 0.08, h * 0.1);
    ctx.fill();
  }
});

Sprites.define('moon', 160, 160, (ctx, w, h) => {
  // Glow
  const g = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.5);
  g.addColorStop(0, 'rgba(230,230,210,0.5)');
  g.addColorStop(1, 'rgba(230,230,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Moon body
  ctx.fillStyle = '#dcd6b8';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
  // Craters
  ctx.fillStyle = '#b8b296';
  ctx.beginPath(); ctx.arc(w * 0.42, h * 0.44, w * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.56, h * 0.52, w * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.48, h * 0.6, w * 0.025, 0, Math.PI * 2); ctx.fill();
});

Sprites.define('house', 420, 300, (ctx, w, h) => {
  // Main body
  ctx.fillStyle = '#1a1416';
  ctx.fillRect(w * 0.1, h * 0.4, w * 0.8, h * 0.55);
  // Roof
  ctx.fillStyle = '#0e0a0c';
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.42);
  ctx.lineTo(w * 0.5, h * 0.1);
  ctx.lineTo(w * 0.95, h * 0.42);
  ctx.closePath();
  ctx.fill();
  // Chimney
  ctx.fillStyle = '#15100f';
  ctx.fillRect(w * 0.72, h * 0.18, w * 0.07, h * 0.2);
  // Windows glowing
  ctx.fillStyle = '#e4a63a';
  ctx.fillRect(w * 0.2, h * 0.5, w * 0.15, h * 0.18);
  ctx.fillRect(w * 0.65, h * 0.5, w * 0.15, h * 0.18);
  // Window cross
  ctx.fillStyle = '#1a1416';
  ctx.fillRect(w * 0.27, h * 0.5, w * 0.01, h * 0.18);
  ctx.fillRect(w * 0.2, h * 0.58, w * 0.15, h * 0.015);
  ctx.fillRect(w * 0.72, h * 0.5, w * 0.01, h * 0.18);
  ctx.fillRect(w * 0.65, h * 0.58, w * 0.15, h * 0.015);
  // Door
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(w * 0.44, h * 0.65, w * 0.12, h * 0.3);
  ctx.fillStyle = '#4a3024';
  ctx.fillRect(w * 0.44, h * 0.65, w * 0.12, h * 0.015);
  // Door knob
  ctx.fillStyle = '#aaaa66';
  ctx.fillRect(w * 0.53, h * 0.8, w * 0.01, w * 0.01);
  // Attic window
  ctx.fillStyle = '#8a3a1a';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.33, w * 0.04, 0, Math.PI * 2);
  ctx.fill();
});

Sprites.define('bat', 32, 20, (ctx, w, h) => {
  ctx.fillStyle = '#0a0a0a';
  // Body
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.08, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wings
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.5);
  ctx.quadraticCurveTo(w * 0.25, h * 0.2, w * 0.0, h * 0.5);
  ctx.quadraticCurveTo(w * 0.25, h * 0.6, w * 0.5, h * 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.5);
  ctx.quadraticCurveTo(w * 0.75, h * 0.2, w * 1.0, h * 0.5);
  ctx.quadraticCurveTo(w * 0.75, h * 0.6, w * 0.5, h * 0.5);
  ctx.fill();
});

Sprites.define('pumpkin', 50, 42, (ctx, w, h) => {
  ctx.fillStyle = '#c05a1a';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.6, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ridges
  ctx.fillStyle = '#8a3e10';
  ctx.beginPath();
  ctx.ellipse(w * 0.3, h * 0.6, w * 0.08, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.7, h * 0.6, w * 0.08, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.fillStyle = '#3a2a14';
  ctx.fillRect(w * 0.46, h * 0.18, w * 0.08, h * 0.14);
  // Face
  ctx.fillStyle = '#2a0a00';
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.55); ctx.lineTo(w * 0.4, h * 0.5); ctx.lineTo(w * 0.4, h * 0.6); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.7, h * 0.55); ctx.lineTo(w * 0.6, h * 0.5); ctx.lineTo(w * 0.6, h * 0.6); ctx.closePath();
  ctx.fill();
  // Mouth
  ctx.fillRect(w * 0.3, h * 0.72, w * 0.4, h * 0.04);
});
