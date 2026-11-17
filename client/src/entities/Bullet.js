export class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 4;
    this.h = 16;
    this.speed = 12;
    this.active = true;
  }

  update() {
    this.y -= this.speed;
    if (this.y < 0) {
      this.active = false;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#f87171';
    ctx.shadowBlur = 8;
    ctx.fillRect(this.x - this.w / 2, this.y, this.w, this.h);
    ctx.restore();
  }
}
