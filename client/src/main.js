import { Paddle } from './entities/Paddle.js';
import { Ball } from './entities/Ball.js';
import { Brick, BRICK_TYPES } from './entities/Brick.js';
import { POWERUP_TYPES, POWERUP_META } from './entities/PowerUp.js';
import { getMapByLevel } from './systems/MapData.js';
import { sounds } from './systems/SoundManager.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { api } from './api/apiClient.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  INITIAL_LIVES,
  MAX_RETRIES,
  MAX_BALLS,
  SURVIVAL_WAVE_INTERVAL,
  SURVIVAL_WAVE_MIN_INTERVAL,
  SURVIVAL_DESCENT_STEP,
  SURVIVAL_ANIM_DURATION,
  SURVIVAL_PUSHUP_STEP,
  POWERUP_MUTEX,
  DANGER_LINE_Y,
  DANGER_ALERT_MARGIN,
  computeMultiBallSpawns,
  resolveAttemptFailure,
  isDangerBreach,
  isDangerAlert,
  collectBlastTargets,
  computeSurvivalPushUpShift,
  refreshPowerUpTimer,
  tickPowerUpTimers,
  isPowerUpTimerBlinking
} from './systems/GameRules.js';

export const GAME_MODES = {
  CAMPAIGN: 'CAMPAIGN',
  SURVIVAL: 'SURVIVAL'
};

export const GAME_STATES = {
  MENU: 'MENU',
  PICK_LEVEL: 'PICK_LEVEL',
  PLAYING: 'PLAYING',
  PAUSE: 'PAUSE',
  RETRY: 'RETRY',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY'
};

