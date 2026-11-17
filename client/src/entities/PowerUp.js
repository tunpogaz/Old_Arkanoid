export const POWERUP_TYPES = {
  LONGER: 'LONGER',
  SHORTEN: 'SHORTEN',
  DUPLICATE: 'DUPLICATE',
  BIGGER_BALL: 'BIGGER_BALL',
  LIFE_UP: 'LIFE_UP',
  SHOT: 'SHOT',
  FALL_BOOM: 'FALL_BOOM',
  GOLD: 'GOLD'
};

const POWERUP_IMAGES = {
  LONGER: '/assets/image/LongerPaddlePowerUp.png',
  SHORTEN: '/assets/image/ShortenPaddlePowerUp.png',
  DUPLICATE: '/assets/image/DuplicateBallPowerUp.png',
  BIGGER_BALL: '/assets/image/BiggerBallPowerUp.png',
  LIFE_UP: '/assets/image/LifeUpPowerUp.png',
  SHOT: '/assets/image/ShotPowerUp.png',
  FALL_BOOM: '/assets/image/FallBoomPowerUp.png',
  GOLD: '/assets/image/GoldPowerUp.png'
};

const loadedImages = {};
for (const [key, src] of Object.entries(POWERUP_IMAGES)) {
  const img = new Image();
  img.src = src;
  loadedImages[key] = img;
}

export class PowerUp {
  constructor(x, y, type = null) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 32;
    this.vy = 2.8;
    this.active = true;

    if (!type) {
      const types = Object.keys(POWERUP_TYPES);
      this.type = types[Math.floor(Math.random() * types.length)];
    } else {
      this.type = type;
    }
  }

  update(boundsHeight) {
    this.y += this.vy;
    if (this.y > boundsHeight) {
      this.active = false;
    }
  }

  render(ctx) {
    const img = loadedImages[this.type];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    } else {
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.type[0], this.x, this.y);
      ctx.restore();
    }
  }

  collidesWith(paddle) {
    return (
      this.x + this.w / 2 >= paddle.x &&
      this.x - this.w / 2 <= paddle.x + paddle.w &&
      this.y + this.h / 2 >= paddle.y &&
      this.y - this.h / 2 <= paddle.y + paddle.h
    );
  }
}
