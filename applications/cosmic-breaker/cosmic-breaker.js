const canvas = document.getElementById('game');
const gl = canvas.getContext('webgl2', { antialias: true }) || canvas.getContext('webgl', { antialias: true });

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const startButton = document.getElementById('start-button');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

const GAME_MARGIN = 48;
const GAME_BOUNDS = {
  top: GAME_MARGIN,
  left: GAME_MARGIN,
  right: canvas.width - GAME_MARGIN,
  bottom: canvas.height - GAME_MARGIN
};

const BOARD = {
  width: GAME_BOUNDS.right - GAME_BOUNDS.left,
  height: GAME_BOUNDS.bottom - GAME_BOUNDS.top,
  centerX: (GAME_BOUNDS.left + GAME_BOUNDS.right) / 2,
  centerY: (GAME_BOUNDS.top + GAME_BOUNDS.bottom) / 2
};

const WORLD_SCALE = {
  x: 1.06,
  y: 0.92,
  depth: 0.55,
  baseDepth: 260
};

const BALL_RADIUS = 8;
const BALL_BASE_SPEED = 440;
const BALL_SPIN_VARIANCE = 0.25;
const POWER_UP_FALL_SPEED = 160;
const POWER_UP_CHANCE = 0.26;
const POWER_UP_GUARANTEE_INTERVAL = 6;
const SHIELD_DURATION = 14000;
const ROCKET_SPEED = 600;
const ROCKET_WIDTH = 14;
const ROCKET_HEIGHT = 48;
const ROCKET_BLAST_RADIUS = 96;
const MAX_ACTIVE_BALLS = 6;

const PHYSICS_STEP = 1 / 240;
const MAX_FRAME_DELTA = 1 / 24;
const MAX_BALL_SUBSTEP = 1 / 180;

let physicsAccumulator = 0;

const POWER_UP_DEFS = {
  'multi-ball': { color: '#6bf7c2', label: 'x3' },
  shield: { color: '#00f7ff', label: 'SH' },
  rocket: { color: '#ff6bf6', label: 'RK' }
};

const paddle = {
  width: 120,
  height: 16,
  depth: 48,
  radius: 10,
  speed: 680,
  _x: canvas.width / 2,
  get x() {
    return this._x;
  },
  set x(value) {
    const minX = GAME_BOUNDS.left + this.width / 2;
    const maxX = GAME_BOUNDS.right - this.width / 2;
    this._x = Math.min(Math.max(value, minX), maxX);
  },
  get y() {
    return GAME_BOUNDS.bottom - 40;
  }
};

const state = {
  mode: 'ready',
  score: 0,
  lives: 3,
  level: 1,
  bricks: [],
  balls: [],
  powerUps: [],
  rocket: null,
  shield: null,
  lastTime: performance.now(),
  bricksSinceDrop: 0
};

const input = {
  left: false,
  right: false,
  pointerActive: false
};

const BRICK_COLORS = [
  ['#00f7ff', '#1593ff'],
  ['#9a4dff', '#542dff'],
  ['#ff6bf6', '#f92672'],
  ['#ffe66d', '#ff9f1c'],
  ['#6bf7c2', '#4cc9f0'],
  ['#ff85a1', '#d83f87']
];

const Mat4 = {
  create() {
    const out = new Float32Array(16);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
  },
  identity(out) {
    out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
  },
  copy(out, a) {
    out.set(a);
    return out;
  },
  perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
  },
  lookAt(out, eye, center, up) {
    const x0 = eye[0];
    const x1 = eye[1];
    const x2 = eye[2];
    let fx = center[0] - x0;
    let fy = center[1] - x1;
    let fz = center[2] - x2;

    let rlf = 1 / Math.hypot(fx, fy, fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;

    let sx = fy * up[2] - fz * up[1];
    let sy = fz * up[0] - fx * up[2];
    let sz = fx * up[1] - fy * up[0];

    rlf = 1 / Math.hypot(sx, sy, sz);
    sx *= rlf;
    sy *= rlf;
    sz *= rlf;

    const ux = sy * fz - sz * fy;
    const uy = sz * fx - sx * fz;
    const uz = sx * fy - sy * fx;

    out[0] = sx;
    out[1] = ux;
    out[2] = -fx;
    out[3] = 0;
    out[4] = sy;
    out[5] = uy;
    out[6] = -fy;
    out[7] = 0;
    out[8] = sz;
    out[9] = uz;
    out[10] = -fz;
    out[11] = 0;
    out[12] = -(sx * x0 + sy * x1 + sz * x2);
    out[13] = -(ux * x0 + uy * x1 + uz * x2);
    out[14] = fx * x0 + fy * x1 + fz * x2;
    out[15] = 1;
    return out;
  },
  multiply(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
    out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
    return out;
  },
  translate(out, a, v) {
    const x = v[0], y = v[1], z = v[2];
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      Mat4.copy(out, a);
      Mat4.translate(out, out, v);
    }
    return out;
  },
  scale(out, a, v) {
    const x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  },
  rotateX(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];

    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    if (a !== out) {
      out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
      out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    }
    return out;
  },
  rotateY(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];

    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    if (a !== out) {
      out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
      out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    }
    return out;
  },
  rotateZ(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];

    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    if (a !== out) {
      out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
      out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    }
    return out;
  }
};

