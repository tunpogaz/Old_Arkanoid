import { PowerUp, POWERUP_TYPES } from './PowerUp.js';
import { shouldDropNormalPowerUp, shouldPierceBrick, resolveAnimatedY, SURVIVAL_ANIM_DURATION } from '../systems/GameRules.js';

export const BRICK_TYPES = {
  EMPTY: 0,
  NORMAL: 1,
  IMMORTAL: 2,
  LIFE_UP: 3,
  FALL_BOMB: 5,
  AREA_BLAST: 6,
  LUCKY_WHEEL: 7,
  PUSH: 8
};

const BRICK_SPRITES = {
  1: '/assets/image/normal.png',
  2: '/assets/image/immortal.png',
  3: '/assets/image/lifeup.png',
  5: '/assets/image/fallBomb.png',
  6: '/assets/image/areaBlast.png',
  7: '/assets/image/luckywheel.png',
  8: '/assets/image/pushBrick.png'
};

const brickImages = {};
for (const [type, src] of Object.entries(BRICK_SPRITES)) {
  const img = new Image();
  img.src = src;
  brickImages[type] = img;
}

const BRICK_COLORS = {
  1: '#3b82f6',
  2: '#64748b',
  3: '#ec4899',
  5: '#ef4444',
  6: '#f97316',
  7: '#a855f7',
  8: '#14b8a6'
};

export class Brick {
  constructor(x, y, w, h, type, row, col) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    this.row = row;
    this.col = col;
    this.hp = type === BRICK_TYPES.IMMORTAL ? 999999 : 1;
    this.destroyed = false;
    this.points = 100;

    // Smooth vertical animation (Survival waves and PUSH bricks).
    this.targetY = y;
    this.alpha = 1;
    this.animStartY = y;
    this.animElapsed = 0;
    this.animDuration = 0;
    this.fadeIn = false;
  }

  /** Slide to a new Y. Starting from the current displayed Y avoids snapping. */
  animateTo(targetY, duration = SURVIVAL_ANIM_DURATION, { fadeIn = false } = {}) {
    this.animStartY = this.y;
    this.targetY = targetY;
    this.animElapsed = 0;
    this.animDuration = Math.max(0, duration);
    this.fadeIn = !!fadeIn;
    if (fadeIn) this.alpha = 0;
  }

  /** Add a delta to the current logical target (safe to stack mid-animation). */
  animateBy(deltaY, duration = SURVIVAL_ANIM_DURATION, options = {}) {
    this.animateTo(this.targetY + deltaY, duration, options);
  }

  /** Advance the slide; returns true on the frame the brick reaches its target. */
  updateAnimation() {
    if (this.animDuration <= 0) {
      this.targetY = this.y;
      return false;
    }

    this.animElapsed++;
    const t = Math.min(1, this.animElapsed / this.animDuration);
    this.y = resolveAnimatedY(this.animStartY, this.targetY, this.animElapsed, this.animDuration);
    if (this.fadeIn) this.alpha = t;

    if (t >= 1) {
      this.y = this.targetY;
      this.alpha = 1;
      this.animDuration = 0;
      this.animElapsed = 0;
      return true;
    }
    return false;
  }

  isImmortal() {
    return this.type === BRICK_TYPES.IMMORTAL;
  }

  getColor() {
    return BRICK_COLORS[this.type] || '#3b82f6';
  }

  takeHit() {
    if (this.isImmortal()) return false;
    this.hp--;
    if (this.hp <= 0) {
      this.destroyed = true;
      return true;
    }
    return false;
  }

  spawnPowerUp() {
    if (this.type === BRICK_TYPES.LIFE_UP) {
      return new PowerUp(this.x + this.w / 2, this.y + this.h / 2, POWERUP_TYPES.LIFE_UP);
    }
    if (this.type === BRICK_TYPES.FALL_BOMB) {
      return new PowerUp(this.x + this.w / 2, this.y + this.h / 2, POWERUP_TYPES.FALL_BOOM);
    }
    if (this.type === BRICK_TYPES.LUCKY_WHEEL) {
      const luckyList = [POWERUP_TYPES.DUPLICATE, POWERUP_TYPES.BIGGER_BALL, POWERUP_TYPES.SHOT, POWERUP_TYPES.LONGER];
      const r = luckyList[Math.floor(Math.random() * luckyList.length)];
      return new PowerUp(this.x + this.w / 2, this.y + this.h / 2, r);
    }
    // Random chance for normal bricks: tuned down from 16% to 6% for cleaner, balanced gameplay
    if (shouldDropNormalPowerUp(Math.random())) {
      return new PowerUp(this.x + this.w / 2, this.y + this.h / 2);
    }
    return null;
  }

  checkCollision(ball) {
    if (this.destroyed) return false;

    const nearestX = Math.max(this.x, Math.min(ball.x, this.x + this.w));
    const nearestY = Math.max(this.y, Math.min(ball.y, this.y + this.h));

    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;

    if (dx * dx + dy * dy < ball.r * ball.r) {
      const overlapLeft = (ball.x + ball.r) - this.x;
      const overlapRight = (this.x + this.w) - (ball.x - ball.r);
      const overlapTop = (ball.y + ball.r) - this.y;
      const overlapBottom = (this.y + this.h) - (ball.y - ball.r);

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      // Mega Ball smashes through regular bricks without changing direction.
      if (!shouldPierceBrick(ball, this)) {
        if (minOverlapX < minOverlapY) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
      }
      return true;
    }
    return false;
  }

  checkBulletCollision(bullet) {
    if (this.destroyed) return false;
    if (this.isImmortal()) return false;
    return (
      bullet.x >= this.x &&
      bullet.x <= this.x + this.w &&
      bullet.y >= this.y &&
      bullet.y <= this.y + this.h
    );
  }

  render(ctx) {
    if (this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const img = brickImages[this.type];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, this.x, this.y, this.w, this.h);
    } else {
      ctx.fillStyle = this.getColor();
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h, 4);
      ctx.fill();
      ctx.strokeStyle = '#ffffff22';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }
}
