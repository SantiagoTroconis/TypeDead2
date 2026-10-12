// Stage backdrop: sky, moon, clouds, silhouettes, ground props, bats and fog.
// Purely decorative — it never interacts with gameplay.
class Scenery {
  constructor() {
    this.time = 0;
    this.cloudTime = 0;
    this.bats = [];
    this.w = Viewport.width;
    this.h = Viewport.height;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
  }

  initBats() {
    this.bats = [];
    for (let i = 0; i < 5; i++) {
      this.bats.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h * 0.4 + 20,
        vx: 40 + Math.random() * 60,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt) {
    this.time += dt;
    this.cloudTime += dt;
    for (const b of this.bats) {
      b.x += b.vx * dt;
      b.phase += dt * 6;
      if (b.x > this.w + 40) { b.x = -40; b.y = Math.random() * this.h * 0.4 + 20; }
    }
  }

  draw(ctx, w, h, stage) {
    this.w = w; this.h = h;
    // Sky gradient by stage
    const skyPalettes = {
      1: ['#070a14', '#131a28', '#1a1424'],
      2: ['#0a0708', '#1f110a', '#2a140a'],
      3: ['#0a0505', '#1a0808', '#2a0a0a'],
      4: ['#040810', '#0a1420', '#101828'],
      5: ['#000', '#0a0010', '#1a0020']
    };
    const pal = skyPalettes[stage] || skyPalettes[1];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, pal[0]);
    g.addColorStop(0.6, pal[1]);
    g.addColorStop(1, pal[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const sx = (i * 97.13 + stage * 13.7) % w;
      const sy = (i * 53.11) % (h * 0.5);
      const tw = (Math.sin(this.time * 2 + i) + 1) * 0.5;
      ctx.globalAlpha = 0.3 + tw * 0.5;
      ctx.fillStyle = '#e8ead0';
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.restore();

    // Moon
    ctx.drawImage(Sprites.get('moon'), w * 0.12, h * 0.08, 150, 150);

    // Clouds (dark drifting)
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 4; i++) {
      const cx = ((this.cloudTime * (10 + i * 4) + i * 300) % (w + 400)) - 200;
      const cy = 40 + i * 30;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 100 + i * 10, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Mid-ground silhouette
    this.drawStageMidground(ctx, stage);

    // Ground
    const groundY = h * 0.82;
    const gg = ctx.createLinearGradient(0, groundY, 0, h);
    const groundTop = stage === 2 ? '#1a0f08' : stage === 3 ? '#120a0a' : stage === 4 ? '#0a0f10' : stage === 5 ? '#100018' : '#0e1210';
    const groundBot = stage === 2 ? '#2a1a10' : stage === 3 ? '#200a0a' : stage === 4 ? '#121a1a' : stage === 5 ? '#1a0028' : '#1a2018';
    gg.addColorStop(0, groundTop);
    gg.addColorStop(1, groundBot);
    ctx.fillStyle = gg;
    ctx.fillRect(0, groundY, w, h - groundY);
    // Ground texture — scattered marks
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 40; i++) {
      const gx = (i * 71 + stage * 31) % w;
      const gy = groundY + ((i * 53) % (h - groundY));
      ctx.fillRect(gx, gy, 2, 1);
    }

    // Foreground props (per stage)
    this.drawStageForeground(ctx, stage, groundY);

    // Bats
    for (const b of this.bats) {
      const flap = Math.sin(b.phase) * 0.3;
      ctx.save();
      ctx.translate(b.x, b.y + flap * 10);
      ctx.drawImage(Sprites.get('bat'), -16, -10, 32, 20);
      ctx.restore();
    }

    // Fog layer near player
    ctx.save();
    const fogG = ctx.createLinearGradient(0, groundY - 40, 0, h);
    fogG.addColorStop(0, 'rgba(80,80,90,0)');
    fogG.addColorStop(1, 'rgba(80,80,100,0.35)');
    ctx.fillStyle = fogG;
    ctx.fillRect(0, groundY - 40, w, h - groundY + 40);
    ctx.restore();
  }

  drawStageMidground(ctx, stage) {
    const w = this.w, h = this.h;
    const groundY = h * 0.82;
    if (stage === 3) {
      // House prominent
      ctx.drawImage(Sprites.get('house'), w * 0.08, groundY - 300, 420, 300);
    } else {
      // Distant house silhouette
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.drawImage(Sprites.get('house'), w * 0.02, groundY - 180, 260, 190);
      ctx.restore();
    }
    // Dead trees
    const treeCount = stage === 4 ? 5 : 3;
    for (let i = 0; i < treeCount; i++) {
      const tx = w * (0.3 + i * 0.18);
      const scale = 0.9 + (i % 2) * 0.2;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(Sprites.get('deadtree'), tx - 80 * scale, groundY - 210 * scale, 160 * scale, 220 * scale);
      ctx.restore();
    }
    // Fence line
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < Math.ceil(w / 180) + 1; i++) {
      ctx.drawImage(Sprites.get('fence'), i * 180 - 20, groundY - 50, 180, 70);
    }
    ctx.restore();
  }

  drawStageForeground(ctx, stage, groundY) {
    const w = this.w, h = this.h;
    // Tombstones scattered
    const stones = [
      [0.08, 60, 80],
      [0.22, 50, 68],
      [0.5, 70, 92],
      [0.68, 54, 72],
      [0.84, 62, 82],
      [0.38, 46, 60]
    ];
    for (const [frac, sw, sh] of stones) {
      const x = w * frac;
      if (stage === 1 || stage === 5) {
        ctx.drawImage(Sprites.get('tombstone'), x - sw / 2, groundY - sh + 8, sw, sh);
      } else if (stage === 4) {
        ctx.drawImage(Sprites.get('cross'), x - sw * 0.4, groundY - sh + 8, sw * 0.8, sh * 0.9);
      }
    }
    // Pumpkins for stage 2
    if (stage === 2) {
      const pumps = [0.1, 0.28, 0.44, 0.6, 0.75, 0.9, 0.18, 0.52];
      for (let i = 0; i < pumps.length; i++) {
        const px = w * pumps[i];
        const scale = 0.8 + (i % 3) * 0.25;
        ctx.drawImage(Sprites.get('pumpkin'), px - 25 * scale, groundY - 20 * scale, 50 * scale, 42 * scale);
      }
    }
    // Stage 3 — blood splashes on ground
    if (stage === 3) {
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const bx = (i * 173 + 40) % w;
        const by = groundY + ((i * 37) % (h - groundY - 10)) + 4;
        ctx.fillStyle = '#3a0808';
        ctx.beginPath();
        ctx.ellipse(bx, by, 18 + (i % 3) * 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a0a0a';
        ctx.fillRect(bx - 2, by - 1, 3, 2);
      }
      ctx.restore();
    }
  }
}
