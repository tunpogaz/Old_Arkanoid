export const POWERUP_TYPES = {
  LONGER: 'LONGER',
  SHORTEN: 'SHORTEN',
  DUPLICATE: 'DUPLICATE',
  BIGGER_BALL: 'BIGGER_BALL',
  LIFE_UP: 'LIFE_UP',
  SHOT: 'SHOT',
  FALL_BOOM: 'FALL_BOOM'
  // TODO: Tương lai: thêm lại nhặt vàng để mua skin paddle.
};

export const POWERUP_META = {
  LONGER: {
    label: '↔ WIDE',
    bg: '#083344',
    border: '#06b6d4',
    text: '#67e8f9',
    glow: '#06b6d4'
  },
  SHORTEN: {
    label: '>< MINI',
    bg: '#450a0a',
    border: '#ef4444',
    text: '#fca5a5',
    glow: '#ef4444'
  },
  DUPLICATE: {
    label: 'x3 MULTI',
    bg: '#3b0764',
    border: '#a855f7',
    text: '#d8b4fe',
    glow: '#a855f7'
  },
  BIGGER_BALL: {
    label: '● MEGA',
    bg: '#451a03',
    border: '#f59e0b',
    text: '#fde68a',
    glow: '#f59e0b'
  },
  LIFE_UP: {
    label: '❤️ +1 LIFE',
    bg: '#500724',
    border: '#ec4899',
    text: '#fbcfe8',
    glow: '#ec4899'
  },
  SHOT: {
    label: '⚡ LASER',
    bg: '#431407',
    border: '#ea580c',
    text: '#fdba74',
    glow: '#ea580c'
  },
  FALL_BOOM: {
    label: '💣 NUKE',
    bg: '#422006',
    border: '#eab308',
    text: '#fef08a',
    glow: '#eab308'
  }
};

const POWERUP_IMAGES = {
  LONGER: '/assets/image/LongerPaddlePowerUp.png',
  SHORTEN: '/assets/image/ShortenPaddlePowerUp.png',
  DUPLICATE: '/assets/image/DuplicateBallPowerUp.png',
  BIGGER_BALL: '/assets/image/BiggerBallPowerUp.png',
  LIFE_UP: '/assets/image/LifeUpPowerUp.png',
  SHOT: '/assets/image/ShotPowerUp.png',
  FALL_BOOM: '/assets/image/FallBoomPowerUp.png'
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
    this.w = 72;
    this.h = 24;
    this.vy = 2.4;
    this.active = true;
    this.pulseTimer = Math.random() * Math.PI * 2;

    if (!type) {
      const types = Object.keys(POWERUP_TYPES);
      this.type = types[Math.floor(Math.random() * types.length)];
    } else {
      this.type = type;
    }
  }

  update(boundsHeight) {
    this.y += this.vy;
    this.pulseTimer += 0.08;
    if (this.y > boundsHeight) {
      this.active = false;
    }
  }

  render(ctx) {
    const meta = POWERUP_META[this.type] || {
      label: this.type,
      bg: '#1e293b',
      border: '#38bdf8',
      text: '#ffffff',
      glow: '#38bdf8'
    };

    ctx.save();
    // Neon glow pulse
    const glowIntensity = 8 + Math.sin(this.pulseTimer) * 4;
    ctx.shadowColor = meta.glow;
    ctx.shadowBlur = glowIntensity;

    const x = this.x - this.w / 2;
    const y = this.y - this.h / 2;
    const r = this.h / 2;

    // Capsule background
    ctx.fillStyle = meta.bg;
    ctx.beginPath();
    ctx.roundRect(x, y, this.w, this.h, r);
    ctx.fill();

    // Capsule border
    ctx.strokeStyle = meta.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle inner highlight gloss
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 2, this.w - 8, this.h / 2 - 2, r / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();

    // Reset shadow for crisp text/icon rendering
    ctx.shadowBlur = 0;

    const img = loadedImages[this.type];
    const hasImg = img && img.complete && img.naturalWidth > 0;

    if (hasImg) {
      const iconSize = 18;
      ctx.drawImage(img, x + 4, y + (this.h - iconSize) / 2, iconSize, iconSize);

      ctx.fillStyle = meta.text;
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.label, x + 16 + (this.w - 16) / 2, y + this.h / 2);
    } else {
      ctx.fillStyle = meta.text;
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.label, this.x, this.y);
    }

    ctx.restore();
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