const Mat3 = {
  create() {
    const out = new Float32Array(9);
    out[0] = 1; out[4] = 1; out[8] = 1;
    return out;
  },
  identity(out) {
    out[0] = 1; out[1] = 0; out[2] = 0;
    out[3] = 0; out[4] = 1; out[5] = 0;
    out[6] = 0; out[7] = 0; out[8] = 1;
    return out;
  },
  fromMat4(out, mat) {
    out[0] = mat[0]; out[1] = mat[1]; out[2] = mat[2];
    out[3] = mat[4]; out[4] = mat[5]; out[5] = mat[6];
    out[6] = mat[8]; out[7] = mat[9]; out[8] = mat[10];
    return out;
  },
  invert(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) return null;
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  },
  transpose(out, a) {
    if (out === a) {
      let tmp;
      tmp = out[1]; out[1] = out[3]; out[3] = tmp;
      tmp = out[2]; out[2] = out[6]; out[6] = tmp;
      tmp = out[5]; out[5] = out[7]; out[7] = tmp;
    } else {
      out[0] = a[0]; out[1] = a[3]; out[2] = a[6];
      out[3] = a[1]; out[4] = a[4]; out[5] = a[7];
      out[6] = a[2]; out[7] = a[5]; out[8] = a[8];
    }
    return out;
  }
};

let renderer = null;

const VERTEX_SHADER_SOURCE = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;

  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  uniform mat3 uNormalMatrix;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = uModel * vec4(aPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(uNormalMatrix * aNormal);
    gl_Position = uProjection * uView * worldPosition;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform vec3 uLightDirection;
  uniform vec3 uLightColor;
  uniform vec3 uAmbientColor;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, -uLightDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, -1.0)), 0.0), 2.0);
    vec3 lighting = uAmbientColor * uColor + diffuse * uLightColor * uColor + rim * uEmissive * 0.6;
    gl_FragColor = vec4(lighting + uEmissive * 0.4, 1.0);
  }
