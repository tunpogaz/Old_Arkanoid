export class Ball {
  constructor(x, y) {
    this.defaultRadius = 10;
    this.r = this.defaultRadius;
    this.x = x;
    this.y = y;
    this.baseSpeed = 6.5;
    this.maxSpeed = 10.0;
    this.dx = this.baseSpeed * (Math.random() > 0.5 ? 0.6 : -0.6);
    this.dy = -this.baseSpeed;
    this.active = true;
    this.isBigger = false;
    this.bigTimer = 0;

    this.img = new Image();
    this.img.src = '/assets/image/ballSkin1.png';
  }

  setBigger() {
    this.isBigger = true;
    this.r = 18;
    this.bigTimer = 500;
  }

  resetSize() {
    this.isBigger = false;
    this.r = this.defaultRadius;
  }

  update(bounds, paddle, sounds, particles) {
    if (this.isBigger) {
      this.bigTimer--;
      if (this.bigTimer <= 0) {
        this.resetSize();
      }
    }

    // Emit trail
    if (particles && Math.random() < 0.6) {
      particles.createBallTrail(this.x, this.y, this.isBigger ? '#f59e0b' : '#38bdf8');
    }

    this.x += this.dx;
    this.y += this.dy;

    // Bounds collision: Left and Right
    if (this.x - this.r <= bounds.x) {
      this.x = bounds.x + this.r;
      this.dx = -this.dx;
      if (sounds) sounds.playTone(360, 0.05, 'sine');
    } else if (this.x + this.r >= bounds.x + bounds.w) {
      this.x = bounds.x + bounds.w - this.r;
      this.dx = -this.dx;
      if (sounds) sounds.playTone(360, 0.05, 'sine');
    }

    // Bounds collision: Top
    if (this.y - this.r <= bounds.y) {
      this.y = bounds.y + this.r;
      this.dy = -this.dy;
      if (sounds) sounds.playTone(360, 0.05, 'sine');
    }

    // Paddle collision
    if (
      this.y + this.r >= paddle.y &&
      this.y - this.r <= paddle.y + paddle.h &&
      this.x + this.r >= paddle.x &&
      this.x - this.r <= paddle.x + paddle.w &&
      this.dy > 0
    ) {
      const paddleCenter = paddle.x + paddle.w / 2;
      const hitOffset = (this.x - paddleCenter) / (paddle.w / 2);
      const clampedHit = Math.max(-1, Math.min(1, hitOffset));

      const maxAngle = Math.PI * 0.41; // ~75 degrees
      const bounceAngle = clampedHit * maxAngle;
      const currentSpeed = Math.min(this.maxSpeed, Math.sqrt(this.dx * this.dx + this.dy * this.dy) * 1.02);

      this.dx = currentSpeed * Math.sin(bounceAngle) + paddle.dx * 0.2;
      this.dy = -currentSpeed * Math.cos(bounceAngle);
      this.y = paddle.y - this.r;

      if (sounds) sounds.playPaddleHit();
      return true;
    }

    // Fall out of bottom
    if (this.y - this.r > bounds.y + bounds.h) {
      this.active = false;
    }
    return false;
  }

  render(ctx) {
    if (this.img.complete && this.img.naturalWidth > 0) {
      ctx.drawImage(this.img, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.isBigger ? '#fbbf24' : '#ffffff';
      ctx.shadowColor = this.isBigger ? '#f59e0b' : '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }
  }
}
