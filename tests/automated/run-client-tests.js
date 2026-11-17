// Automated test suite for Arkanoid Online (client + shared game rules).
// Run from the repository root:  node tests/automated/run-client-tests.js
// Or from client/:               npm test
//
// Unlike the previous suite, these tests import the real production modules
// (GameRules, MapData, Ball, Paddle, Brick, PowerUp) instead of re-implementing
// their logic inside the test file.

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

  assertEqual(Object.keys(POWERUP_TYPES).length, 8, 'Exactly 8 PowerUp types are registered');
  assertEqual(Object.keys(BRICK_TYPES).length, 9, 'Exactly 9 Brick IDs are defined (0-8)');

  const labels = Object.values(POWERUP_META).map(meta => meta.label);
  for (const expected of ['↔ WIDE', '>< MINI', 'x3 MULTI', '● MEGA', '❤️ +1 LIFE', '⚡ LASER', '💣 NUKE', '⭐ +500']) {
    assert(labels.includes(expected), `PowerUp label "${expected}" is registered`);
  }

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