`;

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
}

function showOverlay(title, message, buttonLabel = 'Launch') {
  overlayTitle.textContent = title;
  overlayMessage.innerHTML = message;
  startButton.textContent = buttonLabel;
  overlay.classList.add('overlay--visible');
}

function hideOverlay() {
  overlay.classList.remove('overlay--visible');
}

function baseBallSpeed() {
  return BALL_BASE_SPEED + (state.level - 1) * 45;
}

function createBall(options = {}) {
  const speed = options.speed ?? baseBallSpeed();
  const x = options.x ?? paddle.x;
  const y = options.y ?? paddle.y - paddle.height / 2 - BALL_RADIUS - 2;
  let velocity = options.velocity;
  if (!velocity) {
    const angle = options.angle ?? Math.PI / 4;
    const direction = options.direction ?? (Math.random() > 0.5 ? 1 : -1);
    velocity = {
      x: Math.cos(angle) * speed * direction,
      y: -Math.abs(Math.sin(angle) * speed)
    };
  }

  const spin = options.spin ?? (Math.random() - 0.5) * BALL_SPIN_VARIANCE;

  return {
    radius: BALL_RADIUS,
    x,
    y,
    velocity: { x: velocity.x, y: velocity.y },
    spin
  };
}

function resetBalls() {
  state.balls = [createBall()];
}

function resetRound(message) {
  state.mode = 'ready';
  resetBalls();
  state.powerUps = [];
  state.rocket = null;
  state.bricksSinceDrop = 0;
  physicsAccumulator = 0;
  state.lastTime = performance.now();
  if (message) {
    showOverlay('Mission Update', message);
  } else {
    showOverlay('Launch Sequence Ready', 'Press <strong>Space</strong> or tap <strong>Launch</strong> to continue.');
  }
}

function startGame() {
  if (state.mode === 'running') return;
  hideOverlay();
  if (state.mode === 'game-over') {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.shield = null;
    state.bricks = createBricks(state.level);
    resetBalls();
  }
  if (!state.bricks.length) {
    state.bricks = createBricks(state.level);
  }
  if (!state.balls.length) {
    resetBalls();
  }
  state.bricksSinceDrop = 0;
  state.mode = 'running';
  physicsAccumulator = 0;
  state.lastTime = performance.now();
  updateHud();
}

function advanceLevel() {
  state.level += 1;
  state.bricks = createBricks(state.level);
  resetRound('Sector cleared. Press <strong>Space</strong> or launch to enter the next anomaly.');
  updateHud();
}

function gameOver() {
  state.mode = 'game-over';
  state.balls = [];
  state.powerUps = [];
  state.rocket = null;
  state.shield = null;
  state.bricksSinceDrop = 0;
  physicsAccumulator = 0;
  showOverlay('Mission Failed', `Final score: <strong>${state.score}</strong><br>Press <strong>Space</strong> or launch to restart.`, 'Restart');
  updateHud();
}

function handleInput(delta) {
  const movement = paddle.speed * delta;
  if (input.left) {
    paddle.x -= movement;
  }
  if (input.right) {
    paddle.x += movement;
  }
}

function positionReadyBalls() {
  if (state.mode !== 'ready') return;
  for (const ball of state.balls) {
    ball.x = paddle.x;
    ball.y = paddle.y - paddle.height / 2 - ball.radius - 2;
  }
}

function handlePaddleCollision(ball) {
  const paddleTop = paddle.y - paddle.height / 2;
  const paddleBottom = paddle.y + paddle.height / 2;
  const paddleLeft = paddle.x - paddle.width / 2;
  const paddleRight = paddle.x + paddle.width / 2;

  if (ball.y + ball.radius >= paddleTop &&
      ball.y - ball.radius <= paddleBottom &&
      ball.x >= paddleLeft &&
      ball.x <= paddleRight &&
      ball.velocity.y > 0) {
    const relativeIntersect = (ball.x - paddle.x) / (paddle.width / 2);
    const bounceAngle = relativeIntersect * (Math.PI / 3);
    const speed = Math.max(Math.hypot(ball.velocity.x, ball.velocity.y) * 1.02, baseBallSpeed());
    ball.velocity.x = Math.sin(bounceAngle) * speed;
    ball.velocity.y = -Math.abs(Math.cos(bounceAngle) * speed);
    ball.y = paddleTop - ball.radius - 1;
    ball.spin = (relativeIntersect + (Math.random() - 0.5) * 0.4) * BALL_SPIN_VARIANCE;
    return true;
  }

  return false;
}

function destroyBrick(brick) {
  if (brick.status === 0) return;
  brick.status = 0;
  state.score += 12 * state.level;
  updateHud();
  maybeDropPowerUp(brick);
  checkLevelCleared();
}

function handleBrickCollision(ball) {
  for (const brick of state.bricks) {
    if (brick.status === 0) continue;

    if (ball.x + ball.radius >= brick.x &&
        ball.x - ball.radius <= brick.x + brick.width &&
        ball.y + ball.radius >= brick.y &&
        ball.y - ball.radius <= brick.y + brick.height) {
      const overlapLeft = ball.x + ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
      const overlapTop = ball.y + ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft) {
        ball.x = brick.x - ball.radius;
        ball.velocity.x = -Math.abs(ball.velocity.x);
      } else if (minOverlap === overlapRight) {
        ball.x = brick.x + brick.width + ball.radius;
        ball.velocity.x = Math.abs(ball.velocity.x);
      } else if (minOverlap === overlapTop) {
        ball.y = brick.y - ball.radius;
        ball.velocity.y = -Math.abs(ball.velocity.y);
      } else {
        ball.y = brick.y + brick.height + ball.radius;
        ball.velocity.y = Math.abs(ball.velocity.y);
      }

      destroyBrick(brick);
      return true;
    }
  }

  return false;
}

function resolveWallCollision(ball) {
  let collided = false;
  const minX = GAME_BOUNDS.left + ball.radius;
  const maxX = GAME_BOUNDS.right - ball.radius;
  const minY = GAME_BOUNDS.top + ball.radius;

  if (ball.x < minX) {
    const overshoot = minX - ball.x;
    ball.x = minX + overshoot;
    ball.velocity.x = Math.abs(ball.velocity.x);
    collided = true;
  } else if (ball.x > maxX) {
    const overshoot = ball.x - maxX;
    ball.x = maxX - overshoot;
    ball.velocity.x = -Math.abs(ball.velocity.x);
    collided = true;
  }

  if (ball.y < minY) {
    const overshoot = minY - ball.y;
    ball.y = minY + overshoot;
    ball.velocity.y = Math.abs(ball.velocity.y);
    collided = true;
  }

  return collided;
}

function integrateBall(ball, delta) {
  const subSteps = Math.max(1, Math.ceil(delta / MAX_BALL_SUBSTEP));
  const step = delta / subSteps;

  for (let index = 0; index < subSteps; index += 1) {
    ball.x += ball.velocity.x * step;
    ball.y += ball.velocity.y * step;

    const hitWall = resolveWallCollision(ball);
    const hitBrick = handleBrickCollision(ball);
    const hitPaddle = handlePaddleCollision(ball);

    ball.x += ball.spin * 12 * step;

    if (!hitWall && !hitBrick && !hitPaddle) {
      continue;
    }
  }
}

function stepPhysics(delta, timestamp) {
  if (state.mode !== 'running') return;
  const activeBalls = [];

  for (const ball of state.balls) {
    integrateBall(ball, delta);

    if (ball.y + ball.radius >= GAME_BOUNDS.bottom) {
      if (state.shield && state.shield.expiresAt > timestamp) {
        ball.y = GAME_BOUNDS.bottom - ball.radius - 1;
        ball.velocity.y = -Math.abs(ball.velocity.y);
        state.shield = null;
        activeBalls.push(ball);
        continue;
      }
      continue;
    }

    activeBalls.push(ball);
  }

  if (!activeBalls.length) {
    state.lives -= 1;
    updateHud();
    if (state.lives > 0) {
      resetRound('Shields absorbed the hit. Press <strong>Space</strong> to relaunch.');
    } else {
      gameOver();
    }
  } else {
    state.balls = activeBalls.slice(0, MAX_ACTIVE_BALLS);
  }
}

function maybeDropPowerUp(brick) {
  state.bricksSinceDrop += 1;
  const shouldDrop = state.bricksSinceDrop >= POWER_UP_GUARANTEE_INTERVAL || Math.random() < POWER_UP_CHANCE;
  if (!shouldDrop) return;
  state.bricksSinceDrop = 0;

  const types = Object.keys(POWER_UP_DEFS);
  const type = types[Math.floor(Math.random() * types.length)];
  state.powerUps.push({
    type,
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    width: 42,
    height: 24,
    speed: POWER_UP_FALL_SPEED
  });
}

function activateMultiBall() {
  if (!state.balls.length) {
    state.balls.push(createBall());
    return;
  }

  const clones = [];
  for (const source of state.balls.slice(0, MAX_ACTIVE_BALLS)) {
    const speed = Math.max(Math.hypot(source.velocity.x, source.velocity.y), baseBallSpeed());
    const originAngle = Math.atan2(source.velocity.y, source.velocity.x);
    const offsets = [-0.4, 0.4];
    for (const offset of offsets) {
      const angle = originAngle + offset;
      clones.push(createBall({
        x: source.x,
        y: source.y,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        spin: source.spin + offset * 0.5
      }));
    }
  }

  state.balls.push(...clones);
  if (state.balls.length > MAX_ACTIVE_BALLS) {
    state.balls.length = MAX_ACTIVE_BALLS;
  }
}

function activateShield(timestamp) {
  const now = timestamp ?? performance.now();
  state.shield = {
    activatedAt: now,
    expiresAt: now + SHIELD_DURATION
  };
}

function armRocket() {
  state.rocket = {
    x: paddle.x,
    y: paddle.y - paddle.height / 2 - ROCKET_HEIGHT / 2,
    width: ROCKET_WIDTH,
    height: ROCKET_HEIGHT,
    speed: ROCKET_SPEED
  };
}

function applyPowerUp(type) {
  if (type === 'multi-ball') {
    activateMultiBall();
  } else if (type === 'shield') {
    activateShield();
  } else if (type === 'rocket') {
    armRocket();
  }
}

function updatePowerUps(delta) {
  if (state.mode !== 'running') return;
  state.powerUps = state.powerUps.filter((powerUp) => {
    powerUp.y += powerUp.speed * delta;

    if (powerUp.y - powerUp.height / 2 > GAME_BOUNDS.bottom + powerUp.height) {
      return false;
    }

    const paddleTop = paddle.y - paddle.height / 2;
    const paddleBottom = paddle.y + paddle.height / 2;
    const paddleLeft = paddle.x - paddle.width / 2;
    const paddleRight = paddle.x + paddle.width / 2;

    const powerUpLeft = powerUp.x - powerUp.width / 2;
    const powerUpRight = powerUp.x + powerUp.width / 2;
    const powerUpTop = powerUp.y - powerUp.height / 2;
    const powerUpBottom = powerUp.y + powerUp.height / 2;

    if (powerUpBottom >= paddleTop &&
        powerUpTop <= paddleBottom &&
        powerUpRight >= paddleLeft &&
        powerUpLeft <= paddleRight) {
      applyPowerUp(powerUp.type);
      return false;
    }

    return true;
  });
}

function explodeRocket(x, y) {
  const radiusSq = ROCKET_BLAST_RADIUS * ROCKET_BLAST_RADIUS;
  for (const brick of state.bricks) {
    if (brick.status === 0) continue;
    const centerX = brick.x + brick.width / 2;
    const centerY = brick.y + brick.height / 2;
    const distanceSq = (centerX - x) ** 2 + (centerY - y) ** 2;
    if (distanceSq <= radiusSq) {
      destroyBrick(brick);
    }
  }
}

function updateRocket(delta) {
  if (!state.rocket) return;

  if (state.mode !== 'running') {
    state.rocket.x = paddle.x;
    state.rocket.y = paddle.y - paddle.height / 2 - state.rocket.height / 2;
    return;
  }

  state.rocket.y -= state.rocket.speed * delta;

  const rocketTop = state.rocket.y - state.rocket.height / 2;
  const rocketBottom = state.rocket.y + state.rocket.height / 2;
  const rocketLeft = state.rocket.x - state.rocket.width / 2;
  const rocketRight = state.rocket.x + state.rocket.width / 2;

  for (const brick of state.bricks) {
    if (brick.status === 0) continue;
    if (rocketRight >= brick.x &&
        rocketLeft <= brick.x + brick.width &&
        rocketBottom >= brick.y &&
        rocketTop <= brick.y + brick.height) {
      explodeRocket(state.rocket.x, rocketTop);
      state.rocket = null;
      return;
    }
  }

  if (rocketTop <= GAME_BOUNDS.top) {
    explodeRocket(state.rocket.x, GAME_BOUNDS.top);
    state.rocket = null;
  }
}

function updateShield(timestamp) {
  if (!state.shield) return;
  const now = timestamp ?? performance.now();
  if (now >= state.shield.expiresAt) {
    state.shield = null;
  }
}

function checkLevelCleared() {
  if (state.mode !== 'running') return;
  const remaining = state.bricks.some((brick) => brick.status === 1);
  if (!remaining) {
    advanceLevel();
  }
}

function createBricks(level) {
  const columns = Math.min(16, 8 + Math.floor(level * 0.8));
  const rows = Math.min(10, 4 + Math.floor(level * 0.7));
  const brickPaddingX = 12;
  const brickPaddingY = 10;
  const brickHeight = 24;
  const usableWidth = GAME_BOUNDS.right - GAME_BOUNDS.left;
  const totalPadding = brickPaddingX * (columns - 1);
  const brickWidth = (usableWidth - totalPadding) / columns;
  const originX = GAME_BOUNDS.left;
  const originY = GAME_BOUNDS.top + 24;

  const bricks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if (Math.random() > 0.9 && level > 1) continue;
      const palette = BRICK_COLORS[(row + col + level) % BRICK_COLORS.length];
      const primaryVec = hexToRgb(palette[0]);
      const secondaryVec = hexToRgb(palette[1]);
      bricks.push({
        x: originX + col * (brickWidth + brickPaddingX),
        y: originY + row * (brickHeight + brickPaddingY),
        width: brickWidth,
        height: brickHeight,
        depth: 32,
        row,
        status: 1,
        color: palette[0],
        colorSecondary: palette[1],
        colorPrimaryVec: primaryVec,
        colorSecondaryVec: secondaryVec
      });
    }
  }
  return bricks;
}

function loop(timestamp) {
  const frameDelta = Math.min((timestamp - state.lastTime) / 1000, MAX_FRAME_DELTA);
  state.lastTime = timestamp;

  handleInput(frameDelta);
  positionReadyBalls();

  physicsAccumulator += frameDelta;
  while (physicsAccumulator >= PHYSICS_STEP) {
    stepPhysics(PHYSICS_STEP, timestamp);
    physicsAccumulator -= PHYSICS_STEP;
  }

  updatePowerUps(frameDelta);
  updateRocket(frameDelta);
  updateShield(timestamp);

  if (renderer) {
    renderer.render(state, paddle, timestamp);
  }

  requestAnimationFrame(loop);
}

function positionFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const scaleX = canvas.width / rect.width;
  return x * scaleX;
}

function onPointerMove(event) {
  if (!input.pointerActive) return;
  paddle.x = positionFromEvent(event);
}

function onPointerDown(event) {
  input.pointerActive = true;
  paddle.x = positionFromEvent(event);
}

function onPointerUp() {
  input.pointerActive = false;
}

function init() {
  state.bricks = createBricks(state.level);
  resetBalls();
  state.powerUps = [];
  state.rocket = null;
  state.shield = null;
  state.bricksSinceDrop = 0;
  updateHud();

  if (!gl) {
    showOverlay('Renderer Error', 'WebGL is not available, so the 3D mission display cannot initialize.');
    startButton.disabled = true;
    return;
  }

  renderer = new MissionRenderer(gl, canvas);
  renderer.handleResize();

  showOverlay('Launch Sequence Ready', 'Press <strong>Space</strong> or tap <strong>Launch</strong> to begin your mission.');
  requestAnimationFrame(loop);
}

startButton.addEventListener('click', startGame);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (state.mode === 'ready' || state.mode === 'game-over') {
      startGame();
    }
  }
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
    input.left = true;
  }
  if (event.code === 'ArrowRight' || event.code === 'KeyD') {
    input.right = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
    input.left = false;
  }
  if (event.code === 'ArrowRight' || event.code === 'KeyD') {
    input.right = false;
  }
});

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointerleave', onPointerUp);

window.addEventListener('resize', () => {
  if (!gl || !renderer) return;
  GAME_BOUNDS.left = GAME_MARGIN;
  GAME_BOUNDS.top = GAME_MARGIN;
  GAME_BOUNDS.right = canvas.width - GAME_MARGIN;
  GAME_BOUNDS.bottom = canvas.height - GAME_MARGIN;
  BOARD.width = GAME_BOUNDS.right - GAME_BOUNDS.left;
  BOARD.height = GAME_BOUNDS.bottom - GAME_BOUNDS.top;
  BOARD.centerX = (GAME_BOUNDS.left + GAME_BOUNDS.right) / 2;
  BOARD.centerY = (GAME_BOUNDS.top + GAME_BOUNDS.bottom) / 2;
  renderer.handleResize();
  paddle.x = paddle.x;
});

class MissionRenderer {
  constructor(glContext, canvasElement) {
    this.gl = glContext;
    this.canvas = canvasElement;
    this.program = createProgram(this.gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.gl.useProgram(this.program);

    this.attribLocations = {
      position: this.gl.getAttribLocation(this.program, 'aPosition'),
      normal: this.gl.getAttribLocation(this.program, 'aNormal')
    };

    this.uniformLocations = {
      projection: this.gl.getUniformLocation(this.program, 'uProjection'),
      view: this.gl.getUniformLocation(this.program, 'uView'),
      model: this.gl.getUniformLocation(this.program, 'uModel'),
      normalMatrix: this.gl.getUniformLocation(this.program, 'uNormalMatrix'),
      color: this.gl.getUniformLocation(this.program, 'uColor'),
      emissive: this.gl.getUniformLocation(this.program, 'uEmissive'),
      lightDirection: this.gl.getUniformLocation(this.program, 'uLightDirection'),
      lightColor: this.gl.getUniformLocation(this.program, 'uLightColor'),
      ambientColor: this.gl.getUniformLocation(this.program, 'uAmbientColor')
    };

    this.meshes = {
      cube: createMesh(this.gl, createBoxGeometry()),
      sphere: createMesh(this.gl, createSphereGeometry(0.5, 18, 12)),
      plane: createMesh(this.gl, createPlaneGeometry())
    };

    this.projectionMatrix = Mat4.create();
    this.viewMatrix = Mat4.create();
    this.modelMatrix = Mat4.create();
    this.normalMatrix = Mat3.create();
    this.cameraTarget = [0, 0, -200];
    this.up = [0, 1, 0];

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
  }

  handleResize() {
    this._updateProjection();
  }

  _updateProjection() {
    const aspect = this.canvas.width / this.canvas.height || 1;
    Mat4.perspective(this.projectionMatrix, Math.PI / 3.4, aspect, 0.1, 4000);
  }

  _drawMesh(mesh, position, scale, color, emissive, rotation) {
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, position);
    if (rotation) {
      if (rotation.x) Mat4.rotateX(this.modelMatrix, this.modelMatrix, rotation.x);
      if (rotation.y) Mat4.rotateY(this.modelMatrix, this.modelMatrix, rotation.y);
      if (rotation.z) Mat4.rotateZ(this.modelMatrix, this.modelMatrix, rotation.z);
    }
    Mat4.scale(this.modelMatrix, this.modelMatrix, scale);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
    this.gl.vertexAttribPointer(this.attribLocations.position, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.attribLocations.position);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
    this.gl.vertexAttribPointer(this.attribLocations.normal, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.attribLocations.normal);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

    Mat3.fromMat4(this.normalMatrix, this.modelMatrix);
    if (!Mat3.invert(this.normalMatrix, this.normalMatrix)) {
      Mat3.identity(this.normalMatrix);
    }
    Mat3.transpose(this.normalMatrix, this.normalMatrix);

    this.gl.uniformMatrix4fv(this.uniformLocations.model, false, this.modelMatrix);
    this.gl.uniformMatrix3fv(this.uniformLocations.normalMatrix, false, this.normalMatrix);
    this.gl.uniform3fv(this.uniformLocations.color, color);
    this.gl.uniform3fv(this.uniformLocations.emissive, emissive);

    this.gl.drawElements(this.gl.TRIANGLES, mesh.indexCount, mesh.indexType, 0);
  }

  _drawBoard(timestamp) {
    const glowPhase = (Math.sin(timestamp * 0.002) + 1) / 2;

    const centerWorld = toWorld(BOARD.centerX, BOARD.centerY, -40);
    this._drawMesh(
      this.meshes.plane,
      [centerWorld.x, centerWorld.y - 120, centerWorld.z - 200],
      [BOARD.width * WORLD_SCALE.x * 1.3, BOARD.height * 0.05, BOARD.height * 0.8],
      [0.05, 0.07, 0.18],
      [0.02, 0.03, 0.08],
      { x: -Math.PI / 2.3 }
    );

    const frameColor = [0.05 + glowPhase * 0.1, 0.32 + glowPhase * 0.2, 0.52 + glowPhase * 0.25];
    const frameEmissive = [0.0, 0.12 + glowPhase * 0.35, 0.3 + glowPhase * 0.4];

    const topPos = toWorld(BOARD.centerX, GAME_BOUNDS.top - 10, -20);
    this._drawMesh(
      this.meshes.cube,
      [topPos.x, topPos.y, topPos.z],
      [BOARD.width * WORLD_SCALE.x + 40, 12, 30],
      frameColor,
      frameEmissive,
      null
    );

    const bottomPos = toWorld(BOARD.centerX, GAME_BOUNDS.bottom + 10, 40);
    this._drawMesh(
      this.meshes.cube,
      [bottomPos.x, bottomPos.y, bottomPos.z],
      [BOARD.width * WORLD_SCALE.x + 40, 16, 38],
      frameColor,
      frameEmissive,
      null
    );

    const leftPos = toWorld(GAME_BOUNDS.left - 14, BOARD.centerY, -10);
    this._drawMesh(
      this.meshes.cube,
      [leftPos.x, leftPos.y, leftPos.z],
      [16, BOARD.height * WORLD_SCALE.y + 60, 32],
      frameColor,
      frameEmissive,
      null
    );

    const rightPos = toWorld(GAME_BOUNDS.right + 14, BOARD.centerY, -10);
    this._drawMesh(
      this.meshes.cube,
      [rightPos.x, rightPos.y, rightPos.z],
      [16, BOARD.height * WORLD_SCALE.y + 60, 32],
      frameColor,
      frameEmissive,
      null
    );
  }

  _drawShield(shieldState, currentTime) {
    if (!shieldState) return;
    const remaining = Math.max(0, shieldState.expiresAt - currentTime);
    const intensity = Math.min(1, remaining / SHIELD_DURATION);
    const shieldWorldLeft = toWorld(GAME_BOUNDS.left + 8, GAME_BOUNDS.bottom + 6, 40);
    const shieldWorldRight = toWorld(GAME_BOUNDS.right - 8, GAME_BOUNDS.bottom + 6, 40);
    const width = Math.abs(shieldWorldRight.x - shieldWorldLeft.x);
    const center = toWorld(BOARD.centerX, GAME_BOUNDS.bottom + 6, 40);
    const color = [0.2, 0.75 * intensity, 0.65 * intensity];
    const emissive = [0.05, 0.4 * intensity, 0.35 * intensity];
    this._drawMesh(
      this.meshes.cube,
      [center.x, center.y, center.z],
      [width, 10, 28],
      color,
      emissive,
      { x: Math.PI / 2 }
    );
  }

  _drawPowerUps(powerUps, time) {
    for (const powerUp of powerUps) {
      const def = POWER_UP_DEFS[powerUp.type];
      const baseColor = hexToRgb(def.color);
      const emissive = mixColors(baseColor, [1, 1, 1], 0.45);
      const world = toWorld(powerUp.x, powerUp.y, 70 + Math.sin(time * 0.004 + powerUp.x * 0.01) * 10);
      const wobble = Math.sin(time * 0.005 + powerUp.y * 0.02) * 0.35;
      this._drawMesh(
        this.meshes.cube,
        [world.x, world.y, world.z],
        [powerUp.width * WORLD_SCALE.x * 0.55, powerUp.height * WORLD_SCALE.y * 0.5, 26],
        baseColor,
        emissive,
        { y: wobble }
      );
    }
  }

  _drawRocket(rocketState, time) {
    if (!rocketState) return;
    const world = toWorld(rocketState.x, rocketState.y, 60);
    const color = [0.95, 0.45, 0.85];
    const emissive = [0.65, 0.2, 0.6];
    const rotation = { x: Math.PI / 2, z: Math.sin(time * 0.01) * 0.05 };
    this._drawMesh(
      this.meshes.cube,
      [world.x, world.y, world.z],
      [rocketState.width * WORLD_SCALE.x * 0.5, rocketState.height, 20],
      color,
      emissive,
      rotation
    );
  }

  _drawBalls(balls, time) {
    const spinBase = time * 0.002;
    for (const ballState of balls) {
      const depthSwing = 90 + Math.sin(time * 0.0025 + ballState.x * 0.01) * 14;
      const ballWorld = toWorld(ballState.x, ballState.y, depthSwing);
      const ballColor = [0.55, 0.35, 1.0];
      const ballGlow = [0.12, 0.25, 0.8];
      const ballScale = ballState.radius * 2;
      this._drawMesh(
        this.meshes.sphere,
        [ballWorld.x, ballWorld.y + Math.sin(time * 0.003 + ballState.y * 0.01) * 3, ballWorld.z],
        [ballScale, ballScale, ballScale],
        ballColor,
        ballGlow,
        {
          x: spinBase * 0.9 + ballState.spin,
          y: spinBase * 0.8 - ballState.spin * 1.8,
          z: spinBase * 1.1 + ballState.spin * 2.2
        }
      );
    }
  }

  render(gameState, paddleState, timestamp) {
    this._updateProjection();

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.02, 0.05, 0.12, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const cameraSwing = Math.sin(timestamp * 0.00025) * 60;
    const cameraLift = 210 + Math.sin(timestamp * 0.0004) * 25;
    const cameraPos = [cameraSwing, cameraLift, 900];

    Mat4.lookAt(this.viewMatrix, cameraPos, this.cameraTarget, this.up);

    gl.uniformMatrix4fv(this.uniformLocations.projection, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uniformLocations.view, false, this.viewMatrix);

    const lightDirection = normalizeVec3([0.4, -0.9, -0.5]);
    gl.uniform3fv(this.uniformLocations.lightDirection, lightDirection);
    gl.uniform3fv(this.uniformLocations.lightColor, [0.9, 0.95, 1.0]);
    gl.uniform3fv(this.uniformLocations.ambientColor, [0.12, 0.16, 0.22]);

    this._drawBoard(timestamp);

    for (const brick of gameState.bricks) {
      if (brick.status === 0) continue;
      const centerX = brick.x + brick.width / 2;
      const centerY = brick.y + brick.height / 2;
      const world = toWorld(centerX, centerY, -brick.row * 24);
      const color = mixColors(brick.colorPrimaryVec, brick.colorSecondaryVec, 0.35);
      const emissive = mixColors(brick.colorSecondaryVec, [1, 1, 1], 0.25);
      this._drawMesh(
        this.meshes.cube,
        [world.x, world.y, world.z],
        [brick.width * WORLD_SCALE.x, brick.height * WORLD_SCALE.y, brick.depth],
        color,
        emissive,
        null
      );
    }

    const paddleWorld = toWorld(paddleState.x, paddleState.y, 100);
    const paddleColor = [0.08, 0.88, 0.95];
    const paddleEmissive = [0.02, 0.32, 0.44];
    this._drawMesh(
      this.meshes.cube,
      [paddleWorld.x, paddleWorld.y, paddleWorld.z],
      [paddleState.width * WORLD_SCALE.x, paddleState.height * WORLD_SCALE.y, paddleState.depth],
      paddleColor,
      paddleEmissive,
      { x: 0, y: Math.sin(timestamp * 0.001) * 0.05, z: 0 }
    );

    this._drawShield(gameState.shield, timestamp);
    this._drawPowerUps(gameState.powerUps, timestamp);
    this._drawRocket(gameState.rocket, timestamp);
    const ballsToRender = gameState.balls.length
      ? gameState.balls
      : [{ x: paddleState.x, y: paddleState.y - paddleState.height, radius: BALL_RADIUS, spin: 0 }];
    this._drawBalls(ballsToRender, timestamp);

    if (gameState.mode !== 'running') {
      const markerWorld = toWorld(paddleState.x, paddleState.y - 60, 80);
      const markerScale = [paddleState.width * 0.4, 6, 24];
      this._drawMesh(
        this.meshes.cube,
        [markerWorld.x, markerWorld.y, markerWorld.z],
        [markerScale[0], markerScale[1], markerScale[2]],
        [0.22, 0.6, 0.95],
        [0.1, 0.25, 0.6],
        { x: Math.PI / 2 }
      );
    }
  }
}

init();

function createProgram(glContext, vertexSource, fragmentSource) {
  const vertexShader = compileShader(glContext, glContext.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
  const program = glContext.createProgram();
  glContext.attachShader(program, vertexShader);
  glContext.attachShader(program, fragmentShader);
  glContext.linkProgram(program);

  if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
    const info = glContext.getProgramInfoLog(program);
    glContext.deleteProgram(program);
    throw new Error(`Failed to link WebGL program: ${info}`);
  }

  glContext.deleteShader(vertexShader);
  glContext.deleteShader(fragmentShader);
  return program;
}

function compileShader(glContext, type, source) {
  const shader = glContext.createShader(type);
  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);
  if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
    const info = glContext.getShaderInfoLog(shader);
    glContext.deleteShader(shader);
    throw new Error(`Failed to compile shader: ${info}`);
  }
  return shader;
}

function createMesh(glContext, geometry) {
  const positionBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(geometry.positions), glContext.STATIC_DRAW);

  const normalBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, normalBuffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(geometry.normals), glContext.STATIC_DRAW);

  const indexArray = geometry.indices.length > 65535 ? new Uint32Array(geometry.indices) : new Uint16Array(geometry.indices);
  const indexBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
  glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, indexArray, glContext.STATIC_DRAW);

  return {
    positionBuffer,
    normalBuffer,
    indexBuffer,
    indexCount: geometry.indices.length,
    indexType: indexArray instanceof Uint32Array ? glContext.UNSIGNED_INT : glContext.UNSIGNED_SHORT
  };
}

function createBoxGeometry() {
  const positions = [
    // Front
    -0.5, -0.5, 0.5,
     0.5, -0.5, 0.5,
     0.5,  0.5, 0.5,
    -0.5,  0.5, 0.5,
    // Back
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,
    // Top
    -0.5, 0.5, -0.5,
    -0.5, 0.5,  0.5,
     0.5, 0.5,  0.5,
     0.5, 0.5, -0.5,
    // Bottom
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,
    // Right
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,
    // Left
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
  ];

  const normals = [
    // Front
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
    // Back
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,
    // Top
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
    // Bottom
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
    // Right
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
    // Left
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0
  ];

  const indices = [
     0,  1,  2,   0,  2,  3,
     4,  5,  6,   4,  6,  7,
     8,  9, 10,   8, 10, 11,
    12, 13, 14,  12, 14, 15,
    16, 17, 18,  16, 18, 19,
    20, 21, 22,  20, 22, 23
  ];

  return { positions, normals, indices };
}

function createSphereGeometry(radius, widthSegments, heightSegments) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let y = 0; y <= heightSegments; y += 1) {
    const v = y / heightSegments;
    const theta = v * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let x = 0; x <= widthSegments; x += 1) {
      const u = x / widthSegments;
      const phi = u * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      normals.push(nx, ny, nz);
      positions.push(nx * radius, ny * radius, nz * radius);
    }
  }

  for (let y = 0; y < heightSegments; y += 1) {
    for (let x = 0; x < widthSegments; x += 1) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return { positions, normals, indices };
}

function createPlaneGeometry() {
  const positions = [
    -0.5, 0,  0.5,
     0.5, 0,  0.5,
     0.5, 0, -0.5,
    -0.5, 0, -0.5
  ];

  const normals = [
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0
  ];

  const indices = [0, 1, 2, 0, 2, 3];
  return { positions, normals, indices };
}

function normalizeVec3(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function toWorld(x, y, depthOffset = 0) {
  const offsetX = (x - BOARD.centerX) * WORLD_SCALE.x;
  const offsetY = BOARD.centerY - y;
  const worldY = offsetY * WORLD_SCALE.y;
  const worldZ = -WORLD_SCALE.baseDepth - offsetY * WORLD_SCALE.depth + depthOffset;
  return { x: offsetX, y: worldY, z: worldZ };
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return [1, 1, 1];
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r / 255, g / 255, b / 255];
}

function mixColors(a, b, t) {
  return [
    a[0] * (1 - t) + b[0] * t,
    a[1] * (1 - t) + b[1] * t,
    a[2] * (1 - t) + b[2] * t
  ];
}
