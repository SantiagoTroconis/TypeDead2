class Bullet extends GameObject {
  constructor(x, y, targetX, targetY, color) {
    super(x, y, 4, 4);
    const dx = targetX - x, dy = targetY - y;
    const d = Math.max(1, Math.hypot(dx, dy));
    this.speed = 1600;
    this.vx = (dx / d) * this.speed;
    this.vy = (dy / d) * this.speed;
    this.life = 0.9;
    this.age = 0;
    this.color = color || '#eaff6a';
    this.trail = [];
  }
  update(dt) {
    this.age += dt;
    if (this.age >= this.life) { this.dead = true; return; }
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw(ctx) {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const t = i / this.trail.length;
      ctx.save();
      ctx.globalAlpha = t * 0.6;
      ctx.fillStyle = this.color;
      const s = 2 + t * 2;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.restore();
    }
    // Head
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
    ctx.restore();
  }
}
