// Pure gameplay rules shared by the game runtime and the automated test suite.
// Keeping these functions free of DOM/canvas access makes them directly testable in Node.js.

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 750;

export const INITIAL_LIVES = 3;
export const MAX_RETRIES = 3;              // Total attempts (initial run + 2 continues)
export const MAX_BALLS = 18;
export const MULTI_BALL_FAN_ANGLE = 0.44;  // ~25 degrees left/right
export const NORMAL_BRICK_DROP_RATE = 0.06;
export const BLAST_RADIUS = 150;
export const SURVIVAL_WAVE_INTERVAL = 540; // 9 seconds at 60 FPS
export const SURVIVAL_WAVE_MIN_INTERVAL = 300;
export const SURVIVAL_DESCENT_STEP = 42;
export const DANGER_LINE_Y = CANVAS_HEIGHT - 130;
export const DANGER_ALERT_MARGIN = 55;

export const DEFAULT_VOLUME = 0.5;
export const VOLUME_STORAGE_KEY = 'arkanoid_volume';
export const LAST_VOLUME_STORAGE_KEY = 'arkanoid_last_volume';

// Brick IDs that propagate a Domino chain when destroyed by an explosion.
export const CHAINING_BRICK_TYPES = [5, 6]; // 5 = FALL_BOMB, 6 = AREA_BLAST

/** Clamp a raw volume value (0..1) to the legal range. Invalid values fall back to 50%. */
export function clampVolume(value, fallback = DEFAULT_VOLUME) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}

/** Volume percentage (0..100) used by the pause-menu slider. */
export function volumeToPercent(value) {
  return Math.round(clampVolume(value) * 100);
}

/**
 * Mega Ball pierces regular bricks (it keeps its direction and can destroy
 * several in one frame). Immortal bricks still bounce it back.
 */
export function shouldPierceBrick(ball, brick) {
  if (!ball || !ball.isBigger) return false;
  const immortal = brick && (typeof brick.isImmortal === 'function' ? brick.isImmortal() : brick.type === 2);
  return !immortal;
}

/**
 * Normalize a REST base URL so it always ends with exactly one "/api".
 * Examples:
 *   https://host                -> https://host/api
 *   https://host/               -> https://host/api
 *   https://host/api            -> https://host/api
 *   https://host/api/           -> https://host/api
 */
export function normalizeApiUrl(raw, fallback = 'http://localhost:8080/api') {
  const input = (typeof raw === 'string' && raw.trim()) || fallback;
  const trimmed = input.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Compute the extra balls produced by the x3 Multi-Ball power-up.
 * Each existing ball spawns two new balls fanned out by +/- MULTI_BALL_FAN_ANGLE.
 * The total number of balls never exceeds maxBalls.
 */
export function computeMultiBallSpawns(balls, maxBalls = MAX_BALLS) {
  const spawns = [];

  for (const ball of balls) {
    if (balls.length + spawns.length >= maxBalls) break;

    const speed = Math.hypot(ball.dx, ball.dy) || ball.baseSpeed || 7.5;
    const currentAngle = Math.atan2(ball.dx, -ball.dy);

    const angleLeft = currentAngle - MULTI_BALL_FAN_ANGLE;
    spawns.push({
      x: ball.x,
      y: ball.y,
      dx: speed * Math.sin(angleLeft),
      dy: -speed * Math.cos(angleLeft),
      isBigger: !!ball.isBigger
    });

    if (balls.length + spawns.length < maxBalls) {
      const angleRight = currentAngle + MULTI_BALL_FAN_ANGLE;
      spawns.push({
        x: ball.x,
        y: ball.y,
        dx: speed * Math.sin(angleRight),
        dy: -speed * Math.cos(angleRight),
        isBigger: !!ball.isBigger
      });
    }
  }

  return spawns;
}

/**
 * Resolve what happens when the player runs out of lives.
 * With MAX_RETRIES = 3 the player gets the initial attempt plus two continues.
 */
export function resolveAttemptFailure(retriesLeft, maxRetries = MAX_RETRIES) {
  if (retriesLeft <= 1) {
    return { retriesLeft: 0, state: 'GAMEOVER' };
  }
  return { retriesLeft: Math.min(retriesLeft, maxRetries) - 1, state: 'RETRY' };
}

/** Survival Mode: a brick touches or crosses the Danger Line. */
export function isDangerBreach(brick, dangerLineY = DANGER_LINE_Y) {
  return !!brick && !brick.destroyed && brick.y + brick.h >= dangerLineY;
}

/** Survival Mode: a brick is within the warning margin above the Danger Line. */
export function isDangerAlert(brick, dangerLineY = DANGER_LINE_Y, margin = DANGER_ALERT_MARGIN) {
  return !!brick && !brick.destroyed && brick.y + brick.h >= dangerLineY - margin;
}

/** Normal bricks drop a random power-up at a fixed 6% rate. */
export function shouldDropNormalPowerUp(roll, rate = NORMAL_BRICK_DROP_RATE) {
  return roll < rate;
}

/**
 * Collect every brick destroyed by a Domino explosion.
 * The explosion starts at `center` and destroys bricks within `radius`.
 * Any bomb brick (FALL_BOMB / AREA_BLAST) caught in the blast becomes a new
 * explosion source, so the chain propagates across the cluster exactly once.
 */
export function collectBlastTargets(bricks, center, radius = BLAST_RADIUS) {
  const targets = [];
  const visited = new Set([center]);
  const queue = [center];
  const centerOf = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

  while (queue.length > 0) {
    const source = queue.shift();
    const sourceCenter = centerOf(source);

    for (const brick of bricks) {
      if (brick === source || visited.has(brick) || brick.destroyed) continue;
      if (typeof brick.isImmortal === 'function' ? brick.isImmortal() : brick.type === 2) continue;

      const brickCenter = centerOf(brick);
      const distance = Math.hypot(brickCenter.x - sourceCenter.x, brickCenter.y - sourceCenter.y);
      if (distance > radius) continue;

      visited.add(brick);
      targets.push(brick);

      if (CHAINING_BRICK_TYPES.includes(brick.type)) {
        queue.push(brick);
      }
    }
  }

  return targets;
}
