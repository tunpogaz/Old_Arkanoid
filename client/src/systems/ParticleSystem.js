// Visual Particle Effects System
export class Particle {
  constructor(x, y, color, vx, vy, size, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.maxLife = life;
    this.life = life;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15; // gravity
    this.life--;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeTime = 0;
  }

  createBrickExplosion(x, y, w, h, color) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 1;
      const size = 3 + Math.random() * 4;
      const life = 25 + Math.random() * 20;
      this.particles.push(new Particle(px, py, color, vx, vy, size, life));
    }
  }

  createBallTrail(x, y, color = '#60a5fa') {
    this.particles.push(new Particle(x, y, color, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 5, 12));
  }

  addFloatingText(text, x, y, color = '#fbbf24') {
    this.floatingTexts.push({
      text, x, y, color, life: 40, maxLife: 40
    });
  }

  triggerScreenShake(duration = 10) {
    this.shakeTime = duration;
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].y -= 0.8;
      this.floatingTexts[i].life--;
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
    if (this.shakeTime > 0) this.shakeTime--;
  }

  render(ctx) {
    for (const p of this.particles) {
      p.render(ctx);
    }
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  applyShake(ctx) {
    if (this.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * 8;
      const dy = (Math.random() - 0.5) * 8;
      ctx.translate(dx, dy);
    }
  }
}
