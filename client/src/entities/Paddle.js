import { Bullet } from './Bullet.js';

export class Paddle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.normalWidth = 140;
    this.w = this.normalWidth;
    this.h = 20;
    this.x = (canvasWidth - this.w) / 2;
    this.y = canvasHeight - 55;
    this.speed = 12;
    this.dx = 0;
    this.lives = 3;
    this.canShoot = false;
    this.shootTimer = 0;
    this.bullets = [];

    this.img = new Image();
    this.img.src = '/assets/image/paddleImage.png';
  }

  reset() {
    this.w = this.normalWidth;
    this.x = (this.canvasWidth - this.w) / 2;
    this.dx = 0;
    this.canShoot = false;
    this.bullets = [];
  }

  setLength(type) {
    if (type === 'LONGER') {
      this.w = Math.min(260, this.normalWidth * 1.6);
    } else if (type === 'SHORTEN') {
      this.w = Math.max(70, this.normalWidth * 0.65);
    } else {
      this.w = this.normalWidth;
    }
  }

  enableShooting() {
    this.canShoot = true;
    this.shootTimer = 450; // frames (~7.5s)
  }

  fire(sounds) {
    if (!this.canShoot) return;
    this.bullets.push(new Bullet(this.x + 12, this.y));
    this.bullets.push(new Bullet(this.x + this.w - 12, this.y));
    if (sounds) sounds.playLaser();
  }

  moveLeft() {
    this.dx = -this.speed;
  }

  moveRight() {
    this.dx = this.speed;
  }

  stop() {
    this.dx = 0;
  }

  moveTo(mouseX) {
    this.x = mouseX - this.w / 2;
    this.clamp();
  }

  clamp() {
    if (this.x < 30) this.x = 30;
    if (this.x + this.w > this.canvasWidth - 30) {
      this.x = this.canvasWidth - 30 - this.w;
    }
  }

  update(sounds) {
    this.x += this.dx;
    this.clamp();

    if (this.canShoot) {
      this.shootTimer--;
      if (this.shootTimer % 22 === 0) {
        this.fire(sounds);
      }
      if (this.shootTimer <= 0) {
        this.canShoot = false;
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].update();
      if (!this.bullets[i].active) {
        this.bullets.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // Render bullets
    for (const b of this.bullets) {
      b.render(ctx);
    }

    // Render paddle body
    if (this.img.complete && this.img.naturalWidth > 0) {
      ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
    } else {
      ctx.save();
      const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h, 8);
      ctx.fill();
      ctx.restore();
    }

    // Laser cannons indicator
    if (this.canShoot) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.x + 6, this.y - 6, 6, 8);
      ctx.fillRect(this.x + this.w - 12, this.y - 6, 6, 8);
    }
  }
}
