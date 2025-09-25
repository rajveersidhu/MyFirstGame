const cvs = document.getElementById("game");
const ctx = cvs.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const CELL = 24;                  // grid size
const COLS = Math.floor(cvs.width / CELL);
const ROWS = Math.floor(cvs.height / CELL);
const TICK_MS = 120;              // speed; make smaller to go faster

const DIR = {UP:[0,-1], DOWN:[0,1], LEFT:[-1,0], RIGHT:[1,0]};
let state, acc = 0, last = 0, paused = false;

function newState() {
  const start = { x: Math.floor(COLS/2), y: Math.floor(ROWS/2) };
  return {
    snake: [start, {x:start.x-1,y:start.y}, {x:start.x-2,y:start.y}],
    dir: DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food: spawnFood(new Set()),
    score: 0,
    best: Number(localStorage.getItem("best") || 0),
    dead: false,
  };
}

function spawnFood(occupied) {
  while (true) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    const key = `${x},${y}`;
    if (!occupied.has(key)) return { x, y };
  }
}

function tick(dt) {
  if (paused || state.dead) return;
  acc += dt;
  if (acc < TICK_MS) return;
  acc = 0;

  // direction update (buffered to prevent reversing within tick)
  const [dx, dy] = state.nextDir;
  const head = state.snake[0];
  const nx = head.x + dx;
  const ny = head.y + dy;

  // wall or self collision?
  const out = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS;
  const hitSelf = state.snake.some(s => s.x === nx && s.y === ny);
  if (out || hitSelf) {
    state.dead = true;
    localStorage.setItem("best", String(Math.max(state.best, state.score)));
    state.best = Number(localStorage.getItem("best"));
    return;
  }

  // move snake
  state.snake.unshift({ x: nx, y: ny });

  // food check
  if (nx === state.food.x && ny === state.food.y) {
    state.score += 1;
    const occupied = new Set(state.snake.map(s => `${s.x},${s.y}`));
    state.food = spawnFood(occupied);
  } else {
    state.snake.pop();
  }

  state.dir = state.nextDir;
}

function draw() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  // grid
  ctx.globalAlpha = 0.12;
  for (let x = 0; x <= COLS; x++) {
    ctx.fillRect(x*CELL, 0, 1, cvs.height);
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.fillRect(0, y*CELL, cvs.width, 1);
  }
  ctx.globalAlpha = 1;

  // food
  drawCell(state.food.x, state.food.y, "#22d3ee");

  // snake
  state.snake.forEach((s, i) => drawCell(s.x, s.y, i === 0 ? "#a78bfa" : "#8b5cf6"));

  // dead overlay
  if (state.dead) {
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0,0,cvs.width,cvs.height);
    ctx.fillStyle = "#e6edf3";
    ctx.textAlign = "center";
    ctx.font = "20px system-ui";
    ctx.fillText("Game Over — tap Restart", cvs.width/2, cvs.height/2);
  }

  // HUD
  scoreEl.textContent = state.score;
  bestEl.textContent  = Math.max(state.best, state.score);
}

function drawCell(x, y, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x*CELL+2, y*CELL+2, CELL-4, CELL-4);
}

function loop(ts=0) {
  const dt = ts - last;
  last = ts;
  tick(dt);
  draw();
  requestAnimationFrame(loop);
}

function restart() {
  state = newState();
  acc = 0; last = 0;
}
restart();
requestAnimationFrame(loop);

// Controls: keyboard + swipe
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const map = { arrowup:DIR.UP, w:DIR.UP, arrowdown:DIR.DOWN, s:DIR.DOWN, arrowleft:DIR.LEFT, a:DIR.LEFT, arrowright:DIR.RIGHT, d:DIR.RIGHT };
  if (!map[k]) return;
  const [nx, ny] = map[k];
  const [cx, cy] = state.dir;
  // prevent reversing directly
  if (nx === -cx && ny === -cy) return;
  state.nextDir = map[k];
});

let touchStart = null;
cvs.addEventListener("touchstart", (e) => { touchStart = e.touches[0]; }, {passive:true});
cvs.addEventListener("touchmove", (e) => {
  if (!touchStart) return;
  const dx = e.touches[0].clientX - touchStart.clientX;
  const dy = e.touches[0].clientY - touchStart.clientY;
  if (Math.abs(dx) + Math.abs(dy) < 24) return;
  const dir = Math.abs(dx) > Math.abs(dy) ? (dx>0?DIR.RIGHT:DIR.LEFT) : (dy>0?DIR.DOWN:DIR.UP);
  const [nx, ny] = dir, [cx, cy] = state.dir;
  if (!(nx === -cx && ny === -cy)) state.nextDir = dir;
  touchStart = e.touches[0];
}, {passive:true});
cvs.addEventListener("touchend", () => { touchStart = null; });

pauseBtn.onclick = () => { paused = !paused; pauseBtn.textContent = paused ? "Resume" : "Pause"; };
resetBtn.onclick = restart;
