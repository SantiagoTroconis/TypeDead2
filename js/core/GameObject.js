// Base class for everything that lives in the world (player, zombies, bullets, particles).
class GameObject {
  constructor(x, y, width, height) {
    this.x = +x || 0;
    this.y = +y || 0;
    this.width = +width || 0;
    this.height = +height || 0;
    this.dead = false;
  }
  update(dt) {}
  draw(ctx) {}
}
