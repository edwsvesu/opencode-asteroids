'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const SHIELD_COLOR = '#0f0';
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    this.color = '#fff';
    this.pointMult = 1;

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Asteroide estrella fugaz: más rápido, desaparece con el tiempo ───────────
class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 3);
    this.color = '#fc0';
    this.pointMult = 2;
    this.ttl = rand(4, 7);
    this.trailTimer = 0;

    const speed = SPEEDS[this.size] * 2.5 + rand(-15, 15);
    const angle = rand(0, Math.PI * 2);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 6, this.color);
      return;
    }
    // Estela tipo cometa: partículas arrastradas en sentido contrario al movimiento
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.05;
      const p = new Particle(this.x, this.y, this.color);
      p.vx = -this.vx * 0.5;
      p.vy = -this.vy * 0.5;
      particles.push(p);
    }
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  { name: 'CLASICA', stroke: '#fff', flame: 'rgba(255,130,0,0.85)',      points: [[20,0],[-12,-9],[-7,0],[-12,9]] },
  { name: 'DELTA',   stroke: '#0f0', flame: 'rgba(0,255,100,0.85)',      points: [[24,0],[10,-13],[-8,-10],[-14,0],[-8,10],[10,13]] },
  { name: 'CAZA',    stroke: '#f0f', flame: 'rgba(255,0,200,0.85)',      points: [[20,0],[12,-4],[0,-15],[-12,-8],[-9,0],[-12,8],[0,15],[12,4]] },
  { name: 'DARDO',   stroke: '#fc0', flame: 'rgba(255,200,0,0.85)',      points: [[22,0],[8,-5],[0,-8],[-13,0],[0,8],[8,5]] },
];

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.boostTime     = 0;
    this.shieldTime    = 0;
    this.tripleShotTime = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible     > 0) this.invincible     -= dt;
    if (this.shootCooldown  > 0) this.shootCooldown  -= dt;
    if (this.boostTime      > 0) this.boostTime      -= dt;
    if (this.shieldTime     > 0) this.shieldTime     -= dt;
    if (this.tripleShotTime > 0) this.tripleShotTime -= dt;

    const ROT    = 3.5;   // rad/s
    const THRUST = 260 * (this.boostTime > 0 ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    // Triple shot: 3 balas alineadas una detrás de otra en la misma línea recta
    if (this.tripleShotTime > 0) {
      const SPACING = 7;
      const shots = [];
      for (let i = 0; i < 3; i++) {
        const offset = i * SPACING;
        const x = this.x + Math.cos(this.angle) * (NOSE - offset);
        const y = this.y + Math.sin(this.angle) * (NOSE - offset);
        shots.push(new Bullet(x, y, this.angle));
      }
      return shots;
    }
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const boosting = this.boostTime > 0;
    const triple   = this.tripleShotTime > 0;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const skin = SKINS[skinIndex];
    ctx.strokeStyle = triple ? '#f0f' : boosting ? '#0ff' : skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta definida por la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.points[0][0], skin.points[0][1]);
    for (let i = 1; i < skin.points.length; i++)
      ctx.lineTo(skin.points[i][0], skin.points[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const len = boosting ? rand(14, 26) : rand(6, 14);
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - len, 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosting ? 'rgba(0,255,255,0.85)' : skin.flame;
      ctx.stroke();
    }

    ctx.restore();

    // Escudo activo: burbuja translúcida alrededor de la nave
    if (this.shieldTime > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.12;
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '#fff') {
    this.x  = x;
    this.y  = y;
    this.color = color;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ── Power-up (velocidad / escudo / triple shot) ──────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 12;
    this.dead = false;
    this.phase = 0;
    this.color = type === 'triple' ? '#f0f' : '#0ff';
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 50);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.phase += dt * 4;
  }

  draw() {
    const pulse = 1 + Math.sin(this.phase) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    if (this.type === 'shield') {
      // Anillo doble pulsante
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.lineWidth   = 5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.rotate(this.phase * 0.5);
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius * 0.7, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius * 0.7, 0);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let skinIndex = 0;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(Math.random() < 0.15 ? new ShootingStar(x, y) : new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, color = '#fff') {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    powerUps.forEach(p => p.update(dt));
    powerUps  = powerUps.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(p => p.update(dt));
    powerUps  = powerUps.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Ciclar skin
  if (pressed('KeyC')) skinIndex = (skinIndex + 1) % SKINS.length;

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size] * a.pointMult;
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // Spawn de power-up al destruir asteroides (máx. 1 en pantalla)
        if (powerUps.length === 0 && Math.random() < 0.12) {
          const TYPES = ['speed', 'shield', 'triple'];
          const type = TYPES[randInt(0, 2)];
          powerUps.push(new PowerUp(a.x, a.y, type));
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0 && ship.shieldTime <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up
  for (const p of powerUps) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'shield') {
        ship.shieldTime = 6;
        explode(p.x, p.y, 12, SHIELD_COLOR);
      } else if (p.type === 'triple') {
        ship.tripleShotTime = 5;
        explode(p.x, p.y, 12, p.color);
      } else {
        ship.boostTime = 5;
        explode(p.x, p.y, 12, p.color);
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  const S = 0.45;   // escala respecto a la nave
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(S, S);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.points[0][0], skin.points[0][1]);
  for (let i = 1; i < skin.points.length; i++)
    ctx.lineTo(skin.points[i][0], skin.points[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.boostTime > 0) {
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'left';
    ctx.fillText(`VELOCIDAD X2 ${ship.boostTime.toFixed(1)}s`, 14, H - 16);
  }

  if (ship.shieldTime > 0) {
    ctx.fillStyle = SHIELD_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(`ESCUDO ${ship.shieldTime.toFixed(1)}s`, 14, H - 34);
  }

  if (ship.tripleShotTime > 0) {
    ctx.fillStyle = '#f0f';
    ctx.textAlign = 'left';
    ctx.fillText(`TRIPLE SHOT ${ship.tripleShotTime.toFixed(1)}s`, 14, H - 40);
  }

  ctx.fillStyle = SKINS[skinIndex].stroke;
  ctx.textAlign = 'right';
  ctx.fillText(`SKIN: ${SKINS[skinIndex].name}  [C]`, W - 14, H - 16);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerUps.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
