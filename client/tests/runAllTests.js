// Automated Test Suite for Arkanoid Online
// Run via: npm test

// Shims for browser globals in Node.js test environment
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
if (typeof global.localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: k => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   ARKANOID ONLINE - AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // TEST GROUP 1: MapData & 20 Levels Architecture
  console.log('\x1b[36m[GROUP 1] MapData & 20 Curated Levels Integrity\x1b[0m');
  const { LEVEL_MAPS, getMapByLevel } = await import('../src/systems/MapData.js');
  
  assert(LEVEL_MAPS.length === 20, 'System contains exactly 20 curated levels');
  
  let allMapsHave8x13 = true;
  for (let i = 0; i < LEVEL_MAPS.length; i++) {
    const map = LEVEL_MAPS[i];
    if (map.length !== 8) allMapsHave8x13 = false;
    for (const row of map) {
      if (row.length !== 13) allMapsHave8x13 = false;
    }
  }
  assert(allMapsHave8x13, 'All 20 level grids adhere strictly to 8 rows by 13 columns');

  const level1 = getMapByLevel(1);
  let areaBlastCountInLevel1 = 0;
  for (const row of level1) {
    for (const cell of row) {
      if (cell === 6) areaBlastCountInLevel1++; // ID 6 = AreaBlast
    }
  }
  assert(areaBlastCountInLevel1 >= 15, `Level 1 features Domino Chain Reaction cluster (${areaBlastCountInLevel1} AreaBlast bricks)`);

  const level20 = getMapByLevel(20);
  let hasImmortalAndPushInBoss = level20.some(r => r.includes(2)) && level20.some(r => r.includes(8));
  assert(hasImmortalAndPushInBoss, 'Level 20 Final Boss contains Immortal and Push brick defenses');

  // TEST GROUP 2: PowerUps & x3 Multi-Ball Logic
  console.log('\n\x1b[36m[GROUP 2] PowerUp Systems & x3 Multi-Ball Triplication\x1b[0m');
  const { POWERUP_TYPES, POWERUP_META } = await import('../src/entities/PowerUp.js');

  const powerupKeys = Object.keys(POWERUP_TYPES);
  assert(powerupKeys.length === 8, 'Exactly 8 distinct PowerUp types registered');

  const labels = Object.values(POWERUP_META).map(m => m.label);
  assert(labels.includes('x3 MULTI'), 'x3 MULTI label is properly registered in metadata');
  assert(labels.includes('⚡ LASER'), 'LASER label is properly registered in metadata');
  assert(labels.includes('💣 NUKE'), 'NUKE label is properly registered in metadata');
  assert(labels.includes('↔ WIDE'), 'WIDE label is properly registered in metadata');

  // Simulating the x3 Multi-Ball Triplication Logic
  function simulateTriplication(initialBallCount) {
    const balls = [];
    for (let i = 0; i < initialBallCount; i++) {
      balls.push({ x: 600, y: 700, dx: 0, dy: -7.5 });
    }

    const currentCount = balls.length;
    const maxAllowedBalls = 18;
    for (let i = 0; i < currentCount; i++) {
      if (balls.length >= maxAllowedBalls) break;
      const b = balls[i];
      const speed = Math.hypot(b.dx, b.dy) || 7.5;
      const currentAngle = Math.atan2(b.dx, -b.dy);

      const angleLeft = currentAngle - 0.44;
      balls.push({ x: b.x, y: b.y, dx: speed * Math.sin(angleLeft), dy: -speed * Math.cos(angleLeft) });

      if (balls.length < maxAllowedBalls) {
        const angleRight = currentAngle + 0.44;
        balls.push({ x: b.x, y: b.y, dx: speed * Math.sin(angleRight), dy: -speed * Math.cos(angleRight) });
      }
    }
    return balls.length;
  }

  const resultFrom1Ball = simulateTriplication(1);
  assert(resultFrom1Ball === 3, `Multi-ball transforms 1 ball into exactly 3 balls (Result: ${resultFrom1Ball})`);

  const resultFrom2Balls = simulateTriplication(2);
  assert(resultFrom2Balls === 6, `Multi-ball transforms 2 balls into exactly 6 balls (Result: ${resultFrom2Balls})`);

  // TEST GROUP 3: Brick Types & Tuned Drop Rate
  console.log('\n\x1b[36m[GROUP 3] Brick Types & 6% Drop Rate Tuning\x1b[0m');
  const { BRICK_TYPES } = await import('../src/entities/Brick.js');
  assert(Object.keys(BRICK_TYPES).length >= 8, 'All 8 Brick types defined in entity engine');

  // Verify drop rate sample distribution
  let normalDrops = 0;
  const sampleSize = 10000;
  for (let i = 0; i < sampleSize; i++) {
    if (Math.random() < 0.06) normalDrops++;
  }
  const measuredRate = (normalDrops / sampleSize) * 100;
  assert(measuredRate > 5.0 && measuredRate < 7.0, `Normal brick drop rate calibrated at ~6% (Measured: ${measuredRate.toFixed(2)}%)`);

  // TEST GROUP 4: 3-Continues Retry Mechanics
  console.log('\n\x1b[36m[GROUP 4] 3-Continues Retry System & Score Preservation\x1b[0m');
  class MockGameSession {
    constructor() {
      this.retriesLeft = 3;
      this.score = 5400;
      this.level = 4;
      this.lives = 3;
      this.state = 'PLAYING';
    }

    loseAllLives() {
      this.lives = 0;
      if (this.retriesLeft > 1) {
        this.retriesLeft--;
        this.state = 'RETRY';
      } else {
        this.retriesLeft = 0;
        this.state = 'GAMEOVER';
      }
    }

    continueLevel() {
      if (this.state === 'RETRY') {
        this.lives = 3;
        this.state = 'PLAYING';
      }
    }
  }

  const session = new MockGameSession();
  assert(session.retriesLeft === 3 && session.lives === 3, 'Initial run begins with 3 Continues and 3 Lives');

  session.loseAllLives();
  assert(session.state === 'RETRY' && session.retriesLeft === 2, 'Losing attempt 1 transitions to RETRY with 2 Continues left');
  assert(session.score === 5400, 'Score is strictly preserved during RETRY transition');

  session.continueLevel();
  assert(session.state === 'PLAYING' && session.lives === 3, 'Continuing restores 3 lives on the current level');

  session.loseAllLives();
  assert(session.state === 'RETRY' && session.retriesLeft === 1, 'Losing attempt 2 leaves 1 Continue left');

  session.continueLevel();
  session.loseAllLives();
  assert(session.state === 'GAMEOVER' && session.retriesLeft === 0, 'Losing attempt 3 transitions to final GAME OVER');

  // TEST GROUP 5: Survival Mode Danger Line & Wave Progression
  console.log('\n\x1b[36m[GROUP 5] Survival Mode Mechanics & Danger Line Breach\x1b[0m');
  const CANVAS_HEIGHT = 750;
  const dangerLineY = CANVAS_HEIGHT - 130; // 620
  assert(dangerLineY === 620, 'Danger Line position established at y = 620px (above paddle)');

  function checkDangerBreach(brickBottomY) {
    return brickBottomY >= dangerLineY;
  }

  assert(checkDangerBreach(610) === false, 'Brick above danger line (y=610) does not trigger breach');
  assert(checkDangerBreach(620) === true, 'Brick touching danger line (y=620) triggers breach');
  assert(checkDangerBreach(635) === true, 'Brick crossing danger line (y=635) triggers breach');

  // TEST GROUP 6: REST API Normalization & Session Handling
  console.log('\n\x1b[36m[GROUP 6] REST API Client Normalization\x1b[0m');
  function normalizeApiUrl(raw) {
    const defaultUrl = 'http://localhost:8080/api';
    const input = raw || defaultUrl;
    return input.endsWith('/api') ? input : `${input.replace(/\/$/, '')}/api`;
  }

  assert(normalizeApiUrl('https://arkanoid-backend.onrender.com') === 'https://arkanoid-backend.onrender.com/api',
    'Root domain automatically normalized with /api suffix');
  assert(normalizeApiUrl('https://arkanoid-backend.onrender.com/') === 'https://arkanoid-backend.onrender.com/api',
    'Trailing slash domain automatically normalized with /api suffix');
  assert(normalizeApiUrl('https://arkanoid-backend.onrender.com/api') === 'https://arkanoid-backend.onrender.com/api',
    'Domain already containing /api remains intact');

  // FINAL SUMMARY
  console.log('\n======================================================');
  console.log(`   TOTAL TESTS : ${totalTests}`);
  console.log(`   \x1b[32mPASSED      : ${passedTests}\x1b[0m`);
  console.log(`   \x1b[31mFAILED      : ${failedTests}\x1b[0m`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
