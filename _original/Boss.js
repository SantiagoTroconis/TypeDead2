class Boss extends Zombie {
  constructor(x, y, word, speed, stage) {
    super(x, y, word, speed, stage);
    this.width = 90;
    this.height = 130;
    this.damage = 25;
    this.scoreValue = 500 + stage * 100;
    this.isBoss = true;
    this.phase = 0;
    this.hp = 1;
  }
  draw(ctx) {
    const w = this.width, h = this.height;
    const x = this.x - w / 2, y = this.y - h;
    const sway = Math.sin(this.walkPhase * 0.8) * 3;
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y - 2, w * 0.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    const p = this.palette;
    const flash = this.hitFlash > 0 ? Math.floor(this.hitFlash * 10) % 2 === 0 : false;
    // Legs
    const legOffset = Math.sin(this.walkPhase) * 5;
    ctx.fillStyle = p.pants;
    ctx.fillRect(x + w * 0.22, y + h * 0.65, w * 0.22, h * 0.33 + legOffset);
    ctx.fillRect(x + w * 0.56, y + h * 0.65, w * 0.22, h * 0.33 - legOffset);
    // Cape / cloak
    if (!flash) {
      ctx.fillStyle = '#1a0505';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.0, y + h * 0.35);
      ctx.lineTo(x + w * 0.5, y + h * 0.95);
      ctx.lineTo(x + w * 1.0, y + h * 0.35);
      ctx.lineTo(x + w * 0.85, y + h * 0.35);
      ctx.lineTo(x + w * 0.5, y + h * 0.85);
      ctx.lineTo(x + w * 0.15, y + h * 0.35);
      ctx.closePath();
      ctx.fill();
    }
    // Body — bigger & armored
    ctx.fillStyle = flash ? '#ffffff' : p.shirt;
    ctx.fillRect(x + w * 0.12, y + h * 0.35 + sway * 0.3, w * 0.76, h * 0.37);
    // Armor plates
    if (!flash) {
      ctx.fillStyle = '#3a1a1a';
      ctx.fillRect(x + w * 0.15, y + h * 0.4, w * 0.7, h * 0.04);
      ctx.fillRect(x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.03);
    }
    // Arms
    ctx.fillStyle = flash ? '#ffffff' : p.skin;
    const armSway = Math.sin(this.walkPhase * 0.7) * 4;
    ctx.fillRect(x - w * 0.04, y + h * 0.38 + armSway, w * 0.2, h * 0.14);
    ctx.fillRect(x + w * 0.84, y + h * 0.38 - armSway, w * 0.2, h * 0.14);
    // Clawed hands
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(x - w * 0.06, y + h * 0.5 + armSway, w * 0.08, h * 0.04);
    ctx.fillRect(x + w * 0.98, y + h * 0.5 - armSway, w * 0.08, h * 0.04);
    // Head
    const hx = x + w * 0.18, hy = y + h * 0.05 + sway;
    ctx.fillStyle = flash ? '#ffffff' : p.skin;
    ctx.fillRect(hx, hy, w * 0.64, h * 0.32);
    // Horns / crown
    if (!flash) {
      ctx.fillStyle = '#1a0a0a';
      ctx.beginPath();
      ctx.moveTo(hx, hy); ctx.lineTo(hx - w * 0.08, hy - h * 0.1); ctx.lineTo(hx + w * 0.1, hy - h * 0.02); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx + w * 0.64, hy); ctx.lineTo(hx + w * 0.72, hy - h * 0.1); ctx.lineTo(hx + w * 0.54, hy - h * 0.02); ctx.closePath();
      ctx.fill();
    }
    // Eyes — big glowing
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 12;
    ctx.fillRect(hx + w * 0.08, hy + h * 0.14, w * 0.18, h * 0.07);
    ctx.fillRect(hx + w * 0.4, hy + h * 0.14, w * 0.18, h * 0.07);
    ctx.shadowBlur = 0;
    // Fanged mouth
    ctx.fillStyle = '#1a0404';
    ctx.fillRect(hx + w * 0.15, hy + h * 0.24, w * 0.35, h * 0.04);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx + w * 0.2, hy + h * 0.25, w * 0.03, h * 0.03);
    ctx.fillRect(hx + w * 0.28, hy + h * 0.26, w * 0.03, h * 0.04);
    ctx.fillRect(hx + w * 0.4, hy + h * 0.26, w * 0.03, h * 0.04);
    ctx.restore();
  }
}
