// Automated test suite for Arkanoid Online (client + shared game rules).
// Run from the repository root:  node tests/automated/run-client-tests.js
// Or from client/:               npm test
//
// Unlike the previous suite, these tests import the real production modules
// (GameRules, MapData, Ball, Paddle, Brick, PowerUp) instead of re-implementing
// their logic inside the test file.

import { readFileSync } from 'node:fs';

if (typeof global.Image === 'undefined') {
  global.Image = class {
    constructor() {
      this.src = '';
      this.complete = false;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
    }
  };
}

let totalTests = 0;
let passedTests = 0;
const failures = [];

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
  } else {
    failures.push(testName);
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  assert(actual === expected, `${testName} (expected ${expected}, got ${actual})`);
}

function assertClose(actual, expected, tolerance, testName) {
  assert(Math.abs(actual - expected) <= tolerance,
    `${testName} (expected ~${expected}, got ${actual.toFixed(3)})`);
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   ARKANOID ONLINE - AUTOMATED TEST SUITE (v2)');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // GROUP 1: MapData & 20 levels
  // ------------------------------------------------------------------
  console.log('\x1b[36m[GROUP 1] 20 Curated Levels & Domino Cluster\x1b[0m');
  const { LEVEL_MAPS, getMapByLevel } = await import('../../client/src/systems/MapData.js');

  assertEqual(LEVEL_MAPS.length, 20, 'System contains exactly 20 curated levels');

  let allMapsHave8x13 = true;
  let allCellIdsValid = true;
  for (const map of LEVEL_MAPS) {
    if (map.length !== 8) allMapsHave8x13 = false;
    for (const row of map) {
      if (row.length !== 13) allMapsHave8x13 = false;
      for (const cell of row) {
        if (!Number.isInteger(cell) || cell < 0 || cell > 8) allCellIdsValid = false;
      }
    }
  }
  assert(allMapsHave8x13, 'All 20 level grids are strictly 8 rows by 13 columns');
  assert(allCellIdsValid, 'Every map cell uses a valid brick ID (0-8)');

  const level1 = getMapByLevel(1);
  let areaBlastCount = 0;
  for (const row of level1) for (const cell of row) if (cell === 6) areaBlastCount++;
  assert(areaBlastCount >= 15, `Level 1 has a real Domino cluster (${areaBlastCount} AreaBlast bricks)`);

  const level20 = getMapByLevel(20);
  assert(
    level20.some(r => r.includes(2)) && level20.some(r => r.includes(8)),
    'Level 20 boss contains both Immortal and Push bricks'
  );

  let allLevelsNonEmpty = true;
  for (let i = 1; i <= 20; i++) {
    const map = getMapByLevel(i);
    if (!map.flat().some(cell => cell !== 0)) allLevelsNonEmpty = false;
  }
  assert(allLevelsNonEmpty, 'All 20 levels contain at least one brick');

  // ------------------------------------------------------------------
  // GROUP 2: Shared rules & API URL normalization
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 2] Shared GameRules & REST URL Normalization\x1b[0m');
  const rules = await import('../../client/src/systems/GameRules.js');

  assertEqual(rules.CANVAS_WIDTH, 1200, 'Canvas width constant is 1200');
  assertEqual(rules.CANVAS_HEIGHT, 750, 'Canvas height constant is 750');
  assertEqual(rules.MAX_BALLS, 18, 'Multi-ball cap is 18 balls');
  assertEqual(rules.NORMAL_BRICK_DROP_RATE, 0.06, 'Normal brick drop rate constant is exactly 6%');
  assertEqual(rules.DANGER_LINE_Y, 620, 'Danger Line is at y=620 (above paddle)');
  assertEqual(rules.SURVIVAL_WAVE_INTERVAL, 540, 'Survival wave starts at 540 frames (9s)');

  assertEqual(
    rules.normalizeApiUrl('https://arkanoid-backend.onrender.com'),
    'https://arkanoid-backend.onrender.com/api',
    'Root domain gains /api suffix'
  );
  assertEqual(
    rules.normalizeApiUrl('https://arkanoid-backend.onrender.com/'),
    'https://arkanoid-backend.onrender.com/api',
    'Trailing slash is normalized'
  );
  assertEqual(
    rules.normalizeApiUrl('https://arkanoid-backend.onrender.com/api'),
    'https://arkanoid-backend.onrender.com/api',
    'Existing /api suffix is preserved'
  );
  assertEqual(
    rules.normalizeApiUrl('https://arkanoid-backend.onrender.com/api/'),
    'https://arkanoid-backend.onrender.com/api',
    'Existing /api/ suffix is normalized without duplication'
  );
  assertEqual(
    rules.normalizeApiUrl(''),
    'http://localhost:8080/api',
    'Empty API URL falls back to localhost'
  );

  assertEqual(rules.clampVolume(-0.2), 0, 'Volume below 0 is clamped to mute');
  assertEqual(rules.clampVolume(1.4), 1, 'Volume above 1 is clamped to max');
  assertEqual(rules.clampVolume(0.25), 0.25, 'Valid volume is preserved');
  assertEqual(rules.clampVolume('not-a-number'), 0.5, 'Invalid volume falls back to 50%');
  assertEqual(rules.volumeToPercent(0.5), 50, 'Volume 0.5 maps to 50%');
  assertEqual(rules.volumeToPercent(1), 100, 'Volume 1.0 maps to 100%');
  assertEqual(rules.DEFAULT_VOLUME, 0.5, 'Default volume is 50%');

  // ------------------------------------------------------------------
  // GROUP 3: x3 Multi-Ball (real helper used by main.js)
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 3] x3 Multi-Ball Triplication\x1b[0m');

  const ball = (dx = 0, dy = -7.5, extra = {}) => ({
    x: 600, y: 700, dx, dy, baseSpeed: 7.5, isBigger: false, ...extra
  });

  const spawns1 = rules.computeMultiBallSpawns([ball()]);
  assertEqual(spawns1.length, 2, 'Multi-ball adds 2 new balls for 1 existing ball');
  assertEqual(1 + spawns1.length, 3, '1 ball becomes exactly 3 balls');
  assert(spawns1[0].dx < 0 && spawns1[1].dx > 0, 'The two new balls fan out left and right');
  assertClose(Math.hypot(spawns1[0].dx, spawns1[0].dy), 7.5, 0.001, 'New ball keeps the original speed');
  assertClose(spawns1[0].dy, spawns1[1].dy, 0.001, 'Both fanned balls share the same vertical velocity');

  const spawns2 = rules.computeMultiBallSpawns([ball(), ball()]);
  assertEqual(2 + spawns2.length, 6, '2 balls become exactly 6 balls');

  const nineBalls = Array.from({ length: 9 }, () => ball());
  const spawns9 = rules.computeMultiBallSpawns(nineBalls);
  assertEqual(9 + spawns9.length, 18, '9 balls cap at exactly 18 balls');

  const eighteenBalls = Array.from({ length: 18 }, () => ball());
  assertEqual(rules.computeMultiBallSpawns(eighteenBalls).length, 0, 'At 18 balls no further balls spawn');

  const bigSpawns = rules.computeMultiBallSpawns([ball(0, -7.5, { isBigger: true })]);
  assert(bigSpawns.every(s => s.isBigger === true), 'Mega Balls propagate their size to split balls');

  // ------------------------------------------------------------------
  // GROUP 4: PowerUps, Brick types and real 6% drop logic
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 4] PowerUps & 6% Brick Drop Logic\x1b[0m');
  const { POWERUP_TYPES, POWERUP_META, PowerUp } = await import('../../client/src/entities/PowerUp.js');
  const { BRICK_TYPES, Brick } = await import('../../client/src/entities/Brick.js');

  assertEqual(Object.keys(POWERUP_TYPES).length, 7, 'Exactly 7 PowerUp types are registered (gold removed)');
  assertEqual(Object.keys(BRICK_TYPES).length, 9, 'Exactly 9 Brick IDs are defined (0-8)');
  assertEqual(POWERUP_TYPES.GOLD, undefined, 'GOLD is no longer a PowerUp type');
  assertEqual(POWERUP_META.GOLD, undefined, 'GOLD has no PowerUp meta/label');

  const labels = Object.values(POWERUP_META).map(meta => meta.label);
  for (const expected of ['↔ WIDE', '>< MINI', 'x3 MULTI', '● MEGA', '❤️ +1 LIFE', '⚡ LASER', '💣 NUKE']) {
    assert(labels.includes(expected), `PowerUp label "${expected}" is registered`);
  }
  assert(!labels.includes('⭐ +500'), 'No +500 gold label remains in the PowerUp table');

  // Every one of the 7 remaining types is reachable through the random constructor.
  {
    const sampled = new Set();
    const originalRandom = Math.random;
    try {
      for (let i = 0; i < 7; i++) {
        Math.random = () => i / 7 + 0.001;
        sampled.add(new PowerUp(0, 0).type);
      }
    } finally {
      Math.random = originalRandom;
    }
    assertEqual(sampled.size, 7, 'Random drop selection spans all 7 remaining types evenly');
    assert(!sampled.has('GOLD'), 'Random drop selection can never produce GOLD');
  }

  const powerUpSource = readFileSync(new URL('../../client/src/entities/PowerUp.js', import.meta.url), 'utf8');
  assert(
    powerUpSource.includes('Tương lai: thêm lại nhặt vàng để mua skin paddle'),
    'PowerUp.js keeps the single TODO for future paddle skins'
  );

  const capsule = new PowerUp(100, 100, POWERUP_TYPES.DUPLICATE);
  assertEqual(capsule.w, 72, 'PowerUp capsule width is 72px');
  assertEqual(capsule.h, 24, 'PowerUp capsule height is 24px');

  assertEqual(rules.shouldDropNormalPowerUp(0.0), true, 'Roll 0.000 drops a power-up');
  assertEqual(rules.shouldDropNormalPowerUp(0.059), true, 'Roll 0.059 drops a power-up (below 6%)');
  assertEqual(rules.shouldDropNormalPowerUp(0.06), false, 'Roll 0.060 does NOT drop (boundary)');
  assertEqual(rules.shouldDropNormalPowerUp(0.061), false, 'Roll 0.061 does NOT drop (above 6%)');

  const originalRandom = Math.random;
  try {
    Math.random = () => 0.059;
    const luckyBrick = new Brick(0, 0, 75, 34, BRICK_TYPES.NORMAL, 0, 0);
    assert(luckyBrick.spawnPowerUp() !== null, 'Real Brick.spawnPowerUp drops below the 6% threshold');

    Math.random = () => 0.061;
    const unluckyBrick = new Brick(0, 0, 75, 34, BRICK_TYPES.NORMAL, 0, 0);
    assertEqual(unluckyBrick.spawnPowerUp(), null, 'Real Brick.spawnPowerUp drops nothing above 6%');

    Math.random = () => 0.0;
    const goldBrick = new Brick(0, 0, 75, 34, BRICK_TYPES.GOLD, 0, 0);
    assertEqual(goldBrick.points, 300, 'Gold bricks are still worth 300 points');
    assertEqual(goldBrick.spawnPowerUp(), null, 'Gold bricks never drop a +500 pickup anymore');
  } finally {
    Math.random = originalRandom;
  }

  // ------------------------------------------------------------------
  // GROUP 5: 3 attempts / continues
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 5] 3-Attempt Retry System\x1b[0m');

  const firstLoss = rules.resolveAttemptFailure(3, 3);
  assertEqual(firstLoss.state, 'RETRY', 'First failed attempt goes to RETRY');
  assertEqual(firstLoss.retriesLeft, 2, 'First failed attempt leaves 2 attempts');

  const secondLoss = rules.resolveAttemptFailure(firstLoss.retriesLeft, 3);
  assertEqual(secondLoss.state, 'RETRY', 'Second failed attempt goes to RETRY');
  assertEqual(secondLoss.retriesLeft, 1, 'Second failed attempt leaves 1 attempt');

  const thirdLoss = rules.resolveAttemptFailure(secondLoss.retriesLeft, 3);
  assertEqual(thirdLoss.state, 'GAMEOVER', 'Third failed attempt ends the campaign');
  assertEqual(thirdLoss.retriesLeft, 0, 'Third failed attempt leaves 0 attempts');

  assertEqual(rules.resolveAttemptFailure(0, 3).state, 'GAMEOVER', 'Zero attempts always resolves to GAMEOVER');

  // ------------------------------------------------------------------
  // GROUP 6: Survival Danger Line
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 6] Survival Danger Line\x1b[0m');

  assertEqual(rules.isDangerBreach({ y: 585, h: 34, destroyed: false }), false, 'Brick above the line is safe (bottom 619)');
  assertEqual(rules.isDangerBreach({ y: 586, h: 34, destroyed: false }, 621), false, 'Explicit line 621: bottom 620 is safe');
  assertEqual(rules.isDangerBreach({ y: 586, h: 34, destroyed: false }), true, 'Brick touching the line triggers breach');
  assertEqual(rules.isDangerBreach({ y: 600, h: 34, destroyed: false }), true, 'Brick crossing the line triggers breach');
  assertEqual(rules.isDangerBreach({ y: 600, h: 34, destroyed: true }), false, 'Destroyed bricks never trigger a breach');

  assertEqual(rules.isDangerAlert({ y: 620 - 55 - 34, h: 34, destroyed: false }), true, 'Brick within the 55px warning margin raises the alert');
  assertEqual(rules.isDangerAlert({ y: 620 - 56 - 34, h: 34, destroyed: false }), false, 'Brick outside the 55px margin stays calm');
  assertEqual(rules.isDangerAlert({ y: 600, h: 34, destroyed: true }), false, 'Destroyed bricks never raise the alert');

  // ------------------------------------------------------------------
  // GROUP 7: Real Domino chain propagation
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 7] Domino Chain Propagation\x1b[0m');

  const makeBrick = (x, type = BRICK_TYPES.NORMAL, destroyed = false) => ({
    x, y: 0, w: 10, h: 10, type, destroyed,
    isImmortal() { return this.type === BRICK_TYPES.IMMORTAL; }
  });

  {
    const center = makeBrick(0, BRICK_TYPES.AREA_BLAST);
    const bomb2 = makeBrick(120, BRICK_TYPES.AREA_BLAST);
    const bomb3 = makeBrick(240, BRICK_TYPES.FALL_BOMB);
    const normal = makeBrick(300, BRICK_TYPES.NORMAL);
    const farAway = makeBrick(800, BRICK_TYPES.NORMAL);
    const immortal = makeBrick(150, BRICK_TYPES.IMMORTAL);
    const bricks = [center, bomb2, normal, bomb3, farAway, immortal];

    const targets = rules.collectBlastTargets(bricks, center, 150);
    assertEqual(targets.length, 3, 'Chain destroys exactly the 3 reachable bricks');
    assert(targets.includes(bomb2), 'First chained bomb is destroyed');
    assert(targets.includes(normal), 'Normal brick inside the blast is destroyed');
    assert(targets.includes(bomb3), 'Second bomb reached through the chain is destroyed');
    assert(!targets.includes(farAway), 'Brick beyond the chain radius is untouched');
    assert(!targets.includes(immortal), 'Immortal brick is never destroyed by the chain');
    assertEqual(new Set(targets).size, targets.length, 'No brick is counted twice');

    const tinyBlast = rules.collectBlastTargets(bricks, center, 40);
    assertEqual(tinyBlast.length, 0, 'A 40px blast only hits the source brick');
  }

  // ------------------------------------------------------------------
  // GROUP 8: Real Paddle & Ball aiming/launch behaviour
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 8] Paddle Sizing & Deterministic Launch\x1b[0m');
  const { Paddle } = await import('../../client/src/entities/Paddle.js');
  const { Ball } = await import('../../client/src/entities/Ball.js');

  const paddle = new Paddle(rules.CANVAS_WIDTH, rules.CANVAS_HEIGHT);
  assertEqual(paddle.w, 140, 'Paddle starts at 140px wide');
  paddle.setLength('LONGER');
  assertEqual(paddle.w, 224, 'WIDE power-up expands paddle to 224px');
  paddle.setLength('SHORTEN');
  assertEqual(paddle.w, 91, 'MINI power-up shrinks paddle to 91px');
  paddle.setLength('NORMAL');
  assertEqual(paddle.w, 140, 'Normal size restores 140px');

  paddle.moveLeft();
  paddle.update();
  paddle.moveRight();
  paddle.update();
  assertEqual(paddle.dx, 12, 'Paddle moves right at 12px/frame when D is held');

  const aimBall = new Ball(600, 680, true);
  paddle.dx = -12;
  assert(aimBall.getLaunchAngle(paddle) < 0, 'Holding LEFT aims the launch guide to the left');
  paddle.dx = 12;
  assert(aimBall.getLaunchAngle(paddle) > 0, 'Holding RIGHT aims the launch guide to the right');
  paddle.dx = 0;
  paddle.lastDirection = 0;
  assertEqual(aimBall.getLaunchAngle(paddle), 0, 'Idle paddle launches straight up');

  paddle.dx = 12;
  aimBall.launch(paddle);
  assertEqual(aimBall.isAttached, false, 'Launch detaches the ball from the paddle');
  assert(aimBall.dx > 0, 'Ball launches in the aimed direction (right)');
  assertClose(Math.hypot(aimBall.dx, aimBall.dy), 7.5, 0.001, 'Launch speed is exactly 7.5px/frame');
  assert(aimBall.dy < 0, 'Ball always launches upward');

  // ------------------------------------------------------------------
  // GROUP 9: Mega Ball piercing
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 9] Mega Ball Piercing\x1b[0m');

  {
    const bigBall = new Ball(100, 100, false);
    bigBall.isBigger = true;
    bigBall.dx = 5;
    bigBall.dy = -3;
    const normalBrick = new Brick(95, 95, 30, 30, BRICK_TYPES.NORMAL, 0, 0);
    assertEqual(normalBrick.checkCollision(bigBall), true, 'Mega Ball collides with a regular brick');
    assertEqual(bigBall.dx, 5, 'Mega Ball keeps horizontal direction through a regular brick');
    assertEqual(bigBall.dy, -3, 'Mega Ball keeps vertical direction through a regular brick');
    assertEqual(rules.shouldPierceBrick(bigBall, normalBrick), true, 'shouldPierceBrick is true for normal bricks');

    const immortalBrick = new Brick(95, 95, 30, 30, BRICK_TYPES.IMMORTAL, 0, 0);
    const bigBall2 = new Ball(100, 100, false);
    bigBall2.isBigger = true;
    bigBall2.dx = 5;
    bigBall2.dy = -3;
    immortalBrick.checkCollision(bigBall2);
    assert(bigBall2.dx === -5 || bigBall2.dy === 3, 'Mega Ball still bounces off immortal bricks');
    assertEqual(rules.shouldPierceBrick(bigBall2, immortalBrick), false, 'shouldPierceBrick is false for immortal bricks');

    const normalBall = new Ball(100, 100, false);
    normalBall.dx = 5;
    normalBall.dy = -3;
    const otherBrick = new Brick(95, 95, 30, 30, BRICK_TYPES.NORMAL, 0, 0);
    otherBrick.checkCollision(normalBall);
    assert(normalBall.dx === -5 || normalBall.dy === 3, 'Regular ball still bounces off regular bricks');
    assertEqual(rules.shouldPierceBrick(normalBall, otherBrick), false, 'Regular ball never pierces');
  }

  // ------------------------------------------------------------------
  // GROUP 10: Survival PUSH push-up + smooth wave animation
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 10] Survival PUSH & Smooth Descent Animation\x1b[0m');

  assertEqual(rules.SURVIVAL_DESCENT_STEP, 42, 'Survival wave descends exactly 42px');
  assertEqual(rules.SURVIVAL_PUSHUP_STEP, 42, 'PUSH brick shoves the stack up exactly one row');
  assertEqual(rules.SURVIVAL_ANIM_DURATION, 45, 'Slide lasts 45 frames (~0.75s at 60 FPS)');

  const logicalBrick = (y, destroyed = false, targetY = y) => ({ y, targetY, h: 34, destroyed });

  assertEqual(
    rules.computeSurvivalPushUpShift([logicalBrick(200), logicalBrick(300)], 42, 60),
    42,
    'PUSH shifts a mid-field stack by one full 42px row'
  );
  assertEqual(
    rules.computeSurvivalPushUpShift([logicalBrick(80), logicalBrick(300)], 42, 60),
    20,
    'PUSH clamps at the playfield ceiling instead of leaving the board'
  );
  assertEqual(
    rules.computeSurvivalPushUpShift([logicalBrick(60)], 42, 60),
    0,
    'PUSH does nothing once the stack is flush with the ceiling'
  );
  assertEqual(
    rules.computeSurvivalPushUpShift([logicalBrick(60, true), logicalBrick(150)], 42, 60),
    42,
    'Destroyed bricks are ignored when measuring headroom'
  );
  assertEqual(
    rules.computeSurvivalPushUpShift([{ y: 100, targetY: 142, h: 34, destroyed: false }], 42, 60),
    42,
    'PUSH measures the logical target Y, not the mid-animation display Y'
  );

  assertEqual(rules.easeInOutQuad(0), 0, 'Easing starts at 0');
  assertEqual(rules.easeInOutQuad(1), 1, 'Easing ends at 1');
  assertClose(rules.easeInOutQuad(0.5), 0.5, 0.0001, 'Easing is centered at 0.5');
  assertClose(
    rules.easeInOutQuad(0.25) + rules.easeInOutQuad(0.75),
    1,
    0.0001,
    'Easing is symmetric around the midpoint'
  );
  assert(
    rules.easeInOutQuad(0.75) > rules.easeInOutQuad(0.25),
    'Easing accelerates then decelerates monotonically'
  );

  assertEqual(rules.resolveAnimatedY(100, 142, 0, 45), 100, 'Animation starts from the live Y');
  assertEqual(rules.resolveAnimatedY(100, 142, 45, 45), 142, 'Animation lands exactly on the target');
  assertEqual(rules.resolveAnimatedY(100, 142, 90, 45), 142, 'Animation never overshoots its target');
  const midY = rules.resolveAnimatedY(100, 142, 22, 45);
  assert(midY > 100 && midY < 142, 'Mid-animation Y sits strictly between start and target');

  {
    const animBrick = new Brick(0, 100, 75, 34, BRICK_TYPES.NORMAL, 0, 0);
    animBrick.animateTo(142, 45);
    assertEqual(animBrick.targetY, 142, 'animateTo stores the logical destination');
    assertEqual(animBrick.y, 100, 'animateTo keeps the starting display Y');

    animBrick.updateAnimation();
    assert(animBrick.y > 100 && animBrick.y < 142, 'First slide frame moves the brick partway');

    let reached = false;
    for (let i = 0; i < 60 && animBrick.animDuration > 0; i++) {
      reached = animBrick.updateAnimation() || reached;
    }
    assertEqual(animBrick.y, 142, 'Brick finishes exactly on the destination');
    assertEqual(animBrick.targetY, 142, 'Destination is preserved after landing');
    assert(reached, 'updateAnimation reports the frame it lands');
  }

  {
    const fadeBrick = new Brick(0, 58, 75, 34, BRICK_TYPES.NORMAL, 0, 0);
    fadeBrick.animateTo(100, 45, { fadeIn: true });
    assertEqual(fadeBrick.alpha, 0, 'New top-row bricks start fully transparent');
    for (let i = 0; i < 20; i++) fadeBrick.updateAnimation();
    assert(fadeBrick.alpha > 0 && fadeBrick.alpha < 1, 'New top-row bricks fade in during the slide');
    for (let i = 0; i < 40 && fadeBrick.animDuration > 0; i++) fadeBrick.updateAnimation();
    assertEqual(fadeBrick.alpha, 1, 'New top-row bricks are fully opaque at the end');
    assertEqual(fadeBrick.y, 100, 'New top-row bricks land on the first grid row');
  }

  {
    const slideBrick = new Brick(300, 100, 100, 34, BRICK_TYPES.NORMAL, 0, 0);
    slideBrick.animateTo(184, 45);
    for (let i = 0; i < 22; i++) slideBrick.updateAnimation();
    const liveY = slideBrick.y;
    assert(liveY > 100 && liveY < 184, 'Brick occupies a real intermediate position');

    const ballAtOldSlot = { x: 350, y: 100, r: 11 };
    assertEqual(
      slideBrick.checkCollision(ballAtOldSlot),
      false,
      'Collision ignores the vacated start position during the slide'
    );
    const ballAtLiveSlot = { x: 350, y: liveY + 17, r: 11 };
    assertEqual(
      slideBrick.checkCollision(ballAtLiveSlot),
      true,
      'Collision hits the brick where it is actually drawn'
    );
  }

  {
    const waveBrick = new Brick(0, 100, 75, 34, BRICK_TYPES.NORMAL, 0, 0);
    waveBrick.animateBy(42, 45);
    waveBrick.updateAnimation();
    waveBrick.animateBy(42, 45);
    assertEqual(waveBrick.targetY, 184, 'A second wave stacks on the logical target, not the live Y');

    let guard = 0;
    while (waveBrick.animDuration > 0 && guard < 200) {
      waveBrick.updateAnimation();
      guard++;
    }
    assertEqual(waveBrick.y, 184, 'Overlapping waves finish at the correct accumulated destination');
    assert(guard <= 45, 'The restarted slide still completes within one animation duration');
  }

  {
    const dangerBrick = new Brick(0, 500, 75, 34, BRICK_TYPES.NORMAL, 0, 0);
    dangerBrick.animateTo(600, 45);
    dangerBrick.updateAnimation();
    assertEqual(
      rules.isDangerBreach(dangerBrick, 620),
      false,
      'Danger Line uses the live mid-slide Y (still safe while sliding)'
    );
    while (dangerBrick.animDuration > 0 && dangerBrick.animElapsed < 200) {
      dangerBrick.updateAnimation();
    }
    assertEqual(
      rules.isDangerBreach(dangerBrick, 620),
      true,
      'Danger Line triggers once the brick really reaches the line'
    );
  }

  // ------------------------------------------------------------------
  // GROUP 11: Timed power-up countdowns
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 11] Timed Power-Up Countdowns\x1b[0m');

  assertEqual(rules.POWERUP_DURATIONS.LONGER, 600, 'WIDE lasts 10 seconds (600 frames)');
  assertEqual(rules.POWERUP_DURATIONS.SHORTEN, 600, 'MINI lasts 10 seconds (600 frames)');
  assertEqual(rules.POWERUP_DURATIONS.BIGGER_BALL, 550, 'MEGA keeps its ~9 second duration');
  assertEqual(rules.POWERUP_DURATIONS.SHOT, 450, 'LASER keeps its 7.5 second duration');
  assertEqual(rules.POWERUP_DURATIONS.DUPLICATE, undefined, 'x3 MULTI is instant and untimed');
  assertEqual(rules.POWERUP_DURATIONS.LIFE_UP, undefined, '+1 LIFE is instant and untimed');
  assertEqual(rules.POWERUP_DURATIONS.FALL_BOOM, undefined, 'NUKE is instant and untimed');
  assertEqual(rules.POWERUP_MUTEX.LONGER, POWERUP_TYPES.SHORTEN, 'WIDE replaces MINI');
  assertEqual(rules.POWERUP_MUTEX.SHORTEN, POWERUP_TYPES.LONGER, 'MINI replaces WIDE');
  assertEqual(rules.POWERUP_EXPIRY_BLINK_FRAMES, 60, 'Countdown blinks during the final second');

  {
    const timers = {};
    rules.refreshPowerUpTimer(timers, POWERUP_TYPES.LONGER);
    assertEqual(timers.LONGER.remaining, 600, 'Picking WIDE starts a full 600-frame counter');
    assertEqual(timers.LONGER.duration, 600, 'Timer keeps its duration for the HUD ring');

    rules.tickPowerUpTimers(timers, 240);
    assertEqual(timers.LONGER.remaining, 360, 'Timer counts down frame by frame');

    rules.refreshPowerUpTimer(timers, POWERUP_TYPES.LONGER);
    assertEqual(timers.LONGER.remaining, 600, 'Re-picking the same power-up refreshes the timer');
    assertEqual(Object.keys(timers).length, 1, 'Re-picking never stacks a second counter');

    rules.tickPowerUpTimers(timers, 0);
    assertEqual(timers.LONGER.remaining, 600, 'A frozen frame (Pause) leaves the timer untouched');

    const expired = rules.tickPowerUpTimers(timers, 600);
    assert(expired.includes(POWERUP_TYPES.LONGER), 'Timer reports expiry at zero');
    assertEqual(timers.LONGER, undefined, 'Expired timer is removed from the active set');
    assertEqual(Object.keys(timers).length, 0, 'No stale timers are left behind');
  }

  {
    const parallel = {};
    rules.refreshPowerUpTimer(parallel, POWERUP_TYPES.LONGER);
    rules.refreshPowerUpTimer(parallel, POWERUP_TYPES.SHOT);
    rules.refreshPowerUpTimer(parallel, POWERUP_TYPES.BIGGER_BALL);
    assertEqual(Object.keys(parallel).length, 3, 'Three different power-ups can run in parallel');
    const expired = rules.tickPowerUpTimers(parallel, 450);
    assert(expired.includes(POWERUP_TYPES.SHOT), 'LASER expires first (450 frames)');
    assert(!expired.includes(POWERUP_TYPES.BIGGER_BALL), 'MEGA survives LASER expiry');
    assert(!expired.includes(POWERUP_TYPES.LONGER), 'WIDE survives LASER expiry');
    assertEqual(parallel.LONGER.remaining, 150, 'Each timer keeps its own independent countdown');
  }

  {
    assertEqual(rules.isPowerUpTimerBlinking({ remaining: 60, duration: 600 }), true, 'Final second blinks');
    assertEqual(rules.isPowerUpTimerBlinking({ remaining: 61, duration: 600 }), false, 'No blink before the last second');
    assertEqual(rules.isPowerUpTimerBlinking({ remaining: 1, duration: 600 }), true, 'Last frame still blinks');
    assertEqual(rules.isPowerUpTimerBlinking({ remaining: 0, duration: 600 }), false, 'An expired timer never blinks');
  }

  // ------------------------------------------------------------------
  // GROUP 12: Expiry restores paddle/ball state; laser is timer-driven
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[GROUP 12] Power-Up Expiry Effects & Laser Autofire\x1b[0m');

  {
    const laserPaddle = new Paddle(rules.CANVAS_WIDTH, rules.CANVAS_HEIGHT);
    laserPaddle.enableShooting();
    for (let i = 0; i < 22; i++) laserPaddle.update();
    assert(laserPaddle.bullets.length > 0, 'Laser cannons auto-fire while the timer is active');

    laserPaddle.bullets = [];
    laserPaddle.disableShooting();
    for (let i = 0; i < 44; i++) laserPaddle.update();
    assertEqual(laserPaddle.canShoot, false, 'Expiry switches the laser off');
    assertEqual(laserPaddle.bullets.length, 0, 'No new bullets spawn after expiry');
  }

  {
    const megaBall = new Ball(100, 100, false);
    megaBall.setBigger();
    assertEqual(megaBall.r, 19, 'MEGA raises the ball radius to 19');
    assertEqual(megaBall.bigTimer, undefined, 'The ball no longer owns a private timer');
    megaBall.resetSize();
    assertEqual(megaBall.r, 11, 'MEGA expiry restores radius 11');

    const megaTimers = {};
    rules.refreshPowerUpTimer(megaTimers, POWERUP_TYPES.BIGGER_BALL);
    const megaExpired = rules.tickPowerUpTimers(megaTimers, rules.POWERUP_DURATIONS.BIGGER_BALL);
    assertEqual(megaExpired.includes(POWERUP_TYPES.BIGGER_BALL), true, 'MEGA expiry is driven by the shared timer');
  }

  {
    const widePaddle = new Paddle(rules.CANVAS_WIDTH, rules.CANVAS_HEIGHT);
    widePaddle.setLength('LONGER');
    assertEqual(widePaddle.w, 224, 'WIDE sets 224px while active');
    widePaddle.setLength('NORMAL');
    assertEqual(widePaddle.w, 140, 'WIDE expiry restores the 140px paddle');
  }

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`   TOTAL TESTS : ${totalTests}`);
  console.log(`   \x1b[32mPASSED      : ${passedTests}\x1b[0m`);
  console.log(`   ${failures.length ? '\x1b[31m' : '\x1b[32m'}FAILED      : ${failures.length}\x1b[0m`);
  if (failures.length > 0) {
    console.log('\n   Failed tests:');
    for (const failure of failures) console.log(`   - ${failure}`);
  }
  console.log('======================================================\n');

  process.exit(failures.length > 0 ? 1 : 0);
}

runTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