function formatTime(frames) {
  const totalSeconds = Math.floor(frames / 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.state = GAME_STATES.MENU;
    this.mode = GAME_MODES.CAMPAIGN;

    this.currentLevel = 1;
    this.unlockedLevel = 1;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.frameCount = 0;
    this.keys = { left: false, right: false };
    this.powerTimers = {};

    // 3 Attempts / Continues System
    this.retriesLeft = MAX_RETRIES;
    this.maxRetries = MAX_RETRIES;
    this.showDebugPanel = false;
    this._uiState = null;

    // Survival Mode Attributes
    this.survivalTime = 0;
    this.survivalWave = 1;
    this.survivalWaveTimer = 0;
    this.survivalWaveInterval = SURVIVAL_WAVE_INTERVAL;
    this.dangerLineY = DANGER_LINE_Y;
    this.dangerAlert = false;

    this.paddle = new Paddle(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.balls = [];
    this.bricks = [];
    this.powerups = [];
    this.particles = new ParticleSystem();
    this.sounds = sounds;

    this.bounds = {
      x: 30,
      y: 60,
      w: CANVAS_WIDTH - 60,
      h: CANVAS_HEIGHT - 70
    };

    this.bgImages = {};
    this.preloadBackgrounds();

    this.initInputs();
    this.initDOMEvents();
    this.syncProfile();

    requestAnimationFrame(this.loop.bind(this));
  }

  async syncProfile() {
    if (api.isLoggedIn()) {
      const p = await api.getProfile();
      if (p && p.highestLevelUnlocked) {
        this.unlockedLevel = Math.max(1, p.highestLevelUnlocked);
      }
    } else {
      this.unlockedLevel = parseInt(localStorage.getItem('arkanoid_local_unlocked') || '1', 10);
    }
    this.updateUserUI();
  }

  showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3200);
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
    if (this.mode === GAME_MODES.SURVIVAL) {
      return this.bgImages[6] || this.bgImages[1];
    }
    const idx = ((this.currentLevel - 1) % 8) + 1;
    return this.bgImages[idx];
  }

  /** Clear every timed power-up and restore the base paddle/ball state. */
  resetPowerUpEffects() {
    this.powerTimers = {};
    this.paddle.setLength('NORMAL');
    this.paddle.disableShooting();
    for (const ball of this.balls) ball.resetSize();
  }

  /** Start (or refresh) a timed power-up. WIDE/MINI never run together. */
  startPowerUpTimer(type) {
    const opposite = POWERUP_MUTEX[type];
    if (opposite) delete this.powerTimers[opposite];
    refreshPowerUpTimer(this.powerTimers, type);
  }

  /** Undo the timed effects whose counters just reached zero. */
  handleExpiredPowerUps(expired) {
    for (const type of expired) {
      if (type === POWERUP_TYPES.LONGER || type === POWERUP_TYPES.SHORTEN) {
        this.paddle.setLength('NORMAL');
        this.particles.addFloatingText(
          'PADDLE NORMAL',
          this.paddle.x + this.paddle.w / 2,
          this.paddle.y - 20,
          '#94a3b8'
        );
      } else if (type === POWERUP_TYPES.BIGGER_BALL) {
        for (const ball of this.balls) ball.resetSize();
        this.particles.addFloatingText(
          'MEGA ENDED',
          this.paddle.x + this.paddle.w / 2,
          this.paddle.y - 20,
          '#94a3b8'
        );
      } else if (type === POWERUP_TYPES.SHOT) {
        this.paddle.disableShooting();
        this.particles.addFloatingText(
          'LASER OFF',
          this.paddle.x + this.paddle.w / 2,
          this.paddle.y - 20,
          '#94a3b8'
        );
      }
    }
  }

  startCampaign(level = 1) {
    this.mode = GAME_MODES.CAMPAIGN;
    this.retriesLeft = this.maxRetries;
    this.score = 0;
    this.startLevel(level);
  }

  startLevel(level) {
    if (level > this.unlockedLevel) {
      this.showToast(`🔒 Level ${level} is locked! Clear previous levels first.`, 'error');
      return;
    }
    this.mode = GAME_MODES.CAMPAIGN;
    this.currentLevel = level;
    this.paddle.reset();
    this.paddle.lives = INITIAL_LIVES;
    this.resetPowerUpEffects();

    // Ball starts attached to paddle until launched
    this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 14, true)];
    this.powerups = [];
    this.combo = 0;

    this.loadMap(this.currentLevel);

    this.state = GAME_STATES.PLAYING;
    sounds.playBgm(this.currentLevel);
    this.syncStateUI();
  }

  retryCurrentLevel() {
    this.paddle.reset();
    this.paddle.lives = INITIAL_LIVES;
    this.resetPowerUpEffects();
    this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 14, true)];
    this.powerups = [];
    this.combo = 0;
    this.loadMap(this.currentLevel);
    this.state = GAME_STATES.PLAYING;
    sounds.playBgm(this.currentLevel);
    this.particles.addFloatingText(`CONTINUE #${this.maxRetries - this.retriesLeft}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#38bdf8');
  }

  openPauseMenu() {
    if (this.state !== GAME_STATES.PLAYING) return;
    this.state = GAME_STATES.PAUSE;
    this.keys.left = false;
    this.keys.right = false;
    this.syncStateUI();
  }

  resumeGame() {
    if (this.state !== GAME_STATES.PAUSE) return;
    this.state = GAME_STATES.PLAYING;
    this.syncStateUI();
  }

  replayCurrentGame() {
    this.keys.left = false;
    this.keys.right = false;
    if (this.mode === GAME_MODES.SURVIVAL) {
      this.startSurvivalMode();
    } else {
      // Restart the current level while keeping the player's score and lives system intact.
      this.startLevel(this.currentLevel);
    }
    this.syncStateUI();
  }

  returnToMainMenu() {
    this.state = GAME_STATES.MENU;
    this.keys.left = false;
    this.keys.right = false;
    this.resetPowerUpEffects();
    sounds.stopBgm();
    this.syncStateUI();
  }

  /** Keep the pause button / overlay in sync with the current game state. */
  syncStateUI() {
    if (this._uiState !== this.state) {
      this._uiState = this.state;
      const pauseBtn = document.getElementById('pauseBtn');
      const overlay = document.getElementById('pauseOverlay');
      const inGame = this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSE;

      if (pauseBtn) {
        pauseBtn.classList.toggle('hidden', !inGame);
        const paused = this.state === GAME_STATES.PAUSE;
        const icon = paused ? '▶' : '⏸';
        if (pauseBtn.textContent !== icon) pauseBtn.textContent = icon;
        const label = paused ? 'Resume (P)' : 'Pause (P)';
        if (pauseBtn.title !== label) pauseBtn.title = label;
        pauseBtn.setAttribute('aria-label', label);
      }
      if (overlay) {
        overlay.classList.toggle('hidden', this.state !== GAME_STATES.PAUSE);
      }
    }

    if (this.state === GAME_STATES.PAUSE) {
      this.syncVolumeUI();
    }
  }

  syncVolumeUI() {
    const slider = document.getElementById('volumeSlider');
    const label = document.getElementById('volumeValue');
    if (!slider || !label) return;
    const percent = sounds.getVolumePercent();
    if (slider.value !== String(percent)) slider.value = String(percent);
    const text = `${percent}%`;
    if (label.textContent !== text) label.textContent = text;
    this.syncSoundUI();
  }

  /** Header speaker button mirrors the master volume (muted or not). */
  syncSoundUI() {
    const btn = document.getElementById('soundBtn');
    if (!btn) return;
    const muted = sounds.isMuted();
    const icon = muted ? '🔇' : '🔊';
    if (btn.textContent !== icon) btn.textContent = icon;
    const label = muted ? 'Sound off — click to turn on' : 'Sound on — click to mute';
    if (btn.title !== label) btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', String(muted));
  }

  startSurvivalMode() {
    this.mode = GAME_MODES.SURVIVAL;
    this.paddle.reset();
    this.paddle.lives = INITIAL_LIVES;
    this.resetPowerUpEffects();
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.survivalTime = 0;
    this.survivalWave = 1;
    this.survivalWaveTimer = 0;
    this.survivalWaveInterval = SURVIVAL_WAVE_INTERVAL;
    this.dangerAlert = false;

    this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 14, true)];
    this.powerups = [];
    this.bricks = [];

    // Spawn 4 initial rows for survival
    const cols = 13;
    const paddingX = 14;
    const paddingY = 8;
    const brickW = (this.bounds.w - (cols - 1) * paddingX) / cols;
    const brickH = 34;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
        let type = BRICK_TYPES.NORMAL;
        const rand = Math.random();
        if (rand < 0.12) type = BRICK_TYPES.AREA_BLAST;
        else if (rand < 0.18) type = BRICK_TYPES.LUCKY_WHEEL;
        else if (rand < 0.22) type = BRICK_TYPES.LIFE_UP;

        const bx = this.bounds.x + c * (brickW + paddingX);
        const by = this.bounds.y + 40 + r * (brickH + paddingY);
        this.bricks.push(new Brick(bx, by, brickW, brickH, type, r, c));
      }
    }

    this.state = GAME_STATES.PLAYING;
    sounds.playBgm(3);
    this.syncStateUI();
    this.particles.addFloatingText('SURVIVAL MODE: DEFEND THE LINE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#ef4444');
  }

  spawnSurvivalTopRow(rowIndex = 0, { animate = false } = {}) {
    const cols = 13;
    const paddingX = 14;
    const paddingY = 8;
    const brickW = (this.bounds.w - (cols - 1) * paddingX) / cols;
    const brickH = 34;

    for (let c = 0; c < cols; c++) {
      let type = BRICK_TYPES.NORMAL;
      const rand = Math.random();
      if (rand < 0.14) type = BRICK_TYPES.AREA_BLAST;
      else if (rand < 0.20) type = BRICK_TYPES.LUCKY_WHEEL;
      else if (rand < 0.26) type = BRICK_TYPES.PUSH;
      else if (rand < 0.29) type = BRICK_TYPES.FALL_BOMB;

      const bx = this.bounds.x + c * (brickW + paddingX);
      const finalY = this.bounds.y + 40 + rowIndex * (brickH + paddingY);
      const brick = new Brick(bx, finalY, brickW, brickH, type, rowIndex, c);

      // Wave rows slide in from just above the playfield while fading in.
      if (animate) {
        brick.y = finalY - SURVIVAL_DESCENT_STEP;
        brick.animateTo(finalY, SURVIVAL_ANIM_DURATION, { fadeIn: true });
      }

      this.bricks.push(brick);
    }
  }

  async triggerSurvivalBreach() {
    sounds.stopBgm();
    sounds.playExplosion();
    this.particles.triggerScreenShake(26);
    this.state = GAME_STATES.GAMEOVER;
    this.showToast('💀 DANGER LINE BREACHED! Defense collapsed.', 'error');
    if (api.isLoggedIn()) {
      await api.submitScore(this.score, this.survivalWave, this.maxCombo);
    }
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

  async nextLevel() {
    if (this.currentLevel >= 20) {
      this.state = GAME_STATES.VICTORY;
      sounds.stopBgm();
      sounds.playVictory();
      this.showToast('🏆 CONGRATULATIONS! You completed all 20 levels!', 'success');
      if (api.isLoggedIn()) {
        await api.submitScore(this.score, this.currentLevel, this.maxCombo);
      }
      return;
    }

    this.currentLevel++;
    if (this.currentLevel > this.unlockedLevel) {
      this.unlockedLevel = this.currentLevel;
      if (api.isLoggedIn()) {
        await api.updateProgress(this.unlockedLevel);
      } else {
        localStorage.setItem('arkanoid_local_unlocked', this.unlockedLevel.toString());
      }
      this.showToast(`🌟 Level ${this.currentLevel} Unlocked!`, 'success');
    }

    this.paddle.reset();
    this.resetPowerUpEffects();
    this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 14, true)];
    this.powerups = [];
    this.loadMap(this.currentLevel);
    sounds.playBgm(this.currentLevel);
    this.particles.addFloatingText(`LEVEL ${this.currentLevel}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#38bdf8');
  }

  async handleBallLost(ball) {
    const idx = this.balls.indexOf(ball);
    if (idx !== -1) this.balls.splice(idx, 1);

    if (this.balls.length === 0) {
      this.paddle.lives--;
      sounds.playLoseBall();
      this.combo = 0;
      this.resetPowerUpEffects();

      if (this.paddle.lives <= 0) {
        if (this.mode === GAME_MODES.SURVIVAL) {
          this.state = GAME_STATES.GAMEOVER;
          sounds.stopBgm();
          sounds.playTone(180, 0.4, 'sawtooth', 60);
          if (api.isLoggedIn()) {
            await api.submitScore(this.score, this.survivalWave, this.maxCombo);
          }
        } else {
          // 3-Attempts / Continues System in Campaign Mode
          const transition = resolveAttemptFailure(this.retriesLeft, this.maxRetries);
          this.retriesLeft = transition.retriesLeft;

          if (transition.state === 'RETRY') {
            this.state = GAME_STATES.RETRY;
            sounds.stopBgm();
            sounds.playTone(220, 0.3, 'sawtooth', 120);
          } else {
            this.state = GAME_STATES.GAMEOVER;
            sounds.stopBgm();
            sounds.playTone(180, 0.4, 'sawtooth', 60);
            if (api.isLoggedIn()) {
              const res = await api.submitScore(this.score, this.currentLevel, this.maxCombo);
              if (res) {
                this.showToast(`📊 Score ${this.score.toLocaleString()} recorded to Cloud!`, 'info');
              }
            }
          }
        }
      } else {
        // Respawn attached ball on paddle
        this.balls = [new Ball(this.paddle.x + this.paddle.w / 2, this.paddle.y - 14, true)];
      }
    }
  }

  // Unified Brick Hit handling for both Ball and Bullets
  hitBrick(brick, isBullet = false) {
    if (brick.destroyed) return;
    if (brick.isImmortal()) {
      sounds.playTone(600, 0.05, 'triangle');
      return;
    }

    this.combo++;
    this.comboTimer = 180;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const comboMultiplier = this.combo >= 5 ? 3 : this.combo >= 3 ? 2 : 1;
    const pts = brick.points * comboMultiplier;
    this.score += pts;

    this.particles.createBrickExplosion(brick.x, brick.y, brick.w, brick.h, brick.getColor());
    if (comboMultiplier > 1 && !isBullet) {
      this.particles.addFloatingText(`${comboMultiplier}x COMBO!`, brick.x + brick.w / 2, brick.y - 10, '#ec4899');
    }

    brick.takeHit();
    sounds.playBrickHit(brick.type);

    // Bombs and Area Blast explode immediately on bullet OR ball hit!
    if (brick.type === BRICK_TYPES.AREA_BLAST || brick.type === BRICK_TYPES.FALL_BOMB) {
      this.triggerAreaBlast(brick);
    }

    const pu = brick.spawnPowerUp();
    if (pu) this.powerups.push(pu);

    // Survival PUSH brick: destroying it shoves the whole stack one row up.
    if (brick.destroyed && this.mode === GAME_MODES.SURVIVAL && brick.type === BRICK_TYPES.PUSH) {
      this.pushSurvivalBricksUp();
    }
  }

  /** Survival PUSH effect: slide every surviving brick one row toward the ceiling. */
  pushSurvivalBricksUp() {
    const shift = computeSurvivalPushUpShift(this.bricks, SURVIVAL_PUSHUP_STEP, this.bounds.y);
    if (shift <= 0) {
      sounds.playTone(420, 0.06, 'triangle');
      return;
    }

    for (const brick of this.bricks) {
      if (brick.destroyed) continue;
      brick.animateBy(-shift, SURVIVAL_ANIM_DURATION);
    }

    sounds.playTone(660, 0.12, 'square', 520);
    this.particles.addFloatingText(
      'PUSH UP! ⬆',
      this.paddle.x + this.paddle.w / 2,
      this.dangerLineY - 80,
      '#14b8a6'
    );
  }

  triggerAreaBlast(centerBrick) {
    sounds.playExplosion();
    this.particles.triggerScreenShake(14);

    // Real Domino chain: every bomb caught in the blast becomes a new blast source,
    // so the explosion propagates across the whole connected cluster exactly once.
    const targets = collectBlastTargets(this.bricks, centerBrick);
    const chainBombs = [];

    for (const b of targets) {
      b.destroyed = true;
      this.score += b.points;
      this.particles.createBrickExplosion(b.x, b.y, b.w, b.h, b.getColor());
      const pu = b.spawnPowerUp();
      if (pu) this.powerups.push(pu);

      if (b.type === BRICK_TYPES.AREA_BLAST || b.type === BRICK_TYPES.FALL_BOMB) {
        chainBombs.push(b);
      }
    }

    const chainLabel = targets.length > 0 ? `DOMINO x${targets.length + 1}! 💥` : 'BOOM! 💥';
    this.particles.addFloatingText(
      chainLabel,
      centerBrick.x + centerBrick.w / 2,
      centerBrick.y - 10,
      '#f97316'
    );

    for (const cb of chainBombs) {
      setTimeout(() => {
        sounds.playExplosion();
        this.particles.createBrickExplosion(cb.x, cb.y, cb.w, cb.h, '#ef4444');
      }, 90);
    }
  }

  triggerFallBoom() {
    sounds.playExplosion();
    this.particles.triggerScreenShake(16);

    // Pick up to 8 random surviving breakable bricks (as documented for QA/TC14).
    const candidates = this.bricks.filter(b => !b.destroyed && !b.isImmortal());
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const b of candidates.slice(0, 8)) {
      b.destroyed = true;
      this.score += b.points;
      this.particles.createBrickExplosion(b.x, b.y, b.w, b.h, b.getColor());
    }
  }

  applyPowerUp(pu) {
    sounds.playPowerup();
    switch (pu.type) {
      case POWERUP_TYPES.LONGER:
        this.paddle.setLength('LONGER');
        this.startPowerUpTimer(POWERUP_TYPES.LONGER);
        this.particles.addFloatingText('WIDE PADDLE!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#38bdf8');
        break;
      case POWERUP_TYPES.SHORTEN:
        this.paddle.setLength('SHORTEN');
        this.startPowerUpTimer(POWERUP_TYPES.SHORTEN);
        this.particles.addFloatingText('SHORT PADDLE!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#f87171');
        break;
      case POWERUP_TYPES.DUPLICATE: {
        const spawns = computeMultiBallSpawns(this.balls, MAX_BALLS);
        for (const spec of spawns) {
          const newBall = new Ball(spec.x, spec.y, false);
          newBall.dx = spec.dx;
          newBall.dy = spec.dy;
          if (spec.isBigger) newBall.setBigger();
          this.balls.push(newBall);
        }
        this.particles.addFloatingText('x3 MULTI BALL!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#a855f7');
        break;
      }
      case POWERUP_TYPES.BIGGER_BALL:
        this.balls.forEach(b => b.setBigger());
        this.startPowerUpTimer(POWERUP_TYPES.BIGGER_BALL);
        this.particles.addFloatingText('MEGA BALL!', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#fbbf24');
        break;
      case POWERUP_TYPES.LIFE_UP:
        this.paddle.lives++;
        this.particles.addFloatingText('+1 LIFE ❤️', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#ec4899');
        break;
      case POWERUP_TYPES.SHOT:
        this.paddle.enableShooting();
        this.startPowerUpTimer(POWERUP_TYPES.SHOT);
        this.particles.addFloatingText('LASER GUNS! ⚡', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#ef4444');
        break;
      case POWERUP_TYPES.FALL_BOOM:
        this.triggerFallBoom();
        this.particles.addFloatingText('NUKE BLAST! 💣', this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, '#f97316');
        break;
    }
  }

  update() {
    if (this.state !== GAME_STATES.PLAYING) return;
    this.frameCount++;

    // Keyboard movement
    if (this.keys.left && !this.keys.right) {
      this.paddle.moveLeft();
    } else if (this.keys.right && !this.keys.left) {
      this.paddle.moveRight();
    } else {
      this.paddle.stop();
    }

    this.paddle.update(sounds);

    // Timed power-ups advance only while PLAYING (Pause freezes the counters).
    const expiredPowerUps = tickPowerUpTimers(this.powerTimers);
    if (expiredPowerUps.length > 0) this.handleExpiredPowerUps(expiredPowerUps);

    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // SURVIVAL MODE PROGRESSION
    if (this.mode === GAME_MODES.SURVIVAL) {
      // Advance the slides first: collisions and the Danger Line always read
      // the brick's real on-screen Y, never the animation destination.
      for (const b of this.bricks) b.updateAnimation();

      this.survivalTime++;
      this.survivalWaveTimer++;

      if (this.survivalWaveTimer >= this.survivalWaveInterval) {
        this.survivalWaveTimer = 0;
        this.survivalWave++;
        this.survivalWaveInterval = Math.max(
          SURVIVAL_WAVE_MIN_INTERVAL,
          SURVIVAL_WAVE_INTERVAL - this.survivalWave * 15
        );

        // Slide the whole stack down one row (eased, stacking on the logical target).
        for (const b of this.bricks) {
          if (!b.destroyed) {
            b.animateBy(SURVIVAL_DESCENT_STEP, SURVIVAL_ANIM_DURATION);
          }
        }

        // Spawn new top row, sliding in from just above the ceiling.
        this.spawnSurvivalTopRow(0, { animate: true });

        sounds.playAlarm();
        this.particles.triggerScreenShake(10);
        this.particles.addFloatingText(`WAVE ${this.survivalWave} DESCENT! ⚠`, CANVAS_WIDTH / 2, this.dangerLineY - 40, '#f97316');
        this.score += this.survivalWave * 200;
      }

      // Breach is checked every frame against the live position, so a brick
      // touching the line mid-slide ends the run at the exact pixel.
      if (this.bricks.some(b => isDangerBreach(b, this.dangerLineY))) {
        this.triggerSurvivalBreach();
        return;
      }

      // Check alert distance
      this.dangerAlert = this.bricks.some(b =>
        isDangerAlert(b, this.dangerLineY, DANGER_ALERT_MARGIN)
      );
    } else {
      // CAMPAIGN MODE: Dynamic Bricks on higher levels
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
            b.targetY = b.y;
            if (b.y + b.h >= this.paddle.y) {
              this.handleBallLost(this.balls[0] || null);
            }
          }
        }
      }
    }

    // Balls Update
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      const hitPaddle = ball.update(this.bounds, this.paddle, sounds, this.particles);
      if (hitPaddle) {
        this.combo = 0;
      }

      if (!ball.active) {
        this.handleBallLost(ball);
        continue;
      }

      // Ball vs Bricks collision
      if (!ball.isAttached) {
        for (const brick of this.bricks) {
          if (brick.destroyed) continue;
          if (brick.checkCollision(ball)) {
            this.hitBrick(brick, false);
            // Mega Ball keeps travelling through destroyed bricks; immortal bricks still bounce it.
            if (!ball.isBigger || brick.isImmortal()) break;
          }
        }
      }
    }

    // Bullets vs Bricks collision
    for (const bullet of this.paddle.bullets) {
      for (const brick of this.bricks) {
        if (!brick.destroyed && brick.checkBulletCollision(bullet)) {
          bullet.active = false;
          this.hitBrick(brick, true);
          break;
        }
      }
    }

    // Powerups Update
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

    this.particles.update();

    // Check completion condition
    const remainingBreakable = this.bricks.filter(b => !b.destroyed && !b.isImmortal()).length;
    if (remainingBreakable === 0) {
      if (this.mode === GAME_MODES.SURVIVAL) {
        // Clear bonus in survival mode and spawn fresh waves
        this.score += 1500;
        this.survivalWave++;
        this.particles.addFloatingText('WAVE CLEAR! +1,500 PTS ⭐', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#fde047');
        for (let r = 0; r < 3; r++) {
          this.spawnSurvivalTopRow(r, { animate: true });
        }
      } else {
        this.nextLevel();
      }
    }
  }

  renderHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 50);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 19px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score.toLocaleString()}`, 35, 32);

    ctx.textAlign = 'center';
    if (this.mode === GAME_MODES.SURVIVAL) {
      ctx.fillStyle = '#f97316';
      ctx.fillText(`SURVIVAL | WAVE ${this.survivalWave} | ⏱ ${formatTime(this.survivalTime)}`, CANVAS_WIDTH / 2, 32);
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`LEVEL ${this.currentLevel} / 20`, CANVAS_WIDTH / 2, 32);
    }

    ctx.textAlign = 'right';
    let statusText = '';
    if (this.mode === GAME_MODES.CAMPAIGN) {
      statusText += `RETRIES: ${this.retriesLeft}/3   `;
    }
    let hearts = '';
    for (let i = 0; i < Math.min(5, this.paddle.lives); i++) hearts += '❤️ ';
    if (this.paddle.lives > 5) hearts += `+${this.paddle.lives - 5}`;
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`${statusText}LIVES: ${hearts}`, CANVAS_WIDTH - 35, 32);

    if (this.combo >= 2) {
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`🔥 ${this.combo}x STREAK`, 260, 32);
    }

    if (this.dangerAlert && this.mode === GAME_MODES.SURVIVAL) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('🚨 HAZARD ALERT!', 420, 32);
    }

    ctx.restore();
  }

  /** Timed power-up counters: circular clock + remaining seconds, top-right. */
  renderPowerUpTimers() {
    const timers = Object.values(this.powerTimers);
    if (timers.length === 0) return;

    const ctx = this.ctx;
    const pillW = 128;
    const pillH = 26;
    const gap = 8;
    const top = this.bounds.y + 8;
    let right = this.bounds.x + this.bounds.w - 10;

    ctx.save();
    ctx.textBaseline = 'middle';

    for (let i = timers.length - 1; i >= 0; i--) {
      const timer = timers[i];
      const meta = POWERUP_META[timer.type] || {
        label: timer.type,
        border: '#38bdf8',
        bg: '#0f172a',
        text: '#f8fafc'
      };
      const ratio = Math.max(0, Math.min(1, timer.remaining / timer.duration));
      const blink = isPowerUpTimerBlinking(timer);
      const x = right - pillW;

      ctx.globalAlpha = blink ? 0.35 + 0.65 * (Math.floor(timer.remaining / 6) % 2) : 1;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = meta.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, top, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();

      // Small clock: static ring plus a shrinking progress arc.
      const cx = x + 15;
      const cy = top + pillH / 2;
      const radius = 8;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      const end = -Math.PI / 2 + Math.PI * 2 * ratio;
      ctx.strokeStyle = meta.border;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, end);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(end) * (radius - 2), cy + Math.sin(end) * (radius - 2));
      ctx.stroke();

      const seconds = Math.ceil(timer.remaining / 60);
      ctx.fillStyle = meta.text;
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${meta.label} ${seconds}s`, x + 28, cy + 1);

      right = x - gap;
    }

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    this.syncStateUI();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bg = this.getBackground();
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.save();
    this.particles.applyShake(ctx);

    ctx.fillStyle = 'rgba(10, 15, 30, 0.72)';
    ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
    ctx.strokeStyle = this.dangerAlert ? '#ef444488' : '#38bdf844';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);

    if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSE) {
      for (const b of this.bricks) b.render(ctx);
      for (const p of this.powerups) p.render(ctx);
      this.paddle.render(ctx);
      for (const ball of this.balls) ball.render(ctx);
      this.particles.render(ctx);

      // Render Danger Line in Survival Mode
      if (this.mode === GAME_MODES.SURVIVAL) {
        ctx.save();
        const pulse = (Math.sin(this.frameCount * 0.1) + 1) / 2;
        ctx.strokeStyle = this.dangerAlert ? `rgba(239, 68, 68, ${0.7 + pulse * 0.3})` : 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = this.dangerAlert ? 3 : 2;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.moveTo(this.bounds.x, this.dangerLineY);
        ctx.lineTo(this.bounds.x + this.bounds.w, this.dangerLineY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = this.dangerAlert ? '#ef4444' : 'rgba(239, 68, 68, 0.85)';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('⚠ DANGER LINE ⚠', this.bounds.x + this.bounds.w - 15, this.dangerLineY - 6);
        ctx.restore();
      }

      // Launch hint if ball is attached to paddle
      if (this.balls.some(b => b.isAttached)) {
        ctx.save();
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.fillText('PRESS SPACE OR CLICK TO LAUNCH BALL 🚀', this.paddle.x + this.paddle.w / 2, this.paddle.y - 35);
        ctx.restore();
      }

      ctx.restore();
      this.renderHUD();
      this.renderPowerUpTimers();
    } else if (this.state === GAME_STATES.RETRY) {
      ctx.restore();
      this.renderRetryOverlay();
    } else if (this.state === GAME_STATES.GAMEOVER) {
      ctx.restore();
      this.renderGameOverOverlay();
    } else if (this.state === GAME_STATES.VICTORY) {
      ctx.restore();
      this.renderVictoryOverlay();
    } else if (this.state === GAME_STATES.MENU) {
      ctx.restore();
      this.renderMenu();
    } else if (this.state === GAME_STATES.PICK_LEVEL) {
      ctx.restore();
      this.renderLevelSelect();
    }

    if (this.showDebugPanel) {
      this.renderDebugPanel();
    }
  }

  renderDebugPanel() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    const px = 30;
    const py = 60;
    const pw = 450;
    const ph = 222;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillText('🛠 QA TESTER PANEL - Phím T đóng mở', px + 15, py + 25);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText(`Trạng thái: ${this.state} | Chế độ: ${this.mode} | Số bóng: ${this.balls.length}`, px + 15, py + 52);
    ctx.fillText(`Mạng: ${this.paddle.lives} | Lượt còn: ${this.retriesLeft} | Màn: ${this.currentLevel} / 20`, px + 15, py + 74);

    const timerText = Object.values(this.powerTimers)
      .map(t => `${t.type}: ${Math.ceil(t.remaining / 60)}s`)
      .join(' | ') || 'không có';
    ctx.fillStyle = '#a5f3fc';
    ctx.fillText(`Power-up đang chạy: ${timerText}`, px + 15, py + 96);

    ctx.fillStyle = '#fde047';
    ctx.fillText('Phím 1 đến 7: Nhận ngay PowerUp tương ứng', px + 15, py + 126);
    ctx.fillText('Phím 3: Thử nghiệm nhân 3 bóng Multi-Ball', px + 15, py + 147);
    ctx.fillText('Phím L: Chuyển màn kế tiếp | Phím K: Xóa sạch gạch', px + 15, py + 168);
    ctx.fillText('Phím G: Trừ mạng để test màn hình Retry', px + 15, py + 189);
    ctx.fillText('Phím P/ESC: Pause menu | M: Về Menu | Space: Bắn', px + 15, py + 210);
    ctx.restore();
  }

  renderMenu() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 68px "Courier New", monospace';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 24;
    ctx.fillText('ARKANOID', CANVAS_WIDTH / 2, 200);

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.shadowBlur = 0;
    ctx.fillText('Online Web & Database Edition', CANVAS_WIDTH / 2, 245);

    const btnW = 320;
    const btnH = 50;
    const btnX = CANVAS_WIDTH / 2 - btnW / 2;

    this.drawButton(btnX, 290, btnW, btnH, 'CAMPAIGN MODE', '#10b981');
    this.drawButton(btnX, 355, btnW, btnH, 'SURVIVAL MODE', '#ef4444');
    this.drawButton(btnX, 420, btnW, btnH, 'SELECT LEVEL', '#0284c7');
    this.drawButton(btnX, 485, btnW, btnH, 'LEADERBOARD', '#eab308');
    this.drawButton(btnX, 550, btnW, btnH, 'HOW TO PLAY', '#8b5cf6');

    ctx.restore();
  }

  drawButton(x, y, w, h, text, color, isLocked = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = isLocked ? '#334155' : color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = isLocked ? '#64748b' : '#ffffff';
    ctx.font = 'bold 18px "Courier New", monospace';
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
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SELECT LEVEL - UNLOCKED ${this.unlockedLevel} / 20`, CANVAS_WIDTH / 2, 100);

    const startX = 170;
    const startY = 150;
    const btnW = 140;
    const btnH = 65;
    const gapX = 35;
    const gapY = 25;

    for (let i = 1; i <= 20; i++) {
      const col = (i - 1) % 5;
      const row = Math.floor((i - 1) / 5);
      const bx = startX + col * (btnW + gapX);
      const by = startY + row * (btnH + gapY);

      const isLocked = i > this.unlockedLevel;
      const btnText = isLocked ? `🔒 LVL ${i}` : `LEVEL ${i}`;
      const color = isLocked ? '#334155' : '#0284c7';
      this.drawButton(bx, by, btnW, btnH, btnText, color, isLocked);
    }

    this.drawButton(CANVAS_WIDTH / 2 - 100, 600, 200, 50, 'BACK TO MENU', '#64748b');
    ctx.restore();
  }

  renderRetryOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 20;
    ctx.fillText('ATTEMPT FAILED!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillText(`CONTINUES REMAINING: ${this.retriesLeft} of ${this.maxRetries}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    ctx.fillStyle = '#fef08a';
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText(`Score Preserved: ${this.score.toLocaleString()} pts`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);

    const btnW = 280;
    const btnH = 55;
    this.drawButton(CANVAS_WIDTH / 2 - btnW / 2, CANVAS_HEIGHT / 2 + 70, btnW, btnH, 'CONTINUE LEVEL', '#10b981');
    this.drawButton(CANVAS_WIDTH / 2 - btnW / 2, CANVAS_HEIGHT / 2 + 140, btnW, btnH, 'MAIN MENU', '#64748b');

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('Press SPACE to Continue or M for Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 225);

    ctx.restore();
  }

  renderGameOverOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 64px "Courier New", monospace';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 22;

    if (this.mode === GAME_MODES.SURVIVAL) {
      ctx.fillText('SURVIVAL TERMINATED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 70);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '22px "Courier New", monospace';
      ctx.fillText(`Waves Cleared: ${this.survivalWave} | Time Survived: ${formatTime(this.survivalTime)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = '#fde047';
      ctx.fillText(`Final Survival Score: ${this.score.toLocaleString()} pts`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    } else {
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 70);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '22px "Courier New", monospace';
      ctx.fillText(`All 3 Continues Exhausted | Reached Level ${this.currentLevel}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = '#fde047';
      ctx.fillText(`Final Campaign Score: ${this.score.toLocaleString()} pts`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    }

    const btnW = 280;
    const btnH = 50;
    this.drawButton(CANVAS_WIDTH / 2 - btnW / 2, CANVAS_HEIGHT / 2 + 75, btnW, btnH, 'PLAY AGAIN', '#10b981');
    this.drawButton(CANVAS_WIDTH / 2 - btnW / 2, CANVAS_HEIGHT / 2 + 140, btnW, btnH, 'MAIN MENU', '#64748b');

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('Press SPACE to Play Again or M for Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 215);

    ctx.restore();
  }

  renderVictoryOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 64px "Courier New", monospace';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 24;
    ctx.fillText('🏆 VICTORY! 🏆', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 70);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText('You conquered all 20 levels of Arkanoid!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Master Score: ${this.score.toLocaleString()} pts`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

    const btnW = 280;
    const btnH = 50;
    this.drawButton(CANVAS_WIDTH / 2 - btnW / 2, CANVAS_HEIGHT / 2 + 75, btnW, btnH, 'PLAY AGAIN', '#10b981');
    this.drawButton(CANVAS_WIDTH / 2 - btnW / 2, CANVAS_HEIGHT / 2 + 140, btnW, btnH, 'MAIN MENU', '#64748b');

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

      // Never let gameplay hotkeys interfere with typing in the auth modal.
      const tagName = e.target && e.target.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (e.target && e.target.isContentEditable)) {
        return;
      }

      // Holding a menu key must not toggle the pause state every frame.
      if (e.repeat && ['p', 'P', 'Escape', 'm', 'M'].includes(e.key)) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = true;
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (this.state === GAME_STATES.PLAYING) {
          const attached = this.balls.filter(b => b.isAttached);
          if (attached.length > 0) {
            attached.forEach(b => b.launch(this.paddle));
            sounds.playTone(480, 0.1, 'triangle', 680);
          } else if (this.paddle.canShoot) {
            this.paddle.fire(sounds);
          }
        } else if (this.state === GAME_STATES.RETRY) {
          this.retryCurrentLevel();
        } else if (this.state === GAME_STATES.GAMEOVER || this.state === GAME_STATES.VICTORY) {
          if (this.mode === GAME_MODES.SURVIVAL) {
            this.startSurvivalMode();
          } else {
            this.startCampaign(1);
          }
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (this.state === GAME_STATES.PLAYING) this.openPauseMenu();
        else if (this.state === GAME_STATES.PAUSE) this.resumeGame();
      } else if (e.key === 'Escape') {
        if (this.state === GAME_STATES.PLAYING) this.openPauseMenu();
        else if (this.state === GAME_STATES.PAUSE) this.resumeGame();
        else if (this.state !== GAME_STATES.MENU) this.returnToMainMenu();
      } else if (e.key === 'm' || e.key === 'M') {
        if (this.state !== GAME_STATES.MENU) this.returnToMainMenu();
      } else if (e.key === 't' || e.key === 'T') {
        this.showDebugPanel = !this.showDebugPanel;
      } else if (this.state === GAME_STATES.PLAYING) {
        if (e.key === '1') this.applyPowerUp({ type: POWERUP_TYPES.LONGER });
        else if (e.key === '2') this.applyPowerUp({ type: POWERUP_TYPES.SHORTEN });
        else if (e.key === '3') this.applyPowerUp({ type: POWERUP_TYPES.DUPLICATE });
        else if (e.key === '4') this.applyPowerUp({ type: POWERUP_TYPES.BIGGER_BALL });
        else if (e.key === '5') this.applyPowerUp({ type: POWERUP_TYPES.LIFE_UP });
        else if (e.key === '6') this.applyPowerUp({ type: POWERUP_TYPES.SHOT });
        else if (e.key === '7') this.applyPowerUp({ type: POWERUP_TYPES.FALL_BOOM });
        else if (e.key === 'l' || e.key === 'L') {
          if (this.mode === GAME_MODES.CAMPAIGN) this.nextLevel();
          else this.survivalWave++;
        } else if (e.key === 'k' || e.key === 'K') {
          this.bricks.forEach(b => { if (!b.isImmortal()) b.destroyed = true; });
        } else if (e.key === 'g' || e.key === 'G') {
          if (this.balls.length > 0) this.handleBallLost(this.balls[0]);
        }
      }
    });

    window.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
    });

    this.canvas.addEventListener('click', e => {
      sounds.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (this.state === GAME_STATES.MENU) {
        const btnW = 320;
        const btnX = CANVAS_WIDTH / 2 - btnW / 2;
        if (x >= btnX && x <= btnX + btnW) {
          if (y >= 290 && y <= 340) this.startCampaign(1);
          else if (y >= 355 && y <= 405) this.startSurvivalMode();
          else if (y >= 420 && y <= 470) this.state = GAME_STATES.PICK_LEVEL;
          else if (y >= 485 && y <= 535) this.openLeaderboard();
          else if (y >= 550 && y <= 600) this.openTutorial();
        }
      } else if (this.state === GAME_STATES.PICK_LEVEL) {
        if (x >= 500 && x <= 700 && y >= 600 && y <= 650) {
          this.state = GAME_STATES.MENU;
          return;
        }
        const startX = 170;
        const startY = 150;
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
        const attached = this.balls.filter(b => b.isAttached);
        if (attached.length > 0) {
          attached.forEach(b => b.launch(this.paddle));
          sounds.playTone(480, 0.1, 'triangle', 680);
        } else if (this.paddle.canShoot) {
          this.paddle.fire(sounds);
        }
      } else if (this.state === GAME_STATES.RETRY) {
        const btnW = 280;
        const btnX = CANVAS_WIDTH / 2 - btnW / 2;
        if (x >= btnX && x <= btnX + btnW) {
          if (y >= CANVAS_HEIGHT / 2 + 70 && y <= CANVAS_HEIGHT / 2 + 125) {
            this.retryCurrentLevel();
          } else if (y >= CANVAS_HEIGHT / 2 + 140 && y <= CANVAS_HEIGHT / 2 + 195) {
            this.state = GAME_STATES.MENU;
          }
        }
      } else if (this.state === GAME_STATES.GAMEOVER || this.state === GAME_STATES.VICTORY) {
        const btnW = 280;
        const btnX = CANVAS_WIDTH / 2 - btnW / 2;
        if (x >= btnX && x <= btnX + btnW) {
          if (y >= CANVAS_HEIGHT / 2 + 75 && y <= CANVAS_HEIGHT / 2 + 125) {
            if (this.mode === GAME_MODES.SURVIVAL) {
              this.startSurvivalMode();
            } else {
              this.startCampaign(1);
            }
          } else if (y >= CANVAS_HEIGHT / 2 + 140 && y <= CANVAS_HEIGHT / 2 + 190) {
            this.state = GAME_STATES.MENU;
          }
        }
      }
    });
  }

  updateUserUI() {
    const userDisplay = document.getElementById('userDisplay');
    const authBtn = document.getElementById('authBtn');
    if (api.isLoggedIn()) {
      userDisplay.textContent = `👤 ${api.getUser()}`;
      userDisplay.className = 'user-badge clickable';
      authBtn.textContent = 'Logout';
    } else {
      // No guest badge: hide the name slot entirely until the player signs in.
      userDisplay.textContent = '';
      userDisplay.className = 'user-badge hidden';
      authBtn.textContent = 'Login / Register';
    }
  }

  async openProfile() {
    if (!api.isLoggedIn()) {
      document.getElementById('authModal').classList.remove('hidden');
      return;
    }
    const modal = document.getElementById('profileModal');
    const body = document.getElementById('profileBody');
    body.innerHTML = '<div class="loading">Loading cloud stats...</div>';
    modal.classList.remove('hidden');

    const p = await api.getProfile();
    if (!p) {
      body.innerHTML = '<div class="empty">Unable to fetch profile stats.</div>';
      return;
    }

    body.innerHTML = `
      <div class="profile-card">
        <div class="stat-row"><span>Player:</span><strong>${p.username}</strong></div>
        <div class="stat-row"><span>Global Rank:</span><strong class="gold">${p.globalRank > 0 ? '#' + p.globalRank : 'Unranked'}</strong></div>
        <div class="stat-row"><span>Personal Best:</span><strong class="gold">${p.personalBestScore.toLocaleString()} pts</strong></div>
        <div class="stat-row"><span>Max Level Unlocked:</span><strong>Level ${p.highestLevelUnlocked} / 20</strong></div>
        <div class="stat-row"><span>Matches Played:</span><strong>${p.totalGamesPlayed}</strong></div>
      </div>
    `;
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
    document.getElementById('userDisplay').addEventListener('click', () => {
      this.openProfile();
    });

    document.getElementById('authBtn').addEventListener('click', () => {
      if (api.isLoggedIn()) {
        api.logout();
        this.updateUserUI();
        this.syncProfile();
        this.showToast('Logged out successfully.', 'info');
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
          this.showToast(`Welcome ${u}! Account created.`, 'success');
        } else {
          await api.login(u, p);
          this.showToast(`Welcome back, ${u}!`, 'success');
        }
        document.getElementById('authModal').classList.add('hidden');
        await this.syncProfile();
      } catch (err) {
        errEl.textContent = err.message || 'Authentication failed';
      }
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
      sounds.init();
      if (this.state === GAME_STATES.PLAYING) this.openPauseMenu();
      else if (this.state === GAME_STATES.PAUSE) this.resumeGame();
    });

    document.getElementById('soundBtn').addEventListener('click', () => {
      sounds.init();
      sounds.toggleMute();
      this.syncVolumeUI();
      if (!sounds.isMuted()) sounds.playTone(760, 0.06, 'triangle', 980);
    });

    document.getElementById('resumeBtn').addEventListener('click', () => {
      sounds.init();
      this.resumeGame();
    });

    document.getElementById('replayBtn').addEventListener('click', () => {
      sounds.init();
      this.replayCurrentGame();
    });

    document.getElementById('menuBtn').addEventListener('click', () => {
      this.returnToMainMenu();
    });

    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    volumeSlider.addEventListener('wheel', e => {
      // Chrome changes a focused range input on wheel scroll; keep scrolling harmless.
      e.preventDefault();
    }, { passive: false });
    volumeSlider.addEventListener('input', () => {
      sounds.init();
      const percent = Number(volumeSlider.value);
      sounds.setVolume(percent / 100);
      volumeValue.textContent = `${percent}%`;
      this.syncSoundUI();
    });
    volumeSlider.addEventListener('change', () => {
      // Short preview so the player can hear the chosen level.
      if (sounds.getVolume() > 0) sounds.playTone(660, 0.08, 'triangle', 880);
    });
    this.syncVolumeUI();
    this.syncSoundUI();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
