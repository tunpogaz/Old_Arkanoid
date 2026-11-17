import { Paddle } from './entities/Paddle.js';
import { Ball } from './entities/Ball.js';
import { Brick, BRICK_TYPES } from './entities/Brick.js';
import { POWERUP_TYPES } from './entities/PowerUp.js';
import { getMapByLevel } from './systems/MapData.js';
import { sounds } from './systems/SoundManager.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { api } from './api/apiClient.js';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 750;

export const GAME_STATES = {
  MENU: 'MENU',
  PICK_LEVEL: 'PICK_LEVEL',
  PLAYING: 'PLAYING',
  PAUSE: 'PAUSE',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY'
};

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.state = GAME_STATES.MENU;
    this.currentLevel = 1;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.frameCount = 0;

    this.paddle = new Paddle(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.balls = [];
    this.bricks = [];
    this.powerups = [];
    this.particles = new ParticleSystem();

    this.bounds = {
      x: 30,
      y: 60,
      w: CANVAS_WIDTH - 60,
      h: CANVAS_HEIGHT - 70
    };

    this.bgImages = {};
    this.preloadBackgrounds();

    this.initInputs();
    this.updateUserUI();
    this.initDOMEvents();

    requestAnimationFrame(this.loop.bind(this));
  }

  preloadBackgrounds() {
    for (let i = 1; i <= 8; i++) {
      const img = new Image();
      img.src = `/assets/image/bk${i}.jpg`;
      img.onerror = () => { img.src = `/assets/image/bk${i}.png`; };
      this.bgImages[i] = img;
    }
  }

  getBackground() {
    const idx = ((this.currentLevel - 1) % 8) + 1;
    return this.bgImages[idx];
  }

  startLevel(level) {
    this.currentLevel = level;
    this.paddle.reset();
    this.paddle.lives = 3;

    // Initialize ball on top of paddle
    this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12)];
    this.powerups = [];
    this.combo = 0;

    // Load map bricks
    this.loadMap(this.currentLevel);

    this.state = GAME_STATES.PLAYING;
    sounds.playBgm(this.currentLevel);
  }

  loadMap(level) {
    this.bricks = [];
    const grid = getMapByLevel(level);
    const rows = 8;
    const cols = 13;
    const paddingX = 14;
    const paddingY = 8;
    const brickW = (this.bounds.w - (cols - 1) * paddingX) / cols;
    const brickH = 34;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = grid[r] && grid[r][c] !== undefined ? grid[r][c] : 0;
        if (type === BRICK_TYPES.EMPTY) continue;

        const bx = this.bounds.x + c * (brickW + paddingX);
        const by = this.bounds.y + 40 + r * (brickH + paddingY);
        this.bricks.push(new Brick(bx, by, brickW, brickH, type, r, c));
      }
    }
  }

  nextLevel() {
    if (this.currentLevel >= 20) {
      this.state = GAME_STATES.VICTORY;
      sounds.stopBgm();
      sounds.playVictory();
      api.submitScore(this.score, this.currentLevel, this.maxCombo);
      return;
    }
    this.currentLevel++;
    this.paddle.reset();
    this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12)];
    this.powerups = [];
    this.loadMap(this.currentLevel);
    sounds.playBgm(this.currentLevel);
    this.particles.addFloatingText(`LEVEL ${this.currentLevel}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#38bdf8');
  }

  handleBallLost(ball) {
    const idx = this.balls.indexOf(ball);
    if (idx !== -1) this.balls.splice(idx, 1);

    if (this.balls.length === 0) {
      this.paddle.lives--;
      sounds.playLoseBall();
      this.combo = 0;
      this.paddle.setLength('NORMAL');

      if (this.paddle.lives <= 0) {
        this.state = GAME_STATES.GAMEOVER;
        sounds.stopBgm();
        sounds.playTone(180, 0.4, 'sawtooth', 60);
        api.submitScore(this.score, this.currentLevel, this.maxCombo);
      } else {
        // Respawn single ball
        this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12)];
      }
    }
  }

  triggerAreaBlast(centerBrick) {
    sounds.playExplosion();
    this.particles.triggerScreenShake(12);

    for (const b of this.bricks) {
      if (b.destroyed || b.isImmortal()) continue;
      const dist = Math.hypot(b.x - centerBrick.x, b.y - centerBrick.y);
      if (dist < 150) {
        b.destroyed = true;
        this.score += b.points;
        this.particles.createBrickExplosion(b.x, b.y, b.w, b.h, b.getColor());
        const pu = b.spawnPowerUp();
        if (pu) this.powerups.push(pu);
      }
    }
  }

  triggerFallBoom() {
    sounds.playExplosion();
    this.particles.triggerScreenShake(15);
    let count = 0;
    for (const b of this.bricks) {
      if (!b.destroyed && !b.isImmortal() && count < 8) {
        b.destroyed = true;
        this.score += b.points;
        this.particles.createBrickExplosion(b.x, b.y, b.w, b.h, b.getColor());
        count++;
      }
    }
  }

  applyPowerUp(pu) {
    sounds.playPowerup();
    switch (pu.type) {
      case POWERUP_TYPES.LONGER:
        this.paddle.setLength('LONGER');
        this.particles.addFloatingText('WIDE PADDLE!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#38bdf8');
        break;
      case POWERUP_TYPES.SHORTEN:
        this.paddle.setLength('SHORTEN');
        this.particles.addFloatingText('SHORT PADDLE!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#f87171');
        break;
      case POWERUP_TYPES.DUPLICATE:
        const currentCount = this.balls.length;
        for (let i = 0; i < currentCount; i++) {
          const b = this.balls[i];
          const b2 = new Ball(b.x, b.y);
          b2.dx = -b.dx * 1.05;
          b2.dy = b.dy;
          this.balls.push(b2);
        }
        this.particles.addFloatingText('MULTI BALL!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#a855f7');
        break;
      case POWERUP_TYPES.BIGGER_BALL:
        this.balls.forEach(b => b.setBigger());
        this.particles.addFloatingText('MEGA BALL!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#fbbf24');
        break;
      case POWERUP_TYPES.LIFE_UP:
        this.paddle.lives++;
        this.particles.addFloatingText('+1 LIFE ❤️', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#ec4899');
        break;
      case POWERUP_TYPES.SHOT:
        this.paddle.enableShooting();
        this.particles.addFloatingText('LASER GUNS! 🔫', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#ef4444');
        break;
      case POWERUP_TYPES.FALL_BOOM:
        this.triggerFallBoom();
        this.particles.addFloatingText('NUKE BLAST! 💣', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#f97316');
        break;
      case POWERUP_TYPES.GOLD:
        this.score += 500;
        this.particles.addFloatingText('+500 GOLD 💰', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#eab308');
        break;
    }
  }

  update() {
    if (this.state !== GAME_STATES.PLAYING) return;
    this.frameCount++;

    // Paddle update
    this.paddle.update(sounds);

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Moving Bricks (horizontal shift & descend like original game)
    if (this.currentLevel >= 4 && this.frameCount % 24 === 0) {
      const shift = Math.sin(this.frameCount * 0.05) * 1.5;
      for (const b of this.bricks) {
        if (!b.destroyed && b.type === BRICK_TYPES.PUSH) {
          b.x += shift;
        }
      }
    }
    if (this.currentLevel >= 7 && this.frameCount % 360 === 0) {
      for (const b of this.bricks) {
        if (!b.destroyed) {
          b.y += 6;
          if (b.y + b.h >= this.paddle.y) {
            this.handleBallLost(this.balls[0] || null);
          }
        }
      }
    }

    // Balls update
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      const hitPaddle = ball.update(this.bounds, this.paddle, sounds, this.particles);
      if (hitPaddle) {
        // Combo breaks when ball returns to paddle
        this.combo = 0;
      }

      if (!ball.active) {
        this.handleBallLost(ball);
        continue;
      }

      // Check Ball vs Bricks
      for (const brick of this.bricks) {
        if (brick.destroyed) continue;
        if (brick.checkCollision(ball)) {
          sounds.playBrickHit(brick.type);

          if (!brick.isImmortal()) {
            this.combo++;
            this.comboTimer = 180;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            const comboMultiplier = this.combo >= 5 ? 3 : this.combo >= 3 ? 2 : 1;
            const pts = brick.points * comboMultiplier;
            this.score += pts;

            this.particles.createBrickExplosion(brick.x, brick.y, brick.w, brick.h, brick.getColor());
            if (comboMultiplier > 1) {
              this.particles.addFloatingText(`${comboMultiplier}x COMBO!`, brick.x + brick.w / 2, brick.y - 10, '#ec4899');
            }

            if (brick.type === BRICK_TYPES.AREA_BLAST) {
              this.triggerAreaBlast(brick);
            }

            brick.takeHit();
            const pu = brick.spawnPowerUp();
            if (pu) this.powerups.push(pu);
          }
          break; // Avoid multi-collision in single frame
        }
      }
    }

    // Bullets vs Bricks
    for (const bullet of this.paddle.bullets) {
      for (const brick of this.bricks) {
        if (!brick.destroyed && brick.checkBulletCollision(bullet)) {
          bullet.active = false;
          brick.takeHit();
          sounds.playBrickHit(brick.type);
          this.score += brick.points;
          this.particles.createBrickExplosion(brick.x, brick.y, brick.w, brick.h, brick.getColor());
          const pu = brick.spawnPowerUp();
          if (pu) this.powerups.push(pu);
          break;
        }
      }
    }

    // Powerups update
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.update(CANVAS_HEIGHT);
      if (pu.collidesWith(this.paddle)) {
        this.applyPowerUp(pu);
        pu.active = false;
      }
      if (!pu.active) {
        this.powerups.splice(i, 1);
      }
    }

    // Particles update
    this.particles.update();

    // Check Win Level (all non-immortal destroyed)
    const remainingBreakable = this.bricks.filter(b => !b.destroyed && !b.isImmortal()).length;
    if (remainingBreakable === 0) {
      this.nextLevel();
    }
  }

  renderHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 50);

    // Score
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 35, 32);

    // Level
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${this.currentLevel} / 20`, CANVAS_WIDTH / 2, 32);

    // Lives (Hearts)
    ctx.textAlign = 'right';
    let hearts = '';
    for (let i = 0; i < Math.min(5, this.paddle.lives); i++) hearts += '❤️ ';
    if (this.paddle.lives > 5) hearts += `+${this.paddle.lives - 5}`;
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`LIVES: ${hearts}`, CANVAS_WIDTH - 35, 32);

    // Combo streak
    if (this.combo >= 2) {
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`🔥 STREAK: ${this.combo}x`, 240, 32);
    }
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background Image
    const bg = this.getBackground();
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Playfield bounds border
    ctx.save();
    this.particles.applyShake(ctx);

    ctx.fillStyle = 'rgba(10, 15, 30, 0.7)';
    ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
    ctx.strokeStyle = '#38bdf844';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);

    if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSE) {
      // Bricks
      for (const b of this.bricks) {
        b.render(ctx);
      }
      // Powerups
      for (const p of this.powerups) {
        p.render(ctx);
      }
      // Paddle
      this.paddle.render(ctx);
      // Balls
      for (const ball of this.balls) {
        ball.render(ctx);
      }
      // Particles
      this.particles.render(ctx);

      ctx.restore();
      this.renderHUD();

      if (this.state === GAME_STATES.PAUSE) {
        this.renderOverlay('PAUSED', 'Press P or Click to Resume', '#38bdf8');
      }
    } else if (this.state === GAME_STATES.GAMEOVER) {
      ctx.restore();
      this.renderOverlay('GAME OVER', `Final Score: ${this.score} | Press SPACE or Click to Retry`, '#ef4444');
    } else if (this.state === GAME_STATES.VICTORY) {
      ctx.restore();
      this.renderOverlay('VICTORY!', `Congratulations! Master Score: ${this.score}`, '#eab308');
    } else if (this.state === GAME_STATES.MENU) {
      ctx.restore();
      this.renderMenu();
    } else if (this.state === GAME_STATES.PICK_LEVEL) {
      ctx.restore();
      this.renderLevelSelect();
    }
  }

  renderMenu() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 72px "Courier New", monospace';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 25;
    ctx.fillText('ARKANOID', CANVAS_WIDTH / 2, 220);

    ctx.font = '22px "Courier New", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Online Web & Database Edition', CANVAS_WIDTH / 2, 270);

    // Menu Buttons
    this.drawButton(CANVAS_WIDTH / 2 - 130, 340, 260, 55, 'START GAME', '#10b981');
    this.drawButton(CANVAS_WIDTH / 2 - 130, 415, 260, 55, 'SELECT LEVEL', '#3b82f6');
    this.drawButton(CANVAS_WIDTH / 2 - 130, 490, 260, 55, 'LEADERBOARD', '#eab308');
    this.drawButton(CANVAS_WIDTH / 2 - 130, 565, 260, 55, 'HOW TO PLAY', '#8b5cf6');

    ctx.restore();
  }

  drawButton(x, y, w, h, text, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.restore();
  }

  renderLevelSelect() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 42px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT LEVEL (1 - 20)', CANVAS_WIDTH / 2, 110);

    const startX = 170;
    const startY = 160;
    const btnW = 140;
    const btnH = 65;
    const gapX = 35;
    const gapY = 25;

    for (let i = 1; i <= 20; i++) {
      const col = (i - 1) % 5;
      const row = Math.floor((i - 1) / 5);
      const bx = startX + col * (btnW + gapX);
      const by = startY + row * (btnH + gapY);

      this.drawButton(bx, by, btnW, btnH, `LEVEL ${i}`, '#0284c7');
    }

    this.drawButton(CANVAS_WIDTH / 2 - 100, 600, 200, 50, 'BACK TO MENU', '#64748b');
    ctx.restore();
  }

  renderOverlay(title, subtitle, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 64px "Courier New", monospace';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    ctx.font = '22px "Courier New", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.shadowBlur = 0;
    ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);
    ctx.restore();
  }

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  initInputs() {
    window.addEventListener('keydown', e => {
      sounds.init();
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.paddle.moveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.paddle.moveRight();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (this.state === GAME_STATES.PLAYING) {
          this.paddle.fire(sounds);
        } else if (this.state === GAME_STATES.GAMEOVER || this.state === GAME_STATES.VICTORY) {
          this.startLevel(1);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (this.state === GAME_STATES.PLAYING) this.state = GAME_STATES.PAUSE;
        else if (this.state === GAME_STATES.PAUSE) this.state = GAME_STATES.PLAYING;
      }
    });

    window.addEventListener('keyup', e => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
        this.paddle.stop();
      }
    });

    // Mouse movement
    this.canvas.addEventListener('mousemove', e => {
      if (this.state === GAME_STATES.PLAYING) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        this.paddle.moveTo(mouseX);
      }
    });

    // Mouse click handling
    this.canvas.addEventListener('click', e => {
      sounds.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (this.state === GAME_STATES.MENU) {
        if (x >= 470 && x <= 730) {
          if (y >= 340 && y <= 395) this.startLevel(1);
          else if (y >= 415 && y <= 470) this.state = GAME_STATES.PICK_LEVEL;
          else if (y >= 490 && y <= 545) this.openLeaderboard();
          else if (y >= 565 && y <= 620) this.openTutorial();
        }
      } else if (this.state === GAME_STATES.PICK_LEVEL) {
        if (x >= 500 && x <= 700 && y >= 600 && y <= 650) {
          this.state = GAME_STATES.MENU;
          return;
        }
        const startX = 170;
        const startY = 160;
        const btnW = 140;
        const btnH = 65;
        const gapX = 35;
        const gapY = 25;

        for (let i = 1; i <= 20; i++) {
          const col = (i - 1) % 5;
          const row = Math.floor((i - 1) / 5);
          const bx = startX + col * (btnW + gapX);
          const by = startY + row * (btnH + gapY);
          if (x >= bx && x <= bx + btnW && y >= by && y <= by + btnH) {
            this.startLevel(i);
            break;
          }
        }
      } else if (this.state === GAME_STATES.PLAYING) {
        this.paddle.fire(sounds);
      } else if (this.state === GAME_STATES.PAUSE) {
        this.state = GAME_STATES.PLAYING;
      } else if (this.state === GAME_STATES.GAMEOVER || this.state === GAME_STATES.VICTORY) {
        this.startLevel(1);
      }
    });
  }

  updateUserUI() {
    const userDisplay = document.getElementById('userDisplay');
    const authBtn = document.getElementById('authBtn');
    if (api.isLoggedIn()) {
      userDisplay.textContent = `👤 ${api.getUser()}`;
      authBtn.textContent = 'Logout';
    } else {
      userDisplay.textContent = '👤 Guest (Offline)';
      authBtn.textContent = 'Login / Register';
    }
  }

  async openLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<div class="loading">Loading high scores from Spring Boot...</div>';
    modal.classList.remove('hidden');

    const data = await api.getLeaderboard(10);
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="empty">No scores recorded yet. Be the first champion!</div>';
      return;
    }

    let html = '<table><thead><tr><th>#</th><th>Player</th><th>Score</th><th>Level</th><th>Combo</th></tr></thead><tbody>';
    data.forEach(entry => {
      const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank;
      html += `<tr>
        <td><strong>${medal}</strong></td>
        <td>${entry.username}</td>
        <td class="gold">${entry.score.toLocaleString()}</td>
        <td>Lv.${entry.levelReached}</td>
        <td>${entry.maxCombo}x</td>
      </tr>`;
    });
    html += '</tbody></table>';
    list.innerHTML = html;
  }

  openTutorial() {
    document.getElementById('tutorialModal').classList.remove('hidden');
  }

  initDOMEvents() {
    document.getElementById('authBtn').addEventListener('click', () => {
      if (api.isLoggedIn()) {
        api.logout();
        this.updateUserUI();
      } else {
        document.getElementById('authModal').classList.remove('hidden');
      }
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', e => {
        e.target.closest('.modal').classList.add('hidden');
      });
    });

    document.getElementById('authForm').addEventListener('submit', async e => {
      e.preventDefault();
      const u = document.getElementById('authUsername').value.trim();
      const p = document.getElementById('authPassword').value;
      const isReg = document.getElementById('isRegisterCheck').checked;
      const errEl = document.getElementById('authError');
      errEl.textContent = '';

      try {
        if (isReg) {
          await api.register(u, p);
        } else {
          await api.login(u, p);
        }
        document.getElementById('authModal').classList.add('hidden');
        this.updateUserUI();
      } catch (err) {
        errEl.textContent = err.message || 'Authentication failed';
      }
    });

    document.getElementById('muteBtn').addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      document.getElementById('muteBtn').textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
