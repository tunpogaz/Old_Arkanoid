export class Ball {
  constructor(x, y, isAttached = true) {
    this.defaultRadius = 11;
    this.r = this.defaultRadius;
    this.x = x;
    this.y = y;
    this.baseSpeed = 7.5;
    this.maxSpeed = 11.5;
    this.dx = 0;
    this.dy = 0;
    this.active = true;
    this.isAttached = isAttached;
    this.isBigger = false;
    this.bigTimer = 0;
    this.animTick = 0;
    this.currentPaddle = null;
    this.attachOffsetRatio = 0;

    this.img = new Image();
    this.img.src = '/assets/image/ballSkin1.png';
  }

  getLaunchAngle(paddle = null) {
    const pad = paddle || this.currentPaddle;
    if (!pad) return 0;
    if (pad.dx < 0) return -Math.PI * 0.22;
    if (pad.dx > 0) return Math.PI * 0.22;
    if (pad.lastDirection < 0) return -Math.PI * 0.12;
    if (pad.lastDirection > 0) return Math.PI * 0.12;
    return 0;
  }

  launch(paddle = null) {
    if (!this.isAttached) return;
    this.isAttached = false;
    const pad = paddle || this.currentPaddle;
    const angle = this.getLaunchAngle(pad);
    this.dx = this.baseSpeed * Math.sin(angle);
    this.dy = -this.baseSpeed * Math.cos(angle);
  }

  setBigger() {
    this.isBigger = true;
    this.r = 19;
    this.bigTimer = 550;
  }

  resetSize() {
    this.isBigger = false;
    this.r = this.defaultRadius;
  }

  update(bounds, paddle, sounds, particles) {
    this.animTick++;
    this.currentPaddle = paddle;

    if (this.isAttached) {
      const targetRatio = paddle.dx < 0 ? -0.22 : paddle.dx > 0 ? 0.22 : (paddle.lastDirection * 0.10);
      this.attachOffsetRatio += (targetRatio - this.attachOffsetRatio) * 0.2;
      this.x = paddle.x + paddle.w / 2 + this.attachOffsetRatio * (paddle.w / 2);
      this.y = paddle.y - this.r - 2;
      return false;
    }

    if (this.isBigger) {
      this.bigTimer--;
      if (this.bigTimer <= 0) {
        this.resetSize();
      }
    }

    if (particles && Math.random() < 0.65) {
      particles.createBallTrail(this.x, this.y, this.isBigger ? '#fbbf24' : '#60a5fa');
    }

    this.x += this.dx;
    this.y += this.dy;

    if (Math.abs(this.dy) < 2.0) {
      this.dy = this.dy >= 0 ? 2.2 : -2.2;
    }

    if (this.x - this.r <= bounds.x) {
      this.x = bounds.x + this.r;
      this.dx = Math.abs(this.dx);
      if (sounds) sounds.playTone(360, 0.05, 'sine');
    } else if (this.x + this.r >= bounds.x + bounds.w) {
      this.x = bounds.x + bounds.w - this.r;
      this.dx = -Math.abs(this.dx);
      if (sounds) sounds.playTone(360, 0.05, 'sine');
    }

    if (this.y - this.r <= bounds.y) {
      this.y = bounds.y + this.r;
      this.dy = Math.abs(this.dy);
      if (sounds) sounds.playTone(360, 0.05, 'sine');
    }

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

      const maxAngle = Math.PI * 0.40;
      const bounceAngle = clampedHit * maxAngle;
      const currentSpeed = Math.min(this.maxSpeed, Math.max(this.baseSpeed, Math.sqrt(this.dx * this.dx + this.dy * this.dy) * 1.02));

      this.dx = currentSpeed * Math.sin(bounceAngle) + (paddle.dx * 0.25);
      this.dy = -Math.abs(currentSpeed * Math.cos(bounceAngle));
      this.y = paddle.y - this.r - 1;

      if (Math.abs(this.dy) < 2.5) {
        this.dy = -2.8;
      }

      if (sounds) sounds.playPaddleHit();
      return true;
    }

    if (this.y - this.r > bounds.y + bounds.h) {
      this.active = false;
    }
    return false;
  }

  render(ctx) {
    ctx.save();

    if (this.isAttached && this.currentPaddle) {
      const angle = this.getLaunchAngle(this.currentPaddle);
      const dirX = Math.sin(angle);
      const dirY = -Math.cos(angle);

      ctx.save();
      for (let d = 20; d <= 120; d += 18) {
        const px = this.x + dirX * d;
        const py = this.y + dirY * d;
        const alpha = 0.95 - (d / 140) * 0.75;
        const dotR = 3.2 - (d / 140) * 1.6;

        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.img.complete && this.img.naturalWidth === 360 && this.img.naturalHeight === 5760) {
      const totalFrames = 16;
      const frameHeight = 360;
      const currentFrame = Math.floor(this.animTick / 3) % totalFrames;

      ctx.shadowColor = this.isBigger ? '#fbbf24' : '#38bdf8';
      ctx.shadowBlur = this.isBigger ? 18 : 10;
      ctx.drawImage(
        this.img,
        0, currentFrame * frameHeight, 360, frameHeight,
        this.x - this.r, this.y - this.r, this.r * 2, this.r * 2
      );
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.1,
        this.x, this.y, this.r
      );
      if (this.isBigger) {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#fde047');
        grad.addColorStop(1, '#ea580c');
        ctx.shadowColor = '#f59e0b';
      } else {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#7dd3fc');
        grad.addColorStop(1, '#0284c7');
        ctx.shadowColor = '#38bdf8';
      }
      ctx.shadowBlur = 14;
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }
}
