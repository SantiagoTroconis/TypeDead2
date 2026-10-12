class Particle extends GameObject {
  constructor(x, y, opts = {}) {
    super(x, y, 2, 2);
    this.vx = opts.vx ?? (Math.random() - 0.5) * 160;
    this.vy = opts.vy ?? (Math.random() - 0.5) * 160;
    this.life = opts.life ?? 0.6;
    this.age = 0;
    this.color = opts.color ?? '#7bff6a';
    this.size = opts.size ?? 2 + Math.random() * 2;
    this.gravity = opts.gravity ?? 220;
    this.fade = opts.fade ?? true;
  }
  update(dt) {
    this.age += dt;
    if (this.age >= this.life) { this.dead = true; return; }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw(ctx) {
    const t = 1 - this.age / this.life;
    ctx.save();
    ctx.globalAlpha = this.fade ? Math.max(0, t) : 1;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}
