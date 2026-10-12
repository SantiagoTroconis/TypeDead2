class Zombie extends GameObject {
  constructor(x, y, word, speed, stage) {
    super(x, y, 46, 70);
    this.word = word;
    this.typed = 0; // number of correctly-typed chars
    this.speed = speed;
    this.stage = stage || 1;
    this.targeted = false;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.jitter = 0;
    this.hitFlash = 0;
    this.damage = 10;
    this.scoreValue = 50 + (stage - 1) * 15;
    this.variant = Math.floor(Math.random() * 3);
    // Palette by stage
    const palettes = [
      { skin: '#5c7a4a', shirt: '#3a2a24', pants: '#1d1a16', eye: '#ffe56a' }, // graveyard
      { skin: '#6a5c3a', shirt: '#4a2a14', pants: '#2a1a14', eye: '#ff8d3a' }, // pumpkin field
      { skin: '#7a4a4a', shirt: '#2a1414', pants: '#1a0e0e', eye: '#ff3b3b' }, // blood
      { skin: '#4a4a6a', shirt: '#1a1a2a', pants: '#0e0e1a', eye: '#8aaaff' }, // woods
      { skin: '#3a3a3a', shirt: '#1a1a1a', pants: '#0a0a0a', eye: '#ff00ff' }  // final
    ];
    this.palette = palettes[Math.min(4, stage - 1)];
  }
  update(dt, player) {
    this.walkPhase += dt * 6;
    this.jitter = Math.sin(this.walkPhase * 1.3) * 2;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    // Move toward player
    const px = player.x, py = player.y;
    const dx = px - this.x, dy = py - this.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const sp = this.speed * (this.targeted ? 0.75 : 1);
    this.x += (dx / d) * sp * dt;
    this.y += (dy / d) * sp * dt * 0.35; // mostly horizontal
  }
  typeChar(ch) {
    if (this.typed < this.word.length && this.word[this.typed].toLowerCase() === ch.toLowerCase()) {
      this.typed++;
      this.hitFlash = 1;
      return true;
    }
    return false;
  }
  get fullyTyped() { return this.typed >= this.word.length; }
  firstUntyped() { return this.word[this.typed]; }
  draw(ctx) {
    const w = this.width, h = this.height;
    const x = this.x - w / 2, y = this.y - h;
    const sway = Math.sin(this.walkPhase) * 2;
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y - 2, w * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const p = this.palette;
    const flash = this.hitFlash > 0 ? Math.floor(this.hitFlash * 10) % 2 === 0 : false;
    // Legs
    const legOffset = Math.sin(this.walkPhase) * 4;
    ctx.fillStyle = p.pants;
    ctx.fillRect(x + w * 0.22, y + h * 0.65, w * 0.22, h * 0.33 + legOffset);
    ctx.fillRect(x + w * 0.56, y + h * 0.65, w * 0.22, h * 0.33 - legOffset);
    // Body
    ctx.fillStyle = flash ? '#ffffff' : p.shirt;
    ctx.fillRect(x + w * 0.15, y + h * 0.35 + sway * 0.3, w * 0.7, h * 0.35);
    // Shirt tatters
    if (!flash) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x + w * 0.25, y + h * 0.6, w * 0.1, h * 0.08);
      ctx.fillRect(x + w * 0.6, y + h * 0.55, w * 0.08, h * 0.1);
    }
    // Arms outstretched
    ctx.fillStyle = flash ? '#ffffff' : p.skin;
    const armSway = Math.sin(this.walkPhase * 0.7) * 3;
    ctx.fillRect(x + w * 0.0, y + h * 0.38 + armSway, w * 0.18, h * 0.1);
    ctx.fillRect(x + w * 0.82, y + h * 0.38 - armSway, w * 0.18, h * 0.1);
    // Head
    const hx = x + w * 0.2, hy = y + h * 0.1 + sway;
    ctx.fillStyle = flash ? '#ffffff' : p.skin;
    ctx.fillRect(hx, hy, w * 0.6, h * 0.3);
    // Hair / scalp
    if (!flash) {
      ctx.fillStyle = p.pants;
      ctx.fillRect(hx, hy, w * 0.6, h * 0.06);
      ctx.fillRect(hx + w * 0.0, hy + h * 0.06, w * 0.1, h * 0.04);
      ctx.fillRect(hx + w * 0.5, hy + h * 0.06, w * 0.1, h * 0.04);
    }
    // Eyes (glowing)
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 6;
    ctx.fillRect(hx + w * 0.1, hy + h * 0.14, w * 0.12, h * 0.05);
    ctx.fillRect(hx + w * 0.38, hy + h * 0.14, w * 0.12, h * 0.05);
    ctx.shadowBlur = 0;
    // Mouth (drool)
    ctx.fillStyle = '#2a0808';
    ctx.fillRect(hx + w * 0.2, hy + h * 0.22, w * 0.2, h * 0.03);
    ctx.fillStyle = '#8a2a2a';
    ctx.fillRect(hx + w * 0.28, hy + h * 0.25, w * 0.03, h * 0.05);
    ctx.restore();
  }
  drawWord(ctx) {
    const w = this.width, h = this.height;
    const cx = this.x;
    const topY = this.y - h - 14;
    const typed = this.word.substring(0, this.typed);
    const remaining = this.word.substring(this.typed);
    ctx.save();
    ctx.font = this.word.length > 10 ? 'bold 20px "VT323", monospace' : 'bold 24px "VT323", monospace';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    const totalW = ctx.measureText(this.word).width;
    // Background
    ctx.fillStyle = this.targeted ? 'rgba(123,255,106,0.18)' : 'rgba(0,0,0,0.65)';
    ctx.fillRect(cx - totalW / 2 - 6, topY - 22, totalW + 12, 26);
    // Border
    ctx.strokeStyle = this.targeted ? '#7bff6a' : '#444';
    ctx.lineWidth = this.targeted ? 2 : 1;
    ctx.strokeRect(cx - totalW / 2 - 6, topY - 22, totalW + 12, 26);
    // Draw typed portion (dim green) + remaining (bright)
    ctx.textAlign = 'left';
    const startX = cx - totalW / 2;
    ctx.fillStyle = '#2a7a1a';
    ctx.shadowColor = '#2a7a1a';
    ctx.shadowBlur = 3;
    ctx.fillText(typed, startX, topY);
    const typedW = ctx.measureText(typed).width;
    ctx.fillStyle = this.targeted ? '#eaff6a' : '#cfcfcf';
    ctx.shadowColor = this.targeted ? '#eaff6a' : 'transparent';
    ctx.shadowBlur = this.targeted ? 6 : 0;
    ctx.fillText(remaining, startX + typedW, topY);
    ctx.restore();
  }
}
