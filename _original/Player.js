class Player extends GameObject {
  constructor(x, y) {
    super(x, y, 60, 90);
    this.hp = 100;
    this.maxHp = 100;
    this.recoil = 0;
    this.aim = 0; // radians
    this.muzzleFlash = 0;
    this.hitFlash = 0;
    this.breath = 0;
  }
  update(dt) {
    this.recoil = Math.max(0, this.recoil - dt * 10);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 10);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    this.breath += dt;
  }
  takeDamage(n) {
    this.hp = Math.max(0, this.hp - n);
    this.hitFlash = 1;
  }
  shoot(targetX, targetY) {
    this.recoil = 1;
    this.muzzleFlash = 1;
    const dx = targetX - this.x, dy = targetY - (this.y - this.height * 0.55);
    this.aim = Math.atan2(dy, dx);
  }
  draw(ctx) {
    const w = this.width, h = this.height;
    const cx = this.x, baseY = this.y;
    const breath = Math.sin(this.breath * 2) * 1.2;
    const recoilOffset = this.recoil * 4;
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY, w * 0.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const flash = this.hitFlash > 0 ? Math.floor(this.hitFlash * 10) % 2 === 0 : false;
    // Legs
    ctx.fillStyle = flash ? '#ffffff' : '#1a1a1a';
    ctx.fillRect(cx - w * 0.28, baseY - h * 0.35, w * 0.22, h * 0.35);
    ctx.fillRect(cx + w * 0.06, baseY - h * 0.35, w * 0.22, h * 0.35);
    // Boots
    ctx.fillStyle = flash ? '#ffffff' : '#0a0a0a';
    ctx.fillRect(cx - w * 0.3, baseY - h * 0.04, w * 0.26, h * 0.04);
    ctx.fillRect(cx + w * 0.04, baseY - h * 0.04, w * 0.26, h * 0.04);
    // Torso (jacket)
    const bodyY = baseY - h * 0.35 - h * 0.3 + breath + recoilOffset;
    ctx.fillStyle = flash ? '#ffffff' : '#2a3a2a';
    ctx.fillRect(cx - w * 0.32, bodyY, w * 0.64, h * 0.33);
    // Belt
    ctx.fillStyle = flash ? '#ffffff' : '#1a1a0a';
    ctx.fillRect(cx - w * 0.32, bodyY + h * 0.28, w * 0.64, h * 0.05);
    // Head
    const headY = bodyY - h * 0.26;
    ctx.fillStyle = flash ? '#ffffff' : '#d4a480';
    ctx.fillRect(cx - w * 0.18, headY, w * 0.36, h * 0.26);
    // Hair
    ctx.fillStyle = flash ? '#ffffff' : '#1a0f08';
    ctx.fillRect(cx - w * 0.18, headY, w * 0.36, h * 0.08);
    // Eyes
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(cx - w * 0.11, headY + h * 0.12, w * 0.06, h * 0.03);
    ctx.fillRect(cx + w * 0.05, headY + h * 0.12, w * 0.06, h * 0.03);
    // Gun — aimed at target
    const gx = cx + w * 0.0;
    const gy = bodyY + h * 0.08;
    const aim = this.aim;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(aim);
    ctx.fillStyle = flash ? '#ffffff' : '#2a2a2a';
    ctx.fillRect(0, -4, 38 - recoilOffset * 2, 8);
    ctx.fillStyle = flash ? '#ffffff' : '#1a1a1a';
    ctx.fillRect(0, -8, 10, 12);
    // Muzzle flash
    if (this.muzzleFlash > 0) {
      const mfs = this.muzzleFlash;
      ctx.save();
      ctx.globalAlpha = mfs;
      ctx.fillStyle = '#fff8aa';
      ctx.shadowColor = '#ffe56a';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(38, 0);
      ctx.lineTo(38 + 16 * mfs, -6 * mfs);
      ctx.lineTo(38 + 24 * mfs, 0);
      ctx.lineTo(38 + 16 * mfs, 6 * mfs);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // Arm holding gun
    ctx.fillStyle = flash ? '#ffffff' : '#2a3a2a';
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(aim);
    ctx.fillRect(-4, -5, 14, 10);
    ctx.restore();
    ctx.restore();
  }
  getMuzzleWorldPos() {
    const bodyY = this.y - this.height * 0.35 - this.height * 0.3;
    const gy = bodyY + this.height * 0.08;
    const gx = this.x;
    const d = 36;
    return { x: gx + Math.cos(this.aim) * d, y: gy + Math.sin(this.aim) * d };
  }
}
